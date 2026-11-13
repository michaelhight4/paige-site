# Kilumen mechanics parity: re-score of 2026-10-23, 9:30 AM

Status: **audit for Gary** · written Fri 2026-10-23, 9:15–9:50 AM CT · author: Grok Bot (executor) · read-only audit. No code, map, art or text file was changed; this file is the only write. The 12:15 AM file `design/MECHANICS_PARITY_2026-10-23.md` and the Oct 22 file `design/MECHANICS_PARITY.md` are left as they were.

**What this is.** Every **P0 and P1** row of the 12:15 AM table, re-checked against the runtime code as it is now (grep and read in `src/`, map and data JSON, overnight/progression feature flags), plus a headless play-check of the core loop. P2 and no-priority rows are carried over unchanged (not re-checked). Same 109 systems, same status and priority keys, so the numbers compare like for like. New since 12:15 AM: §0 Delta, §13 Live alpha vs dev, §14 **Cut-line options** (Gary, 9:25 AM).

**Tests.** `npm test` on a copy of the tree in `/tmp/kil_audit2` (copied ~9:17 AM CT; the shared tree was not touched): **269/269 pass** (12:15 AM: 160/160).

**Status key** (unchanged): **Built** works in `src/` today, file named · **Partial** some of it in code or data, not the whole loop · **Designed** in a doc, not in code · **Missing** neither · **Different** Kilumen does its own version (build state after the dash).
**‡ retired**: the engine battle (`src/battle/ui_sd.js`) is now the default (`ui.js:962–966`), so the 6 ‡ rows (B1, B12, B15, B16, B17, B20) count on the default URL.
**Feature-flag rule (new)**: code that exists but sits behind an overnight/progression flag that is **off by default** (`src/overnight/flags.js`, `src/progression/flags.js`) counts as **Partial**, not Built. On by default: `links`, `sight`, `kilindex`, `starterLines`, `masters`. Off: `field`, `regionmap`, `learnsets`, `stagedMaps`, `masterTeamFernwick`, `masterGifts`, `hallPuzzles`, `quests`.
**Priority key** (unchanged): **P0** vertical slice (Brookhollow → Route 1 → Ron battle 1 → Fernwick Master coin 1) · **P1** full game · **P2** nice to have.
**"Done"** = the Status cell contains **Built** (this includes "Different – Built"); mixed-priority rows count under their first priority.

---

## 0. Summary

### The honest headline
The three 12:15 AM wiring gaps are closed in dev:
1. **Battles run by default** (engine battle, `ui.js:962–966`); `?battle=shell` is only an escape hatch.
2. **Wild encounters roll in tall grass** (`encounters.js:120`, 66 zones / 202 species in `data/encounters_wired.json`, art filter).
3. **Battles set story flags**: Ron 1 → `beat_rival_ron_1` on a win, Trail Runners win or lose, no blackout; Master → `beat_master_fernwick` (`story.js:13–14`); Ron 2–6 → flags + blackout on loss (9:05 AM).

Sight, spotted intros and Kilindex logging are on. **What still stops the slice being "finished"** is content, not wiring:
- every slice trainer (Ron 1 and the Fernwick Master included) fights the 2-creature PLACEHOLDER team;
- placeholder chart (6/24 rows), 2 statuses, no learnsets by default;
- starter lines are `[TODO]`;
- 210 synced species with DRAFT art and no blurbs;
- the **new opening** (office, promotion, test run catching 2, job briefing) has **no code at all**.

### Delta since 12:15 AM (P0/P1 rows)
| ID | Pri | 12:15 AM | 9:30 AM | Why |
|---|---|---|---|---|
| C1 | P0 | Partial | **Built** | `onEncounterTile` assigned (`encounters.js:120`); seen in play |
| C2 | P0 | Partial | **Built** | Per-step roll with zone rates |
| C15 | P0 | Partial | **Built** | `overnight/kilindex.js`, flag on |
| M1 | P0 (log) / P1 | Different – Partial | **Different – Built** | Kilindex filled by play (blurbs still 0/210 synced) |
| F17 | P0 | Partial | **Built** | `overnight/sight.js`, flag on |
| G11 | P0 | Partial | **Built** | Spotted intro via F17 |
| G1 | P0 (Fernwick) / P1 | Different – Partial | **Different – Built** (Fernwick) | `beat_master_fernwick` set (`story.js:14`, `awardMaster`) |
| G3 | P0 (battle 1) | Different – Partial | **Different – Built** (battle 1) | Ron 1 flags + run shoes + no blackout, seen in play (loss branch) |
| C5 | P1 | Partial | **Built** | `slotOk` time/weather/flood (`encounters.js:35–40`) |
| B21 | P0 | Designed | Partial | Learnsets coded but flag `learnsets: false` |
| B1, B12, B15, B16, B17, B20 | P0 | Built ‡ | Built | ‡ retired (engine battle is the default) |
| F12 | P1 (toggle) | Built / Different | Built / Different | `has_run_shoes` now set by Ron 1; toggle still missing |
| F3, F6 | P1 | Partial/Different, Different | unchanged | Code now exists behind `field` / `regionmap` flags (off) |

**Status counts (109 systems)**

| Status | Oct 22, 8:30 PM | Oct 23, 12:15 AM | Oct 23, 9:30 AM | Change since 12:15 |
|---|---|---|---|---|
| Built | 6 | 27 | **33** | +6 |
| Partial | 30 | 30 | 25 | −5 |
| Designed | 18 | 10 | 9 | −1 (B21 → Partial) |
| Missing | 19 | 6 | 6 | 0 |
| Different | 36 | 36 | 36 | 0 (now 9 Built: +M1, G1, G3) |
| **Total** | 109 | 109 | 109 | |

### Done by priority (rows whose status contains **Built**)
| Priority | Rows | Oct 22, 8:30 PM | Oct 23, 12:15 AM | **Oct 23, 9:30 AM** |
|---|---|---|---|---|
| **P0** | 33 | 1 (3%) | 21 (64%; 15 on default URL) | **29 (88%)**, all on the default URL |
| **P1** | 49 | 1 (2%) | 6 (12%) | **7 (14%)** |
| P0 + P1 | 82 | 2 (2%) | 27 (33%) | **36 (44%)** |
| P2 | 21 | 0 | 0 | 0 (not re-checked) |
| no priority | 6 | 6 | 6 | 6 |

Counted by script from the row tables below (first-priority rule).

**P0 rows still not done (4):**
- **B6** element chart: `PLACEHOLDER_CHART` has 6 of 24 rows (`elements.js:13`).
- **B11** statuses: only Scorched and Drowsy exist.
- **B21** learnsets: coded but switched off, and filled by a placeholder generator.
- **G12** starter lines: still `[TODO Text Bot …]` on screen.

**P0 rows that count as Built but still carry PLACEHOLDER content:** B2/B3/B7 numbers; G1/G3 teams (`ui_sd.js:23–25`); B17 catch rates; M1 blurbs.

