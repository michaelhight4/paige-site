"""route_revival_sunmeadow pass 2 (Coder, Oct 30 2026). Archive Room (was revival_heights_cave_nw, mouth 14,8; now mouth 30,20) moved here from revival_heights (Gary 10:52 AM CT: max 1 cave per town;
relocate cut pockets, keep items, trainer and Text Bot lines). Sealed pocket entered by a cave on the rock face, left by a one-way ledge.
Build: CAVE_POCKETS_BASE=ead15744 python3 tools/map_audit/cave_pockets.py route_revival_sunmeadow"""
from pass2_spec import P as _P, T, E
M = 'route_revival_sunmeadow'
def P(*a, **k): return _P(M, *a, main_start=[20, 0], floor_tile_at=[20, 25], floor_tiles=None, **k)
POCKETS = [
 P('rhp_pocket_archive', 'route_revival_sunmeadow_cave_archive', 'Archive Room', [[35, 22, 42, 27]], [37, 39, 28], [[x, 29] for x in range(33, 42)], [30, 20], [38, 21],
   T('r9_rhp_archivist', 42, 22, 'Clerk', 'Ebba', ['foundrax', 'pharolith', 'cragmont'],
     'Every memo since the company began is filed here. Battle?', 'Filed under: lost.', 'Hop down the ledge to the path.'),
   E('r9_rhp_egg_memo', 35, 22, 'a tower of memos', 'A tower of memos. The top one says: please reply to the memo below.'),
   dict(id='r9_rhp_crystal', x=35, y=27, item='dominance_crystal_plus'),
   'An old clerk in the old company off-site archive, cut into the rock above the path north of town; a Prime Crystal is in the last drawer.',
   map_items=[{'id': 'rhp_archive_seed_visible', 'x': 40, 'y': 25, 'item': 'vigor_seed', 'hidden': False}, {'id': 'rhp_archive_strip_mix', 'x': 41, 'y': 29, 'item': 'trail_mix'}]),
]
