# Paleminnow - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #198 (greystone), water / freshwater, line: paleminnow. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: paleminnow_front_128 / paleminnow_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/paleminnow_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Glacier), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 117.6, 'grassL': 76.2, 'd': 41.4, 'sep': 0.811, 'tones': 12, 'ok': True}
Notes: fish: hover bob for swim; very pale on white raw - check fin cutout; pink saturation boost before snap, else the pale pink remaps to cream
