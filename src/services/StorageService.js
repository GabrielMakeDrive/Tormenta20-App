/**
 * Serviço de Armazenamento Local usando Storage API
 * Fornece persistência de dados para o app offline-first
 */
import {
  serializeCharacter,
  deserializeCharacter,
  serializeRollRecord,
  deserializeRollRecord,
} from '../models';

const STORAGE_KEYS = {
  CHARACTERS: 'tormenta20_characters',
  ROLL_HISTORY: 'tormenta20_roll_history',
  SETTINGS: 'tormenta20_settings',
};

const storageManager = (typeof navigator !== 'undefined' && navigator.storage) ? navigator.storage : null;

export const SETTINGS_UPDATE_EVENT = 't20_settings_updated';

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  return defaultValue;
};

/**
 * Salva dados no localStorage
 */
export const saveData = (key, data) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return false;
  }
};

/**
 * Carrega dados do localStorage
 */
export const loadData = (key, defaultValue = null) => {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return defaultValue;
    }
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return defaultValue;
  }
};

/**
 * Remove dados do localStorage
 */
export const removeData = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Erro ao remover dados:', error);
    return false;
  }
};

// ============ CHARACTERS ============

const serializeCharacterList = (characters = []) => characters.map((character) => serializeCharacter(character));
const deserializeCharacterList = (payload = []) =>
  (Array.isArray(payload) ? payload : []).map((character) => deserializeCharacter(character));

/**
 * Salva lista de personagens
 */
export const saveCharacters = (characters = []) => {
  return saveData(STORAGE_KEYS.CHARACTERS, serializeCharacterList(characters));
};

/**
 * Carrega lista de personagens
 */
export const loadCharacters = () => {
  const stored = loadData(STORAGE_KEYS.CHARACTERS, []);
  return deserializeCharacterList(stored || []);
};

/**
 * Salva um personagem (adiciona ou atualiza)
 */
export const saveCharacter = (character) => {
  const characters = loadCharacters();
  const index = characters.findIndex(c => c.id === character.id);
  const normalizedCharacter = deserializeCharacter({
    ...serializeCharacter(character),
    updatedAt: new Date().toISOString(),
  });

  if (index >= 0) {
    characters[index] = normalizedCharacter;
  } else {
    characters.push(normalizedCharacter);
  }

  return saveCharacters(characters);
};

/**
 * Remove um personagem pelo ID
 */
export const deleteCharacter = (characterId) => {
  const characters = loadCharacters();
  const filtered = characters.filter(c => c.id !== characterId);
  return saveCharacters(filtered);
};

/**
 * Busca um personagem pelo ID
 */
export const getCharacterById = (characterId) => {
  const characters = loadCharacters();
  return characters.find(c => c.id === characterId) || null;
};

// ============ ROLL HISTORY ============

const MAX_ROLL_HISTORY = 50;
const serializeRollList = (rolls = []) => rolls.map((roll) => serializeRollRecord(roll));
const deserializeRollList = (payload = []) =>
  (Array.isArray(payload) ? payload : []).map((roll) => deserializeRollRecord(roll));

/**
 * Salva histórico de rolagens
 */
export const saveRollHistory = (history) => {
  // Mantém apenas as últimas N rolagens
  const normalized = deserializeRollList(history);
  const trimmed = normalized.slice(-MAX_ROLL_HISTORY);
  return saveData(STORAGE_KEYS.ROLL_HISTORY, serializeRollList(trimmed));
};

/**
 * Carrega histórico de rolagens
 */
export const loadRollHistory = () => {
  const stored = loadData(STORAGE_KEYS.ROLL_HISTORY, []);
  return deserializeRollList(stored || []);
};

/**
 * Adiciona uma rolagem ao histórico
 */
export const addRollToHistory = (roll) => {
  const history = loadRollHistory();
  history.push(deserializeRollRecord(roll));
  return saveRollHistory(history);
};

/**
 * Limpa histórico de rolagens
 */
export const clearRollHistory = () => {
  return saveData(STORAGE_KEYS.ROLL_HISTORY, []);
};

// ============ SETTINGS ============

const DEFAULT_SETTINGS = {
  theme: 'dark',
  soundEnabled: true,
  vibrationEnabled: true,
  debugNotificationsEnabled: false,
};

const normalizeTheme = (value) => (value === 'light' ? 'light' : 'dark');

const normalizeSettingsShape = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return {
    ...merged,
    theme: normalizeTheme(merged.theme),
    soundEnabled: parseBoolean(merged.soundEnabled, true),
    vibrationEnabled: parseBoolean(merged.vibrationEnabled, true),
    debugNotificationsEnabled: parseBoolean(merged.debugNotificationsEnabled, false),
  };
};

const emitSettingsUpdate = (settings) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(new CustomEvent(SETTINGS_UPDATE_EVENT, { detail: settings }));
};

/**
 * Salva configurações
 */
export const saveSettings = (settings) => {
  const normalized = normalizeSettingsShape(settings);
  const saved = saveData(STORAGE_KEYS.SETTINGS, normalized);
  if (saved) {
    emitSettingsUpdate(normalized);
  }
  return saved;
};

/**
 * Carrega configurações
 */
export const loadSettings = () => {
  const stored = loadData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS) || {};
  return normalizeSettingsShape(stored);
};

// ============ STORAGE PERSISTENCE ============

/**
 * Verifica se o storage persistente está ativo
 */
export const isPersistentStorageEnabled = async () => {
  if (!storageManager || typeof storageManager.persisted !== 'function') {
    return false;
  }

  try {
    return await storageManager.persisted();
  } catch (error) {
    console.error('Erro ao verificar storage persistente:', error);
    return false;
  }
};

/**
 * Solicita storage persistente quando disponível
 */
export const ensurePersistentStorage = async () => {
  if (!storageManager) {
    return { supported: false, persisted: false };
  }

  try {
    if (await isPersistentStorageEnabled()) {
      return { supported: true, persisted: true };
    }

    if (typeof storageManager.persist === 'function') {
      const granted = await storageManager.persist();
      return { supported: true, persisted: granted };
    }

    return { supported: true, persisted: false };
  } catch (error) {
    console.error('Erro ao solicitar storage persistente:', error);
    return { supported: true, persisted: false };
  }
};

// ============ EXPORT/IMPORT ============

/**
 * Exporta todos os dados para JSON
 */
export const exportAllData = () => {
  return {
    characters: serializeCharacterList(loadCharacters()),
    rollHistory: serializeRollList(loadRollHistory()),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
    version: process.env.REACT_APP_VERSION,
  };
};

/**
 * Importa dados de um JSON
 */
export const importData = (data) => {
  try {
    if (data.characters) {
      saveCharacters(data.characters);
    }
    if (data.rollHistory) {
      saveRollHistory(data.rollHistory);
    }
    if (data.settings) {
      saveSettings(data.settings);
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    return { success: false, error: error.message };
  }
};
