# _transparent_staging (NOT live; waiting on Gary's OK)
Transparent, effect-sized replacements for the full-scene `<el>/<anim>/<el>_<anim>_battle_2x.gif` files (impact + travel_p2f + travel_f2p, 23 elements).
Per `<el>/<anim>/`: `<el>_<anim>_battle_2x.gif` (same name as live; 1-bit alpha, disposal 2, 2x NN, cropped), `_sheet.png`, `.json` (frame rects, ms, anchor),
`_sheet_aseprite.json` (Aseprite's own export data), `<el>_<anim>.aseprite` (1x source: layer fx, one tag, slices impact_centre / path_start / path_end, Kilumen 64 palette).
Rebuild order: `_tools/build_transparent_staging.py` -> `_tools/aseprite/prep_aseprite_inputs.py` -> run `kil_fx_build.lua` in Gary's Aseprite (batch) -> `_tools/aseprite/import_aseprite_results.py` -> `_tools/validate_transparent.py` -> `_tools/make_transparent_previews.py`.
(Re-running only the first step overwrites the GIF/JSON with the box-built version: same pixels, but no `aseprite` block in the JSON.)
Previews: `_preview/`. Swap: `_tools/swap_in_transparent.py` (dry run by default; `--apply` backs up to /workspace/backups/kilumen_effects_fullscene_<ts>/).
