# Paths and Grass: a study of Pokémon routes and towns (Gen 3, 4 and 5) for Kilumen

*Prepared Oct 22 2026 for Gary. This is for inspiration only. No map layout, tile art or specific route is copied. Everything below is a general principle, a measured number, or an original Kilumen proposal.*

Kilumen map snapshot: `art/world/overworld/maps/*.json`, read at 19:12–19:16 CDT. Another worker is editing that folder, so re-check the coordinates before applying a fix. **Nothing in `art/world/overworld/` was modified.** Scratch analysis is in `design/_work/`: `stats.py` (path and grass metrics), `grid.py` (ASCII grids), `proto.py` (fix prototypes on in-memory copies) and `grids_now.txt`.
Diagram of the generic patterns, drawn from scratch: `design/path_grass_patterns.png`.

Coordinates are `(x, y)` in tiles, 0-based, the same as the map JSON. Ranges are inclusive. ASCII legend: `T` tree, `#` other block, `.` open ground, `=` path, `G` encounter grass, `v` ledge, `~` water, `b` bike-only, `R` trainer, `N` NPC, `S` sign, `i` item, `D` door.

---

## 0. TL;DR: the 10 takeaways

1. **Routes are 1.2–1.7x longer to walk than they are long, and the trip home is shorter.** On 9 measured classic routes, the outbound walk is 1.15–1.70x the map's long side. South-facing ledges make the return trip 2–44% shorter on all 9. Kilumen Route 1 is **0.75x**: a straight corridor, the same in both directions.
2. **First routes put grass in your way, and the dose is measured.** First routes have 14–23% of their area in tall grass (19–38% of walkable ground). The outbound path crosses 4–19 grass tiles, and the fewest-grass way home crosses 0–5. Route 1 has 10.4% of area and 3 forced tiles.
3. **A forced crossing needs about 6–10 steps to matter.** At about 11%/step (Gen 3), 3 grass steps trigger a battle about 30% of the time, 6 steps about 51%, and 10 steps about 69%. Both of Kilumen's forced chokepoints are only 3 steps deep.
4. **Grass is a blob, not a slab.** Use consolidated patches with uneven edges, notched corners and 1-tile holes (good for hidden items), and no lone stray tiles. A typical early patch is 12–40 tiles. Every Kilumen patch is a clean rectangle.
5. **Optional grass sits next to the path, and mandatory grass cuts across it.** Use both on every route. On the second and later routes, the forced share falls (4–14% of area) while trainers take over.
6. **Trainers watch corridors at right angles.** A trainer looking along a 2-wide road covers 1 lane and is skippable. A trainer beside the road looking across it covers both lanes and is mandatory. Sight is 2–3 early, then 0–7. Kilumen's 5 trainers have effective sight of 1, 1, 1, 3 and 3, and only one of them touches the main line.
7. **Keep one width and widen with intent.** A route trail keeps one width (2 tiles in Kilumen, which is good). It widens only at forks, landmarks and arrival points, and a signpost stands at every fork. Towns add a hierarchy: main road 2–3, plaza 4–6, door spurs 1.
8. **No tall grass in towns.** Towns use flowers instead (Brookhollow already does this). Town roads are paved and consistent. Route trails are a humbler material, and they can borrow the town paving for the first few tiles out of a city.
9. **Each route teaches one idea and has one landmark.** Examples: "grass and catching", "ledges are one-way", "trainers see you", "loops come back". The landmark (a pond, a log or a ruin) sits at a bend so the eye has a goal on the next screen.
10. **Screen-fit rules for Kilumen's camera.** The view is 15x8.4 tiles at 1080p and 13.3x7.5 at 1440p. Keep vertical sight at 3 or less and horizontal sight at 6 or less, so a trainer never spots you from off-screen. Keep each grass patch within one screen width (about 13 tiles or less), and put a bend or event at least every 1–2 screens (about 15–30 tiles of walking).

---

## 1. Conventions with numbers

### 1.1 Scale and screen

