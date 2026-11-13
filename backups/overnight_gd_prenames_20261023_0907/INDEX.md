# Overnight GD pass: design data (DRAFT)

**Status: DRAFT, not signed off by Gary.** Last regenerated 2026-10-23 02:19 CT. Generator lives outside the repo at `/workspace/gd_gen/` (`python3 run.py && python3 index.py`). Re-run it when DEX_450.json grows: `TODO_ROSTER:<type>` slots and stage checks resolve automatically.

## Counts

- Maps covered: **25 / 25** in the story plan (13 zones + 12 routes; world_layout has 14 routes, Tidewater→Lanternport has no entry and is treated as a sea lane inside tidewater_coast).
- Files: 84 JSON (trainers_/encounters_/items_ × 25, halls/ × 8, shops.json). All pass `python -m json.tool`; forbidden-word grep clean.
- Trainers: **102** on maps (incl. 6 Ron battles + 4 Aurelith arena Battle Masters) + **34** in halls (8 Masters + 26 hall trainers) = **136**.
- Halls: **8 / 8** (Master team, puzzle, hall trainers, coin + reward).
- Shops: **10** regions in shops.json (Brookhollow + Fernwick copied unchanged with proposed extra tiers).
- Field pickups: **85** new (34 hidden) + 5 gifts; 31 existing placed items referenced, not duplicated.
- DEX_450 (meta: "450 of 450 written (COMPLETE: 450 of 450)"; 450 entries read): 246 roster slots filled from the dex, 92 trainer creatures swapped for same-type dex species (74 starter-line creatures on non-Ron trainers; the rest were repeats inside one team or species placed before their dex zone), 43 starter-line wild slots swapped, 1 stage fix(es) by evolution level. The full swap log is in `/workspace/gd_gen/dexlog.json`. **TODO_ROSTER left: 1** (types the dex does not cover yet at that point).
- Distinct dex species used: 220 / 450.

## Files in story order

| # | Map | Kind | Built? | Story step | Trainers | New pickups | Existing items | Band | Trainer levels |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `brookhollow` | town | built | 0 (start) | 0 | 0 | 4 | - | - |
| 2 | `route1` | route | built | 1 | 3 | 0 | 6 | wild 2-6, trainers 4-6 | 4-6 |
| 3 | `fernwick` | town | built | 2-3 | 1 | 0 | 3 | Ron 1 L6; hall see halls/fernwick.json | 6-6 |
| 4 | `thornwood` | biome | built | after coin 1 (optional) / crossed at step 6 | 5 | 0 | 8 | wild 9-13, trainers 10-13 | 10-13 |
| 5 | `greystone_caverns` | biome (cave) | partial (entrance + B1 built; B2 planned) | after coin 1 (optional, open), crossed at step 6 to Frostspire pass | 5 | 3 | 7 | PROPOSED entrance 12-16, B1 14-18, B2 (planned) 24-28 | 14-28 |
| 6 | `route_brookhollow_aurelith` | route | to_come | 4 | 6 | 6 | 0 | wild 12-16, trainers 13-17 | 13-17 |
| 7 | `aurelith` | city (rail-only, arena) | to_come | 4 (pass through, arena sealed) / 11+ finale | 5 | 3 | 0 | finale Ron 6 L62; arena 56-64 (count TBD) | 57-64 |
| 8 | `route_saltmere_aurelith` | route | to_come | 4-5 | 6 | 5 | 0 | wild 15-18, trainers 16-19 | 16-19 |
| 9 | `saltmere` | town | to_come | 5 (coin 2, Courier Bike) | 1 | 3 | 0 | Ron 2 L20; hall see halls/saltmere.json | 17-20 |
| 10 | `route_thornwood_revival` | route | to_come | 6 | 7 | 6 | 0 | wild 20-24, trainers 21-25 | 21-25 |
| 11 | `revival_heights` | city (rail-only, RT HQ) | to_come | 6 (coin 3, Lumen Line Pass) | 2 | 2 | 0 | Ron 3 L27; hall see halls/revival_heights.json | 24-27 |
| 12 | `route_revival_saltmere` | route (shortcut, opened from inside) | to_come | after coin 3 | 4 | 3 | 0 | wild 26-29, trainers 27-30 | 27-30 |
| 13 | `route_greystone_frostspire` | route (pass) | to_come | 6->7 | 6 | 4 | 0 | wild 27-31, trainers 28-31, Ron 4 L32 | 28-32 |
| 14 | `frostspire` | biome (snow peaks) | to_come | 7 (coin 4, Skylift) | 4 | 5 | 0 | wild 29-33, trainers 30-33; hall see halls/frostspire.json | 31-33 |
| 15 | `sunmeadow_fields` | biome (meadow; Croft) | partial (route1 strip built; main meadow to come) | 8 | 6 | 6 | 0 | wild 30-34, trainers 31-35 | 31-35 |
| 16 | `route_revival_sunmeadow` | route (crystal field) | to_come | 8 (alt entry) | 3 | 2 | 0 | wild 31-34, trainers 32-34 | 32-34 |
| 17 | `route_sunmeadow_mirefen` | route | to_come | 8 | 5 | 4 | 0 | wild 32-35, trainers 33-36 | 33-36 |
| 18 | `route_saltmere_mirefen` | route (causeway) | to_come | 8 (alt entry) | 3 | 3 | 0 | wild 32-35, trainers 33-35 | 33-35 |
| 19 | `mirefen` | biome (swamp) | partial (mirefen_bog built) | 8 (coin 5, Tideglide; storm season starts) | 5 | 3 | 3 | wild 33-39 (existing), trainers 35-38; hall see halls/mirefen.json | 35-38 |
| 20 | `route_brookhollow_tidewater` | route (coast road, storm-flooded) | to_come | 9 | 6 | 6 | 0 | wild 38-42, trainers 39-43 | 39-43 |
| 21 | `tidewater_coast` | biome (coast/sea) | to_come | 9 (coin 6) | 6 | 6 | 0 | wild 40-45, trainers 41-45; hall see halls/tidewater_coast.json | 41-45 |
| 22 | `lanternport` | city (port, rail) | to_come | 10 (coin 7) | 2 | 4 | 0 | Ron 5 L47; hall see halls/lanternport.json | 43-47 |
| 23 | `route_fernwick_lanternport` | route (tide-lock shortcut home) | to_come | after coin 7 | 4 | 3 | 0 | wild 44-47, trainers 45-47 | 45-47 |
| 24 | `route_aurelith_cindervale` | route (volcanic road) | to_come | 11 | 6 | 5 | 0 | wild 46-50, trainers 47-51 | 47-51 |
| 25 | `cindervale` | town (volcano) | to_come | 11 (coin 8 -> all_badges) | 1 | 3 | 0 | hall see halls/cindervale.json | 50-51 |

