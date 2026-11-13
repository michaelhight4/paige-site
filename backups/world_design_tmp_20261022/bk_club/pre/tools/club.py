# The Firefly (club_int): Fernwick juice bar + music hangout (Gary, Oct 22 2026). NOT a bar: no bottles, taps, glasses, smoke (HARD RULE).
# Text ids = Text Bot v0.4.6/0.4.7 exactly (unplaced_npcs rebel_*, unplaced.club_props club_int.<id>). Text stays pending (proposed_spot null upstream).
# Tiles are NEW core tiles registered LATE (after every map is final) so no existing id moves; maps hold placeholders until late().
# Art rules (9:02 PM depth steering): light from top-left, lighter top face, front 1-2 shades darker, right side panel darker again,
# 1px dark outline on bottom/sides, NO baked floor/contact shadow (Coder's engine depth pass casts them). palette.hex colours only.
import numpy as np
from PIL import Image
import build
from build import Map, BYNAME, COLL

T = 64
def H(h): return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
OUTL = H('191210'); INK = H('2c1a12')
WOOD = ('deb478', 'ba8856', '92623e'); TEAL = ('70cab8', '3e9c92', '246e6c'); CREAM = ('fcf6e8', 'ecdec4', 'ccc6c2')
def cv(w=T, h=T): return np.zeros((h, w, 4), np.uint8)
def R(a, x0, y0, x1, y1, c):          # inclusive rect, clipped
    h, w = a.shape[:2]; x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(w - 1, x1), min(h - 1, y1)
    if x1 >= x0 and y1 >= y0: a[y0:y1 + 1, x0:x1 + 1] = H(c) if isinstance(c, str) else c
def P(a, x, y, c):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]: a[y, x] = H(c) if isinstance(c, str) else c
def disc(a, cx, cy, r, c):
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5: P(a, x, y, c)
def outline(a, col=OUTL):
    """1px dark outline round every opaque shape (outside pixels)."""
    s = a[..., 3] > 0; p = np.pad(s, 1); n = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    a[n & ~s] = col; return a
def box(a, x0, y0, x1, y1, top_h, cols, side=6, l_end=True, r_end=True, edge=True):
    """3D block: top face (light) rows y0..y0+top_h-1, front face (1-2 shades darker), right side panel (darker again)."""
    top, front, sidec = cols
    R(a, x0, y0, x1, y0 + top_h - 1, top); R(a, x0, y0 + top_h, x1, y1, front)
    if r_end and side: R(a, x1 - side + 1, y0 + 2, x1, y1, sidec); R(a, x1 - side + 1, y0, x1, y0 + 1, top)
    R(a, x0, y0 + top_h, x1 - (side if r_end else 0), y0 + top_h, sidec)          # crease under the top lip
    if l_end: R(a, x0 + 1, y0 + 1, x0 + 1, y0 + top_h - 2, CREAM[0])             # top-left highlight edge
    if edge:   # 1px dark outline on bottom + open sides
        R(a, x0, y1, x1, y1, OUTL)
        if l_end: R(a, x0, y0, x0, y1, OUTL)
        if r_end: R(a, x1, y0, x1, y1, OUTL)
        R(a, x0 + (1 if l_end else 0), y0, x1 - (1 if r_end else 0), y0, '2c2320')
    return a

# ---------------- pixel font (5x7) for the post-game banner ----------------
FONT = {'F': ['11111', '10000', '11110', '10000', '10000', '10000', '10000'], 'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'], 'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], '.': ['00000'] * 5 + ['01100', '01100'],
        'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], 'L': ['10000'] * 6 + ['11111'],
        'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], ' ': ['00000'] * 7}
def text(a, x, y, s, c, sc=2):
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for k, b in enumerate(row):
                if b == '1': R(a, x + k * sc, y + r * sc, x + k * sc + sc - 1, y + r * sc + sc - 1, c)
        x += 6 * sc
    return x

# ---------------- walls (cap strip + skirting on the WALL tile only) ----------------
def wall_upper():
    a = cv(); R(a, 0, 0, 63, 63, 'f8eabe')
    for x in range(0, 64, 16): R(a, x + 7, 10, x + 7, 63, 'e8ce92')        # soft plaster stripes
    R(a, 0, 0, 63, 5, 'ba8856'); R(a, 0, 0, 63, 1, 'deb478'); R(a, 0, 6, 63, 6, '92623e')   # cap strip, lit top, shade under
    return a
def wall_face():
    a = cv(); R(a, 0, 0, 63, 63, 'f8eabe')
    for x in range(0, 64, 16): R(a, x + 7, 0, x + 7, 25, 'e8ce92')
    R(a, 0, 26, 63, 27, 'ba8856'); R(a, 0, 26, 63, 26, 'deb478')              # chair rail
    R(a, 0, 28, 63, 55, '3e9c92')                                             # teal wainscot
    for x in range(0, 64, 16): R(a, x + 3, 32, x + 12, 51, '52983a' if False else '44' and '70cab8'); R(a, x + 4, 33, x + 12, 51, '3e9c92')
    for x in range(0, 64, 16): R(a, x + 12, 33, x + 12, 51, '246e6c'); R(a, x + 3, 51, x + 12, 51, '246e6c')
    R(a, 0, 56, 63, 63, '6a442e'); R(a, 0, 56, 63, 56, 'ba8856'); R(a, 0, 63, 63, 63, OUTL)   # skirting (wall tile only)
    return a

