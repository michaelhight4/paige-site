# Base asset format (for the Animator) — `slot-svg-v1`

One base image becomes many variants. `src/recolor.js` picks tasteful colors from `data/palettes.json` and re-tints named **slots**. Variants are deterministic: a save stores only `(assetId, seed)`.

## SVG assets (preferred)
- Every recolorable shape carries `data-slot="<slot>"`, a baked `fill="#default"`, and `style="fill:var(--slot-<slot>,#default)"` (this is what `/workspace/lifesim_art_ui/assets` already does).
- The default hex in the shape MUST equal `manifest.assets[i].defaults[slot]` (the recolorer string-swaps that value so the tint also works when the SVG is loaded as `<img>`/data URI, and sets `--slot-*` on the root `<svg>` for inline use).
- Shading/outline/highlights must NOT be slots (outlines stay constant). Use semi-transparent black/white overlays (`fill-opacity`) for shading so it works on any color.
- Slots used: body, trim, roof, door, stone, fabric, metal, glass, accent, skin, hair, wheel, shadow, grass, water (see `slotDefaults`). **Never recolored** (kept at default): skin, hair, wheel, shadow, rust, glass, grass, water — `neverRecolor` in palettes.json.
- Manifest entry: `{id, category, slots[], defaults{slot:hex}, rarity, name, file, viewBox}`. `category` must be one of (or an alias of) `cars, houses, jewelry, clothes, boats, aircraft`. Other categories pass through unchanged (no recolor).
- Keep ≥1 "primary" slot: cars/boats/aircraft/houses = `body`; clothes = `fabric`; jewelry = `stone` + `metal`. Optional extras: `trim` (neutral, always contrasted vs primary), `accent`, `roof`, `door`, `stone`, `metal`.
- Pair/duo assets (e.g. matching pieces): keep slot names identical so one seed tints both.

## Raster assets
Add to the manifest entry: `"raster": {"src": "cars/sedan.png", "slots": {"body": {"base": "#3f7fd6", "mask": "cars/sedan.body.png", "channel": "luma"}, "trim": {"base":"#f3efe4", "channel":"g"}}}`.
- **Region mask** (preferred): a same-size PNG per slot, white = fully recolor, black = untouched, soft edges allowed. `channel`: `luma` (default), `r|g|b` (several slots packed into one RGB mask), or `a`.
- **Auto select** (no mask): `"select": {"hue":[340,20], "minSat":0.3}` recolors only pixels whose hue falls in that range (wraps 360). Use only when the region hue is unique in the image.
- `base` = the dominant color of that region in the source art; the recolorer applies the hue shift/saturation ratio/partial lightness shift relative to it, so keep regions flat-ish colored.
- Browser: `variant.renderRaster(image, {slot: maskImage}) -> canvas`. Pure core `recolorPixels(imageData, maskData, baseHsl, targetHsl, opts)` is testable without a DOM.

## API
```js
import { recolor, listingVariants, variantPrice } from './src/recolor.js';
const v = recolor(manifestEntry, seed);   // {id, assetId, seed, colors{slot:hex}, names{slot:'Onyx Black'}, rarity, valueMult, label, render(svgText), renderRaster(...)}
svgString = v.render(rawSvgText);
listingVariants(def, state /* {rs} */, 6);  // distinct variants for a shop listing
variantPrice(basePrice, v);                 // price x rare-color multiplier
```
Rules (data/palettes.json): neutral trims must contrast the primary; chromatic slots never clash (hue gap 45–135° between saturated colors is rejected; analogous/complementary/monochrome/neutral schemes by weight); jewelry gems only pair with allowed metals (`gemPairs`); picks are rarity-weighted (rare colors appear less and raise `valueMult` — categories weight each slot via `valued`). Regenerate the JSON with `python3 tools/build_palettes.py`; edit palettes/rules there (fantasy reskin = new palettes + names, no code).

---
# Layered characters (128-style pixel sprites) — `slot-svg-v1`, placeholders now, final art by the Animator

**What exists:** `tools/build_character_layers.py` generates PLACEHOLDER layers (pixel rects on a 32x32 grid, 4px cells = 128x128) into `assets/art/characters/<age>/<build|all>/<layerId>.svg`, plus `assets/art/characters/manifest.json` and `data/character_layers.json` (the schema: ages, builds, skins, hair/eye/cloth palettes, layer lists, `clothingMap` / `jewelryMap` that tie bought items to layers). The game renders from these files today (`src/character.js` data/compose, `ui/js/character.js` browser loader, Appearance & Wardrobe screen). The year panel and the UI chrome are untouched.

