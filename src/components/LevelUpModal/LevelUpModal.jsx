/*
 * LevelUpModal exibe uma notificação especial quando o personagem sobe de nível,
 * destacando o novo nível alcançado e os benefícios adquiridos.
 * Permite a seleção de um novo poder se aplicável.
 */
import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { calculateMaxHp, calculateMaxMp, getHabilidadesForClass, checkPrerequisites } from '../../models';
import './LevelUpModal.css';



function LevelUpModal({ isOpen, onClose, character, onSaveAbilities }) {
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selections, setSelections] = useState([]); // Array of selected abilities
  const [automaticFeatures, setAutomaticFeatures] = useState([]);

  useEffect(() => {
    if (isOpen && character) {
      const newSteps = [];
      const autoFeatures = [];
      const classAbilities = getHabilidadesForClass(character.characterClass);

      // 1. Identify Automatic Features for this level
      classAbilities.forEach(h => {
        if (h.type === 'feature' && h.level === character.level) {
          // Check if not already owned
          if (!character.habilidades.some(owned => owned.id === h.id)) {
            autoFeatures.push(h);
          }
        }
      });
      setAutomaticFeatures(autoFeatures);

      // 2. Determine selection counts per type
      // By default, each non-feature type may be chosen once. Additionally, each feature that
      // has grantsSelection equal to that type and with level <= character.level grants
      // +1 additional choice for that type.
      const typeCounts = new Map();

      // Default: only 'power' has a base choice (1) if eligible
      const hasEligiblePower = classAbilities.some(h => h.type === 'power' && !character.habilidades.some(owned => owned.id === h.id) && checkPrerequisites(character, h.prerequisites));
      if (hasEligiblePower) {
        typeCounts.set('power', 1);
      }

      // For each feature that grantsSelection for a type and has been reached by the character's level,
      // increment the choice count for that type (each such feature adds +1 choice)
      classAbilities.forEach(h => {
        if (h.type === 'feature' && h.grantsSelection && h.level <= character.level) {
          const t = h.grantsSelection;
          const current = typeCounts.get(t) || 0;
          typeCounts.set(t, current + 1);
        }
      });
      console.log('Final type counts with grantsSelection:', typeCounts);
      // Create steps: one step per available choice
      Array.from(typeCounts.entries()).forEach(([t, count]) => {
        for (let i = 0; i < count; i++) {
          newSteps.push({ type: 'selection', selectionType: t, title: `Escolha uma habilidade` });
        }
      });
      
      // 4. Summary
      newSteps.push({ type: 'summary', title: 'Resumo do Nível' });

      setSteps(newSteps);
      setCurrentStepIndex(0);
      setSelections([]);
      setSelectedId(null);
    }
  }, [isOpen, character?.level, character?.characterClass]);

  if (!character) return null;
  if (steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  if (!currentStep) return null;

  const oldLevel = character.level - 1;
  const oldMaxHp = calculateMaxHp({ ...character, level: oldLevel });
  const oldMaxMp = calculateMaxMp({ ...character, level: oldLevel });
  const newMaxHp = calculateMaxHp(character);
  const newMaxMp = calculateMaxMp(character);
  const hpIncrease = newMaxHp - oldMaxHp;
  const mpIncrease = newMaxMp - oldMaxMp;

  const handleNext = () => {
    if (currentStep.type === 'summary') {
      // Save everything and close
      const allAbilities = [...automaticFeatures, ...selections];
      if (onSaveAbilities && allAbilities.length > 0) {
        onSaveAbilities(allAbilities);
      }
      onClose();
      return;
    }

    // Save selection for current step
    if (selectedId) {
      const list = getListForStep(currentStep);
      const selected = list.find(i => i.id === selectedId);
      if (selected) {
        setSelections(prev => [...prev, selected]);
      }
    }

    // Move to next step
    setSelectedId(null);
    setCurrentStepIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setSelectedId(null);
    setCurrentStepIndex(prev => prev + 1);
  };

  const getListForStep = (step) => {
    const all = getHabilidadesForClass(character.characterClass);
    if (step.type === 'selection') {
      // List all abilities of the requested type that are not already owned
      return all.filter(h => h.type === step.selectionType && !character.habilidades.some(owned => owned.id === h.id));
    }

    return [];
  };

  const renderListStep = () => {
    const list = getListForStep(currentStep);
    return (
      <div className="level-up-content">
        <div className="level-display">
          <span className="level-label">Nível</span>
          <span className="level-number">{character.level}</span>
        </div>
        <div className="benefits-section">
          <h3>{currentStep.title}:</h3>
          <div className="powers-list-scroll">
            {list.map(item => {
              const meetsPrereq = checkPrerequisites(character, item.prerequisites);
              return (
                <div 
                  key={item.id} 
                  className={`power-option ${selectedId === item.id ? 'selected' : ''} ${!meetsPrereq ? 'disabled' : ''}`}
                  onClick={() => meetsPrereq && setSelectedId(item.id)}
                >
                  <div className="power-header">
                    <strong>{item.name}</strong>
                    {!meetsPrereq && <span className="prereq-warning"> (Pré-requisitos não atendidos)</span>}
                  </div>
                  <p className="power-desc">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={handleSkip}>Pular</Button>
          <Button 
            variant="primary" 
            onClick={handleNext} 
            disabled={!selectedId}
          >
            Confirmar
          </Button>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="level-up-content">
      <div className="level-display">
        <span className="level-label">Nível</span>
        <span className="level-number">{character.level}</span>
      </div>
      <div className="benefits-section">
        <h3>Benefícios adquiridos:</h3>
        <ul className="benefits-list">
          {hpIncrease > 0 && <li>HP máximo aumentou em {hpIncrease}</li>}
          {mpIncrease > 0 && <li>PM máximo aumentou em {mpIncrease}</li>}
          
          {automaticFeatures.map(f => (
            <li key={f.id} className="new-power-benefit">
              <strong>Nova Habilidade:</strong> {f.name}
            </li>
          ))}

          {selections.map(s => (
            <li key={s.id} className="new-power-benefit">
              <strong>{s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : 'Poder'}:</strong> {s.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="modal-actions">
        <Button variant="primary" onClick={handleNext}>Concluir</Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={currentStep?.title || 'Nível'}>
      <div className="level-up-modal">
        {currentStep?.type === 'summary' ? renderSummary() : renderListStep()}
      </div>
    </Modal>
  );
}

export default LevelUpModal;