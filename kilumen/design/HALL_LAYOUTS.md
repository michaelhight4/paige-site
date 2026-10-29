# Master hall layouts v1 (Coder, Oct 29 2026)

Gary, 10:45 AM CT Oct 29: hall trainers must not be piled in one area; reference how mainline monster-RPG gyms stage fresh, natural scenes.
Scope: the four Master halls of regions 1-4 (Fernwick, Saltmere, Revival Heights, Frostspire). Data: `art/world/overworld/maps/<hall>_hall_int.json`,
re-runnable from `tools/halls/apply_layouts.py`, guarded by `tests/hall_layouts.test.mjs`.

## Structure borrowed (structure only, no names or content)
- **Trainers as checkpoints**: one trainer per room or stage of the hall's puzzle, so each new space has a beat.
- **Puzzle-led path**: trainers sit where the hall's own mechanic turns (crystals, pans, prism rooms, gust lanes), never in the lobby.
- **Sight lines that cut the path**: each sight line crosses the natural walk from door to Master, so battles happen on the way, not in a queue.
- **Varied facings**: left, right and down facings mixed per hall; no mirrored pairs.
- **Spacing**: the Master is always the last thing; the last trainer stands one room short of the dais.
- **Optional side trainer**: one per hall (where there are 3+) stands off the main line. It still counts for the Master's gate.
- **Set-dressing**: existing tiles that fit the theme on lobby corners and the dais wall.
- **Soul**: each trainer has a `pose` tag (art direction, sprites TBD) and `idle_facings`, the facings its look-around picks from (src/overworld/npcs.js), so it glances at its own bit of the room instead of spinning at random.

Hall rule unchanged: the Master refuses to battle until every hall trainer is beaten (src/overworld/overworld.js, `kind` still `trainer_hooded`). Puzzles are unchanged: no collision changed on any puzzle cell. The only collision edits are lobby corner props, off every path (the test checks reachability).

## Fernwick (region 1, earth: plates + resonance crystals)
Before: both helpers in the crystal band at (4,12)/(11,12), mirrored, facing each other.
After: **helper_1** (1,10) faces right, sight 5 along the top lane of the crystal band, kneeling by the left crystal (idle: right/down/up). **helper_2** (12,5), in the dais room by the east pillar, faces left, sight 4 across the approach row: the last test before the ring. Lobby keeps the guide and the plates. Set-dressing: already banners, braziers and pillars; none added.

## Saltmere (region 2, water: salt-pan sluices)
Before: h1-h3 in the lobby at rows 11-12.
After: **h1** (3,11) leans on the rail by the inner doorway, faces right, sight 2 over the doorway column: the door checkpoint. **h2** (1,6) watches the middle pan, faces right, sight 4 across the pans that the walk to the Master crosses. **h3** (9,5) mends a net by the drying rack, faces left, sight 3: the side trainer near the Master. Set-dressing: salt barrels in the lobby corners, banners either side of the dais.

## Revival Heights (region 3, light: prism relay, 4 rooms)
Before: h1-h4 all in the lobby (rows 22-23).
After: one per room going up. **h1** (9,17) lower room, polishing a lens, faces left, sight 4 over the walkway. **h2** (1,12) middle room, tracing the beam line, faces right, sight 4. **h3** (9,7) upper room, shading their eyes from the receiver, faces left, sight 3 over the column up to the Master. **h4** (2,6) side trainer tending a prism in the upper corner, faces down, sight 2. Set-dressing: crystals in the lobby corners, banners by the dais.

## Frostspire (region 4, wind: gust lanes; dev/region4-station ice floor + wind puzzle)
Before: h1-h3 in the lobby at rows 11-12.
After: **h1** (8,11) braced against the draught at the inner door, faces left, sight 2 over the doorway. **h2** (9,7) leans into the gust lane, faces left, sight 4 across the lane row. **h3** (5,4) side trainer by the bell rope near the Master, faces down, sight 2. The bell rope (2,6) and feather cells stay clear; the gust puzzle overlay is untouched. Set-dressing: frozen rocks in the lobby corners and a brazier beside the Master.

## Art / text follow-ups
- `pose` tags need overworld pose frames (character art). Until then they are data only; `idle_facings` is live.
- No new lines; trainer text is unchanged (Text Bot owns it).
