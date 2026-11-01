"""Ondravel summit giant idle + parting-cloud overlay (DRAFT, art only). python3 _tools/build.py
Hand-built at true scale (1 art px = 1 game px): every frame is re-drawn from shapes, nothing is resized.
Palette: art/palette/kilumen.hex + approved icy RAMP_SPREAD (imported from ondravel_anim_v1/_tools/build.py).
Scoring: ondravel_anim_v1 score_ow (imported) + fxx_lib grade/lum. Deps: numpy (BSD), scipy (BSD), Pillow (HPND)."""
import os, sys, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
V1 = '/workspace/kilumen/shots/ondravel_anim_v1/_tools'
_s = open(f'{V1}/build.py').read().split('# ---- build ----')[0]
# drop the tank block (needs wt_director_lab, absent); keep helpers + scoring verbatim
src = _s.split('# ---- tank water')[0] + '\n# ---- scoring ----' + _s.split('# ---- scoring ----')[1]
B = {'__file__': f'{V1}/build.py'}; exec(compile(src, 'build.py', 'exec'), B)
grade, lum, PH, score_ow, PALS, RAMP = B['grade'], B['lum'], B['PH'], B['score_ow'], B['PALS'], B['RAMP_SPREAD']
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/fx_extra/_tools'); import fxx_lib as F

W, H = 224, 352            # 7 x 11 tiles of 32 px
N, MS = 6, 300             # 1.8 s breath loop
BREATH = [0, 1, 2, 3, 2, 1]   # head/mane lift (px)
CHEST = [0, 0, 1, 1, 1, 0]
PART = [0, 1, 2, 3, 2, 1]     # cloud parting (px outward)
BOB = [0, 0, 1, 1, 1, 0]
def C(h): return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)] + [255], 'uint8')
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16
Yg, Xg = np.mgrid[0:H, 0:W]; BY = BAYER[Yg % 4, Xg % 4]
# ramps (icy = post-RAMP_SPREAD colours of his body: 4692ce->7ac2e8, 7ac2e8->c6ecfa, mid-darks->1e4078)
ICE = ['342842', '1e4078', '7ac2e8', 'c6ecfa', 'fcf6e8']
MANE = ['3e3a48', '1e4078', '7ac2e8', 'c6ecfa', 'fcf6e8']
ANT = ['2c2320', '462c22', '6a442e', '92623e', 'ccaa6e', 'deb478']
CLOUD = ['5e5866', '827a84', 'a8a0a4', 'ccc6c2', 'ecdec4', 'fcf6e8']
RIM1, RIM2, RIM3 = 'fcd668', 'eea23c', 'e29d40'   # sunset back-light (inner->outer)
OUTL = '1a1226'
for c in ICE + MANE + ANT + CLOUD + [RIM1, RIM2, RIM3, OUTL, 'f8eabe', 'd46616']: assert c in PALS, c
assert all(v in ICE + MANE for v in ['7ac2e8', 'c6ecfa', '1e4078'])  # icy mapping targets only; no pre-spread mids (4692ce/4a70ba/2c64a8/30488c)

def mask(fn):
    im = Image.new('L', (W, H), 0); fn(ImageDraw.Draw(im)); return np.array(im) > 0
def shade(img, m, ramp, cx, cy, rx, ry, bias=0.0, edge=1.0, k=0.8):
    """upper-left key light: value from position (+edge darkening via distance), ordered-dither quantised to ramp."""
    if not m.any(): return
    d = ndi.distance_transform_edt(m)
    v = 0.55 + bias - 0.35 * ((Xg - cx) / rx) - 0.45 * ((Yg - cy) / ry)
    v -= edge * 0.25 * (d < 2.5) ; v += 0.08 * np.clip((d - 3) / 10, 0, 1)
    q = np.clip(v * (len(ramp) - 1) + (BY - 0.5) * k, 0, len(ramp) - 1).round().astype(int)
    for i, c in enumerate(ramp): img[m & (q == i)] = C(c)
