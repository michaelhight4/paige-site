# Spots from World Design: overnight maps (integrated live Oct 23 2026, ~01:00 AM CT)

Source: `art/world/overworld/maps/<map>.json` (`npcs`, `signs`; promoted from `npcs_pending_text` / `signs_pending_text` in Batch 3, Oct 23 2026), built by `maps_new/zz_overnight.py`.
Every id here is waiting for a line at `overworld_lines.json maps.<map>.<id>`. Tile x,y is 0-based (column, row), one 64 px tile each. Facing is the way the NPC looks; signs are read facing up.
Hall Masters never spot the player (talk to them). Trainers have sight 3 or 4 tiles in their facing direction.
Kinds: villager / guard / clerk / trainer_hooded / master / villager_scholar are sprite kinds, not text.
Totals: 22 signs, 4 shop clerks, 34 NPCs, 103 trainers, 7 Master (trainer)s.


## route_east (40x26): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_east_sign` | 2,10 | (sign) | DRAFT dev label: East Road - Aurelith ahead (rail city), coast road south |
| trainer | `route_east_trainer_1` | 2,11 | down | GD tr_route_brookhollow_aurelith_a Courier 'Hollis' L13-13; sight 4; hint: by the bridge road, first trainer past the RT gate |
| trainer | `route_east_trainer_2` | 23,8 | right | GD tr_route_brookhollow_aurelith_b Angler 'Rue' L13-15; sight 3; hint: on the river bank (sees the bridge) |
| trainer | `route_east_trainer_3` | 25,14 | up | GD tr_route_brookhollow_aurelith_c Trail Kid 'Bram' L14-14; sight 3; hint: grass patch |
| trainer | `route_east_trainer_4` | 12,12 | left | GD tr_route_brookhollow_aurelith_d Skater 'Tilly' L15-16; sight 5; hint: downhill bluff (later bike ramps) |
| trainer | `route_east_trainer_5` | 9,6 | right | GD tr_route_brookhollow_aurelith_e Field Worker 'Cass' L16-16; sight 4; hint: road works near the Aurelith bluff |
| trainer | `route_east_trainer_6` | 32,20 | left | GD tr_route_brookhollow_aurelith_f Birdwatcher 'Juno' L15-17; sight 4; hint: optional, behind a ledge |

## aurelith (34x26): 8 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `aurelith_arena_sign` | 14,2 | (sign) | DRAFT dev label: Aurelith Arena - challenge coins required |
| sign | `aurelith_sign` | 14,10 | (sign) | DRAFT dev label: Aurelith - arrivals by rail only |
| shop clerk | `aurelith_lucky_crystal_seller` | 10,14 | down | held NPC lucky_crystal_seller (rail_only.*); sells nothing in DRAFT |
| NPC | `aurelith_airspace_officer` | 24,14 | up | rail-only city officer (Text Bot rail_only.* held NPC restricted_airspace_officer) |
| NPC | `aurelith_arena_doorman` | 18,2 | left | gate_aurelith_arena speaker (Text Bot proposed id arena_doorman; {coins}) |
| NPC | `aurelith_ron_6` | 30,14 | up | GD ron_6 Ron 'Ron' L58-62; sight 0; hint: Final Ron battle at the arena steps after all_badges (6.1 "Final"). Six creatures. Ron stands beside you afterwards. |
| NPC | `aurelith_villager_1` | 5,22 | up |  [settled from 6,23] |
| NPC | `aurelith_villager_2` | 27,4 | down |  |

## route_aurelith_saltmere (40x26): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_aurelith_saltmere_sign` | 2,10 | (sign) | DRAFT dev label: Salt Road - Saltmere east |
| trainer | `route_aurelith_saltmere_trainer_1` | 14,17 | down | GD tr_route_saltmere_aurelith_a Harbour Hand 'Ferris' L16-17; sight 4; hint: salt-pan path |
| trainer | `route_aurelith_saltmere_trainer_2` | 22,20 | up | GD tr_route_saltmere_aurelith_b Birdwatcher 'Gil' L17-17; sight 4; hint: dune lookout |
| trainer | `route_aurelith_saltmere_trainer_3` | 25,10 | up | GD tr_route_saltmere_aurelith_c Angler 'Hana' L17-17; sight 3; hint: tidal creek footbridge |
| trainer | `route_aurelith_saltmere_trainer_4` | 10,20 | up | GD tr_route_saltmere_aurelith_d Camper 'Iska' L16-18; sight 3; hint: dune grass |
| trainer | `route_aurelith_saltmere_trainer_5` | 19,20 | up | GD tr_route_saltmere_aurelith_e Courier 'Jem' L18-18; sight 5; hint: long straight before Saltmere |
| trainer | `route_aurelith_saltmere_trainer_6` | 7,17 | right | GD tr_route_saltmere_aurelith_f Veteran 'Kerr' L19-19; sight 2; hint: optional, hidden cove; tough |

## saltmere (34x26): 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `saltmere_hall_sign` | 7,21 | (sign) | DRAFT dev label: Saltmere Master's Hall |
| sign | `saltmere_sign` | 14,10 | (sign) | DRAFT dev label: Saltmere - harbour town |
| NPC | `saltmere_causeway_local` | 30,14 | left | optional gate_saltmere_causeway speaker (Text Bot proposed causeway_local) |
| NPC | `saltmere_fisher` | 22,22 | down | harbour flavour |
| NPC | `saltmere_ron_2` | 18,3 | left | GD ron_2 Ron 'Ron' L17-20; sight 0; hint: Harbour, before the hall. Ron jealous of your employee ID level (6.1). |
| NPC | `saltmere_villager_1` | 6,4 | down |  |

## saltmere_office_int (12x9): 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| shop clerk | `saltmere_office_int_clerk` | 5,3 | down | takes the Survey Parcel (needs has_survey_parcel) -> gives Courier Bike, sets has_bike (CRITICAL_PATH saltmere_office_clerk) |
| NPC | `saltmere_office_int_coworker` | 9,6 | left |  |

