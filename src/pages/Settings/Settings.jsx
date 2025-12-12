import React, { useState } from 'react';
import { Header, Button, Toast } from '../../components';
import { loadSettings, saveSettings, exportAllData, importData } from '../../services';
import './Settings.css';

function Settings() {
  const [settings, setSettings] = useState(loadSettings());
  const [toast, setToast] = useState(null);

  const handleSettingChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tormenta20-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ message: 'Dados exportados com sucesso!', type: 'success' });
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        const result = importData(data);
        if (result.success) {
          setToast({ message: 'Dados importados com sucesso!', type: 'success' });
          window.location.reload();
        } else {
          setToast({ message: 'Erro ao importar dados', type: 'error' });
        }
      } catch (error) {
        setToast({ message: 'Arquivo inválido', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('⚠️ ATENÇÃO: Isso apagará TODOS os seus dados (personagens, histórico, configurações). Esta ação não pode ser desfeita. Continuar?')) {
      localStorage.clear();
      setToast({ message: 'Todos os dados foram apagados', type: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="page settings-page">
      <Header title="Configurações" />
      
      <main className="page-content">
        {/* Aparência */}
        <section className="settings-section">
          <h3>Aparência</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">🌙 Tema Escuro</span>
              <span className="setting-desc">Use o tema escuro para economizar bateria</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.theme === 'dark'}
                onChange={(e) => handleSettingChange('theme', e.target.checked ? 'dark' : 'light')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Feedback */}
        <section className="settings-section">
          <h3>Feedback</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">📳 Vibração</span>
              <span className="setting-desc">Vibrar ao rolar dados</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={(e) => handleSettingChange('vibrationEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">🔊 Som</span>
              <span className="setting-desc">Tocar sons de efeito (ex: moedas)</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.soundEnabled !== false} // Padrão true
                onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Depuração */}
        <section className="settings-section">
          <h3>Depuração</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">🐞 Notificações de Debug</span>
              <span className="setting-desc">Mostra logs do console como alertas no app</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={Boolean(settings.debugNotificationsEnabled)}
                onChange={(e) => handleSettingChange('debugNotificationsEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Dados */}
        <section className="settings-section">
          <h3>Dados</h3>
          
          <div className="setting-action">
            <div className="setting-info">
              <span className="setting-label">📤 Exportar Dados</span>
              <span className="setting-desc">Baixe um backup de todos os seus dados</span>
            </div>
            <Button variant="secondary" size="small" onClick={handleExport}>
              Exportar
            </Button>
          </div>

          <div className="setting-action">
            <div className="setting-info">
              <span className="setting-label">📥 Importar Dados</span>
              <span className="setting-desc">Restaure dados de um backup</span>
            </div>
            <label className="import-btn">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <Button variant="secondary" size="small" as="span">
                Importar
              </Button>
            </label>
          </div>

          <div className="setting-action danger">
            <div className="setting-info">
              <span className="setting-label">🗑️ Limpar Dados</span>
              <span className="setting-desc">Apague todos os dados do aplicativo</span>
            </div>
            <Button variant="danger" size="small" onClick={handleClearData}>
              Limpar
            </Button>
          </div>
        </section>

        {/* Sobre */}
        <section className="settings-section">
          <h3>Sobre</h3>
          <div className="about-info">
            <p><strong>Tormenta 20 App</strong></p>
            <p>Versão {process.env.REACT_APP_VERSION}</p>
            <p className="disclaimer">
              Este aplicativo é um projeto de fã e não possui afiliação oficial com a Jambô Editora ou os criadores de Tormenta 20.
            </p>
          </div>
        </section>
      </main>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default Settings;
