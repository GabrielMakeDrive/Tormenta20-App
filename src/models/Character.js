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
 * Lista de Raças disponíveis em Tormenta 20
 */
export const RACES = [
  { id: 'humano', name: 'Humano', bonus: { any: 2 } },
  { id: 'anao', name: 'Anão', bonus: { constituicao: 2 }, penalty: { destreza: -1 } },
  { id: 'elfo', name: 'Elfo', bonus: { destreza: 2 }, penalty: { constituicao: -1 } },
  { id: 'goblin', name: 'Goblin', bonus: { destreza: 2 }, penalty: { carisma: -1 } },
  { id: 'lefou', name: 'Lefou', bonus: { inteligencia: 1, sabedoria: 1 } },
  { id: 'minotauro', name: 'Minotauro', bonus: { forca: 2 }, penalty: { sabedoria: -1 } },
  { id: 'qareen', name: 'Qareen', bonus: { carisma: 2 }, penalty: { sabedoria: -1 } },
  { id: 'golem', name: 'Golem', bonus: { forca: 2 }, penalty: { carisma: -1 } },
  { id: 'hynne', name: 'Hynne', bonus: { destreza: 1, carisma: 1 } },
  { id: 'kliren', name: 'Kliren', bonus: { inteligencia: 2 }, penalty: { forca: -1 } },
  { id: 'medusa', name: 'Medusa', bonus: { destreza: 1, carisma: 1 } },
  { id: 'osteon', name: 'Osteon', bonus: { constituicao: 1, sabedoria: 1 } },
  { id: 'sereia', name: 'Sereia/Tritão', bonus: { carisma: 2 }, penalty: { forca: -1 } },
  { id: 'trog', name: 'Trog', bonus: { constituicao: 2 }, penalty: { inteligencia: -1 } },
  { id: 'aggelus', name: 'Aggelus', bonus: { sabedoria: 2, carisma: 1 } },
  { id: 'sulfure', name: 'Sulfure', bonus: { destreza: 1, inteligencia: 2 } },
];

/**
 * Lista de Classes disponíveis em Tormenta 20 com estatísticas completas de PV/PM, perícias e proficiências.
 * hp.initial aplica-se ao 1º nível (valor base + Constituição) e hp.perLevel aos níveis subsequentes.
 */

