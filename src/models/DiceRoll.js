/**
 * Dice roll model module consolidates dice helpers and the RollRecord class used across the app.
 * Responsible for generating, serializing and deserializing roll history entries with consistent shape.
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Tipos de dados disponíveis
 */
export const DICE_TYPES = [
  { id: 'd4', sides: 4, icon: '🎲' },
  { id: 'd6', sides: 6, icon: '🎲' },
  { id: 'd8', sides: 8, icon: '🎲' },
  { id: 'd10', sides: 10, icon: '🎲' },
  { id: 'd12', sides: 12, icon: '🎲' },
  { id: 'd20', sides: 20, icon: '🎯' },
  { id: 'd100', sides: 100, icon: '💯' },
];

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const allowedRollTypes = new Set(['normal', 'advantage', 'disadvantage']);
const normalizeRollType = (value) => (allowedRollTypes.has(value) ? value : 'normal');

export class RollRecord {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.timestamp = data.timestamp || new Date().toISOString();
    this.diceType = data.diceType || 'd20';
    this.diceCount = Math.max(1, safeNumber(data.diceCount, 1));
    this.modifier = safeNumber(data.modifier, 0);
    this.rolls = Array.isArray(data.rolls) ? data.rolls.map((roll) => safeNumber(roll, 0)) : [];
    this.total = safeNumber(data.total, 0);
    this.description = typeof data.description === 'string' ? data.description : '';
    this.rollType = normalizeRollType(data.rollType);
    this.isCriticalSuccess = Boolean(data.isCriticalSuccess);
    this.isCriticalFailure = Boolean(data.isCriticalFailure);
    // Campos opcionais para identificação do jogador em sessões de campanha
    this.playerId = data.playerId || null;
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      diceType: this.diceType,
      diceCount: this.diceCount,
      modifier: this.modifier,
      rolls: [...this.rolls],
      total: this.total,
      description: this.description,
      rollType: this.rollType,
      isCriticalSuccess: this.isCriticalSuccess,
      isCriticalFailure: this.isCriticalFailure,
      playerId: this.playerId,
    };
  }

  static fromJSON(payload = {}) {
    return new RollRecord(payload);
  }
}

export const createRollRecord = (data = {}) => new RollRecord(data);

export const serializeRollRecord = (record) => {
  if (record instanceof RollRecord) {
    return record.toJSON();
  }
  return new RollRecord(record).toJSON();
};

export const deserializeRollRecord = (payload) => RollRecord.fromJSON(payload);

/**
 * Rola um dado
 */
export const rollDie = (sides) => {
  return Math.floor(Math.random() * sides) + 1;
};

/**
 * Rola múltiplos dados
 */
export const rollDice = (sides, count = 1) => {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides));
  }
  return results;
};

/**
 * Rola com vantagem (2d20, pega o maior)
 */
export const rollWithAdvantage = () => {
  const rolls = rollDice(20, 2);
  return {
    rolls,
    result: Math.max(...rolls),
    type: 'advantage',
  };
};

/**
 * Rola com desvantagem (2d20, pega o menor)
 */
export const rollWithDisadvantage = () => {
  const rolls = rollDice(20, 2);
  return {
    rolls,
    result: Math.min(...rolls),
    type: 'disadvantage',
  };
};

/**
 * Interpreta resultado de d20
 */
export const interpretD20Result = (naturalRoll) => {
  if (naturalRoll === 20) {
    return { type: 'critical_success', message: 'Sucesso Crítico! 🎉' };
  }
  if (naturalRoll === 1) {
    return { type: 'critical_failure', message: 'Falha Crítica! 💀' };
  }
  return { type: 'normal', message: '' };
};

/**
 * Realiza uma rolagem completa
 */
export const performRoll = (diceType, count = 1, modifier = 0, rollType = 'normal', description = '') => {
  const sides = DICE_TYPES.find(d => d.id === diceType)?.sides || 20;
  let rolls;
  let result;

  if (rollType === 'advantage') {
    const advRoll = rollWithAdvantage();
    rolls = advRoll.rolls;
    result = advRoll.result;
  } else if (rollType === 'disadvantage') {
    const disRoll = rollWithDisadvantage();
    rolls = disRoll.rolls;
    result = disRoll.result;
  } else {
    rolls = rollDice(sides, count);
    result = rolls.reduce((sum, r) => sum + r, 0);
  }

  const total = result + modifier;
  const interpretation = diceType === 'd20' ? interpretD20Result(rolls[0]) : { type: 'normal', message: '' };

  return createRollRecord({
    diceType,
    diceCount: count,
    modifier,
    rolls,
    total,
    rollType,
    description,
    isCriticalSuccess: interpretation.type === 'critical_success',
    isCriticalFailure: interpretation.type === 'critical_failure',
  });
};
