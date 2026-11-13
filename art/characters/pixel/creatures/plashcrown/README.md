# Plashcrown - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #115 (water/rain, medium). Brief: Graceful fountain creature with a crown of arcing water jets. Palette: marble white, fountain blue, gilt, violet. Crystal: crystal in the fountain bowl on its head.
Built by creatures/_overnight/tools/c_build.py (worker C, Oct 23 2026 overnight) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: plashcrown_front_128, plashcrown_back_128 (+_2x). Back = player side, seen from behind.
- anim/: plashcrown_front_idle, plashcrown_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: biped.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/plashcrown_tod_spritegrade.png). No warmth masks yet.
