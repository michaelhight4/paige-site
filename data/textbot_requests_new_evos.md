# Text Bot request: Kilindex blurbs for 3 new evolutions (Coder, Oct 23 2026)

Gary, 2:18 PM CT Oct 23 2026: "that third evo needs its own creature line and make the third one for this one a larger amrmored version of the 2nd"

There are three new species in the game data: `data/creatures_synced.json`, `src/ui/species_synced.gen.js`, and the DEX-format entries in `design/dex_additions_new_evos.json`.
Each blurb is `''` with a `blurbKey`, the same way as every other synced species. The game shows the TODO fallback until the key exists.
Coder did not edit text/*.py or text/overworld_lines.json.
Not urgent for region 1. None of the three appear in a wild table. They can only be reached by evolving at L16 or L32, and region 1 trainers are below those levels.

## Needed keys (system_kilindex.entries.<id>.blurb, same shape as the other synced species)

| key | name (Coder's pick; Text Bot may flag) | line / level | types | art brief, for tone (Text Bot writes the blurb) |
|---|---|---|---|---|
| `system_kilindex.entries.vaultpede.blurb` | Vaultpede | stonepede -> columnpede -> **vaultpede** (L32) | earth / bug | Larger, armored columnpede. A heavy coil of thick stone segments under overlapping slate plates with violet crystal studs, plus a wide helmet plate. The line's theme is architecture: stone, then column, then vault. |
| `system_kilindex.entries.pricklon.blurb` | Pricklon | spinelet -> **pricklon** (L16) -> geodurchin | earth | Spinelet now stands up on four legs. Denser brown quills, a three-point violet crystal cluster on its back and a crystal fleck on its brow. |
| `system_kilindex.entries.geodurchin.blurb` | Geodurchin | spinelet -> pricklon -> **geodurchin** (L32) | earth | Big, heavy hedgehog with a high dome of long quills. A geode-like cluster of violet crystal spires grows out of its back. |

- Shape: one or two short Kilindex lines, like the other entries. Region and habitat: Greystone Caverns (vaultpede), Thornwood (pricklon, geodurchin).
- Names: the ids are fixed (`vaultpede`, `pricklon`, `geodurchin`). Display names come from the data `name` field. If Text Bot wants a different display name, flag it to Coder rather than renaming in text.
- Dex numbers 451-453 are PROVISIONAL (outside DEX_450). DEX_450 #82 `thornmound` was the old planned spinelet evolution and was never drawn. It is superseded in the game data, but DEX_450 is unchanged.

## Blocked words reminder
Use the same blocked-words list as the other textbot_requests_*.md files (for example no 'shiny', 'route', 'super effective', 'PP').
