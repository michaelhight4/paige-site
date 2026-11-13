"""Interiors v2 prototype: house_1f furniture + wall/floor, drop-in (same tile names, indices, 64px cells).
Writes art/world/overworld/tiles_{1,2,3}x/interior_v2.png (+ _n normal maps). Live interior.png is never touched.
Run: python3 tools/interiors_v2/draw_house.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from draw_lib import *
from PIL import Image

W = WOOD  # 0 hi,1 top,2 mid,3 front,4 dark,5 out
# floor/wall-only codes (house recolour ramps): furniture never uses these
F_LT, F_DK, F_SEAM, F_KNOT, F_GR = h('ba8856'), h('92623e'), h('6a442e'), h('c46e2e'), h('87604d')
WP, WP2, WP3, WTAN = h('e8ce92'), h('ecdec4'), h('deb478'), h('ccaa6e')
WDK, WINK = h('6a3019'), h('2c2320')
TOP1, TOP2, TOP3 = h('342842'), h('3e3a48'), h('29252b')

out = {}

def floor_wood():
    c = Canvas(64, 64, 5); joints = [40, 12, 52, 26]
    for i in range(4):
        y = i * 16; c.r(0, y, 64, 16, F_LT)
        for k, gy in enumerate((5, 10)):  # grain streaks
            for x in range((i * 13 + k * 11) % 17, 64, 17): c.hl(x, y + gy + (x // 17 + i) % 2, 5 + (x % 4), F_DK)
        c.hl(0, y + 15, 64, F_SEAM); c.hl(0, y, 64, F_LT)
        j = joints[i]; c.vl(j, y, 15, F_SEAM); c.vl(j + 1, y, 15, F_GR)
        c.p(j - 3, y + 4, F_SEAM); c.p(j - 3, y + 11, F_SEAM); c.p(j + 4, y + 4, F_SEAM); c.p(j + 4, y + 11, F_SEAM)
    c.ell(20, 5, 4, 3, F_KNOT); c.p(21, 6, F_SEAM); c.ell(48, 37, 4, 3, F_KNOT); c.p(49, 38, F_SEAM)
    return c

def rug():
    c = Canvas(64, 64, 5); A, B, L, T, G1, G2 = h('8a4ace'), h('603096'), h('b076ec'), h('246e6c'), h('eea23c'), h('e29d40')
    c.r(0, 0, 64, 64, A)
    for y in range(0, 64, 4): c.hl(0, y, 64, B) if (y // 4) % 4 == 0 else None
    for cx, cy in ((16, 16), (48, 48), (48, 16), (16, 48)):
        for d in range(7):
            c.p(cx - d, cy - 6 + d, L); c.p(cx + d, cy - 6 + d, L); c.p(cx - d, cy + 6 - d, L); c.p(cx + d, cy + 6 - d, L)
        c.r(cx - 1, cy - 1, 3, 3, G1 if (cx + cy) % 64 == 32 else T)
    for x in range(0, 64, 8): c.p(x + 4, 32, G2); c.p(x, 0, T)
    return c

def wall_upper():
    c = Canvas(64, 64, 2); c.r(0, 0, 64, 64, WP)
    for x in (6, 38): c.r(x, 0, 6, 64, WP2); c.vl(x + 6, 0, 64, WP3)
    for x, y in ((24, 16), (56, 40), (24, 48), (56, 8)):
        c.p(x, y - 2, WTAN); c.r(x - 1, y - 1, 3, 1, WTAN); c.p(x - 2, y, WTAN); c.p(x + 2, y, WTAN); c.r(x - 1, y + 1, 3, 1, WTAN); c.p(x, y + 2, WTAN)
    c.r(0, 0, 64, 5, F_LT); c.hl(0, 0, 64, WTAN); c.hl(0, 5, 64, F_GR); c.hl(0, 6, 64, WP3)
    return c

def wall_face():
    c = Canvas(64, 64, 2); c.r(0, 0, 64, 30, WP)
    for x in (6, 38): c.r(x, 0, 6, 30, WP2); c.vl(x + 6, 0, 30, WP3)
    c.r(0, 28, 64, 4, F_LT); c.hl(0, 28, 64, WP2); c.hl(0, 31, 64, F_KNOT)           # chair rail
    c.r(0, 32, 64, 22, F_DK)                                                           # wainscot
    for x in (3, 35):
        c.r(x, 35, 26, 16, F_DK); c.hl(x, 35, 26, WDK); c.vl(x, 35, 16, WDK)          # recessed panel: dark top/left
        c.hl(x, 50, 26, WP3); c.vl(x + 25, 35, 16, WP3); c.r(x + 3, 38, 20, 10, F_KNOT); c.hl(x + 3, 38, 20, F_LT)
    c.hl(0, 53, 64, WDK); c.r(0, 54, 64, 8, WDK); c.hl(0, 54, 64, F_KNOT)            # baseboard
    c.r(0, 62, 64, 2, WINK)
    return c

def wall_top():
    c = Canvas(64, 64, 1); c.r(0, 0, 64, 64, TOP1); c.dither(0, 0, 64, 52, TOP2)
    for x in range(0, 64, 16): c.vl(x, 0, 52, TOP3)
    c.r(0, 52, 64, 8, F_GR); c.hl(0, 52, 64, F_LT); c.r(0, 60, 64, 4, F_SEAM); c.hl(0, 63, 64, WINK)
    return c

def box(c, x, y, w, hh, top_h, R, side=6):
    """3/4 box: top face (R[1], R[0] lit edge), front (R[3]), right side panel (R[4])."""
    c.top(); c.r(x, y, w, top_h, R[1]); c.hl(x, y, w, R[0]); c.vl(x, y, top_h, R[0])
    c.front(); c.r(x, y + top_h, w - side, hh - top_h, R[3]); c.hl(x, y + top_h, w - side, R[4])
    c.side(); c.r(x + w - side, y + top_h, side, hh - top_h, R[4])

def books(c, x, y, w, hh, seed):
    cols = [RED[1], BLUE[2], GREEN[2], GOLD[1], PURP[2], TEAL[1], PINK[2], RED[2], BLUE[3], GREEN[1]]
    xx = x; k = seed
    while xx < x + w - 2:
        bw = 3 + (k * 7) % 3; bh = hh - (k * 5) % 5
        if xx + bw > x + w: break
        col = cols[k % len(cols)]
        if k % 6 == 4 and xx + bw + 4 < x + w:  # leaning book
            for i in range(bh - 2): c.r(xx + i // 4, y + hh - 1 - i, bw, 1, col)
            xx += bw + 4
        else:
            c.r(xx, y + hh - bh, bw, bh, col); c.vl(xx, y + hh - bh, bh, h('fcf6e8') if k % 3 == 0 else col)
            c.hl(xx, y + hh - bh + 3, bw, h('fcd668')); c.vl(xx + bw - 1, y + hh - bh, bh, OUT); xx += bw
        k += 1

def bookcase(R, seed, extra):
    c = Canvas(64, 128, 2); x, y, w, hh = 4, 10, 56, 116
    box(c, x, y, w, hh, 7, R, 6)
    c.front()
    shelves = [(24, 22), (50, 22), (76, 22), (102, 20)]
    for i, (sy, sh) in enumerate(shelves):
        c.r(x + 4, y + sy - sh + 2, w - 14, sh - 2, h('2c1a12')); c.hl(x + 4, y + sy - sh + 2, w - 14, R[5])
        if extra and i == 1: books(c, x + 5, y + sy - sh + 4, 22, sh - 4, seed + i); plant_small(c, x + 34, y + sy - 14)
        elif extra and i == 3: jar(c, x + 7, y + sy - 12); books(c, x + 18, y + sy - sh + 4, w - 28, sh - 4, seed + i)
        else: books(c, x + 5, y + sy - sh + 4, w - 16, sh - 4, seed + i)
        c.r(x + 2, y + sy, w - 8, 3, R[2]); c.hl(x + 2, y + sy, w - 8, R[1])        # shelf lip catches light
    c.r(x, y + 7, 3, hh - 7, R[2])                                                  # lit left stile
    c.top(); plant_small(c, x + 38, y - 8) if not extra else trophy(c, x + 40, y - 9)
    c.outline(); return c

def plant_small(c, x, y):
    c.r(x + 2, y + 8, 8, 6, RED[2]); c.hl(x + 1, y + 8, 10, RED[0]); c.r(x + 7, y + 9, 2, 5, RED[3])
    for dx, dy, col in ((0, 2, GREEN[2]), (5, 0, GREEN[1]), (8, 3, GREEN[2]), (3, 4, GREEN[0])): c.ell(x + dx, y + dy, 5, 5, col)

def jar(c, x, y):
    c.r(x, y, 8, 11, BLUE[1]); c.r(x + 1, y + 2, 2, 7, BLUE[0]); c.r(x, y - 2, 8, 2, W[3]); c.vl(x + 7, y, 11, BLUE[3])

def trophy(c, x, y):
    c.r(x, y, 10, 6, GOLD[0]); c.r(x + 3, y + 6, 4, 3, GOLD[2]); c.r(x + 1, y + 9, 8, 3, W[4]); c.p(x + 2, y + 1, h('fcf6e8'))

def tv():
    c = Canvas(64, 64, 2)
    box(c, 4, 38, 56, 24, 6, W, 6)
    c.front(); c.r(9, 49, 18, 8, W[4]); c.r(32, 49, 18, 8, W[4]); c.r(10, 50, 16, 6, W[2]); c.r(33, 50, 16, 6, W[2]); c.r(17, 52, 3, 2, GOLD[0]); c.r(40, 52, 3, 2, GOLD[0])
    c.r(10, 8, 44, 31, STEEL[6]); c.side(); c.r(50, 8, 4, 31, h('29252b')); c.front()
    c.r(13, 11, 34, 22, BLUE[4]); c.r(14, 12, 32, 20, BLUE[3])
    for i in range(10): c.hl(16 + i, 13 + i, 4, BLUE[1])                              # screen glare
    c.r(30, 24, 14, 6, BLUE[2]); c.hl(13, 34, 34, STEEL[4]); c.p(44, 36, RED[1]); c.p(45, 36, RED[0])
    c.top(); c.hl(10, 8, 44, STEEL[4]); c.r(26, 36, 12, 3, STEEL[5])
    c.outline(); return c

def sofa():  # seen from behind (faces the TV)
    c = Canvas(128, 64, 2); L, M, D, X = TEAL[0], TEAL[1], TEAL[2], TEAL[3]
    c.top(); c.r(14, 6, 100, 12, L); c.hl(14, 6, 100, h('c6ecfa'))                    # seat cushions behind
    c.vl(63, 6, 12, M); c.vl(64, 6, 12, D)
    c.r(4, 10, 14, 10, L); c.r(110, 10, 14, 10, M)                                     # arm tops
    c.r(8, 18, 112, 6, L); c.hl(8, 18, 112, h('c6ecfa'))                              # backrest top roll
    c.front(); c.r(8, 24, 104, 30, M)
    for x in (24, 44, 84, 104): c.p(x, 32, D); c.p(x, 42, D)
    c.r(4, 20, 6, 34, M); c.side(); c.r(112, 20, 12, 34, D); c.front()
    c.hl(8, 50, 104, D); c.r(12, 54, 5, 6, W[4]); c.r(110, 54, 5, 6, W[5]); c.r(62, 54, 4, 5, W[4])
    c.outline(); return c

def chair():  # seen from behind
    c = Canvas(64, 64, 2)
    c.top(); c.r(14, 12, 36, 12, RED[0]); c.hl(14, 12, 36, h('fcf6e8')); c.r(14, 22, 36, 3, RED[1])
    c.front(); c.r(14, 20, 5, 42, W[3]); c.r(45, 20, 5, 42, W[4]); c.r(14, 20, 36, 5, W[2]); c.top(); c.hl(14, 20, 36, W[1]); c.front()
    for x in (23, 31, 39): c.r(x, 25, 3, 18, W[3]); c.vl(x, 25, 18, W[2])
    c.r(14, 42, 36, 4, W[3]); c.hl(14, 42, 36, W[2]); c.r(20, 46, 3, 16, W[4]); c.r(41, 46, 3, 16, W[5])
    c.outline(); return c

def table():
    c = Canvas(128, 64, 2)
    c.top(); c.r(6, 8, 116, 32, W[1]); c.hl(6, 8, 116, W[0]); c.vl(6, 8, 32, W[0])
    for y in (16, 24, 32): c.hl(7, y, 114, W[2])
    c.r(30, 10, 64, 28, RED[1]); c.r(30, 10, 64, 2, RED[0]); c.vl(30, 10, 28, RED[0])     # runner cloth
    for x in range(32, 94, 6): c.p(x, 38, h('fcf6e8'))
    c.front(); c.r(6, 40, 116, 7, W[3]); c.hl(6, 40, 116, W[4]); c.r(10, 47, 6, 15, W[3]); c.r(112, 47, 6, 15, W[4]); c.r(12, 47, 2, 15, W[2])
    c.top()
    c.ell(42, 18, 22, 12, CREAM[2]); c.ell(43, 18, 20, 10, CREAM[0])                        # plate + toast
    c.r(47, 19, 12, 7, W[2]); c.r(48, 20, 10, 5, GOLD[0]); c.hl(48, 20, 10, h('fcf6e8')); c.r(52, 21, 3, 2, h('fcd668'))
    c.front(); c.r(72, 12, 7, 13, CREAM[1]); c.r(73, 15, 5, 9, h('fcf6e8')); c.vl(78, 12, 13, CREAM[3]); c.top(); c.hl(72, 12, 7, BLUE[0])   # milk
    c.front(); c.r(100, 14, 8, 10, BLUE[2]); c.vl(107, 14, 10, BLUE[3]); c.top()                           # vase
    for dx, col in ((-2, PINK[0]), (3, GOLD[0]), (8, PINK[2])): c.ell(100 + dx, 8, 5, 5, col)
    c.r(103, 12, 2, 3, GREEN[2]); c.r(16, 14, 9, 7, CREAM[0]); c.r(18, 15, 5, 4, W[4]); c.r(25, 16, 2, 3, CREAM[2])  # mug
    c.outline(); return c

def counter(kind):
    c = Canvas(64, 128, 2)
    # upper: wall cabinet + backsplash (stands against the wall, overlay row)
    if kind == 'stove':
        c.front(); c.r(8, 8, 48, 22, STEEL[3]); c.r(8, 8, 48, 3, STEEL[2]); c.side(); c.r(50, 11, 6, 19, STEEL[4]); c.front()
        c.r(14, 30, 36, 4, STEEL[5]); c.r(16, 31, 32, 2, GOLD[0])                            # hood + lamp
    else:
        box(c, 2, 4, 60, 34, 4, W, 0); c.front()
        for x in (6, 33): c.r(x, 12, 25, 22, W[3]); c.hl(x, 12, 25, W[2]); c.vl(x, 12, 22, W[2]); c.r(x + (20 if x == 6 else 3), 24, 2, 4, GOLD[0])
        c.hl(2, 37, 60, W[5])
    c.front(); c.r(0, 40, 64, 30, TEAL[0])
    for y in range(40, 70, 6): c.hl(0, y, 64, TEAL[1])
    for y in range(40, 70, 12):
        for x in range(0 if (y // 12) % 2 else 4, 64, 8): c.vl(x, y, 6, TEAL[1])
    for y in range(46, 70, 12):
        for x in range(4 if (y // 12) % 2 else 0, 64, 8): c.vl(x, y, 6, TEAL[1])
    if kind == 'sink':
        c.r(28, 52, 4, 14, STEEL[4]); c.r(28, 52, 12, 3, STEEL[3]); c.r(38, 55, 2, 4, STEEL[4])
    if kind == 'counter':
        c.r(8, 56, 10, 14, PURP[2]); c.r(9, 58, 3, 10, PURP[1]); c.r(20, 60, 8, 10, RED[1]); c.r(21, 60, 6, 2, h('fcf6e8'))
        c.ell(40, 58, 14, 12, CREAM[2]); c.ell(41, 59, 12, 10, CREAM[0])
    # lower cabinet: worktop (top face) + doors (front)
    if kind == 'stove':
        c.top(); c.r(0, 70, 64, 14, STEEL[5]); c.hl(0, 70, 64, STEEL[3])
        for bx in (8, 36): c.ell(bx, 72, 18, 9, h('29252b')); c.ell(bx + 3, 73, 12, 6, STEEL[4])
        c.ell(11, 73, 12, 6, RED[1]); c.ell(14, 74, 6, 3, GOLD[0])                         # lit burner
        c.front(); c.r(38, 62, 16, 12, RED[2]); c.r(38, 62, 16, 3, RED[0]); c.vl(53, 62, 12, RED[3]); c.r(44, 59, 4, 3, STEEL[3])  # pot
        c.r(0, 84, 64, 42, STEEL[4]); c.hl(0, 84, 64, STEEL[3])
        for kx in (8, 20, 32, 44): c.r(kx, 87, 4, 4, h('29252b')); c.p(kx + 1, 87, STEEL[2])
        c.r(6, 94, 46, 26, h('29252b')); c.r(9, 97, 40, 20, h('3a1e60')); c.hl(10, 113, 38, GOLD[1]); c.hl(10, 114, 38, W[2]); c.hl(10, 98, 14, STEEL[5])
        c.r(8, 92, 42, 2, STEEL[2]); c.side(); c.r(56, 84, 8, 42, STEEL[5])
    else:
        c.top(); c.r(0, 70, 64, 12, CREAM[1]); c.hl(0, 70, 64, CREAM[0]); c.hl(0, 81, 64, CREAM[3])
        if kind == 'sink':
            c.r(14, 72, 36, 9, STEEL[4]); c.r(16, 73, 32, 7, STEEL[5]); c.r(18, 75, 28, 4, BLUE[2]); c.hl(19, 75, 10, BLUE[0])
        c.front(); c.r(0, 82, 64, 40, W[3])
        for x in (3, 33): c.r(x, 86, 28, 32, W[2]); c.r(x + 2, 88, 24, 28, W[3]); c.hl(x + 2, 88, 24, W[4]); c.vl(x + 2, 88, 28, W[4]); c.r(x + (24 if x == 3 else 2), 98, 2, 6, GOLD[0])
        c.r(0, 120, 64, 6, W[4])
    c.outline(); return c

def fridge():
    c = Canvas(64, 128, 2)
    c.top(); c.r(6, 10, 52, 7, CREAM[0]); c.hl(6, 10, 52, h('ffffff'))
    c.front(); c.r(6, 17, 44, 109, CREAM[1]); c.r(6, 17, 3, 109, CREAM[0])
    c.side(); c.r(50, 17, 8, 109, CREAM[2]); c.vl(57, 17, 109, CREAM[3]); c.front()
    c.hl(6, 56, 44, CREAM[3]); c.hl(6, 57, 44, CREAM[0])
    c.r(42, 30, 3, 20, STEEL[4]); c.r(42, 64, 3, 26, STEEL[4]); c.vl(42, 30, 20, STEEL[2])
    c.r(14, 26, 6, 6, RED[1]); c.r(24, 34, 9, 11, h('fcf6e8')); c.hl(25, 37, 7, BLUE[2]); c.hl(25, 40, 5, BLUE[2]); c.r(27, 32, 3, 3, BLUE[2])
    c.r(14, 66, 12, 9, h('fcf6e8')); c.r(15, 67, 10, 7, GREEN[1]); c.p(19, 69, GOLD[0])                 # kid drawing
    c.r(6, 120, 44, 6, STEEL[4]); c.outline(); return c

def radio():
    c = Canvas(64, 64, 2)
    box(c, 6, 34, 52, 28, 6, W, 5); c.front(); c.r(10, 46, 34, 8, W[4]); c.r(11, 47, 32, 6, W[2]); c.r(25, 49, 4, 2, GOLD[0])
    c.r(12, 14, 40, 21, RED[1]); c.top(); c.r(12, 12, 40, 4, RED[0]); c.front(); c.side(); c.r(48, 16, 4, 19, RED[3]); c.front()
    for y in range(18, 32, 3): c.hl(15, y, 16, RED[3])
    c.ell(34, 18, 12, 12, CREAM[1]); c.ell(36, 20, 8, 8, GOLD[1]); c.p(40, 21, RED[3]); c.r(35, 31, 2, 2, STEEL[5]); c.r(42, 31, 2, 2, STEEL[5])
    c.line((44, 12), (54, 0), STEEL[4]); c.p(54, 0, STEEL[2])
    c.outline(); return c

def rods():
    c = Canvas(64, 64, 2)
    for i, (x0, col) in enumerate(((10, W[2]), (24, GREEN[2]), (40, RED[1]))):
        c.line((x0 + 10, 60), (x0 + 2 + i * 3, 2), col, 2); c.line((x0 + 11, 60), (x0 + 3 + i * 3, 2), OUT)
        c.ell(x0 + 6, 42, 6, 6, STEEL[3]); c.p(x0 + 7, 43, STEEL[1])
    box(c, 14, 50, 36, 13, 4, [GREEN[0], GREEN[1], GREEN[2], GREEN[3], GREEN[4]], 4); c.front(); c.r(29, 55, 5, 3, GOLD[0])
    c.outline(); return c

def crates():
    c = Canvas(128, 64, 2); K = [h('fcd668'), h('e29d40'), h('d46616'), h('9f4013'), h('561c0e')]
    def crate(x, y, w, hh):
        box(c, x, y, w, hh, 8, K, 6); c.top(); c.r(x + w // 2 - 3, y, 6, 8, CREAM[1]); c.front(); c.r(x + w // 2 - 3, y + 8, 6, 8, CREAM[1])
    crate(6, 20, 50, 42); crate(60, 30, 40, 32); crate(14, 0, 34, 20)
    c.front(); c.r(16, 34, 18, 8, h('fcf6e8')); c.hl(18, 37, 12, OUT); c.hl(18, 39, 8, OUT)
    c.top(); c.r(104, 46, 18, 16, K[1]); books(c, 104, 36, 18, 12, 3); c.front(); c.r(104, 52, 18, 10, K[3]); c.side(); c.r(118, 52, 4, 10, K[4])
    c.top(); c.r(70, 14, 6, 16, CREAM[2]); c.poly([(64, 14), (82, 14), (78, 4), (68, 4)], GOLD[0]); c.hl(68, 4, 10, h('fcf6e8'))  # lamp in a box
    c.outline(); return c

def plant():
    c = Canvas(64, 64, 2)
    c.front(); c.r(20, 40, 24, 20, RED[1]); c.r(20, 40, 4, 20, RED[0]); c.side(); c.r(38, 40, 6, 20, RED[2]); c.top(); c.r(18, 36, 28, 5, RED[0]); c.hl(18, 36, 28, h('fcf6e8'))
    c.r(20, 37, 24, 3, h('462c22'))
    c.front()
    for (x, y, w, hh, col) in ((8, 14, 18, 14, GREEN[3]), (36, 12, 20, 15, GREEN[3]), (16, 2, 16, 20, GREEN[2]), (30, 0, 14, 22, GREEN[2]),
                               (10, 18, 14, 10, GREEN[1]), (24, 8, 14, 18, GREEN[1]), (38, 16, 16, 10, GREEN[2]), (14, 6, 8, 8, GREEN[0]), (28, 4, 6, 8, GREEN[0])):
        c.ell(x, y, w, hh, col)
    for (a, b) in (((32, 36), (20, 12)), ((32, 36), (44, 14)), ((32, 36), (32, 6))): c.line(a, b, GREEN[4])
    c.p(34, 18, PINK[0]); c.p(18, 14, PINK[0]); c.p(46, 20, GOLD[0])
    c.outline(); return c

def mat():
    c = Canvas(64, 64, 5); c.r(6, 8, 52, 48, RED[2]); c.r(10, 12, 44, 40, RED[1]); c.r(14, 16, 36, 32, RED[2])
    for y in range(18, 46, 6): c.hl(16, y, 32, GOLD[1])
    for x in range(6, 58, 3): c.vl(x, 5, 3, CREAM[1]); c.vl(x, 56, 3, CREAM[1])
    c.hl(6, 8, 52, RED[0]); c.vl(6, 8, 48, RED[0]); c.outline(h('6e222a'), False); return c

PIECES = {  # sheet index -> (canvas fn, (col,row) of the 64px cell inside it)
}
def add(names_idx, cv, cols, rows):
    T = cv.tiles(cols, rows)
    for (idx, cx, cy) in names_idx: out[idx] = T[cy][cx]

add([(0, 0, 0)], floor_wood(), 1, 1); add([(3, 0, 0)], rug(), 1, 1)
add([(5, 0, 0)], wall_face(), 1, 1); add([(8, 0, 0)], wall_upper(), 1, 1); add([(11, 0, 0)], wall_top(), 1, 1)
add([(14, 0, 0), (15, 0, 1)], bookcase(W, 1, False), 1, 2)
add([(22, 0, 0), (23, 1, 0)], sofa(), 2, 1); add([(24, 0, 0)], plant(), 1, 1); add([(26, 0, 0)], tv(), 1, 1); add([(27, 0, 0)], chair(), 1, 1)
add([(158, 0, 0), (159, 0, 1)], fridge(), 1, 2)
add([(160, 0, 0), (161, 0, 1)], counter('counter'), 1, 2); add([(162, 0, 0), (163, 0, 1)], counter('sink'), 1, 2); add([(164, 0, 0), (165, 0, 1)], counter('stove'), 1, 2)
add([(166, 0, 0), (167, 0, 1)], bookcase([h('d46616'), h('9f4013'), h('a23432'), h('561c0e'), h('462c22'), h('2c1a12')], 4, True), 1, 2)
add([(168, 0, 0)], radio(), 1, 1); add([(169, 0, 0)], rods(), 1, 1); add([(170, 0, 0), (171, 1, 0)], crates(), 2, 1)
add([(176, 0, 0), (177, 1, 0)], table(), 2, 1); add([(186, 0, 0)], mat(), 1, 1)

def build():
    OW = os.path.join(ROOT, 'art/world/overworld')
    base = Image.open(os.path.join(OW, 'tiles_1x/interior.png')).convert('RGBA')
    sheet = base.copy(); nsheet = Image.new('RGBA', base.size, (0, 0, 0, 0))
    for idx, (rgba, pl) in out.items():
        rgba = snap(rgba.copy()); x, y = (idx % 16) * 64, (idx // 16) * 64
        sheet.paste((0, 0, 0, 0), (x, y, x + 64, y + 64)); sheet.paste(rgba, (x, y)); nsheet.paste(normal_map(rgba, pl), (x, y))
    for s in (1, 2, 3):
        d = os.path.join(OW, f'tiles_{s}x')
        big = Image.open(os.path.join(d, 'interior.png')).convert('RGBA') if s > 1 else sheet
        if s > 1:
            for idx in out:
                x, y = (idx % 16) * 64, (idx // 16) * 64
                cell = sheet.crop((x, y, x + 64, y + 64)).resize((64 * s, 64 * s), Image.NEAREST)
                big.paste((0, 0, 0, 0), (x * s, y * s, (x + 64) * s, (y + 64) * s)); big.paste(cell, (x * s, y * s))
        big.save(os.path.join(d, 'interior_v2.png'))
        nsheet.resize((nsheet.width * s, nsheet.height * s), Image.NEAREST).save(os.path.join(d, 'interior_v2_n.png'))
    print('redrawn cells:', sorted(out))
    return sheet, nsheet

if __name__ == '__main__': build()
