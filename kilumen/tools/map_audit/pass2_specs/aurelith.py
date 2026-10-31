"""aurelith pass 2 (Coder, Oct 30 2026). Three sealed pockets in the city's rock border, each entered by a small cave, left by a one-way ledge.
1. Gate Vault (north-west cave 13,6) -> old vault in the west rock, ledge y16, strip east to Ring Street.
2. Signal Loft (north-east cave 74,6) -> signal loft in the east rock, ledge y16, strip west to Ring Street.
3. Old Platform (north plaza cave 62,6) -> a closed rail platform in the east rock, ledge y49, strip west to the canal lane.
Plus a push boulder shortcut and plaza rocks (R1: no huge empty square)."""
from pass2_spec import P as _P, T, E
M = 'aurelith'
def P(*a, **k): return _P(M, *a, main_start=[44, 28], floor_tile_at=[40, 28], floor_tiles=(10893,), **k)
POCKETS = [
 P('aur_pocket_vault', 'aurelith_cave_nw', 'Gate Vault', [[3, 10, 10, 15]], [7, 9, 16], [[7, 17], [8, 17], [9, 17], [10, 17], [11, 17]], [13, 6], [5, 9],
   T('r9_aurp_vaultkeeper', 3, 10, 'Guard', 'Hedda', ['foundrax', 'cragmont', 'stratodrake'],
     'This vault held the city gate keys. Now it holds me. Battle?', 'Fine. The keys are gone anyway.', 'Hop down the ledge to Ring Street.'),
   E('r9_aurp_egg_keyring', 10, 10, 'a giant key ring', 'A key ring as big as a wheel. Not one key fits anything.'),
   dict(id='r9_aurp_crystal', x=3, y=15, item='dominance_crystal_plus'),
   'An old guard in the city gate vault; a Prime Crystal is under the key shelf.',
   # push-boulder shortcut: Rail Boulevard (12,29) down the west lane to the flats
   map_cells=[{'x': 12, 'y': 30, 'g': 10893, 'd': 887, 'c': 5}],
   map_items=[{'id': 'aur_vault_strip_tea', 'x': 8, 'y': 17, 'item': 'calm_tea'}]),
 P('aur_pocket_loft', 'aurelith_cave_ne', 'Signal Loft', [[77, 10, 84, 15]], [78, 80, 16], [[76, 17], [77, 17], [78, 17], [79, 17], [80, 17]], [74, 6], [81, 9],
   T('r9_aurp_signaller', 84, 10, 'Engineer', 'Jory', ['pharolith', 'galespar', 'lancebeetle'],
     'I wave the lamp when a train comes. None has come in years. Battle?', 'Green light. You may pass.', 'Ledge down and head west.'),
   E('r9_aurp_egg_lamp', 77, 10, 'a signal lamp', 'A signal lamp stuck on green. It has been green for nine years.'),
   dict(id='r9_aurp_seed', x=84, y=15, item='vigor_seed'),
   'An old signaller in a loft in the east rock; a Vigor Seed is by the lamp.',
   map_items=[{'id': 'aur_loft_seed_visible', 'x': 81, 'y': 12, 'item': 'vigor_seed', 'hidden': False}, {'id': 'aur_loft_strip_mix', 'x': 79, 'y': 17, 'item': 'trail_mix'}],  # R6
   map_rocks=[[57, 12], [28, 11], [52, 38], [29, 15], [71, 39], [58, 42], [55, 16], [59, 16], [34, 30]]),
 P('aur_pocket_platform', 'aurelith_cave_e', 'Old Platform', [[78, 43, 85, 48]], [79, 81, 49], [[76, 50], [77, 50], [78, 50], [79, 50], [80, 50], [81, 50]], [62, 6], [82, 42],
   T('r9_aurp_porter', 85, 43, 'Porter', 'Ansel', ['cascadorn', 'torrentpike', 'tuskwallow'],
     'Last stop! Well, the stop after the last stop. Battle?', 'All change, then.', 'Drop off the platform edge and go west.'),
   E('r9_aurp_egg_clock', 78, 43, 'a platform clock', 'A platform clock. Both hands point at the snack stand.'),
   dict(id='r9_aurp_crystal_e', x=85, y=48, item='dominance_crystal_plus'),
   'A porter on a closed platform in the east rock; a Prime Crystal is under the bench.',
   map_items=[{'id': 'aur_platform_strip_tea', 'x': 79, 'y': 50, 'item': 'calm_tea'}]),
]
