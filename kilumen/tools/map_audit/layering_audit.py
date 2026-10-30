#!/usr/bin/env python3
"""24-point layering audit (design/map_layering_guide.md §5, scored 0-2 per item) for every overworld map.
Heuristic, data-only (collision + npcs/items/spots/warps/gates); Coder Oct 30 2026. 20-24 dense, 14-19 tighten, <14 redesign.
Usage: python3 tools/map_audit/layering_audit.py [--map NAME] [--json] [--detail]"""
import argparse, glob, json, os, re
from collections import deque
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
PASS = {0, 4, 7, 10}; STRONG = re.compile(r'crystal_plus|vigor_seed|charm|reel_|_fine|prime')
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

def audit(j):
    col = j['layers']['collision']; H, W = len(col), len(col[0]); c = lambda x, y: col[y][x] if 0 <= x < W and 0 <= y < H else 1
    walk = {(x, y) for y in range(H) for x in range(W) if c(x, y) in PASS or c(x, y) in (3, 11)}
    if not walk: return None
    xs = [p[0] for p in walk]; ys = [p[1] for p in walk]; x0, x1, y0, y1 = max(min(xs) - 1, 0), min(max(xs) + 1, W - 1), max(min(ys) - 1, 0), min(max(ys) + 1, H - 1)
    box = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    items = j.get('items') or []; npcs = j.get('npcs') or []; spots = j.get('interact_spots') or []; warps = j.get('warps') or []
    gates = {(cl['x'], cl['y']) for g in j.get('story_gates') or [] for cl in g.get('cells', [])}
    codes = {c(x, y) for (x, y) in box}
    def reach(start, ledges=True):
        npc = {(n['x'], n['y']) for n in npcs}; ok = lambda x, y: (c(x, y) in PASS or (x, y) in gates) and (x, y) not in npc
        seen = {start}; q = deque([start])
        while q:
            x, y = q.popleft()
            for dx, dy in N4:
                nx, ny = x + dx, y + dy
                if ledges and dy == 1 and c(nx, ny) == 2: ny += 1
                if ok(nx, ny) and (nx, ny) not in seen: seen.add((nx, ny)); q.append((nx, ny))
        return seen
    s = {}
    share = len(walk) / len(box); s['1_walk_share'] = 2 if .45 <= share <= .6 else 1 if .35 <= share <= .7 else 0
    filler = sum(1 for (x, y) in box if (x, y) not in walk and not any((x + dx, y + dy) in walk for dx, dy in N4)) / len(box)
    s['2_dead_filler'] = 2 if filler < .1 else 1 if filler < .2 else 0
    # loop: a blocker island fully surrounded by walk inside the box (a ring path) or any ledge shortcut
    blk = {p for p in box if p not in walk}; seen = set(); island = False
    for p in blk:
        if p in seen: continue
        comp = {p}; q = deque([p]); edge = False
        while q:
            x, y = q.popleft()
            if x in (x0, x1) or y in (y0, y1): edge = True
            for dx, dy in N4:
                n = (x + dx, y + dy)
                if n in blk and n not in comp: comp.add(n); q.append(n)
        seen |= comp; island = island or not edge
    s['3_loop'] = 2 if 2 in codes else 2 if island else 0
    s['4_height_bands'] = 2 if codes & {2, 9} else 1 if (gates or codes & {5, 6, 8}) else 0
    reward = {(o['x'], o['y']) for o in items + npcs + spots + warps} | {tuple(o['stand']) for o in spots if o.get('stand')} | {(o['x'], o['y']) for o in j.get('signs') or [] if 'x' in o}
    dead = [(x, y) for (x, y) in walk if c(x, y) in PASS and sum((x + dx, y + dy) in walk for dx, dy in N4) == 1]
    ok = [d for d in dead if any(abs(d[0] - a) + abs(d[1] - b) <= 2 for (a, b) in reward)]
    s['5_dead_ends_rewarded'] = 2 if not dead or len(ok) == len(dead) else 1 if len(ok) * 2 >= len(dead) else 0
    start = (warps[0]['tx'], warps[0]['ty']) if warps and warps[0].get('to') == j.get('name') else next(iter(sorted(walk)))
    for w in warps:  # arrive next to a door if possible
        for dx, dy in N4:
            if c(w['x'] + dx, w['y'] + dy) == 0: start = (w['x'] + dx, w['y'] + dy); break
        break
    R = reach(start); Rflat = reach(start, ledges=False)
    hidden = [i for i in items if i.get('hidden')]
    ledge_only = [i for i in items if (i['x'], i['y']) in R and (i['x'], i['y']) not in Rflat] + [i for i in items if (i['x'], i['y']) in gates]
    s['6_hidden_walkway'] = 2 if hidden and (ledge_only or 2 in codes) else 1 if hidden else 0
    s['7_show_then_reach'] = 2 if ledge_only or any(STRONG.search(i.get('item', '')) and i.get('hidden') for i in items) or (gates and items) else 1 if items else 0
    s['8_revisit_gate'] = 2 if gates or codes & {5, 6, 8} else 1 if codes & {3, 11} else 0
    s['9_strong_pocket'] = 2 if any(STRONG.search(i.get('item', '')) for i in items) else 1 if items else 0
    dests = {w.get('via', {}).get('map') if w.get('via') else w.get('to') for w in warps} | {e.get('to') or e.get('map') for e in j.get('exits') or []}
    s['10_vertical_connector'] = 2 if len(dests - {None}) >= 3 else 1 if len(dests - {None}) == 2 else 0
    pw = {p for p in walk if c(*p) in PASS} - {(n['x'], n['y']) for n in npcs}
    back_ok = all(start in reach(p) for p in list(R)[:: max(1, len(R) // 40)])
    s['11_no_gaps_softlocks'] = 2 if pw <= R and back_ok else 1 if back_ok else 0
    s['12_text_route_free'] = 0 if re.search(r'\broute\b', j.get('title', '') or '', re.I) else 2
    return {'map': j.get('name'), 'score': sum(s.values()), 'walk_share': round(share, 2), 'filler': round(filler, 2), 'parts': s}

def run():
    out = []
    for f in sorted(glob.glob(os.path.join(MAPS, '*.json'))):
        try: j = json.load(open(f))
        except Exception: continue
        if 'layers' not in j or 'collision' not in j['layers']: continue
        j.setdefault('name', os.path.basename(f)[:-5]); a = audit(j)
        if a: out.append(a)
    return sorted(out, key=lambda a: (a['score'], a['map']))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--map'); ap.add_argument('--json', action='store_true'); ap.add_argument('--detail', action='store_true'); o = ap.parse_args()
    r = [a for a in run() if not o.map or a['map'] == o.map]
    if o.json: print(json.dumps(r, indent=1)); raise SystemExit
    for i, a in enumerate(r, 1):
        print(f"{i:>3} {a['map']:34} {a['score']:>2}/24  walk {a['walk_share']:.2f} filler {a['filler']:.2f}" + ('  ' + ' '.join(f"{k.split('_')[0]}:{v}" for k, v in a['parts'].items()) if o.detail else ''))
