/**
 * HostConnection - Lógica do Host WebRTC
 *
 * Gerencia conexões P2P com múltiplos Peers.
 * Mantém Map<DeviceId, RTCPeerConnection>.
 * Cria DataChannel "sync_channel" para cada conexão.
 * Gera Offer e envia via API.
 *
 * Estados: DISCONNECTED, SIGNALING, CONNECTING, CONNECTED, FAILED
 */

import { sendSignal } from '../api/signaling';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export class HostConnection {
  constructor(roomId, deviceId, onStateChange, onMessage) {
    this.roomId = roomId;
    this.deviceId = deviceId;
    this.onStateChange = onStateChange;
    this.onMessage = onMessage;
    this.connections = new Map(); // deviceId -> { pc, dataChannel, state }
    this.state = 'DISCONNECTED';
  }

  setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }

  async addPeer(peerDeviceId) {
    if (this.connections.has(peerDeviceId)) return;

    this.setState('SIGNALING');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const dataChannel = pc.createDataChannel('sync_channel');
    const pendingIceCandidates = []; // Fila de ICE até answer ser processado

    dataChannel.onopen = () => {
      console.log(`DataChannel aberto com ${peerDeviceId}`);
      this.connections.get(peerDeviceId).state = 'CONNECTED';
      this.checkOverallState();
    };

    dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.onMessage?.(peerDeviceId, message);
    };

    dataChannel.onclose = () => {
      console.log(`DataChannel fechado com ${peerDeviceId}`);
      this.connections.get(peerDeviceId).state = 'DISCONNECTED';
      this.checkOverallState();
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal(this.roomId, {
          type: 'ice',
          from: this.deviceId,
          to: peerDeviceId,
          payload: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.connections.get(peerDeviceId).state = 'CONNECTED';
        this.checkOverallState();
      } else if (pc.connectionState === 'failed') {
        this.connections.get(peerDeviceId).state = 'FAILED';
        this.checkOverallState();
      }
    };

    this.connections.set(peerDeviceId, { pc, dataChannel, state: 'SIGNALING', pendingIceCandidates, hasRemoteDescription: false });

    // Criar Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('[HostConnection] Enviando offer para peer:', peerDeviceId);
    await sendSignal(this.roomId, {
      type: 'offer',
      from: this.deviceId,
      to: peerDeviceId,
      payload: { sdp: offer.sdp },
    });
  }

  async handleAnswer(peerDeviceId, payload) {
    console.log('[HostConnection] Recebeu answer de:', peerDeviceId);
    const conn = this.connections.get(peerDeviceId);
    if (!conn) {
      console.warn('[HostConnection] Conexão não encontrada para:', peerDeviceId);
      return;
    }

    await conn.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }));
    conn.hasRemoteDescription = true;
    conn.state = 'CONNECTING';
    console.log('[HostConnection] Answer processado, estado: CONNECTING');

    // Processar ICE candidates pendentes
    if (conn.pendingIceCandidates && conn.pendingIceCandidates.length > 0) {
      console.log('[HostConnection] Processando', conn.pendingIceCandidates.length, 'ICE candidates pendentes');
      for (const candidate of conn.pendingIceCandidates) {
        try {
          await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[HostConnection] Erro ao adicionar ICE pendente:', err);
        }
      }
      conn.pendingIceCandidates.length = 0; // Limpar fila
    }

    this.checkOverallState();
  }

  async handleIce(peerDeviceId, candidate) {
    console.log('[HostConnection] Recebeu ICE de:', peerDeviceId);
    const conn = this.connections.get(peerDeviceId);
    if (!conn) {
      console.warn('[HostConnection] Conexão não encontrada para ICE:', peerDeviceId);
      return;
    }

    // Se ainda não tem remoteDescription, enfileirar
    if (!conn.hasRemoteDescription) {
      console.log('[HostConnection] ICE enfileirado (aguardando answer)');
      conn.pendingIceCandidates.push(candidate);
      return;
    }

    await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  checkOverallState() {
    const states = Array.from(this.connections.values()).map(c => c.state);
    if (states.every(s => s === 'CONNECTED')) {
      this.setState('CONNECTED');
    } else if (states.some(s => s === 'FAILED')) {
      this.setState('FAILED');
    } else if (states.some(s => s === 'CONNECTING')) {
      this.setState('CONNECTING');
    } else {
      this.setState('SIGNALING');
    }
  }

  sendMessage(peerDeviceId, message) {
    const conn = this.connections.get(peerDeviceId);
    if (conn && conn.dataChannel.readyState === 'open') {
      conn.dataChannel.send(JSON.stringify(message));
    }
  }

  broadcastMessage(message) {
    for (const [peerId, conn] of this.connections) {
      if (conn.dataChannel.readyState === 'open') {
        conn.dataChannel.send(JSON.stringify(message));
      }
    }
  }

  close() {
    for (const conn of this.connections.values()) {
      conn.pc.close();
    }
    this.connections.clear();
    this.setState('DISCONNECTED');
  }
}