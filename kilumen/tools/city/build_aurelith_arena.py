#!/usr/bin/env python3
"""Build the Aurelith Arena (Gary, Oct 29 2026; themed rooms 6:04 PM CT, pt2156u).
python3 tools/city/build_aurelith_arena.py
aurelith_arena: sign-up lobby behind the stadium's coin-locked doors (gate_aurelith_arena, all_badges). Clerk at a marble
counter; stairs up to room 1; mats back to the stadium.
aurelith_arena_room_1..8: one small themed battle room per Arena fighter, in a chain. Floor, walls, props and map tint
match the fighter's type, reusing existing hall/region tiles (water = Saltmere/Tidewater, fire = Cindervale, wind =
Frostspire ice hall, earth = Greystone cave props, grass = Fernwick, light = Lanternport, mystic = Revival, dark = ash +
night). Stairs (top right) lead to the next room behind gate_arena_room_N (flag arena_room_N_won, set when the fighter is
beaten in the current run: src/region78/arena.js). Mats (bottom left) go back one room.
Final Ron stays keyed aurelith_arena_int.aurelith_arena_ron_final (the tower, not built yet): not placed here.
Grid-fit: whole squares, every furniture square blocks, walk gaps are 2+ squares."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld'); MAPS = os.path.join(OW, 'maps')
TS = json.load(open(os.path.join(OW, 'tileset.json'))); BY = {e['name']: e for e in TS['tiles']}
TR = 'overworld_lines.json maps.aurelith_arena.'
MOVE = {'run': True, 'bike': False, 'note': 'running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md'}
SRC = 'tools/city/build_aurelith_arena.py (Arena themed rooms, Oct 29 2026; DRAFT, visual change awaiting Gary)'

class M:
    def __init__(s, W, H):
        s.W, s.H = W, H; s.L = {k: [[0] * W for _ in range(H)] for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter')}
    def g(s, x, y, n, col=None): s.L['ground'][y][x] = BY[n]['id']; s.L['collision'][y][x] = BY[n]['collision_code'] if col is None else col
    def put(s, x, y, n, col=None): s.L['decoration'][y][x] = BY[n]['id']; s.L['collision'][y][x] = BY[n]['collision_code'] if col is None else col
    def obj(s, x, y, name, col=None):
        if name in BY: return s.put(x, y, name, col)
        r = 0
        assert f'{name}_0_0' in BY, name
        while f'{name}_{r}_0' in BY:
            c = 0
            while f'{name}_{r}_{c}' in BY: s.put(x + c, y + r, f'{name}_{r}_{c}', col); c += 1
            r += 1

def walls(m, top, upper, win, face, floor):
    for y in range(m.H):
        for x in range(m.W):
            if y == 0: m.g(x, y, top)
            elif y == 1: m.g(x, y, win if x % 4 == 2 else upper, 1)
            elif y == 2: m.g(x, y, face)
            else: m.g(x, y, floor(x, y))

ab = lambda base: (lambda x, y: f'{base}_{"ab"[(x + y) % 2]}')
one = lambda n: (lambda x, y: n)
# type -> theme. walls: (top, upper, upper_win, face); props: (x, y, name) on the side columns; centre: 3x3 rug or tile
THEMES = {
    'water': dict(hall='Tidewater/Saltmere', walls='salt', floor=ab('i_floor_saltflag'), pillar='i_pillar_salt', banner='i_banner_salt', centre='i_rug_teal', grade='dawn',
                  props=['i_plant_coral', 'i_anchor', 'i_brine_pit', 'i_ship_wheel', 'i_plant_coral', 'i_fishing_rods']),
    'fire': dict(hall='Cindervale', walls='cinder', floor=ab('i_floor_basalt'), pillar='i_pillar_basalt', banner='i_banner_cinder', centre='i_rug_red', grade='dusk',
                 props=['i_brazier', 'i_lava', 'i_anvil', 'i_brazier', 'i_lava', 'i_bellows']),
    'wind': dict(hall='Frostspire', walls=('x_icehall_iwall_top', 'x_icehall_iwall_upper', 'x_icehall_iwall_upper', 'x_icehall_iwall_face'), floor=one('x_icehall_floor'),
                 pillar='i_pillar_steel', banner='banner', centre='x_icehall_arena', grade='day',
                 props=['i_telescope', 'x_frozen_rock', 'i_plant_succulent', 'i_telescope', 'x_frozen_rock', 'i_plant_succulent']),
    'earth': dict(hall='Greystone / Revival mines', walls='hall', floor=ab('i_floor_slate'), pillar='i_pillar_stone', banner='banner', centre='i_rug_sand', grade='dusk',
                  props=['cave_rock', 'i_ore_cart', 'i_river_stones', 'cave_rock', 'i_ore_cart', 'i_river_stones']),
    'grass': dict(hall='Fernwick', walls='fern', floor=ab('i_floor_oak'), pillar=None, banner='banner', centre='i_floor_pine_a', grade='day',
                  props=['i_plant_fern', 'i_plant_flower', 'i_plant_mushroom', 'i_plant_fern', 'x_reeds', 'i_plant_flower']),
    'light': dict(hall='Lanternport', walls='lantern', floor=ab('i_floor_marble'), pillar='i_pillar_brass', banner='i_banner_lantern', centre='floor_tile', grade='day',
                  props=['i_crystal_on', 'i_plant_palm', 'i_crystal_on', 'i_crystal_on', 'i_globe', 'i_crystal_on']),
    'mystic': dict(hall='Revival Heights', walls='revival', floor=ab('i_floor_carpet_violet'), pillar='i_pillar_marble', banner='i_banner_revival', centre='i_rug_violet', grade='dusk',
                   props=['i_globe', 'i_crystal_off', 'i_crystal_on', 'i_globe', 'i_crystal_on', 'i_crystal_off']),
    'dark': dict(hall='ash halls by night', walls='station', floor=ab('i_floor_ash'), pillar='i_pillar_basalt', banner='banner', centre='i_floor_basalt_c', grade='night',
                 props=['i_plant_mushroom', 'i_statue', 'i_plant_mushroom', 'i_plant_mushroom', 'i_statue', 'i_plant_mushroom']),
}
TYPES = ['water', 'fire', 'wind', 'earth', 'grass', 'light', 'mystic', 'dark']
SPR = ['tr_swimmer_m', 'tr_camper_f', 'tr_ranger_m', 'tr_lass_f', 'tr_hiker_m', 'tr_bugcatcher_f', 'tr_scientist_f', 'tr_scientist_m']
RW, RH = 12, 11
room = lambda n: f'aurelith_arena_room_{n}'
LOBBY_W, LOBBY_H = 18, 10
STAIRS = (9, 10); MATS = (2, 3)   # room stairs x (row 2), room mats x (row RH-1)
out = {}

# ---- lobby ----
lo = M(LOBBY_W, LOBBY_H)
walls(lo, 'i_wall_top_hall', 'i_wall_upper_hall', 'i_wall_upper_win_hall', 'i_wall_face_hall', lambda x, y: 'i_floor_marble_a' if (x + y) % 2 else 'i_floor_marble_b')
for x in (3, 14): lo.obj(x, 1, 'i_banner_aurelith', col=1)
lw = []
for x in (8, 9):
    lo.g(x, 2, 'i_stairs_up_stone')
    lw.append({'x': x, 'y': 2, 'to': room(1), 'tx': MATS[x - 8], 'ty': RH - 2, 'facing': 'up', 'keep_return': True, 'note': 'up to Arena room 1'})
    lo.put(x, LOBBY_H - 1, 'i_mat_aurelith')
    lw.append({'x': x, 'y': LOBBY_H - 1, 'to': 'aurelith_stadium_int', 'tx': x, 'ty': 4, 'facing': 'down', 'keep_return': True, 'note': 'back to the stadium lobby (below the arena doors)'})
for x, n in ((12, 'i_counter_marble_l'), (13, 'i_counter_marble_m'), (14, 'i_counter_marble_r')): lo.put(x, 5, n)
lo.obj(0, 3, 'i_trophy_case'); lo.obj(17, 3, 'i_plant_palm'); lo.obj(3, 7, 'i_bench')
lnpcs = [{'id': 'aurelith_arena_clerk', 'x': 13, 'y': 4, 'facing': 'down', 'kind': 'clerk', 'sprite': 'vil_receptionist_f',
          'note': 'Arena sign-up clerk, talk across the counter (DRAFT text: data/textbot_requests_arena.md)', 'text_ref': TR + 'aurelith_arena_clerk'}]
out['aurelith_arena'] = {'name': 'aurelith_arena', 'title': 'Aurelith Arena', 'width': LOBBY_W, 'height': LOBBY_H, 'tile_size': 64, 'tileset': '../tileset.json',
    'layers': lo.L, 'warps': lw, 'exits': [], 'npcs': lnpcs, 'signs': [], 'items': [], 'encounter_zones': [], 'source': SRC, 'movement': MOVE}

# ---- 8 rooms ----
for n, (t, spr) in enumerate(zip(TYPES, SPR), 1):
    th = THEMES[t]; m = M(RW, RH)
    w = th['walls']; w = w if isinstance(w, tuple) else (f'i_wall_top_{w}', f'i_wall_upper_{w}', f'i_wall_upper_win_{w}', f'i_wall_face_{w}')
    walls(m, *w, th['floor'])
    m.obj(1, 1, th['banner'], col=1); m.obj(5, 1, th['banner'], col=1)
    c = th['centre']
    if f'{c}_0_0' in BY: m.obj(4, 5, c, col=0)
    else:
        for yy in range(5, 8):
            for xx in range(4, 7): m.g(xx, yy, c, 0)
    warps, gates = [], []
    if n < 8:
        for i, x in enumerate(STAIRS):
            m.g(x, 2, 'i_stairs_up_stone')
            warps.append({'x': x, 'y': 2, 'to': room(n + 1), 'tx': MATS[i], 'ty': RH - 2, 'facing': 'up', 'keep_return': True, 'note': f'up to Arena room {n + 1} (behind gate_arena_room_{n})'})
            m.put(x, 4, 'gate_hall_closed')
        gates.append({'id': f'gate_arena_room_{n}', 'flag': f'arena_room_{n}_won', 'earned_at': f'beat Arena fighter {n} in the current run',
                      'cells': [{'x': x, 'y': 4, 'blocked_tile': 'gate_hall_closed', 'cleared_tile': 'gate_hall_open'} for x in STAIRS], 'npc': None,
                      'lines': None, 'cleared_state': 'gate opens', 'detour': 'none: Arena run', 'blocks': {'from_entry': 'room mats', 'to_entry': room(n + 1)}})
    for x in (8, 11):
        if th['pillar']: m.obj(x, 3, th['pillar'])
        else: m.put(x, 3, 'i_plant_fern'); m.put(x, 4, 'i_plant_fern')
    for (x, y), p in zip(((0, 3), (0, 5), (0, 7), (11, 6), (11, 8), (11, 5)), th['props']): m.obj(x, y, p)
    back = 'aurelith_arena' if n == 1 else room(n - 1)
    for i, x in enumerate(MATS):
        m.put(x, RH - 1, 'i_mat_aurelith')
        tx = (8, 9)[i] if n == 1 else STAIRS[i]
        warps.append({'x': x, 'y': RH - 1, 'to': back, 'tx': tx, 'ty': 3, 'facing': 'down', 'keep_return': True, 'note': 'back down one room'})
    npc = {'id': f'arena_fighter_{n}', 'x': 5, 'y': 5, 'facing': 'down', 'kind': 'trainer', 'sprite': spr,
           'note': f'Arena fighter {n} of 8, {t} type (back to back run, src/region78/arena.js; team in trainer_teams.js)', 'text_ref': TR + f'arena_fighter_{n}'}
    j = {'name': room(n), 'title': 'Aurelith Arena', 'width': RW, 'height': RH, 'tile_size': 64, 'tileset': '../tileset.json', 'layers': m.L,
         'warps': warps, 'exits': [], 'npcs': [npc], 'signs': [], 'items': [], 'encounter_zones': [], 'story_gates': gates,
         'tint': {'grade': th['grade'], 'note': f'{t} room lighting'}, 'arena_theme': {'type': t, 'from': th['hall']}, 'source': SRC, 'movement': MOVE}
    out[room(n)] = j

for name, j in out.items():
    json.dump(j, open(os.path.join(MAPS, name + '.json'), 'w'), separators=(',', ':'))
# NPC sheets (keys <map>.<id>); drop entries of the old single-room layout
p = os.path.join(ROOT, 'art', 'characters', 'pixel', 'npcs', 'npc_sprite_map.json'); sm = json.load(open(p))
for k in [k for k in sm['map'] if k.startswith('aurelith_arena.arena_fighter_')]: del sm['map'][k]
for name, j in out.items():
    for n in j['npcs']:
        sid = n['sprite']; e = {'sprite_id': sid, 'class': n['note'].split(' (')[0]}
        for k, v in (('overworld_sheet', '_chibi_sheet.png'), ('overworld_sheet_2x', '_chibi_sheet_2x.png'), ('overworld_sheet_3x', '_chibi_sheet_3x.png')):
            e[k] = f'npcs/{sid}/overworld/{sid}{v}'
        e['overworld_frames_dir'] = f'npcs/{sid}/overworld/{sid}_chibi/'
        t = f'npcs/{sid}/trainer/{sid}_trainer_64x128.png'
        if os.path.exists(os.path.join(ROOT, 'art', 'characters', 'pixel', t)): e['trainer_64x128'] = t
        sm['map'][f'{name}.{n["id"]}'] = e
open(p, 'w', encoding='utf-8').write(json.dumps(sm, indent=1, ensure_ascii=False) + '\n')
lp = os.path.join(OW, 'world_layout.json'); wl = json.load(open(lp)); mb = wl.setdefault('maps_built', [])
for name in out:
    if name not in mb: mb.append(name)
json.dump(wl, open(lp, 'w'))
for name, j in out.items():
    print(name); [print(''.join(map(str, r))) for r in j['layers']['collision']]
