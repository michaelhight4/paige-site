"""Furniture v2 archetypes: every piece is drawn from these in the house style (kitlib). Each function returns a Canvas
sized (32*w) x (32*h) logical px for a w x h tile group. `f` = animation frame (0..3) for animated props."""
from kitlib import *
import random
# ---- palettes (room sets + town accents) ----
WOOD = {'oak': hx('b5733f'), 'light': hx('d8a96a'), 'dark': hx('6e4630'), 'drift': hx('a99a86'), 'red': hx('8e3b2e'), 'white': hx('e9e6df')}
CLOTH = {'purple': hx('7d5bc4'), 'green': hx('4f9a6b'), 'blue': hx('4a7bd0'), 'teal': hx('3f9e9a'), 'red': hx('c8504a'), 'orange': hx('e08a3a'),
         'navy': hx('34467a'), 'sand': hx('d9c28f'), 'pink': hx('e58fb0'), 'yellow': hx('e9c046')}
LAB = {'body': hx('dfe6ea'), 'trim': hx('6fb3c8'), 'dark': hx('4b5866'), 'glass': hx('8fd8ee'), 'glow': hx('7cf0d0')}
LINEN = hx('f3ece0'); GOLD = hx('f2c14e'); STEEL = hx('9aa6b2'); BOOKS = [hx(c) for c in ('c8504a', '4a7bd0', 'e9c046', '4f9a6b', '7d5bc4', 'e08a3a', 'ede3cf')]
def legs(cv, x, y, w, c, h=3):
    cv.rect(x, y, 2, h, shade(c, 1.05)); cv.rect(x+w-2, y, 2, h, shade(c, .7))
def books(cv, x, y, w, h, seed, gaps=True, lean=True):
    r = random.Random(seed); i = x
    while i < x+w-1:
        bw = r.choice((1, 2, 2, 3)); bh = r.randint(max(2, h-3), h); c = r.choice(BOOKS)
        if gaps and r.random() < .12: i += 2; continue
        cv.rect(i, y+h-bh, bw, bh, c); cv.hline(i, y+h-bh, bw, shade(c, 1.25))
        if bw > 1: cv.vline(i+bw-1, y+h-bh+1, bh-1, shade(c, .75))
        i += bw
def goods_row(cv, x, y, w, h, seed):
    r = random.Random(seed); i = x
    while i < x+w-2:
        k = r.choice(('jar', 'box', 'can', 'bottle')); c = r.choice(BOOKS)
        if k == 'jar': cv.rect(i, y+h-4, 3, 4, shade(hx('bfe3ea'), 1)); cv.rect(i, y+h-2, 3, 2, c); cv.hline(i, y+h-5, 3, shade(c, .7)); i += 4
        elif k == 'box': cv.rect(i, y+h-5, 4, 5, c); cv.hline(i, y+h-5, 4, shade(c, 1.3)); cv.rect(i+1, y+h-3, 2, 1, LINEN); i += 5
        elif k == 'can': cv.rect(i, y+h-3, 2, 3, STEEL); cv.rect(i, y+h-2, 2, 1, c); i += 3
        else: cv.rect(i+1, y+h-6, 1, 2, shade(c, .7)); cv.rect(i, y+h-4, 3, 4, c); cv.p(i, y+h-4, shade(c, 1.4)); i += 4
