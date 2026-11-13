# Kilumen overworld: extra biome tiles (Frostspire snow, Mirefen swamp, train station, flood)

Everything here is **additive**. Nothing in `tools/*.py` (except the new `tools/biomes_extra.py`), `run.py`,
`tileset.json` or `maps/` was touched; another worker was editing those at the time.

## Files
| path | what |
|---|---|
| `tools/biomes_extra.py` | standalone generator. It imports `pixel.py` (PAL, SHADOW, pixelize) and `preview_util.py` read-only. Run it from this dir with `python3 tools/biomes_extra.py` (~70 s). It writes everything below and runs the checks. |
| `tiles_extra/{1x,2x,3x}/{terrain,transition,deco,overlay,fog,building,interior}.png` | sheets, 64 px native, nearest-neighbour 2x/3x |
| `tileset_extra.json` (+ `_2x`, `_3x`) | same schema as `tileset.json`, 677 tiles, ids **5001..5677**, every name prefixed **`x_`** |
| `maps_new/mirefen_bog.json` | 24x18 Mirefen bog (game map) |
| `maps_new/station_int.json` | 20x13 station interior (game map) |
| `maps_new/x_testbed.json`, `maps_new/x_station_ext.json` | **QA only** (`"qa_only": true`): snow/ice/flood/deep testbed and station exterior. Not game maps. |
| `maps_new/previews/*.png` | 3x renders, `*_debug.png` collision views, `mirefen_bog_f1.png` (animation frame 1), `mirefen_bog_fog_cleared.png`, `sheet_*.png` catalogues |

## Art rules (all checked by the generator)
64 px true grid, no AA, every opaque pixel is in `palette.hex` (4x4 Bayer via `pixel.pixelize`), binary alpha plus the one
shared shadow `rgba(26,18,38,96)`. Water-family animations use the same 4 frames at 220 ms with the same wave phase as base `water`,
so flood and deep water line up with existing water tiles.

## Tile families (all names `x_...`)
- **Snow / Frostspire:** `snow_0..2` (cool cream/ice-blue; replaces the pinkish base `snow_*` for Frostspire),
  `snow>grass_*` edges, `ice_0..1` (collision **ice**), `ice>snow_*` edges, `pine_snow` 2x2 + `pine_snow_small` 1x2 (top row is the overlay),
  `frozen_rock`, `frozen_rock_big`, and snow tall grass `tall_snow_*`. The tall grass is teal with an outline and white frost caps,
  sits tall, reads clearly against the snow, and has 3 rustle frames plus front/tips overlays, using the same structure as base `tall_grass_*`.
- **Swamp / Mirefen:** `bog` (3 frames, 320 ms, collision water), `bog>moss_*`, `bog>mud_*` shores, `mud_0..2`, `moss_0..2`,
  `mud>moss_*`, `reeds` / `reeds_water`, `dead_tree` (1x2), `tall_swamp_*` (lime blades, cattails, 3 rustle frames),
  `boardwalk_h/v` (walk) and `boardwalk_bike_h/v` (narrow planks, collision **bike_only 8**),
  `fog_NESW_q0..3` (192 frames: 16 edge masks x 4 positional variants x 3 drift frames at 600 ms).
- **Train station:** exterior `station` 7x5 (door = `x_station_4_3`, collision door), `rail_h_out/rail_v_out`, `rail_buffer`;
  interior `station_floor`, `platform_floor`, `platform_edge_n/s`, `rail_h/v` (interior), `iwall_top/upper/face_station`,
  `ticket_counter_l/m/r`, `bench` 2x1, `timetable` 2x1, `sign_restricted` 2x1 (**blank** board; the text lives in the map's
  `signs` entry: "Government restricted airspace: arrivals by rail only"), `station_pillar` 1x2, `station_mat` (door/warp).
- **Flood:** `flood` (cobbles visible under shallow water, 4 frames, collision walk), `flood>path_*`, `water>flood_*`,
  `deep_water` (collision **deep_water**), `deep>water_*`.

## What needs merging (owner of tileset.json / run.py / maps/)
1. **Collision codes.** Base codes are now walk0 block1 ledge_s2 water3 door4 boulder5 gate6 plate7 bike_only8 ramp9.
   This set adds **ice = 10** (walkable; the player slides until blocked) and **deep_water = 11** (needs Dive or strong Surf).
   It reuses bike_only 8 unchanged. Add 10 and 11 to `collision_codes` and to `src/overworld/movement.js` / `constants.js`.
2. **Tile ids.** The extra tiles are ids 5001+. Either load `tileset_extra.json` as a second tileset (id_offset 5000, so it can't
   collide with base ids 1..931), or append its tiles to `tileset.json` and renumber. If you renumber, remap
   the map layers with `old_id -> new_id`; every map in `maps_new/` only uses ids from this file.
3. **Sheets.** Register the 7 sheets above. `fog` is a new sheet and a new optional layer.
4. **Fog layer.** Maps can have a 6th layer `fog`. Draw it after the overlay. Each fog tile has `states: {fog: id, clear: 0}`.
   When the fog is cleared (Defog-style move or story flag, TBD), set every fog cell to its `clear` state (0).
   `mirefen_bog.json` has a `fog` block that describes this.
5. **Boardwalks.** `x_boardwalk_*` tiles have `overrides_ground: true`: the deco collision wins over the bog under them.
   `bike_only_capable: true` marks the plain boardwalk. To make a stretch bike-only, swap it to `x_boardwalk_bike_*`
   (collision 8). The bog map does this at x=12, y=4..7 and lists those cells in `bike.no_dismount_cells`. The islet item at (12,2) can
   only be reached by bike (checked by BFS).
6. **Tall grass.** `x_tall_snow_*` and `x_tall_swamp_*` follow base `tall_grass_*`: deco has `encounter: true`, the `front` / `tips_EW`
   overlays are y-sorted, and anim `rustle` has frames idx+1..+3 with idle_frame idx.
7. **Duplicates to remap if merged into the base tileset:** `x_grass_*`, `x_path_*`, `x_water`, `x_path>grass_*`, `x_water>grass_*`
   are copies of the base tiles (same seeds). They're only here so `tileset_extra.json` is self-contained. When you merge, point them at
   the base ids, or keep them; they're visually identical.
8. **Multi-tile objects.** `multi_tile_objects` lists `x_pine_snow`, `x_pine_snow_small`, `x_dead_tree`, `x_station`, `x_bench`,
   `x_timetable`, `x_sign_restricted`, `x_station_pillar`.
9. **Maps.** `maps_new/*.json` use `"tileset": "../tileset_extra.json"`. Change this when you move them into `maps/`.
   - The station interior warps use `to: "$return"` (return to the exterior door `x_station_4_3`). Swap this for the real exterior map once one exists.
   - The bog's W/E exits are `"to": "TO COME"`.
   - NPCs (`mirefen_angler`, station clerk, etc.), signs, items and encounter_zones are placeholders.
10. **run.py hook.** The other worker's `tools/run.py` runs `tools/maps_new/*.py`. That is a *different* folder from this `maps_new/`
    (json maps). Nothing here hooks into run.py. To rebuild, run `python3 tools/biomes_extra.py`, or `import biomes_extra; biomes_extra.build(write=True)`.

## Previews
`preview_util.py` isn't modified. `biomes_extra.previews()` sets `preview_util._TS` to the extra tileset (with `byid`), clears
`preview_util._SHEETS`, and calls `render_region('../maps_new/<name>', 0, 0, w-1, h-1, ...)` (that helper's native output is 3x). I compared the renders with `previews/brookhollow.png`
for crispness, seams and style.
