# i_crystal_polisher (7476-7479, the machine the heal branches place) before/after, in place on heal_brookhollow (cells 3..9 x 0..4),
# 4 times of day, + Animator heal_float_6 end frame and heal_scanner_sweep (60x76, anchor [30,30] on canvas px (63,28)).
# Read-only on tiles/maps; writes qa/heal_machine/compare_polisher.png. BEFORE art = /tmp/bk_heal/polisher/current_128.png.
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(OW, 'tools')); import time_of_day as TOD
FX = '/workspace/kilumen/art/characters/pixel/fx_extra/heal_restore'
TB = TOD.tables(); F = ImageFont.load_default(); CX, CY = 63, 28; AX, AY = 30, 30; T = 64
ts = json.load(open(f'{OW}/tileset.json')); BY = {t['id']: t for t in ts['tiles']}; NM = {t['name']: t for t in ts['tiles']}
_S = {}
def tile(t):
    if t['sheet'] not in _S: _S[t['sheet']] = Image.open(f"{OW}/{t['sheet']}").convert('RGBA')
    i = t['index']; return _S[t['sheet']].crop(((i % 16) * T, (i // 16) * T, (i % 16 + 1) * T, (i // 16 + 1) * T))
m = json.load(open(f'{OW}/maps/heal_brookhollow.json')); L = m['layers']
X0, Y0, X1, Y1 = 3, 0, 9, 4; PX, PY = 5, 1
def polisher_after():
    im = Image.new('RGBA', (128, 128))
    for r in (0, 1):
        for c in (0, 1): im.paste(tile(NM[f'i_crystal_polisher_{r}_{c}']), (c * T, r * T))
    return im
AFTER = polisher_after(); BEFORE = Image.open('/tmp/bk_heal/polisher/current_128.png').convert('RGBA')
def fx(seq, k): return Image.open(f'{FX}/{seq}/1x/{seq}_{k:02d}.png').convert('RGBA')
FL = fx('heal_float_6', 7); SW = fx('heal_scanner_sweep', 2)
def scene(art, over, g):
    im = Image.new('RGBA', ((X1 - X0) * T, (Y1 - Y0) * T), (26, 18, 38, 255))
    for ln in ('ground', 'decoration'):
        for y in range(Y0, Y1):
            for x in range(X0, X1):
                t = BY.get(L[ln][y][x])
                if t and not t['name'].startswith('i_crystal_polisher'): im.alpha_composite(tile(t), ((x - X0) * T, (y - Y0) * T))
    ox, oy = (PX - X0) * T, (PY - Y0) * T; im.alpha_composite(art, (ox, oy))
    for y in range(Y0, Y1):
        for x in range(X0, X1):
            t = BY.get(L['overlay'][y][x])
            if t: im.alpha_composite(tile(t), ((x - X0) * T, (y - Y0) * T))
    mk = np.zeros(im.size[::-1], np.uint8)
    for o in over:
        x0, y0 = ox + CX - AX, oy + CY - AY; im.alpha_composite(o, (x0, max(0, y0)) if y0 >= 0 else (x0, 0), (0, max(0, -y0)))
        sub = np.asarray(o)[max(0, -y0):, :, 3] > 0; h, w = sub.shape; mk[max(0, y0):max(0, y0) + h, x0:x0 + w] |= sub[:mk.shape[0] - max(0, y0), :]
    if g != 'day': im = TOD.apply(im, dict(TB[g], _name=g), Image.fromarray(mk * 255))   # FX pixels use the lit grade
    return im.resize((im.width * 2 // 2, im.height * 2 // 2), Image.NEAREST)
def tag(im, t):
    o = Image.new('RGBA', (im.width, im.height + 16), (20, 16, 30, 255)); o.alpha_composite(im, (0, 16))
    ImageDraw.Draw(o).text((4, 3), t, fill=(244, 226, 255), font=F); return o
G = ['dawn', 'day', 'dusk', 'night']
rows = [[tag(scene(BEFORE, [], g), f'BEFORE {g}') for g in G], [tag(scene(AFTER, [], g), f'AFTER {g}') for g in G],
        [tag(scene(AFTER, [FL], g), f'AFTER + heal_float_6 end {g}') for g in G], [tag(scene(AFTER, [FL, SW], g), f'AFTER + scanner_sweep {g}') for g in G]]
cw, ch = rows[0][0].size; gap = 8
out = Image.new('RGBA', (4 * cw + 5 * gap, 4 * ch + 5 * gap + 20), (20, 16, 30, 255))
ImageDraw.Draw(out).text((8, 6), 'i_crystal_polisher (7476-7479) on heal_brookhollow (5,1): 6 cradles -> ONE cradle, centre canvas px (63,28) = FX anchor [30,30]. 1x. In-game interiors stay on day grade.', fill=(244, 226, 255), font=F)
for r, row in enumerate(rows):
    for c, im in enumerate(row): out.alpha_composite(im, (gap + c * (cw + gap), 28 + r * (ch + gap)))
out = out.resize((out.width * 2, out.height * 2), Image.NEAREST)
out.save(f'{HERE}/compare_polisher.png', optimize=True); print('ok', out.size)
