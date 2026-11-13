# Seaglint - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #361 (lanternport), light / sea, line: seaglint. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: seaglint_front_128 / seaglint_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/seaglint_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Rosequartz), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 109.1, 'grassL': 76.2, 'd': 32.9, 'sep': 0.694, 'tones': 11, 'ok': True}
Notes: little sea-glass pebble creature, crystal glowing in centre; OW sides from AI were near-front views; OW right mirrored
