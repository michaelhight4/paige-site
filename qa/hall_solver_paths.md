# Hall solver paths (regenerated Oct 30 2026 from the current maps)

Start = the tile you stand on right after walking in (one tile inside the door), facing up. World speed 1x.
Each step is a key press held about 190 ms (a full step). A very short tap (under ~100 ms) only TURNS you in place without
stepping; that is intended (classic grid movement), so hold each key until you move.
Each step is a key press: "Up 3" = tap Up three times (ice and push tiles may carry you further; the path accounts for that).
"face Left + F" = tap Left once (you only turn: a trainer or prism is there), then press F to battle / turn it.
Win every battle. Trainers spot you, walk up and turn you to face them; the path already includes that (it was recorded on the real game code).
If you get lost: walk back out of the door and in again, then start the path from the top.
Raw tokens are U/D/L/R and A (= F). Machine copy: hall_v2.solver_path in each map json. Test: tests/hall_solver_paths.test.mjs.

## Fernwick

### fernwick_hall_int - start (9,19), wins here 4, ends: Master: face Up + F at the dais

Battles in order: helper_1, helper_2, fernwick_hall_int_h3, master_fernwick

Up 2, Right 6, Up 2, Right 2, Up 4, Left 2, Up 2, Left 2, Up 4, Down 4, Right 2, Down 2, Right 2, Up 3, Down 3, Left 2, Up 2, Left 2, Up 4, Left 2, Up 3, Left 2, face Up + F

`UURRRRRRUURRUUUULLUULLUUUUDDDDRRDDRRUUUDDDLLUULLUUUULLUUULLUA`

## Saltmere

### saltmere_hall_int - start (7,15), wins here 5, ends: Master: face Up + F at the dais

Battles in order: saltmere_hall_int_h1, saltmere_hall_int_h2, saltmere_hall_int_h3, saltmere_hall_int_h4, saltmere_hall_int_master

Up 2, Right 4, Up 4, Left 4, Down 2, Left 4, Up 1, Down 1, Right 4, Up 2, Right 4, Up 4, Down 2, Left 10, Up 2, Down 2, Right 10, Up 2, Right 2, Down 2, Up 2, Left 2, Down 2, Left 10, Up 2, Right 2, Up 2, Right 1, Up 1, Right 3, face Up + F

`UURRRRUUUULLLLDDLLLLUDRRRRUURRRRUUUUDDLLLLLLLLLLUUDDRRRRRRRRRRUURRDDUULLDDLLLLLLLLLLUURRUURURRRUA`

## Mirefen

### mirefen_hall_int - start (9,21), wins here 7, ends: Master: face Up + F at the dais

Battles in order: mirefen_hall_int_h1, mirefen_hall_int_h2, mirefen_hall_int_h3, mirefen_hall_int_h4, mirefen_hall_int_h5, mirefen_hall_int_h6, mirefen_hall_int_master

Left 3, Up 1, Left 3, Up 3, Right 11, Up 1, Right 2, Up 9, Left 4, Up 2, Left 4, Down 2, Left 2, Up 2, Left 6, Down 3, Up 3, Right 6, Down 2, Right 2, Up 5, face Up + F

`LLLULLLUUURRRRRRRRRRRURRUUUUUUUUULLLLUULLLLDDLLUULLLLLLDDDUUURRRRRRDDRRUUUUUUA`

## Tidewater Coast

### tidewater_hall_int - start (10,19), wins here 7, ends: Master: face Up + F at the dais

Battles in order: tidewater_hall_int_h1, tidewater_hall_int_h2, tidewater_hall_int_h3, tidewater_hall_int_h4, tidewater_hall_int_h5, tidewater_hall_int_h6, tidewater_hall_int_master

Up 2, Right 7, Up 2, Left 2, Up 2, Left 6, Up 2, Left 2, Down 2, Left 2, Up 2, Left 4, Down 2, Right 1, Left 1, Up 2, Right 4, Down 2, Up 1, Down 1, Right 2, Up 2, Right 2, Down 2, Right 4, Up 2, Right 2, Up 2, Left 5, Up 1, Left 1, Up 1, Right 1, Up 2, Right 2, Up 1, Right 3, face Up + F

`UURRRRRRRUULLUULLLLLLUULLDDLLUULLLLDDRLUURRRRDDUDRRUURRDDRRRRUURRUULLLLLULURUURRURRRUA`

## Frostspire

### frostspire_hall_int - start (8,19), wins here 7, ends: Master: face Up + F at the dais

Battles in order: frostspire_hall_int_h1, frostspire_hall_int_h2, frostspire_hall_int_h3, frostspire_hall_int_h4, frostspire_hall_int_h5, frostspire_hall_int_h6, frostspire_hall_int_master

