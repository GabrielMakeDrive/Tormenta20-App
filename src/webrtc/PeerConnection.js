/**
 * PeerConnection - Lógica do Peer WebRTC
 *
 * Gerencia uma única conexão P2P com o Host.
 * Ouve ondatachannel (não cria), gera Answer ao receber Offer.
 *
 * Estados: DISCONNECTED, SIGNALING, CONNECTING, CONNECTED, FAILED
 */

import { sendSignal } from '../api/signaling';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export class PeerConnection {
  constructor(roomId, deviceId, hostId, onStateChange, onMessage) {
    this.roomId = roomId;
    this.deviceId = deviceId;
    this.hostId = hostId; // ID do host para enviar sinais
    this.onStateChange = onStateChange;
    this.onMessage = onMessage;
    this.pc = null;
    this.dataChannel = null;
    this.state = 'DISCONNECTED';
    this.pendingIceCandidates = []; // Fila de ICE até offer ser processado
  }

  setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }

  async handleOffer(payload) {
    this.setState('SIGNALING');

    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.onopen = () => {
        console.log('DataChannel aberto como Peer');
        this.setState('CONNECTED');
      };
      this.dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.onMessage?.(message);
      };
      this.dataChannel.onclose = () => {
        console.log('DataChannel fechado como Peer');
        this.setState('DISCONNECTED');
      };
    };

    this.pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[PeerConnection] Enviando ICE candidate para host:', this.hostId);
        await sendSignal(this.roomId, {
          type: 'ice',
          from: this.deviceId,
          to: this.hostId,
          payload: { candidate: event.candidate },
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'connected') {
        this.setState('CONNECTED');
      } else if (this.pc.connectionState === 'connecting') {
        this.setState('CONNECTING');
      } else if (this.pc.connectionState === 'failed') {
        this.setState('FAILED');
      }
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: payload.sdp }));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    console.log('[PeerConnection] Enviando answer para host:', this.hostId);
    await sendSignal(this.roomId, {
      type: 'answer',
      from: this.deviceId,
      to: this.hostId,
      payload: { sdp: answer.sdp },
    });

    // Processar ICE candidates pendentes
    if (this.pendingIceCandidates.length > 0) {
      console.log('[PeerConnection] Processando', this.pendingIceCandidates.length, 'ICE candidates pendentes');
      for (const candidate of this.pendingIceCandidates) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[PeerConnection] Erro ao adicionar ICE pendente:', err);
        }
      }
      this.pendingIceCandidates.length = 0;
    }
  }

  async handleIce(payload) {
    // Se ainda não tem pc (offer não processado), enfileirar
    if (!this.pc) {
      console.log('[PeerConnection] ICE enfileirado (aguardando offer)');
      this.pendingIceCandidates.push(payload.candidate);
      return;
    }
    
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (err) {
      console.warn('[PeerConnection] Erro ao adicionar ICE:', err);
    }
  }

  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.dataChannel = null;
    this.setState('DISCONNECTED');
  }
}