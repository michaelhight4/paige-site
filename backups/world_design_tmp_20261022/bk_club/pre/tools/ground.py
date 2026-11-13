# Seamless ground for the Kilumen overworld ("no panel lines").
#  * Every ground generator is tile-periodic (wrap-mode noise + strokes drawn on a 3x3 wrapped canvas), so a tile wraps onto itself.
#  * Variants v1..v3 are built from v0 with a variance-preserving blend that is 0 inside an EDGE BAND (outer 3 px) and ramps to the
#    variant's own content by 10 px in.  All variants therefore share identical edge pixels, so ANY arrangement is seamless,
#    and the centres differ, so the 64 px repeat is broken.  v0 is unchanged, so every existing transition tile still meets it.
#  * The Bayer phase in pixel.pixelize is tiled from (0,0) and 64 % 4 == 0, so the dither is world-continuous.
#  * Variant pick per cell: vhash(x, y) % NV (documented in OVERWORLD_README §6).  Transition edges get 3 wobble variants (vhash>>8) % 3.
import numpy as np, random, math
from PIL import Image
from gen_tiles import T, U, S, XX, YY, pnoise, colorize, arr2img, wrapped, smooth, jitter, SD
NV = 4                        # ground variants per terrain (v0..v3)
NW = 3                        # transition edge-wobble variants (w0..w2)
_yy, _xx = np.mgrid[0:T, 0:T] + 0.5
EDGE_D = np.minimum(np.minimum(_xx, T - _xx), np.minimum(_yy, T - _yy))     # px distance to the tile border
WIN = smooth(3.0, 10.0, EDGE_D)                                             # 0 in the shared edge band, 1 in the centre

