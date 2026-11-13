# FIELD_SKILLS.md: Skylift, Lumen Line, Tideglide and planned field skills

Status: **draft for Gary**.
- Names come from Text Bot's draft (`/workspace/kilumen/text/overworld_lines.json` → `_proposed_names`). Gary approves or renames them.
- All player text lives in that file (`field_skills.*`, `rail_only.*`, `blockers.*`). Text quoted here is only for reference.
- Data: `world_layout.json` (`fly`, `rail`, `story_gates`), each town map's `fly_point`, and `tools/progression.py` (`TOWNS`, `RESTRICT`, `FLAGS`).
- Checks: `python3 tools/run.py` → `PROGRESSION: PASS`.

| skill / service | flag | unlocked | order | usable | Text Bot key |
|---|---|---|---|---|---|
| **Skylift** (flying) | `has_skylift` | coin 4, Frostspire Master | **after** `has_bike` (step 7) | outdoors only; not in caves or interiors; not in restricted cities | `field_skills.skylift` |
| **Lumen Line** (train) + **Lumen Line Pass** | `has_rail_pass` | pass clerk, Revival Heights Central | step 6 | between visited stations | `rail_only.*` |
| **Tideglide** (water carry) | `has_tideglide` | Mirefen, after coin 5 | step 8 | facing water / floodwater | `field_skills.tideglide`, `blockers.gate_coast_road_flood` |
| Brushbreak | TBD | TBD | optional areas only | thick brush (never story trunks) | `field_skills.brushbreak` |
| Stonebreak | TBD | TBD | optional areas only | cracked rocks (pushable boulders need no skill) | `field_skills.stonebreak` |
| Glowcall | TBD | TBD | optional areas only | dark caves | `field_skills.glowcall` |

Field skills are used from the overworld. Face the target (or open the party menu, for Skylift) and use a party creature that knows the skill. When `{skill}` is known but the unlock flag isn't set, show `cant_use_yet`.

---

## 1. Skylift (flying)

### 1.1 Rules
- **Unlock:** `has_skylift` is set by beating the Frostspire Master (coin 4). This comes after the Courier Bike in the flag order. The checker enforces the order (`progression.FLAGS`).
- **Take-off is allowed** on any **outdoor** map (`movement.bike` true / not `INDOOR_OR_CAVE`), standing on a walkable cell.
- **Take-off is refused:**
  - Indoors (`*_int`, `house_*`). Text: `field_skills.skylift.indoors`.
  - In caves (`greystone*` and every future cave).
  - On bike-only or no-dismount cells. Dismount first; those cells can't dismount, so ride off them.
  - **Inside a restricted city** (Revival Heights, Aurelith). Text: `rail_only.skylift_blocked.take_off_here`.
- **Destinations** are the towns whose `visited_<town>` flag is set, and that are fly-capable: Brookhollow, Fernwick, Saltmere, Cindervale, Lanternport.
  - Revival Heights and Aurelith are listed but greyed out, with the reason **"Government restricted airspace: arrivals by rail only."**
  - Picking one shows `rail_only.skylift_blocked.destination_restricted` ("…take the train in").
- **`visited_<town>`** is set the first time the player enters the town map on foot, or steps off a train at an already-unlocked stop.
  - Because towns can only be reached on foot past every gate, Skylift never skips a roadblock.
  - `progression.py` proves this in every flag state: adding all flights reaches no new cell or zone.
- **Landing cell** = the map's `fly_point`: the path tile directly outside the heal-centre door, facing down.
  - Built: Brookhollow (6,20) and Fernwick (5,7).
  - Planned towns get one in the same spot (`world_layout.json → fly.destinations`).
- If the landing cell is occupied (an NPC or a follower), land on the nearest free walkable cell, searching rows below first.

### 1.2 World-map destination picker
1. **Open:** party menu → creature → Skylift (or the field-move shortcut).
   - If take-off is refused (see 1.1), show the line and stop. **The menu never opens** in refused places.
2. **Screen:** a full-screen world map (`world_layout.json` zones drawn as a simple illustrated map, using the violet crystal accent for the cursor).
   - Visited fly towns show a lit marker.
   - Unvisited towns show a dim marker with "???"; selecting one gives `not_visited`.
   - Restricted cities show a red-violet ring and the government line.
   - The current town is marked "You are here".
3. **Controls:**
   - D-pad moves between **markers only**, in nearest-in-direction order.
   - A confirms ("Head to {city}?" Yes/No; Text Bot `field_skills.skylift.confirm`). B cancels and returns to the field.
   - Hovering shows the town name and its heal-centre icon.
4. **Order:** markers cycle in visited-towns order, so the list stays stable as more towns unlock.

### 1.3 Take-off sequence (about 1.2 s, input locked)
Uses Animator's future-mount plan (MOVEMENT.md §4 "Future").
1. Fade the music to 50%. The player faces down and holds the walk `stand` frame for 150 ms.
2. Crouch: 1–2 frames with the hip down 2 px, 100 ms each.
3. The flying creature swoops in from the top of the screen: about 300 ms, ending with its `rider_hip_point` over the player.
4. Switch to `parts/<char>_chibi_<dir>_seated_upper.png`, with its `hip_anchor` on the mount's `rider_hip_point`. **Bob the mount, not the rider.**
5. Rise and leave the top of the screen (300 ms), with a wind SFX. Fade to white or violet (200 ms), then show the picker result: a short map pan (≤ 600 ms) from the origin to the destination marker.

