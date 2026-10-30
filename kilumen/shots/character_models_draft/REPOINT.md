# DRAFT - Character models: Hall Master overworlds + Ondravel native overworld
New files only; no wiring changed. Coder repoints.

## Masters (npc_sprite_map.json, 4 keys)
Replace `tr_gymtrainer_f|m` with the Master id in every path of these entries (sprite_id, overworld_sheet(_2x/_3x), trainer_64x128, portraits) and drop overworld_frames_dir (frames are not committed in this repo, same as tr_master_saltmere_f):
- `lanternport_hall_int.lanternport_hall_int_master` -> `tr_master_lanternport_f` (portraits: grin/neutral/stern)
- `cindervale_hall_int.cindervale_hall_int_master` -> `tr_master_cindervale_m` (grin/neutral/stern)
- `tidewater_hall_int.tidewater_hall_int_master` -> `tr_master_tidewater_m` (see files in portraits/)
- `mirefen_hall_int.mirefen_hall_int_master` -> `tr_master_mirefen_f` (neutral/pleased/stern)
Portrait mood keys differ from the stand-ins (angry/happy/neutral); map angry->stern, happy->grin|pleased if the dialogue code asks by mood.

## Ondravel (dev/wellspire-v2 only: summit_fx.js lives in /workspace/wt_wellspire, a different repo)
`ondravel_ow256_sheet.png` is a drop-in for `ondravel_big_sheet.png`: 1536x768, 6 cols x 3 rows of 256x256 (rows 0 sealed, 1 awake, 2 flare), native 1x, binary alpha, official palette, #191210 outline. Bottom-centre anchor, same as summit_fx.js draws.
Repoint: in maps fin_lab1_now / fin_past_enclosure / fin_past_wlab_10_ondravel set `ondravel.sheet` to `art/characters/pixel/creatures/ondravel/overworld/ondravel_ow256_sheet.png`.
Note: on fin_lab1_now rows >= 1 the Animator's `ondravel_summit_tower` (9x9) overrides the sheet; only row 0 (sealed) shows there unless that anim is removed.
Collision (grid-fit): footprint 4x4 at map ondravel {x centre, y feet}: block the bottom 2 tile rows, all 4 columns (tiles x-2..x+1, y-1..y); top 2 rows are antlers/head, walk-behind OK. Details in ondravel_ow256_meta.json. Maps not edited.
