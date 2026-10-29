#!/usr/bin/env python3
"""Aurelith Arena v3 'final throne room' art (Gary, Oct 29 2026 6:41 PM CT, pt2163u: "more majesty? more wow factor? more soul?
something that really screams end of the game boss").
Imported by tools/city/arena_art_kit.py (adds a3_* tiles to tileset_arena.json, one sheet per type: tiles_*x/arena_v3_<type>.png).
Drawn at the game's native 64 px per square (not 32 px doubled like v2) with a small shading engine: shape masks -> bevel +
gradient light field -> ordered (Bayer) dither into 4-6 colour ramps, 1 px dark outline, rim highlights, soft glows
(alpha < 200, so glows never count as collision art). Per type: a 5x6 animated centrepiece (rows 0-2 sit on the wall),
a pair of 1x5 framing pillars, 1x2 emblem banners, 1x2 processional obelisks, a 1x1 animated brazier, two floor slabs,
a 3-wide processional carpet and a 7-wide dais. Animated cells: 4 frames, tileset `animation` (src/overworld/renderer.js tileFrame).
In-house art (no third-party assets). Free CC0 packs checked first (OpenGameArt: Blue Castle Top Down, SBS Top Down Dungeon
Pack, Destron 64x64 dungeon tiles): generic castle/dungeon tiles in another style, nothing for themed boss set pieces, not used."""
import math, random
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

T = 64; NF = 4
OUT = (30, 22, 38)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], float) / 16.0
def hx(s): return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))

class Cv:
    def __init__(s, w, h): s.w, s.h = w, h; s.a = np.zeros((h, w, 4), np.float32); s.yy, s.xx = np.mgrid[0:h, 0:w].astype(np.float32)
    def mask(s, fn):
        im = Image.new('L', (s.w, s.h), 0); fn(ImageDraw.Draw(im)); return np.array(im) > 127
    def paint(s, m, ramp, v, dither=1.0):
        ramp = np.array([hx(c) for c in ramp], np.float32); n = len(ramp)
        b = BAYER[s.yy.astype(int) % 4, s.xx.astype(int) % 4]
        q = np.clip(v * n + (b - 0.5) * dither, 0, n - 1e-3).astype(int)
        s.a[m, :3] = ramp[q[m]]; s.a[m, 3] = 255
    def flat(s, m, c, a=255): s.a[m, :3] = hx(c); s.a[m, 3] = a
    def glow(s, cx, cy, r, c, amax=150, only_empty=False):
        d = np.hypot(s.xx - cx, s.yy - cy); g = np.clip(1 - d / r, 0, 1) ** 1.6
        g = np.round(g * 4) / 4 * amax  # banded glow (pixel-art style)
        col = np.array(hx(c), np.float32); A = s.a[..., 3]
        sel = g > 0
        if only_empty: sel &= A < 1
        empty = sel & (A < 1); s.a[empty, :3] = col; s.a[empty, 3] = np.minimum(g[empty], 199)
        part = sel & (A >= 1); k = (g[part] / 255.0)[:, None]
        s.a[part, :3] = s.a[part, :3] * (1 - k * .6) + np.minimum(255, s.a[part, :3] + col * .7) * (k * .6)
    def outline(s, m, c=OUT):
        ring = ndi.binary_dilation(m) & ~m; s.flat(ring, '#%02x%02x%02x' % c)
    def img(s):
        return Image.fromarray(np.clip(s.a, 0, 255).astype(np.uint8), 'RGBA')

def bevel(cv, m, base=.55, light=(-.7, -.75), width=5, rim=.45, vg=.25, y0=None, y1=None, noise=.05, seed=1):
    d = ndi.distance_transform_edt(m); gy, gx = np.gradient(ndi.gaussian_filter(d, 1.2))
    lit = -(gx * light[0] + gy * light[1]); lit = lit / (np.hypot(gx, gy) + 1e-3)
    e = np.clip(1 - d / width, 0, 1)
    ys = np.where(m)[0]
    y0 = ys.min() if y0 is None and len(ys) else (y0 or 0); y1 = ys.max() if y1 is None and len(ys) else (y1 or cv.h)
    yn = np.clip((cv.yy - y0) / max(1, (y1 - y0)), 0, 1)
    r = np.random.default_rng(seed).random(m.shape) * noise
    return np.clip(base + vg * (0.5 - yn) + rim * e * lit + r, 0, 1)

def shape(cv, fn, ramp, outline=True, **k):
    m = cv.mask(fn); cv.paint(m, ramp, bevel(cv, m, **k))
    if outline: cv.outline(m)
    return m

def slice_cells(im, cols, rows):
    return {(r, c): im.crop((c * T, r * T, c * T + T, r * T + T)) for r in range(rows) for c in range(cols)}

# --------------------------------------------------------------- palettes
P = {
 'water': dict(stone=('#1c2a44', '#2c4466', '#46688e', '#6e94b6', '#a8c8dc', '#e0f0f8'), main=('#0e2e5c', '#174a86', '#2470b4', '#3e98d6', '#7cc6ee'),
               acc=('#7a5a1c', '#b08a2e', '#e0bc52', '#fff0a0'), glow='#7ad8ff', fire=('#1a5a9a', '#3ea0e8', '#9ae0ff', '#f0ffff'), floor=('#203a5a', '#2c4c72', '#3a5e88', '#4c74a0', '#6890b8')),
 'fire': dict(stone=('#140c10', '#241618', '#3a2424', '#563634', '#7a4e44', '#a87060'), main=('#4a0c0c', '#7a1414', '#a8221a', '#d8401e', '#ff7a30'),
              acc=('#6a3a10', '#a8661c', '#e0a030', '#ffe080'), glow='#ff8a30', fire=('#a8221a', '#ff6a1c', '#ffb43c', '#fff0a0'), floor=('#1e1416', '#2c1e1e', '#3a2826', '#4c3430', '#5e423a')),
 'wind': dict(stone=('#6a7e98', '#8ea4be', '#b4c8dc', '#d4e4f0', '#eef6fc', '#ffffff'), main=('#1c4e86', '#2a6aae', '#3e8ad0', '#6ab0e8', '#a8d8f8'),
              acc=('#7a6a3a', '#b0985a', '#e0c878', '#fff4c0'), glow='#e8f8ff', fire=('#5ab0e8', '#a8e0ff', '#e8f8ff', '#ffffff'), floor=('#8aa4c0', '#a0b8d2', '#b6cce2', '#cadcee', '#e0ecf8')),
 'earth': dict(stone=('#1e140e', '#34241a', '#4e3828', '#6c5038', '#8e6c4c', '#b49270'), main=('#3a2a14', '#5a4020', '#7e5a2c', '#a87a3a', '#d4a050'),
               acc=('#6a3a10', '#b8741e', '#e8a43c', '#ffe08a'), glow='#ffc860', fire=('#b8741e', '#e8a43c', '#ffd070', '#fff4c0'), floor=('#3e2e20', '#4e3c2a', '#5e4a34', '#705a40', '#846c4e')),
 'grass': dict(stone=('#1a1e12', '#2e3420', '#4a5232', '#6a7448', '#8e9a62', '#b8c48a'), main=('#123a16', '#1e5a22', '#2e7e30', '#4ea240', '#86cc5a'),
               acc=('#4a2e18', '#7a5234', '#a87a4e', '#d4ac78'), glow='#d8ff8a', fire=('#3ea040', '#8ae05a', '#d8ff8a', '#f8fff0'), floor=('#2e3a20', '#3a4a28', '#485a30', '#5a6c3a', '#6e8046')),
 'light': dict(stone=('#6a5a3a', '#94805a', '#bca67c', '#dcc89e', '#f2e4c0', '#fffaea'), main=('#7a5a10', '#a8801c', '#d4a82c', '#f4d050', '#fff0a0'),
               acc=('#6a4a10', '#a87a1c', '#e0b030', '#fff4b0'), glow='#fff4b0', fire=('#f4d050', '#fff0a0', '#fffae0', '#ffffff'), floor=('#bca67c', '#ccb68c', '#dcc89e', '#ead8b0', '#f6e8c8')),
 'mystic': dict(stone=('#140e24', '#221a3c', '#342a58', '#4a3e7a', '#66589e', '#8e80c8'), main=('#2a1258', '#401c82', '#5a2eac', '#7e4ed4', '#b08af4'),
                acc=('#5a4a1e', '#94803a', '#ccb460', '#fff0a8'), glow='#c8a8ff', fire=('#7e4ed4', '#b08af4', '#e0d0ff', '#ffffff'), floor=('#241c40', '#2e2450', '#3a2e62', '#463a74', '#544886')),
 'dark': dict(stone=('#08060c', '#120e18', '#1e1828', '#2c2438', '#3e344e', '#56486a'), main=('#1e0a2a', '#30123e', '#4a1c5c', '#6a2a80', '#9a4ab8'),
              acc=('#3a3048', '#5a4e6e', '#8a7aa4', '#c8b8e0'), glow='#b06aff', fire=('#5a1c9a', '#8a3ad8', '#c890ff', '#f4e0ff'), floor=('#14101a', '#1c1724', '#241e2e', '#2e2638', '#3a3046')),
}

