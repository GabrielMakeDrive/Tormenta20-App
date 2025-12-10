import React, { useState, useEffect } from 'react';
import './Toast.css';

function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, duration);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const iconClasses = {
    success: 'bi bi-check-circle',
    error: 'bi bi-x-circle',
    info: 'bi bi-info-circle',
    warning: 'bi bi-exclamation-triangle',
  };

  return (
    <div className={`toast toast-${type} ${visible ? 'visible' : ''}`}>
      <i className={`toast-icon ${iconClasses[type]}`}></i>
      <span className="toast-message">{message}</span>
    </div>
  );
}

export default Toast;
