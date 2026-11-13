# Interior Art Standard v0.1 (DRAFT, pending Gary's OK on house_1f test room)
Base look = Stardew furniture (the minimum bar). Kilumen has 4x the art pixels per tile, so every piece must beat it.

## Rules
1. **Three planes.** Every piece has a top (lightest), a front (mid) and a side (dark). Fill the plane-id map (draw_lib Canvas.pl: 1 top, 2 front, 3/4 side, 5 flat). A `_n` normal sheet is generated from it.
2. **Outline.** 1 px darkest-ramp outline outside; coloured (ramp step 4) on inner edges; no outline on top highlights.
3. **Contact.** A 2 px opaque darkest-ramp baseline inside the sprite. The soft cast shadow stays in the engine depth pass (no translucent baked floor shadows).
   - **Exception (Oct 28, 2026, Gary):** furniture sprites bake their own 2-3 px soft dark drop shadow (down-right, own layer under the piece). Floors, walls and rugs still get no baked shadow.
4. **Ramps.** 5–6 steps per material, from art/palette/kilumen.hex only. Light comes from the top-left. Furniture never reuses floor or wall hex codes.
5. **Detail budget.** Dense, varied pattern in small, important spots (grain, weave, quilting, spines, shelf items, knobs, hinges, trim, leaves). Calm 2–3 tone fills on large surfaces.
6. **Density.** Every surface shows 1–3 items, and every room has at least one cluster per wall.
7. **Size and anchor.** 64 px cells. Keep the existing cell, footprint, anchor and collision. A 2-tall piece uses its overlay top cell. Drop-in only: same tile ids.
8. **Lighting.** Bake only the base ramp, outline and baseline. Live shading comes from `_n` via src/overworld/ixlight.js (`?ix2=1`; `?ixlight=0` = baked).

## Pass/fail checklist
- [ ] Top, front and side planes all read at zoom 1.
- [ ] Outline and baseline present; floating pieces = FAIL.
- [ ] palette_check passes; no floor or wall codes reused.
- [ ] `_n` cell exists and lights correctly at day and night.
- [ ] **Stardew QA:** put the piece next to the comparable Stardew piece scaled to the same on-screen tile size (furniture_sheet.png). If it has less detail or depth, REJECT.
- [ ] The theme palette file was used (interior_palettes/<theme>.hex).
- [ ] Drop-in: same dimensions, anchor and collision; map JSON untouched.

## How to make a new piece
Copy a function in kilumen/tools/interiors_v2/draw_house.py and draw it with draw_lib (`top/front/side`, then `outline`). Run the script to write interior_v2 and `_n` at 1x/2x/3x. Run palette_check and `node tests/interiors_v2_shots.mjs after_day '&ix2=1'`. Add the piece to furniture_sheet and do the Stardew QA.


## Kit catalogue (v1, Oct 28, 2026, DEV behind `?ix2=1`)
Every interior is assembled from ONE shared kit (`tools/interiors_v2/kit.py` -> `tiles_Nx/ix2_kit.png`, `tileset_ix2.json`, ids 9001+;
catalogue `dev_notes/kilumen_interiors_kit.json`). Tile key: `kit_<piece>_<cond>_<colour>[_r|_l]`.

**Conventions (all pieces):** 64 px grid; footprint w x h cells; anchor = bottom-left cell; for h = 2 the top cell goes on the
overlay layer (walkable, draws over the player) and the bottom cell on decoration (blocked); 2 px outline, 3 px contact baseline,
light from the top-left; side-facing seats come as `_r` / `_l` (mirror). Rugs are flat and are baked onto the room's floor tile
(ground layer) so furniture can stand on them. Wall pieces (art, photos, boards) sit on wall cells and never change collision.

**Conditions:** `worn` (second-hand: scuffs, patches, CRT, steel knobs, faded rug) / `normal` / `fancy` (polish, gold trim, brass).
**How buildings are assembled:**
- Broke kids' house (house_1f test room): all `worn`, mixed colour swaps so it looks gathered, not bought as a set.
- Ordinary town homes: `normal`, one fabric colour per room.
- Wealthy NPC / mayor: `fancy`, matching set (one fabric colour), rug + wall art in every room.
- Lab / shop / clinic: their own pieces (style board: `shots/interiors_v2/style_board.png`) plus shared kit (bookcase, plant, wall art, crates).

