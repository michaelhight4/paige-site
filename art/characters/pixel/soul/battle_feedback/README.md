# Soul pass: #5 Battle hit feedback and transitions

Code-driven: hit-stop, white flash, screen shake, HP drain (parameters in `hook_specs.json`; reference GIFs in previews/).
Drawn: per-creature solid flash silhouettes (`_flash`), the crystal-flicker faint (`_faint`, 7 flicker + 3 fade), the
crystal-overuse crack (`_overuse`), front (enemy) and back (player) views at the battle sprite sizes, and seven 320x240
battle-start transitions: wild_leaf, enraged_shard, trainer_bars, ron_jacket, master_coin, guardian_whiteout, reduced_motion_fade.

## Layout

Each animation folder holds `1x/<name>_NN.png` (transparent, hard pixels, palette-only), `2x/<name>_NN_2x.png` (exact nearest-neighbour), `<name>_sheet.png` + `<name>_sheet_2x.png` (frames left to right) and `<name>_2x.gif`. Timing, anchors and paths are in `_meta.json` and in the manifest key `soul.battle_feedback`.

## Assets (103 animations)

| animation (folder) | kind | size | frames | ms per frame | anchor | loop | creatures |
|---|---|---|---|---|---|---|---|
| `creatures/<c>/bastonox_front_flash` | battle_creature | 160x160 | 1 | 33 | [80, 157] | no | bastonox |
| `creatures/<c>/bastonox_front_faint` | battle_creature | 160x160 | 10 | 60,60,80,50,90,60,200,75,75,75 | [80, 157] | no | bastonox |
| `creatures/<c>/bastonox_front_overuse` | battle_creature | 160x160 | 4 | 70,140,120,60 | [80, 157] | no | bastonox |
| `creatures/<c>/bastonox_back_flash` | battle_creature | 160x160 | 1 | 33 | [80, 157] | no | bastonox |
| `creatures/<c>/bastonox_back_faint` | battle_creature | 160x160 | 10 | 60,60,80,50,90,60,200,75,75,75 | [80, 157] | no | bastonox |
| `creatures/<c>/bastonox_back_overuse` | battle_creature | 160x160 | 4 | 70,140,120,60 | [80, 157] | no | bastonox |
| `creatures/<c>/brookhorn_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | brookhorn |
| `creatures/<c>/brookhorn_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | brookhorn |
| `creatures/<c>/brookhorn_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | brookhorn |
| `creatures/<c>/brookhorn_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | brookhorn |
| `creatures/<c>/brookhorn_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | brookhorn |
| `creatures/<c>/brookhorn_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | brookhorn |
| `creatures/<c>/burlbeetle_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | burlbeetle |
| `creatures/<c>/burlbeetle_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | burlbeetle |
| `creatures/<c>/burlbeetle_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | burlbeetle |
| `creatures/<c>/burlbeetle_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | burlbeetle |
| `creatures/<c>/burlbeetle_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | burlbeetle |
| `creatures/<c>/burlbeetle_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | burlbeetle |
| `creatures/<c>/burrowmane_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | burrowmane |
| `creatures/<c>/burrowmane_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | burrowmane |
| `creatures/<c>/burrowmane_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | burrowmane |
| `creatures/<c>/burrowmane_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | burrowmane |
| `creatures/<c>/burrowmane_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | burrowmane |
| `creatures/<c>/burrowmane_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | burrowmane |
| `creatures/<c>/cindrip_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | cindrip |
| `creatures/<c>/cindrip_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | cindrip |
| `creatures/<c>/cindrip_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | cindrip |
| `creatures/<c>/cindrip_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | cindrip |
| `creatures/<c>/cindrip_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | cindrip |
| `creatures/<c>/cindrip_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | cindrip |
| `creatures/<c>/emberlunx_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | emberlunx |
| `creatures/<c>/emberlunx_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | emberlunx |
| `creatures/<c>/emberlunx_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | emberlunx |
| `creatures/<c>/emberlunx_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | emberlunx |
| `creatures/<c>/emberlunx_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | emberlunx |
| `creatures/<c>/emberlunx_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | emberlunx |
| `creatures/<c>/forgeharrow_front_flash` | battle_creature | 160x160 | 1 | 33 | [80, 157] | no | forgeharrow |
| `creatures/<c>/forgeharrow_front_faint` | battle_creature | 160x160 | 10 | 60,60,80,50,90,60,200,75,75,75 | [80, 157] | no | forgeharrow |
| `creatures/<c>/forgeharrow_front_overuse` | battle_creature | 160x160 | 4 | 70,140,120,60 | [80, 157] | no | forgeharrow |
| `creatures/<c>/forgeharrow_back_flash` | battle_creature | 160x160 | 1 | 33 | [80, 157] | no | forgeharrow |
| `creatures/<c>/forgeharrow_back_faint` | battle_creature | 160x160 | 10 | 60,60,80,50,90,60,200,75,75,75 | [80, 157] | no | forgeharrow |
| `creatures/<c>/forgeharrow_back_overuse` | battle_creature | 160x160 | 4 | 70,140,120,60 | [80, 157] | no | forgeharrow |
| `creatures/<c>/gloamtick_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | gloamtick |
| `creatures/<c>/gloamtick_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | gloamtick |
| `creatures/<c>/gloamtick_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | gloamtick |
| `creatures/<c>/gloamtick_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | gloamtick |
| `creatures/<c>/gloamtick_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | gloamtick |
| `creatures/<c>/gloamtick_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | gloamtick |
| `creatures/<c>/halovy_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | halovy |
| `creatures/<c>/halovy_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | halovy |
| `creatures/<c>/halovy_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | halovy |
| `creatures/<c>/halovy_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | halovy |
| `creatures/<c>/halovy_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | halovy |
| `creatures/<c>/halovy_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | halovy |
| `creatures/<c>/mirewump_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | mirewump |
| `creatures/<c>/mirewump_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | mirewump |
| `creatures/<c>/mirewump_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | mirewump |
| `creatures/<c>/mirewump_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | mirewump |
| `creatures/<c>/mirewump_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | mirewump |
| `creatures/<c>/mirewump_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | mirewump |
| `creatures/<c>/rillop_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | rillop |
| `creatures/<c>/rillop_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | rillop |
| `creatures/<c>/rillop_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | rillop |
| `creatures/<c>/rillop_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | rillop |
| `creatures/<c>/rillop_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | rillop |
| `creatures/<c>/rillop_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | rillop |
| `creatures/<c>/runeskein_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | runeskein |
| `creatures/<c>/runeskein_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | runeskein |
| `creatures/<c>/runeskein_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | runeskein |
| `creatures/<c>/runeskein_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | runeskein |
| `creatures/<c>/runeskein_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | runeskein |
| `creatures/<c>/runeskein_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | runeskein |
| `creatures/<c>/sailquill_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | sailquill |
| `creatures/<c>/sailquill_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | sailquill |
| `creatures/<c>/sailquill_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | sailquill |
| `creatures/<c>/sailquill_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | sailquill |
| `creatures/<c>/sailquill_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | sailquill |
| `creatures/<c>/sailquill_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | sailquill |
| `creatures/<c>/slagrook_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | slagrook |
| `creatures/<c>/slagrook_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | slagrook |
| `creatures/<c>/slagrook_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | slagrook |
| `creatures/<c>/slagrook_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | slagrook |
| `creatures/<c>/slagrook_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | slagrook |
| `creatures/<c>/slagrook_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | slagrook |
| `creatures/<c>/tidemarrow_front_flash` | battle_creature | 160x160 | 1 | 33 | [80, 157] | no | tidemarrow |
| `creatures/<c>/tidemarrow_front_faint` | battle_creature | 160x160 | 10 | 60,60,80,50,90,60,200,75,75,75 | [80, 157] | no | tidemarrow |
| `creatures/<c>/tidemarrow_front_overuse` | battle_creature | 160x160 | 4 | 70,140,120,60 | [80, 157] | no | tidemarrow |
| `creatures/<c>/tidemarrow_back_flash` | battle_creature | 160x160 | 1 | 33 | [80, 157] | no | tidemarrow |
| `creatures/<c>/tidemarrow_back_faint` | battle_creature | 160x160 | 10 | 60,60,80,50,90,60,200,75,75,75 | [80, 157] | no | tidemarrow |
| `creatures/<c>/tidemarrow_back_overuse` | battle_creature | 160x160 | 4 | 70,140,120,60 | [80, 157] | no | tidemarrow |
| `creatures/<c>/tumbloam_front_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | tumbloam |
| `creatures/<c>/tumbloam_front_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | tumbloam |
| `creatures/<c>/tumbloam_front_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | tumbloam |
| `creatures/<c>/tumbloam_back_flash` | battle_creature | 128x128 | 1 | 33 | [64, 125] | no | tumbloam |
| `creatures/<c>/tumbloam_back_faint` | battle_creature | 128x128 | 10 | 60,60,80,50,90,60,200,75,75,75 | [64, 125] | no | tumbloam |
| `creatures/<c>/tumbloam_back_overuse` | battle_creature | 128x128 | 4 | 70,140,120,60 | [64, 125] | no | tumbloam |
| `transitions/wild_leaf` | screen | 320x240 | 10 | 45 | [0, 0] | no | - |
| `transitions/enraged_shard` | screen | 320x240 | 10 | 45 | [0, 0] | no | - |
| `transitions/trainer_bars` | screen | 320x240 | 8 | 50 | [0, 0] | no | - |
| `transitions/ron_jacket` | screen | 320x240 | 9 | 45 | [0, 0] | no | - |
| `transitions/master_coin` | screen | 320x240 | 14 | 70 | [0, 0] | no | - |
| `transitions/guardian_whiteout` | screen | 320x240 | 10 | 120 | [0, 0] | no | - |
| `transitions/reduced_motion_fade` | screen | 320x240 | 4 | 75 | [0, 0] | no | - |

## Per-animation notes

* `creatures/<c>/bastonox_front_flash`: White hit-flash silhouette (draw instead of the sprite on flash frames, see hook_specs.hit_flash).
* `creatures/<c>/bastonox_front_faint`: Faint: 7 crystal-flicker frames (bright->dim->out) then 3 Bayer fade frames; apply hook_specs.faint.drop offset during the fade frames.
* `creatures/<c>/bastonox_front_overuse`: Energy overuse: crystal hot-pink flash + glow ring, crack + shard sparks, crack on normal crystal, back to normal.
* `transitions/wild_leaf`: Wild encounter in grass: leaf wipe left->right. Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.
* `transitions/enraged_shard`: Enraged variant (design doc: "aggressive"): jagged red-violet crystal shards stab in and lock. Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.
* `transitions/trainer_bars`: Any trainer (also company staff and opposition, see README): horizontal bars alternate in. Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.
* `transitions/ron_jacket`: Ron battles: rust chevrons in his jacket colour. Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.
* `transitions/master_coin`: Master battles: coin spin, lands, fills screen. Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.
* `transitions/guardian_whiteout`: Guardian/legendary: slow dithered white-out. Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.
* `transitions/reduced_motion_fade`: Reduced-motion fallback for ALL contexts (no movement, 300 ms). Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.

## Coder hook notes

* Shake moves the world layer only. The HUD stays still.
* A critical hit freezes for 90 ms (the playbook only defines 60 ms).
* Company staff and opposition trainers use trainer_bars because the playbook lists no transition for them.
* The aggressive wild variant is called "Enraged" here.

The full parameters are in `hook_specs.json`, embedded here:

```json
{
 "frame_ms": 33,
 "hit_sequence_order": [
  "impact frame of the attack effect lands",
  "hit_stop",
  "hit_flash (overlaps first shake frames)",
  "shake",
  "hp_drain"
 ],
 "hit_stop": {
  "ms": 60,
  "what": "freeze ALL battle animation (effects, idles, bobbing). Audio keeps playing; the hit SFX starts at freeze start.",
  "critical_ms": 90,
  "note": "critical = 90 ms (our choice; playbook only defines 60 ms)"
 },
 "hit_flash": {
  "colour": "fcf6e8",
  "frames": 2,
  "pattern_ms": [
   [
    "white",
    33
   ],
   [
    "normal",
    33
   ],
   [
    "white",
    33
   ],
   [
    "normal",
    0
   ]
  ],
  "how": "draw the target as a solid fcf6e8 silhouette (provided per creature: creatures/<c>/<c>_<view>_flash) on the white frames. First white frame starts with hit_stop.",
  "reduced_motion": "one frame of 50% Bayer white (bayer_fade of the silhouette at t=0.5) for 33 ms"
 },
 "shake": {
  "axis": "x",
  "applies_to": "world layer (background, platforms, both creatures); HUD/HP boxes stay still for readability",
  "normal": {
   "amplitude_px": 3,
   "offsets_px": [
    3,
    -3,
    2,
    -2,
    1,
    -1,
    0
   ],
   "ms_per_step": 33,
   "total_ms": 231
  },
  "strong_hit": {
   "amplitude_px": 6,
   "offsets_px": [
    6,
    -6,
    4,
    -4,
    3,
    -2,
    1,
    -1,
    0
   ],
   "ms_per_step": 33,
   "total_ms": 297,
   "when": "the move is strong against the target (type advantage)"
  },
  "decay": "roughly linear: amplitude x (1 - step/steps), sign alternates; table above is authoritative (pixel-integer, native 320x240)",
  "reduced_motion": "no shake"
 },
 "hp_drain": {
  "starts": "after shake ends",
  "rate_ms_per_hp_px": 12,
  "min_ms": 200,
  "max_ms": 900,
  "tick_sfx": "every 3 bar px (bar is 102 px wide)",
  "colours": {
   ">50%": "78ba48",
   "20-50%": "e29d40",
   "<20%": "a23432"
  }
 },
 "faint": {
  "frames": "creatures/<c>/<c>_<view>_faint (7 flicker + 3 fade)",
  "flicker_ms": [
   60,
   60,
   80,
   50,
   90,
   60,
   200
  ],
  "fade_ms": [
   75,
   75,
   75
  ],
  "drop": {
   "during": "fade frames + 75 ms after",
   "offsets_px": [
    0,
    4,
    10,
    18,
    28
   ],
   "ms_per_step": 75,
   "clip": "rows below the original foot line are hidden (sinks into the platform)"
  },
  "sfx": "cry pitched down at flicker start, thud at drop end",
  "reduced_motion": "play flicker, skip drop; fade frames still play"
 },
 "overuse": {
  "frames": "creatures/<c>/<c>_<view>_overuse",
  "ms": [
   70,
   140,
   120,
   60
  ],
  "trigger": "energy overuse event (any time the crystal is pushed past its limit)"
 },
 "transitions": {
  "wild_leaf": {
   "frames": "transitions/wild_leaf",
   "ms_per_frame": 45,
   "note": "Wild encounter in grass: leaf wipe left->right.",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  },
  "enraged_shard": {
   "frames": "transitions/enraged_shard",
   "ms_per_frame": 45,
   "note": "Enraged variant (design doc: \"aggressive\"): jagged red-violet crystal shards stab in and lock.",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  },
  "trainer_bars": {
   "frames": "transitions/trainer_bars",
   "ms_per_frame": 50,
   "note": "Any trainer (also company staff and opposition, see README): horizontal bars alternate in.",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  },
  "ron_jacket": {
   "frames": "transitions/ron_jacket",
   "ms_per_frame": 45,
   "note": "Ron battles: rust chevrons in his jacket colour.",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  },
  "master_coin": {
   "frames": "transitions/master_coin",
   "ms_per_frame": 70,
   "note": "Master battles: coin spin, lands, fills screen.",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  },
  "guardian_whiteout": {
   "frames": "transitions/guardian_whiteout",
   "ms_per_frame": 120,
   "note": "Guardian/legendary: slow dithered white-out.",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  },
  "reduced_motion_fade": {
   "frames": "transitions/reduced_motion_fade",
   "ms_per_frame": 75,
   "note": "Reduced-motion fallback for ALL contexts (no movement, 300 ms).",
   "after": "hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)",
   "draw": "screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)",
   "grade": "none",
   "emissive_if_graded": "all",
   "tod_note": "built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours fcd668, e8ce92, ecdec4, f8eabe, 603096, 8a4ace, b076ec, d6acff"
  }
 },
 "transition_context_map": {
  "wild (grass/cave/water)": "wild_leaf",
  "wild Enraged variant (doc: aggressive)": "enraged_shard",
  "trainer": "trainer_bars",
  "company staff (RT)": "trainer_bars (playbook lists none; violet bar edge already matches RT)",
  "opposition/dissident": "trainer_bars (playbook lists none)",
  "Ron": "ron_jacket",
  "Master": "master_coin",
  "Guardian / legendary": "guardian_whiteout",
  "reduced motion setting": "reduced_motion_fade"
 }
}
```

## Previews

* `previews/creatures_contact_a.png`
* `previews/creatures_contact_b.png`
* `previews/hit_feedback_2x.gif`
* `previews/hit_feedback_reduced_motion_2x.gif`
* `previews/overuse_crack_slow2x_2x.gif`
* `previews/transition_enraged_shard_2x.gif`
* `previews/transition_guardian_whiteout_2x.gif`
* `previews/transition_master_coin_2x.gif`
* `previews/transition_reduced_motion_fade_2x.gif`
* `previews/transition_ron_jacket_2x.gif`
* `previews/transition_trainer_bars_2x.gif`
* `previews/transition_wild_leaf_2x.gif`
* `previews/transitions_contact.png`

## Reproduce / validate

```
cd art/characters/pixel/soul/_tools
python3 gen_battle_feedback.py
python3 validate_soul.py battle_feedback
python3 write_manifest.py
```