def thick(dr, pts, w0, w1):
    n = len(pts) - 1
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]; L = max(1, int(math.hypot(x1 - x0, y1 - y0)))
        for s in range(L + 1):
            t = (i + s / L) / n; w = w0 + (w1 - w0) * t; x = x0 + (x1 - x0) * s / L; y = y0 + (y1 - y0) * s / L
            dr.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
def spiky(cx, cy, rx, ry, n, amp, seed, a0=0, a1=2 * math.pi):
    r = np.random.RandomState(seed); pts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n; f = 1 + (amp if i % 2 else -amp * 0.3) * (0.6 + 0.4 * r.rand())
        pts.append((cx + rx * f * math.cos(a), cy + ry * f * math.sin(a)))
    return pts
def puffs(spec):
    """cloud = union of solid circles; spec list of (x,y,r)."""
    return mask(lambda d: [d.ellipse([x - r, y - r, x + r, y + r], fill=255) for x, y, r in spec])
def cloud_puffs(img, spec, sunlit=True):
    """each puff shaded on its own (upper-left lit sphere-ish), painted top->bottom so lower puffs sit in front;
    a 1-px a8a0a4 seam where a puff overlaps one behind it; sunset gold on the crest px of the whole bank."""
    h, w = img.shape[:2]; Yg, Xg = np.mgrid[0:h, 0:w]; BY = BAYER[Yg % 4, Xg % 4]; tot = np.zeros((h, w), bool)
    for x, y, r in sorted(spec, key=lambda t: t[1]):
        d2 = (Xg - x) ** 2 + (Yg - y) ** 2; m = d2 < r * r
        v = 1.0 - 0.6 * np.clip((Yg - y + r * 0.5) / (1.5 * r), 0, 1) - 0.2 * (Xg - x) / r
        q = np.clip(v * (len(CLOUD) - 1) + (BY - 0.5) * 0.7, 1, len(CLOUD) - 1).round().astype(int)
        seam = m & ~(np.sqrt(d2) < r - 1) & tot & (Yg < y - r * 0.3)
        for i, c in enumerate(CLOUD): img[m & (q == i)] = C(c)
        img[seam] = C('a8a0a4'); tot |= m
    if sunlit:
        crest = tot & ~np.roll(tot, 1, 0); img[crest] = C('f8eabe')
        img[crest & ~np.roll(tot, -1, 1) | (np.roll(crest, 1, 0) & tot & (Xg % 2 == 0) & (Xg > w * 0.5))] = C(RIM1)
    img[tot & ~np.roll(tot, -1, 0)] = C('827a84')
    return tot
def cloud_paint(img, m, sunlit=True):
    """flat-bottomed puffs: light top-left, shadow bottom; sunset gold on top-right crests; outline bottom only."""
    if not m.any(): return
    Yg, Xg = np.mgrid[0:m.shape[0], 0:m.shape[1]]; BY = BAYER[Yg % 4, Xg % 4]
    up = m & ~np.roll(m, 1, 0); top = ndi.distance_transform_edt(~up) if up.any() else 0
    v = 0.95 - 0.06 * np.minimum(top, 12) - 0.12 * ((Xg - Xg[m].min()) / max(1, np.ptp(Xg[m])))
    q = np.clip(v * (len(CLOUD) - 1) + (BY - 0.5) * 0.9, 0, len(CLOUD) - 1).round().astype(int)
    for i, c in enumerate(CLOUD): img[m & (q == i)] = C(c)
    if sunlit:
        crest = m & ~np.roll(m, 1, 0) | (m & ~np.roll(np.roll(m, 1, 0), -1, 1))
        img[crest & ~np.roll(m, -1, 1)] = C(RIM2)
        img[m & ~np.roll(m, 1, 0)] = C('f8eabe')
        img[m & ~np.roll(m, 2, 0) & np.roll(m, 1, 0) & ((Xg + Yg) % 2 == 0)] = C(RIM1)
    bot = m & ~np.roll(m, -1, 0); img[bot] = C(CLOUD[0])

