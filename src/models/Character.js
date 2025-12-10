/**
 * Character data model module centralizes the canonical structures for Tormenta 20.
 * It exposes the createCharacter factory used by UI forms and the reference datasets
 * (RACES, CLASSES, SKILLS) that drive dropdowns, calculations and validations across the app.
 * Data flows from UI → services → StorageService using the shapes described here.
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Modelo de Personagem (Ficha) para Tormenta 20
 */
export const createCharacter = (data = {}) => ({
  id: data.id || uuidv4(),
  name: data.name || 'Novo Personagem',
  icon: data.icon || '⚔️',
  level: data.level || 1,
  experience: data.experience || 0,
  
  // Raça e Classe
  race: data.race || null,
  characterClass: data.characterClass || null,
  
  // Atributos base (antes de modificadores)
  attributes: {
    forca: data.attributes?.forca ?? 0,
    destreza: data.attributes?.destreza ?? 0,
    constituicao: data.attributes?.constituicao ?? 0,
    inteligencia: data.attributes?.inteligencia ?? 0,
    sabedoria: data.attributes?.sabedoria ?? 0,
    carisma: data.attributes?.carisma ?? 0,
  },
  
  // Pontos de Vida e Mana
  hp: {
    current: data.hp?.current || 10,
    max: data.hp?.max || 10,
    temp: data.hp?.temp || 0,
  },
  mp: {
    current: data.mp?.current || 0,
    max: data.mp?.max || 0,
  },
  
  // Defesa e Movimento
  defense: data.defense || 10,
  movement: data.movement || 9, // metros
  
  // Perícias treinadas (array de strings)
  skills: data.skills || [],
  
  // Talentos/Poderes
  talents: data.talents || [],
  
  // Inventário
  inventory: data.inventory || [],
  
  // Dinheiro (Tibares)
  money: data.money || 0,
  
  // Anotações livres
  notes: data.notes || '',

  // Favorito
  isFavorite: data.isFavorite ?? false,
  
  // Metadados
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: data.updatedAt || new Date().toISOString(),
});

/**
 * Calcula modificador de atributo
 */
export const getAttributeModifier = (value) => {
  const normalized = Number(value);
  if (Number.isNaN(normalized)) {
    return 0;
  }
  return normalized;
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
  { id: 'vontade', name: 'Vontade', attr: 'sabedoria' },
];
