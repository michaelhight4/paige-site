# Aurelith City Plan (PLAN ONLY: nothing built, no maps edited)

Brief from Gary (pt2038u): "the capital city is a city not a town, we will need city buildings and a city layout, look at how pokemon does this."
Diagram: `shots/aurelith_city_plan/layout.png` (made by `layout.py` with Pillow, HPND licence, already on the box).
Audit source: fresh clone of `michaelhight4/paige-site` main, `kilumen/art/world/overworld/`, on 29 Oct 2026.

---
## 1. Pokémon big-city structure research (structure only, no art or layouts copied)

| City (game) | Structural takeaways |
|---|---|
| **Castelia** (BW) [1] | A harbour road wraps the whole city. Parallel streets (Castelia St, Mode St, Narrow St, Gym St) each have their own character (busy commuters, leafy, dark alley, gym). They all meet at a **Central Plaza with a fountain**. Skyscrapers have an **enterable lobby plus 1 to 3 reachable floors through a lift** (Battle Company 1F/47F/55F). Only 2 entrances on foot (a desert route and a bridge gate), with the harbour as a third. The gym is on its own named street opposite a "story" building. Population: 127 placed NPCs plus walk-by crowd NPCs that spawn again on the main streets. |
| **Lumiose** (XY) [2] | A **radial wheel**: a ring of boulevards, 4 avenues as spokes, 5 small plazas each with an obelisk, and a central plaza with the landmark tower that also holds the gym. **5 route gates** plus a train station. Built-in transport inside the city (Lumi Cab, Gogoat Shuttle). Blocks are named districts or sectors. Population: 416. A lesson for us: the sheer size made players lose their way, and the camera and save system had bugs. |
| **Saffron** (RBY/FRLG) [3] | A strict **orthogonal grid** with **gatehouses on all four sides** (N/S/E/W routes go through gate buildings). The corporate HQ (Silph Co., 11 floors with warp tiles) is a dominant block in the middle. There are 2 gym-type buildings, and the Magnet Train station came in Gen II. |
| **Goldenrod** (GSC/HGSS) [4] | A **department store with 6 floors and a rooftop** (lift plus stairs, one theme per floor), a Radio Tower landmark, a Magnet Train station, an underground walkway, a Game Corner, a bike shop and a flower shop. The gym is tucked into a normal block. Lots of small service buildings line a grid. |
| **Jubilife** (DPPt) [5] | A modern grid with a **plaza at the crossroads** holding the TV station and the Pokétch company HQ. The Trainers' School sits on the edge. Gates go to 3 routes. No gym, so the city is a hub for services and story. |
| **Wyndon** (SwSh) [6] | The capital. **The stadium is the climax, at the far end of a long processional axis**. Rose Tower (corporate HQ), a hotel, a monorail and a station. The city is split into levels and districts linked by stairs and gates. |
| **Hammerlocke** (SwSh) [7] | A **walled city**. The stadium is built into the central keep, and routes leave through gates in the wall on several sides. The station sits outside or by the wall. The city stacks vertically on stairs. |
| **Mesagoza** (SV) [8] | The academy sits at the top of a great staircase, which is the landmark axis. Plazas sit on ring roads, **gates point N/S/E/W to the open world**, and the city has several Pokémon Centers and many shops. Bulbapedia names it the most populous city (the Lumiose page [2] says Lumiose is 2nd behind it). |
| **Celadon** (RBY/FRLG) [9] | A **department store with 5 floors and a rooftop vending area**, a Game Corner, a multi-storey mansion with a rooftop secret, a hotel and a restaurant. The gym is behind trees on the city edge. Wide streets, which makes it the textbook "big city" next to the towns of the same era. |

