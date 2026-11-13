# Kilnpaw - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #48 (fernwick), fire, line: hearthkit -> kilnpaw. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: kilnpaw_front_128 / kilnpaw_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/kilnpaw_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Frostfire), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 74.9, 'grassL': 76.2, 'd': -1.3, 'sep': 0.483, 'tones': 15, 'ok': True}
Notes: brick-pattern cat, ember-tipped ears (body feature, not an attack effect), crystal on collar tuft; OW right mirrored
