"""Revival Heights town identity pass (Coder, Oct 30 2026; kilumen_town_identity.md §1, APPROVED).
Company town: strict paved grid, no grass, RT glass tower (Head Office) on the north edge with its revolving door
closed (story gate, no warp), a plaza with the 6 PM fountain, trees only in square planters. Doors and warps unchanged.
Re-run: python3 tools/towns/build_revival_heights.py  (idempotent: starts from the map at BASE)."""
import json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
BASE = os.environ.get('TOWN_BASE', '1312ac7c')
src = lambda n: json.loads(subprocess.check_output(['git', 'show', f'{BASE}:kilumen/art/world/overworld/maps/{n}.json'], cwd=ROOT))
m, A = src('revival_heights'), src('aurelith')
L, AL = m['layers'], A['layers']
K = ('ground', 'decoration', 'overlay', 'collision')
H, W = m['height'], m['width']
WALK = {0, 4, 7, 10}
def paste(ax, ay, w, h, x, y, skip_zero=False):
    for j in range(h):
        for i in range(w):
            for k in K:
                v = AL[k][ay + j][ax + i]
                if skip_zero and k != 'ground' and v == 0 and k != 'collision': continue
                L[k][y + j][x + i] = v
pave = lambda x, y: 10881 + (x * 7 + y * 13) % 4
for y in range(H):
    for x in range(W):
        if L['collision'][y][x] in WALK and not any(w['x'] == x and w['y'] == y for w in m['warps']):
            if y in (19, 20): L['ground'][y][x] = 10886 if y == 19 else 10885          # Company Boulevard (west gate)
            elif x in (28, 29): L['ground'][y][x] = 10887 if x == 28 else 10888        # Tower Avenue (north/south)
            else: L['ground'][y][x] = pave(x, y)
            L['decoration'][y][x] = 0
        L['encounter'][y][x] = 0
# north plaza (x14-27, y9-13): plaza flags + the obelisk fountain that switches off at 6 PM
for y in range(9, 14):
    for x in range(14, 28): L['ground'][y][x] = 10924
for j in range(2):  # obelisk top: overlay only, drawn over the border trees / plaza
    for i in range(8): L['overlay'][8 + j][16 + i] = AL['overlay'][33 + j][30 + i]
for j in range(4):  # obelisk base + basin
    for i in range(8):
        if AL['collision'][35 + j][30 + i] == 1:
            for k in ('decoration', 'collision'): L[k][10 + j][16 + i] = AL[k][35 + j][30 + i]
# RT Head Office glass tower on the north edge (x31-40, y9-13); revolving door (35-36,13) closed until the story allows
paste(63, 21, 10, 5, 31, 9)
for x in (35, 36): L['collision'][13][x] = 1
# square planters, a strict grid along the south strip and the plaza edge
for x, y in [(15, 30), (19, 30), (23, 30), (34, 30), (38, 30), (42, 30), (42, 9), (42, 13)]:
    L['decoration'][y][x] = 10931; L['collision'][y][x] = 1
m['town_identity'] = 'tools/towns/build_revival_heights.py (Oct 30 2026): company town, glass tower, plaza fountain, planters'
for it in m['items']:
    if (it['x'], it['y']) in {(x, y) for y in range(H) for x in range(W) if L['collision'][y][x] == 1}: print('item on wall', it)
for n in m['npcs'] + m['signs']:
    if L['collision'][n['y']][n['x']] == 1 and n in m['npcs']: print('npc on wall', n.get('id'))
open(os.path.join(MAPS, 'revival_heights.json'), 'w').write(json.dumps(m, indent=1, ensure_ascii=False) + '\n')
