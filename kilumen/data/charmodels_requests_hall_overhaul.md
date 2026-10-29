# Charmodels requests: hall overhaul (Oct 29 2026, branch dev/hall-trainers)

13 new hall trainers use stand-in sprites copied from fernwick helper_1 / helper_2 (npc_sprite_map). Each needs its own hall-themed trainer (overworld 4-dir walk + battle front), matching its hall's look.

| id | proposed name | hall | theme |
|---|---|---|---|
| mirefen_hall_int_h7 | Rushton | mirefen | bog / reeds, waders |
| tidewater_hall_int_h7 | Morwen | tidewater_coast |  |
| tidewater_hall_int_h8 | Kit | tidewater_coast |  |
| lanternport_hall_int_h7 | Sable | lanternport | lanterns, ghost-light |
| lanternport_hall_int_h8 | Wick | lanternport | lanterns, ghost-light |
| lanternport_hall_int_h9 | Elowen | lanternport | lanterns, ghost-light |
| lanternport_hall_int_h10 | Thane | lanternport | lanterns, ghost-light |
| cindervale_hall_int_h7 | Cinda | cindervale | lava forge, soot apron |
| cindervale_hall_int_h8 | Forge | cindervale | lava forge, soot apron |
| cindervale_hall_int_h9 | Hollis | cindervale | lava forge, soot apron |
| cindervale_hall_int_h10 | Embry | cindervale | lava forge, soot apron |
| cindervale_hall_int_h11 | Petra | cindervale | lava forge, soot apron |
| cindervale_hall_int_h12 | Slag | cindervale | lava forge, soot apron |

Also still stand-in: hall floor art listed in each map's hall_v2.stand_in_art (plates, gates, push arrows reuse ix2 / core tiles where the Animator kit has no tile).
