# Bake Animator's water layers into one 16-frame strip per phase (1280x720 frames stacked vertically):
# water_surface + ripple_foe + pier_player + life, bottom to top (index.json layers_bottom_to_top; sky/celestial are in the still).
# python3 tools/fishing/bake_water_anim.py [/workspace/kilumen_water_battle_art]
import glob, sys
from PIL import Image
A = sys.argv[1] if len(sys.argv) > 1 else '/workspace/kilumen_water_battle_art'
for p in ['dawn', 'day', 'dusk', 'night']:
    pier = Image.open(f'{A}/{p}/layers/water_pier_player_{p}_1x.png').convert('RGBA')
    L = [sorted(glob.glob(f'{A}/{p}/{k}/*_f??_1x.png')) for k in ('water_surface', 'ripple_foe', 'life')]
    assert all(len(x) == 16 for x in L)
    strip = Image.new('RGBA', (1280, 720 * 16))
    for i in range(16):
        f = Image.new('RGBA', (1280, 720))
        for im in (Image.open(L[0][i]), Image.open(L[1][i]), pier, Image.open(L[2][i])): f.alpha_composite(im.convert('RGBA'))
        strip.paste(f, (0, 720 * i))
    strip.save(f'art/world/water_battle/water_anim_{p}_1x.png', optimize=True)
