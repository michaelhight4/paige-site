# Gloamtick - pixel sprites (wild)
Built by pixel/tools/wild_step1..6 from raw/ (generated art referencing the painted master), pilot pipeline: snap -> 64-colour palette -> outline/clean.
- battle/: gloamtick_front_128, gloamtick_back_128 (+_2x). Back = player side, seen from behind.
- anim/: gloamtick_front_idle, gloamtick_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs.
- base/: one cleaned base per view (all frames derive from it) + meta.json.

Notes: Violet crystal lantern held in paw, visible in all views (follows the painted master; NOTES says tail). Legless floater: idle bobs whole body, OW walk = hover bob + smoke-tail sway. OW source regenerated without the spare's bat wings. Right OW view = mirror of left (source view 3 faced left), so the lantern swaps paws when facing right.
