# New prop tiles for World Design (appended LAST in build.py -> no id shifts).
# i_company_terminal: Revival Tech company terminal (heal branches, interact spot company_terminal). Exact palette.hex pixels, hand-placed.
# Furniture-colour rule: none of its codes are heal-branch floor/wall codes (checked by tools/furniture_colours.py).
# Lamp rule: the screen is NOT a light (only lamps, lit windows and the violet crystal accent keep light at night),
# so the screen uses non-glow blues and has no emissive mask; the small crystal mark is the brand's violet crystal accent, as on i_counter_rt_*.
import numpy as np
from PIL import Image
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16
H = lambda h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
SHADOW = (26, 18, 38, 96)

def company_terminal():
    a = np.zeros((64, 64, 4), np.uint8)
    def rect(x0, y0, x1, y1, c): a[y0:y1 + 1, x0:x1 + 1] = H(c)
    def dith(x0, y0, x1, y1, c1, c2, t=0.5):   # Bayer mix (absolute pixel phase like the kit)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): a[y, x] = H(c2 if B4[y % 4, x % 4] < t else c1)
    a[58:62, 8:57] = SHADOW                                   # soft ground shadow (partial alpha: not a colour code)
    # cabinet (body) x10..53, y30..59
    rect(10, 30, 53, 59, '000000'); dith(11, 31, 52, 58, '3e3a48', '29252b', 0.3)
    rect(11, 31, 13, 58, '54444e'); rect(11, 31, 52, 32, '54444e')     # lit left edge + top lip
    rect(11, 41, 52, 43, '3a1e60'); rect(11, 41, 52, 41, '342842')     # brand band (dark violet, no glow)
    # crystal mark on the band + chevrons (brand accent, same family as i_counter_rt_*)
    for i, w in enumerate((1, 3, 5, 5, 3, 1)): rect(32 - w // 2, 45 + i, 32 + w // 2 - (0 if w > 1 else 0), 45 + i, '8a4ace')
    rect(31, 46, 31, 48, 'd6acff'); rect(32, 47, 32, 50, '603096')
    for k, y in enumerate((53, 55)):
        for d in range(5): a[y + (0 if d in (0, 4) else 0) - (1 if d == 2 else 0), 30 + d] = H('8a4ace')
    rect(46, 34, 48, 35, '52983a'); rect(46, 37, 48, 38, 'd05440')    # status lights (paint, not lights)
    rect(16, 35, 40, 37, '1a1226')                                    # card slot
    rect(17, 36, 39, 36, '342842')
    # desk slab / keyboard x6..57, y24..30
    rect(6, 24, 57, 30, '000000'); rect(7, 25, 56, 27, '827a84'); rect(7, 28, 56, 29, '54444e')
    for x in range(10, 54, 4): rect(x, 25, x + 2, 26, '3e3a48')
    rect(24, 27, 39, 27, '3e3a48')
    # monitor x13..50, y2..24
    rect(13, 2, 50, 24, '000000'); rect(14, 3, 49, 23, '3e3a48'); rect(14, 3, 49, 3, '827a84'); rect(14, 3, 14, 23, '54444e')
    rect(17, 5, 46, 20, '000000'); dith(18, 6, 45, 19, '1e4078', '30488c', 0.25)   # screen
    rect(18, 6, 45, 7, '4a70ba'); rect(20, 6, 27, 6, 'c6ecfa')                      # header bar + title
    for y, w in ((10, 18), (12, 23), (14, 14), (16, 20)): rect(20, y, 20 + w, y, '7ac2e8')
    rect(38, 16, 39, 17, 'c6ecfa')                                                   # cursor
    rect(42, 9, 44, 11, '4692ce'); rect(43, 10, 43, 10, 'c6ecfa')                    # app icon
    rect(28, 21, 35, 22, '29252b')                                                   # chin/badge plate
    rect(30, 21, 33, 21, '8a4ace')
    return Image.fromarray(a, 'RGBA')

def register(reg):
    return reg('i_company_terminal', 'interior', company_terminal(), 'block', raw=True,
        notes='Revival Tech company terminal (storage / company tasks), heal branches. Solid; read by facing it and pressing A (interact spot company_terminal). '
              'Furniture: never recoloured; palette.hex only; no emissive (screen is not a lamp).')
