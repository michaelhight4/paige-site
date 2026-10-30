#!/usr/bin/env python3
"""Hard layering rules from the Pokemon map study (design/pokemon_layering_study.md, Oct 30 2026; Gary: no empty space).
Data-only checks on every overworld map:
  R1 empty  : largest empty walkable square <= EMPTY_N (no item/npc/sign/warp/spot/ledge/water inside); largest solid
              filler square <= FILL_N (walls are 2-6 thick in the refs). 1 penalty point per square size over the limit.
  R2 pockets: sealed pockets (walkable groups of >= POCKET_MIN squares the no-skill main path can't reach) >= K_ROUTE on
              route-sized maps (>= ROUTE_CELLS cells), >= K_SMALL on other outdoor maps. Pocket size POCKET_MIN..POCKET_MAX.
  R3 caves  : every cave map has >= 2 exits and >= 1 exit lands in a pocket of the destination map (not on its main path).
  R4 sealed : every pocket is sealed (no plain-walk link to the main path) AND entered some way: a warp/cave exit inside it,
              a field-skill square (water/ice/cut/rock/boulder) on its edge, or a ledge dropping into it. Orphans fail.
  R5 offpath: >= 30% of trainers and >= 50% of items sit off the main path (pocket, ledge shelf or skill area).
              Sealed nooks (GD Oct 30 2026): a sealed off-path group smaller than POCKET_MIN that holds an item, trainer or
              spot and has an entry still counts as a pocket for R2 (a one-tile shelf with a seed is a pocket, not filler).
  R7 lively : towns (maps with `living_town`): >= LIVE_NPC NPCs and >= LIVE_DECO decorated squares per 100 walkable
              squares, <= LIVE_PAVED of the walkable ground paved (asphalt/plaza/road), and >= 1 non-static NPC (strollers).
  cozy (report only, quality/dev_notes/cozy_map_lessons.md, Oct 30 2026; grid-fit wins): grass share of walkable ground
              (target 55-70%), longest run of identical undecorated walkable tiles (<= 6), decor clusters (8-connected props,
              3+ tiles) per 20x15 screen, share of screens with a landmark, largest pond and flower field (cells, colours),
              and the share of all maps that are caves (< 15%). In r['cozy'] for living towns; never fails a map.
Collision codes as in layering_audit.py: PASS {0,4,7,10}; 2 = south ledge; skill/gated {3,5,6,8,11}; 1 = block.
Usage: python3 tools/map_audit/layering_rules.py [--map NAME] [--json] [--fails]"""
import argparse, glob, json, os, re
from collections import deque
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
PASS = {0, 4, 7, 10}; SKILL = {3, 5, 6, 8, 11}; LEDGE = 2
LIVE_NPC, LIVE_DECO, LIVE_PAVED = 1.0, 8.0, 0.5
EMPTY_N, FILL_N = 6, 8; POCKET_MIN, POCKET_MAX = 6, 60; K_ROUTE, K_SMALL = 3, 1; ROUTE_CELLS = 1500
CAVE = re.compile(r'^(?!lab_)(?:.*(?:cave|grotto|_b\d|entrance|caldera|icefall|riverbed|tunnel|mine))')
INDOOR = re.compile(r'_int$|_int_|^heal_|^home_|^house_|^shop_|^lab_|_room_|_f\d$|_\d?f_|^office|^station|^club|_roof$|backroom|lodge')
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

def load(name):
    try: return json.load(open(os.path.join(MAPS, name + '.json')))
    except Exception: return None

def starts(j):
    col = j['layers']['collision']; H, W = len(col), len(col[0]); out = set()
    for e in j.get('exits') or []:
        ed = e.get('edge'); s0, s1 = e.get('start', 0), e.get('end', e.get('start', 0))
        for k in range(s0, s1 + 1):
            out.add({'west': (0, k), 'east': (W - 1, k), 'north': (k, 0), 'south': (k, H - 1)}.get(ed, (0, 0)))
    for w in j.get('warps') or []:
        if w.get('reached_via'): continue
        for dx, dy in ((0, 0),) + N4:
            x, y = w['x'] + dx, w['y'] + dy
            if 0 <= x < W and 0 <= y < H and col[y][x] in PASS: out.add((x, y)); break
    return {p for p in out if col[p[1]][p[0]] in PASS}

