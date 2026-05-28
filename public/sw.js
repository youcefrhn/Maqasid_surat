const CACHE_NAME = 'maqasid-quran-cache-v1';

// We fetch first, then fallback to cache
self.addEventListener('fetch', (event) => {
  // We only cache GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension or other non-http resources
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if request fails (offline mode)
        return caches.match(event.request);
      })
  );
});
