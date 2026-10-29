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
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld'); MAPS = os.path.join(OW, 'maps')
TS = json.load(open(os.path.join(OW, 'tileset.json'))); BY = {e['name']: e for e in TS['tiles']}
BY.update({e['name']: e for e in json.load(open(os.path.join(OW, 'tileset_arena.json')))['tiles']})  # tools/city/arena_art_kit.py
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
mix = lambda *ns: (lambda x, y: ns[(x * 7 + y * 3 + x * y) % len(ns)])
arw = lambda p: (f'ar_wall_top_{p}', f'ar_wall_upper_{p}', f'ar_wall_upper_win_{p}', f'ar_wall_face_{p}')
# Interior design pass v2 (Gary 6:19 PM CT, pt2159u): every room has its own floor + walls, 6+ themed props, a map grade
# and a mood tint/particles (src/overworld/mood.json). New art: tools/city/arena_art_kit.py (ar_* ids 11001+).
# Fixed cells (all rooms): stairs 9-10,2; gates 9-10,4; pillars 8 + 11 rows 3-4; mats 2-3,10; fighter 5,5.
# Prop slots: left column x 0 (rows 3-10), bottom row x 6-7 (row 10), right column x 11 (rows 5-10). The arena (x 1-10,
# rows 4-9) stays open so every walk gap is 2+ squares. props: (x, y, name); ground: (x, y, name) walkable/water overrides.
THEMES = {
    'water': dict(hall='Tidewater', walls=arw('sea'), floor=ab('ar_floor_wave'), pillar='i_pillar_salt', banner='i_banner_salt', grade='day',
                  centre=[(x, y, 'ar_wave_edge') for x in (4, 5, 6) for y in (8,)],
                  ground=[(0, 4, 'ar_wave_edge'), (1, 4, 'ar_wave_edge'), (10, 7, 'ar_wave_edge'), (11, 7, 'ar_wave_edge')],
                  props=[(0, 3, 'ar_kelp_tank'), (0, 5, 'ar_pool'), (0, 7, 'ar_coral_blue'), (0, 8, 'ar_clam'), (0, 9, 'ar_kelp_tank'), (0, 10, 'ar_coral_blue'),
                         (6, 10, 'ar_clam'), (7, 10, 'ar_coral_blue'), (11, 5, 'i_anchor'), (11, 6, 'ar_kelp_tank'), (10, 8, 'ar_pool'), (11, 10, 'ar_kelp_tank')],
                  mood=dict(tint={'color': '#3f8ad8', 'alpha': 0.07}, vignette={'color': '#0a1a33', 'alpha': 0.3, 'inner': 0.5}, particles=[{'kind': 'motes', 'density': 10}])),
    'fire': dict(hall='Cindervale', walls='cinder', floor=mix('ar_floor_lavacrack_a', 'i_floor_basalt_a', 'ar_floor_lavacrack_b', 'i_floor_basalt_b'), pillar='i_pillar_basalt', banner='i_banner_cinder', grade='dusk',
                 centre=[(x, y, 'ar_floor_lavacrack_a' if (x + y) % 2 else 'ar_floor_lavacrack_b') for x in (4, 5, 6) for y in (5, 6, 7)],
                 props=[(0, 3, 'i_forge'), (0, 5, 'i_brazier'), (0, 6, 'ar_lava_vent'), (0, 7, 'i_anvil'), (0, 8, 'i_bellows'), (0, 9, 'ar_fire_bowl'), (0, 10, 'i_lava'),
                        (6, 10, 'i_lava'), (7, 10, 'ar_lava_vent'), (11, 5, 'i_brazier'), (11, 6, 'ar_fire_bowl'), (11, 8, 'i_lava'), (11, 9, 'ar_lava_vent'), (11, 10, 'i_brazier')],
                 mood=dict(tint={'color': '#ff7a3a', 'alpha': 0.09}, vignette={'color': '#2a0c06', 'alpha': 0.36, 'inner': 0.46}, particles=[{'kind': 'embers', 'density': 14}])),
    'wind': dict(hall='Frostspire sky deck', walls=arw('sky'), floor=ab('ar_floor_sky'), pillar='i_pillar_steel', banner='banner', grade='day',
                 centre=[(x, y, 'x_icehall_arena') for x in (4, 5, 6) for y in (5, 6, 7)],
                 props=[(0, 3, 'ar_pennant'), (0, 5, 'ar_cloud'), (0, 6, 'ar_wind_chimes'), (0, 7, 'ar_windvane'), (0, 9, 'ar_cloud'), (0, 10, 'ar_wind_chimes'),
                        (6, 10, 'ar_cloud'), (7, 10, 'ar_cloud'), (11, 5, 'ar_windvane'), (11, 7, 'ar_wind_chimes'), (11, 8, 'ar_pennant'), (11, 10, 'ar_cloud')],
                 mood=dict(tint={'color': '#cfeaff', 'alpha': 0.08}, vignette={'alpha': 0.16, 'inner': 0.62}, particles=[{'kind': 'snow', 'density': 6}])),
    'earth': dict(hall='Greystone mines', walls=arw('earth'), floor=ab('ar_floor_earth'), pillar='i_pillar_stone', banner='banner', grade='dusk',
                  centre=[(x, y, 'i_floor_slate_b') for x in (4, 5, 6) for y in (5, 6, 7)],
                  props=[(0, 3, 'ar_rock_pillar'), (0, 5, 'ar_crystal_amber'), (0, 6, 'ar_ore_cart'), (0, 7, 'cave_rock'), (0, 8, 'ar_crystal_green'), (0, 9, 'ar_rock_pillar'),
                         (6, 10, 'ar_ore_cart'), (7, 10, 'ar_crystal_amber'), (11, 5, 'ar_rock_pillar'), (11, 7, 'ar_crystal_green'), (11, 8, 'i_ore_cart'), (11, 9, 'cave_rock'), (11, 10, 'ar_crystal_amber')],
                  mood=dict(tint={'color': '#c89058', 'alpha': 0.08}, vignette={'color': '#1a1008', 'alpha': 0.38, 'inner': 0.46}, particles=[{'kind': 'dust', 'density': 14}])),
    'grass': dict(hall='Fernwick greenhouse', walls='fern', floor=mix('x_moss_0', 'x_moss_1', 'x_moss_2', 'x_moss_0'), pillar=None, banner='banner', grade='day',
                  centre=[(x, y, 'i_floor_oak_a' if (x + y) % 2 else 'i_floor_oak_b') for x in (4, 5, 6) for y in (5, 6, 7)],
                  deco=[(1, 9, 'flowers_warm'), (9, 9, 'flowers_violet'), (1, 4, 'flowers_violet'), (7, 6, 'flowers_warm'), (3, 6, 'flowers_violet')],
                  props=[(0, 3, 'ar_tree'), (0, 5, 'ar_hedge'), (0, 6, 'ar_hedge'), (0, 7, 'ar_flower_planter'), (0, 8, 'ar_mushroom_big'), (0, 9, 'ar_tree'),
                         (6, 10, 'ar_hedge'), (7, 10, 'ar_hedge'), (11, 5, 'ar_tree'), (11, 7, 'ar_flower_planter'), (11, 8, 'ar_hedge'), (11, 9, 'ar_hedge'), (11, 10, 'i_plant_fern')],
                  mood=dict(tint={'color': '#9ad86a', 'alpha': 0.06}, vignette={'alpha': 0.2, 'inner': 0.56}, particles=[{'kind': 'leaves', 'density': 8}])),
    'light': dict(hall='Lanternport sun hall', walls='lantern', floor=ab('ar_floor_gold'), pillar='i_pillar_brass', banner='i_banner_lantern', grade='day',
                  centre=[(x, y, 'ar_floor_gold_b' if (x, y) == (5, 6) else 'i_floor_marble_a') for x in (4, 5, 6) for y in (5, 6, 7)],
                  props=[(0, 3, 'ar_gold_lamp'), (0, 5, 'ar_lens'), (0, 7, 'ar_sun_disc'), (0, 8, 'i_crystal_on'), (0, 9, 'ar_gold_lamp'),
                         (6, 10, 'ar_sun_disc'), (7, 10, 'i_crystal_on'), (11, 5, 'ar_lens'), (11, 7, 'ar_sun_disc'), (11, 8, 'ar_gold_lamp'), (11, 10, 'i_crystal_on')],
                  mood=dict(tint={'color': '#fff0a8', 'alpha': 0.1}, vignette={'alpha': 0.1, 'inner': 0.7}, particles=[{'kind': 'motes', 'density': 16}])),
    'mystic': dict(hall='Revival Heights observatory', walls='revival', floor=mix('ar_floor_rune_a', 'ar_floor_rune_a', 'ar_floor_rune_b', 'ar_floor_rune_a'), pillar='i_pillar_marble', banner='i_banner_revival', grade='dusk',
                   centre=[(x, y, 'ar_floor_rune_b' if (x, y) == (5, 6) else 'i_floor_carpet_violet_a') for x in (4, 5, 6) for y in (5, 6, 7)],
                   props=[(0, 3, 'i_crystal_display'), (0, 5, 'ar_prism'), (0, 6, 'ar_rune_stone'), (0, 7, 'ar_orb'), (0, 8, 'i_globe'), (0, 9, 'ar_rune_stone'), (0, 10, 'ar_prism'),
                          (6, 10, 'ar_orb'), (7, 10, 'ar_rune_stone'), (11, 5, 'ar_prism'), (11, 6, 'ar_orb'), (11, 8, 'i_crystal_display'), (11, 10, 'ar_prism')],
                   mood=dict(tint={'color': '#a070f0', 'alpha': 0.1}, vignette={'color': '#120626', 'alpha': 0.36, 'inner': 0.48}, particles=[{'kind': 'fireflies', 'density': 8}])),
    'dark': dict(hall='Obsidian vault', walls=arw('obsidian'), floor=mix('ar_floor_obsidian_a', 'ar_floor_obsidian_b', 'ar_floor_obsidian_crack', 'ar_floor_obsidian_a'), pillar='i_pillar_basalt', banner='banner', grade='dusk',
                 centre=[(x, y, 'ar_floor_obsidian_crack') for x in (4, 5, 6) for y in (5, 6, 7)],
                 props=[(0, 3, 'ar_candelabra'), (0, 5, 'ar_obsidian_shard'), (0, 6, 'ar_candles'), (0, 7, 'ar_raven_statue'), (0, 8, 'ar_obsidian_shard'), (0, 9, 'ar_candles'), (0, 10, 'ar_raven_statue'),
                        (6, 10, 'ar_obsidian_shard'), (7, 10, 'ar_candles'), (11, 5, 'ar_candelabra'), (11, 7, 'ar_raven_statue'), (11, 8, 'ar_candles'), (11, 9, 'ar_obsidian_shard'), (11, 10, 'ar_candles')],
                 mood=dict(tint={'color': '#5a2a8a', 'alpha': 0.1, 'phases': {'dawn': 1, 'day': 1, 'dusk': 1, 'night': 1}}, vignette={'color': '#06020c', 'alpha': 0.45, 'inner': 0.4}, particles=[{'kind': 'fireflies', 'density': 5}])),
}
import arena_v3_art as V3
for _t in THEMES: THEMES[_t]['what'] = V3.CENTRE_WHAT[_t]
for _t, _x in (('water', 'fireflies'), ('fire', 'motes'), ('wind', 'motes'), ('earth', 'motes'), ('grass', 'fireflies'), ('light', 'dust'), ('mystic', 'motes'), ('dark', 'embers')): THEMES[_t]['extra'] = [{'kind': _x, 'density': 6}]
TYPES = ['water', 'fire', 'wind', 'earth', 'grass', 'light', 'mystic', 'dark']
SPR = ['tr_swimmer_m', 'tr_camper_f', 'tr_ranger_m', 'tr_lass_f', 'tr_hiker_m', 'tr_bugcatcher_f', 'tr_scientist_f', 'tr_scientist_m']
RW, RH = 17, 15
room = lambda n: f'aurelith_arena_room_{n}'
LOBBY_W, LOBBY_H = 18, 10
STAIRS = (1, 15); MATS = (7, 9)   # room stairs x (row 2), room mats x (row RH-1)
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

