import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header, Button, DiceButton, Toast } from '../../components';
import { 
  DICE_TYPES, 
  performRoll, 
  SKILLS, 
  LEVEL_PROGRESSION,
  RACES,
  getCharacterTotalAttributeValue
} from '../../models';
import { 
  loadRollHistory, 
  addRollToHistory, 
  clearRollHistory, 
  loadCharacters, 
  getCharacterById 
} from '../../services';
import './DiceRoller.css';

const getTrainingBonus = (level) => {
  if (level >= 15) return 6;
  if (level >= 7) return 4;
  return 2;
};

/**
 * Calcula o bônus total de uma perícia em Tormenta 20.
 * Fórmula: Metade do Nível + Valor do Atributo + Bônus de Treinamento
 * 
 * IMPORTANTE: O valor do atributo é somado DIRETAMENTE, não como modificador.
 * Exemplo: Força 3 adiciona +3 ao teste de Atletismo.
 */
const getSkillBonus = (character, skill) => {
  if (!character) return 0;
  
  const attrValue = getCharacterTotalAttributeValue(character, skill.attr);
  const level = Math.max(1, character.level);
  const halfLevel = Math.floor(level / 2);
  const isTrained = character.skills.includes(skill.id);
  const trainingBonus = isTrained ? getTrainingBonus(level) : 0;
  
  return halfLevel + attrValue + trainingBonus;
};

/**
 * Obtém o valor do atributo para exibição.
 * Em Tormenta 20, o valor do atributo É o bônus usado diretamente nos testes.
 */
const getAttributeDisplay = (character, attrKey) => {
  if (!character) return { value: 0 };
  const totalValue = getCharacterTotalAttributeValue(character, attrKey);
  return { value: totalValue };
};

