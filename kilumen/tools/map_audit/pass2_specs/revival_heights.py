"""revival_heights pass 2 (Coder, Oct 30 2026; Gary 10:52 AM CT: max 1 cave per town, bring the town to life instead).
Server Nook (Coder review 11:21 AM CT): a plain town cave, ONE mouth at 45,17 on the rock face above the y18 walk; the
old pocket floor 48-55,11-16 is the open east park (Sixten and the fan stay there), both Vigor Seeds sit inside the cave.
Archive Room and Break Garden moved out of town (Gary 10:52 AM CT: relocate, don't delete): see
pass2_specs/route_revival_sunmeadow.py and route_revival_saltmere.py.
Build: CAVE_POCKETS_BASE=3a39a391 cave_pockets.py revival_heights, then tools/towns/build_revival_heights_living.py."""
from pass2_spec import P as _P, T, E
M = 'revival_heights'
def P(*a, **k): return _P(M, *a, main_start=[29, 20], floor_tile_at=[30, 28], floor_tiles=None, **k)
POCKETS = [
 P('rhp_pocket_servers', 'revival_heights_cave_ne', 'Server Nook', [[48, 11, 55, 16]], [49, 51, 17], [[x, 18] for x in range(44, 52)], [45, 17], [52, 10],
   T('r9_rhp_technician', 55, 11, 'Engineer', 'Sixten', ['lancebeetle', 'galespar', 'stratodrake'],
     'Have you tried turning the battle off and on again? Battle!', 'Rebooting...', 'Ledge down, then west along the lane.'),
   E('r9_rhp_egg_fan', 48, 11, 'a humming fan', 'A big humming fan. It hums the company jingle, a little off-key.'),
   dict(id='r9_rhp_seed', x=55, y=16, item='vigor_seed'),
   'A technician in a server nook in the east rock; a Vigor Seed is behind the rack.',
   town_cave='Coder review 0e9b8e6a (11:21 AM CT): one cave mouth only (45,17, above the y18 walk); the nook floor 48-55,11-16 is the open east park, pocket door 52,10 removed by build_revival_heights_living.py, both seeds moved into the cave',
   map_cells=[{'x': 42, 'y': 13, 'g': 10882, 'd': 887, 'c': 5}],
   map_items=[{'id': 'rhp_plaza_tea', 'x': 22, 'y': 13, 'item': 'calm_tea'}, {'id': 'rhp_south_corner_tea', 'x': 43, 'y': 29, 'item': 'calm_tea'}, {'id': 'rhp_servers_seed_visible', 'x': 52, 'y': 14, 'item': 'vigor_seed', 'hidden': False}, {'id': 'rhp_servers_strip_tea', 'x': 50, 'y': 18, 'item': 'calm_tea'}]),  # R6,
]
