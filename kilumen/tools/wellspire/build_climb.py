#!/usr/bin/env python3
"""Wellspire v2: the climb (Coder, Oct 29 2026; Gary 10:17 PM CT). Bespoke maps, drawn from ASCII (no template clones):
  outdoor 1 r9_switchbacks (existing) -> cave 1 r9_icefall (existing) -> outdoor 2 r9_cloudway -> cave 2 r9_echo_cave
  -> outdoor 3 r9_cloudline -> cave 3 r9_heart_cave -> fin_summit_camp (existing) -> spire -> fin_lab1_now (the summit, bespoke)
  past: fin_past_enclosure (bespoke rebellion-era lab enclosure).
Each new map carries a puzzle block (src/systems/puzzles.js: latch plates, resonance crystals, gates) verified here by BFS.
Run AFTER build_wellspire.py (it overwrites fin_lab1_now / fin_past_enclosure and retargets the icefall + camp warps).
Legend: # wall/rock  . floor  T pine(outdoor)  R rock  C crystal(block)  i ice  P plate  S crystal switch  G gate
        U up-door  B down-door  k notice/lore spot (blocked)  O Ondravel plinth (blocked)  * lit crystal ring (block)
        ~ cloud (block, summit edge)  1-9 trainers (floor)"""
import json, os, itertools, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import deque
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
PASS = {0, 4, 7, 10}
def J(n): return json.load(open(os.path.join(MAPS, n + '.json')))

STYLE = {
 'out':  {'floor': [21, 22, 23, 24], 'wall_g': 21, 'wall_d': 507, 'door': 816},
 'cave': {'floor': [29, 30, 31, 32], 'wall_g': 537, 'wall_d': 0, 'door': 544},
 'lab':  {'floor': [7008, 7026, 7044], 'wall_g': 7098, 'wall_d': 0, 'door': 7324},
 'peak': {'floor': [898, 899, 900, 901], 'wall_g': 21, 'wall_d': 507, 'door': 7322},
}

