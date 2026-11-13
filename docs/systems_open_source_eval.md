# Kilumen systems audit, open-source evaluation, and company / quest design

*Research and design only. No game code, `src/`, battle code or `vendor/` was changed. Written Thursday Oct 22, 2026 (America/Chicago) on branch `dev/overworld-v1`. Local only: nothing was pushed or deployed.*

**Source of truth.** Gary's design doc `Kilumen_design_doc.pdf` (**DD**) wins over everything here. It was read in full with `pdftotext`. Section tags such as **[DD §Mechanics]** cite it directly. Other repo sources are cited as **[SP x.y]** for `design/SOUL_PLAYBOOK.md`, **[MP row]** for `design/MECHANICS_PARITY.md` and **[SR #]** for `design/STORY_RULINGS_SOUL.md`. Anything that goes beyond Gary's notes is marked **(proposal)**. §9 lists every conflict between the notes and earlier ideas, and the notes win in each case.

**Licence rule.** Only MIT, Apache-2.0, BSD, ISC (added by Gary later) and zlib are allowed. No GPL or AGPL, and nothing containing Pokémon data, art or text. Licence facts were checked on Oct 22, 2026. Anything I couldn't verify is marked **UNVERIFIED**.

---

## Recommended first five pulls (staged in `vendor_staging/`, not wired)
1. **howler.js 2.2.4** (MIT, 7.9 KB gz): the audio engine (music loops, 1.5 s crossfade, jingle ducking). Audio is at zero today. About 3–4 days to integrate.
2. **ZzFX 1.4.0** (MIT, 3.6 KB gz): generated placeholder SFX (menu blips, catch, task-complete) until real audio lands. 0.5 day.
3. **fast-check 4.10.2** (MIT, test-only): property tests for the save v2 migration and the deterministic quest/task seeds. Protects players' saves. 0.5 day.
4. **easystar.js 0.4.4** (MIT, 3.9 KB gz): grid A* for trainer chases and NPC errands, if our own ~60-line BFS proves too limited. 0.5–1 day.
5. **idb-keyval 6.3.0** (Apache-2.0, 1.6 KB gz): IndexedDB storage behind the existing SaveStore, so mobile saves and backups survive localStorage limits. 1 day.

**Priority note.** The biggest part of the work is the company/job systems in §5–§8 (job quest line, Transfer quotas, Company Upgrade Tree). They come from Gary's design doc, and **no library covers them: they're our own code.** The pulls above only speed up the side systems.

---

## 0. Summary

| System | Today | Recommendation | Licence | Size (gzip -9 of dist file) | Effort (days) |
|---|---|---|---|---|---|
| Save / load | Solid v1 (localStorage + .bak + validation). Holds no bag, coins, Kilindex, tasks or company data | **Write our own:** extend `save.js` to schema v2 with a migration | — | 0 | 1.5 |
| Items / bag | Item catalogue text, 43 map items, UI shell. No pickup, not saved | **Write our own** | — | 0 | 2.5 |
| Shop / money | Buy/sell UI shell with placeholder prices and demo gold | **Write our own** on top of the shell | — | 0 | 1.5 |
| Kilindex | Screen built on demo data | **Write our own** (MP C15 schema) | — | 0 | 2 |
| Quests / flags / company tasks | Flags, gates and the inbox exist. No quest engine; the phone Tasks app is a stub | **Write our own** reducer, event bus and generator. XState is optional | XState: MIT | XState umd 14.6 KB | 3 (engine) + 3 (generator) |
| Employee ID + Benefits Board (§7) | Text only (`staff_discount`, `extra_boxes`, `spray_perk`, `task_done`) | **Write our own** (data-driven tree) | — | 0 | 3 + 3.5 + 2 (battle side) |
| Transfer to Revival Tech + sell goals (§6) | `system_heal.transfer_*` text only. No storage system yet | **Write our own** | — | 0 | 2.5 (+3 for Field Archive storage, P3) |
| Dialogue | Solid: `dialog.js` + `lines.js` + a 10k-line JSON | **Keep ours.** Use inkjs only if branching grows | inkjs: MIT | 31.3 KB runtime | 0 now |
| NPC movement / pathfinding | Wander, look and scripted walk. No pathfinding, no trainer line of sight | **Write our own** BFS (~60 lines) + line of sight. easystar.js is the alternative | easystar: MIT | 3.9 KB | 1.5 |
| Audio | None | **howler.js core + ZzFX** (or plain WebAudio) | both MIT | 7.9 KB + 3.6 KB | 3–4 (engine only) |

**Total: about 32–35 developer-days**, plus 3 days for the Field Archive storage boxes that Transfer needs. Music and SFX content are not included.

---

## 1. Audit of what exists

