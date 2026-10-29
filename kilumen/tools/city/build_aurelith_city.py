#!/usr/bin/env python3
"""Build Aurelith (88x62 = 64x48 playable + 12/7 padding) and its city interiors from the city kit.
python3 tools/city/build_aurelith_city.py      (needs tools/city/city_layout.json from city_art.py)
Plan: design/AURELITH_CITY_PLAN.md (approved by Gary). Coordinates below are PLAYABLE; P() adds the 12/7 padding."""
import json, os, re, copy, random
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld'); MAPS = os.path.join(OW, 'maps')
TS = json.load(open(os.path.join(OW, 'tileset.json'))); BY = {e['name']: e for e in TS['tiles']}; MTO = TS['multi_tile_objects']
LAY = json.load(open(os.path.join(HERE, 'city_layout.json')))
DX, DY, PW, PH = 12, 7, 64, 48; W, H = PW + 2 * DX, PH + 2 * DY
rnd = random.Random(2026)
def tid(n): return BY[n]['id']
def cc(n): return BY[n]['collision_code']

class M:
    def __init__(s, name, w, h, title):
        s.name, s.w, s.h, s.title = name, w, h, title
        s.L = {k: [[0] * w for _ in range(h)] for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter')}
        s.warps, s.exits, s.npcs, s.signs, s.items, s.spots, s.gates = [], [], [], [], [], [], []
    def g(s, x, y, n): s.L['ground'][y][x] = tid(n)
    def put(s, x, y, n, layer='decoration', col=None):
        s.L[layer][y][x] = tid(n)
        if layer == 'decoration': s.L['collision'][y][x] = cc(n) if col is None else col
    def obj(s, x, y, name, layer='decoration'):
        """multi-tile kit object (top-left x,y) or a single tile; collision from each tile."""
        if name in MTO:
            o = MTO[name]
            for r in range(o['h']):
                for c in range(o['w']):
                    n = o['tile_name_pattern'].replace('<row>', str(r)).replace('<col>', str(c))
                    if n in BY: s.put(x + c, y + r, n, layer)
        else: s.put(x, y, name, layer)
    def free(s, x, y): return 0 <= x < s.w and 0 <= y < s.h and s.L['collision'][y][x] == 0
    def save(s, extra=None):
        j = {'name': s.name, 'title': s.title, 'width': s.w, 'height': s.h, 'tile_size': 64, 'tileset': '../tileset.json', 'layers': s.L,
             'warps': s.warps, 'exits': s.exits, 'npcs': s.npcs, 'signs': s.signs, 'items': s.items, 'encounter_zones': [],
             'source': 'tools/city/build_aurelith_city.py (Aurelith city v1, Oct 29 2026; plan design/AURELITH_CITY_PLAN.md)',
             'movement': {'run': True, 'bike': not s.name.endswith('_int') and not s.name.startswith('home_'), 'note': 'running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md'}}
        if getattr(s, 'walled', False):   # wall rows stay solid under banners/panels (except door cells)
            for y in range(3):
                for x in range(s.w):
                    if s.L['collision'][y][x] == 0: s.L['collision'][y][x] = 1
        if s.spots: j['interact_spots'] = s.spots
        if s.gates: j['story_gates'] = s.gates
        if extra: j.update(extra)
        p = os.path.join(MAPS, s.name + '.json')
        with open(p, 'w') as f: json.dump(j, f, separators=(',', ':'))
        return j

def P(x, y): return x + DX, y + DY

# =========================================================================================== exterior
def city():
    old = json.load(open(os.path.join(HERE, 'aurelith_v0_source.json')))  # pre-city map (NPC/sign/item/warp data source; keeps the build re-runnable)
    m = M('aurelith', W, H, 'Aurelith')
    kind = [['P'] * W for _ in range(H)]          # P pave, R road, Z plaza, G grass, X water, T tree-padding, B brick
    for y in range(H):
        for x in range(W):
            if not (DX <= x < DX + PW and DY <= y < DY + PH): kind[y][x] = 'T'
    def area(x0, y0, x1, y1, k):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                X, Y = P(x, y)
                if 0 <= X < W and 0 <= Y < H: kind[Y][X] = k
    # roads (playable coords)
    area(0, 11, 63, 12, 'R'); area(0, 33, 63, 34, 'R'); area(-12, 20, 75, 22, 'R')   # North St, South St, Rail Boulevard (+ west/east corridors)
    area(30, 11, 33, 43, 'R')                                                     # Crown Avenue
    area(14, 13, 15, 19, 'R'); area(48, 13, 49, 19, 'R'); area(14, 23, 15, 32, 'R'); area(48, 23, 49, 32, 'R')  # side streets
    area(31, 44, 32, 54, 'R')                                                     # south gate passage + corridor
    area(22, 9, 39, 10, 'Z'); area(16, 24, 28, 32, 'Z'); area(35, 24, 46, 31, 'Z')  # forecourt, Crown Plaza, market
    area(50, 36, 63, 47, 'G'); area(50, 41, 63, 42, 'X'); area(55, 41, 56, 42, 'Z')  # canal park + bridge
    area(0, 44, 28, 47, 'P')
    # ground layer
    for y in range(H):
        for x in range(W):
            k = kind[y][x]
            nb = lambda dx, dy: kind[y + dy][x + dx] if 0 <= x + dx < W and 0 <= y + dy < H else k
            if k == 'T': m.g(x, y, f'grass_{rnd.randrange(4)}')
            elif k == 'G': m.g(x, y, f'grass_{rnd.randrange(4)}')
            elif k == 'X': m.g(x, y, 'water'); m.L['collision'][y][x] = 3
            elif k == 'Z': m.g(x, y, 'x_city_plaza_0')
            elif k == 'R': m.g(x, y, f'x_city_asphalt_{rnd.randrange(4)}')
            else:
                road = sum(b for b, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))) if nb(dx, dy) == 'R')
                wat = sum(b for b, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))) if nb(dx, dy) == 'X')
                m.g(x, y, f'x_city_canal_{wat}' if wat else f'x_city_pave_{road}')
    # grass verge next to water -> coping pavement ring
    for y in range(H):
        for x in range(W):
            if kind[y][x] == 'G' and any(0 <= y + dy < H and kind[y + dy][x] == 'X' for dy in (-1, 1)):
                wat = (1 if kind[y - 1][x] == 'X' else 0) | (4 if kind[y + 1][x] == 'X' else 0); m.g(x, y, f'x_city_canal_{wat}')
    # road markings
    def mark(x, y, n): X, Y = P(x, y); m.g(X, Y, n)
    for y in range(13, 44):
        if y in (20, 21, 22, 33, 34): continue
        mark(31, y, 'x_city_road_e'); mark(32, y, 'x_city_road_w')
    for x in range(-12, 76):
        if 30 <= x <= 33: continue
        mark(x, 21, 'x_city_road_h')
    for x in list(range(0, 30)) + list(range(34, 64)):
        if x in (14, 15, 48, 49): continue
        mark(x, 11, 'x_city_road_s'); mark(x, 12, 'x_city_road_n'); mark(x, 33, 'x_city_road_s'); mark(x, 34, 'x_city_road_n')
    for y in (20, 21, 22):
        for x in (28, 29, 34, 35): mark(x, y, 'x_city_zebra_h')
    for x in (30, 31, 32, 33):
        for y in (18, 19, 23, 24): mark(x, y, 'x_city_zebra_v')
    for y in (11, 12, 33, 34):
        for x in (12, 13, 16, 17, 46, 47, 50, 51): mark(x, y, 'x_city_zebra_h')
    for y in range(24, 33):
        for x in range(16, 29):
            if (x + y) % 2 == 0: mark(x, y, 'x_city_plaza_1' if (x, y) in ((18, 26), (26, 26), (18, 30), (26, 30)) else 'x_city_plaza_0')
    for x in range(16, 29): mark(x, 28, 'x_city_plaza_2')
    for x in range(22, 40): mark(x, 10, 'x_city_plaza_2')
    for y in range(9, 11):
        for x in range(26, 36): mark(x, y, 'x_city_brick_0' if (x + y) % 2 else 'x_city_brick_1')
    # padding trees (keep exit corridors open)
    for y in range(H):
        for x in range(W):
            if kind[y][x] == 'T':
                m.put(x, y, 'tree_base')
                if y > 0: m.L['overlay'][y - 1][x] = tid('tree_top')
    # ------------------------------------------------------------ buildings
    placed = {}
    def bld(key, x, y):
        o = LAY['objects'][key]; X0, Y0 = P(x, y); placed[key] = (X0, Y0)
        pas = {tuple(p) for p in o['passage']}
        for r in range(o['h']):
            for c in range(o['w']):
                n = f'x_city_{key}_{r}_{c}'; cv = o['cov'][r][c]; X, Y = X0 + c, Y0 + r
                if cv == 0: continue
                if (c, r) in pas or r in o['overlay_rows'] and key == 'spire' or cv <= 0.04:
                    m.L['overlay'][Y][X] = tid(n); continue
                m.put(X, Y, n, col=1)
        return X0, Y0
    def door(key, cell, to=None, **kw):
        X0, Y0 = placed[key]; X, Y = X0 + cell[0], Y0 + cell[1]
        if to:
            m.L['collision'][Y][X] = 4; m.warps.append({'x': X, 'y': Y, 'to': to, 'tx': kw.pop('tx', None), 'ty': kw.pop('ty', None), 'facing': 'up', **kw})
        return X, Y
    bld('stadium', 22, 0); bld('capitol', 2, 1); bld('museum', 52, 1)
    bld('hotel', 5, 14); bld('galleria', 35, 14); bld('rthq', 52, 14)
    bld('terminal', 1, 24); bld('spire', 20, 24)
    bld('gate_w', -4, 17); bld('gate_e', 64, 17); bld('gate_s', 29, 44)
    for i, x in enumerate((1, 8, 15)): bld(f'apartment_{i}', x, 36)
    bld('school', 22, 36)
    for i, x in enumerate((1, 8, 15, 22)): bld(f'terrace_{i}', x, 42)
    bld('cafe', 36, 36)
    # existing heal centre (7x5) + shop (5x5) building tiles on the services strip
    for key, x in (('heal_centre', 16), ('shop', 24)):
        X0, Y0 = P(x, 14); m.obj(X0, Y0, key)
    hx, hy = P(16 + 3, 18); sx, sy = P(24 + 2, 18)
    m.L['collision'][hy][hx] = 4; m.L['collision'][sy][sx] = 4
    m.warps += [{'x': hx, 'y': hy, 'to': 'heal_aurelith', 'tx': 7, 'ty': 9, 'facing': 'up', 'note': 'Revival Tech Aurelith branch (heal_centre door, services row)'},
                {'x': sx, 'y': sy, 'to': 'shop_int', 'tx': 5, 'ty': 7, 'facing': 'up', 'note': 'RT Supply shop (shared interior)'}]
    # market stalls 1x2 (plaza east), one free square between each
    for i, k in enumerate(('fruit', 'crystal', 'flowers', 'bread', 'fabric', 'toys')):
        bld(f'stall_{k}', 36 + i * 2, 25)
    # doors
    door('stadium', (8, 8), 'aurelith_stadium_int', tx=8, ty=10, note='Aurelith Games stadium (the endgame Arena): lobby; the arena door inside is behind gate_aurelith_arena')
    door('stadium', (9, 8), 'aurelith_stadium_int', tx=9, ty=10, note='Aurelith Games stadium lobby')
    for c in (5, 6): door('terminal', (c, 6), 'aurelith_terminal_int', tx=9 + c - 5, ty=11, rail=True, note='Grand Terminal (Lumen Line): rail arrivals land one square below this door')
    for c in (5, 6): door('galleria', (c, 4), 'aurelith_galleria_1f_int', tx=6 + c - 5, ty=8, note='Galleria department store 1F (lift to 2F-4F and roof)')
    for c in (3, 4): door('rthq', (c, 4), 'aurelith_rthq_int', tx=7 + c - 3, ty=9, note='Revival Tech HQ lobby (lore only, Gary)')
    for c in (3, 4): door('hotel', (c, 4), 'aurelith_hotel_int', tx=6 + c - 3, ty=8, note='Grand Hotel lobby (lift to 2F)')
    homes = [('apartment_0', (3, 4), 'home_aurelith_flat'), ('apartment_1', (3, 4), 'home_aurelith_flat'), ('apartment_2', (3, 4), 'home_aurelith_flat'),
             ('terrace_0', (3, 3), 'home_lanternport_c'), ('terrace_1', (3, 3), 'home_saltmere_a'), ('terrace_2', (3, 3), 'home_brookhollow_a'), ('terrace_3', (3, 3), 'home_fernwick_c')]
    oldw = {w['to']: w for w in old['warps']}
    for key, cell, to in homes:
        extra = {k: oldw[to][k] for k in ('recolour', 'scheme', 'design') if to in oldw and k in oldw[to]}
        door(key, cell, to, tx=oldw[to]['tx'] if to in oldw else 6, ty=oldw[to]['ty'] if to in oldw else 8, note=f'{key} door -> {to} (shared interior, $return)', **extra)
    closed = []
    for key, cells, sid in (('capitol', ((4, 6), (5, 6)), 'aurelith_capitol_door'), ('museum', ((4, 6), (5, 6)), 'aurelith_museum_door'),
                            ('cafe', ((2, 2),), 'aurelith_cafe_door'), ('school', ((3, 3),), 'aurelith_school_door')):
        X, Y = door(key, cells[0]); closed.append((sid, X, Y))
    # ------------------------------------------------------------ furniture (never in a 1-wide gap, never in front of a door, never on a crossing)
    doorfront = {(w['x'], w['y'] + 1) for w in m.warps} | {(x, y + 1) for _, x, y in closed}
    def furn(x, y, n):
        X, Y = P(x, y)
        assert (X, Y) not in doorfront, (n, x, y)
        assert m.L['collision'][Y][X] == 0 and kind[Y][X] in 'PZG', (n, x, y, kind[Y][X], m.L['collision'][Y][X])
        m.put(X, Y, 'x_city_' + n)
        if n == 'tree_base' and m.L['overlay'][Y - 1][X] == 0: m.L['overlay'][Y - 1][X] = tid('x_city_tree_top')
    for x in (1, 6, 18, 25, 38, 44, 50, 57, 62): furn(x, 19, 'lamp') if x not in (14, 15, 48, 49) else None
    for x in (0, 4, 13, 17, 26, 40, 45, 53, 58): furn(x, 23, 'tree_base') if x not in (14, 15, 48, 49) else None
    for y in (14, 16, 26, 28, 30, 37, 39): furn(29, y, 'lamp'); furn(34, y, 'lamp')
    for y in (15, 27, 36, 38, 41): furn(28, y, 'tree_base') if y != 15 else None
    for (x, y, n) in ((16, 24, 'bench_h'), (28, 24, 'bench_h'), (16, 32, 'planter'), (28, 32, 'planter'), (17, 28, 'lamp'), (27, 28, 'lamp'),
                      (18, 24, 'planter'), (26, 24, 'planter'), (25, 31, 'bench_v'), (19, 31, 'bench_v'),
                      (35, 31, 'bin'), (46, 31, 'notice'), (46, 24, 'kiosk'), (35, 24, 'lamp'),
                      (22, 10, 'flag'), (39, 10, 'flag'), (24, 10, 'bench_h'), (37, 10, 'bench_h'),
                      (1, 10, 'street_sign'), (13, 10, 'lamp'), (51, 10, 'lamp'), (62, 10, 'street_sign'),
                      (51, 26, 'tram_stop'), (51, 28, 'bench_v'), (53, 30, 'vending_b'), (55, 30, 'vending_r'), (58, 26, 'bike_rack'), (61, 28, 'planter'),
                      (13, 25, 'notice'), (13, 30, 'lamp'), (1, 32, 'bollard'), (11, 32, 'bollard'),
                      (35, 36, 'lamp'), (41, 36, 'cafe_table'), (42, 37, 'cafe_table'), (41, 38, 'cafe_table'), (45, 40, 'statue'), (38, 42, 'planter'), (44, 46, 'lamp'),
                      (0, 41, 'lamp'), (21, 41, 'lamp'), (28, 46, 'bin'), (7, 47, 'planter'), (14, 47, 'planter'),
                      (36, 13, 'bin'), (47, 13, 'lamp'), (60, 13, 'lamp'), (51, 13, 'bike_rack'), (2, 13, 'lamp'), (16, 13, 'bin'), (29, 13, 'lamp')):
        furn(x, y, n)
    # canal park
    for (x, y) in ((51, 37), (54, 37), (58, 37), (62, 37), (51, 45), (58, 45), (62, 46)):
        X, Y = P(x, y); m.put(X, Y, 'tree_base'); m.L['overlay'][Y - 1][X] = tid('tree_top')
    for (x, y) in ((53, 39), (60, 39), (52, 44), (61, 44)): X, Y = P(x, y); m.put(X, Y, 'x_city_hedge')
    for (x, y) in ((56, 37), (57, 39), (54, 46), (60, 46)): X, Y = P(x, y); m.put(X, Y, 'flowers_warm', col=0)
    for (x, y) in ((54, 43), (57, 43), (54, 40), (57, 40)): X, Y = P(x, y); m.put(X, Y, 'x_city_lamp')
    # ------------------------------------------------------------ exits (W/E y20-21 playable, S x31-32; stadium door replaces the north exit)
    m.exits = [{'edge': 'west', 'start': 27, 'end': 28, 'to': 'route_east', 'offset': -8, 'note': 'Rail Boulevard west gate (playable y20-21)'},
               {'edge': 'east', 'start': 27, 'end': 28, 'to': 'route_aurelith_saltmere', 'offset': -8, 'note': 'Rail Boulevard east gate (playable y20-21)'},
               {'edge': 'south', 'start': 43, 'end': 44, 'to': 'route_cindervale', 'offset': -21, 'note': 'Crown Avenue south gate (playable x31-32)'}]
    # ------------------------------------------------------------ NPCs / signs / items
    on = {n['id']: n for n in old['npcs']}
    def npc(id_, x, y, facing, kind_, note, sprite=None, keep=True):
        X, Y = P(x, y); assert m.free(X, Y), (id_, x, y)
        d = copy.deepcopy(on[id_]) if id_ in on else {'id': id_, 'kind': kind_, 'note': note, 'text_ref': f'overworld_lines.json maps.aurelith.{id_}'}
        d.update({'x': X, 'y': Y, 'facing': facing}); m.L['collision'][Y][X] = 0
        if id_ not in on: d['note'] = note + ' (line requested: data/textbot_requests_aurelith_city.md)'
        if sprite: d['sprite'] = sprite
        m.npcs.append(d)
    npc('aurelith_airspace_officer', 8, 32, 'down', 'guard', '')
    npc('aurelith_lucky_crystal_seller', 39, 28, 'up', 'clerk', '')
    npc('aurelith_villager_1', 22, 32, 'up', 'villager', '')
    npc('aurelith_villager_2', 9, 46, 'down', 'villager', '')
    npc('aurelith_ron_6', 33, 10, 'up', 'rival', '')
    npc('aurelith_commuter', 10, 23, 'left', 'villager', 'commuter by the terminal', 'vil_commuter_f')
    npc('aurelith_business', 53, 19, 'down', 'villager', 'business person outside RT HQ', 'vil_business_m')
    npc('aurelith_fan_1', 27, 9, 'right', 'villager', 'Games fan on the stadium forecourt', 'vil_fan_m')
    npc('aurelith_fan_2', 36, 9, 'left', 'villager', 'Games fan on the stadium forecourt', 'vil_fan_m')
    npc('aurelith_station_guard', 5, 32, 'down', 'guard', 'station guard at the Grand Terminal door', 'vil_stationguard_m')
    npc('aurelith_tourist', 24, 33 - 1, 'up', 'villager', 'tourist admiring the Lumen Spire', 'vil_tourist_f')
    npc('aurelith_gate_guide_e', 59, 23, 'left', 'guard', 'guide at the east gate', 'vil_stationguard_m')
    npc('aurelith_gate_guide_s', 36, 45, 'left', 'guard', 'guide at the south gate', 'vil_stationguard_m')
    npc('aurelith_park_walker', 59, 38, 'down', 'villager', 'walker in Canal Park', 'vil_tourist_f')
    npc('aurelith_cafe_regular', 40, 37, 'right', 'villager', 'cafe regular', 'vil_business_m')
    os_ = {s['id']: s for s in old['signs']}
    def sign(id_, x, y, text, read='down'):
        X, Y = P(x, y); d = copy.deepcopy(os_.get(id_, {'id': id_, 'text_ref': f'overworld_lines.json maps.aurelith.{id_}', 'text_note': 'dev label only; final text = text_ref'}))
        d.update({'x': X, 'y': Y, 'text': text, 'read_from': read}); m.signs.append(d); return X, Y
    sign('aurelith_sign', 13, 23, 'Aurelith - capital city. Arrivals by rail only.')   # on the notice board? keep board free: use street square sign below
    m.signs[-1].update(dict(zip(('x', 'y'), P(13, 25))))
    sign('aurelith_arena_sign', 22, 10, 'Aurelith Games Stadium - the Arena. Challenge coins required.')
    sign('aurelith_au_fountain_hint', 21, 31, 'Something glints at the rim of the Lumen Spire fountain.', 'up')
    for sid, X, Y in closed:
        m.signs.append({'id': sid, 'x': X, 'y': Y, 'text': 'Closed today.', 'read_from': 'down', 'text_ref': f'overworld_lines.json maps.aurelith.{sid}', 'text_note': 'closed door: dev label only'})
    sign('aurelith_crown_avenue_sign', 1, 10, 'Crown Avenue / North Street')
    sign('aurelith_rail_blvd_sign', 62, 10, 'Rail Boulevard - East Gate')
    m.signs[-2].update(dict(zip(('x', 'y'), P(1, 10)))); m.signs[-1].update(dict(zip(('x', 'y'), P(62, 10))))
    sign('aurelith_tram_stop', 51, 26, 'Tram stop: Terminal - Stadium (not running yet)')
    sign('aurelith_kiosk', 46, 24, 'City info kiosk')
    oi = {i['id']: i for i in old['items']}
    for iid, (x, y) in (('aurelith_item_1', (21, 31)), ('aurelith_item_2', (0, 31)), ('aurelith_item_3', (38, 13))):
        d = copy.deepcopy(oi[iid]); d['x'], d['y'] = P(x, y); m.items.append(d)
    m.items[0]['note'] = 'GD au_fountain: Lumen Spire fountain rim (hidden; sign hint beside it)'
    m.items[1]['note'] = 'GD au_station: Grand Terminal side alley'
    m.items[2]['note'] = 'GD au_arena_steps: Galleria steps planter row by the avenue'
    extra = {k: old[k] for k in ('padding', 'movement') if k in old}
    extra['padding'] = {'dx': DX, 'dy': DY, 'old_size': [PW, PH], 'rule': old['padding']['rule']}
    extra['title'] = 'Aurelith'
    extra['city'] = {'plan': 'design/AURELITH_CITY_PLAN.md', 'playable': [PW, PH], 'rail_arrival': 'Grand Terminal door (warp with rail:true)', 'stadium': 'the stadium door replaces the old north exit; gate_aurelith_arena moved into aurelith_stadium_int'}
    j = m.save(extra)
    return m, j

