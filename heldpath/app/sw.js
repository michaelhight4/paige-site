/* Heldpath service worker: cache the app shell and the offline map pack. */
const VERSION = "heldpath-shell-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./app.bundle.js",
  "./css/app.css",
  "./vendor/maplibre-gl.css",
  "./manifest.webmanifest",
  "./assets/app_icon.png",
  "./assets/app_icon_fg.png",
  "./assets/app_icon_192.png",
  "./assets/app_icon_512.png",
  "./assets/art_header.png",
  "./assets/art_support.png",
  "./assets/icon_walk.png",
  "./assets/icon_run.png",
  "./assets/icon_pin.png",
  "./assets/icon_history.png",
  "./assets/icon_settings.png",
  "./assets/icon_support.png",
  "./maps/firenze.pmtiles",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
