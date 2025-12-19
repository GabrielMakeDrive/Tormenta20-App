/**
 * RoomContext - Contexto Global para Sessão de Sala
 *
 * Armazena apenas dados "meta" da sessão, não o estado do app em tempo real.
 * Dados incluem role (host/peer), roomId, deviceId e apiToken.
 *
 * O deviceId é gerado como UUID no primeiro load e salvo no localStorage.
 *
 * Fluxo:
 * 1. Provider envolve o app no topo
 * 2. Componentes consomem via useRoom()
 * 3. Atualizações são feitas via setters do contexto
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// Contexto
const RoomContext = createContext(null);

// Função para gerar UUID simples
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Provider
export function RoomProvider({ children }) {
  const [role, setRole] = useState(null); // 'host' | 'peer' | null
  const [roomId, setRoomId] = useState(null);
  const [apiToken, setApiToken] = useState(null);

  // DeviceId persistido
  const [deviceId, setDeviceId] = useState(() => {
    const stored = localStorage.getItem('deviceId');
    if (stored) return stored;
    const newId = generateUUID();
    localStorage.setItem('deviceId', newId);
    return newId;
  });

  // Valor do contexto
  const value = {
    role,
    setRole,
    roomId,
    setRoomId,
    deviceId,
    apiToken,
    setApiToken,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

// Hook para consumir o contexto
export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}

export default RoomContext;