/* Het Huis van Sep: offline-cache.
   Stale-while-revalidate: meteen uit de cache serveren (dus ook zonder
   internet), en op de achtergrond de nieuwste versie ophalen voor de
   volgende keer. */
const CACHE = "huis-van-sep-v1";
const KERN = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "vendor/fonts/baloo-2-latin-wght-normal.woff2",
  "vendor/three/build/three.module.js",
  "vendor/three/build/three.core.js",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(KERN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
      const vers = fetch(req)
        .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || vers;
    })
  );
});
