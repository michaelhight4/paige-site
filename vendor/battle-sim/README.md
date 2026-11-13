# vendor/battle-sim

Kilumen's battle engine: a modified, data-free fork of an MIT battle simulator (`@pkmn/sim` 0.10.11 / Pokemon Showdown).
- What changed: `CHANGES.md`. Licences: `LICENSE`, `LICENSE.pkmn` (also in `THIRD_PARTY_LICENSES` and the bundle banner).
- Build: `node tools/build_battle_engine.mjs [--check]` → `src/battle/engine.js` (single minified ES module, no runtime deps).
- Game glue: `src/battle/battle.js` (`KilumenBattle`), data: `src/battle/data/`, screen: `src/battle/ui_sd.js` (`?battle=sd`).
- Pure and deterministic: same seed + same choices = same log; no DOM, no timers, no network. It runs in Node (tests,
  a future Supabase Edge/server referee) and in the browser.
- Do not add upstream data files here. Kilumen data only, via `installData()`.
