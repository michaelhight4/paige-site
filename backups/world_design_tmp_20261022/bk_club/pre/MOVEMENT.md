# MOVEMENT.md: overworld movement (walk / run / bike)

Status: draft for Gary. Owners:
- **World Design** (this file, map data, rules).
- **Animator**: run and bike sprite states, from `art/characters/pixel/humans/{cal,mira}/run_bike/`.
- **Character models**: walk cycles, from `humans/<char>/overworld/<char>_chibi/`.
- **Text Bot**: player-facing lines, from `/workspace/kilumen/text/overworld_lines.json` (`items.running_shoes`, `items.bike`).

Tile = 64 px. Speeds are in tiles per second.

## 1. Modes at a glance

| mode | unlock flag | item (Text Bot name) | speed | frames | px/frame | fps at nominal speed | button |
|------|-------------|----------------------|-------|--------|----------|----------------------|--------|
| walk | none | none | **4 tiles/s** (256 px/s) | 4 (walk0–3) | 32 | 8 | d-pad |
| run  | `has_run_shoes` | **Trail Runners** | **8 tiles/s** (512 px/s, 2x) | 6 (run0–5) | 21.33 | 24 | hold **B** + d-pad (`{run_button}`) |
| bike | `has_bike` | **Courier Bike** | **12 tiles/s** (768 px/s, 3x) | 4 (bike0–3), plus `bike_stand` | 48 | 16 | press **Select** to mount or dismount (`{bike_button}`, rebindable; registered key item) |

**Frames advance by distance travelled, not by a clock:**
`frame = floor(px_moved_this_move / px_per_frame) % frames`.

The fps column is only what that formula gives at the nominal speed.

## 2. Where each mode is allowed

| place | walk | run | bike |
|-------|------|-----|------|
| outdoor town / route maps | yes | yes | yes |
| interiors (`*_int`, `house_*`) | yes | **yes** (Text Bot tip: "Works everywhere, even indoors.") | **no**: auto-dismount at the door. Text: `items.bike.indoors` |
| caves (`greystone*`) | yes | yes | **no**, except a marked cave bike path (planned: Greystone B2 mine-track with lit floor markings and a sign) |
| `bike_only` cells (collision 8) | no | no | yes |
| `ramp` cells (collision 9) | no (solid from foot) | no | yes, only in the ramp's direction (`ramp_e` = +x, `ramp_s` = +y). It is a one-way hop |
| tall grass | yes | yes (still rolls encounters, see Text Bot tip) | yes (rolls encounters) |
| ledge_s (2) | south hop | south hop | south hop |
| water (3) | Tideglide only (see FIELD_SKILLS.md) | no | no |

**Rules**
- Each map JSON has `"movement": {"run": true, "bike": true|false, "note": ...}`.
  - `bike` is false on every interior and cave map.
  - The loader reads this block. Don't infer it from the map name.
- **No dismounting** on cells listed in `bike.no_dismount_cells`. These are the cells reachable only by bike (bike_only strips and ramp landing pockets).
  - Pressing the bike button there does nothing (soft click SFX).
  - The checker (`tools/progression.py`) proves that every such pocket has a bike exit, so the player can't be stranded.
- **Bike is never required.** Every built bike area is optional (shortcut or item pocket), and the checker proves the critical path with `has_bike` unset.
- **Entering a door or warp while on the bike** dismounts automatically. Coming back out leaves you on foot.
- **Running and biking do not change encounter rates** (design choice; keeps the grass rules simple).
- **Tall grass rustle** (`tileset.json` animation type `rustle`, `on_enter`) plays at every speed. At bike speed the 90 ms x 3 frames still finishes while the player is on the next tile. That's fine.

**Built bike areas**
- `route1` / `r1_marsh_boardwalk`: x10–18, y10. A bike_only shortcut boardwalk.
- `thornwood` / `tw_ramp_pocket`: x16–19, y13–16. Jump the `ramp_e` at (15,14) to reach an item pocket, and leave over the boardwalk at (15,16).

Planned bike areas are listed in `world_layout.json` under `bike_routes.planned`, with a preview in `previews/bike_paths.png`.

## 3. Sprite states (Animator owns run/bike; Character models owns walk)

| state | source | rows / cols | notes |
|-------|--------|-------------|-------|
| `stand`, `walk0–3` | Character models: `humans/<char>/overworld/<char>_chibi/` | rows down/left/right/up | walk cycle, unchanged |
| `run0–5` | Animator: `humans/<char>/run_bike/frames/<char>_chibi_<dir>_run0..5.png`; sheet `sheets/<char>_chibi_run_sheet(.png,_2x,_3x)` | 4 rows x 6 cols | stopping returns to the walk `stand` |
| `bike_stand`, `bike0–3` | Animator: `.../frames/<char>_chibi_<dir>_bike_stand.png`, `bike0..3`; sheet `<char>_chibi_bike_sheet` | 4 rows x 5 cols (stand + 4) | `bike_stand` is the same as bike0, with pedals level |
| seated rider (future mounts / train) | Animator: `parts/<char>_chibi_<dir>_seated_upper.png` | n/a | `hip_anchor` in the manifest |

- Characters: `cal` and `mira` (the player choice). Both use the same layout, timing and anchors.
- The full paths and values are in `art/characters/pixel/_parts/animator_manifest.json` under `"run_bike"`.
- Validate with `cal/run_bike/tools/validate.py <char>`.

**Anchor (same for every mode, so mode swaps never pop)**
- The frame is 64x96. Its bottom-centre **(32,96)** sits on the tile's bottom-centre.
- Draw at `x = tileX*64`, `y = (tileY+1)*64 - 96`.
- The foot/tyre point is **(32,93)**. This is the shadow-blob centre and the y-sort key.
- **Y-sort with ysort overlays:** compare the player's tile row with the overlay row, and draw the character first on ties. Tall-grass fronts then hide the legs (see OVERWORLD_README §draw order).

