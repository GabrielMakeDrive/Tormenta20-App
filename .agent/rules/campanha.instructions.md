---
trigger: always_on
---

---
applyTo: "**/pages/CampaignSession/**"
---

# Sessão de Campanha (Mestre + Jogadores) - Instruções Consolidadas

## Propósito
Permitir que um usuário inicie uma sessão como **Mestre**, gerando uma sala com ID único para que jogadores se conectem via WebRTC. O objetivo é a sincronização em tempo real de rolagens de dados, status de personagens e eventos da campanha, utilizando o servidor de sinalização apenas para o estabelecimento da conexão P2P (WebRTC DataChannel).

## Localização e Componentes
`src/pages/CampaignSession/`
- `MestreView.jsx`: Painel de controle do mestre. Gerencia a criação da sala, visualiza jogadores conectados e histórico de rolagens.
- `JogadorView.jsx`: Interface do jogador. Permite selecionar um personagem e conectar-se à sala do mestre via ID.
- `CampaignSession.css`: Estilos unificados para as telas de sessão.

## Arquitetura de Conexão

### 1. Topologia (Estrela)
- **Mestre (Host)**: Centraliza todas as conexões. Cada jogador possui um `RTCPeerConnection` independente com o mestre.
- **Jogadores (Players)**: Conectam-se apenas ao mestre. Não há comunicação direta P2P entre jogadores (apenas via broadcast do mestre).

### 2. Camada de Sinalização (Backend Flask)
A sinalização é feita via HTTP Polling no servidor Python (`flask_app.py`), substituindo WebSockets por simplicidade e compatibilidade.
- **Endpoints Principais**:
    - `POST /rooms`: Cria uma sala vinculada ao `deviceId` do mestre.
    - `POST /rooms/{id}/join`: Jogador entra na sala e descobre o `deviceId` do mestre.
    - `POST /rooms/{id}/signal`: Troca de Offer/Answer/ICE candidates.
    - `GET /rooms/{id}/participants`: Mestre descobre novos jogadores aguardando conexão.
    - `POST /rooms/{id}/heartbeat`: Mantém a presença ativa e detecta desconexões.

### 3. Persistência e Resiliência (F5 Support)
- **LocalStorage**: O `RoomContext` persiste `roomId`, `role` e `apiToken`.
- **Auto-Resume**: Ao atualizar a página (F5), tanto `MestreView` quanto `JogadorView` tentam restaurar a sessão automaticamente usando os dados persistidos.
- **Handshake Reativo (`requestOffer`)**: Quando um jogador entra ou reconecta, ele envia um sinal `requestOffer` ao mestre. O mestre, ao receber, re-inicia o processo de `addPeer`, garantindo uma reconexão rápida mesmo que o estado anterior do PeerConnection esteja corrompido.

## Gerenciamento de Conexão (`ConnectionProvider`)

Toda a lógica WebRTC é encapsulada no `ConnectionProvider.jsx` no topo da árvore React.
- **Regra de Ouro**: **NUNCA** crie ou manipule `RTCPeerConnection` diretamente nas Views. Use o hook `useConnection()`.
- **Navegação**: Use apenas `<Link>` ou `navigate()` para mudar de tela. O uso de `window.location` causará reload e destruição do estado do Provider.

### Interface do Contexto (`useConnection`)
```js
{
  // Estado
  status,          // idle | creating | active | connected | disconnected | error
  players,         // Lista de jogadores conectados e seus status
  errorMessage,    
  isHost,
  isPlayer,

  // Métodos
  startHostSession: (options) => Promise,
  startPlayerSession: (roomId, characterInfo, options) => Promise,
  endSession: () => void,
  sendCharacterUpdate: (data) => boolean,
  sendDiceRoll: (rollData) => boolean,
}
```

## Fluxos Principais

### Fluxo de Criação (Mestre)
1. Mestre gera ID da sala (6 caracteres).
2. O sistema entra em polling de participantes.
3. Ao detectar novo participante -> Mestre cria `Offer` -> Envia via sinalização.
4. Recebe `Answer` -> Estabelece P2P.

