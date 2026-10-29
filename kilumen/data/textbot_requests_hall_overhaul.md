# Text Bot requests: hall overhaul (Oct 29 2026, branch dev/hall-trainers)

Placeholder text is live in text/overworld_lines.json (`placeholder: true`). Please replace. Say "hall" / "Master", never "gym"; no PP, shiny, super effective, Pokédex, Poké Ball, nurse, weed, route(s), berry.

## 1. Thirteen new hall trainers (need: name, trainer_class, pages, battle_lost, after)

`after` is said when talked to after a win, AND by every trainer once the hall's Master is beaten (even trainers never fought), so it should read fine either way.

| map | id | proposed name | hall | team |
|---|---|---|---|---|
| mirefen_hall_int | mirefen_hall_int_h7 | Rushton | mirefen | snapmoor L35, eftwarden L35, reedmoot L36 |
| tidewater_hall_int | tidewater_hall_int_h7 | Morwen | tidewater_coast | coilarch L40, spraytern L40 |
| tidewater_hall_int | tidewater_hall_int_h8 | Kit | tidewater_coast | bulwarkrab L41, tundrarch L41, squidge L42 |
| lanternport_hall_int | lanternport_hall_int_h7 | Sable | lanternport | runeskein L44, lanternkeep L44 |
| lanternport_hall_int | lanternport_hall_int_h8 | Wick | lanternport | foamkin L44, wreckwarden L44 |
| lanternport_hall_int | lanternport_hall_int_h9 | Elowen | lanternport | novarch L45, bleachghast L45 |
| lanternport_hall_int | lanternport_hall_int_h10 | Thane | lanternport | mournhorn L45, kelpstrider L45, gloamtick L46 |
| cindervale_hall_int | cindervale_hall_int_h7 | Cinda | cindervale | cinderwraith L48, slagrook L48 |
| cindervale_hall_int | cindervale_hall_int_h8 | Forge | cindervale | kilnant L48, foundrax L48 |
| cindervale_hall_int | cindervale_hall_int_h9 | Hollis | cindervale | sparkplume L48, pyrogrim L48 |
| cindervale_hall_int | cindervale_hall_int_h10 | Embry | cindervale | kilnowl L49, embermink L49 |
| cindervale_hall_int | cindervale_hall_int_h11 | Petra | cindervale | pharolith L49, emberlunx L49 |
| cindervale_hall_int | cindervale_hall_int_h12 | Slag | cindervale | calderock L49, forgeharrow L49, kilnpaw L50 |

## 2. New `system_halls` keys

| key | vars | when |
|---|---|---|
| progress | {wins} {need} {left} | hall attendant, before the Master is open |
| progress_open | {wins} {need} | attendant once enough wins (or Master beaten) |
| master_locked | {left} {wins} {need} | Master talked to with the puzzle done but too few wins (halls >4 trainers: any 4; else all) |
| master_puzzle | none | Master talked to before the player has reached the dais front through the puzzle (playtest fix: Mirefen bridge) |
| rematch_prompt | {fee} | Master after a first loss to the player; Yes/No; fee 300 paid up front, kept win or lose |
| rematch_no_gold | {fee} | player has under 300 gold |
| rematch_won | none | player wins a rematch (no prize money) |
