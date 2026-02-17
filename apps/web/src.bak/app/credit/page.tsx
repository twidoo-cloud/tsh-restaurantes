'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/currency';
import {
  DollarSign, Users, Search, Plus, X, Check, AlertTriangle,
  CreditCard, TrendingDown, TrendingUp, Clock, FileText,
  ChevronDown, ChevronRight, Banknote, ArrowDownCircle, ArrowUpCircle,
  Wallet, Ban, RefreshCw, Receipt,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const hdrs = () => ({ 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('pos_token') : ''}`, 'Content-Type': 'application/json' });
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(`${API}${p}`, { headers: hdrs() }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Error'); return r.json(); };
const post = async <T,>(p: string, b?: any): Promise<T> => { const r = await fetch(`${API}${p}`, { method: 'POST', headers: hdrs(), body: b ? JSON.stringify(b) : undefined }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Error'); return r.json(); };
const put = async <T,>(p: string, b: any): Promise<T> => { const r = await fetch(`${API}${p}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(b) }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Error'); return r.json(); };

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; sign: string }> = {
  charge:     { label: 'Cargo',    icon: ArrowUpCircle,   color: 'text-red-600',    bg: 'bg-red-50',    sign: '+' },
  payment:    { label: 'Abono',    icon: ArrowDownCircle, color: 'text-green-600',  bg: 'bg-green-50',  sign: '-' },
  adjustment: { label: 'Ajuste',   icon: RefreshCw,       color: 'text-amber-600',  bg: 'bg-amber-50',  sign: '±' },
  writeoff:   { label: 'Castigo',  icon: Ban,             color: 'text-gray-600',   bg: 'bg-gray-100',  sign: '-' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Activa',     color: 'text-green-700', bg: 'bg-green-100' },
  suspended: { label: 'Suspendida', color: 'text-amber-700', bg: 'bg-amber-100' },
  closed:    { label: 'Cerrada',    color: 'text-gray-600',  bg: 'bg-gray-100' },
};

export default function CreditPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountDetail, setAccountDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialog states
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);

  // Form states
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [creditLimit, setCreditLimit] = useState('');
  const [accountNotes, setAccountNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [accs, dash] = await Promise.all([
        get<any[]>(`/credit/accounts?${statusFilter ? `status=${statusFilter}&` : ''}${search ? `search=${search}` : ''}`),
        get<any>('/credit/dashboard'),
      ]);
      setAccounts(accs);
      setDashboard(dash);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  const loadAccountDetail = async (id: string) => {
    try {
      const detail = await get<any>(`/credit/accounts/${id}`);
      setAccountDetail(detail);
    } catch (e: any) { setError(e.message); }
  };

  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    try {
      const results = await get<any[]>(`/customers/search?q=${encodeURIComponent(q)}`);
      setCustomers(results);
    } catch { setCustomers([]); }
  };

  const handleCreateAccount = async () => {
    if (!selectedCustomer || !creditLimit) return;
    try {
      await post('/credit/accounts', { customerId: selectedCustomer.id, creditLimit: parseFloat(creditLimit), notes: accountNotes || undefined });
      setSuccess('Cuenta de crédito creada');
      setShowNewAccount(false);
      setSelectedCustomer(null); setCreditLimit(''); setAccountNotes(''); setCustomerSearch('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const handlePayment = async () => {
    if (!accountDetail || !paymentAmount) return;
    try {
      await post(`/credit/accounts/${accountDetail.id}/payment`, {
        amount: parseFloat(paymentAmount), method: paymentMethod,
        reference: paymentRef || undefined, notes: paymentNotes || undefined,
      });
      setSuccess('Abono registrado');
      setShowPayment(false);
      setPaymentAmount(''); setPaymentRef(''); setPaymentNotes('');
      loadAccountDetail(accountDetail.id);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const handleAdjustment = async () => {
    if (!accountDetail || !adjustAmount || !adjustReason) return;
    try {
      await post(`/credit/accounts/${accountDetail.id}/adjustment`, {
        amount: parseFloat(adjustAmount), reason: adjustReason,
      });
      setSuccess('Ajuste registrado');
      setShowAdjustment(false);
      setAdjustAmount(''); setAdjustReason('');
      loadAccountDetail(accountDetail.id);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await put(`/credit/accounts/${id}`, { status });
      setSuccess(`Cuenta ${status === 'active' ? 'activada' : status === 'suspended' ? 'suspendida' : 'cerrada'}`);
      loadData();
      if (accountDetail?.id === id) loadAccountDetail(id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const s = dashboard?.summary || {};
  const filteredAccounts = accounts;

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Cuentas por Cobrar</h1>
        <button onClick={() => setShowNewAccount(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={16} /> Nueva Cuenta
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
      {success && <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-600"><Check size={16} />{success}</div>}

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* ═══ LEFT: Account list ═══ */}
        <div className="flex flex-col lg:w-[420px] xl:w-[480px] border-r bg-white shrink-0 overflow-hidden">
          {/* KPI Cards */}
          {!loading && dashboard && (
            <div className="grid grid-cols-2 gap-2 p-3 border-b">
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium"><Wallet size={14} /> Total por Cobrar</div>
                <p className="text-lg font-bold text-blue-900 mt-1">{formatMoney(s.total_receivable || 0)}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium"><Users size={14} /> Cuentas Activas</div>
                <p className="text-lg font-bold text-green-900 mt-1">{s.active_accounts || 0}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium"><AlertTriangle size={14} /> Con Saldo</div>
                <p className="text-lg font-bold text-amber-900 mt-1">{s.accounts_with_balance || 0}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium"><TrendingUp size={14} /> Sobre Límite</div>
                <p className="text-lg font-bold text-red-900 mt-1">{s.over_limit_count || 0}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
            <div className="flex gap-1.5">
              {[{ value: '', label: 'Todas' }, { value: 'active', label: 'Activas' }, { value: 'suspended', label: 'Suspendidas' }].map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${statusFilter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Wallet size={40} className="mb-2 opacity-30" />
                <p className="text-sm">No hay cuentas de crédito</p>
                <button onClick={() => setShowNewAccount(true)} className="mt-3 text-sm text-blue-600 hover:underline">Crear primera cuenta →</button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAccounts.map(acc => {
                  const isActive = accountDetail?.id === acc.id;
                  const overLimit = parseFloat(acc.balance) > parseFloat(acc.credit_limit);
                  const balance = parseFloat(acc.balance);
                  const limit = parseFloat(acc.credit_limit);
                  const usage = limit > 0 ? (balance / limit) * 100 : 0;
                  const st = STATUS_CONFIG[acc.status] || STATUS_CONFIG.active;

                  return (
                    <button key={acc.id} onClick={() => { setSelectedAccount(acc); loadAccountDetail(acc.id); }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${isActive ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}>
                      {/* Avatar */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        overLimit ? 'bg-red-100 text-red-700' : balance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {(acc.customer_name || '?')[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{acc.customer_name}</p>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">Límite: {formatMoney(limit)}</span>
                          {/* Usage bar */}
                          <div className="flex-1 h-1.5 rounded-full bg-gray-200 max-w-[80px]">
                            <div className={`h-full rounded-full transition-all ${usage > 90 ? 'bg-red-500' : usage > 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(usage, 100)}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${overLimit ? 'text-red-600' : balance > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                          {formatMoney(balance)}
                        </p>
                        {overLimit && <span className="text-[10px] text-red-500 font-medium">⚠ Sobre límite</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Account detail ═══ */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {accountDetail ? (
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {/* Account header */}
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{accountDetail.customer_name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {accountDetail.customer_phone && <span>📞 {accountDetail.customer_phone}</span>}
                      {accountDetail.customer_email && <span>✉ {accountDetail.customer_email}</span>}
                      {accountDetail.customer_tax_id && <span>🪪 {accountDetail.customer_tax_id}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {accountDetail.status === 'active' && (
                      <button onClick={() => handleStatusChange(accountDetail.id, 'suspended')}
                        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">Suspender</button>
                    )}
                    {accountDetail.status === 'suspended' && (
                      <button onClick={() => handleStatusChange(accountDetail.id, 'active')}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">Reactivar</button>
                    )}
                    <button onClick={() => { setSelectedAccount(null); setAccountDetail(null); }} className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                  </div>
                </div>

                {/* Balance summary */}
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Saldo Pendiente</p>
                    <p className={`text-2xl font-bold ${parseFloat(accountDetail.balance) > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                      {formatMoney(parseFloat(accountDetail.balance))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Límite de Crédito</p>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(parseFloat(accountDetail.credit_limit))}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Disponible</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatMoney(Math.max(0, parseFloat(accountDetail.credit_limit) - parseFloat(accountDetail.balance)))}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setPaymentAmount(''); setShowPayment(true); }}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                    <ArrowDownCircle size={16} /> Registrar Abono
                  </button>
                  <button onClick={() => { setAdjustAmount(''); setAdjustReason(''); setShowAdjustment(true); }}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                    <RefreshCw size={16} /> Ajuste
                  </button>
                </div>
              </div>

              {/* Transaction history */}
              <div className="rounded-xl border bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Receipt size={16} /> Movimientos</h3>
                  <span className="text-xs text-gray-400">{accountDetail.transactions?.length || 0} registros</span>
                </div>
                {accountDetail.transactions?.length > 0 ? (
                  <div className="divide-y">
                    {accountDetail.transactions.map((tx: any) => {
                      const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.charge;
                      const TxIcon = cfg.icon;
                      const amount = Math.abs(parseFloat(tx.amount));

                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                            <TxIcon size={18} className={cfg.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{cfg.label}</span>
                              {tx.order_number && <span className="text-xs text-gray-400">#{tx.order_number}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                {new Date(tx.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {tx.reference && <span className="text-xs text-gray-400">· {tx.reference}</span>}
                              {tx.processed_by_name && <span className="text-xs text-gray-400">· {tx.processed_by_name}</span>}
                            </div>
                            {tx.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{tx.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold ${cfg.color}`}>{cfg.sign}{formatMoney(amount)}</p>
                            <p className="text-[10px] text-gray-400">Saldo: {formatMoney(parseFloat(tx.balance_after))}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-gray-400">Sin movimientos registrados</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona una cuenta para ver sus detalles</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ DIALOG: New Account ═══ */}
      {showNewAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-bold text-gray-900">Nueva Cuenta de Crédito</h3>
              <button onClick={() => setShowNewAccount(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Customer search */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-lg border bg-blue-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                      <p className="text-xs text-gray-500">{selectedCustomer.phone || selectedCustomer.email || ''}</p>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="Buscar por nombre, RUC o teléfono..." value={customerSearch}
                      onChange={e => searchCustomers(e.target.value)}
                      className="w-full rounded-lg border bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
                    {customers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border bg-white shadow-lg z-10 max-h-48 overflow-y-auto">
                        {customers.map((c: any) => (
                          <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomers([]); setCustomerSearch(''); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{c.name[0]}</div>
                            <div><p className="font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-400">{c.phone || c.taxId || ''}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Credit limit */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Límite de Crédito ($)</label>
                <input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="500.00"
                  className="w-full rounded-lg border py-2.5 px-3 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2">
                {[100, 250, 500, 1000].map(amt => (
                  <button key={amt} onClick={() => setCreditLimit(amt.toString())}
                    className="flex-1 rounded-lg border bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300">
                    ${amt}
                  </button>
                ))}
              </div>
              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
                <textarea value={accountNotes} onChange={e => setAccountNotes(e.target.value)} rows={2} placeholder="Notas sobre el crédito..."
                  className="w-full rounded-lg border py-2 px-3 text-sm focus:border-blue-400 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button onClick={() => setShowNewAccount(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={handleCreateAccount} disabled={!selectedCustomer || !creditLimit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DIALOG: Payment ═══ */}
      {showPayment && accountDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Registrar Abono</h3>
                <p className="text-sm text-gray-500">{accountDetail.customer_name} · Saldo: {formatMoney(parseFloat(accountDetail.balance))}</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Monto del Abono ($)</label>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  placeholder={parseFloat(accountDetail.balance).toFixed(2)} max={parseFloat(accountDetail.balance)}
                  className="w-full rounded-lg border py-2.5 px-3 text-lg font-semibold focus:border-green-400 focus:outline-none" />
              </div>
              <div className="flex gap-2">
                {[parseFloat(accountDetail.balance), Math.min(50, parseFloat(accountDetail.balance)), Math.min(100, parseFloat(accountDetail.balance))].filter((v,i,a) => v > 0 && a.indexOf(v) === i).map(amt => (
                  <button key={amt} onClick={() => setPaymentAmount(amt.toFixed(2))}
                    className="flex-1 rounded-lg border bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:border-green-300">
                    {amt === parseFloat(accountDetail.balance) ? 'Total' : `$${amt}`}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: 'cash', l: 'Efectivo', i: Banknote }, { v: 'transfer', l: 'Transfer.', i: TrendingUp }, { v: 'credit_card', l: 'Tarjeta', i: CreditCard }].map(m => (
                    <button key={m.v} onClick={() => setPaymentMethod(m.v)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition ${
                        paymentMethod === m.v ? 'border-green-500 bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <m.i size={16} /> {m.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Referencia (opcional)</label>
                <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Nro. comprobante, recibo, etc."
                  className="w-full rounded-lg border py-2 px-3 text-sm focus:border-green-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
                <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Observaciones..."
                  className="w-full rounded-lg border py-2 px-3 text-sm focus:border-green-400 focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button onClick={() => setShowPayment(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={handlePayment} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40">
                Registrar Abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DIALOG: Adjustment ═══ */}
      {showAdjustment && accountDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ajuste de Saldo</h3>
                <p className="text-sm text-gray-500">{accountDetail.customer_name}</p>
              </div>
              <button onClick={() => setShowAdjustment(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Monto del Ajuste ($)</label>
                <p className="text-xs text-gray-400 mb-2">Positivo = aumentar deuda · Negativo = reducir (castigo)</p>
                <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="0.00"
                  className="w-full rounded-lg border py-2.5 px-3 text-lg font-semibold focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Razón del Ajuste <span className="text-red-500">*</span></label>
                <textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={2} placeholder="Explique el motivo del ajuste..."
                  className="w-full rounded-lg border py-2 px-3 text-sm focus:border-amber-400 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button onClick={() => setShowAdjustment(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={handleAdjustment} disabled={!adjustAmount || !adjustReason || adjustReason.length < 3}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40">
                Aplicar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
