#!/usr/bin/env python3
"""De-brand the last i_rt_* posters/props (no company logo / mark / letters). Same pattern as heal_panel.py.
  i_rt_logo_panel_0_{0,1} (7471/7472) -> i_notice_board_0_{0,1}: crystal mark + 'RT' removed, plain board with 3 pinned notes
  i_rt_poster_care   (7480) -> i_poster_care:   crystal mark + chevrons removed, teal heart
  i_rt_poster_safety (7481) -> i_poster_safety: unchanged art (plain shield), rename only
  i_rt_poster_join   (7482) -> i_poster_join:   chevron mark removed, plain mountain outline over the trail line
Written into i_brand and i_brand_v3 (1x drawn, 2x/3x nearest) + webp; names in tileset{,_2x,_3x}.json. Idempotent."""
import json, os
from collections import Counter
from PIL import Image, ImageDraw
OW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'world', 'overworld')
REN = {7471: 'i_notice_board_0_0', 7472: 'i_notice_board_0_1', 7480: 'i_poster_care', 7481: 'i_poster_safety', 7482: 'i_poster_join'}
def clear(c, box, keep):
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            if c.getpixel((x, y))[3] == 255 and c.getpixel((x, y))[:3] != keep: c.putpixel((x, y), keep + (255,))
def care(c):
    bg = Counter(c.getpixel((x, 20)) for x in range(14, 50)).most_common(1)[0][0][:3]
    clear(c, (12, 8, 52, 35), bg); d = ImageDraw.Draw(c); R = lambda x, y, w, h, k: d.rectangle((x, y, x + w - 1, y + h - 1), fill=k)
    for (x, y, w, h) in ((25, 12, 5, 3), (34, 12, 5, 3), (23, 15, 18, 5), (25, 20, 14, 3), (27, 23, 10, 3), (29, 26, 6, 2), (31, 28, 2, 2)):
        R(x, y, w, h, '#4fc0b0')
    R(25, 15, 3, 3, '#a8f0e4'); R(33, 26, 2, 2, '#2e7a70')
def join(c):
    bg = Counter(c.getpixel((x, 12)) for x in range(14, 50)).most_common(1)[0][0][:3]
    clear(c, (12, 6, 52, 38), bg); d = ImageDraw.Draw(c)
    d.line([(16, 34), (28, 14), (34, 24), (38, 18), (48, 34)], fill='#d6acff', width=2)
    d.line([(25, 19), (28, 14), (31, 19)], fill='#ffffff', width=1)
def board(c2):   # 128x64 two-cell panel
    face = Counter(c2.getpixel((x, y)) for y in range(14, 54) for x in range(14, 114)).most_common(1)[0][0][:3]
    clear(c2, (12, 10, 116, 56), face); d = ImageDraw.Draw(c2); R = lambda x, y, w, h, k: d.rectangle((x, y, x + w - 1, y + h - 1), fill=k)
    for i, (x, y, k) in enumerate(((20, 16, '#e8e0c8'), (52, 20, '#c6ecfa'), (84, 15, '#f0d8a0'))):
        R(x + 2, y + 2, 24, 30, '#1a1028'); R(x, y, 24, 30, k)
        for ly in range(y + 8, y + 26, 5): R(x + 4, ly, 16 - (ly % 3) * 2, 2, '#7a6a8a')
        R(x + 10, y - 1, 4, 4, '#e04848' if i != 1 else '#4fc0b0')
CELLS = {(0, 1): care, (2, 1): join}
for sheet in ('i_brand', 'i_brand_v3'):
    base = Image.open(f'{OW}/interiors_new/tiles_1x/{sheet}.png').convert('RGBA'); out = {}
    for (cx, cy), fn in CELLS.items():
        c = base.crop((cx * 64, cy * 64, cx * 64 + 64, cy * 64 + 64)); fn(c); out[(cx, cy, 1)] = c
    c2 = base.crop((7 * 64, 0, 9 * 64, 64)); board(c2); out[(7, 0, 2)] = c2
    for s, k in ((1, '1x'), (2, '2x'), (3, '3x')):
        f = f'{OW}/interiors_new/tiles_{k}/{sheet}.png'; im = Image.open(f).convert('RGBA')
        for (cx, cy, w), c in out.items():
            t = c.resize((64 * w * s, 64 * s), Image.NEAREST); xy = (cx * 64 * s, cy * 64 * s)
            im.paste(Image.new('RGBA', t.size, (0, 0, 0, 0)), xy); im.paste(t, xy)
        im.save(f); im.save(f[:-4] + '.webp', lossless=True)
for f in ('tileset.json', 'tileset_2x.json', 'tileset_3x.json'):
    p = f'{OW}/{f}'; d = json.load(open(p))
    for t in d['tiles']:
        if t['id'] in REN: t['name'] = REN[t['id']]
    d['multi_tile_objects'] = ['i_notice_board' if m == 'i_rt_logo_panel' else m for m in d['multi_tile_objects']]
    open(p, 'w').write(json.dumps(d))
print('ok')
