# Kilumen optional PWA (install + offline). OFF by default

Added Oct 22, 2026 (Grok Bot, free-tools pass). Built with **workbox-build 7.4.1 (MIT)**. Tool deps live in
`tools/free_tools/` so the game's own package.json is untouched.

## How it is switched
- Default: index.html carries one inline loader line. With `PWA_ENABLED = false` and no `?pwa=` in the URL it makes
  **zero extra requests**, so the live game behaves exactly as before.
- `index.html?pwa=1`: loads `pwa/pwa_register.js`, which registers `/kilumen-sw.js` (root scope), points the page at
  `pwa/kilumen.webmanifest` (icons, landscape) and keeps the `beforeinstallprompt` event in `window.kilumenPWA.installPrompt`.
- `index.html?pwa=0`: unregisters the worker, deletes every `kilumen-` cache and reloads once, so the page is no longer controlled.
- To turn it on for everyone: set `PWA_ENABLED = true` in that line of index.html. **That is Gary's call.**

## Build (after any change to src/, text/, index.html, art/ or audio/)
```
cd tools/free_tools && npm ci          # once
node tools/pwa_build.mjs               # from the repo root -> kilumen-sw.js, pwa/sw_build.js, pwa/last_build.json
node tests/pwa_e2e.mjs                 # Playwright Chromium, own free port -> shots/pwa/result.json
```
- Precache (the shell): index.html, style.css, both manifests, src/**/*.{js,mjs,css,json}, text/**/*.json, pwa files.
  About 98 files / 2.1 MB.
- Runtime CacheFirst: `/art/` → `kilumen-<build>-art` (max 3000 entries), `/audio/` → `kilumen-<build>-audio`
  (max 200, range requests supported). Only 200 responses are stored. Caches are dropped if storage quota runs out.
- Versioning: build id = sha1(package version + precache revisions + path/size/mtime of every art/audio file), or
  `BUILD_ID=...`. Every cache name starts with `kilumen-<build>-`. The new worker uses skipWaiting + clientsClaim,
  and its activate step deletes every other `kilumen-` cache.

## Gotchas
- **A stale kilumen-sw.js serves stale code** to opted-in players: precached files are served from cache until the
  worker is rebuilt. Re-run `node tools/pwa_build.mjs` before every deploy while the PWA is in use. The build id
  changes whenever any file changes, so kilumen-sw.js churns in git diffs.
- Opting in sticks: after `?pwa=1` the worker keeps controlling that browser on plain URLs until `?pwa=0`.
- Offline only covers the art and audio already seen online. The shell and code are all precached, but maps and
  sprites never visited are missing. A missing image throws `image failed: …` in the game (seen once for
  `tiles_1x/fog.png` in an offline run).
- A new build takes over on the next online load. A lazy import mid-session can mix versions until reload.
- Test-harness note: when the upgrade test ran *right after* stopping and restarting the web server, Chromium
  activated the new worker without its precache in 3/3 runs (old caches deleted, new precache missing). Running the upgrade
  before the offline step passes every time. The cause was not found; re-check on real devices before enabling.
- Icons are **placeholders** cropped from art/world/key_art_notext.png. See ICONS_PLACEHOLDER.md.
