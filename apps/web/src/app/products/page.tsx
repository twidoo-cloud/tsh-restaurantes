'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney } from '@/lib/currency';
import { api } from '@/lib/api';
import {
  Package, Search, Plus, X, Edit2, Trash2, Eye, EyeOff,
  Tag, ChefHat, BarChart3, Grid3X3, List, Filter,
  AlertTriangle, Check, Image, FolderOpen, MoreVertical,
} from 'lucide-react';

const get = <T = any,>(p: string) => api.get<T>(p);
const post = <T = any,>(p: string, b: any) => api.post<T>(p, b);
const put = <T = any,>(p: string, b: any) => api.put<T>(p, b);
const patch = <T = any,>(p: string) => api.request<T>(p, { method: 'PATCH' });
const del = <T = any,>(p: string) => api.del<T>(p);

const STATIONS = [
  { value: '', label: 'Sin asignar' },
  { value: 'grill', label: 'Parrilla' },
  { value: 'cold', label: 'Fríos' },
  { value: 'bar', label: 'Bar' },
  { value: 'pastry', label: 'Pastelería' },
];

const STATION_COLORS: Record<string, string> = {
  grill: 'bg-orange-100 text-orange-700',
  cold: 'bg-cyan-100 text-cyan-700',
  bar: 'bg-purple-100 text-purple-700',
  pastry: 'bg-pink-100 text-pink-700',
};

const emptyForm = {
  name: '', description: '', categoryId: '', price: '', cost: '',
  sku: '', barcode: '', taxRate: '15', unit: 'unit', trackInventory: true,
  imageUrl: '', tags: '', kitchenStation: '', prepTime: '',
};

