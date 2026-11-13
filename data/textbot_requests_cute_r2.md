# Text Bot request: Kilindex blurbs for the region 2 cute set (Coder, Oct 27 2026)

Gary, 2:19 PM CT Oct 23 2026: "we need a set of cute ones as well for other players... 6 per region". Region 2 set: region 2 (East Trail and the Aurelith-Saltmere salt road), wild levels about 12-18.

Six new single-stage species are now in the game data: `data/creatures_synced.json`, `src/ui/species_synced.gen.js`, and the DEX-format entries in `design/cute_sets/cute_r2.json`.
Each blurb is `''` with a `blurbKey`, the same way as every other synced species. The game shows the TODO fallback until the key exists.
Coder did not edit text/*.py or text/overworld_lines.json.
These six ARE in the wild tables (`_meta.hold_from_encounters: false`, slots tagged `cute_r2: true` in `data/encounters_wired.json`): 4 uncommon at weight 4, 2 rare at weight 2 with a time of day.

## Needed keys (system_kilindex.entries.<id>.blurb, same shape as the other synced species)

| key | name (Coder's pick; Text Bot may flag) | types | rarity / where (wild) | art brief, for tone (Text Bot writes the blurb) |
|---|---|---|---|---|
| `system_kilindex.entries.haysquee.blurb` | Haysquee | grass / earth | uncommon, route_east_grass Lv 12-15 | Chubby baby guinea pig: honey-gold and cream patchy fur, russet eye patch, head rosette, tiny pink ears, crown of woven golden hay with a red clover. Crystal: small violet crystal set in the hay crown. |
| `system_kilindex.entries.dunehop.blurb` | Dunehop | wind / earth | uncommon, route_aurelith_saltmere_grass Lv 15-18 | Baby jerboa-like dune hopper: sandy-beige body, cream belly, huge round pink-lined ears, long springy hind feet, very long thin tail ending in a sea-salt white puff with pale aqua tips. Crystal: small violet crystal between its ears. |
| `system_kilindex.entries.belugoo.blurb` | Belugoo | water / sea | uncommon, route_aurelith_saltmere_grass Lv 15-18 | Baby beluga calf that wriggles on land: pearly white skin with lilac shading, rounded melon forehead, happy smile, small flipper arms, curled tail fluke, natural navy sailor-collar marking. Crystal: small violet crystal on top of its head. |
| `system_kilindex.entries.okapip.blurb` | Okapip | earth / mystic | uncommon, route_east_grass Lv 13-16 | Baby okapi calf: chocolate velvet body, cream face with dark muzzle, cream-and-brown striped legs and rump with tiny lilac sparkles, big soft ears, two rounded head nubs. Crystal: small violet crystal between its ears. |
| `system_kilindex.entries.crownlet.blurb` | Crownlet | light / bird | rare, route_east_grass Lv 13-16 (dawn/day) | Round rose-pink and cream songbird chick puffball with an orange beak, fanned pink-and-white tail, and a crown of blue bellflowers. Crystal: small violet crystal at the centre of the flower crown. |
| `system_kilindex.entries.kinkalume.blurb` | Kinkalume | dark / fire | rare, route_aurelith_saltmere_grass Lv 15-18 (dusk/night) | Baby kinkajou: honey-gold fluffy fur, cream face, amber eyes, long prehensile tail curled into a hook that carries a small glowing orange paper lantern. Crystal: small violet crystal on its forehead. |

- Tone: these are the "cute set" for players who want cute companions. Keep the blurbs gentle and warm, one or two short Kilindex lines like the other entries.
- Names: the ids are fixed. Display names come from the data `name` field. If Text Bot wants a different display name, flag it to Coder rather than renaming in text.
- Dex numbers 460-465 are PROVISIONAL. DEX_450 is unchanged.
- Zone ids above are internal table ids; in player text, say "Trail", never "route".

## Blocked words reminder
Use the same blocked-words list as the other textbot_requests_*.md files (for example no 'shiny', 'route', 'super effective', 'PP').
