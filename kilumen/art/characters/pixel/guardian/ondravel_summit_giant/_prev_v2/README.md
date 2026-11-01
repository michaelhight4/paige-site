# Ondravel – summit giant v2 (DRAFT, art only, not wired into the game)

Build: `python3 _tools/build.py`. v1 is in `_prev/`.

## Sheets (both: 4 frames, 448x704 each, horizontal strip, 450 ms per frame, looping)
| file | layer | disk (PNG-8 / lossless WebP) | memory |
|---|---|---|---|
| ondravel_summit_giant_idle | in front of the sky, behind the overlay | 50,772 B / 43,566 B | 4.81 MB RGBA (8.0 MB if padded to 2048x1024 pow2) |
| ondravel_summit_cloud_overlay | in front of the giant, behind the ledge, cliff, player and UI | 18,438 B / 14,286 B | 4.81 MB (8.0 MB pow2) |
Both sheets share the anchor (x=224, y=703, bottom centre) and the frame index.
Alpha is 0 or 255 only. Colours are from kilumen.hex plus the RAMP_SPREAD outputs; the pre-spread colours are asserted absent.
The warm rim light (fcd668, eea23c, e29d40) is drawn as pixels in the sheet. Sunset only; there is no time-of-day grading.

Layer order: sunset sky, then the giant sheet, then the cloud overlay, then the ledge, cave cliff, player and UI.

## Tiles for Coder (16 px tiles at 4x = 64 px cells in the preview scene, col,row)
- Cave-exit standing tile: **(5,14)**
- Tile where the forced walk stops: **(5,10)**
- Tile where the speech starts: **(5,10)**. Ondravel speaks as soon as the walk stops, then the battle starts.
These cells belong to the preview scene. Map them onto fin_summit_camp.json before you use them.

## Scores (readability vs the sunset sky, |dLuma| >= 28)
giant 0.826 · overlay 0.852 · combined 0.806 · body silhouette 0.828

## Previews
preview.png (640x1024, true scale) · preview_2x.png (viewing zoom only) · storyboard.png (3 panels) · ondravel_summit_combined_preview.gif

## Open concerns
- The face reads as a flat pale muzzle "mask". It is not yet close enough to the battle art's lion-like skull, shaggy brow and muzzle.
- The mane locks look like faceted shards rather than shaggy fur.
- Too few cumulus show in the preview. The ledge covers most of the front overlay, so he does not yet look wrapped in clouds on every side.
- The ledge is very large compared with the giant. The cave mouth is a plain black arch.
- The speech line "...You are the one." is a placeholder.