### Counts against planned totals (only where a doc gives the total)
| Thing | 12:15 AM | 9:30 AM | Planned | Notes |
|---|---|---|---|---|
| Creatures registered in game data | 16 | **226** (16 hand-made + 210 synced) | 450 | The 210 synced species (`ui/species_synced.gen.js`) are all `art: "draft"` with placeholder stats; 9 without art are filtered out of encounters |
| Creatures with **approved** final sprites | 0 (16 drafted, "NOT APPROVED") | 0 | 450 | `manifest.json` approval unchanged |
| Kilindex blurbs | 16 | 16 (0 of 210 synced) | 450 | `blurb: ""` on every synced species |
| Encounter zones wired | 0 | **66 zones**, 202 species, on 20 maps | – | `data/encounters_wired.json` |
| Maps (playable JSON) | 32 | **61** | no total | 28 carry a DRAFT title (batch 3, `qa/overnight_maps`) |
| Master halls | 1 | 8 maps (1 with a working puzzle) | 8 | Puzzles 2–8 in `data/hall_puzzles/*.json`, `hallPuzzles` off |
| Trainer rosters | 0 real | 37 batch-3 trainers with GD teams; **0 in the slice** | – | Slice trainers use the placeholder team |
| Element chart rows | 6 | 6 | 24 | unchanged |
| Learnsets | 0 | generator only, flag off | 1 per species | |
| Quests | 0 | 50 in `data/quests.json`, system off | – | |
| Tests | 160 | **269** | – | all pass |

**Path legend** as in the 12:15 AM file, plus `encounters.js`, `story.js` = `src/battle/…`; `kilindex.js`, `sight.js`, `field.js`, `learnsets.js`, `region_map.js`, `npc_sprites.js` = `src/overnight/…`; `progression/index.js`, `masters.js` = `src/progression/…`. Line numbers are from the `/tmp/kil_audit2` copy (~9:17 AM CT). Other bots were editing the shared tree during the audit, so they can drift.

---

## 1. How to read the rows
Columns as before. **Was** now gives the **12:15 AM** status. The P2 and no-priority rows keep their 12:15 AM evidence text (not re-checked). For the P0/P1 rows that did not change, the 12:15 AM evidence was re-checked and is still true unless the cell says otherwise. Removing ‡ is not counted as a status change.

## 2. Battle

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| B1 | Battle scene & turn loop | 2D side-on, menu: fight / bag / team / run | **Built** | Showdown fork `vendor/battle-sim` → `engine.js`, wrapper `battle.js`, screen `ui_sd.js`. **Now the default** (`ui.js:962–966`, "Battles default v1, Oct 23"); `?battle=shell` is the escape hatch. Seen in the 9:30 AM play-check: wild battles in Route 1 grass and Ron 1 ran through `ui_sd`. Force-close fix `ui_sd.js:296` | **Built** ‡ | P0 | Coder |
| B2 | Stat sheet | 6 stats | **Built** | 6 engine stats (hp/atk/def/spa/spd/spe) with Kilumen names (`STAT_NAMES`, ui_sd level-up box). Base stats are PLACEHOLDER: flat 45/60/80 by stage (`battle/data/creatures.js`) | **Built** | P0 | Coder; Gary (numbers) |
| B3 | Damage formula | level × power × atk/def × modifiers | **Built** | Engine formula (`battle-actions.ts`) + Kilumen modifiers (overuse ×0.6). Constants not signed off (`battle/data/README.md` PLACEHOLDERS) | **Built** | P0 | Coder |
| B4 | IV/EV-style hidden growth | per-creature potential + training yield | **Partial** | `lineage` field on the creature record (`systems/creature.js`), passed to the engine (`battle.js:29`); no Field Training points | **Partial** | P1 | Coder |
| B5 | Natures | ±10% stat personality | **Missing** | No temperament anywhere in `src/` | **Missing** | P2 | Coder; Text Bot |
| B6 | Types & chart | ~18 types, super / not very / immune | **Partial** | 24 elements in `battle/data/elements.js`, but `PLACEHOLDER_CHART` has only 6 rows. No signed-off chart | **Partial** | P0 | Story Bot → Gary → Coder |
| B7 | Same-type bonus | ×1.5 | **Built** | Affinity multiplier in `battle/data/rules.js` (PLACEHOLDER value) | **Built** | P0 | Coder |
| B8 | Critical hits | rare ×1.5–2 | **Built** | Crit rule in `rules.js` (PLACEHOLDER) | **Built** | P1 | Coder |
| B9 | Accuracy / evasion stages | ±6 stages | **Built** | Engine boosts incl. evasion (`skills.js` `fadeout` evasion +1); overuse accuracy ×0.7 (`battle-actions.ts:674`). Uses the engine's stage table, not the proposed ±4 | **Built** | P1 | Coder |
| B10 | Priority | +/- move speed tiers | **Built** | `skills.js` priority ±1 (`coalcharge` −1 `heavy`) | **Built** | P1 | Coder |
| B11 | Status conditions | 5 major + volatile | **Partial** | Slice pair built: Scorched + Drowsy (`rules.js`, `skills.js` `huff`, `sparksneeze`). The other 3 proposed (Chilled, Jolted, Tainted) are not built | **Partial** | P0 (2) / P1 | Story Bot → Coder |
| B12 | PP | uses per move, restore at centre | **Different** – **Built** | **Energy** per skill, overuse = weaker, less accurate, self-damage (`battle-actions.ts:257–291, 1566`); Pep Remedy restores energy in and out of battle (`systems/items.js`, `config.js` `pepRemedyRestoresEnergyInBattle`) | **Different** – **Built** ‡ | P0 | Coder |
| B13 | Battle weather / terrain | rain, sun, sand, hail | **Partial** | Overworld weather is cosmetic only (`living.js:30`: "No weather system exists yet"); none in battle | **Partial** | P2 | Coder |
| B14 | Held items | 1 slot, many effects | **Different** – **Partial** | `held` field on the creature record (`creature.js`); no held-item effects in the battle data | **Different** – **Partial** | P1 | Coder; Text Bot |
| B15 | Switching | free switch, faint replace | **Built** | `battle.js` `choose()` handles switch; faint replace in the engine; Team button in ui_sd | **Built** ‡ | P0 | Coder |
| B16 | Run / flee | speed-based escape odds | **Built** | **Retreat** `-kretreat`, chance = agility ratio + attempts (`sim/kilumen.ts:63–84`); blocked in trainer battles (`ui_sd.js:263`) | **Built** ‡ | P0 | Coder |
| B17 | Catch formula | ball × HP × status × rate | **Different** – **Built** | **Dominance crystal** `-kcrystal` (1–4 shakes, `sim/kilumen.ts`), capture FX; catch joins party or archive (`systems/index.js`) and is now logged to the Kilindex (`src/overnight/kilindex.js`, C15). Catch rates PLACEHOLDER (`creatures.js:28`: 0.6/0.4/0.2 by stage). In the play-check one throw at a full-HP L5 sailquill broke out, which spent the only free crystal | **Different** – **Built** ‡ | P0 | Coder |
| B18 | Double battles | 2v2 | **Partial** | Format is singles only (`kilumensingle`); doubles appear only in the SP 8.6 design | **Partial** | P2 | Coder; Story Bot |
| B19 | Exp. share | split XP to party | **Missing** | No bench XP in `battle.js` or the engine | **Missing** | P1 | Coder; Text Bot |
| B20 | XP & levels | XP curves, level 1–100 | **Built** | `-kxp` / `-klevelup` (`sim/kilumen.ts`), level-up box (`ui_sd.js:186`), `xpForLevel` (`creature.js`). One PLACEHOLDER curve instead of the proposed 4; no zone level table | **Built** ‡ | P0 | Coder; Story Bot (levels) |
| B21 | Level-up skills | learnsets, 4 slots, learn prompt | **Partial** | Learnset system + learn prompt exist in `src/overnight/learnsets.js` but behind the overnight flag `learnsets: false` (`src/overnight/flags.js`), with a PLACEHOLDER generator ("no Story Bot learnset data yet"). Default game still picks skills by element (`skills.js` `skillIdsFor`) | **Designed** | P0 | Coder; Character models (SKR) |
| B22 | Teachable skills (disc-style) | reusable / single-use teach items | **Designed** | Not in code | **Designed** | P1 | Coder; Text Bot |
| B23 | Skill relearning | tutor NPC | **Designed** | Not in code | **Designed** | P1 | Coder |
| B24 | Evolution triggers | level, item, trade, friendship, time, place | **Partial** | `evoLevel` = 16 × stage in data (`creatures.js`); evolution **FX only**, test URL `?ui=evolve` (`ui.js:948`, `fx_art.js:213`). "The game has no evolution flow yet" (`ui_tools2.js:246`) | **Partial** | P1 | Story Bot → Coder |
| B25 | Obedience | outsiders disobey above badge level | **Different** | Ruling: no disobedience. Nothing to build except reduced XP when over-levelled (not built) | **Different** | P1 | Coder |
| B26 | Battle AI | trainer move choice | **Partial** | Tier 1 only: a random usable skill (`battle.js:71–82`) | **Partial** | P1 | Coder |
| B27 | Battle-entry variant roll | (shiny is cosmetic only) | **Different** – **Partial** | `VARIANT_MODS` (`rules.js`, imported in `creature.js`), `variant` saved on the record, `variant_roll` hook in `encounters.json`; Cosmic swap tables in `art/characters/pixel/cosmic/` (draft). Variant sprites not done | **Different** – **Partial** | P1 | Character models; Coder |
| B28 | Blackout | lose money, return to centre | **Built** | `systems/heal.js` blackout: flat regional copay (`shops.json` copay), warp to the last heal point; test 157 / 160 in `npm test` | **Built** | P0 | Coder; Text Bot |