## route_revival (40x30): 8 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_revival_sign` | 2,19 | (sign) | DRAFT dev label: Heights Road - Revival Heights east |
| trainer | `route_revival_trainer_1` | 35,14 | up | GD tr_route_thornwood_revival_a Ranger 'Lark' L21-22; sight 4; hint: just past the fallen log |
| trainer | `route_revival_trainer_2` | 24,12 | up | GD tr_route_thornwood_revival_b Field Researcher 'Mabry' L22-22; sight 3; hint: survey stakes in the grass |
| trainer | `route_revival_trainer_3` | 4,20 | down | GD tr_route_thornwood_revival_c Beetle Keeper 'Nico' L21-23; sight 3; hint: tree line |
| trainer | `route_revival_trainer_4` | 9,23 | up | GD tr_route_thornwood_revival_d Rail Worker 'Orla' L23-23; sight 4; hint: Lumen Line track side |
| trainer | `route_revival_trainer_5` | 31,14 | up | GD tr_route_thornwood_revival_e Courier 'Penn' L23-24; sight 5; hint: bike lane |
| trainer | `route_revival_trainer_6` | 13,17 | right | GD tr_route_thornwood_revival_f Scholar 'TBD_NAME_2' L24-25; sight 3; hint: stone circle, optional |
| trainer | `route_revival_trainer_7` | 19,12 | up | GD tr_route_thornwood_revival_g Field Worker 'Rhea' L24-25; sight 4; hint: RT survey gate before Revival Heights |

## revival_heights (34x26): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `revival_heights_sign` | 14,10 | (sign) | DRAFT dev label: Revival Heights - Revival Tech HQ city |
| shop clerk | `revival_heights_lucky_crystal_seller` | 4,14 | down | held NPC lucky_crystal_seller |
| shop clerk | `revival_heights_pass_clerk` | 26,14 | up | gives Lumen Line Pass -> has_rail_pass (after beat_master_revival) |
| NPC | `revival_heights_airspace_officer` | 15,14 | right | rail-only officer (restricted_airspace_officer) |
| NPC | `revival_heights_ron_3` | 15,7 | right | GD ron_3 Ron 'Ron' L24-27; sight 0; hint: After the layoff warning letter. He loses for real and laughs it off too fast (6.1). Minor Ron motif. |
| NPC | `revival_heights_rt_guard` | 17,22 | left | gate_revival_checkpoint speaker (Text Bot proposed rt_guard_heights); opens from inside after coin 3 [settled from 18,23] |
| trainer | `revival_heights_trainer_1` | 7,14 | up | GD tr_revival_heights_plaza Field Researcher 'TBD_NAME_3' L25-26; sight 3; hint: HQ plaza, optional |

## route_revival_saltmere (26x40): 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_revival_saltmere_sign` | 15,2 | (sign) | DRAFT dev label: Checkpoint Road |
| trainer | `route_revival_saltmere_trainer_1` | 5,13 | right | GD tr_route_revival_saltmere_a Field Worker 'TBD_NAME_4' L27-28; sight 4; hint: checkpoint road |
| trainer | `route_revival_saltmere_trainer_2` | 14,2 | left | GD tr_route_revival_saltmere_b Courier 'Una' L28-28; sight 5; hint: bike lane [settled from 14,3] |
| trainer | `route_revival_saltmere_trainer_3` | 8,26 | up | GD tr_route_revival_saltmere_c Harbour Hand 'Vale' L28-29; sight 3; hint: salt flats |
| trainer | `route_revival_saltmere_trainer_4` | 18,31 | left | GD tr_route_revival_saltmere_d Veteran 'Wynn' L29-30; sight 3; hint: optional |

## frostspire_pass (30x40): 8 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `frostspire_pass_sign` | 22,35 | (sign) | DRAFT dev label: Frostspire Pass - bridge out |
| NPC | `frostspire_pass_ron_4` | 9,23 | right | GD ron_4 Ron 'Ron' L29-32; sight 0; hint: At the rebuilt bridge (rt_engineer_pass nearby). Optional to add a Ron battle here; drop if Text Bot wants fewer. |
| NPC | `frostspire_pass_rt_engineer` | 12,23 | left | gate_frostspire_bridge speaker (Text Bot proposed rt_engineer_pass) [settled from 12,24] |
| trainer | `frostspire_pass_trainer_1` | 10,17 | down | GD tr_route_greystone_frostspire_a Climber 'Yara' L28-29; sight 4; hint: switchback |
| trainer | `frostspire_pass_trainer_2` | 19,34 | right | GD tr_route_greystone_frostspire_b Hillwalker 'Zev' L29-29; sight 3; hint: cave exit ledge |
| trainer | `frostspire_pass_trainer_3` | 9,30 | right | GD tr_route_greystone_frostspire_c Birdwatcher 'Ada' L29-30; sight 5; hint: cliff lookout |
| trainer | `frostspire_pass_trainer_4` | 13,10 | right | GD tr_route_greystone_frostspire_d Ranger 'Bryn' L30-30; sight 4; hint: snow-fern band (forced) |
| trainer | `frostspire_pass_trainer_5` | 13,20 | up | GD tr_route_greystone_frostspire_e Climber 'Cole' L31-31; sight 3; hint: last before Frostspire |

## frostspire (34x26): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `frostspire_sign` | 14,10 | (sign) | DRAFT dev label: Frostspire - mountain town |
| NPC | `frostspire_skylift_tutor` | 19,14 | down | explains Skylift after coin 4 |
| NPC | `frostspire_villager_1` | 4,13 | down |  [settled from 5,14] |
| trainer | `frostspire_trainer_1` | 13,14 | up | GD tr_frostspire_a Climber 'Dara' L31-31; sight 4; hint: lower slope |
| trainer | `frostspire_trainer_2` | 15,2 | right | GD tr_frostspire_b Skater 'Elm' L31-32; sight 5; hint: packed-snow sled run top |
| trainer | `frostspire_trainer_3` | 29,20 | down | GD tr_frostspire_c Scholar 'Flint' L32-32; sight 3; hint: shrine (Shrines of the North flavour) |
| trainer | `frostspire_trainer_4` | 18,6 | left | GD tr_frostspire_d Veteran 'Greer' L33-33; sight 3; hint: optional peak hut |

