const CACHE_NAME = 'shema-cache-v87';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './vendor/supabase.js',
  './shema-icon-192.png',
  './shema-icon-512.png',
  './shema-mark-color.png',
  './shema-mark-inverse.png',
  './icons/apple-touch-icon.png',
  './icons/backupexportbtn-dark.png',
  './icons/backupexportbtn.png',
  './icons/backupimportbtn-dark.png',
  './icons/backupimportbtn.png',
  './icons/brandbar.png',
  './icons/darkmodebtn-light.png',
  './icons/darkmodebtn.png',
  './icons/del-dark.png',
  './icons/del.png',
  './icons/drag-to-reorder-dark.png',
  './icons/drag-to-reorder.png',
  './icons/fabadd.png',
  './icons/fontbtn-dark.png',
  './icons/fontbtn.png',
  './icons/fontdown-dark.png',
  './icons/fontdown.png',
  './icons/fontup-dark.png',
  './icons/fontup.png',
  './icons/bullet-list-dark.png',
  './icons/bullet-list.png',
  './icons/numbered-list-dark.png',
  './icons/numbered-list.png',
  './icons/indent.png',
  './icons/indent-dark.png',
  './icons/outdent.png',
  './icons/outdent-dark.png',
  './icons/toolbar-toggle.png',
  './icons/toolbar-toggle-dark.png',
  './icons/icon-close-dark.png',
  './icons/icon-close.png',
  './icons/nav-editor-dark.png',
  './icons/nav-editor.png',
  './icons/nav-illustrations-dark.png',
  './icons/nav-illustrations.png',
  './icons/nav-library-dark.png',
  './icons/nav-library.png',
  './icons/nav-plan-dark.png',
  './icons/nav-plan.png',
  './icons/nav-present-dark.png',
  './icons/nav-present.png',
  './icons/plannextbtn-dark.png',
  './icons/plannextbtn.png',
  './icons/planprevbtn-dark.png',
  './icons/planprevbtn.png',
  './icons/presentbrand.png',
  './icons/sec-down-dark.png',
  './icons/sec-down.png',
  './icons/sec-up-dark.png',
  './icons/sec-up.png'
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