# ---------------- dance floor (EMISSIVE amber/green, never violet) ----------------
def dance(v):
    a = cv(); R(a, 0, 0, 63, 63, '29252b')
    cols = [('eea23c', 'fcd668'), ('78ba48', 'a6d460')]
    for j in range(2):
        for i in range(2):
            c, hi = cols[(i + j + v) % 2]; x0, y0 = i * 32 + 2, j * 32 + 2
            R(a, x0, y0, x0 + 27, y0 + 27, c); R(a, x0, y0, x0 + 27, y0 + 2, hi); R(a, x0, y0, x0 + 2, y0 + 27, hi)
            R(a, x0 + 11, y0 + 11, x0 + 16, y0 + 16, hi)
    return a

# ---------------- juice counter (one long counter, ends outlined) ----------------
def counter(kind, l_end=False, r_end=False):
    a = cv(); box(a, 0, 22, 63, 63, 12, WOOD, side=6 if r_end else 0, l_end=l_end, r_end=r_end)
    for x in range(4, 60, 14): R(a, x, 40, x + 9, 58, 'ba8856'); R(a, x, 40, x + 9, 40, '92623e')   # front panels
    if kind == 'fruit':      # fruit bowl: oranges, apples, a green pear, a banana
        R(a, 12, 14, 48, 26, 'ecdec4'); R(a, 12, 24, 48, 26, 'ccc6c2'); R(a, 12, 26, 48, 26, OUTL)
        for cx, cy, c in ((19, 12, 'e29d40'), (30, 9, 'd05440'), (40, 12, '78ba48'), (25, 15, 'eea23c'), (36, 15, 'd05440')):
            disc(a, cx, cy, 5, c); P(a, cx - 2, cy - 2, 'fcd668')
        R(a, 41, 6, 45, 7, '52983a')
    elif kind == 'blender':  # wide blender jug on a motor base, pink smoothie inside (no stem, no neck)
        R(a, 22, 12, 40, 24, '3e3a48'); R(a, 22, 12, 40, 13, '5e5866'); R(a, 29, 16, 33, 19, 'a6d460')
        R(a, 20, -1 + 1, 42, 11, 'c6ecfa'); R(a, 22, 3, 40, 11, 'f6a0ba'); R(a, 22, 3, 40, 4, 'daa2ba'); R(a, 20, 0, 42, 1, '3e3a48')
        R(a, 43, 3, 46, 9, 'c6ecfa')                                                    # handle
        outline(a)
    elif kind == 'cups':     # tea cups on saucers + milkshake cups with straws and cream
        for cx in (10, 24):
            R(a, cx - 6, 21, cx + 6, 22, 'ccc6c2'); R(a, cx - 4, 14, cx + 4, 20, 'fcf6e8'); R(a, cx + 5, 15, cx + 6, 18, 'fcf6e8'); R(a, cx - 3, 14, cx + 3, 15, '87604d')
        for cx, c in ((38, 'f6a0ba'), (52, 'a6d460')):   # opaque takeaway shake cups: paper cup, colour band, dome lid, straw (no glassware)
            R(a, cx - 5, 9, cx + 5, 22, 'fcf6e8'); R(a, cx - 5, 13, cx + 5, 17, c); R(a, cx - 6, 6, cx + 6, 8, 'ccc6c2'); R(a, cx - 4, 4, cx + 4, 5, 'ecdec4')
            R(a, cx + 1, 0, cx + 2, 4, 'd2608c')
        outline(a)
    elif kind == 'case':     # cake case: glass box on the counter, cake slices inside
        R(a, 6, 2, 57, 24, 'c6ecfa'); R(a, 8, 4, 10, 22, 'fcf6e8'); R(a, 6, 2, 57, 3, 'ecdec4')
        for cx in (18, 34, 48):
            R(a, cx - 6, 14, cx + 5, 22, 'fcd668'); R(a, cx - 6, 12, cx + 5, 14, 'f6a0ba'); R(a, cx - 6, 17, cx + 5, 17, 'f08868'); disc(a, cx, 10, 2, 'd05440')
        outline(a)
    return a

def stool():
    a = cv(); R(a, 29, 34, 34, 56, '5e5866'); R(a, 29, 34, 30, 56, 'a8a0a4'); R(a, 22, 55, 41, 58, '3e3a48')
    R(a, 18, 24, 45, 33, 'd05440'); R(a, 18, 24, 45, 27, 'f08868'); R(a, 18, 31, 45, 33, 'a23432')
    return outline(a)

# ---------------- stage, speakers, DJ desk ----------------
def stage(row, l_end=False, r_end=False):
    a = cv()
    if row == 0:   # back row: stage deck (top face only)
        R(a, 0, 0, 63, 63, 'ba8856')
        for y in range(6, 64, 16): R(a, 0, y, 63, y, '92623e')
        if l_end: R(a, 0, 0, 0, 63, OUTL)
        if r_end: R(a, 58, 0, 63, 63, '92623e'); R(a, 63, 0, 63, 63, OUTL)
    else:          # front row: deck top + front skirt with fairy-light dots (not emissive) + bottom outline
        R(a, 0, 0, 63, 29, 'ba8856'); R(a, 0, 6, 63, 6, '92623e'); R(a, 0, 22, 63, 22, '92623e')
        R(a, 0, 30, 63, 30, 'deb478'); R(a, 0, 31, 63, 62, '6a442e'); R(a, 0, 63, 63, 63, OUTL)
        for x in range(6, 64, 12): disc(a, x, 40, 2, 'fcd668')
        if l_end: R(a, 0, 0, 0, 63, OUTL)
        if r_end: R(a, 58, 0, 62, 62, '54444e'); R(a, 63, 0, 63, 63, OUTL)
    return a
