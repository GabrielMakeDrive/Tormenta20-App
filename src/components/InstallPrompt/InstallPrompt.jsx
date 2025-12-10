import React from 'react';
import Button from '../Button/Button';
import './InstallPrompt.css';

function InstallPrompt({ installAvailable, onInstall, onDismiss }) {
  return (
    <div className="install-prompt" role="status" aria-live="polite">
      <div className="install-prompt__icon" aria-hidden="true">⬇️</div>
      <div className="install-prompt__text">
        <strong>Instale o Tormenta 20 App</strong>
        <p>Tenha acesso offline, inicialização mais rápida e evite fechar acidentalmente o navegador.</p>
        {!installAvailable && (
          <span className="install-prompt__hint">
            Abra o menu do navegador e escolha "Adicionar à tela inicial" para concluir.
          </span>
        )}
      </div>
      <div className="install-prompt__actions">
        {installAvailable && (
          <Button size="small" variant="primary" onClick={onInstall}>
            Instalar
          </Button>
        )}
        <Button size="small" variant="ghost" onClick={onDismiss}>
          Agora não
        </Button>
      </div>
    </div>
  );
}

export default InstallPrompt;