## route_revival_sunmeadow (26x40): 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_revival_sunmeadow_sign` | 13,3 | (sign) | DRAFT dev label: North Road - Sunmeadow |
| trainer | `route_revival_sunmeadow_trainer_1` | 9,3 | right | GD tr_route_revival_sunmeadow_a Field Researcher 'Nash' L32-33; sight 3; hint: crystal field edge |
| trainer | `route_revival_sunmeadow_trainer_2` | 18,13 | down | GD tr_route_revival_sunmeadow_b Field Worker 'Oona' L33-33; sight 4; hint: RT crystal survey rig |
| trainer | `route_revival_sunmeadow_trainer_3` | 11,27 | up | GD tr_route_revival_sunmeadow_c Scholar 'Piers' L34-34; sight 3; hint: optional [settled from 14,30] |

## sunmeadow_fields (40x30): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `sunmeadow_fields_sign` | 2,6 | (sign) | DRAFT dev label: Sunmeadow Fields |
| trainer | `sunmeadow_fields_trainer_1` | 17,3 | down | GD tr_sunmeadow_fields_a Gardener 'Hux' L31-31; sight 4; hint: past the dim crystal barrier |
| trainer | `sunmeadow_fields_trainer_2` | 21,16 | up | GD tr_sunmeadow_fields_b Birdwatcher 'Ione' L32-32; sight 4; hint: stream footbridge |
| trainer | `sunmeadow_fields_trainer_3` | 29,16 | up | GD tr_sunmeadow_fields_c Trail Kid 'Jory' L32-32; sight 3; hint: near Wexley's Croft |
| trainer | `sunmeadow_fields_trainer_4` | 17,11 | right | GD tr_sunmeadow_fields_d Skater 'Kaz' L33-33; sight 5; hint: bike boardwalk loop |
| trainer | `sunmeadow_fields_trainer_5` | 20,26 | left | GD tr_sunmeadow_fields_e Field Researcher 'Lomond' L33-34; sight 3; hint: flower survey |
| trainer | `sunmeadow_fields_trainer_6` | 7,3 | down | GD tr_sunmeadow_fields_f Veteran 'Mira' L34-35; sight 3; hint: optional north meadow |

## route_sunmeadow_mirefen (40x26): 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_sunmeadow_mirefen_sign` | 2,8 | (sign) | DRAFT dev label: Reed Road - Mirefen east |
| trainer | `route_sunmeadow_mirefen_trainer_1` | 7,12 | up | GD tr_route_sunmeadow_mirefen_a Angler 'Ross' L33-34; sight 3; hint: reed pond |
| trainer | `route_sunmeadow_mirefen_trainer_2` | 14,15 | left | GD tr_route_sunmeadow_mirefen_b Bog Walker 'Saffi' L34-34; sight 3; hint: reed bank |
| trainer | `route_sunmeadow_mirefen_trainer_3` | 37,11 | down | GD tr_route_sunmeadow_mirefen_c Beetle Keeper 'Tobin' L34-35; sight 3; hint: rotting fence |
| trainer | `route_sunmeadow_mirefen_trainer_4` | 28,11 | down | GD tr_route_sunmeadow_mirefen_d Ranger 'Ulla' L35-35; sight 4; hint: boardwalk start |
| trainer | `route_sunmeadow_mirefen_trainer_5` | 20,18 | up | GD tr_route_sunmeadow_mirefen_e Camper 'Vic' L35-36; sight 3; hint: optional |

## mirefen (34x26): 8 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `mirefen_sign` | 14,10 | (sign) | DRAFT dev label: Mirefen - marsh town |
| NPC | `mirefen_tideglide_giver` | 20,14 | down | gives Tideglide after coin 5 + storm start (has_tideglide) |
| NPC | `mirefen_villager_1` | 6,4 | down |  |
| trainer | `mirefen_trainer_1` | 30,14 | up | GD tr_mirefen_a Bog Walker 'Briar' L35-36; sight 3; hint: bog entrance |
| trainer | `mirefen_trainer_2` | 18,6 | left | GD tr_mirefen_b Angler 'Corin' L36-37; sight 3; hint: islet jetty |
| trainer | `mirefen_trainer_3` | 15,10 | right | GD tr_mirefen_c Scholar 'Dilys' L37-37; sight 3; hint: bog lights (Bog Lights and Other Nonsense flavour) |
| trainer | `mirefen_trainer_4` | 6,14 | up | GD tr_mirefen_d Beetle Keeper 'Esk' L36-37; sight 3; hint: reed line (the only dry line) |
| trainer | `mirefen_trainer_5` | 2,20 | down | GD tr_mirefen_e Veteran 'Hedda' L38-38; sight 2; hint: optional, bike boardwalk spur |

## route_saltmere_mirefen (40x30): 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_saltmere_mirefen_sign` | 2,10 | (sign) | DRAFT dev label: Causeway - flooded until the thaw ends |
| trainer | `route_saltmere_mirefen_trainer_1` | 16,17 | left | GD tr_route_saltmere_mirefen_a Harbour Hand 'Wilde' L33-34; sight 4; hint: drained causeway |
| trainer | `route_saltmere_mirefen_trainer_2` | 8,14 | up | GD tr_route_saltmere_mirefen_b Angler 'Yves' L34-34; sight 3; hint: causeway sluice |
| trainer | `route_saltmere_mirefen_trainer_3` | 14,11 | down | GD tr_route_saltmere_mirefen_c Bog Walker 'Ansel' L35-35; sight 3; hint: marsh end |

