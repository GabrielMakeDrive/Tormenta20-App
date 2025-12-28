/**
 * MestreView - Tela do Mestre para gerenciar sessão de campanha
 * 
 * Fluxo (HTTP + WebRTC):
 * 1. Mestre inicia sessão, cria sala via backend
 * 2. Exibe ID da sala para compartilhar com jogadores
 * 3. Polling detecta novos jogadores e conecta automaticamente via WebRTC
 * 4. Mestre gerencia jogadores conectados e recebe mensagens em tempo real
 * 
 * Arquitetura:
 * - Sinalização via HTTP polling com backend Python
 * - WebRTC P2P para sincronização de estado
 * - Host gerencia múltiplas conexões
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, Modal, ChatPanel } from '../../components';
import {
  useConnection,
  SESSION_STATUS,
  isWebRTCSupported,
  isAndroidPlatform,
} from '../../services';
import { useRoom } from '../../context/RoomContext';
import { loadSettings, loadCharacters } from '../../services';
import './CampaignSession.css';

// Estados da sessão (mapeia para SESSION_STATUS do Provider)
const SESSION_STATES = {
  IDLE: SESSION_STATUS.IDLE,
  CREATING: SESSION_STATUS.CREATING,
  ACTIVE: SESSION_STATUS.ACTIVE,
  ERROR: SESSION_STATUS.ERROR,
};

function MestreView() {
  const navigate = useNavigate();

  // === Room Context ===
  const { roomId, role, apiToken } = useRoom();

  // === Conexão via Context (Provider) ===
  const {
    status,
    players: contextPlayers,
    errorMessage: contextErrorMessage,
    isActive,
    startHostSession,
    endSession,
    updateCallbacks,
    sendChatMessage,
  } = useConnection();

  // Mapeia status do contexto para estado local da sessão
  // SESSION_STATUS.CONNECTED também deve exibir a interface ativa do mestre
  const sessionState =
    status === SESSION_STATUS.CONNECTED
      ? SESSION_STATUS.ACTIVE
      : status;

  // Estado dos jogadores (do contexto)
  const players = contextPlayers;

  // Erro (do contexto)
  const errorMessage = contextErrorMessage;

  // === Estado local de UI ===
  const [rolls, setRolls] = useState([]);

  // Toast
  const [toast, setToast] = useState(null);

  // Configurações
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true });

  // Modais
  const [showCloseModal, setShowCloseModal] = useState(false);

  // === Personagem do Mestre ===
  const [hostCharacter, setHostCharacter] = useState(null);

  // === Estado de Chat ===
  const [chatMessages, setChatMessages] = useState({}); // { [playerId]: Message[] }
  const [unreadCounts, setUnreadCounts] = useState({}); // { [playerId]: number }
  const [activeChatPlayerId, setActiveChatPlayerId] = useState(null); // Qual jogador está com chat aberto
  const MAX_CHAT_MESSAGES = 100;

  // Ref para controlar se o auto-resume já foi tentado (evita chamadas duplicadas)
  const hasResumedRef = useRef(false);

  // Carrega configurações e personagem do mestre
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);

    // Busca o personagem favorito para exibir como Mestre
    const characters = loadCharacters();
    const favorite = characters.find(c => c.isFavorite) || characters[0];
    setHostCharacter(favorite);
  }, []);



  // Feedback tátil/sonoro
  const playFeedback = useCallback((type = 'default') => {
    if (settings.vibrationEnabled && navigator.vibrate) {
      const patterns = {
        default: 50,
        success: [50, 50, 100],
        error: [100, 50, 100],
      };
      navigator.vibrate(patterns[type] || patterns.default);
    }
  }, [settings.vibrationEnabled]);

  /**
   * Callbacks para eventos da sessão WebRTC (registrados no Provider)
   */
  const handlePlayerConnected = useCallback((playerId, playerData) => {
    console.log('[MestreView] Jogador conectado:', playerId, playerData);

    playFeedback('success');
    setToast({
      message: `${playerData?.info?.characterName || 'Jogador'} conectado!`,
      type: 'success'
    });
  }, [playFeedback]);

  const handlePlayerDisconnected = useCallback((playerId, playerInfo) => {
    console.log('[MestreView] Jogador desconectado:', playerId);

    playFeedback('error');
    setToast({
      message: `${playerInfo?.characterName || 'Jogador'} desconectou`,
      type: 'warning'
    });
  }, [playFeedback]);

  const handleMessage = useCallback((playerId, message) => {
    console.log('[MestreView] Mensagem recebida:', playerId, message.type);

    switch (message.type) {
      case 'diceRoll':
        // Adiciona rolagem ao histórico usando a estrutura do RollRecord
        // Os campos são compatíveis com RollRecord: diceType, diceCount, modifier, rolls, total, description, rollType, etc.
        const rollEntry = {
          id: message.id || Date.now() + Math.random(), // Usa ID do RollRecord se disponível
          playerId, // Usado para correlacionar com jogador e buscar nome/ícone dinamicamente
          // Dados do RollRecord
          diceType: message.diceType || 'd20',
          diceCount: message.diceCount || 1,
          modifier: message.modifier || 0,
          rolls: message.rolls || [],
          total: message.total || 0,
          description: message.description || '',
          rollType: message.rollType || 'normal',
          isCriticalSuccess: message.isCriticalSuccess || false,
          isCriticalFailure: message.isCriticalFailure || false,
          timestamp: message.timestamp || Date.now(),
        };
        setRolls(prev => [rollEntry, ...prev].slice(0, 50));
        playFeedback();
        break;

      case 'hello':
        console.log('[MestreView] Handshake recebido:', message.characterInfo?.characterName);
        // O Provider já atualiza a lista de jogadores, aqui podemos apenas dar um feedback visual se quiser
        break;

      case 'characterUpdate':
        console.log('[MestreView] Atualização de personagem recebida:', playerId, message.data);
        // O Provider já processa characterUpdate e atualiza a lista de jogadores automaticamente
        // Aqui podemos dar feedback visual adicional se necessário
        break;

      default:
        console.log('[MestreView] Mensagem não tratada:', message.type);
    }
  }, [playFeedback]);

  const handleError = useCallback((error) => {
    console.error('[MestreView] Erro:', error);
    setToast({ message: error.error || 'Erro na conexão', type: 'error' });
  }, []);

  /**
   * Callback para mensagens de chat recebidas de jogadores
   */
  const handleChatMessage = useCallback((playerId, messagePayload) => {
    console.log('[MestreView] Chat recebido de:', playerId, messagePayload.text);

    // Adiciona mensagem ao histórico do jogador
    setChatMessages(prev => {
      const playerMessages = prev[playerId] || [];
      const newMessage = {
        ...messagePayload,
        isOwn: false, // Mensagem recebida
      };
      // Limita a MAX_CHAT_MESSAGES
      const updated = [...playerMessages, newMessage].slice(-MAX_CHAT_MESSAGES);
      return { ...prev, [playerId]: updated };
    });

    // Incrementa contador de não lidas se chat não está aberto
    if (activeChatPlayerId !== playerId) {
      setUnreadCounts(prev => ({
        ...prev,
        [playerId]: (prev[playerId] || 0) + 1,
      }));
      playFeedback();
    }
  }, [activeChatPlayerId, playFeedback]);

  // Tenta retomar sessão se houver dados persistidos
  useEffect(() => {
    // Verifica se já tentou retomar para evitar chamadas duplicadas
    if (hasResumedRef.current) return;

    const shouldResume = roomId && role === 'host' && apiToken && status === SESSION_STATUS.IDLE;

    if (shouldResume) {
      hasResumedRef.current = true; // Marca como já tentado ANTES de chamar
      console.log('[MestreView] Resumindo sessão persistida:', roomId);
      startHostSession({
        resumeInfo: { roomId, apiToken },
        onPlayerConnected: handlePlayerConnected,
        onPlayerDisconnected: handlePlayerDisconnected,
        onMessage: handleMessage,
        onChatMessage: handleChatMessage,
        onError: handleError,
      }).catch(err => {
        console.error('[MestreView] Falha ao resumir sessão:', err);
        hasResumedRef.current = false; // Permite tentar novamente em caso de erro
      });
    }
  }, [roomId, role, apiToken, status, startHostSession, handlePlayerConnected, handlePlayerDisconnected, handleMessage, handleChatMessage, handleError]);

  // Registra callbacks no Provider quando monta ou callbacks mudam
  useEffect(() => {
    updateCallbacks({
      onPlayerConnected: handlePlayerConnected,
      onPlayerDisconnected: handlePlayerDisconnected,
      onMessage: handleMessage,
      onChatMessage: handleChatMessage,
      onError: handleError,
    });
  }, [updateCallbacks, handlePlayerConnected, handlePlayerDisconnected, handleMessage, handleChatMessage, handleError]);

  /**
   * Encerra a sala e volta
   */
  const handleConfirmCloseRoom = () => {
    endSession();
    setShowCloseModal(false);
    navigate('/');
  };

  /**
   * Inicia uma nova sessão como Mestre (via Provider)
   */
  const startSession = async () => {
    if (!isWebRTCSupported()) {
      setToast({ message: 'WebRTC não suportado neste navegador', type: 'error' });
      return;
    }

    try {
      await startHostSession({
        onPlayerConnected: handlePlayerConnected,
        onPlayerDisconnected: handlePlayerDisconnected,
        onMessage: handleMessage,
        onError: handleError,
      });

      setRolls([]);

      playFeedback('success');
      setToast({ message: 'Sessão iniciada! Compartilhe o ID da sala com os jogadores.', type: 'success' });

    } catch (error) {
      console.error('[MestreView] Erro ao criar sessão:', error);
      setToast({ message: error.message || 'Erro ao criar sessão', type: 'error' });
    }
  };

  /**
   * Renderiza a lista de jogadores/personagens conectados
   */
  const renderPlayersList = () => {
    // Lista final que inclui o mestre e os jogadores
    const displayList = [];

    // Adiciona o mestre como primeiro item se tiver personagem
    // Usando blindagem total contra campos faltantes
    if (hostCharacter) {
      displayList.push({
        playerId: 'host',
        status: 'connected',
        isHost: true,
        info: {
          characterName: `(Host) ${hostCharacter.name || 'Mestre'}`,
          characterIcon: hostCharacter.icon || '💂‍♂️',
          characterClass: hostCharacter.className || 'Mestre',
          characterLevel: hostCharacter.level || '',
          currentHp: hostCharacter.hp?.current,
          maxHp: hostCharacter.hp?.max,
          currentMp: hostCharacter.mp?.current,
          maxMp: hostCharacter.mp?.max,
        }
      });
    }

    // Adiciona os demais jogadores conectados
    if (Array.isArray(players)) {
      const activePeers = players.filter(p => p && p.playerId !== 'host');
      displayList.push(...activePeers);
    }

    if (displayList.length === 0) {
      return (
        <div className="empty-players">
          <div className="empty-icon">👥</div>
          <p>Nenhum jogador conectado</p>
          <p className="text-muted">Os jogadores aparecerão aqui ao entrar</p>
        </div>
      );
    }

    return (
      <div className="players-list">
        {displayList.map(player => {
          if (!player) return null;

          const pId = player.playerId || Math.random().toString();
          const pStatus = player.status || 'pending';
          const pInfo = player.info || {};

          return (
            <div
              key={pId}
              className={`player-card ${pStatus} ${player.isHost ? 'host-card' : ''}`}
            >
              <div className="player-avatar">
                {pInfo.characterIcon || '👤'}
              </div>
              <div className="player-info">
                <div className="player-name">
                  {pInfo.characterName || (pStatus === 'connected' ? 'Sincronizando...' : 'Conectando...')}
                </div>
                <div className="player-details">
                  {pInfo.characterClass ? (
                    <span>{pInfo.characterClass} {pInfo.characterLevel ? `Nv.${pInfo.characterLevel}` : ''}</span>
                  ) : (
                    <span className="text-muted">Aguardando dados...</span>
                  )}
                </div>
              </div>
              <div className="player-status">
                <span className={`status-badge ${pStatus}`}>
                  {pStatus === 'connected' ? 'Conectado' :
                    pStatus === 'pending' || pStatus === 'connecting' ? 'Iniciando' :
                      pStatus === 'disconnected' ? 'Offline' : 'Reconectando'}
                </span>

                {pInfo.currentHp !== undefined && pInfo.maxHp !== undefined && (
                  <div className="player-stats">
                    <span className="stat-hp">❤️ {pInfo.currentHp}/{pInfo.maxHp}</span>
                    {pInfo.currentMp !== undefined && (
                      <span className="stat-mp">💧 {pInfo.currentMp}/{pInfo.maxMp}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Botão de Chat */}
              {pStatus === 'connected' && !player.isHost && (
                <button
                  className="player-chat-btn"
                  onClick={() => {
                    setActiveChatPlayerId(pId);
                    // Zera contador de não lidas
                    setUnreadCounts(prev => ({ ...prev, [pId]: 0 }));
                  }}
                  title="Abrir chat"
                >
                  💬
                  {unreadCounts[pId] > 0 && (
                    <span className="chat-unread-badge">{unreadCounts[pId]}</span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * Renderiza histórico de rolagens
   * Busca nome/ícone do jogador dinamicamente da lista de players para refletir atualizações em tempo real
   */
  const renderRollsHistory = () => {
    if (rolls.length === 0) return null;

    /**
     * Busca dados do jogador pelo playerId para exibição dinâmica
     * @param {string} playerId - ID do jogador (deviceId WebRTC)
     * @returns {Object} - { name, icon }
     */
    const getPlayerDisplay = (playerId) => {
      const player = players.find(p => p.playerId === playerId);
      return {
        name: player?.info?.characterName || 'Jogador',
        icon: player?.info?.characterIcon || '🎲',
      };
    };

    /**
     * Formata os detalhes da rolagem para exibição
     * @param {Object} roll - Dados da rolagem
     * @returns {string} - Detalhes formatados (ex: "[15, 8] + 3")
     */
    const formatRollDetails = (roll) => {
      const rollsStr = roll.rolls && roll.rolls.length > 0
        ? `[${roll.rolls.join(', ')}]`
        : '';
      const modStr = roll.modifier !== 0
        ? ` ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`
        : '';
      return `${rollsStr}${modStr}`;
    };

    return (
      <section className="rolls-section">
        <h4>🎲 Rolagens Recentes</h4>
        <div className="rolls-list">
          {rolls.map(roll => {
            const playerDisplay = getPlayerDisplay(roll.playerId);
            const rollDetails = formatRollDetails(roll);
            const isCritical = roll.isCriticalSuccess || roll.isCriticalFailure;

            return (
              <div
                key={roll.id}
                className={`roll-item ${roll.isCriticalSuccess ? 'critical-success' : ''} ${roll.isCriticalFailure ? 'critical-failure' : ''}`}
              >
                <span className="roll-player">{playerDisplay.icon}</span>
                <div className="roll-info">
                  <div className="roll-description">
                    <strong>{playerDisplay.name}</strong>: {roll.description || `${roll.diceCount}${roll.diceType}`}
                    {roll.isCriticalSuccess && <span className="critical-badge success">🎉 Crítico!</span>}
                    {roll.isCriticalFailure && <span className="critical-badge failure">💀 Falha!</span>}
                  </div>
                  <div className="roll-details">
                    {rollDetails}
                  </div>
                </div>
                <div className={`roll-result ${isCritical ? 'critical' : ''}`}>{roll.total}</div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="page campaign-session-page">
      <Header
        title="Sessão do Mestre"
        showBack
      />

      <main className="page-content">
        {/* Aviso de compatibilidade */}
        {!isAndroidPlatform() && (
          <div className="compatibility-warning">
            <p>⚠️ Esta funcionalidade é otimizada para Android. Pode não funcionar corretamente em outros dispositivos.</p>
          </div>
        )}

        {/* Estado: Aguardando iniciar */}
        {sessionState === SESSION_STATES.IDLE && (
          <>
            <section className="qr-section">
              <h3>🏰 Iniciar Sessão de Campanha</h3>
              <p className="qr-subtitle">
                Como Mestre, você poderá ver o status dos personagens e rolagens de dados dos jogadores conectados.
              </p>
              <div className="action-buttons">
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={startSession}
                >
                  ⚔️ Iniciar como Mestre
                </Button>
              </div>
            </section>

            <section className="info-section">
              <div className="info-card">
                <h4>💡 Como funciona</h4>
                <p>1. Inicie a sessão</p>
                <p>2. Compartilhe o ID da sala com os jogadores</p>
                <p>3. Os jogadores entram digitando o ID</p>
                <p>4. Pronto! Você verá os status em tempo real</p>
              </div>
            </section>
          </>
        )}

        {/* Estado: Criando sessão */}
        {sessionState === SESSION_STATES.CREATING && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Criando sessão...</p>
          </div>
        )}

        {/* Estado: Sessão ativa */}
        {sessionState === SESSION_STATES.ACTIVE && (
          <>
            {/* ID da Sala */}
            <section className="room-id-section">
              <h4>🏰 Sala Criada</h4>
              <div className="room-id-display">
                <p>ID da Sala: <strong>{roomId}</strong></p>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => navigator.clipboard.writeText(roomId)}
                >
                  📋 Copiar ID
                </Button>
              </div>
              <p className="room-id-info">
                Compartilhe este ID com os jogadores para que eles possam entrar na sessão.
              </p>
            </section>

            {/* Lista de jogadores */}
            <section className="players-section">
              <h4>
                <span>👥 Jogadores Conectados</span>
                <span className="player-count">
                  {players.filter(p => p && p.status === 'connected').length}
                </span>
              </h4>
              {renderPlayersList()}
            </section>

            {/* Histórico de rolagens */}
            {renderRollsHistory()}

            {/* Ações da Sessão */}
            <div className="session-actions">
              <Button
                variant="danger"
                fullWidth
                onClick={() => setShowCloseModal(true)}
              >
                🛑 Encerrar Sala
              </Button>
            </div>
          </>
        )}

        {/* Estado: Erro */}
        {sessionState === SESSION_STATES.ERROR && (
          <section className="qr-section">
            <h3>❌ Erro</h3>
            <p className="qr-subtitle">{errorMessage}</p>
            <div className="action-buttons">
              <Button
                variant="primary"
                onClick={startSession}
              >
                🔄 Tentar Novamente
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
              >
                ← Voltar
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Toast de feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal de confirmação para encerrar sala */}
      <Modal
        isOpen={showCloseModal}
        title="Encerrar Sala?"
        onClose={() => setShowCloseModal(false)}
      >
        <p>Tem certeza que deseja encerrar a sala? Todos os jogadores serão desconectados e a sala será fechada permanentemente.</p>
        <div className="modal-footer-actions">
          <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmCloseRoom}>
            Encerrar Sessão
          </Button>
        </div>
      </Modal>

      {/* Painel de Chat com jogador selecionado */}
      {activeChatPlayerId && (() => {
        // Busca dados do jogador ativo
        const activePlayer = players.find(p => p.playerId === activeChatPlayerId);
        const playerInfo = activePlayer?.info || {};
        const playerName = playerInfo.characterName || 'Jogador';
        const playerIcon = playerInfo.characterIcon || '👤';

        // Função para enviar mensagem
        const handleSendMessage = (text) => {
          // Prepara nome/ícone do mestre
          const mestreName = hostCharacter?.name || 'Mestre';
          const mestreIcon = hostCharacter?.icon || '👑';

          // Envia via WebRTC
          const sent = sendChatMessage(text, mestreName, mestreIcon, activeChatPlayerId);

          if (sent) {
            // Adiciona ao histórico local como mensagem própria
            setChatMessages(prev => {
              const playerMessages = prev[activeChatPlayerId] || [];
              const newMessage = {
                id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text,
                senderName: mestreName,
                senderIcon: mestreIcon,
                timestamp: Date.now(),
                isOwn: true,
              };
              const updated = [...playerMessages, newMessage].slice(-MAX_CHAT_MESSAGES);
              return { ...prev, [activeChatPlayerId]: updated };
            });
          }
        };

        return (
          <ChatPanel
            isOpen={true}
            messages={chatMessages[activeChatPlayerId] || []}
            recipientName={playerName}
            recipientIcon={playerIcon}
            onSendMessage={handleSendMessage}
            onClose={() => setActiveChatPlayerId(null)}
          />
        );
      })()}
    </div>
  );
}

export default MestreView;