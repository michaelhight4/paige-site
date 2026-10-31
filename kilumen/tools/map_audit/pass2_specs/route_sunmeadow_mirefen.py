"""route_sunmeadow_mirefen pass 2 (GD, Oct 30 2026). Hay Loft (was sunmeadow_fields_cave_e, mouth 46,16; now mouth 37,18) moved
here from sunmeadow_fields (max 2 caves per map; relocate cut pockets, keep items, trainer and Text Bot lines). Sealed hay
meadow in the north woods entered by a cave on the tree edge, left by a one-way ledge onto the x47 path.
Bee Hollow (was sunmeadow_fields_cave_n, doors 25,11 / 40,30; those became a barn and a beekeeper cottage) moved here too.
Build: CAVE_POCKETS_BASE=a1e5bebe python3 tools/map_audit/cave_pockets.py route_sunmeadow_mirefen"""
from pass2_spec import P as _P, T, E
M = 'route_sunmeadow_mirefen'
def P(*a, **k): return _P(M, *a, main_start=[0, 20], floor_tile_at=[14, 18], floor_tiles=None, **k)
POCKETS = [
 P('smf_pocket_loft', 'route_sunmeadow_mirefen_cave_loft', 'Hay Loft', [[44, 11, 51, 16]], [46, 48, 17], [[46, 18], [47, 18], [48, 18]], [37, 18], [47, 10],
   T('r9_smfp_haymaker', 44, 11, 'Farmer', 'Bodil', ['tuskwallow', 'fernstag', 'cragmont'],
     'I stack hay up here where the goats cannot reach. Battle?', 'You out-stacked me.', 'Hop down the ledge to the path.'),
   E('r9_smfp_egg_scarecrow', 51, 11, 'a tiny scarecrow', 'A tiny scarecrow. It is scaring one very small crow, who does not care.'),
   dict(id='r9_smfp_crystal', x=51, y=16, item='dominance_crystal_plus'),
   'A farmer on a hay meadow in the woods above the Mirefen path; a Prime Crystal is under the hay.',
   map_items=[{'id': 'smf_loft_seed_visible', 'x': 49, 'y': 14, 'item': 'vigor_seed', 'hidden': False}],),  # R6
 P('smf_pocket_hollow', 'route_sunmeadow_mirefen_cave_hive', 'Bee Hollow', [[22, 11, 31, 15]], [24, 26, 16], [[24, 17], [25, 17], [26, 17]], [30, 22], [27, 10],
   T('r9_smfp_beekeeper', 31, 11, 'Beekeeper', 'Torvald', ['lancebeetle', 'pharolith', 'stratodrake'],
     'Shh. The bees are asleep. Battle quietly.', 'The bees slept through it.', 'Ledge down and go west.'),
   E('r9_smfp_egg_hive', 22, 11, 'a hive in the rock', 'A hive in the rock wall. It hums. It is humming the Sunmeadow song.'),
   dict(id='r9_smfp_seed_e', x=31, y=15, item='vigor_seed'),
   'A beekeeper in a hollow in the north woods above the Mirefen path; a Vigor Seed sits by the hive.',
   map_items=[{'id': 'smf_hollow_seed_visible', 'x': 27, 'y': 13, 'item': 'vigor_seed', 'hidden': False}]),  # moved from sunmeadow_fields (Gary 12:48 PM CT)
]
