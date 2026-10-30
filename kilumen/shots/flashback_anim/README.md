# Wellspire ending anims (Kilumen) — DRAFT, not wired

Built by `_tools/build.py` (deterministic; numpy + Pillow; reuses `fxx_lib.grade/lum` read-only from /workspace/kilumen).
Rebuild: `python3 _tools/build.py` (~30 s). Nothing in /workspace/kilumen was changed.

Ondravel stays on-model: every Ondravel frame is the approved battle art `art/characters/pixel/creatures/ondravel/battle/ondravel_front_128.png`
moved by whole art px only (float, 1-px breath squash of the upper body, forehead crystal from make_sprite.py, 1-px emissive violet rim).

| anim | frame px | frames | ms | mode | footprint (64-px tiles) | night read (mean / worst frame) |
|---|---|---|---|---|---|---|
| ondravel_tank_idle | 320x384 (x2 art) | 12 | 110 | loop | 5x6 | 0.644 / 0.640 |
| ondravel_tank_release | 320x384 | 21 | 300,140x3,70,80x7,100x3,120x5,900 | one-shot | 5x6 | 0.628 / 0.557 |
| ondravel_summit_tower | 576x576 (x4 art) | 8 | 140 | loop | 9x9 | 0.603 / 0.523 |
| wellspire_cloud_split | 384x192 (x2) | 14 | 260,120,90,80x9,160x2 | one-shot | screen layer | 0.876 / 0.826 (min phase 0.644 day) |
| wellspire_sky_open_loop | 384x192 | 8 | 150 | loop | screen layer | 0.829 (min phase 0.677 day) |
| lab_specimen_tank | 64x128 | 8 | 140 | loop | 1x2 | 0.855 |
| lab_helix_column | 64x192 | 12 | 90 | loop | 1x3 | 0.817 |
| lab_misting_vat | 128x64 | 10 | 120 | loop | 2x1 | 0.734 |

Per anim folder: `<name>.png` (game-px sheet, grid `cols x rows`, row-major), `<name>_art1x.png` (same sheet at native art px — the light option),
`<name>.json` (frame_w/h, frames, cols, rows, ms[], loop/mode, footprint_tiles, anchor, readability per phase, seam_ratio, gridfit, texture bytes),
`<name>_preview.gif`, `contact_sheet_<name>.png` (all frames + key frames x dawn/day/dusk/night). Top level: `overview.png` (frame 0 day vs night), `index.json`.

## Wiring notes
- **Use the `_art1x.png` sheets on phones** and draw with `imageSmoothingEnabled=false` at `art_px_scale` (2 or 4). Same pixels (asserted), 4x/16x less
  texture memory: summit 18.6 MB -> 1.2 MB RGBA, release 11.8 -> 2.9 MB. All sheets are <= 4096 px wide (multi-row grid).
- Anchor = bottom-centre of the frame (feet / base line). Props: bottom-left of the footprint = map cell (x, y+h-1).
- Emissive: pixels in the 8 night-glow colours (fcd668 e8ce92 ecdec4 f8eabe 603096 8a4ace b076ec d6acff) use the lit LUT, the rest the sprite LUT
  (draw order: palette swap -> ToD grade). Build an emissive mask once per sheet by colour, or mark the whole cutscene layer `lit`.
- Scene flow: `ondravel_tank_idle` (loop) -> on "free him" play `ondravel_tank_release` once (hold last frame) -> crossfade/cut to OW
  `ondravel_big_sheet.png` row 1 (awake). Summit: show `ondravel_summit_tower` loop; trigger `wellspire_cloud_split` once, whose last frame == frame 0 of
  `wellspire_sky_open_loop`, then loop that behind the Guardian until the battle starts.
- Clock: use one global anim clock (frame = floor(t/ms) % frames) so props in the same lab stay in phase; offset per instance for variety if wanted.
- Shadows: none baked (rule: depth pass draws contact shadows; no alpha < 255 anywhere).
- Sky layer is opaque; put it on the backdrop canvas, below sprites.

## QA
- Palette-only, alpha 0/255: asserted at build. 1x art sheet x scale == game sheet: asserted.
- Readability: sprites/props = share of px with |dLuma|>=28 vs graded floor (3e3a48 lab, a8a0a4 summit rock) under them; opaque sky layers =
  colour-change neighbour pairs (halls lesson). Every frame >= 0.5 in all 4 phases (worst 0.523, summit night).
- Seams (loops): wrap diff / max inner frame diff: tank 1.12, summit 0.04, sky 1.03, specimen 1.02, helix 0.91, vat 0.82 (<= ~1.15 = no visible pop).
- Grid fit (frame 0 alpha fill per tile): specimen 0.91/0.92, helix 1.0x3, vat 0.68/0.67 (droplet zone above the vat is open), tank/summit are
  cutscene pieces filling the full canvas width and base row.

## Weak spots / for Gary
- Summit sprite is the battle art scaled x4 (chunky 4-px pixels), not a redrawn big model; the checklist prefers redraws for size variants.
- Misting vat: Gary's no-smoke rule (and fog only as outdoor weather) means the "mist" is cold-vapour droplets, not puffs. Say if you want real mist.
- Tank water is teal (3e9c92) so blue Ondravel separates from it; blue water read too flat at night.
- Release: water drain is a stepped level drop + spill sheets, no splash particles; shards are rectangles. Ondravel has no new poses (no head-turn/roar) —
  all life comes from float, breath, crystal and aura; a hand-drawn roar frame would add the most soul.
- Readability metric is on flat floor colours, not real lab/summit tiles (those maps aren't final in this worktree).
- Not wired, no in-game perf run; texture numbers only.
