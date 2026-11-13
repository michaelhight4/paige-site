#!/usr/bin/env python3
"""Apply the Dash Track to a kilumen root (DEV or live): tileset entries (ids 8001+) + brookhollow tiles/collision
+ coach position.  usage: apply_track.py <kilumen_root>   (idempotent)"""
import json, sys, os
R = sys.argv[1]; OW = os.path.join(R, 'art/world/overworld')
L = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'layout.json')))
BASE = 8001  # 9001+ belongs to the Interiors v2 kit (tileset_ix2.json)
for f, d in (('tileset.json', '1x'), ('tileset_2x.json', '2x'), ('tileset_3x.json', '3x')):
    p = os.path.join(OW, f); ts = json.load(open(p))
    ts['tiles'] = [t for t in ts['tiles'] if not (BASE <= t['id'] < BASE + 500)]
    assert not any(BASE <= t['id'] < BASE + 500 for t in ts['tiles'])
    for i in range(L['count']):
        ts['tiles'].append({'id': BASE + i, 'name': f'x_dash_track_{i}', 'category': 'decoration', 'sheet': f'tiles_extra/{d}/sports.png',
            'index': i, 'col': i % L['cols'], 'row': i // L['cols'], 'walkable': True, 'collision': 'walk', 'collision_code': 0, 'encounter': False,
            'notes': 'Brookhollow Dash Track (tiles_extra/sports/build_track.py); map collision decides blocking'})
    json.dump(ts, open(p, 'w'), indent=1)
p = os.path.join(OW, 'maps/brookhollow.json'); m = json.load(open(p)); Ly = m['layers']
ox, oy = L['origin']; gw, gh = L['size']
names = {t['id']: t['name'] for t in json.load(open(os.path.join(OW, 'tileset.json')))['tiles']}
# clear trees in the footprint (base in decoration, canopy in overlay on the row above)
for y in range(oy, oy + gh):
    for x in range(ox, ox + gw):
        if names.get(Ly['decoration'][y][x]) == 'tree_base':
            Ly['decoration'][y][x] = 0
            if names.get(Ly['overlay'][y - 1][x]) == 'tree_top': Ly['overlay'][y - 1][x] = 0
for layer in ('decoration', 'overlay'):
    for k, i in L['cells'][layer].items():
        rx, ry = map(int, k.split(',')); x, y = ox + rx, oy + ry
        if layer == 'decoration' and y >= 37 and names.get(Ly['decoration'][y][x]) == 'tree_base': continue
        if layer == 'overlay' and Ly['overlay'][y][x] and names.get(Ly['overlay'][y][x]) == 'tree_top' and y >= 36: continue
        Ly[layer][y][x] = BASE + i
for x, y in L['walk']:
    if y >= 37 and names.get(Ly['decoration'][y][x]) == 'tree_base': continue
    if Ly['collision'][y][x] in (0, 1): Ly['collision'][y][x] = 0
    if 'encounter' in Ly: Ly['encounter'][y][x] = 0
for x, y in L['block']: Ly['collision'][y][x] = 1
for n in m['npcs']:
    if n['id'] == 'dash_coach':
        n.update(x=50, y=28, facing='left', kind='coach', note='sports: coach at the Brookhollow Dash Track gate (bottom-right, dirt path off the cobble path). Talk opens the dash venue (src/sports/index.js).')
json.dump(m, open(p, 'w'), separators=(',', ':')) if open(p).read(200).count('\n') < 2 else json.dump(m, open(p, 'w'), indent=2)
print('ok', R)
