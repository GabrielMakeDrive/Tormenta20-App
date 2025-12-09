import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Button } from '../../components';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  const quickActions = [
    { icon: '📋', label: 'Criar Ficha', path: '/characters/new' },
    { icon: '🎲', label: 'Rolar Dados', path: '/dice' },
    { icon: '📚', label: 'Minhas Fichas', path: '/characters' },
  ];

  return (
    <div className="page home-page">
      <Header title="Tormenta 20" />
      
      <main className="page-content">
        <section className="hero-section">
          <div className="hero-icon">⚔️</div>
          <h2>Bem-vindo ao Tormenta 20</h2>
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
            onClick={() => navigate('/characters/new')}
          >
            ➕ Criar Primeiro Personagem
          </Button>
        </div>
      </main>
    </div>
  );
}

export default Home;
