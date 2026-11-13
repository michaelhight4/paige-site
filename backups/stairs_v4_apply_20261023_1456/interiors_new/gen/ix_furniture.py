# Furniture, fixtures and props. Each object is drawn once at full size on a transparent canvas,
# pixelized with a dark outline, and sliced into 64 px decoration tiles named <name>_<row>_<col>
# (single-tile objects keep the plain name). Shadow uses the one shared shadow colour.
import numpy as np
from ix_canvas import Cv, C, T

OBJ = {}   # name -> dict(w,h,fn,coll,cat,notes,outline)

def obj(name, w=1, h=1, coll=1, cat='furniture', notes='', outline=True):
    def deco(fn):
        OBJ[name] = dict(w=w, h=h, fn=fn, coll=coll, cat=cat, notes=notes, outline=outline)
        return fn
    return deco

def box(cv, x0, y0, x1, y1, top_h, top, front, hl=None):
    """3/4 view block: lit top face over a darker front face. top/front are colour lists (dark..light)."""
    cv.vgrad(x0, y0, x1, y0 + top_h, top[-1], top[0]) if len(top) > 1 else cv.rect(x0, y0, x1, y0 + top_h, top[0])
    cv.vgrad(x0, y0 + top_h, x1, y1, front[-1], front[0]) if len(front) > 1 else cv.rect(x0, y0 + top_h, x1, y1, front[0])
    if hl: cv.hline(x0 + 1, x1 - 1, y0 + 1, hl)
    cv.hline(x0, x1, y0 + top_h, front[0])

def foot_shadow(cv, x0, x1, y, h=5):
    cv.shadow_rect(x0 + 3, y, x1 + 3, y + h)

# ---------------- regional colour sets ----------------
REG = {
 'brook':    dict(wood=[C['brown'], C['mbrown'], C['tan']], wood2=[C['bark'], C['brown']], quilt=[C['wine'], C['red'], C['redor']], sheet=C['paper'], acc=C['amber']),
 'fern':     dict(wood=[C['mbrown2'], C['tan'], C['ltan']], wood2=[C['brown'], C['mbrown2']], quilt=[C['fgreen'], C['green2'], C['mgreen']], sheet=C['cream'], acc=C['lime']),
 'salt':     dict(wood=[C['greyv'], C['grey2'], C['grey3']], wood2=[C['slate2'], C['greyv']], quilt=[C['navy'], C['blue2'], C['sky']], sheet=C['paper'], acc=C['paper']),
 'cinder':   dict(wood=[C['dbrown'], C['bark'], C['rust2']], wood2=[C['ink'], C['dbrown']], quilt=[C['rust'], C['burnt'], C['orange']], sheet=C['sand2'], acc=C['amber2']),
 'revival':  dict(wood=[C['slate'], C['greyv'], C['grey']], wood2=[C['char'], C['slate']], quilt=[C['dviolet'], C['violet'], C['mviolet']], sheet=C['pviolet'], acc=C['lav']),
 'lantern':  dict(wood=[C['dteal'], C['teal'], C['lteal']], wood2=[C['dgreen'], C['dteal']], quilt=[C['dteal'], C['teal'], C['lteal']], sheet=C['pale'], acc=C['amber']),
 'aurelith': dict(wood=[C['grey2'], C['grey3'], C['paper']], wood2=[C['greyv'], C['grey2']], quilt=[C['dviolet'], C['violet'], C['mviolet']], sheet=C['paper'], acc=C['yellow']),
}

# ---------------- beds, tables, seating ----------------
def make_bed(r):
    R = REG[r]
    def fn(cv):
        foot_shadow(cv, 6, 58, 116, 6)
        box(cv, 6, 4, 58, 26, 10, [R['wood'][1], R['wood'][2]], R['wood2'])           # headboard
        cv.rect(8, 22, 56, 116, R['wood'][0])                                           # frame
        cv.rect(10, 22, 54, 50, R['sheet']); cv.vgrad(10, 22, 54, 30, C['grey3'], R['sheet'])
        cv.rect(14, 25, 50, 40, C['paper']); cv.hline(14, 50, 39, C['grey3']); cv.vgrad(14, 36, 50, 40, C['paper'], C['grey3'])
        cv.ramp(cv.mask_rect(10, 46, 54, 110), R['quilt'], 0.45 + 0.35 * ((cv.X % 12) < 6) * 0.6 + 0.2 * (cv.Y < 52))
        cv.hline(10, 54, 46, R['quilt'][2]); cv.rect(10, 106, 54, 112, R['quilt'][0])
        if r in ('salt',): cv.fill(cv.mask_rect(10, 52, 54, 106) & ((cv.Y % 12) < 4), C['paper'])
        if r in ('aurelith', 'lantern'): cv.rect(10, 70, 54, 73, R['acc'])
        if r == 'fern': 
            for (x, y) in ((20, 64), (40, 84), (24, 96)): cv.ell(x, y, 3, 3, C['lime'])
        if r == 'cinder': cv.fill(cv.mask_rect(10, 52, 54, 106) & ((cv.X + cv.Y) % 16 == 0), C['amber'])
        if r == 'revival': cv.rect(30, 46, 34, 110, C['lav'])
        cv.rect(8, 110, 56, 118, R['wood'][1]); cv.hline(8, 56, 110, R['wood'][2])
    return fn
for r in REG: obj('i_bed_' + r, 1, 2, notes='bed (sleep/heal at home)')(make_bed(r))

def make_table(r, w):
    R = REG[r]
    def fn(cv):
        W = w * 64
        foot_shadow(cv, 6, W - 6, 52, 6)
        box(cv, 4, 10, W - 4, 44, 24, [R['wood'][1], R['wood'][2]], R['wood2'], hl=R['wood'][2])
        cv.rect(8, 44, 14, 56, R['wood2'][0]); cv.rect(W - 14, 44, W - 8, 56, R['wood2'][0])
        if w == 2:
            cv.ell(40, 22, 9, 6, C['paper']); cv.ell(40, 21, 6, 3, C['amber'])
            cv.rect(76, 14, 86, 26, C['grey3']); cv.rect(78, 16, 84, 18, C['sky'])
        else:
            cv.ell(32, 21, 7, 5, R['acc'])
    return fn
for r in REG:
    obj('i_table_' + r, 2, 1)(make_table(r, 2))
    obj('i_table_small_' + r, 1, 1)(make_table(r, 1))

def make_chair(r):
    R = REG[r]
    def fn(cv):
        foot_shadow(cv, 18, 46, 54, 5)
        box(cv, 18, 6, 46, 22, 6, [R['wood'][1], R['wood'][2]], R['wood2'])   # back rest
        box(cv, 16, 26, 48, 50, 12, [R['quilt'][1], R['quilt'][2]], [R['wood'][0], R['wood'][1]])
        cv.rect(18, 50, 22, 56, R['wood2'][0]); cv.rect(42, 50, 46, 56, R['wood2'][0])
        cv.rect(18, 20, 22, 28, R['wood'][0]); cv.rect(42, 20, 46, 28, R['wood'][0])
    return fn
for r in REG: obj('i_chair_' + r)(make_chair(r))

def make_sofa(r):
    R = REG[r]
    def fn(cv):
        foot_shadow(cv, 6, 122, 54, 6)
        box(cv, 6, 6, 122, 30, 10, [R['quilt'][1], R['quilt'][2]], [R['quilt'][0], R['quilt'][1]])
        box(cv, 8, 28, 120, 52, 12, [R['quilt'][1], R['quilt'][2]], [R['quilt'][0], R['quilt'][1]])
        box(cv, 4, 18, 18, 54, 6, [R['quilt'][1], R['quilt'][2]], [R['quilt'][0], R['quilt'][1]])
        box(cv, 110, 18, 124, 54, 6, [R['quilt'][1], R['quilt'][2]], [R['quilt'][0], R['quilt'][1]])
        cv.vline(64, 30, 40, R['quilt'][0])
        cv.ell(36, 24, 8, 5, R['acc']); cv.ell(92, 24, 8, 5, R['sheet'])
    return fn
for r in ('brook', 'salt', 'revival', 'lantern', 'aurelith', 'cinder', 'fern'): obj('i_sofa_' + r, 2, 1)(make_sofa(r))

# ---------------- storage ----------------
def books(cv, x0, y0, x1, y1, seed):
    rng = np.random.default_rng(seed); x = x0
    cols = [C['red'], C['navy'], C['green2'], C['amber'], C['violet'], C['dteal'], C['brown'], C['wine'], C['blue3']]
    while x < x1 - 2:
        bw = int(rng.integers(3, 6)); bh = int(rng.integers(y1 - y0 - 6, y1 - y0 + 1))
        if rng.random() < 0.12: x += bw; continue
        c = cols[int(rng.integers(0, len(cols)))]
        cv.rect(x, y1 - bh, min(x + bw, x1), y1, c); cv.vline(x, y1 - bh, y1, C['ink'])
        cv.hline(x + 1, min(x + bw, x1), y1 - bh + 3, C['amber'] if rng.random() < .5 else C['paper'])
        x += bw

def make_bookcase(r, seed):
    R = REG[r]
    def fn(cv):
        cv.rect(4, 4, 60, 124, R['wood'][0]); cv.rect(4, 4, 60, 10, R['wood'][2]); cv.vline(5, 10, 124, R['wood'][1]); cv.vline(58, 10, 124, R['wood'][1])
        for i, y in enumerate((12, 40, 68, 96)):
            cv.rect(8, y, 56, y + 24, R['wood2'][0]); books(cv, 8, y + 2, 56, y + 24, seed + i)
            cv.rect(6, y + 24, 58, y + 28, R['wood'][1]); cv.hline(6, 58, y + 24, R['wood'][2])
    return fn
for i, r in enumerate(('brook', 'fern', 'salt', 'cinder', 'revival', 'lantern', 'aurelith')):
    obj('i_bookcase_' + r, 1, 2, notes='stands against the back wall (rows 1-2)')(make_bookcase(r, 10 + i))

def make_cupboard(r):
    R = REG[r]
    def fn(cv):
        cv.rect(4, 6, 60, 122, R['wood'][1]); cv.vgrad(4, 6, 60, 14, R['wood'][2], R['wood'][1])
        for (x0, x1) in ((8, 31), (33, 56)):
            cv.rect(x0, 18, x1, 70, R['wood'][0]); cv.rect(x0 + 2, 20, x1 - 2, 68, R['wood'][1])
            cv.rect(x0, 76, x1, 116, R['wood'][0]); cv.rect(x0 + 2, 78, x1 - 2, 114, R['wood'][1])
        cv.rect(28, 42, 30, 48, R['acc']); cv.rect(34, 42, 36, 48, R['acc'])
        cv.rect(28, 92, 30, 98, R['acc']); cv.rect(34, 92, 36, 98, R['acc'])
    return fn
for r in ('brook', 'salt', 'cinder', 'revival', 'lantern', 'aurelith', 'fern'): obj('i_cupboard_' + r, 1, 2)(make_cupboard(r))

