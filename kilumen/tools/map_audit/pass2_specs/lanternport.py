"""lanternport pass 2 (Coder, Oct 30 2026).
1. Signal Ledge: a crack in lanternport_grotto (6,14) drops into a sealed ledge on the town's north wall; ledge back at y11."""
from pass2_spec import P as _P, T, E
M = 'lanternport'
def P(*a, **k): return _P(M, *a, main_start=[25, 22], floor_tile_at=[20, 12], floor_tiles=None, **k)
POCKETS = [
 P('lp_pocket_ledge', 'lanternport_grotto', 'Signal Ledge', [[13, 10, 24, 10]], [16, 18, 11], [], None, [20, 9],
   T('r9_lpp_signaller', 14, 10, 'Signaller', 'Marit', ['cascadorn', 'tuskwallow', 'galespar'],
     'I flash the boats home from up here. You came the long way.', 'Signal received. You win.', 'Drop off the ledge into town.'),
   E('r9_lpp_egg_mirror', 22, 9, 'a cracked signal mirror', 'A cracked signal mirror. It still flashes: HI. It only knows one word.'),
   dict(id='r9_lpp_crystal', x=13, y=10, item='dominance_crystal_plus'),
   'A signaller who flashes boats home from the north ledge; a Prime Crystal hides in the corner.',
   existing_cave={'crack': [6, 14], 'land': [6, 15]},
   map_items=[{'id': 'lp_ledge_seed_visible', 'x': 24, 'y': 10, 'item': 'vigor_seed', 'hidden': False}]),
]
