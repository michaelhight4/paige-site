# Pyrogrim - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #386 (cindervale), fire / demon, line: brandimp -> brandfiend -> pyrogrim. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: pyrogrim_front_128 / pyrogrim_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/pyrogrim_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Frostfire), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 39.5, 'grassL': 76.2, 'd': -36.7, 'sep': 0.737, 'tones': 16, 'ok': True}
Notes: tall horned demon, flame cloak (body feature, not an attack), charcoal mask face, chest crystal plus violet crystal crown (final stage per brief)
