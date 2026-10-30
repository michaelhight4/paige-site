"""Lean pass for the Wellspire flashback lab props (Director, Oct 30 2026).

Every free-standing prop is redrawn from ONE shared viewpoint: ~35 deg top-down lean (top faces foreshortened to
sin(35) ~ 0.57 of their depth, fronts at cos(35) ~ 0.82 of their height), light from the top-left, soft shadow cast
down-right and kept inside the prop's own squares. Built on the house kit (tools/furniture_v2/kitlib.py: shade(),
outline()) so outlines / shading ramps match the rest of Kilumen.

Shading is done with a separate GREYSCALE layer per prop: albedo is painted flat, faces are painted into an 'L' layer
(TOP=224, FRONT=150, SIDE=112, NEUTRAL/emissive=184) and the final pixel = albedo * layer/184. The top faces therefore
always read lighter than the fronts; tools/wellspire_lab/qa_sheets.py measures this per prop.

lean_props() returns {tile_name: 64x64 RGBA} for names that lab_art_kit.py already registers; lab_art_kit.build()
swaps them in, so every tile id, collision code and map stays exactly as it was.
"""
import math, os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'furniture_v2'))
from kitlib import shade  # noqa: E402

LEAN = math.radians(35)
KTOP, KFRONT = math.sin(LEAN), math.cos(LEAN)          # 0.57 / 0.82
TOP, FRONT, SIDE, NEU = 224, 150, 112, 184
STEEL = (150, 166, 184); DARKSTEEL = (92, 104, 122); GLASS_HI = (255, 255, 255)
GLOW = {'cyan': ((90, 236, 255), (30, 150, 200)), 'amber': ((255, 196, 80), (190, 110, 30)), 'green': ((140, 255, 150), (40, 160, 80)),
        'violet': ((210, 150, 255), (120, 70, 210))}