# ---------------- HOME ----------------
def bed(w=1, h=2, wood=WOOD['oak'], blanket=CLOTH['purple'], worn=False, **k):
    cv = Canvas(32*w, 32*h); x0, W = 2, 32*w-6; H = 32*h
    cv.box(x0, 1, W, 3, 9, wood, side=3); cv.rect(x0+3, 6, W-9, 5, shade(wood, .7)); grain(cv, x0+3, 6, W-9, 5, shade(wood, .7), 3, 2)
    cv.rect(x0+1, 13, W-2, H-20, shade(LINEN, .93)); cv.rect(x0+W-4, 13, 3, H-20, shade(LINEN, .78))
    for px in range(w):  # one pillow per tile width
        pxx = x0+4+px*32; pw = min(W-10, 22)
        cv.rect(pxx, 14, pw, 7, LINEN); cv.hline(pxx+1, 13, pw-2, shade(LINEN, 1.1)); cv.hline(pxx, 21, pw, shade(LINEN, .8)); cv.vline(pxx+pw//2, 15, 4, shade(LINEN, .88))
    cv.rect(x0+1, 23, W-2, H-31, blanket); cv.rect(x0+W-4, 23, 3, H-28, shade(blanket, .72))
    cv.rect(x0+1, 23, W-2, 4, LINEN); cv.hline(x0+1, 27, W-2, shade(blanket, .7)); cv.hline(x0+1, 23, W-2, shade(LINEN, 1.1)); cv.rect(x0+1, 28, W-5, 2, shade(blanket, 1.18))
    for yy in range(36, H-14, 8):
        for i in range(x0+3, x0+W-5, 2): cv.p(i, yy, shade(blanket, .85))
    fb = CLOTH['yellow'] if blanket != CLOTH['yellow'] else CLOTH['red']; cv.box(x0+3, H-17, W-8, 3, 4, fb); cv.hline(x0+4, H-13, W-10, shade(fb, .65))
    cv.box(x0, H-8, W, 2, 4, wood, side=3); cv.rect(x0+1, H-2, 2, 1, shade(wood, .5)); cv.rect(x0+W-3, H-2, 2, 1, shade(wood, .5))
    if worn: cv.p(x0+6, 9, shade(wood, .55)); cv.p(x0+15, H-5, shade(wood, .6))
    return finish(cv)
def cabinet(w=1, h=1, wood=WOOD['oak'], kind='drawers', worn=False, top_items=True, seed=1, **k):
    """dresser / side table (drawers), cupboard / wardrobe (doors), filing / locker (metal drawers / doors)."""
    cv = Canvas(32*w, 32*h); x0 = 3; W = 32*w-8; H = 32*h; ytop = 4 if h == 1 else 6; th = 5
    tc, fc, sc = cv.box(x0, ytop, W, th, H-ytop-th-4, wood, side=3)
    if kind != 'metal': grain(cv, x0+1, ytop+1, W-4, th-2, tc, seed, 2)
    fy, fh = ytop+th, H-ytop-th-4; fw = W-3
    if kind in ('drawers', 'metal'):
        n = max(2, fh//8); dh = fh//n
        for i in range(n):
            y = fy+i*dh; cv.rect(x0+1, y+1, fw-1, dh-2, shade(wood, .9)); cv.hline(x0+1, y+1, fw-1, shade(wood, 1.06)); cv.hline(x0+1, y+dh-1, fw-1, shade(wood, .62))
            if kind == 'drawers': grain(cv, x0+2, y+2, fw-3, dh-4, shade(wood, .9), seed+i, 2)
            hc = GOLD if kind == 'drawers' else STEEL; cv.rect(x0+fw//2-1, y+dh//2, 3, 1, hc); cv.p(x0+fw//2-1, y+dh//2+1, shade(hc, .6)); cv.p(x0+fw//2+1, y+dh//2+1, shade(hc, .6))
            if kind == 'metal': cv.rect(x0+fw//2-3, y+2, 7, 2, LINEN)
    else:  # doors
        half = fw//2
        for j in (0, 1):
            dx = x0+1+j*half; cv.rect(dx+1, fy+2, half-2, fh-4, shade(wood, .88)); cv.rect(dx+2, fy+3, half-4, fh-6, shade(wood, .8)); cv.hline(dx+1, fy+2, half-2, shade(wood, 1.08))
            grain(cv, dx+2, fy+3, half-4, fh-6, shade(wood, .8), seed+j, 3)
        cv.rect(x0+half-1, fy+fh//2-2, 1, 4, GOLD); cv.rect(x0+half+2, fy+fh//2-2, 1, 4, GOLD)
    legs(cv, x0+1, H-4, W-3, shade(wood, .6), 3)
    if top_items and kind == 'drawers':
        cv.rect(x0+3, ytop-2, 5, 3, CLOTH['blue']); cv.hline(x0+3, ytop-2, 5, shade(CLOTH['blue'], 1.4))
        cv.ell(x0+W-7, ytop-2, 3, 2, hx('f6e7a6')); cv.vline(x0+W-7, ytop, 2, hx('7a5a3a'))
    if worn: cv.p(x0+5, fy+5, shade(wood, .5)); cv.p(x0+W-6, fy+fh-4, shade(wood, .5))
    return finish(cv)
def chair(w=1, h=1, wood=WOOD['oak'], cushion=CLOTH['red'], facing='down', stool=False, **k):
    cv = Canvas(32, 32)
    if stool:
        cv.ell(16, 15, 8, 4, shade(cushion, 1.1)); cv.ell(16, 14, 7, 3, shade(cushion, 1.3)); cv.rect(8, 15, 16, 3, shade(cushion, .8))
        cv.rect(14, 18, 4, 10, STEEL if wood == STEEL else wood); cv.vline(14, 18, 10, shade(wood, 1.2)); cv.ell(16, 28, 6, 2, shade(wood, .8)); return finish(cv)
    if facing in ('l', 'r'):
        back_x = 22 if facing == 'l' else 7; seat_x = 8
        cv.box(seat_x, 16, 17, 6, 3, cushion); cv.hline(seat_x+1, 17, 15, shade(cushion, 1.3))
        cv.rect(back_x, 4, 3, 21, shade(wood, .85)); cv.vline(back_x, 4, 21, shade(wood, 1.1)); cv.hline(back_x, 4, 3, shade(wood, 1.3))
        for lx in (seat_x, seat_x+15): cv.rect(lx, 25, 2, 6, wood if lx == seat_x else shade(wood, .75))
        return finish(cv)
    x0, W = 8, 16
    if facing == 'up':  # back view: the back rest is in FRONT of the seat
        cv.box(x0-1, 12, W+2, 5, 2, cushion); legs(cv, x0-1, 26, W+2, wood, 5)
        cv.box(x0, 4, W, 2, 18, wood); cv.rect(x0+3, 9, W-6, 10, shade(wood, .7)); grain(cv, x0+3, 9, W-6, 10, shade(wood, .7), 5, 3)
        return finish(cv)
    cv.box(x0, 2, W, 2, 4, wood)
    for i in (x0, x0+W-3): cv.rect(i, 8, 3, 10, shade(wood, .8)); cv.vline(i, 8, 10, shade(wood, 1.05))
    for i in (x0+5, x0+9): cv.rect(i, 8, 2, 8, shade(wood, .72))
    cv.box(x0-1, 16, W+2, 6, 3, cushion); cv.hline(x0, 17, W, shade(cushion, 1.3)); cv.rect(x0-1, 25, W+2, 2, shade(wood, .8))
    cv.rect(x0-1, 27, 3, 4, wood); cv.vline(x0-1, 27, 4, shade(wood, 1.15)); cv.rect(x0+W-2, 27, 3, 4, shade(wood, .85))
    cv.rect(x0+2, 27, 2, 2, shade(wood, .55)); cv.rect(x0+W-4, 27, 2, 2, shade(wood, .55))
    return finish(cv)
def table(w=2, h=1, wood=WOOD['oak'], cloth=None, food='plates', f=0, round_=False, **k):
    cv = Canvas(32*w, 32*h); x0 = 2; W = 32*w-6; H = 32*h; top = H-13 if h == 1 else H-14
    tc, fc, sc = cv.box(x0, 3, W, top-3, 4, wood, side=0)
    grain(cv, x0+1, 4, W-2, top-5, tc, 9, 3)
    if cloth: cv.rect(x0+W//4, 3, W//2, top-2, cloth); cv.rect(x0+W//4, top+1, W//2, 4, shade(cloth, .8)); cv.hline(x0+W//4, 3, W//2, shade(cloth, 1.3))
    for lx in (x0+1, x0+W-4): cv.rect(lx, top+4, 3, H-top-6, wood if lx == x0+1 else shade(wood, .7)); cv.vline(lx, top+4, H-top-6, shade(wood, 1.12) if lx == x0+1 else shade(wood, .6))
    if food:
        for px in range(x0+5, x0+W-8, 16):
            cv.ell(px+3, 8, 4, 2.4, hx('f4f1ea')); cv.ell(px+3, 8, 2.4, 1.4, shade(hx('f4f1ea'), .88))
            if food == 'toast': cv.rect(px+1, 6, 4, 3, hx('d79b4a')); cv.hline(px+1, 6, 4, hx('f1c27a'))
            else: cv.rect(px+2, 7, 3, 2, CLOTH['orange'] if (px//16) % 2 else CLOTH['green'])
        cv.rect(x0+W-6, 4, 3, 5, hx('bfe3ea')); cv.hline(x0+W-6, 4, 3, hx('ffffff'))
        if food == 'toast':  # steam rising off the plate (animated)
            for j, sx in enumerate((x0+7, x0+9)):
                yy = 3 - ((f + j*2) % 4)
                if yy >= 0: cv.p(sx + ((f+j) % 2), yy, (255, 255, 255, 170))
    return finish(cv)
def sofa(w=2, h=1, cloth=CLOTH['teal'], wood=WOOD['dark'], facing='down', **k):
    cv = Canvas(32*w, 32*h); x0 = 1; W = 32*w-5; H = 32*h
    if facing == 'up':  # back view (sofa faces a TV above it)
        cv.box(x0+3, 6, W-6, 4, 4, cloth); cv.box(x0, 10, W, 3, 15, shade(cloth, .95), side=0)
        cv.rect(x0+2, 15, W-4, 8, shade(cloth, .78)); cv.hline(x0+2, 15, W-4, shade(cloth, .9))
        for bx in range(x0+6, x0+W-4, 9): cv.p(bx, 19, shade(cloth, .6))
        cv.box(x0-0, 8, 5, 3, 17, shade(cloth, .9)); cv.box(x0+W-5, 8, 5, 3, 17, shade(cloth, .9)); legs(cv, x0+1, 27, W-2, wood, 3)
        return finish(cv)
    if facing in ('l', 'r'):  # side view: back rest along one long side, seat cushions stacked down the length
        W = 32*w; bx = W-10 if facing == 'l' else 3; sx = 5 if facing == 'l' else 11; sw = W-16
        cv.box(bx, 3, 7, 4, H-9, cloth, side=0); cv.vline(bx+1 if facing == 'r' else bx+5, 5, H-12, shade(cloth, 1.25))
        cv.box(sx-2, 2, sw+4, 3, 4, shade(cloth, .95)); cv.box(sx-2, H-11, sw+4, 3, 4, shade(cloth, .95))
        n = max(1, h*2-1); ch = (H-18)//n
        for i in range(n):
            cy = 7+i*ch; cv.box(sx, cy, sw, ch-4, 3, shade(cloth, 1.04)); cv.hline(sx+1, cy+1, sw-2, shade(cloth, 1.35))
        legs(cv, sx-2, H-4, sw+4, wood, 3); legs(cv, bx, H-4, 7, wood, 3)
        return finish(cv)
    cv.box(x0+2, 2, W-4, 3, 9, cloth); cv.rect(x0+4, 8, W-8, 4, shade(cloth, .75))
    n = max(2, w); cw = (W-10)//n
    for i in range(n):
        cx = x0+5+i*cw; cv.box(cx, 12, cw-1, 6, 4, shade(cloth, 1.04)); cv.hline(cx+1, 13, cw-3, shade(cloth, 1.35))
    cv.box(x0, 7, 5, 4, 15, cloth); cv.box(x0+W-5, 7, 5, 4, 15, cloth, side=2)
    cv.rect(x0+5, 22, W-10, 4, shade(cloth, .72)); legs(cv, x0+1, 26, W-2, wood, 3)
    cv.box(x0+7, 10, 6, 3, 3, CLOTH['yellow'])  # cushion detail
    return finish(cv)
def bookcase(w=1, h=2, wood=WOOD['oak'], seed=1, stock='books', worn=False, **k):
    cv = Canvas(32*w, 32*h); x0 = 3; W = 32*w-7; H = 32*h
    cv.box(x0, 1, W, 3, H-5, wood, side=3)
    inner = shade(wood, .48); cv.rect(x0+2, 5, W-7, H-11, inner)
    nsh = max(2, (H-11)//11); sh = (H-11)//nsh
    for i in range(nsh):
        y = 5+i*sh
        (goods_row if stock == 'goods' else books)(cv, x0+2, y+1, W-7, sh-3, seed*7+i)
        cv.rect(x0+2, y+sh-2, W-7, 2, shade(wood, 1.05)); cv.hline(x0+2, y+sh-2, W-7, shade(wood, 1.3))
    cv.rect(x0, H-6, W, 2, shade(wood, .7))
    if h >= 2 and stock == 'books': cv.ell(x0+W-8, 0, 3, 2, CLOTH['green']); cv.rect(x0+W-10, 1, 4, 2, CLOTH['red'])
    if worn: cv.p(x0+1, 20, shade(wood, .5)); cv.p(x0+W-3, 40, shade(wood, .5))
    return finish(cv)
def plant(w=1, h=1, leaf=hx('5aa84f'), pot=hx('c9643b'), kind='leafy', **k):
    cv = Canvas(32*w, 32*h); H = 32*h; cx = 16*w
    py = H-12; cv.box(cx-6, py, 12, 3, 7, pot, side=0); cv.hline(cx-5, py+3, 10, shade(pot, .65)); cv.rect(cx-5, py, 10, 2, hx('5a3a28'))
    r = random.Random(h*31+w)
    if kind == 'flower':
        for _ in range(6): x, y = cx+r.randint(-6, 6), py-r.randint(2, 9); cv.ell(x, y, 2.5, 2, leaf)
        for _ in range(5): x, y = cx+r.randint(-6, 6), py-r.randint(4, 10); cv.ell(x, y, 2, 2, CLOTH['pink']); cv.p(x, y, GOLD)
    elif kind == 'cactus':
        cv.rect(cx-2, py-12, 5, 12, leaf); cv.vline(cx-2, py-12, 12, shade(leaf, 1.3)); cv.rect(cx+3, py-8, 3, 2, leaf); cv.rect(cx+4, py-11, 2, 3, leaf)
    elif kind == 'mushroom':
        cv.rect(cx-1, py-6, 3, 6, LINEN); cv.ell(cx, py-7, 6, 3.5, CLOTH['red']); cv.p(cx-2, py-8, LINEN); cv.p(cx+2, py-7, LINEN)
    else:
        top = 4 if h == 1 else 6; spread = 9 if h == 1 else 11
        for i in range(14 if h == 1 else 46):
            y = r.randint(top, py-2); x = cx + r.randint(-spread, spread)*(min(py-y, (py-top)//2+4))//((py-top)//2+4); c = leaf if r.random() < .6 else shade(leaf, 1.25)
            cv.ell(x, y, 3.2, 2.2, c); cv.p(x-1, y-1, shade(leaf, 1.45))
        cv.vline(cx, py-6, 6, shade(leaf, .6))
    return finish(cv)
def crates(w=1, h=1, wood=WOOD['light'], kind='crate', seed=1, **k):
    cv = Canvas(32*w, 32*h); H = 32*h
    if kind == 'barrel':
        c = wood; cv.rect(8, 6, 16, 22, shade(c, .85)); cv.ell(16, 6, 8, 3, shade(c, 1.15)); cv.ell(16, 6, 6, 2, shade(c, .7))
        for y in (11, 22): cv.hline(8, y, 16, STEEL); cv.hline(8, y+1, 16, shade(STEEL, .7))
        for x in (11, 16, 21): cv.vline(x, 9, 18, shade(c, .72))
        cv.vline(9, 8, 19, shade(c, 1.1)); return finish(cv)
    if kind == 'bag':
        c = wood; cv.box(6, 10, 20, 5, 13, c, side=3); cv.rect(13, 6, 6, 4, shade(c, .7)); cv.rect(14, 7, 4, 2, None)
        cv.hline(6, 18, 20, shade(c, .65)); cv.rect(15, 17, 2, 3, GOLD); return finish(cv)
    r = random.Random(seed); xs = range(0, 32*w, 16) if w > 1 else [4]
    for i, x in enumerate(xs):
        s = 14 if w > 1 else 22; y = H-s-6; c = wood if i % 2 == 0 else shade(wood, .92)
        cv.box(x+2, y, s, 4, s-2, c, side=2); cv.rect(x+3, y+6, s-4, 1, shade(c, .7)); cv.rect(x+3, y+s-3, s-4, 1, shade(c, .7))
        cv.p(x+3, y+5, STEEL); cv.p(x+s-1, y+5, STEEL)
        if r.random() < .6: cv.rect(x+s//2-1, y+1, 4, 2, r.choice(BOOKS))
    return finish(cv)
# ---------------- KITCHEN / ANIMATED ----------------
def kitchen(w=1, h=2, part='counter', body=hx('3f9e9a'), wood=WOOD['oak'], f=0, **k):
    cv = Canvas(32*w, 32*h); x0 = 1; W = 32*w-4; H = 32*h
    top = hx('e9e3d6')
    if part == 'fridge':
        cv.box(x0+2, 2, W-4, 4, H-8, body, side=3); cv.hline(x0+3, 22, W-8, shade(body, .6)); cv.rect(x0+W-9, 10, 2, 8, STEEL); cv.rect(x0+W-9, 26, 2, 12, STEEL)
        cv.rect(x0+5, 9, 5, 4, CLOTH['yellow']); cv.rect(x0+11, 11, 4, 4, CLOTH['pink']); cv.vline(x0+3, 7, H-15, shade(body, 1.25)); return finish(cv)
    # base cabinets with a counter top
    ty = H-26; cv.box(x0, ty, W, 6, 18, top if part != 'stove' else STEEL, side=0)
    cv.rect(x0, ty+6, W, 16, wood); cv.hline(x0, ty+6, W, shade(wood, .6))
    for j in range(2):
        dx = x0+1+j*(W//2); cv.rect(dx+1, ty+8, W//2-3, 12, shade(wood, .88)); cv.hline(dx+1, ty+8, W//2-3, shade(wood, 1.08)); cv.rect(dx+W//2-6 if j == 0 else dx+2, ty+13, 1, 3, GOLD)
    cv.rect(x0, ty+22, W, 2, shade(wood, .5))
    # back splash tiles (on the wall above the counter)
    for yy in range(4, ty, 4):
        for xx in range(x0+1, x0+W-1, 4): cv.rect(xx, yy, 3, 3, hx('bfe0dc')); cv.p(xx, yy, hx('e4f4f1'))
    if part == 'sink':
        cv.rect(x0+6, ty+1, W-12, 4, shade(STEEL, .7)); cv.rect(x0+7, ty+2, W-14, 2, shade(hx('8fd8ee'), .9))
        cv.rect(x0+W//2-1, ty-6, 2, 6, STEEL); cv.hline(x0+W//2-1, ty-6, 5, STEEL); cv.p(x0+W//2+3, ty-5, STEEL)
        for j in range(3):  # running water (animated)
            yy = ty-4+((f+j) % 3)*2; cv.p(x0+W//2+3, yy, hx('bfefff')); cv.p(x0+W//2+3, yy+1, hx('6fc8f0'))
        cv.p(x0+W//2+2+(f % 3)-1, ty+2, (255, 255, 255, 255))
    elif part == 'stove':
        for bx in (x0+6, x0+W-11):
            glow = [hx('ff7a3c'), hx('ffb04a'), hx('ff5a2c'), hx('ff9a40')][(f + bx) % 4]
            cv.ell(bx+2, ty+3, 3.5, 1.6, shade(STEEL, .45)); cv.ell(bx+2, ty+3, 2, 1, glow)
        px = x0+5; cv.box(px, ty-5, 9, 2, 5, hx('c8504a')); cv.hline(px-1, ty-3, 1, shade(STEEL, .5))
        cv.rect(px+1, ty-5, 7, 1, hx('f1c27a'))
        for j in range(3):  # bubbling + rising steam
            yy = ty-7-((f + j) % 4)*2; cv.p(px+2+j*2+(f % 2), yy, (255, 255, 255, 190 - ((f + j) % 4)*35))
        cv.rect(x0+W//2-6, ty+8, 12, 7, shade(hx('34343e'), 1)); cv.rect(x0+W//2-5, ty+9, 10, 5, [hx('5a2a2a'), hx('6a322a')][f % 2])
    else:
        cv.rect(x0+4, ty-3, 6, 4, LINEN); cv.hline(x0+4, ty-3, 6, hx('ffffff')); cv.rect(x0+W-10, ty-4, 3, 5, CLOTH['red']); cv.rect(x0+W-6, ty-2, 3, 3, GOLD)
    return finish(cv)
def screen(w=1, h=1, kind='tv', body=hx('3a3442'), wood=WOOD['oak'], f=0, back=False, **k):
    cv = Canvas(32*w, 32*h); W = 32*w; H = 32*h
    if kind in ('tv', 'tv_back'):
        cv.box(3, H-12, W-8, 3, 7, wood, side=2); cv.rect(5, H-7, 4, 2, shade(wood, .6)); cv.rect(W-12, H-7, 4, 2, shade(wood, .6))
        if kind == 'tv_back':  # player sees the back of the TV (sofa side): case back + glow spill on the wall
            cv.box(W//2-9, H-24, 18, 3, 9, body, side=2); cv.rect(W//2-5, H-19, 10, 3, shade(body, .7))
            for i in range(3): cv.p(W//2-4+i*4, H-17, shade(body, .5))
            g = [hx('a6e4ff'), hx('c6f0ff'), hx('9fd6ff'), hx('d0f6ff')][f % 4]; cv.hline(W//2-10, H-25, 20, g)
            return finish(cv)
        cv.box(5, H-30, W-12, 2, 17, body, side=2); scr = (8, H-26, W-18, 12)
        pal = [[hx('5ec8f0'), hx('8ee08a')], [hx('f0c35e'), hx('5ec8f0')], [hx('e88ab0'), hx('8ee08a')], [hx('8ee08a'), hx('f0e05e')]][f % 4]
        cv.rect(*scr, pal[0]); cv.rect(scr[0], scr[1]+scr[3]//2+((f % 2)), scr[2], scr[3]//2-(f % 2), pal[1])
        cv.ell(scr[0]+4+f*3 % (scr[2]-6), scr[1]+4, 2, 2, hx('ffffff')); cv.hline(scr[0], scr[1], scr[2], shade(pal[0], 1.4)); cv.p(scr[0]+1, scr[1]+1, (255, 255, 255, 255))
        cv.p(W-9, H-15, CLOTH['red'] if f % 2 else CLOTH['green'])
        return finish(cv)
    # desk with a monitor / pc / terminal / radio
    if kind == 'radio':
        c = body; cv.box(6, H-20, 20, 3, 11, c, side=2); cv.ell(12, H-11, 3, 3, shade(c, .5)); cv.rect(17, H-14, 7, 2, GOLD); cv.vline(22, H-26, 6, STEEL); return finish(cv)
    if kind in ('terminal', 'company_terminal'):
        cv.box(6, 4, W-12, 3, H-10, LAB['dark'], side=2); scr = (9, 9, W-20, 11)
    else:
        top = H-16; cv.box(2, top, W-6, 4, 9, wood, side=0); legs(cv, 3, top+13, W-8, wood, 3); grain(cv, 3, top+1, W-8, 2, shade(wood, 1.1), 3, 2)
        mx = W//2-8 if w == 1 else W-30; cv.box(mx, top-15, 16, 2, 11, body, side=2); scr = (mx+2, top-12, 11, 7); cv.rect(mx+6, top-2, 4, 2, shade(body, .7))
        cv.rect(4, top+1, 6, 2, LINEN)  # keyboard / papers
        if w > 1: cv.rect(10, top+1, 10, 2, shade(LINEN, .9)); cv.rect(W-12, top-6, 4, 6, hx('bfe3ea'))
    c0 = [hx('6ff0c8'), hx('5ec8f0')][kind == 'pc']; cv.rect(*scr, shade(c0, .55))
    for i in range(0, scr[3]-1, 2): cv.hline(scr[0]+1, scr[1]+1+i, (scr[2]-3) - ((i*3+f) % 4), c0)
    if f % 2: cv.rect(scr[0]+scr[2]-3, scr[1]+scr[3]-3, 2, 2, (255, 255, 255, 255))  # blinking cursor
    return finish(cv)
# ---------------- LAB / CLINIC ----------------
def lab(w=1, h=2, kind='machine', f=0, accent=LAB['trim'], **k):
    cv = Canvas(32*w, 32*h); W = 32*w; H = 32*h; body = LAB['body']
    if kind == 'tank':
        cv.box(5, 2, W-10, 3, 6, LAB['dark']); cv.rect(6, 11, W-12, H-24, LAB['glass']); cv.vline(7, 12, H-27, hx('ffffff'))
        cv.rect(6, H-13, W-12, 3, hx('6fc8b0')); cv.box(4, H-13, W-8, 2, 9, LAB['dark'], side=2)
        for j in range(4): cv.p(10+j*4, (H-16) - ((f*3 + j*7) % (H-30)), (255, 255, 255, 255))
        cv.ell(W//2, H-22, 4, 3, hx('e88ab0')); cv.p(W//2+1, H-23, hx('3a3442'))
        return finish(cv)
    if kind == 'rack':
        cv.box(4, 2, W-9, 3, H-7, hx('3d4450'), side=3)
        for y in range(8, H-8, 5):
            cv.rect(6, y, W-14, 4, hx('2a2f38')); cv.hline(6, y, W-14, hx('5a6474'))
            for j in range(3): cv.p(8+j*3, y+2, [LAB['glow'], CLOTH['yellow'], hx('ff6a6a')][(f + y//5 + j) % 3] if (f + j + y) % 3 else hx('2a2f38'))
        return finish(cv)
    if kind == 'heal':
        cv.box(3, 4, W-7, 3, H-10, body, side=3); cv.rect(5, 8, W-12, 14, hx('3a3442'))
        g = [hx('ff8fb0'), hx('ffb0c8'), hx('ffd0e0'), hx('ffb0c8')][f % 4]
        for j in range(3): cv.ell(9+j*6, 15, 2.5, 2.5, g); cv.p(8+j*6, 14, (255, 255, 255, 255))
        cv.rect(6, 26, W-13, 3, accent); cv.rect(W//2-3, H-14, 6, 6, hx('e94f6a')); cv.rect(W//2-1, H-16+2, 2, 10, LINEN); cv.rect(W//2-5, H-12, 10, 2, LINEN)
        return finish(cv)
    if kind == 'display':  # glass case with crystals/goods
        cv.box(3, H-20, W-8, 3, 14, WOOD['dark'], side=2); cv.rect(4, 6, W-10, H-26, (190, 235, 245, 255)); cv.vline(5, 7, H-28, hx('ffffff'))
        for j in range(2): cv.ell(10+j*9, H-25, 2.5, 4, [hx('9a6ff0'), hx('5ec8f0')][j]); cv.p(9+j*9, H-27, (255, 255, 255, 255))
        cv.hline(4, 5, W-10, hx('ffffff')); return finish(cv)
    if kind == 'polisher':
        cv.box(4, 18, W-9, 4, H-24, body, side=3); cv.ell(W//2, 16, 8, 5, LAB['dark']); cv.ell(W//2, 15, 5, 3, [hx('9a6ff0'), hx('b88cff')][f % 2])
        for j in range(4): cv.rect(8+j*(W-18)//4, 26, 4, 3, [accent, CLOTH['yellow'], hx('ff6a6a'), LAB['glow']][(j+f) % 4])
        return finish(cv)
    # generic lab machine: body + screen + dials
    cv.box(3, 4, W-7, 3, H-10, body, side=3); cv.rect(6, 9, W-14, 10, hx('2a2f38'))
    for i in range(3): cv.hline(7, 11+i*3, (W-17) - ((i*5+f*3) % 7), LAB['glow'])
    for j in range(2): cv.ell(9+j*8, 26, 2.5, 2.5, shade(STEEL, .8)); cv.p(9+j*8, 25, hx('ffffff'))
    cv.rect(W-12, 24, 4, 2, [hx('ff6a6a'), LAB['glow']][f % 2]); cv.hline(4, H-14, W-9, accent)
    return finish(cv)
# ---------------- COUNTERS ----------------
def counter(w=1, h=1, seg='m', body=hx('d8a96a'), top=hx('efe4cc'), items=None, f=0, **k):
    cv = Canvas(32*w, 32*h); W = 32*w; H = 32*h
    x0 = 3 if seg == 'l' else 0; x1 = W-4 if seg == 'r' else W
    ty = H-26; cv.rect(x0, ty, x1-x0, 7, top); cv.hline(x0, ty, x1-x0, shade(top, 1.15)); cv.hline(x0, ty+6, x1-x0, shade(top, 1.3))
    cv.rect(x0, ty+7, x1-x0, 16, shade(body, .85)); cv.hline(x0, ty+7, x1-x0, shade(body, .6))
    for px in range(x0+3, x1-3, 10): cv.rect(px, ty+10, 7, 10, shade(body, .78)); cv.hline(px, ty+10, 7, shade(body, .95))
    if seg == 'r': cv.rect(x1-3, ty+1, 3, 22, shade(body, .66))
    cv.rect(x0, ty+23, x1-x0, 2, shade(body, .5))
    if items == 'bell': cv.ell(W//2, ty+1, 3, 2, GOLD); cv.p(W//2, ty-2, GOLD)
    elif items == 'cups':
        for j in range(3): cv.rect(6+j*8, ty-3, 4, 4, [LINEN, CLOTH['pink'], CLOTH['blue']][j]); cv.hline(6+j*8, ty-3, 4, shade(LINEN, .8))
    elif items == 'fruit':
        for j in range(5): cv.ell(8+j*4, ty+1-(j % 2), 2, 2, [CLOTH['red'], CLOTH['orange'], CLOTH['yellow'], CLOTH['green'], CLOTH['red']][j])
    elif items == 'register': cv.box(W//2-6, ty-6, 12, 3, 5, hx('4a5462')); cv.rect(W//2-4, ty-5, 8, 2, LAB['glow']); cv.rect(W//2-6, ty-1, 12, 2, shade(hx('4a5462'), .7))
    elif items == 'case': cv.rect(4, ty-8, W-8, 9, (190, 235, 245, 255)); cv.hline(4, ty-8, W-8, hx('ffffff')); cv.rect(8, ty-4, 5, 4, CLOTH['pink']); cv.rect(17, ty-4, 5, 4, hx('f1c27a'))
    elif items == 'blender': cv.rect(W//2-3, ty-9, 6, 8, (200, 240, 250, 255)); cv.rect(W//2-3, ty-5, 6, 4, [CLOTH['pink'], hx('ff9ad0')][f % 2]); cv.rect(W//2-4, ty-1, 8, 2, hx('4a5462'))
    elif items == 'papers': cv.rect(8, ty+1, 8, 4, LINEN); cv.rect(19, ty, 5, 3, CLOTH['yellow'])
    return finish(cv)
def fireplace(w=2, h=2, stone=hx('a7795a'), f=0, **k):
    cv = Canvas(32*w, 32*h); W = 32*w; H = 32*h
    cv.box(3, 6, W-7, 4, H-12, stone, side=3)
    for y in range(12, H-8, 5):
        for x in range(4 + (y % 2)*4, W-8, 8): cv.rect(x, y, 7, 1, shade(stone, .78))
    cv.box(1, 4, W-3, 3, 3, WOOD['dark'])
    ox, oy, ow, oh = W//2-12, H-30, 24, 22; cv.rect(ox, oy, ow, oh, hx('2a1e22')); cv.ell(W//2, oy, 12, 4, hx('2a1e22'))
    cv.rect(ox+2, oy+oh-4, ow-4, 3, WOOD['dark'])
    fl = [hx('ffcf4a'), hx('ff8a3a'), hx('ff5a2c')]
    for j in range(5):
        fx = ox+4+j*4; fh = 6 + ((f + j*3) % 4)*2
        cv.rect(fx, oy+oh-4-fh, 3, fh, fl[(j+f) % 3]); cv.p(fx+1, oy+oh-5-fh, fl[0])
    cv.box(ox-3, H-8, ow+6, 2, 3, shade(stone, .9))
    cv.rect(W//2-14, 2, 6, 3, CLOTH['blue']); cv.ell(W//2+10, 2, 3, 2, GOLD)
    return finish(cv)
def small(w=1, h=1, kind='globe', **k):
    cv = Canvas(32*w, 32*h)
    if kind == 'globe':
        cv.box(10, 24, 12, 2, 3, WOOD['dark']); cv.vline(16, 18, 6, GOLD); cv.ell(16, 13, 7, 7, CLOTH['blue']); cv.ell(14, 11, 3, 2, CLOTH['green']); cv.ell(19, 15, 2, 2, CLOTH['green']); cv.p(13, 9, hx('ffffff'))
    elif kind == 'rods':
        for j, c in enumerate((CLOTH['green'], CLOTH['red'], WOOD['oak'])): cv.vline(9+j*6, 2+j*2, 26-j*2, c); cv.vline(10+j*6, 2+j*2, 26-j*2, shade(c, .7))
        cv.box(6, 24, 20, 2, 4, WOOD['dark']); cv.ell(22, 14, 2, 2, STEEL)
    elif kind == 'luggage':
        c = CLOTH['red']; cv.box(6, 12, 20, 4, 14, c, side=3); cv.rect(13, 8, 6, 2, shade(c, .6)); cv.vline(15, 16, 10, GOLD); cv.box(9, 4, 12, 2, 6, CLOTH['blue'])
    elif kind == 'stones':
        for x, y, c in ((10, 20, STEEL), (19, 22, hx('b8b0a0')), (14, 14, hx('8a9aa8'))): cv.ell(x, y, 5, 3.5, c); cv.ell(x-1, y-1, 3, 1.5, shade(c, 1.25))
    elif kind == 'jars':
        for j in range(3): cv.rect(6+j*7, 14, 6, 12, (220, 240, 245, 255)); cv.rect(6+j*7, 19, 6, 7, [LINEN, CLOTH['sand'], hx('cfe8ef')][j]); cv.rect(6+j*7, 12, 6, 2, WOOD['oak'])
    elif kind == 'net':
        cv.vline(8, 2, 26, WOOD['oak']); cv.ell(18, 12, 8, 8, shade(LINEN, .8))
        for i in range(12, 26, 3): cv.vline(i, 5, 15, (150, 140, 120, 255))
        cv.ell(18, 12, 6, 6, None)
    elif kind == 'basket':
        c = hx('c9a064'); cv.box(7, 14, 18, 3, 11, c); [cv.vline(x, 17, 11, shade(c, .75)) for x in range(9, 25, 3)]; cv.ell(16, 13, 6, 3, CLOTH['red'])
    elif kind == 'books':
        for j, c in enumerate((CLOTH['red'], CLOTH['blue'], CLOTH['yellow'])): cv.box(8+j, 22-j*5, 16-j*2, 2, 3, c)
    elif kind == 'shoes':
        for x, c in ((8, CLOTH['blue']), (17, CLOTH['red'])): cv.box(x, 20, 8, 3, 4, c); cv.rect(x, 26, 8, 1, LINEN)
    elif kind == 'coatrack':
        pass
    return finish(cv)
def coatrack(w=1, h=2, wood=WOOD['dark'], **k):
    cv = Canvas(32, 64); cv.rect(15, 6, 3, 52, wood); cv.vline(15, 6, 52, shade(wood, 1.3)); cv.ell(16, 58, 8, 2.5, wood)
    cv.box(8, 8, 9, 3, 14, CLOTH['red']); cv.box(17, 12, 8, 3, 12, CLOTH['blue']); cv.ell(16, 5, 6, 2, CLOTH['yellow'])
    return finish(cv)
def stool(**k): return chair(stool=True, **k)
