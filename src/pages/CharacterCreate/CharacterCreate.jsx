import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast } from '../../components';
import { createCharacter, RACES, CLASSES } from '../../models';
import { saveCharacter } from '../../services';
import './CharacterCreate.css';

const CHARACTER_ICONS = ['⚔️', '🛡️', '🏹', '🔮', '📖', '🗡️', '🪓', '🎭', '👑', '🐉'];

function CharacterCreate() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '⚔️',
    race: '',
    characterClass: '',
    level: 1,
    attributes: {
      forca: 10,
      destreza: 10,
      constituicao: 10,
      inteligencia: 10,
      sabedoria: 10,
      carisma: 10,
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeChange = (attr, value) => {
    const numValue = Math.max(1, Math.min(30, parseInt(value) || 0));
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: numValue },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setToast({ message: 'Digite um nome para o personagem', type: 'error' });
      return;
    }

    const race = RACES.find(r => r.id === formData.race);
    const charClass = CLASSES.find(c => c.id === formData.characterClass);
    
    const character = createCharacter({
      ...formData,
      race,
      characterClass: charClass,
      hp: {
        current: charClass ? charClass.hitDie + Math.floor((formData.attributes.constituicao - 10) / 2) : 10,
        max: charClass ? charClass.hitDie + Math.floor((formData.attributes.constituicao - 10) / 2) : 10,
        temp: 0,
      },
    });
    
    saveCharacter(character);
    setToast({ message: 'Personagem criado com sucesso!', type: 'success' });
    
    setTimeout(() => {
      navigate(`/characters/${character.id}`);
    }, 1000);
  };

  const attributeLabels = {
    forca: 'Força',
    destreza: 'Destreza',
    constituicao: 'Constituição',
    inteligencia: 'Inteligência',
    sabedoria: 'Sabedoria',
    carisma: 'Carisma',
  };

  return (
    <div className="page character-create-page">
      <Header title="Criar Personagem" showBack />
      
      <main className="page-content">
        <form onSubmit={handleSubmit}>
          {/* Ícone */}
          <section className="form-section">
            <label className="form-label">Ícone</label>
            <div className="icon-picker">
              {CHARACTER_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                  onClick={() => handleChange('icon', icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </section>

          {/* Nome */}
          <section className="form-section">
            <label className="form-label">Nome do Personagem</label>
            <input
              type="text"
              className="form-input"
              placeholder="Digite o nome..."
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </section>

          {/* Raça */}
          <section className="form-section">
            <label className="form-label">Raça</label>
            <select
              className="form-select"
              value={formData.race}
              onChange={(e) => handleChange('race', e.target.value)}
            >
              <option value="">Selecione uma raça...</option>
              {RACES.map((race) => (
                <option key={race.id} value={race.id}>{race.name}</option>
              ))}
            </select>
          </section>

          {/* Classe */}
          <section className="form-section">
            <label className="form-label">Classe</label>
            <select
              className="form-select"
              value={formData.characterClass}
              onChange={(e) => handleChange('characterClass', e.target.value)}
            >
              <option value="">Selecione uma classe...</option>
              {CLASSES.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </section>

          {/* Nível */}
          <section className="form-section">
            <label className="form-label">Nível Inicial</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="20"
              value={formData.level}
              onChange={(e) => handleChange('level', parseInt(e.target.value) || 1)}
            />
          </section>

          {/* Atributos */}
          <section className="form-section">
            <label className="form-label">Atributos</label>
            <div className="attributes-grid">
              {Object.entries(formData.attributes).map(([attr, value]) => (
                <div key={attr} className="attribute-input">
                  <label>{attributeLabels[attr]}</label>
                  <div className="attribute-controls">
                    <button
                      type="button"
                      className="attr-btn"
                      onClick={() => handleAttributeChange(attr, value - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleAttributeChange(attr, e.target.value)}
                    />
                    <button
                      type="button"
                      className="attr-btn"
                      onClick={() => handleAttributeChange(attr, value + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="modifier">
                    {Math.floor((value - 10) / 2) >= 0 ? '+' : ''}{Math.floor((value - 10) / 2)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <Button type="submit" variant="primary" size="large" fullWidth>
              ✓ Criar Personagem
            </Button>
          </div>
        </form>
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

export default CharacterCreate;