---

## 4. Run & Bike notes from Animator (pasted verbatim from `humans/cal/run_bike/MOVEMENT_NOTES.md`)

**Speeds** (World Design): walk **4 tiles/s**, run **8 tiles/s** (2x), bike **12 tiles/s** (3x). Tile = 64 px.

**Advance the frame by distance, not by a clock.** `frame = floor(px_moved_this_move / px_per_frame) % frames`.
This keeps feet and wheels locked to the ground whatever the speed or tick rate. The fps below is just what that works out to at the nominal speed.

| mode | frames | px per frame | cadence | fps at nominal speed | ms/frame |
|------|--------|--------------|---------|----------------------|----------|
| walk | 4 (walk0–3) | 32 | 1 step per tile, 2 steps per cycle | 8 | 125 |
| run  | 6 (run0–5)  | 21.33 | 1 step per tile, 3 frames per step | 24 | 41.7 |
| bike | 4 (bike0–3) | 48 | 1 crank turn per 3 tiles | 16 | 62.5 |

- Run cycle per step: contact → down (absorb) → flight. So run0/run3 are contact, run1/run4 are down, and run2/run5 are airborne.
- Bike: the wheel is about 21 px across, so its circumference is about 1 tile (about 3 wheel turns per crank turn).
  - The spokes advance a **stylised 22.5° per frame** (the 4-spoke pattern loops in 4 frames).
  - True rolling at 12 tiles/s would alias, causing the wagon-wheel effect. This is intentional.
- Note: the existing walk GIFs preview at 150 ms/frame, which is about 6.7 fps and would slide slightly at 4 tiles/s. In-game, walk should use 32 px/frame (8 fps at 4 tiles/s).
- Stopping:
  - Run returns to the walk `stand` frame for that facing. There is no separate run idle.
  - On the bike, use `bike_stand` (identical to bike0, pedals level).
- Turning: switch the facing row immediately and keep the distance accumulator (no reset), so the cadence stays continuous.
- Unlocks: running shoes enable run, and the bike item enables bike. The sprites don't depend on how they're unlocked.

**Anchors (identical for walk, run and bike, so modes swap with no pop):**
- Frame size is 64x96. Draw at `x = tileX*64`, `y = (tileY+1)*64 - 96`, so the frame's bottom-centre (32, 96) sits on the tile's bottom-centre.
- Foot/tyre contact row = **y 93** (2 px transparent pad below). Shadow blob centre = (32, 93).
- Run hip ≈ (32, hem row): Cal 75, Mira 69.
- Bike, all in frame px (wheels and seat are the same for every character):
  - Saddle top `seat_point`: right (24, 65), left (39, 65), down/up (32, 65).
  - Rider hip `rider_hip_point`: right (26, 64), left (37, 64), down/up (32, 64).
- Reusable seated-rider torso: `parts/<char>_chibi_<dir>_seated_upper.png` (64x96, head to waist + coat hem) with a `hip_anchor` in the manifest. Place it so `hip_anchor` lands on any seat's `rider_hip_point`.

**Future (not built):**
- **Flying-creature take-off/landing:** give the mount a `rider_hip_point`, then composite the seated_upper part there. Bob the mount, not the rider.
  - Take-off: start from the walk stand, then 1–2 crouch frames (hip down 2 px), then switch to the seated part.
  - Landing: reverse it. The landing frame must put the feet back on y 93.
- **Train boarding:** walk to the door tile using normal walk frames. Then hide the player, or use the seated_upper part at the seat's `rider_hip_point` when the interior is visible.

The values above, plus every path, are in `art/characters/pixel/_parts/animator_manifest.json` under `"run_bike"`.

---

## 5. Loader checklist (for Coder)
1. Read `movement` and `bike` from each map JSON. Map collision codes come from `tileset.json` `collision_codes` (8 = bike_only, 9 = ramp). The ramp direction comes from the tile name: `ramp_e` = +x, `ramp_s` = +y.
2. Movement is tile-locked. The player can't change tiles mid-step.
3. Step duration is 1/speed: 250 ms walk, 125 ms run, 83.3 ms bike.
4. Run only while B is held, `has_run_shoes` is set, and the player is not on the bike.
5. Bike toggle: allowed only when `has_bike` is set, `movement.bike` is true, and the cell is not in `no_dismount_cells`. When dismounting, also block the toggle if the current cell is collision 8.
6. Ramp: only on the bike, moving in `ramp_dir`. The player moves 2 tiles (the ramp plus the landing) in one hop of about 2 x 83 ms, holding `bike1` with a 6 px arc. Any other approach is a wall.
7. Frame index comes from the distance accumulator, which keeps going through turns. Reset it to 0 only when the player stops.
8. The rustle animation starts when the player enters a tall-grass cell, at any speed.
9. Ice (collision **10**, `x_ice_*`): walkable. A player who steps onto ice keeps sliding in the same direction until the next cell is not ice-walkable (blocked, water, map edge) or is plain ground; they stop on the last ice cell or step off onto the ground. No input while sliding; bike and run make no difference (the sliding speed equals the run speed). Use the `walk` idle frame while sliding.
10. Deep water (collision **11**, `x_deep_water`): never walkable or rideable. It is the same as water (3) for Tideglide, but a planned stronger skill is needed to cross it (see FIELD_SKILLS.md). Treat it as block until then.
11. Text: item lines (`items.running_shoes`, `items.bike`) come from Text Bot's file. Fill placeholders before display (`{run_button}`, `{bike_button}`, `{coins}` = number of challenge coins held, etc.; full list in `_meta.placeholders`).
