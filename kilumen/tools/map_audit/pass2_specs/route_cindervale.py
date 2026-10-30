"""route_cindervale pass 2 (GD, Oct 30 2026). Old Platform (was aurelith_cave_e, mouth 62,6) moved here from aurelith
(max 2 caves per town; relocate cut pockets, keep items, trainer and Text Bot lines): a closed spur platform of the old
Aurelith-Cindervale line in the east ash woods, entered by a cave on the tree edge (25,17), left by a one-way ledge onto
the lower ash flat (row 33).
Build: CAVE_POCKETS_BASE=80bde9ee python3 tools/map_audit/cave_pockets.py route_cindervale"""
from pass2_spec import P as _P, T, E
M = 'route_cindervale'
def P(*a, **k): return _P(M, *a, main_start=[24, 22], floor_tile_at=[15, 30], floor_tiles=None, **k)
POCKETS = [
 P('aur_pocket_platform', 'route_cindervale_cave_platform', 'Old Platform', [[22, 28, 29, 31]], [24, 26, 32], [[24, 33], [25, 33], [26, 33]], [25, 17], [26, 27],
   T('r9_aurp_porter', 22, 28, 'Porter', 'Ansel', ['cascadorn', 'torrentpike', 'tuskwallow'],
     'Last stop! Well, the stop after the last stop. Battle?', 'All change, then.', 'Drop off the platform edge and go west.'),
   E('r9_aurp_egg_clock', 29, 28, 'a platform clock', 'A platform clock. Both hands point at the snack stand.'),
   dict(id='r9_aurp_crystal_e', x=29, y=31, item='dominance_crystal_plus'),
   'A porter on a closed platform in the ash woods south of Aurelith; a Prime Crystal is under the bench.',
   map_items=[{'id': 'aur_platform_strip_tea', 'x': 25, 'y': 33, 'item': 'calm_tea'},
              {'id': 'aur_platform_seed_visible', 'x': 27, 'y': 30, 'item': 'vigor_seed', 'hidden': False}]),  # R6
]