| Fact | Number | Source |
|---|---|---|
| GBA screen / GB screen | 15x10 / 10x9 cells | Crosley |
| DS (Gen 4) map block | 32x32 movement units per map chunk. Routes are built from one or more chunks. | DS Pokémon Hacking mapping guide |
| First routes | 2–6 screens. All routes: 2–10 screens (long side 20–108 cells). | Crosley |
| First leg, front door to first healer | 15–25 s of walking (Emerald 58 cells, FRLG 94 cells) | Crosley |
| Route area : town area | 1.97–3.87 | Crosley |
| Walkable share of a route | 27–77% | Crosley |
| Kilumen camera | 1080p x2 = 15x8.4 tiles; 1440p x3 = 13.3x7.5 tiles. Walk 4, run 8, bike 12 tiles/s. | OVERWORLD_README / MOVEMENT |

### 1.2 Paths

- **Width.** A route trail is a consistent 2 tiles in Gen 3 and Gen 4 tile maps (Gen 4 3D routes use the same grid). Fan-mapping guides warn against "7 wide then 1 wide": keep one passable width and change it only on purpose (PokéCommunity Daily 2017; Neti's tutorial). Bridges and piers squeeze to 1–3 tiles, which makes them natural chokepoints for an NPC or trainer (several of Gary's refs show this).
- **The path is a strip, not a gap.** A path drawn as an edge-tiled strip with rounded inner and outer corners (PWO wiki; Advance Map behaviour bytes) reads at a glance. Grass and trees then frame it. Kilumen already autotiles `path>grass*`.
- **Shapes.**
  - Gen 4's second route is a textbook snake: north, west into grass, north, east past a trainer, a split blocked by a ledge, south, east past a trainer, a large patch, north, west past a trainer, then a fork (Bulbapedia, Sinnoh Route 202).
  - The first Gen 4 route is a short trail that meets a T-junction with a sign. The trail "temporarily gives way to a long patch of tall grass", and a long ledge is the shortcut for people coming back (Bulbapedia, Sinnoh Route 201).
  - Gen 5's first route is a straight tree-lined path, but its grass sits at the start and the end, plus one patch beside the path (Bulbapedia, Unova Route 1). Even a straight route makes you cross grass.
  - The common shapes are the switchback or snake for early routes, the loop around a central feature (pond or hill) for exploration routes, and the long straight only when grass or trainers interrupt it.
- **Length.** The outbound walk is 1.15–1.70x the map's long side, and the walk home is 0.95–1.42x (Crosley).
- **Ledges.** A ledge is a one-way drop that blocks backtracking or early access and gives a shortcut home (Bulbapedia, Ledge). Ledges make the way home 2–44% shorter on all 9 measured routes. Typical runs are 4–7 cells with gaps or end-caps. Examples: Emerald Route 101 has 3 runs of 4 cells, and FRLG Route 1 has 61 ledge cells in 10 runs. A jump takes 32 frames and covers 2 cells (Crosley).
- **Signposts.** One sign at the entrance (route name and destinations) and one at every real fork. Gen 4 also uses "Trainer Tips" signs on early routes to teach mechanics (Bulbapedia, Signpost and Trainer Tips).
- **Dead ends hide items.** Ledges often guard items "so as to force the player to take a longer or more hidden path" (Bulbapedia, Ledge). Optional side areas reward items (PokéCommunity Daily 2016). Empty cells inside a grass patch are good hiding spots (Eevee Expo).
- **Town roads vs route paths.**
  - Towns use a consistent paved road that doesn't change type or size (Neti). The starter town is tiny (Twinleaf: 8 residents), with short trails and lots of open grass.
  - Near a city, the route borrows the city's material for its first tiles. The Gen 4 route north of the first big city starts as "a short brick road" before turning to trail (Bulbapedia, Sinnoh Route 204).

### 1.3 Grass

