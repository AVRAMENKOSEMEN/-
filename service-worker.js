const CACHE_NAME = "mayak-cache-v10";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./settings.js",
  "./history-manager.js",
  "./manifest.json",
  "./offline.html",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(()=> caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./offline.html') : undefined)))
  );
});
