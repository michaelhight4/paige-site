# Battle engine evaluation and spike (Kilumen)

*Written Thursday Oct 22, 2026 (America/Chicago) on branch `dev/overworld-v1`. LOCAL ONLY: nothing committed, pushed or deployed.*
*Pokémon is a structure reference only. No Pokémon names, creature/move data, text or art went into the game; the shipped
bundle is scanned for upstream names on every `npm test`.*

## 1. Audit: battle code before this pass
- The only battle was the **scripted battle shell** in `src/ui/ui.js` `scr_battle()` (lines 670–795 before this pass; backup
  `/tmp/kil_battle_backup/src/ui/ui.js`). It is a UI demo, not a rules engine:
  - damage = `power / 6 + random × 3`, using `Math.random`, so it is not seeded or replayable;
  - the foe picks one of its first two skills at random;
  - no element chart, accuracy, priority, status, switching or catch;
  - Pack and Team only print "arrives in the full battle pass"; Run always works;
  - the level-up box shows fixed "+3"-style numbers.
- Hooks: `scene.hooks.onBattle` (trainer battles, `src/overworld/overworld.js` line 686, which defaults to a win when no
  hook is set). Wild grass uses `hooks.onEncounterTile` (line 271); **no wild battle is opened from the overworld yet**.
- Data available: 16 creatures in `SPECIES` and `PLACEHOLDER_SKILLS` in `src/ui/data.js`, and item names in
  `text/overworld_lines.json` `system_item_catalogue`. There are no stat sheets and no element chart
  (`design/MECHANICS_PARITY.md` B2/B3/B6).

## 2. Candidates (licences checked from each repo's LICENSE file; shallow clones in `/tmp/battle_eval/`)
| Candidate | Licence (file) | Commit checked | Fit |
|---|---|---|---|
| Pokémon Showdown simulator, https://github.com/smogon/pokemon-showdown | MIT, "Copyright (c) 2011-2026 Guangcong Luo and other contributors" | 1636bf6 (2026-10-22) | Most complete turn engine: priority, speed, accuracy, crit, status, switching, forced switches, seeded PRNG, text protocol, input log replay. Server-runnable. Ships huge franchise data that must be stripped. |
| **pkmn/ps `@pkmn/sim`**, https://github.com/pkmn/ps, https://www.npmjs.com/package/@pkmn/sim | MIT, "Copyright (c) 2020-2026 pkmn contributors" (+ Showdown's MIT) | 4fec887 (2026-06-18), 0.10.11 | **Chosen.** The same simulator repackaged as a library: data is injectable, and it has no server or chat code. Easiest to strip down to logic only. |
| pkmn/engine, https://github.com/pkmn/engine | MIT, "Copyright (c) 2021-2026 pkmn contributors" | 4b5d786 (2026-10-19) | Zig and very fast, but its README says "under heavy development" with breaking changes, and it hard-codes specific generations' mechanics. Not data-driven enough for our own rules. |
| boardgame.io, https://github.com/boardgameio/boardgame.io | MIT, "Copyright (c) 2017 The boardgame.io Authors." | 5e9a2c9 (2026-08-10) | Turn and multiplayer framework with no battle rules. It could host PvP, but we would still write the whole battle. |
| Colyseus, https://github.com/colyseus/colyseus | MIT, "Copyright (c) 2015-2026 Endel Dreyer" | 307a1b0 (2026-10-22) | Realtime room server. It is not a battle engine, and it needs its own server (we plan Supabase). |
| abyss-tamer-engine, https://github.com/0x-zer0/abyss-tamer-engine | MIT, "Copyright (c) 2026 Abyss Tamer" | a518657 (2026-05-21) | Pure deterministic `dispatch()` creature battler (README). Built around its own roguelike rules (three lanes, permadeath, mutations); young project. |
| FAUNWILD, https://github.com/Meliwat/faunwild | MIT, "Copyright (c) 2026 FAUNWILD contributors" | 1994f82 (2026-06-13) | Whole game as a single HTML file, not a reusable engine. |
| Monster Tamer, https://github.com/devshareacademy/monster-tamer | MIT, "Copyright (c) 2024 Dev Share Academy" | a964bba (2025-12-28) | Phaser 3 tutorial game; its battle is tied to Phaser scenes. Reference only. |
| **Tuxemon**, https://github.com/Tuxemon/Tuxemon | **GPL-3.0 (FLAG)** (LICENSE in repo) | not cloned | Copyleft: shipping it would force GPL on Kilumen. **Do not use.** |
| **Pokémon Essentials**, https://github.com/Maruno17/pokemon-essentials | **CC BY-NC-SA 4.0 (FLAG)**, non-commercial (per its LICENSE; from search, not cloned) | not cloned | Non-commercial and RPG Maker/Ruby. **Do not use.** |
| PokeClicker (Neb-RS fork), https://github.com/Neb-RS/PokeClicker | MIT, "Copyright (c) 2026 Neb" (this fork's LICENSE only) | not cloned | Idle clicker, not a turn battle. Only this fork's licence was seen. Not used. |

