"""Ondravel summit giant v2 (DRAFT, art only, not wired). python3 _tools/build.py
Frames 448x704, redrawn at true size (masks + shading + Bayer dither + 1px outline/rim at full res; no resampling of any art).
Sunset-only (summit is locked to sunset). Palette: art/palette/kilumen.hex + ondravel_anim_v1 RAMP_SPREAD outputs.
Deps: numpy (BSD), scipy (BSD), Pillow (HPND). v1 is in ../_prev/, v2 in ../_prev_v2/. v4 = simple flat design (Gary: v3 fur looked weird); v3 = fur-strand pass (mane, face, body), clouds on every side, narrow ledge."""
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

# ---------------- v3: rear clouds on every side (sheet) + front wrap (overlay) ----------------
REAR = [(cumulus(31, 70, 150, 60, 40, 7, 9, 22), 0.12, -1), (cumulus(32, 376, 140, 60, 40, 7, 9, 22), 0.12, 1),     # beside the antlers
        (cumulus(33, 224, 120, 80, 30, 6, 8, 18), 0.14, 0),                                                         # between the antlers, behind the crown
        (cumulus(34, 58, 330, 64, 90, 9, 12, 28), 0.06, -1), (cumulus(35, 382, 310, 64, 90, 9, 12, 28), 0.08, 1),   # beside the mane
        (cumulus(36, 64, 500, 80, 80, 9, 14, 32), 0.02, -1), (cumulus(37, 376, 490, 80, 80, 9, 14, 34), 0.03, 1),   # beside the shoulders
        (cumulus(38, 110, 620, 140, 50, 10, 14, 32), 0.0, -1), (cumulus(39, 338, 616, 140, 50, 10, 14, 32), 0.0, 1)]
FRONT = [(cumulus(41, 120, 630, 170, 54, 12, 14, 36), 0.0, -1), (cumulus(42, 330, 634, 170, 54, 12, 14, 38), 0.0, 1),
         (cumulus(43, 224, 646, 250, 36, 14, 12, 28), -0.05, 0),
         (cumulus(44, 62, 420, 54, 34, 6, 8, 18), 0.05, -1), (cumulus(45, 388, 404, 54, 34, 6, 8, 18), 0.05, 1),
         (cumulus(46, 50, 560, 60, 40, 6, 10, 22), 0.02, -1), (cumulus(47, 398, 570, 60, 40, 6, 10, 22), 0.02, 1)]

MANE = ['342842', '1e4078', '7ac2e8', 'c6ecfa', 'fcf6e8']
MUZ = ['5e5866', 'a8a0a4', 'ccc6c2', 'fcf6e8']   # grey-white muzzle like the battle art
FURD = ['1e4078', '342842']
def px(img, x, y, c):
    if 2 <= x < W - 2 and 2 <= y < H - 2: img[y, x] = C(c)
def vlight(m, blur=8, L=(-0.55, -0.75, 0.45), amb=0.0):
    """rounded volume: normal from a blurred height field, key light from the upper left."""
    hf = ndi.gaussian_filter(m.astype(float), blur); gy, gx = np.gradient(hf); s = blur * 3.0
    nx, ny, nz = -gx * s, -gy * s, np.ones_like(hf); nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    l = np.array(L) / np.linalg.norm(L); d = (nx * l[0] + ny * l[1] + nz * l[2]) / nn
    return np.clip(0.5 * d + 0.5 + amb, 0, 1)
def fillq(img, m, ramp, v, k=0.3):   # v4: flat cel bands, dither only at band borders
    q = np.clip(v * (len(ramp) - 1) + (BY - 0.5) * k, 0, len(ramp) - 1).round().astype(int)
    for i, c in enumerate(ramp): img[m & (q == i)] = C(c)
