import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, CharacterCard, Button } from '../../components';
import { loadCharacters, deleteCharacter } from '../../services';
import './CharacterList.css';

function CharacterList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    const loaded = loadCharacters();
    setCharacters(loaded);
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Deseja realmente excluir este personagem?')) {
      deleteCharacter(id);
      setCharacters(characters.filter(c => c.id !== id));
    }
  };

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
              <div key={char.id} className="character-item">
                <CharacterCard 
                  character={char}
                  onClick={() => navigate(`/characters/${char.id}`)}
                />
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDelete(char.id, e)}
                >
                  🗑️
                </button>
              </div>
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
    </div>
  );
}

export default CharacterList;
