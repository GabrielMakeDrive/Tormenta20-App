---
applyTo: "**/pages/Inventory/**"
---
# Inventário - Instruções

## Propósito
Gestão completa do inventário do personagem com CRUD de itens, filtros e estatísticas.

## Localização
`src/pages/Inventory/Inventory.jsx`

## Funcionalidades

### 1. Resumo do Inventário
- **Peso total**: Soma de (peso × quantidade)
- **Valor total**: Soma de (preço × quantidade) em Tibares
- **Quantidade de itens**: Contagem total

### 2. Filtros por Tipo
- Scroll horizontal de botões
- Opções: Todos, Arma, Armadura, Consumível, Ferramenta, Mágico, Diversos
- Cada tipo com ícone temático

### 3. Lista de Itens
- Card por item com:
  - Ícone do tipo
  - Nome (cor baseada na raridade)
  - Quantidade
  - Descrição (se houver)
  - Peso e preço
- Ações inline: +, -, editar, excluir

### 4. Ajuste de Quantidade
- Botões +/- para incremento rápido
- Remove automaticamente se quantidade = 0

### 5. Modal de Adicionar/Editar
- Formulário completo:
  - Nome (obrigatório)
  - Descrição (opcional)
  - Quantidade
  - Peso (kg)
  - Preço (T$)
  - Tipo (dropdown)
  - Raridade (dropdown)
- Reutilizado para criar e editar

### 6. Tipos de Itens
| ID | Nome | Ícone |
|---|---|---|
| weapon | Arma | ⚔️ |
| armor | Armadura | 🛡️ |
| consumable | Consumível | 🧪 |
| tool | Ferramenta | 🔧 |
| magic | Mágico | ✨ |
| misc | Diversos | 📦 |

### 7. Raridades
| ID | Nome | Cor |
|---|---|---|
| common | Comum | #9e9e9e |
| uncommon | Incomum | #4caf50 |
| rare | Raro | #2196f3 |
| epic | Épico | #9c27b0 |
| legendary | Lendário | #ff9800 |

### 8. Estado Vazio
- Mensagem amigável
- Botão para adicionar primeiro item

## Componentes Utilizados
- `Header` - Com voltar e adicionar
- `Button` - Ações
- `Modal` - Formulário de item
- `Toast` - Feedback

## Serviços
- `getCharacterById()` - Carrega personagem
- `saveCharacter()` - Salva com inventário atualizado

## Models
- `createInventoryItem()` - Factory de item
- `ITEM_TYPES` - Lista de tipos
- `RARITIES` - Lista de raridades
- `calculateTotalWeight()` - Calcula peso
- `calculateTotalValue()` - Calcula valor

## Estilização
- `Inventory.css` - Grid e cards
- Cores de raridade dinâmicas
- Modal bottom-sheet

## Fluxo de Dados
```
1. Carrega personagem
2. Extrai inventory[]
3. Manipula itens
4. Salva personagem inteiro
```

## Considerações
- Persistência imediata após cada ação
- Confirmação para exclusão
- Filtros não afetam dados, só visualização
- Peso pode ser decimal (0.1 kg)
