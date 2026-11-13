# Quick JSON map renderer (ground/decoration/overlay at 1x tiles) for review crops. usage: render_map.py map.json tileset.json out.png [x0 y0 x1 y1] [--col]
import json, sys, os
from PIL import Image, ImageDraw
mp, tsp, out = sys.argv[1:4]; box = [int(v) for v in sys.argv[4:8]] if len(sys.argv) > 7 else None
m = json.load(open(mp)); ts = json.load(open(tsp)); d = os.path.dirname(tsp); T = 64
byid = {t['id']: t for t in ts['tiles']}; sheets = {}
def tile(i):
    t = byid.get(i)
    if not t: return None
    p = os.path.join(d, t['sheet'])
    if p not in sheets: sheets[p] = Image.open(p).convert('RGBA')
    c = t.get('col', t['index'] % 16); r = t.get('row', t['index'] // 16)
    return sheets[p].crop((c * T, r * T, c * T + T, r * T + T))
x0, y0, x1, y1 = box or (0, 0, m['width'], m['height'])
im = Image.new('RGBA', ((x1 - x0) * T, (y1 - y0) * T), (0, 0, 0, 255))
for L in ('ground', 'decoration', 'overlay'):
    g = m['layers'].get(L)
    if not g: continue
    for y in range(y0, y1):
        for x in range(x0, x1):
            v = g[y][x]
            if v and (t := tile(v)): im.alpha_composite(t, ((x - x0) * T, (y - y0) * T))
dr = ImageDraw.Draw(im)
for n in m.get('npcs', []):
    if x0 <= n['x'] < x1 and y0 <= n['y'] < y1: dr.rectangle([(n['x'] - x0) * T + 16, (n['y'] - y0) * T + 16, (n['x'] - x0) * T + 48, (n['y'] - y0) * T + 48], outline=(255, 0, 255, 255), width=4)
if '--col' in sys.argv:
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = m['layers']['collision'][y][x]
            if c: dr.rectangle([(x - x0) * T + 26, (y - y0) * T + 26, (x - x0) * T + 38, (y - y0) * T + 38], fill=(255, 0, 0, 200) if c == 1 else (0, 120, 255, 200))
    for y in range(y0, y1): dr.text((2, (y - y0) * T + 2), str(y), fill=(255, 255, 0, 255))
    for x in range(x0, x1): dr.text(((x - x0) * T + 2, 2), str(x), fill=(255, 255, 0, 255))
im.save(out)