class Lit:
    """Albedo + greyscale shading layer + emissive mask, 32 px per tile, upscaled x2 like the rest of the kit."""
    def __init__(s, w, h):
        s.w, s.h = w, h; W, H = 32 * w, 32 * h
        s.a = Image.new('RGBA', (W, H), (0, 0, 0, 0)); s.s = Image.new('L', (W, H), NEU); s.e = Image.new('L', (W, H), 0)
        s.da, s.ds, s.de = ImageDraw.Draw(s.a), ImageDraw.Draw(s.s), ImageDraw.Draw(s.e)

    def _do(s, fn, args, col, sh, glow):
        getattr(s.da, fn)(*args, fill=tuple(col[:3]) + ((col[3],) if len(col) > 3 else (255,)))
        getattr(s.ds, fn)(*args, fill=sh); getattr(s.de, fn)(*args, fill=255 if glow else 0)

    def rect(s, box, col, sh=NEU, glow=False): s._do('rectangle', (box,), col, sh, glow)
    def ell(s, box, col, sh=NEU, glow=False): s._do('ellipse', (box,), col, sh, glow)
    def poly(s, pts, col, sh=NEU, glow=False): s._do('polygon', (pts,), col, sh, glow)
    def line(s, pts, col, sh=NEU, glow=False, w=1):
        s.da.line(pts, fill=tuple(col[:3]) + (255,), width=w); s.ds.line(pts, fill=sh, width=w); s.de.line(pts, fill=255 if glow else 0, width=w)
    def px(s, x, y, col, glow=True): s.rect((x, y, x, y), col, NEU, glow)

    # ---- shared solids, all on the same lean ----
    def box(s, x0, x1, y_top, depth, height, col, glow_strip=None):
        """Box whose top face starts at y_top: top = depth*0.57 rows (TOP), front = height*0.82 rows (FRONT)."""
        t = max(2, round(depth * KTOP)); f = max(2, round(height * KFRONT))
        s.rect((x0, y_top, x1, y_top + t - 1), col, TOP); s.rect((x0, y_top + t, x1, y_top + t + f - 1), col, FRONT)
        s.line([(x0, y_top + t - 1), (x1, y_top + t - 1)], shade(col, 1.3), NEU)            # bright front edge of the top
        s.rect((x1 - 1, y_top + t, x1, y_top + t + f - 1), col, SIDE)                       # right side in shadow
        if glow_strip: s.rect((x0 + 3, y_top + t + f // 2, x1 - 4, y_top + t + f // 2), glow_strip, NEU, True)
        return y_top + t + f

    def disc(s, cx, cy, rx, col, sh=TOP, glow=False):
        ry = max(1, round(rx * KTOP)); s.ell((cx - rx, cy - ry, cx + rx, cy + ry), col, sh, glow); return ry

    def drum(s, cx, rx, y_top, height, col, glow_ring=None):
        """Short cylinder (lid / base): elliptical TOP face, FRONT band below with a rounded bottom edge."""
        ry = round(rx * KTOP); f = max(2, round(height * KFRONT))
        s.ell((cx - rx, y_top + f, cx + rx, y_top + f + 2 * ry), col, FRONT)
        s.rect((cx - rx, y_top + ry, cx + rx, y_top + ry + f), col, FRONT)
        s.rect((cx + rx - 3, y_top + ry, cx + rx, y_top + ry + f), col, SIDE)
        if glow_ring: s.rect((cx - rx + 3, y_top + ry + f // 2, cx + rx - 3, y_top + ry + f // 2), glow_ring, NEU, True)
        s.ell((cx - rx, y_top, cx + rx, y_top + 2 * ry), col, TOP)
        s.ell((cx - rx + 2, y_top + 1, cx + rx - 2, y_top + 2 * ry - 1), shade(col, 1.08), TOP)
        return y_top + ry + f  # y of the front-band's bottom centre line

    def glass_cyl(s, cx, rx, y0, y1, k):
        """Lit glass body from y0 (lid rim centre) to y1 (base rim centre): curved front, cylinder ramp, top-left highlight."""
        g0, g1 = GLOW[k]; ry = round(rx * KTOP)
        for x in range(cx - rx, cx + rx + 1):
            u = (x - cx) / rx; f = min(1, abs(u + 0.25) * 0.85)                       # brightest a little left of centre
            col = tuple(int(g0[i] * (1 - f * 0.7) + g1[i] * f * 0.7) for i in range(3))
            yb = y1 + int(ry * math.sqrt(max(0, 1 - u * u)))
            s.line([(x, y0), (x, yb)], col, NEU if u < 0.55 else 140, True)
        s.line([(cx - rx + 3, y0 + 3), (cx - rx + 3, y1 - 2)], GLASS_HI + (150,), NEU, True)
        s.line([(cx - rx + 5, y0 + 3), (cx - rx + 5, y0 + (y1 - y0) // 3)], GLASS_HI + (110,), NEU, True)

    def sleeper(s, cx, cy, r, k):
        dk = tuple(int(v * 0.42) for v in GLOW[k][1])
        s.ell((cx - r, cy - r + 2, cx + r, cy + r), dk, NEU, True); s.ell((cx - r // 2 - 1, cy - r - 3, cx + r // 2 - 1, cy - 1), dk, NEU, True)
        s.px(cx - 2, cy - r, GLOW[k][0])

    def shadow(s, box):
        """Soft down-right floor shadow under the prop (kept inside the canvas = inside its own squares)."""
        x0, y0, x1, y1 = box; W, H = s.a.size
        sh = Image.new('RGBA', s.a.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
        d.ellipse((x0 + 3, y0, min(W - 1, x1 + 3), min(H - 1, y1)), fill=(20, 18, 30, 70))
        d.ellipse((x0 + 2, y0 + 1, min(W - 1, x1 + 1), min(H - 2, y1 - 1)), fill=(20, 18, 30, 95))
        s.under = sh

    def render(s):
        alb = s.a; out = Image.new('RGBA', alb.size, (0, 0, 0, 0)); A, S, Em = alb.load(), s.s.load(), s.e.load(); O = out.load()
        for y in range(alb.height):
            for x in range(alb.width):
                r, g, b, a = A[x, y]
                if not a: continue
                k = S[x, y] / NEU
                if Em[x, y]: k = 1 + (k - 1) * 0.35                                         # glow is lit from inside
                O[x, y] = tuple(max(0, min(255, int(v * k))) for v in (r, g, b)) + (a,)
        # house outline: dark self-colour ring around the silhouette
        src = out.copy(); sp = src.load()
        for y in range(out.height):
            for x in range(out.width):
                if sp[x, y][3] >= 200: continue
                for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                    X, Y = x + dx, y + dy
                    if 0 <= X < out.width and 0 <= Y < out.height and sp[X, Y][3] >= 200: O[x, y] = shade(sp[X, Y], 0.42); break
        if getattr(s, 'under', None) is not None: out = Image.alpha_composite(s.under, out)
        return out

    def tiles(s, name):
        big = s.render().resize((64 * s.w, 64 * s.h), Image.NEAREST)
        return {f'{name}_{cx}_{cy}': big.crop((cx * 64, cy * 64, cx * 64 + 64, cy * 64 + 64)) for cy in range(s.h) for cx in range(s.w)}

    def shade_map(s):
        return s.s.resize((64 * s.w, 64 * s.h), Image.NEAREST)


SHADE_MAPS = {}


def _reg(out, name, c):
    out.update(c.tiles(name)); SHADE_MAPS[name] = (c.shade_map(), (c.w, c.h))


def tank(k):  # 1x2 specimen cylinder
    c = Lit(1, 2); c.shadow((5, 46, 31, 63))
    yb = c.drum(16, 13, 46, 9, DARKSTEEL, GLOW[k][0])               # base plinth
    c.glass_cyl(16, 11, 12, 50, k); c.sleeper(15, 32, 6, k)
    for (x, y) in ((21, 20), (12, 16), (20, 42)): c.px(x, y, (255, 255, 255))
    c.drum(16, 12, 2, 7, STEEL)                                      # lid
    c.rect((10, 0, 11, 2), DARKSTEEL, FRONT); c.rect((20, 0, 21, 2), DARKSTEEL, FRONT)   # feed pipes into the ceiling
    return c


def bigtank(k):  # 2x3
    c = Lit(2, 3); c.shadow((4, 74, 63, 95))
    c.drum(32, 28, 74, 10, DARKSTEEL, GLOW[k][0])
    c.glass_cyl(32, 25, 20, 80, k); c.sleeper(31, 50, 12, k)
    dk = tuple(int(v * 0.42) for v in GLOW[k][1]); c.ell((36, 56, 46, 64), dk, NEU, True); c.ell((39, 58, 44, 62), GLOW[k][1], NEU, True)  # curled tail
    for (x, y) in ((44, 26), (18, 34), (46, 48), (20, 72), (38, 76)): c.px(x, y, (255, 255, 255))
    c.drum(32, 27, 3, 10, STEEL)
    for x in (14, 48): c.rect((x, 0, x + 3, 4), DARKSTEEL, FRONT)
    return c


def scan_table():  # 3x2 octagonal holo scan plinth
    c = Lit(3, 2); c.shadow((6, 30, 95, 63))
    top = [(20, 24), (76, 24), (88, 31), (88, 42), (76, 48), (20, 48), (8, 42), (8, 31)]  # 80 wide x 24 deep (~42 * 0.57)
    c.poly([(8, 42), (20, 48), (76, 48), (88, 42), (88, 55), (76, 61), (20, 61), (8, 55)], DARKSTEEL, FRONT)
    c.poly([(76, 48), (88, 42), (88, 55), (76, 61)], DARKSTEEL, SIDE)
    c.line([(12, 54), (20, 58), (76, 58), (84, 54)], GLOW['cyan'][0], NEU, True)
    c.poly(top, STEEL, TOP); c.line([(8, 42), (20, 48), (76, 48), (88, 42)], shade(STEEL + (255,), 1.3), NEU)
    c.poly([(24, 28), (72, 28), (80, 33), (80, 40), (72, 44), (24, 44), (16, 40), (16, 33)], (26, 60, 84), TOP)
    for rx, col in ((22, (60, 200, 230)), (13, (90, 236, 255))):
        ry = round(rx * KTOP); c.ell((48 - rx, 36 - ry, 48 + rx, 36 + ry), col, NEU, True)
        c.ell((48 - rx + 2, 36 - ry + 2, 48 + rx - 2, 36 + ry - 2), (26, 60, 84), TOP)
    for i in range(6):  # light cone up to the holo creature
        c.line([(42 + i * 2, 35), (44 + i, 20)], (60, 200, 230, 120), NEU, True)
    h = (150, 248, 255)
    c.ell((39, 6, 57, 20), (60, 200, 230), NEU, True); c.ell((41, 7, 55, 18), h, NEU, True)   # holo creature, same lean
    c.ell((44, 2, 52, 8), h, NEU, True); c.line([(48, 2), (48, 0)], h, NEU, True)
    c.line([(43, 19), (41, 24)], h, NEU, True); c.line([(53, 19), (55, 24)], h, NEU, True); c.px(47, 4, (20, 40, 60))
    for x in (22, 72): c.rect((x, 51, x + 3, 53), (255, 120, 220), NEU, True)
    return c


def helix():  # 2x4 energy column
    c = Lit(2, 4); c.shadow((4, 106, 63, 127))
    c.drum(32, 29, 104, 12, DARKSTEEL, GLOW['cyan'][0])
    rx = 21; y0, y1 = 16, 110; ry = round(rx * KTOP)
    for x in range(32 - rx, 32 + rx + 1):
        u = (x - 32) / rx; f = min(1, abs(u + 0.25)); yb = y1 + int(ry * math.sqrt(max(0, 1 - u * u)))
        c.line([(x, y0), (x, yb)], (int(20 + 40 * (1 - f)), int(70 + 110 * (1 - f)), int(110 + 110 * (1 - f))), NEU, True)
    for i in range(y1 - y0 - 4):
        y = y0 + 4 + i; a = 14 * math.sin(i / 7.0); front = math.cos(i / 7.0) > 0
        c.rect((int(31 + a), y, int(32 + a), y), (200, 255, 255) if front else (120, 190, 210), NEU, True)
        c.rect((int(31 - a), y, int(32 - a), y), (255, 140, 230) if not front else (170, 90, 160), NEU, True)
        if i % 7 == 0: c.line([(int(31 - a), y), (int(32 + a), y)], (90, 236, 255), NEU, True)
    c.line([(15, 20), (15, 106)], GLASS_HI + (110,), NEU, True)
    c.drum(32, 24, 4, 10, STEEL)
    for x in (20, 42): c.rect((x, 0, x + 2, 6), DARKSTEEL, FRONT)
    return c


def crystal_tank(broken=False):  # 6x5 Ondravel tank: box, lid TOP+FRONT, glass front, plinth TOP+FRONT
    c = Lit(6, 5); c.shadow((6, 128, 191, 159))
    x0, x1 = 3, 188
    c.box(x0 - 1, x1 + 1, 136, 14, 15, DARKSTEEL, (210, 150, 255) if not broken else (120, 90, 150))   # plinth: top 8 + front 12
    water_top = 26 if not broken else 120
    # glass body (front face of the tank), back wall dim
    c.rect((x0, 16, x1, 139), (16, 26, 40), FRONT)
    for y in range(water_top, 140):
        f = (y - water_top) / max(1, 140 - water_top)
        c.line([(x0 + 1, y), (x1 - 1, y)], (int(30 + 20 * f), int(110 - 40 * f), int(160 - 30 * f)), NEU, True)
    c.line([(x0 + 1, water_top), (x1 - 1, water_top)], (150, 225, 250), NEU, True)
    for (x, y, h) in ((14, 139, 22), (30, 139, 34), (44, 139, 18), (150, 139, 26), (164, 139, 38), (178, 139, 20), (90, 139, 14), (104, 139, 12)):
        col, dk = ((150, 90, 230), (70, 30, 140)) if not broken else ((110, 70, 170), (60, 25, 110))
        c.poly([(x - 6, y), (x, y - h), (x + 6, y)], col, NEU, True); c.poly([(x, y - h), (x + 6, y), (x + 1, y)], dk, NEU, True)
        c.line([(x - 1, y - h + 3), (x - 3, y - 2)], (230, 200, 255), NEU, True)
    if not broken:
        for x in (49, 96, 143): c.line([(x, 17), (x, 138)], (150, 220, 255), NEU, True)    # glass mullions
        c.line([(9, 20), (9, 132)], GLASS_HI + (150,), NEU, True); c.line([(12, 20), (12, 60)], GLASS_HI + (110,), NEU, True)
        for (x, y) in ((70, 40), (120, 50), (60, 100), (130, 110), (40, 66), (160, 84)): c.px(x, y, (220, 250, 255))
    else:
        for xe in (x0, x1):
            for i, y in enumerate(range(18, 132, 10)):
                d = (5 + (i * 7) % 11) * (1 if xe == x0 else -1); c.poly([(xe, y), (xe + d, y + 5), (xe, y + 10)], (170, 230, 255, 210), NEU, True)
        for i, x in enumerate(range(6, 184, 14)):
            d = 5 + (i * 5) % 13; c.poly([(x, 17), (x + 7, 17 + d), (x + 14, 17)], (170, 230, 255, 210), NEU, True)
        for (a, b) in (((40, 22), (70, 60)), ((70, 60), (60, 90)), ((150, 26), (128, 70)), ((128, 70), (140, 110))): c.line([a, b], (200, 240, 255), NEU, True)
        for (x, y) in ((20, 147), (60, 149), (100, 146), (140, 148), (176, 147), (36, 145), (120, 145)):
            c.poly([(x, y), (x + 4, y - 3), (x + 7, y + 1)], (200, 240, 255), NEU, True)       # shards on the plinth top
    c.rect((x0 - 1, 16, x0 + 1, 139), STEEL, SIDE); c.rect((x1 - 1, 16, x1 + 1, 139), STEEL, SIDE)    # frame posts
    c.box(x0 - 2, x1 + 2, 2, 14, 10, STEEL)                                                         # lid: top 8 + front 8
    for x in (20, 52, 96, 140, 172):                                                                # tube collars on the lid top
        c.disc(x, 6, 4, DARKSTEEL, TOP); c.disc(x, 5, 2, (210, 150, 255) if not broken else (90, 70, 110), NEU, not broken)
    return c


def vat(k, nm):
    """Sunken vat 9-slice: rim TOP faces at floor level, far inner wall below the north rim is a FRONT face (darker)."""
    g0, g1 = GLOW[k]; c = Lit(1, 1); c.rect((0, 0, 31, 31), g1, NEU, True)
    for (x, y) in ((6, 12), (21, 8), (14, 22), (26, 26), (9, 28)): c.rect((x, y, x + 1, y + 1), g0, NEU, True)
    rim = (120, 134, 142)
    n, s_, w, e = 'n' in nm, 's' in nm, 'w' in nm, 'e' in nm
    if n: c.rect((0, 0, 31, 3), rim, TOP); c.rect((0, 4, 31, 9), (78, 92, 100), FRONT); c.line([(0, 3), (31, 3)], shade(rim + (255,), 1.3), NEU)
    if s_: c.rect((0, 28, 31, 31), rim, TOP)
    if w: c.rect((0, 0, 3, 31), rim, TOP); c.rect((4, 4 if n else 0, 5, 27 if s_ else 31), (60, 72, 80), SIDE)
    if e: c.rect((28, 0, 31, 31), rim, TOP)
    return c


def lean_props():
    out = {}
    for k in ('cyan', 'amber', 'green', 'violet'): _reg(out, f'wl_tank_{k}', tank(k))
    for k in ('cyan', 'green'): _reg(out, f'wl_bigtank_{k}', bigtank(k))
    _reg(out, 'wl_scan', scan_table()); _reg(out, 'wl_helix', helix())
    _reg(out, 'wl_bigcrystal', crystal_tank()); _reg(out, 'wl_bigcrystal_broken', crystal_tank(True))
    for k in ('green', 'cyan'):
        for nm in ('nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'):
            c = vat(k, nm); im = c.tiles('x')['x_0_0']; out[f'wl_vat_{k}_{nm}'] = im
    return out


if __name__ == '__main__':
    o = lean_props(); print(len(o), 'lean tiles')
