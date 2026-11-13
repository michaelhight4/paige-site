# Mirewump - pixel sprites (wild)
Built by pixel/tools/wild_step1..6 from raw/ (generated art referencing the painted master), pilot pipeline: snap -> 64-colour palette -> outline/clean.
- battle/: mirewump_front_128, mirewump_back_128 (+_2x). Back = player side, seen from behind.
- anim/: mirewump_front_idle, mirewump_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs.
- base/: one cleaned base per view (all frames derive from it) + meta.json.

Notes: Source art is olive-grey which the palette maps to violet-grey; hue shifted +30deg / sat x1.6 pre-snap so it reads as a mossy swamp green (matches master intent).