# --------------------------------------------------------------- emblems
def emblem(cv, t, cx, cy, s, ramp, out=True):
    if t == 'water':
        fn = lambda d: d.polygon([(cx, cy - s), (cx + s * .7, cy + s * .2), (cx + s * .55, cy + s * .7), (cx, cy + s), (cx - s * .55, cy + s * .7), (cx - s * .7, cy + s * .2)], fill=255)
    elif t == 'fire':
        fn = lambda d: d.polygon([(cx, cy - s), (cx + s * .35, cy - s * .2), (cx + s * .5, cy - s * .6), (cx + s * .75, cy + s * .2), (cx + s * .5, cy + s), (cx - s * .5, cy + s), (cx - s * .75, cy + s * .2), (cx - s * .45, cy - s * .45), (cx - s * .2, cy - s * .1)], fill=255)
    elif t == 'wind':
        def fn(d):
            for i in range(3):
                a0 = i * 120; r = s
                d.pieslice((cx - r, cy - r, cx + r, cy + r), a0, a0 + 70, fill=255)
            d.ellipse((cx - s * .3, cy - s * .3, cx + s * .3, cy + s * .3), fill=255)
    elif t == 'earth':
        fn = lambda d: d.polygon([(cx - s, cy + s * .8), (cx - s * .35, cy - s * .6), (cx - s * .05, cy - s * .1), (cx + s * .3, cy - s), (cx + s, cy + s * .8)], fill=255)
    elif t == 'grass':
        fn = lambda d: d.polygon([(cx, cy - s), (cx + s * .65, cy - s * .3), (cx + s * .55, cy + s * .45), (cx, cy + s), (cx - s * .55, cy + s * .45), (cx - s * .65, cy - s * .3)], fill=255)
    elif t == 'light':
        def fn(d):
            for a in range(8):
                an = a * math.pi / 4; d.polygon([(cx + math.cos(an) * s, cy + math.sin(an) * s), (cx + math.cos(an + .3) * s * .45, cy + math.sin(an + .3) * s * .45), (cx + math.cos(an - .3) * s * .45, cy + math.sin(an - .3) * s * .45)], fill=255)
            d.ellipse((cx - s * .5, cy - s * .5, cx + s * .5, cy + s * .5), fill=255)
    elif t == 'mystic':
        def fn(d):
            for a in range(4):
                an = a * math.pi / 2 - math.pi / 2; d.polygon([(cx + math.cos(an) * s, cy + math.sin(an) * s), (cx + math.cos(an + .8) * s * .3, cy + math.sin(an + .8) * s * .3), (cx + math.cos(an - .8) * s * .3, cy + math.sin(an - .8) * s * .3)], fill=255)
    else:  # dark: crescent
        def fn(d):
            d.ellipse((cx - s, cy - s, cx + s, cy + s), fill=255); d.ellipse((cx - s * .45, cy - s * 1.15, cx + s * 1.3, cy + s * .7), fill=0)
    m = cv.mask(fn); cv.paint(m, ramp, bevel(cv, m, width=3, rim=.5, vg=.3))
    if t == 'wind': pass
    if out: cv.outline(m)
    return m

# --------------------------------------------------------------- shared props
def framing_pillar(t, f=0):
    p = P[t]; cv = Cv(T, T * 5)
    shape(cv, lambda d: d.rectangle((14, 22, 49, 300), fill=255), p['stone'], width=10, rim=.55, vg=.2, light=(-1, 0))
    for x in (21, 28, 35, 42): cv.flat(cv.mask(lambda d, x=x: d.line((x, 30, x, 292), fill=255)), p['stone'][1])  # fluting
    for x in (22, 36): cv.flat(cv.mask(lambda d, x=x: d.line((x, 30, x, 292), fill=255)), p['stone'][4])
    shape(cv, lambda d: d.polygon([(4, 22), (59, 22), (52, 6), (11, 6)], fill=255), p['acc'], width=4)        # capital
    shape(cv, lambda d: d.rectangle((2, 0, 61, 8), fill=255), p['acc'], width=3)
    shape(cv, lambda d: d.rectangle((8, 286, 55, 304), fill=255), p['stone'], width=4)                       # base
    shape(cv, lambda d: d.rectangle((3, 300, 60, 318), fill=255), p['acc'], width=4)
    # emblem medallion + theme sconce flame
    shape(cv, lambda d: d.ellipse((16, 108, 47, 139), fill=255), p['acc'], width=4)
    emblem(cv, t, 31.5, 123.5, 10, p['main'])
    fl = brazier_flame(cv, t, 32, 214, 9, f)
    shape(cv, lambda d: d.polygon([(22, 222), (42, 222), (38, 232), (26, 232)], fill=255), p['acc'], width=3)
    cv.glow(32, 205, 34, p['glow'], 110)
    return cv.img()

def brazier_flame(cv, t, cx, by, s, f):
    p = P[t]; ph = f * math.pi / 2
    for i, (sc, col) in enumerate(((1.0, 0), (.7, 1), (.42, 2))):
        sway = math.sin(ph + i) * s * .25; h = s * (2.4 + .35 * math.sin(ph * 2 + i)) * sc; w = s * sc
        m = cv.mask(lambda d: d.polygon([(cx - w, by), (cx - w * .8, by - h * .45), (cx + sway, by - h), (cx + w * .8, by - h * .5), (cx + w, by)], fill=255))
        cv.paint(m, p['fire'][col:col + 2] if col < 3 else p['fire'][-1:], np.clip((by - cv.yy) / (h + 1), 0, 1))
    return True

def brazier(t, f):
    p = P[t]; cv = Cv(T, T)
    cv.glow(32, 26, 32, p['glow'], 120)
    shape(cv, lambda d: d.polygon([(24, 50), (40, 50), (44, 61), (20, 61)], fill=255), p['stone'], width=4)
    shape(cv, lambda d: d.rectangle((28, 36, 36, 52), fill=255), p['acc'], width=3)
    shape(cv, lambda d: d.chord((8, 18, 56, 46), 0, 180, fill=255), p['acc'], width=5)
    shape(cv, lambda d: d.ellipse((8, 26, 56, 38), fill=255), p['stone'][:3], width=3, outline=False)
    brazier_flame(cv, t, 32, 32, 12, f)
    return cv.img()

def obelisk(t):
    p = P[t]; cv = Cv(T, 2 * T)
    shape(cv, lambda d: d.polygon([(8, 126), (56, 126), (52, 108), (12, 108)], fill=255), p['stone'], width=4)
    shape(cv, lambda d: d.polygon([(18, 108), (46, 108), (41, 22), (32, 8), (23, 22)], fill=255), p['stone'], width=7, rim=.6, light=(-1, -.3))
    shape(cv, lambda d: d.polygon([(23, 22), (41, 22), (32, 8)], fill=255), p['acc'], width=3)
    cv.glow(32, 52, 22, p['glow'], 120)
    emblem(cv, t, 32, 52, 8, p['fire'])
    for y in (78, 86, 94): cv.flat(cv.mask(lambda d, y=y: d.line((24, y, 40, y), fill=255)), p['acc'][1])
    return cv.img()

