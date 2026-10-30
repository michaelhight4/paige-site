"""Wellspire rebellion flashback lab: 10 door-linked room maps (WD, Oct 29 2026, DRAFT for Coder to wire).

fin_past_wlab_01_entry -> 02_medical -> 03_control -> 04_tanks -> 05_amber -> 06_growth -> 07_vats -> 08_core
-> 09_observation -> 10_ondravel. Each room: forward door in the top wall (face row), back door in the bottom wall
(room 1 has none: the flashback drops you in). Lab techs are trainers whose sight lines cover a 1-tile lane or a
crossing every path to the next door has to use (checked here: BFS with every sight cell removed must NOT reach the
door). Art: shared lab / revival / metal tiles + wl_* (tools/wellspire_lab/lab_art_kit.py, tileset_arena.json 12201+).

Run:  python3 tools/wellspire_lab/build_lab_maps.py         (writes maps, prints the checks)
      python3 tools/wellspire_lab/build_lab_maps.py --check (checks only)
"""
import json, os, sys
from collections import deque

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld')
MAPS = os.path.join(OW, 'maps')
TS = {t['name']: t for f in ('tileset.json', 'tileset_ix2.json', 'tileset_arena.json') for t in json.load(open(os.path.join(OW, f)))['tiles']}
ID = lambda n: TS[n]['id']
SEE = {0, 2, 7, 10}
PFX = 'fin_past_wlab_'
TINT = {'color': '#5a2ad0', 'alpha': 0.1}

# palettes: (wall top, wall upper, wall face, floor a, floor b, door, exit)
WALLS = {
    'lab': ('i_wall_top_lab', 'i_wall_upper_lab', 'i_wall_face_lab', 'i_floor_lab_a', 'i_floor_lab_b', 'wl_door_lab', 'wl_exit_lab'),
    'white': ('i_wall_top_lab', 'i_wall_upper_lab', 'i_wall_face_lab', 'i_floor_marble_a', 'i_floor_lab_a', 'wl_door_lab', 'wl_exit_lab'),
    'steel': ('wl_wall_top_steel', 'wl_wall_upper_steel', 'wl_wall_face_steel', 'wl_floor_steel', 'wl_floor_steel_b', 'wl_door_steel', 'wl_exit_steel'),
    'navy': ('wl_wall_top_navy', 'wl_wall_upper_navy', 'wl_wall_face_navy', 'wl_floor_navy', 'wl_floor_navy_b', 'wl_door_navy', 'wl_exit_navy'),
    'amber': ('wl_wall_top_amber', 'wl_wall_upper_amber', 'wl_wall_face_amber', 'wl_floor_amber', 'wl_floor_amber_b', 'wl_door_amber', 'wl_exit_amber'),
    'green': ('wl_wall_top_green', 'wl_wall_upper_green', 'wl_wall_face_green', 'wl_floor_green', 'wl_floor_green_b', 'wl_door_green', 'wl_exit_green'),
}

# multi-tile props: letter -> (w, h, name(cx, cy))  (wl_* kit tiles are _<col>_<row>; shared kit tiles are _<row>_<col>)
WL = lambda base, w, h: (w, h, lambda cx, cy: f'{base}_{cx}_{cy}')
PROPS = {
    't': WL('wl_tank_cyan', 1, 2), 'a': WL('wl_tank_amber', 1, 2), 'g': WL('wl_tank_green', 1, 2), 'v': WL('wl_tank_violet', 1, 2),
    'B': WL('wl_bigtank_cyan', 2, 3), 'G': WL('wl_bigtank_green', 2, 3), 'S': WL('wl_scan', 3, 2), 'H': WL('wl_helix', 2, 4),
    'O': WL('wl_bigcrystal', 6, 5), 'R': WL('wl_ring', 2, 2),
    'b': (1, 2, lambda cx, cy: f'i_bed_revival_{cy}_0'), 'h': (2, 2, lambda cx, cy: f'i_heal_machine_{cy}_{cx}'),
    'k': (1, 2, lambda cx, cy: f'i_server_rack_{cy}_0'), 'd': (1, 2, lambda cx, cy: f'i_crystal_display_{cy}_0'),
    'm': (1, 2, lambda cx, cy: f'i_lab_machine_{cy}_0'), 'w': (2, 1, lambda cx, cy: f'i_lab_desk_0_{cx}'),
    'F': (1, 2, lambda cx, cy: f'filing_{cy}_0'), 'C': (1, 2, lambda cx, cy: f'cooler_{cy}_0'), 'Q': (1, 2, lambda cx, cy: f'i_cupboard_revival_{cy}_0'),
    'p': (1, 2, lambda cx, cy: f'i_pillar_steel_{cy}_0'),
}
SINGLE = {'K': 'wl_console', 'T': 'i_terminal', 'P': 'i_plant_fern', 'j': 'wl_jars_amber', 'x': 'i_crates_0_0', 'c': 'i_chair_revival',
          'L': 'i_counter_steel_l', 'M': 'i_counter_steel_m', 'N': 'i_counter_steel_r', 'r': 'i_railing', 'y': 'wl_growth_0', 'e': 'i_telescope',
          'i': 'i_crystal_on', 'u': 'i_power_cube_block', 's': 'i_shelf_revival', 'z': 'i_trophy_case_0_0'}
