# Kilumen overworld (dev, local only)

Art is not approved by Gary yet: this lives on the local branch `dev/overworld-v1` only. No remote, no deploy.

## Run
```
cd /workspace/kilumen
python3 -m http.server 8080        # or: npm start
# open http://localhost:8080/            (dev start: Brookhollow, outside the player's house)
#      http://localhost:8080/?debug=1    (collision + warp overlay on load)
#      http://localhost:8080/?debug=1&flags=has_run_shoes,has_bike   (running + bike unlocked)
```
URL params: `map`, `x`, `y`, `facing`, `debug=1`, `zoom=N` (force), `touch=1|0` (force the on-screen D-pad),
`flags=a,b,c` (dev only: story flags from tools/progression.py; there is no save yet).

Controls: arrows / WASD move (tap = turn, hold = walk). Z / Space / Enter = A (read a sign / talk to a gate guard).
Hold X / Shift = B (run, needs `has_run_shoes`, maps with `movement.run`). C / Backspace = Select (bike on/off,
needs `has_bike`, maps with `movement.bike`; no dismount on bike-only boardwalks / `no_dismount` cells).
F3 or ` = debug overlay. Gamepad (standard mapping): D-pad / left stick, A = 0, B = 1, Select = 8 (bike), L3 = 10 (debug).
Touch: on-screen D-pad + A + B + SEL + DBG (shown on coarse pointers or with `?touch=1`).

Movement (MOVEMENT.md): walk 15 ticks/tile (250 ms), run 7.5 (8/7 accumulator), bike 5. Frames advance by distance
travelled, not by time. Bike ramps (code 9) are a one-way 2-tile hop in the ramp's direction; bike-only boardwalks
are code 8. Doors and maps without bike support dismount you (text from text/overworld_lines.json).

Story gates (CRITICAL_PATH.md / world_layout.json): maps ship blocked; `applyGates(flags)` swaps each gate to its
cleared tile + collision on a per-instance copy of the map. Guards / barricades read `blockers.<id>.before|after`.

Not done yet (hooks only, see the header of `src/overworld/overworld.js`): FIELD_SKILLS flooding, water carry,
Skylift flying, Lumen Line train; puzzles; NPC dialogue other than gate guards; save/persistence of flags.

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
- `src/overworld/map.js`: map model, collision queries (walk / ledge / ramp / block / edge), story gates, warp and exit landing rules.
- `src/overworld/movement.js`: `GridMover`, pure fixed-tick grid movement (turn, step, bump, ledge / ramp hop, walk / run / bike) with hooks.
- `src/overworld/camera.js`: integer camera, clamp / centre, zoom choice.
- `src/overworld/tileset.js`, `assets.js`: tileset per zoom (1x/2x/3x), image + JSON loading.
- `src/overworld/renderer.js`: canvas drawing in the kit's draw order; `debug.js`: overlay.
- `src/overworld/overworld.js`: scene (map loading, warps + fade, interaction, frame loop, `window.kilumen` test API).

Rendering rules: integer zoom only (x2 for 1080p, x3 for 1440p), the matching pre-scaled sheet, smoothing off
(re-applied after every resize), camera and sprites on whole native pixels, fixed 60 Hz ticks.
