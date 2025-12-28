# 💡 Ideias para o App Tormenta 20

> Documento gerado em: 2025-12-20
> 
> Este arquivo contém ideias de melhorias, novas funcionalidades e otimizações identificadas durante análise completa do código-fonte do aplicativo.

---

## 📋 Sumário

1. [Visão Geral do App](#visão-geral-do-app)
2. [Ideias Organizadas por Categoria](#ideias-organizadas-por-categoria)
   - [Gestão de Personagens](#1-gestão-de-personagens)
   - [Sistema de Dados](#2-sistema-de-dados)
   - [Sessão de Campanha (Multiplayer)](#3-sessão-de-campanha-multiplayer)
   - [Inventário e Itens](#4-inventário-e-itens)
   - [Magias e Habilidades](#5-magias-e-habilidades)
   - [Combate e Encontros](#6-combate-e-encontros)
   - [Experiência do Usuário (UX)](#7-experiência-do-usuário-ux)
   - [Dados do Sistema Tormenta 20](#8-dados-do-sistema-tormenta-20)
   - [Infraestrutura e Performance](#9-infraestrutura-e-performance)
3. [Ideias Desenvolvidas](#ideias-desenvolvidas)

---

## Visão Geral do App

### Conceito
Aplicativo PWA (Progressive Web App) para **gerenciamento de fichas digitais** do sistema de RPG **Tormenta 20**. Desenvolvido exclusivamente para Android, permite que jogadores criem, editem e gerenciem seus personagens durante sessões de jogo, além de oferecer funcionalidades multiplayer para sincronização entre mestre e jogadores.

### Arquitetura Atual
- **Frontend**: React CRA com JavaScript
- **Armazenamento**: localStorage (persistência local)
- **Multiplayer**: WebRTC P2P com servidor de sinalização Flask
- **UI**: Mobile-first, tema escuro padrão

### Funcionalidades Existentes
- ✅ Criação de personagens (raça, classe, atributos, perícias)
- ✅ Detalhes do personagem com ajuste de PV/PM
- ✅ Sistema de dados com vantagem/desvantagem
- ✅ Inventário com tipos e raridades
- ✅ Sistema de habilidades de classe
- ✅ Sessão de campanha (Mestre/Jogador via WebRTC)
- ✅ Backup/Restauração de dados
- ✅ Instalação como PWA

---

## Ideias Organizadas por Categoria

### 1. Gestão de Personagens

| ID | Ideia | Prioridade |
|----|-------|------------|
| P01 | Sistema de multiclasse (personagens com 2+ classes) | Alta |
| P02 | Condições/Estados (envenenado, atordoado, etc.) | Alta |
| P03 | Favoritar personagem para acesso rápido | Média |
| P04 | Duplicar personagem existente | Média |
| P05 | Histórico de alterações (versioning) | Baixa |
| P06 | Cálculo automático de Defesa baseado em equipamento | Alta |
| P07 | Templates de personagem pré-montados | Média |
| P08 | Foto/Avatar personalizado (câmera ou galeria) | Baixa |
| P09 | Ficha de NPC simplificada para mestres | Alta |
| P10 | Importar personagem de outros apps/planilhas | Média |
| P11 | Resistências e vulnerabilidades | Alta |
| P12 | Descanso (curto/longo) com recuperação automática | Alta |

### 2. Sistema de Dados

| ID | Ideia | Prioridade |
|----|-------|------------|
| D01 | Macros de rolagem customizáveis | Alta |
| D02 | Rolagem de ataque com dano integrado | Alta |
| D03 | Rolagens favoritas/atalhos | Média |
| D04 | Animações de dados 3D | Baixa |
| D05 | Histórico de rolagens por sessão | Média |
| D06 | Compartilhar resultado da rolagem (imagem/texto) | Média |
| D07 | Rolagem de iniciativa com ordenação automática | Alta |
| D08 | Testes de resistência com CD configurável | Alta |
| D09 | Explosão de dados (dados que "explodem" em resultado máximo) | Média |
| D10 | Estatísticas de rolagens (média, críticos, etc.) | Baixa |

### 3. Sessão de Campanha (Multiplayer)

| ID | Ideia | Prioridade |
|----|-------|------------|
| C01 | Chat de texto entre mestre e jogadores | Alta |
| C02 | Ping de latência visível | Média |
| C03 | Mestre pode editar HP/PM dos jogadores | Alta |
| C04 | Iniciativa compartilhada (ordem de turnos) | Alta |
| C05 | Temporizador de turno visível para todos | Média |
| C06 | Notas de sessão compartilhadas | Média |
| C07 | Rolagem oculta (apenas mestre vê) | Alta |
| C08 | Broadcast de mensagens/eventos do mestre | Alta |
| C09 | Sons/Efeitos sonoros sincronizados | Baixa |
| C10 | "Mood" ou "Cena" (descrição do ambiente atual) | Média |
| C11 | Compartilhar imagem da cena/mapa | Média |
| C12 | Gravação de sessão (log de eventos) | Baixa |

### 4. Inventário e Itens

| ID | Ideia | Prioridade |
|----|-------|------------|
| I01 | Catálogo de itens pré-definidos de Tormenta 20 | Alta |
| I02 | Equipar/Desequipar armas e armaduras | Alta |
| I03 | Slot de equipamento (mão primária, secundária, armadura) | Alta |
| I04 | Capacidade de carga baseada em Força | Alta |
| I05 | Itens consumíveis com uso rápido (-1 quantidade) | Média |
| I06 | Compartilhar itens entre personagens | Baixa |
| I07 | Busca e filtro avançado no inventário | Média |
| I08 | Itens com efeitos (ex: +2 Força) aplicados automaticamente | Alta |
| I09 | Bolsa de componentes para magias | Média |
| I10 | Espólio de encontro (loot rápido) | Média |

### 5. Magias e Habilidades

| ID | Ideia | Prioridade |
|----|-------|------------|
| M01 | Catálogo completo de magias por círculo | Alta |
| M02 | Grimório pessoal (magias conhecidas vs preparadas) | Alta |
| M03 | Contador de magias por dia/descanso | Alta |
| M04 | Aprimoramentos de magia com cálculo de PM | Alta |
| M05 | Detalhes de magia com alcance, duração, componentes | Alta |
| M06 | Magias favoritas com atalho de rolagem | Média |
| M07 | Habilidades com usos limitados por dia | Alta |
| M08 | Talentos genéricos (não de classe) | Alta |
| M09 | Poderes de origem/divindade | Média |
| M10 | Completar dados de habilidades para todas as classes | Alta |

### 6. Combate e Encontros

| ID | Ideia | Prioridade |
|----|-------|------------|
| E01 | Tracker de iniciativa para mestre | Alta |
| E02 | Fichas de monstros/adversários | Alta |
| E03 | Calculadora de dano (tipo, resistência, vulnerabilidade) | Alta |
| E04 | Contador de rodadas de combate | Média |
| E05 | Condições em combate com duração | Alta |
| E06 | Ações disponíveis (padrão, movimento, livre, reação) | Média |
| E07 | Template de encontro (salvar grupo de monstros) | Média |
| E08 | Balanceamento de encontro (XP estimado) | Baixa |

### 7. Experiência do Usuário (UX)

| ID | Ideia | Prioridade |
|----|-------|------------|
| U01 | Tutorial/Onboarding para novos usuários | Alta |
| U02 | Tour interativo das funcionalidades | Média |
| U03 | Temas de cores customizáveis | Média |
| U04 | Fonte maior para acessibilidade | Média |
| U05 | Mode landscape para tablets | Baixa |
| U06 | Widgets para Android (PV/PM rápido) | Baixa |
| U07 | Notificações push (lembrete de sessão) | Baixa |
| U08 | Atalhos de teclado (para uso em desktop) | Baixa |
| U09 | Botão flutuante de rolagem rápida | Média |
| U10 | Modo "sessão de jogo" (tela sempre ligada) | Média |

### 8. Dados do Sistema Tormenta 20

| ID | Ideia | Prioridade |
|----|-------|------------|
| T01 | Poderes de todas as classes (atualmente só Caçador) | Alta |
| T02 | Origens de personagem | Alta |
| T03 | Divindades e poderes concedidos | Alta |
| T04 | Bestiário (monstros oficiais) | Alta |
| T05 | Itens mágicos do livro básico | Alta |
| T06 | Armas e armaduras com estatísticas | Alta |
| T07 | Aflições (doenças, venenos, maldições) | Média |
| T08 | Condições oficiais do sistema | Alta |
| T09 | Ajuda contextual de regras | Média |
| T10 | Referência rápida de regras de combate | Média |

### 9. Infraestrutura e Performance

| ID | Ideia | Prioridade |
|----|-------|------------|
| F01 | Migração para TypeScript | Média |
| F02 | Testes automatizados (Jest, Cypress) | Alta |
| F03 | Sincronização cloud opcional (Firebase/Supabase) | Alta |
| F04 | Compressão de dados para economia de espaço | Baixa |
| F05 | Service Worker avançado para cache offline | Média |
| F06 | Logs de erro centralizados (Sentry) | Média |
| F07 | Analytics de uso (opcional, com consentimento) | Baixa |
| F08 | Versão desktop (Electron/Tauri) | Baixa |
| F09 | Localização/Internacionalização (i18n) | Baixa |

---

## Ideias Desenvolvidas

A seguir, cada ideia é detalhada com descrição, benefícios, complexidade estimada e considerações técnicas.

---

### P01 - Sistema de Multiclasse

**Descrição**: Permitir que um personagem tenha níveis em múltiplas classes simultaneamente, como previsto nas regras de Tormenta 20. O personagem distribuiria seus níveis entre as classes escolhidas, e os cálculos de PV, PM, perícias e habilidades seriam ajustados de acordo.

**Benefícios**:
- Maior fidelidade às regras do sistema
- Flexibilidade para builds customizados
- Personalização aprofundada de personagens

**Complexidade**: Alta
- Requer reestruturação do modelo `Character` para suportar array de classes
- Cálculos de PV/PM precisam considerar níveis por classe
- Habilidades e poderes disponíveis dependem do nível em cada classe
- Interface de criação precisa de etapa adicional para distribuição de níveis

**Arquivos afetados**:
- `models/Character.js` - novo campo `classes: [{id, levels, habilidades}]`
- `pages/CharacterCreate/CharacterCreate.jsx` - seleção de múltiplas classes
- `models/T20Data.js` - regras de multiclasse

---

### P02 - Condições/Estados do Personagem

**Descrição**: Sistema para rastrear condições temporárias que afetam o personagem, como Envenenado, Atordoado, Cego, Agarrado, etc. Cada condição teria duração (rodadas ou permanente) e efeitos mecânicos descritos.

**Benefícios**:
- Facilita rastreamento durante combate
- Referência rápida aos efeitos de cada condição
- Integração com cálculos automáticos (ex: -2 em ataques se estiver "Abalado")

**Complexidade**: Média
- Novo campo `conditions: [{id, name, duration, effects}]` no personagem
- Componente de badge/chip mostrando condições ativas
- Modal para adicionar/remover condições
- Decrementar duração automaticamente (opcional)

**Arquivos afetados**:
- `models/Character.js` - campo `conditions`
- `models/T20Data.js` - lista de condições oficiais
- `pages/CharacterDetail/CharacterDetail.jsx` - exibição e gestão
- Novo componente `ConditionBadge`

---

### P06 - Cálculo Automático de Defesa

**Descrição**: Calcular a Defesa (CA) do personagem automaticamente baseado em: 10 + Destreza + Bônus de Armadura + Bônus de Escudo + Outros modificadores. Atualmente a defesa é um campo manual.

**Benefícios**:
- Reduz erros de cálculo
- Atualização automática ao equipar armadura
- Consistência com regras oficiais

**Complexidade**: Média
- Requer sistema de equipamentos (slots)
- Armaduras precisam de campo `defenseBonus`
- Fórmula: `10 + destreza + armadura + escudo + outros`
- Limite de Destreza por tipo de armadura (pesada limita Des)

**Arquivos afetados**:
- `models/Character.js` - `calculateDefense()` helper
- `models/InventoryItem.js` - campos de equipamento
- `pages/CharacterDetail/CharacterDetail.jsx` - exibição calculada

---

### P12 - Sistema de Descanso

**Descrição**: Botões de "Descanso Curto" e "Descanso Longo" que recuperam PV, PM e resetam habilidades de uso limitado conforme as regras de Tormenta 20.

**Benefícios**:
- Automatiza recuperação pós-combate
- Evita cálculos manuais
- Reseta contadores de habilidades

**Complexidade**: Média
- Descanso Curto: recupera PM igual ao nível + metade do nível
- Descanso Longo: recupera todos os PV e PM
- Reset de habilidades com usos por dia
- Confirmação antes de aplicar

**Arquivos afetados**:
- `pages/CharacterDetail/CharacterDetail.jsx` - botões de ação
- `models/Character.js` - lógica de recuperação
- Modal de confirmação com resumo

---

### D01 - Macros de Rolagem Customizáveis

**Descrição**: Permitir que o usuário crie "macros" - fórmulas de rolagem salvas como atalhos. Exemplo: "Ataque com Espada" = d20+7, "Dano Espada" = 1d8+4. Macros ficam no perfil do personagem para uso rápido.

**Benefícios**:
- Acesso rápido às rolagens mais usadas
- Personalização completa
- Reduz tempo durante combate

**Complexidade**: Média
- Novo campo `macros: [{id, name, formula, description}]` no personagem
- Editor de macro com validação de fórmula
- Lista de macros na tela de dados
- Parser simples de fórmula ("2d6+5", "d20+7")

**Arquivos afetados**:
- `models/Character.js` - campo `macros`
- `pages/DiceRoller/DiceRoller.jsx` - exibição de macros
- Novo componente `MacroEditor`
- `models/DiceRoll.js` - função `parseFormula()`

---

### D02 - Rolagem de Ataque com Dano Integrado

**Descrição**: Na tela de dados, ao selecionar um ataque, rolar automaticamente o d20 de acerto E os dados de dano em sequência. Exibir resultado combinado: "Ataque: 18 | Dano: 12".

**Benefícios**:
- Otimiza fluxo de combate
- Menos etapas por ação
- Visual integrado de sucesso + consequência

**Complexidade**: Média
- Rolagem composta (acerto + dano)
- Dano extra em crítico (multiplicar dados)
- Interface mostrando ambos os resultados
- Opcional: confirmar crítico antes do dano

**Arquivos afetados**:
- `pages/DiceRoller/DiceRoller.jsx` - modo de ataque
- `models/DiceRoll.js` - `performAttackRoll()`
- UI para exibir resultado duplo

---

### D07 - Rolagem de Iniciativa com Ordenação

**Descrição**: Funcionalidade para rolar iniciativa de todos os personagens de uma vez (em sessão multiplayer) e exibir a ordem de turnos automaticamente ordenada.

**Benefícios**:
- Agiliza início de combate
- Ordem visual clara
- Integração com sessão multiplayer

**Complexidade**: Alta
- Em sessão: mestre solicita iniciativa, jogadores rolam
- Mestre recebe resultados e ordena
- Tracker de turnos com indicador de "vez atual"
- NPCs/monstros do mestre inseridos manualmente

**Arquivos afetados**:
- `pages/CampaignSession/MestreView.jsx` - tracker de iniciativa
- Nova mensagem WebRTC `initiativeRoll`
- Componente `InitiativeTracker`

---

### C01 - Chat de Texto entre Mestre e Jogadores

**Descrição**: Canal de comunicação via texto dentro da sessão de campanha. Mensagens enviadas via DataChannel do WebRTC.

**Benefícios**:
- Comunicação silenciosa (notas secretas)
- Histórico de mensagens da sessão
- Mensagens privadas (mestre ↔ jogador específico)

**Complexidade**: Média
- Nova mensagem `chat: { from, to (null=todos), text, timestamp }`
- Lista de mensagens no rodapé da sessão
- Notificação de nova mensagem
- Opcional: mensagem privada (apenas para mestre ou jogador específico)

**Arquivos afetados**:
- `pages/CampaignSession/MestreView.jsx` - componente chat
- `pages/CampaignSession/JogadorView.jsx` - componente chat
- `services/ConnectionProvider.jsx` - `sendChatMessage()`
- CSS para balões de chat

---

### C03 - Mestre Pode Editar HP/PM dos Jogadores

**Descrição**: Na visão do mestre, permitir que ele ajuste diretamente os PV/PM dos jogadores conectados. A alteração é enviada ao jogador e aplicada na ficha dele automaticamente.

**Benefícios**:
- Mestre gerencia dano/cura rapidamente
- Jogador vê atualização em tempo real
- Útil para aplicar dano de área

**Complexidade**: Média
- Nova mensagem `masterUpdate: { targetId, field, value }`
- Jogador recebe e aplica (com confirmação visual)
- Botões +/- ao lado de cada jogador no mestre
- Modal para ajuste preciso

**Arquivos afetados**:
- `pages/CampaignSession/MestreView.jsx` - controles de edição
- `pages/CampaignSession/JogadorView.jsx` - handler de `masterUpdate`
- `services/ConnectionProvider.jsx` - `sendMasterUpdate()`

---

### C04 - Iniciativa Compartilhada (Ordem de Turnos)

**Descrição**: O mestre cria uma lista de iniciativa visível para todos os jogadores, mostrando quem está agindo e a ordem dos próximos. O mestre controla o avanço de turno.

**Benefícios**:
- Todos sabem de quem é a vez
- Planejamento antecipado de ações
- Organização do combate

**Complexidade**: Alta
- Estado compartilhado de iniciativa (broadcast do mestre)
- Indicador visual do turno atual
- Botão "Próximo Turno" no mestre
- Sincronização via WebRTC

**Arquivos afetados**:
- `pages/CampaignSession/MestreView.jsx` - gerenciador de turnos
- `pages/CampaignSession/JogadorView.jsx` - exibição de turno
- Nova mensagem `initiativeState`
- Componente `TurnTracker`

---

### C07 - Rolagem Oculta (Apenas Mestre Vê)

**Descrição**: Opção para o mestre fazer rolagens que só ele visualiza, útil para testes de percepção dos jogadores, armadilhas, etc.

**Benefícios**:
- Mantém mistério e tensão
- Testes de percepção sem viés
- Armadilhas sem spoiler

**Complexidade**: Baixa
- Toggle "Rolagem Oculta" na UI do mestre
- Não envia para jogadores (ou marca como oculto)
- Histórico interno apenas no mestre

**Arquivos afetados**:
- `pages/CampaignSession/MestreView.jsx` - toggle e lógica
- Botão discreto de rolagem oculta

---

### I01 - Catálogo de Itens Pré-Definidos

**Descrição**: Base de dados com itens oficiais de Tormenta 20 (armas, armaduras, equipamentos gerais) que podem ser adicionados ao inventário com um toque.

**Benefícios**:
- Criação rápida de inventário
- Dados padronizados e corretos
- Menos digitação manual

**Complexidade**: Média
- Arquivo de dados `items.json` com itens oficiais
- Modal de busca/seleção
- Filtros por tipo, preço, peso
- Botão "Adicionar ao Inventário"

**Arquivos afetados**:
- Novo arquivo `models/Items.js` ou `T20Data.js`
- `pages/Inventory/Inventory.jsx` - modal de catálogo
- Componente `ItemCatalog`

---

### I02/I03 - Sistema de Equipar Itens

**Descrição**: Slots de equipamento (mão primária, secundária, armadura, cabeça, etc.) onde itens do inventário podem ser equipados. Itens equipados afetam atributos derivados.

**Benefícios**:
- Separação clara entre carregado e equipado
- Bônus de equipamento aplicados automaticamente
- Visual de "ficha de equipamento"

**Complexidade**: Alta
- Novo campo `equipment: { mainHand, offHand, armor, head, ... }`
- Validação de compatibilidade (escudo + arma de duas mãos)
- Recálculo de defesa, ataque, capacidade
- UI de slots visuais

**Arquivos afetados**:
- `models/Character.js` - campo `equipment`
- `pages/CharacterDetail/CharacterDetail.jsx` - seção de equipamento
- `pages/Inventory/Inventory.jsx` - botão "Equipar"
- Componente `EquipmentSlots`

---

### M01/M02 - Sistema de Magias

**Descrição**: Catálogo de magias por círculo (1º ao 5º) com grimório pessoal. O personagem tem magias conhecidas e pode preparar um subconjunto para o dia.

**Benefícios**:
- Gestão completa de magias
- Referência rápida de descrições
- Cálculo de PM gasto por magia

**Complexidade**: Alta
- Base de dados de magias (círculo, escola, descrição, aprimoramentos)
- Campo no personagem: `spells: { known: [], prepared: [] }`
- Interface de grimório com busca
- Indicador de PM atual vs gasto

**Arquivos afetados**:
- Novo arquivo `models/Spells.js`
- `models/Character.js` - campos de magia
- Nova página `pages/Spellbook/Spellbook.jsx`
- Tab de magias no `CharacterDetail`

---

### E01 - Tracker de Iniciativa para Mestre

**Descrição**: Ferramenta standalone para o mestre gerenciar combates, com lista ordenada de participantes (PCs + NPCs), HP de cada um, e controle de turno.

**Benefícios**:
- Gerenciamento centralizado de combate
- Funciona offline (sem jogadores conectados)
- Reutilizável entre sessões

**Complexidade**: Média
- Nova página `pages/CombatTracker/CombatTracker.jsx`
- Lista editável de participantes
- Ordenação por iniciativa
- Indicador de turno atual
- Campo de HP para NPCs

**Arquivos afetados**:
- Nova página `CombatTracker`
- Navegação na BottomNav ou menu do mestre
- Persistência de encontros (opcional)

---

### E02 - Fichas de Monstros/Adversários

**Descrição**: Ficha simplificada para NPCs e monstros, contendo apenas: nome, HP, CA, ataque, dano, e habilidades especiais.

**Benefícios**:
- Mestre prepara encontros rapidamente
- Referência durante combate
- Biblioteca de monstros criados

**Complexidade**: Média
- Novo modelo `Monster` com campos simplificados
- Lista de monstros do mestre
- Integração com tracker de combate
- Templates de monstros genéricos

**Arquivos afetados**:
- Novo arquivo `models/Monster.js`
- Nova página `pages/MonsterList/MonsterList.jsx`
- Armazenamento separado de personagens

---

### U01 - Tutorial/Onboarding

**Descrição**: Sequência de telas explicativas na primeira vez que o usuário abre o app, apresentando as funcionalidades principais.

**Benefícios**:
- Reduz curva de aprendizado
- Destaca funcionalidades menos óbvias
- Experiência mais acolhedora

**Complexidade**: Baixa
- Componente `Onboarding` com slides
- Flag no localStorage: `onboardingComplete`
- Botão "Pular" e "Próximo"
- 4-5 slides cobrindo: fichas, dados, inventário, sessão

**Arquivos afetados**:
- Novo componente `Onboarding/Onboarding.jsx`
- `App.js` - verificação de primeiro acesso
- Assets de ilustração (opcional)

---

### T01 - Poderes de Todas as Classes

**Descrição**: Completar os dados de habilidades/poderes para todas as 14 classes, atualmente apenas Caçador está implementado.

**Benefícios**:
- Funcionalidade completa para todas as classes
- Seleção de poderes ao subir de nível
- Referência rápida durante jogo

**Complexidade**: Alta (volume de dados)
- Adicionar entradas em `HABILIDADES` para cada classe
- Manter estrutura: id, name, type, level, description, prerequisites
- Tags para categorização
- Aproximadamente 20-30 poderes por classe

**Arquivos afetados**:
- `models/T20Data.js` - seção `HABILIDADES`
- Possivelmente múltiplos arquivos por classe

---

### F03 - Sincronização Cloud Opcional

**Descrição**: Sistema de login (email ou Google) para sincronizar fichas em nuvem, permitindo acesso de múltiplos dispositivos.

**Benefícios**:
- Backup automático na nuvem
- Acesso de qualquer dispositivo
- Compartilhamento de fichas

**Complexidade**: Alta
- Integração com Firebase/Supabase
- Sistema de autenticação
- Merge de conflitos (local vs cloud)
- Opt-in (manter opção offline-only)

**Arquivos afetados**:
- Novo serviço `services/CloudSync.js`
- `services/StorageService.js` - abstração de storage
- Configuração de Auth
- UI de login em Settings

---

### Próximos Passos

As ideias estão priorizadas considerando:
1. **Alta**: Funcionalidades core que agregam muito valor
2. **Média**: Melhorias significativas mas não essenciais
3. **Baixa**: Nice-to-have, podem esperar

**Recomendação de ordem de implementação**:
1. T01 (Poderes de Classes) - Completa dados do sistema
2. P02 (Condições) - Essencial para combate
3. M01/M02 (Magias) - Fundamental para conjuradores
4. P06 (Defesa Automática) - Qualidade de vida
5. I01/I02 (Equipamentos) - Integração com defesa
6. D02 (Ataque + Dano) - Otimiza combate
7. C01/C03/C04 (Melhorias Sessão) - Multiplayer completo

---

*Este documento será atualizado conforme novas ideias surgirem ou implementações forem concluídas.*
