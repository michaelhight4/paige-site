# Kilumen pixel art PILOT (Cindrip line, Cal, Ron)

Pilot only, not the full conversion. Painted originals are untouched (masters/ and /workspace/art_library/painted_creatures_v1/ were not modified).

## Spec followed
- Overworld: 64 px native tiles. Humans 64x96 native (x3 = 192x288, x2 = 128x192). Creatures 64x64. Feet at bottom-centre, 2 px pad.
- Battle: 128 native (Forgeharrow 160). Exported nearest-neighbour at x2.
- Binary alpha, 1 px dark outline, no anti-aliasing. 10–29 colours per sprite.
- Palette: World Design's `/workspace/kilumen/art/world/overworld/palette.png` appeared mid-pilot (18:45 CDT) and is now used.
  - That file contains **52 unique colours** (its README says 59).
  - The characters needed dark warm charcoals, brown leathers and a lava orange that the palette lacks. Without them Cindrip's charcoal shell went violet and Cal flattened to 8 colours.
  - So the pilot adds **12 character-extension colours**, for **64 total**. They are listed in `tools/palette_ext.npy` and in `palette_in_use_64.png/.hex`.
  - **World Design should approve these 12 colours or fold them into palette.png.**
- Pipeline: GenerateImage (reference = painted masters), then snap to a true grid in code. The snap does a box downscale, outline darkening, median-cut quantize and stray-pixel cleanup, then remaps to the palette. Every animation frame is built in code from the cleaned base, so frames stay consistent.

## Contents
| Path | What | Frames |
|---|---|---|
| battle/cindrip_front_128(_2x).png, cindrip_back_128, emberlunx_128, forgeharrow_160 | static battle sprites | 1 each |
| battle/cal_trainer_64x128(_2x/_3x).png | Cal at normal (battle/portrait) proportions | 1 |
| anim/cindrip_front_idle*, anim/cindrip_back_idle* | idle loop: frames, sheet, _2x.gif | 4 each |
| anim/cindrip_front_attack*, anim/cindrip_back_attack* | fire attack: windup, charge+embers, mouth flare, 2 travel, impact flash, ring, settle. The back version travels away and shrinks. | 8 each |
| overworld/cal_chibi/… , cal_chibi_sheet(_2x/_3x).png | chibi Cal: rows down/left/right/up; cols stand, walk0-3 | 4 dirs x (1 stand + 4 walk) = 20 |
| overworld/cal_chibi_walk_{dir}_{2x,3x}.gif, cal_chibi_walk_all_3x.gif | GIF per direction plus a combined GIF | 4 each |
| overworld/cindrip_ow/…, cindrip_ow_sheet(_2x/_3x).png, cindrip_ow_walk_*.gif | Cindrip follower, 64x64 | 4 dirs x (1 stand + 4 walk) = 20 |
| overworld/ron_chibi_down_stand(_2x/_3x).png | Ron chibi, front stand only | 1 |
| portraits/{cal_neutral,cal_happy,cal_surprised,ron_neutral,ron_happy,ron_angry}.png | painted busts, transparent, 512 px tall | 6 |
| battle_preview_2x.gif / .png | mock battle at x2: idle x3 → attack → idle | 24 |
| pilot_preview.png | battle mock, Cindrip line, painted vs pixel, Cal normal vs chibi, grass patch with Cal + follower, walk strips | |
| dialogue_preview.png | 2560x1440: World Design Brookhollow (real pixel map preview at x3), Cal + Ron chibis, painted Ron portrait, empty dialogue box | |
| raw/ | the GenerateImage sources | |
| base/ | snapped, cleaned bases | |
| tools/ | step1_bases, step2_palette, step3_battle_anim, step4_overworld, step5_portraits, step6_previews, pxlib | |

Rebuild: `cd pixel_pilot && for s in 1_bases 2_palette 3_battle_anim 4_overworld 5_portraits 6_previews; do python3 tools/step$s.py; done`

## Caveats (honest)
- The sprites are snapped from generated art, not hand-pixelled. They read well at x2/x3, but a pixel artist pass is still needed: clusters, selective outlines and some noisy texture in Cindrip's shell.
- Walk cycles are code-built (leg lift / stride and a 1 px bob). **Arms do not swing.** The left and right views are separately drawn, because Cal's satchel is asymmetric; they are not mirrored. Cindrip's side walk alternates front and back leg pairs.
- Chibi Cal is about 2.5 heads (the upper end of 2–2.5). The coat badge marks are simplified to a few pixels.
- The painted Cindrip master is front-on, but the pixel battle sprite is a ¾ pose with a raised paw, because it was generated anew as a battle pose. Colours and features match.
- Attack effects are generic shapes drawn in code: a reusable "fire" template, not bespoke.
- Ron's portrait keeps the soft vignette fade from its generation, so the bottom edge is semi-transparent. Cal's bottom is a clean arc.
- The battle background is a simple placeholder. The HP bars are blank rectangles with no text.
