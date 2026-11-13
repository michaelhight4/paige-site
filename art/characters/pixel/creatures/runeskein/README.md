# Runeskein - pixel sprites (wild)
Built by pixel/tools/wild_step1..6 from raw/ (generated art referencing the painted master), pilot pipeline: snap -> 64-colour palette -> outline/clean.
- battle/: runeskein_front_128, runeskein_back_128 (+_2x). Back = player side, seen from behind.
- anim/: runeskein_front_idle, runeskein_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs.
- base/: one cleaned base per view (all frames derive from it) + meta.json.

Notes: Teal weave saturation boosted pre-snap so it survives the palette. Right OW view = mirror of left (source right view lost the violet antenna crystal).
