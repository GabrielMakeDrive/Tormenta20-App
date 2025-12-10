/**
 * Character data model module centralizes the canonical structures for Tormenta 20.
 * It exposes the createCharacter factory used by UI forms and the reference datasets
 * (RACES, CLASSES, SKILLS) that drive dropdowns, calculations and validations across the app.
 * Data flows from UI → services → StorageService using the shapes described here.
 * 
 * IMPORTANTE - Sistema de Atributos em Tormenta 20:
 * Em Tormenta 20, NÃO existe o conceito de "modificador" de atributo.
 * O valor do atributo é usado DIRETAMENTE nos testes e cálculos.
 * Exemplo: Se Força = 3, você adiciona +3 nos testes de Força.
 * Os valores de atributos são tipicamente entre -5 e +5, sendo 0 o padrão.
 */
import { v4 as uuidv4 } from 'uuid';
import {RACES, CLASSES, SKILLS, TALENTS} from './T20Data.js';
export * from './T20Data.js';

const DEFAULT_ATTRIBUTE_SCORE = 0;
/**
 * Pontos de Vida (HP) — Estrutura padrão para representar PVs do personagem.
 * - current: PV atuais do personagem
 * - max: PV máximos (derivados de classe/nível/constituição)
 * - temp: PV temporários — concedidos por magias/effects e servem para absorver dano
 *   antes de reduzir os PVs 'current'. Não são curados por efeitos normais e podem
 *   expirar ou ser reduzidos por efeitos de jogo. Mantém-se como um número positivo
 *   (default 0).
 */
const DEFAULT_HP = { current: 10, max: 10, temp: 0 };
const DEFAULT_MP = { current: 0, max: 0 };
const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const safePositiveNumber = (value, fallback = 0) => Math.max(0, safeNumber(value, fallback));
const safeLevel = (value) => Math.max(1, safeNumber(value, 1));
const getRaceIdValue = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value || null;
  }
  if (typeof value === 'object' && typeof value.id === 'string') {
    return value.id;
  }
  return null;
};
const findRaceDefinition = (raceId) => {
  if (!raceId) {
    return null;
  }
  return RACES.find((race) => race.id === raceId) || null;
};
const resolveRaceDefinition = (source) => {
  if (!source) {
    return null;
  }
  if (typeof source === 'object' && 'race' in source) {
    return resolveRaceDefinition(source.race);
  }
  const raceId = getRaceIdValue(source);
  if (raceId) {
    const resolved = findRaceDefinition(raceId);
    if (resolved) {
      return resolved;
    }
  }
  if (typeof source === 'object') {
    return source;
  }
  return null;
};
const getRaceAttributeAdjustment = (entityOrRace, attrKey) => {
  const race = resolveRaceDefinition(entityOrRace);
  if (!race) {
    return 0;
  }
  const bonus = safeNumber(race.bonus?.[attrKey], 0);
  const penalty = safeNumber(race.penalty?.[attrKey], 0);
  return bonus + penalty;
};
/**
 * Obtém o valor total de um atributo (base + ajuste racial).
 * Em Tormenta 20, este valor é usado DIRETAMENTE nos testes,
 * não existe conversão para "modificador".
 */
const getTotalAttributeValue = (entity, attrKey) => {
  const base = safeNumber(entity?.attributes?.[attrKey], DEFAULT_ATTRIBUTE_SCORE);
  return base + getRaceAttributeAdjustment(entity, attrKey);
};
const normalizeAttributes = (attributes = {}) => ({
  forca: safeNumber(attributes.forca, DEFAULT_ATTRIBUTE_SCORE),
  destreza: safeNumber(attributes.destreza, DEFAULT_ATTRIBUTE_SCORE),
  constituicao: safeNumber(attributes.constituicao, DEFAULT_ATTRIBUTE_SCORE),
  inteligencia: safeNumber(attributes.inteligencia, DEFAULT_ATTRIBUTE_SCORE),
  sabedoria: safeNumber(attributes.sabedoria, DEFAULT_ATTRIBUTE_SCORE),
  carisma: safeNumber(attributes.carisma, DEFAULT_ATTRIBUTE_SCORE),
});
const normalizeHp = (hp = {}) => ({
  current: safePositiveNumber(hp.current, DEFAULT_HP.current),
  max: safePositiveNumber(hp.max, DEFAULT_HP.max),
  temp: safePositiveNumber(hp.temp, DEFAULT_HP.temp),
});
const normalizeMp = (mp = {}) => ({
  current: safePositiveNumber(mp.current, DEFAULT_MP.current),
  max: safePositiveNumber(mp.max, DEFAULT_MP.max),
});
const normalizeStringArray = (value = []) => (Array.isArray(value) ? value.map((item) => String(item)) : []);
const cloneArray = (value = []) => (Array.isArray(value) ? [...value] : []);
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

