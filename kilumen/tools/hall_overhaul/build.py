"""Hall overhaul Phase 2: build the 8 hall interiors from the approved plans (shots/hall_overhaul_plan/plans.json).
python3 tools/hall_overhaul/build.py [--check]
Map cells = plan cells. Legend (plan.py): # wall . floor S door G dais front M Master i slide ^v<> push T/U plate (bit0/bit1)
a/b gate open when bit0 = 0/1, c/d gate open when bit1 = 0/1, 1-6 warp pairs, x invisible wall.
Collision: wall 1, door 4, plate 7, slide 10 (ice), gates 6 when closed / 0 when open (runtime: src/progression/hall_v2.js),
invisible wall 6 (a gate that never opens; floor art). Every map gets a `hall_v2` block the runtime + solver read.
Stand-in art (Character models request: data/charmodels_requests_hall_overhaul.md): push tiles = carpet runner + code-drawn
arrow, warp pads = violet rug + code-drawn ring, slide tiles outside Frostspire = ice."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
PLANS = os.path.join(ROOT, 'shots/hall_overhaul_plan/plans.json')
HALLS = {  # plan key -> (zone, hall map, town map, theme)
 'fernwick': ('fernwick', 'fernwick_hall_int', 'fernwick', dict(floor='floor_stone', arena='floor_arena')),
 'saltmere': ('saltmere', 'saltmere_hall_int', 'saltmere', dict(floor='floor_stone', arena='floor_arena', banner='i_banner_salt')),
 'revival_heights': ('revival_heights', 'revival_hall_int', 'revival_heights', dict(floor='floor_tile', arena='floor_arena', banner='i_banner_revival')),
 'frostspire': ('frostspire', 'frostspire_hall_int', 'frostspire', dict(floor='x_icehall_floor', arena='x_icehall_arena', top='x_icehall_iwall_top', face='x_icehall_iwall_face', upper='x_icehall_iwall_upper', ice='x_ice_0')),
 'mirefen': ('mirefen', 'mirefen_hall_int', 'mirefen', dict(floor='floor_wood', arena='floor_arena')),
 'tidewater': ('tidewater_coast', 'tidewater_hall_int', 'tidewater_coast', dict(floor='floor_stone', arena='floor_arena')),
 'lanternport': ('lanternport', 'lanternport_hall_int', 'lanternport', dict(floor='floor_stone', arena='floor_arena', banner='i_banner_lantern')),
 'cindervale': ('cindervale', 'cindervale_hall_int', 'cindervale', dict(floor='floor_tile', arena='floor_carpet', banner='i_banner_cinder')),
}
FACE = {'U': 'up', 'D': 'down', 'L': 'left', 'R': 'right'}
D = {'U': (0, -1), 'D': (0, 1), 'L': (-1, 0), 'R': (1, 0)}
PUSH = {'^': 'up', 'v': 'down', '<': 'left', '>': 'right'}

def tiles():
    ts = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))
    return {t['name']: t['id'] for t in ts['tiles'] + (ts['extra_tiles'] if isinstance(ts.get('extra_tiles'), list) else []) if isinstance(t, dict) and 'name' in t}

def roster(hall_map, old, n):
    """Map NPC ids for n trainers in plan order: the kept ids first (approved roster), new ids <map>_h<k> after."""
    if hall_map == 'fernwick_hall_int': ids = ['helper_1', 'helper_2', 'fernwick_hall_int_h3']
    else: ids = [f'{hall_map}_h{k}' for k in range(1, 13)]
    return ids[:n]

def build(key, plan, T, town_maps):
    zone, hm, town, th = HALLS[key]
    th = {'top': 'iwall_top', 'face': 'iwall_face_hall', 'upper': 'iwall_upper_hall', 'ice': 'xs_ice_0', **th}
    g = plan['grid']; H, W = len(g), len(g[0])
    old = json.load(open(os.path.join(MAPS, hm + '.json')))
    at = lambda x, y: g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    ground = [[0] * W for _ in range(H)]; deco = [[0] * W for _ in range(H)]; col = [[0] * W for _ in range(H)]
    wallish = lambda c: c == '#'
    for y in range(H):
        for x in range(W):
            c = at(x, y); t = T[th['floor']]; k = 0
            if c == '#':
                below = at(x, y + 1)
                t = T[th['face']] if not wallish(below) and y < H - 1 else T[th['upper']] if y + 2 < H and not wallish(at(x, y + 2)) and wallish(below) else T[th['top']]
                k = 1
            elif c == 'S': t, k = T['door_mat'], 4
            elif c in 'GM' or (y <= 3 and abs(x - plan['master'][0]) <= 1 and c == '.'): t = T[th['arena']]
            elif c == 'i': t, k = T[th['ice']], 10
            elif c in PUSH: t = T['i_floor_carpet_red_a']
            elif c in '123456': t = T['i_rug_violet_1_1']
            elif c == 'T': t, k = T['plate_hall_off'], 7
            elif c == 'U': t, k = T['i_plate_off'], 7
            elif c in 'ab': open_ = c == 'a'; t, k = (T['gate_hall_open'], 0) if open_ else (T['gate_hall_closed'], 6)
            elif c in 'cd': open_ = c == 'c'; t, k = (T['crystal_barrier_dim'], 0) if open_ else (T['crystal_barrier_lit'], 6)
            elif c == 'x': k = 6
            ground[y][x] = t; col[y][x] = k
    sx, sy = next((x, y) for y in range(H) for x in range(W) if g[y][x] == 'S')
    mx, my = plan['master']
    # trainers
    old_by = {n['id']: n for n in old['npcs']}
    ids = roster(hm, old, len(plan['trainers']))
    tpl = next((n for n in old['npcs'] if n.get('kind') == 'trainer_hooded'), {'kind': 'trainer_hooded'})  # a hall may have no trainers left (lanternport after r58)
    npcs = []
    m = next(n for n in old['npcs'] if n['kind'] == 'master')
    npcs.append({**{k: v for k, v in m.items() if k not in ('x', 'y', 'idle_facings')}, 'x': mx, 'y': my, 'facing': 'down', 'sight_range': 0,
                 'note': 'hall overhaul v1 (Oct 29 2026): on the dais; battles after 4 hall wins (all wins in halls of 4 or fewer)'})
    rays = set()
    for t, nid in zip(plan['trainers'], ids):
        dx, dy = D[t['facing']]; cells = [[t['at'][0] + dx * k, t['at'][1] + dy * k] for k in range(1, t['sight'] + 1)]
        rays |= {tuple(c) for c in cells}
        base = old_by.get(nid, tpl)
        npcs.append({'id': nid, 'x': t['at'][0], 'y': t['at'][1], 'facing': FACE[t['facing']], 'kind': base.get('kind', 'trainer_hooded'),
                     'sight_range': t['sight'], 'sight_rule': 'see OVERWORLD_README "Trainer line of sight"', 'sight_cells': cells,
                     'text_ref': f'overworld_lines.json maps.{hm}.{nid}', 'hall_seat': t['n'],
                     'note': f"hall overhaul v1 (Oct 29 2026): seat {t['n']}; sight {t['sight']} crosses the solution walk at step {t['first_path_step']}"
                     + ('' if nid in old_by else '; NEW trainer (Text Bot name + lines pending: data/textbot_requests_hall_overhaul.md)')})
    # attendant (the old guide) in the lobby, off every sight ray and off the door arrival cells
    gd = next((n for n in old['npcs'] if n['kind'] == 'villager_scholar'), None)
    if gd:
        occ = {(n['x'], n['y']) for n in npcs}
        cand = [(x, y) for y in range(H - 2, H - 5, -1) for x in range(W) if at(x, y) == '.' and (x, y) not in rays and (x, y) not in occ
                and not (x == sx and y in (sy - 1, sy - 2)) and abs(x - sx) >= 2]
        cand.sort(key=lambda c: (abs(c[0] - sx) != 2, abs(c[1] - (sy - 2)), c[0]))
        ax, ay = cand[0]
        npcs.append({**{k: v for k, v in gd.items() if k not in ('x', 'y', 'idle_facings')}, 'x': ax, 'y': ay, 'facing': 'left' if ax > sx else 'right',
                     'note': 'hall overhaul v1: hall attendant: progress line (system_halls.progress) + Master status'})
        col_check = col[ay][ax]; assert col_check == 0, (key, ax, ay)
    warps = [{'x': sx, 'y': sy, 'to': town, 'tx': None, 'ty': None, 'facing': 'down'}]
    # town warp(s) into this hall -> arrival cell above S; and our door back -> the town's door arrival
    tm = town_maps[town]
    back = None
    for w in tm['warps']:
        if w.get('to') == hm:
            w['tx'], w['ty'] = sx, sy - 1; w['facing'] = 'up'; back = back or w
    keep = [w for w in old['warps'] if w.get('to') == town]
    warps[0]['tx'], warps[0]['ty'] = (keep[0]['tx'], keep[0]['ty']) if keep else (back['x'], back['y'] + 1)
    pairs = {}
    for y in range(H):
        for x in range(W):
            if g[y][x] in '123456': pairs.setdefault(g[y][x], []).append([x, y])
    out = {'name': hm, 'title': old['title'].replace('DRAFT - ', ''), 'width': W, 'height': H, 'tile_size': 64, 'tileset': '../tileset.json', 'layers': None,
           'warps': warps, 'exits': [], 'npcs': npcs, 'signs': [], 'items': [], 'encounter_zones': [],
           'source': 'tools/hall_overhaul/build.py (hall overhaul v1, Oct 29 2026, from shots/hall_overhaul_plan/plans.json)',
           'movement': {'run': True, 'bike': False},
           'hall_v2': {'zone': zone, 'grid': g, 'need_wins': min(4, len(plan['trainers'])), 'door': [sx, sy], 'arrival': [sx, sy - 1], 'master': [mx, my],
                       'dais_front': next([x, y] for y in range(H) for x in range(W) if g[y][x] == 'G'), 'warps': pairs,
                       'push': {f'{x},{y}': PUSH[g[y][x]] for y in range(H) for x in range(W) if g[y][x] in PUSH},
                       'tiles': {'plate0': ['plate_hall_off', 'plate_hall_on'], 'plate1': ['i_plate_off', 'i_plate_on'],
                                 'gate0': ['gate_hall_closed', 'gate_hall_open'], 'gate1': ['crystal_barrier_lit', 'crystal_barrier_dim']},
                       'stand_in_art': ['push = i_floor_carpet_red_a + drawn arrow', 'warp = i_rug_violet_1_1 + drawn ring'] + ([] if key == 'frostspire' else ['slide = xs_ice_0'] if 'i' in ''.join(g) else []),
                       'solution_moves': plan.get('moves'), 'markers': plan.get('markers', {}), 'anim': anim_block(key, plan, g, W, H)},
           '_layers': {'ground': ground, 'decoration': deco, 'overlay': [[0] * W for _ in range(H)], 'collision': col, 'encounter': [[0] * W for _ in range(H)]}}
    out['layers'] = out.pop('_layers')
    for k in ('music', 'ambient', 'tint_note'):
        if k in old: out[k] = old[k]
    # banners on the wall face beside the dais (decoration over the face tile, only where the tile exists)
    bn = th.get('banner', 'banner')
    if bn in T:
        for bx in (mx - 2, mx + 2):
            if 0 < bx < W - 1 and at(bx, my - 1) == '#' and at(bx, my) != '#': deco[my - 1][bx] = T[bn]
    return out

ARROW = {'^': 'up', 'v': 'down', '<': 'left', '>': 'right'}
def anim_block(key, plan, g, W, H):
    """Animated-tile markers (Animator kit, DRAFT, behind the hallanim flag; src/progression/hall_anim.js applies them at map
    entry). cells = [x, y, tile name, layer]; gate0 = tiles the bit0 gates swap between; slab / sluice = explicit marker cells."""
    at = lambda x, y: g[y][x] if 0 <= x < W and 0 <= y < H else '#'
    cells, out = [], {}
    mk = plan.get('markers', {})
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if key == 'cindervale' and c in ARROW: cells.append([x, y, f'ha_cindervale_lava_conveyor_{ARROW[c]}', 'ground'])
            if key == 'mirefen' and c in ARROW: cells.append([x, y, f'ha_mirefen_current_{ARROW[c]}', 'ground'])
            if key == 'tidewater' and c == 'i': cells.append([x, y, 'ha_tidewater_rip_tide', 'ground'])
            if key == 'frostspire' and c == 'i':
                cells.append([x, y, 'ha_frostspire_ice_sparkle', 'ground'])
                if x % 3 == 0 and y % 2 == 0:  # sparse gust streaks along the longest ice run through the cell
                    run = {d: next(k for k in range(1, 30) if at(x + dx * k, y + dy * k) != 'i') for d, (dx, dy) in (('right', (1, 0)), ('left', (-1, 0)), ('down', (0, 1)), ('up', (0, -1)))}
                    cells.append([x, y, f'ha_frostspire_gust_{max(run, key=run.get)}', 'decoration'])
            if key == 'lanternport' and c in '123456': cells.append([x, y, 'ha_lanternport_warp_pad', 'ground'])
            if key == 'lanternport' and c == 'x' and (x + y) % 3 == 0: cells.append([x, y, 'ha_lanternport_ghost_shimmer', 'decoration'])
            if key == 'mirefen' and c == '.' and y >= H - 4 and x in (1, W - 2): cells.append([x, y, 'ha_mirefen_reeds', 'overlay'])
    if key == 'revival_heights':
        mx, my = plan['master']
        for bx in (mx - 2, mx + 2):
            if at(bx, my) == '.': cells.append([bx, my, 'ha_revival_heights_prism', 'overlay'])
        out['gate0'] = {'closed': 'ha_revival_heights_light_gate_closed', 'open': 'ha_revival_heights_light_gate_open', 'layer': 'decoration'}
    if key == 'saltmere':
        out['sluice'] = mk['sluice']; out['gate0'] = {'closed': 'ha_saltmere_sluice_water', 'open': None, 'layer': 'ground'}
    if key == 'fernwick':
        out['slab'] = mk['slab']; out['slab_tile'] = 'ha_fernwick_sinking_slab'; out['slab_ms'] = 8 * 110
        cells += [[x, y, 'ha_fernwick_sinking_slab', 'ground'] for x, y in mk['slab']]
    out['cells'] = cells
    return out

def _owned(m):
    hv = m.get('hall_v2') or {}
    return (m['width'], m['height'], hv.get('grid'), hv.get('need_wins'), hv.get('door'), hv.get('arrival'),
            sorted((n['id'], n['x'], n['y']) for n in m['npcs']), sorted((w['x'], w['y'], w['to']) for w in m['warps']))

def main(check=False):
    T = tiles(); P = json.load(open(PLANS)); towns = {}
    for key, (zone, hm, town, th) in HALLS.items():
        towns.setdefault(town, json.load(open(os.path.join(MAPS, town + '.json'))))
    # A hall whose map is now generated by another tool (e.g. lanternport_hall_int -> tools/hall_overhaul/lighthouse.py) is not ours to rebuild/check.
    owned = {k for k, (zone, hm, town, th) in HALLS.items()
             if json.load(open(os.path.join(MAPS, hm + '.json'))).get('source', '').startswith('tools/hall_overhaul/build.py')}
    for k in HALLS:
        if k not in owned: print(f'skip {HALLS[k][1]}: generated by another tool')
    built = {k: build(k, P[k], T, towns) for k in HALLS if k in owned}
    dirty = []; drift = []
    for k, m in built.items():
        p = os.path.join(MAPS, m['name'] + '.json'); s = json.dumps(m, separators=(',', ':'))
        # --check compares only what this builder owns (layout, door, gate grid, seats). Later passes legitimately add to the
        # same maps (solver_path from the hall walkthrough tool, hall art / anim cells, edge-fill tiles, trainer re-kinds), so a
        # byte compare would always fail and a rebuild would wipe that work.
        if check:
            live = _owned(json.loads(open(p).read())); want = _owned(m)
            if live[:2] != want[:2] or live[4:6] != want[4:6] or live[7] != want[7]: dirty.append(p)  # size, door, arrival, warps
            elif live != want: drift.append(m['name'])  # grid/seat tweaks made on the live map after the build (plans.json predates them)
        elif open(p).read().strip() != s: dirty.append(p)
        if not check: open(p, 'w').write(s + '\n')
    for t, m in towns.items():
        p = os.path.join(MAPS, t + '.json'); cur = open(p).read(); s = json.dumps(m, separators=(',', ':'))
        if json.loads(cur) != m and not check: dirty.append(p)
        if check and [(w['x'], w['y'], w.get('tx'), w.get('ty')) for w in json.loads(cur)['warps'] if str(w.get('to', '')).endswith('_hall_int')] != [(w['x'], w['y'], w.get('tx'), w.get('ty')) for w in m['warps'] if str(w.get('to', '')).endswith('_hall_int')]: dirty.append(p)
        if not check and json.loads(cur) != m:
            ind = len(cur.split('\n')[1]) - len(cur.split('\n')[1].lstrip()) if '\n' in cur.strip() else None
            open(p, 'w').write((json.dumps(m, indent=ind) if ind else s) + '\n')
    for k, m in built.items(): print(f"{m['name']:22s} {m['width']}x{m['height']} trainers={len(m['npcs']) - 2} need={m['hall_v2']['need_wins']} door={m['hall_v2']['door']}")
    if check and drift: print('note: hand-tuned since build (not rebuilt; a plain run would revert these):', ', '.join(drift))
    if check and dirty: print('OUT OF DATE:', dirty); sys.exit(1)

if __name__ == '__main__': main('--check' in sys.argv)
