/**
 * Serviço WebRTC para Sessão de Campanha
 * 
 * Gerencia conexões P2P entre Mestre e Jogadores usando WebRTC DataChannels.
 * 
 * Arquitetura:
 * - Topologia estrela: Mestre (host) centraliza todas as conexões
 * - Jogadores conectam apenas ao Mestre, não entre si
 * - DataChannel único "campaign" para troca de mensagens JSON
 * - Sinalização via QR Code (sem backend)
 * 
 * Fluxo de conexão:
 * 1. Mestre cria offer e exibe QR Code
 * 2. Jogador escaneia QR, cria answer e exibe seu próprio QR
 * 3. Mestre escaneia answer do jogador e estabelece conexão
 * 4. DataChannel abre e permite troca de mensagens
 * 
 * Tipos de mensagem:
 * - hello: handshake inicial com dados do personagem
 * - characterUpdate: atualização de status (PV/PM, condições)
 * - diceRoll: resultado de rolagem de dados
 * - ping/pong: manutenção de presença
 */

// Configuração do servidor ICE (STUN público do Google)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Tamanho máximo do payload para QR Code (em bytes base64)
const MAX_QR_PAYLOAD_SIZE = 4000;

// Timeout para coleta de ICE candidates (ms)
const ICE_GATHERING_TIMEOUT = 5000;

// Timeout para conexão individual (ms)
const CONNECTION_TIMEOUT = 20000;

// Tempo de tolerância antes de disparar restart sobre perda temporária (ms)
const GRACE_PERIOD_MS = 12000;

// Limite de reinícios de ICE por jogador antes de notificar erro crítico
const MAX_ICE_RESTARTS = 3;

// Intervalo periódico para ping no canal (ms)
const HEARTBEAT_INTERVAL_MS = 3000;

/**
 * Gera um UUID v4 simples
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Serializa dados para QR Code (JSON compactado em base64)
 */
export const serializeForQR = (data) => {
  try {
    const json = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(json)));

    if (base64.length > MAX_QR_PAYLOAD_SIZE) {
      console.warn(`Payload QR muito grande: ${base64.length} bytes (máx: ${MAX_QR_PAYLOAD_SIZE})`);
    }

    return base64;
  } catch (error) {
    console.error('Erro ao serializar para QR:', error);
    return null;
  }
};

/**
 * Deserializa dados do QR Code (base64 para JSON)
 */
export const deserializeFromQR = (base64) => {
  try {
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json);
  } catch (error) {
    console.error('Erro ao deserializar QR:', error);
    return null;
  }
};

/**
 * Aguarda a coleta completa de ICE candidates
 */
const waitForIceGathering = (peerConnection, timeout = ICE_GATHERING_TIMEOUT) => {
  return new Promise((resolve) => {
    if (peerConnection.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, timeout);

    const checkState = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        clearTimeout(timeoutId);
        peerConnection.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };

    peerConnection.addEventListener('icegatheringstatechange', checkState);
  });
};

/**
 * Cria uma sessão como Mestre (Host)
 * 
 * @param {Object} callbacks - Callbacks para eventos
 * @param {Function} callbacks.onPlayerConnected - Chamado quando jogador conecta
 * @param {Function} callbacks.onPlayerDisconnected - Chamado quando jogador desconecta
 * @param {Function} callbacks.onMessage - Chamado ao receber mensagem
 * @param {Function} callbacks.onError - Chamado em caso de erro
 * @returns {Object} - Objeto da sessão do Mestre
 */
