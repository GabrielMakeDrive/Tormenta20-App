/**
 * MestreView - Tela do Mestre para gerenciar sessão de campanha
 * 
 * Fluxo (v2 - Convites Individuais):
 * 1. Usuário inicia sessão clicando em "Iniciar Sessão"
 * 2. Mestre clica "Gerar Convite" para cada jogador
 * 3. Cada convite gera um código único (copia/cola, sem QR Code)
 * 4. Jogador cola o código e gera resposta
 * 5. Mestre cola a resposta do jogador
 * 6. Conexão estabelecida, jogador aparece na lista
 * 7. Mestre recebe updates de status e rolagens em tempo real
 * 
 * Arquitetura:
 * - Cada jogador tem sua própria conexão RTCPeerConnection
 * - Convites pendentes ficam em lista até receberem answer
 * - Sem QR Code (SDP muito grande para leitura confiável)
 * - Usa apenas cópia/cola de texto
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, Modal } from '../../components';
import { 
  useConnection,
  SESSION_STATUS,
  deserializeFromQR,
  isWebRTCSupported,
  isAndroidPlatform,
} from '../../services';
import { loadSettings } from '../../services';
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
  
  // === Conexão via Context (Provider) ===
  const {
    status,
    players: contextPlayers,
    pendingInvites,
    errorMessage: contextErrorMessage,
    restartOffers: contextRestartOffers,
    isActive,
    startHostSession,
    endSession,
    createInvite,
    cancelInvite,
    addAnswer,
    requestIceRestart,
    updateCallbacks,
  } = useConnection();

  // Mapeia status do contexto para estado local da sessão
  const sessionState = status;
  
  // Estado dos jogadores (do contexto)
  const players = contextPlayers;
  
  // Erro (do contexto)
  const errorMessage = contextErrorMessage;
  
  // Restart offers (do contexto)
  const restartOffers = contextRestartOffers;
  
  // === Estado local de UI ===
  const [rolls, setRolls] = useState([]);
  
  // Input manual de resposta
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerInputValue, setAnswerInputValue] = useState('');
  
  // Toast
  const [toast, setToast] = useState(null);
  // Modal de código do convite
  const [showInviteCode, setShowInviteCode] = useState(null);
  // Texto para cópia manual de restart
  const [restartManualCopyText, setRestartManualCopyText] = useState(null);
  
  // Configurações
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true });

  // Carrega configurações
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
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

  const handleIceRestart = useCallback((playerId, payload) => {
    const playerName = players.find(p => p.playerId === playerId)?.info?.characterName || 'Jogador';
    setToast({ message: `${playerName} precisa escanear o novo QR`, type: 'info' });
  }, [players]);

  const handleManualIceRestart = useCallback(async (playerId) => {
    setToast({ message: 'Solicitando reinício de ICE...', type: 'info' });
    try {
      await requestIceRestart(playerId, 'manual');
    } catch (error) {
      console.error('[MestreView] Falha ao solicitar reinício:', error);
      setToast({ message: 'Não foi possível reiniciar ICE', type: 'error' });
    }
  }, [requestIceRestart]);

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
        // Adiciona rolagem ao histórico
        const rollEntry = {
          id: Date.now(),
          playerId,
          playerName: message.payload.playerName || 'Jogador',
          playerIcon: message.payload.playerIcon || '🎲',
          ...message.payload,
          timestamp: message.ts,
        };
        setRolls(prev => [rollEntry, ...prev].slice(0, 50));
        playFeedback();
        break;
        
      default:
        console.log('[MestreView] Mensagem não tratada:', message.type);
    }
  }, [playFeedback]);

  const handleError = useCallback((error) => {
    console.error('[MestreView] Erro:', error);
    setToast({ message: error.error || 'Erro na conexão', type: 'error' });
  }, []);

  // Registra callbacks no Provider quando monta ou callbacks mudam
  useEffect(() => {
    updateCallbacks({
      onPlayerConnected: handlePlayerConnected,
      onPlayerDisconnected: handlePlayerDisconnected,
      onMessage: handleMessage,
      onError: handleError,
      onIceRestart: handleIceRestart,
    });
  }, [updateCallbacks, handlePlayerConnected, handlePlayerDisconnected, handleMessage, handleError, handleIceRestart]);

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
        onIceRestart: handleIceRestart,
      });

      setRolls([]);
      setRestartManualCopyText(null);
      
      playFeedback('success');
      setToast({ message: 'Sessão iniciada! Crie convites para os jogadores.', type: 'success' });
      
    } catch (error) {
      console.error('[MestreView] Erro ao criar sessão:', error);
      setToast({ message: error.message || 'Erro ao criar sessão', type: 'error' });
    }
  };

  /**
   * Cria um novo convite para um jogador
   */
  const handleCreateInvite = async () => {
    try {
      const invite = await createInvite();
      setShowInviteCode(invite);
      playFeedback('success');
      setToast({ message: 'Convite criado! Envie o código para o jogador.', type: 'success' });
    } catch (error) {
      console.error('[MestreView] Erro ao criar convite:', error);
      setToast({ message: error.message || 'Erro ao criar convite', type: 'error' });
    }
  };

  /**
   * Copia código do convite para clipboard
   */
  const copyInviteToClipboard = async (code) => {
    if (!code) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        setToast({ message: 'Código copiado!', type: 'success' });
        return;
      } catch (err) {
        console.warn('[MestreView] clipboard.writeText falhou:', err);
      }
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        setToast({ message: 'Código copiado!', type: 'success' });
        return;
      }
    } catch (err) {
      console.warn('[MestreView] fallback copy falhou:', err);
    }

    setToast({ message: 'Selecione e copie o código manualmente', type: 'info' });
  };

  /**
   * Processa resposta (answer) de um jogador
   */
  const processAnswer = async () => {
    if (!isActive) {
      setToast({ message: 'Sessão não está ativa', type: 'error' });
      return;
    }

    if (!answerInputValue.trim()) {
      setToast({ message: 'Cole o código de resposta do jogador', type: 'error' });
      return;
    }

    try {
      const answerData = deserializeFromQR(answerInputValue.trim());
      
      if (!answerData || !answerData.answer || !answerData.playerId) {
        throw new Error('Código inválido');
      }

      await addAnswer(answerData.playerId, answerData.answer);
      
      // Limpa input e fecha modal
      setAnswerInputValue('');
      setShowAnswerInput(false);
      
      playFeedback('success');
      setToast({ message: 'Conectando com jogador...', type: 'info' });
      
    } catch (error) {
      console.error('[MestreView] Erro ao processar answer:', error);
      setToast({ message: error.message || 'Erro ao processar resposta', type: 'error' });
    }
  };

  /**
   * Reinicia a sessão (fecha tudo e cria nova via Provider)
   */
  const restartSession = () => {
    endSession();
    setRolls([]);
    setRestartManualCopyText(null);
    setShowInviteCode(null);
    setShowAnswerInput(false);
    setAnswerInputValue('');
    // Após endSession, status volta para IDLE automaticamente
  };

  /**
   * Fecha sessão e volta (via Provider)
   */
  const closeSession = () => {
    endSession();
    setRestartManualCopyText(null);
    navigate(-1);
  };

  // Nota: cleanup não é mais necessário aqui - o Provider gerencia o ciclo de vida

  const renderPlayersList = () => {
    if (players.length === 0) {
      return (
        <div className="empty-players">
          <div className="empty-icon">👥</div>
          <p>Nenhum jogador conectado</p>
          <p className="text-muted">Crie convites e envie para os jogadores</p>
        </div>
      );
    }

    return (
      <div className="players-list">
        {players.map(player => (
          <div 
            key={player.playerId} 
            className={`player-card ${player.status}`}
          >
            <div className="player-avatar">
              {player.info?.characterIcon || '👤'}
            </div>
            <div className="player-info">
              <div className="player-name">
                {player.info?.characterName || 'Conectando...'}
              </div>
              <div className="player-details">
                {player.info?.characterClass && player.info?.characterLevel && (
                  <span>{player.info.characterClass} Nv.{player.info.characterLevel}</span>
                )}
              </div>
            </div>
            <div className="player-status">
              <span className={`status-badge ${player.status}`}>
                {player.status === 'connected' && 'Conectado'}
                {player.status === 'pending' && 'Conectando'}
                {player.status === 'disconnected' && 'Desconectado'}
                {player.status === 'reconnecting' && 'Reconectando'}
              </span>
              {player.restartReason && (
                <div className="reconnect-reason">{player.restartReason}</div>
              )}
              {player.info?.currentHp !== undefined && (
                <div className="player-stats">
                  <span className="stat-hp">❤️ {player.info.currentHp}/{player.info.maxHp}</span>
                  <span className="stat-mp">💧 {player.info.currentMp}/{player.info.maxMp}</span>
                </div>
              )}
            </div>
            {(player.status === 'connected' || player.status === 'reconnecting') && (
              <div className="player-card-actions">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleManualIceRestart(player.playerId)}
                >
                  🔁 Solicitar reinício
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Renderiza lista de convites pendentes
   */
  const renderPendingInvites = () => {
    if (!pendingInvites || pendingInvites.length === 0) return null;

    return (
      <section className="invites-section">
        <h4>📨 Convites Pendentes ({pendingInvites.length})</h4>
        <div className="invites-list">
          {pendingInvites.map(invite => (
            <div key={invite.playerId} className="invite-card">
              <div className="invite-info">
                <span className="invite-id">Convite #{invite.playerId.slice(0, 8)}</span>
                <span className="invite-time">
                  {new Date(invite.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="invite-actions">
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => copyInviteToClipboard(invite.offerCode)}
                >
                  📋 Copiar Código
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowAnswerInput(true)}
                >
                  📝 Inserir Resposta
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => cancelInvite(invite.playerId)}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderRestartOffersSection = () => {
    const entries = Object.entries(restartOffers || {});
    if (entries.length === 0) return null;

    return (
      <section className="restart-section">
        <h4>🔁 Reinícios aguardando resposta</h4>
        <div className="restart-list">
          {entries.map(([playerId, data]) => {
            const playerName = players.find(p => p.playerId === playerId)?.info?.characterName || 'Jogador';
            return (
              <div key={playerId} className="restart-card">
                <div className="restart-header">
                  <div>
                    <strong>{playerName}</strong>
                    <p>{data.reason || 'Reconexão solicitada'}</p>
                  </div>
                </div>
                <div className="restart-actions">
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => copyInviteToClipboard(data.qr)}
                  >
                    📋 Copiar Código
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setRestartManualCopyText({ text: data.qr, playerName })}
                  >
                    ✏️ Ver código
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  /**
   * Renderiza histórico de rolagens
   */
  const renderRollsHistory = () => {
    if (rolls.length === 0) return null;

    return (
      <section className="rolls-section">
        <h4>🎲 Rolagens Recentes</h4>
        <div className="rolls-list">
          {rolls.map(roll => (
            <div key={roll.id} className="roll-item">
              <span className="roll-player">{roll.playerIcon}</span>
              <div className="roll-info">
                <div className="roll-description">
                  {roll.playerName}: {roll.description || roll.dice}
                </div>
                <div className="roll-details">
                  {roll.breakdown}
                </div>
              </div>
              <div className="roll-result">{roll.total}</div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="page campaign-session-page">
      <Header 
        title="Sessão do Mestre" 
        showBack 
        rightAction={
          sessionState === SESSION_STATES.ACTIVE && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={restartSession}
              title="Reiniciar sessão"
            >
              🔄
            </button>
          )
        }
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
                <p>2. Clique "Gerar Convite" para cada jogador</p>
                <p>3. Envie o código para o jogador (WhatsApp, etc.)</p>
                <p>4. Cole a resposta do jogador</p>
                <p>5. Pronto! Você verá os status em tempo real</p>
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
            {/* Controles do Mestre */}
            <section className="controls-section">
              <h4>🎮 Gerenciar Jogadores</h4>
              <div className="action-buttons">
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <Button 
                    variant="primary"
                    fullWidth
                    onClick={handleCreateInvite}
                  >
                    ➕ Gerar Convite
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowAnswerInput(true)}
                  >
                    📝 Inserir Resposta
                  </Button>
                  <Button 
                    variant="danger"
                    onClick={closeSession}
                  >
                    X
                  </Button>
                </div>
              </div>
            </section>

            {/* Convites pendentes */}
            {renderPendingInvites()}

            {/* Lista de jogadores */}
            <section className="players-section">
              <h4>
                <span>👥 Jogadores</span>
                <span className="player-count">{players.filter(p => p.status === 'connected').length}</span>
              </h4>
              {renderPlayersList()}
            </section>

            {renderRestartOffersSection()}

            {/* Histórico de rolagens */}
            {renderRollsHistory()}
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

      {/* Modal para exibir código do convite */}
      {showInviteCode && (
        <Modal
          isOpen={!!showInviteCode}
          title="📨 Código do Convite"
          onClose={() => setShowInviteCode(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Envie este código para o jogador (WhatsApp, Telegram, etc.):
            </p>
            <textarea
              readOnly
              value={showInviteCode.offerCode}
              style={{ 
                width: '100%', 
                minHeight: 100, 
                fontFamily: 'monospace', 
                fontSize: '0.75rem',
                wordBreak: 'break-all'
              }}
              onClick={(e) => e.target.select()}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={() => copyInviteToClipboard(showInviteCode.offerCode)}
              >
                📋 Copiar
              </Button>
              <Button variant="secondary" onClick={() => setShowInviteCode(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para inserir resposta do jogador */}
      {showAnswerInput && (
        <Modal
          isOpen={showAnswerInput}
          title="📝 Resposta do Jogador"
          onClose={() => {
            setShowAnswerInput(false);
            setAnswerInputValue('');
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Cole o código de resposta que o jogador enviou:
            </p>
            <textarea
              autoFocus
              placeholder="Cole aqui o código de resposta do jogador..."
              value={answerInputValue}
              onChange={(e) => setAnswerInputValue(e.target.value)}
              style={{
                width: '100%', 
                minHeight: 100, 
                fontFamily: 'monospace', 
                fontSize: '0.75rem'
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={processAnswer}
                disabled={!answerInputValue.trim()}
              >
                Conectar
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAnswerInput(false);
                  setAnswerInputValue('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para código de reinício */}
      {restartManualCopyText && (
        <Modal
          isOpen={!!restartManualCopyText}
          title={`Código de Reinício - ${restartManualCopyText.playerName || 'Jogador'}`}
          onClose={() => setRestartManualCopyText(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              readOnly
              value={restartManualCopyText.text}
              style={{ width: '100%', minHeight: 120, fontFamily: 'monospace' }}
              onClick={(e) => e.target.select()}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={() => copyInviteToClipboard(restartManualCopyText.text)}
              >
                📋 Copiar
              </Button>
              <Button variant="secondary" onClick={() => setRestartManualCopyText(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MestreView;