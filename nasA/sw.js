/* =========================================================================
   sw.js — offline app shell for "Abandoned but not Forgotten"
   Same-origin GETs are served cache-first with a background refresh, so the
   exhibit opens instantly and keeps working with no network after the first
   visit.  Cross-origin calls (Google Fonts, YouTube embeds) are bypassed —
   they must never be cached or intercepted.
   ========================================================================= */
const VERSION = "abnf-v3";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/styles.css",
  "css/game.css",
  "css/footage.css",
  "js/data.js",
  "js/manifest.js",
  "js/vehicles.js",
  "js/app.js",
  "js/game.js",
  "js/footage.js",
  "js/narrator.js",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      /* addAll is atomic: one 404 would abort the whole install, so cache
         each entry on its own and let the core shell be mandatory */
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            fetch(url, { cache: "reload" })
              .then((res) => (res.ok ? cache.put(url, res) : undefined))
              .catch(() => undefined)
          )
        )
      )
      .then(() => caches.open(VERSION).then((c) => c.add("index.html")))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    /* Only YouTube's thumbnail CDN is cacheable — the footage section's
       32 card images.  Fonts and the YouTube player are left alone and
       must never be cached or intercepted. */
    if (url.hostname !== "i.ytimg.com") return;
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone(); /* opaque image response — cache it so
               the next visit (or offline visit) never re-downloads */
            caches
              .open(VERSION)
              .then((c) => c.put(req, copy))
              .catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  /* IMPORTANT: clone the response synchronously, before respondWith streams
     the body to the page — a clone inside a later .then() throws
     "Response body is already used" and the cache write silently dies */
  const revalidate = (res) => {
    if (res && res.ok && res.type === "basic") {
      const copy = res.clone();
      caches
        .open(VERSION)
        .then((c) => c.put(req, copy))
        .catch(() => {});
    }
    return res;
  };

  e.respondWith(
    caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((hit) => {
      /* navigations prefer the network (fresh edits), falling back to the
         cached shell so the exhibit opens with no network at all.
         The fallback prefers "index.html" over the raw-URL hit: index.html
         is re-cached on EVERY successful navigation, while the raw "/" entry
         is only written at install — preferring the hit would serve a stale
         pre-fix document offline (e.g. without a new security policy). */
      if (req.mode === "navigate") {
        const shell = () => caches.match("index.html").then((ix) => ix || hit);
        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put("index.html", copy)).catch(() => {});
              return res;
            }
            return shell();
          })
          .catch(() => shell());
      }
      /* everything else: answer from cache instantly, refresh behind the
         scenes so the next visit gets the new bytes */
      if (hit) {
        fetch(req).then(revalidate).catch(() => {});
        return hit;
      }
      return fetch(req).then(revalidate);
    })
  );
});
