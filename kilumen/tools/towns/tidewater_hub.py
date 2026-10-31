"""Tidewater Coast trade hub (Gary, Oct 31 2026: "Bigger dock, we need it to be a living trade hub"). Runs after
tidewater_dock.py and only touches the water area x12-41 y33-45 (never the shore strip, town, grass or ledges).
Straight decks only: west market wharf x13-22 y33-34, pier B x32-33 y33-43, main pier x35-36 y33-44 with one straight
east finger x37-40 y41-42. Cargo ship 3x4 moored at the main pier under a crane, boats, crates/barrels/sacks, market
stalls (fishmonger, trader) and a shipwright corner, dock workers who wander a 1-square loop, ambient fish ripples by
the boats, and flag buoys at x25/x28 marking the existing glide lane x26-27 (lane collision 3, encounters and the
south exit to gullhaven_sea are unchanged). Deck goes on the ground layer so kit props sit on it. Re-runnable."""
import json, os
R = os.path.join(os.path.dirname(__file__), '..', '..')
P = os.path.join(R, 'art', 'world', 'overworld', 'maps', 'tidewater_coast.json')
TS = {t['name']: t['id'] for t in json.load(open(os.path.join(R, 'art', 'world', 'overworld', 'tileset.json')))['tiles']}
j = json.load(open(P)); L = j['layers']; G, D, O, C, E = (L[k] for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter'))
WATER = (33, 35, 37)
for y in range(33, 46):                                  # reset the water area (drops the first dock), lane stays glide water
    for x in range(12, 42):
        if TS.get('bridge_dock') == G[y][x]: G[y][x] = WATER[(x * 7 + y * 3) % 3]
        D[y][x] = 0; O[y][x] = 0
        C[y][x] = 3 if y <= 35 or x in (26, 27) else 1
        if not (y <= 35 or x in (26, 27)): E[y][x] = 0
def deck(x0, x1, y0, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): G[y][x] = TS['bridge_dock']; C[y][x] = 0; E[y][x] = 0
deck(13, 22, 33, 34); deck(32, 33, 33, 43); deck(35, 36, 33, 44); deck(37, 40, 41, 42)
def prop(x, y, name):
    D[y][x] = TS[name]; C[y][x] = 1
for x, y, n in [(13, 34, 'barrel'), (14, 34, 'x_city_stall_fruit_0_0'), (15, 34, 'x_city_stall_fruit_1_0'),
                (17, 34, 'i_barrel'), (19, 34, 'x_city_stall_fabric_0_0'), (20, 34, 'x_city_stall_fabric_1_0'), (22, 34, 'hd_sacks'),
                (36, 33, 'hd_crane_top'), (36, 34, 'hd_crane_base'), (36, 38, 'i_barrel'), (36, 39, 'hd_sacks'),
                (32, 35, 'i_barrel'), (33, 38, 'barrel'), (40, 41, 'i_anchor'), (40, 42, 'i_ship_wheel'),
                (37, 42, 'barrel')]:
    prop(x, y, n)
for r in range(4):                                       # cargo ship x37-39 y34-37, alongside the crane
    for c in range(3): prop(37 + c, 34 + r, f'hd_cargoship_{c}_{r}')
for x, y, n in [(31, 37, 'hd_rowboat_red'), (37, 39, 'hd_rowboat_teal'), (34, 39, 'hd_fishboat_0'), (34, 40, 'hd_fishboat_1'),
                (41, 43, 'hd_fishboat_0'), (41, 44, 'hd_fishboat_1'), (31, 41, 'hd_rowboat_teal'), (38, 44, 'hd_rowboat_red')]:
    prop(x, y, n)
for y in (37, 39, 41, 43):                               # flag buoys either side of the lane
    for x in (25, 28): prop(x, y, 'hd_buoy_flag')
j.setdefault('ambient', {})['fish_spots'] = [{'x': x, 'y': y} for x, y in ((30, 34), (40, 33), (34, 37), (38, 38), (40, 44), (30, 39), (34, 42))]
NEW = [('tidewater_coast_dock_fisher_1', 35, 44, 'down', 'angler', 0, 'Casting off the end of the main pier.'),
       ('tidewater_coast_dock_fisher_2', 36, 44, 'down', 'angler', 0, 'Fishing off the end of the main pier.'),
       ('tidewater_coast_dock_fisher_3', 33, 43, 'down', 'angler', 0, 'Line in off the end of pier B.'),
       ('tidewater_coast_fishmonger', 16, 34, 'up', 'clerk', 1, 'Fishmonger at the wharf stall: today\'s catch.'),
       ('tidewater_coast_trader', 21, 34, 'up', 'clerk', 1, 'Trader at the wharf stall: goods off the cargo ship.'),
       ('tidewater_coast_shipwright', 39, 41, 'right', 'smith', 1, 'Shipwright on the east finger, mending gear.'),
       ('tidewater_coast_dock_worker_1', 18, 34, 'down', 'harbour_hand', 0, 'Dock worker hauling crates to the stalls.'),
       ('tidewater_coast_dock_worker_2', 36, 35, 'right', 'harbour_hand', 1, 'Dock worker unloading the cargo ship under the crane.'),
       ('tidewater_coast_dock_worker_3', 32, 40, 'down', 'harbour_hand', 0, 'Dock worker stacking barrels on pier B.')]
j['npcs'] = [n for n in j['npcs'] if not any(n['id'] == a[0] for a in NEW)]
T = os.path.join(R, 'text', 'overworld_lines.json'); t = json.load(open(T)); tm = t['maps']['tidewater_coast']
for i, x, y, f, cls, static, ph in NEW:
    assert C[y][x] == 0, (i, x, y)
    n = {'id': i, 'x': x, 'y': y, 'facing': f, 'kind': 'villager', 'gd_class': cls,
         'text_ref': f'overworld_lines.json maps.tidewater_coast.{i}', 'note': 'trade hub (Gary Oct 31 2026)'}
    if static: n['static'] = True
    j['npcs'].append(n)
    s = 'DRAFT placeholder: ' + ph
    tm[i] = {'pages': [s], 'kind': 'villager', 'status': 'DRAFT', 'owner': 'Text Bot', 'textbot_review': True,
             'lines': [{'id': 'default', 'flags': [], 'pages': [s]}]}
json.dump(j, open(P, 'w'), indent=1)
json.dump(t, open(T, 'w'), indent=1, ensure_ascii=False)
print('ok')
