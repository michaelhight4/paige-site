# Interior scale audit: Brookhollow + Fernwick (read-only)

**Snapshot:** maps last written by the other worker at **20:37:25 CDT** on 22 Oct 2026. The audit was re-run at **20:38 CDT**.
The maps changed twice while I was auditing, at 20:34 and 20:37. Counts of interact_spots moved between those runs, but nothing affecting the scale, size, camera or touch results changed.
Re-run with `python3 cam.py` and `python3 probe.py`. These are in this folder and only read the data.

**Scope:**
- All 13 door rows in `qa/interiors_hookup/door_table.json`.
- The 4 second floors you can reach by stairs: house_2f, home_brookhollow_b_2f, home_fernwick_a_2f and home_lanternport_c_2f.
- shop_int is used by both towns, so it is one row.
- That gives 16 maps in total.

**Contact sheet:** `sheet.png`. Every panel is at 0.5x native, so a 64 px tile shows as 32 px.
- Each exterior building crop sits next to its interior.
- The marker is a real 64x96 human sprite, standing at the door outside and at the arrival tile inside.
- Red: warp mats and stairs. Orange: NPC cells. Green: interact spots, with a line to the tile you stand on.

## Viewports used (engine's real numbers)

The engine code is in `src/overworld/camera.js` and `overworld.js`:
- The canvas is innerWidth×dpr by innerHeight×dpr.
- `pickZoom(h)` is 1 if h < 600, otherwise max(2, floor(h/480)).
- Visible tiles = device px / (64·zoom).

| platform | view | zoom | visible tiles (w × h) |
|---|---|---|---|
| PC | 1280×720 | 2 | 10.0 × 5.6 |
| PC | 1920×1080 | 2 | 15.0 × 8.4 |
| PC | 2560×1440 | **3** | 13.3 × 7.5 (*fewer tiles than 1080p*) |
| phone | 844×390 CSS @3 (2532×1170) | 2 | 19.8 × 9.1 |
| phone | 2340×1080 (851×393 @2.75) | 2 | 18.3 × 8.4 |
| phone | 2400×1080 (873×393 @2.75) | 2 | 18.8 × 8.4 |
| tablet | 1024×768 @2 | 3 | 10.7 × 8.0 |
| tablet | 1024×768 @1 | 2 | 8.0 × 6.0 |

1080p renders at **2x, not 3x**, which matches README §2.

