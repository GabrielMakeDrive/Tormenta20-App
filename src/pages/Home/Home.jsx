/*
 * Tela inicial que apresenta atalhos e contextualiza o usuário.
 * Faz leitura do storage para buscar o personagem favorito e personalizar o hero.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button } from '../../components';
import { loadCharacters } from '../../services';
import './Home.css';

const getFavoriteCharacter = (characters) => {
  if (!Array.isArray(characters) || characters.length === 0) {
    return null;
  }

  if (characters.length === 1) {
    return characters[0];
  }

  return characters.find((char) => char.isFavorite) || null;
};

function Home() {
  const navigate = useNavigate();
  const [favoriteCharacter, setFavoriteCharacter] = useState(null);

  const quickActions = [
    { icon: '📋', label: 'Criar Ficha', path: '/characters/new' },
    { icon: '🎲', label: 'Rolar Dados', path: '/dice' },
    { icon: '📚', label: 'Minhas Fichas', path: '/characters' },
  ];

  useEffect(() => {
    const characters = loadCharacters();
    setFavoriteCharacter(getFavoriteCharacter(characters));
  }, []);

  const welcomeName = favoriteCharacter?.name || 'Jogador';
  const ctaLabel = favoriteCharacter ? '👀 Ver meu Personagem' : '➕ Criar Primeiro Personagem';
  const handleCtaClick = () => {
    if (favoriteCharacter) {
      navigate(`/characters/${favoriteCharacter.id}`);
    } else {
      navigate('/characters/new');
    }
  };

  return (
    <div className="page home-page">
      <Header title="O Véu Rubro" />
      
      <main className="page-content">
        <section className="hero-section">
          <div className="hero-icon">⚔️</div>
          <h2>{`Bem-vindo ${welcomeName}`}</h2>
          <p>Gerencie suas fichas de personagem e role dados durante suas aventuras em Arton!</p>
        </section>

        <section className="quick-actions">





          
          <h3>Ações Rápidas</h3>
          <div className="actions-grid">
            {quickActions.map((action) => (
              <button 
                key={action.path}
                className="action-card"
                onClick={() => navigate(action.path)}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="info-section">
          <div className="info-card">
            <h4>💡 Dica</h4>
            <p>Seus dados são salvos localmente no dispositivo. Use a opção de exportar nas configurações para fazer backup.</p>
          </div>
        </section>

        <div className="cta-section">
          <Button 
            variant="primary" 
            size="large" 
            fullWidth
            onClick={handleCtaClick}
          >
            {ctaLabel}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default Home;