## route_coast (26x36): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_coast_sign` | 14,2 | (sign) | DRAFT dev label: Coast Road - flooded in storm season |
| trainer | `route_coast_trainer_1` | 7,16 | right | GD tr_route_brookhollow_tidewater_a Reef Swimmer 'Gwen' L39-39; sight 0; hint: floodwater (Tideglide), talk-to |
| trainer | `route_coast_trainer_2` | 11,26 | up | GD tr_route_brookhollow_tidewater_b Harbour Hand 'Heath' L40-40; sight 4; hint: seawall |
| trainer | `route_coast_trainer_3` | 11,2 | right | GD tr_route_brookhollow_tidewater_c Birdwatcher 'Ines' L40-41; sight 4; hint: cliff path |
| trainer | `route_coast_trainer_4` | 10,14 | up | GD tr_route_brookhollow_tidewater_d Angler 'Jarrah' L40-41; sight 3; hint: jetty |
| trainer | `route_coast_trainer_5` | 7,21 | right | GD tr_route_brookhollow_tidewater_e Skater 'Kestrel' L42-42; sight 5; hint: seawall bike rail |
| trainer | `route_coast_trainer_6` | 13,28 | right | GD tr_route_brookhollow_tidewater_f Reef Swimmer 'Linnet' L42-43; sight 0; hint: floodwater, optional |

## tidewater_coast (34x26): 9 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `tidewater_coast_sign` | 14,10 | (sign) | DRAFT dev label: Tidewater Coast |
| NPC | `tidewater_coast_lifeguard` | 27,19 | down | beach flavour [settled from 26,20] |
| NPC | `tidewater_coast_villager_1` | 22,14 | down |  |
| trainer | `tidewater_coast_trainer_1` | 29,14 | up | GD tr_tidewater_coast_a Reef Swimmer 'Merrow' L41-42; sight 0; hint: sea lane, talk-to |
| trainer | `tidewater_coast_trainer_2` | 18,10 | left | GD tr_tidewater_coast_b Harbour Hand 'Neve' L42-42; sight 4; hint: tide pools |
| trainer | `tidewater_coast_trainer_3` | 31,20 | down | GD tr_tidewater_coast_c Angler 'Osric' L43-43; sight 3; hint: rock arch |
| trainer | `tidewater_coast_trainer_4` | 13,14 | up | GD tr_tidewater_coast_d Birdwatcher 'Petra' L43-44; sight 4; hint: sea stack |
| trainer | `tidewater_coast_trainer_5` | 23,19 | down | GD tr_tidewater_coast_e Reef Swimmer 'Rook' L44-44; sight 0; hint: sea lane to Lanternport [settled from 24,20] |
| trainer | `tidewater_coast_trainer_6` | 18,2 | left | GD tr_tidewater_coast_f Veteran 'Signe' L45-45; sight 2; hint: optional grotto |

## lanternport (34x26): 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `lanternport_sign` | 14,10 | (sign) | DRAFT dev label: Lanternport - lighthouse town |
| NPC | `lanternport_lighthouse_keeper` | 22,14 | down | horn wakes the Cindervale-road giant after coin 7 |
| NPC | `lanternport_ron_5` | 31,14 | up | GD ron_5 Ron 'Ron' L43-47; sight 0; hint: Ron finds a field team log page first and chooses to share it after the battle (6.1 turn toward trust). |
| NPC | `lanternport_villager_1` | 6,4 | down |  |
| trainer | `lanternport_trainer_1` | 18,2 | left | GD tr_lanternport_pier Harbour Hand 'Tamsin' L44-45; sight 3; hint: pier, optional |

## route_fernwick_lanternport (40x26): 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_fernwick_lanternport_sign` | 10,21 | (sign) | DRAFT dev label: Tide-lock Road - Fernwick east |
| NPC | `route_fernwick_lanternport_lock_keeper` | 28,11 | up | gate_lanternport_tidelock speaker (Text Bot proposed lock_keeper); lock wheel on the Lanternport side [settled from 30,11] |
| trainer | `route_fernwick_lanternport_trainer_1` | 25,12 | right | GD tr_route_fernwick_lanternport_a Angler 'Umber' L45-46; sight 3; hint: lock basin |
| trainer | `route_fernwick_lanternport_trainer_2` | 21,18 | up | GD tr_route_fernwick_lanternport_b Lamplighter 'Viggo' L46-46; sight 4; hint: canal lamps |
| trainer | `route_fernwick_lanternport_trainer_3` | 13,18 | up | GD tr_route_fernwick_lanternport_c Ranger 'Wyn' L46-47; sight 4; hint: forest edge near Fernwick |
| trainer | `route_fernwick_lanternport_trainer_4` | 28,13 | left | GD tr_route_fernwick_lanternport_d Veteran 'Xan' L47-47; sight 3; hint: optional |

## route_cindervale (26x40): 7 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `route_cindervale_sign` | 9,8 | (sign) | DRAFT dev label: Ember Road - Cindervale south |
| trainer | `route_cindervale_trainer_1` | 6,28 | up | GD tr_route_aurelith_cindervale_a Smith 'Yolo' L47-47; sight 4; hint: where the giant slept |
| trainer | `route_cindervale_trainer_2` | 14,8 | left | GD tr_route_aurelith_cindervale_b Hillwalker 'Zinnia' L48-48; sight 3; hint: ash slope |
| trainer | `route_cindervale_trainer_3` | 16,36 | left | GD tr_route_aurelith_cindervale_c Field Researcher 'Pip' L48-49; sight 3; hint: vent survey |
| trainer | `route_cindervale_trainer_4` | 10,14 | up | GD tr_route_aurelith_cindervale_d Climber 'Tam' L49-49; sight 4; hint: basalt steps |
| trainer | `route_cindervale_trainer_5` | 13,35 | right | GD tr_route_aurelith_cindervale_e Smith 'Wren' L50-50; sight 4; hint: forge outpost |
| trainer | `route_cindervale_trainer_6` | 12,25 | down | GD tr_route_aurelith_cindervale_f Veteran 'Odo' L51-51; sight 3; hint: optional lava tube |

## cindervale (34x26): 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| sign | `cindervale_sign` | 14,10 | (sign) | DRAFT dev label: Cindervale - forge town |
| NPC | `cindervale_smith` | 20,14 | down | forge flavour |
| NPC | `cindervale_villager_1` | 6,4 | down |  |
| trainer | `cindervale_trainer_1` | 26,20 | down | GD tr_cindervale_square Smith 'Bea' L50-51; sight 3; hint: forge square, optional |

