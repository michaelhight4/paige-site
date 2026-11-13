# Sparkplume - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #398 (cindervale), fire / bird, line: sparkplume. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: sparkplume_front_128 / sparkplume_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/sparkplume_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Frostfire), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 72.3, 'grassL': 76.2, 'd': -3.9, 'sep': 0.338, 'tones': 12, 'ok': True}
Notes: small red firebird, flame-plume tail (body feature, not an attack), violet crystal beside crest feather; loose AI sparkles removed by snap
