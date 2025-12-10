---
applyTo: "**/models/**"
---
# Models - Instruções

## Propósito
Definição de estruturas de dados, constantes e funções utilitárias para o sistema Tormenta 20.

## Localização
`src/models/`

## Padrão de Modelos
- Cada arquivo define uma classe principal (ex.: `Character`, `InventoryItem`, `RollRecord`).
- Toda classe expõe `toJSON()` e `static fromJSON()` para normalizar escrita/leitura.
- Sempre exporte helpers triplos: `createX`, `serializeX`, `deserializeX` (X = tipo do modelo).
- Preferir funções auxiliares internas para normalizar números, textos e booleanos.
- A API externa continua utilizando objetos JavaScript simples; as classes garantem consistência dos dados.

---

## Character.js
Modelo principal de personagem/ficha implementado via classe `Character`.

### Character
- Construtor recebe `data` e normaliza tipos (atributos defaults em 10, PV=10, PM=0, etc.).
- Métodos: `toJSON()` (clona e serializa), `static fromJSON()` (recria instância).

### Helpers
- `createCharacter(data)` retorna `new Character(data)`.
- `serializeCharacter(character)` garante um objeto pronto para persistência.
- `deserializeCharacter(payload)` transforma JSON armazenado em instância.
- `calculateMaxHp(character)` e `calculateMaxMp(character)` centralizam os cálculos de PV/PM derivados (considerando nível, raça e classe).

### HP (Pontos de Vida)

- O objeto `hp` possui 3 campos:
  - `current`: PV atuais do personagem;
  - `max`: PV máximos, derivados do cálculo de classe/nível e modificador de Constituição;
  - `temp`: Pontos de Vida temporários (PV temporários). Esses pontos são concedidos por magia/efeitos e servem para absorver dano antes dos `current` — não são restaurados por recuperação normal e podem expirar ou serem reduzidos por efeitos específicos.

Recomenda-se utilizar `temp` para efeitos que concedam pontos extras temporários (escudos, magias etc.), mantendo claro ao usuário que esse valor não altera `max` e não é automaticamente restaurado.

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
Array com todas as 14 classes com estatísticas completas vindas do Tormenta Collab.
```javascript
{
  id: 'guerreiro',
  name: 'Guerreiro',
  hitDie: 10,                 // Referência informativa original do sistema
  mainAttr: 'forca',          // Atributo principal
  hp: { initial: 20, perLevel: 5 }, // Valores base somados à Constituição do personagem
  mpPerLevel: 3,              // Quantos PM a classe fornece por nível
  skillTraining: {            // Estrutura que descreve perícias obrigatórias e escolhas
    mandatory: ['fortitude'],
    choiceGroups: [
      { choose: 1, options: ['luta', 'pontaria'] },
      { choose: 2, options: [...] } // Demais seleções
    ]
  },
  proficiencies: ['armas marciais', 'armaduras pesadas', 'escudos']
}
```
> `hp.initial` se aplica ao 1º nível (PV = initial + Constituição ajustada) enquanto `hp.perLevel` define o ganho por nível adicional (perLevel + Constituição). As listas de perícias usam os IDs definidos em `SKILLS`.

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
Modelo de itens de inventário implementado via classe `InventoryItem`.

### InventoryItem
- Construtor normaliza texto, números e booleanos (quantidade mínima 0, peso/valor >= 0, etc.).
- Métodos: `toJSON()` e `static fromJSON()` análogos ao modelo de personagem.

### Helpers
- `createInventoryItem(data)` retorna instância.
- `serializeInventoryItem(item)` e `deserializeInventoryItem(payload)` padronizam escrita/leitura.
- `calculateTotalWeight(items)` e `calculateTotalValue(items)` respeitam os números normalizados.

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
Modelo de rolagem implementado via classe `RollRecord`.

### RollRecord
- Construtor normaliza número de dados, modificador, lista de rolagens e flags de crítico.
- Métodos: `toJSON()` e `static fromJSON()` para persistência do histórico.

### Helpers
- `createRollRecord(data)` cria instância.
- `serializeRollRecord(record)` / `deserializeRollRecord(payload)` padronizam armazenamento.
- Mantém `DICE_TYPES`, `rollDie`, `rollDice`, `rollWithAdvantage`, `rollWithDisadvantage`, `performRoll`, `interpretD20Result`.

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
