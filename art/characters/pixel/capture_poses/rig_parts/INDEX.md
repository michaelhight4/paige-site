# Capture-pose rig parts (PixelOver bone rig) — draft, awaiting Gary

Per character: `body.png`, `arm_relaxed.png`, `arm_extend_upper.png`, `arm_extend_fore.png` (full canvas, stack bottom→top in that order), `rig.json` (pivots, native px, x,y from top-left), `_check/parts_3x.png`, `_check/check.json`.
Fronts (trainers) extend the arm on the SCREEN-LEFT side of the image (anatomically the trainer's own right). Backs (Cal, Mira) extend the player's right arm (screen-right).
Recompose diffs = 1px ink cut-edge outline on the extend arm (so it reads when rotated) + removed props. Palette: all layers 64-colour palette, alpha 0/255 only.

| char | view | side | shoulder | elbow | wrist | hand_center | recompose diff px |
|---|---|---|---|---|---|---|---|
| cal | back | screen_right | (44, 41) | (45, 50) | (46, 57) | (46, 62) | 19 |
| mira | back | screen_right | (44, 44) | (45, 52) | (46, 59) | (46, 63) | 19 |
| tr_bugcatcher_f | front | screen_left | (21, 59) | (20, 70) | (19, 82) | (19, 86) | 27 |
| tr_camper_f | front | screen_left | (18, 46) | (17, 60) | (16, 74) | (16, 78) | 34 |
| tr_gymtrainer_f | front | screen_left | (17, 41) | (16, 54) | (15, 67) | (15, 71) | 33 |
| tr_gymtrainer_m | front | screen_left | (11, 41) | (11, 54) | (11, 66) | (11, 70) | 20 |
| tr_hiker_f | front | screen_left | (20, 36) | (19, 44) | (15, 53) | (14, 57) | 163 |
| tr_hiker_m | front | screen_left | (11, 44) | (9, 59) | (8, 73) | (8, 78) | 34 |
| tr_lass_f | front | screen_left | (17, 63) | (18, 71) | (16, 79) | (16, 83) | 23 |
| tr_master_fernwick_m | front | screen_left | (10, 48) | (8, 62) | (8, 77) | (9, 81) | 33 |
| tr_master_saltmere_f | front | screen_left | (14, 36) | (12, 53) | (10, 70) | (11, 74) | 0 |
| tr_ranger_m | front | screen_left | (14, 37) | (12, 54) | (10, 70) | (11, 74) | 35 |
| tr_scientist_f | front | screen_left | (18, 34) | (16, 48) | (12, 63) | (12, 67) | 95 |
| tr_scientist_m | front | screen_left | (16, 34) | (14, 53) | (14, 72) | (15, 76) | 45 |
| tr_swimmer_f | front | screen_left | (18, 34) | (18, 52) | (16, 70) | (16, 74) | 16 |
| tr_swimmer_m | front | screen_left | (15, 34) | (12, 52) | (11, 70) | (11, 74) | 10 |
| tr_youngster_m | front | screen_left | (20, 63) | (19, 74) | (18, 85) | (18, 89) | 24 |

Props removed: tr_hiker_f trekking pole; tr_scientist_f handheld scanner (hand closed at y70).
Tools: `_tools/run.py <ids>` rebuilds (configs in `_tools/rcfg.py` + `_tools/rcfg2.py`).
