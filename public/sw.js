const CACHE_NAME = "smart-retail-v3";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/app-icon.svg",
  "/app-icon-maskable.svg"
];

// ✅ INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ✅ ACTIVATE (clean old caches)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ✅ FETCH HANDLER (FIXED + SAFE)
self.addEventListener("fetch", (event) => {
  // Only GET requests
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // 🚫 Skip Supabase requests (always network)
  if (requestUrl.hostname.includes("supabase")) return;

  // ✅ Handle navigation (React Router support)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ✅ Static assets: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {

      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Cache only valid responses
          if (
            response &&
            response.status === 200 &&
            (response.type === "basic" || response.type === "cors")
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // fallback safely

      return cached || fetchPromise;
    })
  );
});