const getCharacterClassIdValue = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value || null;
  }
  if (typeof value === 'object' && typeof value.id === 'string') {
    return value.id;
  }
  return null;
};

const findClassDefinition = (classId) => {
  if (!classId) {
    return null;
  }
  return CLASSES.find((cls) => cls.id === classId) || null;
};

const resolveCharacterClass = (entity) => {
  if (!entity) {
    return null;
  }
  const rawClass = entity.characterClass;
  const resolvedById = findClassDefinition(getCharacterClassIdValue(rawClass));
  if (resolvedById) {
    return resolvedById;
  }
  if (rawClass && typeof rawClass === 'object') {
    return rawClass;
  }
  return null;
};

/**
 * Calcula os PV máximos do personagem.
 * Em Tormenta 20, o valor de Constituição é somado DIRETAMENTE aos PVs.
 */
const computeMaxHp = (entity) => {
  const characterClass = resolveCharacterClass(entity);
  if (!characterClass?.hp) {
    if (characterClass?.hitDie) {
      const constitutionValue = getTotalAttributeValue(entity, 'constituicao');
      return Math.max(1, characterClass.hitDie + constitutionValue);
    }
    return DEFAULT_HP.max;
  }
  const constitutionValue = getTotalAttributeValue(entity, 'constituicao');
  const level = safeLevel(entity?.level);
  const base = characterClass.hp.initial + constitutionValue;
  if (level <= 1) {
    return Math.max(1, base);
  }
  const perLevelGain = characterClass.hp.perLevel + constitutionValue;
  return Math.max(1, base + (level - 1) * perLevelGain);
};

const computeMaxMp = (entity) => {
  const characterClass = resolveCharacterClass(entity);
  const mpPerLevel = characterClass?.mpPerLevel;
  if (!mpPerLevel) {
    return DEFAULT_MP.max;
  }
  const level = safeLevel(entity?.level);
  return Math.max(0, mpPerLevel * level);
};

/**
 * Tabela oficial de progressão de nível com experiência mínima e bônus em perícias
 * (primeiro valor para perícias treinadas, segundo para não treinadas). O texto
 * de Tormenta 20 define o bônus como metade do nível, arredondado para baixo,
 * sendo que perícias treinadas recebem o valor da coluna anterior à barra e as
 * não treinadas o valor após a barra.
 */
export const LEVEL_PROGRESSION = [
  { level: 1, experience: 0, skillBonus: { trained: 2, untrained: 0 } },
  { level: 2, experience: 1000, skillBonus: { trained: 3, untrained: 1 } },
  { level: 3, experience: 3000, skillBonus: { trained: 3, untrained: 1 } },
  { level: 4, experience: 6000, skillBonus: { trained: 4, untrained: 2 } },
  { level: 5, experience: 10000, skillBonus: { trained: 4, untrained: 2 } },
  { level: 6, experience: 15000, skillBonus: { trained: 5, untrained: 3 } },
  { level: 7, experience: 21000, skillBonus: { trained: 7, untrained: 3 } },
  { level: 8, experience: 28000, skillBonus: { trained: 8, untrained: 4 } },
  { level: 9, experience: 36000, skillBonus: { trained: 8, untrained: 4 } },
  { level: 10, experience: 45000, skillBonus: { trained: 9, untrained: 5 } },
  { level: 11, experience: 55000, skillBonus: { trained: 9, untrained: 5 } },
  { level: 12, experience: 66000, skillBonus: { trained: 10, untrained: 6 } },
  { level: 13, experience: 78000, skillBonus: { trained: 10, untrained: 6 } },
  { level: 14, experience: 91000, skillBonus: { trained: 11, untrained: 7 } },
  { level: 15, experience: 105000, skillBonus: { trained: 13, untrained: 7 } },
  { level: 16, experience: 120000, skillBonus: { trained: 14, untrained: 8 } },
  { level: 17, experience: 136000, skillBonus: { trained: 14, untrained: 8 } },
  { level: 18, experience: 153000, skillBonus: { trained: 15, untrained: 9 } },
  { level: 19, experience: 171000, skillBonus: { trained: 15, untrained: 9 } },
  { level: 20, experience: 190000, skillBonus: { trained: 16, untrained: 10 } },
];

