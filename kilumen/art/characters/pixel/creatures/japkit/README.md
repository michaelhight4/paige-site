# Japkit - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #TBD (dark/devil, small). Brief: Jestrix stage 2: young juggler hare, bolder curling two-point harlequin hat with big gold bells, larger hanging violet crystal, purple waist sash, gold juggling balls.
Built by creatures/_overnight/tools/c_build.py (Character-models overnight pipeline, re-run for regions 5-6 DRAFT on Oct 29 2026 via kilumen_r56_creatures/tools/c_build_r56_draft.py) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: japkit_front_128, japkit_back_128 (+_2x). Back = player side; per the Jestrix-line brief the back is the front mirrored.
- anim/: japkit_front_idle, japkit_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: biped, right = mirror of left.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: jestrix_line/_qa/tod/japkit_tod_spritegrade.png). No warmth masks yet.
- Jestrix line v2 (approved concept, Oct 29 2026): stage 2/5, built by jestrix_line/tools/build_jestrix_line.py (wraps c_build_r56_draft.build unchanged).
  4 in-sprite palette sparkles around the crystal; in the idles they twinkle (per-sparkle on / on / flash / on phases).
- icons/: japkit_icon_32, japkit_icon_64 (+_2x), palette-only, #191210 ink.
- Proposed: Japkit, dark/devil, small. Show-off kit; juggles anything, drops nothing it loves. NOT in DEX_450 / not wired.
