"""One-shot solver for tools/furniture_depth.py: reads the PRE-depth art (tileset.json sheets of the last run, i.e. after the
furniture-colour swaps) and the built interior maps, and writes tools/furniture_depth_table.json:
  groups: piece / wall / recess entries with resolved colour look-ups (op -> {src: dst}) per piece.
Colour rules: palette.hex only; ramp step candidates in OKLab order; never INTO a night-glow colour; never a floor/wall code drawn
(identity or any scheme) on a map where the piece appears; recolourable home-wall shades stay inside their recolour family.
Run: python3 tools/furniture_depth_solve.py   (only on pre-depth art: it refuses if the table already exists unless --force)."""
import os, sys, re, json, collections
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import furniture_depth as D, furniture_colours as FC, interiors_merge as I
from scipy import ndimage

TS = json.load(open(os.path.join(OUT, 'tileset.json'))); BYN = {e['name']: e for e in TS['tiles']}; BYID = {e['id']: e for e in TS['tiles']}
IT = json.load(open(os.path.join(OUT, 'interiors_new', 'tileset_interiors.json'))); INAMES = {e['name'] for e in IT['tiles']}
_SH = {}
def px(n):
    e = BYN[n]; p = os.path.join(OUT, e['sheet'])
    if p not in _SH: _SH[p] = np.array(Image.open(p).convert('RGBA'))
    return _SH[p][e['row'] * 64:e['row'] * 64 + 64, e['col'] * 64:e['col'] * 64 + 64].copy()
def hexes(a, mask=None):
    op = a[..., 3] == 255
    if mask is not None: op &= mask
    return {'%02x%02x%02x' % tuple(p[:3]) for p in a[op]}

DOC = FC.recolour_doc(); MS = FC.map_schemes(DOC)
MAPS = list(FC.SCOPE) + [m for m in I.RETIRED]
use = collections.defaultdict(set); maptiles = {}
for m in MAPS:
    p = os.path.join(OUT, 'maps', m + '.json')
    if not os.path.exists(p): continue
    L = json.load(open(p))['layers']; ids = {v for k in ('ground', 'decoration', 'overlay') for r in L[k] for v in r if v}
    maptiles[m] = {BYID[i]['name'] for i in ids}
    for n in maptiles[m]: use[n].add(m)

# ---------------- groups ----------------
def kind(n):
    e = BYN[n]
    if D.RECESS.match(n): return 'recess'
    if D.WALL_UP.match(n) or D.WALL_FACE.match(n): return 'wall'
    if n.startswith('x_') or D.SKIP.search(n): return None
    return 'piece' if FC.cls(e) == 'furniture' else None
cands = set(INAMES) | {n for ns in maptiles.values() for n in ns} | {n for n in BYN if re.match(r'window_(dawn|day|dusk|night)_[tb]$', n)}   # window phase states share the day geometry
groups = {}
for n in sorted(cands):
    if n not in BYN: continue
    k = kind(n)
    if not k: continue
    g, r, c = D.group_of(n)
    if k == 'recess' and n.startswith('window_'): g, r, c = n, 0, 0
    if k != 'piece': g, r, c = n, 0, 0
    G = groups.setdefault(g, dict(kind=k, src='i' if n in INAMES else 'core', cells=[]))
    G['cells'].append([n, r, c])
def comp(G):
    R = 1 + max(r for _, r, _ in G['cells']); C = 1 + max(c for _, _, c in G['cells'])
    a = np.zeros((R * 64, C * 64, 4), np.uint8)
    for n, r, c in G['cells']: a[r * 64:r * 64 + 64, c * 64:c * 64 + 64] = px(n)
    return a
def gmaps(G): return set().union(*[use.get(n, set()) for n, _, _ in G['cells']])

