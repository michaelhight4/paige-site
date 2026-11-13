# fx_extra / cosmic_shimmer

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Cosmic variant VFX (cosmic_swaps.json "vfx" hand-off). Preview creature: tumbloam with its Cosmic swap.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `cosmic_starfield_tile` | 32x32 | 8 | 720 | True | all | [0, 0] - seamless 32x32 tile; tile from the sprite top-left |
| `cosmic_encounter_aura` | 160x160 | 14 | 880 | False | all | [80, 157] - same anchor as a 160x160 battle sprite (bottom-centre); for 128 sprite |
| `cosmic_icon_twinkle` | 32x32 | 8 | 530 | False | all | [0, 0] - same top-left as the 32x32 party icon |
| `cosmic_summary_sparkle` | 24x24 | 8 | 880 | True | all | [12, 12] - centre; put beside the name on summary |

Per-frame ms, rects and full anchor text are in `cosmic_shimmer.json`.

## Hooks (code side)

```json
{
 "order": "cosmic swap -> Warmth swap -> ToD grade -> shimmer layers on top (shimmer is emissive: lit grade)",
 "clip": "starfield pixel drawn only if sprite alpha > 0 AND crystal mask == 0 (crystals are never touched by Cosmic)",
 "encounter": [
  "cosmic_encounter_aura + starfield clipped to the foe, together, after the foe slides in",
  "chime notes on aura frames 0/4/8",
  "then starfield stops (or keep at 1 frame per 400 ms if Gary wants a subtle idle)"
 ],
 "icon_twinkle_period_ms": 4000,
 "distinct_from": "Enraged uses red/ember shards; Cosmic uses cool ice-blue 4-point stars (c6ecfa/7ac2e8/4692ce)",
 "reduced_motion": "no aura spiral: show aura frame 8 for 400 ms; starfield single static frame; icon twinkle stays (it is a marker)"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| aura | 0.875 | 0.875 | 0.852 | 0.644 | yes |
| field | 0.925 | 0.925 | 0.81 | 0.782 | yes |
| icon | 0.697 | 0.697 | 0.697 | 0.616 | yes |
| summary | 0.667 | 0.667 | 0.667 | 0.6 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `cosmic_shimmer/_preview/cosmic_encounter_tumbloam_2x.gif`
- `cosmic_shimmer/_preview/cosmic_icon_tumbloam_2x.gif`
- `cosmic_shimmer/_preview/cosmic_shimmer_contact_2x.png`
- ToD strips: 8 files in `cosmic_shimmer/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- Starfield on very light creature bellies is low contrast (still passes); an artist may want a darker star tip there.
- Chime timing is a suggestion only (audio not made here).
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_cosmic_shimmer.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
