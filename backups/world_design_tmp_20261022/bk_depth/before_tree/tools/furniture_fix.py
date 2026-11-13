# Furniture-colour fix (GAME_QUALITY_CHECKLIST "Furniture never shares colour codes with the floor or walls", Oct 22 2026).
#   python3 tools/furniture_fix.py solve  -> tools/furniture_fix_table.json (run ONCE on the pre-fix art; the table is the art decision)
#   apply_frames(TILES)                    -> build.py post-pass: core + x_ tile frames get the per-tile colour swaps (ids unchanged)
#   apply_interior_sheets()                -> interiors_new/tiles_{1,2,3}x rewritten from the pristine copies in qa/furniture_colours/before/
#   x_sheet(k)                             -> tiles_<k>x/x_furniture_fix.png: fixed x_ frames (the biome worker's tiles_extra/ is never written)
# Solver: two-sided greedy. Every (map, hex) clash between a furniture group and a floor/wall group is resolved by swapping that hex,
# in whichever group it costs less (CIELAB distance x pixel share; floors/walls cost 2x because they fill the screen; the Revival Tech
# violet on branded furniture costs 4x: the brand stays on the furniture). The replacement is the nearest palette.hex colour that
# is not already in the group (shading stays distinct), not on the other side on any map the group is drawn on, and never a
# night-glow colour unless the source already glowed. Windows, doors, mats, stairs, lights and puzzle tiles are never touched.
import os, sys, json, re, collections
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
TABLE = os.path.join(HERE, 'furniture_fix_table.json')
BEFORE = os.path.join(OUT, 'qa', 'furniture_colours', 'before')
BRAND = re.compile(r'(i_rt_|i_counter_rt|i_crystal_|i_rug_violet|i_suggestion|i_newsletter|i_locker|i_terminal|i_company_terminal)')
VIOLET = {'1a1226', '3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff'}
# hand-set art direction for the Revival Tech branch: warm walls/floor (wine dado, dusty-rose tiles) so the violet brand stays on the furniture
SEED = {r'i_(wall_(top|face|upper)|floor)_rtbranch': {'1a1226': '2c2320', '3a1e60': '561c0e', '603096': '6e222a', '8a4ace': 'a23432',
                                                    'd6acff': 'daa2ba', 'b076ec': 'd2608c'}}
grp = lambda n: re.sub(r'(_\d+)+$', '', n)

def load_table():
    return json.load(open(TABLE)) if os.path.exists(TABLE) else {'tiles': {}}
def _swap(a, mp):
    """a: HxWx4 uint8 array; exact opaque-colour swap (simultaneous)."""
    if not mp: return a
    a = a.copy(); key = (a[..., 0].astype(np.int64) << 16) | (a[..., 1].astype(np.int64) << 8) | a[..., 2]; op = a[..., 3] > 0
    for s, d in mp.items():
        sel = op & (key == int(s, 16)); a[sel, 0], a[sel, 1], a[sel, 2] = int(d[0:2], 16), int(d[2:4], 16), int(d[4:6], 16)
    return a
def tile_map(name, table=None):
    return (table or load_table())['tiles'].get(name, {})

def apply_frames(TILES):
    """build post-pass: swap colours in the frames of core and x_ tiles listed in the table (i_ tiles are fixed in their sheets)."""
    tb = load_table()
    for t in TILES:
        mp = tb['tiles'].get(t['name'])
        if mp and not t['name'].startswith('i_'):
            t['frames'] = [Image.fromarray(_swap(np.array(f.convert('RGBA')), mp), 'RGBA') for f in t['frames']]

