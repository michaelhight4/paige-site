#!/usr/bin/env python3
"""Furniture-vs-floor/wall colour check (Gary: furniture colours must never match the floor or walls).

For every map: the exact opaque RGB codes of its floor + wall tiles (ground layer, plus wall/floor/window tiles on
any layer, plus every tile a flag_swap can put there = the house/room recolours) against the codes of each furniture
piece placed on decoration/overlay (tile category furniture/interior/prop, not wall/floor/window/door/rug/mat).
Pixels are read from the sheets the game draws with ix2 on (tileset.js file(): *_v3 for furniture sheets, *_v2 for
i_wall/i_floor), 1x. The 1 px outline / near-black codes (max channel < 40) are ignored: they are the shared ink.
The procedural supply chest palettes (src/systems/chest_art.js) are checked against the floors under each pickup.

  Both sheet sets are checked: ix2 (*_v3/*_v2) and the ix2=0 fallback base sheets.
  python3 tools/furniture_perspective/colour_check.py            report, exit 1 if anything is shared
  python3 tools/furniture_perspective/colour_check.py --fix      nudge every shared furniture code (same cell, all
        scales, exact-code swap) to the nearest free code (+-1..6 per channel, luma kept) and re-check
"""
import glob, json, os, re, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
OW = os.path.join(ROOT, 'art/world/overworld')
V3 = re.compile(r'tiles_\dx/(interior|i_furniture|i_brand|x_furniture_fix|ix2_kit)\.png$')
V2 = re.compile(r'tiles_\dx/(interior|i_wall|i_floor|i_furniture|i_brand|x_furniture_fix|ix2_kit)\.png$')
MODE = 'ix2'   # 'ix2' = *_v3/*_v2 sheets (ix2 on); 'fallback' = the base sheets tileset.js draws with ix2=0
def file(p, s='1x'):
    p = p.replace('tiles_1x', f'tiles_{s}').replace('tiles_2x', f'tiles_{s}').replace('tiles_3x', f'tiles_{s}')
    if MODE == 'fallback': return p
    return p.replace('.png', '_v3.png' if V3.search(p) else '_v2.png') if V2.search(p) else p
FURN = {'furniture', 'interior', 'prop'}
NOTFURN = re.compile(r'(^|_)(i?wall|floor|window|door|walldoor|stairs|rug|mat|carpet|void|shadow|light)(_|$)|^iwall|^cliff|^x_iwall')
SURF = re.compile(r'(^|_)(i?wall|floor|window)(_|$)|^iwall|^x_iwall')
INK = 40
T = {}
for f in ('tileset.json', 'tileset_ix2.json'):
    for t in json.load(open(os.path.join(OW, f)))['tiles']: T[t['id']] = t
_img = {}
def cell(t, s='1x'):
    p = os.path.join(OW, file(t['sheet'], s))
    if p not in _img:
        _img[p] = np.array(Image.open(p).convert('RGBA')) if os.path.exists(p) else None
    a = _img[p]; k = {'1x': 1, '2x': 2, '3x': 3}[s] * 64
    return None if a is None else a[t['row'] * k:(t['row'] + 1) * k, t['col'] * k:(t['col'] + 1) * k]
_cc = {}
def codes(tid):
    if tid not in _cc:
        t = T.get(tid); c = cell(t) if t else None
        if c is None or not c.size: _cc[tid] = set()
        else:
            px = c[c[..., 3] == 255][:, :3]; px = px[px.max(1) >= INK]
            _cc[tid] = {tuple(int(v) for v in p) for p in np.unique(px, axis=0)} if len(px) else set()
    return _cc[tid]
SKIP = re.compile(r'wall|window|poster|sign|rug|mat(_|$)|door|stairs|banner|logo|floor|void|photos|wall_art|cork|clock|_mark|'
                  r'timetable|frame|curtain|platform|rail_|light|shadow|tree|flower|arena_|gate|crystal_display|barrier|pillar|edge')
def is_furn(t): return t and t.get('category') in FURN and not SKIP.search(t['name'])   # same scope as reshade.py
def is_surf(t, layer): return t and bool(SURF.search(t['name'])) and not re.search(r'shelf|crystal', t['name'])
def chest_codes():
    js = open(os.path.join(ROOT, 'src/systems/chest_art.js')).read(); out = {}
    for name in ('CHEST_PAL', 'CHEST_PAL_IRON'):
        pal = json.loads(re.search(rf'export const {name} = (\{{.*?\}});', js).group(1))
        out[name] = {tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for v in pal.values() if v.startswith('#')}
        out[name] = {c for c in out[name] if max(c) >= INK}
    return out
