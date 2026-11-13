# Kilumen overworld: EXTRA biome kit (Snow/Frostspire, Swamp/Mirefen, Train station, Flood variants).
# Standalone generator. It imports tools/pixel.py READ-ONLY (palette snap, 4x4 Bayer dither, binary alpha, outline) and
# tools/preview_util.py READ-ONLY (map renderer for previews). It never writes to tools/*.py, run.py, tileset*.json,
# tiles_1x/2x/3x/ or maps/. Outputs:  tiles_extra/{1x,2x,3x}/*.png, tileset_extra*.json, maps_new/*.json, maps_new/previews/.
# All art is original and procedural. Geometry is authored in 128 design units per tile and rasterised at 64 px.
#   python3 tools/biomes_extra.py          -> rebuild everything + checks
#   import biomes_extra; biomes_extra.build(write=False)   -> in-memory registry (TILES / BYNAME), nothing written
import sys, os, json, math, random, collections, numbers, time
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.abspath(os.path.join(HERE, '..'))
if HERE not in sys.path: sys.path.insert(0, HERE)
from pixel import pixelize, PAL, SHADOW          # read-only reuse of the shared finishing pass

T = 64; U = 128; S = T / U
YY, XX = (np.mgrid[0:T, 0:T] + 0.5) / S
PREFIX = 'x_'; ID_BASE = 5000                  # extra ids live in 5001.. so they never clash with tileset.json (1..~900)
COLL = {'walk': 0, 'block': 1, 'ledge_s': 2, 'water': 3, 'door': 4, 'boulder': 5, 'gate': 6, 'plate': 7,
        'bike_only': 8, 'ramp': 9,                            # 0-9 = identical to tileset.json (as of 2026-10-22)
        'ice': 10, 'deep_water': 11}                          # 10-11 are NEW codes (see EXTRA_TILES.md)
WALKABLE = ('walk', 'door', 'plate', 'ice')
OUTLINE_CATS = ('x_deco', 'x_overlay', 'x_interior')
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

# ---------------- design-unit drawing helpers (same conventions as gen_tiles.py, re-implemented here) ----------------
def _sc(v):
    if isinstance(v, numbers.Number): return float(v) * S
    return type(v)(_sc(x) for x in v) if isinstance(v, (list, tuple)) else v
class SD:
    def __init__(s, im): s.d = ImageDraw.Draw(im); s.d.fontmode = '1'
    def __getattr__(s, n):
        f = getattr(s.d, n)
        def g(xy, *a, **kw):
            a = list(a)
            if 'width' in kw: kw['width'] = max(1, round(kw['width'] * S))
            if n == 'rounded_rectangle' and a: a[0] = a[0] * S
            if 'radius' in kw: kw['radius'] = kw['radius'] * S
            if n in ('rectangle', 'rounded_rectangle', 'ellipse', 'pieslice', 'arc', 'chord'):
                fl = list(xy) if len(xy) == 4 and isinstance(xy[0], numbers.Number) else [c for p in xy for c in p]
                xy = [min(fl[0], fl[2]), min(fl[1], fl[3]), max(fl[0], fl[2]), max(fl[1], fl[3])]
            return f(_sc(xy), *a, **kw)
        return g

def pnoise(seed, sigma, size=T):
    r = np.random.default_rng(seed).random((size, size))
    n = gaussian_filter(r, sigma * S, mode='wrap'); return (n - n.min()) / (n.max() - n.min() + 1e-9)
def colorize(n, c1, c2):
    c1 = np.array(c1, float); c2 = np.array(c2, float); return c1 + (c2 - c1) * n[..., None]
def arr2img(a):
    return Image.fromarray(np.clip(a[..., :3], 0, 255).astype('uint8'), 'RGB').convert('RGBA')
def wrapped(base, fn):
    big = Image.new('RGBA', (3 * T, 3 * T))
    for i in range(3):
        for j in range(3): big.paste(base, (i * T, j * T))
    d = SD(big)
    for ox in (0, U, 2 * U):
        for oy in (0, U, 2 * U): fn(d, ox, oy)
    return big.crop((T, T, 2 * T, 2 * T))
def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def blank(w=1, h=1): return Image.new('RGBA', (w * T, h * T), (0, 0, 0, 0))
def pblur(im, r):
    a = np.asarray(im.convert('RGBA'), float); al = a[..., 3:] / 255.0; sg = max(0.01, r * S)
    pm = np.stack([gaussian_filter(a[..., i] * al[..., 0], sg) for i in range(3)], -1); ab = gaussian_filter(al[..., 0], sg)
    rgb = pm / np.maximum(ab[..., None], 1e-6)
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.clip(ab * 255, 0, 255)]).astype('uint8'), 'RGBA')
def shadow(im, box, alpha=80, blur=6):
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(sh).ellipse(box, fill=(20, 18, 30, alpha))
    return Image.alpha_composite(pblur(sh, blur), im)
def lift(c, k): return tuple(max(0, min(255, v + k)) for v in c[:3])
def shade(c, f): return tuple(int(v * f) for v in c[:3])

# ---------------- ground textures ----------------
def grass(seed, tone=0):          # identical recipe to gen_tiles.grass (so snow>grass edges meet base grass seamlessly)
    pal = [((66, 132, 50), (124, 190, 74)), ((40, 96, 52), (84, 148, 72))][tone]
    n = pnoise(seed, 12) * 0.65 + pnoise(seed + 1, 3) * 0.35
    im = arr2img(colorize(n, *pal)); r = random.Random(seed)
    lights = [(150, 206, 92), (138, 198, 84), (170, 214, 110)] if tone == 0 else [(96, 160, 80), (110, 170, 90)]
    darks = [(52, 112, 44), (60, 122, 48)] if tone == 0 else [(30, 74, 42), (36, 84, 46)]
    strokes = [(r.uniform(0, U), r.uniform(0, U), r.uniform(6, 13), r.uniform(-4, 4), r.choice(darks if i % 3 else lights)) for i in range(260)]
    def fn(d, ox, oy):
        for x, y, L, dx, c in strokes: d.line([(x + ox, y + oy), (x + ox + dx, y + oy - L)], fill=c, width=2)
    return wrapped(im, fn)

def path(seed):                    # identical recipe to gen_tiles.path (flooded path sits on the same cobbles)
    n = pnoise(seed, 8)
    im = arr2img(colorize(n, (178, 146, 102), (212, 182, 132))); r = random.Random(seed)
    stones = []
    for gy in range(4):
        for gx in range(4):
            cx = gx * 32 + 16 + (gy % 2) * 16 + r.uniform(-3, 3); cy = gy * 32 + 16 + r.uniform(-3, 3)
            w = r.uniform(12, 15); h = r.uniform(10, 13); c = tuple(max(0, min(255, v + r.randint(-14, 14))) for v in (206, 192, 166))
            stones.append((cx, cy, w, h, c))
    def fn(d, ox, oy):
        for cx, cy, w, h, c in stones:
            d.rounded_rectangle([cx - w + ox + 2, cy - h + oy + 3, cx + w + ox + 2, cy + h + oy + 3], 7, fill=(120, 96, 70))
            d.rounded_rectangle([cx - w + ox, cy - h + oy, cx + w + ox, cy + h + oy], 7, fill=c)
            d.arc([cx - w + ox + 2, cy - h + oy + 1, cx + w + ox - 2, cy + h + oy - 2], 190, 280, fill=(236, 226, 204), width=2)
    return wrapped(im, fn)

def water_frame(f, pal=((40, 108, 156), (78, 170, 196)), hi_k=0.7, hi_c=(214, 240, 248)):
    """Same wave field / noise seed as gen_tiles.water_frame, so extra water tiles animate in phase with base water."""
    ph = f * 2 * np.pi / 4
    w = (np.sin(2 * np.pi * (XX * 2 + YY * 1) / U + ph) + np.sin(2 * np.pi * (XX * -1 + YY * 3) / U - ph)
         + 0.6 * np.sin(2 * np.pi * (XX * 3 - YY * 2) / U + 2 * ph))
    a = colorize(pnoise(77, 14) * 0.6 + 0.4 * (w / 5.2 + 0.5), *pal)
    hi = smooth(1.55, 1.95, w)[..., None]
    a = a * (1 - hi * hi_k) + hi * hi_k * np.array(hi_c)
    return a, w