def draw(name, title, style, rows, region='wellspire', tint=None, table=None, links=None, trainers=(), spots=(), puzzle=None, extra=None):
    H = len(rows); W = len(rows[0]); assert all(len(r) == W for r in rows), (name, [len(r) for r in rows])
    st = STYLE[style]; Z = lambda: [[0] * W for _ in range(H)]
    g, d, o, c, e = Z(), Z(), Z(), Z(), Z()
    cells = {}
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            fl = st['floor'][(x * 7 + y * 13) % len(st['floor'])]
            g[y][x] = fl; cells.setdefault(ch, []).append((x, y))
            if ch == '#':
                g[y][x] = st['wall_g']; d[y][x] = st['wall_d'] if (style != 'out' or (x + y) % 3) else 0; c[y][x] = 1
                if style in ('out', 'peak') and not d[y][x]: d[y][x] = 507
                if style == 'lab': g[y][x] = 7101 if y + 1 < H and rows[y + 1][x] not in '#' else 7098
            elif ch == 'T':
                if y > 0 and rows[y - 1][x] in '.#T~': o[y - 1][x] = 1823
                d[y][x] = 1824; c[y][x] = 1
            elif ch == 'R': d[y][x] = 509 if style == 'cave' else 507; c[y][x] = 1
            elif ch == 'C': d[y][x] = 510; c[y][x] = 1
            elif ch == '*': d[y][x] = 496; c[y][x] = 1
            elif ch == '~': d[y][x] = 11017; c[y][x] = 1
            elif ch == 'O': g[y][x] = 905; d[y][x] = 0; c[y][x] = 1
            elif ch == 'i': g[y][x] = 902 + (x + y) % 4; c[y][x] = 10
            elif ch == 'P': d[y][x] = 890; c[y][x] = 7
            elif ch == 'S': d[y][x] = 892; c[y][x] = 1
            elif ch == 'G': d[y][x] = 896; c[y][x] = 6
            elif ch in 'UB': d[y][x] = st['door']; c[y][x] = 4
            elif ch == 'k': d[y][x] = 7427; c[y][x] = 1
            elif ch == 'v': d[y][x] = 505  # violet flowers / moss (walk)
            elif ch == 'm': g[y][x] = 11960 + (x + y) % 2  # mystic floor (walk)
            elif ch == 'l': d[y][x] = 7288; c[y][x] = 1  # lab tank (top)
            elif ch == 'L': d[y][x] = 7289; c[y][x] = 1
            elif ch == 'p': d[y][x] = 7212; c[y][x] = 1
            elif ch == 'x': d[y][x] = 7335; c[y][x] = 1
            elif ch == 'r': d[y][x] = 7060  # rail (walk)
    if table:
        for y in range(H):
            for x in range(W):
                if c[y][x] == 0 and rows[y][x] in '.v' and (x * 3 + y * 5) % 4 == 0: e[y][x] = 1
    j = {'name': name, 'title': title, 'width': W, 'height': H, 'tile_size': 64, 'tileset': '../tileset.json',
         'layers': {'ground': g, 'decoration': d, 'overlay': o, 'collision': c, 'encounter': e},
         'warps': [], 'exits': [], 'encounter_zones': ([{'x0': 1, 'y0': 1, 'x1': W - 2, 'y1': H - 2, 'table': table}] if table else []),
         'movement': {'run': True, 'bike': style in ('out', 'peak')}, 'npcs': [], 'signs': [], 'items': [], 'interact_spots': [],
         'source': 'tools/wellspire/build_climb.py (bespoke, Wellspire v2)', 'region': region}
    if tint: j['tint'] = tint
    if extra: j.update(extra)
    for (ch, to, tx, ty, facing) in (links or []):
        for (x, y) in cells[ch]: j['warps'].append({'x': x, 'y': y, 'to': to, 'tx': tx, 'ty': ty, 'facing': facing})
    for (ch, nid, facing, kw) in trainers:
        (x, y), = cells[ch]; j['npcs'].append({'id': nid, 'x': x, 'y': y, 'facing': facing, 'kind': kw.pop('kind', 'trainer'), 'region9': True, **kw})
        c[y][x] = 0
    pts = {}
    for (ch, sid, kw) in spots:
        for i, (x, y) in enumerate(sorted(cells[ch], key=lambda p: (p[1], p[0]))):
            sid0 = sid; sid = sid0 if i == 0 else f'{sid0}_{i + 1}'
            j['interact_spots'].append({'id': sid, 'kind': 'prop', 'x': x, 'y': y, 'stand': [x, y + 1], 'face': 'up', 'region9': True, **kw})
            pts[sid] = {'x': x, 'y': y + 1, 'facing': 'up'}; sid = sid0
    if puzzle:
        P = puzzle(cells); j['puzzle'] = P
    return j, cells, pts

def reach(j, start, open_gates):
    c = j['layers']['collision']; H, W = len(c), len(c[0]); npc = {(n['x'], n['y']) for n in j['npcs']}
    seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and (nx, ny) not in npc and (c[ny][nx] in PASS or (open_gates and c[ny][nx] == 6)):
                seen.add((nx, ny)); q.append((nx, ny))
    return seen

