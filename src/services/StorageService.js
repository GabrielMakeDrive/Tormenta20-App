/**
 * Serviço de Armazenamento Local usando Storage API
 * Fornece persistência de dados para o app offline-first
 */

const STORAGE_KEYS = {
  CHARACTERS: 'tormenta20_characters',
  ROLL_HISTORY: 'tormenta20_roll_history',
  SETTINGS: 'tormenta20_settings',
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

/**
 * Salva lista de personagens
 */
export const saveCharacters = (characters) => {
  return saveData(STORAGE_KEYS.CHARACTERS, characters);
};

/**
 * Carrega lista de personagens
 */
export const loadCharacters = () => {
  return loadData(STORAGE_KEYS.CHARACTERS, []);
};

/**
 * Salva um personagem (adiciona ou atualiza)
 */
export const saveCharacter = (character) => {
  const characters = loadCharacters();
  const index = characters.findIndex(c => c.id === character.id);
  
  const updatedCharacter = {
    ...character,
    updatedAt: new Date().toISOString(),
  };
  
  if (index >= 0) {
    characters[index] = updatedCharacter;
  } else {
    characters.push(updatedCharacter);
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

/**
 * Salva histórico de rolagens
 */
export const saveRollHistory = (history) => {
  // Mantém apenas as últimas N rolagens
  const trimmed = history.slice(-MAX_ROLL_HISTORY);
  return saveData(STORAGE_KEYS.ROLL_HISTORY, trimmed);
};

/**
 * Carrega histórico de rolagens
 */
export const loadRollHistory = () => {
  return loadData(STORAGE_KEYS.ROLL_HISTORY, []);
};

/**
 * Adiciona uma rolagem ao histórico
 */
export const addRollToHistory = (roll) => {
  const history = loadRollHistory();
  history.push(roll);
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
};

/**
 * Salva configurações
 */
export const saveSettings = (settings) => {
  return saveData(STORAGE_KEYS.SETTINGS, settings);
};

/**
 * Carrega configurações
 */
export const loadSettings = () => {
  return loadData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
};

// ============ EXPORT/IMPORT ============

/**
 * Exporta todos os dados para JSON
 */
export const exportAllData = () => {
  return {
    characters: loadCharacters(),
    rollHistory: loadRollHistory(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
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
