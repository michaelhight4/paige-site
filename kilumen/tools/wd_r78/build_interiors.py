#!/usr/bin/env python3
"""Regions 7-8 (World Design, Oct 29 2026): unique Lanternport (harbour/lighthouse) and
Cindervale (forge/ore) interiors replacing the shared heal_brookhollow / shop_int / home_* links.
Writes maps/<name>.json, repoints the town door warps (both directions), entered_from and
world_layout. Idempotent: rerun after edits. Station stays on the shared station_int (rail engine).
Usage: python3 tools/wd_r78/build_interiors.py   (from the repo root)"""
import json, os, random, re
OW = 'art/world/overworld'
TS = json.load(open(f'{OW}/tileset.json'))['tiles'] + json.load(open(f'{OW}/tileset_ix2.json'))['tiles']
ID = {t['name']: t['id'] for t in TS}
WALK = re.compile(r'^(i_rug_|i_mat_|i_floor_)')

class Room:
    def __init__(s, name, title, w, h, wall, floor, wins, door, town, tdoor, kind, seed):
        s.name, s.title, s.w, s.h, s.town, s.tdoor, s.kind, s.door = name, title, w, h, town, tdoor, kind, door
        rnd = random.Random(seed)
        s.g = [[0]*w for _ in range(h)]; s.d = [[0]*w for _ in range(h)]; s.o = [[0]*w for _ in range(h)]
        s.c = [[1 if y < 3 else 0 for x in range(w)] for y in range(h)]
        for x in range(w):
            s.g[0][x] = ID[f'i_wall_top_{wall}']
            s.g[1][x] = ID[f'i_wall_upper_win_{wall}' if x in wins else f'i_wall_upper_{wall}']
            s.g[2][x] = ID[f'i_wall_face_{wall}']
            for y in range(3, h):
                s.g[y][x] = ID[f'i_floor_{floor}_' + rnd.choice('aaaaabbc')]
        s.npcs, s.signs, s.spots, s.extra = [], [], [], {}
        s.put(f'i_mat_{door[2]}', door[0], h - 1)
        s.c[h - 1][door[0]] = 4

    def put(s, base, x, y):
        parts = sorted((n for n in ID if n == base or re.fullmatch(re.escape(base) + r'_\d+_\d+', n)))
        assert parts, base
        rows = 1
        for n in parts:
            m = re.search(r'_(\d+)_(\d+)$', n) if n != base else None
            if m: rows = max(rows, int(m.group(1)) + 1)
        for n in parts:
            m = re.search(r'_(\d+)_(\d+)$', n) if n != base else None
            r, cc = (int(m.group(1)), int(m.group(2))) if m else (0, 0)
            X, Y = x + cc, y + r
            assert 0 <= X < s.w and 0 <= Y < s.h, (s.name, n, X, Y)
            on_wall = Y <= 2
            lay = s.o if (not on_wall and r < rows - 1) else s.d
            assert s.d[Y][X] == 0 and s.o[Y][X] == 0, (s.name, 'overlap', n, X, Y)
            lay[Y][X] = ID[n]
            if not WALK.match(n): s.c[Y][X] = 1
        return s

    def npc(s, id, x, y, facing, kind, note, **kw):
        s.npcs.append(dict(id=id, x=x, y=y, facing=facing, kind=kind, note=note, **kw)); assert s.c[y][x] == 0, (s.name, id)

    def sign(s, id, x, y, note, **kw):
        s.signs.append(dict(id=id, x=x, y=y, read_from='down', note=note, **kw))

    def spot(s, id, x, y, stand, face, tile, note):
        s.spots.append(dict(id=id, kind='prop', x=x, y=y, stand=list(stand), face=face, tile=tile, text=f'maps.{s.name}.{id}', note=note))

    def check(s):
        sx, sy = s.door[0], s.h - 2
        seen, st = {(sx, sy)}, [(sx, sy)]
        while st:
            x, y = st.pop()
            for X, Y in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                if 0 <= X < s.w and 3 <= Y < s.h and (X, Y) not in seen and s.c[Y][X] == 0:
                    seen.add((X, Y)); st.append((X, Y))
        lost = [(x, y) for y in range(3, s.h) for x in range(s.w) if s.c[y][x] == 0 and (x, y) not in seen]
        assert not lost, (s.name, 'unreachable floor', lost)
        for n in s.npcs:
            assert any((n['x']+a, n['y']+b) in seen for a, b in ((1,0),(-1,0),(0,1),(0,-1))) or n.get('behind_counter'), (s.name, n['id'])
        for p in s.spots: assert tuple(p['stand']) in seen, (s.name, p['id'])

    def json(s):
        tx, ty = s.tdoor
        out = dict(name=s.name, title=s.title, width=s.w, height=s.h, tile_size=64, tileset='../tileset.json',
            layers=dict(ground=s.g, decoration=s.d, overlay=s.o, collision=s.c,
                        encounter=[[0]*s.w for _ in range(s.h)]),
            warps=[dict(x=s.door[0], y=s.h-1, to=s.town, tx=tx, ty=ty+1, facing='down', note=f'exit to {s.town} door ({tx},{ty})')],
            exits=[], npcs=[], signs=[], items=[], encounter_zones=[], interact_spots=[],
            source='tools/wd_r78/build_interiors.py (World Design, Oct 29 2026)',
            region=s.town, interior_kind=s.kind, interior_role='unique',
            unique_reason=f'{s.town.title()} {s.kind}: own themed interior (Gary, Oct 29 2026: unique Lanternport / Cindervale interiors)',
            entered_from=[dict(map=s.town, door=[tx, ty], arrival=[s.door[0], s.h-2])],
            movement=dict(run=True, bike=False, note='running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md'),
            text_pending=dict(npcs=s.npcs, signs=s.signs, interact_spots=s.spots,
                note=f'Real, placed NPCs/signs/spots, kept out of npcs/signs/interact_spots until Text Bot adds maps.{s.name}.* keys (validator requires text). Engine: treat them exactly like npcs/signs/interact_spots. Requests: design/regions78/wd_text_spots.md'))
        out.update(s.extra)
        return out