### Lessons we will reuse (as principles)
1. **Hierarchy of streets.** Use 1 or 2 wide main axes (avenue or boulevard) and narrower side streets, and give each street one character.
2. **A plaza where the axes meet, with a landmark** (fountain, tower or obelisk) that you can see from the entrances. It is the city's anchor for finding your way.
3. **The gym or stadium sits at the END of an axis** (Wyndon, Lumiose, Mesagoza) or on its own street, never as just another house.
4. **Gatehouses at the route connections** (Saffron, Lumiose). They mark city against wild and hide the load seams.
5. **Tall buildings: enterable lobby plus only 1 to 3 real floors** behind a lift (Castelia, Goldenrod, Celadon). The outside looks tall and the content stays cheap.
6. **The department store is a vertical "shop stack"**, one theme per floor, with a rooftop.
7. **Corporate HQ as a story dungeon** (Silph, Battle Company, Rose Tower).
8. **NPC density is far higher than in towns** (Castelia 127 plus walk-by crowds, Lumiose 416, against about 10 to 30 in a town). Crowds that only walk past give the bustle cheaply.
9. **City compared with town:** a town is 4 to 8 buildings round one path. A city is a grid of blocks, has several services (sometimes more than one heal centre), has transport (train, cab) and districts with names.
10. **Avoid Lumiose's problems:** too big a city leads to getting lost, so keep a clear grid and name the streets on signs.

Sources: [1] https://bulbapedia.bulbagarden.net/wiki/Castelia_City (fetched 29 Oct 2026) · [2] https://bulbapedia.bulbagarden.net/wiki/Lumiose_City (fetched) · [3] https://bulbapedia.bulbagarden.net/wiki/Saffron_City · [4] https://bulbapedia.bulbagarden.net/wiki/Goldenrod_City and /wiki/Goldenrod_Department_Store · [5] https://bulbapedia.bulbagarden.net/wiki/Jubilife_City · [6] https://bulbapedia.bulbagarden.net/wiki/Wyndon · [7] https://bulbapedia.bulbagarden.net/wiki/Hammerlocke · [8] https://bulbapedia.bulbagarden.net/wiki/Mesagoza · [9] https://bulbapedia.bulbagarden.net/wiki/Celadon_City and /wiki/Celadon_Department_Store. Only [1] and [2] were fetched and checked this session. Rows 3 to 9 come from general series knowledge, so check those pages before quoting any detail.

---
## 2. Audit: what Aurelith is today (main, 29 Oct 2026)
- `maps/aurelith.json`: title "DRAFT - Aurelith (rail city)". It is **58x40 squares at 64px, but only 34x26 is playable**, because of the centre-camera padding (dx 12, dy 7). That is **exactly the same playable size as Cindervale, Lanternport, Mirefen, Saltmere and Revival Heights, and smaller than Brookhollow (34x32)**. In size terms Aurelith is a town today.
- Layers: ground, decoration, overlay, collision, encounter. 224 distinct tile ids are used.
- 7 warps, all on 2 rows (y18 and y27). heal_aurelith (15x11, new in v0.2.81), shop_int, station_int, and 4 houses that **reuse other towns' interiors** recoloured (home_lanternport_c, home_saltmere_a, home_brookhollow_a, home_fernwick_c).
- 4 exits: N to `aurelith_arena` (an unbuilt stub, locked behind story gate `gate_aurelith_arena` with crystal barriers at (28,8) and (29,8) until all 8 coins). W to route_east. E to route_aurelith_saltmere. S to route_cindervale (offset -6).
- 7 NPCs: arena doorman, airspace officer, lucky-crystal seller, 2 villagers, rival Ron #6 (Lv 58 to 62), and **Announcer Aurora** (`aurelith_games_announcer`, (33,11), opens the Games through src/sports/major.js).
- 3 signs (dev labels), 3 items (fountain pouch, station tonic, ...). No encounters. Run and bike are allowed.
- world_layout.json: type "city", status "to_come", puzzle_tier 12, rail_stop true, **fly false ("Government restricted airspace: arrivals by rail only")**.
- Missing: no stadium building, no plaza or landmark, no tall buildings, no named streets, no city interiors, no crowd NPCs.

