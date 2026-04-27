const CACHE = "sfa-v2";

// Only cache truly static assets — never HTML pages (they can redirect)
const STATIC_ASSETS = ["/favicon.svg", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Skip Firebase, Vite HMR, external CDN — let them go straight to network
  if (
    !url.hostname.includes("localhost") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  // HTML pages (navigation): network-first, cache as offline fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r ?? Response.error()))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});