Each map has `trainers_<map>.json`, `encounters_<map>.json`, `items_<map>.json`. Halls: `halls/<zone>.json`. Shops: `shops.json`.

## Level curve

| Coin | Hall | Master (suggested) | Element | Team (species L) | Ace | Prize | Coin name (suggested) |
|---|---|---|---|---|---|---|---|
| 1 | fernwick | Oswin Marl | earth | nibbin 10, pebblant 12 | 12 | 1440 | Loam Coin |
| 2 | saltmere | Nerys Bryde | water | quaymouser 18, polypip 19, spratwyrm 21 | 21 | 2520 | Brine Coin |
| 3 | revival_heights | Cassia Lume | light | halovy 25, gildfinch 26, fleecelight 26, lampwick 28 | 28 | 3360 | Prism Coin |
| 4 | frostspire | Hale Corrie | bird + wind | sailquill 31, highkite 32, pouchbill 33, gildfinch 35 | 35 | 4200 | Aerie Coin |
| 5 | mirefen | Wenna Peat | swamp | mirewump 37, silteel 37, gloamtick 38, mudwhisk 38, bulrusher 40 | 40 | 4800 | Reed Coin |
| 6 | tidewater_coast | Jory Swell | sea | bulwarkrab 43, kelpstrider 43, spraytern 44, galepetrel 44, hullwhale 46 | 46 | 5520 | Undertow Coin |
| 7 | lanternport | Delphine Orrin | spirit + ghost | gloamtick 47, runeskein 47, mournhorn 48, bleachghast 48, foamkin 50 | 50 | 6000 | Beacon Coin |
| 8 | cindervale | Brannock Fell | fire + magma | slagrook 51, sparkplume 51, charlurcher 52, kilnowl 53, embermink 53, glyphforge 55 | 55 | 6600 | Forge Coin |

