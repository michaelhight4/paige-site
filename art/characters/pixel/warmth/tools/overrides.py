# Per-creature manual corrections: '<key>+' boxes force crystal, '<key>-' boxes force NOT crystal.
# Box = (x0, y0, x1, y1) in native sprite pixels, matched against component centroid.
# 'default': 'crystal' | 'other' replaces the shape heuristic for that creature.
def P(x, y, r=2): return (x - r, y - r, x + r, y + r)
OVR = {
 'tumbloam': {'ow_right+': [P(7, 52)]},
 'burrowmane': {'battle_front+': [P(119, 98)], 'ow_left+': [P(58, 52)], 'ow_right+': [P(5, 52)]},
 'bastonox': {'battle_front+': [P(145, 118)]},
 'cindrip': {'ow_left+': [P(57, 51)], 'ow_right+': [P(6, 51)]},
 'emberlunx': {'ow_left+': [P(59, 46)], 'ow_right+': [P(4, 45)], 'ow_up+': [P(32, 55)]},
 'forgeharrow': {'battle_back+': [P(50, 82)], 'ow_down+': [P(31, 50), P(65, 50)],
                 'ow_left+': [P(61, 45)], 'ow_up+': [P(59, 46)]},
 'rillop': {'ow_down+': [P(31, 56, 3)], 'battle_front-': [P(87, 55)], 'ow_left-': [P(43, 28)], 'ow_left+': [P(56, 53)]},
 'brookhorn': {'battle_front-': [P(81, 71)], 'ow_left+': [P(57, 52)], 'ow_right+': [P(6, 52)],
               'ow_up-': [P(31, 33)]},
 # Tidemarrow: violet wing fins are body membrane; crystals = beads hanging off the coral antlers + tail tip
 'tidemarrow': {'default': 'other',
                'battle_front+': [(0, 0, 159, 52), (135, 125, 159, 150)],
                'battle_back+': [(0, 0, 159, 46), (5, 130, 40, 165)],
                'ow_down+': [(0, 0, 95, 40)], 'ow_left+': [(0, 0, 95, 40), (60, 78, 90, 95)],
                'ow_right+': [(0, 0, 95, 40), (10, 82, 30, 95)], 'ow_up+': [(0, 0, 95, 40), (42, 82, 51, 96)]},
 'sailquill': {'default': 'other',
               'battle_front+': [(100, 75, 127, 110)], 'battle_back+': [(0, 80, 25, 115)],
               'ow_left+': [(44, 40, 63, 63)], 'ow_right+': [(0, 40, 20, 63)], 'ow_up+': [(0, 50, 63, 63)]},
 'halovy': {'default': 'crystal'},
 'gloamtick': {'battle_front+': [(12, 92, 32, 112)], 'battle_front-': [(18, 74, 28, 86)],
               'battle_back-': [(70, 85, 127, 127), (18, 72, 30, 86)],
               'ow_down+': [P(15, 52, 4)], 'ow_left+': [P(16, 53, 4)], 'ow_right+': [P(46, 53, 4)],
               'ow_up+': [(40, 44, 52, 60)]},
 'runeskein': {'default': 'crystal'},
 'burlbeetle': {'default': 'crystal', 'battle_front-': [P(19, 83, 3), P(40, 84, 3)]},
 'mirewump': {'default': 'crystal'},
 'slagrook': {'default': 'crystal', 'battle_back-': [P(92, 50)]},
}
