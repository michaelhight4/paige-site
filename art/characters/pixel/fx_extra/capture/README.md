# fx_extra / capture

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Hold-up / absorb capture for the dominance crystal (SOUL_PLAYBOOK 5.3 as updated Oct 22 2026; MECHANICS_PARITY item 5, B17). The trainer raises the crystal overhead, it glows, violet runes and a beam reach the foe, the foe dissolves into light motes that stream into the held crystal, the crystal pulses 1-4 times in the hands while the runes close in, then the runes lock and the crystal blooms (success) or the light bursts back out and re-forms the creature (break-out). No throw, no drop, no wobble, no click, no stars. New crystal shape: tall gem in a three-prong top setting, no middle band. Overlay FX + hook points only; trainer sprites are not redrawn.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `raise` | 64x64 | 7 | 933 | False | all | [32, 32] - crystal centre = the trainer HOLD point (raised hands); follow it per  |
| `beam` | 240x176 | 10 | 1233 | False | all | [40, 40] - authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc |
| `absorb` | 240x176 | 10 | 1100 | False | all | [40, 40] - authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc |
| `pulse_1` | 64x64 | 4 | 600 | False | all | [32, 32] - crystal centre = the trainer HOLD point (raised hands); follow it per  |
| `pulse_2` | 64x64 | 8 | 1200 | False | all | [32, 32] - crystal centre = the trainer HOLD point (raised hands); follow it per  |
| `pulse_3` | 64x64 | 12 | 1800 | False | all | [32, 32] - crystal centre = the trainer HOLD point (raised hands); follow it per  |
| `pulse_4` | 64x64 | 16 | 2400 | False | all | [32, 32] - crystal centre = the trainer HOLD point (raised hands); follow it per  |
| `lock_bloom` | 64x64 | 6 | 1400 | False | all | [32, 32] - crystal centre = the trainer HOLD point (raised hands); follow it per  |
| `breakout_generic` | 240x176 | 10 | 1113 | False | all | [40, 40] - authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc |
| `breakout_fire` | 240x176 | 10 | 1113 | False | all | [40, 40] - authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc |
| `breakout_water` | 240x176 | 10 | 1113 | False | all | [40, 40] - authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc |
| `breakout_wind` | 240x176 | 10 | 1113 | False | all | [40, 40] - authored for the pilot layout: crystal at HOLD, foe at FOE_CENTER, arc |

Per-frame ms, rects and full anchor text are in `capture.json`.

## Hooks (code side)

