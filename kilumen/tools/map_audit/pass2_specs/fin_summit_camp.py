"""fin_summit_camp pass 2 pockets (Coder, Oct 30 2026).
1. A crack in r9_icefall (19,8) drops into a sealed ice ledge above the camp (east).
2. Spire Cellar: a cave in the camp's middle wall opens up into a sealed ledge under the spire (west).
Plus a push boulder shortcut (field skill) at (8,4) and 2 dead-end satchels."""
from pass2_spec import P as _P, T, E
M = 'fin_summit_camp'
def P(*a, **k): return _P(M, *a, main_start=[16, 22], floor_tiles=[29, 30, 31, 32], **k)
POCKETS = [
 P('fsc_pocket_crack', 'r9_icefall', 'Icefall Crack', [[20, 1, 29, 2]], [21, 28, 3], [], None, [25, 1],
   T('r9_fscp_lookout', 21, 1, 'Mountaineer', 'Kesia', ['stratodrake', 'cragmont', 'calderock'],
     'You came up through the falls? Then you earned the view.', 'Fair. The view is yours too now.', 'The ledge drops you right into camp.'),
   E('r9_fscp_egg_flag', 29, 1, 'a tiny flag stuck in the ice', 'A tiny flag in the ice. It says: FIRST UP. Under it, smaller: SECOND UP.'),
   dict(id='r9_fscp_seed', x=20, y=2, item='vigor_seed'),
   'A lookout who climbs the frozen falls for the view over camp; a Vigor Seed is tucked in the ice.',
   existing_cave={'crack': [19, 8], 'land': [20, 8]},
   map_rocks=[[14, 8], [26, 8], [7, 15], [17, 13], [25, 16]],
   map_cells=[{'x': 8, 'y': 4, 'g': 29, 'd': 887, 'c': 5}],
   map_items=[{'id': 'fin_sc_ne_mix', 'x': 30, 'y': 4, 'item': 'trail_mix'}, {'id': 'fin_sc_sw_tea', 'x': 3, 'y': 18, 'item': 'calm_tea'}]),
 P('fsc_pocket_cellar', 'fin_summit_camp_cave', 'Spire Cellar', [[4, 1, 14, 2]], [9, 12, 3], [], [16, 11], [6, 1],
   T('r9_fscp_keeper', 13, 1, 'Hermit', 'Aldo', ['foundrax', 'fernstag', 'lancebeetle'],
     'The spire has a cellar. Nobody asks what is in it. You did.', 'All right. It is mostly rocks. And me.', 'Hop down the ledge. The camp is right there.'),
   E('r9_fscp_egg_boots', 4, 1, 'a row of tiny boots', 'A row of tiny boots, smallest to biggest. The last pair is missing. Someone is still out there climbing.'),
   dict(id='r9_fscp_crystal', x=14, y=2, item='dominance_crystal_plus'),
   'A hermit who keeps the cellar under the spire; a Prime Crystal sits at the back.',
   map_items=[{'id': 'fin_sc_cellar_seed', 'x': 10, 'y': 2, 'item': 'vigor_seed', 'hidden': False}]),  # R6: seen from camp over the ledge
]
