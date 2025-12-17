---
applyTo: "**/pages/CampaignSession/**"
---

# Sessão de Campanha (Mestre + Jogadores) - Instruções

## Propósito
Permitir que um usuário inicie uma sessão como **Mestre**, exibindo um QR Code para outros jogadores se conectarem via WebRTC (sem backend). O Mestre visualiza status dos personagens conectados e recebe eventos de rolagem de dados em tempo real.

## Localização
`src/pages/CampaignSession/`
- `MestreView`: tela para criar/gerenciar a sessão e ler answers dos jogadores.
- `JogadorView`: tela para ingressar na sessão do Mestre via QR Code.
- Compartilham helpers de UI e um serviço dedicado (ex: `services/webrtcSession.js`).

## Fluxos Principais
### 1) Criar sessão (Mestre)
1. Usuário toca em "Iniciar como Mestre".
2. App cria `RTCPeerConnection`, abre DataChannel `"campaign"` e gera **offer**.
3. Serializa offer + ICE (não usar trickle) em JSON compacto, converte para base64 e renderiza QR Code.
4. Mestre permanece aguardando respostas; exibe contador de conexões.
5. Para cada jogador: Mestre lê QR de **answer** (camera + fallback input manual), seta `setRemoteDescription`, aguarda `connectionstatechange` → estado `connected`.
6. Após conectado, a sessão mostra o jogador na lista, envia broadcast inicial (ex: ping/ACK).

### 2) Entrar na sessão (Jogador)
1. Jogador irá utilizar personagem principal (da lista de `characters` existentes). Se não houver, bloquear fluxo com CTA para criar ficha.
2. Jogador toca em "Escanear QR do Mestre".
3. App lê QR → obtém offer, cria `RTCPeerConnection`, seta remote offer, cria **answer**, aguarda ICE completo.
4. Serializa answer (base64) e mostra QR para o Mestre escanear; manter botão "Copiar" como fallback.
5. Quando DataChannel abre, envia payload inicial com estado resumido do personagem.

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
- Criar serviço dedicado (`services/webrtcSession.js`) para encapsular:
  - `createHostSession()` → retorna objeto com offer, métodos `addAnswer`, `broadcast`, `close`, eventos de conexão/mensagem.
  - `createPlayerSession(offer)` → retorna answer, conexão com callbacks e `sendUpdate`/`sendRoll`.
- Não misturar lógica WebRTC com componentes; componentes apenas reagem a callbacks e chamam métodos públicos.
- Implementar serialização/deserialização segura (`try/catch`, validação de campos obrigatórios, tamanho máximo do QR < 4KB base64).
- Respeitar limitações do `campanha.instructions.md`: Android only, PWA foreground, topologia estrela (Mestre central). Sem Bluetooth.

## Dados e Integrações
- **Characters**: carregar de `services` existentes (`loadCharacters`, `getCharacterById`). Nunca modificar ficha do jogador via rede; só leitura e exibição no Mestre.
- **Rolls**: ao enviar `diceRoll`, opcionalmente salvar no histórico local (`addRollToHistory`) do emissor. Mestre não persiste rolls dos outros.
- **IDs**: usar UUID v4 (ou já existente em personagem) como `playerId`/`characterId` para correlacionar updates.
- **Persistência**: estado da sessão não é persistido; reinicia ao fechar a tela.

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