No unlicensed code was used. Search snippets were checked against the LICENSE files cloned above; the Tuxemon,
Essentials and PokeClicker rows come from their LICENSE pages (search result pages, not clones).

## 3. What was built (spike → working fork)
- `vendor/battle-sim/`: data-free fork of `@pkmn/sim` 0.10.11 (TypeScript). It keeps `LICENSE` and `LICENSE.pkmn` and adds
  `CHANGES.md` (every change) and `README.md`. Built by `node tools/build_battle_engine.mjs [--check]` into
  `src/battle/engine.js`, which carries both licences in its banner.
- `src/battle/data/`: Kilumen creatures, 24 elements, PLACEHOLDER chart, skills, rules, statuses and items. Every number
  is a placeholder; see `src/battle/data/README.md`.
- `src/battle/battle.js` (`KilumenBattle`): game-facing wrapper.
  - `request()`: state, skills with energy, team, bag.
  - `choose()`: `move N`, `switch N`, `item ID`, `crystal ID`, `retreat`.
  - `drain()`: protocol lines.
  - `result()`: outcome win/lose/retreat/caught, team written back, bag, caught creature, turns, seed, input log.
  - Simple seeded foe AI.
- `src/battle/ui_sd.js`: battle screen on the existing shell markup and CSS. It has Skills (element and energy, with an
  overuse confirm), Pack (items, crystals greyed in trainer battles), Team (switch, forced switch) and Retreat, plus
  animations, damage numbers and the level-up box.
- **Flag:** `?battle=sd` (`src/ui/ui.js` mountUI, about 12 lines). The scripted shell stays the default. With the flag,
  trainer battles (`hooks.onBattle`) resolve won/lost from the engine. `?battle=sd&ui=battle` opens a wild test battle
  (`&trainer=1` for a trainer, `&bseed=a,b,c,d` for a fixed seed).
