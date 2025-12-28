# Plano de Implementação: C01 - Chat de Texto Privado entre Mestre e Jogadores

**Data de Criação**: 2025-12-20  
**Última Atualização**: 2025-12-20  
**Status**: ✅ Concluído

---

## 1. Descrição da Funcionalidade

### Objetivo
Implementar um sistema de chat de texto privado dentro da sessão de campanha, permitindo comunicação direta e individual entre o **Mestre** e cada **Jogador** conectado. O chat funciona exclusivamente via WebRTC DataChannel, sem depender de servidor externo para as mensagens.

### Escopo
- ✅ Mensagens privadas: Mestre ↔ Jogador específico
- ✅ Identificação clara do remetente
- ✅ Histórico de mensagens da sessão (em memória)
- ✅ Notificação visual de novas mensagens

### Contexto Técnico
A arquitetura atual utiliza topologia estrela onde o **Mestre (Host)** centraliza todas as conexões WebRTC. Cada jogador possui um `RTCPeerConnection` independente com o mestre através de um `DataChannel`. Mensagens entre jogadores não são possíveis diretamente - apenas via relay do mestre.

**Arquivos de referência**:
- `src/webrtc/HostConnection.js` - Método `sendMessage(peerDeviceId, message)` para envio direcionado
- `src/webrtc/PeerConnection.js` - Método `sendMessage(message)` para envio ao host
- `src/services/ConnectionProvider.jsx` - Hook `useConnection()` expõe métodos de comunicação

---

## 2. Regras de Negócio

| Nº | Regra | Descrição |
|----|-------|-----------|
| **RN01** | Chat privado apenas | O chat é exclusivamente 1:1 entre Mestre e um Jogador específico. Não há canal de "sala" ou broadcast de mensagens de texto. |
| **RN02** | Mestre vê todos os chats | O Mestre pode trocar mensagens individualmente com cada jogador conectado. Cada conversa é separada e identificada pelo jogador. |
| **RN03** | Jogador vê apenas seu chat | O Jogador vê apenas suas mensagens trocadas com o Mestre. Não tem acesso às conversas de outros jogadores. |
| **RN04** | Mensagem vazia não é enviada | Mensagens em branco ou contendo apenas espaços devem ser ignoradas. |
| **RN05** | Histórico em memória | O histórico de mensagens é mantido apenas durante a sessão ativa. Ao encerrar a sessão ou recarregar a página, o histórico é perdido. |
| **RN06** | Limite de mensagens | Para evitar consumo excessivo de memória, manter no máximo as últimas 100 mensagens por conversa. |
| **RN07** | Indicador de não lidas | O Mestre deve ver um indicador visual quando houver mensagens não lidas de um jogador. |
| **RN08** | Conexão necessária | Chat só funciona quando há conexão WebRTC ativa (`status === CONNECTED`). |

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

| ID | Requisito | RN Relacionada |
|----|-----------|----------------|
| **RF01** | Mestre pode selecionar um jogador e abrir chat privado com ele | RN01, RN02 |
| **RF02** | Jogador pode abrir chat com o Mestre (único destinatário possível) | RN01, RN03 |
| **RF03** | Mensagem digitada é enviada via WebRTC ao destinatário | RN08 |
| **RF04** | Mensagem recebida é exibida na conversa correspondente | RN02, RN03 |
| **RF05** | Mestre vê lista de jogadores com indicador de mensagens não lidas | RN07 |
| **RF06** | Histórico da conversa é exibido em ordem cronológica (mais antiga primeiro) | RN05 |
| **RF07** | Mensagens do usuário local são visualmente diferenciadas das recebidas | - |
| **RF08** | Campo de input com botão de envio e suporte a Enter para enviar | - |
| **RF09** | Auto-scroll para mensagem mais recente ao receber/enviar | - |

### 3.2 Requisitos Não Funcionais

| ID | Requisito | RN Relacionada |
|----|-----------|----------------|
| **RNF01** | Latência de entrega < 500ms (limitada pelo WebRTC) | RN08 |
| **RNF02** | Memória máxima por conversa: 100 mensagens | RN06 |
| **RNF03** | Interface responsiva e otimizada para mobile | - |
| **RNF04** | Componentes reutilizáveis (chat pode ser usado em outros contextos) | - |
| **RNF05** | Acessibilidade: campo de input com label, foco adequado | - |

---

## 4. Critérios de Aceitação

### CA01 - Envio de Mensagem (Jogador → Mestre)
```gherkin
Dado que o jogador está conectado à sessão do mestre
E o jogador abre o chat
Quando o jogador digita uma mensagem e pressiona Enviar
Então a mensagem aparece no histórico do jogador como "enviada"
E a mensagem aparece no histórico do mestre como "recebida" do jogador
```

