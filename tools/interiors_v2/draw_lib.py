"""Interiors v2 drawing helpers (Oct 28, 2026). Original art, drawn in code at 64 px native, Kilumen palette only."""
from PIL import Image, ImageDraw
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAL = [tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) for h in open(os.path.join(ROOT, 'art/palette/kilumen.hex')).read().split()]
def h(s): return tuple(int(s[i:i+2], 16) for i in (0, 2, 4)) + (255,)
SHADOW = (26, 18, 38, 96)
# ramps (light -> dark). Furniture ramps avoid the floor/wall codes of the house (checklist: no shared codes)
OUT = h('2c1a12'); INK = h('191210'); COOL_OUT = h('1a1226')
WOOD = [h('eea23c'), h('e29d40'), h('d46616'), h('9f4013'), h('561c0e'), h('2c1a12')]
DARKWOOD = [h('9f4013'), h('6a3019'), h('561c0e'), h('462c22'), h('2c1a12')]
CREAM = [h('fcf6e8'), h('f8eabe'), h('ccc6c2'), h('a8a0a4'), h('827a84')]
STEEL = [h('fcf6e8'), h('c6ecfa'), h('ccc6c2'), h('a8a0a4'), h('827a84'), h('54444e'), h('3e3a48')]
GREEN = [h('a6d460'), h('78ba48'), h('52983a'), h('367634'), h('24522e'), h('18382c')]
RED = [h('f08868'), h('d05440'), h('a23432'), h('6e222a')]
BLUE = [h('c6ecfa'), h('7ac2e8'), h('4692ce'), h('2c64a8'), h('1e4078')]
TEAL = [h('70cab8'), h('3e9c92'), h('246e6c'), h('18382c')]
PURP = [h('d6acff'), h('b076ec'), h('8a4ace'), h('603096'), h('3a1e60')]
GOLD = [h('fcd668'), h('eea23c'), h('e29d40')]
PINK = [h('f6a0ba'), h('daa2ba'), h('d2608c')]

