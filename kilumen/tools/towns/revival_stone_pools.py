"""Revival Heights square stone pools (Gary approved, Oct 30 2026 12:48 PM CT via World Design, kilumen_balance_plan_wd.md
R3 + R6). Both ponds keep their water cells (collision 3) but every water cell becomes a farm_pool stone-pool piece, so
each pool is a square basin with a stone coping round all of it: R6 the NW pond x14-15 y11-12 (2x2 basin) with 2 corner
planters at its NE and SE corners; R3 the south pond x31-34 y34-36 framed by planters on its east side (35,34 already there;
35,36 sits under a tree canopy, so it is skipped). Run on the current map, then tools/map_audit/fix_live_flags.py. Idempotent."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'art/world/overworld/maps/revival_heights.json')
TS = {t['name']: t['id'] for t in json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))['tiles']}
m = json.load(open(P)); L = m['layers']; G, D, O, C = L['ground'], L['decoration'], L['overlay'], L['collision']
def pool(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            assert C[y][x] == 3, (x, y)
            v = 'n' if y == y0 else 's' if y == y1 else ''
            h = 'w' if x == x0 else 'e' if x == x1 else ''
            G[y][x] = TS[f'fp_pool_{v + h or "c"}']; D[y][x] = 0
    for y in range(y0 - 1, y1 + 2):            # nothing else wet touches the basin: every water cell is inside the stone
        for x in range(x0 - 1, x1 + 2):
            if not (x0 <= x <= x1 and y0 <= y <= y1): assert C[y][x] != 3, (x, y)
pool(14, 11, 15, 12); pool(31, 34, 34, 36)
PL = D[34][35]; assert PL and C[34][35] == 1      # the existing R3 planter tile
NM = {v: k for k, v in TS.items()}; n = 0
for x, y in ((16, 10), (13, 10), (16, 13)):       # R6: 2 corner planters (13,10 sits under a tree canopy -> 16,13 instead)
    if n < 2 and (D[y][x] in (0, PL) or NM.get(D[y][x], '').startswith('flowers_')) and not O[y][x]: D[y][x] = PL; C[y][x] = 1; n += 1
json.dump(m, open(P, 'w'), indent=1)
print('ok')
