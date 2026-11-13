# Door -> interior check table (generated from door_table.json by run.py, 2026-10-22)

| Town | Door (x,y) | Interior | Kind | Arrival | Recolour | Way back | Why unique |
|---|---|---|---|---|---|---|---|
| brookhollow | (5, 7) | house_1f | unique | (5, 8) | - | brookhollow (5,8) | player's house 1F: Ron, E2 3 a.m. Static (TV), 8.5-F Ron's CV |
| brookhollow | (6, 19) | heal_brookhollow | heal (shared chain) | (6, 8) | - | $return | - |
| brookhollow | (16, 19) | shop_int | mart (shared chain) | (5, 7) | - | $return | - |
| brookhollow | (28, 8) | office_int | unique | (7, 10) | - | brookhollow (28,9) | RT field office: promotion cutscene (critical path), E9 The Crystal Stares Back, 8.5-B Dana's Desk |
| brookhollow | (15, 7) | home_brookhollow_a | home (shared H1) | (5, 6) | identity | $return | - |
| brookhollow | (28, 19) | home_brookhollow_b | unique | (6, 8) | - | brookhollow (28,20) | E13 The Fireside Book: the scholar + his bookcase (was house_int_b) |
| brookhollow | (16, 27) | lab_brookhollow | unique | (7, 9) | - | brookhollow (16,28) | Lumen Lab: starter choice (got_starter) and 8.1 lab-tech onboarding |
| fernwick | (5, 6) | heal_fernwick | unique | (6, 8) | - | fernwick (5,7), fernwick (6,7) | 8.5-E: parent_c later works here as a Care Associate (the Fernwick branch needs its own state) |
| fernwick | (16, 6) | shop_int | mart (shared chain) | (5, 7) | - | $return | - |
| fernwick | (22, 6) | home_fernwick_a | unique | (5, 8) | - | fernwick (22,7) | 8.5-E The Kid's Last Joke: parent_c (job ads) + kid_c, TV (was house_int_c, door fernwick (22,6)) |
| fernwick | (16, 18) | home_lanternport_c | home (shared H3) | (6, 8) | slate | $return | - |
| fernwick | (5, 17) | home_fernwick_c | home (shared H2) | (7, 7) | ochre | $return | - |
| fernwick | (23, 18) | fernwick_hall_int | unique | (7, 16) | - | fernwick (23,19) | Master of Fernwick hall: gating puzzle + coin (beat_master_fernwick, critical path) |

All rows were checked by `interiors_merge.check` in `tools/run.py`. It checks the door tile is code 4, the target is not retired, the arrival is walkable, the `$return` landing is walkable, explicit exits follow the offset rule, no `@home_pool` is left unassigned, the 4-design rotation, that neighbouring doors never share a recolour, and that no design+scheme pair repeats in an area. Result: OK, ALL CONNECTED, PROGRESSION: PASS.
