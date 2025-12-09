import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import d20Icon from '../../assets/d20.png';
import './BottomNav.css';

const navItems = [
  { path: '/', icon: '🏠', label: 'Início' },
  { path: '/characters', icon: '📋', label: 'Fichas' },
  { path: '/dice', icon: '🎲', label: 'D20', isMiddle: true },
  { path: '/dice', icon: '🎲', label: 'Dados' },
  { path: '/settings', icon: '⚙️', label: 'Config' },
];

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {navItems.map((item, index) => (
        <button
          key={index}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''} ${item.isMiddle ? 'middle' : ''}`}
          onClick={() => navigate(item.path)}
        >
          {item.isMiddle ? (
            <img src={d20Icon} alt="D20" className="nav-icon" />
          ) : (
            <span className="nav-icon">{item.icon}</span>
          )}
          {!item.isMiddle && <span className="nav-label">{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
