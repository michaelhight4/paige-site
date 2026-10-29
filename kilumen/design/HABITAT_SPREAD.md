# Habitat spread (Coder, Oct 29 2026, awaiting Gary's approval)

Gary: "some of the kilumen and their level 2 evos can be found almost anywhere their habitat exists at the level that's correct for that zone".

## Rules
- 16 lines of common, adaptable creatures (base form + its stage-2 form). Not included: legendaries, rare bases, crystal-only forms, Master signatures, the Jestrix line.
- Each live table gets a habitat tag (`ZONE_HABITAT` / `FISH_HABITAT` in `tools/encounters/habitat_spread.mjs`). A line goes into every table that shares one of its habitats.
- Levels: the table's own range (lowest lo to highest hi of its authored slots). The stage-2 form only appears at or above its evolution level (16), so it is left out of tables that top out below 16 (Sunmeadow route 1, Thornwood, Route 1 / Brookhollow fishing).
- Weights: the spread slots together come to about 15% of the table (tests require 10-20%). Base weight is about 2x stage-2 weight, so stage 2 is always rarer. When a table is too small to fit every line, later lines in the list are dropped.
- Local identity: if a line's base or stage 2 is already in a table, that line is skipped there and the authored slot stays as it is. Authored slots are never changed, so local creatures stay at 80-86% of every table.
- No spread: inert World Design draft tables, crystal-lit `route_revival_tr_crystal_grass`, volcanic `route_cindervale_grass` (ash grass keeps its own pool), and Lanternport fishing (hand-tuned in FISHING_GEAR.md §6).
- Spread slots are tagged `"spread": "habitat"`. The script is idempotent: it removes old spread slots and adds them again.

## Regeneration
`node tools/encounters/habitat_spread.mjs` writes the source `art/world/overworld/encounters/encounters.json`, the generated `data/encounters_wired.json` and the basic rod tables in `data/fishing_tables.json`. Run it again after `tools/sync_creatures.mjs` (that script is not in this repo) or `tools/fishing/gen_gear_tables.mjs` regenerate their outputs. `--check` exits 1 when a file is stale. `tests/habitat_spread.test.mjs` fails when the files do not match the script output.

