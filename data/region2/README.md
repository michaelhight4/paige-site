# Region 2 groundwork (STAGED, not live) — Oct 23 2026, coder

Region 2 = Brookhollow east exit → East Road (route_east) → Aurelith → Salt Road (route_aurelith_saltmere) → Saltmere → Saltmere Hall (Master 2), plus the paused extras (station_int, home_saltmere_a, thornwood border).
Nothing here is read by the game. No region-1 map, overworld.js, save, input, mood or test file was touched.

## Files
| path | what |
|---|---|
| tools/region2/region2_spec.mjs | hand-edited source: zones, slots, trainer teams, why each level moved from the GD/map draft |
| tools/region2/build_region2.mjs | validates + writes the 3 JSON files below (`--check` = validate only, writes nothing) |
| tools/region2/playcheck_master2.mjs | battle-engine play-check from Master 1 to Master 2 (`node tools/region2/playcheck_master2.mjs 10 20 [--catch=random\|grainling\|none] [--second=peeplark] [--evolve] [--skip-optional]`) |
| tools/region2/region2_staged.test.mjs | standalone test (`node --test tools/region2/region2_staged.test.mjs`), not in package.json |
| data/region2/encounters_region2.json | 8 zones, 71 slots, encounters.js zone shape (+ `staged`, `rollable_when_wired`) |
| data/region2/trainer_teams_region2.json | 20 trainers, TRAINER_TEAMS key/shape (`"<map>.<npc id>"` → list or `{byStarter}`) + `info` (name, class, optional, why) |
| data/region2/evo_conflicts_region2.json | 12 species where game evoLevel ≠ DEX level |

## Map inventory (all region-2 maps are DRAFT in art/world/overworld/maps)
| map | size | status | missing / wrong |
|---|---|---|---|
| route_east | 64x40 padded | draft, 6 trainers, 3 signs, 6 items, 5 grass rects + reeds rect | no `encounters` wired; reeds should use own table `route_east_reeds`; no water rect (water table is revisit only, fine) |
| aurelith | 58x40 padded | draft, arena/endgame NPCs | heal warp shares heal_brookhollow (ok until a local clinic exists); aurelith_ron_6 is endgame, leave |
| route_aurelith_saltmere | 64x40 padded | draft, 6 trainers, 6 grass rects | no `encounters` wired; no water rect |
| saltmere | 58x40 padded | draft, saltmere_water rect | hall outside sign at (30,22) points to the OLD hall door (12,20) — move next to the door; office gift (dominance_crystal_plus x3) placed as a floor item at (37,21) instead of a clerk script/flag; ron_2 team in draft had lancebeetle |
| saltmere_hall_int | 11x16 | draft, h1-h3 + master, puzzle data/hall_puzzles/saltmere.json | teams not in trainer_teams.js yet |
| saltmere_office_int | 12x9 | draft | gift script (see above) |
| home_saltmere_a | 12x9 | no entities | needs home_saltmere_a_hobbyist NPC + bookcase (text exists) |
| station_int | 20x13 | no entities | needs rail_buffer, station_clerk, station_traveller, restricted_airspace, timetable (text exists) |
| thornwood (border) | — | read-only here | camp_thornwood, thornwood_c_gardener/d_kid/e_researcher text exists, no map entities; live thornwood_grass has burrowmane 9-13 below its evo level 16 (staged table drops it) |

Map edits were NOT made: art/world/overworld/tools/run.py regenerates every map (would clobber region-1 work and tools/pad_fix.py edits). Only `run.py --check` was run. GD map copies for comparison: art/world/overworld/qa/overnight_maps/staging/.

