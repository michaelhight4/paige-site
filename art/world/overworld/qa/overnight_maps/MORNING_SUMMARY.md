# Morning summary for Gary (World Design, Oct 23 2026, ~3:07 AM CT)

All of this is live in `art/world/overworld`. Nothing was published or pushed. Last checks (~3:05 AM CT): run.py exit 0, `run.py --check` 0 problems (WORLD DATA OK, PROGRESSION PASS), map_bridge round-trip 60/60, node tests all pass (overworld 22, data_schemas 5, battles_default 10, overnight_systems 12, map_bridge 5, progression 25), Text Bot v0.4.12 validator OK.

## What's live
1. **28 overnight maps** (8 towns/zones, sunmeadow_fields, 11 routes, saltmere_office_int, 7 Master halls). All names, signs and item labels are DRAFT.
2. **Autotile port** (01:38 AM CT): smoother path junctions, cave corners and ledges on 8 core maps. 242 new tiles (1825-2066); no existing tile id moved.
3. **Batch 2** (~1:30 AM CT): 92 hall and town spots for Text Bot's lines.
4. **Batch 3** (2:40 AM CT):
   - All 250 pending NPCs and signs on the overnight maps are real now and use Text Bot's lines.
   - 14 hall trainers moved so none can see the door or lobby rows.
   - Mirefen hall darkness data and reed lamps (tiles 2067/2068).
   - Pocket pickups are sealed (15/15).
5. **Sign fix** (~3:00 AM CT):
   - Moved 21 town and route sign texts that sat one tile off their sign back onto the sign.
   - Every sign can be read from a walkable tile, usually the one below it.
   - The Ember Road sign was hidden under a tree; that tree top is now gone.

## Before / after images
- Signs: `qa/signs_fix/signs_before_after.png` (list: `qa/signs_fix/SIGNS.md`)
- Autotile port: `qa/autotile_port/<map>/before_after.png` for brookhollow, fernwick, route1, route1_storm, greystone_entrance, greystone_b1, thornwood, lantern_rest
- Mirefen hall darkness by time of day: `qa/batch3/mirefen_hall_phases.png`; reed lamps up close: `qa/batch3/reed_lamp_tiles_8x.png`
- Any map: `previews/<map>.png` (and `previews/<map>_debug.png` with markers)

## Your open decisions
1. **Draft names and texts.** Map titles, sign labels, NPC and trainer names, and pickup labels are DRAFT until you approve them. Item ids stay as they are.
2. **Mirefen hall darkness.** Coder wired it in dev at 2:56 AM CT: the hall is dark at every time of day, the lamps light up as you solve the puzzle, and the darkness clears once it's solved. No fog or haze is used. Check it in Coder's `shots/batch3_wire_v1/contact_sheet.png`.
3. **Reed lamp size.** The lamp is drawn at 16px and scaled up 4x to the 64px tile. Keep it, or ask for a lamp drawn at full 64px?
4. **Unbuilt maps.** Aurelith Arena interior and Greystone B2 are not built yet. 14 Text Bot lines wait for them, and the Aurelith arena gate stays shut until all badges.
5. **Fog as weather.** Players already see the `fogwalker` class as "Bog Walker"; the id is internal. The real question, on Game dev's list in `overnight_gd/INDEX.md`, is whether natural fog or mist is OK as weather, or whether the no-smoke rule covers it too.
6. **4 older signs (not in this fix).**
   - The tile below 4 older signs is blocked, so they can only be read from the side: sign_home (Brookhollow), sign_fern (Fernwick), sign_tw_junction (Thornwood) and station_int restricted_airspace.
   - sign_fern is also under a tree top, so it can't be seen.
   - Move them, or leave them as they are?

Backups (all tarballs): `/workspace/kilumen/backups/` → `autotile_port_live_20261023_0138/`, `batch3_20261023_0240/`, `signs_20261023_0251/`.
