import React, { useState } from 'react';
import { Header, Button, DiceButton, Toast } from '../../components';
import { DICE_TYPES, performRoll } from '../../models';
import { loadRollHistory, addRollToHistory, clearRollHistory } from '../../services';
import './DiceRoller.css';

function DiceRoller() {
  const [selectedDice, setSelectedDice] = useState('d20');
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rollType, setRollType] = useState('normal');
  const [currentRoll, setCurrentRoll] = useState(null);
  const [history, setHistory] = useState(() => loadRollHistory());
  const [toast, setToast] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    setIsRolling(true);
    
    // Animação simulada
    setTimeout(() => {
      const roll = performRoll(selectedDice, diceCount, modifier, rollType);
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

  return (
    <div className="page dice-roller-page">
      <Header title="Rolar Dados" />
      
      <main className="page-content">
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
                {currentRoll.isCriticalSuccess && <span className="roll-critical">🎉 CRÍTICO!</span>}
                {currentRoll.isCriticalFailure && <span className="roll-critical">💀 FALHA CRÍTICA!</span>}
              </>
            ) : (
              <span className="roll-placeholder">Selecione e role!</span>
            )}
          </div>
        </section>

        {/* Seleção de Dados */}
        <section className="dice-selection">
          <h3>Escolha o dado</h3>
          <div className="dice-grid">
            {DICE_TYPES.map((dice) => (
              <DiceButton
                key={dice.id}
                diceType={dice.id}
                sides={dice.sides}
                selected={selectedDice === dice.id}
                onClick={() => setSelectedDice(dice.id)}
              />
            ))}
          </div>
        </section>

        {/* Configurações */}
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
            {isRolling ? '🎲 Rolando...' : `🎲 Rolar ${diceCount}${selectedDice}`}
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
                  <span className="history-dice">{roll.diceCount}{roll.diceType}</span>
                  <span className="history-rolls">[{roll.rolls.join(', ')}]</span>
                  {roll.modifier !== 0 && <span className="history-mod">{roll.modifier >= 0 ? '+' : ''}{roll.modifier}</span>}
                  <span className="history-total">= {roll.total}</span>
                  {roll.rollType !== 'normal' && <span className="history-type">{getRollTypeLabel(roll.rollType)}</span>}
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