def speaker():
    a = stage(0)
    b = cv(); box(b, 12, 4, 51, 60, 6, ('5e5866', '3e3a48', '29252b'))
    for cy, r in ((22, 9), (46, 6)): disc(b, 29, cy, r, '29252b'); disc(b, 29, cy, r - 3, '827a84'); disc(b, 28, cy - 1, 2, 'a8a0a4')
    m = b[..., 3] > 0; a[m] = b[m]; return a
def dj_desk():
    a = stage(1)
    b = cv(); box(b, 4, 6, 59, 52, 14, ('5e5866', '3e3a48', '29252b'))
    for cx in (18, 44): disc(b, cx, 12, 9, '191210'); disc(b, cx, 12, 3, 'eea23c'); P(b, cx - 5, 9, '827a84')      # record decks
    R(b, 29, 8, 33, 18, '827a84'); R(b, 30, 9, 30, 12, 'a6d460')
    for x, y in ((12, 32), (36, 30)): R(b, x, y, x + 1, y + 8, 'fcd668'); R(b, x + 2, y, x + 5, y + 1, 'fcd668'); disc(b, x - 1, y + 9, 2, 'fcd668')  # music notes
    m = b[..., 3] > 0; a[m] = b[m]; return a

# ---------------- booths ----------------
def booth(side):
    a = cv()
    if side == 'table':
        box(a, 8, 20, 55, 50, 10, WOOD); R(a, 28, 50, 35, 60, '6a442e'); R(a, 22, 60, 41, 62, '6a442e'); R(a, 22, 63, 41, 63, OUTL)
        for cx, c in ((20, 'f6a0ba'), (42, 'a6d460')): R(a, cx - 3, 10, cx + 3, 21, 'fcf6e8'); R(a, cx - 3, 14, cx + 3, 17, c); R(a, cx - 4, 8, cx + 4, 9, 'ccc6c2'); R(a, cx + 1, 3, cx + 2, 8, 'd2608c')
        R(a, 30, 14, 34, 22, 'fcd668'); R(a, 29, 12, 35, 14, 'f6a0ba')   # cake slice
        outline(a); return a
    x0, x1 = (4, 40) if side == 'l' else (24, 60)
    R(a, x0, 4, x1, 60, TEAL[1]); R(a, x0, 4, x1, 9, TEAL[0])
    bx = (x0, x0 + 9) if side == 'l' else (x1 - 9, x1)
    R(a, bx[0], 4, bx[1], 60, TEAL[2] if side == 'r' else '52983a'); R(a, bx[0], 4, bx[1], 6, TEAL[0])   # high back
    R(a, x0, 36, x1, 40, TEAL[0]); R(a, x0, 41, x1, 60, TEAL[2]); R(a, x0, 60, x1, 60, OUTL)
    return outline(a)

