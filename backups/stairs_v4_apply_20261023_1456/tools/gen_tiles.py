# Kilumen overworld tile generator: PIXEL ART, 64px native tiles (hard-edged raster + palette/dither pass in pixel.py).
# Geometry is authored in 128 'design units' per tile and rasterised directly at T px (vector draw + noise at full res; no upscaling).
import numpy as np, random, math, json, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter
T = 64           # native tile size in pixels (pixel art; exported 1x/2x/3x nearest-neighbour)
U = 128          # design units per tile
S = T / U
OUT = os.environ.get('KILUMEN_OW_OUT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))   # (2026-10-23) was hard-coded to live; now the tree this file lives in (override: KILUMEN_OW_OUT)
YY, XX = (np.mgrid[0:T, 0:T] + 0.5) / S   # coordinates in design units

def font(sz):
    sz = max(8, int(sz * S))
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', sz)
    except Exception: return ImageFont.load_default(size=sz)
import numbers
def _sc(v):
    if isinstance(v, numbers.Number): return float(v) * S
    return type(v)(_sc(x) for x in v) if isinstance(v, (list, tuple)) else v
class SD:
    """ImageDraw proxy: takes design-unit coordinates, rasterises at T px."""
    def __init__(s, im, mode=None):
        s.d = ImageDraw.Draw(im, mode) if mode else ImageDraw.Draw(im); s.d.fontmode = '1'   # no anti-aliased text
    def _kw(s, kw):
        if 'width' in kw: kw['width'] = max(1, round(kw['width'] * S))
        if 'radius' in kw: kw['radius'] = kw['radius'] * S
        return kw
    def __getattr__(s, n):
        f = getattr(s.d, n)
        def g(xy, *a, **kw):
            a = list(a)
            if n == 'rounded_rectangle' and a: a[0] = a[0] * S
            if n in ('rectangle', 'rounded_rectangle', 'ellipse', 'pieslice', 'arc', 'chord'):
                fl = list(xy) if len(xy) == 4 and isinstance(xy[0], numbers.Number) else [c for p in xy for c in p]
                xy = [min(fl[0], fl[2]), min(fl[1], fl[3]), max(fl[0], fl[2]), max(fl[1], fl[3])]
            return f(_sc(xy), *a, **s._kw(kw))
        return g
def GB(r): return ImageFilter.GaussianBlur(r * S)
def pblur(im, r):
    """premultiplied-alpha gaussian blur (no dark fringes on glows/shadows)"""
    a = np.asarray(im.convert('RGBA'), float); al = a[..., 3:] / 255.0; sg = max(0.01, r * S)
    pm = np.stack([gaussian_filter(a[..., i] * al[..., 0], sg) for i in range(3)], -1); ab = gaussian_filter(al[..., 0], sg)
    rgb = pm / np.maximum(ab[..., None], 1e-6)
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.clip(ab * 255, 0, 255)]).astype('uint8'), 'RGBA')


def pnoise(seed, sigma, size=T):
    r = np.random.default_rng(seed).random((size, size))
    n = gaussian_filter(r, sigma * S, mode='wrap'); return (n - n.min()) / (n.max() - n.min() + 1e-9)

def colorize(n, c1, c2):
    c1 = np.array(c1, float); c2 = np.array(c2, float); return c1 + (c2 - c1) * n[..., None]

def arr2img(a, alpha=None):
    a = np.clip(a, 0, 255).astype('uint8')
    im = Image.fromarray(a[..., :3], 'RGB').convert('RGBA')
    if alpha is not None: im.putalpha(Image.fromarray(np.clip(alpha * 255, 0, 255).astype('uint8')))
    return im

def wrapped(base, fn):
    """draw fn(d, ox, oy) on a 3x3 tiled canvas, crop center -> seamless strokes"""
    big = Image.new('RGBA', (3 * T, 3 * T))
    for i in range(3):
        for j in range(3): big.paste(base, (i * T, j * T))
    d = SD(big)
    for ox in (0, U, 2 * U):
        for oy in (0, U, 2 * U): fn(d, ox, oy)
    return big.crop((T, T, 2 * T, 2 * T))

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def jitter(c, r, k=12): return tuple(max(0, min(255, v + r.randint(-k, k))) for v in c[:3]) + ((c[3],) if len(c) > 3 else ())

# ---------------- base terrains ----------------
def grass(seed, tone=0):
    pal = [((66, 132, 50), (124, 190, 74)), ((40, 96, 52), (84, 148, 72))][tone]
    n = pnoise(seed, 12) * 0.65 + pnoise(seed + 1, 3) * 0.35
    im = arr2img(colorize(n, *pal)); r = random.Random(seed)
    lights = [(150, 206, 92), (138, 198, 84), (170, 214, 110)] if tone == 0 else [(96, 160, 80), (110, 170, 90)]
    darks = [(52, 112, 44), (60, 122, 48)] if tone == 0 else [(30, 74, 42), (36, 84, 46)]
    strokes = [(r.uniform(0, U), r.uniform(0, U), r.uniform(6, 13), r.uniform(-4, 4), r.choice(darks if i % 3 else lights)) for i in range(260)]
    def fn(d, ox, oy):
        for x, y, L, dx, c in strokes: d.line([(x + ox, y + oy), (x + ox + dx, y + oy - L)], fill=c, width=2)
    return wrapped(im, fn)

def path(seed):
    n = pnoise(seed, 8)
    im = arr2img(colorize(n, (178, 146, 102), (212, 182, 132))); r = random.Random(seed)
    stones = []
    for gy in range(4):
        for gx in range(4):
            cx = gx * 32 + 16 + (gy % 2) * 16 + r.uniform(-3, 3); cy = gy * 32 + 16 + r.uniform(-3, 3)
            w = r.uniform(12, 15); h = r.uniform(10, 13); c = jitter((206, 192, 166), r, 14)
            stones.append((cx, cy, w, h, c))
    def fn(d, ox, oy):
        for cx, cy, w, h, c in stones:
            d.rounded_rectangle([cx - w + ox + 2, cy - h + oy + 3, cx + w + ox + 2, cy + h + oy + 3], 7, fill=(120, 96, 70))
            d.rounded_rectangle([cx - w + ox, cy - h + oy, cx + w + ox, cy + h + oy], 7, fill=c)
            d.arc([cx - w + ox + 2, cy - h + oy + 1, cx + w + ox - 2, cy + h + oy - 2], 190, 280, fill=(236, 226, 204), width=2)
    return wrapped(im, fn)

