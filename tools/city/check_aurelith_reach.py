#!/usr/bin/env python3
"""BFS reachability for Aurelith city v1: every door/warp, every exit cell, every NPC/sign (talk square) and lift spot,
on the city and each interior. Walk = collision 0 (also 2? no) and not an NPC square. Exit 0 = all reachable."""
import json, os, sys
from collections import deque
MAPS = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld', 'maps')
names = ['aurelith', 'aurelith_terminal_int', 'aurelith_stadium_int', 'aurelith_rthq_int', 'aurelith_galleria_1f_int', 'aurelith_galleria_2f_int',
         'aurelith_galleria_3f_int', 'aurelith_galleria_4f_int', 'aurelith_galleria_roof', 'aurelith_hotel_int', 'aurelith_hotel_2f_int', 'home_aurelith_flat']
bad = 0
for n in names:
    m = json.load(open(os.path.join(MAPS, n + '.json'))); C = m['layers']['collision']; W, H = m['width'], m['height']
    for g in m.get('story_gates', []):
        for c in g['cells']: C[c['y']][c['x']] = 0   # check the cleared state (gate opens with its flag)
    occ = {(a['x'], a['y']) for a in m['npcs']}
    walk = lambda x, y: 0 <= x < W and 0 <= y < H and C[y][x] == 0 and (x, y) not in occ
    if n == 'aurelith': starts = [(0, 27)]
    elif 'stand' in str(m.get('interact_spots')) and not any(w['to'] == '$return' for w in m['warps']): starts = [tuple(m['interact_spots'][0]['stand'])]
    else: starts = [(w['x'], w['y'] - 1) for w in m['warps'] if w['to'] == '$return'][:1]
    seen = set(starts); q = deque(starts)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p = (x + dx, y + dy)
            if p not in seen and walk(*p): seen.add(p); q.append(p)
    def near(x, y, rng=1): return any((x + dx, y + dy) in seen for dx in range(-rng, rng + 1) for dy in range(-rng, rng + 1) if abs(dx) + abs(dy) == 1 or (dx == 0 and abs(dy) <= rng))
    probs = []
    for w in m['warps']:
        if not near(w['x'], w['y']): probs.append(f"warp {w['to']} @{w['x']},{w['y']}")
    for e in m.get('exits', []):
        for i in range(e['start'], e['end'] + 1):
            x, y = {'west': (0, i), 'east': (W - 1, i), 'south': (i, H - 1), 'north': (i, 0)}[e['edge']]
            if (x, y) not in seen: probs.append(f"exit {e['edge']} {x},{y}")
    for a in m['npcs']:
        if not near(a['x'], a['y'], 2): probs.append(f"npc {a['id']}")
    for s in m['signs']:
        if not any((s['x'], s['y'] + k) in seen for k in (1, 2, 3)) and not near(s['x'], s['y'], 1): probs.append(f"sign {s['id']}")
    for s in m.get('interact_spots', []):
        if tuple(s.get('stand', (s['x'], s['y'] + 1))) not in seen: probs.append(f"spot {s['id']}")
    for it in m.get('items', []):
        if not near(it['x'], it['y']) and (it['x'], it['y']) not in seen: probs.append(f"item {it['id']}")
    print(f"{n}: reachable {len(seen)} cells; {'OK' if not probs else 'PROBLEMS ' + '; '.join(probs)}"); bad += len(probs)
sys.exit(1 if bad else 0)
