# vendor/battle-sim: changes from upstream

Upstream: `@pkmn/sim` 0.10.11, from https://github.com/pkmn/ps (commit 4fec8877c83d102528929100b9c45a3a1cc160d3, 2026-06-18).
That is the Pokemon Showdown simulator (https://github.com/smogon/pokemon-showdown) repackaged by the pkmn project.
Both are MIT. Their notices are kept here as `LICENSE` (Showdown) and `LICENSE.pkmn` (pkmn), in the bundle banner of
`src/battle/engine.js` and in `THIRD_PARTY_LICENSES`. This is a **modified** copy (Oct 22, 2026, Kilumen battle engine pass).

Build: `node tools/build_battle_engine.mjs` (esbuild 0.25.12, ESM, minified, `legalComments: none` plus a banner with both
licences). `--check` also runs `tsc -p vendor/battle-sim` (TypeScript 5.9.3).

## Removed (not shipped, not in this folder)
- **All upstream data:** `data/` (creatures, moves, abilities, items, conditions, formats, learnsets, aliases, type chart,
  natures, rulesets, mods). The engine ships with no data. The game installs its own tables at runtime (`installData()`,
  `sim/registry.ts`, `src/battle/data/`).
- `sim/battle-stream.ts`, `sim/team-validator.ts`, `sim/tools/` (random battles, exhaustive runner), `lib/streams.ts`,
  `test/`, `config/`, and the `@pkmn/sets` team-text dependency.
- **Generation gimmicks:** the Z/Max/Mega/Dynamax/Terastal entry points in `battle-actions.ts` are stubs that return
  `undefined` or throw `"removed"` (marked `Kilumen fork: upstream gimmick mechanic removed.`). Some inert type fields
  (`zmove`, `maxMove`, `terastallize` in `side.ts` choice types) are still declared but nothing sets them.
- Upstream code that only existed for specific named creatures, items, abilities or moves (forme changes, item-triggered
  forme lines, ability subOrder exceptions, type-lock exceptions, hidden-power type, the item/ability endless-battle
  clause, crit-volatile copy list, competitive tier bookkeeping). Each spot is marked `Kilumen fork:` in the source.
- The sodium/ChaCha PRNG. Only the deterministic Gen-5 LCG seed (`[a,b,c,d]` or `"gen5,hex"`) remains (`sim/prng.ts`).
- EVs, natures and IV hidden-type math.

## Renamed
- `sim/pokemon.ts` → `sim/creature.ts`, class `Pokemon` → `Creature`, `side.pokemon` → `side.creature` and the related
  identifiers and types (`PokemonSet` → `CreatureSet`, `pokemonLeft` and similar). Remaining "Pokemon Showdown" strings in
  this folder are upstream file-header credits and URLs, kept for attribution. The minified bundle carries only the licence
  banner (`tests/battle.test.mjs`, "shipped engine bundle contains no upstream … names").
- Player-facing protocol words are produced by Kilumen's UI (`src/battle/ui_sd.js`), never by the engine.

## Added / changed for Kilumen rules

- Oct 23, 2026 (Gary: capture by health and chance, no capturing trainers' creatures): `runCrystal` uses one roll against
  p = clamp(catchRate × (1 − 2/3 × HP%) × status × grade, 1%, 95%) (same as `src/battle/capture.js`); `-kcrystal` SHAKES is now the
  1–4 FX pulse count from that roll (caught = 4). Non-wild battles return before the bag is touched.
  Retuned 12:16 PM CT (Gary: "full health needs to be like 2%"): p = clamp(catchRate × (1 − 29/30 × HP%^0.85) × status × grade, 0.5%, 95%)
  (new optional rules field `catchHpCurve`).
All constants live in data (`Scripts.kilumen`, `src/battle/data/rules.js`) and are PLACEHOLDERS until Gary signs off.
- `sim/kilumen.ts` (new): wild-battle Retreat (`retreat` choice, `-kretreat`), Crystal catch (`crystal ID`, `-kcrystal`
  with shakes), bag items (`item ID [slot]`, `-kitem`), XP award (`-kxp`), mid-battle level-up with recomputed stats
  (`-klevelup`), `kend|retreat|caught`, `teamState()` (HP, energy, status, XP and level written back to the game) and
  `bagKey()`.
- `sim/registry.ts` (new) plus `installData()` in `sim/dex.ts`: runtime data install, replacing static data imports.
- `sim/teams.ts`: teams are plain JSON (`CreatureSet` with `variant`, `lineage`, `hp`, `energy`, `status`, `xp`,
  `warmth`). There are no team generators.
- Stat formula (`battle.ts statModify`): Lineage 0–7 per stat instead of IV/EV/nature; Variant multipliers (Large, Small,
  Enraged; Cosmic is cosmetic) from `Scripts.variantMods`.
- Damage (`battle-actions.ts modifyDamage`): Clean Strike (crit) multiplier and stage odds, Affinity (main and sub element),
  strong/weak multipliers, and the element chart row from the main element with the sub-element as modifier
  (`creature.ts`, effectiveness cap in data).
- **Energy** (upstream PP): a skill at 0 Energy stays selectable. Overuse cuts power and accuracy and costs 1/8 max HP of
  self-damage (`-overuse`, `-damage …|[from] overuse`).
- **Warmth:** once per battle, a creature at or above `warmthEndure` survives a KO hit from above 1 HP
  (`-activate|X|warmth|[endure]`).
- Carried-in HP, energy and status from the overworld. Fainted members are never sent.
- Party cap `partyMax` (6). Wild flag on the battle: Retreat and Crystal are allowed in wild battles only.
- Queue order: retreat, then bag actions, then switches, then skills (`battle-queue.ts`).
- A plain turn cap (1000 turns) replaces the endless-battle clause.
- Status conditions (Scorched, Drowsy), items and the format are data, defined in `src/battle/data/rules.js`.

## Verification
- `node --test tests/battle.test.mjs`: matchups, priority, status, switching, wild KO, trainer KO, catch, retreat, items,
  overuse, Warmth, levelling, party cap, determinism, and a deny scan. The deny scan hashes every identifier in the bundle
  against `tests/fixtures/battle_deny_hashes.json`, a salted hash list of upstream names, so no upstream name is stored in
  plain text in this repo. An allowlist covers generic English words.
