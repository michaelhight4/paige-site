# Kilumen: Start of a Journey — Overworld kit (pixel art, 64 px native)

All art is original and generated procedurally (`tools/`). No tile, map or building is traced or copied.
Style: true-grid **pixel art**, bright and warm (sunny greens, warm cobbles and timber, cream walls), with a **violet dominance-crystal accent** (emblems, crystals, puzzle switches, the Revival Tech office crystal).

## 1. Pixel-art rules
- **Native tile = 64 x 64 px.** Every pixel sits on the 64 px grid. Nothing is anti-aliased or blurred.
- **Shared Kilumen palette: 64 colours** in `palette.png` / `palette.hex` (shared with Character models; adds warm charcoals, browns and lava orange for creatures). Overworld tiles use a 51-colour subset (`palette_tiles_subset.png`) (one swatch per colour, grouped in ramps: ink, violet x6, grass, forest, earth, sand, stone, cream, water, teal, red, orange, blue, pink). Every tile pixel is one of these colours, or one shared translucent shadow `rgba(26,18,38,96)`.
- Shading and highlights use **ordered 4x4 Bayer dithering** keyed to absolute pixel position, so neighbouring tiles dither in phase and join without seams.
- Props, overlays, interior furniture and puzzle objects have a dark 1 px outline on their silhouette. Ground tiles have none, so they tile cleanly.
- Alpha is binary (0 or 255), apart from the single shadow colour.
- **No panel lines (Gary, Oct 22 2026: "i dont want to see any panel lines").** The grid must never show:
  - **Transparent deco.** Every deco / overlay / interior / puzzle tile is the object plus at most the one shadow colour; everything else is alpha 0, so the ground shows through and no square "backing" appears round a prop (`ground.clean_deco` runs before `pixelize`).
  - **Seamless ground.** Each ground terrain has 4 variants `v0..v3` built from one shared texture field; the edge band of every variant is pixel-identical and only the centre varies (variance-preserving blend, no flat averaged ring). Maps pick a variant per cell by position hash: `variant = vhash(x, y) % 4` (`tools/ground.py ground_variant`), so there is no visible 2x2 / checkerboard repeat. Extra-biome ground is re-varianted the same way as `xs_<terrain>_<v>` (snow, ice, mud, moss).
  - **Wobble transitions.** Autotile edges (`B>A_*`) have 3 edge-wobble variants picked by `(vhash >> 8) % 3`, so a long shoreline or path edge is not one repeated straight cut.
  - **Organic path edges.** Path / trail edges are noise-shaped with rounded inner and outer corners, never a straight line on the tile border.
  - **Proof:** `qa/seams/before_*.png`, `after_*.png`, `compare_*.png` (open grass, path edge, path corner, lamps + sign, sign + fence) and `qa/seams/seam_metric_{before,after,now}.json` from `tools/seamcheck.py`: `[variants, worst, mean]` edge-step / interior-step ratio for every variant pair (1.0 = invisible join, above 1.3 = visible line). Now: grass 1.14 / 0.90, grass_dark 1.02 / 0.92, sand 1.11 / 0.96, snow 0.87 / 0.74, trail 0.62 / 0.27, path 1.41 / 1.31 (cobble joints are drawn on purpose), cave 1.46 / 1.22, mud 1.48 / 1.24 (cracks are drawn).

## 2. Sheet sets, scaling and camera
| set | tile px | use | tileset file |
|---|---|---|---|
| `tiles_1x/` | 64 | native, editors, 720p (x2 in engine) | `tileset.json` |
| `tiles_2x/` | 128 | 1080p | `tileset_2x.json` |
| `tiles_3x/` | 192 | 1440p | `tileset_3x.json` |

- The 2x and 3x sets are **nearest-neighbour** copies of the 1x set. They have the same ids, indices, columns and rows, so maps work unchanged with any set.
- **Render with nearest-neighbour and integer zoom only** (x1, x2, x3, x4...). Never use fractional scales or linear filtering.
  - HTML canvas: `ctx.imageSmoothingEnabled = false`. CSS: `image-rendering: pixelated;` on the canvas or img.
  - Unity: Filter Mode = Point, Compression = None, Pixels Per Unit = 64, and use a pixel-perfect camera.
  - Godot: Texture filter = Nearest, and set Stretch mode to `viewport` with an integer scale.
- Camera (world tiles visible):
  - 2560x1440 at x3 (192 px per tile): **13.3 x 7.5 tiles**
  - 1920x1080 at x2 (128 px per tile): **15 x 8.4 tiles**
  - 1280x720 at x2: 10 x 5.6 tiles. At x1 it is 20 x 11.25 tiles (map or overview mode).
- Keep the player centred and clamp the camera to the map bounds. Interiors smaller than the view are centred on black.
- Snap the camera to whole native pixels, so the scroll offset is a multiple of the zoom factor. Otherwise pixels shimmer.
- Movement is grid-locked, one tile per step: walk 4 tiles/s, run 8 tiles/s, bike 12 tiles/s. See **MOVEMENT.md**.

## 3. Sprite scale
- **Humans: 64 x 96 px native** (1 x 1.5 tiles). At x3 that is **192 x 288**; at x2 it is 128 x 192.
- **Overworld creatures: 64 x 64 native** for small and medium creatures (one tile), **96 x 96** for large ones (centred on the tile and overhanging 16 px each side).
- Draw sprites with the same palette (`palette.png`), a 1 px dark outline and no anti-aliasing.
- Anchor: the feet sit at the bottom-centre of the occupied tile.
  - Human, native: `x = tileX*64`, `y = (tileY+1)*64 - 96`.
  - 96 px creature: `x = tileX*64 - 16`, `y = (tileY+1)*64 - 96`.
  - Multiply by the zoom factor.
- **Draw order (also in `tileset.json → draw_order`):**
  1. `ground`
  2. `decoration`
  3. **characters + overlay tiles flagged `"ysort": true`** (tall-grass fronts and tips), sorted together by tile row (pixel row while stepping). On a tie the **character is drawn first**, so the front blades of its own cell cover it from the waist down.
  4. the remaining `overlay` tiles (tree canopies and roof tops), always above characters, so characters walk behind trees.
  - Why ysort: a front-blade tile in the row **above** the player must not cover the player's head. Sorting by row draws it before the sprite.
- Buildings are sized for this scale. House, heal centre and shop walls are about 2.25 tiles tall (144 px). The office and Master's Hall walls are about 2.6 tiles. A 96 px sprite fits the door frames.

