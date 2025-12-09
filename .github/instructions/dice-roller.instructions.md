# Rolador de Dados - Instruções
---
applyTo: "**/pages/DiceRoller/**"
---

## Propósito
Ferramenta para rolagem de dados durante o jogo, com suporte a todos os tipos de dados do sistema e modificadores.

## Localização
`src/pages/DiceRoller/DiceRoller.jsx`

## Funcionalidades

### 1. Display de Resultado
- Área central destacada com resultado
- Animação durante rolagem
- Cores especiais para críticos:
  - **20 natural**: Verde, "🎉 CRÍTICO!"
  - **1 natural**: Vermelho, "💀 FALHA CRÍTICA!"
- Mostra detalhamento: dados individuais + modificador

### 2. Seleção de Dados
- Grid horizontal com todos os tipos:
  - d4, d6, d8, d10, d12, d20, d100
- Botões com visual de dado
- Seleção única destacada

### 3. Configurações
- **Quantidade**: 1-10 dados (controles +/-)
- **Modificador**: -∞ a +∞ (controles +/-)
- **Tipo de Rolagem** (apenas d20):
  - Normal
  - Vantagem (2d20, maior)
  - Desvantagem (2d20, menor)

### 4. Botão de Rolagem
- Botão grande e destacado
- Texto dinâmico: "🎲 Rolar 2d20"
- Desabilitado durante animação

### 5. Feedback Tátil
- Vibração ao rolar (se disponível)
- `navigator.vibrate(100)`

### 6. Histórico de Rolagens
- Lista das últimas 10 rolagens
- Informações: tipo, dados, modificador, total
- Destaque visual para críticos
- Botão para limpar histórico
- Persistido no localStorage (max 50)

## Componentes Utilizados
- `Header` - Título da página
- `Button` - Ação principal
- `DiceButton` - Botões de seleção de dado
- `Toast` - Feedback

## Serviços
- `loadRollHistory()` - Carrega histórico
- `addRollToHistory()` - Adiciona rolagem
- `clearRollHistory()` - Limpa histórico

## Models
- `DICE_TYPES` - Tipos de dados disponíveis
- `performRoll()` - Executa rolagem completa
- `rollWithAdvantage()` - Rolagem com vantagem
- `rollWithDisadvantage()` - Rolagem com desvantagem

## Estilização
- `DiceRoller.css` - Layout centralizado
- Animação de rotação durante roll
- Transições suaves

## Lógica de Rolagem
```javascript
// Rolagem normal
resultado = soma(dados) + modificador

// Vantagem
resultado = max(2d20) + modificador

// Desvantagem  
resultado = min(2d20) + modificador

// Crítico (d20)
natural 20 = sucesso crítico
natural 1 = falha crítica
```

## Considerações
- Randomização real via `Math.random()`
- Animação de 500ms antes do resultado
- Histórico reverte (mais recente primeiro)
- Funciona offline
