# Soul pass: #12 Ambient life

Fish jump (the tileset fish shadow and ripple are reused unchanged), Sailquill-coloured flock birds (peck/look/hop idle,
takeoff and fly) that scatter when the player runs or bikes but not when walking, emissive fireflies that fade to an orange
ember within 2 tiles of crystals, buddy paw prints (sand/snow/mud), wet prints (player and buddy) and splash/wade rings.

## Layout

Each animation folder holds `1x/<name>_NN.png` (transparent, hard pixels, palette-only), `2x/<name>_NN_2x.png` (exact nearest-neighbour), `<name>_sheet.png` + `<name>_sheet_2x.png` (frames left to right) and `<name>_2x.gif`. Timing, anchors and paths are in `_meta.json` and in the manifest key `soul.ambient`.

## Assets (46 animations)

| animation (folder) | kind | size | frames | ms per frame | anchor | loop | creatures |
|---|---|---|---|---|---|---|---|
| `fish/fish_jump_right` | overlay | 64x96 | 13 | 90,60,60,60,60,60,60,60,80,90,110,130,150 | [0, 32] | no | - |
| `fish/fish_jump_left` | overlay | 64x96 | 13 | 90,60,60,60,60,60,60,60,80,90,110,130,150 | [0, 32] | no | - |
| `birds/flock_bird_peck_right` | overlay | 24x24 | 4 | 160,120,140,120 | [12, 21] | yes | - |
| `birds/flock_bird_look_right` | overlay | 24x24 | 1 | 600 | [12, 21] | yes | - |
| `birds/flock_bird_hop_right` | overlay | 24x24 | 3 | 80 | [12, 21] | no | - |
| `birds/flock_bird_takeoff_right` | overlay | 24x24 | 2 | 50 | [12, 21] | no | - |
| `birds/flock_bird_fly_right` | overlay | 24x24 | 4 | 50 | [12, 21] | yes | - |
| `birds/flock_bird_peck_left` | overlay | 24x24 | 4 | 160,120,140,120 | [12, 21] | yes | - |
| `birds/flock_bird_look_left` | overlay | 24x24 | 1 | 600 | [12, 21] | yes | - |
| `birds/flock_bird_hop_left` | overlay | 24x24 | 3 | 80 | [12, 21] | no | - |
| `birds/flock_bird_takeoff_left` | overlay | 24x24 | 2 | 50 | [12, 21] | no | - |
| `birds/flock_bird_fly_left` | overlay | 24x24 | 4 | 50 | [12, 21] | yes | - |
| `birds/flock_bird_shadow` | overlay | 8x3 | 1 | 100 | [4, 1] | yes | - |
| `fireflies/firefly_bright` | overlay | 9x9 | 6 | 110 | [4, 4] | yes | - |
| `fireflies/firefly_dim` | overlay | 9x9 | 6 | 160 | [4, 4] | yes | - |
| `fireflies/firefly_dim_in` | overlay | 9x9 | 5 | 90,90,110,130,160 | [4, 4] | no | - |
| `prints/pawprint_sand_down` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_sand_up` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_sand_left` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_sand_right` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_snow_down` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_snow_up` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_snow_left` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_snow_right` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_mud_down` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_mud_up` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_mud_left` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/pawprint_mud_right` | overlay | 64x64 | 3 | 1333 | [0, 0] | no | - |
| `prints/wetprint_sand_down` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_sand_down` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_sand_up` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_sand_up` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_sand_left` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_sand_left` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_sand_right` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_sand_right` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_ground_down` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_ground_down` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_ground_up` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_ground_up` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_ground_left` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_ground_left` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetprint_ground_right` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `prints/wetpaw_ground_right` | overlay | 64x64 | 3 | 1000 | [0, 0] | no | - |
| `water/splash_ring` | overlay | 64x64 | 6 | 50,60,70,80,90,110 | [0, 0] | no | - |
| `water/wade_ring` | overlay | 64x64 | 4 | 220,220,260,220 | [0, 0] | yes | - |

## Per-animation notes

* `fish/fish_jump_right`: Draw at (spot_x*64, spot_y*64-32). Hide fish_shadow during; resume it at +34 px.
* `fish/fish_jump_left`: Mirror of fish_jump_right (resume shadow at -34 px).
* `birds/flock_bird_peck_right`: Idle peck loop.
* `birds/flock_bird_look_right`: Hold 400-900 ms.
* `birds/flock_bird_hop_right`: Move 4-8 px during frame 1.
* `birds/flock_bird_takeoff_right`: Then fly loop.
* `birds/flock_bird_fly_right`: Scatter flight loop.
* `birds/flock_bird_shadow`: Ground shadow under a flying bird; dissolve after 6 ticks.
* `fireflies/firefly_bright`: Emissive. Draw after the night grade.
* `fireflies/firefly_dim`: Near crystal (<=2 tiles).
* `fireflies/firefly_dim_in`: Bright -> dim once; reverse to brighten.
* `prints/pawprint_sand_down`: Trail Buddy prints; same rule as tileset footprints.
* `prints/wetprint_sand_down`: Player wet prints (shape = the world footprint tiles, recoloured).
* `prints/wetpaw_sand_down`: Buddy wet prints.
* `water/splash_ring`: Once per step into shallow water; cell top-left; foot (32,58).
* `water/wade_ring`: Loop while standing in shallow water.

## Coder hook notes

* Footprints follow the tileset rule: 3 frames x 1333 ms, about 4 s.
* Paw prints replace the human prints the tileset currently spawns for the follower.
* No shallow-water tile exists yet. Splash rings trigger on cells tagged shallow and on Rillop wade cells. The pond preview uses the route1 sand pond.
* The snow preview is a synthetic strip because no snow map exists yet.
* Previews are rendered from the live world tileset, which the world team regenerates on this shared box. If a preview looks corrupted, re-run `gen_ambient.py <preview>` (the names are contacts, fish, birds, fireflies, pond, snow).

The full parameters are in `hook_specs.json`, embedded here:

```json
{
 "fish": {
  "reuse": "tileset fish_shadow (1165, 4 fr x 200 ms, alpha-96 shadow) + fish_ripple (1166) at map.ambient.fish_spots - unchanged",
  "jump": {
   "asset": "fish_jump_right / fish_jump_left",
   "frame": "64x96, draw at (spot_x*64, spot_y*64-32); bottom 64 px = the spot cell; waterline y=74",
   "chance": "each visible shadow: one jump every 12-30 s (random), never two at once per map; not while raining; not at Night (shadows hide at Night? keep: Night allowed in brookhollow only if fish_spots visible)",
   "sequence": "hide the shadow on frame 0, play 13 frames once (total 1.07 s), show the shadow again 1 tile right/left (where the fish landed: +34 px) and resume drifting",
   "direction": "right or left at random; use the mirrored strip for left",
   "layer": "over water, under characters (frames 2-6 above everything on the water row is fine: the fish stays inside the cell above)",
   "sound": "small plip on frame 0, splash on frame 8"
  }
 },
 "birds": {
  "asset": "flock_bird_* (24x24, foot anchor (12,21), facing right; mirror for left) + flock_bird_shadow (8x3, centre (4,1))",
  "where": "route1 dirt paths (playbook 2.5): spawn groups of 3-5 on path cells off-screen-ish, 6-14 px random offsets inside the cell; day/dusk only; none in rain",
  "idle": "per bird random loop: peck (4 fr x 120 ms), look (hold 400-900 ms), hop (3 fr x 80 ms, moves 4-8 px), stand; desynchronise with random start",
  "trigger": {
   "run_or_bike": "player RUNNING or BIKING within 3 tiles (Chebyshev) of a bird -> whole group scatters, staggered 0-120 ms per bird",
   "walk": "WALKING never scatters them (playbook: \"scatter when you run, not when you walk\"); a bird whose cell the player walks into hops 1 cell aside (hop x2) and keeps pecking",
   "buddy": "the Trail Buddy never scatters them (Sailquill buddy: birds look up = look pose)"
  },
  "scatter": {
   "frames": "flock_bird_takeoff (2 fr x 50 ms) then flock_bird_fly loop (4 fr x 50 ms)",
   "path": "away from the player: dx = +-5 px/frame (40 ms tick), dy = -3 px/frame, plus random +-1 jitter; shadow stays on the ground and slides with dx, dissolves after 6 ticks",
   "despawn": "when off-screen; respawn the group on another path cell 20-40 s later while it is off-camera"
  },
  "sound": "flutter burst on scatter (one per group)"
 },
 "fireflies": {
  "asset": "firefly_bright (6 fr x 110 ms loop), firefly_dim (6 fr x 160 ms loop), firefly_dim_in (5 fr once; reverse = brighten). 9x9, centre (4,4). EMISSIVE: draw after the night grade, unaffected by it",
  "where_when": "Night in fernwick (pond x15-18, y20-21) and thornwood (glades); Dusk: half count. Count in fernwick follows sq_fireflies: 3 at sq_fireflies_start, 12 at sq_fireflies_done (8.5-D)",
  "motion": "code-driven drift per firefly: x = cx + 22*sin(t/1700 + p1) + 6*sin(t/530 + p2), y = cy + 10*sin(t/1100 + p3) - 4; cx,cy = home cell centre; random p1..p3",
  "crystal_dim": "distance to the nearest crystal ore / dig-scar tile (thornwood (27,11), greystone_entrance (16,12), route1 crystal cluster): <= 2 tiles -> play firefly_dim_in once then firefly_dim; also push the home point 0.5 px/tick away; back outside 2.5 tiles -> reverse dim_in then bright. After the scar is planted with lumen moss (sq_fireflies_scar_N) the radius for that scar is 0",
  "layer": "above characters"
 },
 "prints": {
  "reuse": "tileset footprint_{snow,sand,mud}_{dir} for the player (unchanged rule: spawn on the cell left, 3 frames x 1333 ms, max 24)",
  "pawprint": "pawprint_{sand,snow,mud}_{dir}: same rule for the Trail Buddy (replaces the human prints the tileset rule currently spawns for the follower). 3 frames x 1333 ms, 64x64 decal, cell top-left, under characters. Flying buddies (Sailquill) leave none",
  "wet": "wetprint_{sand,ground}_{dir} (player) and wetpaw_{sand,ground}_{dir} (buddy): after leaving water/shallow (Tideglide dismount, wading Rillop, shallow cells) spawn on the next 6 cells left; frames full/60%/30% x 1000 ms; \"sand\" on sand ground, \"ground\" everywhere else except water; none on snow (snow prints win)"
 },
 "splash": {
  "splash_ring": "6 fr (460 ms) once per step that ENDS on a shallow-water cell (and every buddy step while Rillop wades); 64x64 decal on that cell, under characters except the drops (fine to draw all of it under the feet)",
  "wade_ring": "4 fr loop while standing in shallow water",
  "shallow_cells": "there is no shallow-water tile yet: trigger on cells tagged shallow (World Design to add), and on Rillop wade cells; until then preview uses the route1 sand pond edge"
 },
 "reduced_motion": "birds still scatter but fly straight up-out in 6 ticks; fish jumps off (ripples stay); fireflies keep the pulse but drift amplitude halved"
}
```

## Previews

* `previews/birds_contact_4x.png`
* `previews/birds_walk_vs_run_route1_2x.gif`
* `previews/fireflies_contact_4x.png`
* `previews/fireflies_dim_near_crystal_thornwood_night_2x.gif`
* `previews/fireflies_dim_near_crystal_thornwood_night_zoom_4x.gif`
* `previews/fireflies_fernwick_pond_12_night_2x.gif`
* `previews/fireflies_fernwick_pond_3_night_2x.gif`
* `previews/fish_jump_brookhollow_2x.gif`
* `previews/fish_jump_contact_2x.png`
* `previews/fish_jump_thornwood_pond_2x.gif`
* `previews/prints_snow_synthetic_strip_2x.gif`
* `previews/prints_water_contact_2x.png`
* `previews/prints_wet_splash_route1_pond_2x.gif`

## Reproduce / validate

```
cd art/characters/pixel/soul/_tools
python3 gen_ambient.py
python3 validate_soul.py ambient
python3 write_manifest.py
```
