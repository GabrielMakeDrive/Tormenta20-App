/**
 * JogadorView - Tela do Jogador para conectar na sessão do Mestre
 * 
 * Fluxo (HTTP + WebRTC):
 * 1. Jogador seleciona personagem que usará na sessão
 * 2. Digita o ID da sala fornecido pelo Mestre
 * 3. Conecta via HTTP e WebRTC automaticamente
 * 4. Envia dados do personagem e rolagens em tempo real
 * 
 * Arquitetura:
 * - Sinalização via HTTP polling com backend Python
 * - WebRTC P2P para sincronização de estado
 * - Peer conecta ao Host
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, Modal, ChatPanel } from '../../components';
import {
  useConnection,
  SESSION_STATUS,
  isWebRTCSupported,
  isAndroidPlatform
} from '../../services';
import { loadCharacters, loadSettings } from '../../services';
import { calculateMaxHp, calculateMaxMp } from '../../models';
import './CampaignSession.css';

// Estados da conexão
const CONNECTION_STATES = {
  SELECTING: 'selecting', // Selecionando personagem e digitando roomId
  CONNECTING: SESSION_STATUS.CREATING,
  CONNECTED: SESSION_STATUS.CONNECTED,
  DISCONNECTED: SESSION_STATUS.DISCONNECTED,
  ERROR: SESSION_STATUS.ERROR,
};

function JogadorView() {
  const navigate = useNavigate();

  // === Conexão via Context (Provider) ===
  const {
    status,
    errorMessage: contextErrorMessage,
    isPlayer,
    startPlayerSession,
    endSession,
    sendCharacterUpdate,
    sendChatMessage,
    updateCallbacks,
  } = useConnection();

  // === Estado local de UI ===
  // Estado da conexão
  const [localState, setLocalState] = useState(CONNECTION_STATES.SELECTING);
  const [errorMessage, setErrorMessage] = useState(null);

  // Personagens e seleção
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // Entrada do ID da sala
  const [roomIdInput, setRoomIdInput] = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  // Configurações
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true });

  // === Estado de Chat ===
  const [chatMessages, setChatMessages] = useState([]); // Array simples (só conversa com mestre)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const MAX_CHAT_MESSAGES = 100;

  // Deriva o estado de conexão
  const connectionState = (() => {
    if (status === SESSION_STATUS.CONNECTED) return CONNECTION_STATES.CONNECTED;
    if (status === SESSION_STATUS.DISCONNECTED && isPlayer) return CONNECTION_STATES.DISCONNECTED;
    if (status === SESSION_STATUS.ERROR) return CONNECTION_STATES.ERROR;
    if (status === SESSION_STATUS.CREATING) return CONNECTION_STATES.CONNECTING;
    return localState;
  })();

  // Carrega personagens e configurações
  useEffect(() => {
    const loadedCharacters = loadCharacters();
    setCharacters(loadedCharacters);

    // Seleciona favorito ou primeiro
    const favorite = loadedCharacters.find(c => c.isFavorite);
    if (favorite) {
      setSelectedCharacter(favorite);
    } else if (loadedCharacters.length > 0) {
      setSelectedCharacter(loadedCharacters[0]);
    }

    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
  }, []);

  // Feedback tátil
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
   * Prepara dados resumidos do personagem para envio
   */
  const getCharacterSummary = useCallback((character) => {
    if (!character) return null;

    const maxHp = calculateMaxHp(character);
    const maxMp = calculateMaxMp(character);

    return {
      characterId: character.id,
      characterName: character.name,
      characterIcon: character.icon || '👤',
      characterClass: character.className,
      characterRace: character.raceName,
      characterLevel: character.level,
      currentHp: character.currentHp ?? maxHp,
      maxHp,
      currentMp: character.currentMp ?? maxMp,
      maxMp,
    };
  }, []);

  /**
   * Callbacks para eventos da sessão WebRTC (registrados no Provider)
   */
  const handleConnected = useCallback(() => {
    console.log('[JogadorView] Conectado ao Mestre!');
    playFeedback('success');
    setToast({ message: 'Conectado ao Mestre!', type: 'success' });
  }, [playFeedback]);

  const handleDisconnected = useCallback(() => {
    console.log('[JogadorView] Desconectado do Mestre');
    playFeedback('error');
    setToast({ message: 'Conexão perdida com o Mestre', type: 'warning' });
  }, [playFeedback]);

  const handleMessage = useCallback((message) => {
    console.log('[JogadorView] Mensagem do Mestre:', message.type);
    // Processa mensagens do Mestre se necessário
  }, []);

  const handleError = useCallback((error) => {
    console.error('[JogadorView] Erro:', error);
    setErrorMessage(error.error || 'Erro na conexão');
    setToast({ message: error.error || 'Erro na conexão', type: 'error' });
  }, []);

  /**
   * Callback para mensagens de chat recebidas do mestre
   */
  const handleChatMessage = useCallback((_, messagePayload) => {
    console.log('[JogadorView] Chat recebido do mestre:', messagePayload.text);

    // Adiciona mensagem ao histórico
    setChatMessages(prev => {
      const newMessage = {
        ...messagePayload,
        isOwn: false, // Mensagem recebida
      };
      return [...prev, newMessage].slice(-MAX_CHAT_MESSAGES);
    });

    // Incrementa contador de não lidas se chat não está aberto
    if (!isChatOpen) {
      setUnreadCount(prev => prev + 1);
      playFeedback();
    }
  }, [isChatOpen, playFeedback]);

  const handleIceRestartRequired = useCallback(() => {
    console.log('[JogadorView] Mestre solicitou reinício de ICE');
    setLocalState(CONNECTION_STATES.SELECTING);
    setToast({ message: 'Mestre solicitou reinício. Peça um novo convite ao Mestre.', type: 'info' });
  }, []);

  // Registra callbacks no Provider quando monta ou callbacks mudam
  useEffect(() => {
    updateCallbacks({
      onConnected: handleConnected,
      onDisconnected: handleDisconnected,
      onMessage: handleMessage,
      onChatMessage: handleChatMessage,
      onError: handleError,
      onIceRestartRequired: handleIceRestartRequired,
    });
  }, [updateCallbacks, handleConnected, handleDisconnected, handleMessage, handleChatMessage, handleError, handleIceRestartRequired]);

  /**
   * Conecta à sessão do Mestre
   */
  const handleConnect = async () => {
    if (!selectedCharacter) {
      setToast({ message: 'Selecione um personagem primeiro', type: 'error' });
      return;
    }

    if (!roomIdInput.trim()) {
      setToast({ message: 'Digite o ID da sala', type: 'error' });
      return;
    }

    if (!isWebRTCSupported()) {
      setToast({ message: 'WebRTC não suportado neste navegador', type: 'error' });
      return;
    }

    try {
      setLocalState(CONNECTION_STATES.CONNECTING);
      setErrorMessage(null);

      // Preparar resumo do personagem para envio
      const characterSummary = getCharacterSummary(selectedCharacter);

      await startPlayerSession(roomIdInput.trim(), characterSummary, {
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
        onMessage: handleMessage,
        onError: handleError,
      });

      playFeedback('success');
      setToast({ message: 'Conectando à sessão...', type: 'success' });

    } catch (error) {
      console.error('[JogadorView] Erro ao conectar:', error);
      setLocalState(CONNECTION_STATES.ERROR);
      setErrorMessage(error.message || 'Erro ao conectar');
      setToast({ message: error.message || 'Erro ao conectar', type: 'error' });
    }
  };

  /**
   * Fecha conexão e volta (via Provider)
   */
  const closeConnection = () => {
    endSession();
    navigate(-1);
  };

  // Nota: cleanup não é mais necessário aqui - o Provider gerencia o ciclo de vida

  /**
   * Renderiza seletor de personagem
   */
  const renderCharacterSelector = () => {
    if (characters.length === 0) {
      return (
        <div className="no-characters-cta">
          <p>Você precisa criar um personagem primeiro</p>
          <Button
            variant="primary"
            onClick={() => navigate('/characters/new')}
          >
            ➕ Criar Personagem
          </Button>
        </div>
      );
    }

    return (
      <select
        className="character-selector"
        value={selectedCharacter?.id || ''}
        onChange={(e) => {
          const char = characters.find(c => c.id === e.target.value);
          setSelectedCharacter(char);
        }}
      >
        {characters.map(char => (
          <option key={char.id} value={char.id}>
            {char.icon} {char.name} - {char.className} Nv.{char.level}
          </option>
        ))}
      </select>
    );
  };

  /**
   * Renderiza status do personagem conectado
   */
  const renderCharacterStatus = () => {
    if (!selectedCharacter) return null;

    const maxHp = calculateMaxHp(selectedCharacter);
    const maxMp = calculateMaxMp(selectedCharacter);
    const currentHp = selectedCharacter.currentHp ?? maxHp;
    const currentMp = selectedCharacter.currentMp ?? maxMp;

    return (
      <section className="character-status">
        <h4>
          <span>{selectedCharacter.icon}</span>
          <span>{selectedCharacter.name}</span>
        </h4>
        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">PV</div>
            <div className="status-value hp">{currentHp}/{maxHp}</div>
          </div>
          <div className="status-item">
            <div className="status-label">PM</div>
            <div className="status-value mp">{currentMp}/{maxMp}</div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="page campaign-session-page">
      <Header
        title="Entrar na Sessão"
        showBack
      />

      <main className="page-content">
        {/* Aviso de compatibilidade */}
        {!isAndroidPlatform() && (
          <div className="compatibility-warning">
            <p>⚠️ Esta funcionalidade é otimizada para Android. Pode não funcionar corretamente em outros dispositivos.</p>
          </div>
        )}

        {/* Estado: Selecionando personagem */}
        {connectionState === CONNECTION_STATES.SELECTING && (
          <>
            <section className="character-selection">
              <h4>👤 Selecione seu Personagem</h4>
              {renderCharacterSelector()}
            </section>

            {selectedCharacter && (
              <>
                <section className="room-id-section">
                  <h3>🏰 Entrar na Sessão</h3>
                  <p className="room-id-subtitle">
                    Digite o ID da sala fornecido pelo Mestre
                  </p>

                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="ID da sala"
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value)}
                      className="room-id-input"
                    />
                  </div>

                  <div className="action-buttons">
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      onClick={handleConnect}
                    >
                      ⚔️ Entrar na Sessão
                    </Button>
                  </div>

                </section>

                <section className="info-section">
                  <div className="info-card">
                    <h4>💡 Como conectar</h4>
                    <p>1. Peça o ID da sala ao Mestre</p>
                    <p>2. Digite o ID aqui</p>
                    <p>3. Clique em "Entrar na Sessão"</p>
                    <p>4. Pronto! Você está na sessão</p>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* Estado: Conectado */}
        {connectionState === CONNECTION_STATES.CONNECTED && (
          <>
            <div className="connection-status connected">
              <span className="status-dot"></span>
              <span>Conectado à sessão do Mestre</span>
            </div>

            {renderCharacterStatus()}

            <section className="info-section">
              <div className="info-card">
                <h4>✅ Você está na sessão!</h4>
                <p>O Mestre pode ver seu status e rolagens de dados.</p>
                <p>Use o botão "Enviar Status" para atualizar manualmente.</p>
              </div>
            </section>

            <div className="action-buttons">
              <Button
                variant="primary"
                onClick={() => navigate('/dice', { state: { characterId: selectedCharacter?.id } })}
              >
                🎲 Rolar Dados
              </Button>
              <Button
                variant="danger"
                onClick={closeConnection}
              >
                ❌ Sair da Sessão
              </Button>
            </div>
          </>
        )}

        {/* Estado: Desconectado */}
        {connectionState === CONNECTION_STATES.DISCONNECTED && (
          <>
            <div className="connection-status disconnected">
              <span className="status-dot"></span>
              <span>Desconectado da sessão</span>
            </div>

            <section className="qr-section">
              <h3>🔌 Conexão Perdida</h3>
              <p className="qr-subtitle">
                A conexão com o Mestre foi interrompida
              </p>
              <div className="action-buttons">
                <Button
                  variant="secondary"
                  onClick={() => navigate(-1)}
                >
                  ← Voltar
                </Button>
              </div>
            </section>
          </>
        )}

        {/* Estado: Erro */}
        {connectionState === CONNECTION_STATES.ERROR && (
          <section className="qr-section">
            <h3>❌ Erro</h3>
            <p className="qr-subtitle">{errorMessage || contextErrorMessage}</p>
            <div className="action-buttons">
              <Button
                variant="primary"
                onClick={() => setLocalState(CONNECTION_STATES.SELECTING)}
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

      {/* Botão flutuante de chat (visível apenas quando conectado) */}
      {connectionState === CONNECTION_STATES.CONNECTED && (
        <button
          className="chat-fab"
          onClick={() => {
            setIsChatOpen(true);
            setUnreadCount(0);
          }}
          title="Abrir chat com Mestre"
        >
          💬
          {unreadCount > 0 && (
            <span className="chat-fab-badge">{unreadCount}</span>
          )}
        </button>
      )}

      {/* Painel de Chat com o Mestre */}
      {isChatOpen && (() => {
        // Função para enviar mensagem
        const handleSendMessage = (text) => {
          const charName = selectedCharacter?.name || 'Jogador';
          const charIcon = selectedCharacter?.icon || '👤';

          // Envia via WebRTC
          const sent = sendChatMessage(text, charName, charIcon);

          if (sent) {
            // Adiciona ao histórico local como mensagem própria
            setChatMessages(prev => {
              const newMessage = {
                id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text,
                senderName: charName,
                senderIcon: charIcon,
                timestamp: Date.now(),
                isOwn: true,
              };
              return [...prev, newMessage].slice(-MAX_CHAT_MESSAGES);
            });
          }
        };

        return (
          <ChatPanel
            isOpen={true}
            messages={chatMessages}
            recipientName="Mestre"
            recipientIcon="👑"
            onSendMessage={handleSendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        );
      })()}
    </div>
  );
}

export default JogadorView;
