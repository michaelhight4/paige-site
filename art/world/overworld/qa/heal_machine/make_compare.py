# i_heal_machine before/after (Oct 22 2026, IP rule: ONE cradle, no 6-slot tray). Read-only on tiles/maps; writes qa/heal_machine/*.png.
# BEFORE = /tmp/bk_heal/current_128.png (built art before the repaint). AFTER = interiors_new/tiles_1x (this run).
# FX = Animator heal_float_6 last frame + heal_scanner_sweep mid frame (60x76, anchor [30,30]) pasted with anchor on px (63,28).
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(OW, 'tools')); import time_of_day as TOD
FX = '/workspace/kilumen/art/characters/pixel/fx_extra/heal_restore'
TB = TOD.tables(); F = ImageFont.load_default(); CX, CY = 63, 28; AX, AY = 30, 30
IT = json.load(open(f'{OW}/interiors_new/tileset_interiors.json')); E = {e['name']: e for e in IT['tiles']}
def tile(sheet, i): return Image.open(f'{OW}/interiors_new/{sheet}').convert('RGBA').crop(((i % 16) * 64, (i // 16) * 64, (i % 16) * 64 + 64, (i // 16) * 64 + 64))
after = Image.new('RGBA', (128, 128))
for r in (0, 1):
    for c in (0, 1):
        e = E[f'i_heal_machine_{r}_{c}']; after.paste(tile(e['sheet'], e['index']), (c * 64, r * 64))
before = Image.open('/tmp/bk_heal/current_128.png').convert('RGBA')
ts = json.load(open(f'{OW}/tileset.json')); BY = {t['id']: t for t in ts['tiles']}
m = json.load(open(f'{OW}/maps/heal_brookhollow.json')); ft = BY[m['layers']['ground'][3][6]]
floor = Image.open(f'{OW}/{ft["sheet"]}').convert('RGBA').crop(((ft['index'] % 16) * 64, (ft['index'] // 16) * 64, (ft['index'] % 16) * 64 + 64, (ft['index'] // 16) * 64 + 64))
def fx(seq, k):
    return Image.open(f'{FX}/{seq}/1x/{seq}_{k:02d}.png').convert('RGBA')
FL = fx('heal_float_6', 7); SW = fx('heal_scanner_sweep', 2)
def scene(art, over, g):
    im = Image.new('RGBA', (160, 160))
    for y in range(0, 160, 64):
        for x in range(0, 160, 64): im.alpha_composite(floor.crop((0, 0, min(64, 160 - x), min(64, 160 - y))), (x, y))
    im.alpha_composite(art, (16, 24))
    for o in over: im.alpha_composite(o, (16 + CX - AX, 24 + CY - AY))
    if g != 'day':
        mk = np.zeros((160, 160), np.uint8)
        for o in over:
            a = np.zeros((160, 160), np.uint8); x0, y0 = 16 + CX - AX, 24 + CY - AY
            sub = (np.asarray(o)[..., 3] > 0).astype(np.uint8); hh, ww = sub.shape
            ys, xs = max(0, -y0), max(0, -x0); a[y0 + ys:y0 + hh, x0 + xs:x0 + ww] = sub[ys:, xs:]; mk |= a
        im = TOD.apply(im, dict(TB[g], _name=g), Image.fromarray(mk * 255))   # FX pixels use the lit grade (crystal glow)
    return im.resize((320, 320), Image.NEAREST)
def tag(im, t):
    o = Image.new('RGBA', (im.width, im.height + 16), (20, 16, 30, 255)); o.alpha_composite(im, (0, 16))
    ImageDraw.Draw(o).text((4, 3), t, fill=(244, 226, 255), font=F); return o
G = ['dawn', 'day', 'dusk', 'night']
rows = [[tag(scene(before, [], g), f'BEFORE {g}') for g in G], [tag(scene(after, [], g), f'AFTER {g}') for g in G],
        [tag(scene(after, [FL], g), f'AFTER + heal_float_6 end {g}') for g in G], [tag(scene(after, [FL, SW], g), f'AFTER + scanner_sweep {g}') for g in G]]
W = 4 * 320 + 5 * 8; H = 4 * 336 + 5 * 8 + 20
out = Image.new('RGBA', (W, H), (20, 16, 30, 255))
ImageDraw.Draw(out).text((8, 6), 'i_heal_machine (7280-7283): 6-slot tray -> ONE cradle, centre px (63,28) = FX anchor [30,30]. 2x zoom. In-game interiors stay on day grade.', fill=(244, 226, 255), font=F)
for r, row in enumerate(rows):
    for c, im in enumerate(row): out.alpha_composite(im, (8 + c * 328, 28 + r * 344))
out.save(f'{HERE}/compare.png', optimize=True)
# 1:1 crosshair proof of the centre
p = after.copy(); a = np.array(p); a[CY, :, :] = np.where(a[CY, :, 3:] > 0, [255, 0, 255, 255], a[CY]); a[:, CX, :] = np.where(a[:, CX, 3:] > 0, [255, 0, 255, 255], a[:, CX])
Image.fromarray(a).resize((512, 512), Image.NEAREST).save(f'{HERE}/centre_check_4x.png')
print('ok', out.size)
