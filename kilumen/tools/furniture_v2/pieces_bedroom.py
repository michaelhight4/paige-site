from kitlib import *
WOOD = hx('b5733f'); WOOD_D = hx('8a4f2c'); LINEN = hx('f3ece0'); BLANKET = hx('7d5bc4')
def bed(wood=WOOD, blanket=BLANKET, worn=False):
    cv = Canvas(32, 64); x0, w = 2, 26
    # back legs/headboard: top plane + tall front with panel
    cv.box(x0, 1, w, 3, 9, wood, side=3)
    cv.rect(x0+3, 6, w-9, 5, shade(wood, .7)); cv.hline(x0+3, 6, w-9, shade(wood, .6))  # inset panel
    grain(cv, x0+3, 6, w-9, 5, shade(wood, .7), seed=3, every=2)
    # mattress side (right plane) + base
    cv.rect(x0+1, 13, w-2, 44, shade(LINEN, .93)); cv.rect(x0+w-4, 13, 3, 44, shade(LINEN, .78))
    # pillow: puffy, lighter top, shadow seam
    cv.rect(x0+4, 14, w-10, 7, LINEN); cv.hline(x0+5, 13, w-12, shade(LINEN, 1.1)); cv.hline(x0+4, 21, w-10, shade(LINEN, .8))
    cv.p(x0+4, 14, None); cv.vline(x0+w//2-1, 15, 4, shade(LINEN, .88))
    # blanket with folded-back sheet band
    cv.rect(x0+1, 23, w-2, 33, blanket); cv.rect(x0+w-4, 23, 3, 36, shade(blanket, .72))
    cv.rect(x0+1, 23, w-2, 4, LINEN); cv.hline(x0+1, 27, w-2, shade(blanket, .7)); cv.hline(x0+1, 23, w-2, shade(LINEN, 1.1))
    cv.rect(x0+1, 28, w-5, 2, shade(blanket, 1.18))  # bright fold lip
    for yy in (36, 44):  # quilt stitch lines
        for i in range(x0+3, x0+w-5, 2): cv.p(i, yy, shade(blanket, .85))
    cv.vline(x0+w-6, 31, 22, shade(blanket, .88))
    # folded blanket at foot
    fb = hx('e0a94a'); cv.box(x0+3, 47, w-8, 3, 4, fb); cv.hline(x0+4, 51, w-10, shade(fb, .65))
    # footboard (low, front-facing) + legs
    cv.box(x0, 56, w, 2, 4, wood, side=3); cv.rect(x0+1, 62, 2, 1, WOOD_D); cv.rect(x0+w-3, 62, 2, 1, WOOD_D)
    if worn:
        cv.p(x0+6, 9, shade(wood, .55)); cv.p(x0+15, 59, shade(wood, .6))
    return finish(cv)
def dresser(wood=WOOD, worn=False, drawers=3):
    cv = Canvas(32, 32); x0, w = 3, 24
    tc, fc, sc = cv.box(x0, 4, w, 5, 19, wood, side=3)
    grain(cv, x0+1, 5, w-4, 3, tc, seed=7, every=2)
    dh = 19 // drawers
    for k in range(drawers):
        y = 9 + k*dh
        cv.rect(x0+1, y+1, w-5, dh-2, shade(wood, .9)); cv.hline(x0+1, y+1, w-5, shade(wood, 1.05))
        cv.hline(x0+1, y+dh-1, w-5, shade(wood, .62))
        grain(cv, x0+2, y+2, w-7, dh-4, shade(wood, .9), seed=k+11, every=2)
        hc = hx('f2c14e'); cv.rect(x0+w//2-3, y+dh//2, 3, 1, hc); cv.p(x0+w//2-3, y+dh//2+1, shade(hc, .6)); cv.p(x0+w//2-1, y+dh//2+1, shade(hc, .6))
    cv.rect(x0+1, 28, 2, 2, shade(wood, .55)); cv.rect(x0+w-4, 28, 2, 2, shade(wood, .55))
    # small lamp + book on top
    cv.rect(x0+3, 2, 5, 3, hx('6aa7d8')); cv.hline(x0+3, 2, 5, hx('a9d4f2'))
    cv.ell(x0+w-6, 2, 3, 2, hx('f6e7a6')); cv.vline(x0+w-6, 4, 2, hx('7a5a3a'))
    if worn: cv.p(x0+5, 14, shade(wood, .5)); cv.p(x0+14, 21, shade(wood, .5))
    return finish(cv)
def chair(wood=WOOD, cushion=hx('d9534f'), facing='down'):
    cv = Canvas(32, 32); x0 = 8; w = 16
    # back rest (behind seat): two posts + top rail + slats; back legs visible
    cv.box(x0, 2, w, 2, 4, wood, side=0)
    for i in (x0, x0+w-3): cv.rect(i, 8, 3, 10, shade(wood, .8)); cv.vline(i, 8, 10, shade(wood, 1.05))
    for i in (x0+5, x0+9): cv.rect(i, 8, 2, 8, shade(wood, .72))
    # seat: top cushion + front apron
    cv.box(x0-1, 16, w+2, 6, 3, cushion, side=0)
    cv.hline(x0, 17, w, shade(cushion, 1.3)); cv.rect(x0-1, 25, w+2, 2, shade(wood, .8))
    # legs: front legs long & lit, back legs shorter and darker (peek behind)
    cv.rect(x0-1, 27, 3, 4, wood); cv.vline(x0-1, 27, 4, shade(wood, 1.15)); cv.rect(x0+w-2, 27, 3, 4, shade(wood, .85))
    cv.rect(x0+2, 27, 2, 2, shade(wood, .55)); cv.rect(x0+w-4, 27, 2, 2, shade(wood, .55))
    return finish(cv)