Starters L5 → Route 1 wild 2-6 / trainers 4-6 → Ron 1 L6 → Master 1 ace 12 → Ron 2 L20 → Master 2 ace 21 → Ron 3 L27 → Master 3 ace 28 → Ron 4 L32 (Frostspire pass) → Master 4 ace 35 → Master 5 ace 40 → Master 6 ace 46 → Ron 5 L47 → Master 7 ace 50 → Master 8 ace 55 (6 creatures) → Ron 6 L62 + arena Battle Masters 57-64.

Prize = class base × highest level in team (`awardBattleMoney`). Existing bases kept; new class bases are proposals in shops.json `proposed_trainer_classes` (code falls back to 40 if not added).

## What is left

- 1 `TODO_ROSTER` slots (god-type legend in the arena, a sea fishing slot on the east road) until the dex covers them. Later zones (Mirefen onward) mostly use the dex entries that exist so far; re-run when the dex reaches those zones.
- Dex species not yet placed in any of my tables (by first zone; most early-zone ones belong in the existing encounters.json tables that I did not touch): route1 18; brookhollow 2; fernwick 15; thornwood 22; route_east 9; aurelith 5; saltmere 8; route_revival 10; revival_heights 4; greystone 12; frostspire_pass 9; frostspire 8; route1_east 6; sunmeadow 8; mirefen_bog 11; coast_road 4; tidewater_coast 10; lanternport 10; cindervale_road 7; cindervale 11; postgame 41.
- Cindervale Master repeats slagrook (only a few fire/magma dex entries exist so far); re-run after the dex fills Cindervale.
- Text Bot: every `text_ref` (trainer lines, Master speeches, Ron bin lines), class display names, coin names.
- Coder: add proposed item ids + class bases if approved; hall puzzle mechanics for halls 2-8; hidden-item flags.
- Map Bot: placement hints for pickups/trainers on unbuilt maps are suggestions only.

## Open questions for Gary

- Greystone wild band: existing `greystone_glowfern` is L20-27 but Greystone is reachable right after coin 1. Proposed re-band 12-18 (B2 track 24-28 for revisit).
- Master elements and names for coins 2-8 are proposals (only Fernwick = Earth is in the docs).
- Master count: 8 coins + arena (4 Battle Masters + Ron 6) as drafted, vs a 15-Master idea in some notes. Arena size?
- Ron: 6 battles. Is Ron 4 (Frostspire pass) optional? Ron teams use a placeholder starter triangle (tumbloam→Ron gets cindrip line, etc.) until the element chart (B6) is final.
- Tidewater→Lanternport has no route in world_layout: treated as a sea lane inside tidewater_coast. Add a route?
- Biome stops (Frostspire, Mirefen, Tidewater) got small shop stalls so each coin stop has a shop. OK?
- Proposed new items + prices: tonic_max 1200, tonic_full 2500, revive_draught 1500, dominance_crystal_hi 1200, hush_spray 350, clear_tea 600. Proposed class bases (angler 35 … battle_master 150).
- Fishing/water encounters assume a water method (Tideglide); a rod system is not confirmed.
- Starter lines: I removed them from wild tables outside Brookhollow and from ordinary trainers (Ron keeps his). Keep starters exclusive?
- Dex places runeskein and mirewump at Mirefen; my earlier uses on prior maps were swapped to same-type dex species. Confirm.
- Evolution levels taken from DEX_450 (starters 16/32). Fossil / Dawn Shard evolutions treated as ~L25 for trainers and never wild.
- Coin names (Loam, Brine, Prism, Aerie, Reed, Undertow, Beacon, Forge) need a web clash check.
- Obedience caps per coin (traded creatures) not drafted.
- `mirefen_islet_item` in the existing map data is TBD; I left it alone.
- Is natural fog or mist OK as weather and in creature names (mistmoth, fogcrane), or does the no-smoking rule cover it too? The checklist currently bans smoke/haze/fog; Mirefen hall was switched to a darkness puzzle meanwhile.
- Trainer names TBD_NAME_1-4 are neutral placeholders (Pell, Teo, Quill and Sorrel clash with the missing field team, per Story Bot); Gary to name them; Text Bot proposes Sable, Ambrose, Lyle and Garrick. Display classes renamed per Text Bot: diver is Reef Swimmer, fogwalker is Bog Walker (ids unchanged). Names Pip, Tam, Wren, Odo, Bea and Ines repeat once each; fine as placeholders until Gary names trainers. The Lanternport Master is Delphine Orrin per Story Bot (Vane stays a catalogue number).