| Measure | First route | Second route | Third/fourth route | Source |
|---|---|---|---|---|
| Tall grass, % of map area | 14.4–22.8% | 4.4–14.3% | 3.7–8.9% | Crosley |
| Tall grass, % of walkable | 18.8–38.4% | ------- 8.2–29.2% ------- | | Crosley |
| Grass crossed going out / on the fewest-grass way home | 4–19 / 0–5 cells | | | Crosley |
| Trainers | 0 | 2–4 (Emerald R102: 4, sight 2–3) | sight 1–5, then 0–7 | Crosley, pret `trainer_see.c` |

- **Encounter rate.**
  - Gen 3: 320/2880 = 11.1% per grass step, with a 4-step grace period after a battle. Caves are 160/2880 and water 64/2880 (Bulbapedia, Wild Pokémon; Crosley).
  - Gen 1: 15–25/256 (6–10%) on early routes.
  - Gen 4: the movement factor is 40 on foot and 70 on a bike or in long grass, so the bike raises encounters in Gen 4. Gen 3 does the opposite: x0.8 on a bike (Bulbapedia, Bicycle).
  - Kilumen keeps encounters flat across walk, run and bike (MOVEMENT.md). That's fine.
- **Chance of at least one battle when crossing n grass steps at 11.1%/step:** 3 steps 30%, 4 steps 38%, 6 steps 51%, 8 steps 61%, 10 steps 69%, 13 steps 78%.
- **Shape.**
  - Patches are consolidated, with uneven borders and removed interior tiles. Avoid single stray tiles (Eevee Expo; Neti: "not squarish, leave free blocks").
  - Sinnoh patches tend to be big and squarish (often 9x9 or more) because the Poké Radar needs room. That suits Gen 4's device, not Kilumen's game.
- **Variants that teach.**
  - Long grass: no bike, and in Gen 3 no running either. Trainers can hide in it, and it raises the encounter rate (Gen 4 Routes 210 and 214).
  - Gen 5 dark grass: higher levels and double battles. It is kept separate from normal grass and never rustles.
  - Gen 5 rustling grass: about 10% chance every 20 steps, and stepping in guarantees a battle (Bulbapedia, Tall grass; Phenomenon).
  - Poké Radar: shakes up to 4 patches for chaining (Gen 4).
- **Readability.** Tall grass must differ from plain ground in value *and* hue, rise above the tile, hide the sprite from the waist down, and rustle on entry (behaviour flags "grass animation" and "high grass" in Gen 3 maps; Kilumen already does all of this).
- **Grass frames trainers.** Trainers stand at a patch edge or inside it (Gen 5 refs; Bulbapedia, Long grass). The patch then becomes "do I wade past them or go around?".

### 1.4 Flow and pacing

- **Line of sight.** Each trainer looks in one direction for N cells and walks to you on sight (pret `trainer_see.c`). Use narrow corridors for mandatory trainers so they can't spot the player from off-screen, and make optional trainers skippable (PokéCommunity Daily 2016).
- **Introduce one thing at a time.**
  - First route: grass and catching, no trainers.
  - Second route: the first trainers, about 3 of them, about one per bend (Sinnoh Route 202: 3 trainers, one per leg).
  - Later routes: mix trainers, ledges, water and stairs (Routes 203 and 204: hill stairs, ponds, a large patch across a ledge, side lakes with items).
- **Landmarks.** Use one per route at a bend or junction: a pond, a hill with stairs, a fallen tree. Masuda says routes linking towns began as a hardware limit and stayed as a tradition (Game Informer 2011). Ohmori's open Wild Area (2019) is the counterpoint. Kilumen's town-route-town spine fits the tradition.
- **Event spacing.** Put something every 1–2 screens: a bend, patch, trainer, item or sign. Measured in walking, a first route totals 58–94 cells of outbound walk (about 15–25 s).

---

## 2. Kilumen today (measured, read-only)

