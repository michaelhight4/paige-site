# Wellspire flashback lab: tank particle overlays (Kilumen). DRAFT, not wired

Base art: Director's lean redraw, branch `director/wellspire-lab-art` @ `0e49765a` (Director pushed this on top of the requested ccfcb775 at 1:03 AM CT; it widens the 1x2 tanks, and tank ids are unchanged) (worktree /workspace/wt_director_lab), used **read only**.
Generator: `python3 _tools/build_overlays.py` (~50 s, deterministic, numpy + Pillow, reuses fxx_lib grade/lum read-only).
The glass masks come from re-running Director's `lab_props_lean.py` drawing in-process with a "last writer" hook. The re-rendered tiles match
`tiles_1x/wellspire_lab.png` pixel for pixel (100% for all 26 tile shapes), so the masks line up exactly.

Per overlay folder: `<name>.png` (64-px-tile game sheet), `<name>_art1x.png` (native 32-px-per-tile art, the light option: draw x2 nearest),
`<name>_glassmask_art1x.png`, `<name>.json` (frame_w/h, frames, cols, rows, ms[], loop, footprint, tile_ids, anchor, phase offsets, readability, seam),
`<name>_preview.gif` (3 instances over the real tank tile at phase offsets 0, 5n/8, n/4), and `contact_sheet_<name>.png`
(all frames over the tile, tile + glass mask, key frames x dawn/day/dusk/night). Top level: `overview.png`, `index.json`.

## Wiring note
**Tile id -> overlay** (`tileset_arena.json`, category wellspire_lab). Spawn ONE overlay instance per tank, on the map cell of its `_0_0` tile (the anchor tile).
The other tile ids of the footprint get no instance of their own.

| anchor tile id (all ids in footprint) | tile name | overlay | footprint | room / tint |
|---|---|---|---|---|
| 12248 (12248-12249) | wl_tank_cyan_0_0 | ovl_tank_cyan | 1x2 | 04 tanks, blue water |
| 12250 (12250-12251) | wl_tank_amber_0_0 | ovl_tank_amber | 1x2 | 05 amber |
| 12252 (12252-12253) | wl_tank_green_0_0 | ovl_tank_green | 1x2 | 06 growth, green |
| 12254 (12254-12255) | wl_tank_violet_0_0 | ovl_tank_violet | 1x2 | not placed in any map yet |
| 12256 (12256-12261) | wl_bigtank_cyan_0_0 | ovl_bigtank_cyan | 2x3 | 04 tanks, blue |
| 12262 (12262-12267) | wl_bigtank_green_0_0 | ovl_bigtank_green | 2x3 | 06 growth, green |
| 12268-12276 (every slice) | wl_vat_green_{nw,n,ne,w,c,e,sw,s,se} | ovl_vat_green, sheet row = `slice_rows[slice]` | 1x1 per tile | 07 vats, green |
| 12277-12285 (every slice) | wl_vat_cyan_* | ovl_vat_cyan | 1x1 per tile | not placed |
| 12306 (12306-12335) | wl_bigcrystal_0_0 | ovl_ondravel_tank | 6x5 | 10 Ondravel, blue + violet |
| 12362 (12362-12391) | wl_bigcrystal_broken_0_0 | ovl_ondravel_tank_broken | 6x5 | 10, after `fin_released` |

- **Layer:** `decoration_fx`. Draw right after the decoration tile layer and before the y-sorted sprites and the `overlay` layer. In room 10, Ondravel's
  sprite draws ABOVE `ovl_ondravel_tank`. Swap to `_broken` on the same `fin_released` flag the map's `flag_swaps` use (anchor cell (5,3)).
- **Anchor:** frame top-left = top-left px of the anchor tile's map cell: (x0*64, y0*64). Frame size = footprint x 64 exactly. For a bottom-centre anchor
  like the other flashback anims, `anchor_bottom_centre` is in the json.
- **Phase offset:** one global anim clock. `frame = (floor(t_ms/ms) + phase_offsets_frames[(7*x0 + 3*y0) % 6]) % frames`, where x0,y0 = anchor cell.
  The json has 6 offsets (0, 5n/8, n/4, 7n/8, n/2, 3n/8), so neighbouring tanks never pulse together. You don't need extra sheets. Vats use the
  same rule per tile, so each slice gets its own offset.
- **Phones:** use the `_art1x` sheets at x2 nearest (`imageSmoothingEnabled=false`). Each instance is one drawImage call. RGBA texture: small tank 128 KB,
  big tank 384 KB, vat 432 KB (9 slices), Ondravel 4.9 MB (192x160 x 32 f; 19.7 MB at game px, so **use art1x**), broken 2.4 MB.
  All sheets are <= 4096 px wide. The overlays are 1-5% opaque px (Ondravel tank ~4.7k game px/frame).
- **Emissive:** px in the 8 night-glow colours use the lit LUT, the rest use the sprite LUT (same as the other flashback anims).

## QA (all asserted at build: palette-only, alpha 0/255, every px inside the glass mask, art1x x2 == sheet)
| overlay | frames x ms | night readability mean / worst frame (all phases >= this) | seam |
|---|---|---|---|
| ovl_tank_cyan | 16 x 110 | 0.662 / 0.607 | 0.92 |
| ovl_tank_amber | 16 x 110 | 0.821 / 0.737 | 0.95 |
| ovl_tank_green | 16 x 110 | 0.861 / 0.774 | 0.84 |
| ovl_tank_violet | 16 x 110 | 0.670 / 0.621 | 0.96 |
| ovl_bigtank_cyan | 16 x 120 | 0.672 / 0.612 | 0.93 |
| ovl_bigtank_green | 16 x 120 | 0.897 / 0.871 | 0.88 |
| ovl_vat_green | 12 x 130 | 0.687 / 0.625 | 1.00 |
| ovl_vat_cyan | 12 x 130 | 0.980 / 0.846 | 1.00 |
| ovl_ondravel_tank | 32 x 150 (4.8 s) | 0.909 / 0.888 | 0.94 |
| ovl_ondravel_tank_broken | 16 x 120 | 0.879 / 0.860 | 1.00 |

How readability is measured: the share of overlay px with |dLuma| >= 28 against the ToD-graded tank tile under them. The tile is snapped to the palette first,
because the lab tiles are free RGB and the tile grade is keyed by palette colour. Night is the worst phase everywhere.
Seam = wrap-frame diff / max inner diff (<= ~1.15 means no pop). Every motion has an integer number of cycles per loop.

## Weak spots / for Gary
- Cyan/blue tanks score lowest (0.66). Light bubbles on bright cyan glass lose contrast at night, so the dark specks and 1-px dark shadow carry the read.
- The night score is approximate because the tile is snapped to the palette before grading. It has not been checked in the real engine.
- Ondravel caustics are small light ripple blobs in two bands (under the surface and the floor), not full projected caustic nets. The swirl turns 1/6 rev per loop,
  so it reads as slow motion only in the GIF, not in stills.
- Broken-tank mist is a sparse solid stipple band over the puddle (no alpha). It can look a bit like noise up close.
- Vats: each slice is self-contained, so bubbles don't cross tile edges (top-down vat, so it reads fine).
- The violet tank and the cyan vat are in the tileset but no map uses them. Their overlays were made anyway.
- I didn't use Aseprite: there are no .aseprite files yet. If you want them, run kil_fx_build.lua on Gary's PC over the sheets + json.
- Not wired, and there was no in-engine fps run. The perf figures are texture and px counts only.
