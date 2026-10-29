#!/usr/bin/env python3
"""Lanternport lighthouse (Gary, Oct 29 2026): hall 7 IS the lighthouse. Splits the v1 hall (lanternport_hall_int, read from
git HEAD~0 copy saved as tools/hall_overhaul/lanternport_hall_v1.json on first run) into 4 floor maps joined by stairs:
  1F lanternport_lighthouse_int (town door + attendant, invisible-wall maze, 2 trainers)
  2F lanternport_lighthouse_f2  (warp pads; the plate that opens the stair gate sits in the room only a pad reaches, 2 trainers)
  3F lanternport_lighthouse_f3  (maze to the plate that opens the stair gate, 2 trainers)
  4F lanternport_hall_int       (the lamp room: Master + dais; keeps the old map name so Master records / coins / saves hold)
6 trainers kept (h1 h2 h7 h8 h9 h10), 4 dropped (h3 h4 h5 h6). Wins count across floors (hall_v2.members). Idempotent."""
import json, os, copy, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAPS = f'{R}/art/world/overworld/maps'
V1 = f'{R}/tools/hall_overhaul/lanternport_hall_v1.json'
if not os.path.exists(V1):
    json.dump(json.load(open(f'{MAPS}/lanternport_hall_int.json')), open(V1, 'w'))
src = json.load(open(V1)); H = src['hall_v2']; W = src['width']
KEEP = {1: 'lanternport_lighthouse_int', 2: 'lanternport_lighthouse_f2', 3: 'lanternport_lighthouse_f3', 4: 'lanternport_hall_int'}
DROP = ['lanternport_hall_int_h3', 'lanternport_hall_int_h4', 'lanternport_hall_int_h5', 'lanternport_hall_int_h6']
UP, DOWN = 7322, 7323  # i_stairs_up_stone / i_stairs_down_stone (door code 4)
TITLE = {1: 'Lanternport Lighthouse 1F', 2: 'Lanternport Lighthouse 2F', 3: 'Lanternport Lighthouse 3F', 4: 'Lanternport Lighthouse Lamp Room'}
# floor -> (row0, row1 inclusive) of the v1 grid, grid edits {(x,y_local): ch}, trainers {id: (x,y_local,facing,range)}
F = {
  1: dict(rows=(16, 26), edit={(17, 0): 'G'}, tr={'lanternport_hall_int_h1': (1, 3, 'down', 4), 'lanternport_hall_int_h2': (5, 5, 'left', 3)}, guide=True),
  2: dict(rows=(10, 16), edit={(21, 0): 'G', (21, 1): 'b', (21, 3): '.', (2, 2): 'T', (17, 6): 'S'},
          tr={'lanternport_hall_int_h7': (20, 3, 'up', 2), 'lanternport_hall_int_h8': (6, 1, 'down', 2)}),
  3: dict(rows=(4, 10), edit={(21, 0): 'G', (21, 1): 'b', (21, 6): 'S'},
          tr={'lanternport_hall_int_h9': None, 'lanternport_hall_int_h10': (3, 3, 'down', 1)}),
  4: dict(rows=(0, 4), edit={(21, 4): 'S'}, tr={}),
}
F3_H9 = tuple(json.loads(sys.argv[1])) if len(sys.argv) > 1 else (21, 2, 'down', 1)
F[3]['tr']['lanternport_hall_int_h9'] = F3_H9
D = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}