def vhash(x, y):
    h = ((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) & 0xffffffff
    h = ((h ^ (h >> 15)) * 0x2c1b3c6d) & 0xffffffff
    h = ((h ^ (h >> 12)) * 0x297a2d39) & 0xffffffff
    return h ^ (h >> 15)
def ground_variant(x, y): return vhash(x, y) % NV
def wobble_variant(x, y): return (vhash(x, y) >> 8) % NW

def vblend(im0, imv, win=WIN):
    """variance-preserving blend: identical to im0 in the edge band, im_v in the centre, no flat 'averaged' ring between."""
    a0 = np.asarray(im0.convert('RGB'), float); av = np.asarray(imv.convert('RGB'), float)
    mu = (a0.reshape(-1, 3).mean(0) + av.reshape(-1, 3).mean(0)) / 2
    th = win[..., None] * np.pi / 2
    out = mu + (a0 - mu) * np.cos(th) + (av - mu) * np.sin(th)
    out = out * (1 - win[..., None]) + win[..., None] * (out - out.mean((0, 1)) + av.mean((0, 1)))  # centre keeps v's mean tone
    return arr2img(out)

def match_tone(imv, im0):
    """shift a variant's mean colour onto v0 so no tile reads lighter/darker as a block."""
    a0 = np.asarray(im0.convert('RGB'), float); av = np.asarray(imv.convert('RGB'), float)
    return arr2img(av - av.reshape(-1, 3).mean(0) + a0.reshape(-1, 3).mean(0))

def variants(fn, seed0, n=NV, step=7):
    v0 = fn(seed0); out = [v0]
    for k in range(1, n): out.append(vblend(v0, match_tone(fn(seed0 + 1000 + k * step), v0)))
    return out

# ---- cobble path variants: same edge stones, re-laid interior stones (no ghosting from blending two layouts) ----
def path_variant(seed0, k):
    from gen_tiles import path as _path
    if k == 0: return _path(seed0)
    n = pnoise(seed0, 8)
    im = arr2img(colorize(n, (178, 146, 102), (212, 182, 132))); r = random.Random(seed0); rv = random.Random(seed0 * 31 + k)
    stones = []
    for gy in range(4):
        for gx in range(4):
            cx = gx * 32 + 16 + (gy % 2) * 16 + r.uniform(-3, 3); cy = gy * 32 + 16 + r.uniform(-3, 3)
            w = r.uniform(12, 15); h = r.uniform(10, 13); c = jitter((206, 192, 166), r, 14)
            if 30 < cx < 98 and 30 < cy < 98:          # interior stone: new size, nudge and colour per variant
                cx += rv.uniform(-4, 4); cy += rv.uniform(-3, 3); w = rv.uniform(10, 16); h = rv.uniform(9, 13); c = jitter((206, 192, 166), rv, 18)
            stones.append((cx, cy, w, h, c))
    def fn(d, ox, oy):
        for cx, cy, w, h, c in stones:
            d.rounded_rectangle([cx - w + ox + 2, cy - h + oy + 3, cx + w + ox + 2, cy + h + oy + 3], 7, fill=(120, 96, 70))
            d.rounded_rectangle([cx - w + ox, cy - h + oy, cx + w + ox, cy + h + oy], 7, fill=c)
            d.arc([cx - w + ox + 2, cy - h + oy + 1, cx + w + ox - 2, cy + h + oy - 2], 190, 280, fill=(236, 226, 204), width=2)
    v = wrapped(im, fn)
    a0 = np.asarray(_path(seed0).convert('RGB'), float); av = np.asarray(v.convert('RGB'), float)
    band = (EDGE_D < 3.0)[..., None]                 # guarantee bit-identical edge band
    return arr2img(np.where(band, a0, av))

# ---- plain dirt trail for routes (towns keep cobbles) ----
def trail(seed):
    n = pnoise(seed, 10) * 0.55 + pnoise(seed + 1, 3) * 0.45
    a = colorize(n, (150, 108, 70), (196, 152, 100))
    rut = 0.5 + 0.5 * np.sin(2 * np.pi * (XX * 0 + YY * 2) / U + pnoise(seed + 2, 12) * 4)   # faint wear streaks, periodic
    a = a * (1 - 0.06 * rut[..., None]) + 0.06 * rut[..., None] * np.array((214, 176, 120))
    im = arr2img(a); r = random.Random(seed)
    peb = [(r.uniform(0, U), r.uniform(0, U), r.uniform(2, 4), r.choice([(124, 96, 70), (206, 180, 138), (168, 138, 100)])) for _ in range(22)]
    tufts = [(r.uniform(0, U), r.uniform(0, U)) for _ in range(5)]
    def fn(d, ox, oy):
        for x, y, s, c in peb:
            d.ellipse([x + ox, y + oy + 1, x + ox + s * 2, y + oy + s + 1], fill=(110, 80, 56))
            d.ellipse([x + ox, y + oy, x + ox + s * 2, y + oy + s], fill=c)
        for x, y in tufts:
            for dx in (-3, 0, 3): d.line([(x + ox, y + oy), (x + ox + dx, y + oy - 7)], fill=(96, 150, 62), width=2)
    return wrapped(im, fn)

# ---- organic transition edges: per-variant sine series pinned to 0 at the tile corners (continuous with any neighbour) ----
def wob_fn(v):
    if v == 0: return lambda u: 3 * np.sin(2 * np.pi * u * 2 / U) + 2 * np.sin(2 * np.pi * u * 3 / U)
    r = random.Random(900 + v); co = [(k, r.uniform(-1, 1) * 9 / k ** 0.8) for k in range(1, 7)]
    return lambda u: sum(a * np.sin(np.pi * k * u / U) for k, a in co)
def edge_noise(v):
    n0 = (pnoise(3, 3) - 0.5) * 6
    if v == 0: return n0
    nv = (pnoise(30 + v, 3) - 0.5) * 6
    return n0 * (1 - WIN) + nv * WIN

# ---- deco alpha cleanup: object (opaque) + one shadow colour, nothing else ----
def clean_deco(im):
    """drop glow halos / soft light pools before pixelize: non-dark semi-alpha -> transparent; dark semi-alpha stays shadow."""
    a = np.asarray(im.convert('RGBA'), float).copy(); al = a[..., 3] / 255.0
    lum = a[..., :3] @ np.array([0.3, 0.59, 0.11])
    a[(al < 0.75) & (lum >= 70), 3] = 0
    return Image.fromarray(a.astype('uint8'), 'RGBA')

def seam_ratio(tiles):
    """max over ordered pairs (both axes) of |edge step| / |interior step|; 1.0 = invisible."""
    import itertools
    A = [np.asarray(t.convert('RGB'), float) for t in tiles]; worst = 0
    for a, b in itertools.product(A, A):
        for p, q in ((a, b), (a.transpose(1, 0, 2), b.transpose(1, 0, 2))):
            e = np.abs(p[:, -1] - q[:, 0]).mean(); i = (np.abs(np.diff(p, axis=1)).mean() + np.abs(np.diff(q, axis=1)).mean()) / 2
            worst = max(worst, e / max(i, 1e-6))
    return worst

# ---- water: 3 variants, same wave field (animation stays in phase), noise layer blended inside the window ----
def water_frame_v(f, v, cave=False):
    from gen_tiles import water_frame
    if v == 0: return water_frame(f, cave)
    ph = f * 2 * np.pi / 4
    w = (np.sin(2 * np.pi * (XX * 2 + YY * 1) / U + ph) + np.sin(2 * np.pi * (XX * -1 + YY * 3) / U - ph)
         + 0.6 * np.sin(2 * np.pi * (XX * 3 - YY * 2) / U + 2 * ph))
    b0 = pnoise(77, 14); bv = pnoise(77 + 50 * v, 14); th = WIN * np.pi / 2
    base = 0.5 + (b0 - 0.5) * np.cos(th) + (bv - 0.5) * np.sin(th)
    pal = ((40, 108, 156), (78, 170, 196)) if not cave else ((34, 60, 110), (70, 104, 160))
    a = colorize(base * 0.6 + 0.4 * (w / 5.2 + 0.5), *pal)
    hi = smooth(1.55, 1.95, w)[..., None]
    a = a * (1 - hi * 0.7) + hi * 0.7 * np.array((214, 240, 248))
    return arr2img(a)
