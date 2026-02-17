import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

type EventHandler = (data: any) => void;

interface UseSocketReturn {
  connected: boolean;
  on: (event: string, handler: EventHandler) => () => void;
  emit: (event: string, data?: any) => void;
}

/**
 * WebSocket hook using Socket.IO client.
 * Connects once on mount, disconnects on unmount.
 * Falls back gracefully if connection fails.
 */
export function useSocket(options: { rooms?: string[] } = {}): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const roomsRef = useRef(options.rooms || []);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pos_token');
  };

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }

    return () => {
      listenersRef.current.get(event)?.delete(handler);
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const connect = async () => {
      const token = getToken();
      if (!token || connectingRef.current) return;

      connectingRef.current = true;

      try {
        const { io } = await import('socket.io-client');

        if (!mountedRef.current) return;

        const socket = io(`${WS_URL}/pos`, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          reconnectionDelayMax: 15000,
          timeout: 10000,
        });

        socket.on('connect', () => {
          if (!mountedRef.current) return;
          console.log('🔌 WebSocket connected:', socket.id);
          setConnected(true);

          roomsRef.current.forEach(room => {
            socket.emit('join-room', { room });
          });

          for (const [event, handlers] of listenersRef.current) {
            handlers.forEach(handler => socket.on(event, handler));
          }
        });

        socket.on('disconnect', () => {
          if (!mountedRef.current) return;
          setConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.warn('⚠️ WS connect error:', err.message);
          if (!mountedRef.current) return;
          setConnected(false);
        });

        socketRef.current = socket;
      } catch (e) {
        console.warn('socket.io-client not available');
        setConnected(false);
      } finally {
        connectingRef.current = false;
      }
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { connected, on, emit };
}

export const WS_EVENTS = {
  KITCHEN_NEW_ORDER: 'kitchen:new-order',
  KITCHEN_ITEM_UPDATED: 'kitchen:item-updated',
  KITCHEN_ORDER_BUMPED: 'kitchen:order-bumped',
  TABLE_STATUS_CHANGED: 'table:status-changed',
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_PAID: 'order:paid',
  ORDER_CANCELLED: 'order:cancelled',
  SHIFT_OPENED: 'shift:opened',
  SHIFT_CLOSED: 'shift:closed',
} as const;
