const CACHE = 'tpb-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/admin.html',
  '/cashier.html',
  '/mobile-cashier.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/img/logo-navbar.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res =>
        caches.open(CACHE).then(cache => {
          if (e.request.url.startsWith(self.location.origin)) {
            cache.put(e.request, res.clone());
          }
          return res;
        })
      ).catch(() => caches.match('/index.html'))
    )
  );
});
