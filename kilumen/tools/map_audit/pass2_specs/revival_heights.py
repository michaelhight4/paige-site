"""revival_heights pass 2 (Coder, Oct 30 2026), on top of the town identity pass (tools/towns/build_revival_heights.py).
Three sealed pockets in the rock border, each entered by a small cave, left by a one-way ledge.
1. Archive Room (plaza cave 14,8) -> old company archive in the west rock, ledge y17 onto Company Boulevard.
2. Server Nook (north-east cave 43,8) -> humming server nook in the east rock, ledge y17, strip west to the east lane.
3. Break Garden (south-west cave 14,27) -> a forgotten staff garden in the west rock, ledge y29, strip east to the south walk.
Build with CAVE_POCKETS_BASE=3a39a391."""
from pass2_spec import P as _P, T, E
M = 'revival_heights'
def P(*a, **k): return _P(M, *a, main_start=[29, 20], floor_tile_at=[30, 28], floor_tiles=None, **k)
POCKETS = [
 P('rhp_pocket_archive', 'revival_heights_cave_nw', 'Archive Room', [[3, 11, 10, 16]], [6, 8, 17], [[6, 18], [7, 18], [8, 18]], [14, 8], [5, 10],
   T('r9_rhp_archivist', 3, 11, 'Clerk', 'Ebba', ['foundrax', 'pharolith', 'cragmont'],
     'Every memo since the company began is filed here. Battle?', 'Filed under: lost.', 'Hop down the ledge to the boulevard.'),
   E('r9_rhp_egg_memo', 10, 11, 'a tower of memos', 'A tower of memos. The top one says: please reply to the memo below.'),
   dict(id='r9_rhp_crystal', x=3, y=16, item='dominance_crystal_plus'),
   'An old clerk in the company archive in the west rock; a Prime Crystal is in the last drawer.',
   # push boulder (replaces the plaza-edge planter 42,13): east lane <-> tower forecourt
   map_cells=[{'x': 42, 'y': 13, 'g': 10882, 'd': 887, 'c': 5}],
   map_items=[{'id': 'rhp_plaza_tea', 'x': 22, 'y': 13, 'item': 'calm_tea'}, {'id': 'rhp_archive_strip_mix', 'x': 7, 'y': 18, 'item': 'trail_mix'}]),
 P('rhp_pocket_servers', 'revival_heights_cave_ne', 'Server Nook', [[48, 11, 55, 16]], [49, 51, 17], [[x, 18] for x in range(44, 52)], [43, 8], [52, 10],
   T('r9_rhp_technician', 55, 11, 'Engineer', 'Sixten', ['lancebeetle', 'galespar', 'stratodrake'],
     'Have you tried turning the battle off and on again? Battle!', 'Rebooting...', 'Ledge down, then west along the lane.'),
   E('r9_rhp_egg_fan', 48, 11, 'a humming fan', 'A big humming fan. It hums the company jingle, a little off-key.'),
   dict(id='r9_rhp_seed', x=55, y=16, item='vigor_seed'),
   'A technician in a server nook in the east rock; a Vigor Seed is behind the rack.',
   map_items=[{'id': 'rhp_servers_seed_visible', 'x': 52, 'y': 14, 'item': 'vigor_seed', 'hidden': False}, {'id': 'rhp_servers_strip_tea', 'x': 50, 'y': 18, 'item': 'calm_tea'}]),  # R6
 P('rhp_pocket_garden', 'revival_heights_cave_sw', 'Break Garden', [[3, 23, 10, 28]], [5, 7, 29], [[x, 30] for x in range(5, 14)], [14, 27], [6, 22],
   T('r9_rhp_gardener', 10, 23, 'Gardener', 'Brita', ['fernstag', 'gauzewing', 'cascadorn'],
     'The staff garden was closed for efficiency. I still water it. Battle?', 'You grew on me.', 'Ledge down and walk east.'),
   E('r9_rhp_egg_mug', 3, 23, 'a mug on a bench', 'A mug on a bench. It says OKAYEST MANAGER IN THE WORLD.'),
   dict(id='r9_rhp_crystal_s', x=10, y=28, item='dominance_crystal_plus'),
   'A gardener in the closed staff garden in the west rock; a Prime Crystal is under the bench.',
   map_items=[{'id': 'rhp_garden_strip_mix', 'x': 6, 'y': 30, 'item': 'trail_mix'}, {'id': 'rhp_south_corner_tea', 'x': 43, 'y': 29, 'item': 'calm_tea'}]),
]
