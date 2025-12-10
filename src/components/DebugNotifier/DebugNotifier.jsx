import React, { useEffect, useState } from 'react';
import Toast from '../Toast/Toast';
import { loadSettings, SETTINGS_UPDATE_EVENT } from '../../services';
import './DebugNotifier.css';

const LOG_METHODS = ['log', 'info', 'warn', 'error', 'debug'];
const QUEUE_LIMIT = 10;
const MAX_MESSAGE_LENGTH = 280;

const readDebugPreference = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const current = loadSettings();
    return current?.debugNotificationsEnabled === true;
  } catch (error) {
    return false;
  }
};

const toastTypeByLevel = {
  log: 'info',
  info: 'info',
  warn: 'warning',
  error: 'error',
  debug: 'info',
};

const formatArg = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
    return String(value);
  }
  if (value instanceof Error) {
    return value.stack || value.message || value.toString();
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return Object.prototype.toString.call(value);
  }
};

const buildMessage = (level, args) => {
  const body = args.map(formatArg).join(' ');
  const label = `[${level.toUpperCase()}] ${body}`.trim();
  if (label.length <= MAX_MESSAGE_LENGTH) {
    return label;
  }
  return `${label.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
};

const createLogEntry = (level, args) => {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

  return {
    id,
    level,
    message: buildMessage(level, args),
  };
};

function DebugNotifier() {
  const [enabled, setEnabled] = useState(readDebugPreference);
  const [queue, setQueue] = useState([]);
  const [activeLog, setActiveLog] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setEnabled(readDebugPreference());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncFromSettings = (payload) => {
      if (payload && Object.prototype.hasOwnProperty.call(payload, 'debugNotificationsEnabled')) {
        setEnabled(payload.debugNotificationsEnabled === true);
        return;
      }

      setEnabled(readDebugPreference());
    };

    const handleSettingsEvent = (event) => syncFromSettings(event?.detail);
    const handleStorageEvent = () => syncFromSettings();

    window.addEventListener(SETTINGS_UPDATE_EVENT, handleSettingsEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(SETTINGS_UPDATE_EVENT, handleSettingsEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const originals = {};
    LOG_METHODS.forEach((method) => {
      originals[method] = typeof console[method] === 'function' ? console[method] : null;
    });
    const fallback = originals.log || console.log || (() => {});

    const enqueue = (level, args) => {
      const entry = createLogEntry(level, args);
      setQueue((prev) => {
        const next = [...prev, entry];
        return next.length > QUEUE_LIMIT ? next.slice(next.length - QUEUE_LIMIT) : next;
      });
    };

    LOG_METHODS.forEach((method) => {
      const nativeFn = originals[method] || fallback;
      console[method] = (...args) => {
        try {
          nativeFn.apply(console, args);
        } catch (error) {
          // ignore logging issues
        }
        enqueue(method, args);
      };
    });

    return () => {
      LOG_METHODS.forEach((method) => {
        if (originals[method]) {
          console[method] = originals[method];
        } else {
          console[method] = originals.log || console.log || (() => {});
        }
      });
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setQueue([]);
      setActiveLog(null);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || activeLog || queue.length === 0) {
      return;
    }

    setActiveLog(queue[0]);
    setQueue((prev) => prev.slice(1));
  }, [queue, activeLog, enabled]);

  if (!enabled || !activeLog) {
    return null;
  }

  return (
    <div className="debug-notifier" aria-live="polite" aria-atomic="true">
      <Toast
        message={activeLog.message}
        type={toastTypeByLevel[activeLog.level] || 'info'}
        duration={5000}
        onClose={() => setActiveLog(null)}
      />
    </div>
  );
}

export default DebugNotifier;