def fur(*a, **k): return   # v4: simple flat design, no strand pass (v3 strand code kept in ../_prev_v3/_tools)
def fur_v3(img, F, m, V, ramp, flow, n, L0, L1, seed, out=0, dark=0.22, curl=0.03, pale=0.0):
    """shaggy strands: start inside m, follow flow(x,y)->angle, may run `out` px past the edge (breaks the silhouette into hair)."""
    r = np.random.RandomState(seed); ys, xs = np.nonzero(m)
    ext = ndi.binary_dilation(m, iterations=out) if out else m
    for k in r.randint(0, len(xs), n):
        x, y = float(xs[k]), float(ys[k]); a = flow(x, y) + r.uniform(-0.12, 0.12); L = r.randint(L0, L1 + 1)
        if r.rand() < dark: c = r.choice(FURD); band = None
        else:
            band = int(np.clip(round(V[int(y), int(x)] * (len(ramp) - 1) + r.choice([-1, 0, 1, 1]) + pale), 0, len(ramp) - 1)); c = ramp[band]
        cv = r.uniform(-curl, curl)
        for t in range(L):
            X, Y = int(round(x)), int(round(y))
            if not (2 <= X < W - 2 and 2 <= Y < H - 2) or not ext[Y, X]: break
            img[Y, X] = C(c); F[Y, X] = True
            if band is not None and t > L * 0.75 and band > 0: c = ramp[band - 1]   # tips darken a step
            x += math.cos(a); y += math.sin(a); a += cv
def blob(pts_fn):
    im = Image.new('L', (W, H), 0); pts_fn(ImageDraw.Draw(im)); return np.array(im) > 0
def lock(d, bx, by, a, L, w, bend, split):
    """curved tapered fur lock; tip splits into 2-3 points (no diamond shards)."""
    pts_l, pts_r = [], []
    for t in np.linspace(0, 1, 9):
        aa = a + bend * t; x = bx + math.cos(a) * L * t + math.cos(aa + 1.57) * bend * L * 0.25 * t * t; y = by + math.sin(a) * L * t + 8 * t * t
        hw = w / 2 * (1 - t) ** 0.7 + 0.5; nx, ny = -math.sin(aa), math.cos(aa)
        pts_l.append((x + nx * hw, y + ny * hw)); pts_r.append((x - nx * hw, y - ny * hw))
    tip = pts_l[-1]; tips = [(tip[0] + math.cos(a + o) * L * 0.18, tip[1] + math.sin(a + o) * L * 0.18 + 3) for o in ([-0.35, 0.3] if split == 2 else [-0.45, 0.05, 0.4])]
    d.polygon(pts_l + tips + pts_r[::-1], fill=255)

