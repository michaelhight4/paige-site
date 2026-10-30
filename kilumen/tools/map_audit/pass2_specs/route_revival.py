"""route_revival pass 2 (Coder, Oct 30 2026). Three sealed pockets, each entered by a small cave, left by a one-way ledge.
1. Bell Loft (north field cave 24,13) -> shelf in the north rock, ledge y13 onto the north field.
2. West Hollow (west field cave 16,24) -> hollow in the west rock, ledge y24 onto the west field.
3. Lark Ledge (east cave 48,15) -> shelf east of the north corridor, ledge y13.
Plus a push boulder (42,27) into a shortcut from the east dead end down to the south field."""
from pass2_spec import P as _P, T, E
M = 'route_revival'
def P(*a, **k): return _P(M, *a, main_start=[0, 28], floor_tile_at=[30, 30], floor_tiles=None, **k)
POCKETS = [
 P('rr_pocket_loft', 'route_revival_cave_n', 'Bell Loft', [[27, 9, 37, 12]], [29, 31, 13], [], [24, 13], [32, 8],
   T('r9_rrp_bellkeeper', 37, 9, 'Bell Keeper', 'Halvard', ['pharolith', 'cragmont', 'galespar'],
     'The old bell hung up here once. Now I do. Battle?', 'You rang my bell.', 'Hop down the ledge to the field.'),
   E('r9_rrp_egg_bell', 27, 8, 'a dent shaped like a bell', 'A bell-shaped dent in the rock. Someone drew a clapper in it. Ding.'),
   dict(id='r9_rrp_crystal', x=27, y=12, item='dominance_crystal_plus'),
   'A bell keeper on a loft in the north rock; a Prime Crystal sits in the corner.',
   map_items=[{'id': 'rr_loft_seed_visible', 'x': 33, 'y': 11, 'item': 'vigor_seed', 'hidden': False}]),  # R6
 P('rr_pocket_hollow', 'route_revival_cave_w', 'West Hollow', [[13, 17, 21, 22], [19, 23, 21, 23]], [19, 21, 24], [], [16, 24], [17, 16],
   T('r9_rrp_herbalist', 13, 17, 'Gardener', 'Maja', ['fernstag', 'gauzewing', 'tuskwallow'],
     'I grow moss up here. Very slowly. Battle while we wait?', 'The moss grew a bit. You won.', 'Ledge down to the field.'),
   E('r9_rrp_egg_moss', 21, 16, 'moss shaped like a heart', 'Moss in the shape of a heart. A tiny sign: TEN YEARS. WORTH IT.'),
   dict(id='r9_rrp_seed', x=13, y=22, item='vigor_seed'),
   'A gardener in a hollow in the west rock; a Vigor Seed sits in the moss.'),
 P('rr_pocket_lark', 'route_revival_cave_e', 'Lark Ledge', [[42, 9, 50, 12]], [43, 45, 13], [], [48, 15], [46, 8],
   T('r9_rrp_larkwatcher', 50, 9, 'Bird Keeper', 'Ingrid', ['stratodrake', 'torrentpike', 'cascadorn'],
     'The larks nest on this ledge. Quiet, please. Then battle.', 'The larks cheered. Quietly.', 'Drop down to the corridor.'),
   E('r9_rrp_egg_nest', 42, 8, 'a nest of bright pebbles', 'A nest full of bright pebbles. One is a button. One is a coin. One is a pebble.'),
   dict(id='r9_rrp_seed_e', x=50, y=12, item='vigor_seed'),
   'A bird keeper on a lark ledge; a Vigor Seed is in the nest.',
   map_cells=[{'x': 42, 'y': y, 'g': 3, 'd': 0, 'c': 0} for y in range(27, 31)] + [{'x': x, 'y': 30, 'g': 1, 'd': 0, 'c': 0} for x in range(31, 42)]
            + [{'x': 42, 'y': 27, 'g': 3, 'd': 887, 'c': 5}],
   map_items=[{'id': 'rr_cut_tea', 'x': 42, 'y': 29, 'item': 'calm_tea'}]),
]
