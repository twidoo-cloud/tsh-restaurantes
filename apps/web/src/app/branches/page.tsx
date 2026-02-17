'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { api } from '@/lib/api';
import {
  MapPin, Plus, Edit2, Trash2, Star, X, Check, Building2, Users, ShoppingCart, DollarSign, RefreshCw,
} from 'lucide-react';

export default function BranchesPage() {
  const router = useRouter();
  const store = usePosStore();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [form, setForm] = useState({ name: '', code: '', phone: '', email: '', establecimientoSri: '001', puntoEmisionSri: '001' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/branches');
      setBranches(data);
      // Load stats for each branch
      const s: Record<string, any> = {};
      for (const b of data) {
        try { s[b.id] = await api.get<any>(`/branches/${b.id}/stats`); } catch { s[b.id] = {}; }
      }
      setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    load();
  }, [load]);

  const openCreate = () => {
    setEditingBranch(null);
    setForm({ name: '', code: '', phone: '', email: '', establecimientoSri: '001', puntoEmisionSri: '001' });
    setShowForm(true);
  };

  const openEdit = (b: any) => {
    setEditingBranch(b);
    setForm({
      name: b.name, code: b.code, phone: b.phone || '', email: b.email || '',
      establecimientoSri: b.establecimientoSri || '001', puntoEmisionSri: b.puntoEmisionSri || '001',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, form);
        showToast('Sucursal actualizada');
      } else {
        await api.post('/branches', form);
        showToast('Sucursal creada');
      }
      setShowForm(false);
      load();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
    setSaving(false);
  };

  const handleSetMain = async (id: string) => {
    try {
      await api.post(`/branches/${id}/set-main`);
      showToast('Sucursal principal actualizada');
      load();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sucursal?')) return;
    try {
      await api.delete(`/branches/${id}`);
      showToast('Sucursal eliminada');
      load();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Sucursales</h1>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{branches.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><RefreshCw size={18} /></button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} /> Nueva Sucursal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No hay sucursales configuradas</p>
            <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">Crear primera sucursal</button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2">
            {branches.map(b => {
              const s = stats[b.id] || {};
              return (
                <div key={b.id} className={`rounded-xl border bg-white shadow-sm overflow-hidden ${b.isMain ? 'ring-2 ring-blue-400' : ''}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={16} className={b.isMain ? 'text-blue-600' : 'text-gray-400'} />
                      <h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
                      {b.isMain && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">PRINCIPAL</span>}
                      {!b.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">INACTIVA</span>}
                    </div>
                    <span className="text-xs font-mono text-gray-400">{b.code}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 p-3">
                    <div className="text-center">
                      <ShoppingCart size={14} className="mx-auto text-gray-400 mb-0.5" />
                      <p className="text-lg font-bold text-gray-900">{s.ordersToday || 0}</p>
                      <p className="text-[10px] text-gray-400">Órdenes hoy</p>
                    </div>
                    <div className="text-center">
                      <DollarSign size={14} className="mx-auto text-green-500 mb-0.5" />
                      <p className="text-lg font-bold text-green-700">${parseFloat(s.salesToday || 0).toFixed(0)}</p>
                      <p className="text-[10px] text-gray-400">Ventas hoy</p>
                    </div>
                    <div className="text-center">
                      <ShoppingCart size={14} className="mx-auto text-amber-500 mb-0.5" />
                      <p className="text-lg font-bold text-amber-600">{s.openOrders || 0}</p>
                      <p className="text-[10px] text-gray-400">Abiertas</p>
                    </div>
                    <div className="text-center">
                      <Users size={14} className="mx-auto text-blue-500 mb-0.5" />
                      <p className="text-lg font-bold text-blue-700">{s.activeStaff || 0}</p>
                      <p className="text-[10px] text-gray-400">Personal</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-3 pb-3">
                    <p className="flex-1 text-xs text-gray-400">SRI: {b.establecimientoSri}-{b.puntoEmisionSri}</p>
                    <button onClick={() => openEdit(b)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Editar"><Edit2 size={14} /></button>
                    {!b.isMain && (
                      <button onClick={() => handleSetMain(b.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600" title="Hacer principal"><Star size={14} /></button>
                    )}
                    {!b.isMain && (
                      <button onClick={() => handleDelete(b.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Eliminar"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Local Centro"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Establecimiento SRI</label>
                  <input type="text" value={form.establecimientoSri} onChange={e => setForm({ ...form, establecimientoSri: e.target.value })} maxLength={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punto Emisión SRI</label>
                  <input type="text" value={form.puntoEmisionSri} onChange={e => setForm({ ...form, puntoEmisionSri: e.target.value })} maxLength={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Guardando...' : editingBranch ? 'Actualizar' : 'Crear Sucursal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 right-4 max-w-md rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg z-50">{toast}</div>}
    </div>
    </AppShell>
  );
}
