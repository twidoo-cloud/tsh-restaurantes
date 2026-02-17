'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import {
  Plus, X, Edit2, Truck, Phone, Mail, MapPin, FileText,
  Package, Link, Unlink, Search, User
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error');
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: getHeaders(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Error'); }
  return res.json();
}

async function apiPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Error'); }
  return res.json();
}

async function apiDelete(path: string) {
  await fetch(`${API_URL}${path}`, { method: 'DELETE', headers: getHeaders() });
}

export default function SuppliersPage() {
  const router = useRouter();
  const store = usePosStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', taxId: '', address: '' });

  const loadData = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([
        apiGet<any[]>('/suppliers'),
        apiGet<any[]>('/ingredients'),
      ]);
      setSuppliers(s || []);
      setIngredients(i || []);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  const openDialog = (supplier?: any) => {
    if (supplier) {
      setEditing(supplier);
      setForm({
        name: supplier.name, contactName: supplier.contactName || '', phone: supplier.phone || '',
        email: supplier.email || '', taxId: supplier.taxId || '', address: supplier.address || '',
      });
    } else {
      setEditing(null);
      setForm({ name: '', contactName: '', phone: '', email: '', taxId: '', address: '' });
    }
    setShowDialog(true);
  };

  const saveSupplier = async () => {
    if (editing) {
      await apiPut(`/suppliers/${editing.id}`, form);
    } else {
      await apiPost('/suppliers', form);
    }
    setShowDialog(false);
    loadData();
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('¿Desactivar este proveedor?')) return;
    await apiDelete(`/suppliers/${id}`);
    setSelectedSupplier(null);
    loadData();
  };

  const loadSupplierDetail = async (id: string) => {
    const detail = await apiGet<any>(`/suppliers/${id}`);
    setSelectedSupplier(detail);
  };

  const linkIngredient = async (ingredientId: string) => {
    if (!selectedSupplier) return;
    await apiPost(`/suppliers/${selectedSupplier.id}/link/${ingredientId}`);
    loadSupplierDetail(selectedSupplier.id);
    loadData();
  };

  const unlinkIngredient = async (ingredientId: string) => {
    if (!selectedSupplier) return;
    await apiDelete(`/suppliers/${selectedSupplier.id}/link/${ingredientId}`);
    loadSupplierDetail(selectedSupplier.id);
    loadData();
  };

  const filtered = searchQuery
    ? suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.contactName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : suppliers;

  const unlinkedIngredients = ingredients.filter(i => 
    i.isActive !== false && (!selectedSupplier?.ingredients?.find((si: any) => si.id === i.id))
  );

  if (loading) return <div className="flex h-full items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Proveedores</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => openDialog()} className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-1.5 text-sm font-medium hover:bg-gray-200">
          <Plus size={16} /> Nuevo Proveedor
        </button>

          </div>

        </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Supplier list */}
        <div className={`flex flex-col border-r bg-white ${selectedSupplier ? 'w-80 xl:w-96 hidden md:flex' : 'flex-1'}`}>
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Buscar proveedor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Truck size={48} className="mx-auto mb-3 opacity-30" />
                <p>No hay proveedores</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(s => (
                  <button key={s.id} onClick={() => loadSupplierDetail(s.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition ${selectedSupplier?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{s.name}</h3>
                        {s.contactName && <p className="text-xs text-gray-500 mt-0.5">{s.contactName}</p>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {s.phone && <span className="flex items-center gap-1"><Phone size={10} /> {s.phone}</span>}
                      <span className="flex items-center gap-1"><Package size={10} /> {s.ingredientCount} ingredientes</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Detail */}
        {selectedSupplier && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Detail header */}
            <div className="border-b bg-white px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedSupplier.name}</h2>
                  {selectedSupplier.contactName && (
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1"><User size={14} /> {selectedSupplier.contactName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openDialog(selectedSupplier)} className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Edit2 size={18} /></button>
                  <button onClick={() => deleteSupplier(selectedSupplier.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><X size={18} /></button>
                  <button onClick={() => setSelectedSupplier(null)} className="md:hidden rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>
              </div>

              {/* Contact info cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {selectedSupplier.phone && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><Phone size={12} /> Teléfono</div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedSupplier.phone}</p>
                  </div>
                )}
                {selectedSupplier.email && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><Mail size={12} /> Email</div>
                    <p className="mt-1 text-sm font-medium text-gray-900 truncate">{selectedSupplier.email}</p>
                  </div>
                )}
                {selectedSupplier.taxId && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><FileText size={12} /> RUC/ID Fiscal</div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedSupplier.taxId}</p>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><MapPin size={12} /> Dirección</div>
                    <p className="mt-1 text-sm font-medium text-gray-900 truncate">{selectedSupplier.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Linked ingredients */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Ingredientes Vinculados</h3>
                <button onClick={() => setShowLinkDialog(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                  <Link size={14} /> Vincular Ingrediente
                </button>
              </div>

              {selectedSupplier.ingredients?.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-gray-400">
                  <Package size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay ingredientes vinculados</p>
                  <p className="text-xs mt-1">Vincula ingredientes para rastrear qué provee</p>
                </div>
              ) : (
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Ingrediente</th>
                        <th className="px-4 py-2.5 text-right">Costo/Unidad</th>
                        <th className="px-4 py-2.5 text-right">Stock</th>
                        <th className="px-4 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSupplier.ingredients.map((ing: any) => {
                        const low = ing.currentStock && ing.minStock && parseFloat(ing.currentStock) <= parseFloat(ing.minStock);
                        return (
                          <tr key={ing.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{ing.name}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">${parseFloat(ing.costPerUnit).toFixed(2)}/{ing.unit}</td>
                            <td className="px-4 py-2.5 text-right">
                              {ing.currentStock != null ? (
                                <span className={low ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                  {parseFloat(ing.currentStock)} {ing.unit}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button onClick={() => unlinkIngredient(ing.id)} className="text-gray-300 hover:text-red-500" title="Desvincular">
                                <Unlink size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Nombre del proveedor" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                  <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Nombre contacto" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="+593..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUC / ID Fiscal</label>
                  <input value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="0912345678001" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Dirección completa" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowDialog(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveSupplier} disabled={!form.name} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Link ingredient dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Vincular Ingrediente</h3>
              <button onClick={() => setShowLinkDialog(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {unlinkedIngredients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Todos los ingredientes están vinculados</p>
              ) : (
                unlinkedIngredients.map(ing => (
                  <button key={ing.id} onClick={() => { linkIngredient(ing.id); setShowLinkDialog(false); }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-blue-50 transition">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ing.name}</p>
                      <p className="text-xs text-gray-400">{ing.category || 'Sin categoría'} · {ing.unit}</p>
                    </div>
                    <Link size={16} className="text-blue-400" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