| piece | size (w x h) | themes | conditions | colour swaps | collision | facing |
|---|---|---|---|---|---|---|
| sofa_side | 1x2 | home, inn, office | fancy/normal/worn | purple, red, teal | block | l/r |
| armchair_side | 1x1 | home, inn, office, clinic | fancy/normal/worn | purple, red, teal | block | l/r |
| tv_unit | 1x2 | home, inn | fancy/normal/worn | teal | block | - |
| side_table | 1x1 | home, inn, office, clinic | fancy/normal/worn | blue, red | block | - |
| dining_table | 2x1 | home, inn | fancy/normal/worn | blue, green, red | block | - |
| dining_chair | 1x1 | home, inn, office | fancy/normal/worn | blue, green, red | block | l/r |
| kitchen_fridge | 1x2 | home, inn, lab | fancy/normal/worn | teal | block | - |
| kitchen_counter | 1x2 | home, inn | fancy/normal/worn | teal | block | - |
| kitchen_sink | 1x2 | home, inn, clinic | fancy/normal/worn | teal | block | - |
| kitchen_stove | 1x2 | home, inn | fancy/normal/worn | teal | block | - |
| bookcase | 1x2 | home, office, hall, lab, inn | fancy/normal/worn | teal | block | - |
| plant_tall | 1x2 | home, office, hall, lab, shop, clinic, inn | fancy/normal/worn | green | block | - |
| coat_rack | 1x2 | home, office, inn, clinic | fancy/normal/worn | green, purple, red | block | - |
| shoes | 1x1 | home, inn | fancy/normal/worn | blue | block | - |
| basket | 1x1 | home, inn, shop | fancy/normal/worn | green, red | block | - |
| book_stack | 1x1 | home, office, lab | fancy/normal/worn | red | block | - |
| wall_art | 1x1 | home, office, hall, inn, clinic | fancy/normal/worn | teal | wall | - |
| photos | 1x1 | home, office | fancy/normal/worn | teal | wall | - |
| rug | 3x3 | home, inn, office, hall | fancy/normal/worn | purple, red, teal | walk | - |
| radio | 1x1 | home, office, shop | fancy/normal/worn | red, teal | block | - |
| crates | 2x1 | home, shop, lab | fancy/normal/worn | red | block | - |
| rods | 1x1 | home | fancy/normal/worn | green | block | - |

### Kit catalogue: pass 3 additions (Oct 28, 2026, `tools/interiors_v2/kit_p3.py`, DEV `?ix2=1`)
Pass-2 style: browner ramps (`BROWN` worn/normal), 7-9 px boards (light edge + dark seam + sparse knots), corner posts and trim, and a baked down-right shadow using only the allowed SHADOW rgba plus a dithered fringe, so palette_check passes. Run `kit_p3.py`, then `build_house_v2.py`.
- `bookshelf3` 1x2: **worn = the test3.png worn shelf (APPROVED by Gary)**, normal = the pass-2 normal shelf. `bookshelf_p2worn` = the pass-2 worn shelf, **REJECTED by Gary; never place it**.
- `table3` 2x2 raised table (thick edge, apron, 4 legs, gap). Worn: job listings, an OVERDUE bill, a noodle cup, a crack and a shim. Both rows are blocked by the map script.
- `chair3` 1x1 side view `_r/_l` with a criss-cross rush seat (worn: torn rush, string tie).
- `couch3` 1x2 side view `_r/_l` (teal/blue). Worn: a stitched patch, a throw blanket and a pillow. `crt3` 1x1 side-view CRT on a crate. `crt3_back` 1x1 back view (vented tapered casing, wall cable, blue screen glow). `couch_side` / `couch_front` 2x2 mustard-taupe redraw; `couch3` REJECTED.
- `fridge3` 1x2 (teal/green): magnets, OVERDUE notice, photo and list, with cereal and noodles on top. `side3` 1x1: coin jar, noodle cups and lamp.
- Wall pieces (no collision change): `clock3` (clock + shelf), `cork3` (corkboard with job listings and bills).

- Oct 28, 2026 (Gary): the 'no furniture shows its back to the player' rule is removed. Backs facing the player are allowed (e.g. CRT back toward the camera, couch facing the door wall).
