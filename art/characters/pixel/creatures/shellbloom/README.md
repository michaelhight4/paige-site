# Shellbloom - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #44 (fernwick), grass, line: shellbloom. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: shellbloom_front_128 / shellbloom_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/shellbloom_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Bluebell Shell), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 86.9, 'grassL': 76.2, 'd': 10.7, 'sep': 0.347, 'tones': 16, 'ok': True}
Notes: snail with flower-bud shell, crystal is the flower centre; glides (hover walk = slide bob)
