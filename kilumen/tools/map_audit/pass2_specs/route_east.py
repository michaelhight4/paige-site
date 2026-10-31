"""route_east pass 2 (Coder, Oct 30 2026). Three sealed pockets, each entered by a small cave, left by a one-way ledge.
1. Ridge Hollow (north field cave 36,9) -> one-row shelf above the north field, ledge y9.
2. East Den (east wall cave 50,18) -> shelf in the east rock over the north field, ledge y15.
3. West Nook (east wall cave 46,18) -> nook in the west rock, ledge y15 onto the west field.
Plus a push boulder (21,27) into a side cut through the south-west rock."""
from pass2_spec import P as _P, T, E
M = 'route_east'
def P(*a, **k): return _P(M, *a, main_start=[0, 19], floor_tile_at=[20, 20], floor_tiles=(1, 2, 3, 4), **k)
POCKETS = [
 P('re_pocket_ridge', 'route_east_cave_n', 'Ridge Hollow', [[20, 8, 30, 8]], [22, 24, 9], [], [36, 9], [25, 7],
   T('r9_rep_ridgewalker', 20, 8, 'Ridge Walker', 'Edvin', ['stratodrake', 'cragmont', 'galespar'],
     'Nobody walks the ridge but me. Until now. Battle?', 'You walk it better than me.', 'Hop down the ledge to the field.'),
   E('r9_rep_egg_cairn', 30, 7, 'a cairn of flat stones', 'A cairn of flat stones. The top one has a face drawn on it. It looks worried.'),
   dict(id='r9_rep_seed', x=30, y=8, item='vigor_seed'),
   'A ridge walker on the shelf over the field; a Vigor Seed sits at the far end.'),
 P('re_pocket_den', 'route_east_cave_e', 'East Den', [[43, 11, 50, 14]], [44, 46, 15], [], [50, 18], [47, 10],
   T('r9_rep_denkeeper', 49, 11, 'Hermit', 'Saga', ['foundrax', 'pharolith', 'cascadorn'],
     'This den is mine. The rent is one battle.', 'Rent paid in full.', 'The ledge drops you by the path.'),
   E('r9_rep_egg_chair', 50, 14, 'a chair carved from rock', 'A chair carved out of the rock. Very comfy. For a rock.'),
   dict(id='r9_rep_crystal', x=43, y=11, item='dominance_crystal_plus'),
   'A hermit in a den in the east rock; a Prime Crystal is in the corner.',
   map_items=[{'id': 're_den_seed_visible', 'x': 46, 'y': 13, 'item': 'vigor_seed', 'hidden': False}]),  # R6
 P('re_pocket_nook', 'route_east_cave_w', 'West Nook', [[13, 11, 17, 14]], [14, 16, 15], [], [46, 18], [15, 10],
   T('r9_rep_nookie', 13, 11, 'Camper', 'Liv', ['torrentpike', 'gauzewing', 'tuskwallow'],
     'You found my nook! Nobody finds my nook.', 'Fine, it is our nook now.', 'Ledge down to the west field.'),
   E('r9_rep_egg_kite', 17, 11, 'a kite stuck in the rock', 'A kite wedged in the rock. The string goes up and up and does not come down.'),
   dict(id='r9_rep_seed_w', x=17, y=14, item='vigor_seed'),
   'A camper in a hidden nook in the west rock; a Vigor Seed is by the wall.',
   # push-boulder shortcut through the south-west rock to the east path (field-skill gate, breaks up the solid block)
   map_cells=[{'x': x, 'y': y, 'g': 4, 'd': 0, 'c': 0} for y in (27, 28) for x in range(21, 39)] + [{'x': 21, 'y': 27, 'g': 4, 'd': 887, 'c': 5}],
   map_items=[{'id': 're_cut_tea', 'x': 28, 'y': 28, 'item': 'calm_tea'}]),
]
