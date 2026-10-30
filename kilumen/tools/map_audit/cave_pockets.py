#!/usr/bin/env python3
"""Pass 2 cave pockets (Gary via Coder, Oct 30 2026): carve sealed pockets into big empty blocks and link them with small
cave interiors. Spec: data/pass2_caves.json. Each pocket: main-path cave mouth -> cave (2 exits) -> sealed pocket door;
pocket = trainer + Easter-egg inspectable + hidden strong item, one-way ledge back down to the main path (exit only).
Maps are rebuilt from BASE (the commit before pass 2) so a re-run is clean.
Writes: the overworld maps, art/world/overworld/maps/<cave>.json, world_layout maps_built/zone maps,
data/pass2_caves_fallback.json (DRAFT lines for Text Bot) and src/battle/data/cave_pocket_teams.js.
Usage: python3 tools/map_audit/cave_pockets.py [map ...]"""
import json, os, subprocess, sys, random
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
BASE = '38dd5c7f'
SPEC = json.load(open(os.path.join(ROOT, 'data', 'pass2_caves.json')))
MOUTH = [[794, 795, 796], [797, 798, 799]]  # cave_entrance 3x2; 798 = door (collision 4)
LEDGE = (517, 519, 521)                      # ledge_l / ledge_m / ledge_r (collision 2, south drop)

def base_map(name):
    rel = f'kilumen/art/world/overworld/maps/{name}.json'
    return json.loads(subprocess.check_output(['git', 'show', f'{BASE}:{rel}'], cwd=ROOT))

def put(j, x, y, g=None, d=0, o=0, c=0):
    L = j['layers']
    if g is not None: L['ground'][y][x] = g
    L['decoration'][y][x] = d; L['overlay'][y][x] = o; L['collision'][y][x] = c
    if 'encounter' in L: L['encounter'][y][x] = 0

def floor_tile(j, at):
    return j['layers']['ground'][at[1]][at[0]]

def mouth(j, x, y):  # door cell (x, y) = bottom middle of the 3x2 entrance
    for r in range(2):
        for k in range(3):
            put(j, x - 1 + k, y - 1 + r, None, MOUTH[r][k], 0, 4 if (r, k) == (1, 1) else 1)

def cave_map(p):
    W, H = 14, 11; cid = p['cave']; rnd = random.Random(cid)
    g = [[537] * W for _ in range(H)]; col = [[1] * W for _ in range(H)]; deco = [[0] * W for _ in range(H)]
    for x in range(3, 11): g[2][x] = 536
    for y in range(2, 8): g[y][2], g[y][11] = 538, 539
    for y in range(3, 8):
        for x in range(3, 11): g[y][x] = rnd.choice((29, 30, 31, 32)); col[y][x] = 0
    for y in range(8, 11):
        g[y][5], g[y][8] = 538, 539
        for x in (6, 7): g[y][x] = rnd.choice((29, 30, 31, 32)); col[y][x] = 0
    g[2][7] = 544; col[2][7] = 4                        # side exit up into the pocket (cave_stairs)
    col[10][6] = col[10][7] = 4                         # normal exit down onto the main path
    for (x, y) in p.get('cave_rocks', [[4, 4], [9, 6], [3, 7]]): deco[y][x] = 509; col[y][x] = 1
    m, mx, my = p['map'], p['mouth'][0], p['mouth'][1]; px, py = p['pocket_door']
    return {'name': cid, 'title': p['cave_title'], 'width': W, 'height': H, 'tile_size': 16, 'tileset': '../tileset.json',
            'layers': {'ground': g, 'decoration': deco, 'overlay': [[0] * W for _ in range(H)], 'collision': col, 'encounter': [[0] * W for _ in range(H)]},
            'warps': [{'x': 6, 'y': 10, 'to': m, 'tx': mx, 'ty': my + 1, 'facing': 'down'}, {'x': 7, 'y': 10, 'to': m, 'tx': mx, 'ty': my + 1, 'facing': 'down'},
                      {'x': 7, 'y': 2, 'to': m, 'tx': px, 'ty': py + 1, 'facing': 'down', 'pocket': p['id']}],
            'exits': [], 'npcs': [], 'signs': [], 'items': [], 'encounter_zones': [], 'interact_spots': [],
            'source': 'tools/map_audit/cave_pockets.py (Coder, Pass 2, Oct 30 2026; layout after tidewater_cave_int)',
            'movement': {'run': True, 'bike': False}, 'interior_role': 'pocket_cave', 'entered_from': {'map': m, 'x': mx, 'y': my},
            'pocket': {'id': p['id'], 'main_exit': [6, 10], 'pocket_exit': [7, 2]}}