**Touch zones (Coder's numbers):** the d-pad covers the bottom-left 200×200 CSS px and the buttons cover the bottom-right 300×120 CSS px.
- On 844×390 those zones are about 4.7×4.7 tiles and 7.0×2.8 tiles.
- On 2340 and 2400 phones they are about 4.3×4.3 tiles and 6.4×2.6 tiles.
- Method: I put the player on every target's stand tile and ran the real camera. A target counts as hidden when at least 25% of the cell lies under a zone.
- Targets: the exit mats (plus the arrival tile), stairs, NPC talk tiles and spot stand tiles.

**Camera behaviour:** `axis()` centres the map on black **per axis** whenever the map is no bigger than the view on that axis. Otherwise it clamps to the map edge.
- That is the Pokémon behaviour for rooms smaller than the screen, so it passes.
- Cells outside the map count as BLOCK, so the void is solid.

## Results

Key: ↕n / ↔n = scrolls n tiles. "fits" = whole room shown with no scroll. void = black tiles each side. ✓ pass, ⚠ warn, ✗ fail.

| interior | walkable room (floor bbox, cells) | exterior footprint | ratio (floor w / ext w) | C1 scale | C2 size | C3 furniture | C4 void/camera | PC (720 · 1080 · 1440) | mobile (844×390 · 2340/2400 · iPad@2) | issues |
|---|---|---|---|---|---|---|---|---|---|---|
| house_1f | 12×7 (78) | house_player 5×5 | 2.4 | ✓ | ✓ | ⚠ chairs walkable | ✓ | ↔2↕4.4 · ↕1.6 · ↕2.5 | ↕0.9, void 3.9 · ↕1.6, void 3.1–3.4 · ↔1.3↕2 ; touch ✓ | chairs (2,6),(3,6) are walkable, unlike the other homes |
| house_2f | 10×5 (46) | (same building) | 2.0 | ✓ | ⚠ 5 rows | ✓ | ✓ | ↕2.4 · **fits** · ↕0.5 | fits, void 4.9 · fits, void 4.1–4.4 · fits ; touch ✓ | **PC-only scroll** (720p and 1440p) |
| office_int | 16×9 (131) | office 7×6 | 2.3 | ✓ | ✓ | ⚠ chairs walkable | ✗ 2-tile mat | ↔6↕6.4 · ↔1↕3.6 · ↔2.7↕4.5 | ↕2.9, void 1.9 · ↕3.6, void 1.1–1.4 · ↔5.3↕4 ; touch ✓ | **scrolls sideways on every PC but not on phones**; mats (7,11)+(8,11) |
| home_brookhollow_a | 10×5 (43) | house_a 5×5 | 2.0 | ⚠ NPC not loaded | ⚠ 5 rows | ✓ | ✓ | ↕2.4 · **fits** · ↕0.5 | fits, void 4.9 · fits, void 4.1–4.4 · fits ; touch ✓ | NPC is in text_pending with no sprite; PC-only scroll |
| home_brookhollow_b | 12×7 (74) | house_b 5×5 | 2.4 | ⚠ NPCs not loaded | ✓ | ✓ | ✓ | ↔2↕4.4 · ↕1.6 · ↕2.5 | ↕0.9 · ↕1.6 · ↔1.3↕2 ; touch ✓ | 2 NPCs are pending with no sprite |
| home_brookhollow_b_2f | 10×5 (43) | (same) | 2.0 | ⚠ NPC not loaded | ⚠ 5 rows | ✓ | ✓ | ↕2.4 · **fits** · ↕0.5 | fits · fits · fits ; touch ✓ | as above |
| lab_brookhollow | 14×8 (93) | lab 7×5 | 2.0 | ⚠ NPCs not loaded | ✓ | ✗ no cradle spots | ✓ | ↔4↕5.4 · ↕2.6 · ↔0.7↕3.5 | ↕1.9, void 2.9 · ↕2.6, void 2.1–2.4 · ↔3.3↕3 ; **touch ✗ aide** | 3 starter cradles exist only in `story`, with no interact_spots; aide (10,8) sits under the A/B buttons (59–81% covered) |
| heal_brookhollow | 14×7 (86) | heal_centre 7×5 | 2.0 | ⚠ NPCs not loaded | ✓ | ✓ | ✗ 2-tile mat | ↔4↕4.4 · ↕1.6 · ↔0.7↕2.5 | ↕0.9, void 2.9 · ↕1.6, void 2.1–2.4 · ↔3.3↕2 ; **touch ✗ sofa** | sofa (1,7) and lap_nap_seat (1,8) sit under the d-pad (80–100% covered); mats (6,9)+(7,9) |
| shop_int (both towns) | 12×6 (64) | shop 5×5 | 2.4 | ✓ | ⚠ sparse | ✓ | ✓ | ↔2↕3.4 · ↕0.6 · ↕1.5 | **fits**, void 3.9 · ↕0.55, void 3.1–3.4 · ↔1.3↕1 ; touch ✓ | only 3 shelves and one 3×1 counter on a 72-cell floor (11% filled) |
| heal_fernwick | 14×7 (87) | heal_centre 7×5 | 2.0 | ⚠ NPCs not loaded | ✓ | ✓ | ✗ 2-tile mat | as heal_brookhollow | as heal_brookhollow ; **touch ✗ sofa** | same problems as heal_brookhollow |
| home_fernwick_a | 12×7 (74) | house_c 5×5 | 2.4 | ⚠ NPC not loaded | ✓ | ✓ | ✓ | ↔2↕4.4 · ↕1.6 · ↕2.5 | ↕0.9 · ↕1.6 · ↔1.3↕2 ; touch ✓ | NPC pending with no sprite |
| home_fernwick_a_2f | 10×5 (43) | (same) | 2.0 | ⚠ NPC not loaded | ⚠ 5 rows | ✓ | ✓ | ↕2.4 · **fits** · ↕0.5 | fits · fits · fits ; touch ✓ | PC-only scroll |
| home_fernwick_c (ochre) | 12×6 (62) | house_b 5×5 | 2.4 | ⚠ NPC not loaded | ✓ | ✓ | ✓ | ↔2↕3.4 · ↕0.6 · ↕1.5 | **fits** · ↕0.55 · ↔1.3↕1 ; touch ✓ | fits on 844×390 but not on 2340/2400 phones |
| home_lanternport_c (slate) | 12×7 (73) | house_a 5×5 | 2.4 | ⚠ NPC not loaded | ✓ | ✓ | ✓ | ↔2↕4.4 · ↕1.6 · ↕2.5 | ↕0.9 · ↕1.6 · ↔1.3↕2 ; touch ✓ | NPC pending with no sprite |
| home_lanternport_c_2f | 10×5 (43) | (same) | 2.0 | ⚠ NPC not loaded | ⚠ 5 rows | ✓ | ✓ | ↕2.4 · **fits** · ↕0.5 | fits · fits · fits ; touch ✓ | PC-only scroll |
| fernwick_hall_int | 16×15 (191; 59 reachable before the puzzle) | masters_hall 7×6 | 2.3 | ✓ | ✓ (puzzle hall) | ✓ | ⚠ 2-tile mat (double door) | ↔6↕12.4 · ↔1↕9.6 · ↔2.7↕10.5 | ↕8.9, void 1.9 · ↕9.6, void 1.1–1.4 · ↔5.3↕10 ; **touch ⚠ helper_1** | helper_1 (2,12) is 49–57% under the d-pad, and guide (10,16) is 30% under the buttons on 2340. It is a scrolling hall, as in the Pokémon gym convention. |

### Check notes

**C1 (same scale)**
- Every map uses tile_size 64. Every tile sheet is on a 64 px grid. No tiles are rescaled or off-grid.
- All of the 9 sprite-mapped NPC sheets are 320×384, which is 64×96 cells.
- **However, the engine only merges `npcs_pending_text` and `signs_pending_text`, and ignores `text_pending`.** The new interiors keep their NPCs (and some spots) in `text_pending`, and none of them has a key in `npc_sprite_map.json`.
- The result is that 10 of the 16 interiors (heal ×2, lab, the four homes and three of the 2Fs) show no NPCs in game.

**C2 (bigger inside)**
- Every room is 2.0–2.4× the exterior width, which is in band. Nothing is cramped in width.
- The 10×8 rooms have only 5 floor rows, under the 6-row guide. I recommend keeping them anyway, because 8 tall is the tallest room that fits 1080p PC and the 2340/2400 phones without scrolling. They are flagged ⚠ rather than ✗.
- shop_int is the only room that is under-dressed.

**C3 (furniture)**
- Footprints:
  - Beds are 1×2.
  - Tables are 2×1 with two chairs, so 2×2 per set.
  - Counters run 3–5 wide.
  - Shelves are 1×2.
  - Crystal displays and cradles are 1×2.
- Every interact_spot stand tile in the current data is walkable and faces its object.
- No furniture or NPC blocks the exit or the path to any NPC. The only cells you cannot reach are behind the heal-centre counter (staff) and behind the hall gates (puzzle).
- Chairs are solid in every new home, but walkable in house_1f and office_int.

**C4 (void and camera)**
- Rooms are centred on black per axis, and the map edges are solid.
- Every mat is one tile, except the 2-tile exits in heal ×2 (6,9)+(7,9), office (7,11)+(8,11) and hall (7,17)+(8,17). All of their exteriors use a 1-tile door.
- In every map you leave by stepping onto the code-4 mat from the arrival tile.
- No map holds camera or void metadata, and none needs it.

### Rooms that work on one platform but not the other

- **PC only (scrolls on PC, fits on mobile):**
  - The 10×8 rooms (house_2f, home_brookhollow_a, all 2Fs) fit on every phone, at 1080p and on iPad@2. They scroll at 720p (2.4 rows) and at **1440p (0.5 row, caused by the 3x zoom)**.
  - office_int and fernwick_hall_int fit their width on phones but scroll sideways on every PC size.
- **Mobile only (touch problems; PC is fine):** heal_brookhollow, heal_fernwick (sofa and lap-nap under the d-pad), lab_brookhollow (aide under the buttons) and fernwick_hall_int (helper_1 under the d-pad).
- **Phone to phone:** shop_int and home_fernwick_c fit on 844×390 (9.1 rows) but scroll 0.55 row on 2340/2400 (8.4 rows).
- **Side void:** rooms 10–12 wide show 3–5 black tiles each side on phones (34–56% of the screen). That matches Pokémon, and it means the touch controls sit over black.
  - For 14–16 wide rooms the void is only 1.1–2.9 tiles. Columns 0–1 below row 4, and the bottom-right block of about 4×2, sit under the thumbs. Those are the only rooms with touch hits.

## Ranked fix list

### 1. Coder: NPCs in `text_pending` are invisible (C1)
- Either merge `text_pending.npcs` and `text_pending.interact_spots` in the map loader, the same way `npcs_pending_text` is handled, or have the map worker move them into `npcs` and `interact_spots`.
- Also add `npc_sprite_map.json` keys `<map>.<npc id>` for: heal_*_carer, heal_*_technician, heal_*_storage_user, lab_brookhollow_researcher, lab_brookhollow_aide, home_brookhollow_a_owner, home_brookhollow_b_parent, scholar, home_brookhollow_b_kid, home_fernwick_a_parent, home_fernwick_a_kid, home_fernwick_c_hobbyist, home_lanternport_c_parent, home_lanternport_c_kid.

### 2. Map, heal_brookhollow and heal_fernwick: move the sofa and lap-nap seat out from under the d-pad (mobile)
**Decoration edits:**
- Remove the sofa at (1,7)+(2,7) (`i_sofa_brook_0_0/0_1`, or `i_sofa_fern_*` in Fernwick).
- Remove the plant at (0,7) (Fernwick: `i_plant_mushroom`).
- Put the sofa back at **(1,3)+(2,3)** and the plant at **(0,3)**.

**Collision edits:**
- Set (0,7),(1,7),(2,7) to 0.
- Set (0,3),(1,3),(2,3) to 1.

**Spot edits:**
- Change the spot `sofa` to x 2, y 3, stand [2,4], face up.
- Change `lap_nap_seat` to x 2, y 4, stand [2,4], face up.
- The big-creature slot becomes (1,4) and the wake-up follow slot becomes (2,5).

The stand tile (2,4) shows less than 10% coverage on every phone (I checked it).

### 3. Map, lab_brookhollow (C3 and mobile)
**Add 3 interact_spots** for the cradles that `story.starter_choice` already describes:

```json
{"id":"cradle_1","kind":"prop","x":5,"y":6,"stand":[5,7],"face":"up","tile":"i_crystal_display"}
{"id":"cradle_2","kind":"prop","x":7,"y":6,"stand":[7,7],"face":"up","tile":"i_crystal_display"}
{"id":"cradle_3","kind":"prop","x":9,"y":6,"stand":[9,7],"face":"up","tile":"i_crystal_display"}
```

**Move the aide** from (10,8) to **(10,6)**, facing right towards the desk at (11,6).
- You talk to the aide from (10,7) facing up.
- The aide no longer sits under the buttons on any phone.
- Gaps through the cradle row at 4, 6 and 8 stay open.

### 4. Coder: interior camera, no scrolling for small overflows, and fix the 1440p zoom (C4, PC + mobile)

**a) Bottom-pin small overflows.** In `camera.js` `axis()`, when a room overflows the view by a small amount on an axis, pin the camera instead of following the player. The mat and floor stay visible, and only the wall-cap rows are cropped:

