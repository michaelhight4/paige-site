# Stonepede - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #208 (greystone), earth / bug, line: stonepede -> columnpede. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: stonepede_front_128 / stonepede_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/stonepede_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Moondust), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 96.1, 'grassL': 76.2, 'd': 19.9, 'sep': 0.753, 'tones': 16, 'ok': True}
Notes: OW right view mirrored from left