def reach(j, seeds, skills=False):
    col = j['layers']['collision']; H, W = len(col), len(col[0])  # NPCs don't block: beaten trainers / talkers aren't walls
    ok = lambda x, y: 0 <= x < W and 0 <= y < H and (col[y][x] in PASS or (skills and col[y][x] in SKILL))
    seen = set(p for p in seeds if ok(*p)); q = deque(seen)
    while q:
        x, y = q.popleft()
        for dx, dy in N4:
            nx, ny = x + dx, y + dy
            if dy == 1 and 0 <= ny < H and 0 <= nx < W and col[ny][nx] == LEDGE: ny += 1
            if ok(nx, ny) and (nx, ny) not in seen: seen.add((nx, ny)); q.append((nx, ny))
    return seen

def biggest_square(H, W, cell):
    dp = [[0] * (W + 1) for _ in range(H + 1)]; best = 0
    for y in range(H):
        for x in range(W):
            if cell(x, y): dp[y + 1][x + 1] = 1 + min(dp[y][x + 1], dp[y + 1][x], dp[y][x]); best = max(best, dp[y + 1][x + 1])
    return best

def check(j, cache):
    L = j['layers']; col = L['collision']; H, W = len(col), len(col[0]); deco = L.get('decoration') or [[0] * W for _ in range(H)]
    feat = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots', 'warps') for o in j.get(k) or [] if 'x' in o}
    walk = {(x, y) for y in range(H) for x in range(W) if col[y][x] in PASS}
    if not walk: return None
    main = reach(j, starts(j) or {min(walk)}); r = {'map': j['name'], 'cells': W * H}
    # R1 empty / filler squares (filler only counted inside the walkable bounding box: padding outside is camera margin)
    xs = [p[0] for p in walk]; ys = [p[1] for p in walk]; bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
    pad = j.get('padding') or {}
    if pad.get('old_size'):  # padded maps: exit corridors run through the camera margin, so clip the box to the old map
        bx0, by0 = max(bx0, pad.get('dx', 0)), max(by0, pad.get('dy', 0)); bx1, by1 = min(bx1, pad.get('dx', 0) + pad['old_size'][0] - 1), min(by1, pad.get('dy', 0) + pad['old_size'][1] - 1)
    r['empty_sq'] = biggest_square(H, W, lambda x, y: col[y][x] in PASS and (x, y) not in feat and not deco[y][x])
    r['filler_sq'] = biggest_square(H, W, lambda x, y: bx0 <= x <= bx1 and by0 <= y <= by1 and col[y][x] == 1)
    r['R1_pen'] = max(0, r['empty_sq'] - EMPTY_N) + max(0, r['filler_sq'] - FILL_N)
    # R2/R4 pockets = walkable components off the main path
    rest = walk - main; pockets = []
    while rest:
        s = rest.pop(); comp = {s}; q = deque([s])
        while q:
            x, y = q.popleft()
            for dx, dy in N4:
                n = (x + dx, y + dy)
                if n in rest: rest.discard(n); comp.add(n); q.append(n)
        content = sum((o['x'], o['y']) in comp for k in ('items', 'npcs', 'interact_spots') for o in j.get(k) or [] if 'x' in o)
        if len(comp) < POCKET_MIN and not content: continue
        edge = {(x + dx, y + dy) for (x, y) in comp for dx, dy in N4} - comp
        via_warp = any((w['x'], w['y']) in comp or any((w['x'] + dx, w['y'] + dy) in comp for dx, dy in N4) for w in j.get('warps') or [])
        via_skill = any(0 <= x < W and 0 <= y < H and col[y][x] in SKILL for (x, y) in edge)
        via_ledge = any(0 <= y - 1 and (x, y - 1) in edge and col[y - 1][x] == LEDGE for (x, y) in comp)
        leak = bool(edge & main)  # should be impossible; kept as an explicit seal test
        pockets.append({'size': len(comp), 'entry': 'warp' if via_warp else 'skill' if via_skill else 'ledge' if via_ledge else 'NONE',
                        'sealed': not leak, 'items': sum((i['x'], i['y']) in comp for i in j.get('items') or []),
                        'trainers': sum((n['x'], n['y']) in comp for n in j.get('npcs') or [] if 'team' in n), 'cells': sorted(comp)[:1],
                        'nook': len(comp) < POCKET_MIN})
    good = [p for p in pockets if p['entry'] != 'NONE' and p['sealed'] and (p['nook'] or POCKET_MIN <= p['size'] <= POCKET_MAX)]
    outdoor = not INDOOR.search(j['name']) and not CAVE.search(j['name'])
    need = (K_ROUTE if W * H >= ROUTE_CELLS else K_SMALL) if outdoor else 0
    r['pockets'] = len(good); r['pockets_need'] = need; r['pocket_sizes'] = sorted(p['size'] for p in pockets)
    r['orphan_pockets'] = sum(p['entry'] == 'NONE' for p in pockets); r['R2_ok'] = len(good) >= need; r['R4_ok'] = not (outdoor or CAVE.search(j['name'])) or (r['orphan_pockets'] == 0 and all(p['sealed'] for p in pockets))
    # R5 off-path content (a ledge-only shelf counts: reachable but not walkable back = not in no-ledge reach)
    flat = set()
    if starts(j):
        col2 = [[(1 if v == LEDGE else v) for v in row] for row in col]; jj = dict(j); jj['layers'] = dict(L, collision=col2); flat = reach(jj, starts(j))
    tr = [n for n in j.get('npcs') or [] if 'team' in n]; it = j.get('items') or []
    off = lambda o: (o['x'], o['y']) not in main or bool(flat and (o['x'], o['y']) not in flat) or bool(o.get('hidden'))
    r['trainers_off'] = f"{sum(map(off, tr))}/{len(tr)}"; r['items_off'] = f"{sum(map(off, it))}/{len(it)}"
    r['R5_ok'] = not outdoor or ((not tr or sum(map(off, tr)) >= .3 * len(tr)) and (not it or sum(map(off, it)) >= .5 * len(it)))
    # R3 cave exits
    if CAVE.search(j['name']):
        ex = []
        for w in j.get('warps') or []:
            d = w.get('to'); dj = cache.get(d) if d else None
            if dj is None and d: dj = cache[d] = load(d)
            if not dj or 'layers' not in dj or CAVE.search(d): continue
            dj.setdefault('name', d); dm = cache.get(('main', d)) or reach(dj, starts(dj)); cache[('main', d)] = dm
            tx, ty = w.get('tx', -1), w.get('ty', -1)
            land = {(tx + dx, ty + dy) for dx, dy in ((0, 0),) + N4}
            ex.append('plain' if land & dm else 'pocket')
        r['cave_exits'] = f"{ex.count('plain')} plain / {ex.count('pocket')} pocket"; r['R3_ok'] = len(ex) >= 2 and 'pocket' in ex
    # R7 liveliness (towns only)
    if j.get('living_town'):
        names = cache.get('_ts') or {t['id']: t['name'] for t in json.load(open(os.path.join(ROOT, 'art', 'world', 'overworld', 'tileset.json')))['tiles']}
        cache['_ts'] = names; per = 100.0 / len(walk); npcs = j.get('npcs') or []
        deco_n = sum(1 for y in range(by0, by1 + 1) for x in range(bx0, bx1 + 1) if deco[y][x] and 'tree_base' != names.get(deco[y][x]))
        paved = sum(1 for (x, y) in walk if re.search(r'asphalt|plaza|road', names.get(L['ground'][y][x], '')))
        r['live'] = {'npc_per100': round(len(npcs) * per, 2), 'deco_per100': round(deco_n * per, 2), 'paved': round(paved / len(walk), 2),
                     'strollers': sum(1 for n in npcs if not n.get('static') and not n.get('team') and not n.get('stall_shop'))}
        lv = r['live']; r['R7_ok'] = lv['npc_per100'] >= LIVE_NPC and lv['deco_per100'] >= LIVE_DECO and lv['paved'] <= LIVE_PAVED and lv['strollers'] >= 1
    if j.get('living_town'): r['cozy'] = cozy(j, cache, walk, deco, (min(xs), min(ys), max(xs), max(ys)))  # whole town, not the padded old box
    r['pass'] = r['R1_pen'] == 0 and r['R2_ok'] and r['R4_ok'] and r['R5_ok'] and r.get('R3_ok', True) and r.get('R7_ok', True)
    return r