## 3. Capture and encounters

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| C1 | Grass encounters | per-step roll in tall grass | **Built** | `hooks.onEncounterTile` is assigned (`src/battle/encounters.js:120`, wired by `wireWild` from `ui.js:965`). Tables: `data/encounters_wired.json`, **66 zones / 202 species**; 20 maps carry `encounter_zones`; species with no art are filtered out (`ui.js:952` art filter). **Seen in play**: Route 1 grass rolled `sailquill` L5 from `sunmeadow_grass` | **Partial** | P0 | Coder; World Design |
| C2 | Encounter method / rate | step-based rate per area | **Built** | Per-step roll with zone `roll` rates in `encounters.js` (same module as C1); tests in `npm test` (269/269) | **Partial** | P0 | Coder |
| C3 | Cave encounters | every cave floor tile | **Partial** | Roll code exists (C1), but `greystone_b1` has **no** `encounter_zones`, and cave floor outside zone rects is not rolled (`encounters.js:8`) | **Partial** | P1 | Coder; World Design |
| C4 | Off-grass ambush | – (no classic equivalent) | **Designed** | Not in code or tables | **Designed** | P1 | Coder |
| C5 | Time-of-day tables | morning/day/night slots | **Built** | `slotOk()` checks time, weather and flood conditions per slot (`encounters.js:35–40`); clock built | **Partial** | P1 | World Design; Coder |
| C6 | Weekday / weekly spawns | day-of-week events | **Partial** | Unchanged; SP 1.4 not approved | **Partial** | P2 | Story Bot → Coder |
| C7 | Fishing | rods, water tile encounters | **Missing** | `ambient.fish_spots` decoration only (`living.js`) | **Missing** | P1 | World Design; Coder; Text Bot |
| C8 | Surf encounters | water tiles | **Designed** | Tideglide not built | **Designed** | P1 | Coder; World Design |
| C9 | Repel | steps without weak encounters | **Designed** | Still no Hush Spray / repel item in `items.js` or `shops.json` (re-checked) | **Designed** | P1 | Coder; Text Bot |
| C10 | Shiny-style rarity | ~1/4096 recolour | **Different** | Cosmic: swap tables drafted (`art/characters/pixel/cosmic/cosmic_swaps.json`), `system_cosmic` text (27 strings); no roll in code | **Different** | P1 | Character models; Coder |
| C11 | Rustling-patch chains | radar-style shaking grass chains | **Missing** | Animation only | **Missing** | P2 | Coder |
| C12 | Safari-style zone | limited balls / steps | **Different** | Mirefen Count designed only | **Different** | P2 | Coder; World Design |
| C13 | Legendaries | static one-off | **Different** | Guardian designed only | **Different** | P1 | Story Bot; Coder |
| C14 | Static / scripted encounters | sleeping blockers, gifts | **Partial** | `hooks.onScriptedEncounter` is still null (`overworld.js:90`). This also blocks the new "test run, catch 2" opening beat (see §14) | **Partial** | P1 | Coder |
| C15 | Catch logging | seen/caught | **Built** | `src/overnight/kilindex.js` (overnight flag `kilindex: true`) writes seen/caught into the save v2 `kilindex` block on encounter, catch and starter; first registration queues `system_kilindex.new_entry` | **Partial** | P0 | Coder |
| C16 | Nickname on catch | name prompt | **Partial** | Nickname shown in Team; still no prompt on catch (re-checked) | **Partial** | P1 | Coder |