### CA02 - Envio de Mensagem (Mestre → Jogador)
```gherkin
Dado que o mestre tem jogadores conectados
E o mestre seleciona um jogador para chat
Quando o mestre digita uma mensagem e pressiona Enviar
Então a mensagem aparece no histórico do mestre como "enviada"
E a mensagem aparece no histórico do jogador como "recebida" do mestre
```

### CA03 - Indicador de Não Lidas
```gherkin
Dado que o mestre está na tela principal da sessão
Quando um jogador envia uma mensagem
E o mestre NÃO está com o chat daquele jogador aberto
Então um badge de notificação aparece ao lado do nome do jogador
E o badge desaparece quando o mestre abre o chat com aquele jogador
```

### CA04 - Mensagem Vazia
```gherkin
Dado que o usuário está no chat
Quando o usuário tenta enviar uma mensagem vazia ou só com espaços
Então nada acontece e nenhuma mensagem é enviada
```

### CA05 - Limite de Histórico
```gherkin
Dado que uma conversa tem 100 mensagens
Quando uma nova mensagem é adicionada
Então a mensagem mais antiga é removida
E o histórico permanece com 100 mensagens
```

---

## 5. Estrutura de Dados

### 5.1 Mensagem de Chat (WebRTC)

```javascript
{
  type: 'chatMessage',
  payload: {
    id: 'uuid-v4',           // ID único da mensagem
    text: 'Conteúdo...',     // Texto da mensagem (max 500 chars)
    senderName: 'Nome',      // Nome do remetente para exibição
    senderIcon: '🧙',        // Ícone do remetente
    timestamp: 1703030400000 // Unix timestamp
  }
}
```

### 5.2 Estado do Chat no Mestre (MestreView)

```javascript
const [chatMessages, setChatMessages] = useState({});
// Estrutura: { [playerId]: ChatMessage[] }

const [unreadCounts, setUnreadCounts] = useState({});
// Estrutura: { [playerId]: number }

const [activeChatPlayerId, setActiveChatPlayerId] = useState(null);
// Qual jogador está com chat aberto (null = nenhum)
```

### 5.3 Estado do Chat no Jogador (JogadorView)

```javascript
const [chatMessages, setChatMessages] = useState([]);
// Array simples de mensagens (só conversa com mestre)

const [isChatOpen, setIsChatOpen] = useState(false);
// Se o modal/panel de chat está aberto

const [unreadCount, setUnreadCount] = useState(0);
// Contador de mensagens não lidas
```

---

## 6. Passos para Implementação

### Fase 1: Infraestrutura de Mensagens

- [ ] **TODO 1.1**: Criar método `sendChatMessage` no `ConnectionProvider.jsx`
  - Para Host: usar `hostConnectionRef.current.sendMessage(playerId, message)`
  - Para Player: usar `peerConnectionRef.current.sendMessage(message)`
  - Arquivo: `src/services/ConnectionProvider.jsx`
  - Parâmetros: `(text, targetPlayerId?)` - targetPlayerId só para Host

- [ ] **TODO 1.2**: Adicionar handler de mensagem `chatMessage` no `ConnectionProvider.jsx`
  - No `handleHostMessage`: processar `chatMessage` do jogador
  - No `handlePlayerMessage`: processar `chatMessage` do mestre
  - Propagar para callbacks das Views via `onChatMessage`
  - Arquivo: `src/services/ConnectionProvider.jsx`

- [ ] **TODO 1.3**: Expor `sendChatMessage` no contexto público
  - Adicionar ao `contextValue` do useMemo
  - Adicionar ao array de dependências
  - Arquivo: `src/services/ConnectionProvider.jsx`

### Fase 2: Componente de Chat Reutilizável

- [ ] **TODO 2.1**: Criar componente `ChatPanel.jsx`
  - Props: `messages`, `onSendMessage`, `recipientName`, `isOpen`, `onClose`
  - Exibe histórico de mensagens
  - Input de texto com botão enviar
  - Auto-scroll
  - Arquivo: `src/components/ChatPanel/ChatPanel.jsx`

- [ ] **TODO 2.2**: Criar estilos `ChatPanel.css`
  - Layout de balões de chat (enviado à direita, recebido à esquerda)
  - Cores diferenciadas
  - Responsivo mobile
  - Arquivo: `src/components/ChatPanel/ChatPanel.css`

- [ ] **TODO 2.3**: Exportar componente no index
  - Adicionar export em `src/components/index.js`

### Fase 3: Integração na Tela do Mestre

- [ ] **TODO 3.1**: Adicionar estado de chat no `MestreView.jsx`
  - `chatMessages: { [playerId]: Message[] }`
  - `unreadCounts: { [playerId]: number }`
  - `activeChatPlayerId: string | null`
  - Arquivo: `src/pages/CampaignSession/MestreView.jsx`