## saltmere_hall_int (11x16): 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `saltmere_hall_int_guide` | 9,12 | down | stationary hall guide; explains 'Salt-pan sluices' |
| trainer | `saltmere_hall_int_h1` | 3,12 | right | hall trainer tr_hall_saltmere_h1 (Nell), sight 3, team in data/masters.json |
| trainer | `saltmere_hall_int_h2` | 7,12 | left | hall trainer tr_hall_saltmere_h2 (Ivo), sight 3, team in data/masters.json |
| trainer | `saltmere_hall_int_h3` | 2,11 | right | hall trainer tr_hall_saltmere_h3 (Sully), sight 3, team in data/masters.json |
| Master (trainer) | `saltmere_hall_int_master` | 5,3 | down | Master Nerys Bryde (master_saltmere); battle at goal G after puzzle_saltmere_hall_solved; win sets beat_master_saltmere |

## revival_hall_int (11x27): 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `revival_hall_int_guide` | 2,23 | down | stationary hall guide; explains 'Prism relay' |
| trainer | `revival_hall_int_h1` | 4,23 | right | hall trainer tr_hall_revival_heights_h1 (Mags), sight 3, team in data/masters.json |
| trainer | `revival_hall_int_h2` | 8,23 | left | hall trainer tr_hall_revival_heights_h2 (Dov), sight 3, team in data/masters.json |
| trainer | `revival_hall_int_h3` | 3,22 | right | hall trainer tr_hall_revival_heights_h3 (Fen), sight 3, team in data/masters.json |
| trainer | `revival_hall_int_h4` | 9,22 | left | hall trainer tr_hall_revival_heights_h4 (Hollis), sight 3, team in data/masters.json |
| Master (trainer) | `revival_hall_int_master` | 5,3 | down | Master Cassia Lume (master_revival_heights); battle at goal G after puzzle_revival_heights_hall_solved; win sets beat_master_revival |

## frostspire_hall_int (11x16): 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `frostspire_hall_int_guide` | 2,12 | down | stationary hall guide; explains 'Gust lanes' |
| trainer | `frostspire_hall_int_h1` | 4,12 | right | hall trainer tr_hall_frostspire_h1 (Rue), sight 3, team in data/masters.json |
| trainer | `frostspire_hall_int_h2` | 8,12 | left | hall trainer tr_hall_frostspire_h2 (Bram), sight 3, team in data/masters.json |
| trainer | `frostspire_hall_int_h3` | 3,11 | right | hall trainer tr_hall_frostspire_h3 (Tilly), sight 3, team in data/masters.json |
| Master (trainer) | `frostspire_hall_int_master` | 1,3 | down | Master Hale Corrie (master_frostspire); battle at goal G after puzzle_frostspire_hall_solved; win sets beat_master_frostspire |

## mirefen_hall_int (11x19): 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `mirefen_hall_int_guide` | 9,15 | down | stationary hall guide; explains 'Bog-light boardwalk' |
| trainer | `mirefen_hall_int_h1` | 3,15 | right | hall trainer tr_hall_mirefen_h1 (Cass), sight 3, team in data/masters.json |
| trainer | `mirefen_hall_int_h2` | 7,15 | left | hall trainer tr_hall_mirefen_h2 (Juno), sight 3, team in data/masters.json |
| trainer | `mirefen_hall_int_h3` | 2,14 | right | hall trainer tr_hall_mirefen_h3 (Arlo), sight 3, team in data/masters.json |
| Master (trainer) | `mirefen_hall_int_master` | 5,3 | down | Master Wenna Peat (master_mirefen); battle at goal G after puzzle_mirefen_hall_solved; win sets beat_master_mirefen |

## tidewater_hall_int (11x14): 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `tidewater_hall_int_guide` | 2,10 | down | stationary hall guide; explains 'Tide clock' |
| trainer | `tidewater_hall_int_h1` | 4,10 | right | hall trainer tr_hall_tidewater_coast_h1 (TBD_NAME_1), sight 3, team in data/masters.json |
| trainer | `tidewater_hall_int_h2` | 8,10 | left | hall trainer tr_hall_tidewater_coast_h2 (Moss), sight 3, team in data/masters.json |
| trainer | `tidewater_hall_int_h3` | 3,9 | right | hall trainer tr_hall_tidewater_coast_h3 (Edda), sight 3, team in data/masters.json |
| trainer | `tidewater_hall_int_h4` | 9,9 | left | hall trainer tr_hall_tidewater_coast_h4 (Ferris), sight 3, team in data/masters.json |
| Master (trainer) | `tidewater_hall_int_master` | 1,3 | down | Master Jory Swell (master_tidewater_coast); battle at goal G after puzzle_tidewater_coast_hall_solved; win sets beat_master_tidewater |

## lanternport_hall_int (11x21): 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `lanternport_hall_int_guide` | 9,17 | down | stationary hall guide; explains 'Lens signal' |
| trainer | `lanternport_hall_int_h1` | 3,17 | right | hall trainer tr_hall_lanternport_h1 (Gil), sight 3, team in data/masters.json |
| trainer | `lanternport_hall_int_h2` | 7,17 | left | hall trainer tr_hall_lanternport_h2 (Hana), sight 3, team in data/masters.json |
| trainer | `lanternport_hall_int_h3` | 2,16 | right | hall trainer tr_hall_lanternport_h3 (Iska), sight 3, team in data/masters.json |
| Master (trainer) | `lanternport_hall_int_master` | 5,3 | down | Master Delphine Orrin (master_lanternport); battle at goal G after puzzle_lanternport_hall_solved; win sets beat_master_lanternport |