## 4. Party and storage

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| P1 | Party of 6 | 6 max | **Built** | `systems/party.js` `partyMax` = 6 (`rules.js`), record fields uid/level/xp/hp/energy/status/warmth/variant/held (`creature.js`); tests | **Built** | P0 | Coder |
| P2 | Party / summary screen | icons, stats, moves | **Built** | `scr_team` + summary (`ui.js:456–531`), SortableJS reorder, icon sheet `art/characters/pixel/icons/` (**DRAFT, not approved by Gary**, `config.js` `useIconSheet`) | **Built** | P0 | Coder; Character models |
| P3 | Storage boxes / PC | box system at a terminal | **Built** | **Field Archive** 8×30 (+4 at ID-L3) (`party.js` `Archive`), `scr_archive`; overflow catches go there. Opened from the phone, not the terminal | **Built** | P1 | Coder |
| P4 | Sell / release | release to wild | **Different** – **Partial** | Save `company.transfers` block only (`save.js:31`); no transfer UI | **Different** – **Partial** | P1 | Coder; Story Bot |
| P5 | Daycare | level while away | **Different** | Wexley's Croft: `system_croft` text (55 strings), no code | **Different** | P1 | Coder; Text Bot |
| P6 | Breeding / eggs | egg groups, hatch steps | **Designed** | No code | **Designed** | P1 | Story Bot → Coder |
| P7 | Walking partner | following lead | **Different** – **Built** | Trail Buddy follower (`overworld.js`) | **Different** – **Built** | – | – |
| P8 | Friendship / affection | hidden counter + perks | **Different** – **Partial** | Warmth 0–100 + palette swap; **battle effect now in**: `warmthEndure` (`rules.js`, `sim/kilumen.ts`). Status shake-off not built | **Different** – **Partial** | P1 | Coder |
| P9 | Release | – | **Designed** | Ruling B pending | **Designed** | P2 | Story Bot |

## 5. Field and traversal

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| F1 | Cut | cut small trees | **Different** | Brushbreak not built (`overworld.js:5` hook comment) | **Different** | P1 | Coder; World Design; Gary |
| F2 | Surf | cross water | **Different** | Tideglide not built (`constants.js:41`) | **Different** | P1 | Coder |
| F3 | Strength | push boulders | **Partial** / **Different** | Boulder push now exists in `src/overnight/field.js` but behind `field: false` (`src/overnight/flags.js`). Default game: no boulders. Greystone B1 needs it (CP step 6) | **Partial** / **Different** | P1 (Greystone B1 is on the critical path, CP step 6) | Coder; World Design |
| F4 | Rock smash | break rocks | **Different** | Not built | **Different** | P2 | Coder; World Design |
| F5 | Flash | light caves | **Different** | Not built | **Different** | P2 | Coder |
| F6 | Fly | to visited towns | **Different** | Region map + Skylift in `src/overnight/region_map.js`, behind `regionmap: false` ("has_skylift unobtainable until Frostspire exists") | **Different** | P1 | Coder |
| F7 | Waterfall | climb falls | **Missing** | – | **Missing** | P2 | Story Bot; World Design |
| F8 | Rock climb | climb rocky walls | **Missing** | – | **Missing** | P2 | Story Bot; World Design |
| F9 | Ice sliding | slide until blocked | **Partial** | No slide code; spec in OWR §16.6 | **Partial** | P1 | Coder |
| F10 | Dive | deep water | **Partial** | Deep water blocked | **Partial** | P2 | Story Bot |
| F11 | Ledges | one-way hops | **Built** | `map.js`, `movement.js` | **Built** | – | Coder |
| F12 | Running shoes | hold to run | **Built** / **Different** | Hold B with `has_run_shoes` (`overworld.js:360`). **Ron 1 now sets `has_run_shoes` win or lose** (`story.js:13`, `either` + gift `running_shoes`). Still no run toggle in Options | **Built** / **Different** | P1 (toggle) | Coder |
| F13 | Bike | faster, bike paths | **Built** / **Different** | Courier Bike | **Built** / **Different** | – | – |
| F14 | Puzzle tiles (plates / switches) | leader puzzles | **Built** | `systems/puzzles.js` `PuzzleRuntime` (latch plates + linked crystals, channels, `solved_flag`), `hooks.onPlate` wired (`systems/index.js:39`), state saved; tests | **Built** | P0 | Coder; World Design |
| F15 | Roadblocks / story gates | blocker NPCs, trees | **Built** | Unchanged; progression check PASS (CP §6) | **Built** | – | – |
| F16 | Doors / warps / fades | – | **Built** | Unchanged | **Built** | – | – |
| F17 | Trainer line of sight | spotted → walk up → battle | **Built** | `src/overnight/sight.js` `SightSystem` (flag `sight: true`), ticked and re-armed per map (`overnight/index.js:57, 97, 109`) using the per-trainer `sight_range`/`sight_cells` data | **Partial** | P0 | Coder; Text Bot |
| F18 | Item pickups & hidden items | visible item orbs + hidden | **Built** | `systems/bag.js` `collectPickup`: visible + hidden items, unique `item_<map>_<id>` flags, money pickups; satchel sprite is a procedural placeholder | **Built** | P0 | Coder; World Design; Text Bot |
| F19 | Signs | readable signs | **Partial** | Batch 3 added 102 signs, but the batch-3 (`qa/overnight_maps`) signs carry **DRAFT** dev labels; 11 DRAFT markers remain even inside the 19 slice maps (cut script, §14) | **Partial** | P1 | World Design; Text Bot |
| F20 | Overworld weather | rain, snow, sandstorm | **Partial** | `?weather=` presets only | **Partial** | P2 | Coder |

## 6. Economy

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| E1 | Shops | marts, uniform prices | **Built** | RT Supply `sys_shop` via the clerk in `shop_int` (`systems/shop.js`, `ui/systems_screens.js`); buy/sell, stock tiers by coins (`data/shops.json`) | **Built** | P0 | Coder; Text Bot |
| E2 | Pricing | same price everywhere | **Different** – **Built** | Fixed regional prices (`shops.json` regions; PLACEHOLDER numbers) | **Different** – **Built** | P0 | Coder; Gary (prices) |
| E3 | Money from battles | trainer payout | **Built** | `awardBattleMoney`: class base × top foe level (`shops.json` `trainerMoney`). Caveat: on the default URL a trainer pays out with **no battle** (`overworld.js:695`) | **Built** | P0 | Coder |
| E4 | Bag & pockets | pockets by item kind | **Built** | 6 pockets (`items.js` `POCKETS`), Pack screen | **Built** | P0 | Coder |
| E5 | Healing items | potions, status heals, revive | **Built** | Small/Big Remedy, Pep Remedy, Calm Tea in field and battle (`items.js` `BATTLE_ITEMS`); amounts PLACEHOLDER | **Built** | P0 | Coder; Text Bot |
| E6 | Berries / vitamins | held berries, stat boosters | **Different** – **Partial** | Feed items exist (`feed_bag*`, `vigor_seed` in `shops.json`); no growth system | **Different** – **Partial** | P1 | Coder |
| E7 | Healing centre | free full heal | **Built** | `systems/heal.js`: carers restore HP, energy and status, set the last-heal point; heal FX on `i_crystal_polisher`. Known issue: at 1920×1080 the clinic camera cuts the FX off | **Built** | P0 | Coder; Text Bot |
| E8 | PC | storage + item box | **Different** – **Partial** | Company inbox on the terminal; Archive and Pack are in the phone; no item box | **Different** – **Partial** | P1 | Coder |
| E9 | Key items | key-item pocket | **Partial** | `key` pocket exists; `has_*` story flags are not shown as items | **Partial** | P1 | Coder |
| E10 | Employee ID & Benefits Board | – (no classic analogue) | **Different** – **Partial** | Save `company` block + `store_discount` node (a PROPOSAL id, `shops.json`); no board UI | **Different** – **Partial** | P1 | Story Bot → Coder |

