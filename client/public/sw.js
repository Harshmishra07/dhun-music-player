const CACHE_NAME = 'dhun-v2-cache';
const STATIC_ASSETS = [
    '/',
    '/index.html',
];

// Install — cache shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET and non-http(s) requests (chrome-extension etc.)
    if (request.method !== 'GET') return;
    if (!request.url.startsWith('http')) return;

    // Network-first for API calls — always go to network, fall back to cache
    if (request.url.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then((res) => res)
                .catch(() =>
                    caches.match(request).then(
                        (cached) => cached || new Response('Network error', { status: 503 })
                    )
                )
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                // Only cache same-origin successful responses
                if (
                    response.ok &&
                    response.type === 'basic' &&
                    (request.url.endsWith('.js') ||
                        request.url.endsWith('.css') ||
                        request.url.endsWith('.html'))
                ) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            }).catch(() => new Response('Network error', { status: 503 }));
        })
    );
});