| Map | Size | Walkable | Encounter tiles | % area / % walkable | Main line (steps, grass) | Return line | Notes |
|---|---|---|---|---|---|---|---|
| Route 1 (first route) | 44x34 | 746 (50%) | 155 | **10.4% / 20.8%** (target 14–23% / 19–38%) | South to north: **33 steps, 3 grass** = 0.75x long side | 33 steps, 3 grass (same) | East branch, south to east exit: 66 steps, **0 grass** |
| Thornwood (second route) | 36x30 | 343 (32%) | 83 | 7.7% / 24.2% (target 4–14% area: OK) | West to cave: **72 steps, 4 grass** | Cave to west: **72** (the ledge shortcut is broken) | West to east exit: 52 steps, 4 grass |
| Brookhollow (start town) | 34x26 | 384 (43%) | 0 (correct) | n/a | North exit to heal centre: 25 steps; to shop: 26 | | Roads 2-wide except south road (row 21) and east road (x25), which are 1-wide |

**Trainer sight as built** (walkable cells actually covered):

| Trainer | Pos / facing | Effective sight | Problem |
|---|---|---|---|
| `trainer_r1_a` | (12,20) down | 3: (12,21–23) | Watches a strip between two patches that the main line never uses |
| `trainer_r1_b` | (22,14) left | **1**: (21,14), then pond | Stands on the only gap between the pond and the east path |
| `trainer_r1_c` | (34,9) up | **1**: (34,8), then ledge row 7 | Faces a ledge |
| `trainer_tw_bug` | (11,15) left | **1**: (10,15), then tree | Faces the wall of the clearing |
| `trainer_tw_b` | (26,22) left | 3: (25,22),(24,22),(23,22) | Looks *along* the 2-wide road, so row 21 skips it |

---

## 3. How Kilumen applies this (original version)

Kilumen's version draws on the same principles, with a vocabulary of its own:

- **Trail vs road.** Towns get the existing cobble `path` as their road. Routes should get a worn earth or moss **trail** autotile. *Art ask:* `trail>grass`, `trail>grass_dark`, the same 16-edge structure. The first 4–6 tiles out of a town keep the cobbles and then fade to trail. The fade itself tells the player "you're leaving town".
- **The lumen thread.** Kilumen has crystals everywhere. Put one small glowing marker crystal (decoration, non-blocking) at each route fork and on the far side of each ledge loop, as the eye-lead. It's an original wayfinding motif, not a sign copy, and it doubles as the "landmark at the bend".
- **Grass dose by route order.** Route 1 aims for 15–20% of area and 6–10 forced steps outbound, with 0–3 on the way home over a ledge. Thornwood aims for 8–12% of area and 4–6 forced steps, and trainers take over the pacing. Later routes: 4–9%.
- **One verb per route.** Route 1 teaches grass, catching and ledges as the way home. Thornwood teaches that trainers see you and that a loop brings you back (cave, then ledge, then exit). Brookhollow teaches reading a town (plaza, heal centre, shop, the exit signposted).
- **Kilumen's encounter feel.** About 1 battle per 8–10 grass steps, a 4-step grace period after a battle, flat across walk, run and bike. Optional later idea, entirely Kilumen's own: a "glimmer" patch where crystal light makes one patch tile sparkle for 20 steps and stepping on it guarantees a rarer find. That's the principle behind rustling grass, with different art and logic. Dark-ground grass (Thornwood) can stay a normal encounter tile, but it needs a brighter tip colour to keep its contrast.
- **Sight budget for the camera.** Vertical sight is 3 or less and horizontal sight 6 or less. Mandatory trainers stand beside a corridor looking across it. Optional trainers stand at a patch edge, facing into it.
- **Patch recipe.**
  - Draw the bounding box, then remove 1–2 corner cells, push one edge in or out by 1 in a single spot, and punch 0–2 interior holes. A hole can hold a hidden item.
  - Use 12–40 tiles per patch and keep each patch 13 tiles wide or less.
  - The encounter rectangles in the JSON can stay rectangles as long as the encounter layer itself follows the blob, or the zones can become cell lists.

---

## 4. Fix list per map

Fixes are ordered by impact. The "Measured" lines come from running `design/_work/proto.py` on in-memory copies of the maps.

### Route 1 (44x34): first route, Brookhollow (south) to Fernwick (north)

