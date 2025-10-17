// service-worker.js
const CACHE_NAME = 'mayak-finder-v5';
const OFFLINE_URL = './offline.html';

// Ресурсы для кэширования при установке
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './history-manager.js',
  './settings.js',
  './ble-manager-compatible.js',
  './offline.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('🔄 Service Worker: Установка');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Кэширование основных ресурсов');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ Все ресурсы закэшированы');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Ошибка кэширования:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Активация');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker активирован');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // Пропускаем запросы к внешним картам
  if (event.request.url.includes('tile.openstreetmap.org') ||
      event.request.url.includes('google') ||
      event.request.url.includes('yandex') ||
      event.request.url.includes('2gis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Если есть в кэше - возвращаем
        if (response) {
          return response;
        }

        // Иначе пытаемся загрузить из сети
        return fetch(event.request)
          .then(fetchResponse => {
            // Кэшируем только успешные GET запросы
            if (fetchResponse && fetchResponse.status === 200 && 
                event.request.method === 'GET' &&
                event.request.url.startsWith('http')) {
              
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return fetchResponse;
          })
          .catch(error => {
            console.log('🌐 Оффлайн режим для:', event.request.url);
            
            // Только для навигационных запросов возвращаем оффлайн страницу
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Для остальных запросов возвращаем ошибку
            return new Response('Оффлайн', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