ROOMS = []
def room(*a, **k):
    r = Room(*a, **k); r.theme = a[4]; ROOMS.append(r); return r

# ---------------- LANTERNPORT (harbour / lighthouse) ----------------
L = 'lanternport'
r = room('heal_lanternport', 'Revival Tech Lanternport branch', 13, 9, 'rtbranch', 'rtbranch', {1, 11}, (6, 0, 'rtbranch'), L, (15, 21), 'heal', 71)
r.put('i_poster_care', 3, 1).put('i_crystal_polisher', 5, 1).put('i_net', 8, 1).put('i_staffdoor_locked', 10, 1).put('i_poster_safety', 12, 1)
r.put('i_counter_rt_l', 4, 4).put('i_counter_rt_m', 5, 4).put('i_counter_rt_m', 6, 4).put('i_counter_rt_m', 7, 4).put('i_counter_rt_r', 8, 4)
r.put('i_anchor', 0, 3).put('i_suggestion_box', 2, 3).put('i_newsletter_rack', 8, 3).put('i_company_terminal', 12, 4)
r.put('i_lantern_stand', 0, 5).put('i_sofa_lantern', 1, 7).put('i_table_small_lantern', 3, 7).put('i_plant_coral', 12, 8).put('i_ship_wheel', 12, 6)
r.npc('heal_lanternport_carer', 6, 3, 'down', 'healer', 'Revival Tech attendant (harbour branch, oilskin over the company jacket); talk across the counter from (6,5)', text_ref='rt_branch.attendant', behind_counter=True)
r.npc('heal_lanternport_technician', 5, 3, 'up', 'rt_staff', 'technician at the crystal polisher; talk across the counter from (5,5)', text_ref='rt_branch.technician', behind_counter=True)
r.npc('heal_lanternport_deckhand', 2, 6, 'up', 'TBD', 'soaked deckhand waiting on the sofa row for their team')
r.sign('staff_door_locked', 10, 2, 'STAFF ONLY door (locked)', text_ref='rt_branch.staff_door_locked')
r.sign('suggestion_box', 2, 3, 'suggestion box', text_ref='rt_branch.suggestion_box')
r.sign('newsletter', 8, 3, 'Revival Tech Bulletin rack', text_ref='rt_branch.newsletter')
r.spot('company_terminal', 12, 4, (11, 4), 'right', 'i_company_terminal', 'storage / company tasks PC')
r.spot('sofa', 2, 7, (2, 6), 'down', 'i_sofa_lantern', 'Lap Nap seat (sofa (1,7)-(2,7))')
r.spot('anchor', 0, 3, (0, 4), 'up', 'i_anchor', 'old anchor from the first lifeboat, kept by the door')
r.extra = dict(branding='Revival Tech branch (player employer), harbour fit-out', locked_warps=[dict(x=10, y=2, approach=[10, 3], facing='up', to='rt_branch_backroom', tx=4, ty=4, locked=True, unlock_flag='has_branch_card', collision_when_unlocked=4, note='locked STAFF ONLY door, same rule as heal_saltmere')])
HEAL = {'heal_lanternport': (L, (15, 21))}

