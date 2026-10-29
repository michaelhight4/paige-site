# Harlequop - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #TBD (dark/devil, medium). Brief: Jestrix stage 3: lanky leaping card magician, tall three-point harlequin hat, violet crystal on hat front, diamond vest, sash, fans of purple/gold plain-backed cards.
Built by creatures/_overnight/tools/c_build.py (Character-models overnight pipeline, re-run for regions 5-6 DRAFT on Oct 29 2026 via kilumen_r56_creatures/tools/c_build_r56_draft.py) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: harlequop_front_128, harlequop_back_128 (+_2x). Back = player side; per the Jestrix-line brief the back is the front mirrored.
- anim/: harlequop_front_idle, harlequop_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: biped, right = mirror of left.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: jestrix_line/_qa/tod/harlequop_tod_spritegrade.png). No warmth masks yet.
- Jestrix line v2 (approved concept, Oct 29 2026): stage 3/5, built by jestrix_line/tools/build_jestrix_line.py (wraps c_build_r56_draft.build unchanged).
  6 in-sprite palette sparkles around the crystal; in the idles they twinkle (per-sparkle on / on / flash / on phases).
- icons/: harlequop_icon_32, harlequop_icon_64 (+_2x), palette-only, #191210 ink.
- Proposed: Harlequop, dark/devil, medium. Card sharp with a wink; always lets the little ones win. NOT in DEX_450 / not wired.
