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
for y in range(34, 38):                                  # merchant berth x37-39 y34-37: plain water (no glide) so the visit never covers a surf cell
    for x in range(37, 40): C[y][x] = 1; E[y][x] = 0
deck(13, 24, 33, 41); deck(29, 41, 33, 33)                # west port block; east boardwalk along the shore (v3, Gary: small docks)
for fx, fy1 in ((30, 37), (33, 38), (36, 37), (41, 38)): deck(fx, fx, 34, fy1)
deck(35, 35, 34, 35)   # keeps the original pier-head cells walkable; short finger docks for rowboats/fishing boats
def prop(x, y, name):
    D[y][x] = TS[name]; C[y][x] = 1
for x0 in (14,):                                         # ONE warehouse (v3) (farm-kit barn art re-homed as hd_warehouse, 5x4) facing the quay
    for r in range(4):
        for c in range(5): prop(x0 + c, 36 + r, f'hd_warehouse_{r}_{c}')
for x, y, n in [(13, 34, 'barrel'), (14, 34, 'x_city_stall_fruit_0_0'), (15, 34, 'x_city_stall_fruit_1_0'),
                (19, 34, 'x_city_stall_fabric_0_0'), (20, 34, 'x_city_stall_fabric_1_0'),
                (22, 34, 'x_city_stall_bread_0_0'), (23, 34, 'x_city_stall_bread_1_0'),
                (16, 41, 'hd_deck_crate'), (17, 41, 'i_barrel'), (18, 41, 'hd_sacks'),
                (23, 41, 'barrel'),                         # quay cargo stacks between the berths
                (20, 37, 'hd_deck_crate'), (21, 37, 'i_barrel'), (23, 37, 'hd_sacks'), (20, 38, 'barrel'), (23, 38, 'hd_deck_crate'),   # cargo yard where the 2nd warehouse was
                (36, 36, 'hd_crane_top'), (36, 37, 'hd_crane_base')]:
    prop(x, y, n)
for x0, y0 in ((14, 42), (20, 42)):            # three berthed cargo ships, bows on the quay/pier, open sea astern (south edge)
    for r in range(4):
        for c in range(3): prop(x0 + c, y0 + r, f'hd_cargoship_{c}_{r}')
for x, y, n in [(29, 35, 'hd_rowboat_red'), (31, 36, 'hd_rowboat_teal'), (29, 37, 'hd_fishboat_0'), (29, 38, 'hd_fishboat_1'),   # moored at the small docks
                (32, 37, 'hd_fishboat_0'), (32, 38, 'hd_fishboat_1'), (34, 36, 'hd_rowboat_teal'), (35, 38, 'hd_rowboat_red'),
                (40, 36, 'hd_rowboat_red'), (41, 39, 'hd_fishboat_0'), (41, 40, 'hd_fishboat_1'),
                (18, 43, 'hd_rowboat_red'), (24, 44, 'hd_rowboat_teal')]:
    prop(x, y, n)
for y in (37, 39, 41, 43):                               # flag buoys either side of the lane
    for x in (25, 28): prop(x, y, 'hd_buoy_flag')
j.setdefault('ambient', {})['fish_spots'] = [{'x': x, 'y': y} for x, y in ((30, 40), (34, 40), (40, 43), (34, 44), (31, 43), (17, 44), (23, 43), (39, 44))]
j['ambient']['merchant_ship'] = {'note': 'Gary Oct 31 2026: big merchant ship sails in 07:00, berths at the main pier all day, sails out 17:00 (src/overworld/harbour_ship.js)',
    'tiles': 'hd_cargoship', 'w': 3, 'h': 4, 'berth': {'x': 37, 'y': 34}, 'lane_exit_y': j['height'] + 1, 'arrive': 7, 'depart': 17, 'sail_min': 20}
NEW = [('tidewater_coast_dock_fisher_1', 24, 38, 'right', 'angler', 1, 'Casting off the quay by the buoys.'),
       ('tidewater_coast_dock_fisher_2', 41, 38, 'down', 'angler', 1, 'Fishing off the end of the east dock.'),
       ('tidewater_coast_dock_fisher_3', 30, 37, 'down', 'angler', 1, 'Line in off the end of the west small dock.'),
       ('tidewater_coast_dock_fisher_4', 24, 41, 'right', 'angler', 1, 'Fishing off the quay corner by the buoys.'),
       ('tidewater_coast_dock_fisher_5', 13, 41, 'down', 'angler', 1, 'Fishing off the west end of the quay.'),
       ('tidewater_coast_fishmonger', 16, 34, 'up', 'clerk', 1, 'Fishmonger at the wharf stall: today\'s catch.'),
       ('tidewater_coast_trader', 21, 34, 'up', 'clerk', 1, 'Trader at the wharf stall: goods off the cargo ships.'),
       ('tidewater_coast_baker', 24, 35, 'up', 'clerk', 1, 'Baker selling bread to the sailors.'),
       ('tidewater_coast_shipwright', 33, 38, 'down', 'smith', 1, 'Shipwright on the small docks, mending rowboats.'),
       ('tidewater_coast_harbourmaster', 22, 36, 'down', 'clerk', 1, 'Harbourmaster: the big merchant ship comes in at seven and leaves at five.'),
       ('tidewater_coast_warehouse_clerk_1', 16, 40, 'up', 'clerk', 1, 'Warehouse clerk tallying crates at the west store.'),
       ('tidewater_coast_warehouse_clerk_2', 22, 39, 'up', 'clerk', 1, 'Cargo clerk tallying the quay stacks.'),
       ('tidewater_coast_dock_worker_1', 18, 34, 'down', 'harbour_hand', 0, 'Dock worker hauling crates to the stalls.'),
       ('tidewater_coast_dock_worker_2', 36, 35, 'right', 'harbour_hand', 1, 'Dock worker waiting under the crane for the merchant ship.'),
       ('tidewater_coast_dock_worker_3', 31, 33, 'down', 'harbour_hand', 0, 'Dock worker walking the boardwalk.'),
       ('tidewater_coast_dock_worker_4', 14, 41, 'down', 'harbour_hand', 0, 'Porter unloading the west cargo ship.'),
       ('tidewater_coast_dock_worker_5', 22, 41, 'down', 'harbour_hand', 0, 'Porter unloading the middle cargo ship.'),
       ('tidewater_coast_dock_worker_6', 39, 33, 'down', 'harbour_hand', 0, 'Dock worker tying up boats on the east dock.')]
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
