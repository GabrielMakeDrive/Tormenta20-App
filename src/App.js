import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BottomNav, DebugNotifier, InstallPrompt, Toast } from './components';
import { 
  Home, 
  CharacterList, 
  CharacterCreate, 
  CharacterDetail, 
  DiceRoller, 
  Inventory, 
  Settings 
} from './pages';
import { ensurePersistentStorage } from './services';
import './styles/global.css';

const INSTALL_PROMPT_DISMISSED_KEY = 'tormenta20_install_prompt_dismissed';
const STORAGE_WARNING_DISMISSED_KEY = 'tormenta20_storage_warning_dismissed';

const isStandaloneMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const matchMediaAvailable = typeof window.matchMedia === 'function';
  const displayModeStandalone = matchMediaAvailable
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const navigatorStandalone = typeof window.navigator !== 'undefined' && window.navigator.standalone;

  return Boolean(displayModeStandalone || navigatorStandalone);
};

const hasDismissedInstallPrompt = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

const markInstallPromptDismissed = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
  } catch (error) {
    // ignore storage issues
  }
};

const hasDismissedStorageWarning = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return window.localStorage.getItem(STORAGE_WARNING_DISMISSED_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

const markStorageWarningDismissed = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(STORAGE_WARNING_DISMISSED_KEY, 'true');
  } catch (error) {
    // ignore storage issues
  }
};

function App() {
  const [storageWarning, setStorageWarning] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  useEffect(() => {
    // Log da versão na inicialização
    console.log('Tormenta 20 App v' + process.env.REACT_APP_VERSION);

    // Solicita storage persistente logo na inicialização
    ensurePersistentStorage()
      .then(({ supported, persisted }) => {
        const alreadyDismissed = hasDismissedStorageWarning();

        if (!supported) {
          console.info('Storage persistente não suportado neste navegador.');
          if (!alreadyDismissed) {
            setStorageWarning({ message: 'Storage persistente não suportado neste navegador.' });
          }
        } else if (!persisted) {
          const warningMsg = 'Não foi possível garantir storage persistente. Dados podem ser limpos pelo navegador.';
          console.warn(warningMsg);
          if (!alreadyDismissed) {
            setStorageWarning({ message: warningMsg });
          }
        }
      })
      .catch((error) => {
        console.error('Erro ao configurar storage persistente:', error);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (isStandaloneMode() || hasDismissedInstallPrompt()) {
      return undefined;
    }

    setShowInstallPrompt(true);

    const handleBeforeInstallPrompt = (event) => {
      // Prevent the default mini-infobar from appearing and keep the event so we can show it later
      event.preventDefault();
      // Keep the event in state and globals so other parts of the app can trigger it (e.g., Settings)
      setInstallPromptEvent(event);
      window.tormentaBeforeInstallPrompt = event;
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      markInstallPromptDismissed();
      setShowInstallPrompt(false);
      setInstallPromptEvent(null);
      if (window && window.tormentaBeforeInstallPrompt) {
        window.tormentaBeforeInstallPrompt = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Expose a small global helper so other screens (like Settings) can trigger the install prompt
    // Returns true if a prompt was shown, false otherwise
    // This effect re-runs when `installPromptEvent` changes to keep helper in sync
    const attachGlobalInstallHelpers = () => {
      try {
        window.tormentaPromptInstall = () => {
          try {
            const e = installPromptEvent || window.tormentaBeforeInstallPrompt;
            if (!e) return false;
            e.prompt();
            const choiceResult = e.userChoice;
            if (choiceResult && typeof choiceResult.then === 'function') {
              choiceResult
                .then((choice) => {
                  if (choice?.outcome === 'accepted') {
                    markInstallPromptDismissed();
                    setShowInstallPrompt(false);
                  }
                })
                .finally(() => {
                  setInstallPromptEvent(null);
                  if (window && window.tormentaBeforeInstallPrompt) {
                    window.tormentaBeforeInstallPrompt = null;
                  }
                });
            } else {
              setInstallPromptEvent(null);
              if (window && window.tormentaBeforeInstallPrompt) {
                window.tormentaBeforeInstallPrompt = null;
              }
            }
            return true;
          } catch (err) {
            console.error('Erro ao exibir prompt de instalação (global):', err);
            return false;
          }
        };

        window.tormentaHasInstallEvent = () => Boolean(installPromptEvent || window.tormentaBeforeInstallPrompt);
      } catch (err) {
        // ignore
      }
    };

    attachGlobalInstallHelpers();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        if (window) {
          delete window.tormentaPromptInstall;
          delete window.tormentaHasInstallEvent;
          delete window.tormentaBeforeInstallPrompt;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPromptEvent) {
      return;
    }

    try {
      installPromptEvent.prompt();
      const choiceResult = installPromptEvent.userChoice;
      if (choiceResult && typeof choiceResult.then === 'function') {
        choiceResult
          .then((choice) => {
            if (choice?.outcome === 'accepted') {
              markInstallPromptDismissed();
              setShowInstallPrompt(false);
            }
          })
          .finally(() => setInstallPromptEvent(null));
      } else {
        setInstallPromptEvent(null);
      }
    } catch (error) {
      console.error('Erro ao exibir prompt de instalação:', error);
    }
  };

  const handleInstallDismiss = () => {
    markInstallPromptDismissed();
    setShowInstallPrompt(false);
  };

  const handleStorageWarningClose = () => {
    markStorageWarningDismissed();
    setStorageWarning(null);
  };

  return (
    <Router basename="/Tormenta20-App">
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/characters" element={<CharacterList />} />
          <Route path="/characters/new" element={<CharacterCreate />} />
          <Route path="/characters/:id/edit" element={<CharacterCreate mode="edit" />} />
          <Route path="/characters/:id" element={<CharacterDetail />} />
          <Route path="/characters/:id/inventory" element={<Inventory />} />
          <Route path="/dice" element={<DiceRoller />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        {showInstallPrompt && (
          <InstallPrompt
            installAvailable={Boolean(installPromptEvent)}
            onInstall={handleInstallClick}
            onDismiss={handleInstallDismiss}
          />
        )}
        <BottomNav />
        <DebugNotifier />
        {storageWarning && (
          <Toast
            message={storageWarning.message}
            type="warning"
            duration={5000}
            onClose={handleStorageWarningClose}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
