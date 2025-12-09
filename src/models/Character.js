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
    forca: data.attributes?.forca || 10,
    destreza: data.attributes?.destreza || 10,
    constituicao: data.attributes?.constituicao || 10,
    inteligencia: data.attributes?.inteligencia || 10,
    sabedoria: data.attributes?.sabedoria || 10,
    carisma: data.attributes?.carisma || 10,
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
  
  // Metadados
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: data.updatedAt || new Date().toISOString(),
});

/**
 * Calcula modificador de atributo
 */
export const getAttributeModifier = (value) => {
  return Math.floor((value - 10) / 2);
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
 * Lista de Classes disponíveis em Tormenta 20
 */
export const CLASSES = [
  { id: 'arcanista', name: 'Arcanista', hitDie: 6, mainAttr: 'inteligencia' },
  { id: 'barbaro', name: 'Bárbaro', hitDie: 12, mainAttr: 'forca' },
  { id: 'bardo', name: 'Bardo', hitDie: 8, mainAttr: 'carisma' },
  { id: 'bucaneiro', name: 'Bucaneiro', hitDie: 10, mainAttr: 'destreza' },
  { id: 'cacador', name: 'Caçador', hitDie: 10, mainAttr: 'destreza' },
  { id: 'cavaleiro', name: 'Cavaleiro', hitDie: 10, mainAttr: 'forca' },
  { id: 'clerigo', name: 'Clérigo', hitDie: 8, mainAttr: 'sabedoria' },
  { id: 'druida', name: 'Druida', hitDie: 8, mainAttr: 'sabedoria' },
  { id: 'guerreiro', name: 'Guerreiro', hitDie: 10, mainAttr: 'forca' },
  { id: 'inventor', name: 'Inventor', hitDie: 8, mainAttr: 'inteligencia' },
  { id: 'ladino', name: 'Ladino', hitDie: 8, mainAttr: 'destreza' },
  { id: 'lutador', name: 'Lutador', hitDie: 10, mainAttr: 'destreza' },
  { id: 'nobre', name: 'Nobre', hitDie: 8, mainAttr: 'carisma' },
  { id: 'paladino', name: 'Paladino', hitDie: 10, mainAttr: 'carisma' },
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
