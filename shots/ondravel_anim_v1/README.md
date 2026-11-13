# Ondravel anim v1 — DRAFT (art only, not wired, nothing committed). Needs Gary's approval before Coder wires it.

Rebuild: `python3 _tools/build.py` (~35 s, deterministic, numpy + Pillow). Base art read only:
`kilumen/art/characters/pixel/creatures/ondravel/overworld/ondravel_ow/*_stand.png` (native 64x64 frame, 1 art px = 1 game px, same as mira_chibi etc.;
**not scaled up**), tank glass mask from `wt_wellspire/.../lab_tank_overlays/ovl_ondravel_tank/`, tank tiles from `wt_director_lab` `tiles_1x/wellspire_lab.png`.
Scoring/ToD: `fx_extra/_tools/fxx_lib.py` (grade/lum/ow_bg/PH — same as fishing derby + anim halls); tank uses the lab overlays' readab rule.

## Files (one folder per anim): `<name>.png` sheet (row-major), `<name>.json`, `<name>_preview.gif`. Tank also has `_art1x.png` (use this, draw x2 nearest).
Top level: `contact_sheet.png` (4 key frames x dawn/day/dusk/night per anim), `index.json`.

| anim | frame | frames x ms | loop | covers / collision | night (worst ground) |
|---|---|---|---|---|---|
| ondravel_ow_idle_{down,up,left,right} | 64x64 | 12 x 120 | yes | [0,0] (1x1) | 0.627 / 0.589 / 0.604 / 0.518 |
| ondravel_ow_turn_{down,up,left,right} | 64x64 | 16 x 150 | yes | [0,0] | 0.619 / 0.574 / 0.620 / 0.571 |
| ondravel_reveal | 64x64 | 17 (80/70/90 ms, last 400) | no | [0,0] | 0.641 |
| ondravel_tank_water_loop | 384x320 (art1x 192x160) | 24 x 140 | yes | all 6x5 at tile 12306 | 0.938 |

Night = share of px with |dLuma|>=28 vs the ToD-graded ground, worst of grass_0 / cave_0 / snow_0 / floor_stone (fin_summit_camp floor = grass_0 + cave_*).
Night is the worst phase for every anim; all phases >= 0.5. Per-ground, per-phase numbers + worst frame are in each json.

## Wiring notes (for Coder, after approval)
- **Overworld:** anchor = bottom-centre (32,63) of the frame on the centre-bottom of his map cell. Collision = the single cell (`collision_squares`).
  Play `idle_<facing>`; on approach/interaction `turn_<facing>` is an optional ambient look-around. Turn loops are snap turns between the 4 source facings.
- **Reveal:** one-shot just before the face-off; its last frame == `idle_down` frame 0, so cut straight to `idle_down` (or the battle transition) when it ends.
- **Tank:** tile-overlay on `decoration_fx`, one instance on the map cell of anchor tile 12306 (`wl_bigcrystal_0_0`, ids 12306-12335), frame top-left = cell top-left.
  Layer order suggestion: this water loop, then the existing `ovl_ondravel_tank` (motes/caustics), then Ondravel's sprite. Hide it when the map swaps to the
  broken tank (12362, flag `fin_released`) — **no broken-tank water loop made**; the existing `ovl_ondravel_tank_broken` covers that state.
  Phase rule same as the other lab overlays (offsets in json). Night-glow colours (fcf6e8 is not one; only palette check) -> lit LUT, rest sprite LUT.
- **Phone cost:** each anim is 1 drawImage per frame; overworld sheets 192-279 KB RGBA; tank art1x 3.0 MB RGBA (12.3 MB at game px — use art1x). ~1-5% opaque px on the tank.
- All px palette-only (`art/palette/kilumen.hex`), alpha 0/255 (asserted at build). Tank px all inside the glass mask (asserted).

## Concerns for Gary
1. **Colour shift:** to pass night on the summit grass/cave floor the body ramp is spread one step (`RAMP_SPREAD` in build.py: 7ac2e8->c6ecfa, 4692ce->7ac2e8,
   4a70ba/2c64a8/30488c->1e4078, 54444e->3e3a48). Same hues and shapes, but he reads paler/icier and higher-contrast than the current ow sheet and battle art.
   With the original colours night is 0.44 on grass_0 and 0.26 on cave_0 (fail). If Gary prefers the old look, the ow sheet would also need the same fix.
2. Existing walk sheet (`ondravel_ow_sheet.png`) is NOT recoloured — if this is approved, walk frames should get the same RAMP_SPREAD for consistency.
3. Turns are snap turns (no diagonal source poses); idle_right on floor_stone is 0.518 (borderline, not a summit ground). Reveal ring frames' worst frame 0.49 on stone.
4. Tiles at summit were taken from `wt_wellspire` fin_summit_camp.json; if the face-off map changes ground, re-run the score.
5. Aseprite / Pixel Composer / JuiceFX not used (no clear gain for palette-locked px moves; JuiceFX has no batch). No third-party code adopted:
   checked spritekiln (MIT), sprite-animator (MIT), sprite-gen (Apache-2.0), soulfir/sprite-generator (MIT) — all generate/redraw characters, which would break on-model.
   Bubble/rising helpers adapted from our own `lab_tank_overlays/_tools/build_overlays.py`.

## Walk sheet recolour — `ondravel_ow_walk_recolor/` (DRAFT, Oct 30 2026; game repo untouched)
Rebuild: `python3 _tools/build_walk_recolor.py` (~2 s). Imports `RAMP_SPREAD`, `remap` and `score_ow` straight from `build.py` (top part only, no idle rebuild), so the mapping can't drift.
Source (read only): `kilumen/art/characters/pixel/creatures/ondravel/overworld/ondravel_ow_sheet.png` (byte-identical to the `wt_r58` copy; wt_r58's `ondravel_ow/` only has 4 right_walk `_2x` files).
- `ondravel_ow_sheet.png`: 320x256, same layout as the original. Rows = down, left, right, up (checked against the per-frame pngs). Col 0 = stand, cols 1-4 = walk0-3 (movement.js `frame()`). Native 64 px, alpha identical to the source, palette only.
- `ondravel_ow_sheet.json`: layout, mapping, source sha256, per-ground/per-phase scores, idle-match check. `ondravel_ow_walk_{dir}_preview.gif` (4 walk frames x 150 ms, native size). `contact_sheet_before_after.png`: before/after x dawn/day/dusk/night on grass_0.
- Night (walk0-3, worst ground mean / worst single frame): down 0.617/0.616, left 0.606/0.600, right 0.522/0.517, up 0.599/0.588. All >= 0.5.
- Idle match: the recoloured stand col is pixel-identical to `idle_<dir>` frame 0 in all 4 directions, and the walk frames use no colour that the idle sheets don't use.
- Concerns: right is borderline (0.517, the same side that is weakest in idle, 0.518). The `_2x`/`_3x` sheets and gifs in the game folder are NOT recoloured. If approved, the Coder should regenerate them, plus any warmth tint mask (`masks/ondravel/overworld/ondravel_ow_sheet.png`). The mapping is not a strict one-step shift: 4a70ba, 2c64a8 and 30488c all merge into 1e4078, so some mid-dark shading detail is lost (same as idle).
