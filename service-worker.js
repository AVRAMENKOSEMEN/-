self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("gps-finder").then(cache => {
      return cache.addAll([
        "index.html",
        "style.css",
        "script.js",
        "settings.js",
        "manifest.json",
        "offline.html"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(res => res || caches.match("offline.html")))
  );
});
