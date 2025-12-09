---
applyTo: "**/pages/CharacterList/**"
---
# Lista de Personagens - Instruções

## Propósito
Exibir todos os personagens criados pelo usuário, permitindo visualização, acesso e exclusão.

## Localização
`src/pages/CharacterList/CharacterList.jsx`

## Funcionalidades

### 1. Listagem de Fichas
- Exibe cards de todos os personagens salvos
- Informações resumidas: nome, ícone, raça, classe, nível, PV
- Barra de vida visual com gradiente

### 2. Estado Vazio
- Mensagem amigável quando não há personagens
- Botão para criar primeiro personagem
- Ícone ilustrativo

### 3. Ações por Personagem
- **Toque no card**: Abre detalhes do personagem
- **Botão excluir**: Remove personagem (com confirmação)

### 4. FAB (Floating Action Button)
- Botão flutuante para criar novo personagem
- Visível apenas quando há personagens na lista

## Componentes Utilizados
- `Header` - Com botão de adicionar
- `CharacterCard` - Card reutilizável de personagem
- `Button` - Para ações

## Serviços
- `loadCharacters()` - Carrega lista do localStorage
- `deleteCharacter(id)` - Remove personagem

## Estilização
- `CharacterList.css` - Layout em lista vertical
- Cards com hover/active states

## Fluxo de Navegação
```
CharacterList
├── → /characters/new (Criar novo)
└── → /characters/:id (Ver detalhes)
```

## Considerações
- Lista deve scrollar suavemente
- Confirmação antes de excluir (irreversível)
- Atualizar lista após exclusão sem reload
