'use client';

/**
 * ═══════════════════════════════════════════════
 * TSH Restaurantes — Offline Database (IndexedDB)
 * ═══════════════════════════════════════════════
 * Local storage for POS offline mode:
 * - Products & categories cached for offline browsing
 * - Orders created offline with temp IDs
 * - Sync queue for pending mutations
 */

const DB_NAME = 'tsh-pos-offline';
const DB_VERSION = 1;

// ─── STORES ───
const STORES = {
  products: 'products',
  categories: 'categories',
  orders: 'offline_orders',
  syncQueue: 'sync_queue',
  meta: 'meta', // for timestamps, config
};

// ─── OPEN DB ───
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.products)) {
        const ps = db.createObjectStore(STORES.products, { keyPath: 'id' });
        ps.createIndex('categoryId', 'categoryId', { unique: false });
        ps.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.categories)) {
        db.createObjectStore(STORES.categories, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.orders)) {
        const os = db.createObjectStore(STORES.orders, { keyPath: 'id' });
        os.createIndex('status', 'status', { unique: false });
        os.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const sq = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
        sq.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── GENERIC HELPERS ───

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOne<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function putOne(storeName: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function putMany(storeName: string, items: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteOne(storeName: string, key: string | number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ═══════════════════════════════════════
// PRODUCTS & CATEGORIES
// ═══════════════════════════════════════

export async function cacheProducts(products: any[]): Promise<void> {
  await clearStore(STORES.products);
  await putMany(STORES.products, products);
  await putOne(STORES.meta, { key: 'products_cached_at', value: Date.now() });
}

export async function cacheCategories(categories: any[]): Promise<void> {
  await clearStore(STORES.categories);
  await putMany(STORES.categories, categories);
  await putOne(STORES.meta, { key: 'categories_cached_at', value: Date.now() });
}

export async function getCachedProducts(): Promise<any[]> {
  return getAll(STORES.products);
}

export async function getCachedCategories(): Promise<any[]> {
  return getAll(STORES.categories);
}

export async function getProductsByCategory(categoryId: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.products, 'readonly');
    const store = tx.objectStore(STORES.products);
    const index = store.index('categoryId');
    const req = index.getAll(categoryId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function searchCachedProducts(query: string): Promise<any[]> {
  const all = await getAll<any>(STORES.products);
  const q = query.toLowerCase();
  return all.filter(p =>
    p.name?.toLowerCase().includes(q) ||
    p.sku?.toLowerCase().includes(q)
  );
}

export async function getCacheAge(): Promise<{ products: number | null; categories: number | null }> {
  const pMeta = await getOne<any>(STORES.meta, 'products_cached_at');
  const cMeta = await getOne<any>(STORES.meta, 'categories_cached_at');
  return {
    products: pMeta?.value || null,
    categories: cMeta?.value || null,
  };
}

// ═══════════════════════════════════════
// OFFLINE ORDERS
// ═══════════════════════════════════════

export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface OfflineOrder {
  id: string;
  type: string;
  status: 'open' | 'completed';
  items: OfflineOrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  payments: any[];
  notes?: string;
  metadata?: any;
  createdAt: string;
  _offline: true;
  _syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  _syncError?: string;
}

export interface OfflineOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  status: 'active' | 'voided';
}

export async function createOfflineOrder(type: string = 'dine_in', metadata?: any): Promise<OfflineOrder> {
  const order: OfflineOrder = {
    id: generateOfflineId(),
    type,
    status: 'open',
    items: [],
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    payments: [],
    metadata,
    createdAt: new Date().toISOString(),
    _offline: true,
    _syncStatus: 'pending',
  };
  await putOne(STORES.orders, order);
  return order;
}

export async function addOfflineItem(
  orderId: string,
  product: any,
  quantity: number = 1,
  notes?: string
): Promise<OfflineOrder | null> {
  const order = await getOne<OfflineOrder>(STORES.orders, orderId);
  if (!order) return null;

  const price = product.price || 0;
  const existingIdx = order.items.findIndex(
    i => i.productId === product.id && i.status === 'active' && i.notes === (notes || '')
  );

  if (existingIdx >= 0) {
    // Merge quantities
    order.items[existingIdx].quantity += quantity;
    order.items[existingIdx].total = order.items[existingIdx].quantity * order.items[existingIdx].unitPrice;
  } else {
    order.items.push({
      id: generateOfflineId(),
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: price,
      total: price * quantity,
      notes: notes || undefined,
      status: 'active',
    });
  }

  recalcOfflineOrder(order);
  await putOne(STORES.orders, order);
  return order;
}

export async function voidOfflineItem(orderId: string, itemId: string): Promise<OfflineOrder | null> {
  const order = await getOne<OfflineOrder>(STORES.orders, orderId);
  if (!order) return null;
  const item = order.items.find(i => i.id === itemId);
  if (item) item.status = 'voided';
  recalcOfflineOrder(order);
  await putOne(STORES.orders, order);
  return order;
}

export async function updateOfflineItemQty(orderId: string, itemId: string, quantity: number): Promise<OfflineOrder | null> {
  const order = await getOne<OfflineOrder>(STORES.orders, orderId);
  if (!order) return null;
  const item = order.items.find(i => i.id === itemId);
  if (item) {
    item.quantity = quantity;
    item.total = item.unitPrice * quantity;
  }
  recalcOfflineOrder(order);
  await putOne(STORES.orders, order);
  return order;
}

function recalcOfflineOrder(order: OfflineOrder) {
  const activeItems = order.items.filter(i => i.status === 'active');
  order.subtotal = activeItems.reduce((sum, i) => sum + i.total, 0);
  // Default 15% tax (from tenant settings ideally)
  const taxRate = 0.15;
  order.taxAmount = Math.round(order.subtotal * taxRate * 100) / 100;
  order.total = Math.round((order.subtotal + order.taxAmount) * 100) / 100;
}

export async function completeOfflineOrder(orderId: string, payment: {
  method: string; amount: number; cashReceived?: number;
}): Promise<OfflineOrder | null> {
  const order = await getOne<OfflineOrder>(STORES.orders, orderId);
  if (!order) return null;
  order.status = 'completed';
  order.payments.push({
    id: generateOfflineId(),
    method: payment.method,
    amount: payment.amount,
    cashReceived: payment.cashReceived,
    paidAt: new Date().toISOString(),
  });
  await putOne(STORES.orders, order);
  return order;
}

export async function getOfflineOrders(): Promise<OfflineOrder[]> {
  return getAll<OfflineOrder>(STORES.orders);
}

export async function getPendingOfflineOrders(): Promise<OfflineOrder[]> {
  const all = await getAll<OfflineOrder>(STORES.orders);
  return all.filter(o => o._syncStatus === 'pending' || o._syncStatus === 'error');
}

export async function deleteOfflineOrder(id: string): Promise<void> {
  await deleteOne(STORES.orders, id);
}

export async function updateOfflineOrderSync(id: string, status: OfflineOrder['_syncStatus'], error?: string): Promise<void> {
  const order = await getOne<OfflineOrder>(STORES.orders, id);
  if (!order) return;
  order._syncStatus = status;
  if (error) order._syncError = error;
  await putOne(STORES.orders, order);
}

// ═══════════════════════════════════════
// SYNC QUEUE (generic mutations)
// ═══════════════════════════════════════

export interface SyncQueueItem {
  id?: number;
  action: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export async function addToSyncQueue(action: string, payload: any): Promise<void> {
  await putOne(STORES.syncQueue, {
    action,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAll<SyncQueueItem>(STORES.syncQueue);
}

export async function removeSyncItem(id: number): Promise<void> {
  await deleteOne(STORES.syncQueue, id);
}

export async function clearSyncQueue(): Promise<void> {
  await clearStore(STORES.syncQueue);
}

// ═══════════════════════════════════════
// FULL CLEAR
// ═══════════════════════════════════════

export async function clearAllOfflineData(): Promise<void> {
  await clearStore(STORES.products);
  await clearStore(STORES.categories);
  await clearStore(STORES.orders);
  await clearStore(STORES.syncQueue);
  await clearStore(STORES.meta);
}
