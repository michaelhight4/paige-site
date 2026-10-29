# Regions 7/8 world design – status (branch wd/regions78, base 2867d6a3)

## Done
- `lanternport_grotto` (32×22): tide-pool sea cave, keeper's alcove with the SIGNAL crate, nets/coral/lantern stands, tidewatcher NPC, hidden potion (27,15). Mouth in lanternport, door (39,13) ↔ grotto (15–16,21).
- `cindervale_caldera` (34×24): slag channel (rows 10–11) with two 2-wide bridges, ore rails + carts, cold forge/anvil, smelter NPC, sign board, potion (29,4). Mouth in cindervale, door (38,13) ↔ caldera (16–17,23).
- Both caves registered in world_layout.json (zones, maps_built, unique_interiors, interior_doors).
- Generator: tools/wd_r78/build_caves.py (re-runnable; stamps town mouths too – run on clean town JSONs).
- Checks: grid_fit_world --check 0 problems; grid_fit_and_swap --check 0 problems; door_warps 6/6; full tests/ 165/165. BFS: every floor cell, item, spot and NPC reachable; 1-tile gaps all walkable.
- Shots: shots/regions78_wd/ (4 phases × PC/phone + contact sheets).

## Not done
- Unique Lanternport/Cindervale interiors (priority 2): towns still reuse heal_brookhollow, shop_int, station_int, home_brookhollow_a, home_fernwick_c, home_lanternport_c, home_saltmere_a.
- Town "life" pass, hall exterior/road review (priority 3).
- Chimney smoke puffs render in town shots (engine ambient) – breaks no-smoke rule; needs an engine/ambient switch-off.
- Quest HUD overlaps top-left of the screen (UI, not map).
- Aurelith Games Announcer: left out (not touched).

## P2 + P3 (Oct 29 2026)
- Unique interiors (tools/wd_r78/build_interiors.py): heal_lanternport, shop_lanternport, home_lanternport_a/b/d/e;
  heal_cindervale, shop_cindervale, home_cindervale_a/b/c. Doors repointed both ways (town warp -> arrival one above
  the mat; mat -> town door +1), entered_from, world_layout (zones, interior_doors, unique_interiors, maps_built),
  shops.json branches heal_lanternport / heal_cindervale. Lanternport keeps the shared station_int (rail engine
  hard-codes RAIL.interior = 'station_int'); Cindervale has no station in the plan.
- Engine one-liner (src/systems/index.js onTalk): clerk opens the mart in shop_int OR any map with interior_kind 'mart'.
- Town life (tools/wd_r78/town_life.py): Lanternport pier + harbour lanterns, quay crates/benches, two stalls,
  flowers; Cindervale forge yard (anvil, tool rack, ore carts, crates), two stalls, benches; 8 townsfolk + 5th
  Tide-lock Road trainer in text_pending.