def build(f):
    c = F[f]; r0, r1 = c['rows']; n = r1 - r0 + 1
    g = [list(r) for r in build.grids[f]]
    for y in range(n):
        for x in range(W):
            if g[y][x] in 'ab' and (x, y) not in c['edit']: g[y][x] = '#'
    if f == 4: g[1][11] = 'M'; g[2][11] = 'G'
    m = copy.deepcopy(src); m['name'] = KEEP[f]; m['title'] = TITLE[f]; m['height'] = n
    m['source'] = 'tools/hall_overhaul/lighthouse.py (Lanternport lighthouse, Gary Oct 29 2026)'
    for k, L in m['layers'].items(): m['layers'][k] = [list(row) for row in L[r0:r1 + 1]]
    L = m['layers']; floor = L['ground'][1][9] if f != 4 else L['ground'][3][9]
    for (x, y), ch in c['edit'].items():
        if ch == 'G': L['ground'][y][x] = UP; L['collision'][y][x] = 4; L['decoration'][y][x] = 0
        elif ch == 'S': L['ground'][y][x] = DOWN; L['collision'][y][x] = 4; L['decoration'][y][x] = 0
        elif ch in '.T': L['ground'][y][x] = floor if ch == '.' else L['ground'][y][x]; L['collision'][y][x] = 0
        elif ch == 'b': L['collision'][y][x] = 0  # hall_v2 sets 6 while closed at attach; static 0 so world-reach sees the stairs
    # stale gate cells that became wall (v1 'a'/'b' on the cut rows): wall tile from the neighbour
    for y in range(n):
        for x in range(W):
            if g[y][x] == '#' and L['collision'][y][x] == 0: L['collision'][y][x] = 1; L['ground'][y][x] = L['ground'][y][x - 1 if x else x + 1]
    grid = [''.join(r) for r in g]
    names = list(KEEP.values()); kept = [f'{KEEP[k]}.{i}' for k in (1, 2, 3) for i in F[k]['tr']]
    up = {1: 2, 2: 3, 3: 4}.get(f); dn = {2: 1, 3: 2, 4: 3}.get(f)
    G = next(((x, y) for y, r in enumerate(grid) for x, ch in enumerate(r) if ch == 'G' and f != 4), None)
    S = next((x, y) for y, r in enumerate(grid) for x, ch in enumerate(r) if ch == 'S')
    warps = []
    if f == 1: warps.append({'x': 11, 'y': n - 1, 'to': 'lanternport', 'tx': 22, 'ty': 31, 'facing': 'down',
                             'note': 'regions-5-8 merge: becomes the lighthouse door, lanternport (32,15) -> exit tx 32 ty 16'})
    if up: ux, uy = next((x, y) for y, r in enumerate(build.grids[up]) for x, ch in enumerate(r) if ch == 'S'); warps.append({'x': G[0], 'y': G[1], 'to': KEEP[up], 'tx': ux, 'ty': uy - 1, 'facing': 'up', 'kind': 'stairs_up'})
    if dn:
        gx, gy = next((x, y) for y, r in enumerate(build.grids[dn]) for x, ch in enumerate(r) if ch == 'G')
        lx = gx - 1 if build.grids[dn][gy + 1][gx] in 'ab' else gx  # never land on a gate cell
        warps.append({'x': S[0], 'y': S[1], 'to': KEEP[dn], 'tx': lx, 'ty': gy + 1, 'facing': 'down', 'kind': 'stairs_down'})
    m['warps'] = warps
    npcs = []
    for nn in src['npcs']:
        if nn['kind'] == 'master' and f == 4: npcs.append(dict(nn, x=11, y=1))
        if nn['kind'] == 'villager_scholar' and c.get('guide'): npcs.append(dict(nn, y=nn['y'] - r0, text_ref=nn['text_ref'].replace('lanternport_hall_int.', KEEP[f] + '.')))
        if nn['id'] in c['tr']:
            x, y, fa, rg = c['tr'][nn['id']]; cells = []; dx, dy = D[fa]
            occ = {(v[0], v[1]) for v in c['tr'].values() if v}
            for k in range(1, rg + 1):
                cx, cy = x + dx * k, y + dy * k
                if not (0 <= cy < n and 0 <= cx < W) or grid[cy][cx] in '#xM' or (cx, cy) in occ: break
                cells.append([cx, cy])
            npcs.append(dict(nn, x=x, y=y, facing=fa, sight_range=rg, sight_cells=cells,
                             text_ref=nn['text_ref'].replace('lanternport_hall_int.', KEEP[f] + '.'),
                             note=f'Lanternport lighthouse {f}F (Gary Oct 29 2026): seat moved from the v1 hall'))
    m['npcs'] = npcs
    h = copy.deepcopy(H)
    h.update(grid=grid, floor=f, floors=names, members=kept, master_ref='lanternport_hall_int.lanternport_hall_int_master',
             door=list(S), arrival=[S[0], S[1] - 1], need_wins=4, hall_art=H.get('hall_art'))
    for k in ('master', 'dais_front', 'stairs_up'): h.pop(k, None)
    if f == 4: h['master'] = [11, 1]; h['dais_front'] = [11, 2]
    else: h['stairs_up'] = list(G)
    h['warps'] = {k: [[x, y - r0] for x, y in v] for k, v in H['warps'].items() if all(r0 <= y <= r1 for _, y in v)}
    h['anim'] = {**H.get('anim', {}), 'cells': [[x, y - r0, *rest] for x, y, *rest in H.get('anim', {}).get('cells', []) if r0 <= y <= r1]}
    h['solution_moves'] = ''
    m['hall_v2'] = h
    return m

