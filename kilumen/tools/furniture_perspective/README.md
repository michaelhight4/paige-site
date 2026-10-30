# Furniture perspective pass + supply chest (wd/furniture-perspective)

Shared projection for every furniture piece: ~35 deg top-down lean (top face + front face), light from the top-left, lid/top >=25% lighter than the front in greyscale (target 40-80%), 1 px dark outline, drop shadow 2 px down-right at ~28-31% alpha. Spec: design/worldbuilding_audit.md section 6 + design/furniture_value_check.py.

## Scripts
- `reshade.py [--log out.tsv]`: procedural re-shade of the *_v3 furniture sheets (1x/2x/3x png + webp). Reads the sources from git SRC_REV (default 1bf5c771), so reruns are idempotent. Only touches components whose cells are furniture/interior/prop tiles (floors, walls, rugs, doors, crystal display cases skipped) and writes back only the re-shaded pixels at full 64 px resolution. Tall FRONTAL pieces (top face <20%) are reprojected: front squeezed into the lower 70%, a lit top slab (30%) in the piece's own cap colour with outline and seam. Every piece: front darkened 0.72-0.92x, top lifted (capped, hue kept) to >=1.35x the front, seam row darkened, left-to-right light ramp, drop shadow.
- `furnish_heal.py [--check]`: furnishes the 8 Heal Centre lobbies and writes `text_pending.interact_spots` + `text_pending.people_spots` (see below).
- `shots_fp.mjs`: in-game shots (PC 1280x800, phone 844x390 DPR2) at several hours.
- `../chests/make_chest.py`: draws the supply chest (closed + open) -> `src/systems/chest_art.js` and `art/world/overworld/props/supply_chest_*`.

Note: the sheets are shared, so the re-shade changes these pieces in EVERY map that uses them, not only the scope rooms.

## Value check (furniture_value_check.py, flag counts summed over i_furniture_v3, interior_v3, i_brand_v3, ix2_kit_v3)

| flag | before | after |
|---|---|---|
| FRONTAL | 158 | 73 |
| FLAT | 72 | 9 |
| LIGHT_R | 17 | 11 |
| STEEP | 137 | 62 |
| INVERTED | 136 | 66 |

Per sheet flagged/total: i_furniture_v3 139/157 -> 75/93; interior_v3 54/66 -> 28/50; i_brand_v3 16/18 -> 15/16; ix2_kit_v3 164/217 -> 47/70. (Totals drop because the drop shadows join a few multi-part pieces into one component.) STEEP/INVERTED still flag most tables and beds by design of the checker; judged by eye. Supply chest: 0/1 flagged (closed and open).

## Heal Centres (heal_*.json)
Added where they fit: visitor PC (back wall), small side table by the waiting sofa, a 2-wide waiting bench facing the counter, a corner plant. Door aisle, arrival, counter talk/queue rows and locked-door approach are kept clear, and every floor tile stays reachable. People spots are walkable tiles for Coder to place NPCs on (also in each map as `text_pending.people_spots`); interact spot `text_ref`s are pending for Text Bot.

| map | spots | inspectable props | people spots (x,y) |
|---|---|---|---|
| heal_aurelith | 10 | poster_care, plant_palm, suggestions, newsletters, visitor_pc, counter, terminal, plant_fern, sofa, bench | (0,6) (3,6) (10,6) (13,6) (5,7) (8,7) |
| heal_brookhollow | 10 | poster_safety, plant_flower, sofa, suggestions, newsletters, visitor_pc, side_table, counter, terminal, bench | (0,6) (3,6) (9,6) (12,6) (5,7) (2,8) |
| heal_cindervale | 10 | poster_safety, polisher, suggestions, newsletters, crystal_crate, counter, terminal, bench, pillar_basalt, side_table | (1,6) (9,6) (3,7) (7,7) (11,7) |
| heal_fernwick | 10 | poster_safety, plant_mushroom, sofa, suggestions, newsletters, visitor_pc, side_table, counter, terminal, bench | (0,6) (3,6) (9,6) (12,6) (5,7) (2,8) |
| heal_frostspire | 10 | poster_safety, suggestions, newsletters, visitor_pc, counter, terminal, plant_coral, sofa, bench, side_table | (3,6) (11,6) (5,7) (8,7) |
| heal_lanternport | 10 | poster_care, polisher, poster_safety, anchor, suggestions, newsletters, counter, terminal, lantern_stand, bench | (1,6) (11,6) (4,7) (7,7) |
| heal_revival | 10 | poster_safety, suggestions, newsletters, visitor_pc, counter, terminal, plant_coral, sofa, bench, side_table | (3,6) (11,6) (5,7) (8,7) |
| heal_saltmere | 10 | poster_safety, suggestions, newsletters, visitor_pc, counter, terminal, plant_coral, sofa, bench, side_table | (3,6) (11,6) (5,7) (8,7) |

## Supply chest (all world pickups)
Kilumen has no chest tiles: every visible pickup (overworld, interiors, caves, Wellspire, flashback lab) is drawn by `satchelSprite(taken)` in src/systems/index.js, which was a procedural placeholder satchel. It now draws a 32 px native chest at 2x: domed lid (top 6 of 17 rows, ~35%), two iron bands, gold hasp + keyhole, outline, shadow. Both states the code uses are drawn: closed (not taken) and open/empty (taken, `emptySatchelStays`). The flashback lab branch (wd/wellspire-lab) has no chest tiles and 0 pickups in fin_past_wlab_*, and its src/systems/index.js is identical to 1bf5c771, so it picks this up on merge; nothing patched there.

## Sprites changed (from reshade.py --log)

