# Glintmoth - pixel sprites (v2, approved by Gary Oct 29 2026; wired)
Kilindex #475 (bug/wind, small). Brief: Slender lacewing with leaded-glass teal and gold wings; drawn to the Skylift lamps. Art: v2, Character-models pipeline (generated reference -> creatures/_overnight c_build snap/palette/INK; tools/region4/c_build_r4.py).
Built by creatures/_overnight/tools/c_build.py (Character-models overnight pipeline, re-run for region 4 v2 on Oct 29 2026 via tools/region4/c_build_r4.py) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: glintmoth_front_128, glintmoth_back_128 (+_2x). Back = player side, seen from behind.
- anim/: glintmoth_front_idle, glintmoth_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: hover.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/glintmoth_tod_spritegrade.png). No warmth masks yet.