def banner(t):
    p = P[t]; cv = Cv(T, 2 * T)
    shape(cv, lambda d: d.rectangle((4, 6, 59, 11), fill=255), p['acc'], width=2)
    for x in (2, 58): shape(cv, lambda d, x=x: d.ellipse((x - 3, 4, x + 4, 13), fill=255), p['acc'], width=2)
    m = shape(cv, lambda d: d.polygon([(10, 11), (54, 11), (54, 104), (32, 122), (10, 104)], fill=255), p['main'], width=6, rim=.35, vg=.35, light=(-1, 0))
    for x in (13, 51):
        cv.flat(cv.mask(lambda d, x=x: d.line((x, 12, x, 104), fill=255)), p['acc'][2])
    cv.flat(cv.mask(lambda d: d.line((13, 104, 32, 119, 51, 104), fill=255)), p['acc'][2])
    cv.flat(cv.mask(lambda d: d.line((10, 24, 54, 24), fill=255)), p['acc'][1])
    for x in range(16, 50, 4): cv.flat(cv.mask(lambda d, x=x: d.line((x, 16, x, 21), fill=255)), p['main'][4])
    shape(cv, lambda d: d.ellipse((16, 40, 48, 72), fill=255), p['acc'], width=4)
    emblem(cv, t, 32, 56, 11, p['main'] if t != 'light' else ('#7a3a10', '#a85a1c', '#d47a2c', '#f4a050'))
    return cv.img()

def floor(t, k):
    p = P[t]; cv = Cv(T, T); r = random.Random(hash((t, k)) & 0xffff)
    full = np.ones((T, T), bool)
    # four slabs (2x2 per square) with bevel and grout
    for (x0, y0) in ((0, 0), (32, 0), (0, 32), (32, 32)):
        m = np.zeros((T, T), bool); m[y0 + 1:y0 + 31, x0 + 1:x0 + 31] = True
        cv.paint(m, p['floor'], bevel(cv, m, base=.5 + r.uniform(-.08, .08), width=3, rim=.4, vg=.1, seed=r.randrange(999), noise=.12))
    g = full & (cv.a[..., 3] < 1); cv.flat(g, p['floor'][0])
    if k == 'b':  # inlay motif
        if t == 'water':
            for x in range(4, 60): y = 32 + int(4 * math.sin(x / 4)); cv.flat(cv.mask(lambda d, x=x, y=y: d.point((x, y), fill=255)), p['main'][3])
        else:
            m = cv.mask(lambda d: d.polygon([(32, 20), (44, 32), (32, 44), (20, 32)], fill=255)); cv.paint(m, p['acc'], bevel(cv, m, width=2))
            emblem(cv, t, 32, 32, 6, p['main'], out=False)
    for _ in range(3):  # cracks / wear
        x, y = r.randrange(4, 60), r.randrange(4, 60)
        for _ in range(6):
            cv.flat(cv.mask(lambda d, x=x, y=y: d.point((x, y), fill=255)), p['floor'][0]); x += r.choice((-1, 0, 1)); y += r.choice((0, 1))
            x, y = max(0, min(63, x)), max(0, min(63, y))
    if t == 'fire':  # glowing magma seams in grout
        for _ in range(2):
            y = r.choice((0, 32)); x = r.randrange(0, 40)
            cv.flat(cv.mask(lambda d, x=x, y=y: d.line((x, y, x + 16, y), fill=255)), '#ff7a30')
    return cv.img()

def carpet(t, part, k='a'):
    p = P[t]; cv = Cv(T, T); m = np.ones((T, T), bool)
    cv.paint(m, p['main'], np.clip(.5 + .08 * np.sin(cv.yy / 3) + (np.random.default_rng(4).random((T, T)) * .1), 0, 1), dither=.6)
    if part in ('l', 'r'):
        x0 = 0 if part == 'l' else 52
        b = np.zeros((T, T), bool); b[:, x0:x0 + 12] = True; cv.paint(b, p['acc'], np.clip(.55 + .25 * np.sin(cv.yy * math.pi / 8), 0, 1))
        e = np.zeros((T, T), bool); e[:, (x0 + 3 if part == 'l' else x0 + 8)] = True; cv.flat(e, p['main'][0])
        e = np.zeros((T, T), bool); e[:, (0 if part == 'l' else 63)] = True; cv.flat(e, OUT and '#1e1626')
        for y in range(4, 64, 8): cv.flat(cv.mask(lambda d, y=y: d.polygon([(x0 + 6, y - 3), (x0 + 9, y), (x0 + 6, y + 3), (x0 + 3, y)], fill=255)), p['main'][4])
    else:
        if k == 'a':
            cv.glow(32, 32, 30, p['glow'], 40)
            m2 = cv.mask(lambda d: d.polygon([(32, 8), (54, 32), (32, 56), (10, 32)], fill=255)); cv.paint(m2, p['main'][1:], bevel(cv, m2, width=3))
            cv.flat(cv.mask(lambda d: d.polygon([(32, 8), (54, 32), (32, 56), (10, 32)], outline=255)), p['acc'][2])
            emblem(cv, t, 32, 32, 11, p['acc'])
        else:
            for y in (16, 48): cv.flat(cv.mask(lambda d, y=y: d.polygon([(32, y - 5), (37, y), (32, y + 5), (27, y)], fill=255)), p['acc'][2])
    return cv.img()

def dais(t, part):
    p = P[t]; cv = Cv(T, T); m = np.ones((T, T), bool)
    cv.paint(m, p['stone'][1:], bevel(cv, m, base=.55, width=2, rim=.2, vg=.15, noise=.1))
    top = np.zeros((T, T), bool); top[:46] = True; cv.paint(top, p['stone'][2:], bevel(cv, top, base=.55, width=3, rim=.4, vg=.1, noise=.08))
    cv.flat(cv.mask(lambda d: d.line((0, 46, 63, 46), fill=255)), p['acc'][3]); cv.flat(cv.mask(lambda d: d.line((0, 47, 63, 47), fill=255)), p['acc'][1])
    cv.flat(cv.mask(lambda d: d.line((0, 63, 63, 63), fill=255)), '#1e1626')
    for x in range(4, 64, 16): cv.flat(cv.mask(lambda d, x=x: d.rectangle((x, 52, x + 7, 57), fill=255)), p['acc'][1])
    if part == 'l': cv.flat(cv.mask(lambda d: d.line((0, 0, 0, 63), fill=255)), '#1e1626')
    if part == 'r': cv.flat(cv.mask(lambda d: d.line((63, 0, 63, 63), fill=255)), '#1e1626')
    if part == 'm':  # inlaid glowing line on top
        cv.flat(cv.mask(lambda d: d.line((0, 40, 63, 40), fill=255)), p['glow'])
    return cv.img()

# --------------------------------------------------------------- centrepieces (5 w x 6 h squares = 320 x 384, rows 0-2 on the wall)
CW, CH = 5 * T, 6 * T
def arch(d, x0, x1, ytop, ybot):
    r = (x1 - x0) / 2; d.ellipse((x0, ytop, x1, ytop + 2 * r), fill=255); d.rectangle((x0, ytop + r, x1, ybot), fill=255)

def niche(cv, p, x0=10, x1=309, ytop=2, ybot=240, ramp=None):
    """Recessed arch frame: outer moulding + dark inner niche (depth)."""
    shape(cv, lambda d: arch(d, x0, x1, ytop, ybot), p['acc'], width=6, rim=.6)
    shape(cv, lambda d: arch(d, x0 + 10, x1 - 10, ytop + 10, ybot), p['stone'], width=8, rim=.5, outline=False)
    inner = cv.mask(lambda d: arch(d, x0 + 20, x1 - 20, ytop + 20, ybot))
    return inner

def steps(cv, p, y0, n=3, x0=8, x1=311, inset=14):
    for i in range(n):
        a, b = x0 + (n - 1 - i) * inset, x1 - (n - 1 - i) * inset
        yt = y0 + i * 20
        shape(cv, lambda d, a=a, b=b, yt=yt: d.rectangle((a, yt, b, yt + 22), fill=255), p['stone'], width=4, rim=.5, vg=.1)
        cv.flat(cv.mask(lambda d, a=a, b=b, yt=yt: d.line((a + 2, yt + 2, b - 2, yt + 2), fill=255)), p['acc'][3])

