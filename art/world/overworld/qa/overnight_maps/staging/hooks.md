# Coder hooks - overnight maps (World Design, DRAFT, staged only, Oct 23 2026)

Nothing here is live. The autotile port gate was still closed at 00:37 CT, so integrate only after `qa/autotile_port/SUMMARY.md` reports done, then use the new terrain/rules path.

## Integration steps (World Design will do these once the gate opens; listed so Coder can review)
1. Copy `staging/overnight_maps.py` to `overworld/maps_new/zz_overnight.py` (run.py's EXTRA MAPS HOOK executes it).
2. Copy `staging/encounters_overnight.json` to `overworld/encounters_overnight.json`.
3. Apply `staging/patches/world_data.py.diff` (tables() merges encounters_overnight.json), `interiors_merge.py.diff` (new towns join AREAS/EXTERIOR_TOWNS so `@home_pool` doors rotate the 4 shared homes), `progression.py.diff` (see below).
4. Take the lock through `tools/run.py` (full run), then `tools/run.py --check` must be 0 problems and `text/build_overworld_lines.py` OK.

## progression.py patch (tool change, needs Coder/World Design sign-off)
- Built outdoor maps also count as their zone node; exits to unbuilt maps add that zone.
- A zone edge whose two ends are both built maps is skipped (the map geometry and story gates rule). Without this, the planned edge aurelith<->saltmere etc. let the checker hop past built gates.
- Zone hop into a built map enters at that map's exits named after the source zone.
- `HALL_EARN`: beat_master_<x> is earned at the built hall's puzzle goal when the hall exists.
- A built story gate whose `detour` starts with `shortcut:` is reported as info (both sides reachable by design) instead of a problem. Used by gate_revival_checkpoint and gate_lanternport_tidelock (both planned as shortcut locks in ZONE_EDGES).

## Live map edit inside the hook (flag before integration)
- `fernwick`: west exit rows 9-10 -> route_fernwick_lanternport (cleared to path; tree canopy over the lane converted to bush). Game dev and ZONE_EDGES both say Fernwick needs this stub.
- Existing live stubs reused unchanged: brookhollow east -> route_east, thornwood east -> route_revival, greystone_b1 north -> frostspire_pass, route1 east strip -> sunmeadow_fields.

## Story gates (blocked deco shown; collision blocked until flag)

- `gate_aurelith_arena` on `aurelith`: flag `all_badges`; cells (16,1) crystal_barrier_lit->crystal_barrier_dim, (17,1) crystal_barrier_lit->crystal_barrier_dim; cleared state: barrier dims; detour: none: endgame; text `blockers.gate_aurelith_arena.*`
- `gate_revival_checkpoint` on `revival_heights`: flag `beat_master_revival`; cells (16,24) rt_barricade->None, (17,24) rt_barricade->None; cleared state: barricade removed; detour: shortcut: Saltmere is reached via Aurelith first; checkpoint opens from inside after coin 3; text `blockers.gate_revival_checkpoint.*`
- `gate_frostspire_bridge` on `frostspire_pass`: flag `beat_master_revival`; cells (10,23) rt_barricade->None, (11,23) rt_barricade->None, (10,21) None->bridge_v, (10,22) None->bridge_v, (11,21) None->bridge_v, (11,22) None->bridge_v; cleared state: bridge_v over the gorge; detour: Revival Heights first; text `blockers.gate_frostspire_bridge.*`
- `gate_sunmeadow_north` on `route_revival_sunmeadow`: flag `beat_master_frostspire`; cells (12,34) crystal_barrier_lit->crystal_barrier_dim, (13,34) crystal_barrier_lit->crystal_barrier_dim; cleared state: barrier dims; detour: Frostspire first; text `blockers.gate_sunmeadow_north.*`
- `gate_saltmere_causeway` on `route_saltmere_mirefen`: flag `beat_master_frostspire`; cells (20,20) None->bridge_h, (20,21) None->bridge_h, (21,20) None->bridge_h, (21,21) None->bridge_h; cleared state: bridge_h over the drained cut; detour: Sunmeadow route; text `blockers.gate_saltmere_causeway.*`
- `gate_coast_road_flood` on `route_coast`: flag `has_tideglide`; cells (8,18) None->None, (8,19) None->None, (9,18) None->None, (9,19) None->None; cleared state: water stays; Tideglide carries the player; detour: none; text `blockers.gate_coast_road_flood.*`
- `gate_lanternport_tidelock` on `route_fernwick_lanternport`: flag `beat_master_lanternport`; cells (32,9) rt_barricade->None, (32,10) rt_barricade->None; cleared state: barricade removed (art TODO: lock gate tile); detour: shortcut: Fernwick side is reached via Tidewater; lock opens from the Lanternport side after coin; text `blockers.gate_lanternport_tidelock.*`
- `gate_cindervale_giant` on `route_cindervale`: flag `beat_master_lanternport`; cells (12,4) boulder->None, (13,4) boulder->None; cleared state: cells clear (art TODO: sleeping giant sprite); detour: Tidewater/Lanternport first; text `blockers.gate_cindervale_giant.*`

## Forced encounter strips

- `fg_route_east_reeds` on `route_east`: (34,12)-(36,13) tall_grass, between ['exit-west', 'exit-east']
- `fg_frostspire_pass_ferns` on `frostspire_pass`: (10,26)-(11,28) tall_grass, between ['exit-south', 'exit-north']
- `fg_route_sunmeadow_mirefen_neck` on `route_sunmeadow_mirefen`: (31,12)-(34,13) tall_grass, between ['exit-west', 'exit-east']

## Field obstacles (optional pockets; each hides an item)
- kinds: brush = cut field skill, boulder = push field skill, water = Tideglide crossing. Pocket items are in `items`.

- `route_east` brush at (33,9)
- `route_east` boulder at (8,17)
- `route_aurelith_saltmere` brush at (31,17)
- `route_revival` boulder at (30,17)
- `route_revival` brush at (27,6)
- `route_revival_saltmere` brush at (20,20)
- `frostspire_pass` boulder at (10,10)
- `route_revival_sunmeadow` brush at (15,3)
- `sunmeadow_fields` brush at (35,9)
- `sunmeadow_fields` water at (4,10)
- `route_sunmeadow_mirefen` water at (8,16)
- `route_saltmere_mirefen` boulder at (24,23)
- `route_coast` brush at (17,8)
- `route_fernwick_lanternport` brush at (19,12)
- `route_cindervale` boulder at (8,31)

## Master halls (built 1:1 from Coder data/hall_puzzles/<zone>.json + data/masters.json; Oct 23 00:43 CT)
- Layout rule: map cell (origin.x+gx, origin.y+gy) == grid[gy][gx] for every cell of the JSON grid. Only 2 border `#` cells differ: doorway below S (lobby -> puzzle) and the Master alcove above G. Static collision = "walkable in at least one puzzle state" (solid only for never-walkable cells); a script diff of collision vs grid reports 0 mismatches for all 7.
- Mechanics + view are Coder's JS runtime (src/progression/puzzles.js). The Python static puzzle model is NOT used (`puzzle` = null); data is in GameMap `hall_puzzle` {src, kind, origin, start, goal, solved_flag, flag_on_win, opened_border_cells}.
- Hook: on entering the grid area from the doorway, start the JS puzzle at S; when `solved_flag` is set and the player stands on G, the Master (alcove above G, facing down) starts the battle; win sets `flag_on_win` (masters.json flag).
- Lobby (5 rows under the grid): 3-4 hall trainers `<map>_h1..h4` (= masters.json trainers in order), guide `<map>_guide`, 2 exit mats. Town door warps now land on the lobby aisle (below).
- progression.py patch: HALL_EARN uses `hall_puzzle.goal` when `puzzle` is null; revival hall renamed `revival_hall_int`.
- GameMap JSON per map: staging/<map>/<map>.json (same shape as run.py output + draft, hall_puzzle). Coder scanStaged() lists 28 maps from it with SUMMARY.md present.
- `saltmere_hall_int` (11x16) <- data/hall_puzzles/saltmere.json kind `sluice` origin [0, 3]; S [5, 9], G [5, 4]; Master `saltmere_hall_int_master` at [5, 3]; trainers ['saltmere_hall_int_h1', 'saltmere_hall_int_h2', 'saltmere_hall_int_h3']; exits [(5, 15), (6, 15)] -> `saltmere`; solved_flag `puzzle_saltmere_hall_solved`; win sets `beat_master_saltmere`
- `revival_hall_int` (11x27) <- data/hall_puzzles/revival_heights.json kind `prism` origin [0, 3]; S [6, 20], G [5, 4]; Master `revival_hall_int_master` at [5, 3]; trainers ['revival_hall_int_h1', 'revival_hall_int_h2', 'revival_hall_int_h3', 'revival_hall_int_h4']; exits [(6, 26), (7, 26)] -> `revival_heights`; solved_flag `puzzle_revival_heights_hall_solved`; win sets `beat_master_revival`
- `frostspire_hall_int` (11x16) <- data/hall_puzzles/frostspire.json kind `gust` origin [0, 3]; S [6, 9], G [1, 4]; Master `frostspire_hall_int_master` at [1, 3]; trainers ['frostspire_hall_int_h1', 'frostspire_hall_int_h2', 'frostspire_hall_int_h3']; exits [(6, 15), (7, 15)] -> `frostspire`; solved_flag `puzzle_frostspire_hall_solved`; win sets `beat_master_frostspire`
- `mirefen_hall_int` (11x19) <- data/hall_puzzles/mirefen.json kind `boardwalk` origin [0, 3]; S [5, 12], G [5, 4]; Master `mirefen_hall_int_master` at [5, 3]; trainers ['mirefen_hall_int_h1', 'mirefen_hall_int_h2', 'mirefen_hall_int_h3']; exits [(5, 18), (6, 18)] -> `mirefen`; solved_flag `puzzle_mirefen_hall_solved`; win sets `beat_master_mirefen`
- `tidewater_hall_int` (11x14) <- data/hall_puzzles/tidewater_coast.json kind `tide` origin [0, 3]; S [6, 7], G [1, 4]; Master `tidewater_hall_int_master` at [1, 3]; trainers ['tidewater_hall_int_h1', 'tidewater_hall_int_h2', 'tidewater_hall_int_h3', 'tidewater_hall_int_h4']; exits [(6, 13), (7, 13)] -> `tidewater_coast`; solved_flag `puzzle_tidewater_coast_hall_solved`; win sets `beat_master_tidewater`; NOTE puzzle JSON map name `tidewater_coast_hall_int` != masters.json `tidewater_hall_int` (kept masters.json)
- `lanternport_hall_int` (11x21) <- data/hall_puzzles/lanternport.json kind `lens` origin [1, 3]; S [5, 14], G [5, 4]; Master `lanternport_hall_int_master` at [5, 3]; trainers ['lanternport_hall_int_h1', 'lanternport_hall_int_h2', 'lanternport_hall_int_h3']; exits [(5, 20), (6, 20)] -> `lanternport`; solved_flag `puzzle_lanternport_hall_solved`; win sets `beat_master_lanternport`
- `cindervale_hall_int` (11x17) <- data/hall_puzzles/cindervale.json kind `quench` origin [1, 3]; S [6, 10], G [5, 4]; Master `cindervale_hall_int_master` at [5, 3]; trainers ['cindervale_hall_int_h1', 'cindervale_hall_int_h2', 'cindervale_hall_int_h3', 'cindervale_hall_int_h4']; exits [(6, 16), (7, 16)] -> `cindervale`; solved_flag `puzzle_cindervale_hall_solved`; win sets `beat_master_cindervale`

## Town doors and warps
- Hall doors: town `masters_hall` door -> `<town>_hall_int` lobby aisle (S column, height-2) facing up. Heal -> heal_brookhollow (6,8); shop -> shop_int (5,7); station (x_station, door x_station_4_3) -> station_int (9,11); houses -> `@home_pool` (1-in-4 rotation). All shared interiors return via `$return`.
- Rail-only (no Skylift, no fly point): aurelith, revival_heights. Fly points (outside the heal door) on the other towns.
- `saltmere_office_int` (story-unique): clerk `saltmere_office_int_clerk` takes the Survey Parcel (needs `has_survey_parcel`) and gives the Courier Bike -> `has_bike`.
- `revival_heights_pass_clerk`: Lumen Line Pass -> `has_rail_pass` after beat_master_revival.
- `mirefen_tideglide_giver`: Tideglide -> `has_tideglide` after coin 5 + storm start; `frostspire_skylift_tutor`: explains Skylift after coin 4 (all npcs_pending; Coder wires the gifts).
- Some NPC/item spots were nudged off blocked cells by the settle pass (note `[settled from x,y]` in map_draft.json); a few pocket items may now sit just outside their obstacle pocket. Review in-engine.
- aurelith north exit is `TO COME` -> aurelith_arena (endgame, gate_aurelith_arena / all_badges).

## Warps per map

- `aurelith`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (21,11) -> station_int; (27,11) -> home_lanternport_c; (4,20) -> home_saltmere_a; (11,20) -> home_brookhollow_a; (27,20) -> home_fernwick_c
- `saltmere`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (21,11) -> station_int; (27,11) -> home_saltmere_a; (5,20) -> saltmere_office_int; (12,20) -> saltmere_hall_int; (20,20) -> home_brookhollow_a; (27,20) -> home_fernwick_c
- `saltmere_office_int`: (7,8) -> saltmere
- `revival_heights`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (21,11) -> station_int; (27,11) -> home_brookhollow_a; (4,20) -> home_fernwick_c; (12,20) -> revival_hall_int; (20,20) -> home_lanternport_c; (27,20) -> home_saltmere_a
- `frostspire`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (20,11) -> home_fernwick_c; (27,11) -> home_lanternport_c; (12,20) -> frostspire_hall_int; (20,20) -> home_saltmere_a
- `mirefen`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (20,11) -> home_lanternport_c; (27,11) -> home_saltmere_a; (12,20) -> mirefen_hall_int; (20,20) -> home_brookhollow_a; (27,20) -> home_fernwick_c
- `tidewater_coast`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (27,11) -> home_saltmere_a; (12,20) -> tidewater_hall_int; (20,20) -> home_brookhollow_a
- `lanternport`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (21,11) -> station_int; (27,11) -> home_brookhollow_a; (4,20) -> home_fernwick_c; (12,20) -> lanternport_hall_int; (20,20) -> home_lanternport_c; (27,20) -> home_saltmere_a
- `cindervale`: (5,11) -> heal_brookhollow; (11,11) -> shop_int; (20,11) -> home_fernwick_c; (27,11) -> home_lanternport_c; (12,20) -> cindervale_hall_int; (20,20) -> home_saltmere_a
- `saltmere_hall_int`: (5,15) -> saltmere; (6,15) -> saltmere
- `revival_hall_int`: (6,26) -> revival_heights; (7,26) -> revival_heights
- `frostspire_hall_int`: (6,15) -> frostspire; (7,15) -> frostspire
- `mirefen_hall_int`: (5,18) -> mirefen; (6,18) -> mirefen
- `tidewater_hall_int`: (6,13) -> tidewater_coast; (7,13) -> tidewater_coast
- `lanternport_hall_int`: (5,20) -> lanternport; (6,20) -> lanternport
- `cindervale_hall_int`: (6,16) -> cindervale; (7,16) -> cindervale

## 01:00 AM CT update (World Design, staging only - gate still closed)
- **Snow pine** (`snowpine_top` overlay/walk, `snowpine_base` decoration/block): drawn in `patches/overnight_tiles.py` (goes to `tools/overnight_tiles.py`). `run.py.diff` adds two lines: `overnight_tiles.apply(MAPS)` after the maps load (only records green tree cells on snow maps) and `overnight_tiles.late(res)` after `club.verify`, which registers the pair LAST by name (after finalize edge tiles and late tiles) and swaps the recorded cells. Nothing is renumbered. Only frostspire_pass (826) and frostspire (220) use it.
- **Pockets**: every `field_obstacles` entry now carries `pocket_cells`. The map script's item audit lifts canopies over pocket/obstacle cells (tree base -> rock so the pocket stays sealed) and re-seats items that drift out of their pocket. Read-only re-check: `staging/check_items.py` (85 items, 15 pocket, 0 bad at 01:00 CT).
- **Tile ids in staged GameMap JSONs**: every existing tile uses its LIVE id (by name). The 248 tiles live does not have yet use staged ids 1578-1825 listed in `staging/tile_ids_staged.json` (`tiles_new` key in each map JSON). On promotion a real run.py registers them by name and the JSONs are re-exported, so do not hard-code those staged ids.
- Coder: the sandbox's in-memory build renumbers 92 live late tiles (pre-existing, not from these maps); the export remap hides it but the tool order should be checked before the live run.
- `build.py.diff` removed (sandbox build.py is identical to live again).

## 01:09 AM CT update (World Design, staging only; maps are already live via the integrator)
- Snow pine ids: staged GameMap JSONs use PLACEHOLDER ids 6001 (snowpine_top) / 6002 (snowpine_base), see `tile_ids_staged.json`. The block 6001-6999 is free (core 1-1822 live, the autotile port claims 1578-1823+, ext 5001-5677, interiors 7001+); drive.py asserts it stays free. Real ids come from run.py by name, last.
- `overnight_tiles.late()` now also handles the autotile port: it takes the pair out of the port's pending list (temporary 9000xx ids) and numbers it right after the last core tile (port dry test: 2066/2067). Without that the pair kept 900489/900490.
- Re-sync for live: `patches/zz_overnight_vs_live.diff` (map script), `patches/run.py.diff` + `patches/overnight_tiles.py` (tools). progression/world_data/interiors_merge: live == sandbox, nothing to do.
