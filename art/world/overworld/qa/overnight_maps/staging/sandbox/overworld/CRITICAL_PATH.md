# Kilumen: critical path, story gates and progression flags

Status: **proposal for review** (Gary).

- **Names** follow Text Bot's draft (`/workspace/kilumen/text/overworld_lines.json`, `_proposed_names`). Gary still has to approve or rename them:
  - items: Trail Runners, Survey Parcel, Courier Bike, Lumen Line Pass
  - skills: Tideglide, Skylift, Brushbreak, Stonebreak, Glowcall
  - flags: `flg_promoted`, `has_survey_parcel`
- **Badges** are the design doc's **challenge coins**. Flag ids still say `master`/`all_badges`, but player text says "coin".
- **Player-facing lines** live in Text Bot's file (`/workspace/kilumen/text/overworld_lines.json`, v0.3.0), keyed by the same gate/NPC ids. Map JSON and world_layout.json only carry **references** into that file (`blockers.<gate id>.before/after`, `maps.<map>.<npc or sign id>`); there is no placeholder text left in the data.
- **Rebuild order:** after any map change, run `python3 tools/run.py`, then `python3 /workspace/kilumen/text/build_overworld_lines.py`. The second script stops on missing or extra ids. Machine-readable copies: `world_layout.json` (`progression_flags`,
`story_gates`, `forced_grass`, `fly`, `rail`, `bike_routes`, `progression_check`) and each map's `story_gates`,
`forced_grass`, `fly_point` and `bike` keys. The model and checker live in `tools/progression.py` and run on every
`python3 tools/run.py`.

## 1. The route at a glance
```
Brookhollow ──Route 1 (forced grass)──> Fernwick ──> Thornwood (forced grass) ──> Greystone (forced fern) ──> B1 ──> Frostspire pass
   │  east: RT checkpoint [beat_master_fernwick]        │ east: fallen log [beat_master_saltmere]                  │ collapsed bridge [beat_master_revival]
   v                                                    v                                                          v
 route_east ──> Aurelith (rail only, arena sealed) ──> Saltmere          route_revival ──> Revival Heights (rail only)    Frostspire
                                                                                                                     │
 Route 1 east: crystal barrier [beat_master_frostspire] ──> Sunmeadow ──> Mirefen ──(storm)──> Tidewater ──> Lanternport ──> Cindervale
```
The path zig-zags: every new coin opens a gate **back near home or in a zone you already crossed**, so the player keeps
passing through earlier zones with new tools (run, bike, Skylift).

## 2. Step by step
| # | where | what the player does | flag set | gate it opens (detour it forced) |
|---|---|---|---|---|
| 0 | Brookhollow (house_2f) → office_int | start. The manager promotes the player and Ron to field researchers and sends them to Fernwick. The **east road is closed** by a Revival Tech checkpoint | `visited_brookhollow`, **`flg_promoted`** | - (story only; NPC variants switch) |
| 1 | Route 1 | must cross the forced grass `r1_north_choke` (no way around) | - | - |
| 2 | Fernwick entrance | rival battle 1 vs Ron; he hands over his old **Trail Runners** (win or lose) | `beat_rival_ron_1`, **`has_run_shoes`** | running (MOVEMENT.md) |
| 3 | Fernwick Master's Hall | plate + crystal puzzle, then Master battle (coin 1) | **`beat_master_fernwick`** | `gate_brookhollow_east` (RT barricade). Detour: back south down Route 1 to Brookhollow |
| 3b | Brookhollow east gate | talk to `rt_guard_east` after the gate clears: he hands over the **Survey Parcel** for the Saltmere office | **`has_survey_parcel`** | - (starts the Courier Bike errand) |
| 4 | Brookhollow east → route_east → Aurelith | pass through Aurelith (arena sealed; **rail-only, no fly**: government restricted airspace) | `visited_aurelith` | - |
| 5 | Saltmere | coin 2; deliver the Survey Parcel to the Revival Tech office and receive the **Courier Bike** | **`beat_master_saltmere`**, **`has_bike`** | `gate_thornwood_east` (fallen log). Detour: all the way back west to Thornwood |
| 6 | Thornwood east → route_revival → Revival Heights | coin 3 (**rail-only, no fly**); **Lumen Line Pass** from the pass clerk at Central station | **`beat_master_revival`**, `has_rail_pass` | `gate_frostspire_bridge` (bridge rebuilt, planned). Detour: back to Thornwood → Greystone (forced fern) → B1 boulder puzzle |
| 7 | Frostspire | coin 4; Skylift field skill | **`beat_master_frostspire`**, **`has_skylift`** | `gate_route1_east` (crystal barrier dims) + `gate_saltmere_causeway` + `gate_sunmeadow_north`. Detour: back to Route 1, two steps from home |
| 8 | Route 1 east → Sunmeadow → Mirefen | coin 5 and the Tideglide skill. **Storm season starts**: rain floods the coast road | **`beat_master_mirefen`**, `has_tideglide` | `gate_coast_road_flood` (planned weather gate, needs Tideglide) |
| 9 | Brookhollow east → coast road → Tidewater Coast | coin 6 | `beat_master_tidewater` | - |
| 10 | Lanternport | coin 7; the lighthouse horn wakes the giant creature asleep on the Cindervale road | **`beat_master_lanternport`** | `gate_cindervale_giant` (planned) + `gate_lanternport_tidelock` (shortcut home) |
| 11 | Aurelith → Cindervale | coin 8 (all 8 coins) | `beat_master_cindervale`, `all_badges` | `gate_aurelith_arena` |

