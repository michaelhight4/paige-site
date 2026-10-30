"""Gary's live-game flags (Oct 30 2026), one audit per flag. Used by tests/live_flags.test.mjs's twin and the town/route fixers.
F1 whole trees: every canopy (tree_top) sits over a trunk (tree_base) and every trunk has its canopy; a forest edge facing walkable
   ground never runs straight for more than EDGE_RUN trees (staggered border).
F2 no NPC on a cell under a canopy.   F3 no prop on a walkway (path/road ground) and every prop collides.
F4 no cave mouth beside a house: no building/door tile within 3 cells left/right or 2 above the mouth.
F5 no long flat forest corridor: a walkable lane between straight forest edges on both sides for more than CORRIDOR cells."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))['tiles']
NM = {t['id']: t['name'] for t in TS}; CAT = {t['id']: t.get('category', '') for t in TS}
TOP = re.compile(r'^(x_city_|gh_)?(tree|treed|snowpine)_top$'); BASE = re.compile(r'^(x_city_|gh_)?(tree|treed|snowpine)_base(_inner)?$')
WALKDECO = re.compile(r'^(stairs|cave_stairs|bridge_|arena_ring_|flowers?_|tall_grass|grass_tuft|path_|clover|petal|leaf_litter|shadow)')
PAVED = re.compile(r'^(path_|x_city_(asphalt|zebra|road)|road|x_city_pave|x_city_plaza|zebra)')
EDGE_RUN, CORRIDOR = 8, 12
MAPS = ['aurelith', 'revival_heights', 'sunmeadow_fields', 'route_cindervale', 'route_sunmeadow_mirefen', 'route_revival_sunmeadow', 'route_revival_saltmere']
def load(n): return json.load(open(os.path.join(ROOT, f'art/world/overworld/maps/{n}.json')))
def audit(m):
    L = m['layers']; G, D, O, C = L['ground'], L['decoration'], L['overlay'], L['collision']; H, W = len(C), len(C[0])
    nm = lambda v: NM.get(v, '')
    trunk = lambda x, y: 0 <= x < W and 0 <= y < H and bool(BASE.match(nm(D[y][x])))
    walk = lambda x, y: 0 <= x < W and 0 <= y < H and C[y][x] in (0, 4)
    SPOT = {(o['x'], o['y']) for o in m.get('interact_spots') or [] if 'x' in o}   # pocket eggs / inspectables stand where they are
    f = {k: [] for k in ('F1_half', 'F1_edge', 'F2', 'F3_walk', 'F3_nocol', 'F4', 'F5')}
    for y in range(H):
        for x in range(W):
            if TOP.match(nm(O[y][x])) and not trunk(x, y + 1) and y + 1 < H: f['F1_half'].append((x, y))
            if trunk(x, y) and y > 0 and not TOP.match(nm(O[y - 1][x])): f['F1_half'].append((x, y))
            d = D[y][x]
            if d and not BASE.match(nm(d)) and not WALKDECO.match(nm(d)) and CAT.get(d) not in ('building', 'door') and not nm(d).startswith('cave_'):
                if C[y][x] in (0, 4): f['F3_nocol'].append((x, y))
                elif PAVED.match(nm(G[y][x])) and any(walk(x + a, y) for a in (-1, 1)) and any(walk(x, y + b) for b in (-1, 1)): pass
            if d and C[y][x] not in (0, 2, 4) and (x, y) not in SPOT and not nm(d).startswith('ledge') and nm(G[y][x]).startswith('path_') and not BASE.match(nm(d)) and not WALKDECO.match(nm(d)) and CAT.get(d) not in ('building', 'door'):
                f['F3_walk'].append((x, y))
    # edges: a run of trunks in one row with walkable ground directly below (south edge) / above canopy, or one column (E/W edges)
    for y in range(H):
        for side in (1, -1):
            run = 0
            for x in range(W + 1):
                e = x < W and trunk(x, y) and walk(x, y + side) if side == 1 else x < W and trunk(x, y) and walk(x, y - 1)
                run = run + 1 if e else 0
                if run == EDGE_RUN + 1: f['F1_edge'].append((x - EDGE_RUN, y))
    for x in range(W):
        for side in (1, -1):
            run = 0
            for y in range(H + 1):
                e = y < H and trunk(x, y) and walk(x + side, y)
                run = run + 1 if e else 0
                if run == EDGE_RUN + 1: f['F1_edge'].append((x, y - EDGE_RUN))
    for n in m.get('npcs') or []:
        if TOP.match(nm(O[n['y']][n['x']])): f['F2'].append((n['x'], n['y']))
    for w in m.get('warps') or []:
        if 'cave' not in w.get('to', '') or w.get('reached_via'): continue
        for yy in range(w['y'] - 2, w['y'] + 2):
            for xx in range(w['x'] - 3, w['x'] + 4):
                if 0 <= xx < W and 0 <= yy < H and any(CAT.get(L[k][yy][xx]) in ('building', 'door') and not nm(L[k][yy][xx]).startswith('cave') for k in ('ground', 'decoration', 'overlay')):
                    f['F4'].append((w['x'], w['y'], xx, yy)); break
            else: continue
            break
    # corridors: a 1-3 wide lane whose both sides are trunks in straight lines
    for horiz in (True, False):
        A, B = (H, W) if horiz else (W, H)
        for a in range(A):
            for wdt in (1, 2, 3):
                run = 0
                for b in range(B + 1):
                    cell = (lambda b_, a_: (b_, a_)) if horiz else (lambda b_, a_: (a_, b_))
                    ok = b < B
                    if ok:
                        lo = cell(b, a - 1); hi = cell(b, a + wdt)
                        ok = trunk(*lo) and trunk(*hi) and all(walk(*cell(b, a + k)) for k in range(wdt))
                    run = run + 1 if ok else 0
                    if run == CORRIDOR + 1: f['F5'].append(cell(b - CORRIDOR, a))
    return {k: v for k, v in f.items()}
if __name__ == '__main__':
    for n in sys.argv[1:] or MAPS:
        r = audit(load(n)); print(n, {k: len(v) for k, v in r.items()}, {k: v[:4] for k, v in r.items() if v})