def sand(seed):
    n = pnoise(seed, 6) * 0.5 + 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * (YY * 3 + XX * 1) / U + pnoise(seed + 3, 10) * 3))
    im = arr2img(colorize(n, (220, 194, 136), (242, 222, 168))); r = random.Random(seed)
    sp = [(r.uniform(0, U), r.uniform(0, U), r.choice([(190, 160, 110), (250, 240, 210)])) for _ in range(60)]
    return wrapped(im, lambda d, ox, oy: [d.ellipse([x + ox, y + oy, x + ox + 2, y + oy + 2], fill=c) for x, y, c in sp])

def snow(seed):
    n = pnoise(seed, 9)
    im = arr2img(colorize(n, (206, 220, 240), (248, 250, 255))); r = random.Random(seed)
    sp = [(r.uniform(0, U), r.uniform(0, U)) for _ in range(30)]
    return wrapped(im, lambda d, ox, oy: [d.ellipse([x + ox, y + oy, x + ox + 2, y + oy + 2], fill=(255, 255, 255)) for x, y in sp])

def mud(seed):
    n = pnoise(seed, 7); p = pnoise(seed + 5, 10)
    a = colorize(n, (78, 70, 48), (112, 98, 64))
    puddle = smooth(0.62, 0.7, p)[..., None]
    a = a * (1 - puddle) + puddle * colorize(pnoise(seed + 9, 4), (70, 92, 84), (120, 140, 120))
    im = arr2img(a); r = random.Random(seed)
    reeds = [(r.uniform(0, U), r.uniform(0, U), r.uniform(-3, 3)) for _ in range(18)]
    return wrapped(im, lambda d, ox, oy: [d.line([(x + ox, y + oy), (x + ox + dx, y + oy - 9)], fill=(92, 120, 60), width=2) for x, y, dx in reeds])

def cavefloor(seed):
    n = pnoise(seed, 7) * 0.7 + pnoise(seed + 2, 2) * 0.3
    im = arr2img(colorize(n, (96, 86, 100), (136, 124, 136))); r = random.Random(seed)
    peb = [(r.uniform(0, U), r.uniform(0, U), r.uniform(2, 5)) for _ in range(26)]
    cracks = [[(r.uniform(0, U), r.uniform(0, U))] for _ in range(3)]
    for c in cracks:
        for _ in range(4): c.append((c[-1][0] + r.uniform(-14, 14), c[-1][1] + r.uniform(-14, 14)))
    def fn(d, ox, oy):
        for x, y, s in peb:
            d.ellipse([x + ox, y + oy + 1, x + ox + s * 2, y + oy + s + 1], fill=(70, 62, 76))
            d.ellipse([x + ox, y + oy, x + ox + s * 2, y + oy + s], fill=(156, 146, 158))
        for c in cracks: d.line([(x + ox, y + oy) for x, y in c], fill=(74, 66, 80), width=2)
    return wrapped(im, fn)

def water_frame(f, cave=False):
    ph = f * 2 * np.pi / 4
    w = (np.sin(2 * np.pi * (XX * 2 + YY * 1) / U + ph) + np.sin(2 * np.pi * (XX * -1 + YY * 3) / U - ph)
         + 0.6 * np.sin(2 * np.pi * (XX * 3 - YY * 2) / U + 2 * ph))
    base = pnoise(77, 14)
    pal = ((40, 108, 156), (78, 170, 196)) if not cave else ((34, 60, 110), (70, 104, 160))
    a = colorize(base * 0.6 + 0.4 * (w / 5.2 + 0.5), *pal)
    hi = smooth(1.55, 1.95, w)[..., None]
    a = a * (1 - hi * 0.7) + hi * 0.7 * np.array((214, 240, 248))
    return arr2img(a)

def floor_wood(seed):
    a = colorize(pnoise(seed, 3) * 0.4 + 0.6 * (0.5 + 0.5 * np.sin(XX * 0.25 + pnoise(seed, 10) * 4)), (150, 100, 62), (190, 136, 86))
    im = arr2img(a); d = SD(im)
    for y in range(0, U, 32): d.line([(0, y), (U, y)], fill=(110, 72, 44), width=2)
    for i, y in enumerate(range(0, U, 32)): x = 40 if i % 2 else 96; d.line([(x, y), (x, y + 32)], fill=(118, 78, 48), width=2)
    return im

def floor_tile(seed, c1=(232, 228, 214), c2=(206, 220, 214)):
    im = Image.new('RGBA', (T, T)); d = SD(im)
    for gy in range(2):
        for gx in range(2):
            c = c1 if (gx + gy) % 2 == 0 else c2
            d.rectangle([gx * 64, gy * 64, gx * 64 + 63, gy * 64 + 63], fill=c)
            d.line([(gx * 64 + 4, gy * 64 + 4), (gx * 64 + 30, gy * 64 + 4)], fill=(255, 255, 255), width=2)
            d.rectangle([gx * 64, gy * 64, gx * 64 + 63, gy * 64 + 63], outline=(176, 172, 160), width=2)
    return im

def rug(seed):
    im = Image.new('RGBA', (T, T), (128, 72, 140)); d = SD(im)
    for y in range(8, U, 24): d.line([(0, y), (U, y)], fill=(160, 104, 168), width=4)
    for y in range(20, U, 24): d.line([(0, y), (U, y)], fill=(214, 176, 92), width=2)
    return im

# ---------------- transitions (autotile) ----------------
def wob(u): return 3 * np.sin(2 * np.pi * u * 2 / U) + 2 * np.sin(2 * np.pi * u * 3 / U)

