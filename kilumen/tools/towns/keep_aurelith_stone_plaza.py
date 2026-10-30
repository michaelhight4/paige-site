#!/usr/bin/env python3
"""Keep Aurelith's north stone plaza paved (Gary, Oct 30 2026: 'this look is completely acceptable without grass').
Copies every layer for the plaza band x12-75, y7-17 (capitol, stadium, museum forecourt) from a reference
aurelith.json (live main a32be234) over the current map; the rest of the city keeps its greenery.
Usage: python3 tools/towns/keep_aurelith_stone_plaza.py <reference_aurelith.json>"""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = os.path.join(ROOT, 'art/world/overworld/maps/aurelith.json')
X0, X1, Y0, Y1 = 12, 75, 7, 17
ref = json.load(open(sys.argv[1])); j = json.load(open(P))
for l, g in j['layers'].items():
    if not isinstance(g, list) or l not in ref['layers']: continue
    for y in range(Y0, Y1 + 1):
        for x in range(X0, X1 + 1): g[y][x] = ref['layers'][l][y][x]
inside = lambda o: X0 <= o.get('x', -1) <= X1 and Y0 <= o.get('y', -1) <= Y1
for k in ('npcs', 'signs', 'items', 'spots', 'interact_spots'):
    if isinstance(j.get(k), list):
        new_in = [o for o in j[k] if inside(o)]
        ref_in = [o for o in ref.get(k, []) if inside(o)]
        keep = [o for o in new_in if k == 'npcs' and 'stroller' in o.get('id', '') and ref['layers']['collision'][o['y']][o['x']] == 0 and o['id'] not in {r.get('id') for r in ref_in}]  # people on stone are fine
        j[k] = [o for o in j[k] if not inside(o)] + ref_in + keep
        if new_in or ref_in: print(k, 'plaza band:', len(new_in), '->', len(ref_in))
# a stone planter on each side edge breaks the straight tree-column edge (live_flags F1_edge) without greening the plaza
sys.path.insert(0, os.path.join(ROOT, 'tools/map_audit')); import live_flags as F
PL = next(i for i, n in F.NM.items() if n == 'x_city_planter') if isinstance(F.NM, dict) else None
for (px, py) in ((12, 12), (75, 12)):
    if PL is not None and j['layers']['collision'][py][px] == 0 and not j['layers']['decoration'][py][px]:
        j['layers']['decoration'][py][px] = PL; j['layers']['collision'][py][px] = 1
# one more Games fan on the paved east plaza: the paved band adds walkable ground, and R7 wants >= 1 NPC per 100 walkable cells
if not any(n['id'] == 'aurelith_fan_3' for n in j['npcs']):
    assert j['layers']['collision'][12][58] == 0
    j['npcs'].append({'id': 'aurelith_fan_3', 'kind': 'villager', 'note': 'Games fan on the paved east plaza (reuses fan_2 line)', 'text_ref': 'overworld_lines.json maps.aurelith.aurelith_fan_2', 'x': 58, 'y': 12, 'facing': 'left', 'sprite': 'vil_fan_m'})
json.dump(j, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print('north plaza restored from', sys.argv[1])
