/* Het Huis van Sep: offline-cache.
   - De pagina en de spelcode: eerst het netwerk (altijd de nieuwste versie),
     en alleen zonder internet de laatst bewaarde kopie.
   - Zware, vaste bestanden (three.js, modellen, lettertype, stemopnames,
     iconen): eerst de cache, zodat het huis snel en ook offline laadt.
   - Niet bewaard: de live stem (api/) en deelverzoeken (Range) van audio. */
const CACHE = "huis-van-sep-v3";
const VAST = /\/(vendor|assets|stem|icons)\/.+\.(js|woff2|glb|webp|png|svg|mp3)$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function bewaar(req, res) {
  if (res && res.status === 200 && res.type === "basic") {
    const kopie = res.clone();
    caches.open(CACHE).then(c => c.put(req, kopie)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.headers.has("range") || url.pathname.includes("/api/")) return;
  if (VAST.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => bewaar(req, res))));
  } else {
    e.respondWith(
      fetch(req).then(res => bewaar(req, res))
        .catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(hit => hit || Response.error()))
    );
  }
});