## cindervale_hall_int (11x17): 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC | `cindervale_hall_int_guide` | 2,13 | down | stationary hall guide; explains 'Quench channels' |
| trainer | `cindervale_hall_int_h1` | 4,13 | right | hall trainer tr_hall_cindervale_h1 (Jem), sight 3, team in data/masters.json |
| trainer | `cindervale_hall_int_h2` | 8,13 | left | hall trainer tr_hall_cindervale_h2 (Kerr), sight 3, team in data/masters.json |
| trainer | `cindervale_hall_int_h3` | 3,12 | right | hall trainer tr_hall_cindervale_h3 (Lark), sight 3, team in data/masters.json |
| trainer | `cindervale_hall_int_h4` | 9,12 | left | hall trainer tr_hall_cindervale_h4 (Mabry), sight 3, team in data/masters.json |
| Master (trainer) | `cindervale_hall_int_master` | 5,3 | down | Master Brannock Fell (master_cindervale); battle at goal G after puzzle_cindervale_hall_solved; win sets beat_master_cindervale |


# Batch 2 (World Design, 2026-10-23 01:35 CT)

Spots for the 111 lines in `UNMERGED_v0.4.11.md` that had no spot. 92 new spot ids placed; with the 4 trainer-key lines that use the same trainers and `ron.battle_1` (existing spot), **97 of 111 lines now have a spot**. 14 skipped (see end).

Notes:
- All ids are exact from `UNMERGED_v0.4.11.md`. Map shown is where the id lives in the exported JSON (`npcs_pending_text` / `signs_pending_text`).
- `greystone_caverns_*` ids live in map `greystone_b1`. `route_aurelith_cindervale_giant_hollow` lives in `route_cindervale`. `mirefen_bog_lights` lives in the `mirefen` town map (not `mirefen_bog`).
- `<hall>_sign_hall_outside` signs live in the TOWN map, beside the Masters Hall door.
- State variants (e.g. `_dim`/`_lit`, `_rope`/`_pulled`, `_high`/`_low`/`_off`) share one cell on purpose: one prop, different states.
- Shop clerk variants `shop_int_clerk_<region>` all sit at the clerk cell of `shop_int` with `variant_of: clerk` and `region` set; the game picks the one for the current town.
- Hint spots (`<map>_<gd_id>_hint`) sit on the pickup cell itself; no tile change.
- Nothing interactable is in the phone touch-control corners (README 17.2): checked for every map 14+ wide.
- `ron.battle_1` -> existing spot `fernwick.ron_rival_1` (12,12); no new spot.

## thornwood: 3 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| trainer | `thornwood_c_gardener` | 24,6 | down | Gardener Kit (tr_thornwood_c), pond-side clearing facing the path |
| trainer | `thornwood_d_kid` | 27,12 | right | Trail Kid Lio (tr_thornwood_d), mud patch by the east log gate |
| trainer | `thornwood_e_researcher` | 15,3 | up | Field Researcher Nell (tr_thornwood_e), by the cave-mouth camp (Greystone warp) |

## greystone_b1: 1 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| trainer | `greystone_caverns_c_researcher` | 8,7 | down | Field Researcher Mags (tr_greystone_c), B1 near the camp by the entrance ladder |

## shop_int: 8 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| NPC (shop clerk variant) | `shop_int_clerk_aurelith` | 2,3 | down | region line variant of shop_int.clerk for aurelith (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_saltmere` | 2,3 | down | region line variant of shop_int.clerk for saltmere (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_revival_heights` | 2,3 | down | region line variant of shop_int.clerk for revival_heights (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_frostspire` | 2,3 | down | region line variant of shop_int.clerk for frostspire (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_mirefen` | 2,3 | down | region line variant of shop_int.clerk for mirefen (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_tidewater_coast` | 2,3 | down | region line variant of shop_int.clerk for tidewater_coast (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_lanternport` | 2,3 | down | region line variant of shop_int.clerk for lanternport (same clerk, same cell) |
| NPC (shop clerk variant) | `shop_int_clerk_cindervale` | 2,3 | down | region line variant of shop_int.clerk for cindervale (same clerk, same cell) |

## route_east: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_east_re_hidden_grass_hint` | 30,9 | - | sparkle/inspect hint on pickup route_east_item_3 (calm_tea, GD re_hidden_grass) |
| hint (look spot) | `route_east_re_hidden_post_hint` | 22,10 | - | sparkle/inspect hint on pickup route_east_item_4 (coin_pouch_small, GD re_hidden_post) |

## aurelith: 1 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `aurelith_au_fountain_hint` | 7,17 | - | sparkle/inspect hint on pickup aurelith_item_1 (coin_pouch_small, GD au_fountain) |

## route_aurelith_saltmere: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_aurelith_saltmere_sa_salt_pan_hint` | 5,20 | - | sparkle/inspect hint on pickup route_aurelith_saltmere_item_1 (crystal_dust, GD sa_salt_pan) |
| hint (look spot) | `route_aurelith_saltmere_sa_hidden_post_hint` | 23,5 | - | sparkle/inspect hint on pickup route_aurelith_saltmere_item_4 (feed_bag, GD sa_hidden_post) |

## saltmere: 3 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `saltmere_sm_islet_hint` | 26,4 | - | sparkle/inspect hint on pickup saltmere_item_1 (gold_coin, GD sm_islet) |
| hint (look spot) | `saltmere_sm_hidden_crate_hint` | 30,20 | - | sparkle/inspect hint on pickup saltmere_item_3 (coin_pouch_small, GD sm_hidden_crate) |
| sign | `saltmere_hall_int_sign_hall_outside` | 18,15 | - | outside sign by the saltmere_hall_int door (12,20) in saltmere |

## route_revival: 3 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_revival_tr_stakes_hint` | 18,15 | - | sparkle/inspect hint on pickup route_revival_item_2 (crystal_dust, GD tr_stakes) |
| hint (look spot) | `route_revival_tr_circle_hint` | 37,9 | - | sparkle/inspect hint on pickup route_revival_item_3 (vigor_seed, GD tr_circle) |
| hint (look spot) | `route_revival_tr_hidden_tree_hint` | 16,13 | - | sparkle/inspect hint on pickup route_revival_item_4 (coin_pouch_small, GD tr_hidden_tree) |

## revival_heights: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `revival_heights_rh_plaza_hint` | 11,14 | - | sparkle/inspect hint on pickup revival_heights_item_1 (tonic_large, GD rh_plaza) |
| sign | `revival_hall_int_sign_hall_outside` | 8,16 | - | outside sign by the revival_hall_int door (12,20) in revival_heights |

