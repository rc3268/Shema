const CACHE_NAME = 'shema-cache-v36';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './shema-icon-192.png',
  './shema-icon-512.png',
  './shema-mark-color.png',
  './shema-mark-inverse.png'
];

self.addEventListener('install', event => {
  // cache.addAll() does a plain fetch() under the hood, which is subject to the browser's
  // ordinary HTTP cache -- a CACHE_NAME bump guarantees a fresh Cache Storage entry, but if
  // the browser already had index.html sitting in its normal HTTP cache, addAll() could still
  // silently pull that stale copy in. {cache:'reload'} forces each request straight to the
  // network, bypassing HTTP cache entirely, so a version bump is guaranteed to fetch the real
  // current file.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(url =>
        fetch(url, { cache: 'reload' }).then(response => cache.put(url, response))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => response).catch(() => cached);
    })
  );
});
