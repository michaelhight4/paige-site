#!/usr/bin/env python3
"""Headless map render (ground + decoration + overlay, NPC/item/spot markers) for before/after shots.
Usage: python3 tools/map_audit/render_map.py <map_name> <out.png> [--px 32] [--map-file path]"""
import argparse, json, os
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld')
a = argparse.ArgumentParser(); a.add_argument('map'); a.add_argument('out'); a.add_argument('--px', type=int, default=32); a.add_argument('--map-file')
o = a.parse_args()
ts = json.load(open(os.path.join(OW, 'tileset.json'))); T = {t['id']: t for t in ts['tiles']}; N = ts['tile_size']; cps = ts['columns_per_sheet']
j = json.load(open(o.map_file or os.path.join(OW, 'maps', o.map + '.json'))); w, h = j['width'], j['height']
sheets = {}
def tile(i):
    t = T.get(i)
    if not t: return None
    p = os.path.join(OW, t['sheet'])
    if p not in sheets: sheets[p] = Image.open(p).convert('RGBA') if os.path.exists(p) else None
    s = sheets[p]
    if s is None: return None
    c, r = t.get('col', t['index'] % cps), t.get('row', t['index'] // cps)
    return s.crop((c * N, r * N, c * N + N, r * N + N))
img = Image.new('RGBA', (w * N, h * N), (20, 24, 32, 255))
for L in ('ground', 'decoration', 'overlay'):
    g = j['layers'].get(L)
    if not g: continue
    for y in range(h):
        for x in range(w):
            if g[y][x]:
                t = tile(g[y][x])
                if t: img.alpha_composite(t, (x * N, y * N))
d = ImageDraw.Draw(img)
def box(x, y, col): d.rectangle((x * N + 6, y * N + 6, x * N + N - 6, y * N + N - 6), outline=col, width=5)
for n in j.get('npcs', []): box(n['x'], n['y'], (255, 80, 80, 255))
for it in j.get('items', []): box(it['x'], it['y'], (255, 74, 216, 255))
for s in j.get('interact_spots', []): box(s['x'], s['y'], (80, 220, 255, 255))
for wp in j.get('warps', []): box(wp['x'], wp['y'], (255, 220, 60, 255))
img.resize((w * o.px, h * o.px), Image.NEAREST).save(o.out)
print(o.out)
