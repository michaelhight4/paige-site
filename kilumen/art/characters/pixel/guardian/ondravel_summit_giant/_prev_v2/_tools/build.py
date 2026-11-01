"""Ondravel summit giant v2 (DRAFT, art only, not wired). python3 _tools/build.py
Frames 448x704, redrawn at true size (masks + shading + Bayer dither + 1px outline/rim at full res; no resampling of any art).
Sunset-only (summit is locked to sunset). Palette: art/palette/kilumen.hex + ondravel_anim_v1 RAMP_SPREAD outputs.
Deps: numpy (BSD), scipy (BSD), Pillow (HPND). v1 is in ../_prev/."""
import os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
PAL = [l.strip().lower() for l in open('/workspace/kilumen/art/palette/kilumen.hex') if l.strip()]; PALS = set(PAL)
W, H = 448, 704; S = 2; cx = W // 2
N, MS = 4, 450
BREATH = [0, 2, 4, 2]; CHEST = [0, 1, 2, 1]; PART = [0, 3, 6, 3]; BOB = [0, 1, 2, 1]
def C(h): return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)] + [255], 'uint8')
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16
Yg, Xg = np.mgrid[0:H, 0:W]; BY = BAYER[Yg % 4, Xg % 4]
ICE = ['342842', '1e4078', '7ac2e8', 'c6ecfa', 'fcf6e8']
MANE = ['3e3a48', '1e4078', '7ac2e8', 'c6ecfa', 'fcf6e8']
MUZ = ['5e5866', 'a8a0a4', 'ccc6c2', 'c6ecfa', 'fcf6e8']
ANT = ['2c2320', '462c22', '6a442e', '92623e', 'ccaa6e', 'deb478']
CLD = ['5e5866', '827a84', 'daa2ba', 'f08868', 'eea23c', 'e8ce92', 'f8eabe']   # sunset cumulus: lilac shadow -> salmon -> gold -> cream
RIM1, RIM2, RIM3, OUTL = 'fcd668', 'eea23c', 'e29d40', '1a1226'
for c in ICE + MANE + MUZ + ANT + CLD + [RIM1, RIM2, RIM3, OUTL]: assert c in PALS, c

class SD:   # draws v1-unit geometry at S x (re-rasterised at full res, not resampled)
    def __init__(s, d): s.d = d
    def _p(s, pts): return [(x * S, y * S) for x, y in pts]
    def polygon(s, pts, **k): s.d.polygon(s._p(pts), **k)
    def ellipse(s, b, **k): s.d.ellipse([v * S for v in b], **k)
    def line(s, pts, **k): s.d.line(s._p(pts), **k)
    def rounded_rectangle(s, b, r, **k): s.d.rounded_rectangle([v * S for v in b], r * S, **k)
def mask(fn, scaled=True):
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im); fn(SD(d) if scaled else d); return np.array(im) > 0
def shade(img, m, ramp, x0, y0, rx, ry, bias=0.0, edge=1.0, k=0.5, u=S):
    if not m.any(): return
    d = ndi.distance_transform_edt(m)
    v = 0.55 + bias - 0.35 * ((Xg - x0 * u) / (rx * u)) - 0.45 * ((Yg - y0 * u) / (ry * u))
    v -= edge * 0.25 * (d < 3.5); v += 0.08 * np.clip((d - 5) / 20, 0, 1)
    q = np.clip(v * (len(ramp) - 1) + (BY - 0.5) * k, 0, len(ramp) - 1).round().astype(int)
    for i, c in enumerate(ramp): img[m & (q == i)] = C(c)
def thick(dr, pts, w0, w1):
    n = len(pts) - 1
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]; L = max(1, int(2 * math.hypot(x1 - x0, y1 - y0)))
        for s_ in range(L + 1):
            t = (i + s_ / L) / n; w = w0 + (w1 - w0) * t; x = x0 + (x1 - x0) * s_ / L; y = y0 + (y1 - y0) * s_ / L
            dr.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
def spiky(x0, y0, rx, ry, n, amp, seed, a0=0, a1=2 * math.pi):
    r = np.random.RandomState(seed); pts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n; f = 1 + (amp if i % 2 else -amp * 0.3) * (0.6 + 0.4 * r.rand())
        pts.append((x0 + rx * f * math.cos(a), y0 + ry * f * math.sin(a)))
    return pts

