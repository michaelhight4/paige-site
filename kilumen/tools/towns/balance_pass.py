"""Town density balance pass (GD, Oct 30 2026; Gary on Aurelith: "it feels crowded and empty"; cozy_map_lessons.md #2, #6, #7).
1. thin: lone flower tufts and lone lawn props (not street furniture beside a road) are lifted, as are props crowding a door
   front, a landmark's sides, a 3x3 with more than MAX3 props or a prop group bigger than a scene;
2. scenes: the lifted detail comes back as purposeful scenes of 3-7 pieces (a reason each: rest spot, garden corner, picnic,
   lamp-lit bench...) on open lawn, each with a 1-tile walkable margin, one per empty 7x7 block, sparsest windows first;
3. every 8x8 window ends inside the density band (tools/map_audit/density.py), with no blank 5x5 of lawn.
Never touches pockets, NPC/item/sign cells, doors or their approach; keeps every reachable cell reachable.
Usage: python3 tools/towns/balance_pass.py <map>   (run after the town builder, before tools/map_audit/fix_live_flags.py)."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'map_audit')); import layering_rules as LR, density as DN
NAME = sys.argv[1]; P = os.path.join(ROOT, f'art/world/overworld/maps/{NAME}.json')
ID = {v: k for k, v in DN.NM.items()}
m = json.load(open(P)); L = m['layers']; G, D, O, C = L['ground'], L['decoration'], L['overlay'], L['collision']; H, W = len(C), len(C[0])
m.setdefault('name', NAME)
before = LR.reach(m, LR.starts(m))
walk = lambda x, y: 0 <= x < W and 0 <= y < H and C[y][x] in (0, 4)
FEAT = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots') for o in m.get(k) or [] if 'x' in o}
PROT = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots') for o in m.get(k) or [] if 'x' in o}
for w in m.get('warps') or []:
    for a in (-1, 0, 1):
        for b in (0, 1, 2): PROT.add((w['x'] + a, w['y'] + b))
POCK = set()
for p in json.load(open(os.path.join(ROOT, 'data/pass2_caves.json')))['pockets']:
    if p['map'] != NAME: continue
    for (x0, y0, x1, y1) in p['floor']:
        for y in range(y0 - 1, y1 + 3):
            for x in range(x0 - 1, x1 + 2): POCK.add((x, y))
    for (x, y) in p['walk']: POCK.add((x, y))
PROT |= POCK
KEEP = ('stall', 'kiosk', 'push_boulder', 'garden_patch', 'mailbox', 'notice', 'street_sign', 'flag', 'cafe_table', 'bike_rack', 'crates')
CITY = NAME == 'aurelith'
SCENES = ([  # (reason, [(dx, dy, tile)]) - city kit
    ('lamp-lit bench', [(0, 0, 'x_city_lamp'), (1, 0, 'x_city_bench_h'), (2, 0, 'x_city_bin'), (0, 1, 'flowers_warm'), (1, 1, 'flowers_violet'), (2, 1, 'flowers_warm')]),
    ('planter corner', [(0, 0, 'x_city_planter'), (1, 0, 'flowers_violet'), (2, 0, 'flowers_warm'), (0, 1, 'flowers_warm'), (1, 1, 'bush')]),
    ('reading nook', [(0, 0, 'x_city_bench_v'), (1, 0, 'flowers_warm'), (0, 1, 'x_city_lamp'), (1, 1, 'flowers_violet'), (2, 1, 'bush')]),
    ('rock garden', [(0, 0, 'rock'), (1, 0, 'flowers_violet'), (1, 1, 'bush'), (2, 1, 'flowers_warm'), (0, 1, 'flowers_warm')]),
] if CITY else [  # village kit
    ('garden corner', [(0, 0, 'bush'), (1, 0, 'flowers_warm'), (2, 0, 'flowers_violet'), (0, 1, 'flowers_violet'), (1, 1, 'rock')]),
    ('woodpile', [(0, 0, 'tl_woodpile'), (1, 0, 'i_log_stool'), (2, 0, 'flowers_warm'), (0, 1, 'flowers_violet'), (1, 1, 'flowers_warm')]),
    ('lamp-lit bench', [(0, 0, 'lamp'), (1, 0, 'x_bench_0_0'), (2, 0, 'x_bench_0_1'), (1, 1, 'flowers_warm'), (2, 1, 'flowers_violet')]),
    ('barrel stack', [(0, 0, 'barrel'), (1, 0, 'barrel'), (0, 1, 'flowers_warm'), (1, 1, 'bush'), (2, 1, 'flowers_violet')]),
])
log = []
def K(): return DN.kinds(m)[0]
def lift(x, y, why): log.append(('lift', why, DN.NM.get(D[y][x]), x, y)); D[y][x] = 0; C[y][x] = 0
# 1. thin
k = K()
det = lambda x, y: 0 <= x < W and 0 <= y < H and k[y][x] in ('prop', 'flower', 'lm', 'field')
nearroad = lambda x, y: any(0 <= x + a < W and 0 <= y + b < H and k[y + b][x + a] == 'road' for a in (-1, 0, 1) for b in (-1, 0, 1))
kept = lambda x, y: (x, y) in (FEAT | POCK if k[y][x] == 'flower' else PROT) or DN.NM.get(D[y][x], '').replace('x_city_', '').startswith(KEEP) or (k[y][x] == 'prop' and nearroad(x, y))
for g in DN.groups(k, H, W):
    if len(g) < 3 and not any(k[y][x] in ('lm', 'field') for x, y in g):
        for (x, y) in g:
            if not kept(x, y): lift(x, y, 'speck')
r = DN.audit(m)
for (_, wx, wy, x, y) in r['B5']:
    if (x, y) not in FEAT: lift(x, y, 'breathing room')
for (x, y, n) in DN.audit(m)['B2']:
    k = K(); cells = [(x + i, y + j) for j in range(3) for i in range(3) if k[y + j][x + i] == 'prop' and (x + i, y + j) not in PROT]
    for c in cells[:max(0, n - DN.MAX3)]: lift(*c, 'crowded 3x3')
for (start, n) in DN.audit(m)['B4']:
    k = K(); x, y = start; seen = {start}; st = [start]; g = []
    while st:
        p = st.pop(); g.append(p)
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                q = (p[0] + a, p[1] + b)
                if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and k[q[1]][q[0]] == 'prop': seen.add(q); st.append(q)
    for c in sorted(g)[1::2]:
        if c not in PROT: lift(*c, 'scene too big')

def lawn(x, y): return 0 <= x < W and 0 <= y < H and (k[y][x] == 'open' and not D[y][x] or k[y][x] == 'flower') and not O[y][x] and (x, y) not in PROT
# 2a. parks and flower beds (Gary 12:27: "flower beds and parks instead of just open areas"). The roomiest lawns first;
#     a park = flower beds + trees + a path with a lamp-lit bench; a bed = a 5x2 two-colour bed. Both keep a 1-tile walkable ring.
TB, TT = ('x_city_tree_base', 'x_city_tree_top') if CITY else ('tree_base', 'tree_top')
BEN = [('x_city_bench_h',)] if CITY else [('x_bench_0_0',), ('x_bench_0_1',)]
LMP = 'x_city_lamp' if CITY else 'lamp'
def bed(w, h, x0=0, y0=0): return [(x0 + i, y0 + j, 'flowers_warm' if (i + j) % 2 else 'flowers_violet') for j in range(h) for i in range(w)]
PARK = ([(0, 1, TB), (5, 1, TB)] + bed(4, 2, 1, 0) + [(i, 2, '=path') for i in range(6)] +
        [(0, 3, LMP)] + [(1 + i, 3, b[0]) for i, b in enumerate(BEN)] + bed(3, 1, 3, 3))
BED = bed(5, 2)
def foot(sc): return [(dx, dy) for dx, dy, _ in sc] + [(dx, dy - 1) for dx, dy, t in sc if t == TB]
def fits2(x, y, sc):
    f = foot(sc); xs = [x + a for a, b in f]; ys = [y + b for a, b in f]
    return all(lawn(a, b) or loose(a, b) for b in range(min(ys) - 1, max(ys) + 2) for a in range(min(xs) - 1, max(xs) + 2))
def loose(x, y):   # a lone lawn prop a park may absorb (never street furniture by a road, stalls, or protected cells)
    return 0 <= x < W and 0 <= y < H and k[y][x] == 'prop' and (x, y) not in PROT and not O[y][x] and not nearroad(x, y) and not DN.NM.get(D[y][x], '').replace('x_city_', '').startswith(KEEP)
def put(x, y, reason, sc):
    f = foot(sc); xs = [x + a for a, b in f]; ys = [y + b for a, b in f]
    for b in range(min(ys) - 1, max(ys) + 2):
        for a in range(min(xs) - 1, max(xs) + 2):
            if loose(a, b): lift(a, b, 'absorbed into ' + reason)
    old = [(x + dx, y + dy, G[y + dy][x + dx], D[y + dy][x + dx], C[y + dy][x + dx], O[y + dy - 1][x + dx]) for dx, dy, _ in sc]
    for dx, dy, t in sc:
        X, Y = x + dx, y + dy
        if t == '=path': G[Y][X] = ID['path_%d' % ((X + Y) % 4)]; continue
        D[Y][X] = ID[t]; C[Y][X] = 0 if t.startswith('flowers') else 1
        if t == TB: O[Y - 1][X] = ID[TT]
    r2 = LR.reach(m, LR.starts(m))
    if all(not walk(*q) or q in r2 for q in before): log.append(('scene', reason, x, y)); return True
    for (X, Y, g, d, c, o), (dx, dy, t) in zip(old, sc):
        G[Y][X], D[Y][X], C[Y][X] = g, d, c
        if t == TB: O[Y - 1][X] = o
    return False
def roomy(x, y, r=5): return sum(k[b][a] == 'open' for b in range(max(0, y - r), min(H, y + r + 1)) for a in range(max(0, x - r), min(W, x + r + 1)))
placed = []
for reason, sc, need, gap in (('pocket park', PARK, 50, 12), ('flower bed', BED, 34, 7)):
    for _ in range(12):
        k = K()
        cand = sorted(((roomy(x + 3, y + 2), x, y) for y in range(1, H - 5) for x in range(1, W - 7)
                       if all(max(abs(x - a), abs(y - b)) >= gap for a, b in placed) and fits2(x, y, sc)), reverse=True)
        ok = False
        for sc_room, x, y in cand[:30]:
            if sc_room < need: break
            if put(x, y, reason, sc): placed.append((x, y)); ok = True; break
        if not ok: break
# plazas in front of key buildings stay open; their outer corners get planters (beds on the edge, not in the middle)
if CITY:
    k = K()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if DN.NM.get(G[y][x], '').startswith('x_city_plaza') and (x, y) not in PROT and not D[y][x]:
                n = [DN.NM.get(G[y + b][x + a], '').startswith('x_city_plaza') for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                if sum(n) == 2 and n[0] != n[1]:   # an outer corner
                    D[y][x] = ID['x_city_planter']; C[y][x] = 1
                    r2 = LR.reach(m, LR.starts(m))
                    if all(not walk(*q) or q in r2 for q in before) and not DN.audit(m)['B4']: log.append(('scene', 'plaza planter', x, y))
                    else: D[y][x] = 0; C[y][x] = 0
# 2. scenes on open lawn, sparsest blocks first
def fits(x, y, sc):
    xs = [x + dx for dx, dy, _ in sc]; ys = [y + dy for dx, dy, _ in sc]
    return all(lawn(a, b) for b in range(min(ys) - 1, max(ys) + 2) for a in range(min(xs) - 1, max(xs) + 2))
def place(x, y, reason, sc):
    for dx, dy, t in sc:
        D[y + dy][x + dx] = ID[t]; C[y + dy][x + dx] = 0 if t.startswith('flowers') else 1
    r2 = LR.reach(m, LR.starts(m))
    if all(not walk(*q) or q in r2 for q in before): log.append(('scene', reason, x, y)); return True
    for dx, dy, t in sc: D[y + dy][x + dx] = 0; C[y + dy][x + dx] = 0
    return False
n_sc = 0
for rnd in range(2):
    k = K()
    blocks = []
    for by in range(0, H, 7):
        for bx in range(0, W, 7):
            cells = [(x, y) for y in range(by, min(by + 7, H)) for x in range(bx, min(bx + 7, W))]
            o = sum(k[y][x] in ('open', 'prop', 'flower', 'lm') for x, y in cells)
            d = sum(k[y][x] in ('prop', 'flower', 'lm', 'field') for x, y in cells)
            if o >= 24 and not any(k[y][x] in ('prop', 'lm') for x, y in cells): blocks.append((d / o, bx, by))
    for _, bx, by in sorted(blocks):
        k = K(); done = False
        for i in range(len(SCENES)):
            reason, sc = SCENES[(n_sc + i) % len(SCENES)]
            for y in range(by, min(by + 7, H)):
                for x in range(bx, min(bx + 7, W)):
                    if fits(x, y, sc) and place(x, y, reason, sc): done = True; n_sc += 1; break
                if done: break
            if done: break
# 2b. windows over the band shed flowers from their thickest clumps (scenes and features stay)
SC = {(e[2] + dx, e[3] + dy) for e in log if e[0] == 'scene' for sc in [dict(SCENES + [('pocket park', PARK), ('flower bed', BED), ('plaza planter', [(0, 0, '')])])[e[1]]] for dx, dy, _ in sc}
def shed():
    for _ in range(60):
        hi = DN.audit(m)['B1_high']
        if not hi: break
        x0, y0, d = hi[0]; k = K()
        fl = [(x, y) for y in range(y0, y0 + 8) for x in range(x0, x0 + 8) if k[y][x] == 'flower' and (x, y) not in PROT and (x, y) not in SC]
        fl.sort(key=lambda q: -sum(k[q[1] + b][q[0] + a] == 'flower' for a in (-1, 0, 1) for b in (-1, 0, 1) if 0 <= q[0] + a < W and 0 <= q[1] + b < H))
        if not fl: break
        for q in fl[:3]: lift(*q, 'thick clump')

shed()
# 3. low windows / blank lawn 5x5 get a 3-cell two-colour flower patch still blank gets a 2-colour flower patch at its centre
bad = set()
for _ in range(40):
    a = DN.audit(m); b = a['B3'] or [(x + 2, y + 2) for x, y, _ in a['B1_low']]
    if not b: break
    k = K(); x, y = b[0]
    spot = [(i, j) for j in range(y - 1, y + 7) for i in range(x - 1, x + 7) if all(lawn(i + p, j + q) and k[j + q][i + p] == 'open' for p in (-1, 0, 1, 2) for q in (-1, 0, 1, 2))]
    if not spot: continue
    cx, cy = spot[len(spot) // 2]
    for (a, c, t) in ((0, 0, 'flowers_warm'), (1, 0, 'flowers_violet'), (0, 1, 'flowers_violet')):
        if lawn(cx + a, cy + c): D[cy + c][cx + a] = ID[t]
    k = K(); log.append(('patch', cx, cy))
shed()
after = LR.reach(m, LR.starts(m)); lost = [q for q in before if walk(*q) and q not in after]
assert not lost, lost[:8]
m['balance_pass'] = 'tools/towns/balance_pass.py (Oct 30 2026): lone scatter lifted, scenes of 3-7 with a walkable margin, density band per 8x8'
json.dump(m, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
from collections import Counter
print(NAME, Counter(e[0] + ':' + (e[1] if isinstance(e[1], str) else '') for e in log), DN.summary(DN.audit(m)))
