# Kilumen mechanics parity: re-score of 2026-10-23

Status: **audit for Gary** · written Fri 2026-10-23, 12:00–12:30 AM CT · author: Grok Bot (executor) · read-only audit. No code, map, art or text file was changed. The Oct 22 file `design/MECHANICS_PARITY.md` (written ~8:30 PM CT) is left as it was.

**What this is.** Every row of the Oct 22 parity table, re-scored against the code as it is now (grep and read in `src/`, `vendor/battle-sim/`, map and data JSON), not against the docs. Same 109 systems, same status and priority keys, same priorities, so the numbers compare like for like. The §9 conflicts and §10 legal guardrails of the Oct 22 file still apply; changes to them are listed in §12.

**Tests.** `npm test` on a copy of the tree in `/tmp/kil_audit` (the shared tree was not touched): **160/160 pass**. (The last dev-notes entry quotes 140/140; 20 tests have been added since.)

**Status key** (unchanged): **Built** works in `src/` today, file named · **Partial** some of it in code or data, not the whole loop · **Designed** in a doc, not in code · **Missing** neither · **Different** Kilumen does its own version (build state after the dash).
**New mark ‡**: built and tested, but **only reachable with `?battle=sd`**. On the default URL no battle runs at all (see §0).
**Priority key** (unchanged): **P0** vertical slice (Brookhollow → Route 1 → Ron battle 1 → Fernwick Master coin 1) · **P1** full game · **P2** nice to have.
**"Done"** in the percentages below = the Status cell contains **Built** (this includes "Different – Built"), the same rule applied to both dates.

---

## 0. Summary

### The honest headline
Since 8:30 PM Kilumen has gone from "an overworld with null hooks" to **a real game-systems layer**:
- a battle engine (Showdown fork) with energy, catch, retreat, XP and level-up, switching and items;
- party (6) and Field Archive; bag with pockets and pickups; RT Supply shop and money; heal counter and blackout;
- the Fernwick Hall puzzle runtime;
- phone menus, capture, heal and hit FX, and draft audio.

**But three wiring gaps mean the vertical slice cannot be played end to end yet:**
1. **On the default URL there is no battle.** `hooks.onBattle` stays null (`overworld.js:89`), so talking to a trainer counts as a win and pays prize money (`overworld.js:695` → `systems.onTrainerWin`). The real engine only runs with `?battle=sd`. `?battle=shell` hooks the scripted shell (`src/ui/ui.js:935`), which **always resolves as a win**. The staged alpha build forces the shell for trainers (`/workspace/kilumen_alpha/tools/build_alpha.py:79–81`) and predates the systems merge.
2. **There are no wild encounters in the overworld.** `hooks.onEncounterTile` is called on every grass step (`overworld.js:278`) but nothing assigns it. World Design's `encounters/encounters.json` (7 zones) is not loaded by any code. Wild battles only open with `?ui=battle`.
3. **Battles never set story flags.** `talk()` has no flag-setting code. Beating the Fernwick Master does not set `beat_master_fernwick`, so the Brookhollow east gate never opens. Ron does not give the Trail Runners (`has_run_shoes` is never set in `src/`). A loss to Ron blacks out, but CP step 2 says "win or lose".

### Status counts (109 systems)
| Status | Oct 22, 8:30 PM | Oct 23, 12:15 AM | Change |
|---|---|---|---|
| Built | 6 | **27** | +21 |
| Partial | 30 | 30 | 0 (7 rows rose out of Partial to Built, and 7 rows rose into Partial from Missing or Designed) |
| Designed | 18 | 10 | −8 |
| Missing | 19 | 6 | −13 |
| Different | 36 | 36 | 0 (now 6 are Built and 10 Partial; Oct 22: 2 Built, 3 Partial) |
| **Total** | 109 | 109 | |

Counting rule as in Oct 22 §11: the first bold status in the Status cell ("Built / Different" counts as Built; "Different – Built" counts as Different).

### Done by priority (rows whose status contains **Built**)
| Priority | Rows | Done Oct 22, 8:30 PM | Done now | Done now on the **default URL** (‡ rows excluded) |
|---|---|---|---|---|
| **P0** | 33 | 1 (3%) | **21 (64%)** | 15 (45%) |
| **P1** | 49 | 1 (2%) | **6 (12%)** | 6 (12%) |
| P0 + P1 | 82 | 2 (2%) | **27 (33%)** | 21 (26%) |
| P2 | 21 | 0 | 0 | 0 |
| no priority (done Oct 22) | 6 | 6 | 6 | 6 |

The 6 ‡ rows are B1, B12, B15, B16, B17 and B20. They become default-URL done the moment one battle path is hooked for trainers by default.

**P0 rows still not done (12):** B6 element chart (6 of 24 rows) · B11 (slice pair done; 3 more statuses for P1) · B21 learnsets and learn prompt · C1/C2 encounter roll · C15 Kilindex logging · F17 trainer sight runtime · G1 Master win sets no flag · G3 Ron flow · G11 "spotted" intro · G12 starter lines · M1 Kilindex log.