# ---------------- cumulus ----------------
def cumulus(seed, x0, y0, w, h, n, rmin, rmax, flat=0.35):
    """irregular cluster: puffs of varied radius, biggest near the crown, noisy-edged (no two arcs alike)."""
    r = np.random.RandomState(seed); P = []
    for i in range(n):
        u = r.rand(); x = x0 + (u - 0.5) * w; top = 1 - abs(u - 0.5) * 2
        rad = rmin + (rmax - rmin) * (0.35 + 0.65 * top) * r.uniform(0.6, 1.1)
        y = y0 + h * 0.5 - rad * (0.4 + 0.9 * top) * r.uniform(0.7, 1.1) + r.uniform(-h, h) * 0.15
        P.append((x, y, rad, r.uniform(0, 6.28), r.randint(3, 7)))
    for i in range(max(3, n // 2)):   # under-belly lobes so the base billows instead of a straight cut
        u = r.rand(); P.append((x0 + (u - 0.5) * w * 0.85, y0 + h * 0.5 + r.uniform(-4, 8), rmin * r.uniform(0.8, 1.6), r.uniform(0, 6.28), r.randint(3, 7)))
    return P
def cmask(P, dx=0, dy=0, shape=(H, W)):
    h, w = shape; Yy, Xx = np.mgrid[0:h, 0:w]; m = np.zeros((h, w), bool)
    for x, y, rad, ph, k in P:
        x += dx; y += dy
        x0_, x1_ = int(max(0, x - rad * 1.3)), int(min(w, x + rad * 1.3 + 1)); y0_, y1_ = int(max(0, y - rad * 1.3)), int(min(h, y + rad * 1.3 + 1))
        if x0_ >= x1_ or y0_ >= y1_: continue
        X, Y = Xx[y0_:y1_, x0_:x1_] - x, Yy[y0_:y1_, x0_:x1_] - y
        a = np.arctan2(Y, X); rr = rad * (1 + 0.10 * np.sin(k * a + ph) + 0.05 * np.sin((k + 3) * a - ph))
        m[y0_:y1_, x0_:x1_] |= X * X + (Y * 1.12) ** 2 < rr * rr
    return m
def paint_cumulus(img, m, sun=(0.45, -0.89), warm=0.0):
    """volume from a blurred height field: faces toward the sun (behind him, upper right) glow gold, bellies fall to lilac.
    Rim = 1-2 solid px of fcd668/eea23c on sun-facing edges; underside edge 5e5866 (no black outline, no blending)."""
    if not m.any(): return
    h, w = m.shape; Yy, Xx = np.mgrid[0:h, 0:w]; by = BAYER[Yy % 4, Xx % 4]
    hf = ndi.gaussian_filter(m.astype(float), 6); gy, gx = np.gradient(hf); nx, ny = -gx, -gy
    nn = np.hypot(nx, ny) + 1e-6; lit = (nx * sun[0] + ny * sun[1]) / nn * np.clip(nn * 25, 0, 1)
    ys = np.where(m.any(1))[0]; yrel = (Yy - ys.min()) / max(1, np.ptp(ys))
    core = np.clip(ndi.distance_transform_edt(m) / 14, 0, 1)
    v = 0.52 + warm + 0.38 * lit - 0.32 * yrel + 0.10 * (1 - core) * (lit > 0)
    q = np.clip(v * (len(CLD) - 1) + (by - 0.5) * 1.1, 0, len(CLD) - 1).round().astype(int)
    for i, c in enumerate(CLD): img[m & (q == i)] = C(c)
    e1 = m & ~ndi.binary_erosion(m); e2 = m & ~ndi.binary_erosion(m, iterations=2) & ~e1
    img[e1 & (lit > 0.15)] = C(RIM1); img[e2 & (lit > 0.35) & ((Xx + Yy) % 2 == 0)] = C(RIM2)
    img[e1 & (lit < -0.35)] = C(CLD[0])
def layered(img, clusters, dx=0, dy=0):
    tot = np.zeros((H, W), bool)
    for P, warm, sdx in clusters:          # back -> front; each cluster shaded alone so layers separate by their glowing rims
        m = cmask(P, dx * sdx, dy); tmp = img.copy(); paint_cumulus(tmp, m, warm=warm); img[m] = tmp[m]; tot |= m
    return tot

# rear (in the giant sheet, behind him) and front (overlay) cloud sets; sdx = parting direction
REAR = [(cumulus(11, 104, 440, 110, 56, 9, 14, 34), 0.06, -1), (cumulus(12, 338, 432, 104, 56, 9, 14, 34), 0.06, 1),
        (cumulus(13, 66, 236, 44, 22, 5, 7, 15), 0.1, -1), (cumulus(14, 376, 256, 36, 20, 5, 7, 13), 0.1, 1),
        (cumulus(15, 124, 536, 130, 64, 10, 16, 38), 0.0, -1), (cumulus(16, 324, 544, 130, 64, 10, 16, 40), 0.0, 1)]
FRONT = [(cumulus(21, 136, 580, 150, 70, 12, 16, 44), 0.0, -1), (cumulus(22, 312, 590, 150, 70, 12, 16, 46), 0.0, 1),
         (cumulus(23, 224, 610, 220, 60, 14, 14, 42), -0.04, 0), (cumulus(24, 86, 380, 60, 30, 6, 9, 20), 0.05, -1),
         (cumulus(25, 362, 360, 60, 30, 6, 9, 20), 0.05, 1), (cumulus(26, 224, 636, 170, 34, 10, 10, 26), -0.08, 0)]

def px(img, x, y, c):
    if 0 <= x < W and 0 <= y < H: img[y, x] = C(c)
def giant(i):
    b, ch = BREATH[i], CHEST[i]; img = np.zeros((H, W, 4), 'uint8'); B = b / S   # v1 units for scaled shapes
    layered(img, REAR, dx=PART[i], dy=0)
    # body: shoulders + chest, ending in a rounded base inside the cloud sea
    body = mask(lambda d: (d.polygon([(112 - 106 - ch / S, 290), (112 - 100 - ch / S, 244 - B / 2), (112 - 60, 200 - B), (112 + 60, 200 - B),
                                      (112 + 100 + ch / S, 244 - B / 2), (112 + 106 + ch / S, 290), (112 + 80, 316), (112 - 80, 316)], fill=255),
                            d.ellipse([16, 260, 208, 336], fill=255)))
    shade(img, body, ICE, 52, 210, 160, 160, bias=0.16)
    fi = Image.new('L', (W, H), 0); fd = SD(ImageDraw.Draw(fi))
    for s in (-1, 1):
        for k, (dx, dy) in enumerate([(56, 246), (74, 276), (40, 296)]):
            x0, y0 = 112 + s * dx, dy - B / 2
            fd.polygon([(x0, y0 - 9), (x0 + 6, y0), (x0, y0 + 9), (x0 - 6, y0)], fill=1 + (k % 2))
    fi = np.array(fi); img[(fi == 1) & body & (Xg < cx)] = C('c6ecfa'); img[(fi == 1) & body & (Xg >= cx)] = C('1e4078'); img[(fi == 2) & body] = C('7ac2e8')
    # mane: base mass + 4 rings of clumped locks, each with fur strands drawn at full res
    r = np.random.RandomState(9); mane = mask(lambda d: d.ellipse([112 - 78, 92 - B, 112 + 78, 262 - B], fill=255))
    shade(img, mane, MANE, 62, 110 - B, 120, 140, bias=0.08)
    for ring, (rad, n, L, wd) in enumerate([(96, 26, 34, 20), (78, 22, 32, 18), (58, 19, 30, 16), (38, 15, 26, 14)]):
        for k in range(n):
            a = math.radians(-60 + 300 * (k + 0.5 * (ring % 2)) / n) + r.uniform(-0.06, 0.06)
            bx, by = 112 + rad * 0.55 * math.cos(a), 150 - B + rad * 0.75 * math.sin(a)
            ll = L * r.uniform(0.85, 1.15); tx, ty = bx + ll * math.cos(a) * 1.05, by + ll * math.sin(a) * 1.15 + 6
            nx, ny = -math.sin(a), math.cos(a); hw = wd / 2 * r.uniform(0.85, 1.1); bend = r.uniform(-3, 3)
            poly = [(bx + nx * hw * 0.7, by + ny * hw * 0.7), ((bx + tx) / 2 + nx * (hw + bend), (by + ty) / 2 + ny * hw), (tx + bend, ty),
                    ((bx + tx) / 2 - nx * (hw - bend), (by + ty) / 2 - ny * hw), (bx - nx * hw * 0.7, by - ny * hw * 0.7)]
            lm = mask(lambda d: d.polygon(poly, fill=255)) & (Yg < (300 - B) * S)
            if not lm.any(): continue
            lx, ly = Xg[lm].mean() / S, Yg[lm].mean() / S
            shade(img, lm, MANE, lx - 4, ly - 4, 14, 22, bias=-0.18 * (lx - 112) / 90 - 0.1 * (ly - 150) / 120 + 0.1, edge=0.6)
            img[lm & ~ndi.binary_erosion(lm) & (Xg > lx * S)] = C('1e4078')
            for j in range(3):   # strands along the lock
                t0 = r.uniform(0.2, 0.6); sx, sy = (bx + (tx - bx) * t0) * S + r.uniform(-hw, hw), (by + (ty - by) * t0) * S + r.uniform(-hw, hw)
                for q in range(r.randint(4, 9)):
                    X, Y = int(sx + math.cos(a) * q * 1.1), int(sy + math.sin(a) * q * 1.2)
                    if 0 <= Y < H and 0 <= X < W and lm[Y, X]: img[Y, X] = C('c6ecfa' if lx < 118 else '7ac2e8') if j < 2 else C('1e4078')
            mane |= lm
    # antlers
    am = Image.new('L', (W, H), 0); ad = SD(ImageDraw.Draw(am))
    for s in (-1, 1):
        X = lambda x: 112 + s * x
        thick(ad, [(X(16), 94 - B), (X(34), 76 - B), (X(58), 62 - B), (X(80), 42 - B), (X(92), 20 - B), (X(96), 6 - B)], 12, 5)
        for (bx, by, tx, ty, w) in [(40, 72, 34, 40, 7), (60, 60, 64, 24, 6), (80, 44, 100, 30, 5), (72, 50, 70, 14, 4), (86, 32, 104, 14, 3.5), (30, 80, 52, 92, 4.5)]:
            thick(ad, [(X(bx), by - B), (X((bx + tx) / 2), (by + ty) / 2 - 4 - B), (X(tx), ty - B)], w, 2)
    am = np.array(am) > 0
    shade(img, am, ANT, 32, 20 - B, 160, 90, bias=0.05, k=0.8)
    ag = am & (((Xg * 3 + Yg * 2) % 11) == 0) & ~ndi.binary_erosion(am, iterations=2) == False
    img[am & ((Xg + 2 * Yg) % 13 == 0)] = C('462c22')            # bark grooves
    # ears
    ears = mask(lambda d: [d.polygon([(112 + s * 30, 96 - B), (112 + s * 60, 84 - B), (112 + s * 40, 112 - B)], fill=255) for s in (-1, 1)])
    shade(img, ears, ICE, 82, 90 - B, 50, 30)
    img[ears & ndi.binary_erosion(ears, iterations=3)] = C('342842')
    # ---- face (native px, after battle art: broad lion skull, heavy dark brow, deep-set pale eyes, pale grey-white muzzle, dark wide nose) ----
    o = -b
    head = mask(lambda d: (d.ellipse([cx - 78, 156 + o, cx + 78, 296 + o], fill=255),
                           d.polygon(spiky(cx, 268 + o, 92, 46, 22, 0.18, 7, 0.1, math.pi - 0.1), fill=255),
                           d.polygon([(cx - 56, 250 + o), (cx + 56, 250 + o), (cx + 44, 340 + o), (cx + 26, 370 + o), (cx - 26, 370 + o), (cx - 44, 340 + o)], fill=255)), scaled=False)
    shade(img, head, ICE, cx - 40, 190 + o, 110, 150, bias=0.12, u=1)
    muz = mask(lambda d: d.polygon([(cx - 30, 258 + o), (cx + 26, 258 + o), (cx + 40, 330 + o), (cx + 24, 362 + o), (cx - 24, 362 + o), (cx - 40, 330 + o)], fill=255), scaled=False)
    shade(img, muz, MUZ, cx - 30, 270 + o, 70, 110, bias=0.12, edge=0.5, u=1)
    rr = np.random.RandomState(4)
    for k in range(150):   # short fur strokes over skull + cheeks, lit side pale, shade side dark
        x, y = rr.randint(cx - 90, cx + 90), rr.randint(160 + o, 330 + o)
        if not head[y, x] or muz[y, x]: continue
        c = ('c6ecfa' if x < cx - 10 else '7ac2e8') if rr.rand() < 0.6 else '1e4078'
        dxs = -1 if x < cx else 1
        for q in range(rr.randint(2, 5)): px(img, x + dxs * (q // 2), y + q, c)
    # brow: heavy V ridge + centre furrow
    for s in (-1, 1):
        for t in range(56):
            x = cx + s * (8 + t); y = int(232 + o - t * 0.22 + (t / 56) ** 2 * 6)
            for q in range(3): px(img, x, y + q, '342842' if q == 1 else '1e4078')
            px(img, x, y - 1, 'c6ecfa' if s < 0 else '7ac2e8')     # lit top of the ridge
    for y in range(200 + o, 236 + o): px(img, cx, y, '1e4078'); px(img, cx - 1, y, 'c6ecfa' if y % 4 else '7ac2e8')
    # eyes: deep socket, almond, pale iris + glint (readable at 1x)
    for s in (-1, 1):
        eye = mask(lambda d: d.polygon([(cx + s * 16, 246 + o), (cx + s * 28, 238 + o), (cx + s * 46, 240 + o), (cx + s * 52, 247 + o), (cx + s * 34, 252 + o)], fill=255), scaled=False)
        sock = ndi.binary_dilation(eye, iterations=3) & ~eye & (Yg < 248 + o); img[sock & head] = C('342842')
        img[eye] = C(OUTL)
        for (dx, dy, c) in [(0, 0, 'c6ecfa'), (1, 0, 'c6ecfa'), (2, 0, 'c6ecfa'), (0, 1, '7ac2e8'), (1, 1, 'c6ecfa'), (2, 1, '7ac2e8'), (3, 0, '7ac2e8'), (1, -1, 'fcf6e8'), (0, -1, 'fcf6e8')]:
            px(img, cx + s * (32 + dx * s * s) + (0 if s > 0 else -3), 244 + o + dy, c)
        for t in range(14): px(img, cx + s * (24 + t), 255 + o + (t // 7), '7ac2e8' if s < 0 else '1e4078')   # lower lid
    # bridge highlight (upper-left light)
    for y in range(240 + o, 334 + o):
        if y % 5: px(img, cx - 6, y, 'fcf6e8')
        px(img, cx - 5, y, 'ccc6c2'); px(img, cx + 8, y, 'a8a0a4')
    # nose pad + nostrils, mouth, chin
    nose = mask(lambda d: d.polygon([(cx - 22, 336 + o), (cx + 22, 336 + o), (cx + 16, 352 + o), (cx, 360 + o), (cx - 16, 352 + o)], fill=255), scaled=False)
    img[nose] = C('2c2320'); img[nose & ~np.roll(nose, 1, 0) & (Xg < cx + 6)] = C('5e5866'); img[nose & ~np.roll(nose, 2, 0) & np.roll(nose, 1, 0) & (Xg < cx - 6)] = C('827a84')
    for s in (-1, 1):
        for (dx, dy) in [(10, 346), (11, 346), (12, 347), (11, 347), (13, 348)]: px(img, cx + s * dx, dy + o, OUTL)
    for y in range(360 + o, 366 + o): px(img, cx, y, OUTL)
    for t in range(22):
        for s in (-1, 1): px(img, cx + s * t, 366 + o + int((t / 22) ** 2 * 5), OUTL); px(img, cx + s * t, 367 + o + int((t / 22) ** 2 * 5), '342842')
    # forehead crystal
    for dy in range(-8, 9):
        w_ = 5 - abs(dy) * 5 // 8
        for dx in range(-w_, w_ + 1): px(img, cx + dx, 196 + o + dy, 'fcf6e8' if dx < 0 or dy < -3 else ('c6ecfa' if dx < 3 else '7ac2e8'))
    # chin beard
    beard = mask(lambda d: d.polygon(spiky(cx, 380 + o, 46, 30, 18, 0.45, 5, 0, math.pi), fill=255), scaled=False) & (Yg > 360 + o)
    shade(img, beard, MANE, cx - 30, 360 + o, 70, 50, bias=0.1, u=1)
    fig = body | mane | ears | am | head | beard
    ring = ndi.binary_dilation(fig) & ~fig
    img[ring] = C(OUTL)
    # sunset back-light: solid rim px inside the outline on every edge that faces up/out (sun behind him)
    e1 = fig & ~ndi.binary_erosion(fig); up_ = fig & ~np.roll(fig, 3, 0); side = fig & (~np.roll(fig, 3, 1) | ~np.roll(fig, -3, 1))
    e2 = fig & ~ndi.binary_erosion(fig, iterations=2) & ~e1
    img[e1 & (up_ | side) & (Yg < 380)] = C(RIM1); img[e1 & (up_ | side) & (Yg >= 380)] = C(RIM2)
    img[e2 & (up_ | side) & ((Xg + Yg) % 2 == 0)] = C(RIM2); img[e2 & up_ & am] = C(RIM3)
    return img, fig

def overlay(i):
    img = np.zeros((H, W, 4), 'uint8'); layered(img, FRONT, dx=PART[i], dy=BOB[i]); return img

G = [giant(i)[0] for i in range(N)]; OV = [overlay(i) for i in range(N)]
EDGE = []
for f in G + OV:
    a = f[..., 3]; assert set(np.unique(a)) <= {0, 255}
    ks = {'%02x%02x%02x' % tuple(c) for c in f[a > 0][:, :3]}; assert ks <= PALS, ks - PALS
    assert not (ks & {'4692ce', '4a70ba', '2c64a8', '30488c', '54444e'}), 'pre-spread colour'
    EDGE.append((int(a[-1].max() > 0), int(a[:, 0].sum() // 255), int(a[:, -1].sum() // 255), int(a[0].sum() // 255)))

print("EDGE", EDGE); assert not any(e != (0, 0, 0, 0) for e in EDGE), "opaque px on frame edge -> straight cut"
def save8(fr, base):
    st = np.concatenate(fr, 1); vis = st[..., 3] > 0
    cols = sorted({'%02x%02x%02x' % tuple(c) for c in st[vis][:, :3]}); idx = {c: k + 1 for k, c in enumerate(cols)}
    key = np.array(['%02x%02x%02x' % tuple(c) for c in st[..., :3].reshape(-1, 3)]).reshape(st.shape[:2])
    ind = np.zeros(st.shape[:2], 'uint8')
    for c, k in idx.items(): ind[vis & (key == c)] = k
    im = Image.fromarray(ind, 'P'); pal = [0, 0, 0]
    for c in cols: pal += [int(c[j:j+2], 16) for j in (0, 2, 4)]
    im.putpalette(pal + [0] * (768 - len(pal))); im.save(f'{OUT}/{base}.png', optimize=True, transparency=0)
    Image.fromarray(st).save(f'{OUT}/{base}.webp', lossless=True, quality=100, method=6)
    rt = np.array(Image.open(f'{OUT}/{base}.png').convert('RGBA')); assert (rt[vis] == st[vis]).all() and (rt[..., 3][~vis] == 0).all()
    rt2 = np.array(Image.open(f'{OUT}/{base}.webp').convert('RGBA')); assert (rt2[vis] == st[vis]).all()
    return st, len(cols)
for old in ('ondravel_summit_giant_idle', 'ondravel_summit_cloud_overlay'):
    for ext in ('.png', '.json', '_preview.gif', '.webp'):
        if os.path.exists(f'{OUT}/{old}{ext}'): os.remove(f'{OUT}/{old}{ext}')
SG, ncg = save8(G, 'ondravel_summit_giant_idle'); SO, nco = save8(OV, 'ondravel_summit_cloud_overlay')

# ---------------- scene: cave mouth -> ledge -> Ondravel in the clouds (64 px cells) ----------------
SW, SH_ = 640, 1024; CELL = 64
def sky():
    o = np.zeros((SH_, SW, 4), 'uint8'); o[..., 3] = 255; yy, xx = np.mgrid[0:SH_, 0:SW]; by = BAYER[yy % 4, xx % 4]
    bands = ['3a1e60', '6e222a', 'a23432', '9f4013', 'd46616', 'e29d40', 'eea23c', 'fcd668', 'f8eabe']; hz = 640
    v = np.clip(yy / hz, 0, 1) ** 0.8 * (len(bands) - 1) + (by - 0.5) * 1.2
    q = np.clip(v.round(), 0, len(bands) - 1).astype(int)
    for k, c in enumerate(bands): o[q == k] = C(c)
    sun = (xx - 420) ** 2 + (yy - 600) ** 2; o[sun < 40 ** 2] = C('f8eabe'); o[sun < 30 ** 2] = C('fcf6e8')
    o[(sun < 48 ** 2) & (sun >= 40 ** 2) & (by > 0.5)] = C('fcd668')
    r = np.random.RandomState(3)
    for k in range(26):   # streaky high cloud bands (solid px, dithered ends)
        y0 = r.randint(30, 520); x0 = r.randint(-100, SW); L = r.randint(80, 260); t = r.randint(2, 6)
        c = ['f08868', 'eea23c', 'fcd668', 'd46616'][min(3, int(y0 / 140)) if y0 > 200 else r.randint(0, 2)]
        for y in range(y0, y0 + t):
            for x in range(x0, x0 + L):
                e = min(x - x0, x0 + L - x) / 30
                if 0 <= x < SW and (e > 1 or by[y, x] < e): o[y, x] = C(c)
    sea = np.zeros((SH_, SW, 4), 'uint8'); P = []
    for k, x in enumerate(range(-40, SW + 60, 46)): P += cumulus(100 + k, x, 700 + r.randint(-10, 20), 90, 40, 6, 10, 30)
    m = cmask(P, shape=(SH_, SW)) | (yy > 760); paint_cumulus(sea, m, warm=0.05); o[m] = sea[m]
    return o
def ledge_layer():
    """cave cliff at the bottom (mouth at cells 4-5, row 15), rocky platform running up to a far edge at row 9."""
    o = np.zeros((SH_, SW, 4), 'uint8'); yy, xx = np.mgrid[0:SH_, 0:SW]; by = BAYER[yy % 4, xx % 4]; r = np.random.RandomState(8)
    jag = lambda base, amp, f, ph: base + amp * np.sin(xx / f + ph) + amp * 0.5 * np.sin(xx / (f * 0.37) + ph * 2)
    # platform: tapers toward the far edge (row 9, y=576)
    lx = 160 - (yy - 576) * 0.12 + 6 * np.sin(yy / 13.0); rx_ = 480 + (yy - 576) * 0.12 + 6 * np.sin(yy / 11.0 + 1)
    plat = (yy >= jag(576, 5, 9, 0)) & (xx > lx) & (xx < rx_)
    cliff = yy >= jag(880, 10, 21, 2) ; cliff |= (yy > 800) & ((xx < 150 + 20 * np.sin(yy / 17.0)) | (xx > 490 + 20 * np.sin(yy / 15.0)))
    rock = plat | cliff
    v = 0.55 - 0.25 * ((yy - 576) / 450) - 0.2 * ((xx - 320) / 320) + (by - 0.5) * 0.6
    RK = ['1a1226', '29252b', '2c2320', '3e3a48', '54444e' if False else '462c22', '5e5866']
    q = np.clip((v * (len(RK) - 1)).round(), 0, len(RK) - 1).astype(int)
    for k, c in enumerate(RK): o[rock & (q == k)] = C(c)
    for k in range(260):   # cracks / pebbles
        x, y = r.randint(0, SW), r.randint(576, SH_)
        if rock[y, x]: o[y, x:x + r.randint(2, 6)] = C(r.choice(['1a1226', '6a442e', '827a84']))
    top = rock & ~np.roll(rock, 2, 0); side = rock & (~np.roll(rock, 2, 1) | ~np.roll(rock, -2, 1))
    o[top] = C(RIM1); o[np.roll(top, 1, 0) & rock & (by > 0.5)] = C(RIM2); o[side & ~top] = C('d46616')
    mouth = ((xx - 320) / 70) ** 2 + ((yy - 1024) / 110) ** 2 < 1; mouth &= yy > 930
    o[mouth] = C('000000'); o[ndi.binary_dilation(mouth, iterations=3) & ~mouth & rock] = C('191210')
    o[..., 3] = np.where(rock, 255, 0)
    return o
SKY, LEDGE = sky(), ledge_layer()
GA = (320, 724)   # giant anchor (bottom-centre) in scene px -> frame top-left (96, 20)
CELLS = dict(cave_exit=(5, 14), walk_stop=(5, 10), speech_start=(5, 10), ondravel_anchor_px=GA)
MIRA = np.array(Image.open('/workspace/kilumen/art/characters/pixel/humans/mira/overworld/mira_chibi_sheet.png').convert('RGBA'))
def mira(col=0): return MIRA[288:384, col * 64:(col + 1) * 64]   # row 3 = facing up (seen from behind), 64x96 native
def put(base, f, x, y):
    h, w = f.shape[:2]; m = f[..., 3] > 0; sub = base[y:y + h, x:x + w]; mm = m[:sub.shape[0], :sub.shape[1]]; sub[mm] = f[:sub.shape[0], :sub.shape[1]][mm]
def scene(i, cell=None, walk_col=0, bubble=None):
    o = SKY.copy(); fx, fy = GA[0] - W // 2, GA[1] - H
    put(o, G[i], fx, fy); put(o, OV[i], fx, fy); put(o, LEDGE, 0, 0)
    if cell:
        put(o, mira(walk_col), cell[0] * CELL - 32 + 0, cell[1] * CELL + 64 - 96 + 32 - 32)
    if bubble:
        im = Image.fromarray(o); d = ImageDraw.Draw(im)
        d.rectangle([60, 860, 580, 1000], fill=(26, 18, 38, 255), outline=(252, 214, 104, 255), width=3)
        d.text((80, 880), 'ONDRAVEL', fill=(252, 214, 104, 255)); d.text((80, 910), bubble, fill=(252, 246, 232, 255))
        o = np.array(im)
    return o
def readab(fr, ox, oy):
    lum = lambda a: 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]; ok = tot = 0
    bgp = SKY[oy:oy + H, ox:ox + W].astype(float)
    for f in fr:
        m = f[..., 3] > 0; d = np.abs(lum(f[m].astype(float)) - lum(bgp[m])); ok += int((d >= 28).sum()); tot += d.size
    return round(ok / tot, 3)
fx, fy = GA[0] - W // 2, GA[1] - H
both = []
for g, ov in zip(G, OV):
    c = g.copy(); m = ov[..., 3] > 0; c[m] = ov[m]; both.append(c)
SC = dict(giant=readab(G, fx, fy), overlay=readab(OV, fx, fy), combined=readab(both, fx, fy))
fig_px = [(giant(i)[1]) for i in (0,)][0]; lumf = lambda a: 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
sil = dict(giant_body_only=readab([np.where(fig_px[..., None], G[0], 0).astype('uint8')], fx, fy))

pv = scene(0, CELLS['walk_stop']); Image.fromarray(pv).save(f'{OUT}/preview.png')
Image.fromarray(pv).resize((SW * 2, SH_ * 2), Image.NEAREST).save(f'{OUT}/preview_2x.png')   # zoom for viewing only
fr = [scene(i, CELLS['walk_stop']) for i in range(N)]
def gifsave(frames, path, ms):
    st = np.concatenate([f[..., :3] for f in frames], 0); im = Image.fromarray(st).quantize(256, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE)
    ims = [Image.fromarray(f[..., :3]).quantize(palette=im, dither=Image.Dither.NONE) for f in frames]
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=ms, loop=0, disposal=1)
gifsave(fr, f'{OUT}/ondravel_summit_combined_preview.gif', [MS] * N)
def onbg(frames):
    out = []
    for f in frames:
        c = np.zeros_like(f); c[..., :3] = (40, 24, 40); c[..., 3] = 255; m = f[..., 3] > 0; c[m] = f[m]; out.append(c)
    return out
gifsave(onbg(G), f'{OUT}/ondravel_summit_giant_idle_preview.gif', [MS] * N); gifsave(onbg(OV), f'{OUT}/ondravel_summit_cloud_overlay_preview.gif', [MS] * N)
# storyboard: 3 panels (1x scene each)
p1 = scene(0, CELLS['cave_exit'], 0); p2 = scene(2, (5, 12), 1); p3 = scene(1, CELLS['walk_stop'], 0, bubble='"...You are the one." (placeholder line)')
def lab(p, t):
    im = Image.fromarray(p); d = ImageDraw.Draw(im); d.rectangle([0, 0, SW, 26], fill=(20, 14, 26, 255)); d.text((8, 7), t, fill=(255, 255, 255, 255)); return np.array(im)
p2i = Image.fromarray(p2); d = ImageDraw.Draw(p2i)
for y in range(13 * 64 + 40, 11 * 64 + 40, -14): d.rectangle([316, y, 323, y + 6], fill=(252, 214, 104, 255))   # forced-walk arrow
d.polygon([(306, 11 * 64 + 44), (334, 11 * 64 + 44), (320, 11 * 64 + 26)], fill=(252, 214, 104, 255)); p2 = np.array(p2i)
sb = np.concatenate([lab(p1, '1  Player leaves the cave  (cell 5,14)'), np.zeros((SH_, 8, 4), 'uint8') + 255,
                     lab(p2, '2  Forced walk north to the edge  (5,14 -> 5,10)'), np.zeros((SH_, 8, 4), 'uint8') + 255,
                     lab(p3, '3  Stop at (5,10): Ondravel speaks, then battle')], 1)
Image.fromarray(sb).save(f'{OUT}/storyboard.png')

def mem(w, h):
    p2 = lambda v: 1 << (v - 1).bit_length()
    return dict(rgba_mb=round(w * h * 4 / 1048576, 2), pow2=f'{p2(w)}x{p2(h)}', pow2_rgba_mb=round(p2(w) * p2(h) * 4 / 1048576, 2))
def js(name, layer, notes, ncol, sc):
    j = dict(name=name, image=f'{name}.png', image_format='PNG-8 indexed (index 0 = transparent); lossless twin: ' + f'{name}.webp',
             disk_bytes={'png8': os.path.getsize(f'{OUT}/{name}.png'), 'webp_lossless': os.path.getsize(f'{OUT}/{name}.webp')},
             frame_width=W, frame_height=H, frame_count=N, layout='horizontal strip, frame i at x=i*448', colours=ncol,
             ms_per_frame=[MS] * N, loop=True, anchor=dict(x=224, y=703, meaning='bottom-centre of frame; giant + overlay share anchor and frame index'),
             layer=layer, time_of_day='sunset only (summit is locked to sunset; no ToD grading)', alpha='0/255 only', palette='kilumen.hex + RAMP_SPREAD outputs',
             readability_vs_sunset_sky=sc, readability_rule='share of opaque px with |dLuma|>=28 vs the sunset sky under them (preview scene)',
             memory=mem(W * N, H), scene_cells_64px=CELLS, notes=notes, status='DRAFT - not wired, needs Gary approval')
    json.dump(j, open(f'{OUT}/{name}.json', 'w'), indent=1)
js('ondravel_summit_giant_idle', 'BEHIND overlay; in front of sky', 'Ondravel + the cloud masses behind him. Breath 0/2/4/2 px, chest 0-2 px.', ncg, SC['giant'])
js('ondravel_summit_cloud_overlay', 'IN FRONT of giant; BEHIND the ledge, cave cliff and player', 'Front cumulus that wraps his lower body + side wisps parting 0/3/6/3 px.', nco, SC['overlay'])
print(json.dumps(dict(scores=SC, silhouette=sil, mem=mem(W * N, H), colours=(ncg, nco),
      disk={f: os.path.getsize(f'{OUT}/{f}') for f in sorted(os.listdir(OUT)) if os.path.isfile(f'{OUT}/{f}')})))
