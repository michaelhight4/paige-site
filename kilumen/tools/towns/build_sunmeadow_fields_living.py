"""Sunmeadow Fields, bring the farm town to life (GD, Oct 30 2026; cozy_map_lessons.md guides: grass 55-70%, a landmark
per screen, a pond and a flower field, decor in clusters, no long blank runs). The Hay Loft pocket (old cave_e) now lives on
route_sunmeadow_mirefen; its old floor stays open meadow. Doors, warps, NPCs, items and signs are unchanged.
Order: python3 tools/map_audit/cave_pockets.py sunmeadow_fields, then this script (in place), then tools/towns/balance_pass.py sunmeadow_fields, then tools/map_audit/fix_live_flags.py sunmeadow_fields."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'art/world/overworld/maps/sunmeadow_fields.json')
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}; TS_NAME = {t['id']: t['name'] for t in TS['tiles']}
m = json.load(open(P)); L = m['layers']; C = L['collision']
assert not m.get('living_town'), 'already applied: re-run cave_pockets.py first'
vh = lambda x, y: (x * 7 + y * 13 + (x * y) % 5) % 4
WARPS = {(w['x'], w['y']) for w in m['warps']}
FEAT = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots') for o in m.get(k) or [] if 'x' in o}
def grass(x, y):
    if C[y][x] in (0, 4) and (x, y) not in WARPS: L['ground'][y][x] = ID[f'grass_{vh(x, y)}']
def free(x, y): return C[y][x] == 0 and (x, y) not in WARPS and (x, y) not in FEAT and not L['decoration'][y][x]
def ok(x, y): return C[y][x] == 0 and (x, y) not in WARPS and (x, y) not in FEAT
def prop(x, y, name):
    assert ok(x, y), (x, y, name); L['decoration'][y][x] = ID[name]; C[y][x] = 1
def flowers(x, y, name=None):
    assert ok(x, y), (x, y); grass(x, y); L['decoration'][y][x] = ID[name or ('flowers_violet' if (x + y) % 2 else 'flowers_warm')]
def block(x0, y0, name, w, h):
    for r in range(h):
        for c in range(w): prop(x0 + c, y0 + r, f'{name}_{r}_{c}')
def clear(x, y):                                     # fell a forest tree: base at (x,y), canopy drawn at (x,y-1)
    if L['decoration'][y][x] == ID['tree_base']: L['decoration'][y][x] = 0
    if L['overlay'][y - 1][x] == ID['tree_top']: L['overlay'][y - 1][x] = 0
    if C[y][x] == 1 and not L['decoration'][y][x]: C[y][x] = 0
    grass(x, y)
def pond(x0, y0, x1, y1):
    cells = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
    for (x, y) in cells: assert ok(x, y), (x, y); C[y][x] = 3; L['decoration'][y][x] = 0
    low = lambda a, b: (a, b) not in cells
    for (x, y) in cells:
        s = ''.join('1' if low(x + a, y + b) else '0' for a, b in ((0, -1), (1, 0), (0, 1), (-1, 0)))
        d = ''.join('1' if low(x + a, y + b) else '0' for a, b in ((1, -1), (1, 1), (-1, 1), (-1, -1)))
        nm = next((n for n in (f'water>grass_{s}_{d}', f'water>grass_{s}_{d}_w1', f'water>grass_{s}_{d}_w2') if n in ID), 'water')
        L['ground'][y][x] = ID[nm]
# 1. one landmark per screen (tools/towns/town_landmarks_art.py kit + the town statue)
block(12, 17, 'lm_big_tree', 2, 2)                   # west gate: the old oak by the croft
block(26, 16, 'lm_big_tree', 2, 2)                   # north meadow: a second oak above the ledge
block(44, 21, 'lm_big_tree', 2, 2)                   # east green (the old Hay Loft meadow): an oak by the flower field
block(45, 26, 'lm_gazebo', 3, 2)                     # east lane gazebo
prop(18, 27, 'x_city_statue')                        # Clover Dell: a little stone figure among the clover
# 2. a 4x3 pond in the middle meadow, a 4x4 three-colour flower field on the east green, a statue by the south meadow
pond(24, 26, 27, 28)                                 # west of the road (x28-29 stays open)
FL = ['flowers_violet', 'flowers_warm', 'flowers_violet', 'flowers_warm']
for y in range(20, 24):
    for x in range(40, 44):
        if ok(x, y): flowers(x, y, FL[(x + y) % 4])
L['decoration'][22][41] = ID['bush']; C[22][41] = 1  # a bush in the middle: third colour
prop(29, 32, 'x_city_statue')
for x, y in ((24, 29), (27, 29), (30, 27)): flowers(x, y)   # flowers at the pond edge
# 2b. the Clover Dell floor was bare trail: clover meadow with flower tufts (ledges and pocket seals unchanged)
for x0, y0, x1, y1 in ((14, 25, 22, 30),):          # the hollow (35-44,31-35) stays a tilled field
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 'trail' in TS_NAME.get(L['ground'][y][x], '') and C[y][x] == 0: grass(x, y)
for x, y in ((16, 26), (20, 28), (15, 29), (17, 29), (21, 26), (37, 32), (42, 34), (39, 35), (36, 34), (40, 31), (12, 26), (12, 32)):
    if free(x, y): flowers(x, y)
# 3. clusters and breaks on the long blank meadow runs (flowers walkable, benches and fences solid)
for x, y in ((34, 22), (35, 22), (36, 23), (20, 15), (21, 15), (21, 16), (40, 25), (41, 25), (24, 21), (24, 22), (25, 22),
             (17, 15), (8, 15), (4, 14), (36, 28), (37, 28), (37, 29), (50, 24), (54, 25), (58, 24), (42, 37), (34, 37), (20, 37), (14, 37)):
    if free(x, y): flowers(x, y)
for x, y in ((22, 17), (36, 20), (40, 27), (44, 34)):
    if free(x, y) and free(x + 1, y): prop(x, y, 'x_bench_0_0'); prop(x + 1, y, 'x_bench_0_1')
# 4. two strollers (text: data/textbot_sunmeadow_strollers.json, Text Bot Oct 30 2026)
for i, x, y, note in (('sunmeadow_fields_stroller_pond', 25, 30, 'strolls round the pond and the statue'),
                      ('sunmeadow_fields_stroller_green', 46, 23, 'strolls the east green past the flower field and the oak')):
    assert ok(x, y), (i, x, y)
    m['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': 'down', 'kind': 'villager', 'note': note,
                      'text_ref': f'data/textbot_sunmeadow_strollers.json maps.sunmeadow_fields.{i}'})
m['living_town'] = 'tools/towns/build_sunmeadow_fields_living.py (Oct 30 2026): oaks, gazebo, statues, pond, flower field, benches, flower clusters (Hay Loft moved to route_sunmeadow_mirefen)'
json.dump(m, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print('ok')
