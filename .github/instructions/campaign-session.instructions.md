---
applyTo: "**/pages/CampaignSession/**"
---

# Sessão de Campanha (Mestre + Jogadores) - Instruções

## Propósito
Permitir que um usuário inicie uma sessão como **Mestre**, gerando convites para jogadores se conectarem via WebRTC (sem backend). O Mestre visualiza status dos personagens conectados e recebe eventos de rolagem de dados em tempo real.

## Localização
`src/pages/CampaignSession/`
- `MestreView`: tela para criar/gerenciar a sessão e processar respostas dos jogadores.
- `JogadorView`: tela para ingressar na sessão do Mestre via código de convite.
- Compartilham helpers de UI e um serviço dedicado (`services/webrtcSession.js`).

## Arquitetura de Conexão (v2 - Convites Individuais)

### Por que não usar QR Code?
A SDP (Session Description Protocol) do WebRTC é muito grande para QR Codes confiáveis. A solução usa **cópia/cola de texto** via WhatsApp, Telegram ou outros apps de mensagem.

### Modelo de Conexão
- **Cada jogador tem sua própria conexão** (RTCPeerConnection independente)
- Mestre cria um **convite individual** para cada jogador
- Convites pendentes ficam em lista até receberem resposta
- Não há "QR único para todos" - cada convite é único

### Estrutura
```
App.js
└── ConnectionProvider              ← Mantém conexões vivas
    └── Router
        └── Routes
            ├── /session/host → MestreView (consome useConnection)
            └── /session/join → JogadorView (consome useConnection)
```

### Regras Importantes
1. **Nunca criar RTCPeerConnection nas Views** - usar apenas o Provider
2. **Usar `<Link>` ou `navigate()`** - nunca `window.location` ou `<a href>` (causam reload)
3. **Views consomem via `useConnection()`** - não criam/fecham conexões
4. **Cleanup no Provider** - conexões fechadas apenas no unmount do Provider

### Interface do Context (`useConnection`)
```js
{
  // Estado (reativo)
  sessionType: 'host' | 'player' | null,
  status: 'idle' | 'creating' | 'active' | 'connected' | 'disconnected' | 'error',
  players: Array,
  pendingInvites: Array,  // Convites aguardando resposta
  answerQR: string | null,
  errorMessage: string | null,
  
  // Métodos
  startHostSession: (callbacks) => Promise,
  startPlayerSession: (offerCode, characterInfo, callbacks) => Promise,
  endSession: () => void,
  createInvite: () => Promise,      // Cria novo convite individual
  cancelInvite: (playerId) => void, // Cancela convite pendente
  addAnswer: (playerId, answerData) => Promise,
  sendToPlayer: (playerId, message) => boolean,
  broadcast: (message) => number,
  sendCharacterUpdate: (data) => boolean,
  sendDiceRoll: (rollData) => boolean,
  requestIceRestart: (playerId, reason) => Promise,
}
```

## Fluxos Principais
### 1) Criar sessão (Mestre)
1. Usuário toca em "Iniciar como Mestre".
2. Sessão é criada (sem conexões ainda).
3. Para cada jogador:
   a. Mestre clica "Gerar Convite"
   b. Sistema cria RTCPeerConnection e gera offer
   c. Código do convite é exibido para copiar
   d. Mestre envia código via WhatsApp/Telegram
   e. Jogador processa e envia resposta
   f. Mestre cola resposta no app
   g. Conexão estabelecida

### 2) Entrar na sessão (Jogador)
1. Jogador seleciona personagem da lista de `characters`. Se não houver, bloquear com CTA para criar ficha.
2. Jogador recebe código de convite do Mestre (via WhatsApp, etc.)
3. Jogador cola o código no app
4. App processa offer, cria RTCPeerConnection, gera **answer**
5. Código de resposta é exibido para copiar
6. Jogador envia resposta para o Mestre
7. Quando conexão estabelece, envia dados do personagem

### 3) Troca de dados em tempo real
- **Canal único**: DataChannel `"campaign"` confiável (`ordered: true`).
- **Mensagens JSON**: `{ type: string, payload: object, ts: number }`.
- **Eventos mínimos**:
  - `hello`: handshake com `playerId`, `playerName`, `characterId`, `characterSummary` (nome, nível, PV/PM atuais, ícone).
  - `characterUpdate`: PV/PM atuais, condições, inventário resumido (nome + quantidades), último update local.
  - `diceRoll`: resultado da rolagem (`dice`, `total`, `breakdown`, `advantage`), quem rolou.
  - `ack`/`ping`/`pong`: manter presença e detectar desconexão.
