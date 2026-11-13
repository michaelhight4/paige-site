# Soul pass: #2 Spotted!

Trainer notices the player: eye glint, violet crystal spark over the head, a small hop, then the trainer walks up.
Company (RT) trainers use `spark_rt` (tiny RT gem-shield logo inside the spark). An 8-emote set (heart, sweat, dots,
question, note, sparkle, anger, zzz) is shared with Trail Buddy, Lap Nap and the NPCs.

* `eye_points.json`: head_top + eye pixel positions for every human/NPC down-stand frame (glint + spark placement).
* Frame 01 of `spark` is the playbook's single "spark" frame; 00/02/03 are optional pop-in/afterglow.

## Layout

Each animation folder holds `1x/<name>_NN.png` (transparent, hard pixels, palette-only), `2x/<name>_NN_2x.png` (exact nearest-neighbour), `<name>_sheet.png` + `<name>_sheet_2x.png` (frames left to right) and `<name>_2x.gif`. Timing, anchors and paths are in `_meta.json` and in the manifest key `soul.spotted`.

## Assets (11 animations)

| animation (folder) | kind | size | frames | ms per frame | anchor | loop | creatures |
|---|---|---|---|---|---|---|---|
| `spark` | overlay | 24x24 | 4 | 50,450,120,80 | [12, 23] | no | - |
| `spark_rt` | overlay | 24x24 | 4 | 50,450,120,80 | [12, 23] | no | - |
| `eye_glint` | overlay | 5x5 | 2 | 50 | [2, 2] | no | - |
| `emotes/emote_heart` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_sweat` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_dots` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_note` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_zzz` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_anger` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_question` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |
| `emotes/emote_sparkle` | overlay | 24x24 | 3 | 60,260,260 | [12, 23] | yes | - |

## Per-animation notes

* `spark`: Frame 01 is THE spark (the playbook's 1-frame symbol); 00/02/03 are optional pop-in/afterglow. Place bottom-centre (12,23) at (sprite_x+32, sprite_y+head_top-2).
* `spark_rt`: Company (RT) NPC variant: tiny RT gem-shield logo. Same timing/anchor as spark.
* `eye_glint`: Eyes flash: draw one per eye, centre (2,2) at (sprite_x+eye_lx|eye_rx, sprite_y+eye_y) from eye_points.json (down-facing frame; for left/right facing use the single eye on the facing side, see README).
* `emotes/emote_heart`: Play 00 once, then loop 01,02 (~1 s total), then remove. Bottom-centre (12,23) at head_top-1.

## Coder hook notes

* The hop is code-driven: offsets in `hook_specs.json` (no extra sprite frames).
* For left/right-facing trainers only one eye is visible: put one glint on the facing side (measured example in the generator).

The full parameters are in `hook_specs.json`, embedded here:

```json
{
 "trigger": "trainer line-of-sight hits the player (any NPC trainer; company/RT trainers use spark_rt)",
 "sequence": [
  {
   "step": "freeze player input; player finishes current 16 px step, then stands",
   "ms": 160
  },
  {
   "step": "eye_glint: 2 frames x 50 ms on the trainer (eye_points.json; facing left/right = one eye)",
   "ms": 100
  },
  {
   "step": "spark frame 00 (pop) above trainer head",
   "ms": 50
  },
  {
   "step": "hop: trainer sprite y offset HOP_DY px per frame, spark rides along (spark frame 01 held)",
   "hop_dy_px": [
    0,
    -3,
    -6,
    -7,
    -6,
    -3,
    0
   ],
   "hop_ms": [
    120,
    40,
    40,
    40,
    40,
    40,
    40
   ],
   "ms": 360
  },
  {
   "step": "spark frames 02 (120 ms), 03 (80 ms) then remove",
   "ms": 200
  },
  {
   "step": "trainer walks toward the player at normal walk speed (16 px / 62 ms per frame) until adjacent, then dialogue",
   "ms": null
  }
 ],
 "spark_anchor": "spark bottom-centre (12,23) at (sprite_x + 32, sprite_y + head_top - 2); head_top per NPC in eye_points.json",
 "emotes": "spotted/emotes/emote_<name>: play 00 once (60 ms) then loop 01/02 (260 ms each); bottom-centre (12,23) at head_top - 1",
 "reduced_motion": "skip hop (keep spark frame 01 for 360 ms)",
 "sfx_note": "not art: a short rising chime on spark frame 01"
}
```

## Previews

* `previews/eye_glint_check_2x.png`
* `previews/spotted_glyphs_4x.png`
* `previews/spotted_route1_2x.gif`
* `previews/spotted_rt_still_2x.png`

## Reproduce / validate

```
cd art/characters/pixel/soul/_tools
python3 gen_spotted.py
python3 validate_soul.py spotted
python3 write_manifest.py
```
