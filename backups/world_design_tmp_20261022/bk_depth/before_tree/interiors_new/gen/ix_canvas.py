# Drawing helpers for the interiors kit. Everything is drawn straight onto the 64 px grid in palette colours;
# shading is a true 4x4 ordered (Bayer) mix between two palette colours, keyed to absolute canvas position
# (every canvas origin sits on the 64 px tile grid, so neighbouring tiles dither in phase).
import os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OW = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.append(os.path.join(OW, 'tools'))
import pixel                                   # read-only: PAL, SHADOW, B4, pixelize
PAL = pixel.PAL.astype(int)
PALSET = {tuple(c) for c in PAL}
SHADOW = pixel.SHADOW
B4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0
T = 64

def H(h):
    c = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    assert c in PALSET, h
    return c

# named palette entries (all from palette.hex)
C = {k: H(v) for k, v in dict(
    black='000000', ink='191210', ink2='1a1226', char='29252b', char2='342842', slate='3e3a48', slate2='54444e', greyv='5e5866',
    grey='827a84', grey2='a8a0a4', grey3='ccc6c2', cream='ecdec4', paper='fcf6e8', pale='f8eabe',
    dbrown='2c1a12', dbrown2='2c2320', rust='561c0e', bark='462c22', rust2='6a3019', wine='6e222a', brown='6a442e', mbrown='92623e',
    mbrown2='87604d', tan='ba8856', ltan='deb478', sand='ccaa6e', sand2='e8ce92',
    burnt='9f4013', red='a23432', orange='d46616', orange2='c46e2e', redor='d05440', amber='e29d40', amber2='eea23c', salmon='f08868',
    yellow='fcd668', pink='d2608c', pink2='daa2ba', pink3='f6a0ba',
    dgreen='18382c', fgreen='24522e', fgreen2='244e34', green='38683e', green2='367634', mgreen='52983a', sage='54864e', lgreen='78ba48', lime='a6d460',
    dteal='246e6c', teal='3e9c92', lteal='70cab8',
    dviolet='3a1e60', violet='603096', mviolet='8a4ace', lviolet='b076ec', lav='d6acff', pviolet='f4e2ff',
    navy='1e4078', blue='30488c', blue2='2c64a8', blue3='4a70ba', sky='4692ce', lsky='7ac2e8', ice='c6ecfa').items()}

def bayer(h, w, ox=0, oy=0):
    ys = (np.arange(h) + oy) % 4; xs = (np.arange(w) + ox) % 4
    return B4[ys[:, None], xs[None, :]]

