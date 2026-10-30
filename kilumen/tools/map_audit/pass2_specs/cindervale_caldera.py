"""cindervale_caldera pass 2 (Coder, Oct 30 2026).
1. Ash Vent: a cave in the middle wall band (14,11) opens up into a sealed shelf over the north rim; ledge drops back at y3.
2. A crack at the west rocks (12,14) opens into a sealed ledge above Cindervale (see cindervale spec) - R3 pocket exit.
Plus a push boulder in the west gap (9,10) as a field-skill gate."""
from pass2_spec import P as _P, T, E
M = 'cindervale_caldera'
def P(*a, **k): return _P(M, *a, main_start=[16, 22], floor_tile_at=[20, 8], floor_tiles=None, **k)
POCKETS = [
 P('cc_pocket_vent', 'cindervale_caldera_cave', 'Ash Vent', [[5, 1, 28, 2]], [21, 23, 3], [], [14, 11], [25, 1],
   T('r9_ccp_stoker', 19, 1, 'Smelter', 'Brann', ['calderax', 'pyrogrim', 'calderock'],
     'The vent keeps my forge warm. You keep me busy. Fair trade?', 'Hot work. You out-heated me.', 'Drop off the ledge. Mind the ash.'),
   E('r9_ccp_egg_kettle', 28, 1, 'a kettle on a hot rock', 'A kettle sits on a hot rock. It has been boiling for years. Nobody knows who left it.'),
   dict(id='r9_ccp_crystal', x=28, y=2, item='dominance_crystal_plus'),
   'A smelter who warms a hidden forge on the ash vent; a Prime Crystal sits on the hot rocks.',
   map_cells=[{'x': 9, 'y': 10, 'g': None, 'd': 887, 'c': 5}],
   map_items=[{'id': 'cc_vent_seed_visible', 'x': 5, 'y': 1, 'item': 'vigor_seed', 'hidden': False}]),  # R6: seen from the rim
]
