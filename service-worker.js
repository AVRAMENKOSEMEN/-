const CACHE_NAME = "gpsapp-cache-v5";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); }))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request).catch(()=>{
    if (event.request.mode === 'navigate') return caches.match('/index.html');
  })));
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  // notify clients that a new version is available (best-effort)
  self.clients && self.clients.matchAll && self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({type:'NEW_VERSION'}));
  });
});