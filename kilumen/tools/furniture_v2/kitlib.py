"""Kilumen furniture v2 house-style pixel kit library (own art, drawn from code).
Logical grid: 32px per tile, upscaled x2/x4/x6 (nearest) for tiles_1x/2x/3x.
Style (Gary + INTERIOR_DESIGN_NOTES + Slime World indoor sheets): light from top-left; flat light tops with a bright
front edge line; darker fronts; side planes darker still; thick 1-logical-px outline in a darker shade of the
neighbouring pixel's own colour; soft shadow cast down-right; chunky simple shapes."""
from PIL import Image
import colorsys
T = 32
def hx(s):
    s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4)) + (255,)
def shade(c, f, sat=1.0):
    r, g, b = [v/255 for v in c[:3]]; h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = max(0, min(1, l*f if f < 1 else l + (1-l)*(f-1))); s = max(0, min(1, s*sat))
    if f < 1: h = (h + 0.015) % 1  # darker = slightly warmer/cooler hue shift, never pure black
    r, g, b = colorsys.hls_to_rgb(h, l, s); return (round(r*255), round(g*255), round(b*255), 255)
class Canvas:
    def __init__(self, w, h): self.w, self.h = w, h; self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); self.px = self.im.load()
    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c: self.px[x, y] = c
    def rect(self, x, y, w, h, c):
        for j in range(y, y+h):
            for i in range(x, x+w): self.p(i, j, c)
    def hline(self, x, y, w, c): self.rect(x, y, w, 1, c)
    def vline(self, x, y, h, c): self.rect(x, y, 1, h, c)
    def ell(self, cx, cy, rx, ry, c):
        for j in range(int(cy-ry)-1, int(cy+ry)+2):
            for i in range(int(cx-rx)-1, int(cx+rx)+2):
                if ((i+.5-cx)/rx)**2 + ((j+.5-cy)/ry)**2 <= 1: self.p(i, j, c)
    def box(self, x, y, w, top, front, c, side=0, edge=True, topc=None):
        """3/4 box: top plane (light) h=top, front plane (darker) h=front, optional right side plane width=side."""
        tc = topc or shade(c, 1.12); fc = shade(c, 0.82); sc = shade(c, 0.66)
        self.rect(x, y, w, top, tc)
        if edge: self.hline(x, y+top-1, w, shade(tc, 1.35)); self.hline(x, y, w, shade(tc, 1.18))
        self.rect(x, y+top, w, front, fc)
        if side: self.rect(x+w-side, y+top, side, front, sc); self.rect(x+w-side, y+1, side, top-1, shade(tc, .9))
        return tc, fc, sc
def outline(cv, f=0.45, ignore_alpha_below=200):
    """Thick self-colour outline: every empty pixel touching the piece takes a dark shade of that neighbour."""
    src = cv.im.copy(); sp = src.load(); out = cv.px
    for y in range(cv.h):
        for x in range(cv.w):
            if sp[x, y][3] >= ignore_alpha_below: continue
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                X, Y = x+dx, y+dy
                if 0 <= X < cv.w and 0 <= Y < cv.h and sp[X, Y][3] >= ignore_alpha_below:
                    out[x, y] = shade(sp[X, Y], f); break
    return cv
def with_shadow(cv, dx=2, dy=2, a=70, col=(40, 24, 30)):
    """Soft shadow cast down-right (two-step: core + fringe), drawn UNDER the piece."""
    base = Image.new('RGBA', cv.im.size, (0, 0, 0, 0)); m = cv.im.split()[3].point(lambda v: 255 if v > 0 else 0)
    for (ox, oy, al) in ((dx+1, dy+1, a//2), (dx, dy, a)):
        layer = Image.new('RGBA', cv.im.size, col + (al,)); sh = Image.new('L', cv.im.size, 0); sh.paste(m, (ox, oy))
        base = Image.alpha_composite(base, Image.composite(layer, Image.new('RGBA', cv.im.size, (0, 0, 0, 0)), sh))
    cv.im = Image.alpha_composite(base, cv.im); cv.px = cv.im.load(); return cv
def finish(cv, shadow=True): outline(cv); return with_shadow(cv) if shadow else cv
def grain(cv, x, y, w, h, c, seed=1, every=3):
    import random; r = random.Random(seed); d = shade(c, 0.9)
    for j in range(y+1, y+h, every):
        s = r.randint(0, max(0, w-6)); cv.hline(x+s, j, r.randint(3, max(3, min(9, w-s))), d)
