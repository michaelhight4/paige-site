#!/usr/bin/env python3
"""Dead-space audit for overworld maps (Coder, Oct 30 2026; Gary: sparse maps).
A walkable square is "dead" when nothing interesting (NPC, item, interact spot, sign, warp, decoration prop, ledge, water edge)
lies within RADIUS squares (Manhattan). Score = dead walkable squares / walkable squares (0 = lived-in, 1 = empty).
Usage: python3 tools/map_audit/dead_space.py [--top N] [--map NAME] [--json]"""
import argparse, glob, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
WALK = {0, 10}; RADIUS = 3

def score(j):
    L = j['layers']; col = L['collision']; h, w = len(col), len(col[0]); deco = L.get('decoration') or [[0] * w for _ in range(h)]
    pts = set()
    for k in ('npcs', 'items', 'signs'):
        pts |= {(o['x'], o['y']) for o in j.get(k, []) or [] if 'x' in o}
    pts |= {(o['x'], o['y']) for o in j.get('interact_spots', []) or []}
    pts |= {(o['x'], o['y']) for o in j.get('warps', []) or []}
    for y in range(h):
        for x in range(w):
            c = col[y][x]
            if (deco[y][x] and c != 0) or c in (2, 3, 4, 5, 6, 7, 8, 9, 11): pts.add((x, y))
    walk = [(x, y) for y in range(h) for x in range(w) if col[y][x] in WALK]
    if not walk: return None
    near = set()
    for (px, py) in pts:
        for dy in range(-RADIUS, RADIUS + 1):
            r = RADIUS - abs(dy)
            for dx in range(-r, r + 1): near.add((px + dx, py + dy))
    dead = sum(p not in near for p in walk)
    return {'map': j.get('name'), 'w': w, 'h': h, 'walk': len(walk), 'dead': dead, 'score': round(dead / len(walk), 3),
            'npcs': len(j.get('npcs', []) or []), 'items': len(j.get('items', []) or []), 'spots': len(j.get('interact_spots', []) or [])}

def audit():
    out = []
    for f in sorted(glob.glob(os.path.join(MAPS, '*.json'))):
        try: j = json.load(open(f))
        except Exception: continue
        if 'layers' not in j or 'collision' not in j['layers']: continue
        s = score(j)
        if s: out.append(s)
    return sorted(out, key=lambda s: (-s['dead'], -s['score']))

if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('--top', type=int, default=25); a.add_argument('--map'); a.add_argument('--json', action='store_true')
    o = a.parse_args(); r = audit()
    if o.map: r = [s for s in r if s['map'] == o.map]
    if o.json: print(json.dumps(r[:o.top], indent=1)); raise SystemExit
    print(f"{'#':>3} {'map':32} {'size':>7} {'walk':>5} {'dead':>5} {'score':>6} npc item spot")
    for i, s in enumerate(r[:o.top], 1):
        print(f"{i:>3} {s['map']:32} {s['w']:>3}x{s['h']:<3} {s['walk']:>5} {s['dead']:>5} {s['score']:>6} {s['npcs']:>3} {s['items']:>4} {s['spots']:>4}")
