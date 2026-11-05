# Boundwake gear item icons — 44 assets

## Delivery and QA
- Output: `assets/gear/<id>.png`; ids match `data_fantasy/gear.json` exactly. Current count: weapon 8, armor 8, trinket 7, tool 7, home 8, mount 6.
- Shipped locally: **44**. Refused: **0**. No runtime wiring, publish or source/data changes.
- Each item is 96×96 RGBA PNG; alpha values are exclusively 0/255; transparent RGB is zeroed; visible content has at least 6px padding. All contours use exact ink `#191210`.
- 44/44 distinct SHA-256 hashes. Machine evidence, bounds and per-item hashes: `_raw/items/qa_items.json`.
- Visual QA: reviewed all 44 at 96px and true 24px nearest-neighbor, including enlarged nearest previews in `contact_sheet_items.png`. Distinct silhouettes, palette/material hierarchy and no clipping. Microtexture deliberately simplifies at 24px.
- Original 30 were preserved byte-for-byte when the 14-item scope addition arrived: `_raw/items/original30_hashes.json`.
- Did not write any `slot_*.png`. All task writes stayed inside this gear folder; no other assets, src, CSS or data were edited.
- No text/logos, copied game art, alcohol/tobacco/drug items. Field Surgery Roll deliberately omits the source description’s tonics; Herbalist Kit uses only leaves, twine and a knife.
- Doubtful / art-director review: **gear_mount_reedrunner** species interpretation; **gear_mount_ashcharger** flame-like mane tips. Both are technically complete and included, not refused.

## Workflow / reusable tool record
- GenerateImage produced six original magenta-background sheets using the approved `assets/icons/skills/contact_sheet.png` as the style reference. Raw JPEGs retained in `_raw/items/`.
- Existing registered tools reused: Pillow 13.0.0 (MIT-CMU, actual installed LICENSE read), NumPy 2.5.4 and SciPy 1.18.1 (array/morphology processing only; not shipped runtime code). No third-party art packs or new dependencies.
- Build: `_raw/items/build_items.py`: chroma-key magenta including enclosed holes, remove JPEG color fringe and tiny stray components, fit 84px within 96px, nearest-neighbor resize, nondithered color reduction, exact brown outline, binary alpha, centered padding and hash QA.
- Lesson: generator followed 3×3 grid for homes but returned mounts in 2×3; mount extraction uses the observed 2-column layout, not the requested one. Generators also return slightly nonuniform magenta JPEGs: exact-color key alone is insufficient.
- Tier is inferred from each item’s price/renown and description; JSON has no explicit tier field. Starter kit stays modest, premium swords/plate/jewelry/mounts receive richer metal, gems or trim.
- Unity carry-over: import as Sprite, point filtering, no mipmaps, preserve 96px canvas and binary alpha. This task changes no import/runtime settings.

