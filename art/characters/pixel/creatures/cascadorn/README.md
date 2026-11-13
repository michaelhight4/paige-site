# Cascadorn - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #413 (postgame), water / freshwater, line: fryling -> runsalmon -> cascadorn. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: cascadorn_front_128 / cascadorn_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/cascadorn_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Sunken Gold), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 85.1, 'grassL': 76.2, 'd': 8.8, 'sep': 0.388, 'tones': 13, 'ok': True}
Notes: great salmon, crystal on head + crystal fin rays (violet fins are the crystal rays, intended); hover-swims on OW
