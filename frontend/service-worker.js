const CACHE = 'kidzventure-v1';
const STATIC = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/api.js',
  '/js/app.js',
  '/js/pages/auth.js',
  '/js/pages/dashboard.js',
  '/js/pages/products.js',
  '/js/pages/leads.js',
  '/js/pages/quotations.js',
  '/js/pages/attendance.js',
  '/js/pages/leaves.js',
  '/js/pages/employees.js',
  '/js/pages/reports.js',
  '/js/pages/invoices.js',
  '/manifest.json',
  '/logo.jpeg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
