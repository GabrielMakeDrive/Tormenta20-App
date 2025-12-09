import { v4 as uuidv4 } from 'uuid';

/**
 * Modelo de Item de Inventário para Tormenta 20
 */
export const createInventoryItem = (data = {}) => ({
  id: data.id || uuidv4(),
  name: data.name || 'Novo Item',
  description: data.description || '',
  quantity: data.quantity || 1,
  weight: data.weight || 0, // em kg
  price: data.price || 0, // em Tibares (T$)
  type: data.type || 'misc', // weapon, armor, consumable, misc
  rarity: data.rarity || 'common', // common, uncommon, rare, epic, legendary
  equipped: data.equipped || false,
  notes: data.notes || '',
});

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
export const calculateTotalWeight = (items) => {
  return items.reduce((total, item) => total + (item.weight * item.quantity), 0);
};

/**
 * Calcula valor total do inventário
 */
export const calculateTotalValue = (items) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};
