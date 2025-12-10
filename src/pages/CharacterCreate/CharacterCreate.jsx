/**
 * CharacterCreate organiza todo o fluxo de criação da ficha:
 * coleta dados básicos, aplica compra de atributos via pontos e
 * persiste o resultado usando StorageService antes de abrir os detalhes.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button, Toast } from '../../components';
import { createCharacter, RACES, CLASSES, getAttributeModifier } from '../../models';
import { saveCharacter } from '../../services';
import './CharacterCreate.css';

const CHARACTER_ICONS = ['⚔️', '🛡️', '🏹', '🔮', '📖', '🗡️', '🪓', '🎭', '👑', '🐉'];
const DEFAULT_HP = 10;
const ATTRIBUTE_POINTS_TOTAL = 10;
const ATTRIBUTE_MIN = -1;
const ATTRIBUTE_MAX = 3;
const ATTRIBUTE_COST_MAP = {
  [-1]: -1,
  0: 0,
  1: 1,
  2: 2,
  3: 4,
};
const ATTRIBUTE_LABELS = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
};

const INITIAL_ATTRIBUTES = Object.keys(ATTRIBUTE_LABELS).reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

const formatAttributeValue = (value = 0) => (value > 0 ? `+${value}` : `${value}`);

const calculatePointsSpent = (attributes = {}) => {
  return Object.values(attributes).reduce((total, current) => total + (ATTRIBUTE_COST_MAP[current] ?? 0), 0);
};

const clampAttributeValue = (value) => {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }
  return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Number(value)));
};

const getRaceAdjustment = (race, attrKey) => {
  if (!race) {
    return 0;
  }
  const bonus = typeof race.bonus?.[attrKey] === 'number' ? race.bonus[attrKey] : 0;
  const penalty = typeof race.penalty?.[attrKey] === 'number' ? race.penalty[attrKey] : 0;
  return bonus + penalty;
};

// Calcula PV totais considerando tabela da classe ou fallback no dado de vida.
const calculateHpForClass = (charClass, level, constitutionModifier) => {
  const safeLevel = Number.isFinite(level) && level > 0 ? level : 1;
  const safeCon = Number.isFinite(constitutionModifier) ? constitutionModifier : 0;

  if (charClass?.hp) {
    const firstLevelHp = charClass.hp.initial + safeCon;
    if (safeLevel === 1) {
      return Math.max(1, firstLevelHp);
    }
    const perLevel = charClass.hp.perLevel + safeCon;
    return Math.max(1, firstLevelHp + (safeLevel - 1) * perLevel);
  }

  if (charClass?.hitDie) {
    return Math.max(1, charClass.hitDie + safeCon);
  }

  return Math.max(1, DEFAULT_HP + safeCon);
};

// Calcula PM iniciais usando o valor por nível da classe.
const calculateMpForClass = (charClass, level) => {
  if (!charClass?.mpPerLevel) {
    return 0;
  }

  const safeLevel = Number.isFinite(level) && level > 0 ? level : 1;
  return charClass.mpPerLevel * safeLevel;
};

function CharacterCreate() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '⚔️',
    race: '',
    characterClass: '',
    level: 1,
    attributes: { ...INITIAL_ATTRIBUTES },
  });

  const pointsSpent = calculatePointsSpent(formData.attributes);
  const pointsRemaining = ATTRIBUTE_POINTS_TOTAL - pointsSpent;

  const canIncreaseAttribute = (attrKey) => {
    const currentValue = formData.attributes?.[attrKey] ?? 0;
    if (currentValue >= ATTRIBUTE_MAX) {
      return false;
    }

    const nextValue = clampAttributeValue(currentValue + 1);
    if (nextValue === currentValue) {
      return false;
    }

    const currentCost = ATTRIBUTE_COST_MAP[currentValue] ?? 0;
    const nextCost = ATTRIBUTE_COST_MAP[nextValue] ?? 0;
    const additionalCost = nextCost - currentCost;
    return additionalCost <= pointsRemaining;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeAdjust = (attr, delta) => {
    setFormData((prev) => {
      const currentValue = prev.attributes[attr] ?? 0;
      const proposedValue = clampAttributeValue(currentValue + delta);
      if (proposedValue === currentValue) {
        return prev;
      }

      const updatedAttributes = { ...prev.attributes, [attr]: proposedValue };
      const updatedSpent = calculatePointsSpent(updatedAttributes);

      if (updatedSpent > ATTRIBUTE_POINTS_TOTAL) {
        setToast({ message: 'Pontos insuficientes para este ajuste.', type: 'error' });
        return prev;
      }

      return { ...prev, attributes: updatedAttributes };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setToast({ message: 'Digite um nome para o personagem', type: 'error' });
      return;
    }

    const race = RACES.find(r => r.id === formData.race);
    const charClass = CLASSES.find(c => c.id === formData.characterClass);

    const baseConstitution = formData.attributes.constituicao ?? 0;
    const constitutionTotal = baseConstitution + getRaceAdjustment(race, 'constituicao');
    const constitutionModifier = getAttributeModifier(constitutionTotal);
    const computedHp = calculateHpForClass(charClass, formData.level, constitutionModifier);
    const computedMp = calculateMpForClass(charClass, formData.level);

    const character = createCharacter({
      ...formData,
      race,
      characterClass: charClass,
      hp: {
        current: computedHp,
        max: computedHp,
        temp: 0,
      },
      mp: {
        current: computedMp,
        max: computedMp,
      },
    });
    
    saveCharacter(character);
    setToast({ message: 'Personagem criado com sucesso!', type: 'success' });
    
    setTimeout(() => {
      navigate(`/characters/${character.id}`);
    }, 1000);
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
            <label className="form-label points-label">
              Distribua seus pontos
              <span className="points-remaining">Restantes: {pointsRemaining}</span>
            </label>
            <div className="attributes-grid">
              {Object.entries(formData.attributes).map(([attr, value]) => {
                const safeValue = value ?? 0;
                return (
                  <div key={attr} className="attribute-input">
                    <label>{ATTRIBUTE_LABELS[attr]}</label>
                    <div className="attribute-controls">
                      <button
                        type="button"
                        className="attr-btn"
                        onClick={() => handleAttributeAdjust(attr, -1)}
                      >
                        −
                      </button>
                      <span className="attribute-value-display">{formatAttributeValue(safeValue)}</span>
                      {canIncreaseAttribute(attr) && (
                        <button
                          type="button"
                          className="attr-btn"
                          onClick={() => handleAttributeAdjust(attr, 1)}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
