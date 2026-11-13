# Chartmouse - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #358 (lanternport), mystic, line: chartmouse. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: chartmouse_front_128 / chartmouse_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/chartmouse_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Inkmap), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 108.9, 'grassL': 76.2, 'd': 32.6, 'sep': 0.683, 'tones': 14, 'ok': True}
Notes: map-patterned parchment mouse, compass-rose marking with crystal on back; AI also put a crystal-star on the tail tip (2nd crystal, weak spot); tiny compass letters snap to noise; OW right mirrored
