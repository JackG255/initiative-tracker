// Bump this when index.html/manifest/icons change, so old caches get cleared.
const CACHE_NAME = 'initiative-tracker-v7';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// How long a launch waits for the network before falling back to the cached
// shell. Long enough for a slow-but-working connection to win, short enough that
// a captive portal or a dead tunnel doesn't visibly stall the app.
const NAV_TIMEOUT_MS = 2500;

// The stale app shell is the one cache hit users actually notice, so the document
// is network-first: the newest deploy wins whenever the network answers at all,
// and the cache is the fallback rather than the default.
//
// `cache: 'no-cache'` is not optional. Without it fetch() can be answered from
// the browser's own HTTP cache, and Pages serves HTML with a max-age -- we would
// sidestep this worker only to get stale bytes from the layer underneath. It
// forces an ETag revalidation, so the common case is a cheap 304.
function freshShell(request) {
  // A navigation to the scope root and the precached './index.html' are separate
  // cache keys, so a cold offline launch has to try both.
  const fromCache = () =>
    caches.match(request)
      .then((r) => r || caches.match('./index.html'))
      .then((r) => r || caches.match('./'));

  const fromNetwork = fetch(request, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) return fromCache().then((cached) => cached || response);
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    })
    // Offline rejects immediately -- no reason to sit out the timeout.
    .catch(() => fromCache());

  const onTimeout = new Promise((resolve) => {
    setTimeout(() => resolve(fromCache().then((cached) => cached || fromNetwork)), NAV_TIMEOUT_MS);
  });

  return Promise.race([fromNetwork, onTimeout]);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests (the app shell itself). Everything else --
  // in particular the live Open5e monster-search calls -- goes straight to the
  // network untouched, so search results are always fresh and the app's own
  // "can't reach the live bestiary" fallback still works correctly.
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(freshShell(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Serve from cache immediately if we have it (fast + works offline),
      // while still updating the cache in the background from the network.
      return cached || networkFetch;
    })
  );
});
