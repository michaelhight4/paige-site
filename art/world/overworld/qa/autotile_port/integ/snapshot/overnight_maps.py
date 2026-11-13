# DRAFT - World Design overnight maps (Oct 23 2026, 00:40 CT onward). NOT LIVE.
# Format: an overworld/maps_new/*.py hook (tools/run.py executes it with its globals: Map, MAPS, helpers, BYNAME, MULTI ...).
# Staged copy: qa/overnight_maps/staging/overnight_maps.py ; tested in qa/overnight_maps/staging/sandbox/overworld/maps_new/zz_overnight.py
# Ids: every entity id starts with its map name. NPCs/signs are *_pending (Text Bot keys maps.<map>.<id> requested).
# Encounter tables <map>_grass etc. live in encounters_overnight.json (placeholder species, TODO_ROSTER).
import random
ON = {}          # name -> Map, in story order
ON_ORDER = []
SRC = 'qa/overnight_maps (World Design overnight DRAFT, Oct 23 2026)'
OPP = {'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east'}

def new(name, w, h, base='grass', title=''):
    m = Map(name, w, h, base=base, title='DRAFT - ' + title)
    m.npcs_pending = []; m.signs_pending = []; m.source = SRC; m.field_obstacles = []; m.hooks = []; m.draft = True; m.trail_cells = set()
    MAPS.append(m); ON[name] = m; ON_ORDER.append(name); return m
def pn(m, id, x, y, facing, kind, note=''):
    assert id.startswith(m.name), id
    m.npcs_pending.append(dict(id=id, x=x, y=y, facing=facing, kind=kind, note='DRAFT: ' + note))
def ps(m, id, x, y, text):
    assert id.startswith(m.name), id
    m.signs_pending.append(dict(id=id, x=x, y=y, text='DRAFT dev label: ' + text)); m.deco[y][x] = 'sign'
def it(m, id, x, y, hidden, what):
    assert id.startswith(m.name), id
    item(m, id, x, y, hidden, what + ' (DRAFT pickup; Game dev owns the final item)')
_M0 = {mm.name: mm for mm in MAPS}
def link(a, ea, sa, b, sb, n=2, note=''):
    """a's edge ea cells sa..sa+n-1 <-> b's opposite edge sb..; writes both sides when both are overnight maps."""
    A = ON[a] if a in ON else None; B = ON[b] if b in ON else None
    if A is not None: A.exit(ea, sa, sa + n - 1, b, sb - sa, 'DRAFT ' + note)
    if B is not None: B.exit(OPP[ea], sb, sb + n - 1, a, sa - sb, 'DRAFT ' + note)

# ---------------- outdoor route template ----------------
def seg_cells(pts):
    out = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if y0 == y1:
            for x in range(min(x0, x1), max(x0, x1) + 2): out += [(x, y0), (x, y0 + 1)]
        else:
            assert x0 == x1, (x0, y0, x1, y1)
            for y in range(min(y0, y1), max(y0, y1) + 2): out += [(x0, y), (x0 + 1, y)]
    return out
def route(name, w, h, title, paths, base='grass', trail='trail', band=3, dark=False):
    m = new(name, w, h, base, title); m.trees(0, 0, w - 1, h - 1, dark)
    T = set()
    for pts in paths: T |= {(x, y) for x, y in seg_cells(pts) if 0 <= x < w and 0 <= y < h}
    for x, y in T:
        for yy in range(max(2, y - band), min(h - 3, y + band) + 1):
            for xx in range(max(2, x - band), min(w - 3, x + band) + 1): m.clear(xx, yy, xx, yy)
    for x, y in T: m.clear(x, y, x, y, trail)
    m.trail_cells = T; m.dark = dark; return m
