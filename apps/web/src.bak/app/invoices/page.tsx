'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney } from '@/lib/currency';
import {
  FileText, Send, Check, AlertTriangle, X, RefreshCw,
  BarChart3, Package, LayoutGrid, ChefHat, Eye, Download, Search, Plus
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

const apiPost = async <T,>(path: string, body?: any): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    method: body !== undefined ? 'POST' : 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Error'); }
  return res.json();
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Borrador' },
  generated: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Generada' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Enviada al SRI' },
  authorized: { bg: 'bg-green-100', text: 'text-green-700', label: 'Autorizada' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazada' },
  voided: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Anulada' },
};

export default function InvoicesPage() {
  const router = useRouter();
  const store = usePosStore();
  const [invoices, setInvoices] = useState<any>({ data: [], total: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [buyerTaxId, setBuyerTaxId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const loadData = useCallback(async () => {
    try {
      const [inv, sum, orders] = await Promise.all([
        apiGet<any>('/invoices'),
        apiGet<any>('/invoices/summary'),
        apiGet<any[]>('/orders?status=completed&limit=20'),
      ]);
      setInvoices(inv);
      setSummary(sum);
      setCompletedOrders(Array.isArray(orders) ? orders : (orders as any).data || []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    try {
      const result = await apiPost<any>('/invoices/generate', {
        orderId: selectedOrderId,
        taxId: buyerTaxId || undefined,
        name: buyerName || undefined,
        email: buyerEmail || undefined,
      });
      showToast(`✅ Factura ${result.fullNumber} generada — Clave: ${result.claveAcceso?.substring(0, 20)}...`);
      setShowGenerate(false);
      setBuyerTaxId(''); setBuyerName(''); setBuyerEmail(''); setSelectedOrderId('');
      loadData();
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    }
    setActionLoading(false);
  };

  const handleSendSri = async (invoiceId: string) => {
    setActionLoading(true);
    try {
      const result = await apiPost<any>(`/invoices/${invoiceId}/send`);
      showToast(`📤 Enviada al SRI — Estado: ${result.estado}`);
      loadData();
    } catch (e: any) { showToast(`❌ ${e.message}`); }
    setActionLoading(false);
  };

  const handleCheckAuth = async (invoiceId: string) => {
    setActionLoading(true);
    try {
      const result = await apiPost<any>(`/invoices/${invoiceId}/check`);
      showToast(`✅ Autorizada — ${result.numeroAutorizacion?.substring(0, 20)}...`);
      loadData();
    } catch (e: any) { showToast(`❌ ${e.message}`); }
    setActionLoading(false);
  };

  const handleViewDetail = async (invoiceId: string) => {
    try {
      const detail = await apiGet<any>(`/invoices/${invoiceId}`);
      setShowDetail(detail);
    } catch (e: any) { showToast(`❌ ${e.message}`); }
  };

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Facturación Electrónica</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><BarChart3 size={16} /> Dashboard</button>

            <button onClick={loadData} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><RefreshCw size={18} /></button>

          </div>

        </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-white border-b">
          <StatCard label="Total Facturas" value={summary.total_invoices} icon={FileText} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Autorizadas" value={summary.authorized} icon={Check} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Pendientes" value={summary.pending + summary.sent} icon={Send} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Facturado Hoy" value={formatMoney(summary.today_total)} icon={FileText} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Total Autorizado" value={formatMoney(summary.authorized_total)} icon={Check} color="text-green-600" bg="bg-green-50" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            {/* Actions */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Comprobantes Electrónicos</h2>
              <button onClick={() => setShowGenerate(true)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                <Plus size={16} /> Nueva Factura
              </button>
            </div>

            {/* Invoices Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Nº Comprobante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Orden</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Subtotal</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">IVA</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.data.map((inv: any) => {
                    const st = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{inv.full_number}</td>
                        <td className="px-4 py-3 text-gray-500">{inv.order_number || '-'}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{inv.document_type}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatMoney(inv.subtotal)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatMoney(inv.tax_amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(inv.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(inv.issued_at).toLocaleDateString('es-EC')}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewDetail(inv.id)} title="Ver detalle"
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Eye size={16} /></button>
                            {inv.status === 'generated' && (
                              <button onClick={() => handleSendSri(inv.id)} title="Enviar al SRI" disabled={actionLoading}
                                className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Send size={16} /></button>
                            )}
                            {inv.status === 'sent' && (
                              <button onClick={() => handleCheckAuth(inv.id)} title="Verificar autorización" disabled={actionLoading}
                                className="rounded p-1.5 text-green-600 hover:bg-green-50"><Check size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {invoices.data.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>No hay facturas generadas</p>
                  <p className="text-sm mt-1">Genera tu primera factura desde una orden completada</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate Invoice Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGenerate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Generar Factura Electrónica</h3>
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">SRI Ecuador</span>
            </div>

            {/* Order selection */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Orden completada</label>
              <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none">
                <option value="">Seleccionar orden...</option>
                {completedOrders.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.orderNumber} — {formatMoney(parseFloat(o.total))}</option>
                ))}
              </select>
            </div>

            <div className="mb-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Datos del comprador (opcional — si no se llena, se emite como Consumidor Final)</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">RUC / Cédula</label>
                  <input type="text" value={buyerTaxId} onChange={e => setBuyerTaxId(e.target.value)} placeholder="1792345678001"
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Razón Social</label>
                  <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nombre o razón social"
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email (para envío de comprobante)</label>
                  <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="cliente@email.com"
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
              <p className="text-xs text-amber-700">
                ⚠️ <strong>Modo Pruebas:</strong> Las facturas se generan en ambiente de pruebas del SRI. Para producción se requiere firma electrónica (.p12) configurada.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowGenerate(false)}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleGenerate} disabled={actionLoading || !selectedOrderId}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
                {actionLoading ? 'Generando...' : '📄 Generar Factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetail(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Factura {showDetail.full_number}</h3>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">Estado</p>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${(STATUS_STYLES[showDetail.status] || STATUS_STYLES.draft).bg} ${(STATUS_STYLES[showDetail.status] || STATUS_STYLES.draft).text}`}>
                  {(STATUS_STYLES[showDetail.status] || STATUS_STYLES.draft).label}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">Clave de Acceso</p>
                <p className="text-xs font-mono text-gray-700 break-all">{showDetail.authority_response?.claveAcceso || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-gray-500">Subtotal</p>
                <p className="text-lg font-bold text-gray-900">{formatMoney(parseFloat(showDetail.subtotal))}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-gray-500">IVA</p>
                <p className="text-lg font-bold text-amber-600">{formatMoney(parseFloat(showDetail.tax_amount))}</p>
              </div>
              <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-3 text-center">
                <p className="text-xs text-indigo-500">Total</p>
                <p className="text-lg font-bold text-indigo-700">{formatMoney(parseFloat(showDetail.total))}</p>
              </div>
            </div>

            {/* Items */}
            {showDetail.items?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Detalle</h4>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">Descripción</th>
                        <th className="px-3 py-2 text-right text-gray-500">Cant.</th>
                        <th className="px-3 py-2 text-right text-gray-500">P. Unit.</th>
                        <th className="px-3 py-2 text-right text-gray-500">IVA</th>
                        <th className="px-3 py-2 text-right text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {showDetail.items.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-900">{item.description}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{parseFloat(item.quantity)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatMoney(parseFloat(item.unit_price))}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatMoney(parseFloat(item.tax_amount))}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatMoney(parseFloat(item.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SRI Response */}
            {showDetail.authority_response && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Respuesta SRI</h4>
                <pre className="rounded-lg bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto max-h-40">
                  {JSON.stringify(showDetail.authority_response, null, 2)}
                </pre>
              </div>
            )}

            {/* XML Preview */}
            {showDetail.xml_content && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">XML Comprobante</h4>
                <pre className="rounded-lg bg-gray-50 border p-3 text-[10px] text-gray-600 overflow-x-auto max-h-48 font-mono">
                  {showDetail.xml_content}
                </pre>
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

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: any; icon: any; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
      <div className={`rounded-lg p-2 ${bg}`}><Icon size={18} className={color} /></div>
      <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900">{value}</p></div>
    </div>
  );
}
