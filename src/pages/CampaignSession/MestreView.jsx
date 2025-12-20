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

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast, Modal } from '../../components';
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
  const { roomId } = useRoom();

  // === Conexão via Context (Provider) ===
  const {
    status,
    players: contextPlayers,
    errorMessage: contextErrorMessage,
    isActive,
    startHostSession,
    endSession,
    updateCallbacks,
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

  // === Personagem do Mestre ===
  const [hostCharacter, setHostCharacter] = useState(null);

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
        // Adiciona rolagem ao histórico
        const rollEntry = {
          id: Date.now() + Math.random(), // Garante unicidade mesmo em rolagens simultâneas
          playerId,
          playerName: message.payload.playerName || 'Jogador',
          playerIcon: message.payload.playerIcon || '🎲',
          ...message.payload,
          timestamp: message.ts || Date.now(),
        };
        setRolls(prev => [rollEntry, ...prev].slice(0, 50));
        playFeedback();
        break;

      case 'hello':
        console.log('[MestreView] Handshake recebido:', message.characterInfo?.characterName);
        // O Provider já atualiza a lista de jogadores, aqui podemos apenas dar um feedback visual se quiser
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
    });
  }, [updateCallbacks, handlePlayerConnected, handlePlayerDisconnected, handleMessage, handleError]);

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
          console.log(player);
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
            </div>
          );
        })}
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
    </div>
  );
}

export default MestreView;