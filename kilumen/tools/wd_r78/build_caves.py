#!/usr/bin/env python3
"""World Design R7/R8 caves: lanternport_grotto + cindervale_caldera, and their mouths in the towns.
Same tile vocabulary as tidewater_cave_int (wd/regions56). Re-runnable: rebuilds both caves and re-stamps the town doors."""
import json, random, os
HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '../../art/world/overworld/maps'))
TS = json.load(open(os.path.join(MAPS, '../tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}
CODE = {t['id']: t.get('collision_code', 0) for t in TS['tiles']}
FLOOR = [ID['cave_0'], ID['cave_1'], ID['cave_2'], ID['cave_3']]
RING = {(1,1,0,0): 1472, (1,0,0,0): 1473, (1,0,1,0): 1476, (0,1,0,0): 1477, (0,0,1,0): 1478,
        (0,1,0,1): 1480, (0,0,0,1): 1481, (0,0,1,1): 1483}

class Cave:
    def __init__(s, name, W, H, seed):
        s.name, s.W, s.H = name, W, H
        s.walk = [[False]*W for _ in range(H)]
        s.water = [[False]*W for _ in range(H)]
        s.dec = [[0]*W for _ in range(H)]
        s.rng = random.Random(seed)
    def carve(s, x0, y0, x1, y1):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.walk[y][x] = True
    def fill(s, x0, y0, x1, y1):  # back to rock wall
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.walk[y][x] = False
    def pool(s, x0, y0, x1, y1):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.water[y][x] = True
    def put(s, x, y, tile):
        assert s.walk[y][x] and not s.water[y][x] and not s.dec[y][x], (s.name, x, y, tile)
        s.dec[y][x] = ID[tile] if isinstance(tile, str) else tile
    def build(s):
        W, H = s.W, s.H
        g = [[0]*W for _ in range(H)]; col = [[1]*W for _ in range(H)]
        fl = lambda x, y: 0 <= x < W and 0 <= y < H and s.walk[y][x]
        for y in range(H):
            for x in range(W):
                if s.water[y][x]:
                    w = lambda a, b: s.water[b][a]
                    k = (int(not w(x, y-1)), int(not w(x-1, y)), int(not w(x+1, y)), int(not w(x, y+1)))
                    g[y][x] = RING.get(k, 38); col[y][x] = 3
                elif s.walk[y][x]:
                    g[y][x] = s.rng.choice(FLOOR)
                    col[y][x] = CODE[s.dec[y][x]] if s.dec[y][x] else 0
                elif fl(x, y+1): g[y][x] = 536
                elif fl(x+1, y): g[y][x] = 538
                elif fl(x-1, y): g[y][x] = 539
                else: g[y][x] = 537
        return g, col

def blank(W, H, v=0): return [[v]*W for _ in range(H)]

def save(c, extra, exit_x, town, door):
    g, col = c.build()
    W, H = c.W, c.H
    warps = [{"x": x, "y": H-1, "to": town, "tx": door[0], "ty": door[1]+1, "facing": "down"} for x in exit_x]
    for w in warps: col[w['y']][w['x']] = 4
    enc = blank(W, H)
    for z in extra['encounter_zones']:
        for y in range(z['y0'], z['y1']+1):
            for x in range(z['x0'], z['x1']+1):
                if col[y][x] == 0 and y < H-4: enc[y][x] = 1
    m = {"name": c.name, "title": extra.pop('title'), "width": W, "height": H, "tile_size": 16, "tileset": "../tileset.json",
         "layers": {"ground": g, "decoration": c.dec, "overlay": blank(W, H), "collision": col, "encounter": enc},
         "warps": warps, "exits": [], "source": "wd/regions78 (World Design, Oct 29 2026; tools/wd_r78/build_caves.py)",
         "movement": {"run": True, "bike": False}}
    m.update(extra)
    json.dump(m, open(os.path.join(MAPS, c.name + '.json'), 'w'), separators=(',', ':'))
    return m

def tref(mp, i): return f"overworld_lines.json maps.{mp}.{i}"

# ---------------- Lanternport Grotto (R7) ----------------
G = Cave('lanternport_grotto', 32, 22, 7)
G.carve(3, 4, 28, 16); G.carve(13, 3, 18, 3)          # main hall + keeper's alcove under the lighthouse
G.carve(15, 17, 16, 21)                               # mouth corridor
G.fill(3, 16, 5, 16); G.fill(26, 16, 28, 16)          # rounded lower corners
G.pool(5, 6, 10, 10); G.pool(21, 8, 26, 12); G.pool(11, 13, 13, 14)  # tide pools
for x, y, t in [(13, 3, 'keeper_lantern'), (18, 3, 'keeper_lantern'), (15, 3, 'i_crates_0_0'), (16, 3, 'i_crates_0_1'),
                (4, 4, 'i_lantern_stand_0_0'), (4, 5, 'i_lantern_stand_1_0'), (27, 4, 'i_lantern_stand_0_0'), (27, 5, 'i_lantern_stand_1_0'),
                (11, 4, 'i_net'), (20, 4, 'i_net'), (19, 6, 'i_plant_coral'), (14, 11, 'i_plant_coral'),
                (15, 8, 'cave_rock'), (18, 9, 'cave_rock'), (3, 13, 'cave_rock'),
                (6, 14, 'i_barrel'), (8, 15, 'i_crates_0_0'), (9, 15, 'i_crates_0_1'), (28, 14, 'crystal'), (24, 15, 'crystal')]:
    G.put(x, y, t)
save(G, {"title": "Lanternport Grotto",
    "npcs": [{"id": "lanternport_grotto_tidewatcher", "x": 18, "y": 14, "facing": "left", "kind": "villager", "text_ref": tref('lanternport_grotto', 'lanternport_grotto_tidewatcher')}],
    "signs": [],
    "items": [{"id": "grotto_item", "x": 27, "y": 15, "hidden": True, "item": "potion", "flag": "item_lanternport_grotto_grotto_item"}],
    "interact_spots": [
        {"id": "lanternport_grotto_signal_crate", "x": 15, "y": 4, "facing": "up", "what": "the INSTRUMENTS - SIGNAL crate, washed up under the lighthouse (story: Record 4 of The Missing Note)", "text_ref": "overworld_lines.json system_story_r78.signal_crate_first", "text_ref_again": "overworld_lines.json system_story_r78.signal_crate_again", "sets_flag": "found_signal_crate_r7"},
        {"id": "lanternport_grotto_keeper_lamps", "x": 13, "y": 4, "facing": "up", "what": "old keeper's lamps, still trimmed by someone", "text_ref": tref('lanternport_grotto', 'lanternport_grotto_keeper_lamps')},
        {"id": "lanternport_grotto_nets", "x": 11, "y": 5, "facing": "up", "what": "nets hung to dry, names stitched on the floats", "text_ref": tref('lanternport_grotto', 'lanternport_grotto_nets')}],
    "encounter_zones": [{"x0": 3, "y0": 5, "x1": 28, "y1": 16, "table": "lanternport_grotto_cave"}],
    "ambient": ["tide pools use the animated cave_water ring (same as tidewater_cave_int)", "keeper lanterns + lantern stands glow at night"],
    "entered_from": {"map": "lanternport", "x": 39, "y": 13}}, [15, 16], 'lanternport', (39, 13))

# ---------------- Cindervale Caldera (R8) ----------------
C = Cave('cindervale_caldera', 34, 24, 8)
C.carve(3, 4, 30, 19); C.carve(16, 20, 17, 23)
C.fill(3, 19, 5, 19); C.fill(28, 19, 30, 19)
for x in range(3, 31):                                # slag channel, crossed by two stone bridges
    for y in (10, 11):
        if x not in (8, 9, 24, 25): C.put(x, y, 'i_lava')
for y in range(5, 19):                                # old ore-cart line over the west bridge
    if C.dec[y][8] == 0: C.put(8, y, 'i_rail_v')
C.put(8, 4, 'i_rail_buffer')
for x in range(20, 30): C.put(x, 16, 'i_rail_h')
for x, y, t in [(4, 4, 'i_forge_0_0'), (5, 4, 'i_forge_0_1'), (4, 5, 'i_forge_1_0'), (5, 5, 'i_forge_1_1'), (4, 7, 'i_anvil'),
                (13, 4, 'i_barrel'), (14, 4, 'i_crates_0_0'), (15, 4, 'i_crates_0_1'), (30, 16, 'i_rail_buffer'), (28, 15, 'i_ore_cart'),
                (20, 6, 'cave_rock'), (21, 6, 'cave_rock'), (12, 14, 'cave_rock'), (22, 13, 'cave_rock'), (5, 17, 'cave_rock'),
                (30, 5, 'crystal'), (29, 18, 'crystal'), (3, 17, 'crystal'), (26, 5, 'i_lava'), (27, 5, 'i_lava'), (26, 6, 'i_lava'),
                (11, 18, 'i_barrel')]:
    C.put(x, y, t)
C.dec[5][8] = ID['i_ore_cart']                        # cart parked at the top of the line (replaces a rail cell)
save(C, {"title": "Cindervale Caldera",
    "npcs": [{"id": "cindervale_caldera_smelter", "x": 13, "y": 17, "facing": "left", "kind": "villager", "text_ref": tref('cindervale_caldera', 'cindervale_caldera_smelter')}],
    "signs": [{"id": "cindervale_caldera_sign", "x": 18, "y": 19, "text": "DRAFT dev label: Caldera tunnels - mind the slag channel", "read_from": "down", "text_ref": tref('cindervale_caldera', 'cindervale_caldera_sign'), "text_note": "dev label only; final text = text_ref"}],
    "items": [{"id": "caldera_item", "x": 29, "y": 4, "hidden": False, "item": "potion", "flag": "item_cindervale_caldera_caldera_item"}],
    "interact_spots": [
        {"id": "cindervale_caldera_old_forge", "x": 4, "y": 6, "facing": "up", "what": "the first forge of Cindervale, cold for years", "text_ref": tref('cindervale_caldera', 'cindervale_caldera_old_forge')},
        {"id": "cindervale_caldera_ore_cart", "x": 9, "y": 5, "facing": "left", "what": "ore cart with a name chalked on the side", "text_ref": tref('cindervale_caldera', 'cindervale_caldera_ore_cart')}],
    "encounter_zones": [{"x0": 3, "y0": 4, "x1": 30, "y1": 19, "table": "cindervale_caldera_cave"}],
    "ambient": ["slag channel = i_lava (animated glow, no smoke/haze)", "obsidian glints = crystal tiles"],
    "entered_from": {"map": "cindervale", "x": 38, "y": 13}}, [16, 17], 'cindervale', (38, 13))
for s in [C]: pass
# signs need a blocked square: put the sign board on the sign cell
cm = json.load(open(os.path.join(MAPS, 'cindervale_caldera.json')))
cm['layers']['decoration'][19][18] = ID['i_sign_board']; cm['layers']['collision'][19][18] = 1
json.dump(cm, open(os.path.join(MAPS, 'cindervale_caldera.json'), 'w'), separators=(',', ':'))

# ---------------- town mouths ----------------
ENT = [['cave_entrance_0_0', 'cave_entrance_0_1', 'cave_entrance_0_2'], ['cave_entrance_1_0', 'cave_entrance_1_1', 'cave_entrance_1_2']]
for town, cave, (dx, dy), sign in [('lanternport', 'lanternport_grotto', (39, 13), (36, 13)), ('cindervale', 'cindervale_caldera', (38, 13), (35, 13))]:
    p = os.path.join(MAPS, town + '.json'); t = json.load(open(p))
    for r in range(2):
        for k in range(3):
            x, y = dx - 1 + k, dy - 1 + r; tid = ID[ENT[r][k]]
            t['layers']['decoration'][y][x] = tid; t['layers']['collision'][y][x] = CODE[tid]
    t['warps'] = [w for w in t['warps'] if w['to'] != cave] + [{"x": dx, "y": dy, "to": cave, "tx": 15 if cave.startswith('lantern') else 16, "ty": 20 if cave.startswith('lantern') else 22, "facing": "up"}]
    sid = f"{cave}_sign"  # town-side sign (renamed Oct 29 2026 from {town}_{cave}_sign)
    t['layers']['decoration'][sign[1]][sign[0]] = ID['sign']; t['layers']['collision'][sign[1]][sign[0]] = 1
    t['signs'] = [s for s in t['signs'] if s['id'] != sid] + [{"id": sid, "x": sign[0], "y": sign[1], "text": f"DRAFT dev label: {cave} mouth", "read_from": "down", "text_ref": tref(town, sid), "text_note": "dev label only; final text = text_ref"}]
    json.dump(t, open(p, 'w'), separators=(',', ':'))
print('ok')
