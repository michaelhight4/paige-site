"""lanternport_grotto pass 2 (Coder, Oct 30 2026).
1. Lamp Loft: a cave in the north wall (9,15) opens into a sealed shelf over the west pool; ledge drops back at y3.
2. A crack in the floor rock (6,14) opens into a sealed ledge above Lanternport (see lanternport spec) - R3 pocket exit.
Plus a push boulder (15,8) as a field-skill gate."""
from pass2_spec import P as _P, T, E
M = 'lanternport_grotto'
def P(*a, **k): return _P(M, *a, main_start=[15, 20], floor_tile_at=[7, 4], floor_tiles=None, **k)
POCKETS = [
 P('lg_pocket_loft', 'lanternport_grotto_cave', 'Lamp Loft', [[3, 1, 26, 2]], [6, 8, 3], [], [9, 15], [11, 1],
   T('r9_lgp_lampwright', 8, 1, 'Lampwright', 'Oona', ['pharolith', 'novarch', 'torrentpike'],
     'Every lamp in the harbour was lit from this loft. Want to see how bright?', 'Bright enough. You win.', 'Hop down the ledge to the pools.'),
   E('r9_lgp_egg_wicks', 3, 1, 'a jar of spare wicks', 'A jar of spare wicks, all labelled by year. One label just says: OOPS.'),
   dict(id='r9_lgp_crystal', x=26, y=2, item='dominance_crystal_plus'),
   'A lampwright who trims the harbour lamps in a hidden loft; a Prime Crystal sits by the oil.',
   map_cells=[{'x': 15, 'y': 8, 'g': None, 'd': 887, 'c': 5}], map_rocks=[[14, 3], [17, 3]],
   map_items=[{'id': 'lg_loft_seed_visible', 'x': 3, 'y': 2, 'item': 'vigor_seed', 'hidden': False}]),
]
