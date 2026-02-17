'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import {
  X, Users, DollarSign, Banknote, CreditCard, Check,
  Minus, Plus, ArrowLeft, ChevronRight,
} from 'lucide-react';

interface SplitBillModalProps {
  order: any;
  branding: any;
  onClose: () => void;
  onOrderCompleted: () => void;
}

type SplitMode = 'select' | 'equal' | 'by_items' | 'custom' | 'pay';

const GUEST_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500',
];
const GUEST_COLORS_LIGHT = [
  'border-blue-400 bg-blue-50', 'border-emerald-400 bg-emerald-50',
  'border-purple-400 bg-purple-50', 'border-amber-400 bg-amber-50',
  'border-pink-400 bg-pink-50', 'border-cyan-400 bg-cyan-50',
  'border-red-400 bg-red-50', 'border-indigo-400 bg-indigo-50',
];

export default function SplitBillModal({ order, branding, onClose, onOrderCompleted }: SplitBillModalProps) {
  const [mode, setMode] = useState<SplitMode>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [splits, setSplits] = useState<any[]>([]);
  const [numGuests, setNumGuests] = useState(2);
  const [guestNames, setGuestNames] = useState<string[]>(['', '']);
  const [assignments, setAssignments] = useState<Map<string, number>>(new Map());
  const [selectedGuest, setSelectedGuest] = useState(0);
  const [customAmounts, setCustomAmounts] = useState<{ name: string; amount: string }[]>([
    { name: '', amount: '' }, { name: '', amount: '' },
  ]);
  const [payingSplitId, setPayingSplitId] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const orderItems = order?.items?.filter((i: any) => !i.isVoid) || [];
  const orderTotal = order ? parseFloat(order.total) : 0;
  const perPerson = numGuests > 0 ? orderTotal / numGuests : 0;

  useEffect(() => {
    if (order?.splits?.length > 0) loadSplits();
  }, []);

  const loadSplits = async () => {
    try {
      const data = await api.getOrderSplits(order.id);
      setSplits(data.splits || []);
      if (data.splits?.length > 0) setMode('pay');
    } catch (e: any) { setError(e.message); }
  };

  const updateGuestCount = (n: number) => {
    const c = Math.max(2, Math.min(20, n));
    setNumGuests(c);
    const names = [...guestNames];
    while (names.length < c) names.push('');
    setGuestNames(names.slice(0, c));
    const amts = [...customAmounts];
    while (amts.length < c) amts.push({ name: '', amount: '' });
    setCustomAmounts(amts.slice(0, c));
  };

  const handleEqualSplit = async () => {
    setLoading(true); setError('');
    try {
      const names = guestNames.some(n => n.trim()) ? guestNames.map((n, i) => n.trim() || `Persona ${i + 1}`) : undefined;
      const data = await api.splitEqual(order.id, { numberOfGuests: numGuests, guestNames: names });
      setSplits(data.splits || []); setMode('pay');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const toggleItemAssignment = (itemId: string) => {
    setAssignments(prev => {
      const next = new Map(prev);
      next.get(itemId) === selectedGuest ? next.delete(itemId) : next.set(itemId, selectedGuest);
      return next;
    });
  };

  const handleItemsSplit = async () => {
    setLoading(true); setError('');
    try {
      const ga: { guestIndex: number; itemIds: string[] }[] = [];
      for (let i = 0; i < numGuests; i++) {
        ga.push({ guestIndex: i, itemIds: [...assignments.entries()].filter(([, gi]) => gi === i).map(([id]) => id) });
      }
      const names = guestNames.some(n => n.trim()) ? guestNames.map((n, i) => n.trim() || `Persona ${i + 1}`) : undefined;
      const data = await api.splitByItems(order.id, { numberOfGuests: numGuests, guestNames: names, assignments: ga });
      setSplits(data.splits || []); setMode('pay');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const customTotal = customAmounts.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);

  const handleCustomSplit = async () => {
    setLoading(true); setError('');
    try {
      const guests = customAmounts.map((g, i) => ({ name: g.name.trim() || `Persona ${i + 1}`, amount: parseFloat(g.amount) || 0 }));
      const data = await api.splitCustom(order.id, { guests });
      setSplits(data.splits || []); setMode('pay');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSplitPayment = async (method: string) => {
    if (!payingSplitId) return;
    const split = splits.find(s => s.id === payingSplitId);
    if (!split) return;
    setLoading(true); setError('');
    try {
      const amount = split.remaining > 0 ? split.remaining : split.total;
      const cash = method === 'cash' ? (parseFloat(cashAmount) || amount) : undefined;
      const result = await api.processSplitPayment(order.id, payingSplitId, { method, amount, cashReceived: cash });
      setPaymentResult(result);
      if (result.allSplitsPaid) {
        setTimeout(() => onOrderCompleted(), 2500);
      } else {
        setTimeout(async () => {
          setPaymentResult(null); setPayingSplitId(null); setCashAmount('');
          await loadSplits();
        }, 1500);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleUnsplit = async () => {
    if (!confirm('¿Quitar la división? Esto eliminará todos los splits.')) return;
    setLoading(true); setError('');
    try {
      await api.removeSplits(order.id);
      setSplits([]); setMode('select');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ═══ RENDER ═══

  const GuestCounter = () => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">Número de personas</span>
      <div className="flex items-center gap-3">
        <button onClick={() => updateGuestCount(numGuests - 1)} disabled={numGuests <= 2}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-30">
          <Minus size={16} />
        </button>
        <span className="w-8 text-center text-xl font-bold text-gray-900">{numGuests}</span>
        <button onClick={() => updateGuestCount(numGuests + 1)} disabled={numGuests >= 20}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-30"
          style={{ backgroundColor: branding.accentColor }}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );

  const GuestNameInputs = () => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase">Nombres (opcional)</p>
      {guestNames.map((name, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${GUEST_COLORS[i % GUEST_COLORS.length]}`}>
            {i + 1}
          </div>
          <input type="text" value={name}
            onChange={(e) => { const n = [...guestNames]; n[i] = e.target.value; setGuestNames(n); }}
            placeholder={`Persona ${i + 1}`}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
        </div>
      ))}
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg: Record<string, { bg: string; label: string }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
      partial: { bg: 'bg-orange-100 text-orange-700', label: 'Parcial' },
      paid: { bg: 'bg-green-100 text-green-700', label: 'Pagado' },
    };
    const c = cfg[status] || { bg: 'bg-gray-100 text-gray-600', label: status };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.bg}`}>{c.label}</span>;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {mode !== 'select' && mode !== 'pay' && (
              <button onClick={() => setMode('select')} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><ArrowLeft size={18} /></button>
            )}
            <Users size={20} style={{ color: branding.accentColor }} />
            <h2 className="text-lg font-bold text-gray-900">Dividir Cuenta</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500">{order.orderNumber}</span>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        {/* Total banner */}
        <div className="flex items-center justify-between border-b px-4 py-2" style={{ backgroundColor: `${branding.accentColor}10` }}>
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-lg font-bold" style={{ color: branding.accentColor }}>{formatMoney(orderTotal)}</span>
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ═══ SELECT MODE ═══ */}
          {mode === 'select' && (
            <div className="space-y-3">
              <p className="mb-4 text-sm text-gray-500">¿Cómo dividir la cuenta?</p>
              {[
                { key: 'equal' as SplitMode, icon: Users, color: 'blue', title: 'Partes Iguales', desc: 'Divide el total entre el número de personas' },
                { key: 'by_items' as SplitMode, icon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>, color: 'emerald', title: 'Por Items', desc: 'Asigna cada producto a quien lo pidió' },
                { key: 'custom' as SplitMode, icon: DollarSign, color: 'purple', title: 'Monto Personalizado', desc: 'Define cuánto paga cada persona' },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.key} onClick={() => { setMode(opt.key); updateGuestCount(2); setAssignments(new Map()); }}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left transition hover:border-${opt.color}-300 hover:bg-${opt.color}-50/50`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${opt.color}-100`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{opt.title}</h3>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══ EQUAL ═══ */}
          {mode === 'equal' && (
            <div className="space-y-4">
              <GuestCounter />
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">Cada persona paga</p>
                <p className="mt-1 text-3xl font-bold" style={{ color: branding.accentColor }}>{formatMoney(perPerson)}</p>
              </div>
              <GuestNameInputs />
            </div>
          )}

          {/* ═══ BY ITEMS ═══ */}
          {mode === 'by_items' && (
            <div className="space-y-4">
              <GuestCounter />
              {/* Guest selector tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: numGuests }).map((_, i) => (
                  <button key={i} onClick={() => setSelectedGuest(i)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition ${
                      selectedGuest === i
                        ? `${GUEST_COLORS_LIGHT[i % GUEST_COLORS_LIGHT.length]} border-2`
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                    <div className={`h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${GUEST_COLORS[i % GUEST_COLORS.length]}`}>{i + 1}</div>
                    {guestNames[i]?.trim() || `Persona ${i + 1}`}
                    <span className="text-xs opacity-60">
                      ({[...assignments.entries()].filter(([, gi]) => gi === i).length})
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Toca un item para asignarlo a {guestNames[selectedGuest]?.trim() || `Persona ${selectedGuest + 1}`}</p>
              {/* Items list */}
              <div className="space-y-1.5">
                {orderItems.map((item: any) => {
                  const assignedTo = assignments.get(item.id);
                  const isAssigned = assignedTo !== undefined;
                  const isThisGuest = assignedTo === selectedGuest;
                  return (
                    <button key={item.id} onClick={() => toggleItemAssignment(item.id)}
                      className={`flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-left transition ${
                        isThisGuest
                          ? `${GUEST_COLORS_LIGHT[selectedGuest % GUEST_COLORS_LIGHT.length]}`
                          : isAssigned
                            ? `${GUEST_COLORS_LIGHT[assignedTo! % GUEST_COLORS_LIGHT.length]} opacity-50`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isAssigned && (
                          <div className={`h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 ${GUEST_COLORS[assignedTo! % GUEST_COLORS.length]}`}>
                            {assignedTo! + 1}
                          </div>
                        )}
                        <span className="text-sm text-gray-900 truncate">{item.product?.name || 'Item'}</span>
                        <span className="text-xs text-gray-400">×{parseFloat(item.quantity)}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 shrink-0 ml-2">
                        {formatMoney(parseFloat(item.subtotal) + parseFloat(item.taxAmount))}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Unassigned count */}
              {orderItems.length - assignments.size > 0 && (
                <p className="text-xs text-amber-600">
                  {orderItems.length - assignments.size} item(s) sin asignar — se dividirán entre todos
                </p>
              )}
              <GuestNameInputs />
            </div>
          )}

          {/* ═══ CUSTOM ═══ */}
          {mode === 'custom' && (
            <div className="space-y-4">
              <GuestCounter />
              <div className="space-y-2">
                {customAmounts.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${GUEST_COLORS[i % GUEST_COLORS.length]}`}>
                      {i + 1}
                    </div>
                    <input type="text" value={g.name}
                      onChange={(e) => { const a = [...customAmounts]; a[i] = { ...a[i], name: e.target.value }; setCustomAmounts(a); }}
                      placeholder={`Persona ${i + 1}`}
                      className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input type="number" step="0.01" value={g.amount}
                        onChange={(e) => { const a = [...customAmounts]; a[i] = { ...a[i], amount: e.target.value }; setCustomAmounts(a); }}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-200 py-1.5 pl-6 pr-2 text-right text-sm font-semibold text-gray-900 focus:border-blue-400 focus:outline-none" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Auto-fill last button */}
              {customAmounts.length >= 2 && (
                <button onClick={() => {
                  const filled = customAmounts.slice(0, -1).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
                  const last = Math.max(0, orderTotal - filled);
                  const a = [...customAmounts];
                  a[a.length - 1] = { ...a[a.length - 1], amount: last.toFixed(2) };
                  setCustomAmounts(a);
                }} className="text-sm font-medium hover:underline" style={{ color: branding.accentColor }}>
                  Auto-completar último monto
                </button>
              )}
              {/* Sum indicator */}
              <div className={`rounded-lg border-2 border-dashed p-3 text-center ${
                Math.abs(customTotal - orderTotal) < 0.02 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
              }`}>
                <span className="text-sm text-gray-600">Suma: </span>
                <span className={`text-lg font-bold ${Math.abs(customTotal - orderTotal) < 0.02 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatMoney(customTotal)}
                </span>
                <span className="text-sm text-gray-500"> / {formatMoney(orderTotal)}</span>
              </div>
            </div>
          )}

          {/* ═══ PAY SPLITS ═══ */}
          {mode === 'pay' && (
            <div className="space-y-3">
              {/* All paid banner */}
              {splits.every(s => s.status === 'paid') && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                  <Check size={32} className="mx-auto text-green-600 mb-1" />
                  <p className="text-lg font-bold text-green-700">¡Todas las cuentas pagadas!</p>
                </div>
              )}

              {splits.map((split, i) => (
                <div key={split.id} className={`rounded-xl border-2 p-3 transition ${
                  split.status === 'paid' ? 'border-green-200 bg-green-50/50' :
                  payingSplitId === split.id ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${GUEST_COLORS[i % GUEST_COLORS.length]}`}>
                        {i + 1}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{split.label}</span>
                    </div>
                    <StatusBadge status={split.status} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">{formatMoney(split.total)}</span>
                    {split.status !== 'paid' && (
                      <span className="text-xs text-gray-500">
                        Restante: {formatMoney(split.remaining > 0 ? split.remaining : split.total)}
                      </span>
                    )}
                  </div>

                  {/* Payment UI for this split */}
                  {payingSplitId === split.id && split.status !== 'paid' && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {paymentResult ? (
                        <div className="rounded-lg bg-green-50 p-3 text-center">
                          <p className="font-bold text-green-700">¡Pagado!</p>
                          {paymentResult.change > 0 && (
                            <p className="text-sm text-green-600">Cambio: {formatMoney(paymentResult.change)}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Efectivo recibido</label>
                            <input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                              placeholder={(split.remaining > 0 ? split.remaining : split.total).toFixed(2)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-lg font-semibold text-gray-900 focus:border-blue-400 focus:outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleSplitPayment('cash')} disabled={loading}
                              className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                              <Banknote size={18} /> Efectivo
                            </button>
                            <button onClick={() => handleSplitPayment('credit_card')} disabled={loading}
                              className="flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: branding.accentColor }}>
                              <CreditCard size={18} /> Tarjeta
                            </button>
                          </div>
                          <button onClick={() => { setPayingSplitId(null); setCashAmount(''); }}
                            className="w-full text-center text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Pay button */}
                  {split.status !== 'paid' && payingSplitId !== split.id && (
                    <button onClick={() => { setPayingSplitId(split.id); setCashAmount(''); setPaymentResult(null); }}
                      className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: branding.accentColor }}>
                      Pagar {formatMoney(split.remaining > 0 ? split.remaining : split.total)}
                    </button>
                  )}
                </div>
              ))}

              {/* Unsplit button */}
              {splits.some(s => s.status !== 'paid') && (
                <button onClick={handleUnsplit} disabled={loading}
                  className="mt-2 w-full rounded-lg border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                  Quitar División
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer action ─── */}
        {(mode === 'equal' || mode === 'by_items' || mode === 'custom') && (
          <div className="border-t bg-gray-50 p-4">
            <button
              onClick={mode === 'equal' ? handleEqualSplit : mode === 'by_items' ? handleItemsSplit : handleCustomSplit}
              disabled={loading || (mode === 'custom' && Math.abs(customTotal - orderTotal) >= 0.02)}
              className="w-full rounded-xl py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: branding.accentColor }}>
              {loading ? 'Procesando...' : `Dividir en ${numGuests} partes`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
