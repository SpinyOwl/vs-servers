// Image cache: cache-first for <img> requests, persisted in the Cache API.
const CACHE = 'vs-images-v1';
const MAX_ENTRIES = 500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('vs-images-') && n !== CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.destination !== 'image') {
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  // Only store complete, readable responses (opaque ones would waste quota).
  if (response.ok && response.status === 200 && response.type !== 'opaque') {
    await cache.put(request, response.clone());
    trim(cache);
  }
  return response;
}

// Evict the oldest entries (Cache API keeps insertion order).
async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ENTRIES; i++) {
    await cache.delete(keys[i]);
  }
}
