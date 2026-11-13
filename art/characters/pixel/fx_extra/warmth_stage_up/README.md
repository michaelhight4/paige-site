# fx_extra / warmth_stage_up

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Warmth stage-up FX (SOUL_PLAYBOOK Warmth): one ring+sparkle per ramp family in the family's own stage-3 colours, stage pips (shape marker), crystal anchors.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `rings/stage_up_candle` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_coral` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_crimson` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_dawn` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_ember` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_molten` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_moss` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_pond` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_seafoam` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `rings/stage_up_sprout` | 48x48 | 10 | 680 | False | all | [24, 24] - centre on the crystal centroid (crystal_anchors.json) |
| `stage_pips` | 23x7 | 4 | 1600 | False | none | [0, 0] - top-left; frame index = Warmth stage 0-3 |

Per-frame ms, rects and full anchor text are in `warmth_stage_up.json`.

## Hooks (code side)

```json
{
 "trigger": "Warmth crosses a stage threshold (warmth_tints.json thresholds 25/50/75) at a calm moment: after battle results or in the party screen; never mid-move",
 "sequence": [
  "stage_up_<family> at the crystal centroid of the current sprite frame",
  "frame 3: swap to the new Warmth stage (palette swap via warmth_tints.json on the crystal mask)",
  "stage_pips glyph updates to the new count on frame 3",
  "chime SFX on frame 2"
 ],
 "family_lookup": "warmth_tints.json creatures.<name>.ramp_family",
 "anchors": "art/characters/pixel/fx_extra/warmth_stage_up/crystal_anchors.json",
 "stage_down": "no ring for losing Warmth: just swap, plus pips update (avoid rewarding loss with sparkle)",
 "reduced_motion": "skip the ring; play frame 3 only for 300 ms, then swap",
 "order": "cosmic swap -> Warmth swap -> ToD grade (cosmic_swaps.json)"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| ring_ember | 0.727 | 0.731 | 0.729 | 0.722 | yes |
| ring_seafoam | 0.853 | 0.853 | 0.852 | 0.842 | yes |
| ring_moss | 0.853 | 0.923 | 0.795 | 0.707 | yes |
| ring_candle | 0.882 | 0.882 | 0.882 | 0.878 | yes |
| ring_coral | 0.882 | 0.882 | 0.882 | 0.878 | yes |
| ring_crimson | 0.948 | 0.948 | 0.934 | 0.934 | yes |
| ring_dawn | 0.878 | 0.878 | 0.878 | 0.742 | yes |
| ring_molten | 1.0 | 1.0 | 1.0 | 1.0 | yes |
| ring_pond | 0.882 | 0.882 | 0.882 | 0.882 | yes |
| ring_sprout | 0.747 | 0.882 | 0.742 | 0.742 | yes |
| pips | 0.641 | 0.667 | 0.641 | 0.53 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `warmth_stage_up/_preview/stage_up_preview_bastonox_2x.gif`
- `warmth_stage_up/_preview/stage_up_preview_cindrip_2x.gif`
- `warmth_stage_up/_preview/stage_up_preview_rillop_2x.gif`
- `warmth_stage_up/_preview/warmth_stage_up_contact_2x.png`
- ToD strips: 22 files in `warmth_stage_up/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- Rings are one shared shape recoloured per family; a per-family motif (flame tongue, droplet, leaf) would be nicer.
- crystal_anchors.json centroids are computed from masks; odd-shaped crystals (split crystals) get a centroid between parts.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_warmth_stage_up.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
