"""cindervale pass 2 (Coder, Oct 30 2026).
1. Cinder Crack: a crack in cindervale_caldera (12,14) drops into a sealed ledge on the town's north wall; ledge back at y11."""
from pass2_spec import P as _P, T, E
M = 'cindervale'
def P(*a, **k): return _P(M, *a, main_start=[20, 22], floor_tile_at=[20, 12], floor_tiles=None, **k)
POCKETS = [
 P('cv_pocket_crack', 'cindervale_caldera', 'Cinder Crack', [[13, 10, 22, 10]], [15, 17, 11], [], None, [18, 9],
   T('r9_cvp_watcher', 14, 10, 'Ash Watcher', 'Ilse', ['foundrax', 'cragmont', 'pyrogrim'],
     'From up here I see the whole town. And now you.', 'You climbed through ash for that? Respect.', 'The ledge drops right into town.'),
   E('r9_cvp_egg_bell', 20, 9, 'a soot-black bell', 'A soot-black bell in the wall. Ring it and the whole town looks up. Better not.'),
   dict(id='r9_cvp_charm', x=13, y=10, item='dominance_crystal_plus'),
   'A watcher on the ash ledge over town; a Prime Crystal hides in the corner.',
   existing_cave={'crack': [12, 14], 'land': [12, 15]},
   map_items=[{'id': 'cv_ledge_seed_visible', 'x': 22, 'y': 10, 'item': 'vigor_seed', 'hidden': False}]),
]
