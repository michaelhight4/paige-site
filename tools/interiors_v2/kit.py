"""Kilumen interior KIT v1 (Oct 28, 2026, DEV, behind ?ix2=1). Original art drawn in code; Stardew is the minimum bar.
Every piece = base design x condition (worn / normal / fancy) x colour swap, on the 64 px grid with shared conventions:
  - footprint w x h cells; for h = 2 the TOP cell goes on the overlay layer, the BOTTOM cell is the blocked base;
  - the anchor is the bottom-left cell; 3 px dark baseline on the bottom edge (contact), 2 px outline, top-left light;
  - side-facing pieces come in _r (faces right) and _l (mirror, faces left).
Writes art/world/overworld/tiles_{1,2,3}x/ix2_kit.png (+ _n), art/world/overworld/tileset_ix2.json and
/workspace/quality/dev_notes/kilumen_interiors_kit.json (catalogue). Run: python3 tools/interiors_v2/kit.py"""
import os, sys, json, math, random
sys.path.insert(0, os.path.dirname(__file__))
from draw_lib import *
from PIL import Image, ImageOps

# wood ramps (6 steps, light -> outline). None of these are house floor/wall codes.
WOODS = {
    'worn':   [h('e29d40'), h('d46616'), h('9f4013'), h('561c0e'), h('462c22'), h('191210')],
    'normal': [h('eea23c'), h('e29d40'), h('d46616'), h('9f4013'), h('561c0e'), h('2c1a12')],
    'fancy':  [h('f08868'), h('d05440'), h('a23432'), h('6e222a'), h('462c22'), h('191210')],
}
FABRIC = {  # 5 steps light -> dark
    'teal':   [h('c6ecfa'), h('70cab8'), h('3e9c92'), h('246e6c'), h('18382c')],
    'red':    [h('f08868'), h('d05440'), h('a23432'), h('6e222a'), h('2c1a12')],
    'purple': [h('d6acff'), h('b076ec'), h('8a4ace'), h('603096'), h('3a1e60')],
    'green':  [h('a6d460'), h('78ba48'), h('52983a'), h('367634'), h('24522e')],
    'blue':   [h('c6ecfa'), h('7ac2e8'), h('4692ce'), h('2c64a8'), h('1e4078')],
}
TRIM = {'worn': STEEL[4], 'normal': GOLD[2], 'fancy': GOLD[0]}
CONDS = ('worn', 'normal', 'fancy')
LINE = h('191210')