def apply(name, pockets, fb, teams):
    j = base_map(name)
    for p in pockets:
        rnd = random.Random(p['id']); tiles = p.get('floor_tiles') or [floor_tile(j, p['floor_tile_at'])]
        ft = lambda: rnd.choice(tiles)
        for (x0, y0, x1, y1) in p['floor']:
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1): put(j, x, y, ft())
        for (x, y) in p.get('walk', []): put(j, x, y, ft())  # landing strip below the ledge, joined to the main path
        lx0, lx1, ly = p['ledge']
        for x in range(lx0, lx1 + 1): put(j, x, ly, ft(), LEDGE[0] if x == lx0 else LEDGE[2] if x == lx1 else LEDGE[1], 0, 2)
        px, py = p['pocket_door']; mouth(j, px, py)
        ex = p.get('existing_cave')  # the 'cave' is an existing cave map: a crack there drops into this pocket (no new cave map)
        if ex:
            j['warps'].append({'x': px, 'y': py, 'to': p['cave'], 'tx': ex['land'][0], 'ty': ex['land'][1], 'facing': 'down', 'reached_via': p['cave'], 'pocket': p['id']})
        else:
            mx, my = p['mouth']; mouth(j, mx, my)
            j['warps'] += [{'x': mx, 'y': my, 'to': p['cave'], 'tx': 6, 'ty': 9, 'facing': 'up', 'pocket': p['id']},
                           {'x': px, 'y': py, 'to': p['cave'], 'tx': 7, 'ty': 3, 'facing': 'up', 'reached_via': p['cave'], 'pocket': p['id']}]
        for (x, y) in p.get('map_rocks', []): put(j, x, y, None, p.get('rock_tile', 509), 0, 1)  # R1: break up big empty squares
        for e in p.get('map_cells', []):  # small extra edits, e.g. a push boulder (887, code 5) as a field-skill shortcut
            put(j, e['x'], e['y'], e.get('g'), e.get('d', 0), 0, e.get('c', 0))
        for w in p.get('map_warps', []):  # plain door to another outdoor map (R3 needs 2+ exits to non-cave maps)
            put(j, w['x'], w['y'], None, w.get('tile', 544), 0, 4); j['warps'].append({k: v for k, v in w.items() if k != 'tile'})
        for it in p.get('map_items', []):  # rewards for dead ends on the main map
            j['items'].append({'id': it['id'], 'x': it['x'], 'y': it['y'], 'hidden': it.get('hidden', True), 'item': it['item'], 'flag': f'item_{name}_{it["id"]}'})
        t = p['trainer']; tid = t['id']; sight = []
        for k in range(1, 4):
            yy = t['y'] + k
            if j['layers']['collision'][yy][t['x']] == 0: sight.append([t['x'], yy])
            else: break
        team = [{'species': s, 'level': t['level']} for s in t['species']]
        j['npcs'].append({'id': tid, 'x': t['x'], 'y': t['y'], 'facing': 'down', 'kind': 'trainer_hooded', 'gd_class': t['class'].lower(),
                          'team': team, 'sight': len(sight), 'prize': t['level'] * 32, 'text_ref': f'overworld_lines.json maps.{name}.{tid}',
                          'sight_range': len(sight), 'sight_cells': sight, 'pocket': p['id']})
        teams[f'{name}.{tid}'] = team
        e = p['egg']
        j.setdefault('interact_spots', []).append({'id': e['id'], 'x': e['x'], 'y': e['y'], 'what': e['what'], 'easter_egg': True, 'pocket': p['id'],
                                                   'text_ref': f'overworld_lines.json maps.{name}.{e["id"]}'})
        put(j, e['x'], e['y'], None, e.get('tile', 0), 0, 1)
        it = p['item']
        j['items'].append({'id': it['id'], 'x': it['x'], 'y': it['y'], 'hidden': True, 'item': it['item'], 'flag': f'item_{name}_{it["id"]}', 'pocket': p['id']})
        D = fb['maps'].setdefault(name, {})
        D[tid] = {'pages': t['intro'], 'battle_lost': t['lost'], 'after': t['after'], 'trainer_class': t['class'], 'name': t['name'], 'status': 'DRAFT (Coder placeholder, Text Bot to finish)'}
        D[e['id']] = {'pages': e['lines'], 'status': 'DRAFT (Coder placeholder, Text Bot to finish)'}
        if not p.get('existing_cave'): fb['maps'].setdefault(p['cave'], {})['area_name'] = {'pages': [p['cave_title']], 'status': 'DRAFT'}
        if not p.get('existing_cave'): json.dump(cave_map(p), open(os.path.join(MAPS, p['cave'] + '.json'), 'w'), indent=1)
    for p in SPEC['pockets']:  # cracks in this map that open into another map's pocket
        ex = p.get('existing_cave')
        if ex and p['cave'] == name:
            x, y = ex['crack']; put(j, x, y, ex.get('crack_tile', 544), 0, 0, 4)
            j['warps'].append({'x': x, 'y': y, 'to': p['map'], 'tx': p['pocket_door'][0], 'ty': p['pocket_door'][1] + 1, 'facing': 'down', 'pocket': p['id']})
    json.dump(j, open(os.path.join(MAPS, name + '.json'), 'w'), indent=1)

