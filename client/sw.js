const CACHE_NAME = 'pf-cache-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/socket.io/socket.io.min.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Do not intercept WebSocket upgrades or non-GET requests
  if (event.request.method !== 'GET') return;

  // Do not cache API calls or socket.io dynamic paths (allow the static client script)
  if (url.pathname.startsWith('/api/') ||
      (url.pathname.startsWith('/socket.io/') && url.pathname !== '/socket.io/socket.io.min.js')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Only cache successful same-origin responses for static assets
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        // For navigation requests, fall back to the app shell
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
