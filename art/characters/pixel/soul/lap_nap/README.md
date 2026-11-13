# Soul pass: #15 Lap nap

Heal-centre sofa (heal_centre_int, sofa at (1,7)). The player stands at (1,8) facing up and stays idle for 30 s after a heal.
The player sits on the sofa and the Trail Buddy hops into their lap, curls up and sleeps (zZz). The healer turns and says
"Don't move. Those are the rules." (text only, not art).

* Seated body: the run_bike `seated_upper` part placed on the seat, plus the bottom 10 rows of the walk-stand legs.
  The thighs are foreshortened toward the camera.
* The buddy curls facing the player (back view squashed by 32% of its height), with a 1-row breathing loop.
* The big creatures (bastonox, forgeharrow, tidemarrow) do not fit in a lap. They sleep at the player's feet on (2,8): `<c>_feet_sleep`.

## Layout

Each animation folder holds `1x/<name>_NN.png` (transparent, hard pixels, palette-only), `2x/<name>_NN_2x.png` (exact nearest-neighbour), `<name>_sheet.png` + `<name>_sheet_2x.png` (frames left to right) and `<name>_2x.gif`. Timing, anchors and paths are in `_meta.json` and in the manifest key `soul.lap_nap`.

## Assets (48 animations)

| animation (folder) | kind | size | frames | ms per frame | anchor | loop | creatures |
|---|---|---|---|---|---|---|---|
| `cal/cal_sofa_seated` | human | 64x96 | 3 | 1400,1200,1300 | [32, 93] | yes | - |
| `cal/cal_sofa_sit_down` | overlay | 64x160 | 7 | 120,140,60,60,60,80,200 | [32, 157] | no | - |
| `cal/cal_sofa_stand_up` | overlay | 64x160 | 7 | 60,60,60,60,80,120,100 | [32, 157] | no | - |
| `mira/mira_sofa_seated` | human | 64x96 | 3 | 1400,1200,1300 | [32, 93] | yes | - |
| `mira/mira_sofa_sit_down` | overlay | 64x160 | 7 | 120,140,60,60,60,80,200 | [32, 157] | no | - |
| `mira/mira_sofa_stand_up` | overlay | 64x160 | 7 | 60,60,60,60,80,120,100 | [32, 157] | no | - |
| `buddies/<c>/brookhorn_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | brookhorn |
| `buddies/<c>/brookhorn_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | brookhorn |
| `buddies/<c>/brookhorn_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | brookhorn |
| `buddies/<c>/burlbeetle_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | burlbeetle |
| `buddies/<c>/burlbeetle_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | burlbeetle |
| `buddies/<c>/burlbeetle_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | burlbeetle |
| `buddies/<c>/burrowmane_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | burrowmane |
| `buddies/<c>/burrowmane_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | burrowmane |
| `buddies/<c>/burrowmane_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | burrowmane |
| `buddies/<c>/cindrip_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | cindrip |
| `buddies/<c>/cindrip_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | cindrip |
| `buddies/<c>/cindrip_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | cindrip |
| `buddies/<c>/emberlunx_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | emberlunx |
| `buddies/<c>/emberlunx_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | emberlunx |
| `buddies/<c>/emberlunx_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | emberlunx |
| `buddies/<c>/gloamtick_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | gloamtick |
| `buddies/<c>/gloamtick_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | gloamtick |
| `buddies/<c>/gloamtick_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | gloamtick |
| `buddies/<c>/halovy_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | halovy |
| `buddies/<c>/halovy_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | halovy |
| `buddies/<c>/halovy_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | halovy |
| `buddies/<c>/mirewump_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | mirewump |
| `buddies/<c>/mirewump_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | mirewump |
| `buddies/<c>/mirewump_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | mirewump |
| `buddies/<c>/rillop_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | rillop |
| `buddies/<c>/rillop_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | rillop |
| `buddies/<c>/rillop_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | rillop |
| `buddies/<c>/runeskein_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | runeskein |
| `buddies/<c>/runeskein_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | runeskein |
| `buddies/<c>/runeskein_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | runeskein |
| `buddies/<c>/sailquill_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | sailquill |
| `buddies/<c>/sailquill_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | sailquill |
| `buddies/<c>/sailquill_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | sailquill |
| `buddies/<c>/slagrook_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | slagrook |
| `buddies/<c>/slagrook_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | slagrook |
| `buddies/<c>/slagrook_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | slagrook |
| `buddies/<c>/tumbloam_lap_settle` | creature | 64x64 | 7 | 70,90,120,120,160,200,400 | [32, 61] | no | tumbloam |
| `buddies/<c>/tumbloam_lap_sleep` | creature | 64x64 | 2 | 1100 | [32, 61] | yes | tumbloam |
| `buddies/<c>/tumbloam_lap_wake` | creature | 64x64 | 5 | 200,120,220,100,160 | [32, 61] | no | tumbloam |
| `buddies/<c>/bastonox_feet_sleep` | creature | 96x96 | 2 | 1300 | [48, 93] | yes | bastonox |
| `buddies/<c>/forgeharrow_feet_sleep` | creature | 96x96 | 2 | 1300 | [48, 93] | yes | forgeharrow |
| `buddies/<c>/tidemarrow_feet_sleep` | creature | 96x96 | 2 | 1300 | [48, 93] | yes | tidemarrow |

## Per-animation notes

