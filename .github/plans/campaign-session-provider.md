# Plano: Migração para ConnectionProvider (React Context)

## Descrição da Funcionalidade

Migrar a arquitetura de conexão WebRTC da sessão de campanha para utilizar um **Provider no topo** (React Context), evitando que a conexão seja encerrada ao trocar de rotas. Atualmente, cada View (MestreView/JogadorView) cria e encerra sua própria conexão WebRTC no ciclo de vida do componente. Com o Provider, a conexão será mantida enquanto o app estiver ativo, permitindo navegação sem perda de estado.

### Problema Atual
- Quando o usuário navega para outra rota (ex: Home → DiceRoller → voltar), a conexão WebRTC é fechada no `useEffect` cleanup do componente.
- Isso força nova sinalização (QR Code) a cada navegação.
- Não há estado compartilhado entre rotas para acesso à conexão ativa.

### Solução Proposta
- Criar um `<ConnectionProvider>` que envolve as rotas no `App.js`.
- O Provider mantém a conexão WebRTC em refs/estado persistente enquanto o app vive.
- As Views consomem o contexto via hook `useConnection()` em vez de criar conexões localmente.
- Cleanup da conexão ocorre apenas no unmount do Provider (fechamento do app/refresh).

---

## Regras de Negócio

| # | Regra |
|---|-------|
| RN01 | A conexão WebRTC deve ser preservada durante navegação entre rotas |
| RN02 | O Provider deve gerenciar estado de sessão (host/player, conexões, status) |
| RN03 | Apenas o Provider pode criar/fechar RTCPeerConnection |
| RN04 | Views devem apenas consumir e reagir ao estado via Context |
| RN05 | Navegação deve usar `<Link>` ou `navigate()` do React Router (nunca `window.location`) |
| RN06 | O Provider deve expor métodos para iniciar/encerrar sessão sem forçar remontagem |
| RN07 | Estado da sessão não é persistido em storage (apenas em memória durante a sessão) |
| RN08 | Deve manter compatibilidade com fluxos existentes de QR Code e ICE restart |

---

## Requisitos Funcionais

| RF# | Descrição | Regra |
|-----|-----------|-------|
| RF01 | Criar `ConnectionProvider` com estado de sessão e refs para conexão | RN01, RN02 |
| RF02 | Criar hook `useConnection()` para consumo nas Views | RN04 |
| RF03 | Expor `startHostSession()` - inicia sessão como Mestre | RN03, RN06 |
| RF04 | Expor `startPlayerSession(offerQR, characterInfo)` - inicia como Jogador | RN03, RN06 |
| RF05 | Expor `endSession()` - encerra sessão atual sem desmontar Provider | RN06 |
| RF06 | Expor getters: `sessionType`, `isActive`, `players`, `connectionStatus` | RN02 |
| RF07 | Propagar callbacks de eventos (onMessage, onPlayerConnected, etc.) | RN08 |
| RF08 | MestreView deve consumir contexto em vez de criar sessão localmente | RN04 |
| RF09 | JogadorView deve consumir contexto em vez de criar sessão localmente | RN04 |
| RF10 | Manter toda lógica de sinalização QR Code nos serviços existentes | RN08 |

---

## Requisitos Não Funcionais

| RNF# | Descrição |
|------|-----------|
| RNF01 | O Provider não deve causar re-renders desnecessários (usar useMemo/useCallback) |
| RNF02 | Refs devem ser usados para valores que não precisam disparar renders |
| RNF03 | A navegação deve ser fluida sem delays perceptíveis |
| RNF04 | Código deve manter separação de responsabilidades (Provider vs Services vs Views) |

---

## Critérios de Aceitação

| CA# | Cenário | Resultado Esperado |
|-----|---------|-------------------|
| CA01 | Mestre inicia sessão, navega para Home, volta para /session/host | Sessão permanece ativa, QR visível, jogadores mantidos |
| CA02 | Jogador conecta, navega para /dice, volta para /session/join | Conexão mantida, status "Conectado" preservado |
| CA03 | Usuário fecha/recarrega o app | Conexão encerrada, Provider limpo corretamente |
| CA04 | Mestre clica "Reiniciar Sessão" | Sessão antiga fechada, nova criada, QR regenerado |
| CA05 | Jogador com conexão ativa abre outra aba com /session/join | Cada aba tem sua própria instância (não conflita) |
| CA06 | Navegar usando `<a href>` em vez de `<Link>` | (Não deve acontecer - código revisado para usar Link) |

---

## Arquitetura Proposta

