import React from 'react';
import './CharacterCard.css';

function CharacterCard({ character, onClick }) {
  const { name, icon, level, race, characterClass, hp } = character;
  
  const hpPercentage = hp?.max > 0 ? (hp.current / hp.max) * 100 : 100;
  
  return (
    <div className="character-card" onClick={onClick}>
      <div className="character-icon">{icon || '⚔️'}</div>
      <div className="character-info">
        <h3 className="character-name">{name}</h3>
        <p className="character-details">
          {race?.name || 'Raça'} • {characterClass?.name || 'Classe'} • Nv. {level}
        </p>
        <div className="character-hp-bar">
          <div 
            className="hp-fill" 
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
        <span className="hp-text">{hp?.current || 0}/{hp?.max || 0} PV</span>
      </div>
      <div className="character-arrow">›</div>
    </div>
  );
}

export default CharacterCard;