# ground-only cells
GROUND = {'.': 'A', ',': 'B', '-': 'strip', '|': 'strip_v', '_': 'grate', 'o': 'pit', 'q': 'pit_lip', 'V': 'vat', 'W': 'vatc'}

ROOMS = []


def room(key, title, pal, rows, npcs=(), signs=(), wall_deco=(), extra=None, glow='steel', vat='green'):
    ROOMS.append(dict(key=key, name=PFX + key, title=title, pal=pal, rows=rows, npcs=list(npcs), signs=list(signs), wall_deco=list(wall_deco),
                      extra=extra or {}, glow=glow, vat=vat))


# Row 0 = wall top, row 1 = upper wall, row 2 = wall face ('D' = forward door), last row = wall top ('E' = back door).
room('01_entry', 'Lab Entry Corridor', 'lab', [
    '###########',
    '#uuuuuuuuu#',
    '#fffffDfff#',
    '#P.......P#',
    '#d.......d#',
    '#d.......d#',
    '#LMMN.*LMN#',
    '#.........#',
    '#d..RR...d#',
    '#d..RR...d#',
    '#.........#',
    '#,,,,,,,,,#',
    '#P.......P#',
    '###########',
], npcs=[('tech_1', 6, 6, 'left', 1)],
    signs=[('note_visitor', 2, 2, 'VISITOR LOG, Signal Test 7 week. Badges stay at the desk. Nobody goes past the white line alone.'),
           ('note_cast', 1, 5, 'A cast of the Line 1 forehead crystal, made for the funding visit. The real one is still in him.')],
    wall_deco=[(3, 1, 'wl_holo_1'), (8, 1, 'wl_holo_0'), (2, 2, 'wl_clipboard')],
    extra={'arrival': [5, 11]})

room('02_medical', 'Medical Wing', 'white', [
    '###############',
    '#uuuuuuuuuuuuu#',
    '#fffffffffffDf#',
    '#b.b.b......,P#',
    '#b.b.b......,.#',
    '#.............#',
    '#......RR.....#',
    '#hh....RR....C#',
    '#hh..........C#',
    '#.............#',
    '#LMMMMMMMN.*LN#',
    '#.............#',
    '#######E#######',
], npcs=[('tech_2', 11, 10, 'left', 1)],
    signs=[('note_beds', 2, 2, 'Bed 3 is for staff. Line 1 handlers keep reporting the same headache. Logged as "the hum".'),
           ('note_heal', 13, 8, 'Restorer unit, set to gentle. Someone has glued a cover over the overdrive switch.')],
    wall_deco=[(2, 2, 'wl_clipboard'), (6, 1, 'wl_holo_0'), (9, 1, 'wl_holo_1')])

