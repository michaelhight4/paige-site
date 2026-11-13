# Geysirox - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #364 (cindervale_road), water / magma, line: simmerkin -> geysirox. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: geysirox_front_128 / geysirox_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/geysirox_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Sunken Gold), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 111.5, 'grassL': 76.2, 'd': 35.3, 'sep': 0.678, 'tones': 12, 'ok': True}
Notes: shaggy white hot-spring beast, red face, blue mineral patches, closed stone spout on back (no spray baked in), forehead crystal; battle sprites are quadruped but AI OW sheet stands upright (stance mismatch, weak spot)
