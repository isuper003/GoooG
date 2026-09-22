/* ============================================================================
   GoooG PWA Service Worker (v1.0.0)
   High-precision offline shell, instant loading & PWA installation criteria
   ============================================================================ */

const CACHE_NAME = 'goog-pwa-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
];

// 1. Install Event: Precache app shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Precache failed:', err);
      })
  );
});

// 2. Activate Event: Prune old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Smart routing & caching
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // NEVER cache API requests or non-same-origin requests (e.g. streaming videos, pornpics, redgifs)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle SPA Navigation requests (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes.ok) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Fallback to cached index.html when offline or network fails
          const cachedIndex = await caches.match('/index.html');
          return cachedIndex || caches.match('/');
        })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cachedRes) => {
      // Return cached version immediately if available, while updating in background
      const fetchPromise = fetch(request)
        .then((networkRes) => {
          if (networkRes.ok && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          // Network failure is fine if we have cachedRes
          return cachedRes;
        });

      return cachedRes || fetchPromise;
    })
  );
});