## 7. Progression

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| G1 | 8 badges / leaders | leader halls, puzzle + helpers | **Different** – **Built** (Fernwick) / **Partial** (halls 2–8) | A win sets `beat_master_fernwick` (`story.js:14` `TRAINER_RESULTS`; `progression/index.js:50` `awardMaster`), which is the coin (`lines.js:86–89`) and the Brookhollow east gate flag. Halls 2–8: maps exist (DRAFT), GD teams in `data/masters.json`, puzzles in `data/hall_puzzles/*.json` but `hallPuzzles` is off. Fernwick Master still fights a PLACEHOLDER 2-creature team unless `masterTeamFernwick` is turned on (`progression/index.js:35–45`, `ui_sd.js:23–25`) | **Different** – **Partial** | P0 (Fernwick) / P1 | Coder; Story Bot |
| G2 | Final-four gauntlet | no-heal run | **Different** | Arena designed only | **Different** | P1 | Story Bot; Coder; World Design |
| G3 | Rival | recurring battles | **Different** – **Built** (battle 1) | Ron 1: `beat_rival_ron_1` on win, `has_run_shoes` + Trail Runners either way, `continueOnLoss` (no blackout) (`story.js:13`, `overworld.js:713`). Ron 2–6: `RON_RIVALS` (`story.js:18–25`) set `beat_rival_ron_N` and force a blackout on loss (`overworld.js:719`, 9:05 AM). Ron 1 team is still the 2-creature PLACEHOLDER | **Different** – **Partial** | P0 (battle 1) | Coder; Story Bot |
| G4 | Trainer rematches | phone / calendar rematches | **Different** | Not built | **Different** | P2 | Coder; Text Bot |
| G5 | Legendaries | – | see C13 |  | see C13 |  |  |
| G6 | Post-game | new area, harder trainers | **Designed** | Ruling B pending | **Designed** | P2 | Story Bot |
| G7 | Battle facility | streak tower | **Different** | Not built | **Different** | P2 | Coder |
| G8 | Villain team | team + hideouts | **Different** | Story only | **Different** | P1 | Story Bot |
| G9 | Trainer level curve | levels track progress | **Partial** | Batch 3: 37 trainers carry GD teams (`def.team`, used only on batch-3 maps via `isBatch3Map`, `npc_sprites.js:50`); `masters.json` aces L12/21/28/35/40/46/50/55. **Every slice trainer (Route 1 ×3, hall helpers ×2, Ron 1, Fernwick Master) still fights the PLACEHOLDER team** (counter species + tumbloam/burlbeetle at lead level −1, `ui_sd.js:23–25`) | **Partial** | P1 | Story Bot; Coder |
| G10 | Side quests | – | **Designed** | Not built | **Designed** | P2 | Story Bot; Text Bot |
| G11 | Trainer intros / losses | pre-battle lines, payout line | **Built** | Spotted intro from `sight.js` (F17) + challenge → battle → result → money line (`overworld.js`, `systems/index.js`) | **Partial** | P0 | Text Bot; Coder |
| G12 | Starter choice | 3 starters | **Partial** | Cradles → `party.chooseStarter` work (play-check: Cindrip L5). Both lines still `[TODO Text Bot: starter cradle line]` / `[TODO Text Bot: starter received line]` (`systems/index.js:132–138`, seen on screen). `starterLines` flag is on but there are no lines to read. Starters not signed off | **Partial** | P0 | Coder; Text Bot; Story Bot |
| G13 | Player character choice | boy/girl | **Partial** | `playerName: 'Cal'` still hard-coded (`config.js`) | **Partial** | P1 | Coder |

## 8. Meta

| ID | System | Classic reference | Status (2026-10-23) | Evidence (code checked 2026-10-23, 9:15–9:45 AM CT) | Was (Oct 23, 12:15 AM) | Pri | Owner |
|---|---|---|---|---|---|---|---|
| M1 | Creature index | seen/caught, data pages | **Different** – **Built** | Kilindex screen reads the save `kilindex` block that play now fills (C15). 226 species registered (16 hand-made + 210 synced, `ui/species_synced.gen.js`), but **0 blurbs** for the 210 synced species (`blurb: ""`, no `system_kilindex.entries`) | **Different** – **Partial** | P0 (log) / P1 | Coder; Text Bot |
| M2 | Index rewards | completion prizes | **Different** | Not built | **Different** | P1 | Coder; Story Bot |
| M3 | Trading | link trade + in-game trades | **Different** | Contacts screen is a stub (`ui.js:733`); `system_trade` text only | **Different** | P1 | Coder; Text Bot |
| M4 | Link battles | local / online | **Different** | Online stage 1 behind `?online=1` (`main.js`); no link battles | **Different** | P2 | Coder |
| M5 | Day / night | real-time clock | **Different** – **Built** | `clock.js` | **Different** – **Built** | – | – |
| M6 | Weekly events | weekday events | **Partial** | see C6 | **Partial** | P2 | Story Bot → Coder |
| M7 | Friendship | – | see P8 |  | see P8 |  |  |
| M8 | Watch-style apps | wrist apps | **Different** – **Built** | **Smartphone** menu: team, pack, Kilindex, tasks, map, contacts, save, options (`ui.js:456`). Phone platform fix landed (`src/platform.js`) | **Different** – **Built** | P1 | Coder |
| M9 | Save | manual save + one slot | **Built** | `save.js` v2 blocks (bag, archive, kilindex, company, systems) + save screen (`ui.js:681`) | **Built** | P0 (lines) | Text Bot |
| M10 | Options | text speed, battle style, sound | **Partial** | Phone Options: visuals, motion, sound, volume (`ui.js:688–705`); no text speed, battle style or run toggle | **Partial** | P1 | Coder |
| M11 | Accessibility | – | **Partial** | Touch, gamepad, reduced motion (menus and battle), volume; no key remap | **Partial** | P1 | Coder |
| M12 | Contests | – | **Different** | Not built | **Different** | P2 | Coder |
| M13 | Secret base | – | **Different** | Not built | **Different** | P2 | Coder; World Design |
| M14 | Tutorial | catching demo | **Different** | No tutorial. The new opening (promotion → starter → "test run catching 2" → job briefing) has no code: `flg_promoted` is set nowhere (0 setters in `src/` and maps), `office_lab_int` does not exist, `onScriptedEncounter` null (§14) | **Different** | P1 | Text Bot; Coder |
| M15 | Audio | music, jingles, cries | **Partial** | `src/audio/audio.js` (howler + ZzFX): DRAFT BeepBox/Bosca music and jsfxr SFX on by default, volume pass done; final score not assigned (`audio/PLACEHOLDERS.md`) | **Partial** | P1 | Coder; composer not assigned |

---
---

## 9. Milestones: what's done, what's left, how long