Up 2, Left 7, Up 3, Right 3, Down 1, Right 1, Up 2, Left 4, Up 2, Left 2, Up 3, Left 2, Up 2, Right 4, Up 1, Right 3, face Up + F

`UULLLLLLLUUURRRDRUULLLLUULLUUULLUURRRRURRRUA`

## Cindervale

### cindervale_hall_int - start (12,31), wins here 11, ends: Master: face Up + F at the dais

Battles in order: cindervale_hall_int_h1, cindervale_hall_int_h2, cindervale_hall_int_h3, cindervale_hall_int_h4, cindervale_hall_int_h6, cindervale_hall_int_h7, cindervale_hall_int_h8, cindervale_hall_int_h9, cindervale_hall_int_h10, cindervale_hall_int_h11, cindervale_hall_int_master

Up 2, Right 9, Up 2, Left 11, Up 1, Left 3, Up 1, Left 1, Up 5, Right 1, Up 4, Left 1, Up 2, Left 2, Up 4, Right 2, Down 2, Right 2, Up 2, Right 18, Down 4, Left 2, Up 2, Left 1, Right 1, Down 2, Right 2, Up 4, Left 18, Up 2, Right 2, Up 2, Right 2, Up 1, Right 3, face Up + F

`UURRRRRRRRRUULLLLLLLLLLLULLLULUUUUURUUUULUULLUUUURRDDRRUURRRRRRRRRRRRRRRRRRDDDDLLUULRDDRRUUUULLLLLLLLLLLLLLLLLLUURRUURRURRRUA`

## Revival Heights

### revival_hall_int - start (8,27), wins here 5, ends: Master: face Up + F at the dais

Battles in order: revival_hall_int_h1, revival_hall_int_h4, revival_hall_int_h2, revival_hall_int_h3, revival_hall_int_master

Up 1, Right 5, Up 5, Right 2, Up 6, Left 1, Right 1, Down 4, Left 4, Up 2, Left 4, Down 2, Right 2, Down 2, Left 2, Down 2, Left 4, Up 4, Right 2, Up 2, Left 2, Up 2, Left 2, Right 2, Down 2, Right 2, Down 2, Left 2, Down 4, Right 4, Up 2, Right 2, Up 2, Left 2, Up 2, Right 4, Down 2, Right 4, Down 2, Left 2, Down 5, Left 1, face Up + F, face Up + F, face Down + F, face Down + F, face Down + F, Left 7, face Up + F, face Up + F, face Up + F, face Down + F, face Down + F, face Down + F, Right 8, Up 5, Right 2, Up 6, Left 4, Up 4, Left 2, Up 2, Left 2, Up 2, Right 2, Up 2, Left 6, Up 2, Right 2, Up 1, Right 3, face Up + F

`URRRRRUUUUURRUUUUUULRDDDDLLLLUULLLLDDRRDDLLDDLLLLUUUURRUULLUULLRRDDRRDDLLDDDDRRRRUURRUULLUURRRRDDRRRRDDLLDDDDDLUAUADADADALLLLLLLUAUAUADADADARRRRRRRRUUUUURRUUUUUULLLLUUUULLUULLUURRUULLLLLLUURRURRRUA`

## Lanternport (lighthouse)

### lanternport_lighthouse_int - start (11,9), wins here 2, ends: stairs up at 17,0

Battles in order: lanternport_hall_int_h1, lanternport_hall_int_h2

Up 2, Left 10, Up 2, Right 2, Up 2, Right 2, Up 2, Right 4, Down 2, Left 2, Down 2, Right 4, Up 4, Right 4, Down 2, Left 2, Down 2, Right 6, Up 2, Left 2, Up 3

`UULLLLLLLLLLUURRUURRUURRRRDDLLDDRRRRUUUURRRRDDLLDDRRRRRRUULLUUU`

### lanternport_lighthouse_f2 - start (17,5), wins here 2, ends: stairs up at 21,0

Battles in order: lanternport_hall_int_h7, lanternport_hall_int_h8

Up 2, Right 2, face Up + F, Up 1, Right 1, Up 2, Left 4, Down 2, Right 4, Up 2

`UURRUAURUULLLLDDRRRRUU`

### lanternport_lighthouse_f3 - start (21,5), wins here 1, ends: stairs up at 21,0

Battles in order: lanternport_hall_int_h9

Left 2, Up 2, Right 2, Up 2

`LLUURRUU`

### lanternport_hall_int - start (21,3), wins here 1, ends: Master: face Up + F at the dais

Battles in order: lanternport_hall_int_master

Left 7, Up 1, Left 3, face Up + F

`LLLLLLLULLLUA`