| sheet | x,y (native px) | piece | class | change |
|---|---|---|---|---|
| sheet | x,y | piece | class | change |
| i_furniture_v3.png | 0,0 | i_bed_brook_0_0 i_bed_brook_1_0 i_table_fern_0_0 i_table_small_brook | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 64,0 | i_bed_brook_1_0 i_bed_fern_0_0 i_table_fern_0_0 i_table_fern_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 128,0 | i_bed_fern_0_0 i_bed_fern_1_0 i_table_fern_0_1 i_table_small_fern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 192,0 | i_bed_fern_1_0 i_bed_salt_0_0 i_table_salt_0_0 i_table_small_fern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 256,0 | i_bed_salt_0_0 i_bed_salt_1_0 i_table_salt_0_0 i_table_salt_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 320,0 | i_bed_cinder_0_0 i_bed_salt_1_0 i_table_salt_0_1 i_table_small_salt | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 384,0 | i_bed_cinder_0_0 i_bed_cinder_1_0 i_table_cinder_0_0 i_table_small_salt | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 448,0 | i_bed_cinder_1_0 i_bed_revival_0_0 i_table_cinder_0_0 i_table_cinder_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 512,0 | i_bed_revival_0_0 i_bed_revival_1_0 i_table_cinder_0_1 i_table_small_cinder | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 576,0 | i_bed_lantern_0_0 i_bed_revival_1_0 i_table_revival_0_0 i_table_small_cinder | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 640,0 | i_bed_lantern_0_0 i_bed_lantern_1_0 i_table_revival_0_0 i_table_revival_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 704,0 | i_bed_aurelith_0_0 i_bed_lantern_1_0 i_table_revival_0_1 i_table_small_revival | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 768,0 | i_bed_aurelith_0_0 i_bed_aurelith_1_0 i_table_lantern_0_0 i_table_small_revival | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 832,0 | i_bed_aurelith_1_0 i_table_brook_0_0 i_table_lantern_0_0 i_table_lantern_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 896,2 | i_table_brook_0_0 i_table_brook_0_1 i_table_lantern_0_1 i_table_small_lantern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 0,66 | i_table_aurelith_0_0 i_table_aurelith_0_1 i_table_fern_0_0 i_table_small_brook | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 64,66 | i_chair_brook i_table_aurelith_0_1 i_table_fern_0_0 i_table_fern_0_1 i_table_small_aurelith i_table_small_fern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 192,66 | i_chair_brook i_chair_fern i_table_salt_0_0 i_table_small_fern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 256,66 | i_chair_cinder i_chair_fern i_chair_salt i_table_salt_0_0 i_table_salt_0_1 i_table_small_salt | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 384,66 | i_chair_cinder i_chair_revival i_table_cinder_0_0 i_table_small_salt | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 448,66 | i_chair_aurelith i_chair_lantern i_chair_revival i_table_cinder_0_0 i_table_cinder_0_1 i_table_small_cinder | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 576,66 | i_chair_aurelith i_sofa_brook_0_0 i_table_revival_0_0 i_table_small_cinder | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 640,66 | i_sofa_brook_0_0 i_sofa_brook_0_1 i_sofa_salt_0_0 i_table_revival_0_0 i_table_revival_0_1 i_table_small_revival | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 768,66 | i_sofa_salt_0_0 i_sofa_salt_0_1 i_table_lantern_0_0 i_table_small_revival | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 832,66 | i_sofa_revival_0_0 i_sofa_revival_0_1 i_sofa_salt_0_1 i_table_lantern_0_0 i_table_lantern_0_1 i_table_small_lantern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 960,66 | i_sofa_revival_0_1 i_table_small_lantern | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 202,128 | i_chair_brook i_sofa_aurelith_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 266,128 | i_chair_fern i_sofa_cinder_0_0 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 330,128 | i_chair_salt i_sofa_cinder_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 394,128 | i_chair_cinder i_sofa_fern_0_0 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 458,128 | i_chair_revival i_sofa_fern_0_1 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 514,128 | i_bookcase_brook_0_0 i_bookcase_brook_1_0 i_chair_aurelith i_chair_lantern i_cupboard_salt_0_0 i_cupboard_salt_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 578,128 | i_bookcase_brook_1_0 i_bookcase_fern_0_0 i_chair_aurelith i_cupboard_cinder_0_0 i_cupboard_salt_1_0 i_dresser_aurelith i_dresser_lantern i_sofa_brook_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 0,130 | i_sofa_aurelith_0_0 i_sofa_lantern_0_0 i_sofa_lantern_0_1 i_table_aurelith_0_0 i_table_aurelith_0_1 i_table_small_aurelith | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 128,130 | i_chair_brook i_sofa_aurelith_0_0 i_sofa_aurelith_0_1 i_table_small_aurelith | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 126,192 | i_bookcase_aurelith_0_0 i_bookcase_lantern_0_0 i_bookcase_lantern_1_0 i_bookcase_revival_1_0 i_cupboard_aurelith_1_0 i_cupboard_fern_0_0 i_cupboard_fern_1_0 i_dresser_brook i_radio i_shelf_aurelith i_sofa_aurelith_0_0 i_sofa_aurelith_0_1 i_sofa_cinder_0_0 i_sofa_lantern_0_1 i_tv i_tv_flat | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 382,192 | i_bookcase_aurelith_1_0 i_bookcase_brook_0_0 i_cupboard_brook_0_0 i_cupboard_brook_1_0 i_cupboard_salt_0_0 i_dresser_cinder i_dresser_fern i_dresser_revival i_dresser_salt i_sofa_cinder_0_1 i_sofa_fern_0_0 i_sofa_fern_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 130,328 | i_cupboard_fern_0_0 i_tv | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 194,388 | i_tv_flat | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 264,392 | i_radio | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 578,644 | i_fireplace_0_0 i_fireplace_0_1 i_heal_machine_0_0 i_heal_machine_0_1 i_heal_machine_1_0 i_telescope | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 2,702 | i_counter_station_l i_counter_station_m i_kitchen_sink_0_0 i_kitchen_sink_1_0 i_lab_machine_1_0 i_specimen_tank_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 260,704 | i_kitchen_fridge_0_0 i_server_rack_0_0 | tall | reprojected top 13%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 844,832 | i_net i_river_stones | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 772,834 | i_net i_ship_wheel | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 972,834 | i_barrel i_trophy_case_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 714,836 | i_anchor | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 904,852 | i_salt_jars | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 588,900 | i_brazier | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 710,902 | i_ore_cart | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 962,902 | i_pillar_stone_0_0 i_trophy_case_0_0 | tall | reprojected top 11%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 642,904 | i_tool_rack | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 260,914 | i_anvil | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 838,914 | i_river_stones | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 262,958 | i_anvil i_statue_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 962,962 | i_dais_salt_1_0 i_pillar_stone_0_0 | tall | reprojected top 9%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 0,966 | i_pillar_stone_1_0 i_trophy_case_0_1 | tall | reprojected top 10%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 208,978 | i_pillar_steel_0_0 i_statue_0_0 | tall | reprojected top 10%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 134,1022 | i_pillar_salt_1_0 i_trophy_case_1_1 | tall | reprojected top 10%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 262,1022 | i_pillar_steel_1_0 i_statue_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 0,1026 | i_dais_salt_1_1 i_dais_salt_1_2 i_dais_salt_1_3 i_pillar_salt_0_0 i_pillar_salt_1_0 i_pillar_stone_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 198,1026 | i_dais_revival_0_0 i_pillar_steel_0_0 | tall | reprojected top 13%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 326,1026 | i_dais_revival_0_2 i_pillar_brass_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 450,1026 | i_dais_revival_1_0 i_dais_revival_1_1 i_dais_revival_1_2 i_dais_revival_1_3 i_pillar_basalt_0_0 i_pillar_basalt_1_0 i_pillar_marble_0_0 i_pillar_marble_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 962,1086 | i_dais_lantern_1_0 i_dais_salt_1_0 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 962,1150 | i_dais_aurelith_1_0 i_dais_lantern_1_0 | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 518,1228 | i_turnstile | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 898,1284 | i_heal_machine_0_0 i_heal_machine_0_1 i_kitchen_stove_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 0,1348 | i_heal_machine_0_1 i_kitchen_stove_0_0 i_kitchen_stove_1_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 510,1348 | i_heal_machine_1_1 i_kitchen_sink_0_0 i_lab_desk_0_1 i_server_rack_1_0 i_specimen_tank_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 574,1348 | i_kitchen_sink_0_0 i_lab_desk_0_1 i_lab_machine_0_0 i_server_rack_1_0 i_specimen_tank_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 896,1348 | i_kitchen_stove_0_0 i_lab_machine_1_0 i_specimen_tank_1_0 i_terminal | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 960,1348 | i_kitchen_stove_0_0 i_lab_machine_1_0 i_terminal | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 642,1412 | i_lab_machine_0_0 i_specimen_tank_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 706,1412 | i_lab_machine_0_0 i_specimen_tank_0_0 i_specimen_tank_1_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 770,1412 | i_lab_machine_0_0 i_lab_machine_1_0 i_specimen_tank_1_0 | tall | reprojected top 10%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 256,1436 | i_lab_desk_0_0 i_server_rack_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 320,1436 | i_lab_desk_0_0 i_server_rack_0_0 i_server_rack_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 196,1472 | i_server_rack_0_0 i_tv | tall | reprojected top 13%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 260,1472 | i_server_rack_0_0 i_tv | tall | reprojected top 13%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 324,1472 | i_server_rack_0_0 | tall | reprojected top 13%->30%; value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 582,1472 | i_specimen_tank_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 646,1472 | i_specimen_tank_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 710,1472 | i_specimen_tank_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 968,1476 | i_terminal | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 130,1536 | i_tv | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 194,1536 | i_tv | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 258,1536 | i_tv | low | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 8,1540 | i_terminal | tall | value/light re-shade; drop shadow 2px DR |
| i_furniture_v3.png | 72,1540 | i_terminal | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 902,0 | i_crystal_polisher_1_0 i_crystal_polisher_1_1 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 774,2 | i_crystal_polisher_0_0 i_crystal_polisher_0_1 i_crystal_polisher_1_0 i_crystal_polisher_1_1 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 966,66 | i_crystal_polisher_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 264,72 | i_crystal_polisher_0_0 i_newsletter_rack | tall | reprojected top 8%->30%; value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 838,126 | i_crystal_polisher_0_0 i_crystal_polisher_1_0 i_crystal_polisher_1_1 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 6,130 | i_crystal_polisher_0_0 i_crystal_polisher_0_1 i_crystal_polisher_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 262,130 | i_crystal_polisher_0_0 i_crystal_polisher_0_1 i_crystal_polisher_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 518,130 | i_crystal_polisher_0_0 i_crystal_polisher_0_1 i_crystal_polisher_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| i_brand_v3.png | 766,130 | i_crystal_polisher_0_1 i_crystal_polisher_1_0 i_crystal_polisher_1_1 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 832,0 | bed_1_0 counter_heal_l counter_heal_m shelf_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 898,0 | counter_heal_m counter_heal_r shelf_0_0 shelf_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 962,0 | counter_heal_r shelf_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 130,192 | cooler_0_0 pillar_0_0 | tall | reprojected top 16%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 770,200 | arena_ring_0_0 cupboard_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 76,386 | barrel club_counter_fruit | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 960,450 | club_booth_table club_missing_marta | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 332,466 | club_flyer_lost club_stool | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 328,518 | club_flyer_lost | tall | reprojected top 12%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 392,518 | club_flyer_mic | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 906,518 | club_missing_pell | tall | reprojected top 8%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 970,518 | club_missing_marta | tall | reprojected top 8%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 588,528 | club_note | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 652,528 | club_note_tick | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 962,574 | club_missing_marta home_globe home_kitchen_fridge_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 898,576 | home_kitchen_fridge_0_0 home_luggage | tall | reprojected top 16%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 10,582 | club_missing_teo | tall | reprojected top 19%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 74,582 | club_missing_imke | tall | reprojected top 8%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 904,644 | home_luggage | tall | reprojected top 10%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 520,648 | home_radio | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 974,648 | home_globe | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 898,766 | fireplace_1_0 fireplace_1_1 home_kitchen_stove_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 0,796 | desk_pc_0_0 fireplace_1_1 home_kitchen_stove_0_0 home_kitchen_stove_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 0,796 | desk_pc_0_0 desk_pc_0_1 fireplace_1_1 heal_machine_0_0 heal_machine_1_0 home_kitchen_stove_0_0 home_kitchen_stove_1_0 home_lab_desk_0_1 pc stove_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 512,836 | home_kitchen_sink_0_0 home_table_toast_0_0 | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 576,836 | home_kitchen_sink_0_0 home_table_toast_0_0 home_table_toast_0_1 | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 896,836 | home_kitchen_stove_0_0 i_company_terminal | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 960,836 | home_kitchen_stove_0_0 i_company_terminal | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 576,898 | home_table_toast_0_0 home_table_toast_0_1 tv | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 702,898 | home_table_toast_0_1 tv | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 766,898 | home_table_toast_0_1 i_company_terminal tv | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 840,900 | i_company_terminal | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 904,900 | i_company_terminal | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 968,900 | i_company_terminal | tall | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 578,960 | tv | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 642,960 | tv | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 706,960 | tv | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 192,964 | stove_0_0 | low | value/light re-shade; drop shadow 2px DR |
| interior_v3.png | 256,964 | stove_0_0 | low | value/light re-shade; drop shadow 2px DR |
| x_furniture_fix_v3.png | 848,0 | x_station_pillar_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| x_furniture_fix_v3.png | 780,8 | x_station_pillar_0_0 | tall | reprojected top 15%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 66,0 | kit_armchair_side_fancy_red_r_0_0 kit_armchair_side_fancy_teal_l_0_0 kit_sofa_side_fancy_purple_l_0_0 kit_sofa_side_fancy_purple_r_1_0 kit_sofa_side_normal_red_l_0_0 kit_sofa_side_normal_red_r_1_0 kit_sofa_side_worn_teal_l_0_0 kit_sofa_side_worn_teal_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 194,0 | kit_armchair_side_fancy_purple_r_0_0 kit_armchair_side_fancy_red_l_0_0 kit_armchair_side_worn_teal_r_0_0 kit_sofa_side_fancy_purple_l_1_0 kit_sofa_side_normal_purple_r_0_0 kit_sofa_side_normal_red_l_1_0 kit_sofa_side_worn_red_r_0_0 kit_sofa_side_worn_teal_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 322,0 | kit_armchair_side_worn_red_r_0_0 kit_armchair_side_worn_teal_l_0_0 kit_sofa_side_normal_purple_l_0_0 kit_sofa_side_normal_purple_r_1_0 kit_sofa_side_worn_red_l_0_0 kit_sofa_side_worn_red_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 450,0 | kit_armchair_side_worn_purple_r_0_0 kit_armchair_side_worn_red_l_0_0 kit_sofa_side_fancy_teal_r_0_0 kit_sofa_side_normal_purple_l_1_0 kit_sofa_side_worn_purple_r_0_0 kit_sofa_side_worn_red_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 578,0 | kit_armchair_side_normal_teal_r_0_0 kit_armchair_side_worn_purple_l_0_0 kit_sofa_side_fancy_teal_l_0_0 kit_sofa_side_fancy_teal_r_1_0 kit_sofa_side_worn_purple_l_0_0 kit_sofa_side_worn_purple_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 706,0 | kit_armchair_side_normal_red_r_0_0 kit_armchair_side_normal_teal_l_0_0 kit_sofa_side_fancy_red_r_0_0 kit_sofa_side_fancy_teal_l_1_0 kit_sofa_side_normal_teal_r_0_0 kit_sofa_side_worn_purple_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 834,0 | kit_armchair_side_normal_purple_r_0_0 kit_armchair_side_normal_red_l_0_0 kit_sofa_side_fancy_red_l_0_0 kit_sofa_side_fancy_red_r_1_0 kit_sofa_side_normal_teal_l_0_0 kit_sofa_side_normal_teal_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 962,0 | kit_armchair_side_normal_purple_l_0_0 kit_sofa_side_fancy_red_l_1_0 kit_sofa_side_normal_teal_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,0 | kit_sofa_side_normal_red_r_0_0 kit_sofa_side_normal_red_r_1_0 kit_sofa_side_worn_teal_r_0_0 kit_sofa_side_worn_teal_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,0 | kit_sofa_side_normal_red_l_0_0 kit_sofa_side_normal_red_l_1_0 kit_sofa_side_worn_teal_l_0_0 kit_sofa_side_worn_teal_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,0 | kit_sofa_side_normal_purple_r_0_0 kit_sofa_side_normal_purple_r_1_0 kit_sofa_side_worn_red_r_0_0 kit_sofa_side_worn_red_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 386,0 | kit_sofa_side_normal_purple_l_0_0 kit_sofa_side_normal_purple_l_1_0 kit_sofa_side_worn_red_l_0_0 kit_sofa_side_worn_red_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 514,0 | kit_sofa_side_fancy_teal_r_0_0 kit_sofa_side_fancy_teal_r_1_0 kit_sofa_side_worn_purple_r_0_0 kit_sofa_side_worn_purple_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 642,0 | kit_sofa_side_fancy_teal_l_0_0 kit_sofa_side_fancy_teal_l_1_0 kit_sofa_side_worn_purple_l_0_0 kit_sofa_side_worn_purple_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 770,0 | kit_sofa_side_fancy_red_r_0_0 kit_sofa_side_fancy_red_r_1_0 kit_sofa_side_normal_teal_r_0_0 kit_sofa_side_normal_teal_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 898,0 | kit_sofa_side_fancy_red_l_0_0 kit_sofa_side_fancy_red_l_1_0 kit_sofa_side_normal_teal_l_0_0 kit_sofa_side_normal_teal_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,64 | kit_sofa_side_fancy_purple_r_0_0 kit_sofa_side_fancy_purple_r_1_0 kit_sofa_side_normal_red_r_0_0 kit_sofa_side_normal_red_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,64 | kit_sofa_side_fancy_purple_l_0_0 kit_sofa_side_fancy_purple_l_1_0 kit_sofa_side_normal_red_l_0_0 kit_sofa_side_normal_red_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,64 | kit_armchair_side_worn_teal_l_0_0 kit_armchair_side_worn_teal_r_0_0 kit_sofa_side_normal_purple_r_0_0 kit_sofa_side_normal_purple_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 386,64 | kit_armchair_side_worn_red_l_0_0 kit_armchair_side_worn_red_r_0_0 kit_sofa_side_normal_purple_l_0_0 kit_sofa_side_normal_purple_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 514,64 | kit_armchair_side_worn_purple_l_0_0 kit_armchair_side_worn_purple_r_0_0 kit_sofa_side_fancy_teal_r_0_0 kit_sofa_side_fancy_teal_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 642,64 | kit_armchair_side_normal_teal_l_0_0 kit_armchair_side_normal_teal_r_0_0 kit_sofa_side_fancy_teal_l_0_0 kit_sofa_side_fancy_teal_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 770,64 | kit_armchair_side_normal_red_l_0_0 kit_armchair_side_normal_red_r_0_0 kit_sofa_side_fancy_red_r_0_0 kit_sofa_side_fancy_red_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 898,64 | kit_armchair_side_normal_purple_l_0_0 kit_armchair_side_normal_purple_r_0_0 kit_sofa_side_fancy_red_l_0_0 kit_sofa_side_fancy_red_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,128 | kit_armchair_side_fancy_teal_l_0_0 kit_armchair_side_fancy_teal_r_0_0 kit_sofa_side_fancy_purple_r_0_0 kit_sofa_side_fancy_purple_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,128 | kit_armchair_side_fancy_red_l_0_0 kit_armchair_side_fancy_red_r_0_0 kit_sofa_side_fancy_purple_l_0_0 kit_sofa_side_fancy_purple_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,128 | kit_armchair_side_fancy_purple_l_0_0 kit_armchair_side_fancy_purple_r_0_0 kit_armchair_side_worn_teal_l_0_0 kit_armchair_side_worn_teal_r_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 322,128 | kit_armchair_side_fancy_purple_l_0_0 kit_armchair_side_worn_red_r_0_0 kit_armchair_side_worn_teal_l_0_0 kit_tv_unit_worn_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 386,128 | kit_armchair_side_worn_red_l_0_0 kit_armchair_side_worn_red_r_0_0 kit_tv_unit_worn_teal_0_0 kit_tv_unit_worn_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 446,128 | kit_armchair_side_worn_purple_r_0_0 kit_armchair_side_worn_red_l_0_0 kit_armchair_side_worn_red_r_0_0 kit_dining_table_normal_red_0_0 kit_dining_table_worn_green_0_0 kit_dining_table_worn_green_0_1 kit_tv_unit_normal_teal_0_0 kit_tv_unit_worn_teal_0_0 kit_tv_unit_worn_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 514,128 | kit_armchair_side_worn_purple_l_0_0 kit_armchair_side_worn_purple_r_0_0 kit_tv_unit_normal_teal_0_0 kit_tv_unit_normal_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 574,128 | kit_armchair_side_normal_teal_r_0_0 kit_armchair_side_worn_purple_l_0_0 kit_armchair_side_worn_purple_r_0_0 kit_dining_table_normal_blue_0_0 kit_dining_table_normal_red_0_0 kit_dining_table_normal_red_0_1 kit_tv_unit_fancy_teal_0_0 kit_tv_unit_normal_teal_0_0 kit_tv_unit_normal_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 642,128 | kit_armchair_side_normal_teal_l_0_0 kit_armchair_side_normal_teal_r_0_0 kit_tv_unit_fancy_teal_0_0 kit_tv_unit_fancy_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 702,128 | kit_armchair_side_normal_red_r_0_0 kit_armchair_side_normal_teal_l_0_0 kit_armchair_side_normal_teal_r_0_0 kit_dining_table_normal_blue_0_0 kit_dining_table_normal_blue_0_1 kit_dining_table_normal_green_0_0 kit_side_table_worn_red_0_0 kit_tv_unit_fancy_teal_0_0 kit_tv_unit_fancy_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 770,128 | kit_armchair_side_normal_red_l_0_0 kit_armchair_side_normal_red_r_0_0 kit_side_table_worn_blue_0_0 kit_side_table_worn_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 834,128 | kit_armchair_side_normal_purple_r_0_0 kit_armchair_side_normal_red_l_0_0 kit_side_table_normal_red_0_0 kit_side_table_worn_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 898,128 | kit_armchair_side_normal_purple_l_0_0 kit_armchair_side_normal_purple_r_0_0 kit_side_table_normal_blue_0_0 kit_side_table_normal_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 962,128 | kit_armchair_side_normal_purple_l_0_0 kit_side_table_normal_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,192 | kit_armchair_side_fancy_teal_l_0_0 kit_armchair_side_fancy_teal_r_0_0 kit_side_table_fancy_blue_0_0 kit_side_table_fancy_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 66,192 | kit_armchair_side_fancy_red_r_0_0 kit_armchair_side_fancy_teal_l_0_0 kit_dining_table_worn_red_0_0 kit_side_table_fancy_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,192 | kit_armchair_side_fancy_red_l_0_0 kit_armchair_side_fancy_red_r_0_0 kit_dining_table_worn_red_0_0 kit_dining_table_worn_red_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 194,192 | kit_armchair_side_fancy_purple_r_0_0 kit_armchair_side_fancy_red_l_0_0 kit_dining_table_worn_blue_0_0 kit_dining_table_worn_red_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,192 | kit_armchair_side_fancy_purple_l_0_0 kit_armchair_side_fancy_purple_r_0_0 kit_dining_table_worn_blue_0_0 kit_dining_table_worn_blue_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 322,192 | kit_armchair_side_fancy_purple_l_0_0 kit_dining_table_worn_blue_0_1 kit_dining_table_worn_green_0_0 kit_tv_unit_worn_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 768,194 | kit_dining_table_normal_green_0_0 kit_dining_table_normal_green_0_1 kit_side_table_worn_blue_0_0 kit_side_table_worn_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 832,194 | kit_dining_table_fancy_red_0_0 kit_dining_table_normal_green_0_1 kit_side_table_normal_red_0_0 kit_side_table_worn_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 896,194 | kit_dining_table_fancy_red_0_0 kit_dining_table_fancy_red_0_1 kit_side_table_normal_blue_0_0 kit_side_table_normal_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 960,194 | kit_dining_table_fancy_red_0_1 kit_side_table_normal_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 388,200 | kit_dining_table_worn_green_0_0 kit_tv_unit_worn_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 640,216 | kit_dining_table_normal_blue_0_0 kit_dining_table_normal_blue_0_1 kit_tv_unit_fancy_teal_0_0 kit_tv_unit_fancy_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 518,228 | kit_dining_table_normal_red_0_0 kit_tv_unit_normal_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,258 | kit_dining_table_fancy_blue_0_0 kit_dining_table_fancy_blue_0_1 kit_side_table_fancy_blue_0_0 kit_side_table_fancy_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 64,258 | kit_dining_table_fancy_blue_0_1 kit_dining_table_fancy_green_0_0 kit_dining_table_worn_red_0_0 kit_side_table_fancy_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 128,258 | kit_dining_chair_worn_red_r_0_0 kit_dining_table_fancy_green_0_0 kit_dining_table_fancy_green_0_1 kit_dining_table_worn_blue_0_0 kit_dining_table_worn_red_0_0 kit_dining_table_worn_red_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 256,258 | kit_dining_chair_worn_blue_r_0_0 kit_dining_chair_worn_red_l_0_0 kit_dining_chair_worn_red_r_0_0 kit_dining_table_worn_blue_0_0 kit_dining_table_worn_blue_0_1 kit_dining_table_worn_green_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 384,258 | kit_dining_chair_worn_blue_l_0_0 kit_dining_chair_worn_blue_r_0_0 kit_dining_chair_worn_green_r_0_0 kit_dining_table_normal_red_0_0 kit_dining_table_worn_green_0_0 kit_dining_table_worn_green_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 512,258 | kit_dining_chair_normal_red_r_0_0 kit_dining_chair_worn_green_l_0_0 kit_dining_chair_worn_green_r_0_0 kit_dining_table_normal_blue_0_0 kit_dining_table_normal_red_0_0 kit_dining_table_normal_red_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 640,258 | kit_dining_chair_normal_blue_r_0_0 kit_dining_chair_normal_red_l_0_0 kit_dining_chair_normal_red_r_0_0 kit_dining_table_normal_blue_0_0 kit_dining_table_normal_blue_0_1 kit_dining_table_normal_green_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 768,258 | kit_dining_chair_normal_blue_l_0_0 kit_dining_chair_normal_blue_r_0_0 kit_dining_chair_normal_green_r_0_0 kit_dining_table_fancy_red_0_0 kit_dining_table_normal_green_0_0 kit_dining_table_normal_green_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 896,258 | kit_dining_chair_normal_green_l_0_0 kit_dining_chair_normal_green_r_0_0 kit_dining_table_fancy_red_0_0 kit_dining_table_fancy_red_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 266,320 | kit_dining_chair_fancy_green_r_0_0 kit_dining_chair_worn_red_r_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 330,320 | kit_dining_chair_fancy_green_l_0_0 kit_dining_chair_worn_red_l_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 394,320 | kit_dining_chair_worn_blue_r_0_0 kit_kitchen_fridge_worn_teal_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 522,320 | kit_dining_chair_worn_green_r_0_0 kit_kitchen_fridge_normal_teal_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 650,320 | kit_dining_chair_normal_red_r_0_0 kit_kitchen_fridge_fancy_teal_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 640,320 | kit_coat_rack_fancy_purple_0_0 kit_coat_rack_fancy_purple_1_0 kit_coat_rack_worn_green_0_0 kit_coat_rack_worn_red_0_0 kit_coat_rack_worn_red_1_0 kit_dining_chair_normal_blue_r_0_0 kit_dining_chair_normal_red_l_0_0 kit_dining_chair_normal_red_r_0_0 kit_kitchen_counter_worn_teal_0_0 kit_kitchen_fridge_fancy_teal_0_0 kit_kitchen_fridge_fancy_teal_1_0 kit_kitchen_stove_fancy_teal_0_0 kit_kitchen_stove_normal_teal_0_0 kit_kitchen_stove_normal_teal_1_0 kit_shoes_worn_blue_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 778,320 | kit_dining_chair_normal_blue_r_0_0 kit_kitchen_counter_worn_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 768,320 | kit_bookcase_worn_teal_0_0 kit_coat_rack_worn_green_0_0 kit_coat_rack_worn_green_1_0 kit_coat_rack_worn_purple_0_0 kit_dining_chair_normal_blue_l_0_0 kit_dining_chair_normal_blue_r_0_0 kit_dining_chair_normal_green_r_0_0 kit_kitchen_counter_normal_teal_0_0 kit_kitchen_counter_worn_teal_0_0 kit_kitchen_counter_worn_teal_1_0 kit_kitchen_stove_fancy_teal_0_0 kit_kitchen_stove_fancy_teal_1_0 kit_shoes_fancy_blue_0_0 kit_shoes_normal_blue_0_0 kit_shoes_worn_blue_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 906,320 | kit_dining_chair_normal_green_r_0_0 kit_kitchen_counter_normal_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 896,320 | kit_basket_worn_red_0_0 kit_bookcase_worn_teal_0_0 kit_bookcase_worn_teal_1_0 kit_coat_rack_worn_purple_0_0 kit_coat_rack_worn_purple_1_0 kit_dining_chair_normal_green_l_0_0 kit_dining_chair_normal_green_r_0_0 kit_kitchen_counter_normal_teal_0_0 kit_kitchen_counter_normal_teal_1_0 kit_shoes_fancy_blue_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,322 | kit_dining_chair_fancy_blue_r_0_0 kit_dining_chair_fancy_red_l_0_0 kit_dining_chair_fancy_red_r_0_0 kit_dining_table_fancy_blue_0_0 kit_dining_table_fancy_blue_0_1 kit_dining_table_fancy_green_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 128,322 | kit_dining_chair_fancy_blue_l_0_0 kit_dining_chair_fancy_blue_r_0_0 kit_dining_chair_fancy_green_r_0_0 kit_dining_chair_worn_red_r_0_0 kit_dining_table_fancy_green_0_0 kit_dining_table_fancy_green_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 10,384 | kit_dining_chair_fancy_red_r_0_0 kit_kitchen_counter_fancy_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,384 | kit_basket_normal_green_0_0 kit_basket_normal_red_0_0 kit_basket_worn_green_0_0 kit_bookcase_fancy_teal_0_0 kit_bookcase_normal_teal_0_0 kit_bookcase_normal_teal_1_0 kit_coat_rack_normal_green_0_0 kit_coat_rack_normal_red_0_0 kit_coat_rack_normal_red_1_0 kit_dining_chair_fancy_blue_r_0_0 kit_dining_chair_fancy_red_l_0_0 kit_dining_chair_fancy_red_r_0_0 kit_kitchen_counter_fancy_teal_0_0 kit_kitchen_counter_fancy_teal_1_0 kit_kitchen_sink_worn_teal_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 138,384 | kit_dining_chair_fancy_blue_r_0_0 kit_kitchen_sink_worn_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 266,384 | kit_dining_chair_fancy_green_r_0_0 kit_kitchen_sink_normal_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 386,384 | kit_kitchen_fridge_worn_teal_0_0 kit_kitchen_sink_fancy_teal_0_0 | tall | reprojected top 16%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 514,384 | kit_kitchen_fridge_normal_teal_0_0 kit_kitchen_stove_worn_teal_0_0 | tall | reprojected top 16%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 642,384 | kit_kitchen_fridge_fancy_teal_0_0 kit_kitchen_stove_normal_teal_0_0 | tall | reprojected top 16%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 652,514 | kit_coat_rack_fancy_purple_0_0 kit_coat_rack_worn_red_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 780,514 | kit_coat_rack_worn_green_0_0 kit_shoes_worn_blue_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 908,514 | kit_coat_rack_worn_purple_0_0 kit_shoes_fancy_blue_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 12,578 | kit_basket_worn_green_0_0 kit_coat_rack_normal_red_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 140,578 | kit_basket_normal_green_0_0 kit_coat_rack_normal_green_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 268,578 | kit_basket_fancy_green_0_0 kit_coat_rack_normal_purple_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 396,578 | kit_book_stack_normal_red_0_0 kit_coat_rack_fancy_red_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 780,612 | kit_shoes_worn_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 844,612 | kit_shoes_normal_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 908,612 | kit_shoes_fancy_blue_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 332,660 | kit_book_stack_worn_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 396,660 | kit_book_stack_normal_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 460,660 | kit_book_stack_fancy_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 968,968 | kit_radio_worn_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 962,1022 | kit_bookshelf3_worn_brown_1_0 kit_radio_worn_red_0_0 kit_table3_normal_brown_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 712,1024 | kit_rods_worn_green_0_0 kit_table3_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 8,1032 | kit_radio_worn_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 72,1032 | kit_radio_normal_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 136,1032 | kit_radio_normal_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 200,1032 | kit_radio_fancy_red_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 264,1032 | kit_radio_fancy_teal_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,1086 | kit_bookshelf3_fancy_brown_0_0 kit_bookshelf3_fancy_brown_1_0 kit_bookshelf3_normal_brown_0_0 kit_bookshelf3_normal_brown_1_0 kit_couch3_fancy_blue_l_0_0 kit_couch3_fancy_blue_l_1_0 kit_couch3_fancy_blue_r_0_0 kit_couch3_fancy_blue_r_1_0 kit_couch3_worn_blue_l_0_0 kit_couch3_worn_blue_l_1_0 kit_couch3_worn_blue_r_0_0 kit_couch3_worn_blue_r_1_0 kit_couch_front_fancy_mustard_0_1 kit_couch_front_fancy_mustard_1_0 kit_couch_front_fancy_mustard_1_1 kit_couch_low_worn_navy_0_0 kit_couch_side_fancy_mustard_l_0_0 kit_couch_side_fancy_mustard_r_0_1 kit_couch_side_fancy_mustard_r_1_0 kit_couch_side_fancy_mustard_r_1_1 kit_couch_side_worn_mustard_l_0_0 kit_couch_side_worn_mustard_r_0_1 kit_couch_side_worn_mustard_r_1_0 kit_couch_side_worn_mustard_r_1_1 kit_fridge3_fancy_teal_0_0 kit_fridge3_fancy_teal_1_0 kit_fridge3_normal_green_0_0 kit_fridge3_normal_green_1_0 kit_radio_fancy_red_0_0 kit_radio_normal_red_0_0 kit_radio_normal_teal_0_0 kit_radio_worn_teal_0_0 kit_table3_fancy_brown_0_0 kit_table3_fancy_brown_0_1 kit_table3_normal_brown_1_0 kit_table3_normal_brown_1_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,1086 | kit_bookshelf3_fancy_brown_0_0 kit_bookshelf3_fancy_brown_1_0 kit_radio_fancy_red_0_0 kit_radio_normal_teal_0_0 kit_table3_fancy_brown_0_0 kit_table3_fancy_brown_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 194,1086 | kit_bookshelf3_fancy_brown_1_0 kit_bookshelf_p2worn_worn_brown_0_0 kit_radio_fancy_red_0_0 kit_radio_fancy_teal_0_0 kit_table3_fancy_brown_0_1 kit_table3_fancy_brown_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 256,1086 | kit_bookshelf_p2worn_normal_brown_0_0 kit_bookshelf_p2worn_worn_brown_0_0 kit_bookshelf_p2worn_worn_brown_1_0 kit_chair3_worn_brown_r_0_0 kit_couch3_normal_teal_l_0_0 kit_couch3_normal_teal_r_0_0 kit_couch3_normal_teal_r_1_0 kit_crates_worn_red_0_0 kit_crates_worn_red_0_1 kit_crt3_normal_brown_r_0_0 kit_crt3_worn_brown_l_0_0 kit_crt3_worn_brown_r_0_0 kit_radio_fancy_teal_0_0 kit_table3_fancy_brown_1_0 kit_table3_fancy_brown_1_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 386,1086 | kit_bookshelf_p2worn_normal_brown_0_0 kit_bookshelf_p2worn_normal_brown_1_0 kit_chair3_worn_brown_l_0_0 kit_chair3_worn_brown_r_0_0 kit_crates_normal_red_0_0 kit_crates_worn_red_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 450,1086 | kit_bookshelf_p2worn_fancy_brown_0_0 kit_bookshelf_p2worn_normal_brown_1_0 kit_chair3_normal_brown_r_0_0 kit_chair3_worn_brown_l_0_0 kit_crates_normal_red_0_0 kit_crates_normal_red_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 514,1086 | kit_bookshelf_p2worn_fancy_brown_0_0 kit_bookshelf_p2worn_fancy_brown_1_0 kit_chair3_normal_brown_l_0_0 kit_chair3_normal_brown_r_0_0 kit_crates_fancy_red_0_0 kit_crates_normal_red_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 578,1086 | kit_bookshelf_p2worn_fancy_brown_1_0 kit_chair3_fancy_brown_r_0_0 kit_chair3_normal_brown_l_0_0 kit_crates_fancy_red_0_0 kit_crates_fancy_red_0_1 kit_table3_worn_brown_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 640,1090 | kit_chair3_fancy_brown_l_0_0 kit_chair3_fancy_brown_r_0_0 kit_couch3_worn_teal_r_0_0 kit_table3_worn_brown_0_0 kit_table3_worn_brown_0_1 kit_table3_worn_brown_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 770,1152 | kit_couch3_fancy_teal_r_0_0 kit_couch3_fancy_teal_r_1_0 kit_couch3_worn_teal_r_0_0 kit_couch3_worn_teal_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 898,1152 | kit_couch3_fancy_teal_l_0_0 kit_couch3_fancy_teal_l_1_0 kit_couch3_worn_teal_l_0_0 kit_couch3_worn_teal_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 128,1154 | kit_couch3_fancy_blue_l_0_0 kit_couch3_fancy_blue_l_1_0 kit_couch3_normal_teal_r_0_0 kit_couch3_worn_blue_l_0_0 kit_couch3_worn_blue_l_1_0 kit_couch_side_worn_mustard_l_0_0 kit_couch_side_worn_mustard_l_0_1 kit_couch_side_worn_mustard_r_1_1 kit_crt3_worn_brown_r_0_0 kit_fridge3_fancy_green_0_0 kit_fridge3_fancy_teal_0_0 kit_fridge3_fancy_teal_1_0 kit_table3_fancy_brown_0_0 kit_table3_fancy_brown_0_1 kit_table3_fancy_brown_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 394,1156 | kit_chair3_worn_brown_r_0_0 kit_couch3_normal_teal_l_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 450,1156 | kit_chair3_normal_brown_r_0_0 kit_chair3_worn_brown_l_0_0 kit_couch3_normal_blue_r_0_0 kit_couch3_normal_teal_l_1_0 kit_crt3_fancy_brown_r_0_0 kit_crt3_normal_brown_l_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 522,1156 | kit_chair3_normal_brown_r_0_0 kit_couch3_normal_blue_r_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 578,1156 | kit_chair3_fancy_brown_r_0_0 kit_chair3_normal_brown_l_0_0 kit_couch3_normal_blue_l_0_0 kit_couch3_normal_blue_r_1_0 kit_crt3_fancy_brown_l_0_0 kit_fridge3_worn_teal_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 650,1156 | kit_chair3_fancy_brown_r_0_0 kit_couch3_normal_blue_l_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,1216 | kit_couch3_fancy_blue_r_0_0 kit_couch3_fancy_blue_r_1_0 kit_couch3_worn_blue_r_0_0 kit_couch3_worn_blue_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,1216 | kit_couch3_fancy_blue_l_0_0 kit_couch3_fancy_blue_l_1_0 kit_couch3_worn_blue_l_0_0 kit_couch3_worn_blue_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,1216 | kit_couch3_normal_teal_r_0_0 kit_couch3_normal_teal_r_1_0 kit_crt3_worn_brown_l_0_0 kit_crt3_worn_brown_r_0_0 kit_fridge3_fancy_green_0_0 kit_fridge3_fancy_green_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 642,1216 | kit_couch3_normal_blue_l_0_0 kit_couch3_normal_blue_l_1_0 kit_fridge3_worn_teal_0_0 kit_fridge3_worn_teal_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 770,1216 | kit_couch3_fancy_teal_r_0_0 kit_couch3_fancy_teal_r_1_0 kit_fridge3_worn_green_0_0 kit_fridge3_worn_green_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 898,1216 | kit_couch3_fancy_teal_l_0_0 kit_couch3_fancy_teal_l_1_0 kit_fridge3_normal_teal_0_0 kit_fridge3_normal_teal_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 450,1278 | kit_couch3_normal_teal_l_1_0 kit_couch_side_normal_mustard_r_0_0 kit_crt3_normal_brown_l_0_0 kit_side3_normal_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,1280 | kit_couch3_fancy_blue_r_0_0 kit_couch3_fancy_blue_r_1_0 kit_fridge3_normal_green_0_0 kit_fridge3_normal_green_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 130,1280 | kit_couch3_fancy_blue_l_0_0 kit_couch3_fancy_blue_l_1_0 kit_fridge3_fancy_teal_0_0 kit_fridge3_fancy_teal_1_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 2,1344 | kit_couch_side_worn_mustard_r_0_1 kit_fridge3_normal_green_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,1344 | kit_couch_side_worn_mustard_l_0_1 kit_fridge3_fancy_green_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 962,1344 | kit_couch_side_fancy_mustard_r_0_0 kit_couch_side_worn_mustard_r_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,1408 | kit_couch_side_fancy_mustard_r_0_1 kit_couch_side_fancy_mustard_r_1_0 kit_couch_side_worn_mustard_r_0_1 kit_couch_side_worn_mustard_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 194,1408 | kit_couch_side_fancy_mustard_l_0_0 kit_couch_side_fancy_mustard_l_0_1 kit_couch_side_fancy_mustard_l_1_0 kit_couch_side_worn_mustard_l_0_0 kit_couch_side_worn_mustard_l_0_1 kit_couch_side_worn_mustard_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 450,1408 | kit_couch_front_worn_mustard_0_0 kit_couch_front_worn_mustard_0_1 kit_couch_front_worn_mustard_1_0 kit_couch_side_normal_mustard_r_0_0 kit_couch_side_normal_mustard_r_0_1 kit_couch_side_normal_mustard_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 706,1408 | kit_couch_front_normal_mustard_0_0 kit_couch_front_normal_mustard_0_1 kit_couch_front_normal_mustard_1_0 kit_couch_side_normal_mustard_l_0_0 kit_couch_side_normal_mustard_l_0_1 kit_couch_side_normal_mustard_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 962,1408 | kit_couch_front_fancy_mustard_0_0 kit_couch_side_fancy_mustard_r_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,1472 | kit_couch_front_fancy_mustard_0_1 kit_couch_front_fancy_mustard_1_0 kit_couch_side_fancy_mustard_r_0_1 kit_couch_side_fancy_mustard_r_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 194,1472 | kit_couch_low_normal_navy_0_0 kit_couch_low_worn_navy_0_0 kit_couch_low_worn_navy_0_1 kit_couch_side_fancy_mustard_l_0_0 kit_couch_side_fancy_mustard_l_0_1 kit_couch_side_fancy_mustard_l_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 702,1472 | kit_couch_front_normal_mustard_0_0 kit_couch_front_normal_mustard_0_1 kit_couch_front_normal_mustard_1_0 kit_couch_front_worn_mustard_1_1 kit_tv_back_fancy_brown_0_0 kit_tv_back_normal_brown_0_0 kit_tv_back_normal_brown_0_1 kit_tv_back_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,1536 | kit_couch_front_fancy_mustard_0_1 kit_couch_front_fancy_mustard_1_0 kit_crt3_back_fancy_brown_0_0 kit_crt3_back_normal_brown_0_0 kit_kitchen_stove3_normal_teal_0_0 kit_kitchen_stove3_normal_teal_1_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 384,1544 | kit_coat_rack3_normal_red_0_0 kit_coat_rack3_normal_red_1_0 kit_coat_rack3_worn_green_0_0 kit_coat_rack3_worn_green_1_0 kit_couch_low_fancy_navy_0_0 kit_couch_low_fancy_navy_0_1 kit_couch_low_normal_navy_0_1 kit_crates3_normal_red_0_0 kit_crates3_normal_red_0_1 kit_crates3_worn_red_0_0 kit_crates3_worn_red_0_1 kit_kitchen_counter3_fancy_teal_0_0 kit_kitchen_counter3_fancy_teal_1_0 kit_kitchen_sink3_worn_teal_0_0 kit_kitchen_sink3_worn_teal_1_0 kit_tv_back_worn_brown_0_0 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 512,1546 | kit_coat_rack3_normal_green_0_0 kit_coat_rack3_normal_red_0_0 kit_coat_rack3_normal_red_1_0 kit_couch_low_fancy_navy_0_1 kit_crates3_fancy_red_0_0 kit_crates3_normal_red_0_0 kit_crates3_normal_red_0_1 kit_kitchen_sink3_normal_teal_0_0 kit_kitchen_sink3_worn_teal_0_0 kit_kitchen_sink3_worn_teal_1_0 kit_tv_back_worn_brown_0_0 kit_tv_back_worn_brown_0_1 | tall | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 396,1666 | kit_coat_rack3_worn_green_0_0 kit_crates3_worn_red_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 524,1666 | kit_coat_rack3_normal_red_0_0 kit_crates3_normal_red_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 652,1666 | kit_coat_rack3_normal_green_0_0 kit_crates3_fancy_red_0_0 | tall | reprojected top 14%->30%; value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,1796 | kit_kitchen_sink3_fancy_teal_0_0 kit_kitchen_sink3_fancy_teal_1_0 kit_kitchen_sink3_normal_teal_0_0 kit_kitchen_sink3_worn_teal_1_0 kit_kitchen_sink_fancy_teal_0_0 kit_kitchen_sink_fancy_teal_1_0 kit_kitchen_sink_normal_teal_0_0 kit_kitchen_sink_worn_teal_0_0 kit_kitchen_sink_worn_teal_1_0 kit_kitchen_stove3_fancy_teal_0_0 kit_kitchen_stove3_fancy_teal_1_0 kit_kitchen_stove3_worn_teal_0_0 kit_kitchen_stove3_worn_teal_1_0 kit_kitchen_stove_fancy_teal_0_0 kit_kitchen_stove_normal_teal_1_0 kit_kitchen_stove_worn_teal_0_0 kit_kitchen_stove_worn_teal_1_0 kit_tv_back_fancy_brown_0_0 kit_tv_back_normal_brown_0_0 kit_tv_back_normal_brown_0_1 kit_tv_back_worn_brown_0_0 kit_tv_back_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 0,1988 | kit_kitchen_stove3_worn_teal_0_0 kit_kitchen_stove_normal_teal_1_0 kit_kitchen_stove_worn_teal_0_0 kit_tv_back_normal_brown_0_0 kit_tv_back_normal_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 768,1988 | kit_kitchen_stove_normal_teal_0_0 kit_tv_back_fancy_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 832,1988 | kit_kitchen_stove_normal_teal_0_0 kit_tv_back_fancy_brown_0_1 kit_tv_back_normal_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 128,2052 | kit_kitchen_stove_worn_teal_0_0 kit_tv_back_normal_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 192,2052 | kit_kitchen_stove_worn_teal_0_0 kit_tv_back_normal_brown_0_1 kit_tv_back_worn_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 514,2058 | kit_tv_back_fancy_brown_0_0 kit_tv_back_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 578,2058 | kit_tv_back_fancy_brown_0_0 kit_tv_back_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 766,2058 | kit_tv_back_fancy_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 830,2058 | kit_tv_back_fancy_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 898,2058 | kit_tv_back_normal_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 962,2058 | kit_tv_back_normal_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 126,2122 | kit_tv_back_normal_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 190,2122 | kit_tv_back_normal_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 258,2122 | kit_tv_back_worn_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 322,2122 | kit_tv_back_worn_brown_0_0 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 510,2122 | kit_tv_back_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |
| ix2_kit_v3.png | 574,2122 | kit_tv_back_worn_brown_0_1 | low | value/light re-shade; drop shadow 2px DR |