export const CLASSES = [
  {
    id: 'arcanista',
    name: 'Arcanista',
    hitDie: 6,
    mainAttr: 'inteligencia',
    hp: { initial: 8, perLevel: 2 },
    mpPerLevel: 6,
    skillTraining: {
      mandatory: ['misticismo', 'vontade'],
      choiceGroups: [
        {
          choose: 2,
          options: [
            'conhecimento',
            'diplomacia',
            'enganacao',
            'guerra',
            'iniciativa',
            'intimidacao',
            'intuicao',
            'investigacao',
            'nobreza',
            'oficio',
            'percepcao',
          ],
        },
      ],
    },
    proficiencies: [],
  },
  {
    id: 'barbaro',
    name: 'Bárbaro',
    hitDie: 12,
    mainAttr: 'forca',
    hp: { initial: 24, perLevel: 6 },
    mpPerLevel: 3,
    skillTraining: {
      mandatory: ['fortitude', 'luta'],
      choiceGroups: [
        {
          choose: 4,
          options: [
            'adestramento',
            'atletismo',
            'cavalgar',
            'iniciativa',
            'intimidacao',
            'oficio',
            'percepcao',
            'pontaria',
            'sobrevivencia',
            'vontade',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais', 'escudos'],
  },
  {
    id: 'bardo',
    name: 'Bardo',
    hitDie: 8,
    mainAttr: 'carisma',
    hp: { initial: 12, perLevel: 3 },
    mpPerLevel: 4,
    skillTraining: {
      mandatory: ['atuacao', 'reflexos'],
      choiceGroups: [
        {
          choose: 6,
          options: [
            'acrobacia',
            'cavalgar',
            'conhecimento',
            'diplomacia',
            'enganacao',
            'furtividade',
            'iniciativa',
            'intuicao',
            'investigacao',
            'jogatina',
            'ladinagem',
            'luta',
            'misticismo',
            'nobreza',
            'percepcao',
            'pontaria',
            'vontade',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais'],
  },
  {
    id: 'bucaneiro',
    name: 'Bucaneiro',
    hitDie: 10,
    mainAttr: 'destreza',
    hp: { initial: 16, perLevel: 4 },
    mpPerLevel: 3,
    skillTraining: {
      mandatory: ['reflexos'],
      choiceGroups: [
        { choose: 1, options: ['luta', 'pontaria'] },
        {
          choose: 4,
          options: [
            'acrobacia',
            'atletismo',
            'atuacao',
            'enganacao',
            'fortitude',
            'furtividade',
            'iniciativa',
            'intimidacao',
            'jogatina',
            'luta',
            'oficio',
            'percepcao',
            'pilotagem',
            'pontaria',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais'],
  },
  {
    id: 'cacador',
    name: 'Caçador',
    hitDie: 10,
    mainAttr: 'destreza',
    hp: { initial: 16, perLevel: 4 },
    mpPerLevel: 4,
    skillTraining: {
      mandatory: ['sobrevivencia'],
      choiceGroups: [
        { choose: 1, options: ['luta', 'pontaria'] },
        {
          choose: 6,
          options: [
            'adestramento',
            'atletismo',
            'cavalgar',
            'cura',
            'fortitude',
            'furtividade',
            'iniciativa',
            'investigacao',
            'luta',
            'oficio',
            'percepcao',
            'pontaria',
            'reflexos',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais', 'escudos'],
  },
  {
    id: 'cavaleiro',
    name: 'Cavaleiro',
    hitDie: 10,
    mainAttr: 'forca',
    hp: { initial: 20, perLevel: 5 },
    mpPerLevel: 3,
    skillTraining: {
      mandatory: ['fortitude', 'luta'],
      choiceGroups: [
        {
          choose: 2,
          options: [
            'adestramento',
            'atletismo',
            'cavalgar',
            'diplomacia',
            'guerra',
            'iniciativa',
            'intimidacao',
            'nobreza',
            'percepcao',
            'vontade',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais', 'armaduras pesadas', 'escudos'],
  },
  {
    id: 'clerigo',
    name: 'Clérigo',
    hitDie: 8,
    mainAttr: 'sabedoria',
    hp: { initial: 16, perLevel: 4 },
    mpPerLevel: 5,
    skillTraining: {
      mandatory: ['religiao', 'vontade'],
      choiceGroups: [
        {
          choose: 2,
          options: [
            'conhecimento',
            'cura',
            'diplomacia',
            'fortitude',
            'iniciativa',
            'intuicao',
            'luta',
            'misticismo',
            'nobreza',
            'oficio',
            'percepcao',
          ],
        },
      ],
    },
    proficiencies: ['armaduras pesadas', 'escudos'],
  },
  {
    id: 'druida',
    name: 'Druida',
    hitDie: 8,
    mainAttr: 'sabedoria',
    hp: { initial: 16, perLevel: 4 },
    mpPerLevel: 4,
    skillTraining: {
      mandatory: ['sobrevivencia', 'vontade'],
      choiceGroups: [
        {
          choose: 4,
          options: [
            'adestramento',
            'atletismo',
            'cavalgar',
            'conhecimento',
            'cura',
            'fortitude',
            'iniciativa',
            'intuicao',
            'luta',
            'misticismo',
            'oficio',
            'percepcao',
            'religiao',
          ],
        },
      ],
    },
    proficiencies: ['escudos'],
  },
  {
    id: 'guerreiro',
    name: 'Guerreiro',
    hitDie: 10,
    mainAttr: 'forca',
    hp: { initial: 20, perLevel: 5 },
    mpPerLevel: 3,
    skillTraining: {
      mandatory: ['fortitude'],
      choiceGroups: [
        { choose: 1, options: ['luta', 'pontaria'] },
        {
          choose: 2,
          options: [
            'adestramento',
            'atletismo',
            'cavalgar',
            'guerra',
            'iniciativa',
            'intimidacao',
            'luta',
            'oficio',
            'percepcao',
            'pontaria',
            'reflexos',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais', 'armaduras pesadas', 'escudos'],
  },
  {
    id: 'inventor',
    name: 'Inventor',
    hitDie: 8,
    mainAttr: 'inteligencia',
    hp: { initial: 12, perLevel: 3 },
    mpPerLevel: 4,
    skillTraining: {
      mandatory: ['oficio', 'vontade'],
      choiceGroups: [
        {
          choose: 4,
          options: [
            'conhecimento',
            'cura',
            'diplomacia',
            'fortitude',
            'iniciativa',
            'investigacao',
            'luta',
            'misticismo',
            'oficio',
            'pilotagem',
            'percepcao',
            'pontaria',
          ],
        },
      ],
    },
    proficiencies: [],
  },
  {
    id: 'ladino',
    name: 'Ladino',
    hitDie: 8,
    mainAttr: 'destreza',
    hp: { initial: 12, perLevel: 3 },
    mpPerLevel: 4,
    skillTraining: {
      mandatory: ['ladinagem', 'reflexos'],
      choiceGroups: [
        {
          choose: 8,
          options: [
            'acrobacia',
            'atletismo',
            'atuacao',
            'cavalgar',
            'conhecimento',
            'diplomacia',
            'enganacao',
            'furtividade',
            'iniciativa',
            'intimidacao',
            'intuicao',
            'investigacao',
            'jogatina',
            'luta',
            'oficio',
            'percepcao',
            'pilotagem',
            'pontaria',
          ],
        },
      ],
    },
    proficiencies: [],
  },
  {
    id: 'lutador',
    name: 'Lutador',
    hitDie: 10,
    mainAttr: 'destreza',
    hp: { initial: 20, perLevel: 5 },
    mpPerLevel: 3,
    skillTraining: {
      mandatory: ['fortitude', 'luta'],
      choiceGroups: [
        {
          choose: 4,
          options: [
            'acrobacia',
            'adestramento',
            'atletismo',
            'enganacao',
            'furtividade',
            'iniciativa',
            'intimidacao',
            'oficio',
            'percepcao',
            'pontaria',
            'reflexos',
          ],
        },
      ],
    },
    proficiencies: [],
  },
  {
    id: 'nobre',
    name: 'Nobre',
    hitDie: 8,
    mainAttr: 'carisma',
    hp: { initial: 16, perLevel: 4 },
    mpPerLevel: 4,
    skillTraining: {
      mandatory: ['vontade'],
      choiceGroups: [
        { choose: 1, options: ['diplomacia', 'intimidacao'] },
        {
          choose: 4,
          options: [
            'adestramento',
            'atuacao',
            'cavalgar',
            'conhecimento',
            'diplomacia',
            'enganacao',
            'fortitude',
            'guerra',
            'iniciativa',
            'intimidacao',
            'intuicao',
            'investigacao',
            'jogatina',
            'luta',
            'nobreza',
            'oficio',
            'percepcao',
            'pontaria',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais', 'armaduras pesadas', 'escudos'],
  },
  {
    id: 'paladino',
    name: 'Paladino',
    hitDie: 10,
    mainAttr: 'carisma',
    hp: { initial: 20, perLevel: 5 },
    mpPerLevel: 3,
    skillTraining: {
      mandatory: ['luta', 'vontade'],
      choiceGroups: [
        {
          choose: 2,
          options: [
            'adestramento',
            'atletismo',
            'cavalgar',
            'cura',
            'diplomacia',
            'fortitude',
            'guerra',
            'iniciativa',
            'intuicao',
            'nobreza',
            'percepcao',
            'religiao',
          ],
        },
      ],
    },
    proficiencies: ['armas marciais', 'armaduras pesadas', 'escudos'],
  },
];

/**
 * Lista de Perícias
 */
export const SKILLS = [
  { id: 'acrobacia', name: 'Acrobacia', attr: 'destreza' },
  { id: 'adestramento', name: 'Adestramento', attr: 'carisma' },
  { id: 'atletismo', name: 'Atletismo', attr: 'forca' },
  { id: 'atuacao', name: 'Atuação', attr: 'carisma' },
  { id: 'cavalgar', name: 'Cavalgar', attr: 'destreza' },
  { id: 'conhecimento', name: 'Conhecimento', attr: 'inteligencia' },
  { id: 'cura', name: 'Cura', attr: 'sabedoria' },
  { id: 'diplomacia', name: 'Diplomacia', attr: 'carisma' },
  { id: 'enganacao', name: 'Enganação', attr: 'carisma' },
  { id: 'fortitude', name: 'Fortitude', attr: 'constituicao' },
  { id: 'furtividade', name: 'Furtividade', attr: 'destreza' },
  { id: 'guerra', name: 'Guerra', attr: 'inteligencia' },
  { id: 'iniciativa', name: 'Iniciativa', attr: 'destreza' },
  { id: 'intimidacao', name: 'Intimidação', attr: 'carisma' },
  { id: 'intuicao', name: 'Intuição', attr: 'sabedoria' },
  { id: 'investigacao', name: 'Investigação', attr: 'inteligencia' },
  { id: 'jogatina', name: 'Jogatina', attr: 'carisma' },
  { id: 'ladinagem', name: 'Ladinagem', attr: 'destreza' },
  { id: 'luta', name: 'Luta', attr: 'forca' },
  { id: 'misticismo', name: 'Misticismo', attr: 'inteligencia' },
  { id: 'nobreza', name: 'Nobreza', attr: 'inteligencia' },
  { id: 'oficio', name: 'Ofício', attr: 'inteligencia' },
  { id: 'percepcao', name: 'Percepção', attr: 'sabedoria' },
  { id: 'pilotagem', name: 'Pilotagem', attr: 'destreza' },
  { id: 'pontaria', name: 'Pontaria', attr: 'destreza' },
  { id: 'reflexos', name: 'Reflexos', attr: 'destreza' },
  { id: 'religiao', name: 'Religião', attr: 'sabedoria' },
  { id: 'sobrevivencia', name: 'Sobrevivência', attr: 'sabedoria' },
];

/**
 * Lista de Talentos (Poderes de Classe)
 * Estrutura: { id, name, description, prerequisites: [] }
 */
export const TALENTS = {
  cacador: [
    {
      id: 'ambidestria',
      name: 'Ambidestria',
      description: 'Se estiver empunhando duas armas (e pelo menos uma delas for leve) e fizer a ação agredir, você pode fazer dois ataques, um com cada arma. Se fizer isso, sofre –2 em todos os testes de ataque até o seu próximo turno.',
      prerequisites: ['Des 2'],
    },
    {
      id: 'armadilha_arataca',
      name: 'Armadilha: Arataca',
      description: 'A vítima sofre 2d6 pontos de dano de perfuração e fica agarrada. Uma criatura agarrada pode escapar com uma ação padrão e um teste de Força ou Acrobacia (CD Sab).',
      prerequisites: [],
    },
    {
      id: 'armadilha_espinhos',
      name: 'Armadilha: Espinhos',
      description: 'A vítima sofre 6d6 pontos de dano de perfuração. Um teste de Reflexos (CD Sab) reduz o dano à metade.',
      prerequisites: [],
    },
    {
      id: 'armadilha_laco',
      name: 'Armadilha: Laço',
      description: 'A vítima deve fazer um teste de Reflexos (CD Sab). Se passar, fica caída. Se falhar, fica agarrada. Uma criatura agarrada pode se soltar com uma ação padrão e um teste de Força ou Acrobacia (CD Sab).',
      prerequisites: [],
    },
    {
      id: 'armadilha_rede',
      name: 'Armadilha: Rede',
      description: 'Todas as criaturas na área ficam enredadas e não podem sair da área. Uma vítima pode se libertar com uma ação padrão e um teste de Força ou Acrobacia (CD 25). Além disso, a área ocupada pela rede é considerada terreno difícil. Nesta armadilha você escolhe quantas criaturas precisam estar na área para ativá-la.',
      prerequisites: [],
    },
    {
      id: 'armadilheiro',
      name: 'Armadilheiro',
      description: 'Você soma sua Sabedoria no dano e na CD de suas armadilhas (cumulativo).',
      prerequisites: ['um poder de armadilha', '5º nível de caçador'],
    },
    {
      id: 'arqueiro',
      name: 'Arqueiro',
      description: 'Se estiver usando uma arma de ataque à distância, você soma sua Sabedoria nas rolagens de dano (limitado pelo seu nível).',
      prerequisites: ['Sab 1'],
    },
    {
      id: 'aumento_atributo',
      name: 'Aumento de Atributo',
      description: 'Você recebe +1 em um atributo. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para um mesmo atributo.',
      prerequisites: [],
    },
    {
      id: 'bote',
      name: 'Bote',
      description: 'Se estiver empunhando duas armas e fizer uma investida, você pode pagar 1 PM para fazer um ataque adicional com sua arma secundária.',
      prerequisites: ['Ambidestria', '6º nível de caçador'],
    },
    {
      id: 'caminhos_natureza',
      name: 'Caminhos da Natureza',
      description: 'Você aprende e pode lançar Caminhos da Natureza (atributo-chave Sabedoria).',
      prerequisites: ['Sab 1', '3º nível de caçador'],
    },
    {
      id: 'camuflagem',
      name: 'Camuflagem',
      description: 'Você pode gastar 2 PM para se esconder mesmo sem camuflagem ou cobertura disponível.',
      prerequisites: ['6º nível de caçador'],
    },
    {
      id: 'chuva_laminas',
      name: 'Chuva de Lâminas',
      description: 'Uma vez por rodada, quando usa Ambidestria, você pode pagar 2 PM para fazer um ataque adicional com sua arma primária.',
      prerequisites: ['Des 4', 'Ambidestria', '12º nível de caçador'],
    },
    {
      id: 'companheiro_animal',
      name: 'Companheiro Animal',
      description: 'Você recebe um companheiro animal.',
      prerequisites: ['Car 1', 'treinado em Adestramento'],
    },
    {
      id: 'elo_natureza',
      name: 'Elo com a Natureza',
      description: 'Você soma sua Sabedoria em seu total de pontos de mana e aprende e pode lançar Caminhos da Natureza (atributo-chave Sabedoria).',
      prerequisites: ['Sab 1', '3º nível de caçador'],
    },
    {
      id: 'emboscar',
      name: 'Emboscar',
      description: 'Você pode gastar 2 PM para realizar uma ação padrão adicional em seu turno. Você só pode usar este poder na primeira rodada de um combate.',
      prerequisites: ['treinado em Furtividade'],
    },
    {
      id: 'empatia_selvagem',
      name: 'Empatia Selvagem',
      description: 'Você pode se comunicar com animais por meio de linguagem corporal e vocalizações. Você pode usar Adestramento com animais para mudar atitude e persuasão (veja Diplomacia).',
      prerequisites: [],
    },
    {
      id: 'escalamuca',
      name: 'Escaramuça',
      description: 'Quando se move 6m ou mais, você recebe +2 na Defesa e Reflexos e +1d8 nas rolagens de dano de ataques corpo a corpo e à distância em alcance curto até o início de seu próximo turno. Você não pode usar esta habilidade se estiver vestindo armadura pesada.',
      prerequisites: ['Des 2', '6º nível de caçador'],
    },
    {
      id: 'escalamuca_superior',
      name: 'Escaramuça Superior',
      description: 'Quando usa Escaramuça, seus bônus aumentam para +5 na Defesa e Reflexos e +1d12 em rolagens de dano.',
      prerequisites: ['Escaramuça', '12º nível de caçador'],
    },
    {
      id: 'espreitar',
      name: 'Espreitar',
      description: 'Quando usa a habilidade Marca da Presa, você recebe um bônus de +1 em testes de perícia contra a criatura marcada. Esse bônus aumenta em +1 para cada PM adicional gasto na habilidade e também dobra com a habilidade Inimigo.',
      prerequisites: [],
    },
    {
      id: 'ervas_curativas',
      name: 'Ervas Curativas',
      description: 'Você pode gastar uma ação completa e uma quantidade de PM a sua escolha (limitado por sua Sabedoria) para aplicar ervas que curam ou desintoxicam em você ou num aliado adjacente. Para cada PM que gastar, cura 2d6 PV ou remove uma condição envenenado afetando o alvo.',
      prerequisites: [],
    },
    {
      id: 'impeto',
      name: 'Ímpeto',
      description: 'Você pode gastar 1 PM para aumentar seu deslocamento em +6m por uma rodada.',
      prerequisites: [],
    },
    {
      id: 'inimigo_animal',
      name: 'Inimigo de Animal',
      description: 'Quando você usa a habilidade Marca da Presa contra uma criatura do tipo animal, dobra os dados de bônus no dano.',
      prerequisites: [],
    },
    {
      id: 'inimigo_construto',
      name: 'Inimigo de Construto',
      description: 'Quando você usa a habilidade Marca da Presa contra uma criatura do tipo construto, dobra os dados de bônus no dano.',
      prerequisites: [],
    },
    {
      id: 'inimigo_espirito',
      name: 'Inimigo de Espírito',
      description: 'Quando você usa a habilidade Marca da Presa contra uma criatura do tipo espírito, dobra os dados de bônus no dano.',
      prerequisites: [],
    },
    {
      id: 'inimigo_monstro',
      name: 'Inimigo de Monstro',
      description: 'Quando você usa a habilidade Marca da Presa contra uma criatura do tipo monstro, dobra os dados de bônus no dano.',
      prerequisites: [],
    },
    {
      id: 'inimigo_morto_vivo',
      name: 'Inimigo de Morto-Vivo',
      description: 'Quando você usa a habilidade Marca da Presa contra uma criatura do tipo morto-vivo, dobra os dados de bônus no dano.',
      prerequisites: [],
    },
    {
      id: 'olho_falcao',
      name: 'Olho do Falcão',
      description: 'Você pode usar a habilidade Marca da Presa em criaturas em alcance longo.',
      prerequisites: [],
    },
    {
      id: 'ponto_fraco',
      name: 'Ponto Fraco',
      description: 'Quando usa a habilidade Marca da Presa, seus ataques contra a criatura marcada recebem +2 na margem de ameaça. Esse bônus dobra com a habilidade Inimigo.',
      prerequisites: [],
    },
    {
      id: 'explorador_aquatico',
      name: 'Explorador (Aquático)',
      description: 'Quando estiver no tipo de terreno aquático, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_artico',
      name: 'Explorador (Ártico)',
      description: 'Quando estiver no tipo de terreno ártico, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_colina',
      name: 'Explorador (Colina)',
      description: 'Quando estiver no tipo de terreno colina, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_deserto',
      name: 'Explorador (Deserto)',
      description: 'Quando estiver no tipo de terreno deserto, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_floresta',
      name: 'Explorador (Floresta)',
      description: 'Quando estiver no tipo de terreno floresta, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_montanha',
      name: 'Explorador (Montanha)',
      description: 'Quando estiver no tipo de terreno montanha, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_pantano',
      name: 'Explorador (Pântano)',
      description: 'Quando estiver no tipo de terreno pântano, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_planicie',
      name: 'Explorador (Planície)',
      description: 'Quando estiver no tipo de terreno planície, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_subterraneo',
      name: 'Explorador (Subterrâneo)',
      description: 'Quando estiver no tipo de terreno subterrâneo, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'explorador_urbano',
      name: 'Explorador (Urbano)',
      description: 'Quando estiver no tipo de terreno urbano, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência.',
      prerequisites: [],
    },
    {
      id: 'caminho_explorador',
      name: 'Caminho do Explorador',
      description: 'Você pode atravessar terrenos difíceis sem sofrer redução em seu deslocamento e a CD para rastrear você aumenta em +10. Esta habilidade só funciona em terrenos nos quais você tenha a habilidade Explorador.',
      prerequisites: ['5º nível de caçador'],
    },
    {
      id: 'mestre_cacador',
      name: 'Mestre Caçador',
      description: 'Você pode usar a habilidade Marca da Presa como uma ação livre. Além disso, quando usa a habilidade, pode pagar 5 PM para aumentar sua margem de ameaça contra a criatura em +2. Se você reduzir uma criatura contra a qual usou Marca da Presa a 0 pontos de vida, recupera 5 PM.',
      prerequisites: ['20º nível de caçador'],
    },
  ],
  // Placeholder para outras classes
  arcanista: [],
  barbaro: [],
  bardo: [],
  bucaneiro: [],
  cavaleiro: [],
  clerigo: [],
  druida: [],
  guerreiro: [],
  inventor: [],
  ladino: [],
  lutador: [],
  nobre: [],
  paladino: [],
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
