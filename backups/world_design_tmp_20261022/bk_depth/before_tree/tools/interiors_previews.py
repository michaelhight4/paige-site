# Preview + 4-phase check for the interiors hookup and the per-door home recolours (draw order: recolour -> time-of-day grade).
# Writes previews/home_recolour_grid.png (4 designs x every scheme, day + night), previews/home_recolour_phases.png (dawn + dusk),
# previews/interiors_phases.png (every imported interior x dawn/day/dusk/night) and qa/interiors_hookup/phase_check.json.
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import interiors_merge as IM, time_of_day as TOD
OUT = IM.OUT; T = 64
TAB = TOD.tables()
GR = json.load(open(os.path.join(OUT, 'time_of_day', 'grades.json')))['grades']
DOC = json.load(open(os.path.join(IM.STAGE, 'home_recolours.json')))
MASK = {n: (np.array(Image.open(os.path.join(IM.STAGE, e['mask']))) == 255 if e['mask'] else None) for n, e in DOC['recolourable'].items()}
_cache = {}
def tile(name, scheme):
    k = (name, scheme)
    if k in _cache: return _cache[k]
    im = IM.tile_img(name); mp = DOC['schemes'][scheme]['map'] if scheme else {}
    if mp and name in DOC['recolourable']:
        a = np.array(im); key = (a[..., 0].astype(np.int32) << 16) | (a[..., 1].astype(np.int32) << 8) | a[..., 2]
        reg = (a[..., 3] == 255) & (MASK[name] if MASK[name] is not None else True)
        out = a.copy()
        for s, d in mp.items():
            m = reg & (key == int(s[1:], 16)); out[m, :3] = [int(d[i:i + 2], 16) for i in (1, 3, 5)]
        im = Image.fromarray(out, 'RGBA')
    _cache[k] = im; return im
def render(nm, scheme=None):
    d = json.load(open(os.path.join(OUT, 'maps', nm + '.json'))); L = d['layers']
    im = Image.new('RGBA', (d['width'] * T, d['height'] * T), (26, 18, 38, 255))
    for lay in ('ground', 'decoration', 'overlay'):
        for y, r in enumerate(L[lay]):
            for x, v in enumerate(r):
                if v: im.alpha_composite(tile(IM.IBYID[v]['name'], scheme), (x * T, y * T))
    return im.convert('RGB')
def grade(im, g):
    tab = dict(TAB[g], _name=g) if isinstance(TAB, dict) and g in TAB else dict(GR[g], _name=g)
    return TOD.apply(im, tab)
def offpal(im):   # pixels the exact grade table can't swap (they fall back to the grade function)
    a = np.asarray(im).reshape(-1, 3); key = (a[:, 0].astype(np.int32) << 16) | (a[:, 1].astype(np.int32) << 8) | a[:, 2]
    keys = np.array([int(h, 16) for h in GR['night']['map']]); return int((~np.isin(key, keys)).sum())
def lab(im, txt, h=22):
    c = Image.new('RGB', (im.width, im.height + h), (20, 16, 30)); c.paste(im, (0, h)); ImageDraw.Draw(c).text((6, 5), txt, fill=(240, 232, 255)); return c
def sheet(cells, cols, pad=8, title=''):
    w = max(c.width for c in cells); h = max(c.height for c in cells); rows = (len(cells) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad) + pad + 30), (12, 10, 18)); ImageDraw.Draw(S).text((pad, 9), title, fill=(255, 220, 140))
    for i, c in enumerate(cells): S.paste(c, (pad + (i % cols) * (w + pad), 30 + pad + (i // cols) * (h + pad)))
    return S
half = lambda im: im.resize((im.width // 2, im.height // 2), Image.NEAREST)
DESIGNS = [(h['id'], h['map']) for h in IM.HOME_POOL] ; DESIGNS.insert(3, ('H3-2F', 'home_lanternport_c_2f'))
SCH = ['identity'] + list(IM.SCHEME_ORDER[1:])   # base schemes; each design row uses its own tuned copy (IM.scheme_id)
rep = dict(off_palette_pixels={}, note='draw order recolour -> grade; off-palette = pixels the exact grade table cannot swap (shadow blends only, handled by the grade function / LUT)')
def grid(phases, path, title):
    cells = []
    for did, nm in DESIGNS:
        for g in phases:
            for s in SCH:
                s = IM.scheme_id(next(h['id'] for h in IM.HOME_POOL if h['map'] in (nm, nm.replace('_2f', ''))), s)
                im = render(nm, s); gi = grade(im, g); rep['off_palette_pixels'][f'{nm}|{s}|{g}'] = offpal(im)
                cells.append(lab(half(gi), f'{did} {nm} | {s} | {g}'))
    sheet(cells, len(SCH), title=title).save(path, optimize=True)
grid(['day', 'night'], os.path.join(OUT, 'previews', 'home_recolour_grid.png'), 'Shared home designs x recolour schemes (rows: design, day then night). Draw order: recolour -> time-of-day grade. DRAFT')
grid(['dawn', 'dusk'], os.path.join(OUT, 'previews', 'home_recolour_phases.png'), 'Shared home designs x recolour schemes at dawn and dusk (completes the 4-phase check)')
cells = []
for nm in IM.IMPORT:
    im = render(nm)
    for g in ('dawn', 'day', 'dusk', 'night'): cells.append(lab(half(grade(im, g)), f'{nm} | {g}'))
sheet(cells, 4, title='Every hooked-up interior in all 4 time-of-day phases (engine indoor_rule keeps interiors on "day"; dawn/dusk/night shown as the graded worst case)').save(
    os.path.join(OUT, 'previews', 'interiors_phases.png'), optimize=True)
# Brookhollow/Fernwick exteriors in 4 phases (new lab + re-pointed doors)
cells = []
for nm in ('brookhollow', 'fernwick'):
    im = Image.open(os.path.join(OUT, 'previews', nm + '.png')).convert('RGB'); im = im.resize((im.width // 3, im.height // 3), Image.NEAREST)
    for g in ('dawn', 'day', 'dusk', 'night'): cells.append(lab(half(grade(im, g)), f'{nm} | {g}'))
sheet(cells, 4, title='Brookhollow + Fernwick after the hookup, 4 phases').save(os.path.join(OUT, 'qa', 'interiors_hookup', 'after', 'towns_phases.png'), optimize=True)
rep['max_off_palette'] = max(rep['off_palette_pixels'].values())
json.dump(rep, open(os.path.join(OUT, 'qa', 'interiors_hookup', 'phase_check.json'), 'w'), indent=1)
print('previews ok; max off-palette pixels per render:', rep['max_off_palette'])
