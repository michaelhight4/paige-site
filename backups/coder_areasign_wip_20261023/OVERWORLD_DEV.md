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
node --test tests/soul.test.mjs        # soul pass: line picker (v0.4.1), save, clock, Warmth stages
node tests/soul_pass_shots.mjs         # soul pass: spots, bin, time of day, Warmth, NPCs, portraits, prints, seams, every map + warp
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

## Soul pass v1 (local only: art unapproved by Gary)
Text, save, time of day, Warmth and NPC sprites. Data comes from `text/overworld_lines.json` (v0.4.1),
`art/world/overworld/time_of_day/grades.json`, `art/characters/pixel/npcs/npc_sprite_map.json` and
`art/characters/pixel/warmth/warmth_tints.json`.
- Save: `localStorage` `kilumen.save.v1` plus a `.bak` copy. It holds flags, the counters `office_display_taps` and
  `bin_inspects_after_8`, seen lines, the clock, the party (Warmth) and the position. It saves on any change, at the
  end of a warp or script, every 60 s and on pagehide. `?save=0` turns persistence off, `?reset=1` wipes the save,
  and `?flags=` still adds dev flags on top of the save.
- Lines (`src/overworld/lines.js`): the first line whose flags are all set and whose `when` matches wins. Lines
  marked `pending_story_call` are skipped. `bin_ron` lines must match the bin tile stage. `weekday` never matches yet.
  Placeholders are `{player}`, `{coins}`, `{lead}`, `{nick}` and `{rt_number}` (`config.rtNumberPlaceholder`
  until catalogue numbers exist). Ron's nicknames are behind `config.ronNicknames` (off). Text APIs for later
  passes: `ronBattleOpener(id)`, `vaneLine()`, `catalogueText(key)`, `comfortText(path)`, `ronNickname()`.
  The house_2f PC opens `company_inbox`; B closes it. Signs in `signs_awaiting_world_id` are not wired yet.
- Interact spots and triggers: map `interact_spots` give the geometry and lines give the text. Spots cover the 14
  props, `window_N` and the `bridge_mid` walk-on trigger (once per in-game day). The bed asks Yes/No (nap or dream);
  the sofa gives Warmth.
- Ron's bin: tile `bin_ron_<coins>` (0-8), flies from stage 6, `bin_ron_empty` after `finale_done`.
- Time of day: 1 real minute = 1 game hour (dawn 5-7, day 8-16, dusk 17-19, night 20-4). Outdoors is graded with
  the map palette and the LUT for sprites (day = identity). Tiles get the no-lights grade everywhere; only pixels in
  the emissive masks (`time_of_day/emissive/*.png`, generated from `EMISSIVE` in `tools/time_of_day.py`: lamp heads,
  lanterns, lit windows, crystals, fires) use the lit grade. Glow is never chosen by colour; to make a tile glow, add
  it to `EMISSIVE` and re-run the tool. Interiors and caves (`clock.js` `INDOOR_OR_CAVE`, the one list; `living.js`
  reuses it) stay on day, while window tiles follow the outdoor phase. Dev params: `?hour=22`, `?phase=night`,
  `?timescale=0` (freeze).
- Warmth: the lead follows the player using its overworld sheet. The stage is 0/1/2/3 at <25/<50/<75/75+, and the
  mask-only exact-hex swap keeps alpha (stage 0 = identity, tints cached). Dev: `?lead=rillop&warmth=80&nick=Bubbles`.
- Footprints: sand, mud and snow ground leaves prints that fade after about 4 s (max 24). The bike leaves none.
- NPCs: 64x96 sheets from the sprite map. Villagers wander and trainers look around. Trainers challenge with the
  battle sprite; dialogue shows portraits where the map has them.
- Shots: `shots/soul_pass_v1/`.
- Living world (`src/overworld/living.js`, `LivingWorld` as `scene.life`): unseen cloud shadows plus ambient life,
  all driven by one wind (`WIND`). It runs outdoors only, using the full `INDOOR_OR_CAVE` rule.
  - Clouds: a seeded, wrapping fBm mask (768² cells × 2 native px, 1536 px period) drifts 8 native px per game
    minute. Its colour is the phase's `grade.shadowDst`. Alpha is 56 at day, 35 at dawn and dusk, and 0 at night,
    stepped in eighths.
    It is drawn as 32-cell chunks of a cached image with the alpha already baked in: empty chunks are skipped and
    globalAlpha is never used. Non-emissive sprites use the character `'lut'` grade.
  - Coverage comes from `?weather=clear|fair|cloudy|overcast|rain` (default `fair`) or
    `scene.life.setWeather()`. There is no weather system yet.
  - Life: fish shadows with ripples (`ambient.fish_spots`), butterflies by day and fireflies by night (emissive,
    ungraded), bird flocks with ground shadows (`scene.life.spawnBirds(n)`), chimney smoke and wind motes.
  - Toggles: K turns clouds on or off and L turns life on or off (both saved in `kilumen.settings.v1`). URL
    overrides: `?clouds=0|1`, `?life=0|1`, `?motion=reduce|full`. prefers-reduced-motion slows clouds and
    disables birds and motes. The F3 HUD has a `life` line.
  - Draw hooks are in `Renderer.draw` (under / over / top). Previews: `node tests/life_previews.mjs 8097` writes to
    `_previews/living_world/`. Perf: `node tests/life_perf.mjs 8097 <label> [extraQuery]`.

## Platform profiles (DRAFT, local only, Oct 22, 2026)
Gary: "make coder have a mobile and pc set up independtly". `src/platform.js` picks `pc` or `mobile` once at start-up
(mobile on `(pointer: coarse)` or a touch-capable device; `?platform=pc|mobile` overrides, `?touch=1` = mobile, `?touch=0` = pc),
loads `src/platform/<id>.json`, sets `body.platform-<id>` and the CSS variables, and exposes `window.kilumen.platform = {id, profile}`.
Each file holds its own zoom table (PC 1440p = `zoom.zoom1440p`, 3x, undecided), camera rules, HUD/dialogue offsets and controls.
Tune a platform only in its own file. Checks: `node --test tests/platform.test.mjs`, `node tests/platform_shots.mjs`, `python3 tests/platform_contact_sheet.py`.
