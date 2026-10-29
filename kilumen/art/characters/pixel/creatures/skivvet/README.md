# Skivvet - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #476 (wind, small). Brief: Ski-footed stoat that skids down powder slopes. Drawn in Aseprite (tools/region4/creatures.lua).
Built by creatures/_overnight/tools/c_build.py (Character-models overnight pipeline, re-run for region 4 v2 on Oct 29 2026 via tools/region4/c_build_r4.py) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: skivvet_front_128, skivvet_back_128 (+_2x). Back = player side, seen from behind.
- anim/: skivvet_front_idle, skivvet_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: quad.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/skivvet_tod_spritegrade.png). No warmth masks yet.