def cp_water(f):
    p = P['water']; cv = Cv(CW, CH); ph = f / NF
    inner = niche(cv, p, ybot=300)
    cv.paint(inner, ('#061428', '#0a2244', '#10325e', '#18467c', '#22609c'), np.clip(1 - cv.yy / 300 + .1 * np.sin(cv.xx / 9 + cv.yy / 23 + ph * 6.28), 0, 1))
    # god rays through the water
    for i, x in enumerate((90, 140, 190, 235)):
        m = cv.mask(lambda d, x=x: d.polygon([(x, 30), (x + 18, 30), (x + 50, 300), (x + 20, 300)], fill=255)) & inner
        cv.a[m, :3] = np.minimum(255, cv.a[m, :3] + 18 + 10 * math.sin(ph * 6.28 + i))
    # rose window
    cx, cy, R = 160, 86, 58
    shape(cv, lambda d: d.ellipse((cx - R - 6, cy - R - 6, cx + R + 6, cy + R + 6), fill=255), p['acc'], width=5)
    win = cv.mask(lambda d: d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=255))
    ang = np.arctan2(cv.yy - cy, cv.xx - cx); rad = np.hypot(cv.xx - cx, cv.yy - cy)
    seg = ((ang + math.pi) / (2 * math.pi) * 12).astype(int); ring = (rad / R * 3).astype(int)
    shimmer = (seg + ring + f) % 4
    pal = np.array([hx(c) for c in ('#1e6ab8', '#3e98d6', '#7cc6ee', '#2ab0b8')], np.float32)
    cv.a[win, :3] = pal[shimmer[win]]; cv.a[win, 3] = 255
    lead = win & ((np.abs(((ang + math.pi) / (2 * math.pi) * 12) % 1 - .5) > .44) | (np.abs((rad / R * 3) % 1 - .5) > .42))
    cv.flat(lead, '#122030')
    shape(cv, lambda d: d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=255), p['acc'], width=3)
    emblem(cv, 'water', cx, cy, 9, p['main'])
    cv.glow(cx, cy, 90, '#9ae0ff', 70)
    # kelp columns swaying (inside the niche, both sides)
    for sx in (52, 268):
        for strand, off in ((0, 0), (12, 1.3), (-12, 2.1)):
            pts = [(sx + strand + 7 * math.sin(y / 22 + ph * 6.28 + off), y) for y in range(300, 40, -6)]
            m = cv.mask(lambda d, pts=pts: d.line(pts, fill=255, width=7)) & inner
            cv.paint(m, ('#123e22', '#1e5e30', '#2e8442', '#52b064'), bevel(cv, m, width=3, rim=.5, vg=0))
            for (x, y) in pts[2::5]: cv.flat(cv.mask(lambda d, x=x, y=y: d.ellipse((x + 3, y - 3, x + 11, y + 2), fill=255)) & inner, '#3e9a52')
    # waterfall from the spout under the window
    shape(cv, lambda d: d.polygon([(128, 146), (192, 146), (182, 168), (138, 168)], fill=255), p['acc'], width=4)   # shell spout
    for x in range(140, 184, 6): cv.flat(cv.mask(lambda d, x=x: d.line((160, 150, x, 166), fill=255)), p['acc'][1])
    fall = cv.mask(lambda d: d.polygon([(140, 168), (180, 168), (196, 300), (124, 300)], fill=255))
    stripes = ((cv.yy - f * 12 + 3 * np.sin(cv.xx / 3)) % 24) / 24
    cv.paint(fall, ('#2a78c0', '#4ea4e0', '#8cd0f4', '#d8f4ff', '#ffffff'), np.clip(.45 + .45 * np.sin(stripes * 6.28) * .6 + (cv.xx - 160) / -160, 0, 1), dither=1.2)
    cv.glow(160, 250, 70, '#bfefff', 80)
    # basin (rows 4-5) with rippling water
    shape(cv, lambda d: d.ellipse((4, 262, 315, 376), fill=255), p['stone'], width=8, rim=.6)
    pool = cv.mask(lambda d: d.ellipse((24, 272, 295, 360), fill=255))
    rip = (np.sin(np.hypot((cv.xx - 160) / 2.2, cv.yy - 300) / 4 - f * math.pi / 2) + 1) / 2
    cv.paint(pool, ('#0e3a6a', '#1a5a98', '#2c7cc0', '#5aaee0', '#bfeaff'), np.clip(.3 + .45 * rip * (1 - np.abs(cv.yy - 300) / 60), 0, 1))
    foam = cv.mask(lambda d: d.ellipse((112, 286 + (f % 2), 208, 312), fill=255)); cv.paint(foam, ('#bfeaff', '#ffffff'), np.clip(rip, 0, 1))
    shape(cv, lambda d: d.rectangle((40, 350, 280, 383), fill=255), p['stone'], width=5)     # front rim / plinth
    cv.flat(cv.mask(lambda d: d.line((42, 352, 278, 352), fill=255)), p['acc'][3])
    for x in (60, 120, 200, 260): emblem(cv, 'water', x, 368, 7, p['acc'])
    # crest shell on the arch top
    shape(cv, lambda d: d.pieslice((130, -2, 190, 54), 180, 360, fill=255), p['acc'], width=4)
    for x in range(136, 188, 8): cv.flat(cv.mask(lambda d, x=x: d.line((160, 26, x, 2), fill=255)), p['acc'][1])
    return cv.img()

def cp_fire(f):
    p = P['fire']; cv = Cv(CW, CH); ph = f * math.pi / 2
    inner = niche(cv, p, ybot=320)
    cv.paint(inner, ('#120608', '#2a0a0a', '#4a1208', '#7a2008', '#b8400c'), np.clip(cv.yy / 330 + .06 * np.sin(cv.xx / 7 + ph), 0, 1))
    # molten falls from dragon-head spouts on both sides
    for sx in (58, 262):
        shape(cv, lambda d, sx=sx: d.polygon([(sx - 22, 54), (sx + 22, 54), (sx + 16, 82), (sx - 16, 82)], fill=255), p['stone'], width=5)
        for e in (-9, 9): cv.flat(cv.mask(lambda d, sx=sx, e=e: d.ellipse((sx + e - 3, 62, sx + e + 3, 68), fill=255)), '#ffcc40')
        fall = cv.mask(lambda d, sx=sx: d.polygon([(sx - 10, 82), (sx + 10, 82), (sx + 16, 300), (sx - 16, 300)], fill=255))
        st = ((cv.yy - f * 14 + 4 * np.sin(cv.xx / 2.5)) % 28) / 28
        cv.paint(fall, ('#8a1408', '#d43a10', '#ff7a1c', '#ffc040', '#fff4b0'), np.clip(.55 + .4 * np.sin(st * 6.28) - np.abs(cv.xx - sx) / 30, 0, 1))
        cv.glow(sx, 200, 60, '#ff7a30', 90)
    # the lava throne
    back = cv.mask(lambda d: d.polygon([(98, 250), (98, 90), (116, 60), (130, 78), (146, 30), (160, 54), (174, 30), (190, 78), (204, 60), (222, 90), (222, 250)], fill=255))
    cv.paint(back, p['stone'], bevel(cv, back, width=9, rim=.6, vg=.3)); cv.outline(back)
    crack = back & (np.abs(np.sin(cv.xx / 9 + np.sin(cv.yy / 13) * 2)) < .06)
    cv.flat(crack, '#ff8a30')
    shape(cv, lambda d: d.ellipse((136, 104, 184, 152), fill=255), p['acc'], width=5)
    emblem(cv, 'fire', 160, 128, 15, p['fire'])
    cv.glow(160, 128, 50, '#ff9a40', 90)
    for (x, y) in ((116, 60), (146, 30), (174, 30), (204, 60)):  # flames on the crown
        brazier_flame(cv, 'fire', x, y + 6, 7, f + int(x) % 3)
    for side in (1, -1):  # armrests
        x0 = 160 + side * 62; x1 = 160 + side * 92
        shape(cv, lambda d, a=min(x0, x1), b=max(x0, x1): d.rectangle((a, 190, b, 262), fill=255), p['stone'], width=6)
        shape(cv, lambda d, a=min(x0, x1), b=max(x0, x1): d.rectangle((a - 3, 182, b + 3, 194), fill=255), p['acc'], width=3)
    shape(cv, lambda d: d.rectangle((112, 214, 208, 262), fill=255), p['main'], width=6)   # seat cushion
    # lava moat (rows 4-5) + steps
    moat = cv.mask(lambda d: d.rectangle((4, 268, 315, 330), fill=255))
    flow = (np.sin(cv.xx / 11 + np.sin(cv.yy / 5) + ph) + np.sin(cv.xx / 5 - ph * 2 + cv.yy / 7)) / 4 + .5
    cv.paint(moat, ('#6a0c06', '#b82a0c', '#f05a12', '#ffa030', '#fff0a0'), np.clip(flow, 0, 1))
    shape(cv, lambda d: d.rectangle((0, 262, 319, 270), fill=255), p['stone'], width=3)
    steps(cv, p, 322, n=3, x0=40, x1=279)
    shape(cv, lambda d: d.rectangle((0, 330, 36, 383), fill=255), p['stone'], width=5); shape(cv, lambda d: d.rectangle((283, 330, 319, 383), fill=255), p['stone'], width=5)
    for x in (18, 301): brazier_flame(cv, 'fire', x, 344, 9, f)
    return cv.img()