class Cv:
    def __init__(s, w, h):
        s.w, s.h = w, h; s.a = np.zeros((h, w, 4), float)
        s.Y, s.X = np.mgrid[0:h, 0:w]
        s.B = bayer(h, w)
    def _clip(s, x0, y0, x1, y1):
        return max(0, int(x0)), max(0, int(y0)), min(s.w, int(x1)), min(s.h, int(y1))
    def mask_rect(s, x0, y0, x1, y1):
        return (s.X >= x0) & (s.X < x1) & (s.Y >= y0) & (s.Y < y1)
    def fill(s, mask, col, alpha=255):
        s.a[mask, :3] = col; s.a[mask, 3] = alpha
    def rect(s, x0, y0, x1, y1, col):
        x0, y0, x1, y1 = s._clip(x0, y0, x1, y1)
        if x1 > x0 and y1 > y0: s.a[y0:y1, x0:x1, :3] = col; s.a[y0:y1, x0:x1, 3] = 255
    def px(s, x, y, col):
        if 0 <= x < s.w and 0 <= y < s.h: s.a[y, x, :3] = col; s.a[y, x, 3] = 255
    def mix(s, mask, c1, c2, t):
        """ordered-dither mix: c2 where t > bayer threshold (t may be scalar or full-size array)"""
        t = np.broadcast_to(np.asarray(t, float), (s.h, s.w)) if np.ndim(t) else np.full((s.h, s.w), float(t))
        m2 = mask & (t > s.B); m1 = mask & ~(t > s.B)
        s.fill(m1, c1); s.fill(m2, c2)
    def ramp(s, mask, cols, t):
        """map field t in [0,1] onto a list of palette colours with ordered dithering between neighbours"""
        t = np.clip(np.broadcast_to(np.asarray(t, float), (s.h, s.w)), 0, 0.9999) * (len(cols) - 1)
        i = np.floor(t).astype(int); f = t - i
        i = np.where(f > s.B, i + 1, i)
        for k, c in enumerate(cols): s.fill(mask & (i == k), c)
    def vgrad(s, x0, y0, x1, y1, c1, c2, mask=None):
        m = s.mask_rect(x0, y0, x1, y1) if mask is None else mask
        t = (s.Y - y0) / max(1, (y1 - y0 - 1)); s.mix(m, c1, c2, t)
    def hgrad(s, x0, y0, x1, y1, c1, c2, mask=None):
        m = s.mask_rect(x0, y0, x1, y1) if mask is None else mask
        t = (s.X - x0) / max(1, (x1 - x0 - 1)); s.mix(m, c1, c2, t)
    def mask_ell(s, cx, cy, rx, ry):
        return ((s.X + 0.5 - cx) / rx) ** 2 + ((s.Y + 0.5 - cy) / ry) ** 2 <= 1.0
    def ell(s, cx, cy, rx, ry, col):
        s.fill(s.mask_ell(cx, cy, rx, ry), col)
    def hline(s, x0, x1, y, col): s.rect(x0, y, x1, y + 1, col)
    def vline(s, x, y0, y1, col): s.rect(x, y0, x + 1, y1, col)
    def frame(s, x0, y0, x1, y1, col):
        s.hline(x0, x1, y0, col); s.hline(x0, x1, y1 - 1, col); s.vline(x0, y0, y1, col); s.vline(x1 - 1, y0, y1, col)
    def shadow(s, mask):
        m = mask & (s.a[..., 3] == 0); s.a[m, :3] = SHADOW[:3]; s.a[m, 3] = SHADOW[3]
    def shadow_ell(s, cx, cy, rx, ry): s.shadow(s.mask_ell(cx, cy, rx, ry))
    def shadow_rect(s, x0, y0, x1, y1): s.shadow(s.mask_rect(x0, y0, x1, y1))
    def line(s, x0, y0, x1, y1, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(1, n - 1); s.px(int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t)), col)
    def paste(s, other, ox, oy):
        """alpha-over another Cv (binary alpha)"""
        h, w = other.h, other.w
        sub = other.a; m = sub[..., 3] > 0
        tgt = s.a[oy:oy + h, ox:ox + w]; tgt[m] = sub[m]
    def image(s, outline=False):
        im = Image.fromarray(np.clip(s.a, 0, 255).astype('uint8'), 'RGBA')
        return pixel.pixelize(im, outline=outline, dither=0)

def pnoise(seed, cells=8, w=T, h=T, octaves=2):
    """periodic smooth noise in [0,1], period = canvas size (tiles seamlessly with itself)"""
    rng = np.random.default_rng(seed); out = np.zeros((h, w))
    amp = 1.0; tot = 0
    for o in range(octaves):
        n = cells * (2 ** o); g = rng.random((n, n))
        ys = np.arange(h) / h * n; xs = np.arange(w) / w * n
        y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int); fy = ys - y0; fx = xs - x0
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        a = g[y0 % n][:, x0 % n]; b = g[y0 % n][:, (x0 + 1) % n]; c = g[(y0 + 1) % n][:, x0 % n]; d = g[(y0 + 1) % n][:, (x0 + 1) % n]
        v = (a * (1 - fx) + b * fx) * (1 - fy[:, None]) + (c * (1 - fx) + d * fx) * fy[:, None]
        out += amp * v; tot += amp; amp *= 0.5
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-9)

def check_image(im, allow_shadow=True):
    a = np.asarray(im); al = a[..., 3]
    bad_alpha = ~np.isin(al, [0, 255, SHADOW[3]])
    op = a[al == 255][:, :3]
    pal_ok = all(tuple(c) in PALSET for c in {tuple(x) for x in op.reshape(-1, 3)})
    sh = a[al == SHADOW[3]][:, :3]
    sh_ok = all(tuple(c) == SHADOW[:3] for c in {tuple(x) for x in sh.reshape(-1, 3)})
    return (not bad_alpha.any()) and pal_ok and sh_ok
