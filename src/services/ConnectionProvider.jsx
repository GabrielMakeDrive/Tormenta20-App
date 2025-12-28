/**
 * ConnectionProvider - Provider de Contexto para Conexão WebRTC
 * 
 * Este Provider gerencia o ciclo de vida da conexão WebRTC da sessão de campanha.
 * Ele é montado no topo da árvore React (acima do Router) para garantir que a
 * conexão persista durante navegação entre rotas.
 * 
 * Fluxo:
 * 1. Provider é montado uma vez quando o App inicia
 * 2. Views consomem o contexto via hook `useConnection()`
 * 3. Views chamam métodos do contexto para iniciar/encerrar sessões
 * 4. Estado é reativo e atualiza as Views automaticamente
 * 5. Cleanup ocorre apenas quando o Provider desmonta (app fecha/refresh)
 * 
 * Regras Importantes:
 * - Nunca criar RTCPeerConnection nas Views
 * - Usar <Link> ou navigate() para navegação (nunca window.location)
 * - Views apenas consomem e reagem ao estado
 * - O Provider delega para webrtcSession.js a lógica de baixo nível
 */

import React, { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  createHostSession,
  createPlayerSession,
  deserializeFromQR,
  serializeForQR,
} from './webrtcSession';
import { HostConnection } from '../webrtc/HostConnection';
import { PeerConnection } from '../webrtc/PeerConnection';
import { useSignaling } from '../hooks/useSignaling';
import { createRoom, joinRoom, getParticipants, getSignals, sendHeartbeat } from '../api/signaling';
import { useRoom } from '../context/RoomContext';

// Contexto da conexão
const ConnectionContext = createContext(null);

// Tipos de sessão
export const SESSION_TYPES = {
  HOST: 'host',
  PLAYER: 'player',
};