build.grids = {}
for f in (1, 2, 3, 4):
    c = F[f]; r0, r1 = c['rows']; n = r1 - r0 + 1
    g = [list(H['grid'][y]) for y in range(r0, r1 + 1)]
    for (x, y), ch in c['edit'].items(): g[y][x] = ch
    if f == 1: g[n - 1][11] = 'S'
    build.grids[f] = [''.join(r) for r in g]
for f in (1, 2, 3, 4):
    m = build(f); json.dump(m, open(f'{MAPS}/{KEEP[f]}.json', 'w'), separators=(',', ':'))
    print(KEEP[f]); [print(' ', r) for r in m['hall_v2']['grid']]
# town door: the v1 hall door now opens the lighthouse 1F
t = json.load(open(f'{MAPS}/lanternport.json'))
for w in t['warps']:
    if w['to'] in ('lanternport_hall_int', 'lanternport_lighthouse_int') and w['x'] == 22 and w['y'] == 30:
        w.update(to='lanternport_lighthouse_int', tx=11, ty=F[1]['rows'][1] - F[1]['rows'][0] - 1, facing='up',
                 note='Lanternport lighthouse (Gary Oct 29 2026). regions-5-8 merge: move this warp to the lighthouse door (32,15) (collision 4, facing up) and point the 1F exit at lanternport (32,16)')
json.dump(t, open(f'{MAPS}/lanternport.json', 'w'), separators=(',', ':'))

# ---- data: masters.json floor maps + dropped trainers, Text Bot lines + sprite map copied to each trainer's floor --------
import subprocess
def dump(p, o):  # same layout as hall_art_kit.py dump (keeps the file's indent)
    raw = open(p).read(); ind = 2 if raw.startswith('{\n  "') else (1 if raw.startswith('{\n') else None)
    open(p, 'w').write(json.dumps(o, indent=ind, ensure_ascii=False, separators=None if ind else (',', ':')) + ('\n' if raw.endswith('\n') else ''))
mp = f'{R}/data/masters.json'; M = json.load(open(mp))
for h in M['halls']:
    if h['zone'] != 'lanternport': continue
    h['floor_maps'] = [KEEP[1], KEEP[2], KEEP[3]]
    h['hall_overhaul'].update(trainers=6, need_wins=4, cut=[d.replace('lanternport_hall_int_', '') for d in DROP],
                              lighthouse='Gary Oct 29 2026: 4 floors (1F-3F 2 trainers each, 4F lamp room + Master); hall_map = the lamp room')
    for i, t in enumerate(h['trainers']):
        if f'lanternport_hall_int_h{i + 1}' in DROP: t['dropped'] = 'lighthouse redesign (Gary Oct 29 2026): not placed'
        else: t.pop('dropped', None)
dump(mp, M)
where = {i: KEEP[f] for f in (1, 2, 3) for i in F[f]['tr']}; where['lanternport_hall_int_guide'] = KEEP[1]
for p, sub in ((f'{R}/text/overworld_lines.json', 'maps'), (f'{R}/art/characters/pixel/npcs/npc_sprite_map.json', 'map')):
    o = json.load(open(p)); d = o[sub]
    for i, mn in where.items():
        if sub == 'maps':
            e = d.get('lanternport_hall_int', {}).get(i)
            if e is not None: d.setdefault(mn, {})[i] = copy.deepcopy(e)
        else:
            e = d.get(f'lanternport_hall_int.{i}')
            if e is not None: d[f'{mn}.{i}'] = copy.deepcopy(e)
    dump(p, o)
subprocess.run(['node', f'{R}/tools/hall_overhaul/lighthouse_solve.mjs', *[f'{MAPS}/{KEEP[f]}.json' for f in (1, 2, 3, 4)]], check=True)
