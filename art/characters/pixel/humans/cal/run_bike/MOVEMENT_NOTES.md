## Run & Bike (player overworld) — paste into MOVEMENT.md

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
