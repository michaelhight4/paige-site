# Capture poses — DRAFT, awaiting Gary (do NOT wire in)

Status: **draft, awaiting Gary.** Made 2026-10-22 (America/Chicago). Nothing here is wired into the game.
Brief: Gary changed capture on 2026-10-22 ("just have the trainer hold the crystal up and it absorbs the kilumen"). There is no throw.
These frames give Animator the hands-together point that anchors the crystal FX (`fx_extra/capture`).

## Files
| path | what |
|---|---|
| `player/cal_back_capture.png`, `player/mira_back_capture.png` | 4-frame horizontal strip, 64x96 per frame: raise, hold, hold_strain, lowered |
| `player/<name>_back_capture_<frame>.png` | the same frames as single PNGs |
| `trainers/<tr_id>_capture.png` | 2-frame strip, 64x128 per frame: raise, hold (all 15 tr_* trainers) |
| `trainers/frames/<tr_id>_capture_<frame>.png` | the same frames as single PNGs |
| `hold_points.json` | `{sprite_id: {frames, frame_w, frame_h, hold_px:[[x,y],...]}}` |
| `_preview/capture_poses_3x.png` | everything at 3x nearest-neighbour. The source sprite is shown first. A crystal dot marks hold_px **in the preview only** |
| `_preview/capture_poses_tod_4phase.png` | dawn/day/dusk/night sprite-grade check (the grade/cell/sheet functions from `/workspace/tod/check_sprite.py`) |
| `_tools/` | `final.py` rebuilds everything; `configs.py` has the per-sprite joints and erase/refill areas |

## hold_px
- `hold_px` is the native-pixel centre between the two hands, i.e. where the crystal sits. Read it per frame, in the frame's own top-left coordinates (not the strip's).
- The canvas and feet anchor are unchanged from the source sprite. For every frame, the bottom 20 rows match the source pixel for pixel. The one exception is tr_hiker_f, whose trekking pole was removed.
- To place the FX (64x64, anchor [32,32]), put the FX anchor on `hold_px`.

| sprite | frames → hold_px |
|---|---|
| cal_back_capture (64x96) | raise [31,22]\*, hold [31,6], hold_strain [31,6], lowered [31,55]\* |
| mira_back_capture (64x96) | raise [31,22]\*, hold [31,6], hold_strain [31,6], lowered [31,57]\* |
| tr_bugcatcher_f / tr_lass_f / tr_youngster_m (kids) | raise [31,60] / [31,63] / [31,63]; hold [31,25] |
| tr_camper_f | raise [31,47], hold [31,12] |
| tr_gymtrainer_f | raise [31,42], hold [31,4] |
| tr_hiker_m | raise [31,41], hold [31,6] |
| tr_master_fernwick_m | raise [31,45], hold [31,4] |
| all other adult trainers (gymtrainer_m, hiker_f, saltmere_f, ranger_m, scientist_f/m, swimmer_f/m) | raise [31,37], hold [31,4] |

\* In the back view, the hands in these frames are **hidden** (behind the head for raise, in front of the chest for lowered). The point is where the crystal would be. Animator should either hide or occlude the crystal there, or draw the FX on top.

Animator's provisional trainer hold point [32,4] was close for adults. The measured value is x=31, because hands are drawn at 28 and 35 and the centre rounds down. y is 4 for adults, 6 for hiker_m (beanie), 12 for camper_f (bucket hat) and 25 for the kids (head top at y=22).

## Rules applied
- **Palette-only:** every pixel is from `art/world/overworld/palette.hex`. A script checks this, and the result is 0 off-palette and 0 semi-alpha (alpha is 0 or 255 only).
- **Outline:** each sprite keeps its own sel-out outline colour, taken from its existing silhouette edge, and the new arms reuse it. The preview crystal dot uses FX INK 1a1226 around a night-bright d6acff core, because it is a 5px particle.
- **Time of day:** checked in 4 phases with the sprite grade. There are 0 unmapped colours.
- **Locked model:** every frame is hand-edited from the existing sprite with Python/PIL. Hair, outfit and colours stay the same, and no AI generation was used. The arm/sleeve/skin colour ramps come from each sprite's own colours.
- **No smoking, drinking or drugs:** none are present. The props removed were a trekking pole (hiker_f) and a scanner (scientist_f).
- **DRAFT:** nothing is wired in. The manifest entry is `parts.capture_poses` with status "draft, awaiting Gary".

## Known compromises (for Gary)
1. **No player back battle sprite existed.** Cal and Mira are built on the overworld chibi `*_chibi_up_stand.png` (64x96). A proper battle back sprite would be a new model, which needs Gary.
2. The chibi players and the kid trainers have heads too big for their arms to reach over. Their arms are stretched about 1.5-1.8x in hold.
3. Adult head tops are at y=2, so in hold the hands sit over the crown or hat at y≈4. The crystal will overlap the top edge of the 128px canvas.
4. Removed props: hiker_f's trekking pole and scientist_f's handheld scanner. Hands on hips were refilled from the body (saltmere_f, scientist_f, ranger_m, swimmer_m).
5. Cal's dark gloves over his dark hair are low-contrast at night. The crystal FX will carry the read there.