def cp_wind(f):
    p = P['wind']; cv = Cv(CW, CH)
    inner = niche(cv, p, ybot=300)
    cv.paint(inner, ('#123c78', '#1e5a9c', '#2e78bc', '#4e98d4', '#86c0ea', '#c4e4f8'), np.clip(cv.yy / 300, 0, 1) ** .8, dither=1.4)
    for (x, y, w) in ((60, 70, 60), (230, 50, 70), (120, 230, 90), (250, 200, 60)):  # drifting clouds
        x = x + f * 4
        m = cv.mask(lambda d, x=x, y=y, w=w: [d.ellipse((x - w / 2 + i * w / 4 - w / 6, y - w / 6 - (i % 2) * 6, x - w / 2 + i * w / 4 + w / 3, y + w / 8), fill=255) for i in range(4)]) & inner
        cv.paint(m, ('#c8e0f4', '#e8f4fc', '#ffffff'), bevel(cv, m, width=4, rim=.5))
    # tower
    shape(cv, lambda d: d.polygon([(148, 120), (172, 120), (184, 270), (136, 270)], fill=255), p['stone'], width=7, light=(-1, 0))
    for y in range(140, 270, 22): cv.flat(cv.mask(lambda d, y=y: d.line((140 + (y - 120) * .08, y, 180 - (y - 120) * .08, y), fill=255)), p['stone'][1])
    # turbine: 4 blades, 22.5 deg per frame (seamless loop)
    cx, cy = 160, 112
    for b in range(4):
        a = b * math.pi / 2 + f * math.pi / 8
        ca, sa = math.cos(a), math.sin(a); px_ = -sa, ca
        L = 104; w0, w1 = 6, 15
        pts = [(cx + ca * 14 + px_[0] * w0, cy + sa * 14 + px_[1] * w0), (cx + ca * L + px_[0] * w1, cy + sa * L + px_[1] * w1),
               (cx + ca * (L + 6), cy + sa * (L + 6)), (cx + ca * L - px_[0] * 4, cy + sa * L - px_[1] * 4), (cx + ca * 14 - px_[0] * w0, cy + sa * 14 - px_[1] * w0)]
        m = cv.mask(lambda d, pts=pts: d.polygon(pts, fill=255)); cv.paint(m, ('#4a5a74', '#8a9cb4', '#c8d6e6', '#f4f8fc'), bevel(cv, m, width=4, rim=.5, vg=0)); cv.outline(m)
        tip = cv.mask(lambda d, ca=ca, sa=sa: d.ellipse((cx + ca * 86 - 6, cy + sa * 86 - 6, cx + ca * 86 + 6, cy + sa * 86 + 6), fill=255)) & m
        cv.flat(tip, p['main'][2])
    shape(cv, lambda d: d.ellipse((cx - 20, cy - 20, cx + 20, cy + 20), fill=255), p['acc'], width=5)
    emblem(cv, 'wind', cx, cy, 11, p['main'])
    cv.glow(cx, cy, 60, '#ffffff', 60)
    # streaming banners from the arch shoulders
    for sx, dirn in ((40, 1), (280, -1)):
        pts = [(sx + dirn * (i * 6), 60 + i * 10 + 6 * math.sin(i * .9 - f * math.pi / 2)) for i in range(18)]
        poly_ = pts + [(x, y + 16) for x, y in reversed(pts)]
        m = cv.mask(lambda d, q=poly_: d.polygon(q, fill=255)) & inner
        cv.paint(m, ('#e8f4fc', '#ffffff', '#c8a040', '#f0d070'), np.clip(((cv.yy - 60 - (cv.xx - sx) * dirn * 10 / 6) % 16) / 16 * 1.0, 0, 1)); cv.outline(m, (40, 60, 100))
    # cloud platform + marble steps (rows 3-5)
    shape(cv, lambda d: d.ellipse((10, 248, 309, 316), fill=255), p['stone'], width=7)
    steps(cv, p, 300, n=4, x0=36, x1=283, inset=10)
    for (x, y, w) in ((8, 300, 70), (250, 296, 70), (0, 336, 60), (266, 332, 54)):
        m = cv.mask(lambda d, x=x, y=y, w=w: [d.ellipse((x + i * w / 3 - w / 4, y - (i % 2) * 8 + f % 2, x + i * w / 3 + w / 3, y + w / 2), fill=255) for i in range(3)])
        cv.paint(m, ('#b8d0e8', '#d8e8f6', '#f4faff', '#ffffff'), bevel(cv, m, width=5, rim=.5)); cv.outline(m, (120, 150, 180))
    return cv.img()

def cp_earth(f):
    p = P['earth']; cv = Cv(CW, CH); pulse = .5 + .5 * math.sin(f * math.pi / 2)
    # colossal geode shell
    outer = cv.mask(lambda d: d.polygon([(6, 330), (0, 180), (20, 80), (70, 22), (130, 0), (200, 2), (262, 28), (306, 84), (319, 190), (314, 330)], fill=255))
    cv.paint(outer, p['stone'], bevel(cv, outer, width=14, rim=.6, vg=.25, noise=.12)); cv.outline(outer)
    band = cv.mask(lambda d: d.polygon([(34, 316), (28, 186), (46, 102), (90, 50), (140, 30), (196, 32), (246, 56), (284, 106), (294, 190), (288, 316)], fill=255))
    cv.paint(band, ('#5a4a6a', '#8a7a9a', '#c4b8d4', '#efe8f8'), bevel(cv, band, width=6, rim=.7, vg=.2))   # agate band
    cav = cv.mask(lambda d: d.polygon([(52, 304), (48, 192), (64, 116), (102, 72), (146, 54), (192, 56), (234, 78), (266, 120), (276, 192), (270, 304)], fill=255))
    cv.paint(cav, ('#2a1404', '#4a240a', '#7a3e12', '#b06018'), np.clip(1 - np.hypot(cv.xx - 160, cv.yy - 190) / 140, 0, 1))
    r = random.Random(41)
    spires = sorted([(r.uniform(60, 260), r.uniform(80, 300), r.uniform(18, 36), r.uniform(50, 130), r.uniform(-.5, .5)) for _ in range(44)], key=lambda s: s[1])
    for (x, y, w, h, lean) in spires:
        cxp = 160; dx = (x - cxp) / 120; ang = -math.pi / 2 + dx * .9 + lean * .2
        if y > 230: ang = -math.pi / 2 + dx * .5
        tipx, tipy = x + math.cos(ang) * h, y + math.sin(ang) * h; nx, ny = -math.sin(ang) * w / 2, math.cos(ang) * w / 2
        pts = [(x - nx, y - ny), (tipx - nx * .5, tipy - ny * .5), (tipx + math.cos(ang) * w * .6, tipy + math.sin(ang) * w * .6), (tipx + nx * .5, tipy + ny * .5), (x + nx, y + ny)]
        m = cv.mask(lambda d, pts=pts: d.polygon(pts, fill=255)) & cav
        ramp = ('#7a3a08', '#c06a14', '#f0a030', '#ffd870', '#fff8d0') if r.random() < .75 else ('#14503a', '#1e8a5e', '#4cc08a', '#b4f4d4', '#f0fff8')
        cv.paint(m, ramp, np.clip(bevel(cv, m, width=5, rim=.7, light=(-1, -.4), vg=.1) + .15 * pulse, 0, 1))
        facet = cv.mask(lambda d, x=x, y=y, tipx=tipx, tipy=tipy: d.line((x, y, tipx, tipy), fill=255)) & m
        cv.flat(facet, ramp[4])
    cv.glow(160, 190, 120 + 10 * pulse, '#ffc860', int(70 + 50 * pulse))
    core = cv.mask(lambda d: d.ellipse((128, 152 - 3 * pulse, 192, 216 + 3 * pulse), fill=255))
    cv.paint(core, ('#f0a030', '#ffd870', '#fff8d0', '#ffffff'), np.clip(1 - np.hypot(cv.xx - 160, cv.yy - 184) / 26 + .2 * pulse, 0, 1))
    emblem(cv, 'earth', 160, 184, 10, ('#7a3a08', '#a8661c', '#e0a030', '#ffe080'))
    # rubble base + carved steps (rows 4-5)
    for (x, y, w, h) in ((0, 300, 70, 60), (250, 296, 70, 64), (40, 326, 60, 40), (220, 326, 60, 40), (0, 340, 40, 44), (280, 340, 40, 44)):
        shape(cv, lambda d, x=x, y=y, w=w, h=h: d.polygon([(x, y + h), (x + w * .1, y + h * .3), (x + w * .45, y), (x + w * .9, y + h * .25), (x + w, y + h)], fill=255), p['stone'], width=7, rim=.6)
    steps(cv, p, 322, n=3, x0=86, x1=233, inset=12)
    for x in (100, 220): cv.glow(x, 330, 24, '#ffc860', 80)
    return cv.img()

