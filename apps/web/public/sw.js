/// <reference lib="webworker" />

const CACHE_VERSION = 2;
const STATIC_CACHE = `pos-static-v${CACHE_VERSION}`;
const API_CACHE = `pos-api-v${CACHE_VERSION}`;
const OFFLINE_QUEUE_KEY = 'pos-offline-queue';

// ─── APP SHELL: pages to pre-cache ───
const APP_SHELL = [
  '/',
  '/pos',
  '/login',
  '/kitchen',
  '/tables',
  '/dashboard',
  '/waiter',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// ─── API paths worth caching (GET only, matched by substring) ───
const CACHEABLE_API_PATHS = [
  '/products',
  '/products/categories',
  '/customers',
  '/tables',
  '/tenants/current',
  '/tenants/branding',
  '/inventory/stock',
  '/menu/',
];

// ─── INSTALL ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Pre-cache app shell — don't block on failures
      await Promise.allSettled(
        APP_SHELL.map(url =>
          cache.add(url).catch(err => console.log(`[SW] Skip: ${url}`, err.message))
        )
      );
      console.log('[SW] Install complete');
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE: clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => { console.log(`[SW] Purge cache: ${key}`); return caches.delete(key); })
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH HANDLER ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension, webpack HMR, etc.
  if (!url.protocol.startsWith('http')) return;

  // ─── Non-GET: queue offline if fails ───
  if (request.method !== 'GET') {
    event.respondWith(handleMutation(request));
    return;
  }

  // ─── API requests (same or cross-origin) ───
  if (isApiRequest(url)) {
    const isCacheable = CACHEABLE_API_PATHS.some(p => url.pathname.includes(p));
    if (isCacheable) {
      event.respondWith(networkFirst(request, API_CACHE));
    } else {
      event.respondWith(networkOnly(request));
    }
    return;
  }

  // ─── Next.js static assets (_next/static) — cache-first ───
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ─── App pages — stale-while-revalidate ───
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ─── HELPERS ───

function isApiRequest(url) {
  // Cross-origin API (localhost:3001 or production API domain)
  if (url.port && url.port !== self.location.port) return true;
  // Proxied /api/ path
  if (url.pathname.startsWith('/api/')) return true;
  // Common API patterns
  if (url.pathname.match(/^\/(products|customers|orders|tables|tenants|auth|inventory|menu|shifts|invoices|reports|audit|kitchen)/)) return true;
  return false;
}

// ─── STRATEGIES ───

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return jsonResponse({ error: 'offline', message: 'Datos no disponibles sin conexión' }, 503);
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  if (cached) {
    // Return cached immediately, update in background
    networkFetch; // fire and forget
    return cached;
  }

  // No cache — wait for network
  const networkResponse = await networkFetch;
  if (networkResponse) return networkResponse;

  // Both failed — show offline page
  const offlinePage = await caches.match('/offline');
  if (offlinePage) return offlinePage;
  return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return jsonResponse({ error: 'offline', message: 'Sin conexión a internet' }, 503);
  }
}

// ─── OFFLINE MUTATION QUEUE ───

async function handleMutation(request) {
  try {
    return await fetch(request.clone());
  } catch {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      await queueRequest(request);
      return jsonResponse({
        _offline: true,
        _queued: true,
        message: 'Guardado offline. Se sincronizará al reconectar.',
        id: 'offline-' + Date.now(),
      }, 200);
    }
    return jsonResponse({ error: 'offline' }, 503);
  }
}

async function queueRequest(request) {
  try {
    const body = await request.text();
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body || null,
      timestamp: Date.now(),
    };

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'QUEUE_STORE', data: item });
      client.postMessage({ type: 'OFFLINE_QUEUED', data: item });
    });
  } catch (e) {
    console.error('[SW] Queue error:', e);
  }
}

// ─── BACKGROUND SYNC ───

self.addEventListener('sync', (event) => {
  if (event.tag === 'pos-offline-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_START' }));
}

// ─── MESSAGE HANDLER ───

self.addEventListener('message', (event) => {
  const { type, url, data } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CACHE_API' && url && data) {
    caches.open(API_CACHE).then(cache => {
      cache.put(new Request(url), new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'X-SW-Cached': 'true' },
      }));
    });
  }

  // Force cache a page
  if (type === 'CACHE_PAGE' && url) {
    caches.open(STATIC_CACHE).then(cache => cache.add(url).catch(() => {}));
  }
});

// ─── UTILS ───

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