Also: src/systems/chest_art.js (new), src/systems/index.js satchelSprite, art/world/overworld/props/supply_chest_{closed,open}{,_2x,_3x}.{png,webp} (new).

## Follow-up pass (Oct 30, 2026)
- **Iron chest**: tools/chests/make_chest.py PAL_IRON -> props/supply_chest_iron_{closed,open}{,_2x,_3x}.{png,webp}, chest_art.js
  CHEST_PAL_IRON. src/systems/index.js `chestVariantAt()` picks iron automatically when the ground tile under a pickup
  matches WOOD_FLOOR_RE (oak/pine/parquet/drift floors, planks, docks, piers, decks). Value check: 0 flagged.
- **Blocked word / logos**: i_poster_route renamed i_poster_trail (same id 7426) in all tilesets + README. i_rt_logo_panel in
  heal rooms (aurelith, brookhollow, fernwick, frostspire, revival, saltmere; build_aurelith_city.py) replaced by the new
  neutral i_heal_info_panel (ids 7491/7492, i_brand col 11-12 row 1; teal heart + blank lines, no text, no logo;
  tools/furniture_perspective/heal_panel.py).
- **Colour check**: tools/furniture_perspective/colour_check.py compares exact opaque RGB codes of every placed furniture
  piece against the floor/wall/window tiles of each room (incl. tiles a flag_swap can show) on the sheets the game
  draws (ix2: *_v3 / *_v2), outline ink (<40) ignored, plus both chest palettes against the floor under each pickup.
  First run: 335 shared codes in 24 rooms; `--fix` nudged 32 pieces (exact-code swap, +-1..6 per channel, all scales
  + webp). Rerun: 0.
