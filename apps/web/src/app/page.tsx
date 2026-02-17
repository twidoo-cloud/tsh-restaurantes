'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney, getTaxName, getTaxRate } from '@/lib/currency';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';
import {
  Search, Trash2, CreditCard, Banknote, X, ShoppingCart, ChefHat, Utensils,
} from 'lucide-react';
import { usePermissions } from '@/lib/use-permissions';

function PosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = usePosStore();
  const { hasAccess } = usePermissions();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [showPayment, setShowPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);

  const tableId = searchParams.get('tableId');
  const tableNumber = searchParams.get('tableNumber');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    store.loadCategories(); store.loadProducts();
    if (orderId) store.loadOrder(orderId);
    refreshBranding();
  }, []);

  const handleAddItem = async (product: any) => {
    if (!store.currentOrder) {
      const metadata = tableId ? { table_id: tableId, guest_count: 2 } : {};
      await store.createOrder(tableId ? 'dine_in' : 'sale', metadata);
      await new Promise(r => setTimeout(r, 200));
    }
    const order = usePosStore.getState().currentOrder;
    if (order) await store.addItemToOrder(product.id);
  };

  const handlePayment = async (method: string) => {
    if (!store.currentOrder) return;
    const total = parseFloat(store.currentOrder.total);
    const cash = method === 'cash' ? parseFloat(cashAmount) || total : undefined;
    const result = await store.processPayment(method, total, cash);
    if (result) {
      setPaymentResult(result);
      if (result.orderStatus === 'completed') {
        setTimeout(() => { setShowPayment(false); setPaymentResult(null); setCashAmount(''); setShowCart(false); if (tableId) router.push('/tables'); }, 2500);
      }
    }
  };

  const orderItems = store.currentOrder?.items?.filter((i: any) => !i.isVoid) || [];
  const orderTotal = store.currentOrder ? parseFloat(store.currentOrder.total) : 0;
  const taxName = getTaxName(); const taxPercent = Math.round(getTaxRate() * 100);
  const itemCount = orderItems.reduce((s: number, i: any) => s + parseFloat(i.quantity), 0);

  // ── OrderPanel ──
  const OrderPanel = () => (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">{store.currentOrder ? store.currentOrder.orderNumber : 'Nueva Orden'}</h2>
          {tableNumber && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Mesa {tableNumber}</span>}
        </div>
        <div className="flex items-center gap-1">
          {store.currentOrder && hasAccess('orders.cancel') && (
            <button onClick={() => store.cancelOrder()} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
          )}
          <button onClick={() => setShowCart(false)} className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
            <ShoppingCart size={40} className="mb-2 opacity-30" /><p className="text-sm">Selecciona productos para comenzar</p>
          </div>
        ) : (
          <div className="divide-y">
            {orderItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name || item.productName}</p>
                  <p className="text-xs text-gray-500">{formatMoney(parseFloat(item.unitPrice))} × {parseFloat(item.quantity)}</p>
                  {item.notes && <p className="text-xs text-amber-600 italic">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatMoney(parseFloat(item.subtotal))}</span>
                  {hasAccess('orders.void') && (
                    <button onClick={() => store.voidItem(item.id, 'Eliminado')} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><X size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {store.currentOrder && (
        <div className="border-t bg-gray-50 p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatMoney(parseFloat(store.currentOrder.subtotal))}</span></div>
          {parseFloat(store.currentOrder.taxAmount) > 0 && (
            <div className="flex justify-between text-sm text-gray-600"><span>{taxName} ({taxPercent}%)</span><span>{formatMoney(parseFloat(store.currentOrder.taxAmount))}</span></div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-1 border-t"><span>Total</span><span>{formatMoney(orderTotal)}</span></div>
          {showPayment ? (
            <div className="space-y-3 pt-2">
              {paymentResult?.orderStatus === 'completed' ? (
                <div className="rounded-xl bg-green-50 p-4 text-center">
                  <p className="text-lg font-bold text-green-700">¡Pago completado!</p>
                  {paymentResult?.change > 0 && <p className="text-sm text-green-600 mt-1">Cambio: {formatMoney(paymentResult.change)}</p>}
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Efectivo recibido</label>
                    <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder={orderTotal.toFixed(2)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-lg font-semibold text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[orderTotal, Math.ceil(orderTotal), Math.ceil(orderTotal/5)*5, Math.ceil(orderTotal/10)*10]
                      .filter((v,i,a) => a.indexOf(v)===i).slice(0,4).map(amount => (
                        <button key={amount} onClick={() => setCashAmount(amount.toString())}
                          className="rounded-lg border bg-white py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300">${amount}</button>
                      ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handlePayment('cash')} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"><Banknote size={20} /> Efectivo</button>
                    <button onClick={() => handlePayment('credit_card')} className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}><CreditCard size={20} /> Tarjeta</button>
                  </div>
                  <button onClick={() => { setShowPayment(false); setCashAmount(''); }} className="w-full rounded-lg py-2 text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setShowPayment(true)} disabled={orderItems.length===0}
              className="w-full rounded-xl py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: branding.accentColor }}>
              Cobrar {formatMoney(orderTotal)}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <AppShell
      headerRight={
        tableNumber ? (
          <span className="flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            <Utensils size={12} /> Mesa {tableNumber}
          </span>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col bg-gray-100">
        {/* ═══ MAIN ═══ */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col min-w-0">
            {/* Search */}
            <div className="border-b bg-white p-2 md:p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Buscar producto..." value={store.searchQuery} onChange={e => store.setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 md:py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
              </div>
            </div>
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto border-b bg-white p-2 md:p-3 scrollbar-hide">
              <button onClick={() => store.setSelectedCategory(null)}
                className={`shrink-0 rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition ${!store.selectedCategory ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={!store.selectedCategory ? { backgroundColor: branding.accentColor } : {}}>Todos</button>
              {store.categories.map((cat: any) => (
                <button key={cat.id} onClick={() => store.setSelectedCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition ${store.selectedCategory===cat.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={store.selectedCategory===cat.id ? { backgroundColor: branding.accentColor } : {}}>{cat.name}</button>
              ))}
            </div>
            {/* Products grid */}
            <div className="flex-1 overflow-y-auto p-2 md:p-3">
              {store.loading ? (
                <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderRightColor: branding.accentColor, borderBottomColor: branding.accentColor, borderLeftColor: branding.accentColor, borderTopColor: 'transparent' }} /></div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-3">
                  {store.products.map((product: any) => (
                    <button key={product.id} onClick={() => handleAddItem(product)} disabled={!product.isAvailable}
                      className={`group flex flex-col rounded-xl border bg-white p-2 sm:p-3 text-left transition hover:shadow-md ${!product.isAvailable ? 'opacity-40' : 'hover:border-blue-300'}`}>
                      {product.attributes?.kitchen_station && (
                        <span className={`mb-1 sm:mb-2 inline-flex w-fit items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium uppercase ${
                          product.attributes.kitchen_station==='grill' ? 'bg-orange-100 text-orange-700' : product.attributes.kitchen_station==='cold' ? 'bg-cyan-100 text-cyan-700' : product.attributes.kitchen_station==='bar' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}><ChefHat size={10} />{product.attributes.kitchen_station}</span>
                      )}
                      <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                      <div className="mt-auto pt-1 sm:pt-2"><span className="text-sm sm:text-lg font-bold" style={{ color: branding.accentColor }}>{formatMoney(parseFloat(product.price))}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Mobile order summary bar */}
            {store.currentOrder && (
              <div className="lg:hidden border-t bg-white px-3 py-2 flex items-center justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                <div><p className="text-xs text-gray-500">{itemCount} items</p><p className="text-lg font-bold text-gray-900">{formatMoney(orderTotal)}</p></div>
                <button onClick={() => setShowCart(true)} className="rounded-xl px-6 py-2.5 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>Ver Orden →</button>
              </div>
            )}
          </div>
          {/* Desktop order panel */}
          <div className="hidden lg:flex w-80 xl:w-96 flex-col border-l bg-white shrink-0"><OrderPanel /></div>
          {/* Mobile order panel overlay */}
          {showCart && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
              <div className="relative ml-auto flex w-full max-w-md flex-col bg-white shadow-2xl"><OrderPanel /></div>
            </div>
          )}
        </div>

        {/* Error toast */}
        {store.error && (
          <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg z-50">
            <span>{store.error}</span>
            <button onClick={() => store.clearError()} className="ml-2 rounded p-1 hover:bg-red-700"><X size={14} /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function PosPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <PosContent />
    </Suspense>
  );
}
