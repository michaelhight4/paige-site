# Shagmount - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #214 (earth, huge). Brief: Massive yak with long fringe coat and sweeping horns. Palette: shaggy brown, cream, horn grey, violet. Crystal: crystal braided into the fringe, later on the horn base.
Built by creatures/_overnight/tools/c_build.py (worker C, Oct 23 2026 overnight) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: shagmount_front_128, shagmount_back_128 (+_2x). Back = player side, seen from behind.
- anim/: shagmount_front_idle, shagmount_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: quad, right = mirror of left.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/shagmount_tod_spritegrade.png). No warmth masks yet.
