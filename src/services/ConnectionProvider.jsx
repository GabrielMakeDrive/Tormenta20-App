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
        sessionRef.current.close();
      } catch (error) {
        console.error('[ConnectionProvider] Erro ao fechar sessão:', error);
      }
      sessionRef.current = null;
    }
    clearSessionState();
  }, [clearSessionState]);

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

    // Atualiza estado interno para characterUpdate
    if (message.type === 'characterUpdate') {
      setPlayers(prev =>
        prev.map(p =>
          p.playerId === playerId
            ? { ...p, info: { ...p.info, ...message.payload } }
            : p
        )
      );
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
      const session = await createHostSession({
        onPlayerConnected: handlePlayerConnected,
        onPlayerDisconnected: handlePlayerDisconnected,
        onMessage: handleHostMessage,
        onError: handleHostError,
        onIceRestart: handleIceRestart,
      });

      sessionRef.current = session;
      // Não há mais qrData inicial - convites são criados sob demanda
      setStatus(SESSION_STATUS.ACTIVE);
      setPlayers([]);
      setPendingInvites([]);
      setRestartOffers({});

      console.log('[ConnectionProvider] Sessão Host iniciada:', session.sessionId);

    } catch (error) {
      console.error('[ConnectionProvider] Erro ao criar sessão Host:', error);
      setErrorMessage(error.message || 'Erro ao criar sessão');
      setStatus(SESSION_STATUS.ERROR);
      throw error;
    }
  }, [endSession, handlePlayerConnected, handlePlayerDisconnected, handleHostMessage, handleHostError, handleIceRestart]);

  /**
   * Inicia sessão como Jogador
   * 
   * @param {string} offerQR - QR Code do Mestre (base64)
   * @param {Object} characterInfo - Informações do personagem
   * @param {Object} callbacks - Callbacks para eventos
   * @returns {Promise<void>}
   */
  const startPlayerSession = useCallback(async (offerQR, characterInfo, callbacks = {}) => {
    // Se já existe sessão de player e handleOffer está disponível, usar para reconexão
    if (sessionRef.current?.handleOffer && sessionType === SESSION_TYPES.PLAYER) {
      try {
        const offerData = deserializeFromQR(offerQR);
        if (!offerData || !offerData.offer) {
          throw new Error('QR Code inválido');
        }

        const { answerQR: newAnswerQR } = await sessionRef.current.handleOffer(
          offerData.offer,
          { reason: offerData.reason }
        );

        setAnswerQR(newAnswerQR);
        setStatus(SESSION_STATUS.CREATING);
        
        console.log('[ConnectionProvider] Reconexão de Player processada');
        return;
      } catch (error) {
        console.error('[ConnectionProvider] Erro ao processar reconexão:', error);
        // Continua para criar nova sessão
      }
    }

    // Encerra sessão anterior se existir
    if (sessionRef.current) {
      endSession();
    }

    // Registra callbacks
    callbacksRef.current = callbacks;

    setSessionType(SESSION_TYPES.PLAYER);
    setStatus(SESSION_STATUS.CREATING);
    setErrorMessage(null);

    try {
      const session = await createPlayerSession(offerQR, characterInfo, {
        onConnected: handlePlayerConnectedEvent,
        onDisconnected: handlePlayerDisconnectedEvent,
        onMessage: handlePlayerMessage,
        onError: handlePlayerError,
        onIceRestartRequired: handleIceRestartRequired,
      });

      sessionRef.current = session;
      setAnswerQR(session.answerQR);
      setStatus(SESSION_STATUS.CREATING); // Aguardando Mestre escanear

      console.log('[ConnectionProvider] Sessão Player criada:', session.sessionId);

    } catch (error) {
      console.error('[ConnectionProvider] Erro ao criar sessão Player:', error);
      setErrorMessage(error.message || 'Erro ao conectar');
      setStatus(SESSION_STATUS.ERROR);
      throw error;
    }
  }, [endSession, sessionType, handlePlayerConnectedEvent, handlePlayerDisconnectedEvent, handlePlayerMessage, handlePlayerError, handleIceRestartRequired]);

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
    return sessionRef.current.sendCharacterUpdate(data);
  }, [sessionType]);

  /**
   * Envia rolagem de dados (Jogador)
   */
  const sendDiceRoll = useCallback((rollData) => {
    if (!sessionRef.current || sessionType !== SESSION_TYPES.PLAYER) {
      console.warn('[ConnectionProvider] Sessão de Player não ativa');
      return false;
    }
    return sessionRef.current.sendDiceRoll(rollData);
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
    requestIceRestart,
    updateCallbacks,
    
    // Acesso à sessão (para casos especiais)
    getSession: () => sessionRef.current,
  }), [
    sessionType, status, players, pendingInvites, answerQR, errorMessage, restartOffers,
    startHostSession, startPlayerSession, endSession, createInvite, cancelInvite, addAnswer, handleOffer,
    sendToPlayer, broadcast, sendCharacterUpdate, sendDiceRoll, requestIceRestart,
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
