# Text Bot request: Kilindex blurbs for the region 1 cute set (Coder, Oct 23 2026)

Gary, 2:19 PM CT Oct 23 2026: "we need a set of cute ones as well for other players... 6 per region".

Six new single-stage species are now in the game data: `data/creatures_synced.json`, `src/ui/species_synced.gen.js`, and the DEX-format entries in `design/cute_sets/cute_r1.json`.
Each blurb is `''` with a `blurbKey`, the same way as every other synced species. The game shows the TODO fallback until the key exists.
Coder did not edit text/*.py or text/overworld_lines.json.
Not urgent. None of the six is in a wild table yet. They are held until Gary places them after the main game is done. Proposed zones are in the table for tone only.

## Needed keys (system_kilindex.entries.<id>.blurb, same shape as the other synced species)

| key | name (Coder's pick; Text Bot may flag) | types | home (proposed) | art brief, for tone (Text Bot writes the blurb) |
|---|---|---|---|---|
| `system_kilindex.entries.drizzlebill.blurb` | Drizzlebill | water / rain | Brookhollow riverbank | Chubby teal baby platypus with a cream belly, a soft pale-blue bill, a raindrop-shaped paddle tail and drizzle freckles under its eyes. Violet crystal on its head. |
| `system_kilindex.entries.mossmote.blurb` | Mossmote | earth / bug | Trail 1 mossy stones | Round sage-green water-bear (tardigrade) with eight stubby legs, a soft moss saddle with dewdrops and a violet crystal on its back. Big shy eyes. |
| `system_kilindex.entries.gladlet.blurb` | Gladlet | light / spirit | Fernwick gardens | Smiling honey-cream quokka-like garden spirit with a pink blossom tuft and a violet crystal pendant. Always looks happy. |
| `system_kilindex.entries.buoyling.blurb` | Buoyling | water / sea | Lanternport harbour | Powder-blue baby manatee that floats upright in a red-and-white float ring. Violet crystal on its head. |
| `system_kilindex.entries.lumoris.blurb` | Lumoris | mystic | Greystone Caverns glowfern | Fluffy silver-blue slow-loris puffball with huge amber eyes, holding a glowing fern frond like a night-light. Violet crystal on its forehead. |
| `system_kilindex.entries.pandember.blurb` | Pandember | fire / magma | Thornwood | Round red-panda cub with cream face marks and a fluffy tail ringed with warm ember stripes. Violet crystal on its head. |

- Tone: these are the "cute set" for players who want cute companions. Keep the blurbs gentle and warm, one or two short Kilindex lines like the other entries.
- Names: the ids are fixed. Display names come from the data `name` field. If Text Bot wants a different display name, flag it to Coder rather than renaming in text.
- Dex numbers 454-459 are PROVISIONAL (after DEX_450 and the new evos 451-453). DEX_450 is unchanged.

## Blocked words reminder
Use the same blocked-words list as the other textbot_requests_*.md files (for example no 'shiny', 'route', 'super effective', 'PP').
