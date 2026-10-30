"""Revival Heights, bring the town to life (Coder, Oct 30 2026; Gary 10:52-10:53 AM CT: decor, ponds, flower fields,
statues, other buildings, small shop stalls; "a little more grass a little less hard concrete").
Overrides kilumen_town_identity.md §1 "no grass / no water" per Gary. Company Boulevard is a 2-wide road (rows 19-20) with
grass verges and tree lines, Tower Avenue (x28-29) stays paved (Coder, Oct 30 2026: ~55% grass, one landmark per screen); the empty paved lots become grass, flower beds, stone paths and a pond.
Order: CAVE_POCKETS_BASE=3a39a391 python3 tools/map_audit/cave_pockets.py revival_heights, then this script (in place), then tools/map_audit/fix_live_flags.py revival_heights.
Doors, warps and the RT guard checkpoint (29,29) are unchanged."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'art/world/overworld/maps/revival_heights.json')
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}; TS_NAME = {t['id']: t['name'] for t in TS['tiles']}
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

# 4. (Gary 11:10 AM CT) the logging cabin at the south-west tree edge: a clearing cut into the forest (rows 31-34), the cabin,
#    a woodpile, stumps and an axe block, and a logger arguing with a Topiarix (Trail Revival native, single-stage Kilu)
def clear(x, y):                                     # fell a forest tree: its base at (x,y), its canopy top drawn at (x,y-1)
    if L['decoration'][y][x] == ID['tree_base']: L['decoration'][y][x] = 0
    if L['overlay'][y - 1][x] == ID['tree_top']: L['overlay'][y - 1][x] = 0
    if C[y][x] == 1 and not L['decoration'][y][x]: C[y][x] = 0
    grass(x, y)
def obj(x, y, name, layer='decoration'):
    assert C[y][x] == 0 and (x, y) not in WARPS, (x, y, name); L[layer][y][x] = ID[name]; C[y][x] = 1
rect(15, 31, 26, 34, clear); rect(31, 31, 43, 34, clear)
for r in range(3):
    for c in range(3): obj(15 + c, 31 + r, f'tl_cabin_{r}_{c}')     # door (16,33) is drawn closed: no interior, no warp
obj(18, 33, 'tl_woodpile'); obj(21, 32, 'tl_axe_block')
for x, y in ((19, 31), (23, 31), (25, 33)): obj(x, y, 'i_log_stool')  # stumps of the trees he has already felled
obj(25, 31, 'i_crates_0_0'); obj(26, 31, 'i_crates_0_1')
for x in range(14, 44):                              # the felled canopy row 30 hid asphalt under the old lamps: lawn there too
    if 'asphalt' in TS_NAME.get(L['ground'][30][x], ''): L['ground'][30][x] = ID[f'grass_{vh(x, 30)}']
# 5. small details: kitchen gardens, a laundry line, a dog house, mailboxes, a notice board, crates by the grocer, kids
for x, n in ((31, 'tl_garden_patch'), (32, 'tl_garden_patch_b'), (33, 'tl_garden_patch')): obj(x, 32, n)
for x, n in ((36, 'tl_laundry_l'), (37, 'tl_laundry_m'), (38, 'tl_laundry_r')): obj(x, 31, n)
obj(41, 32, 'tl_dog_house'); obj(42, 31, 'i_crates_0_0'); obj(43, 31, 'i_crates_0_1')
for x in (15, 33, 40): obj(x, 28, 'tl_mailbox')     # one beside each family house door on the south walk
obj(27, 28, 'x_city_notice')
NEW = [('revival_heights_logger', 22, 33, 'right', 'villager', 'logger by his cabin, mid-argument with the Topiarix (it will not let him fell the last tree)'),
       ('revival_heights_tree_kilu', 24, 33, 'left', 'villager', 'a wild Topiarix (Kilu, grass, single stage) planted in front of the logger; overworld art only, no battle'),
       ('revival_heights_kid_hopscotch', 35, 33, 'down', 'villager', 'kid playing hopscotch by the gardens'),
       ('revival_heights_kid_dog', 40, 33, 'up', 'villager', 'kid calling the dog out of its house')]
for i, x, y, f, k, note in NEW:
    assert C[y][x] == 0, (i, x, y)
    m['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': f, 'kind': k, 'static': True, 'note': note,
                      'text_ref': f'data/textbot_logger_scene.json maps.revival_heights.{i}'})
# 6. (Coder review of 0e9b8e6a, 11:21 AM CT) ONE cave mouth: Server Nook is a plain town cave with its mouth at 45,17 (rock
#    face above the y18 walk). The old mouth over the glass building (43,8) and the pocket door in the east lot (52,10) go back
#    to forest; the old nook floor 48-55,11-16 becomes the open east park and market (Sixten and the fan stay there as town
#    content), the ledge at y17 becomes the park path, and both Vigor Seeds move into the cave interior.
import subprocess
BASE = json.loads(subprocess.check_output(['git', 'show', '3a39a391:kilumen/art/world/overworld/maps/revival_heights.json'], cwd=ROOT))
def restore(x, y):
    for k in ('ground', 'decoration', 'overlay', 'collision'): L[k][y][x] = BASE['layers'][k][y][x]
for x0, y0 in ((42, 7), (51, 9)): rect(x0, y0, x0 + 2, y0 + 1, restore)
m['warps'] = [w for w in m['warps'] if not (w.get('to') == 'revival_heights_cave_ne' and (w['x'], w['y']) != (45, 17))]
assert [(w['x'], w['y']) for w in m['warps'] if w.get('to') == 'revival_heights_cave_ne'] == [(45, 17)], m['warps']
for w in m['warps']:
    if w.get('to') == 'revival_heights_cave_ne': w.pop('pocket', None)   # plain town cave mouth, no pocket link
WARPS = {(w['x'], w['y']) for w in m['warps']}
def lawn(x, y):
    L['ground'][y][x] = ID[f'grass_{vh(x, y)}']; L['decoration'][y][x] = 0; L['overlay'][y][x] = 0; C[y][x] = 0
rect(48, 11, 55, 16, lawn); rect(49, 17, 51, 17, lawn)
rect(50, 11, 50, 18, path); rect(48, 14, 55, 14, path); rect(44, 18, 51, 18, path)
L['decoration'][11][48] = 509; C[11][48] = 1                     # the humming fan (Easter egg) on its server box
prop(52, 11, 'x_city_stall_crystal_0_0'); prop(53, 11, 'x_city_stall_crystal_1_0')
prop(48, 15, 'x_city_stall_toys_0_0'); prop(49, 15, 'x_city_stall_toys_1_0')
prop(49, 13, 'x_city_bench_h'); prop(53, 16, 'x_city_bench_h')
for x, y in ((48, 16), (55, 16)): prop(x, y, 'x_city_tree_base'); L['overlay'][y - 1][x] = ID['x_city_tree_top']
for x, y in ((51, 12), (54, 12), (51, 16), (52, 16), (54, 15), (51, 13)): flowers(x, y)
# narrower side roads: the lanes between the houses and the east lane keep one stone strip, the other half is lawn / hedge
for x in (20, 36, 42): rect(x, 23, x, 27, grass)
for y in (9, 10, 11, 15, 16, 17):
    if C[y][42] == 0: prop(42, y, 'x_city_hedge')
for x, y in ((43, 9), (43, 10)): flowers(x, y)
MORE = [('revival_heights_stall_crystal', 53, 12, 'up', 'crystal stall in the east park'),
        ('revival_heights_stall_toys', 49, 16, 'up', 'toy stall in the east park')]
for i, x, y, f, note in MORE:
    assert C[y][x] == 0, (i, x, y)
    m['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': f, 'kind': 'townsfolk', 'stall_shop': True,
                      'note': note + ' (talk opens the RT Supply shop list, src/systems/index.js stall_shop)',
                      'text_ref': f'data/textbot_revival_heights_park.json maps.revival_heights.{i}'})
for i, x, y, note in (('revival_heights_stroller_park', 52, 14, 'strolls round the east park'),
                      ('revival_heights_stroller_walk', 34, 29, 'strolls the south walk past the stalls')):
    assert C[y][x] == 0, (i, x, y)
    m['npcs'].append({'id': i, 'x': x, 'y': y, 'facing': 'down', 'kind': 'villager', 'note': note,
                      'text_ref': f'data/textbot_revival_heights_park.json maps.revival_heights.{i}'})
seeds = [i for i in m['items'] if i['id'] in ('r9_rhp_seed', 'rhp_servers_seed_visible')]
m['items'] = [i for i in m['items'] if i not in seeds]
CP = os.path.join(ROOT, 'art/world/overworld/maps/revival_heights_cave_ne.json'); cv = json.load(open(CP))
cv['warps'] = [dict(w, tx=45, ty=18) for w in cv['warps'] if not w.get('pocket')]
for k in ('ground', 'decoration', 'collision'): cv['layers'][k][2][7] = cv['layers'][k][2][6]
cv.pop('pocket', None); cv['town_cave'] = 'Server Nook: one mouth (revival_heights 45,17); the old pocket exit 7,2 is walled'
for it, (x, y) in zip(seeds, ((10, 7), (4, 3))):
    assert cv['layers']['collision'][y][x] == 0; cv['items'].append(dict(it, x=x, y=y))
json.dump(cv, open(CP, 'w'), indent=1)
# 7. (cozy_map_lessons.md, Coder Oct 30 2026) a 4x3 pond and a 4x4 three-colour flower field in the south-east clearing
#    (forest felled at rows 35-36, x31-41; rows 37-39 stay as the tree border), landmarks per screen, scatter on long runs
for y in (35, 36):
    for x in range(31, 42): clear(x, y)
pond(31, 34, 34, 36)
FL = ['flowers_violet', 'flowers_warm', 'flowers_violet', 'flowers_warm']
for y in range(33, 37):
    for x in range(37, 41):
        assert C[y][x] == 0, (x, y); grass(x, y); L['decoration'][y][x] = ID[FL[(x + y) % 4]]
L['decoration'][35][38] = ID['bush']; C[35][38] = 1                     # a bush in the middle: third colour, not a blank bed
prop(54, 13, 'x_city_statue')                                             # east park landmark
prop(24, 34, 'x_city_statue')                                             # south clearing landmark beside the cabin
for x, y in ((18, 29), (23, 29), (31, 29), (42, 34), (16, 34), (20, 34)): flowers(x, y)
# 8. (Coder, Oct 30 2026) narrow Company Boulevard to its 2-wide road (rows 19-20): the asphalt aprons (rows 21-22) and the
#    extra Tower Avenue lanes (x26-27, rows 14-18) become grass verges with a tree line; one landmark per screen
#    (tools/towns/town_landmarks_art.py): a clock tower on the north verge, a gazebo on a new east green, a big old tree at the
#    west gate. Lanes between the houses (x19-20, 35-36, 42-43) stay open through the tree line.
for y in range(13, 23):
    for x in range(14, 44):
        if (y >= 21 or (y <= 18 and x in (26, 27))) and 'asphalt' in TS_NAME.get(L['ground'][y][x], ''): grass(x, y)
GAPS = {19, 20, 35, 36, 42, 43}
FEAT = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots') for o in m.get(k) or [] if 'x' in o}
def free(x, y): return C[y][x] == 0 and (x, y) not in WARPS and (x, y) not in FEAT and not L['decoration'][y][x]
for x in (15, 18, 31, 34, 38, 41):                               # tree line on the south verge (row 22)
    if x not in GAPS and free(x, 22) and L['overlay'][21][x] == 0:
        prop(x, 22, 'x_city_tree_base'); L['overlay'][21][x] = ID['x_city_tree_top']
def block(x0, y0, name, w, h):
    for r in range(h):
        for c in range(w):
            x, y = x0 + c, y0 + r; assert C[y][x] == 0 and (x, y) not in WARPS and (x, y) not in FEAT, (x, y, name)
            L['decoration'][y][x] = ID[f'{name}_{r}_{c}']; C[y][x] = 1
block(26, 15, 'lm_clock_tower', 2, 3)                            # centre screen: clock tower where the extra lanes were
rect(44, 19, 51, 22, clear)                                      # east green felled out of the forest by the boulevard end
block(46, 20, 'lm_gazebo', 3, 2)
for x, y in ((45, 22), (49, 22), (50, 19), (44, 20)): flowers(x, y)
def verge(x, y):
    if L['decoration'][y][x] == ID['bush']: L['decoration'][y][x] = 0; C[y][x] = 0
    clear(x, y)
rect(4, 21, 13, 22, verge)                                       # west approach: the hedge and first tree row become a verge
for x, y in ((5, 21), (9, 22), (12, 21)): flowers(x, y)
rect(8, 17, 13, 18, clear)                                       # west gate: the big old tree in a small clearing
block(10, 17, 'lm_big_tree', 2, 2)
for x, y in ((9, 18), (12, 18)): flowers(x, y)
m['living_town'] = 'tools/towns/build_revival_heights_living.py (Oct 30 2026): lawns, pond, flower beds, cafe, statue, 3 market stalls, logging cabin scene, gardens, laundry, dog house, mailboxes, notice board, kids, east park market (one cave mouth 45,17)'
json.dump(m, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print('ok')