class Canvas:
    # plane ids for the _n map: 0 none, 1 top, 2 front, 3 right side, 4 left side, 5 flat (floor/rug/wall paper)
    def __init__(s, w, hh, plane=2):
        s.im = Image.new('RGBA', (w, hh), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im)
        s.pl = Image.new('L', (w, hh), 0); s.dp = ImageDraw.Draw(s.pl); s.mode = plane
    def r(s, x, y, w, hh, c, pl=None):
        if w > 0 and hh > 0:
            s.d.rectangle([x, y, x + w - 1, y + hh - 1], fill=c)
            s.dp.rectangle([x, y, x + w - 1, y + hh - 1], fill=s.mode if pl is None else pl)
    def p(s, x, y, c, pl=None):
        if 0 <= x < s.im.width and 0 <= y < s.im.height:
            s.im.putpixel((x, y), c); s.pl.putpixel((x, y), s.mode if pl is None else pl)
    def top(s): s.mode = 1
    def front(s): s.mode = 2
    def side(s): s.mode = 3
    def flat(s): s.mode = 5
    def hl(s, x, y, w, c): s.r(x, y, w, 1, c)
    def vl(s, x, y, hh, c): s.r(x, y, 1, hh, c)
    def ell(s, x, y, w, hh, c): s.d.ellipse([x, y, x + w - 1, y + hh - 1], fill=c); s.dp.ellipse([x, y, x + w - 1, y + hh - 1], fill=s.mode)
    def poly(s, pts, c): s.d.polygon(pts, fill=c); s.dp.polygon(pts, fill=s.mode)
    def line(s, a, b, c, w=1): s.d.line([a, b], fill=c, width=w); s.dp.line([a, b], fill=s.mode, width=w)
    def outline(s, c=OUT, thick_bottom=True):
        """Outer outline: 1px all round, 2px on the bottom edge (dark baseline, contact)."""
        src = s.im.copy(); W, H = src.size; a = src.load(); o = s.im.load()
        for y in range(H):
            for x in range(W):
                if a[x, y][3]: continue
                n = [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
                hit = [(u, v) for u, v in n if 0 <= u < W and 0 <= v < H and a[u, v][3] == 255]
                if hit: o[x, y] = c; s.pl.putpixel((x, y), s.pl.getpixel(hit[0]))
        if thick_bottom:
            src = s.im.copy(); a = src.load()
            for y in range(H - 1, 0, -1):
                for x in range(W):
                    if not a[x, y][3] and a[x, y - 1][3] == 255 and a[x, y-1][:3] == c[:3]: o[x, y] = c; s.pl.putpixel((x, y), 2)
    def dither(s, x, y, w, hh, c, phase=0):
        for yy in range(y, y + hh):
            for xx in range(x, x + w):
                if (xx + yy + phase) % 2 == 0: s.p(xx, yy, c)
    def tiles(s, cols=1, rows=1, T=64):
        return [[(s.im.crop((cx*T, cy*T, cx*T+T, cy*T+T)), s.pl.crop((cx*T, cy*T, cx*T+T, cy*T+T))) for cx in range(cols)] for cy in range(rows)]

# plane id -> normal (x right, y down-screen, z toward viewer). 3/4 view: top faces up the screen and out, front faces the viewer.
NORMALS = {0: (0, 0, 1), 1: (0, -0.8, 0.6), 2: (0, 0.25, 0.97), 3: (0.8, 0, 0.6), 4: (-0.8, 0, 0.6), 5: (0, -0.6, 0.8)}
def normal_map(rgba, pl):
    out = Image.new('RGBA', rgba.size, (0, 0, 0, 0)); o = out.load(); a = rgba.load(); p = pl.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if a[x, y][3]:
                n = NORMALS.get(p[x, y], (0, 0, 1)); o[x, y] = tuple(int(round((v * 0.5 + 0.5) * 255)) for v in n) + (255,)
    return out

def snap(im):
    """Snap every opaque pixel to the locked palette; keep the SHADOW alpha; drop other partial alpha to opaque."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            if (r, g, b, a) == SHADOW: continue
            best = min(PAL, key=lambda q: (q[0]-r)**2 + (q[1]-g)**2 + (q[2]-b)**2)
            px[x, y] = best + (255,)
    return im

# ---- v2.1 detail helpers (Stardew-led pass, Oct 28, 2026) ----
import random
def grain(c, x, y, w, hh, R, seed=0, vertical=False, knots=1, base=None):
    """Wood fill: base tone, wavy darker streaks, a few lit streaks, ringed knots. R = 6-step wood ramp."""
    rnd = random.Random(seed); b = R[2] if base is None else base
    c.r(x, y, w, hh, b)
    L, S = (hh, w) if vertical else (w, hh)
    for k in range(max(2, S // 3)):
        s0 = rnd.randrange(0, S); col = R[3] if rnd.random() < .75 else R[1]
        ph = rnd.random() * 6.28; amp = rnd.choice((0, 1, 1, 2)); seg = rnd.randrange(L // 3, L)
        st = rnd.randrange(0, max(1, L - seg))
        import math
        for t in range(st, st + seg):
            s = s0 + int(round(amp * math.sin(t / 7 + ph)))
            if 0 <= s < S and rnd.random() < .85:
                c.p(x + (s if vertical else t), y + (t if vertical else s), col)
    for _ in range(knots):
        if w < 10 or hh < 8: break
        kx = x + rnd.randrange(3, w - 7); ky = y + rnd.randrange(2, hh - 5)
        c.ell(kx, ky, 6, 4, R[3]); c.ell(kx + 1, ky + 1, 4, 2, R[4]); c.p(kx + 2, ky + 1, R[5])
        c.hl(kx - 3, ky - 1, 3, R[3]); c.hl(kx + 6, ky + 4, 3, R[3])

def thick_outline(c, col, n=2):
    for i in range(n): c.outline(col, thick_bottom=(i == n - 1))

def knob(c, x, y, G=None):
    G = G or GOLD; c.r(x, y, 3, 3, G[2]); c.p(x, y, G[0]); c.p(x + 2, y + 2, h('9f4013')); c.p(x + 1, y + 3, h('2c1a12')); c.p(x + 2, y + 3, h('2c1a12'))

def hinge(c, x, y, hh=4):
    c.r(x, y, 2, hh, STEEL[4]); c.p(x, y, STEEL[2]); c.p(x + 1, y + hh - 1, STEEL[5])

def leaf(c, cx, cy, ang, ln, wd, R):
    """Pointed leaf: dark body, lit upper half, midrib."""
    import math
    dx, dy = math.cos(ang), math.sin(ang)
    for t in range(ln):
        f = t / ln; half = wd * math.sin(math.pi * min(1, f * 1.15)) / 2
        px, py = cx + dx * t, cy + dy * t
        for s in range(-int(half), int(half) + 1):
            qx, qy = int(round(px - dy * s)), int(round(py + dx * s))
            col = R[1] if s < 0 else R[2]
            if abs(s) >= int(half) and half >= 1: col = R[3]
            c.p(qx, qy, col)
        if t > 1 and t < ln - 1: c.p(int(round(px)), int(round(py)), R[3] if t % 3 else R[0])
    c.p(int(round(cx + dx * 2)), int(round(cy + dy * 2 - 1)), R[0])

def quilt(c, x, y, w, hh, R, cell=8):
    """Quilted fabric: puffed diamonds (lit top-left, shaded bottom-right), stitch dots on seams."""
    c.r(x, y, w, hh, R[1])
    for yy in range(y, y + hh):
        for xx in range(x, x + w):
            u, v = (xx - x + yy - y) % cell, (xx - x - (yy - y)) % cell
            if u == 0 or v == 0: c.p(xx, yy, R[3] if (xx + yy) % 2 else R[2])
            elif u < 3 and v > cell - 4: c.p(xx, yy, R[0])
            elif u > cell - 3: c.p(xx, yy, R[2])
