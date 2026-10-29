"""Phase 2 trainer re-seat (Gary steer: sight lines stay on after 4 wins; a walk with only 4 battles must exist).
Keeps every approved grid as drawn. Walks the Phase 1 trainers in order and keeps each one while a 4-battle walk
(door -> dais front, beat exactly min(4, n) trainers, dodge every other sight line) still exists; a trainer that would
close the last such walk is re-seated on the nearest candidate (same plan.py rules: ray 1-4 crossing the solution walk,
3+ squares from other trainers, no ray overlaps, no softlock). Writes plans.json in place (old seats kept in seat_v1)."""
import json, random, sys
from plan import Hall, D
from battles import search

def candidates(h, cells):
    order = {}
    for i, c in enumerate(cells): order.setdefault(tuple(c), i)
    reach = {(k[0], k[1]) for k in h.bfs((h.find('S')[0][0], h.find('S')[0][1], 0))}
    side = {c: 10000 for c in reach if c not in order}  # reachable but off the solution walk: a side loop / dead end
    S = h.find('S')[0]; out = []
    for y in range(h.h):
        for x in range(h.w):
            if h.at(x, y) != '.' or (x, y) in order or (x, y) not in reach or abs(x - S[0]) + abs(y - S[1]) < 4 or y <= 3 or y >= h.h - 4: continue
            for d, (dx, dy) in D.items():
                for L in (4, 3, 2, 1):
                    ray = []
                    for k in range(1, L + 1):
                        c = (x + dx * k, y + dy * k)
                        if h.at(*c) in '#xM' or h.at(*c) in 'abcd': break
                        ray.append(c)
                    if len(ray) == L and any(c in order for c in ray):
                        out.append({'at': [x, y], 'facing': d, 'sight': L, 'first_path_step': min(order[c] for c in ray if c in order)})
                    elif len(ray) == L and any(c in side for c in ray):
                        out.append({'at': [x, y], 'facing': d, 'sight': L, 'first_path_step': None, 'side': True})
    return out

def ok_with(p, tr):
    need = min(4, len(tr))
    return search(p['grid'], tr, need, need) is not None

def rays(t): return {(t['at'][0] + D[t['facing']][0] * k, t['at'][1] + D[t['facing']][1] * k) for k in range(1, t['sight'] + 1)}

def fair(tr, c):
    rc = rays(c)
    for t in tr:
        if abs(t['at'][0] - c['at'][0]) + abs(t['at'][1] - c['at'][1]) < 3: return False
        if tuple(t['at']) in rc or tuple(c['at']) in rays(t) or rays(t) & rc: return False
    return True

def reseat(p):
    h = Hall(p['grid']); res = h.check(); cand = candidates(h, res['cells']); tr = []; moved = []
    rnd = random.Random(p['seed'])
    for t in p['trainers']:
        t = {k: t[k] for k in ('at', 'facing', 'sight', 'first_path_step')}
        if fair(tr, t) and ok_with(p, tr + [t]): tr.append(t); continue
        best = sorted(cand, key=lambda c: (1000 if c.get('side') else abs(c['first_path_step'] - t['first_path_step'])) + rnd.random())
        for c in best:
            if not fair(tr, c): continue
            h.tr = {tuple(x['at']) for x in tr} | {tuple(c['at'])}
            r2 = h.check()
            if not r2 or r2['softlocks']: continue
            if ok_with(p, tr + [c]): moved.append((t['at'], c['at'])); tr.append(c); break
        else: raise SystemExit('no seat')
    for c in tr:
        if c.get('side'): c['first_path_step'] = t['first_path_step']  # keep plan order slot
    tr.sort(key=lambda c: c['first_path_step'])
    for i, t in enumerate(tr): t['n'] = i + 1
    return tr, moved

if __name__ == '__main__':
    path = sys.argv[1]; P = json.load(open(path))
    for k, p in P.items():
        if len(p['trainers']) <= 4: continue
        old = p['trainers']; tr, moved = reseat(p)
        if moved: p['seat_v1'] = old; p['trainers'] = tr
        h = Hall(p['grid']); h.tr = {tuple(t['at']) for t in p['trainers']}; r = h.check()
        p['softlocks'] = r['softlocks']; p['states'] = r['states']
        print(k, 'moved', moved, 'softlocks', r['softlocks'])
    json.dump(P, open(path, 'w'), indent=1)
