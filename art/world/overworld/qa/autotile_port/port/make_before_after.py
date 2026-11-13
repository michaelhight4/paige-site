# before | after | diff (day + night) per ported map, plus zoomed crops of every changed cell. Read-only on both roots.
# usage: make_before_after.py BEFORE_ROOT AFTER_ROOT OUTDIR
import sys, os, json
OW = '/workspace/kilumen/art/world/overworld'; sys.path.insert(0, OW + '/tools')
import numpy as np
from PIL import Image, ImageDraw
import time_of_day as TOD
BEF, AFT, OUTD = sys.argv[1:4]
MAPS = json.load(open(AFT + '/tools/autotile_rules.json'))['maps']
GA = json.load(open(AFT + '/time_of_day/grades.json'))['grades']; GB = json.load(open(BEF + '/time_of_day/grades.json'))['grades']
MA = TOD.emissive_masks(ow=AFT); MB = TOD.emissive_masks(ow=BEF)
idA = {t['id']: t['name'] for t in json.load(open(AFT + '/tileset.json'))['tiles']}
idB = {t['id']: t['name'] for t in json.load(open(BEF + '/tileset.json'))['tiles']}
def mp(root, n): return f'{root}/maps/{"variants/" if n.endswith("_storm") else ""}{n}.json'
def label(im, text):
    out = Image.new('RGBA', (im.width, im.height + 34), (20, 16, 28, 255)); out.paste(im, (0, 34)); ImageDraw.Draw(out).text((8, 10), text, fill=(240, 240, 240)); return out
res = {}
for n in MAPS:
    a = json.load(open(mp(BEF, n))); b = json.load(open(mp(AFT, n)))
    cells = {}
    for L in ('ground', 'decoration', 'overlay'):
        for y in range(b['height']):
            for x in range(b['width']):
                if idB.get(a['layers'][L][y][x]) != idA.get(b['layers'][L][y][x]): cells[(x, y)] = cells.get((x, y), []) + [(L, idB.get(a['layers'][L][y][x]), idA.get(b['layers'][L][y][x]))]
    rname = n if not n.endswith('_storm') else 'variants/' + n
    rows, crops, pxd = [], [], {}
    S = 0.5 if b['width'] * b['height'] > 900 else 0.75
    for g in ('day', 'night'):
        ia = TOD.render_map(rname, GB, g, MB, ow=BEF).convert('RGBA'); ib = TOD.render_map(rname, GA, g, MA, ow=AFT).convert('RGBA')
        d = (np.asarray(ia.convert('RGB')).astype(int) - np.asarray(ib.convert('RGB')).astype(int)) != 0; pxd[g] = int(d.any(2).sum())
        lay = Image.new('RGBA', ib.size, (0, 0, 0, 120)); dr = ImageDraw.Draw(lay)
        for (x, y), ch in cells.items():
            col = (255, 210, 0) if any('+' in (c[2] or '') for c in ch) else (80, 200, 255) if any('cavewall' in (c[2] or '') for c in ch) else (255, 60, 140)
            dr.rectangle([x * 64, y * 64, x * 64 + 63, y * 64 + 63], fill=col + (60,), outline=col + (255,), width=5)
        mk = Image.fromarray((d.any(2) * 255).astype('uint8')); lay.paste((255, 255, 255, 255), mask=mk)
        diff = Image.alpha_composite(ib, lay)
        sm = lambda im: im.resize((int(im.width * S), int(im.height * S)), Image.NEAREST)
        rows.append([label(sm(ia), f'BEFORE {n} ({g})'), label(sm(ib), f'AFTER, rule-placed ({g})'),
                     label(sm(diff), f'DIFF ({g}): {len(cells)} cells, {pxd[g]} px. yellow=3-way junction, blue=cave wall end, pink=ledge/cliff strip, white=changed px')])
        for (x, y) in sorted(cells):
            box = (max(0, x - 1) * 64, max(0, y - 1) * 64, min(b['width'], x + 2) * 64, min(b['height'], y + 2) * 64)
            ca = ia.crop(box).resize(((box[2] - box[0]) * 2, (box[3] - box[1]) * 2), Image.NEAREST); cb = ib.crop(box).resize(ca.size, Image.NEAREST)
            crops.append((g, (x, y), ca, cb))
    cw, chh = rows[0][0].size
    cr_w = 384 * 2 + 12; per_row = max(1, (cw * 3) // (cr_w + 8)); ncr = len(crops)
    crh = (ncr + per_row - 1) // per_row * (384 + 44) if ncr else 0
    sheet = Image.new('RGBA', (cw * 3, chh * 2 + crh + (40 if ncr else 0)), (20, 16, 28, 255))
    for r, row in enumerate(rows):
        for c, im in enumerate(row): sheet.paste(im, (c * cw, r * chh))
    if ncr:
        dr = ImageDraw.Draw(sheet); y0 = chh * 2 + 8; dr.text((8, y0 + 8), f'ZOOM x2 (3x3 cells around each changed cell): before | after', fill=(255, 210, 0)); y0 += 40
        for k, (g, (x, y), ca, cb) in enumerate(crops):
            cx = (k % per_row) * (cr_w + 8) + 4; cy = y0 + (k // per_row) * (384 + 44)
            nm = [c[2] for c in cells[(x, y)]][0]
            dr.text((cx, cy), f'({x},{y}) {g}: {nm}'[:110], fill=(240, 240, 240)); sheet.paste(ca, (cx, cy + 16)); sheet.paste(cb, (cx + ca.width + 12, cy + 16))
    os.makedirs(f'{OUTD}/{n}', exist_ok=True); sheet.convert('RGB').save(f'{OUTD}/{n}/before_after.png', optimize=True)
    res[n] = dict(cells=[[x, y, ch] for (x, y), ch in sorted(cells.items())], px_day=pxd['day'], px_night=pxd['night'])
    print(n, len(cells), 'cells', pxd)
json.dump(res, open(f'{OUTD}/before_after.json', 'w'), indent=1)
