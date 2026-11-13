# fx_extra / item_pickup

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Overworld item pickup FX (MECHANICS_PARITY F18): supply satchel prop, pickup open, hidden-item sparkle. Original soft drawstring supply bag with a violet crystal toggle bead (no ball/orb motif, no case/briefcase shape).

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `satchel_idle` | 64x64 | 4 | 2070 | True | mask | [0, 0] - top-left of the item tile (64x64, prop sits bottom-centre) |
| `pickup_open` | 64x96 | 9 | 710 | False | mask | [0, 32] - canvas (0,32) = top-left of the item tile; 32 px headroom above |
| `hidden_sparkle` | 16x16 | 8 | 560 | False | all | [8, 8] - centre; draw at tile px (32,40) + jitter |

Per-frame ms, rects and full anchor text are in `item_pickup.json`.

## Hooks (code side)

```json
{
 "hidden_hint": {
  "period_ms": 6000,
  "period_jitter_ms": [
   -800,
   800
  ],
  "radius_tiles": 2,
  "distance": "chebyshev",
  "offset_jitter_px": [
   -4,
   4
  ],
  "at_tile_px": [
   32,
   40
  ],
  "stop_when": "picked up or player > 2 tiles"
 },
 "pickup": {
  "text_frame": 4,
  "collision_off_frame": 7,
  "sfx_frame": 2,
  "hidden_variant": "pickup_open with no satchel: code draws only the light/sparkle pixels (they are the emissive-mask pixels of frames 1-8)"
 },
 "layering": "satchel_idle draws as a y-sorted prop (feet = tile bottom); pickup_open uses the same sort key; hidden_sparkle above ground, below the player",
 "ownership": "The supply bag is a map PROP and World Design may own the final prop art. This soft-bag draft is the Animator reference; if World Design paints the prop, point satchel_idle at their tile and keep pickup_open (the light/sparkle pixels still work over it).",
 "reduced_motion": "satchel glint off; pickup_open frames 0,3,7; hidden sparkle keeps playing (it is the hint) but at size 2 max"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| idle_grass | 0.747 | 0.769 | 0.639 | 0.58 | yes |
| pickup | 0.785 | 0.805 | 0.738 | 0.635 | yes |
| hidden | 0.798 | 0.801 | 0.816 | 0.773 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `item_pickup/_preview/hidden_sparkle_on_grass_2x.gif`
- `item_pickup/_preview/item_pickup_contact_2x.png`
- `item_pickup/_preview/satchel_idle_then_pickup_2x.gif`
- ToD strips: 6 files in `item_pickup/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- Soft drawstring bag (replaces the earlier briefcase-like satchel); the open-neck frame is a bit flat and wants an artist pass.
- World Design may own the final bag prop (it is a solid map object). This is the Animator reference, not a claim on the prop.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_item_pickup.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
