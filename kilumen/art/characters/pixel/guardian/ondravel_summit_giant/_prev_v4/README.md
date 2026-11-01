# Ondravel summit giant — v4 DRAFT (not in game)
v4 per Gary: simpler flat design like v1 / the walk art (ondravel_ow_walk_recolor). Fur strands and mane detail removed;
flat 3-tone ice locks on a deep-blue mane core, a separate outlined head, a dark chest bib, warm solid-pixel sunset rim.
Kept from v3: 448x704 frames, sunset sky and cloud sea, the narrow ledge and the cave, tiles cave_exit (5,17), walk_stop (5,13), speech_start (5,13).
Scores: giant 0.793, overlay 0.715, combined 0.767, silhouette 0.784 (v3 values were lower in the flat attempt: 0.692).
Memory: 4.81 MB RGBA per sheet (8 MB padded to 2048x1024). Colours 22/8, palette plus approved RAMP_SPREAD only, alpha 0/255, edges clear.
Weak: the mane locks read a bit leaf-like and spiky; the head is very pale next to the mane; the lower ruff and body hem are jagged; the antlers keep v3's texture.
v3 backup: _prev_v3/.

---- v3 notes ----
# Ondravel – summit giant v3 (DRAFT, art only, not wired into the game)

Build: `python3 _tools/build.py`. v1 is in `_prev/`, v2 in `_prev_v2/`.
v3 changes: fur-strand pass on the mane, face and body (from the battle art), clouds on every side of him, a narrow ledge, and a textured cave mouth.

## Sheets (both: 4 frames, 448x704 each, horizontal strip, 450 ms per frame, looping)
| file | layer | disk (PNG-8 / lossless WebP) | memory |
|---|---|---|---|
| ondravel_summit_giant_idle | in front of the sky, behind the overlay. Contains Ondravel and the cumulus behind and beside him | 83,304 B / 69,584 B | 4.81 MB RGBA (8.0 MB if padded to 2048x1024 pow2) |
| ondravel_summit_cloud_overlay | in front of the giant, behind the scene's near clouds, ledge, player and UI | 18,067 B / 14,316 B | 4.81 MB (8.0 MB pow2) |

- Both sheets share the anchor (x=224, y=703, bottom centre) and the frame index.
- The mane, head, face and antlers sit on one layer, shifted 0/2/4/2 px for breath. The fur is drawn once, so it never shimmers between frames.
- Rule checks run on every frame, every scene layer and preview.png:
  - Alpha is 0 or 255 only.
  - Colours come from kilumen.hex plus the RAMP_SPREAD outputs only.
  - The pre-spread colours are absent.
  - All frame edges are clear, so nothing is cut off straight.
  - PNG-8 and WebP files read back identical to the source.
- Sunset only. The rim light is solid gold pixels in the sheet.

Layer order in the scene: sunset sky with the far cloud sea and side towers, then the giant sheet, then the cloud overlay, then the near cloud sea (scene dressing), then the ledge and cave outcrop, then the player, then UI.

## Tiles for Coder (16 px tiles at 4x = 64 px cells in a 640x1152 preview scene, col,row)
- Cave-exit standing tile: **(5,17)**. The player is in the cave mouth.
- Tile where the forced walk stops: **(5,13)**. This is the far edge of the ledge, about 4 tiles of walking.
- Tile where the speech starts: **(5,13)**. Ondravel speaks as soon as the walk stops, then the battle starts.
- Ondravel's anchor is at scene pixel (320,744), so the frame's top-left corner is at (96,40).
These positions belong to the preview scene. Map them onto fin_summit_camp.json before you use them.

## Scores (readability vs the sunset sky, |dLuma| >= 28)
giant 0.777 · overlay 0.715 · combined 0.749 · body silhouette 0.782 (v2: 0.826 / 0.852 / 0.806 / 0.828). The drop comes from the darker, bluer fur and the warmer overlay clouds. All scores are still well above 0.5.

## Previews
preview.png (640x1152, true scale) · preview_2x.png (zoom for viewing only) · storyboard.png (3 panels) · ondravel_summit_combined_preview.gif · ondravel_summit_giant_idle_preview.gif · ondravel_summit_cloud_overlay_preview.gif

## Still weak
- The mane outline is a fairly round mass. The battle art's mane is longer and more streaming.
- The antlers are slimmer and less branched than the battle art's.
- The lower body is a tall block of fur with little anatomy before it sinks into the clouds.
- The side cumulus in the sky are similar in size, so they read a bit like a pattern.
- The near cloud sea is drawn in the scene, not in a sheet. Coder needs it as its own layer, or it has to be baked into the backdrop.
- The speech line "...You are the one." is a placeholder.