## Item motifs and visual QA
| id | Motif / tier | QA |
|---|---|---|
| `gear_ash_staff` | Humble diagonal ashwood pole, linen grip bands, warm woodgrain; starter tier. | PASS; intentionally slender starter pole; linen bands and wood color retained at 24px. |
| `gear_hunting_knife` | Compact curved single-edge steel camp knife, walnut handle and brass rivets. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_vale_shortsword` | Broad short honest steel sword, plain iron guard and brown wrap; village tier. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_reed_longbow` | Crescent yew longbow, reed-green wraps and taut dark string. | PASS; 24px bowstring is intentionally hairline; curved silhouette and green grip remain distinct. |
| `gear_glass_focus` | Faceted cyan triangular palm prism, gold corner clasps and bright glass refraction. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_spire_longsword` | Slender silver-blue dueling blade, winged gold guard, navy grip, sapphire fittings. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_ember_blade` | Curved dark blade with molten orange seam, rich gold guard, crimson grip; highest weapon tier. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_bulwark_mace` | Chunky blunt flanged steel mace, short wood haft, brass collar and teal grip. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_padded_jerkin` | Cream quilted sleeveless jerkin, diamond seams and simple brown laces. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_leather_coat` | Oiled chestnut split-tail trail coat, green collar, asymmetrical buckles and pockets. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_mail_shirt` | Short-sleeve blue-silver ring mail, navy padded collar and linked texture. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_watch_cuirass` | Blue-steel cuirass, bronze trim and original abstract sunrise embossing. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_collegium_robe` | Long purple layered scholarly robe, cream panel and cyan decorative inkward thread. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_banneret_plate` | Silver-white articulated half-plate, gilded shoulders, royal-blue tabard; parade prestige. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_ashwalker_harness` | Crossed charcoal frontier harness, red heatproof shoulder cape, copper buckles and pouches. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_scale_vest` | Tailored teal scale vest, gold collar and ruby throat clasp. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_hearth_charm` | Carved amber wooden hearth token with red/cream statue ribbons and short loop. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_tide_lens` | Cyan salt-glass loupe, bronze rim and short walnut handle. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_reed_whistle` | Straight yellow-green hollow reed whistle, finger holes and olive cord; explicitly not a pipe. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_lantern_brooch` | Teal enamel lantern-shaped gold cage pin with amber central glass. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_codex_pendant` | Miniature indigo book pendant, gold chain, cream page edges and purple gem clasp. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_ward_ring` | Angled thin silver hoop with icy geometric ward bezel and small blue accents. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_ember_sigil` | Angular obsidian/copper oath medallion, orange ember gem and red sash tail. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_herb_kit` | Open russet herb pouch, green leaves, drying twine and a small herb knife; no bottles. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_smith_hammer` | Diagonal steel cross-peen hammer, walnut haft and copper collar. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_lock_picks` | Forest-green open leather wallet with slim silver picks and tension tool. | PASS; at 24px the open wallet and silver tool grouping read, individual pick tips simplify. |
| `gear_ledger_case` | Burgundy document case, protruding blank cream writs, gold clasp and red wax seal. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_lute` | Honey-amber pear-shaped travel lute, dark soundhole, strings and green ribbon. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_enchant_kit` | Violet stitch roll, silver needles, cyan thread spool and white chalk; richer magical toolkit. | PASS; at 24px violet roll/cyan spool remain distinct; tiny needle/chalk detail simplifies. |
| `gear_field_surgery` | Ivory linen surgical roll, teal strap, clean forceps and scalpel; no blood or medicinal bottles. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_rent_cot` | Humble squat timber lodging, patched brown roof, small loft light and shared doorway. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_cottage_lane` | Small cream cottage, red roof, chimney, green herb box and tiny fence. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_willow_house` | Wider blue-green-roof home, porch, willow and cyan pond edge. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_quay_flat` | Two-tier sandstone quay flat, terrace, teal shutters/door and exterior lanterns. | PASS with style note: tiered sandstone facade is rounder/rustic compared with urban townhouse; teal lamps retained. |
| `gear_ledger_townhouse` | Grand burgundy three-storey townhouse, blue double-gable roof, carved pale frame and blue door seal. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_reed_cabin` | Low triangular reed-thatch cabin, timber stilts, raised entry deck and herb bunch. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_spire_rooms` | Lavender stone academic turret, violet pointed roof, external stone stairs and cyan window. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_ember_hall` | Broad basalt frontier hall, rich copper-red roof, amber door and original flame finial; top home tier. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_mount_mule` | Gray-brown mule bust, exceptionally long ears, cream muzzle and plain brown halter. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_mount_pony` | Broad golden chestnut pony, shaggy pale forelock, cream blaze and olive bridle. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_mount_courser` | Ivory slim courser, flowing slate-blue mane and refined teal/brass tack. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_mount_reedrunner` | Woodland dun deer-like riding animal, short antlers, alert ears, cream throat and reed-green tack. | REVIEW art interpretation: source does not name species; chosen deer-like woodland mount for clear silhouette distinction. |
| `gear_mount_destrier` | Powerful black/navy destrier, silver-gold chamfron, white crest and violet cloth; prestige. | PASS; centered, distinct color/silhouette at 24px; binary alpha and padding verified. |
| `gear_mount_ashcharger` | Red-roan warhorse, copper-orange mane, dark cheek armor, bronze rivets and amber fittings; top mount tier. | REVIEW art interpretation: copper mane has flame-shaped tips; looks more fantastical than merely heat-hardy stock. |
