# Glyphforge - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #397 (cindervale), mystic / magma, line: glyphforge. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: glyphforge_front_128 / glyphforge_back_128 (+2x)
- anim/: 4-frame idles front/back ([180, 160, 200, 160] ms), violet crystal glow 0/1/2/1
- overworld/glyphforge_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft (Coldforge), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {'bodyL': 38.3, 'grassL': 76.2, 'd': -37.9, 'sep': 0.774, 'tones': 16, 'ok': True}
Notes: walking anvil-shrine golem, glowing glyphs are non-letter runes (body feature), brow crystal on front; battle back is a faceless anvil view