r = room('shop_lanternport', 'Lanternport Chandlery mart', 12, 9, 'lantern', 'drift', {2, 9}, (6, 0, 'lantern'), L, (21, 21), 'mart', 72)
r.put('i_net', 0, 1).put('i_shopshelf_wall', 5, 1).put('i_shopshelf_wall', 7, 1).put('i_shopshelf_wall', 9, 1).put('i_banner_lantern', 11, 1)
r.put('i_counter_wood_l', 1, 4).put('i_counter_wood_m', 2, 4).put('i_counter_wood_r', 3, 4).put('i_salt_jars', 1, 3)
r.put('i_shopshelf_island', 5, 5).put('i_shopshelf_island', 8, 5).put('i_fishing_rods', 11, 3).put('i_barrel', 11, 4)
r.put('i_crates', 10, 7).put('i_plant_coral', 0, 7).put('i_lantern_stand', 11, 5)
r.npc('shop_lanternport_clerk', 2, 3, 'down', 'clerk', 'chandler behind the counter; talk from (2,5). Opens the mart (variant_of clerk)', variant_of='clerk', behind_counter=True)
r.npc('shop_lanternport_sailor', 7, 6, 'up', 'TBD', 'sailor comparing rope on the island shelves')
r.spot('fishing_rods', 11, 3, (10, 3), 'right', 'i_fishing_rods', 'rods for hire rack (look only)')
HEAL['shop_lanternport'] = (L, (21, 21))

def tv(r, x, y, kind='normal'):   # sofa faces DOWN at row y, the TV (back view) two rows below
    r.put(f'i_sofa_{r.theme}', x, y)
    r.c  # noqa
    for i in range(2):
        n = f'kit_tv_back_{kind}_brown_0_{i}'; r.d[y+2][x+i] = ID[n]; r.c[y+2][x+i] = 1

def home(name, title, door, tdoor, wall, floor, wins, seed, town):
    r = room(name, title, 12, 9, wall, floor, wins, (door, 0, wall), town, tdoor, 'home', seed); r.theme = wall; return r

r = home('home_lanternport_a', "Lighthouse keeper's cottage", 6, (37, 21), 'lantern', 'pine', {4, 7}, 73, L)
r.put('i_bookcase_lantern', 1, 1).put('i_globe', 3, 2).put('i_kitchen_sink', 9, 1).put('i_kitchen_stove', 10, 1).put('i_kitchen_fridge', 11, 1)
r.put('i_telescope', 5, 3).put('i_lantern_stand', 0, 4).put('i_dresser_lantern', 2, 3)
r.put('i_bed_lantern', 0, 6).put('i_table_lantern', 9, 5).put('i_chair_lantern', 9, 6).put('i_chair_lantern', 10, 6).put('i_plant_fern', 11, 8)
tv(r, 3, 5, 'worn')
r.npc('home_lanternport_a_keeper', 7, 4, 'left', 'TBD', 'retired lighthouse keeper, still logs the weather by the telescope')
r.spot('telescope', 5, 3, (5, 4), 'up', 'i_telescope', 'brass telescope aimed at the lighthouse')
r.spot('logbook', 1, 2, (1, 3), 'up', 'i_bookcase_lantern', 'shelf of weather logbooks')