**Character = list of parts + colors** (`s.char`, ~400 bytes): `{skin, eye, build, parts:{hair:{id,c:{hair:'#hex'}}, top:{id,c:{fabric,trim}}, bottom, shoes, hat, glasses, facial, neck, ears, wrist, hand}}`. Kids inherit hair/eye color (`Character.inherit`). Layers unlock by owning clothing/jewelry (derived from `s.sl.assets`, nothing extra saved). Elder hair greys at render time.

**Replace placeholders with final art — rules**
- Same file names/paths, canvas 128x128 px, transparent background, pixel-art (nearest-neighbour; no anti-aliasing), 1px dark outline `#2b2a3a` per layer (outline is part of each layer, never recolored), feet touch the bottom row (y=127), character centered on x=64.
- Slot-recolorable shapes: fill the slot region with the DEFAULT hex from `data/character_layers.json -> slotDefaults` (skin `#e8b98d`, hair `#5a3a22`, eye `#3b6fb0`, fabric `#4a6fa5`, trim `#f3efe4`, metal `#b8bcc8`, glass `#bfe3f5`, gem `#c0392b`) and tag it `data-slot="<slot>"` with `style="fill:var(--slot-<slot>,#default)"`. For PNG: ship a same-size mask per slot (white = recolor) as described in the raster section above. Shading must be semi-transparent black/white overlays, not slots.
- All layers of one age group share one skeleton (anchors): head box, torso box, leg boxes per age/build from `geom()` in the generator (adult avg: head 8x8 cells at x=12,y=3; torso 10x10 at y=12; legs 3 wide). Clothes/hair must register to that skeleton so any combination composes.
- Draw order: body, bottom, shoes, top, neck, wrist, hand, facial, eyes, hair, ears, glasses, hat.

**Counts** (615 files today = what the Animator replaces; head layers once per age, body layers once per age x build):
| group | ids | files |
|---|---|---|
| base body (bald, underwear) | 1 | 5 ages x 3 builds = 15 |
| eyes (iris slot `eye`) | 1 | 5 |
| hair | 12: buzz, short, side_part, spiky, long, bob, ponytail, curly, bun, afro, mohawk, braids | 60 |
| facial hair (teen+) | 5: stubble, mustache, goatee, beard, full_beard | 25 |
| glasses | 4: round, square, sunglasses, aviator | 20 |
| hats | 6: beanie, baseball_cap, cowboy_hat, top_hat, hard_hat, grad_cap | 30 |
| earrings | 2 | 10 |
| tops (fabric+trim) | 14: tshirt, tank, sweater, hoodie, dress_shirt, blazer, chef_coat, lab_coat, scrubs, police_uniform, puffer_coat, trench_coat, sundress, evening_gown | 210 |
| bottoms | 4: jeans, slacks, shorts, skirt | 60 |
| shoes | 4: sneakers, sandals, boots, heels | 60 |
| necklaces / wrist / rings | 3 / 2 / 3 | 45 / 30 / 45 |

**Prompt template for the image generator (one image per file; run per age group, then per build for body-bound layers):**
`128x128 pixel art sprite, 2D side-less front view, NES/16-bit era "128-style" pixel look, hard 1px dark navy outline (#2b2a3a), flat colors with 2-tone shading, transparent background, centered, feet on the bottom edge, [AGE: baby 0-2 | child 3-12 | teen 13-19 | adult 20-64 | elder 65+] proportions, [BUILD: slim | average | broad], ONLY the [LAYER: e.g. "short side-part hair" | "navy blazer with white lapels" | "round glasses"] on a transparent canvas (no body, no face, no other clothing), fill the recolorable region with the flat default color #xxxxxx so it can be masked.`
Base body prompt: `... bald {age} {build} human body in plain grey underwear, neutral relaxed pose, arms at sides, simple face area left empty (eyes/mouth are separate layers), skin color #e8b98d flat fill.`
Generate the 8 skin tones by recoloring (do not paint 8 variants). Hair/clothes/etc. likewise recolor from the slot palette.
Notes: the existing generator for cars/houses/jewelry (`lifesim_art_ui/assets/generate_assets.js`) is untouched; characters use their own generator because they need per-age anchors.
