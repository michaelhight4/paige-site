# Kilumen Cosmic variants (DRAFT, not approved by Gary, NOT wired in)

Each of the 16 creatures has one rare alternate palette, in the spirit of a "shiny" variant. That is the only thing borrowed: the palettes are original and use only `art/world/overworld/palette.hex`.
No game code or data uses this yet.

## Files
- **`cosmic_swaps.json`:** `swaps[creature] = {"#src": "#dst"}` plus `concepts`, `how_to_apply` and `vfx`. Each map lists only colours that creature actually uses.
- **`_preview/cosmic_all_2x.png`:** normal next to Cosmic for the front battle sprite, back battle sprite, overworld (left stand) and party icon.
- **`_preview/cosmic_tod_warmth_check_2x.png`:** Cosmic overworld sprite and icon over grass in dawn/day/dusk/night (sprite grade), at Warmth 0 and 3.
- **`_preview/cosmic_warmth_stages_1x.png`:** Cosmic front sprites through Warmth stages 0-3. Use it to check the crystal still stands out from the new body colours.
- **`tools/`:** `swaps.py` holds the maps and concepts, `build_cosmic.py` validates and renders, and `inventory.py` holds the colour inventory and crystal masks.

## How to apply
1. **Cosmic swap:** exact `#rrggbb` lookup. Apply it only to pixels **outside** the crystal mask (`warmth/masks/<creature>/...`). Alpha is unchanged. Do a single pass on the original colour and never chain lookups.
2. **Crystal Warmth:** apply the existing stage swap inside the mask. Crystals stay violet in every Cosmic, so Warmth works unchanged.
3. **Time-of-day grade:** use the sprite grade.

## Concepts
| Creature(s) | Cosmic | Idea |
|---|---|---|
| tumbloam, burrowmane, bastonox | Moondust | Tan hide → moon silver, slate shell → midnight blue (kept dark so Warmth stage 1-2 blue/teal crystals still stand out) |
| cindrip, emberlunx, forgeharrow | Frostfire | Charcoal → deep navy, lava cracks → ice cyan, tan belly → silver: "cold fire" |
| rillop, brookhorn, tidemarrow | Sunken Gold | Grey hide → old gold, cream belly → pearl, teal stripes → deep-sea blue. Fins and wings stay as authored |
| sailquill | Rosefinch | Sky-blue plumage → sunrise pink. White chest, beak and streamers unchanged |
| halovy | Moonmoth | Dawn-cream fur → pale moonlight blue |
| gloamtick | Sea-glass | Dusk grey → sea-glass teal. The lantern stays candle gold |
| mirewump | Autumn Bog | Moss green → rust and amber, mud browns → stone grey |
| runeskein | Rosewool | Teal weave re-dyed rose and crimson. The cream yarn body is kept |
| burlbeetle | Birchbark | Brown burl → pale birch silver with dark knots. The orange bud cap stays |
| slagrook | Verdigris | Red slag shell → blue-green copper patina (teal rather than grass-green so it still stands out on grass). Molten orange stays |

## Rules the build checks
- Every `dst` is in `palette.hex`.
- No `src` or `dst` is a crystal violet (`3a1e60 603096 8a4ace b076ec d6acff f4e2ff`).
- **No new night glow:** a non-glow colour is never mapped onto `fcd668 e8ce92 ecdec4 f8eabe 603096 8a4ace b076ec d6acff`.
- Every rendered pixel stays in the palette with alpha 0 or 255.

## Left for the Animator / Coder (not made here)
- The starfield shimmer when a Cosmic is encountered
- The 3-note chime
- The party-icon twinkle every 4 s
- Any sparkle on the summary screen

The design doc's scripted Cosmic Mirewump would use the `mirewump` entry (Autumn Bog).

## Open questions and known issues for Gary
- **Crystal colour conflict:** `NOTES.md` describes Cosmic as "midnight-blue body, silver star specks, silver crystal". This brief said crystals stay violet, so crystals are untouched. Moondust is closest to the NOTES description. If Gary wants silver crystals, that needs a mask-side swap, which would affect Warmth.
- **Night glow lost:** halovy (cream → blue) and the water line's cream belly (→ pearl silver) swap night-glow colours for non-glow ones, so they glow less at night than the normal forms. That is allowed (it only removes glow), but it changes the look at night.
- **Shared colours with other forms:**
  - Earth Moondust shells and Frostfire bodies share the blue family. They differ in value and pattern, but they are related.
  - Sunken Gold looks like the normal earth-line tan. It still reads as water because of the fin and stripe silhouette, but Gary may prefer a cooler gold.
- **Merged shades:** with 64 colours, a few near-identical shades merge into one. Examples: Moondust/Sunken Gold `87604d`/`92623e`, mirewump's two near-duplicate greens, and the fire line's charcoal and dark-lava ramps landing on the same navy. The shading still reads in the previews.
- **Unchanged colours:** outline darks are kept, which is why a few maps cover only about 30-50% of a sprite's colours (for example runeskein keeps its cream body).
- **Night tint:** under the night grade the Moondust shells sink into the blue tint more than the normal slate does. The body stays readable.

## Cosmic crystal (Gary, Oct 22 2026: "which ever is best")
Cosmic variants keep the standard violet crystal (not silver) so Crystal Warmth works identically; rarity reads through body colours + encounter shimmer. Supersedes the earlier "silver crystal" note.
