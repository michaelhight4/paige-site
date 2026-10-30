"""Aurelith, bring the city to life (GD, Oct 30 2026; cozy_map_lessons.md guides: grass 55-70%, a landmark per screen,
a pond and a flower field, decor in clusters, no long blank runs). The paved sidewalk lots (x_city_pave) become lawns; roads,
crossings, the fountain plaza and the stadium forecourt stay paved; every building door keeps a stone
approach. Old Platform (old aurelith_cave_e, mouth 62,6) now lives on route_cindervale. Doors and warps are unchanged.
Order: python3 tools/map_audit/cave_pockets.py aurelith, then this script (in place), then tools/map_audit/fix_live_flags.py aurelith."""
import json, os, re, sys
from collections import deque
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'map_audit')); import layering_rules as LR
P = os.path.join(ROOT, 'art/world/overworld/maps/aurelith.json')
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}; NM = {t['id']: t['name'] for t in TS['tiles']}
m = json.load(open(P)); L = m['layers']; C = L['collision']; G = L['ground']; D = L['decoration']; H, W = len(C), len(C[0])
assert not m.get('living_town'), 'already applied: re-run cave_pockets.py first'
m.setdefault('name', 'aurelith')
before = LR.reach(m, LR.starts(m))
vh = lambda x, y: (x * 7 + y * 13 + (x * y) % 5) % 4
WARPS = {(w['x'], w['y']) for w in m['warps']}
FEAT = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots') for o in m.get(k) or [] if 'x' in o}
pave = lambda x, y: NM.get(G[y][x], '').startswith('x_city_pave')
PROPS = ('x_city_lamp', 'x_city_bench', 'x_city_tree', 'x_city_hedge', 'bush', 'flowers')
# 1. door approaches: a stone step below each building door
APPROACH = set()
for (x, y) in WARPS:
    if 'cave' in next(w.get('to', '') for w in m['warps'] if (w['x'], w['y']) == (x, y)): continue
    for k in (1,):
        if 0 <= y + k < H and pave(x, y + k): APPROACH.add((x, y + k))
# 2. the sidewalk lots become lawn (under walkable cells and small street props only)
for y in range(H):
    for x in range(W):
        if not pave(x, y): continue
        if (x, y) in APPROACH: G[y][x] = ID[f'path_{vh(x, y)}']; continue
        if C[y][x] in (0, 4) or (D[y][x] and NM.get(D[y][x], '').startswith(PROPS)): G[y][x] = ID[f'grass_{vh(x, y)}']
for y in range(31, 40):                                # the market square becomes the market lawn (stalls stay)
    for x in range(47, 59):
        if NM.get(G[y][x], '').startswith('x_city_plaza') and (C[y][x] in (0, 4) or not D[y][x] or NM.get(D[y][x], '').startswith(PROPS)) and (x, y) not in APPROACH:
            G[y][x] = ID[f'grass_{vh(x, y)}']
for y in range(H):                                     # the side pocket floors were crossing stripes: lay stone flags instead
    for x in list(range(0, 12)) + list(range(77, W)):
        if NM.get(G[y][x], '').startswith('x_city_zebra'): G[y][x] = ID[f'path_{vh(x, y)}'] if C[y][x] in (0, 4) else G[y][x]
grassy = lambda x, y: NM.get(G[y][x], '').startswith('grass')
def ok(x, y): return 0 <= x < W and 0 <= y < H and C[y][x] == 0 and (x, y) not in WARPS and (x, y) not in FEAT and (x, y) not in APPROACH
def free(x, y): return ok(x, y) and not D[y][x] and grassy(x, y)
def prop(x, y, name): assert ok(x, y), (x, y, name); D[y][x] = ID[name]; C[y][x] = 1
def flowers(x, y, name=None): assert ok(x, y), (x, y); D[y][x] = ID[name or ('flowers_violet' if (x + y) % 2 else 'flowers_warm')]
def block(x0, y0, name, w, h):
    for r in range(h):
        for c in range(w): prop(x0 + c, y0 + r, f'{name}_{r}_{c}')
# 3. a 4x4 flower field on the west lawn and a pond lawn by the canal park (the canal already holds 14 water cells)
FL = ['flowers_violet', 'flowers_warm', 'flowers_violet', 'flowers_warm']
for y in range(21, 25):
    for x in range(13, 17):
        if free(x, y): flowers(x, y, FL[(x + y) % 4])
