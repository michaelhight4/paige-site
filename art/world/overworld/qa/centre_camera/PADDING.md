# Centre camera: map padding World Design needs (Oct 23, 2026, coder)

> SUPERSEDED (Gary, 10:09 AM CT, Oct 23, 2026): no padding or fill tiles. The camera stays centred and anything past the map edge is left blank (black). This table is kept for reference only.

Gary (9:14 AM CT, Oct 23, 2026): the player is always at the exact centre of the screen, so maps get filler borders
(trees, water, rock) instead of the camera stopping at the map edge. Camera rule: `camera.alwaysCentre: true` in
src/platform/pc.json and src/platform/mobile.json.

Method: the canvas is sized in DEVICE px (CSS px x devicePixelRatio), zoom comes from the profile's zoom table
(by device-px height), view in native px = device px / zoom. Half-view in tiles = (view / 2) / 64.
Tiles needed from the centre to each edge = ceil(half-view) + 1 (the +1 covers the half tile the player sits on and
the tile that scrolls in mid-step).

| Platform | Screen (CSS px) | DPR | Device px | Zoom | View (native px) | Half-view tiles x / y | Pad L/R | Pad T/B |
|---|---|---|---|---|---|---|---|---|
| PC | 1920x1080 | 1 | 1920x1080 | 2 | 960 x 540 | 7.50 / 4.22 | **9** | **6** |
| PC | 2560x1440 | 1 | 2560x1440 | 3 (zoom1440p) | 853.3 x 480 | 6.67 / 3.75 | 8 | 5 |
| Phone | 844x390 | 1 or 2 | 844x390 / 1688x780 | 1 / 2 | 844 x 390 | 6.59 / 3.05 | 8 | 5 |
| Phone | 844x390 | 3 (iPhone 12-14) | 2532x1170 | 2 | 1266 x 585 | 9.89 / 4.57 | 11 | 6 |
| Phone | 932x430 | 1 or 2 | 932x430 / 1864x860 | 1 / 2 | 932 x 430 | 7.28 / 3.36 | 9 | 5 |
| Phone | 932x430 | 3 (iPhone Pro Max) | 2796x1290 | 2 | 1398 x 645 | 10.92 / 5.04 | **12** | **7** |
| Phone | 780x360 | 1 or 2 | 780x360 / 1560x720 | 1 / 2 | 780 x 360 | 6.09 / 2.81 | 8 | 4 |
| Phone | 780x360 | 3 (Android 2340x1080) | 2340x1080 | 2 | 1170 x 540 | 9.14 / 4.22 | 11 | 6 |

## Per platform (widest view)

| Platform | Widest view | Left / Right | Top / Bottom |
|---|---|---|---|
| PC | 1920x1080 at zoom 2 | 9 | 6 |
| Mobile | 932x430 @3x at zoom 2 | 12 | 7 |

## Recommended border

- **Left/right: 12 tiles. Top/bottom: 7 tiles.** (covers every row above, both platforms)
- If one uniform pad is wanted on all four sides: **12 tiles** (the biggest value). Each padded map shifts by (+12, +12).
- Phones at 3x run zoom 2 (the mobile zoom table's 3x row starts at 1440 device px), so they see the most world.
  If Gary ever raises mobile zoom for 3x phones, the phone need drops to 9 / 5 and PC (9 / 6) becomes the limit.
- Until padded maps land the renderer fills anything off-map with the nearest edge ground tile (outdoor + caves) or the
  flat room void colour #191210 (interiors), so nothing is ever black.
- Interiors are not padded: off-map space there is the i_void colour.
