# Sign fix (World Design, Oct 23 2026, ~2:51-3:05 AM CT, live)

Each sign text entry now sits on its sign tile. "Read from" is the tile the player stands on to read it.
Sheet: `qa/signs_fix/signs_before_after.png` (red = old entry, green = sign tile = entry now, blue = read-from tile).

| map | sign id | before (entry) | after (= sign tile) | read from |
|---|---|---|---|---|
| aurelith | `aurelith_sign` | 14,10 | 14,11 | below (14,12) |
| aurelith | `aurelith_arena_sign` | 14,2 | 15,3 | below (15,4) |
| cindervale | `cindervale_sign` | 14,10 | 14,11 | below (14,12) |
| frostspire | `frostspire_sign` | 14,10 | 14,11 | below (14,12) |
| frostspire_pass | `frostspire_pass_sign` | 22,35 | 22,36 | left (21,36) |
| lanternport | `lanternport_sign` | 14,10 | 14,11 | below (14,12) |
| mirefen | `mirefen_sign` | 14,10 | 14,11 | below (14,12) |
| revival_heights | `revival_heights_sign` | 14,10 | 14,11 | below (14,12) |
| route_aurelith_saltmere | `route_aurelith_saltmere_sign` | 2,10 | 3,11 | below (3,12) |
| route_cindervale | `route_cindervale_sign` | 9,8 | 14,3 | left (13,3) |
| route_coast | `route_coast_sign` | 14,2 | 14,3 | below (14,4) |
| route_east | `route_east_sign` | 2,10 | 3,11 | below (3,12) |
| route_fernwick_lanternport | `route_fernwick_lanternport_sign` | 10,21 | 10,22 | left (9,22) |
| route_revival | `route_revival_sign` | 2,19 | 3,20 | below (3,21) |
| route_revival_saltmere | `route_revival_saltmere_sign` | 15,2 | 14,3 | below (14,4) |
| route_saltmere_mirefen | `route_saltmere_mirefen_sign` | 2,10 | 3,11 | below (3,12) |
| route_sunmeadow_mirefen | `route_sunmeadow_mirefen_sign` | 2,8 | 3,9 | below (3,10) |
| saltmere | `saltmere_sign` | 14,10 | 14,11 | below (14,12) |
| saltmere | `saltmere_hall_sign` | 7,21 | 8,20 | below (8,21) |
| sunmeadow_fields | `sunmeadow_fields_sign` | 2,6 | 3,6 | below (3,7) |
| tidewater_coast | `tidewater_coast_sign` | 14,10 | 14,11 | below (14,12) |

route_cindervale_sign also sat under a tree canopy (invisible): canopy lifted, tree below it is now a bush; reach unchanged.
Unmoved, now with read_from: route_revival_sunmeadow_sign (13,3, fixed in batch 3), the 7 `*_hall_int_sign_hall_outside` signs (saltmere one read from left), frostspire_sled_run_top, tidewater_coast_tide_board, route_fernwick_lanternport_lock_board.
