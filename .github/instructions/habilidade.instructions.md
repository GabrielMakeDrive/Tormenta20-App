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
      type: 'Habilidade base', // 'Habilidade base' = habilidade automática/padrão
      level: 1,
      description: 'Descrição...',
      prerequisites: []
    },
    // Poderes de Classe (Selecionáveis)
    {
      id: 'ambidestria',
      name: 'Ambidestria',
      type: 'Poder', // 'Poder' = poder selecionável
      description: 'Descrição...',
      prerequisites: [
        { type: 'attribute', key: 'destreza', value: 2 }
      ]
    },
    {
      id: 'armadilheiro',
      name: 'Armadilheiro',
      type: 'Poder',
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
- `type`: Tipo da habilidade. Pode ser `'Habilidade base'` (habilidade automática/padrão) **ou** outro tipo específico (ex.: `'Poder'`, `'Terreno'`, `'Caminho'`, `'Escola'`, etc.).
  - **`Habilidade base`**: habilidade automática concedida quando aplicável (definida por `level`) — **não consome escolha**.
  - **outros tipos** (ex.: `'Poder'`, `'Terreno'`, `'Caminho'`, `'Escola'`): tipos **selecionáveis**; ao subir de nível, a interface apresenta **um passo por cada `type` elegível**. Por padrão apenas o `Poder` oferece **1 escolha**; outros tipos começam com **0 escolhas** e recebem escolhas **adicionais** somente quando houver Habilidades base com `grantsSelection` para aquele `type` cujo `level` seja menor ou igual ao nível atual do personagem.
  - **Exceção**: tipos que não são `Habilidade base` podem ter escolhas adicionais quando houver Habilidades base (com `grantsSelection`) cujo `grantsSelection` é igual ao `type` e cujo `level` seja menor ou igual ao nível atual do personagem. Cada Habilidade base assim encontrada adiciona +1 escolha para aquele `type`.
- `level`: (Opcional) Nível em que a habilidade é adquirida (para Habilidades base) ou nível mínimo (para habilidades selecionáveis; pode ser usado para ordenação).
- `tags`: (Opcional) Array de strings para categorização e pré-requisitos.
- `description`: Descrição detalhada da regra (string).
- `prerequisites`: Array de objetos definindo os requisitos.
- `grantsSelection`: (Opcional) Se presente em uma `Habilidade base`, indica que esta habilidade concede uma escolha adicional de habilidades do `type` especificado (ex: 'Terreno', 'Caminho', 'Escola').


### Estrutura de Pré-requisitos
Os pré-requisitos são objetos com a seguinte estrutura:
- `{ type: 'attribute', key: 'atributo', value: valor }`: Requer valor mínimo no atributo.
- `{ type: 'skill', value: 'pericia' }`: Requer treinamento na perícia.
- `{ type: 'level', value: nivel }`: Requer nível mínimo na classe.
- `{ type: 'Poder', value: 'id_poder' }`: Requer um poder específico.
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
- A interface filtra e exibe apenas habilidades selecionáveis (types diferentes de `feature`) para seleção, apresentando **um passo por cada `type`** elegível (o jogador escolhe **um** item por type). 
- A interface exibe os pré-requisitos formatados (ex: "Des 2", "5º nível") e desabilita opções quando os pré-requisitos não são atendidos.
- Validações de pré-requisitos ainda não são automáticas (apenas informativas).

## Helpers Disponíveis (Character.js)

- `getHabilidadesForClass(classId)`: Retorna o array de habilidades disponíveis para a classe informada.
- `getHabilidadeById(classId, habilidadeId)`: Busca uma habilidade específica dentro da lista da classe.

## Considerações
- Atualmente, as classes **Caçador**, **Arcanista** e **Bárbaro** possuem habilidades cadastradas.
- As demais classes devem seguir o novo padrão de estrutura (type, prerequisites como objetos).
- O sistema de pré-requisitos suporta validação lógica futura baseada nos tipos definidos.
- Todas as classes possuem uma habilidade "Poder" (Poder de Arcanista, Poder de Bárbaro, Poder de Bardo...) que permite que você escolha um poder de uma lista. Alguns poderes têm pré-requisitos. Para escolhê-los e usá-los, você deve possuir todos os requerimentos mencionados. Você pode escolher um poder no nível em que atinge seus pré-requisitos. A menos que especificado o contrário, você não pode escolher um mesmo poder mais de uma vez.

## Tipos Específicos por Classe

### Arcanista
- **Caminho**: Escolha entre Bruxo, Feiticeiro ou Mago (concedido por `grantsSelection` no nível 1).
- **Escola**: Escolas de magia (Abjuração, Adivinhação, Convocação, Encantamento, Evocação, Ilusão, Necromancia, Transmutação). Disponível através do poder "Especialista em Escola".
- **Círculos de Magia**: Habilidades base automáticas que desbloqueiam círculos de magia (1º ao 5º) conforme o nível.

### Bárbaro
- **Fúria**: Habilidade base principal concedida no nível 1.
- **Instinto Selvagem**: Habilidades base automáticas que escalam com o nível (3º, 9º, 15º).
- **Redução de Dano**: Habilidades base automáticas que escalam com o nível (5º, 8º, 11º, 14º, 17º).

### Caçador
- **Terreno**: Opções de terreno para a habilidade Explorador (concedido por `grantsSelection` em múltiplos níveis).