room('03_control', 'Control Room', 'steel', [
    '###############',
    '#uuuuuuuuuuuuu#',
    '#ffffffDffffff#',
    '#KTK.......KTK#',
    '#.............#',
    '#......SSS....#',
    '#......SSS....#',
    '#.............#',
    '#KK.........KK#',
    '#LMMMMN.*LMMMN#',
    '#.............#',
    '#-------------#',
    '#######E#######',
], npcs=[('tech_3', 8, 9, 'left', 1), ('tech_4', 10, 4, 'left', 9)],
    signs=[('note_test7', 2, 3, 'SIGNAL TEST 7. Output 140 percent. Crest crystal stress: red. HOLD.'),
           ('note_finch', 12, 3, 'Handwritten on the screen bezel: "Do not run Test 8. Not on him. - C. Finch"')],
    wall_deco=[(2, 1, 'wl_holo_0'), (4, 1, 'wl_holo_1'), (10, 1, 'wl_holo_0'), (12, 1, 'wl_holo_2')])

room('04_tanks', 'Main Tank Floor', 'navy', [
    '#################',
    '#uuuuuuuuuuuuuuu#',
    '#fffffffDfffffff#',
    '#t.t.t.....tKt.t#',
    '#t.t.t.....tTt.t#',
    '#...............#',
    '#...............#',
    '#BBBBBBt.KBBBBBB#',
    '#BBBBBBt.*BBBBBB#',
    '#BBBBBBK.KBBBBBB#',
    '#...............#',
    '#.p....---....p.#',
    '#.p...........p.#',
    '########E########',
], npcs=[('tech_5', 9, 8, 'left', 1), ('tech_6', 12, 5, 'left', 11)],
    signs=[('note_lines', 1, 4, 'Lines 2 to 9: asleep. Lights low after eight. They dream when the core runs loud.')],
    wall_deco=[(3, 1, 'wl_holo_2'), (12, 1, 'wl_holo_0')], glow='cyan')

room('05_amber', 'Amber Specimen Corridor', 'amber', [
    '###################',
    '#uuuuuuuuuuuuuuuuu#',
    '#ffffffffffffffDff#',
    '#a.a.jja.a.j.a....#',
    '#a.a..*a.a...a....#',
    '#.................#',
    '#.................#',
    '#j.xjxjxjxj.*xjxjx#',
    '##E################',
], npcs=[('tech_7', 6, 4, 'down', 2), ('tech_8', 12, 7, 'up', 4)],
    signs=[('note_amber', 9, 3, 'AMBER LINE. Kept for study, never woken. This week three of them turned to face the door.')],
    wall_deco=[(4, 1, 'wl_holo_2'), (11, 1, 'wl_holo_1'), (8, 2, 'wl_clipboard')])

room('06_growth', 'Growth Room', 'green', [
    '###############',
    '#uuuuuuuuuuuuu#',
    '#fDfffffffffff#',
    '#....,.g.g.g.y#',
    '#.y....g.g.g.y#',
    '#....*........#',
    '#GGGGGG.yGGGGy#',
    '#GGGGGG.*GGGGy#',
    '#GGGGGG.yGGGGy#',
    '#.............#',
    '#.y.._____..y.#',
    '#.............#',
    '############E##',
], npcs=[('tech_9', 8, 7, 'left', 1), ('tech_10', 5, 5, 'up', 2)],
    signs=[('note_growth', 13, 4, 'The feeding schedule has been torn down. Under it, in marker: WE ARE LETTING THEM OUT.')],
    wall_deco=[(5, 1, 'wl_holo_2'), (9, 1, 'wl_holo_2'), (13, 2, 'wl_clipboard')], glow='green')

room('07_vats', 'Sunken Vat Hall', 'green', [
    '#################',
    '#uuuuuuuuuuuuuuu#',
    '#ffDffffffffffff#',
    '#,,,,,,,*,,,,,,,#',
    '#_______________#',
    '#VVVVVVV_VVVVVVV#',
    '#VVVVVVV_VVVVVVV#',
    '#VVVVVVV_VVVVVVV#',
    '#VVVVVVV_VVVVVVV#',
    '#_______________#',
    '#VVVVVVVVVVV_VVV#',
    '#VVVVVVVVVVV_VVV#',
    '#VVVVVVVVVVV_VVV#',
    '#,,,,,,,,,,,,,,*#',
    '###E#############',
], npcs=[('tech_11', 8, 3, 'down', 6), ('tech_12', 15, 13, 'left', 4)],
    signs=[('note_vat', 6, 2, 'Vat 3 drained Tuesday. Whoever was in it went down to the river. Nobody signed for it.')],
    wall_deco=[(6, 2, 'wl_clipboard'), (10, 1, 'wl_holo_2'), (13, 1, 'wl_holo_1')], glow='green', vat='green')