# =========================================================================================== interiors
def room(name, w, h, title, kit='aurelith', floor='i_floor_marble_a', mats=None, mat='i_mat_aurelith'):
    m = M(name, w, h, title); m.walled = True
    top, up, win, face = {'aurelith': ('i_wall_top_aurelith', 'i_wall_upper_aurelith', 'i_wall_upper_win_aurelith', 'i_wall_face_aurelith'),
                          'rt': ('i_wall_top_rtbranch', 'i_wall_upper_rtbranch', 'i_wall_upper_win_rtbranch', 'i_wall_face_rtbranch')}[kit]
    if win not in BY: win = up
    for y in range(h):
        for x in range(w):
            if y == 0: m.g(x, y, top); m.L['collision'][y][x] = 1
            elif y == 1: m.g(x, y, win if x % 4 == 2 else up); m.L['collision'][y][x] = 1
            elif y == 2: m.g(x, y, face); m.L['collision'][y][x] = 1
            else: m.g(x, y, floor if not isinstance(floor, list) else floor[(x + y) % len(floor)])
    for x in (mats or [w // 2]):
        m.put(x, h - 1, mat); m.warps.append({'x': x, 'y': h - 1, 'to': '$return', 'tx': None, 'ty': None, 'facing': 'down', 'note': '$return: back out of the street door used to enter'})
    return m

def lift(m, x, floors, here):
    """i_lift (1x2) against the wall at column x; menu spot on its lower cell, used from the square below (Dialog ask -> warp)."""
    m.obj(x, 2, 'i_lift')
    m.spots.append({'id': 'lift', 'kind': 'lift', 'x': x, 'y': 3, 'stand': [x, 4], 'face': 'up', 'tile': 'i_lift_1_0',
                    'prompt': 'Lift. Which floor?', 'here': here, 'floors': floors, 'text': 'menu warp (overworld.js runSpot kind lift); no Text Bot line needed'})

def interiors():
    out = []
    # ---- Grand Terminal (station kit, copied from station_int and re-titled)
    st = json.load(open(os.path.join(MAPS, 'station_int.json')))
    t = copy.deepcopy(st); t['name'] = 'aurelith_terminal_int'; t['title'] = 'Grand Terminal (Lumen Line)'
    t['npcs'] = [{**n, 'id': 'aurelith_terminal_' + n['id'].replace('station_', ''), 'text_ref': 'overworld_lines.json maps.aurelith_terminal_int.aurelith_terminal_' + n['id'].replace('station_', ''),
                  'note': 'Grand Terminal copy of ' + n['id'] + ' (line requested: data/textbot_requests_aurelith_city.md)'} for n in st['npcs']]
    t['npcs'].append({'id': 'aurelith_terminal_guard', 'x': 15, 'y': 10, 'facing': 'left', 'kind': 'guard', 'sprite': 'vil_stationguard_m', 'note': 'station guard (line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_terminal_int.aurelith_terminal_guard'})
    t['signs'] = [{**s, 'id': 'aurelith_terminal_' + s['id'], 'text_ref': 'overworld_lines.json maps.aurelith_terminal_int.aurelith_terminal_' + s['id']} for s in st['signs']]
    t['interact_spots'] = []; t['source'] = 'tools/city/build_aurelith_city.py: copy of station_int (Lumen Line kit) for the Grand Terminal'
    t.pop('text_pending', None)
    for w in t['warps']: w['note'] = '$return: back out of the Grand Terminal door'
    json.dump(t, open(os.path.join(MAPS, t['name'] + '.json'), 'w'), separators=(',', ':')); out.append(t['name'])
    # ---- Stadium lobby (the Arena entrance): turnstiles, trophy cases, crystal barrier before the arena door
    m = room('aurelith_stadium_int', 18, 12, 'Aurelith Games Stadium - lobby', floor=['i_floor_marble_a', 'i_floor_marble_b'], mats=[8, 9])
    m.obj(8, 1, 'i_walldoor_wood'); m.obj(9, 1, 'i_walldoor_wood')
    for x in (8, 9):
        m.L['collision'][2][x] = 4
        m.warps.append({'x': x, 'y': 2, 'to': 'aurelith_arena', 'tx': 8, 'ty': 12, 'facing': 'up', 'note': 'TO COME (DRAFT): the Arena floor (aurelith_arena, endgame) - behind gate_aurelith_arena'})
        m.put(x, 3, 'crystal_barrier_lit')
    m.gates.append({'id': 'gate_aurelith_arena', 'flag': 'all_badges', 'earned_at': 'all 8 challenge coins',
                    'cells': [{'x': x, 'y': 3, 'blocked_tile': 'crystal_barrier_lit', 'cleared_tile': 'crystal_barrier_dim'} for x in (8, 9)], 'npc': None,
                    'lines': {'text_file': 'text/overworld_lines.json', 'before': 'blockers.gate_aurelith_arena.before', 'after': 'blockers.gate_aurelith_arena.after', 'guard': None},
                    'cleared_state': 'barrier dims', 'detour': 'none: endgame', 'blocks': {'from_entry': 'aurelith stadium door', 'to_entry': 'aurelith_arena'},
                    'note': 'moved from aurelith (north exit row) into the stadium lobby: the stadium IS the coin-locked Arena (Gary)'})
    for x in (1, 4, 12, 15): m.obj(x, 3, 'i_trophy_case')
    for x in (6, 7, 10, 11): m.put(x, 6, 'i_turnstile')
    for x in (0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17): m.put(x, 6, 'i_railing')
    for x in (3, 14): m.obj(x, 1, 'i_banner_aurelith')
    m.obj(0, 8, 'i_plant_palm'); m.obj(17, 8, 'i_plant_palm'); m.obj(2, 9, 'i_bench'); m.obj(14, 9, 'i_bench')
    m.obj(7, 7, 'i_rug_violet') if False else None
    m.npcs += [{'id': 'aurelith_arena_doorman', 'x': 7, 'y': 4, 'facing': 'down', 'kind': 'guard', 'note': 'gate_aurelith_arena speaker (moved from the aurelith north exit into the stadium lobby)', 'text_ref': 'overworld_lines.json maps.aurelith.aurelith_arena_doorman'},
               {'id': 'aurelith_stadium_attendant', 'x': 13, 'y': 8, 'facing': 'left', 'kind': 'clerk', 'sprite': 'vil_clerk_f', 'note': 'ticket attendant (line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_stadium_int.aurelith_stadium_attendant'},
               {'id': 'aurelith_stadium_fan', 'x': 4, 'y': 8, 'facing': 'up', 'kind': 'villager', 'sprite': 'vil_fan_m', 'note': 'Games fan (line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_stadium_int.aurelith_stadium_fan'}]
    m.signs.append({'id': 'aurelith_stadium_board', 'x': 3, 'y': 2, 'text': 'Aurelith Games: the Arena is open to holders of all 8 challenge coins.', 'read_from': 'down', 'text_ref': 'overworld_lines.json maps.aurelith_stadium_int.aurelith_stadium_board', 'text_note': 'dev label only'})
    m.save(); out.append(m.name)
    # ---- RT HQ lobby (lore only)
    m = room('aurelith_rthq_int', 16, 11, 'Revival Tech HQ - lobby', kit='rt', floor=['i_floor_rtbranch_a', 'i_floor_rtbranch_b'], mats=[7, 8], mat='i_mat_rtbranch')
    m.obj(7, 1, 'i_rt_logo_panel'); m.put(5, 1, 'i_rt_poster_care', layer='decoration', col=1)
    for x, n in ((5, 'i_counter_rt_l'), (6, 'i_counter_rt_m'), (7, 'i_counter_rt_m'), (8, 'i_counter_rt_m'), (9, 'i_counter_rt_m'), (10, 'i_counter_rt_r')): m.put(x, 4, n)
    m.obj(6, 6, 'i_rug_violet'); m.obj(1, 7, 'i_sofa_aurelith'); m.obj(13, 7, 'i_sofa_aurelith'); m.obj(0, 3, 'i_plant_palm'); m.obj(15, 3, 'i_plant_palm')
    for x in (2, 13): m.obj(x, 3, 'i_crystal_display')
    m.npcs += [{'id': 'aurelith_rthq_receptionist', 'x': 7, 'y': 3, 'facing': 'down', 'kind': 'clerk', 'sprite': 'vil_clerk_f', 'note': 'reception (talk across the counter from y=5; line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_rthq_int.aurelith_rthq_receptionist'},
               {'id': 'aurelith_rthq_staffer', 'x': 11, 'y': 8, 'facing': 'left', 'kind': 'villager', 'sprite': 'vil_business_m', 'note': 'staffer with company lore (line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_rthq_int.aurelith_rthq_staffer'}]
    m.signs.append({'id': 'aurelith_rthq_plaque', 'x': 12, 'y': 2, 'text': 'Revival Tech - head office. Founded in Aurelith.', 'read_from': 'down', 'text_ref': 'overworld_lines.json maps.aurelith_rthq_int.aurelith_rthq_plaque', 'text_note': 'dev label only'})
    m.save(); out.append(m.name)
    # ---- Galleria 1F-4F + roof (lift menu)
    floors = [('1F', 'aurelith_galleria_1f_int', 'Heals and capture crystals'), ('2F', 'aurelith_galleria_2f_int', 'Battle items'), ('3F', 'aurelith_galleria_3f_int', 'Sports gear'),
              ('4F', 'aurelith_galleria_4f_int', 'Home and decor'), ('Roof', 'aurelith_galleria_roof', 'Roof garden')]
    LX = 12; fl = [{'label': f[0] + ' ' + f[2], 'map': f[1], 'x': LX, 'y': 4} for f in floors]
    carpets = ['i_floor_carpet_red_a', 'i_floor_carpet_teal_a', 'i_floor_carpet_violet_a', 'i_floor_marble_c']
    for i, (lab, name, theme) in enumerate(floors):
        if name.endswith('roof'):
            m = M(name, 14, 10, 'Galleria - roof garden')
            for y in range(10):
                for x in range(14): m.g(x, y, 'x_city_plaza_0' if (x + y) % 2 else 'x_city_plaza_3' if x == 6 else 'x_city_plaza_0')
            for x in range(14): m.put(x, 0, 'x_city_rail_fence'); m.put(x, 9, 'x_city_rail_fence')
            for y in range(1, 9): m.put(0, y, 'x_city_rail_fence'); m.put(13, y, 'x_city_rail_fence')
            m.L['decoration'][2][LX] = 0; m.L['collision'][2][LX] = 1
            m.obj(LX, 2, 'i_lift')
            m.spots.append({'id': 'lift', 'kind': 'lift', 'x': LX, 'y': 3, 'stand': [LX, 4], 'face': 'up', 'tile': 'i_lift_1_0', 'prompt': 'Lift. Which floor?', 'here': name, 'floors': fl, 'text': 'menu warp'})
            for (x, y, n) in ((2, 2, 'x_city_vending_b'), (3, 2, 'x_city_vending_r'), (2, 6, 'x_city_planter'), (5, 6, 'x_city_planter'), (8, 6, 'x_city_planter'), (6, 3, 'x_city_cafe_table'), (9, 3, 'x_city_cafe_table'), (4, 8, 'x_city_bench_h'), (9, 8, 'x_city_bench_h')):
                m.put(x, y, n)
            m.npcs.append({'id': 'aurelith_roof_kid', 'x': 7, 'y': 5, 'facing': 'down', 'kind': 'villager', 'sprite': 'vil_tourist_f', 'note': 'roof garden visitor (line requested)', 'text_ref': f'overworld_lines.json maps.{name}.aurelith_roof_kid'})
            m.save(); out.append(name); continue
        m = room(name, 14, 10, f'Galleria department store - {lab} ({theme})', floor=carpets[i], mats=[6, 7] if i == 0 else [])
        if i: m.L['ground'][9][6] = tid(carpets[i])
        lift(m, LX, fl, name)
        for x in (1, 3): m.obj(x, 1, 'i_shopshelf_wall')
        for y in (4, 6):
            for x in (5, 8): m.obj(x, y, 'i_shopshelf_island')
        m.obj(1, 7, 'i_plant_palm') if i % 2 else m.obj(1, 7, 'i_crystal_display')
        for x, n in ((9, 'i_counter_marble_l'), (10, 'i_counter_marble_r')): m.put(x, 3, n)
        m.npcs.append({'id': f'aurelith_galleria_clerk_{i + 1}', 'x': 10, 'y': 2 + 0, 'facing': 'down', 'kind': 'clerk', 'sprite': 'vil_clerk_f', 'note': f'{lab} clerk behind the counter (talk from y=4; line + shop list requested)', 'text_ref': f'overworld_lines.json maps.{name}.aurelith_galleria_clerk_{i + 1}'})
        m.L['collision'][2][10] = 0   # clerk stands on the face row behind the counter? no: keep wall; move clerk
        m.npcs[-1]['y'] = 2; m.L['collision'][2][10] = 1
        m.npcs[-1].update({'x': 10, 'y': 4, 'facing': 'down', 'note': f'{lab} floor clerk (line + shop list requested)'})
        m.L['decoration'][3][9] = m.L['decoration'][3][10] = 0; m.L['collision'][3][9] = m.L['collision'][3][10] = 0
        m.put(10, 3, 'i_counter_marble_m')
        m.npcs.append({'id': f'aurelith_galleria_shopper_{i + 1}', 'x': 3, 'y': 6, 'facing': 'up', 'kind': 'villager', 'sprite': ['vil_commuter_f', 'vil_business_m', 'vil_fan_m', 'vil_tourist_f'][i], 'note': 'shopper (line requested)', 'text_ref': f'overworld_lines.json maps.{name}.aurelith_galleria_shopper_{i + 1}'})
        m.signs.append({'id': f'aurelith_galleria_dir_{i + 1}', 'x': 7, 'y': 2, 'text': f'{lab}: {theme}', 'read_from': 'down', 'text_ref': f'overworld_lines.json maps.{name}.aurelith_galleria_dir_{i + 1}', 'text_note': 'dev label only'})
        m.save(); out.append(name)
    # ---- Hotel lobby + 2F
    hf = [{'label': 'Lobby', 'map': 'aurelith_hotel_int', 'x': 11, 'y': 4}, {'label': '2F Rooms', 'map': 'aurelith_hotel_2f_int', 'x': 11, 'y': 4}]
    m = room('aurelith_hotel_int', 14, 10, 'Grand Hotel - lobby', floor=['i_floor_marble_a', 'i_floor_marble_c'], mats=[6, 7])
    lift(m, 11, hf, m.name)
    for x, n in ((3, 'i_counter_marble_l'), (4, 'i_counter_marble_m'), (5, 'i_counter_marble_m'), (6, 'i_counter_marble_r')): m.put(x, 4, n)
    m.obj(5, 6, 'i_rug_red'); m.obj(1, 6, 'i_sofa_aurelith'); m.obj(9, 7, 'i_sofa_aurelith'); m.obj(0, 3, 'i_plant_palm'); m.obj(13, 6, 'i_plant_palm'); m.obj(8, 1, 'i_banner_aurelith')
    m.npcs += [{'id': 'aurelith_hotel_clerk', 'x': 4, 'y': 3, 'facing': 'down', 'kind': 'clerk', 'sprite': 'vil_clerk_f', 'note': 'front desk (talk across the counter from y=5; line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_hotel_int.aurelith_hotel_clerk'},
               {'id': 'aurelith_hotel_guest', 'x': 2, 'y': 8, 'facing': 'up', 'kind': 'villager', 'sprite': 'vil_tourist_f', 'note': 'guest (line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_hotel_int.aurelith_hotel_guest'}]
    m.save(); out.append(m.name)
    m = room('aurelith_hotel_2f_int', 14, 10, 'Grand Hotel - 2F', floor='i_floor_carpet_red_a', mats=[])
    lift(m, 11, hf, m.name)
    for x in (1, 4, 7): m.obj(x, 3, 'i_bed_aurelith'); m.put(x + 1, 3, 'i_table_aurelith_0_0') if False else None
    m.obj(1, 7, 'i_sofa_aurelith'); m.obj(5, 7, 'i_table_aurelith'); m.put(13, 3, 'i_plant_fern'); m.put(9, 3, 'i_tv_flat')
    m.npcs.append({'id': 'aurelith_hotel_tourist', 'x': 3, 'y': 6, 'facing': 'down', 'kind': 'villager', 'sprite': 'vil_tourist_f', 'note': 'hotel guest (line requested)', 'text_ref': 'overworld_lines.json maps.aurelith_hotel_2f_int.aurelith_hotel_tourist'})
    m.save(); out.append(m.name)
    # ---- Aurelith flat (apartments)
    m = room('home_aurelith_flat', 12, 10, 'Aurelith flat (shared interior)', floor='i_floor_marble_b', mats=[6])
    m.obj(1, 3, 'i_bed_aurelith'); m.put(3, 3, 'i_dresser_aurelith'); m.obj(8, 2 + 1, 'i_bookcase_aurelith'); m.put(10, 3, 'i_tv_flat')
    m.obj(2, 6, 'i_sofa_aurelith'); m.obj(7, 6, 'i_table_aurelith'); m.put(7, 7, 'i_chair_aurelith'); m.put(8, 7, 'i_chair_aurelith'); m.put(11, 8, 'i_plant_fern')
    m.npcs.append({'id': 'home_aurelith_flat_resident', 'x': 5, 'y': 5, 'facing': 'down', 'kind': 'villager', 'sprite': 'vil_commuter_f', 'note': 'flat resident (line requested)', 'text_ref': 'overworld_lines.json maps.home_aurelith_flat.home_aurelith_flat_resident'})
    m.save(); out.append(m.name)
    return out

def fix_links(city_json):
    # heal_aurelith back-warp -> below the new heal door
    h = json.load(open(os.path.join(MAPS, 'heal_aurelith.json')))
    hw = next(w for w in city_json['warps'] if w['to'] == 'heal_aurelith')
    for w in h['warps']:
        if w['to'] == 'aurelith': w.update({'tx': hw['x'], 'ty': hw['y'] + 1, 'note': f"exit to aurelith heal door ({hw['x']},{hw['y']})"})
    json.dump(h, open(os.path.join(MAPS, 'heal_aurelith.json'), 'w'), separators=(',', ':'))
    # entered_from records that point at an aurelith door: re-aim at the new door into that map
    for f in sorted(os.listdir(MAPS)):
        if not f.endswith('.json') or f == 'aurelith.json': continue
        p = os.path.join(MAPS, f); j = json.load(open(p)); ch = False
        keep = []
        for e in j.get('entered_from') or []:
            if e.get('map') == 'aurelith':
                d = next((w for w in city_json['warps'] if w['to'] == f[:-5]), None)
                if not d: ch = True; continue   # aurelith no longer opens into this map (e.g. heal_brookhollow -> heal_aurelith)
                if e.get('door') != [d['x'], d['y']]: e['door'] = [d['x'], d['y']]; ch = True
                if 'return_to' in e and e['return_to'] != [d['x'], d['y'] + 1]: e['return_to'] = [d['x'], d['y'] + 1]; ch = True
            keep.append(e)
        if ch: j['entered_from'] = keep
        if ch: json.dump(j, open(p, 'w'), separators=(',', ':'))
    for name, off in (('route_east', 8), ('route_aurelith_saltmere', 8), ('route_cindervale', 21)):
        p = os.path.join(MAPS, name + '.json'); r = json.load(open(p))
        for e in r['exits']:
            if e['to'] == 'aurelith': e['offset'] = off; e['note'] = 'Aurelith city v1 seam (88x62)'
        json.dump(r, open(p, 'w'), separators=(',', ':'))

def fix_layout(new_maps, city_json):
    p = os.path.join(OW, 'world_layout.json'); w = json.load(open(p))
    mb = w.setdefault('maps_built', [])
    for n in new_maps + ['heal_aurelith']:
        if n not in mb: mb.append(n)
    tw = [x for x in city_json['warps'] if x.get('rail')]
    w['rail'].setdefault('arrivals', {})['aurelith'] = {'map': 'aurelith', 'x': tw[0]['x'], 'y': tw[0]['y'] + 1, 'facing': 'down', 'door': 'Grand Terminal', 'interior': 'aurelith_terminal_int',
                                                        'note': 'rail arrival = one square below the Grand Terminal door (warp rail:true); region_map.railArrival prefers rail:true warps'}
    json.dump(w, open(p, 'w'), indent=1)

def sprite_map(city_json, inner):
    p = os.path.join(ROOT, 'art', 'characters', 'pixel', 'npcs', 'npc_sprite_map.json'); sm = json.load(open(p))
    for mname in ['aurelith'] + inner:
        j = json.load(open(os.path.join(MAPS, mname + '.json')))
        for n in j['npcs']:
            sid = n.get('sprite')
            if not sid:   # moved / copied NPC: reuse its existing sheet entry (aurelith.<id> or station_int.station_<role>)
                src = next((sm['map'][k] for k in (f'aurelith.{n["id"]}', 'station_int.' + n['id'].replace('aurelith_terminal_', 'station_')) if k in sm['map']), None)
                if src and f'{mname}.{n["id"]}' not in sm['map']: sm['map'][f'{mname}.{n["id"]}'] = dict(src)
                continue
            sm['map'][f'{mname}.{n["id"]}'] = {'sprite_id': sid, 'overworld_sheet': f'npcs/{sid}/overworld/{sid}_chibi_sheet.png', 'overworld_sheet_2x': f'npcs/{sid}/overworld/{sid}_chibi_sheet_2x.png',
                                              'overworld_sheet_3x': f'npcs/{sid}/overworld/{sid}_chibi_sheet_3x.png', 'overworld_frames_dir': f'npcs/{sid}/overworld/{sid}_chibi/', 'class': n['note'].split(' (')[0],
                                              'note': 'Aurelith city v1 (Oct 29 2026): new city NPC sheet (tools/city), 320x384 layout rows down/left/right/up'}
    json.dump(sm, open(p, 'w', encoding='utf-8'), indent=2, ensure_ascii=False); open(p, 'a').write('\n')

if __name__ == '__main__':
    m, j = city(); inner = interiors(); fix_links(j); fix_layout(inner, j); sprite_map(j, inner)
    print('aurelith', W, H, 'warps', len(j['warps']), 'npcs', len(j['npcs']), 'signs', len(j['signs']), 'interiors', inner)
