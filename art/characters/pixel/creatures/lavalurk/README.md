# Lavalurk - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #206 (greystone), fire / magma, line: lavalurk. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: lavalurk_front_128 / lavalurk_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/lavalurk_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Frostfire), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 36.6, 'grassL': 76.2, 'd': -39.6, 'sep': 0.757, 'tones': 17, 'ok': True}
Notes: back view puts the crystal on the upper back (raw drew it there); OW right mirrored from left