- Kilumen rules: elements with sub-element, Affinity, Clean Strike, Energy with overuse, Warmth endure, Variants, Lineage
  stats, Scorched/Drowsy, Retreat odds, Crystal catch with shakes, XP and mid-battle level-up, party cap 6. Protocol
  lines: `-overuse`, `-kretreat`, `-kcrystal`, `-kitem`, `-kxp`, `-klevelup`, `kend`.
  - The engine now emits catch/XP/level-up events itself. `docs/systems_open_source_eval.md` (another worker's doc) says
    Showdown has none; that is true upstream, but this fork adds them (`vendor/battle-sim/sim/kilumen.ts`).
- Battle results go to `ui.lastBattle` and the in-memory bag only. **Nothing is written to the save yet** (Gary call).

## 4. Size
| Path | Bytes | gzip (-9) |
|---|---|---|
| `src/battle/engine.js` | 204,222 | 57,606 (build tool's zlib reports 57,725) |
| `battle.js` + `ui_sd.js` + `data/*.js` | 35,154 | 14,394 |
| **Total fetched only with `?battle=sd`** | **239,376** | **72,000** |
| Default game (no flag): `ui.js` +947 B of source, `ui.css` +451 B | ~1.4 KB | — |
For comparison, `ui.js` alone is 64,346 B (19,013 gzip). The engine is a dynamic `import()`, so the default game fetches
none of it.

## 5. Tests (Oct 22, 2026, ~10:00–10:35 PM CT)
- `npm test`: 67 pass, 1 fail. The failure is `tests/batch3.test.mjs` "club flyer wall" (`club_note` vs `club_note_slot`),
  which is unrelated: `club_int.json` and `overworld.js` were changed by another worker at 22:12, and batch3 imports no
  battle or UI code. `tests/battle.test.mjs` passes 15/15:
  - element matchups; priority; status; switching; full wild KO; full trainer KO (forced switch, ×1.5 XP, no
    retreat/crystal); crystal catch; retreat; items; overuse; Warmth; levelling; party cap; determinism (same seed + same
    inputs = same log);
  - a deny scan of the shipped bundle against salted hashes of upstream names (`tests/fixtures/battle_deny_hashes.json`).
- `soul.test`: 7 pass, 2 fail (the 2 known failures, same as baseline). `python3 tools/run.py --check`: exit 0, 0 problems.
- `tests/battle_touch_e2e.mjs` (Playwright, real touch on phones):
  - Profiles: desktop Chromium 1920x1080, Pixel 7 landscape, WebKit iPhone 14 landscape, WebKit 844x390 @3x = 2532x1170.
  - Each profile checks: 4 commands; tap targets ≥ 44 px; Team plus switch; Pack; back; Skills energy; a full wild KO;
    crystal plus retreat; the trainer refusing retreat, fighting to the end and sending out its 2nd creature; no console
    errors.
  - Result (Oct 22, 2026, ~10:20 PM CT): desktop, phone3x and pixel7 all passed in the full run; iphone14 failed 1 of 17 ("elementHandle.tap: Element is not attached to the DOM", a harness flake on a re-rendering menu). After the tap helper switched to a locator, the iphone14 rerun passed 17/17. Shots are in `shots/battle_engine/` with `report.json` (full run) and `report_iphone14_rerun.json`.
- `tests/touch_e2e.mjs` regression after the touchpad CSS fix: chromium Pixel 7 39/39, webkit iPhone 14 39/39, webkit iPhone 15 39/39 (all landscape, exit 0). This matches the 39/39 baseline.

## 6. Fix found on the way (affects the old shell too)
On phones the touchpad's transparent `.dpad`/`.btns` wrappers covered the battle command grid. Taps on Pack, Retreat and
the left list column were swallowed (Pixel 7 and iPhone 14). `src/ui/ui.css` now sets `pointer-events: none` on the
wrappers while `body.ui-open` is set, and only the buttons themselves take touches.

## 7. PvP (Supabase) and Unity
- **PvP:** the engine is pure and deterministic (seed + choices → identical log; tested). Plan: a Supabase Edge Function
  (Deno, ESM) imports `engine.js` and the data, and stores `{seed, team snapshots, inputLog}` per match in a table. Clients
  submit choices and the function replays them and returns the new protocol lines (server-authoritative; clients never
  roll dice). This needs a 2-human request flow (the wrapper currently has one human against the AI) and hidden-info
  filtering (`extractChannelMessages` is exported). Not built.
- **Unity:** two routes. (a) Keep the JS engine as the referee and run it in Unity through a JS runtime (e.g. Jint) or on
  the server only. (b) Port to C#: the fork is about 15.7k lines of TS. Port `kilumen.ts` plus the core loop, and use the
  JS test logs as golden files (same seed and inputs must give the same log). Data stays JSON-shaped (`src/battle/data`).

## 8. Needs Gary (calls)
1. Element chart (only 6 placeholder rows) and the sub-element rule (main row plus at most one step from the sub-element).
2. Stat bases (flat 45/60/80 by stage), Lineage range 0–7, Variant multipliers, physical/special split by element.
3. Catch, retreat and XP formulas and numbers; whether XP ×1.5 for trainers is floored; the XP curve (0.8 × L³).
4. Warmth endure threshold (200) and whether endure belongs in battle at all.
5. Skill effects, priorities and accuracy (all placeholder) and the energy-overuse penalty.
6. 16 creatures exist in `SPECIES`; the brief mentioned 21.
7. Temperament, Focus stages and field conditions (Rain/Ashfall/Fog/Snow) are not built (the hook is kept).
8. Pep Remedy (`energy_tonic`) waits on the `potions_vs_rest` ruling.
9. Trainer rosters (currently a 2-creature placeholder) and wild encounters (no overworld hook opens a wild battle yet).
10. Should battle results (HP, energy, XP, level, catches, bag) be written to the save? They are in memory only now.
11. The required MIT notice contains "pokemonshowdown.com" (upstream copyright line). It must stay in
    `THIRD_PARTY_LICENSES` and the bundle banner, but it is never shown in game.
12. The deny-scan allowlist of generic English words (e.g. element words that also exist upstream) is in
    `tests/battle.test.mjs`.
13. Party levels come from the placeholder `statsFor()`; the party has no stored level or HP yet.
14. Text Bot: the `system_battle.*` keys listed in `src/battle/data/README.md`.
