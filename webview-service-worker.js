// Webview-optimized Service Worker for FuelFinder PH
const CACHE_NAME = 'fuel-finder-webview-v1';
const urlsToCache = [
  '/',
  '/webview.html',
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

// Fetch event - serve cached content when offline with webview optimizations
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // For API requests, return a placeholder response when offline
          if (event.request.url.includes('/api/')) {
            return new Response(JSON.stringify({ 
              error: 'Offline',
              message: 'You are currently offline. Please check your internet connection and try again.',
              cached: true
            }), {
              headers: { 
                'Content-Type': 'application/json',
                'X-Cache-Status': 'offline-fallback'
              }
            });
          }
          
          // For webview.html, return cached version
          if (event.request.url.includes('/webview.html')) {
            return caches.match('/webview.html');
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

// Webview-specific offline detection
self.addEventListener('online', () => {
  // Notify clients that we're back online
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ONLINE_STATUS_CHANGED',
        online: true
      });
    });
  });
});

self.addEventListener('offline', () => {
  // Notify clients that we're offline
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ONLINE_STATUS_CHANGED',
        online: false
      });
    });
  });
});