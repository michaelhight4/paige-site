#!/usr/bin/env python3
"""Furnish the 8 Revival Tech Heal Centre lobbies (heal_*.json, not heal_centre_int).

The rooms already had a counter, polisher, sofa, rug and posters drawn, but 0 inspectable props
(text_pending.interact_spots) and nowhere reserved for people. This script, idempotently:
  1. adds a few real clinic-lobby pieces where they fit: a visitor PC on the back wall, a small side
     table beside the waiting sofa, a waiting bench facing the counter, and a corner plant;
  2. writes text_pending.interact_spots (8-10 per room) for the inspectable pieces, each with a
     reachable stand tile and facing, text_ref left pending for Text Bot;
  3. writes text_pending.people_spots (4-6 walkable tiles) for Coder to place NPCs on.
Every placement keeps the door, arrival, counter talk tile and all floor tiles reachable.
Run: python3 tools/furniture_perspective/furnish_heal.py [--check]
"""
import json, os, re, sys
from collections import deque
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld')
MAPS = ['heal_aurelith', 'heal_brookhollow', 'heal_cindervale', 'heal_fernwick',
        'heal_frostspire', 'heal_lanternport', 'heal_revival', 'heal_saltmere']
SUF = {'aurelith': 'aurelith', 'brookhollow': 'brook', 'cindervale': 'cinder', 'fernwick': 'fern',
       'frostspire': 'brook', 'lanternport': 'lantern', 'revival': 'revival', 'saltmere': 'salt'}
T = {t['id']: t for f in ('tileset.json', 'tileset_ix2.json') for t in json.load(open(os.path.join(OW, f)))['tiles']}
BYNAME = {t['name']: i for i, t in T.items()}
INSPECT = [  # base name regex -> (spot id, kind)
    (r'i_counter_rt', 'counter', 'counter'), (r'i_crystal_polisher', 'polisher', 'machine'),
    (r'i_company_terminal', 'terminal', 'pc'), (r'i_pc$', 'visitor_pc', 'pc'),
    (r'i_newsletter_rack', 'newsletters', 'rack'), (r'i_suggestion_box', 'suggestions', 'box'),
    (r'i_rt_poster_(care|safety|join)', None, 'poster'), (r'i_sofa_', 'sofa', 'seat'), (r'i_bench', 'bench', 'seat'),
    (r'i_table_small_', 'side_table', 'table'), (r'i_plant_', None, 'plant'), (r'i_(radio|anchor|ship_wheel|net|fishing_rods|lantern_stand|crystal_crate|locker|pillar_basalt)', None, 'deco'),
]

def base(n): return re.sub(r'_\d_\d$', '', n)

def grid(d):
    W, H = d['width'], d['height']; col = d['layers']['collision']; dec = d['layers']['decoration']
    return W, H, col, dec

def walk(d, x, y):
    W, H, col, dec = grid(d)
    return 0 <= x < W and 0 <= y < H and col[y][x] in (0, None, 4)

def reach(d, start):
    seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x+dx, y+dy)
            if n not in seen and walk(d, *n): seen.add(n); q.append(n)
    return seen

def counter_cells(d):
    W, H, col, dec = grid(d)
    return [(x, y) for y in range(H) for x in range(W) if dec[y][x] and T[dec[y][x]]['name'].startswith('i_counter_rt')]

def protected(d):
    arr = tuple(d['entered_from'][0]['arrival']); p = {arr}
    for w in d['warps']: p |= {(w['x'], w['y']), (w['x'], w['y']-1)}
    for w in d.get('locked_warps', []): p.add(tuple(w['approach']))
    cc = counter_cells(d)
    for x, y in cc: p |= {(x, y+1), (x, y+2)}   # talk row + queue row in front of the counter
    dx = d['warps'][0]['x']
    for y in range(d['height']): p.add((dx, y))  # keep the door-to-counter aisle clear
    return p, arr

def try_place(d, cells, ids, prot, arr):
    W, H, col, dec = grid(d)
    for (x, y) in cells:
        if not (0 <= x < W and 0 <= y < H) or (x, y) in prot or dec[y][x] or col[y][x] not in (0, None): return False
        for ax in (x-1, x, x+1):   # keep a 1-tile gap from other furniture sideways/below (real walkways)
            for ay in (y, y+1):
                if (ax, ay) not in cells and 0 <= ax < W and 0 <= ay < H and dec[ay][ax] and T[dec[ay][ax]]['category'] == 'furniture' and ay > 2: return False
    before = reach(d, arr)
    for (x, y), i in zip(cells, ids): col[y][x] = 1; dec[y][x] = i
    after = reach(d, arr)
    if len(after) != len(before) - len(cells):
        for (x, y) in cells: col[y][x] = 0; dec[y][x] = None
        return False
    return True

def place(d, name_cells, prot, arr, prefer):
    ids = [BYNAME[n] for n, _ in name_cells]
    for (x0, y0) in prefer:
        cells = [(x0+dx, y0+dy) for _, (dx, dy) in name_cells]
        if try_place(d, cells, ids, prot, arr): return (x0, y0)
    return None

