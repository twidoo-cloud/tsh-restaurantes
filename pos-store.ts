import { create } from 'zustand';
import { api } from '@/lib/api';
import {
  loadProductsOfflineAware, loadCategoriesOfflineAware,
  createOrderOfflineAware, addItemOfflineAware,
  voidItemOfflineAware, processPaymentOfflineAware,
  refreshOfflineCache, syncOfflineOrders,
} from '@/lib/offline-sync';

interface PosState {
  user: any | null;
  tenant: any | null;
  isAuthenticated: boolean;
  categories: any[];
  products: any[];
  selectedCategory: string | null;
  searchQuery: string;
  currentOrder: any | null;
  isCreatingOrder: boolean;
  heldOrders: any[];
  loading: boolean;
  error: string | null;
  offlineReady: boolean;

  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  restoreSession: () => void;
  loadCategories: () => Promise<void>;
  loadProducts: (categoryId?: string, search?: string) => Promise<void>;
  setSelectedCategory: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  createOrder: (type?: string, metadata?: any) => Promise<void>;
  addItemToOrder: (productId: string, quantity?: number, notes?: string) => Promise<void>;
  voidItem: (itemId: string, reason: string) => Promise<void>;
  processPayment: (method: string, amount: number, cashReceived?: number, reference?: string) => Promise<any>;
  cancelOrder: () => Promise<void>;
  loadOrder: (id: string) => Promise<void>;
  refreshOrder: () => Promise<void>;
  clearOrder: () => void;
  clearError: () => void;
  holdCurrentOrder: () => void;
  resumeOrder: (order: any) => void;
  loadHeldOrders: () => Promise<void>;
  initOfflineCache: () => Promise<void>;
  syncOffline: () => Promise<void>;
}