def choke(m, x0, y0, x1, y1):
    """re-plant trees in the box except on the trail (walls on both sides of a forced strip / gate)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) not in m.trail_cells: m.clear(x, y, x, y); m.tree(x, y, m.dark)
def is_open(m, x, y):
    return 2 <= x < m.w - 2 and 2 <= y < m.h - 2 and m.deco[y][x] is None and (x, y) not in m.trail_cells and m.terr[y][x] == m.base
def patches(m, n, table, seed, size=(4, 3)):
    rnd = random.Random(seed); got = 0; tries = 0
    while got < n and tries < 4000:
        tries += 1; pw, ph = size if rnd.random() < .5 else (size[1], size[0])
        x0, y0 = rnd.randrange(2, m.w - 2 - pw), rnd.randrange(2, m.h - 2 - ph)
        cells = [(x, y) for x in range(x0, x0 + pw) for y in range(y0, y0 + ph)]
        if not all(is_open(m, x, y) for x, y in cells): continue
        # keep at least one open row/col between patch and trail on one side: require a trail-adjacent neighbour so it reads as roadside grass
        for x, y in cells: m.deco[y][x] = 'tall_grass'
        m.enc_zones.append(dict(x0=x0, y0=y0, x1=x0 + pw - 1, y1=y0 + ph - 1, table=table, note='DRAFT TODO_ROSTER'))
        got += 1
    return got
def trail_side_spots(m, k, seed):
    """k open cells directly beside the trail (trainer / NPC spots), spread along it."""
    rnd = random.Random(seed); C = []
    for x, y in sorted(m.trail_cells):
        for dx, dy, f in ((0, -1, 'down'), (0, 1, 'up'), (-1, 0, 'right'), (1, 0, 'left')):
            if is_open(m, x + dx, y + dy) and m.deco[y + dy][x + dx] is None: C.append((x + dx, y + dy, f))
    rnd.shuffle(C); out = []
    for c in C:
        if all(abs(c[0] - o[0]) + abs(c[1] - o[1]) >= 7 for o in out): out.append(c)
        if len(out) == k: break
    return out
def far_spots(m, k, seed):
    rnd = random.Random(seed); C = [(x, y) for y in range(m.h) for x in range(m.w) if is_open(m, x, y) and
                                   min(abs(x - a) + abs(y - b) for a, b in m.trail_cells) >= 3]
    rnd.shuffle(C); out = []
    for c in C:
        if all(abs(c[0] - o[0]) + abs(c[1] - o[1]) >= 6 for o in out): out.append(c)
        if len(out) == k: break
    return out
def pocket(m, kind, idn, what, seed):
    """optional side pocket closed by a field obstacle: brush (Brushbreak), boulder (boulder push/Stonebreak hook), water (Tideglide)."""
    rnd = random.Random(seed); cand = []
    tree = lambda x, y: 0 <= x < m.w and 0 <= y < m.h and m.deco[y][x] in ('tree_base', 'treed_base')
    for y in range(3, m.h - 3):
        for x in range(3, m.w - 3):
            if not tree(x, y): continue
            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                if not is_open(m, x - dx, y - dy): continue
                px, py = (1, 0) if dx == 0 else (0, 1)
                P = [(x + dx, y + dy), (x + 2 * dx, y + 2 * dy), (x + dx + px, y + dy + py), (x + 2 * dx + px, y + 2 * dy + py)]
                if not all(2 < a < m.w - 3 and 2 < b < m.h - 3 and tree(a, b) for a, b in P): continue
                ring = {(a + ex, b + ey) for a, b in P for ex, ey in ((0, 1), (0, -1), (1, 0), (-1, 0))} - set(P) - {(x, y)}
                if all(tree(a, b) for a, b in ring): cand.append((x, y, dx, dy, P))
    if not cand: return None
    x, y, dx, dy, P = rnd.choice(cand)
    for a, b in P: m.clear(a, b, a, b)
    m.clear(x, y, x, y)
    skill = {'brush': ('bush', 'Brushbreak (F1)', 'cuttable brush'), 'boulder': ('boulder', 'boulder push / Stonebreak (F3)', 'boulder'),
             'water': (None, 'Tideglide (F2)', 'water crossing')}[kind]
    if kind == 'water':
        m.terr[y][x] = 'water'; m.terr[P[0][1]][P[0][0]] = 'water'; m.terr[P[2][1]][P[2][0]] = 'water'
    else: m.deco[y][x] = skill[0]
    it(m, f'{m.name}_{idn}', P[1][0], P[1][1], False, what)
    m.field_obstacles.append(dict(id=f'{m.name}_{kind}_{idn}', kind=kind, x=x, y=y, skill=skill[1], what=skill[2],
                                  opens=f'{m.name}_{idn}', optional=True, pocket_cells=[list(c) for c in P], coder_hook=f'field skill {skill[1]} not built in code (MECHANICS_PARITY F1-F3)'))
    return (x, y)
def fill_route(m, tables, n_patch, trainers, items, obstacles, seed, sign_at=None, sign_text=''):
    t = tables[0] if isinstance(tables, list) else tables
    patches(m, n_patch, t, seed)
    for i, (x, y, f) in enumerate(trail_side_spots(m, trainers, seed + 1)):
        pn(m, f'{m.name}_trainer_{i + 1}', x, y, f, 'trainer_hooded', 'route trainer, sight 3-4; roster = Game dev overnight_gd (TODO)')
    for i, (x, y) in enumerate(far_spots(m, items, seed + 2)):
        it(m, f'{m.name}_item_{i + 1}', x, y, i % 2 == 1, 'Berry Snack' if i % 2 else 'Crystal Shard')
    for i, k in enumerate(obstacles): pocket(m, k, f'pocket_{i + 1}', 'Glow Remedy', seed + 10 + i)
    if sign_at: ps(m, f'{m.name}_sign', sign_at[0], sign_at[1], sign_text)

# ---------------- town template (34 x 26) ----------------
SLOTS_X = (2, 9, 18, 25)
DOORS = {'heal_centre': ('heal_brookhollow', 6, 8, 'shared RT heal branch'), 'shop': ('shop_int', 5, 7, 'shared RT Supply shop'),
         'x_station': ('station_int', 9, 11, 'shared Lumen Line station')}
def town(name, title, base, exits, top, bottom, rail_only=False, sea=False):
    w, h = 34, 26; m = new(name, w, h, base, title); border(m)
    m.clear(2, 12, 31, 13, 'path'); m.clear(2, 21, 31, 22, 'path'); m.clear(16, 2, 17, 23, 'path')
    if sea:
        m.clear(2, 24, 31, 25); m.rect(2, 23, 31, 25, 'water')
    for e in exits:
        if e == 'west': m.clear(0, 12, 1, 13, 'path')
        if e == 'east': m.clear(32, 12, 33, 13, 'path')
        if e == 'north': m.clear(16, 0, 17, 1, 'path')
        if e == 'south': m.clear(16, 24, 17, 25, 'path')
    homes = 0; m.doors = {}
    for row, lst in ((0, top), (1, bottom)):
        for slot, kind, *tgt in lst:
            bw, bh = (7, 5) if kind == 'x_station' else MULTI[kind]; x = SLOTS_X[slot]; land = 12 if row == 0 else 21
            y = land - bh; dx, dy = x + bw // 2, y + bh - 1     # x_station door = x_station_4_3 (row 4, col 3), same bottom-centre rule
            if kind == 'x_station':                              # biomes_extra multi (not in build.MULTI): place cells by name
                for r in range(5):
                    for c in range(7): m.deco[y + r][x + c] = f'x_station_{r}_{c}'
            else: m.place(kind, x, y)
            if tgt: to, tx, ty, note = tgt[0], tgt[1], tgt[2], tgt[3]
            elif kind in DOORS: to, tx, ty, note = DOORS[kind]
            else: to, tx, ty, note = '@home_pool', 0, 0, 'shared home design (rotation 1 in 4 via interiors_merge.AREAS)'; homes += 1
            m.warp(dx, dy, to, tx, ty, 'up', 'DRAFT ' + note); m.doors[kind if kind != 'house_a' and kind != 'house_b' and kind != 'house_c' else f'home{len(m.doors)}'] = (dx, dy)
            if row == 0 and kind == 'heal_centre' and not rail_only: fly(m, dx, dy + 1, f'visited_{name}')
    for x in (5, 12, 21, 28):
        if m.deco[14][x] is None: m.deco[14][x] = 'lamp'
    for x in (3, 4, 29, 30):
        if m.deco[15][x] is None and not sea: m.deco[15][x] = 'flowers_warm'
    m.rail_only = rail_only; return m

# ---------------- hall template (16 x 18) ----------------
HALL_STYLE = {}
# ---- halls: built 1:1 from Coder's data/hall_puzzles/<zone>.json (+ data/masters.json) ----
import json as _json
HP_DIR = '/workspace/kilumen/data/hall_puzzles'; MASTERS = {h['zone']: h for h in _json.load(open('/workspace/kilumen/data/masters.json'))['halls']}
# static placeholder per puzzle char: (terrain or None, deco or None). Coder's JS runtime (src/progression/puzzles.js) owns the
# real mechanics + view; static collision = 'walkable in at least one puzzle state' (solid only for cells that are never walkable).
HP_SOLID = {'sluice': 'W', 'prism': 'PEr', 'gust': 'B', 'boardwalk': '1234~', 'tide': 'HO', 'lens': 'rgby', 'quench': 'T'}
HP_DECO = {'W': 'crystal_switch_off', 'P': 'crystal_switch_off', 'E': 'crystal', 'r': 'crystal', 'H': 'crystal_switch_off', 'O': 'crystal_switch_off',
           'T': 'crystal_switch_off', 'D': 'crystal_barrier_dim', '=': 'bridge_v', 'h': 'bridge_v', 's': 'bridge_v'}
HP_TERR = {'G': 'floor_arena', 'R': 'floor_carpet', 'L': 'floor_carpet', '_': 'floor_wood', 'a': 'floor_stone', 'b': 'floor_stone', 'c': 'floor_stone',
           'X': 'floor_stone', '1': 'floor_carpet', '2': 'floor_carpet', '3': 'floor_carpet'}
def hall(name, town_name, zone, title, floor='floor_stone', tide_lane='bridge_h'):
    P = _json.load(open(f'{HP_DIR}/{zone}.json')); M = MASTERS[zone]; grid = P['grid']; kind = P['kind']
    gw, gh = max(len(r) for r in grid), len(grid); W = max(gw, 11); ox, oy = (W - gw) // 2, 3; H = oy + gh + 5
    m = interior(name, W, H, 'iwall_hall', floor, 'DRAFT - ' + title); MAPS.remove(m); MAPS.append(m)
    m.npcs_pending = []; m.signs_pending = []; m.source = SRC; m.field_obstacles = []; m.hooks = []; m.draft = True; m.trail_cells = set()
    ON[name] = m; ON_ORDER.append(name)
    if ox: m.rect(0, oy, ox - 1, oy + gh - 1, 'iwall_hall')
    if W - ox - gw: m.rect(ox + gw, oy, W - 1, oy + gh - 1, 'iwall_hall')
    solid = HP_SOLID[kind]; find = lambda ch: [(x, y) for y, r in enumerate(grid) for x, c in enumerate(r) if c == ch]
    for gy, row in enumerate(grid):
        for gx, c in enumerate(row.ljust(gw, '#')):
            x, y = ox + gx, oy + gy
            if c == '#': m.rect(x, y, x, y, 'iwall_hall'); continue
            if kind == 'boardwalk' and c == '~': m.rect(x, y, x, y, 'water'); continue
            if kind == 'tide' and c == '~': m.deco[y][x] = tide_lane; continue
            if c in solid and (c not in HP_DECO or kind == 'lens'): m.deco[y][x] = 'crystal_switch_off'
            if c in HP_TERR: m.rect(x, y, x, y, HP_TERR[c])
            if c in HP_DECO and kind != 'lens': m.deco[y][x] = HP_DECO[c]
            if kind == 'gust' and c == 'B': m.deco[y][x] = 'crystal_switch_off'
            if kind == 'quench' and c == 'B': m.deco[y][x] = None; m.rect(x, y, x, y, 'floor_arena')
    (sgx, sgy), = find('S'); (ggx, ggy), = find('G')
    sx, sy, gx, gy = ox + sgx, oy + sgy, ox + ggx, oy + ggy
    # the ONLY cells that differ from the JSON: two border '#' cells opened (doorway below S, Master alcove above G)
    m.rect(sx, oy + gh - 1, sx, oy + gh - 1, floor); m.rect(gx, gy - 1, gx, gy - 1, 'floor_arena')
    flag = M['flag']; m.master_flag = flag; m.master_id = f'{name}_master'
    m.hall_puzzle = dict(src=f'data/hall_puzzles/{zone}.json', kind=kind, name_placeholder=P['name_placeholder'], solved_flag=P['solved_flag'],
                         puzzle_map_in_json=P['map'], origin=[ox, oy], grid_size=[gw, gh], start=[sx, sy], goal=[gx, gy],
                         opened_border_cells=[[sx, oy + gh - 1], [gx, gy - 1]], flag_on_win=flag, masters_json_hall_map=M['hall_map'],
                         note='DRAFT: map cell (ox+gx, oy+gy) == grid[gy][gx]; mechanics + view are the JS runtime; static collision = walkable in some state')
    ly = oy + gh   # lobby rows ly..H-1, door row H-1
    pn(m, m.master_id, gx, gy - 1, 'down', 'master', f"Master {M['master']['name_placeholder']} ({M['master']['id']}); battle at goal G after {P['solved_flag']}; win sets {flag}")
    side = lambda d: max(1, min(W - 2, sx + d)) if 1 <= sx + d <= W - 2 else sx - d
    spots = [(side(-2), ly + 1, 'right'), (side(2), ly + 2, 'left'), (side(-3), ly + 3, 'right'), (side(3), ly, 'left')]
    for i, t in enumerate(M['trainers']):
        x, y, f = spots[i]; pn(m, f'{name}_h{i + 1}', x, y, f, 'trainer_hooded', f"hall trainer {t['id']} ({t['name_placeholder']}), sight 3, team in data/masters.json")
    gxs = sx + 4 if sx + 4 <= W - 2 else sx - 4
    pn(m, f'{name}_guide', gxs, ly + 1, 'down', 'villager_scholar', f"stationary hall guide; explains '{P['name_placeholder']}'")
    m.deco[H - 1][sx] = 'door_mat'; mx2 = sx + 1 if sx + 1 <= W - 2 else sx - 1; m.deco[H - 1][mx2] = 'door_mat'
    door = ON[town_name].doors['masters_hall']
    for x in (sx, mx2): m.warp(x, H - 1, town_name, door[0], door[1] + 1, 'down', 'DRAFT exit to the hall door')
    for w in ON[town_name].warps:
        if w['to'] == name: w['tx'], w['ty'] = sx, H - 2
    return m

# =====================================================================================
# OUTDOOR MAPS, story order
# =====================================================================================
# 1 route_east (Brookhollow -> Aurelith; coast road branch south)
m = route('route_east', 40, 26, 'East Road (Brookhollow - Aurelith)', [[(0, 12), (10, 12), (10, 6), (24, 6), (24, 12), (38, 12)], [(30, 12), (30, 24)]])
choke(m, 33, 8, 37, 17)
forced_grass(m, 'fg_route_east_reeds', 34, 12, 36, 13, ('exit-west', 'exit-east'), 'route_east_reeds', 'tall_grass')
fill_route(m, 'route_east_grass', 5, 3, 3, ['brush', 'boulder'], 101, (3, 11), 'East Road - Aurelith ahead (rail city), coast road south')
link('route_east', 'west', 12, 'brookhollow', 12, note='Brookhollow east stub y12-13 (offset 0)')

# 2 aurelith (rail-only city; arena sealed until all_badges; Cindervale road south)
m = town('aurelith', 'Aurelith (rail city)', 'grass', ('west', 'east', 'north', 'south'),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'x_station'), (3, 'house_a')], [(0, 'house_b'), (1, 'house_c'), (3, 'house_a')], rail_only=True)
story_gate(m, 'gate_aurelith_arena', [(16, 1, 'crystal_barrier_lit', 'crystal_barrier_dim'), (17, 1, 'crystal_barrier_lit', 'crystal_barrier_dim')], 'all_badges',
           'all 8 challenge coins', 'arena sealed', 'arena open', 'barrier dims', 'none: endgame', ('exit-west', 'exit-north'))
m.exit('north', 16, 17, 'aurelith_arena', 0, 'TO COME (DRAFT): unbuilt arena stub (endgame); gate_aurelith_arena at row 1')
pn(m, 'aurelith_arena_doorman', 18, 2, 'left', 'guard', 'gate_aurelith_arena speaker (Text Bot proposed id arena_doorman; {coins})')
pn(m, 'aurelith_airspace_officer', 24, 14, 'up', 'guard', 'rail-only city officer (Text Bot rail_only.* held NPC restricted_airspace_officer)')
pn(m, 'aurelith_lucky_crystal_seller', 10, 14, 'down', 'clerk', 'held NPC lucky_crystal_seller (rail_only.*); sells nothing in DRAFT')
pn(m, 'aurelith_villager_1', 6, 23, 'up', 'villager'); pn(m, 'aurelith_villager_2', 27, 4, 'down', 'villager')
ps(m, 'aurelith_sign', 14, 11, 'Aurelith - arrivals by rail only'); ps(m, 'aurelith_arena_sign', 15, 3, 'Aurelith Arena - challenge coins required')
link('route_east', 'east', 12, 'aurelith', 12)

# 3 route_aurelith_saltmere
m = route('route_aurelith_saltmere', 40, 26, 'Salt Road (Aurelith - Saltmere)', [[(0, 12), (8, 12), (8, 18), (22, 18), (22, 8), (32, 8), (32, 12), (38, 12)]])
fill_route(m, 'route_aurelith_saltmere_grass', 6, 4, 3, ['brush'], 202, (3, 11), 'Salt Road - Saltmere east')
link('aurelith', 'east', 12, 'route_aurelith_saltmere', 12)

# 4 saltmere (town: hall, RT office -> has_bike, station, causeway east)
m = town('saltmere', 'Saltmere', 'grass', ('west', 'east', 'north'),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'x_station'), (3, 'house_a')],
         [(0, 'office', 'saltmere_office_int', 7, 7, 'story-unique: Revival Tech Saltmere office (parcel -> Courier Bike)'),
          (1, 'masters_hall', 'saltmere_hall_int', 7, 16, "Master's Hall (coin 2)"), (2, 'house_b'), (3, 'house_c')], sea=True)
pn(m, 'saltmere_causeway_local', 30, 14, 'left', 'villager', 'optional gate_saltmere_causeway speaker (Text Bot proposed causeway_local)')
pn(m, 'saltmere_fisher', 22, 23 - 1, 'down', 'villager', 'harbour flavour'); pn(m, 'saltmere_villager_1', 6, 4, 'down', 'villager')
ps(m, 'saltmere_sign', 14, 11, 'Saltmere - harbour town'); ps(m, 'saltmere_hall_sign', 8, 20, "Saltmere Master's Hall")
link('route_aurelith_saltmere', 'east', 12, 'saltmere', 12)
o = new('saltmere_office_int', 12, 9, 'floor_carpet', 'Revival Tech - Saltmere office (story-unique)'); o.rect(0, 0, 11, 2, 'iwall_office')
o.deco[4][4] = 'counter_shop_l'; o.deco[4][5] = 'counter_shop_m'; o.deco[4][6] = 'counter_shop_m'; o.deco[4][7] = 'counter_shop_r'
o.place('filing', 1, 1); o.place('bookcase', 8, 1); o.deco[3][10] = 'plant'; o.place('desk_pc', 1, 5); o.deco[6][2] = 'chair'
o.deco[8][7] = 'door_mat'; o.warp(7, 8, 'saltmere', ON['saltmere'].doors['office'][0], ON['saltmere'].doors['office'][1] + 1, 'down', 'DRAFT exit')
pn(o, 'saltmere_office_int_clerk', 5, 3, 'down', 'clerk', 'takes the Survey Parcel (needs has_survey_parcel) -> gives Courier Bike, sets has_bike (CRITICAL_PATH saltmere_office_clerk)')
pn(o, 'saltmere_office_int_coworker', 9, 6, 'left', 'villager')
o.rail_only = False

# 5 route_revival (Thornwood east stub y21-22 -> Revival Heights)
m = route('route_revival', 40, 30, 'Heights Road (Thornwood - Revival Heights)', [[(0, 21), (14, 21), (14, 10), (30, 10), (30, 12), (38, 12)]], dark=True)
fill_route(m, 'route_revival_grass', 6, 4, 3, ['boulder', 'brush'], 303, (3, 20), 'Heights Road - Revival Heights east')
link('route_revival', 'west', 21, 'thornwood', 21, note='Thornwood east stub y21-22 (offset 0)')

# 6 revival_heights (rail-only city: hall, station + pass clerk, south checkpoint, north Sunmeadow road)
m = town('revival_heights', 'Revival Heights (rail city)', 'grass', ('west', 'north', 'south'),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'x_station'), (3, 'house_a')],
         [(0, 'house_b'), (1, 'masters_hall', 'revival_hall_int', 7, 16, "Master's Hall (coin 3)"), (2, 'house_c'), (3, 'house_a')], rail_only=True)
story_gate(m, 'gate_revival_checkpoint', [(16, 24, 'rt_barricade', None), (17, 24, 'rt_barricade', None)], 'beat_master_revival',
           'revival_hall_int', 'checkpoint closed', 'checkpoint open', 'barricade removed', 'shortcut: Saltmere is reached via Aurelith first; checkpoint opens from inside after coin 3', ('exit-west', 'exit-south'))
pn(m, 'revival_heights_rt_guard', 18, 23, 'left', 'guard', 'gate_revival_checkpoint speaker (Text Bot proposed rt_guard_heights); opens from inside after coin 3')
pn(m, 'revival_heights_pass_clerk', 26, 14, 'up', 'clerk', 'gives Lumen Line Pass -> has_rail_pass (after beat_master_revival)')
pn(m, 'revival_heights_airspace_officer', 15, 14, 'right', 'guard', 'rail-only officer (restricted_airspace_officer)')
pn(m, 'revival_heights_lucky_crystal_seller', 4, 14, 'down', 'clerk', 'held NPC lucky_crystal_seller')
ps(m, 'revival_heights_sign', 14, 11, 'Revival Heights - Revival Tech HQ city')
link('route_revival', 'east', 12, 'revival_heights', 12)

# 7 route_revival_saltmere (Heights south checkpoint -> Saltmere north)
m = route('route_revival_saltmere', 26, 40, 'Checkpoint Road (Revival Heights - Saltmere)', [[(12, 0), (12, 10), (6, 10), (6, 24), (16, 24), (16, 38)]])
fill_route(m, 'route_revival_saltmere_grass', 6, 4, 3, ['brush'], 404, (14, 3), 'Checkpoint Road')
link('revival_heights', 'south', 16, 'route_revival_saltmere', 12); link('route_revival_saltmere', 'south', 16, 'saltmere', 16)

# 8 frostspire_pass (Greystone B1 north x20-21 -> Frostspire; collapsed bridge until coin 3)
m = route('frostspire_pass', 30, 40, 'Frostspire Pass', [[(20, 38), (20, 30), (10, 30), (10, 18), (14, 18), (14, 0)]], base='snow', trail='path')
for y in (21, 22):
    for x in range(2, 28):
        if m.deco[y][x] is None: m.terr[y][x] = 'water'
choke(m, 3, 25, 18, 29)
story_gate(m, 'gate_frostspire_bridge', [(10, 23, 'rt_barricade', None), (11, 23, 'rt_barricade', None)] +
           [(x, y, None, 'bridge_v') for x in (10, 11) for y in (21, 22)], 'beat_master_revival', 'revival_hall_int',
           'bridge collapsed', 'bridge rebuilt', 'bridge_v over the gorge', 'Revival Heights first', ('exit-south', 'exit-north'))
forced_grass(m, 'fg_frostspire_pass_ferns', 10, 26, 11, 28, ('exit-south', 'exit-north'), 'frostspire_pass_grass', 'tall_grass')
pn(m, 'frostspire_pass_rt_engineer', 12, 24, 'left', 'guard', 'gate_frostspire_bridge speaker (Text Bot proposed rt_engineer_pass)')
fill_route(m, 'frostspire_pass_grass', 4, 3, 2, ['boulder'], 505, (22, 36), 'Frostspire Pass - bridge out')
link('frostspire_pass', 'south', 20, 'greystone_b1', 20, note='Greystone B1 north stub x20-21 (offset 0)')

# 9 frostspire (town, snow: hall coin 4, Skylift)
m = town('frostspire', 'Frostspire', 'snow', ('south',),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'house_a'), (3, 'house_b')],
         [(1, 'masters_hall', 'frostspire_hall_int', 7, 16, "Master's Hall (coin 4, Skylift)"), (2, 'house_c')])
pn(m, 'frostspire_villager_1', 5, 14, 'down', 'villager'); pn(m, 'frostspire_skylift_tutor', 19, 14, 'down', 'villager_scholar', 'explains Skylift after coin 4')
ps(m, 'frostspire_sign', 14, 11, 'Frostspire - mountain town')
link('frostspire_pass', 'north', 14, 'frostspire', 16)

# 10 route_revival_sunmeadow (Heights north -> Sunmeadow; crystal field until coin 4)
m = route('route_revival_sunmeadow', 26, 40, 'North Road (Revival Heights - Sunmeadow)', [[(12, 38), (12, 28), (18, 28), (18, 14), (10, 14), (10, 0)]])
choke(m, 6, 31, 18, 36)
story_gate(m, 'gate_sunmeadow_north', [(12, 34, 'crystal_barrier_lit', 'crystal_barrier_dim'), (13, 34, 'crystal_barrier_lit', 'crystal_barrier_dim')], 'beat_master_frostspire',
           'frostspire_hall_int', 'crystal field', 'crystal field dimmed', 'barrier dims', 'Frostspire first', ('exit-south', 'exit-north'))
fill_route(m, 'route_revival_sunmeadow_grass', 5, 3, 3, ['brush'], 606, (13, 3), 'North Road - Sunmeadow')   # sign moved 14,3 -> 13,3 (00:55 CT): it sealed the brush pocket's only approach
link('revival_heights', 'north', 16, 'route_revival_sunmeadow', 12)

# 11 sunmeadow_fields (meadow zone; Route 1 east stub y4-5)
m = route('sunmeadow_fields', 40, 30, 'Sunmeadow Fields', [[(0, 4), (18, 4), (18, 28)], [(18, 14), (38, 14)]], band=4)
fill_route(m, 'sunmeadow_fields_grass', 9, 4, 4, ['brush', 'water'], 707, (3, 6), 'Sunmeadow Fields')
link('sunmeadow_fields', 'west', 4, 'route1', 4, note='Route 1 east stub y4-5 (offset 0)'); link('route_revival_sunmeadow', 'north', 10, 'sunmeadow_fields', 18)

# 12 route_sunmeadow_mirefen (4-tile neck of forced grass before Mirefen)
m = route('route_sunmeadow_mirefen', 40, 26, 'Reed Road (Sunmeadow - Mirefen)', [[(0, 10), (12, 10), (12, 16), (28, 16), (28, 12), (38, 12)]], dark=True)
choke(m, 30, 8, 36, 17)
forced_grass(m, 'fg_route_sunmeadow_mirefen_neck', 31, 12, 34, 13, ('exit-west', 'exit-east'), 'route_sunmeadow_mirefen_grass', 'tall_grass')
fill_route(m, 'route_sunmeadow_mirefen_grass', 5, 3, 3, ['water'], 808, (3, 9), 'Reed Road - Mirefen east')
link('sunmeadow_fields', 'east', 14, 'route_sunmeadow_mirefen', 10)

# 13 mirefen (town: hall coin 5, Tideglide)
m = town('mirefen', 'Mirefen', 'grass_dark', ('west', 'south'),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'house_a'), (3, 'house_b')],
         [(1, 'masters_hall', 'mirefen_hall_int', 7, 16, "Master's Hall (coin 5)"), (2, 'house_c'), (3, 'house_a')])
pn(m, 'mirefen_tideglide_giver', 20, 14, 'down', 'villager_scholar', 'gives Tideglide after coin 5 + storm start (has_tideglide)'); pn(m, 'mirefen_villager_1', 6, 4, 'down', 'villager')
ps(m, 'mirefen_sign', 14, 11, 'Mirefen - marsh town')
link('route_sunmeadow_mirefen', 'east', 12, 'mirefen', 12)

# 14 route_saltmere_mirefen (flooded causeway until coin 4)
m = route('route_saltmere_mirefen', 40, 30, 'Causeway (Saltmere - Mirefen)', [[(0, 12), (14, 12), (14, 20), (30, 20), (30, 0)]])
for y in range(2, 28):
    for x in (20, 21):
        if m.deco[y][x] is None: m.clear(x, y, x, y, 'water')
choke(m, 17, 16, 24, 25)
story_gate(m, 'gate_saltmere_causeway', [(x, y, None, 'bridge_h') for x in (20, 21) for y in (20, 21)], 'beat_master_frostspire', 'frostspire_hall_int',
           'causeway flooded', 'causeway drained', 'bridge_h over the drained cut', 'Sunmeadow route', ('exit-west', 'exit-north'))
fill_route(m, 'route_saltmere_mirefen_grass', 5, 3, 3, ['boulder'], 909, (3, 11), 'Causeway - flooded until the thaw ends')
link('saltmere', 'east', 12, 'route_saltmere_mirefen', 12); link('route_saltmere_mirefen', 'north', 30, 'mirefen', 16)

# 15 route_coast (Brookhollow south road -> Tidewater; storm flood until Tideglide)
m = route('route_coast', 26, 36, 'Coast Road (East Road - Tidewater)', [[(12, 0), (12, 12), (8, 12), (8, 24), (14, 24), (14, 34)]], trail='sand')
for y in (18, 19):
    for x in range(2, 24):
        if m.deco[y][x] is None: m.terr[y][x] = 'water'
story_gate(m, 'gate_coast_road_flood', [(x, y, None, None) for x in (8, 9) for y in (18, 19)], 'has_tideglide', 'mirefen',
           'road flooded', 'cross with Tideglide', 'water stays; Tideglide carries the player', 'none', ('exit-north', 'exit-south'))
fill_route(m, 'route_coast_grass', 4, 3, 2, ['brush'], 1010, (14, 3), 'Coast Road - flooded in storm season')
link('route_east', 'south', 30, 'route_coast', 12)

# 16 tidewater_coast (village: hall coin 6)
m = town('tidewater_coast', 'Tidewater Coast', 'sand', ('north', 'west'),
         [(0, 'heal_centre'), (1, 'shop'), (3, 'house_a')], [(1, 'masters_hall', 'tidewater_hall_int', 7, 16, "Master's Hall (coin 6)"), (2, 'house_b')], sea=True)
pn(m, 'tidewater_coast_villager_1', 22, 14, 'down', 'villager'); pn(m, 'tidewater_coast_lifeguard', 26, 20, 'down', 'villager', 'beach flavour')
ps(m, 'tidewater_coast_sign', 14, 11, 'Tidewater Coast')
link('route_coast', 'south', 14, 'tidewater_coast', 16)

# 17 lanternport (port town: hall coin 7, station)
m = town('lanternport', 'Lanternport', 'grass', ('east', 'north'),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'x_station'), (3, 'house_c')],
         [(0, 'house_a'), (1, 'masters_hall', 'lanternport_hall_int', 7, 16, "Master's Hall (coin 7)"), (2, 'house_b'), (3, 'house_c')], sea=True)
pn(m, 'lanternport_lighthouse_keeper', 22, 14, 'down', 'villager_scholar', 'horn wakes the Cindervale-road giant after coin 7'); pn(m, 'lanternport_villager_1', 6, 4, 'down', 'villager')
ps(m, 'lanternport_sign', 14, 11, 'Lanternport - lighthouse town')
link('tidewater_coast', 'west', 12, 'lanternport', 12)

# 18 route_fernwick_lanternport (tide-lock opened from the Lanternport side after coin 7)
m = route('route_fernwick_lanternport', 40, 26, 'Tide-lock Road (Fernwick - Lanternport)', [[(38, 9), (26, 9), (26, 16), (8, 16), (8, 24)]])
choke(m, 29, 5, 35, 14)
story_gate(m, 'gate_lanternport_tidelock', [(32, 9, 'rt_barricade', None), (32, 10, 'rt_barricade', None)], 'beat_master_lanternport', 'lanternport_hall_int',
           'tide-lock shut', 'lock wheel turned', 'barricade removed (art TODO: lock gate tile)', 'shortcut: Fernwick side is reached via Tidewater; lock opens from the Lanternport side after coin', ('exit-south', 'exit-east'))
pn(m, 'route_fernwick_lanternport_lock_keeper', 30, 11, 'up', 'guard', 'gate_lanternport_tidelock speaker (Text Bot proposed lock_keeper); lock wheel on the Lanternport side')
fill_route(m, 'route_fernwick_lanternport_grass', 5, 3, 3, ['brush'], 1111, (10, 22), 'Tide-lock Road - Fernwick east')
link('lanternport', 'north', 16, 'route_fernwick_lanternport', 8)
link('route_fernwick_lanternport', 'east', 9, 'fernwick', 9, note='NEW Fernwick west stub y9-10 (live edit after the port)')
_f = _M0['fernwick']; _f.clear(0, 9, 1, 10, 'path'); _f.exit('west', 9, 10, 'route_fernwick_lanternport', 0, 'DRAFT overnight: west stub to the tide-lock road')

# 19 route_cindervale (Aurelith south -> Cindervale; sleeping giant until coin 7)
m = route('route_cindervale', 26, 40, 'Ember Road (Aurelith - Cindervale)', [[(12, 0), (12, 12), (6, 12), (6, 26), (14, 26), (14, 38)]], trail='path', base='mud')
choke(m, 8, 2, 17, 7)
story_gate(m, 'gate_cindervale_giant', [(12, 4, 'boulder', None), (13, 4, 'boulder', None)], 'beat_master_lanternport', 'lanternport_hall_int',
           'sleeping giant', 'giant woke and left', 'cells clear (art TODO: sleeping giant sprite)', 'Tidewater/Lanternport first', ('exit-north', 'exit-south'))
fill_route(m, 'route_cindervale_grass', 5, 3, 3, ['boulder'], 1212, (14, 3), 'Ember Road - Cindervale south')
link('aurelith', 'south', 16, 'route_cindervale', 12)

# 20 cindervale (town: hall coin 8)
m = town('cindervale', 'Cindervale', 'mud', ('north',),
         [(0, 'heal_centre'), (1, 'shop'), (2, 'house_a'), (3, 'house_b')], [(1, 'masters_hall', 'cindervale_hall_int', 7, 16, "Master's Hall (coin 8)"), (2, 'house_c')])
pn(m, 'cindervale_smith', 20, 14, 'down', 'villager', 'forge flavour'); pn(m, 'cindervale_villager_1', 6, 4, 'down', 'villager')
ps(m, 'cindervale_sign', 14, 11, 'Cindervale - forge town')
link('route_cindervale', 'south', 14, 'cindervale', 16)

# =====================================================================================
# MASTER HALLS (7) - own interiors; win flag beat_master_<town>
# =====================================================================================
hall('saltmere_hall_int', 'saltmere', 'saltmere', "Saltmere Master's Hall")
hall('revival_hall_int', 'revival_heights', 'revival_heights', "Revival Heights Master's Hall", floor='floor_tile')
hall('frostspire_hall_int', 'frostspire', 'frostspire', "Frostspire Master's Hall")
hall('mirefen_hall_int', 'mirefen', 'mirefen', "Mirefen Master's Hall", floor='floor_wood')
hall('tidewater_hall_int', 'tidewater_coast', 'tidewater_coast', "Tidewater Master's Hall")
hall('lanternport_hall_int', 'lanternport', 'lanternport', "Lanternport Master's Hall")
hall('cindervale_hall_int', 'cindervale', 'cindervale', "Cindervale Master's Hall", floor='floor_tile')

# =====================================================================================
# GAME DEV DATA LAYER (design/overnight_gd, regenerated 00:31 CT): real trainers, pickups and encounter tables per map.
# Ids stay map-prefixed and stable (<map>_trainer_N, <map>_item_N, <map>_pocket_N); each entry carries gd_id + the GD payload.
# Placement hints from GD are suggestions only (kept in note). Arena Battle Masters wait for the aurelith_arena map (TO COME).
# =====================================================================================
GD_DIR = '/workspace/kilumen/design/overnight_gd'
GD_ID = {'route_east': 'route_brookhollow_aurelith', 'route_aurelith_saltmere': 'route_saltmere_aurelith', 'route_revival': 'route_thornwood_revival',
         'frostspire_pass': 'route_greystone_frostspire', 'route_coast': 'route_brookhollow_tidewater', 'route_cindervale': 'route_aurelith_cindervale'}
def _seed(n): return sum((i + 1) * ord(c) for i, c in enumerate(n))
GD_ENC = {}      # table name -> table (written to encounters_overnight.json by the driver)
GD_REPORT = {}
def _gdload(kind, gid):
    try: return _json.load(open(f'{GD_DIR}/{kind}_{gid}.json'))
    except FileNotFoundError: return None
def _free(m, x, y, taken):
    if not (2 <= x < m.w - 2 and 2 <= y < m.h - 2) or (x, y) in taken: return False
    if m.deco[y][x] is not None or m.over[y][x] is not None: return False
    if m.terr[y][x] in ('water', 'cave_water', 'cavewall'): return False
    if any(abs(w['x'] - x) <= 1 and abs(w['y'] - y) <= 2 for w in m.warps): return False      # keep doors and their approach clear
    return True
def _spots(m, k, taken, seed, near_path=True):
    rnd = random.Random(seed); C = []
    pathish = set(m.trail_cells) | {(x, y) for y in range(m.h) for x in range(m.w) if m.terr[y][x] in ('path', 'trail')}
    for y in range(m.h):
        for x in range(m.w):
            if not _free(m, x, y, taken) or (x, y) in pathish: continue
            adj = [(dx, dy, f) for dx, dy, f in ((0, 1, 'down'), (0, -1, 'up'), (1, 0, 'right'), (-1, 0, 'left')) if (x + dx, y + dy) in pathish]
            if near_path and not adj: continue
            C.append((x, y, adj[0][2] if adj else 'down'))
    rnd.shuffle(C); out = []
    for gap in (7, 5, 4, 3, 2):
        for c in C:
            if len(out) == k: break
            if all(abs(c[0] - o[0]) + abs(c[1] - o[1]) >= gap for o in out) and all(abs(c[0] - a) + abs(c[1] - b) >= 2 for a, b in taken): out.append(c)
        if len(out) == k: break
    return out
def _clean_slots(sl): return [{k: v for k, v in s.items() if k in ('species', 'level', 'weight', 'time', 'weather', 'flood')} for s in sl if not str(s.get('species', '')).startswith('TODO')]
def _water_rects(m, cap=6):
    out = []
    for y in range(2, m.h - 2):
        x = 2
        while x < m.w - 2:
            if m.terr[y][x] == 'water' and m.deco[y][x] is None:
                x0 = x
                while x < m.w - 2 and m.terr[y][x] == 'water' and m.deco[y][x] is None: x += 1
                if x - x0 >= 2: out.append((x0, y, x - 1, y))
            else: x += 1
    out.sort(key=lambda r: -(r[2] - r[0])); return out[:cap]
for _n in list(ON_ORDER):
    if _n.endswith('_int'): continue
    m = ON[_n]; gid = GD_ID.get(_n, _n); T, I, E = _gdload('trainers', gid), _gdload('items', gid), _gdload('encounters', gid)
    m.gd_tables = {}; rep = m.gd_report = GD_REPORT[_n] = dict(gd_map=gid, trainers_placed=0, trainers_waiting=[], items_placed=0, tables=[], tables_unplaced=[])
    if T is None: continue
    taken = {(e['x'], e['y']) for e in m.npcs_pending + m.signs_pending + m.items} | {(w['x'], w['y']) for w in m.warps}
    # ---- trainers ----
    old = [n for n in m.npcs_pending if n['id'].startswith(f'{_n}_trainer_')]
    for n in old: m.npcs_pending.remove(n); taken.discard((n['x'], n['y']))
    spots = [(n['x'], n['y'], n['facing']) for n in old]
    placeable = [t for t in T['trainers'] if t.get('class') != 'battle_master']
    rep['trainers_waiting'] = [t['id'] for t in T['trainers'] if t.get('class') == 'battle_master']
    if len(spots) < len(placeable): spots += _spots(m, len(placeable) - len(spots), taken | {(a, b) for a, b, _f in spots}, _seed(_n) % 9973)
    k = 0
    for t, (x, y, f) in zip(placeable, spots):
        ron = t.get('class') == 'ron'
        if ron: tid = f"{_n}_{t['id']}"
        else: k += 1; tid = f'{_n}_trainer_{k}'
        team = t.get('team') or t.get('teams_by_player_starter')
        lv = [s['level'] for s in (t.get('team') or [])] or [s['level'] for v in (t.get('teams_by_player_starter') or {}).values() for s in v]
        pn(m, tid, x, y, f, 'rival' if ron else 'trainer_hooded',
           f"GD {t['id']} {t.get('class_display_suggestion', t.get('class'))} '{t.get('name_suggestion', '')}' L{min(lv) if lv else '?'}-{max(lv) if lv else '?'}; sight {t.get('sight_range', 3)}; hint: {t.get('note', '-')}")
        e = m.npcs_pending[-1]; e.update(gd_id=t['id'], gd_class=t.get('class'), team=team, sight=t.get('sight_range', 3), prize=t.get('prize'), text_ref=t.get('text_ref'))
        taken.add((x, y)); rep['trainers_placed'] += 1
    rep['trainers_short'] = len(placeable) - rep['trainers_placed']
    # ---- pickups ----
    P = list((I or {}).get('proposed', []))
    pockets = [i for i in m.items if '_pocket_' in i['id']]; generic = [i for i in m.items if '_item_' in i['id']]
    for i in generic: m.items.remove(i); taken.discard((i['x'], i['y']))
    vis = [p for p in P if not p.get('hidden')]
    for pk in pockets:                                  # obstacle pockets take a visible GD pickup (reward for the field skill)
        if not vis: break
        p = vis.pop(); P.remove(p); pk['item'] = p['item']; pk.update(gd_id=p['id'], hidden=False, qty=p.get('qty', 1), note=f"GD {p['id']} hint: {p.get('placement_hint', '-')} (placed in the field-skill pocket)")
        rep['items_placed'] += 1
    sp = [(i['x'], i['y']) for i in generic]
    if len(sp) < len(P): sp += [(a, b) for a, b, _f in _spots(m, len(P) - len(sp), taken | set(sp), _seed(_n) % 7919 + 1, near_path=False)]
    for j, (p, (x, y)) in enumerate(zip(P, sp)):
        item(m, f'{_n}_item_{j + 1}', x, y, bool(p.get('hidden')), p['item'])
        m.items[-1].update(gd_id=p['id'], qty=p.get('qty', 1), note=f"GD {p['id']} hint: {p.get('placement_hint', '-')}"); taken.add((x, y)); rep['items_placed'] += 1
    rep['items_short'] = len(P) - min(len(P), len(sp))
    # ---- encounter tables ----
    zones = [z for z in (E or {}).get('zones', []) if z.get('slots')]
    land = [z for z in zones if str(z.get('method', '')).startswith('grass')]
    mine = sorted({z['table'] for z in m.enc_zones})
    if land and not mine and _n in ('frostspire', 'tidewater_coast'):          # GD biome towns get roadside grass for their land table
        patches(m, 3, f'{_n}_grass', _seed(_n) % 6007); mine = [f'{_n}_grass']
    for z in zones:
        meth = str(z.get('method', ''))
        if z is (land[0] if land else None) and mine: tname = mine[0]
        elif meth.startswith('water'): tname = f'{_n}_water'
        elif meth.startswith('cave'): tname = f'{_n}_cave'
        else: tname = f"{_n}_{z['id']}"
        GD_ENC[tname] = dict(method=meth.split(' ')[0] if meth.startswith(('grass', 'cave')) else 'water (Tideglide)', rate=z.get('rate', 0.0833), slots=_clean_slots(z['slots']),
                             source=f"Game dev design/overnight_gd/encounters_{gid}.json zone {z['id']} ({meth})", band=E.get('level_band'))
        m.gd_tables[tname] = GD_ENC[tname]; rep['tables'].append(f"{tname}<-{z['id']}")
        if tname.endswith('_water'):
            R = _water_rects(m)
            for x0, y0, x1, y1 in R: m.enc_zones.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, table=tname, note='GD water table (Tideglide)'))
            if not R: rep['tables_unplaced'].append(tname)
        elif tname not in {zz['table'] for zz in m.enc_zones}: rep['tables_unplaced'].append(tname)
    for zz in m.enc_zones:
        if zz['table'] in GD_ENC: zz['note'] = 'GD table ' + GD_ENC[zz['table']]['source'].split(' zone ')[1]

# ---- settle pass (DRAFT): open exit lanes hidden under tree canopies, move spots off blocked cells ----
TOPS = ('tree_top', 'treed_top')
def _blk(m, x, y):
    if not (0 <= x < m.w and 0 <= y < m.h): return True
    if m.terr[y][x] in ('water', 'cave_water', 'cavewall'): return m.deco[y][x] is None or not str(m.deco[y][x]).startswith('bridge')
    if m.over[y][x] in TOPS: return True
    d = m.deco[y][x]
    if d is None or d.startswith('bridge'): return False
    t = BYNAME.get(d); return (t is None) or t['coll'] != 'walk'
def _untop(m, x, y):
    if m.over[y][x] in TOPS:
        m.over[y][x] = None
        if y + 1 < m.h and m.deco[y + 1][x] and 'tree' in m.deco[y + 1][x]: m.deco[y + 1][x] = 'bush'
def settle(m):
    for ex in m.exits:
        for i in range(ex['start'], ex['end'] + 1):
            for k in range(4):
                x, y = {'north': (i, k), 'south': (i, m.h - 1 - k), 'west': (k, i), 'east': (m.w - 1 - k, i)}[ex['edge']]
                _untop(m, x, y)
    taken = {(e['x'], e['y']) for e in m.npcs_pending + m.signs_pending + m.items} | {(w['x'], w['y']) for w in m.warps}
    for e in m.npcs_pending + m.signs_pending + m.items:
        if not _blk(m, e['x'], e['y']): continue
        best = None
        for r in range(1, 6):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    x, y = e['x'] + dx, e['y'] + dy
                    if max(abs(dx), abs(dy)) == r and 1 <= x < m.w - 1 and 1 <= y < m.h - 1 and (x, y) not in taken and not _blk(m, x, y) and (x, y) not in getattr(m, 'trail_cells', ()):
                        best = (x, y); break
                if best: break
            if best: break
        if best:
            taken.discard((e['x'], e['y'])); e['note'] = (e.get('note') or e.get('what') or '') + f" [settled from {e['x']},{e['y']}]"; e['x'], e['y'] = best; taken.add(best)
for _n in ON_ORDER:
    if not _n.endswith('_int'): settle(ON[_n])
for _y in (9, 10):
    for _x in range(4): _untop(_M0['fernwick'], _x, _y)

# ---- pickup audit (DRAFT, 00:50 AM CT): every pickup reachable; pocket pickups inside their pocket, behind their obstacle ----
# R0 = cells reachable from exits/warps with no field skill; R1 = with every skill (brush/boulder obstacle cells + water open).
# Pocket pickup must sit in its pocket (cells reachable through its obstacle, not in R0). Canopies that the pocket rule left over
# the pocket's own cells (tree below the pocket) are lifted and that tree base becomes a rock, so the pocket stays sealed.
ITEM_AUDIT = {}
def _nb(x, y): return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
def _reach(m, skills):
    obs = {(o['x'], o['y']) for o in m.field_obstacles} if skills else set()
    def ok(x, y):
        if not (0 <= x < m.w and 0 <= y < m.h): return False
        if (x, y) in obs: return True
        if skills and m.terr[y][x] == 'water' and m.over[y][x] not in TOPS and m.deco[y][x] is None: return True
        return not _blk(m, x, y)
    seed = [(w['x'], w['y']) for w in m.warps]
    for ex in m.exits:
        for i in range(ex['start'], ex['end'] + 1):
            seed.append({'north': (i, 0), 'south': (i, m.h - 1), 'west': (0, i), 'east': (m.w - 1, i)}[ex['edge']])
    seen = set(); st = [c for c in seed if 0 <= c[0] < m.w and 0 <= c[1] < m.h]
    seen.update(st)
    while st:
        x, y = st.pop()
        for a, b in _nb(x, y):
            if (a, b) not in seen and ok(a, b): seen.add((a, b)); st.append((a, b))
    return seen
def _tuck(m, x, y): return sum(_blk(m, a, b) for a, b in _nb(x, y))
def audit_items(m):
    log = []
    if not m.items: return log
    for o in m.field_obstacles:
        for a, b in o.get('pocket_cells', []) + [[o['x'], o['y']]]:
            if m.over[b][a] in TOPS:
                m.over[b][a] = None
                if b + 1 < m.h and m.deco[b + 1][a] and 'tree' in m.deco[b + 1][a]: m.deco[b + 1][a] = 'rock'
                log.append(f"{o['id']}: canopy over pocket cell ({a},{b}) lifted, tree base below -> rock (pocket stays sealed)")
    R0, R1 = _reach(m, False), _reach(m, True)
    taken = {(e['x'], e['y']) for e in m.npcs_pending + m.signs_pending + m.items} | {(w['x'], w['y']) for w in m.warps}
    trail = set(getattr(m, 'trail_cells', ()))
    byitem = {o.get('opens'): o for o in m.field_obstacles}
    for e in m.items:
        here = (e['x'], e['y']); o = byitem.get(e['id'])
        if o:
            pk = {tuple(c) for c in o.get('pocket_cells', [])} & R1 - R0
            if here in pk: continue
            if not pk: log.append(f"{e['id']}: POCKET UNREACHABLE/OPEN (needs a look)"); continue
            ox, oy = o['x'], o['y']
            best = max(pk - (taken - {here}), key=lambda c: (abs(c[0] - ox) + abs(c[1] - oy), _tuck(m, *c), -c[1], -c[0]))
            why = 'outside its pocket' if here in R1 else 'unreachable'
        else:
            if here in R1: continue
            cand = [c for c in R1 if c not in taken and c not in trail and 1 <= c[0] < m.w - 1 and 1 <= c[1] < m.h - 1
                    and not any(c in {tuple(q) for q in oo.get('pocket_cells', [])} for oo in m.field_obstacles)]
            if not cand: log.append(f"{e['id']}: UNREACHABLE, no free reachable cell"); continue
            best = min(cand, key=lambda c: (max(abs(c[0] - here[0]), abs(c[1] - here[1])) > 4, -_tuck(m, *c), abs(c[0] - here[0]) + abs(c[1] - here[1])))
            why = 'unreachable'
        taken.discard(here); taken.add(best)
        e['note'] = (e.get('note') or '') + f' [re-seated {here[0]},{here[1]} -> {best[0]},{best[1]}: {why}; 00:50 CT audit]'
        log.append(f"{e['id']}: {why} at {here} -> {best} (tucked {_tuck(m, *best)}/4 sides)")
        e['x'], e['y'] = best
    R0, R1 = _reach(m, False), _reach(m, True)
    for e in m.items:
        o = byitem.get(e['id']); c = (e['x'], e['y'])
        if c not in R1 or (o and c in R0): log.append(f"{e['id']}: STILL BAD at {c}")
    return log
for _n in ON_ORDER:
    _l = audit_items(ON[_n])
    ON[_n].item_audit = _l
    if _l: ITEM_AUDIT[_n] = _l

# ===================================================================================================================
# INTEGRATOR POSTFIX (Oct 23 2026 ~00:55 CT, appended at integration; staged source unchanged)
#  (a) blocked word: player-visible pocket label -> 'Glow Remedy' (item ids like energy_tonic / tonic_small stay as they are)
#  (b) GAME_QUALITY_CHECKLIST line 354: no smoke, haze or fog anywhere -> visible fog/mist/haze/smoke words replaced,
#      mirefen_hall_int is a DARKNESS puzzle lit by reed lamps (no fog layer)
import re as _re
_VIS = [(r'Fogwalker', 'Lampwalker'), (r'fog bank', 'reed bank'), (r'\bfog\b', 'dark'), (r'\bFog\b', 'Dark'),
        (r'\bmist\b', 'dusk'), (r'\bMist\b', 'Dusk'), (r'\bhaze\b', 'dusk'), (r'\bHaze\b', 'Dusk'), (r'\bsmoke\b', 'dust'), (r'\bSmoke\b', 'Dust')]
def _idkey(k): return k in ('species', 'to', 'src', 'table', 'text_ref', 'what_id', 'item', 'opens') or k == 'id' or k.endswith('_id') or k.endswith('flag')
def _scrub(o, k=None):
    if isinstance(o, str):
        if k is not None and _idkey(k): return o
        for a, b in _VIS: o = _re.sub(a, b, o)
        return o
    if isinstance(o, dict): return {kk: _scrub(v, kk) for kk, v in o.items()}
    if isinstance(o, list) and o and not isinstance(o[0], list): return [_scrub(v, k) for v in o]
    return o
_SCRUB_LOG = []
for _n in ON_ORDER:
    _m = ON[_n]
    for _a, _v in list(vars(_m).items()):
        if isinstance(_v, (dict, list)) and _a not in ('layers', 'ground', 'deco', 'overlay', 'terr', 'coll', 'collision'):
            _nv = _scrub(_v)
            if _nv != _v: setattr(_m, _a, _nv); _SCRUB_LOG.append(f'{_n}.{_a}')
    if isinstance(getattr(_m, 'title', None), str): _m.title = _scrub(_m.title)
    if getattr(_m, 'fog_layer', None): _m.fog_layer = None; _SCRUB_LOG.append(f'{_n}: fog_layer removed')
# mirefen hall: darkness overlay + reed lamps (same JSON grid, same cell ids '1'..'4', same S/G)
_h = ON.get('mirefen_hall_int')
if _h is not None:
    _hp = _h.hall_puzzle; _ox, _oy = _hp['origin']
    _g = _json.load(open(f"{HP_DIR}/mirefen.json"))['grid']
    _lamps = {c: [_ox + x, _oy + y] for y, r in enumerate(_g) for x, c in enumerate(r) if c in '1234'}
    for _c, (_x, _y) in _lamps.items(): _h.deco[_y][_x] = 'lamp'      # art TODO: dedicated reed_lamp tile (unlit/lit pair)
    _hp['overlay'] = dict(kind='darkness', light='reed_lamp', lamps={c: _lamps[c] for c in sorted(_lamps)}, order=['3', '1', '4', '2'],
                          reveal='hall starts dark; lighting the reed lamps in the croak order (3,1,4,2) lights the boardwalk path to G; unlit cells stay dark',
                          note='GQC line 354: no fog/haze/smoke. Replaces the hall JSON cue "fog layer = existing mirefen fog" (Coder: update the cue/runtime view to darkness).')
    _hp['cue'] = 'frogs croak the order (sound) + a ripple and lamp glow by each reed lamp (visual); darkness overlay, lamps light the path'
    _SCRUB_LOG.append('mirefen_hall_int: darkness overlay + 4 reed lamps')
print('OVERNIGHT POSTFIX:', _SCRUB_LOG)
