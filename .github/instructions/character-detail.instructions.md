# Detalhes do Personagem - Instruções
---
applyTo: "**/pages/CharacterDetail/**"
---

## Propósito
Tela principal de visualização e gestão do personagem durante o jogo, com acesso a todas as informações e funcionalidades de combate.

## Localização
`src/pages/CharacterDetail/CharacterDetail.jsx`

## Funcionalidades

### 1. Header do Personagem
- Avatar com ícone/emoji
- Nome do personagem
- Raça • Classe • Nível

### 2. Vitais (PV e PM)
- Cards com barras de progresso visuais
- Controles +/- para ajuste durante combate
- **PV**: Gradiente vermelho→verde baseado na porcentagem
- **PM**: Azul sólido
- Salva automaticamente ao alterar

### 3. Atributos
- Grid horizontal 6 colunas
- Exibe: Sigla, Valor, Modificador
- Compact para caber na tela

### 4. Stats de Combate
- Defesa (CA)
- Deslocamento (metros)
- Dinheiro (Tibares - T$)

### 5. Sistema de Abas
- **Status**: Informações gerais e dicas
- **Perícias**: Lista completa com bônus calculados
- **Inventário**: Preview e link para gestão completa
- **Notas**: Campo de texto livre

### 6. Perícias
- Lista todas as 29 perícias de Tormenta 20
- Destaque visual para perícias treinadas
- Cálculo automático: mod + metade nível + 2 (se treinado)
- Ordenadas alfabeticamente

### 7. Inventário (Preview)
- Mostra primeiros 5 itens
- Link para página completa de inventário
- Contador de itens adicionais

### 8. Notas
- Textarea para anotações livres
- Salva automaticamente ao digitar
- Redimensionável

### 9. Ações Rápidas
- Botão "Rolar Dados" para acesso direto

## Componentes Utilizados
- `Header` - Com voltar e editar
- `Button` - Ações
- `Toast` - Feedback

## Serviços
- `getCharacterById()` - Carrega personagem
- `saveCharacter()` - Salva alterações

## Models
- `getAttributeModifier()` - Calcula modificador
- `SKILLS` - Lista de perícias

## Estilização
- `CharacterDetail.css` - Layout compacto
- Abas com scroll horizontal
- Cards responsivos

## Fluxo de Navegação
```
CharacterDetail
├── ← Voltar (lista)
├── → /characters/:id/edit (editar)
├── → /characters/:id/inventory (inventário)
└── → /dice (rolar dados)
```

## Considerações
- Foco em uso durante sessão de jogo
- Ajustes de PV/PM são as ações mais frequentes
- Tudo deve estar acessível com poucos taps
- Salvar alterações automaticamente
