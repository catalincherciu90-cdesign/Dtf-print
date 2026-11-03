/* MrDTF — Service Worker (PWA)
   - Navigări: network-first (vezi mereu conținutul live), fallback din cache offline.
   - Asset-uri statice (css/js/img/fonturi): cache-first + revalidare în fundal.
   - NU se pune niciodată în cache /api/ sau /admin (date dinamice + autentificare).
*/
const CACHE = "mrdtf-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add("/").catch(() => {}))  // best-effort (dacă e mentenanță, sare)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Niciodată din cache: API-ul și panoul admin.
  if (url.pathname.startsWith("/api/") || url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return;

  // Navigări (pagini): network-first, cu fallback offline din cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Asset-uri statice: cache-first + revalidare în fundal.
  if (/\.(css|js|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
});
