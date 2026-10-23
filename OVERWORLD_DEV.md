# Kilumen overworld (dev, local only)

Art is not approved by Gary yet: this lives on the local branch `dev/overworld-v1` only. No remote, no deploy.

## Run
```
cd /workspace/kilumen
python3 -m http.server 8080        # or: npm start
# open http://localhost:8080/            (dev start: Brookhollow, outside the player's house)
#      http://localhost:8080/?debug=1    (collision + warp overlay on load)
```
URL params: `map`, `x`, `y`, `facing`, `debug=1`, `zoom=N` (force), `touch=1|0` (force the on-screen D-pad).

Controls: arrows / WASD move (tap = turn, hold = walk). Z / Space / Enter = A (read a sign you face).
F3 or ` = debug overlay. Gamepad (standard mapping): D-pad / left stick, A = button 0, Back/Select = debug.
Touch: on-screen D-pad + A + DBG (shown on coarse pointers or with `?touch=1`). B (X / Shift) is read but not wired.

## Tests
```
node --test tests/overworld.test.mjs   # npm test: data + logic (no browser)
node tests/shots.mjs                   # npm run shots: headless Chromium, real key input, screenshots
```
`npm install` once for the Playwright devDependency (uses the cached Chromium in ~/.cache/ms-playwright).

## Layout
- `index.html`, `style.css`, `src/main.js`: page, canvas, toast, touch pad, URL params.
- `src/config.js`: asset paths, dev start.
- `src/overworld/constants.js`: tile size, collision codes, directions, movement modes and timings.
- `src/overworld/map.js`: map model, collision queries (walk / ledge / block / edge), warp and exit landing rules.
- `src/overworld/movement.js`: `GridMover`, pure fixed-tick grid movement (turn, step, bump, ledge hop) with hooks.
- `src/overworld/camera.js`: integer camera, clamp / centre, zoom choice.
- `src/overworld/tileset.js`, `assets.js`: tileset per zoom (1x/2x/3x), image + JSON loading.
- `src/overworld/renderer.js`: canvas drawing in the kit's draw order; `debug.js`: overlay.
- `src/overworld/overworld.js`: scene (map loading, warps + fade, interaction, frame loop, `window.kilumen` test API).

Rendering rules: integer zoom only (x2 for 1080p, x3 for 1440p), the matching pre-scaled sheet, smoothing off
(re-applied after every resize), camera and sprites on whole native pixels, fixed 60 Hz ticks.
