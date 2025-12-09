/**
 * Modelo de Rolagem de Dados para Tormenta 20
 */

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
 * Cria um registro de rolagem
 */
export const createRollRecord = (data = {}) => ({
  id: Date.now().toString(),
  timestamp: new Date().toISOString(),
  diceType: data.diceType || 'd20',
  diceCount: data.diceCount || 1,
  modifier: data.modifier || 0,
  rolls: data.rolls || [],
  total: data.total || 0,
  description: data.description || '',
  rollType: data.rollType || 'normal', // normal, advantage, disadvantage
  isCriticalSuccess: data.isCriticalSuccess || false,
  isCriticalFailure: data.isCriticalFailure || false,
});

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
export const performRoll = (diceType, count = 1, modifier = 0, rollType = 'normal') => {
  const sides = DICE_TYPES.find(d => d.id === diceType)?.sides || 20;
  
  let rolls, result;
  
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
    isCriticalSuccess: interpretation.type === 'critical_success',
    isCriticalFailure: interpretation.type === 'critical_failure',
  });
};
