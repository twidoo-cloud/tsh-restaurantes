'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';
import { formatMoney } from '@/lib/currency';
import {
  Search, ShoppingCart, Trash2, X, CreditCard,
  Banknote, TrendingUp, DollarSign, Pause, Play,
  Tag, CheckCircle2,
} from 'lucide-react';

const METHOD_LABELS: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Efectivo', icon: Banknote },
  credit_card: { label: 'Tarjeta Crédito', icon: CreditCard },
  debit_card: { label: 'Tarjeta Débito', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: TrendingUp },
  wallet: { label: 'Billetera Digital', icon: DollarSign },
};

export default function PosPage() {
  const router = useRouter();
  const store = usePosStore();
  const { on: wsOn } = useSocket();

  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showHeld, setShowHeld] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidFor, setShowVoidFor] = useState<string | null>(null);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    store.loadCategories();
    store.loadProducts();
    store.loadHeldOrders();
  }, []);

  useEffect(() => {
    const unsubs = [
      wsOn(WS_EVENTS.ORDER_PAID, () => { if (store.currentOrder) store.refreshOrder(); }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [wsOn, store.currentOrder]);

  const handleAddItem = async (product: any) => {
    if (!store.currentOrder) {
      await store.createOrder('counter');
    }
    await store.addItemToOrder(product.id, 1);
  };

  const handleVoidItem = async (itemId: string) => {
    if (!voidReason.trim()) return;
    await store.voidItem(itemId, voidReason);
    setShowVoidFor(null);
    setVoidReason('');
  };

  const handlePayment = async () => {
    if (!store.currentOrder) return;
    setPaymentLoading(true);
    try {
      const amount = parseFloat(store.currentOrder.total || '0');
      const received = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) : amount;
      const result = await store.processPayment(paymentMethod, amount, received);
      setPaymentResult({ ...result, change: paymentMethod === 'cash' ? received - amount : 0 });
    } catch (e: any) { alert(e.message); }
    setPaymentLoading(false);
  };

  const handleNewOrder = () => {
    setPaymentResult(null);
    setShowPayment(false);
    setCashReceived('');
    setPaymentMethod('cash');
    store.clearOrder();
  };

  const order = store.currentOrder;
  const items = order?.items?.filter((i: any) => !i.isVoid) || [];
  const orderTotal = order ? parseFloat(order.total || '0') : 0;
  const orderSubtotal = order ? parseFloat(order.subtotal || '0') : 0;
  const orderTax = order ? parseFloat(order.taxAmount || order.tax_amount || '0') : 0;

  return (
    <AppShell>
    <div className="flex h-full bg-gray-100">
      {/* ═══ LEFT: Categories + Products ═══ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Category bar */}
        <div className="flex items-center gap-2 bg-white border-b px-3 py-2 shrink-0 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => store.setSelectedCategory(null)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              !store.selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {store.categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => store.setSelectedCategory(cat.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                store.selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white border-b shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={store.searchQuery}
              onChange={e => store.setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {store.loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : store.products.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <Tag size={40} className="mb-2" />
              <p className="text-sm">No hay productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {store.products.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => handleAddItem(p)}
                  className="flex flex-col items-center rounded-xl border bg-white p-3 text-center shadow-sm transition hover:shadow-md hover:border-blue-300 active:scale-95"
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-16 w-16 rounded-lg object-cover mb-2" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 mb-2">
                      <span className="text-2xl">{p.emoji || '🍽️'}</span>
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-blue-600">{formatMoney(p.price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Cart ═══ */}
      <div className="hidden md:flex w-80 lg:w-96 flex-col border-l bg-white shrink-0">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">
              {order ? `#${order.orderNumber || ''}` : 'Nueva Orden'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {order && items.length > 0 && (
              <button onClick={() => store.holdCurrentOrder()}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600" title="Pausar">
                <Pause size={16} />
              </button>
            )}
            {store.heldOrders.length > 0 && (
              <button onClick={() => setShowHeld(!showHeld)}
                className="relative rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Pausadas">
                <Play size={16} />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {store.heldOrders.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Held orders */}
        {showHeld && store.heldOrders.length > 0 && (
          <div className="border-b bg-amber-50 p-2 space-y-1 max-h-32 overflow-y-auto">
            {store.heldOrders.map((ho: any) => (
              <button key={ho.id} onClick={() => { store.resumeOrder(ho); setShowHeld(false); }}
                className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-amber-100 transition">
                <span className="font-medium text-gray-900">{ho.orderNumber}</span>
                <span className="text-xs text-gray-500">{ho.items?.filter((i: any) => !i.isVoid).length || 0} items — {formatMoney(ho.total)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-300">
              <ShoppingCart size={48} className="mb-3" />
              <p className="text-sm">Selecciona productos</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item: any, idx: number) => (
                <div key={item.id || idx} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product?.name || item.productName || 'Producto'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{item.quantity} × {formatMoney(item.unitPrice || item.unit_price)}</span>
                      {item.notes && <span className="text-xs text-blue-500 truncate">📝 {item.notes}</span>}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">{formatMoney(item.subtotal)}</p>
                  <button onClick={() => { setShowVoidFor(item.id); setVoidReason(''); }}
                    className="shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + pay */}
        {order && items.length > 0 && (
          <div className="border-t px-4 py-3 space-y-2 shrink-0">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatMoney(orderSubtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>IVA (15%)</span><span>{formatMoney(orderTax)}</span></div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2"><span>Total</span><span>{formatMoney(orderTotal)}</span></div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => store.cancelOrder()}
                className="rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => { setShowPayment(true); setPaymentResult(null); setCashReceived(''); }}
                className="rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700">
                Cobrar {formatMoney(orderTotal)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ PAYMENT DIALOG ═══ */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!paymentResult) setShowPayment(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {paymentResult ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-gray-900">Pago Exitoso</h3>
                {paymentResult.change > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-sm text-amber-800">Cambio: <strong className="text-lg">{formatMoney(paymentResult.change)}</strong></p>
                  </div>
                )}
                <button onClick={handleNewOrder} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
                  Nueva Orden
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Cobrar {formatMoney(orderTotal)}</h3>
                  <button onClick={() => setShowPayment(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(METHOD_LABELS).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button key={key} onClick={() => setPaymentMethod(key)}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition ${
                          paymentMethod === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}>
                        <Icon size={18} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === 'cash' && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Recibido ($)</label>
                    <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                      placeholder={orderTotal.toFixed(2)} step="0.01" min="0"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-xl font-bold text-gray-900 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20" />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[Math.ceil(orderTotal), 5, 10, 20].map((amt, i) => (
                        <button key={i} onClick={() => setCashReceived(amt.toString())}
                          className="rounded-lg border bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:border-green-300">
                          ${amt}
                        </button>
                      ))}
                    </div>
                    {cashReceived && parseFloat(cashReceived) >= orderTotal && (
                      <div className="mt-2 rounded-lg bg-green-50 p-2 text-center text-sm font-semibold text-green-700">
                        Cambio: {formatMoney(parseFloat(cashReceived) - orderTotal)}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handlePayment}
                  disabled={paymentLoading || (paymentMethod === 'cash' && cashReceived !== '' && parseFloat(cashReceived) < orderTotal)}
                  className="w-full rounded-xl bg-green-600 py-3.5 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50">
                  {paymentLoading ? 'Procesando...' : `Cobrar ${formatMoney(orderTotal)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ VOID ITEM DIALOG ═══ */}
      {showVoidFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVoidFor(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Anular Item</h3>
            <input type="text" value={voidReason} onChange={e => setVoidReason(e.target.value)}
              placeholder="Razón de anulación..." autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter' && showVoidFor) handleVoidItem(showVoidFor); }} />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowVoidFor(null)} className="flex-1 rounded-xl border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => showVoidFor && handleVoidItem(showVoidFor)} disabled={!voidReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Anular</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}