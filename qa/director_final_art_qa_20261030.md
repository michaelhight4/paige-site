# Kilumen — Director final art QA (2026-10-30)
Read-only review. Nothing edited, committed or deleted.

## Sets checked
- integration_v1: NOT FOUND anywhere under /workspace (kilumen*, wt_*, kilumen_r4dev, qa/, shots/). Not reviewed.
- seaport_v1: /workspace/wt_integ/kilumen/shots/seaport_v1/ (15 shots opened)
- wellspire_merge: /workspace/wt_integ/kilumen/shots/wellspire_merge_20261030/ (15 shots opened: before/after, pc + some phone)
- furniture: /workspace/kilumen/shots/furniture_v4/ (newest; 20 rooms, PC at full size, phone via contact_sheet.png)
- Grid tool: `tools/furniture/grid_fit_and_swap.py --check --report /tmp/gridcheck.md .` — 486 defs / 729 tiles; 131 tile collision changes proposed (walk -> block), e.g. i_fishing_rods 7347, i_net 7332, i_river_stones 7348, i_tool_rack 7345, home_fishing_rods 2096, all kit_bookcase*/bookshelf*/coat_rack*/cork3*/couch3* variants. Full list in /tmp/gridcheck.md.
- No logos, no tobacco/drug use found in any set. Fire/forge smoke only.

## Fix list
| # | Set | File | Problem | Severity | Fix |
|---|---|---|---|---|---|
| 1 | all | tile defs (131, see /tmp/gridcheck.md) | Solid art (shelves, coat racks, couches, rods, nets, stones) is set to walkable, so the player walks through it | fix | Run `grid_fit_and_swap.py` without --check (apply mode) after review, or set collision=block on the listed tile ids |
| 2 | furniture | shots/furniture_v4/bedroom_pc.png | Bed is drawn straight top-down but the desk and chair are drawn front-on, so the perspective is mixed. Big translucent white vignette circles across the room | fix | Redraw the bed at the 35° top+front view. Remove or soften the vignette/light-circle overlay |
| 3 | furniture | shots/furniture_v4/house_c_pc.png | Same translucent white vignette circles over the walls and floor | fix | Same overlay fix as #2 |
| 4 | furniture | shots/furniture_v4/living_room_pc.png | Vignette circles. Noisy blue/purple dither patch on the rug, bottom-right. Left teal bed is cut off at the frame | fix | Remove overlay. Replace the rug patch with clean flat shading. Nit: reframe the shot |
| 5 | furniture | shots/furniture_v4/clinic_pc.png | Counter reads flat top-down with no front face, and spills past its grid square | fix | Redraw as a 35° top+front counter with the front darker than the top. Trim it to whole tiles |
| 6 | furniture | shots/furniture_v4/club_pc.png | Player's head draws over the door lintel (depth-sort bug) | fix | Sort the lintel above actors, or set the actor y-sort from the feet |
| 7 | furniture | shots/furniture_v4/hall_pc.png | Leftover orange debug marker rectangles on the floor. Pillar cut off at the edge | fix | Turn off the debug overlay in shot capture. Nit: reframe |
| 8 | furniture | shots/furniture_v4/lab_pc.png | Crystal vats show only a front face with no top face. Bases use a pink/blue dither gradient that reads blurry | fix | Add a lighter top ellipse/face. Replace the dither with 2–3 flat greyscale shade bands |
| 9 | furniture | shots/furniture_v4/shop_pc.png | Grey shelves are front-only with no top face, so they don't match the 35° counter | fix | Add a light top strip to the shelf sprites, shaded like the counter |
| 10 | furniture | shots/furniture_v4/station_pc.png | Green debug dots at the floor tile corners | fix | Turn off the grid/debug overlay |
| 11 | furniture | home_brook_a/b, home_fernwick(_c), home_lantern, home_salt, house_a, house_b | Mostly on-model, but a few small props (clutter, plants) are front-on next to 35° furniture | nit | Redo the outlier props at 35° |
| 12 | furniture | office_pc / office_frost_pc / office_salt_pc | Passes. Counter top is lighter than its front | — | none |
| 13 | seaport_v1 | town, cliffs, lagoon, sea_north, cave_east/west, map_overview | Void/black areas at map edges. Hard seam cuts between tile regions. Blurry dither patches | fix | Pad the map edges with filler tiles. Blend the seams with transition tiles. Replace the blurry patches with native-res tiles |
| 14 | seaport_v1 | derby_*.png (hud, quit_prompt, desk_featured, scale_catch, scale_turn_in) | UI clipping. Truncated/placeholder dialog text. Stale dialog bleeding over the next screen | fix | Fix text wrap and box sizing. Clear the dialog on state change. Replace the placeholder strings |
| 15 | seaport_v1 | tidewater_channel_before/after.png | Edge black bands and noisy dithering | nit | Crop/pad the camera bounds. Clean the dither |
| 16 | wellspire_merge | lab04_tanks_*, lab07_vats_* (pc+phone), lab06_growth | Vats/tanks shaded flat, with no lighter top face. Monitors front-only | fix | Redraw at 35° with the top lighter than the front, same light direction as the furniture kit |
| 17 | wellspire_merge | lab01_entry_*, lab10_ondravel, ondravel_lab1_now | Red debug outlines visible. A desk is partly sunk into the wall | fix | Disable the debug outline. Move the desk one tile off the wall, or trim it to whole tiles |
| 18 | wellspire_merge | master_cindervale/lanternport/mirefen/tidewater_after | Black bands at the edges. Seams where the merged maps meet | fix | Extend the edge tiles. Add transition tiles at merge seams |

