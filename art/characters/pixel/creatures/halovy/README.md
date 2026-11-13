# Halovy - pixel sprites (wild)
Built by pixel/tools/wild_step1..6 from raw/ (generated art referencing the painted master), pilot pipeline: snap -> 64-colour palette -> outline/clean.
- battle/: halovy_front_128, halovy_back_128 (+_2x). Back = player side, seen from behind.
- anim/: halovy_front_idle, halovy_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs.
- base/: one cleaned base per view (all frames derive from it) + meta.json.

Notes: Halo interior punched transparent in code (it snapped as a filled disc). Right OW view = mirror of left (symmetric; source views nearly touched / view 3 malformed). Pink/grey palette entries excluded so the chest stays cream.
