#!/usr/bin/env python3
"""Aurelith east gate rebuild (Gary, Oct 30 2026 live shots: gate sat on the road, trees over its walls, stacked pieces).
The 4x8 x_city_gate_e kit = gatehouse (rows 0-3) + passage (rows 4-5, lanterns, walkable) + south tower (rows 6-7).
Rail Boulevard runs y27-29, so: gatehouse y23-26 on the grass north of the road, passage art y27-28 over the road
(overlay, walk), y29 plain road, south tower y30-31. Collision only on the two towers. Trees cleared from a 1-square
ring round the structure (x75-80, y22-33) so no canopy overlaps it. Idempotent."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = os.path.join(ROOT, 'art/world/overworld/maps/aurelith.json')
GATE0, X0 = 10773, 76
TREES = {546, 547}
j = json.load(open(P)); L = j['layers']
gate_ids = set(range(GATE0, GATE0 + 32))
for y in range(len(L['decoration'])):            # lift the old gate (wherever it was)
    for x in range(len(L['decoration'][0])):
        for l in ('decoration', 'overlay'):
            if L[l][y][x] in gate_ids:
                L[l][y][x] = 0
                if L['collision'][y][x] == 1: L['collision'][y][x] = 0
for y in range(22, 34):                           # 1-square ring of no trees
    for x in range(75, 81):
        hit = False
        for l in ('decoration', 'overlay'):
            if L[l][y][x] in TREES: L[l][y][x] = 0; hit = True
        if hit: L['collision'][y][x] = 0
place = {23: 0, 24: 1, 25: 2, 26: 3, 27: 4, 28: 5, 30: 6, 31: 7}   # map row -> kit row
for y, r in place.items():
    for c in range(4):
        tid = GATE0 + r * 4 + c
        if r in (4, 5):
            L['overlay'][y][X0 + c] = tid; L['collision'][y][X0 + c] = 0
        else:
            L['decoration'][y][X0 + c] = tid; L['collision'][y][X0 + c] = 1
# Plaza paving round the gate (Gary 4:47 PM CT: "the ground around the gate must use the stone plaza like live main, not grass").
# x56-75 y18-39 gets live main's exact ground tiles back (10894 top edge / 10893 fill / 10897 bottom edge, road+kerb rows untouched);
# the gatehouse + cleared ring x76-80 y22-33 is paved with the same tile main uses in that row at x75. Grass-only dressing
# (flowers 505/506, tree 11000-11003) on the re-paved block goes; props (lamps, benches, planters) stay. Road rows 27-29 never touched.
_mg = {18:None,19:None,20:10894,26:10897,27:None,28:None,29:None,30:10894,39:10897}
def main_row(y): return _mg.get(y, 10893)
import subprocess
try:
    MAIN = json.loads(subprocess.check_output(['git','show','origin/main:./art/world/overworld/maps/aurelith.json'], cwd=ROOT, stderr=subprocess.DEVNULL))['layers']['ground']
except Exception: MAIN = None
G = L['ground']; GRASSY = {505, 506, 11000, 11001, 11002, 11003}
for y in range(18, 40):
    for x in range(56, 76):
        t = MAIN[y][x] if MAIN else main_row(y)
        if t is None or y in (27, 28, 29): continue
        G[y][x] = t
        for l in ('decoration', 'overlay'):
            if L[l][y][x] in GRASSY:
                L[l][y][x] = 0
                if l == 'decoration': L['collision'][y][x] = 0
for y in range(22, 34):
    if y in (27, 28, 29): continue
    for x in range(76, 81): G[y][x] = MAIN[y][75] if MAIN else main_row(y)
for y in (27, 28, 29):                           # road through the arch stays walkable edge to edge
    for x in range(66, len(L['collision'][0])): assert L['collision'][y][x] == 0, (x, y, L['collision'][y][x])
# tidy cut tree edges (live_flags F1_half): a canopy left above a cleared trunk goes; a trunk left below a cleared canopy gets its canopy back
for _y in range(20, 36):
    for _x in range(74, 82):
        if L['overlay'][_y][_x] == 546 and L['decoration'][_y + 1][_x] != 547: L['overlay'][_y][_x] = 0
        if L['decoration'][_y][_x] == 547 and L['overlay'][_y - 1][_x] != 546 and not (23 <= _y - 1 <= 31 and 76 <= _x <= 79): L['overlay'][_y - 1][_x] = 546; L['collision'][_y - 1][_x] = 1  # whole tree blocks, no straight trunk edge
json.dump(j, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print('east gate rebuilt at x76-79 y23-31')