## route_revival_saltmere: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_revival_saltmere_rs_flats_hint` | 13,13 | - | sparkle/inspect hint on pickup route_revival_saltmere_item_1 (crystal_dust, GD rs_flats) |
| hint (look spot) | `route_revival_saltmere_rs_hidden_hint` | 10,17 | - | sparkle/inspect hint on pickup route_revival_saltmere_item_2 (vigor_seed, GD rs_hidden) |

## frostspire_pass: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `frostspire_pass_fp_bridge_hint` | 7,33 | - | sparkle/inspect hint on pickup frostspire_pass_item_2 (energy_tonic, GD fp_bridge) |
| hint (look spot) | `frostspire_pass_fp_camp_hint` | 9,33 | - | sparkle/inspect hint on pickup frostspire_pass_item_3 (feed_bag, GD fp_camp) |

## frostspire: 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `frostspire_fs_shrine_hint` | 30,17 | - | sparkle/inspect hint on pickup frostspire_item_2 (calm_tea, GD fs_shrine) |
| hint (look spot) | `frostspire_fs_hidden_cairn_hint` | 2,2 | - | sparkle/inspect hint on pickup frostspire_item_5 (coin_pouch_small, GD fs_hidden_cairn) |
| sign | `frostspire_sled_run_top` | 18,3 | - | SLED RUN sign at the top of the one-way run |
| sign | `frostspire_hall_int_sign_hall_outside` | 8,16 | - | outside sign by the frostspire_hall_int door (12,20) in frostspire |

## sunmeadow_fields: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `sunmeadow_fields_smf_hidden_flowers_hint` | 14,22 | - | sparkle/inspect hint on pickup sunmeadow_fields_item_3 (energy_tonic, GD smf_hidden_flowers) |
| hint (look spot) | `sunmeadow_fields_smf_hidden_stile_hint` | 33,10 | - | sparkle/inspect hint on pickup sunmeadow_fields_item_4 (coin_pouch_small, GD smf_hidden_stile) |

## route_revival_sunmeadow: 1 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_revival_sunmeadow_rsf_hidden_hint` | 11,25 | - | sparkle/inspect hint on pickup route_revival_sunmeadow_item_1 (crystal_dust, GD rsf_hidden) |

## route_sunmeadow_mirefen: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_sunmeadow_mirefen_smm_fence_hint` | 2,7 | - | sparkle/inspect hint on pickup route_sunmeadow_mirefen_item_2 (tonic_large, GD smm_fence) |
| hint (look spot) | `route_sunmeadow_mirefen_smm_hidden_hint` | 25,19 | - | sparkle/inspect hint on pickup route_sunmeadow_mirefen_item_3 (vigor_seed, GD smm_hidden) |

## route_saltmere_mirefen: 1 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_saltmere_mirefen_sme_hidden_hint` | 25,23 | - | sparkle/inspect hint on pickup route_saltmere_mirefen_item_2 (crystal_dust, GD sme_hidden) |

## mirefen: 3 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `mirefen_mf_hidden_lights_hint` | 29,3 | - | sparkle/inspect hint on pickup mirefen_item_4 (energy_tonic, GD mf_hidden_lights) |
| look spot | `mirefen_bog_lights` | 30,3 | - | look spot: the little bog lights, next to the mf_hidden_lights pickup (mirefen town, not the mirefen_bog map) |
| sign | `mirefen_hall_int_sign_hall_outside` | 8,16 | - | outside sign by the mirefen_hall_int door (12,20) in mirefen |

## route_coast: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_coast_ct_hidden_dune_hint` | 15,10 | - | sparkle/inspect hint on pickup route_coast_item_4 (energy_tonic, GD ct_hidden_dune) |
| hint (look spot) | `route_coast_ct_hidden_buoy_hint` | 14,23 | - | sparkle/inspect hint on pickup route_coast_item_5 (coin_pouch_small, GD ct_hidden_buoy) |

## tidewater_coast: 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `tidewater_coast_tc_pools_hint` | 22,7 | - | sparkle/inspect hint on pickup tidewater_coast_item_1 (tonic_large, GD tc_pools) |
| hint (look spot) | `tidewater_coast_tc_hidden_wreck_hint` | 31,2 | - | sparkle/inspect hint on pickup tidewater_coast_item_5 (coin_pouch_small, GD tc_hidden_wreck) |
| sign | `tidewater_coast_tide_board` | 18,14 | - | TIDE BOARD near the tide arch |
| sign | `tidewater_hall_int_sign_hall_outside` | 8,16 | - | outside sign by the tidewater_hall_int door (12,20) in tidewater_coast |

## lanternport: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `lanternport_lp_hidden_crate_hint` | 29,2 | - | sparkle/inspect hint on pickup lanternport_item_2 (coin_pouch_small, GD lp_hidden_crate) |
| sign | `lanternport_hall_int_sign_hall_outside` | 8,16 | - | outside sign by the lanternport_hall_int door (12,20) in lanternport |

## route_fernwick_lanternport: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_fernwick_lanternport_fl_hidden_hint` | 14,13 | - | sparkle/inspect hint on pickup route_fernwick_lanternport_item_2 (vigor_seed, GD fl_hidden) |
| sign | `route_fernwick_lanternport_lock_board` | 25,10 | - | TIDE-LOCK board beside the lock keeper |

## route_cindervale: 3 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `route_cindervale_ac_slope_hint` | 9,9 | - | sparkle/inspect hint on pickup route_cindervale_item_2 (tonic_large, GD ac_slope) |
| hint (look spot) | `route_cindervale_ac_hidden_vent_hint` | 3,29 | - | sparkle/inspect hint on pickup route_cindervale_item_4 (coin_pouch_small, GD ac_hidden_vent) |
| look spot | `route_aurelith_cindervale_giant_hollow` | 10,17 | - | look spot: the giant hollow (route_cindervale = GD route_aurelith_cindervale) |