- **Heal text (Text Bot, data/textbot_heal_props.json)**: 80 lines merged into text/overworld_lines.json maps.<map>.<spot id>
  and wired through `_spotsFor` (heal_* spots with a lines entry). Terminal spots `opens: company_terminal` = real menu
  first, then the flavour line. Counter spots `reach_over`: when staff stand behind, talking/healing wins. Visitor PC has
  no menu in the game, so it shows flavour only. heal_lanternport's old keys (newsletter, suggestion_box,
  company_terminal, sofa, anchor) retired. system_items.empty_satchel now says chest (pages_old kept); bag.js fallback too.
- **Regression fixed**: 3f9a6fd7 furnish_heal overwrote text_pending.interact_spots, dropping the base company_terminal
  spot and lap_nap_seat triggers; triggers restored (brookhollow, fernwick), terminal reachable again; furnish_heal is
  idempotent (`--check` 0).
- **Frost coral**: i_plant_frost_coral (id 7501, frost_coral.py) on heal_frostspire. Revival/Saltmere keep the pink coral
  (their Text Bot lines say "coral" / "marsh coral").
- **Time of day**: the `hour=` URL param is not applied to the clock at load. shots_fp.mjs now uses `?skipintro=1`, calls
  `scene.setHour(h)` after each warp (clock.js: dawn 5-7, day 8-16, dusk 17-19, night 20-4) and dismisses dialogue.
  Indoor maps keep the day grade (IxLight adds the night shade; off in heal/rt rooms). Shots:
  shots/furniture_perspective_wd/tod_v2/ (mean luma town 113.7 / 109.5 / 97.1 / 89.5 for dawn/day/dusk/night; hues differ).
  SHOW_TBD=1 makes TBD pickups visible for the shot (all wood-floor pickups are TBD today).