r = home('home_lanternport_b', "Net-mender's house", 5, (14, 30), 'lantern', 'drift', {2, 8}, 74, L)
r.put('i_cupboard_lantern', 0, 1).put('i_shelf_lantern', 4, 2).put('i_kitchen_counter', 9, 1).put('i_kitchen_stove', 10, 1).put('i_kitchen_sink', 11, 1)
r.put('i_net', 3, 3).put('i_fishing_rods', 4, 3).put('i_barrel', 0, 4).put('i_crates', 0, 7)
r.put('i_table_small_lantern', 7, 5).put('i_log_stool', 6, 5).put('i_log_stool', 8, 5).put('i_radio', 7, 4)
r.put('i_bed_lantern', 11, 6).put('i_dresser_lantern', 10, 6).put('i_plant_coral', 11, 4)
r.npc('home_lanternport_b_mender', 2, 4, 'right', 'TBD', 'net-mender working a torn trawl net')
r.spot('net', 3, 3, (3, 4), 'up', 'i_net', 'half-mended net, shuttle still in it')
r.spot('radio', 7, 4, (7, 3), 'down', 'i_radio', 'harbour radio, tide times on repeat')

r = home('home_lanternport_d', 'Fisher family home', 6, (30, 30), 'lantern', 'oak', {3, 9}, 75, L)
r.put('i_kitchen_fridge', 0, 1).put('i_kitchen_counter', 1, 1).put('i_kitchen_stove', 2, 1).put('i_kitchen_sink', 3, 1)
r.put('i_bookcase_lantern', 7, 1).put('i_bed_lantern', 10, 3).put('i_bed_lantern', 11, 3).put('i_dresser_lantern', 9, 3)
r.put('i_table_lantern', 1, 4).put('i_chair_lantern', 1, 5).put('i_chair_lantern', 2, 5)
r.put('i_rug_teal', 4, 5).put('i_plant_palm', 0, 6).put('i_fishing_rods', 11, 7).put('i_toy_dummy' if 'i_toy_dummy' in ID else 'i_globe', 10, 7)
tv(r, 7, 4, 'normal')
r.npc('home_lanternport_d_parent', 2, 3, 'down', 'TBD', 'parent cooking the morning catch')
r.npc('home_lanternport_d_kid', 5, 6, 'up', 'TBD', 'kid on the rug, wants to be a lighthouse keeper')

r = home('home_lanternport_e', "Old captain's house", 5, (37, 30), 'lantern', 'parquet', {2, 9}, 76, L)
r.put('i_fireplace', 4, 1).put('i_bookcase_lantern', 0, 1).put('i_kitchen_sink', 10, 1).put('i_kitchen_stove', 11, 1)
r.put('i_ship_wheel', 1, 3).put('i_globe', 7, 3).put('i_anchor', 11, 6).put('i_trophy_case', 9, 3)
r.put('i_bed_lantern', 0, 6).put('i_dresser_lantern', 1, 6).put('i_table_small_lantern', 8, 7).put('i_chair_lantern', 9, 7).put('i_plant_flower', 11, 8)
tv(r, 4, 4, 'fancy')
r.npc('home_lanternport_e_captain', 7, 4, 'left', 'TBD', 'old harbour captain with stories about the storm')
r.spot('ship_wheel', 1, 3, (1, 4), 'up', 'i_ship_wheel', "wheel from the captain's last boat")
r.spot('trophy_case', 9, 3, (9, 5), 'up', 'i_trophy_case', 'regatta cups and a framed chart')

