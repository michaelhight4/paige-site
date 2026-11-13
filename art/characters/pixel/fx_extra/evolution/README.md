# fx_extra / evolution

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Generic evolution overlay (MECHANICS_PARITY evolution), IP redesign Oct 22 2026: crystal veins grow from the creature's crystal across its body in its Warmth family colours, an ordered-dither front reveals the new form outward from the crystal point, and a ring burst stays inside the sprite area. No silhouette swap, no white flicker, no full-screen flash; every step >= 167 ms. Works for every creature: code masks/recolours the overlay with the existing sprites; nothing is redrawn per creature.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `evo_veins_grow` | 256x256 | 10 | 2000 | False | all | [128, 128] - crystal point of the CURRENT (old) sprite frame (warmth_stage_up/cryst |
| `evo_veins_hold` | 256x256 | 2 | 666 | True | all | [128, 128] - crystal point of the CURRENT (old) sprite frame (warmth_stage_up/cryst |
| `evo_reveal_front` | 256x256 | 10 | 1670 | False | all | [128, 128] - crystal point of the CURRENT (old) sprite frame (warmth_stage_up/cryst |
| `evo_ring_burst` | 128x128 | 5 | 934 | False | all | [64, 64] - crystal point of the NEW sprite |
| `evo_cancel` | 256x256 | 6 | 1002 | False | all | [128, 128] - crystal point of the CURRENT (old) sprite frame (warmth_stage_up/cryst |
| `evo_reduced_motion` | 256x256 | 2 | 1200 | False | all | [128, 128] - crystal point of the CURRENT (old) sprite frame (warmth_stage_up/cryst |

Per-frame ms, rects and full anchor text are in `evolution.json`.

## Hooks (code side)

```json
{
 "text": {
  "start": "{old} is changing...",
  "end": "{old} became {new}!",
  "note": "old evolution text line removed in this redesign"
 },
 "sequence": [
  "old sprite normal + text \"{old} is changing...\"",
  "evo_veins_grow (masked to old sprite, family recolour)",
  "evo_veins_hold loop until the text is dismissed (B cancels -> evo_cancel)",
  "evo_reveal_front: new form revealed outward from the crystal point",
  "evo_ring_burst at the new crystal point",
  "new sprite normal + original jingle + text \"{old} became {new}!\""
 ],
 "family_recolour": {
  "table": "art/characters/pixel/warmth/warmth_tints.json creatures.<old>.stages[\"3\"] (the family colours, e.g. ember/tide/moss)",
  "apply_to": "every overlay pixel (exact #rrggbb match, authored in the source ramp 3a1e60..f4e2ff)",
  "fallback": "no Warmth entry -> keep violet"
 },
 "mask": "veins and the reveal front draw only where the old (or, for the front, old OR new) sprite is opaque; anchor both sprites by their battle bottom-centre anchor",
 "reveal": {
  "rule": "new pixel shown where dist(p, crystal_point) + (bayer4(p)/16 - 0.5)*12 < REVEAL_R[frame]; else old pixel",
  "REVEAL_R": [
   16,
   32,
   48,
   64,
   80,
   96,
   112,
   128,
   144,
   160
  ],
  "stop_rule": "play evo_reveal_front frames until REVEAL_R[frame] >= R_max + 6, then go to evo_ring_burst (R_max = max distance from the crystal point to any opaque pixel of either sprite)",
  "bayer": "4x4 ordered (fxx_lib.BAYER) keyed to the field (crystal point = field centre)"
 },
 "cancel": "B at any point before evo_reveal_front -> evo_cancel; after the reveal starts it cannot be cancelled",
 "photosensitivity": "Every timed step in every anim is >= 167 ms (<= 6 changes per second). No full-screen flash, no white silhouette, no alternation between the two forms. The burst stays inside the sprite area.",
 "warmth_cosmic": "after the swap the new sprite gets the same Warmth stage and Cosmic flag (apply palette swaps before the ToD grade)",
 "reduced_motion": "evo_reduced_motion replaces grow/hold/reveal/burst; text hooks unchanged",
 "audio_note": "The evolution jingle must be original; Audio checks it by ear."
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| veins_grow | 0.97 | 0.97 | 0.967 | 0.965 | yes |
| veins_hold | 0.945 | 0.945 | 0.939 | 0.862 | yes |
| reveal | 0.964 | 0.964 | 0.952 | 0.962 | yes |
| cancel | 0.937 | 0.937 | 0.929 | 0.894 | yes |
| rm | 0.921 | 0.921 | 0.921 | 0.783 | yes |
| burst | 0.852 | 0.852 | 0.84 | 0.825 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `evolution/_preview/evolution_cancel_cindrip_2x.gif`
- `evolution/_preview/evolution_cindrip_to_emberlunx_2x.gif`
- `evolution/_preview/evolution_keyframes_2x.png`
- `evolution/_preview/evolution_reduced_motion_cindrip_2x.gif`
- ToD strips: 12 files in `evolution/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- Veins on creatures whose body already has warm cracks (e.g. cindrip) read more subtly than on plain bodies; the reveal front carries the beat.
- The reveal front is authored in absolute px (REVEAL_R 16..160); code stops it at R_max + 6 per sprite pair.
- Ring burst stays inside the sprite area; there is no full-screen flash any more.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_evolution.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
