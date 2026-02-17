'use client';

/**
 * ═══════════════════════════════════════════════
 * TSH Restaurantes — Offline Sync Manager
 * ═══════════════════════════════════════════════
 * Bridges the POS store with offline capabilities:
 * - Caches products/categories to IndexedDB when online
 * - Falls back to IndexedDB when offline
 * - Creates offline orders that sync when connection returns
 * - Manages sync queue with retry logic
 */

import { api } from '@/lib/api';
import { useOfflineStore } from '@/lib/use-offline';
import {
  cacheProducts, cacheCategories,
  getCachedProducts, getCachedCategories, searchCachedProducts,
  createOfflineOrder, addOfflineItem, voidOfflineItem,
  completeOfflineOrder, getPendingOfflineOrders,
  updateOfflineOrderSync, deleteOfflineOrder, getCacheAge,
  type OfflineOrder,
} from '@/lib/offline-db';

// ─── CACHE PRODUCTS & CATEGORIES ───

export async function refreshOfflineCache(): Promise<{ products: number; categories: number }> {
  try {
    const [products, categories] = await Promise.all([
      api.get<any>('/products?limit=500'),
      api.getCategories(),
    ]);

    const productList = Array.isArray(products) ? products : (products?.data || []);
    const categoryList = Array.isArray(categories) ? categories : [];

    await cacheProducts(productList);
    await cacheCategories(categoryList);

    console.log(`[Offline] Cached ${productList.length} products, ${categoryList.length} categories`);
    return { products: productList.length, categories: categoryList.length };
  } catch (e) {
    console.warn('[Offline] Failed to refresh cache:', e);
    return { products: 0, categories: 0 };
  }
}

// ─── OFFLINE-AWARE LOADERS ───

export async function loadProductsOfflineAware(categoryId?: string, search?: string): Promise<any[]> {
  const isOnline = useOfflineStore.getState().isOnline;

  if (isOnline) {
    try {
      const params = new URLSearchParams();
      if (categoryId) params.set('categoryId', categoryId);
      if (search) params.set('search', search);
      const result: any = await api.get(`/products${params.toString() ? '?' + params : ''}`);
      const products = Array.isArray(result) ? result : (result?.data || []);
      // Update cache in background
      cacheProducts(products).catch(() => {});
      return products;
    } catch {
      // Network failed, fall through to cache
    }
  }

  // Offline or network failed — use cache
  console.log('[Offline] Loading products from cache');
  if (search) return searchCachedProducts(search);
  return getCachedProducts();
}

export async function loadCategoriesOfflineAware(): Promise<any[]> {
  const isOnline = useOfflineStore.getState().isOnline;

  if (isOnline) {
    try {
      const categories = await api.getCategories();
      const list = Array.isArray(categories) ? categories : [];
      cacheCategories(list).catch(() => {});
      return list;
    } catch {}
  }

  console.log('[Offline] Loading categories from cache');
  return getCachedCategories();
}

// ─── OFFLINE ORDER CREATION ───

export async function createOrderOfflineAware(type: string = 'dine_in', metadata?: any): Promise<any> {
  const isOnline = useOfflineStore.getState().isOnline;

  if (isOnline) {
    try {
      return await api.createOrder({ type, metadata });
    } catch {}
  }

  console.log('[Offline] Creating offline order');
  return createOfflineOrder(type, metadata);
}

export async function addItemOfflineAware(order: any, productId: string, quantity: number = 1, notes?: string): Promise<any> {
  const isOnline = useOfflineStore.getState().isOnline;

  // Online order (has real ID)
  if (isOnline && !order._offline) {
    try {
      await api.addOrderItem(order.id, { productId, quantity, notes });
      return api.getOrder(order.id);
    } catch {}
  }

  // Offline order — need product data to calculate
  let product: any;
  if (isOnline) {
    try {
      product = await api.get(`/products/${productId}`);
    } catch {}
  }
  if (!product) {
    // Find in cache
    const cached = await getCachedProducts();
    product = cached.find(p => p.id === productId);
  }
  if (!product) {
    throw new Error('Producto no disponible offline');
  }

  return addOfflineItem(order.id, product, quantity, notes);
}

