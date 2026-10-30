// Lifeline offline cache. VERSION is bumped per snapshot (old caches are deleted on activate).
// No stale builds after a publish: HTML, JS, CSS and JSON are NETWORK-FIRST (cache is only the offline fallback);
// images / audio / fonts are cache-first (their content rarely changes and they are the bulk of the bytes).
const VERSION = 'lifeline-7c6s-stripe2';
const CORE = ['./', './index.html', './manifest.webmanifest', './terms.html', './privacy.html',
  './ui/css/app.css', './ui/css/merge.css', './ui/css/style.css', './ui/css/start.css', './ui/css/vivid.css',
  './art/theme.css', './art/fantasy.css', './ui/js/app.js',
  './assets/brand/icon-192.png', './assets/brand/icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const FRESH = /\.(html?|js|mjs|css|json|webmanifest)$/i;
const put = (req, r) => { if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return r; };
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || FRESH.test(url.pathname) || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => put(req, r)).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => put(req, r))));
});