## Lines
| Line (base -> stage 2, evolves at 16) | Habitats | Tables (base) | Tables (stage 2) | Where, level, weight |
|---|---|---|---|---|
| peeplark -> larkspar | grass, mountain, snow | 6 | 6 | peeplark: route_east_grass (12-16, w8); route_revival_grass (22-24, w6); frostspire_pass_grass (25-30, w4); frostspire_grass (26-33, w8); route_revival_sunmeadow_grass (31-34, w3); sunmeadow_fields_grass (30-34, w3)<br>larkspar: route_east_grass (16-16, w4); route_revival_grass (22-24, w3); frostspire_pass_grass (25-30, w2); frostspire_grass (26-33, w4); route_revival_sunmeadow_grass (31-34, w1); sunmeadow_fields_grass (30-34, w1) |
| dewmite -> huskling | grass, forest | 4 | 3 | dewmite: thornwood_grass (9-13, w14); route_east_grass (12-16, w8); route_revival_sunmeadow_grass (31-34, w3); sunmeadow_fields_grass (30-34, w3)<br>huskling: route_east_grass (16-16, w4); route_revival_sunmeadow_grass (31-34, w1); sunmeadow_fields_grass (30-34, w1) |
| pebblant -> cairnant | grass, mountain | 5 | 5 | pebblant: route_east_grass (12-16, w8); route_revival_grass (22-24, w6); frostspire_pass_grass (25-30, w4); route_revival_sunmeadow_grass (31-34, w3); sunmeadow_fields_grass (30-34, w3)<br>cairnant: route_east_grass (16-16, w4); route_revival_grass (22-24, w3); frostspire_pass_grass (25-30, w2); route_revival_sunmeadow_grass (31-34, w1); sunmeadow_fields_grass (30-34, w1) |
| briarlet -> bramblehog | grass, forest | 4 | 3 | briarlet: sunmeadow_grass (2-4, w30); route_east_grass (12-16, w8); route_revival_sunmeadow_grass (31-34, w3); sunmeadow_fields_grass (30-34, w3)<br>bramblehog: route_east_grass (16-16, w4); route_revival_sunmeadow_grass (31-34, w1); sunmeadow_fields_grass (30-34, w1) |
| capling -> toadcap | forest, swamp | 7 | 6 | capling: thornwood_grass (9-13, w14); mirefen_grass_w (33-38, w4); mirefen_grass_ne (33-38, w4); mirefen_grass_s (34-39, w4); route_sunmeadow_mirefen_grass (32-35, w4); route_saltmere_mirefen_grass (32-35, w6); route_east_reeds (12-16, w11)<br>toadcap: mirefen_grass_w (33-38, w2); mirefen_grass_ne (33-38, w2); mirefen_grass_s (34-39, w2); route_sunmeadow_mirefen_grass (32-35, w2); route_saltmere_mirefen_grass (32-35, w3); route_east_reeds (16-16, w6) |
| ditchsnap -> snapmoor | swamp, swamp_water | 7 | 7 | ditchsnap: mirefen_grass_w (33-38, w4); mirefen_grass_ne (33-38, w4); mirefen_grass_s (34-39, w4); mirefen_bog_surf (30-41, w6); route_sunmeadow_mirefen_grass (32-35, w4); route_saltmere_mirefen_grass (32-35, w6); fish:mirefen_bog (30-41, w6)<br>snapmoor: mirefen_grass_w (33-38, w2); mirefen_grass_ne (33-38, w2); mirefen_grass_s (34-39, w2); mirefen_bog_surf (30-41, w3); route_sunmeadow_mirefen_grass (32-35, w2); route_saltmere_mirefen_grass (32-35, w3); fish:mirefen_bog (30-41, w3) |
| pondkin -> reedmoot | freshwater, swamp_water, swamp | 20 | 17 | pondkin: mirefen_grass_w (33-38, w4); mirefen_grass_ne (33-38, w4); mirefen_grass_s (34-39, w4); mirefen_bog_surf (30-41, w6); route_east_water (15-18, w11); sunmeadow_fields_water (28-35, w6); route_sunmeadow_mirefen_grass (32-35, w4); route_fernwick_lanternport_water (40-47, w5); route_east_reeds (12-16, w11); fish:brookhollow (3-10, w18); fish:route1 (2-5, w18); fish:fernwick (8-11, w7); fish:frostspire_pass (24-27, w6); fish:greystone_entrance (18-22, w12); fish:greystone_b1 (14-18, w12); fish:mirefen_bog (30-41, w6); fish:route_east (15-18, w11); fish:route_sunmeadow_mirefen (32-35, w6); fish:sunmeadow_fields (28-35, w6); fish:route_fernwick_lanternport (40-47, w5)<br>reedmoot: mirefen_grass_w (33-38, w2); mirefen_grass_ne (33-38, w2); mirefen_grass_s (34-39, w2); mirefen_bog_surf (30-41, w3); route_east_water (16-18, w5); sunmeadow_fields_water (28-35, w3); route_sunmeadow_mirefen_grass (32-35, w2); route_fernwick_lanternport_water (40-47, w2); route_east_reeds (16-16, w6); fish:frostspire_pass (24-27, w3); fish:greystone_entrance (18-22, w6); fish:greystone_b1 (16-18, w6); fish:mirefen_bog (30-41, w3); fish:route_east (16-18, w5); fish:route_sunmeadow_mirefen (32-35, w3); fish:sunmeadow_fields (28-35, w3); fish:route_fernwick_lanternport (40-47, w2) |
| dartling -> streambarb | freshwater | 7 | 6 | dartling: sunmeadow_fields_water (28-35, w6); route_fernwick_lanternport_water (40-47, w5); fish:fernwick (8-11, w7); fish:frostspire_pass (24-27, w6); fish:route_sunmeadow_mirefen (32-35, w6); fish:sunmeadow_fields (28-35, w6); fish:route_fernwick_lanternport (40-47, w5)<br>streambarb: sunmeadow_fields_water (28-35, w3); route_fernwick_lanternport_water (40-47, w2); fish:frostspire_pass (24-27, w3); fish:route_sunmeadow_mirefen (32-35, w3); fish:sunmeadow_fields (28-35, w3); fish:route_fernwick_lanternport (40-47, w2) |
| pebbit -> rubblon | cave, mountain | 5 | 5 | pebbit: route_revival_grass (22-24, w6); frostspire_pass_grass (25-30, w4); frostspire_cave (27-32, w3); tidewater_coast_cave (41-45, w4); route_cindervale_cave (47-50, w3)<br>rubblon: route_revival_grass (22-24, w3); frostspire_pass_grass (25-30, w2); frostspire_cave (27-32, w2); tidewater_coast_cave (41-45, w2); route_cindervale_cave (47-50, w2) |
| stonepede -> columnpede | cave | 3 | 3 | stonepede: frostspire_cave (27-32, w3); tidewater_coast_cave (41-45, w4); route_cindervale_cave (47-50, w3)<br>columnpede: frostspire_cave (27-32, w2); tidewater_coast_cave (41-45, w2); route_cindervale_cave (47-50, w2) |
| delvelet -> delvemaw | cave | 3 | 3 | delvelet: frostspire_cave (27-32, w3); tidewater_coast_cave (41-45, w4); route_cindervale_cave (47-50, w3)<br>delvemaw: frostspire_cave (27-32, w2); tidewater_coast_cave (41-45, w2); route_cindervale_cave (47-50, w2) |
| pinchkin -> bulwarkrab | sea, coast | 13 | 13 | pinchkin: route_aurelith_saltmere_grass (15-17, w22); route_aurelith_saltmere_water (15-18, w7); route_revival_saltmere_grass (23-24, w7); route_saltmere_mirefen_water (32-36, w3); route_coast_grass (38-42, w6); route_coast_water (36-43, w6); tidewater_coast_grass (40-44, w5); tidewater_coast_water (40-45, w5); lanternport_water (42-46, w2); fish:route_coast (36-43, w6); fish:route_aurelith_saltmere (15-18, w7); fish:route_saltmere_mirefen (32-36, w3); fish:tidewater_coast (40-45, w5)<br>bulwarkrab: route_aurelith_saltmere_grass (16-17, w11); route_aurelith_saltmere_water (16-18, w3); route_revival_saltmere_grass (23-24, w4); route_saltmere_mirefen_water (32-36, w1); route_coast_grass (38-42, w3); route_coast_water (36-43, w3); tidewater_coast_grass (40-44, w2); tidewater_coast_water (40-45, w3); lanternport_water (42-46, w1); fish:route_coast (36-43, w3); fish:route_aurelith_saltmere (16-18, w3); fish:route_saltmere_mirefen (32-36, w1); fish:tidewater_coast (40-45, w3) |
| wavelin -> breakerfin | sea | 8 | 8 | wavelin: route_aurelith_saltmere_water (15-18, w7); saltmere_water (15-18, w24); route_saltmere_mirefen_water (32-36, w3); route_coast_water (36-43, w6); fish:route_coast (36-43, w6); fish:route_aurelith_saltmere (15-18, w7); fish:route_saltmere_mirefen (32-36, w3); fish:saltmere (15-18, w24)<br>breakerfin: route_aurelith_saltmere_water (16-18, w3); saltmere_water (16-18, w12); route_saltmere_mirefen_water (32-36, w1); route_coast_water (36-43, w3); fish:route_coast (36-43, w3); fish:route_aurelith_saltmere (16-18, w3); fish:route_saltmere_mirefen (32-36, w1); fish:saltmere (16-18, w12) |
| brinepipit -> spraytern | coast | 1 | 1 | brinepipit: tidewater_coast_grass (40-44, w5)<br>spraytern: tidewater_coast_grass (40-44, w2) |
| ledgedove -> belfrydove | urban, coast | 4 | 4 | ledgedove: route_aurelith_saltmere_grass (15-17, w22); route_revival_saltmere_grass (23-24, w7); route_coast_grass (38-42, w6); tidewater_coast_grass (40-44, w5)<br>belfrydove: route_aurelith_saltmere_grass (16-17, w11); route_revival_saltmere_grass (23-24, w4); route_coast_grass (38-42, w3); tidewater_coast_grass (40-44, w2) |
| pebbadillo -> scutadillo | mountain, snow | 2 | 2 | pebbadillo: frostspire_pass_grass (25-30, w4); frostspire_grass (26-33, w8)<br>scutadillo: frostspire_pass_grass (25-30, w2); frostspire_grass (26-33, w4) |
## Per table
| Table | Widespread share | Spread slots |
|---|---|---|
| sunmeadow_grass | 14.9% | briarlet 2-4 w30 |
| thornwood_grass | 15.3% | dewmite 9-13 w14, capling 9-13 w14 |
| mirefen_grass_w | 15.3% | capling 33-38 w4, toadcap 33-38 w2, ditchsnap 33-38 w4, snapmoor 33-38 w2, pondkin 33-38 w4, reedmoot 33-38 w2 |
| mirefen_grass_ne | 15.1% | capling 33-38 w4, toadcap 33-38 w2, ditchsnap 33-38 w4, snapmoor 33-38 w2, pondkin 33-38 w4, reedmoot 33-38 w2 |
| mirefen_grass_s | 15.0% | capling 34-39 w4, toadcap 34-39 w2, ditchsnap 34-39 w4, snapmoor 34-39 w2, pondkin 34-39 w4, reedmoot 34-39 w2 |
| mirefen_bog_surf | 15.3% | ditchsnap 30-41 w6, snapmoor 30-41 w3, pondkin 30-41 w6, reedmoot 30-41 w3 |
| route_east_grass | 15.1% | peeplark 12-16 w8, larkspar 16-16 w4, dewmite 12-16 w8, huskling 16-16 w4, pebblant 12-16 w8, cairnant 16-16 w4, briarlet 12-16 w8, bramblehog 16-16 w4 |
| route_east_water | 15.1% | pondkin 15-18 w11, reedmoot 16-18 w5 |
| route_aurelith_saltmere_grass | 14.9% | pinchkin 15-17 w22, bulwarkrab 16-17 w11, ledgedove 15-17 w22, belfrydove 16-17 w11 |
| route_aurelith_saltmere_water | 14.8% | pinchkin 15-18 w7, bulwarkrab 16-18 w3, wavelin 15-18 w7, breakerfin 16-18 w3 |
| saltmere_water | 14.9% | wavelin 15-18 w24, breakerfin 16-18 w12 |
| route_revival_grass | 16.0% | peeplark 22-24 w6, larkspar 22-24 w3, pebblant 22-24 w6, cairnant 22-24 w3, pebbit 22-24 w6, rubblon 22-24 w3 |
| route_revival_saltmere_grass | 15.0% | pinchkin 23-24 w7, bulwarkrab 23-24 w4, ledgedove 23-24 w7, belfrydove 23-24 w4 |
| frostspire_pass_grass | 14.1% | peeplark 25-30 w4, larkspar 25-30 w2, pebblant 25-30 w4, cairnant 25-30 w2, pebbit 25-30 w4, rubblon 25-30 w2, pebbadillo 25-30 w4, scutadillo 25-30 w2 |
| frostspire_grass | 15.3% | peeplark 26-33 w8, larkspar 26-33 w4, pebbadillo 26-33 w8, scutadillo 26-33 w4 |
| frostspire_cave | 15.8% | pebbit 27-32 w3, rubblon 27-32 w2, stonepede 27-32 w3, columnpede 27-32 w2, delvelet 27-32 w3, delvemaw 27-32 w2 |
| route_revival_sunmeadow_grass | 13.8% | peeplark 31-34 w3, larkspar 31-34 w1, dewmite 31-34 w3, huskling 31-34 w1, pebblant 31-34 w3, cairnant 31-34 w1, briarlet 31-34 w3, bramblehog 31-34 w1 |
| sunmeadow_fields_grass | 13.8% | peeplark 30-34 w3, larkspar 30-34 w1, dewmite 30-34 w3, huskling 30-34 w1, pebblant 30-34 w3, cairnant 30-34 w1, briarlet 30-34 w3, bramblehog 30-34 w1 |
| sunmeadow_fields_water | 15.3% | pondkin 28-35 w6, reedmoot 28-35 w3, dartling 28-35 w6, streambarb 28-35 w3 |
| route_sunmeadow_mirefen_grass | 15.3% | capling 32-35 w4, toadcap 32-35 w2, ditchsnap 32-35 w4, snapmoor 32-35 w2, pondkin 32-35 w4, reedmoot 32-35 w2 |
| route_saltmere_mirefen_grass | 15.3% | capling 32-35 w6, toadcap 32-35 w3, ditchsnap 32-35 w6, snapmoor 32-35 w3 |
| route_saltmere_mirefen_water | 13.8% | pinchkin 32-36 w3, bulwarkrab 32-36 w1, wavelin 32-36 w3, breakerfin 32-36 w1 |
| route_coast_grass | 15.3% | pinchkin 38-42 w6, bulwarkrab 38-42 w3, ledgedove 38-42 w6, belfrydove 38-42 w3 |
| route_coast_water | 15.3% | pinchkin 36-43 w6, bulwarkrab 36-43 w3, wavelin 36-43 w6, breakerfin 36-43 w3 |
| tidewater_coast_grass | 14.4% | pinchkin 40-44 w5, bulwarkrab 40-44 w2, brinepipit 40-44 w5, spraytern 40-44 w2, ledgedove 40-44 w5, belfrydove 40-44 w2 |
| tidewater_coast_water | 15.1% | pinchkin 40-45 w5, bulwarkrab 40-45 w3 |
| tidewater_coast_cave | 15.3% | pebbit 41-45 w4, rubblon 41-45 w2, stonepede 41-45 w4, columnpede 41-45 w2, delvelet 41-45 w4, delvemaw 41-45 w2 |
| lanternport_water | 15.0% | pinchkin 42-46 w2, bulwarkrab 42-46 w1 |
| route_fernwick_lanternport_water | 14.9% | pondkin 40-47 w5, reedmoot 40-47 w2, dartling 40-47 w5, streambarb 40-47 w2 |
| route_cindervale_cave | 15.8% | pebbit 47-50 w3, rubblon 47-50 w2, stonepede 47-50 w3, columnpede 47-50 w2, delvelet 47-50 w3, delvemaw 47-50 w2 |
| route_east_reeds | 15.0% | capling 12-16 w11, toadcap 16-16 w6, pondkin 12-16 w11, reedmoot 16-16 w6 |
| fish:brookhollow | 15.3% | pondkin 3-10 w18 |
| fish:route1 | 15.3% | pondkin 2-5 w18 |
| fish:fernwick | 14.9% | pondkin 8-11 w7, dartling 8-11 w7 |
| fish:frostspire_pass | 15.3% | pondkin 24-27 w6, reedmoot 24-27 w3, dartling 24-27 w6, streambarb 24-27 w3 |
| fish:greystone_entrance | 15.3% | pondkin 18-22 w12, reedmoot 18-22 w6 |
| fish:greystone_b1 | 15.3% | pondkin 14-18 w12, reedmoot 16-18 w6 |
| fish:mirefen_bog | 15.3% | ditchsnap 30-41 w6, snapmoor 30-41 w3, pondkin 30-41 w6, reedmoot 30-41 w3 |
| fish:route_coast | 15.3% | pinchkin 36-43 w6, bulwarkrab 36-43 w3, wavelin 36-43 w6, breakerfin 36-43 w3 |
| fish:route_east | 15.1% | pondkin 15-18 w11, reedmoot 16-18 w5 |
| fish:route_aurelith_saltmere | 14.8% | pinchkin 15-18 w7, bulwarkrab 16-18 w3, wavelin 15-18 w7, breakerfin 16-18 w3 |
| fish:route_saltmere_mirefen | 13.8% | pinchkin 32-36 w3, bulwarkrab 32-36 w1, wavelin 32-36 w3, breakerfin 32-36 w1 |
| fish:route_sunmeadow_mirefen | 15.3% | pondkin 32-35 w6, reedmoot 32-35 w3, dartling 32-35 w6, streambarb 32-35 w3 |
| fish:saltmere | 14.9% | wavelin 15-18 w24, breakerfin 16-18 w12 |
| fish:sunmeadow_fields | 15.3% | pondkin 28-35 w6, reedmoot 28-35 w3, dartling 28-35 w6, streambarb 28-35 w3 |
| fish:tidewater_coast | 15.1% | pinchkin 40-45 w5, bulwarkrab 40-45 w3 |
| fish:route_fernwick_lanternport | 14.9% | pondkin 40-47 w5, reedmoot 40-47 w2, dartling 40-47 w5, streambarb 40-47 w2 |
## Open for Gary
- Snow has no common two-stage line of its own (the Frostspire natives are single-stage or rare). Snow tables get the hardy mountain lines instead: peeplark and pebbadillo.
- Brinepipit only lands in Tidewater Coast because spraytern is already local in the other coast tables. Pebbadillo is mountain/snow only.
- Base forms appear at full zone level, for example a level 47 pondkin. That follows "the level that's correct for that zone". Saying so in case lower base levels are wanted late game.
- All weights and levels stay PLACEHOLDER, like the rest of the tables.
