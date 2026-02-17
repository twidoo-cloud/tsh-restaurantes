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
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
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
  clearQueue: () => {
    saveQueue([]);
    set({ queuedActions: [] });
  },
  setSyncing: (v) => set({ isSyncing: v }),
  setLastSync: (ts) => set({ lastSyncAt: ts }),
}));

// ─── SERVICE WORKER REGISTRATION ───

export function useServiceWorker() {
  const { setSWReady, addQueuedAction, setSyncing } = useOfflineStore();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] Service Worker registered');
      setSWReady(true);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[PWA] New service worker activated');
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('[PWA] SW registration failed:', err);
    });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      if (type === 'QUEUE_STORE' && data) {
        addQueuedAction(data);
      }
      if (type === 'OFFLINE_QUEUED') {
        console.log('[PWA] Action queued offline:', data?.url);
      }
      if (type === 'SYNC_START') {
        syncQueue();
      }
    });
  }, []);
}

// ─── ONLINE/OFFLINE DETECTION ───

export function useOnlineStatus() {
  const { isOnline, setOnline } = useOfflineStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setOnline(true);
      // Trigger sync when coming back online
      syncQueue();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ─── SYNC QUEUE ───

async function syncQueue() {
  const store = useOfflineStore.getState();
  if (store.isSyncing || store.queuedActions.length === 0) return;
  if (!navigator.onLine) return;

  store.setSyncing(true);
  console.log(`[PWA] Syncing ${store.queuedActions.length} queued actions...`);

  const queue = [...store.queuedActions];
  let synced = 0;

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
        console.log(`[PWA] Synced: ${action.method} ${action.url}`);
      }
    } catch (err) {
      console.warn(`[PWA] Sync failed for ${action.url}:`, err);
      break; // Stop on network error
    }
  }

  store.setSyncing(false);
  if (synced > 0) store.setLastSync(Date.now());
  console.log(`[PWA] Sync complete: ${synced}/${queue.length}`);
}

// ─── PRE-CACHE API DATA ───

export function usePrecacheData() {
  const cacheApiData = useCallback((url: string, data: any) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_API',
      url,
      data,
    });
  }, []);

  return { cacheApiData };
}

// ─── INSTALL PROMPT ───

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed
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
