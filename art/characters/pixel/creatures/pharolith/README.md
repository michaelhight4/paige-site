# Pharolith - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #343 (lanternport), fire / spirit, line: wicklet -> lanternkeep -> pharolith. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: pharolith_front_128 / pharolith_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/pharolith_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Frostfire), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 74.3, 'grassL': 76.2, 'd': -2.0, 'sep': 0.437, 'tones': 13, 'ok': True}
Notes: lighthouse golem: cream stone tower body, brass bands, brass lamp-room head with crystal lamp core; front is near-frontal rather than 3/4; no light beams baked; OW right mirrored