LANDMARK = re.compile(r'statue|gazebo|clock|fountain|obelisk|windmill|ruin|waterfall|big_tree|cafe|well|tower|monument|lighthouse|dock')
def comps(cells, diag=False):
    cells = set(cells); out = []
    nb = N4 + (((1, 1), (1, -1), (-1, 1), (-1, -1)) if diag else ())
    while cells:
        s0 = cells.pop(); c = {s0}; q = deque([s0])
        while q:
            x, y = q.popleft()
            for dx, dy in nb:
                n = (x + dx, y + dy)
                if n in cells: cells.discard(n); c.add(n); q.append(n)
        out.append(c)
    return out

def cozy(j, cache, walk, deco, box):
    names = cache.get('_ts') or {t['id']: t['name'] for t in json.load(open(os.path.join(ROOT, 'art', 'world', 'overworld', 'tileset.json')))['tiles']}
    cache['_ts'] = names; L = j['layers']; G = L['ground']; col = L['collision']; bx0, by0, bx1, by1 = box
    nm = lambda i: names.get(i, '') if i else ''
    feat = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots', 'warps') for o in j.get(k) or [] if 'x' in o}
    grass = sum(1 for (x, y) in walk if nm(G[y][x]).startswith('grass'))
    plain = lambda x, y: (x, y) in walk and not deco[y][x] and (x, y) not in feat
    PAVED = re.compile(r'asphalt|plaza|road')
    run = run_off = 0
    for y in range(by0, by1 + 1):
        for x in range(bx0, bx1 + 1):
            for dx, dy in ((1, 0), (0, 1)):
                if not plain(x, y) or plain(x - dx, y - dy) and G[y - dy][x - dx] == G[y][x]: continue
                n = 0
                while plain(x + n * dx, y + n * dy) and G[y + n * dy][x + n * dx] == G[y][x]: n += 1
                run = max(run, n)
                if not PAVED.search(nm(G[y][x])): run_off = max(run_off, n)
    props = {(x, y) for y in range(by0, by1 + 1) for x in range(bx0, bx1 + 1)
             if deco[y][x] and not re.search(r'tree_base|tree_top|^cave_|^rock_wall|cliff', nm(deco[y][x]))}
    cl = [c for c in comps(props, diag=True) if len(c) >= 3]
    screens = [(sx, sy) for sy in range(by0, by1 + 1, 15) for sx in range(bx0, bx1 + 1, 20)
               if sum(1 for (x, y) in walk if sx <= x < sx + 20 and sy <= y < sy + 15) >= 30]  # skip all-forest corner screens
    lm = {(sx, sy) for (sx, sy) in screens if any(LANDMARK.search(nm(L[k][y][x])) for k in ('decoration', 'overlay', 'ground')
          for y in range(sy, min(sy + 15, by1 + 1)) for x in range(sx, min(sx + 20, bx1 + 1)))}
    water = comps({(x, y) for y in range(len(col)) for x in range(len(col[0])) if col[y][x] == 3 or nm(G[y][x]).startswith('water')})
    flw = comps({(x, y) for y in range(len(col)) for x in range(len(col[0])) if nm(deco[y][x]).startswith('flowers')}, diag=True)
    fbig = max(flw, key=len, default=set())
    if 'cave_share' not in cache:
        fs = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(MAPS, '*.json'))]; cache['cave_share'] = round(sum(bool(CAVE.search(f)) for f in fs) / len(fs), 3)
    return {'grass_pct': round(grass / len(walk), 2), 'max_plain_run': run, 'max_plain_run_offroad': run_off, 'clusters_per_screen': round(len(cl) / len(screens), 1),
            'landmark_screens': f"{len(lm)}/{len(screens)}", 'pond_cells': max(map(len, water), default=0),
            'flower_field_cells': len(fbig), 'flower_colours': len({nm(deco[y][x]) for (x, y) in fbig}), 'cave_share_all_maps': cache['cave_share']}