**Assumptions** (same as 12:15 AM): a "working day" = one day of the bots in parallel with Gary checking in about once a day; Gary approvals come back within ~1 day; placeholder numbers are acceptable unless the milestone says "100%". **Low confidence**: the velocity data is two overnight bursts, mostly wiring. The work left is content (teams, art approval, text, maps), and that does not compress the same way.

### (a) Vertical slice: Brookhollow → Route 1 → Ron battle 1 → Fernwick Master coin 1 (as defined by P0)
**Done since 12:15 AM:**
- Engine battle by default.
- Wild roll with real tables.
- Sight and spotted intros.
- Kilindex logging.
- Ron 1 and Master flags; Trail Runners; Ron 1 with no blackout.
- 269 tests.

**Left:**
- **Story Bot → Gary:** slice teams (Ron 1, Master, 5 trainers); slice chart rows (B6); learnsets for the slice species (B21); sign off the 3 starters.
- **Coder:** turn on `masterTeamFernwick` / load slice teams; switch `learnsets` on once data exists. The placeholder team copies the lead's level, so it beats a single starter at any level (§14).
- **Text Bot:** the 2 starter lines (G12).
- **Gary:** sprite approval for the slice species.

**Estimate: 2–4 working days** to "playable end to end with real teams". It does **not** include the new opening; see §16 for that and for "100%".

### (b) The full first region
Same reading as 12:15 AM: the DD describes one region, so (b) = the whole map (13 zones, 14 routes, 8 Masters + arena).

**Now:**
- 61 maps, 28 of them DRAFT batch 3.
- 8 hall maps (1 puzzle on).
- 66 encounter zones.
- 37 trainers with GD teams.
- Masters 2–8 have teams in `masters.json`.
- Field skills coded behind `field` / `regionmap` (off).

**Left:**
- Un-DRAFT 28 maps (titles, signs).
- Turn on and verify `hallPuzzles` for 7 halls.
- Field skills: turn on and finish F1/F2/F3, and add ride art.
- Fishing, repel and evolution flow.
- Real teams for every non-batch-3 trainer.
- Quests (50, system off).
- Arena (all_badges).
- Ron 3–6 maps and lines.

**Estimate: 15–30 working days after (a)** (was 20–40; batch 3 delivered much of the map work as drafts).

### (c) The whole game
Unchanged in shape: 226 species are registered, but **0 have approved final art**, 210 are draft with placeholder stats, and 0 synced species have a blurb. 450 planned. **Estimate: 60–110 working days after (a)**, dominated by creature art and Gary's review rate.

## 10. Where the new tools cut the most time
As at 12:15 AM, plus:
- **Overnight feature flags** (`?ov=`, `?pg=`) let half-done systems land without breaking a new game. They are also the reason several rows stay Partial.
- **Batch generators** (encounters_wired, species sync, batch-3 maps/NPCs/signs/trainers) moved maps 32 → 61 and species 16 → 226 overnight, all as DRAFT.

## 11. Biggest bottlenecks
1. **Gary-only approvals** (unchanged list, plus): the new opening script, slice teams, and approval of the draft species art. The 210 synced species are all `art: "draft"`.
2. **Placeholder battle content**: chart 6/24, statuses 2, learnsets off, placeholder teams in the slice. Placeholder teams scale with the player's lead (§14).
3. **DRAFT content volume**: 28 DRAFT maps and 210 draft species. "Done" now means approving drafts more than making things.
4. **PC-only tools**: unchanged.
5. **Process risk**: **260 uncommitted paths**, last commit `3b537d6` 2026-10-22 8:19 PM CT, no remote, several bots editing at once (it was 213 at 12:15 AM).

## 12. Top 5 blockers (in order)
1. **The new opening has no code**: no promotion flag setter, no office lab map, no scripted catch-2 test run (`onScriptedEncounter` null), no job briefing. *(Story/Text Bot script → Coder → World Design.)*
2. **Slice trainers fight the placeholder team.** The team mirrors the lead's level and counters its element, so Ron 1 beat a lone L5 starter, and both Ron 1 and the Master beat a lone **L40** starter (§14). *(Story Bot teams → Coder flag on.)*
3. **Battle data placeholders**: chart 6/24, 2 statuses, learnsets off, flat stats. *(Story Bot → Gary → Coder.)*
4. **Art and text approval**: 0 approved creature sprites; 210 draft species; 0 synced blurbs; starter lines TODO. *(Gary, Character models, Text Bot.)*
5. **Live alpha is 7 hours behind dev** (§15) and has none of the 9:05 AM fixes. *(Coder rebuild + Gary publish decision.)*

## 13. Conflicts and guardrails
- **Oct 22 §9/§10 and 12:15 AM conflict 16 (sprites NOT APPROVED but in use) and the deny-hash note carry over.**
- **Conflict 14 (default battle path): resolved.** Gary chose the engine battle ("switch the dev build to the new battles", `ui.js:962`).
- **Conflict 15 (Ron 1 win or lose): resolved.** `continueOnLoss` and runners either way (`story.js:13`, `overworld.js:713`); seen in play.
- **New 17: Ron 2–6 always black out on a loss** (Gary, 9:05 AM; `story.js:25`, `overworld.js:719`), while Ron 1 never does. This is deliberate; it is recorded here so Text Bot checks the Ron 2–6 loss lines.
- **New 18: placeholder trainer team scaling.** `ui_sd.js:23–25` builds the foe team from the player's lead (counter species, lead level −1). That makes every unteamed trainer a level-matched counter. Fine for wiring tests; wrong for a shipped build.
- **New 19: new opening vs map/flags.** The 9:25 AM opening needs `office_lab_int` (SOUL_PLAYBOOK 8.1) and `flg_promoted`. Neither exists, and the office_int manager (13,5) is a text-only "promotion cutscene trigger" whose `v_flg_promoted` line can never show.

## 14. Core-loop play-check (headless, 9:28–9:45 AM CT)

**Setup:**
- Copy of the tree in `/tmp/kil_audit2`, served on a local port.
- Playwright Chromium, new game (`?save=0&hour=12&clouds=0&audio=0`), default flags.
- Movement by arrow keys along BFS paths; menus clicked.
- The scripted "player" always picks the **first usable skill**, so it plays worse than a person.
- Scripts are temporary (`/tmp/loopcheck/loop*.mjs`), not in the repo.
- **Helpers used are marked HELPER.**