WOOD = re.compile(r'^(i_)?floor_(wood|oak|pine|parquet|drift)|(^|_)(wood|plank|planks|boardwalk|dock|pier|deck)(_|$)')
def scan():
    hits = []; ch = chest_codes()
    for f in sorted(glob.glob(os.path.join(OW, 'maps', '*.json'))):
        j = json.load(open(f)); L = j.get('layers') or {}
        if not isinstance(L, dict): continue
        if not any(SURF.search((T.get(tid) or {}).get('name', '')) for row in L.get('ground') or [] for tid in row): continue  # rooms only
        surf, furn = set(), {}
        for ln in ('ground', 'decoration', 'overlay'):
            for row in L.get(ln) or []:
                for tid in row:
                    t = T.get(tid)
                    if not t: continue
                    if is_surf(t, ln): surf.add(tid)
                    elif ln != 'ground' and is_furn(t): furn[tid] = t['name']
        for fs in j.get('flag_swaps') or []:          # recoloured rooms: every tile a swap can show
            for k in ('tile', 'to', 'from'):
                tid = fs.get(k)
                if isinstance(tid, int) and T.get(tid) and is_surf(T[tid], fs.get('layer') or 'decoration'): surf.add(tid)
        sc = {}
        for tid in surf:
            for c in codes(tid): sc.setdefault(c, T[tid]['name'])
        for tid, nm in furn.items():
            for c in codes(tid) & sc.keys(): hits.append((j.get('name') or os.path.basename(f), nm, tid, c, sc[c]))
        for it in j.get('items') or []:              # chests on their floor
            if it.get('hidden') or not L.get('ground'): continue
            g = T.get(L['ground'][it['y']][it['x']]); gname = g['name'] if g else ''
            pal = 'CHEST_PAL_IRON' if WOOD.search(gname) else 'CHEST_PAL'
            for c in ch[pal] & (codes(g['id']) if g else set()): hits.append((j.get('name'), pal, -1, c, gname))
    return hits
def report(hits):
    by = {}
    for m, nm, tid, c, s in hits: by.setdefault(m, []).append(f'{nm} #{c[0]:02x}{c[1]:02x}{c[2]:02x} = {s}')
    for m, v in by.items(): print(f'{m}: {len(v)} shared'); [print('   ', x) for x in sorted(set(v))[:12]]
    print(f'TOTAL shared furniture/floor-wall codes: {len(hits)} in {len(by)} maps')
def fix(hits):
    allsurf = set()
    for f in glob.glob(os.path.join(OW, 'maps', '*.json')):
        L = json.load(open(f)).get('layers') or {}
        if not isinstance(L, dict): continue
        for ln in ('ground', 'decoration', 'overlay'):
            for row in L.get(ln) or []:
                for tid in row:
                    t = T.get(tid)
                    if t and is_surf(t, ln): allsurf |= codes(tid)
    todo = {}
    for m, nm, tid, c, s in hits:
        if tid > 0: todo.setdefault(tid, set()).add(c)
    anim = json.load(open(os.path.join(OW, 'furniture_v3_anim.json')))['anim']
    n = 0
    for tid, cs in todo.items():
        t = T[tid]; used = codes(tid); mp = {}
        for c in sorted(cs):
            best = None
            for d in range(1, 7):
                for dv in ((d, d, d), (-d, -d, -d), (d, 0, 0), (0, d, 0), (0, 0, d), (-d, 0, 0), (0, -d, 0), (0, 0, -d)):
                    nc = tuple(min(255, max(0, a + b)) for a, b in zip(c, dv))
                    if nc not in allsurf and nc not in used and nc not in mp.values(): best = nc; break
                if best: break
            mp[c] = best
        cells = [(t['col'], t['row'])] + [(fr % 16, fr // 16) for fr in anim.get(str(tid), {}).get('frames', [])]
        for s, k in (('1x', 64), ('2x', 128), ('3x', 192)):
            p = os.path.join(OW, file(t['sheet'], s))
            if not os.path.exists(p): continue
            im = np.array(Image.open(p).convert('RGBA'))
            for (cx, cy) in set(cells):
                a = im[cy * k:(cy + 1) * k, cx * k:(cx + 1) * k]
                for c, nc in mp.items():
                    sel = (a[..., 3] > 0) & np.all(a[..., :3] == c, -1); a[sel, :3] = nc; n += int(sel.sum()) if s == '1x' else 0
            Image.fromarray(im).save(p); Image.fromarray(im).save(p[:-4] + '.webp', lossless=True)
            _img.pop(p, None)
        _cc.pop(tid, None)
        print(f'  {t["name"]}: ' + ', '.join(f'#{a[0]:02x}{a[1]:02x}{a[2]:02x}->#{b[0]:02x}{b[1]:02x}{b[2]:02x}' for a, b in mp.items()))
    print(f'fixed {len(todo)} pieces, {n} px at 1x')
if __name__ == '__main__':
    bad = 0
    for MODE in ('ix2', 'fallback'):                 # both sheet sets the game can draw (ix2 on, and the ix2=0 fallback)
        _cc.clear(); _img.clear(); print(f'== {MODE} sheets'); h = scan(); report(h)
        if '--fix' in sys.argv and h:
            fix(h); _cc.clear(); _img.clear(); h = scan(); print('after fix:'); report(h)
        bad += len(h)
    sys.exit(1 if bad else 0)
