// Service Worker for FuelFinder PH PWA
const CACHE_NAME = 'fuel-finder-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/map.html',
  '/admin.html',
  '/manifest.json',
  '/config.js',
  '/mapFunctions.js',
  '/markerFunctions.js',
  '/utilFunctions.js',
  '/stationDetails.js',
  '/authFunctions.js',
  '/userUIHandlers.js',
  '/server.js',
  '/logos/shell.png',
  '/logos/petron.png',
  '/logos/caltex.png',
  '/logos/flyingv.png',
  '/logos/jetti.png',
  '/logos/default.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // For API requests, return a placeholder response when offline
          if (event.request.url.includes('/api/')) {
            return new Response(JSON.stringify({ error: 'Offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          // For other requests, return cached fallback
          return caches.match('/');
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});