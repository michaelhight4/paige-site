#!/usr/bin/env python3
"""Aurelith Arena playtest pass (Oct 30 2026; Gary delegated the design calls). Idempotent post-process of the built maps
(build_aurelith_arena.py output has since been hand-tuned, so this edits the committed JSON instead of re-running it).
python3 tools/city/arena_playtest_patch.py
- aurelith_arena (lobby): coin check at the stairs, gate_aurelith_lobby (flag all_badges) on (8,3)/(9,3), the same
  crystal barrier and blockers.gate_aurelith_arena lines as the stadium doors (Dev Travel can land past those).
- rooms 1-7: gate_arena_room_N is resettable (re-closes when a lost / abandoned run clears arena_room_N_won), and the
  map gets fly_point = the entrance mat cell so Dev Travel lands at the entrance, not by the stairs.
- room 3 (wind): pressure plates. Two latch plates by the entrance corners open three hall gates around the fighter
  (existing puzzle runtime, src/systems/puzzles.js; solved once = stays solved).
- room 5 (grass): rest point (free full heal once per run: src/region78/arena.js) + a tall-grass floor hazard down the
  middle lane (wild battles; walk round by the side lanes).
- room 7 (mystic): one mini-trainer (arena_second_7, sight 3) in the middle lane; the fighter waits until they are beaten."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld'); MAPS = os.path.join(OW, 'maps')
BY = {e['name']: e for e in json.load(open(os.path.join(OW, 'tileset.json')))['tiles']}
BY.update({e['name']: e for e in json.load(open(os.path.join(OW, 'tileset_arena.json')))['tiles']})
load = lambda n: json.load(open(os.path.join(MAPS, n + '.json')))
def save(n, j):
    with open(os.path.join(MAPS, n + '.json'), 'w') as f: f.write(json.dumps(j, separators=(',', ':'), ensure_ascii=False))
def put(j, x, y, name, col=None):
    j['layers']['decoration'][y][x] = BY[name]['id']; j['layers']['collision'][y][x] = BY[name]['collision_code'] if col is None else col
room = lambda n: f'aurelith_arena_room_{n}'

# lobby coin check
j = load('aurelith_arena')
st = next(g for g in load('aurelith_stadium_int')['story_gates'] if g['id'] == 'gate_aurelith_arena')
g = {**json.loads(json.dumps(st)), 'id': 'gate_aurelith_lobby', 'blocks': {'from_entry': 'aurelith_arena lobby', 'to_entry': room(1)},
     'note': 'Oct 30 2026 playtest: the lobby had no coin check (Dev Travel / a bypass reached the stairs); same coins + lines as the stadium doors'}
j['story_gates'] = [x for x in j.get('story_gates', []) if x['id'] != g['id']] + [g]
for c in g['cells']: put(j, c['x'], c['y'], c['blocked_tile'])
save('aurelith_arena', j)

for n in range(1, 9):
    j = load(room(n))
    if n == 1:  # down mats land below the lobby coin check, not on it
        for w in j['warps']:
            if w['to'] == 'aurelith_arena': w['ty'] = 4
    j['fly_point'] = {'x': 7, 'y': 13, 'facing': 'up', 'note': 'entrance (Dev Travel lands here)'}
    for g in j.get('story_gates', []):
        if g['id'].startswith('gate_arena_room_'): g['resettable'] = True
    if n == 3:
        plates, gates = [(2, 12), (14, 12)], [(7, 6), (9, 6), (8, 7)]
        j['puzzle'] = {'switches': [{'id': f'p{i + 1}', 'x': x, 'y': y, 'type': 'plate', 'channel': 'A', 'mode': 'latch', 'start_on': False} for i, (x, y) in enumerate(plates)],
                       'gates': [{'id': f'g{i + 1}', 'x': x, 'y': y, 'channel': 'A', 'closed_collision': 6, 'open_collision': 0} for i, (x, y) in enumerate(gates)],
                       'channels': {'A': {'switches': ['p1', 'p2'], 'gates': ['g1', 'g2', 'g3']}},
                       'rules': 'Arena room 3 (Oct 30 2026): step on both wind plates by the entrance corners to open the gates round Zephra. Solved stays solved.'}
        for x, y in plates: put(j, x, y, 'plate_hall_off', 7)
        for x, y in gates: put(j, x, y, 'gate_hall_closed', 6)
    if n == 5:
        j['npcs'] = [x for x in j['npcs'] if x['id'] != 'arena_rest_5'] + [{'id': 'arena_rest_5', 'x': 12, 'y': 13, 'facing': 'left', 'kind': 'npc', 'sprite': 'vil_receptionist_f',
                     'note': 'Arena rest point between rooms 4 and 5: free full heal once per run (src/region78/arena.js ARENA.rest)', 'text_ref': 'overworld_lines.json system_arena.rest_point'}]
        for y in range(7, 13):
            for x in range(6, 11):
                put(j, x, y, 'tall_grass_0001_v0', 0); j['layers']['encounter'][y][x] = 1
        j['encounter_zones'] = [{'x0': 6, 'y0': 7, 'x1': 10, 'y1': 12, 'table': 'route_aurelith_saltmere_grass', 'note': 'Arena room 5 floor hazard (Oct 30 2026): side lanes avoid it'}]
    if n == 7:
        j['npcs'] = [x for x in j['npcs'] if x['id'] != 'arena_second_7'] + [{'id': 'arena_second_7', 'x': 8, 'y': 9, 'facing': 'down', 'kind': 'trainer', 'sprite': 'tr_scientist_m',
                     'sight_range': 3, 'sight_rule': 'see OVERWORLD_README "Trainer line of sight"', 'sight_cells': [[8, 10], [8, 11], [8, 12]],
                     'note': "Arena room 7 mini-trainer, Oriel's second (Oct 30 2026): Oriel waits until they are beaten (src/region78/arena.js)",
                     'text_ref': 'overworld_lines.json maps.aurelith_arena.arena_second_7'}]
    save(room(n), j)

p = os.path.join(ROOT, 'art', 'characters', 'pixel', 'npcs', 'npc_sprite_map.json'); sm = json.load(open(p))
def entry(sid, cls):
    e = {'sprite_id': sid, 'class': cls}
    for k, v in (('overworld_sheet', '_chibi_sheet.png'), ('overworld_sheet_2x', '_chibi_sheet_2x.png'), ('overworld_sheet_3x', '_chibi_sheet_3x.png')): e[k] = f'npcs/{sid}/overworld/{sid}{v}'
    e['overworld_frames_dir'] = f'npcs/{sid}/overworld/{sid}_chibi/'
    t = f'npcs/{sid}/trainer/{sid}_trainer_64x128.png'
    if os.path.exists(os.path.join(ROOT, 'art', 'characters', 'pixel', t)): e['trainer_64x128'] = t
    return e
sm['map'][f'{room(5)}.arena_rest_5'] = entry('vil_receptionist_f', 'Arena rest point')
sm['map'][f'{room(7)}.arena_second_7'] = entry('tr_scientist_m', 'Arena mini-trainer')
open(p, 'w', encoding='utf-8').write(json.dumps(sm, indent=1, ensure_ascii=False) + '\n')
print('ok')