def furnish(m):
    p = os.path.join(OW, 'maps', m + '.json'); d = json.load(open(p))
    W, H, col, dec = grid(d); suf = SUF[m.split('_', 1)[1]]
    prot, arr = protected(d); added = []
    have = {base(T[c]['name']) for r in dec for c in r if c}
    top = min(y for y in range(H) for x in range(W) if walk(d, x, y))   # first floor row (against back wall)
    rows = range(top, H-1)
    if 'i_pc' not in have:
        r = place(d, [('i_pc', (0, 0))], prot, arr, [(x, top) for x in list(range(1, W-1))[::-1]])
        r and added.append(('i_pc', r))
    if not any(h.startswith('i_table_small_') for h in have):
        sofa = [(x, y) for y in range(H) for x in range(W) if dec[y][x] and T[dec[y][x]]['name'].startswith('i_sofa_')]
        if sofa:
            xs = [x for x, _ in sofa]; sy = sofa[0][1]
            r = place(d, [(f'i_table_small_{suf}', (0, 0))], prot, arr, [(max(xs)+1, sy), (min(xs)-1, sy), (min(xs), sy-1), (min(xs), sy+1)])
            r and added.append((f'i_table_small_{suf}', r))
    if 'i_bench' not in have:
        r = place(d, [('i_bench_0_0', (0, 0)), ('i_bench_0_1', (1, 0))], prot, arr,
                  [(x, y) for y in list(rows)[::-1][1:] for x in range(W-3, 0, -1)])
        r and added.append(('i_bench', r))
    plants = sum(1 for h in have if h.startswith('i_plant_'))
    if plants < 2:
        pl = 'i_plant_' + {'cinder': 'succulent', 'fern': 'mushroom', 'lantern': 'coral'}.get(suf, 'flower')
        r = pl not in have and place(d, [(pl, (0, 0))], prot, arr, [(1, top), (W-2, top), (1, H-2), (W-2, H-2)])   # idempotent
        r and added.append((pl, r))
    # interact spots
    pieces = {}
    for y in range(H):
        for x in range(W):
            if dec[y][x]:
                n = T[dec[y][x]]['name']; pieces.setdefault((base(n), ), []).append((x, y, n))
    reachable = reach(d, arr); spots = []; used_ids = set()
    for (b,), cells in sorted(pieces.items(), key=lambda kv: (min(c[1] for c in kv[1]), min(c[0] for c in kv[1]))):
        rule = next((r for r in INSPECT if re.match(r[0], b)), None)
        if not rule: continue
        sid = rule[1] or b.replace('i_rt_', '').replace('i_', '')
        if sid in used_ids: continue
        best = None
        for (x, y, n) in sorted(cells, key=lambda c: (-c[1], c[0])):
            for sx, sy, face in ((x, y+1, 'up'), (x-1, y, 'right'), (x+1, y, 'left')):
                if (sx, sy) in reachable and not (dec[sy][sx] and T[dec[sy][sx]]['category'] == 'furniture'):
                    if rule[1] == 'counter' and face != 'up': continue
                    best = best or (x, y, n, [sx, sy], face)
            if rule[2] == 'poster' and not best and y + 1 < H:   # wall poster: read from the floor tile below the wall
                for k in range(1, 3):
                    if (x, y+k) in reachable: best = (x, y, n, [x, y+k], 'up'); break
        if not best: continue
        x, y, n, stand, face = best; used_ids.add(sid)
        spots.append({'id': f'{m}_{sid}', 'kind': rule[2], 'x': x, 'y': y, 'stand': stand, 'face': face, 'tile': n,
                      'text_ref': f'overworld_lines.json maps.{m}.{m}_{sid}', 'note': 'inspectable lobby prop, furnish_heal.py'})
        if sid == 'terminal': spots[-1]['opens'] = 'company_terminal'   # real menu first, then the flavour line
        if sid == 'counter': spots[-1]['reach_over'] = True               # staff behind the counter answer first (heal / talk)
    spots = spots[:10]
    # people spots: walkable, not protected, not a stand tile, not next to the door; spread across the room
    stands = {tuple(s['stand']) for s in spots}; cc = counter_cells(d)
    cands = [c for c in sorted(reachable) if c not in prot and c not in stands and col[c[1]][c[0]] in (0, None)
             and c[1] > max(y for _, y in cc) + 1 and c[1] < H-1]
    ppl = []
    for c in sorted(cands, key=lambda c: (c[1], c[0])):
        if all(abs(c[0]-q[0]) + abs(c[1]-q[1]) >= 3 for q in ppl): ppl.append(c)
        if len(ppl) == 6: break
    tp = d.setdefault('text_pending', {})
    keep = [s for s in tp.get('interact_spots', []) if s.get('kind') == 'trigger']   # e.g. lap_nap_seat: not ours, keep
    tp['interact_spots'] = spots + keep
    tp['people_spots'] = [{'x': x, 'y': y, 'note': 'walkable, keeps aisles clear; for Coder NPC placement'} for x, y in ppl]
    return d, p, added, spots, ppl

if __name__ == '__main__':
    check = '--check' in sys.argv; bad = 0
    for m in MAPS:
        d, p, added, spots, ppl = furnish(m)
        print(f'{m}: added {added}; {len(spots)} interact spots; {len(ppl)} people spots {[(s["x"], s["y"]) for s in d["text_pending"]["people_spots"]]}')
        if not (8 <= len(spots) <= 10 and 4 <= len(ppl) <= 6): bad += 1; print('  !! out of target')
        if not check: open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
    sys.exit(1 if bad and check else 0)
