const CACHE = 'succseed-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  // Only cache same-origin GET requests; let Supabase/API calls pass through
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then((res) => {
        cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached);
      return cached ?? networkFetch;
    })
  );
});
