'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Search, X, MapPin, Wifi, ChevronUp, ShoppingCart, Plus, Minus, Trash2,
  Truck, Store, Phone, Clock, MessageCircle, Send, Check, ChevronDown,
  AlertCircle, ArrowLeft, Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MenuItem {
  id: string; name: string; description: string | null; price: number;
  imageUrl: string | null; tags: string[]; attributes: any;
}
interface MenuCategory {
  id: string; name: string; description: string | null; imageUrl: string | null; products: MenuItem[];
}
interface CartItem {
  product: MenuItem;
  quantity: number;
  notes: string;
}
interface DeliveryZone {
  id: string; name: string; deliveryFee: number; minOrderAmount: number; estimatedMinutes: number;
}
interface OrderConfig {
  restaurantName: string; restaurantPhone: string;
  isEnabled: boolean; acceptsDelivery: boolean; acceptsPickup: boolean;
  defaultDeliveryFee: number; freeDeliveryAbove: number | null;
  minOrderAmount: number; estimatedDeliveryMinutes: number; estimatedPickupMinutes: number;
  deliveryHoursStart: string; deliveryHoursEnd: string;
  whatsappNumber: string | null; zones: DeliveryZone[];
}

export default function PublicMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableNum = searchParams.get('table');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const isManualScroll = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Checkout state
  const [orderConfig, setOrderConfig] = useState<OrderConfig | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressRef, setAddressRef] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  useEffect(() => { loadMenu(); }, [slug]);

  const loadMenu = async () => {
    try {
      const r = await fetch(`${API}/menu/${slug}`);
      if (!r.ok) throw new Error('Restaurante no encontrado');
      const d = await r.json();
      setData(d);
      if (d.menu?.length > 0) setActiveCategory(d.menu[0].id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadOrderConfig = async () => {
    try {
      const r = await fetch(`${API}/menu/${slug}/order-config`);
      if (r.ok) {
        const config = await r.json();
        setOrderConfig(config);
        // Default to pickup if delivery not available
        if (!config.acceptsDelivery && config.acceptsPickup) setOrderType('pickup');
        if (config.acceptsDelivery && !config.acceptsPickup) setOrderType('delivery');
      }
    } catch {}
  };

  // Intersection observer for auto-highlighting category tabs on scroll
  useEffect(() => {
    if (!data?.menu?.length || search) return;
    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      entries => {
        if (isManualScroll.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('cat-', '');
            setActiveCategory(id);
            const tabEl = document.getElementById(`tab-${id}`);
            tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            break;
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    observerRef.current = observer;
    data.menu.forEach((c: MenuCategory) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data, search]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabClick = (catId: string) => {
    isManualScroll.current = true;
    setActiveCategory(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const headerOffset = 140;
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setTimeout(() => { isManualScroll.current = false; }, 800);
  };

  // ─── Cart functions ───
  const addToCart = (product: MenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      return newQty > 0 ? { ...c, quantity: newQty } : c;
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const getCartQty = (productId: string) => cart.find(c => c.product.id === productId)?.quantity || 0;
  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // ─── Delivery fee calculation ───
  const getDeliveryFee = () => {
    if (orderType === 'pickup') return 0;
    if (!orderConfig) return 0;
    if (selectedZone) {
      const zone = orderConfig.zones.find(z => z.id === selectedZone);
      return zone?.deliveryFee || orderConfig.defaultDeliveryFee;
    }
    return orderConfig.defaultDeliveryFee;
  };

  const deliveryFee = getDeliveryFee();
  const freeDeliveryThreshold = orderConfig?.freeDeliveryAbove;
  const isFreeDelivery = freeDeliveryThreshold && cartTotal >= freeDeliveryThreshold;
  const finalDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const orderTotal = cartTotal + finalDeliveryFee;

  // ─── Open checkout ───
  const openCheckout = () => {
    loadOrderConfig();
    setShowCart(false);
    setShowCheckout(true);
    setOrderResult(null);
  };

  // ─── Build WhatsApp message ───
  const buildWhatsAppMessage = () => {
    const lines = [`*Nuevo Pedido Online*`, ``];
    lines.push(`*Tipo:* ${orderType === 'delivery' ? 'Delivery' : 'Pickup (retiro en local)'}`);
    lines.push(`*Cliente:* ${customerName}`);
    lines.push(`*Teléfono:* ${customerPhone}`);
    if (orderType === 'delivery' && address) {
      lines.push(`*Dirección:* ${address}`);
      if (addressRef) lines.push(`*Referencia:* ${addressRef}`);
    }
    lines.push(``);
    lines.push(`*--- Detalle del Pedido ---*`);
    cart.forEach(c => {
      lines.push(`${c.quantity}x ${c.product.name} — $${(c.product.price * c.quantity).toFixed(2)}`);
      if (c.notes) lines.push(`   _${c.notes}_`);
    });
    lines.push(``);
    lines.push(`*Subtotal:* $${cartTotal.toFixed(2)}`);
    if (orderType === 'delivery') {
      lines.push(`*Envío:* ${isFreeDelivery ? 'GRATIS' : `$${finalDeliveryFee.toFixed(2)}`}`);
    }
    lines.push(`*TOTAL: $${orderTotal.toFixed(2)}*`);
    lines.push(``);
    lines.push(`*Pago:* ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'transfer' ? 'Transferencia' : 'Tarjeta'}`);
    if (orderNotes) lines.push(`*Notas:* ${orderNotes}`);
    return lines.join('\n');
  };

  const sendWhatsApp = () => {
    if (!orderConfig?.whatsappNumber) return;
    const msg = buildWhatsAppMessage();
    const phone = orderConfig.whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ─── Submit order to API ───
  const submitOrder = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body = {
        customerName,
        customerPhone,
        deliveryType: orderType,
        addressLine1: orderType === 'delivery' ? address : undefined,
        addressReference: orderType === 'delivery' ? addressRef : undefined,
        zoneId: orderType === 'delivery' && selectedZone ? selectedZone : undefined,
        paymentMethod,
        notes: orderNotes || undefined,
        items: cart.map(c => ({
          productId: c.product.id,
          quantity: c.quantity,
          notes: c.notes || undefined,
        })),
      };
      const r = await fetch(`${API}/menu/${slug}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.message || 'Error al enviar pedido');
      setOrderResult(result);
      setCart([]);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const canCheckout = customerName.trim() && customerPhone.trim() &&
    (orderType === 'pickup' || address.trim()) && cart.length > 0;

  // ─── Render ───
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        <p className="mt-3 text-sm text-gray-400">Cargando menú...</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8 text-center">
      <div>
        <p className="text-5xl mb-4">🍽️</p>
        <p className="text-xl font-bold text-gray-900">Restaurante no encontrado</p>
        <p className="text-sm text-gray-500 mt-2">Verifica el enlace e intenta de nuevo</p>
      </div>
    </div>
  );

  const { restaurant, branding, menu, settings, onlineOrdering } = data;
  const accent = branding?.accentColor || branding?.accent_color || '#2563EB';
  const logoUrl = branding?.logoUrl || branding?.logo_url;
  const currencySymbol = settings?.currency?.symbol || '$';
  const formatPrice = (price: number) => `${currencySymbol}${price.toFixed(2)}`;
  const orderingEnabled = onlineOrdering?.enabled !== false;

  const filtered: MenuCategory[] = search
    ? menu.map((c: MenuCategory) => ({
        ...c,
        products: c.products.filter(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase()) ||
          p.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
        ),
      })).filter((c: MenuCategory) => c.products.length > 0)
    : menu;

  const totalItems = filtered.reduce((sum: number, c: MenuCategory) => sum + c.products.length, 0);

  // ═══════════════════════════════════════
  // ORDER SUCCESS SCREEN
  // ═══════════════════════════════════════
  if (orderResult) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
      <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <Check size={40} className="text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido Recibido!</h1>
      <p className="text-lg font-semibold mb-1" style={{ color: accent }}>{orderResult.orderNumber}</p>
      <p className="text-sm text-gray-600 mb-6 max-w-xs">{orderResult.message}</p>
      <div className="space-y-3 w-full max-w-xs">
        {orderConfig?.whatsappNumber && (
          <button onClick={sendWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}>
            <MessageCircle size={20} /> Confirmar por WhatsApp
          </button>
        )}
        <button onClick={() => { setOrderResult(null); setShowCheckout(false); }}
          className="w-full rounded-xl border-2 py-3 font-semibold text-gray-700 hover:bg-gray-50">
          Volver al Menú
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  // CHECKOUT SCREEN
  // ═══════════════════════════════════════
  if (showCheckout) return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowCheckout(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Completar Pedido</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-32 pt-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Order Type */}
        {orderConfig && (orderConfig.acceptsDelivery && orderConfig.acceptsPickup) && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Tipo de Pedido</p>
            <div className="grid grid-cols-2 gap-2">
              {orderConfig.acceptsDelivery && (
                <button onClick={() => setOrderType('delivery')}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 transition ${
                    orderType === 'delivery' ? 'border-current shadow-sm' : 'border-gray-200'
                  }`}
                  style={orderType === 'delivery' ? { borderColor: accent, color: accent } : {}}>
                  <Truck size={24} />
                  <span className="text-sm font-semibold">Delivery</span>
                  <span className="text-[10px] text-gray-400">~{orderConfig.estimatedDeliveryMinutes} min</span>
                </button>
              )}
              {orderConfig.acceptsPickup && (
                <button onClick={() => setOrderType('pickup')}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 transition ${
                    orderType === 'pickup' ? 'border-current shadow-sm' : 'border-gray-200'
                  }`}
                  style={orderType === 'pickup' ? { borderColor: accent, color: accent } : {}}>
                  <Store size={24} />
                  <span className="text-sm font-semibold">Retiro</span>
                  <span className="text-[10px] text-gray-400">~{orderConfig.estimatedPickupMinutes} min</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Tus datos</p>
          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Tu nombre *" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
          <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
            placeholder="Tu teléfono (ej: 0991234567) *" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
        </div>

        {/* Address (delivery only) */}
        {orderType === 'delivery' && (
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Dirección de entrega</p>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Calle principal y número *" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="text" value={addressRef} onChange={e => setAddressRef(e.target.value)}
              placeholder="Referencia (ej: frente al parque central)" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            {orderConfig && orderConfig.zones.length > 0 && (
              <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
                <option value="">Selecciona tu zona</option>
                {orderConfig.zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} — {formatPrice(z.deliveryFee)} envío</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Payment Method */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Método de pago</p>
          <div className="flex gap-2">
            {[{ k: 'cash', l: 'Efectivo', e: '💵' }, { k: 'transfer', l: 'Transferencia', e: '🏦' }, { k: 'card', l: 'Tarjeta', e: '💳' }].map(m => (
              <button key={m.k} onClick={() => setPaymentMethod(m.k)}
                className={`flex-1 rounded-lg border-2 py-2.5 text-xs font-semibold transition ${
                  paymentMethod === m.k ? '' : 'border-gray-200 text-gray-600'
                }`}
                style={paymentMethod === m.k ? { borderColor: accent, color: accent } : {}}>
                <span className="block text-base mb-0.5">{m.e}</span>{m.l}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <input type="text" value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
            placeholder="Notas especiales (opcional)" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
        </div>

        {/* Order Summary */}
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Resumen</p>
          {cart.map(c => (
            <div key={c.product.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{c.quantity}x {c.product.name}</span>
              <span className="font-medium">{formatPrice(c.product.price * c.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatPrice(cartTotal)}</span></div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Envío</span>
                <span className={isFreeDelivery ? 'line-through text-gray-400' : ''}>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            {isFreeDelivery && orderType === 'delivery' && (
              <div className="flex justify-between text-xs text-green-600 font-medium"><span>Envío gratis aplicado</span><span>-{formatPrice(deliveryFee)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1"><span>Total</span><span>{formatPrice(orderTotal)}</span></div>
          </div>
        </div>
      </main>

      {/* Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="mx-auto max-w-lg px-4 py-3 space-y-2">
          {orderConfig?.minOrderAmount > 0 && cartTotal < orderConfig.minOrderAmount && (
            <p className="text-xs text-red-500 text-center">Pedido mínimo: {formatPrice(orderConfig.minOrderAmount)}</p>
          )}
          {/* Button: Submit order to system */}
          <button onClick={submitOrder} disabled={!canCheckout || submitting || (orderConfig?.minOrderAmount > 0 && cartTotal < orderConfig.minOrderAmount)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: accent }}>
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Enviar Pedido — {formatPrice(orderTotal)}
          </button>
          {/* Button: Send via WhatsApp */}
          {orderConfig?.whatsappNumber && (
            <button onClick={sendWhatsApp} disabled={!canCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#25D366' }}>
              <MessageCircle size={20} /> Pedir por WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  // MAIN MENU VIEW
  // ═══════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={restaurant.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: accent }}>
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{restaurant.name}</h1>
                {tableNum && (
                  <p className="text-xs font-medium flex items-center gap-1" style={{ color: accent }}>
                    <MapPin size={10} /> Mesa {tableNum}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Wifi size={11} /> Digital
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar platos, ingredientes..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-8 text-sm text-gray-900 focus:border-gray-400 focus:outline-none transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-gray-300 p-0.5 text-white">
                <X size={12} />
              </button>
            )}
          </div>
          {search && <p className="mt-1.5 text-[10px] text-gray-400 text-center">{totalItems} resultado{totalItems !== 1 ? 's' : ''}</p>}
        </div>

        {/* Category tabs */}
        {!search && menu.length > 1 && (
          <div className="border-t overflow-x-auto scrollbar-hide">
            <div className="mx-auto flex max-w-lg px-4">
              {menu.map((c: MenuCategory) => (
                <button key={c.id} id={`tab-${c.id}`}
                  onClick={() => handleTabClick(c.id)}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeCategory === c.id ? '' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  style={activeCategory === c.id ? { color: accent, borderColor: accent } : {}}>
                  {c.name}
                  <span className="ml-1 text-[9px] opacity-50">({c.products.length})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Menu content */}
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm font-medium text-gray-500">No se encontraron platos</p>
            <button onClick={() => setSearch('')} className="mt-2 text-xs font-medium" style={{ color: accent }}>Limpiar búsqueda</button>
          </div>
        ) : (
          filtered.map((cat: MenuCategory) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-6">
              <div className="sticky top-[130px] z-10 bg-gray-50 py-2">
                <h2 className="text-base font-bold text-gray-900">{cat.name}</h2>
                {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
              </div>
              <div className="space-y-2">
                {cat.products.map(item => {
                  const qty = getCartQty(item.id);
                  return (
                    <div key={item.id}
                      className="flex w-full items-start gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex-1 min-w-0" onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</h3>
                        {item.description && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold" style={{ color: accent }}>{formatPrice(item.price)}</span>
                          {item.tags?.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-500">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name} loading="lazy"
                            className="h-16 w-16 rounded-lg object-cover" onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }} />
                        )}
                        {orderingEnabled && (
                          qty > 0 ? (
                            <div className="flex items-center gap-1 rounded-full px-1 py-0.5" style={{ backgroundColor: `${accent}15` }}>
                              <button onClick={() => updateCartQty(item.id, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:opacity-80" style={{ backgroundColor: accent }}>
                                <Minus size={12} />
                              </button>
                              <span className="w-5 text-center text-xs font-bold" style={{ color: accent }}>{qty}</span>
                              <button onClick={() => updateCartQty(item.id, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:opacity-80" style={{ backgroundColor: accent }}>
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition hover:text-white hover:border-transparent"
                              style={{ borderColor: accent, color: accent }}
                              onMouseEnter={e => { (e.target as any).style.backgroundColor = accent; (e.target as any).style.color = '#fff'; }}
                              onMouseLeave={e => { (e.target as any).style.backgroundColor = 'transparent'; (e.target as any).style.color = accent; }}>
                              <Plus size={16} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Cart Footer Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-3">
          <div className="mx-auto max-w-lg">
            <button onClick={() => setShowCart(true)}
              className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-xl transition hover:opacity-90"
              style={{ backgroundColor: accent }}>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{cartCount}</div>
                <span className="font-semibold text-sm">Ver carrito</span>
              </div>
              <span className="font-bold">{formatPrice(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Scroll to top */}
      {showScrollTop && !showCart && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border transition hover:shadow-xl active:scale-95"
          style={{ color: accent }}>
          <ChevronUp size={20} />
        </button>
      )}

      {/* Item detail bottom sheet */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setSelectedItem(null)}>
          <div className="absolute inset-0 bg-black/50 transition-opacity" />
          <div className="relative mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl sm:mx-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {selectedItem.imageUrl && (
              <div className="relative">
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="h-52 w-full rounded-t-2xl object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-t-2xl" />
              </div>
            )}
            <button onClick={() => setSelectedItem(null)}
              className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition">
              <X size={16} />
            </button>
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
              {selectedItem.description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{selectedItem.description}</p>}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold" style={{ color: accent }}>{formatPrice(selectedItem.price)}</span>
                {selectedItem.tags?.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{tag}</span>
                ))}
              </div>
              {selectedItem.attributes && typeof selectedItem.attributes === 'object' && Object.keys(selectedItem.attributes).length > 0 && (
                <div className="mt-4 rounded-xl bg-gray-50 p-3 space-y-1.5">
                  {Object.entries(selectedItem.attributes).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-gray-900 font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {orderingEnabled && (
                <button onClick={() => { addToCart(selectedItem); setSelectedItem(null); }}
                  className="mt-4 w-full rounded-xl py-3 font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: accent }}>
                  <Plus size={16} className="inline mr-1" /> Agregar al carrito — {formatPrice(selectedItem.price)}
                </button>
              )}
            </div>
            <div className="sm:hidden h-1 w-10 rounded-full bg-gray-300 mx-auto mb-2" />
          </div>
        </div>
      )}

      {/* Cart bottom sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={20} style={{ color: accent }} /> Tu pedido
              </h2>
              <button onClick={() => setShowCart(false)} className="rounded-lg p-1 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {cart.map(c => (
                <div key={c.product.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.product.name}</p>
                    <p className="text-xs text-gray-500">{formatPrice(c.product.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateCartQty(c.product.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100">
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{c.quantity}</span>
                    <button onClick={() => updateCartQty(c.product.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">{formatPrice(c.product.price * c.quantity)}</span>
                  <button onClick={() => removeFromCart(c.product.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-5 py-4 space-y-2 z-10">
              <button onClick={openCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: accent }}>
                Continuar — {formatPrice(cartTotal)}
              </button>
              <button onClick={() => { setCart([]); setShowCart(false); }}
                className="w-full text-center text-xs text-gray-400 py-1 hover:text-red-500 transition">
                Vaciar carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {cartCount === 0 && (
        <footer className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur-sm py-2 text-center text-[10px] text-gray-400 z-20">
          {restaurant.name} · Menú Digital
        </footer>
      )}
    </div>
  );
}
