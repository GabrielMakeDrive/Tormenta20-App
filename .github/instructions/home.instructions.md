---
applyTo: "**/pages/Home/**"
---
# Página Home - Instruções

## Propósito
Tela inicial do aplicativo que apresenta o app ao usuário e oferece acesso rápido às principais funcionalidades.

## Localização
`src/pages/Home/Home.jsx`

## Funcionalidades

### 1. Hero Section
- Apresentação visual do app com ícone e descrição
- Introdução ao sistema Tormenta 20

### 2. Ações Rápidas
- Grid de 3 botões para acesso imediato:
  - **Criar Ficha**: Navega para `/characters/new`
  - **Rolar Dados**: Navega para `/dice`
  - **Minhas Fichas**: Navega para `/characters`

### 3. Dica Informativa
- Card com informação sobre armazenamento local
- Orienta o usuário sobre backup de dados

### 4. Call to Action
- Botão principal "Criar Primeiro Personagem"
- Destaque visual para novos usuários

## Componentes Utilizados
- `Header` - Cabeçalho com título
- `Button` - Botão de CTA

## Estilização
- `Home.css` - Estilos específicos da página
- Mobile-first com grid responsivo

## Fluxo de Navegação
```
Home
├── → /characters/new (Criar Ficha)
├── → /dice (Rolar Dados)
└── → /characters (Minhas Fichas)
```

## Considerações
- Deve ser leve e carregar rapidamente
- Foco em usabilidade com máximo 2 taps para qualquer ação
- Visual atraente para engajamento inicial
