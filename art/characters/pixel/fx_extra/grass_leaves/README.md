# fx_extra / grass_leaves

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Tall-grass step leaves (MECHANICS_PARITY grass feedback). Leaves only, no dust or haze.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `leaves_a` | 64x96 | 9 | 595 | False | none | [0, 32] - canvas (0,32) = top-left of the tall-grass tile the player stepped INT |
| `leaves_b` | 64x96 | 9 | 595 | False | none | [0, 32] - same as leaves_a |
| `leaves_reduced_motion` | 64x96 | 3 | 300 | False | none | [0, 32] - same as leaves_a |

Per-frame ms, rects and full anchor text are in `grass_leaves.json`.

## Hooks (code side)

```json
{
 "trigger": "player (or a walking follower) ENTERS a tall_grass_* tile; start with the tile rustle (same ms)",
 "pick": "alternate leaves_a / leaves_b per step (or random); skip when running on a bike over 3 grass tiles in a row: play every other step",
 "not_on": "surf, cut-scenes",
 "reduced_motion": "use leaves_reduced_motion",
 "grade": "sprite grade (not emissive): leaves dim at night with the grass, the dark edge keeps them readable"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| a | 0.784 | 0.822 | 0.746 | 0.686 | yes |
| b | 0.811 | 0.842 | 0.765 | 0.656 | yes |
| rm | 0.787 | 0.846 | 0.743 | 0.691 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `grass_leaves/_preview/grass_leaves_contact_2x.png`
- `grass_leaves/_preview/leaves_on_tall_grass_2x.gif`
- ToD strips: 6 files in `grass_leaves/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- First version passed the readability number but was invisible by eye; leaves were enlarged and outlined. Re-check on a real device.
- Only two leaf variants; a third (seed-head) would cut repetition.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_grass_leaves.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
