# For Coder: depth pass handoff (art side)

Art no longer bakes contact or drop shadows. The engine depth pass (src/overworld/depth.json) casts them.

1. **Stripped tiles:** see `stripped_tiles.txt` (252 name/id pairs, including crystal_switch_on/off, which depth.json already casts indoors). Building facade and roof shading, ledges, cliffs, grass, dais_1_*, rail, bike_rail_h, fish_shadow, i_ledge_s and the x_* tiles keep their art shading (132 tiles). x_* tiles belong to the biome worker (tiles_extra) and were not touched.
2. **Cast regex additions:**
   - indoor: `^club_(counter|stool|booth|speaker|dj_desk|paint_counter)`
   - outdoor: `^club_front_`
3. **New tiles:** club ids 1520-1575, registered late. No existing id shifted.
4. **Engine support needed for club_int:** `flag_swaps`, `by_phase` and `active_when` (on spots).
5. **Optional:** let club_int follow the outdoor clock, like lantern_rest (clock.js). Add night-lit entries for greens.
6. **Preview:** `interiors_before_after.png` now simulates depth.json indoor values: offset [4,2], alpha 80, wall-base 6 px at alpha 64. It is an approximation, not an engine capture. I did not take engine depth-ON screenshots, and I did not touch _previews/depth_pass/.