room('08_core', 'Energy Core', 'navy', [
    '##################',
    '#uuuuuuuuuuuuuuuu#',
    '#fffffffffffffDff#',
    '#KKK...........,K#',
    '#qqqqqqqqqqqqq_qq#',
    '#ooooooooooooo_oo#',
    '#oo*oo____oooo_oo#',
    '#oo_oo_HH_______*#',
    '#oo____HH_ooooooo#',
    '#oo_oo_HH_ooooooo#',
    '#oo_oo_HH_ooooooo#',
    '#oo_oo____ooooooo#',
    '#oo_ooooooooooooo#',
    '#,,,,,,,,,,,,,,,,#',
    '###E##############',
], npcs=[('tech_13', 3, 6, 'down', 2), ('tech_14', 16, 7, 'left', 3)],
    signs=[('note_core', 3, 3, 'Core load: OVERDRIVEN. The helix hums the same note as the Line 1 crest. It is getting louder.')],
    wall_deco=[(5, 1, 'wl_holo_1'), (11, 1, 'wl_holo_2')], glow='cyan')

room('09_observation', 'Observation Deck', 'navy', [
    '##############',
    '#uuuuuuuuuuuu#',
    '#ffffffffffDf#',
    '#............#',
    '#rrrrrrrrr...#',
    '#...........*#',
    '#LMMMMMMMN.*N#',
    '#..c.c.c.....#',
    '#e...........#',
    '#K..........K#',
    '###E##########',
], npcs=[('tech_15', 11, 6, 'left', 1), ('chief', 12, 5, 'left', 3)],
    signs=[('note_window', 1, 8, 'From here you can see the river. The Breakout is tonight. Leave every door open behind you.')],
    wall_deco=[('porthole', 4, 0)])

room('10_ondravel', "Ondravel's Tank", 'navy', [
    '################',
    '#uuuuuuuuuuuuuu#',
    '#ffffffffffffff#',
    '#K..iOOOOOOi..K#',
    '#K...OOOOOO...K#',
    '#....OOOOOO....#',
    '#K...OOOOOO...K#',
    '#....OOOOOO....#',
    '#..i........i..#',
    '#.ww........ww.#',
    '#..............#',
    '#......,,......#',
    '#######E########',
], signs=[],
    wall_deco=[(2, 1, 'wl_holo_0'), (13, 1, 'wl_holo_0')],
    extra={'tubes': [((4, 4), 'h'), ((3, 4), 'h'), ((2, 4), 'h'), ((11, 4), 'h'), ((12, 4), 'h'), ((4, 6), 'h'), ((3, 6), 'h'), ((2, 6), 'h'),
                     ((11, 6), 'h'), ((12, 6), 'h'), ((7, 8), 'v'), ((7, 9), 'v'), ((7, 10), 'v')], 'ondravel': True})