| Step | Result | How |
|---|---|---|
| New game in Brookhollow | OK | starts at `brookhollow` (5,8), empty party, no flags |
| Lab → starter | OK, with a text break | cradle gives Cindrip L5, sets `got_starter`, Kilindex "added" line. Lines on screen: `[TODO Text Bot: starter cradle line]`, `[TODO Text Bot: starter received line]` |
| Brookhollow east gate before the Master | **Shut** (correct) | no walkable path from (30,12) past the `rt_barricade` cells (32,12–13) |
| Route 1 free crystal | OK | picked up at (8,13): "You picked up Dominance Crystal.", bag `{dominance_crystal:1}`, flag `item_route1_r1_crystal` |
| Route 1 wild battle | OK | grass roll fired by itself (table `sunmeadow_grass`; e.g. `sailquill` L5 at 9,14). An earlier wild battle (3 turns) was won |
| Route 1 **catch** | **BREAK (soft)** | the single throw at a full-HP L5 sailquill broke out; bag went to `{}`, archive 0, then the L5 starter lost and blacked out to `heal_brookhollow`. A new player has **0 coins and exactly 1 free crystal** (crystal costs 200, `shops.json`), so the first catch rests on one roll until trainer prize money comes in |
| Ron 1 (Fernwick 12,12), L5 starter | **Loss branch works** | lost; no blackout (stayed in Fernwick); `has_run_shoes` set; "Cal received the Trail Runners!" + run hint lines |
| Ron 1, **HELPER** 6 × L40 party | **Win branch works** | `beat_rival_ron_1` + `has_run_shoes` set |
| Fernwick Hall puzzle | **Not verified by play** | my scripted route derailed at (10,14) (script, not proven game fault). The puzzle is BFS-verified at build (`fernwick_hall_int.runtime.json` note) and covered by `npm test` |
| Fernwick Master, lone L40 starter (**HELPER** level) | **lost** | placeholder team = lead's counter species at lead level −1 (`ui_sd.js:23–25`), so boosting one creature doesn't help; blackout to `heal_brookhollow`, copay lines OK |
| Fernwick Master, **HELPER** 6 × L40, **HELPER** warp to (7,5) | **Win**, `beat_master_fernwick` set | coin flag present |
| Brookhollow east gate after the Master | **Opens** | walked east from (30,12) → `route_east` (0,12), a DRAFT batch-3 map |

**Breaks in the loop, in plain words:**
1. **Starter lines are TODO text on screen** (G12).
2. **The first catch can fail with no way to retry.** One free crystal, 0 coins; in this run the throw failed and the crystal was gone. Not a hard lock (trainer prize money buys crystals at 200), but the "catch" beat isn't guaranteed. The new opening's "test run catching 2" will need its own crystals or a scripted catch.
3. **Ron 1 and the Master are unbeatable for a lone starter at any level**: their placeholder team copies the lead's level and counters its element. Seen: Ron 1 beat the L5 starter, and the Master beat it at L40. With a scripted 6-creature L40 team both were won. This is a placeholder-team problem (G9), not a flag problem. A person who has caught several creatures may get through, but the slice can't ship like this.
4. After the Master, the east gate opens onto **DRAFT** `route_east` → Aurelith. That's a reason to put the slice-end block there (§16).
5. Not a break, but noted: the hall puzzle wasn't play-verified by this script (only by build/test).

No console errors in any run.

## 15. Live alpha vs dev

**Live alpha** (`paigegames.net/kilumen`):
- Shows `ALPHA_VERSION 'v0.1.2-alpha (Oct 2026)'`; files last modified 07:49:51 GMT = **2:49 AM CT Oct 23**. Checked with `curl` (WebFetch returned only the title).
- Has: the engine battles, wild tables (`data/encounters_wired.json`), `masters.json`, and batch-3 maps (`route_east`, `mirefen_hall_int`, `aurelith` all return 200).
- Pins `?ov` / `?pg` to off.

**Dev only (missing from the alpha):**
- `src/progression/hall_lamps.js` (404 on alpha)
- Ron 2–6 `RON_RIVALS` / `blackoutOnLoss` (9:05 AM)
- the `ui_sd` force-close fix (`ui_sd.js:296`)
- camera `outsideFillFor` / map tint
- the dev `showContinue` first-launch fix (the alpha has its own `store.hold` version)
- the ink/online hooks

So the alpha is ~7 hours behind and plays a different flag set from dev (sight, Kilindex etc. off). **No rebuild or publish was done** (read-only audit).

## 16. Cut-line options (Gary, 9:25 AM: ship a 100% finished slice)

**The opening Gary described:** home → Ron → office → promotion → starter → test run catching 2 → job briefing → Masters, Fernwick first.

**What exists today for that opening** (map and grep check):
- **Home and Ron:** exist. `house_1f`/`2f`; Ron at house_1f (6,4) has layoffs dialogue only.
- **Office:** `office_int` exists. Its manager (13,5) is a text-only "promotion cutscene trigger".
- **Promotion:** `flg_promoted` is set nowhere (0 setters in `src/`, 0 in maps), so the manager's `v_flg_promoted` line can never show.
- **Office lab:** `office_lab_int` (SOUL_PLAYBOOK 8.1) **does not exist**.
- **Starter:** it comes from the `lab_brookhollow` cradles, with TODO lines.
- **Test run catching 2:** not possible yet. `onScriptedEncounter` is null (`overworld.js:90`), and the player has 1 free crystal.
- **Job briefing:** no text, flag or trigger.

These 5 opening beats are inside **every** cut below.

**Counting rules:**
- Maps, trainers, species, DRAFT markers and quests come from a script over `art/world/overworld/maps/*.json`, `data/encounters_wired.json`, `data/quests.json` and `ui/species_synced.gen.js` (temporary `/tmp/loopcheck/cuts.py`).
- Gate positions come from the map JSON `story_gates` / `exits`.
- "100%" = no TODO/DRAFT/PLACEHOLDER content a player can see, real teams, approved art, blurbs, and every system inside the cut either finished or switched off on purpose.

### Cut A: opening + Master 1 (Fernwick). Block at the Brookhollow east gate and the Fernwick east road

**Inside:**
- **19 maps**, all non-DRAFT:
  - `house_1f`, `house_2f`, `brookhollow`, `office_int`, `lab_brookhollow`
  - `heal_brookhollow`, `heal_centre_int`, `shop_int`
  - `home_brookhollow_a`, `home_brookhollow_b`, `home_brookhollow_b_2f`
  - `route1`, `fernwick`, `fernwick_hall_int`, `heal_fernwick`, `club_int`
  - `home_fernwick_a`, `home_fernwick_a_2f`, `home_fernwick_c`
- **New map needed:** `office_lab_int`.
- **1 Master** (Fernwick, ace L12 in `masters.json`) and 1 hall, whose puzzle is built.
- **Battles:** Ron 1 plus 5 other trainers (Route 1 ×3, hall helpers ×2).
- **27 wild species** (20 of them draft synced art).
- **21 quests** in the zone data.
- **Story beats:** the opening above → Route 1 → Ron 1 → hall → coin 1.

**P0 for 100% (11, each with evidence):**
1. Promotion beat: no `flg_promoted` setter.
2. `office_lab_int` map missing.
3. Test run catching 2: needs a scripted encounter (C14, `overworld.js:90`) and guaranteed crystals. Play-check: the 1 free crystal failed.
4. Job briefing: nothing in text/flags.
5. Starter lines TODO (G12, `systems/index.js:132–138`, seen on screen).
6. Real teams for 7 battles (Ron 1, Master, 3 Route 1 trainers, 2 helpers). All are placeholder (`ui_sd.js:23–25`; `masterTeamFernwick` off). Play-check: unwinnable for a lone starter.
7. Element chart rows for the slice elements (B6, `elements.js:13`, 6/24 rows).
8. Learnsets for the 27 species + starters (B21, flag `learnsets: false`).
9. Gary art approval for 27 species (`manifest.json` NOT APPROVED; 20 are `art: "draft"`), plus Ron/Master battle sprites.
10. Kilindex blurbs for the 27 (0 in `system_kilindex`).
11. 11 DRAFT markers inside the 19 maps (signs/titles).

