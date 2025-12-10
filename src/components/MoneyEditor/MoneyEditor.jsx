/*
 * MoneyEditor é um componente reutilizável que exibe o valor do dinheiro e permite edição via modal.
 * Utilizado em páginas como CharacterDetail e Inventory para alterar o dinheiro do personagem.
 */
import React, { useState } from 'react';
import { Modal, Button, CoinRain } from '../../components';
import { loadSettings } from '../../services';
import './MoneyEditor.css';

function MoneyEditor({ value, onSave, label = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newValue, setNewValue] = useState(value);
  const [activeCoins, setActiveCoins] = useState([]);

  const playCoinSound = () => {
    const settings = loadSettings();
    if (!settings.soundEnabled) return; // Se som desabilitado, não tocar

    try {
      // Gerar um som simples de tilintar com Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frequência alta
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Baixa
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2); // Alta novamente

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Web Audio não suportado');
    }
  };

  const handleIncrease = () => {
    setNewValue(newValue + 1);
    const id = Date.now() + Math.random(); // ID único
    setActiveCoins(prev => [...prev, id]);
    playCoinSound();
  };

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
              <button className="adjust-btn" onClick={handleIncrease}>+</button>
            </div>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
      {activeCoins.map(id => (
        <CoinRain key={id} onComplete={() => setActiveCoins(prev => prev.filter(c => c !== id))} />
      ))}
    </>
  );
}

export default MoneyEditor;