# Shaftwraith - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #202 (greystone), dark / ghost, line: minewisp -> shaftwraith. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: shaftwraith_front_128 / shaftwraith_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/shaftwraith_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Lantern Amber), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 45.0, 'grassL': 76.2, 'd': -31.2, 'sep': 0.691, 'tones': 16, 'ok': True}
Notes: OW right mirrored from left; back view hides the headlamp crystal (it is on the front of the helmet); dusty-blue saturation boost (x1.9, hue 195-250) before snap, else the body remaps to grey
