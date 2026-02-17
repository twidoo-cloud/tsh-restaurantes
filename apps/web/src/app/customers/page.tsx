'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney } from '@/lib/currency';
import { api } from '@/lib/api';
import {
  Users, Search, Plus, X, Edit2, Trash2, ShoppingCart,
  FileText, Phone, Mail, MapPin, BarChart3, Eye, TrendingUp, Clock, Star
} from 'lucide-react';

const get = (path: string) => api.get(path);
const post = (path: string, body: any) => api.post(path, body);
const put = (path: string, body: any) => api.put(path, body);
const del = (path: string) => api.del(path);

export default function CustomersPage() {
  const router = useRouter();
  const store = usePosStore();
  const [customers, setCustomers] = useState<any>({ data: [], total: 0 });
  const [dashboard, setDashboard] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'top' | 'stats'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [detailHistory, setDetailHistory] = useState<any>(null);
  const [detailStats, setDetailStats] = useState<any>(null);
  const [form, setForm] = useState({ name: '', taxId: '', email: '', phone: '', address: '', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const loadData = useCallback(async () => {
    try {
      const [cust, dash, top] = await Promise.all([
        get(`/customers?search=${search}&limit=50`),
        get('/customers/dashboard'),
        get('/customers/top?limit=10'),
      ]);
      setCustomers(cust);
      setDashboard(dash);
      setTopCustomers(top);
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setActionLoading(true);
    try {
      if (editingCustomer) {
        await put(`/customers/${editingCustomer.id}`, form);
        showToast('✅ Cliente actualizado');
      } else {
        await post('/customers', form);
        showToast('✅ Cliente creado');
      }
      closeForm();
      loadData();
    } catch (e: any) { showToast(`❌ ${e.message}`); }
    setActionLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar cliente "${name}"?`)) return;
    try {
      const result = await del(`/customers/${id}`);
      showToast(result.anonymized ? '🔒 Cliente anonimizado (tiene órdenes vinculadas)' : '✅ Cliente eliminado');
      loadData();
      if (showDetail?.id === id) setShowDetail(null);
    } catch (e: any) { showToast(`❌ ${e.message}`); }
  };

  const handleViewDetail = async (customer: any) => {
    setShowDetail(customer);
    try {
      const [history, stats] = await Promise.all([
        get(`/customers/${customer.id}/history`),
        get(`/customers/${customer.id}/stats`),
      ]);
      setDetailHistory(history);
      setDetailStats(stats);
    } catch (e: any) { showToast(`❌ ${e.message}`); }
  };

  const openEdit = (customer: any) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || '', taxId: customer.tax_id || '', email: customer.email || '',
      phone: customer.phone || '', address: customer.address || '', notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false); setEditingCustomer(null);
    setForm({ name: '', taxId: '', email: '', phone: '', address: '', notes: '' });
  };

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Clientes</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => router.push('/invoices')} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><FileText size={16} /> Facturación</button>

          </div>

        </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-6 gap-3 border-b bg-white px-4 py-3">
          <Stat label="Total Clientes" value={dashboard.total_customers} icon={Users} color="text-teal-600" bg="bg-teal-50" />
          <Stat label="Nuevos (30d)" value={dashboard.new_last_30d} icon={Plus} color="text-blue-600" bg="bg-blue-50" />
          <Stat label="Frecuentes (5+)" value={dashboard.frequent_customers} icon={Star} color="text-amber-600" bg="bg-amber-50" />
          <Stat label="Una sola vez" value={dashboard.one_time_customers} icon={Clock} color="text-gray-500" bg="bg-gray-50" />
          <Stat label="Valor Prom. Vida" value={formatMoney(dashboard.avg_lifetime_value)} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
          <Stat label="Visitas Prom." value={dashboard.avg_visits?.toFixed(1)} icon={ShoppingCart} color="text-indigo-600" bg="bg-indigo-50" />
        </div>
      )}

      {/* Tabs + Search + Add */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {([['list', 'Lista'], ['top', 'Top Clientes'], ['stats', 'Estadísticas']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RUC, teléfono..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-teal-400 focus:outline-none" />
        </div>
        <button onClick={() => { closeForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          </div>
        ) : tab === 'list' ? (
          /* ── Customer List ── */
          <div className="mx-auto max-w-6xl rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">RUC/Cédula</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Contacto</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Compras</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Visitas</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.data.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      {c.address && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {c.address}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{c.tax_id || '—'}</td>
                    <td className="px-4 py-3">
                      {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
                      {c.email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> {c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(c.total_purchases || 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.visit_count >= 10 ? 'bg-amber-100 text-amber-700' :
                        c.visit_count >= 5 ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {c.visit_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleViewDetail(c)} title="Ver detalle"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Eye size={16} /></button>
                        <button onClick={() => openEdit(c)} title="Editar"
                          className="rounded p-1.5 text-blue-500 hover:bg-blue-50"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(c.id, c.name)} title="Eliminar"
                          className="rounded p-1.5 text-red-400 hover:bg-red-50"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.data.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <Users size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No hay clientes registrados</p>
                <p className="text-sm mt-1">Agrega tu primer cliente con el botón "Nuevo Cliente"</p>
              </div>
            )}
          </div>
        ) : tab === 'top' ? (
          /* ── Top Customers ── */
          <div className="mx-auto max-w-4xl space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">🏆 Top 10 Clientes por Gasto</h2>
            {topCustomers.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center gap-4 rounded-xl border bg-white p-4 hover:shadow-sm transition cursor-pointer"
                onClick={() => handleViewDetail(c)}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                  i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.tax_id || 'Sin RUC'} · {c.visit_count || 0} visitas · Ticket promedio: {formatMoney(c.avg_ticket || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-teal-600">{formatMoney(c.total_purchases || 0)}</p>
                  {c.last_order_at && <p className="text-xs text-gray-400">Última visita: {new Date(c.last_order_at).toLocaleDateString('es-EC')}</p>}
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <TrendingUp size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No hay datos de clientes aún</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Stats ── */
          <div className="mx-auto max-w-4xl text-center py-16 text-gray-400">
            <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
            <p>Las estadísticas avanzadas se generan automáticamente conforme se registran más clientes y compras.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeForm}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre / Razón Social *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none" placeholder="Nombre completo o razón social" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">RUC / Cédula</label>
                  <input type="text" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none" placeholder="1792345678001" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none" placeholder="0998765432" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none" placeholder="cliente@email.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none" placeholder="Av. Amazonas y Naciones Unidas" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none resize-none" placeholder="Alergia a mariscos, prefiere terraza..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeForm} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={actionLoading || !form.name.trim()}
                className="flex-1 rounded-xl bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-40">
                {actionLoading ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowDetail(null); setDetailHistory(null); setDetailStats(null); }}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{showDetail.name}</h3>
                <p className="text-sm text-gray-500">{showDetail.tax_id || 'Sin RUC/Cédula'}</p>
              </div>
              <button onClick={() => { setShowDetail(null); setDetailHistory(null); setDetailStats(null); }}
                className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {showDetail.phone && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <Phone size={14} className="text-gray-400" /> {showDetail.phone}
                </div>
              )}
              {showDetail.email && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <Mail size={14} className="text-gray-400" /> {showDetail.email}
                </div>
              )}
              {showDetail.address && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <MapPin size={14} className="text-gray-400" /> {showDetail.address}
                </div>
              )}
            </div>

            {/* Stats */}
            {detailStats && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-gray-500">Total Gastado</p>
                  <p className="text-lg font-bold text-teal-600">{formatMoney(detailStats.total_spent || 0)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-gray-500">Órdenes</p>
                  <p className="text-lg font-bold text-gray-900">{detailStats.completed_orders || 0}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-gray-500">Ticket Promedio</p>
                  <p className="text-lg font-bold text-blue-600">{formatMoney(detailStats.avg_ticket || 0)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-gray-500">Ticket Máximo</p>
                  <p className="text-lg font-bold text-indigo-600">{formatMoney(detailStats.max_ticket || 0)}</p>
                </div>
              </div>
            )}

            {/* Top products */}
            {detailStats?.topProducts?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">⭐ Productos Favoritos</h4>
                <div className="flex flex-wrap gap-2">
                  {detailStats.topProducts.map((p: any, i: number) => (
                    <span key={i} className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700">
                      {p.name} <span className="text-gray-400">×{p.total_quantity}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Order History */}
            {detailHistory?.orders?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Historial de Órdenes</h4>
                <div className="rounded-lg border overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">Orden</th>
                        <th className="px-3 py-2 text-left text-gray-500">Fecha</th>
                        <th className="px-3 py-2 text-center text-gray-500">Items</th>
                        <th className="px-3 py-2 text-right text-gray-500">Total</th>
                        <th className="px-3 py-2 text-center text-gray-500">Estado</th>
                        <th className="px-3 py-2 text-left text-gray-500">Mesero</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detailHistory.orders.map((o: any) => (
                        <tr key={o.id}>
                          <td className="px-3 py-2 font-mono font-semibold text-gray-900">{o.order_number}</td>
                          <td className="px-3 py-2 text-gray-500">{new Date(o.created_at).toLocaleDateString('es-EC')}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{o.item_count}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatMoney(o.total)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>{o.status}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{o.served_by_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invoices */}
            {detailHistory?.invoices?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📄 Facturas</h4>
                <div className="flex flex-wrap gap-2">
                  {detailHistory.invoices.map((inv: any) => (
                    <span key={inv.id} className={`rounded-lg border px-3 py-1.5 text-xs ${
                      inv.status === 'authorized' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {inv.full_number} — {formatMoney(inv.total)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showDetail.notes && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                📝 <strong>Notas:</strong> {showDetail.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 max-w-md rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon, color, bg }: { label: string; value: any; icon: any; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
      <div className={`rounded-lg p-1.5 ${bg}`}><Icon size={16} className={color} /></div>
      <div><p className="text-[10px] text-gray-500">{label}</p><p className="text-sm font-bold text-gray-900">{value}</p></div>
    </div>
  );
}
