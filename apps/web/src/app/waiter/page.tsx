'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore } from '@/lib/use-theme';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import {
  ChefHat, Clock, Send, Plus, X, ChevronLeft, ChevronRight,
  Search, MessageSquare, Check, Flame, Utensils, ShoppingCart,
  Pencil, RefreshCw,
} from 'lucide-react';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';

const QUICK_NOTES = [
  'Sin picante', 'Extra picante', 'Sin cebolla', 'Sin sal', 'Sin gluten',
  'Término medio', 'Bien cocido', '3/4', 'Sin hielo', 'Doble porción',
  'Para compartir', 'Sin lactosa', 'Alérgico maní', 'Sin salsa',
];

const KITCHEN_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  preparing: { label: 'Preparando', color: 'text-blue-700', bg: 'bg-blue-100', icon: Flame },
  ready: { label: 'Listo', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Check },
  delivered: { label: 'Entregado', color: 'text-gray-500', bg: 'bg-gray-100', icon: Check },
};

interface WaiterTable {
  table_id: string; table_number: number; capacity: number; shape: string; status: string;
  order_id: string; order_number: string; order_status: string; total: string; created_at: string;
  items_count: number; items: any[] | null; zone_name: string; zone_color: string; metadata: any;
}

function timeSince(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};

