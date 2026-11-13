# Kilumen mechanics parity: classic creature-battler (Gens 1–6) vs. Kilumen

Status: **audit and proposal for Gary** · written Thu 2026-10-22, ~20:30 CDT · author: Grok Bot (executor) · read-only audit (no code, map or text files changed)

**Why this exists.** Gary asked us to "reference Pokémon's set-up for our mechanics so it feels complete". This file is the **one merged index**. It lists every system a classic creature battler has. For each one it shows where Kilumen stands and links to each teammate's own audit for detail; it does not repeat their work.

**Sources read:**
- `Kilumen_design_doc.pdf` (cited as **DD §Heading**)
- `design/SOUL_PLAYBOOK.md` (**SP x.y**), `design/POKEMON_SKILL_STRUCTURE_RESEARCH.md` (**SKR §n**), `design/STORY_RULINGS_SOUL.md` (**SR**), `design/PATH_GRASS_STUDY.md`
- `OVERWORLD_DEV.md`
- `art/world/overworld/` docs: OVERWORLD_README (**OWR §n**), CRITICAL_PATH (**CP**), FIELD_SKILLS (**FS**), MOVEMENT, EXTRA_TILES
- the maps, `text/overworld_lines.json` v0.4.3, `art/characters/pixel/README.md`
- **the code in `src/`**, checked by grep and reading on 2026-10-22

**Status key**

| Status | Meaning |
|---|---|
| **Built** | Works in `src/` today; the file is named |
| **Partial** | Some of it is in code or data, but not the whole loop |
| **Designed** | Specified in a doc, not in code |
| **Missing** | Not in code and not specified anywhere |
| **Different** | Kilumen deliberately does its own version. The Kilumen analogue is named, and its build state is given in the Evidence column |

**Priority key**

| Priority | Meaning |
|---|---|
| **P0** | Needed for a complete-feeling vertical slice: Brookhollow → Route 1 → Ron battle 1 → Fernwick Master (coin 1) |
| **P1** | Needed for the full game |
| **P2** | Nice to have |

**Owners:** Coder (engine) · World Design (maps, tiles) · Character models (sprites) · Text Bot (lines) · Story Bot (story and design calls; anything rule-changing still goes to Gary).

---

## 0. Summary

**Big picture.** The build is a polished **overworld only**. It has:
- movement, run and bike
- warps
- story gates
- save
- clock
- NPCs and dialogue
- the Warmth follower

**There is no battle, capture, party, bag, shop or encounter rolling in `src/`.** Hooks exist but are null: `hooks.onBattle`, `onEncounterTile`, `onScriptedEncounter`, `onPlate`, `onWater` and `onFieldSkill` (`src/overworld/overworld.js` lines 50 and 82). Talking to a trainer counts as a win, because `onBattle` is null (overworld.js ~640). The heal counter only plays a line (overworld.js ~647).

### Status counts (109 systems audited, plus 2 cross-reference rows)
| Status | Count |
|---|---|
| Built | 6 |
| Partial | 30 |
| Designed | 18 |
| Missing | 19 |
| Different (Kilumen analogue) | 36 |
| **Total** | **109** |

"Built / Different" rows (F12 Trail Runners, F13 Courier Bike) count as Built. "Partial / Different" (F3) counts as Partial. Of the 36 "Different" rows, **5 are built or partly built in code**: Trail Buddy, Warmth, the day/night clock, the company inbox, and Fernwick Hall (map only). The other 31 exist in docs only.

**By priority (each row counted by its first priority):** P0 = 33, P1 = 49, P2 = 21. Already done, no priority: 6.

### Top 10 P0 gaps (do these first for the vertical slice)
| # | Gap | IDs | Owner(s) |
|---|---|---|---|
| 1 | **Battle engine core.** Turn loop, 6-stat sheet, damage, energy meter (PP analogue), faint, win/lose, flee, switch. Wire it to `hooks.onBattle` | B1–B3, B12, B15, B16 | **Coder** |
| 2 | **Element chart + affinity bonus.** 23 elements (8 main + 15 sub per DD §Creatures), each with counters and immunities; ×1.25–1.5 same-element bonus (SKR §5). Values are ours | B6, B7 | **Story Bot** (the chart call, then Gary) → **Coder** (data) |
| 3 | **Levels, XP and level-up skills** for the 16 creatures that have sprites: learnsets, a 4-slot skill list and the learn prompt | B20, B21 | **Coder**; skill structure from **Character models** (SKR) |
| 4 | **Wild encounter roll.** Tick while moving in grass → pick a creature from the region pool → roll the battle trigger (DD §Story plot). Fill the `sunmeadow_grass` table. Off-grass Enraged ambushes (C4) follow at P1 | C1, C2 | **Coder** (roll); **World Design** (tables) |
| 5 | **Dominance-crystal capture.** The target goes opaque/clear as odds rise; no throw: the trainer holds the crystal out on one extended arm, the foe dissolves into light and streams in, 1–4 pulses in hand by odds, rune lock + bloom or light bursts out (SP 5.3, Gary Oct 22 11:05 PM); our own catch formula; log the catch to the Kilindex | B17, C15, M1 | **Coder**; dex-rating lines **Text Bot** |
| 6 | **Trainers spot you and walk up** ("Spotted!" violet spark, SP 5.1). Sight lengths are already in the map notes; trainer intro and loss lines | F17, G11 | **Coder** (sight); **Text Bot** (intros and losses) |
| 7 | **Revival Point heal counter** that really restores HP, energy and status; blackout returns you to the last heal counter with a copay (SP 7.6) | E7, B28 | **Coder** (heal counter); **Text Bot** (healer script, blackout lines) |
| 8 | **Party of 6 + party screen** (summary, reorder, lead = Trail Buddy) with **party icons**; starter choice | P1, P2, G12 | **Coder**; **Character models** (party icons) |
| 9 | **Bag with pockets + item pickup** (visible and hidden items already placed in maps); potions, status cures, crystals | E4, E5, F18 | **Coder** (bag pockets); **World Design** (hidden items); **Text Bot** (pickup and hidden-item lines) |
| 10 | **Revival Tech shop + battle money.** Buy/sell at fixed regional prices; money from trainers; Fernwick Hall plate/crystal puzzle runtime so coin 1 can be earned | E1–E3, F14 | **Coder**; **Text Bot** (shop script); **World Design** (puzzle data, already BFS-verified) |