### 1.4 Landing sequence (about 1.0 s, input locked)
1. Load the destination map with the camera on `fly_point`. The mount enters from the top, carrying the seated rider.
2. Descend onto `fly_point` (300 ms), then reverse the crouch frames. **The feet must end on y 93** (the foot point (32,93)), facing `fly_point.facing`.
3. The mount flies off (250 ms). The player is on foot and **never on the bike** after landing.
4. Set the respawn point to that town's heal centre (same as walking in).

### 1.5 Data
```json
"fly_point": {"x":6,"y":20,"facing":"down","visited_flag":"visited_brookhollow",
              "landing":"path tile in front of the heal centre door","skill":"Skylift","note":"..."}
```
`world_layout.json → fly`: `{skill, flag, unlock, not_in, destinations{town:{visited_flag, fly, rail_stop, fly_point|planned, no_fly_reason?}}, rule}`.

---

## 2. Lumen Line (train) and the restricted cities

- **Lumen Line Pass:** `has_rail_pass`, given by the pass clerk at Revival Heights Central (step 6).
- **Stops:** Saltmere, Lanternport, Revival Heights, Aurelith (`world_layout.json → rail.stops`). Station tiles come from the biome worker.
- **Train-only destinations:** **Revival Heights** and **Aurelith**. The reason is the same in data, docs, signs and NPCs: **"Government restricted airspace: arrivals by rail only."** Text Bot's lines:
  - signs `sign_airspace` and `sign_airspace_rules`
  - NPCs `airspace_officer` and `station_attendant`
  - `skylift_blocked.*`
- **Use:**
  1. Talk to `station_attendant` and pick a **visited** stop.
  2. Fade out. Animator's train-boarding note: walk to the door tile using walk frames, then hide the player.
  3. A 1.5 s rail transition.
  4. Arrive at the destination station's platform cell facing down. A stop is offered only after the player has visited it on foot. It is never the first way into a town.
- Without the pass, the attendant shows `no_pass`.
- **Checker:** riding between visited stations reaches no new cell or zone in any flag state.

---

## 3. Tideglide (water carry) and weather

- `has_tideglide` is given in Mirefen after coin 5. Face water (collision 3) or floodwater and press A. Then `prompt`, then `use`, then the player rides the creature.
  - Water cells become walkable at **walk speed**.
  - No running or biking.
  - Encounters come from the water table.
  - Stepping onto any walkable land cell dismounts.
- **Storm season (weather gate):** after `beat_master_mirefen`, the world flag `storm_season` is on.
  - The Brookhollow south coast road floods: `gate_coast_road_flood`, between `brookhollow_south_road` and `tidewater_coast`. Text Bot sets `active_when: storm_season`.
  - Flood cells are water (3), so they need Tideglide.
  - Weather overlay:
    - Rain particles plus a darker tint on outdoor maps east of Fernwick.
    - Rain is cosmetic everywhere except the flooded road.
    - Interiors are silent apart from a muffled rain loop.
  - The checker treats the flood as a zone gate on `has_tideglide` (planned gate list).
- Planned, not built: rain to clear after `beat_master_tidewater`, with the road staying passable by Tideglide.

---

## 4. Planned optional skills (Text Bot proposals; unlock flags TBD by Gary)

| skill | target tile (to build) | rule |
|---|---|---|
| Brushbreak | `thick_brush` (block, 1) → removed | only in optional areas and shortcuts. **Never** on story gates; the Thornwood fallen log stays `beat_master_saltmere` |
| Stonebreak | `cracked_rock` (block, 1) → `gravel` | optional areas; Greystone boulders stay push puzzles |
| Glowcall | dark-cave maps (`dark: true`) | without it, cave darkness is a vignette; never blocks the critical path |

The checker rule for all three: the critical path must stay solvable with the skill unset. Add these as zone notes, not gates, until Gary picks the unlock coins.

---

## 5. Loader notes (for Coder)
- Gate field moves on the same flags as story gates: read `story_gates[].flag`, `fly_point.visited_flag` and `has_*`.
- Set `visited_<town>` on map load when `map.name == town` and the player arrived **on foot or by train**. A Skylift landing can only happen in an already-visited town anyway.
- Skylift / rail never change the bike state, except that Skylift and the train always leave the player on foot.
- Placeholder tokens such as `{skill}`, `{creature}`, `{city}` and **`{coins}`** are listed in Text Bot's `_meta.placeholders`. The game fills them in before showing a line. `{coins}` = the number of challenge coins the player holds (count of `beat_master_*` flags set; 0-8). It is used by `blockers.gate_aurelith_arena.doorman_before`.
- Player-facing wording: never "fly" (use "head to" / Skylift), never "badge" (use "coin"). Flag ids such as `all_badges` are internal and stay as they are.
- No-fly towns: show `rail_only.skylift_blocked.*` (menu / take-off / destination), signs `rail_only.signs.*`, NPCs `rail_only.npcs.*`. world_layout.json `fly.points.<town>.text` lists the keys.