def scuffs(c, x, y, w, hh, R, seed, n=6):
    """worn: light scratches + chipped dark nicks + a missing-paint patch."""
    rnd = random.Random(seed)
    for _ in range(n):
        sx, sy = x + rnd.randrange(w), y + rnd.randrange(hh); ln = rnd.randrange(3, 8); d = rnd.choice((-1, 1))
        for i in range(ln): c.p(sx + i, sy + (i * d) // 3, R[1])
    for _ in range(n // 2): c.p(x + rnd.randrange(w), y + rnd.randrange(hh), R[5])

def polish(c, x, y, w, R):
    """fancy: a polished specular streak + gold inlay line."""
    c.hl(x + 3, y + 1, max(1, w // 3), h('fcf6e8')); c.hl(x + 3 + w // 3 + 2, y + 1, 2, h('fcf6e8'))

def panel_door(c, x, y, w, hh, R, cond, knob_side='r'):
    c.r(x, y, w, hh, R[3]); c.hl(x, y, w, R[4]); c.vl(x, y, hh, R[4]); c.hl(x, y + hh - 1, w, R[2]); c.vl(x + w - 1, y, hh, R[2])
    grain(c, x + 3, y + 3, w - 6, hh - 6, R, seed=x * 7 + y, vertical=True, knots=0, base=R[2])
    c.hl(x + 3, y + 3, w - 6, R[4]); c.vl(x + 3, y + 3, hh - 6, R[4])
    if cond == 'fancy': c.r(x + 5, y + 5, w - 10, 1, GOLD[1]); c.r(x + 5, y + hh - 6, w - 10, 1, GOLD[1])
    kx = x + w - 6 if knob_side == 'r' else x + 3
    knob(c, kx, y + hh // 2 - 1, GOLD if cond != 'worn' else [STEEL[2], STEEL[3], STEEL[4]])
    hinge(c, x if knob_side == 'r' else x + w - 2, y + 3); hinge(c, x if knob_side == 'r' else x + w - 2, y + hh - 7)
    if cond == 'worn': scuffs(c, x + 3, y + 3, w - 6, hh - 6, R, x + y, 2)

def slab(c, x, y, w, hh, top_h, R, cond, side=6, grainy=True):
    """3/4 wooden slab/box: grained top, front, darker side, lit front edge."""
    c.top(); grain(c, x, y, w, top_h, R, seed=x + 3 * y, knots=1 if grainy and cond == 'worn' else 0, base=R[1])
    c.hl(x, y, w, R[0]); c.vl(x, y, top_h, R[0])
    if cond == 'fancy': polish(c, x, y, w, R)
    c.front(); c.r(x, y + top_h, w - side, hh - top_h, R[3]); c.hl(x, y + top_h, w - side, R[2]); c.hl(x, y + top_h + 1, w - side, R[4])
    if side: c.side(); c.r(x + w - side, y + top_h, side, hh - top_h, R[4]); c.vl(x + w - side, y + top_h, hh - top_h, R[5])
    c.front()

def finish(c, out=LINE): thick_outline(c, out, 2); return c

# ------------------------------------------------------------------ pieces
def side_seat(c, F, R, cond, y0, y1, seats):
    """Side-on seat, faces RIGHT, seen from 3/4 above: back along the left, cushions as a big top face,
    chunky arms at both ends (the near/bottom arm shows its front face), skirt + feet at the bottom."""
    c.top(); c.r(6, y0, 16, y1 - y0, F[2]); c.vl(6, y0, y1 - y0, F[1]); c.r(6, y0, 16, 4, F[1]); c.hl(6, y0, 16, F[0])      # backrest
    quilt(c, 9, y0 + 6, 11, y1 - y0 - 12, [F[1], F[2], F[2], F[3], F[4]], 6)
    c.vl(21, y0, y1 - y0, F[3])
    n = len(seats); span = (y1 - y0 - 24) // n
    for i in range(n):
        sy = y0 + 12 + i * span
        c.r(22, sy, 32, span - 1, F[1]); c.hl(22, sy, 32, F[0]); c.hl(22, sy + 1, 30, F[0]); c.hl(22, sy + span - 2, 32, F[3]); c.vl(53, sy, span - 1, F[2])
        c.p(37, sy + span // 2, F[3]); c.p(38, sy + span // 2, F[2]); c.p(37, sy + span // 2 - 1, F[0])            # button
    for ay, near in ((y0, False), (y1 - 14, True)):                                                                     # arms
        c.top(); c.r(6, ay, 52, 9, F[1]); c.hl(6, ay, 52, F[0]); c.ell(50, ay - 1, 12, 11, F[1]); c.ell(52, ay, 7, 6, F[0])
        c.front(); c.r(6, ay + 9, 56, 5, F[2]); c.hl(6, ay + 13, 56, F[3])
    c.front(); c.r(6, y1, 56, 4, F[3]); c.hl(6, y1, 56, F[2])
    for fx in (8, 52): c.r(fx, y1 + 4, 5, 4, R[4]); c.p(fx, y1 + 4, R[1])

def p_sofa_side(cond, col):  # 1x2, seen from its side, seat faces RIGHT. Top cell (overlay) = far arm + back cushion.
    c = Canvas(64, 128); F = FABRIC[col]; R = WOODS[cond]
    side_seat(c, F, R, cond, 16, 118, (0, 1))
    P = FABRIC['blue' if col != 'blue' else 'red']
    c.top(); c.r(22, 32, 13, 16, P[1]); c.hl(22, 32, 13, P[0]); c.vl(34, 32, 16, P[3]); quilt(c, 23, 34, 10, 12, P, 4)   # throw pillow
    c.r(28, 74, 22, 14, FABRIC['green'][1] if col != 'green' else FABRIC['red'][1]); c.hl(28, 74, 22, h('fcf6e8'))     # folded blanket
    for x in range(29, 50, 3): c.p(x, 80, FABRIC['green'][3] if col != 'green' else FABRIC['red'][3])
    if cond == 'worn':
        c.top(); c.r(40, 56, 9, 8, FABRIC['purple' if col != 'purple' else 'teal'][2]); [c.p(40 + i, 55, LINE) or c.p(40 + i, 64, LINE) for i in range(0, 9, 2)]  # patch
        c.r(10, 60, 3, 4, h('fcf6e8')); c.p(24, 98, F[4]); c.hl(25, 99, 6, F[3])                                                   # stuffing + sag
    if cond == 'fancy':
        for y in range(24, 112, 5): c.p(6, y, GOLD[0])
        c.front(); c.hl(6, 120, 56, GOLD[1])
    return finish(c)

def p_armchair_side(cond, col):  # 1x1, seat faces RIGHT
    c = Canvas(64, 64); F = FABRIC[col]; R = WOODS[cond]
    side_seat(c, F, R, cond, 2, 54, (0,))
    if cond == 'worn': c.top(); c.r(30, 24, 7, 6, FABRIC['purple' if col != 'purple' else 'teal'][2]); [c.p(30 + i, 23, LINE) for i in range(0, 7, 2)]; c.r(10, 30, 3, 3, h('fcf6e8'))
    if cond == 'fancy': c.front(); c.hl(6, 56, 56, GOLD[0]); [c.p(6, y, GOLD[0]) for y in range(6, 52, 5)]
    c.top(); c.r(24, 16, 10, 10, FABRIC['blue' if col != 'blue' else 'red'][1]); c.hl(24, 16, 10, h('fcf6e8'))
    return finish(c)

def p_tv(cond, col):  # 1x2: top = screen (overlay), bottom = media cabinet on the floor against the wall
    c = Canvas(64, 128); R = WOODS[cond]
    slab(c, 2, 84, 60, 40, 9, R, cond, 6)
    for x in (6, 31): panel_door(c, x, 96, 22, 24, R, cond, 'r' if x == 6 else 'l')
    c.front()
    if cond == 'worn':                                                                # chunky CRT on a scuffed cabinet
        c.top(); c.r(8, 30, 48, 8, STEEL[3]); c.hl(8, 30, 48, STEEL[2])
        c.front(); c.r(8, 38, 48, 46, STEEL[4]); c.r(8, 38, 2, 46, STEEL[3]); c.side(); c.r(50, 38, 6, 46, STEEL[5]); c.front()
        c.r(12, 42, 34, 30, LINE); c.r(14, 44, 30, 26, BLUE[3])
        for y in range(45, 69, 2): c.hl(15, y, 28, BLUE[4])                          # scanlines
        c.r(17, 47, 8, 3, BLUE[1]); c.r(17, 50, 3, 6, BLUE[1])                       # glare
        c.r(46, 46, 3, 3, STEEL[6]); c.r(46, 52, 3, 3, STEEL[6]); c.p(47, 60, RED[0]); c.r(12, 75, 30, 2, STEEL[5])
        c.line((20, 30), (12, 14), STEEL[4]); c.line((40, 30), (50, 12), STEEL[4]); c.p(12, 14, STEEL[2]); c.p(50, 12, STEEL[2])  # rabbit ears
        c.r(26, 26, 10, 4, h('fcf6e8')); c.hl(27, 27, 7, BLUE[2])                     # sticky note on top
    else:
        big = cond == 'fancy'; x0, x1, y0 = (4, 60, 28) if big else (10, 54, 40)
        c.r(x0, y0, x1 - x0, 82 - y0, STEEL[6]); c.r(x0 + 2, y0 + 2, x1 - x0 - 4, 78 - y0 - 4, BLUE[4])
        c.r(x0 + 3, y0 + 3, x1 - x0 - 6, 78 - y0 - 6, BLUE[3]); c.r(x0 + 3, 60, x1 - x0 - 6, 78 - y0 - 6 - (60 - y0 - 3), GREEN[3])  # a show: sky + hills
        c.ell(x0 + 8, 50, 20, 18, GREEN[2]); c.ell(x0 + 22, 54, 24, 16, GREEN[3]); c.r(x1 - 16, y0 + 6, 6, 6, GOLD[0])
        for i in range(8): c.hl(x0 + 4 + i, y0 + 4 + i, 3, BLUE[1])
        c.r(28, 78, 8, 6, STEEL[5]); c.top(); c.hl(x0, y0, x1 - x0, STEEL[4])
        if big:
            for sx in (6, 52):  # soundbar + speakers
                c.front(); c.r(sx, 86 - 0, 6, 0, STEEL[6])
            c.top(); c.r(14, 85, 36, 4, STEEL[6]); c.hl(14, 85, 36, STEEL[4]); c.p(48, 86, BLUE[1])
    c.top(); c.r(40, 86, 10, 5, CREAM[1]); c.r(41, 87, 3, 3, LINE)                       # game console / remote
    c.r(10, 87, 9, 4, RED[1]); c.r(12, 87, 2, 4, h('fcf6e8'))
    return finish(c)

def p_side_table(cond, col):  # 1x1 side table with lamp + books
    c = Canvas(64, 64); R = WOODS[cond]; F = FABRIC[col]
    slab(c, 10, 34, 44, 26, 8, R, cond, 5); panel_door(c, 14, 44, 30, 12, R, cond)
    c.front(); c.r(14, 26, 18, 9, F[2]); c.hl(14, 26, 18, F[1]); c.vl(14, 26, 9, h('fcf6e8')); c.r(16, 21, 14, 5, F[3]); c.hl(16, 21, 14, F[1])  # books
    c.front(); c.r(38, 22, 4, 13, R[4]); c.r(34, 31, 12, 4, R[3]); c.hl(34, 31, 12, R[1])  # lamp stem + base
    c.poly([(30, 22), (50, 22), (46, 4), (34, 4)], GOLD[0] if cond != 'worn' else CREAM[1])
    c.hl(34, 4, 12, h('fcf6e8')); c.line((31, 21), (35, 5), h('fcf6e8')); c.hl(30, 22, 21, GOLD[2] if cond != 'worn' else CREAM[3])
    if cond == 'worn': c.line((44, 8), (47, 16), CREAM[3]); c.r(20, 30, 4, 3, h('fcf6e8'))
    if cond == 'fancy': c.top(); c.r(22, 28, 6, 6, BLUE[2]); c.r(23, 24, 4, 4, PINK[0])   # small vase
    return finish(c)

def p_dining_table(cond, col):  # 2x1 with a bowl of fruit + plates
    c = Canvas(128, 64); R = WOODS[cond]; F = FABRIC[col]
    c.top(); grain(c, 8, 10, 112, 30, R, seed=5, knots=2 if cond == 'worn' else 1, base=R[1]); c.hl(8, 10, 112, R[0]); c.vl(8, 10, 30, R[0])
    for y in (20, 30): c.hl(9, y, 110, R[2])                                           # plank seams
    if cond != 'worn':
        c.r(40, 10, 48, 30, F[1]); c.hl(40, 10, 48, F[0]); c.vl(40, 10, 30, F[0]); c.vl(87, 10, 30, F[2])  # runner
        for x in range(42, 88, 4): c.p(x, 13, F[3]); c.p(x, 36, F[3])
    else: scuffs(c, 10, 12, 108, 26, R, 9, 10); c.ell(92, 30, 9, 5, R[3]); c.ell(93, 31, 7, 3, R[2])  # cup ring
    c.front(); c.r(8, 40, 112, 8, R[3]); c.hl(8, 40, 112, R[2]); c.hl(8, 41, 112, R[4]); c.hl(8, 47, 112, R[5])
    if cond == 'fancy': c.hl(8, 43, 112, GOLD[1])
    for lx in (12, 108): c.r(lx, 48, 7, 14, R[3]); c.vl(lx, 48, 14, R[2]); c.vl(lx + 6, 48, 14, R[5])
    c.top()
    c.ell(54, 14, 22, 14, CREAM[3]); c.ell(55, 14, 20, 11, CREAM[1]); c.ell(57, 16, 16, 7, CREAM[2])     # bowl
    for (fx, fy, fc) in ((58, 10, RED[1]), (64, 9, GOLD[0]), (68, 11, GREEN[1]), (61, 13, RED[0])):
        c.ell(fx, fy, 6, 6, fc); c.p(fx + 1, fy + 1, h('fcf6e8'))
    c.p(65, 8, GREEN[3])
    for px in (16, 96):                                                                 # plates + cutlery
        c.ell(px, 22, 16, 11, CREAM[2]); c.ell(px + 1, 22, 14, 9, CREAM[0]); c.ell(px + 4, 24, 8, 5, CREAM[1])
        c.vl(px - 3, 21, 9, STEEL[3]); c.vl(px + 18, 21, 9, STEEL[3])
    c.r(30, 14, 6, 9, BLUE[1]); c.r(31, 15, 2, 6, h('fcf6e8')); c.hl(30, 14, 6, BLUE[0])  # glass
    return finish(c)

def p_dining_chair(cond, col):  # 1x1, seat faces RIGHT (side view): back post on the left
    c = Canvas(64, 64); R = WOODS[cond]; F = FABRIC[col]
    c.side(); c.r(14, 2, 8, 50, R[3]); c.vl(14, 2, 50, R[1]); c.vl(21, 2, 50, R[4])
    for y in (10, 20, 30): c.r(15, y, 6, 3, R[2]); c.hl(15, y, 6, R[0])                 # back rungs
    c.top(); c.r(13, 0, 10, 4, R[1]); c.hl(13, 0, 10, R[0])
    c.top(); c.r(20, 32, 30, 8, F[1]); c.hl(20, 32, 30, F[0]); quilt(c, 22, 33, 26, 6, F, 4)  # seat cushion
    c.front(); c.r(20, 40, 30, 5, R[3]); c.hl(20, 40, 30, R[2])
    for lx in (16, 44): c.r(lx, 45, 5, 16, R[3]); c.vl(lx, 45, 16, R[1])
    c.hl(20, 54, 24, R[4])
    if cond == 'worn': c.p(18, 14, R[5]); c.line((15, 36), (19, 42), R[0]); c.side(); c.r(30, 34, 6, 3, h('fcf6e8'))
    if cond == 'fancy': c.r(15, 4, 6, 2, GOLD[0]); c.front(); c.hl(20, 43, 30, GOLD[1])
    return finish(c)

def kitchen_upper(c, R, cond, kind):
    if kind == 'fridge': return
    if kind == 'stove':
        c.front(); c.r(8, 8, 48, 22, STEEL[3]); c.r(8, 8, 48, 3, STEEL[2]); c.side(); c.r(50, 11, 6, 19, STEEL[4]); c.front()
        for y in range(14, 28, 3): c.hl(12, y, 34, STEEL[4])
        c.r(14, 30, 36, 4, STEEL[5]); c.r(16, 31, 32, 2, GOLD[0]); return
    slab(c, 2, 4, 60, 34, 4, R, cond, 0)
    for x in (4, 33): panel_door(c, x, 10, 27, 25, R, cond, 'r' if x == 4 else 'l')
    c.hl(2, 37, 60, R[5])

def tilesplash(c, cond):
    T = TEAL if cond != 'fancy' else [h('f8eabe'), h('ccc6c2'), h('a8a0a4'), h('827a84')]
    c.front(); c.r(0, 40, 64, 30, T[0])
    for y in range(40, 70, 6): c.hl(0, y, 64, T[1])
    for y in range(40, 70, 6):
        for x in range(0 if (y // 6) % 2 else 4, 64, 8): c.vl(x, y, 6, T[1])
    for y in range(41, 70, 6):
        for x in range(1 if (y // 6) % 2 else 5, 64, 8): c.p(x, y, h('fcf6e8'))
    if cond == 'worn':
        c.r(44, 46, 6, 5, T[2]); c.line((10, 52), (16, 58), T[2])                     # cracked + missing tile

def p_kitchen(kind):
    def fn(cond, col):
        c = Canvas(64, 128); R = WOODS[cond]
        if kind == 'fridge':
            body = [h('fcf6e8'), h('f8eabe'), h('ccc6c2'), h('a8a0a4'), h('827a84')] if cond != 'fancy' else [h('fcf6e8'), h('ccc6c2'), h('a8a0a4'), h('827a84'), h('54444e')]
            c.top(); c.r(6, 8, 52, 7, body[0]); c.hl(6, 8, 52, h('ffffff') if False else body[0])
            c.front(); c.r(6, 15, 44, 111, body[1]); c.r(6, 15, 3, 111, body[0]); c.side(); c.r(50, 15, 8, 111, body[2]); c.vl(57, 15, 111, body[3]); c.front()
            c.hl(6, 54, 44, body[3]); c.hl(6, 55, 44, body[0])
            c.r(42, 26, 3, 22, body[4]); c.r(42, 62, 3, 28, body[4]); c.vl(42, 26, 22, body[2])
            # magnets, list, kid drawing, photo
            c.r(12, 22, 5, 5, RED[1]); c.r(21, 30, 11, 14, h('fcf6e8')); [c.hl(22, y, 8 - (y % 3), BLUE[2]) for y in range(33, 43, 2)]; c.r(25, 28, 3, 3, GOLD[0])
            c.r(12, 64, 14, 11, h('fcf6e8')); c.r(13, 65, 12, 9, BLUE[1]); c.r(13, 70, 12, 4, GREEN[1]); c.ell(19, 66, 4, 4, GOLD[0])
            c.r(29, 68, 10, 12, CREAM[2]); c.r(30, 69, 8, 8, PINK[0]); c.p(33, 72, LINE); c.p(35, 72, LINE)
            c.top(); c.r(14, 0, 14, 9, GOLD[0] if cond != 'worn' else CREAM[2]); c.hl(14, 0, 14, h('fcf6e8')); c.r(32, 2, 8, 7, GREEN[2])  # cereal box + plant
            c.ell(30, -2, 12, 8, GREEN[1])
            if cond == 'worn': c.line((8, 90), (14, 104), body[3]); c.r(20, 100, 6, 4, GOLD[2])          # dent + rust
            c.r(6, 120, 44, 6, STEEL[5])
            return finish(c)
        kitchen_upper(c, R, cond, kind); tilesplash(c, cond)
        if kind == 'counter':                                                                # canisters, cutting board, bread
            for i, (cx, cc) in enumerate(((6, RED[1]), (14, BLUE[2]), (22, GREEN[2]))):
                c.r(cx, 56 + i, 7, 14 - i, cc); c.r(cx, 54 + i, 7, 2, CREAM[2]); c.vl(cx + 1, 57 + i, 10 - i, h('fcf6e8'))
            c.top(); c.r(32, 62, 26, 9, WOODS['normal'][1]); c.hl(32, 62, 26, WOODS['normal'][0]); c.r(36, 63, 14, 5, GOLD[0]); c.hl(37, 63, 12, h('fcf6e8'))
        if kind == 'sink':
            c.r(26, 50, 4, 16, STEEL[4]); c.r(26, 50, 14, 3, STEEL[3]); c.r(38, 53, 2, 4, STEEL[4]); c.p(39, 58, BLUE[1])
            c.r(6, 58, 8, 12, GREEN[1]); c.r(8, 54, 4, 4, h('fcf6e8'))                          # dish soap
            c.r(48, 52, 12, 18, STEEL[5]); [c.vl(x, 54, 14, STEEL[2]) for x in (50, 53, 56)]    # dish rack
            c.ell(50, 50, 10, 10, CREAM[1])
        c.top()
        if kind == 'stove':
            c.r(0, 70, 64, 14, STEEL[5]); c.hl(0, 70, 64, STEEL[3])
            for bx in (6, 36): c.ell(bx, 72, 20, 10, LINE); c.ell(bx + 3, 73, 14, 7, STEEL[4]); c.ell(bx + 6, 75, 8, 3, STEEL[6])
            c.ell(9, 73, 14, 7, RED[1]); c.ell(12, 75, 8, 3, GOLD[0])
            c.front(); c.r(38, 60, 18, 13, RED[2] if cond != 'fancy' else STEEL[3]); c.r(38, 60, 18, 3, RED[0] if cond != 'fancy' else STEEL[1]); c.vl(55, 60, 13, RED[3]); c.r(44, 56, 6, 3, STEEL[4])
            c.r(56, 64, 7, 2, R[3])
            c.r(0, 84, 64, 42, STEEL[4]); c.hl(0, 84, 64, STEEL[3])
            for kx in (8, 20, 32, 44): c.r(kx, 87, 5, 5, LINE); c.p(kx + 1, 87, STEEL[1]); c.p(kx + 2, 89, STEEL[2])
            c.r(6, 95, 46, 25, LINE); c.r(9, 98, 40, 19, h('3a1e60')); c.hl(10, 114, 38, GOLD[1]); c.hl(10, 99, 14, STEEL[5]); c.r(8, 93, 42, 2, STEEL[2])
            c.r(14, 104, 26, 2, GOLD[2])
            c.side(); c.r(56, 84, 8, 42, STEEL[5])
            if cond == 'worn': c.front(); c.r(30, 120, 10, 3, GOLD[2]); c.p(12, 90, GOLD[2])
        else:
            WT = [h('f8eabe'), h('ccc6c2'), h('a8a0a4')] if cond != 'fancy' else [h('fcf6e8'), h('a8a0a4'), h('54444e')]
            c.r(0, 70, 64, 12, WT[0]); c.hl(0, 70, 64, h('fcf6e8')); c.hl(0, 81, 64, WT[2])
            if cond == 'fancy': [c.p(x, 74 + (x * 7) % 5, WT[1]) for x in range(2, 62, 5)]           # marble veins
            if kind == 'sink': c.r(12, 72, 38, 9, STEEL[4]); c.r(14, 73, 34, 7, STEEL[5]); c.r(16, 75, 30, 4, BLUE[2]); c.hl(17, 75, 12, BLUE[0])
            c.front(); c.r(0, 82, 64, 40, R[3])
            for x in (2, 33): panel_door(c, x, 85, 29, 33, R, cond, 'r' if x == 2 else 'l')
            c.r(0, 120, 64, 6, R[4])
            if cond == 'worn': c.r(4, 82, 8, 2, CREAM[3])
        return finish(c)
    return fn

def books(c, x, y, w, hh, seed):
    rnd = random.Random(seed); cols = [RED, BLUE, GREEN, PURP, TEAL, FABRIC['red'], [GOLD[0], GOLD[1], GOLD[2], h('9f4013')]]
    xx = x
    while xx < x + w - 2:
        bw = rnd.choice((3, 4, 4, 5)); bh = hh - rnd.randrange(0, 6); col = rnd.choice(cols)
        if xx + bw > x + w: break
        if rnd.random() < .12 and xx + bw + 5 < x + w:                                       # leaning book
            for i in range(bh - 2): c.r(xx + i // 4, y + hh - 1 - i, bw, 1, col[1])
            xx += bw + 5; continue
        c.r(xx, y + hh - bh, bw, bh, col[1]); c.vl(xx, y + hh - bh, bh, col[0]); c.vl(xx + bw - 1, y + hh - bh, bh, col[3] if len(col) > 3 else LINE)
        c.hl(xx, y + hh - bh + 2, bw, GOLD[0]); c.hl(xx, y + hh - 3, bw, GOLD[0] if rnd.random() < .5 else col[2])
        if bw >= 4 and bh > 10: c.r(xx + 1, y + hh - bh + 5, bw - 2, 3, h('fcf6e8') if rnd.random() < .4 else col[2])
        xx += bw

def p_bookcase(cond, col):  # 1x2 full bookcase
    c = Canvas(64, 128); R = WOODS[cond]
    slab(c, 3, 6, 58, 120, 7, R, cond, 6)
    c.front(); shelves = [(36, 26), (64, 24), (92, 24), (118, 22)]
    for i, (sy, sh) in enumerate(shelves):
        c.r(7, sy - sh + 2, 44, sh - 2, LINE); c.hl(7, sy - sh + 2, 44, R[5]); c.r(7, sy - sh + 3, 44, 3, R[5])
        if i == 1: books(c, 8, sy - sh + 5, 22, sh - 5, cond + str(i)); c.r(33, sy - 12, 10, 12, BLUE[1]); c.r(34, sy - 10, 3, 8, BLUE[0]); c.r(32, sy - 14, 12, 2, R[3]); c.ell(40, sy - 22, 9, 10, GREEN[1])  # jar + sprig
        elif i == 2: c.r(8, sy - 6, 16, 6, FABRIC['red'][2]); c.r(9, sy - 11, 14, 5, FABRIC['blue'][2]); c.hl(9, sy - 11, 14, FABRIC['blue'][1]); books(c, 26, sy - sh + 5, 24, sh - 5, cond + str(i))   # stacked books
        elif i == 3 and cond == 'worn': books(c, 8, sy - sh + 7, 20, sh - 7, 'w3'); c.r(30, sy - 10, 18, 10, h('ccc6c2')); c.hl(30, sy - 10, 18, h('fcf6e8')); c.p(36, sy - 6, LINE)   # boxed games
        elif i == 3 and cond == 'fancy': c.r(10, sy - 12, 12, 12, GOLD[0]); c.r(13, sy - 16, 6, 4, GOLD[1]); c.p(12, sy - 10, h('fcf6e8')); books(c, 26, sy - sh + 5, 24, sh - 5, 'f3')
        else: books(c, 8, sy - sh + 5, 42, sh - 5, cond + str(i))
        c.r(5, sy, 50, 3, R[2]); c.hl(5, sy, 50, R[0])
    c.r(3, 13, 3, 113, R[2]); c.vl(3, 13, 113, R[1])
    c.top(); c.ell(30, -2, 14, 10, GREEN[2]); c.ell(33, 0, 8, 6, GREEN[1]); c.r(32, 4, 10, 4, RED[2])  # plant on top
    if cond == 'worn': scuffs(c, 5, 14, 50, 108, R, 3, 5); c.top(); c.r(10, 0, 14, 8, CREAM[2]); c.hl(10, 0, 14, CREAM[0])   # box on top
    if cond == 'fancy': c.top(); c.hl(3, 6, 58, GOLD[0])
    return finish(c)

def p_plant_tall(cond, col):  # 1x2 corner plant: pot base + big leafy top
    c = Canvas(64, 128); P = [h('d05440'), h('a23432'), h('6e222a')] if cond != 'fancy' else [h('ccc6c2'), h('a8a0a4'), h('54444e')]
    if cond == 'worn': P = [h('e29d40'), h('d46616'), h('9f4013')]
    c.front(); c.r(18, 94, 28, 30, P[1]); c.r(18, 94, 5, 30, P[0]); c.side(); c.r(40, 94, 6, 30, P[2]); c.front(); c.hl(18, 110, 28, P[2])
    c.top(); c.r(15, 90, 34, 6, P[0]); c.hl(15, 90, 34, h('fcf6e8')); c.r(18, 91, 28, 3, h('462c22'))
    if cond == 'worn': c.line((22, 98), (26, 108), P[2]); c.r(42, 92, 4, 3, h('462c22'))   # chip + crack
    if cond == 'fancy': c.front(); c.hl(18, 100, 28, GOLD[0]); c.hl(18, 116, 28, GOLD[0])
    c.front(); G = GREEN; rnd = random.Random(cond)
    for (a, b) in (((32, 92), (18, 40)), ((32, 92), (46, 36)), ((32, 92), (30, 22)), ((32, 92), (12, 64)), ((32, 92), (52, 62))): c.line(a, b, G[4], 2)
    leaves = [(30, 30, -1.9), (18, 40, -2.6), (44, 36, -0.6), (12, 62, -2.9), (52, 60, -0.2), (24, 54, -2.2), (40, 52, -0.9), (32, 70, -1.6), (20, 76, -2.7), (44, 74, -0.4), (34, 14, -1.5), (26, 20, -2.0), (40, 22, -1.1)]
    for (x, y, a) in leaves:
        R = [G[0], G[1], G[2], G[4]] if rnd.random() < .6 else [G[1], G[2], G[3], G[5]]
        leaf(c, x, y, a, 18 + rnd.randrange(6), 9, R); leaf(c, x, y, a + 3.14 + rnd.uniform(-.4, .4), 10, 7, [G[1], G[2], G[3], G[5]])
    if cond == 'worn': leaf(c, 50, 78, 0.6, 12, 7, [GOLD[0], GOLD[2], h('9f4013'), h('561c0e')])  # yellowing leaf
    return finish(c, h('18382c'))

def p_coat_rack(cond, col):  # 1x2
    c = Canvas(64, 128); R = WOODS[cond]; F = FABRIC[col]
    c.front(); c.r(30, 14, 5, 106, R[2]); c.vl(30, 14, 106, R[0]); c.vl(34, 14, 106, R[4])
    c.r(18, 120, 29, 5, R[3]); c.hl(18, 120, 29, R[1]); c.top(); c.ell(28, 8, 9, 8, R[1]); c.front()
    for (x, y, d) in ((22, 20, -1), (42, 20, 1), (24, 34, -1), (40, 34, 1)): c.line((32, y + 4), (x, y), R[3], 2)
    c.poly([(16, 22), (30, 22), (30, 78), (12, 74)], F[2]); c.vl(16, 22, 52, F[1]); c.line((30, 22), (24, 76), F[3]); c.r(18, 30, 4, 4, F[3]); c.r(18, 48, 4, 4, F[3])  # coat
    c.p(19, 31, GOLD[0]); c.p(19, 49, GOLD[0])
    c.poly([(36, 24), (48, 24), (52, 60), (36, 60)], FABRIC['blue'][2] if col != 'blue' else FABRIC['red'][2]); c.vl(37, 24, 36, FABRIC['blue'][1])  # jacket
    c.top(); c.ell(36, 8, 18, 8, FABRIC['red'][1] if cond != 'fancy' else LINE); c.r(39, 4, 12, 6, FABRIC['red'][2] if cond != 'fancy' else LINE)  # hat
    c.front(); c.line((44, 62), (40, 100), GOLD[2], 2); c.ell(36, 98, 12, 14, GOLD[2] if cond != 'fancy' else h('6e222a')); c.ell(38, 100, 8, 9, GOLD[1] if cond != 'fancy' else h('a23432'))  # bag
    c.line((18, 76), (16, 112), FABRIC['green'][2], 3)                                     # scarf tail
    if cond == 'worn': c.r(14, 60, 5, 5, FABRIC['green'][1])
    return finish(c)

def p_shoes(cond, col):  # 1x1 shoe rack / shoes on a mat
    c = Canvas(64, 64); R = WOODS[cond]
    c.flat(); c.r(4, 28, 56, 30, FABRIC['blue'][3] if cond != 'fancy' else FABRIC['red'][3]); c.hl(4, 28, 56, FABRIC['blue'][2])
    for x in range(6, 58, 4): c.vl(x, 30, 26, FABRIC['blue'][2] if cond != 'fancy' else FABRIC['red'][2])
    def shoe(x, y, S, flip=False):
        c.top(); c.r(x, y, 14, 7, S[1]); c.r(x + (8 if not flip else 0), y - 4, 6, 5, S[1]); c.hl(x, y, 14, S[0]); c.r(x + 2, y + 2, 6, 2, S[2])
        c.front(); c.r(x, y + 7, 14, 3, h('fcf6e8') if S is not None else S[2]); c.hl(x, y + 9, 14, LINE)
    shoe(8, 36, [RED[0], RED[1], RED[3]]); shoe(24, 38, [RED[0], RED[1], RED[3]])
    shoe(40, 34, [h('ccc6c2'), h('827a84'), h('3e3a48')]); shoe(42, 46, [h('ccc6c2'), h('827a84'), h('3e3a48')], True)
    if cond == 'worn': c.top(); c.line((12, 46), (20, 50), h('fcf6e8')); c.r(10, 52, 5, 3, h('6a442e') if False else h('462c22'))  # loose lace + mud
    if cond == 'fancy': c.top(); c.r(22, 20, 22, 8, LINE); c.hl(22, 20, 22, STEEL[3]); c.r(40, 14, 4, 6, LINE)   # boots
    return finish(c)

def p_basket(cond, col):  # 1x1 laundry basket
    c = Canvas(64, 64); R = WOODS['normal'] if cond != 'fancy' else WOODS['fancy']
    c.front(); c.r(12, 30, 40, 28, R[2])
    for y in range(30, 58, 4):
        for x in range(12, 52, 6): c.r(x + (3 if (y // 4) % 2 else 0), y, 3, 2, R[1]); c.p(x + (3 if (y // 4) % 2 else 0), y + 2, R[3])
    c.side(); c.r(46, 30, 6, 28, R[3]); c.top(); c.r(10, 24, 44, 7, R[0]); c.r(13, 26, 38, 3, R[3])
    F = FABRIC[col]; c.top(); c.ell(14, 14, 20, 16, F[1]); c.ell(28, 10, 22, 18, FABRIC['blue'][1]); c.ell(18, 16, 10, 6, F[0]); c.r(36, 16, 4, 12, h('fcf6e8'))  # laundry
    quilt(c, 30, 14, 14, 8, FABRIC['blue'], 4)
    if cond == 'worn': c.front(); c.r(20, 44, 6, 4, LINE); c.line((46, 18), (56, 30), FABRIC['red'][1], 2)  # hole + sock
    return finish(c)

def p_book_stack(cond, col):  # 1x1 floor books + mug
    c = Canvas(64, 64)
    stack = [(10, 50, 40, FABRIC['red']), (12, 43, 36, FABRIC['blue']), (8, 36, 38, FABRIC['green']), (14, 29, 30, FABRIC['purple'])]
    for (x, y, w, F) in stack:
        c.top(); c.r(x, y, w, 3, h('fcf6e8')); c.hl(x, y, w, F[1]); c.front(); c.r(x, y + 3, w, 5, F[2]); c.hl(x, y + 3, w, F[1]); c.r(x + w - 8, y + 4, 4, 3, GOLD[0])
        for i in range(x + 2, x + w - 10, 3): c.p(i, y + 1, CREAM[2])                     # page edges
    c.top(); c.r(46, 38, 10, 8, CREAM[0]); c.r(48, 39, 6, 3, h('561c0e')); c.front(); c.r(46, 46, 10, 12, CREAM[1]); c.r(56, 48, 3, 6, CREAM[2])
    if cond == 'worn': c.top(); c.r(16, 22, 18, 7, FABRIC['teal'][2]); c.line((16, 22), (34, 28), h('fcf6e8'))  # open paperback
    if cond == 'fancy': c.top(); c.r(18, 20, 22, 9, LINE); c.hl(18, 20, 22, GOLD[0])
    return finish(c)

def p_wall_art(cond, col):  # 1x1 framed painting (wall decoration, drawn on a wall cell; no collision change)
    c = Canvas(64, 64); R = WOODS[cond]; F = FABRIC[col]
    fr = GOLD if cond == 'fancy' else [R[1], R[2], R[3]]
    c.front(); c.r(6, 10, 52, 40, fr[1]); c.hl(6, 10, 52, fr[0]); c.vl(6, 10, 40, fr[0]); c.hl(6, 49, 52, fr[2]); c.vl(57, 10, 40, fr[2])
    c.r(11, 15, 42, 30, BLUE[1]); c.r(11, 33, 42, 12, GREEN[2]); c.ell(14, 26, 22, 14, GREEN[3]); c.ell(30, 28, 26, 14, GREEN[1])  # landscape
    c.r(42, 18, 6, 6, GOLD[0]); c.hl(14, 20, 8, h('fcf6e8')); c.hl(18, 21, 6, h('fcf6e8')); c.r(22, 38, 3, 6, h('6a442e') if False else h('561c0e'))
    c.ell(18, 32, 9, 9, GREEN[3]); c.r(30, 41, 20, 2, BLUE[2])
    if cond == 'worn': c.r(6, 10, 52, 40, fr[1]) if False else None; c.line((53, 15), (40, 30), h('fcf6e8'))  # glare
    c.r(30, 4, 4, 6, STEEL[4]) if cond != 'fancy' else c.r(28, 4, 8, 6, GOLD[1])
    if cond == 'worn':  # slightly crooked: shift by redrawing a dark wedge under the right corner
        c.hl(40, 50, 18, SHADOW[:3] + (255,) if False else R[4])
    return finish(c)

def p_photos(cond, col):  # 1x1 photo cluster + calendar
    c = Canvas(64, 64); R = WOODS[cond]
    def frame(x, y, w, hh, fc, inner):
        c.front(); c.r(x, y, w, hh, fc); c.hl(x, y, w, h('fcf6e8') if fc != LINE else STEEL[4]); c.r(x + 2, y + 2, w - 4, hh - 4, inner)
    frame(4, 6, 20, 16, R[2], BLUE[1]); c.ell(8, 10, 6, 6, GOLD[2]); c.ell(14, 9, 6, 6, h('9f4013')); c.r(7, 15, 14, 5, RED[1]); c.r(13, 15, 6, 5, BLUE[2])  # two people
    frame(28, 4, 16, 20, LINE if cond == 'fancy' else CREAM[2], GREEN[1]); c.ell(32, 9, 8, 8, PURP[1]); c.r(31, 16, 10, 6, PURP[2])  # a creature pic
    frame(48, 8, 12, 12, R[3], PINK[0]); c.ell(51, 10, 6, 6, RED[1])
    c.front(); c.r(14, 30, 30, 28, h('fcf6e8')); c.r(14, 30, 30, 7, RED[1]); c.hl(14, 30, 30, RED[0]); c.r(28, 27, 2, 4, STEEL[4])   # calendar
    for yy in range(39, 56, 4):
        for xx in range(16, 42, 5): c.r(xx, yy, 3, 2, h('ccc6c2'))
    c.r(26, 43, 3, 2, RED[1]); c.ell(25, 42, 6, 5, RED[1]); c.r(26, 43, 3, 2, h('fcf6e8'))
    c.r(48, 30, 12, 12, h('fcd668')); c.r(50, 33, 8, 1, BLUE[2]); c.r(50, 36, 6, 1, BLUE[2])         # sticky note
    if cond == 'worn': c.r(4, 46, 8, 10, h('fcf6e8')); c.hl(5, 48, 6, BLUE[2]); c.hl(5, 51, 5, BLUE[2])  # taped bill
    return finish(c)

def p_rug(cond, col):  # 3x3 bordered rug (flat). Border + corner motifs + medallion; worn = faded patch + frayed fringe.
    c = Canvas(192, 192, 5); F = FABRIC[col]; A = FABRIC['red' if col != 'red' else 'blue'] if cond != 'worn' else F
    c.flat(); c.r(6, 8, 180, 176, F[3])
    c.r(10, 12, 172, 168, F[1])                                                           # outer band
    for i in range(14, 178, 6):                                                           # border motif: small diamonds on band
        for (x, y) in ((i, 15), (i, 174), (13, i), (176, i)):
            c.p(x + 1, y, F[0]); c.p(x, y + 1, F[3]); c.p(x + 2, y + 1, F[3]); c.p(x + 1, y + 2, F[0])
    c.r(20, 22, 152, 148, F[3]); c.r(22, 24, 148, 144, F[2])                              # field
    for y in range(24, 168, 4):                                                          # weave texture
        for x in range(22 + (y // 4) % 2 * 2, 170, 4): c.p(x, y, F[3])
    cx, cy = 96, 96
    for d in range(44):                                                                   # central medallion
        w = 44 - d
        c.hl(cx - w, cy - d, 2 * w, A[2] if d % 6 else A[3]); c.hl(cx - w, cy + d, 2 * w, A[2] if d % 6 else A[3])
    for d in range(30):
        w = 30 - d; c.hl(cx - w, cy - d, 2 * w, F[1] if d % 5 else F[0]); c.hl(cx - w, cy + d, 2 * w, F[1] if d % 5 else F[0])
    c.r(cx - 6, cy - 6, 12, 12, A[1]); c.r(cx - 3, cy - 3, 6, 6, GOLD[0])
    for (x, y) in ((30, 32), (152, 32), (30, 150), (152, 150)):                          # corner motifs
        c.r(x, y, 10, 10, A[1]); c.r(x + 3, y + 3, 4, 4, GOLD[0]); c.p(x - 2, y + 4, A[1]); c.p(x + 11, y + 4, A[1]); c.p(x + 4, y - 2, A[1]); c.p(x + 4, y + 11, A[1])
    for x in range(8, 184, 3): c.vl(x, 2, 6, CREAM[1]); c.vl(x, 184, 6, CREAM[1])        # fringe
    if cond == 'worn':
        rnd = random.Random(1)
        for _ in range(260): c.p(rnd.randrange(100, 160), rnd.randrange(110, 165), F[1])   # faded traffic patch
        for x in range(8, 184, 3):
            if rnd.random() < .3: c.vl(x, 2, 6, (0, 0, 0, 0))                                 # missing fringe
        c.r(150, 120, 14, 4, F[0])                                                        # pulled thread
    if cond == 'fancy':
        c.r(18, 20, 156, 2, GOLD[0]); c.r(18, 170, 156, 2, GOLD[0]); c.r(18, 20, 2, 152, GOLD[0]); c.r(172, 20, 2, 152, GOLD[0])
    return c  # flat: no outline

def p_radio(cond, col):  # 1x1 radio on a small cabinet
    c = Canvas(64, 64); R = WOODS[cond]; F = FABRIC[col]
    slab(c, 6, 34, 52, 28, 7, R, cond, 5); panel_door(c, 10, 44, 36, 14, R, cond)
    c.front(); c.r(12, 14, 40, 21, F[1]); c.top(); c.r(12, 11, 40, 4, F[0]); c.side(); c.r(48, 15, 4, 20, F[3]); c.front()
    for y in range(18, 32, 3): c.hl(15, y, 16, F[3])
    c.ell(34, 17, 12, 12, CREAM[1]); c.ell(36, 19, 8, 8, GOLD[1]); c.p(40, 20, RED[3]); c.r(35, 31, 3, 3, STEEL[5]); c.r(42, 31, 3, 3, STEEL[5])
    c.line((44, 11), (54, 0), STEEL[4]); c.p(54, 0, STEEL[2])
    if cond == 'worn': c.r(16, 26, 8, 3, h('fcf6e8')); c.line((18, 14), (24, 22), F[0])
    return finish(c)

def p_crates(cond, col):  # 2x1 moving boxes
    c = Canvas(128, 64); K = [h('fcd668'), h('eea23c'), h('e29d40'), h('d46616'), h('9f4013'), h('561c0e')]
    def crate(x, y, w, hh, lab):
        slab(c, x, y, w, hh, 9, K, 'normal', 6, False); c.top(); c.r(x + w // 2 - 3, y, 6, 9, CREAM[1]); c.front(); c.r(x + w // 2 - 3, y + 9, 6, 10, CREAM[1])
        if lab: c.r(x + 4, y + 16, 16, 9, h('fcf6e8')); c.hl(x + 6, y + 19, 11, LINE); c.hl(x + 6, y + 22, 7, LINE)
        c.p(x + 3, y + hh - 4, K[5]); c.line((x + w - 12, y + 12), (x + w - 9, y + 20), K[4])
    crate(6, 20, 50, 42, True); crate(60, 30, 40, 32, False); crate(14, 0, 34, 20, False)
    c.top(); c.r(104, 46, 18, 16, K[1]); books(c, 104, 34, 18, 13, 'cr'); c.front(); c.r(104, 52, 18, 10, K[3]); c.side(); c.r(118, 52, 4, 10, K[4])
    c.top(); c.r(70, 16, 6, 14, CREAM[2]); c.poly([(64, 16), (82, 16), (78, 5), (68, 5)], GOLD[0]); c.hl(68, 5, 10, h('fcf6e8'))
    if cond != 'fancy': c.top(); c.ell(84, 20, 14, 10, FABRIC['red'][1]); c.ell(86, 22, 8, 5, FABRIC['red'][0])  # rolled blanket
    return finish(c)

def p_rods(cond, col):  # 1x1 fishing rods + tackle box
    c = Canvas(64, 64); R = WOODS[cond]
    for i, (x0, cc) in enumerate(((10, R[2]), (24, GREEN[2]), (40, RED[1]))):
        c.line((x0 + 10, 60), (x0 + 2 + i * 3, 2), cc, 2); c.line((x0 + 11, 60), (x0 + 3 + i * 3, 2), LINE)
        c.ell(x0 + 6, 42, 7, 7, STEEL[3]); c.p(x0 + 7, 43, STEEL[1]); c.p(x0 + 9, 45, STEEL[5])
        for yy in (14, 26): c.p(x0 + 5 + i * 3 - yy // 10, yy, STEEL[2])
    slab(c, 12, 48, 40, 15, 4, [GREEN[0], GREEN[1], GREEN[2], GREEN[3], GREEN[4], GREEN[5]], cond, 4, False); c.front(); c.r(29, 53, 6, 4, GOLD[0]); c.p(30, 54, h('fcf6e8'))
    if cond == 'worn': c.front(); c.line((14, 54), (20, 58), GREEN[0]); c.top(); c.line((50, 20), (56, 30), STEEL[2])
    return finish(c)

# ------------------------------------------------------------------ registry
#  name: (fn, w, h, colours, side_facing, themes, collision)
KIT = {
    'sofa_side':     (p_sofa_side, 1, 2, ['teal', 'red', 'purple'], True, ['home', 'inn', 'office'], 'block'),
    'armchair_side': (p_armchair_side, 1, 1, ['teal', 'red', 'purple'], True, ['home', 'inn', 'office', 'clinic'], 'block'),
    'tv_unit':       (p_tv, 1, 2, ['teal'], False, ['home', 'inn'], 'block'),
    'side_table':    (p_side_table, 1, 1, ['red', 'blue'], False, ['home', 'inn', 'office', 'clinic'], 'block'),
    'dining_table':  (p_dining_table, 2, 1, ['red', 'blue', 'green'], False, ['home', 'inn'], 'block'),
    'dining_chair':  (p_dining_chair, 1, 1, ['red', 'blue', 'green'], True, ['home', 'inn', 'office'], 'block'),
    'kitchen_fridge':  (p_kitchen('fridge'), 1, 2, ['teal'], False, ['home', 'inn', 'lab'], 'block'),
    'kitchen_counter': (p_kitchen('counter'), 1, 2, ['teal'], False, ['home', 'inn'], 'block'),
    'kitchen_sink':    (p_kitchen('sink'), 1, 2, ['teal'], False, ['home', 'inn', 'clinic'], 'block'),
    'kitchen_stove':   (p_kitchen('stove'), 1, 2, ['teal'], False, ['home', 'inn'], 'block'),
    'bookcase':      (p_bookcase, 1, 2, ['teal'], False, ['home', 'office', 'hall', 'lab', 'inn'], 'block'),
    'plant_tall':    (p_plant_tall, 1, 2, ['green'], False, ['home', 'office', 'hall', 'lab', 'shop', 'clinic', 'inn'], 'block'),
    'coat_rack':     (p_coat_rack, 1, 2, ['red', 'green', 'purple'], False, ['home', 'office', 'inn', 'clinic'], 'block'),
    'shoes':         (p_shoes, 1, 1, ['blue'], False, ['home', 'inn'], 'block'),
    'basket':        (p_basket, 1, 1, ['red', 'green'], False, ['home', 'inn', 'shop'], 'block'),
    'book_stack':    (p_book_stack, 1, 1, ['red'], False, ['home', 'office', 'lab'], 'block'),
    'wall_art':      (p_wall_art, 1, 1, ['teal'], False, ['home', 'office', 'hall', 'inn', 'clinic'], 'wall'),
    'photos':        (p_photos, 1, 1, ['teal'], False, ['home', 'office'], 'wall'),
    'rug':           (p_rug, 3, 3, ['purple', 'teal', 'red'], False, ['home', 'inn', 'office', 'hall'], 'walk'),
    'radio':         (p_radio, 1, 1, ['red', 'teal'], False, ['home', 'office', 'shop'], 'block'),
    'crates':        (p_crates, 2, 1, ['red'], False, ['home', 'shop', 'lab'], 'block'),
    'rods':          (p_rods, 1, 1, ['green'], False, ['home'], 'block'),
}

def mirror(c):
    m = Canvas(c.im.width, c.im.height); m.im = ImageOps.mirror(c.im); pl = ImageOps.mirror(c.pl)
    m.pl = pl.point(lambda v: {3: 4, 4: 3}.get(v, v)); return m

ID0, COLS = 9001, 16
def build():
    OW = os.path.join(ROOT, 'art/world/overworld'); cells = []; tiles = []; cat = []
    for name, (fn, w, hh, cols, sidef, themes, coll) in KIT.items():
        for cond in CONDS:
            for col in cols:
                cv = fn(cond, col)
                for face, cc in ((('r', cv), ('l', mirror(cv))) if sidef else ((None, cv),)):
                    key = f'kit_{name}_{cond}_{col}' + (f'_{face}' if face else '')
                    ids = []
                    for cy in range(hh):
                        for cx in range(w):
                            idx = len(cells); cells.append(cc.tiles(w, hh)[cy][cx]); tid = ID0 + idx
                            layer = 'overlay' if (hh == 2 and cy == 0) else 'decoration'
                            walk = coll == 'walk' or layer == 'overlay' or coll == 'wall'
                            tiles.append({'id': tid, 'name': f'{key}_{cy}_{cx}', 'category': 'interior', 'sheet': 'tiles_1x/ix2_kit.png', 'index': idx,
                                          'col': idx % COLS, 'row': idx // COLS, 'walkable': walk, 'collision': 'walk' if walk else 'block',
                                          'collision_code': 0 if walk else 1, 'encounter': False, 'kit': {'piece': name, 'cond': cond, 'colour': col, 'facing': face, 'layer': layer}})
                            ids.append(tid)
                    cat.append({'key': key, 'piece': name, 'condition': cond, 'colour': col, 'facing': face, 'size': f'{w}x{hh}', 'themes': themes,
                                'collision': coll, 'ids_rowmajor': ids, 'layers': 'top row overlay, bottom row decoration' if hh == 2 else ('ground-over (decoration layer, walkable)' if coll == 'walk' else 'decoration')})
    rows = (len(cells) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (COLS * 64, rows * 64), (0, 0, 0, 0)); ns = sheet.copy()
    for i, (rgba, pl) in enumerate(cells):
        rgba = snap(rgba.copy()); x, y = (i % COLS) * 64, (i // COLS) * 64
        sheet.paste(rgba, (x, y)); ns.paste(normal_map(rgba, pl), (x, y))
    for s in (1, 2, 3):
        d = os.path.join(OW, f'tiles_{s}x')
        sheet.resize((sheet.width * s, sheet.height * s), Image.NEAREST).save(os.path.join(d, 'ix2_kit.png'))
        ns.resize((ns.width * s, ns.height * s), Image.NEAREST).save(os.path.join(d, 'ix2_kit_n.png'))
    json.dump({'note': 'Interiors v2 kit (DEV, merged only with ?ix2=1). Generated by tools/interiors_v2/kit.py; do not hand-edit.', 'tiles': tiles},
              open(os.path.join(OW, 'tileset_ix2.json'), 'w'), indent=0)
    json.dump(cat, open('/workspace/quality/dev_notes/kilumen_interiors_kit.json', 'w'), indent=1)
    print('kit pieces', len(cat), 'cells', len(cells))
    return cat

if __name__ == '__main__': build()
