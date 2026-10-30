#!/usr/bin/env python3
"""Neutral, logo-free heal-room wall panel (i_heal_info_panel_0_0/_0_1, i_brand cells col 11-12 row 1, ids 7491-7492).
Built from the i_rt_logo_panel frame with the crystal mark and 'RT' letters removed: plain board with a teal heart
and three blank info lines (no text, no logo). Written into i_brand and i_brand_v3 at 1x/2x/3x (+webp) and registered
in tileset{,_2x,_3x}.json. Idempotent."""
import json, os
from PIL import Image, ImageDraw
OW = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
src = Image.open(f'{OW}/interiors_new/tiles_1x/i_brand_v3.png').convert('RGBA').crop((448, 0, 576, 64))
p = src.copy()
from collections import Counter
mode = lambda ys: Counter(src.getpixel((x, y)) for y in ys for x in range(12, 116)).most_common(1)[0][0][:3]
TOP, BOT = mode(range(12, 16)), mode(range(52, 56))
for y in range(12, 56):   # rebuild the board face: per-row dominant colours, 2 px checker dither, no glyphs
    t = (y - 12) / 43
    c0 = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOT)) + (255,); c1 = tuple(int(v * 0.8) for v in c0[:3]) + (255,)
    for x in range(12, 116):
        p.putpixel((x, y), c1 if ((x // 2 + y // 2) % 2 == 0 and (y // 2) % 2 == 0) else c0)
d = ImageDraw.Draw(p); R = lambda x, y, w, h, c: d.rectangle((x, y, x + w - 1, y + h - 1), fill=c)
for (x, y, w) in ((24, 22, 4), (32, 22, 4), (22, 24, 16), (22, 28, 16), (24, 32, 12), (26, 36, 8), (28, 40, 4)):   # heart
    R(x, y, w, 4 if y > 22 else 2, '#4fc0b0')
R(24, 24, 4, 4, '#a8f0e4'); R(30, 44, 2, 2, '#2e7a70')
for y, w in ((24, 64), (34, 56), (44, 40)): R(50, y, w, 4, '#9a7ad8'); R(50, y + 4, w, 2, '#4a3080')   # blank info lines
for sheet in ('i_brand_v3', 'i_brand'):
    for s, k in ((1, '1x'), (2, '2x'), (3, '3x')):
        f = f'{OW}/interiors_new/tiles_{k}/{sheet}.png'; im = Image.open(f).convert('RGBA')
        t = p.resize((128 * s, 64 * s), Image.NEAREST); box = (11 * 64 * s, 64 * s, 13 * 64 * s, 128 * s)
        im.paste(Image.new('RGBA', t.size, (0, 0, 0, 0)), box[:2]); im.paste(t, box[:2])
        im.save(f); im.save(f[:-4] + '.webp', lossless=True)
for f, k in (('tileset.json', '1x'), ('tileset_2x.json', '2x'), ('tileset_3x.json', '3x')):
    path = f'{OW}/{f}'; raw = open(path).read(); d = json.loads(raw)
    d['tiles'] = [t for t in d['tiles'] if t['id'] not in (7491, 7492)]
    for i, c in ((7491, 0), (7492, 1)):
        d['tiles'].append({'id': i, 'name': f'i_heal_info_panel_0_{c}', 'category': 'prop', 'sheet': f'interiors_new/tiles_{k}/i_brand.png',
                           'index': 27 + c, 'col': 11 + c, 'row': 1, 'walkable': True, 'collision': 'walk', 'collision_code': 0, 'encounter': False, 'interior': True})
    d['tiles'].sort(key=lambda t: t['id'])
    if 'i_heal_info_panel' not in d['multi_tile_objects']: d['multi_tile_objects'].append('i_heal_info_panel')
    for t in d['tiles']:
        if t['name'] == 'i_poster_route': t['name'] = 'i_poster_trail'   # blocked-word rename (same id/cell)
    open(path, 'w').write(json.dumps(d))
print('ok')