## How to wire once region 1 ships
1. Copy zones from encounters_region2.json into art/world/overworld/encounters/encounters.json (drop `staged`/`rollable_when_wired`), regenerate data/encounters_wired.json, add `encounters` rects to route_east (grass → route_east_grass, reeds → route_east_reeds) and route_aurelith_saltmere.
2. Merge `teams` into TRAINER_TEAMS in src/battle/data/trainer_teams.js.
3. Water zones are Tideglide revisit (L24-35) — keep unrollable until a water runtime exists.
4. Remove route_east / route_aurelith_saltmere / saltmere / interiors from draft, fix the saltmere sign + office gift, add station_int / home_saltmere_a entities.

## Encounters (tiers 30/15/5/1, no slot below its evolution level, time-of-day ≥4 slots per phase)
route_east_grass 11, route_east_reeds 8, route_aurelith_saltmere_grass 17, thornwood_grass 7 (border, L9-13); revisit water: route_east_water 4, route_aurelith_saltmere_water 8, saltmere_water 13, thornwood_pond 3. Builder raised larkspar/huskling lo to 16 and frondhart to 18 (legal mins).

## Trainers (band R2 10-21; Master 2 kept at data/masters.json levels 18/19/21)
Lowered from GD after play-check: route_east_trainer_1, _3, _4, _6; salt road _2, _5; saltmere_ron_2 (all 3 variants, evolved aces still ≥16). Lancebeetle swapped out of ron_2 (rillop) and thornwood researcher (why in spec).

Play-check (20 seeds/starter, wild 10/route, heals before trainers, 3 retries):
- catch=random: every route trainer won 65-100% with retries; Ron 2 (no retry) 60-80%; Master 2 100% (90-95% first try).
- catch=grainling (grass-heavy party): weakest spot salt road _5 Jem 35-85%, Ron 2 25-70%; Master 2 100%.
- catch=none: route_east _4/_6 50-85%; Ron 2 25-55%.
- --second=peeplark (no grass type): Master 2 65-80% with retries, 25-40% first try — a real wall without a grass creature, trivial with one.
Sim limits: fainted creatures get no XP in the engine and the lead takes the hit, so the starter stays ~L11 in grass-heavy runs; no evolution flow exists yet (src/ui/ui.js ~line 1022), so player creatures never evolve.

## Gaps
- **No evolution flow in the game** — region 2 trainers field evolved forms at 16-21 while the player can't evolve. Biggest balance risk.
- Evolution levels: 12 game-vs-DEX conflicts (bramblehog 16|17, brineseal 16|24, bulwarkrab 16|28, eftwarden 16|24, frondhart 16|18, huskling 16|7, larkspar 16|14, rakefin 16|22, reedmoot 16|22, snapmoor 16|30, spraytern 16|25, streambarb 16|20). Game levels kept; Gary to decide.
- Losing to Ron 2: confirm the game lets the story continue (sim treats it as one try).
- Name clash resolved: hall trainer h1 renamed Lorna (Text Bot); thornwood researcher stays Nell.

## Art gaps (Character models / creature art)
Species in GD tables without art, left out of the staged tables: route_east dashhare, strawhaunt, milestoner; salt road rafterat, gildcub; water fountling, inkmantle, kelpwyrm, lanternbell, inklet, reefcrown; thornwood nettlegrub, acornip, pipistrix, mossloth, tappeck, ivyadder, twigling, thornfinch, knothaunt, oakenward, shadevix, silkwick, gleamcap, sigilmoth, imprick. Also sheafguard (no art). Builder warns when one gets art.

## Text keys for Text Bot (do not hand-edit overworld_lines.json)
All region-2 map NPCs/signs already have lines. Needed/open: `system.wip_after_master2` pop-up (paused by Gary 9:53 AM CT; draft in text/drafts/CUT_A_TEXT.md §3); trainer intro/defeat lines for any trainer added beyond the drafts; office clerk gift line if the gift becomes a script.

## Estimate to playable through Master 2 (after region 1 ships)
~1.5-2 dev days: wire tables + teams + encounter rects (0.5 d), map de-draft + sign/gift fixes + station/home entities (0.5-1 d), playtest pass (0.5 d). Plus an evolution flow (1-2 d) if region 2 must feel fair.
