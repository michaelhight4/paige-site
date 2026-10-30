"""Revival Heights, bring the town to life (Coder, Oct 30 2026; Gary 10:52-10:53 AM CT: decor, ponds, flower fields,
statues, other buildings, small shop stalls; "a little more grass a little less hard concrete").
Overrides kilumen_town_identity.md §1 "no grass / no water" per Gary. Company Boulevard (rows 19-20) and Tower Avenue
(x28-29) stay paved; the empty paved lots become grass, flower beds, stone paths and a pond.
Order: CAVE_POCKETS_BASE=3a39a391 python3 tools/map_audit/cave_pockets.py revival_heights, then this script (in place).
Doors, warps and the RT guard checkpoint (29,29) are unchanged."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'art/world/overworld/maps/revival_heights.json')
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}
m = json.load(open(P)); L = m['layers']; C = L['collision']
assert not m.get('living_town'), 'already applied: re-run cave_pockets.py first'
vh = lambda x, y: (x * 7 + y * 13 + (x * y) % 5) % 4
WARPS = {(w['x'], w['y']) for w in m['warps']}
def grass(x, y):
    if C[y][x] in (0, 4) and (x, y) not in WARPS: L['ground'][y][x] = ID[f'grass_{vh(x, y)}']
def path(x, y):
    if C[y][x] in (0, 4) and (x, y) not in WARPS: L['ground'][y][x] = ID[f'path_{vh(x, y)}']
def prop(x, y, name):
    assert C[y][x] == 0 and (x, y) not in WARPS, (x, y, name); L['decoration'][y][x] = ID[name]; C[y][x] = 1
def flowers(x, y):
    grass(x, y); L['decoration'][y][x] = ID['flowers_violet' if (x + y) % 2 else 'flowers_warm']
def rect(x0, y0, x1, y1, f):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): f(x, y)
def pond(x0, y0, x1, y1):
    cells = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
    for (x, y) in cells: assert C[y][x] == 0, (x, y); C[y][x] = 3; L['decoration'][y][x] = 0
    for y in range(y0 - 1, y1 + 2):
        for x in range(x0 - 1, x1 + 2):
            if (x, y) not in cells: grass(x, y)
    low = lambda a, b: (a, b) not in cells
    for (x, y) in cells:
        s = ''.join('1' if low(x + a, y + b) else '0' for a, b in ((0, -1), (1, 0), (0, 1), (-1, 0)))
        d = ''.join('1' if low(x + a, y + b) else '0' for a, b in ((1, -1), (1, 1), (-1, 1), (-1, -1)))
        nm = next((n for n in (f'water>grass_{s}_{d}', f'water>grass_{s}_{d}_w1', f'water>grass_{s}_{d}_w2') if n in ID), 'water')
        L['ground'][y][x] = ID[nm]

# 1. north plaza: paving only around the obelisk fountain; lawns, a pond, a statue and a little cafe either side
rect(14, 9, 27, 13, grass)
rect(17, 9, 22, 13, lambda x, y: L['ground'][y].__setitem__(x, 10924) if C[y][x] in (0, 4) else None)
pond(14, 11, 15, 12)
rect(14, 13, 16, 13, flowers)
for j in range(3):                                   # Bramble Cafe (decorative, no interior yet; door closed)
    for i in range(4):
        n = f'x_city_cafe_{j}_{i}'; x, y = 24 + i, 11 + j
        assert C[y][x] == 0, (x, y); L['decoration'][y][x] = ID[n]; C[y][x] = 1
prop(25, 10, 'x_city_cafe_table'); prop(27, 9, 'x_city_lamp')
rect(30, 9, 31, 13, path); prop(30, 11, 'x_city_statue')   # founder's statue at the tower forecourt
# 2. north-east lane up to the Server Nook cave: lawn and a stone path
rect(40, 9, 43, 18, grass); rect(42, 9, 43, 18, path); rect(40, 11, 41, 12, flowers)
# 3. south walk: a stone path, lawns, flower beds and the market stalls with their keepers
rect(14, 28, 43, 30, grass)
rect(14, 28, 43, 28, path); rect(28, 28, 29, 30, lambda x, y: None)
for x in (21, 22, 31, 32, 33): flowers(x, 30)
for x0, stall in ((16, 'bread'), (24, 'flowers'), (39, 'fruit')):
    prop(x0, 30, f'x_city_stall_{stall}_0_0'); prop(x0 + 1, 30, f'x_city_stall_{stall}_1_0')
prop(26, 29, 'x_city_bench_h'); prop(37, 29, 'x_city_lamp')
for x in (19, 20, 35, 36, 42, 43): rect(x, 23, x, 27, path)    # the lanes between the houses: stone, not asphalt
STALLS = [('revival_heights_stall_baker', 18, 30, 'bread stall on the south walk'),
          ('revival_heights_stall_florist', 26, 30, 'flower stall on the south walk'),
          ('revival_heights_stall_grocer', 41, 30, 'fruit stall on the south walk')]
for i, x, y, note in STALLS:
    m['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': 'up', 'kind': 'townsfolk', 'stall_shop': True,
                      'note': note + ' (talk opens the RT Supply shop list, src/systems/index.js stall_shop)',
                      'text_ref': f'overworld_lines.json maps.revival_heights.{i}', 'text_pending': True})
m['living_town'] = 'tools/towns/build_revival_heights_living.py (Oct 30 2026): lawns, pond, flower beds, cafe, statue, 3 market stalls'
json.dump(m, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print('ok')
