# Burlbeetle - pixel sprites (wild)
Built by pixel/tools/wild_step1..6 from raw/ (generated art referencing the painted master), pilot pipeline: snap -> 64-colour palette -> outline/clean.
- battle/: burlbeetle_front_128, burlbeetle_back_128 (+_2x). Back = player side, seen from behind.
- anim/: burlbeetle_front_idle, burlbeetle_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs.
- base/: one cleaned base per view (all frames derive from it) + meta.json.

Notes: 6 legs: generated art had 4-5 tortoise legs, so darker far-side legs were added in code (wild_step2_legfix.py, pre-fix copies in _work/). In front/back OW views only the front/rear pair plus tucked middle pair show; side OW shows 3 near + 2 far peeking. Right OW view = mirror of view 2 (source views 2 and 3 both faced left).
