# Text Bot requests: r78 interiors + town life (WD wd/regions78 2d514221)

Branch dev/regions-5-8, Oct 29 2026. These NPCs are **hidden until a line exists** at `text/overworld_lines.json maps.<map>.<id>` (same `{pages, lines:[{id:"default",flags:[],pages}]}` shape). Placement, look and behaviour are WD's; only words are needed.

- Carers (`*_carer`) open the heal counter after their line; clerks (`shop_*_clerk`) open the mart after theirs.
- Trainer 5 needs `intro` (before battle) and `after` (beaten) pages.
- Blocked words apply (see README).

## lanternport

| id | cell | kind | who | status |
|---|---|---|---|---|
| `lanternport_pier_fisher` | (26,37) | townsfolk | fisher at the end of the pier, line in the water | NEEDS LINES |
| `lanternport_stall_vendor` | (16,14) | townsfolk | harbour fruit stall, gossip about the storm (look only) | NEEDS LINES |
| `lanternport_sailmaker` | (34,14) | townsfolk | sail-cloth stall, patches storm-torn sails | NEEDS LINES |
| `lanternport_dock_worker` | (39,32) | townsfolk | stacking crates on the quay | NEEDS LINES |

## cindervale

| id | cell | kind | who | status |
|---|---|---|---|---|
| `cindervale_ore_hauler` | (38,28) | townsfolk | hauler unloading ore carts in the forge yard | NEEDS LINES |
| `cindervale_apprentice` | (35,28) | townsfolk | apprentice practising on the yard anvil | NEEDS LINES |
| `cindervale_stall_baker` | (13,27) | townsfolk | oven-bread stall by the hall | NEEDS LINES |
| `cindervale_crystal_seller` | (17,27) | townsfolk | polished ore and crystal trinkets (look only) | NEEDS LINES |

## heal_lanternport

| id | cell | kind | who | status |
|---|---|---|---|---|
| `heal_lanternport_carer` | (6,3) | healer | Revival Tech attendant (harbour branch, oilskin over the company jacket); talk across the counter from (6,5) | NEEDS LINES |
| `heal_lanternport_technician` | (5,3) | rt_staff | technician at the crystal polisher; talk across the counter from (5,5) | NEEDS LINES |
| `heal_lanternport_deckhand` | (2,6) | TBD | soaked deckhand waiting on the sofa row for their team | NEEDS LINES |

## heal_cindervale

| id | cell | kind | who | status |
|---|---|---|---|---|
| `heal_cindervale_carer` | (6,3) | healer | Revival Tech attendant with soot-proof sleeves; talk across the counter from (6,5) | NEEDS LINES |
| `heal_cindervale_technician` | (7,3) | rt_staff | technician at the polisher; talk across the counter from (7,5) | NEEDS LINES |
| `heal_cindervale_smith` | (10,6) | TBD | foundry worker with a singed glove waiting for their team | NEEDS LINES |

## shop_lanternport

| id | cell | kind | who | status |
|---|---|---|---|---|
| `shop_lanternport_clerk` | (2,3) | clerk | chandler behind the counter; talk from (2,5). Opens the mart (variant_of clerk) | NEEDS LINES |
| `shop_lanternport_sailor` | (7,6) | TBD | sailor comparing rope on the island shelves | NEEDS LINES |

## shop_cindervale

| id | cell | kind | who | status |
|---|---|---|---|---|
| `shop_cindervale_clerk` | (9,3) | clerk | supply clerk in a leather apron; talk from (9,5). Opens the mart (variant_of clerk) | NEEDS LINES |
| `shop_cindervale_miner` | (3,6) | TBD | miner restocking before the slag tunnels | NEEDS LINES |

## home_lanternport_a

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_lanternport_a_keeper` | (7,4) | TBD | retired lighthouse keeper, still logs the weather by the telescope | NEEDS LINES |

## home_lanternport_b

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_lanternport_b_mender` | (2,4) | TBD | net-mender working a torn trawl net | NEEDS LINES |

## home_lanternport_d

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_lanternport_d_parent` | (2,3) | TBD | parent cooking the morning catch | NEEDS LINES |
| `home_lanternport_d_kid` | (5,6) | TBD | kid on the rug, wants to be a lighthouse keeper | NEEDS LINES |

## home_lanternport_e

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_lanternport_e_captain` | (7,4) | TBD | old harbour captain with stories about the storm | NEEDS LINES |

## home_cindervale_a

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_cindervale_a_smith` | (6,4) | TBD | smith home for lunch, still in the apron | NEEDS LINES |
| `home_cindervale_a_kid` | (5,6) | TBD | kid on the rug, hammering a toy anvil | NEEDS LINES |

## home_cindervale_b

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_cindervale_b_miner` | (6,4) | TBD | miner sorting ore samples | NEEDS LINES |

## home_cindervale_c

| id | cell | kind | who | status |
|---|---|---|---|---|
| `home_cindervale_c_potter` | (3,3) | TBD | potter glazing jars at the table | NEEDS LINES |

## route_fernwick_lanternport

| id | cell | kind | who | status |
|---|---|---|---|---|
| `route_fernwick_lanternport_trainer_5` | (16,26) | trainer_hooded | 5th road trainer, Lv 47-48, hooded; needs intro + after pages | NEEDS LINES |

## Look-at spots in the new interiors (optional; not wired until Gary okays props)

| map | id | cell | what |
|---|---|---|---|
| `heal_lanternport` | `company_terminal` | (12,4) | storage / company tasks PC |
| `heal_lanternport` | `sofa` | (2,7) | Lap Nap seat (sofa (1,7)-(2,7)) |
| `heal_lanternport` | `anchor` | (0,3) | old anchor from the first lifeboat, kept by the door |
| `heal_cindervale` | `company_terminal` | (0,5) | storage / company tasks PC |
| `heal_cindervale` | `sofa` | (10,7) | Lap Nap seat (sofa (9,7)-(10,7)) |
| `shop_lanternport` | `fishing_rods` | (11,3) | rods for hire rack (look only) |
| `shop_cindervale` | `tool_rack` | (11,3) | tongs and hammers for sale by the foundry (look only) |
| `home_lanternport_a` | `telescope` | (5,3) | brass telescope aimed at the lighthouse |
| `home_lanternport_a` | `logbook` | (1,2) | shelf of weather logbooks |
| `home_lanternport_b` | `net` | (3,3) | half-mended net, shuttle still in it |
| `home_lanternport_b` | `radio` | (7,4) | harbour radio, tide times on repeat |
| `home_lanternport_e` | `ship_wheel` | (1,3) | wheel from the captain's last boat |
| `home_lanternport_e` | `trophy_case` | (9,3) | regatta cups and a framed chart |
| `home_cindervale_a` | `tool_rack` | (0,7) | spare hammers by the door |
| `home_cindervale_b` | `ore_cart` | (11,7) | cart of ore samples, labelled by tunnel |
| `home_cindervale_c` | `jars` | (2,2) | glazed jars drying on the shelf |
