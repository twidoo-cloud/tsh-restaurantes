import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_URL } from '@/lib/api';

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

// ─── EVENT LABELS (Spanish) ───
const EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  'order:created': { label: 'Nueva orden', icon: '🛒', color: 'text-blue-600 bg-blue-50' },
  'order:paid': { label: 'Pago recibido', icon: '💰', color: 'text-green-600 bg-green-50' },
  'order:updated': { label: 'Orden actualizada', icon: '✏️', color: 'text-gray-600 bg-gray-50' },
  'order:cancelled': { label: 'Orden cancelada', icon: '❌', color: 'text-red-600 bg-red-50' },
  'kitchen:new-order': { label: 'Enviado a cocina', icon: '🔥', color: 'text-orange-600 bg-orange-50' },
  'kitchen:item-updated': { label: 'Item actualizado', icon: '👨‍🍳', color: 'text-amber-600 bg-amber-50' },
  'kitchen:order-bumped': { label: 'Orden lista', icon: '✅', color: 'text-green-600 bg-green-50' },
  'table:status-changed': { label: 'Mesa actualizada', icon: '🍽️', color: 'text-purple-600 bg-purple-50' },
  'shift:opened': { label: 'Caja abierta', icon: '🔓', color: 'text-blue-600 bg-blue-50' },
  'shift:closed': { label: 'Caja cerrada', icon: '🔒', color: 'text-gray-600 bg-gray-50' },
};

export { EVENT_LABELS };

/**
 * Live dashboard hook — subscribes to all POS events
 * and maintains running totals for real-time display.
 */
export function useLiveDashboard() {
  const { connected, on } = useSocket();
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [sessionTotals, setSessionTotals] = useState({
    salesAmount: 0,
    ordersCreated: 0,
    ordersPaid: 0,
    ordersCancelled: 0,
    lastPayment: null as any,
  });

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    const push = (type: string, data: any) => {
      const event = { type, ...data, _at: new Date().toISOString() };
      setLiveEvents(prev => [event, ...prev].slice(0, 30));
    };

    cleanups.push(on('order:created', (d) => {
      push('order:created', d);
      setSessionTotals(p => ({ ...p, ordersCreated: p.ordersCreated + 1 }));
    }));

    cleanups.push(on('order:paid', (d) => {
      push('order:paid', d);
      setSessionTotals(p => ({
        ...p,
        salesAmount: p.salesAmount + (d.total || 0),
        ordersPaid: p.ordersPaid + 1,
        lastPayment: d,
      }));
    }));

    cleanups.push(on('order:cancelled', (d) => {
      push('order:cancelled', d);
      setSessionTotals(p => ({ ...p, ordersCancelled: p.ordersCancelled + 1 }));
    }));

    cleanups.push(on('order:updated', (d) => push('order:updated', d)));
    cleanups.push(on('kitchen:new-order', (d) => push('kitchen:new-order', d)));
    cleanups.push(on('kitchen:item-updated', (d) => push('kitchen:item-updated', d)));
    cleanups.push(on('kitchen:order-bumped', (d) => push('kitchen:order-bumped', d)));
    cleanups.push(on('table:status-changed', (d) => push('table:status-changed', d)));
    cleanups.push(on('shift:opened', (d) => push('shift:opened', d)));
    cleanups.push(on('shift:closed', (d) => push('shift:closed', d)));

    return () => cleanups.forEach(fn => fn());
  }, [on]);

  const clearEvents = useCallback(() => setLiveEvents([]), []);
  const resetTotals = useCallback(() => setSessionTotals({ salesAmount: 0, ordersCreated: 0, ordersPaid: 0, ordersCancelled: 0, lastPayment: null }), []);

  return { connected, liveEvents, sessionTotals, clearEvents, resetTotals };
}
