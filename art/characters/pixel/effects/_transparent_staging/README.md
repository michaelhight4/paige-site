# _transparent_staging (NOT live; waiting on Gary's OK)
Transparent, effect-sized replacements for the full-scene `<el>/<anim>/<el>_<anim>_battle_2x.gif` files (impact + travel_p2f + travel_f2p, 23 elements).
Per `<el>/<anim>/`: `<el>_<anim>_battle_2x.gif` (same name as live; 1-bit alpha, disposal 2, 2x NN, cropped), `_sheet.png`, `.json` (frame rects, ms, anchor),
`_sheet_aseprite.json` (Aseprite's own export data), `<el>_<anim>.aseprite` (1x source: layer fx, one tag, slices impact_centre / path_start / path_end, Kilumen 64 palette).
Rebuild order: `_tools/build_transparent_staging.py` -> `_tools/aseprite/prep_aseprite_inputs.py` -> run `kil_fx_build.lua` in Gary's Aseprite (batch) -> `_tools/aseprite/import_aseprite_results.py` -> `_tools/validate_transparent.py` -> `_tools/make_transparent_previews.py`.
(Re-running only the first step overwrites the GIF/JSON with the box-built version: same pixels, but no `aseprite` block in the JSON.)
Previews: `_preview/`. Swap: `_tools/swap_in_transparent.py` (dry run by default; `--apply` backs up to /workspace/backups/kilumen_effects_fullscene_<ts>/).

2026-10-30: original smoke restored in fire/magma/devil/demon/earth/swamp/bug/ghost (Gary: smoke FX allowed). Smokeless copy: ../_transparent_staging_prev_nosmoke_20261022/. Previews: _smoke_restore_preview/. .aseprite for the changed anims must be rebuilt in Aseprite.
2026-10-30 (later): .aseprite + sheet json rebuilt in Aseprite 1.3.18.6 for all 22 changed folders (sheets pixel-identical). Swamp night fix: light rim a6d460 + core G1b (night 0.525-0.597). Backup: _swamp_prev_nightrim_20261030/. JuiceFX notes: _juicefx_compare/README.md.
