# Hushowl - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #20 (dark/bird, small). Brief: Round owlet; heart-shaped face, oversized amber eyes, fluffy down. Palette: dusk violet-grey, cream, amber eyes, violet. Crystal: crystal in the facial disc.
Built by creatures/_overnight/tools/c_build.py (worker C, Oct 23 2026 overnight) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: hushowl_front_128, hushowl_back_128 (+_2x). Back = player side, seen from behind.
- anim/: hushowl_front_idle, hushowl_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: biped.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/hushowl_tod_spritegrade.png). No warmth masks yet.
