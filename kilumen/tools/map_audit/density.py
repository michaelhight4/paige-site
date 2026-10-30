"""Density balance audit (GD, Oct 30 2026; Gary: "crowded and empty"; cozy_map_lessons.md #2 and #6).
detail = small decoration a player reads as scenery: props (collide) + flower/tuft patches. Trees, buildings, doors, ledges,
cave mouths, fences/hedges/rails (linear borders) are not detail.
B1 window band: every 8x8 window (step 4) with >= MINOPEN off-road open cells has detail/(off-road open) within [LO, HI]
   (the low bound only where a free 4x4 of lawn exists; narrow lanes between houses stay plain).
   A flower field (>= FIELD joined flower cells) counts as a feature, not detail; roads and plazas do not count.
B2 crowding: no 3x3 holds more than MAX3 props.
B3 blank: no BLANK x BLANK square of off-road walkable ground without any detail.
B4 scenes: no 8-connected prop group bigger than SCENE_MAX (scenes are 3-7 props; a straight one-tile row is a hedge line).
B6 scatter: at most SCATTER of detail cells sit in specks of 1-2 (8-connected) instead of a 3+ scene; street furniture beside a road is exempt.
B5 breathing room: the cell in front of each door and its two diagonals, and every landmark's 4 sides, hold no prop.
Usage: python3 tools/map_audit/density.py [map ...]"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))['tiles']
NM = {t['id']: t['name'] for t in TS}; CAT = {t['id']: t.get('category', '') for t in TS}
LO, HI, MAX3, BLANK, SCENE_MAX, FIELD, MINOPEN, SCATTER = 0.04, 0.30, 5, 5, 7, 9, 24, 0.15
MAPS = ['aurelith', 'revival_heights', 'sunmeadow_fields']
TREE = re.compile(r'^(x_city_|gh_)?(tree|treed|snowpine)_(top|base)|^lm_big_tree')
LINE = re.compile(r'(fence|hedge|rail|wall|ledge|cave_|stairs|bridge|arena_ring|water|sea_wall|cliff)')
FLOWER = re.compile(r'^(flowers_|x_reeds|grass_tuft|clover|petal)')
# roads: paved ground and dirt trails; 'tall' = encounter grass (neither lawn nor detail)
PAVED = re.compile(r'^(path|x_city_(asphalt|zebra|road|pave|plaza)|road|zebra|sand>path|path>)')
FURN = re.compile(r'(lamp|sign|mailbox|notice)')   # street furniture: lamps light a way, signs/mailboxes mark a door
STALL = re.compile(r'(stall_|kiosk|tram_stop)')
LANDMARK = re.compile(r'(statue|fountain|lm_|clock|windmill|well|monument|obelisk|tower)')
def load(n):
    m = json.load(open(os.path.join(ROOT, f'art/world/overworld/maps/{n}.json'))); m.setdefault('name', n); return m
def kinds(m):
    L = m['layers']; G, D, C = L['ground'], L['decoration'], L['collision']; H, W = len(C), len(C[0])
    nm = lambda v: NM.get(v, '')
    def k(x, y):
        d = D[y][x]; n = nm(d)
        if d and (CAT.get(d) in ('building', 'door') or TREE.match(n) or STALL.search(n)): return 'solid'   # market stalls/kiosks are small buildings
        if d and LINE.search(n): return 'line'
        if d and FLOWER.match(n): return 'flower'
        if d and C[y][x] not in (0, 4): return 'lm' if LANDMARK.search(n) else 'prop'
        if 'water' in nm(G[y][x]) or C[y][x] == 3: return 'water'
        if C[y][x] in (0, 4):
            if PAVED.match(nm(G[y][x])) or nm(G[y][x]).startswith('trail'): return 'road'
            return 'tall' if nm(L['overlay'][y][x]).startswith('tall_grass') else 'open'   # encounter grass is its own feature
        return 'solid'
    K = [[k(x, y) for x in range(W)] for y in range(H)]
    for p in json.load(open(os.path.join(ROOT, 'data/pass2_caves.json')))['pockets']:   # cave pocket floors are dressed by cave_pockets.py
        if p['map'] != m.get('name'): continue
        for (x0, y0, x1, y1) in p['floor']:
            for y in range(max(0, y0), min(H, y1 + 1)):
                for x in range(max(0, x0), min(W, x1 + 1)): K[y][x] = 'pocket'
    seen = set()                                       # a flower field (>= FIELD connected flower cells) is a feature, not scatter
    for y in range(H):
        for x in range(W):
            if K[y][x] != 'flower' or (x, y) in seen: continue
            st = [(x, y)]; seen.add((x, y)); g = []
            while st:
                p = st.pop(); g.append(p)
                for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (p[0] + a, p[1] + b)
                    if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and K[q[1]][q[0]] == 'flower': seen.add(q); st.append(q)
            if len(g) >= FIELD:
                for (a, b) in g: K[b][a] = 'field'
    for g in groups(K, H, W, ('prop',)):                # a straight row of 4+ props (bush hedge, bollards) is a boundary line
        if len(g) >= 4 and (len({y for _, y in g}) == 1 or len({x for x, _ in g}) == 1):
            for (x, y) in g: K[y][x] = 'line'
    return K, H, W
def groups(K, H, W, cls=('prop', 'flower', 'lm', 'field')):
    seen = set(); out = []
    for y in range(H):
        for x in range(W):
            if K[y][x] not in cls or (x, y) in seen: continue
            st = [(x, y)]; seen.add((x, y)); g = []
            while st:
                p = st.pop(); g.append(p)
                for a in (-1, 0, 1):
                    for b in (-1, 0, 1):
                        q = (p[0] + a, p[1] + b)
                        if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and K[q[1]][q[0]] in cls: seen.add(q); st.append(q)
            out.append(g)
    return out


def audit(m):
    K, H, W = kinds(m); L = m['layers']
    det = lambda x, y: K[y][x] in ('prop', 'flower', 'lm')
    opn = lambda x, y: K[y][x] in ('prop', 'flower', 'lm', 'open')
    r = {'B1_low': [], 'B1_high': [], 'B2': [], 'B3': [], 'B4': [], 'B5': []}; dens = []
    for y in range(0, H - 7, 4):
        for x in range(0, W - 7, 4):
            o = sum(opn(x + i, y + j) for i in range(8) for j in range(8))
            if o < MINOPEN: continue
            d = sum(det(x + i, y + j) for i in range(8) for j in range(8)) / o; dens.append(d)
            roomy = any(all(K[y + j + b][x + i + a] == 'open' for a in range(4) for b in range(4)) for i in range(5) for j in range(5))
            if d < LO and roomy: r['B1_low'].append((x, y, round(d, 3)))
            if d > HI: r['B1_high'].append((x, y, round(d, 3)))
    for y in range(H - 2):
        for x in range(W - 2):
            n = sum(K[y + j][x + i] == 'prop' for i in range(3) for j in range(3))
            if n > MAX3: r['B2'].append((x, y, n))
    for y in range(H - BLANK + 1):
        for x in range(W - BLANK + 1):
            if all(K[y + j][x + i] == 'open' for i in range(BLANK) for j in range(BLANK)): r['B3'].append((x, y))
    seen = set()
    for y in range(H):
        for x in range(W):
            if K[y][x] != 'prop' or (x, y) in seen: continue
            st = [(x, y)]; seen.add((x, y)); g = []
            while st:
                p = st.pop(); g.append(p)
                for a in (-1, 0, 1):
                    for b in (-1, 0, 1):
                        q = (p[0] + a, p[1] + b)
                        if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and K[q[1]][q[0]] == 'prop': seen.add(q); st.append(q)
            hedge = len({y for _, y in g}) == 1 or len({x for x, _ in g}) == 1   # a straight row is a hedge/fence line, not a heap
            if len(g) > SCENE_MAX and not hedge: r['B4'].append((min(g), len(g)))
    for w in m.get('warps') or []:
        if 'cave' in w.get('to', '') or w.get('pocket'): continue
        for (a, b) in ((0, 1), (-1, 1), (1, 1)):
            x, y = w['x'] + a, w['y'] + b
            if 0 <= x < W and 0 <= y < H and K[y][x] == 'prop': r['B5'].append(('door', w['x'], w['y'], x, y))
    for y in range(H):
        for x in range(W):
            if K[y][x] == 'lm':
                for (a, b) in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                    X, Y = x + a, y + b
                    if 0 <= X < W and 0 <= Y < H and K[Y][X] == 'prop' and not FURN.search(NM.get(m['layers']['decoration'][Y][X], '')): r['B5'].append(('lm', x, y, X, Y))
    road = lambda x, y: any(0 <= x + a < W and 0 <= y + b < H and K[y + b][x + a] == 'road' for a in (-1, 0, 1) for b in (-1, 0, 1))
    alone = tot = 0
    for g in groups(K, H, W):
        if all(road(x, y) for x, y in g) or all(FURN.search(NM.get(m['layers']['decoration'][y][x], '')) for x, y in g): continue
        tot += len(g)
        if len(g) < 3: alone += len(g)
    r['B6'] = [('alone', alone, tot)] if tot and alone / tot > SCATTER else []
    r['scatter'] = round(alone / tot, 2) if tot else 0
    s = sorted(dens); r['stats'] = dict(windows=len(s), min=round(s[0], 3) if s else 0, median=round(s[len(s) // 2], 3) if s else 0, max=round(s[-1], 3) if s else 0)
    return r
def summary(r): return {k: (len(v) if isinstance(v, list) else v) for k, v in r.items()}
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--json' in sys.argv: print(json.dumps({n: summary(audit(load(n))) for n in args or MAPS})); sys.exit()
    for n in args or MAPS:
        r = audit(load(n))
        if '--json' in sys.argv: continue
        print(n, summary(r), {k: v[:5] for k, v in r.items() if isinstance(v, list) and v})