Other P0 rows not in the top 10: B11 (status conditions, minimal 2), G1 (Fernwick Master), G3 (Ron battle 1), M9 (save prompt text). All of them hang off items 1–10.

---

## 1. Teammate audits: merged index (read these; not duplicated here)

| Area | Owner | Their audit / source of truth | Gaps credited to them (this file defers to their doc for detail) |
|---|---|---|---|
| Engine | **Coder** | `OVERWORLD_DEV.md` (built/not-done list); Coder's own engine-gap audit (pending; not on disk at 20:25 CDT) | trainers seeing you and walking up (F17) · heal counter (E7) · PC storage (P3) · ice sliding (F9) and ledges (F11) · field moves (F1–F8) · running (F12) · bag pockets (E4) · repel (C9) · rustling grass (C11) |
| Maps and tiles | **World Design** | `art/world/overworld/OVERWORLD_README.md` §11 "Gaps / to come", plus the **built/specced/missing table World Design is adding to its own docs** (pending at time of writing); `CRITICAL_PATH.md`, `FIELD_SKILLS.md`, `EXTRA_TILES.md`, `PUZZLE_PROGRESSION.md` | hidden items (F18) · boulders (F3) · cuttable bushes (F1) · fishing spots (C7) · encounter tables (C1) |
| Sprites | **Character models** | `art/characters/pixel/README.md`, `manifest.json`; move research in `design/POKEMON_SKILL_STRUCTURE_RESEARCH.md` | party icons (P2) · shiny-style **Cosmic** variant art (C10, B27) · skill structure (B21–B23) |
| Lines | **Text Bot** | `text/overworld_lines.json` (`_meta`, `comfort`, `catalogue`, `signs_awaiting_world_id`) | item pickup and hidden items (F18) · healer and shop scripts (E7, E1) · trainer intros and losses (G11) · repel wear-off (C9) · blackout (B28) · save (M9) · dex rating (M1) · daycare (P5) · fishing (C7) |
| Story calls | **Story Bot** | `design/STORY_RULINGS_SOUL.md` (rulings A and B pending Gary); `design/SOUL_PLAYBOOK.md` | element chart call (B6) · eggs (P6) · post-game / release (G6, P9) · co-op vs rival Ron (G3) |

**Two notes on the Coder gap list, checked against the code.** These are not disputes; they are here so nobody rebuilds something that already works.
- **Ledges** (`Col.LEDGE_S`, `map.js` ~142, hop in `movement.js`) and **running** (hold B with `has_run_shoes`, `overworld.js` ~312) are **already built**. The open parts are ice sliding (code 10 currently walks like floor, per `constants.js`) and the run *toggle* (SP 7.1).
- **Grass rustle animation** is built (`renderer.js` `tileFrame`, `overworld.js` ~227). What's open is the rustling-patch *mechanic* (C11) plus its leaf particles and SFX (SP 5.5, 4.6).

---

## 2. Battle