Bold flags are the critical-path flags the checker walks through, in order (`progression.FLAGS`):
`flg_promoted → has_run_shoes → beat_master_fernwick → has_survey_parcel → beat_master_saltmere → has_bike → beat_master_revival → has_rail_pass → beat_master_frostspire → has_skylift → beat_master_mirefen → has_tideglide → beat_master_tidewater → beat_master_lanternport → beat_master_cindervale → all_badges`.

`has_bike` needs `has_survey_parcel`: the Saltmere office clerk (planned id `saltmere_office_clerk`) only hands over the bike for the parcel.

## 3. Story gates (data format)
Each map can carry `story_gates` (see `maps/brookhollow.json`, `route1.json`, `thornwood.json`):
```json
{"id":"gate_brookhollow_east","flag":"beat_master_fernwick","earned_at":"fernwick_hall_int (Master of Fernwick)",
 "cells":[{"x":32,"y":12,"blocked_tile":"rt_barricade","cleared_tile":null}, ...],
 "npc":{"id":"rt_guard_east","x":31,"y":11,"facing":"down","kind":"guard"},
 "lines":{"text_file":"/workspace/kilumen/text/overworld_lines.json","before":"blockers.gate_brookhollow_east.before","after":"blockers.gate_brookhollow_east.after","guard":"maps.brookhollow.rt_guard_east"},
 "cleared_state":"barricades removed; guard stays and speaks the cleared line",
 "detour":"...", "blocks":{"from_entry":"exit-north","to_entry":"exit-east"}}
```
- The map's `decoration` layer holds the **blocked** tile, and `collision` is 1 there.
- On load, if the flag is set, swap each cell to `cleared_tile` (null = remove the decoration) and use that tile's collision (or 0).
- `blocks` names the two sides the gate separates, used by the checker.

| gate | map, cells | blocked tile → cleared | flag | earned at |
|---|---|---|---|---|
| `gate_brookhollow_east` | brookhollow (32,12),(32,13) + guard (31,11) | `rt_barricade` → removed | `beat_master_fernwick` | Fernwick Master's Hall |
| `gate_thornwood_east` | thornwood (33,21..23) | `fallen_log_t/m/b` → removed | `beat_master_saltmere` | Saltmere (planned) |
| `gate_route1_east` | route1 (41,4),(41,5); crystal ridge seals x41 | `crystal_barrier_lit` (animated) → `crystal_barrier_dim` (walkable stubs) | `beat_master_frostspire` | Frostspire (planned) |
| `gate_frostspire_bridge` (planned; text `blockers.gate_frostspire_bridge`; NPC `rt_engineer_pass`) | frostspire_pass | collapsed rope bridge → rebuilt | `beat_master_revival` | Revival Heights |
| `gate_saltmere_causeway` (planned; text `blockers.gate_saltmere_causeway`; optional NPC `causeway_local`) | between saltmere and mirefen | flooded causeway → drained | `beat_master_frostspire` | Frostspire |
| `gate_sunmeadow_north` (planned; text `blockers.gate_sunmeadow_north`; no NPC) | between revival_heights and sunmeadow | crystal field → dim | `beat_master_frostspire` | Frostspire |
| `gate_revival_checkpoint` (planned; text `blockers.gate_revival_checkpoint` + sign; NPC `rt_guard_heights`) | between revival_heights and saltmere | RT checkpoint, opened from inside | `beat_master_revival` | Revival Heights (shortcut lock only) |
| `gate_coast_road_flood` (planned weather gate; text `blockers.gate_coast_road_flood`) | brookhollow coast road → tidewater | floodwater (weather) | `has_tideglide` | Mirefen |
| `gate_cindervale_giant` (planned; text `blockers.gate_cindervale_giant`) | aurelith → cindervale | giant asleep across the road | `beat_master_lanternport` | Lanternport |
| `gate_lanternport_tidelock` (planned; text `blockers.gate_lanternport_tidelock`; NPC `lock_keeper`) | lanternport → fernwick west | flooded lock → opened with the lock wheel | `beat_master_lanternport` | Lanternport |
| `gate_aurelith_arena` (planned; text `blockers.gate_aurelith_arena` + sign; NPC `arena_doorman`, line uses `{coins}`) | aurelith | sealed doors | `all_badges` | Cindervale |