---
## 3. Proposed layout (original; see layout.png)
**Playable 64x48 squares** (about 3.5 times today's 884 squares), which makes a full map of **88x62** with the same 12/7 padding. Coordinates below are playable coordinates from (0,0). World Design adds +12/+7.

**Two road axes:** **Crown Avenue** runs N-S, 4 wide (x30-33), from the south gate straight up to the stadium door. **Rail Boulevard** runs E-W, 3 wide (y19-21), from the Grand Terminal to the east gate. Secondary streets are 2 wide (y12-13, y32-33, x14-15, x48-49). Every road has a 1-square pavement edge. Crossings are painted on whole squares where streets meet.

| District | Squares (x,y,w,h) | Key buildings |
|---|---|---|
| **Games District** (north, end of the avenue) | 16,0,30,11 | **Aurelith Games Stadium** 18x9 at (22,1). Door at (30,9) on the avenue axis, so the existing north exit and story gate become the stadium entrance. Announcer Aurora on the forecourt. |
| Civic (NW) | 2,1,12,10 | Capitol / Government House 10x7 with the Airspace Office (the reason there is no fly). |
| Museum (NE) | 50,1,12,10 | Games Hall of Fame / museum 10x7. |
| **Rail Quarter** (W) | 0,22,14,10 | **Grand Terminal** 12x7 (station_int, 2 floors). This is the city's arrival and fast-travel point. W exit route_east. |
| Hotel row | 0,14,14,5 | Hotel 8x5 (lobby plus 1 floor). |
| Services row | 16-28,14-18 | **heal_aurelith 6x5** (keep the v0.2.81 interior and move only the door) and Mart 5x4. |
| **Crown Plaza** | 17,22,12,9 | **Lumen Spire** landmark 2x2 plus a fountain ring, benches and planters. It is the centre for finding your way, and you can see it from the terminal door. |
| Plaza East / market | 35,22,12,9 | 6 market stalls (1x2), with the lucky-crystal seller moved here. |
| **Galleria Department Store** | 35,14,12,5 | 5 floors plus a roof, one theme per floor (balls/heals, battle items, TMs, sports gear, decor, rooftop vending). |
| **RT Company HQ** | 50,14,8,5 tower | A tall frontage with lobby, 1 office floor and a top floor. Can be a story or battle dungeon. |
| East Gate | 50,22,14,10 | Gatehouse 6x4 to route_aurelith_saltmere. |
| South Gate | 34,34,14,14 | Gatehouse 6x4 to route_cindervale. Avenue entry. |
| Residential W/C | 0-29,34-47 | 4 terraces 6x4, 3 apartment blocks 6x5, a café and a school. Re-homes the 4 house warps. |
| Canal Park (SE) | 50,34,14,14 | A trainer garden and berry plots, the green break in the city. |
| Harbour | n/a | Not planned. Aurelith is inland (world map 0.556, 0.696). See the open questions. |

### Grid rules (strict)
- Every footprint is a whole number of squares. Doors are on the bottom row, with a free walkable square in front.
- There is **at least 1 walkable square between any two buildings**, so no shared walls. Furniture (lamps, benches, planters, bins, signs) takes exactly 1 square or a stated 1x2. It is placed so that **no neighbouring square's path is blocked**: never in a 1-wide gap, never in front of a door, never on a crossing.
- Tall buildings draw their upper storeys on the `overlay` layer above collision rows. The collision footprint covers only the ground floor rows. Roofs can overlap the pavement visually but never by collision.
- Story gate cells and exit edges are kept clear (crystal barrier on the avenue at the stadium approach).

### Enterable interiors (new unless noted)
Stadium lobby plus arena (existing aurelith_arena stub), Grand Terminal 2F (station_int expanded), heal_aurelith (existing), Mart (shop_int, existing), Galleria 1F-5F plus roof (6 small maps or 1 map with a lift selector), RT HQ lobby/office/top, Hotel lobby/1F, Capitol lobby, Museum hall, café, school, and 4 to 7 homes (new Aurelith flats to replace the borrowed town interiors). Lift = a menu warp, so we never build the 40 floors in between.

### NPC density
Towns have 4 to 12. Target **about 35 to 45 placed NPCs** plus **6 to 10 walk-by "crowd" NPCs** on Crown Avenue and Rail Boulevard. Crowd NPCs are pooled and walk fixed loops, can't be talked to (or give 1 line), and despawn when off screen. Keep the existing 7 (Aurora, doorman, airspace officer, seller, Ron 6, villagers) and add clerks per floor, station staff, a guide at each gate, and Games fans at the stadium forecourt.

### Connections and fast travel
- Keep all 4 exits and their target maps. Only the edge rows/cols change (W y20-21, E y20-21, S x31-32, N x31-32 to the arena). World Design must re-match the offsets on route_east, route_aurelith_saltmere and route_cindervale.
- Fly stays off (lore). **Rail fast travel lands at the Grand Terminal door.** Set world_layout `fly_point` or the rail arrival to the terminal (playable 7,31, +padding) and keep `rail_stop: true`.
- Optional: an in-city tram stop pair (terminal ↔ stadium) as a menu warp, like Lumi Cab and Gogoat but cheap.

---
## 4. New art needed (Character models / building art)
**Buildings (64px squares, multi-storey fronts):** stadium exterior 18x9 (bowl, banners, entrance arch) · Grand Terminal 12x7 (glass roof, clock) · Galleria department store 12x5 at 4 to 5 storeys · RT HQ tower 8x5 at 6+ storeys (frontage only) · Capitol 10x7 · Museum 10x7 · Hotel 8x5 at 3 storeys · heal centre city skin 6x5 · Mart city skin 5x4 · gatehouse 6x4 (x2) · terrace 6x4 · apartment block 6x5 at 3 storeys · café 4x3 · school 6x4 · market stall 1x2.
**Landmark:** Lumen Spire 2x2 with an animated light (2 to 4 frames) plus a fountain ring (4 to 8 tiles).
**Street furniture (1 square each):** street lamp (day/night variant for time_of_day), bench (2 directions), planter, tree in a pit, bin, bollard, bus/tram stop sign, street name sign, notice board, vending machine, flag pole/Games banner, bike rack, phone/info kiosk.
**Ground tiles:** asphalt road, road edge/kerb (8 directions plus corners), pavement slab, zebra crossing (H and V), plaza paving pattern, cobbles, manhole, painted lines, steps (1 square), grass verge, canal edge.
**Interiors:** department store counters/shelves/lift, office desks, station barriers/benches/ticket desk, hotel desk, stadium lobby turnstiles.
**NPC sprites:** commuter, business, fan with a flag, station guard, clerk variant, tourist.

## 5. What World Design needs to do (maps)
1. Resize `aurelith.json` to 88x62 (playable 64x48) and keep the padding rule. Move all warps, NPCs, signs, items and story gate cells to the new coordinates. Move the heal_aurelith door and keep its interior.
2. Re-seam the 4 exits and the matching route edges. Update world_layout (rail arrival point).
3. Build the new interiors listed above. Add warps; add lift menu warps.
4. QA: run a reachability check (BFS from the terminal to every door/exit) and an "every furniture cell has free neighbours" check. That is a short Python script on the map JSON, so nothing new is needed. **Tiled (GPL tool, output unencumbered)** can be used to block out layouts visually before writing JSON.

## 6. Phone performance concerns
- 88x62 x 5 layers = about 27k cells, against 11.6k today (about 2.3 times). Render only the camera viewport (already about 17x11 visible). Pre-bake static ground+decoration into chunk canvases (for example 16x16 squares) once at load instead of drawing per tile per frame.
- Tall overlays mean more overdraw. Keep the overlay layer sparse and avoid big semi-transparent sprites.
- Crowd NPCs: cap the active ones at about 8, update only within the viewport plus a 2-square margin, and use simple loop paths (no pathfinding).
- Texture memory: put the city in 1 new sheet (tilesets_r4 style). Don't load every building as its own image. Watch the 2x/3x tileset variants (tileset_2x/3x), because the city sheet multiplies by 4 or 9 at those scales.
- Fallback if it's still heavy: split into 2 maps, Aurelith Central (terminal, plaza, shops) and Games District, with the north seam at y11. The existing arena exit pattern already supports this.

## 7. Open questions for Gary
1. Is 64x48 playable the right size, or would you like it even bigger and split into 2 or 3 linked maps (Central / Games / Residential)?
2. Should the Games stadium be the endgame arena (all 8 coins), or is the Games stadium separate from the coin-locked Arena?
3. Does RT Company HQ become a story dungeon (battles per floor), or only a lobby with lore?
4. Harbour: Aurelith is inland. Should there be a canal or river front instead, or is it fine with none?
5. Department store: how many floors, and what does each one sell (it ties into shops.json)?
6. Grid, radial (Lumiose-style), or walled (Hammerlocke-style)? The plan uses a clear grid with a processional avenue.
7. Should crowd NPCs that walk past be allowed (not talkable), or should every NPC be talkable?
8. Should the 4 borrowed house interiors be replaced with Aurelith-specific flats?
9. Should there be an in-city tram (terminal ↔ stadium) or just walking and the bike?