## cindervale: 2 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| hint (look spot) | `cindervale_cv_hidden_anvil_hint` | 9,14 | - | sparkle/inspect hint on pickup cindervale_item_2 (coin_pouch_small, GD cv_hidden_anvil) |
| sign | `cindervale_hall_int_sign_hall_outside` | 8,16 | - | outside sign by the cindervale_hall_int door (12,20) in cindervale |

## saltmere_hall_int: 3 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `saltmere_hall_int_sign_sluices` | 0,12 | right | wall plaque in the lobby, read facing the wall |
| prop | `saltmere_hall_int_drying_rack` | 9,8 | - | drying rack (grid R): wheel order as salt stripes |
| prop | `saltmere_hall_int_reset_tile` | 1,9 | - | reset tile on the start row, left of S |

## revival_hall_int: 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `revival_hall_int_sign_prisms` | 0,23 | right | wall plaque in the lobby, read facing the wall |
| prop | `revival_hall_int_receiver_dim` | 5,7 | - | receiver 1 (grid r) unlit state |
| prop | `revival_hall_int_receiver_lit` | 5,7 | - | receiver 1 (grid r) lit state, same cell |
| prop | `revival_hall_int_violet_note` | 9,20 | - | note on the carpet cell (grid R) |

## frostspire_hall_int: 4 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `frostspire_hall_int_sign_gusts` | 0,12 | right | wall plaque in the lobby, read facing the wall |
| prop | `frostspire_hall_int_bell_rope` | 2,6 | - | bell rope (grid e) |
| prop | `frostspire_hall_int_bell_rope_pulled` | 2,6 | - | bell rope pulled state, same cell |
| prop | `frostspire_hall_int_feathers` | 3,5 | - | feathers on the first gust lane cell (grid n) |

## mirefen_hall_int: 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `mirefen_hall_int_sign_boardwalk` | 0,15 | right | wall plaque in the lobby, read facing the wall |
| prop | `mirefen_hall_int_reed_lamp` | 1,8 | - | reed_lamp: reed lamp 1 (grid 1); same text for lamps 1-4 by state |
| prop | `mirefen_hall_int_reed_lamp_lit` | 1,8 | - | reed_lamp_lit: reed lamp 1 (grid 1); same text for lamps 1-4 by state |
| prop | `mirefen_hall_int_reed_lamp_wrong` | 1,8 | - | reed_lamp_wrong: reed lamp 1 (grid 1); same text for lamps 1-4 by state |
| prop | `mirefen_hall_int_sinking_plank` | 5,7 | - | sinking plank (grid s, first) |

## tidewater_hall_int: 5 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `tidewater_hall_int_sign_tide_clock` | 0,10 | right | wall plaque in the lobby, read facing the wall |
| prop | `tidewater_hall_int_shell_clock` | 1,6 | - | shell clock (grid O) |
| prop | `tidewater_hall_int_shell_switch_high` | 8,4 | - | shell switch (grid H), high state, same cell |
| prop | `tidewater_hall_int_shell_switch_low` | 8,4 | - | shell switch (grid H), low state, same cell |
| prop | `tidewater_hall_int_shell_switch_off` | 8,4 | - | shell switch (grid H), off state, same cell |

## lanternport_hall_int: 6 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `lanternport_hall_int_sign_lens` | 0,17 | right | wall plaque in the lobby, read facing the wall |
| plaque (wall sign) | `lanternport_hall_int_sign_top_floor` | 10,17 | left | wall plaque in the lobby, read facing the wall |
| prop | `lanternport_hall_int_lens` | 8,13 | - | lens at the foot of the tower, ground floor |
| prop | `lanternport_hall_int_lamp_post` | 4,6 | - | lamp post (grid g, top floor first lamp) |
| prop | `lanternport_hall_int_lamps_out` | 4,6 | - | lamps-out state of the lamp post, same cell |
| prop | `lanternport_hall_int_window_top` | 9,4 | - | window on the top floor east wall |

## cindervale_hall_int: 8 spots

| type | id | x,y | facing | context (dev note, not game text) |
|---|---|---|---|---|
| plaque (wall sign) | `cindervale_hall_int_sign_quench` | 0,13 | right | wall plaque in the lobby, read facing the wall |
| plaque (wall sign) | `cindervale_hall_int_sign_reset_lever` | 10,13 | left | wall plaque in the lobby, read facing the wall |
| prop | `cindervale_hall_int_spring_tap` | 2,10 | - | spring tap (grid T, left) |
| prop | `cindervale_hall_int_spring_tap_dry` | 2,10 | - | dry state, same cell |
| prop | `cindervale_hall_int_pour` | 5,7 | - | pour spot (grid B) |
| prop | `cindervale_hall_int_poured` | 5,7 | - | poured state, same cell |
| prop | `cindervale_hall_int_bellows` | 8,10 | - | bellows (grid T, right) |
| prop | `cindervale_hall_int_remelt` | 2,7 | - | remelt (grid R) |

## Batch 2 skips (14 lines)

| line id(s) | reason |
|---|---|
| `aurelith_1_battle_master` .. `aurelith_4_battle_master` (4) + `trainers.aurelith.arena_*` (4) | Their map, the Aurelith arena interior, is still TO COME. Their L57-64 teams cannot stand in the open town. Ids reserved for the arena map. |
| `greystone_caverns_d_hiker`, `greystone_caverns_e_climber` + their 2 trainer keys | Greystone B2 is not built yet. |
| `greystone_caverns_gs_b2_camp_stove_hint` | Greystone B2 is not built yet. |
| `greystone_b2_mine_track` | Greystone B2 is not built yet. |

# Batch 3 (World Design, 2026-10-23, applied after the 2:30 AM CT alpha)
Coordinates only, no ids or text changed: 14 hall trainers moved/turned so no sight line covers the door row or the first 2 lobby rows (rows above updated in place); `route_revival_sunmeadow_sign` now sits on its sign tile at 13,3 (read from 13,4). Mirefen hall reed lamps keep their ids and cells. Job 0: all 250 pending spots on the 28 overnight maps are now real `npcs`/`signs` with the same ids (Text Bot v0.4.12 keys); none stay pending. Note: `route_cindervale_item_1` (pickup, not a text spot) moved (8,29) -> (7,29).
