"""Building footprint ground (Gary, Oct 30 2026 3:58 PM CT: "why do these have square tops instead of conforming to the
actual shape of the building"). Cause: city/town builders laid a light-grey paving rectangle (x_city_pave_*) the size of a
building's whole footprint as its GROUND layer; the building art itself is transparent round its silhouette, so the grey
rectangle showed wherever the art is not opaque (stadium oval corners, museum roof edges, ...).
Fix, per outdoor map: every building cell (category building / landmark, decoration or overlay layer) whose art is not fully
opaque gets the ground of the nearest non-building cell that is grass, path or plaza (the forecourt it really belongs to),
else grass. Collision follows the grid-fit rule: a building cell blocks only when its art holds > 4% opaque pixels
(alpha >= 200) in that square; door / warp cells (code 4) and other special codes are never touched.
Usage: python3 tools/towns/footprint_ground.py [--check] [map ...]   (default: every outdoor map)"""
import json, os, sys, glob, re
from collections import deque
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OW = os.path.join(ROOT, 'art', 'world', 'overworld')
TS = {t['id']: t for t in json.load(open(os.path.join(OW, 'tileset.json')))['tiles']}
OK_GROUND = re.compile(r'^(grass|path|tall_grass|x_city_plaza|x_city_road|x_city_asphalt|x_city_zebra)')   # grass, or a path-like forecourt / street
SLIVER = 0.04
_img, _cov = {}, {}
def coverage(tid):
    """(opaque fraction, fully opaque?) of a tile's own art square."""
    if tid in _cov: return _cov[tid]
    t = TS[tid]; f = os.path.join(OW, t['sheet'])
    if f not in _img: _img[f] = Image.open(f).convert('RGBA')
    a = _img[f].crop((t['col'] * 64, t['row'] * 64, t['col'] * 64 + 64, t['row'] * 64 + 64)).getchannel('A')
    h = a.histogram(); op = sum(h[200:]) / 4096
    _cov[tid] = (op, h[255] == 4096); return _cov[tid]
def is_bld(tid): return bool(tid) and TS.get(tid, {}).get('category') in ('building', 'landmark')
def outdoor(m): return any(TS.get(g, {}).get('name', '').startswith('grass') for row in m['layers']['ground'] for g in row)
DIMS = {}
for _t in TS.values():
    _m = re.match(r'(.*)_(\d+)_(\d+)$', _t['name'])
    if _m and _t['category'] in ('building', 'landmark'):
        b, r, c = _m.group(1), int(_m.group(2)), int(_m.group(3)); h, w = DIMS.get(b, (0, 0)); DIMS[b] = (max(h, r + 1), max(w, c + 1))
def footprint(m):
    """{(x, y): asset} for every cell of every placed multi-cell building's full rectangle, including the cells the
    builder left empty because the art is fully transparent there (those are what showed as bare grey squares)."""
    L = m['layers']; H, W = len(L['ground']), len(L['ground'][0]); fp = {}
    for k in ('decoration', 'overlay'):
        for y in range(H):
            for x in range(W):
                t = L[k][y][x]
                if not is_bld(t): continue
                mm = re.match(r'(.*)_(\d+)_(\d+)$', TS[t]['name'])
                if not mm: fp[(x, y)] = TS[t]['name']; continue
                b, r, c = mm.group(1), int(mm.group(2)), int(mm.group(3)); h, w = DIMS[b]
                for yy in range(y - r, y - r + h):
                    for xx in range(x - c, x - c + w):
                        if 0 <= xx < W and 0 <= yy < H: fp.setdefault((xx, yy), b)
    return fp
def problems(m):
    """Footprint cells whose art is not fully opaque but whose ground is not grass / path / plaza / street."""
    L = m['layers']; G = L['ground']; out = []
    for (x, y), b in sorted(footprint(m).items(), key=lambda kv: (kv[0][1], kv[0][0])):
        ts = [L[k][y][x] for k in ('decoration', 'overlay') if is_bld(L[k][y][x])]
        if ts and all(coverage(t)[1] for t in ts): continue
        if not OK_GROUND.match(TS.get(G[y][x], {}).get('name', '')): out.append((x, y, b, TS.get(G[y][x], {}).get('name')))
    return out
def fix(m):
    L = m['layers']; G, D, O, C = L['ground'], L['decoration'], L['overlay'], L['collision']; H, W = len(G), len(G[0])
    FP = footprint(m); bld = lambda x, y: (x, y) in FP
    nm = lambda g: TS.get(g, {}).get('name', '')
    grass = next((g for row in G for g in row if nm(g).startswith('grass')), None)
    ng = nc = 0
    for x, y, *_ in problems(m):
        seen = {(x, y)}; q = deque([(x, y)]); pick = None
        while q and pick is None:
            cx, cy = q.popleft()
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    if not bld(nx, ny) and OK_GROUND.match(nm(G[ny][nx])) and not nm(G[ny][nx]).startswith('tall_grass'): pick = G[ny][nx]; break
                    q.append((nx, ny))
        G[y][x] = pick or grass; ng += 1
    for y in range(H):
        for x in range(W):
            ts = [L[k][y][x] for k in ('decoration', 'overlay') if is_bld(L[k][y][x])]
            if (x, y) in FP and not ts and not D[y][x] and not O[y][x] and C[y][x] == 1: C[y][x] = 0; nc += 1; continue   # empty art square
            if not ts or C[y][x] not in (0, 1): continue
            want = 1 if any(coverage(t)[0] > SLIVER for t in ts if t == D[y][x]) or (not is_bld(D[y][x]) and D[y][x]) else 0
            if O[y][x] and not is_bld(D[y][x]) and not D[y][x]: want = 0   # overlay-only roof row: drawn above the player
            if C[y][x] != want: C[y][x] = want; nc += 1
    return ng, nc
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; check = '--check' in sys.argv
    files = [os.path.join(OW, 'maps', a + '.json') for a in args] or sorted(glob.glob(os.path.join(OW, 'maps', '*.json')))
    bad = 0
    for f in files:
        m = json.load(open(f))
        if 'layers' not in m or not outdoor(m): continue
        p = problems(m)
        if not p: continue
        name = os.path.basename(f)[:-5]
        kinds = sorted({k for _, _, k, _ in p})
        if check: print(name, len(p), kinds); bad += len(p); continue
        ng, nc = fix(m); json.dump(m, open(f, 'w'), indent=1); print(name, 'ground', ng, 'collision', nc, kinds)
    if check: print(bad, 'cells'); sys.exit(1 if bad else 0)