| ID | System | Classic reference (generic) | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| B1 | Battle scene & turn loop | 2D side-on, menu: fight / bag / team / run | **Designed** | DD §Battle; 320×240 pilot battle screen in `art/characters/pixel/effects/README.md`; `hooks.onBattle` null (overworld.js) | Turn order by Agility; skill effects come from the skill, never the creature (Gary rule, pixel README). Menu labels: Skills / Pack / Team / Retreat | P0 | Coder |
| B2 | Stat sheet | 6 stats | **Missing** | DD mentions health, def, attack, agility only | 6 stats with our own names: Vitality, Might, Guard, Focus (special atk), Resolve (special def), Agility. Base totals tuned to our curve | P0 | Coder (Story Bot to sign off names) |
| B3 | Damage formula | level × power × atk/def × modifiers | **Missing** | – | General formula shape is fine; our own constants and a level-curve spreadsheet in `design/_work/` | P0 | Coder |
| B4 | IV/EV-style hidden growth | per-creature potential + training yield | **Missing** | DD §Plot: Feed "help them grow"; Benefits Board perks | **Lineage** (hidden 0–7 per stat) + **Field Training** points from the element of defeated foes; Feed adds training directly (see E6) | P1 | Coder |
| B5 | Natures | ±10% stat personality | **Missing** | – | **Temperament** (8 original traits, ±6% on one pair). Shown as an NPC-readable mood line, not a number | P2 | Coder; Text Bot (trait lines) |
| B6 | Types & chart | ~18 types, super / not very / immune | **Partial** | DD §Creatures (8 main + 15 sub = 23 elements, "counter and immunity"); 23 effect folders in `art/characters/pixel/effects/`; no chart anywhere | Main element = row of the chart; sub-element shifts one weakness/resist (DD). Multipliers ×1.5 / ×0.6 / ×0 (ours). Teach it in the tutorial (SP 8.1) | P0 | Story Bot → Coder |
| B7 | Same-type bonus | ×1.5 | **Designed** | SKR §5 (×1.25–1.5 "affinity") | **Affinity** ×1.3 (SKR recommendation) | P0 | Coder |
| B8 | Critical hits | rare ×1.5–2 | **Missing** | – | **Clean Strike**: 1/20 base, ×1.4, ignores Guard boosts; binoculars (B14) show the odds | P1 | Coder |
| B9 | Accuracy / evasion stages | ±6 stages | **Partial** | DD §Battle: overuse raises the miss chance; no stages | ±4 **Focus stages** (ours), plus the overuse miss penalty | P1 | Coder |
| B10 | Priority | +/- move speed tiers | **Missing** | – | Skill tag `swift` (+1) / `heavy` (−1). Max 3 tiers | P1 | Coder |
| B11 | Status conditions | 5 major + volatile | **Partial** | DD §Items/§Plot: statuses exist, cured by Feed or potions; none defined | 5 originals: **Scorched** (chip dmg), **Chilled** (−Agility), **Drowsy** (skip turns), **Jolted** (may lose turn), **Tainted** (rising dmg). Slice needs 2 (Scorched, Drowsy) | P0 (2) / P1 | Story Bot (list) → Coder; Text Bot (status lines) |
| B12 | PP | uses per move, restore at centre | **Different** | **Energy meter** (DD §Battle): overuse = self-damage, more misses, less damage. Not built | Energy per skill shown as crystal pips; overuse animation SP 5.2 | P0 | Coder |
| B13 | Battle weather / terrain | rain, sun, sand, hail | **Partial** | Overworld only: `living.js` WEATHER presets (cosmetic), storm season FS §3 | **Conditions**: Rain, Ashfall (Cindervale), Fog (Mirefen), Snow (Frostspire), carried from the overworld into battle; +20% to matching elements | P2 | Coder |
| B14 | Held items | 1 slot, many effects | **Different** | DD §Items: one slot; battle armour, training dummy (XP), gold coin (money), boxing gloves, binoculars (foe intent + damage range). Not built | Keep DD list; names via Text Bot. Binoculars = Kilumen's own "intel" mechanic | P1 | Coder; Text Bot (names) |
| B15 | Switching | free switch, faint replace | **Missing** | – | Standard switch; switching costs the turn. Part of the engine core | P0 | Coder |
| B16 | Run / flee | speed-based escape odds | **Missing** | – | **Retreat**: odds scale with Agility ratio and attempts (our curve); never from trainers or the Guardian | P0 | Coder |
| B17 | Catch formula | ball × HP × status × rate | **Different** | **Dominance crystal** (DD §Story plot, §Dark undertones): the target goes opaque/clear by odds; Guardian very low; Benefits perk raises crystal effectiveness. Not built | Odds = rarity × (1 − HP%) × status × crystal grade × perk (our numbers); held-up crystal absorbs the foe, 1–4 pulses by odds, no throw (SP 5.3; Nintendo throw-to-catch patents) | P0 | Coder |
| B18 | Double battles | 2v2 | **Partial** | Only Concord Spire 2v2 (SP 8.6); none in story | Optional: Ron + you vs. Revival Tech pair in co-op mode (G3) | P2 | Coder; Story Bot |
| B19 | Exp. share | split XP to party | **Missing** | DD: training dummy held item, Benefits Board "increased xp" | **Field Notes** (key item from the company after coin 2): 50% XP to the bench | P1 | Coder; Text Bot |
| B20 | XP & levels | XP curves, level 1–100 | **Missing** | DD: "levels reflect where in the story" | 4 growth curves (ours), level cap 100; trainer levels per zone in one table | P0 | Coder; Story Bot (zone level table) |
| B21 | Level-up skills | learnsets, 4 slots, learn prompt | **Designed** | SKR §3–5 (4 slots, stage pacing, evolution skills, ~30% status skills) | Use SKR as written; 60–90 skills | P0 | Coder; Character models (research owner) |
| B22 | Teachable skills (disc-style) | reusable / single-use teach items | **Designed** | SKR §2 (teachable exclusives) | **Training Reels** sold by Revival Tech, reusable (ours); field skills are taught by NPCs, not items (FS) | P1 | Coder; Text Bot |
| B23 | Skill relearning | tutor NPC | **Designed** | SKR §5 "skill memory" | **Skill Memory** in the party screen, free; no tutor needed | P1 | Coder |
| B24 | Evolution triggers | level, item, trade, friendship, time, place | **Partial** | DD: 350+ creatures with 2–3 stages; Courier = trade analogue (SP 1.8); no trigger data | Level, Feed type, Warmth stage 3, time of day, place (shrines), **Lumen Line Courier**. Cancel with B (ours) | P1 | Story Bot → Coder |
| B25 | Obedience | outsiders disobey above badge level | **Different** | SR: Warmth **never** causes disobedience | No disobedience. Over-level creatures just gain reduced XP | P1 | Coder |
| B26 | Battle AI | trainer move choice | **Missing** | – | 3 tiers: random → element-aware → switch-aware (Masters) | P1 | Coder |
| B27 | Battle-entry variant roll | (shiny is cosmetic only) | **Different** | DD §Creatures: Large, Small, Enraged, **Cosmic** (shiny), rolled on entry; SP 1.7/1.7a/1.7b approved: one variant per creature, survives evolution, not in the 450 | Large +Guard/Vitality, Small +Agility, Enraged +Might, Cosmic cosmetic + shimmer. Variant sprites missing | P1 | Character models (variant art); Coder |
| B28 | Blackout | lose money, return to centre | **Designed** | SP 7.6: return to the last Revival Point with a copay; jingle SP 4.5 | Copay = flat regional fee (ours), not % of money | P0 | Coder; Text Bot (blackout lines) |