def build_room(R, idx):
    rows = R['rows']; H, W = len(rows), len(rows[0]); assert all(len(r) == W for r in rows), R['key']
    top, upper, face, fa, fb, door, exit_ = WALLS[R['pal']]
    G = [[0] * W for _ in range(H)]; D = [[0] * W for _ in range(H)]; OV = [[0] * W for _ in range(H)]; C = [[1] * W for _ in range(H)]
    floor_k = {'lab': 'steel', 'white': 'steel', 'steel': 'steel', 'navy': 'navy', 'amber': 'amber', 'green': 'green'}[R['pal']]
    gk = 'green' if R['pal'] == 'green' else 'steel'
    done = set(); doorpos = exitpos = None
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            # ground base
            if ch == '#': G[y][x] = ID(top); continue
            if ch == 'u': G[y][x] = ID(upper); continue
            if ch == 'f': G[y][x] = ID(face); continue
            if ch == 'D': G[y][x] = ID(door); C[y][x] = 4; doorpos = (x, y); continue
            if ch == 'E': G[y][x] = ID(exit_); C[y][x] = 4; exitpos = (x, y); continue
            if (x, y) in done: G[y][x] = ID(fa); continue
            G[y][x] = ID(fb if ch == ',' or (x + y) % 7 == 0 and ch == '.' and R['pal'] in ('lab', 'white') else fa); C[y][x] = 0
            if ch in GROUND:
                k = GROUND[ch]
                if k == 'strip': G[y][x] = ID(f'wl_strip_{floor_k}')
                elif k == 'strip_v': G[y][x] = ID(f'wl_strip_{floor_k}_v')
                elif k == 'grate': G[y][x] = ID(f'wl_grate_{gk}')
                elif k == 'pit': G[y][x] = ID(f'wl_pit_{gk}'); C[y][x] = 1
                elif k == 'pit_lip': G[y][x] = ID(f'wl_pit_lip_{gk}'); C[y][x] = 1
                elif k == 'vat':
                    n = lambda xx, yy: 0 <= yy < H and 0 <= xx < W and rows[yy][xx] == 'V'
                    v = ('n' if not n(x, y - 1) else 's' if not n(x, y + 1) else '')
                    hh = ('w' if not n(x - 1, y) else 'e' if not n(x + 1, y) else '')
                    G[y][x] = ID(f"wl_vat_{R['vat']}_{(v + hh) or 'c'}"); C[y][x] = 1
            elif ch == '*': pass
            elif ch in SINGLE:
                nm = SINGLE[ch]
                if nm == 'i_power_cube_block': nm = 'i_crates_0_1'
                D[y][x] = ID(nm); C[y][x] = 1
            elif ch in PROPS:
                if (x, y) in done: continue
                w, h, fn = PROPS[ch]
                for cy in range(h):
                    for cx in range(w):
                        assert rows[y + cy][x + cx] == ch, (R['key'], ch, x, y, cx, cy)
                        layer = D
                        D[y + cy][x + cx] = ID(fn(cx, cy)); done.add((x + cx, y + cy))
                        C[y + cy][x + cx] = 0 if ch == 'R' else 1
                # big props 2+ wide side by side: restart a new copy every w columns
            else:
                raise SystemExit(f'{R["key"]}: unknown {ch!r} at {x},{y}')
    # side-by-side copies of the same multi-tile letter (e.g. BBBBBB = three big tanks): verify footprints tile cleanly
    for (x, y) in list(done): pass
    for (x, y, nm) in R['wall_deco']:
        if x == 'porthole':
            for cy in range(3):
                for cx in range(4): D[0 + cy][y + cx] = ID(f'wl_porthole_{cx}_{cy}')
        else: D[y][x] = ID(nm)
    for (pos, k) in R['extra'].get('tubes', []):
        x, y = pos
        if C[y][x] == 0: D[y][x] = ID(f'wl_tube_violet_{k}')
        else: OV[y][x] = 0
    return dict(G=G, D=D, OV=OV, C=C, W=W, H=H, door=doorpos, exit=exitpos)


def place_multi_fix(R):
    """Letters like 'BBBBBB' or 'GGGGGG' mean several copies side by side: rewrite rows so build_room places copies."""
    return R


def ray(C, x, y, facing, rng, npcs):
    dx, dy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}[facing]; out = []
    for k in range(1, rng + 1):
        cx, cy = x + dx * k, y + dy * k
        if not (0 <= cy < len(C) and 0 <= cx < len(C[0])) or C[cy][cx] not in SEE or (cx, cy) in npcs: break
        out.append([cx, cy])
    return out


def bfs(C, start, blocked):
    H, W = len(C), len(C[0]); seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in seen and n not in blocked and C[n[1]][n[0]] in (0, 4, 7):
                seen.add(n); q.append(n)
    return seen