def cp_grass(f):
    p = P['grass']; cv = Cv(CW, CH); ph = f * math.pi / 2; r = random.Random(52)
    # great trunk (behind roots), hollow glowing door
    trunk = cv.mask(lambda d: d.polygon([(110, 330), (122, 220), (128, 120), (118, 60), (202, 60), (192, 120), (198, 220), (210, 330)], fill=255))
    bark = np.clip(.45 + .3 * np.sin(cv.xx / 4 + np.sin(cv.yy / 17) * 3) + .2 * (cv.xx - 160) / -60, 0, 1)
    cv.paint(trunk, ('#2a180c', '#4a2c16', '#6e4626', '#94683c', '#b88c58'), bark); cv.outline(trunk)
    door = cv.mask(lambda d: arch(d, 140, 180, 218, 300))
    cv.paint(door, ('#4a8a20', '#8acc3a', '#d8ff8a', '#ffffe0'), np.clip(1 - (cv.yy - 218) / 90 + .1 * math.sin(ph), 0, 1)); cv.outline(door, (40, 24, 12))
    cv.glow(160, 262, 60, '#d8ff8a', 90)
    # roots sprawling across rows 4-5
    for sgn in (-1, 1):
        for k, (len_, y0) in enumerate(((150, 300), (120, 318), (90, 338))):
            pts = [(160 + sgn * (40 + t * len_ / 10), y0 + 24 * math.sin(t / 3) + t * 2) for t in range(11)]
            m = cv.mask(lambda d, pts=pts, k=k: d.line(pts, fill=255, width=22 - k * 4)); cv.paint(m, ('#2a180c', '#4a2c16', '#6e4626', '#94683c'), bevel(cv, m, width=5, rim=.6, vg=0)); cv.outline(m)
    shape(cv, lambda d: d.rectangle((80, 352, 240, 383), fill=255), p['stone'], width=5)  # mossy step
    cv.flat(cv.mask(lambda d: d.line((82, 354, 238, 354), fill=255)), p['main'][4])
    # canopy: layered leaf clusters (rows 0-2)
    clusters = [(160, 40, 80), (80, 60, 64), (240, 60, 64), (40, 110, 48), (280, 110, 48), (110, 110, 56), (210, 110, 56), (160, 100, 60)]
    for i, (x, y, rr) in enumerate(clusters):
        x += 2 * math.sin(ph + i)
        m = cv.mask(lambda d, x=x, y=y, rr=rr: [d.ellipse((x - rr + j * rr * .4 - rr * .3, y - rr * .6 + (j % 2) * 10, x - rr * .3 + j * rr * .4 + rr * .5, y + rr * .6), fill=255) for j in range(4)])
        m &= cv.yy < 200
        v = bevel(cv, m, width=12, rim=.6, vg=.4, noise=.15, seed=i)
        cv.paint(m, ('#0a2a10', '#144a1a', '#1e6a24', '#2e8e30', '#4eb040', '#8ad85a'), v, dither=1.4); cv.outline(m, (10, 30, 14))
    leaf = (cv.a[..., 3] > 0) & (cv.yy < 200) & ~trunk
    spots = leaf & ((np.sin(cv.xx * 1.7) * np.sin(cv.yy * 1.3)) > .93); cv.flat(spots, '#a8e870')
    # glowing blossoms (twinkle) + hanging vines
    for i in range(18):
        x, y = r.uniform(30, 290), r.uniform(20, 170)
        if not leaf[int(y), int(x)]: continue
        on = (i + f) % 4 != 0; c = '#ffe8f0' if on else '#f0a0c0'
        cv.flat(cv.mask(lambda d, x=x, y=y: d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=255)), c)
        if on: cv.glow(x, y, 10, '#fff8c0', 120)
    for x in (60, 100, 220, 262):
        pts = [(x + 3 * math.sin(yy / 9 + ph), yy) for yy in range(150, 240, 4)]
        cv.flat(cv.mask(lambda d, pts=pts: d.line(pts, fill=255, width=2)), '#2e8e30')
    return cv.img()

def cp_light(f):
    p = P['light']; cv = Cv(CW, CH)
    inner = niche(cv, p, ybot=300)
    cv.paint(inner, ('#c8a050', '#e0bc6a', '#f0d48a', '#fae8b0', '#fff8e0'), np.clip(1 - np.hypot(cv.xx - 160, cv.yy - 120) / 200, 0, 1), dither=1.3)
    cx, cy = 160, 120
    ang = np.arctan2(cv.yy - cy, cv.xx - cx); rad = np.hypot(cv.xx - cx, cv.yy - cy)
    rays = inner & (np.sin(ang * 16 + f * math.pi / 2) > .55) & (rad > 66)
    cv.a[rays, :3] = np.minimum(255, cv.a[rays, :3] + 40)
    # gold sun disc with rotating spikes (16 spikes, 1/4 spacing per frame -> seamless)
    for k in range(16):
        a = k * math.pi / 8 + f * math.pi / 32; L = 100 if k % 2 == 0 else 82
        pts = [(cx + math.cos(a - .12) * 58, cy + math.sin(a - .12) * 58), (cx + math.cos(a) * L, cy + math.sin(a) * L), (cx + math.cos(a + .12) * 58, cy + math.sin(a + .12) * 58)]
        m = cv.mask(lambda d, pts=pts: d.polygon(pts, fill=255)); cv.paint(m, p['acc'], bevel(cv, m, width=3, rim=.6, vg=0)); cv.outline(m, (110, 70, 20))
    shape(cv, lambda d: d.ellipse((cx - 64, cy - 64, cx + 64, cy + 64), fill=255), p['acc'], width=8, rim=.7)
    face = cv.mask(lambda d: d.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), fill=255))
    cv.paint(face, ('#e0a020', '#f4c840', '#ffe070', '#fff4b0', '#ffffff'), np.clip(1 - rad / 60 + .08 * math.sin(f * math.pi / 2), 0, 1))
    ringm = face & (np.abs(rad - 36) < 1.5); cv.flat(ringm, '#c88a18')
    emblem(cv, 'light', cx, cy, 24, ('#c88a18', '#e0a828', '#ffd860', '#fff8d0'))
    cv.glow(cx, cy, 150, '#fff8d0', 90)
    # light shafts falling onto the altar
    for i, x in enumerate((110, 160, 210)):
        m = cv.mask(lambda d, x=x: d.polygon([(x - 6, 186), (x + 6, 186), (x + 26, 300), (x - 26, 300)], fill=255)) & inner
        cv.a[m, :3] = np.minimum(255, cv.a[m, :3] + 22 + 12 * ((i + f) % 2))
    # golden altar + steps
    shape(cv, lambda d: d.rectangle((70, 236, 250, 290), fill=255), p['stone'], width=7)
    shape(cv, lambda d: d.rectangle((60, 226, 260, 240), fill=255), p['acc'], width=4)
    for x in (100, 160, 220): emblem(cv, 'light', x, 264, 12, p['acc'])
    for x in (84, 236):  # altar candles
        shape(cv, lambda d, x=x: d.rectangle((x - 4, 200, x + 4, 226), fill=255), ('#e8dcc0', '#fff8e8', '#ffffff'), width=2)
        brazier_flame(cv, 'light', x, 200, 5, f); cv.glow(x, 192, 18, '#fff4b0', 110)
    steps(cv, p, 292, n=4, x0=20, x1=299, inset=14)
    # winged statues at the base corners
    for x, s in ((28, 1), (292, -1)):
        shape(cv, lambda d, x=x, s=s: d.polygon([(x, 180), (x + s * 26, 150), (x + s * 18, 196), (x + s * 30, 224), (x, 250)], fill=255), p['stone'], width=5)
        shape(cv, lambda d, x=x: d.rectangle((x - 10, 250, x + 10, 300), fill=255), p['acc'], width=4)
    return cv.img()