def build_upper():
    """mane, head, face, antlers at b=0 (frames shift this layer by the breath offset, so fur never boils)."""
    img = np.zeros((H, W, 4), 'uint8'); F = np.zeros((H, W), bool); r = np.random.RandomState(9)
    hx, hy = cx, 262                                   # head centre
    # antlers (behind the mane): brown, tan tips, bark grooves
    am = Image.new('L', (W, H), 0); ad = SD(ImageDraw.Draw(am))
    for s in (-1, 1):
        X = lambda x: 112 + s * x
        thick(ad, [(X(22), 100), (X(36), 80), (X(58), 64), (X(78), 44), (X(90), 22), (X(94), 8)], 16, 7)
        for (bx, by, tx, ty, w) in [(40, 76, 32, 44, 7), (60, 62, 64, 26, 6), (80, 44, 100, 32, 5), (72, 52, 70, 16, 4), (86, 32, 102, 16, 3.5), (32, 84, 52, 96, 4.5)]:
            thick(ad, [(X(bx), by), (X((bx + tx) / 2), (by + ty) / 2 - 4), (X(tx), ty)], w * 1.35, 2.5)
    am = np.array(am) > 0
    v = vlight(am, 4) * 0.5 + 0.3 * np.clip(1 - Yg / 160, 0, 1) ** 2
    fillq(img, am, ANT, v, k=0.8); img[am & ((Xg + 2 * Yg) % 13 == 0) & (v < 0.7)] = C('462c22'); F |= am
    # v4 mane: flat clumps like the approved walk/battle art -> deep blue core, each lock a clean 3-tone shape with a 1 px crease
    mane = blob(lambda d: d.ellipse([hx - 140, 160, hx + 140, 460], fill=255)) & (Xg > 6) & (Xg < W - 6)
    img[mane] = C('1e4078'); F |= mane
    LK = []
    for k in range(30):
        a = math.radians(-200 + 220 * k / 29 + r.uniform(-2, 2)); rx, ry = 128, 140
        bx, by = hx + rx * math.cos(a) * 0.7, 310 + ry * math.sin(a) * 0.7
        aa = math.atan2(math.sin(a) + 0.45 * math.cos(a) ** 2, math.cos(a))
        LK.append((by, (bx, by, aa, r.uniform(44, 62), r.uniform(40, 50), 0.25 * math.cos(a), 2)))
    for k in range(7):
        x0 = hx - 100 + 200 * k / 6; LK.append((440, (x0, 430, math.radians(90 + (x0 - hx) * 0.12), r.uniform(44, 58), r.uniform(44, 52), 0.0, 2)))
    for _, p in sorted(LK, key=lambda t: t[0]):          # upper locks first, lower ones overlap them
        lm = blob(lambda d: lock(d, *p)) & (Xg > 6) & (Xg < W - 6)
        if not lm.any(): continue
        v = vlight(lm, 7, amb=0.02) - 0.12 * np.clip((Xg - hx) / 160, -1, 1)
        q = np.where(v > 0.66, 2, np.where(v > 0.42, 1, 0))
        for i_, c in enumerate(['1e4078', '7ac2e8', 'c6ecfa']): img[lm & (q == i_)] = C(c)
        img[lm & ~ndi.binary_erosion(lm) & mane] = C('342842'); F |= lm; mane |= lm
    # ears: tufted, half hidden in the mane
    ears = blob(lambda d: [d.polygon([(hx + s * 58, 196), (hx + s * 112, 160), (hx + s * 92, 222)], fill=255) for s in (-1, 1)])
    fillq(img, ears, MANE[1:], vlight(ears, 5)); img[ears & ndi.binary_erosion(ears, iterations=5)] = C('342842'); F |= ears
    fur(img, F, ears, vlight(ears, 5), MANE, lambda x, y: math.atan2(-1, 2.2 if x > hx else -2.2), 160, 4, 9, 2, out=3, dark=0.1)
    # head: broad lion skull + cheek ruff
    head = blob(lambda d: (d.ellipse([hx - 84, 178, hx + 84, 336], fill=255), d.ellipse([hx - 100, 250, hx + 100, 340], fill=255)))
    Vh = vlight(head, 14, amb=0.08); fillq(img, head, MANE[1:], Vh, k=0.2); img[head & ~ndi.binary_erosion(head) & ~ndi.binary_erosion(head, iterations=1)] = C('342842'); F |= head
    nose_pt = (hx, 360)
    fur(img, F, head, Vh, MANE[1:], lambda x, y: math.atan2(y - nose_pt[1], x - nose_pt[0]) + (0.5 if x > hx else -0.5), 2600, 5, 12, 3, out=4, dark=0.18)
    # muzzle: rounded, longer than wide, grey-white, real volume (blurred height field), short fur
    muz = blob(lambda d: (d.polygon([(hx - 20, 240), (hx + 20, 240), (hx + 30, 320), (hx - 30, 320)], fill=255), d.ellipse([hx - 62, 318, hx + 4, 384], fill=255), d.ellipse([hx - 4, 318, hx + 62, 384], fill=255), d.ellipse([hx - 30, 360, hx + 30, 396], fill=255)))
    Vm = vlight(muz, 10, amb=-0.1); fillq(img, muz, MUZ, Vm)
    fur(img, F, muz, Vm, ['1e4078', '5e5866', 'a8a0a4', '7ac2e8', 'c6ecfa', 'fcf6e8'], lambda x, y: math.atan2(1.0, (x - hx) / 18.0), 1400, 3, 8, 4, out=1, dark=0.08)
    side = muz & ~ndi.binary_erosion(muz, iterations=3) & (Xg > hx); img[side & (BY > 0.4)] = C('5e5866')   # shade-side cheek edge
    for s in (-1, 1):   # pad crease + whisker dots
        for t in range(18): px(img, hx + s * (4 + t // 3), 366 + t, 'a8a0a4' if s < 0 else '5e5866')
        for (dx, dy) in [(22, 340), (32, 344), (26, 352), (38, 352), (30, 360)]: px(img, hx + s * dx, dy, '5e5866')
    # shaggy brow: dark socket band, then overhanging tufts flowing out and down
    for s in (-1, 1):
        sock = blob(lambda d: d.ellipse([hx + s * 38 - 22, 254, hx + s * 38 + 22, 278], fill=255)); img[sock & (BY < 0.7)] = C('1e4078'); img[sock & (Yg < 266) & (BY < 0.6)] = C('342842')
    brow = blob(lambda d: [d.polygon([(hx + s * 6, 226), (hx + s * 70, 238), (hx + s * 76, 258), (hx + s * 12, 252)], fill=255) for s in (-1, 1)])
    Vb = vlight(brow, 5, amb=0.12); fillq(img, brow, MANE[1:], Vb)
    fur(img, F, brow, Vb, MANE[1:], lambda x, y: math.atan2(0.55, 1.0 if x > hx else -1.0), 700, 6, 14, 5, out=6, dark=0.2, pale=0.4)
    for y in range(206, 240): px(img, hx, y, '1e4078'); px(img, hx - 1, y, 'c6ecfa' if y % 3 else '7ac2e8')   # furrow
    # eyes: deep-set almond, dark, pale glint (top-left)
    for s in (-1, 1):
        ex = hx + s * 38
        eye = blob(lambda d: d.polygon([(ex - s * 16, 266), (ex - s * 4, 260), (ex + s * 12, 262), (ex + s * 16, 268), (ex, 272)], fill=255))
        img[eye] = C(OUTL)
        for (dx, dy, c) in [(-3, 265, 'c6ecfa'), (-2, 265, 'c6ecfa'), (-3, 266, '7ac2e8'), (-2, 266, 'c6ecfa'), (-1, 266, '7ac2e8'), (-2, 264, 'fcf6e8')]:
            px(img, ex + dx, dy, c)
        for t in range(16): px(img, ex - s * 8 + s * t, 274 + (t // 8), '7ac2e8' if s < 0 else '1e4078')
    # nose: broad dark pad with top highlight + nostrils; mouth; chin
    nose = blob(lambda d: d.polygon([(hx - 24, 344), (hx + 24, 344), (hx + 18, 362), (hx, 370), (hx - 18, 362)], fill=255))
    img[nose] = C('2c2320'); top = nose & ~np.roll(nose, 2, 0); img[top] = C('5e5866'); img[top & (Xg < hx - 4)] = C('827a84')
    for s in (-1, 1):
        for (dx, dy) in [(9, 356), (10, 356), (11, 357), (12, 357), (12, 358)]: px(img, hx + s * dx, dy, OUTL)
    for y in range(370, 378): px(img, hx, y, OUTL)
    for t in range(26):
        for s in (-1, 1): px(img, hx + s * t, 378 + int((t / 26) ** 2 * 6), OUTL); px(img, hx + s * t, 379 + int((t / 26) ** 2 * 6), '342842')
    # chin beard: pale fur falling into the chest ruff
    beard = blob(lambda d: d.polygon(spiky(hx, 392, 50, 40, 16, 0.4, 5, 0, math.pi), fill=255)) & (Yg > 376)
    Vbd = vlight(beard, 8, amb=0.1); fillq(img, beard, MUZ[1:], Vbd); F |= beard
    fur(img, F, beard, Vbd, MUZ[1:], lambda x, y: math.radians(90 + (x - hx) * 0.5), 500, 6, 16, 6, out=6, dark=0.1)
    # forehead crystal (small, Guardian mark)
    for dy in range(-7, 8):
        w_ = 4 - abs(dy) * 4 // 7
        for dx in range(-w_, w_ + 1): px(img, hx + dx, 214 + dy, 'fcf6e8' if dx < 0 or dy < -3 else ('c6ecfa' if dx < 2 else '7ac2e8'))
    return img, F

def build_body():
    img = np.zeros((H, W, 4), 'uint8'); F = np.zeros((H, W), bool)
    body = blob(lambda d: (d.polygon([(cx - 150, 650), (cx - 168, 560), (cx - 150, 450), (cx - 80, 400), (cx + 80, 400), (cx + 150, 450), (cx + 168, 560), (cx + 150, 650)] +
                                     [(cx + 150 - 300 * k / 14, 650 + (12 if k % 2 else -4) + 4 * math.sin(k * 2.3)) for k in range(15)], fill=255),
                           d.ellipse([cx - 180, 460, cx - 100, 560], fill=255), d.ellipse([cx + 100, 460, cx + 180, 560], fill=255)))
    V = vlight(body, 22, amb=-0.02) * 0.85 + 0.1 * np.clip(1 - (Yg - 420) / 280, 0, 1); fillq(img, body, MANE, V); F |= body
    fur(img, F, body, V, MANE, lambda x, y: math.radians(90 + (x - cx) * 0.22), 4500, 8, 20, 7, out=4, dark=0.22)
    # dark chest bib like the walk art + two flat ice facets on the lit shoulder
    bib = blob(lambda d: d.polygon([(cx - 70, 440), (cx + 70, 440), (cx + 40, 600), (cx, 640), (cx - 40, 600)], fill=255)) & body
    img[bib] = C('1e4078'); img[bib & ~ndi.binary_erosion(bib)] = C('342842')
    for (x0, y0) in [(cx - 130, 500), (cx - 104, 560)]:
        fac = blob(lambda d: d.polygon([(x0, y0 - 18), (x0 + 12, y0), (x0, y0 + 18), (x0 - 12, y0)], fill=255)) & body; img[fac] = C('fcf6e8'); img[fac & (Xg > x0)] = C('c6ecfa')
    return img, F

UP, UPF = build_upper(); BODY, BODYF = build_body()
def sh(a, dy):
    o = np.roll(a, dy, 0)
    if dy < 0: o[dy:] = 0
    elif dy > 0: o[:dy] = 0
    return o
def giant(i):
    b, ch = BREATH[i], CHEST[i]; img = np.zeros((H, W, 4), 'uint8')
    layered(img, REAR, dx=PART[i], dy=0)
    bf = sh(BODYF, -ch); bi = sh(BODY, -ch); bf[H - 6:] = False; img[bf] = bi[bf]
    uf = sh(UPF, -b); ui = sh(UP, -b); img[uf] = ui[uf]
    fig = bf | uf
    ring = ndi.binary_dilation(fig) & ~fig; ring[H - 3:] = False; img[ring] = C(OUTL)
    # sunset back-light: sun is behind him (upper right) -> solid gold rim on top + right edges, thinner on the left
    e1 = fig & ~ndi.binary_erosion(fig); up_ = fig & ~np.roll(fig, 3, 0); rt = fig & ~np.roll(fig, -3, 1); lf = fig & ~np.roll(fig, 3, 1)
    e2 = fig & ~ndi.binary_erosion(fig, iterations=2) & ~e1
    img[e1 & (up_ | rt)] = C(RIM1); img[e1 & lf & ~up_ & (Yg < 500)] = C(RIM2)
    img[e2 & (up_ | rt) & ((Xg + Yg) % 2 == 0)] = C(RIM2); img[e2 & up_ & uf & (Yg < 170 - b)] = C(RIM3)
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

# ---------------- scene v3: open sky, sea of clouds, narrow ledge from a cave mouth (64 px cells, 640x1152 = 10x18) ----------------
SW, SH_ = 640, 1152; CELL = 64
SY, SX = np.mgrid[0:SH_, 0:SW]; SB = BAYER[SY % 4, SX % 4]
def scum(img, clusters, warm_rows=True):
    for P, warm in clusters:
        m = cmask(P, shape=(SH_, SW)); tmp = img.copy(); paint_cumulus(tmp, m, warm=warm); img[m] = tmp[m]
def sky():
    o = np.zeros((SH_, SW, 4), 'uint8'); o[..., 3] = 255
    bands = ['3a1e60', '6e222a', 'a23432', '9f4013', 'd46616', 'e29d40', 'eea23c', 'fcd668', 'f8eabe']; hz = 760
    v = np.clip(SY / hz, 0, 1) ** 0.8 * (len(bands) - 1) + (SB - 0.5) * 1.2
    q = np.clip(v.round(), 0, len(bands) - 1).astype(int)
    for k, c in enumerate(bands): o[q == k] = C(c)
    sun = (SX - 470) ** 2 + (SY - 690) ** 2; o[sun < 46 ** 2] = C('f8eabe'); o[sun < 34 ** 2] = C('fcf6e8'); o[(sun < 56 ** 2) & (sun >= 46 ** 2) & (SB > 0.5)] = C('fcd668')
    r = np.random.RandomState(3)
    for k in range(30):   # streaky high cloud bands
        y0 = r.randint(20, 600); x0 = r.randint(-100, SW); L = r.randint(80, 260); t = r.randint(2, 6)
        c = ['f08868', 'eea23c', 'fcd668', 'd46616'][min(3, int(y0 / 160)) if y0 > 200 else r.randint(0, 2)]
        for y in range(y0, y0 + t):
            for x in range(max(0, x0), min(SW, x0 + L)):
                e = min(x - x0, x0 + L - x) / 30
                if e > 1 or SB[y, x] < e: o[y, x] = C(c)
    # towering cumulus beside him (outside his frame: x<96 and x>544) + the far sea, back to front, rows grow toward the viewer
    cl = [(cumulus(201, 40, 260, 70, 70, 8, 10, 26), 0.12), (cumulus(202, 604, 230, 70, 70, 8, 10, 26), 0.14),
          (cumulus(203, 36, 470, 90, 100, 10, 14, 34), 0.06), (cumulus(204, 610, 450, 90, 110, 10, 14, 36), 0.08)]
    for row, (y, w, rmax, warm) in enumerate([(700, 70, 22, 0.1), (735, 80, 26, 0.07), (765, 90, 30, 0.05), (820, 110, 40, 0.0), (920, 130, 50, -0.04), (1040, 150, 58, -0.08), (1150, 170, 64, -0.1)]):
        for k, x in enumerate(range(-60 + 37 * row, SW + 80, int(w * 0.75))):
            cl.append((cumulus(300 + row * 40 + k, x + r.randint(-14, 14), y + r.randint(-12, 12), w, 40 + row * 8, 7, 10, rmax), warm))
    scum(o, cl[:4])
    o[(SY > 790)] = C('daa2ba'); o[(SY > 790) & (SB < 0.5)] = C('f08868')
   # sea body under the puffs (no gaps to the sky below the horizon)
    scum(o, cl[4:]); return o
def near_sea():
    """cumulus that sit in front of his base, between him and the ledge (scene dressing, drawn above the overlay)."""
    o = np.zeros((SH_, SW, 4), 'uint8'); r = np.random.RandomState(77); cl = []
    for row, (y, w, rmax, warm) in enumerate([(780, 120, 36, 0.02), (850, 140, 44, -0.02), (960, 160, 52, -0.06), (1090, 180, 60, -0.1)]):
        for k, x in enumerate(range(-50 + 53 * row, SW + 90, int(w * 0.8))):
            cl.append((cumulus(500 + row * 40 + k, x + r.randint(-16, 16), y + r.randint(-10, 10), w, 40 + row * 10, 8, 10, rmax), warm))
    scum(o, cl); return o
def facets(seed, n):
    """rock texture: voronoi facets, each with its own plane normal -> lit/shade from the upper left + dark cracks."""
    r = np.random.RandomState(seed); seeds = np.ones((SH_, SW), bool)
    pts = np.c_[r.randint(0, SH_, n), r.randint(0, SW, n)]; seeds[pts[:, 0], pts[:, 1]] = False
    d, (iy, ix) = ndi.distance_transform_edt(seeds, return_indices=True)
    lab = iy * SW + ix; tone = {}
    for (y, x) in pts: tone[y * SW + x] = r.uniform(-0.25, 0.25) + 0.25 * r.uniform(-1, 1)
    t = np.vectorize(tone.get)(lab).astype(float)
    crack = (lab != np.roll(lab, 1, 0)) | (lab != np.roll(lab, 1, 1))
    litedge = (lab != np.roll(lab, 2, 0)) & ~crack
    return t, crack, litedge
RK = ['000000', '1a1226', '29252b', '2c2320', '3e3a48', '5e5866', '827a84']
def ledge_layer():
    o = np.zeros((SH_, SW, 4), 'uint8'); r = np.random.RandomState(8)
    jag = lambda base, amp, f, ph: base + amp * np.sin(SX / f + ph) + amp * 0.5 * np.sin(SX / (f * 0.37) + ph * 2)
    # narrow platform: far edge at y~836 (row 13), x ~250..400, widening toward the cave outcrop
    yy = SY.astype(float)
    lx = 262 - (yy - 836) * 0.28 + 7 * np.sin(yy / 13.0); rx_ = 394 + (yy - 836) * 0.30 + 7 * np.sin(yy / 11.0 + 1)
    plat = (yy >= jag(836, 4, 7, 0)) & (SX > lx) & (SX < rx_)
    face = (yy >= jag(836, 4, 7, 0) + 0) & ~plat & (SX > lx - 18) & (SX < rx_ + 18) & (yy < 1000)       # ledge side walls dropping into the clouds
    face &= (yy - jag(836, 4, 7, 0)) < 22 + (yy - 836) * 0.4
    out = ((SX - 320) / 230) ** 2 + ((yy - 1180) / 190) ** 2 < 1                                          # cave outcrop at the bottom
    out |= (yy > jag(1100, 9, 13, 3)) & (SX > 60 + 20 * np.sin(yy / 9.0)) & (SX < 580 + 20 * np.sin(yy / 7.0))
    rock = plat | face | out
    t, crack, lit = facets(8, 520)
    base = 0.62 - 0.22 * ((yy - 836) / 320) - 0.18 * ((SX - 320) / 320)
    v = base + t * 0.5; v[face] -= 0.3; v[out & ~plat] -= 0.05
    q = np.clip((v * (len(RK) - 1) + (SB - 0.5) * 0.9).round(), 1, len(RK) - 1).astype(int)
    for k, c in enumerate(RK): o[rock & (q == k)] = C(c)
    o[rock & crack & (SB < 0.75)] = C('1a1226'); o[rock & lit & (v > 0.45)] = C('827a84')
    for k in range(240):   # pebbles + snow-free grit
        x, y = r.randint(0, SW), r.randint(830, SH_)
        if plat[y, x] and not out[y, x]: o[y, x:x + r.randint(2, 4)] = C(r.choice(['5e5866', '6a442e', '1a1226']))
    top = rock & ~np.roll(rock, 2, 0); rside = rock & ~np.roll(rock, -2, 1)
    o[top] = C(RIM1); o[np.roll(top, 1, 0) & rock & (SB > 0.5)] = C(RIM2); o[rside & ~top & (SY < 1000)] = C('d46616')
    # cave mouth: rough arch, lip lit from the sky, inner walls fall off in dithered steps, stalactite teeth, rubble floor
    ang = np.arctan2(yy - 1152, SX - 320); rr = 1 + 0.06 * np.sin(ang * 9 + 1) + 0.03 * np.sin(ang * 23)
    e = ((SX - 320) / 92) ** 2 + ((yy - 1152) / 128) ** 2
    mouth = e < rr ** 2
    for k, (lim, c) in enumerate([(1.0, '3e3a48'), (0.80, '29252b'), (0.62, '1a1226'), (0.42, '000000')]):
        rg = mouth & (e < (lim * rr) ** 2); o[rg & ((SB < 0.6) | (k == 0) | (e < (lim * 0.9 * rr) ** 2))] = C(c)
    o[mouth & (e > (0.8 * rr) ** 2) & (SX < 300) & (SB < 0.4)] = C('5e5866')        # sky light on the left inner wall
    for k in range(9):                                                                  # teeth hanging from the lip
        a = math.radians(200 + 140 * (k + 0.5) / 9); x0 = 320 + 92 * math.cos(a) * 0.95; y0 = 1152 + 128 * math.sin(a) * 0.95
        L = r.randint(8, 22)
        for t_ in range(L):
            w_ = max(0, 3 - t_ * 3 // L)
            for dx in range(-w_, w_ + 1):
                X, Y = int(x0 + dx), int(y0 + t_)
                if 0 <= X < SW and Y < SH_: o[Y, X] = C('29252b' if dx > 0 else '3e3a48')
    lip = ndi.binary_dilation(mouth, iterations=3) & ~mouth & rock
    o[lip] = C('29252b'); o[lip & (SY < 1080) & (SB < 0.5)] = C(RIM2); o[lip & (SY < 1050)] = C(RIM1)
    floor = mouth & (yy > 1112); o[floor & (SB < 0.5)] = C('3e3a48'); o[floor & (yy > 1130) & (SB < 0.7)] = C('5e5866')
    o[..., 3] = np.where(rock, 255, 0)
    return o
SKY, NEAR, LEDGE = sky(), near_sea(), ledge_layer()
GA = (320, 744)   # giant anchor (bottom-centre) in scene px -> frame top-left (96, 40)
CELLS = dict(cave_exit=(5, 17), walk_stop=(5, 13), speech_start=(5, 13), ondravel_anchor_px=GA)
MIRA = np.array(Image.open('/workspace/kilumen/art/characters/pixel/humans/mira/overworld/mira_chibi_sheet.png').convert('RGBA'))
def mira(col=0): return MIRA[288:384, col * 64:(col + 1) * 64]   # row 3 = facing up (seen from behind), 64x96 native
def put(base, f, x, y):
    h, w = f.shape[:2]; X0, Y0 = max(0, x), max(0, y); X1, Y1 = min(base.shape[1], x + w), min(base.shape[0], y + h)
    sub = f[Y0 - y:Y1 - y, X0 - x:X1 - x]; m = sub[..., 3] > 0; base[Y0:Y1, X0:X1][m] = sub[m]
def scene(i, cell=None, walk_col=0, bubble=None):
    o = SKY.copy(); fx, fy = GA[0] - W // 2, GA[1] - H
    put(o, G[i], fx, fy); put(o, OV[i], fx, fy); put(o, NEAR, 0, 0); put(o, LEDGE, 0, 0)
    if cell: put(o, mira(walk_col), cell[0] * CELL - 32, cell[1] * CELL + 56 - 96)   # feet ~8 px above the tile bottom
    if bubble:
        im = Image.fromarray(o); d = ImageDraw.Draw(im)
        d.rectangle([40, 960, 600, 1120], fill=(26, 18, 38, 255), outline=(252, 214, 104, 255), width=3)
        d.text((60, 980), 'ONDRAVEL', fill=(252, 214, 104, 255)); d.text((60, 1010), bubble, fill=(252, 246, 232, 255))
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
p1 = scene(0, CELLS['cave_exit'], 0); p2 = scene(2, (5, 15), 1); p3 = scene(1, CELLS['walk_stop'], 0, bubble='"...You are the one." (placeholder line)')
def lab(p, t):
    im = Image.fromarray(p); d = ImageDraw.Draw(im); d.rectangle([0, 0, SW, 26], fill=(20, 14, 26, 255)); d.text((8, 7), t, fill=(255, 255, 255, 255)); return np.array(im)
p2i = Image.fromarray(p2); d = ImageDraw.Draw(p2i)
for y in range(15 * 64 + 10, 13 * 64 + 70, -14): d.rectangle([316, y, 323, y + 6], fill=(252, 214, 104, 255))   # forced-walk arrow
d.polygon([(306, 13 * 64 + 74), (334, 13 * 64 + 74), (320, 13 * 64 + 56)], fill=(252, 214, 104, 255)); p2 = np.array(p2i)
sb = np.concatenate([lab(p1, '1  Player leaves the cave  (cell 5,17)'), np.zeros((SH_, 8, 4), 'uint8') + 255,
                     lab(p2, '2  Forced walk north along the ledge  (5,17 -> 5,13)'), np.zeros((SH_, 8, 4), 'uint8') + 255,
                     lab(p3, '3  Stop at (5,13): Ondravel speaks, then battle')], 1)
Image.fromarray(sb).save(f'{OUT}/storyboard.png')
# palette check on every scene layer too
for L_ in (SKY, NEAR, LEDGE, pv):
    ks = {'%02x%02x%02x' % tuple(c) for c in L_[L_[..., 3] > 0][:, :3]}; assert ks <= PALS, ks - PALS
    assert set(np.unique(L_[..., 3])) <= {0, 255}

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
