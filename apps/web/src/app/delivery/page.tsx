'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { Plus, Truck, X, Check, Phone, MapPin, Clock, Search,
  Settings, Package, ShoppingBag, ChevronRight, User, Bike, Store,
  AlertCircle, Trash2, Edit2 } from 'lucide-react';

const STATUS_FLOW = ['pending','confirmed','preparing','ready','out_for_delivery','delivered'];
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:          { label: 'Pendiente',    color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertCircle },
  confirmed:        { label: 'Confirmado',   color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Check },
  preparing:        { label: 'Preparando',   color: 'text-orange-700', bg: 'bg-orange-100', icon: Package },
  ready:            { label: 'Listo',        color: 'text-green-700',  bg: 'bg-green-100',  icon: ShoppingBag },
  out_for_delivery: { label: 'En camino',    color: 'text-purple-700', bg: 'bg-purple-100', icon: Bike },
  delivered:        { label: 'Entregado',    color: 'text-gray-700',   bg: 'bg-gray-100',   icon: Check },
  cancelled:        { label: 'Cancelado',    color: 'text-red-700',    bg: 'bg-red-100',    icon: X } };

const ACTIONS: Record<string, { label: string; action: string; color: string }[]> = {
  pending:          [{ label: 'Confirmar', action: 'confirm', color: 'bg-blue-600' }],
  confirmed:        [{ label: 'Preparar', action: 'prepare', color: 'bg-orange-600' }],
  preparing:        [{ label: 'Listo', action: 'ready', color: 'bg-green-600' }],
  ready:            [{ label: 'Despachar', action: 'dispatch', color: 'bg-purple-600' }, { label: 'Entregado', action: 'deliver', color: 'bg-gray-600' }],
  out_for_delivery: [{ label: 'Entregado', action: 'deliver', color: 'bg-green-600' }] };