export const createHostSession = async (callbacks = {}) => {
  const sessionId = generateUUID();
  const players = new Map(); // Map<playerId, { connection, channel, info }>
  const {
    onPlayerConnected,
    onPlayerDisconnected,
    onMessage,
    onError,
    onIceRestart,
  } = callbacks;

  // Estado da sessão
  let isActive = true;
  let heartbeatInterval = null;

  const clearPlayerGraceTimer = (player) => {
    if (player?.graceTimer) {
      clearTimeout(player.graceTimer);
      player.graceTimer = null;
    }
  };

  const scheduleGracePeriod = (playerId) => {
    const player = players.get(playerId);
    if (!player) {
      return;
    }
    clearPlayerGraceTimer(player);
    player.graceTimer = setTimeout(async () => {
      await restartIceForPlayer(playerId, 'grace-timeout').catch((error) => {
        console.error(`[Host] Falha ao reiniciar ICE (grace): ${error}`);
      });
    }, GRACE_PERIOD_MS);
  };

  const handleIceConnectionState = (playerId) => {
    const player = players.get(playerId);
    if (!player) {
      return;
    }
    const iceState = player.connection.iceConnectionState;
    console.log(`[Host] ICE connection state ${playerId}: ${iceState}`);

    if (iceState === 'connected' || iceState === 'completed') {
      clearPlayerGraceTimer(player);
      player.iceRestarting = false;
      player.restartAttempts = 0;
      player.status = 'connected';
      onPlayerConnected?.(playerId, player);
      return;
    }

    if (iceState === 'disconnected') {
      scheduleGracePeriod(playerId);
    }

    if (iceState === 'failed') {
      clearPlayerGraceTimer(player);
      restartIceForPlayer(playerId, 'ice-failed');
    }
  };

  const startHeartbeat = () => {
    if (heartbeatInterval) {
      return;
    }
    heartbeatInterval = setInterval(() => {
      if (!isActive) {
        return;
      }
      players.forEach((player, playerId) => {
        if (player.status === 'connected') {
          sendToPlayer(playerId, { type: 'ping', payload: { sessionId, heartbeat: true } });
        }
      });
    }, HEARTBEAT_INTERVAL_MS);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const restartIceForPlayer = async (playerId, reason = 'ice-restart') => {
    const player = players.get(playerId);
    if (!player) {
      return null;
    }
    if (player.iceRestarting) {
      return null;
    }
    if (player.restartAttempts >= MAX_ICE_RESTARTS) {
      const errorMessage = 'Limite de reinício de ICE atingido';
      console.warn(`[Host] ${errorMessage} para ${playerId}`);
      onError?.({ playerId, error: errorMessage });
      return null;
    }

    player.iceRestarting = true;
    player.restartAttempts += 1;
    try {
      clearPlayerGraceTimer(player);
      await player.connection.restartIce();
      const offer = await player.connection.createOffer();
      await player.connection.setLocalDescription(offer);
      await waitForIceGathering(player.connection);
      player.pendingOffer = {
        type: player.connection.localDescription.type,
        sdp: player.connection.localDescription.sdp,
      };
      player.status = 'reconnecting';
      const payload = {
        sessionId,
        playerId,
        offer: player.pendingOffer,
        reason,
      };
      onIceRestart?.(playerId, payload);
      return payload;
    } catch (error) {
      console.error(`[Host] Falha ao reiniciar ICE para ${playerId}:`, error);
      player.iceRestarting = false;
      onError?.({ playerId, error: 'Falha no restart de ICE', detail: error });
      return null;
    }
  };

  /**
   * Cria uma nova conexão para um jogador
   */
  const createPlayerConnection = async () => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    const playerId = generateUUID();

    // Cria DataChannel antes de criar offer
    const dataChannel = peerConnection.createDataChannel('sync_channel', {
      ordered: true,
    });

    // Configura eventos do DataChannel
    dataChannel.onopen = () => {
      console.log(`[Host] DataChannel aberto para jogador ${playerId}`);

      // Envia ping inicial
      sendToPlayer(playerId, { type: 'ping', payload: { sessionId } });
    };

    dataChannel.onclose = () => {
      console.log(`[Host] DataChannel fechado para jogador ${playerId}`);
      handlePlayerDisconnect(playerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`[Host] Erro no DataChannel do jogador ${playerId}:`, error);
      callbacks.onError?.({ playerId, error: 'Erro no canal de dados' });
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handlePlayerMessage(playerId, message);
      } catch (error) {
        console.warn('[Host] Mensagem inválida recebida:', error);
      }
    };

    players.set(playerId, {
      connection: peerConnection,
      channel: dataChannel,
      status: 'pending',
      info: null,
      graceTimer: null,
      iceRestarting: false,
      restartAttempts: 0,
      pendingOffer: null,
    });

    // Monitora estado da conexão
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`[Host] Estado da conexão ${playerId}: ${state}`);

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        handlePlayerDisconnect(playerId);
      }
    };

    peerConnection.addEventListener('iceconnectionstatechange', () => {
      handleIceConnectionState(playerId);
    });

    // Cria offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Aguarda coleta de ICE candidates
    await waitForIceGathering(peerConnection);

    // Armazena conexão do jogador

    // Retorna dados da offer para QR Code
    return {
      playerId,
      offer: {
        type: peerConnection.localDescription.type,
        sdp: peerConnection.localDescription.sdp,
      },
    };
  };

  /**
   * Processa resposta (answer) de um jogador
   */
  const addAnswer = async (playerId, answerData) => {
    const player = players.get(playerId);

    if (!player) {
      throw new Error(`Jogador ${playerId} não encontrado`);
    }

    try {
      const answer = new RTCSessionDescription(answerData);
      await player.connection.setRemoteDescription(answer);
      player.pendingOffer = null;
      player.iceRestarting = false;
      player.status = 'connected';
      clearPlayerGraceTimer(player);

      return true;
    } catch (error) {
      console.error('[Host] Erro ao processar answer:', error);
      throw error;
    }
  };

  /**
   * Processa mensagem recebida de um jogador
   */
  const handlePlayerMessage = (playerId, message) => {
    const { type, payload, ts } = message;

    console.log(`[Host] Mensagem de ${playerId}:`, type);

    switch (type) {
      case 'hello':
        // Atualiza informações do jogador
        const player = players.get(playerId);
        if (player) {
          player.info = payload;
          onPlayerConnected?.(playerId, { ...player, info: payload });
        }
        // Responde com ack
        sendToPlayer(playerId, { type: 'ack', payload: { received: 'hello' } });
        break;

      case 'characterUpdate':
        const playerData = players.get(playerId);
        if (playerData) {
          playerData.info = { ...playerData.info, ...payload };
        }
        onMessage?.(playerId, message);
        break;

      case 'diceRoll':
        onMessage?.(playerId, message);
        // Opcionalmente broadcast para outros jogadores
        break;

      case 'pong':
        // Atualiza timestamp de última atividade
        const p = players.get(playerId);
        if (p) {
          p.lastActivity = Date.now();
        }
        break;

      default:
        console.warn(`[Host] Tipo de mensagem desconhecido: ${type}`);
        onMessage?.(playerId, message);
    }
  };

  /**
   * Processa desconexão de um jogador
   */
  const handlePlayerDisconnect = (playerId) => {
    const player = players.get(playerId);

    if (player && player.status !== 'disconnected') {
      player.status = 'disconnected';
      player.iceRestarting = false;
      player.pendingOffer = null;
      clearPlayerGraceTimer(player);
      onPlayerDisconnected?.(playerId, player.info);
    }
  };

  /**
   * Envia mensagem para um jogador específico
   */
  const sendToPlayer = (playerId, message) => {
    const player = players.get(playerId);

    if (!player || !player.channel || player.channel.readyState !== 'open') {
      console.warn(`[Host] Não foi possível enviar para ${playerId}: canal não disponível`);
      return false;
    }

    try {
      const payload = {
        ...message,
        ts: Date.now(),
      };
      player.channel.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('[Host] Erro ao enviar mensagem:', error);
      return false;
    }
  };

  /**
   * Envia mensagem para todos os jogadores conectados
   */
  const broadcast = (message) => {
    let successCount = 0;

    players.forEach((player, playerId) => {
      if (player.status === 'connected' && sendToPlayer(playerId, message)) {
        successCount++;
      }
    });

    return successCount;
  };

  /**
   * Retorna lista de jogadores conectados
   */
  const getConnectedPlayers = () => {
    const connected = [];

    players.forEach((player, playerId) => {
      connected.push({
        playerId,
        status: player.status,
        info: player.info,
      });
    });

    return connected;
  };

  /**
   * Fecha todas as conexões e encerra a sessão
   */
  const close = () => {
    isActive = false;
    stopHeartbeat();

    players.forEach((player, playerId) => {
      clearPlayerGraceTimer(player);
      try {
        if (player.channel) {
          player.channel.close();
        }
        if (player.connection) {
          player.connection.close();
        }
      } catch (error) {
        console.error(`[Host] Erro ao fechar conexão ${playerId}:`, error);
      }
    });

    players.clear();
  };

  /**
   * Cria um novo convite para um jogador
   * Cada convite gera uma nova RTCPeerConnection independente
   * @returns {Object} - { playerId, offerCode } - código serializado para enviar ao jogador
   */
  const createInvite = async () => {
    const connectionData = await createPlayerConnection();
    const inviteData = {
      sessionId,
      playerId: connectionData.playerId,
      offer: connectionData.offer,
    };
    return {
      playerId: connectionData.playerId,
      offerCode: serializeForQR(inviteData),
      offerData: inviteData,
    };
  };

  // NÃO cria conexão inicial automaticamente
  // Cada jogador terá seu próprio convite criado via createInvite()

  startHeartbeat();

  return {
    sessionId,
    // Removido: offerData e offerQR (não há mais offer única)
    addAnswer,
    createInvite, // Novo método para criar convites individuais
    createPlayerConnection, // Mantido para compatibilidade
    sendToPlayer,
    broadcast,
    getConnectedPlayers,
    requestIceRestart: restartIceForPlayer,
    close,
    isActive: () => isActive,
  };
};

