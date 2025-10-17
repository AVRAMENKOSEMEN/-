// service-worker.js
const CACHE_NAME = "mayak-finder-cache-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./history-manager.js",
  "./settings.js",
  "./manifest.json",
  "./offline.html",
  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Кеш открыт");
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error("Ошибка кеширования:", error);
      })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("Удаление старого кеша:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes('google') || 
      event.request.url.includes('yandex') ||
      event.request.url.includes('2gis')) {
    return; // Не кешируем внешние карты
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем кешированную версию или загружаем новую
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Кешируем новые запросы
            if (event.request.url.startsWith('http') && 
                event.request.method === 'GET') {
              return caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, fetchResponse.clone());
                  return fetchResponse;
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // При ошибке сети показываем офлайн-страницу
            if (event.request.destination === 'document') {
              return caches.match('./offline.html');
            }
          });
      })
  );
});
