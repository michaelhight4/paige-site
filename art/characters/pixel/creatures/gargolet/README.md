# Gargolet - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #116 (earth/demon, small). Brief: Small stone gremlin with stubby wings, perched pose. Palette: weathered grey stone, moss, amber eyes, violet. Crystal: crystal gleams in its chest.
Built by creatures/_overnight/tools/c_build.py (worker C, Oct 23 2026 overnight) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: gargolet_front_128, gargolet_back_128 (+_2x). Back = player side, seen from behind.
- anim/: gargolet_front_idle, gargolet_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: biped.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/gargolet_tod_spritegrade.png). No warmth masks yet.