### Fluxo de Entrada (Jogador)
1. Jogador seleciona personagem (essencial para o handshake).
2. Digita ID da sala (6 caracteres, caixa alta).
3. Envia `joinRoom` + `requestOffer`.
4. Recebe `Offer` do mestre -> Gera `Answer` -> Estabelece P2P.

### Troca de Dados (DataChannel)
- Canal: `sync_channel` (ordenado, confiável).
- Formato: JSON `{ type, payload, ts }`.
- Mensagens:
    - `hello`: Handshake inicial com resumo do personagem.
    - `characterUpdate`: PV, PM, Defesa e condições atuais.
    - `diceRoll`: Resultados de dados formatados.
    - `ping/pong`: Verificação de latência e atividade.

## Inconsistências Identificadas e Corrigidas
- **Sinalização**: Removida a obrigatoriedade de QR Code para SDP. O QR Code agora é opcional e deve conter apenas o ID da sala para facilitar a entrada. O estabelecimento da conexão é via Backend.
- **Manual Copy/Paste**: O fluxo de "copiar e colar SDP" foi descontinuado em favor da sinalização automática via servidor Flask para melhor UX.
- **Roles**: Padronizado para `host` (mestre) e `player` (jogador).
- **Persistência**: Anteriormente o estado era apenas em memória; agora há persistência parcial para suportar recarregamento de página.
- **Answers Duplicados**: O `HostConnection.handleAnswer()` agora verifica o `signalingState` do RTCPeerConnection antes de processar. Se já está em `stable`, answers redundantes são ignorados silenciosamente, evitando o erro fatal "Called in wrong state: stable".
- **Offers Duplicadas**: Tanto `HostConnection.addPeer()` quanto `PeerConnection.handleOffer()` agora verificam se já existe uma conexão em andamento (`SIGNALING`, `CONNECTING` ou `CONNECTED`) e ignoram chamadas duplicadas, evitando loops de reconexão.

## Regras de Estilo e UI
- O campo de ID da sala no jogador deve ser grande (font-size ~2.5rem), centralizado e monoespaçado.
- Mestre deve ter botão de "Encerrar Sala" com modal de confirmação.
- Usar variáveis de `styles/global.css` para cores de status (ex: `--success-color` para conectado).
- Feedback sonoro/vibratório em rolagens críticas (opcional no mestre).

## Regras de Negócio

### Ciclo de Vida da Sessão do Mestre
- **Sala Persistente**: A sala do mestre permanece aberta independentemente do status dos jogadores. Jogadores podem entrar e sair livremente sem afetar a sessão do mestre.
- **Encerramento Explícito**: A sala só é encerrada quando o mestre clica em "Encerrar Sala" (com modal de confirmação) ou fecha/recarrega o app.
- **Reconexão Automática**: Se o mestre der F5, a sessão é restaurada automaticamente via dados persistidos no localStorage (uma única vez para evitar duplicação).

### Ciclo de Vida da Sessão do Jogador
- **Seleção Obrigatória**: O jogador deve selecionar um personagem antes de entrar na sala.
- **Reconexão via requestOffer**: Ao entrar ou reconectar, o jogador envia um sinal `requestOffer` ao mestre para disparar a criação de uma nova Offer imediatamente.
- **Desconexão não afeta outros**: Se um jogador desconecta, apenas seu status é atualizado na lista do mestre. Os demais jogadores e o mestre não são afetados.

### Estados do Host (HostConnection)
| Estado | Significado |
|--------|-------------|
| `ACTIVE` | Sala aberta, pronta para receber jogadores |
| `CONNECTED` | Pelo menos um jogador está conectado |
| `SIGNALING` | Troca de Offer/Answer em andamento |
| `DISCONNECTED` | Sala encerrada pelo mestre (via `endSession`) |

**Importante**: O Host nunca entra em estado `FAILED` ou `DISCONNECTED` por causa de jogadores saindo. Isso garante que a sala permaneça aberta.

## Segurança e Limitações
- Android Only (PWA).
- Dados de personagem são lidos localmente pelo jogador e enviados ao mestre; o mestre não altera a ficha original no banco local do jogador.
- O mestre pode expulsar ou encerrar a sala, limpando os dados no servidor de sinalização via endpoint `/close`.

