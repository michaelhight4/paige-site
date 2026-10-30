# Kilumen – Gullhaven lagoon fishing derby FX (DRAFT, art only, not wired)

Built Fri Oct 30 2026 (CT) by `_tools/derby.py` (`python3 _tools/derby.py`, about 2 s). No game repo files were changed, and nothing was committed or pushed.

## Files
| group | anim | squares (64 px) | frames | playback | json |
|---|---|---|---|---|---|
| cast | crystal_cast | 4x2 | 12 | one-shot | cast/crystal_cast.json |
| bobber | bobber_idle | 1x1 | 6 | loop | bobber/bobber_idle.json |
| bobber | bobber_nibble | 1x1 | 6 | one-shot | bobber/bobber_nibble.json |
| bobber | bobber_bite (splash + pull-under) | 1x1 | 9 | one-shot | bobber/bobber_bite.json |
| bobber | bite_exclaim | 1x1 | 6 | one-shot, hold last | bobber/bite_exclaim.json |
| reel | line_tension | 4x1 | 6 | loop | reel/line_tension.json |
| reel | reel_spray | 1x1 | 6 | loop | reel/reel_spray.json |
| reel | fish_breach | 2x2 | 8 | one-shot | reel/fish_breach.json |
| reel | catch_flash | 2x2 | 7 | one-shot | reel/catch_flash.json |
| scale | scale_needle | 2x2 | 12 | one-shot, hold last | scale/scale_needle.json |
| scale | readout_pop | 4x1 | 5 | one-shot, hold last | scale/readout_pop.json |
| scale | weight_glyphs | 1x1 each | 12 | glyph atlas | scale/weight_glyphs.json |
| scale | new_record_burst | 3x3 | 10 | one-shot | scale/new_record_burst.json |

Each anim has `<name>_sheet.png`, `<name>.json` and `<name>_preview.gif` (on its QA background). There is also `index.json` (all scores), plus `overview.png` (key frames × dawn/day/dusk/night, with the score on each panel).

## JSON fields
`frame_w/frame_h` (native px, always whole 64 px squares), `frame_count`, `ms_per_frame` (list, one entry per frame), `total_ms`, `playback` (`loop` / `one-shot` / `glyph_atlas`), `anchor` (native px inside the frame, with art px and a note), `frames[]` rects (x, y, w, h, ms), `sheet_layout`, `readability` per phase, and `emissive_hint`.

## Wiring notes
- Draw with nearest-neighbour filtering at integer zoom (the same as tiles, with `image-rendering: pixelated`). Frames were authored at 16 art px per square and scaled ×4.
- Place each frame on the square grid. The anchor is only for lining frames up with gameplay points (rod tip, bobber waterline).
- **Sequence:** crystal_cast (the lure lands at art (54,22) = square column 3, row 1 of the cast frame) → bobber_idle loop → random bobber_nibble → bobber_bite + bite_exclaim (one square above the bobber) → line_tension + reel_spray loops while reeling → fish_breach → catch_flash → turn-in: scale_needle → readout_pop → glyphs → new_record_burst if it's a record.
- **line_tension** runs from the rod tip (left) to the water (right). Use `scaleX=-1` when facing left. For longer casts, repeat or stretch it in whole squares.
- **fish_breach** uses an original generic lagoon fish. From frame 6 you can swap in the hooked creature's sprite.
- **Weight readout:** glyph frame order is `0 1 2 3 4 5 6 7 8 9 . kg`. Advance is 12 art px (48 native) for digits, 8 (32) for `.` and 14 (56) for `kg`. Start the glyphs on readout_pop frame 3 (the plate fits 5 glyphs). Example: "12.4kg" = frames 1,2,10,4,11.
- **Needle:** the frames settle at a generic +5°. If the needle should point at the real weight, either hold frame 11 and draw a 1 px needle in code, or have Coder ask for per-weight end frames.
- **Night:** the sheets pass ≥0.5 with the plain sprite grade (no glow). `emissive_hint:true` marks pieces (crystal lure, sparkles, flash, burst, exclaim) that could also use the `lit` grade map, per grades.json "glow comes from where a pixel is".
- **Phones / 60 fps:** sheets are at most 2048 px wide (crystal_cast is 2048x256 and is the largest, about 2 MB RGBA in VRAM; the rest are under 1 MB). Every frame is ≥40 ms, so nothing needs per-frame CPU work beyond a `drawImage` sub-rect blit. No alpha blending (1-bit alpha), no runtime tinting or rotation. Peak on screen during reeling is 3 small blits.

## Style rules used
- Palette: `art/palette/kilumen.hex` only (asserted per frame), alpha 0/255 only.
- Dark `1a1226` 1 px outline, like the existing fx.
- Key light from the upper-left (highlights top-left, shade bottom-right). Water rings use an ellipse y-ratio of 0.57 (≈35° from above).
- Crystal violet ramp for the crystal lure and sparkles.

## Readability (halls rule: share of FX px with |ΔLuma| ≥ 28 vs the graded background, sprite grade, per phase; pass ≥ 0.5)
See index.json. Night is the lowest phase for every sheet. The lowest scores are bobber_idle 0.591 and readout_pop 0.547.

## Credits / reused code
- In-house (read-only imports): `kilumen/art/characters/pixel/fx_extra/_tools/fxx_lib.py` (grade, lum, ow_bg, PH, save_preview). The scoring rule comes from `kilumen_anim_halls/_tools/build.py`.
- NumPy (BSD-3-Clause), Pillow (MIT-CMU/HPND, permissive). These are tool-only and ship nothing.
- All art and the 4x7 digit font are original and drawn in code. No third-party art was used.
