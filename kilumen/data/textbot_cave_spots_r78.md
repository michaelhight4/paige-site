# Region 7/8 caves: real spot ids (coder -> Text Bot, Oct 29 2026)
Source: World Design `wd/regions78` f3ff6197, `design/regions78/wd_text_spots.md`, merged into dev/regions-5-8.
Put each id under `maps.<map>.<id>` in text/overworld_lines.json (same shape as other signs / NPCs / spots:
`pages` plus `lines:[{id:'default',flags:[],pages}]`). DRAFT. Blocked words apply; no alcohol, drugs or smoking.

| map | kind | real id (use this) | your parked guess | status |
|---|---|---|---|---|
| lanternport | sign | `lanternport_lanternport_grotto_sign` | `lanternport_grotto.sign_entrance` | WIRED (your parked lines) |
| lanternport_grotto | npc | `lanternport_grotto_tidewatcher` | - | NEEDS LINES (old tide-watcher at 18,14, keeps the keeper's lamps lit) |
| lanternport_grotto | spot | `lanternport_grotto_signal_crate` | - | story beat, see below |
| lanternport_grotto | spot | `lanternport_grotto_keeper_lamps` | - | NEEDS LINES (keeper lanterns, 13,4) |
| lanternport_grotto | spot | `lanternport_grotto_nets` | - | NEEDS LINES (drying nets, 11,5) |
| cindervale | sign | `cindervale_cindervale_caldera_sign` | `cindervale_caldera.sign_entrance` | WIRED (your parked lines) |
| cindervale_caldera | npc | `cindervale_caldera_smelter` | - | NEEDS LINES (retired smelter, 13,17) |
| cindervale_caldera | sign | `cindervale_caldera_sign` | - | NEEDS LINES (board by the exit: keep off the slag channel, use the bridges) |
| cindervale_caldera | spot | `cindervale_caldera_old_forge` | - | NEEDS LINES (cold forge + anvil, 4,6) |
| cindervale_caldera | spot | `cindervale_caldera_ore_cart` | - | NEEDS LINES (ore cart on the north rail, 9,5) |

**Parked trainer lines:** `trainer_1` / `trainer_2` in both caves have no home. WD placed no cave trainers, so they stay parked
until World Design adds trainers.

**SIGNAL crate story beat** (`lanternport_grotto_signal_crate`, wired in src/region78/index.js). The keys are placeholders:
- `system_story_r78.signal_crate_first`: first look. This is the "LANTERNPORT. INSTRUMENTS - SIGNAL." crate from the Tidewater
  lab (`system_story_r56.g23_crate`, nailed shut there). Here it has ended up in the keeper's alcove. Story Bot decides what is
  inside (empty / opened / what it says about the signal). Sets flag `found_signal_crate_r7`.
- `system_story_r78.signal_crate_again`: later looks.
