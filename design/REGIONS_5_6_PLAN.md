# Regions 5 and 6 plan (Mirefen, Tidewater) — PLAN ONLY, nothing built

Written 2026-10-29 1:45 PM CT by Coder for Gary (pt1979u: "split the work between everyone and lets push for regions 5 and 6").
Sources: design/overnight_gd/INDEX.md + halls/ + shops.json, design/DEX_450.json, data/masters.json, data/hall_puzzles/{mirefen,tidewater_coast}.json,
data/encounters_wired.json, data/rt_benefits.json, data/region4/region4.json, art/world/overworld/maps/*.json,
/workspace/quality/dev_notes/kilumen.md, /workspace/quality/dev_notes/kilumen_pacing_audit.md, git log (dev/overworld-v1).
Everything in overnight_gd is DRAFT, not signed off by Gary.

## 0. Where 5 and 6 sit (story order from overnight_gd)
| Region | Coin | Town / Master hall | Master (draft name) | Element | Coin (draft) | Field skill gained | Maps |
|---|---|---|---|---|---|---|---|
| 4 (in progress) | 4 | Frostspire | Hale Corrie | bird + wind | Aerie Coin | Skylift | frostspire_pass, frostspire, greystone B2 |
| **5** | 5 | **Mirefen** | **Wenna Peat** | swamp | Reed Coin | **Tideglide** (surf); storm season starts | sunmeadow_fields, route_revival_sunmeadow (North Road), route_sunmeadow_mirefen (Reed Road), route_saltmere_mirefen (Causeway), mirefen, mirefen_bog, mirefen_hall_int |
| **6** | 6 | **Tidewater Coast** | **Jory Swell** | sea | Undertow Coin | none planned (needs Tideglide for hall) | route_coast / route_brookhollow_tidewater (Coast Road, storm-flooded), tidewater_coast (+ sea cave), tidewater_hall_int |
| 7, 8 | 7, 8 | Lanternport, Cindervale | Delphine Orrin, Brannock Fell | — | — | — | out of scope; Cindervale sets `all_badges` for the Aurelith arena (4 Battle Masters, 56-64, post-8) |

Region gating = story flags only (rt_benefits `regionFlags`): add `"5": "beat_master_frostspire"`, `"6": "beat_master_mirefen"`.

## 1. How regions 2-4 were built (pattern to copy)
- One Master per region, a hall with a puzzle (data/hall_puzzles/<zone>.json, solvability in tests/progression.test.mjs), 2-3 hall helpers.
- 2-4 routes + 1 town, Ron rival battle per region, 16-22 trainers per region, heal + shop branch per town (shops.json region key).
- RT Benefits: region N opens at Master N-1, raises `maxIdLevel` (R1 4, R2 6, R3 9 per dev notes, R4 promotions to 10/12 via quests pq_cold_site_audit / pq_field_lead, daily bonus node). Kilindex counts (e.g. Kilindex 25) feed ID XP.
- Region runtime file data/regionN/regionN.json (access, pacing table, promotions, RITA lines as PLACEHOLDERs, npcs, signs, story) + src/regionN/index.js; Text Bot request file data/textbot_requests_regionN.md; WIP notice moves to after Master N.
- **RT research key-card areas: NOT FOUND anywhere in repo/notes. New system** — needs design from scratch (Game dev) for R4 too.

## 2. Pacing (Pokémon = structure only)
Gary's fixed bands: M2 15-18, M3 22-24, M4 29-31. Main games add +3 to +6 per gym (gym 5 ace 31-43, gym 6 33-43; BW 31/35, Emerald 31/33).
overnight_gd drafts (M5 ace 40, M6 ace 46, trainers to 45) are **too high** after Gary's cuts. Proposed:
| Band | Region 5 | Region 6 |
|---|---|---|
| Wild (routes / town) | 30-34 / 32-35 | 35-38 / 36-40 |
| Route trainers | 31-34 | 36-39 |
| Ron | Ron 5? (draft has Ron 5 in Lanternport only) — none, or L34 | L39 (if moved here) |
| Hall helpers | 33-34 | 38-39 |
| Master (ace) | 33-35-36 (ace 36), 5 creatures | 38-39-40 (ace 41), 5 creatures |
| Trainer count | 22 (Sunmeadow 6, North Road 3, Reed Road 5, Causeway 3, Mirefen 5) + 3 hall | 12 (Coast Road 6, Tidewater 6) + 3 hall → **add 4-6** to reach 16-18 |
Hard but soul: smart team coverage (each Master has 1 off-type answer to the starter that beats it), not level walls. Re-run playcheck sims: target 40-60% first-try win for each starter.

## 3. Region 5 — exists vs missing
| Item | Exists | Missing |
|---|---|---|
| Maps | DRAFT maps for all 7 (sunmeadow_fields 60x50, North Road 46x60, Reed Road 60x46, Causeway 60x50, mirefen 54x46, mirefen_bog 44x38 built, hall 11x19); staging shots in qa/overnight_maps | routes have **0 warps** (not connected); interiors (heal, shop, homes, RT outpost) for Mirefen; Sunmeadow Croft interior; grid-fit check pass; art sign-off |
| Dungeon | mirefen_bog (fog, darkness tint, reed lamps 2067/2068) | B-floor or sunken ruin = research area candidate |
| Master + puzzle | Wenna Peat team draft; boardwalk puzzle "Bog-light boardwalk" (frogs croak order 3-1-4-2), hall map built | re-level team; battle_species are PLACEHOLDER stand-ins; puzzle playtest on phone |
| Encounters | zones wired: sunmeadow_fields_grass/_water, route_revival_sunmeadow_grass, route_sunmeadow_mirefen_grass, route_saltmere_mirefen_grass/_water, mirefen_grass_w/ne/s, mirefen_bog_surf | re-level to §2; research-only table |
| Species | DEX: Sunmeadow 19 (#259-277), Mirefen bog 24 (#278-301), Route 1 East 11 (crystal ridge, side) | **art needed: 19 + 22 = 41** (only Mirewump, Runeskein have art); + Route 1 East 11 if opened here; + Master team members without art |
| Benefits | R1-2 in rt_benefits.json (R3/R4 in code/region4.json) | region 5 entry: cap ID 14, 1-2 new perks, promotion quest |
| Story | overnight_quests drafts; text/drafts/overnight/{sunmeadow_fields,route_*,mirefen,halls_mirefen}.md | storm season start beat, Guardian/underground tie-in (design/UNDERGROUND_GUARDIAN_SIDESTORIES.md), Ron beat |
| Items / shop | overnight_gd items_*.json + shops.json mirefen tier; energy_tonic hidden at mirefen_item_4 | held items: e.g. bog-swamp boost charm, fog lens (accuracy); Tideglide gift; key card #5 |

## 4. Region 6 — exists vs missing
| Item | Exists | Missing |
|---|---|---|
| Maps | tidewater_coast 54x46 DRAFT, tidewater_hall_int 11x14 DRAFT; Coast Road encounter zones route_coast_grass/_water | Coast Road exists as maps/route_coast.json (overnight_gd calls it route_brookhollow_tidewater: names must be reconciled); storm-flood variant; sea cave map (tidewater_coast_cave zone exists, no map); interiors; warps |
| Master + puzzle | Jory Swell team draft; "Tide clock" puzzle (needs has_tideglide, shortest 11 steps verified) | re-level; hall dressing; phone playtest |
| Species | DEX: Coast Road 11, Tidewater 28 (#313-340) | **art needed: 39** (none have art) |
| Trainers | 12 + hall | 4-6 more (cliff divers, reef researchers) |
| Benefits | — | region 6 entry: cap ID 16, perk, promotion quest |
| Story | drafts tidewater_coast.md, halls_tidewater_coast.md, route_brookhollow_tidewater.md | storm peak beat, Lanternport hook |
| Items / shop | items_ + shops.json tidewater tier | held items (tide charm / sea boost), key card #6 |

**Art total R5+R6: about 80 creature sprite sets** (+ ~10 NPC/trainer classes, 2 Master portraits) plus battle backdrops (meadow, bog, bog-night, coast, reef/surf, sea cave, 2 halls).

## 5. RT research key-card areas (new system, one per region)
- Board key card earned from the region's RT board (quest or Benefits node) unlocks a gated door (story flag `rt_keycard_rN`).
- Inside: research-only Kilumen (do not appear elsewhere), lower catch rate (e.g. ×0.5), harder levels (+2 over region wilds).
- R5 candidate: sunken research station under mirefen_bog. R6: sea cave lab off tidewater_coast (tidewater_coast_cave).
- Species pick: 3-4 per area from DEX rares (e.g. R5 Bogbeacon, Fenmaw, Gloommire, Stampedor; R6 Abyssray, Lurelamp, Pearlisk, Atollback) — removed from normal tables.

## 6. Work split (one package per bot, in dependency order)
Order: **Game dev (A) + Story (B) → World Design (C) + Character models (D) → Animator (E) → Text Bot (F) → Coder (G)**. C/D/E can start on R5 while A/B finish R6.

**A. Game dev** — systems and balance
- In: §2-5, overnight_gd drafts, pacing audit, playcheck tools.
- Out: design/regions56/balance.json (levels, Master teams, trainer rosters incl. 4-6 new R6), key-card system spec design/RT_KEYCARD_SPEC.md (+ R4 retro-fit), Benefits nodes for R5/R6, held items + shop tiers, Tideglide field skill spec, storm-flood rules. Reuse free-licensed code first (log in toolkit registry).
- Accept: sims 40-60% first-try per starter for M5 and M6; JSON valid; no blocked words.

**B. Story Bot** — beats and lore
- In: DEX flavour, UNDERGROUND_GUARDIAN_SIDESTORIES.md, overnight_quests drafts, STORY_RULINGS_*.
- Out: design/regions56/story_beats.md (per map beats, Ron, storm season, Master intros, research-area lore, 2 promotion quests, 3-4 side quests per region).
- Accept: follows story-quality-standard; hard but with soul; Pokémon structure only.

**C. World Design** — maps, tilesets, towns, routes, interiors
- In: A balance (trainer spots), B beats, existing DRAFT maps.
- Out: art/world/overworld/maps/ — warps for all R5 maps, Coast Road storm variant + name reconcile, sea cave, 2 research areas, Mirefen + Tidewater interiors (heal, shop, RT outpost, 2-3 homes), Sunmeadow Croft; spots for Text Bot.
- Accept: strict square grid, assets fill whole squares, one-square gaps walkable; `grid_fit_and_swap.py --check --overworld` pass; `tools/run.py --check` 0; roundtrip pass; 60 fps on phone.

**D. Character models** — creature + NPC sprites
- In: DEX_450 visual briefs (#259-301, #313-340, Coast Road 11), research species list.
- Out: ~80 creature sets (front/back/icon) in art/characters/pixel + manifest; NPC/trainer classes; Wenna and Jory portraits. Research Kilumen first (they are the hook), then Master teams, then commons.
- Accept: quality like grass battle screen; registered in SPECIES via tools/sync_creatures.mjs; no Pokémon likeness.

**E. Animator** — backdrops, effects, animation
- In: D sprites, C biome art.
- Out: battle backdrops (meadow, bog, bog-night, coast, reef surf, sea cave, 2 halls, 2 labs), swamp/sea skill effects, storm/fog/rain overlays, Tideglide ride animation.
- Accept: grass-battle-screen quality; 60 fps on phone (perf check src/debug_perf.js); IP check as in IP_CHECK_ANIMATION.

**F. Text Bot** — all player text (text/*.py, overworld_lines.json)
- In: B beats, C spots, A item/perk names, Coder data/textbot_requests_region5.md and _region6.md.
- Out: keys for NPCs, signs, trainers, Masters, RITA region 5/6 lines, area_name, items, key-card terms.
- Accept: no blocked words (route in player text, berry, PP, shiny, throw for capture, Pokédex); validator EXIT 0. Coder never edits text/*.py.

**G. Coder (me)** — wiring, data, testing, release
- Out: data/region5/region5.json, data/region6/region6.json, src/region5|6/index.js, rt_benefits regions 5/6 + regionFlags, encounters_wired re-levels + research tables, masters.json + trainer_teams.js, hall puzzles wired, shops.json, key-card gates, WIP notice after M6, save migration, tests, Text Bot request files, release.
- Accept: npm test green (bar known Ron failure), run.py --check 0, progression tests solve both halls, playcheck 40-60%, phone 60 fps, dev notes updated; publish only after Gary sign-off.

## 7. Questions only Gary can answer
1. Confirm R5 = Sunmeadow + Mirefen (Wenna, swamp) and R6 = Coast Road + Tidewater (Jory, sea)?
2. Level bands: M5 ace 36, M6 ace 41 OK (overnight draft said 40/46)?
3. Ron battle in R5 and/or R6, or keep Ron 5 in Lanternport?
4. Research areas: one key card per region from the RT board — confirm, and should R1-R4 get them retro-fitted?
5. Is Route 1 East (crystal ridge, 11 species) part of R5 or later?
6. Ship R5 alone first, or both together?