export const usePosStore = create<PosState>((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  categories: [],
  products: [],
  selectedCategory: null,
  searchQuery: '',
  currentOrder: null,
  isCreatingOrder: false,
  heldOrders: [],
  loading: false,
  error: null,
  offlineReady: false,

  login: async (email, password) => {
    try {
      const data = await api.login(email, password);
      api.setToken(data.accessToken);
      localStorage.setItem('pos_token', data.accessToken);
      localStorage.setItem('pos_user', JSON.stringify(data.user));
      localStorage.setItem('pos_tenant', JSON.stringify(data.tenant));
      set({ user: data.user, tenant: data.tenant, isAuthenticated: true });

      // Cache products for offline use after login
      refreshOfflineCache().then(() => set({ offlineReady: true })).catch(() => {});

      return data;
    } catch (e: any) { set({ error: e.message }); throw e; }
  },

  logout: () => {
    api.clearToken();
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_tenant');
    set({ user: null, tenant: null, isAuthenticated: false, currentOrder: null, heldOrders: [], categories: [], products: [] });
  },

  restoreSession: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('pos_token');
      const user = localStorage.getItem('pos_user');
      const tenant = localStorage.getItem('pos_tenant');
      if (token && user && tenant) {
        api.setToken(token);
        set({ user: JSON.parse(user), tenant: JSON.parse(tenant), isAuthenticated: true });
      }
    } catch {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      localStorage.removeItem('pos_tenant');
    }
  },

  // ── OFFLINE-AWARE LOADERS ──

  loadCategories: async () => {
    try {
      const categories = await loadCategoriesOfflineAware();
      set({ categories });
    } catch (e: any) { set({ error: e.message }); }
  },

  loadProducts: async (categoryId, search) => {
    set({ loading: true });
    try {
      const products = await loadProductsOfflineAware(categoryId, search);
      set({ products, loading: false });
    } catch (e: any) { set({ loading: false, error: e.message }); }
  },

  setSelectedCategory: (id) => {
    set({ selectedCategory: id });
    get().loadProducts(id || undefined, get().searchQuery || undefined);
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
    get().loadProducts(get().selectedCategory || undefined, q || undefined);
  },

  // ── OFFLINE-AWARE ORDER OPERATIONS ──

  createOrder: async (type = 'dine_in', metadata) => {
    set({ isCreatingOrder: true, error: null });
    try {
      const order = await createOrderOfflineAware(type, metadata);
      set({ currentOrder: order, isCreatingOrder: false });
    } catch (e: any) { set({ isCreatingOrder: false, error: e.message }); }
  },

  addItemToOrder: async (productId, quantity = 1, notes) => {
    const { currentOrder } = get();
    if (!currentOrder) return;
    try {
      const updated = await addItemOfflineAware(currentOrder, productId, quantity, notes);
      set({ currentOrder: updated });
    } catch (e: any) { set({ error: e.message }); }
  },

  voidItem: async (itemId, reason) => {
    const { currentOrder } = get();
    if (!currentOrder) return;
    try {
      const updated = await voidItemOfflineAware(currentOrder, itemId, reason);
      set({ currentOrder: updated });
    } catch (e: any) { set({ error: e.message }); }
  },

  processPayment: async (method, amount, cashReceived, reference) => {
    const { currentOrder } = get();
    if (!currentOrder) return;
    try {
      const result = await processPaymentOfflineAware(currentOrder, method, amount, cashReceived, reference);
      if (result.orderStatus === 'completed') {
        set(s => ({ currentOrder: null, heldOrders: s.heldOrders.filter(o => o.id !== currentOrder.id) }));
      } else {
        set({ currentOrder: result.order || currentOrder });
      }
      return result;
    } catch (e: any) { set({ error: e.message }); }
  },

  cancelOrder: async () => {
    const { currentOrder } = get();
    if (!currentOrder) return;
    try {
      if (currentOrder._offline) {
        // Offline order — just remove from IndexedDB
        const { deleteOfflineOrder } = await import('@/lib/offline-db');
        await deleteOfflineOrder(currentOrder.id);
      } else {
        await api.cancelOrder(currentOrder.id);
      }
      set(s => ({ currentOrder: null, heldOrders: s.heldOrders.filter(o => o.id !== currentOrder.id) }));
    } catch (e: any) { set({ error: e.message }); }
  },

  loadOrder: async (id) => {
    try {
      if (id.startsWith('offline-')) {
        const { getOfflineOrders } = await import('@/lib/offline-db');
        const orders = await getOfflineOrders();
        const order = orders.find(o => o.id === id);
        if (order) set({ currentOrder: order });
      } else {
        const order = await api.getOrder(id);
        set({ currentOrder: order });
      }
    } catch (e: any) { set({ error: e.message }); }
  },

  refreshOrder: async () => {
    const { currentOrder } = get();
    if (!currentOrder) return;
    if (currentOrder._offline) return; // Offline orders don't refresh from server
    try {
      const order = await api.getOrder(currentOrder.id);
      set({ currentOrder: order });
    } catch (e: any) { set({ error: e.message }); }
  },

  // ── Hold / Park ──
  holdCurrentOrder: () => {
    const { currentOrder, heldOrders } = get();
    if (!currentOrder) return;
    const alreadyHeld = heldOrders.some(o => o.id === currentOrder.id);
    set({ heldOrders: alreadyHeld ? heldOrders : [...heldOrders, currentOrder], currentOrder: null });
  },

  resumeOrder: (order) => {
    const { currentOrder, heldOrders } = get();
    let updatedHeld = [...heldOrders];
    if (currentOrder) {
      if (!updatedHeld.some(o => o.id === currentOrder.id)) {
        updatedHeld.push(currentOrder);
      }
    }
    updatedHeld = updatedHeld.filter(o => o.id !== order.id);
    set({ currentOrder: order, heldOrders: updatedHeld });
  },

  loadHeldOrders: async () => {
    try {
      // Load online open orders
      let onlineOrders: any[] = [];
      try {
        const openOrders: any = await api.get('/orders/open');
        onlineOrders = Array.isArray(openOrders)
          ? openOrders.filter((o: any) => {
              const items = Array.isArray(o.items) ? o.items : [];
              return items.filter((i: any) => i.status !== 'voided').length > 0;
            })
          : [];
      } catch {}

      // Also load offline open orders
      let offlineOrders: any[] = [];
      try {
        const { getOfflineOrders } = await import('@/lib/offline-db');
        const all = await getOfflineOrders();
        offlineOrders = all.filter(o => o.status === 'open' && o.items.some(i => i.status === 'active'));
      } catch {}

      const allOrders = [...onlineOrders, ...offlineOrders];
      set(s => ({
        heldOrders: allOrders.filter((o: any) => o.id !== s.currentOrder?.id),
      }));
    } catch {}
  },

  clearOrder: () => set({ currentOrder: null }),
  clearError: () => set({ error: null }),

  // ── OFFLINE MANAGEMENT ──

  initOfflineCache: async () => {
    try {
      const result = await refreshOfflineCache();
      set({ offlineReady: result.products > 0 });
    } catch { set({ offlineReady: false }); }
  },

  syncOffline: async () => {
    try {
      const result = await syncOfflineOrders();
      if (result.synced > 0) {
        console.log(`[POS] Synced ${result.synced} offline orders`);
      }
    } catch (e) { console.warn('[POS] Sync failed:', e); }
  },
}));