export async function voidItemOfflineAware(order: any, itemId: string, reason: string): Promise<any> {
  const isOnline = useOfflineStore.getState().isOnline;

  if (isOnline && !order._offline) {
    try {
      return await api.voidOrderItem(order.id, itemId, reason);
    } catch {}
  }

  return voidOfflineItem(order.id, itemId);
}

export async function processPaymentOfflineAware(order: any, method: string, amount: number, cashReceived?: number, reference?: string): Promise<any> {
  const isOnline = useOfflineStore.getState().isOnline;

  if (isOnline && !order._offline) {
    try {
      return await api.processPayment(order.id, { method, amount, cashReceived, reference });
    } catch {}
  }

  // Complete offline — will sync later
  console.log('[Offline] Completing order offline');
  const completed = await completeOfflineOrder(order.id, { method, amount, cashReceived });

  return {
    orderStatus: 'completed',
    _offline: true,
    change: method === 'cash' && cashReceived ? Math.max(0, (cashReceived || 0) - amount) : 0,
    order: completed,
  };
}

// ─── SYNC OFFLINE ORDERS ───

export async function syncOfflineOrders(): Promise<{ synced: number; failed: number; pending: number }> {
  const pending = await getPendingOfflineOrders();
  if (pending.length === 0) return { synced: 0, failed: 0, pending: 0 };

  console.log(`[Offline] Syncing ${pending.length} offline orders...`);
  let synced = 0;
  let failed = 0;

  for (const offlineOrder of pending) {
    try {
      await updateOfflineOrderSync(offlineOrder.id, 'syncing');

      // 1. Create order on server
      const serverOrder: any = await api.createOrder({
        type: offlineOrder.type,
        metadata: { ...offlineOrder.metadata, _offlineId: offlineOrder.id, _offlineCreatedAt: offlineOrder.createdAt },
      });

      // 2. Add items
      const activeItems = offlineOrder.items.filter(i => i.status === 'active');
      for (const item of activeItems) {
        await api.addOrderItem(serverOrder.id, {
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        });
      }

      // 3. Process payment if completed
      if (offlineOrder.status === 'completed' && offlineOrder.payments.length > 0) {
        const payment = offlineOrder.payments[0];
        await api.processPayment(serverOrder.id, {
          method: payment.method,
          amount: payment.amount,
          cashReceived: payment.cashReceived,
        });
      }

      // 4. Mark as synced and remove
      await updateOfflineOrderSync(offlineOrder.id, 'synced');
      // Keep for 1 hour then clean up
      setTimeout(() => deleteOfflineOrder(offlineOrder.id), 3600000);
      synced++;
    } catch (e: any) {
      console.error(`[Offline] Failed to sync order ${offlineOrder.id}:`, e.message);
      await updateOfflineOrderSync(offlineOrder.id, 'error', e.message);
      failed++;
    }
  }

  console.log(`[Offline] Sync done: ${synced} synced, ${failed} failed`);
  return { synced, failed, pending: pending.length - synced - failed };
}

// ─── CACHE STATUS ───

export async function getOfflineCacheStatus(): Promise<{
  hasProducts: boolean;
  hasCategories: boolean;
  productCount: number;
  categoryCount: number;
  cacheAge: { products: number | null; categories: number | null };
  pendingOrders: number;
}> {
  const products = await getCachedProducts();
  const categories = await getCachedCategories();
  const pending = await getPendingOfflineOrders();
  const cacheAge = await getCacheAge();

  return {
    hasProducts: products.length > 0,
    hasCategories: categories.length > 0,
    productCount: products.length,
    categoryCount: categories.length,
    cacheAge,
    pendingOrders: pending.length,
  };
}
