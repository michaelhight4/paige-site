#!/usr/bin/env python3
"""Build aurelith_arena (the Arena behind the stadium lobby's coin-locked doors; Gary, Oct 29 2026).
python3 tools/city/build_aurelith_arena.py
The two aurelith_stadium_int arena doors (8,2 / 9,2) already warp here (tx 8, ty 12), so the map id is aurelith_arena.
South: sign-up lobby (desk clerk behind a marble counter, exit mats back to the stadium lobby).
North: the event room through a 2-wide doorway: 8 Arena fighters, fought back to back (src/region78/arena.js).
Final Ron stays keyed aurelith_arena_int.aurelith_arena_ron_final (the tower, not built yet): not placed here.
Grid-fit: whole squares, every furniture square blocks, walk gaps are 2+ squares."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld'); MAPS = os.path.join(OW, 'maps')
TS = json.load(open(os.path.join(OW, 'tileset.json'))); BY = {e['name']: e for e in TS['tiles']}
W, H = 18, 14
L = {k: [[0] * W for _ in range(H)] for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter')}
def g(x, y, n, col=None): L['ground'][y][x] = BY[n]['id']; L['collision'][y][x] = BY[n]['collision_code'] if col is None else col
def put(x, y, n, col=None): L['decoration'][y][x] = BY[n]['id']; L['collision'][y][x] = BY[n]['collision_code'] if col is None else col
def obj(x, y, name, col=None):
    r = 0
    while f'{name}_{r}_0' in BY:
        c = 0
        while f'{name}_{r}_{c}' in BY: put(x + c, y + r, f'{name}_{r}_{c}', col); c += 1
        r += 1

for y in range(H):
    for x in range(W):
        if y == 0: g(x, y, 'i_wall_top_hall')
        elif y == 1: g(x, y, 'i_wall_upper_win_hall' if x % 4 == 2 else 'i_wall_upper_hall', 1)
        elif y == 2: g(x, y, 'i_wall_face_hall')
        elif y <= 7: g(x, y, 'floor_arena')
        elif y == 8: g(x, y, 'i_wall_upper_hall', 1)
        elif y == 9: g(x, y, 'i_wall_face_hall', 1)
        else: g(x, y, 'i_floor_marble_a' if (x + y) % 2 else 'i_floor_marble_b')
for x in (8, 9):  # doorway lobby <-> event room
    g(x, 8, 'floor_arena', 0); g(x, 9, 'floor_arena', 0)
# event room
obj(7, 4, 'arena_ring')                       # 4x4 walkable ring, the battle floor
for x in (5, 12): obj(x, 3, 'i_pillar_marble')
for x in (3, 14): obj(x, 1, 'i_banner_aurelith', col=1)
obj(0, 6, 'i_plant_palm'); obj(17, 6, 'i_plant_palm')
# lobby
for x, n in ((12, 'i_counter_marble_l'), (13, 'i_counter_marble_m'), (14, 'i_counter_marble_r')): put(x, 11, n)
obj(1, 10, 'i_trophy_case'); obj(16, 10, 'i_plant_palm'); obj(3, 12, 'i_bench')
warps = []
for x in (8, 9):
    put(x, 13, 'i_mat_aurelith')
    warps.append({'x': x, 'y': 13, 'to': 'aurelith_stadium_int', 'tx': x, 'ty': 4, 'facing': 'down', 'keep_return': True, 'note': 'back to the stadium lobby (below the arena doors)'})
TR = 'overworld_lines.json maps.aurelith_arena.'
npcs = [{'id': 'aurelith_arena_clerk', 'x': 13, 'y': 10, 'facing': 'down', 'kind': 'clerk', 'sprite': 'vil_receptionist_f',
         'note': 'Arena sign-up clerk, talk across the counter (DRAFT text: data/textbot_requests_arena.md)', 'text_ref': TR + 'aurelith_arena_clerk'}]
SPOTS = [(2, 3, 'right'), (2, 5, 'right'), (2, 7, 'right'), (4, 6, 'right'), (13, 6, 'left'), (15, 7, 'left'), (15, 5, 'left'), (15, 3, 'left')]
SPR = ['tr_swimmer_m', 'tr_camper_f', 'tr_ranger_m', 'tr_lass_f', 'tr_hiker_m', 'tr_bugcatcher_f', 'tr_scientist_f', 'tr_scientist_m']
for i, ((x, y, f), s) in enumerate(zip(SPOTS, SPR), 1):
    npcs.append({'id': f'arena_fighter_{i}', 'x': x, 'y': y, 'facing': f, 'kind': 'trainer', 'sprite': s,
                 'note': f'Arena fighter {i} of 8 (back to back run, src/region78/arena.js; team in trainer_teams.js)', 'text_ref': TR + f'arena_fighter_{i}'})
j = {'name': 'aurelith_arena', 'title': 'Aurelith Arena', 'width': W, 'height': H, 'tile_size': 64, 'tileset': '../tileset.json', 'layers': L,
     'warps': warps, 'exits': [], 'npcs': npcs, 'signs': [], 'items': [], 'encounter_zones': [],
     'source': 'tools/city/build_aurelith_arena.py (Arena v1, Oct 29 2026; DRAFT, visual change awaiting Gary)',
     'movement': {'run': True, 'bike': False, 'note': 'running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md'}}
json.dump(j, open(os.path.join(MAPS, 'aurelith_arena.json'), 'w'), separators=(',', ':'))
# NPC sheets
p = os.path.join(ROOT, 'art', 'characters', 'pixel', 'npcs', 'npc_sprite_map.json'); sm = json.load(open(p))
for n in npcs:
    sid = n['sprite']; e = {'sprite_id': sid, 'class': n['note'].split(' (')[0]}
    for k, v in (('overworld_sheet', '_chibi_sheet.png'), ('overworld_sheet_2x', '_chibi_sheet_2x.png'), ('overworld_sheet_3x', '_chibi_sheet_3x.png')):
        e[k] = f'npcs/{sid}/overworld/{sid}{v}'
    e['overworld_frames_dir'] = f'npcs/{sid}/overworld/{sid}_chibi/'
    t = f'npcs/{sid}/trainer/{sid}_trainer_64x128.png'
    if os.path.exists(os.path.join(ROOT, 'art', 'characters', 'pixel', t)): e['trainer_64x128'] = t
    sm['map'][f'aurelith_arena.{n["id"]}'] = e
open(p, 'w', encoding='utf-8').write(json.dumps(sm, indent=1, ensure_ascii=False) + '\n')
lp = os.path.join(OW, 'world_layout.json'); w = json.load(open(lp))
if 'aurelith_arena' not in w.setdefault('maps_built', []): w['maps_built'].append('aurelith_arena'); json.dump(w, open(lp, 'w'))
for row in L['collision']: print(''.join(map(str, row)))
