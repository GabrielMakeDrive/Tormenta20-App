# Documentação Técnica do Frontend (React PWA + WebRTC)
1. Visão Geral da Arquitetura
O frontend será uma Single Page Application (SPA) em React. A comunicação segue dois caminhos distintos:

Sinalização (HTTP): Comunicação com o servidor Python (Polling, Criação de Sala).

Dados (WebRTC DataChannel): Comunicação direta entre dispositivos (P2P) para sincronização de estado.

Fase 1: Fundações e Roteamento
Objetivo: Criar a estrutura base, navegação e gerenciamento de estado global simples. Dependência: Nenhuma.

1.1. Estrutura de Diretórios Recomendada
Plaintext

/src
  /api        -> (Fase 2) Funções de fetch para o backend Python
  /webrtc     -> (Fase 3) Lógica de conexão P2P
  /hooks      -> Hooks customizados (useInterval, useP2P)
  /context    -> Estado global (RoomContext)
  /components -> UI Reutilizável (Botões, Inputs, Cards)
  /pages      -> Telas principais (Home, HostRoom, PeerRoom)
1.2. Definição das Rotas
Utilize react-router-dom.

/: Tela inicial. Escolha entre "Criar Sala" ou "Entrar em Sala".

/host/:roomId: Tela de controle do Host. Mostra lista de conectados e status.

/join: Tela para o Peer digitar o ID da sala.

/room/:roomId: Tela do Peer conectado.

1.3. Contexto Global (RoomContext)
Deve armazenar apenas dados "meta" da sessão, não o estado do app em tempo real.

TypeScript

interface RoomContextType {
  role: 'host' | 'peer' | null;
  roomId: string | null;
  deviceId: string; // Gerar UUID no primeiro load e salvar no localStorage
  apiToken: string | null;
}
Fase 2: Camada de API (Signaling Client)
Objetivo: Isolar toda a comunicação HTTP com o servidor Python. Dependência: Backend Python rodando.

2.1. Serviço de API (api/signaling.js)
Crie funções puras para cada endpoint do backend.

createRoom(deviceId): Retorna room_id e token.

joinRoom(roomId, deviceId): Retorna token e host_id.

sendSignal(roomId, message): Envia Offer/Answer/ICE.

getSignals(roomId, deviceId): Faz o GET e retorna array de mensagens.

sendHeartbeat(roomId, deviceId): Endpoint de "estou vivo".

2.2. Hook de Polling (hooks/useSignaling.js)
Como não usamos WebSocket, precisamos de um hook inteligente para buscar mensagens.

Input: interval (ex: 2000ms).

Lógica: Usar setInterval. Se uma mensagem chegar, pausar o intervalo, processar e retomar (para evitar requests encavalados).

Backoff: Se receber erro 500 ou timeout, aumentar o intervalo (2s -> 5s -> 10s).

Fase 3: Core WebRTC (O "Cérebro")
Objetivo: Criar a conexão P2P sem depender da UI. Dependência: Fase 2 (para troca de chaves).

Nesta fase, não crie telas. Crie uma classe ou hook (useWebRTC) que gerencie a conexão.

3.1. Máquina de Estados da Conexão
O WebRTC deve expor os seguintes estados para a UI:

DISCONNECTED

SIGNALING (Trocando offer/answer via API)

CONNECTING (Tentando furar o NAT)

CONNECTED (P2P estabelecido)

FAILED

3.2. Lógica do Host (webrtc/HostConnection.js)
Mantém um Map<DeviceId, RTCPeerConnection>. O Host tem uma conexão para CADA Peer.

Ao detectar novo peer (via API /participants), cria um RTCPeerConnection.

Cria o DataChannel ("sync_channel").

Gera Offer -> Envia via API.

3.3. Lógica do Peer (webrtc/PeerConnection.js)
Mantém apenas uma RTCPeerConnection (com o Host).

Ouve o evento ondatachannel (não cria o canal, apenas recebe).

Ao receber Offer (via API) -> Gera Answer -> Envia via API.

Fase 4: Integração de UI e Fluxos
Objetivo: Conectar a API e o WebRTC às telas criadas na Fase 1. Dependência: Fase 1, 2 e 3.

4.1. Tela do Host (/host/:roomId)
Mount: Chama API createRoom. Exibe o room_id na tela.

Loop: Inicia Polling de /participants.

Detect: Se lista de participantes mudar, iniciar conexão WebRTC (Fase 3) para o novo device.

Display: Lista de dispositivos com bolinha verde (P2P on) ou amarela (Sinalizando).

4.2. Tela do Peer (/room/:roomId)
Action: Usuário digita ID e clica "Entrar". Chama API joinRoom.

Loop: Inicia Polling de /signal.

React:

Recebeu Offer? -> pc.setRemoteDescription -> createAnswer -> api.sendSignal.

Recebeu ICE? -> pc.addIceCandidate.

Ready: Quando estado mudar para CONNECTED, esconder loading e mostrar interface do app.

Fase 5: PWA e Resiliência (Offline Parcial)
Objetivo: Garantir que o app funcione em redes instáveis. Dependência: App funcional.

5.1. Service Worker
Cache dos assets estáticos (JS, CSS, HTML) para carregar instantaneamente.

Não cachear as rotas da API (/rooms/*).

5.2. Tratamento de "Offline Parcial"
Heartbeat UI: Se o request de heartbeat falhar 3x, mostrar toast: "Conexão instável com servidor... tentando P2P".

P2P Keepalive: O WebRTC já tem mecanismos internos, mas você pode enviar um "ping" pelo DataChannel a cada 5s. Se falhar, tentar reiniciar o processo de sinalização (Ice Restart).

# Estrutura das rotas:

1️⃣ Criar sala (HOST)



POST /rooms

Request



{

"device_id": "device_1"}

Response



{

"room_id": "abc123",

"token": "host-token"}

🔹 Funções:



Gera room_id

Registra host

Define TTL da sala

Retorna token simples (JWT ou UUID)

2️⃣ Entrar em sala (PEER)



POST /rooms/{room_id}/join

Request



{

"device_id": "device_2"}

Response



{

"token": "peer-token",

"host_id": "device_1"}

🔹 Funções:



Verifica se sala existe

Registra participante

Retorna quem é o host

3️⃣ Enviar sinalização (offer / answer / ice)



POST /rooms/{room_id}/signal

Request



{

"from": "device_2",

"to": "device_1",

"type": "offer",

"payload": { "sdp": "..." }}

Response



{ "ok": true }

🔹 Funções:



Salva mensagem temporariamente

Não precisa garantir entrega imediata

4️⃣ Buscar sinalizações pendentes (POLLING)



GET /rooms/{room_id}/signal?device_id=device_1

Response



[

{

"from": "device_2",

"type": "offer",

"payload": { }

}]

🔹 Funções:



Retorna mensagens destinadas ao device

Remove após leitura (ou marca como entregue)

💡 Isso substitui WebSocket

5️⃣ Heartbeat / presença (offline parcial)



POST /rooms/{room_id}/heartbeat



{

"device_id": "device_2"}

🔹 Funções:



Atualiza last_seen

Permite detectar peers “mortos”

6️⃣ Listar participantes (HOST)



GET /rooms/{room_id}/participants

Response



[

{ "device_id": "device_2", "last_seen": "..." }]

7️⃣ Encerrar sala (HOST)



POST /rooms/{room_id}/close

🔹 Funções:



Marca sala como encerrada

Remove sinalizações pendentes

Notifica peers na próxima poll