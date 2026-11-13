# Nibbin - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #13 (earth, small). Brief: Chubby field vole; huge round ears, stuffed cheeks, twitchy whiskers. Palette: fawn, cream, cocoa, violet. Crystal: crystal set in the tip of one ear.
Built by creatures/_overnight/tools/c_build.py (worker C, Oct 23 2026 overnight) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: nibbin_front_128, nibbin_back_128 (+_2x). Back = player side, seen from behind.
- anim/: nibbin_front_idle, nibbin_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: quad.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/nibbin_tod_spritegrade.png). No warmth masks yet.
