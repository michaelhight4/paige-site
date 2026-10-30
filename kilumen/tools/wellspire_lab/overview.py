#!/usr/bin/env python3
"""Static overview of the 10 WD flashback lab rooms (+ room 10 after the release, flag_swaps applied) from map JSON + 1x sheets.
Run: python3 tools/wellspire_lab/overview.py  ->  shots/flashback_lab_wd/full_maps_overview.png"""
import json, os
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); OW = os.path.join(ROOT, 'art/world/overworld')
T = 32
tiles = {}
for f in ('tileset.json', 'tileset_arena.json'):
    for t in json.load(open(os.path.join(OW, f)))['tiles']: tiles[t['id']] = t
byname = {t['name']: i for i, t in tiles.items()}
sheets = {}
def tile(i):
    t = tiles.get(i)
    if not t: return None
    p = t['sheet'] if t['sheet'].startswith(('tiles_1x', 'interiors')) else t['sheet']
    if p not in sheets: sheets[p] = Image.open(os.path.join(OW, p)).convert('RGBA')
    sh = sheets[p]; n = sh.width // 16
    return sh.crop((t['col'] * n, t['row'] * n, (t['col'] + 1) * n, (t['row'] + 1) * n)).resize((T, T), Image.NEAREST)
def render(m, released=False):
    L = {k: [r[:] for r in v] for k, v in m['layers'].items()}
    if released:
        for s in m.get('flag_swaps', []): L[s.get('layer', 'decoration')][s['y']][s['x']] = byname[s['after']]
    im = Image.new('RGBA', (m['width'] * T, m['height'] * T), (0, 0, 0, 255))
    for k in ('ground', 'decoration', 'overlay'):
        for y, r in enumerate(L[k]):
            for x, i in enumerate(r):
                if i and (ti := tile(i)) is not None: im.alpha_composite(ti, (x * T, y * T))
    d = ImageDraw.Draw(im)
    for n in m.get('npcs', []): d.ellipse((n['x'] * T + T // 2 - 5, n['y'] * T + T - 14, n['x'] * T + T // 2 + 5, n['y'] * T + T - 4), fill=(24, 28, 44, 200), outline=(207, 238, 255), width=1)  # NPC foot pin (Director #17: no red debug frames)
    return im
maps = sorted(f[:-5] for f in os.listdir(os.path.join(OW, 'maps')) if f.startswith('fin_past_wlab_'))
imgs = [(n, render(json.load(open(os.path.join(OW, 'maps', n + '.json'))))) for n in maps]
imgs.append(('fin_past_wlab_10_ondravel (after release)', render(json.load(open(os.path.join(OW, 'maps', maps[-1] + '.json'))), True)))
cols = 4; cw = max(i.width for _, i in imgs) + 16; ch = max(i.height for _, i in imgs) + 30
out = Image.new('RGBA', (cols * cw, ((len(imgs) + cols - 1) // cols) * ch), (24, 24, 30, 255)); d = ImageDraw.Draw(out)
for k, (n, i) in enumerate(imgs):
    x, y = (k % cols) * cw + 8, (k // cols) * ch + 4; d.text((x, y), n, fill=(230, 230, 240)); out.alpha_composite(i, (x, y + 18))
p = os.path.join(ROOT, 'shots/flashback_lab_wd/full_maps_overview.png'); out.convert('RGB').save(p); print(p, out.size)
