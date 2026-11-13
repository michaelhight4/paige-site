# fx_extra / capture

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

Capture sequence for the dominance crystal (SOUL_PLAYBOOK 5.3; MECHANICS_PARITY item 5, B17). Original faceted crystal with a grey clasp band; no ball/button motif.

## Anims

Sheets are horizontal strips; frame i rect = [i*w, 0, w, h]. 1x is the source; *_2x is exact nearest-neighbour.

| anim | size | frames | total ms | loop | emissive | anchor |
|---|---|---|---|---|---|---|
| `capture_throw` | 240x176 | 10 | 440 | False | all | [40, 40] -  |
| `capture_pull` | 96x96 | 9 | 560 | False | all | [48, 40] - crystal centre = hover point |
| `capture_drop` | 32x80 | 11 | 580 | False | all | [16, 77] - ground contact under the foe (foe sprite bottom-centre anchor) |
| `capture_wobble` | 32x32 | 24 | 1800 | False | all | [16, 29] - ground contact |
| `capture_success` | 48x48 | 7 | 860 | False | all | [24, 45] - ground contact |
| `capture_breakout_generic` | 64x64 | 8 | 455 | False | all | [32, 61] - ground contact |
| `capture_breakout_fire` | 64x64 | 8 | 455 | False | all | [32, 61] - ground contact |
| `capture_breakout_water` | 64x64 | 8 | 455 | False | all | [32, 61] - ground contact |
| `capture_breakout_wind` | 64x64 | 8 | 455 | False | all | [32, 61] - ground contact |
| `capture_odds_ring` | 48x48 | 4 | 1600 | True | all | [24, 24] - centre on the foe centre (pilot 232,100) |

Per-frame ms, rects and full anchor text are in `capture.json`.

## Hooks (code side)

```json
{
 "sequence": [
  "capture_throw @ travel canvas (40,40)",
  "capture_pull @ hover",
  "capture_drop @ foe ground",
  "capture_wobble x up to 3 wobbles (beat-synced)",
  "capture_success OR capture_breakout_<type>"
 ],
 "silhouette_scale": {
  "frames": [
   0,
   1,
   2,
   3,
   4,
   5,
   6
  ],
  "scale": [
   1.0,
   0.85,
   0.66,
   0.48,
   0.3,
   0.16,
   0.06
  ],
  "pivot": "hover point",
  "resample": "nearest only"
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
 "guardian_note": "Guardians have very low odds: use odds ring f0 and the generic break-out unless their element maps elsewhere; add the battle shake (soul/battle_feedback hook_specs shake super) on break-out frame 2.",
 "reduced_motion": {
  "throw": "skip capture_throw: show capture_pull frame 0 at hover for 200 ms",
  "pull": "play frames 0,4,7 only (200 ms each)",
  "wobble": "replace tilts with the rest pose; keep the per-wobble brightness change on the beat",
  "success": "frames 0,1,6",
  "breakout": "frames 0,2,6"
 },
 "sfx_cues": {
  "capture_throw": 0,
  "capture_pull": 0,
  "capture_drop": [
   4,
   8
  ],
  "capture_wobble": [
   0,
   8,
   16
  ],
  "capture_success": 1,
  "breakout": 2
 },
 "layering": "all capture sprites draw above the foe and below the HP boxes/UI"
}
```

## Time-of-day check

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| throw_pull | 0.746 | 0.758 | 0.689 | 0.565 | yes |
| pull | 0.819 | 0.831 | 0.756 | 0.74 | yes |
| drop_wobble | 0.852 | 0.856 | 0.852 | 0.7 | yes |
| drop | 0.772 | 0.776 | 0.772 | 0.719 | yes |
| success | 0.964 | 0.971 | 0.964 | 0.673 | yes |
| break_generic | 0.943 | 0.943 | 0.943 | 0.762 | yes |
| break_fire | 0.605 | 0.605 | 0.605 | 0.566 | yes |
| break_water | 0.68 | 0.684 | 0.68 | 0.627 | yes |
| break_wind | 0.812 | 0.836 | 0.812 | 0.634 | yes |
| odds | 0.725 | 0.729 | 0.663 | 0.65 | yes |

Grading: emissive `all` -> lit grade, `none` -> sprite grade, `mask` -> per pixel. Order: palette swaps (cosmic -> Warmth) -> ToD grade.

## Previews

- `capture/_preview/capture_contact_2x.png`
- `capture/_preview/capture_full_breakout_fire_2x.gif`
- `capture/_preview/capture_full_breakout_generic_2x.gif`
- `capture/_preview/capture_full_breakout_water_2x.gif`
- `capture/_preview/capture_full_breakout_wind_2x.gif`
- `capture/_preview/capture_full_success_2x.gif`
- ToD strips: 20 files in `capture/_preview/*_tod_2x.*`

## Weak spots / needs artist polish

- Code-drawn crystal: needs an artist pass on facets and the clasp band at 1x.
- Fire break-out reads well only because of the INK outline + lit embers; water/wind are flatter.
- Breakout-by-element table is a guess for the new elements; Game dev/Story should confirm.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_capture.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