// Estados da sessão
export const SESSION_STATUS = {
  IDLE: 'idle',
  CREATING: 'creating',
  ACTIVE: 'active',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

/**
 * Provider de Conexão WebRTC
 * 
 * Mantém a conexão viva enquanto o componente estiver montado.
 * Deve envolver o Router no App.js.
 * 
 * Nova arquitetura (v2):
 * - Cada jogador tem sua própria conexão (não compartilha offer)
 * - Mestre cria "convites" individuais para cada jogador
 * - Convites pendentes ficam em lista até receberem answer
 * - Removido QR Code (SDP muito grande) - usar apenas texto copiável
 */
export function ConnectionProvider({ children }) {
  // === Estado Reativo (dispara re-renders) ===
  const [sessionType, setSessionType] = useState(null); // 'host' | 'player' | null
  const [status, setStatus] = useState(SESSION_STATUS.IDLE);
  const [players, setPlayers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]); // Convites aguardando answer
  const [answerQR, setAnswerQR] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [restartOffers, setRestartOffers] = useState({});

  // === Refs (não disparam re-renders) ===
  const sessionRef = useRef(null); // Sessão WebRTC ativa
  const callbacksRef = useRef({}); // Callbacks registrados pela View
  const hostConnectionRef = useRef(null); // HostConnection instance
  const peerConnectionRef = useRef(null); // PeerConnection instance
  const knownPeersRef = useRef(new Set()); // Para detectar novos peers
  const characterInfoRef = useRef(null); // Para armazenar info do personagem do player

  // === Room Context ===
  const { setRole, setRoomId, setApiToken, deviceId } = useRoom();

  /**
   * Limpa o estado da sessão atual
   */
  const clearSessionState = useCallback(() => {
    setSessionType(null);
    setStatus(SESSION_STATUS.IDLE);
    setPlayers([]);
    setPendingInvites([]);
    setAnswerQR(null);
    setErrorMessage(null);
    setRestartOffers({});
    callbacksRef.current = {};
  }, []);

  /**
   * Encerra a sessão atual sem desmontar o Provider
   */
  const endSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        if (sessionRef.current.pollInterval) {
          clearInterval(sessionRef.current.pollInterval);
        }
        if (sessionRef.current.heartbeatInterval) {
          clearInterval(sessionRef.current.heartbeatInterval);
        }
        sessionRef.current.close();
      } catch (error) {
        console.error('[ConnectionProvider] Erro ao fechar sessão:', error);
      }
      sessionRef.current = null;
    }
    if (hostConnectionRef.current) {
      hostConnectionRef.current.close();
      hostConnectionRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Limpar intervals
    if (sessionRef.current?.pollInterval) {
      clearInterval(sessionRef.current.pollInterval);
    }
    if (sessionRef.current?.heartbeatInterval) {
      clearInterval(sessionRef.current.heartbeatInterval);
    }

    clearSessionState();
    setRole(null);
    setRoomId(null);
    setApiToken(null);
  }, [clearSessionState, setRole, setRoomId, setApiToken]);

  /**
   * Cleanup quando o Provider desmonta (app fecha/refresh)
   */
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try {
          sessionRef.current.close();
        } catch (error) {
          console.error('[ConnectionProvider] Erro no cleanup:', error);
        }
        sessionRef.current = null;
      }
    };
  }, []);

  // === Handlers internos para eventos da sessão Host ===

  const handlePlayerConnected = useCallback((playerId, playerData) => {
    console.log('[ConnectionProvider] Jogador conectado:', playerId);

    setPlayers(prev => {
      const existing = prev.find(p => p.playerId === playerId);
      if (existing) {
        return prev.map(p =>
          p.playerId === playerId
            ? { ...p, ...playerData, status: 'connected', restartReason: undefined }
            : p
        );
      }
      return [...prev, { playerId, ...playerData, status: 'connected' }];
    });

    // Remove da lista de convites pendentes
    setPendingInvites(prev => prev.filter(inv => inv.playerId !== playerId));

    // Limpa restart offer se existir
    setRestartOffers(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });

    // Propaga para callback da View
    callbacksRef.current.onPlayerConnected?.(playerId, playerData);
  }, []);

  const handlePlayerDisconnected = useCallback((playerId, playerInfo) => {
    console.log('[ConnectionProvider] Jogador desconectado:', playerId);

    setPlayers(prev =>
      prev.map(p =>
        p.playerId === playerId
          ? { ...p, status: 'disconnected' }
          : p
      )
    );

    callbacksRef.current.onPlayerDisconnected?.(playerId, playerInfo);
  }, []);

  const handleHostMessage = useCallback((playerId, message) => {
    console.log('[ConnectionProvider] Mensagem de jogador:', playerId, message.type);

    // Processa mensagem hello (handshake inicial)
    if (message.type === 'hello') {
      console.log('[ConnectionProvider] Recebeu hello de:', playerId, message.characterInfo);
      setPlayers(prev =>
        prev.map(p =>
          p.playerId === playerId
            ? { ...p, info: message.characterInfo, status: 'connected' }
            : p
        )
      );
    }

    // Atualiza estado interno para characterUpdate
    if (message.type === 'characterUpdate') {
      setPlayers(prev =>
        prev.map(p =>
          p.playerId === playerId
            ? { ...p, info: { ...p.info, ...message.data } }
            : p
        )
      );
    }

    // Propaga mensagens de chat para callback específico da View
    if (message.type === 'chatMessage') {
      console.log('[ConnectionProvider] Chat recebido de:', playerId);
      callbacksRef.current.onChatMessage?.(playerId, message.payload);
    }

    callbacksRef.current.onMessage?.(playerId, message);
  }, []);

  const handleHostError = useCallback((error) => {
    console.error('[ConnectionProvider] Erro na sessão Host:', error);
    setErrorMessage(error.error || 'Erro na conexão');
    callbacksRef.current.onError?.(error);
  }, []);

  const handleIceRestart = useCallback((playerId, payload) => {
    console.log('[ConnectionProvider] ICE restart solicitado:', playerId);

    const qr = serializeForQR(payload);
    const reasonLabel = payload?.reason === 'manual'
      ? 'Reinício manual'
      : payload?.reason === 'ice-failed'
        ? 'Falha na conexão'
        : 'Reconexão automática';

    setRestartOffers(prev => ({
      ...prev,
      [playerId]: { qr, reason: reasonLabel },
    }));

    setPlayers(prev =>
      prev.map(p =>
        p.playerId === playerId
          ? { ...p, status: 'reconnecting', restartReason: reasonLabel }
          : p
      )
    );

    callbacksRef.current.onIceRestart?.(playerId, payload);
  }, []);

  // === Handlers internos para eventos da sessão Player ===

  const handlePlayerConnectedEvent = useCallback(() => {
    console.log('[ConnectionProvider] Conectado ao Mestre!');
    setStatus(SESSION_STATUS.CONNECTED);
    callbacksRef.current.onConnected?.();
  }, []);

  const handlePlayerDisconnectedEvent = useCallback(() => {
    console.log('[ConnectionProvider] Desconectado do Mestre');
    setStatus(SESSION_STATUS.DISCONNECTED);
    callbacksRef.current.onDisconnected?.();
  }, []);

  const handlePlayerMessage = useCallback((message) => {
    console.log('[ConnectionProvider] Mensagem do Mestre:', message.type);
    // Propaga mensagens de chat para callback específico
    if (message.type === 'chatMessage') {
      console.log('[ConnectionProvider] Chat recebido do mestre');
      callbacksRef.current.onChatMessage?.(null, message.payload);
    }

    callbacksRef.current.onMessage?.(message);
  }, []);

  const handlePlayerError = useCallback((error) => {
    console.error('[ConnectionProvider] Erro na sessão Player:', error);
    setErrorMessage(error.error || 'Erro na conexão');
    callbacksRef.current.onError?.(error);
  }, []);

  const handleIceRestartRequired = useCallback(() => {
    console.log('[ConnectionProvider] Mestre solicitou reinício de ICE');
    setStatus(SESSION_STATUS.DISCONNECTED);
    setAnswerQR(null);
    callbacksRef.current.onIceRestartRequired?.();
  }, []);

  // === Métodos públicos ===

  /**
   * Inicia sessão como Mestre (Host)
   * 
   * @param {Object} callbacks - Callbacks para eventos
   * @returns {Promise<void>}
   */
  const startHostSession = useCallback(async (callbacks = {}) => {
    // Encerra sessão anterior se existir
    if (sessionRef.current) {
      endSession();
    }

    // Registra callbacks
    callbacksRef.current = callbacks;

    setSessionType(SESSION_TYPES.HOST);
    setStatus(SESSION_STATUS.CREATING);
    setErrorMessage(null);

    try {
      // Criar sala via API
      const { room_id, token } = await createRoom(deviceId);
      setRoomId(room_id);
      setApiToken(token);
      setRole('host');

      // Criar HostConnection
      const hostConn = new HostConnection(room_id, deviceId, (state) => {
        // Mapear estados
        const statusMap = {
          DISCONNECTED: SESSION_STATUS.DISCONNECTED,
          SIGNALING: SESSION_STATUS.ACTIVE,
          CONNECTING: SESSION_STATUS.CONNECTED, // Ajustar
          CONNECTED: SESSION_STATUS.CONNECTED,
          FAILED: SESSION_STATUS.ERROR,
        };
        setStatus(statusMap[state] || SESSION_STATUS.IDLE);
      }, (peerId, message) => {
        // Processar mensagem internamente
        handleHostMessage(peerId, message);
      });

      hostConnectionRef.current = hostConn;
      sessionRef.current = hostConn; // Para compatibilidade

      setStatus(SESSION_STATUS.ACTIVE);
      setPlayers([]);
      knownPeersRef.current = new Set();

      // Iniciar polling de participantes e sinais
      const poll = async () => {
        try {
          const participants = await getParticipants(room_id, deviceId);
          for (const participant of participants) {
            const peerId = participant.device_id;
            if (!knownPeersRef.current.has(peerId)) {
              console.log('[ConnectionProvider] Host detectou novo peer:', peerId);
              knownPeersRef.current.add(peerId);
              await hostConn.addPeer(peerId);
              setPlayers(prev => [...prev, { playerId: peerId, status: 'connecting' }]);
            }
          }

          const signals = await getSignals(room_id, deviceId);
          // Filtrar apenas answer e ice (ignorar offers que são do próprio host)
          const relevantSignals = signals.filter(s => s.type === 'answer' || s.type === 'ice');
          if (relevantSignals.length > 0) {
            console.log('[ConnectionProvider] Host recebeu signals relevantes:', relevantSignals.length);
          }
          for (const signal of relevantSignals) {
            console.log('[ConnectionProvider] Host processando signal:', signal.type, 'de:', signal.from);
            if (signal.type === 'answer') {
              await hostConn.handleAnswer(signal.from, signal.payload);
              // Atualizar status do jogador para conectado
              setPlayers(prev => prev.map(p =>
                p.playerId === signal.from ? { ...p, status: 'connected' } : p
              ));
            } else if (signal.type === 'ice') {
              await hostConn.handleIce(signal.from, signal.payload.candidate);
            }
          }
        } catch (error) {
          console.error('Erro no polling:', error);
        }
      };

      // Polling a cada 2s
      const pollInterval = setInterval(poll, 2000);
      sessionRef.current.pollInterval = pollInterval; // Armazenar para limpar

      // Heartbeat a cada 10s
      const heartbeatInterval = setInterval(async () => {
        try {
          await sendHeartbeat(room_id, deviceId);
        } catch (error) {
          console.error('Erro no heartbeat:', error);
        }
      }, 10000);
      sessionRef.current.heartbeatInterval = heartbeatInterval; // Armazenar para limpar

      console.log('[ConnectionProvider] Sessão Host iniciada:', room_id);

    } catch (error) {
      console.error('[ConnectionProvider] Erro ao criar sessão Host:', error);
      setErrorMessage(error.message || 'Erro ao criar sessão');
      setStatus(SESSION_STATUS.ERROR);
      throw error;
    }
  }, [deviceId, setRoomId, setApiToken, setRole]);

  /**
   * Inicia sessão como Jogador
   * 
   * @param {string} offerQR - QR Code do Mestre (base64)
   * @param {Object} characterInfo - Informações do personagem
   * @param {Object} callbacks - Callbacks para eventos
   * @returns {Promise<void>}
   */
  const startPlayerSession = useCallback(async (roomId, characterInfo, callbacks = {}) => {
    // Encerra sessão anterior se existir
    if (sessionRef.current) {
      endSession();
    }

    // Registra callbacks
    callbacksRef.current = callbacks;
    characterInfoRef.current = characterInfo;

    setSessionType(SESSION_TYPES.PLAYER);
    setStatus(SESSION_STATUS.CREATING);
    setErrorMessage(null);

    try {
      // Entrar na sala via API
      const { token, host_id } = await joinRoom(roomId, deviceId);
      console.log('[ConnectionProvider] Player entrou na sala. Host ID:', host_id);
      setRoomId(roomId);
      setApiToken(token);
      setRole('peer');

      // Criar PeerConnection com host_id para sinalização correta
      const peerConn = new PeerConnection(roomId, deviceId, host_id, (state) => {
        const statusMap = {
          DISCONNECTED: SESSION_STATUS.DISCONNECTED,
          SIGNALING: SESSION_STATUS.ACTIVE,
          CONNECTING: SESSION_STATUS.CONNECTED,
          CONNECTED: SESSION_STATUS.CONNECTED,
          FAILED: SESSION_STATUS.ERROR,
        };
        setStatus(statusMap[state] || SESSION_STATUS.IDLE);

        // Quando conectar, enviar hello com dados do personagem
        if (state === 'CONNECTED' && characterInfoRef.current) {
          peerConn.sendMessage({
            type: 'hello',
            characterInfo: characterInfoRef.current,
            timestamp: Date.now(),
          });
        }
      }, handlePlayerMessage); // Usa handler interno que processa tipos de mensagem (incluindo chatMessage)

      peerConnectionRef.current = peerConn;
      sessionRef.current = peerConn;

      setStatus(SESSION_STATUS.ACTIVE);

      // Iniciar polling de signals
      const pollSignals = async () => {
        try {
          const signals = await getSignals(roomId, deviceId);
          if (signals.length > 0) {
            console.log('[ConnectionProvider] Player recebeu signals:', signals.length);
          }
          for (const signal of signals) {
            console.log('[ConnectionProvider] Processando signal:', signal.type, 'de:', signal.from);
            if (signal.type === 'offer') {
              await peerConn.handleOffer(signal.payload);
            } else if (signal.type === 'ice') {
              await peerConn.handleIce(signal.payload);
            }
          }
        } catch (error) {
          console.error('Erro no polling de signals:', error);
        }
      };

      // Executar primeiro poll imediatamente
      pollSignals();

      // Polling a cada 2s
      const pollInterval = setInterval(pollSignals, 2000);
      sessionRef.current.pollInterval = pollInterval;

      // Heartbeat a cada 10s
      const heartbeatInterval = setInterval(async () => {
        try {
          await sendHeartbeat(roomId, deviceId);
        } catch (error) {
          console.error('Erro no heartbeat:', error);
        }
      }, 10000);
      sessionRef.current.heartbeatInterval = heartbeatInterval;

      console.log('[ConnectionProvider] Sessão Player iniciada:', roomId);

    } catch (error) {
      console.error('[ConnectionProvider] Erro ao criar sessão Player:', error);
      setErrorMessage(error.message || 'Erro ao entrar na sessão');
      setStatus(SESSION_STATUS.ERROR);
      throw error;
    }
  }, [deviceId, setRoomId, setApiToken, setRole, handlePlayerMessage]);

  /**
   * Adiciona answer de um jogador (Mestre)
   */
  const addAnswer = useCallback(async (playerId, answerData) => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.HOST) {
      throw new Error('Sessão de Host não está ativa');
    }

    await sessionRef.current.addAnswer(playerId, answerData);

    // Remove da lista de pendentes e adiciona como jogador pendente de conexão
    setPendingInvites(prev => prev.filter(inv => inv.playerId !== playerId));

    // Atualiza jogador como pendente
    setPlayers(prev => {
      const existing = prev.find(p => p.playerId === playerId);
      if (!existing) {
        return [...prev, { playerId, status: 'pending', info: null }];
      }
      return prev;
    });

    // Limpa restart offer
    setRestartOffers(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  }, [sessionType]);

  /**
   * Cria um novo convite para um jogador (Mestre)
   * Cada convite gera uma conexão independente
   * @returns {Object} - { playerId, offerCode }
   */
  const createInvite = useCallback(async () => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.HOST) {
      throw new Error('Sessão de Host não está ativa');
    }

    const invite = await sessionRef.current.createInvite();

    // Adiciona à lista de convites pendentes
    const newInvite = {
      playerId: invite.playerId,
      offerCode: invite.offerCode,
      createdAt: Date.now(),
    };

    setPendingInvites(prev => [...prev, newInvite]);

    console.log('[ConnectionProvider] Convite criado:', invite.playerId);

    return newInvite;
  }, [sessionType]);

  /**
   * Cancela/remove um convite pendente (Mestre)
   */
  const cancelInvite = useCallback((playerId) => {
    setPendingInvites(prev => prev.filter(inv => inv.playerId !== playerId));
    console.log('[ConnectionProvider] Convite cancelado:', playerId);
  }, []);

  /**
   * Processa offer de reconexão (Jogador)
   */
  const handleOffer = useCallback(async (offerData) => {
    if (!sessionRef.current?.handleOffer) {
      throw new Error('Sessão de Player não está ativa ou não suporta reconexão');
    }

    const { answerQR: newAnswerQR } = await sessionRef.current.handleOffer(offerData);
    setAnswerQR(newAnswerQR);
    return newAnswerQR;
  }, []);

  /**
   * Envia mensagem para um jogador específico (Mestre)
   */
  const sendToPlayer = useCallback((playerId, message) => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.HOST) {
      console.warn('[ConnectionProvider] Sessão de Host não ativa');
      return false;
    }
    return sessionRef.current.sendToPlayer(playerId, message);
  }, [sessionType]);

  /**
   * Envia mensagem para todos os jogadores (Mestre)
   */
  const broadcast = useCallback((message) => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.HOST) {
      console.warn('[ConnectionProvider] Sessão de Host não ativa');
      return 0;
    }
    return sessionRef.current.broadcast(message);
  }, [sessionType]);

  /**
   * Envia atualização de personagem (Jogador)
   */
  const sendCharacterUpdate = useCallback((data) => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.PLAYER) {
      console.warn('[ConnectionProvider] Sessão de Player não ativa');
      return false;
    }
    console.log('[ConnectionProvider] Enviando atualização de personagem:', data);
    return sessionRef.current.sendMessage({
      type: 'characterUpdate',
      data,
      timestamp: Date.now(),
    });
  }, [sessionType]);

  /**
   * Envia rolagem de dados (Jogador)
   */
  const sendDiceRoll = useCallback((rollData) => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.PLAYER) {
      console.warn('[ConnectionProvider] Sessão de Player não ativa');
      return false;
    }
    return sessionRef.current.sendMessage({
      type: 'diceRoll',
      ...rollData,
      timestamp: Date.now(),
    });
  }, [sessionType]);

  /**
   * Envia mensagem de chat privada
   * - Mestre: envia para jogador específico (targetPlayerId obrigatório)
   * - Jogador: envia para o mestre (targetPlayerId ignorado)
   * 
   * @param {string} text - Texto da mensagem
   * @param {string} senderName - Nome do remetente
   * @param {string} senderIcon - Ícone do remetente
   * @param {string} targetPlayerId - ID do jogador destino (apenas para Host)
   * @returns {boolean} - true se enviou com sucesso
   */
  const sendChatMessage = useCallback((text, senderName, senderIcon, targetPlayerId = null) => {
    // Validação: texto vazio
    if (!text || !text.trim()) {
      console.warn('[ConnectionProvider] Mensagem de chat vazia ignorada');
      return false;
    }

    const payload = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim().substring(0, 500), // Limite de 500 caracteres
      senderName: senderName || 'Anônimo',
      senderIcon: senderIcon || '💬',
      timestamp: Date.now(),
    };

    const message = {
      type: 'chatMessage',
      payload,
    };

    // Host: envia para jogador específico
    if (sessionType === SESSION_TYPES.HOST) {
      if (!targetPlayerId) {
        console.warn('[ConnectionProvider] Host precisa especificar targetPlayerId');
        return false;
      }
      if (!hostConnectionRef.current) {
        console.warn('[ConnectionProvider] HostConnection não disponível');
        return false;
      }
      hostConnectionRef.current.sendMessage(targetPlayerId, message);
      console.log('[ConnectionProvider] Chat enviado para jogador:', targetPlayerId);
      return true;
    }

    // Player: envia para o mestre
    if (sessionType === SESSION_TYPES.PLAYER) {
      if (!peerConnectionRef.current) {
        console.warn('[ConnectionProvider] PeerConnection não disponível');
        return false;
      }
      peerConnectionRef.current.sendMessage(message);
      console.log('[ConnectionProvider] Chat enviado para mestre');
      return true;
    }

    console.warn('[ConnectionProvider] Nenhuma sessão ativa para enviar chat');
    return false;
  }, [sessionType]);

  /**
   * Solicita reinício de ICE para um jogador (Mestre)
   */
  const requestIceRestart = useCallback(async (playerId, reason = 'manual') => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.HOST) {
      throw new Error('Sessão de Host não está ativa');
    }
    return sessionRef.current.requestIceRestart(playerId, reason);
  }, [sessionType]);

  /**
   * Atualiza callbacks da View (útil quando props mudam)
   */
  const updateCallbacks = useCallback((callbacks) => {
    callbacksRef.current = { ...callbacksRef.current, ...callbacks };
  }, []);

  // === Valor do Contexto ===
  const contextValue = useMemo(() => ({
    // Estado
    sessionType,
    status,
    players,
    pendingInvites, // Novo: convites aguardando answer
    answerQR,
    errorMessage,
    restartOffers,

    // Flags derivadas
    isActive: status === SESSION_STATUS.ACTIVE || status === SESSION_STATUS.CONNECTED,
    isHost: sessionType === SESSION_TYPES.HOST,
    isPlayer: sessionType === SESSION_TYPES.PLAYER,

    // Métodos
    startHostSession,
    startPlayerSession,
    endSession,
    createInvite, // Novo: criar convite individual
    cancelInvite, // Novo: cancelar convite
    addAnswer,
    handleOffer,
    sendToPlayer,
    broadcast,
    sendCharacterUpdate,
    sendDiceRoll,
    sendChatMessage,
    requestIceRestart,
    updateCallbacks,

    // Acesso à sessão (para casos especiais)
    getSession: () => sessionRef.current,
  }), [
    sessionType, status, players, pendingInvites, answerQR, errorMessage, restartOffers,
    startHostSession, startPlayerSession, endSession, createInvite, cancelInvite, addAnswer, handleOffer,
    sendToPlayer, broadcast, sendCharacterUpdate, sendDiceRoll, sendChatMessage, requestIceRestart,
    updateCallbacks,
  ]);

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
}

/**
 * Hook para consumir o contexto de conexão
 * 
 * @returns {Object} - Contexto de conexão
 * @throws {Error} - Se usado fora do Provider
 */
export function useConnection() {
  const context = useContext(ConnectionContext);

  if (!context) {
    throw new Error('useConnection deve ser usado dentro de um ConnectionProvider');
  }

  return context;
}

export default ConnectionProvider;