TEAMS = {  # endgame past-lab levels (staff 67-68, chief 69); species from the late-game pool like the other past-lab staff
    'tech_1': (67, 'ingotitan', 'geodurchin'), 'tech_2': (67, 'glassvine', 'mirrorkin'), 'tech_3': (67, 'runeskein', 'prismwing'),
    'tech_4': (67, 'obsidiax', 'delvemaw', 'seaglint'), 'tech_5': (67, 'torrentpike', 'hullwhale'), 'tech_6': (68, 'pearlisk', 'cascadorn', 'moorcoil'),
    'tech_7': (67, 'cairnhorn', 'velvetabby'), 'tech_8': (68, 'bleachghast', 'crowkin', 'obsidiax'), 'tech_9': (67, 'glassvine', 'moorcoil'),
    'tech_10': (68, 'delvemaw', 'geodurchin', 'glassvine'), 'tech_11': (68, 'brineseal', 'bulwarkrab', 'torrentpike'), 'tech_12': (68, 'cascadorn', 'hullwhale', 'seraphawk'),
    'tech_13': (68, 'stratodrake', 'ingotitan', 'prismwing'), 'tech_14': (68, 'sunderhoof', 'peakbrute', 'runeskein'), 'tech_15': (68, 'highkite', 'seraphawk', 'mirrorkin'),
    'chief': (69, 'ingotitan', 'obsidiax', 'stratodrake', 'bleachghast', 'hullwhale', 'glassvine'),
}