def make_dresser(r):
    R = REG[r]
    def fn(cv):
        foot_shadow(cv, 6, 58, 56, 5)
        box(cv, 6, 8, 58, 56, 10, [R['wood'][1], R['wood'][2]], [R['wood'][0], R['wood'][1]])
        for y in (22, 38): cv.hline(8, 56, y, R['wood2'][0]); cv.rect(28, y + 6, 36, y + 8, R['acc'])
        cv.ell(18, 8, 5, 6, C['grey3']); cv.ell(18, 7, 3, 4, C['lsky'])
    return fn
for r in REG: obj('i_dresser_' + r)(make_dresser(r))

def make_shelf_low(r):
    R = REG[r]
    def fn(cv):
        foot_shadow(cv, 4, 60, 56, 5)
        box(cv, 4, 16, 60, 56, 8, [R['wood'][1], R['wood'][2]], [R['wood2'][0]])
        books(cv, 8, 26, 56, 40, sum(map(ord, r)) % 97); cv.rect(6, 40, 58, 43, R['wood'][1])
        books(cv, 8, 44, 56, 54, sum(map(ord, r)) % 89 + 1)
        cv.ell(20, 12, 6, 6, C['grey2']); cv.ell(20, 12, 4, 4, C['lsky'])
        cv.rect(38, 4, 50, 16, R['acc']); cv.rect(40, 6, 48, 14, C['paper'])
    return fn
for r in REG: obj('i_shelf_' + r)(make_shelf_low(r))

# ---------------- electronics ----------------
@obj('i_tv')
def _tv(cv):
    foot_shadow(cv, 6, 58, 56, 5)
    box(cv, 6, 36, 58, 56, 6, [C['mbrown'], C['tan']], [C['brown'], C['mbrown']])
    cv.rect(10, 4, 54, 38, C['char']); cv.rect(13, 7, 51, 33, C['navy']); cv.vgrad(13, 7, 51, 33, C['blue3'], C['navy'])
    cv.line(16, 12, 24, 10, C['lsky']); cv.rect(44, 34, 48, 36, C['redor'])
@obj('i_tv_flat')
def _tvf(cv):
    foot_shadow(cv, 6, 58, 56, 5)
    box(cv, 8, 40, 56, 56, 6, [C['greyv'], C['grey']], [C['char'], C['slate']])
    cv.rect(4, 6, 60, 38, C['ink2']); cv.vgrad(7, 9, 57, 35, C['mviolet'], C['dviolet']); cv.line(10, 14, 22, 11, C['lav']); cv.rect(30, 38, 34, 42, C['char'])
@obj('i_radio')
def _radio(cv):
    foot_shadow(cv, 8, 56, 56, 5)
    box(cv, 8, 34, 56, 56, 6, REG['brook']['wood'][1:], REG['brook']['wood2'])
    box(cv, 14, 14, 50, 36, 6, [C['mbrown'], C['tan']], [C['brown'], C['mbrown']])
    cv.rect(17, 22, 33, 34, C['sand']); cv.fill(cv.mask_rect(17, 22, 33, 34) & ((cv.Y % 3) == 0), C['mbrown'])
    cv.ell(41, 27, 4, 4, C['ltan']); cv.px(41, 25, C['ink']); cv.line(44, 14, 52, 4, C['grey'])
@obj('i_pc')
def _pc(cv):
    foot_shadow(cv, 6, 58, 56, 5)
    box(cv, 6, 34, 58, 56, 8, [C['grey2'], C['grey3']], [C['greyv'], C['grey']])
    cv.rect(14, 6, 50, 34, C['grey2']); cv.rect(17, 9, 47, 30, C['dteal']); cv.vgrad(17, 9, 47, 30, C['teal'], C['dteal'])
    for y in (13, 18, 23): cv.hline(20, 20 + (y * 7) % 22 + 6, y, C['lteal'])
    cv.rect(20, 38, 44, 42, C['char'])

# ---------------- plants ----------------
def pot(cv, cx, y, col):
    cv.shadow_ell(cx + 4, y + 18, 14, 4)
    cv.rect(cx - 11, y, cx + 11, y + 18, col[0]); cv.rect(cx - 13, y - 3, cx + 13, y + 2, col[1]); cv.vgrad(cx - 9, y + 2, cx + 9, y + 16, col[1], col[0])
@obj('i_plant_fern')
def _p1(cv):
    pot(cv, 32, 40, [C['rust2'], C['orange2']])
    for a in np.linspace(-2.6, -0.5, 7):
        L = 24; ex, ey = 32 + L * np.cos(a), 40 + L * np.sin(a)
        cv.line(32, 40, int(ex), int(ey), C['green2'])
        for k in range(3, 22, 4):
            px, py = 32 + k * np.cos(a), 40 + k * np.sin(a)
            cv.ell(px, py, 3, 2, C['mgreen'] if k % 8 else C['lgreen'])
@obj('i_plant_flower')
def _p2(cv):
    pot(cv, 32, 40, [C['navy'], C['blue3']])
    cv.ell(32, 28, 16, 13, C['green']); cv.ell(30, 25, 12, 9, C['green2']); cv.ell(28, 23, 6, 4, C['mgreen'])
    for (x, y, c) in ((24, 22, C['pink3']), (38, 20, C['yellow']), (34, 32, C['pink3']), (22, 32, C['yellow']), (42, 29, C['pink3'])):
        cv.ell(x, y, 3.2, 3.2, c); cv.px(x, y, C['amber'])
@obj('i_plant_succulent')
def _p3(cv):
    pot(cv, 32, 42, [C['grey'], C['grey3']])
    for (x, y, rx, ry, c) in ((32, 30, 7, 14, C['sage']), (22, 34, 6, 9, C['green']), (42, 34, 6, 9, C['green']), (32, 30, 3, 10, C['lgreen'])):
        cv.ell(x, y, rx, ry, c)
@obj('i_plant_palm', 1, 2)
def _p4(cv):
    pot(cv, 32, 104, [C['rust2'], C['orange2']])
    cv.rect(30, 50, 34, 104, C['mbrown']); cv.fill(cv.mask_rect(30, 50, 34, 104) & (cv.Y % 6 == 0), C['brown'])
    for a in np.linspace(0, 2 * np.pi, 9)[:-1]:
        for k in range(2, 28, 2):
            x = 32 + k * np.cos(a); y = 46 + k * np.sin(a) * 0.6 + (k * k) / 60
            cv.ell(x, y, 3.5 - k / 12, 2.5, C['green2'] if k % 4 else C['mgreen'])
@obj('i_plant_mushroom')
def _p5(cv):
    pot(cv, 32, 42, [C['brown'], C['mbrown']])
    for (x, h, c, cc) in ((24, 18, C['red'], C['redor']), (38, 12, C['amber'], C['yellow'])):
        cv.rect(x - 2, 42 - h, x + 2, 42, C['cream']); cv.ell(x, 42 - h, 9, 6, c); cv.ell(x - 2, 40 - h, 4, 2, cc)
        cv.px(x + 3, 41 - h, C['paper']); cv.px(x - 4, 43 - h, C['paper'])
@obj('i_plant_coral')
def _p6(cv):
    pot(cv, 32, 42, [C['navy'], C['blue3']])
    for (x0, y0, x1, y1) in ((32, 42, 32, 14), (32, 30, 22, 18), (32, 26, 42, 16), (24, 22, 18, 12), (40, 20, 46, 10)):
        for t in np.linspace(0, 1, 16): cv.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 2.5, 2.5, C['salmon'])
    for (x, y) in ((32, 14), (22, 18), (42, 16), (18, 12), (46, 10)): cv.ell(x, y, 3, 3, C['pink3'])

