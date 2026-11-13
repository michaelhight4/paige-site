# Kilumen NPC cast — villagers + trainers

Generated 2026-10-22 19:38 CDT. **Status: DRAFT — not approved to ship until Gary says so.**

All original designs (no Pokémon designs copied). Same layout, naming, frame counts and pipeline as humans/cal, mira, ron (see _parts/starters_humans_README.md).

## Pipeline
GenerateImage chibi turnaround master (4 views) → normal-proportion turnaround (trainers) → painted 3-bust portrait sheet (trainers) → code: white cutout, downscale, quantize, redmean remap to the official 64-colour palette (art/world/overworld/palette.hex) via tools/sh_pxlib.py → stray-pixel cleanup → walk/idle frames built in code from one cleaned base per view (sh_pxlib.walk_frames + 1–2 px arm-gap sliver patch).
Palette check: 0 off-palette opaque pixels and 0 semi-alpha pixels across all overworld + trainer PNGs (portraits are painted, exempt like humans/*/portraits).

Build: `cd npcs/_tools && python3 npc_build.py villagers && python3 npc_build.py trainers && python3 preview.py villager trainer extra && python3 finalize.py`

Per-NPC options in _tools/cast.json: sat, hueboost / hueboost_t (saturation boost in hue band; _t = trainer sprite only), fillhue / fillhue_v (solid fill of a hue band, per view), vswap (per-view colour swap), rowpaint (per-view base-pixel recolour), flips, tth (battle-sprite height: kids 104, teen 116, adults full).

## Layout per NPC (npcs/<id>/)
- overworld/<id>_chibi/<id>_chibi_{down,left,right,up}_{stand,walk0..3}(.png,_2x,_3x) — 64x96, feet bottom-centre
- overworld/<id>_chibi_sheet(.png,_2x,_3x) — 320x384 (rows down/left/right/up; cols stand+walk0-3); _walk_{dir}_{2,3}x.gif, _walk_all_{2,3}x.gif (150 ms)
- trainers only: trainer/<id>_trainer_64x128(.png,_2x,_3x); portraits/<id>_<expr>.png (512 px tall, transparent; neutral/happy/angry; Fernwick neutral/pleased/stern; Saltmere neutral/grin/stern)
- _raw/: GenerateImage masters (<id>_chibi.jpg, <id>_normal.jpg, <id>_portraits.jpg)

## Cast
Villagers (25):
- vil_gardener_f — gardener (adult woman)
- vil_fisher_m — fisherman (adult man)
- vil_kid_m — village boy (kid)
- vil_kid_f — village girl (kid)
- vil_guard_m — route guard (adult man)
- vil_receptionist_f — office receptionist (young woman)
- vil_manager_m — office manager (middle-aged man)
- vil_office_m — office worker (young man)
- vil_healer_f — heal-centre healer (woman)
- vil_shopkeeper_m — shop clerk (man)
- vil_cook_f — home cook / mother (woman)
- vil_parent_m — father (adult man)
- vil_scholar_m — scholar (old man)
- vil_elder_f — elder (grandmother, cane)
- vil_elder_m — elder (grandfather)
- vil_courier_f — ex-courier (young woman)
- vil_dissident_m — forest dissident (young man)
- vil_worker_f — quarry/rail worker (woman)
- vil_officer_f — transit / airspace officer (woman)
- vil_kid_m_b — village boy (kid) - green-shirt swap
- vil_kid_f_b — village girl (kid) - pink overalls / ginger swap
- vil_office_m_b — commuter / clerk (young man) - mint shirt swap
- vil_guard_m_b — station attendant / doorman (man) - navy+gold swap
- vil_receptionist_f_b — pass clerk / office clerk (woman) - burgundy suit swap
- vil_gardener_f_b — farmer (woman) - blue apron swap

Trainers (15):
- tr_youngster_m — youngster (boy)
- tr_lass_f — lass (girl)
- tr_camper_f — camper (teen girl)
- tr_bugcatcher_f — bug catcher (girl)
- tr_ranger_m — forest ranger (man)
- tr_hiker_m — hiker (man)
- tr_hiker_f — hiker (woman)
- tr_swimmer_m — swimmer (man)
- tr_swimmer_f — swimmer (woman)
- tr_scientist_m — scientist (man)
- tr_scientist_f — scientist (woman)
- tr_gymtrainer_m — Fernwick hall trainee (young man)
- tr_gymtrainer_f — Fernwick hall trainee (young woman)
- tr_master_fernwick_m — Master of Fernwick (earth, man)
- tr_master_saltmere_f — Master of Saltmere (coastal, woman)

## Files
- npcs/npc_sprite_map.json — <map_id>.<spot_id> → sprite paths (35 spots incl. ron + unplaced lucky_crystal_seller) + unassigned_ready
- npcs/manifest.json — every file with bytes/size + palette check
- _preview/villagers_preview.png, villagers_walk_2x.gif, trainers_preview.png, trainers_walk_2x.gif, trainers_battle_2x.png, portraits_preview.png

## Caveats
- Healer braid side differs slightly between views; hiker_f braid is behind her in side/back views.
- vil_office_m hair reads somewhat Ron-like; officer_f shoulder-cord side is minor.
- Master of Saltmere type is unspecified in the text: neutral coastal design.
- swimmer_f kickboard dropped; scientist_m shirt is teal (follows the chibi master).
- Muted olive greens are not on the palette, so some greens are saturation-boosted to avoid collapsing to brown.
- gymtrainer_m portraits use a square-cut bust instead of the rounded vignette.
- lucky_crystal_seller uses a placeholder reuse; dedicated design recommended.
- Single-pixel pinholes inherent to the pipeline (same as existing humans).