def giant(i):
    b, ch = BREATH[i], CHEST[i]; img = np.zeros((H, W, 4), 'uint8'); cx = 112
    # back cloud bank (behind him, parts outward)
    p = PART[i]
    back = cloud_puffs(img, [(18 - p, 236, 22), (46 - p, 226, 18), (8 - p, 214, 12), (206 + p, 236, 22), (178 + p, 226, 18), (216 + p, 214, 12),
                  (30 - p, 258, 26), (194 + p, 258, 26)])
    # shoulders / chest (lower body continues into the cloud bank)
    sh = mask(lambda d: d.polygon([(cx - 70 - ch, 352), (cx - 106 - ch, 290), (cx - 100 - ch, 244 - b // 2), (cx - 60, 200 - b), (cx + 60, 200 - b),
                                    (cx + 100 + ch, 244 - b // 2), (cx + 106 + ch, 290), (cx + 70 + ch, 352)], fill=255))
    legs = mask(lambda d: [d.rounded_rectangle([cx + s * 44 - 15, 270, cx + s * 44 + 15, 352], 8, fill=255) for s in (-1, 1)])
    body = sh | legs
    shade(img, body, ICE, cx - 60, 210, 160, 160, bias=0.16, k=0.5)
    # crystal facets on shoulders (light/dark wedge pairs, upper-left lit)
    fac = ImageDraw.Draw(fi := Image.new('L', (W, H), 0))
    for s in (-1, 1):
        for k, (dx, dy) in enumerate([(56, 246), (70, 276), (40, 300)]):
            x0, y0 = cx + s * dx, dy - b // 2
            fac.polygon([(x0, y0 - 9), (x0 + 6, y0), (x0, y0 + 9), (x0 - 6, y0)], fill=1 + (k % 2))
    fi = np.array(fi)
    img[(fi > 0) & body & (Xg < cx + (Yg % 3) - 1) & (fi == 1)] = C('c6ecfa')
    img[(fi > 0) & body & (Xg >= cx) & (fi == 1)] = C('1e4078')
    img[(fi == 2) & body] = C('7ac2e8')
    # mane: clumped locks radiating from the jaw (not a disc), each lock shaded on its own, back ring first
    r = np.random.RandomState(9); mane = np.zeros((H, W), bool); mcx, mcy = cx, 150 - b
    locks = []
    base = mask(lambda d: d.ellipse([cx - 78, 92 - b, cx + 78, 262 - b], fill=255))
    shade(img, base, MANE, cx - 50, 110 - b, 120, 140, bias=0.08, k=0.5); mane |= base
    for ring, (rad, n, L, wd) in enumerate([(96, 26, 34, 20), (78, 22, 32, 18), (58, 19, 30, 16), (38, 15, 26, 14)]):
        for k in range(n):
            a = math.radians(-60 + 300 * (k + 0.5 * (ring % 2)) / n) + r.uniform(-0.06, 0.06)
            a = a if a < math.pi else a  # sides + bottom only (antlers own the top)
            bx, by = mcx + rad * 0.55 * math.cos(a), mcy + rad * 0.75 * math.sin(a)
            ll = L * r.uniform(0.85, 1.15); tx, ty = bx + ll * math.cos(a) * 1.05, by + ll * math.sin(a) * 1.15 + 6
            nx, ny = -math.sin(a), math.cos(a); hw = wd / 2 * r.uniform(0.85, 1.1)
            locks.append([(bx + nx * hw * 0.7, by + ny * hw * 0.7), ((bx + tx) / 2 + nx * hw, (by + ty) / 2 + ny * hw), (tx, ty),
                          ((bx + tx) / 2 - nx * hw, (by + ty) / 2 - ny * hw), (bx - nx * hw * 0.7, by - ny * hw * 0.7)])
    for poly in locks:
        lm = mask(lambda d: d.polygon(poly, fill=255)) & (Yg < 300 - b)
        xs, ys = Xg[lm], Yg[lm]
        if not lm.any(): continue
        lx, ly = xs.mean(), ys.mean(); glob = -0.18 * (lx - cx) / 90 - 0.1 * (ly - 150) / 120
        shade(img, lm, MANE, lx - 4, ly - 4, 14, 22, bias=glob + 0.1, edge=0.6, k=0.5)
        groove = lm & ~ndi.binary_erosion(lm) & (Xg > lx); img[groove] = C('1e4078')
        mane |= lm
    # ears
    ears = mask(lambda d: [d.polygon([(cx + s * 30, 96 - b), (cx + s * 60, 84 - b), (cx + s * 40, 112 - b)], fill=255) for s in (-1, 1)])
    shade(img, ears, ICE, cx - 30, 90 - b, 50, 30, k=0.5)
    # antlers (main beam + tines), drawn at size
    am = Image.new('L', (W, H), 0); ad = ImageDraw.Draw(am)
    for s in (-1, 1):
        X = lambda x: cx + s * x
        beam = [(X(16), 94 - b), (X(34), 76 - b), (X(58), 62 - b), (X(80), 42 - b), (X(92), 20 - b), (X(96), 6 - b)]
        thick(ad, beam, 11, 5)
        for (bx, by, tx, ty, w) in [(40, 72, 34, 40, 6), (60, 60, 64, 24, 5), (80, 44, 104, 30, 4), (72, 50, 70, 14, 4), (86, 32, 110, 14, 3), (30, 80, 52, 92, 4)]:
            thick(ad, [(X(bx), by - b), (X((bx + tx) / 2 + s * 0 + 0), (by + ty) / 2 - 4 - b), (X(tx), ty - b)], w, 2)
    am = np.array(am) > 0
    shade(img, am, ANT, cx - 80, 20 - b, 160, 90, bias=0.05, k=1.0)
    # head (front view): brow, long muzzle, cheeks
    head = mask(lambda d: (d.ellipse([cx - 38, 80 - b, cx + 38, 146 - b], fill=255),
                            d.polygon([(cx - 34, 120 - b), (cx + 34, 120 - b), (cx + 22, 170 - b), (cx + 13, 182 - b), (cx - 13, 182 - b), (cx - 22, 170 - b)], fill=255)))
    shade(img, head, ICE, cx - 18, 100 - b, 50, 70, bias=0.12, k=0.5)
    # facial planes: brow ridge, muzzle bridge highlight, nose, mouth, eyes (pale, slit), forehead crystal
    def px(x, y, c): 
        if 0 <= x < W and 0 <= y < H: img[y, x] = C(c)
    for x in range(cx - 22, cx + 23): px(x, 118 - b + (abs(x - cx) // 9), '1e4078' if x > cx - 8 else '7ac2e8')
    for y in range(124, 166): px(cx - 3, y - b, 'c6ecfa'); px(cx - 2, y - b, 'c6ecfa' if y % 3 else 'fcf6e8'); px(cx + 4, y - b, '1e4078')
    for s, base in ((-1, '1a1226'), (1, '1a1226')):
        for dx in range(5): px(cx + s * (12 + dx), 112 - b + (dx // 3), base)
        px(cx + s * 13, 111 - b, 'c6ecfa'); px(cx + s * 14, 111 - b, 'fcf6e8')
    for x in range(cx - 9, cx + 10):
        for y in range(166, 174): 
            if abs(x - cx) + (y - 166) * 0.7 < 10: px(x, y - b, '342842')
    px(cx - 5, 168 - b, '1a1226'); px(cx + 5, 168 - b, '1a1226'); px(cx - 6, 167 - b, '7ac2e8')
    for x in range(cx - 7, cx + 8): px(x, 176 - b, '1a1226')
    for (dx, dy, c) in [(0, -4, 'fcf6e8'), (-1, -3, 'fcf6e8'), (1, -3, 'c6ecfa'), (0, -3, 'fcf6e8'), (0, -2, 'c6ecfa'), (-1, -2, 'c6ecfa'), (1, -2, '7ac2e8'), (0, -1, '7ac2e8')]:
        px(cx + dx, 100 - b + dy, c)
    # chin beard strands
    beard = mask(lambda d: d.polygon(spiky(cx, 186 - b, 20, 14, 14, 0.4, 5, 0, math.pi), fill=255)) & (Yg > 176 - b)
    shade(img, beard, MANE, cx - 14, 176 - b, 30, 20, bias=0.1)
    sil = img[..., 3] > 0
    gmask = body | mane | ears | am | head | beard            # the figure itself (no cloud)
    # outline: 1 px outside the figure, but not over the back clouds' interior contact (selective, like battle art)
    ring = ndi.binary_dilation(gmask) & ~gmask
    img[ring] = C(OUTL)
    # sunset rim light from behind (sun upper-right behind him): pixels just inside top/right-facing edges
    e_top = gmask & ~np.roll(gmask, 1, 0); e_r = gmask & ~np.roll(gmask, -1, 1); e_l = gmask & ~np.roll(gmask, 1, 1)
    e_top2 = gmask & np.roll(e_top, 1, 0)
    rim = (e_top | e_r) & (Yg < 300)
    img[rim & (Yg < 140)] = C(RIM1); img[rim & (Yg >= 140)] = C(RIM2)
    img[e_top2 & (Xg > cx) & ((Xg + Yg) % 2 == 0) & (Yg < 240)] = C(RIM3)
    img[e_l & (Yg < 240) & ~rim & ((Yg // 2) % 2 == 0)] = C(RIM3)   # thinner, broken rim on the key-lit side
    img[am & e_top] = C(RIM1)
    return img, gmask

def overlay(i):
    """front cloud bank over his lower body + wisps that part around head/shoulders (draw ABOVE the giant)."""
    img = np.zeros((H, W, 4), 'uint8'); p, bo = PART[i], BOB[i]
    bspec = ([(x, 300 + bo + (7 if (x // 30) % 2 else 0), 30 + (x * 7) % 9) for x in range(-10, 240, 26)] +
                 [(x, 336 + bo, 34) for x in range(0, 240, 30)])
    wspec = ([(10 - p, 176, 9), (24 - p, 180, 11), (38 - p, 184, 7), (214 + p, 168, 9), (200 + p, 172, 11), (188 + p, 177, 7),
                 (4 - 2 * p, 120, 6), (16 - 2 * p, 122, 7), (220 + 2 * p, 128, 7), (208 + 2 * p, 130, 6)])
    bank = cloud_puffs(img, bspec)
    bank &= Yg < H; cloud_puffs(img, wspec)
    # dither skirt along the bank top so the edge breaks up into the figure (solid px checkerboard, no alpha)
    top = bank & ~np.roll(bank, 3, 0)
    skirt = np.roll(top, -3, 0) & ~bank & ((Xg + Yg) % 2 == 0)
    img[skirt] = C('ecdec4')
    return img

G, OV = [], []
for i in range(N):
    g, _ = giant(i); G.append(g); OV.append(overlay(i))
for f in G + OV:
    a = f[..., 3]; assert set(np.unique(a)) <= {0, 255}
    ks = {'%02x%02x%02x' % tuple(c) for c in f[a > 0][:, :3]}; assert ks <= PALS, ks - PALS
    assert not (ks & {'4692ce', '4a70ba', '2c64a8', '30488c', '54444e'}), 'pre-spread colour'
def strip(fr): return np.concatenate(fr, 1)
Image.fromarray(strip(G)).save(f'{OUT}/ondravel_summit_giant_idle.png', optimize=True)
Image.fromarray(strip(OV)).save(f'{OUT}/ondravel_summit_cloud_overlay.png', optimize=True)
def gif(fr, path, bg=(24, 20, 34)):
    o = []
    for f in fr:
        c = np.zeros_like(f); c[..., :3] = bg; c[..., 3] = 255; m = f[..., 3] > 0; c[m] = f[m]; o.append(c)
    F.save_preview(o, path, [MS] * N, 2)
gif(G, f'{OUT}/ondravel_summit_giant_idle_preview.gif'); gif(OV, f'{OUT}/ondravel_summit_cloud_overlay_preview.gif')
both = []
for g, o in zip(G, OV):
    c = g.copy(); m = o[..., 3] > 0; c[m] = o[m]; both.append(c)
gif(both, f'{OUT}/ondravel_summit_combined_preview.gif')

# ---- scoring (reused rule: |dLuma|>=28 vs ToD-graded ground under px, sprite LUT) ----
def pad64(f):
    o = np.zeros((384, 256, 4), 'uint8'); o[:H, :W] = f; return o
sc_g = {bg: score_ow([pad64(f) for f in G], bg)[0] for bg in B['QA_BG']}
sc_o = {bg: score_ow([pad64(f) for f in OV], bg)[0] for bg in B['QA_BG']}
sc_c = {bg: score_ow([pad64(f) for f in both], bg)[0] for bg in B['QA_BG']}

# ---- backdrops ----
mp = json.load(open('/workspace/wt_wellspire/kilumen/art/world/overworld/maps/fin_summit_camp.json'))
r0, c0, R, Cc = 0, 10, 7, 7
bd = np.zeros((R * 64, Cc * 64, 4), 'uint8')
for rr in range(R):
    for cc in range(Cc):
        for L in ('ground', 'decoration', 'overlay'):
            t = mp['layers'][L][r0 + rr][c0 + cc]
            if t and t > 0: bd[rr*64:(rr+1)*64, cc*64:(cc+1)*64] = F.comp(bd[rr*64:(rr+1)*64, cc*64:(cc+1)*64], F.tile(t), 0, 0)
bd[..., 3] = 255
GX, GY = (bd.shape[1] - W) // 2, 0
def score_on(fr, base):
    res = {}
    for ph in PH:
        gb = grade(base, ph, 'tile')[GY:GY+H, GX:GX+W]; ok = tot = 0
        for f in fr:
            g = grade(f, ph, 'sprite'); m = f[..., 3] > 0
            d = np.abs(lum(g[m].astype(float)) - lum(gb[m].astype(float))); ok += int((d >= 28).sum()); tot += d.size
        res[ph] = round(ok / tot, 3)
    return res
sc_bd = dict(giant=score_on(G, bd), overlay=score_on(OV, bd), combined=score_on(both, bd))

def sunset_bg(w, h):
    """preview-only sunset sea-of-clouds (palette bands + dither, dark rock peak). Mood after Gary's ref, nothing copied."""
    o = np.zeros((h, w, 4), 'uint8'); o[..., 3] = 255
    bands = ['3a1e60', '6e222a', '6a3019', '9f4013', 'd46616', 'e29d40', 'fcd668', 'f8eabe']
    yy, xx = np.mgrid[0:h, 0:w]; hz = int(h * 0.55)
    v = np.clip(yy / hz, 0, 1) * (len(bands) - 1) + (BAYER[yy % 4, xx % 4] - 0.5)
    q = np.clip(v.round(), 0, len(bands) - 1).astype(int)
    for k, c in enumerate(bands): o[q == k] = C(c)
    sun = (xx - w * 0.62) ** 2 + (yy - hz + 8) ** 2 < 12 ** 2; o[sun] = C('fcf6e8')
    sea = np.zeros((h, w), bool)
    for x in range(-20, w + 20, 18): sea |= (xx - x) ** 2 + (yy - (hz + 10 + (x * 13) % 11)) ** 2 < (16 + x % 7) ** 2
    cl = np.zeros_like(o); sea = cloud_puffs(cl, [(x, hz + 10 + (x * 13) % 11, 16 + x % 7) for x in range(-20, w + 20, 18)] + [(x, hz + 40 + (x*7) % 9, 26) for x in range(-10, w + 20, 24)] + [(x, h - 20, 40) for x in range(0, w + 40, 40)]); o[sea] = cl[sea]
    rock = (yy > h - 70 + np.abs(xx - w * 0.3) * 0.5 - 6 * np.sin(xx / 7.0))
    o[rock] = C('2c2320'); o[rock & ((xx + yy) % 3 == 0)] = C('462c22')
    redge = rock & ~np.roll(rock, 1, 0); o[redge] = C('d46616'); o[np.roll(redge, 1, 0) & ((xx % 2) == 0)] = C('9f4013')
    return o
SS = sunset_bg(W + 64, H + 40)

# ---- preview.png: 4 ToD over fin_summit_camp + sunset mood panel, frame 0 and frame 3 ----
def compose(base, fi, ph, ox, oy, graded=True):
    c = grade(base, ph, 'tile') if graded else base.copy()
    for lay in (G[fi], OV[fi]):
        g = grade(lay, ph, 'sprite') if graded else lay; m = lay[..., 3] > 0
        sub = c[oy:oy+H, ox:ox+W]; sub[m] = g[m]
    return c
rows = []
for fi in (0, 3):
    panels = [compose(bd, fi, ph, GX, GY)[:H + 40] for ph in PH] + [compose(SS, fi, 'day', 32, 40, graded=False)]
    hh = max(p.shape[0] for p in panels)
    panels = [np.pad(p, ((0, hh - p.shape[0]), (0, 4), (0, 0)), constant_values=0) for p in panels]
    rows.append(np.concatenate(panels, 1))
sheet = np.concatenate(rows, 0); sheet[..., 3] = 255
im = Image.fromarray(sheet).resize((sheet.shape[1] * 2, sheet.shape[0] * 2), Image.NEAREST)   # preview zoom only, not an asset
hd = Image.new('RGBA', (im.width, 22), (20, 18, 26, 255)); d = ImageDraw.Draw(hd); x = 0
for k, ph in enumerate(PH + ['sunset mood']):
    lbl = ph if k == 4 else f"{ph}  night-rule {sc_bd['combined'][ph]:.2f}"
    d.text((x + 6, 5), lbl, fill=(255, 255, 255, 255)); x += (bd.shape[1] + 4) * 2 if k < 4 else 0
full = Image.new('RGBA', (im.width, im.height + 22)); full.paste(hd, (0, 0)); full.paste(im, (0, 22)); full.save(f'{OUT}/preview.png')

def mem(w, h): return dict(rgba_bytes=w * h * 4, rgba_mb=round(w * h * 4 / 1048576, 2), pow2_texture=f'{1 << (w-1).bit_length()}x{1 << (h-1).bit_length()}', pow2_mb=round((1 << (w-1).bit_length()) * (1 << (h-1).bit_length()) * 4 / 1048576, 2))
def js(name, png, layer, notes, sc):
    j = dict(name=name, image=png, frame_width=W, frame_height=H, tile_px=32, tiles=[7, 11], frame_count=N, layout='horizontal strip, frame i at x=i*224',
             ms_per_frame=[MS] * N, loop=True, anchor=dict(x=112, y=351, meaning='bottom-centre of frame; place on the cloud-sea line behind the summit ledge. Giant and overlay share the same anchor and frame index.'),
             layer=layer, palette='art/palette/kilumen.hex + ondravel_anim_v1 RAMP_SPREAD', alpha='0/255 only',
             night_rule='share of opaque px with |dLuma|>=28 vs ToD-graded ground (ondravel_anim_v1 score_ow), sprite LUT',
             scores_ground=sc, scores_on_fin_summit_camp=sc_bd, memory=mem(W * N, H), notes=notes, status='DRAFT - not wired, needs Gary approval')
    json.dump(j, open(f'{OUT}/{name}.json', 'w'), indent=1)
js('ondravel_summit_giant_idle', 'ondravel_summit_giant_idle.png', 'BEHIND overlay, in front of sky/backdrop', 'Includes the rear cloud bank (behind him). Breath: head/antlers/mane lift 0-3 px, chest widens 1 px.', sc_g)
js('ondravel_summit_cloud_overlay', 'ondravel_summit_cloud_overlay.png', 'IN FRONT of the giant (and behind the player/ledge foreground)', 'Front cloud bank over lower body + side wisps that part 0-3 px (upper wisps 0-6 px).', sc_o)
print(json.dumps(dict(giant=sc_g, overlay=sc_o, combined=sc_c, on_camp=sc_bd), indent=0)); print(mem(W * N, H))
