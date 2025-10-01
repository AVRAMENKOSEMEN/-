const CACHE_NAME = "btgps-cache-v2";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./map.html",
  "./offline.html",
  "./style.css",
  "./script.js",
  "./history-manager.js",
  "./settings.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Установка
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Активация
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(keyList.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

// Fetch с offline fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.mode === "navigate") {
          return caches.match("./offline.html");
        }
      });
    })
  );
});
