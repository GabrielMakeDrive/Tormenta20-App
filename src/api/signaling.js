/**
 * Serviço de API para Sinalização WebRTC
 *
 * Funções puras para comunicação HTTP com o servidor Python.
 * Isola toda a lógica de fetch para endpoints de sinalização.
 *
 * Endpoints assumidos no backend:
 * - POST /rooms: createRoom(deviceId) -> { room_id, token }
 * - POST /rooms/{roomId}/join: joinRoom(roomId, deviceId) -> { token, host_id }
 * - POST /rooms/{roomId}/signal: sendSignal(roomId, message) -> ok
 * - GET /rooms/{roomId}/signal?device_id={deviceId}: getSignals(roomId, deviceId) -> [messages]
 * - POST /rooms/{roomId}/heartbeat: sendHeartbeat(roomId, deviceId) -> ok
 * - GET /rooms/{roomId}/participants: getParticipants(roomId, deviceId) -> [deviceIds]
 *
 * Todas as funções retornam Promises.
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://gabrielgga.pythonanywhere.com';

/**
 * Cria uma nova sala
 * @param {string} deviceId - ID único do dispositivo
 * @returns {Promise<{room_id: string, token: string}>}
 */
export async function createRoom(deviceId) {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar sala: ${response.status}`);
  }

  return response.json();
}

/**
 * Entra em uma sala existente
 * @param {string} roomId - ID da sala
 * @param {string} deviceId - ID único do dispositivo
 * @returns {Promise<{token: string, host_id: string}>}
 */
export async function joinRoom(roomId, deviceId) {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao entrar na sala: ${response.status}`);
  }

  return response.json();
}

/**
 * Envia uma mensagem de sinalização (Offer/Answer/ICE)
 * @param {string} roomId - ID da sala
 * @param {object} message - Mensagem a enviar
 * @returns {Promise<void>}
 */
export async function sendSignal(roomId, message) {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar sinal: ${response.status}`);
  }
}

/**
 * Busca mensagens de sinalização pendentes
 * @param {string} roomId - ID da sala
 * @param {string} deviceId - ID único do dispositivo
 * @returns {Promise<Array>} - Array de mensagens
 */
export async function getSignals(roomId, deviceId) {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/signal?device_id=${deviceId}`);

  if (!response.ok) {
    throw new Error(`Erro ao buscar sinais: ${response.status}`);
  }

  return response.json();
}

/**
 * Envia heartbeat para manter presença
 * @param {string} roomId - ID da sala
 * @param {string} deviceId - ID único do dispositivo
 * @returns {Promise<void>}
 */
export async function sendHeartbeat(roomId, deviceId) {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar heartbeat: ${response.status}`);
  }
}

/**
 * Busca lista de participantes na sala
 * @param {string} roomId - ID da sala
 * @param {string} deviceId - ID único do dispositivo
 * @returns {Promise<Array>} - Array de deviceIds
 */
export async function getParticipants(roomId, deviceId) {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/participants`);

  if (!response.ok) {
    throw new Error(`Erro ao buscar participantes: ${response.status}`);
  }

  return response.json();
}