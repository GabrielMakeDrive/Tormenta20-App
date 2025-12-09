import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

function Header({ title, showBack = false, rightAction = null }) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button className="header-btn back-btn" onClick={() => navigate(-1)}>
            ←
          </button>
        )}
      </div>
      <h1 className="header-title">{title}</h1>
      <div className="header-right">
        {rightAction}
      </div>
    </header>
  );
}

export default Header;