```
App.js
└── ConnectionProvider              ← Novo componente
    ├── state: { sessionType, status, players, ... }
    ├── refs: { pcRef, channelsRef, sessionRef }
    └── methods: { startHostSession, startPlayerSession, endSession, ... }
        │
        └── Routes
            ├── /session/host → MestreView (consome useConnection)
            └── /session/join → JogadorView (consome useConnection)
```

---

## Passos para Implementação

### Fase 1: Criar Infraestrutura do Provider

- [X] **1.1** Criar arquivo `src/services/ConnectionProvider.jsx`
  - Criar `ConnectionContext` com `createContext(null)`
  - Criar `ConnectionProvider` component com estado e refs
  - Implementar lógica de ciclo de vida (useEffect para cleanup no unmount)
  - Exportar hook `useConnection()`

- [X] **1.2** Definir interface do contexto
  ```js
  {
    // Estado
    sessionType: 'host' | 'player' | null,
    status: 'idle' | 'creating' | 'active' | 'connected' | 'disconnected' | 'error',
    players: Array,
    qrData: string | null,
    answerQR: string | null,
    errorMessage: string | null,
    
    // Métodos
    startHostSession: (callbacks) => Promise,
    startPlayerSession: (offerQR, characterInfo, callbacks) => Promise,
    endSession: () => void,
    addAnswer: (playerId, answerData) => Promise,
    handleOffer: (offerData) => Promise,
    sendToPlayer: (playerId, message) => boolean,
    broadcast: (message) => number,
    sendCharacterUpdate: (data) => boolean,
    sendDiceRoll: (rollData) => boolean,
    requestIceRestart: (playerId, reason) => Promise,
  }
  ```

- [X] **1.3** Atualizar `src/services/index.js`
  - Exportar `ConnectionProvider` e `useConnection`

### Fase 2: Integrar Provider no App

- [X] **2.1** Modificar `src/App.js`
  - Importar `ConnectionProvider`
  - Envolver `<Router>` com `<ConnectionProvider>`
  - Manter estrutura de rotas existente

### Fase 3: Refatorar MestreView

- [X] **3.1** Modificar `src/pages/CampaignSession/MestreView.jsx`
  - Remover imports diretos de `createHostSession`
  - Usar `useConnection()` para obter estado e métodos
  - Remover state local de `session`, `qrData` (usar do contexto)
  - Manter state local de UI (showScanner, manualInput, toast, rolls)
  - Remover `useEffect` de cleanup da conexão
  - Adaptar `startSession` para chamar `startHostSession` do contexto
  - Adaptar handlers para usar métodos do contexto

### Fase 4: Refatorar JogadorView

- [X] **4.1** Modificar `src/pages/CampaignSession/JogadorView.jsx`
  - Remover imports diretos de `createPlayerSession`
  - Usar `useConnection()` para obter estado e métodos
  - Remover state local de `playerSession`, `answerQR` (usar do contexto)
  - Manter state local de UI (showScanner, selectedCharacter, toast)
  - Remover `useEffect` de cleanup da conexão
  - Adaptar `processOfferQR` para chamar `startPlayerSession` do contexto
  - Adaptar handlers para usar métodos do contexto

### Fase 5: Atualizar Documentação

- [X] **5.1** Atualizar `.github/instructions/campaign-session.instructions.md`
  - Documentar nova arquitetura com Provider
  - Atualizar seção "Serviço WebRTC" para incluir Provider
  - Adicionar regras sobre uso de Context vs hooks locais

### Fase 6: Testes e Validação

- [ ] **6.1** Testar cenário CA01 (Mestre navega e volta)
- [ ] **6.2** Testar cenário CA02 (Jogador navega e volta)
- [ ] **6.3** Testar cenário CA04 (Reiniciar sessão)
- [ ] **6.4** Verificar que não há vazamento de memória no cleanup

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/services/ConnectionProvider.jsx` | Provider de conexão WebRTC |

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|-------------|
| `src/App.js` | Envolver com ConnectionProvider |
| `src/services/index.js` | Exportar ConnectionProvider e useConnection |
| `src/pages/CampaignSession/MestreView.jsx` | Consumir contexto em vez de criar sessão |
| `src/pages/CampaignSession/JogadorView.jsx` | Consumir contexto em vez de criar sessão |
| `.github/instructions/campaign-session.instructions.md` | Atualizar documentação |

---

## CONFLITOS

Nenhum conflito identificado. A migração é incremental e mantém compatibilidade com os serviços existentes (`webrtcSession.js`).

---

## Notas de Implementação

1. O `webrtcSession.js` permanece inalterado - Provider apenas delega para ele
2. Usar `useRef` para conexões e `useState` apenas para dados que precisam de render
3. O Provider deve ser "burro" sobre rotas - não saber qual View está ativa
4. Callbacks de eventos devem ser registráveis/atualizáveis sem recriar conexão