### Counts against planned totals (only where a doc gives the total)
| Thing | Done | Planned | Source of the total | Notes |
|---|---|---|---|---|
| Creatures with finished sprites | **16** | **450** (3.6%) | DD §Creatures ("I expect 450 creatures"; SP: 450 base, evolutions included) | Each of the 16 (`art/characters/pixel/creatures/*`) has 128 px front/back battle sprites, a front and back **idle** anim, and an overworld walk sheet. **No per-creature attack, hit or faint anims** (only generic hit FX). `manifest.json` status: "NOT APPROVED for wiring in until Gary says so" |
| Creatures with battle data | 16 (placeholder stats) | 450 | DD | `battle/data/creatures.js`: flat 45/60/80 by stage; `ui/data.js`: 16 species |
| Creature lines with 2–3 evolutions | not counted (no evolution flow, `evoLevel` placeholder) | "at least 350" | DD | |
| Zones | 3 built (Brookhollow, Fernwick, Thornwood) + 2 partial (Sunmeadow, Greystone) | **13** (4 towns, 3 cities, 6 biomes) | DD §World; `world_layout.json` | 8 of 13 not built (OWR §11). Lanternport and Mirefen have 2 and 1 maps already |
| Routes | 3 built | 14 | `world_layout.json` `routes` | |
| Maps (playable JSON) | **32** | **no total in any doc** | `world_layout.json` `maps_built` | Planned zones list no map counts, so a map total can't be given |
| Master halls / coins | 1 hall (Fernwick) | 8 | DD; CP §2 | Master trainer sprites: 2 of 8 (`tr_master_fernwick_m`, `tr_master_saltmere_f`) |
| Masters arena ("battle masters") | 0 | number not settled (DD says 8 and 15; Oct 22 §9 #2) | DD | Gary ruling still pending |
| Element chart rows | 6 | 24 elements in code (DD: 8 main + 15 sub = 23; code lists 24) | `elements.js` | |
| Learnsets | 0 | 1 per species | SKR | Skills are picked by element today |
| Trainer rosters | 0 real (every trainer gets a placeholder 2-creature team, `ui_sd.js:23`) | no total in any doc | | Route 1 has 3 trainers, plus the hall helpers, Ron and the Master |
| Text strings | **3,695** in `text/overworld_lines.json` v0.4.9 (counted by script: every string leaf outside `_` keys) | **no total in any doc** | | Largest blocks: maps 2,180, company inbox 214, system_* 1,000+. Known gaps: starter cradle lines are `[TODO Text Bot]`, battle strings use `system_battle.*` fallbacks marked PH. Kilindex blurbs: 16 (in `ui/data.js`) vs 450 creatures |

**Path legend for the evidence column.** `overworld.js`, `save.js`, `living.js`, `clock.js`, `map.js`, `movement.js`, `constants.js` = `src/overworld/…` · `ui.js`, `ui_tools2.js`, `fx_art.js`, `capture_fx.js`, `systems_screens.js`, `data.js` (ui) = `src/ui/…` · `battle.js`, `ui_sd.js`, `engine.js` = `src/battle/…` · `creatures.js`, `rules.js`, `elements.js`, `skills.js` = `src/battle/data/…` · `party.js`, `bag.js`, `heal.js`, `shop.js`, `items.js`, `puzzles.js`, `creature.js`, `index.js`, `shops.json` = `src/systems/…` (`shops.json` in `src/systems/data/`) · `sim/kilumen.ts`, `battle-actions.ts` = `vendor/battle-sim/sim/…` · `config.js` = `src/config.js` unless marked systems. Line numbers are as of 12:15 AM CT; other bots were editing the tree during the audit, so they can drift by a few lines.

---

## 1. How to read the rows
Columns are the same as Oct 22, plus **Was**, which gives the Oct 22 8:30 PM status. The Kilumen proposal and mapping column is not repeated here; it is unchanged, see `design/MECHANICS_PARITY.md`. 32 rows changed status or done-state.

## 2. Battle

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| B1 | Battle scene & turn loop | 2D side-on, menu: fight / bag / team / run | **Built** ‡ | Showdown fork `vendor/battle-sim` → `src/battle/engine.js`, wrapper `src/battle/battle.js` (format `kilumensingle`), screen `src/battle/ui_sd.js`. ‡ Only reached with `?battle=sd`. The default URL hooks no battle (`overworld.js:695` → win); `?battle=shell` hooks the scripted shell (`src/ui/ui.js:935`), which always resolves as a win | **Designed** | P0 | Coder |
| B2 | Stat sheet | 6 stats | **Built** | 6 engine stats (hp/atk/def/spa/spd/spe) with Kilumen names (`STAT_NAMES`, ui_sd level-up box). Base stats are PLACEHOLDER: flat 45/60/80 by stage (`battle/data/creatures.js`) | **Missing** | P0 | Coder; Gary (numbers) |
| B3 | Damage formula | level × power × atk/def × modifiers | **Built** | Engine formula (`battle-actions.ts`) + Kilumen modifiers (overuse ×0.6). Constants not signed off (`battle/data/README.md` PLACEHOLDERS) | **Missing** | P0 | Coder |
| B4 | IV/EV-style hidden growth | per-creature potential + training yield | **Partial** | `lineage` field on the creature record (`systems/creature.js`), passed to the engine (`battle.js:29`); no Field Training points | **Missing** | P1 | Coder |
| B5 | Natures | ±10% stat personality | **Missing** | No temperament anywhere in `src/` | **Missing** | P2 | Coder; Text Bot |
| B6 | Types & chart | ~18 types, super / not very / immune | **Partial** | 24 elements in `battle/data/elements.js`, but `PLACEHOLDER_CHART` has only 6 rows. No signed-off chart | **Partial** | P0 | Story Bot → Gary → Coder |
| B7 | Same-type bonus | ×1.5 | **Built** | Affinity multiplier in `battle/data/rules.js` (PLACEHOLDER value) | **Designed** | P0 | Coder |
| B8 | Critical hits | rare ×1.5–2 | **Built** | Crit rule in `rules.js` (PLACEHOLDER) | **Missing** | P1 | Coder |
| B9 | Accuracy / evasion stages | ±6 stages | **Built** | Engine boosts incl. evasion (`skills.js` `fadeout` evasion +1); overuse accuracy ×0.7 (`battle-actions.ts:674`). Uses the engine's stage table, not the proposed ±4 | **Partial** | P1 | Coder |
| B10 | Priority | +/- move speed tiers | **Built** | `skills.js` priority ±1 (`coalcharge` −1 `heavy`) | **Missing** | P1 | Coder |
| B11 | Status conditions | 5 major + volatile | **Partial** | Slice pair built: Scorched + Drowsy (`rules.js`, `skills.js` `huff`, `sparksneeze`). The other 3 proposed (Chilled, Jolted, Tainted) are not built | **Partial** | P0 (2) / P1 | Story Bot → Coder |
| B12 | PP | uses per move, restore at centre | **Different** – **Built** ‡ | **Energy** per skill, overuse = weaker, less accurate, self-damage (`battle-actions.ts:257–291, 1566`); Pep Remedy restores energy in and out of battle (`systems/items.js`, `config.js` `pepRemedyRestoresEnergyInBattle`) | **Different** | P0 | Coder |
| B13 | Battle weather / terrain | rain, sun, sand, hail | **Partial** | Overworld weather is cosmetic only (`living.js:30`: "No weather system exists yet"); none in battle | **Partial** | P2 | Coder |
| B14 | Held items | 1 slot, many effects | **Different** – **Partial** | `held` field on the creature record (`creature.js`); no held-item effects in the battle data | **Different** | P1 | Coder; Text Bot |
| B15 | Switching | free switch, faint replace | **Built** ‡ | `battle.js` `choose()` handles switch; faint replace in the engine; Team button in ui_sd | **Missing** | P0 | Coder |
| B16 | Run / flee | speed-based escape odds | **Built** ‡ | **Retreat** `-kretreat`, chance = agility ratio + attempts (`sim/kilumen.ts:63–84`); blocked in trainer battles (`ui_sd.js:263`) | **Missing** | P0 | Coder |
| B17 | Catch formula | ball × HP × status × rate | **Different** – **Built** ‡ | **Dominance crystal** `-kcrystal` with 1–4 shakes (`sim/kilumen.ts`), held-up capture FX (`ui/capture_fx.js`, `ui_tools2.js:203–236`); catch joins party or archive (`systems/index.js:198–201`). Catch rates are PLACEHOLDER. Not logged to the Kilindex (C15) | **Different** | P0 | Coder |
| B18 | Double battles | 2v2 | **Partial** | Format is singles only (`kilumensingle`); doubles appear only in the SP 8.6 design | **Partial** | P2 | Coder; Story Bot |
| B19 | Exp. share | split XP to party | **Missing** | No bench XP in `battle.js` or the engine | **Missing** | P1 | Coder; Text Bot |
| B20 | XP & levels | XP curves, level 1–100 | **Built** ‡ | `-kxp` / `-klevelup` (`sim/kilumen.ts`), level-up box (`ui_sd.js:186`), `xpForLevel` (`creature.js`). One PLACEHOLDER curve instead of the proposed 4; no zone level table | **Missing** | P0 | Coder; Story Bot (levels) |
| B21 | Level-up skills | learnsets, 4 slots, learn prompt | **Designed** | No learnsets: skills come from the element (`skills.js` `skillIdsFor`), no learn prompt. SKR spec unchanged | **Designed** | P0 | Coder; Character models (SKR) |
| B22 | Teachable skills (disc-style) | reusable / single-use teach items | **Designed** | Not in code | **Designed** | P1 | Coder; Text Bot |
| B23 | Skill relearning | tutor NPC | **Designed** | Not in code | **Designed** | P1 | Coder |
| B24 | Evolution triggers | level, item, trade, friendship, time, place | **Partial** | `evoLevel` = 16 × stage in data (`creatures.js`); evolution **FX only**, test URL `?ui=evolve` (`ui.js:948`, `fx_art.js:213`). "The game has no evolution flow yet" (`ui_tools2.js:246`) | **Partial** | P1 | Story Bot → Coder |
| B25 | Obedience | outsiders disobey above badge level | **Different** | Ruling: no disobedience. Nothing to build except reduced XP when over-levelled (not built) | **Different** | P1 | Coder |
| B26 | Battle AI | trainer move choice | **Partial** | Tier 1 only: a random usable skill (`battle.js:71–82`) | **Missing** | P1 | Coder |
| B27 | Battle-entry variant roll | (shiny is cosmetic only) | **Different** – **Partial** | `VARIANT_MODS` (`rules.js`, imported in `creature.js`), `variant` saved on the record, `variant_roll` hook in `encounters.json`; Cosmic swap tables in `art/characters/pixel/cosmic/` (draft). Variant sprites not done | **Different** | P1 | Character models; Coder |
| B28 | Blackout | lose money, return to centre | **Built** | `systems/heal.js` blackout: flat regional copay (`shops.json` copay), warp to the last heal point; test 157 / 160 in `npm test` | **Designed** | P0 | Coder; Text Bot |

## 3. Capture and encounters

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| C1 | Grass encounters | per-step roll in tall grass | **Partial** | Data now exists: `art/world/overworld/encounters/encounters.json` (7 zones, slots, 16 placeholder species). **Code does not use it**: `hooks.onEncounterTile` is called (`overworld.js:278`) but never assigned anywhere in `src/`. Wild battles only via `?ui=battle` | **Partial** | P0 | Coder; World Design |
| C2 | Encounter method / rate | step-based rate per area | **Partial** | Rates in `encounters.json` `roll`; no roll code | **Designed** | P0 | Coder |
| C3 | Cave encounters | every cave floor tile | **Partial** | Greystone table in `encounters.json`; no roll code | **Partial** | P1 | Coder; World Design |
| C4 | Off-grass ambush | – (no classic equivalent) | **Designed** | Not in code or tables | **Designed** | P1 | Coder |
| C5 | Time-of-day tables | morning/day/night slots | **Partial** | Slot `conditions` (time/weather/flood) in `encounters.json`; clock built; not wired | **Partial** | P1 | World Design; Coder |
| C6 | Weekday / weekly spawns | day-of-week events | **Partial** | Unchanged; SP 1.4 not approved | **Partial** | P2 | Story Bot → Coder |
| C7 | Fishing | rods, water tile encounters | **Missing** | `ambient.fish_spots` decoration only (`living.js`) | **Missing** | P1 | World Design; Coder; Text Bot |
| C8 | Surf encounters | water tiles | **Designed** | Tideglide not built | **Designed** | P1 | Coder; World Design |
| C9 | Repel | steps without weak encounters | **Designed** | No Hush Spray in `items.js` | **Designed** | P1 | Coder; Text Bot |
| C10 | Shiny-style rarity | ~1/4096 recolour | **Different** | Cosmic: swap tables drafted (`art/characters/pixel/cosmic/cosmic_swaps.json`), `system_cosmic` text (27 strings); no roll in code | **Different** | P1 | Character models; Coder |
| C11 | Rustling-patch chains | radar-style shaking grass chains | **Missing** | Animation only | **Missing** (animation Built) | P2 | Coder |
| C12 | Safari-style zone | limited balls / steps | **Different** | Mirefen Count designed only | **Different** | P2 | Coder; World Design |
| C13 | Legendaries | static one-off | **Different** | Guardian designed only | **Different** | P1 | Story Bot; Coder |
| C14 | Static / scripted encounters | sleeping blockers, gifts | **Partial** | `bin_creature` still calls `hooks.onScriptedEncounter`, which is null (`overworld.js:89, 745`) | **Partial** | P1 | Coder |
| C15 | Catch logging | seen/caught | **Partial** | Save v2 `kilindex` block exists (`save.js:27`) and is filled only by the v1 migration (`save.js:76–77`). A catch in battle does **not** write it (dev notes open item, systems-gd merge) | **Missing** | P0 | Coder |
| C16 | Nickname on catch | name prompt | **Partial** | Nickname shown in Team (`ui.js:475`); no prompt on catch | **Partial** | P1 | Coder |

## 4. Party and storage

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| P1 | Party of 6 | 6 max | **Built** | `systems/party.js` `partyMax` = 6 (`rules.js`), record fields uid/level/xp/hp/energy/status/warmth/variant/held (`creature.js`); tests | **Partial** | P0 | Coder |
| P2 | Party / summary screen | icons, stats, moves | **Built** | `scr_team` + summary (`ui.js:456–531`), SortableJS reorder, icon sheet `art/characters/pixel/icons/` (**DRAFT, not approved by Gary**, `config.js` `useIconSheet`) | **Missing** | P0 | Coder; Character models |
| P3 | Storage boxes / PC | box system at a terminal | **Built** | **Field Archive** 8×30 (+4 at ID-L3) (`party.js` `Archive`), `scr_archive`; overflow catches go there. Opened from the phone, not the terminal | **Partial** | P1 | Coder |
| P4 | Sell / release | release to wild | **Different** – **Partial** | Save `company.transfers` block only (`save.js:31`); no transfer UI | **Different** | P1 | Coder; Story Bot |
| P5 | Daycare | level while away | **Different** | Wexley's Croft: `system_croft` text (55 strings), no code | **Different** | P1 | Coder; Text Bot |
| P6 | Breeding / eggs | egg groups, hatch steps | **Designed** | No code | **Designed** | P1 | Story Bot → Coder |
| P7 | Walking partner | following lead | **Different** – **Built** | Trail Buddy follower (`overworld.js`) | **Different** – **Built** | – | – |
| P8 | Friendship / affection | hidden counter + perks | **Different** – **Partial** | Warmth 0–100 + palette swap; **battle effect now in**: `warmthEndure` (`rules.js`, `sim/kilumen.ts`). Status shake-off not built | **Different** – **Partial** | P1 | Coder |
| P9 | Release | – | **Designed** | Ruling B pending | **Designed** | P2 | Story Bot |

## 5. Field and traversal

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| F1 | Cut | cut small trees | **Different** | Brushbreak not built (`overworld.js:5` hook comment) | **Different** | P1 | Coder; World Design; Gary |
| F2 | Surf | cross water | **Different** | Tideglide not built (`constants.js:41`) | **Different** | P1 | Coder |
| F3 | Strength | push boulders | **Partial** / **Different** | Plates and crystals have a runtime now (F14), but no boulder push (no `boulder` code in `src/`). Greystone B1 needs it (CP step 6) | **Partial** / **Different** | P1 (Greystone B1 is on the critical path, CP step 6) | Coder; World Design |
| F4 | Rock smash | break rocks | **Different** | Not built | **Different** | P2 | Coder; World Design |
| F5 | Flash | light caves | **Different** | Not built | **Different** | P2 | Coder |
| F6 | Fly | to visited towns | **Different** | Skylift + Lumen Line not built (`constants.js:41`); `station_int` map exists | **Different** | P1 | Coder |
| F7 | Waterfall | climb falls | **Missing** | – | **Missing** | P2 | Story Bot; World Design |
| F8 | Rock climb | climb rocky walls | **Missing** | – | **Missing** | P2 | Story Bot; World Design |
| F9 | Ice sliding | slide until blocked | **Partial** | No slide code; spec in OWR §16.6 | **Partial** | P1 | Coder |
| F10 | Dive | deep water | **Partial** | Deep water blocked | **Partial** | P2 | Story Bot |
| F11 | Ledges | one-way hops | **Built** | `map.js`, `movement.js` | **Built** | – | Coder |
| F12 | Running shoes | hold to run | **Built** / **Different** | Hold B with `has_run_shoes` (`overworld.js:350`). No run toggle in Options. **Nothing in `src/` sets `has_run_shoes`** (Ron's hand-over is only a text `note`) | **Built** / **Different** | P1 (toggle) | Coder |
| F13 | Bike | faster, bike paths | **Built** / **Different** | Courier Bike | **Built** / **Different** | – | – |
| F14 | Puzzle tiles (plates / switches) | leader puzzles | **Built** | `systems/puzzles.js` `PuzzleRuntime` (latch plates + linked crystals, channels, `solved_flag`), `hooks.onPlate` wired (`systems/index.js:39`), state saved; tests | **Partial** | P0 | Coder; World Design |
| F15 | Roadblocks / story gates | blocker NPCs, trees | **Built** | Unchanged; progression check PASS (CP §6) | **Built** | – | – |
| F16 | Doors / warps / fades | – | **Built** | Unchanged | **Built** | – | – |
| F17 | Trainer line of sight | spotted → walk up → battle | **Partial** | Data built: `sight_range` + `sight_cells` per trainer (OWR §16.5; route1 4/3/4). **No runtime**: no `sight` code in `src/` | **Missing** | P0 | Coder; Text Bot |
| F18 | Item pickups & hidden items | visible item orbs + hidden | **Built** | `systems/bag.js` `collectPickup`: visible + hidden items, unique `item_<map>_<id>` flags, money pickups; satchel sprite is a procedural placeholder | **Partial** | P0 | Coder; World Design; Text Bot |
| F19 | Signs | readable signs | **Partial** | `signs_awaiting_world_id` now 0, but new signs from PATH_GRASS_STUDY are still pending ids (OWR §9) | **Partial** | P1 | World Design; Text Bot |
| F20 | Overworld weather | rain, snow, sandstorm | **Partial** | `?weather=` presets only | **Partial** | P2 | Coder |

## 6. Economy

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| E1 | Shops | marts, uniform prices | **Built** | RT Supply `sys_shop` via the clerk in `shop_int` (`systems/shop.js`, `ui/systems_screens.js`); buy/sell, stock tiers by coins (`data/shops.json`) | **Partial** | P0 | Coder; Text Bot |
| E2 | Pricing | same price everywhere | **Different** – **Built** | Fixed regional prices (`shops.json` regions; PLACEHOLDER numbers) | **Different** | P0 | Coder; Gary (prices) |
| E3 | Money from battles | trainer payout | **Built** | `awardBattleMoney`: class base × top foe level (`shops.json` `trainerMoney`). Caveat: on the default URL a trainer pays out with **no battle** (`overworld.js:695`) | **Designed** | P0 | Coder |
| E4 | Bag & pockets | pockets by item kind | **Built** | 6 pockets (`items.js` `POCKETS`), Pack screen | **Designed** | P0 | Coder |
| E5 | Healing items | potions, status heals, revive | **Built** | Small/Big Remedy, Pep Remedy, Calm Tea in field and battle (`items.js` `BATTLE_ITEMS`); amounts PLACEHOLDER | **Designed** | P0 | Coder; Text Bot |
| E6 | Berries / vitamins | held berries, stat boosters | **Different** – **Partial** | Feed items exist (`feed_bag*`, `vigor_seed` in `shops.json`); no growth system | **Different** | P1 | Coder |
| E7 | Healing centre | free full heal | **Built** | `systems/heal.js`: carers restore HP, energy and status, set the last-heal point; heal FX on `i_crystal_polisher`. Known issue: at 1920×1080 the clinic camera cuts the FX off | **Partial** | P0 | Coder; Text Bot |
| E8 | PC | storage + item box | **Different** – **Partial** | Company inbox on the terminal; Archive and Pack are in the phone; no item box | **Different** – **Partial** | P1 | Coder |
| E9 | Key items | key-item pocket | **Partial** | `key` pocket exists; `has_*` story flags are not shown as items | **Partial** | P1 | Coder |
| E10 | Employee ID & Benefits Board | – (no classic analogue) | **Different** – **Partial** | Save `company` block + `store_discount` node (a PROPOSAL id, `shops.json`); no board UI | **Different** | P1 | Story Bot → Coder |

## 7. Progression

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| G1 | 8 badges / leaders | leader halls, puzzle + helpers | **Different** – **Partial** | Hall puzzle runtime built (F14). The Master fight goes through the generic trainer path with a PLACEHOLDER 2-creature team (`ui_sd.js:23–24`). **Winning never sets `beat_master_fernwick`**: there is no flag-setting code in `talk()` (`overworld.js:688–704`; the text only carries `note: sets beat_master_fernwick`), so the Brookhollow east gate never opens in play | **Different** – **Partial** | P0 (Fernwick) / P1 | Coder; Story Bot |
| G2 | Final-four gauntlet | no-heal run | **Different** | Arena designed only | **Different** | P1 | Story Bot; Coder; World Design |
| G3 | Rival | recurring battles | **Different** – **Partial** | `ron_rival_1` in Fernwick fights through the generic trainer path. Missing: `beat_rival_ron_1`, the Trail Runners hand-over, and "win or lose" (a loss currently blacks out, `overworld.js:702`) | **Different** | P0 (battle 1) | Coder; Story Bot |
| G4 | Trainer rematches | phone / calendar rematches | **Different** | Not built | **Different** | P2 | Coder; Text Bot |
| G5 | Legendaries | – | see C13 | | | | |
| G6 | Post-game | new area, harder trainers | **Designed** | Ruling B pending | **Designed** | P2 | Story Bot |
| G7 | Battle facility | streak tower | **Different** | Not built | **Different** | P2 | Coder |
| G8 | Villain team | team + hideouts | **Different** | Story only | **Different** | P1 | Story Bot |
| G9 | Trainer level curve | levels track progress | **Partial** | Wild levels per zone in `encounters.json`; no trainer level table (payout falls back to lead − 1, `systems/index.js:224`) | **Designed** | P1 | Story Bot; Coder |
| G10 | Side quests | – | **Designed** | Not built | **Designed** | P2 | Story Bot; Text Bot |
| G11 | Trainer intros / losses | pre-battle lines, payout line | **Partial** | Challenge line → battle → lost/won line → money line (`overworld.js:690–704`, `systems/index.js:219`). No "spotted" intro (needs F17) | **Partial** | P0 | Text Bot; Coder |
| G12 | Starter choice | 3 starters | **Partial** | Lab cradles → `party.chooseStarter` (`systems/index.js:101–137`) works, but both lines are `[TODO Text Bot …]` and the 3 starters are not signed off | **Partial** | P0 | Coder; Text Bot; Story Bot |
| G13 | Player character choice | boy/girl | **Partial** | `playerName: 'Cal'` hard-coded (`config.js:28`) | **Partial** | P1 | Coder |

## 8. Meta

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 12:00–12:15 AM CT) | Was (Oct 22, 8:30 PM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| M1 | Creature index | seen/caught, data pages | **Different** – **Partial** | Kilindex screen lists the 16 species (`ui.js:531`), but seen/caught are never written by play (C15) | **Different** | P0 (log) / P1 | Coder; Text Bot |
| M2 | Index rewards | completion prizes | **Different** | Not built | **Different** | P1 | Coder; Story Bot |
| M3 | Trading | link trade + in-game trades | **Different** | Contacts screen is a stub (`ui.js:733`); `system_trade` text only | **Different** | P1 | Coder; Text Bot |
| M4 | Link battles | local / online | **Different** | Online stage 1 behind `?online=1` (`main.js`); no link battles | **Different** | P2 | Coder |
| M5 | Day / night | real-time clock | **Different** – **Built** | `clock.js` | **Different** – **Built** | – | – |
| M6 | Weekly events | weekday events | **Partial** | see C6 | **Partial** | P2 | Story Bot → Coder |
| M7 | Friendship | – | see P8 | | | | |
| M8 | Watch-style apps | wrist apps | **Different** – **Built** | **Smartphone** menu: team, pack, Kilindex, tasks, map, contacts, save, options (`ui.js:456`). Phone platform fix landed (`src/platform.js`) | **Different** | P1 | Coder |
| M9 | Save | manual save + one slot | **Built** | `save.js` v2 blocks (bag, archive, kilindex, company, systems) + save screen (`ui.js:681`) | **Built** | P0 (lines) | Text Bot |
| M10 | Options | text speed, battle style, sound | **Partial** | Phone Options: visuals, motion, sound, volume (`ui.js:688–705`); no text speed, battle style or run toggle | **Partial** | P1 | Coder |
| M11 | Accessibility | – | **Partial** | Touch, gamepad, reduced motion (menus and battle), volume; no key remap | **Partial** | P1 | Coder |
| M12 | Contests | – | **Different** | Not built | **Different** | P2 | Coder |
| M13 | Secret base | – | **Different** | Not built | **Different** | P2 | Coder; World Design |
| M14 | Tutorial | catching demo | **Different** | Not built | **Different** | P1 | Text Bot; Coder |
| M15 | Audio | music, jingles, cries | **Partial** | `src/audio/audio.js` (howler + ZzFX): DRAFT BeepBox/Bosca music and jsfxr SFX on by default, volume pass done; final score not assigned (`audio/PLACEHOLDERS.md`) | **Missing** | P1 | Coder; composer not assigned |

---

## 9. Milestones: what's done, what's left, how long

**Assumptions behind every range below** (if any of them is wrong, the estimate moves):
- A "working day" = one day of the bots working in parallel, with Gary checking in about once a day. These are **not** person-days.
- Gary's approvals come back within ~1 working day. Every Gary-only gate that waits longer adds that wait to the range directly.
- Gary's DD/SP placeholder numbers (stats, chart, prices) are good enough to ship the slice. Final balance comes later.
- Tool runs on Gary's PC (Aseprite, PixelOver GUI, Juice FX hand export) happen when he is at the PC.
- **Low confidence.** There is only ~1 day of velocity data (Oct 22 evening to Oct 23 midnight: 21 rows to Built). That burst came mostly from vendoring Showdown and one systems merge, and the work ahead (content: maps, creatures, text) does not compress the same way.

### (a) Vertical slice: Brookhollow → Route 1 → Ron battle 1 → Fernwick Master coin 1
**Done:**
- All 4 areas built and connected (Brookhollow, Route 1, Fernwick + Fernwick Hall; progression check PASS).
- Starter cradles (lines are TODO).
- Battle engine ‡, catch ‡, XP and level-up ‡.
- Party, bag, pickups, shop, money, heal and blackout.
- Hall puzzle runtime.
- 16 creatures with sprites and idles.
- Route 1 encounter table (data).
- Trainer sight data.
- Draft audio.
- 160/160 tests.

**Left, by owner:**
- **Coder:**
  1. Hook one battle path for trainers by default (Gary decision below).
  2. Wild roll: assign `onEncounterTile` and load `encounters.json` (Route 1 table `sunmeadow_grass` / route1 slots).
  3. On a win, set `beat_master_fernwick` and `beat_rival_ron_1`. Ron gives the Trail Runners (`has_run_shoes`) win or lose, with no blackout for Ron 1.
  4. Trainer sight runtime (F17) + "spotted" intro.
  5. Trainer roster loader (replaces the 2-creature placeholder).
  6. Kilindex seen/caught on encounter and catch.
  7. Minimal learnsets (or a Gary OK to ship element skill lists for the slice).
  8. Clinic camera clamp at 1080 (heal FX cut off).
  9. Port the `?reset=1` fix from alpha.
  10. Rebuild the alpha snapshot and rerun the gate.
- **World Design:**
  - Confirm the Route 1 table key and per-map rosters.
  - Trainer positions vs sight cells.
  - Clinic camera margin.
  - Ids for the new path-study signs.
- **Character models:**
  - Gary approval of the 16 creature sprites ("NOT APPROVED" in `manifest.json`) and the icon sheet.
  - Trainer battle sprites for Ron and the Fernwick Master (overworld sprites exist).
- **Animator:**
  - Attack, hit and faint anims for the slice creatures (only idles exist). Generic hit FX can stand in.
  - `bone_v2` capture poses awaiting Gary.
- **Text Bot:**
  - Starter cradle lines (`[TODO Text Bot]`).
  - Spotted intros.
  - Replace PH `system_battle` strings.
  - Ron 1 win/lose lines checked against the new flow.
- **Story Bot:**
  - The 3 starters.
  - Slice trainer teams and levels.
  - The slice part of the element chart.
- **Gary decisions:**
  - Battle default: Showdown engine vs scripted shell.
  - Accept placeholder numbers for the slice.
  - Sprite and icon approval.
  - `bone_v2`.
  - Player name (`Cal` hard-coded).
  - Publish the alpha or not.

**Estimate: 2–4 working days** if Gary's decisions land within ~1 day; **4–7** if approvals queue. Most of the coding is wiring existing pieces (the engine, `encounters.json`, sight data and the systems hooks all exist). The slice will play with placeholder balance and idle-only creature animation.

### (b) The full first region
**Interpretation (flagged):** the DD describes **one** region (13 zones, 14 routes, 8 Masters + arena). There is no "first region" as a sub-part in any doc. So (b) is read as **the whole map playable end to end**: all 13 zones, 14 routes, 8 coins and the arena, with field skills, using a **partial** creature roster. If Gary means something smaller (e.g. up to coin 2 or 3), scale down.

**Done:**
- Zones: 3 built, 2 partial, of 13.
- Routes: 3 of 14.
- Maps: 32 (no planned total in any doc).
- Master halls: 1 of 8.
- Master sprites: 2 of 8.
- Bike, ledges, story gates, warps, day/night.
- Text: 3,695 strings already written, much of it for later zones (`closed_exits`, `blockers`, `rail_only`, `field_skills`).

**Left, by owner:**
- **World Design:**
  - 8 zones + 11 routes (tilegen + LDtk + generated tiles, OK'd by Gary for new areas).
  - 7 Master halls with puzzles.
  - Arena.
  - Encounter tables for all zones.
  - Trainer placement and sight.
- **Coder:**
  - Field skills (Brushbreak F1, Tideglide F2 + surf encounters, boulder push F3, Skylift/Lumen Line F6, ice slide F9, rock smash/flash F4/F5).
  - Fishing C7.
  - Repel C9.
  - Evolution flow B24.
  - Learn prompt B21 + teachables B22.
  - Tier 2 AI B26.
  - Bench XP B19.
  - Held items B14.
  - The other 3 statuses B11.
  - Doubles if kept.
  - Rematches.
  - Text speed and run toggle (M10).
- **Character models:** 6 more Master sprites; trainer classes; creature sprites for every species placed (count TBD by Story Bot).
- **Animator:** attack, hit and faint anims for every placed creature; capture poses.
- **Text Bot:** zone and trainer lines for the new maps; Kilindex blurbs (16 now); croft and trade UI text exists.
- **Story Bot:**
  - Full chart (24 rows).
  - Zone level curve.
  - 8 Master teams.
  - Villain arc.
  - Which species appear where.
- **Gary:**
  - Masters count (8 vs 15).
  - Ruling B (release, post-game).
  - Doubles yes or no.
  - Approvals per zone, per sprite batch and per tileset.

**Estimate: 20–40 working days after (a).** World Design at ~1–2 days per zone (8 zones + routes + halls) is the long pole. Coder field systems run in parallel. The low end needs Gary approvals in batches; the high end assumes per-zone review cycles.

### (c) The whole game: 8 Masters, full story, all creatures
**Done:** 16 of 450 creatures (3.6%) with sprites and idles; 16 with placeholder battle data; 16 Kilindex blurbs; the story and design docs; the rest is as in (b).

**Left, by owner** (on top of (b)):
- **Character models:** **434** more creatures (450 − 16), including evolution lines ("at least 350" with 2–3 evolutions), back sprites, overworld sheets, icons and Cosmic variants.
- **Animator:** idle + attack + hit + faint for 434 creatures (PixelOver rigs).
- **Story Bot:** 450 species designs, stats and learnsets; the full story and ending; post-game.
- **Text Bot:** 434 Kilindex blurbs + story scenes (ink); total string count not in any doc.
- **Coder:** trade and link battles (M3/M4), Benefits Board (E10), croft and eggs (P5/P6), contests, battle facility (P2 rows); final audio pass; perf (Lighthouse mobile 32).
- **Gary:** final balance, final music (composer not assigned), store and legal sign-off (§10 guardrails).

**Estimate: 60–120 working days after (a)**, i.e. including (b). The range is dominated by creature art (434 creatures × sprite + 4 anims + icon + overworld sheet) and by how many Gary can review per day. No doc gives an art throughput per day, so this is the most uncertain number in the file. If Gary approves ~10 creatures per day, approval alone is ~44 days; if ~5, it's ~87. (Arithmetic only, not a measured rate.)

---

## 10. Where the new tools cut the most time
1. **Showdown fork (`vendor/battle-sim`)**: the biggest single saving. Damage, stages, switching, items, crit and priority came in as one piece (13 battle rows to Built in one evening). Kilumen rules are thin hooks in `sim/kilumen.ts`.
2. **tilegen + LDtk bridge**: Gary OK'd generated tiles for new areas. Seam checks PASS on 5 sets. This is the main lever on the World Design long pole in (b).
3. **PixelOver rigs + `po_import.py`**: one rig gives idle, attack, hurt and faint per creature. This is the main lever on (c)'s 434 creatures × 4 anims. Tested on synthetic exports only; the first real export is still to come.
4. **Juice FX**: hit and impact reactions without hand-animating.
5. **Pixel Composer**: element FX (23 effect folders planned). CLI unverified on Gary's PC.
6. **ink (`?ink=1`)**: story scenes as text files Story and Text Bot can write directly.
7. **BeepBox/Bosca + jsfxr + howler**: draft audio is already in the game.
8. **Playwright gate + `npm test` (160)**: every merge is checked on 4 device profiles. Lighthouse found perf at 32 mobile / 43 desktop (a later fix, not a blocker).

## 11. Biggest bottlenecks
1. **Gary-only approvals:**
   - battle default
   - numbers
   - chart
   - "NOT APPROVED" sprites
   - icon sheet
   - `bone_v2`
   - names
   - alpha publish
   - ruling B
   - Masters count
   
   Every milestone waits on these more than on code.
2. **PC-only tools**: Aseprite `kil.lua` (each run needs approval), PixelOver GUI, Juice FX hand export (128 px limit), Tilesetter path unverified, Pixel Composer unverified. Art throughput is tied to Gary's time at the PC.
3. **Creature scale**: 434 creatures of art + anims + data + text, with no measured rate yet.
4. **Placeholder balance**: stats, chart (6/24), catch rates, prices, XP curve are all PLACEHOLDER. Balance can't start until Story Bot's numbers are signed off.
5. **Process risk**: the repo has 4 commits (last 2026-10-22 8:19 PM CT), **213 uncommitted paths and no remote**, with several bots editing at once. One bad overwrite loses an evening's work. Not a game blocker, but the cheapest risk to remove.

## 12. Top 5 blockers (in order)
1. **No battle and no wild encounters on the default URL.** Trainers "win" by talking; `onEncounterTile` is unassigned; `encounters.json` is not loaded. *(Coder, needs Gary's battle-path decision.)*
2. **Wins never set story flags.** The Fernwick gate stays shut, Ron never gives the Trail Runners, and a Ron loss blacks out instead of "win or lose". *(Coder + Story Bot.)*
3. **All battle data is placeholder.** Flat stats, chart 6/24 rows, no learnsets, no trainer rosters, a tier 1 random AI. *(Story Bot → Gary → Coder.)*
4. **Creature art.** 16/450, idles only, sprites marked NOT APPROVED, icons and `bone_v2` pending. *(Character models, Animator, Gary.)*
5. **World.** 8/13 zones and 11/14 routes unbuilt, Master halls 1/8, field skills (F1–F9) not built. *(World Design + Coder.)*

## 13. Conflicts and guardrails
- **Oct 22 §9 (13 conflicts) and §10 (legal guardrails) carry over unchanged.** See `design/MECHANICS_PARITY.md`. None was resolved in code since 8:30 PM except where noted in rows (e.g. P8 Warmth now has its battle effect).
- **New conflict 14: default battle path.** Dev default = none (talk = win). Dev `?battle=shell` and the alpha build = scripted shell (always wins). Dev `?battle=sd` = real engine. One must be chosen as the default. *(Gary.)*
- **New conflict 15: Ron 1, "win or lose" vs blackout.** CP step 2 and the Ron text say the Trail Runners come after either result. The code treats a Ron loss as any trainer loss (`onTrainerLoss` → copay + warp). *(Story Bot to confirm; Coder.)*
- **New conflict 16: battle sprites "NOT APPROVED for wiring in" vs in use.** `manifest.json` says not approved until Gary says so, yet the `?battle=sd` screen and the alpha show them. *(Gary.)*
- **Deny-hash note (from dev notes, 11:15 PM):** placeholder skill names in `ui/data.js` overlap with upstream move names. Gary to decide (§10 guardrail).
