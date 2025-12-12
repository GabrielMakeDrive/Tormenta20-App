import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header, CharacterCard, Button, Toast } from '../../components';
import { loadCharacters, saveCharacters } from '../../services';
import './CharacterList.css';

const sortCharactersByFavorite = (list) => {
  return [...list].sort((a, b) => {
    if (!!a.isFavorite === !!b.isFavorite) {
      return 0;
    }
    return a.isFavorite ? -1 : 1;
  });
};

const applyFavoriteRules = (characters) => {
  if (!characters.length) {
    return { list: characters, changed: false };
  }

  let changed = false;
  const sanitized = characters.map((char) => {
    if (typeof char.isFavorite === 'boolean') {
      return char;
    }
    changed = true;
    return { ...char, isFavorite: false };
  });

  if (sanitized.length === 1) {
    const onlyChar = sanitized[0];
    if (!onlyChar.isFavorite) {
      return { list: [{ ...onlyChar, isFavorite: true }], changed: true };
    }
    return { list: sanitized, changed };
  }

  let favoriteFound = false;
  const normalized = sanitized.map((char) => {
    if (char.isFavorite) {
      if (!favoriteFound) {
        favoriteFound = true;
        return char;
      }
      changed = true;
      return { ...char, isFavorite: false };
    }
    return char;
  });

  return { list: normalized, changed };
};

function CharacterList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [characters, setCharacters] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loaded = loadCharacters();
    const { list, changed } = applyFavoriteRules(loaded);
    const sorted = sortCharactersByFavorite(list);
    if (changed) {
      saveCharacters(sorted);
    }
    setCharacters(sorted);
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
    }
  }, [location.state]);

  const handleFavoriteToggle = (id) => {
    setCharacters((prev) => {
      const updated = prev.map((char) => {
        if (char.id === id) {
          if (char.isFavorite) {
            return char;
          }
          return { ...char, isFavorite: true };
        }
        return char.isFavorite ? { ...char, isFavorite: false } : char;
      });
      const sorted = sortCharactersByFavorite(updated);
      saveCharacters(sorted);
      return sorted;
    });
  };

  const showFavoriteToggle = characters.length > 1;

  return (
    <div className="page character-list-page">
      <Header 
        title="Minhas Fichas" 
        rightAction={
          <button className="header-btn" onClick={() => navigate('/characters/new')}>
            ➕
          </button>
        }
      />
      
      <main className="page-content">
        {characters.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>Nenhum personagem</h3>
            <p>Crie seu primeiro personagem para começar sua aventura!</p>
            <Button 
              variant="primary" 
              onClick={() => navigate('/characters/new')}
            >
              ➕ Criar Personagem
            </Button>
          </div>
        ) : (
          <div className="characters-list">
            {characters.map((char) => (
              <CharacterCard 
                key={char.id}
                character={char}
                onClick={() => navigate(`/characters/${char.id}`)}
                showFavoriteToggle={showFavoriteToggle}
                onFavoriteToggle={() => handleFavoriteToggle(char.id)}
              />
            ))}
          </div>
        )}

        {characters.length > 0 && (
          <div className="fab-container">
            <Button 
              variant="primary" 
              className="fab"
              onClick={() => navigate('/characters/new')}
            >
              ➕
            </Button>
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default CharacterList;
