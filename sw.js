const CACHE_NAME = 'shema-cache-v2';
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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
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
