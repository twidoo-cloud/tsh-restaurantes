'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { Plus, Tag, Percent, DollarSign, Clock, Gift, Ticket,
  ToggleLeft, ToggleRight, Trash2, Edit2, X, Search, Check, Package, Layers, ShoppingCart } from 'lucide-react';

const PROMO_TYPES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  percentage: { label: 'Porcentaje', icon: Percent, color: 'text-blue-700', bg: 'bg-blue-100' },
  fixed_amount: { label: 'Monto Fijo', icon: DollarSign, color: 'text-green-700', bg: 'bg-green-100' },
  buy_x_get_y: { label: 'NxM', icon: Gift, color: 'text-purple-700', bg: 'bg-purple-100' },
  happy_hour: { label: 'Happy Hour', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100' },
  coupon: { label: 'Cupón', icon: Ticket, color: 'text-pink-700', bg: 'bg-pink-100' } };

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const emptyForm = () => ({
  name: '', description: '', promoType: 'percentage', discountValue: '',
  buyQuantity: '2', getQuantity: '1', scope: 'order',
  productIds: [] as string[], categoryIds: [] as string[],
  couponCode: '', minOrderAmount: '', maxDiscountAmount: '',
  maxUses: '', maxUsesPerOrder: '1',
  startDate: '', endDate: '',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as number[],
  startTime: '', endTime: '',
  isAutomatic: true, priority: '0', stackable: false });

