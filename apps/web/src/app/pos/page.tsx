'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';
import { formatMoney } from '@/lib/currency';
import { api } from '@/lib/api';
import { printComanda, printPreBill, getPrintConfig } from '@/lib/print';
import {
  Search, ShoppingCart, Trash2, X, CreditCard,
  Banknote, TrendingUp, DollarSign, Pause, Play,
  Tag, CheckCircle2, ChefHat, Printer, Receipt,
  Mic, MicOff, Users, Scissors, AlertCircle, Percent,
  UserPlus, FileText, Zap,
} from 'lucide-react';

const SplitBillModal = lazy(() => import('@/components/split-bill-modal'));

const METHOD_LABELS: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Efectivo', icon: Banknote },
  credit_card: { label: 'Tarjeta Crédito', icon: CreditCard },
  debit_card: { label: 'Tarjeta Débito', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: TrendingUp },
  wallet: { label: 'Billetera Digital', icon: DollarSign },
};

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
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
  const [showSplit, setShowSplit] = useState(false);
  const [kitchenSent, setKitchenSent] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountTarget, setDiscountTarget] = useState<string | null>(null); // null = order, itemId = item
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [transferRef, setTransferRef] = useState('');
  // Customer
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  // Invoice
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

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

  // ─── Actions ───
  const handleAddItem = async (product: any) => {
    if (!store.currentOrder) await store.createOrder('counter');
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
      const amount = toNum(store.currentOrder.total);
      const received = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) : amount;
      const ref = paymentMethod === 'transfer' && transferRef.trim() ? transferRef.trim() : undefined;
      const result = await store.processPayment(paymentMethod, amount, received, ref);
      setPaymentResult({ ...result, change: paymentMethod === 'cash' ? received - amount : 0, orderId: store.currentOrder?.id || result?.order?.id });
    } catch (e: any) { alert(e.message); }
    setPaymentLoading(false);
  };

  const handleNewOrder = () => {
    setPaymentResult(null);
    setInvoiceResult(null);
    setShowPayment(false);
    setCashReceived('');
    setTransferRef('');
    setPaymentMethod('cash');
    setSelectedCustomer(null);
    store.clearOrder();
  };

  const handleSendToKitchen = async () => {
    if (!store.currentOrder) return;
    try {
      await api.post(`/orders/${store.currentOrder.id}/send-to-kitchen`);
      setKitchenSent(true);
      setTimeout(() => setKitchenSent(false), 2000);
    } catch (e: any) {
      // fallback: try printing comanda locally
      try {
        const cfg = getPrintConfig();
        printComanda(store.currentOrder, cfg);
        setKitchenSent(true);
        setTimeout(() => setKitchenSent(false), 2000);
      } catch { alert('Error al enviar a cocina'); }
    }
  };

  const handlePrintComanda = () => {
    if (!store.currentOrder) return;
    try {
      const cfg = getPrintConfig();
      printComanda(store.currentOrder, cfg);
    } catch { alert('Error al imprimir comanda'); }
  };

  const handlePrintPreBill = () => {
    if (!store.currentOrder) return;
    try {
      const cfg = getPrintConfig();
      printPreBill(store.currentOrder, cfg);
    } catch { alert('Error al imprimir pre-cuenta'); }
  };

  const handleApplyDiscount = async () => {
    if (!store.currentOrder || !discountValue) return;
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return;
    try {
      if (discountTarget) {
        // Item-level discount
        await api.patch(`/orders/${store.currentOrder.id}/items/${discountTarget}/discount`, {
          type: discountType, value: val, reason: discountReason || 'Descuento',
        });
      } else {
        // Order-level discount
        await api.patch(`/orders/${store.currentOrder.id}/discount`, {
          type: discountType, value: val, reason: discountReason || 'Descuento',
        });
      }
      await store.refreshOrder();
      setShowDiscount(false);
      setDiscountValue('');
      setDiscountReason('');
      setDiscountTarget(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleApplyCoupon = async () => {
    if (!store.currentOrder || !couponCode.trim()) return;
    try {
      await api.applyCoupon(store.currentOrder.id, couponCode.trim());
      await store.refreshOrder();
      setPromoMsg('Cupón aplicado');
      setCouponCode('');
      setShowCoupon(false);
      setTimeout(() => setPromoMsg(''), 3000);
    } catch (e: any) { alert(e.message); }
  };

  const handleApplyAutoPromos = async () => {
    if (!store.currentOrder) return;
    try {
      const result = await api.applyPromotions(store.currentOrder.id);
      await store.refreshOrder();
      const count = result?.applied?.length || 0;
      setPromoMsg(count > 0 ? `${count} promo(s) aplicada(s)` : 'Sin promos aplicables');
      setTimeout(() => setPromoMsg(''), 3000);
    } catch (e: any) { alert(e.message); }
  };

  const openItemDiscount = (itemId: string) => {
    setDiscountTarget(itemId);
    setDiscountType('percentage');
    setDiscountValue('');
    setDiscountReason('');
    setShowDiscount(true);
  };

  // ─── Customer ───
  const searchCustomers = async (q: string) => {
    setCustomerQuery(q);
    if (q.length < 2) { setCustomerResults([]); return; }
    setCustomerSearching(true);
    try {
      const results = await api.get<any[]>(`/customers/search?q=${encodeURIComponent(q)}`);
      setCustomerResults(results || []);
    } catch { setCustomerResults([]); }
    setCustomerSearching(false);
  };

  const assignCustomer = async (customer: any) => {
    if (!store.currentOrder) return;
    try {
      await api.patch(`/orders/${store.currentOrder.id}/customer`, { customerId: customer.id });
      setSelectedCustomer(customer);
      setShowCustomerSearch(false);
      setCustomerQuery('');
      setCustomerResults([]);
    } catch (e: any) { alert(e.message); }
  };

  const removeCustomer = async () => {
    if (!store.currentOrder) return;
    try {
      await api.patch(`/orders/${store.currentOrder.id}/customer`, { customerId: null });
      setSelectedCustomer(null);
    } catch {}
  };

  // ─── Invoice ───
  const handleEmitInvoice = async (orderId: string) => {
    setInvoiceLoading(true);
    try {
      const payload: any = { orderId };
      if (selectedCustomer) {
        payload.identificacion = selectedCustomer.taxId || selectedCustomer.tax_id || '9999999999999';
        payload.tipoIdentificacion = selectedCustomer.taxIdType || selectedCustomer.tax_id_type || '07';
        payload.razonSocial = selectedCustomer.name;
        payload.email = selectedCustomer.email || undefined;
        payload.direccion = typeof selectedCustomer.address === 'string' ? selectedCustomer.address : selectedCustomer.address?.street || undefined;
        payload.telefono = selectedCustomer.phone || undefined;
      }
      const result = await api.post('/sri/emitir', payload);
      setInvoiceResult(result);
    } catch (e: any) { alert(e.message); }
    setInvoiceLoading(false);
  };

  // ─── Voice ───
  const toggleVoice = () => {
    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Reconocimiento de voz no soportado'); return; }
    const recog = new SpeechRecognition();
    recog.lang = 'es-EC';
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(transcript);
    };
    recog.onend = () => setVoiceActive(false);
    recog.start();
    recognitionRef.current = recog;
    setVoiceActive(true);
  };

  const order = store.currentOrder;
  const items = order?.items?.filter((i: any) => !i.isVoid) || [];
  const orderTotal = order ? toNum(order.total) : 0;
  const orderSubtotal = order ? toNum(order.subtotal) : 0;
  const orderTax = order ? toNum(order.taxAmount || order.tax_amount) : 0;
  const orderDiscount = order ? toNum(order.discountAmount || order.discount_amount) : 0;
  const orderDiscountReason = order?.discountReason || order?.discount_reason || '';

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
              type="text" value={store.searchQuery} onChange={e => store.setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
          {voiceActive && voiceText && (
            <div className="mt-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 truncate">🎙️ {voiceText}</div>
          )}
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
                  key={p.id} onClick={() => handleAddItem(p)}
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
                  <p className="mt-1 text-sm font-bold text-blue-600">{formatMoney(toNum(p.price))}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Cart ═══ */}
      <div className="hidden md:flex w-80 lg:w-96 flex-col border-l bg-white shrink-0">
        {/* Cart header + toolbar */}
        <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {order ? `#${order.orderNumber || ''}` : 'Nueva Orden'}
              </h2>
              {selectedCustomer && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-green-700 font-medium truncate max-w-[120px]">{selectedCustomer.name}</span>
                  <button onClick={removeCustomer} className="text-gray-400 hover:text-red-500"><X size={10} /></button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Customer */}
            {order && (
              <button onClick={() => setShowCustomerSearch(true)} title={selectedCustomer ? selectedCustomer.name : 'Asignar Cliente'}
                className={`rounded-lg p-1.5 transition ${selectedCustomer ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}>
                <UserPlus size={16} />
              </button>
            )}
            {/* Send to Kitchen */}
            {order && items.length > 0 && (
              <button onClick={handleSendToKitchen} title="Enviar a Cocina"
                className={`rounded-lg p-1.5 transition ${kitchenSent ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-orange-50 hover:text-orange-600'}`}>
                <ChefHat size={16} />
              </button>
            )}
            {/* Print Comanda */}
            {order && items.length > 0 && (
              <button onClick={handlePrintComanda} title="Imprimir Comanda"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                <Printer size={16} />
              </button>
            )}
            {/* Pre-bill */}
            {order && items.length > 0 && (
              <button onClick={handlePrintPreBill} title="Pre-cuenta"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600">
                <Receipt size={16} />
              </button>
            )}
            {/* Split Bill */}
            {order && items.length > 0 && (
              <button onClick={() => setShowSplit(true)} title="Dividir Cuenta"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-teal-50 hover:text-teal-600">
                <Scissors size={16} />
              </button>
            )}
            {/* Discount */}
            {order && items.length > 0 && (
              <button onClick={() => { setDiscountTarget(null); setDiscountType('percentage'); setDiscountValue(''); setDiscountReason(''); setShowDiscount(true); }} title="Descuento"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600">
                <Percent size={16} />
              </button>
            )}
            {/* Coupon / Promos */}
            {order && items.length > 0 && (
              <button onClick={() => setShowCoupon(true)} title="Cupón / Promociones"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-pink-50 hover:text-pink-600">
                <Tag size={16} />
              </button>
            )}
            {/* Voice */}
            <button onClick={toggleVoice} title={voiceActive ? 'Desactivar Voz' : 'Activar Voz'}
              className={`rounded-lg p-1.5 transition ${voiceActive ? 'text-red-600 bg-red-50 animate-pulse' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
              {voiceActive ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            {/* Separator */}
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            {/* Hold */}
            {order && items.length > 0 && (
              <button onClick={() => store.holdCurrentOrder()} title="Pausar orden"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600">
                <Pause size={16} />
              </button>
            )}
            {/* Resume held */}
            {store.heldOrders.length > 0 && (
              <button onClick={() => setShowHeld(!showHeld)} title="Órdenes pausadas"
                className="relative rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                <Play size={16} />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {store.heldOrders.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Held orders dropdown */}
        {showHeld && store.heldOrders.length > 0 && (
          <div className="border-b bg-amber-50 p-2 space-y-1 max-h-32 overflow-y-auto">
            {store.heldOrders.map((ho: any) => (
              <button key={ho.id} onClick={() => { store.resumeOrder(ho); setShowHeld(false); }}
                className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-amber-100 transition">
                <span className="font-medium text-gray-900">{ho.orderNumber}</span>
                <span className="text-xs text-gray-500">{ho.items?.filter((i: any) => !i.isVoid).length || 0} items — {formatMoney(toNum(ho.total))}</span>
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{item.quantity} × {formatMoney(toNum(item.unitPrice || item.unit_price))}</span>
                      {toNum(item.discount_amount || item.discountAmount) > 0 && (
                        <span className="text-xs text-amber-600 font-medium">-{formatMoney(toNum(item.discount_amount || item.discountAmount))}</span>
                      )}
                      {item.notes && <span className="text-xs text-blue-500 truncate">📝 {item.notes}</span>}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">{formatMoney(toNum(item.subtotal))}</p>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => openItemDiscount(item.id)} title="Descuento item"
                      className="rounded p-1 text-gray-300 hover:bg-amber-50 hover:text-amber-500">
                      <Percent size={12} />
                    </button>
                    <button onClick={() => { setShowVoidFor(item.id); setVoidReason(''); }}
                      className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + pay */}
        {order && items.length > 0 && (
          <div className="border-t px-4 py-3 space-y-2 shrink-0">
            {promoMsg && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 text-center">
                {promoMsg}
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatMoney(orderSubtotal)}</span></div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Descuento {orderDiscountReason ? `(${orderDiscountReason})` : ''}</span>
                <span>-{formatMoney(orderDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500"><span>IVA (15%)</span><span>{formatMoney(orderTax)}</span></div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2"><span>Total</span><span>{formatMoney(orderTotal)}</span></div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => store.cancelOrder()}
                className="rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => { setShowPayment(true); setPaymentResult(null); setCashReceived(''); }}
                className="rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 shadow-sm">
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
                <p className="text-sm text-gray-500">Orden completada</p>
                {paymentResult.change > 0.005 && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-sm text-amber-800">Cambio: <strong className="text-lg">{formatMoney(paymentResult.change)}</strong></p>
                  </div>
                )}

                {/* Invoice result */}
                {invoiceResult && (
                  <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-left">
                    <p className="text-sm font-semibold text-blue-800 flex items-center gap-1"><Zap size={14} /> Factura Electrónica</p>
                    <p className="text-xs text-blue-700 mt-1">Secuencial: {invoiceResult.secuencial}</p>
                    <p className="text-xs text-blue-700">Estado: {invoiceResult.estado}</p>
                    {invoiceResult.claveAcceso && <p className="text-[10px] text-blue-500 mt-1 break-all">Clave: {invoiceResult.claveAcceso}</p>}
                  </div>
                )}

                {/* Invoice button */}
                {!invoiceResult && paymentResult.orderId && (
                  <button onClick={() => handleEmitInvoice(paymentResult.orderId)} disabled={invoiceLoading}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-blue-500 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                    <FileText size={16} />
                    {invoiceLoading ? 'Generando...' : 'Generar Factura Electrónica'}
                  </button>
                )}

                <button onClick={handleNewOrder} className="mt-3 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
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
                {paymentMethod === 'transfer' && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nro. Comprobante</label>
                    <input type="text" value={transferRef} onChange={e => setTransferRef(e.target.value)}
                      placeholder="Ej: 12345678"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg font-bold text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
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

      {/* ═══ SPLIT BILL MODAL ═══ */}
      {showSplit && order && (
        <Suspense fallback={null}>
          <SplitBillModal
            order={order}
            branding={{}}
            onClose={() => setShowSplit(false)}
            onOrderCompleted={() => { setShowSplit(false); handleNewOrder(); }}
          />
        </Suspense>
      )}

      {/* ═══ DISCOUNT DIALOG ═══ */}
      {showDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDiscount(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {discountTarget ? 'Descuento en Item' : 'Descuento en Orden'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{discountTarget ? 'Aplicar descuento a este producto' : 'Aplicar descuento al total de la orden'}</p>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setDiscountType('percentage')}
                className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition ${discountType === 'percentage' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}>
                % Porcentaje
              </button>
              <button onClick={() => setDiscountType('fixed')}
                className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition ${discountType === 'fixed' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}>
                $ Fijo
              </button>
            </div>

            <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? 'Ej: 10' : 'Ej: 2.50'} step="0.01" min="0" autoFocus
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg font-bold text-gray-900 mb-3 focus:border-amber-400 focus:outline-none" />

            {discountType === 'percentage' && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[5, 10, 15, 20].map(v => (
                  <button key={v} onClick={() => setDiscountValue(v.toString())}
                    className="rounded-lg border bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300">
                    {v}%
                  </button>
                ))}
              </div>
            )}

            <input type="text" value={discountReason} onChange={e => setDiscountReason(e.target.value)}
              placeholder="Razón (opcional)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 focus:border-amber-400 focus:outline-none" />

            <div className="flex gap-3">
              <button onClick={() => setShowDiscount(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleApplyDiscount} disabled={!discountValue || parseFloat(discountValue) <= 0}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                Aplicar Descuento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ COUPON / PROMOS DIALOG ═══ */}
      {showCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCoupon(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Promociones y Cupones</h3>

            {/* Auto-apply promos */}
            <button onClick={handleApplyAutoPromos}
              className="w-full rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 py-3 text-sm font-medium text-pink-700 hover:bg-pink-100 mb-4">
              🎯 Aplicar Promociones Automáticas
            </button>

            {/* Manual coupon */}
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Código de Cupón</label>
            <div className="flex gap-2">
              <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="DESCUENTO20" autoFocus
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-pink-400 focus:outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }} />
              <button onClick={handleApplyCoupon} disabled={!couponCode.trim()}
                className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50">
                Aplicar
              </button>
            </div>

            <button onClick={() => setShowCoupon(false)} className="w-full mt-4 rounded-xl border py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ═══ CUSTOMER SEARCH MODAL ═══ */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCustomerSearch(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Asignar Cliente</h3>
              <button onClick={() => setShowCustomerSearch(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            {/* Search input */}
            <div className="relative mb-3 shrink-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={customerQuery}
                onChange={e => searchCustomers(e.target.value)}
                placeholder="Buscar por nombre, cédula, RUC..."
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
            </div>

            {/* Consumidor Final shortcut */}
            <button onClick={() => { setSelectedCustomer(null); setShowCustomerSearch(false); }}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 mb-3 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 shrink-0">
              Consumidor Final (sin cliente)
            </button>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {customerSearching && (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              )}
              {!customerSearching && customerResults.length === 0 && customerQuery.length >= 2 && (
                <p className="text-center text-sm text-gray-400 py-6">No se encontraron clientes</p>
              )}
              {customerResults.map((c: any) => (
                <button key={c.id} onClick={() => assignCustomer(c)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50 transition">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {(c.taxId || c.tax_id) && <span>{c.taxId || c.tax_id}</span>}
                      {c.email && <span className="truncate">{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
