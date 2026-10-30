#!/usr/bin/env python3
"""Gullhaven (sea region off Tidewater Coast): sea maze, two caves, Gullhaven Cliffs side map, Gullhaven town,
Gullhaven Lagoon (derby waters). Coder, dev/seaport, Oct 30 2026. Re-runnable. Plan: design/seaport/PLAN.md.
Reuses tileset kit only (no new art). Cave builder copied from tools/wd_r78/build_caves.py (World Design)."""
import json, random, os, re, copy
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '../..'))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
TS = json.load(open(os.path.join(MAPS, '../tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}
CODE = {t['id']: t.get('collision_code', 0) for t in TS['tiles']}
NAMES = set(ID)
FLOOR = [ID['cave_0'], ID['cave_1'], ID['cave_2'], ID['cave_3']]
RING = {(1,1,0,0): 1472, (1,0,0,0): 1473, (1,0,1,0): 1476, (0,1,0,0): 1477, (0,0,1,0): 1478,
        (0,1,0,1): 1480, (0,0,0,1): 1481, (0,0,1,1): 1483}
SRC = 'dev/seaport (Coder, Oct 30 2026; tools/seaport/build_gullhaven.py)'
def blank(W, H, v=0): return [[v]*W for _ in range(H)]
def tref(mp, i): return f"overworld_lines.json maps.{mp}.{i}"
def save(m): json.dump(m, open(os.path.join(MAPS, m['name'] + '.json'), 'w'), separators=(',', ':'))
ENT = [['cave_entrance_0_0', 'cave_entrance_0_1', 'cave_entrance_0_2'], ['cave_entrance_1_0', 'cave_entrance_1_1', 'cave_entrance_1_2']]

# ---------------------------------------------------------------- outdoor terrain kit
class Out:
    """Semantic outdoor grid: 'W' water, 'S' sand, 'P' path, 'T' tree wall. Ground autotiled per autotile_rules.json."""
    def __init__(s, name, W, H, seed, fill='T'):
        s.name, s.W, s.H = name, W, H; s.t = [[fill]*W for _ in range(H)]
        s.dec = blank(W, H); s.ov = blank(W, H); s.col_over = {}; s.rng = random.Random(seed)
    def rect(s, x0, y0, x1, y1, k):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.t[y][x] = k
    def put(s, x, y, name, code=None):
        s.dec[y][x] = ID[name]
        if code is not None: s.col_over[(x, y)] = code
    def stamp(s, x0, y0, rows):  # rows of tile names (None = skip)
        for r, row in enumerate(rows):
            for c, n in enumerate(row):
                if n: s.dec[y0+r][x0+c] = ID[n]
    def mouth(s, dx, dy):  # cave entrance 3x2, door at (dx,dy)
        for r in range(2):
            for k in range(3): s.dec[dy-1+r][dx-1+k] = ID[ENT[r][k]]
    def k(s, x, y):
        if not (0 <= x < s.W and 0 <= y < s.H): return None
        v = s.t[y][x]; return 'S' if v == 'T' else v
    def ground(s, x, y):
        v = s.k(x, y); vh = (x * 7 + y * 13 + (x * y) % 5) % 4
        if v == 'S': return ID[f'sand_{vh}']
        if v == 'P':  # Director art QA #13: soft path>sand edges where the cobbles meet sand (no hard seam)
            lowp = lambda a, b: (s.k(a, b) or 'P') == 'S'
            sides = ''.join('1' if lowp(x+dx, y+dy) else '0' for dx, dy in ((0,-1),(1,0),(0,1),(-1,0)))
            diags = ''.join('1' if lowp(x+dx, y+dy) else '0' for dx, dy in ((1,-1),(1,1),(-1,1),(-1,-1)))
            if sides != '0000' or diags != '0000':
                for nm in (f'path>sand_{sides}_{diags}', f'path>sand_{sides}_{diags}_w1', f'path>sand_{sides}_{diags}_w2'):
                    if nm in NAMES: return ID[nm]
            return ID[f'path_{vh}']
        # water: edges facing lower-priority (sand/path) neighbours
        low = lambda a, b: (s.k(a, b) or 'W') != 'W'
        sides = ''.join('1' if low(x+dx, y+dy) else '0' for dx, dy in ((0,-1),(1,0),(0,1),(-1,0)))
        diags = ''.join('1' if low(x+dx, y+dy) else '0' for dx, dy in ((1,-1),(1,1),(-1,1),(-1,-1)))
        base = ['water', 'water_1', 'water_2'][vh % 3]
        if sides == '0000' and diags == '0000': return ID[base]
        for nm in (f'water>sand_{sides}_{diags}', f'water>sand_{sides}_{diags}_w1', f'water>sand_{sides}_{diags}_w2', f'water>sand_{sides}_0000'):
            if nm in NAMES: return ID[nm]
        if sides == '0000':
            for nm in (f'water>sand_0000_{diags}',):
                if nm in NAMES: return ID[nm]
        return ID[base]
    def build(s):
        W, H = s.W, s.H
        g = [[s.ground(x, y) for x in range(W)] for y in range(H)]
        col = blank(W, H)
        for y in range(H):
            for x in range(W):
                v = s.t[y][x]
                if v == 'T' and not s.dec[y][x]:
                    # Gary (Oct 30 2026): the bottom row of a stand keeps its trunk (tree_base only, no canopy overlay), so
                    # stands end in trunks + shadow and the canopy never sits over the player standing below (brookhollow rule)
                    s.dec[y][x] = ID['tree_base']
                    if y + 1 < H and s.t[y+1][x] == 'T': s.ov[y][x] = ID['tree_top']
                if v == 'W': col[y][x] = 3
                elif s.dec[y][x]: col[y][x] = CODE[s.dec[y][x]]
                if (x, y) in s.col_over: col[y][x] = s.col_over[(x, y)]
        return g, col
    def finish(s, title, **extra):
        g, col = s.build(); W, H = s.W, s.H
        for w in extra.get('warps', []):
            if col[w['y']][w['x']] not in (4,): col[w['y']][w['x']] = 4
        enc = blank(W, H)
        for z in extra.get('encounter_zones', []):
            for y in range(z['y0'], z['y1']+1):
                for x in range(z['x0'], z['x1']+1):
                    if col[y][x] in (0, 3): enc[y][x] = 1
        m = {"name": s.name, "title": title, "width": W, "height": H, "tile_size": 64, "tileset": "../tileset.json",
             "layers": {"ground": g, "decoration": s.dec, "overlay": s.ov, "collision": col, "encounter": enc},
             "warps": [], "exits": [], "npcs": [], "signs": [], "items": [], "interact_spots": [], "encounter_zones": [],
             "source": SRC, "movement": {"run": True, "bike": False}, "outside_fill": "edge"}
        m.update(extra); save(m); return m

# ---------------------------------------------------------------- caves (World Design kit)
class Cave:
    def __init__(s, name, W, H, seed):
        s.name, s.W, s.H = name, W, H
        s.walk = [[False]*W for _ in range(H)]; s.water = [[False]*W for _ in range(H)]
        s.dec = blank(W, H); s.rng = random.Random(seed)
    def carve(s, x0, y0, x1, y1):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.walk[y][x] = True
    def pool(s, x0, y0, x1, y1):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.water[y][x] = True
    def put(s, x, y, tile):
        assert s.walk[y][x] and not s.water[y][x] and not s.dec[y][x], (s.name, x, y, tile)
        s.dec[y][x] = ID[tile]
    def maze(s, nx, ny, x0=2, y0=2, extra_links=4):
        """DFS maze on an nx*ny cell lattice, 2x2 cells, 2-wide links (one-square walls never trap the 2-wide path)."""
        cx = lambda i: x0 + 3*i; cy = lambda j: y0 + 3*j
        seen = {(0, ny-1)}; st = [(0, ny-1)]; s.links = []
        for i in range(nx):
            for j in range(ny): s.carve(cx(i), cy(j), cx(i)+1, cy(j)+1)
        while st:
            i, j = st[-1]; nb = [(i+a, j+b) for a, b in ((1,0),(-1,0),(0,1),(0,-1)) if 0 <= i+a < nx and 0 <= j+b < ny and (i+a, j+b) not in seen]
            if not nb: st.pop(); continue
            n = s.rng.choice(nb); seen.add(n); st.append(n); s.links.append(((i, j), n))
            s.carve(min(cx(i), cx(n[0])), min(cy(j), cy(n[1])), max(cx(i), cx(n[0]))+1, max(cy(j), cy(n[1]))+1)
        for _ in range(extra_links):  # a few loops so it is a maze, not a single corridor
            i, j = s.rng.randrange(nx-1), s.rng.randrange(ny)
            s.carve(cx(i), cy(j), cx(i+1)+1, cy(j)+1)
        s.cx, s.cy = cx, cy
    def build(s):
        W, H = s.W, s.H
        g = blank(W, H); col = [[1]*W for _ in range(H)]
        fl = lambda x, y: 0 <= x < W and 0 <= y < H and s.walk[y][x]
        for y in range(H):
            for x in range(W):
                if s.water[y][x]:
                    w = lambda a, b: s.water[b][a]
                    k = (int(not w(x, y-1)), int(not w(x-1, y)), int(not w(x+1, y)), int(not w(x, y+1)))
                    g[y][x] = RING.get(k, 38); col[y][x] = 3
                elif s.walk[y][x]:
                    g[y][x] = s.rng.choice(FLOOR); col[y][x] = CODE[s.dec[y][x]] if s.dec[y][x] else 0
                elif fl(x, y+1): g[y][x] = 536
                elif fl(x+1, y): g[y][x] = 538
                elif fl(x-1, y): g[y][x] = 539
                else: g[y][x] = 537
        return g, col

def cave_map(c, title, warps, extra):
    g, col = c.build(); W, H = c.W, c.H
    for w in warps: col[w['y']][w['x']] = 4
    enc = blank(W, H)
    for z in extra['encounter_zones']:
        for y in range(z['y0'], z['y1']+1):
            for x in range(z['x0'], z['x1']+1):
                if col[y][x] == 0: enc[y][x] = 1
    for w in warps:  # no encounters on the squares next to a door
        for y in range(w['y']-3, w['y']+4):
            for x in range(w['x']-2, w['x']+3):
                if 0 <= y < H and 0 <= x < W: enc[y][x] = 0
    m = {"name": c.name, "title": title, "width": W, "height": H, "tile_size": 64, "tileset": "../tileset.json",
         "layers": {"ground": g, "decoration": c.dec, "overlay": blank(W, H), "collision": col, "encounter": enc},
         "warps": warps, "exits": [], "npcs": [], "signs": [], "items": [], "interact_spots": [], "source": SRC, "outside_fill": "edge",
         "movement": {"run": True, "bike": False}}
    m.update(extra); save(m); return m

# ================================================================ 1. Gullhaven Sea (water maze)
SEA = 'gullhaven_sea'
S = Out(SEA, 40, 44, 30)
# Gary (Oct 30 2026): open sea, not a forest with canals. Mainland shore (trees + beach) on the north rows, the north channel
# out of Tidewater, then open water to the islands; sand-bar reefs make the maze (the old channels stay water, so every
# swimmer's spot and sight line is unchanged).
S.rect(0, 0, 39, 4, 'T'); S.rect(0, 5, 39, 6, 'S'); S.rect(26, 0, 27, 6, 'W')
S.rect(0, 7, 1, 36, 'T'); S.rect(38, 7, 39, 36, 'T')
S.rect(2, 7, 37, 36, 'W')
for r in [(11, 10, 14, 16), (19, 10, 31, 13), (11, 22, 18, 22), (23, 23, 27, 28), (3, 25, 6, 28), (32, 17, 36, 25)]:
    S.rect(*r, 'S')  # sand-bar reefs
S.rect(2, 37, 11, 41, 'S'); S.rect(28, 37, 38, 41, 'S')   # two islands with the cave mouths
S.mouth(6, 39); S.mouth(33, 39)
S.put(10, 37, 'rock'); S.put(29, 41, 'i_net'); S.put(37, 37, 'i_barrel'); S.put(3, 41, 'i_crates_0_0'); S.put(4, 41, 'i_crates_0_1')
S.put(9, 38, 'sign')
DIVERS = [  # swimmer trainers (sight-line, swimmer: true -> they see and swim across open water)
    ('a', 21, 8, 'left', 5, [('wavelin', 54), ('reefshell', 55)], 3000),
    ('b', 9, 15, 'up', 4, [('breakerfin', 55)], 3100),
    ('c', 16, 20, 'right', 6, [('ribboneel', 55), ('hullwhale', 56)], 3300),
    ('d', 30, 27, 'up', 4, [('spratwyrm', 56), ('bulwarkrab', 56)], 3400),
    ('e', 20, 31, 'left', 6, [('tidemarrow', 57), ('wavelin', 57), ('plashcrown', 58)], 3800),
]
sea_npcs = []
for k, x, y, f, r, team, prize in DIVERS:
    i = f'{SEA}_swimmer_{k}'
    sea_npcs.append({"id": i, "x": x, "y": y, "facing": f, "kind": "trainer_hooded", "gd_id": f"tr_{SEA}_{k}", "gd_class": "diver",
                     "swimmer": True, "team": [{"species": s, "level": l} for s, l in team], "prize": prize,
                     "sight_range": r, "text_ref": tref(SEA, i), "text_pending": True})
sea = S.finish("Gullhaven Sea",
    exits=[{"edge": "north", "start": 26, "end": 27, "to": "tidewater_coast", "offset": 0}],
    warps=[{"x": 6, "y": 39, "to": "gullhaven_cave_west", "tx": 4, "ty": 22, "facing": "up"},
           {"x": 33, "y": 39, "to": "gullhaven_cave_east", "tx": 4, "ty": 22, "facing": "up"}],
    npcs=sea_npcs,
    signs=[{"id": f"{SEA}_sign", "x": 9, "y": 38, "read_from": "down", "text_ref": tref(SEA, f"{SEA}_sign"), "text_pending": True}],
    items=[{"id": f"{SEA}_item_cove", "x": 33, "y": 14, "hidden": True, "item": "potion", "flag": f"item_{SEA}_cove"},
           {"id": f"{SEA}_item_reef", "x": 13, "y": 24, "hidden": True, "item": "glimmer_worm", "flag": f"item_{SEA}_reef"}],
    encounter_zones=[{"x0": 0, "y0": 0, "x1": 39, "y1": 36, "table": "gullhaven_sea_water"}],
    entered_from={"map": "tidewater_coast", "edge": "south"},
    npcs_pending_text=[n['id'] for n in sea_npcs])

# ================================================================ 2/3. the two caves (sea island -> Gullhaven Cliffs)
CAVES = {}
for name, title, seed, top_to, (tx, ty), props in [
        ('gullhaven_cave_west', 'Kelpwind Cave', 31, 'gullhaven_cliffs', (8, 9), ['i_net', 'cave_rock', 'crystal', 'i_plant_coral', 'i_barrel']),
        ('gullhaven_cave_east', 'Gullbone Cave', 32, 'gullhaven_cliffs', (27, 9), ['crystal', 'cave_rock', 'i_plant_coral', 'i_lantern_stand_0_0', 'cave_rock'])]:
    c = Cave(name, 30, 24, seed); c.maze(9, 6, x0=2, y0=2, extra_links=5)
    # mouth (bottom-left cell 0,5 -> y 17..18) down to the south door at (4,23); top exit from cell (8,0) up to (26,0)
    c.carve(3, 19, 4, 23); c.carve(26, 0, 27, 2)
    if seed == 31: c.pool(8, 9, 9, 10)
    else:  # Gullbone Cave (Director QA: must not read as Kelpwind's copy): a big central bone-white cavern with an underground lake
        c.carve(10, 5, 20, 15); c.pool(13, 8, 17, 12)
    rng = random.Random(seed + 100); placed = 0
    spots = [(x, y) for y in range(3, 18) for x in range(2, 28) if c.walk[y][x] and not c.water[y][x]]
    rng.shuffle(spots)
    for (x, y) in spots:  # props only on dead-end-safe squares: never on a 2-wide link (keeps 1-square gaps walkable)
        if placed >= len(props): break
        n4 = sum(c.walk[y+b][x+a] for a, b in ((1,0),(-1,0),(0,1),(0,-1)))
        if n4 == 4 and all(c.walk[y+b][x+a] for a in (-1,0,1) for b in (-1,0,1)):
            # a 3x3 open block: blocking its centre leaves a walkable ring around it
            c.put(x, y, props[placed]); placed += 1
    warps = [{"x": 3, "y": 23, "to": SEA, "tx": (6 if seed == 31 else 33), "ty": 40, "facing": "down"},
             {"x": 4, "y": 23, "to": SEA, "tx": (6 if seed == 31 else 33), "ty": 40, "facing": "down"},
             {"x": 26, "y": 0, "to": top_to, "tx": tx, "ty": ty + 1, "facing": "down"},
             {"x": 27, "y": 0, "to": top_to, "tx": tx, "ty": ty + 1, "facing": "down"}]
    hermit = f'{name}_hermit'
    CAVES[name] = cave_map(c, title, warps, {
        "npcs": [{"id": hermit, "x": 3, "y": 3, "facing": "down", "kind": "villager", "text_ref": tref(name, hermit), "text_pending": True}],
        "items": [{"id": f"{name}_item", "x": 27, "y": 17, "hidden": False, "item": "potion", "flag": f"item_{name}"}],
        "encounter_zones": [{"x0": 2, "y0": 2, "x1": 27, "y1": 22, "table": f"{name}_cave"}],
        "entered_from": {"map": SEA, "x": 6 if seed == 31 else 33, "y": 39}, "npcs_pending_text": [hermit]})
    assert c.walk[17][27] and not c.dec[17][27]

# ================================================================ 4. Gullhaven Cliffs (side map: both cave tops -> town)
CL = 'gullhaven_cliffs'
K = Out(CL, 36, 24, 33)
K.rect(2, 10, 33, 20, 'S'); K.rect(6, 10, 10, 10, 'S'); K.rect(25, 10, 29, 10, 'S')
K.rect(3, 14, 34, 15, 'P'); K.rect(34, 11, 35, 12, 'S'); K.rect(30, 11, 35, 15, 'P'); K.rect(7, 11, 9, 13, 'P'); K.rect(26, 11, 28, 13, 'P')
K.rect(14, 17, 21, 19, 'W')  # tide pool (fishable, no derby)
K.mouth(8, 9); K.mouth(27, 9)
for y in (8,):
    for x in (7, 8, 9, 26, 27, 28): K.t[y][x] = 'T'
K.put(12, 12, 'rock'); K.put(22, 12, 'bush'); K.put(4, 18, 'rock'); K.put(31, 19, 'bush'); K.put(11, 11, 'sign')
cliffs = K.finish("Gullhaven Cliffs",
    exits=[{"edge": "east", "start": 11, "end": 12, "to": "gullhaven", "offset": 0}],
    warps=[{"x": 8, "y": 9, "to": "gullhaven_cave_west", "tx": 26, "ty": 1, "facing": "down"},
           {"x": 27, "y": 9, "to": "gullhaven_cave_east", "tx": 26, "ty": 1, "facing": "down"}],
    signs=[{"id": f"{CL}_sign", "x": 11, "y": 11, "read_from": "down", "text_ref": tref(CL, f"{CL}_sign"), "text_pending": True}],
    npcs=[{"id": f"{CL}_birdwatcher", "x": 18, "y": 12, "facing": "down", "kind": "villager", "text_ref": tref(CL, f"{CL}_birdwatcher"), "text_pending": True}],
    encounter_zones=[], npcs_pending_text=[f"{CL}_birdwatcher"])

# ================================================================ 5. Gullhaven (town) - buildings copied from Tidewater Coast
TW = json.load(open(os.path.join(MAPS, 'tidewater_coast.json')))
TOWN = 'gullhaven'
G = Out(TOWN, 40, 30, 34)
G.rect(0, 9, 39, 25, 'S'); G.rect(0, 11, 8, 12, 'P'); G.rect(6, 11, 33, 13, 'P'); G.rect(19, 13, 20, 29, 'P')
G.rect(4, 24, 17, 25, 'W'); G.rect(23, 24, 36, 25, 'W')   # harbour edge
G.rect(18, 26, 21, 29, 'P')
for y in range(26, 30):
    for x in range(0, 40):
        if x not in (18, 19, 20, 21): G.t[y][x] = 'T'
def copy_block(sx0, sy0, sx1, sy1, dx0, dy0):
    L = TW['layers']
    for y in range(sy0, sy1+1):
        for x in range(sx0, sx1+1):
            X, Y = dx0 + x - sx0, dy0 + y - sy0
            G.t[Y][X] = 'S'
            if L['decoration'][y][x]: G.dec[Y][X] = L['decoration'][y][x]; G.col_over[(X, Y)] = L['collision'][y][x]
            if L['overlay'][y][x]: G.ov[Y][X] = L['overlay'][y][x]
copy_block(12, 16, 18, 21, 4, 4)    # heal centre (door 15,21 -> 7,9)
copy_block(19, 16, 23, 21, 26, 4)   # shop-front building (door 21,21 -> 28,9); Gullhaven uses it as the Derby Hall front
for x in range(4, 11): G.t[10][x] = 'P'
G.t[10][28] = 'P'
G.put(11, 16, 'lamp'); G.put(28, 16, 'lamp'); G.put(16, 18, 'x_city_bench_h'); G.put(23, 18, 'i_barrel')
G.put(22, 14, 'sign')
G.put(13, 20, 'i_net'); G.put(25, 21, 'i_crates_0_0'); G.put(26, 21, 'i_crates_0_1')
town = G.finish("Gullhaven",
    exits=[{"edge": "west", "start": 11, "end": 12, "to": CL, "offset": 0},
           {"edge": "south", "start": 19, "end": 20, "to": "gullhaven_lagoon", "offset": -4}],
    warps=[{"x": 7, "y": 9, "to": "heal_gullhaven", "tx": 6, "ty": 7, "facing": "up"},
           {"x": 28, "y": 9, "to": "shop_int", "tx": 5, "ty": 7, "facing": "up"}],
    npcs=[{"id": f"{TOWN}_harbour_master", "x": 15, "y": 14, "facing": "down", "kind": "villager", "text_ref": tref(TOWN, f"{TOWN}_harbour_master"), "text_pending": True},
          {"id": f"{TOWN}_derby_crier", "x": 21, "y": 21, "facing": "left", "kind": "villager", "text_ref": tref(TOWN, f"{TOWN}_derby_crier"), "text_pending": True},
          {"id": f"{TOWN}_angler", "x": 30, "y": 23, "facing": "down", "kind": "villager", "text_ref": tref(TOWN, f"{TOWN}_angler"), "text_pending": True}],
    signs=[{"id": f"{TOWN}_sign", "x": 22, "y": 14, "read_from": "down", "text_ref": tref(TOWN, f"{TOWN}_sign"), "text_pending": True}],
    fly_point={"x": 7, "y": 10, "facing": "down", "visited_flag": "visited_gullhaven", "landing": "path in front of the heal centre door", "skill": "Skylift"},
    encounter_zones=[], npcs_pending_text=[f"{TOWN}_harbour_master", f"{TOWN}_derby_crier", f"{TOWN}_angler"])

# ================================================================ 6. Gullhaven Lagoon (derby waters)
LG = 'gullhaven_lagoon'
D = Out(LG, 32, 22, 35)
D.rect(1, 0, 30, 20, 'S'); D.rect(14, 0, 17, 5, 'P')
D.rect(3, 8, 28, 18, 'W')
D.rect(9, 8, 10, 14, 'P'); D.rect(21, 8, 22, 14, 'P'); D.rect(15, 6, 16, 11, 'P')   # three piers out into the lagoon
D.put(12, 4, 'x_city_stall_crystal_0_0'); D.put(12, 5, 'x_city_stall_crystal_1_0')     # derby desk
D.put(19, 5, 'i_crates_0_0'); D.put(20, 5, 'i_crates_0_1')                           # the weigh-in scale (crate scale)
D.put(5, 3, 'i_net'); D.put(26, 3, 'i_barrel'); D.put(4, 6, 'lamp'); D.put(27, 6, 'lamp'); D.put(18, 2, 'sign')
lagoon = D.finish("Gullhaven Lagoon",
    exits=[{"edge": "north", "start": 15, "end": 16, "to": TOWN, "offset": 4}],
    npcs=[{"id": f"{LG}_derby_clerk", "x": 13, "y": 5, "facing": "down", "kind": "villager", "text_ref": tref(LG, f"{LG}_derby_clerk"), "text_pending": True, "derby": "desk"}],
    signs=[{"id": f"{LG}_sign", "x": 18, "y": 2, "read_from": "down", "text_ref": tref(LG, f"{LG}_sign"), "text_pending": True}],
    interact_spots=[{"id": f"{LG}_scale", "x": 19, "y": 6, "facing": "up", "what": "derby weigh-in scale (crate scale beside the desk)", "derby": "scale"}],
    derby_area={"map": LG, "rule": "derby runs only on this map; leaving it asks to quit (forfeit)"},
    encounter_zones=[], npcs_pending_text=[f"{LG}_derby_clerk"])

# ================================================================ 7. Tidewater Coast: open a channel south to the sea
p = os.path.join(MAPS, 'tidewater_coast.json'); T = json.load(open(p)); L = T['layers']
H = T['height']
for y in range(36, H):
    for x in (26, 27):
        L['ground'][y][x] = ID['water']; L['decoration'][y][x] = 0; L['overlay'][y][x] = 0; L['collision'][y][x] = 3
# re-autotile the channel and its old shore cells with the same rule
def tw_kind(x, y):
    if not (0 <= x < T['width'] and 0 <= y < H): return None
    return 'W' if L['collision'][y][x] == 3 else 'S'
tmp = Out('tmp', T['width'], H, 0); tmp.t = [[tw_kind(x, y) for x in range(T['width'])] for y in range(H)]
for y in range(33, H):
    for x in range(24, 30):
        if L['collision'][y][x] == 3: L['ground'][y][x] = tmp.ground(x, y)
T['exits'] = [e for e in T['exits'] if e['to'] != SEA] + [{"edge": "south", "start": 26, "end": 27, "to": SEA, "offset": 0}]
for z in T['encounter_zones']:
    pass
T['encounter_zones'] = [z for z in T['encounter_zones'] if z.get('id') != 'tidewater_coast_channel'] + [{"x0": 26, "y0": 36, "x1": 27, "y1": H-1, "table": "tidewater_coast_water", "id": "tidewater_coast_channel"}]
for y in range(36, H):
    for x in (26, 27): L['encounter'][y][x] = 1
json.dump(T, open(p, 'w'), separators=(',', ':'))
print('ok')
