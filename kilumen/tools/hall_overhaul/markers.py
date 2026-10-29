"""Explicit animation markers (Animator steer, Oct 29 2026) written into plans.json `markers`:
fernwick `slab` = sinking slabs: dead-end floor cells off the solution walk and off every sight ray; the slab sinks (one-shot)
when the player steps off it and the cell becomes water (collision 3) until the hall is re-entered. Dead ends only, so
no walk is ever cut. saltmere `sluice` = the two sluice gates (the a/b gate cells): water runs while closed, drains when open."""
import json, sys
from plan import Hall, D
P = json.load(open(sys.argv[1]))
def rays(p):
    out = set()
    for t in p['trainers']:
        dx, dy = D[t['facing']]; out |= {(t['at'][0] + dx * k, t['at'][1] + dy * k) for k in range(1, t['sight'] + 1)}
    return out
f = P['fernwick']; h = Hall(f['grid']); h.tr = {tuple(t['at']) for t in f['trainers']}
sol = set(map(tuple, h.check()['cells'])); R = rays(f)
dead = [(x, y) for y in range(h.h) for x in range(h.w) if h.at(x, y) == '.' and (x, y) not in sol and (x, y) not in R and (x, y) not in h.tr
        and sum(h.at(x + dx, y + dy) not in '#xM' for dx, dy in D.values()) == 1 and y < h.h - 4]
f['markers'] = {'slab': [list(c) for c in dead[:3]]}
s = P['saltmere']; s['markers'] = {'sluice': [[x, y] for y, r in enumerate(s['grid']) for x, c in enumerate(r) if c in 'ab']}
json.dump(P, open(sys.argv[1], 'w'), indent=1)
print(f['markers'], s['markers'])
