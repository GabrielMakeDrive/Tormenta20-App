---
applyTo: "**/models/**"
---
# Models - Instruções

## Propósito
Definição de estruturas de dados, constantes e funções utilitárias para o sistema Tormenta 20.

## Localização
`src/models/`

---

## Character.js
Modelo principal de personagem/ficha.

### createCharacter(data)
Factory function que cria um novo personagem.

```javascript
{
  id: string,           // UUID único
  name: string,         // Nome do personagem
  icon: string,         // Emoji representativo
  level: number,        // 1-20
  experience: number,   // XP acumulada
  
  race: object|null,    // Referência à raça
  characterClass: object|null, // Referência à classe
  
  attributes: {
    forca: number,
    destreza: number,
    constituicao: number,
    inteligencia: number,
    sabedoria: number,
    carisma: number
  },
  
  hp: { current, max, temp },
  mp: { current, max },
  
  defense: number,
  movement: number,     // metros
  
  skills: string[],     // IDs de perícias treinadas
  talents: array,       // Poderes/talentos
  inventory: array,     // Itens
  money: number,        // Tibares (T$)
  notes: string,        // Anotações livres
  
  createdAt: ISO string,
  updatedAt: ISO string
}
```

### getAttributeModifier(value)
Calcula o modificador de atributo.
```javascript
// Fórmula D&D/T20
modifier = Math.floor((value - 10) / 2)

// Exemplos:
// 10 → +0
// 14 → +2
// 8  → -1
// 18 → +4
```

### RACES
Array com todas as 16 raças jogáveis.
```javascript
{
  id: 'humano',
  name: 'Humano',
  bonus: { any: 2 },        // Bônus de atributo
  penalty: { ... }          // Penalidade (opcional)
}
```

### CLASSES
Array com todas as 14 classes.
```javascript
{
  id: 'guerreiro',
  name: 'Guerreiro',
  hitDie: 10,               // Dado de vida
  mainAttr: 'forca'         // Atributo principal
}
```

### SKILLS
Array com todas as 29 perícias.
```javascript
{
  id: 'furtividade',
  name: 'Furtividade',
  attr: 'destreza'          // Atributo base
}
```

---

## InventoryItem.js
Modelo de itens de inventário.

### createInventoryItem(data)
```javascript
{
  id: string,
  name: string,
  description: string,
  quantity: number,
  weight: number,       // kg
  price: number,        // T$
  type: string,         // weapon, armor, etc.
  rarity: string,       // common, rare, etc.
  equipped: boolean,
  notes: string
}
```

### ITEM_TYPES
```javascript
[
  { id: 'weapon', name: 'Arma', icon: '⚔️' },
  { id: 'armor', name: 'Armadura', icon: '🛡️' },
  { id: 'consumable', name: 'Consumível', icon: '🧪' },
  { id: 'tool', name: 'Ferramenta', icon: '🔧' },
  { id: 'magic', name: 'Mágico', icon: '✨' },
  { id: 'misc', name: 'Diversos', icon: '📦' }
]
```

### RARITIES
```javascript
[
  { id: 'common', name: 'Comum', color: '#9e9e9e' },
  { id: 'uncommon', name: 'Incomum', color: '#4caf50' },
  { id: 'rare', name: 'Raro', color: '#2196f3' },
  { id: 'epic', name: 'Épico', color: '#9c27b0' },
  { id: 'legendary', name: 'Lendário', color: '#ff9800' }
]
```

### Funções Utilitárias
```javascript
calculateTotalWeight(items)  // Soma peso × quantidade
calculateTotalValue(items)   // Soma preço × quantidade
```

---

## DiceRoll.js
Modelo de rolagem de dados.

### DICE_TYPES
```javascript
[
  { id: 'd4', sides: 4 },
  { id: 'd6', sides: 6 },
  { id: 'd8', sides: 8 },
  { id: 'd10', sides: 10 },
  { id: 'd12', sides: 12 },
  { id: 'd20', sides: 20 },
  { id: 'd100', sides: 100 }
]
```

### Funções de Rolagem
```javascript
rollDie(sides)              // Rola 1 dado
rollDice(sides, count)      // Rola N dados
rollWithAdvantage()         // 2d20, maior
rollWithDisadvantage()      // 2d20, menor
performRoll(type, count, mod, rollType)  // Rolagem completa
```

### createRollRecord(data)
```javascript
{
  id: string,
  timestamp: ISO string,
  diceType: string,
  diceCount: number,
  modifier: number,
  rolls: number[],
  total: number,
  description: string,
  rollType: string,         // normal, advantage, disadvantage
  isCriticalSuccess: boolean,
  isCriticalFailure: boolean
}
```

### interpretD20Result(naturalRoll)
```javascript
// Retorna
{ type: 'critical_success', message: 'Sucesso Crítico! 🎉' }
{ type: 'critical_failure', message: 'Falha Crítica! 💀' }
{ type: 'normal', message: '' }
```

---

## Boas Práticas

1. **Imutabilidade**: Factory functions criam novos objetos
2. **Defaults**: Todos os campos têm valores padrão
3. **UUID**: Usar uuid v4 para IDs únicos
4. **Timestamps**: Manter createdAt/updatedAt atualizados
5. **Validação**: Fazer no componente, não no model
