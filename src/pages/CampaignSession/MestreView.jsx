/**
 * MestreView - Tela do Mestre para gerenciar sessão de campanha
 * 
 * Fluxo:
 * 1. Usuário inicia sessão clicando em "Iniciar Sessão"
 * 2. Sistema cria RTCPeerConnection e gera offer
 * 3. Offer é serializada e exibida como QR Code
 * 4. Mestre aguarda jogadores escanearem o QR
 * 5. Para cada jogador, Mestre escaneia/insere answer
 * 6. Conexão estabelecida, jogador aparece na lista
 * 7. Mestre recebe updates de status e rolagens em tempo real
 * 
 * Estados:
 * - idle: aguardando iniciar sessão
 * - creating: criando sessão WebRTC
 * - active: sessão ativa, QR visível, aguardando jogadores
 * - error: erro na criação/conexão
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, QRScanner, Modal } from '../../components';
import { 
  createHostSession, 
  deserializeFromQR,
  isWebRTCSupported,
  isAndroidPlatform 
} from '../../services/webrtcSession';
import { loadSettings } from '../../services';
import { QRCodeSVG } from 'qrcode.react';
import './CampaignSession.css';

// Estados da sessão
const SESSION_STATES = {
  IDLE: 'idle',
  CREATING: 'creating',
  ACTIVE: 'active',
  ERROR: 'error',
};

function MestreView() {
  const navigate = useNavigate();
  
  // Estado da sessão
  const [sessionState, setSessionState] = useState(SESSION_STATES.IDLE);
  const [session, setSession] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Estado dos jogadores
  const [players, setPlayers] = useState([]);
  
  // Estado de rolagens recebidas
  const [rolls, setRolls] = useState([]);
  
  // Input manual / scanner
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputValue, setManualInputValue] = useState('');
  
  // Toast
  const [toast, setToast] = useState(null);
  // Fallback de cópia manual (quando Clipboard API não estiver disponível)
  const [manualCopyText, setManualCopyText] = useState(null);
  
  // Configurações
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true });
  
  // Ref para sessão (evita closure stale)
  const sessionRef = useRef(null);

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
   * Callbacks para eventos da sessão WebRTC
   */
  const handlePlayerConnected = useCallback((playerId, playerData) => {
    console.log('[MestreView] Jogador conectado:', playerId, playerData);
    
    setPlayers(prev => {
      const existing = prev.find(p => p.playerId === playerId);
      if (existing) {
        return prev.map(p => 
          p.playerId === playerId 
            ? { ...p, ...playerData, status: 'connected' }
            : p
        );
      }
      return [...prev, { playerId, ...playerData, status: 'connected' }];
    });
    
    playFeedback('success');
    setToast({ 
      message: `${playerData?.info?.characterName || 'Jogador'} conectado!`, 
      type: 'success' 
    });
  }, [playFeedback]);

  const handlePlayerDisconnected = useCallback((playerId, playerInfo) => {
    console.log('[MestreView] Jogador desconectado:', playerId);
    
    setPlayers(prev => 
      prev.map(p => 
        p.playerId === playerId 
          ? { ...p, status: 'disconnected' }
          : p
      )
    );
    
    playFeedback('error');
    setToast({ 
      message: `${playerInfo?.characterName || 'Jogador'} desconectou`, 
      type: 'warning' 
    });
  }, [playFeedback]);

  const handleMessage = useCallback((playerId, message) => {
    console.log('[MestreView] Mensagem recebida:', playerId, message.type);
    
    switch (message.type) {
      case 'characterUpdate':
        // Atualiza informações do jogador
        setPlayers(prev => 
          prev.map(p => 
            p.playerId === playerId 
              ? { ...p, info: { ...p.info, ...message.payload } }
              : p
          )
        );
        break;
        
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

  /**
   * Inicia uma nova sessão como Mestre
   */
  const startSession = async () => {
    if (!isWebRTCSupported()) {
      setErrorMessage('WebRTC não suportado neste navegador');
      setSessionState(SESSION_STATES.ERROR);
      return;
    }

    setSessionState(SESSION_STATES.CREATING);
    setErrorMessage(null);

    try {
      const newSession = await createHostSession({
        onPlayerConnected: handlePlayerConnected,
        onPlayerDisconnected: handlePlayerDisconnected,
        onMessage: handleMessage,
        onError: handleError,
      });

      sessionRef.current = newSession;
      setSession(newSession);
      setQrData(newSession.offerQR);
      setSessionState(SESSION_STATES.ACTIVE);
      setPlayers([]);
      setRolls([]);
      
      playFeedback('success');
      setToast({ message: 'Sessão iniciada! Aguardando jogadores...', type: 'success' });
      
    } catch (error) {
      console.error('[MestreView] Erro ao criar sessão:', error);
      setErrorMessage(error.message || 'Erro ao criar sessão');
      setSessionState(SESSION_STATES.ERROR);
    }
  };

  /**
   * Processa resposta (answer) de um jogador - chamado pelo scanner
   */
  const processAnswer = async (answerQR) => {
    if (!sessionRef.current) {
      setToast({ message: 'Sessão não está ativa', type: 'error' });
      return;
    }

    // Fecha o scanner e limpa input manual
    setShowScanner(false);
    setShowManualInput(false);
    setManualInputValue('');

    try {
      const answerData = deserializeFromQR(answerQR);
      
      if (!answerData || !answerData.answer || !answerData.playerId) {
        throw new Error('QR Code inválido');
      }

      await sessionRef.current.addAnswer(answerData.playerId, answerData.answer);
      
      // Atualiza jogador como pendente até conexão completa
      setPlayers(prev => {
        const existing = prev.find(p => p.playerId === answerData.playerId);
        if (!existing) {
          return [...prev, { playerId: answerData.playerId, status: 'pending', info: null }];
        }
        return prev;
      });
      
      setToast({ message: 'Conectando com jogador...', type: 'info' });
      
    } catch (error) {
      console.error('[MestreView] Erro ao processar answer:', error);
      setToast({ message: error.message || 'Erro ao processar resposta', type: 'error' });
    }
  };

  /**
   * Reinicia a sessão (fecha tudo e cria nova)
   */
  const restartSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setSession(null);
    setQrData(null);
    setPlayers([]);
    setRolls([]);
    setSessionState(SESSION_STATES.IDLE);
  };

  /**
   * Fecha sessão e volta
   */
  const closeSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    navigate(-1);
  };

  // Limpa sessão ao desmontar
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
    };
  }, []);

  /**
   * Copia QR data para clipboard
   */
  /**
   * Tenta copiar o QR para a área de transferência.
   * Se a Clipboard API não estiver disponível, tenta fallback com execCommand
   * e, por fim, mostra um modal com o texto para cópia manual.
   */
  const copyQRToClipboard = async () => {
    if (!qrData) return;
    const text = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);

    // Tentar Clipboard API (moderna)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setToast({ message: 'Código copiado!', type: 'success' });
        return;
      } catch (err) {
        console.warn('[MestreView] clipboard.writeText falhou:', err);
        // continua para fallback
      }
    }

    // Fallback usando textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        setToast({ message: 'Código copiado (fallback)!', type: 'success' });
        return;
      }
    } catch (err) {
      console.warn('[MestreView] fallback copy falhou:', err);
    }

    // Último recurso: mostrar código em modal para cópia manual
    setManualCopyText(text);
    setToast({ message: 'Não foi possível copiar automaticamente. Código exibido para cópia manual.', type: 'warning' });
  };

  /**
   * Renderiza lista de jogadores conectados
   */
  const renderPlayersList = () => {
    if (players.length === 0) {
      return (
        <div className="empty-players">
          <div className="empty-icon">👥</div>
          <p>Nenhum jogador conectado</p>
          <p className="text-muted">Peça para os jogadores escanearem o QR Code</p>
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
              </span>
              {player.info?.currentHp !== undefined && (
                <div className="player-stats">
                  <span className="stat-hp">❤️ {player.info.currentHp}/{player.info.maxHp}</span>
                  <span className="stat-mp">💧 {player.info.currentMp}/{player.info.maxMp}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
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
                <p>1. Inicie a sessão para gerar um QR Code</p>
                <p>2. Os jogadores escaneiam seu QR Code</p>
                <p>3. Escaneie o QR de resposta de cada jogador</p>
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
            {/* QR Code para jogadores */}
            <section className="qr-section">
              <h3>📱 QR Code da Sessão</h3>
              <p className="qr-subtitle">
                Jogadores devem escanear este código para entrar
              </p>
              <div className="qr-container">
                {qrData ? (
                  <QRCodeSVG 
                    value={qrData} 
                    size={220}
                    level="L"
                    includeMargin={false}
                  />
                ) : (
                  <div className="qr-placeholder">Gerando...</div>
                )}
              </div>
              <div className="qr-actions">
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={copyQRToClipboard}
                >
                  📋 Copiar código
                </Button>
              </div>
            </section>

            {/* Controles do Mestre */}
            <section className="controls-section">
              <h4>🎮 Adicionar Jogador</h4>
              <div className="action-buttons">
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <Button 
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setShowManualInput(false);
                      setShowScanner(true);
                    }}
                  >
                    📷 Escanear Resposta
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setShowScanner(false);
                      setShowManualInput(true);
                    }}
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

            {/* Entrada manual (se ativada) */}
            {showManualInput && (
              <div className="manual-input-section">
                <textarea
                  autoFocus
                  placeholder="Cole aqui o código de resposta do jogador..."
                  value={manualInputValue}
                  onChange={(e) => setManualInputValue(e.target.value)}
                  rows={5}
                />
                <div className="input-actions">
                  <Button 
                    variant="primary"
                    onClick={() => {
                      if (manualInputValue && manualInputValue.trim()) {
                        processAnswer(manualInputValue.trim());
                      }
                    }}
                    disabled={!manualInputValue.trim()}
                  >
                    Conectar
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setShowManualInput(false);
                      setManualInputValue('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de jogadores */}
            <section className="players-section">
              <h4>
                <span>👥 Jogadores</span>
                <span className="player-count">{players.filter(p => p.status === 'connected').length}</span>
              </h4>
              {renderPlayersList()}
            </section>

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

      {/* Scanner de QR Code */}
      {showScanner && (
        <QRScanner
          onScan={processAnswer}
          onClose={() => setShowScanner(false)}
          onError={(err) => console.warn('[MestreView] Erro no scanner:', err)}
        />
      )}

      {/* Toast de feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal com o código caso copy automático falhe */}
      {manualCopyText && (
        <Modal
          isOpen={!!manualCopyText}
          title="Código da Sessão"
          onClose={() => setManualCopyText(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              readOnly
              value={manualCopyText}
              style={{ width: '100%', minHeight: 120, fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={() => {
                  // tenta copiar de novo localmente
                  try {
                    const ta = document.createElement('textarea');
                    ta.value = manualCopyText;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'absolute';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    const ok = document.execCommand('copy');
                    document.body.removeChild(ta);
                    if (ok) {
                      setToast({ message: 'Código copiado!', type: 'success' });
                      setManualCopyText(null);
                      return;
                    }
                  } catch (err) {
                    console.warn('[MestreView] copy manual falhou:', err);
                  }

                  setToast({ message: 'Selecione e copie manualmente o texto acima.', type: 'info' });
                }}
              >
                📋 Copiar
              </Button>

              <Button variant="secondary" onClick={() => setManualCopyText(null)}>
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