_B4T = np.tile((np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0, (T // 4, T // 4))
def ramp_dither(v, hexes):
    """v in [0,1] -> ordered-dithered pick from an exact palette ramp (keeps snow off the grey/lilac entries)."""
    cols = np.array([H(h) for h in hexes], float); k = len(hexes) - 1
    p = np.clip(v, 0, 1) * k; i = np.minimum(np.floor(p).astype(int), k - 1); f = p - i
    idx = i + (f > _B4T)
    return cols[idx]
SNOW_RAMP = ('4692ce', '7ac2e8', 'c6ecfa', 'fcf6e8')
def snow(seed):
    n = pnoise(seed, 12) * 0.7 + pnoise(seed + 1, 4) * 0.3
    v = 0.62 + 0.38 * smooth(0.2, 0.8, n)                                          # mostly cream-white, ice-blue hollows
    rip = 0.5 + 0.5 * np.sin(2 * np.pi * (XX * 1 + YY * 2) / U + pnoise(seed + 2, 14) * 5)
    v = v - 0.22 * smooth(0.9, 0.97, rip)                                          # thin wind ripples
    im = arr2img(ramp_dither(v, SNOW_RAMP)); r = random.Random(seed)
    sp = [(r.uniform(0, U), r.uniform(0, U), r.random() < 0.35) for _ in range(10)]
    def fn(d, ox, oy):
        for x, y, blue in sp:
            if blue: d.rectangle([x + ox, y + oy + 2, x + ox + 2, y + oy + 4], fill=H('7ac2e8')); d.rectangle([x + ox, y + oy, x + ox + 2, y + oy + 2], fill=H('fcf6e8'))
            else: d.rectangle([x + ox, y + oy, x + ox + 2, y + oy + 2], fill=H('c6ecfa'))
    return wrapped(im, fn)

def ice(seed):
    n = pnoise(seed, 14)
    a = colorize(n, (122, 190, 230), (196, 234, 250))
    streak = 0.5 + 0.5 * np.sin(2 * np.pi * (XX * 1 - YY * 1) / U * 2 + pnoise(seed + 4, 16) * 2)
    a = a * (1 - (smooth(0.9, 0.97, streak) * 0.9)[..., None]) + (smooth(0.9, 0.97, streak) * 0.9)[..., None] * np.array((252, 252, 250))
    im = arr2img(a); r = random.Random(seed)
    cracks = []
    for _ in range(3):
        c = [(r.uniform(0, U), r.uniform(0, U))]
        for _ in range(4): c.append((c[-1][0] + r.uniform(-16, 16), c[-1][1] + r.uniform(-16, 16)))
        cracks.append(c)
    def fn(d, ox, oy):
        for c in cracks:
            d.line([(x + ox, y + oy + 2) for x, y in c], fill=(198, 236, 250), width=2)
            d.line([(x + ox, y + oy) for x, y in c], fill=(70, 146, 206), width=2)
    return wrapped(im, fn)

def mud(seed):
    n = pnoise(seed, 7) * 0.7 + pnoise(seed + 1, 2) * 0.3
    a = colorize(n, (78, 52, 38), (126, 92, 64))
    wet = smooth(0.66, 0.74, pnoise(seed + 5, 11))[..., None]
    a = a * (1 - wet * 0.8) + wet * 0.8 * colorize(pnoise(seed + 9, 4), (56, 36, 30), (80, 56, 44))
    im = arr2img(a); r = random.Random(seed)
    peb = [(r.uniform(0, U), r.uniform(0, U), r.uniform(2, 4)) for _ in range(14)]
    tufts = [(r.uniform(0, U), r.uniform(0, U)) for _ in range(6)]
    def fn(d, ox, oy):
        for x, y, s in peb:
            d.ellipse([x + ox, y + oy + 1, x + ox + s * 2, y + oy + s + 1], fill=(56, 36, 30)); d.ellipse([x + ox, y + oy, x + ox + s * 2, y + oy + s], fill=(150, 112, 80))
        for x, y in tufts:
            for k in (-3, 0, 3): d.line([(x + ox, y + oy), (x + ox + k, y + oy - 8)], fill=(84, 134, 78), width=2)
    return wrapped(im, fn)

def moss(seed):
    n = pnoise(seed, 11) * 0.65 + pnoise(seed + 1, 3) * 0.35
    im = arr2img(colorize(n, (40, 82, 50), (86, 130, 74))); r = random.Random(seed)
    cols = [(56, 104, 62), (36, 78, 52), (84, 134, 78), (120, 150, 80)]
    strokes = [(r.uniform(0, U), r.uniform(0, U), r.uniform(5, 10), r.uniform(-3, 3), r.choice(cols)) for _ in range(200)]
    dots = [(r.uniform(0, U), r.uniform(0, U)) for _ in range(5)]
    def fn(d, ox, oy):
        for x, y, L, dx, c in strokes: d.line([(x + ox, y + oy), (x + ox + dx, y + oy - L)], fill=c, width=2)
        for x, y in dots: d.rectangle([x + ox, y + oy, x + ox + 2, y + oy + 2], fill=(204, 170, 110))
    return wrapped(im, fn)

def bog_frame(f):
    """Murky peat water: 3-frame slow swell, algae scum, static duckweed and lily pads."""
    ph = f * 2 * np.pi / 3
    w = np.sin(2 * np.pi * (XX * 1 + YY * 2) / U + ph) + np.sin(2 * np.pi * (XX * -2 + YY * 1) / U - ph) + 0.5 * np.sin(2 * np.pi * (XX * 3 + YY * -1) / U + ph)
    a = colorize(pnoise(91, 13) * 0.6 + 0.4 * (w / 5 + 0.5), (30, 44, 52), (52, 84, 80))
    hi = smooth(1.5, 1.9, w)[..., None]
    a = a * (1 - hi * 0.55) + hi * 0.55 * np.array((100, 140, 120))
    im = arr2img(a); r = random.Random(92)
    weed = [(r.uniform(0, U), r.uniform(0, U), r.random() < 0.25) for _ in range(9)]
    pads = [(r.uniform(20, U - 20), r.uniform(20, U - 20)) for _ in range(1)]
    def fn(d, ox, oy):
        for x, y, lt in weed: d.rectangle([x + ox, y + oy, x + ox + 3, y + oy + 2], fill=(120, 186, 72) if lt else (84, 134, 78))
        for x, y in pads:
            d.ellipse([x + ox - 9, y + oy - 6 + 2, x + ox + 9, y + oy + 6 + 2], fill=(24, 56, 44))
            d.pieslice([x + ox - 9, y + oy - 6, x + ox + 9, y + oy + 6], 30, 330, fill=(84, 134, 78))
            d.line([(x + ox - 6, y + oy - 2), (x + ox, y + oy - 4)], fill=(120, 186, 72), width=2)
    return wrapped(im, fn)

def deep_frame(f):
    a, w = water_frame(f, pal=((26, 50, 104), (46, 92, 156)), hi_k=0.45, hi_c=(122, 194, 232))
    dk = smooth(0.55, 0.8, pnoise(78, 18))[..., None] * 0.35                      # darker trenches
    return arr2img(a * (1 - dk) + dk * np.array((26, 18, 38)))
def water_img(f): return arr2img(water_frame(f)[0])
def flood_frame(f):
    a, w = water_frame(f)
    p = np.asarray(path(100 + sum(map(ord, 'path'))), float)[..., :3]
    lum = p.mean(-1, keepdims=True); lum = (lum - lum.min()) / (np.ptp(lum) + 1e-9)
    o = a * (0.62 + 0.62 * lum) + 18                                              # shallow water tinted by the cobbles below (stays blue)
    hi = smooth(1.4, 1.9, w)[..., None]; o = o * (1 - hi * 0.6) + hi * 0.6 * np.array((214, 240, 248))
    return arr2img(o)

# ---------------- autotile transitions (B over A), same naming as tileset.json ----------------
def wob(u): return 3 * np.sin(2 * np.pi * u * 2 / U) + 2 * np.sin(2 * np.pi * u * 3 / U)
def dist_field(sides, diags):
    N, E, S_, W = sides; NE, SE, SW, NW = diags
    d = np.full((T, T), 999.0)
    if N: d = np.minimum(d, YY + wob(XX))
    if E: d = np.minimum(d, U - XX + wob(YY))
    if S_: d = np.minimum(d, U - YY + wob(XX))
    if W: d = np.minimum(d, XX + wob(YY))
    R = 34
    for on, cx, cy in ((N and W, 0, 0), (N and E, U, 0), (S_ and E, U, U), (S_ and W, 0, U)):
        if on:
            px = np.abs(XX - cx); py = np.abs(YY - cy); m = (px < R) & (py < R)
            d = np.where(m, np.minimum(d, R - np.hypot(R - px, R - py)), d)
    for on, blk, cx, cy in ((NE, N or E, U, 0), (SE, S_ or E, U, U), (SW, S_ or W, 0, U), (NW, N or W, 0, 0)):
        if on and not blk: d = np.minimum(d, np.hypot(XX - cx, YY - cy))
    return d

def transition(Bimg, Aimg, sides, diags, kind):
    d = dist_field(sides, diags) + (pnoise(3, 3) - 0.5) * 6
    A = np.array(Aimg, float)[..., :3]; B = np.array(Bimg, float)[..., :3]
    if kind == 'shore':          # bog water over land: dark peat bank, wet band, algae scum line
        bank = smooth(2, 9, d)[..., None]; wat = smooth(15, 20, d)[..., None]
        out = A * (1 - bank) + np.array((70, 48, 38)) * bank
        out = out * (1 - wat) + B * wat
        scum = np.exp(-((d - 19.5) / 2.0) ** 2)[..., None] * 0.7
        return arr2img(out * (1 - scum) + scum * np.array((140, 190, 96)))
    if kind == 'water':          # copy of the base 'water' edge recipe (sandy bank, wet band, white foam)
        bank = smooth(2, 9, d)[..., None]; wat = smooth(16, 22, d)[..., None]
        out = A * (1 - bank) + np.array((214, 190, 140)) * bank
        wet = (smooth(8, 12, d) * (1 - smooth(16, 22, d)))[..., None] * 0.45; out = out * (1 - wet) + wet * np.array((150, 120, 86))
        out = out * (1 - wat) + B * wat
        foam = np.exp(-((d - 21) / 2.2) ** 2)[..., None] * 0.75; return arr2img(out * (1 - foam) + foam * np.array((255, 255, 255)))
    if kind == 'flood':          # shallow water creeping over cobbles: foam rim
        wat = smooth(8, 14, d)[..., None]; out = A * (1 - wat) + B * wat
        foam = np.exp(-((d - 11) / 1.8) ** 2)[..., None] * 0.7
        return arr2img(out * (1 - foam) + foam * np.array((226, 244, 250)))
    if kind == 'deep':           # deep channel inside normal water: soft dark drop-off
        a = smooth(10, 26, d)[..., None]; return arr2img(A * (1 - a) + B * a)
    if kind == 'ice':            # ice sheet set into snow: crisp snow lip with a blue undercut
        a = (d > 12)[..., None].astype(float); out = A * (1 - a) + B * a
        lip = ((d > 12) & (d < 16))[..., None] * 0.75; out = out * (1 - lip) + lip * np.array((70, 146, 206))
        hl = ((d > 8) & (d <= 12))[..., None] * 0.6; return arr2img(out * (1 - hl) + hl * np.array((255, 255, 255)))
    if kind == 'snow':           # snow drift over grass: crisp drift edge + blue drift shadow
        a = smooth(8, 11, d)[..., None]; out = A * (1 - a) + B * a
        sh = (np.exp(-((d - 12) / 2.2) ** 2) * (d > 10))[..., None] * 0.5; out = out * (1 - sh) + sh * np.array((150, 196, 230))
        rim = np.exp(-((d - 6) / 2.5) ** 2)[..., None] * 0.3; return arr2img(out * (1 - rim))
    a = smooth(6, 16, d)[..., None]; out = A * (1 - a) + B * a                         # 'soft' (same as base)
    rim = np.exp(-((d - 8) / 3.5) ** 2)[..., None] * 0.28
    return arr2img(out * (1 - rim))

# ---------------- tall grass (encounter) port of tallgrass.py with per-biome palettes ----------------
TG_PAL = {
 'snow':  dict(OUT='18382c', BED='244e34', BED2='18382c', DARK='246e6c', MID='3e9c92', LIGHT='70cab8', TIP='c6ecfa', TIP2='fcf6e8', GLINT='d6acff'),
 'swamp': dict(OUT='18382c', BED='24522e', BED2='18382c', DARK='367634', MID='54864e', LIGHT='78ba48', TIP='a6d460', TIP2='ccaa6e', GLINT='b076ec'),
}
TGT = 64; TOP = 16; CW, CH = TGT, TGT + TOP + TGT
BACK = (1, 22, 43); FRONT = (11, 32, 54); BACK_B, FRONT_B = TOP + 33, TOP + 61
def _dil(m):
    p = np.pad(m, 1); return m | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
def _blade(cx, base, h, lean, w=5):
    m = Image.new('L', (CW, CH), 0); d = ImageDraw.Draw(m); hw = w / 2
    d.polygon([(cx - hw, base), (cx + hw, base), (cx + lean * 0.45 + 1.2, base - h * 0.55), (cx + lean, base - h), (cx + lean * 0.45 - 1.2, base - h * 0.55)], fill=255)
    return np.array(m) > 0
_YYc, _XXc = np.mgrid[0:CH, 0:CW]
def _clump(arr, P, style, cx, base, H0, frame, seed, ox, glint):
    r = random.Random(seed); blades = []
    for i in (0, 4, 1, 3, 2):
        k = i - 2; h = H0 - abs(k) * 5 + r.randint(-2, 2); lean = k * 2.6 + r.uniform(-0.8, 0.8)
        if frame == 1: h -= 7; lean *= 2.2
        elif frame == 2: lean += 5 * (h / H0)
        elif frame == 3: lean -= 3 * (h / H0)
        blades.append((i, cx + k * 3, h, lean))
    yy, xx = _YYc, _XXc
    arr[(((xx - cx - ox) / 7) ** 2 + ((yy - base) / 1.6) ** 2) <= 1] = P['OUT']
    cat = style == 'swamp' and seed % 2 == 0
    for i, bx, h, lean in blades:
        m = _blade(bx + ox, base, h, lean)
        arr[_dil(m) & (yy <= base)] = P['OUT']
        arr[m] = P['MID'] if i in (1, 2, 3) else P['DARK']
        lft = m & ~np.roll(m, 1, axis=1); rgt = m & ~np.roll(m, -1, axis=1)
        arr[lft & (yy > base - h * 0.75)] = P['LIGHT'] if i != 0 else P['MID']
        arr[rgt & ~lft] = P['DARK']
        arr[m & (yy < base - h * 0.62)] = P['TIP']; arr[m & (yy < base - h * 0.84)] = P['TIP2']
        tx = int(round(bx + ox + lean)); ty = int(round(base - h))
        if style == 'snow' and i in (1, 2, 3):          # frost cap: a white lump with an outline on top of the tip
            for dy, dx0, dx1 in ((-1, -1, 1), (0, -2, 2), (1, -1, 1)):
                for dx in range(dx0, dx1 + 1):
                    if 0 <= ty + dy < CH and 0 <= tx + dx < CW: arr[ty + dy, tx + dx] = P['TIP2']
            for dx in range(-2, 3):
                if 0 <= ty - 2 < CH and 0 <= tx + dx < CW and abs(dx) < 2: arr[ty - 2, tx + dx] = P['OUT']
        if cat and i == 2:                                # swamp: cattail seed head on the centre blade
            for dy in range(2, 9):
                for dx in (-1, 0, 1):
                    yy0, xx0 = ty + dy, int(round(bx + ox + lean * (1 - dy / h))) + dx
                    if 0 <= yy0 < CH and 0 <= xx0 < CW: arr[yy0, xx0] = H('6a442e' if dx > -1 else '92623e') + (255,)
        if glint and i == 2 and 0 <= ty + 2 < CH and 0 <= tx < CW: arr[ty + 1, tx] = P['GLINT']; arr[ty + 2, tx] = P['GLINT']

def _bed(arr, P, style, n, e, s, w):
    y0 = TOP + (12 if n else 0); y1 = TOP + (59 if s else 63); x0 = 3 if w else 0; x1 = 60 if e else 63
    m = np.zeros((CH, CW), bool); m[y0:y1 + 1, x0:x1 + 1] = True
    for (cy, cx, ok) in ((y0, x0, n and w), (y0, x1, n and e), (y1, x0, s and w), (y1, x1, s and e)):
        if ok:
            for dy in range(3):
                for dx in range(3 - dy): m[cy + (dy if cy == y0 else -dy), cx + (dx if cx == x0 else -dx)] = False
    yy, xx = _YYc, _XXc
    dith = ((xx * 3 + yy * 5) % 8 == 0)
    arr[m] = P['BED']; arr[m & dith] = P['BED2']
    arr[(_dil(m) & ~m) & (yy >= TOP)] = P['OUT']
    if s:
        band = (yy >= y1 + 1) & (yy <= TOP + 63) & (xx >= x0) & (xx <= x1)
        arr[band & ((xx + yy) % 2 == 0)] = P['OUT']; arr[(yy == y1 + 1) & (xx >= x0) & (xx <= x1)] = P['OUT']
        arr[band & ((xx + yy) % 2 == 1)] = SHADOW

def tg_render(style, n, e, s, w, frame, part='body', v=0):
    P = {k: H(c) + (255,) for k, c in TG_PAL[style].items()}
    arr = np.zeros((CH, CW, 4), np.uint8)
    if part == 'body': _bed(arr, P, style, n, e, s, w)
    rows = []
    if part in ('body', 'tips'): rows.append((BACK, BACK_B, 42, 100))
    if part in ('body', 'front'): rows.append((FRONT, FRONT_B, 38, 200))
    for xs, base, H0, sd in rows:
        for vv, off, on in ((v, 0, True), (1 - v, TGT, not e), (1 - v, -TGT, not w)):
            if not on: continue
            xl = list(xs) + ([TGT - 9] if (off == 0 and e and xs[-1] < TGT - 14) else [])
            for j, cx in enumerate(xl):
                if off == 0:
                    if w and cx < 9: cx = 9
                    if e and cx > TGT - 10: cx = TGT - 10
                elif abs(cx + off - TGT / 2) > TGT / 2 + 14: continue
                hh = H0 + (3 if (vv + j) % 2 else -2)
                _clump(arr, P, style, cx, base, hh, frame, sd * 7 + j * 3 + vv * 50, off, glint=(sd == 200 and j == 1 and vv == 0))
    if part in ('body', 'front') and not s:
        for vv, off, on in ((1 - v, 0, True), (v, TGT, not e), (v, -TGT, not w)):
            if not on: continue
            for j, cx in enumerate(list(BACK) + ([TGT - 9] if (off == 0 and e) else [])):
                if off == 0:
                    if w and cx < 9: cx = 9
                    if e and cx > TGT - 10: cx = TGT - 10
                elif abs(cx + off - TGT / 2) > TGT / 2 + 14: continue
                _clump(arr, P, style, cx, BACK_B + TGT, 42 + (3 if (vv + j) % 2 else -2), frame, 100 * 7 + j * 3 + vv * 50, off, glint=False)
    im = Image.fromarray(arr, 'RGBA')
    if part == 'tips':
        t = Image.new('RGBA', (T, T), (0, 0, 0, 0)); t.paste(im.crop((0, 0, T, TOP)), (0, T - TOP)); return t
    return im.crop((0, TOP, T, TOP + T))

def tg_variants(style):
    for v in (0, 1):
        for k in range(16):
            n, e, s, w = (k >> 3) & 1, (k >> 2) & 1, (k >> 1) & 1, k & 1; tag = f'{n}{e}{s}{w}_v{v}'
            yield f'tall_{style}_{tag}', [tg_render(style, n, e, s, w, f, 'body', v) for f in range(4)], 'body'
            yield f'tall_{style}_front_{tag}', [tg_render(style, n, e, s, w, f, 'front', v) for f in range(4)], 'front'
        for k in range(4):
            e, w = (k >> 1) & 1, k & 1
            yield f'tall_{style}_tips_{e}{w}_v{v}', [tg_render(style, 1, e, 0, w, f, 'tips', v) for f in range(4)], 'tips'

# ---------------- fog overlay (clearable) ----------------
FOG_A, FOG_B = H('f4e2ff') + (255,), H('ccc6c2') + (255,)
_B4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0
def _streak(seed, sy, sx, size):
    n = gaussian_filter(np.random.default_rng(seed).random((size, size)), (sy, sx), mode='wrap'); return (n - n.min()) / (n.max() - n.min() + 1e-9)
_FOGN = _streak(611, T * 0.10, T * 0.30, 2 * T) * 0.7 + _streak(612, T * 0.05, T * 0.16, 2 * T) * 0.3   # horizontal wisps, 2x2-tile period
def fog_tile(n, e, s, w, frame, qx, qy):
    big = np.roll(_FOGN, frame * 6, axis=1)                                 # slow eastward drift (periodic roll = seamless)
    nz = big[qy * T:(qy + 1) * T, qx * T:(qx + 1) * T]
    dens = 0.03 + 0.6 * smooth(0.45, 0.8, nz)                              # wisps, not a wall
    fade = np.ones((T, T)); yy, xx = np.mgrid[0:T, 0:T] + 0.5
    for on, dd in ((n, yy), (e, T - xx), (s, T - yy), (w, xx)):
        if on: fade = np.minimum(fade, smooth(0, 30, dd))
    dens = dens * fade
    th = np.tile(_B4, (T // 4, T // 4))
    on_px = dens > th; light = nz > 0.6
    arr = np.zeros((T, T, 4), np.uint8)
    arr[on_px & light] = FOG_A; arr[on_px & ~light] = FOG_B
    return Image.fromarray(arr, 'RGBA')

# ---------------- snow props ----------------
def snowy_pine(w=2, h=2, seed=31):
    """w x h tile snowy pine: tiered dark boughs, snow loaded on every tier, trunk + soft shadow. Top row = overlay."""
    im = blank(w, h); Wd, Hd = w * U, h * U; cx = Wd / 2
    im = shadow(im, [cx - Wd * 0.42, Hd - 34, cx + Wd * 0.42, Hd - 4], 95, 7); d = SD(im); r = random.Random(seed)
    d.rectangle([cx - 9, Hd - 58, cx + 9, Hd - 14], fill=(90, 58, 40)); d.line([(cx - 4, Hd - 56), (cx - 4, Hd - 16)], fill=(130, 90, 60), width=4)
    tiers = 5 if h >= 2 else 3; top = 8; bot = Hd - 50
    for k in range(tiers):
        t0 = top + (bot - top) * k / tiers * 0.92; t1 = top + (bot - top) * (k + 1.25) / tiers
        half = (Wd * 0.46) * (k + 1.6) / (tiers + 0.6)
        pts = [(cx, t0)]
        n = 6
        for i in range(n + 1):
            x = cx - half + 2 * half * i / n; y = t1 - (6 if i % 2 else 0) + r.uniform(-2, 2); pts.append((x, y)) if i == 0 else None
        poly = [(cx, t0), (cx + half, t1)] + [(cx + half - 2 * half * i / n, t1 - (7 if i % 2 else 0)) for i in range(1, n)] + [(cx - half, t1)]
        d.polygon(poly, fill=(24, 56, 44))
        inner = [(cx, t0 + 6), (cx + half - 8, t1 - 6), (cx - half + 8, t1 - 6)]
        d.polygon(inner, fill=(36, 78, 52))
        d.polygon([(cx - 2, t0 + 10), (cx - half * 0.55, t1 - 10), (cx - half * 0.15, t1 - 12)], fill=(56, 104, 62))
        # snow load: a lumpy white cap on the upper half of the tier, blue underside
        sh = (t1 - t0) * 0.55
        cap = [(cx, t0 - 2), (cx + half * 0.62, t0 + sh)] + [(cx + half * 0.62 - half * 1.24 * i / 5, t0 + sh + (5 if i % 2 else -1)) for i in range(1, 5)] + [(cx - half * 0.62, t0 + sh)]
        d.polygon([(x, y + 4) for x, y in cap], fill=(122, 194, 232))
        d.polygon(cap, fill=(240, 246, 250))
        d.line([(cx - 2, t0 + 2), (cx - half * 0.45, t0 + sh - 4)], fill=(255, 255, 255), width=3)
    return im

def frozen_rock(big=False):
    im = blank(); im = shadow(im, [14, 96, 114, 124], 90, 5); d = SD(im)
    if big: body = [(14, 112), (8, 76), (26, 40), (60, 26), (96, 34), (118, 70), (114, 112)]
    else: body = [(24, 112), (20, 86), (36, 62), (66, 54), (96, 64), (108, 92), (104, 112)]
    d.polygon(body, fill=(94, 88, 102)); d.polygon([(x * 0.85 + 6, y * 0.9 + 6) for x, y in body[:5]], fill=(130, 122, 132))
    d.line([(body[2][0] + 8, body[2][1] + 14), (body[3][0], body[3][1] + 28)], fill=(62, 58, 72), width=3)
    top = body[1:-1]
    cap = [(x, y - 3) for x, y in top] + [(x + 4, y + (16 if big else 12)) for x, y in reversed(top)]
    d.polygon([(x, y + 3) for x, y in cap], fill=(122, 194, 232)); d.polygon(cap, fill=(244, 248, 252))
    for x in ((40, 64, 88) if big else (46, 70, 90)):              # icicles under the cap
        y = (60 if big else 72); d.polygon([(x - 4, y), (x + 4, y), (x, y + 14)], fill=(198, 236, 250))
    return im

# ---------------- swamp props ----------------
def reeds(in_water=False, seed=5):
    im = blank(); r = random.Random(seed + in_water)
    if not in_water: im = shadow(im, [18, 104, 110, 124], 80, 5)
    d = SD(im)
    if in_water:
        d.ellipse([18, 100, 110, 122], outline=(112, 170, 140), width=3)
    base = 112
    stems = sorted([(r.uniform(28, 100), r.uniform(-12, 12), r.uniform(56, 92)) for _ in range(9 if not in_water else 7)], key=lambda s: s[2])
    for x, lean, h in stems:
        d.line([(x, base), (x + lean * 0.5, base - h * 0.6), (x + lean, base - h)], fill=(54, 118, 52), width=5)
        d.line([(x - 1, base), (x - 1 + lean * 0.5, base - h * 0.6)], fill=(120, 186, 72), width=2)
        if h > 70: d.rounded_rectangle([x + lean * 0.9 - 4, base - h + 6, x + lean * 0.9 + 4, base - h + 26], 4, fill=(106, 68, 46))
    for x, lean in ((34, -22), (92, 20)):
        d.polygon([(x, base), (x + 4, base), (x + lean, base - 40)], fill=(84, 134, 78))
    return im

def boardwalk(orient, narrow=False):
    im = blank(); d = SD(im)
    if orient == 'h':
        y0, y1 = (36, 92) if narrow else (14, 116)
        for x in (10, 74): d.rectangle([x, y1 - 6, x + 12, y1 + 12], fill=(70, 44, 34))
        d.rectangle([0, y0, U, y1], fill=(70, 44, 34))
        step = 16
        for i, x in enumerate(range(0, U, step)):
            c = (146, 98, 62) if i % 2 else (166, 116, 74)
            d.rectangle([x + 1, y0 + 3, x + step - 2, y1 - 5], fill=c); d.line([(x + 3, y0 + 5), (x + 3, y1 - 8)], fill=(186, 136, 86), width=2)
            if i % 3 == 1: d.rectangle([x + 6, y0 + 12, x + 8, y0 + 14], fill=(62, 58, 72)); d.rectangle([x + 6, y1 - 16, x + 8, y1 - 14], fill=(62, 58, 72))
        if not narrow:
            for y in (y0 + 24, y1 - 30): d.line([(0, y), (U, y)], fill=(106, 68, 46), width=2)
    else:
        x0, x1 = (36, 92) if narrow else (14, 114)
        d.rectangle([x0, 0, x1, U], fill=(70, 44, 34))
        for i, y in enumerate(range(0, U, 16)):
            c = (146, 98, 62) if i % 2 else (166, 116, 74)
            d.rectangle([x0 + 4, y + 1, x1 - 4, y + 13], fill=c); d.line([(x0 + 6, y + 3), (x1 - 6, y + 3)], fill=(186, 136, 86), width=2)
            if i % 3 == 1: d.rectangle([x0 + 10, y + 6, x0 + 12, y + 8], fill=(62, 58, 72)); d.rectangle([x1 - 12, y + 6, x1 - 10, y + 8], fill=(62, 58, 72))
    return im

def dead_tree(seed=44):
    """1x2: bare silver-grey snag with hanging moss. Top tile = overlay, bottom = block."""
    im = blank(1, 2); im = shadow(im, [10, 218, 118, 250], 90, 7); d = SD(im); r = random.Random(seed)
    trunk = [(50, 246), (78, 246), (74, 170), (70, 120), (58, 120), (54, 170)]
    d.polygon(trunk, fill=(94, 88, 102)); d.line([(58, 244), (60, 124)], fill=(130, 122, 132), width=4); d.line([(72, 240), (70, 126)], fill=(62, 58, 72), width=3)
    for x0, y0, x1, y1 in ((48, 246, 30, 252), (80, 246, 100, 252)): d.line([(x0, y0), (x1, y1)], fill=(94, 88, 102), width=8)
    def branch(x, y, ang, L, wdt, depth):
        x2 = x + math.cos(ang) * L; y2 = y - math.sin(ang) * L
        d.line([(x, y), (x2, y2)], fill=(94, 88, 102), width=wdt); d.line([(x - 1, y), (x2 - 1, y2)], fill=(130, 122, 132), width=max(1, wdt // 3))
        if depth:
            for da in (-0.5, 0.45): branch(x2, y2, ang + da + r.uniform(-0.15, 0.15), L * 0.68, max(2, wdt - 3), depth - 1)
        elif r.random() < 0.6:
            for k in range(3): d.line([(x2 + k * 3 - 3, y2), (x2 + k * 3 - 3, y2 + r.uniform(8, 18))], fill=(84, 134, 78), width=2)
    branch(64, 124, 1.25, 46, 10, 2); branch(64, 150, 2.5, 40, 8, 2); branch(66, 140, 0.45, 38, 8, 2); branch(62, 118, 1.9, 40, 8, 2)
    return im

# ---------------- train station: exterior building ----------------
def brick_fill(d, box, base, mortar, seed=1):
    x0, y0, x1, y1 = box; r = random.Random(seed); d.rectangle(box, fill=mortar)
    for i, y in enumerate(range(int(y0), int(y1), 12)):
        off = 0 if i % 2 else 12
        for x in range(int(x0) - off, int(x1), 24):
            c = lift(base, r.randint(-16, 10)); d.rectangle([max(x0, x + 1), y + 1, min(x1, x + 22), min(y1, y + 10)], fill=c)

def station_building():
    """7x5 Revival-era rail station, front-facing 3/4 view. Door = bottom-centre cell (3,4)."""
    w, h = 7, 5; Wd, Hd = w * U, h * U; im = blank(w, h); d = SD(im)
    wall_top = Hd - 2.25 * U; eave = wall_top + 4
    roof = (78, 84, 108); roof_d = (52, 56, 76); roof_l = (110, 118, 140)
    # main hipped roof with shingle rows
    d.polygon([(40, eave), (110, 70), (Wd - 110, 70), (Wd - 40, eave)], fill=roof)
    for i, y in enumerate(range(78, int(eave), 14)):
        t = (y - 70) / (eave - 70); xl = 110 - 70 * t; xr = Wd - 110 + 70 * t
        d.line([(xl, y), (xr, y)], fill=roof_d, width=3)
        for x in range(int(xl) + (i % 2) * 10, int(xr), 20): d.line([(x, y), (x, y + 12)], fill=roof_d, width=2)
        d.line([(xl + 2, y + 3), (xr - 2, y + 3)], fill=lift(roof, 8 if i % 2 else -4), width=2)
    d.polygon([(110, 70), (Wd - 110, 70), (Wd - 104, 78), (104, 78)], fill=roof_l)
    # ridge cresting (iron) and two chimneys
    for x in range(130, Wd - 120, 22): d.polygon([(x, 70), (x + 6, 56), (x + 12, 70)], fill=(52, 40, 66))
    for x in (170, Wd - 200): d.rectangle([x, 30, x + 30, 90], fill=(140, 70, 50)); d.rectangle([x - 4, 26, x + 34, 36], fill=(110, 56, 44)); brick_fill(d, [x + 2, 38, x + 28, 88], (162, 74, 54), (110, 56, 44), x)
    # central clock gable (cream) with a crystal finial
    gx = Wd / 2
    d.polygon([(gx - 150, eave + 2), (gx, 40), (gx + 150, eave + 2)], fill=(70, 44, 34))
    d.polygon([(gx - 136, eave), (gx, 54), (gx + 136, eave)], fill=(236, 222, 196))
    for i, y in enumerate(range(70, int(eave), 24)):
        hw = 136 * (y - 54) / (eave - 54); d.line([(gx - hw, y), (gx + hw, y)], fill=(214, 198, 170), width=2)
    d.ellipse([gx - 52, 120, gx + 52, 224], fill=(70, 44, 34)); d.ellipse([gx - 44, 128, gx + 44, 216], fill=(252, 246, 232))
    for k in range(12):
        a = k * math.pi / 6; d.line([(gx + math.cos(a) * 34, 172 + math.sin(a) * 34), (gx + math.cos(a) * 40, 172 + math.sin(a) * 40)], fill=(52, 40, 66), width=4)
    d.line([(gx, 172), (gx, 140)], fill=(52, 40, 66), width=5); d.line([(gx, 172), (gx + 22, 182)], fill=(52, 40, 66), width=5)
    d.ellipse([gx - 6, 166, gx + 6, 178], fill=(138, 74, 206))
    d.polygon([(gx, 4), (gx + 14, 26), (gx, 52), (gx - 14, 26)], fill=(138, 74, 206)); d.polygon([(gx, 8), (gx + 6, 26), (gx, 40)], fill=(214, 172, 255))
    d.line([(gx - 150, eave + 4), (gx, 38), (gx + 150, eave + 4)], fill=(52, 40, 66), width=4)
    # eave + shadow
    d.rectangle([28, eave - 2, Wd - 28, eave + 14], fill=(236, 222, 196)); d.rectangle([28, eave + 14, Wd - 28, eave + 20], fill=(106, 68, 46))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(sh).rectangle([44, eave + 20, Wd - 44, eave + 40], fill=(20, 18, 30, 90)); im = Image.alpha_composite(im, pblur(sh, 4)); d = SD(im)
    # brick walls with stone pilasters and plinth
    wt = eave + 20
    brick_fill(d, [44, wt, Wd - 44, Hd - 20], (170, 72, 52), (120, 92, 80), 7)
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(sh).rectangle([44, wt, Wd - 44, wt + 18], fill=(20, 18, 30, 80)); im = Image.alpha_composite(im, sh); d = SD(im)
    for x in (44, 220, Wd - 248, Wd - 72):
        d.rectangle([x, wt, x + 28, Hd - 20], fill=(204, 198, 194)); d.rectangle([x + 22, wt, x + 28, Hd - 20], fill=(168, 160, 164))
        for y in range(int(wt) + 30, Hd - 30, 34): d.line([(x, y), (x + 28, y)], fill=(168, 160, 164), width=2)
    d.rectangle([36, Hd - 24, Wd - 36, Hd - 2], fill=(130, 122, 132)); d.rectangle([36, Hd - 24, Wd - 36, Hd - 18], fill=(168, 160, 164))
    # tall arched windows (two each side)
    def arch_win(x, y, ww, hh):
        d.rectangle([x - 6, y + ww / 2, x + ww + 6, y + hh + 10], fill=(236, 222, 196)); d.ellipse([x - 6, y - 6, x + ww + 6, y + ww + 6], fill=(236, 222, 196))
        d.rectangle([x, y + ww / 2, x + ww, y + hh], fill=(44, 100, 168)); d.ellipse([x, y, x + ww, y + ww], fill=(44, 100, 168))
        d.rectangle([x + 4, y + ww / 2, x + ww / 2 - 2, y + hh - 4], fill=(122, 194, 232)); d.line([(x + ww / 2, y + 2), (x + ww / 2, y + hh)], fill=(236, 222, 196), width=4)
        d.line([(x, y + hh * 0.55), (x + ww, y + hh * 0.55)], fill=(236, 222, 196), width=4); d.rectangle([x - 10, y + hh + 6, x + ww + 10, y + hh + 14], fill=(204, 198, 194))
    for x in (98, Wd - 186): arch_win(x, wt + 46, 64, 150)
    # central entrance: projecting canopy on iron brackets, double doors, blank name band with emblem
    dx0, dx1 = gx - 150, gx + 150
    d.rectangle([dx0, wt + 2, dx1, wt + 40], fill=(52, 40, 66)); d.rectangle([dx0 + 6, wt + 8, dx1 - 6, wt + 34], fill=(236, 222, 196))
    d.polygon([(gx, wt + 10), (gx + 10, wt + 21), (gx, wt + 32), (gx - 10, wt + 21)], fill=(138, 74, 206))
    for sx in (-1, 1):                                                  # winged-wheel motif either side of the crystal (original)
        d.ellipse([gx + sx * 44 - 10, wt + 11, gx + sx * 44 + 10, wt + 31], outline=(96, 48, 150), width=3)
        d.line([(gx + sx * 56, wt + 21), (gx + sx * 96, wt + 14)], fill=(96, 48, 150), width=3); d.line([(gx + sx * 56, wt + 25), (gx + sx * 90, wt + 26)], fill=(96, 48, 150), width=3)
    cy = Hd - 2 * U + 40
    d.polygon([(dx0 - 20, cy), (dx1 + 20, cy), (dx1 + 4, cy - 34), (dx0 - 4, cy - 34)], fill=(54, 118, 52))
    for x in range(int(dx0 - 14), int(dx1 + 20), 20): d.line([(x, cy - 2), (x + 8, cy - 32)], fill=(36, 82, 46), width=3)
    d.rectangle([dx0 - 20, cy, dx1 + 20, cy + 8], fill=(36, 82, 46))
    for x in (dx0 - 10, dx1 + 4): d.rectangle([x, cy + 8, x + 8, Hd - 24], fill=(52, 40, 66)); d.rectangle([x - 6, Hd - 30, x + 14, Hd - 22], fill=(52, 40, 66))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(sh).rectangle([dx0 - 10, cy + 8, dx1 + 10, cy + 26], fill=(20, 18, 30, 90)); im = Image.alpha_composite(im, pblur(sh, 3)); d = SD(im)
    ddx0, ddx1 = gx - 56, gx + 56; dtop = Hd - 196
    d.rectangle([ddx0 - 10, dtop - 10, ddx1 + 10, Hd - 20], fill=(204, 198, 194))
    d.rectangle([ddx0, dtop, ddx1, Hd - 22], fill=(70, 44, 34))
    for x in (ddx0 + 6, gx + 3):
        d.rectangle([x, dtop + 6, x + 47, Hd - 26], fill=(106, 68, 46)); d.rectangle([x + 8, dtop + 16, x + 39, dtop + 90], fill=(122, 194, 232)); d.rectangle([x + 8, dtop + 16, x + 18, dtop + 90], fill=(198, 236, 250))
        d.rectangle([x + 8, dtop + 104, x + 39, Hd - 40], fill=(146, 98, 62))
    d.rectangle([gx - 10, dtop + 100, gx - 4, dtop + 120], fill=(238, 162, 60)); d.rectangle([gx + 4, dtop + 100, gx + 10, dtop + 120], fill=(238, 162, 60))
    # lamps either side of the doors + planters
    for x in (dx0 + 30, dx1 - 42):
        d.rectangle([x + 4, cy + 30, x + 8, cy + 50], fill=(52, 40, 66)); d.rounded_rectangle([x - 4, cy + 50, x + 16, cy + 78], 4, fill=(252, 214, 104)); d.rectangle([x - 6, cy + 46, x + 18, cy + 52], fill=(52, 40, 66))
    for x in (100, Wd - 188):
        d.rectangle([x, Hd - 52, x + 76, Hd - 22], fill=(106, 68, 46)); d.rectangle([x, Hd - 52, x + 76, Hd - 46], fill=(146, 98, 62))
        for k in range(6): d.ellipse([x + 4 + k * 12, Hd - 66, x + 16 + k * 12, Hd - 50], fill=(54, 118, 52) if k % 2 else (82, 152, 58))
        for k in (1, 3, 5): d.ellipse([x + 6 + k * 12, Hd - 64, x + 12 + k * 12, Hd - 58], fill=(176, 118, 236))
    return im

# ---------------- train station: interior ----------------
def station_floor():
    im = Image.new('RGBA', (T, T)); d = SD(im)
    for gy in range(2):
        for gx in range(2):
            c = (236, 222, 196) if (gx + gy) % 2 == 0 else (204, 198, 194)
            d.rectangle([gx * 64, gy * 64, gx * 64 + 63, gy * 64 + 63], fill=c)
            d.line([(gx * 64 + 4, gy * 64 + 4), (gx * 64 + 26, gy * 64 + 4)], fill=(252, 246, 232), width=2)
    for k in (0, 64): d.line([(0, k), (U, k)], fill=(168, 160, 164), width=2); d.line([(k, 0), (k, U)], fill=(168, 160, 164), width=2)
    d.rectangle([60, 60, 68, 68], fill=(54, 118, 52))
    return im

def platform_floor(seed=8):
    im = arr2img(colorize(pnoise(seed, 4), (160, 152, 158), (196, 190, 188))); d = SD(im)
    for k in (0, 64): d.line([(0, k), (U, k)], fill=(130, 122, 132), width=2)
    for k in (32, 96): d.line([(k, 0), (k, 64)], fill=(130, 122, 132), width=2)
    for k in (0, 64): d.line([(k, 64), (k, U)], fill=(130, 122, 132), width=2)
    return im

def platform_edge(track_side='n'):
    """Platform paving with yellow tactile safety strip and coping stone toward the track side."""
    im = platform_floor(); d = SD(im)
    flip = (lambda y: U - y) if track_side == 's' else (lambda y: y)
    def band(a, b, c):
        y0, y1 = sorted((flip(a), flip(b))); d.rectangle([0, y0, U, y1], fill=c)
    band(0, 14, (94, 88, 102)); band(14, 22, (204, 198, 194)); band(22, 26, (130, 122, 132))
    band(34, 54, (238, 162, 60))
    for x in range(4, U, 12):
        for yy in (38, 46): y = flip(yy); d.rectangle([x, min(y, y + 4), x + 4, max(y, y + 4)], fill=(252, 214, 104))
    return im

def rail_h(outdoor=False):
    base = (106, 96, 96) if not outdoor else (130, 122, 132)
    im = arr2img(colorize(pnoise(9 + outdoor, 2), shade(base, 0.7), lift(base, 20))); r = random.Random(4)
    def fn(d, ox, oy):
        for x in range(0, U, 4):
            for y in range(0, U, 4):
                if r.random() < 0.25: d.rectangle([x + ox, y + oy, x + ox + 2, y + oy + 2], fill=(150, 142, 146))
    im = wrapped(im, fn); d = SD(im)
    for x in range(8, U, 32):
        d.rectangle([x, 10, x + 16, 118], fill=(70, 44, 34)); d.rectangle([x, 10, x + 16, 14], fill=(106, 68, 46))
    for y in (32, 88):
        d.rectangle([0, y + 4, U, y + 10], fill=(52, 40, 66)); d.rectangle([0, y, U, y + 6], fill=(168, 160, 164)); d.line([(0, y + 1), (U, y + 1)], fill=(232, 230, 236), width=2)
    return im

def rail_v(outdoor=False): return rail_h(outdoor).transpose(Image.ROTATE_90)

def buffer_stop():
    im = blank(); d = SD(im)
    d.rectangle([20, 40, 108, 100], fill=(162, 52, 50)); d.rectangle([20, 40, 108, 52], fill=(208, 84, 64))
    for x in (30, 82): d.rectangle([x, 56, x + 16, 74], fill=(52, 40, 66)); d.ellipse([x - 2, 56, x + 18, 76], fill=(252, 214, 104))
    for k in range(4): d.polygon([(24 + k * 22, 86), (36 + k * 22, 86), (30 + k * 22, 96)], fill=(252, 214, 104))
    d.rectangle([24, 100, 32, 120], fill=(52, 40, 66)); d.rectangle([96, 100, 104, 120], fill=(52, 40, 66))
    return im

def iwall_station(part):
    c = (236, 222, 196); tile = (62, 156, 146); im = Image.new('RGBA', (T, T), c); d = SD(im)
    if part == 'top':
        d.rectangle([0, 0, U, U], fill=(52, 40, 66)); d.rectangle([0, U - 16, U, U], fill=(94, 88, 102)); return im
    if part == 'upper':
        d.rectangle([0, 0, U, 16], fill=(94, 88, 102)); d.line([(0, 18), (U, 18)], fill=(52, 40, 66), width=3)
        d.rectangle([24, 36, 104, 112], fill=(130, 122, 132)); d.ellipse([24, 6, 104, 74], fill=(130, 122, 132))       # arched clerestory window
        d.rectangle([30, 40, 98, 110], fill=(122, 194, 232)); d.ellipse([30, 12, 98, 72], fill=(122, 194, 232)); d.line([(64, 12), (64, 110)], fill=(130, 122, 132), width=4)
        d.line([(30, 70), (98, 70)], fill=(130, 122, 132), width=3); d.rectangle([36, 44, 50, 100], fill=(198, 236, 250))
        return im
    for x in range(0, U, 32): d.line([(x, 0), (x, 70)], fill=(214, 198, 170), width=2)
    d.rectangle([0, 70, U, U], fill=tile)                                   # glazed teal dado tiles
    for y in range(74, U, 14):
        for x in range(0 if (y // 14) % 2 else 8, U, 16): d.rectangle([x + 1, y, x + 14, y + 11], fill=lift(tile, 14) if (x // 16 + y // 14) % 3 else shade(tile, 0.85))
    d.rectangle([0, 66, U, 74], fill=(36, 110, 108)); d.rectangle([0, U - 8, U, U], fill=(24, 56, 44))
    return im

def ticket_counter(part):
    im = blank(); d = SD(im)
    d.rectangle([0, 46, U, 122], fill=(106, 68, 46)); d.rectangle([0, 40, U, 56], fill=(186, 136, 86)); d.line([(0, 56), (U, 56)], fill=(70, 44, 34), width=3)
    for x in range(8, U, 40): d.rectangle([x, 64, x + 30, 112], fill=(146, 98, 62)); d.line([(x + 2, 66), (x + 28, 66)], fill=(186, 136, 86), width=2)
    if part == 'm':
        d.rectangle([14, 0, 114, 42], fill=(70, 44, 34)); d.rectangle([20, 4, 108, 40], fill=(122, 194, 232)); d.rectangle([22, 6, 40, 38], fill=(198, 236, 250))
        d.ellipse([46, 30, 82, 52], fill=(70, 44, 34)); d.ellipse([52, 34, 76, 48], fill=(26, 18, 38))                 # speaking hole / ticket slot
        d.ellipse([92, 36, 104, 48], fill=(238, 162, 60)); d.rectangle([96, 32, 100, 36], fill=(196, 110, 46))        # service bell
    else:
        x0 = 0 if part == 'r' else 14; x1 = U - 14 if part == 'r' else U
        d.rectangle([x0, 0, x1, 42], fill=(70, 44, 34)); d.rectangle([x0 + 6, 4, x1 - 6, 40], fill=(122, 194, 232))
        d.rectangle([x0 + 8, 6, x0 + 24, 38], fill=(198, 236, 250))
        if part == 'l': d.rectangle([28, 44, 52, 52], fill=(252, 246, 232)); d.rectangle([60, 46, 84, 52], fill=(246, 160, 186))  # ticket stacks
        else: d.rectangle([40, 44, 70, 52], fill=(62, 58, 72)); d.rectangle([44, 42, 66, 46], fill=(176, 118, 236))              # stamp machine
    if part == 'l': d.rectangle([0, 0, 14, 122], fill=(70, 44, 34))
    if part == 'r': d.rectangle([U - 14, 0, U, 122], fill=(70, 44, 34))
    return im

def bench():
    im = blank(2, 1); im = shadow(im, [12, 104, 244, 126], 80, 5); d = SD(im)
    for x in (24, 220): d.rectangle([x, 70, x + 10, 116], fill=(52, 40, 66)); d.rectangle([x - 6, 110, x + 16, 118], fill=(52, 40, 66))
    d.rectangle([14, 20, 242, 30], fill=(52, 40, 66))
    for y in (30, 44): d.rectangle([16, y, 240, y + 10], fill=(166, 116, 74)); d.line([(16, y + 1), (240, y + 1)], fill=(206, 156, 100), width=2)
    for y in (64, 78): d.rectangle([12, y, 244, y + 12], fill=(146, 98, 62)); d.line([(12, y + 1), (244, y + 1)], fill=(186, 136, 86), width=2)
    for x in (20, 128, 228): d.rectangle([x, 22, x + 8, 92], fill=(62, 58, 72))
    return im

def timetable_board():
    """2x1 wall-mounted departures board: split-flap rows left BLANK (text is engine-side), clock on the right."""
    im = blank(2, 1); d = SD(im)
    d.rectangle([10, 6, 246, 114], fill=(52, 40, 66)); d.rectangle([16, 12, 240, 108], fill=(41, 37, 43))
    d.rectangle([16, 12, 240, 24], fill=(96, 48, 150))
    for i, y in enumerate(range(32, 104, 14)):
        for x in range(22, 182, 10): d.rectangle([x, y, x + 7, y + 9], fill=(62, 58, 72)); d.line([(x, y + 4), (x + 7, y + 4)], fill=(26, 18, 38), width=1)
        d.rectangle([186, y, 194, y + 9], fill=(238, 162, 60) if i % 2 == 0 else (82, 152, 58))
    d.ellipse([200, 40, 236, 76], fill=(252, 246, 232)); d.line([(218, 58), (218, 44)], fill=(26, 18, 38), width=3); d.line([(218, 58), (228, 62)], fill=(26, 18, 38), width=3)
    for x in (40, 216): d.rectangle([x, 0, x + 4, 8], fill=(94, 88, 102))
    return im

def restricted_sign():
    """2x1 BLANK official notice board for 'Government restricted airspace: arrivals by rail only' (text added later)."""
    im = blank(2, 1); d = SD(im)
    d.rectangle([14, 10, 242, 112], fill=(110, 34, 42)); d.rectangle([20, 16, 236, 106], fill=(252, 246, 232))
    d.rectangle([20, 16, 236, 34], fill=(162, 52, 50))
    d.polygon([(34, 30), (44, 20), (54, 30)], fill=(252, 214, 104)); d.polygon([(202, 30), (212, 20), (222, 30)], fill=(252, 214, 104))
    d.rectangle([28, 42, 228, 98], fill=(244, 226, 255)); d.rectangle([28, 42, 228, 98], outline=(204, 198, 194), width=2)   # blank text field
    for x, y in ((22, 18), (230, 18), (22, 100), (230, 100)): d.rectangle([x, y, x + 4, y + 4], fill=(130, 122, 132))
    return im

def station_pillar():
    im = blank(1, 2); im = shadow(im, [30, 232, 98, 252], 80, 4); d = SD(im)
    d.rectangle([48, 30, 80, 246], fill=(36, 110, 108)); d.rectangle([48, 30, 56, 246], fill=(62, 156, 146)); d.rectangle([74, 30, 80, 246], fill=(24, 56, 44))
    d.rectangle([38, 230, 90, 248], fill=(36, 110, 108)); d.polygon([(30, 30), (98, 30), (82, 46), (46, 46)], fill=(36, 110, 108)); d.rectangle([26, 20, 102, 32], fill=(62, 156, 146))
    for y in (90, 160): d.rectangle([44, y, 84, y + 6], fill=(238, 162, 60))
    return im

def station_mat():
    im = blank(); d = SD(im)
    d.rounded_rectangle([14, 70, 114, 124], 6, fill=(62, 58, 72)); d.rounded_rectangle([22, 78, 106, 116], 4, outline=(238, 162, 60), width=3)
    for x in range(30, 100, 12): d.line([(x, 84), (x, 110)], fill=(94, 88, 102), width=2)
    return im

# =====================================================================================================================
# registry
# =====================================================================================================================
TILES = []; BYNAME = {}; SHEETS = collections.OrderedDict(); MULTI = collections.OrderedDict(); _BUILT = [False]
CAT_ORDER = ('terrain', 'transition', 'deco', 'overlay', 'building', 'interior', 'fog')
def _fin(im, cat, raw):
    if raw: return im
    return pixelize(im, outline=cat in ('deco', 'overlay', 'interior'))
def reg(name, cat, frames, coll='walk', enc=False, ms=None, loop=True, anim=None, notes=None, ysort=False, raw=False, extra=None):
    name = PREFIX + name
    if name in BYNAME: return BYNAME[name]
    frames = frames if isinstance(frames, list) else [frames]
    imgs = [_fin(f, cat, raw) for f in frames]
    sheet = SHEETS.setdefault(cat, [])
    idx = len(sheet); sheet.extend(imgs)
    t = dict(id=ID_BASE + 1 + len(TILES), name=name, category=cat, sheet=f'tiles_extra/1x/{cat}.png', index=idx, col=idx % 16, row=idx // 16,
             walkable=coll in WALKABLE, collision=coll, collision_code=COLL[coll], encounter=enc)
    if len(imgs) > 1:
        t['animation'] = dict(anim) if anim else dict(frames=list(range(idx, idx + len(imgs))), frame_ms=ms, loop=loop)
        if anim: t['animation']['frames'] = [idx + k for k in anim['frames']]; t['animation']['idle_frame'] = idx
    if notes: t['notes'] = notes
    if ysort: t['ysort'] = True
    if extra: t.update(extra)
    TILES.append(t); BYNAME[name] = t; return t
def reg_multi(name, cat, img, w, h, collfn, notes=None, framefn=None):
    """Pixelize the whole object once (outline follows the silhouette, not tile seams), then slice row/col."""
    full = _fin(img, cat if cat != 'overlay' else 'deco', False)
    MULTI[PREFIX + name] = dict(w=w, h=h, tile_name_pattern=f'{PREFIX}{name}_<row>_<col>')
    for r_ in range(h):
        for c_ in range(w):
            cell = full.crop((c_ * T, r_ * T, c_ * T + T, r_ * T + T)); ccat, coll = collfn(r_, c_)
            reg(f'{name}_{r_}_{c_}', ccat, cell, coll, raw=True, notes=notes if (r_, c_) == (0, 0) else None)

# terrain bases --------------------------------------------------------------------------------------------------------
PRIO = {'grass': 0, 'moss': 0, 'snow': 1, 'mud': 1, 'ice': 2, 'path': 2, 'bog': 3, 'water': 3, 'flood': 2.5, 'deep': 4}
TCOLL = {'grass': 'walk', 'moss': 'walk', 'snow': 'walk', 'mud': 'walk', 'ice': 'ice', 'path': 'walk', 'bog': 'water',
         'water': 'water', 'flood': 'walk', 'deep': 'deep_water'}
STATIC = {'grass': lambda s: grass(s), 'path': path, 'snow': snow, 'mud': mud, 'moss': moss, 'ice': ice}
_BC = {}
def base_frames(t, v=0):
    k = (t, v)
    if k not in _BC:
        if t in STATIC: _BC[k] = [STATIC[t](100 + v * 7 + sum(map(ord, t)) + (0 if t in ('grass', 'path') else 4000))]
        elif t == 'bog': _BC[k] = [bog_frame(f) for f in range(3)]
        elif t == 'water': _BC[k] = [water_img(f) for f in range(4)]
        elif t == 'deep': _BC[k] = [deep_frame(f) for f in range(4)]
        elif t == 'flood': _BC[k] = [flood_frame(f) for f in range(4)]
    return _BC[k]
MS = {'bog': 320, 'water': 220, 'deep': 220, 'flood': 220}
TNOTES = {
 'grass': 'COPY of base grass_<v> (same recipe/seed) so snow edges can be previewed standalone; remap to grass_<v> on merge',
 'path': 'COPY of base path_<v>; remap to path_<v> on merge', 'water': 'COPY of base water; remap to water on merge',
 'snow': 'Frostspire powder snow (replaces the pinkish base snow_* in Frostspire maps)',
 'ice': 'ice-slide floor: collision "ice" (walkable; player slides until blocked)',
 'mud': 'Mirefen peat mud (darker/wetter than base mud_*)', 'moss': 'Mirefen moss ground (swamp grass base)',
 'bog': 'Mirefen bog water: surf-able like water (collision water); 3-frame swell',
 'deep': 'deep water: collision "deep_water" (needs Dive/strong Surf; matches base water wave phase)',
 'flood': 'flooded path: shallow water over cobbles, walkable (splash fx / no encounters by default)'}
def kind_of(B, A):
    if B == 'snow': return 'snow'
    if B == 'ice': return 'ice'
    if B == 'bog': return 'shore'
    if B == 'deep': return 'deep'
    if B == 'flood': return 'flood'
    if B == 'water': return 'water'
    return 'soft'
def trans_tile(B, A, sides, diags):
    nm = f"{B}>{A}_{''.join(str(int(v)) for v in sides)}_{''.join(str(int(v)) for v in diags)}"
    if PREFIX + nm in BYNAME: return BYNAME[PREFIX + nm]
    Bf, Af = base_frames(B), base_frames(A); n = max(len(Bf), len(Af))
    fr = [transition(Bf[f % len(Bf)], Af[f % len(Af)], sides, diags, kind_of(B, A)) for f in range(n)]
    return reg(nm, 'transition', fr, TCOLL[B], ms=MS.get(B, MS.get(A)))
PAIRS = [('snow', 'grass'), ('ice', 'snow'), ('mud', 'moss'), ('bog', 'moss'), ('bog', 'mud'), ('deep', 'water'), ('flood', 'path'), ('water', 'path'), ('water', 'flood')]

def build_tiles():
    for t in ('snow', 'ice', 'mud', 'moss', 'grass', 'path'):
        for v in range(3 if t != 'ice' else 2): reg(f'{t}_{v}', 'terrain', base_frames(t, v), TCOLL[t], notes=TNOTES[t] if v == 0 else None)
    for t in ('bog', 'water', 'deep', 'flood'): reg(t if t != 'deep' else 'deep_water', 'terrain', base_frames(t), TCOLL[t], ms=MS[t], notes=TNOTES[t])
    for B, A in PAIRS:
        for k in range(1, 16): trans_tile(B, A, tuple(bool(k >> (3 - i) & 1) for i in range(4)), (0, 0, 0, 0))
        for k in range(1, 16): trans_tile(B, A, (0, 0, 0, 0), tuple(bool(k >> (3 - i) & 1) for i in range(4)))
    # tall grass (encounter) ------------------------------------------------------------------------------------------
    for style, nice in (('snow', 'Frostspire'), ('swamp', 'Mirefen')):
        for nm, frames, part in tg_variants(style):
            sync = f'tall_{style}_* and tall_{style}_front_*/tips_* of the cell'
            anim = dict(type='rustle', trigger='on_enter', frame_ms=90, loop=False, sync=sync, frames=[1, 2, 3])
            if part == 'body':
                reg(nm, 'deco', frames, 'walk', enc=True, anim=anim, raw=True,
                    notes=f'{nice} tall grass (encounter). name = x_tall_{style}_<N><E><S><W>_v<variant>; 1 = side open; variant=(x+y)%2' if nm.endswith('0000_v0') else None)
            elif part == 'front': reg(nm, 'overlay', frames, 'walk', anim=anim, raw=True, ysort=True, notes='front blades drawn over a sprite in this cell' if nm.endswith('0000_v0') else None)
            else: reg(nm, 'overlay', frames, 'walk', anim=anim, raw=True, ysort=True, notes='blade tips of the tall-grass cell BELOW' if nm.endswith('00_v0') else None)
    # snow props -------------------------------------------------------------------------------------------------------
    reg_multi('pine_snow', 'deco', snowy_pine(), 2, 2, lambda r_, c_: ('overlay', 'walk') if r_ == 0 else ('deco', 'block'),
              notes='2x2 snowy pine: row 0 = canopy overlay (walk behind), row 1 = trunk (block)')
    reg_multi('pine_snow_small', 'deco', snowy_pine(1, 2, 32), 1, 2, lambda r_, c_: ('overlay', 'walk') if r_ == 0 else ('deco', 'block'))
    reg('frozen_rock', 'deco', frozen_rock(), 'block'); reg('frozen_rock_big', 'deco', frozen_rock(True), 'block', notes='Rock Smash-able candidate (block)')
    # swamp props ------------------------------------------------------------------------------------------------------
    reg('reeds', 'deco', reeds(False), 'block', notes='reed clump on land/mud (block)')
    reg('reeds_water', 'deco', reeds(True), 'water', notes='reeds standing in bog water (surf-blocking scenery: collision water)')
    bw = dict(bike_only_capable=True, overrides_ground=True)
    reg('boardwalk_h', 'deco', boardwalk('h'), 'walk', extra=bw, notes='wide boardwalk (walk); overrides water/bog under it like bridge_h. bike_only_capable: swap to x_boardwalk_bike_* to make a bike-only span')
    reg('boardwalk_v', 'deco', boardwalk('v'), 'walk', extra=bw)
    reg('boardwalk_bike_h', 'deco', boardwalk('h', True), 'bike_only', extra=dict(overrides_ground=True), notes='narrow plank: bike only (same rule as base bike_rail_*)')
    reg('boardwalk_bike_v', 'deco', boardwalk('v', True), 'bike_only', extra=dict(overrides_ground=True))
    reg_multi('dead_tree', 'deco', dead_tree(), 1, 2, lambda r_, c_: ('overlay', 'walk') if r_ == 0 else ('deco', 'block'),
              notes='1x2 dead swamp tree: row 0 overlay, row 1 trunk (block)')
    # fog (clearable) --------------------------------------------------------------------------------------------------
    for k in range(16):
        n, e, s_, w = (k >> 3) & 1, (k >> 2) & 1, (k >> 1) & 1, k & 1
        for q in range(4):
            reg(f'fog_{n}{e}{s_}{w}_q{q}', 'fog', [fog_tile(n, e, s_, w, f, q % 2, q // 2) for f in range(3)], 'walk', ms=600, raw=True,
                extra=dict(states=dict(fog=None, clear=0), layer='fog'),
                notes='Mirefen fog (clearable, e.g. by Defog): drawn in its own top "fog" layer above overlay. <NESW>=1 means that side borders clear air; q = (x%2)+2*(y%2)' if k == 0 and q == 0 else None)
    for t in TILES:
        if t.get('layer') == 'fog': t['states']['fog'] = t['id']
    # station exterior -------------------------------------------------------------------------------------------------
    reg_multi('station', 'building', station_building(), 7, 5, lambda r_, c_: ('building', 'door' if (r_, c_) == (4, 3) else 'block'),
              notes='Revival-era rail station 7x5. Door = x_station_4_3 (collision door). Name band + clock face left blank for later text')
    reg('rail_h_out', 'deco', rail_h(True), 'block', notes='outdoor track on ballast (block)'); reg('rail_v_out', 'deco', rail_v(True), 'block')
    reg('rail_buffer', 'deco', buffer_stop(), 'block', notes='buffer stop: place on the deco layer over the last rail tile')
    # station interior -------------------------------------------------------------------------------------------------
    reg('station_floor', 'interior', station_floor(), 'walk'); reg('platform_floor', 'interior', platform_floor(), 'walk')
    reg('platform_edge_n', 'interior', platform_edge('n'), 'walk', notes='platform edge; tracks are NORTH of it (yellow tactile strip)')
    reg('platform_edge_s', 'interior', platform_edge('s'), 'walk', notes='platform edge; tracks are SOUTH of it')
    reg('rail_h', 'interior', rail_h(), 'block', notes='indoor track bed (block)'); reg('rail_v', 'interior', rail_v(), 'block')
    for p in ('top', 'upper', 'face'): reg(f'iwall_{p}_station', 'interior', iwall_station(p), 'block')
    for p in 'lmr': reg(f'ticket_counter_{p}', 'interior', ticket_counter(p), 'block', notes='ticket counter (l/m/r); talk across it to the clerk standing behind' if p == 'l' else None)
    reg_multi('bench', 'interior', bench(), 2, 1, lambda r_, c_: ('interior', 'block'))
    reg_multi('timetable', 'interior', timetable_board(), 2, 1, lambda r_, c_: ('interior', 'block'), notes='departures board for the wall FACE row; flaps left blank (text engine-side)')
    reg_multi('sign_restricted', 'interior', restricted_sign(), 2, 1, lambda r_, c_: ('interior', 'block'),
              notes='BLANK notice board: "Government restricted airspace: arrivals by rail only" (text added later; see map signs[])')
    reg_multi('station_pillar', 'interior', station_pillar(), 1, 2, lambda r_, c_: ('interior', 'block'))
    reg('station_mat', 'interior', station_mat(), 'door', notes='exit mat (door)')

# =====================================================================================================================
# maps
# =====================================================================================================================
class XMap:
    def __init__(s, name, title, w, h, fill):
        s.name, s.title, s.w, s.h = name, title, w, h
        s.terr = [[fill] * w for _ in range(h)]; s.ground = [[None] * w for _ in range(h)]
        s.deco = [[None] * w for _ in range(h)]; s.over = [[None] * w for _ in range(h)]; s.fog = set()
        s.coll = {}; s.warps = []; s.exits = []; s.npcs = []; s.signs = []; s.items = []; s.zones = []; s.extra = {}
    def rect(s, t, x0, y0, x1, y1, grid=None):
        g = grid if grid is not None else s.terr
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < s.w and 0 <= y < s.h: g[y][x] = t
    def put_multi(s, name, x, y):
        M = MULTI[PREFIX + name]
        for r_ in range(M['h']):
            for c_ in range(M['w']):
                t = BYNAME[f'{PREFIX}{name}_{r_}_{c_}']; tgt = s.over if t['category'] == 'overlay' else s.deco
                tgt[y + r_][x + c_] = t['name']

def place_tall(m):
    for style in ('snow', 'swamp'):
        cells = {(x, y) for y in range(m.h) for x in range(m.w) if m.deco[y][x] == f'tall_{style}'}
        for (x, y) in cells:
            o = lambda xx, yy: int((xx, yy) not in cells)
            n, e, s_, w = o(x, y - 1), o(x + 1, y), o(x, y + 1), o(x - 1, y); v = (x + y) % 2
            m.deco[y][x] = f'{PREFIX}tall_{style}_{n}{e}{s_}{w}_v{v}'
            if m.over[y][x] is None: m.over[y][x] = f'{PREFIX}tall_{style}_front_{n}{e}{s_}{w}_v{v}'
            if n and y > 0 and m.over[y - 1][x] is None: m.over[y - 1][x] = f'{PREFIX}tall_{style}_tips_{e}{w}_v{v}'

def resolve(m):
    G = [[0] * m.w for _ in range(m.h)]
    tr = lambda x, y: m.terr[y][x] if 0 <= x < m.w and 0 <= y < m.h else None
    for y in range(m.h):
        for x in range(m.w):
            if m.ground[y][x]: G[y][x] = BYNAME[PREFIX + m.ground[y][x]]['id']; continue
            t = m.terr[y][x]; p = PRIO[t]
            low = lambda xx, yy: (lambda n: n if (n in PRIO and PRIO[n] < p) else None)(tr(xx, yy))
            sides = [low(x, y - 1), low(x + 1, y), low(x, y + 1), low(x - 1, y)]
            diags = [low(x + 1, y - 1), low(x + 1, y + 1), low(x - 1, y + 1), low(x - 1, y - 1)]
            lows = [v for v in sides + diags if v]
            if not lows:
                if t in ('bog', 'water', 'flood'): G[y][x] = BYNAME[PREFIX + t]['id']
                elif t == 'deep': G[y][x] = BYNAME[PREFIX + 'deep_water']['id']
                elif t == 'path': G[y][x] = BYNAME[f'{PREFIX}path_0']['id']            # one cobble layout = no seams vs edge tiles
                else: G[y][x] = BYNAME[f'{PREFIX}{t}_{(x * 7 + y * 13 + (x * y) % 5) % (2 if t == "ice" else 3)}']['id']
                continue
            A = collections.Counter(lows).most_common(1)[0][0]
            G[y][x] = trans_tile(t, A, tuple(bool(v) for v in sides), tuple(bool(v) for v in diags))['id']
    return G

def finalize(m):
    place_tall(m); G = resolve(m); BY = {t['id']: t for t in TILES}
    nm2id = lambda v: (BYNAME[v if v.startswith(PREFIX) else PREFIX + v]['id'] if v else 0)
    D = [[nm2id(v) for v in row] for row in m.deco]; O = [[nm2id(v) for v in row] for row in m.over]
    C = [[0] * m.w for _ in range(m.h)]; E = [[0] * m.w for _ in range(m.h)]
    for y in range(m.h):
        for x in range(m.w):
            c = BY[G[y][x]]['collision']
            if D[y][x]:
                td = BY[D[y][x]]
                if td.get('overrides_ground') or td['collision'] != 'walk': c = td['collision']
                if td['encounter']: E[y][x] = 1
            C[y][x] = COLL[m.coll.get((x, y), c)]
    F = None
    if m.fog:
        F = [[0] * m.w for _ in range(m.h)]
        for (x, y) in m.fog:
            o = lambda xx, yy: int((xx, yy) not in m.fog)
            F[y][x] = BYNAME[f'{PREFIX}fog_{o(x, y - 1)}{o(x + 1, y)}{o(x, y + 1)}{o(x - 1, y)}_q{(x % 2) + 2 * (y % 2)}']['id']
    return G, D, O, C, E, F

def map_mirefen():
    m = XMap('mirefen_bog', 'Mirefen Bog (sample)', 24, 18, 'moss'); r = random.Random(7)
    # mud trail W->E with a fork; peat bog in the middle; second small pool SE
    m.rect('mud', 0, 8, 6, 9); m.rect('mud', 5, 5, 7, 9); m.rect('mud', 5, 4, 10, 5); m.rect('mud', 17, 8, 23, 9); m.rect('mud', 16, 9, 18, 13); m.rect('mud', 2, 13, 16, 14)
    m.rect('mud', 2, 10, 3, 14)
    for (x0, y0, x1, y1) in ((8, 6, 16, 12), (10, 5, 15, 5), (9, 13, 14, 13), (7, 8, 7, 11), (17, 7, 17, 7), (12, 4, 14, 4)): m.rect('bog', x0, y0, x1, y1)
    m.rect('bog', 19, 12, 22, 15); m.rect('bog', 20, 16, 21, 16)
    # boardwalk across the bog (wide, walkable) linking W mud trail to E mud trail
    for x in range(7, 17): m.deco[8][x] = 'boardwalk_h'
    m.rect('mud', 6, 8, 6, 9)
    # bike-only spur north from the boardwalk to an item islet
    for y in range(5, 8): m.deco[y][12] = 'boardwalk_bike_v'
    m.rect('bog', 10, 1, 15, 5); m.rect('mud', 11, 2, 13, 3)                          # islet surrounded by bog
    m.deco[4][12] = 'boardwalk_bike_v'
    m.items.append(dict(id='mirefen_islet_item', x=12, y=2, hidden=False, item='TBD'))
    m.extra['bike'] = dict(no_dismount_cells=[[12, y] for y in range(4, 8)], rule='x_boardwalk_bike_* = collision bike_only (8): reachable only by bike')
    # tall swamp grass patches
    m.rect('tall_swamp', 1, 1, 4, 6, m.deco); m.rect('tall_swamp', 18, 2, 22, 6, m.deco); m.rect('tall_swamp', 4, 15, 9, 17, m.deco)
    for x, y in ((1, 1), (22, 6), (4, 6)): m.deco[y][x] = None
    m.zones += [dict(x0=1, y0=1, x1=4, y1=6, table='mirefen_grass_w'), dict(x0=18, y0=2, x1=22, y1=6, table='mirefen_grass_ne'),
                dict(x0=4, y0=15, x1=9, y1=17, table='mirefen_grass_s'), dict(x0=7, y0=4, x1=17, y1=13, table='mirefen_bog_surf'),
                dict(x0=19, y0=12, x1=22, y1=16, table='mirefen_bog_surf')]
    # reeds, dead trees
    for x, y in ((8, 12), (16, 6), (15, 12), (9, 6), (20, 15), (22, 13)):
        if m.terr[y][x] == 'bog': m.deco[y][x] = 'reeds_water'
    for x, y in ((6, 3), (17, 11), (19, 10), (1, 11), (11, 15), (14, 16), (0, 16)):
        if m.deco[y][x] is None: m.deco[y][x] = 'reeds'
    for x, y in ((0, 3), (7, 2), (17, 1), (23, 2), (19, 17), (0, 14), (13, 17)):
        m.put_multi('dead_tree', x, y - 1)
    # fog bank over the NE (clearable)
    for y in range(0, 8):
        for x in range(15, 24):
            if (x - 23) ** 2 / 64 + (y - 0) ** 2 / 50 <= 1.05: m.fog.add((x, y))
    m.exits += [dict(edge='west', start=8, end=9, to='TO COME', offset=0, note='TO COME: west route'),
                dict(edge='east', start=8, end=9, to='TO COME', offset=0, note='TO COME: east route')]
    m.npcs.append(dict(id='mirefen_angler', x=5, y=10, facing='right', kind='TBD', note='sample NPC on the mud bank'))
    m.signs.append(dict(id='mirefen_sign', x=1, y=7, text='TBD: Mirefen Bog sign'))
    m.deco[7][1] = 'boardwalk_v'; m.coll[(1, 7)] = 'block'                       # stand-in sign post (no sign tile in this kit)
    m.deco[7][1] = None
    return m

def map_station():
    W, Hh = 20, 13; m = XMap('station_int', 'Rail station interior (sample)', W, Hh, 'grass')
    for x in range(W):
        m.ground[0][x] = 'iwall_top_station'; m.ground[1][x] = 'iwall_upper_station'; m.ground[2][x] = 'iwall_face_station'
        m.ground[3][x] = 'rail_h'; m.ground[4][x] = 'platform_edge_n'
        for y in (5, 6): m.ground[y][x] = 'platform_floor'
        for y in range(7, Hh): m.ground[y][x] = 'station_floor'
    m.put_multi('timetable', 3, 2); m.put_multi('sign_restricted', 14, 2)
    m.deco[3][19] = 'rail_buffer'
    m.put_multi('bench', 4, 5); m.put_multi('bench', 13, 5)
    m.put_multi('station_pillar', 1, 5); m.put_multi('station_pillar', 18, 5); m.put_multi('station_pillar', 9, 5)
    for x, p in ((7, 'l'), (8, 'm'), (9, 'm'), (10, 'm'), (11, 'r')): m.deco[9][x] = f'ticket_counter_{p}'
    for x in range(7, 12): m.ground[8][x] = 'station_floor'
    m.put_multi('bench', 2, 10); m.put_multi('bench', 16, 10)
    for x in (9, 10): m.deco[12][x] = 'station_mat'
    m.warps += [dict(x=x, y=12, to='$return', tx=0, ty=0, facing='down', note='exit to the station exterior door (x_station_4_3)') for x in (9, 10)]
    m.npcs += [dict(id='station_clerk', x=9, y=8, facing='down', kind='TBD', note='ticket clerk behind the counter (talk from y=10)'),
               dict(id='station_traveller', x=7, y=6, facing='up', kind='TBD', note='waiting passenger')]
    m.signs += [dict(id='restricted_airspace', x=14, y=2, text='Government restricted airspace: arrivals by rail only', note='text drawn on x_sign_restricted_0_0/_0_1 (blank board) - read from y=5'),
                dict(id='timetable', x=3, y=2, text='TBD: departures', note='x_timetable board')]
    return m

def map_testbed():
    """Snow + ice + flood/deep previews (not a game map; kit QA only)."""
    m = XMap('x_testbed', 'Extra biomes test bed (QA only)', 24, 14, 'grass')
    m.rect('snow', 0, 0, 11, 13); m.rect('snow', 12, 3, 12, 9); m.rect('ice', 3, 7, 8, 11); m.rect('ice', 5, 6, 6, 6)
    m.rect('tall_snow', 1, 1, 5, 4, m.deco); m.rect('tall_snow', 13, 10, 15, 12, m.deco)
    m.put_multi('pine_snow', 7, 0); m.put_multi('pine_snow', 9, 2); m.put_multi('pine_snow_small', 0, 8)
    m.deco[5][9] = 'frozen_rock'; m.deco[12][1] = 'frozen_rock_big'; m.deco[6][1] = 'frozen_rock'
    m.rect('path', 14, 0, 16, 13); m.rect('flood', 14, 5, 16, 9); m.rect('water', 17, 2, 23, 12); m.rect('flood', 17, 6, 17, 8)
    m.rect('deep', 19, 4, 22, 10); m.rect('path', 17, 0, 23, 1)
    m.put_multi('station', 16, -3) if False else None
    return m

def map_station_ext():
    m = XMap('x_station_ext', 'Station exterior (QA only)', 12, 9, 'grass')
    m.rect('path', 0, 6, 11, 8); m.rect('path', 5, 5, 5, 5)
    m.put_multi('station', 2, 1)
    for x in range(12): m.deco[0][x] = 'rail_h_out'
    m.deco[0][11] = 'rail_buffer'
    m.coll[(5, 5)] = 'door'
    return m

MAPS_GAME = ('mirefen_bog', 'station_int'); MAPS_QA = ('x_testbed', 'x_station_ext')
def build(write=True):
    if not _BUILT[0]: build_tiles(); _BUILT[0] = True
    maps = [map_mirefen(), map_station(), map_testbed(), map_station_ext()]
    res = {m.name: (m,) + finalize(m) for m in maps}
    return res

# =====================================================================================================================
# export: sheets 1x/2x/3x, tileset_extra*.json, maps_new/*.json, previews
# =====================================================================================================================
def tileset_dict(k=1):
    sheets = {c: f'tiles_extra/{k}x/{c}.png' for c in CAT_ORDER if c in SHEETS}
    tiles = []
    for t in TILES:
        t2 = dict(t); t2['sheet'] = f'tiles_extra/{k}x/{t["category"]}.png'; tiles.append(t2)
    return dict(tile_size=T * k, native_tile_size=T, scale=k, columns_per_sheet=16, id_zero='empty',
                id_offset=ID_BASE, name_prefix=PREFIX,
                note=('EXTRA biome kit (Frostspire snow, Mirefen swamp, rail station, flood). Same schema as tileset.json. '
                      f'ids start at {ID_BASE + 1} and names start with "{PREFIX}" so this file can be merged without clashes; see EXTRA_TILES.md.'
                      + ('' if k == 1 else f' {k}x nearest-neighbour copy of tileset_extra.json.')),
                collision_codes=COLL,
                collision_notes={'ice': 'NEW (10): walkable, slide until blocked', 'deep_water': 'NEW (11): water that needs Dive/strong Surf',
                                 'bike_only': 'same as base (8)'},
                render='nearest-neighbour, integer zoom only', palette='palette.png',
                draw_order=['ground', 'decoration', 'characters + ysort overlay tiles, sorted by tile row (character first on ties)',
                            'overlay (non-ysort: canopies, roofs)', 'fog (NEW optional layer; x_fog_* tiles; clearable)'],
                sheets=sheets, multi_tile_objects=dict(MULTI), tiles=tiles)

def write_all(res):
    for k in (1, 2, 3):
        os.makedirs(f'{OUT}/tiles_extra/{k}x', exist_ok=True)
        for cat, imgs in SHEETS.items():
            rows = (len(imgs) + 15) // 16; sh = Image.new('RGBA', (16 * T, rows * T), (0, 0, 0, 0))
            for i, im in enumerate(imgs): sh.paste(im, ((i % 16) * T, (i // 16) * T))
            if k > 1: sh = sh.resize((sh.width * k, sh.height * k), Image.NEAREST)
            sh.save(f'{OUT}/tiles_extra/{k}x/{cat}.png', optimize=True)
        json.dump(tileset_dict(k), open(f'{OUT}/tileset_extra{"" if k == 1 else f"_{k}x"}.json', 'w'), indent=1)
    os.makedirs(f'{OUT}/maps_new/previews', exist_ok=True)
    for name, (m, G, D, O, C, E, F) in res.items():
        layers = dict(ground=G, decoration=D, overlay=O, collision=C, encounter=E)
        if F: layers['fog'] = F
        data = dict(name=m.name, title=m.title, width=m.w, height=m.h, tile_size=T, tileset='../tileset_extra.json', layers=layers,
                    warps=m.warps, exits=m.exits, npcs=m.npcs, signs=m.signs, items=m.items, encounter_zones=m.zones)
        data.update(m.extra)
        if F: data['fog'] = dict(layer='fog', clearable=True, cleared_by='TBD (e.g. Defog field move / story flag)',
                                 rule='draw after overlay; when cleared set every fog cell to its states.clear (0)')
        if name in MAPS_QA: data['qa_only'] = 'kit test bed - not a game map'
        json.dump(data, open(f'{OUT}/maps_new/{name}.json', 'w'), indent=1)

def previews(res):
    import preview_util as pu                        # read-only use: we only swap its cached tileset for ours
    ts = tileset_dict(1); ts['byid'] = {t['id']: t for t in ts['tiles']}; pu._TS = ts; pu._SHEETS.clear()
    outs = []
    for name, (m, G, D, O, C, E, F) in res.items():
        for fr, sfx in ((None, ''),) + (((1, '_f1'),) if name == 'mirefen_bog' else ()):
            sprites = []
            if name == 'mirefen_bog': sprites = [(5, 10, pu.silhouette()), (10, 8, pu.silhouette()), (2, 3, pu.silhouette())]
            if name == 'station_int': sprites = [(9, 8, pu.silhouette()), (7, 6, pu.silhouette()), (10, 10, pu.silhouette())]
            if name == 'x_testbed': sprites = [(3, 3, pu.silhouette()), (15, 7, pu.silhouette())]
            im = pu.render_region(f'../maps_new/{name}', 0, 0, m.w - 1, m.h - 1, sprites=sprites, frame=fr)
            if F:
                for y in range(m.h):
                    for x in range(m.w):
                        if F[y][x]: im.alpha_composite(pu.tile_img(F[y][x], fr), (x * T, y * T))
            p = f'{OUT}/maps_new/previews/{name}{sfx}.png'; pu.x3(im).convert('RGB').save(p, optimize=True); outs.append(p)
            if sfx == '' and F:
                im2 = pu.render_region(f'../maps_new/{name}', 0, 0, m.w - 1, m.h - 1, sprites=sprites)
                p = f'{OUT}/maps_new/previews/{name}_fog_cleared.png'; pu.x3(im2).convert('RGB').save(p, optimize=True); outs.append(p)
        # debug collision view (32 px/tile) - same colour key as previews/*_debug.png, plus ice=cyan-white, deep=navy
        t = 32; sm = pu.render_region(f'../maps_new/{name}', 0, 0, m.w - 1, m.h - 1).resize((m.w * t, m.h * t), Image.NEAREST); d = ImageDraw.Draw(sm, 'RGBA')
        for y in range(m.h):
            for x in range(m.w):
                c = {1: (255, 0, 0, 70), 2: (255, 160, 0, 120), 3: (0, 80, 255, 60), 4: (0, 255, 0, 150), 8: (255, 0, 255, 110),
                     10: (200, 255, 255, 140), 11: (0, 0, 120, 120)}.get(C[y][x])
                if c: d.rectangle([x * t, y * t, x * t + t - 1, y * t + t - 1], fill=c)
                if E[y][x]: d.rectangle([x * t + 4, y * t + 4, x * t + t - 5, y * t + t - 5], outline=(255, 255, 0, 200), width=2)
        for n in m.npcs: d.ellipse([n['x'] * t + 6, n['y'] * t + 6, n['x'] * t + t - 6, n['y'] * t + t - 6], fill=(255, 255, 255, 230), outline=(0, 0, 0))
        for n in m.items: d.rectangle([n['x'] * t + 10, n['y'] * t + 10, n['x'] * t + t - 10, n['y'] * t + t - 10], fill=(255, 0, 255, 230))
        p = f'{OUT}/maps_new/previews/{name}_debug.png'; sm.convert('RGB').save(p); outs.append(p)
    # sheet catalogue at 3x on a checker so transparency is visible
    for cat, imgs in SHEETS.items():
        rows = (len(imgs) + 15) // 16; bg = Image.new('RGBA', (16 * T, rows * T), (0, 0, 0, 255)); d = ImageDraw.Draw(bg)
        for y in range(0, rows * T, 8):
            for x in range(0, 16 * T, 8): d.rectangle([x, y, x + 7, y + 7], fill=(60, 56, 70) if (x // 8 + y // 8) % 2 else (80, 76, 90))
        bg.alpha_composite(Image.open(f'{OUT}/tiles_extra/1x/{cat}.png'))
        p = f'{OUT}/maps_new/previews/sheet_{cat}.png'; bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST).convert('RGB').save(p); outs.append(p)
    return outs

# =====================================================================================================================
# checks
# =====================================================================================================================
def checks(res):
    probs = []; pal = {tuple(c) for c in PAL}
    for cat, imgs in SHEETS.items():
        for i, im in enumerate(imgs):
            a = np.asarray(im); al = a[..., 3]
            if not set(np.unique(al)) <= {0, 255, SHADOW[3]}: probs.append(f'{cat}[{i}] non-binary alpha {sorted(set(np.unique(al)))[:6]}')
            op = a[al == 255][:, :3]; bad = {tuple(c) for c in np.unique(op, axis=0)} - pal if len(op) else set()
            if bad: probs.append(f'{cat}[{i}] off-palette {list(bad)[:3]}')
            sh = a[al == SHADOW[3]][:, :3]
            if len(sh) and not (sh == SHADOW[:3]).all(): probs.append(f'{cat}[{i}] semi-alpha pixel that is not the shared shadow')
    # seamlessness of plain terrain: edge-to-edge colour jump vs interior jump
    for t in TILES:
        if t['category'] == 'terrain':
            a = np.asarray(SHEETS['terrain'][t['index']])[..., :3].astype(int)
            seam = np.abs(a[:, 0] - a[:, -1]).mean() + np.abs(a[0] - a[-1]).mean(); inner = np.abs(a[:, 31] - a[:, 32]).mean() + np.abs(a[31] - a[32]).mean()
            if seam > inner * 1.8 + 6: probs.append(f'{t["name"]}: wrap seam {seam:.1f} vs interior {inner:.1f}')
    # connectivity: everything walkable reachable from the entrances (bike-only cells allowed when on bike)
    for name, (m, G, D, O, C, E, F) in res.items():
        if name in MAPS_QA: continue
        ok = lambda c, bike: c in (0, 4, 7, 10) or (bike and c == 8)
        starts = [(w['x'], w['y']) for w in m.warps] + [((0 if e['edge'] == 'west' else m.w - 1), e['start']) for e in m.exits]
        for bike in (False, True):
            seen = set(starts); q = collections.deque(starts)
            while q:
                x, y = q.popleft()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < m.w and 0 <= ny < m.h and (nx, ny) not in seen and ok(C[ny][nx], bike): seen.add((nx, ny)); q.append((nx, ny))
            for n in m.npcs + m.items:
                adj = [(n['x'] + dx, n['y'] + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (0, 2))]
                if not any(p in seen for p in adj) and bike: probs.append(f"{name}: {n['id']} not reachable (bike={bike})")
            for s in m.signs:
                if not any((s['x'] + dx, s['y'] + dy) in seen for dx, dy in ((0, 1), (0, 2), (0, 3))): probs.append(f"{name}: sign {s['id']} not readable")
            unreached = [(x, y) for y in range(m.h) for x in range(m.w) if ok(C[y][x], True) and (x, y) not in seen]
            if bike and unreached: probs.append(f'{name}: {len(unreached)} walkable cells unreachable e.g. {unreached[:5]}')
            if not bike and name == 'mirefen_bog':
                isl = (m.items[0]['x'], m.items[0]['y'])
                if isl in seen: probs.append('mirefen_bog: islet item reachable without bike (bike-only spur leaks)')
        for n in m.npcs + m.items:
            if C[n['y']][n['x']] not in (0, 7, 10): probs.append(f"{name}: {n['id']} on blocked tile {C[n['y']][n['x']]}")
    return probs

if __name__ == '__main__':
    t0 = time.time(); res = build(); write_all(res); outs = previews(res); pr = checks(res)
    print(f'{len(TILES)} tiles (ids {ID_BASE + 1}..{ID_BASE + len(TILES)}), sheets: ' + ', '.join(f'{c}={len(v)}' for c, v in SHEETS.items()))
    print('\n'.join(pr) or 'CHECKS PASS'); print(f'{time.time() - t0:.1f}s'); print('\n'.join(outs))
