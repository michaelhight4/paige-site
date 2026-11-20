/* Heldpath service worker: cache the app shell and the offline map pack. */
const VERSION = "heldpath-shell-v11";
const PRECACHE = [
  "./",
  "./index.html",
  "./app.bundle.js",
  "./css/app.css",
  "./css/art.css",
  "./css/stats.css",
  "./css/plans.css",
  "./css/stretches.css",
  "./css/map_download.css",
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
  "./assets/stretches/pd1_bend_and_reach.png",
  "./assets/stretches/pd6_windmill.png",
  "./assets/stretches/pd7_forward_lunge.png",
  "./assets/stretches/pd9_bent_leg_body_twist.png",
  "./assets/stretches/pmcs_ankle.png",
  "./assets/stretches/pmcs_ankle_kneeling.png",
  "./assets/stretches/pmcs_arm.png",
  "./assets/stretches/pmcs_elbow_wrist.png",
  "./assets/stretches/pmcs_hip.png",
  "./assets/stretches/pmcs_hip_supine.png",
  "./assets/stretches/pmcs_knee.png",
  "./assets/stretches/pmcs_lowback_prone.png",
  "./assets/stretches/pmcs_lowback_standing.png",
  "./assets/stretches/pmcs_midback_prone.png",
  "./assets/stretches/pmcs_midback_seated.png",
  "./assets/stretches/pmcs_midback_standing.png",
  "./assets/stretches/pmcs_neck.png",
  "./assets/stretches/pmcs_shoulder.png",
  "./assets/stretches/rd1_overhead_arm_pull.png",
  "./assets/stretches/rd2_rear_lunge.png",
  "./assets/stretches/rd3_extend_and_flex.png",
  "./assets/stretches/rd3_extend_and_flex_standing.png",
  "./assets/stretches/rd4_thigh_stretch.png",
  "./assets/stretches/rd5_single_leg_over.png",
  "./assets/stretches/rd6_groin_stretch.png",
  "./assets/stretches/rd7_calf_stretch.png",
  "./assets/stretches/rd8_hamstring_single_leg.png",
  "./assets/stretches/rd8_hamstring_stretch.png",
  "./maps/firenze_walk.json",
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
