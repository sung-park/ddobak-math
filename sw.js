const CACHE_NAME = 'ddobak-math-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/global.css',
  './css/components.css',
  './css/home.css',
  './css/game-common.css',
  './css/parent.css',
  './js/app.js',
  './js/router.js',
  './js/engine/storage.js',
  './js/engine/game-engine.js',
  './js/engine/reward-engine.js',
  './js/engine/mastery-tracker.js',
  './js/engine/sound-manager.js',
  './js/screens/home.js',
  './js/screens/curriculum.js',
  './js/screens/daily-pick.js',
  './js/screens/shop.js',
  './js/screens/my-record.js',
  './js/screens/settings.js',
  './js/games/block-calc.js',
  './js/games/matrix.js',
  './js/games/number-line.js',
  './js/games/clock.js',
  './js/games/coins.js',
  './js/games/counting-farm.js',
  './js/games/scale.js',
  './js/games/pizza.js',
  './js/games/shape-sort.js',
  './js/games/division-tree.js',
  './js/games/ruler.js',
  './js/games/bar-graph.js',
  './js/games/pattern.js',
  './js/parent/dashboard.js',
  './data/concepts.json'
];

// Install — cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first, fallback to cache (ensures updates are seen immediately)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).then(response => {
      if (response.status === 200 && e.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
