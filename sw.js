const CACHE = "doghouse-v1";

const SHELL = [
  "/",
  "/index.html",
  "/icon.png",
  "/assets/watson.png",
  "/assets/eddie.png",
  "/assets/sully.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
];

// Pre-cache app shell on install
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never intercept Supabase API calls — always need fresh auth + data
  if (url.hostname.includes("supabase.co")) return;

  // CDN assets (Supabase JS, etc.) — cache-first
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Same-origin requests — network-first, fall back to cache
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // Refresh the cached copy with the latest response
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
