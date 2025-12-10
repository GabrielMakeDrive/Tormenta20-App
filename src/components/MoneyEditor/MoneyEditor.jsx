/*
 * MoneyEditor é um componente reutilizável que exibe o valor do dinheiro e permite edição via modal.
 * Utilizado em páginas como CharacterDetail e Inventory para alterar o dinheiro do personagem.
 */
import React, { useState } from 'react';
import { Modal, Button } from '../../components';
import './MoneyEditor.css';

function MoneyEditor({ value, onSave, label = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newValue, setNewValue] = useState(value);

  const handleSave = () => {
    onSave(newValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setNewValue(value);
    setIsOpen(false);
  };

  return (
    <>
      <span className="money-display" onClick={() => setIsOpen(true)}>
        {label && `${label} `}{value}
      </span>
      <Modal isOpen={isOpen} onClose={handleCancel} title="Dinheiro">
        <div className="money-form">
          <div className="form-group">
            <div className="input-group">
              <button className="adjust-btn" onClick={() => setNewValue(Math.max(0, newValue - 1))}>-</button>
              <input
                type="number"
                min="0"
                value={newValue}
                onChange={(e) => setNewValue(parseInt(e.target.value) || 0)}
              />
              <button className="adjust-btn" onClick={() => setNewValue(newValue + 1)}>+</button>
            </div>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default MoneyEditor;