def cp_mystic(f):
    p = P['mystic']; cv = Cv(CW, CH); r = random.Random(77)
    inner = niche(cv, p, ybot=296)
    cv.paint(inner, ('#06040e', '#0e0a20', '#1a1236', '#2a1c52', '#3e2a74'), np.clip(np.hypot(cv.xx - 160, cv.yy - 150) / -220 + 1, 0, 1) * .8)
    for i in range(70):  # twinkling stars
        x, y = r.uniform(30, 290), r.uniform(26, 290)
        if not inner[int(y), int(x)]: continue
        b = (i + f) % 4
        cv.flat(cv.mask(lambda d, x=x, y=y: d.point((x, y), fill=255)), ('#6a5aa0', '#a898e0', '#e8e0ff', '#ffffff')[b])
        if b == 3 and i % 3 == 0: cv.flat(cv.mask(lambda d, x=x, y=y: d.line((x - 2, y, x + 2, y), fill=255)) | cv.mask(lambda d, x=x, y=y: d.line((x, y - 2, x, y + 2), fill=255)), '#e8e0ff')
    cx, cy = 160, 140
    rings = [(118, 30, -.25, 4), (92, 44, .35, 3), (66, 60, 0, 2)]
    # back halves of rings
    def ring(rx, ry, tilt, front):
        pts = []
        for k in range(181):
            a = k / 180 * math.pi + (0 if front else math.pi)
            x, y = rx * math.cos(a), ry * math.sin(a)
            pts.append((cx + x * math.cos(tilt) - y * math.sin(tilt), cy + x * math.sin(tilt) + y * math.cos(tilt)))
        m = cv.mask(lambda d: d.line(pts, fill=255, width=5)); cv.paint(m, p['acc'], bevel(cv, m, width=2, rim=.6, vg=0)); cv.outline(m, (40, 28, 10))
        for k in range(0, 181, 30): cv.flat(cv.mask(lambda d, q=pts[k]: d.ellipse((q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2), fill=255)), p['acc'][3])
    def orbs(rx, ry, tilt, n, front):
        for k in range(n):
            a = k * 2 * math.pi / n + f * (2 * math.pi / n) / NF
            if (math.sin(a) > 0) != front: continue
            x, y = rx * math.cos(a), ry * math.sin(a)
            ox, oy = cx + x * math.cos(tilt) - y * math.sin(tilt), cy + x * math.sin(tilt) + y * math.cos(tilt)
            col = (('#5a2eac', '#7e4ed4', '#b08af4', '#ffffff'), ('#1a6a8a', '#2ea0c0', '#8ae0f0', '#ffffff'), ('#8a2a6a', '#c04a9a', '#f08ad0', '#ffffff'))[k % 3]
            cv.glow(ox, oy, 16, col[2], 110)
            m = cv.mask(lambda d: d.ellipse((ox - 8, oy - 8, ox + 8, oy + 8), fill=255)); cv.paint(m, col, bevel(cv, m, width=5, rim=.8, vg=.2)); cv.outline(m)
    for rx, ry, tilt, n in rings: ring(rx, ry, tilt, False); orbs(rx, ry, tilt, n, False)
    # the core: glowing rune sphere
    cv.glow(cx, cy, 70, '#c8a8ff', 120)
    core = cv.mask(lambda d: d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=255))
    cv.paint(core, ('#401c82', '#7e4ed4', '#b08af4', '#e8dcff', '#ffffff'), bevel(cv, core, width=18, rim=.7, vg=.3, light=(-.6, -.8))); cv.outline(core)
    emblem(cv, 'mystic', cx, cy, 16 + (f % 2), ('#b08af4', '#e0d0ff', '#ffffff'))
    for rx, ry, tilt, n in rings: ring(rx, ry, tilt, True); orbs(rx, ry, tilt, n, True)
    # rune-circle pedestal + floating rune stones
    shape(cv, lambda d: d.ellipse((30, 262, 289, 342), fill=255), p['stone'], width=8, rim=.6)
    rc = cv.mask(lambda d: d.ellipse((54, 274, 265, 330), outline=255, width=2)); cv.flat(rc, p['glow'])
    rc2 = cv.mask(lambda d: d.ellipse((90, 286, 229, 318), outline=255, width=1)); cv.flat(rc2, '#e0d0ff')
    for k in range(8):
        a = k * math.pi / 4 + f * math.pi / 16; x, y = 160 + 92 * math.cos(a), 302 + 22 * math.sin(a)
        cv.flat(cv.mask(lambda d, x=x, y=y: d.polygon([(x, y - 4), (x + 3, y), (x, y + 4), (x - 3, y)], fill=255)), '#ffffff')
    cv.glow(160, 302, 110, '#b08af4', 60)
    steps(cv, p, 330, n=3, x0=60, x1=259, inset=14)
    for x, bob in ((26, 0), (294, 2)):
        y = 214 + 4 * math.sin(f * math.pi / 2 + bob)
        cv.glow(x, y + 20, 18, '#c8a8ff', 100)
        shape(cv, lambda d, x=x, y=y: d.polygon([(x - 12, y + 40), (x - 14, y + 10), (x - 6, y), (x + 8, y), (x + 14, y + 12), (x + 12, y + 40)], fill=255), p['stone'], width=5)
        cv.flat(cv.mask(lambda d, x=x, y=y: d.line((x, y + 8, x, y + 32), fill=255)) | cv.mask(lambda d, x=x, y=y: d.ellipse((x - 6, y + 14, x + 6, y + 26), outline=255)), p['glow'])
        shape(cv, lambda d, x=x: d.ellipse((x - 16, 330, x + 16, 346), fill=255), p['stone'], width=3)
        shape(cv, lambda d, x=x: d.rectangle((x - 12, 340, x + 12, 383), fill=255), p['stone'], width=4)
    return cv.img()

