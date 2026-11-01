# Ondravel — summit giant idle (DRAFT, art only, not wired, nothing committed)
Rebuild: `python3 _tools/build.py` (~10 s, deterministic; numpy/scipy/Pillow). Needs Gary's approval before anyone wires it.

## Files
| file | what |
|---|---|
| `ondravel_summit_giant_idle.png` (+`.json`, `_preview.gif`) | giant + rear cloud bank. 6 frames, horizontal strip 1344x352, frame **224x352** (7x11 tiles @32 px) |
| `ondravel_summit_cloud_overlay.png` (+`.json`, `_preview.gif`) | front cloud bank + parting wisps. Same 6 frames / 224x352 / timing |
| `ondravel_summit_combined_preview.gif` | both layers together (preview only) |
| `preview.png` | 2x zoom: rows = frame 0 / frame 3; cols = dawn, day, dusk, night over fin_summit_camp (wt_wellspire map, rendered with fxx_lib tiles), + a **sunset mood** panel (palette-only sunset sky / sea of clouds, after Gary's ref — preview only, not an asset) |

Timing: 6 x 300 ms = 1.8 s, loop. Breath: head/antlers/mane lift 0,1,2,3,2,1 px; chest widens 1 px; clouds part 0..3 px (upper wisps 0..6). Anchor (both): bottom-centre (112,351); same frame index on both layers.

## Layering (back -> front)
1. Sky / summit backdrop
2. **`ondravel_summit_giant_idle`** — Ondravel plus the rear cloud bank that sits *behind* his shoulders.
3. **`ondravel_summit_cloud_overlay`** — in FRONT of the giant: hides his lower body and the wisps pass in front of his shoulder line.
4. Summit ledge foreground, player, NPCs, UI — in front of everything above.
Always advance both layers on the same clock (same frame index) or the bank seam at y≈280 will tear.

## Design
Front-facing (like battle front / ow idle_down): brown antler crown, shaggy lion-style mane of clumped locks, long elk muzzle, pale eyes, forehead crystal, diamond crystal facets on the shoulders.
Icy colours only from the approved RAMP_SPREAD outputs (1e4078 / 7ac2e8 / c6ecfa / fcf6e8 + 342842/3e3a48 darks); none of the pre-spread mids (asserted).
Key light upper-left (form shading). Sunset back-light = solid rim px *inside* the 1a1226 outline: fcd668 on top/right-facing edges, eea23c lower down, broken e29d40 second row and a dashed rim on the left. Clouds: per-puff shading + ordered (Bayer) dither, gold crest px, 827a84 underside. Every px palette-only, alpha 0/255 (asserted at build). Nothing is resized; every frame is redrawn from shapes at 1 art px = 1 game px.

## Night readability (ondravel_anim_v1 `score_ow`, imported; |dLuma|>=28 vs ToD-graded ground, sprite LUT)
| layer | grass_0 | cave_0 | snow_0 | floor_stone | on fin_summit_camp backdrop |
|---|---|---|---|---|---|
| giant | 0.777 | 0.600 | 0.712 | 0.508 | 0.508 |
| overlay | 0.924 | 0.959 | **0.055** | **0.075** | 0.959 |
| combined | 0.838 | 0.760 | **0.453** | **0.354** | 0.673 |
Summit ground is grass_0 + cave_* -> passes. Pale clouds over snow/stone fail by nature (white on white); those aren't summit grounds.

## Phone cost
Each layer: 1 drawImage per frame. RGBA in memory 1344x352x4 = **1.80 MB per sheet** (3.6 MB both); if the GPU pads to power-of-two: 2048x512 = 4.0 MB each. PNG on disk is small (see json). If memory is tight, put the 6 frames in a 3x2 grid (672x704 -> 1024x1024 pow2, same 4 MB) or drop to 4 frames.

## Concerns
1. Scale: brief asked 32 px tiles; the overworld draws cells at 64 px, so on the map he is 3.5x5.5 cells — check that's "towering" enough; a 64-px-tile version would mean redrawing at 448x704 (7 MB/sheet).
2. Night on the camp backdrop for the giant alone is borderline (0.508); floor_stone too (0.508).
3. Rim light is a back-light that ignores ToD (at night it grades down with the sprite LUT; it may look odd at night/day — maybe hide or swap to c6ecfa moonlight rim off-sunset).
4. Mane is procedural locks — reads lion/elk but less hand-crafted than the battle sprite; a hand pass in Aseprite on the face (eyes, muzzle) would help. Aseprite not used.
5. Cloud puffs show regular arcs (scale-like); a hand pass to break the rhythm is recommended.
6. ondravel_anim_v1/_tools/build.py no longer runs as-is: its tank block reads /workspace/wt_director_lab (missing). This build imports only its helpers + scorer (tank block skipped).
7. Third-party code: checked pyxelate (MIT, image->pixel converter; would be resampling), Python-Clouds / procedural-art (MIT, Perlin noise -> soft gradients/haze). None fit solid-pixel, palette-locked hand-shape work; nothing adopted.