# ---------------- posters / flyers / notes (wall decoration, rows 1-2) ----------------
def paper(a, x0, y0, x1, y1, c='fcf6e8', pin='d05440'):
    R(a, x0, y0, x1, y1, c); R(a, x1, y0 + 1, x1, y1, CREAM[2]); R(a, x0 + 1, y1, x1, y1, CREAM[2]); disc(a, (x0 + x1) // 2, y0 + 2, 2, pin)
def face(a, cx, cy, skin, hair, style):
    disc(a, cx, cy, 6, skin)
    if style == 0: R(a, cx - 6, cy - 7, cx + 6, cy - 3, hair)
    elif style == 1: R(a, cx - 7, cy - 7, cx + 7, cy - 4, hair); R(a, cx - 7, cy - 4, cx - 5, cy + 6, hair); R(a, cx + 5, cy - 4, cx + 7, cy + 6, hair)
    elif style == 2: disc(a, cx, cy - 6, 4, hair); R(a, cx - 6, cy - 5, cx + 6, cy - 4, hair)
    else: R(a, cx - 7, cy - 8, cx + 7, cy - 5, hair); R(a, cx - 8, cy - 5, cx + 8, cy - 4, hair)
    P(a, cx - 2, cy, INK); P(a, cx + 2, cy, INK); R(a, cx - 1, cy + 3, cx + 1, cy + 3, '87604d')
    R(a, cx - 7, cy + 7, cx + 7, cy + 12, hair if style != 3 else '2c64a8')
PORTRAITS = {'pell': ('f08868', '6a3019', 0), 'marta': ('c46e2e', '191210', 1), 'teo': ('deb478', 'e29d40', 2), 'imke': ('87604d', 'ccc6c2', 3)}
def missing(who):
    a = cv(); paper(a, 12, 8, 51, 58); R(a, 15, 12, 48, 17, 'd05440')
    for x in range(17, 47, 5): R(a, x, 13, x + 2, 16, 'fcf6e8')        # blocky MISSING header (no readable text)
    skin, hair, st = PORTRAITS[who]; face(a, 31, 31, skin, hair, st)
    R(a, 16, 48, 46, 49, '827a84'); R(a, 16, 52, 38, 53, '827a84'); return a
def team_flyer():
    a = cv(); paper(a, 4, 4, 59, 61, 'f8eabe', '2c64a8'); R(a, 8, 9, 55, 14, 'd05440')
    for x in range(10, 54, 5): R(a, x, 10, x + 2, 13, 'f8eabe')
    for i, who in enumerate(PORTRAITS):
        s, h, st = PORTRAITS[who]; cx, cy = (19 + (i % 2) * 26, 25 + (i // 2) * 20); face(a, cx, cy, s, h, st)
    disc(a, 31, 52, 3, '8a4ace'); P(a, 30, 51, 'd6acff')               # the violet crystal mark of the field team
    return a
def flyer_lost():
    a = cv(); paper(a, 10, 8, 53, 58, 'fcf6e8', '52983a')
    disc(a, 31, 32, 10, '827a84'); disc(a, 24, 22, 4, '827a84'); disc(a, 38, 22, 4, '827a84'); P(a, 27, 31, 'fcf6e8'); P(a, 35, 31, 'fcf6e8')
    R(a, 44, 14, 48, 15, 'd05440'); R(a, 48, 15, 48, 19, 'd05440'); R(a, 46, 19, 47, 21, 'd05440'); R(a, 46, 24, 47, 25, 'd05440')   # ?
    R(a, 16, 48, 46, 49, '827a84'); return a
def flyer_mic():
    a = cv(); paper(a, 10, 8, 53, 58, 'fcd668', '2c64a8')
    disc(a, 26, 24, 6, '3e3a48'); disc(a, 25, 23, 3, '827a84'); R(a, 25, 30, 27, 46, '3e3a48'); R(a, 20, 46, 32, 48, '3e3a48')
    for x, y in ((38, 20), (44, 30)): R(a, x, y, x + 1, y + 9, 'd05440'); R(a, x + 2, y, x + 5, y + 1, 'd05440'); disc(a, x - 1, y + 10, 2, 'd05440')
    R(a, 16, 52, 46, 53, 'a23432'); return a
def poster_names():
    a = cv(); paper(a, 8, 4, 55, 61, 'ecdec4', '2c64a8'); R(a, 12, 8, 51, 12, '2c64a8')
    for i, y in enumerate(range(17, 57, 6)): R(a, 13, y, 13 + 18 + (i * 7) % 18, y + 1, '54444e'); P(a, 48, y, '52983a')
    return a
def note(tick):
    a = cv(); R(a, 0, 0, 63, 63, (0, 0, 0, 0))
    R(a, 14, 18, 49, 46, 'f8eabe'); R(a, 49, 19, 49, 46, CREAM[2]); R(a, 15, 46, 49, 46, CREAM[2]); disc(a, 31, 20, 2, '2c64a8')
    for y in (27, 32, 37): R(a, 18, y, 44, y, '827a84')
    if tick:
        for i in range(6): R(a, 30 + i, 34 + i, 31 + i, 35 + i, '52983a')
        for i in range(14): R(a, 36 + i, 39 - i * 2 // 1 // 2 - i // 2, 37 + i, 40 - i, '52983a')
    return a
def poster_gig(k):
    a = cv(); cols = [('2c64a8', 'fcd668'), ('d05440', 'f8eabe'), ('52983a', 'eea23c')][k]
    paper(a, 10, 6, 53, 58, cols[0], 'fcf6e8')
    if k == 0:   # firefly
        disc(a, 31, 26, 5, '2c2320'); disc(a, 31, 34, 6, cols[1]); disc(a, 25, 22, 4, 'c6ecfa'); disc(a, 37, 22, 4, 'c6ecfa')
    elif k == 1:  # notes
        for x, y in ((22, 18), (36, 24)): R(a, x, y, x + 2, y + 14, cols[1]); R(a, x + 3, y, x + 8, y + 2, cols[1]); disc(a, x - 1, y + 15, 3, cols[1])
    else:         # stage + stars
        R(a, 16, 38, 47, 44, '6a442e')
        for cx, cy in ((20, 18), (31, 14), (42, 20)): R(a, cx - 3, cy, cx + 3, cy, cols[1]); R(a, cx, cy - 3, cx, cy + 3, cols[1])
    R(a, 15, 50, 48, 52, cols[1]); return a
def banner(full_w=12):
    """Post-game banner over the whole flyer wall (x1..12): bunting + FOUND. ALL FOUR. (Text Bot postgame line)."""
    W = full_w * T; a = np.zeros((T, W, 4), np.uint8)
    R(a, 0, 10, W - 1, 54, 'fcd668'); R(a, 0, 10, W - 1, 13, 'f8eabe'); R(a, 0, 51, W - 1, 54, 'eea23c'); R(a, 0, 55, W - 1, 55, OUTL)
    for x in range(0, W, 32):
        c = ('d05440', '52983a', '2c64a8', 'e29d40')[(x // 32) % 4]
        for i in range(8): R(a, x + 4 + i, 1 + i, x + 19 - i, 1 + i, c)
    msg = 'FOUND. ALL FOUR.'; sc = 4; tw = len(msg) * 6 * sc
    text(a, (W - tw) // 2 + 2, 19, msg, H('2c1a12'), sc)
    for cx in (40, W - 40): disc(a, cx, 32, 9, '52983a'); R(a, cx - 4, 32, cx - 1, 35, 'fcf6e8'); R(a, cx - 1, 29, cx + 4, 35, 'fcf6e8') if False else None
    return a
def paint_counter():
    a = cv(); box(a, 2, 22, 61, 63, 12, WOOD)
    for i, c in enumerate(('d05440', 'fcd668', '78ba48', '2c64a8', '8a4ace')):
        cx = 10 + i * 11; R(a, cx - 4, 10, cx + 4, 22, 'ccc6c2'); R(a, cx - 4, 10, cx + 4, 13, c); R(a, cx - 4, 21, cx + 4, 22, '827a84')
    R(a, 44, 4, 46, 14, '92623e'); R(a, 43, 1, 47, 4, 'd6acff')              # brush with crystal-violet tip
    for i, c in enumerate(('d05440', 'fcd668', '78ba48', '2c64a8')): R(a, 10 + i * 12, 44, 18 + i * 12, 52, c)   # swatches on the front
    outline(a); return a
def door_frame(part):
    """Open staff doorway (no door leaf in the way): t = lintel + posts (OVERLAY, transparent opening), b = posts + threshold (deco, walkable)."""
    a = cv()
    R(a, 0, 0, 7, 63, '92623e'); R(a, 56, 0, 63, 63, '6a442e'); R(a, 1, 0, 2, 63, 'ba8856')
    R(a, 8, 0, 11, 63, '2c2320'); R(a, 52, 0, 55, 63, '462c22')                  # recessed inner edge (darker reveal)
    if part == 't':
        R(a, 0, 0, 63, 13, 'ba8856'); R(a, 0, 0, 63, 2, 'deb478'); R(a, 0, 14, 63, 17, '2c2320'); R(a, 0, 13, 63, 13, '92623e')
        R(a, 22, 4, 41, 10, 'fcf6e8'); R(a, 25, 6, 38, 8, '3e9c92')               # STAFF plate (no text)
    else:
        R(a, 12, 58, 51, 63, '92623e'); R(a, 12, 58, 51, 58, 'deb478'); R(a, 0, 63, 63, 63, OUTL)
    R(a, 0, 0, 0, 63, OUTL); R(a, 63, 0, 63, 63, OUTL); return a

# ---------------- Fernwick facade 3x2 with the neon firefly ----------------
def neon_firefly(a, x0, y0, w, h):
    R(a, x0, y0, x0 + w - 1, y0 + h - 1, '29252b'); R(a, x0, y0, x0 + w - 1, y0, '5e5866'); R(a, x0, y0 + h - 1, x0 + w - 1, y0 + h - 1, OUTL)
    cx, cy = x0 + w // 2, y0 + h // 2
    disc(a, cx - 12, cy - 7, 8, 'c6ecfa'); disc(a, cx + 1, cy - 9, 8, 'c6ecfa'); disc(a, cx - 12, cy - 7, 5, '7ac2e8'); disc(a, cx + 1, cy - 9, 5, '7ac2e8')   # wings
    disc(a, cx - 7, cy + 2, 6, 'a6d460'); disc(a, cx - 10, cy + 1, 2, '191210')                                # head + eye
    disc(a, cx + 7, cy + 5, 9, 'fcd668'); disc(a, cx + 7, cy + 5, 5, 'fcf6e8')                                 # glowing tail
    for x, y, c in ((x0 + 8, y0 + 8, 'eea23c'), (x0 + w - 18, y0 + 8, 'eea23c')):                             # music notes either side
        R(a, x, y, x + 1, y + 15, c); R(a, x + 2, y, x + 7, y + 1, c); disc(a, x - 1, y + 16, 3, c)
def neon_notes(a, x0, y0, w, h):
    R(a, x0, y0, x0 + w - 1, y0 + h - 1, '29252b'); R(a, x0, y0, x0 + w - 1, y0, '5e5866'); R(a, x0, y0 + h - 1, x0 + w - 1, y0 + h - 1, OUTL)
    for x, y, c in ((x0 + 10, y0 + 6, 'eea23c'), (x0 + 24, y0 + 10, 'a6d460')):
        R(a, x, y, x + 1, y + 13, c); R(a, x + 2, y, x + 7, y + 1, c); disc(a, x - 1, y + 14, 3, c)
FRONT_BOX = dict(sign=[40, 4, 152, 40], notes=[6, 70, 46, 106])   # facade pixel boxes of the neon (whole 192x128 image)
def facade():
    W, Hh = 3 * T, 2 * T; a = np.zeros((Hh, W, 4), np.uint8)
    R(a, 2, 0, W - 3, Hh - 1, 'a23432')                                          # warm brick
    for y in range(4, Hh, 8):
        R(a, 2, y, W - 3, y, '6a3019')
        for x in range(2 + (8 if (y // 8) % 2 else 0), W - 2, 16): R(a, x, y - 7, x, y, '6a3019')
    R(a, 2, 0, W - 3, 1, 'd05440')
    R(a, W - 9, 0, W - 3, Hh - 1, '6e222a')                                       # right side panel (darker), light from top-left
    R(a, 2, 44, W - 3, 54, '52983a')                                              # awning: green/amber stripes
    for x in range(2, W - 2, 16): R(a, x, 44, x + 7, 54, 'eea23c')
    R(a, 2, 44, W - 3, 44, 'a6d460'); R(a, 2, 55, W - 3, 55, '2c2320')
    neon_firefly(a, *FRONT_BOX['sign'][:2], FRONT_BOX['sign'][2] - FRONT_BOX['sign'][0], FRONT_BOX['sign'][3] - FRONT_BOX['sign'][1])
    # door (bottom centre): wood, round window with warm light, recessed frame
    R(a, T + 10, 64 + 4, T + 53, 127, '2c2320'); R(a, T + 14, 64 + 8, T + 49, 127, 'ba8856'); R(a, T + 14, 64 + 8, T + 17, 127, 'deb478')
    R(a, T + 46, 64 + 8, T + 49, 127, '92623e'); disc(a, T + 31, 64 + 24, 7, 'fcd668'); disc(a, T + 31, 64 + 24, 4, 'fcf6e8'); disc(a, T + 42, 64 + 34 + 30, 2, 'eea23c')
    neon_notes(a, *FRONT_BOX['notes'][:2], FRONT_BOX['notes'][2] - FRONT_BOX['notes'][0], FRONT_BOX['notes'][3] - FRONT_BOX['notes'][1])
    # right: menu board with fruit + cup pictures (no text), small planter
    R(a, 2 * T + 10, 70, 2 * T + 44, 106, '3e3a48'); R(a, 2 * T + 12, 72, 2 * T + 42, 104, '18382c')
    disc(a, 2 * T + 20, 82, 4, 'e29d40'); disc(a, 2 * T + 31, 82, 4, 'd05440'); R(a, 2 * T + 18, 92, 2 * T + 24, 101, 'fcf6e8'); R(a, 2 * T + 30, 92, 2 * T + 36, 101, 'f6a0ba')
    R(a, 2 * T + 8, 112, 2 * T + 30, 126, 'c46e2e'); R(a, 2 * T + 8, 112, 2 * T + 30, 113, 'e29d40')
    for cx in (2 * T + 13, 2 * T + 20, 2 * T + 26): disc(a, cx, 108, 4, '52983a')
    R(a, 2, Hh - 1, W - 3, Hh - 1, OUTL); R(a, 0, 0, 1, Hh - 1, OUTL); R(a, W - 2, 0, W - 1, Hh - 1, OUTL)
    return a

# ---------------- tile list (name -> (image, coll, ysort)) ----------------
def tiles():
    t = {'club_wall_upper': (wall_upper(), 'block'), 'club_wall_face': (wall_face(), 'block'),
         'club_dance_a': (dance(0), 'walk'), 'club_dance_b': (dance(1), 'walk'),
         'club_counter_case': (counter('case', l_end=True), 'block'), 'club_counter_fruit': (counter('fruit'), 'block'),
         'club_counter_plain': (counter(''), 'block'), 'club_counter_blender': (counter('blender'), 'block'),
         'club_counter_cups': (counter('cups', r_end=True), 'block'), 'club_stool': (stool(), 'block'),
         'club_stage_back_l': (stage(0, l_end=True), 'walk'), 'club_stage_back': (stage(0), 'walk'), 'club_stage_back_r': (stage(0, r_end=True), 'walk'),
         'club_stage_front_l': (stage(1, l_end=True), 'block'), 'club_stage_front': (stage(1), 'block'), 'club_stage_front_r': (stage(1, r_end=True), 'block'),
         'club_speaker': (speaker(), 'block'), 'club_dj_desk': (dj_desk(), 'block'),
         'club_booth_l': (booth('l'), 'block'), 'club_booth_table': (booth('table'), 'block'), 'club_booth_r': (booth('r'), 'block'),
         'club_poster_firefly': (poster_gig(0), 'block'), 'club_poster_notes': (poster_gig(1), 'block'), 'club_poster_stage': (poster_gig(2), 'block'),
         'club_flyer_team': (team_flyer(), 'block'), 'club_flyer_lost': (flyer_lost(), 'block'), 'club_flyer_mic': (flyer_mic(), 'block'),
         'club_poster_names': (poster_names(), 'block'), 'club_note': (note(False), 'block'), 'club_note_tick': (note(True), 'block'),
         'club_paint_counter': (paint_counter(), 'block'), 'club_door_frame_t': (door_frame('t'), 'walk'), 'club_door_frame_b': (door_frame('b'), 'walk')}
    for who in PORTRAITS: t[f'club_missing_{who}'] = (missing(who), 'block')
    b = banner()
    for i in range(12): t[f'club_banner_{i}'] = (b[:, i * T:(i + 1) * T].copy(), 'block')
    f = facade()
    for r in range(2):
        for c in range(3): t[f'club_front_{r}_{c}'] = (f[r * T:(r + 1) * T, c * T:(c + 1) * T].copy(), 'door' if (r, c) == (1, 1) else 'block')
    return t
EMISSIVE = {'club_dance_a': None, 'club_dance_b': None,
            'club_front_0_0': [40, 4, 64, 40], 'club_front_0_1': [0, 4, 64, 40], 'club_front_0_2': [0, 4, 24, 40],
            'club_front_1_0': [6, 6, 46, 42]}   # neon firefly (over the door) + neon notes panel (sign_club); dance floor amber/green only
GROUND = {'club_wall_upper', 'club_wall_face', 'club_dance_a', 'club_dance_b', 'club_stage_back_l', 'club_stage_back', 'club_stage_back_r'}

# ---------------- map ----------------
NOTE_FLAGS = {'note_thornwood': 'beat_master_fernwick', 'note_greystone': 'beat_master_revival', 'note_frostspire': 'beat_master_revival', 'note_mirefen': 'beat_master_frostspire'}
WALL = [(1, 'poster_names', 'club_poster_names'), (2, 'missing_pell', 'club_missing_pell'), (3, 'missing_marta', 'club_missing_marta'),
        (4, 'missing_team_flyer', 'club_flyer_team'), (5, 'missing_teo', 'club_missing_teo'), (6, 'missing_imke', 'club_missing_imke'),
        (7, 'note_thornwood', 'club_note'), (8, 'note_greystone', 'club_note'), (9, 'note_frostspire', 'club_note'), (10, 'note_mirefen', 'club_note'),
        (11, 'flyer_lost_creature', 'club_flyer_lost'), (12, 'flyer_open_mic', 'club_flyer_mic')]
W_, H_ = 14, 15; DOOR_X = 7; EXIT = (7, 14); FERN_DOOR = (26, 3); FERN_SIGN = (25, 3)
NPCS = [  # id, x, y, facing, kind, note   (talk cells checked by verify())
    ('rebel_bartender', 2, 9, 'down', 'juice_counter_keeper', 'behind the juice counter; talk across it from (2,11) facing up. Sells juices, teas and shakes only (id unchanged per Text Bot; display role = juice and snack counter keeper)'),
    ('rebel_dj', 11, 9, 'down', 'dj', 'on the stage behind the DJ desk (11,10); talk across it from (11,11) facing up. Dawn/day: asleep in the east booth, stands at (10,12) facing right (Text Bot day/dawn lines)'),
    ('rebel_patron_1', 6, 9, 'up', 'villager', 'looking at the poster wall (protest-poster artist)'),
    ('rebel_patron_2', 5, 12, 'left', 'villager', 'by the west booth (greenhouse guy)'),
    ('rebel_patron_3', 8, 12, 'down', 'villager', 'on the dance floor (bad dancer)'),
    ('rebel_bouncer', 8, 13, 'left', 'villager', 'by the door, friendly: the back room is open from the first visit (Gary R2), never blocks the way'),
    ('rebel_paint_vendor', 13, 4, 'left', 'shop_cosmetic', 'back room, behind the paint counter (12,4); talk across it from (11,4) facing right. Cosmetic crystal paint; shop open Dusk/Night (Text Bot)'),
]
TALK = {'rebel_bartender': (2, 11), 'rebel_dj': (11, 11), 'rebel_paint_vendor': (11, 4)}

PENDING = {}   # placeholder id -> tile name (filled by late())
def _pid(name):
    for k, v in PENDING.items():
        if v == name: return k
    k = -(3000 + len(PENDING)); PENDING[k] = name; return k
def _id(name): return BYNAME[name]['id'] if name in BYNAME else _pid(name)

def build_map():
    m = Map('club_int', W_, H_, base='floor_wood', title='The Firefly (Fernwick juice bar and music hangout)')
    g = [['floor_wood'] * W_ for _ in range(H_)]; d = [[None] * W_ for _ in range(H_)]; o = [[None] * W_ for _ in range(H_)]
    for x in range(W_):
        g[0][x] = 'iwall_top'; g[1][x] = 'club_wall_upper'; g[2][x] = 'club_wall_face'
        g[6][x] = 'iwall_top'; g[7][x] = 'club_wall_upper'; g[8][x] = 'club_wall_face'
        for y in (3, 4, 5): g[y][x] = 'floor_carpet'
    g[6][DOOR_X] = g[7][DOOR_X] = g[8][DOOR_X] = 'floor_carpet'; o[7][DOOR_X] = 'club_door_frame_t'; d[8][DOOR_X] = 'club_door_frame_b'
    for x, sid, tile in WALL:
        if not sid.startswith('note_'): d[2][x] = tile                                # notes appear by flag (flag_swaps)
    for x, tile in ((1, 'club_poster_firefly'), (3, 'club_poster_notes'), (5, 'club_poster_stage'), (9, 'club_poster_firefly'), (12, 'club_poster_notes')): d[8][x] = tile
    d[3][13] = 'plant'; d[5][13] = 'i_plant_flower'; d[4][12] = 'club_paint_counter'; d[5][0] = 'plant'
    for x, tile in enumerate(('club_counter_case', 'club_counter_fruit', 'club_counter_plain', 'club_counter_blender', 'club_counter_cups')): d[10][x] = tile
    d[9][5] = 'plant'
    for x in (1, 3, 4): d[11][x] = 'club_stool'
    for x in range(9, 14):
        g[9][x] = 'club_stage_back_l' if x == 9 else ('club_stage_back_r' if x == 13 else 'club_stage_back')
        g[10][x] = 'club_stage_front_l' if x == 9 else ('club_stage_front_r' if x == 13 else 'club_stage_front')
    d[9][9] = 'club_speaker'; d[9][13] = 'club_speaker'; d[10][11] = 'club_dj_desk'
    for y in (11, 12):
        for x in range(6, 10): g[y][x] = 'club_dance_a' if (x + y) % 2 == 0 else 'club_dance_b'
    for x0 in (0, 11): d[12][x0] = 'club_booth_l'; d[12][x0 + 1] = 'club_booth_table'; d[12][x0 + 2] = 'club_booth_r'
    d[14][7] = 'door_mat'
    m.terr = g; m.deco = d; m.over = o
    m.warp(EXIT[0], EXIT[1], 'fernwick', FERN_DOOR[0], FERN_DOOR[1] + 1, 'down', 'The Firefly front door (Fernwick east side yard)')
    COLLS = {n: c for n, (_, c) in TILES_CACHE.items()}
    def coll(n): return COLL[COLLS[n]] if n in COLLS else COLL[BYNAME[n]['coll']]
    G = [[_id(n) for n in r] for r in g]; D = [[_id(n) if n else 0 for n in r] for r in d]; O = [[_id(n) if n else 0 for n in r] for r in o]
    C = [[0] * W_ for _ in range(H_)]; E = [[0] * W_ for _ in range(H_)]
    for y in range(H_):
        for x in range(W_):
            c = coll(g[y][x])
            if d[y][x] and coll(d[y][x]) != 0: c = coll(d[y][x])
            C[y][x] = c
    for w in m.warps: C[w['y']][w['x']] = 4
    m.pre = (G, D, O, C, E)
    flag_swaps = []
    for x, sid, tile in WALL:
        if sid in NOTE_FLAGS:
            area = sid[5:]
            flag_swaps.append(dict(x=x, y=2, layer='decoration', before=None, after='club_note', flag=NOTE_FLAGS[sid], note=f'{sid}: note pinned up at tier flag (Story Bot R2)'))
            flag_swaps.append(dict(x=x, y=2, layer='decoration', before='club_note', after='club_note_tick', flag=f'camp_restored_{area}',
                                   requires=NOTE_FLAGS[sid], note=f'camp restored: hand-drawn tick (proposed flag camp_restored_{area}; no camp system exists yet)'))
    for i, (x, sid, tile) in enumerate(WALL):
        flag_swaps.append(dict(x=x, y=2, layer='decoration', before='any', after=f'club_banner_{i}', flag='field_team_home',
                               note='post-game: the whole flyer wall becomes the FOUND. ALL FOUR. banner (wins over every other swap)'))
    spots = []
    for x, sid, tile in WALL:
        sp = dict(id=sid, kind='prop', x=x, y=2, stand=[x, 3], face='up', tile=tile, text_ref=f'overworld_lines.json unplaced.club_props.club_int.{sid}')
        if sid in NOTE_FLAGS: sp['active_when'] = NOTE_FLAGS[sid]; sp['note'] = 'hidden (blank wall, no spot) until active_when; tick variant on camp_restored_' + sid[5:]
        spots.append(sp)
    npcs = [dict(id=i, x=x, y=y, facing=f, kind=k, note=n, text_ref=f'overworld_lines.json unplaced_npcs.{i}') for i, x, y, f, k, n in NPCS]
    for n in npcs:
        if n['id'] in TALK: n['talk_from'] = list(TALK[n['id']])
        if n['id'] == 'rebel_dj': n['by_phase'] = dict(dawn=dict(x=10, y=12, facing='right'), day=dict(x=10, y=12, facing='right'))
    m.soul = dict(text_pending=dict(npcs=npcs, signs=[], interact_spots=spots), flag_swaps=flag_swaps,
                  mood=dict(battles=False, wild_encounters=False, music='The Firefly house tune (unfinished remix until the ending)',
                            light='warm and bright; amber/green dance floor glow (emissive). Juice bar: no drink/drug/smoke hints anywhere (Gary HARD RULE)'),
                  back_room=dict(locked=False, gate_flag=None, note='open from the first visit (Gary R2): plain open staff doorway at (7,6)-(7,8)'),
                  note='All club text is pending (Text Bot proposed_spot null): ids match overworld_lines.json unplaced_npcs.rebel_* and unplaced.club_props.club_int.<id> exactly.')
    m.region = 'fernwick'; return m

TILES_CACHE = {}
RECORDS = [('fernwick', 27, 5), ('thornwood', 5, 15), ('route1', 20, 23)]
def apply(MAPS):
    """Before world_data.apply: Fernwick door + sign + record items, the club map (placeholders), zone wiring."""
    TILES_CACHE.update({k: (v[0], v[1]) for k, v in tiles().items()})
    M = {m.name: m for m in MAPS}; f = M['fernwick']
    for y in (2, 3):
        for x in (25, 26, 27):
            assert f.deco[y][x] is None and f.terr[y][x] not in ('water',), ('club site not clear', x, y, f.deco[y][x])
            f.deco[y][x] = None; f.cforce[(x, y)] = 1
    f.warp(FERN_DOOR[0], FERN_DOOR[1], 'club_int', EXIT[0], EXIT[1] - 1, 'up', 'The Firefly (juice bar + music hangout), Fernwick east side yard')
    f.soul = getattr(f, 'soul', None) or {}
    tp = f.soul.setdefault('text_pending', {}); tp.setdefault('signs', []).append(dict(
        id='sign_club', x=FERN_SIGN[0], y=FERN_SIGN[1], stand=[FERN_SIGN[0], FERN_SIGN[1] + 1], face='up', tile='club_front_1_0',
        text='THE FIREFLY - juice, tunes, open late.', text_note='dev label only; key maps.fernwick.sign_club requested from Text Bot',
        note='neon music-notes panel on the club front (emissive); the big neon firefly over the door is decoration'))
    for mn, x, y in RECORDS:
        M[mn].items.append(dict(id='old_record', x=x, y=y, item='old_record', hidden=False,
                                note='The Missing Note record (Text Bot missing_note_records; pickup sets the lowest unset flg_record_N, Coder). Lanternport record held until that town is built'))
    m = build_map(); MAPS.append(m)
    import world_data; world_data.ZONE_EXTRA.setdefault('fernwick', []).append('club_int')
    return m

def late(res):
    """After every map is final: register the club tiles (new ids at the end), patch placeholders, put the facade into Fernwick."""
    ids = {}
    for n, (im, coll) in TILES_CACHE.items():
        ids[n] = build.reg(n, 'interior' if not n.startswith('club_front') else 'building', Image.fromarray(im, 'RGBA'), coll, raw=True,
                           notes='The Firefly (club_int / Fernwick front), tools/club.py. Juice bar: no drink/drug/smoke imagery.')['id']
    for k, n in PENDING.items(): ids[k] = ids.get(n) or BYNAME[n]['id']
    m, G, D, O, C, E = res['club_int']
    for L in (G, D, O):
        for r in L:
            for x, v in enumerate(r):
                if v < 0: r[x] = ids[PENDING[v]]
    fm, G, D, O, C, E = res['fernwick']
    for r in range(2):
        for c in range(3):
            n = f'club_front_{r}_{c}'; D[2 + r][25 + c] = ids[n]; fm.deco[2 + r][25 + c] = n
    assert C[FERN_DOOR[1]][FERN_DOOR[0]] == 4
    return [n for n in TILES_CACHE]

def verify(res, cflags=None):
    """Talk/stand cells walkable + reachable from the door with NPCs as walls."""
    from collections import deque
    m, G, D, O, C, E = res['club_int']; occ = {(x, y) for _, x, y, *_ in NPCS}
    st = (EXIT[0], EXIT[1]); seen = {st}; q = deque([st])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W_ and 0 <= ny < H_ and (nx, ny) not in seen and C[ny][nx] in (0, 4) and (nx, ny) not in occ:
                seen.add((nx, ny)); q.append((nx, ny))
    bad = []
    for x, sid, tile in WALL:
        if (x, 3) not in seen: bad.append(f'{sid}: stand ({x},3) unreachable')
    for i, x, y, *_ in NPCS:
        t = TALK.get(i); cells = [t] if t else [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
        if not any(c in seen for c in cells): bad.append(f'{i}: no reachable talk cell')
        if C[y][x] != 0: bad.append(f'{i}: stands on a solid cell ({x},{y})')
    return bad, len(seen)