**P1 inside the cut (9):**
- C16 nickname prompt.
- B24 evolution flow: Route 1 has larkspar as a wild evolved form, and huskling evolves at ≤ L16.
- B26 tier-1 random AI.
- M10 options: text speed, run toggle.
- G13 player name `Cal` hard-coded.
- 21 zone quests: quest system off. Either turn it on or cut them.
- M15 final audio: draft music.
- C9 repel: no item.
- E9 key items: `has_*` not shown.

**Effort: ~5–8 working days.** Coder ~3 days (opening scripting + catch-2 + teams/learnsets switch-on); Story/Text Bot ~2–3 days; World Design ~1–2 days (office lab); Gary approval of 27 species + script. The Gary approval queue is the swing factor.

**Block:** 2 data edits, no code; the gate system is built and tested (F15, `tests/shots.mjs:180–189`).
1. Keep the slice end at the **Brookhollow east checkpoint** (`gate_brookhollow_east`, cells 32,12–13, guard `rt_guard_east`). Choose one:
   - re-flag it to a never-set flag with an "end of the alpha" guard line, or
   - keep it opening on `beat_master_fernwick` and add a new story gate at the `route_east` entry.
2. Add a `story_gate` on Fernwick's east exit → `thornwood` (ungated today).

Fernwick west (tidelock, `beat_master_lanternport`) and Route 1 east (`beat_master_frostspire`) are already gated.

**Stops mattering:**
- Field skills F1/F2/F3/F6/F9 and C7/C8 fishing/surf.
- Arena G2; halls 2–8 and their puzzles; Ron 2–6.
- All 28 DRAFT batch-3 maps.
- 183 of 210 synced species (art, blurbs, learnsets).
- 29 of 50 quests.
- Doubles B18, trading M3, croft/eggs P5/P6, Benefits Board E10.
- Most of the evolution flow (Master ace is L12; evolutions are at L16 × stage).

### Cut A2: Cut A + Thornwood and Greystone. Block at Thornwood east (already gated) and Greystone B1 → Frostspire Pass (already gated)

**Inside:**
- **23 maps:** A plus `thornwood`, `greystone_entrance`, `greystone_b1`, `lantern_rest`.
- **Battles:** 9 trainers + Ron 1 + Master.
- **54 species** (46 draft).
- **27 quests.**
- Still **1 Master**. Wild levels in Thornwood/Greystone run 9–27, above the Master's ace (L12).

**P0 for 100%:**
- A's 11, scaled up: teams 11, learnsets/art/blurbs for 54 species, 17 DRAFT markers.
- **Plus:** Greystone B1 has no `encounter_zones` (C3).
- **Plus:** Greystone B1 needs boulder push (F3), which is coded only behind `field: false` (CP step 6).

**P1:** A's 9.

**Effort: ~8–12 days.**

**Block:** Thornwood east is already gated on `beat_master_saltmere`, and Greystone → Frostspire Pass on `beat_master_revival`. Add only the Brookhollow east block. **Easiest block of all**, but it doubles the species and adds a coded-but-off system (boulders) for **no extra Master**.

### Cut B: through Master 2 (Saltmere). Block at the Aurelith edges and Route Revival–Saltmere north

**Inside:**
- **32 maps:** A2 plus `route_east`, `aurelith`, `station_int`, `route_aurelith_saltmere`, `saltmere`, `saltmere_hall_int`, `saltmere_office_int`, `home_saltmere_a`, `rt_branch_backroom`. 9 of these are batch-3 DRAFT.
- **Masters:** Fernwick + Saltmere (coin 2).
- **Ron:** Ron 1 + Ron 2 (`saltmere_ron_2`, flags + blackout built).
- **Battles:** 26 trainers, 14 with GD teams, 12 placeholder (incl. 3 Saltmere hall helpers).
- **91 species** (83 draft). **33 quests.**

**P0 for 100%:**
- A2's list at the larger scale: 91 species of art/blurbs/learnsets, 110 DRAFT markers.
- **Plus:** the Saltmere hall puzzle (in `data/hall_puzzles/saltmere.json`, but `hallPuzzles` is off and the map has no puzzle field).
- **Plus:** Saltmere Master team (`masters.json` has it; switch-on not verified in play).
- **Plus:** B11 statuses beyond the slice pair are likely needed. Not counted: no doc ties them to Saltmere.

**Effort: ~15–25 days.**

**Block:** Aurelith east/south. `route_coast` is already gated on `has_tideglide`, the Cindervale road on Lanternport, and the arena on `all_badges`. Add one gate on Saltmere's exit to `route_revival_saltmere`. Easy, since all of this is data.

### Cut C: through Master 4 (Frostspire)

**Inside:**
- **39 maps:** B plus `route_revival`, `revival_heights`, `revival_hall_int`, `route_revival_saltmere`, `frostspire_pass`, `frostspire`, `frostspire_hall_int`.
- **4 Masters.** Ron 1–3 (Ron 3 at Revival).
- **Battles:** 56 trainers, 37 with teams.
- **110 species** (102 draft). **233 DRAFT markers.** **38 quests.**

**P0 for 100%:**
- B's list at the larger scale.
- **Plus:** 3 hall puzzles off.
- **Plus:** boulders (F3) and probably ice slide (F9, not coded).

**Effort: ~25–40 days.**

**Block:** Route 1 east, Sunmeadow north and the Saltmere causeway all open on `beat_master_frostspire`. They would need re-flagging, plus Mirefen/Tidewater links. Medium effort: more gates to touch.

### Recommendation: **Cut A** (opening + Fernwick), with the slice-end block at the Brookhollow east checkpoint

**Why A:**
- It is the only cut with **zero DRAFT batch-3 maps**.
- Its one hall puzzle is already built.
- It needs the smallest Gary approval batch (27 species).
- Its block is 2 data edits on a tested gate system.

**Does it really reach 100% faster than the full game? Yes, clearly:**
- Cut A: ~5–8 working days.
- Full game: (a) + (b) + (c) ≈ 80–150 working days on the §9 ranges.

Nothing done for Cut A is thrown away: teams, chart rows, learnsets, art approval, blurbs and the opening all carry into the full game. Only the temporary block gets removed later.

**What A does not shortcut:**
- **B6 chart and B21 learnsets are game-wide designs.** Cut A only lets Story Bot sign off the slice's elements and 27 species first.
- **The new opening is new work in every cut.** It is the biggest single item in A (4 of the 11 P0) and has no code today.

A2 and B add species and DRAFT maps much faster than they add Masters, so they push "100%" out without adding a coin.

