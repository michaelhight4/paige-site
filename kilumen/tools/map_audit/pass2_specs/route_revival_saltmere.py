"""route_revival_saltmere pass 2 (Coder, Oct 30 2026). Break Garden (was revival_heights_cave_sw, mouth 14,27; now mouth 15,16) moved here from revival_heights (Gary 10:52 AM CT: max 1 cave per town;
relocate cut pockets, keep items, trainer and Text Bot lines). Sealed pocket entered by a cave on the rock face, left by a one-way ledge.
Build: CAVE_POCKETS_BASE=ead15744 python3 tools/map_audit/cave_pockets.py route_revival_saltmere"""
from pass2_spec import P as _P, T, E
M = 'route_revival_saltmere'
def P(*a, **k): return _P(M, *a, main_start=[22, 0], floor_tile_at=[15, 20], floor_tiles=None, **k)
POCKETS = [
 P('rhp_pocket_garden', 'route_revival_saltmere_cave_garden', 'Break Garden', [[3, 17, 10, 22]], [5, 7, 23], [[x, 24] for x in range(5, 13)], [15, 16], [6, 16],
   T('r9_rhp_gardener', 10, 17, 'Gardener', 'Brita', ['fernstag', 'gauzewing', 'cascadorn'],
     'The staff garden was closed for efficiency. I still water it. Battle?', 'You grew on me.', 'Ledge down and walk east to the path.'),
   E('r9_rhp_egg_mug', 3, 17, 'a mug on a bench', 'A mug on a bench. It says OKAYEST MANAGER IN THE WORLD.'),
   dict(id='r9_rhp_crystal_s', x=10, y=22, item='dominance_crystal_plus'),
   'A gardener in the staff garden the company closed, hidden in the rock west of the path south of town; a Prime Crystal is under the bench.',
   map_items=[{'id': 'rhp_garden_seed_visible', 'x': 7, 'y': 20, 'item': 'vigor_seed', 'hidden': False}, {'id': 'rhp_garden_strip_mix', 'x': 5, 'y': 24, 'item': 'trail_mix'}]),
]