| System | Paths | State | Notes |
|---|---|---|---|
| Save / load | `src/overworld/save.js` (79 lines); `overworld.js` `saveData` ~755, `saveNow` ~763 | **Solid** | `SAVE_VERSION=1`, key `kilumen.save.v1` plus a `.bak` written before each save, with validation. Fields: `flags[]`, `counters`, `seen`, `seenDay`, `clock`, `party[{species,nickname,warmth,rt}]`, `pos`, `lastDoor`, `savedAt`. Autosaves every 60 s, on flag change, at warp end and on pagehide. `?save=0` and `?reset=1` work. **Missing:** bag, coins, Kilindex, tasks, employee ID, board, transfers, storage, and a per-save `saveId` for seeds |
| Items / bag | `art/world/overworld/maps/*.json` `items[]` (43, several `TBD`); `art/world/overworld/items/ITEM_PLACEHOLDERS.json`; `text/overworld_lines.json` `system_item_catalogue` (pockets care/feeds/gear/crystals/key/logs); `src/ui/ui.js` `scr_pack` ~469 | **Shell** | Pickup isn't implemented: `map.items` is only read by `debug.js`. `this.bag` is demo data (`?uidemo=1`) and isn't saved. Held items (one slot [DD §Items]) are not modelled |
| Shop / money | `src/ui/ui.js` `scr_shop` ~491; `src/ui/data.js` `PLACEHOLDER_PRICES`, `SHOP_STOCK`; `shop_int.json` clerk; `system_shop` text | **Shell** | Working buy/sell UI with quantity and confirm steps. Sell pays half price. Gold is `DEMO.gold` and isn't saved. Prices must be fixed and set per region, with no inflation [DD §Ownership] |
| Quests / flags / progression | `world_layout.json` `progression_flags`, `story_gates`; `map.applyGates` (map.js ~97); `art/world/overworld/tools/progression.py`; `CRITICAL_PATH.md`, `PUZZLE_PROGRESSION.md`; `scr_tasks` stub; `company_inbox` | **Partial** | Flags are a set-only Set. Gates work. There's no quest/task state, counters are ad hoc, and the phone Tasks screen says "No tasks yet" |
| Dialogue | `src/overworld/dialog.js` (274 lines), `src/overworld/lines.js` (91), `text/overworld_lines.json` (v0.4.8 draft, built by `text/build_overworld_lines.py`) | **Solid** | Promise-based say/ask/inbox calls. `pickLine` conditions (flags, once, once_per_day) and placeholders. Fine for quests |
| NPC movement | `src/overworld/npcs.js` (124 lines) | **Partial** | wander/look/static, mulberry32 `rng(seed)` + `hash(s)`, scripted `walk(id, dirs)`, occupancy. No pathfinding. Trainer `sight_cells` exist in map data but no line of sight runs |
| Audio | none | **Missing** | SP 4.x is a full brief: WebAudio manager, loop points, 1.5 s crossfade, day/night stems, ducking, jingles (including the company task-complete jingle, reharmonised after `read_drift_log`), cries |
| Kilindex | `ui.js` `scr_kilindex` ~440; `src/ui/data.js` (16 species) | **Shell** | Built on demo data plus the party. DD wants caught counts, heaviest and lightest weight, regions, known types and known skills [DD §Story plot]. MP C15 schema proposed |
| Encounters | `art/world/overworld/encounters/encounters.json` | **Placeholder data** | Slots carry `time` (dawn/day/dusk/night), `weather`, `flood` and a `variant_roll` (normal/enraged/Cosmic). These feed the "night / habitat / variant" research tasks |
| Battle | `vendor/battle-sim` (Showdown, MIT, "Copyright (c) 2011-2026 Guangcong Luo and other contributors") | **Another worker's area; not touched** | Showdown has **no catch, XP or level-up** events, so these must come from Kilumen's own wrapper. Faint and move-used events come from the protocol (`|faint|`, `|move|`) |

---

## 2. Library evaluation (verified Oct 22, 2026)

**Size column:** gzip -9 of the named dist file from jsDelivr, measured today. That's the full prebuilt file, not a tree-shaken import. "Unpacked" is the npm registry's `unpackedSize`. "Licence source" says whether I read the repo's LICENSE file or only the npm/GitHub metadata.

| Library | Version / last activity | Licence (source) | Size | Plain-JS fit | Verdict |
|---|---|---|---|---|---|
| **inkjs** | 2.4.0, repo pushed 2026-09-01, ~659★ | MIT (npm + GitHub) | `dist/ink.js` 128 KB raw / 31.3 KB gz; `ink-full.js` (with compiler) 60.8 KB gz | Good (UMD/ESM). Writers need Inky/inklecate | Hold. Our `lines.js` covers today's needs |
| Yarn Spinner (official) | C#/Unity | MIT (GitHub) | — | No official JS runtime | n/a |
| bondage.js | 2.2.0, npm 2020, repo 2024-03 | MIT (npm) | 97.2 KB gz | Yarn 2.x syntax, stale | Avoid |
| yarn-bound | 0.5.5, 2024-11 | **ISC** (npm; ISC now allowed) | 11.5 KB gz | OK | Not recommended (immature) |
| yarn-spinner-runner-ts | 0.1.5-c, 2025-11, 2★ | MIT (npm) | not measured | React-oriented, immature | Avoid |
| yarnspinner-typescript / -vite-plugin | **Unpublished from npm 2026-10-21**; GitHub repo not found | — | — | — | **Do not use** |
| **Tracery** (galaxykate) | repo pushed 2024-11-03, ~2.2k★ | **Apache-2.0** (LICENSE.MD read) | `tracery.js` 32 KB raw / 6.6 KB gz; `js/tracery.min.js` 5.3 KB gz | Global script; vendorable | Optional for quest flavour text. Our own template filler is enough |
| tracery-grammar (npm fork) | 2.8.4 | **ISC** (npm) | — | — | Use the Apache original instead |
| **easystar.js** | 0.4.4, npm 2020, repo 2024-01, ~1.9k★ | MIT (npm + GitHub) | 3.9 KB gz | Async callback API | Good fallback if our BFS isn't enough |
| PathFinding.js | 0.4.18, npm 2016 | MIT (package.json `licenses` + README) | 5.2 KB gz | OK | Unmaintained. Avoid |
| rot-js | 2.2.1, 2024-11 | BSD-3-Clause (npm) | 22.3 KB gz | Big for what we need | Avoid (overkill) |
| **howler.js** | 2.2.4, npm 2023-09, repo 2025-11, ~25k★ | MIT (npm + GitHub) | core 7.9 KB gz | Excellent | **Recommended** for music/SFX playback, loops, fades |
| **ZzFX** | 1.4.0, 2026-10-01 | MIT (npm). **Repo LICENSE not re-read: confirm before vendoring** | 3.6 KB gz | Excellent (generated SFX) | Recommended for UI blips and placeholder SFX |
| Tone.js | 15.1.22 | MIT (npm) | large | Overkill | Avoid |
| localForage | 1.10.0, npm 2021 | Apache-2.0 (npm) | 9.1 KB gz | OK, stale | Avoid |
| **idb-keyval** | 6.3.0, 2026-07-08 | Apache-2.0 (LICENCE file read; GitHub API shows NOASSERTION) | umd 1.5 KB gz | Excellent | Optional later if saves outgrow localStorage (~5 MB) |
| Dexie | 4.4.6, 2026-09 | Apache-2.0 (npm) | 30.8 KB gz | Overkill | Avoid |
| **XState** | 5.33.3, 2026-10-17, ~30k★ | MIT (npm + GitHub) | umd 14.6 KB gz (unpacked 2.3 MB) | Good, but the learning curve is heavy | Optional. A plain reducer is enough for tasks |
| @xstate/fsm | 2.1.0, 2023 | MIT (npm) | not measured | Small | Deprecated in favour of XState 5 |
| robot3 | 1.4.0, 2026-10-05 | BSD-2-Clause (npm) | 1.8 KB gz | Good | Optional, tiny |
| javascript-state-machine | 3.1.0, 2018 | MIT (npm) | — | Stale | Avoid |
| seedrandom / pure-rand | 3.0.5 (2019) / 8.4.2 (2026-07) | MIT / MIT (npm) | 0.9 KB gz / not measured | OK | Not needed: `npcs.js` already has mulberry32 + `hash` |
| @kiberon-labs/quests | 1.0.2, created 2026-07, 3★ | MIT (npm) | **48.5 MB unpacked** (graph-grammar + zod) | Heavy, brand new | Avoid |
| Questify / lemilonkh questgen | 2018 / 2017, 3★ | MIT (GitHub) | — | Abandoned | Avoid |
| Inventory libraries | — | — | — | No credible plain-JS option found | **Write our own** (simple data model) |