1. **Ledge loop so the trip out is long and the trip home is short (the biggest fix).**
   - Make row **y=16** a ledge from **x1 to x22**, including the spine (4–5,16) as `ledge_m`. Today only (1–3,16) is a ledge. Break the run visually into 3–7-cell segments with end-caps and a rock or bush between segments, at e.g. (8,16), (13,16) and (17,16), so it doesn't read as one wall.
   - Paint tall grass on **(10–16, 14–15)** (a 7x2 band north of the ledge) so the detour crosses grass. Give it a ragged edge: drop (16,15) and add (9,15).
   - **Measured:** north trip **71 steps, 10–13 grass steps** (1.61x long side, in the 1.15–1.70 band). South trip **33 steps, 3 grass** (54% shorter).
   - The outbound route becomes: spine, then the fork at (4–5,26–27), the east trail to (13–14,18–19), (23–24,12–19), the pond gap (22,13–15), the grass band, and back to the spine at (4–5,14–15).
2. **Make the north forced choke deeper or keep it and add the band above.** The forced grass (1–9,2–4) is 3 steps (about 30% battle chance). With fix 1 the outbound total reaches 10+ steps (about 69%). If fix 1 is skipped, deepen the choke to 6 rows, (1–9,1–6), and notch (1,1) and (9,6).
3. **Clear the pond pinch.** Move `trainer_r1_b` off (22,14), the only walkable gap past the pond. Suggested spot: **(31,13) facing left, sight 3**, so it watches (28–30,13) inside patch (25–30,13–16) and becomes an optional patch-edge trainer.
4. **Point the other trainers at something.**
   - `trainer_r1_c` (34,9) faces a ledge. Turn it **left, sight 4**: it then covers (33,9) and (32,9) on the east branch path, plus 2 open cells.
   - `trainer_r1_a` (12,20): turn it **left, sight 4** to watch (8–11,20) at the top of its patch, or remove it. A first route conventionally has 0 trainers, and Thornwood should introduce them. If you keep it, give it a Trainer-Tips-style line that teaches sight.
5. **Grass ratio.** Fix 1 adds 14 tiles, which gives about 11.3% of area. Reach about 15% by growing 3 patches into blobs:
   - (7–9,8–14): add (6,9–12) and (10,14).
   - (8–11,20–24): add (7,21–23), notch (11,24).
   - (26–30,6–8): add (25,7) and (31,8); keep the hidden feed at (30,6) as a hole.

   That's about 20 more tiles, roughly 16% of area.
6. **De-rectangle every patch.** Notch at least 2 corners each on (7–11,28–31), (15–20,21–24), (25–30,13–16) and (35–39,7–9). Punch one interior hole in (25–30,13–16) at (27,14) for an item.
7. **Widen at forks.** Pave 3x3 aprons at the fork **(4–6,25–27)**, where the sign at (6,25) already stands, and at the bends **(23–25,18–20)** and **(32–34,10–12)**. Put the "lumen thread" crystal at (25,19) to pull the eye up the east trail.
8. **Landmark.** The pond (17–21,13–16) is the natural landmark. Fix 1 routes the main line right past it. Add one sign at (22,17) ("Fernwick, via the pond meadow").
9. **East branch (gated until Frostspire).** It's an early optional loop with 0 grass on the way from the south (66 steps). Put 1 forced crossing in it, e.g. grass on (32–33,6–8) cutting the path, so the late-game revisit isn't a free stroll.

### Thornwood (36x30): second route, Fernwick (west) to Greystone cave and the future east exit

1. **Repair the ledge shortcut (bug).** Ledge (6–9,8) is unreachable: row **y=7, x6–14** is now collision 1 (tree overlay 473 on path tiles). This also makes the path 1 tile wide at (6–14,6). Reopen **(6–14,7)** as walkable path.
   - **Measured:** cave to west exit drops from **72 to 21 steps (-71%)**. The outbound trip stays 72 steps, 4 grass.
   - This turns Thornwood into the "loop comes back" lesson, and it restores the consistent 2-wide trail.
