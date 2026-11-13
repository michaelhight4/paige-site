# Text Bot request: Kilindex blurbs for the region 3 cute set (Coder, Oct 27 2026)

Gary, 2:19 PM CT Oct 23 2026: "we need a set of cute ones as well for other players... 6 per region". Region 3 set: region 3 (Revival Heights and Frostspire, cold mountain and tundra), wild levels about 22-32.

Six new single-stage species are now in the game data: `data/creatures_synced.json`, `src/ui/species_synced.gen.js`, and the DEX-format entries in `design/cute_sets/cute_r3.json`.
Each blurb is `''` with a `blurbKey`, the same way as every other synced species. The game shows the TODO fallback until the key exists.
Coder did not edit text/*.py or text/overworld_lines.json.
These six ARE in the wild tables (`_meta.hold_from_encounters: false`, slots tagged `cute_r3: true` in `data/encounters_wired.json`): 4 uncommon at weight 4, 2 rare at weight 2 with a time of day.

## Needed keys (system_kilindex.entries.<id>.blurb, same shape as the other synced species)

| key | name (Coder's pick; Text Bot may flag) | types | rarity / where (wild) | art brief, for tone (Text Bot writes the blurb) |
|---|---|---|---|---|
| `system_kilindex.entries.mufflynx.blurb` | Mufflynx | wind / dark | uncommon, frostspire_pass_grass Lv 28-31 | Fluffy grey lynx kitten with dark spots, long ear tufts, big cream ruff and a dark-tipped tail. Crystal: small violet crystal on top of its head. |
| `system_kilindex.entries.mittling.blurb` | Mittling | spirit | uncommon, route_revival_grass Lv 22-24 | Little spirit of a lost knitted mitten: red cable-knit body with a white snowflake band, cream fur cuff, pom-pom tail, a shy face peeking from the knit. Crystal: small violet crystal on top of its head. |
| `system_kilindex.entries.marmallow.blurb` | Marmallow | earth / grass | uncommon, route_revival_saltmere_grass Lv 25-27 | Chubby marmot pup with a mossy cape on its back sprouting edelweiss, buck teeth, rosy cheeks, dark flat tail. Crystal: small violet crystal on top of its head. |
| `system_kilindex.entries.snugworm.blurb` | Snugworm | bug / magma | uncommon, frostspire_pass_grass Lv 28-31 | Woolly caterpillar in dark brown and ember-orange bands flecked with warm glowing specks, orange-tipped antennae, shy round face. Crystal: small violet crystal on its back. |
| `system_kilindex.entries.alpuff.blurb` | Alpuff | light / angelic | rare, frostspire_grass Lv 30-32 (dawn/day) | Cloud-white baby alpaca cria with curly wool, pink-lined ears, dark hooves and a faint golden halo ring. Crystal: small violet crystal in its forelock. |
| `system_kilindex.entries.snowdrowse.blurb` | Snowdrowse | mystic / ghost | rare, frostspire_grass Lv 30-32 (dusk/night) | Sleepy snow-globe spirit: pale-blue glass globe with drifting snow, a droopy pale-blue nightcap with a white pom, navy base. Crystal: small violet crystal set in its base. |

- Tone: these are the "cute set" for players who want cute companions. Keep the blurbs gentle and warm, one or two short Kilindex lines like the other entries.
- Names: the ids are fixed. Display names come from the data `name` field. If Text Bot wants a different display name, flag it to Coder rather than renaming in text.
- Dex numbers 466-471 are PROVISIONAL. DEX_450 is unchanged.
- Zone ids above are internal table ids; in player text, say "Trail", never "route".

## Blocked words reminder
Use the same blocked-words list as the other textbot_requests_*.md files (for example no 'shiny', 'route', 'super effective', 'PP').