## integration_v1
Set: /workspace/wt_integ/kilumen/shots/integration_v1/. contact_sheet.png plus 14 PC shots, all opened at full size. report.json has errors: [] and every warp passes. No logos, no tobacco or drugs.
Result: 3 pass (pc_10, pc_11, pc_13, nits only) and 11 fail.

| # | File | Problem | Severity | Fix |
|---|---|---|---|---|
| I1 | pc_01_wellspire_switchbacks.png | The tall-grass block is a hard rectangle. Its edges are cut flat against the snow, and the player sprite pokes into it. There is a dither halo where snow meets cobble. The cobble ledge shows only its top face, with no darker front face | fix | Add edge/transition tiles round the grass patch. Replace the dither halo with a clean snow-edge tile. Add a darker front-face row on the ledge |
| I2 | pc_02_wellspire_cloudway.png | Rock shadows are dashed strips sitting below the rocks, not attached to them. They read as an artifact | fix | Swap in a soft contact shadow, offset the same way as the furniture light |
| I3 | pc_03_gullhaven_sea_maze_north.png | The player's head is hidden by the tree row (depth-sort). Trees are drawn flat from above, with no 35° front. The tree row ends in a hard straight line | fix | Y-sort the trees by their base. Redraw the tree tiles with a front/trunk face. Add a row-end tile. (Seam part repeats #13) |
| I4 | pc_04_gullhaven_sea_swimmers.png | Pixel-identical framing to pc_03 with no swimmers in shot, so the capture is wrong. It also has the same head-occlusion bug | fix | Re-capture at the swimmers' location. Same depth fix as I3 |
| I5 | pc_05_gullhaven_cave_west.png | Black void along the bottom ~25% and the left edge | fix | REPEAT of #13. Clamp the camera to the map bounds or pad with rock tiles |
| I6 | pc_06_gullhaven_cave_east.png | Same black void as pc_05. The layout is identical to cave_west | fix | REPEAT of #13. Also check that the east cave isn't reusing the west map |
| I7 | pc_07_gullhaven_town.png | Blurry dither patches in the top-right of the sand/cobble | fix | REPEAT of #13. Replace with native-resolution tiles |
| I8 | pc_08_derby_hud.png | The quest toast covers the top of the stall. Dither patch in the water at bottom-left. The cobble path ends with square cuts into the sand | fix | REPEAT of #14 for the UI overlap: move the toast or hide it during the derby. Clean the water patch. Add path-end tiles |
| I9 | pc_09_derby_scoring.png | The HUD reads "Featured: - x2" (placeholder value). Blurry dither shadow blob on the right | fix | REPEAT of #14. Fill the featured fish or hide the line once the derby is over. Swap the blob for a flat shadow |
| I10 | pc_12_side_salt_quiz.png | Wall crates are front-only, with no top face. A translucent dither column sits on the left wall. Hard seam where the purple roof meets the grass | fix | Redraw the crates at 35° with a lighter top. Remove the dither column. Add a roof eave/edge tile |
| I11 | pc_14_hall_cindervale_master.png | Red debug outlines on the bottom wall row. The "F Talk" prompt overlaps the quest toast | fix | REPEAT of #17 for the outlines: turn off the debug draw. Offset the talk prompt or hide the toast during an interaction |
| I12 | pc_13_hall_cindervale_entry.png | Wall band dither is noisy. The bottom doorway is a black gap | nit | Clean the wall band. Add a threshold tile |
| I13 | pc_10_merit_shop_today.png, pc_11_side_fern_box_intro.png | Pass. Shop footer and tab labels are very small | nit | Bump the label font size |
