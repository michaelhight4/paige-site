## UPDATE 00:43 AM CT: World Design owns ALL remaining maps (8 zones, 11 routes, 7 halls; Gary steering). Slices A/B/C below are superseded. 28 staged, 0 integrated (port gate closed). Halls follow Coder's data/hall_puzzles/*.json.

# Overnight map slices (Oct 23 2026, DRAFT)

## A (World Design worker A, claimed 12:21 AM CT)
Critical-path order after Fernwick (CRITICAL_PATH.md steps 4-7). Map names reuse the live stub exit names where one exists.
Every entity id is prefixed with its map name (e.g. `aurelith_npc_1`, `route_east_trainer_a`).

Zones (4):
1. `aurelith` (city, rail-only, arena sealed: gate_aurelith_arena) - step 4
2. `saltmere` (town, coin 2, Courier Bike office, rail stop) - step 5
3. `revival_heights` (city, coin 3, rail-only, RT HQ, gate_revival_checkpoint) - step 6
4. `frostspire` (biome/town, coin 4, Skylift) - step 7

Routes (6):
1. `route_east` (brookhollow-aurelith; live stub brookhollow east y12-13) - step 4
2. `route_aurelith_saltmere` (saltmere-aurelith) - step 4-5
3. `route_revival` (thornwood-revival; live stub thornwood east y21-22) - step 6
4. `route_revival_saltmere` (revival-saltmere, RT checkpoint shortcut lock) - step 6
5. `frostspire_pass` (greystone-frostspire; live stub greystone_b1 north x20-21; gate_frostspire_bridge) - step 6-7
6. `route_revival_sunmeadow` (revival-sunmeadow; gate_sunmeadow_north) - step 7

Not A: Master hall interiors (C). A leaves a door warp per hall to `<zone>_hall_int` (C names it; tell A if different).
Remaining outdoor maps for B: sunmeadow_fields, mirefen (beyond mirefen_bog), tidewater_coast, lanternport, cindervale,
routes saltmere-mirefen, sunmeadow-mirefen, brookhollow-tidewater, fernwick-lanternport, aurelith-cindervale.