def dist_field(sides, diags, wobf=None):
    wob_ = wobf or wob
    N, E, S, W = sides; NE, SE, SW, NW = diags
    d = np.full((T, T), 999.0)
    if N: d = np.minimum(d, YY + wob_(XX))
    if E: d = np.minimum(d, U - XX + wob_(YY))
    if S: d = np.minimum(d, U - YY + wob_(XX))
    if W: d = np.minimum(d, XX + wob_(YY))
    R = 34
    for on, cx, cy, a, b in ((N and W, 0, 0, N, W), (N and E, U, 0, N, E), (S and E, U, U, S, E), (S and W, 0, U, S, W)):
        if on:
            px = np.abs(XX - cx); py = np.abs(YY - cy); m = (px < R) & (py < R)
            d = np.where(m, np.minimum(d, R - np.hypot(R - px, R - py)), d)
    for on, blk, cx, cy in ((NE, N or E, U, 0), (SE, S or E, U, U), (SW, S or W, 0, U), (NW, N or W, 0, 0)):
        if on and not blk: d = np.minimum(d, np.hypot(XX - cx, YY - cy))
    return d

def transition(Bimg, Aimg, sides, diags, kind, bankimg=None, wobf=None, enoise=None):
    # wobf/enoise: per-variant organic edge (ground.wob_fn / ground.edge_noise); defaults = original w0 edge
    d = dist_field(sides, diags, wobf) + (enoise if enoise is not None else (pnoise(3, 3) - 0.5) * 6)
    A = np.array(Aimg, float); B = np.array(Bimg, float)
    if kind == 'water':
        bank = smooth(2, 9, d)[..., None]; wat = smooth(16, 22, d)[..., None]
        sandc = np.array(bankimg if bankimg is not None else sand(5), float)
        out = A * (1 - bank) + sandc * bank
        wet = smooth(8, 18, d)[..., None] * (1 - wat) * 0.35
        out = out * (1 - wet) + wet * np.array([150, 130, 90, 255])
        out = out * (1 - wat) + B * wat
        foam = np.exp(-((d - 21) / 2.2) ** 2)[..., None] * 0.75
        out = out * (1 - foam) + foam * np.array([235, 248, 250, 255])
        return arr2img(out[..., :3])
    a = smooth(6, 16, d)[..., None]
    out = A * (1 - a) + B * a
    rim = np.exp(-((d - 8) / 3.5) ** 2)[..., None] * 0.28
    out = out * (1 - rim)
    return arr2img(out[..., :3])

# ---------------- decoration objects (RGBA) ----------------
def blank(w=1, h=1): return Image.new('RGBA', (w * T, h * T), (0, 0, 0, 0))

def shadow(im, box, alpha=70, blur=6):
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(sh).ellipse(box, fill=(20, 30, 20, alpha))
    return Image.alpha_composite(pblur(sh, blur), im)

def tall_grass(frame):
    im = blank(); r = random.Random(11)
    base = blank(); bd = SD(base)
    for by in (40, 78, 116): bd.ellipse([-10, by - 26, U + 10, by + 10], fill=(30, 84, 36, 200))
    im = Image.alpha_composite(im, pblur(base, 3)); d = SD(im)
    sway = [0, 5, -4][frame]
    for by in (44, 82, 124):
        for i in range(34):
            x = 4 + i * 3.6 + r.uniform(-3, 3); L = r.uniform(30, 46); bend = r.uniform(-7, 7) + sway * (L / 46)
            col = r.choice([(46, 120, 50), (62, 142, 58), (36, 100, 44), (78, 156, 64)])
            pts = [(x, by), (x + bend * 0.4, by - L * 0.55), (x + bend, by - L)]
            d.line(pts, fill=col, width=6, joint='curve')
            d.line(pts[1:], fill=(150, 210, 96) if i % 3 == 0 else (118, 186, 80), width=2)
    return im

def flowers(seed, cols):
    im = blank(); d = SD(im); r = random.Random(seed)
    for _ in range(9):
        x = r.uniform(14, 114); y = r.uniform(20, 116); c = r.choice(cols)
        d.line([(x, y), (x, y + 10)], fill=(50, 110, 40), width=2)
        for a in range(5):
            ang = a * 2 * math.pi / 5; px = x + 5 * math.cos(ang); py = y + 5 * math.sin(ang)
            d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=c)
        d.ellipse([x - 2.5, y - 2.5, x + 2.5, y + 2.5], fill=(255, 226, 120))
    return im

def rock(big=False, cave=False):
    im = blank(); d = SD(im)
    c = (128, 122, 130) if not cave else (110, 96, 118)
    s = 1.0 if big else 0.62; cx, cy = 64, 80
    w, h = 54 * s, 44 * s
    im = shadow(im, [cx - w, cy + h * 0.4, cx + w + 6, cy + h + 10]); d = SD(im)
    d.polygon([(cx - w, cy + h * 0.6), (cx - w * 0.8, cy - h * 0.5), (cx - w * 0.2, cy - h), (cx + w * 0.6, cy - h * 0.8), (cx + w, cy), (cx + w * 0.7, cy + h * 0.8), (cx - w * 0.5, cy + h)], fill=c)
    d.polygon([(cx - w * 0.8, cy - h * 0.5), (cx - w * 0.2, cy - h), (cx + w * 0.6, cy - h * 0.8), (cx + w * 0.1, cy - h * 0.1), (cx - w * 0.6, cy)], fill=tuple(min(255, v + 40) for v in c))
    d.polygon([(cx + w, cy), (cx + w * 0.7, cy + h * 0.8), (cx - w * 0.5, cy + h), (cx + w * 0.1, cy + h * 0.3)], fill=tuple(v - 30 for v in c))
    d.line([(cx - w * 0.2, cy - h), (cx + w * 0.1, cy - h * 0.1), (cx + w, cy)], fill=tuple(v - 20 for v in c), width=2)
    return im

def crystal(glow=True):
    im = blank()
    if glow:
        g = blank(); SD(g).ellipse([20, 30, 108, 118], fill=(180, 90, 255, 110)); im = Image.alpha_composite(im, pblur(g, 14))
    d = SD(im)
    for (x, top, w) in ((64, 18, 18), (40, 50, 12), (88, 44, 13)):
        d.polygon([(x, top), (x + w, top + 30), (x + w * 0.6, 108), (x - w * 0.6, 108), (x - w, top + 30)], fill=(132, 64, 200))
        d.polygon([(x, top), (x + w, top + 30), (x + w * 0.6, 108), (x, 100)], fill=(96, 40, 160))
        d.polygon([(x, top), (x - w * 0.4, top + 34), (x - w * 0.2, 96)], fill=(214, 170, 255))
    return im

