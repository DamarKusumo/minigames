// network-first so deploys show up immediately; cache only as offline fallback
const CACHE = 'minigames-v1';
const SHELL = [
  '.',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/storage.js',
  'games/snake.js',
  'games/sudoku.js',
  'games/bounce.js',
  'games/2048.js',
  'games/tetris.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: false }).then((hit) => hit || caches.match('index.html')))
  );
});
