'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { api } from '@/lib/api';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';
import {
  Flame, Clock, Check, ChefHat, Bell, Utensils, RefreshCw, AlertTriangle,
  Wifi, WifiOff, Volume2, VolumeX,
} from 'lucide-react';
import { playNewOrderSound, playUrgentSound, playReadySound, initAudio } from '@/lib/kitchen-sounds';

const STATIONS = [
  { id: null, label: 'Todas', icon: ChefHat, color: 'bg-gray-700' },
  { id: 'grill', label: 'Parrilla', icon: Flame, color: 'bg-orange-600' },
  { id: 'cold', label: 'Fríos', icon: null, color: 'bg-cyan-600', emoji: '❄️' },
  { id: 'bar', label: 'Bar', icon: null, color: 'bg-purple-600', emoji: '🍹' },
  { id: 'pastry', label: 'Pastelería', icon: null, color: 'bg-pink-600', emoji: '🍰' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800', label: 'Pendiente' },
  preparing: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800', label: 'Preparando' },
  ready: { bg: 'bg-green-100 border-green-300', text: 'text-green-800', label: 'Listo' },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getUrgencyColor(seconds: number): string {
  if (seconds > 900) return 'text-red-500';
  if (seconds > 600) return 'text-orange-400';
  if (seconds > 300) return 'text-yellow-500';
  return 'text-gray-400';
}

const apiRequest = <T,>(path: string, options: RequestInit = {}): Promise<T> => api.request<T>(path, options);

export default function KitchenPage() {
  const router = useRouter();
  const store = usePosStore();

  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReady, setShowReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'new' | 'ready' | 'urgent' } | null>(null);

  const showToast = useCallback((message: string, type: 'new' | 'ready' | 'urgent') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;
    const urgencyCheck = setInterval(() => {
      const hasUrgent = orders.some(o =>
        o.items.some((i: any) => {
          if (i.status !== 'pending' && i.status !== 'preparing') return false;
          const elapsed = (Date.now() - new Date(i.createdAt || o.createdAt).getTime()) / 1000;
          return elapsed > 600;
        })
      );
      if (hasUrgent) {
        playUrgentSound();
        showToast('Hay órdenes con más de 10 min', 'urgent');
      }
    }, 30000);
    return () => clearInterval(urgencyCheck);
  }, [orders, soundEnabled, showToast]);

  const { connected: wsConnected, on: wsOn } = useSocket({ rooms: ['kitchen'] });

  const loadOrders = useCallback(async () => {
    try {
      const stationParam = activeStation ? `?station=${activeStation}` : '';
      const [activeOrders, ready] = await Promise.all([
        apiRequest<any[]>(`/kitchen/orders${stationParam}`),
        apiRequest<any[]>('/kitchen/ready'),
      ]);
      setOrders(activeOrders);
      setReadyOrders(ready);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [activeStation]);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    const unsubs = [
      wsOn(WS_EVENTS.KITCHEN_NEW_ORDER, (data: any) => {
        loadOrders();
        if (soundEnabled) playNewOrderSound();
        showToast(`Nueva orden${data?.orderNumber ? ` #${data.orderNumber}` : ''}`, 'new');
      }),
      wsOn(WS_EVENTS.KITCHEN_ITEM_UPDATED, (data: any) => {
        loadOrders();
        if (data?.status === 'ready' && soundEnabled) playReadySound();
      }),
      wsOn(WS_EVENTS.KITCHEN_ORDER_BUMPED, () => {
        loadOrders();
        if (soundEnabled) playReadySound();
        showToast('Orden despachada', 'ready');
      }),
      wsOn(WS_EVENTS.ORDER_PAID, () => { loadOrders(); }),
      wsOn(WS_EVENTS.ORDER_CANCELLED, () => {
        loadOrders();
        showToast('Orden cancelada', 'urgent');
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [wsOn, loadOrders, soundEnabled, showToast]);

  const handleStartPreparing = async (kitchenOrderId: string) => {
    await apiRequest(`/kitchen/item/${kitchenOrderId}/preparing`, { method: 'PATCH' });
    loadOrders();
  };

  const handleMarkReady = async (kitchenOrderId: string) => {
    await apiRequest(`/kitchen/item/${kitchenOrderId}/ready`, { method: 'PATCH' });
    loadOrders();
  };

  const handleBumpOrder = async (orderId: string) => {
    await apiRequest(`/kitchen/bump/${orderId}`, { method: 'PATCH' });
    loadOrders();
  };

  const handleMarkDelivered = async (kitchenOrderId: string) => {
    await apiRequest(`/kitchen/item/${kitchenOrderId}/delivered`, { method: 'PATCH' });
    loadOrders();
  };

  const filteredOrders = activeStation
    ? orders.map(o => ({ ...o, items: o.items.filter((i: any) => i.station === activeStation) })).filter(o => o.items.length > 0)
    : orders;

  const totalPending = orders.reduce((sum, o) => sum + o.items.filter((i: any) => i.status === 'pending').length, 0);
  const totalPreparing = orders.reduce((sum, o) => sum + o.items.filter((i: any) => i.status === 'preparing').length, 0);

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-900" onClick={() => initAudio()}>
      {/* ═══ KITCHEN TOOLBAR ═══ */}
      <div className="flex h-10 shrink-0 items-center justify-between px-3 bg-gray-800 text-white border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <ChefHat size={18} className="text-orange-400 shrink-0" />
          <span className="font-bold text-sm truncate">Cocina</span>
          <span className={`hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            wsConnected ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {wsConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {wsConnected ? 'LIVE' : 'POLL'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowReady(!showReady)}
            className={`relative flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              showReady ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}>
            <Bell size={14} />
            <span className="hidden sm:inline">Listos</span>
            {readyOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                {readyOrders.length}
              </span>
            )}
          </button>
          <button onClick={() => { initAudio(); setSoundEnabled(!soundEnabled); }}
            className={`rounded-lg p-1.5 transition ${soundEnabled ? 'text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-700'}`}
            title={soundEnabled ? 'Sonido ON' : 'Sonido OFF'}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={loadOrders} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white" title="Refrescar">
            <RefreshCw size={16} />
          </button>
          <span className="hidden md:inline text-[10px] text-gray-500 font-mono">
            {lastRefresh ? lastRefresh.toLocaleTimeString('es-EC', { hour12: false }) : '--:--'}
          </span>
        </div>
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 border-b border-gray-700/50 text-xs shrink-0">
        <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-2.5 py-1 text-yellow-300">
          <Clock size={12} /> {totalPending} pend.
        </span>
        <span className="flex items-center gap-1 rounded-full bg-blue-900/40 px-2.5 py-1 text-blue-300">
          <Flame size={12} /> {totalPreparing} prep.
        </span>
        <span className="flex items-center gap-1 rounded-full bg-green-900/40 px-2.5 py-1 text-green-300">
          <Check size={12} /> {readyOrders.length} listos
        </span>
      </div>

      {/* ═══ STATION TABS ═══ */}
      <div className="flex gap-2 overflow-x-auto bg-gray-800 px-3 py-2 border-b border-gray-700 scrollbar-hide shrink-0">
        {STATIONS.map((s) => (
          <button key={s.id || 'all'} onClick={() => setActiveStation(s.id)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeStation === s.id ? `${s.color} text-white shadow-lg` : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}>
            {s.icon ? <s.icon size={14} /> : <span>{s.emoji}</span>}
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : showReady ? (
          <div>
            <h2 className="mb-4 text-lg font-bold text-green-400 flex items-center gap-2">
              <Bell size={20} /> Pedidos Listos para Servir
            </h2>
            {readyOrders.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <Check size={48} className="mb-2 text-gray-600" />
                <p>No hay pedidos listos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {readyOrders.map((order: any) => (
                  <div key={order.orderId} className="rounded-xl border-2 border-green-500 bg-green-950/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-lg font-bold text-green-300">{order.orderNumber}</span>
                        {order.tableNumber && (
                          <span className="ml-2 rounded bg-green-800 px-2 py-0.5 text-xs font-medium text-green-200">Mesa {order.tableNumber}</span>
                        )}
                      </div>
                      <span className="text-sm text-green-400">{formatTime(order.waitingSeconds)} esperando</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm text-green-200">
                          <span>{item.quantity}x {item.productName}</span>
                          <span className="text-xs text-green-400 uppercase">{item.station}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { order.items.forEach((i: any) => handleMarkDelivered(i.id)); }}
                      className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500 active:scale-[0.98]">
                      Entregado
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {filteredOrders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <ChefHat size={64} className="mb-3 text-gray-700" />
                <p className="text-lg">No hay pedidos en cocina</p>
                <p className="text-sm text-gray-600 mt-1">Los pedidos aparecerán cuando se envíen desde el POS</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredOrders.map((order: any) => {
                  const maxElapsed = Math.max(...order.items.map((i: any) => i.elapsedSeconds || 0));
                  const isUrgent = maxElapsed > 600;
                  const allPreparing = order.items.every((i: any) => i.status === 'preparing');

                  return (
                    <div key={order.orderId}
                      className={`rounded-xl border-2 bg-gray-800 p-3 md:p-4 transition ${
                        isUrgent ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-700'
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{order.orderNumber}</span>
                          {order.tableNumber && (
                            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300">
                              <Utensils size={10} className="inline mr-1" />Mesa {order.tableNumber}
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-mono ${getUrgencyColor(maxElapsed)}`}>
                          {isUrgent && <AlertTriangle size={14} className="animate-pulse" />}
                          <Clock size={14} />
                          {formatTime(maxElapsed)}
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        {order.items.map((item: any) => {
                          const st = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
                          return (
                            <div key={item.id}
                              className={`rounded-lg border p-2.5 ${st.bg} cursor-pointer transition hover:opacity-80 active:scale-[0.98]`}
                              onClick={() => {
                                if (item.status === 'pending') handleStartPreparing(item.id);
                                else if (item.status === 'preparing') handleMarkReady(item.id);
                              }}>
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${st.text}`}>{item.quantity}x {item.productName}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  item.station === 'grill' ? 'bg-orange-200 text-orange-800' :
                                  item.station === 'cold' ? 'bg-cyan-200 text-cyan-800' :
                                  item.station === 'bar' ? 'bg-purple-200 text-purple-800' :
                                  'bg-gray-200 text-gray-800'
                                }`}>{item.station}</span>
                              </div>
                              {(item.itemNotes || item.kitchenNotes) && (
                                <p className="mt-1 text-xs italic text-gray-600">{item.itemNotes || item.kitchenNotes}</p>
                              )}
                              <div className="mt-1 flex items-center justify-between">
                                <span className={`text-xs ${st.text}`}>{st.label}</span>
                                {item.prepTime && <span className="text-xs text-gray-400">~{item.prepTime}min</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button onClick={() => handleBumpOrder(order.orderId)}
                        className={`w-full rounded-lg py-2.5 text-sm font-bold transition ${
                          allPreparing ? 'bg-green-600 text-white hover:bg-green-500 active:scale-[0.98]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}>
                        {allPreparing ? 'TODO LISTO' : 'BUMP (Todo Listo)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl px-6 py-3 shadow-2xl text-white font-bold text-sm md:text-lg ${
          toast.type === 'new' ? 'bg-orange-600' : toast.type === 'ready' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
    </AppShell>
  );
}