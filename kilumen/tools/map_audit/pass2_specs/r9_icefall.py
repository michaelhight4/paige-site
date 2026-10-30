"""r9_icefall pass 2 pocket (Coder, Oct 30 2026): one sealed ice gallery above the upper shelf."""
from pass2_spec import P as _P, T, E
M = 'r9_icefall'
def P(*a, **k): return _P(M, *a, main_start=[15, 18], floor_tiles=[29, 30, 31, 32], **k)
POCKETS = [
 P('if_pocket_gallery', 'r9_icefall_cave_n', 'Rime Gallery', [[10, 1, 17, 3]], [11, 16, 4], [], [13, 10], [14, 1],
   T('r9_ifp_rimer', 11, 2, 'Ice Cutter', 'Maren', ['cragmont', 'gauzewing', 'galespar'],
     'The falls freeze from the top down. Up here is where it starts.', 'The ice cracked first. Then me.', 'Hop down the ledge. The shelf below takes you back.'),
   E('r9_ifp_egg_sculpture', 17, 1, 'an ice sculpture of a tiny Kilu', 'A tiny Kilu carved in ice. Someone gave it a scarf made of real wool.'),
   dict(id='r9_ifp_crystal', x=10, y=3, item='dominance_crystal_plus'),
   'An ice cutter who works the frozen top of the falls; a Prime Crystal is frozen in the gallery floor.',
   map_items=[{'id': 'r9_ifp_seed_visible', 'x': 16, 'y': 3, 'item': 'vigor_seed', 'hidden': False}]),  # R6: seen from the upper shelf over the ledge
]