## 3. Capture and encounters

| ID | System | Classic reference | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| C1 | Grass encounters | per-step roll in tall grass | **Partial** | Encounter layer 1/2 and `m.encounter()`; `hooks.onEncounterTile` fires per step (overworld.js ~247) but is null; maps carry `encounter_zones` with table ids (`sunmeadow_grass`) but **no table contents exist anywhere** | Tables as JSON: `{table: [{species, lv:[a,b], weight, phase?}]}` per zone; region-exclusive except common bird/bug (DD) | P0 | Coder (roll); World Design (tables) |
| C2 | Encounter method / rate | step-based rate per area | **Designed** | DD §Story plot: tick while moving → pick from region pool → roll battle trigger; tile id irrelevant | Roll per tile stepped (same thing on a grid). Rate ~1/12 per grass step (ours); run/bike same rate (MOVEMENT) | P0 | Coder |
| C3 | Cave encounters | every cave floor tile | **Partial** | Encounter layer code 2 "low rate" (OWR §6) | Cave rate ~1/30 | P1 | Coder; World Design |
| C4 | Off-grass ambush | – (no classic equivalent) | **Designed** | DD §Battle: rare outside grass and always **Enraged** | 1/400 per off-grass step outdoors, Enraged only, own intro wipe (SP 5.2) | P1 | Coder |
| C5 | Time-of-day tables | morning/day/night slots | **Partial** | Clock built (`clock.js`); no tables | `phase` filter on table rows | P1 | World Design; Coder |
| C6 | Weekday / weekly spawns | day-of-week events | **Partial** | SP 1.4 work week not approved; `lines.js` weekday never matches | Work-week calendar (Mon–Fri office, weekend market spawns) once Gary approves | P2 | Story Bot → Coder |
| C7 | Fishing | rods, water tile encounters | **Missing** | `ambient.fish_spots` are visual only (OWR) | **Angler's Line** key item (3 grades); fish only at marked spots (bobber bite timing) | P1 | World Design (fishing spots); Coder; Text Bot (fishing lines) |
| C8 | Surf encounters | water tiles | **Designed** | FS §3: Tideglide uses water tables | Note DD conflict (§9 #6): off-grass = Enraged only | P1 | Coder; World Design |
| C9 | Repel | steps without weak encounters | **Designed** | **Hush Spray** SP 7.2 (re-prompt when used up); `comfort.hush_spray` text exists | Blocks foes below lead level for N steps; re-prompt on wear-off | P1 | Coder (repel); Text Bot (wear-off) |
| C10 | Shiny-style rarity | ~1/4096 recolour | **Different** | **Cosmic** variant (SP 1.7a): shimmer jingle SP 4.5, cry tail SP 4.8. No art | Odds ours (e.g. 1/2048, better with chains, C11) | P1 | Character models (Cosmic art); Coder |
| C11 | Rustling-patch chains | radar-style shaking grass chains | **Missing** (animation Built) | Grass rustle animation built (renderer.js); no mechanic | **Lumen Shimmer**: a phone app pings a patch; chaining the same species raises Cosmic and variant odds | P2 | Coder (rustling grass) |
| C12 | Safari-style zone | limited balls / steps | **Different** | **Mirefen Count** (SP 1.10). Designed | – | P2 | Coder; World Design |
| C13 | Legendaries | static one-off | **Different** | **Legendary Guardian** (DD §Plot): triggered by company progress; win / lose / dominate, low odds | One encounter, retry after a blackout; the River motif plays | P1 | Story Bot; Coder |
| C14 | Static / scripted encounters | sleeping blockers, gifts | **Partial** | `bin_creature` → `hooks.onScriptedEncounter` (overworld.js ~675); `gate_cindervale_giant` planned (CP) | Same encounter API as C1 with a fixed species and level | P1 | Coder |
| C15 | Catch logging | seen/caught | **Missing** | `catalogue.logged` text exists | `kilindex: {seen, caught, count, minW, maxW, regions}` in save | P0 | Coder |
| C16 | Nickname on catch | name prompt | **Partial** | `catalogue.nickname_prompt`, RT number placeholder `RT-0147` (config.js) | RT number by default, nickname optional (SP 1.3) | P1 | Coder |

## 4. Party and storage

| ID | System | Classic reference | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| P1 | Party of 6 | 6 max | **Partial** | `save.party` array, lead first (save.js); no cap, no HP/level fields | Cap 6; fields `{species, lv, xp, hp, energy[], status, held, warmth, variant, rt, nickname}` | P0 | Coder |
| P2 | Party / summary screen | icons, stats, moves | **Missing** | No menu; **party icons missing** | Party screen per SP 5.4 (icons bob; Cosmic twinkles) | P0 | Coder; Character models (party icons) |
| P3 | Storage boxes / PC | box system at a terminal | **Partial** | `company_terminal` opens the **company inbox** only (overworld.js ~680); `heal_brookhollow_storage_user` NPC; SP 8.2: more boxes at Revival Point L3 | **Field Archive** on the company terminal: 8 boxes × 30 (ours) | P1 | Coder (PC storage) |
| P4 | Sell / release | release to wild | **Different** | DD §Ownership: sell to the company (goal 2000); release is the ending's theme (SR ruling B pending) | Sell = "Transfer to Revival Tech" with payout + milestone counter; release gated by ruling B | P1 | Coder; Story Bot |
| P5 | Daycare | level while away | **Different** | **Wexley's Croft** (SP 8.3): 2 slots, Warmth, level capped at the highest Master beaten. Not built | – | P1 | Coder; Text Bot (daycare) |
| P6 | Breeding / eggs | egg groups, hatch steps | **Designed** | DD: ~5 breeding-only creatures; SP 8.3 "lumen eggs" pending | Pairing table per family (ours); hatch by steps with Warmth | P1 | Story Bot (egg ruling) → Coder |
| P7 | Walking partner | following lead | **Different** – **Built** | **Trail Buddy** follower (overworld.js `follower`, SP 1.2) | – | – | – |
| P8 | Friendship / affection | hidden counter + perks | **Different** – **Partial** | **Crystal Warmth** 0–100, 4 stages, palette swap (palette.js, save.js; SP 1.1); no battle effects yet | Stage perks: endure a hit at 1 HP (once per battle), shake off status; never disobedience | P1 | Coder |
| P9 | Release | – | **Designed** | SR ruling B pending Gary | Hold until ruling B | P2 | Story Bot |

## 5. Field and traversal

| ID | System | Classic reference | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| F1 | Cut | cut small trees | **Different** | **Brushbreak** (FS §4): `thick_brush` tile to build; optional areas only | – | P1 | Coder (field moves); World Design (cuttable bushes); Gary (unlock coin) |
| F2 | Surf | cross water | **Different** | **Tideglide** (FS §3), after coin 5; code 3 is still a wall (overworld.js header) | – | P1 | Coder |
| F3 | Strength | push boulders | **Partial** / **Different** | Boulder code 5 is blocked (constants.js); boulder puzzles BFS-verified in tools (PUZZLE_PROGRESSION); **no push runtime**; pushing needs **no skill** (FS §4) | Push runtime driven by the map `puzzle` block | P1 (Greystone B1 is on the critical path, CP step 6) | Coder; World Design (boulders) |
| F4 | Rock smash | break rocks | **Different** | **Stonebreak** (FS §4) | – | P2 | Coder; World Design |
| F5 | Flash | light caves | **Different** | **Glowcall** (FS §4): vignette, never blocks | – | P2 | Coder |
| F6 | Fly | to visited towns | **Different** | **Skylift** (FS §1) + **Lumen Line** rail (FS §2); restricted cities rail-only | – | P1 | Coder |
| F7 | Waterfall | climb falls | **Missing** | – | **Tideglide II**: upstream current tiles after coin 7 (optional areas only) | P2 | Story Bot; World Design |
| F8 | Rock climb | climb rocky walls | **Missing** | – | **Ridgeline** pegs: a key item, not a skill (ours), for optional summits in Frostspire | P2 | Story Bot; World Design |
| F9 | Ice sliding | slide until blocked | **Partial** | `Col.ICE` (10) walkable but no slide (constants.js comment; EXTRA_TILES) | Slide-until-blocked in `GridMover`; add ice puzzles to the checker | P1 | Coder (ice sliding) |
| F10 | Dive | deep water | **Partial** | `Col.DEEP_WATER` (11) blocked | Late optional "Tideglide deep" or leave as scenery | P2 | Story Bot |
| F11 | Ledges | one-way hops | **Built** | `map.js` ~142, hop in `movement.js` | – | – | Coder (credited) |
| F12 | Running shoes | hold to run | **Built** / **Different** | **Trail Runners** `has_run_shoes`, hold B (overworld.js ~312; CP step 2). Run **toggle** (SP 7.1) not built | Add a toggle option | P1 (toggle) | Coder (running) |
| F13 | Bike | faster, bike paths | **Built** / **Different** | **Courier Bike**: ramps, bike-only, dismount rules (overworld.js, map.js) | – | – | – |
| F14 | Puzzle tiles (plates / switches) | leader puzzles | **Partial** | `Col.PLATE` → `hooks.onPlate` null; Fernwick Hall plate + crystal puzzle data exists (OWR §8) | Runtime from the map `puzzle` block. Needed for coin 1 | P0 | Coder; World Design |
| F15 | Roadblocks / story gates | blocker NPCs, trees | **Built** | overworld.js gates; CP §3; `tools/progression.py` checker PASS | – | – | – |
| F16 | Doors / warps / fades | – | **Built** | overworld.js warps, 180 ms fades | See conflict §9 #7 (loading screens) | – | – |
| F17 | Trainer line of sight | spotted → walk up → battle | **Missing** | `npcs.js`: trainers only turn randomly (`look`); sight lengths are written as **notes** in maps (e.g. route1 `trainer_r1_a` "sight 4 tiles") but are not a field | Promote `sight` to a numeric map field; the spark + hop + walk-up of SP 5.1; class stingers SP 4.4 | P0 | Coder (trainer sight); World Design (sight fields); Text Bot (intros) |
| F18 | Item pickups & hidden items | visible item orbs + hidden | **Partial** | Map `items[]` with `hidden:true` placed (route1, thornwood, greystone, brookhollow, mirefen); only drawn as debug markers (debug.js ~73); no pickup | Visible: a **supply satchel** prop; hidden: a soft sparkle every ~6 s within 2 tiles (SP-style hint) | P0 | Coder; World Design (hidden items); Text Bot (pickup lines) |
| F19 | Signs | readable signs | **Partial** | `signs_awaiting_world_id` (text) | Hook up the ids | P1 | World Design; Text Bot |
| F20 | Overworld weather | rain, snow, sandstorm | **Partial** | `living.js` presets via `?weather=`; storm season FS §3 designed | Weather per zone + season flag | P2 | Coder |

## 6. Economy

| ID | System | Classic reference | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| E1 | Shops | marts, uniform prices | **Partial** | `shop_int` map + `clerk` line; no buy/sell | **Revival Tech** shop UI: buy/sell, stock grows with coins | P0 | Coder; Text Bot (shop script) |
| E2 | Pricing | same price everywhere | **Different** | DD §Ownership: fixed per region, no inflation | Price table per region in one JSON | P0 | Coder; Story Bot (price table) |
| E3 | Money from battles | trainer payout | **Designed** | DD §World "level up and get gold"; gold-coin held item | Payout = base per trainer class × top level (ours); gold coin ×1.5 | P0 | Coder |
| E4 | Bag & pockets | pockets by item kind | **Designed** | SP 7.4: Care, Feeds, Gear, Crystals, Key Items, Mail & Logs + 2 hotkeys; text `comfort.bag_pockets`, `bag_sort` | – | P0 | Coder (bag pockets) |
| E5 | Healing items | potions, status heals, revive | **Designed** | DD §Items: potions restore status, energy and health | **Tonics** (HP), **Rest Drops** (energy), **Clear Salts** (status) – names via Text Bot | P0 | Coder; Text Bot |
| E6 | Berries / vitamins | held berries, stat boosters | **Different** | **Feed** (DD §Plot: growth, status cure, temp boost); feed garden SP 1.5 | Feed = berries + vitamins in one system | P1 | Coder |
| E7 | Healing centre | free full heal | **Partial** | Healer dialog sets `healedAt` only (overworld.js ~647); **Revival Point** perks SP 8.2 | Full heal of HP / energy / status, sets respawn | P0 | Coder (heal counter); Text Bot (healer script) |
| E8 | PC | storage + item box | **Different** – **Partial** | Company inbox built (overworld.js `openInbox`) | Add Field Archive (P3) + item storage on the same terminal | P1 | Coder |
| E9 | Key items | key-item pocket | **Partial** | `has_*` flags act as key items; no pocket | Show flags as Key Items | P1 | Coder |
| E10 | Employee ID & Benefits Board | – (no classic analogue) | **Different** | DD §Mechanics: tasks level up the ID; points buy perks (free fast travel, discounts, payouts, crystal odds, damage, XP, HP, walk speed, energy, restricted access) | Keep; cap perks so the game is "not too easy" (DD) | P1 | Story Bot → Coder |

## 7. Progression

| ID | System | Classic reference | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| G1 | 8 badges / leaders | leader halls, puzzle + helpers | **Different** – **Partial** | **Challenge coins** from 8 Masters (CP §2; `beat_master_*`); `fernwick_hall_int` with helpers built, battle missing | Fernwick first (P0) | P0 (Fernwick) / P1 | Coder; Story Bot (teams) |
| G2 | Final-four gauntlet | no-heal run | **Different** | **Battle Masters arena** (DD §World: defeat all without leaving or healing); `gate_aurelith_arena` planned | – | P1 | Story Bot; Coder; World Design |
| G3 | Rival | recurring battles | **Different** | **Ron** (DD §Story plot: co-op **or** rival choice); `ron_battle_openers` text; CP step 2 rival battle 1 | Co-op mode: Ron joins doubles (B18) and shares items; rival mode: battles per city | P0 (battle 1) | Coder; Story Bot (co-op ruling) |
| G4 | Trainer rematches | phone / calendar rematches | **Different** | SP 1.11 rematch texts via the phone | – | P2 | Coder; Text Bot |
| G5 | Legendaries | – | see C13 | | | | |
| G6 | Post-game | new area, harder trainers | **Designed** | SR ruling B pending (crystal-release ending, post-game clear capture) | Hold until ruling B | P2 | Story Bot |
| G7 | Battle facility | streak tower | **Different** | **Proving Floor** (SP 1.11) | – | P2 | Coder |
| G8 | Villain team | team + hideouts | **Different** | Revival Tech's dark undertone + opposition groups (DD §Dark undertones) | – | P1 | Story Bot |
| G9 | Trainer level curve | levels track progress | **Designed** | DD §World | One zone→level table drives trainers, wild tables and Croft cap | P1 | Story Bot; Coder |
| G10 | Side quests | – | **Designed** | DD §Story plot; SP 8.5 | – | P2 | Story Bot; Text Bot |
| G11 | Trainer intros / losses | pre-battle lines, payout line | **Partial** | `battle_lost` / `battle_won` fields in text, read by `talk()` (overworld.js ~635) | Add an intro on being spotted + a money line | P0 | Text Bot (intros and losses) |
| G12 | Starter choice | 3 starters | **Partial** | 9 starter sprites (pixel README); lead via `?lead=` param only | Starter choice in the lab (`lab_brookhollow`) | P0 | Coder; Story Bot (which 3) |
| G13 | Player character choice | boy/girl | **Partial** | DD: one male or one female; Cal + Mira sprites; `config.playerName: 'Cal'` hard-coded | New-game choice screen | P1 | Coder |

## 8. Meta

| ID | System | Classic reference | Status | Evidence | Kilumen proposal / mapping | Pri | Owner |
|---|---|---|---|---|---|---|---|
| M1 | Creature index | seen/caught, data pages | **Different** | **Kilindex** (DD: counts, biggest/smallest weights, regions, types, skills); `catalogue.kilindex_labels`; RT-#### numbers | Minimal log in the slice (C15); full pages later; rating lines from Text Bot | P0 (log) / P1 | Coder; Text Bot (dex rating) |
| M2 | Index rewards | completion prizes | **Different** | Company catch milestones 1,3,5,10,20,30,50,75,100 (DD §Plot); sell goal 2000; Kilindex jingle every 25 (SP 4.5) | – | P1 | Coder; Story Bot (payouts) |
| M3 | Trading | link trade + in-game trades | **Different** | Hidden trades T1–T6 (SP 8.4); **Lumen Line Courier** (SP 1.8) | – | P1 | Coder; Text Bot |
| M4 | Link battles | local / online | **Different** | **Concord Spire** (SP 8.6): level-50 normalisation, server-authoritative | – | P2 | Coder |
| M5 | Day / night | real-time clock | **Different** – **Built** | `clock.js`: 1 real min = 1 game hour, 4 phases, grades | – | – | – |
| M6 | Weekly events | weekday events | **Partial** | see C6 | – | P2 | Story Bot → Coder |
| M7 | Friendship | – | see P8 | | | | |
| M8 | Watch-style apps | wrist apps | **Different** | **Smartphone** (DD §Mechanics: quests, company tasks, mini map, team, inventory, stat tree; SP 7.3). Not built | Phone menu = the main menu (team, pack, Kilindex, tasks, map, options) | P1 | Coder |
| M9 | Save | manual save + one slot | **Built** | `save.js`: localStorage + `.bak`, autosave on change, warp, 60 s and pagehide | Add a "Saved" toast / save lines | P0 (lines) | Text Bot (save) |
| M10 | Options | text speed, battle style, sound | **Partial** | `comfort.text_speed` text; only URL params today | Options in the phone | P1 | Coder |
| M11 | Accessibility | – | **Partial** | Touch D-pad + gamepad (`input.js`); `reducedMotion` (`living.js`); SP 7 list | Remappable keys, colour-safe element icons, mute text blips | P1 | Coder |
| M12 | Contests | – | **Different** | **Weigh-In** (SP 1.6) | – | P2 | Coder |
| M13 | Secret base | – | **Different** | **Field Camps** (SP 1.9) | – | P2 | Coder; World Design |
| M14 | Tutorial | catching demo | **Different** | **Learning Portal** + SP 8.1 tutorial (with the type-matchup lesson) | – | P1 | Text Bot; Coder |
| M15 | Audio | music, jingles, cries | **Missing** | SP 4.1: "there is no audio code yet"; full brief in SP 4.x | WebAudio manager per SP 4.1 | P1 | Coder (engine); composer not assigned |

---

## 9. Design doc vs. current build: conflicts to raise with Gary

1. **Healing vs. potions.** DD §Battle says energy only restores by resting at a treatment centre. DD §Items says healing potions "restore energy". Pick one, or limit potions to a partial energy top-up. The build has no heal effect at all yet (E7).
2. **Masters count.** DD §World says the 13 zones "house our Masters", then "8 battle masters, each master of the 15". The build/CP uses **8 town Masters** (`beat_master_*`), and **Brookhollow, Aurelith and the biomes** have no coin Master, plus an arena of **Battle Masters** (number unspecified). How many Battle Masters fight in the arena needs a ruling.
3. **Encounter method.** DD says the tile "has zero meaning" and the roll is a tick while moving. The build fires a per-*tile* hook and maps carry per-rect `encounter_zones` tables. Functionally compatible (per step = per movement tick), but tables are per rect, not per region. Also route1's tables are named `sunmeadow_grass`, while **Sunmeadow is a separate later zone** in CP. Rename, or confirm they share a pool.
4. **Paid quick travel vs. free Skylift.** DD §Mechanics wants paid stations over land and over water, and the Benefits Board perk "free fast travel" implies travel normally costs money. The build designs **Skylift** (a free fly-style skill, FS §1) and the Lumen Line (pass, not per-ride fare). There is no water station. Suggest: Lumen Line and a ferry charge per ride (the perk makes them free); Skylift stays a skill, or becomes a paid service.
5. **Phone vs. PC.** DD puts team, inventory, map and tasks on the **smartphone**. The build uses the **company terminal/PC inbox** for mail. Not a contradiction, but the main menu should be the phone (M8).
6. **Off-grass encounters.** DD: outside grass encounters are rare and **always Enraged**. FS §3 gives Tideglide water its own normal table, and caves use encounter code 2. This needs a ruling: are water and caves "grass-equivalent" zones?
7. **Loading screens.** DD: "Loading screens are a must". The build uses 180 ms fades (`constants.js`). Fine for doors; a loading card may be wanted between zones / rail rides.
8. **MC visibility.** DD: the MC "only shows in cutscenes or battle; open world models are squished". The build's Cal chibi is a squished overworld model, so this is consistent. But the male/female **choice** isn't built (G13).
9. **Ron mode.** DD: co-op **or** friendly-rival choice. CP/build only has the rival track (`beat_rival_ron_1`). Co-op needs a ruling (G3).
10. **Variants timing.** DD rolls variant buffs "on entry to battle". SP 1.7 approves one variant per creature that survives evolution (i.e. a stored trait). Clarify: rolled on encounter and kept after capture (recommended).
11. **Rival battle without an engine.** CP step 2 awards `has_run_shoes` "win or lose". Today `onBattle` is null, so every trainer counts as a win (overworld.js ~640). Placeholder behaviour only; flag it in QA.
12. **Wording.** DD §Plan: the hooded trainer "stays hooded to make it bisexual use". This is almost certainly meant as **"unisex"** (one model for any gender). The build's `trainer_hooded` kind follows that reading. Confirm with Gary; no change needed.
13. **Pending rulings that are system changes:** SR ruling B (crystal release / post-game clear capture) affects P4, P9 and G6. SP 8.2c flagged a possible jingle clash (audio, not mechanics).

## 10. Legal and originality guardrails

We study Pokémon (Gens 1–6) **for structure and feel only**.
- **No copied names.** This covers moves, items, creatures, places, abilities and series terms: the series' ball, machine and dex names, "gym", the final-four name, and status names in their exact form. Every proposal above uses generic or original Kilumen terms. Proposed names (Temperament, Clean Strike, Training Reels, Field Notes, Field Archive, Angler's Line, Lumen Shimmer, Tonics, Rest Drops, Clear Salts, Scorched/Chilled/Drowsy/Jolted/Tainted, Ridgeline) are **drafts**. Text Bot owns final names and runs a web clash check, as in `_proposed_names`.
- **No sprites, text, music, sound or UI layouts** copied or traced. The battle and menu layouts must be our own: SP 5.x specifies Kilumen-specific feedback, e.g. the violet spark instead of a "!".
- **No proprietary number tables.** That means no copying base stats, type-chart cells, catch rates, XP curves, encounter-slot percentages or damage constants. **General game-design formulas** (e.g. damage scales with level × power × attack/defence; catch odds rise as HP falls) may be adapted, but **every constant and table is ours**, tuned to Kilumen's own level curve and kept in `design/_work/`.
- **Mechanics themselves are not owned** (turn-based battles, elements, parties of six, day/night). Expression is. When in doubt, change the presentation and name, and record the source in the doc.
- The DD's own originality hooks (Dominance crystal, energy meter, company story, Warmth, RT numbers, variants, Benefits Board) are our differentiators. Lean on them rather than adding more classic look-alikes.

## 11. How to keep this file current
- When a row changes state, update the Status and Evidence (file + line) here, and the detail in the owner's own audit.
- Re-count the summary table with this command. It counts the first bold status in the Status column of each ID row; "see X" rows print blank and are not counted:
  `awk -F'|' '/^\| [BCPFEGM][0-9]+ \|/{s=$5; match(s,/\*\*(Built|Partial|Designed|Missing|Different)\*\*/); print substr(s,RSTART,RLENGTH)}' design/MECHANICS_PARITY.md | sort | uniq -c`
