import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header, Button, Toast } from '../../components';
import { getCharacterById, saveCharacter } from '../../services';
import { getAttributeModifier, SKILLS } from '../../models';
import './CharacterDetail.css';

function CharacterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loaded = getCharacterById(id);
    if (loaded) {
      setCharacter(loaded);
    } else {
      navigate('/characters');
    }
  }, [id, navigate]);

  const handleHpChange = (delta) => {
    if (!character) return;
    const newHp = Math.max(0, Math.min(character.hp.max, character.hp.current + delta));
    const updated = { ...character, hp: { ...character.hp, current: newHp } };
    setCharacter(updated);
    saveCharacter(updated);
  };

  const handleMpChange = (delta) => {
    if (!character) return;
    const newMp = Math.max(0, Math.min(character.mp.max, character.mp.current + delta));
    const updated = { ...character, mp: { ...character.mp, current: newMp } };
    setCharacter(updated);
    saveCharacter(updated);
  };

  if (!character) {
    return <div className="page">Carregando...</div>;
  }

  const attributeLabels = {
    forca: 'FOR',
    destreza: 'DES',
    constituicao: 'CON',
    inteligencia: 'INT',
    sabedoria: 'SAB',
    carisma: 'CAR',
  };

  const tabs = [
    { id: 'stats', label: 'Status', icon: '📊' },
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
              {character.race?.name || 'Raça'} • {character.characterClass?.name || 'Classe'} • Nível {character.level}
            </p>
          </div>
        </section>

        {/* HP e MP */}
        <section className="vitals-section">
          <div className="vital-card hp-card">
            <div className="vital-header">
              <span className="vital-label">❤️ PV</span>
              <span className="vital-value">{character.hp.current}/{character.hp.max}</span>
            </div>
            <div className="vital-bar">
              <div 
                className="vital-fill hp-fill" 
                style={{ width: `${(character.hp.current / character.hp.max) * 100}%` }}
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
              <span className="vital-value">{character.mp.current}/{character.mp.max}</span>
            </div>
            <div className="vital-bar">
              <div 
                className="vital-fill mp-fill" 
                style={{ width: `${character.mp.max > 0 ? (character.mp.current / character.mp.max) * 100 : 0}%` }}
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
            {Object.entries(character.attributes).map(([attr, value]) => (
              <div key={attr} className="attribute-box">
                <span className="attr-label">{attributeLabels[attr]}</span>
                <span className="attr-value">{value}</span>
                <span className="attr-mod">
                  {getAttributeModifier(value) >= 0 ? '+' : ''}{getAttributeModifier(value)}
                </span>
              </div>
            ))}
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
            <span className="stat-value">{character.money}</span>
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
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="skills-tab">
              <div className="skills-list">
                {SKILLS.map((skill) => {
                  const attrValue = character.attributes[skill.attr] || 10;
                  const mod = getAttributeModifier(attrValue);
                  const trained = character.skills?.includes(skill.id);
                  const bonus = trained ? mod + Math.floor(character.level / 2) + 2 : mod;
                  
                  return (
                    <div key={skill.id} className={`skill-item ${trained ? 'trained' : ''}`}>
                      <span className="skill-name">{skill.name}</span>
                      <span className="skill-attr">({attributeLabels[skill.attr]})</span>
                      <span className="skill-bonus">
                        {bonus >= 0 ? '+' : ''}{bonus}
                      </span>
                    </div>
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
    </div>
  );
}

export default CharacterDetail;