# ---------------- CINDERVALE (forge / ore) ----------------
C = 'cindervale'
r = room('heal_cindervale', 'Revival Tech Cindervale branch', 13, 9, 'rtbranch', 'rtbranch', {4, 11}, (6, 0, 'rtbranch'), C, (15, 21), 'heal', 81)
r.put('i_staffdoor_locked', 2, 1).put('i_poster_safety', 4, 1).put('i_crystal_polisher', 7, 1).put('i_poster_care', 10, 1).put('i_locker', 12, 1)
r.put('i_counter_rt_l', 4, 4).put('i_counter_rt_m', 5, 4).put('i_counter_rt_m', 6, 4).put('i_counter_rt_m', 7, 4).put('i_counter_rt_r', 8, 4)
r.put('i_suggestion_box', 0, 3).put('i_newsletter_rack', 10, 3).put('i_company_terminal', 0, 5).put('i_crystal_crate', 12, 3)
r.put('i_pillar_basalt', 12, 5).put('i_sofa_cinder', 9, 7).put('i_table_small_cinder', 8, 7).put('i_plant_succulent', 0, 8).put('i_plant_succulent', 12, 8)
r.npc('heal_cindervale_carer', 6, 3, 'down', 'healer', 'Revival Tech attendant with soot-proof sleeves; talk across the counter from (6,5)', text_ref='rt_branch.attendant', behind_counter=True)
r.npc('heal_cindervale_technician', 7, 3, 'up', 'rt_staff', 'technician at the polisher; talk across the counter from (7,5)', text_ref='rt_branch.technician', behind_counter=True)
r.npc('heal_cindervale_smith', 10, 6, 'up', 'TBD', 'foundry worker with a singed glove waiting for their team')
r.sign('staff_door_locked', 2, 2, 'STAFF ONLY door (locked)', text_ref='rt_branch.staff_door_locked')
r.sign('suggestion_box', 0, 3, 'suggestion box', text_ref='rt_branch.suggestion_box')
r.sign('newsletter', 10, 3, 'Revival Tech Bulletin rack', text_ref='rt_branch.newsletter')
r.spot('company_terminal', 0, 5, (1, 5), 'left', 'i_company_terminal', 'storage / company tasks PC')
r.spot('sofa', 10, 7, (10, 6), 'down', 'i_sofa_cinder', 'Lap Nap seat (sofa (9,7)-(10,7))')
r.extra = dict(branding='Revival Tech branch (player employer), foundry fit-out', locked_warps=[dict(x=2, y=2, approach=[2, 3], facing='up', to='rt_branch_backroom', tx=4, ty=4, locked=True, unlock_flag='has_branch_card', collision_when_unlocked=4, note='locked STAFF ONLY door, same rule as heal_saltmere')])
HEAL['heal_cindervale'] = (C, (15, 21))

r = room('shop_cindervale', 'Cindervale Foundry Supply mart', 12, 9, 'cinder', 'slate', {1, 10}, (5, 0, 'cinder'), C, (21, 21), 'mart', 82)
r.put('i_shopshelf_wall', 0, 1).put('i_shopshelf_wall', 2, 1).put('i_shopshelf_wall', 4, 1).put('i_banner_cinder', 6, 1).put('i_tool_rack', 11, 3)
r.put('i_counter_steel_l', 8, 4).put('i_counter_steel_m', 9, 4).put('i_counter_steel_r', 10, 4)
r.put('i_shopshelf_island', 1, 5).put('i_shopshelf_island', 4, 5).put('i_ore_cart', 0, 7).put('i_crates', 9, 7).put('i_barrel', 11, 7).put('i_plant_succulent', 6, 3)
r.npc('shop_cindervale_clerk', 9, 3, 'down', 'clerk', 'supply clerk in a leather apron; talk from (9,5). Opens the mart (variant_of clerk)', variant_of='clerk', behind_counter=True)
r.npc('shop_cindervale_miner', 3, 6, 'left', 'TBD', 'miner restocking before the slag tunnels')
r.spot('tool_rack', 11, 3, (10, 3), 'right', 'i_tool_rack', 'tongs and hammers for sale by the foundry (look only)')
HEAL['shop_cindervale'] = (C, (21, 21))