export default function PromotionsPage() {
  const router = useRouter();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => { refreshBranding(); load(); loadRefs(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.request<any>('/promotions?limit=100');
      setPromos(r.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadRefs = async () => {
    try {
      const [c, p] = await Promise.all([api.getCategories(), api.getProducts()]);
      setCategories(c); setProducts(p.data || []);
    } catch {}
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name || '', description: p.description || '', promoType: p.promoType,
      discountValue: p.discountValue?.toString() || '', buyQuantity: p.buyQuantity?.toString() || '2',
      getQuantity: p.getQuantity?.toString() || '1', scope: p.scope,
      productIds: p.productIds || [], categoryIds: p.categoryIds || [],
      couponCode: p.couponCode || '',
      minOrderAmount: p.minOrderAmount ? parseFloat(p.minOrderAmount).toString() : '',
      maxDiscountAmount: p.maxDiscountAmount ? parseFloat(p.maxDiscountAmount).toString() : '',
      maxUses: p.maxUses?.toString() || '', maxUsesPerOrder: p.maxUsesPerOrder?.toString() || '1',
      startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 16) : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 16) : '',
      daysOfWeek: p.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      startTime: p.startTime || '', endTime: p.endTime || '',
      isAutomatic: p.isAutomatic, priority: p.priority?.toString() || '0', stackable: p.stackable || false });
    setEditId(p.id); setShowForm(true);
  };

  const save = async () => {
    setError('');
    try {
      const payload: any = {
        name: form.name, description: form.description || undefined, promoType: form.promoType,
        discountValue: parseFloat(form.discountValue) || 0, scope: form.scope,
        productIds: form.scope === 'product' ? form.productIds : [],
        categoryIds: form.scope === 'category' ? form.categoryIds : [],
        couponCode: form.promoType === 'coupon' ? form.couponCode : undefined,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        maxUsesPerOrder: parseInt(form.maxUsesPerOrder) || 1,
        startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        daysOfWeek: form.daysOfWeek, startTime: form.startTime || undefined, endTime: form.endTime || undefined,
        isAutomatic: form.promoType === 'coupon' ? false : form.isAutomatic,
        priority: parseInt(form.priority) || 0, stackable: form.stackable };
      if (form.promoType === 'buy_x_get_y') {
        payload.buyQuantity = parseInt(form.buyQuantity) || 2;
        payload.getQuantity = parseInt(form.getQuantity) || 1;
      }
      if (editId) {
        await api.request(`/promotions/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api.request('/promotions', { method: 'POST', body: JSON.stringify(payload) });
      }
      await load(); setShowForm(false); setEditId(null); setForm(emptyForm());
      setSuccess(editId ? 'Actualizada' : 'Creada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const toggle = async (id: string) => {
    try { await api.request(`/promotions/${id}/toggle`, { method: 'PATCH' }); await load(); } catch (e: any) { setError(e.message); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try { await api.request(`/promotions/${id}`, { method: 'DELETE' }); await load(); } catch (e: any) { setError(e.message); }
  };

  const toggleDay = (d: number) => setForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d] }));
  const toggleProd = (id: string) => setForm(f => ({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter(x => x !== id) : [...f.productIds, id] }));
  const toggleCat = (id: string) => setForm(f => ({ ...f, categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter(x => x !== id) : [...f.categoryIds, id] }));

  const filtered = promos.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && p.promoType !== filterType) return false;
    return true;
  });

  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Promociones y Descuentos</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { setForm(emptyForm()); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: branding.accentColor }}>
            <Plus size={18} /> Nueva
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 space-y-4">
        {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
        {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600"><Check size={16} />{success}</div>}

        {/* Search & Filter */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setFilterType('')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${!filterType ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={!filterType ? { backgroundColor: branding.accentColor } : {}}>Todas</button>
            {Object.entries(PROMO_TYPES).map(([k, c]) => (
              <button key={k} onClick={() => setFilterType(filterType === k ? '' : k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filterType === k ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                style={filterType === k ? { backgroundColor: branding.accentColor } : {}}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', val: promos.length, color: 'text-gray-900' },
            { label: 'Activas', val: promos.filter(p => p.isActive).length, color: 'text-green-600' },
            { label: 'Happy Hour', val: promos.filter(p => p.promoType === 'happy_hour').length, color: 'text-amber-600' },
            { label: 'Cupones', val: promos.filter(p => p.promoType === 'coupon').length, color: 'text-pink-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Tag size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No hay promociones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const cfg = PROMO_TYPES[p.promoType] || PROMO_TYPES.percentage;
              const Icon = cfg.icon;
              const desc = p.promoType === 'buy_x_get_y'
                ? `Compra ${p.buyQuantity}, lleva ${p.buyQuantity + p.getQuantity}`
                : p.promoType === 'fixed_amount'
                  ? `${formatMoney(parseFloat(p.discountValue))} off`
                  : `${parseFloat(p.discountValue)}% off`;
              return (
                <div key={p.id} className={`rounded-xl border bg-white p-4 transition ${!p.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}><Icon size={20} className={cfg.color} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          {p.couponCode && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-700">{p.couponCode}</span>}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">{desc} · {p.scope === 'order' ? 'Orden' : p.scope === 'product' ? 'Productos' : 'Categorías'}</p>
                        {p.startTime && p.endTime && <p className="text-xs text-amber-600 mt-0.5"><Clock size={12} className="inline mr-1" />{p.startTime} - {p.endTime}{p.daysOfWeek?.length < 7 && ` · ${p.daysOfWeek.map((d: number) => DAYS[d]).join(', ')}`}</p>}
                        {p.maxUses && <p className="text-xs text-gray-400 mt-0.5">Usos: {p.currentUses}/{p.maxUses}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggle(p.id)} className="rounded-lg p-1.5 hover:bg-gray-100">
                        {p.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-400" />}
                      </button>
                      <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => del(p.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }} />
          <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Editar' : 'Nueva'} Promoción</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                <input type="text" value={form.name} onChange={e => F('name', e.target.value)} placeholder="Ej: Happy Hour Cervezas"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                <input type="text" value={form.description} onChange={e => F('description', e.target.value)} placeholder="Opcional"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              {/* Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de promoción</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(PROMO_TYPES).map(([k, c]) => {
                    const I = c.icon;
                    return (
                      <button key={k} onClick={() => F('promoType', k)}
                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${form.promoType === k ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <I size={16} /> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Discount value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {form.promoType === 'fixed_amount' ? 'Monto ($)' : form.promoType === 'buy_x_get_y' ? 'Compra (N)' : 'Descuento (%)'}
                  </label>
                  {form.promoType === 'buy_x_get_y' ? (
                    <div className="flex gap-2">
                      <input type="number" value={form.buyQuantity} onChange={e => F('buyQuantity', e.target.value)} placeholder="2" min="1"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                      <span className="flex items-center text-sm text-gray-500">×</span>
                      <input type="number" value={form.getQuantity} onChange={e => F('getQuantity', e.target.value)} placeholder="1" min="1"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                    </div>
                  ) : (
                    <input type="number" value={form.discountValue} onChange={e => F('discountValue', e.target.value)} placeholder="10" step="0.01"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tope máximo ($)</label>
                  <input type="number" value={form.maxDiscountAmount} onChange={e => F('maxDiscountAmount', e.target.value)} placeholder="Sin tope" step="0.01"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              {/* Scope */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Aplica a</label>
                <div className="flex gap-2">
                  {[{ k: 'order', l: 'Orden', i: ShoppingCart }, { k: 'product', l: 'Productos', i: Package }, { k: 'category', l: 'Categorías', i: Layers }].map(s => {
                    const I = s.i;
                    return (
                      <button key={s.k} onClick={() => F('scope', s.k)}
                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium ${form.scope === s.k ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                        <I size={16} /> {s.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Product/Category selection */}
              {form.scope === 'product' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Productos</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProd(p.id)} className="rounded" />
                        <span className="text-sm text-gray-700">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{formatMoney(parseFloat(p.price))}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {form.scope === 'category' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Categorías</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                    {categories.map(c => (
                      <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCat(c.id)} className="rounded" />
                        <span className="text-sm text-gray-700">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Coupon code */}
              {form.promoType === 'coupon' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Código de cupón</label>
                  <input type="text" value={form.couponCode} onChange={e => F('couponCode', e.target.value.toUpperCase())} placeholder="PROMO10"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-gray-900 uppercase focus:border-blue-400 focus:outline-none" />
                </div>
              )}
              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
                  <input type="datetime-local" value={form.startDate} onChange={e => F('startDate', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
                  <input type="datetime-local" value={form.endDate} onChange={e => F('endDate', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              {/* Time range (happy hour) */}
              {(form.promoType === 'happy_hour' || form.startTime || form.endTime) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Hora inicio</label>
                    <input type="time" value={form.startTime} onChange={e => F('startTime', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Hora fin</label>
                    <input type="time" value={form.endTime} onChange={e => F('endTime', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              )}
              {/* Days of week */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Días</label>
                <div className="flex gap-1.5">
                  {DAYS.map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                        form.daysOfWeek.includes(i) ? 'text-white' : 'border border-gray-300 text-gray-500'
                      }`} style={form.daysOfWeek.includes(i) ? { backgroundColor: branding.accentColor } : {}}>{d}</button>
                  ))}
                </div>
              </div>
              {/* Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mín. orden ($)</label>
                  <input type="number" value={form.minOrderAmount} onChange={e => F('minOrderAmount', e.target.value)} placeholder="0" step="0.01"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Usos máx.</label>
                  <input type="number" value={form.maxUses} onChange={e => F('maxUses', e.target.value)} placeholder="Ilimitado"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prioridad</label>
                  <input type="number" value={form.priority} onChange={e => F('priority', e.target.value)} placeholder="0"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isAutomatic} onChange={e => F('isAutomatic', e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">Automática</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.stackable} onChange={e => F('stackable', e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">Acumulable</span>
                </label>
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={save} disabled={!form.name || (!form.discountValue && form.promoType !== 'buy_x_get_y')}
                className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: branding.accentColor }}>
                {editId ? 'Guardar Cambios' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
