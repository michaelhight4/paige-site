"""sunmeadow_fields pass 2 (Coder, Oct 30 2026). Two sealed pockets (GD Oct 30 2026: max 2 caves per map; Hay Loft moved to
route_sunmeadow_mirefen, see pass2_specs/route_sunmeadow_mirefen.py), each entered by a small cave, left by a one-way ledge.
2. Clover Dell (north-west cave 13,11; moved from 14,11 off the croft wall) -> dell in the west rock, ledge y31, strip east to the south field.
3. Bee Hollow (north field cave 25,11) -> hollow in the south-east rock, ledge y36, strip west to the south field.
Plus a push boulder (13,22) into a shortcut down the west rock, and three rocks in the big field (R1: no huge empty square)."""
from pass2_spec import P as _P, T, E
M = 'sunmeadow_fields'
def P(*a, **k): return _P(M, *a, main_start=[10, 14], floor_tile_at=[30, 25], floor_tiles=None, **k)
POCKETS = [
 P('smf_pocket_dell', 'sunmeadow_fields_cave_nw', 'Clover Dell', [[14, 25, 22, 30]], [20, 22, 31], [[20, 32], [21, 32], [22, 32], [23, 32]], [12, 11], [18, 24],
   T('r9_smfp_cloverpicker', 14, 25, 'Camper', 'Elin', ['gauzewing', 'galespar', 'torrentpike'],
     'Four-leaf clovers grow only here. I counted. Battle?', 'Lucky you.', 'Ledge down and follow the strip east.'),
   E('r9_smfp_egg_clover', 22, 25, 'a giant clover', 'A clover as big as a plate. It has five leaves. Someone glued one on.'),
   dict(id='r9_smfp_seed', x=14, y=30, item='vigor_seed'),
   'A camper in a clover dell in the west rock; a Vigor Seed is in the clover.',
   map_rocks=[[28, 23], [36, 24], [42, 27]],  # R1 field rocks (were on the Hay Loft entry)
   # push-boulder shortcut from the west pool path down the west rock to the south field (field-skill gate)
   map_cells=[{'x': 13, 'y': 22, 'g': 3, 'd': 0, 'c': 0}] + [{'x': 12, 'y': y, 'g': 3, 'd': 0, 'c': 0} for y in range(22, 38)]
            + [{'x': x, 'y': 37, 'g': 3, 'd': 0, 'c': 0} for x in range(13, 24)] + [{'x': 13, 'y': 22, 'g': 3, 'd': 887, 'c': 5}],
   map_items=[{'id': 'smf_dell_strip_tea', 'x': 20, 'y': 32, 'item': 'calm_tea'}, {'id': 'smf_hollow_strip_mix', 'x': 38, 'y': 37, 'item': 'trail_mix'}]),
 P('smf_pocket_hollow', 'sunmeadow_fields_cave_n', 'Bee Hollow', [[35, 31, 44, 35]], [36, 38, 36], [[34, 37], [35, 37], [36, 37], [37, 37], [38, 37]], [25, 11], [40, 30],
   T('r9_smfp_beekeeper', 44, 31, 'Beekeeper', 'Torvald', ['lancebeetle', 'pharolith', 'stratodrake'],
     'Shh. The bees are asleep. Battle quietly.', 'The bees slept through it.', 'Ledge down and go west.'),
   E('r9_smfp_egg_hive', 35, 30, 'a hive in the rock', 'A hive in the rock wall. It hums. It is humming the Sunmeadow song.'),
   dict(id='r9_smfp_seed_e', x=44, y=35, item='vigor_seed'),
   'A beekeeper in a hollow in the south-east rock; a Vigor Seed sits by the hive.',
   map_items=[{'id': 'smf_hollow_seed_visible', 'x': 41, 'y': 33, 'item': 'vigor_seed', 'hidden': False}]),  # R6 (the Hay Loft seed moved with the loft)
]