def mushroom():
    im = blank(); g = blank(); SD(g).ellipse([10, 40, 118, 120], fill=(150, 255, 210, 80)); im = Image.alpha_composite(im, pblur(g, 14))
    d = SD(im)
    for x, y, s in ((44, 92, 1.0), (82, 100, 0.75), (64, 72, 0.6)):
        d.rectangle([x - 5 * s, y - 4, x + 5 * s, y + 18 * s], fill=(236, 230, 210))
        d.pieslice([x - 22 * s, y - 20 * s, x + 22 * s, y + 10 * s], 180, 360, fill=(90, 210, 190))
        d.ellipse([x - 8 * s, y - 14 * s, x - 2 * s, y - 8 * s], fill=(210, 255, 240))
    return im

def bush():
    im = blank(); im = shadow(im, [14, 90, 120, 124]); d = SD(im); r = random.Random(4)
    for _ in range(30):
        x = r.uniform(30, 98); y = r.uniform(50, 100); s = r.uniform(14, 22)
        d.ellipse([x - s, y - s, x + s, y + s], fill=(48, 114, 46))
    for _ in range(26):
        x = r.uniform(30, 92); y = r.uniform(44, 86); s = r.uniform(6, 12)
        d.ellipse([x - s, y - s, x + s, y + s], fill=r.choice([(86, 160, 66), (110, 180, 80)]))
    return im

def tree(dark=False):
    im = blank(1, 2); im = shadow(im, [6, 214, 124, 252], 90, 8); d = SD(im); r = random.Random(21 + dark)
    d.polygon([(52, 250), (76, 250), (72, 176), (56, 176)], fill=(108, 74, 46)); d.line([(60, 248), (60, 182)], fill=(140, 100, 64), width=4)
    cols = [(34, 88, 46), (46, 112, 54), (72, 142, 66), (110, 176, 86)] if not dark else [(24, 62, 46), (34, 86, 58), (52, 112, 72), (90, 140, 120)]
    layers = [(cols[0], 40, 10), (cols[1], 34, -4), (cols[2], 24, -14), (cols[3], 12, -22)]
    for c, rad, off in layers:
        for _ in range(16):
            ang = r.uniform(0, 2 * math.pi); dist = r.uniform(0, 30)
            x = 64 + math.cos(ang) * dist * 1.1 + off * 0.6; y = 116 + math.sin(ang) * dist * 1.3 + off * 1.6
            rr = rad * r.uniform(0.7, 1.0); x = max(rr, min(U - rr, x)); y = max(rr + 2, y)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=c)
    if dark:
        for _ in range(4):
            x = r.uniform(30, 100); y = r.uniform(60, 160); d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(200, 150, 255))
    return im

def sign():
    im = blank(); im = shadow(im, [30, 104, 98, 124]); d = SD(im)
    d.rectangle([58, 70, 70, 118], fill=(110, 76, 46))
    d.rounded_rectangle([22, 30, 106, 80], 6, fill=(120, 82, 50)); d.rounded_rectangle([26, 32, 102, 74], 5, fill=(176, 128, 80))
    for y in (44, 54, 64): d.line([(36, y), (92, y)], fill=(110, 74, 44), width=3)
    return im

def fence(kind):
    im = blank(); d = SD(im); wood = (200, 158, 104); dk = (128, 92, 58)
    if kind == 'h':
        for y in (66, 92): d.rectangle([0, y, U, y + 10], fill=wood); d.line([(0, y + 10), (U, y + 10)], fill=dk, width=3)
        for x in (12, 76):
            d.rectangle([x, 50, x + 16, 118], fill=wood); d.rectangle([x + 11, 50, x + 16, 118], fill=dk); d.polygon([(x, 50), (x + 8, 42), (x + 16, 50)], fill=wood)
    else:
        d.rectangle([56, 0, 72, U], fill=wood); d.rectangle([67, 0, 72, U], fill=dk)
        for y in (6, 70):
            d.rectangle([52, y + 20, 76, y + 50], fill=wood); d.rectangle([70, y + 20, 76, y + 50], fill=dk)
    return im

def lamp():
    im = blank(); g = blank(); SD(g).ellipse([34, 4, 94, 64], fill=(255, 210, 140, 120)); im = Image.alpha_composite(im, pblur(g, 10))
    im = shadow(im, [44, 110, 84, 124]); d = SD(im)
    d.rectangle([60, 40, 68, 120], fill=(54, 52, 62)); d.rectangle([52, 114, 76, 122], fill=(54, 52, 62))
    d.polygon([(50, 22), (78, 22), (74, 46), (54, 46)], fill=(255, 228, 160)); d.rectangle([48, 16, 80, 22], fill=(54, 52, 62))
    return im

def ledge(part, cave=False):
    im = blank(); sh = blank(); SD(sh).rectangle([0, 104, U, 126], fill=(20, 30, 20, 110)); im = Image.alpha_composite(im, pblur(sh, 5))
    d = SD(im)
    x0 = 14 if part == 'l' else 0; x1 = U - 14 if part == 'r' else U
    soil, top, dk = ((150, 108, 66), (88, 156, 64), (104, 72, 44)) if not cave else ((112, 98, 124), (136, 124, 140), (76, 64, 88))
    d.rounded_rectangle([x0, 58, x1, 110], 14 if part != 'm' else 0, fill=soil)
    for x in range(x0 + 4, x1 - 4, 22): d.ellipse([x, 80, x + 18, 96], fill=dk); d.ellipse([x + 3, 81, x + 13, 89], fill=tuple(min(255, v + 30) for v in soil))
    d.rounded_rectangle([x0, 50, x1, 70], 10 if part != 'm' else 0, fill=top)
    for x in range(x0, x1 - 6, 8): d.polygon([(x, 68), (x + 8, 68), (x + 4, 78)], fill=top)
    d.line([(x0 + 6, 52), (x1 - 6, 52)], fill=tuple(min(255, v + 50) for v in top), width=3)
    return im