```js
function axis(focus, mapPx, view, pinSlackPx = 0) {
  if (mapPx <= view) return Math.round((mapPx - view) / 2);
  const max = Math.floor(mapPx - view);
  if (mapPx - view <= pinSlackPx) return max;               // interior: pin to bottom, no scroll
  return Math.min(max, Math.max(0, Math.round(focus - view / 2)));
}
// cameraFor: pass pinSlackPx = map.interior ? 1.6 * TILE : 0 for the y axis only
```

With this change, every 10–12×8–10 room becomes static at 1080p, on 2340/2400 phones and at 1440p. Only the 2–3 wall rows lose 0.5–1.6 rows at the top, and the window spots at y=2 stay visible.

**b) Give 1440p more tiles than 1080p, not fewer.** Consider `pickZoom = max(1, floor(h/512))`, so that every view shows at least 8 rows:
- 720p becomes 1x (20×11 tiles).
- 1080p stays 2x.
- 1440p becomes 2x (20×11).
- 2160p becomes 4x.

This change is global, so the scale stays identical indoors and outdoors. README §2 would need updating too, so it is Gary's call.

### 5. Map: one-tile exit mats (C4)
- **heal_brookhollow and heal_fernwick (7,9):** set decoration 0 (remove `i_mat_rtbranch`), set collision 0, and delete the (7,9) warp. Keep (6,9), which is the mat under the arrival tile (6,8).
- **office_int (8,11):** set decoration 0 (remove `door_mat`), set collision 0, and delete the (8,11) warp. Keep (7,11).
- **fernwick_hall_int (7,17)+(8,17):** optional. It is a symmetric double door. Either make the exterior door 2 wide or accept it.