def apply_interior_sheets():
    """interiors_new/tiles_{1,2,3}x/*.png <- pristine copy + swaps (idempotent)."""
    tb = load_table(); IT = json.load(open(os.path.join(OUT, 'interiors_new', 'tileset_interiors.json')))
    for k in (1, 2, 3):
        T = 64 * k
        for sheet in sorted({e['sheet'] for e in IT['tiles']}):
            src = os.path.join(BEFORE, sheet.replace('tiles_1x/', f'tiles_{k}x/'))
            a = np.array(Image.open(src).convert('RGBA'))
            pristine = a.copy()
            for e in IT['tiles']:
                if e['sheet'] != sheet: continue
                plain = tb.get('window_walls', {}).get(e['name'])
                if plain:   # wallpaper pixels (identical to the plain wall) follow the plain wall's swap; glass, frame, sill, curtains untouched
                    pe = next(p for p in IT['tiles'] if p['name'] == plain)
                    srcp = pristine if pe['sheet'] == sheet else np.array(Image.open(os.path.join(BEFORE, pe['sheet'].replace('tiles_1x/', f'tiles_{k}x/'))).convert('RGBA'))
                    x, y = (e['index'] % 16) * T, (e['index'] // 16) * T; px, py = (pe['index'] % 16) * T, (pe['index'] // 16) * T
                    t = a[y:y + T, x:x + T]; same = np.all(t == srcp[py:py + T, px:px + T], axis=-1)
                    sw = _swap(t, tb['tiles'][plain]); t[same] = sw[same]; a[y:y + T, x:x + T] = t
                if e['name'] not in tb['tiles']: continue
                idxs = (e.get('animation') or {}).get('frames') or [e['index']]
                for i in set(idxs) | {e['index']}:
                    x, y = (i % 16) * T, (i // 16) * T
                    a[y:y + T, x:x + T] = _swap(a[y:y + T, x:x + T], tb['tiles'][e['name']])
            Image.fromarray(a, 'RGBA').save(os.path.join(OUT, 'interiors_new', sheet.replace('tiles_1x/', f'tiles_{k}x/')), optimize=True)

def x_sheet_entries(entries, BYNAME, k=1):
    """repoint fixed x_ entries to tiles_<k>x/x_furniture_fix.png (same ids); writes the sheet. entries: tileset entry dicts (modified)."""
    names = x_fixed_names(); T = 64
    if not names: return
    cols = 16; rows = (len(names) + cols - 1) // cols; sh = Image.new('RGBA', (cols * T, rows * T), (0, 0, 0, 0)); pos = {}
    for i, n in enumerate(names):
        sh.paste(BYNAME[n]['frames'][0], ((i % cols) * T, (i // cols) * T)); pos[n] = i
    sh.save(os.path.join(OUT, 'tiles_1x', 'x_furniture_fix.png'), optimize=True)
    for kk in (2, 3): sh.resize((sh.width * kk, sh.height * kk), Image.NEAREST).save(os.path.join(OUT, f'tiles_{kk}x', 'x_furniture_fix.png'), optimize=True)
    for e in entries:
        if e['name'] in pos:
            i = pos[e['name']]; e.update(sheet='tiles_1x/x_furniture_fix.png', index=i, col=i % cols, row=i // cols)
            e['notes'] = ((e.get('notes') or '') + ' Colours swapped for the furniture-colour rule (tools/furniture_fix.py); pixels in tiles_1x/x_furniture_fix.png, tiles_extra/ untouched.').strip()
def x_fixed_names():
    return sorted(n for n in load_table()['tiles'] if n.startswith('x_'))

# ---------------- solver ----------------
def _lab(h):
    from skimage.color import rgb2lab
    return rgb2lab(np.array([[[int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]]]))[0, 0]
def solve():
    sys.path.insert(0, HERE); import furniture_colours as F, interiors_merge as I
    TS = F.tileset(); BY = {e['name']: e for e in TS.values()}
    pal = [l.strip().lower() for l in open(os.path.join(OUT, 'palette.hex')) if l.strip()]; LAB = {h: _lab(h) for h in pal}
    def dE(a, b): A, B = LAB[a], LAB[b]; return float(np.sqrt(((A[0] - B[0]) * 1.3) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2))
    def counts(n):
        a = F.tile_px(BY[n]); op = a[..., 3] == 255
        return collections.Counter('%02x%02x%02x' % tuple(p[:3]) for p in a[op])
    maps_of = collections.defaultdict(set); kind = {}
    for m in F.SCOPE:
        L = json.load(open(os.path.join(OUT, 'maps', m + '.json')))['layers']
        for i in {v for lay in ('ground', 'decoration', 'overlay') for r in L[lay] for v in r if v}:
            c = F.cls(TS[i])
            if c: maps_of[TS[i]['name']].add(m); kind[TS[i]['name']] = c
    # groups: furniture by object name; floors/walls by (kind, style, maps drawn on)
    G = {}
    for n, ms in maps_of.items():
        side = 'F' if kind[n] == 'furniture' else 'S'
        key = ('F', grp(n)) if side == 'F' else ('S', kind[n], tuple(sorted(ms)))
        g = G.setdefault(key, dict(side=side, tiles=[], maps=set(), px=collections.Counter()))
        g['tiles'].append(n); g['maps'] |= ms; g['px'] += counts(n)
    for g in G.values():
        g['cur'] = {c: c for c in g['px']}                       # original -> current
        tot = sum(g['px'].values()); g['share'] = {c: v / tot for c, v in g['px'].items()}
        g['brand'] = g['side'] == 'F' and any(BRAND.match(t) for t in g['tiles'])
    for rx, mp in SEED.items():
        for g in G.values():
            if g['side'] == 'S' and all(re.match(rx, t) for t in g['tiles']):
                for o in g['cur']:
                    if o in mp: g['cur'][o] = mp[o]
    cols = lambda g: set(g['cur'].values())
    def side_cols(m, side): return set().union(*[cols(g) for g in G.values() if g['side'] == side and m in g['maps']])
    def option(g, c):
        other = 'F' if g['side'] == 'S' else 'S'
        forb = set().union(*[side_cols(m, other) for m in g['maps']]) | cols(g)
        best = None
        for r in pal:
            if r in forb or (r in I.GLOW and c not in I.GLOW): continue
            d = dE(c, r)
            if best is None or d < best[0]: best = (d, r)
        if best is None: return None
        share = sum(g['share'][o] for o, v in g['cur'].items() if v == c)
        w = (0.25 + share ** 0.5) * (2.0 if g['side'] == 'S' else 1.0) * (4.0 if g['brand'] and c in VIOLET else 1.0)
        return best[0] * w, best[1]
    moves = []
    for it in range(5000):
        clashes = []
        for m in F.SCOPE:
            fs = [g for g in G.values() if g['side'] == 'F' and m in g['maps']]; ss = [g for g in G.values() if g['side'] == 'S' and m in g['maps']]
            S = set().union(*[cols(g) for g in ss])
            for g in fs:
                for c in sorted(cols(g) & S):
                    clashes.append((m, c, g, [s for s in ss if c in cols(s)]))
        if not clashes: break
        # cheapest single move that removes at least one clash
        cand = []
        for m, c, f, ss in clashes:
            o = option(f, c)
            if o: cand.append((o[0], id(f), f, c, o[1]))
            for s in ss:
                o = option(s, c)
                if o: cand.append((o[0] * (1 + 0.15 * (len(ss) - 1)), id(s), s, c, o[1]))
        if not cand: raise SystemExit(f'stuck: {[(m, c) for m, c, *_ in clashes[:10]]}')
        cost, _, g, c, r = min(cand, key=lambda x: (x[0], x[3], x[4]))
        for o, v in g['cur'].items():
            if v == c: g['cur'][o] = r
        moves.append(dict(group=g['tiles'][0] if g['side'] == 'F' else f"{g['tiles'][0]}+{len(g['tiles']) - 1}", side=g['side'], src=c, dst=r, cost=round(cost, 1)))
    tiles = {}
    for g in G.values():
        mp = {o: v for o, v in g['cur'].items() if o != v}
        if mp:
            for t in g['tiles']: tiles[t] = dict(sorted(mp.items()))
    # window walls follow their plain wall (wallpaper pixels only: those equal to the plain wall tile)
    win = {}
    for n in list(tiles):
        if n.startswith('i_wall_upper_') and '_win_' not in n:
            for e in BY:
                if e.startswith('i_wall_upper_win_') and e.replace('_win_', '_') == n: win[e] = n
    doc = dict(rule='Furniture never shares colour codes with the floor or walls (GAME_QUALITY_CHECKLIST, Oct 22 2026)',
               note='per-tile exact colour swaps, palette.hex only; ids unchanged. window_walls: wallpaper pixels (equal to the plain wall) follow the plain wall map.',
               tiles=dict(sorted(tiles.items())), window_walls=win, moves=moves)
    json.dump(doc, open(TABLE, 'w'), indent=1)
    return doc
if __name__ == '__main__' and sys.argv[1:] == ['solve']:
    d = solve(); print(len(d['moves']), 'moves,', len(d['tiles']), 'tiles')
    c = collections.Counter(m['side'] for m in d['moves']); print(c)
    for m in d['moves']: print(m)