2. **Make the first mandatory trainer mandatory.** `trainer_tw_b` (26,22) looks along the 2-wide road, so row 21 skips it. Move it **beside the north corridor at (27,16), facing right, sight 2–3**. It then covers (28,16) and (29,16), the whole 2-wide corridor, at a right angle. That's the "trainers see you" lesson.
3. **Give the bug catcher a view.** `trainer_tw_bug` (11,15) faces a tree. Turn it **down, sight 3**: it then covers (11,16), (11,17) in the grass and (11,18), the clearing's entry gap. Players entering the clearing are spotted, and the trainer is framed by grass.
4. **Deepen the forced choke.** The choke (21–23,21–22) is 3 steps (about 30%). Extend it to **(20–24,21–22)** and add (24,23) only if that cell is reopened. Note: the JSON zone still says y1=23, but row 23 x21–23 is now trees. Fix the zone or the layer.
5. **Add a grass decision on the long south leg.** Rows 19–20 (x2–14) is a 13-tile straight with nothing on it. Turn the open pocket (4–6,16–18) into a grass blob around the hidden feed at (5,17), so it becomes an optional side patch. Or bend the trail up through (10–14,18) at the clearing mouth so it brushes the patch.
6. **Signs.** There's only one sign, at (1,8).
   - Add a sign at **(21,8)** at the cave-strip junction: "Greystone ↑ / Fernwick ←".
   - Add a sign at **(19,24)** where the trail turns east at the south patches: "Revival Heights →, when the log is cleared".
   - Put a lumen-thread crystal at (13,18) to lead the eye into the clearing.
7. **Readability on the dark floor.** Confirm the tall-grass tips get a lighter tip ramp on `grass_dark` ground. The contrast is lower here than on Route 1, judging by the preview at (21–23,21–22).
8. **De-rectangle.** Patches (7–12,24–26), (15–18,24–26) and (22–26,11–13) should each get 2 notched corners. The hidden seed at (8,25) should sit in a visible 1-tile hole, as in convention 1.2.

### Brookhollow (34x26): start town, no grass (correct)

1. **Plaza at the crossroads.** The N–S road (x10–11) meets the main road (rows 12–13).
   - Pave **(8–13, 10–14)** into a 6x5 square. Today it's a plain 2x2 crossing.
   - Move the lamps at (9,11) and (8,14) to the plaza corners.
   - Place a 1x1 or 2x1 **town landmark** (a non-blocking lumen crystal lamp or a well) in the middle of one quadrant, e.g. (12–13,10), so the cross stays walkable.
2. **Forecourts for services.** Pave 3x2 aprons in front of the heal centre **(5–7,20–21)** and the shop **(15–17,20–21)**. Today each has a 1-tile spur, (6,20) and (16,20). The two key buildings should be readable as more important than houses.
3. **Road hierarchy and consistency.**
   - Main road (rows 12–13) and the north road (x10–11) stay 2-wide. Optionally make the main road 3-wide at rows 12–14, x2–21.
   - The south road (row 21, x2–20) and the east lane (x25, rows 14–20, then an L along (26–28,20) to the door at (28,19)) are 1-wide: make them 2-wide, or make it clear they're lanes (a different edge).
   - Door spurs stay 1-wide.
4. **Signpost the exits from where the player stands.** The town sign at (12,10) is good.
   - Add **(12,2)** at the north exit: "Route 1, to Fernwick".
   - Add **(29,11)** before the barricade: the guard explains it, but a sign names the destination.
5. **Break the perfect grid a little.** Curve the south road: let row 21 step down to row 22 for x14–19 and back up. Or offset one house by 1 tile. The town reads as "laid out" instead of "lived in".
6. **Keep:** no tall grass in town, flowers as decoration, the river and bridge as the landmark (bridge (22–24,12–13)), and the fenced player garden.

---

## 5. Sources