### 6. README (§2/§15): spell out the camera rules
Document:
- the per-axis centring on black;
- the bottom-pin rule from fix 4, if it is adopted;
- the mobile zoom table above;
- the **touch safe area**: no interactables, NPCs or stand tiles in the bottom-left 200×200 CSS or the bottom-right 300×120 CSS.

In tiles, for rooms 14 or more wide, that means: keep columns 0–1 at rows ≥ 4 clear, and keep the last 4 columns of the bottom 2–3 rows clear. Rooms 12 or fewer wide only lose column 0 low down and the bottom-right corner (see the masks in `probe.py`).

### 7. Map, fernwick_hall_int (mobile, low)
- If the puzzle allows, move helper_1 from (2,12) to (4,12) and helper_2 from (13,12) to (11,12) to keep the mirror symmetry. I checked (4,12) and it is clear on every phone.
- They are sight-line trainers, so this mostly matters for re-talking to them.

### 8. Map: make chairs consistent (C3)
- Set collision 1 on house_1f (2,6),(3,6) and office_int (2,7),(2,10),(13,9).
- Reachability is unchanged (house_1f 77 cells, office 128 cells, both checked).

### 9. Map, shop_int: fill out the room (C2)
- Add a third goods shelf at **(10,4)–(10,5)**: `goods_0_0` / `goods_1_0`, collision 1. That makes a 3-aisle mart.
- Optionally add a plant or display at (11,6).
- These cells are touch-safe.

### 10. Keep the 10×8 rooms at 8 tall
- Growing them to 9 rows would make them scroll on 1080p and on the 2340/2400 phones.
- Accept the 5-row floor (Pokémon bedrooms are this small too).

## Files
- `REPORT.md`: this report.
- `sheet.png` (2052×2974): the contact sheet.
- `audit.py`, `cam.py`, `probe.py`, `sheet.py`: read-only analysis and render scripts.
