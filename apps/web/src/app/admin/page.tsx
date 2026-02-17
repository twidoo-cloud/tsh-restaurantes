'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { usePermissions } from '@/lib/use-permissions';
import { api } from '@/lib/api';
import {
  Building2, Plus, Search, Users, ShoppingCart, Check, X, ChevronDown,
  ToggleLeft, ToggleRight, Edit3, Eye, Loader2, AlertCircle, Globe, Phone,
} from 'lucide-react';

const PLANS = ['basic', 'standard', 'premium', 'enterprise'];
const STATUSES = ['trial', 'active', 'suspended', 'cancelled'];
const VERTICALS = ['restaurant', 'cafe', 'bar', 'food_truck', 'bakery', 'other'];

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

export default function AdminPage() {
  const router = useRouter();
  const store = usePosStore();
  const { role } = usePermissions();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({ name: '', slug: '', verticalType: 'restaurant', countryCode: 'EC', currencyCode: 'USD', timezone: 'America/Guayaquil', phone: '', taxId: '', subscriptionPlan: 'basic', ownerEmail: '', ownerFirstName: '', ownerLastName: '', ownerPassword: '' });

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await api.get<any[]>('/tenants/admin/all');
      setTenants(data);
    } catch (e: any) { notify('Error: ' + e.message); }
    setLoading(false);
  };

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.ownerEmail || !form.ownerPassword) return;
    setSaving(true);
    try {
      await api.post('/tenants/admin/create', form);
      notify('Tenant creado exitosamente');
      setShowCreate(false);
      setForm({ name: '', slug: '', verticalType: 'restaurant', countryCode: 'EC', currencyCode: 'USD', timezone: 'America/Guayaquil', phone: '', taxId: '', subscriptionPlan: 'basic', ownerEmail: '', ownerFirstName: '', ownerLastName: '', ownerPassword: '' });
      loadTenants();
    } catch (e: any) { notify('Error: ' + e.message); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!showEdit) return;
    setSaving(true);
    try {
      await api.request(`/tenants/admin/${showEdit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(showEdit) });
      notify('Tenant actualizado');
      setShowEdit(null);
      loadTenants();
    } catch (e: any) { notify('Error: ' + e.message); }
    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    try {
      await api.request(`/tenants/admin/${id}/toggle`, { method: 'PATCH' });
      loadTenants();
    } catch (e: any) { notify('Error: ' + e.message); }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await api.get<any>(`/tenants/admin/${id}/detail`);
      setShowDetail(detail);
    } catch (e: any) { notify('Error: ' + e.message); }
  };

  const filtered = tenants.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()));

  if (role !== 'owner') return (
    <AppShell>
      <div className="flex h-full items-center justify-center">
        <div className="text-center"><AlertCircle size={48} className="mx-auto mb-3 text-red-400" /><p className="text-lg font-bold text-gray-700">Acceso denegado</p><p className="text-sm text-gray-500">Solo el dueño puede gestionar tenants</p></div>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Tenants</h1>
            <p className="text-sm text-gray-500">{tenants.length} restaurante{tenants.length !== 1 ? 's' : ''} registrado{tenants.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
            <Plus size={16} /> Nuevo Tenant
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o slug..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none" />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Usuarios</th>
                  <th className="px-4 py-3 text-center">Órdenes 30d</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white ${t.is_active ? 'bg-blue-500' : 'bg-gray-400'}`}>
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.slug} · {t.vertical_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{t.subscription_plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                        t.subscription_status === 'trial' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{t.subscription_status}</span>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-gray-600"><Users size={12} />{t.user_count}</span></td>
                    <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-gray-600"><ShoppingCart size={12} />{t.orders_30d}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewDetail(t.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Ver detalle"><Eye size={15} /></button>
                        <button onClick={() => setShowEdit({ ...t })} className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600" title="Editar"><Edit3 size={15} /></button>
                        <button onClick={() => handleToggle(t.id)} className={`rounded-lg p-1.5 ${t.is_active ? 'text-green-500 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`} title={t.is_active ? 'Desactivar' : 'Activar'}>
                          {t.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No se encontraron tenants</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ CREATE MODAL ═══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Building2 size={20} /> Nuevo Tenant</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Nombre del negocio</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" autoFocus />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Slug (URL)</label>
                  <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
                  <select value={form.verticalType} onChange={e => setForm({ ...form, verticalType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Plan</label>
                  <select value={form.subscriptionPlan} onChange={e => setForm({ ...form, subscriptionPlan: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">País</label>
                  <input value={form.countryCode} onChange={e => setForm({ ...form, countryCode: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" maxLength={2} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Teléfono</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">RUC / Tax ID</label>
                  <input value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Usuario Dueño</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Nombre</label>
                    <input value={form.ownerFirstName} onChange={e => setForm({ ...form, ownerFirstName: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Apellido</label>
                    <input value={form.ownerLastName} onChange={e => setForm({ ...form, ownerLastName: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                    <input type="email" value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Contraseña</label>
                    <input type="password" value={form.ownerPassword} onChange={e => setForm({ ...form, ownerPassword: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.name || !form.slug || !form.ownerEmail || !form.ownerPassword}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Creando...' : 'Crear Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEdit(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Editar: {showEdit.name}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Nombre</label>
                  <input value={showEdit.name} onChange={e => setShowEdit({ ...showEdit, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Teléfono</label>
                  <input value={showEdit.phone || ''} onChange={e => setShowEdit({ ...showEdit, phone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Plan</label>
                  <select value={showEdit.subscription_plan || showEdit.subscriptionPlan} onChange={e => setShowEdit({ ...showEdit, subscriptionPlan: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                  <select value={showEdit.subscription_status || showEdit.subscriptionStatus} onChange={e => setShowEdit({ ...showEdit, subscriptionStatus: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
                  <select value={showEdit.vertical_type || showEdit.verticalType} onChange={e => setShowEdit({ ...showEdit, verticalType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEdit(null)} className="flex-1 rounded-xl border py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetail(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{showDetail.name}</h3>
              <button onClick={() => setShowDetail(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{showDetail.stats?.total_orders || 0}</p>
                <p className="text-[10px] text-blue-500 font-medium">Órdenes totales</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">${(showDetail.stats?.total_revenue || 0).toFixed(0)}</p>
                <p className="text-[10px] text-green-500 font-medium">Revenue total</p>
              </div>
              <div className="rounded-xl bg-purple-50 p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{showDetail.stats?.total_products || 0}</p>
                <p className="text-[10px] text-purple-500 font-medium">Productos</p>
              </div>
            </div>

            {/* Users */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Usuarios ({showDetail.users?.length || 0})</h4>
              <div className="space-y-1">
                {(showDetail.users || []).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </div>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{u.role?.name || u.role?.slug}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-2">Roles ({showDetail.roles?.length || 0})</h4>
              <div className="space-y-1">
                {(showDetail.roles || []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{r.name}</span>
                      {r.isSystem && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">SISTEMA</span>}
                    </div>
                    <span className="text-xs text-gray-400">
                      {Array.isArray(r.permissions) ? (r.permissions.includes('*') ? 'Acceso total' : `${r.permissions.length} permisos`) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    </AppShell>
  );
}
