# Regions 7-8 plan (dev/regions-5-8, Oct 29 2026)

Status: DRAFT for Gary. Nothing is published. Text is placeholder only (Text Bot owns text/*.py, keys in
`data/textbot_requests_r78.md`). Story canon is still `design/regions56/story_beats.md` (Lanternport hooks: the Ron page
hand-off, the "flies have names" line, Record 4 of The Missing Note, the INSTRUMENTS – SIGNAL crate).

## Summary

| Region | Opens with | Town | Outdoor maps | Hall / Master | Types | Coin | Ace | ID cap | Key card node |
|---|---|---|---|---|---|---|---|---|---|
| 7 | Tidewater coin (`beat_master_tidewater`) | Lanternport (harbour, lighthouse, storm still windy) | `route_fernwick_lanternport` (west road, tide-lock gate), `lanternport` (pier, `lanternport_water`) | `lanternport_hall_int` / Delphine Orrin | spirit / ghost | 7 | L50 | 18 | `rt_node_station_l` -> `rt_keycard_r7` (needs `promoted_id18`) |
| 8 | Lanternport coin (`beat_master_lanternport`) | Cindervale (foundry town, ash, kilns) | `route_cindervale` (ember road, boulder gate, 6 trainers) | `cindervale_hall_int` / Brannock Fell | fire / magma | 8 | L55 | 20 | `rt_node_station_c` -> `rt_keycard_r8` (needs `promoted_id20`) |

After coin 8: `all_badges` opens the Aurelith arena (4 Battle Masters, L56-64) and Ron 6 (final Ron, Aurelith).

## Layout (all maps already drafted by World Design, linked in this branch)

```
 Fernwick --(east)-- route_fernwick_lanternport --(south)-- Lanternport --(east)-- Tidewater Coast
                         [tide-lock gate, Lanternport coin]                    (region 6, Tideglide road)
 Aurelith --(south)-- route_cindervale --(south)-- Cindervale
             [boulder gate, Lanternport coin]
```
- Region 7 entry = Tidewater Coast east exit (needs Tideglide from Mirefen). The Fernwick side opens after coin 7 (shortcut home).
- Region 8 entry = Aurelith south, after coin 7.

## Caves (NOT built: World Design request)
| Region | Proposed map | Where | Wild table (data ready, species with art) |
|---|---|---|---|
| 7 | `lanternport_grotto` (sea grotto under the lighthouse; the SIGNAL crate ends up here) | door on the Lanternport pier / lighthouse base | `lanternport_grotto_cave` L44-48: gloamtick, bleachghast, runeskein (habitat filter: cave dwellers only) |
| 8 | `cindervale_caldera` (old slag tunnels behind the foundry) | door north-east of Cindervale square | `cindervale_caldera_cave` L48-52: slagrook, obsidiax, pumicepuff |

## Trainers
- Road trainers: World Design inline teams (`route_fernwick_lanternport` 5, `route_cindervale` 6, Lanternport pier 1,
  Cindervale square 1). They battle through `progression.mapTeam` (stand-ins in `data/standins_overnight.json`).
- Hall trainers + Masters: `data/masters.json` (halls 7, 8; puzzles already in hall puzzle data).
- Ron: Lanternport page hand-off (talk scene, `ron_page_shared`, once, after coin 6). `lanternport_ron_5` stays the optional
  Ron 5 catch-up. Ron 6 = Aurelith finale (unchanged).

## Benefits / ID
- `data/rt_benefits.json`: regionFlags 7/8, caps ID 18 / 20, key card nodes above. Promotions: `promoted_id18` after coin 7 at
  ID 18, `promoted_id20` after coin 8 at ID 20 (`src/region78/index.js`). All costs PLACEHOLDER for Game dev.

## Open questions for Gary
1. Ron 6 stays at Aurelith (final) and Lanternport is a talk-only page hand-off. OK, or should Lanternport be a battle?
2. Lanternport / Cindervale reuse Brookhollow / Fernwick / Saltmere interiors (heal, homes, shop). New interiors wanted?
3. The two caves above: approve names / spots so World Design can build them.
4. Lanternport is reachable before the Tidewater coin (Tideglide only). Add a coin-6 gate on the Tidewater east exit?
