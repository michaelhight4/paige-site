# Regions 7/8 – text ids needing lines (World Design → Text Bot)
All live under `maps.<map>.*` in text/overworld_lines.json unless noted. Avoid blocked words (route, berry, gym, PP, shiny, super effective, Pokedex, Poke Ball, Gotcha!, nurse, tonic, weed, tap). No alcohol, drugs or smoking.

| map | kind | id | note |
|---|---|---|---|
| lanternport | sign | lanternport_grotto_sign | by the grotto mouth (36,13): "Lanternport Grotto – mind the tide pools" |
| lanternport_grotto | npc | lanternport_grotto_tidewatcher | old tide-watcher at (18,14), keeps the keeper's lamps lit |
| lanternport_grotto | spot | lanternport_grotto_signal_crate | the SIGNAL crate in the keeper's alcove (15,4) – plot beat per REGIONS_78_PLAN |
| lanternport_grotto | spot | lanternport_grotto_keeper_lamps | keeper lanterns (13,4) |
| lanternport_grotto | spot | lanternport_grotto_nets | drying nets (11,5) |
| cindervale | sign | cindervale_caldera_sign | by the tunnel mouth (35,13): "Cindervale Caldera – old slag tunnels" |
| cindervale_caldera | npc | cindervale_caldera_smelter | retired smelter at (13,17) |
| cindervale_caldera | sign | cindervale_caldera_sign | board at (18,19) near the exit: "Keep off the slag channel. Use the bridges." |
| cindervale_caldera | spot | cindervale_caldera_old_forge | cold forge + anvil (4,6) |
| cindervale_caldera | spot | cindervale_caldera_ore_cart | ore cart on the north rail (9,5) |


## P2/P3 (Oct 29 2026): unique Lanternport / Cindervale interiors + town life

All below sit in each map's `text_pending` until Text Bot adds `maps.<map>.<id>` lines. Ids marked `text_ref rt_branch.*` can reuse the shared Revival Tech branch lines.

### heal_lanternport (Revival Tech Lanternport branch)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `heal_lanternport_carer` | 6,3 | rt_branch.attendant | Revival Tech attendant (harbour branch, oilskin over the company jacket); talk across the counter from (6,5) |
| npc | `heal_lanternport_technician` | 5,3 | rt_branch.technician | technician at the crystal polisher; talk across the counter from (5,5) |
| npc | `heal_lanternport_deckhand` | 2,6 |  | soaked deckhand waiting on the sofa row for their team |
| sign | `staff_door_locked` | 10,2 | rt_branch.staff_door_locked | STAFF ONLY door (locked) |
| sign | `suggestion_box` | 2,3 | rt_branch.suggestion_box | suggestion box |
| sign | `newsletter` | 8,3 | rt_branch.newsletter | Revival Tech Bulletin rack |
| spot | `company_terminal` | 12,4 | maps.heal_lanternport.company_terminal | storage / company tasks PC |
| spot | `sofa` | 2,7 | maps.heal_lanternport.sofa | Lap Nap seat (sofa (1,7)-(2,7)) |
| spot | `anchor` | 0,3 | maps.heal_lanternport.anchor | old anchor from the first lifeboat, kept by the door |

### shop_lanternport (Lanternport Chandlery mart)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `shop_lanternport_clerk` | 2,3 |  | chandler behind the counter; talk from (2,5). Opens the mart (variant_of clerk) |
| npc | `shop_lanternport_sailor` | 7,6 |  | sailor comparing rope on the island shelves |
| spot | `fishing_rods` | 11,3 | maps.shop_lanternport.fishing_rods | rods for hire rack (look only) |

### home_lanternport_a (Lighthouse keeper's cottage)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_lanternport_a_keeper` | 7,4 |  | retired lighthouse keeper, still logs the weather by the telescope |
| spot | `telescope` | 5,3 | maps.home_lanternport_a.telescope | brass telescope aimed at the lighthouse |
| spot | `logbook` | 1,2 | maps.home_lanternport_a.logbook | shelf of weather logbooks |

### home_lanternport_b (Net-mender's house)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_lanternport_b_mender` | 2,4 |  | net-mender working a torn trawl net |
| spot | `net` | 3,3 | maps.home_lanternport_b.net | half-mended net, shuttle still in it |
| spot | `radio` | 7,4 | maps.home_lanternport_b.radio | harbour radio, tide times on repeat |

### home_lanternport_d (Fisher family home)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_lanternport_d_parent` | 2,3 |  | parent cooking the morning catch |
| npc | `home_lanternport_d_kid` | 5,6 |  | kid on the rug, wants to be a lighthouse keeper |

