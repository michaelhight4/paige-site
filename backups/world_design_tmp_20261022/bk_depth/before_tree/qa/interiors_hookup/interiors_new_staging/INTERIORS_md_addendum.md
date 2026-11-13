# INTERIORS.md addendum: overworld hookup (staged by the overworld worker, 2026-10-22)
This addendum is meant to be merged into `interiors_new/INTERIORS.md` by the interiors worker; the overworld worker does not edit interiors_new/.
Source of truth: `tools/interiors_merge.py`; door table: `qa/interiors_hookup/DOOR_TABLE.md`.

### Rule
- Unique interiors are only for story-necessary buildings, and each one is listed with its reason.
- Every other home uses one of exactly 4 shared designs (H1-H4):
  - `@home_pool` doors in an area are sorted by (y, x); door k gets design `POOL[(areaIndex + k) % 4]`.
  - So every run of 4 houses uses all 4 designs, and neighbouring doors never repeat a design.
  - Each door also gets a recolour scheme: the first scheme in the rotated `SCHEME_ORDER` that this design hasn't used yet in the area and that differs from the previous door's scheme.
- There is one shared heal branch, one mart and one station. Shared interiors exit with `$return`.

### Why-unique table (story-necessary buildings only)
| Interior | Story reason |
|---|---|
| house_1f | player's house 1F: Ron, E2 3 a.m. Static (TV), 8.5-F Ron's CV |
| house_2f | player's house 2F: player_start, E3 Dana's Drafts (PC), E14 Dreams Move Upstream (bed) |
| office_int | RT field office: promotion cutscene (critical path), E9 The Crystal Stares Back, 8.5-B Dana's Desk |
| fernwick_hall_int | Master of Fernwick hall: gating puzzle + coin (beat_master_fernwick, critical path) |
| lab_brookhollow | Lumen Lab: starter choice (got_starter) and 8.1 lab-tech onboarding |
| rt_branch_backroom | RT branch back room: story hook behind the STAFF ONLY door (has_branch_card) |
| home_brookhollow_b | E13 The Fireside Book: the scholar + his bookcase (was house_int_b) |
| home_fernwick_a | 8.5-E The Kid's Last Joke: parent_c (job ads) + kid_c, TV (was house_int_c, door fernwick (22,6)) |
| heal_fernwick | 8.5-E: parent_c later works here as a Care Associate (the Fernwick branch needs its own state) |

### Shared home designs (exactly 4)
| Id | Map | Size | Style |
|---|---|---|---|
| H1 | home_brookhollow_a | 10x8 | oak cottage, fireplace, red rug |
| H2 | home_fernwick_c | 12x9 | pine lodge, big sand rug, fishing corner |
| H3 | home_lanternport_c (+ home_lanternport_c_2f) | 12x10 + 2F | teal parquet family home: kitchen, sofa, TV; bedroom upstairs |
| H4 | home_saltmere_a | 12x9 | driftwood-and-stone seaside room, teal rug |

Shared chains: heal = `heal_brookhollow` (any town without a story reason for its own branch), mart = `shop_int`, station = `station_int`.

### Per-area assignment
**Brookhollow** (area index 0)
| Door | Interior | Kind | Recolour |
|---|---|---|---|
| (5, 7) | house_1f | unique | - |
| (6, 19) | heal_brookhollow | heal (shared chain) | - |
| (16, 19) | shop_int | mart (shared chain) | - |
| (28, 8) | office_int | unique | - |
| (15, 7) | home_brookhollow_a | home (shared H1) | identity |
| (28, 19) | home_brookhollow_b | unique | - |
| (16, 27) | lab_brookhollow | unique | - |

**Fernwick** (area index 1)
| Door | Interior | Kind | Recolour |
|---|---|---|---|
| (5, 6) | heal_fernwick | unique | - |
| (16, 6) | shop_int | mart (shared chain) | - |
| (22, 6) | home_fernwick_a | unique | - |
| (16, 18) | home_lanternport_c | home (shared H3) | slate |
| (5, 17) | home_fernwick_c | home (shared H2) | ochre |
| (23, 18) | fernwick_hall_int | unique | - |

## Spares (not hooked up, keep and mark as spare)
- hall_aurelith
- hall_cindervale
- hall_lanternport
- hall_revival_heights
- hall_saltmere
- heal_aurelith
- heal_cindervale
- heal_lanternport
- heal_revival_heights
- heal_saltmere
- home_aurelith_a
- home_aurelith_a_2f
- home_aurelith_b
- home_cindervale_a
- home_cindervale_b
- home_cindervale_b_2f
- home_fernwick_b
- home_lanternport_a
- home_lanternport_b
- home_revival_heights_a
- home_revival_heights_a_2f
- home_revival_heights_b
- home_revival_heights_c
- home_saltmere_b
- home_saltmere_b_2f
- home_saltmere_c
- mart_aurelith
- mart_cindervale
- mart_lanternport
- mart_revival_heights
- mart_saltmere
- rt_hq_lobby
- station_aurelith
- station_lanternport
- station_revival_heights
- station_saltmere

## Recolours
- `home_recolours.json` and `masks/` are staged next to this file. The format is described in OVERWORLD_README section 15.1.
- Draw order: recolour first, then the time-of-day grade.