def cliff(part, row, cave=False, dark=False):
    """rock face; row 'u' upper (grass lip), 'l' lower (base). part l/m/r."""
    rng = np.random.default_rng(5 + (row == 'u'))
    n = pnoise(31 if row == 'u' else 32, 4)
    pal = ((112, 98, 82), (168, 148, 120)) if not cave else ((70, 60, 82), (118, 104, 132))
    strata = 0.5 + 0.5 * np.sin(YY * 0.32 + n * 3)
    a = colorize(n * 0.5 + strata * 0.5, *pal)
    al = np.ones((T, T))
    if part == 'l': al = smooth(10, 26, XX + (YY * 0.1))
    if part == 'r': al = smooth(10, 26, U - XX + YY * 0.1)
    im = arr2img(a, al); d = SD(im)
    r = random.Random(7 + (row == 'u') + 3 * cave)
    for x in range(0, U, 32): d.line([(x + 10, 0), (x + 4, U)], fill=tuple(v - 25 for v in pal[0]), width=3)
    for _ in range(10):
        x = r.uniform(8, 120); y = r.uniform(24, 116); w = r.uniform(10, 18)
        d.ellipse([x - w, y - w * 0.6, x + w, y + w * 0.6], fill=tuple(v - 10 for v in pal[1]))
        d.arc([x - w, y - w * 0.6, x + w, y + w * 0.6], 180, 300, fill=tuple(min(255, v + 30) for v in pal[1]), width=3)
        d.arc([x - w, y - w * 0.6, x + w, y + w * 0.6], 0, 120, fill=tuple(v - 40 for v in pal[0]), width=3)
    if row == 'u' and not cave:
        x0 = 14 if part == 'l' else 0; x1 = U - 14 if part == 'r' else U
        lip, teeth = ((58, 116, 62), (40, 92, 50)) if dark else ((84, 150, 62), (70, 134, 54))
        d.rectangle([x0, 0, x1, 18], fill=lip)
        for x in range(x0, x1, 9): d.polygon([(x, 18), (x + 9, 18), (x + 4, 28)], fill=teeth)
        d.line([(x0, 4), (x1, 4)], fill=tuple(min(255, v + 22) for v in lip), width=2)
    if row == 'l':
        sh = blank(); SD(sh).rectangle([0, 112, U, U], fill=(30, 24, 30, 90)); im = Image.alpha_composite(im, pblur(sh, 4))
    return im

def cavewall_top():
    n = pnoise(41, 5); a = colorize(n, (40, 32, 50), (70, 58, 82)); im = arr2img(a); r = random.Random(41)
    bl = [(r.uniform(0, U), r.uniform(0, U), r.uniform(10, 22)) for _ in range(14)]
    def fn(d, ox, oy):
        for x, y, w in bl:
            d.ellipse([x - w + ox, y - w * 0.7 + oy, x + w + ox, y + w * 0.7 + oy], fill=(76, 64, 90))
            d.arc([x - w + ox, y - w * 0.7 + oy, x + w + ox, y + w * 0.7 + oy], 190, 290, fill=(112, 98, 128), width=3)
            d.arc([x - w + ox, y - w * 0.7 + oy, x + w + ox, y + w * 0.7 + oy], 10, 120, fill=(34, 26, 42), width=3)
    return wrapped(im, fn)

def bridge(orient):
    im = blank(); d = SD(im)
    if orient == 'h':  # crossing east-west
        d.rectangle([0, 18, U, 118], fill=(96, 66, 42))
        for x in range(0, U, 16): d.rectangle([x + 1, 22, x + 14, 112], fill=(176, 128, 82)); d.line([(x + 3, 24), (x + 3, 110)], fill=(204, 160, 110), width=2)
        for y in (10, 108):
            d.rectangle([0, y, U, y + 10], fill=(140, 98, 60)); d.line([(0, y + 10), (U, y + 10)], fill=(80, 54, 34), width=3)
        for x in (4, 68): d.rectangle([x, 0, x + 14, 22], fill=(120, 84, 52)); d.rectangle([x, 100, x + 14, 126], fill=(120, 84, 52))
    else:
        d.rectangle([14, 0, 114, U], fill=(96, 66, 42))
        for y in range(0, U, 16): d.rectangle([18, y + 1, 110, y + 14], fill=(176, 128, 82)); d.line([(20, y + 3), (108, y + 3)], fill=(204, 160, 110), width=2)
        for x in (8, 108): d.rectangle([x, 0, x + 10, U], fill=(140, 98, 60))
    return im

def stairs(cave=False):
    im = blank(); d = SD(im); c = (176, 168, 156) if not cave else (130, 116, 140)
    for i, y in enumerate(range(0, U, 21)):
        d.rectangle([10, y, 118, y + 20], fill=tuple(v - i * 6 for v in c)); d.rectangle([10, y + 15, 118, y + 20], fill=tuple(v - 50 for v in c))
    d.rectangle([4, 0, 12, U], fill=(110, 100, 96)); d.rectangle([116, 0, 124, U], fill=(110, 100, 96))
    return im

def door_mat():
    im = blank(); d = SD(im)
    d.rounded_rectangle([22, 74, 106, 122], 6, fill=(150, 60, 70)); d.rounded_rectangle([30, 82, 98, 114], 4, outline=(230, 190, 110), width=3)
    return im

