'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import {
  Package, AlertTriangle, TrendingDown, Search, Plus, Minus,
  RefreshCw, BarChart3, ArrowUpDown, X, Check, Truck, Trash2, RotateCcw,
  ChevronDown, LayoutGrid, Utensils, ChefHat, DollarSign
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiGet = async <T,>(path: string): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Error'); }
  return res.json();
};

const apiPost = async <T,>(path: string, body: any): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Error'); }
  return res.json();
};

const MOVEMENT_TYPES = [
  { id: 'purchase', label: 'Compra', icon: Truck, color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'adjustment', label: 'Ajuste', icon: ArrowUpDown, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'waste', label: 'Merma', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'return', label: 'Devolución', icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  in_stock: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Stock' },
  low_stock: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Stock Bajo' },
  out_of_stock: { bg: 'bg-red-100', text: 'text-red-700', label: 'Agotado' },
};

type TabView = 'stock' | 'movements' | 'alerts';

export default function InventoryPage() {
  const router = useRouter();
  const store = usePosStore();
  const [tab, setTab] = useState<TabView>('stock');
  const [stockData, setStockData] = useState<any[]>([]);
  const [movements, setMovements] = useState<any>({ data: [], total: 0 });
  const [alerts, setAlerts] = useState<any>({ alerts: [], criticalCount: 0, warningCount: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [movementType, setMovementType] = useState('purchase');
  const [movementQty, setMovementQty] = useState('');
  const [movementCost, setMovementCost] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [movementRef, setMovementRef] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (lowStockOnly) params.set('lowStockOnly', 'true');
      const qs = params.toString();

      const [stock, movs, alertsData, sum] = await Promise.all([
        apiGet<any[]>(`/inventory/stock${qs ? `?${qs}` : ''}`),
        apiGet<any>('/inventory/movements?limit=30'),
        apiGet<any>('/inventory/alerts'),
        apiGet<any>('/inventory/summary'),
      ]);
      setStockData(stock);
      setMovements(movs);
      setAlerts(alertsData);
      setSummary(sum);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  const handleRecordMovement = async () => {
    if (!selectedProduct || !movementQty) return;
    setActionLoading(true);
    try {
      const result = await apiPost<any>('/inventory/movement', {
        productId: selectedProduct.id,
        movementType,
        quantity: parseFloat(movementQty),
        unitCost: movementCost ? parseFloat(movementCost) : undefined,
        reference: movementRef || undefined,
        notes: movementNotes || undefined,
      });
      setToast(`✅ ${result.productName}: ${result.previousStock} → ${result.newStock} ${selectedProduct.unit}`);
      setShowMovementForm(false);
      resetForm();
      loadData();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast(`❌ ${e.message}`);
      setTimeout(() => setToast(null), 4000);
    }
    setActionLoading(false);
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setMovementType('purchase');
    setMovementQty('');
    setMovementCost('');
    setMovementNotes('');
    setMovementRef('');
  };

  const openMovementForm = (product: any, type: string = 'purchase') => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementCost(product.cost?.toString() || '');
    setShowMovementForm(true);
  };

  const MOVEMENT_LABELS: Record<string, string> = {
    purchase: 'Compra', sale: 'Venta', adjustment: 'Ajuste',
    waste: 'Merma', transfer: 'Transferencia', return: 'Devolución', initial: 'Inicial',
  };

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Inventario</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
            <BarChart3 size={16} /> Dashboard
          </button>

            <button onClick={loadData} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <RefreshCw size={18} />
          </button>

          </div>

        </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-white border-b">
          <SummaryCard label="Productos" value={summary.totalProducts} icon={Package} color="text-blue-600" bg="bg-blue-50" />
          <SummaryCard label="Valor Total" value={`S/ ${summary.totalStockValue.toFixed(0)}`} icon={DollarSign} color="text-green-600" bg="bg-green-50" />
          <SummaryCard label="En Stock" value={summary.inStock} icon={Check} color="text-green-600" bg="bg-green-50" />
          <SummaryCard label="Stock Bajo" value={summary.lowStock} icon={TrendingDown} color="text-amber-600" bg="bg-amber-50" />
          <SummaryCard label="Agotados" value={summary.outOfStock} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white px-4 py-2 border-b">
        {[
          { id: 'stock' as TabView, label: 'Stock Actual', icon: Package },
          { id: 'movements' as TabView, label: 'Movimientos', icon: ArrowUpDown },
          { id: 'alerts' as TabView, label: `Alertas (${alerts.criticalCount + alerts.warningCount})`, icon: AlertTriangle },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : tab === 'stock' ? (
          /* ═══ STOCK TAB ═══ */
          <div>
            {/* Filters */}
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Buscar por nombre o SKU..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <button onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  lowStockOnly ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                <AlertTriangle size={16} /> Solo stock bajo
              </button>
              <button onClick={() => { setSelectedProduct(null); setShowMovementForm(true); }}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">
                <Plus size={16} /> Registrar Movimiento
              </button>
            </div>

            {/* Stock table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Categoría</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Mínimo</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Costo</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Valor</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockData.map(p => {
                    const st = STATUS_BADGE[p.stockStatus] || STATUS_BADGE.in_stock;
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 ${p.stockStatus === 'out_of_stock' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{p.categoryName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{p.currentStock} <span className="text-xs text-gray-400">{p.unit}</span></td>
                        <td className="px-4 py-3 text-right text-gray-500">{p.minStock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">S/ {p.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700">S/ {p.stockValue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openMovementForm(p, 'purchase')} title="Compra"
                              className="rounded p-1.5 text-green-600 hover:bg-green-50"><Plus size={16} /></button>
                            <button onClick={() => openMovementForm(p, 'adjustment')} title="Ajustar"
                              className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><ArrowUpDown size={16} /></button>
                            <button onClick={() => openMovementForm(p, 'waste')} title="Merma"
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"><Minus size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {stockData.length === 0 && (
                <div className="py-12 text-center text-gray-400">No se encontraron productos</div>
              )}
            </div>
          </div>
        ) : tab === 'movements' ? (
          /* ═══ MOVEMENTS TAB ═══ */
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Historial de Movimientos</h2>
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Cantidad</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Anterior</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Nuevo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Referencia</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.data.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.created_at).toLocaleString('es-PE')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.product_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.movement_type === 'purchase' ? 'bg-green-100 text-green-700' :
                          m.movement_type === 'sale' ? 'bg-blue-100 text-blue-700' :
                          m.movement_type === 'waste' ? 'bg-red-100 text-red-700' :
                          m.movement_type === 'adjustment' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{m.quantity} {m.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{m.previous_stock}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{m.new_stock}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.reference || m.notes || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.performed_by_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movements.data.length === 0 && (
                <div className="py-12 text-center text-gray-400">No hay movimientos registrados</div>
              )}
            </div>
          </div>
        ) : (
          /* ═══ ALERTS TAB ═══ */
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Alertas de Inventario
              <span className="ml-2 text-sm font-normal text-gray-500">
                {alerts.criticalCount} críticos · {alerts.warningCount} advertencias
              </span>
            </h2>
            {alerts.alerts.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-xl border bg-white">
                <Check size={48} className="mb-2 text-green-300" />
                <p className="text-gray-500">Todo el inventario está en niveles adecuados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alerts.alerts.map((a: any) => (
                  <div key={a.id} className={`rounded-xl border-2 bg-white p-4 ${
                    a.severity === 'critical' ? 'border-red-300' : 'border-amber-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-500">{a.sku} · {a.categoryName}</p>
                      </div>
                      {a.severity === 'critical' ? (
                        <span className="rounded-full bg-red-100 p-1.5"><AlertTriangle size={16} className="text-red-600" /></span>
                      ) : (
                        <span className="rounded-full bg-amber-100 p-1.5"><TrendingDown size={16} className="text-amber-600" /></span>
                      )}
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{a.currentStock} <span className="text-sm font-normal text-gray-400">{a.unit}</span></p>
                        <p className="text-xs text-gray-500">Mínimo: {a.minStock}</p>
                      </div>
                      <button onClick={() => openMovementForm(a, 'purchase')}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                        <Plus size={14} /> Reabastecer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Movement Form Modal */}
      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowMovementForm(false); resetForm(); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Movimiento</h3>

            {/* Product selection if not pre-selected */}
            {!selectedProduct ? (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Producto</label>
                <select onChange={e => {
                  const p = stockData.find(s => s.id === e.target.value);
                  if (p) setSelectedProduct(p);
                }} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                  <option value="">Seleccionar producto...</option>
                  {stockData.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-4 rounded-lg bg-gray-50 p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-500">Stock actual: {selectedProduct.currentStock} {selectedProduct.unit}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            )}

            {/* Movement type */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de Movimiento</label>
              <div className="grid grid-cols-4 gap-2">
                {MOVEMENT_TYPES.map(mt => (
                  <button key={mt.id} onClick={() => setMovementType(mt.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-medium transition ${
                      movementType === mt.id ? `${mt.bg} border-current ${mt.color}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    <mt.icon size={18} />
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {movementType === 'adjustment' ? 'Stock nuevo (conteo real)' : 'Cantidad'}
              </label>
              <input type="number" value={movementQty} onChange={e => setMovementQty(e.target.value)}
                placeholder={movementType === 'adjustment' ? 'Ej: 25' : 'Ej: 10'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-semibold text-gray-900 focus:border-blue-400 focus:outline-none" />
            </div>

            {/* Cost (only for purchases) */}
            {movementType === 'purchase' && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Costo unitario (S/)</label>
                <input type="number" step="0.01" value={movementCost} onChange={e => setMovementCost(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
            )}

            {/* Reference & Notes */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Referencia</label>
                <input type="text" value={movementRef} onChange={e => setMovementRef(e.target.value)}
                  placeholder="Ej: Factura 001-123" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <input type="text" value={movementNotes} onChange={e => setMovementNotes(e.target.value)}
                  placeholder="Opcional" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setShowMovementForm(false); resetForm(); }}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleRecordMovement} disabled={actionLoading || !selectedProduct || !movementQty}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                {actionLoading ? 'Procesando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
    </AppShell>
  );
}

function SummaryCard({ label, value, icon: Icon, color, bg }: { label: string; value: any; icon: any; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
      <div className={`rounded-lg p-2 ${bg}`}><Icon size={18} className={color} /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
