# Eftling - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #39 (brookhollow), water / swamp, line: eftling -> eftwarden. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: eftling_front_128 / eftling_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/eftling_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Sunken Gold), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 80.8, 'grassL': 76.2, 'd': 4.5, 'sep': 0.352, 'tones': 17, 'ok': True}
Notes: newt with orange spots and frilled tail; crystal sits on the top/back of head (AI put it forward on the brow in front view); OW right mirrored