export default function WaiterPage() {
  const router = useRouter();
  const store = usePosStore();
  const branding = useThemeStore(s => s.branding);
  const [tables, setTables] = useState<WaiterTable[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { connected, on: wsOn } = useSocket({ rooms: ['tables', 'kitchen'] });

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
    const i = setInterval(loadTables, 15000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const u = [
      wsOn(WS_EVENTS.KITCHEN_ITEM_UPDATED, () => loadTables()),
      wsOn(WS_EVENTS.KITCHEN_ORDER_BUMPED, () => loadTables()),
      wsOn(WS_EVENTS.ORDER_PAID, () => loadTables()),
    ];
    return () => u.forEach(fn => fn());
  }, [wsOn]);

  const loadData = async () => {
    await Promise.all([loadTables(), loadProducts()]);
  };

  const loadTables = async () => {
    try {
      const d = await api.request<WaiterTable[]>('/tables/my-tables');
      setTables(d);
      setLoading(false);
    } catch { setLoading(false); }
  };

  const loadProducts = async () => {
    try {
      const d = await api.request<any>('/products?limit=200');
      const prods = Array.isArray(d) ? d : d.data || [];
      setProducts(prods);
      const cats = [...new Map(prods.filter((p: any) => p.category_name || p.categoryName).map((p: any) => [p.category_id || p.categoryId, { id: p.category_id || p.categoryId, name: p.category_name || p.categoryName }])).values()];
      setCategories(cats);
    } catch {}
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadTables();
    setRefreshing(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const activeTable = tables[activeIdx];

  // Swipe handling
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0 && activeIdx < tables.length - 1) setActiveIdx(activeIdx + 1);
      if (dx > 0 && activeIdx > 0) setActiveIdx(activeIdx - 1);
    }
    touchStart.current = null;
  };

  const handleAddItem = async (product: any) => {
    if (!activeTable) return;
    setSending(true);
    try {
      await api.request(`/orders/${activeTable.order_id}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id || product.product_id, quantity: 1 }),
      });
      showToast(`${product.name || product.product_name} agregado`);
      await loadTables();
    } catch (e: any) { showToast('Error: ' + e.message); }
    setSending(false);
  };

  const handleSendToKitchen = async () => {
    if (!activeTable) return;
    setSending(true);
    try {
      const r: any = await api.post(`/kitchen/fire/${activeTable.order_id}`, {});
      showToast(r.sent > 0 ? `Enviado: ${r.sent} items a cocina` : 'Ya todo fue enviado');
      await loadTables();
    } catch { showToast('Error al enviar'); }
    setSending(false);
  };

  const handleSaveNotes = async () => {
    if (!showNotes || !activeTable) return;
    setSending(true);
    try {
      await api.request(`/orders/${activeTable.order_id}/items/${showNotes}/notes`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText }),
      });
      showToast('Nota guardada');
      setShowNotes(null);
      await loadTables();
    } catch { showToast('Error al guardar nota'); }
    setSending(false);
  };

  const filteredProducts = products.filter(p => {
    if (searchQuery) return (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory) return (p.category_id || p.categoryId) === activeCategory;
    return true;
  });

  const itemsWithKitchen = activeTable?.items || [];
  const pendingItems = itemsWithKitchen.filter((i: any) => !i.kitchenStatus);
  const kitchenItems = itemsWithKitchen.filter((i: any) => i.kitchenStatus);

  if (loading) return (
    <AppShell>
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderTopColor: 'transparent', borderRightColor: branding.accentColor, borderBottomColor: branding.accentColor, borderLeftColor: branding.accentColor }} />
    </div>
    </AppShell>
  );

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50 overflow-hidden select-none">
      {/* ═══ WAITER TOOLBAR ═══ */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b shrink-0">
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-blue-600" />
          <div>
            <h1 className="text-sm font-bold text-gray-900">Modo Mesero</h1>
            <p className="text-[10px] text-gray-400">{store.user?.firstName} · {tables.length} mesa{tables.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className={`rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-8">
          <Utensils size={56} className="mb-4 opacity-30" />
          <p className="text-lg font-semibold text-gray-600">Sin mesas asignadas</p>
          <p className="text-sm text-center mt-1">Abre una mesa desde la sección Mesas para empezar a tomar pedidos</p>
          <button onClick={() => router.push('/tables')} className="mt-6 rounded-xl px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: branding.accentColor }}>
            Ir a Mesas
          </button>
        </div>
      ) : (
        <>
          {/* ═══ TABLE TABS (swipeable) ═══ */}
          <div className="flex items-center gap-1.5 bg-white border-b px-3 py-2 overflow-x-auto shrink-0 scrollbar-hide">
            {tables.map((t, i) => {
              const isActive = i === activeIdx;
              return (
                <button key={t.table_id} onClick={() => setActiveIdx(i)}
                  className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${isActive ? 'text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={isActive ? { backgroundColor: t.zone_color || branding.accentColor } : {}}>
                  <span className="text-base">{t.table_number}</span>
                  <div className={`flex items-center gap-1 text-[10px] ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                    <Clock size={10} />{timeSince(t.created_at)}
                  </div>
                  {pendingItems.length > 0 && i === activeIdx && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-white">{pendingItems.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══ TABLE CONTENT (swipe area) ═══ */}
          <div className="flex-1 overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {activeTable && (
              <div className="flex flex-col h-full">
                {/* Order header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">Mesa {activeTable.table_number}</span>
                      {activeTable.zone_name && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: activeTable.zone_color || '#6b7280' }}>{activeTable.zone_name}</span>}
                    </div>
                    <p className="text-[11px] text-gray-400">{activeTable.order_number} · {activeTable.items_count} items · {formatMoney(toNum(activeTable.total))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeIdx > 0 && <button onClick={() => setActiveIdx(activeIdx - 1)} className="rounded-lg p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200"><ChevronLeft size={16} /></button>}
                    {activeIdx < tables.length - 1 && <button onClick={() => setActiveIdx(activeIdx + 1)} className="rounded-lg p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200"><ChevronRight size={16} /></button>}
                  </div>
                </div>

                {/* Items list */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  {/* Pending items (not sent to kitchen) */}
                  {pendingItems.length > 0 && (
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700"><Clock size={10} /> Sin enviar ({pendingItems.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {pendingItems.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{parseFloat(item.quantity)}x {item.productName}</p>
                              {item.notes && <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1"><MessageSquare size={10} />{item.notes}</p>}
                            </div>
                            <button onClick={() => { setShowNotes(item.id); setNoteText(item.notes || ''); }}
                              className="shrink-0 rounded-lg p-2 text-amber-600 hover:bg-amber-100">
                              <Pencil size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kitchen items */}
                  {kitchenItems.length > 0 && (
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500"><ChefHat size={10} /> En cocina ({kitchenItems.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {kitchenItems.map((item: any) => {
                          const ks = KITCHEN_STATUS[item.kitchenStatus] || KITCHEN_STATUS.pending;
                          const Icon = ks.icon;
                          return (
                            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                              <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${ks.bg}`}><Icon size={14} className={ks.color} /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{parseFloat(item.quantity)}x {item.productName}</p>
                                {item.notes && <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1"><MessageSquare size={10} />{item.notes}</p>}
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ks.bg} ${ks.color}`}>{ks.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {itemsWithKitchen.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <ShoppingCart size={40} className="mb-2 opacity-30" />
                      <p className="text-sm font-medium">Orden vacía</p>
                      <p className="text-xs">Agrega items con el botón +</p>
                    </div>
                  )}
                  <div className="h-4" />
                </div>

                {/* ═══ BOTTOM ACTIONS ═══ */}
                <div className="border-t bg-white px-4 py-3 space-y-2 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {pendingItems.length > 0 && (
                    <button onClick={handleSendToKitchen} disabled={sending}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: '#ef4444' }}>
                      <Send size={18} /> Enviar {pendingItems.length} item{pendingItems.length > 1 ? 's' : ''} a Cocina
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddItem(true)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition active:scale-[0.98]"
                      style={{ backgroundColor: branding.accentColor }}>
                      <Plus size={18} /> Agregar Item
                    </button>
                    <button onClick={() => router.push(`/pos?orderId=${activeTable.order_id}&tableId=${activeTable.table_id}&tableNumber=${activeTable.table_number}`)}
                      className="rounded-xl px-4 py-3 border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                      POS
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Swipe dots */}
          {tables.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-1 bg-white border-t shrink-0">
              {tables.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-4' : 'w-1.5'}`} style={{ backgroundColor: i === activeIdx ? (tables[i]?.zone_color || branding.accentColor) : '#d1d5db' }} />)}
            </div>
          )}
        </>
      )}

      {/* ═══ ADD ITEM SHEET ═══ */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddItem(false)} />
          <div className="relative mt-12 flex-1 flex flex-col bg-white rounded-t-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <h3 className="text-base font-bold text-gray-900">Agregar Item</h3>
              <button onClick={() => setShowAddItem(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="px-4 py-2 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActiveCategory(null); }}
                  placeholder="Buscar producto..." autoFocus
                  className="w-full rounded-xl bg-gray-100 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
              </div>
            </div>
            {!searchQuery && (
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto shrink-0 scrollbar-hide border-b">
                <button onClick={() => setActiveCategory(null)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!activeCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Todo</button>
                {categories.map(c => <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeCategory === c.id ? 'text-white' : 'bg-gray-100 text-gray-600'}`} style={activeCategory === c.id ? { backgroundColor: branding.accentColor } : {}}>{c.name}</button>)}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map(p => (
                  <button key={p.id || p.product_id} onClick={() => { handleAddItem(p); }}
                    disabled={sending}
                    className="flex flex-col items-start rounded-xl border border-gray-200 bg-white p-3 text-left transition active:scale-[0.97] hover:border-blue-300 hover:shadow-sm disabled:opacity-50">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name || p.product_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.category_name || p.categoryName || ''}</p>
                    <p className="text-sm font-bold mt-auto pt-1" style={{ color: branding.accentColor }}>{formatMoney(toNum(p.price))}</p>
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No se encontraron productos</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ NOTES SHEET ═══ */}
      {showNotes && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNotes(null)} />
          <div className="relative mt-auto rounded-t-2xl bg-white shadow-2xl max-h-[75vh] flex flex-col">
            <div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-gray-300" /></div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-base font-bold text-gray-900">Notas del item</h3>
              <button onClick={() => setShowNotes(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTES.map(note => {
                  const isSelected = noteText.includes(note);
                  return (
                    <button key={note}
                      onClick={() => {
                        if (isSelected) setNoteText(noteText.replace(note, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim());
                        else setNoteText(noteText ? `${noteText}, ${note}` : note);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${isSelected ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      style={isSelected ? { backgroundColor: branding.accentColor } : {}}>
                      {note}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-4 pb-3">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Nota personalizada..."
                rows={2}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
            </div>
            <div className="px-4 pb-4 flex gap-2" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button onClick={() => { setNoteText(''); }} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Limpiar</button>
              <button onClick={handleSaveNotes} disabled={sending}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: branding.accentColor }}>
                {sending ? 'Guardando...' : 'Guardar Nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST ═══ */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
    </AppShell>
  );
}