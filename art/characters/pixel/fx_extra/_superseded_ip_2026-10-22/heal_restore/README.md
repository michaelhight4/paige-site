# fx_extra / heal_restore

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Heal-centre restore FX (SOUL_PLAYBOOK heal beat): party crystals set into the machine, a 1 s company-violet flash, a recalibration ping, then each creature's Warmth seeps back in ordered dither.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `heal_slot_empty` | 11x11 | 1 | 400 | False | none | [5, 5] - slot centre; slot centres on heal_machine_1_0 = [(20, 24), (33, 24), ( |
| `heal_slot_place` | 11x11 | 4 | 320 | False | all | [5, 5] - slot centre |
| `heal_slot_flash` | 11x11 | 2 | 250 | True | all | [5, 5] - slot centre |
| `heal_screen_pulse` | 64x64 | 2 | 250 | True | all | [0, 0] - top-left of heal_machine_0_0 tile |
| `heal_recal_ping` | 32x32 | 8 | 580 | False | all | [16, 16] - centre on the machine eye (tile 0_0 px [32, 51]) at the end of the fla |

Per-frame ms, rects and full anchor text are in `heal_restore.json`.

## Hooks (code side)

```json
{
 "sequence": [
  "nurse line ends -> for k in 0..party-1: heal_slot_place at SLOTS[k], 200 ms apart (place SFX each)",
  "unused slots: heal_slot_empty (optional)",
  "flash: heal_slot_flash on filled slots + heal_screen_pulse + party_crystal_flash, 8 x 125 ms = 1000 ms",
  "heal_recal_ping at the eye, then party_seep_back over 2000 ms (runs after the screen fades back in; can overlap the party menu)"
 ],
 "slot_centres_on_heal_machine_1_0": [
  [
   20,
   24
  ],
  [
   33,
   24
  ],
  [
   46,
   24
  ],
  [
   20,
   39
  ],
  [
   33,
   39
  ],
  [
   46,
   39
  ]
 ],
 "eye_centre_on_heal_machine_0_0": [
  32,
  51
 ],
 "machine_tiles": "heal_machine (1x2: heal_machine_0_0 top, heal_machine_1_0 bottom); i_heal_machine 2x2 variant needs its own offsets (not measured)",
 "party_crystal_flash": {
  "what": "every party creature sprite/icon: crystal-mask pixels only (warmth/masks/<creature>/<same rel path>)",
  "schedule_ms": [
   125,
   125,
   125,
   125,
   125,
   125,
   125,
   125
  ],
  "pattern": [
   "company",
   "bright",
   "company",
   "bright",
   "company",
   "bright",
   "company",
   "bright"
  ],
  "company": "draw the crystal pixels with Warmth stage 0 colours (the unswapped source ramp 3a1e60..f4e2ff)",
  "bright": "fill crystal pixels with 'd6acff' (pixels that are 'f4e2ff' in the source stay 'f4e2ff')",
  "meaning": "the company machine briefly re-asserts control: the light snaps back to company violet"
 },
 "party_seep_back": {
  "what": "crystal pixels go from stage 0 back to the creature's CURRENT Warmth stage, ordered-dither, never a colour blend",
  "steps": 8,
  "step_ms": 250,
  "total_ms": 2000,
  "table": "art/characters/pixel/fx_extra/heal_restore/bayer4_seep.png (4x4, value/16 = Bayer level 0..15)",
  "rule": "at step s (1..8) a crystal pixel at sprite-local (x,y) shows the warm colour if BAYER[y%4][x%4] < 2*s, else stage 0. Key the pattern to sprite-local coordinates so it does not crawl when the sprite moves.",
  "stage0_creatures": "stage 0 creatures: skip the seep (nothing to return to)"
 },
 "interiors": "heal centres are interiors: they stay on the DAY grade (club_int is the only interior on the clock). ToD strips below grade them as outdoors anyway, as a worst case.",
 "reduced_motion": "replace the 125 ms alternation with one 1000 ms hold of the bright state; seep-back in 4 steps of 500 ms",
 "photosensitivity": "the flash is small (slots + crystal pixels), not full-screen; 4 Hz alternation is fine for small areas"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| slots | 0.822 | 0.822 | 0.822 | 0.836 | yes |
| flash | 0.961 | 0.961 | 0.787 | 0.673 | yes |
| screen | 0.922 | 0.922 | 0.922 | 1.0 | yes |
| ping | 0.739 | 0.739 | 0.64 | 0.691 | yes |
| empty | 1.0 | 1.0 | 0.901 | 0.901 | yes (note) |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `heal_restore/_preview/heal_full_sequence_2x.gif`
- `heal_restore/_preview/heal_party_flash_seep_steps_2x.png`
- ToD strips: 10 files in `heal_restore/_preview/*_tod_2x.*`

## Weak spots / needs artist polish

- Slot offsets are measured on heal_machine (1x2) only; the i_heal_machine 2x2 variant is NOT measured.
- party_crystal_flash / party_seep_back are code hooks (described in JSON), not drawn sheets; the PNG shows the steps.
- heal_slot_empty is a dark cover by design and is below the 50% readability bar (noted).
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_heal_restore.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
