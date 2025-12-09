import React from 'react';
import './DiceButton.css';

function DiceButton({ diceType, sides, onClick, selected = false }) {
  return (
    <button 
      className={`dice-button ${selected ? 'selected' : ''}`}
      onClick={() => onClick(diceType, sides)}
    >
      <span className="dice-icon">🎲</span>
      <span className="dice-label">{diceType}</span>
    </button>
  );
}

export default DiceButton;
