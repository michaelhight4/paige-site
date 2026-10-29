# Text Bot requests: region 4 (Frostspire) creatures (branch dev/r4-creatures, Oct 29 2026)

The five region 4 cute-set creatures (Gary approved the v2 art Oct 29 2026) plus Frostwick are now wired with the v2 sprites.
Kilindex text belongs to Text Bot; nothing in `text/` was edited. These keys are MISSING from `text/overworld_lines.json`
(`system_kilindex.entries` has none of them), so the Kilindex currently shows an empty blurb:

| id | shown name | dex | types | where (wild) | missing key |
|---|---|---|---|---|---|
| hushpine | Hushpine | 473 | grass/earth | Frostspire Pass grass, L27-29 | `system_kilindex.entries.hushpine.blurb` |
| cairnhorn | Cairnhorn | 474 | earth | Frostspire Pass grass L28-30 (uncommon); Frostspire cave table L30-32 | `system_kilindex.entries.cairnhorn.blurb` |
| glintmoth | Glintmoth | 475 | bug/wind | Frostspire Pass grass, dusk/night, L27-29 | `system_kilindex.entries.glintmoth.blurb` |
| skivvet | Skivvet | 476 | wind | Frostspire town grass, dawn/day, L30-32 | `system_kilindex.entries.skivvet.blurb` |
| aurorel | Aurorel | 477 | water/light | Frostspire town grass, night only, rare, L31-33 | `system_kilindex.entries.aurorel.blurb` |
| tbdcandle | Frostwick | 478 | light/mystic | Frostspire town grass, dusk/night, L29-31 | `system_kilindex.entries.tbdcandle.blurb` |

Also still missing (already requested earlier): `system_kilindex.entries.rimewick.blurb`.
Briefs for each creature are in `design/cute_sets/cute_r4.json` (`habitat`, `visual_brief`) in the dev copy.
Same tone rules as the rest of the Kilindex; no blocked words.
