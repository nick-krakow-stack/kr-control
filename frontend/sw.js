const CACHE_NAME = "kr-control-v15";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/js/app.js",
  "/js/api.js",
  "/js/config.js",
  "/js/router.js",
  "/js/views/login.js",
  "/js/views/dashboard.js",
  "/js/views/locations.js",
  "/js/views/cases.js",
  "/js/views/case-new.js",
  "/js/views/case-detail.js",
  "/js/views/password-setup.js",
  "/js/views/admin-users.js",
  "/js/views/self-control-report.js",
  "/js/views/profile.js",
  "/js/ticket.js",
  "/js/views/password-forgot.js",
  "/js/views/password-reset.js",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always fetch API requests from network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
    event.respondWith(fetch(event.request).catch(() => new Response("Offline", { status: 503 })));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