## 4. Files
```
overworld/
  palette.png / palette.hex  the shared 64-colour Kilumen palette (tiles use a 51-colour subset)
  tileset.json             64 px tiles (tiles_1x); tileset_2x.json / tileset_3x.json = same data pointing at the 2x/3x sheets
  tiles_1x/  tiles_2x/  tiles_3x/
     terrain.png           ground (grass, dark grass, path, sand, snow, mud, cave floor; variants), water (4 frames), cave walls
     transition.png        autotile edges/corners (B-over-A), animated shores
     deco.png              tall grass + cave fern (16 edge variants x 2, idle + 3 rustle frames), story-gate props (RT barricade, crystal barrier, fallen log), bike rails, ramps, flowers, rocks, crystals, mushrooms, bushes, signs, lamps, fences, ledges, cliffs, bridges, stairs, mats, tree bases
     overlay.png           tree canopies (above characters); tall-grass / cave-fern front blades and tips (ysort)
     building.png          sliced buildings + cave entrance
     interior.png          floors, walls, furniture
     puzzle.png            boulder, pressure plates, crystal switches, crystal gates (all states)
  refs/<building>_1x.png / _3x.png   each building as one whole image
  maps/*.json              maps
  previews/<map>.png       full map at x3 (192 px/tile, nearest); previews/<map>_debug.png = 32 px/tile collision/warp/puzzle overlay
  world_layout.json        13 zones + routes, build status, puzzle tier; progression flags, story gates, forced grass, fly / rail, bike routes, progression_check
  PUZZLE_PROGRESSION.md    puzzle difficulty curve for all zones
  CRITICAL_PATH.md         zone order, story gates, flags, detours, what the checker proves
  MOVEMENT.md              walk / run / bike speeds, buttons, where each is allowed, sprite states (Animator)
  FIELD_SKILLS.md          Skylift (fly), Lumen Line rail + restricted cities, Tideglide + storm weather, planned Brushbreak/Stonebreak/Glowcall (names: Text Bot draft)
  MIDPOINT_REPORT.md       mid-point status report (tall grass, forced grass, roadblocks)
  previews/before_after_tallgrass.png, chokepoint_forced_grass.png, roadblock_*_before_after.png, bike_paths.png
  previews/time_of_day.png  Brookhollow + Lantern Rest under dawn / day / dusk / night
  maps/variants/route1_storm.json   Route 1 with the east lowland flooded (storm_season), same ids as route1
  tileset_extra*.json, tiles_extra/   biome worker's x_ kit, merged into tileset*.json by tools/extra_merge.py (section 13)
  time_of_day/grades.json, lut_{dawn,day,dusk,night}.png   palette grade tables + 3D LUTs (section 14)
  qa/seams/                panel-line before/after crops + seam metric (section 1)
  qa/before_previews/, qa/after_previews/   Route 1, Thornwood, Brookhollow before / after the PATH_GRASS_STUDY fixes (compare_<map>.png = side by side)
  qa/v040/                 Text Bot v0.4.0 crops: windows per house, window_phases.png, station_int_handcar.png, brookhollow_bin.png
  interiors_new/           OWNED BY THE INTERIORS WORKER (do not edit here)
  tools/                   generator: python3 tools/run.py rebuilds everything and runs the checks (~2 min; `--check` validates without writing, see 17.4);
                           python3 tools/make_previews.py redraws the documentation previews
```
Sheets have 16 columns. A tile's rect is `(col*ts, row*ts, ts, ts)`, where `ts` is the set's tile size and `index = row*16 + col`.

## 5. Buildings (front-facing, 3/4 view)
| type | footprint | look |
|---|---|---|
| house_player | 5x5 | red shingle roof, dormer, round attic window, porch with posts, mailbox, flower boxes |
| house_a / house_b / house_c | 5x5 | three generic variants: a = teal roof + dormer, b = orange roof + gable window, c = green roof + timber walls and porch; different trims, windows and chimneys |
| heal_centre | 7x5 | teal roof, violet crystal emblem, wide glass doors, sign band |
| shop (RT Supply) | 5x5 | blue roof, dormer, striped awning, "RT SUPPLY" sign band |
| office (Revival Tech) | 7x6 | flat grey roof with a large violet crystal, glass curtain wall, logo band |
| masters_hall | 7x6 | stone hall with violet slate roof, pillars, banners, double doors |

Roofs have shingle rows, gradient depth shading, an overhanging eave with shadow, chimneys and dormers. Walls are shaded with trim, and windows have frames, sills and flower boxes.
The door tile is the bottom-centre slice of each building. You arrive on the tile below it.

## 6. tileset.json
```json
{"tile_size":64,"native_tile_size":64,"scale":1,"render":"nearest-neighbour, integer zoom only","palette":"palette.png",
 "collision_codes":{"walk":0,"block":1,"ledge_s":2,"water":3,"door":4,"boulder":5,"gate":6,"plate":7,"bike_only":8,"ramp":9},
 "draw_order":["ground","decoration","characters + ysort overlay tiles, sorted by tile row (character first on ties)","overlay (non-ysort: canopies, roofs)"],
 "sheets":{"terrain":"tiles_1x/terrain.png", ...},
 "tiles":[{"id":381,"name":"tall_grass_1111_v0","sheet":"tiles_1x/deco.png","index":60,"col":12,"row":3,
           "walkable":true,"collision":"walk","collision_code":0,"encounter":true,
           "animation":{"type":"rustle","trigger":"on_enter","frame_ms":90,"loop":false,"frames":[61,62,63],"idle_frame":60}},
          {"id":352,"name":"tall_grass_front_0000_v0","sheet":"tiles_1x/overlay.png","index":0,"ysort":true, ...},
          {"id":888,"name":"plate_cave_off","sheet":"tiles_1x/puzzle.png","collision":"plate","collision_code":7,"states":{"off":888,"on":889}},
          {"id":1190,"name":"window_day_b","sheet":"tiles_1x/interior.png","collision_code":1,"states":{"dawn":1189,"day":1190,"dusk":1191,"night":1192}}, ...],
 "multi_tile_objects":{"house_player":{"w":5,"h":5,"tile_name_pattern":"house_player_<row>_<col>"}, ...}}
```
- Ids above are from the current `tileset.json` (core ids are stable: extra modules register after the core kit; biome x_ tiles keep 5001..5677). Always look tiles up by `name`, not by a hard-coded id.
- `id` 0 means empty. Animation `frames` are indices on the same sheet. Looping animations (water: 4 frames at 220 ms) cycle all the time.
- **Triggered animations** have `"type":"rustle","trigger":"on_enter","loop":false`: draw `idle_frame` normally. When a character steps into the cell, play `frames` once at `frame_ms` (90 ms each), then return to idle. Play it on the cell's `tall_grass_*` deco tile, its `tall_grass_front_*` overlay tile and the `tall_grass_tips_*` tile in the cell above **in sync**.

### Tall grass and cave fern (encounter terrain)
Redesigned so it reads at a glance (checklist rule, Gary, Oct 22 2026): different value **and** saturation from plain grass (deep blue-green bed, bright yellow-green tips, violet glints), a dark outline, height (blades rise above the tile and cover a standing sprite from the waist down) and a walk-through rustle. Only `palette.hex` colours are used.
| tile | layer | meaning |
|---|---|---|
| `tall_grass_<NESW>_v<v>` | decoration | grass bed, `encounter: true`. `NESW` digit = 1 where that side is open (not tall grass), so the outline only runs round the patch edge. `v = (x+y)%2` |
| `tall_grass_front_<NESW>_v<v>` | overlay, `ysort` | front blades drawn over a sprite standing in the cell (the waist-up cover) |
| `tall_grass_tips_<EW>_v<v>` | overlay of the cell **above**, `ysort` | blade tips poking above a patch's top row |
| `cave_fern_*` | same three | the same shapes recoloured to cave teal + violet (Greystone encounter patches) |
`tools/tallgrass.py` draws them. `place_tall_grass(m)` in `tools/build.py` turns the `tall_grass` / `cave_fern` tokens in a map into the right bed, front and tips tiles on all three layers.

### Progression tiles
| tile | code | use |
|---|---|---|
| `rt_barricade` | block | Revival Tech checkpoint barrier (story gate; removed when cleared) |
| `crystal_barrier_lit` / `_dim` | block / walk | violet crystal wall, 2-frame hum; `states` blocked/cleared |
| `fallen_log_t/m/b` | block | fallen trunk across a trail, 3 tiles tall (story gate) |
| `bike_rail_h` / `_v` | `bike_only` (8) | narrow boardwalk: only on the bike |
| `ramp_e` / `ramp_s` | `ramp` (9) | bike jump: enter moving east / south on the bike, land 1 tile past it. One-way, like a ledge. Blocked on foot |
- **Stateful tiles** carry `states`, a map from state name to tile id. To change state, swap the id in the `decoration` layer.
  - `push_boulder` (code 5)
  - `plate_cave_off/on` and `plate_hall_off/on` (code 7)
  - `crystal_switch_off/on` (code 1, interact)
  - `gate_cave_closed/open` and `gate_hall_closed/open` (closed = code 6, open = code 0)
- Transition names read `B>A_NESW_<sides>_<diagonals>`. For example, `path>grass_1000_0000` is a path tile with grass to the north.

