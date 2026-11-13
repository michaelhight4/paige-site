# Sailquill - pixel sprites (wild)
Built by pixel/tools/wild_step1..6 from raw/ (generated art referencing the painted master), pilot pipeline: snap -> 64-colour palette -> outline/clean.
- battle/: sailquill_front_128, sailquill_back_128 (+_2x). Back = player side, seen from behind.
- anim/: sailquill_front_idle, sailquill_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs.
- base/: one cleaned base per view (all frames derive from it) + meta.json.

Notes: 2 tail streamers (verified in every view). Right OW view drawn separately (source view faced right).