## Tasks 1-4 + director QA pass (Oct 30, 2026, wd)
- **Wood-floor pickups**: home_brookhollow_b_2f -> calm_tea, home_fernwick_a_2f -> trail_mix, home_lanternport_c_2f ->
  feed_bag_small, so the iron chest shows in normal play. chest_art import is `?v=v0.2.93-alpha-chest2` (6282f7b6).
- **Visitor PC**: spots `*_visitor_pc` open `openVisitorPC()` (overworld.js): Read page / Inbox / Storage (openTerminal) /
  Log off, same ask() loop as the company terminal. tests/visitor_pc.test.mjs.
- **De-brand**: debrand_posters.py redraws the last i_rt_* props: notice board (7471/7472 -> i_notice_board_0_{0,1}),
  i_poster_care / i_poster_safety / i_poster_join (7480-7482). Builders + furnish_heal regex follow the new names.
  Lesson: renaming a tile can move it out of a check's SKIP regex (the panel got nudged by colour --fix); grep every
  regex that keys on names before renaming.
- **Colour check**: now runs both MODE ix2 and fallback (base sheets for ix2=0); exit 1 if either shares a code.
  --fix nudged 253 fallback pieces; both 0. --fix is slow (~5 min): run it in the background.
- **Window-light rings (QA b)**: IxLight lit the ground layer too; its banded alpha thresholds drew pale circles on
  floors (bedroom, house_c, living room). Lower pass lights decoration only now.
