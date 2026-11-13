# For Coder: depth pass handoff (art side)

Art no longer bakes contact or drop shadows. The engine depth pass (src/overworld/depth.json) casts them.

1. **Stripped tiles:** see `stripped_tiles.txt` (252 name/id pairs, including crystal_switch_on/off, which depth.json already casts indoors). Building facade and roof shading, ledges, cliffs, grass, dais_1_*, rail, bike_rail_h, fish_shadow, i_ledge_s and the x_* tiles keep their art shading (132 tiles). x_* tiles belong to the biome worker (tiles_extra) and were not touched.
2. **Cast regex additions:**
   - indoor: `^club_(counter|stool|booth|speaker|dj_desk|paint_counter)`
   - outdoor: `^club_front_`, `^camp_` (Story Bot camps: camp_cold / camp_restored, swapped by props.js on camp_restored_<area>)
3. **New tiles:** club ids 1520-1575, camp_cold 1576, camp_restored 1577, registered last. Camps placed: thornwood (6,17) and greystone_b1 (19,2), both in soul.flag_swaps (camp_cold -> camp_restored on camp_restored_<area>). Club flyer wall: note_greystone now appears at beat_master_fernwick (was beat_master_revival). No existing id shifted. Look tiles up by NAME, never by number.
4. **Engine support needed for club_int:** `flag_swaps`, `by_phase` and `active_when` (on spots).
5. **Done (art side):** club_int follows the outdoor clock: progression.OUTDOOR_CLOCK_INDOORS / FOLLOWS_OUTDOOR_CLOCK and grades.json indoor_rule say so; INDOOR_OR_CAVE is unchanged (engine handles it).
7. **x_reeds** (id 5444, tiles_extra) still has a baked shadow (502 px of (26,18,38,a96)). It is the biome worker's tile: handed to them, not stripped here. handcar_locked (1193) has no baked shadow (alpha only 0/255).
6. **Preview:** `interiors_before_after.png` now simulates depth.json indoor values: offset [4,2], alpha 80, wall-base 6 px at alpha 64. It is an approximation, not an engine capture. I did not take engine depth-ON screenshots, and I did not touch _previews/depth_pass/.