export default function DeliveryPage() {
  const router = useRouter();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState<any>({});

  // New order form
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    deliveryType: 'delivery', addressLine1: '', addressLine2: '', addressReference: '',
    city: '', zoneId: '', paymentMethod: 'cash', source: 'phone', notes: '',
    items: [] as { productId: string; name: string; price: number; quantity: number; notes: string }[] });

  useEffect(() => { refreshBranding(); loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        api.request<any>('/delivery/orders?limit=100'),
        api.request<any>('/delivery/orders/dashboard'),
      ]);
      setOrders(r.data || []); setDashboard(d);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadZones = async () => {
    try { const z = await api.request<any>('/delivery/zones'); setZones(z || []); } catch {}
  };

  const loadProducts = async () => {
    try { const p = await api.getProducts(); setProducts(p.data || []); } catch {}
  };

  const loadSettings = async () => {
    try { const s = await api.request<any>('/delivery/settings'); setSettings(s); setSettingsForm(s); } catch {}
  };

  const openNew = () => {
    setForm({ customerName: '', customerPhone: '', customerEmail: '', deliveryType: 'delivery',
      addressLine1: '', addressLine2: '', addressReference: '', city: '', zoneId: '',
      paymentMethod: 'cash', source: 'phone', notes: '', items: [] });
    loadZones(); loadProducts(); setShowForm(true);
  };

  const addItem = (p: any) => {
    setForm(f => {
      const existing = f.items.find(i => i.productId === p.id);
      if (existing) {
        return { ...f, items: f.items.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { ...f, items: [...f.items, { productId: p.id, name: p.name, price: parseFloat(p.price), quantity: 1, notes: '' }] };
    });
  };

  const removeItem = (productId: string) => setForm(f => ({ ...f, items: f.items.filter(i => i.productId !== productId) }));
  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return removeItem(productId);
    setForm(f => ({ ...f, items: f.items.map(i => i.productId === productId ? { ...i, quantity: qty } : i) }));
  };

  const itemsTotal = form.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedZone = zones.find(z => z.id === form.zoneId);
  const deliveryFee = form.deliveryType === 'delivery' ? (selectedZone ? parseFloat(selectedZone.delivery_fee) : parseFloat(settings.default_delivery_fee) || 0) : 0;

  const save = async () => {
    setError('');
    try {
      await api.request('/delivery/orders', { method: 'POST', body: JSON.stringify({
        customerName: form.customerName, customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        deliveryType: form.deliveryType,
        addressLine1: form.addressLine1 || undefined, addressLine2: form.addressLine2 || undefined,
        addressReference: form.addressReference || undefined, city: form.city || undefined,
        zoneId: form.zoneId || undefined, paymentMethod: form.paymentMethod, source: form.source,
        notes: form.notes || undefined,
        items: form.items.map(i => ({ productId: i.productId, quantity: i.quantity, notes: i.notes || undefined })) }) });
      setShowForm(false); await loadAll();
      setSuccess('Pedido creado'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const doAction = async (id: string, action: string) => {
    try {
      await api.request(`/delivery/orders/${id}/${action}`, { method: 'PATCH', body: '{}' });
      await loadAll();
    } catch (e: any) { setError(e.message); }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    try {
      await api.request(`/delivery/orders/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: 'Cancelado por restaurante' }) });
      await loadAll();
    } catch (e: any) { setError(e.message); }
  };

  const viewDetail = async (id: string) => {
    try { const d = await api.request<any>(`/delivery/orders/${id}`); setShowDetail(d); } catch (e: any) { setError(e.message); }
  };

  const saveSettings = async () => {
    try {
      await api.request('/delivery/settings', { method: 'PUT', body: JSON.stringify({
        isEnabled: settingsForm.is_enabled, acceptsDelivery: settingsForm.accepts_delivery,
        acceptsPickup: settingsForm.accepts_pickup,
        defaultDeliveryFee: parseFloat(settingsForm.default_delivery_fee) || 0,
        freeDeliveryAbove: settingsForm.free_delivery_above ? parseFloat(settingsForm.free_delivery_above) : undefined,
        minOrderAmount: parseFloat(settingsForm.min_order_amount) || 0,
        estimatedDeliveryMinutes: settingsForm.estimated_delivery_minutes,
        estimatedPickupMinutes: settingsForm.estimated_pickup_minutes,
        deliveryHoursStart: settingsForm.delivery_hours_start, deliveryHoursEnd: settingsForm.delivery_hours_end,
        autoAcceptOrders: settingsForm.auto_accept_orders,
        whatsappNumber: settingsForm.whatsapp_number || undefined }) });
      setShowSettings(false); loadSettings();
      setSuccess('Configuración guardada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const SF = (k: string, v: any) => setSettingsForm((f: any) => ({ ...f, [k]: v }));

  const filtered = orders.filter(o => {
    if (statusFilter && o.delivery_status !== statusFilter) return false;
    if (typeFilter && o.delivery_type !== typeFilter) return false;
    if (search && !o.customer_name?.toLowerCase().includes(search.toLowerCase()) && !o.customer_phone?.includes(search) && !o.order_number?.includes(search)) return false;
    return true;
  });

  const activeOrders = orders.filter(o => !['delivered','cancelled'].includes(o.delivery_status));

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Delivery & Pedidos</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadSettings(); setShowSettings(true); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><Settings size={20} /></button>
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
              <Plus size={18} /> Nuevo Pedido
            </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 space-y-4">
        {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
        {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600"><Check size={16} />{success}</div>}

        {/* Dashboard stats */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: 'Pendientes', val: dashboard.pending || 0, color: 'text-yellow-600' },
            { label: 'Preparando', val: dashboard.preparing || 0, color: 'text-orange-600' },
            { label: 'Listos', val: dashboard.ready || 0, color: 'text-green-600' },
            { label: 'En camino', val: dashboard.out_for_delivery || 0, color: 'text-purple-600' },
            { label: 'Entregados', val: dashboard.delivered || 0, color: 'text-gray-600' },
            { label: 'Ventas', val: formatMoney(parseFloat(dashboard.revenue) || 0), color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-3 text-center">
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Search & filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, teléfono, orden..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <button onClick={() => setTypeFilter('')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${!typeFilter ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={!typeFilter ? { backgroundColor: branding.accentColor } : {}}>Todos</button>
            <button onClick={() => setTypeFilter(typeFilter === 'delivery' ? '' : 'delivery')}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${typeFilter === 'delivery' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={typeFilter === 'delivery' ? { backgroundColor: branding.accentColor } : {}}><Truck size={12} /> Delivery</button>
            <button onClick={() => setTypeFilter(typeFilter === 'pickup' ? '' : 'pickup')}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${typeFilter === 'pickup' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={typeFilter === 'pickup' ? { backgroundColor: branding.accentColor } : {}}><Store size={12} /> Pickup</button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1.5 overflow-x-auto">
          {[{ k: '', l: 'Todos' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} onClick={() => setStatusFilter(statusFilter === f.k ? '' : f.k)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusFilter === f.k ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={statusFilter === f.k ? { backgroundColor: branding.accentColor } : {}}>{f.l}</button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Truck size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No hay pedidos</p>
            <button onClick={openNew} className="mt-3 text-sm font-medium hover:underline" style={{ color: branding.accentColor }}>Crear pedido</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const st = STATUS_CFG[o.delivery_status] || STATUS_CFG.pending;
              const StIcon = st.icon;
              const actions = ACTIONS[o.delivery_status] || [];
              const mins = o.estimated_minutes;
              return (
                <div key={o.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0" onClick={() => viewDetail(o.id)} style={{ cursor: 'pointer' }}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${st.bg}`}>
                        {o.delivery_type === 'pickup' ? <Store size={20} className={st.color} /> : <StIcon size={20} className={st.color} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{o.customer_name}</h3>
                          <span className="text-xs font-mono text-gray-400">{o.order_number}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.bg} ${st.color}`}>{st.label}</span>
                          {o.delivery_type === 'pickup' && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">PICKUP</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Phone size={12} />{o.customer_phone}</span>
                          {o.address_line1 && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin size={12} />{o.address_line1}</span>}
                          {mins && <span className="flex items-center gap-1"><Clock size={12} />~{mins} min</span>}
                          <span className="font-semibold text-gray-900">{formatMoney(parseFloat(o.order_total))}</span>
                          {parseFloat(o.delivery_fee) > 0 && <span className="text-gray-400">+{formatMoney(parseFloat(o.delivery_fee))} envío</span>}
                        </div>
                        {o.driver_name && <p className="mt-0.5 text-xs text-purple-600"><User size={11} className="inline mr-1" />{o.driver_name} {o.driver_phone && `· ${o.driver_phone}`}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {actions.map(a => (
                        <button key={a.action} onClick={() => doAction(o.id, a.action)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${a.color} hover:opacity-90`}>
                          {a.label}
                        </button>
                      ))}
                      {!['delivered','cancelled'].includes(o.delivery_status) && (
                        <button onClick={() => cancelOrder(o.id)} className="rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">Cancelar</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ NEW ORDER MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-4 pb-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Nuevo Pedido</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {[{ k: 'delivery', l: 'Delivery', i: Truck }, { k: 'pickup', l: 'Pickup', i: Store }].map(t => {
                  const I = t.i;
                  return (
                    <button key={t.k} onClick={() => F('deliveryType', t.k)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition ${form.deliveryType === t.k ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                      <I size={18} /> {t.l}
                    </button>
                  );
                })}
              </div>
              {/* Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                  <input type="text" value={form.customerName} onChange={e => F('customerName', e.target.value)} placeholder="Cliente"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono *</label>
                  <input type="tel" value={form.customerPhone} onChange={e => F('customerPhone', e.target.value)} placeholder="0991234567"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              {/* Address (delivery only) */}
              {form.deliveryType === 'delivery' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Dirección *</label>
                    <input type="text" value={form.addressLine1} onChange={e => F('addressLine1', e.target.value)} placeholder="Calle y número"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={form.addressReference} onChange={e => F('addressReference', e.target.value)} placeholder="Referencia (ej: frente al parque)"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                    <select value={form.zoneId} onChange={e => F('zoneId', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                      <option value="">Zona (opcional)</option>
                      {zones.filter(z => z.is_active).map(z => (
                        <option key={z.id} value={z.id}>{z.name} — {formatMoney(parseFloat(z.delivery_fee))}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {/* Payment & source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Pago</label>
                  <select value={form.paymentMethod} onChange={e => F('paymentMethod', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Canal</label>
                  <select value={form.source} onChange={e => F('source', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                    <option value="phone">Teléfono</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="web">Web</option>
                    <option value="app">App</option>
                    <option value="uber_eats">Uber Eats</option>
                    <option value="rappi">Rappi</option>
                  </select>
                </div>
              </div>
              {/* Items */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Productos</label>
                <div className="mb-2 max-h-32 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {products.filter(p => p.isActive !== false).map(p => (
                      <button key={p.id} onClick={() => addItem(p)}
                        className="rounded-lg border border-gray-100 px-2 py-1.5 text-left text-xs hover:bg-blue-50 hover:border-blue-200">
                        <span className="font-medium text-gray-900 block truncate">{p.name}</span>
                        <span className="text-gray-500">{formatMoney(parseFloat(p.price))}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {form.items.length > 0 && (
                  <div className="space-y-1.5">
                    {form.items.map(item => (
                      <div key={item.productId} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <span className="flex-1 text-sm font-medium text-gray-900 truncate">{item.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="rounded bg-white px-2 py-0.5 text-sm font-bold border">−</button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="rounded bg-white px-2 py-0.5 text-sm font-bold border">+</button>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-16 text-right">{formatMoney(item.price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                      </div>
                    ))}
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatMoney(itemsTotal)}</span></div>
                      {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Envío</span><span>{formatMoney(deliveryFee)}</span></div>}
                      <div className="flex justify-between text-sm font-bold text-gray-900"><span>Total</span><span>{formatMoney(itemsTotal + deliveryFee)}</span></div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <input type="text" value={form.notes} onChange={e => F('notes', e.target.value)} placeholder="Instrucciones especiales"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={save} disabled={!form.customerName || !form.customerPhone || form.items.length === 0 || (form.deliveryType === 'delivery' && !form.addressLine1)}
                className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: branding.accentColor }}>
                Crear Pedido — {formatMoney(itemsTotal + deliveryFee)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetail(null)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">{showDetail.order_number}</h2>
              <button onClick={() => setShowDetail(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CFG[showDetail.delivery_status]?.bg} ${STATUS_CFG[showDetail.delivery_status]?.color}`}>
                  {STATUS_CFG[showDetail.delivery_status]?.label}
                </span>
                <span className="text-xs text-gray-400">{showDetail.delivery_type === 'pickup' ? 'Pickup' : 'Delivery'}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>{showDetail.customer_name}</strong></p>
                <p className="text-gray-500 flex items-center gap-1"><Phone size={14} />{showDetail.customer_phone}</p>
                {showDetail.address_line1 && <p className="text-gray-500 flex items-center gap-1"><MapPin size={14} />{showDetail.address_line1}{showDetail.address_reference && ` (${showDetail.address_reference})`}</p>}
              </div>
              {showDetail.items?.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Items:</p>
                  {showDetail.items.map((i: any) => (
                    <div key={i.id} className="flex justify-between text-sm py-0.5">
                      <span>{i.quantity}x {i.product_name}</span>
                      <span className="text-gray-700">{formatMoney(parseFloat(i.total))}</span>
                    </div>
                  ))}
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                    <span>Total</span><span>{formatMoney(parseFloat(showDetail.order_total))}</span>
                  </div>
                </div>
              )}
              {showDetail.notes && <p className="text-xs text-gray-500 italic">"{showDetail.notes}"</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SETTINGS MODAL ═══ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Configuración Delivery</h2>
              <button onClick={() => setShowSettings(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={settingsForm.accepts_delivery ?? true} onChange={e => SF('accepts_delivery', e.target.checked)} className="rounded" /><span className="text-sm text-gray-700">Acepta delivery</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={settingsForm.accepts_pickup ?? true} onChange={e => SF('accepts_pickup', e.target.checked)} className="rounded" /><span className="text-sm text-gray-700">Acepta pickup</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={settingsForm.auto_accept_orders ?? false} onChange={e => SF('auto_accept_orders', e.target.checked)} className="rounded" /><span className="text-sm text-gray-700">Auto-aceptar pedidos</span></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Costo envío ($)</label>
                  <input type="number" value={settingsForm.default_delivery_fee ?? 0} onChange={e => SF('default_delivery_fee', e.target.value)} step="0.5"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Envío gratis desde ($)</label>
                  <input type="number" value={settingsForm.free_delivery_above ?? ''} onChange={e => SF('free_delivery_above', e.target.value)} step="1" placeholder="Sin límite"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Pedido mínimo ($)</label>
                  <input type="number" value={settingsForm.min_order_amount ?? 0} onChange={e => SF('min_order_amount', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp</label>
                  <input type="text" value={settingsForm.whatsapp_number ?? ''} onChange={e => SF('whatsapp_number', e.target.value)} placeholder="+593..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hora inicio</label>
                  <input type="time" value={settingsForm.delivery_hours_start ?? '11:00'} onChange={e => SF('delivery_hours_start', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hora fin</label>
                  <input type="time" value={settingsForm.delivery_hours_end ?? '22:00'} onChange={e => SF('delivery_hours_end', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tiempo delivery (min)</label>
                  <input type="number" value={settingsForm.estimated_delivery_minutes ?? 45} onChange={e => SF('estimated_delivery_minutes', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tiempo pickup (min)</label>
                  <input type="number" value={settingsForm.estimated_pickup_minutes ?? 20} onChange={e => SF('estimated_pickup_minutes', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={saveSettings} className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
