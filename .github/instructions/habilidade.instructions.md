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
    // Habilidades de Classe (Padrão - Automáticas)
    {
      id: 'marca_presa',
      name: 'Marca da Presa',
      type: 'feature', // 'feature' = habilidade automática/padrão
      level: 1,
      description: 'Descrição...',
      prerequisites: []
    },
    // Poderes de Classe (Selecionáveis)
    {
      id: 'ambidestria',
      name: 'Ambidestria',
      type: 'power', // 'power' = poder selecionável
      description: 'Descrição...',
      prerequisites: [
        { type: 'attribute', key: 'destreza', value: 2 }
      ]
    },
    {
      id: 'armadilheiro',
      name: 'Armadilheiro',
      type: 'power',
      tags: ['armadilha'], // Tags para categorização e pré-requisitos
      description: '...',
      prerequisites: [
        { type: 'tag', value: 'armadilha' }, // Requer outro poder com tag 'armadilha'
        { type: 'level', value: 5 } // Requer nível 5 na classe
      ]
    }
    // ...
  ],
  // Outras classes iniciam com arrays vazios []
}
```

### Objeto Habilidade
- `id`: Identificador único da habilidade (string, snake_case).
- `name`: Nome de exibição (string).
- `type`: Tipo da habilidade. `'feature'` (padrão da classe) ou `'power'` (poder selecionável).
- `level`: (Opcional) Nível em que a habilidade é adquirida (para features) ou nível mínimo (para powers, embora redundante com prerequisites, pode ser usado para ordenação).
- `tags`: (Opcional) Array de strings para categorizar poderes (ex: 'armadilha').
- `description`: Descrição detalhada da regra (string).
- `prerequisites`: Array de objetos definindo os requisitos.

### Estrutura de Pré-requisitos
Os pré-requisitos são objetos com a seguinte estrutura:
- `{ type: 'attribute', key: 'atributo', value: valor }`: Requer valor mínimo no atributo.
- `{ type: 'skill', value: 'pericia' }`: Requer treinamento na perícia.
- `{ type: 'level', value: nivel }`: Requer nível mínimo na classe.
- `{ type: 'power', value: 'id_poder' }`: Requer um poder específico.
- `{ type: 'tag', value: 'tag_nome', count: 1 }`: Requer um (ou mais) poderes com a tag especificada.

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
- A interface filtra e exibe apenas habilidades do tipo `power` para seleção.
- A interface exibe os pré-requisitos formatados (ex: "Des 2", "5º nível").
- Validações de pré-requisitos ainda não são automáticas (apenas informativas).

## Helpers Disponíveis (Character.js)

- `getHabilidadesForClass(classId)`: Retorna o array de habilidades disponíveis para a classe informada.
- `getHabilidadeById(classId, habilidadeId)`: Busca uma habilidade específica dentro da lista da classe.

## Considerações
- Atualmente, apenas a classe **Caçador** possui habilidades cadastradas.
- As demais classes devem seguir o novo padrão de estrutura (type, prerequisites como objetos).
- O sistema de pré-requisitos suporta validação lógica futura baseada nos tipos definidos.