# ---------------- rugs (walkable, 9-slice) ----------------
def make_rug(cols, edge, motif):
    def fn(cv):
        W = 192
        m = cv.mask_rect(6, 6, W - 6, W - 6)
        cv.ramp(m, cols, 0.5 + 0.12 * (((cv.X + cv.Y // 2) % 4) == 0) - 0.06 * (cv.Y % 2))
        cv.frame(6, 6, W - 6, W - 6, edge); cv.frame(12, 12, W - 12, W - 12, motif); cv.frame(13, 13, W - 13, W - 13, edge)
        d = np.abs(cv.X + 0.5 - 96) + np.abs(cv.Y + 0.5 - 96)
        cv.fill(m & ((d % 24) < 2) & (d < 70), motif)
        for x in range(10, W - 8, 6): cv.rect(x, 2, x + 2, 6, edge); cv.rect(x, W - 6, x + 2, W - 2, edge)
    return fn
for nm, cols, edge, motif in (('red', [C['wine'], C['red'], C['redor']], C['rust'], C['amber']),
                               ('teal', [C['dteal'], C['teal'], C['lteal']], C['dgreen'], C['pale']),
                               ('violet', [C['dviolet'], C['violet'], C['mviolet']], C['ink2'], C['yellow']),
                               ('sand', [C['sand'], C['sand2'], C['pale']], C['mbrown'], C['navy'])):
    obj('i_rug_' + nm, 3, 3, coll=0, cat='rug', notes='walkable 9-slice; corners/edges at r0/r2/c0/c2, centre r1c1 repeats', outline=False)(make_rug(cols, edge, motif))

# ---------------- counters ----------------
def make_counter(top, front, trim, sign=None):
    def mk(part):
        def fn(cv):
            x0 = 6 if part == 'l' else 0; x1 = 58 if part == 'r' else 64
            box(cv, x0, 14, x1, 60, 14, top, front, hl=top[-1])
            cv.rect(x0, 40, x1, 43, trim)
            if part == 'm' and sign: sign(cv)
        return fn
    return mk
for nm, top, front, trim in (('shop', [C['grey3'], C['paper']], [C['blue2'], C['sky']], C['navy']),
                              ('heal', [C['grey3'], C['paper']], [C['pink'], C['pink3']], C['wine']),
                              ('wood', [C['tan'], C['ltan']], [C['brown'], C['mbrown']], C['bark']),
                              ('steel', [C['grey'], C['grey3']], [C['slate'], C['greyv']], C['mviolet']),
                              ('marble', [C['grey3'], C['paper']], [C['grey2'], C['cream']], C['amber']),
                              ('station', [C['grey3'], C['paper']], [C['dteal'], C['teal']], C['amber'])):
    mk = make_counter(top, front, trim)
    for part in 'lmr': obj('i_counter_%s_%s' % (nm, part), notes='talk across it')(mk(part))

# shop shelves: wall unit (1x2, rows 1-2) and freestanding island (2x1)
def goods(cv, x0, x1, y, seed):
    rng = np.random.default_rng(seed); x = x0
    while x < x1 - 6:
        k = rng.integers(0, 4); w = 8
        if k == 0: cv.rect(x, y - 12, x + 7, y, C['redor']); cv.rect(x, y - 12, x + 7, y - 9, C['paper']); cv.px(x + 3, y - 6, C['paper'])
        elif k == 1: cv.ell(x + 4, y - 5, 4, 5, C['sky']); cv.rect(x + 3, y - 12, x + 5, y - 9, C['grey3'])
        elif k == 2: cv.rect(x, y - 9, x + 8, y, C['amber']); cv.hline(x, x + 8, y - 5, C['brown'])
        else: cv.rect(x + 1, y - 11, x + 7, y, C['lgreen']); cv.rect(x + 1, y - 11, x + 7, y - 8, C['fgreen'])
        x += w + 1
@obj('i_shopshelf_wall', 1, 2, notes='back-wall shelving (rows 1-2)')
def _ssw(cv):
    cv.rect(2, 6, 62, 126, C['grey2']); cv.rect(2, 6, 62, 12, C['grey3'])
    for i, y in enumerate((34, 62, 90, 118)):
        cv.rect(4, y - 22, 60, y, C['greyv']); goods(cv, 6, 60, y, i + 3); cv.rect(2, y, 62, y + 4, C['grey3']); cv.hline(2, 62, y + 3, C['grey'])
@obj('i_shopshelf_island', 2, 1)
def _ssi(cv):
    foot_shadow(cv, 4, 124, 56, 5)
    box(cv, 4, 10, 124, 58, 8, [C['grey2'], C['grey3']], [C['greyv'], C['grey']])
    goods(cv, 8, 120, 34, 11); cv.rect(6, 34, 122, 37, C['grey3']); goods(cv, 8, 120, 54, 12)
@obj('i_shopshelf_island_region', 2, 1)
def _ssr(cv):
    foot_shadow(cv, 4, 124, 56, 5)
    box(cv, 4, 10, 124, 58, 8, [C['tan'], C['ltan']], [C['brown'], C['mbrown']])
    goods(cv, 8, 120, 34, 21); cv.rect(6, 34, 122, 37, C['ltan']); goods(cv, 8, 120, 54, 22)

# ---------------- healing machine ----------------
@obj('i_heal_machine', 2, 2, notes='2x2 restoration console: plain counter with ONE crystal cradle (centre px [63,28] of the 128 px canvas) and a scanner slit; no slot tray (IP rule, Oct 22 2026)')
def _hm(cv):
    # Approved heal mechanic (Gary, Oct 22 2026, 11:26 PM CT): the whole team's crystals float into ONE cradle, one scanner sweep.
    # Cradle centre = canvas px (63, 28) = Animator's heal_restore anchor [30,30] (i_heal_machine_2x2_px). No baked shadow
    # (the engine casts it); top/front faces + right side panel + outline come from tools/furniture_depth.py.
    CX, CY = 63, 28
    dx, dy = abs(cv.X - CX), abs(cv.Y - CY)
    def hexm(w, a, h): return (dy <= h) & (dx <= w - (w - a) * dy / h)          # flat-top hexagon, symmetric about (CX, CY)
    # counter base: lit top face over a darker front face
    box(cv, 8, 50, 121, 117, 20, [C['lsky'], C['ice']], [C['sky'], C['lsky']])
    cv.rect(16, 76, 113, 77, C['blue3']); cv.rect(16, 108, 113, 109, C['blue3'])          # front panel seams
    cv.rect(38, 88, 89, 92, C['dteal']); cv.rect(40, 89, 87, 91, C['lteal'])              # one status strip
    cv.rect(22, 58, 48, 61, C['slate']); cv.rect(30, 57, 34, 62, C['grey'])               # slider (scan speed)
    cv.rect(90, 56, 96, 62, C['slate']); cv.rect(91, 57, 95, 61, C['amber'])              # start key
    cv.rect(100, 56, 106, 62, C['slate']); cv.rect(101, 57, 105, 61, C['lime'])           # ready lamp
    # back console: upright panel with a lit cap and the scanner slit along the top
    cv.rect(14, 4, 113, 52, C['sky']); cv.vgrad(14, 9, 113, 52, C['lsky'], C['sky'])
    cv.rect(14, 4, 113, 9, C['ice']); cv.hline(14, 113, 9, C['blue3'])
    cv.rect(30, 6, 97, 8, C['slate']); cv.hline(32, 95, 6, C['lteal'])                    # scanner emitter slit
    cv.rect(18, 14, 34, 44, C['blue2']); cv.rect(20, 16, 32, 42, C['slate'])               # left readout
    for y in (20, 26, 32): cv.hline(22, 30, y, C['lteal'])
    cv.rect(92, 14, 109, 44, C['blue2']); cv.rect(94, 16, 107, 42, C['slate'])             # right readout
    cv.rect(96, 34, 105, 40, C['dteal']); cv.rect(96, 37, 105, 40, C['teal'])
    # the cradle: hex bezel -> recessed hex bed -> crystal socket, all centred on (CX, CY)
    cv.fill(hexm(23, 12, 20), C['navy'])
    cv.fill(hexm(22, 11, 19), C['blue3'])
    cv.fill(hexm(22, 11, 19) & (cv.Y < CY - 12), C['lsky'])                              # bezel top rim catches the light
    cv.fill(hexm(18, 9, 15), C['char'])
    cv.fill(hexm(17, 9, 14), C['dteal'])
    cv.mix(hexm(17, 9, 14), C['dteal'], C['teal'], np.clip((CY + 14 - cv.Y) / 28.0, 0, 1) * 0.7)
    cv.fill(hexm(7, 4, 6), C['teal']); cv.fill(hexm(5, 3, 4), C['lteal']); cv.fill(hexm(2, 1, 2), C['ice'])
    cv.fill((dx == 0) & (dy <= 14) & (dy >= 8), C['teal']); cv.fill((dy == 0) & (dx <= 16) & (dx >= 9), C['teal'])   # alignment marks

# ---------------- lab ----------------
@obj('i_lab_desk', 2, 1)
def _ld(cv):
    foot_shadow(cv, 4, 124, 58, 5)
    box(cv, 4, 18, 124, 58, 16, [C['grey3'], C['paper']], [C['grey2'], C['grey3']])
    cv.rect(18, 4, 28, 30, C['char']); cv.rect(14, 26, 34, 32, C['slate']); cv.ell(23, 8, 5, 4, C['greyv']); cv.rect(28, 14, 34, 18, C['slate'])
    for (x, c) in ((52, C['lteal']), (62, C['pink3']), (72, C['lime'])):
        cv.rect(x, 14, x + 6, 30, C['ice']); cv.rect(x, 22, x + 6, 30, c)
    cv.rect(88, 18, 116, 32, C['paper']); cv.hline(92, 112, 22, C['grey']); cv.hline(92, 108, 26, C['grey'])
@obj('i_lab_machine', 1, 2)
def _lm(cv):
    cv.shadow_rect(8, 120, 62, 126)
    box(cv, 4, 6, 60, 122, 10, [C['grey2'], C['grey3']], [C['greyv'], C['grey2']])
    cv.rect(10, 22, 54, 52, C['char']); cv.vgrad(12, 24, 52, 50, C['teal'], C['dteal'])
    cv.line(14, 40, 22, 30, C['lteal']); cv.line(22, 30, 30, 44, C['lteal']); cv.line(30, 44, 40, 28, C['lteal']); cv.line(40, 28, 50, 38, C['lteal'])
    for i, x in enumerate((14, 24, 34, 44)): cv.ell(x + 3, 62, 3, 3, [C['redor'], C['lime'], C['amber'], C['sky']][i])
    cv.rect(12, 74, 52, 110, C['slate']); cv.fill(cv.mask_rect(12, 74, 52, 110) & (cv.Y % 4 == 0), C['char'])
@obj('i_specimen_tank', 1, 2)
def _st(cv):
    cv.shadow_rect(10, 118, 62, 124)
    cv.rect(8, 100, 56, 122, C['slate']); cv.rect(8, 100, 56, 104, C['grey'])
    cv.rect(10, 12, 54, 100, C['dteal']); cv.vgrad(12, 14, 52, 98, C['lteal'], C['teal'])
    for (x, y) in ((20, 80), (34, 60), (26, 40), (44, 30), (40, 84)): cv.ell(x, y, 2, 2, C['ice'])
    cv.ell(32, 64, 10, 12, C['mgreen']); cv.ell(30, 60, 4, 4, C['lime']); cv.ell(36, 60, 2, 2, C['ink'])
    cv.line(14, 20, 14, 90, C['ice']); cv.rect(6, 4, 58, 14, C['slate']); cv.rect(6, 4, 58, 7, C['grey'])
@obj('i_terminal')
def _term(cv):
    foot_shadow(cv, 8, 56, 56, 5)
    box(cv, 10, 30, 54, 58, 8, [C['grey'], C['grey2']], [C['slate'], C['greyv']])
    cv.rect(12, 4, 52, 32, C['char']); cv.vgrad(14, 6, 50, 28, C['mviolet'], C['dviolet'])
    for y in (10, 15, 20): cv.hline(17, 17 + (y * 5) % 20 + 8, y, C['lav'])
    cv.rect(16, 40, 48, 44, C['char'])
@obj('i_server_rack', 1, 2)
def _sr(cv):
    cv.shadow_rect(8, 120, 62, 126)
    box(cv, 6, 4, 58, 122, 8, [C['slate'], C['greyv']], [C['ink2'], C['char']])
    for y in range(18, 116, 12):
        cv.rect(10, y, 54, y + 9, C['char2']); cv.hline(10, 54, y, C['slate'])
        for k, x in enumerate((14, 19, 24)): cv.px(x, y + 4, [C['lime'], C['lav'], C['redor']][(y // 12 + k) % 3])
        cv.rect(34, y + 3, 50, y + 6, C['ink'])
@obj('i_crystal_display', 1, 2, notes='Kilumen lumen-crystal on a plinth (Revival Tech)')
def _cd(cv):
    cv.shadow_ell(36, 120, 22, 5)
    box(cv, 12, 84, 52, 122, 10, [C['grey3'], C['paper']], [C['grey2'], C['grey3']])
    cv.rect(16, 30, 48, 86, C['ice']); cv.frame(16, 30, 48, 86, C['grey3'])
    pts = np.abs(cv.X + 0.5 - 32) / 10 + np.abs(cv.Y + 0.5 - 56) / 22 <= 1
    cv.fill(pts, C['mviolet']); cv.fill(pts & (cv.X < 32), C['lviolet']); cv.fill(pts & (cv.X < 29) & (cv.Y < 52), C['lav'])
    cv.rect(16, 26, 48, 32, C['grey2'])
@obj('i_globe')
def _globe(cv):
    foot_shadow(cv, 16, 48, 56, 5)
    cv.rect(22, 50, 42, 56, C['brown']); cv.rect(30, 40, 34, 52, C['mbrown'])
    cv.ell(32, 24, 17, 17, C['amber']); cv.ell(32, 24, 14, 14, C['blue2'])
    for (x, y, rx, ry) in ((26, 18, 6, 4), (38, 28, 5, 6), (28, 30, 3, 2)): cv.ell(x, y, rx, ry, C['mgreen'])
    cv.ell(26, 16, 3, 2, C['lsky'])
@obj('i_telescope')
def _tel(cv):
    cv.shadow_ell(36, 56, 18, 4)
    for (x0, x1) in ((18, 32), (46, 32), (32, 32)): cv.line(x0, 56, x1, 32, C['brown'])
    for k in range(0, 30):
        cv.ell(20 + k, 34 - k * 0.7, 4 - k / 12, 4 - k / 12, C['amber'] if k % 9 else C['brown'])
    cv.ell(48, 14, 3, 3, C['lsky'])

# ---------------- fireplace & kitchen ----------------
@obj('i_fireplace', 2, 2, notes='back-wall hearth (rows 1-2); bottom row reaches the wainscot')
def _fp(cv):
    cv.rect(4, 8, 124, 128, C['slate2']); cv.rect(0, 4, 128, 14, C['brown']); cv.hline(0, 128, 4, C['tan'])
    yin = cv.Y % 12; off = ((cv.Y // 12) % 2) * 10
    m = cv.mask_rect(4, 14, 124, 128)
    cv.ramp(m, [C['wine'], C['red'], C['redor']], 0.4 + 0.25 * ((cv.X * 7 + cv.Y * 3) % 5 == 0))
    cv.fill(m & (((cv.X + off) % 20 == 19) | (yin == 11)), C['slate2'])
    cv.rect(28, 48, 100, 128, C['ink']); cv.ell(64, 48, 36, 18, C['ink'])
    cv.rect(36, 112, 92, 120, C['brown']); cv.rect(40, 106, 88, 112, C['mbrown'])
    for (x, h) in ((50, 30), (64, 40), (78, 28)):
        cv.ell(x, 112 - h / 2, 8, h / 2, C['orange']); cv.ell(x, 114 - h / 3, 5, h / 3, C['amber']); cv.ell(x, 116 - h / 6, 3, h / 6, C['yellow'])
    cv.rect(24, 20, 40, 32, C['amber']); cv.rect(88, 18, 104, 32, C['grey3']); cv.rect(60, 22, 68, 32, C['pink3'])
def make_kitchen(kind, top, body, trim):
    def fn(cv):
        cv.rect(2, 4, 62, 50, body[1]); cv.rect(2, 4, 62, 8, body[2])
        cv.rect(6, 12, 30, 46, body[0]); cv.rect(34, 12, 58, 46, body[0]); cv.rect(8, 14, 28, 44, body[1]); cv.rect(36, 14, 56, 44, body[1])
        cv.rect(26, 28, 28, 34, trim); cv.rect(36, 28, 38, 34, trim)
        if kind == 'fridge':
            cv.rect(4, 4, 60, 124, C['grey3']); cv.vgrad(4, 4, 60, 124, C['paper'], C['grey2']); cv.hline(4, 60, 52, C['grey']); cv.rect(50, 20, 54, 44, C['grey']); cv.rect(50, 62, 54, 96, C['grey'])
            cv.rect(12, 66, 22, 76, C['amber']); cv.rect(26, 70, 34, 78, C['sky']); return
        cv.rect(0, 68, 64, 76, top[1]); cv.hline(0, 64, 68, top[2]); cv.rect(0, 76, 64, 124, body[1])
        cv.rect(4, 80, 30, 120, body[0]); cv.rect(34, 80, 60, 120, body[0]); cv.rect(28, 96, 36, 100, trim)
        cv.rect(2, 52, 62, 68, C['grey3'] if kind != 'counter' else body[2])
        if kind == 'stove':
            cv.rect(0, 64, 64, 76, C['char']); cv.ell(18, 70, 9, 4, C['slate']); cv.ell(46, 70, 9, 4, C['slate']); cv.ell(18, 70, 5, 2, C['redor'])
            cv.rect(8, 82, 56, 112, C['char']); cv.rect(12, 86, 52, 96, C['slate2']); cv.hline(12, 52, 86, C['grey'])
            cv.ell(46, 60, 9, 6, C['grey2']); cv.rect(36, 56, 56, 60, C['grey'])
        elif kind == 'sink':
            cv.rect(12, 66, 52, 76, C['grey']); cv.rect(14, 68, 50, 74, C['lsky']); cv.rect(30, 56, 34, 66, C['grey2']); cv.rect(30, 56, 40, 59, C['grey2'])
        else:
            cv.rect(10, 58, 24, 68, C['tan']); cv.ell(44, 63, 8, 5, C['paper']); cv.ell(44, 62, 5, 3, C['redor'])
    return fn
for kind in ('stove', 'sink', 'counter', 'fridge'):
    obj('i_kitchen_' + kind, 1, 2, notes='back-wall kitchen unit (rows 1-2)')(make_kitchen(kind, [C['grey2'], C['grey3'], C['paper']], [C['brown'], C['mbrown'], C['tan']], C['amber']))

# ---------------- doors, stairs, mats ----------------
def make_mat(c1, c2, c3):
    def fn(cv):
        cv.rect(4, 14, 60, 60, c1); cv.rect(7, 17, 57, 57, c2)
        cv.fill(cv.mask_rect(9, 19, 55, 55) & (((cv.X + cv.Y) % 6) < 2), c3)
        cv.hline(6, 58, 61, C['ink'])
    return fn
for nm, cs in (('brook', (C['wine'], C['red'], C['redor'])), ('fern', (C['fgreen'], C['green2'], C['lgreen'])), ('salt', (C['navy'], C['blue2'], C['paper'])),
               ('cinder', (C['rust'], C['burnt'], C['amber'])), ('revival', (C['ink2'], C['dviolet'], C['mviolet'])), ('lantern', (C['dgreen'], C['dteal'], C['amber'])),
               ('aurelith', (C['dviolet'], C['violet'], C['yellow'])), ('heal', (C['wine'], C['pink'], C['paper'])), ('shop', (C['navy'], C['blue3'], C['paper'])),
               ('station', (C['char'], C['slate'], C['amber'])), ('lab', (C['slate'], C['grey'], C['lteal']))):
    obj('i_mat_' + nm, coll=4, cat='door', notes='exit mat: collision 4, needs a warp', outline=False)(make_mat(*cs))

def make_stairs(up, wood):
    """v0 stairs (flat bands). Still used by the steel pair only; wood/stone use draw_stairs below (stairs_v1)."""
    def fn(cv):
        if up:
            for i in range(6):
                y = 4 + i * 10; shade = wood[min(2, i // 2)]
                cv.rect(6, y, 58, y + 10, shade); cv.hline(6, 58, y, wood[2]); cv.hline(6, 58, y + 9, C['ink'])
            cv.rect(2, 0, 6, 64, wood[0]); cv.rect(58, 0, 62, 64, wood[0])
        else:
            cv.rect(4, 4, 60, 60, C['ink'])
            for i in range(5):
                y = 8 + i * 10; cv.rect(8 + i, y, 56 - i, y + 9, wood[2 - min(2, i // 2)] if i < 3 else C['char']); cv.hline(8 + i, 56 - i, y + 8, C['ink'])
            cv.frame(2, 2, 62, 62, wood[0])
    return fn

# ---- stairs_v1 (Oct 23 2026, Gary: "some type of dark side to give it the presentation of stairs" + "maybe a guard rail") ----
# ---- stairs_v2 (Oct 23 2026, Gary: "flip it the other way" + "widen at the bottom"): perspective taper reversed ----
# One 64 px tile, top-down 3/4 view, light from the upper left. The flight is NARROW AT THE TOP and every step is wider
# than the one above it. Left (open side): guard rail (handrail + a spindle per step, newel post with cap) following the
# taper. Middle: treads with a lit nosing line and a dark shadow line each. Right: the dark side (stringer / well wall),
# stepped, its outer edge stepping outward toward the bottom. UP = treads rise away and get LIGHTER toward the top,
# risers show; DOWN = treads drop away from the floor edge, narrow and fade into a black opening at the top.
# Colours are chosen per family so no code is shared with the floors/walls the stairs sit on (house rule);
# tools/gen_tiles.py prop('stairs_up') draws the core tileset's stairs_up with this same function.
# P keys: deep, abyss, side, side2, riser, tread [dark, light], hl, rail [dark, mid, light], cap,
# joint (None = wood; a colour = stone block joints).
def draw_stairs(cv, up, P):
    XL = lambda y: int(round(21 - 10 * y / 63.0))      # open (left) edge of the flight: 21 at the top -> 11 at the bottom
    XR = lambda y: int(round(43 + 8 * y / 63.0))       # right edge of the treads: 43 -> 51
    rd, rm, rl = P['rail']
    def joints(x0, x1, y0, y1, k, col=None):
        if P.get('joint') is None:
            g = P['tread'][0] if col != P['tread'][0] else P['riser']
            L = max(4, (x1 - x0) // 4)
            cv.hline(x0 + 2 + (k * 7) % 7, x0 + 2 + (k * 7) % 7 + L, y0 + (y1 - y0) // 2, g)          # wood grain dash
            cv.hline(x1 - 3 - L - (k * 5) % 5, x1 - 3 - (k * 5) % 5, y0 + 1 + (y1 - y0) // 2, g)
        else:
            off = 0 if k % 2 else 6
            for x in range(x0 + 5 + off, x1 - 3, 12): cv.vline(x, y0, y1, P['joint'])                    # staggered block joints
    def rail(steps, y_post):
        for y in range(0, y_post):                                                                         # handrail on the taper
            x = XL(y) - 9
            cv.rect(x, y, x + 7, y + 1, rd); cv.rect(x + 1, y, x + 6, y + 1, rm); cv.px(x + 2, y, rl); cv.px(x + 3, y, P['cap'] if P.get('rail_hl_cap') else rl)
        for y, xl in steps:                                                                                # a spindle per step
            cv.rect(xl - 4, y - 2, xl, y + 1, rd); cv.rect(xl - 4, y - 1, xl - 1, y, rm)
        xn = XL(y_post + 8) - 10                                                                           # newel post with cap
        cv.rect(xn, y_post, xn + 9, 64, rd); cv.rect(xn + 1, y_post + 4, xn + 8, 63, rm); cv.vline(xn + 2, y_post + 4, 63, rl)
        cv.rect(xn, y_post - 1, xn + 9, y_post + 4, rd); cv.rect(xn + 1, y_post, xn + 8, y_post + 3, rl); cv.hline(xn + 2, xn + 7, y_post, P['cap'])
        xt = XL(0) - 10                                                                                    # top post (cut by the wall)
        cv.rect(xt, 0, xt + 9, 3, rd); cv.rect(xt + 1, 0, xt + 8, 2, rl); cv.hline(xt + 2, xt + 7, 0, P['cap'])
    def side(xr, y0, y1, w, dark):
        cv.rect(xr, y0, xr + w, y1, P['side'])                                                             # dark side wall
        cv.mix(cv.mask_rect(xr + 1, y0 + (y1 - y0) // 2, xr + w - 1, y1), P['side'], P['deep'], 0.5 if not dark else 1.0)
        cv.hline(xr, xr + w, y0, P['side2'])                                                               # stepped top edge
        cv.vline(xr + w - 1, y0, y1, P['deep']); cv.vline(xr, y0, y1, P['deep'])                         # outer edge + crease
        cv.shadow_rect(xr + w, y0 + 2, xr + w + 3, y1)                                                     # cast shadow on the floor
    if up:
        x0t, x1t = XL(0), XR(0)
        cv.rect(XL(9) - 2, 0, x1t + 5, 4, P['deep']); cv.hline(x0t, x1t, 3, P['side'])   # the flight disappears under the ceiling
        steps = []
        for i in range(6):                                              # i = 0 top (far, high, narrow) .. 5 bottom (near, wide)
            y0 = 4 + 10 * i; xl, xr = XL(y0 + 5), XR(y0 + 5)
            tc = P['tread'][1] if i < 3 else P['tread'][0]
            cv.rect(xl, y0, xr, y0 + 5, tc)                             # flat tread colour; lighter toward the top
            joints(xl, xr, y0, y0 + 5, i, tc)
            cv.hline(xl, xr, y0 + 5, P['hl'])                           # lit nosing
            cv.hline(xl, xr, y0 + 6, P['deep'])                         # shadow under the nosing
            cv.rect(xl, y0 + 7, xr, y0 + 10, P['riser'])                # riser faces the viewer
            if P.get('joint') is not None: cv.vline(xl + 11 + (i % 2) * 6, y0 + 7, y0 + 10, P['joint'])
            side(xr, y0, y0 + 10, 5 + (i + 1) // 2, False)              # side wall steps outward toward the bottom
            cv.vline(xl - 1, y0, y0 + 10, P['deep']); cv.vline(xl - 2, y0, y0 + 10, P['side2'])          # open-side string board
            steps.append((y0 + 6, xl - 2))
        rail(steps[:-1], 47)
    else:
        steps = []
        for i in range(5):                                              # i = 0 near (floor level, wide) .. 4 deepest (narrow)
            y0 = 53 - 11 * i; xl, xr = XL(y0 + 6), XR(y0 + 6)
            tc = [P['tread'][1], P['tread'][0], P['riser'], P['side'], P['deep']][i]
            cv.rect(xl - 2, y0, xr + 1, y0 + 11, P['deep'])
            cv.rect(xl, y0 + 2, xr, y0 + 11, tc)                        # darker with depth
            if i < 3: joints(xl, xr, y0 + 2, y0 + 11, i, tc)
            cv.hline(xl, xr, y0 + 1, P['hl'] if i < 2 else (P['tread'][1] if i < 4 else P['tread'][0]))   # lit nosing
            cv.hline(xl, xr, y0, P['abyss'] if i > 1 else P['deep'])    # shadow of the drop beyond it
            side(xr, y0, y0 + 11, 6, i > 1)                             # well wall: darker deeper, outer edge steps outward going down
            cv.vline(xl - 1, y0, y0 + 11, P['deep']); cv.vline(xl - 2, y0, y0 + 11, P['side2'])          # open-side floor edge
            steps.append((y0 + 1, xl - 2))
        xl, xr = XL(4), XR(4)
        cv.rect(xl - 2, 0, xr + 6, 9, P['abyss'])                       # dark opening at the top
        cv.vline(xl - 2, 0, 9, P['side2']); cv.vline(xr + 5, 0, 9, P['deep'])
        cv.hline(XL(63) - 2, XR(58) + 6, 63, P['deep'])
        rail([s for s in steps if 6 < s[0] < 46], 47)

def draw_stairs_corner(cv, P):
    """(2026-10-23 stairs_v3, Gary 2:32 PM CT: "Move the stairs into the corner and add the wall piece") one flight on a 64x128
    canvas: rows 0-63 = stairs_up_wall (the flight climbing the wall face into a dark stairwell under a wooden lintel),
    rows 64-127 = stairs_up (the floor flight, v2 taper: narrow at the wall, wide at the bottom). Drawn as ONE picture so the
    seam is continuous; tools/gen_tiles.py crops the two tiles. Rail on the open (left) side, dark side wall on the right
    (the room's corner). The kit's draw_stairs (i_stairs_*) is untouched."""
    XL = lambda y: int(round(21 - 10 * y / 63.0)) if y >= 0 else 21    # floor flight tapers; the wall flight keeps the top width
    XR = lambda y: int(round(43 + 8 * y / 63.0)) if y >= 0 else 43
    rd, rm, rl = P['rail']
    def grain(x0, x1, y0, y1, k, col):
        g = P['tread'][0] if col != P['tread'][0] else P['riser']; L = max(4, (x1 - x0) // 4)
        cv.hline(x0 + 2 + (k * 7) % 7, x0 + 2 + (k * 7) % 7 + L, y0 + (y1 - y0) // 2, g)
        cv.hline(x1 - 3 - L - (k * 5) % 5, x1 - 3 - (k * 5) % 5, y0 + 1 + (y1 - y0) // 2, g)
    def side(xr, y0, y1, w, c=None):
        cv.rect(xr, y0, xr + w, y1, c or P['side']); cv.hline(xr, xr + w, y0, P['side2'])
        cv.vline(xr + w - 1, y0, y1, P['deep']); cv.vline(xr, y0, y1, P['deep'])
    O = 64                                                                 # combined-canvas offset of the floor tile
    # ---- wall tile (rows 0-63): stairwell opening, lintel, wall flight
    ox0, ox1 = 9, 50                                                       # opening incl. the rail lane
    cv.rect(ox0, 8, ox1, 64, P['deep'])                                    # dark stairwell cut into the wall
    cv.vline(ox0 - 1, 8, 64, P['side2']); cv.vline(ox0 - 2, 8, 64, P['deep'])            # left jamb trim
    cv.rect(ox0 - 3, 3, ox1 + 3, 9, rd); cv.rect(ox0 - 2, 4, ox1 + 2, 8, P['side2'])     # lintel beam
    cv.hline(ox0 - 2, ox1 + 2, 4, P['cap']); cv.hline(ox0 - 2, ox1 + 2, 8, P['deep'])
    wall_cols = [P['tread'][1], P['tread'][1], P['tread'][0], P['tread'][0], P['riser'], P['side']]
    steps = []
    for k, y0 in enumerate(range(59, 10, -9)):                             # 59 (nosing on row 63 meets the floor tile riser) .. 14 (dark, under the lintel)
        tc = wall_cols[min(k, len(wall_cols) - 1)]; xl, xr = XL(-1), XR(-1)
        cv.rect(xl, y0, xr, y0 + 4, tc)
        if k < 3: grain(xl, xr, y0, y0 + 4, k + 7, tc)
        cv.hline(xl, xr, y0 + 4, P['hl'] if k < 2 else (P['tread'][1] if k < 4 else P['riser']))   # nosing, fading upward
        cv.hline(xl, xr, y0 + 5, P['deep']); cv.rect(xl, y0 + 6, xr, y0 + 9, P['riser'] if k < 4 else P['side'])
        side(xr, y0, y0 + 9, 5, P['side'] if k < 3 else P['deep'])
        cv.vline(xl - 1, y0, y0 + 9, P['deep']); cv.vline(xl - 2, y0, y0 + 9, P['side2'])
        steps.append((y0 + 5, xl - 2))
    cv.rect(XR(-1) + 5, 9, ox1, 64, P['deep'])                             # corner shadow right of the side wall
    for y in range(9, O):                                                  # handrail continues straight up to the lintel
        x = XL(-1) - 9; cv.rect(x, y, x + 7, y + 1, rd); cv.rect(x + 1, y, x + 6, y + 1, rm); cv.px(x + 2, y, rl); cv.px(x + 3, y, rl)
    for y, xl in steps[:4]: cv.rect(xl - 4, y - 2, xl, y + 1, rd); cv.rect(xl - 4, y - 1, xl - 1, y, rm)
    # ---- floor tile (rows 64-127): v2 flight; its top step now continues the wall flight (no ceiling band, no cut post)
    fsteps = []
    cv.rect(XL(0), O + 0, XR(0), O + 4, P['riser']); cv.hline(XL(0), XR(0), O, P['deep'])   # riser of the first wall step
    side(XR(0), O, O + 4, 5); cv.vline(XL(0) - 1, O, O + 4, P['deep']); cv.vline(XL(0) - 2, O, O + 4, P['side2'])
    for i in range(6):
        y0 = 4 + 10 * i; xl, xr = XL(y0 + 5), XR(y0 + 5)
        tc = P['tread'][1] if i < 3 else P['tread'][0]
        cv.rect(xl, O + y0, xr, O + y0 + 5, tc); grain(xl, xr, O + y0, O + y0 + 5, i, tc)
        cv.hline(xl, xr, O + y0 + 5, P['hl']); cv.hline(xl, xr, O + y0 + 6, P['deep'])
        cv.rect(xl, O + y0 + 7, xr, O + y0 + 10, P['riser'])
        side(xr, O + y0, O + y0 + 10, 5 + (i + 1) // 2)
        cv.mix(cv.mask_rect(xr + 1, O + y0 + 5, xr + 4 + (i + 1) // 2, O + y0 + 10), P['side'], P['deep'], 0.5)
        cv.shadow_rect(xr + 5 + (i + 1) // 2, O + y0 + 2, xr + 8 + (i + 1) // 2, O + y0 + 10)
        cv.vline(xl - 1, O + y0, O + y0 + 10, P['deep']); cv.vline(xl - 2, O + y0, O + y0 + 10, P['side2'])
        fsteps.append((O + y0 + 6, xl - 2))
    for y in range(0, 47):
        x = XL(y) - 9; cv.rect(x, O + y, x + 7, O + y + 1, rd); cv.rect(x + 1, O + y, x + 6, O + y + 1, rm); cv.px(x + 2, O + y, rl); cv.px(x + 3, O + y, rl)
    for y, xl in fsteps[:-1]: cv.rect(xl - 4, y - 2, xl, y + 1, rd); cv.rect(xl - 4, y - 1, xl - 1, y, rm)
    xn = XL(55) - 10; yp = O + 47
    cv.rect(xn, yp, xn + 9, 128, rd); cv.rect(xn + 1, yp + 4, xn + 8, 127, rm); cv.vline(xn + 2, yp + 4, 127, rl)
    cv.rect(xn, yp - 1, xn + 9, yp + 4, rd); cv.rect(xn + 1, yp, xn + 8, yp + 3, rl); cv.hline(xn + 2, xn + 7, yp, P['cap'])

STAIRS_V1 = {
    # wood: rich reddish wood (rust/burnt) - no colour shared with the oak/pine/parquet floors or walls (any live recolour)
    'wood': dict(deep=C['dbrown2'], abyss=C['black'], side=C['rust'], side2=C['rust2'], riser=C['rust'], tread=[C['rust2'], C['burnt']],
                 hl=C['sand'], rail=[C['dbrown2'], C['rust2'], C['burnt']], cap=C['sand'], joint=None),
    # stone: warm sandstone blocks + dark iron rail with brass caps (kit stone homes: aurelith/cindervale grey walls/floors)
    'stone': dict(deep=C['dbrown2'], abyss=C['black'], side=C['bark'], side2=C['brown'], riser=C['mbrown2'], tread=[C['tan'], C['ltan']],
                  hl=C['pale'], rail=[C['ink2'], C['char2'], C['slate']], cap=C['sand'], joint=C['mbrown']),
}
def make_stairs_v1(up, P):
    def fn(cv): draw_stairs(cv, up, P)
    return fn
for nm, w in (('wood', None), ('stone', None), ('steel', [C['slate'], C['greyv'], C['grey2']])):
    up_fn = make_stairs_v1(True, STAIRS_V1[nm]) if nm in STAIRS_V1 else make_stairs(True, w)
    dn_fn = make_stairs_v1(False, STAIRS_V1[nm]) if nm in STAIRS_V1 else make_stairs(False, w)
    ol = nm not in STAIRS_V1            # v1 draws its own dark edges (no auto outline -> no stray floor colour codes)
    obj('i_stairs_up_' + nm, coll=4, cat='door', notes='stairs up: collision 4, warp to the floor above', outline=ol)(up_fn)
    obj('i_stairs_down_' + nm, coll=4, cat='door', notes='stairs down: collision 4, warp to the floor below', outline=ol)(dn_fn)

def make_walldoor(frame, panel, glass=None):
    def fn(cv):
        cv.rect(8, 10, 56, 128, frame[0]); cv.rect(8, 10, 56, 14, frame[1])
        cv.rect(12, 16, 52, 128, panel[0]); cv.vgrad(14, 18, 50, 126, panel[2], panel[1])
        if glass: cv.rect(20, 26, 44, 60, glass[0]); cv.vgrad(22, 28, 42, 58, glass[2], glass[1]); cv.vline(32, 28, 58, glass[0])
        else: cv.rect(18, 30, 46, 64, panel[0]); cv.rect(18, 76, 46, 118, panel[0]); cv.rect(20, 32, 44, 62, panel[1]); cv.rect(20, 78, 44, 116, panel[1])
        cv.rect(44, 80, 48, 86, C['amber'])
    return fn
obj('i_walldoor_wood', 1, 2, coll=1, cat='door', notes='decorative back-wall door (staff only, blocks)')(make_walldoor([C['bark'], C['tan']], [C['brown'], C['mbrown'], C['tan']]))
@obj('i_lift', 1, 2, coll=1, cat='door', notes='lift doors (Revival Tech HQ); upper floors not built yet, blocks')
def _lift(cv):
    cv.rect(4, 6, 60, 128, C['slate']); cv.rect(4, 6, 60, 22, C['char']); cv.rect(20, 10, 44, 18, C['ink2']); cv.rect(24, 12, 32, 16, C['lime'])
    cv.rect(10, 26, 54, 128, C['grey2']); cv.vgrad(10, 26, 31, 128, C['grey3'], C['grey']); cv.vgrad(33, 26, 54, 128, C['grey3'], C['grey'])
    cv.rect(31, 26, 33, 128, C['char']); cv.rect(56, 64, 59, 76, C['lav'])

# ---------------- regional props (1x1 unless noted) ----------------
@obj('i_anchor')
def _anchor(cv):
    foot_shadow(cv, 14, 50, 56, 4)
    cv.ell(32, 12, 6, 6, C['greyv']); cv.ell(32, 12, 3, 3, C['char'] if False else C['grey3'])
    cv.rect(30, 16, 34, 52, C['greyv']); cv.rect(20, 22, 44, 26, C['greyv'])
    for t in np.linspace(0, np.pi, 24): cv.ell(32 - 16 * np.cos(t), 40 + 12 * np.sin(t), 2.5, 2.5, C['greyv'])
    cv.ell(16, 40, 4, 4, C['greyv']); cv.ell(48, 40, 4, 4, C['greyv']); cv.vline(31, 18, 50, C['grey2'])
@obj('i_ship_wheel')
def _wheel(cv):
    cv.shadow_ell(36, 52, 18, 4)
    for a in np.linspace(0, 2 * np.pi, 9)[:-1]:
        cv.line(32, 30, int(32 + 24 * np.cos(a)), int(30 + 24 * np.sin(a)), C['brown'])
        cv.ell(32 + 24 * np.cos(a), 30 + 24 * np.sin(a), 2.5, 2.5, C['mbrown'])
    m = cv.mask_ell(32, 30, 18, 18) & ~cv.mask_ell(32, 30, 14, 14); cv.fill(m, C['mbrown'])
    cv.ell(32, 30, 5, 5, C['amber'])
@obj('i_net', coll=0, cat='prop', notes='hanging net on the wall (decor only)')
def _net(cv):
    for k in range(0, 56, 8):
        cv.line(4 + k, 6, 4 + k + 6, 56, C['sand']); cv.line(60 - k, 6, 54 - k, 56, C['sand'])
    cv.hline(2, 62, 6, C['mbrown']); cv.ell(20, 40, 4, 4, C['orange']); cv.ell(42, 30, 4, 4, C['paper'])
@obj('i_salt_jars')
def _jars(cv):
    foot_shadow(cv, 8, 56, 56, 4)
    for (x, h, c) in ((14, 24, C['paper']), (32, 30, C['ice']), (48, 20, C['pink3'])):
        cv.rect(x - 7, 56 - h, x + 7, 56, C['grey3']); cv.rect(x - 6, 58 - h, x + 6, 55, c); cv.rect(x - 8, 52 - h, x + 8, 56 - h, C['mbrown'])
@obj('i_barrel')
def _barrel(cv):
    foot_shadow(cv, 12, 52, 56, 4)
    cv.rect(14, 14, 50, 56, C['mbrown']); cv.hgrad(14, 14, 50, 56, C['tan'], C['brown']); cv.ell(32, 14, 18, 7, C['tan']); cv.ell(32, 14, 14, 5, C['mbrown'])
    for y in (24, 46): cv.rect(13, y, 51, y + 3, C['greyv'])
@obj('i_crates', 2, 1)
def _crates(cv):
    foot_shadow(cv, 4, 124, 56, 5)
    for (x0, y0, s) in ((4, 14, 44), (52, 22, 36), (88, 26, 34)):
        box(cv, x0, y0, x0 + s, 58, 10, [C['tan'], C['ltan']], [C['mbrown'], C['tan']])
        cv.line(x0 + 2, y0 + 12, x0 + s - 2, 56, C['brown']); cv.frame(x0, y0 + 10, x0 + s, 58, C['brown'])
    cv.rect(14, 30, 34, 38, C['dteal']); cv.rect(16, 32, 32, 36, C['amber'])
@obj('i_lantern_stand', 1, 2)
def _lstand(cv):
    cv.shadow_ell(36, 122, 14, 4)
    cv.rect(28, 40, 36, 122, C['dteal']); cv.rect(20, 116, 44, 124, C['dgreen'])
    cv.rect(18, 8, 46, 42, C['dgreen']); cv.rect(20, 12, 44, 38, C['amber']); cv.vgrad(22, 14, 42, 36, C['yellow'], C['amber2'])
    cv.rect(16, 4, 48, 10, C['dteal']); cv.rect(28, 0, 36, 4, C['dteal']); cv.vline(32, 12, 38, C['dgreen'])
@obj('i_anvil')
def _anvil(cv):
    foot_shadow(cv, 10, 54, 56, 5)
    cv.rect(24, 34, 40, 56, C['char']); cv.rect(18, 50, 46, 56, C['slate'])
    cv.rect(10, 20, 50, 34, C['slate']); cv.hline(10, 50, 20, C['grey']); cv.ell(52, 26, 8, 4, C['slate']); cv.ell(10, 24, 4, 4, C['slate'])
@obj('i_forge', 2, 2)
def _forge(cv):
    cv.shadow_rect(10, 118, 126, 124)
    box(cv, 6, 50, 122, 120, 18, [C['slate2'], C['grey']], [C['char'], C['slate']])
    cv.rect(26, 52, 102, 66, C['burnt']); cv.vgrad(28, 54, 100, 66, C['yellow'], C['orange'])
    for x in range(30, 100, 10): cv.ell(x + 4, 58, 3, 2, C['amber2'])
    cv.rect(44, 4, 84, 52, C['slate2']); cv.vgrad(44, 4, 84, 52, C['char'], C['slate2']); cv.rect(40, 44, 88, 52, C['slate'])
    cv.rect(20, 80, 108, 84, C['slate2']); cv.rect(56, 92, 72, 112, C['ink']); cv.ell(64, 104, 5, 5, C['orange'])
@obj('i_brazier')
def _braz(cv):
    foot_shadow(cv, 14, 50, 56, 4)
    cv.line(20, 56, 28, 36, C['char']); cv.line(44, 56, 36, 36, C['char']); cv.rect(14, 30, 50, 38, C['slate']); cv.ell(32, 30, 18, 5, C['char'])
    for (x, h) in ((24, 16), (32, 24), (40, 14)):
        cv.ell(x, 30 - h / 2, 5, h / 2, C['orange']); cv.ell(x, 30 - h / 3, 3, h / 3, C['amber2']); cv.ell(x, 30 - h / 6, 2, h / 6, C['yellow'])
@obj('i_tool_rack', coll=0, cat='prop', notes='wall-hung tools (decor only)')
def _rack(cv):
    cv.rect(4, 10, 60, 16, C['brown']); cv.hline(4, 60, 10, C['tan'])
    cv.rect(12, 16, 15, 50, C['mbrown']); cv.rect(8, 44, 19, 54, C['slate'])
    cv.rect(28, 16, 31, 52, C['mbrown']); cv.ell(30, 50, 6, 4, C['grey'])
    cv.rect(44, 16, 47, 46, C['mbrown']); cv.rect(40, 16, 52, 22, C['greyv'])
@obj('i_ore_cart')
def _cart(cv):
    foot_shadow(cv, 6, 58, 56, 5)
    box(cv, 8, 18, 56, 50, 8, [C['slate2'], C['grey']], [C['bark'], C['rust2']])
    for (x, y) in ((16, 14), (28, 12), (40, 15), (22, 18), (34, 18)): cv.ell(x, y, 6, 5, C['char'] if (x // 6) % 2 else C['orange2'])
    cv.ell(18, 52, 5, 5, C['char']); cv.ell(46, 52, 5, 5, C['char'])
@obj('i_fishing_rods', coll=0, cat='prop', notes='rods leaning on the wall (decor only)')
def _rods(cv):
    for (x, c) in ((16, C['tan']), (30, C['mbrown']), (44, C['ltan'])):
        cv.line(x, 60, x + 10, 4, c); cv.line(x + 1, 60, x + 11, 4, c)
    cv.ell(20, 40, 4, 4, C['grey']); cv.line(55, 4, 52, 30, C['grey3'])
@obj('i_river_stones', coll=0, cat='prop', notes='decorative pebble tray, walkable')
def _stones(cv):
    for (x, y, r, c) in ((20, 28, 7, C['grey']), (36, 22, 6, C['grey2']), (44, 38, 8, C['greyv']), (26, 42, 5, C['grey3']), (14, 18, 4, C['sage'])):
        cv.ell(x, y, r, r * 0.75, c); cv.px(x - 2, int(y - r * 0.4), C['paper'])
@obj('i_log_stool')
def _stool(cv):
    foot_shadow(cv, 16, 48, 54, 4)
    cv.rect(18, 22, 46, 52, C['mbrown']); cv.hgrad(18, 22, 46, 52, C['tan'], C['brown']); cv.ell(32, 22, 14, 7, C['ltan'])
    m = cv.mask_ell(32, 22, 9, 4) & ~cv.mask_ell(32, 22, 7, 3); cv.fill(m, C['tan']); cv.ell(30, 50, 3, 2, C['mgreen'])
@obj('i_trophy_case', 2, 2, notes='back-wall case of Master coins/trophies')
def _tcase(cv):
    cv.rect(4, 8, 124, 124, C['brown']); cv.rect(4, 8, 124, 14, C['amber'])
    for y in (18, 58):
        cv.rect(10, y, 118, y + 34, C['dteal']); cv.vgrad(10, y, 118, y + 34, C['lteal'], C['dteal'])
        for k, x in enumerate(range(20, 116, 24)):
            cv.ell(x, y + 22, 7, 7, [C['amber'], C['grey3'], C['orange2'], C['yellow']][k % 4]); cv.ell(x - 2, y + 20, 2, 2, C['paper'])
        cv.rect(8, y + 34, 120, y + 38, C['tan'])
    cv.rect(8, 98, 120, 124, C['mbrown']); cv.rect(60, 108, 68, 112, C['amber'])
@obj('i_statue', 1, 2)
def _statue(cv):
    cv.shadow_ell(38, 122, 20, 5)
    box(cv, 8, 88, 56, 124, 10, [C['grey2'], C['grey3']], [C['greyv'], C['grey']])
    cv.rect(10, 96, 54, 98, C['amber'])
    cv.ell(32, 70, 16, 18, C['grey3']); cv.ell(32, 40, 12, 12, C['grey3']); cv.ell(22, 30, 5, 10, C['grey3']); cv.ell(42, 30, 5, 10, C['grey3'])
    cv.ell(28, 38, 2, 2, C['greyv']); cv.ell(36, 38, 2, 2, C['greyv']); cv.ell(28, 66, 6, 10, C['paper']); cv.ell(48, 80, 8, 4, C['grey2'])
def make_banner(c, emb):
    def fn(cv):
        cv.rect(8, 4, 56, 8, C['amber']); cv.ell(8, 6, 3, 3, C['yellow']); cv.ell(56, 6, 3, 3, C['yellow'])
        m = cv.mask_rect(12, 8, 52, 110) | (cv.mask_rect(12, 110, 52, 124) & (np.abs(cv.X + 0.5 - 32) * 0.7 > cv.Y - 110))
        cv.fill(m, c[1]); cv.fill(m & ((cv.X < 15) | (cv.X >= 49)), c[0]); cv.fill(m & (cv.X >= 15) & (cv.X < 17), c[2])
        emb(cv)
    return fn
def emb_wave(cv):
    for k in range(3): 
        for x in range(18, 46): cv.px(x, int(50 + k * 10 + 3 * np.sin(x / 3)), C['paper'])
def emb_bolt(cv):
    for (a, b) in (((36, 30), (26, 56)), ((26, 56), (38, 56)), ((38, 56), (28, 84))): cv.line(a[0], a[1], b[0], b[1], C['lav']); cv.line(a[0] + 1, a[1], b[0] + 1, b[1], C['lav'])
def emb_beam(cv):
    cv.ell(32, 46, 8, 8, C['yellow']); 
    for a in np.linspace(0, 2 * np.pi, 9)[:-1]: cv.line(32, 46, int(32 + 16 * np.cos(a)), int(46 + 16 * np.sin(a)), C['amber2'])
    cv.ell(32, 46, 5, 5, C['paper'])
def emb_flame(cv):
    cv.ell(32, 64, 10, 18, C['orange']); cv.ell(32, 70, 6, 12, C['amber2']); cv.ell(32, 76, 3, 6, C['yellow'])
def emb_crown(cv):
    cv.rect(20, 56, 44, 70, C['yellow']); 
    for x in (20, 30, 40): cv.rect(x, 46, x + 4, 56, C['yellow'])
    cv.ell(32, 63, 3, 3, C['mviolet'])
for nm, c, e in (('salt', [C['navy'], C['blue2'], C['sky']], emb_wave), ('revival', [C['ink2'], C['dviolet'], C['violet']], emb_bolt),
                 ('lantern', [C['dgreen'], C['dteal'], C['teal']], emb_beam), ('cinder', [C['rust'], C['red'], C['redor']], emb_flame),
                 ('aurelith', [C['dviolet'], C['violet'], C['mviolet']], emb_crown)):
    obj('i_banner_' + nm, 1, 2, coll=0, cat='prop', notes='wall banner, hangs over the back wall rows 1-2')(make_banner(c, e))

def make_pillar(cols, cap):
    def fn(cv):
        cv.shadow_rect(14, 118, 58, 126)
        cv.rect(10, 108, 54, 124, cols[0]); cv.rect(8, 108, 56, 112, cols[2])
        cv.rect(14, 14, 50, 108, cols[1]); cv.hgrad(14, 14, 50, 108, cols[2], cols[0])
        cv.fill(cv.mask_rect(14, 14, 50, 108) & ((cv.X - 14) % 9 == 0), cols[0])
        cv.rect(8, 4, 56, 16, cap); cv.hline(8, 56, 4, C['paper'] if cap != C['char'] else C['grey'])
    return fn
for nm, cols, cap in (('stone', [C['greyv'], C['grey'], C['grey3']], C['grey2']), ('salt', [C['grey2'], C['grey3'], C['paper']], C['sky']),
                      ('steel', [C['char'], C['slate'], C['greyv']], C['mviolet']), ('brass', [C['dteal'], C['teal'], C['lteal']], C['amber']),
                      ('basalt', [C['ink'], C['char'], C['slate2']], C['orange2']), ('marble', [C['grey2'], C['cream'], C['paper']], C['yellow'])):
    obj('i_pillar_' + nm, 1, 2, notes='freestanding pillar; both tiles block')(make_pillar(cols, cap))

def make_dais(top, front, acc):
    def fn(cv):
        cv.shadow_rect(8, 118, 254, 126)
        box(cv, 4, 20, 252, 120, 64, top, front)
        cv.frame(12, 26, 244, 78, acc); cv.rect(4, 84, 252, 88, acc)
        d = np.abs(cv.X + 0.5 - 128) / 2 + np.abs(cv.Y + 0.5 - 52)
        cv.fill((d >= 14) & (d < 16), acc); cv.fill(d < 5, acc)
        for x in (32, 224): cv.ell(x, 52, 6, 6, acc)
        for k, x in enumerate(range(20, 236, 24)): cv.rect(x, 96, x + 16, 112, front[0])
    return fn
for nm, top, front, acc in (('salt', [C['grey3'], C['paper']], [C['grey'], C['grey2']], C['sky']), ('revival', [C['slate'], C['greyv']], [C['ink2'], C['char']], C['lav']),
                            ('lantern', [C['teal'], C['lteal']], [C['dgreen'], C['dteal']], C['amber']), ('cinder', [C['slate2'], C['grey']], [C['ink'], C['char']], C['orange']),
                            ('aurelith', [C['cream'], C['paper']], [C['grey2'], C['grey3']], C['yellow'])):
    obj('i_dais_' + nm, 4, 2, notes='Master dais. Walkable top row? no: whole dais blocks; Master stands in front of it')(make_dais(top, front, acc))
@obj('i_railing', coll=1, cat='prop')
def _rail(cv):
    cv.shadow_rect(0, 50, 64, 54)
    cv.rect(0, 20, 64, 26, C['amber']); cv.hline(0, 64, 20, C['yellow'])
    for x in (6, 22, 38, 54): cv.rect(x, 26, x + 4, 50, C['brown'])
    cv.rect(0, 46, 64, 50, C['brown'])

# ---------------- station ----------------
@obj('i_bench', 2, 1)
def _bench(cv):
    foot_shadow(cv, 6, 122, 52, 5)
    box(cv, 6, 8, 122, 24, 6, [C['tan'], C['ltan']], [C['brown'], C['mbrown']])
    box(cv, 4, 28, 124, 46, 10, [C['tan'], C['ltan']], [C['brown'], C['mbrown']])
    for x in (12, 112): cv.rect(x, 46, x + 4, 56, C['char']); cv.rect(x, 20, x + 4, 30, C['char'])
@obj('i_timetable', 2, 1, coll=0, cat='prop', notes='wall-mounted departures board (upper wall row)')
def _tt(cv):
    cv.rect(6, 10, 122, 56, C['char']); cv.rect(10, 14, 118, 52, C['ink2'])
    for i, y in enumerate((18, 28, 38)):
        cv.rect(14, y, 60, y + 6, C['amber']); cv.rect(70, y, 90, y + 6, C['lime'] if i else C['redor']); cv.rect(96, y, 112, y + 6, C['amber'])
    cv.rect(30, 56, 34, 64, C['grey']); cv.rect(94, 56, 98, 64, C['grey'])
@obj('i_turnstile')
def _turn(cv):
    foot_shadow(cv, 10, 54, 56, 4)
    box(cv, 8, 14, 22, 56, 6, [C['grey2'], C['grey3']], [C['slate'], C['greyv']]); box(cv, 42, 14, 56, 56, 6, [C['grey2'], C['grey3']], [C['slate'], C['greyv']])
    cv.rect(22, 30, 42, 33, C['amber']); cv.rect(10, 18, 20, 24, C['lime'])
@obj('i_rail_buffer')
def _buf(cv):
    cv.rect(10, 18, 54, 48, C['red']); cv.rect(10, 18, 54, 22, C['redor']); cv.fill(cv.mask_rect(10, 26, 54, 44) & (((cv.X + cv.Y) // 6) % 2 == 0), C['yellow'])
    cv.ell(20, 34, 5, 5, C['grey2']); cv.ell(44, 34, 5, 5, C['grey2'])
@obj('i_luggage')
def _lug(cv):
    foot_shadow(cv, 10, 54, 56, 4)
    box(cv, 10, 20, 40, 56, 6, [C['redor'], C['salmon']], [C['wine'], C['red']]); box(cv, 30, 30, 56, 56, 6, [C['sky'], C['lsky']], [C['navy'], C['blue2']])
    cv.rect(18, 14, 32, 18, C['char']); cv.rect(38, 26, 48, 29, C['char'])
@obj('i_poster_route', coll=0, cat='prop', notes='Lumen Line route map poster (wall)')
def _poster(cv):
    cv.rect(8, 8, 56, 56, C['paper']); cv.frame(8, 8, 56, 56, C['char'])
    pts = [(14, 46), (24, 36), (34, 40), (44, 22), (50, 16)]
    for a, b in zip(pts, pts[1:]): cv.line(a[0], a[1], b[0], b[1], C['mviolet'])
    for p in pts: cv.ell(p[0], p[1], 2.5, 2.5, C['amber'])
@obj('i_sign_board', coll=1, cat='prop', notes='freestanding info board (readable sign)')
def _board(cv):
    foot_shadow(cv, 10, 54, 56, 4)
    cv.rect(14, 36, 18, 56, C['brown']); cv.rect(46, 36, 50, 56, C['brown'])
    cv.rect(8, 8, 56, 40, C['mbrown']); cv.rect(11, 11, 53, 37, C['sand2'])
    for y in (16, 22, 28): cv.hline(15, 49, y, C['mbrown'])

# ---------------- puzzle objects (decoration layer) ----------------
@obj('i_boulder', coll=5, cat='puzzle', notes='pushable boulder (Strength); collision 5')
def _boulder(cv):
    cv.shadow_ell(36, 54, 22, 6)
    cv.ell(32, 34, 24, 21, C['greyv']); cv.ell(30, 30, 20, 16, C['grey']); cv.ell(25, 23, 9, 6, C['grey2']); cv.ell(22, 21, 3, 2, C['grey3'])
    cv.line(36, 40, 44, 34, C['slate2']); cv.line(20, 40, 26, 44, C['slate2'])
@obj('i_power_cube', coll=5, cat='puzzle', notes='Revival power cube: pushable like a boulder; on a rail-gap plate it bridges the rail')
def _cube(cv):
    cv.shadow_rect(14, 50, 58, 58)
    box(cv, 10, 12, 54, 54, 14, [C['grey'], C['grey2']], [C['slate'], C['greyv']], hl=C['grey3'])
    cv.rect(22, 32, 42, 48, C['dviolet']); cv.rect(25, 35, 39, 45, C['mviolet']); cv.rect(28, 38, 36, 42, C['lav'])
@obj('i_cool_stone', coll=5, cat='puzzle', notes='Cindervale cooling stone: pushable; dropped into a lava channel it becomes a dam')
def _cool(cv):
    cv.shadow_ell(36, 54, 22, 6)
    cv.ell(32, 34, 23, 20, C['navy']); cv.ell(30, 30, 19, 15, C['blue2']); cv.ell(26, 24, 9, 6, C['sky']); cv.ell(23, 22, 3, 2, C['ice'])
    cv.line(36, 42, 46, 34, C['ink2'])
def make_crystal(lit, cols):
    def fn(cv):
        cv.shadow_ell(36, 56, 14, 4)
        cv.rect(18, 46, 46, 56, C['slate']); cv.hline(18, 46, 46, C['grey'])
        m = (np.abs(cv.X + 0.5 - 32) / 11 + np.abs(cv.Y + 0.5 - 28) / 20) <= 1
        cv.fill(m, cols[0] if not lit else cols[1]); cv.fill(m & (cv.X < 32), cols[1] if not lit else cols[2])
        cv.fill(m & (cv.X < 29) & (cv.Y < 24), cols[2] if not lit else C['paper'])
        if lit:
            for (x, y) in ((14, 14), (50, 18), (48, 40), (16, 38)): cv.px(x, y, cols[2]); cv.px(x + 1, y, cols[2]); cv.px(x, y + 1, cols[2])
    return fn
obj('i_crystal_off', coll=1, cat='puzzle', notes='switch crystal (touch to toggle); state off')(make_crystal(False, [C['dviolet'], C['violet'], C['mviolet']]))
obj('i_crystal_on', coll=1, cat='puzzle', notes='switch crystal; state on')(make_crystal(True, [C['violet'], C['lviolet'], C['lav']]))
obj('i_crystal_reset', coll=1, cat='puzzle', notes='reset crystal (puts the room back to its start state)')(make_crystal(False, [C['navy'], C['blue3'], C['lsky']]))
obj('i_bellows', coll=1, cat='puzzle', notes='Cindervale bellows: reset (cools/clears stones and refills latches off)')(make_crystal(False, [C['rust'], C['burnt'], C['orange']]))
def make_gate(open_, laser=False):
    def fn(cv):
        if laser:
            cv.rect(2, 10, 12, 60, C['slate']); cv.rect(52, 10, 62, 60, C['slate']); cv.rect(4, 12, 10, 18, C['redor'] if not open_ else C['lime']); cv.rect(54, 12, 60, 18, C['redor'] if not open_ else C['lime'])
            if not open_:
                for y in (22, 34, 46): cv.rect(12, y, 52, y + 3, C['lav']); cv.hline(12, 52, y + 1, C['paper'])
            return
        if not open_:
            cv.shadow_rect(4, 56, 64, 62)
            for x in range(6, 60, 12):
                cv.rect(x, 6, x + 6, 58, C['violet']); cv.vline(x + 1, 6, 58, C['lviolet']); cv.ell(x + 3, 6, 4, 4, C['mviolet'])
            cv.rect(2, 18, 62, 24, C['dviolet']); cv.rect(2, 42, 62, 48, C['dviolet'])
        else:
            for x in range(6, 60, 12): cv.rect(x, 52, x + 6, 60, C['dviolet']); cv.hline(x, x + 6, 52, C['violet'])
    return fn
obj('i_gate_closed', coll=6, cat='puzzle', notes='puzzle gate, closed (collision 6)')(make_gate(False))
obj('i_gate_open', coll=0, cat='puzzle', notes='puzzle gate, open (walkable)')(make_gate(True))
obj('i_laser_closed', coll=6, cat='puzzle', notes='Revival laser gate, closed')(make_gate(False, True))
obj('i_laser_open', coll=0, cat='puzzle', notes='Revival laser gate, open')(make_gate(True, True))
def make_mirror(kind):
    def fn(cv):
        cv.shadow_ell(36, 56, 16, 4)
        cv.ell(32, 50, 14, 6, C['dteal']); cv.ell(32, 48, 10, 4, C['amber'])
        a, b = ((14, 44), (50, 10)) if kind == '/' else ((14, 10), (50, 44))
        for o in range(-3, 4): cv.line(a[0] + o, a[1], b[0] + o, b[1], C['ice'] if abs(o) < 2 else C['grey'])
        cv.line(a[0] - 4, a[1], b[0] - 4, b[1], C['brass'] if False else C['amber'])
    return fn
obj('i_mirror_slash', coll=1, cat='puzzle', notes="rotating mirror '/': touch to rotate to '\\'")(make_mirror('/'))
obj('i_mirror_back', coll=1, cat='puzzle', notes="rotating mirror '\\': touch to rotate to '/'")(make_mirror('\\'))
def make_lamp(kind):
    def fn(cv):
        cv.shadow_ell(36, 56, 18, 4)
        box(cv, 10, 22, 54, 56, 10, [C['teal'], C['lteal']], [C['dgreen'], C['dteal']])
        if kind == 'emitter':
            cv.ell(32, 18, 12, 12, C['amber']); cv.ell(32, 18, 8, 8, C['yellow']); cv.ell(30, 16, 3, 3, C['paper'])
        else:
            cv.ell(32, 18, 12, 12, C['char']); cv.ell(32, 18, 8, 8, C['yellow'] if kind == 'recv_on' else C['slate'])
            if kind == 'recv_on': cv.ell(30, 16, 3, 3, C['paper'])
    return fn
obj('i_beam_emitter', coll=1, cat='puzzle', notes='Lanternport lamp emitter (beam start); direction set per map')(make_lamp('emitter'))
obj('i_beam_receiver_off', coll=1, cat='puzzle', notes='beam receiver, unlit')(make_lamp('recv_off'))
obj('i_beam_receiver_on', coll=1, cat='puzzle', notes='beam receiver, lit (acts as a hold switch)')(make_lamp('recv_on'))
@obj('i_master_mark', coll=0, cat='prop', notes='floor mark where the Master stands (walk)', outline=False)
def _mm(cv):
    m = cv.mask_ell(32, 36, 20, 12) & ~cv.mask_ell(32, 36, 17, 10); cv.fill(m, C['amber']); cv.ell(32, 36, 4, 3, C['amber'])
@obj('i_trainer_mark', coll=0, cat='prop', notes='floor mark where a hall trainer stands (walk)', outline=False)
def _tm(cv):
    m = cv.mask_ell(32, 38, 16, 9) & ~cv.mask_ell(32, 38, 13, 7); cv.fill(m, C['grey2'])

def make_plate(on, kind='latch'):
    def fn(cv):
        cv.rect(10, 12, 54, 54, C['slate']); cv.hline(10, 54, 12, C['grey2']); cv.vline(10, 12, 54, C['grey2'])
        cv.rect(14, 16, 50, 50, C['greyv'] if not on else C['slate2'])
        c = (C['amber'] if kind == 'latch' else C['lsky']) if on else C['grey']
        if kind == 'latch':
            m = (np.abs(cv.X + 0.5 - 32) + np.abs(cv.Y + 0.5 - 33)) <= 11; cv.fill(m, c)
        else:
            cv.ell(32, 33, 10, 10, c)
        if on: cv.ell(32, 33, 3, 3, C['paper'])
    return fn
obj('i_plate_off', coll=7, cat='puzzle', notes='latch plate (stays down once pressed); up', outline=False)(make_plate(False))
obj('i_plate_on', coll=7, cat='puzzle', notes='latch plate, pressed', outline=False)(make_plate(True))
obj('i_holdplate_off', coll=7, cat='puzzle', notes='hold plate (needs a weight on it); up', outline=False)(make_plate(False, 'hold'))
obj('i_holdplate_on', coll=7, cat='puzzle', notes='hold plate, weighted', outline=False)(make_plate(True, 'hold'))
@obj('i_ledge_s', coll=2, cat='puzzle', notes='one-way drop (jump south only); collision 2', outline=False)
def _ledge(cv):
    cv.shadow_rect(0, 54, 64, 64)
    cv.rect(0, 40, 64, 54, C['slate2']); cv.hline(0, 64, 40, C['grey2']); cv.rect(0, 50, 64, 54, C['char'])
    for x in range(4, 64, 16): cv.vline(x, 42, 50, C['greyv'])
def make_beam(kind):
    def fn(cv):
        if kind in ('h', 'x'): cv.rect(0, 28, 64, 36, C['amber2']); cv.rect(0, 30, 64, 34, C['yellow']); cv.hline(0, 64, 31, C['paper'])
        if kind in ('v', 'x'): cv.rect(28, 0, 36, 64, C['amber2']); cv.rect(30, 0, 34, 64, C['yellow']); cv.vline(31, 0, 64, C['paper'])
    return fn
for k in 'hvx': obj('i_beam_' + k, coll=0, cat='overlay', notes='lamp beam overlay (drawn over floor/props on the overlay layer)', outline=False)(make_beam(k))
