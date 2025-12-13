/*
 * LevelUpModal exibe uma notificação especial quando o personagem sobe de nível,
 * destacando o novo nível alcançado e os benefícios adquiridos.
 */
import React from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { calculateMaxHp, calculateMaxMp } from '../../models';
import './LevelUpModal.css';

function LevelUpModal({ isOpen, onClose, character }) {
  if (!character) return null;
  console.log('LevelUpModal character:', character);
  const oldLevel = character.level - 1;
  const oldMaxHp = calculateMaxHp({ ...character, level: oldLevel });
  const oldMaxMp = calculateMaxMp({ ...character, level: oldLevel });
  const newMaxHp = calculateMaxHp(character);
  const newMaxMp = calculateMaxMp(character);
  const hpIncrease = newMaxHp - oldMaxHp;
  const mpIncrease = newMaxMp - oldMaxMp;
console.log('LevelUpModal hpIncrease:', hpIncrease, 'mpIncrease:', mpIncrease);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="level-up-modal">
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
              {/* Adicionar outros benefícios se necessário */}
            </ul>
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="primary" onClick={onClose}>Continuar</Button>
        </div>
      </div>
    </Modal>
  );
}

export default LevelUpModal;