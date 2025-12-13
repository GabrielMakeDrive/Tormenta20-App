/*
 * CharacterDetail apresenta e permite ajustes rápidos de uma ficha existente,
 * consumindo dados persistidos e recalculando valores derivados (atributos,
 * perícias, recursos) em tempo real na UI.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header, Button, Toast, MoneyEditor, Modal, LevelUpModal } from '../../components';
import { getCharacterById, saveCharacter } from '../../services';
import { SKILLS, calculateMaxHp, calculateMaxMp, getCharacterClassDefinition, getRaceDefinition, getCharacterDisplayXp, getCharacterLevelFromXp } from '../../models';
import './CharacterDetail.css';

const formatAttributeValue = (value = 0) => (value > 0 ? `+${value}` : `${value}`);

const getRaceAdjustment = (race, attrKey) => {
  if (!race) {
    return 0;
  }
  const bonus = typeof race.bonus?.[attrKey] === 'number' ? race.bonus[attrKey] : 0;
  const penalty = typeof race.penalty?.[attrKey] === 'number' ? race.penalty[attrKey] : 0;
  return bonus + penalty;
};

const ATTRIBUTE_LABELS = {
  forca: 'FOR',
  destreza: 'DES',
  constituicao: 'CON',
  inteligencia: 'INT',
  sabedoria: 'SAB',
  carisma: 'CAR',
};

function CharacterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [character, setCharacter] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [toast, setToast] = useState(null);
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [xpAmount, setXpAmount] = useState('0');
  const xpInputRef = useRef(null);

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
    }
  }, [location.state]);

  useEffect(() => {
    if (xpModalOpen) {
      setXpAmount('0');
    }
  }, [xpModalOpen]);

  useEffect(() => {
    const loaded = getCharacterById(id);
    if (loaded) {
      setCharacter(loaded);
      console.log('CharacterDetail data', loaded);
    } else {
      navigate('/characters');
    }
  }, [id, navigate]);

  const handleHpChange = (delta) => {
    if (!character) return;
    const maxHp = calculateMaxHp(character);
    const current = character.hp?.current ?? 0;
    const newHp = Math.max(0, Math.min(maxHp, current + delta));
    const updated = { ...character, hp: { ...character.hp, current: newHp, max: maxHp } };
    setCharacter(updated);
    saveCharacter(updated);
  };

  const handleMpChange = (delta) => {
    if (!character) return;
    const maxMp = calculateMaxMp(character);
    const current = character.mp?.current ?? 0;
    const newMp = Math.max(0, Math.min(maxMp, current + delta));
    const updated = { ...character, mp: { ...character.mp, current: newMp, max: maxMp } };
    setCharacter(updated);
    saveCharacter(updated);
  };

  const handleAddXp = (amount) => {
    if (!character) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setToast({ message: 'Informe uma quantidade válida de XP', type: 'error' });
      return;
    }
    const added = Math.max(0, Math.floor(parsed));
    const current = Number(character.experience || 0);
    const newXp = Math.max(0, current + added);
    const newLevel = getCharacterLevelFromXp(newXp);
    const leveledUp = newLevel > character.level;
    const updated = { ...character, experience: newXp, level: newLevel };
    setCharacter(updated);
    saveCharacter(updated);
    if (leveledUp) {
      setLevelUpModalOpen(true);
    }
    setToast({ message: `Ganhou ${added} XP`, type: 'success' });
    setXpModalOpen(false);
  };

  const changeXpInputBy = (delta) => {
    setXpAmount((prev) => {
      const current = Number(prev) || 0;
      let next = Math.floor(current + delta);
      if (next < 1) next = 1;
      return String(next);
    });
  };

  const addQuickToInput = (value) => {
    setXpAmount((prev) => {
      const current = Number(prev) || 0;
      let next = Math.floor(current + value);
      if (next < 1) next = 1;
      return String(next);
    });
  };

  if (!character) {
    return <div className="page">Carregando...</div>;
  }

  const classDefinition = getCharacterClassDefinition(character);
  const raceDefinition = getRaceDefinition(character);
  const maxHp = calculateMaxHp(character);
  const maxMp = calculateMaxMp(character);
  const currentHp = Math.max(0, Math.min(character.hp?.current ?? 0, maxHp));
  const currentMp = Math.max(0, Math.min(character.mp?.current ?? 0, maxMp));
  const hpPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  const mpPercentage = maxMp > 0 ? (currentMp / maxMp) * 100 : 0;

  const displayXp = getCharacterDisplayXp(character);

  const tabs = [
    { id: 'stats', label: 'Ações', icon: '📊' },
    { id: 'skills', label: 'Perícias', icon: '🎯' },
    { id: 'inventory', label: 'Inventário', icon: '🎒' },
    { id: 'notes', label: 'Notas', icon: '📝' },
  ];

  return (
    <div className="page character-detail-page">
      <Header 
        title={character.name} 
        showBack 
        rightAction={
          <button className="header-btn" onClick={() => navigate(`/characters/${id}/edit`)}>
            ✏️
          </button>
        }
      />
      
      <main className="page-content">
        {/* Header do Personagem */}
        <section className="character-header">
          <div className="character-avatar">{character.icon}</div>
          <div className="character-meta">
            <h2>{character.name}</h2>
            <p>
              {raceDefinition?.name || 'Raça'} • {classDefinition?.name || 'Classe'} • Nível {character.level} ({displayXp} XP)
            </p>
          </div>
        </section>

        {/* HP e MP */}
        <section className="vitals-section">
          <div className="vital-card hp-card">
            <div className="vital-header">
              <span className="vital-label">❤️ PV</span>
              <span className="vital-value">{currentHp}/{maxHp}</span>
            </div>
            <div className="vital-bar">
              <div 
                className="vital-fill hp-fill" 
                style={{ width: `${hpPercentage}%` }}
              />
            </div>
            <div className="vital-controls">
              <button onClick={() => handleHpChange(-1)}>−</button>
              <button onClick={() => handleHpChange(1)}>+</button>
            </div>
          </div>

          <div className="vital-card mp-card">
            <div className="vital-header">
              <span className="vital-label">💧 PM</span>
              <span className="vital-value">{currentMp}/{maxMp}</span>
            </div>
            <div className="vital-bar">
              <div 
                className="vital-fill mp-fill" 
                style={{ width: `${mpPercentage}%` }}
              />
            </div>
            <div className="vital-controls">
              <button onClick={() => handleMpChange(-1)}>−</button>
              <button onClick={() => handleMpChange(1)}>+</button>
            </div>
          </div>
        </section>

        {/* Atributos */}
        <section className="attributes-section">
          <div className="attributes-row">
            {Object.keys(ATTRIBUTE_LABELS).map((attr) => {
              const baseValue = character.attributes?.[attr] ?? 0;
              const adjustedValue = baseValue + getRaceAdjustment(raceDefinition, attr);
              return (
                <div key={attr} className="attribute-box">
                  <span className="attr-label">{ATTRIBUTE_LABELS[attr]}</span>
                  {/* Mostrar somente o valor total (com ajuste racial) — não exibir o valor base separado */}
                  <span className="attr-value">{formatAttributeValue(adjustedValue)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Combat Stats */}
        <section className="combat-stats">
          <div className="stat-box">
            <span className="stat-label">Defesa</span>
            <span className="stat-value">{character.defense}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Movimento</span>
            <span className="stat-value">{character.movement}m</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">T$</span>
            <MoneyEditor 
              value={character.money} 
              label=""
              className="stat-value"
              onSave={(newMoney) => {
                const updated = { ...character, money: newMoney };
                setCharacter(updated);
                saveCharacter(updated);
              }}
            />
          </div>
        </section>

        {/* Tabs */}
        <div className="tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'stats' && (
            <div className="stats-tab">
              <p className="tab-info">Use os botões +/- para ajustar PV e PM durante o combate.</p>
              <div className="xp-row">
                <div className="xp-value">XP: {displayXp}</div>
                <div className="xp-actions">
                  <Button variant="secondary" onClick={() => setXpModalOpen(true)}>XP ➕</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="skills-tab">
              <div className="skills-list">
                {SKILLS.map((skill) => {
                  const baseAttr = character.attributes?.[skill.attr] ?? 0;
                  const adjustedAttr = baseAttr + getRaceAdjustment(raceDefinition, skill.attr);
                  const trained = character.skills?.includes(skill.id);
                  const halfLevel = Math.floor(character.level / 2);
                  const trainingBonus = trained ? (character.level >= 15 ? 6 : character.level >= 7 ? 4 : 2) : 0;
                  const bonus = halfLevel + adjustedAttr + trainingBonus;
                  
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className={`skill-item ${trained ? 'trained' : ''}`}
                      onClick={() => navigate('/dice', { state: { characterId: character.id, skillId: skill.id } })}
                    >
                      <span className="skill-name">{skill.name}</span>
                      <span className="skill-attr">({ATTRIBUTE_LABELS[skill.attr]})</span>
                      <span className="skill-bonus">
                        {bonus >= 0 ? '+' : ''}{bonus}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="inventory-tab">
              <Button 
                variant="secondary" 
                fullWidth
                onClick={() => navigate(`/characters/${id}/inventory`)}
              >
                🎒 Gerenciar Inventário
              </Button>
              {character.inventory?.length > 0 ? (
                <ul className="inventory-preview">
                  {character.inventory.slice(0, 5).map((item) => (
                    <li key={item.id}>{item.name} x{item.quantity}</li>
                  ))}
                  {character.inventory.length > 5 && (
                    <li className="more">+{character.inventory.length - 5} itens...</li>
                  )}
                </ul>
              ) : (
                <p className="tab-info">Inventário vazio</p>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              <textarea
                className="notes-input"
                placeholder="Anotações do personagem..."
                value={character.notes || ''}
                onChange={(e) => {
                  const updated = { ...character, notes: e.target.value };
                  setCharacter(updated);
                  saveCharacter(updated);
                }}
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <section className="quick-actions-bar">
          <Button variant="primary" onClick={() => navigate('/dice')}>
            🎲 Rolar Dados
          </Button>
        </section>
      </main>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <LevelUpModal
        isOpen={levelUpModalOpen}
        onClose={() => setLevelUpModalOpen(false)}
        character={character}
      />

      <Modal isOpen={xpModalOpen} onClose={() => setXpModalOpen(false)} title="Adicionar XP">
        <div className="xp-modal">
          <section className="form-section xp-input-section">
            <div className="xp-input-controls">
              <button
                type="button"
                className="xp-btn"
                onClick={() => changeXpInputBy(-1)}
                aria-label="Diminuir XP"
              >
                −
              </button>
              <input
                id="xp-amount"
                type="number"
                min="1"
                className="form-input xp-input"
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                ref={xpInputRef}
                aria-label="Quantidade de XP"
              />
              <button
                type="button"
                className="xp-btn"
                onClick={() => changeXpInputBy(1)}
                aria-label="Aumentar XP"
              >
                +
              </button>
            </div>
            <div className="xp-quick-actions">
              <Button variant="secondary" size="small" onClick={() => addQuickToInput(1)} aria-label="Adicionar 1 XP">+1</Button>
              <Button variant="secondary" size="small" onClick={() => addQuickToInput(10)} aria-label="Adicionar 10 XP">+10</Button>
              <Button variant="secondary" size="small" onClick={() => addQuickToInput(100)} aria-label="Adicionar 100 XP">+100</Button>
              <Button variant="secondary" size="small" onClick={() => addQuickToInput(1000)} aria-label="Adicionar 1000 XP">+1000</Button>
            </div>
          </section>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setXpModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => handleAddXp(xpAmount)}>Adicionar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CharacterDetail;
