/**
 * InventoryItem model module normalizes item structures to keep storage and UI in sync.
 * Provides the InventoryItem class plus helpers to create, serialize and deserialize entries.
 */
import { v4 as uuidv4 } from 'uuid';

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const safePositiveNumber = (value, fallback = 0) => Math.max(0, safeNumber(value, fallback));
const safeString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
  }
  return fallback;
};

export class InventoryItem {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    const rawName = safeString(data.name, 'Novo Item').trim();
    this.name = rawName || 'Novo Item';
    this.description = safeString(data.description, '');
    this.quantity = Math.max(0, Math.round(safePositiveNumber(data.quantity, 1)));
    this.weight = safePositiveNumber(data.weight, 0);
    this.price = safePositiveNumber(data.price, 0);
    this.type = safeString(data.type, 'misc');
    this.rarity = safeString(data.rarity, 'common');
    this.equipped = normalizeBoolean(data.equipped, false);
    this.notes = safeString(data.notes, '');
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      quantity: this.quantity,
      weight: this.weight,
      price: this.price,
      type: this.type,
      rarity: this.rarity,
      equipped: this.equipped,
      notes: this.notes,
    };
  }

  static fromJSON(payload = {}) {
    return new InventoryItem(payload);
  }
}

export const createInventoryItem = (data = {}) => new InventoryItem(data);

export const serializeInventoryItem = (item) => {
  if (item instanceof InventoryItem) {
    return item.toJSON();
  }
  return new InventoryItem(item).toJSON();
};

export const deserializeInventoryItem = (payload) => InventoryItem.fromJSON(payload);

/**
 * Tipos de itens
 */
export const ITEM_TYPES = [
  { id: 'weapon', name: 'Arma', icon: '⚔️' },
  { id: 'armor', name: 'Armadura', icon: '🛡️' },
  { id: 'consumable', name: 'Consumível', icon: '🧪' },
  { id: 'tool', name: 'Ferramenta', icon: '🔧' },
  { id: 'magic', name: 'Mágico', icon: '✨' },
  { id: 'misc', name: 'Diversos', icon: '📦' },
];

/**
 * Raridades
 */
export const RARITIES = [
  { id: 'common', name: 'Comum', color: '#9e9e9e' },
  { id: 'uncommon', name: 'Incomum', color: '#4caf50' },
  { id: 'rare', name: 'Raro', color: '#2196f3' },
  { id: 'epic', name: 'Épico', color: '#9c27b0' },
  { id: 'legendary', name: 'Lendário', color: '#ff9800' },
];

/**
 * Calcula peso total do inventário
 */
export const calculateTotalWeight = (items = []) => {
  return items.reduce((total, item) => {
    const weight = safePositiveNumber(item?.weight, 0);
    const quantity = Math.max(0, safeNumber(item?.quantity, 0));
    return total + weight * quantity;
  }, 0);
};

/**
 * Calcula valor total do inventário
 */
export const calculateTotalValue = (items = []) => {
  return items.reduce((total, item) => {
    const price = safePositiveNumber(item?.price, 0);
    const quantity = Math.max(0, safeNumber(item?.quantity, 0));
    return total + price * quantity;
  }, 0);
};
