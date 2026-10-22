# Base cartoon assets (slot-recolorable SVG)
Regenerate: `node generate_assets.js` (writes <category>/<id>.svg, manifest.json, preview.html). Test: `node test_assets.js`. Screens: `node shots.js [category…]` -> ../screens/assets_<category>[_random].png.

## Slot convention (slot-svg-v1)
Every recolorable shape is a flat single fill and carries `data-slot="<slot>"`, a unique `id` (`<assetId>-<slot>-<n>`), a `fill="#default"` attribute and `style="fill:var(--slot-<slot>,#default)"`.
Recolor either by setting CSS vars on the `<svg>` (`svg.style.setProperty('--slot-body','#33aaff')`; works for inline SVG and for rasterizing a serialized svg) or by setting `fill` on `[data-slot="body"]` elements, or string-replacing the default hex from manifest `defaults[slot]`.
Outline is a fixed neutral `#2b2a3a` stroke on the root `<g>` (never recolored). Shapes with no `data-slot` are fixed neutral (eyes, tail-lights, glass shine, tire arches).
Slots: body trim roof door stone fabric metal glass skin hair accent wheel shadow rust grass water (see manifest.slotDefaults). `shadow` is a ground shadow (fill-opacity .28). `rust` appears only on *_wrecked cars.
Manifest entry: {id, category, file, slots[], defaults{slot:hex}, rarity, name, tags[], pair, pairRole('clean'|'wrecked'|null), viewBox}. ViewBoxes: cars/boats/aircraft `0 0 256 160`; all others `0 0 256 256`.
Pairs: pickup, sports, classic, muscle (`<k>_clean` <-> `<k>_wrecked`).
