# fx_extra / heal_restore

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Heal-centre restore FX (SOUL_PLAYBOOK heal beat, Kilumen style): one cradle ring round the machine eye, the whole team's crystals float in together, one scanner sweep, a single company-violet glow, a done ping, then each creature's Warmth seeps back in ordered dither.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `heal_cradle_open` | 60x76 | 4 | 467 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_float_1` | 60x76 | 8 | 867 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_float_2` | 60x76 | 8 | 867 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_float_3` | 60x76 | 8 | 867 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_float_4` | 60x76 | 8 | 867 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_float_5` | 60x76 | 8 | 867 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_float_6` | 60x76 | 8 | 867 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_scanner_sweep` | 60x76 | 11 | 1100 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_glow_1` | 60x76 | 3 | 1000 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_glow_2` | 60x76 | 3 | 1000 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_glow_3` | 60x76 | 3 | 1000 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_glow_4` | 60x76 | 3 | 1000 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_glow_5` | 60x76 | 3 | 1000 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_glow_6` | 60x76 | 3 | 1000 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |
| `heal_done_ping` | 60x76 | 6 | 616 | False | all | [30, 30] - cradle centre: console cradle (i_crystal_polisher px [63, 28] |

Per-frame ms, rects and full anchor text are in `heal_restore.json`.

## Hooks (code side)

```json
{
 "sequence": [
  "healer (in-world role: Care Associate, NPC id `healer`) line ends -> heal_cradle_open at the eye (cradle SFX on frame 0)",
  "heal_float_<N> (N = team size 1..6): all crystals rise together, ONE float SFX on frame 0 (never one per crystal)",
  "heal_scanner_sweep once over the held heal_float_<N> last frame (scan SFX on frame 0)",
  "heal_glow_<N> + party_crystal_glow (1000 ms, single swell)",
  "heal_done_ping (done jingle on frame 0), then heal_float_<N> played backwards (crystals home), then party_seep_back over 2000 ms"
 ],
 "cradle_centre": {
  "heal_machine_0_0_px": [
   32,
   51
  ],
  "canvas_px": [
   30,
   30
  ],
  "ring_radius_px": 18,
  "i_heal_machine_2x2_px": [
   63,
   28
  ],
  "i_heal_machine_note": "proposed: on the panel centre (measured panel bbox [26, 14, 101, 35]); the 128 px canvas is 2x2 tiles 7280-7283"
 },
 "crystal_rest_points": {
  "1": [
   [
    30.0,
    12.0
   ]
  ],
  "2": [
   [
    30.0,
    12.0
   ],
   [
    30.0,
    48.0
   ]
  ],
  "3": [
   [
    30.0,
    12.0
   ],
   [
    45.6,
    39.0
   ],
   [
    14.4,
    39.0
   ]
  ],
  "4": [
   [
    30.0,
    12.0
   ],
   [
    48.0,
    30.0
   ],
   [
    30.0,
    48.0
   ],
   [
    12.0,
    30.0
   ]
  ],
  "5": [
   [
    30.0,
    12.0
   ],
   [
    47.1,
    24.4
   ],
   [
    40.6,
    44.6
   ],
   [
    19.4,
    44.6
   ],
   [
    12.9,
    24.4
   ]
  ],
  "6": [
   [
    30.0,
    12.0
   ],
   [
    45.6,
    21.0
   ],
   [
    45.6,
    39.0
   ],
   [
    30.0,
    48.0
   ],
   [
    14.4,
    39.0
   ],
   [
    14.4,
    21.0
   ]
  ]
 },
 "crystal_tray_starts": {
  "1": [
   [
    30.0,
    70
   ]
  ],
  "2": [
   [
    26.5,
    70
   ],
   [
    33.5,
    70
   ]
  ],
  "3": [
   [
    23.0,
    70
   ],
   [
    30.0,
    70
   ],
   [
    37.0,
    70
   ]
  ],
  "4": [
   [
    19.5,
    70
   ],
   [
    26.5,
    70
   ],
   [
    33.5,
    70
   ],
   [
    40.5,
    70
   ]
  ],
  "5": [
   [
    16.0,
    70
   ],
   [
    23.0,
    70
   ],
   [
    30.0,
    70
   ],
   [
    37.0,
    70
   ],
   [
    44.0,
    70
   ]
  ],
  "6": [
   [
    12.5,
    70
   ],
   [
    19.5,
    70
   ],
   [
    26.5,
    70
   ],
   [
    33.5,
    70
   ],
   [
    40.5,
    70
   ],
   [
    47.5,
    70
   ]
  ]
 },
 "i_heal_machine_measured": {
  "opaque_bbox": [
   8,
   6,
   119,
   115
  ],
  "panel_bbox": [
   26,
   14,
   101,
   35
  ],
  "panel_centre": [
   62.7,
   27.6
  ],
  "lights_row_centres": [
   [
    37.5,
    24.5
   ],
   [
    49.5,
    24.5
   ],
   [
    61.5,
    24.5
   ],
   [
    73.5,
    24.5
   ],
   [
    85.5,
    24.5
   ],
   [
    97.7,
    24.5
   ]
  ],
  "oval_centres_2x3": [
   [
    31.5,
    53.5
   ],
   [
    69.5,
    53.5
   ],
   [
    107.3,
    53.5
   ],
   [
    31.5,
    67.5
   ],
   [
    69.5,
    67.5
   ],
   [
    107.3,
    67.5
   ]
  ],
  "top_screen_strip_bbox": [
   17,
   7,
   105,
   12
  ],
  "light_bar_bbox": [
   9,
   41,
   113,
   48
  ]
 },
 "world_design_note": "Both machine arts (heal_machine_1_0 and i_heal_machine) still paint 6 round slots in a 2x3 grid (and i_heal_machine a row of 6 lights). That is the motif the IP check flagged. The overlay ignores them; World Design may want to repaint the slots as a plain counter/tray. World Design owns the final machine art.",
 "party_crystal_glow": {
  "what": "every party creature sprite/icon: crystal-mask pixels only (warmth/masks/<creature>/<same rel path>)",
  "schedule_ms": [
   167,
   500,
   333
  ],
  "pattern": [
   "company",
   "bright",
   "company"
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
 "audio": {
  "sfx": [
   "cradle open (soft)",
   "float (one cue for the whole team)",
   "scan (one pass)",
   "done jingle"
  ],
  "jingle_rule": "The done jingle must be ORIGINAL: write it from the Home motif with its own rhythm and contour. Audio must check it by ear against well-known heal tunes from other creature games before it ships."
 },
 "interiors": "heal centres are interiors: they stay on the DAY grade (club_int is the only interior on the clock). ToD strips grade them as outdoors anyway, as a worst case.",
 "reduced_motion": "skip heal_float_<N> motion: show its last frame directly; skip the sweep; glow as one 1000 ms bright hold; seep back in 4 steps of 500 ms",
 "photosensitivity": "no alternation anywhere; every lit state holds >= 167 ms; the glow is small (cradle + crystal pixels), not full-screen"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| open | 1.0 | 1.0 | 1.0 | 0.95 | yes |
| float_6 | 0.964 | 0.983 | 0.914 | 0.828 | yes |
| float_1 | 0.965 | 0.967 | 0.959 | 0.947 | yes |
| sweep | 0.922 | 0.922 | 0.922 | 0.885 | yes |
| glow_6 | 0.991 | 0.992 | 0.894 | 0.797 | yes |
| ping | 0.893 | 0.935 | 0.893 | 0.864 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `heal_restore/_preview/heal_full_sequence_2x.gif`
- `heal_restore/_preview/heal_keyframes_2x.png`
- `heal_restore/_preview/heal_party_glow_seep_steps_2x.png`
- `heal_restore/_preview/heal_team_sizes_1to6_2x.png`
- ToD strips: 12 files in `heal_restore/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- The cradle sits on the heal_machine eye; on i_heal_machine (2x2) the cradle point [63,28] is proposed from the measured panel, not tested in a room preview.
- Both machine arts still paint 6 round slots (2x3) and i_heal_machine a row of 6 lights - the motif the IP check flagged. World Design owns the machine art and may want to repaint them.
- party_crystal_glow / party_seep_back are code hooks (described in JSON), not drawn sheets; the PNG shows the steps.
- The done jingle is not made here: it must be original and checked by ear by Audio.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_heal_restore.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.


## Anchor update (2026-10-22 23:43 CT)
World Design repainted i_heal_machine and i_crystal_polisher as plain consoles with one cradle and no slots. Heal branches place **i_crystal_polisher** (2x2, ids 7476-7479). The cradle centre is (63,28) in the 128px canvas and is now confirmed. On heal_brookhollow it is map px (383,92). The old heal_machine_0_0 eye [32,51] is retired. The JSON blocks above that mention heal_machine_0_0 or the 6-slot note are superseded by heal_restore.json.
