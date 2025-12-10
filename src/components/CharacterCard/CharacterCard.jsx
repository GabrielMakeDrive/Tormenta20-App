import React from 'react';
import './CharacterCard.css';

const StarIcon = ({ filled }) => (
  <svg
    className="favorite-icon"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    {filled ? (
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.32-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.63.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
    ) : (
      <path d="M2.866 14.85c-.078.444.36.791.746.593L8 13.187l4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.32.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.63-.283.95l3.522 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z" />
    )}
  </svg>
);

function CharacterCard({ character, onClick, showFavoriteToggle = false, onFavoriteToggle }) {
  const { name, icon, level, race, characterClass, hp, isFavorite } = character;
  
  const hpPercentage = hp?.max > 0 ? (hp.current / hp.max) * 100 : 100;
  
  return (
    <div className="character-card" onClick={onClick}>
      <div className="character-icon">{icon || '⚔️'}</div>
      <div className="character-info">
        <div className="character-header">
          <h3 className="character-name">{name}</h3>
          {showFavoriteToggle && (
            <button
              type="button"
              className={`favorite-toggle ${isFavorite ? 'is-favorite' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onFavoriteToggle?.();
              }}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Personagem favorito' : 'Marcar como favorito'}
              title={isFavorite ? 'Personagem favorito' : 'Marcar como favorito'}
            >
                <StarIcon filled={isFavorite} />
            </button>
          )}
        </div>
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
