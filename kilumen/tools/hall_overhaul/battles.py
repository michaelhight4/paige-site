"""Battle-aware solver (Phase 2): state = (x, y, bits, beaten-mask). A rest cell inside an unbeaten trainer's sight
forces that battle (first trainer in list order, like findSpotter). Sight is checked only where the player comes to rest
(slides / pushes chain through cells without a check, warps rest on the partner pad), as in src/overnight/sight.js.
min_battles(): fewest battles on any walk door -> dais front that has beaten >= need trainers, never more than `cap`."""
from collections import deque
from plan import Hall, D

def rays(h, trainers):
    out = []
    for t in trainers:
        dx, dy = D[t['facing']]; x, y = t['at']
        out.append({(x + dx * k, y + dy * k) for k in range(1, t['sight'] + 1)})
    return out

def search(grid, trainers, need, cap):
    h = Hall(grid); h.tr = {tuple(t['at']) for t in trainers}; R = rays(h, trainers)
    S = h.find('S')[0]; G = h.find('G')[0]
    src = (S[0], S[1], 0, 0); prev = {src: None}; q = deque([src]); best = None
    while q:
        u = q.popleft(); x, y, b, m = u
        if (x, y) == G and bin(m).count('1') >= need: best = u; break
        for d, (nx, ny, nb), tr in h.moves((x, y, b)):
            nm = m
            for i, r in enumerate(R):
                if not (m >> i) & 1 and (nx, ny) in r: nm = m | (1 << i); break
            if bin(nm).count('1') > cap: continue
            v = (nx, ny, nb, nm)
            if v not in prev: prev[v] = (u, d); q.append(v)
    if not best: return None
    path = []; k = best
    while prev[k]: k, d = prev[k]; path.append(d)
    return {'battles': bin(best[3]).count('1'), 'beaten': [i + 1 for i in range(len(R)) if (best[3] >> i) & 1], 'moves': ''.join(reversed(path))}

def report(p):
    n = len(p['trainers']); need = 4 if n > 4 else n
    exact = search(p['grid'], p['trainers'], need, need)            # beat exactly `need`, dodge every other sight line
    free = search(p['grid'], p['trainers'], 0, n)                   # shortest walk, fights whatever it walks into
    return {'trainers': n, 'need': need, 'exact_path': exact, 'shortest_walk_battles': free and free['battles']}

if __name__ == '__main__':
    import json, sys
    P = json.load(open(sys.argv[1]))
    for k, p in P.items():
        r = report(p); e = r['exact_path']
        print(f"{k:16} n={r['trainers']:2} need={r['need']} exact={'OK ' + str(e['beaten']) + ' ' + str(len(e['moves'])) + ' moves' if e else 'NONE'} shortest-walk battles={r['shortest_walk_battles']}")
