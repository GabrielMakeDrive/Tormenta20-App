---
applyTo: "**/components/**"
---
# Componentes Reutilizáveis - Instruções

## Propósito
Biblioteca de componentes UI reutilizáveis que garantem consistência visual e comportamental em todo o aplicativo.

## Localização
`src/components/`

---

## BottomNav
**Arquivo**: `BottomNav/BottomNav.jsx`

Barra de navegação inferior fixa.

### Props
Nenhuma (usa `useLocation` e `useNavigate`)

### Itens
| Path | Ícone | Label |
|------|-------|-------|
| / | 🏠 | Início |
| /characters | 📋 | Fichas |
| /dice | 🎲 | Dados |
| /settings | ⚙️ | Config |

### Comportamento
- Destaque visual no item ativo
- Feedback tátil ao tocar
- Safe area para dispositivos com notch

---

## Header
**Arquivo**: `Header/Header.jsx`

Cabeçalho fixo no topo das páginas.

### Props
| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| title | string | - | Título da página |
| showBack | boolean | false | Mostra botão voltar |
| rightAction | ReactNode | null | Elemento à direita |

### Comportamento
- Botão voltar usa `navigate(-1)`
- Suporta safe area top
- Ação direita customizável

---

## Button
**Arquivo**: `Button/Button.jsx`

Botão customizável para ações.

### Props
| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| children | ReactNode | - | Conteúdo do botão |
| variant | string | 'primary' | primary, secondary, danger, ghost |
| size | string | 'medium' | small, medium, large |
| fullWidth | boolean | false | Ocupa 100% da largura |
| disabled | boolean | false | Desabilita interação |
| onClick | function | - | Handler de clique |
| type | string | 'button' | Tipo HTML do botão |
| className | string | '' | Classes adicionais |

### Variantes
- **primary**: Fundo roxo, texto branco
- **secondary**: Fundo surface, borda
- **danger**: Fundo vermelho
- **ghost**: Transparente, texto roxo

---

## CharacterCard
**Arquivo**: `CharacterCard/CharacterCard.jsx`

Card resumido de personagem para listagens.

### Props
| Prop | Tipo | Descrição |
|------|------|-----------|
| character | object | Dados do personagem |
| onClick | function | Handler de clique |

### Exibe
- Ícone/avatar
- Nome
- Raça • Classe • Nível
- Barra de PV
- Texto PV atual/máximo

---

## DiceButton
**Arquivo**: `DiceButton/DiceButton.jsx`

Botão de seleção de tipo de dado.

### Props
| Prop | Tipo | Descrição |
|------|------|-----------|
| diceType | string | Ex: 'd20' |
| sides | number | Número de faces |
| onClick | function | Handler (diceType, sides) |
| selected | boolean | Estado de seleção |

---

## Toast
**Arquivo**: `Toast/Toast.jsx`

Notificação temporária não-intrusiva.

### Props
| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| message | string | - | Texto da mensagem |
| type | string | 'info' | success, error, info, warning |
| duration | number | 3000 | Tempo em ms |
| onClose | function | - | Callback ao fechar |

### Comportamento
- Aparece de baixo com fade
- Auto-dismiss após duration
- Ícone baseado no tipo

---

## Modal
**Arquivo**: `Modal/Modal.jsx`

Modal bottom-sheet para formulários e ações.

### Props
| Prop | Tipo | Descrição |
|------|------|-----------|
| isOpen | boolean | Controla visibilidade |
| onClose | function | Handler de fechamento |
| title | string | Título do modal |
| children | ReactNode | Conteúdo |

### Comportamento
- Overlay escuro clicável
- Slide-up animation
- Botão X para fechar
- Scroll interno se necessário

---

## Boas Práticas

1. **Consistência**: Use sempre os componentes ao invés de HTML direto
2. **Props**: Mantenha props simples e documentadas
3. **CSS**: Cada componente tem seu arquivo CSS próprio
4. **Acessibilidade**: Mantenha foco e contraste adequados
5. **Responsividade**: Todos otimizados para mobile-first