def main():
    want = set(sys.argv[1:])
    fb = {'_note': 'Pass 2 cave pockets: DRAFT placeholder lines (Coder). Text Bot / Story Bot own the final text; filled in only where overworld_lines.json has no entry.', 'maps': {}}
    teams = {}; by = {}
    for p in SPEC['pockets']: by.setdefault(p['map'], []).append(p)
    for name, ps in by.items():
        if not want or name in want: apply(name, ps, fb, teams)
        else:  # keep other maps' fallback/teams entries
            for p in ps:
                t, e = p['trainer'], p['egg']; teams[f'{name}.{t["id"]}'] = [{'species': s, 'level': t['level']} for s in t['species']]
                D = fb['maps'].setdefault(name, {})
                D[t['id']] = {'pages': t['intro'], 'battle_lost': t['lost'], 'after': t['after'], 'trainer_class': t['class'], 'name': t['name'], 'status': 'DRAFT (Coder placeholder, Text Bot to finish)'}
                D[e['id']] = {'pages': e['lines'], 'status': 'DRAFT (Coder placeholder, Text Bot to finish)'}
                if not p.get('existing_cave'): fb['maps'].setdefault(p['cave'], {})['area_name'] = {'pages': [p['cave_title']], 'status': 'DRAFT'}
    json.dump(fb, open(os.path.join(ROOT, 'data', 'pass2_caves_fallback.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(ROOT, 'src', 'battle', 'data', 'cave_pocket_teams.js'), 'w') as f:
        f.write('// Pass 2 cave-pocket trainers (generated by tools/map_audit/cave_pockets.py from data/pass2_caves.json). Pure data.\n')
        f.write('export const CAVE_POCKET_TEAMS = ' + json.dumps(teams, indent=1) + ';\n')
    lay_p = os.path.join(ROOT, 'art', 'world', 'overworld', 'world_layout.json'); lay = json.load(open(lay_p))
    for p in SPEC['pockets']:
        if p['cave'] not in lay['maps_built']: lay['maps_built'].append(p['cave'])
        for z in lay['zones']:
            if p['map'] in z.get('maps', []) and p['cave'] not in z['maps']: z['maps'].append(p['cave'])
    json.dump(lay, open(lay_p, 'w'), ensure_ascii=False)

if __name__ == '__main__': main()