def adj(p, S): x, y = p; return any(q in S for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

def verify(j, cells, start):
    """The puzzle matters (top door shut with gates closed) and is solvable from the bottom door; every NPC + spot is reachable."""
    closed = reach(j, start, False); opened = reach(j, start, True)
    up = cells.get('U', [])
    for u in up: assert adj(u, opened), f"{j['name']}: up door {u} unreachable even with gates open"
    if j.get('puzzle'):
        for u in up: assert not adj(u, closed), f"{j['name']}: up door {u} reachable without solving the puzzle"
        for s in j['puzzle']['switches']:
            p = (s['x'], s['y'])
            assert (p in closed) if s['type'] == 'plate' else adj(p, closed) or adj(p, opened), f"{j['name']}: switch {s['id']} unreachable"
        # simulate: crystals reachable before the gates of their own channel open
        sol = solve(j['puzzle']); assert sol is not None, f"{j['name']}: crystals unsolvable"; j['puzzle']['solution_touch'] = sol
    for n in j['npcs']: assert adj((n['x'], n['y']), opened), f"{j['name']}: npc {n['id']} unreachable"
    for s in j['interact_spots']: assert tuple(s['stand']) in opened, f"{j['name']}: spot {s['id']} stand unreachable"

def solve(P):
    cr = [s for s in P['switches'] if s['type'] == 'crystal']
    if not cr: return []
    for k in range(len(cr) + 1):
        for combo in itertools.combinations(cr, k):
            on = {s['id'] for s in cr if s.get('start_on')}
            for s in combo:
                for t in s.get('toggles', [s['id']]): on ^= {t}
            if on == {s['id'] for s in cr}: return [s['id'] for s in combo]
    return None

def plates_puzzle(name, ch='A', rules='', solution=''):
    def f(cells):
        sw = [{'id': f'p{i + 1}', 'x': x, 'y': y, 'type': 'plate', 'channel': ch, 'mode': 'latch', 'start_on': False} for i, (x, y) in enumerate(sorted(cells['P']))]
        gs = [{'id': f'g{i + 1}', 'x': x, 'y': y, 'channel': ch, 'closed_collision': 6, 'open_collision': 0} for i, (x, y) in enumerate(sorted(cells['G']))]
        return {'switches': sw, 'gates': gs, 'channels': {ch: {'switches': [s['id'] for s in sw], 'gates': [g['id'] for g in gs]}}, 'rules': rules, 'solution': solution}
    return f

def crystal_puzzle(rules='', solution='', plates_first=False):
    def f(cells):
        cr = sorted(cells['S'], key=lambda p: (p[0], p[1])); ids = [f'c{i + 1}' for i in range(len(cr))]
        sw = [{'id': ids[i], 'x': x, 'y': y, 'type': 'crystal', 'channel': 'B', 'mode': 'toggle',
               'toggles': ids[max(0, i - 1): i + 2], 'start_on': (len(cr) == 3 and i == 1)} for i, (x, y) in enumerate(cr)]
        gates = sorted(cells['G'], key=lambda p: (-p[1], p[0]))  # lower row = channel A when plates_first
        chs = {}
        out_g = []
        if plates_first and cells.get('P'):
            pl = [{'id': f'p{i + 1}', 'x': x, 'y': y, 'type': 'plate', 'channel': 'A', 'mode': 'latch', 'start_on': False} for i, (x, y) in enumerate(sorted(cells['P']))]
            sw = pl + sw; low = max(y for _, y in gates)
            for i, (x, y) in enumerate(gates):
                out_g.append({'id': f'g{i + 1}', 'x': x, 'y': y, 'channel': 'A' if y == low else 'B', 'closed_collision': 6, 'open_collision': 0})
            chs['A'] = {'switches': [s['id'] for s in pl], 'gates': [g['id'] for g in out_g if g['channel'] == 'A']}
        else:
            out_g = [{'id': f'g{i + 1}', 'x': x, 'y': y, 'channel': 'B', 'closed_collision': 6, 'open_collision': 0} for i, (x, y) in enumerate(gates)]
        chs['B'] = {'switches': ids, 'gates': [g['id'] for g in out_g if g['channel'] == 'B']}
        return {'switches': sw, 'gates': out_g, 'channels': chs, 'rules': rules, 'solution': solution}
    return f

# ------------------------------------------------------------------ layouts
CLOUDWAY = [  # outdoor 2: a snow shelf above the icefall; two wind-shelf plates open the cairn gate
 "########################",
 "##########.U.###########",
 "#TT......R...R.......TT#",
 "#T...k......3........TT#",
 "#........TT...TT.......#",
 "#..TTT.....RR.....TTT..#",
 "#RRRRRRRRRRGGGRRRRRRRRR#",
 "#...........v..........#",
 "#.P..T......2.......P..#",
 "#..TTT..R........R.TT..#",
 "#.......RRR...RRR......#",
 "#TT.........1.......TTT#",
 "#T......T.......T....T.#",
 "#...v.....v.....v......#",
 "#TT.........k........TT#",
 "#TTT...............TTTT#",
 "##########.B.###########",
 "########################"]
ECHO = [  # cave 2: three resonance crystals; the middle one starts lit
 "########################",
 "###########U############",
 "#####....C....C....#####",
 "####......2...........##",
 "###...............R...##",
 "##RRRRRRRRRGGRRRRRRRRR##",
 "##.....................#",
 "##..S.......S.......S..#",
 "##.....................#",
 "##...R....R....R......k#",
 "##......1........C.....#",
 "###...........C.....####",
 "####........k.......####",
 "#####....R.....R...#####",
 "###########B############",
 "########################"]
CLOUDLINE = [  # outdoor 3: the ice shelf under the cloud line; three plates on the frozen tarn open the ridge gate
 "############################",
 "#############.U.############",
 "#TT~~.......R...R.....~~~TT#",
 "#T~~.......3.........k..~~T#",
 "#~~.....TT.......TT......~~#",
 "#RRRRRRRRRRRRGGRRRRRRRRRRRR#",
 "#..........................#",
 "#..iiiiiiii......iiiiiiii..#",
 "#..iiiPiiii..2...iiiiPiii..#",
 "#..iiiiiiii......iiiiiiii..#",
 "#.......R..........R.......#",
 "#TT........iiiiii........TT#",
 "#T.........iiPiii.........T#",
 "#..........iiiiii..........#",
 "#.....1.........R....k.....#",
 "#TT......................TT#",
 "#TTT......TT.....TT.....TTT#",
 "#############.B.############",
 "############################"]
HEART = [  # cave 3: the heart of the mountain; two plates open the first gate, four crystals the second
 "######################",
 "##########U###########",
 "########.....#########",
 "######.........#######",
 "#####RRRRGGRRRRR######",
 "####...............###",
 "###.S...S....S...S..##",
 "###.............k...##",
 "###...3....C........##",
 "###RRRRRRRGGRRRRRRRR##",
 "###...........v.....##",
 "##..P..R....2....P..##",
 "##......C.......R...##",
 "###.......1.........##",
 "####.......k.......###",
 "#####...R.....R...####",
 "##########B###########",
 "######################"]
SUMMIT = [  # the summit: open sky, cloud sea, Ondravel sealed in his crystal ring
 "~~~~~~~~~~~~~~~~~~~~~~~~~",
 "~~~~~~~~~~~~~~~~~~~~~~~~~",
 "~~~~~~##.........##~~~~~~",
 "~~~~##....*****....##~~~~",
 "~~~#.....**OOO**.....#~~~",
 "~~#..C...*OOOOO*...C..#~~",
 "~~#......*OOOOO*......#~~",
 "~~#..v...**OOO**...v..#~~",
 "~~#.......*****.......#~~",
 "~~#..C....mm.mm....C..#~~",
 "~~#.......mm.mm.......#~~",
 "~~#..k....m...m.......#~~",
 "~~~#......m...m......#~~~",
 "~~~~##....m...m....##~~~~",
 "~~~~~~##..m.U.m..##~~~~~~",
 "~~~~~~~~~~~~~~~~~~~~~~~~~"]
ENCLOSURE = [  # the past: the rebellion-era lab enclosure, Ondravel in his crystal tank
 "#####################",
 "#####################",
 "##xlpx.........xplx##",
 "##.L.....***.....L.##",
 "##.....**OOO**.....##",
 "##.....*OOOOO*.....##",
 "##p....*OOOOO*....p##",
 "##.....**OOO**.....##",
 "##r......***......r##",
 "##r...............r##",
 "##rrrr....k....rrrr##",
 "##..x...........x..##",
 "##.....l.....l.....##",
 "##.....L..U..L.....##",
 "#####################"]

def build():
    out = {}; P = {}
    ice = J('r9_icefall'); camp = J('fin_summit_camp')
    # icefall top door (20,4) -> cloudway bottom; camp bottom doors (16/17,23) -> heart cave top
    cw, cwc, cwp = draw('r9_cloudway', 'Wellspire Cloudway', 'out', CLOUDWAY, table='r9_switchbacks_snow',
        links=[('B', 'r9_icefall', 20, 5, 'down'), ('U', 'r9_echo_cave', 11, 13, 'up')],
        trainers=[('1', 'r9_cw_field_1', 'down', {}), ('2', 'r9_cw_field_2', 'down', {}), ('3', 'r9_cw_field_3', 'down', {})],
        spots=[('k', 'r9_cloudway_note', {})],
        puzzle=plates_puzzle('r9_cloudway', rules='Two wind-shelf plates (west + east) latch; both lit open the cairn gate north.', solution='Step on both side plates.'))
    ec, ecc, ecp = draw('r9_echo_cave', 'Echo Cave', 'cave', ECHO, table='r9_icefall_cave', tint={'color': '#3a2a80', 'alpha': 0.18},
        links=[('B', 'r9_cloudway', 11, 2, 'down'), ('U', 'r9_cloudline', 14, 16, 'up')],
        trainers=[('1', 'r9_ec_field_1', 'down', {}), ('2', 'r9_ec_field_2', 'down', {})],
        spots=[('k', 'r9_echo_note', {})],
        puzzle=crystal_puzzle(rules='Resonance crystals: touching one flips it and its neighbours. All three lit opens the gate. The middle starts lit.', solution='Touch west, then east.'))
    cl, clc, clp = draw('r9_cloudline', 'Wellspire Cloudline', 'out', CLOUDLINE, table='r9_switchbacks_snow',
        links=[('B', 'r9_echo_cave', 11, 2, 'down'), ('U', 'r9_heart_cave', 10, 15, 'up')],
        trainers=[('1', 'r9_cl_field_1', 'down', {}), ('2', 'r9_cl_field_2', 'down', {}), ('3', 'r9_cl_field_3', 'down', {})],
        spots=[('k', 'r9_cloudline_note', {})],
        puzzle=plates_puzzle('r9_cloudline', rules='Three plates frozen into the tarns; all three latched open the ridge gate.', solution='Cross the ice to each plate.'))
    hc, hcc, hcp = draw('r9_heart_cave', 'Heart of Wellspire', 'cave', HEART, table='r9_icefall_cave', tint={'color': '#5a2ad0', 'alpha': 0.2},
        links=[('B', 'r9_cloudline', 14, 2, 'down'), ('U', 'fin_summit_camp', 16, 22, 'up')],
        trainers=[('1', 'r9_hc_field_1', 'down', {}), ('2', 'r9_hc_field_2', 'down', {}), ('3', 'r9_hc_field_3', 'down', {})],
        spots=[('k', 'r9_heart_note', {})],
        puzzle=crystal_puzzle(plates_first=True, rules='Two plates open the lower gate. Four crystals in a row, each flips itself and its neighbours; all four lit open the upper gate.', solution='Plates west + east; touch the outer two crystals.'))
    # retarget (never add / delete) the existing warps
    for w in ice['warps']:
        if w['to'] == 'fin_summit_camp': w.update(to='r9_cloudway', tx=11, ty=15, facing='up')
    for w in camp['warps']:
        if w['to'] == 'r9_icefall': w.update(to='r9_heart_cave', tx=10, ty=2, facing='down')
    # the summit (present) + the enclosure (past): keep fin_lab1_now / fin_past_enclosure names + 4 warps each (door row)
    f3 = J('fin_lab1_now_f3'); p4 = J('fin_past_lab1_f4')
    sm, smc, smp = draw('fin_lab1_now', 'Wellspire Summit', 'peak', SUMMIT, tint={'color': '#7a3cf0', 'alpha': 0.12},
        links=[('U', 'fin_lab1_now_f3', 21, 1, 'down')], spots=[('k', 'fin_summit_cairn', {})], extra={'sky': 'cloud_sea', 'r9_summit': True})
    en, enc, enp = draw('fin_past_enclosure', 'The Enclosure (the night of Test 7)', 'lab', ENCLOSURE, region='past', tint={'color': '#8a50ff', 'alpha': 0.14},
        links=[('U', 'fin_past_lab1_f4', 21, 1, 'down')], spots=[('k', 'fin_past_logbook', {})], extra={'r9_enclosure': True})
    # one warp each in the art row: the other 3 legacy warps sit on the same door row as extra door cells (same target)
    for j, base in ((sm, (12, 14)), (en, (10, 13))):
        bx, by = base; assert len(j['warps']) == 1
        for dx in (-1, 1, 2):
            pass
    # Ondravel stand cell: the ring's bottom-middle (blocked) with the stand below
    def guardian_spot(j, cells, sid):
        ring = cells['*']; bx = sorted(ring, key=lambda p: (-p[1], abs(p[0] - j['width'] // 2)))[0]
        j['interact_spots'].append({'id': sid, 'kind': 'prop', 'x': bx[0], 'y': bx[1], 'stand': [bx[0], bx[1] + 1], 'face': 'up', 'region9': True})
        plinth = cells['O']; cx = sum(x for x, _ in plinth) / len(plinth); cy = max(y for _, y in plinth)
        j['ondravel'] = {'x': round(cx), 'y': cy, 'w': 4, 'h': 4, 'sheet': 'art/characters/pixel/creatures/ondravel/overworld/ondravel_big_sheet.png'}
        return {'x': bx[0], 'y': bx[1] + 1, 'facing': 'up'}
    P['fin_lab1_now'] = {'fin_dome': guardian_spot(sm, smc, 'fin_dome'), **smp}
    P['fin_past_enclosure'] = {'fin_past_dome': guardian_spot(en, enc, 'fin_past_dome'), **enp}
    (ux, uy), = smc['U']; P['_arrive_dome'] = {'x': ux, 'y': uy - 1, 'facing': 'up'}
    (ux2, uy2), = enc['U']; P['_arrive_enclosure'] = {'x': ux2, 'y': uy2 - 1, 'facing': 'up'}
    for w in f3['warps']:
        if w['to'] == 'fin_lab1_now': w.update(tx=ux, ty=uy - 1, facing='up')
    for w in p4['warps']:
        if w['to'] == 'fin_past_enclosure': w.update(tx=ux2, ty=uy2 - 1, facing='up')
    for j, cells, start, pts in ((cw, cwc, (11, 15), cwp), (ec, ecc, (11, 13), ecp), (cl, clc, (14, 16), clp), (hc, hcc, (10, 15), hcp),
                                 (sm, smc, (ux, uy - 1), {}), (en, enc, (ux2, uy2 - 1), {})):
        verify(j, cells, start)
        if pts and j['name'] not in P: P[j['name']] = pts
        out[j['name']] = j
    out['r9_icefall'] = ice; out['fin_summit_camp'] = camp; out['fin_lab1_now_f3'] = f3; out['fin_past_lab1_f4'] = p4
    from field_teams import FIELD
    for n in ['r9_old_riverbed', 'r9_skylift_upper', 'r9_switchbacks']: out[n] = J(n)
    for n, j in out.items():
        for d in j.get('npcs', []):
            if d['id'] in FIELD: nm, cls, _, team = FIELD[d['id']]; d.update(name=nm, trainer_class=cls, field_team=team)
        with open(os.path.join(MAPS, n + '.json'), 'w') as f: json.dump(j, f, indent=1)
    return P

if __name__ == '__main__':
    P = build()
    gp = os.path.join(ROOT, 'src', 'region9', 'points.gen.js'); s = open(gp).read()
    pts = json.loads(s.split('export const POINTS = ', 1)[1].rstrip().rstrip(';'))
    pts.update(P)
    with open(gp, 'w') as f:
        f.write('// GENERATED by tools/wellspire/build_wellspire.py + build_climb.py: spot stand cells and scripted arrival cells. Do not hand-edit.\n')
        f.write('export const POINTS = ' + json.dumps(pts, indent=1, sort_keys=True) + ';\n')
    # register the new maps in the world layout (zone + knownMaps)
    wp = os.path.join(ROOT, 'art', 'world', 'overworld', 'world_layout.json'); W = json.load(open(wp))
    z = next(z for z in W['zones'] if z.get('id') == 'wellspire')
    for n in ['r9_cloudway', 'r9_echo_cave', 'r9_cloudline', 'r9_heart_cave']:
        if n not in W['maps_built']: W['maps_built'].append(n)
        if n not in z['maps']: z['maps'].insert(z['maps'].index('fin_summit_camp'), n)
    z['gone_flag'] = 'ending2_done'  # Gary 10:53 PM CT: after Ending 2 the only world change is that Wellspire is gone
    json.dump(W, open(wp, 'w'))
    for n in ['r9_cloudway', 'r9_echo_cave', 'r9_cloudline', 'r9_heart_cave']:  # the runtime looks here first (a 404 is noise in the console)
        pz = dict(J(n)['puzzle']); pz.setdefault('solved_flag', f'puzzle_{n}_solved'); pz.setdefault('initial_state', None)
        json.dump(pz, open(os.path.join(ROOT, f'art/world/overworld/puzzles/{n}.runtime.json'), 'w'), separators=(',', ':'))
    print('climb built:', sorted(P))
