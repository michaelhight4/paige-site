"""Fix Gary's live-game flags (Oct 30 2026, see live_flags.py) on our maps, in place, after each map's own builder.
F1 orphan canopies (over a cave mouth, house or sign that replaced the trunk) are removed, trunks without a canopy get one;
   straight forest edges get a 1-cell notch every 5 trees (the notch trunk and its canopy go), staggering the border;
   notches only where the wall behind stays 2+ trees thick, so no pocket seal or map border thins out.
F2 an NPC under a canopy steps to the nearest open cell outside it.   F3 a prop on a path cell moves to free grass beside it,
   else the path under it is grassed; any prop left walkable gets collision.   F4/F5 are fixed by notches (F5) or by hand (F4).
A 1-tree-thick row opens a gap only if nothing new becomes reachable, else grows a tree onto the lawn in front, else one tree becomes a bush.
Every walkable cell reachable before stays reachable (layering_rules.reach)."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import live_flags as F, layering_rules as LR
ID = {v: k for k, v in F.NM.items()}
def fix(name):
    p = os.path.join(F.ROOT, f'art/world/overworld/maps/{name}.json'); m = json.load(open(p)); m.setdefault('name', name)
    L = m['layers']; G, D, O, C = L['ground'], L['decoration'], L['overlay'], L['collision']; H, W = len(C), len(C[0])
    nm = lambda v: F.NM.get(v, ''); before = LR.reach(m, LR.starts(m)); log = []
    feat = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots', 'warps') for o in m.get(k) or [] if 'x' in o}
    inb = lambda x, y: 0 <= x < W and 0 <= y < H
    trunk = lambda x, y: inb(x, y) and bool(F.BASE.match(nm(D[y][x])))
    walk = lambda x, y: inb(x, y) and C[y][x] in (0, 4)
    solid = lambda x, y: not inb(x, y) or not walk(x, y)
    topname = lambda bx, by: nm(D[by][bx]).replace('base_inner', 'top').replace('base', 'top')
    # F1 halves
    for y in range(H):
        for x in range(W):
            if F.TOP.match(nm(O[y][x])) and y + 1 < H and not trunk(x, y + 1): O[y][x] = 0; log.append(('canopy-', x, y))
    for y in range(1, H):
        for x in range(W):
            if trunk(x, y) and not O[y - 1][x] and topname(x, y) in ID: O[y - 1][x] = ID[topname(x, y)]; log.append(('canopy+', x, y - 1))
    # F1 edges / F5 corridors: notch straight trunk runs facing walkable ground
    def notch(x, y, back):                                 # back = direction into the forest
        bx, by = x + back[0], y + back[1]; b2 = (x + 2 * back[0], y + 2 * back[1])
        if (x, y) in feat or not trunk(x, y) or not walk(x - back[0], y - back[1]): return False
        if not (trunk(bx, by) and solid(*b2)): return gap(x, y) or bump(x - back[0], y - back[1], (x, y)) or shrub(x, y)
        if any(walk(x + a, y + b) and (a, b) != (-back[0], -back[1]) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): return False
        sv = (D[y][x], C[y][x], O[y - 1][x] if y else 0, G[y][x])
        D[y][x] = 0; C[y][x] = 0
        if y and F.TOP.match(nm(O[y - 1][x])): O[y - 1][x] = 0
        if not nm(G[y][x]).startswith(('grass', 'mud', 'dirt', 'sand', 'snow')): G[y][x] = ID['grass_0']
        if y and trunk(x, y - 1) and not O[y][x]: pass
        return sv
    def gap(x, y):                                        # a 1-tree-thick row: open a gap only if nothing new becomes reachable
        sv = (D[y][x], C[y][x], O[y - 1][x] if y else 0)
        D[y][x] = 0; C[y][x] = 0
        if y and F.TOP.match(nm(O[y - 1][x])): O[y - 1][x] = 0
        if LR.reach(m, LR.starts(m)) <= before | {(x, y)} and (x, y) in LR.reach(m, LR.starts(m)): return True
        D[y][x], C[y][x] = sv[0], sv[1]
        if y: O[y - 1][x] = sv[2]
        return False
    def bump(X, Y, src):                                  # else grow one tree out of the row onto plain lawn, keeping every lane open
        if not (walk(X, Y) and not D[Y][X] and not O[Y][X] and (X, Y) not in feat and nm(G[Y][X]).startswith('grass')): return False
        if Y and O[Y - 1][X]: return False
        D[Y][X] = D[src[1]][src[0]]; C[Y][X] = 1
        if Y: O[Y - 1][X] = ID[topname(X, Y)]
        r2 = LR.reach(m, LR.starts(m))
        if all(q == (X, Y) or not walk(*q) or q in r2 for q in before): log.append(('bump', X, Y)); return True
        D[Y][X] = 0; C[Y][X] = 0
        if Y: O[Y - 1][X] = 0
        return False
    def shrub(x, y):                                      # last resort on a sealing 1-thick row: a bush breaks the line, the seal holds
        if 'bush' not in ID: return False
        D[y][x] = ID['bush']; C[y][x] = 1
        if y and F.TOP.match(nm(O[y - 1][x])): O[y - 1][x] = 0
        log.append(('bush', x, y)); return True
    for it in range(3):
        fl = F.audit(m)['F1_edge'] + F.audit(m)['F5']
        if not fl: break
        for y in range(H):                                  # south/north edges (rows)
            for side, back in ((1, (0, -1)), (-1, (0, 1))):
                run = []
                for x in range(W + 1):
                    e = x < W and trunk(x, y) and (walk(x, y + 1) if side == 1 else walk(x, y - 1))
                    if e: run.append(x); continue
                    if len(run) > F.EDGE_RUN:
                        for k in range(4, len(run) - 1, 5):
                            for kk in (k, k - 1, k + 1, k - 2):
                                if 0 <= kk < len(run) and notch(run[kk], y, back): log.append(('notch', run[kk], y)); break
                    run = []
        for x in range(W):
            for side, back in ((1, (-1, 0)), (-1, (1, 0))):
                run = []
                for y in range(H + 1):
                    if y < H and trunk(x, y) and walk(x + side, y): run.append(y); continue
                    if len(run) > F.EDGE_RUN:
                        for k in range(4, len(run) - 1, 5):
                            for kk in (k, k - 1, k + 1, k - 2):
                                if 0 <= kk < len(run) and notch(x, run[kk], back): log.append(('notch', x, run[kk])); break
                    run = []
        for y in range(1, H):                               # a notch can uncover a trunk whose canopy was cleared
            for x in range(W):
                if trunk(x, y) and not O[y - 1][x] and topname(x, y) in ID: O[y - 1][x] = ID[topname(x, y)]
    # F2
    for n in m.get('npcs') or []:
        if not F.TOP.match(nm(O[n['y']][n['x']])): continue
        x0, y0 = n['x'], n['y']
        c = next(((x0 + a, y0 + b) for r in range(1, 4) for b in range(-r, r + 1) for a in range(-r, r + 1)
                  if walk(x0 + a, y0 + b) and not O[y0 + b][x0 + a] and not D[y0 + b][x0 + a] and (x0 + a, y0 + b) not in feat and (x0 + a, y0 + b) in before), None)
        n['x'], n['y'] = c; feat.add(c); log.append(('npc', n['id'], x0, y0, c))
    # F3
    for (x, y) in F.audit(m)['F3_walk']:
        d = D[y][x]; done = False
        for a, b in ((0, -1), (-1, 0), (1, 0), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            X, Y = x + a, y + b
            if not (walk(X, Y) and not D[Y][X] and not O[Y][X] and (X, Y) not in feat and nm(G[Y][X]).startswith('grass')): continue
            D[Y][X] = d; C[Y][X] = C[y][x]; D[y][x] = 0; C[y][x] = 0
            r2 = LR.reach(m, LR.starts(m))
            if all(not walk(*q) or q in r2 for q in before): done = True; log.append(('prop>', nm(d), x, y, X, Y)); break
            D[y][x] = d; C[y][x] = C[Y][X]; D[Y][X] = 0; C[Y][X] = 0
        if not done: G[y][x] = ID[f'grass_{(x * 7 + y * 13) % 4}']; log.append(('regrass', nm(d), x, y))
    for (x, y) in F.audit(m)['F3_nocol']: C[y][x] = 1; log.append(('collide', x, y))
    after = LR.reach(m, LR.starts(m)); lost = [q for q in before if walk(*q) and q not in after]
    assert not lost, (name, lost[:8])
    json.dump(m, open(p, 'w'), indent=1, ensure_ascii=False); open(p, 'a').write('\n')
    return log
if __name__ == '__main__':
    for n in sys.argv[1:] or F.MAPS:
        lg = fix(n); from collections import Counter; print(n, Counter(e[0] for e in lg), [e for e in lg if e[0] in ('npc', 'prop>', 'regrass')])
