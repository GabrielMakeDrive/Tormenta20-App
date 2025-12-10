/**
 * CharacterCreate organiza o fluxo completo de criação e edição de fichas:
 * coleta dados básicos, aplica compra de atributos via pontos e persiste ou
 * atualiza o personagem no StorageService antes de abrir os detalhes.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header, Button, Toast } from '../../components';
import { 
  createCharacter, 
  RACES, 
  CLASSES, 
  SKILLS,
  TALENTS,
  getTalentsForClass,
  calculateMaxHp,
  calculateMaxMp,
} from '../../models';
import { saveCharacter, getCharacterById } from '../../services';
import './CharacterCreate.css';

const CHARACTER_ICONS = ['⚔️', '🛡️', '🏹', '🔮', '📖', '🗡️', '🪓', '🎭', '👑', '🐉'];
const DEFAULT_HP = 10;
const ATTRIBUTE_POINTS_TOTAL = 10;
const ATTRIBUTE_MIN = -1;
const ATTRIBUTE_MAX = 4;
const ATTRIBUTE_COST_MAP = {
  [-1]: -1,
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
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

const getRaceAttributeBonus = (race, attrKey) => {
  if (!race) {
    return 0;
  }
  const bonus = typeof race.bonus?.[attrKey] === 'number' ? race.bonus[attrKey] : 0;
  const penalty = typeof race.penalty?.[attrKey] === 'number' ? race.penalty[attrKey] : 0;
  return bonus + penalty;
};

const getClassAttributeBonus = (characterClass, attrKey) => {
  if (!characterClass || typeof characterClass !== 'object') {
    return 0;
  }
  const adjustments = characterClass.attributeAdjustments;
  if (!adjustments || typeof adjustments !== 'object') {
    return 0;
  }
  const rawValue = adjustments[attrKey];
  return typeof rawValue === 'number' ? rawValue : 0;
};

const calculatePointsSpent = (attributes = {}) => {
  return Object.values(attributes).reduce((total, current) => total + (ATTRIBUTE_COST_MAP[current] ?? 0), 0);
};

const clampAttributeValue = (value) => {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }
  return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Number(value)));
};

const clampLevelValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(1, Math.min(20, Math.trunc(numeric)));
};

const getMandatorySkills = (characterClass) => {
  if (!characterClass?.skillTraining?.mandatory) {
    return [];
  }
  return characterClass.skillTraining.mandatory;
};

const getAvailableSkillChoices = (characterClass) => {
  if (!characterClass?.skillTraining?.choiceGroups) {
    return [];
  }
  return characterClass.skillTraining.choiceGroups.flatMap(group => group.options);
};

const getGroupForSkill = (characterClass, skillId) => {
  if (!characterClass?.skillTraining?.choiceGroups) return -1;
  return characterClass.skillTraining.choiceGroups.findIndex(group => group.options.includes(skillId));
};

const sanitizeAttributesForForm = (attributes = {}) => {
  return Object.keys(ATTRIBUTE_LABELS).reduce((acc, key) => {
    const rawValue = Number(attributes?.[key]);
    if (!Number.isFinite(rawValue)) {
      acc[key] = 0;
    } else {
      acc[key] = clampAttributeValue(rawValue);
    }
    return acc;
  }, { ...INITIAL_ATTRIBUTES });
};

const createInitialFormData = () => ({
  name: '',
  icon: '⚔️',
  race: '',
  characterClass: '',
  level: 1,
  attributes: { ...INITIAL_ATTRIBUTES },
  skills: [],
  talents: [],
});

function CharacterCreate({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id: routeCharacterId } = useParams();
  const isEditMode = mode === 'edit';
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState(() => createInitialFormData());
  const [originalCharacter, setOriginalCharacter] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [completedGroups, setCompletedGroups] = useState(new Set());
  const [selectedSkillsByGroup, setSelectedSkillsByGroup] = useState({});

  useEffect(() => {
    if (!isEditMode) {
      setOriginalCharacter(null);
      setIsLoading(false);
      return;
    }

    if (!routeCharacterId) {
      setToast({ message: 'Personagem não encontrado.', type: 'error' });
      setIsLoading(false);
      navigate('/characters');
      return;
    }

    const existing = getCharacterById(routeCharacterId);
    if (!existing) {
      setToast({ message: 'Personagem não encontrado.', type: 'error' });
      setIsLoading(false);
      setTimeout(() => navigate('/characters'), 800);
      return;
    }

    setOriginalCharacter(existing);
    const existingRaceId = typeof existing.race === 'string'
      ? existing.race
      : existing.race?.id || '';
    const existingClassId = typeof existing.characterClass === 'string'
      ? existing.characterClass
      : existing.characterClass?.id || '';

    const existingClassDefinition = CLASSES.find((cls) => cls.id === existingClassId) || null;

    const sanitizedAttributes = sanitizeAttributesForForm(existing.attributes);
    const baseSkills = Array.isArray(existing.skills) ? existing.skills : [];
    const mandatorySkills = getMandatorySkills(existingClassDefinition);
    const mergedSkills = [...new Set([...(mandatorySkills || []), ...baseSkills])];

    // Assign skills to groups
    const choiceGroups = existingClassDefinition?.skillTraining?.choiceGroups || [];
    const newSelectedSkillsByGroup = {};
    const assignedSkills = new Set();
    choiceGroups.forEach((group, index) => {
      const groupSelected = new Set();
      group.options.forEach(skillId => {
        if (mergedSkills.includes(skillId) && !assignedSkills.has(skillId)) {
          groupSelected.add(skillId);
          assignedSkills.add(skillId);
        }
      });
      if (groupSelected.size > 0) {
        newSelectedSkillsByGroup[index] = groupSelected;
      }
    });

    // Determine completed groups
    const newCompletedGroups = new Set();
    choiceGroups.forEach((group, index) => {
      const groupSelected = newSelectedSkillsByGroup[index] || new Set();
      if (groupSelected.size === group.choose) {
        newCompletedGroups.add(index);
      }
    });

    setFormData({
      name: existing.name || '',
      icon: existing.icon || '⚔️',
      race: existingRaceId,
      characterClass: existingClassId,
      level: clampLevelValue(existing.level || 1),
      attributes: sanitizedAttributes,
      skills: mergedSkills,
      talents: existing.talents || [],
    });
    setSelectedSkillsByGroup(newSelectedSkillsByGroup);
    setCompletedGroups(newCompletedGroups);
    setIsLoading(false);
  }, [isEditMode, routeCharacterId, navigate]);

  const pointsSpent = calculatePointsSpent(formData.attributes);
  const pointsRemaining = ATTRIBUTE_POINTS_TOTAL - pointsSpent;
  const headerTitle = isEditMode ? 'Editar Personagem' : 'Criar Personagem';
  const submitButtonLabel = isEditMode ? '💾 Salvar Alterações' : '✓ Criar Personagem';
  const levelLabel = isEditMode ? 'Nível' : 'Nível Inicial';
  const selectedRaceDefinition = RACES.find((race) => race.id === formData.race) || null;
  const selectedClassDefinition = CLASSES.find((cls) => cls.id === formData.characterClass) || null;

  const canDecreaseAttribute = (attrKey) => {
    const currentValue = formData.attributes?.[attrKey] ?? 0;
    return currentValue > ATTRIBUTE_MIN;
  };

  const canDecreaseLevel = (level) => {
    const lv = clampLevelValue(level);
    return lv > 1;
  };

  const canIncreaseLevel = (level) => {
    const lv = clampLevelValue(level);
    return lv < 20;
  };

  const adjustLevel = (delta) => {
    setFormData((prev) => {
      const current = clampLevelValue(prev.level || 1);
      const next = clampLevelValue(current + delta);
      if (next === current) return prev;
      return { ...prev, level: next };
    });
  };

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
    setFormData(prev => {
      if (field === 'level') {
        return { ...prev, level: clampLevelValue(value) };
      }
      if (field === 'characterClass') {
        // Reset skills and talents when class changes
        setExpandedGroup(null);
        setCompletedGroups(new Set());
        setSelectedSkillsByGroup({});
        return { ...prev, [field]: value, skills: [], talents: [] };
      }
      return { ...prev, [field]: value };
    });
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

  const handleSkillToggle = (skillId) => {
    const groupIndex = getGroupForSkill(selectedClassDefinition, skillId);
    if (groupIndex === -1) return;
    
    const group = selectedClassDefinition.skillTraining.choiceGroups[groupIndex];
    
    setSelectedSkillsByGroup((prevSelected) => {
      const currentGroupSelected = prevSelected[groupIndex] || new Set();
      const isSelected = currentGroupSelected.has(skillId);
      let newGroupSelected;
      if (isSelected) {
        newGroupSelected = new Set(currentGroupSelected);
        newGroupSelected.delete(skillId);
      } else {
        if (currentGroupSelected.size >= group.choose) {
          setToast({ message: `Você já selecionou o máximo para este grupo (${group.choose}).`, type: 'error' });
          return prevSelected;
        }
        newGroupSelected = new Set(currentGroupSelected);
        newGroupSelected.add(skillId);
      }
      
      const newSelected = { ...prevSelected, [groupIndex]: newGroupSelected };
      
      // Update completed groups
      if (newGroupSelected.size === group.choose && !completedGroups.has(groupIndex)) {
        setCompletedGroups(prevComp => new Set([...prevComp, groupIndex]));
        setExpandedGroup(null);
      } else if (newGroupSelected.size < group.choose && completedGroups.has(groupIndex)) {
        setCompletedGroups(prevComp => {
          const newSet = new Set(prevComp);
          newSet.delete(groupIndex);
          return newSet;
        });
      }
      
      // Update global skills
      const newGlobalSkills = [...new Set(Object.values(newSelected).flatMap(set => Array.from(set || [])))];
      setFormData(prevForm => ({ ...prevForm, skills: newGlobalSkills }));
      
      return newSelected;
    });
  };

  const handleTalentToggle = (talentId) => {
    setFormData((prev) => {
      const currentTalents = prev.talents || [];
      const isSelected = currentTalents.some(t => t.id === talentId);
      
      let newTalents;
      if (isSelected) {
        newTalents = currentTalents.filter(t => t.id !== talentId);
      } else {
        const talent = getTalentsForClass(prev.characterClass).find(t => t.id === talentId);
        if (talent) {
          newTalents = [...currentTalents, { id: talentId, name: talent.name }];
        } else {
          return prev;
        }
      }
      
      return { ...prev, talents: newTalents };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setToast({ message: 'Digite um nome para o personagem', type: 'error' });
      return;
    }

    const rawRaceValue = typeof formData.race === 'string'
      ? formData.race
      : formData.race?.id;
    const selectedRaceId = rawRaceValue || null;
    const rawClassValue = typeof formData.characterClass === 'string'
      ? formData.characterClass
      : formData.characterClass?.id;
    const selectedClassId = rawClassValue || null;

    if (!selectedRaceId) {
      setToast({ message: 'Selecione uma raça para continuar.', type: 'error' });
      return;
    }

    if (!selectedClassId) {
      setToast({ message: 'Selecione uma classe para continuar.', type: 'error' });
      return;
    }

    // Validar perícias obrigatórias
    const mandatorySkills = getMandatorySkills(selectedClassDefinition);
    const currentSkills = formData.skills || [];
    const missingMandatory = mandatorySkills.filter(skill => !currentSkills.includes(skill));
    if (missingMandatory.length > 0) {
      setToast({ message: 'Todas as perícias obrigatórias devem estar selecionadas.', type: 'error' });
      return;
    }

    // Validar grupos de escolha
    const choiceGroups = selectedClassDefinition.skillTraining.choiceGroups || [];
    for (let i = 0; i < choiceGroups.length; i++) {
      const group = choiceGroups[i];
      const groupSelected = selectedSkillsByGroup[i] || new Set();
      if (groupSelected.size !== group.choose) {
        setToast({ message: `Grupo ${i + 1}: Selecione exatamente ${group.choose} perícia(s).`, type: 'error' });
        return;
      }
    }

    const normalizedCharacter = {
      name: formData.name.trim(),
      icon: formData.icon,
      race: selectedRaceId,
      characterClass: selectedClassId,
      level: clampLevelValue(formData.level),
      attributes: { ...formData.attributes },
      skills: [...(formData.skills || [])],
      talents: [...(formData.talents || [])],
    };

    const fallbackHp = isEditMode ? (originalCharacter?.hp?.max ?? DEFAULT_HP) : DEFAULT_HP;
    const fallbackMp = isEditMode ? (originalCharacter?.mp?.max ?? 0) : 0;
    const computedHp = calculateMaxHp(normalizedCharacter) || fallbackHp;
    const computedMp = calculateMaxMp(normalizedCharacter) ?? fallbackMp;

    if (isEditMode) {
      if (!originalCharacter) {
        setToast({ message: 'Não foi possível carregar o personagem para edição.', type: 'error' });
        return;
      }

      const updatedCharacter = {
        ...originalCharacter,
        ...normalizedCharacter,
        hp: {
          ...originalCharacter.hp,
          max: computedHp,
          current: Math.min(originalCharacter.hp?.current ?? computedHp, computedHp),
          temp: originalCharacter.hp?.temp ?? 0,
        },
        mp: {
          ...originalCharacter.mp,
          max: computedMp,
          current: Math.min(originalCharacter.mp?.current ?? computedMp, computedMp),
        },
      };

      saveCharacter(updatedCharacter);
      setToast({ message: 'Personagem atualizado com sucesso!', type: 'success' });
      setTimeout(() => {
        navigate(`/characters/${updatedCharacter.id}`);
      }, 800);
      return;
    }

    const character = createCharacter({
      ...normalizedCharacter,
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
      <Header title={headerTitle} showBack />
      
      <main className="page-content">
        {isEditMode && isLoading ? (
          <p>Carregando personagem...</p>
        ) : (
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
              required
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
              required
            >
              <option value="">Selecione uma classe...</option>
              {CLASSES.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </section>

          {/* Nível */}
          <section className="form-section">
            <label className="form-label">{levelLabel}</label>
            <div className="level-input-controls">
              <input
                type="number"
                className="form-input level-input"
                min="1"
                max="20"
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
              />
              <div className="level-buttons">
                <button
                  type="button"
                  className="attr-btn small"
                  onClick={() => adjustLevel(-1)}
                  disabled={!canDecreaseLevel(formData.level)}
                  title="Diminuir nível"
                >
                  −
                </button>
                <button
                  type="button"
                  className="attr-btn small"
                  onClick={() => adjustLevel(1)}
                  disabled={!canIncreaseLevel(formData.level)}
                  title="Aumentar nível"
                >
                  +
                </button>
              </div>
            </div>
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
                const raceBonus = getRaceAttributeBonus(selectedRaceDefinition, attr);
                const classBonus = getClassAttributeBonus(selectedClassDefinition, attr);
                const totalValue = safeValue + raceBonus + classBonus;
                const hasBonusBreakdown = raceBonus !== 0 || classBonus !== 0;
                return (
                  <div key={attr} className="attribute-input">
                    <label>{ATTRIBUTE_LABELS[attr]}</label>
                    <div className="attribute-controls">
                      <button
                        type="button"
                        className="attr-btn"
                        onClick={() => handleAttributeAdjust(attr, -1)}
                        disabled={!canDecreaseAttribute(attr)}
                      >
                        −
                      </button>
                      <div className="attribute-value-stack">
                        <span className="attribute-value-display">{formatAttributeValue(totalValue)}</span>
                        {hasBonusBreakdown && (
                          <span className="attribute-bonus-breakdown">
                            {raceBonus ? `${formatAttributeValue(raceBonus)} Raça` : ''}
                            {raceBonus && classBonus ? ' • ' : ''}
                            {classBonus ? `${formatAttributeValue(classBonus)} Classe` : ''}                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="attr-btn"
                        onClick={() => handleAttributeAdjust(attr, 1)}
                        disabled={!canIncreaseAttribute(attr)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Perícias */}
          {selectedClassDefinition && (
            <section className="form-section">
              <label className="form-label">Perícias Treinadas</label>
              <div className="skills-section">
                <div className="mandatory-skills">
                  <h4>Obrigatórias</h4>
                  <div className="skills-list">
                    {getMandatorySkills(selectedClassDefinition).map(skillId => {
                      const skill = SKILLS.find(s => s.id === skillId);
                      return skill ? (
                        <div key={skillId} className="skill-item mandatory">
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-attr">({skill.attr})</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="choice-skills">
                  <h4>Escolhas</h4>
                  {selectedClassDefinition.skillTraining.choiceGroups.map((group, groupIndex) => {
                    const isExpanded = expandedGroup === groupIndex;
                    const isCompleted = completedGroups.has(groupIndex);
                    const groupSelected = selectedSkillsByGroup[groupIndex] || new Set();
                    const selectedCount = groupSelected.size;
                    
                    return (
                      <div key={groupIndex} className="choice-group">
                        {!isExpanded ? (
                          <button
                            type="button"
                            className={`group-collapsed ${isCompleted ? 'completed' : ''}`}
                            onClick={() => {
                              if (isCompleted) {
                                // Reset selections for this group
                                setSelectedSkillsByGroup(prev => {
                                  const newSelected = { ...prev };
                                  delete newSelected[groupIndex];
                                  const newGlobalSkills = [...new Set(Object.values(newSelected).flatMap(set => Array.from(set || [])))];
                                  setFormData(prevForm => ({ ...prevForm, skills: newGlobalSkills }));
                                  return newSelected;
                                });
                                setCompletedGroups(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(groupIndex);
                                  return newSet;
                                });
                              }
                              setExpandedGroup(groupIndex);
                            }}
                          >
                            <span className="group-label">Grupo {groupIndex + 1}: Escolha {group.choose}</span>
                            <span className="group-status">
                              {isCompleted ? `✓ ${selectedCount}/${group.choose}` : `${selectedCount}/${group.choose}`}
                            </span>
                            <span className="expand-icon">{isCompleted ? '🔄' : '▼'}</span>
                          </button>
                        ) : (
                          <div className="group-expanded">
                            <div className="group-header">
                              Grupo {groupIndex + 1}: Escolha {group.choose} de:
                              <button
                                type="button"
                                className="collapse-btn"
                                onClick={() => setExpandedGroup(null)}
                              >
                                ▲
                              </button>
                            </div>
                            <div className="skills-list">
                              {group.options.map(skillId => {
                                const skill = SKILLS.find(s => s.id === skillId);
                                const isSelected = groupSelected.has(skillId);
                                return skill ? (
                                  <button
                                    key={skillId}
                                    type="button"
                                    className={`skill-item choice ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSkillToggle(skillId)}
                                  >
                                    <span className="skill-name">{skill.name}</span>
                                    <span className="skill-attr">({skill.attr})</span>
                                  </button>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Talentos */}
          {selectedClassDefinition && getTalentsForClass(selectedClassDefinition.id).length > 0 && (
            <section className="form-section">
              <label className="form-label">Poderes de Classe</label>
              <div className="talents-section">
                <div className="talents-list">
                  {getTalentsForClass(selectedClassDefinition.id).map(talent => {
                    const isSelected = (formData.talents || []).some(t => t.id === talent.id);
                    return (
                      <button
                        key={talent.id}
                        type="button"
                        className={`talent-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleTalentToggle(talent.id)}
                        title={talent.description}
                      >
                        <div className="talent-header">
                          <span className="talent-name">{talent.name}</span>
                          {talent.prerequisites.length > 0 && (
                            <span className="talent-prereq">Pré: {talent.prerequisites.join(', ')}</span>
                          )}
                        </div>
                        <div className="talent-desc">{talent.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <div className="form-actions">
            <Button type="submit" variant="primary" size="large" fullWidth>
              {submitButtonLabel}
            </Button>
          </div>
          </form>
        )}
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
