/*
 * Offline shell for the installed app.
 *
 * Navigations are network-first so a new deploy is picked up as soon as
 * there's a connection, with the cached page as the fallback when there
 * isn't. Hashed build assets are cache-first — their URL changes when
 * their content does, so a hit is always correct.
 */
// Bump to drop every previously cached response — activate deletes any cache
// whose name doesn't match.
const CACHE = "captains-log-v2";
const ROOT = new URL("./", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([ROOT]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(ROOT, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(ROOT))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
