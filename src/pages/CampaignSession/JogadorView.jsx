/**
 * JogadorView - Tela do Jogador para conectar na sessão do Mestre
 * 
 * Fluxo (v2 - Convites Individuais):
 * 1. Jogador seleciona personagem que usará na sessão
 * 2. Jogador recebe código do Mestre (via WhatsApp, etc.)
 * 3. Jogador cola o código do convite
 * 4. Sistema gera código de resposta
 * 5. Jogador copia e envia resposta para o Mestre
 * 6. Conexão estabelecida, jogador envia dados do personagem
 * 7. Jogador pode enviar updates e rolagens em tempo real
 * 
 * Arquitetura:
 * - Cada jogador tem sua própria conexão RTCPeerConnection
 * - Sem QR Code (SDP muito grande) - usar apenas cópia/cola de texto
 * - Conexão gerenciada pelo ConnectionProvider
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, Modal } from '../../components';
import { 
  useConnection,
  SESSION_STATUS,
  isWebRTCSupported,
  isAndroidPlatform 
} from '../../services';
import { loadCharacters, loadSettings } from '../../services';
import { calculateMaxHp, calculateMaxMp } from '../../models';
import './CampaignSession.css';

// Estados da conexão (mapeia para SESSION_STATUS do Provider)
const CONNECTION_STATES = {
  SELECTING: 'selecting', // Estado local inicial antes de conectar
  GENERATING: SESSION_STATUS.CREATING,
  WAITING: 'waiting',     // Após gerar answer, aguardando Mestre
  CONNECTED: SESSION_STATUS.CONNECTED,
  DISCONNECTED: SESSION_STATUS.DISCONNECTED,
  ERROR: SESSION_STATUS.ERROR,
};

function JogadorView() {
  const navigate = useNavigate();
  
  // === Conexão via Context (Provider) ===
  const {
    status,
    answerQR,
    errorMessage: contextErrorMessage,
    isPlayer,
    startPlayerSession,
    endSession,
    sendCharacterUpdate,
    // sendDiceRoll disponível via contexto para uso futuro
    updateCallbacks,
  } = useConnection();
  
  // === Estado local de UI ===
  // Estado da conexão (combinação de estado local + contexto)
  const [localState, setLocalState] = useState(CONNECTION_STATES.SELECTING);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Personagens e seleção
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  
  // Entrada do código do Mestre
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState('');
  
  // Toast
  const [toast, setToast] = useState(null);
  
  // Configurações
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true });

  // Deriva o estado de conexão combinando estado local com contexto
  const connectionState = (() => {
    // Se já está conectado no contexto, usar esse estado
    if (status === SESSION_STATUS.CONNECTED) return CONNECTION_STATES.CONNECTED;
    if (status === SESSION_STATUS.DISCONNECTED && isPlayer) return CONNECTION_STATES.DISCONNECTED;
    if (status === SESSION_STATUS.ERROR) return CONNECTION_STATES.ERROR;
    // Se está criando no contexto e answerQR já existe, é WAITING
    if (status === SESSION_STATUS.CREATING && answerQR) return CONNECTION_STATES.WAITING;
    if (status === SESSION_STATUS.CREATING) return CONNECTION_STATES.GENERATING;
    // Caso contrário, usa estado local
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
      onError: handleError,
      onIceRestartRequired: handleIceRestartRequired,
    });
  }, [updateCallbacks, handleConnected, handleDisconnected, handleMessage, handleError, handleIceRestartRequired]);

  /**
   * Processa o código do Mestre e gera answer (via Provider)
   */
  const processOfferQR = async (offerQR) => {
    if (!selectedCharacter) {
      setToast({ message: 'Selecione um personagem primeiro', type: 'error' });
      return;
    }

    if (!isWebRTCSupported()) {
      setErrorMessage('WebRTC não suportado neste navegador');
      setLocalState(CONNECTION_STATES.ERROR);
      return;
    }

    // Fecha input e limpa valor
    setShowCodeInput(false);
    setCodeInputValue('');

    setLocalState(CONNECTION_STATES.GENERATING);
    setErrorMessage(null);

    try {
      const characterInfo = getCharacterSummary(selectedCharacter);
      
      await startPlayerSession(offerQR, characterInfo, {
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
        onMessage: handleMessage,
        onError: handleError,
        onIceRestartRequired: handleIceRestartRequired,
      });

      // O estado será atualizado pelo contexto automaticamente
      playFeedback('success');
      setToast({ message: 'Código gerado! Envie para o Mestre.', type: 'info' });
      
    } catch (error) {
      console.error('[JogadorView] Erro ao processar offer:', error);
      setErrorMessage(error.message || 'Erro ao conectar');
      setLocalState(CONNECTION_STATES.ERROR);
    }
  };

  /**
   * Envia atualização de status do personagem (via Provider)
   */
  const sendStatusUpdate = () => {
    if (!selectedCharacter) return;
    
    const summary = getCharacterSummary(selectedCharacter);
    sendCharacterUpdate(summary);
    
    setToast({ message: 'Status enviado!', type: 'success' });
  };

  /**
   * Copia código de resposta para clipboard
   */
  // Fallback para cópia do answer
  const [showAnswerCode, setShowAnswerCode] = useState(false);

  const copyAnswerToClipboard = async () => {
    if (!answerQR) return;
    const text = typeof answerQR === 'string' ? answerQR : JSON.stringify(answerQR);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setToast({ message: 'Código copiado! Envie para o Mestre.', type: 'success' });
        return;
      } catch (err) {
        console.warn('[JogadorView] clipboard.writeText falhou:', err);
      }
    }

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
      console.warn('[JogadorView] fallback copy falhou:', err);
    }

    // Se não conseguiu copiar, mostra modal com código
    setShowAnswerCode(true);
    setToast({ message: 'Código exibido para cópia manual.', type: 'info' });
  };

  /**
   * Fecha conexão e volta (via Provider)
   */
  const closeConnection = () => {
    endSession();
    navigate(-1);
  };

  /**
   * Reinicia o fluxo de conexão (via Provider)
   */
  const restartConnection = () => {
    endSession();
    setLocalState(CONNECTION_STATES.SELECTING);
    setErrorMessage(null);
    setShowCodeInput(false);
    setCodeInputValue('');
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
        <div className="action-buttons">
          <Button 
            variant="secondary"
            onClick={sendStatusUpdate}
          >
            📤 Enviar Status
          </Button>
        </div>
      </section>
    );
  };

  return (
    <div className="page campaign-session-page">
      <Header 
        title="Entrar na Sessão" 
        showBack
        rightAction={
          connectionState === CONNECTION_STATES.CONNECTED && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={restartConnection}
              title="Reconectar"
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

        {/* Estado: Selecionando personagem */}
        {connectionState === CONNECTION_STATES.SELECTING && (
          <>
            <section className="character-selection">
              <h4>👤 Selecione seu Personagem</h4>
              {renderCharacterSelector()}
            </section>

            {selectedCharacter && (
              <>
                <section className="qr-section">
                  <h3>📱 Conectar ao Mestre</h3>
                  <p className="qr-subtitle">
                    Cole o código de convite que o Mestre enviou
                  </p>
                  
                  <div className="action-buttons">
                    <Button 
                      variant="primary"
                      size="large"
                      fullWidth
                      onClick={() => setShowCodeInput(true)}
                    >
                      📝 Inserir Código do Mestre
                    </Button>
                  </div>

                </section>

                <section className="info-section">
                  <div className="info-card">
                    <h4>💡 Como conectar</h4>
                    <p>1. Peça para o Mestre gerar um convite</p>
                    <p>2. O Mestre envia o código (WhatsApp, etc.)</p>
                    <p>3. Cole o código aqui e gere sua resposta</p>
                    <p>4. Envie sua resposta para o Mestre</p>
                    <p>5. Pronto! Você está na sessão</p>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* Estado: Gerando answer */}
        {connectionState === CONNECTION_STATES.GENERATING && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Gerando resposta...</p>
          </div>
        )}

        {/* Estado: Aguardando Mestre processar resposta */}
        {connectionState === CONNECTION_STATES.WAITING && (
          <>
            <section className="qr-section">
              <h3>📤 Envie sua Resposta</h3>
              <p className="qr-subtitle">
                Copie o código abaixo e envie para o Mestre
              </p>
              
              <div className="code-display">
                <textarea
                  readOnly
                  value={answerQR || 'Gerando...'}
                  style={{ 
                    width: '100%', 
                    minHeight: 100, 
                    fontFamily: 'monospace', 
                    fontSize: '0.7rem',
                    wordBreak: 'break-all'
                  }}
                  onClick={(e) => e.target.select()}
                />
              </div>
              
              <div className="qr-actions" style={{ marginTop: '1rem' }}>
                <Button 
                  variant="primary"
                  fullWidth
                  onClick={copyAnswerToClipboard}
                >
                  📋 Copiar Código de Resposta
                </Button>
              </div>
            </section>

            <div className="connection-status connecting">
              <span className="status-dot"></span>
              <span>Aguardando Mestre processar resposta...</span>
            </div>

            <div className="action-buttons">
              <Button 
                variant="secondary"
                onClick={restartConnection}
              >
                ← Voltar e Tentar Novamente
              </Button>
            </div>
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
                  variant="primary"
                  onClick={restartConnection}
                >
                  🔄 Reconectar
                </Button>
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
                onClick={restartConnection}
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

      {/* Modal para inserir código do Mestre */}
      {showCodeInput && (
        <Modal
          isOpen={showCodeInput}
          title="📝 Código do Mestre"
          onClose={() => {
            setShowCodeInput(false);
            setCodeInputValue('');
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Cole o código de convite que o Mestre enviou:
            </p>
            <textarea
              autoFocus
              placeholder="Cole aqui o código do convite..."
              value={codeInputValue}
              onChange={(e) => setCodeInputValue(e.target.value)}
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
                onClick={() => {
                  if (codeInputValue.trim()) {
                    processOfferQR(codeInputValue.trim());
                  }
                }}
                disabled={!codeInputValue.trim()}
              >
                Conectar
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowCodeInput(false);
                  setCodeInputValue('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal com código de resposta para cópia */}
      {showAnswerCode && answerQR && (
        <Modal
          isOpen={showAnswerCode}
          title="📤 Seu Código de Resposta"
          onClose={() => setShowAnswerCode(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Selecione e copie o código abaixo, depois envie para o Mestre:
            </p>
            <textarea
              readOnly
              value={answerQR}
              style={{ 
                width: '100%', 
                minHeight: 120, 
                fontFamily: 'monospace',
                fontSize: '0.7rem'
              }}
              onClick={(e) => e.target.select()}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={copyAnswerToClipboard}
              >
                📋 Copiar
              </Button>
              <Button variant="secondary" onClick={() => setShowAnswerCode(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default JogadorView;
