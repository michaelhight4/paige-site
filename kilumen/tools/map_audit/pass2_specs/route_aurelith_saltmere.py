"""route_aurelith_saltmere pass 2 (Coder, Oct 30 2026). Three sealed pockets, each entered by a small cave, left by a one-way ledge.
1. Salt Cellar (west wall cave 13,18) -> shelf over the west field, ledge y15.
2. Gull Notch (east cave 47,11) -> notch in the middle rock, ledge y21.
3. Tide Loft (east cave 49,15) -> long shelf over the north field, ledge y11.
Plus a push boulder (15,18) as a field-skill gate."""
from pass2_spec import P as _P, T, E
M = 'route_aurelith_saltmere'
def P(*a, **k): return _P(M, *a, main_start=[1, 19], floor_tile_at=[20, 20], floor_tiles=(1, 2, 3, 4), **k)
POCKETS = [
 P('ras_pocket_cellar', 'route_aurelith_saltmere_cave_w', 'Salt Cellar', [[15, 13, 25, 14]], [17, 19, 15], [], [13, 18], [22, 12],
   T('r9_rasp_saltpan', 16, 13, 'Salt Raker', 'Dagny', ['tuskwallow', 'cascadorn', 'galespar'],
     'I rake salt up here where the wind cannot steal it. Battle?', 'You raked me clean.', 'The ledge drops you back on the road.'),
   E('r9_rasp_egg_heap', 25, 13, 'a salt heap shaped like a castle', 'A salt castle. Tiny salt flags. A sign: DO NOT LICK.'),
   dict(id='r9_rasp_crystal', x=25, y=14, item='dominance_crystal_plus'),
   'A salt raker on a hidden shelf; a Prime Crystal sits by the heap.',
   map_cells=[{'x': 15, 'y': 18, 'g': None, 'd': 887, 'c': 5}]),
 P('ras_pocket_notch', 'route_aurelith_saltmere_cave_m', 'Gull Notch', [[26, 16, 29, 20]], [27, 28, 21], [], [47, 11], [28, 15],
   T('r9_rasp_gullkeeper', 26, 16, 'Bird Keeper', 'Tarn', ['gauzewing', 'stratodrake', 'galespar'],
     'The gulls nest in this notch. They let me stay. Will you?', 'The gulls approve of you.', 'Ledge down, and mind the feathers.'),
   E('r9_rasp_egg_feathers', 29, 16, 'a nest full of odd feathers', 'A nest of odd feathers. One is blue, one is gold, one is a pencil.'),
   dict(id='r9_rasp_seed', x=29, y=20, item='vigor_seed'),
   'A bird keeper in a sealed rock notch; a Vigor Seed is tucked in the nest.'),
 P('ras_pocket_loft', 'route_aurelith_saltmere_cave_e', 'Tide Loft', [[32, 9, 44, 10]], [33, 35, 11], [], [49, 15], [40, 8],
   T('r9_rasp_tidecaller', 34, 9, 'Tide Caller', 'Ottilie', ['torrentpike', 'pharolith', 'cascadorn'],
     'From up here I call the tides in. You just walked in.', 'The tide turns your way.', 'Drop down to the north field.'),
   E('r9_rasp_egg_shell', 44, 9, 'a huge spiral shell', 'A huge spiral shell. Hold it to your ear: it hums the Saltmere song, off-key.'),
   dict(id='r9_rasp_charm', x=32, y=10, item='dominance_crystal_plus'),
   'A tide caller on the north loft; a Prime Crystal sits at the far end.',
   map_items=[{'id': 'ras_loft_seed_visible', 'x': 44, 'y': 10, 'item': 'vigor_seed', 'hidden': False}]),  # R6
]