def run(only=None):
    cache, out = {}, []
    for f in sorted(glob.glob(os.path.join(MAPS, '*.json'))):
        j = load(os.path.basename(f)[:-5])
        if not j or 'layers' not in j or 'collision' not in j['layers']: continue
        j.setdefault('name', os.path.basename(f)[:-5])
        if only and j['name'] != only: continue
        a = check(j, cache)
        if a: out.append(a)
    return out

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--map'); ap.add_argument('--json', action='store_true'); ap.add_argument('--fails', action='store_true'); o = ap.parse_args()
    r = [a for a in run(o.map) if not o.fails or not a['pass']]
    if o.json: print(json.dumps(r, indent=1)); raise SystemExit
    for a in r:
        print(f"{'PASS' if a['pass'] else 'FAIL'} {a['map']:30} empty {a['empty_sq']:>2}/{EMPTY_N} fill {a['filler_sq']:>2}/{FILL_N} pen {a['R1_pen']:>2} "
              f"pockets {a['pockets']}/{a['pockets_need']} orphans {a['orphan_pockets']} tr_off {a['trainers_off']:>5} it_off {a['items_off']:>5}" + (f"  cave {a['cave_exits']}{'' if a['R3_ok'] else ' FAIL'}" if 'cave_exits' in a else ''))
    print(f"{sum(a['pass'] for a in r)}/{len(r)} pass")
