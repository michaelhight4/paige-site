# fx_extra / evolution

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Generic evolution overlay (MECHANICS_PARITY evolution). Works for every creature: code silhouettes the existing sprites; nothing is redrawn per creature.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `evo_motes_rise` | 160x160 | 8 | 560 | True | all | [80, 157] - same bottom-centre anchor as the creature battle sprite (160 canvas; f |
| `evo_flash` | 320x240 | 8 | 600 | False | all | [0, 0] - full 320x240 screen |
| `evo_burst` | 160x160 | 9 | 640 | False | all | [80, 157] - same bottom-centre anchor as the creature battle sprite (160 canvas; f |
| `evo_cancel` | 160x160 | 7 | 610 | False | all | [80, 157] - same bottom-centre anchor as the creature battle sprite (160 canvas; f |
| `evo_reduced_motion` | 160x160 | 3 | 1000 | False | all | [80, 157] - same bottom-centre anchor as the creature battle sprite (160 canvas; f |

Per-frame ms, rects and full anchor text are in `evolution.json`.

## Hooks (code side)

```json
{
 "silhouette": {
  "fill": "fcf6e8",
  "outline_1px": "8a4ace",
  "how": "code: every opaque pixel of the sprite -> fill; add a 1px 4-neighbour outline. Same for old and new sprite."
 },
 "alternation_schedule_ms": [
  600,
  500,
  400,
  320,
  260,
  200,
  160,
  120,
  100,
  80,
  60,
  60,
  60
 ],
 "alternation_rule": "start on the OLD silhouette; each entry is how long to show the current silhouette before switching (old, new, old, ...). Total 2940 ms. B cancels at any point -> evo_cancel.",
 "sequence": [
  "old sprite normal + text",
  "old sprite -> silhouette (hard cut) + evo_motes_rise loop",
  "alternate by alternation_schedule_ms",
  "evo_flash (swap to new sprite at frame 3)",
  "evo_burst, new sprite normal colours, motes stop",
  "jingle + \"evolved into\" text"
 ],
 "photosensitivity": "Max 3 full-screen flashes per second; this design has ONE full-screen flash. The alternation is a sprite-sized area. The fastest alternation step is 60 ms (~8 Hz) on a sprite-sized area; if Gary wants stricter, clamp schedule entries to >= 167 ms.",
 "warmth_cosmic": "after the swap the new sprite gets the same Warmth stage and Cosmic flag (apply swaps before grading)",
 "reduced_motion": "evo_reduced_motion instead of alternation+flash; keep motes off"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| motes | 0.922 | 0.925 | 0.984 | 0.877 | yes |
| burst | 0.672 | 0.701 | 0.604 | 0.618 | yes |
| cancel | 0.74 | 0.753 | 0.634 | 0.634 | yes |
| rm | 0.871 | 0.871 | 0.87 | 0.983 | yes |
| flash | 0.818 | 0.818 | 0.818 | 0.818 | yes (note) |
| silhouette_old | 0.99 | 0.99 | 0.99 | 0.963 | yes (note) |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `evolution/_preview/evolution_cancel_cindrip_2x.gif`
- `evolution/_preview/evolution_cindrip_to_emberlunx_2x.gif`
- `evolution/_preview/evolution_contact_2x.png`
- ToD strips: 12 files in `evolution/_preview/*_tod_2x.*`

## Weak spots / needs artist polish

- Silhouettes are code-made (fill + outline): fine as a generic overlay, but the motes and burst are simple shapes.
- Alternation reaches 60 ms steps (~8 Hz) on a sprite-sized area; full-screen flash is used once only. If Gary wants a stricter photosensitivity rule, clamp steps to >= 167 ms.
- evo_flash is fcf6e8 (not a lit colour) so it dims at night under a grade: draw it in screen space (ungraded) if possible.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_evolution.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
