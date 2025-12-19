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
  constructor(roomId, deviceId, onStateChange, onMessage) {
    this.roomId = roomId;
    this.deviceId = deviceId;
    this.onStateChange = onStateChange;
    this.onMessage = onMessage;
    this.pc = null;
    this.dataChannel = null;
    this.state = 'DISCONNECTED';
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
        await sendSignal(this.roomId, {
          type: 'ice',
          from: this.deviceId,
          to: 'host', // Assumindo host_id conhecido
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

    await sendSignal(this.roomId, {
      type: 'answer',
      from: this.deviceId,
      to: 'host',
      payload: { sdp: answer.sdp },
    });
  }

  async handleIce(payload) {
    if (this.pc) {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
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