# ---------------- recess masks (stored as pixel lists) ----------------
def bluish(a): a = a.astype(int); return (a[..., 2] > a[..., 0] + 15) & (a[..., 3] == 255)
def recess_px(n):
    if n.startswith('window_'):
        base = re.sub(r'window_\w+?_([tb])$', r'window_day_\1', n); a = px(base).astype(int)
        G = bluish(a) & ~((a[..., 0] > 200) & (a[..., 1] < 170))      # glass (curtains excluded)
    elif n.startswith('i_wall_upper_win_'):
        a = px(n); plain = px(n.replace('_win_', '_')); G = bluish(a) & np.any(a != plain, -1)
    else:   # staff door: the leaf (dominant grey of the door's centre) recessed in its frame
        a = np.vstack([px('i_staffdoor_locked_0_0'), px('i_staffdoor_locked_1_0')])
        G = np.zeros(a.shape[:2], bool); G[20:128, 12:52] = True
    Gf = ndimage.binary_closing(G, structure=np.ones((5, 5)), iterations=1) | G
    Gf = ndimage.binary_fill_holes(Gf)
    P = np.pad(Gf, 2, mode='edge')                      # beyond the tile edge = continues (no line on the _t/_b seam)
    H, W = Gf.shape; outside_up = ~P[1:H + 1, 2:W + 2] | ~P[0:H, 2:W + 2]; outside_left = ~P[2:H + 2, 1:W + 1] | ~P[2:H + 2, 0:W]
    m = Gf & (outside_up | outside_left) & (a[..., 3] == 255)
    if n.startswith('i_staffdoor'):
        m = np.zeros_like(G); m[20:22, 12:52] = True; m[20:128, 12:14] = True
        r = int(n[-3]); m = m[r * 64:r * 64 + 64]
    ys, xs = np.where(m); return [[int(x), int(y)] for x, y in zip(xs, ys)]

# ---------------- forbidden codes ----------------
def surf_codes(m, art):
    out = set()
    for n in maptiles[m]:
        c = FC.cls(BYN[n])
        if c in ('floor', 'wall'):
            a = art.get(n); a = px(n) if a is None else a
            h = hexes(a); out |= h
            for s in MS.get(m, ['identity']):
                mp = DOC['schemes'][s]['map']; out |= {mp.get('#' + x, '#' + x)[1:] for x in h}
    return out
def furn_codes(m):
    out = set()
    for n in maptiles[m]:
        if FC.cls(BYN[n]) == 'furniture': out |= hexes(px(n))
    return out

FAM = {c: f for f, cs in I.FAMILIES.items() for c in cs}
FAMS = {f: sorted(cs, key=D._lum, reverse=True) for f, cs in I.FAMILIES.items()}
def recolourable_wall(n): return bool(re.match(r'i_wall_(upper|face|top)_', n))
def pick(c, op, forbid, fam_only=None):
    """fam_only: 'in' -> inside c's recolour family; 'out' -> never a family colour; None -> any palette colour."""
    if D.LAB.get(c) is None or D.LAB[c][0] < D.OUTLINE_L: return None
    if fam_only == 'in' and c in FAM:
        r = FAMS[FAM[c]]; i = r.index(c); j = {'up': i - 1, 'dn': i + 1, 'dn2': i + 2, 'ol': len(r) - 1}[op]
        for jj in ([j, j - 1] if op == 'dn2' else [j]):
            if 0 <= jj < len(r) and r[jj] != c and r[jj] not in forbid and not (r[jj] in D.GLOW and c not in D.GLOW): return r[jj]
        return None
    for d in D.ranked(c, op):
        if d in forbid: continue
        if fam_only == 'out' and d in FAM: continue
        return d
    return None

DECO = {}
for m in maptiles:
    L = json.load(open(os.path.join(OUT, 'maps', m + '.json')))['layers']; DECO[m] = [[BYID[v]['name'] if v else None for v in r] for r in L['decoration']]