### 2b. Wider survey (Gary: "pull any other public code that might help us")

Licences were checked by reading each repo's actual LICENSE file on Oct 22, 2026 (details, hashes and source URLs in `vendor_staging/MANIFEST.md`). ISC is now on Gary's allowed list. Integration effort assumes the zero-build ES-module setup and separate PC and mobile profiles (`src/platform/pc.json`, `mobile.json`).

| Area | Kilumen today | Library (pinned) | Licence (repo file) | gz size | Pulled? | Integrate (days) | Verdict |
|---|---|---|---|---|---|---|---|
| Tilemap / Tiled | Own map JSON + Python tools; `map.js` | — | — | — | no | 0 | **Keep ours** |
| Pathfinding | None | easystar.js 0.4.4 | MIT | 3.9 KB | yes | 0.5–1 | First five #4 (or our own BFS) |
| Audio / music / crossfade | None | howler.js 2.2.4 + ZzFX 1.4.0 | MIT + MIT | 7.9 + 3.6 KB | yes | 3–4 + 0.5 | **First five #1, #2** |
| Save storage | localStorage v1 | idb-keyval 6.3.0 | Apache-2.0 | 1.6 KB | yes | 1 | First five #5 |
| Versioned save migration | `SAVE_VERSION` + validation | — (no good small library) | — | — | no | (in 3.1) | **Write our own** `migrate()` chain |
| Input: keyboard / gamepad remap | `input.js` polls `getGamepads()`; no remap UI | — | — | — | no | 1 | **Write our own** remap table per profile |
| Input: touch | Touch layout in `input.js`/`dialog.js` | nipplejs 1.0.4 | MIT | small | yes | 1 | Optional (analogue stick for mobile) |
| Particles / weather | `living.js` rain/birds/motes | — (tsParticles MIT too heavy) | — | — | no | 0 | **Keep ours** |
| Tweening / animation | Ad hoc easing in `ui.js`/`dialog.js` | @tweenjs/tween.js 25.0.0 | MIT | 7.0 KB | yes | 1 | Optional, for cutscenes/menus |
| State machine (menus; battle flow is Showdown's) | Ad hoc | robot3 1.4.0 (or XState 5, MIT, 14.6 KB) | BSD-2-Clause | 1.8 KB | yes | 1 | Optional, for the task/transfer/phone flows |
| Dialogue scripting | `dialog.js` + `lines.js` | inkjs 2.4.0 | MIT | 31.3 KB | yes | 2 | Hold |
| Side-quest text variety | none | Tracery @11db07c | Apache-2.0 | 5.3 KB | yes | 0.5 | Optional |
| Localisation / i18n | English JSON via `lines.js` (already keyed) | i18next 26.5.6 | MIT | 19.1 KB | yes | 2 | Only if a 2nd language is planned |
| Seeded RNG | mulberry32 + `hash` in `npcs.js` | — | — | — | no | 0 | **Keep ours** (move into a shared `rng.js`) |
| Chat profanity filter | none (no chat yet) | obscenity 0.4.6 | MIT | ~10–20 KB once bundled (UNVERIFIED estimate) | yes | 0.5 (needs one esbuild bundle) | Use if online chat ships |
| Multiplayer: realtime / presence / cloud save | none (a Supabase MCP is connected) | @supabase/supabase-js 2.118.0 | MIT (sub-packages per npm only) | 55.4 KB | yes | 4–6 (+ backend, moderation) | Preferred if multiplayer = chat, trades, leaderboards |
| Multiplayer: authoritative server | none | @colyseus/sdk 0.18.6 | MIT (bundled deps per npm only; tslib 0BSD) | 68.9 KB | yes | 8–12 (+ Node server hosting) | Only for real-time PvP |
| PWA / offline | `manifest.webmanifest` exists, no service worker | Workbox (MIT) | MIT | — | no | 1 | **Write our own** ~60-line service worker (zero-build) |
| Accessibility | reduced-motion in places | — | — | — | no | 1 | **Write our own** (aria-live mirror of dialogue, focus order, colour-blind marks per SP 7.5) |
| Testing | Playwright 1.64.1 (Apache-2.0) + `node --test` | fast-check 4.10.2 | MIT | test-only | yes | 0.5 | **First five #3** |

**Any library we vendor:** copy the LICENSE file next to it and log it in the asset licence log, following `/workspace/quality/LESSONS_AND_REUSE.md`.

---

## 3. Per-system plans

| # | System | Plan | Licence | Size | Effort |
|---|---|---|---|---|---|
| 3.1 | Save v2 | Add `saveId` (random at new game, used for seeds), `coins`, `bag`, `kilindex`, `tasks`, `company`, `archive`. `migrate(v1→v2)` fills defaults. Keep `.bak`. Schema in §8 | own | 0 | 1.5 |
| 3.2 | Bag + pickup | Item pickup from `map.items` sets the `item_<map>_<id>` flag. Pockets come from `system_item_catalogue`. One held item per creature [DD §Items]. Item-use hooks for feeds and tonics | own | 0 | 2.5 |
| 3.3 | Shop + coins | Wire `scr_shop` to saved coins. Fixed regional price table [DD §Ownership]. Discount comes from the Benefits Board only (§7) | own | 0 | 1.5 |
| 3.4 | Kilindex | caught/seen counts, min/max weight, regions, known types and skills [DD §Story plot]; variant pips [SP 1.7b] | own | 0 | 2 |
| 3.5 | Task engine | Event bus (`catch`, `faint`, `move_used`, `level_up`, `evolve`, `breed`, `feed`, `transfer`, `talk`, `pickup`, `enter_map`) → a pure reducer updates task progress → `task_done` line [system_phone.task_done] → employee ID level-up (§7). The phone Tasks app lists company tasks, story quests and side quests [DD §Mechanics] | own (XState optional) | 0 | 3 |
| 3.6 | Generated side quests | §4 | own (Tracery optional) | 0 / 5.3 KB | 3 |
| 3.7 | Pathfinding + line of sight | 4-way BFS on the collision grid (maps are small); trainer `sight_cells` → spotted → scripted walk | own (easystar fallback) | 0 | 1.5 |
| 3.8 | Audio | `AudioManager` on howler: music bus + SFX bus, loop points, 1.5 s crossfade, ducking for jingles, swap the task jingle variant on `read_drift_log` [SP 4.x, 8.2c] | MIT | ~11.5 KB | 3–4 |
| 3.9 | Dialogue | No change. Revisit inkjs if story branching outgrows `pickLine` | MIT | 0 | 0 |

---

## 4. Generated side quests (fetch / deliver / defeat / catch / find)

Story and main-line quests stay **hand-written**. Generated quests are filler side work only [DD §Story plot: "Need small side quests like any open world rpg"].

**Determinism (proposal).** `seed = hash(saveId + ':' + boardWeek + ':' + giverId + ':' + slot)` using the existing `hash` + mulberry32 from `npcs.js`. The save stores only `{tpl, seed, giver, progress, state}`. The quest text and targets are rebuilt from the seed, so a save loads identically and content edits can't scramble live quests. To keep it stable, each quest also stores its resolved target ids (species/item/map). `boardWeek` advances on in-game **Mon**, which is the company task board refresh day [SP 1.4].

**Pools (all from existing data, filtered by what the player has unlocked through `progression_flags`):**
- Species: `encounters.json` zones on maps the player has reached, with time/weather conditions kept.
- Items: `system_item_catalogue` care and feeds pockets only. Never key items. No alcohol, drug or smoking items, which the catalogue already follows (juices, teas, shakes).
- NPCs: map NPCs tagged `quest_giver: true` (**proposal**, a new optional map field). Destinations are maps the player has already visited.

| Template | Target fill | Done when | Reward (proposal) |
|---|---|---|---|
| Fetch | item × N from the feeds/care pools | Hand in at the giver (consumes the items) | Coins at 1.5× the item's regional price; 1 company task → +1 ID level only if the giver is company staff |
| Deliver | Giver gives a parcel key item → target NPC on another visited map | Talk to the target | Coins scaled by map distance |
| Defeat | N wild creatures of an element in zone Z, or one named route trainer rematch | `faint` events on the enemy side | Coins + a feed item |
| Catch | 1 of species S (optionally at time T) | `catch` event | Coins. Also counts toward company catch milestones as normal |
| Find | A hidden spot on a visited map (a seeded walkable tile from a curated `hide_spots` list (proposal)) | Interact at the tile | A random care item |

Limits (proposal): 3 open side quests per giver-week. Abandoning one is free. Expired quests drop off when the Monday board refreshes. Text uses `{placeholders}` in a new `system_sidequest` section that Text Bot writes. Optional flavour variety can come from vendored Tracery (Apache-2.0).

---

## 5. Job / research quest line (Gary: "the job quest line for catching and leveling and discovering kilumen")

### 5a. Hand-written main job track (rank structure follows the notes)
- **The notes say:** the player and Ron are promoted to **field researchers** at the start, because the field team stopped reporting [DD §Story plot]. Before that the player is a **junior lab tech**, and "Nothing else in the game depends on a later promotion. Later perks use employee ID levels" [SP 8 rank rule]. **So there are no further promotions.** Job progress *is* the **employee ID level**, which every completed task raises [DD §Mechanics].
- **(proposal)** Cosmetic titles shown on the ID card at level bands. For example, Field Researcher → Senior Field Researcher → Lead Field Researcher. These are **names only, not promotions, with no story gates**, so they don't break the SP rule. Ask Gary.
- Hand-written job beats, all from existing material:
  1. Lab-tech tutorial → `flg_promoted` [SP 8.1, CRITICAL_PATH step 0].
  2. First catch task (milestone 1) [DD §Plot].
  3. Branch Access Card at catch milestone 30 → `has_branch_card` [SP 8.2d].
  4. Field camp log pages → `read_drift_log` [SP 1.9, SR #7].
  5. Company progress raises the chance of the **Legendary Guardian** quest: "The more you push the company's agenda the more likely" [DD §Plot; MP C13].
  6. The ending: release, per ruling B (pending) [SR B].
- **Guardian trigger (proposal):** the Guardian roll chance grows with `company.tasksDone`, capped low. Win, lose or dominate are all possible, and capture odds are low [DD §Plot].

### 5b. Company research tasks (generated per species)
**In Gary's notes [DD §Plot]:**
- Total catch count milestones.
- Catch count milestones per region.
- **Same-species catch milestones 1, 3, 5, 10, 20, 30, 50, 75, 100** ("scales up to 150", see the conflict list).
- Each milestone pays in-game currency.
- **Discover evolutions.**
- **Breed the ~5 breed-only creatures.**
- **Feeding research:** feed different feeds to each beast.
- **Sell goals up to 2000** [DD §Ownership] (§6).

**Added from Gary's chat request, not in the DD (proposal):** see species S use move M; defeat N of S; raise one S to level X; find S at night / in weather / in a second habitat; discover S's Cosmic variant (Kilindex variant pip [SP 1.7b]); the Mirefen Count daily spotlight species [SP 1.10].

| Task family | Source | Per species? | Trigger event | Reward |
|---|---|---|---|---|
| Catch milestone (species) 1…100 | DD §Plot | yes, 9 tiers | `catch` | Currency (DD) + 1 ID level + 1 board point (DD §Mechanics) |
| Catch milestone (total, region) | DD §Plot | no | `catch` | same |
| Discover evolution | DD §Plot | per evolution | `evolve` | same |
| Breed-only creatures (~5) | DD §Plot | 5 tasks | `breed` (hatch) | same |
| Feeding research | DD §Plot | per species × feed type (proposal: 3 feed types per species) | `feed` | same |
| Sell goals | DD §Ownership | total (+ species quotas, proposal) | `transfer` | §6 |
| Observe move | Gary chat (proposal) | yes | `move_used` (sim protocol `|move|`, enemy side) | same |
| Defeat N | Gary chat (proposal) | yes | `faint` (enemy) | same |
| Level to X | Gary chat (proposal) | yes | `level_up` (Kilumen wrapper) | same |
| Night / new habitat | Gary chat (proposal) | yes | `catch` or `seen` with zone + time phase | same |
| Cosmic variant | Gary chat (proposal) | yes | `seen`/`catch` with `variant:'cosmic'` | same + Variant Ledger entry [SP 1.7a] |
| Mirefen Count spotlight | SP 1.10 | daily, 1 species | `seen` in the census mode | same |

**Making the tasks visible (proposal):** each species unlocks its research task list on first `seen`. The phone shows 3 "featured" tasks per week, picked by the seeded Monday refresh [SP 1.4], and the rest are browsable. Rewards beyond the DD's currency + ID level + point are proposals only: shop stock unlocks (MP E1 "stock grows with coins") and area access through the Benefits Board restricted-access node (§7).

### 5c. Engine and save hooks
- **From the battle sim (no edits by us; the battle worker exposes these):** `faint` (`|faint|`), `move_used` (`|move|`), battle win/loss, money earned.
- **From Kilumen's own layer (Showdown has none of these):** `catch` (dominance crystal result), `xp_gain`, `level_up`, `evolve`.
- **From the overworld:** `seen` (encounter start), `feed`, `breed`, `transfer`, `pickup`, `talk`, `enter_map`.
- Every event goes through one `tasks.emit(evt)` → reducer → save.

**Effort:** task engine 3 days (shared with 3.5) + task catalogue and milestone data 3 days + hand-written beats wiring 1 day.

---

## 6. Sell / hand-in quotas: "Transfer to Revival Tech" (Gary: "also selling a certain amount to the company")

**What the notes say:** "You can sell extra beasts to your company for money and progress towards your sell goals. Top sell goal is 2000 beasts" [DD §Ownership]. The in-game name is **Transfer to Revival Tech**, with a payout and milestone counter [MP P4]. The text already exists: `system_heal.storage_menu.transfer`, `transfer_ask` ("Transfers are final."), `transfer_named` ("{creature} has a name, you know."), `transfer_done` ("A crate is already on its way."), `transfer_goal` ("Transfers this year: {sell_count} of {sell_goal}."), plus `last_one`.

**How the company is framed:** **morally grey to dark.** The company does "inhumane testing" that is implied, never said aloud, and opposition groups object to capture and forced servitude [DD §Dark undertones]. Crystals smother each creature's lumen, and drift is logged as a defect [SR #7]. Director Vane is "comfort, not cruelty": he buried the field team's findings [SR A, pending]. So quotas should be written as **ordinary corporate KPIs with quiet irony**, never as a heroic act. The existing "crate" line already does this. **Story Bot should sign off on the tone.**

**Story clashes to flag:**
1. **Release ending [SR B, pending].** The ending frees every crystal, and low-Warmth creatures wait at the Field Camps. That leaves transferred creatures unaccounted for. **(proposal)** In the ending, transferred units are freed too and some appear at the Field Camps or the Croft [SP post-game]. Needs Story Bot and Gary.
2. **The rebels' theme.** A 2000-transfer goal rewards exactly what the rebels oppose. **(proposal)** Sell goals are **always optional**: never on the critical path, and never needed for a coin, a gate or the ending.
3. **Jingle.** The task-complete jingle is reharmonised after `read_drift_log` [SR, SP 8.2c]. Transfer milestones use that same jingle, so they get darker on their own.
4. **(proposal)** Once `read_drift_log` is set, `transfer_done` gains a once-only extra line, written by Text Bot and approved by Story Bot.

**Quota design**

| Element | Design | Source |
|---|---|---|
| Total sell goals | Tiered goals ending at **2000**. Tiers (proposal): 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000. Each tier is a company task: +1 ID level, +1 board point, plus currency | DD §Ownership (2000, "sell goals"); DD §Mechanics (task → level) |
| Per-species quotas | Weekly "Transfer request: N × S" on the Monday board. N = 1–3, S drawn from common species the player has caught at least 3 of. One request per week | **proposal** (SP 1.4 refresh) |
| Per-rank quotas | No ranks exist after `flg_promoted` [SP 8 rule], so quotas scale with **ID level band** instead (higher band, larger N) | **proposal** |
| Payout | `base(rarity tier) × (1 + level/50)`, rounded, × Benefits Board "increased payouts". Fixed per region like shop prices, with no inflation. Variants pay more (proposal: Large/Small ×1.5, Enraged ×1.5, Cosmic ×3, with a stronger confirm) | DD §Ownership (money, fixed prices); DD §Mechanics (payouts perk); multipliers are **proposal** |
| Progress | `company.transfers.total` and `.bySpecies[sp]` | MP P4 |
| Protection | (1) Can't transfer the last party creature (`last_one`). (2) Transfer only from the **Field Archive** boxes, never straight from the party (proposal). (3) `transfer_named` confirm if nicknamed. (4) **New `locked` flag** set from the team/archive menu; locked creatures are greyed out (proposal). (5) Extra confirm if the creature is the Trail Buddy, Cosmic, or has high Warmth (proposal). (6) Batch transfer shows a review list with one final confirm (proposal) | existing text + **proposal** |
| Kilindex | Transfers **don't reduce** "caught" (the DD Kilindex shows how many you have caught). Add a separate "transferred" count per species (proposal). Catch milestones count catches, not ownership, so selling never undoes a milestone | DD §Story plot; **proposal** |
| Shop/money hooks | Payout adds to `coins`. `transfer` event → tasks reducer → milestones. Shop sell (half price) stays items-only | DD §Ownership |
| Save | `company.transfers`, `party[i].locked`, `archive[box][slot].locked` | §8 |

**Effort:** transfer flow + quotas + protection 2.5 days. Field Archive storage boxes (MP P3) are needed first: 3 days.

---

## 7. Company Upgrade Tree: Employee ID and Company Benefits Board

### 7.1 What Gary's notes say (verbatim, DD §Mechanics)
> "You have a smart phone where you track quests, company tasks, mini map, team, inventory and stat tree. Every task you complete levels your emplyee ID up giving you new bonuses, like extra cash or company xp and one point for the "Company Benifits Board" where you use your points to enroll in gmae changing benifits, like free fast travel, discounts that add up at the store, increased payouts, increased dominance crystsl affectivmens, increased battle damage for all of your beasts, increased xp for all of your beast, increased health for all of your beasts, walk speed, energy level increase for beast, and even acces to resticted levels of company property."

Related notes:
- **Paid quick-travel stations** over land and over water [DD §Mechanics].
- **"Just need to make sure its not too easy"** [DD §Story plot]; MP E10 says to cap the perks.
- Fixed prices with no inflation [DD §Ownership].
- Company tasks "idly fuel expanding and leveling your beasts" [DD §Plot].
- SP 8.2d gives perks by ID level: L1 free heals, L2 10% staff discount, L3 extra boxes, L4 a free Hush Spray weekly, L5 priority Lumen Line seating.
- Branch Access Card at catch milestone 30 [SP 8.2d].
- NPC lines change with ID level [SP 2.x line 457].

### 7.2 How a level works (straight from the notes)
- **1 completed company task = +1 employee ID level** [DD §Mechanics].
- **Each level gives a bonus** "like extra cash or company xp" [DD §Mechanics]. **GARY RULING (Oct 22, 2026, 10:08 PM CT, his words: "company xp is just for your company level"):** company XP is NOT creature XP. It only fills the player's company level (Employee ID) bar. Proposal to match: the Employee ID has a company-XP bar; a completed task gives one level's worth, and bonus company XP rewards (from level-up bonuses, milestones or Transfers) fill the bar toward the next level. Cash bonuses stay as cash. Creature XP comes only from battles and the Benefits Board XP perk.
- **Each level gives exactly 1 Benefits Board point** [DD §Mechanics].
- **The SP 8.2d perks are the level bonuses at L1–L5.** They're automatic, not bought with points, which keeps both the DD and SP intact. Note that L1–L5 arrive within the first five tasks (see §9 conflict 3). **GARY RULING (Oct 22, 2026, 10:09 PM CT, his words: "the xp boost is for your creatuyres form the benifits board tho" / "you have to use points form levelinmg job level up to get it"):** the creature XP boost is a Benefits Board perk bought only with points earned from job level-ups, never automatic. The same reading applies to every DD board benefit (damage, HP, energy, discounts, etc.). **GARY RULING (10:13 PM CT): keep both** the free L2 10% staff discount and the board's store discount perk. Proposal: they stack additively, capped at a 65% total discount (Gary, 10:15 PM CT: "we can let it get to 65"), so prices never drop below 35% of the base price.

### 7.3 The tree (tiers, costs and prerequisites are all **proposal**; every node's benefit is from the DD unless marked)
There are 10 DD benefits, grouped into 4 branches. Tier gates use **ID level**, so points can't be spent faster than the game allows. That covers "not too easy".

```
                         [EMPLOYEE ID CARD]
        ┌──────────────┬───────────┴──────────┬────────────────┐
   FIELD LOGISTICS   SUPPLY & PAY        CRYSTAL LAB       UNIT PERFORMANCE
   Walk speed I       Store discount I    Crystal eff. I    Damage I  HP I  XP I  Energy I     (Tier 1)
   Travel discount I  Payouts I
        │                  │                  │                 │
   Walk speed II      Store discount II   Crystal eff. II   Damage II HP II XP II Energy II    (Tier 2)
   Free land travel   Payouts II
   Restricted access I
        │                  │                  │                 │
   Free water travel  Store discount III  Crystal eff. III  Damage III HP III XP III Energy III (Tier 3)
   Restricted access II  Payouts III
        │
   Restricted access III (capstone)                                                         (Tier 4)
```

| Node | DD benefit | Tier | Cost (pts) | Prerequisite | Effect (values are proposals, capped) |
|---|---|---|---|---|---|
| Walk speed I / II | walk speed | 1 / 2 | 1 / 2 | ID 1 / ID 15 + I | +10% / +20% walk speed (running is separate: `has_run_shoes`) |
| Travel discount I | free fast travel (step toward) | 1 | 1 | ID 1 | −50% at paid quick-travel stations |
| Free land travel | free fast travel | 2 | 3 | ID 15 + Travel I | Land stations free [DD paid land station] |
| Free water travel | free fast travel | 3 | 3 | ID 40 + Free land | Water stations free [DD paid water station] |
| Restricted access I | access to restricted levels of company property | 2 | 2 | ID 15 **and** `has_branch_card` [SP 8.2d] | Branch back rooms (`heal_centre_back`) |
| Restricted access II | same | 3 | 3 | ID 40 + RA I | HQ restricted floor (proposal: archive floor at Revival Heights HQ) |
| Restricted access III | same | 4 | 5 | ID 80 + RA II + story flag (Story Bot) | Deepest restricted level (proposal: Greystone sublevel). **Story-gated by Story Bot**, because it borders the field team reveal |
| Store discount I–III | discounts that add up at the store | 1/2/3 | 1/2/3 | ID 1 / 15 / 40 | −3% / −6% / −10%. Stacks with the SP L2 staff 10%, **capped at 20% total**. Prices stay fixed and only the perk discounts them [DD §Ownership] |
| Payouts I–III | increased payouts | 1/2/3 | 1/2/3 | ID 1 / 15 / 40 | +10/20/30% to trainer money, milestone currency and transfer payouts |
| Crystal effectiveness I–III | increased dominance crystal effectiveness | 1/2/3 | 1/2/3 | ID 1 / 15 / 40 | ×1.05 / ×1.10 / ×1.15 catch odds. **Never applies to the Legendary Guardian** (low odds per DD §Plot) |
| Damage I–III | increased battle damage for all beasts | 1/2/3 | 1/2/3 | ID 5 / 20 / 50 | +3 / +6 / +10% damage dealt |
| HP I–III | increased health for all beasts | 1/2/3 | 1/2/3 | ID 5 / 20 / 50 | +5 / +10 / +15% max HP |
| XP I–III | increased xp for all beasts | 1/2/3 | 1/2/3 | ID 5 / 20 / 50 | +10 / +20 / +30% XP |
| Energy I–III | energy level increase for beast | 1/2/3 | 1/2/3 | ID 5 / 20 / 50 | +1 / +2 / +3 max uses per skill before depletion [DD §Battle energy meter] |

**Full board cost = 70 points** (proposal). Rules (proposal):
- Tier 2 needs Tier 1 of the same line, and so on up.
- **Respec** at any company terminal for a coin fee, once per in-game week.
- **Points beyond 70:** Gary decides (§10). Options: they do nothing, or each converts to a small coin "bonus" at the terminal.
- Combat perks (damage/HP/XP/energy) apply in **every** battle except Battle Master arenas (proposal, to protect the DD's "not too easy").

### 7.4 Pacing check (proposal numbers)
Per-species milestones give 9 tasks × species (up to 4,050 for 450 species), plus region, total, evolution, breeding, feeding and sell tasks. So **ID level has no hard cap and points arrive fast**. That's why tier gates use ID level (1 / 5 / 15 / 20 / 40 / 50 / 80) and the board total is capped at 70. Balance bot should simulate the critical path (`progression.py`) to place ID ~15 near coin 3 and ID ~40 near coin 6. **Not yet simulated.**

### 7.5 The phone "stat tree"
The DD lists a **stat tree** among the phone apps [DD §Mechanics; SP 7.3] but doesn't define it. **(proposal)** The phone's **Stat Tree** app *is* the Benefits Board drawn as the tree above. A header shows the ID card (level, points free/spent, tasks done, cosmetic title), and a "Current bonuses" panel sums the active effects (walk %, discount %, damage %, and so on). Creature stats stay on the Team screen. **Gary should confirm, since "stat tree" could instead mean a per-creature tree.** This links to MP B4 ("Lineage" + "Field Training"), which is a separate hidden per-creature system.

### 7.6 Where each effect is applied
| Effect | Applied in | Owner |
|---|---|---|
| Walk speed, travel cost, restricted gates, discount, payouts | Overworld/UI (`player.js` speed, travel station NPC, `map.applyGates` + flag `board_ra_N`, `scr_shop`, coin award function) | Overworld coder |
| Crystal effectiveness | Kilumen's catch roll (outside Showdown) | Overworld/battle wrapper |
| XP | Kilumen's XP wrapper (Showdown has no XP) | battle wrapper |
| Damage, HP, energy | **Inside the battle engine:** needs a Kilumen mod/format hook (e.g. a damage modifier, max HP scaling, PP scaling) | **Battle worker.** I haven't touched it; this is a request |

**Effort:** ID level + level bonuses + task → level wiring 1 day; board data, rules and respec 1.5 days; phone Stat Tree UI 2 days; overworld effect hooks 1 day; battle-side hooks 2 days (battle worker). **Total about 7.5 days.**

---

## 8. Save format v2 (proposal)

```js
{
  v: 2, saveId: "k7f3…",            // new; seeds generated quests
  flags: [...], counters: {...}, clock: {day, min}, pos, lastDoor, savedAt,  // unchanged
  coins: 0,
  bag: { tonic_small: 3, feed_bag: 1 },              // itemId → qty
  party: [{ uid, species, nickname, warmth, rt, level, xp, held: null, locked: false, variant }],
  archive: { boxes: [[{...creature}|null × 30] × 8] },  // MP P3 Field Archive
  kilindex: { seen:{sp:1}, caught:{sp:n}, transferred:{sp:n}, minW:{}, maxW:{}, regions:{sp:[...]}, variants:{sp:[...]}, skills:{sp:[...]} },
  tasks: {
    boardWeek: 12,
    milestones: { total: 3, region: { brookhollow: 2 }, species: { tumbloam: 4 } },   // index into the tier lists
    research: { "tumbloam:move:dig": 1, ... },        // done set
    side: [{ id, tpl, seed, giver, targets:{...}, progress, state }],
    story: { questId: stepIndex },
    done: 57                                          // lifetime tasks done
  },
  company: {
    idLevel: 57, pointsFree: 3, board: { walk: 2, travel_land: 1, ... },
    respecWeek: 10,
    transfers: { total: 120, bySpecies: { sailquill: 40 }, goalTier: 5, weekly: { sp, n, done } },
    perkClaims: { hushSprayWeek: 12 }
  }
}
```
Migration v1→v2: default every new field, give existing party members a `uid`, and seed `kilindex.caught` from the party. Keep `.bak`. Bump `SAVE_VERSION` to 2. Write unit tests with `node --test`.

---

## 9. Conflicts: Gary's notes vs earlier ideas (notes win)

1. **"Job XP" (my earlier idea) vs DD.** Every completed task levels the employee ID [DD §Mechanics]. Gary has since ruled company XP exists and is "just for your company level", so the company-XP bar is back, used only for the Employee ID level.
2. **Ranks/promotions (Gary's chat ask) vs DD + SP.** The only promotion is junior lab tech → field researcher at the start [DD §Story plot; SP 8 rank rule]. Progress is the ID level. Titles are cosmetic proposals only.
3. **SP 8.2d "perks by ID level" vs DD "points enroll in benefits".** Reconciled: the SP perks are the automatic level bonuses, and the board perks are bought with points. Pacing issue: L1–L5 arrive within the first five tasks. Gary may want them at higher levels.
4. **Restricted access.** The DD lists it as a board benefit, while SP 8.2d unlocks the back room with the Branch Access Card (catch milestone 30). Reconciled: RA I needs both. Gary should confirm.
5. **Milestone tiers.** The DD says the list "scales up to 150" but stops at 100. Is there a 150 tier?
6. **Paid quick travel vs Skylift and the rail pass.** DD wants paid land and water stations and a "free fast travel" perk. The build has a free Skylift skill and a Lumen Line pass, and no water station [MP note 4]. The free-travel nodes assume per-ride fares.
7. **Selling vs the release ending** [SR B, pending] and the rebels' theme (§6).
8. **Discounts vs "no inflation / fixed prices".** No real conflict: the DD itself lists discounts as a perk. The price tables stay fixed.
9. **"Shop unlocks" and "new areas" as research rewards (my earlier idea).** Not in the DD. Kept only as proposals; areas open through board restricted access or story flags.
10. **Research task types from Gary's chat** (see move, defeat N, level to X, night/habitat, Cosmic) aren't in the DD. They're marked as proposals, but Gary asked for them.
11. **Naming.** "Cosmic" is Gary's DD word, but NAME_CHECK flags it as a rename risk (another game uses it). The "Field Notes" XP-share item [MP B19] is flagged; NAME_CHECK suggests "Bench Ledger". "Hush Spray" matches a real numbing product.
12. **Battle engine.** Showdown has no catch, XP or level-up events, so damage/HP/energy perks need hooks owned by the battle worker.

---

## 10. Questions for Gary

1. Employee ID: should titles at level bands exist (cosmetic only), or stay "Field Researcher" all game?
2. ~~"Company xp": XP for your creatures, or a separate company XP bar?~~ **Answered by Gary: company XP is only for your company level.**
3. "Stat tree" on the phone: is it the Benefits Board tree, or a per-creature stat tree?
4. Are the SP perk levels L1–L5 right, given that L5 comes after only 5 tasks?
5. Should the board have a points cap (70 proposed) and respec? What happens to extra points?
6. Do combat perks apply in Battle Master arenas?
7. Is there a catch milestone at 150, as "scales up to 150" suggests?
8. Should sell goals be optional? Do weekly per-species transfer requests fit? Do Cosmic and other variants pay more, or should they be untransferable?
9. What happens to transferred creatures in the release ending (ruling B)?
10. Paid travel: should the Lumen Line and a ferry charge per ride so "free fast travel" means something? Is Skylift free?
11. ISC is now allowed. Is **0BSD** (tslib, bundled inside the Colyseus client) also acceptable? Which multiplayer shape do you want, if any (chat/trades via Supabase, or real-time PvP via Colyseus)?
12. Do you want to rename "Cosmic", "Field Notes" or "Hush Spray"?

---

## 11. Recommended build order

1. **Save v2** + migration + `saveId` (1.5 days). Everything else stores data here.
2. **Coins + bag + pickup + shop** (4 days).
3. **Kilindex data** (2 days).
4. **Event bus + task engine + phone Tasks app** (3 days). Ask the battle worker for the `faint`/`move_used` events and the catch/XP wrapper.
5. **Company tasks: milestones + research catalogue + ID level + level bonuses** (4 days).
6. **Benefits Board + phone Stat Tree + overworld effects** (4.5 days). Battle-side perks follow from the battle worker (2 days).
7. **Field Archive storage** (3 days), then **Transfer to Revival Tech + sell goals + protection** (2.5 days). Story Bot signs off on the tone first.
8. **Generated side quests** (3 days).
9. **Pathfinding + trainer line of sight** (1.5 days).
10. **Audio engine** (3–4 days). Can run in parallel at any point; content is separate.
11. Dialogue library: only if branching outgrows `pickLine` (inkjs, MIT).