r = home('home_cindervale_a', "Smith family's house", 6, (30, 21), 'cinder', 'oak', {3, 9}, 83, C)
r.put('i_fireplace', 0, 1).put('i_kitchen_fridge', 8, 1).put('i_kitchen_counter', 9, 1).put('i_kitchen_stove', 10, 1).put('i_kitchen_sink', 11, 1)
r.put('i_tool_rack', 0, 7).put('i_bed_cinder', 11, 5).put('i_dresser_cinder', 10, 5).put('i_table_cinder', 8, 4).put('i_chair_cinder', 8, 5).put('i_chair_cinder', 9, 5)
r.put('i_rug_red', 5, 5).put('i_plant_fern', 11, 8)
tv(r, 3, 4, 'normal')
r.npc('home_cindervale_a_smith', 6, 4, 'down', 'TBD', 'smith home for lunch, still in the apron')
r.npc('home_cindervale_a_kid', 5, 6, 'left', 'TBD', 'kid on the rug, hammering a toy anvil')
r.spot('tool_rack', 0, 7, (1, 7), 'left', 'i_tool_rack', "spare hammers by the door")

r = home('home_cindervale_b', "Miner's house", 5, (37, 21), 'cinder', 'ash', {2, 8}, 84, C)
r.put('i_cupboard_cinder', 0, 1).put('i_shelf_cinder', 4, 2).put('i_kitchen_stove', 10, 1).put('i_kitchen_sink', 11, 1)
r.put('i_bed_cinder', 0, 4).put('i_dresser_cinder', 1, 4).put('i_lantern_stand', 4, 3)
r.put('i_table_small_cinder', 8, 5).put('i_log_stool', 7, 5).put('i_log_stool', 9, 5).put('i_radio', 8, 4)
r.put('i_ore_cart', 11, 7).put('i_barrel', 11, 5).put('i_crates', 0, 7)
r.npc('home_cindervale_b_miner', 6, 4, 'left', 'TBD', 'miner sorting ore samples')
r.spot('ore_cart', 11, 7, (10, 7), 'right', 'i_ore_cart', 'cart of ore samples, labelled by tunnel')

r = home('home_cindervale_c', "Kiln potter's house", 6, (30, 30), 'cinder', 'flag', {4, 8}, 85, C)
r.put('i_bookcase_cinder', 0, 1).put('i_salt_jars', 2, 2).put('i_kitchen_counter', 9, 1).put('i_kitchen_stove', 10, 1).put('i_kitchen_sink', 11, 1)
r.put('i_table_cinder', 1, 4).put('i_chair_cinder', 1, 5).put('i_chair_cinder', 2, 5).put('i_salt_jars', 0, 7)
r.put('i_bed_cinder', 11, 3).put('i_dresser_cinder', 10, 3).put('i_plant_succulent', 11, 8)
tv(r, 7, 4, 'worn')
r.npc('home_cindervale_c_potter', 3, 3, 'down', 'TBD', 'potter glazing jars at the table')
r.spot('jars', 2, 2, (2, 3), 'up', 'i_salt_jars', 'glazed jars drying on the shelf')

if __name__ == '__main__':
    for r in ROOMS:
        r.check()
        json.dump(r.json(), open(f'{OW}/maps/{r.name}.json', 'w'), separators=(',', ':'))
    # town warps (both directions)
    for r in ROOMS:
        t = json.load(open(f'{OW}/maps/{r.town}.json'))
        for w in t['warps']:
            if (w['x'], w['y']) == tuple(r.tdoor):
                for k in ('recolour', 'scheme', 'design'): w.pop(k, None)
                w.update(to=r.name, tx=r.door[0], ty=r.h - 2, facing='up')
        json.dump(t, open(f'{OW}/maps/{r.town}.json', 'w'), separators=(',', ':'))
    print('wrote', ' '.join(r.name for r in ROOMS))
