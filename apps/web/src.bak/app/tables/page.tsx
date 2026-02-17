'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore } from '@/lib/use-theme';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { AppShell } from '@/components/app-shell';
import {
  Users, Clock, Plus, X, Utensils, LayoutGrid, Wifi, WifiOff,
  Timer, Hash, User, Receipt, Merge, Search,
} from 'lucide-react';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';

// ─── Status config inspired by Chowbus ───
const STATUS_CONFIG: Record<string, {
  bg: string; border: string; text: string; label: string;
  cardBg: string; cardBorder: string; dot: string;
}> = {
  available: {
    bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700',
    label: 'Disponible', cardBg: 'bg-emerald-100/70', cardBorder: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  occupied: {
    bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700',
    label: 'Ocupada', cardBg: 'bg-rose-100/70', cardBorder: 'border-rose-400',
    dot: 'bg-rose-500',
  },
  reserved: {
    bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700',
    label: 'Reservada', cardBg: 'bg-amber-100/70', cardBorder: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  cleaning: {
    bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600',
    label: 'Limpieza', cardBg: 'bg-gray-200/70', cardBorder: 'border-gray-300',
    dot: 'bg-gray-400',
  },
};

type ViewMode = 'duration' | 'ticket' | 'staff' | 'guests' | 'amount';

interface TableData {
  id: string; number: string; capacity: number; shape: string;
  position_x: number; position_y: number; width: number; height: number;
  status: string; current_order_id: string | null;
  order?: any; opened_at?: string; waiter_name?: string;
  guest_count?: number; merged_with?: string | null;
}
interface Zone { id: string; name: string; color: string; tables: TableData[]; }
interface FloorPlan { id: string; name: string; zones: Zone[] | null; }

function formatDuration(startTime: string): string {
  const diff = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h${String(mins % 60).padStart(2, '0')}`;
  return `${mins}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`;
}

function getDurationMinutes(startTime: string): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
}

function getDurationColor(minutes: number): string {
  if (minutes < 30) return 'text-emerald-600';
  if (minutes < 60) return 'text-amber-600';
  return 'text-red-600';
}

export default function TablesPage() {
  const router = useRouter();
  const store = usePosStore();
  const branding = useThemeStore(s => s.branding);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [activeFloor, setActiveFloor] = useState(0);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [tableOrder, setTableOrder] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('duration');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);

  const { connected: wsConnected, on: wsOn } = useSocket({ rooms: ['tables'] });

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadFloorPlans();
    const interval = setInterval(loadFloorPlans, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubs = [
      wsOn(WS_EVENTS.TABLE_STATUS_CHANGED, () => loadFloorPlans()),
      wsOn(WS_EVENTS.ORDER_CREATED, () => loadFloorPlans()),
      wsOn(WS_EVENTS.ORDER_PAID, () => loadFloorPlans()),
      wsOn(WS_EVENTS.ORDER_CANCELLED, () => loadFloorPlans()),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [wsOn]);

  const loadFloorPlans = async () => {
    try {
      const data = await api.request<FloorPlan[]>('/tables/floor-plans');
      setFloorPlans(data);
      setLoading(false);
    } catch { setLoading(false); }
  };

  // Helper for api requests with auth
  (api as any).request = async function <T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: any = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${path}`, { ...options, headers });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Error'); }
    return res.json();
  };

  const handleTableClick = async (table: TableData) => {
    setSelectedTable(table);
    setTableOrder(null);
    if (table.status === 'occupied' && table.current_order_id) {
      try {
        const data = await api.request<any>(`/tables/${table.id}`);
        setTableOrder(data.order);
      } catch { }
    }
  };

  const handleOpenTable = async () => {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      const result = await api.request<any>(`/tables/${selectedTable.id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestCount }),
      });
      setShowOpenDialog(false);
      setSelectedTable(null);
      await loadFloorPlans();
      router.push(`/pos?orderId=${result.order.id}&tableId=${selectedTable.id}&tableNumber=${selectedTable.number}`);
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      await api.request(`/tables/${selectedTable.id}/close`, { method: 'PATCH' });
      setSelectedTable(null);
      setTableOrder(null);
      await loadFloorPlans();
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const handleGoToOrder = () => {
    if (!selectedTable || !tableOrder) return;
    router.push(`/pos?orderId=${tableOrder.id}&tableId=${selectedTable.id}&tableNumber=${selectedTable.number}`);
  };

  const currentFloor = floorPlans[activeFloor];
  const allZones = currentFloor?.zones || [];
  const filteredZones = activeZone ? allZones.filter(z => z.id === activeZone) : allZones;

  const allTables = useMemo(() => {
    let tables = filteredZones.flatMap(z => z.tables);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tables = tables.filter(t => t.number.toLowerCase().includes(q));
    }
    return tables;
  }, [filteredZones, searchQuery]);

  const allTablesInFloor = allZones.flatMap(z => z.tables);
  const stats = {
    total: allTablesInFloor.length,
    available: allTablesInFloor.filter(t => t.status === 'available').length,
    occupied: allTablesInFloor.filter(t => t.status === 'occupied').length,
    reserved: allTablesInFloor.filter(t => t.status === 'reserved').length,
  };

  const getTableSecondaryInfo = (table: TableData) => {
    switch (viewMode) {
      case 'duration':
        if (table.status === 'occupied' && table.opened_at) {
          const mins = getDurationMinutes(table.opened_at);
          return { text: formatDuration(table.opened_at), color: getDurationColor(mins) };
        }
        return null;
      case 'ticket':
        if (table.order?.orderNumber) return { text: table.order.orderNumber, color: 'text-gray-600' };
        return null;
      case 'staff':
        if (table.waiter_name) return { text: table.waiter_name, color: 'text-blue-600' };
        return null;
      case 'guests':
        if (table.guest_count) return { text: `${table.guest_count}`, color: 'text-purple-600', icon: Users };
        return null;
      case 'amount':
        if (table.order?.total) return { text: formatMoney(parseFloat(table.order.total)), color: 'text-emerald-700' };
        return null;
      default:
        return null;
    }
  };

  const VIEW_MODES: { key: ViewMode; label: string; icon: any }[] = [
    { key: 'duration', label: 'Duración', icon: Timer },
    { key: 'ticket', label: 'Ticket', icon: Hash },
    { key: 'staff', label: 'Mesero', icon: User },
    { key: 'guests', label: 'Comensales', icon: Users },
    { key: 'amount', label: 'Monto', icon: Receipt },
  ];

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* ═══ TOP BAR ═══ */}
        <div className="flex items-center justify-between gap-3 bg-white border-b px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">Mesas</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-gray-600"><span className="font-semibold text-gray-900">{stats.available}</span> <span className="hidden md:inline">libres</span></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-gray-600"><span className="font-semibold text-gray-900">{stats.occupied}</span> <span className="hidden md:inline">ocupadas</span></span>
              </span>
              {stats.reserved > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-gray-600"><span className="font-semibold text-gray-900">{stats.reserved}</span> <span className="hidden md:inline">reservadas</span></span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input type="text" placeholder="Buscar mesa..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-36 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30" />
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${wsConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {wsConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {wsConnected ? 'LIVE' : 'POLL'}
            </span>
          </div>
        </div>

        {/* ═══ ZONE/FLOOR TABS ═══ */}
        <div className="flex items-center gap-1 bg-white border-b px-3 py-1.5 overflow-x-auto shrink-0 scrollbar-hide">
          {floorPlans.length > 1 && floorPlans.map((fp, i) => (
            <button key={fp.id} onClick={() => { setActiveFloor(i); setActiveZone(null); }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${i === activeFloor ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={i === activeFloor ? { backgroundColor: branding.accentColor } : {}}>
              {fp.name}
            </button>
          ))}
          {floorPlans.length > 1 && allZones.length > 0 && <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />}

          <button onClick={() => setActiveZone(null)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${!activeZone ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Todas <span className="ml-1 text-xs opacity-70">{allTablesInFloor.length}</span>
          </button>
          {allZones.map(zone => (
            <button key={zone.id} onClick={() => setActiveZone(zone.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${activeZone === zone.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={activeZone === zone.id ? { backgroundColor: zone.color || branding.accentColor } : {}}>
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: zone.color || '#6b7280' }} />
              {zone.name}
              <span className="text-xs opacity-70">{zone.tables.filter(t => t.status === 'occupied').length}/{zone.tables.length}</span>
            </button>
          ))}
        </div>

        {/* ═══ MAIN: Grid + Detail Panel ═══ */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-3 md:p-5">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderRightColor: branding.accentColor, borderBottomColor: branding.accentColor, borderLeftColor: branding.accentColor, borderTopColor: 'transparent' }} />
              </div>
            ) : allTables.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400">
                <Utensils size={48} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">No hay mesas</p>
                <p className="text-sm">{searchQuery ? 'No se encontraron resultados' : 'Configura mesas en este piso'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2.5 md:gap-3">
                {allTables.map(table => {
                  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
                  const isSelected = selectedTable?.id === table.id;
                  const secondaryInfo = getTableSecondaryInfo(table);
                  const isOccupied = table.status === 'occupied';
                  const isLongWait = isOccupied && table.opened_at && getDurationMinutes(table.opened_at) > 60;

                  return (
                    <button key={table.id} onClick={() => handleTableClick(table)}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2 transition-all duration-150 min-h-[80px] md:min-h-[90px] ${cfg.cardBg} ${cfg.cardBorder} ${isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-1 scale-[1.03] shadow-lg'
                        : 'hover:shadow-md hover:scale-[1.02]'} ${table.shape === 'circle' ? 'rounded-full' : ''}`}>
                      {isLongWait && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative h-3 w-3 rounded-full bg-red-500" />
                        </span>
                      )}
                      {isOccupied && table.guest_count && (
                        <span className="absolute -top-1.5 -left-1.5 flex items-center gap-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          <Users size={8} /> {table.guest_count}
                        </span>
                      )}
                      <span className={`text-base md:text-lg font-bold ${cfg.text}`}>{table.number}</span>
                      {secondaryInfo ? (
                        <span className={`text-[11px] md:text-xs font-semibold mt-0.5 ${secondaryInfo.color} flex items-center gap-0.5`}>
                          {secondaryInfo.icon && <secondaryInfo.icon size={10} />}
                          {secondaryInfo.text}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                          <Users size={9} /> {table.capacity}
                        </span>
                      )}
                      {table.merged_with && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-1.5 py-0 text-[8px] font-bold text-white">
                          <Merge size={8} className="inline" /> M
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ RIGHT PANEL ═══ */}
          {selectedTable && (
            <div className="w-80 xl:w-96 border-l bg-white flex-col shrink-0 hidden md:flex">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 font-bold ${STATUS_CONFIG[selectedTable.status]?.cardBg} ${STATUS_CONFIG[selectedTable.status]?.cardBorder} ${STATUS_CONFIG[selectedTable.status]?.text}`}>
                    {selectedTable.number}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Mesa {selectedTable.number}</h2>
                    <div className={`flex items-center gap-1 text-xs font-medium ${STATUS_CONFIG[selectedTable.status]?.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedTable.status]?.dot}`} />
                      {STATUS_CONFIG[selectedTable.status]?.label}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setSelectedTable(null); setTableOrder(null); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Capacidad</p>
                    <p className="text-lg font-bold text-gray-900 flex items-center gap-1"><Users size={16} className="text-gray-400" /> {selectedTable.capacity}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Forma</p>
                    <p className="text-lg font-bold text-gray-900">{selectedTable.shape === 'circle' ? '⬤ Circular' : '▬ Rect.'}</p>
                  </div>
                  {selectedTable.status === 'occupied' && selectedTable.opened_at && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Duración</p>
                      <p className={`text-lg font-bold flex items-center gap-1 ${getDurationColor(getDurationMinutes(selectedTable.opened_at))}`}>
                        <Clock size={16} /> {formatDuration(selectedTable.opened_at)}
                      </p>
                    </div>
                  )}
                  {selectedTable.guest_count && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Comensales</p>
                      <p className="text-lg font-bold text-gray-900">{selectedTable.guest_count}</p>
                    </div>
                  )}
                </div>

                {tableOrder && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-rose-900">{tableOrder.orderNumber}</h3>
                      <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-medium text-rose-800">{tableOrder.status}</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {tableOrder.items?.filter((i: any) => !i.isVoid).map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-rose-800 truncate mr-2">{parseFloat(item.quantity)}× {item.product?.name || item.productName}</span>
                          <span className="font-medium text-rose-900 shrink-0">{formatMoney(parseFloat(item.subtotal))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-rose-200 pt-2 text-base font-bold text-rose-900">
                      <span>Total</span>
                      <span>{formatMoney(parseFloat(tableOrder.total))}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-4 space-y-2">
                {selectedTable.status === 'available' && (
                  <button onClick={() => setShowOpenDialog(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: branding.accentColor }}>
                    <Plus size={18} /> Abrir Mesa
                  </button>
                )}
                {selectedTable.status === 'occupied' && tableOrder && (
                  <>
                    <button onClick={handleGoToOrder}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: branding.accentColor }}>
                      <LayoutGrid size={18} /> Ir a la Orden
                    </button>
                    <button onClick={handleCloseTable} disabled={actionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50">
                      Liberar Mesa
                    </button>
                  </>
                )}
                {(selectedTable.status === 'reserved' || selectedTable.status === 'cleaning') && (
                  <button onClick={handleCloseTable} disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition hover:opacity-90 bg-emerald-500 hover:bg-emerald-600">
                    Marcar Disponible
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ BOTTOM: View mode selector ═══ */}
        <div className="flex items-center justify-center gap-1 bg-white border-t px-3 py-1.5 shrink-0">
          {VIEW_MODES.map(mode => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.key;
            return (
              <button key={mode.key} onClick={() => setViewMode(mode.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                style={isActive ? { backgroundColor: branding.accentColor } : {}}>
                <Icon size={14} />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══ MOBILE: Selected table bottom sheet ═══ */}
        {selectedTable && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setSelectedTable(null); setTableOrder(null); }} />
            <div className="relative mt-auto rounded-t-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-gray-300" /></div>
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-bold ${STATUS_CONFIG[selectedTable.status]?.cardBg} ${STATUS_CONFIG[selectedTable.status]?.cardBorder} ${STATUS_CONFIG[selectedTable.status]?.text}`}>
                    {selectedTable.number}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Mesa {selectedTable.number}</h2>
                    <span className={`text-sm font-medium ${STATUS_CONFIG[selectedTable.status]?.text}`}>{STATUS_CONFIG[selectedTable.status]?.label}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedTable(null); setTableOrder(null); }} className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
              </div>
              {tableOrder && (
                <div className="mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-rose-900 text-sm">{tableOrder.orderNumber}</span>
                    <span className="font-bold text-rose-900">{formatMoney(parseFloat(tableOrder.total))}</span>
                  </div>
                  <p className="text-xs text-rose-700">{tableOrder.items?.filter((i: any) => !i.isVoid).length} items</p>
                </div>
              )}
              <div className="px-4 pb-4 space-y-2">
                {selectedTable.status === 'available' && (
                  <button onClick={() => setShowOpenDialog(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white"
                    style={{ backgroundColor: branding.accentColor }}>
                    <Plus size={18} /> Abrir Mesa
                  </button>
                )}
                {selectedTable.status === 'occupied' && tableOrder && (
                  <>
                    <button onClick={handleGoToOrder}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white"
                      style={{ backgroundColor: branding.accentColor }}>
                      <LayoutGrid size={18} /> Ir a la Orden
                    </button>
                    <button onClick={handleCloseTable} disabled={actionLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-medium text-gray-600">
                      Liberar Mesa
                    </button>
                  </>
                )}
                {(selectedTable.status === 'reserved' || selectedTable.status === 'cleaning') && (
                  <button onClick={handleCloseTable} disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white bg-emerald-500">
                    Marcar Disponible
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ OPEN TABLE DIALOG ═══ */}
        {showOpenDialog && selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOpenDialog(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900">Abrir Mesa {selectedTable.number}</h3>
              <p className="mt-1 text-sm text-gray-500">Se creará una nueva orden para esta mesa.</p>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Número de comensales</label>
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg text-gray-600 hover:bg-gray-50">−</button>
                  <span className="text-3xl font-bold text-gray-900 w-16 text-center">{guestCount}</span>
                  <button onClick={() => setGuestCount(Math.min(20, guestCount + 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg text-gray-600 hover:bg-gray-50">+</button>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowOpenDialog(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleOpenTable} disabled={actionLoading}
                  className="flex-1 rounded-xl py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: branding.accentColor }}>
                  {actionLoading ? 'Abriendo...' : 'Abrir Mesa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
