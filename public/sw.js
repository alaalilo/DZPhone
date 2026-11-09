const CACHE_NAME = 'dzphone-storefront-v3';
const STATIC_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/images/products/iphone-15-pro-max-titanium.webp',
  '/images/products/iphone-13-midnight-blue.webp',
  '/images/products/galaxy-s24-ultra-titanium.webp',
  '/images/products/galaxy-a55-iceblue-violet.webp',
  '/images/products/redmi-note-13-pro-black.webp',
  '/images/products/poco-x6-pro-yellow.webp'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // SECURITY: Never cache admin endpoints, auth tokens, webhooks, or live chat/order endpoints
  if (
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/orders') ||
    url.pathname.startsWith('/api/chat') ||
    url.pathname.startsWith('/api/webhooks') ||
    url.pathname.startsWith('/__vite') ||
    url.pathname.startsWith('/@')
  ) {
    return;
  }

  // Public read-only catalog APIs: Network-first with safe cache fallback for offline browsing
  if (
    url.pathname === '/api/products' ||
    url.pathname === '/api/shipping/wilayas' ||
    url.pathname === '/api/settings'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response(JSON.stringify({ error: 'Offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        })
    );
    return;
  }

  // Navigation requests: Network-first, fallback to cached SPA shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(event.request)) ||
            (await caches.match('/')) ||
            (await caches.match('/index.html'))
          );
        })
    );
    return;
  }

  // Static assets & product photography: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic' &&
            !url.pathname.endsWith('.ts') &&
            !url.pathname.endsWith('.tsx')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
