"""r9_cairnfold pass 2 (Coder, Oct 30 2026). Three sealed ledges above the village.
1. Hayloft Cave (west): mouth (17,25), opens onto a ledge over the north yard.
2. Bell Cave (east): mouth (32,25), opens onto a ledge over the grass.
3. Gully crack: a crack in r9_old_riverbed (22,25), at the dry channel, climbs into a ledge over the middle lane.
Plus a push boulder shortcut (field skill) at (17,30)."""
from pass2_spec import P as _P, T, E
M = 'r9_cairnfold'
def P(*a, **k): return _P(M, *a, main_start=[26, 26], floor_tile_at=[20, 26], **k)
POCKETS = [
 P('cf_pocket_hayloft', 'r9_cairnfold_cave_w', 'Hayloft Cave', [[12, 10, 20, 10]], [12, 20, 11], [], [17, 25], [16, 9],
   T('r9_cfp_herder', 12, 10, 'Herder', 'Bram', ['lancebeetle', 'cragmont', 'foundrax'],
     'The herd naps up here. Keep it down. Or fight me loudly.', 'Loud and good. The herd did not even wake.', 'Hop off the ledge into the yard.'),
   E('r9_cfp_egg_bell', 19, 9, 'a cowbell with no clapper', 'A cowbell with no clapper. Someone wanted the herd to be quiet. It worked.'),
   dict(id='r9_cfp_crystal', x=14, y=10, item='dominance_crystal_plus'),
   'A herder who rests the herd on a hidden ledge; a Prime Crystal is in the straw.',
   map_warps=[{'x': 11, 'y': 32, 'to': 'r9_old_riverbed', 'tx': 50, 'ty': 19, 'facing': 'up'}],  # rope down, pairs with r9_old_riverbed (50,18)
   map_cells=[{'x': 17, 'y': 30, 'g': None, 'd': 887, 'c': 5}],
   map_items=[{'id': 'r9_cfp_seed_visible', 'x': 20, 'y': 10, 'item': 'vigor_seed', 'hidden': False}]),  # R6
 P('cf_pocket_bell', 'r9_cairnfold_cave_e', 'Bell Cave', [[35, 10, 43, 10]], [42, 43, 11], [], [32, 25], [39, 9],
   T('r9_cfp_ringer', 35, 10, 'Bell Ringer', 'Ottla', ['gauzewing', 'galespar', 'stratodrake'],
     'You hear that? No? Good. I tuned it out.', 'All right, that rang true.', 'The ledge drops you in the grass.'),
   E('r9_cfp_egg_rope', 41, 9, 'a frayed rope going up into the dark', 'A frayed rope goes up into the dark. You tug it. Far away, something goes bong.'),
   dict(id='r9_cfp_seed', x=43, y=10, item='vigor_seed'),
   'A bell ringer who keeps a silent bell on a hidden ledge; a Vigor Seed is under the bell frame.'),
 P('cf_pocket_gully', 'r9_old_riverbed', 'Gully Crack', [[24, 10, 32, 10]], [30, 32, 11], [], None, [28, 9],
   T('r9_cfp_digger', 24, 10, 'Digger', 'Pell', ['calderock', 'cragmont', 'lancebeetle'],
     'This crack runs all the way down to the old river. I dug it. Mostly.', 'Fair. You dig a good fight.', 'Drop off the ledge to the lane.'),
   E('r9_cfp_egg_spoons', 31, 9, 'a pile of bent spoons', 'A pile of bent spoons. Every one of them tried. Every one of them lost to the rock.'),
   dict(id='r9_cfp_prime', x=32, y=10, item='dominance_crystal_plus'),
   'A digger who tunnelled up from the riverbed; a Prime Crystal is at the dig face.',
   existing_cave={'crack': [22, 25], 'land': [22, 26]}),
]
