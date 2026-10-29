# Encounter habitat rule (standard from v0.2.69-alpha, Gary, Oct 29 2026)
- **Surf** (`method` starts with `water`, Tideglide): water-type species only.
- **Caves** (`method` mentions `cave`): only Kilumen you could actually find in a cave: an underground element
  (earth/rock/ground, dark, ghost, crystal/mystic, poison, bug, magma) or lore that places it in a cave (its `found`
  line names a cavern, cave, grotto or mine). No surf or cave table may be empty.
- Data: `node tools/encounters/habitat_filter.mjs` filters data/encounters_wired.json and
  art/world/overworld/encounters/encounters.json; `--check` fails if anything breaks the rule.
- Runtime: `filterHabitat` in src/battle/encounters.js drops any slot that breaks the rule at load (unknown species fail
  closed). Tests: tests/habitat.test.mjs.
