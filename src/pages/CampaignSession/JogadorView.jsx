/**
 * JogadorView - Tela do Jogador para conectar na sessão do Mestre
 * 
 * Fluxo:
 * 1. Jogador seleciona personagem que usará na sessão
 * 2. Jogador escaneia ou insere manualmente o QR do Mestre
 * 3. Sistema processa offer e gera answer
 * 4. Jogador exibe QR da answer para o Mestre escanear
 * 5. Conexão estabelecida, jogador envia dados do personagem
 * 6. Jogador pode enviar updates e rolagens em tempo real
 * 
 * Estados:
 * - selecting: selecionando personagem
 * - scanning: escaneando/inserindo QR do mestre
 * - generating: gerando answer
 * - waiting: aguardando mestre escanear answer
 * - connected: conectado à sessão
 * - disconnected: desconectado
 * - error: erro na conexão
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, QRScanner, Modal } from '../../components';
import { 
  createPlayerSession,
  isWebRTCSupported,
  isAndroidPlatform 
} from '../../services/webrtcSession';
import { loadCharacters, loadSettings } from '../../services';
import { calculateMaxHp, calculateMaxMp } from '../../models';
import { QRCodeSVG } from 'qrcode.react';
import './CampaignSession.css';

// Estados da conexão
const CONNECTION_STATES = {
  SELECTING: 'selecting',
  SCANNING: 'scanning',
  GENERATING: 'generating',
  WAITING: 'waiting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

function JogadorView() {
  const navigate = useNavigate();
  
  // Estado da conexão
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.SELECTING);
  const [playerSession, setPlayerSession] = useState(null);
  const [answerQR, setAnswerQR] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Personagens e seleção
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  
  // Scanner de QR
  const [showScanner, setShowScanner] = useState(false);
  // Entrada manual do QR do Mestre (fallback)
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputValue, setManualInputValue] = useState('');
  
  // Toast
  const [toast, setToast] = useState(null);
  
  // Configurações
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true });
  
  // Ref para sessão
  const sessionRef = useRef(null);

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
   * Callbacks para eventos da sessão WebRTC
   */
  const handleConnected = useCallback(() => {
    console.log('[JogadorView] Conectado ao Mestre!');
    setConnectionState(CONNECTION_STATES.CONNECTED);
    playFeedback('success');
    setToast({ message: 'Conectado ao Mestre!', type: 'success' });
  }, [playFeedback]);

  const handleDisconnected = useCallback(() => {
    console.log('[JogadorView] Desconectado do Mestre');
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    playFeedback('error');
    setToast({ message: 'Conexão perdida com o Mestre', type: 'warning' });
  }, [playFeedback]);

  const handleMessage = useCallback((message) => {
    console.log('[JogadorView] Mensagem do Mestre:', message.type);
    // Processa mensagens do Mestre se necessário
  }, []);

  const handleError = useCallback((error) => {
    console.error('[JogadorView] Erro:', error);
    setToast({ message: error.error || 'Erro na conexão', type: 'error' });
  }, []);

  /**
   * Processa o QR Code do Mestre e gera answer - chamado pelo scanner
   */
  const processOfferQR = async (offerQR) => {
    // Fecha o scanner e limpa input manual
    setShowScanner(false);
    setShowManualInput(false);
    setManualInputValue('');
    
    if (!selectedCharacter) {
      setToast({ message: 'Selecione um personagem primeiro', type: 'error' });
      return;
    }

    if (!isWebRTCSupported()) {
      setErrorMessage('WebRTC não suportado neste navegador');
      setConnectionState(CONNECTION_STATES.ERROR);
      return;
    }

    setConnectionState(CONNECTION_STATES.GENERATING);
    setErrorMessage(null);

    try {
      const characterInfo = getCharacterSummary(selectedCharacter);
      
      const session = await createPlayerSession(offerQR, characterInfo, {
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
        onMessage: handleMessage,
        onError: handleError,
      });

      sessionRef.current = session;
      setPlayerSession(session);
      setAnswerQR(session.answerQR);
      setConnectionState(CONNECTION_STATES.WAITING);
      
      playFeedback('success');
      setToast({ message: 'QR gerado! Mostre para o Mestre escanear.', type: 'info' });
      
    } catch (error) {
      console.error('[JogadorView] Erro ao processar offer:', error);
      setErrorMessage(error.message || 'Erro ao conectar');
      setConnectionState(CONNECTION_STATES.ERROR);
    }
  };

  /**
   * Envia atualização de status do personagem
   */
  const sendStatusUpdate = () => {
    if (!sessionRef.current || !selectedCharacter) return;
    
    const summary = getCharacterSummary(selectedCharacter);
    sessionRef.current.sendCharacterUpdate(summary);
    
    setToast({ message: 'Status enviado!', type: 'success' });
  };

  /**
   * Envia resultado de rolagem (pode ser chamado externamente)
   */
  const sendRoll = (rollData) => {
    if (!sessionRef.current) return false;
    
    return sessionRef.current.sendDiceRoll({
      ...rollData,
      playerName: selectedCharacter?.name || 'Jogador',
      playerIcon: selectedCharacter?.icon || '🎲',
    });
  };

  /**
   * Copia answer QR para clipboard
   */
  // Fallback para cópia do answer QR
  const [manualAnswerCopyText, setManualAnswerCopyText] = useState(null);

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

    setManualAnswerCopyText(text);
    setToast({ message: 'Não foi possível copiar automaticamente. Código exibido para cópia manual.', type: 'warning' });
  };

  /**
   * Fecha conexão e volta
   */
  const closeConnection = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    navigate(-1);
  };

  /**
   * Reinicia o fluxo de conexão
   */
  const restartConnection = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setPlayerSession(null);
    setAnswerQR(null);
    setConnectionState(CONNECTION_STATES.SELECTING);
    setErrorMessage(null);
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
                    Escaneie o QR Code do Mestre para entrar na sessão
                  </p>
                  
                  <div className="action-buttons">
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <Button 
                        variant="primary"
                        size="large"
                        fullWidth
                        onClick={() => {
                          setShowManualInput(false);
                          setShowScanner(true);
                        }}
                      >
                        📷 Escanear QR do Mestre
                      </Button>
                      <Button
                        variant="secondary"
                        size="large"
                        onClick={() => {
                          setShowScanner(false);
                          setShowManualInput(true);
                        }}
                      >
                        📝 Inserir Código
                      </Button>
                    </div>

                    {/* Entrada manual (se ativada) */}
                    {showManualInput && (
                        <div className="manual-input-section">
                        <textarea
                            autoFocus
                            placeholder="Cole aqui o código do QR do Mestre..."
                            value={manualInputValue}
                            onChange={(e) => setManualInputValue(e.target.value)}
                            rows={5}
                        />
                        <div className="input-actions">
                            <Button 
                            variant="primary"
                            onClick={() => {
                                if (manualInputValue && manualInputValue.trim()) {
                                processOfferQR(manualInputValue.trim());
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
                  </div>

                </section>

                <section className="info-section">
                  <div className="info-card">
                    <h4>💡 Como conectar</h4>
                    <p>1. O Mestre inicia a sessão e mostra o QR</p>
                    <p>2. Escaneie o QR do Mestre</p>
                    <p>3. Mostre seu QR de resposta para o Mestre</p>
                    <p>4. Pronto! Você está na sessão</p>
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

        {/* Estado: Aguardando Mestre escanear */}
        {connectionState === CONNECTION_STATES.WAITING && (
          <>
            <section className="qr-section">
              <h3>📱 Seu QR de Resposta</h3>
              <p className="qr-subtitle">
                Mostre este QR Code para o Mestre escanear ou copie o código
              </p>
              <div className="qr-container">
                {answerQR ? (
                  <QRCodeSVG 
                    value={answerQR} 
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
                  variant="primary"
                  onClick={copyAnswerToClipboard}
                >
                  📋 Copiar Código
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
            <p className="qr-subtitle">{errorMessage}</p>
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

      {/* Scanner de QR Code */}
      {showScanner && (
        <QRScanner
          onScan={processOfferQR}
          onClose={() => setShowScanner(false)}
          onError={(err) => console.warn('[JogadorView] Erro no scanner:', err)}
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
      {manualAnswerCopyText && (
        <Modal
          isOpen={!!manualAnswerCopyText}
          title="Seu Código de Resposta"
          onClose={() => setManualAnswerCopyText(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              readOnly
              value={manualAnswerCopyText}
              style={{ width: '100%', minHeight: 120, fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={() => {
                  try {
                    const ta = document.createElement('textarea');
                    ta.value = manualAnswerCopyText;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'absolute';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    const ok = document.execCommand('copy');
                    document.body.removeChild(ta);
                    if (ok) {
                      setToast({ message: 'Código copiado!', type: 'success' });
                      setManualAnswerCopyText(null);
                      return;
                    }
                  } catch (err) {
                    console.warn('[JogadorView] copy manual falhou:', err);
                  }

                  setToast({ message: 'Selecione e copie manualmente o texto acima.', type: 'info' });
                }}
              >
                📋 Copiar
              </Button>

              <Button variant="secondary" onClick={() => setManualAnswerCopyText(null)}>
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