function DiceRoller() {
  const location = useLocation();
  const [selectedDice, setSelectedDice] = useState('d20');
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rollType, setRollType] = useState('normal');
  const [rollDescription, setRollDescription] = useState('');
  
  const [currentRoll, setCurrentRoll] = useState(null);
  const [history, setHistory] = useState(() => loadRollHistory());
  const [toast, setToast] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  
  // Character Mode State
  const [rollMode, setRollMode] = useState('free'); // 'free' | 'character'
  const [characters, setCharacters] = useState([]);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [isSelectionExpanded, setIsSelectionExpanded] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);

  // Load characters and set active one
  useEffect(() => {
    const loadedCharacters = loadCharacters();
    setCharacters(loadedCharacters);

    // Check for character passed via navigation
    if (location.state?.characterId) {
      const passedChar = loadedCharacters.find(c => c.id === location.state.characterId);
      if (passedChar) {
        setActiveCharacter(passedChar);
        setRollMode('character');
        return;
      }
    }

    // Check for favorite
    const favorite = loadedCharacters.find(c => c.isFavorite);
    if (favorite) {
      setActiveCharacter(favorite);
      // Don't auto-switch to character mode unless explicitly navigated, 
      // but having it ready is good.
    } else if (loadedCharacters.length > 0) {
      setActiveCharacter(loadedCharacters[0]);
    }
  }, [location.state]);

  const handleRoll = () => {
    setIsRolling(true);
    
    // Animação simulada
    setTimeout(() => {
      const roll = performRoll(selectedDice, diceCount, modifier, rollType, rollDescription);
      setCurrentRoll(roll);
      addRollToHistory(roll);
      setHistory(prev => [...prev, roll]);
      setIsRolling(false);

      // Vibração no celular se disponível
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }, 500);
  };

  const handleClearHistory = () => {
    clearRollHistory();
    setHistory([]);
    setToast({ message: 'Histórico limpo', type: 'success' });
  };

  const getRollTypeLabel = (type) => {
    switch (type) {
      case 'advantage': return '⬆️ Vantagem';
      case 'disadvantage': return '⬇️ Desvantagem';
      default: return 'Normal';
    }
  };

  // Character Roll Helpers
  const setupAttributeRoll = (attrKey, attrLabel) => {
    if (!activeCharacter) return;
    // Em Tormenta 20, o valor do atributo é usado diretamente, não há modificador
    const attrValue = getCharacterTotalAttributeValue(activeCharacter, attrKey);
    
    setSelectedDice('d20');
    setDiceCount(1);
    setModifier(attrValue);
    setRollType('normal');
    setRollDescription(`Teste de ${attrLabel}`);
    setSelectedOption({ type: 'attribute', key: attrKey, label: attrLabel, bonus: attrValue });
    setIsSelectionExpanded(false);
    
    setToast({ message: `Configurado: Teste de ${attrLabel} (${attrValue >= 0 ? '+' : ''}${attrValue})`, type: 'info' });
  };

  const setupSkillRoll = (skill) => {
    if (!activeCharacter) return;
    
    const totalBonus = getSkillBonus(activeCharacter, skill);

    setSelectedDice('d20');
    setDiceCount(1);
    setModifier(totalBonus);
    setRollType('normal');
    setRollDescription(`Perícia: ${skill.name}`);
    setSelectedOption({ type: 'skill', skill, bonus: totalBonus });
    setIsSelectionExpanded(false);
    
    setToast({ message: `Configurado: ${skill.name} (${totalBonus >= 0 ? '+' : ''}${totalBonus})`, type: 'info' });
  };

  const ATTRIBUTES = [
    { key: 'forca', label: 'Força', abbr: 'FOR' },
    { key: 'destreza', label: 'Destreza', abbr: 'DES' },
    { key: 'constituicao', label: 'Constituição', abbr: 'CON' },
    { key: 'inteligencia', label: 'Inteligência', abbr: 'INT' },
    { key: 'sabedoria', label: 'Sabedoria', abbr: 'SAB' },
    { key: 'carisma', label: 'Carisma', abbr: 'CAR' },
  ];

  return (
    <div className="page dice-roller-page">
      <Header title="Rolar Dados" />
      
      <main className="page-content">
        {/* Mode Toggle */}
        {characters.length > 0 && (
          <div className="roll-mode-toggle">
            <button 
              className={rollMode === 'free' ? 'active' : ''} 
              onClick={() => { setRollMode('free'); setRollDescription(''); setIsSelectionExpanded(true); setSelectedOption(null); }}
            >
              Livre
            </button>
            <button 
              className={rollMode === 'character' ? 'active' : ''} 
              onClick={() => { setRollMode('character'); setIsSelectionExpanded(true); setSelectedOption(null); }}
            >
              Personagem
            </button>
          </div>
        )}

        {/* Resultado */}
        <section className="roll-result-section">
          <div className={`roll-display ${isRolling ? 'rolling' : ''} ${currentRoll?.isCriticalSuccess ? 'critical-success' : ''} ${currentRoll?.isCriticalFailure ? 'critical-failure' : ''}`}>
            {isRolling ? (
              <span className="rolling-animation">🎲</span>
            ) : currentRoll ? (
              <>
                <span className="roll-total">{currentRoll.total}</span>
                <span className="roll-details">
                  {currentRoll.rolls.join(' + ')}{modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''}
                </span>
                {currentRoll.description && <span className="roll-description">{currentRoll.description}</span>}
                {currentRoll.isCriticalSuccess && <span className="roll-critical">🎉 CRÍTICO!</span>}
                {currentRoll.isCriticalFailure && <span className="roll-critical">💀 FALHA CRÍTICA!</span>}
              </>
            ) : (
              <span className="roll-placeholder">
                {rollMode === 'character' ? 'Selecione um atributo ou perícia' : 'Selecione e role!'}
              </span>
            )}
          </div>
        </section>

        {/* Character Selector */}
        {rollMode === 'character' && characters.length > 0 && (
          <div className="character-selector">
            <select 
              value={activeCharacter?.id || ''} 
              onChange={(e) => { setActiveCharacter(characters.find(c => c.id === e.target.value)); setIsSelectionExpanded(true); setSelectedOption(null); }}
            >
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name} (Nív. {c.level})</option>
              ))}
            </select>
          </div>
        )}

        {rollMode === 'free' ? (
          /* Seleção de Dados (Modo Livre) */
          <section className="dice-selection">
            <h3>Escolha o dado</h3>
            <div className="dice-grid">
              {DICE_TYPES.map((dice) => (
                <DiceButton
                  key={dice.id}
                  diceType={dice.id}
                  sides={dice.sides}
                  selected={selectedDice === dice.id}
                  onClick={() => { setSelectedDice(dice.id); setRollDescription(''); }}
                />
              ))}
            </div>
          </section>
        ) : (
          /* Seleção de Atributos/Perícias (Modo Personagem) */
          <section className="character-rolls">
            {activeCharacter ? (
              <>
                {!isSelectionExpanded && selectedOption ? (
                  <div className="selection-collapsed" onClick={() => setIsSelectionExpanded(true)}>
                    <span className="selection-label">
                      {selectedOption.type === 'attribute' 
                        ? `${selectedOption.label}` 
                        : `${selectedOption.skill.name}`}
                    </span>
                    <span className="selection-bonus">
                      {selectedOption.bonus >= 0 ? '+' : ''}{selectedOption.bonus}
                    </span>
                    <span className="expand-icon">▼</span>
                  </div>
                ) : (
                  <>
                <div className="attributes-grid">
                  {ATTRIBUTES.map(attr => {
                    const attrDisplay = getAttributeDisplay(activeCharacter, attr.key);
                    return (
                      <button 
                        key={attr.key} 
                        className="attribute-roll-btn"
                        onClick={() => setupAttributeRoll(attr.key, attr.label)}
                      >
                        <span className="attr-abbr">{attr.abbr}</span>
                        <span className="attr-value">{attrDisplay.value >= 0 ? '+' : ''}{attrDisplay.value}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="skills-list">
                  <h3>Perícias</h3>
                  <div className="skills-grid">
                    {SKILLS.map(skill => {
                      const isTrained = activeCharacter.skills.includes(skill.id);
                      const bonus = getSkillBonus(activeCharacter, skill);

                      return (
                        <button 
                          key={skill.id} 
                          className={`skill-roll-btn ${isTrained ? 'trained' : ''}`}
                          onClick={() => setupSkillRoll(skill)}
                        >
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-bonus">{bonus >= 0 ? '+' : ''}{bonus}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
                )}
              </>
            ) : (
              <p className="no-character-msg">Nenhum personagem selecionado.</p>
            )}
          </section>
        )}

        {/* Configurações (Comum) */}
        <section className="roll-config">
          <div className="config-row">
            <label>Quantidade</label>
            <div className="config-controls">
              <button onClick={() => setDiceCount(Math.max(1, diceCount - 1))}>−</button>
              <span>{diceCount}</span>
              <button onClick={() => setDiceCount(Math.min(10, diceCount + 1))}>+</button>
            </div>
          </div>

          <div className="config-row">
            <label>Modificador</label>
            <div className="config-controls">
              <button onClick={() => setModifier(modifier - 1)}>−</button>
              <span>{modifier >= 0 ? `+${modifier}` : modifier}</span>
              <button onClick={() => setModifier(modifier + 1)}>+</button>
            </div>
          </div>

          {selectedDice === 'd20' && (
            <div className="config-row">
              <label>Tipo de Rolagem</label>
              <div className="roll-type-buttons">
                <button 
                  className={rollType === 'normal' ? 'active' : ''}
                  onClick={() => setRollType('normal')}
                >
                  Normal
                </button>
                <button 
                  className={rollType === 'advantage' ? 'active' : ''}
                  onClick={() => setRollType('advantage')}
                >
                  ⬆️ Vantagem
                </button>
                <button 
                  className={rollType === 'disadvantage' ? 'active' : ''}
                  onClick={() => setRollType('disadvantage')}
                >
                  ⬇️ Desvantagem
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Botão de Rolar */}
        <section className="roll-action">
          <Button 
            variant="primary" 
            size="large" 
            fullWidth
            onClick={handleRoll}
            disabled={isRolling}
          >
            {isRolling ? '🎲 Rolando...' : (
              rollDescription ? `🎲 Rolar ${rollDescription}` : `🎲 Rolar ${diceCount}${selectedDice}`
            )}
          </Button>
        </section>

        {/* Histórico */}
        <section className="roll-history">
          <div className="history-header">
            <h3>Histórico</h3>
            {history.length > 0 && (
              <button className="clear-history" onClick={handleClearHistory}>
                Limpar
              </button>
            )}
          </div>
          
          {history.length === 0 ? (
            <p className="history-empty">Nenhuma rolagem ainda</p>
          ) : (
            <ul className="history-list">
              {[...history].reverse().slice(0, 10).map((roll, index) => (
                <li key={roll.id || index} className={`history-item ${roll.isCriticalSuccess ? 'success' : ''} ${roll.isCriticalFailure ? 'failure' : ''}`}>
                  <div className="history-main">
                    <span className="history-dice">{roll.diceCount}{roll.diceType}</span>
                    <span className="history-total">= {roll.total}</span>
                  </div>
                  <div className="history-sub">
                    <span className="history-rolls">[{roll.rolls.join(', ')}]</span>
                    {roll.modifier !== 0 && <span className="history-mod">{roll.modifier >= 0 ? '+' : ''}{roll.modifier}</span>}
                    {roll.rollType !== 'normal' && <span className="history-type">{getRollTypeLabel(roll.rollType)}</span>}
                  </div>
                  {roll.description && <div className="history-desc">{roll.description}</div>}
                </li>
              ))}
            </ul>
          )}
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

export default DiceRoller;