def cp_dark(f):
    p = P['dark']; cv = Cv(CW, CH); pulse = (f % 2)
    inner = niche(cv, p, ybot=300)
    cv.paint(inner, ('#05030a', '#0c0618', '#160a28', '#24103e', '#361a58'), np.clip(1 - cv.yy / 300, 0, 1))
    # blood-violet moon behind the throne
    cv.glow(160, 86, 90, '#9a4ab8', 80)
    moon = cv.mask(lambda d: d.ellipse((104, 30, 216, 142), fill=255))
    cv.paint(moon, ('#4a2a5a', '#7a4a8a', '#b088c0', '#e0c8ec'), bevel(cv, moon, width=20, rim=.4, vg=.3))
    for (x, y, rr) in ((140, 70, 8), (180, 100, 10), (170, 56, 5)): cv.flat(cv.mask(lambda d, x=x, y=y, rr=rr: d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=255)), '#8a5a9a')
    # obsidian throne: jagged tall back
    back = cv.mask(lambda d: d.polygon([(100, 260), (96, 120), (108, 70), (120, 104), (134, 24), (148, 92), (160, 4), (172, 92), (186, 24), (200, 104), (212, 70), (224, 120), (220, 260)], fill=255))
    cv.paint(back, ('#06040a', '#120e1a', '#201a2c', '#342a44', '#5a4a72'), bevel(cv, back, width=10, rim=.8, vg=.15, light=(-.9, -.4))); cv.outline(back, (0, 0, 0))
    sheen = back & (np.abs((cv.xx - 160) * .5 - (cv.yy - 150) * .3) % 22 < 1.2); cv.flat(sheen, '#6a5a88')
    eye = cv.mask(lambda d: d.ellipse((144, 132, 176, 152), fill=255)); cv.flat(eye, '#120818')
    iris = cv.mask(lambda d: d.ellipse((154 - pulse, 134 - pulse, 166 + pulse, 150 + pulse), fill=255)); cv.paint(iris, p['fire'], np.clip(1 - np.hypot(cv.xx - 160, cv.yy - 142) / 8, 0, 1))
    cv.glow(160, 142, 34 + 6 * pulse, '#c890ff', 120)
    for side in (1, -1):
        a, b = sorted((160 + side * 60, 160 + side * 96))
        shape(cv, lambda d, a=a, b=b: d.polygon([(a, 196), (b, 196), (b + 2, 264), (a - 2, 264)], fill=255), p['stone'], width=6, rim=.7)
        shape(cv, lambda d, a=a, b=b, s=side: d.polygon([(a - 4, 190), (b + 4, 190), (b + 4 if s > 0 else b, 182), (a if s > 0 else a - 4, 182)], fill=255), p['acc'], width=3)
    shape(cv, lambda d: d.rectangle((114, 214, 206, 262), fill=255), p['main'], width=6)
    # raven statues on plinths (left/right), eyes glowing
    for x, s in ((34, 1), (286, -1)):
        shape(cv, lambda d, x=x: d.rectangle((x - 24, 220, x + 24, 300), fill=255), p['stone'], width=6, rim=.6)
        shape(cv, lambda d, x=x: d.rectangle((x - 28, 212, x + 28, 224), fill=255), p['acc'], width=3)
        body = cv.mask(lambda d, x=x, s=s: [d.ellipse((x - 18, 150, x + 18, 214), fill=255), d.ellipse((x - 14 + s * 4, 124, x + 10 + s * 4, 156), fill=255),
                                             d.polygon([(x + s * 12, 134), (x + s * 30, 142), (x + s * 12, 148)], fill=255),
                                             d.polygon([(x - s * 16, 160), (x - s * 34, 100 + (f % 2) * 4), (x - s * 26, 140), (x - s * 18, 196)], fill=255)])
        cv.paint(body, ('#06040a', '#16101e', '#2a2238', '#4a3e60'), bevel(cv, body, width=6, rim=.8, light=(-s * .9, -.5))); cv.outline(body, (0, 0, 0))
        ex = x + s * 6; cv.flat(cv.mask(lambda d, ex=ex: d.ellipse((ex - 2, 134, ex + 2, 138), fill=255)), '#e0b0ff'); cv.glow(ex, 136, 10 + 3 * pulse, '#c890ff', 140)
    # obsidian steps with violet seams + purple flame bowls
    steps(cv, p, 296, n=4, x0=40, x1=279, inset=14)
    for y in (300, 320, 340): cv.flat(cv.mask(lambda d, y=y: d.line((60, y + 18, 260, y + 18), fill=255)), '#7a3ab8')
    for x in (16, 304):
        shape(cv, lambda d, x=x: d.rectangle((x - 14, 320, x + 14, 383), fill=255), p['stone'], width=4)
        shape(cv, lambda d, x=x: d.chord((x - 16, 304, x + 16, 330), 0, 180, fill=255), p['acc'], width=3)
        brazier_flame(cv, 'dark', x, 318, 10, f); cv.glow(x, 304, 26, '#b06aff', 120)
    return cv.img()

CENTRE = {'water': cp_water, 'fire': cp_fire, 'wind': cp_wind, 'earth': cp_earth, 'grass': cp_grass, 'light': cp_light, 'mystic': cp_mystic, 'dark': cp_dark}
CENTRE_WHAT = {'water': 'Tidal cathedral: stained-glass rose window, a waterfall from a shell spout into a rippling basin, swaying kelp',
               'fire': 'Lava throne: crowned basalt throne with magma cracks, two dragon-spout molten falls into a lava moat',
               'wind': 'Sky platform: giant four-blade wind turbine turning against drifting clouds, streaming banners, cloud-wreathed marble steps',
               'earth': 'Colossal geode: split agate shell full of pulsing amber and jade crystal spires round a glowing core',
               'grass': 'Ancient great tree: layered swaying canopy with twinkling blossoms, a glowing hollow door, sprawling roots',
               'light': 'Sun-disc cathedral: turning gold sun disc with radiating rays, light shafts onto a golden altar, winged statues',
               'mystic': 'Floating rune orrery: three brass rings with orbiting orbs round a rune sphere, starfield niche, rune circle, floating rune stones',
               'dark': 'Obsidian throne: jagged throne with a glowing eye under a violet moon, two raven statues, purple flame bowls'}
TYPES = list(CENTRE)

def build(t):
    """-> list of (name, 64x64 image, collision, frames|None) and the sheet name for this type. Frame cells that never change are single tiles."""
    out = []
    def add_anim(name, frames, col):
        if all(np.array_equal(np.array(frames[0]), np.array(fr)) for fr in frames[1:]): out.append((name, frames[0], col, None))
        else:
            out.append((name, frames[0], col, [f'{name}__f{k}' for k in range(1, len(frames))]))
            for k, fr in enumerate(frames[1:], 1): out.append((f'{name}__f{k}', fr, col, 'frame'))
    cps = [slice_cells(CENTRE[t](f), 5, 6) for f in range(NF)]
    for r in range(6):
        for c in range(5):
            solid = max((np.asarray(cp[(r, c)])[..., 3] >= 200).mean() for cp in cps) > .04
            add_anim(f'a3_{t}_centre_{r}_{c}', [cp[(r, c)] for cp in cps], 1 if solid or r < 3 else 0)  # grid-fit: empty cells stay walkable
    pils = [slice_cells(framing_pillar(t, f), 1, 5) for f in range(NF)]
    for r in range(5): add_anim(f'a3_{t}_pillar_{r}_0', [pl[(r, 0)] for pl in pils], 1)
    bn = slice_cells(banner(t), 1, 2); [out.append((f'a3_{t}_banner_{r}_0', bn[(r, 0)], 1, None)) for r in range(2)]
    ob = slice_cells(obelisk(t), 1, 2); [out.append((f'a3_{t}_obelisk_{r}_0', ob[(r, 0)], 1, None)) for r in range(2)]
    add_anim(f'a3_{t}_brazier', [brazier(t, f) for f in range(NF)], 1)
    for k in 'ab': out.append((f'a3_{t}_floor_{k}', floor(t, k), 0, None))
    for part in ('l', 'r'): out.append((f'a3_{t}_carpet_{part}', carpet(t, part), 0, None))
    for k in 'ab': out.append((f'a3_{t}_carpet_m_{k}', carpet(t, 'm', k), 0, None))
    for part in 'lmr': out.append((f'a3_{t}_dais_{part}', dais(t, part), 0, None))
    return out

if __name__ == '__main__':
    import sys, os
    os.makedirs('/tmp/a3', exist_ok=True)
    for t in sys.argv[1:] or TYPES:
        for f in range(NF): CENTRE[t](f).resize((640, 768), Image.NEAREST).save(f'/tmp/a3/{t}_{f}.png')
        print(t)
