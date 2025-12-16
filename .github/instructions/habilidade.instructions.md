---
applyTo: "**/models/character.js, **/models/T20Data.js, **/pages/CharacterCreate/CharacterCreate.jsx"
---

# Habilidades - Instruções

## Propósito
Gerenciamento de Habilidades de Classe (Poderes) e Talentos do sistema Tormenta 20.

## Localização
- Dados: `src/models/T20Data.js` (constante `HABILIDADES`)
- Lógica: `src/models/Character.js` (helpers)
- Uso: `src/pages/CharacterCreate/CharacterCreate.jsx` (seleção)

## Estrutura de Dados

### HABILIDADES (T20Data.js)
Objeto onde as chaves são os IDs das classes (ex: `cacador`, `guerreiro`) e os valores são arrays de objetos de habilidade.

```javascript
export const HABILIDADES = {
  cacador: [
    {
      id: 'ambidestria',
      name: 'Ambidestria',
      description: 'Descrição completa da habilidade...',
      prerequisites: ['Des 2'] // Array de strings com pré-requisitos
    },
    // ...
  ],
  // Outras classes iniciam com arrays vazios []
}
```

### Objeto Habilidade
- `id`: Identificador único da habilidade (string, snake_case).
- `name`: Nome de exibição (string).
- `description`: Descrição detalhada da regra (string).
- `prerequisites`: Lista de pré-requisitos para exibição (array de strings).

### No Modelo de Personagem (Character.js)
As habilidades escolhidas são armazenadas no array `habilidades` dentro do objeto `Character`.
```javascript
character.habilidades = [
  { id: 'ambidestria', name: 'Ambidestria' },
  // ...
]
```
> Nota: Armazena-se apenas o ID e o Nome para referência rápida. A descrição completa deve ser buscada no `T20Data.js` quando necessário.

## Funcionalidades

### 1. Listagem e Recuperação
- As habilidades são organizadas por classe.
- É possível recuperar todas as habilidades de uma classe específica.
- É possível buscar uma habilidade específica pelo seu ID e ID da classe.

### 2. Seleção (CharacterCreate)
- Durante a criação/edição de personagem, o usuário pode selecionar habilidades disponíveis para sua classe.
- A interface deve permitir marcar/desmarcar habilidades (toggle).
- Validações de pré-requisitos ainda não são automáticas (apenas informativas).

## Helpers Disponíveis (Character.js)

- `getHabilidadesForClass(classId)`: Retorna o array de habilidades disponíveis para a classe informada. Retorna `[]` se a classe não tiver habilidades cadastradas.
- `getHabilidadeById(classId, habilidadeId)`: Busca uma habilidade específica dentro da lista da classe.

## Considerações
- Atualmente, apenas a classe **Caçador** possui habilidades cadastradas como exemplo/implementação inicial.
- As demais classes possuem arrays vazios e devem ser populadas conforme a evolução do projeto.
- O sistema de pré-requisitos é atualmente apenas textual/informativo. Futuramente poderá haver validação lógica baseada nos atributos e nível do personagem.