### home_lanternport_e (Old captain's house)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_lanternport_e_captain` | 7,4 |  | old harbour captain with stories about the storm |
| spot | `ship_wheel` | 1,3 | maps.home_lanternport_e.ship_wheel | wheel from the captain's last boat |
| spot | `trophy_case` | 9,3 | maps.home_lanternport_e.trophy_case | regatta cups and a framed chart |

### heal_cindervale (Revival Tech Cindervale branch)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `heal_cindervale_carer` | 6,3 | rt_branch.attendant | Revival Tech attendant with soot-proof sleeves; talk across the counter from (6,5) |
| npc | `heal_cindervale_technician` | 7,3 | rt_branch.technician | technician at the polisher; talk across the counter from (7,5) |
| npc | `heal_cindervale_smith` | 10,6 |  | foundry worker with a singed glove waiting for their team |
| sign | `staff_door_locked` | 2,2 | rt_branch.staff_door_locked | STAFF ONLY door (locked) |
| sign | `suggestion_box` | 0,3 | rt_branch.suggestion_box | suggestion box |
| sign | `newsletter` | 10,3 | rt_branch.newsletter | Revival Tech Bulletin rack |
| spot | `company_terminal` | 0,5 | maps.heal_cindervale.company_terminal | storage / company tasks PC |
| spot | `sofa` | 10,7 | maps.heal_cindervale.sofa | Lap Nap seat (sofa (9,7)-(10,7)) |

### shop_cindervale (Cindervale Foundry Supply mart)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `shop_cindervale_clerk` | 9,3 |  | supply clerk in a leather apron; talk from (9,5). Opens the mart (variant_of clerk) |
| npc | `shop_cindervale_miner` | 3,6 |  | miner restocking before the slag tunnels |
| spot | `tool_rack` | 11,3 | maps.shop_cindervale.tool_rack | tongs and hammers for sale by the foundry (look only) |

### home_cindervale_a (Smith family's house)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_cindervale_a_smith` | 6,4 |  | smith home for lunch, still in the apron |
| npc | `home_cindervale_a_kid` | 5,6 |  | kid on the rug, hammering a toy anvil |
| spot | `tool_rack` | 0,7 | maps.home_cindervale_a.tool_rack | spare hammers by the door |

### home_cindervale_b (Miner's house)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_cindervale_b_miner` | 6,4 |  | miner sorting ore samples |
| spot | `ore_cart` | 11,7 | maps.home_cindervale_b.ore_cart | cart of ore samples, labelled by tunnel |

### home_cindervale_c (Kiln potter's house)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `home_cindervale_c_potter` | 3,3 |  | potter glazing jars at the table |
| spot | `jars` | 2,2 | maps.home_cindervale_c.jars | glazed jars drying on the shelf |

### lanternport (DRAFT - Lanternport)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `lanternport_pier_fisher` | 26,37 | maps.lanternport.lanternport_pier_fisher | fisher at the end of the pier, line in the water |
| npc | `lanternport_stall_vendor` | 16,14 | maps.lanternport.lanternport_stall_vendor | harbour fruit stall, gossip about the storm (look only) |
| npc | `lanternport_sailmaker` | 34,14 | maps.lanternport.lanternport_sailmaker | sail-cloth stall, patches storm-torn sails |
| npc | `lanternport_dock_worker` | 39,32 | maps.lanternport.lanternport_dock_worker | stacking crates on the quay |

### cindervale (DRAFT - Cindervale)

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `cindervale_ore_hauler` | 38,28 | maps.cindervale.cindervale_ore_hauler | hauler unloading ore carts in the forge yard |
| npc | `cindervale_apprentice` | 35,28 | maps.cindervale.cindervale_apprentice | apprentice practising on the yard anvil |
| npc | `cindervale_stall_baker` | 13,27 | maps.cindervale.cindervale_stall_baker | oven-bread stall by the hall |
| npc | `cindervale_crystal_seller` | 17,27 | maps.cindervale.cindervale_crystal_seller | polished ore and crystal trinkets (look only) |

### route_fernwick_lanternport (DRAFT - Tide-lock Road (Fernwick - Lanternport))

| kind | id | x,y | ref | what |
|---|---|---|---|---|
| npc | `route_fernwick_lanternport_trainer_5` | 16,26 | overworld_lines.json maps.route_fernwick_lanternport.route_fernwick_lanternport_trainer_5 | WD r78 P3: 5th road trainer per REGIONS_78_PLAN (route_fernwick_lanternport 5). Needs Text Bot lines + Coder/GD standin check |

Renamed (Oct 29): town signs `lanternport_lanternport_grotto_sign` -> `lanternport_grotto_sign`, `cindervale_cindervale_caldera_sign` -> `cindervale_caldera_sign`.
