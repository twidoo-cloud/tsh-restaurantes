'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { create } from 'zustand';

// ─── OFFLINE STORE ───

interface OfflineState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  queuedActions: QueuedAction[];
  isSyncing: boolean;
  lastSyncAt: number | null;
  setOnline: (v: boolean) => void;
  setSWReady: (v: boolean) => void;
  addQueuedAction: (action: QueuedAction) => void;
  removeQueuedAction: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (v: boolean) => void;
  setLastSync: (ts: number) => void;
}

export interface QueuedAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

const QUEUE_KEY = 'pos-offline-queue';

function loadQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

function saveQueue(queue: QueuedAction[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isServiceWorkerReady: false,
  queuedActions: loadQueue(),
  isSyncing: false,
  lastSyncAt: null,
  setOnline: (v) => set({ isOnline: v }),
  setSWReady: (v) => set({ isServiceWorkerReady: v }),
  addQueuedAction: (action) => {
    const queue = [...get().queuedActions, action];
    saveQueue(queue);
    set({ queuedActions: queue });
  },
  removeQueuedAction: (id) => {
    const queue = get().queuedActions.filter(a => a.id !== id);
    saveQueue(queue);
    set({ queuedActions: queue });
  },
  clearQueue: () => { saveQueue([]); set({ queuedActions: [] }); },
  setSyncing: (v) => set({ isSyncing: v }),
  setLastSync: (ts) => set({ lastSyncAt: ts }),
}));

// ─── SERVICE WORKER REGISTRATION ───

export function useServiceWorker() {
  const { setSWReady, addQueuedAction } = useOfflineStore();
  const registered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || registered.current) return;
    registered.current = true;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      console.log('[PWA] SW registered, scope:', reg.scope);
      setSWReady(true);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[PWA] New SW activated — reload for updates');
            // Optionally notify user of update
          }
        });
      });

      // Check for updates periodically (every 30min)
      setInterval(() => reg.update(), 30 * 60 * 1000);
    }).catch((err) => {
      console.warn('[PWA] SW registration failed:', err);
    });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      if (type === 'QUEUE_STORE' && data) addQueuedAction(data);
      if (type === 'OFFLINE_QUEUED') console.log('[PWA] Queued offline:', data?.method, data?.url);
      if (type === 'SYNC_START') syncQueue();
    });
  }, []);
}

// ─── ONLINE/OFFLINE DETECTION ───

export function useOnlineStatus() {
  const { isOnline, setOnline } = useOfflineStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline = () => { setOnline(true); syncQueue(); };
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

// ─── SYNC QUEUE ───

async function syncQueue() {
  const store = useOfflineStore.getState();
  if (store.isSyncing || store.queuedActions.length === 0 || !navigator.onLine) return;

  store.setSyncing(true);
  console.log(`[PWA] Syncing ${store.queuedActions.length} queued actions...`);

  const queue = [...store.queuedActions];
  let synced = 0;
  let failed = 0;

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });
      if (response.ok || response.status < 500) {
        store.removeQueuedAction(action.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      // Network still down, stop trying
      break;
    }
  }

  store.setSyncing(false);
  if (synced > 0) store.setLastSync(Date.now());
  console.log(`[PWA] Sync done: ${synced} ok, ${failed} failed, ${queue.length - synced - failed} pending`);

  // Notify clients
  if (synced > 0 && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // SW will broadcast update
  }
}

// ─── PRE-CACHE API DATA ───

export function usePrecacheData() {
  const cacheApiData = useCallback((path: string, data: any) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    // Build full URL from path
    const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_API', url, data });
  }, []);

  const cachePage = useCallback((url: string) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_PAGE', url });
  }, []);

  return { cacheApiData, cachePage };
}

// ─── AUTO PRE-CACHE ON LOGIN ───

export function useAutoPrecache() {
  const { cacheApiData, cachePage } = usePrecacheData();
  const { isServiceWorkerReady } = useOfflineStore();

  const precacheEssentials = useCallback(async () => {
    if (!isServiceWorkerReady) return;
    console.log('[PWA] Pre-caching essential data...');

    // Cache key pages
    ['/pos', '/kitchen', '/tables', '/dashboard', '/waiter', '/login'].forEach(cachePage);

    // Cache API data
    const token = localStorage.getItem('pos_token');
    if (!token) return;

    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const endpoints = [
      '/products/categories',
      '/products?limit=200',
      '/customers?limit=100',
      '/tenants/current',
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${API}${ep}`, { headers });
        if (res.ok) {
          const data = await res.json();
          cacheApiData(`${API}${ep}`, data);
        }
      } catch { /* offline already, skip */ }
    }

    console.log('[PWA] Pre-cache done');
  }, [isServiceWorkerReady, cacheApiData, cachePage]);

  return { precacheEssentials };
}

// ─── INSTALL PROMPT ───

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setIsInstallable(false); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (result.outcome === 'accepted') setIsInstalled(true);
    return result.outcome === 'accepted';
  };

  return { isInstallable, isInstalled, install };
}