## 4. Forced grass (no way around)
| id | map | rect | between |
|---|---|---|---|
| `r1_north_choke` | route1 | (1,2)-(9,4), 9x3 tall grass across the whole valley under Fernwick | Brookhollow side ↔ Fernwick |
| `tw_east_choke` | thornwood | (21,21)-(23,23), grass neck between tree walls | Fernwick side ↔ Greystone mouth |
| `gs_mouth_choke` | greystone_entrance | (13,19)-(14,20), cave fern in the 2-wide mouth | Thornwood ↔ B1 stairs |

Optional grass hides extras: Route 1 hidden tonic (38,8), Thornwood hidden seed (8,25), Greystone fern patch (21,15)-(24,16) hiding `gs_item` (23,15).
Planned chokepoints for unbuilt zones are in `world_layout.json → forced_grass.planned`.

## 5. Movement and field-skill flags
| flag | when | effect | doc |
|---|---|---|---|
| `flg_promoted` | step 0 | story: promotion to field researcher; switches NPC variants | overworld_lines.json |
| `has_run_shoes` | step 2 (early) | **Trail Runners**: hold B to run, 8 tiles/s (2x walk) | MOVEMENT.md |
| `has_survey_parcel` | step 3b | carry the parcel to Saltmere (bike errand) | overworld_lines.json |
| `has_bike` | step 5 | **Courier Bike**: 12 tiles/s (3x walk); bike-only rails and ramps | MOVEMENT.md |
| `has_rail_pass` | step 6 | **Lumen Line Pass**: Lumen Line between visited stations | FIELD_SKILLS.md |
| `has_skylift` | step 7 (after the bike) | Skylift: travel to a visited town's landing point (player text: "Head to {city}?") | FIELD_SKILLS.md |
| `has_tideglide` | step 8 | Tideglide: carried across water, incl. storm floodwater | FIELD_SKILLS.md |
| `visited_<town>` | first entry to the town on foot | unlocks that town as a Skylift / rail destination | FIELD_SKILLS.md |
| `got_starter` | choosing a starter in Lumen Lab (`lab_brookhollow`) | side flag (not a gate): lab NPC lines, which cradle is empty (Story/Coder) | progression.SIDE_FLAGS |
| `has_branch_card` | the Branch Access Card (SOUL_PLAYBOOK 8.2d) | opens the STAFF ONLY door in both heal branches → `rt_branch_backroom` (`locked_warps.unlock_flag`; replaces `rt_backroom_open`) | progression.SIDE_FLAGS |
| `puzzle_fernwick_hall_solved` | both Fernwick Hall gates open | hall gates stay open on reload (`puzzles/fernwick_hall_int.runtime.json`) | progression.SIDE_FLAGS |
| `item_<map>_<id>` | picking up a placed item | one unique flag per item (`maps/*.json items[].flag`) | progression.SIDE_FLAGS |

**No-fly, rail-only destinations:** Revival Heights and Aurelith. Stated reason everywhere: *"Government restricted airspace: arrivals by rail only."*

## 6. What the checker proves (every build)
`tools/progression.py`, called from `tools/run.py`; the result is printed and written to `world_layout.json → progression_check`.
1. **Gates:** for each live gate, with **every other flag set and the bike**, `from_entry` cannot reach `to_entry` while the flag is unset, and can once it is set.
2. **Forced grass:** with all gates open and the bike, the two sides cannot connect while avoiding the grass rect, but can through it.
3. **No soft-locks:** for every map and every flag prefix (walking, and riding once `has_bike`), every reachable cell can still get back to an entrance (ledges and ramps are one-way).
4. **Bike optional:** every entrance and NPC is reachable on foot; cells reachable only by bike are written to the map as `bike.no_dismount_cells`.
5. **World walk:** starting at the new-game spawn, in each flag state the place that awards the **next** flag is reachable (no progression soft-lock).
6. **Detours are forced:** in the state just before each gate's flag, the far side of the gate is unreachable (live gates at cell level, planned gates at zone level).
7. **Skylift and the Lumen Line skip nothing:** in every state, adding flights to visited fly points and rides between visited stations reaches **no new cell or zone**.

Current result: **PASS** (see `world_layout.json → progression_check`).
