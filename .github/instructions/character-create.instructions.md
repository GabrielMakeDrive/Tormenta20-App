---
applyTo: "**/pages/CharacterCreate/**"
---

# Criar Personagem - Instruções

## Propósito
Formulário para criação de um novo personagem com todas as informações básicas do sistema Tormenta 20.

## Localização
`src/pages/CharacterCreate/CharacterCreate.jsx`

## Funcionalidades

### 1. Seleção de Ícone
- Grid de emojis pré-definidos
- Seleção visual com destaque no escolhido
- Emojis temáticos: ⚔️, 🛡️, 🏹, 🔮, 📖, 🗡️, 🪓, 🎭, 👑, 🐉

### 2. Nome do Personagem
- Input de texto livre
- Validação: campo obrigatório
- Placeholder orientativo

### 3. Raça
- Dropdown com todas as raças de Tormenta 20
- 16 opções: Humano, Anão, Elfo, Goblin, etc.
- Dados vindos de `models/Character.js`

### 4. Classe
- Dropdown com todas as classes
- 14 opções: Arcanista, Bárbaro, Bardo, etc.
- Inclui dado de vida (hitDie) e atributo principal

### 5. Nível Inicial
- Input numérico (1-20)
- Padrão: nível 1

### 6. Atributos
- Grid 2x3 com os 6 atributos
- Controles +/- para ajuste
- Exibe modificador calculado automaticamente
- Range: 1-30
- Atributos: Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma

### 7. Cálculos Automáticos
- PV inicial = Dado de vida da classe + mod. Constituição
- Modificador = Math.floor((valor - 10) / 2)

## Componentes Utilizados
- `Header` - Com botão voltar
- `Button` - Submit do formulário
- `Toast` - Feedback de sucesso/erro

## Serviços
- `createCharacter()` - Factory function do model
- `saveCharacter()` - Persiste no localStorage

## Models
- `RACES` - Lista de raças
- `CLASSES` - Lista de classes
- `createCharacter()` - Cria objeto personagem

## Estilização
- `CharacterCreate.css` - Formulário mobile-friendly
- Inputs com tamanho adequado para toque
- Grid responsivo para atributos

## Validações
- Nome obrigatório
- Atributos entre 1-30
- Nível entre 1-20

## Fluxo de Navegação
```
CharacterCreate
├── ← Voltar (histórico)
└── → /characters/:id (após criar)
```

## Considerações
- Feedback visual imediato nas interações
- Toast de sucesso antes de navegar
- Auto-save não implementado (salva apenas no submit)
