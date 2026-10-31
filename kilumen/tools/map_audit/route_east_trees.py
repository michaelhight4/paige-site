"""route_east tree fix (Gary, Oct 30 2026): make every tree draw whole and join the ledge
split by two trees at (17,15),(18,15). Touches only tree_base/tree_top cells (+ those two ledge cells).
A tree is tree_base at (x,y) with its canopy tree_top in the overlay at (x,y-1).
  - canopy with no trunk below (orphan tree_top) -> removed (it was hiding the trunk of the tree behind it)
  - trunk with no canopy above -> canopy added, unless the canopy cell holds an NPC/item/sign/spot/warp
    or is blocked by something else, or is a trail cell, or is a 1-tile lane (a canopy would hide the path / player); then the tree becomes a one-tile bush (same block collision).
Idempotent."""
import json, os
R = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
T = {t['id']: t['name'] for t in json.load(open(os.path.join(R, 'tileset.json')))['tiles']}; ID = {v: k for k, v in T.items()}
P = os.path.join(R, 'maps', 'route_east.json'); m = json.load(open(P))
D, O, C, G = (m['layers'][k] for k in ('decoration', 'overlay', 'collision', 'ground'))
W, H = m['width'], m['height']
occ = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots', 'warps') for o in m.get(k, [])}
base = lambda x, y: 0 <= y < H and T.get(D[y][x]) == 'tree_base'
top = lambda x, y: 0 <= y < H and T.get(O[y][x]) == 'tree_top'
# 2) join the ledge: the two trees between the left stub (14-16) and the long ledge (19-33)
for x in (17, 18): D[15][x] = ID['ledge_m']; C[15][x] = 2
D[15][16] = ID['ledge_m']; D[15][19] = ID['ledge_m']
# keep the N-S dirt path (x 22-23) open where it crosses the ledge row; cap the ledge on each side
for x in (22, 23): D[15][x] = 0; C[15][x] = 0
D[15][21] = ID['ledge_r']; D[15][24] = ID['ledge_l']
log = []
changed = True
while changed:
    changed = False
    for y in range(H):
        for x in range(W):
            if top(x, y) and y + 1 < H and not base(x, y + 1):
                O[y][x] = 0; changed = True; log.append(('rm_orphan_top', x, y))
            if base(x, y) and y > 0 and not top(x, y - 1):
                if C[y - 1][x] == 0 and (x, y - 1) not in occ and O[y - 1][x] == 0 and 'trail' not in T.get(G[y - 1][x], '') and y >= 2 and C[y - 2][x] == 0:
                    O[y - 1][x] = ID['tree_top']; log.append(('add_top', x, y - 1))
                else:
                    D[y][x] = ID['bush']; log.append(('bush', x, y))
                changed = True
open(P, 'w').write(json.dumps(m, indent=1, ensure_ascii=False))
for l in log: print(*l)