# ---- 8 rooms (v3 final throne rooms, Gary 6:41 PM CT pt2163u: "more majesty ... screams end of the game boss") ----
# 17x15 symmetric hall: walls rows 0-2; 5x6 animated centrepiece a3_<t>_centre (x 6-10, rows 0-5, rows 3-5 block); 1x5
# framing pillars x 4/12; emblem banners x 2/5/11/14; dais row 6 (x 5-11) with the fighter at 8,6 (talk from 8,7);
# carpet processional x 7-9 rows 7-14; obelisks x 5/11 rows 8-9 + 11-12; braziers x 3/13 rows 7/10/13; stairs 1+15,2
# behind gates 1+15,4; mats 7+9,14. Art: tools/city/arena_v3_art.py (in-house; CC0 packs checked on OpenGameArt - Blue Castle, SBS Dungeon, Destron 64px - off-style, unused, so no credits needed).
for n, (t, spr) in enumerate(zip(TYPES, SPR), 1):
    th = THEMES[t]; m = M(RW, RH); A = f'a3_{t}_'
    w = th['walls']; w = w if isinstance(w, tuple) else (f'i_wall_top_{w}', f'i_wall_upper_{w}', f'i_wall_upper_win_{w}', f'i_wall_face_{w}')
    walls(m, *w, lambda x, y: A + 'floor_' + 'ab'[(x + y) % 2])
    for x in range(5, 12): m.g(x, 6, A + ('dais_l' if x == 5 else 'dais_r' if x == 11 else 'dais_m'))
    for y in range(7, RH):
        for x in (7, 8, 9): m.g(x, y, A + ('carpet_l' if x == 7 else 'carpet_r' if x == 9 else 'carpet_m_' + 'ab'[y % 2]))
    m.obj(6, 0, A + 'centre', col=None)
    for y in range(3): 
        for x in range(6, 11): m.L['collision'][y][x] = 1
    for x in (4, 12): m.obj(x, 0, A + 'pillar')
    for x in (2, 5, 11, 14): m.obj(x, 1, A + 'banner', col=1)
    for x in (5, 11):
        for y in (8, 11): m.obj(x, y, A + 'obelisk')
    for x in (3, 13):
        for y in (7, 10, 13): m.put(x, y, A + 'brazier')
    warps, gates = [], []
    if n < 8:
        for i, x in enumerate(STAIRS):
            m.g(x, 2, 'i_stairs_up_stone')
            warps.append({'x': x, 'y': 2, 'to': room(n + 1), 'tx': MATS[i], 'ty': RH - 2, 'facing': 'up', 'keep_return': True, 'note': f'up to Arena room {n + 1} (behind gate_arena_room_{n})'})
            m.put(x, 4, 'gate_hall_closed')
        gates.append({'id': f'gate_arena_room_{n}', 'flag': f'arena_room_{n}_won', 'earned_at': f'beat Arena fighter {n} in the current run',
                      'cells': [{'x': x, 'y': 4, 'blocked_tile': 'gate_hall_closed', 'cleared_tile': 'gate_hall_open'} for x in STAIRS], 'npc': None,
                      'lines': None, 'cleared_state': 'gate opens', 'detour': 'none: Arena run', 'blocks': {'from_entry': 'room mats', 'to_entry': room(n + 1)}})
    back = 'aurelith_arena' if n == 1 else room(n - 1)
    for i, x in enumerate(MATS):
        m.put(x, RH - 1, 'i_mat_aurelith')
        tx = (8, 9)[i] if n == 1 else STAIRS[i]
        warps.append({'x': x, 'y': RH - 1, 'to': back, 'tx': tx, 'ty': 3, 'facing': 'down', 'keep_return': True, 'note': 'back down one room'})
    npc = {'id': f'arena_fighter_{n}', 'x': 8, 'y': 6, 'facing': 'down', 'kind': 'trainer', 'sprite': spr,
           'note': f'Arena fighter {n} of 8, {t} type (back to back run, src/region78/arena.js; team in trainer_teams.js)', 'text_ref': TR + f'arena_fighter_{n}'}
    j = {'name': room(n), 'title': 'Aurelith Arena', 'width': RW, 'height': RH, 'tile_size': 64, 'tileset': '../tileset.json', 'layers': m.L,
         'warps': warps, 'exits': [], 'npcs': [npc], 'signs': [], 'items': [], 'encounter_zones': [], 'story_gates': gates,
         'tint': {'grade': th['grade'], 'note': f'{t} throne room lighting (+ mood.json tint/particles)'}, 'arena_theme': {'type': t, 'from': th['hall'], 'centrepiece': th['what']}, 'source': SRC, 'movement': MOVE}
    out[room(n)] = j
    th['mood']['particles'] = [dict(q, density=int(q['density'] * 1.8)) for q in th['mood']['particles']] + th.get('extra', [])

mp = os.path.join(ROOT, 'src', 'overworld', 'mood.json'); md = json.load(open(mp))
for n, t in enumerate(TYPES, 1):
    md['maps'][room(n)] = {'_why': f'Arena room {n}, {t}: themed light (Gary 6:19 PM CT; DRAFT)', 'extends': 'indoor', **THEMES[t]['mood']}
raw = open(mp).read(); raw = raw[:raw.index('\n    "aurelith_arena_room_1"')] + '\n  }\n}\n' if '"aurelith_arena_room_1"' in raw else raw
body = raw.rstrip()[:-1].rstrip()[:-1].rstrip()  # drop the closing '}' of maps and of the file
ent = ',\n'.join(f'    "{room(n)}": ' + json.dumps(md['maps'][room(n)], ensure_ascii=False) for n in range(1, 9))
open(mp, 'w').write(body.rstrip(',') + ',\n' + ent + '\n  }\n}\n')
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