## 7. Map format (`maps/<name>.json`)
```
width, height, tile_size (64), tileset
layers:
  ground      [h][w] tile ids (already autotiled)
  decoration  [h][w] props, buildings, ledges, bridges, tall grass, tree bases, puzzle objects in their START state
  overlay     [h][w] drawn ABOVE characters (canopies)
  collision   [h][w] 0 walk | 1 block | 2 ledge (south only) | 3 water | 4 door/warp | 5 boulder | 6 gate (closed) | 7 plate (walkable trigger) | 8 bike only | 9 ramp (bike, one-way)
  encounter   [h][w] 0 none | 1 tall grass | 2 cave floor (low rate)
warps:   [{x,y,to,tx,ty,facing,note}]
exits:   [{edge,start,end,to,offset,note}]
npcs, signs, items, encounter_zones   (as before; npc kinds include master)
puzzle:  (optional, see section 8)
story_gates:  [{id, flag, earned_at, cells[{x,y,blocked_tile,cleared_tile}], npc, lines{blocked,cleared,status}, cleared_state, detour, blocks{from_entry,to_entry}}]   (CRITICAL_PATH.md)
forced_grass: [{id, x0,y0,x1,y1, kind, between[entryA, entryB]}]   encounter rect you cannot walk around
fly_point:    {x, y, facing, visited_flag, landing, skill}   towns/cities only (FIELD_SKILLS.md)
bike:         {areas[{id, cells, kind, note}], no_dismount_cells[[x,y]...], rule}   (MOVEMENT.md)
movement:     {run, bike, note}   which modes the map allows
player_start: {x, y, facing, when, note}   house_2f only: (2,4) facing down, new game with no save
interact_spots: [{id, kind (prop|trigger), x, y, stand[x,y], face, tile, text, ...}]   Text Bot named spots (section 14.6)
bin_stages / ambient / flag_swaps / mood   soul-pass keys (section 14), only on the maps that use them
npcs_pending_text / signs_pending_text     ids placed in the world whose text Text Bot hasn't written yet
```
- `collision` is written in the **blocked** state of every story gate. Apply cleared gates on load.
- Collision is precomputed. A tree canopy blocks its tile.
- **Exits (edge strips):** `edge` = side of this map, `start..end` = cells along that edge (x for north/south, y for east/west). Cell `i` leads to cell **`j = i + offset`** on the **opposite edge** of `to` (leave north, arrive on the target's south row, and so on), keeping the facing. Example: route1 south x4–5, offset 6 → brookhollow north x10–11.
- **Doors (code 4):** every code-4 cell must have a warp. A door with nowhere to go must be drawn as a block (code 1), never as a dead door. `run.py` reports any code-4 cell without a warp.
- **New game:** start on `house_2f.player_start` (2,4) facing down. The progression check's world graph starts there too.
- **Ledges (2):** can only be entered moving south. The player hops and lands on the tile below the ledge.
- **Warps (4):** `to: "$return"` means "back to the door you came in through, one tile below it, facing down". Store the last door used. It is used by the shared interiors (shared heal branch, mart, station, and the 4 shared home designs; see section 15).
- Every building door now has an interior. The only remaining `TO COME` links are map-edge exits to unbuilt zones (Brookhollow east, Route 1 east, Thornwood east, Greystone B1 north). Show a "the path ahead is closed" message on those. Three of them are also behind story gates (CRITICAL_PATH.md).

## 8. Puzzle format and rules
```json
"puzzle": {
  "boulders": [{"id":"b1","x":18,"y":10}],
  "switches": [{"id":"p1","x":22,"y":6,"type":"plate","channel":"north_gate","mode":"hold","start_on":false},
               {"id":"cM","x":7,"y":10,"type":"crystal","channel":"B","mode":"toggle","start_on":true,"toggles":["cL","cM","cR"]}],
  "gates":    [{"id":"g1","x":20,"y":4,"channel":["north_gate","north_release"]}],
  "goal":     {"x":20,"y":1,"what":"north passage"},
  "rules": "...", "solution": "...",
  "verified": {"states_explored":..., "gated_targets":[...], "shortest_solution":{...}, "legend":"..."}
}
```
- **Channels.** A channel is ON when every switch on it is on. A gate opens when **any** of its channels is on; `channel` may be a string or a list. An open gate is walkable (swap in the `_open` tile, code 0). A closed gate is code 6.
- **Plates (code 7, walkable):**
  - `latch`: turns on the first time the player or a boulder enters it, and stays on.
  - `hold`: on only while a boulder or the player is standing on it.
- **Crystal switches (code 1):** the player faces one from an adjacent tile and presses A. That flips every switch in its `toggles` list (XOR). Lit = on.
- **Boulders (code 5):** walk into one to push it a tile, if the tile beyond is walk or plate. Boulders can't be pushed onto doors, water, ledges, gates or other boulders. They **reset when the map reloads**, as do hold plates and crystals. Latches stay set (save them).
- **Reset:** on every map load, boulders go back to their start cells, hold plates go off and crystals go back to `start_on`. Latch plates stay on once set (save them per map, e.g. `puzzle.<map>.<id>`).
- `run.py` solves every puzzle by BFS over (player tile, boulder positions, switches on). It writes `verified` = `{start, states_explored, gated_targets, shortest_solution{target: moves}, legend}` with the shortest move string per target. Legend: `U/D/L/R` = step, `X*` = a step that pushes a boulder, `A<id>` = touch crystal, and a number = repeat.
- It also proves the puzzle really gates something: with gates closed and no switches, `gated_targets` can't be reached.
- Then the connectivity check runs in the solved state.

Built puzzles:
- **Greystone B1:** a push-boulder onto a hold plate.
  - Rocks block the straight line, so the boulder has to go east 1, north 4, then east 3 onto plate (22,6). That holds gates g1/g2 open to the north passage.
  - A release crystal on the far side lets players coming from Frostspire open the gate.
- **Fernwick Master's Hall:** two tiers.
  - (A) Two latch plates in the far corners of the entry hall open the lower crystal gate.
  - (B) Three linked crystals: L flips L+M, M flips L+M+R, R flips M+R, and M starts lit. All three must be lit. Solution: touch L, then R.
  - That opens the upper gate to the battle ring and the master on the dais.

## 9. Built maps
| map | size | links / content |
|---|---|---|
| brookhollow | 34x26 | N x10–11 → route1; doors: player house → house_1f, heal centre, RT Supply, Revival Tech office → office_int, two houses → house_int_a / house_int_b; E edge stub (to come) |
| house_1f / house_2f | 12x10 / 10x8 | 1F mat → brookhollow; stairs 1F(10,3) ↔ 2F(8,3); new-game spawn 2F |
| route1 | 44x34 | S x4–5 → brookhollow; heads north, then bends **north-east**; N x4–5 → fernwick; E y4–5 stub → Sunmeadow (to come). Simple: ledges, 7 grass patches, 3 trainers. **Forced grass** `r1_north_choke` under Fernwick; **crystal barrier** story gate at the east exit (x41); optional **bike boardwalk** over a marsh strip (x10–18, y10); hidden tonic in grass (38,8) |
| fernwick | 30x24 | S → route1, E y9–10 → thornwood; heal centre, shop, Master's Hall → fernwick_hall_int, three houses → house_int_c / a / b |
| fernwick_hall_int | 16x18 | Master's Hall: entry hall with latch plates and helper trainers; crystal gallery; battle floor with arena ring, master's dais, pillars, braziers, banners |
| thornwood | 36x30 | W y9–10 → fernwick; cave mouth (17,5) → greystone_entrance; E y21–22 stub. Light tree maze with dead ends, 4 grass clearings, pond, mud. **Hidden shortcut:** a ledge row at y8 x6–9, screened by trees, drops from the cave plaza back to the west path (one-way, south only). **Forced grass** `tw_east_choke` before the cave plaza; **fallen-log** story gate at the east exit (x33); optional **bike ramp pocket** (16–19, 13–16) with a cache item; hidden seed (8,25) |
| greystone_entrance | 28x22 | S mats → thornwood; stairs (5,6) → greystone_b1; pool, ledge, crystals (the north opening is sealed; the way on is through B1). **Forced cave fern** in the mouth (13–14, 19–20); optional fern patch hiding `gs_item` |
| greystone_b1 | 30x24 | stairs (4,4) → entrance; three rooms with a corridor; underground pool; boulder puzzle gating the N exit x20–21 → Frostspire pass (to come) |
| heal_centre_int / shop_int | 14x10 / 12x9 | shared, exit `$return` |
| house_int_a / b / c | 11x9 each | kitchen / library / family layouts, shared, exit `$return` |
| office_int | 16x12 | Revival Tech field office: desks with PCs, filing cabinets, water cooler, bookcase, crystal display, reception counter |
| lantern_rest | 16x15 | memorial glade off greystone_entrance (0,11) ↔ (7,14); 8 epitaph stones + 1 blank stone, keeper, paper lanterns; no battles or encounters (section 14.4) |
| mirefen_bog | merged | biome worker's bog (maps_new/mirefen_bog.json), bike boardwalk, fog layer (section 13) |
| station_int | merged | shared Lumen Line station interior (maps_new/station_int.json), exits `$return`; handcar at (18,3) (section 14.5) |
| route1_storm | variant | `maps/variants/route1_storm.json`: Route 1 east lowland flooded while `storm_season`; same ids and text as route1 |

`world_layout.json → maps_built` lists every built map, **including the merged mirefen_bog and station_int** and lantern_rest (18 maps).

**PATH_GRASS_STUDY.md §4 changes (Oct 22 2026):**
- Brookhollow: 6x5 cobble plaza at the crossroads (lamps + a lumen crystal landmark), 3x2 forecourts at the heal centre and shop, a 2-wide south road.
- Route 1: south-only ledge loop at y16 (4 capped runs split by rocks), so the trip north is longer and the trip home hops down; a ragged grass band north of it; patches grown into notched blobs (~16% of area); trail aprons at the fork and bends; crystal at (25,19) as the eye-lead; trainers re-aimed across their corridors. The entrance sign `sign_r1_s` is at **(6,30)**.
- Thornwood: shortcut row y7 reopened; `tw_east_choke` 6 deep (20–25, 21–22); optional patch round the hidden feed (5,17); notched patches; trail aprons; trainer_tw_b covers the full 2-wide corridor.
- New signs are **pending Text Bot ids** (no text yet, not added as ids in the base maps): route1 (22,17), thornwood (21,8) and (19,24), brookhollow (12,2) north exit and (29,11) barricade.
- Before / after: `qa/before_previews/<map>.png` vs `qa/after_previews/<map>.png`, side by side in `qa/after_previews/compare_<map>.png`.

`tools/run.py` checks the following on every build:
- every entrance and exit reaches every other one, respecting ledges, and puzzle maps are checked in the solved state;
- every puzzle is solvable and actually gates its targets;
- each warp lands on a walkable tile of an existing map;
- every code-4 door cell has a warp;
- every `interact_spots` entry: stand cell walkable, stand + face reaches (x,y), the decoration tile at (x,y) starts with `tile`, triggers stand on their own cell;
- no door warp is `TO COME`;
- no NPC or item is on a blocked tile;
- **progression (tools/progression.py)** per flag state: story gates hold and force their detour, forced grass can't be walked around, no soft-locks (walking or riding), the bike stays optional, every next flag is reachable, and Skylift / Lumen Line add no reachability. See CRITICAL_PATH.md §6.

**Current result: ALL CONNECTED, both puzzles solvable and gated, PROGRESSION: PASS.** The report is printed, and `verified` is written into the map JSON.

## 10. Loading sketch
```js
const ts = await (await fetch('tileset_3x.json')).json();   // pick set by resolution; ts.tile_size = 192
const S = ts.tile_size;
ctx.imageSmoothingEnabled = false;                           // + CSS: canvas { image-rendering: pixelated; }
const byId = new Map(ts.tiles.map(t => [t.id, t]));
function drawTile(id, sx, sy, now) {
  if (!id) return; const t = byId.get(id);
  let idx = t.index; const a = t.animation;
  if (a && a.loop !== false) idx = a.frames[Math.floor(now / a.frame_ms) % a.frames.length];
  else if (a && a.type === 'rustle') { const k = Math.floor((now - rustleStart(sx, sy)) / a.frame_ms);   // per-cell start time, set on_enter
    idx = (k >= 0 && k < a.frames.length) ? a.frames[k] : a.idle_frame; }
  ctx.drawImage(sheets[t.sheet], (idx % 16) * S, Math.floor(idx / 16) * S, S, S, sx, sy, S, S);   // sx, sy integers
}
```
Alternatively, load `tileset.json` (64 px) and draw with an integer zoom.

**Text.** Player-facing lines are in `/workspace/kilumen/text/overworld_lines.json` (Text Bot). Map `npcs[]` / `signs[]` carry `text_ref` (`maps.<map>.<id>`); story gates carry `lines.before/after` (`blockers.<gate id>.*`). A sign's own `text` field is only a dev label. Before showing a line, fill its placeholders: `{player}`, `{creature}`, `{skill}`, `{coin}`, `{city}`, `{nearest_station}`, `{run_button}`, `{bike_button}` and **`{coins}` = number of challenge coins held** (count of `beat_master_*` flags, 0-8; used by the arena doorman). The full list is `_meta.placeholders`. Player-facing text says "coin", never "badge", and never "fly".

## 11. Gaps / to come
- 8 of 13 zones aren't built yet. See world_layout.json and PUZZLE_PROGRESSION.md for their planned puzzles.
- Snow pines, swamp bog water, fog and the train station come from the biome worker (`tools/biomes_extra.py`, `maps_new/`) and are merged (section 13).
- Buildings are front-facing only.
- **Player sprites exist:** walk = `/workspace/kilumen/art/characters/pixel/humans/cal/overworld/` (`cal_chibi_sheet.png`, `_2x`, `_3x`, per-direction `cal_chibi_walk_<dir>_<2x|3x>.gif`); run + bike = `/workspace/kilumen/art/characters/pixel/humans/cal/run_bike/` (`sheets/cal_chibi_run_sheet*.png`, `sheets/cal_chibi_bike_sheet*.png`, `frames*/`, README.md, MOVEMENT_NOTES.md). Other NPC and overworld creature sprites are still to come; NPC spots are markers (section 3 for sizes).
- Interiors are being redone by the interiors worker in `interiors_new/` (home_*, heal_*, mart_* ...). The window / interact-spot work in section 14 is on the current house_1f / house_2f / house_int_a/b/c / office_int / heal_centre_int; the window tiles can be reused there.

## 12. Hooks for other workers (don't edit their files here)
- **Tiles:** `tools/build.py` → `EXTRA_TILE_MODULES = ['biomes_extra', 'extra_merge', 'soul_art']` (just before `# ---------------- map model`). Any listed module in `tools/` that defines `register(reg, reg_multi)` is imported and called there. Signatures: `reg(name, cat, frames, coll='walk', enc=0, ms=None, notes=None, raw=False, states=None, anim=None, ysort=False)` and `reg_multi(name, im, cat, door_cells=(), walk_cells=(), all_walk=False)`, as the core kit uses them. Tiles get ids appended after the core kit, and land in `tileset*.json` and the sheets automatically. A **new ground terrain** used by the autotiler also needs a `PRIO` and `BASEFN` entry. `register()` can add these itself (`import build; build.PRIO['bog'] = 1; build.BASEFN['bog'] = fn`, since both dicts exist before the hook runs), or the overworld owner can add them to `build.py`.
- **Maps:** `tools/run.py`, right after `from maps import *`, executes every `overworld/maps_new/*.py` (and `tools/maps_new/*.py`) in file-name order, with the run.py globals (`Map`, `MAPS`, `BYNAME`, `place_tall_grass`, `story_gate`, `forced_grass`, `fly`, ...). A file builds its map(s) and calls `MAPS.append(m)`. The maps then go through every check (connectivity, puzzles, progression).

## 13. Biome worker merge (EXTRA_TILES.md)
- `tools/extra_merge.py` (overworld owner) **reads** `tileset_extra.json`, `tiles_extra/`, `maps_new/*.json` and imports helpers from `tools/biomes_extra.py`; it never writes them.
- Tiles: the 677 `x_` tiles keep ids 5001..5677 and land in `tileset*.json`. `x_` copies of base tiles (`x_grass_*`, `x_path_*`, `x_water`, `x_path>grass_*`, `x_water>grass_*`) carry `alias_of` and maps use the base id. Fog becomes `fog_<NESW>_p<px><py>` (5x3-tile noise period instead of 2x2). Plain extra ground `x_<t>_<v>` becomes seamless `xs_<t>_<hash>` (snow, ice, mud, moss). Base `snow_*` resolves to Frostspire `x_snow_*`. Flood / deep water join the autotiler (collision 10 ice, 11 deep water).
- Maps: `mirefen_bog` and `station_int` are imported with precomputed layers and go through every check; their npcs/signs are written as `npcs_pending_text` / `signs_pending_text` (Text Bot v0.4.0 now fills `maps.mirefen_bog.*` and `maps.station_int.*`).
- `tools/storm.py` builds `route1_storm` (east lowland: water needs Tideglide, deep never crossable, flood walkable). **(31,13) stays dry**, because trainer_r1_b stands there.

## 14. Soul pass + Text Bot v0.4.0 hooks
All tiles in `tools/soul_art.py` (registered last, so core ids don't move); same pixel rules (transparent object + one shadow colour, palette only, no seams). Map keys are written by `run.py` from `m.soul` / `m.interact_spots` (`tools/maps.py`, section "SOUL PASS" and "Text Bot v0.4.0").

### 14.1 Ron's bin (brookhollow 7,8)
`bin_ron_0..8` + `bin_ron_empty` (deco, block, `states` "0".."8","empty"). Map key `bin_stages`: stage = Master coins earned → `bin_ron_<stage>`; from stage 6 also draw `bin_flies` (overlay, 3 frames, 140 ms) on the same cell; after `finale_done` → `bin_ron_empty`. E5 Bin Monument is interactable only at stage 8 before the finale. Interact spot `bin_ron` (stand (6,8) facing right).

### 14.2 Ambient life
- `ambient.fish_spots` on brookhollow (river) and thornwood (pond): `fish_shadow` (4 frames, shadow colour only) drifts within 1 tile; `fish_ripple` plays once when it turns; hide while raining.
- `tileset.json → ambient.footprints`: when the player leaves a cell whose ground name starts with a listed prefix (snow, sand, mud), spawn `footprint_<surface>_<dir>` under characters; it fades full → 60% → 30% (3 x 1333 ms) and is removed; max 24; none while biking.

### 14.3 Time of day (#9)
- `tools/time_of_day.py` (called at the end of `run.py`; can also run alone) writes `time_of_day/grades.json` (per grade: exact palette hex → hex map, shadow colour, schedule, `indoor_rule`) and `time_of_day/lut_<grade>.png` (64x64 3D LUT: blue slice k at tile (k%4, k//4), red = x, green = y in each 16x16 slice, steps of 17), plus `previews/time_of_day.png`.
- **day = identity.** Dawn = soft rose, dusk = warm amber, night = cool blue. Warm lights (lamps, lit windows) stay lit at dusk/night; violet crystals keep glowing at night. No gradients, no repaint: it is a 1:1 palette swap (or the LUT in a shader).
- Interiors and caves stay on `day`. Lantern Rest follows the clock.

### 14.4 Lantern Rest
16x15 glade west of greystone_entrance (warp (0,11) ↔ lantern_rest (7,14)). Stones `stone_1..8` (`memorial_stone_a/b/c`) and `stone_blank` (7,3) are pending sign ids; keeper (9,5) is a pending npc. `flag_swaps`: (7,3) `memorial_stone_blank` → `memorial_bench` when `field_team_home` is set. `mood`: no battles, no encounters, own music, warm light. Proposed new flags (not in STORY_FLAGS yet): `finale_done`, `field_team_home`.

### 14.5 Wall windows and the station handcar (Text Bot v0.4.0)
- **Windows:** 1x2 wall-mounted interior tiles `window_<phase>_t` (wall row 1) + `window_<phase>_b` (wall row 2, the interact cell), phase = dawn / day / dusk / night, block, `states` per phase on both halves. Maps store `window_day_*`; swap both halves to the current phase. Only the glass changes: day = blue sky + cloud, dawn = lavender + gold horizon, dusk = coral + amber (warm), night = deep blue + stars + crescent moon; the frame, curtains and room stay on the day grade (interiors rule). Placed (x, y=2, stand (x,3) facing up): house_1f x4, x8; house_2f x3, x7; house_int_a x6; house_int_b x6, x9; house_int_c x3, x8. Spot ids `window_1`, `window_2` per map → Text Bot `maps.<map>.window_<n>` using `prop_templates.window` lines. Crops: `qa/v040/`.
- **Handcar:** `handcar_locked` (deco, block) at **station_int (18,3)** on the track, chained to the buffer stop at (19,3); `handcar_new_padlock` after `beat_master_frostspire` (E8 line). It is locked and empty on purpose; it never moves. Added in `tools/maps.py apply_v040_imported()` after the import, so `maps_new/station_int.json` is untouched. Interact spot stays `rail_buffer` (19,3), stand (19,4) up; its `world_prop` field names the handcar.

### 14.6 interact_spots (Text Bot v0.4.0 named spots)
Each map JSON with spots has `interact_spots: [{id, kind, x, y, stand, face, tile, text, ...}]`. `x,y` = cell the player faces, `stand` = where the player stands, `tile` = prefix of the decoration tile at x,y, `text` = `maps.<map>.<id>` in overworld_lines.json. Props fire on A while standing on `stand` and facing `face`; triggers fire on stepping onto/standing on their cell when `trigger_when` holds.
| map | id | x,y | stand | face | tile |
|---|---|---|---|---|---|
| brookhollow | bin_ron | 7,8 | 6,8 | right | bin_ron (stateful, 14.1) |
| brookhollow | bridge_mid (trigger) | 23,12 | 23,12 | up | bridge_h; `trigger_when {phase: dusk, standing_still_s: 10, facing: up, lead_type: water}`, once per dusk |
| house_1f | tv / window_1 / window_2 | 7,3 / 4,2 / 8,2 | below | up | tv / window_ |
| house_2f | pc (opens company_inbox) / bed / window_1 / window_2 | 4,3 / 1,3 / 3,2 / 7,2 | 4,4 / 2,3 / 3,3 / 7,3 | up / left / up / up | pc / bed / window_ |
| house_int_a | window_1 | 6,2 | 6,3 | up | window_ |
| house_int_b | bookcase_left / bookcase_right / window_1 / window_2 | 1,2 / 3,2 / 6,2 / 9,2 | below | up | bookcase / window_ |
| house_int_c | tv / window_1 / window_2 | 6,3 / 3,2 / 8,2 | below | up | tv / window_ |
| office_int | bookcase / water_cooler / crystal_display / dana_desk | 8,2 / 12,2 / 14,2 / 12,8 | below | up | bookcase / cooler / crystal_display / desk_pc |
| heal_centre_int | sofa | 1,7 | 1,8 | up | sofa |
| station_int | rail_buffer | 19,3 | 19,4 | up | x_rail_buffer (handcar at 18,3) |

## 15. Interiors hookup (Brookhollow + Fernwick to interiors_new, 2026-10-22)
`tools/interiors_merge.py` imports 13 maps from `interiors_new/maps/`. It never edits `interiors_new/`.
- **Tiles:** the `i_` tiles take ext ids 7001-7490 and are drawn from the interiors_new sheets. `interiors_merge` is last in `EXTRA_TILE_MODULES`.
- **New building:** a `lab` building (Lumen Lab) is placed on a new south lot in Brookhollow. Brookhollow is now 34x32.
- **Door table:** `run.py` writes `qa/interiors_hookup/door_table.json`; `qa/interiors_hookup/DOOR_TABLE.md` is the readable table built from it.

### Rule
- Unique interiors are only for story-necessary buildings, and each one is listed with its reason.
- Every other home uses one of exactly 4 shared designs (H1-H4):
  - `@home_pool` doors in an area are sorted by (y, x); door k gets design `POOL[(areaIndex + k) % 4]`.
  - So every run of 4 houses uses all 4 designs, and neighbouring doors never repeat a design.
  - Each door also gets a recolour scheme: the first scheme in the rotated `SCHEME_ORDER` that this design hasn't used yet in the area and that differs from the previous door's scheme.
- There is one shared heal branch, one mart and one station. Shared interiors exit with `$return`.

### Why-unique table (story-necessary buildings only)
| Interior | Story reason |
|---|---|
| house_1f | player's house 1F: Ron, E2 3 a.m. Static (TV), 8.5-F Ron's CV |
| house_2f | player's house 2F: player_start, E3 Dana's Drafts (PC), E14 Dreams Move Upstream (bed) |
| office_int | RT field office: promotion cutscene (critical path), E9 The Crystal Stares Back, 8.5-B Dana's Desk |
| fernwick_hall_int | Master of Fernwick hall: gating puzzle + coin (beat_master_fernwick, critical path) |
| lab_brookhollow | Lumen Lab: starter choice (got_starter) and 8.1 lab-tech onboarding |
| rt_branch_backroom | RT branch back room: story hook behind the STAFF ONLY door (has_branch_card) |
| home_brookhollow_b | E13 The Fireside Book: the scholar + his bookcase (was house_int_b) |
| home_fernwick_a | 8.5-E The Kid's Last Joke: parent_c (job ads) + kid_c, TV (was house_int_c, door fernwick (22,6)) |
| heal_fernwick | 8.5-E: parent_c later works here as a Care Associate (the Fernwick branch needs its own state) |

### Shared home designs (exactly 4)
| Id | Map | Size | Style |
|---|---|---|---|
| H1 | home_brookhollow_a | 10x8 | oak cottage, fireplace, red rug |
| H2 | home_fernwick_c | 12x9 | pine lodge, big sand rug, fishing corner |
| H3 | home_lanternport_c (+ home_lanternport_c_2f) | 12x10 + 2F | teal parquet family home: kitchen, sofa, TV; bedroom upstairs |
| H4 | home_saltmere_a | 12x9 | driftwood-and-stone seaside room, teal rug |

Shared chains: heal = `heal_brookhollow` (any town without a story reason for its own branch), mart = `shop_int`, station = `station_int`.

### Per-area assignment
**Brookhollow** (area index 0)
| Door | Interior | Kind | Recolour |
|---|---|---|---|
| (5, 7) | house_1f | unique | - |
| (6, 19) | heal_brookhollow | heal (shared chain) | - |
| (16, 19) | shop_int | mart (shared chain) | - |
| (28, 8) | office_int | unique | - |
| (15, 7) | home_brookhollow_a | home (shared H1) | identity |
| (28, 19) | home_brookhollow_b | unique | - |
| (16, 27) | lab_brookhollow | unique | - |

**Fernwick** (area index 1)
| Door | Interior | Kind | Recolour |
|---|---|---|---|
| (5, 6) | heal_fernwick | unique | - |
| (16, 6) | shop_int | mart (shared chain) | - |
| (22, 6) | home_fernwick_a | unique | - |
| (16, 18) | home_lanternport_c | home (shared H3) | slate |
| (5, 17) | home_fernwick_c | home (shared H2) | ochre |
| (23, 18) | fernwick_hall_int | unique | - |

### Retired and spare maps
- **Retired** (left in `maps/`, nothing warps to them, and `check` fails if anything does): house_int_a, house_int_b, house_int_c, heal_centre_int.
- **Spares** (kept in interiors_new and marked unused, 36): hall_aurelith, hall_cindervale, hall_lanternport, hall_revival_heights, hall_saltmere, heal_aurelith, heal_cindervale, heal_lanternport, heal_revival_heights, heal_saltmere, home_aurelith_a, home_aurelith_a_2f, home_aurelith_b, home_cindervale_a, home_cindervale_b, home_cindervale_b_2f, home_fernwick_b, home_lanternport_a, home_lanternport_b, home_revival_heights_a, home_revival_heights_a_2f, home_revival_heights_b, home_revival_heights_c, home_saltmere_b, home_saltmere_b_2f, home_saltmere_c, mart_aurelith, mart_cindervale, mart_lanternport, mart_revival_heights, mart_saltmere, rt_hq_lobby, station_aurelith, station_lanternport, station_revival_heights, station_saltmere.

### Staff door
- `heal_*` (10,2) leads to `rt_branch_backroom`, locked by the `has_branch_card` flag.
- `run.py` checks that the approach tile is reachable, that the back-room landing is walkable, and that its `$return` comes back to the approach tile.

### Text for the new maps: `text_pending`
- NPCs, signs and interact_spots for imported maps are written under `text_pending` (npcs / signs / interact_spots). They stay out of the Text Bot validator lists until Text Bot promotes them.
- Carried-over lines keep `text_was` (old map.id). See section 15.1.

### 15.1 Per-door house recolours (Coder's final format)
- **Draw order:** recolour swap first, then the time-of-day grade (`time_of_day.apply`). Interiors render on `day` (indoor_rule), so in-game the grade is the identity. The previews still check all 4 phases.
- **File:** `home_recolours.json` (staged at `qa/interiors_hookup/interiors_new_staging/`; it belongs in `interiors_new/`).
  ```json
  {"status":"DRAFT","version":"0.1.0 (2026-10-22)","palette":"art/world/overworld/palette.hex","note":"...",
   "schemes":{"identity":{"label":"...","map":{}},"sage":{"label":"Sage","map":{"#f8eabe":"#a6d460", "...": "..."}}},
   "recolourable":{"i_wall_upper_win_brook":{"id":7xxx,"mask":"masks/i_wall_upper_win_brook.png"}, "i_bed_brook_0_0":{"id":7111,"mask":null}},
   "doors":[{"map":"fernwick","door":[16,18],"interior":"home_lanternport_c","design":"H3","recolour":"slate"}]}
  ```
  - Door warps carry `"recolour": "<schemeId>"`. A missing value or `identity` means no change.
  - Only tiles in `recolourable` are swapped.
  - A mask is an 8-bit greyscale 64x64 image at 1x, where 255 means recolour. Masks are used for window walls, where only the plain-wall pixels change.
- **Never recoloured:** windows, NPCs, props (including Text Bot prop tiles), doors/mats, lights, plants and appliances.
- **Schemes:** identity, sage, rose, ochre, slate, teal, sky.
  - Each one shifts whole colour families (paper, wood, red, green, teal, blue) onto ramps in `palette.hex`, light to dark, keeping every shade distinct.
  - Wallpaper uses hand-built 4-shade ramps, and wood shifts by one step.
- **No night glow:** the night grade keeps warm lights and the violet crystal accent bright (fcd668 e8ce92 ecdec4 f8eabe 603096 8a4ace b076ec d6acff). No scheme maps a non-glow colour onto one of those, and there is no violet scheme.
- **Checks** (`check_recolours`, run by `run.py`):
  - lowercase palette hex;
  - every destination has an entry in all 4 grades;
  - every family shade is mapped and order is kept;
  - identity is empty;
  - no fixed-detail tile is recolourable;
  - masks are L 64x64 with values 0/255;
  - door schemes exist;
  - no non-glow → glow mapping.
- **Previews:**
  - `previews/home_recolour_grid.png`: designs × day/night × 7 schemes.
  - `previews/home_recolour_phases.png`: dawn/dusk.
  - `previews/interiors_phases.png`: 13 maps × 4 phases.
  - `qa/interiors_hookup/after/towns_phases.png`.

## 16. World data pass (2026-10-22): furniture colours, Text Bot v0.4.2/0.4.3 hookup, parity, Animator tags, mechanics data
Everything here is generated by `tools/run.py`; the hand-kept data lives in `tools/world_data.py` (apply / text_spots / tag / check / write / zone_wiring / late_tiles) and `tools/world_props.py` (terminal art).

### 16.1 Furniture never shares colour codes with the floor or walls (GAME_QUALITY_CHECKLIST)
- **Check:** `tools/furniture_colours.py` (run at the end of `run.py`, line `FURNITURE COLOURS: OK, 0 overlaps`). It covers 19 interior maps × every recolour scheme that can apply to each map, and writes `qa/furniture_colours/report.json`.
  - floor / wall / furniture classes by tile name.
  - Not counted: doors, mats, stairs, windows, lights, puzzle tiles and NPCs. These are never recoloured.
  - Window walls count only through their plain-wall pixels.
- **Fix:**
  - `tools/furniture_fix.py` + `tools/furniture_fix_table.json` swap colours per tile and keep every tile id. Never re-run `solve`, because the table is the art decision.
  - Every replacement is the nearest `palette.hex` colour not already in the tile, so shading steps stay distinct.
  - No night-glow colour is introduced.
  - The Revival Tech violet stays on branded furniture (the branch walls/floor went warm wine/rose).
  - Interior sheets are rebuilt from the pristine copies in `qa/furniture_colours/before/`.
  - The recolour schemes are scoped per design (`schemes.<id>.design`), so a scheme is only checked on the design that uses it.
- **Result:** 3341 overlaps before, 0 after.
- **Proof:** `qa/furniture_colours/compare.png` (H1–H4 + heal, before | after) via `tools/furniture_compare.py`, and `previews/home_recolour_grid.png`.

### 16.2 Company terminal (replaces i_pc)
- **Tile:** new core tile `i_company_terminal` (interior sheet, block).
  - It sits at (12,4) in `heal_brookhollow` and `heal_fernwick`.
  - Spot `company_terminal` keeps its id: stand (11,4), face right.
  - It has **no emissive**: the screen is not a light, and the violet crystal mark is the brand accent.
  - It is registered after every map is final (`world_data.late_tiles`), so no existing tile id moves.

### 16.3 Text Bot v0.4.2/0.4.3 hookup
- **Zones:** `world_layout.json zones[].maps` now lists every interior under the town(s) whose doors lead to it (`world_data.zone_wiring`).
  - Spare maps `station_int` and `home_saltmere_a` are not wired.
  - `home_lanternport_c(_2f)` is also listed under lanternport.
  - **For Coder (`zone_resolution`):** a shared map can sit in several zones. zone() = the zone whose maps list holds the outdoor map of the door used (lastDoor.map). On 2F/back-room maps, follow `$return` first.
- **Flags:** `got_starter`, `has_branch_card` and `puzzle_fernwick_hall_solved` are now in `world_layout.progression_flags` (`side: true`; `progression.SIDE_FLAGS`, CRITICAL_PATH §5).
  - got_starter is ordered before flg_promoted, which is the order Text Bot ranks lines by.
  - Item flags are `item_<map>_<id>`.
- **Spots** go in `text_pending.interact_spots` (the text is still Text Bot's):
  - `tv` / `bookcase` come from `unplaced.props`;
  - `window_*` spots are core `window_<phase>_t/_b` tiles with `states_by_phase` (old kit windows became plain wall);
  - `lap_nap_seat`;
  - the cook's data (Berry Snack, once) is on `home_brookhollow_b_parent` (8,4).

### 16.4 Animator soul data: `maps/<map>.json → tags`
| tag | cells | rule |
|---|---|---|
| `shallow` | walkable water-edge / reed cells | splash + wet footstep |
| `crystal` | every crystal / crystal_cluster / crystal_ore deco | sparkle (shadow-colour + violet only; no night glow added) |
| `firefly_zone` | open thornwood glades (≥18 open cells in 5×5) + fernwick pond bank x14–19 y19–20 | fireflies at Night (half at Dusk) |
| `bird_perch` | route1 walkable trail cells outside grass | birds land / take off when the player is ≥3 tiles away |

- **Lap-nap seat:** `lap_nap_seat` sits at **(2,4)** in both heal maps (moved by the interior scale audit; it was (1,8), under the phone d-pad).
  - The sofa is at (1,3)-(2,3) and the plant at (0,3).
  - Trigger: stand (2,4), face up, after standing still for 30 s (`trigger_when.standing_still_s`).
  - Big creatures go at (1,4) (`big_creature_slot`), and the follow slot is (2,5) (`follow_slot`).
  - The carer at (6,3) turns left.
  - The text is Text Bot's `e10_lap_nap`.

### 16.5 Mechanics data (MECHANICS_PARITY)
- **Encounters:** `encounters/encounters.json` covers all 7 zones with rate and slots.
  - Each slot has species, level range, weight, and optional time/weather/flood conditions.
  - There is a `variant_roll` hook.
  - It uses the 16 creatures with art, flagged `placeholder_species: true`.
  - Levels follow CRITICAL_PATH: sunmeadow 2–5, thornwood 9–13, greystone 20–25, mirefen 33–38, surf 34–39.
  - run.py checks that every encounter cell has a table.
- **Items:** each item has a unique `flag` (`item_<map>_<id>`).
  - 23 new items: 15 outdoor and 7 in unique interiors (shared/spare maps get none), plus one in `rt_branch_backroom`.
  - run.py checks:
    - visible items are solid and never cut a path;
    - hidden items are walkable;
    - each item is reachable with all flags;
    - no item is on a warp, stand or NPC.
  - Generic placeholder ids are listed in `items/ITEM_PLACEHOLDERS.json`, with names for Text Bot.
- **Fernwick Hall puzzle:** `puzzles/fernwick_hall_int.runtime.json` (also `maps/fernwick_hall_int.json puzzle.runtime`). It holds switches/gates with save_keys, channels, modes, initial state, a state schema and `solved_flag`.
- **Trainer sight:** each trainer now has `sight_range` (route1 4/3/4, thornwood 3/2, hall helpers 4, others 3, masters 0) and the computed `sight_cells`. run.py flags any line blocked at the first cell.

### 16.6 Reference parity (structure only; no names, numbers or text copied)
| mechanic | reference behaviour | status | owner |
|---|---|---|---|
| ice sliding | on ice the player slides in the facing direction until a solid tile or a non-ice tile stops them; no turning mid-slide | spec'd (below) | World map data / Coder runtime |
| trainer line of sight | a trainer sees N tiles straight ahead; stepping into that line stops the player, the trainer walks up and battles once | built data (`sight_range`, `sight_cells`), runtime spec'd | World / Coder |
| signs, terminals, bins | solid props; read only by facing them and pressing A, never by walking into them | built (`interact_spots`, collision 1) | World / Text Bot |
| heal counter | the carer stands behind a 1-tile counter; the player talks across it (A reaches 2 tiles over a counter); staff back room behind a locked door | built (counter row y4 x4–8, carer (6,3), talk from (6,5) facing up; STAFF ONLY door (10,2) → `rt_branch_backroom`, flag `has_branch_card`) | World / Coder |
| hidden items | invisible pickup found by facing + A | built (`items[].hidden`, unique flags) | World |
| Strength-style boulders | push a boulder one tile when nothing is behind it | built (Fernwick Hall / greystone_b1 puzzles) | World / Coder |
| cuttable bushes | a bush cleared by a field skill, back on map reload | **missing**; not built. Brushbreak is named; needs a tile + flagless respawn rule | World + Text Bot |
| Rock Smash rocks | a breakable rock with a field skill, can drop an item or start an encounter | **missing**; not built. Stonebreak is named; needs a tile + drop table | World + Coder |
| berry trees | a plant that regrows on a timer and gives berries | **missing**; not built. Needs a tile, growth states and save timers | World + Coder |
| PC / storage terminal | a creature box opened from the heal-branch terminal | **missing** (runtime). The `i_company_terminal` prop + spot exist; the storage UI is Coder's | Coder |
| fishing spots | facing water with a rod rolls a water table | **missing**; not built. `ambient.fish_spots` is only decoration; needs an item + `fish` tables in encounters.json | World + Coder |

- **Ice sliding (spec):**
  - New terrain `ice` (collision 0, tag `ice`). On entering an ice cell, keep moving in the same direction at walk speed with no input.
  - Stop on the first cell whose next cell is solid, an NPC or a boulder, or on reaching a non-ice cell.
  - Ledges and doors stop the slide, and the door still triggers.
  - Running/bike are ignored on ice. A puzzle is solvable when a BFS over stop-cells reaches the goal; run.py will check this when the first ice map exists.
- **Trainer sight (spec):**
  - Each frame, if the player stands on a cell in `sight_cells` and the trainer's `beat` flag is unset, freeze input, show "!", and walk the trainer to the adjacent cell. Then start the battle.
  - `sight_cells` stop at the first solid cell, NPC or warp.
  - A trainer's facing changes only by script.
- **Signs / terminals / bins:** these are solid (collision 1). A interacts only with the cell in front of the player. Walking into one does nothing (no auto-read).
- **Heal counter:**
  - A from (6,5) facing up reaches the carer at (6,3) over the counter cell (6,4). Counter tiles are flagged as talk-through.
  - The back room uses `locked_warps` (sign while locked, warp once `has_branch_card` is set).

## 17. Interior scale audit fixes, camera/touch rules, `--check` and the run lock (2026-10-22)
Source of the fixes: `qa/interior_scale_audit/REPORT.md`. Every fix is in the generator source (`tools/world_data.py` `audit_fixes()`, `tools/maps.py`, `tools/interiors_merge.py` CARRY_SPOTS, `tools/build.py`), so regeneration keeps it.

### 17.1 Map changes
| map | change |
|---|---|
| heal_brookhollow, heal_fernwick | Sofa moved to (1,3)-(2,3) and plant to (0,3) (row 3, out of the d-pad corner). `sofa` and `lap_nap_seat` spots at (2,4) facing up; big slot (1,4), follow slot (2,5). |
| heal_brookhollow, heal_fernwick | Single exit mat at (6,9); the (7,9) mat and its warp are gone. |
| office_int | Single exit mat at (7,11); the (8,11) mat and its warp are gone. |
| lab_brookhollow | `cradle_1` (5,6), `cradle_2` (7,6), `cradle_3` (9,6) are `interact_spots` (kind `prop`, tile `i_crystal_display`, stand on row 7 facing up, `pending_story_call: true`, `story_flag: got_starter`). The text waits on Story; `story.starter_choice.cradle_spots` lists them. |
| lab_brookhollow | Aide moved from (10,8) to (10,6), facing right (it was under the action buttons). |
| every interior | Chairs are solid (collision 1), as a generic rule in `build.py` (`plant`, `pc`, `tv`, `chair` and every `i_chair*`). run.py fails if an interior chair is walkable. |
| shop_int | Third shelf (`goods`) at (10,4)-(10,5) and a plant at (11,6). |
| fernwick_hall_int | helper_1 moved to (4,12) facing right, helper_2 to (11,12) facing left (out of the d-pad). The puzzle is still solvable. |
| fernwick_hall_int | `guide` moved from (10,16) to (9,14), facing left (beside the entry → gate A path; text id `guide` unchanged). At (10,16) it sat under the DBG/buttons zone on a 2340×1080 phone at @3 (780×360 CSS) with the player at (10,15). At (9,14) the guide and the player, on every free cell next to it ((8,14), (10,14), (9,15)), are clear of both touch zones at 844×390 @3, 2340×1080 @2.75, 2340×1080 @3 and 2400×1080. |
| 10×8 rooms | Height kept (8 tall is the tallest that fits 1080p PC and the 2340/2400 phones without scrolling). |

### 17.2 Camera and touch (for Coder)
- **Per-axis centring:** on each axis separately, if the room is smaller than the view, centre it on that axis (fill the rest with the void colour); if it is larger, follow the player and clamp to the room edge.
- **Zoom:** `pickZoom` = 1 if the CSS height < 600, otherwise max(2, floor(h / 480)). Visible tiles:

| platform | view | zoom | visible tiles (w × h) |
|---|---|---|---|
| PC | 1280×720 | 2 | 10 × 5.6 |
| PC | 1920×1080 | 2 | 15 × 8.4 |
| PC | 2560×1440 | 3 | 13.3 × 7.5 |
| phone | 844×390 @3 | 2 | 19.8 × 9.1 |
| phone | 2340×1080 | 2 | 18.3 × 8.4 |
| phone | 2400×1080 | 2 | 18.8 × 8.4 |
| tablet | 1024×768 @2 | 3 | 10.7 × 8 |
| tablet | 1024×768 @1 | 2 | 8 × 6 |

- **Touch safe area:** the d-pad covers 200×200 CSS px bottom-left and the buttons 300×120 CSS px bottom-right. In rooms 14 or more tiles wide, put nothing interactable (NPC, spot, sign, item) in columns 0-1 from row 4 down, or in the bottom-right ~4×2 tiles. `qa/interior_scale_audit/cam.py` reports any hit.
- **Remaining hit:** none. The fernwick_hall_int `guide` moved to (9,14) (see 17.1). Probe: `tools/probe_guide.py`, which imports the auditor's `audit.py`/`cam.py` unedited and adds the 780×360 @3 view.
- **For Coder or Gary to decide (not built):** a bottom-pin camera (when the room is taller than the view, keep the bottom row clear of the controls), and `pickZoom` = floor(h / 512).

### 17.3 Text ids check
run.py reads `/workspace/kilumen/text/overworld_lines.json` (read only) and checks that every id under `maps.<map>` (keys starting `_` are skipped) and every `unplaced.<section>.<key>.proposed_spot` id (`proposed_id` / `npc` / `id`) exists in the built map (npcs, signs, interact_spots, items, tags, text_pending). Entries with a null `proposed_spot` are skipped.
- Output: `TEXT IDS: OK (N ids ...)` or `TEXT IDS: FAIL` plus the missing ids.
- A full run still writes its outputs, then exits 1 when ids are missing, so a dropped spot is loud.

- `KILUMEN_LINES=/path/to/copy.json` points every text check (`world_data.LINES`, both TEXT IDS passes) at a copy. Use it to test Text Bot changes without editing Text Bot's file.
- TV and bookcase spots (`home_brookhollow_b.tv`, `home_lanternport_c.tv`/`.bookcase`, `home_brookhollow_a`/`home_fernwick_c`/`home_saltmere_a`/`home_fernwick_a`.bookcase) come from map geometry (`world_data.GEOM_PROPS`). Each spot is the object's bottom cell (`i_tv`, or `i_bookcase_<set>_1_0`), and the player stands on the cell below it, facing up. `unplaced.props` is no longer read, so Text Bot can delete those anchor stubs.

### 17.4 `--check` and the run lock
- `python3 tools/run.py --check` builds everything in memory and runs every check (world data, text ids, connectivity, puzzles, progression, recolours), then also checks the text ids against the maps on disk (`maps/*.json`). It writes nothing: write-mode `open`, `os.remove/rename/replace/makedirs`, `shutil` copies/rmtree, `PIL Image.save` and `np.save` are swallowed (the last line reports how many). It stops before the previews/time-of-day/furniture-colour output stage. About 30 s.
- **Lock file:** `/tmp/kilumen_run.lock` (`tools/runguard.py`). A full run takes an exclusive lock; `--check` takes a shared lock, so several checks can run together, but none runs while a full run is writing. The file holds `pid N started <time> cmd ...`.
- A second run waits up to `KILUMEN_LOCK_WAIT` seconds (default 600) and prints who holds the lock. `--no-wait` gives up at once.
- **Exit codes:** 0 = OK; 1 = a check failed (including TEXT IDS); 75 = gave up waiting for the lock (nothing was built or written).
- **Lock text:** while a full run holds the lock, the file reads `pid N started <time> cmd ...`. When the run ends (normally, on an exception or on SIGTERM), it is rewritten to `free (last holder: pid N started ...; ended <time>)`. Only a SIGKILL leaves the old `pid ...` line, but the flock is still released, so the next run never waits on it.

### 17.5 NPCs held for unbuilt maps
Text Bot keeps the text for both of these. No sprite and no spot here until their maps exist:
| id | text | home | why held |
|---|---|---|---|
| `restricted_airspace_officer` | `unplaced.npcs['station_int.restricted_airspace_officer']` (copy at `rail_only.npcs.airspace_officer`) | a rail-only city: revival_heights or aurelith | Neither map is built. Its sprite id was dropped from npc_sprite_map. station_int is a spare map whose board already carries the text. |
| `lucky_crystal_seller` | `unplaced_npcs.lucky_crystal_seller` (one line per zone plus default/ending) | one per city: saltmere, cindervale, lanternport, revival_heights, aurelith | None of these town maps is built yet; only house interiors that reuse their names exist. Place him in each town when it is built, and use his zone line there. |