- **Redraws (QA a/c/f/g, qa_redraw.py)**: bed (headboard cap + front, sheet/pillow/blanket top, blanket drop + footboard
  front; the old v3 headboard had ~alpha-80 ghost pixels), heal counter l/m/r (top face + front panels, l/r end inside
  their squares, ink only on outer ends so no seams), specimen vats (lit cap/base tops, solid bands instead of noisy
  dither), shop shelf goods_0_0 (12 px top face, back inset = 35 deg read). Every top face is asserted >= 25% lighter in
  greyscale than its front. The v3 sheets are exact nearest upscales of 1x: draw at 1x, upscale, and always rewrite the
  lossless .webp twin (the game loads .webp first; a stale twin hides a PNG edit). interior_v3 redraws also write the
  normal cell (interior_v3_n) so IxLight shades top/front planes correctly.
- **Station dots (QA e)**: green corner pixels baked into x_station_floor (base + v3, all scales) replaced with the
  neighbouring floor pixel. The hall "orange rects" are not in this branch's art: the orange frame on the hall gate is
  the approved puzzle tell (puzzle_tells.js), not debug.
- **Club door (QA d)**: club_door_frame_t is a non-ysort overlay, so it already draws over actors here; shots at rows 6/7/8
  show the lintel in front of the player. No change needed on this branch.
- **Item 1 (131 walkable solids)**: every change in the /workspace/kilumen gridcheck list already matches this branch's
  tilesets, and every placed block tile has collision 1 in its map; grid_fit_and_swap --check reports 0 changes.
- Shots: shots/furniture_perspective_wd/qa_fix/<room>_h{6,12,18,22}_pc.png (20 rooms x dawn/day/dusk/night).

## Open issues
- Internal "satchel" identifiers (satchelSprite, empty_satchel key) remain.
- tiles_*x/building.webp twins differ from building.png (pre-existing, not touched here).