```json
{
 "sequence": [
  "raise @ HOLD",
  "beam (travel canvas)",
  "absorb (travel canvas) + foe_dissolve",
  "pulse_<N> @ HOLD (N = 1..4 by catch odds)",
  "lock_bloom @ HOLD OR breakout_<type> (travel canvas) + foe_reform"
 ],
 "pulse_variants": {
  "names": [
   "pulse_1",
   "pulse_2",
   "pulse_3",
   "pulse_4"
  ],
  "pulses": [
   1,
   2,
   3,
   4
  ],
  "ms_per_pulse": 600,
  "prefix_rule": "variant N is exactly the first 4N frames of variant 4, so code may also play pulse_4 and stop after pulse N",
  "choose_by_odds": "each pulse is one capture check: pulse k plays only if checks 1..k passed. Fail after pulse N -> breakout_<type>; pass all 4 -> lock_bloom. Game dev may instead pick N straight from the odds tier (low 1, mid 2-3, high 4) if the formula changes."
 },
 "anchors": {
  "crystal_hold_player_back": {
   "screen_pilot": [
    64,
    128
   ],
   "sprite_px": "TBD by Character models: the raised-hands point in each player back-sprite raise frame (x, y in sprite px)",
   "note": "No player back sprite exists yet; HOLD (64,128) is a pilot placeholder above a bottom-left trainer."
  },
  "crystal_hold_trainer_front": {
   "sprite_px_64x128_provisional": [
    32,
    4
   ],
   "note": "For NPC trainers (64x128 front sprites, head top at y~2): hands meet above the head; crystal centre ~10 px above the hands. Replace with the per-frame point from the raise frames."
  },
  "foe": {
   "screen_pilot": [
    232,
    100
   ],
   "rule": "foe sprite visual centre; rune ring radii 34 x 30 px around it"
  }
 },
 "foe_dissolve": {
  "anim": "absorb",
  "frames": [
   0,
   1,
   2,
   3,
   4,
   5,
   6,
   7,
   8,
   9
  ],
  "removed_fraction": [
   0.0,
   0.12,
   0.25,
   0.38,
   0.5,
   0.62,
   0.75,
   0.88,
   1.0,
   1.0
  ],
  "method": "4x4 Bayer (fxx_lib.bayer_fade) keyed to the sprite top-left; draw pixels removed THIS frame as d6acff for one frame (turning into light)"
 },
 "foe_reform": {
  "anim": "breakout_<type>",
  "frames": [
   6,
   7,
   8,
   9
  ],
  "hidden_fraction": [
   1.0,
   0.66,
   0.33,
   0.0
  ],
  "method": "reverse Bayer; play the cry on frame 6; battle shake (soul/battle_feedback shake strong_hit) optional on frame 6"
 },
 "breakout_type_by_element": {
  "fire": "fire",
  "water": "water",
  "earth": "generic",
  "wind": "wind",
  "light": "generic",
  "dark": "generic",
  "mystic": "generic",
  "legendary": "generic",
  "grass": "generic",
  "bug": "generic",
  "sea": "water",
  "freshwater": "water",
  "swamp": "water",
  "rain": "water",
  "magma": "fire",
  "dragos": "fire",
  "bird": "wind",
  "spirit": "generic",
  "ghost": "generic",
  "demon": "fire",
  "angelic": "generic",
  "god": "generic",
  "devil": "fire"
 },
 "guardian_note": "Guardians have very low odds: usually 1 pulse then the generic or element break-out.",
 "reduced_motion": {
  "raise_glow": "frames 0,4,6 (200 ms each)",
  "reach": "frames 5,9 (300 ms)",
  "absorb": "frames 0,4,8 (250 ms) with the foe dissolve at the same steps",
  "pulse": "keep the pulse count but show only frames 1 and 3 of each pulse (300 ms each)",
  "success": "frames 1,5",
  "breakout": "frames 0,5,9"
 },
 "sfx_cues": {
  "raise": 4,
  "beam": 0,
  "absorb": [
   0,
   8
  ],
  "pulse_N": [
   0,
   4,
   8,
   12
  ],
  "lock_bloom": {
   "lock": 1,
   "bloom_chime": 4
  },
  "breakout_<type>": 1
 },
 "coder_step_map": {
  "raise": "raise",
  "beam": "beam",
  "absorb": "absorb",
  "pulse_1": "pulse(1)",
  "pulse_2": "pulse(2)",
  "pulse_3": "pulse(3)",
  "pulse_4": "pulse(4)",
  "lock_bloom": "lock/bloom",
  "breakout_generic": "breakout",
  "breakout_fire": "breakout (fire elements)",
  "breakout_water": "breakout (water elements)",
  "breakout_wind": "breakout (wind elements)"
 },
 "per_anim_json": "capture/<name>/<name>_battle_2x.json (same style as the live effects/*_battle_2x.json: 2x frame rects, ms, total_ms, anchor + hand/foe anchor hooks)",
 "audio_note": "Pulse + chime sounds must be original and checked by ear by Audio (no click-lock or familiar jingle).",
 "trainer_pose_request": "Character models: supply raised-arm frames (see README) - this piece does NOT redraw trainers.",
 "layering": "capture sprites draw above both trainer and foe, below the HP boxes/UI"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| raise | 0.827 | 0.866 | 0.827 | 0.831 | yes |
| reach | 0.777 | 0.782 | 0.749 | 0.782 | yes |
| absorb | 0.784 | 0.793 | 0.729 | 0.736 | yes |
| pulse_4 | 0.836 | 0.851 | 0.836 | 0.887 | yes |
| success | 0.83 | 0.845 | 0.83 | 0.799 | yes |
| break_generic | 0.88 | 0.892 | 0.876 | 0.855 | yes |
| break_fire | 0.908 | 0.916 | 0.901 | 0.705 | yes |
| break_water | 0.884 | 0.893 | 0.879 | 0.805 | yes |
| break_wind | 0.905 | 0.915 | 0.9 | 0.825 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `capture/_preview/capture_contact_2x.png`
- `capture/_preview/capture_full_breakout_fire_2x.gif`
- `capture/_preview/capture_full_breakout_generic_2x.gif`
- `capture/_preview/capture_full_breakout_water_2x.gif`
- `capture/_preview/capture_full_breakout_wind_2x.gif`
- `capture/_preview/capture_full_success_2x.gif`
- `capture/_preview/capture_success_keyframes_2x.png`
- ToD strips: 18 files in `capture/_preview/*_tod_2x.*`

## Names = code steps

Coder's placeholder steps map 1:1 to the anim folders here. Each folder has `<name>_battle_2x.json` beside its sheet (same style as the live effects `*_battle_2x.json`: 2x frame rects, ms, total_ms, anchor, hand + foe anchor hooks).

| code step | anim |
|---|---|
| raise | `raise` |
| beam | `beam` |
| absorb | `absorb` |
| pulse(n) | `pulse_1` .. `pulse_4` (pulse_n = first 4n frames of pulse_4) |
| lock/bloom | `lock_bloom` |
| breakout | `breakout_generic`, `breakout_fire`, `breakout_water`, `breakout_wind`; other elements use `hooks.breakout_type_by_element` in capture.json |

## Needed from Character models (trainer sprites are NOT redrawn here)

- **Player back sprite**: a raised-arms "hold the crystal up" pose, 3 frames (arms rising, arms up, arms up + small lean back for the break-out), plus a lowered return frame. Give a per-frame `hold_px` (x, y in sprite px) for the point between the hands.
- **Each NPC trainer front sprite (64x128)**: the same raise pose, 2 frames (rising, up), with per-frame `hold_px`. The current provisional point is [32, 4] (hands above the head).
- Until then code uses HOLD (64,128) on the 320x240 battle screen for the player and [32,4] on the trainer front sprite.


## Weak spots / needs artist polish

- The crystal is small at 1x and its three prongs read faintly; needs an artist pass on facets at 1x.
- HOLD (64,128) is a pilot placeholder: there is no player back sprite yet, and the trainer-front hold point [32,4] is provisional.
- Fire break-out is the weakest at night (0.71, passes): the inner flame was brightened to fcd668/f8eabe; water/wind are flatter shapes.
- Break-out type by element is a guess for the newer elements; Game dev/Story should confirm.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_capture.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