* `cal/cal_sofa_seated`: Seated idle (1-row breathing). Draw at the sofa tile (1,7) like any 64x96 human frame. hip (32,82); lap point [32, 92].
* `cal/cal_sofa_sit_down`: 64x160 canvas: bottom = bottom of row 8. Anchor (32,157) = foot point on STAND (1,8); canvas top-left = (1*64, 7*64-32).
* `cal/cal_sofa_stand_up`: Reverse of sit_down; ends facing down on (1,8).
* `buddies/<c>/brookhorn_lap_settle`: After the hop: foot (32,61) on the lap point.
* `buddies/<c>/brookhorn_lap_sleep`: Loop + emote_zzz at zzz_anchor.
* `buddies/<c>/brookhorn_lap_wake`: Stretch, then hop down (reverse HOP).
* `buddies/<c>/bastonox_feet_sleep`: Too big for a lap: curls on the floor at (2,8), against the player's shins (frame placed like a 96x96 overworld frame).

## Coder hook notes

* `<name>_sofa_sit_down` / `_stand_up` are 64x160 overlays with anchor (32,157) = the (1,8) foot point. The canvas top-left is at map (64, 7*64-32).
* `<name>_sofa_seated` is a normal 64x96 human frame drawn at the sofa tile (1,7).
* Draw order: sofa < player < buddy < emote.
* Warmth +2 is granted once per in-game day (a flag for Coder). The scene itself can replay.

The full parameters are in `hook_specs.json`, embedded here:

```json
{
 "trigger": {
  "map": "heal_centre_int",
  "interact_spot": "sofa (1,7)",
  "player_tile": [
   1,
   8
  ],
  "facing": "up",
  "condition": "player idle (no input) 30 000 ms on (1,8) facing up, after a heal this visit; Trail Buddy out (not in ball); once per in-game day gives +2 Warmth (flag), the scene itself can replay",
  "cancel": "any input during the 30 s resets the timer"
 },
 "sequence": [
  "1. player: <name>_sofa_sit_down (7 fr, 64x160 canvas, anchor (32,157) on the (1,8) foot point). Lock input.",
  "2. buddy walks to (1,8) (normal follow step, facing up), then hops into the lap: use its up walk1 frame, tween its foot from (96, 8*64+61) to the lap point over 6 frames; add the HOP lift (px up) per frame; land with a 1-frame vscale(3) squash (= settle frame 0).",
  "3. buddy: <c>_lap_settle (7 fr) then <c>_lap_sleep loop; after the first sleep frame show emote_zzz (spotted/emotes) loop at zzz_anchor, 600 ms per frame.",
  "4. player: <name>_sofa_seated loop (draw the buddy AFTER the player).",
  "5. after 2 s of sleep: healer line (text) \"Don't move. Those are the rules.\" - healer at (6,3) faces left toward the sofa while it shows.",
  "6. any input: buddy <c>_lap_wake, hop down (HOP reversed) to (1,8)->(1,9) follow slot, then <name>_sofa_stand_up; unlock."
 ],
 "lap_point_px": {
  "cal": [
   96,
   508
  ],
  "mira": [
   96,
   508
  ]
 },
 "hop_lift": [
  [
   -6,
   70
  ],
  [
   -14,
   60
  ],
  [
   -18,
   60
  ],
  [
   -14,
   60
  ],
  [
   -4,
   60
  ],
  [
   0,
   80
  ]
 ],
 "zzz_anchor": "emote bottom-centre at (bbox right-6+12, bbox top-1) of the current sleep frame, i.e. top-right of the curled buddy; see zzz_anchor_per_creature",
 "big_creatures": "bastonox, forgeharrow, tidemarrow (96x96) do not fit a lap: walk to (2,8), face up, <c>_feet_sleep loop with emote_zzz; same text and Warmth",
 "draw_order": "sofa (decoration) < player < buddy < emote",
 "reduced_motion": "skip the hop tween (cut straight to settle frame 6) and the breathing loops (hold frame 0)",
 "music_sfx_note": "not art: a soft purr/snore every 2 sleep cycles is suggested",
 "zzz_anchor_per_creature": {
  "brookhorn": [
   52,
   24
  ],
  "burlbeetle": [
   55,
   31
  ],
  "burrowmane": [
   55,
   24
  ],
  "cindrip": [
   54,
   30
  ],
  "emberlunx": [
   50,
   24
  ],
  "gloamtick": [
   55,
   26
  ],
  "halovy": [
   58,
   24
  ],
  "mirewump": [
   52,
   31
  ],
  "rillop": [
   53,
   28
  ],
  "runeskein": [
   48,
   30
  ],
  "sailquill": [
   58,
   27
  ],
  "slagrook": [
   55,
   27
  ],
  "tumbloam": [
   54,
   28
  ]
 },
 "seated_hip": {
  "cal": [
   32,
   82
  ],
  "mira": [
   32,
   82
  ]
 }
}
```

## Previews

* `previews/lap_nap_all_buddies_contact_2x.png`
* `previews/lap_nap_big_buddies_feet_contact_2x.png`
* `previews/lap_nap_cal_rillop_heal_centre_2x.gif`
* `previews/lap_nap_mira_tumbloam_heal_centre_2x.gif`

## Reproduce / validate

```
cd art/characters/pixel/soul/_tools
python3 gen_lap_nap.py
python3 validate_soul.py lap_nap
python3 write_manifest.py
```