- [ ] **TODO 3.2**: Registrar callback `onChatMessage` no useEffect
  - Atualizar `chatMessages[playerId]` com nova mensagem
  - Incrementar `unreadCounts[playerId]` se chat não aberto
  - Aplicar limite de 100 mensagens
  - Arquivo: `src/pages/CampaignSession/MestreView.jsx`

- [ ] **TODO 3.3**: Adicionar badge de não lidas na lista de jogadores
  - Renderizar contador ao lado do nome do jogador
  - Esconder se `unreadCounts[playerId] === 0`
  - Arquivo: `src/pages/CampaignSession/MestreView.jsx`

- [ ] **TODO 3.4**: Adicionar botão de chat em cada jogador
  - Ícone de chat ao lado do nome/status
  - onClick: `setActiveChatPlayerId(playerId)` + zerar unread
  - Arquivo: `src/pages/CampaignSession/MestreView.jsx`

- [ ] **TODO 3.5**: Renderizar `ChatPanel` quando `activeChatPlayerId` não for null
  - Passar mensagens do jogador ativo
  - onSendMessage: chamar `sendChatMessage(text, activeChatPlayerId)`
  - onClose: `setActiveChatPlayerId(null)`
  - Arquivo: `src/pages/CampaignSession/MestreView.jsx`

### Fase 4: Integração na Tela do Jogador

- [ ] **TODO 4.1**: Adicionar estado de chat no `JogadorView.jsx`
  - `chatMessages: Message[]`
  - `isChatOpen: boolean`
  - `unreadCount: number`
  - Arquivo: `src/pages/CampaignSession/JogadorView.jsx`

- [ ] **TODO 4.2**: Registrar callback `onChatMessage` no useEffect
  - Adicionar mensagem ao `chatMessages`
  - Incrementar `unreadCount` se chat fechado
  - Aplicar limite de 100 mensagens
  - Arquivo: `src/pages/CampaignSession/JogadorView.jsx`

- [ ] **TODO 4.3**: Adicionar botão flutuante de chat
  - Visível apenas quando conectado
  - Badge com `unreadCount` se > 0
  - onClick: abrir chat + zerar unread
  - Arquivo: `src/pages/CampaignSession/JogadorView.jsx`

- [ ] **TODO 4.4**: Renderizar `ChatPanel` quando `isChatOpen`
  - recipientName: "Mestre"
  - onSendMessage: chamar `sendChatMessage(text)`
  - onClose: `setIsChatOpen(false)`
  - Arquivo: `src/pages/CampaignSession/JogadorView.jsx`

### Fase 5: Estilos e Finalização

- [ ] **TODO 5.1**: Adicionar estilos de chat no `CampaignSession.css`
  - Botão flutuante de chat
  - Badge de notificação
  - Arquivo: `src/pages/CampaignSession/CampaignSession.css`

- [ ] **TODO 5.2**: Atualizar documentação
  - Adicionar estrutura `chatMessage` em `campaign-session.instructions.md`
  - Documentar novo método `sendChatMessage` no contexto
  - Arquivo: `.github/instructions/campaign-session.instructions.md`

- [ ] **TODO 5.3**: Testes manuais
  - Testar envio mestre → jogador
  - Testar envio jogador → mestre
  - Testar indicador de não lidas
  - Testar limite de 100 mensagens
  - Testar reconexão (chat deve esvaziar)

---

## 7. Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/services/ConnectionProvider.jsx` | Adicionar `sendChatMessage`, handler `chatMessage` |
| `src/components/ChatPanel/ChatPanel.jsx` | **Novo** - Componente de chat |
| `src/components/ChatPanel/ChatPanel.css` | **Novo** - Estilos do chat |
| `src/components/index.js` | Export do ChatPanel |
| `src/pages/CampaignSession/MestreView.jsx` | Estado de chat, callbacks, UI |
| `src/pages/CampaignSession/JogadorView.jsx` | Estado de chat, callbacks, UI |
| `src/pages/CampaignSession/CampaignSession.css` | Estilos adicionais |
| `.github/instructions/campaign-session.instructions.md` | Documentação |

---

## 8. Estimativa

| Fase | Tempo Estimado |
|------|----------------|
| Fase 1 - Infraestrutura | 30 min |
| Fase 2 - Componente | 45 min |
| Fase 3 - Mestre | 45 min |
| Fase 4 - Jogador | 30 min |
| Fase 5 - Finalização | 20 min |
| **Total** | **~3 horas** |

---

## 9. Conflitos Identificados

Nenhum conflito identificado com a estrutura atual do projeto.

---

## 10. Checklist Final

- [ ] Todos os TODOs marcados como concluídos
- [ ] Build passa sem erros
- [ ] Documentação atualizada
- [ ] Testes manuais passaram