# ---------------- buildings ----------------
def crystal_emblem(im, cx, cy, s):
    g = blank(im.width // T, im.height // T); SD(g).ellipse([cx - 40 * s, cy - 44 * s, cx + 40 * s, cy + 44 * s], fill=(180, 100, 255, 150))
    im = Image.alpha_composite(im, pblur(g, 12 * s)); d = SD(im)
    d.polygon([(cx, cy - 34 * s), (cx + 18 * s, cy - 6 * s), (cx, cy + 34 * s), (cx - 18 * s, cy - 6 * s)], fill=(124, 58, 196))
    d.polygon([(cx, cy - 34 * s), (cx + 18 * s, cy - 6 * s), (cx, cy + 34 * s)], fill=(92, 36, 156))
    d.polygon([(cx, cy - 34 * s), (cx - 6 * s, cy - 4 * s), (cx, cy + 20 * s)], fill=(220, 180, 255))
    return im

def window(d, x, y, w=64, h=74, frame=(240, 232, 214), boxc=(200, 70, 120)):
    d.rectangle([x - 4, y - 4, x + w + 4, y + h + 4], fill=frame)
    d.rectangle([x, y, x + w, y + h], fill=(96, 150, 184))
    d.polygon([(x, y + h * 0.6), (x + w * 0.5, y), (x + w * 0.75, y), (x, y + h)], fill=(160, 206, 226))
    d.line([(x + w / 2, y), (x + w / 2, y + h)], fill=frame, width=4); d.line([(x, y + h / 2), (x + w, y + h / 2)], fill=frame, width=4)
    d.rectangle([x - 8, y + h + 4, x + w + 8, y + h + 18], fill=(126, 84, 50))
    r = random.Random(x * 7 + y)
    for i in range(9): fx = x - 4 + i * (w + 8) / 8; d.ellipse([fx - 6, y + h - 4, fx + 6, y + h + 8], fill=r.choice([boxc, (250, 220, 90), (70, 140, 60)]))

def door(d, x0, bottom, color=(122, 74, 44), w=92, h=210, arch=True, glass=False):
    x = x0 + (U - w) / 2; top = bottom - h
    d.rectangle([x - 8, top - 8, x + w + 8, bottom], fill=(150, 140, 126))
    if arch: d.pieslice([x, top, x + w, top + w], 180, 360, fill=color); d.rectangle([x, top + w / 2, x + w, bottom], fill=color)
    else: d.rectangle([x, top, x + w, bottom], fill=color)
    if glass:
        d.rectangle([x + 6, top + 10, x + w / 2 - 3, bottom - 4], fill=(150, 200, 220)); d.rectangle([x + w / 2 + 3, top + 10, x + w - 6, bottom - 4], fill=(150, 200, 220))
    else:
        for px in range(int(x) + 14, int(x + w), 20): d.line([(px, top + 30), (px, bottom - 4)], fill=tuple(v - 30 for v in color), width=2)
        d.ellipse([x + w - 22, bottom - h / 2, x + w - 12, bottom - h / 2 + 10], fill=(232, 200, 110))
    d.rectangle([x - 14, bottom - 6, x + w + 14, bottom], fill=(170, 160, 146))

def building(w, h, wall_rows, roof, wall, kind):
    W, H = w * U, h * U; im = blank(w, h)
    im = shadow(im, [10, H - 40, W - 4, H + 6], 90, 8); d = SD(im)
    wt = int(H - wall_rows * U) - 6  # wall top y
    stone = (150, 144, 136) if kind != 'hall' else (196, 184, 160)
    d.rectangle([16, wt, W - 16, H - 4], fill=wall)
    if kind in ('house', 'player'):
        beam = (110, 72, 44)
        for x in range(16, W - 10, U): d.rectangle([x, wt, x + 10, H - 30], fill=beam)
        d.rectangle([16, wt + 20, W - 16, wt + 30], fill=beam)
    if kind == 'hall':
        for x in range(26, W - 20, U): d.rectangle([x, wt, x + 26, H - 10], fill=(232, 222, 198)); d.rectangle([x + 18, wt, x + 26, H - 10], fill=(176, 164, 140))
    d.rectangle([16, H - 32, W - 16, H - 4], fill=stone)
    for x in range(16, W - 16, 30): d.line([(x, H - 32), (x, H - 4)], fill=tuple(v - 30 for v in stone), width=2)
    # roof
    ov = wt + 30; rp = [(36, 12), (W - 36, 12), (W - 2, ov), (2, ov)]
    d.polygon(rp, fill=roof)
    r = random.Random(w * 13 + h)
    for i, y in enumerate(range(26, ov, 20)):
        t = (y - 12) / (ov - 12); xl = 36 - 34 * t; xr = W - 36 + 34 * t
        dk = tuple(int(v * (0.72 + 0.2 * t)) for v in roof); d.line([(xl, y), (xr, y)], fill=dk, width=3)
        for x in np.arange(xl + (i % 2) * 14, xr, 28): d.line([(x, y - 18), (x, y)], fill=dk, width=2)
    sh = blank(w, h); sd = SD(sh)
    sd.polygon([(36, 12), (W - 36, 12), (W - 30, 40), (30, 40)], fill=(255, 255, 255, 70))
    sd.rectangle([2, ov - 14, W - 2, ov], fill=(0, 0, 0, 60))
    im = Image.alpha_composite(im, pblur(sh, 3)); d = SD(im)
    d.line([(36, 12), (W - 36, 12)], fill=tuple(min(255, v + 50) for v in roof), width=6)
    d.rectangle([16, ov, W - 16, ov + 8], fill=(0, 0, 0, 0)); d.rectangle([16, ov, W - 16, ov + 10], fill=tuple(int(v * 0.6) for v in wall))
    mid = w // 2; bottom = H - 4
    wy = ov + 30
    for c in range(w):
        if c == mid: continue
        if kind == 'shop' and c in (mid - 1, mid + 1):
            d.rectangle([c * U + 14, wy, c * U + 114, wy + 92], fill=(240, 232, 214)); d.rectangle([c * U + 20, wy + 6, c * U + 108, wy + 86], fill=(120, 170, 196))
            for k, x in enumerate(range(c * U + 6, c * U + 122, 16)):
                d.polygon([(x, wy - 26), (x + 16, wy - 26), (x + 16, wy - 2), (x, wy - 2)], fill=(64, 140, 196) if k % 2 else (246, 246, 236))
            continue
        window(d, c * U + 30, wy + 16, 68, 96, boxc=(190, 90, 220) if kind == 'heal' else (210, 70, 110))
    if kind == 'heal':
        door(d, mid * U, bottom, (90, 170, 160), arch=False, glass=True, w=96)
        im = crystal_emblem(im, W / 2, 120, 1.0); d = SD(im)
        d.rounded_rectangle([W / 2 - 110, ov - 70, W / 2 + 110, ov - 26], 10, fill=(250, 246, 236), outline=(90, 170, 160), width=4)
        d.text((W / 2, ov - 48), 'REST & HEAL', fill=(70, 130, 124), font=font(26), anchor='mm')
    elif kind == 'shop':
        door(d, mid * U, bottom, (64, 120, 170), arch=False, glass=True)
        d.rounded_rectangle([W / 2 - 100, ov - 64, W / 2 + 100, ov - 22], 10, fill=(250, 246, 236), outline=(64, 120, 170), width=4)
        d.text((W / 2, ov - 43), 'RT SUPPLY', fill=(50, 90, 140), font=font(26), anchor='mm')
    elif kind == 'office':
        door(d, mid * U, bottom, (70, 60, 90), arch=True, glass=False, w=100, h=220)
        im = crystal_emblem(im, W / 2, ov - 110, 1.5); d = SD(im)
        d.text((W / 2, ov + 14), 'REVIVAL TECH', fill=(250, 240, 255), font=font(22), anchor='mm')
    elif kind == 'hall':
        door(d, mid * U, bottom, (110, 50, 120), arch=True, w=104, h=228)
        for c in (mid - 2, mid + 2):
            d.rectangle([c * U + 40, ov + 14, c * U + 88, ov + 130], fill=(120, 50, 150)); d.polygon([(c * U + 40, ov + 130), (c * U + 88, ov + 130), (c * U + 64, ov + 150)], fill=(120, 50, 150))
            d.ellipse([c * U + 54, ov + 40, c * U + 74, ov + 60], fill=(240, 200, 90))
        im = crystal_emblem(im, W / 2, ov - 120, 1.6); d = SD(im)
    else:
        door(d, mid * U, bottom)
    if kind in ('house', 'player') and True:
        cx = W - U - 10 if kind == 'player' else 2 * U - 40
        d.rectangle([cx, 0, cx + 40, 70], fill=(140, 110, 96)); d.rectangle([cx - 6, 0, cx + 46, 12], fill=(110, 86, 74))
    return im

def cave_entrance(dark=True):
    W, H = 3 * U, 2 * U; im = blank(3, 2)
    for i in range(3):
        im.alpha_composite(cliff('m', 'u', dark=dark), (i * T, 0)); im.alpha_composite(cliff('m', 'l', dark=dark), (i * T, T))
    g = blank(3, 2); SD(g).ellipse([W / 2 - 110, 20, W / 2 + 110, H + 40], fill=(170, 90, 255, 120)); im = Image.alpha_composite(im, pblur(g, 18))
    d = SD(im); cx = W / 2
    d.pieslice([cx - 84, 26, cx + 84, 194], 180, 360, fill=(84, 72, 92)); d.rectangle([cx - 84, 110, cx + 84, H], fill=(84, 72, 92))
    for k in range(9):
        a0 = math.pi + k * math.pi / 8; x = cx + math.cos(a0) * 76; y = 110 + math.sin(a0) * 78
        d.rounded_rectangle([x - 14, y - 12, x + 14, y + 12], 5, fill=(150, 138, 150), outline=(70, 60, 76), width=2)
    d.pieslice([cx - 62, 50, cx + 62, 174], 180, 360, fill=(20, 12, 28)); d.rectangle([cx - 62, 112, cx + 62, H], fill=(20, 12, 28))
    for x, y, sz in ((cx - 112, 150, 70), (cx + 112, 160, 64), (cx - 92, 60, 48)):
        cr = crystal().resize((int(sz * S), int(sz * S)), Image.LANCZOS); im.alpha_composite(cr, (int((x - sz / 2) * S), int((y - sz / 2) * S)))
    return im

# ---------------- interior props ----------------
def iwall_face(kind):
    im = Image.new('RGBA', (T, T)); d = SD(im)
    top = {'house': (236, 214, 170), 'heal': (226, 240, 236), 'shop': (214, 230, 244)}[kind]
    d.rectangle([0, 0, U, U], fill=top)
    for x in range(8, U, 32): d.line([(x, 0), (x, 80)], fill=tuple(v - 18 for v in top), width=3)
    d.rectangle([0, 80, U, U], fill=(150, 104, 64)); d.line([(0, 82), (U, 82)], fill=(196, 150, 100), width=4)
    d.rectangle([0, 120, U, U], fill=(90, 60, 40))
    return im

def iwall_top():
    im = Image.new('RGBA', (T, T), (58, 44, 52)); d = SD(im); d.rectangle([0, 112, U, U], fill=(120, 92, 80)); return im

def void(): return Image.new('RGBA', (T, T), (16, 12, 20, 255))

def prop(name):
    if name == 'bed':
        im = blank(1, 2); d = SD(im)
        d.rectangle([10, 20, 118, 240], fill=(120, 80, 50)); d.rectangle([16, 26, 112, 232], fill=(244, 240, 232))
        d.rounded_rectangle([24, 34, 104, 80], 12, fill=(255, 255, 255)); d.rectangle([16, 100, 112, 232], fill=(110, 80, 170)); d.line([(16, 100), (112, 100)], fill=(230, 220, 250), width=6)
        d.rectangle([10, 226, 118, 250], fill=(96, 62, 38)); return im
    if name == 'table':
        im = blank(2, 1); im = shadow(im, [20, 96, 236, 126]); d = SD(im)
        d.rectangle([20, 34, 236, 84], fill=(176, 122, 74)); d.rectangle([20, 84, 236, 98], fill=(120, 80, 48))
        for x in (28, 218): d.rectangle([x, 98, x + 10, 122], fill=(100, 66, 40))
        d.ellipse([100, 42, 156, 70], fill=(240, 240, 236)); d.ellipse([112, 46, 144, 64], fill=(220, 120, 80)); return im
    if name == 'shelf':
        im = blank(1, 2); d = SD(im); d.rectangle([8, 40, 120, 250], fill=(120, 80, 50))
        r = random.Random(3)
        for y in (60, 120, 180):
            d.rectangle([14, y, 114, y + 52], fill=(80, 52, 34))
            x = 16
            while x < 108: bw = r.randint(8, 14); d.rectangle([x, y + 8, x + bw, y + 52], fill=r.choice([(180, 60, 60), (60, 120, 180), (200, 170, 80), (110, 70, 160)])); x += bw + 2
        return im
    if name == 'goods':
        im = blank(1, 2); d = SD(im); d.rectangle([8, 40, 120, 250], fill=(90, 120, 150)); r = random.Random(8)
        for y in (60, 120, 180):
            d.rectangle([14, y, 114, y + 52], fill=(220, 230, 240))
            for x in range(18, 110, 18): c = r.choice([(160, 90, 220), (90, 200, 140), (240, 120, 90), (240, 200, 90)]); d.rounded_rectangle([x, y + 18, x + 14, y + 50], 4, fill=c)
        return im
    if name == 'plant':
        im = blank(); im = shadow(im, [38, 108, 90, 126]); d = SD(im)
        d.polygon([(42, 86), (86, 86), (80, 122), (48, 122)], fill=(186, 104, 70))
        r = random.Random(2)
        for _ in range(14): a = r.uniform(-2.6, -0.5); L = r.uniform(30, 56); d.line([(64, 88), (64 + math.cos(a) * L, 88 + math.sin(a) * L)], fill=r.choice([(50, 130, 60), (80, 160, 70)]), width=8)
        return im
    if name == 'pc':
        im = blank(); d = SD(im); d.rectangle([14, 60, 114, 124], fill=(150, 104, 64)); d.rectangle([30, 10, 98, 64], fill=(50, 50, 60)); d.rectangle([36, 16, 92, 56], fill=(140, 90, 220)); d.rectangle([40, 66, 88, 80], fill=(210, 210, 216)); return im
    if name == 'tv':
        im = blank(); d = SD(im); d.rectangle([16, 70, 112, 124], fill=(120, 80, 50)); d.rectangle([22, 14, 106, 74], fill=(40, 40, 48)); d.rectangle([28, 20, 100, 66], fill=(90, 170, 200)); return im
    if name == 'sofa':
        im = blank(2, 1); d = SD(im); d.rounded_rectangle([12, 20, 244, 80], 18, fill=(70, 120, 110)); d.rounded_rectangle([12, 60, 244, 120], 14, fill=(90, 150, 136)); d.line([(128, 64), (128, 116)], fill=(60, 110, 100), width=3); return im
    if name.startswith('counter'):
        im = blank(); d = SD(im); col = (236, 230, 220) if 'heal' in name else (200, 160, 110)
        x0 = 10 if name.endswith('_l') else 0; x1 = U - 10 if name.endswith('_r') else U
        d.rectangle([x0, 30, x1, 70], fill=col); d.rectangle([x0, 70, x1, 124], fill=tuple(v - 50 for v in col)); d.line([(x0, 70), (x1, 70)], fill=(90, 170, 160) if 'heal' in name else (120, 80, 50), width=6)
        return im
    if name == 'heal_machine':
        im = blank(1, 2); d = SD(im); d.rounded_rectangle([10, 40, 118, 250], 14, fill=(214, 224, 230)); d.rounded_rectangle([22, 60, 106, 150], 10, fill=(50, 60, 80))
        for i in range(6): x = 30 + (i % 3) * 26; y = 166 + (i // 3) * 30; d.ellipse([x, y, x + 20, y + 20], fill=(160, 90, 230))
        im = crystal_emblem(im, 64, 104, 0.8); return im
    if name in ('stairs_up', 'stairs_up_wall'):
        # (2026-10-23 stairs_v1/v2) house-only palette that shares no colour with the house_1f/2f floors & walls. Read-only import.
        # (stairs_v3, Gary 2:32 PM CT "Move the stairs into the corner and add the wall piece") one 64x128 drawing via the kit's
        # draw_stairs_corner: top half = stairs_up_wall (the flight climbing the wall into a stairwell, house_1f (11,2)),
        # bottom half = stairs_up (floor flight; its top riser continues the wall flight, so the seam is continuous).
        import sys as _sys
        _g = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'interiors_new', 'gen')
        if _g not in _sys.path: _sys.path.append(_g)
        from ix_canvas import Cv, C
        from ix_furniture import draw_stairs_corner
        cv = Cv(T, 2 * T)
        draw_stairs_corner(cv, dict(deep=C['black'], abyss=C['black'], side=C['bark'], side2=C['rust'], riser=C['rust'],
                                    tread=[C['burnt'], C['orange']], hl=C['yellow'], rail=[C['black'], C['rust'], C['burnt']],
                                    cap=C['yellow'], joint=None))
        a = np.clip(cv.a, 0, 255).astype('uint8')
        return Image.fromarray(a[T:] if name == 'stairs_up' else a[:T], 'RGBA')
    if name == 'chair':
        im = blank(); d = SD(im); d.rectangle([36, 20, 92, 70], fill=(140, 96, 60)); d.rectangle([32, 66, 96, 90], fill=(176, 122, 74)); d.rectangle([36, 90, 44, 120], fill=(100, 66, 40)); d.rectangle([84, 90, 92, 120], fill=(100, 66, 40)); return im
    raise KeyError(name)

def cavewall_side(east, west):
    """cave wall top seen from above with a rock side-face strip on the edge(s) facing a corridor floor."""
    im = cavewall_top(); face = cliff('m', 'u', True)
    fa = np.array(face, float); a = np.array(im, float)
    xs = XX
    for on, dist in ((east, U - XX), (west, XX)):
        if not on: continue
        m = smooth(30, 22, dist + 3 * np.sin(YY * 0.15))[..., None]          # ~26 units of visible face
        shade = (0.75 + 0.25 * smooth(0, 26, dist))[..., None]
        a = a * (1 - m) + fa * m * shade
        rim = np.exp(-((dist - 27) / 2.0) ** 2)[..., None] * 0.6            # lit top edge of the face
        a = a * (1 - rim) + rim * np.array([126, 112, 140, 255])
        sh = np.exp(-(dist / 3.0) ** 2)[..., None] * 0.5                   # dark foot line
        a = a * (1 - sh)
    return arr2img(a[..., :3])