/**
 * Cria uma sessão como Jogador
 * 
 * @param {string} offerQR - Dados da offer do Mestre (base64)
 * @param {Object} characterInfo - Informações do personagem do jogador
 * @param {Object} callbacks - Callbacks para eventos
 * @returns {Object} - Objeto da sessão do Jogador
 */
export const createPlayerSession = async (offerQR, characterInfo, callbacks = {}) => {
  // Deserializa offer do QR Code
  const offerData = deserializeFromQR(offerQR);

  if (!offerData || !offerData.offer) {
    throw new Error('QR Code inválido ou corrompido');
  }

  const { sessionId, playerId, offer } = offerData;

  // Cria conexão
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);
  let dataChannel = null;
  let isConnected = false;
  let graceTimer = null;
  let restartRequested = false;

  const {
    onConnected,
    onDisconnected,
    onMessage,
    onError,
    onIceRestartRequired,
  } = callbacks;

  const clearGraceTimer = () => {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    restartRequested = false;
  };

  const notifyIceRestartNeeded = (reason) => {
    if (restartRequested) {
      return;
    }
    restartRequested = true;
    onIceRestartRequired?.({ reason });
  };

  const scheduleGracePeriod = (reason) => {
    clearGraceTimer();
    graceTimer = setTimeout(() => {
      notifyIceRestartNeeded(reason);
    }, GRACE_PERIOD_MS);
  };

  const handleIceConnectionState = () => {
    const state = peerConnection.iceConnectionState;
    console.log(`[Player] ICE connection state: ${state}`);

    if (state === 'connected' || state === 'completed') {
      clearGraceTimer();
      return;
    }

    if (state === 'disconnected') {
      scheduleGracePeriod('disconnected');
    }

    if (state === 'failed') {
      clearGraceTimer();
      notifyIceRestartNeeded('ice-failed');
    }
  };

  peerConnection.addEventListener('iceconnectionstatechange', handleIceConnectionState);

  const processIncomingOffer = async (incomingOffer, options = {}) => {
    clearGraceTimer();
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await waitForIceGathering(peerConnection);

      const answerPayload = {
        playerId,
        sessionId,
        answer: {
          type: peerConnection.localDescription.type,
          sdp: peerConnection.localDescription.sdp,
        },
      };

      if (options.reason) {
        answerPayload.reason = options.reason;
      }

      return {
        answerData: answerPayload,
        answerQR: serializeForQR(answerPayload),
      };
    } catch (error) {
      console.error('[Player] Falha ao processar offer:', error);
      throw error;
    }
  };

  // Aguarda DataChannel criado pelo Mestre
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;

    dataChannel.onopen = () => {
      console.log('[Player] DataChannel aberto');
      isConnected = true;

      // Envia hello com informações do personagem
      sendMessage({
        type: 'hello',
        payload: {
          playerId,
          ...characterInfo,
        },
      });

      callbacks.onConnected?.();
    };

    dataChannel.onclose = () => {
      console.log('[Player] DataChannel fechado');
      isConnected = false;
      callbacks.onDisconnected?.();
    };

    dataChannel.onerror = (error) => {
      console.error('[Player] Erro no DataChannel:', error);
      callbacks.onError?.({ error: 'Erro no canal de dados' });
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.warn('[Player] Mensagem inválida recebida:', error);
      }
    };
  };

  // Monitora estado da conexão
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log(`[Player] Estado da conexão: ${state}`);

    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      isConnected = false;
      onDisconnected?.();
    }
  };

  /**
   * Processa mensagem recebida do Mestre
   */
  const handleMessage = (message) => {
    const { type, payload } = message;

    console.log('[Player] Mensagem recebida:', type);

    switch (type) {
      case 'ping':
        sendMessage({ type: 'pong', payload: { received: Date.now() } });
        break;

      case 'ack':
        console.log('[Player] ACK recebido:', payload);
        break;

      default:
        onMessage?.(message);
    }
  };

  /**
   * Envia mensagem para o Mestre
   */
  const sendMessage = (message) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.warn('[Player] Canal não disponível para envio');
      return false;
    }

    try {
      const payload = {
        ...message,
        ts: Date.now(),
      };
      dataChannel.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('[Player] Erro ao enviar mensagem:', error);
      return false;
    }
  };

  /**
   * Envia atualização de status do personagem
   */
  const sendCharacterUpdate = (updateData) => {
    return sendMessage({
      type: 'characterUpdate',
      payload: updateData,
    });
  };

  /**
   * Envia resultado de rolagem de dados
   */
  const sendDiceRoll = (rollData) => {
    return sendMessage({
      type: 'diceRoll',
      payload: rollData,
    });
  };

  /**
   * Fecha conexão
   */
  const close = () => {
    try {
      if (dataChannel) {
        dataChannel.close();
      }
      peerConnection.close();
      clearGraceTimer();
      restartRequested = false;
    } catch (error) {
      console.error('[Player] Erro ao fechar conexão:', error);
    }
  };

  // Processa offer do Mestre
  try {
    const { answerData, answerQR } = await processIncomingOffer(offer);

    return {
      playerId,
      sessionId,
      answerData,
      answerQR,
      sendMessage,
      sendCharacterUpdate,
      sendDiceRoll,
      close,
      isConnected: () => isConnected,
      handleOffer: processIncomingOffer,
    };
  } catch (error) {
    peerConnection.close();
    throw error;
  }
};

/**
 * Verifica se o navegador suporta WebRTC
 */
export const isWebRTCSupported = () => {
  return !!(
    window.RTCPeerConnection &&
    window.RTCSessionDescription
  );
};

/**
 * Verifica se está rodando em Android (plataforma suportada)
 */
export const isAndroidPlatform = () => {
  return /android/i.test(navigator.userAgent);
};
