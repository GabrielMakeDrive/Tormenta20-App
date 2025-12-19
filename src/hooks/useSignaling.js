/**
 * Hook useSignaling - Polling Inteligente para Sinalização
 *
 * Hook para buscar mensagens de sinalização via polling HTTP.
 * Usa setInterval com lógica inteligente para evitar requests encavalados.
 *
 * Input: interval (ms), roomId, deviceId
 * Output: messages (array), isPolling (bool), error
 *
 * Lógica:
 * - setInterval para polling
 * - Ao receber mensagem, pausa intervalo, processa, retoma
 * - Em erro 500/timeout, aumenta intervalo (2s -> 5s -> 10s)
 * - Backoff exponencial até max 30s
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSignals } from '../api/signaling';

const INITIAL_INTERVAL = 2000; // 2s
const MAX_INTERVAL = 30000; // 30s
const BACKOFF_MULTIPLIER = 2.5;

export function useSignaling(roomId, deviceId, interval = INITIAL_INTERVAL) {
  const [messages, setMessages] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);
  const currentIntervalRef = useRef(interval);
  const lastMessageIdRef = useRef(null); // Para evitar duplicatas, assumindo mensagens têm id

  const poll = useCallback(async () => {
    if (!roomId || !deviceId) return;

    try {
      setIsPolling(true);
      setError(null);

      const newMessages = await getSignals(roomId, deviceId);

      if (newMessages.length > 0) {
        // Filtrar mensagens novas (assumindo ordem e id único)
        const filtered = newMessages.filter(msg => !lastMessageIdRef.current || msg.id > lastMessageIdRef.current);
        if (filtered.length > 0) {
          setMessages(prev => [...prev, ...filtered]);
          lastMessageIdRef.current = filtered[filtered.length - 1].id;

          // Pausar polling por um tempo para processar
          clearInterval(intervalRef.current);
          setTimeout(() => {
            if (intervalRef.current) {
              intervalRef.current = setInterval(poll, currentIntervalRef.current);
            }
          }, 1000); // 1s pausa
        }
      }

      // Reset backoff em sucesso
      currentIntervalRef.current = interval;

    } catch (err) {
      console.error('Erro no polling:', err);
      setError(err.message);

      // Backoff
      currentIntervalRef.current = Math.min(currentIntervalRef.current * BACKOFF_MULTIPLIER, MAX_INTERVAL);
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(poll, currentIntervalRef.current);
    } finally {
      setIsPolling(false);
    }
  }, [roomId, deviceId, interval]);

  useEffect(() => {
    if (roomId && deviceId) {
      intervalRef.current = setInterval(poll, currentIntervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [poll]);

  // Função para limpar mensagens processadas
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isPolling,
    error,
    clearMessages,
  };
}