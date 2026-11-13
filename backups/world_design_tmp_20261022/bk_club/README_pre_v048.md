# The Firefly (club_int): juice bar + music hangout

Not a bar. Juices, teas, shakes, records, dancing, posters. Gary HARD RULE: no drinking, drugs or smoking hints. Art: crates, paper cups, fruit, speakers; neon shows only fireflies and music notes. Words: no alcohol words.

## Map
- `maps/club_int.json`, 14x15 cells at 64 px. Built by `tools/club.py`, called from `tools/run.py`.
- Front room (rows 8-14): juice counter on the west side, dance floor in the middle, DJ stage on the east side, booths at (0,13) and (11,12).
- Back room (rows 1-5): flyer wall in row 2, paint counter at (12,4). **Open from the first visit:** a plain doorway at (7,6)-(7,8) with no gate flag (`back_room.locked=false`).
- Exit: warp (7,14) -> fernwick (26,4), facing down. The Fernwick exterior is the east side yard; see `exterior_compare.png`.
- Mood: no battles and no wild encounters. Running is allowed and bikes are not.
- Reachability (`club.verify`): 90 reachable cells. Every talk cell and stand cell can be reached, with 0 problems.

## Tile ids
- 56 new tiles, **ids 1520-1575** (club_wall_upper=1520 ... club_front_1_2=1575). They are registered late, after `world_data.late_tiles`.
- **No existing id changed or was removed.** Checked against the pre-club tileset in /tmp/bk_club/pre.
- 0 off-palette pixels. The full name=id list is in /tmp/club_ids.txt.

## NPCs (Text Bot ids used exactly, no renames)
| id | cell | talk from | note |
|---|---|---|---|
| rebel_bartender | (2,9) | (2,11), facing up | Juice counter keeper. Juices, teas and shakes only. Suggested display role: "juice counter"; optional rename to juice_vendor is Text Bot's call |
| rebel_dj | (11,9) | (11,11), facing up | Behind the DJ desk. Dawn/day: asleep in the east booth, standing at (10,12) |
| rebel_patron_1 | (6,9) | - | Looking at the poster wall |
| rebel_patron_2 | (5,12) | - | By the west booth |
| rebel_patron_3 | (8,12) | - | On the dance floor |
| rebel_bouncer | (8,13) | - | Friendly. Never blocks the way |
| rebel_paint_vendor | (13,4) | (11,4), facing right | Cosmetic crystal paint. Shop opens at dusk/night |

## Interact spots (row 2 flyer wall; stand on row 3, facing up)
`poster_names` (1,2), `missing_pell` (2,2), `missing_marta` (3,2), `missing_team_flyer` (4,2), `missing_teo` (5,2), `missing_imke` (6,2), `note_thornwood` (7,2), `note_greystone` (8,2), `note_frostspire` (9,2), `note_mirefen` (10,2). The full list, including the counter, DJ and booth props, is in `text_pending.interact_spots`. Text refs point to `overworld_lines.json unplaced.club_props.club_int.<id>`.

## Flyer-wall staging (`flag_swaps`; needs engine support)
- Note x: `club_note_slot` (an empty pin with no text) -> `club_note` when the tier flag is set -> `club_note_tick` when `camp_restored_<camp>` is set.
- At `field_team_home` (post-game), cells (1..12,2) become `club_banner_0..11`, which read "FOUND. ALL FOUR."
- The staging panel in `preview.png` shows: tier 0, +fernwick, +revival, +frostspire/camps, field_team_home.

## Reachability per note
| note | flag (Story Bot) | verdict |
|---|---|---|
| note_thornwood | beat_master_fernwick | MATCHES, if the camp is west of gate_thornwood_east. Otherwise use beat_master_saltmere |
| note_greystone | beat_master_revival | **DOES NOT MATCH.** Greystone is reachable in state 0, so the earliest fair flag is beat_master_fernwick. The map keeps Story Bot's flag until they decide |
| note_frostspire | beat_master_revival | MATCHES |
| note_mirefen | beat_master_frostspire | MATCHES |

