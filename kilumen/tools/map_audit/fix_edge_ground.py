#!/usr/bin/env python3
"""v0.2.105-alpha: GD city maps vs hotfix v0.2.102 ground_tile_misuse rule. Autotile-edge tiles that fill 3x3 blocks,
and edge/marking tiles inside pass 2 pocket floors, become the most common plain ground tile nearby. Idempotent."""
import json, os, re, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(ROOT, 'art/world/overworld')
NAME = {t['id']: t['name'] for t in json.load(open(os.path.join(D, 'tileset.json')))['tiles']}
BAD = lambda i: bool(re.search(r'[>]|_edge|zebra|crosswalk', NAME.get(i, '')))
spec = json.load(open(os.path.join(ROOT, 'data/pass2_caves.json')))['pockets']
def plain_near(g, x, y):
    c = collections.Counter(g[yy][xx] for yy in range(max(0, y-8), min(len(g), y+9)) for xx in range(max(0, x-8), min(len(g[0]), x+9)) if g[yy][xx] and not BAD(g[yy][xx]))
    return c.most_common(1)[0][0]
for f in sorted(os.listdir(os.path.join(D, 'maps'))):
    if not f.endswith('.json'): continue
    P = os.path.join(D, 'maps', f); j = json.load(open(P)); g = j.get('layers', {}).get('ground')
    if not g: continue
    fix = set()
    H, W = len(g), len(g[0])
    for y in range(H - 2):
        for x in range(W - 2):
            i = g[y][x]
            if BAD(i) and all(g[y+b][x+a] == i for a in range(3) for b in range(3)):
                fix |= {(x+a, y+b) for a in range(3) for b in range(3)}
    for p in spec:
        if p['map'] + '.json' != f: continue
        for x0, y0, x1, y1 in p['floor']:
            fix |= {(x, y) for y in range(y0, y1+1) for x in range(x0, x1+1) if BAD(g[y][x])}
    if not fix: continue
    rep = {(x, y): plain_near(g, x, y) for x, y in fix}
    for (x, y), t in rep.items(): g[y][x] = t
    json.dump(j, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
    print(f, len(fix), 'cells ->', collections.Counter(NAME[t] for t in rep.values()).most_common(2))
