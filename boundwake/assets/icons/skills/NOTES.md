# Boundwake Skill Icons — NOTES
Generated for Coder/Gary Skills list wiring. Separate from 192px portrait grid.
## Spec
- Size: 128×128 RGBA PNG, binary alpha (0/255 only)
- Ink: `#191210`
- Style: Kilumen-Kilu-level colored pixel-art motifs on transparent
- No text/letters; no alcohol; original Boundwake motifs

## Icons (29/29)
| id | category | motif |
|---|---|---|
| `strength` | physical | Flexed arm gripping rough iron/stone weight |
| `endurance` | physical | Red heart with heater shield + stamina flame |
| `agility` | physical | Winged leather boot with teal wind swirl |
| `swordsmanship` | martial | Diagonal longsword with violet inlay + slash spark |
| `archery` | martial | Drawn wooden bow with green-fletched arrow |
| `shieldwork` | martial | Heater shield, Boundwake sun-over-wave emblem |
| `unarmed` | martial | Wrapped fist knuckles-forward with steel knuckle glint |
| `spellcraft` | arcane | Open spellbook with rising violet/gold glyph sparks |
| `mana_control` | arcane | Hands channeling contained violet-cyan mana orb |
| `elementalism` | arcane | Gold ring uniting flame, drop, stone, wind wisp |
| `mending` | arcane | Hands holding kintsugi-sealed teal gem + bandage |
| `warding` | arcane | Hexagonal violet/cyan barrier around gold sigil |
| `smithing` | craft | Anvil + hammer over forge ember and smoke |
| `alchemy` | craft | Round potion flask with herbs in green-gold liquid |
| `enchanting` | craft | Violet gem in gold ring with orbiting gold glyphs |
| `cooking` | craft | Cauldron/stew pot over cookfire with ladle |
| `tailoring` | craft | Needle and thread through rose-red cloth fold |
| `charm` | social | Blooming rose with warm gold heart-spark |
| `bartering` | social | Balance scale with coins on both pans |
| `performance` | social | Warm amber wooden lute with gold accents |
| `etiquette` | social | Sealed parchment letter + formal cream glove (no drink) |
| `stealth` | wild | Hooded cloak profile in shadow with silver crescent |
| `tracking` | wild | Animal paw print with dotted trail + bent twig |
| `husbandry` | wild | Gentle hand on friendly horse muzzle |
| `foraging` | wild | Woven basket with berries, herbs, and leaf |
| `literacy` | mental | Open plain book with quill writing (no magic runes) |
| `lore` | mental | Stacked ancient tomes + celestial diagram scroll |
| `focus` | mental | Faceted teal crystal concentrating light to a point |
| `composure` | mental | Stone basin of still water with stacked river stones |

## QA
- All 29 files exist at `{id}.png`
- All 128×128 RGBA with binary alpha only
- MD5 hashes unique across set
- 24px nearest-neighbor silhouettes unique across set
- Contact sheet: `contact_sheet.png` (+ `_2x`)
- Preview strips: `preview_strip_24.png`, `preview_strip_32.png`

## DRAFT / watchlist for Character models → Coder/Gary
- `swordsmanship` — slender silhouette; readable but lighter visual weight than peers
- `elementalism` — four-element ring is busy at 24px; confirm all four elements still read
- `focus` — crystal+beam is tall/narrow; verify against composure/warding at UI size
- `tracking` — paw+trail+twig can thin out at 24px
- `enchanting` vs `mana_control` vs `warding` — all arcane circular energy; check family distinction in Skills list
- `literacy` vs `spellcraft` vs `lore` — three book motifs; differences: quill/plain vs rising glyphs vs stacked tomes+celestial scroll
- `bartering` generation included a tiny rose accent at base (decorative); not alcohol; OK unless Gary wants pure scales-only
- Soft AI anti-alias was thresholded to binary alpha; some edges may look slightly jagged — hand-clean if Gary flags

## Do not touch
- `dwarf_teen_f` and `player_kit` mix-and-match clothing (untouched)
- `skills.json` / Boundwake code (untouched)