export default function ProductsPage() {
  const router = useRouter();
  const store = usePosStore();

  const [products, setProducts] = useState<any>({ data: [], total: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [tab, setTab] = useState<'products' | 'categories'>('products');

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', displayOrder: '0' });

  // Detail
  const [showDetail, setShowDetail] = useState<any>(null);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCategory) params.set('categoryId', filterCategory);
      if (filterAvailability) params.set('isActive', filterAvailability);
      params.set('limit', '200');

      const [prods, cats] = await Promise.all([
        get<any>(`/products?${params.toString()}`),
        get<any[]>('/products/categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [search, filterCategory, filterAvailability]);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  // ─── Product CRUD ───

  const openNewProduct = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditProduct = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      categoryId: p.categoryId || '',
      price: String(p.price || ''),
      cost: p.cost ? String(p.cost) : '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      taxRate: String(Number(p.taxRate || 0) * 100),
      unit: p.unit || 'unit',
      trackInventory: p.trackInventory ?? true,
      imageUrl: p.imageUrl || '',
      tags: (p.tags || []).join(', '),
      kitchenStation: p.attributes?.kitchen_station || '',
      prepTime: p.attributes?.prep_time_minutes ? String(p.attributes.prep_time_minutes) : '',
    });
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId || undefined,
        price: parseFloat(form.price),
        cost: form.cost ? parseFloat(form.cost) : undefined,
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        taxRate: parseFloat(form.taxRate) / 100,
        unit: form.unit,
        trackInventory: form.trackInventory,
        imageUrl: form.imageUrl.trim() || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        attributes: {
          ...(form.kitchenStation ? { kitchen_station: form.kitchenStation } : {}),
          ...(form.prepTime ? { prep_time_minutes: parseInt(form.prepTime) } : {}),
        },
      };

      if (editingProduct) {
        await put(`/products/${editingProduct.id}`, body);
        showToast('Producto actualizado');
      } else {
        await post('/products', body);
        showToast('Producto creado');
      }
      setShowForm(false);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const toggleAvailability = async (id: string) => {
    try {
      await patch(`/products/${id}/toggle-availability`);
      loadData();
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    try {
      await del(`/products/${id}`);
      showToast('Producto eliminado');
      setConfirmDelete(null);
      loadData();
    } catch {}
  };

  // ─── Category CRUD ───

  const openNewCategory = () => {
    setEditingCat(null);
    setCatForm({ name: '', description: '', displayOrder: '0' });
    setShowCatForm(true);
  };

  const openEditCategory = (c: any) => {
    setEditingCat(c);
    setCatForm({ name: c.name, description: c.description || '', displayOrder: String(c.displayOrder || 0) });
    setShowCatForm(true);
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: catForm.name.trim(),
        description: catForm.description.trim() || undefined,
        displayOrder: parseInt(catForm.displayOrder) || 0,
      };
      if (editingCat) {
        await put(`/products/categories/${editingCat.id}`, body);
        showToast('Categoría actualizada');
      } else {
        await post('/products/categories', body);
        showToast('Categoría creada');
      }
      setShowCatForm(false);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Error');
    } finally { setSaving(false); }
  };

  const deleteCategory = async (id: string) => {
    try {
      await del(`/products/categories/${id}`);
      showToast('Categoría eliminada');
      setConfirmDelete(null);
      loadData();
    } catch {}
  };

  // ─── Stats ───
  const totalProducts = products.total || products.data?.length || 0;
  const activeProducts = products.data?.filter((p: any) => p.isAvailable).length || 0;
  const unavailableProducts = products.data?.filter((p: any) => !p.isAvailable).length || 0;
  const withoutCategory = products.data?.filter((p: any) => !p.categoryId).length || 0;

  const f = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-hidden bg-gray-50">
        {/* ═══ HEADER ═══ */}
        <div className="shrink-0 border-b bg-white px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package size={22} className="text-indigo-600" /> Productos y Menú
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">{totalProducts} productos, {categories.length} categorías</p>
            </div>
            <div className="flex items-center gap-2">
              {tab === 'categories' ? (
                <button onClick={openNewCategory}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
                  <Plus size={16} /> Categoría
                </button>
              ) : (
                <button onClick={openNewProduct}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
                  <Plus size={16} /> Producto
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-3">
            <button onClick={() => setTab('products')}
              className={`pb-2 text-sm font-medium border-b-2 transition ${
                tab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Package size={14} className="inline mr-1" /> Productos
            </button>
            <button onClick={() => setTab('categories')}
              className={`pb-2 text-sm font-medium border-b-2 transition ${
                tab === 'categories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <FolderOpen size={14} className="inline mr-1" /> Categorías
            </button>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        {tab === 'products' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats bar */}
            <div className="shrink-0 flex gap-3 px-4 md:px-6 py-3 bg-white border-b overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 shrink-0">
                <Package size={14} /> {totalProducts} total
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 shrink-0">
                <Check size={14} /> {activeProducts} disponibles
              </div>
              {unavailableProducts > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shrink-0">
                  <EyeOff size={14} /> {unavailableProducts} ocultos
                </div>
              )}
              {withoutCategory > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 shrink-0">
                  <AlertTriangle size={14} /> {withoutCategory} sin categoría
                </div>
              )}
            </div>

            {/* Search + filters */}
            <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b bg-white">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar por nombre, SKU, código..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                <option value="">Todas las categorías</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filterAvailability} onChange={e => setFilterAvailability(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                <option value="">Todos</option>
                <option value="true">Disponibles</option>
                <option value="false">Ocultos</option>
              </select>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><List size={16} /></button>
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><Grid3X3 size={16} /></button>
              </div>
            </div>

            {/* Product list/grid */}
            <div className="flex-1 overflow-y-auto p-4 md:px-6">
              {loading ? (
                <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
              ) : products.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Package size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">No hay productos{search ? ` para "${search}"` : ''}</p>
                  <button onClick={openNewProduct} className="mt-3 text-sm text-indigo-600 hover:underline">Crear primer producto</button>
                </div>
              ) : viewMode === 'list' ? (
                /* ═══ LIST VIEW ═══ */
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-left hidden md:table-cell">Categoría</th>
                        <th className="px-4 py-3 text-left hidden lg:table-cell">Estación</th>
                        <th className="px-4 py-3 text-right">Precio</th>
                        <th className="px-4 py-3 text-right hidden sm:table-cell">Costo</th>
                        <th className="px-4 py-3 text-center hidden md:table-cell">Margen</th>
                        <th className="px-4 py-3 text-center hidden sm:table-cell">Stock</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {products.data.map((p: any) => (
                        <tr key={p.id} className={`hover:bg-gray-50 transition ${!p.isAvailable ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                                  <Package size={16} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{p.name}</p>
                                {p.sku && <p className="text-[11px] text-gray-400">SKU: {p.sku}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {p.category ? (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{p.category.name}</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {p.attributes?.kitchen_station ? (
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATION_COLORS[p.attributes.kitchen_station] || 'bg-gray-100 text-gray-600'}`}>
                                {p.attributes.kitchen_station}
                              </span>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(parseFloat(p.price))}</td>
                          <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{p.cost ? formatMoney(parseFloat(p.cost)) : '—'}</td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            {p.cost && parseFloat(p.cost) > 0 ? (() => {
                              const m = ((1 - parseFloat(p.cost) / parseFloat(p.price)) * 100);
                              return (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  m >= 50 ? 'bg-green-100 text-green-700' : m >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{m.toFixed(0)}%</span>
                              );
                            })() : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            {p.trackInventory ? (
                              <span className={`text-sm font-medium ${parseFloat(p.currentStock) <= parseFloat(p.minStock) ? 'text-red-600' : 'text-gray-700'}`}>
                                {parseFloat(p.currentStock).toFixed(0)}
                              </span>
                            ) : <span className="text-xs text-gray-300">N/A</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleAvailability(p.id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                p.isAvailable ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}>
                              {p.isAvailable ? 'Activo' : 'Oculto'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setShowDetail(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Ver detalle">
                                <Eye size={15} />
                              </button>
                              <button onClick={() => openEditProduct(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Editar">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => setConfirmDelete({ type: 'product', id: p.id, name: p.name })}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Eliminar">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ═══ GRID VIEW ═══ */
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {products.data.map((p: any) => (
                    <div key={p.id} className={`group relative rounded-xl border bg-white p-3 transition hover:shadow-md ${!p.isAvailable ? 'opacity-50' : ''}`}>
                      {/* Image */}
                      <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package size={28} className="text-gray-300" />
                        )}
                      </div>
                      {/* Station badge */}
                      {p.attributes?.kitchen_station && (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mb-1 ${STATION_COLORS[p.attributes.kitchen_station] || 'bg-gray-100 text-gray-600'}`}>
                          {p.attributes.kitchen_station}
                        </span>
                      )}
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{p.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{p.category?.name || 'Sin categoría'}</p>
                      <p className="mt-1 text-sm font-bold text-indigo-600">{formatMoney(parseFloat(p.price))}</p>

                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1">
                        <button onClick={() => openEditProduct(p)} className="rounded-lg bg-white p-1.5 shadow-md text-gray-500 hover:text-blue-600"><Edit2 size={13} /></button>
                        <button onClick={() => toggleAvailability(p.id)} className="rounded-lg bg-white p-1.5 shadow-md text-gray-500 hover:text-amber-600">
                          {p.isAvailable ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ═══ CATEGORIES TAB ═══ */
          <div className="flex-1 overflow-y-auto p-4 md:px-6">
            {categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FolderOpen size={48} className="mb-3 opacity-30" />
                <p className="text-sm">No hay categorías</p>
                <button onClick={openNewCategory} className="mt-3 text-sm text-indigo-600 hover:underline">Crear primera categoría</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categories.map((c: any) => (
                  <div key={c.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                          <FolderOpen size={20} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{c.name}</h3>
                          <p className="text-xs text-gray-400">{c.products?.length || 0} productos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditCategory(c)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete({ type: 'category', id: c.id, name: c.name })}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {c.description && <p className="mt-2 text-xs text-gray-500">{c.description}</p>}
                    <div className="mt-2 text-[11px] text-gray-400">Orden: {c.displayOrder}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ PRODUCT FORM MODAL ═══ */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-4 pb-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {/* Name + Category */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ej: Ceviche de Conchas Negras" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
                    <select value={form.categoryId} onChange={e => f('categoryId', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="">Sin categoría</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
                    placeholder="Descripción del producto..." />
                </div>

                {/* Price + Cost + Tax */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Precio *</label>
                    <input type="number" step="0.01" min="0" value={form.price} onChange={e => f('price', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Costo</label>
                    <input type="number" step="0.01" min="0" value={form.cost} onChange={e => f('cost', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">IVA %</label>
                    <input type="number" step="1" min="0" max="100" value={form.taxRate} onChange={e => f('taxRate', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>

                {/* Margin indicator */}
                {form.price && form.cost && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    Margen: <span className="font-bold text-green-600">
                      {((1 - parseFloat(form.cost) / parseFloat(form.price)) * 100).toFixed(1)}%
                    </span> ({formatMoney(parseFloat(form.price) - parseFloat(form.cost))} por unidad)
                  </div>
                )}

                {/* SKU + Barcode + Unit */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
                    <input value={form.sku} onChange={e => f('sku', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="CEV-001" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Código de barras</label>
                    <input value={form.barcode} onChange={e => f('barcode', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="7501234567890" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Unidad</label>
                    <select value={form.unit} onChange={e => f('unit', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="unit">Unidad</option>
                      <option value="kg">Kilogramo</option>
                      <option value="g">Gramo</option>
                      <option value="lt">Litro</option>
                      <option value="ml">Mililitro</option>
                      <option value="portion">Porción</option>
                    </select>
                  </div>
                </div>

                {/* Kitchen station + Prep time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Estación de cocina</label>
                    <select value={form.kitchenStation} onChange={e => f('kitchenStation', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                      {STATIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tiempo prep. (min)</label>
                    <input type="number" min="0" value={form.prepTime} onChange={e => f('prepTime', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="12" />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">URL de imagen</label>
                  <input value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="https://..." />
                </div>

                {/* Tags */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Etiquetas</label>
                  <input value={form.tags} onChange={e => f('tags', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" placeholder="vegetariano, sin gluten, popular" />
                  <p className="mt-0.5 text-[11px] text-gray-400">Separadas por coma</p>
                </div>

                {/* Track inventory */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.trackInventory} onChange={e => f('trackInventory', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">Controlar inventario de este producto</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button onClick={saveProduct} disabled={saving || !form.name || !form.price}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">
                  {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CATEGORY FORM MODAL ═══ */}
        {showCatForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCatForm(false)} />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{editingCat ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                  <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Ej: Ceviches, Bebidas..." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                  <input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Orden de visualización</label>
                  <input type="number" value={catForm.displayOrder} onChange={e => setCatForm({ ...catForm, displayOrder: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCatForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button onClick={saveCategory} disabled={saving || !catForm.name}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition">
                  {saving ? 'Guardando...' : editingCat ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PRODUCT DETAIL MODAL ═══ */}
        {showDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetail(null)} />
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Detalle del Producto</h2>
                <button onClick={() => setShowDetail(null)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {showDetail.imageUrl ? (
                    <img src={showDetail.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover border" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100"><Package size={28} className="text-gray-300" /></div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{showDetail.name}</h3>
                    {showDetail.description && <p className="text-sm text-gray-500 mt-1">{showDetail.description}</p>}
                    {showDetail.category && <span className="mt-1 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{showDetail.category.name}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-indigo-50 p-3">
                    <p className="text-lg font-bold text-indigo-700">{formatMoney(parseFloat(showDetail.price))}</p>
                    <p className="text-[11px] text-indigo-500">Precio</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-lg font-bold text-gray-700">{showDetail.cost ? formatMoney(parseFloat(showDetail.cost)) : '—'}</p>
                    <p className="text-[11px] text-gray-500">Costo</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-lg font-bold text-green-700">
                      {showDetail.cost ? `${((1 - parseFloat(showDetail.cost) / parseFloat(showDetail.price)) * 100).toFixed(0)}%` : '—'}
                    </p>
                    <p className="text-[11px] text-green-500">Margen</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">SKU:</span> <span className="font-medium">{showDetail.sku || '—'}</span></div>
                  <div><span className="text-gray-400">Barcode:</span> <span className="font-medium">{showDetail.barcode || '—'}</span></div>
                  <div><span className="text-gray-400">IVA:</span> <span className="font-medium">{(Number(showDetail.taxRate) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-gray-400">Unidad:</span> <span className="font-medium">{showDetail.unit}</span></div>
                  <div><span className="text-gray-400">Estación:</span> <span className="font-medium">{showDetail.attributes?.kitchen_station || '—'}</span></div>
                  <div><span className="text-gray-400">Stock:</span> <span className="font-medium">{showDetail.trackInventory ? parseFloat(showDetail.currentStock).toFixed(0) : 'N/A'}</span></div>
                </div>

                {showDetail.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {showDetail.tags.map((t: string) => (
                      <span key={t} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button onClick={() => { setShowDetail(null); openEditProduct(showDetail); }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  <Edit2 size={14} /> Editar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CONFIRM DELETE MODAL ═══ */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-3">
                  <Trash2 size={22} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Eliminar {confirmDelete.type === 'product' ? 'producto' : 'categoría'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  ¿Seguro que deseas eliminar <span className="font-semibold">{confirmDelete.name}</span>?
                  {confirmDelete.type === 'category' && ' Los productos de esta categoría quedarán sin categoría.'}
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 border">Cancelar</button>
                <button onClick={() => confirmDelete.type === 'product' ? deleteProduct(confirmDelete.id) : deleteCategory(confirmDelete.id)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}