export class Character {
  constructor(data = {}) {
    const timestamp = new Date().toISOString();
    this.id = data.id || uuidv4();
    this.name = data.name?.trim() || 'Novo Personagem';
    this.icon = data.icon || '⚔️';
    this.level = safeLevel(data.level);
    this.experience = safePositiveNumber(data.experience, 0);
    this.race = getRaceIdValue(data.race);
    this.characterClass = getCharacterClassIdValue(data.characterClass);
    this.attributes = normalizeAttributes(data.attributes);
    this.hp = normalizeHp(data.hp);
    this.mp = normalizeMp(data.mp);
    this.defense = safeNumber(data.defense, 10);
    this.movement = safePositiveNumber(data.movement, 9);
    this.skills = normalizeStringArray(data.skills);
    this.talents = cloneArray(data.talents);
    this.inventory = cloneArray(data.inventory);
    this.money = safePositiveNumber(data.money, 0);
    this.notes = typeof data.notes === 'string' ? data.notes : '';
    this.isFavorite = normalizeBoolean(data.isFavorite, false);
    this.createdAt = data.createdAt || timestamp;
    this.updatedAt = data.updatedAt || timestamp;

    const derivedMaxHp = computeMaxHp(this);
    const derivedMaxMp = computeMaxMp(this);
    this.hp.max = derivedMaxHp;
    this.hp.current = Math.min(this.hp.current, derivedMaxHp);
    this.mp.max = derivedMaxMp;
    this.mp.current = Math.min(this.mp.current, derivedMaxMp);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      level: this.level,
      experience: this.experience,
      race: this.race,
      characterClass: this.characterClass,
      attributes: { ...this.attributes },
      hp: { ...this.hp },
      mp: { ...this.mp },
      defense: this.defense,
      movement: this.movement,
      skills: [...this.skills],
      talents: [...this.talents],
      inventory: [...this.inventory],
      money: this.money,
      notes: this.notes,
      isFavorite: this.isFavorite,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromJSON(payload = {}) {
    return new Character(payload);
  }
}

/**
 * Modelo de Personagem (Ficha) para Tormenta 20
 */
export const createCharacter = (data = {}) => new Character(data);

export const serializeCharacter = (character) => {
  if (character instanceof Character) {
    return character.toJSON();
  }
  return new Character(character).toJSON();
};

export const deserializeCharacter = (payload) => Character.fromJSON(payload);

export const calculateMaxHp = (characterLike) => computeMaxHp(characterLike);

export const calculateMaxMp = (characterLike) => computeMaxMp(characterLike);

export const getRaceDefinition = (characterLike) => resolveRaceDefinition(characterLike);

export const getRaceDefinitionById = (raceId) => findRaceDefinition(raceId);

export const getCharacterClassDefinition = (characterLike) => resolveCharacterClass(characterLike);

export const getClassDefinitionById = (classId) => findClassDefinition(classId);

/**
 * Obtém o ajuste racial para um atributo específico.
 * Retorna o valor numérico que deve ser somado ao atributo base.
 */
export const getCharacterRaceAttributeAdjustment = (characterLike, attrKey) => {
  return getRaceAttributeAdjustment(characterLike, attrKey);
};

/**
 * Obtém o valor total de um atributo (base + ajuste racial).
 * IMPORTANTE: Em Tormenta 20, este valor é usado DIRETAMENTE nos testes.
 * Não há conversão para "modificador". Se o atributo total for 3, você adiciona +3 nos testes.
 */
export const getCharacterTotalAttributeValue = (characterLike, attrKey) => {
  return getTotalAttributeValue(characterLike, attrKey);
};

/**
 * Helpers para Talentos
 */
export const getTalentsForClass = (classId) => {
  return TALENTS[classId] || [];
};

export const getTalentById = (classId, talentId) => {
  const classTalents = getTalentsForClass(classId);
  return classTalents.find(t => t.id === talentId) || null;
};