**Camp flags and wall states:** approved as built by Story Bot (Oct 22, 9:48 PM CT): `camp_restored_thornwood`, `camp_restored_greystone`, `camp_restored_frostspire`, `camp_restored_mirefen`.

**Camp spots (Story Bot calls, 9:48 PM CT):**
| camp | status | where / why |
|---|---|---|
| camp_thornwood | **PLACED** thornwood (6,17), stand (6,18) facing up | West side patch off the trail (x4-6, y16-18), west of gate_thornwood_east (x33). Reachable in state 0. Tile `camp_cold` -> `camp_restored` on camp_restored_thornwood (flag_swaps; `requires` beat_master_fernwick). Spot in `text_pending.interact_spots` (`sets_flag`, `active_when` beat_master_fernwick); text key `maps.thornwood.camp_thornwood` requested from Text Bot. Thornwood has no fern tiles; the tall-grass side patch is the "ferns" |
| camp_greystone | **NOT PLACED** | progression.py reaches greystone_b1 **and the far side of its boulder puzzle in state 0 (no flags)**: the run log shows zone `frostspire_pass` (B1 north exit, past puzzle gates g1/g2 at (20,4)-(21,4)) reached in world state 0. The only things between the player and B1 are flag-free: Fernwick west exit -> thornwood -> warp (17,5) -> greystone_entrance forced cave-fern `gs_mouth_choke` (13-14,19-20) -> stairs (5,6) -> B1 boulder/plate puzzle. The first flag gate past B1 is the planned `gate_frostspire_bridge` (frostspire_pass <-> frostspire, beat_master_revival). Story Bot to re-tier the note (beat_master_fernwick or earlier) or move the camp past the Frostspire bridge |
| camp_frostspire | **HELD** | no Frostspire map exists yet |
| camp_mirefen | **HELD** | `mirefen_bog` exists but is a biome-worker map (maps_new, not ours to edit) with TO COME exits; it is not on the world graph, so reachability cannot be proven |

New tiles: `camp_cold`, `camp_restored` (outdoor props, block; registered after the club tiles, so no existing id moves). No fire or smoke: a cold stone ring with stacked logs.

**old_record pickups:** `item_fernwick_old_record` (27,5), `item_thornwood_old_record` (5,15) and `item_route1_old_record` (20,23). All three maps are reachable in state 0, and WORLD DATA reachability passes. **Record 4 (Lanternport) is HELD until the Lanternport map exists.**

**Renames:** none.

## Day / night (`preview.png`)
- The engine's indoor rule keeps every `*_int` on the day grade, so in-game the club is always day-lit. The night panel is a preview of what it would look like if the club followed the outdoor clock, like lantern_rest. **Coder ask.**
- Emissive (`time_of_day.EMISSIVE`): club_dance_a/b (whole tile) plus the neon boxes on club_front_0_0..0_2 and 1_0.
- **Limitation:** the night "lit" grade keeps only cream/amber, so the green dance-floor panels and greens in general go dim at night. The amber panels and the neon stay bright. Optional Coder ask: add lit entries for greens.

## Framing / touch (`framing.png`, `framing.json`)
- Tested on PC 1920x1080, phone 844x390@3 and phone 2340x1080 (851x393@2.75), using the touch rects from the auditor's model.
- Key spots: arrival, juice-counter talk, DJ talk, flyer wall and paint-vendor talk. **No focus cell or needed cell sits under the touch controls.**

## Validator handoff (Text Bot)
The validator reads `maps.<mid>`, so the club currently shows "missing spots" / "no text" for club_int and fernwick. These are the only new lines compared with the baseline. To fix them, Text Bot needs to:
1. Move the unplaced club text into `maps.club_int` (same ids).
2. Add `maps.fernwick.sign_club`. Dev text: "THE FIREFLY - juice, tunes, open late."

## Rebuild
`python3 qa/club/make_club.py` builds preview.png, exterior_compare.png and framing.png/json.
