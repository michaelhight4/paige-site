# Echoshell - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #431 (postgame), mystic / sea, line: echoshell. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: echoshell_front_128 / echoshell_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/echoshell_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Abyss Pearl), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 107.4, 'grassL': 76.2, 'd': 31.2, 'sep': 0.706, 'tones': 13, 'ok': True}
Notes: spiral shell creature, crystal inside spiral opening; slides (hover); battle back hides the crystal; OW right mirrored