- Blake Crosley, "Pixel-Art Routes" (measurements from pret decompilations of Red, Crystal, Emerald and FRLG): https://blakecrosley.com/blog/pixel-art-world-beyond-the-plaza
- Bulbapedia:
  - Sinnoh Route 201: https://bulbapedia.bulbagarden.net/wiki/Sinnoh_Route_201
  - Sinnoh Route 202: https://bulbapedia.bulbagarden.net/wiki/Sinnoh_Route_202
  - Sinnoh Route 203: https://bulbapedia.bulbagarden.net/wiki/Sinnoh_Route_203
  - Sinnoh Route 204: https://bulbapedia.bulbagarden.net/wiki/Sinnoh_Route_204
  - Unova Route 1: https://bulbapedia.bulbagarden.net/wiki/Unova_Route_1
  - Twinleaf Town: https://bulbapedia.bulbagarden.net/wiki/Twinleaf_Town
  - D/P walkthrough part 2: https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Diamond_and_Pearl/Part_2
  - Tall grass: https://bulbapedia.bulbagarden.net/wiki/Tall_grass
  - Phenomenon: https://bulbapedia.bulbagarden.net/wiki/Phenomenon
  - Poké Radar: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9_Radar
  - Wild Pokémon: https://bulbapedia.bulbagarden.net/wiki/Wild_Pok%C3%A9mon
  - Bicycle: https://bulbapedia.bulbagarden.net/wiki/Bicycle
  - Running Shoes: https://bulbapedia.bulbagarden.net/wiki/Running_Shoes
  - Ledge: https://bulbapedia.bulbagarden.net/wiki/Ledge
  - Signpost: https://bulbapedia.bulbagarden.net/wiki/Sign
  - Trainer Tips: https://bulbapedia.bulbagarden.net/wiki/Trainer_Tips
- Pokémon Wiki (yakkun), DP Route 201 map info: https://yakkun.com/dp/map.htm?place=route201
- pret pokeemerald, trainer sight code: https://github.com/pret/pokeemerald/blob/master/src/trainer_see.c
- Encounter-rate explainer: https://sha.wn.zone/p/pokemon-encounter-rate
- DS Pokémon Hacking, Gen IV mapping overview (32x32 map chunks): https://ds-pokemon-hacking.github.io/docs/generation-iv/guides/mapping/
- Pokemon DS Map Studio: https://github.com/Trifindo/Pokemon-DS-Map-Studio
- PokéCommunity Daily:
  - "Fangame Tutorials: Mapping Routes" (2017): https://daily.pokecommunity.com/2017/09/14/fangame-tutorials-mapping-routes/
  - "How To Make Your Maps Stand Out" (2016): https://daily.pokecommunity.com/2016/12/04/make-maps-stand/
- Neti's Mapping Tutorial (PokéCommunity): https://www.pokecommunity.com/threads/netis-mapping-tutorial.134658/
- Eevee Expo, "Arrangement of tall grass": https://eeveeexpo.com/threads/401/
- PWO wiki mapping tutorials: https://pwo-wiki.info/index.php/Mapping_Tutorials
- Advance Map docs (tile behaviour bytes): https://www.hackromtools.info/advance-map/
- Game Informer (2011), Masuda on routes and hardware: https://gameinformer.com/b/features/archive/2011/03/07/pokemon-past-present-future.aspx
- Pokémon Blog (2019), Masuda and Ohmori on the Wild Area: https://pokemonblog.com/2019/06/13/the-pokemon-company-interviews-junichi-masuda-and-shigeru-ohmori-about-pokemon-sword-and-shield-at-e3-2019/
- Gary's references: `refs_gary/` (21 shots) and `refs_contact.png`. The overworld ones show these principles:
  - a forced grass belt between a cliff and trees;
  - a 3-wide bridge as a chokepoint;
  - a trainer standing in grass on a stepped route;
  - a forest clearing with an item ball in grass;
  - a trainer spotting the player beside a 2–3-wide dirt path;
  - a fenced 5-wide road.

**Gap:** I found no GDC talk specifically about Pokémon route design. The design-intent quotes above come from developer interviews (Masuda 2011, Ohmori 2019). The numbers come from decompilation measurements and the wikis.
