# Kilumen — Puzzle progression

All mechanics are original to Kilumen. They are built from a small, readable set of verbs that the player learns one at a time and then sees combined.

**Shared toolkit:** boulders (push), plates (latch / hold), crystal switches (toggle sets), crystal gates (channels; a gate opens when any of its channels is fully on), ledges (one-way), plus one new **zone verb** per late zone.

**Rules every puzzle must follow:**
- It is solvable from every entrance.
- It resets on map reload (latches are saved).
- It never soft-locks: there is always a reset tile, crystal or exit on the player's side.
- It passes `tools/run.py` (solver plus connectivity in the solved state) once it exists as a map.

Difficulty is rated 1–10 for the order the player meets it.

## Built
| # | zone | difficulty | mechanic | what it teaches |
|---|---|---|---|---|
| 0 | Brookhollow | – | none | movement, doors, `$return` interiors |
| 1 | Route 1 | 1 | ledges, tall grass | one-way drops; route choice around grass |
| 2 | Thornwood | 2 | light tree maze + **ledge shortcut hidden by trees** | dead ends, looking for gaps, one-way shortcuts back to known ground |
| 3 | Fernwick Master's Hall | 3 | latch plates (2 corners) → gate A; three linked crystals (XOR sets) → gate B | channels need *all* switches; a switch can flip others |
| 4 | Greystone Caverns B1 | 4 | push a boulder onto a **hold** plate, and line it up around rocks; far-side release crystal | "hold" vs "latch"; push order and positioning; boulders reset |

## Planned (8 unbuilt zones, easiest to hardest)

### 5. Saltmere (town + salt flats), difficulty 4: **Salt-crust tiles**
- **New verb:** cracked salt crust. You can walk on it once; after you step off, it collapses into a brine pit (blocked) until you leave the map.
- **Puzzle:** a gym-style courtyard where you must reach three latch plates in one pass. The crust grid makes route order matter. It is a gentle "draw the path without lifting the pen" puzzle.
- **Tiles:** salt_crust, salt_crust_cracked, brine_pit (state `intact → cracked → pit`).
- **Fail-safe:** a crystal at the entrance resets the crust.

### 6. Mirefen (swamp), difficulty 5: **Lantern-fog maze**
- **New verb:** fog. The fog layer hides everything beyond 2 tiles. Lantern posts (crystal switches) clear the fog in a 5-tile radius and show the safe boardwalk.
- **Hidden rule:** each post lit dims the previous one (a toggle set of [self, previous]), so the player must choose an order that keeps the next stretch visible.
- **Hazard:** bog water sends you back to the last lit post, so it never kills.
- **Tiles:** fog overlay (dithered violet-grey), boardwalk, bog water, lantern_post_off/on.
- **Teaches:** memory, and planning switch order without full information.

### 7. Tidewater Coast, difficulty 5–6: **Tide cycle**
- **New verb:** the tide. A big tide-bell crystal switches the whole map between `low` and `high`.
  - **Low tide:** sand bars are walkable, but sea caves are flooded.
  - **High tide:** sand bars are water (code 3); floating driftwood rafts (boulders that float) can be pushed along channels to bridge gaps, and cave mouths rise clear.
- **Puzzle:** push driftwood at high tide into a gap, switch to low tide so it beaches as a bridge, then use it to reach a plate that holds the cave gate.
- **Map data:** `tide` state on tiles (`states: {low: id, high: id}`).

### 8. Revival Heights (city, Revival Tech HQ), difficulty 6: **Security keycard circuits**
- **New verb:** powered floor rails. Crystal relays send power along rails; boulders become movable **power cubes** that complete a rail when parked on a gap.
- **Puzzle:** a three-floor HQ.
  - Each floor's lift needs its circuit closed.
  - Laser gates (crystal gates, hall style) block the shortest routes, so the player must re-route power.
  - Later floors reuse earlier cubes. Cubes carried by lift keep their floor position, which makes this the first multi-map puzzle state.
- **Story beat:** the opposition group's sabotage has broken some rails, so you repair or bypass them.

### 9. Lanternport (port city), difficulty 7: **Lighthouse beams**
- **New verb:** beams. Rotating mirror stands (interact to turn 90°) direct a violet light beam. Plates light up when the beam crosses them, and beam-lit plates count as `hold`.
- **Puzzle:** the harbour lock. Route the beam through 4–5 mirrors to two receivers at once.
  - Boats (pushable along water lanes) can block or carry the beam.
  - The beam must cross the dock at night, so the map has a day/night state switch at the lighthouse.
- **Teaches:** 2-D path routing with rotating pieces.

### 10. Frostspire (snow peaks, reached via Greystone B1 north), difficulty 8: **Ice sliding + freeze/thaw**
- **New verb:** ice. On ice you slide until you hit an obstacle (as do boulders). **Braziers** (interact) thaw a 3x3 area into slush, which you can walk on but not slide on. **Frost crystals** refreeze it.
- **Puzzle:** a summit climb of chained slide rooms. You must stop on mid-ice tiles by thawing landing spots, then refreeze them to slide boulders across onto hold plates.
- **Reset:** slush resets on reload, and every room has a frost-crystal reset.
- **Teaches:** state you create yourself (thaw/freeze) combined with sliding physics.

### 11. Cindervale (volcanic town), difficulty 9: **Lava flow and cooling stones**
- **New verb:** lava. Lava channels flow one tile per step along slopes. Pushing a cooling stone into a channel dams it, the lava cools to basalt (walkable) downstream after 3 steps, and the upstream side backs up into a new branch.
- **Puzzle:** a forge temple where you redirect a single lava stream between three basins. Each filled basin heats a latch, so the order matters: a wrong order floods your path, and the bellows crystal reverts the flow.
- **Teaches:** time-based state (steps), and causes with delayed effects.

### 12. Aurelith (arena city of the 8 Masters), difficulty 10: **Grand Arena gauntlet (combination)**
- **New verb:** none. This is a combination test. Each Master's wing reuses a prior zone's verb in a harder form: plates + crystal sets, boulders on hold plates, fog, tide, beams, ice, lava.
- **Central hall:** 8 crystal seals, each lit by clearing a wing. A final channel puzzle requires all seals plus two hold plates that only boulders from different wings can reach. This needs routing *between* puzzles.
- **Champion approach:** a short "remix" room with ice sliding into beam routing.

## Design notes
- **New verbs** are always introduced in a safe room first (no encounters, no fail state), then combined.
- **Hints:** an NPC near every puzzle gives one hint line (see the B1 hiker and the hall guide). From difficulty 6, a hint stone gives a second hint after 3 resets.
- **Visual language:**
  - Violet = interactive or puzzle state.
  - Lit crystal = on, dark crystal = off.
  - Plates show an inset glyph when on.
  - Gates are crystal bars that retract when open.
- **Data:** every new verb is a tileset `states` entry plus a `puzzle` block. Extend `run.py`'s solver for each verb (slide, tide, beam and lava are deterministic, so BFS still works) before shipping the zone.
