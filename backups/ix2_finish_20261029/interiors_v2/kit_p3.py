"""Interiors kit pass 3 (Oct 28, 2026, DEV behind ?ix2=1): house_1f starter-house redo in the pass-2 style.
Browner wood with narrower boards, raised tables, criss-cross rush seats, baked down-right shadow (palette-check-safe:
only the allowed SHADOW rgba(26,18,38,96), dithered at the soft edge). Adds pieces to kit.KIT then runs kit.build().
Run: python3 tools/interiors_v2/kit_p3.py   (then python3 tools/interiors_v2/build_house_v2.py)"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from draw_lib import *
import kit, p3_test3, p3_pass2
from p3_pass2 import boards, post, booksrow

# browner, less orange ramps (light edge, top, alt board, front, seam/base, outline). No floor/wall codes.
BROWN = {'worn':   [h('d46616'), h('9f4013'), h('561c0e'), h('462c22'), h('2c1a12'), h('191210')],
         'normal': [h('e29d40'), h('9f4013'), h('6e222a'), h('561c0e'), h('462c22'), h('2c1a12')]}
def R_(cond): return BROWN['worn' if cond == 'worn' else 'normal']
PAPER = [h('fcf6e8'), h('f8eabe'), h('ccc6c2'), h('a8a0a4')]

def bake(c, dx=2, dy=2):
    """Baked soft shadow, own layer under the piece: solid SHADOW offset (dx,dy) + 1 px dithered fringe."""
    im = c.im; W_, H_ = im.size; a = im.load(); src = [[a[x, y][3] == 255 for x in range(W_)] for y in range(H_)]
    sh = {}
    for y in range(H_):
        for x in range(W_):
            if src[y][x]:
                for ox, oy, soft in ((dx, dy, 0), (dx + 1, dy + 1, 1)):
                    u, v = x + ox, y + oy
                    if 0 <= u < W_ and 0 <= v < H_: sh[(u, v)] = min(sh.get((u, v), 1), soft)
    for (u, v), soft in sh.items():
        if not src[v][u] and (not soft or (u + v) % 2 == 0): a[u, v] = SHADOW; c.pl.putpixel((u, v), 0)
    return c

def paper(c, x, y, w, hh, lines=3, stamp=None):
    c.r(x, y, w, hh, PAPER[0]); c.hl(x, y + hh - 1, w, PAPER[2]); c.vl(x + w - 1, y, hh, PAPER[2])
    for i in range(lines): c.hl(x + 2, y + 3 + i * 3, w - 4 - (i % 2) * 3, PAPER[3])
    if stamp: c.r(x + w - 7, y + 2, 5, 3, stamp)

def p_bookshelf3(cond, col):   # 1x2. worn = test3 worn (Gary-approved), normal/fancy = pass-2 normal
    return bake(p3_test3.bookshelf(True) if cond == 'worn' else p3_pass2.bookshelf(False))
def p_bookshelf_p2worn(cond, col):  # REJECTED by Gary (Oct 28): kept only so the catalogue records it
    return bake(p3_pass2.bookshelf(True))

def p_table3(cond, col):  # 2x2 raised dining table, thick edge, apron, four legs with a gap under
    R = R_(cond); c = Canvas(128, 128, 2); x, y, w, d = 5, 10, 114, 66; worn = cond == 'worn'
    c.top(); boards(c, x, y, w, d, R, 21, bw=9, vert=True); c.hl(x, y, w, R[0]); c.vl(x, y, d, R[0])
    if worn:
        c.r(x + 6, y + 8, 30, 22, PAPER[2]); paper(c, x + 8, y + 9, 24, 18, 4)                 # job listings paper
        for yy in (y + 13, y + 19): c.r(x + 12, yy, 3, 3, RED[1])                              # circled ads
        paper(c, x + 44, y + 20, 18, 22, 4, RED[1]); paper(c, x + 50, y + 16, 18, 22, 3, RED[2])  # bills + OVERDUE stamp
        c.r(x + 52, y + 18, 14, 3, RED[1])
        c.ell(x + 80, y + 12, 14, 9, R[2]); c.ell(x + 82, y + 13, 10, 6, R[1])                   # water ring
        c.front(); c.r(x + 84, y + 30, 12, 14, h('fcf6e8')); c.r(x + 84, y + 34, 12, 4, RED[1]); c.top(); c.ell(x + 84, y + 27, 12, 5, h('ccc6c2'))  # noodle cup
        c.r(x + 98, y + 40, 6, 1, h('fcd668')); c.r(x + 100, y + 42, 6, 1, h('fcd668'))       # chopsticks
        c.line((x + 20, y + 50), (x + 48, y + 56), R[4])                                       # crack
    else:
        c.r(x + 30, y, 52, d, RED[1]); c.vl(x + 30, y, d, RED[0]); c.vl(x + 81, y, d, RED[2])
        for yy in range(y + 3, y + d, 6): c.hl(x + 33, yy, 46, RED[2])
        c.ell(x + 40, y + 24, 30, 18, CREAM[0]); c.ell(x + 44, y + 27, 22, 10, GOLD[0])
    c.front(); c.r(x, y + d, w, 7, R[1]); c.hl(x, y + d, w, R[0]); c.hl(x, y + d + 6, w, R[4])   # thick top edge
    c.r(x + 4, y + d + 7, w - 8, 8, R[3]); c.hl(x + 4, y + d + 14, w - 8, R[4])              # apron rail
    for k in range(x + 14, x + w - 10, 18): c.vl(k, y + d + 8, 6, R[4])
    for lx in (x + 18, x + w - 26): c.r(lx, y + d + 15, 7, 24, R[4]); c.vl(lx, y + d + 15, 24, R[3])  # back legs
    for lx in (x + 4, x + w - 14): post(c, lx, y + d + 7, 10, 38, R); c.r(lx, y + d + 41, 10, 4, R[4])
    if worn: c.r(x + w - 14, y + d + 45, 10, 3, h('a8a0a4'))                                  # shim
    c.outline(R[5]); return bake(c)

def weave(c, x, y, w, hh, S):
    c.r(x, y, w, hh, S[1])
    for yy in range(y, y + hh):
        for xx in range(x, x + w):
            a, b = (xx + yy) % 4 == 0, (xx - yy) % 4 == 0
            if a and b: c.p(xx, yy, S[3])
            elif a: c.p(xx, yy, S[0])
            elif b: c.p(xx, yy, S[2])

def p_chair3(cond, col):  # 1x1 SIDE view, seat faces RIGHT: tall back post on the left, criss-cross rush seat
    R = R_(cond); c = Canvas(64, 64, 2); worn = cond == 'worn'
    S = [h('fcd668'), h('eea23c'), h('e29d40'), h('9f4013')] if not worn else [h('eea23c'), h('e29d40'), h('d46616'), h('561c0e')]
    c.front(); post(c, 14, 2, 6, 58, R)                                                       # back post
    for yy in (8, 16, 24): c.r(20, yy, 4, 5, R[3]); c.hl(20, yy, 4, R[1])                     # ladder slat ends
    c.r(13, 1, 8, 3, R[2]); c.hl(13, 1, 8, R[0])                                              # finial
    c.top(); weave(c, 20, 30, 30, 9, S); c.hl(20, 30, 30, S[0])
    if worn: c.r(30, 33, 7, 4, R[5]); c.p(31, 34, S[3])                                       # torn rush
    c.front(); c.r(18, 39, 34, 5, R[2]); c.hl(18, 39, 34, R[0]); c.hl(18, 43, 34, R[4])
    post(c, 44, 44, 6, 16, R); c.r(20, 52, 24, 3, R[3]); c.hl(20, 52, 24, R[2])
    if worn: c.r(44, 54, 6, 2, h('a8a0a4'))                                                   # string tie
    c.outline(R[5]); return bake(c)

def p_couch3(cond, col):  # 1x2 SIDE view couch, seat faces RIGHT; worn = patched + throw blanket
    F = kit.FABRIC[col]; R = R_(cond); c = Canvas(64, 128, 2); worn = cond == 'worn'
    c.front(); c.r(8, 18, 16, 92, F[2]); c.vl(8, 18, 92, F[1]); c.r(8, 14, 16, 6, F[1]); c.hl(8, 14, 16, F[0])   # backrest
    c.top(); c.r(24, 24, 28, 82, F[1]); c.vl(24, 24, 82, F[0])
    for yy in (50, 78): c.hl(24, yy, 28, F[3]); c.hl(24, yy + 1, 28, F[2])                    # cushion seams
    c.r(14, 6, 42, 14, F[1]); c.hl(14, 6, 42, F[0]); c.r(14, 106, 42, 10, F[1]); c.hl(14, 106, 42, F[0])  # arms
    c.front(); c.r(52, 24, 6, 84, F[3]); c.r(14, 116, 42, 6, F[3]); c.hl(14, 121, 42, F[4])
    if worn:
        c.top(); c.r(30, 56, 12, 10, kit.FABRIC['purple'][1]); c.dither(30, 56, 12, 10, kit.FABRIC['purple'][2])  # patch
        for k in range(30, 42, 2): c.p(k, 55, PAPER[0]); c.p(k, 66, PAPER[0])                 # stitches
        c.r(28, 84, 20, 18, kit.FABRIC['red'][2])
        for k in range(28, 48, 4): c.vl(k, 84, 18, kit.FABRIC['red'][1])                       # throw blanket
        c.r(34, 30, 10, 12, CREAM[1]); c.hl(34, 30, 10, PAPER[0])                              # pillow
    c.r(16, 122, 4, 4, R[3]); c.r(50, 122, 4, 4, R[3])
    c.outline(F[4]); return bake(c)

def p_crt3(cond, col):  # 1x1 SIDE view CRT on a crate stand, screen faces LEFT (toward the couch)
    R = R_(cond); c = Canvas(64, 64, 2)
    c.front(); boards(c, 14, 34, 36, 26, R, 5, bw=7); c.r(14, 56, 36, 4, R[4])                # crate stand
    c.r(18, 38, 28, 4, R[5])
    c.side(); c.r(26, 10, 26, 22, STEEL[5]); c.r(16, 8, 14, 26, STEEL[4]); c.vl(16, 8, 26, STEEL[2])   # tube + bezel
    c.r(14, 11, 3, 20, BLUE[3]); c.vl(14, 12, 18, BLUE[1])                                    # screen edge, glow
    c.top(); c.hl(16, 8, 36, STEEL[2]); c.line((34, 8), (30, 0), STEEL[4]); c.line((40, 8), (46, 1), STEEL[4])   # rabbit ears
    c.front(); c.r(40, 26, 4, 2, RED[1])
    c.outline(h('191210')); return bake(c)

def p_fridge3(cond, col):  # 1x2 front: rounded old fridge, magnets, overdue notice, photo
    F = kit.FABRIC[col]; c = Canvas(64, 128, 2); worn = cond == 'worn'
    c.top(); c.r(8, 14, 48, 6, F[0]); c.hl(8, 14, 48, PAPER[0])
    c.front(); c.r(8, 20, 48, 104, F[1]); c.vl(8, 20, 104, F[0]); c.r(52, 20, 4, 104, F[2])
    c.hl(8, 56, 48, F[3]); c.hl(8, 57, 48, F[2])                                              # freezer seam
    c.r(46, 30, 3, 18, STEEL[3]); c.r(46, 64, 3, 26, STEEL[3]); c.vl(46, 30, 18, STEEL[1]); c.vl(46, 64, 26, STEEL[1])
    paper(c, 14, 62, 20, 24, 5, RED[1]); c.r(22, 60, 4, 4, RED[2])                            # OVERDUE notice + magnet
    paper(c, 16, 26, 14, 12, 2); c.r(18, 28, 10, 6, BLUE[2]); c.r(21, 24, 3, 3, GOLD[0])      # photo + magnet
    paper(c, 30, 92, 14, 18, 4); c.r(35, 90, 4, 4, GREEN[1])                                  # shopping list
    if worn: c.r(10, 106, 6, 4, STEEL[4]); c.p(50, 40, F[3]); c.p(20, 100, F[3])              # rust/dents
    c.r(8, 118, 48, 6, F[3]); c.hl(8, 123, 48, F[4])
    c.top(); c.r(14, 6, 10, 8, PAPER[1]); c.r(16, 3, 6, 3, RED[1]); c.r(30, 8, 12, 6, RED[1]); c.hl(30, 8, 12, RED[0])   # cereal box, noodle packs
    c.outline(F[4]); return bake(c)

def p_side3(cond, col):  # 1x1 side table: coin jar (savings), noodle cups, lamp
    R = R_(cond); c = Canvas(64, 64, 2)
    c.top(); boards(c, 8, 28, 48, 10, R, 3, bw=8, knots=0); c.hl(8, 28, 48, R[0])
    c.front(); c.r(8, 38, 48, 6, R[3]); c.hl(8, 43, 48, R[4]); post(c, 10, 44, 6, 16, R); post(c, 48, 44, 6, 16, R)
    c.r(16, 50, 32, 3, R[4])
    c.r(12, 12, 14, 20, BLUE[0]); c.r(13, 22, 12, 9, GOLD[2]); c.dither(13, 22, 12, 9, GOLD[0]); c.vl(25, 12, 20, BLUE[2])  # coin jar
    c.r(11, 10, 16, 3, STEEL[4]); c.r(15, 15, 6, 2, PAPER[0])
    for k, xx in enumerate((32, 42)): c.r(xx, 22 - k * 4, 9, 10, PAPER[0]); c.r(xx, 25 - k * 4, 9, 3, RED[1]); c.top(); c.hl(xx, 22 - k * 4, 9, CREAM[2]); c.front()
    c.r(48, 14, 2, 14, STEEL[4]); c.r(42, 4, 14, 10, CREAM[1]); c.hl(42, 13, 14, CREAM[3])    # lamp
    c.outline(R[5]); return bake(c)

def p_clock3(cond, col):  # 1x1 wall: clock + small shelf with a plant and a mug
    R = R_(cond); c = Canvas(64, 64, 5)
    c.ell(18, 6, 28, 28, R[3]); c.ell(20, 8, 24, 24, PAPER[1]); c.line((32, 20), (32, 11), h('191210')); c.line((32, 20), (38, 22), h('191210'))
    c.front(); c.r(8, 44, 48, 5, R[1]); c.hl(8, 44, 48, R[0]); c.hl(8, 48, 48, R[4])
    p3_test3.old.plant_small(c, 12, 30); c.r(40, 36, 9, 8, BLUE[2]); c.vl(48, 36, 8, BLUE[3])
    c.outline(R[5]); return bake(c, 2, 2)

def p_cork3(cond, col):  # 1x1 wall: corkboard with job listings, bills, a photo
    R = R_(cond); c = Canvas(64, 64, 5)
    c.r(6, 8, 52, 44, R[2]); c.r(9, 11, 46, 38, h('ccaa6e') if False else h('e29d40')); c.dither(9, 11, 46, 38, h('d46616'))
    paper(c, 12, 14, 16, 18, 4); paper(c, 30, 13, 18, 14, 3, RED[1]); paper(c, 34, 29, 16, 16, 4)
    c.r(14, 34, 12, 10, BLUE[2]); c.r(15, 35, 10, 6, BLUE[0])
    for px, py in ((19, 13), (38, 12), (41, 28), (19, 33)): c.r(px, py, 3, 3, RED[1])
    c.outline(R[5]); return bake(c, 2, 2)

NEW = {
    'bookshelf3':      (p_bookshelf3, 1, 2, ['brown'], False, ['home', 'office', 'inn'], 'block'),
    'bookshelf_p2worn': (p_bookshelf_p2worn, 1, 2, ['brown'], False, [], 'block'),
    'table3':          (p_table3, 2, 2, ['brown'], False, ['home', 'inn'], 'block'),
    'chair3':          (p_chair3, 1, 1, ['brown'], True, ['home', 'inn', 'office'], 'block'),
    'couch3':          (p_couch3, 1, 2, ['teal', 'blue'], True, ['home', 'inn'], 'block'),
    'crt3':            (p_crt3, 1, 1, ['brown'], True, ['home'], 'block'),
    'fridge3':         (p_fridge3, 1, 2, ['teal', 'green'], False, ['home', 'inn'], 'block'),
    'side3':           (p_side3, 1, 1, ['brown'], False, ['home'], 'block'),
    'clock3':          (p_clock3, 1, 1, ['brown'], False, ['home', 'office'], 'wall'),
    'cork3':           (p_cork3, 1, 1, ['brown'], False, ['home', 'office'], 'wall'),
}
# ---- couch v2 (Oct 28, 1:20 AM, Gary: "the couch looks awful"). Chunky 2x2, mustard secondhand + odd olive cushion.
MUST = [h('ccc6c2'), h('a8a0a4'), h('827a84'), h('5e5866'), h('54444e'), h('29252b')]   # taupe secondhand body   # light top .. hue-dark outline
OLIVE = [h('fcd668'), h('eea23c'), h('e29d40'), h('9f4013'), h('561c0e')]   # odd mustard cushion
def rbox(c, x, y, w, hh, col, r=3):
    c.r(x + r, y, w - 2 * r, hh, col); c.r(x, y + r, w, hh - 2 * r, col)
    for k in range(r): c.r(x + r - k, y + k, w - 2 * (r - k), 1, col); c.r(x + r - k, y + hh - 1 - k, w - 2 * (r - k), 1, col)
def cushion(c, x, y, w, hh, F, tufts=True):
    """plump cushion: rounded box, dark rim, mid body, light top-left puff, dark bottom seam, tufts."""
    rbox(c, x, y, w, hh, F[3], 4); rbox(c, x + 1, y + 1, w - 3, hh - 4, F[2], 4); rbox(c, x + 3, y + 2, w - 9, hh - 9, F[1], 3)
    c.hl(x + 6, y + 2, w // 3, F[0]); c.vl(x + 3, y + 5, max(1, hh // 3), F[0])
    if tufts and w > 18:
        for tx in (x + w // 3, x + 2 * w // 3): ty = y + hh // 2 - 1; c.p(tx, ty, F[4]); c.p(tx, ty + 1, F[3]); c.p(tx - 1, ty, F[3])
def patch(c, x, y, w, hh):
    P = kit.FABRIC['teal']; c.r(x, y, w, hh, P[1]); c.dither(x, y, w, hh, P[2]); c.hl(x, y, w, P[0])
    for k in range(x, x + w, 2): c.p(k, y - 1, PAPER[0]); c.p(k + 1, y + hh, PAPER[0])
    for k in range(y, y + hh, 2): c.p(x - 1, k, PAPER[0]); c.p(x + w, k + 1, PAPER[0])
def throw(c, x, y, w, hh):
    T = kit.FABRIC['red']; c.r(x, y, w, hh, T[2])
    for k in range(x, x + w, 4): c.vl(k, y, hh, T[1])
    c.hl(x, y, w, T[0]); c.hl(x, y + hh - 1, w, T[3])
    for k in range(x, x + w, 3): c.vl(k, y + hh, 3, T[1])                                     # fringe
def p_couch_side(cond, col):  # 2x2 SIDE view, seat faces RIGHT. Back on the left, arms at top + bottom ends.
    F = MUST; c = Canvas(128, 128, 2); worn = cond == 'worn'
    c.top(); c.r(20, 18, 30, 92, F[2]); cushion(c, 16, 10, 34, 20, F, False)                 # back top roll
    c.side(); c.r(36, 22, 18, 86, F[3]); c.vl(36, 22, 86, F[2])                               # back inner face
    for ty in range(34, 104, 16): c.p(45, ty, F[5]); c.p(46, ty, F[4]); c.p(45, ty + 1, F[4])  # tufting
    c.top()
    seats = [(26, MUST), (56, OLIVE if worn else MUST), (84, MUST)]
    for sy, CF in seats: cushion(c, 50, sy, 52, 32, CF)
    c.front(); c.r(52, 104, 52, 8, F[3]); c.hl(52, 111, 52, F[4])                            # seat front lip
    c.top(); cushion(c, 14, 4, 96, 24, F, False)                                              # far arm (thick, rounded)
    c.front(); c.r(16, 24, 92, 6, F[3])
    c.top(); cushion(c, 14, 92, 96, 22, F, False)                                             # near arm
    c.front(); c.r(16, 108, 92, 12, F[3]); c.hl(16, 108, 92, F[2]); c.hl(16, 119, 92, F[4])   # near arm front (dark)
    for k in range(24, 104, 12): c.vl(k, 110, 8, F[4])                                         # piping
    c.r(20, 120, 6, 4, h('462c22')); c.r(98, 120, 6, 4, h('462c22'))                           # legs
    if worn:
        c.top(); patch(c, 64, 64, 16, 12)                                                      # stitched patch
        throw(c, 22, 40, 26, 46)                                                               # throw over the back
        c.ell(58, 30, 20, 16, CREAM[1]); c.ell(60, 31, 14, 10, PAPER[0])                       # pillow
        c.front(); c.p(40, 115, F[5]); c.line((70, 112), (76, 116), F[5])                      # scuffs
    c.outline(F[5]); thick_outline(c, F[5], 1); return bake(c)
def p_couch_front(cond, col):  # 2x2 FRONT view: back cushions face the player, seat tops, rounded arms
    F = MUST; c = Canvas(128, 128, 2); worn = cond == 'worn'
    c.front(); c.r(14, 20, 100, 44, F[3]); c.top(); cushion(c, 12, 8, 104, 18, F, False)       # back top roll
    c.front()
    for i, bx in enumerate((22, 54, 84)): cushion(c, bx, 22, 30, 40, OLIVE if (worn and i == 1) else F)
    c.top()
    for i, bx in enumerate((22, 54, 84)): cushion(c, bx, 60, 30, 24, F, False)
    c.front(); c.r(20, 84, 88, 22, F[3]); c.hl(20, 84, 88, F[2]); c.hl(20, 105, 88, F[4])
    for side in (4, 100):
        c.top(); cushion(c, side, 30, 24, 22, F, False); c.front(); c.r(side + 1, 48, 22, 58, F[3]); c.vl(side + 1, 48, 58, F[2]); c.vl(side + 22, 48, 58, F[4])
    c.r(12, 106, 6, 6, h('462c22')); c.r(110, 106, 6, 6, h('462c22'))
    if worn: c.top(); patch(c, 60, 66, 14, 10); throw(c, 86, 24, 22, 50)
    c.outline(F[5]); thick_outline(c, F[5], 1); return bake(c)
NEW['couch_side'] = (p_couch_side, 2, 2, ['mustard'], True, ['home', 'inn'], 'block')
NEW['couch_front'] = (p_couch_front, 2, 2, ['mustard'], False, ['home', 'inn'], 'block')

NAVY = [h('30488c'), h('3e3a48'), h('342842'), h('29252b'), h('1a1226')]   # muted navy: top, front (desat), seam, cool crevice, outer   # top, front, dark seam, cool crevice, outer line
WARM = h('deb478')                                                          # 1px warm top-front highlight
def p_couch_low(cond, col):  # 2x1 FRONT view, faces DOWN. Real scale: ~50px tall (char ~96px), back top ~ waist, low arms.
    N = NAVY; c = Canvas(128, 64, 2); worn = cond == 'worn'; LEG = (h('6a442e'), h('462c22'))
    c.top(); rbox(c, 16, 12, 96, 6, N[0], 2); c.hl(19, 12, 90, WARM)                          # backrest top roll
    c.front(); c.r(16, 18, 96, 12, N[1]); c.hl(16, 29, 96, N[3]); c.hl(16, 28, 96, N[2])       # backrest face, deep base shadow
    for tx in range(28, 104, 16): c.p(tx, 22, N[2]); c.p(tx, 23, N[0])                        # tufts: dark + light below
    c.top(); c.r(22, 30, 84, 12, N[0])                                                        # seat: wide top plane
    for sx in (50, 78): c.vl(sx, 30, 12, N[2])                                                # cushion seams (fabric dark, not black)
    c.hl(22, 41, 84, WARM)                                                                    # warm top-front edge
    c.front(); c.r(20, 42, 88, 12, N[1]); c.hl(20, 53, 88, N[2])
    for sx in (50, 78): c.vl(sx, 42, 11, N[2])
    for ax in (6, 106):                                                                       # low short arms (seat + 4px)
        c.top(); rbox(c, ax, 26, 16, 8, N[0], 2); c.hl(ax + 2, 33, 12, WARM)
        c.front(); c.r(ax, 34, 16, 20, N[1]); c.hl(ax, 53, 16, N[2])
    c.side(); c.vl(22, 30, 24, N[3]); c.vl(23, 30, 12, N[3]); c.vl(105, 30, 24, N[3]); c.vl(104, 30, 12, N[3])   # deep shadow under arms
    for lx in (10, 114, 30, 94): c.front(); c.r(lx, 54, 5, 6, LEG[0]); c.vl(lx + 4, 54, 6, LEG[1])   # stubby wooden legs
    if worn:
        c.top(); patch(c, 58, 33, 12, 6)
        T = kit.FABRIC['red']; c.r(84, 12, 18, 6, T[1]); c.front(); c.r(84, 18, 18, 22, T[2])    # throw over the back
        for k in range(84, 102, 4): c.vl(k, 18, 22, T[1])
        c.hl(84, 39, 18, T[3])
        for k in range(84, 102, 3): c.vl(k, 40, 3, T[1])
        c.p(36, 47, N[2]); c.line((64, 46), (68, 49), N[2])
    c.top(); c.dither(22, 46, 84, 8, BLUE[3], 1); c.dither(30, 50, 68, 4, BLUE[2])          # faint TV glow on seat front
    c.outline(N[4]); return bake(c)
NEW['couch_low'] = (p_couch_low, 2, 1, ['navy'], False, ['home', 'inn'], 'block')

def p_tv_back(cond, col):  # 2x1 flat-screen TV seen from the BACK (screen faces UP toward the couch) on a cheap low media stand
    R = R_(cond); c = Canvas(128, 64, 2); D = [h('3e3a48'), h('342842'), h('29252b'), h('1a1226')]
    c.top(); c.dither(14, 0, 100, 8, BLUE[3]); c.dither(26, 2, 76, 5, BLUE[2]); c.hl(18, 7, 92, BLUE[1])   # soft screen glow spilling up
    c.front(); boards(c, 22, 44, 84, 14, R, 4, bw=21); c.r(22, 56, 84, 3, R[4])                 # low media stand
    c.top(); c.r(22, 41, 84, 4, R[2]); c.hl(22, 41, 84, R[1])
    c.r(24, 59, 4, 4, R[4]); c.r(100, 59, 4, 4, R[4])                                           # stand feet
    c.front(); c.r(16, 9, 96, 28, D[1]); c.hl(16, 9, 96, STEEL[3]); c.vl(16, 9, 28, D[0])        # thin back panel, bright top edge
    c.r(46, 15, 36, 18, D[0]); c.hl(46, 15, 36, STEEL[4]); c.r(80, 15, 2, 18, D[2])             # centre bump
    for k in range(50, 78, 4): c.hl(k, 20, 2, D[3]); c.hl(k, 24, 2, D[3])                       # vent slots
    c.r(58, 37, 12, 5, D[2]); c.r(52, 40, 24, 2, D[1])                                           # stand foot
    c.p(64, 29, BLUE[1])                                                                          # power LED
    c.line((70, 32), (74, 42), D[3]); c.line((74, 42), (112, 52), D[3]); c.line((112, 52), (116, 63), D[3])   # cable down to the outlet
    c.outline(D[3]); return bake(c)
NEW['tv_back'] = (p_tv_back, 2, 1, ['brown'], False, ['home'], 'block')

def p_crt3_back(cond, col):  # 1x1 BACK view CRT on a crate: screen faces UP (toward the couch), back casing toward the player
    R = R_(cond); c = Canvas(64, 64, 2)
    c.top(); c.dither(8, 0, 48, 8, BLUE[3]); c.dither(14, 2, 36, 4, BLUE[2])                   # faint screen glow spilling up onto floor/couch
    c.front(); boards(c, 12, 36, 40, 24, R, 5, bw=8); c.r(12, 56, 40, 4, R[4])                # crate stand
    c.top(); c.r(12, 34, 40, 3, R[2])
    c.top(); c.r(8, 6, 48, 6, STEEL[4]); c.hl(8, 6, 48, STEEL[3]); c.hl(10, 5, 44, BLUE[2])  # screen-side bezel top, glow rim
    c.front(); c.r(8, 12, 48, 10, STEEL[5]); c.vl(8, 12, 10, STEEL[4])                        # bezel back face
    c.r(14, 22, 36, 13, STEEL[5]); c.vl(14, 22, 13, STEEL[4]); c.r(44, 22, 6, 13, STEEL[6])   # tapered tube housing
    c.r(23, 30, 18, 4, STEEL[5])
    for k in range(14, 52, 4): c.vl(k, 14, 5, STEEL[6])                                       # vent slots
    for k in range(22, 42, 4): c.hl(k, 25, 2, STEEL[6]); c.hl(k, 28, 2, STEEL[6])
    c.p(30, 32, RED[1])                                                                       # power socket
    c.line((32, 34), (34, 46), h('191210')); c.line((34, 46), (40, 63), h('191210'))          # cable down to the wall socket
    c.top(); c.line((26, 8), (20, 0), STEEL[4]); c.line((38, 8), (44, 1), STEEL[4])           # rabbit ears
    c.outline(h('191210')); return bake(c)
NEW['crt3_back'] = (p_crt3_back, 1, 1, ['brown'], False, ['home'], 'block')
if __name__ == '__main__':
    kit.KIT.update(NEW); cat = kit.build()
    for e in cat:
        if e['piece'] == 'bookshelf_p2worn': e['status'] = 'REJECTED (Gary, Oct 28 2026): pass-2 worn bookshelf; do not use'
        if e['piece'] == 'bookshelf3': e['status'] = 'APPROVED worn = test3.png worn shelf (Gary, Oct 28 2026)' if e['condition'] == 'worn' else 'APPROVED normal = pass-2 normal shelf'
        if e['piece'] in ('couch_front', 'couch_side'): e['status'] = 'REJECTED (Gary, Oct 28 2026 1:30 AM: wrong scale, as tall as characters); use couch_low'
        if e['piece'] == 'couch3': e['status'] = 'REJECTED (Gary, Oct 28 2026: "looks awful"); use couch_side / couch_front'
    json.dump(cat, open('/workspace/quality/dev_notes/kilumen_interiors_kit.json', 'w'), indent=1)
