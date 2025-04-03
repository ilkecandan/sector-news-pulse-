self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("news-cache").then(cache => {
      return cache.addAll(["/", "/index.html", "/style.css", "/app.js", "/keywords.js"]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request);
    })
  );
});