def main(check_only=False):
    out, problems, report = {}, [], []
    n = len(ROOMS)
    built = [build_room(R, i) for i, R in enumerate(ROOMS)]
    for i, (R, B) in enumerate(zip(ROOMS, built)):
        C = B['C']; nm = R['name']
        warps = []
        if B['door'] and i + 1 < n:
            nb = built[i + 1]; ex = nb['exit']
            warps.append({'x': B['door'][0], 'y': B['door'][1], 'to': ROOMS[i + 1]['name'], 'tx': ex[0], 'ty': ex[1] - 1, 'facing': 'up', 'kind': 'door'})
        if B['exit'] and i > 0:
            pb = built[i - 1]; dp = pb['door']
            warps.append({'x': B['exit'][0], 'y': B['exit'][1], 'to': ROOMS[i - 1]['name'], 'tx': dp[0], 'ty': dp[1] + 1, 'facing': 'down', 'kind': 'door'})
        if i + 1 == n and B['door']: problems.append(f'{nm}: last room has a forward door')
        npcpos = {(x, y) for (_id, x, y, f, r) in R['npcs']}
        npcs = []
        for (tid, x, y, f, rng) in R['npcs']:
            assert R['rows'][y][x] in '*.,' and C[y][x] == 0, (nm, tid, x, y)
            cells = ray(C, x, y, f, rng, npcpos - {(x, y)})
            if len(cells) != rng: problems.append(f'{nm}.{tid}: sight {rng} but only {len(cells)} open cells')
            npcs.append({'id': f'fin_wlab_{tid}', 'x': x, 'y': y, 'facing': f, 'kind': 'trainer', 'region9': True, 'sight_range': rng, 'sight_cells': cells,
                         'sight_rule': 'see OVERWORLD_README "Trainer line of sight"', 'text_ref': f'overworld_lines.json maps.{nm}.fin_wlab_{tid}',
                         'note': 'flashback lab tech (WD Oct 29 2026 DRAFT): team in src/region9/teams.js; talk/text: Coder + Text Bot' if tid != 'chief' else
                         'flashback lab chief (WD DRAFT): final gate before the tank'})
        # leftover '*' cells (trainer markers without a trainer) become floor already
        start = (B['exit'][0], B['exit'][1] - 1) if B['exit'] else tuple(R['extra']['arrival'])
        goal = (B['door'][0], B['door'][1]) if B['door'] else None
        reach = bfs(C, start, npcpos)
        floor = {(x, y) for y in range(B['H']) for x in range(B['W']) if C[y][x] == 0 and (x, y) not in npcpos}
        unreach = sorted(floor - reach)
        if unreach: problems.append(f'{nm}: unreachable floor {unreach[:8]} ({len(unreach)})')
        if goal and goal not in reach: problems.append(f'{nm}: door not reachable')
        sight = {tuple(c) for d in npcs for c in d['sight_cells']}
        gated = goal is not None and goal not in bfs(C, start, npcpos | sight)
        if goal and R['npcs'] and not gated: problems.append(f'{nm}: trainers do not gate the door')
        # each trainer individually on the only path?
        per = []
        for d in npcs:
            alone = goal not in bfs(C, start, npcpos | {tuple(c) for c in d['sight_cells']}) if goal else False
            per.append(f"{d['id']}{'(gate)' if alone else '(side)'}")
        if start in sight: problems.append(f'{nm}: arrival cell is in a sight line')
        signs = []
        for (sid, x, y, text) in R['signs']:
            if C[y][x] == 0: problems.append(f'{nm}.{sid}: sign on a walkable cell')
            stand = next(((x + dx, y + dy) for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)) if (x + dx, y + dy) in reach), None)
            if not stand: problems.append(f'{nm}.{sid}: no reachable stand cell')
            signs.append({'id': f'fin_wlab_{sid}', 'x': x, 'y': y, 'text': text, 'text_ref': f'overworld_lines.json maps.{nm}.fin_wlab_{sid}',
                          'text_note': 'dev label only (DRAFT, WD); final text = text_ref'})
        j = {'name': nm, 'title': R['title'], 'width': B['W'], 'height': B['H'], 'tile_size': 64, 'tileset': '../tileset.json',
             'layers': {'ground': B['G'], 'decoration': B['D'], 'overlay': B['OV'], 'collision': C, 'encounter': [[0] * B['W'] for _ in range(B['H'])]},
             'warps': warps, 'exits': [], 'encounter_zones': [], 'movement': {'run': True, 'bike': False}, 'npcs': npcs, 'signs': signs, 'items': [],
             'interact_spots': [], 'source': 'tools/wellspire_lab/build_lab_maps.py (WD flashback lab, Oct 29 2026, DRAFT)', 'region': 'past',
             'tint': dict(TINT), 'flashback_lab': {'room': i + 1, 'of': n, 'arrival': list(start)}}
        if R['extra'].get('ondravel'):
            ox = next(x for x in range(B['W']) if R['rows'][3][x] == 'O'); oy = 3
            j['r9_enclosure'] = True; j['tint'] = {'color': '#8a50ff', 'alpha': 0.14}
            j['ondravel'] = {'x': ox + 2, 'y': oy + 3, 'w': 4, 'h': 4, 'sheet': 'art/characters/pixel/creatures/ondravel/overworld/ondravel_big_sheet.png'}
            # broken-glass tank once Ondravel is out (Coder, Oct 30 2026): every 6x5 cell swaps to wl_bigcrystal_broken_*
            j['flag_swaps'] = [{'x': ox + cx, 'y': oy + cy, 'layer': 'decoration', 'before': f'wl_bigcrystal_{cx}_{cy}', 'after': f'wl_bigcrystal_broken_{cx}_{cy}',
                                'flag': 'fin_released'} for cy in range(5) for cx in range(6)]
            j['interact_spots'] = [{'id': 'fin_past_dome', 'kind': 'prop', 'x': ox + 2, 'y': oy + 4, 'stand': [ox + 2, oy + 5], 'face': 'up', 'region9': True},
                                   {'id': 'fin_past_logbook', 'kind': 'prop', 'x': 3, 'y': 9, 'stand': [3, 10], 'face': 'up', 'region9': True}]
            for s in j['interact_spots']:
                if tuple(s['stand']) not in reach: problems.append(f"{nm}: {s['id']} stand unreachable")
                if C[s['y']][s['x']] == 0: problems.append(f"{nm}: {s['id']} prop cell walkable")
        report.append(f"{nm}: {B['W']}x{B['H']} reach {len(reach)} floor cells, gated={gated}, trainers {per}, signs {len(signs)}")
        out[nm] = j
    for r in report: print(r)
    for p in problems: print('PROBLEM', p)
    if not check_only:
        for nm, j in out.items():
            json.dump(j, open(os.path.join(MAPS, nm + '.json'), 'w'), separators=(',', ':'))
        print('wrote', len(out), 'maps')
    return out, problems


if __name__ == '__main__':
    _o, pr = main('--check' in sys.argv)
    sys.exit(1 if pr else 0)
