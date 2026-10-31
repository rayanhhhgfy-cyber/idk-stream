// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    🔧  SERVICE WORKER  🔧                          ║
// ║                                                                    ║
// ║  A service worker runs in the background of the browser.          ║
// ║  It intercepts network requests and can serve cached content      ║
// ║  when offline, making the app feel fast and native-like.          ║
// ║                                                                    ║
// ║  STRATEGY:                                                         ║
// ║    - Static assets (JS, CSS, images): Cache-first                 ║
// ║    - API calls: Network-first with cache fallback                 ║
// ║    - Pages: Network-first with offline fallback                   ║
// ╚══════════════════════════════════════════════════════════════════════╝

const CACHE_NAME = 'idkstream-v2';

// Assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/manifest.json',
];

// Install: pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for pages/API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests (TMDB API, video providers, etc.)
  if (!url.origin.includes(self.location.origin)) return;

  // For navigation (pages): network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // For static assets: cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    // Network-first: installed PWAs must receive fresh app code (the old
    // cache-first strategy kept stale bundles on devices and blocked fixes)
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});