def row_end(g, G):
    """False when, on every map, the cell right of the piece's right column holds another furniture piece (a row continues):
    only stand-alone pieces and row ends get the side panel."""
    C = max(c for _, _, c in G['cells']); names = {n for n, _, _ in G['cells'] if any(c == C for nn, _, c in G['cells'] if nn == n)}
    right = [n for n, r, c in G['cells'] if c == C]; seen = False
    for m, Dd in DECO.items():
        for y, row in enumerate(Dd):
            for x, t in enumerate(row):
                if t in right:
                    seen = True; nb = row[x + 1] if x + 1 < len(row) else None
                    if not nb or nb in right or FC.cls(BYN[nb]) != 'furniture' or D.SKIP.search(nb): return True
    return not seen
def masks_for(name, G, a):
    if G['kind'] == 'piece': return D.piece_masks(name, a)
    if G['kind'] == 'wall': return D.wall_masks(name, a)
    if G['kind'] == 'recess':
        m = np.zeros(a.shape[:2], bool)
        for x, y in G['px']: m[y, x] = True
        return dict(dn=m & (a[..., 3] == 255))

def solve():
    table = dict(rule='tools/furniture_depth.py (interior depth pass, Oct 22 2026)', strip_baked_shadow=True, groups={})
    art = {}
    # 1) walls + recess first: avoid the ORIGINAL furniture codes of every map they are drawn on
    for g, G in sorted(groups.items()):
        if G['kind'] == 'piece': continue
        if G['kind'] == 'recess': G['px'] = recess_px(g)
        forbid = set().union(*[furn_codes(m) for m in gmaps(G)]) if gmaps(G) else set()
        a = comp(G); ms = masks_for(g, G, a); lut = {}
        for op, mk in ms.items():
            for c in sorted(hexes(a, mk)):
                fam = ('in' if c in FAM else 'out') if (G['kind'] == 'wall' and recolourable_wall(g)) else None
                if G['kind'] == 'recess' and g.startswith('i_wall_upper_win_'): fam = 'out' if c not in FAM else 'in'
                d = pick(c, op, forbid, fam)
                if d: lut.setdefault(op, {})[c] = d
        e = dict(kind=G['kind'], src=G['src'], cells=G['cells'], lut=lut)
        if G['kind'] == 'recess': e['px'] = G['px']
        table['groups'][g] = e
    # window walls: wallpaper pixels must follow their plain wall exactly (recolour mask = "identical to the plain wall")
    for g, e in table['groups'].items():
        if g.startswith('i_wall_upper_win_') and g.replace('_win_', '_') in table['groups']:
            e['kind'] = ['wall', 'recess']; e['wall_lut'] = table['groups'][g.replace('_win_', '_')]['lut']
    for g, e in table['groups'].items():
        if e['kind'] in ('wall', ['wall', 'recess']):
            for n, r, c in e['cells']: art[n] = D.apply_piece(e, n, px(n))
    # 2) furniture pieces: avoid every final floor/wall code (identity + all schemes) on every map they are drawn on
    SC = {m: surf_codes(m, art) for m in maptiles}
    for g, G in sorted(groups.items()):
        if G['kind'] != 'piece': continue
        forbid = set().union(*[SC[m] for m in gmaps(G)]) if gmaps(G) else set()
        panel = row_end(g, G)
        a = comp(G); ms = D.piece_masks(g, a, panel); lut = {}
        for op, mk in ms.items():
            region = hexes(a, mk)
            for c in sorted(region):
                d = pick(c, op, forbid | (region - {c}) if op in ('up', 'dn', 'dn2') else forbid)   # never merge two shades of a face: dithers/texture survive
                if d: lut.setdefault(op, {})[c] = d
        table['groups'][g] = dict(kind='piece', src=G['src'], cells=G['cells'], lut=lut, strip_baked_shadow=True, panel=panel, maps=sorted(gmaps(G)))
    return table

if __name__ == '__main__':
    if os.path.exists(D.TABLE) and '--force' not in sys.argv: sys.exit('table exists: solve runs once on pre-depth art (use --force on restored art)')
    t = solve(); json.dump(t, open(D.TABLE, 'w'), indent=1)
    print(len(t['groups']), 'groups', collections.Counter(str(e['kind']) for e in t['groups'].values()))