D[23][14] = ID['bush']; C[23][14] = 1
# 4. one landmark per screen: fixed picks first, then a statue on any open lawn of a screen still without one
xs = [x for y in range(H) for x in range(W) if C[y][x] in (0, 4)]; ys = [y for y in range(H) for x in range(W) if C[y][x] in (0, 4)]
bx0, by0, bx1, by1 = min(xs), min(ys), max(xs), max(ys)
def has_lm(sx, sy):
    return any(LR.LANDMARK.search(NM.get(L[k][y][x], '')) for k in ('decoration', 'overlay', 'ground')
               for y in range(sy, min(sy + 15, by1 + 1)) for x in range(sx, min(sx + 20, bx1 + 1)))
def roomy(x, y, w, h):                                 # the block and a 1-cell ring all open lawn: never blocks a lane
    return all(free(x + c, y + r) for r in range(-1, h + 1) for c in range(-1, w + 1))
placed = []
prop(82, 13, 'x_city_statue'); placed.append(('statue', 82, 13))   # Signal Loft pocket: the old signal-box statue
for sy in range(by0, by1 + 1, 15):
    for sx in range(bx0, bx1 + 1, 20):
        if sum(1 for y in range(sy, min(sy + 15, H)) for x in range(sx, min(sx + 20, W)) if C[y][x] in (0, 4)) < 30 or has_lm(sx, sy): continue
        spots = [(x, y) for y in range(sy + 1, min(sy + 14, H - 1)) for x in range(sx + 1, min(sx + 19, W - 1))]
        big = next(((x, y) for (x, y) in spots if roomy(x, y, 2, 2)), None)
        if big: block(*big, 'lm_big_tree', 2, 2); placed.append(('big_tree',) + big); continue
        one = next(((x, y) for (x, y) in spots if roomy(x, y, 1, 1)), None)
        if one: prop(*one, 'x_city_statue'); placed.append(('statue',) + one)
        else:                                          # tight screen: any open cell whose statue keeps every lane reachable
            for (x, y) in spots:
                if not (ok(x, y) and not D[y][x]) or any((x + a, y + b) in APPROACH or (x + a, y + b) in WARPS for a in (-1, 0, 1) for b in (-1, 0, 1)): continue
                if (C[y][x - 1] in (0, 4)) == (C[y][x + 1] in (0, 4)) != ((C[y - 1][x] in (0, 4)) == (C[y + 1][x] in (0, 4))): continue   # never plug a 1-wide gap
                if not re.search(r'pave|grass|path|plaza|brick', NM.get(G[y][x], '')): continue
                prop(x, y, 'x_city_statue'); r2 = LR.reach(m, LR.starts(m))
                if all(C[q][p] not in (0, 4) or (p, q) in r2 for (p, q) in before): placed.append(('statue*', x, y)); break
                D[y][x] = 0; C[y][x] = 0
            else: placed.append(('NONE', sx, sy))
# 5. break the long blank lawn runs with flower tufts (walkable)
for dx, dy in ((1, 0), (0, 1)):
    for y in range(H):
        for x in range(W):
            n = 0
            while free(x + n * dx, y + n * dy): n += 1
            if n > 6 and not free(x - dx, y - dy):
                for k in range(3, n - 1, 5): flowers(x + k * dx, y + k * dy)
# 6. strollers (lines: data/textbot_aurelith_strollers.json, Text Bot Oct 30 2026)
SPOTS = [('aurelith_stroller_lawn_w', 'strolls the west lawn by the flower field'), ('aurelith_stroller_flats', 'walks home past the flats'),
         ('aurelith_stroller_canal', 'watches the canal from the park'), ('aurelith_stroller_ring', 'jogs Ring Street'),
         ('aurelith_stroller_market', 'browses the market lawn'), ('aurelith_stroller_tower', 'sits under the clock tower')]
CELLS = [(12, 24), (20, 48), (60, 51), (56, 7), (60, 37), (28, 46)]
for (i, note), (x, y) in zip(SPOTS, CELLS):
    if not (C[y][x] == 0 and (x, y) not in WARPS | FEAT):
        x, y = next((a, b) for r in range(1, 4) for a in range(x - r, x + r + 1) for b in range(y - r, y + r + 1) if 0 <= a < W and 0 <= b < H and C[b][a] == 0 and (a, b) not in WARPS | FEAT)
    m['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': 'down', 'kind': 'villager', 'note': note,
                      'text_ref': f'data/textbot_aurelith_strollers.json maps.aurelith.{i}'}); FEAT.add((x, y))
after = LR.reach(m, LR.starts(m))
lost = {p for p in before if C[p[1]][p[0]] in (0, 4) and p not in after}
assert not lost, sorted(lost)[:10]
m['living_town'] = 'tools/towns/build_aurelith_living.py (Oct 30 2026): lawns on the sidewalk lots, stone door approaches, flower field, clock tower, oaks and statues per screen, flower tufts, strollers (Old Platform moved to route_cindervale)'
json.dump(m, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print('ok', placed)