- **Broadcast**: Mestre pode reenviar `diceRoll` e `characterUpdate` para todos conectados; jogadores só enviam para Mestre.

## Estados e UI
- **Listagem de jogadores conectados**: avatar/ícone, nome do personagem, status da conexão (`Conectado`, `Reconectando`, `Desconectado`).
- **QR ativo**: Mestre sempre exibe QR vigente da offer para novos participantes; regenerar apenas se `RTCPeerConnection` for recriado.
- **Feedback**: usar `Toast` para erros de câmera, falha de conexão, e confirmações.
- **Controles do Mestre**:
  - Botão "Ler resposta" (abre câmera) e "Inserir resposta manual" (textarea).
  - Botão "Reiniciar sessão" que fecha todas as conexões e gera nova offer.
  - Toggle de som/vibração para eventos de conexão/dados.
- **Controles do Jogador**:
  - Seletor de personagem (dropdown/cards).
  - Botão "Atualizar estado" que envia `characterUpdate` manualmente (além dos envios automáticos em eventos locais).

## Serviço WebRTC
- O serviço de baixo nível (`services/webrtcSession.js`) encapsula:
  - `createHostSession()` → retorna objeto com offer, métodos `addAnswer`, `broadcast`, `close`, eventos de conexão/mensagem.
  - `createPlayerSession(offer)` → retorna answer, conexão com callbacks e `sendUpdate`/`sendRoll`.
- **ConnectionProvider** (`services/ConnectionProvider.jsx`) envolve o serviço e expõe via React Context:
  - Mantém conexão viva durante navegação
  - Expõe estado reativo (status, players, qrData)
  - Expõe métodos para iniciar/encerrar/interagir com sessão
- **Views NÃO devem** importar diretamente `createHostSession`/`createPlayerSession` - usar `useConnection()`
- Não misturar lógica WebRTC com componentes; componentes apenas reagem a callbacks e chamam métodos públicos.
- Implementar serialização/deserialização segura (`try/catch`, validação de campos obrigatórios, tamanho máximo do QR < 4KB base64).
- Respeitar limitações do `campanha.instructions.md`: Android only, PWA foreground, topologia estrela (Mestre central). Sem Bluetooth.

## Dados e Integrações
- **Characters**: carregar de `services` existentes (`loadCharacters`, `getCharacterById`). Nunca modificar ficha do jogador via rede; só leitura e exibição no Mestre.
- **Rolls**: ao enviar `diceRoll`, opcionalmente salvar no histórico local (`addRollToHistory`) do emissor. Mestre não persiste rolls dos outros.
- **IDs**: usar UUID v4 (ou já existente em personagem) como `playerId`/`characterId` para correlacionar updates.
- **Persistência**: estado da sessão não é persistido em storage; vive apenas em memória no Provider durante a sessão.

## Validações e Erros
- Bloquear entrada se câmera não for autorizada, solicitar novamente e instruir usuário.
- Tempo limite para conexão individual (ex: 20s) antes de exibir erro e permitir tentar novamente.
- Se DataChannel fechar, marcar jogador como desconectado e permitir reentrada sem recriar a offer do Mestre.
- Tratar mensagens desconhecidas com warning silencioso; nunca quebrar a UI.

## Estilo e UX
- Mobile-first, usar Bootstrap + `styles/global.css` (sem cores fora das variáveis).
- Layout semelhante ao DiceRoller: cards compactos, botões grandes, contraste alto.
- QR Code centralizado com bordas arredondadas e legenda curta.
- Mantenha 2 toques para ações principais (iniciar, escanear, enviar resposta).

## Segurança e Privacidade
- Apenas conexões locais P2P; nenhuma telemetria.
- Sanitizar JSON recebido antes de renderizar; limitar tamanho de payloads.
- Deixar claro que iOS não é suportado.

## Navegação
- Entradas de menu: adicionar atalho na Home ("Sessão Mestre") e opção em Fichas para "Conectar ao Mestre".
- Rotas sugeridas:
```
/Home → /session/host
/Home → /session/join
```
