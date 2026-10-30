# Rimewyrm - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #246 (water/dragos, large). Brief: Long serpentine dragon with frosted mane. Palette: ice blue, white, silver, violet. Crystal: crystal on the brow, final has crystal icicle spines.
Built by creatures/_overnight/tools/c_build.py (Character-models overnight pipeline, re-run for regions 5-6 DRAFT on Oct 29 2026 via kilumen_r56_creatures/tools/c_build_r56_draft.py) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: rimewyrm_front_128, rimewyrm_back_128 (+_2x). Back = player side, seen from behind.
- anim/: rimewyrm_front_idle, rimewyrm_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: hover.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/rimewyrm_tod_spritegrade.png). No warmth masks yet.
