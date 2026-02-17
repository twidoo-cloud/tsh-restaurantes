'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';
import { formatMoney } from '@/lib/currency';
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, CreditCard, Banknote, Receipt, ChevronRight, X,
  Lock, Unlock, History, Wifi, WifiOff, FileDown, FileSpreadsheet
} from 'lucide-react';
import { generateShiftPDF, generateShiftExcel } from '@/lib/reports';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Error'); }
  const text = await res.text(); if (!text) return null; return JSON.parse(text);
}

const METHOD_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  cash: { label: 'Efectivo', icon: Banknote, color: 'text-green-600 bg-green-50' },
  credit_card: { label: 'Tarjeta Crédito', icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
  debit_card: { label: 'Tarjeta Débito', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50' },
  transfer: { label: 'Transferencia', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  wallet: { label: 'Billetera Digital', icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
};

export default function ShiftsPage() {
  const router = useRouter();
  const store = usePosStore();
  const { connected: wsConnected, on: wsOn } = useSocket();

  const [activeShift, setActiveShift] = useState<any>(null);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closeResult, setCloseResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [active, registers] = await Promise.all([
        apiRequest<any>('/shifts/active'),
        apiRequest<any[]>('/shifts/cash-registers'),
      ]);
      setActiveShift(active);
      setCashRegisters(registers);
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  }, []);

  const loadHistory = async () => {
    try {
      const history = await apiRequest<any>('/shifts?limit=20');
      setShiftHistory(history.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const unsubs = [
      wsOn(WS_EVENTS.SHIFT_OPENED, () => loadData()),
      wsOn(WS_EVENTS.SHIFT_CLOSED, () => loadData()),
      wsOn(WS_EVENTS.ORDER_PAID, () => { if (activeShift) loadData(); }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [wsOn, loadData, activeShift]);

  const handleOpenShift = async () => {
    if (!selectedRegister || !openingAmount) return;
    setActionLoading(true);
    try {
      await apiRequest('/shifts/open', {
        method: 'POST',
        body: JSON.stringify({ cashRegisterId: selectedRegister, openingAmount: parseFloat(openingAmount), notes: openingNotes || undefined }),
      });
      setShowOpenDialog(false); setOpeningAmount(''); setOpeningNotes('');
      await loadData();
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const handleCloseShift = async () => {
    if (!activeShift || !closingAmount) return;
    setActionLoading(true);
    try {
      const result = await apiRequest<any>(`/shifts/${activeShift.id}/close`, {
        method: 'PATCH',
        body: JSON.stringify({ closingAmount: parseFloat(closingAmount), notes: closingNotes || undefined }),
      });
      setCloseResult(result);
      await loadData();
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const handleViewDetail = async (shiftId: string) => {
    try {
      const detail = await apiRequest<any>(`/shifts/${shiftId}`);
      setSelectedShiftDetail(detail);
      setShowDetailDialog(true);
    } catch (e: any) { alert(e.message); }
  };

  const elapsed = activeShift?.opened_at ? Math.floor((Date.now() - new Date(activeShift.opened_at).getTime()) / 1000) : 0;
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);

  if (loading) return <div className="flex h-full items-center justify-center bg-gray-100"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-100">
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Shifts</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => { loadHistory(); setShowHistoryDialog(true); }} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><History size={16} /> Historial</button>

          </div>

        </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeShift ? (
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Status Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20"><Unlock size={24} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Turno Abierto</h2>
                    <p className="text-green-100">{activeShift.cash_register_name} — {activeShift.opened_by_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-2xl font-bold font-mono"><Clock size={20} />{hours}h {mins.toString().padStart(2, '0')}m</div>
                  <p className="text-sm text-green-200">Desde {new Date(activeShift.opened_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium text-gray-500 uppercase">Monto Apertura</p><p className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(activeShift.opening_amount)}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium text-gray-500 uppercase">Ventas Totales</p><p className="mt-1 text-2xl font-bold text-blue-600">{formatMoney(activeShift.total_sales)}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium text-gray-500 uppercase">Efectivo Esperado</p><p className="mt-1 text-2xl font-bold text-green-600">{formatMoney(activeShift.expected_cash)}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium text-gray-500 uppercase">Órdenes</p><p className="mt-1 text-2xl font-bold text-gray-900">{activeShift.ordersSummary?.reduce((s: number, o: any) => s + o.count, 0) || 0}</p></div>
            </div>

            {/* Payment Breakdown */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">Desglose por Método de Pago</h3>
              {activeShift.payments?.length > 0 ? (
                <div className="space-y-3">
                  {activeShift.payments.map((p: any) => {
                    const cfg = METHOD_LABELS[p.method] || { label: p.method, icon: DollarSign, color: 'text-gray-600 bg-gray-50' };
                    const Icon = cfg.icon;
                    return (<div key={p.method} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.color}`}><Icon size={20} /></div>
                        <div><p className="font-medium text-gray-900">{cfg.label}</p><p className="text-xs text-gray-500">{p.count} transacciones</p></div>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{formatMoney(p.total)}</p>
                    </div>);
                  })}
                </div>
              ) : (<p className="text-center text-sm text-gray-400 py-4">No hay pagos registrados en este turno</p>)}
            </div>

            <button onClick={() => { setClosingAmount(''); setClosingNotes(''); setCloseResult(null); setShowCloseDialog(true); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 text-lg font-bold text-white hover:bg-red-700 shadow-lg">
              <Lock size={22} /> Cerrar Turno — Arqueo de Caja
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50"><Lock size={36} className="text-amber-600" /></div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">No hay turno abierto</h2>
              <p className="mt-2 text-sm text-gray-500">Abre un turno para comenzar a registrar ventas. Las órdenes se vincularán automáticamente al turno activo.</p>
              <div className="mt-6 space-y-3">
                {cashRegisters.map((cr: any) => (
                  <div key={cr.id} className={`flex items-center justify-between rounded-xl border-2 p-4 transition ${cr.active_shift ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-green-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cr.active_shift ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}><Receipt size={20} /></div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{cr.name}</p>
                        {cr.active_shift ? <p className="text-xs text-blue-600">Turno abierto por {cr.active_shift.opened_by}</p> : <p className="text-xs text-gray-500">Disponible</p>}
                      </div>
                    </div>
                    {!cr.active_shift && (
                      <button onClick={() => { setSelectedRegister(cr.id); setShowOpenDialog(true); }}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"><Unlock size={16} /> Abrir Turno</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Open Shift Dialog */}
      {showOpenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOpenDialog(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-900">Abrir Turno</h3><button onClick={() => setShowOpenDialog(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button></div>
            <p className="text-sm text-gray-500 mb-4">Ingresa el monto inicial de efectivo en la caja.</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Monto de Apertura ($)</label>
                <input type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} placeholder="0.00" step="0.01" min="0"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-xl font-bold text-gray-900 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map(amt => (<button key={amt} onClick={() => setOpeningAmount(amt.toString())} className="rounded-lg border bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:border-green-300">${amt}</button>))}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
                <input type="text" value={openingNotes} onChange={e => setOpeningNotes(e.target.value)} placeholder="Ej: Turno de la mañana" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-400 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowOpenDialog(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleOpenShift} disabled={actionLoading || !openingAmount} className="flex-1 rounded-xl bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50">{actionLoading ? 'Abriendo...' : 'Abrir Turno'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!closeResult) setShowCloseDialog(false); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {closeResult ? (
              <div className="text-center">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${closeResult.status === 'balanced' ? 'bg-green-100' : closeResult.status === 'surplus' ? 'bg-blue-100' : 'bg-red-100'}`}>
                  {closeResult.status === 'balanced' ? <CheckCircle2 size={32} className="text-green-600" /> : closeResult.status === 'surplus' ? <TrendingUp size={32} className="text-blue-600" /> : <AlertTriangle size={32} className="text-red-600" />}
                </div>
                <h3 className="mt-3 text-lg font-bold text-gray-900">Turno Cerrado</h3>
                <p className={`text-sm font-medium ${closeResult.status === 'balanced' ? 'text-green-600' : closeResult.status === 'surplus' ? 'text-blue-600' : 'text-red-600'}`}>
                  {closeResult.status === 'balanced' ? 'Cuadre perfecto ✓' : closeResult.status === 'surplus' ? `Sobrante: ${formatMoney(closeResult.difference)}` : `Faltante: ${formatMoney(Math.abs(closeResult.difference))}`}
                </p>
                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Apertura</span><span className="font-medium">{formatMoney(closeResult.openingAmount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Ventas totales</span><span className="font-medium">{formatMoney(closeResult.totalSales)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Órdenes</span><span className="font-medium">{closeResult.ordersCount}</span></div>
                  <div className="flex justify-between text-sm border-t pt-2"><span className="text-gray-500">Esperado en caja</span><span className="font-semibold">{formatMoney(closeResult.expectedAmount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Conteo real</span><span className="font-semibold">{formatMoney(closeResult.closingAmount)}</span></div>
                  <div className={`flex justify-between text-sm border-t pt-2 font-bold ${closeResult.difference === 0 ? 'text-green-600' : closeResult.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    <span>Diferencia</span><span>{closeResult.difference >= 0 ? '+' : ''}{formatMoney(closeResult.difference)}</span>
                  </div>
                </div>
                {closeResult.payments.length > 0 && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Desglose de pagos</p>
                    {closeResult.payments.map((p: any) => (<div key={p.method} className="flex justify-between text-sm py-1"><span className="text-gray-600">{METHOD_LABELS[p.method]?.label || p.method} ({p.count})</span><span className="font-medium">{formatMoney(p.total)}</span></div>))}
                  </div>
                )}
                <button onClick={() => { setShowCloseDialog(false); setCloseResult(null); setClosingAmount(''); setClosingNotes(''); }} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">Aceptar</button>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => generateShiftPDF(closeResult.shiftId)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <FileDown size={16} className="text-red-500" /> PDF
                  </button>
                  <button onClick={() => generateShiftExcel(closeResult.shiftId)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <FileSpreadsheet size={16} className="text-green-600" /> Excel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-900">Cerrar Turno — Arqueo</h3><button onClick={() => setShowCloseDialog(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button></div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
                  <p className="text-sm text-amber-800"><strong>Efectivo esperado:</strong> {formatMoney(activeShift?.expected_cash || 0)}</p>
                  <p className="text-xs text-amber-600 mt-1">Apertura ({formatMoney(activeShift?.opening_amount || 0)}) + Pagos en efectivo</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Conteo de Efectivo ($)</label>
                    <input type="number" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} placeholder="0.00" step="0.01" min="0"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-xl font-bold text-gray-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20" />
                  </div>
                  {closingAmount && activeShift?.expected_cash != null && (
                    <div className={`rounded-lg p-3 text-center text-sm font-semibold ${
                      parseFloat(closingAmount) === activeShift.expected_cash ? 'bg-green-50 text-green-700' : parseFloat(closingAmount) > activeShift.expected_cash ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                    }`}>Diferencia: {parseFloat(closingAmount) - activeShift.expected_cash >= 0 ? '+' : ''}{formatMoney(parseFloat(closingAmount) - activeShift.expected_cash)}{parseFloat(closingAmount) === activeShift.expected_cash && ' ✓ Cuadra'}</div>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
                    <input type="text" value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Observaciones del cierre" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-red-400 focus:outline-none" />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setShowCloseDialog(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleCloseShift} disabled={actionLoading || !closingAmount} className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{actionLoading ? 'Cerrando...' : 'Cerrar Turno'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* History Dialog */}
      {showHistoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowHistoryDialog(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4"><h3 className="text-lg font-bold text-gray-900">Historial de Turnos</h3><button onClick={() => setShowHistoryDialog(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button></div>
            <div className="flex-1 overflow-y-auto p-6">
              {shiftHistory.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">No hay turnos registrados</p> : (
                <div className="space-y-3">
                  {shiftHistory.map((s: any) => (
                    <button key={s.id} onClick={() => handleViewDetail(s.id)} className="flex w-full items-center justify-between rounded-xl border p-4 text-left hover:bg-gray-50 hover:shadow-sm transition">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{s.status === 'open' ? <Unlock size={20} /> : <Lock size={20} />}</div>
                        <div>
                          <p className="font-medium text-gray-900">{s.cash_register_name}</p>
                          <p className="text-xs text-gray-500">{new Date(s.opened_at).toLocaleDateString('es-EC')} {new Date(s.opened_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}{s.closed_at && ` — ${new Date(s.closed_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`}</p>
                          <p className="text-xs text-gray-400">{s.opened_by_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatMoney(s.total_sales)}</p>
                          <p className="text-xs text-gray-500">{s.orders_count} órdenes</p>
                          {s.difference != null && <p className={`text-xs font-medium ${s.difference === 0 ? 'text-green-600' : s.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>{s.difference >= 0 ? '+' : ''}{formatMoney(s.difference)}</p>}
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shift Detail Dialog */}
      {showDetailDialog && selectedShiftDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetailDialog(false)}>
          <div className="w-full max-w-lg max-h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4"><h3 className="text-lg font-bold text-gray-900">Detalle del Turno</h3><button onClick={() => setShowDetailDialog(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Caja</p><p className="font-semibold">{selectedShiftDetail.cash_register_name}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Abierto por</p><p className="font-semibold">{selectedShiftDetail.opened_by_name}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Apertura</p><p className="font-semibold">{formatMoney(selectedShiftDetail.opening_amount)}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Ventas</p><p className="font-semibold text-blue-600">{formatMoney(selectedShiftDetail.total_sales)}</p></div>
              </div>
              {selectedShiftDetail.closing_amount != null && (
                <div className={`rounded-lg p-4 ${selectedShiftDetail.difference === 0 ? 'bg-green-50 border border-green-200' : selectedShiftDetail.difference > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex justify-between text-sm"><span>Esperado</span><span className="font-medium">{formatMoney(selectedShiftDetail.expected_amount)}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span>Conteo</span><span className="font-medium">{formatMoney(selectedShiftDetail.closing_amount)}</span></div>
                  <div className={`flex justify-between text-sm mt-1 pt-1 border-t font-bold ${selectedShiftDetail.difference === 0 ? 'text-green-700 border-green-300' : selectedShiftDetail.difference > 0 ? 'text-blue-700 border-blue-300' : 'text-red-700 border-red-300'}`}>
                    <span>Diferencia</span><span>{selectedShiftDetail.difference >= 0 ? '+' : ''}{formatMoney(selectedShiftDetail.difference)}</span>
                  </div>
                </div>
              )}
              {selectedShiftDetail.payments?.length > 0 && (<div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pagos</h4>{selectedShiftDetail.payments.map((p: any) => (<div key={p.method} className="flex justify-between text-sm py-1.5 border-b last:border-0"><span>{METHOD_LABELS[p.method]?.label || p.method} ({p.count})</span><span className="font-medium">{formatMoney(p.total)}</span></div>))}</div>)}
              {selectedShiftDetail.topProducts?.length > 0 && (<div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Productos</h4>{selectedShiftDetail.topProducts.map((p: any, i: number) => (<div key={i} className="flex justify-between text-sm py-1.5 border-b last:border-0"><span>{p.name} <span className="text-gray-400">×{p.quantity}</span></span><span className="font-medium">{formatMoney(p.amount)}</span></div>))}</div>)}

              <div className="flex gap-2 pt-2">
                <button onClick={() => generateShiftPDF(selectedShiftDetail.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <FileDown size={16} className="text-red-500" /> Exportar PDF
                </button>
                <button onClick={() => generateShiftExcel(selectedShiftDetail.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <FileSpreadsheet size={16} className="text-green-600" /> Exportar Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
