# Foundrax - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #380 (cindervale), fire / magma, line: anvilet -> bellowsback -> foundrax. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: foundrax_front_128 / foundrax_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/foundrax_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Frostfire), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 50.3, 'grassL': 76.2, 'd': -26.0, 'sep': 0.527, 'tones': 16, 'ok': True}
Notes: armoured forge rhino, molten seams, shoulder vent pipes (glow only, AI smoke wisps masked out of raw), violet anvil crest plus brow crystal; OW right mirrored; warm-grey desat boost so plate stays charcoal not brown
