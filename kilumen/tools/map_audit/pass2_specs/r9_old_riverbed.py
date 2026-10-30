"""r9_old_riverbed pass 2 (Coder, Oct 30 2026).
1. Dry Spring: a cave above the old bank opens into a sealed shelf over the east nook (fills the 9x9 rock block).
2. A rope up at the east end (50,18) goes to r9_cairnfold; a crack at the dry channel (22,25) opens into a cairnfold pocket (see r9_cairnfold spec).
Plus a push boulder shortcut (field skill) at (14,18)."""
from pass2_spec import P as _P, T, E
M = 'r9_old_riverbed'
def P(*a, **k): return _P(M, *a, main_start=[1, 19], floor_tile_at=[25, 12], floor_tiles=None, **k)
POCKETS = [
 P('rb_pocket_spring', 'r9_old_riverbed_cave', 'Dry Spring', [[42, 9, 48, 12]], [43, 47, 13],
   [[x, y] for x in range(43, 48) for y in (14, 15)], [21, 9], [45, 9],
   T('r9_rbp_dowser', 43, 9, 'Dowser', 'Wren', ['torrentpike', 'cascadorn', 'moorcoil'],
     'The river left. The spring stayed. So did I.', 'You found the water and the fight. Lucky day.', 'The ledge drops you by the nook.'),
   E('r9_rbp_egg_cup', 48, 9, 'a tin cup on a nail', 'A tin cup on a nail. Scratched on it: BACK SOON. The dust says otherwise.'),
   dict(id='r9_rbp_crystal', x=48, y=12, item='dominance_crystal_plus'),
   'A dowser who found the spring the river left behind; a Prime Crystal sits in the damp corner.',
   map_cells=[{'x': 14, 'y': 18, 'g': None, 'd': 887, 'c': 5}] + [{'x': x, 'y': 26, 'g': 1, 'd': 0, 'c': 0} for x in range(22, 37)],  # dry channel east of the hollow (R1 filler)
   map_warps=[{'x': 50, 'y': 18, 'to': 'r9_cairnfold', 'tx': 11, 'ty': 33, 'facing': 'down'}],
   map_items=[{'id': 'r9_rbp_bank_mix', 'x': 14, 'y': 16, 'item': 'trail_mix'}, {'id': 'r9_rbp_channel_tea', 'x': 36, 'y': 26, 'item': 'calm_tea'}, {'id': 'r9_rbp_seed_visible', 'x': 42, 'y': 12, 'item': 'vigor_seed', 'hidden': False}]),  # R6: seen over the ledge
]
