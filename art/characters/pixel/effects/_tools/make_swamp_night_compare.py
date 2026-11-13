"""Before/after night previews for the swamp night-rim fix (2026-10-30). Writes to _transparent_staging/_juicefx_compare/."""
import json, numpy as np, re
from PIL import Image, ImageDraw
src = open(__file__.replace('make_swamp_night_compare.py', 'validate_transparent.py')).read()
ns = {}; exec('import json, numpy as np\nfrom PIL import Image\n' + src[src.index('NIGHT_MIN, DLUMA'):src.index('ROOT = B.ROOT') if 'ROOT = B.ROOT' in src else None].split('\nROOT')[0], ns)
NBG, NR = ns['NBG'], ns['night_readability']
S = '/workspace/kilumen/art/characters/pixel/effects/_transparent_staging'; OUT = S + '/_juicefx_compare'
def load(d, anim):
    m = json.load(open(f'{d}/swamp_{anim}_battle_2x.json')); sh = np.array(Image.open(f'{d}/{m["sheet"]}').convert('RGBA'))
    return m, [sh[:, f['x']:f['x'] + f['w']] for f in m['frames']]
rows = []
for anim in ('impact', 'travel_p2f', 'travel_f2p'):
    vers = [(lab, *load(f'{d}/swamp/{anim}' if lab == 'after' else f'{d}/{anim}', anim)) for lab, d in (('before', S + '/_swamp_prev_nightrim_20261030'), ('after', S))]
    gifs = []; stills = []
    for lab, m, fr in vers:
        sc = NR(fr, m, anim)
        ox, oy = (470 - m['anchor']['x'], 210 - m['anchor']['y']) if anim == 'impact' else m['anchor']['canvas_offset_on_pilot_screen_2x']
        frames = []
        for f in fr:
            im = Image.fromarray(NBG.copy()).convert('RGBA'); im.alpha_composite(Image.fromarray(f), (max(0, ox), max(0, oy)) if ox >= 0 and oy >= 0 else (0, 0)) if ox >= 0 and oy >= 0 else im.paste(Image.fromarray(f), (ox, oy), Image.fromarray(f))
            d = ImageDraw.Draw(im); d.rectangle((0, 0, 260, 14), fill=(0, 0, 0)); d.text((3, 2), f'swamp {anim} {lab}: night {sc}', fill=(255, 255, 255))
            frames.append(im.convert('RGB'))
        gifs.append(frames); stills.append(frames[len(frames) // 2]); print(anim, lab, sc)
    side = [Image.new('RGB', (1280, 480)) for _ in gifs[0]]
    for k, im in enumerate(side):
        im.paste(gifs[0][min(k, len(gifs[0]) - 1)], (0, 0)); im.paste(gifs[1][min(k, len(gifs[1]) - 1)], (640, 0))
    side[0].save(f'{OUT}/swamp_{anim}_night_before_vs_after.gif', save_all=True, append_images=side[1:], duration=[f['ms'] for f in vers[1][1]['frames']], loop=0)
    rows.append(stills)
cs = Image.new('RGB', (1280, 480 * 3))
for r, (a, b) in enumerate(rows): cs.paste(a, (0, 480 * r)); cs.paste(b, (640, 480 * r))
cs.save(f'{OUT}/swamp_night_before_vs_after_contact.png')
