"""Tidewater Coast town identity pass (Coder, Oct 30 2026; kilumen_town_identity.md §3, APPROVED).
Storm harbour: a horizontal shoreline with the town in a crescent around the harbour, wet-slate cobbled streets,
a central slipway (x26-27) down to the open south channel, a long thin breakwater pier (x35) where Old Gus stands
at its head and Ron sits at its end, lantern posts and rope barrels on the sea wall, the hall up a flight of steps.
Breaks the frostspire/tidewater template: town sign moves from (24,21) to the west gate (16,24), the hall sign
from (18,26) to the hall door (20,31). Doors, warps and the x26-27 channel are unchanged.
Re-run: python3 tools/towns/build_tidewater_coast.py  (idempotent: starts from the map at BASE)."""
import json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
BASE = os.environ.get('TOWN_BASE', '1312ac7c')
m = json.loads(subprocess.check_output(['git', 'show', f'{BASE}:kilumen/art/world/overworld/maps/tidewater_coast.json'], cwd=ROOT))
L = m['layers']; G, D, C, E = L['ground'], L['decoration'], L['collision'], L['encounter']
slate = lambda x, y: 9 + (x * 5 + y * 3) % 4            # path_0..3: wet slate cobbles
def walk(x, y, g=None):
    C[y][x] = 0; D[y][x] = 0; E[y][x] = 0
    if g is not None: G[y][x] = g
def block(x, y, d):
    D[y][x] = d; C[y][x] = 1; E[y][x] = 0
# 1. cobbled harbour street (rows 22-23, west gate to the east end) and the slipway lane (x26-27, rows 12-32)
for y in (22, 23):
    for x in range(0, 42):
        if C[y][x] == 0: G[y][x] = slate(x, y)
for y in range(12, 33):
    for x in (26, 27):
        if C[y][x] == 0: G[y][x] = slate(x, y)
# 2. the sea wall (row 32) is cobbles too; the slipway runs down onto the water as stairs
for x in range(12, 42):
    if C[32][x] == 0: G[32][x] = slate(x, 32)
for x in (26, 27): D[32][x] = 543
# 3. crescent: the harbour bites into the beach at both ends (west corner, east corner kept clear of trainer sight)
for x, y in [(12, 31), (12, 32), (13, 32)]:
    G[y][x] = 33; D[y][x] = 0; C[y][x] = 3; E[y][x] = 0
# 4. breakwater pier: thin planks south from the sea wall at x35 (Old Gus beside its head, Ron's seat at the end)
for y in (33, 34, 35):
    G[y][35] = 33; D[y][35] = 541 if y % 2 else 542; C[y][35] = 0; E[y][35] = 0
# 5. lantern posts and rope barrels / lobster pots along the sea wall
for x in (24, 29, 34, 38): block(x, 32, 514)
for x in (15, 18, 31): block(x, 32, 885)
# 6. the hall up the hill: steps at its door landing
D[31][22] = 543
# 7. move the template signs
for s in m['signs']:
    if s['id'] == 'tidewater_coast_sign': old, new = (24, 21), (16, 24)
    elif s['id'] == 'tidewater_hall_int_sign_hall_outside': old, new = (18, 26), (20, 31)
    else: continue
    ox, oy = old; D[oy][ox] = 0                       # keep the wall it stood on (collision unchanged)
    s['x'], s['y'] = new; block(*new, 513)
    s['text'] = s['text'].replace('(12,20)', '(22,30)')
m['town_identity'] = 'tools/towns/build_tidewater_coast.py (Oct 30 2026): storm harbour crescent, slipway, breakwater pier, cobbled sea wall'
cells = {(n['x'], n['y']) for n in m['npcs'] + m['items']}
for x, y in cells:
    if C[y][x] not in (0,): print('on block', x, y, C[y][x])
for w in m['warps']:
    x, y = w['x'], w['y'] + 1
    if C[y][x] != 0: print('door landing blocked', w)
open(os.path.join(MAPS, 'tidewater_coast.json'), 'w').write(json.dumps(m, indent=1, ensure_ascii=False) + '\n')
