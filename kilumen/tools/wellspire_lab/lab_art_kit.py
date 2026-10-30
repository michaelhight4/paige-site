"""Wellspire flashback lab art kit (WD, Oct 29 2026, DRAFT).

Draws the wl_* tiles the 10 rebellion-lab rooms need that the shared kit lacks (holo screens, scan table, cylinder tanks in
amber / green / cyan, sunken vats, grate catwalks over a dark pit, the helix energy column, the giant porthole, Ondravel's
crystal tank, floor tubes, dark wall / floor palettes). Recolours reuse existing tiles where they exist (specimen tank,
lab walls, metal floor, salt jars, tall plant). Pixel art is drawn at 32 px (2 px per art pixel) and scaled with nearest
neighbour to 64 / 128 / 192.

Writes tiles_{1,2,3}x/wellspire_lab.png and APPENDS the tiles (ids 12201+, category 'wellspire_lab') to tileset_arena.json,
which src/overworld/tileset.js withArenaArt already loads on every map and the grid-fit tools already read.
Re-running replaces the earlier wl_* entries. No logos, no fog / haze / smoke.
"""
import json, os, re, math, colorsys, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw

OW = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
OW = os.path.normpath(OW)
BASE_ID, CAT, SHEET = 12201, 'wellspire_lab', 'wellspire_lab.png'
SRC = {t['name']: t for f in ('tileset.json', 'tileset_ix2.json') for t in json.load(open(os.path.join(OW, f)))['tiles']}
_sheets = {}


def src_tile(name):
    t = SRC[name]; p = t['sheet']
    if re.search(r'tiles_1x/(interior|i_furniture|i_brand|x_furniture_fix|ix2_kit)\.png$', p): q = p.replace('.png', '_v3.png')
    elif re.search(r'tiles_1x/(i_wall|i_floor)\.png$', p): q = p.replace('.png', '_v2.png')
    else: q = p
    if not os.path.exists(os.path.join(OW, q)): q = p
    if q not in _sheets: _sheets[q] = Image.open(os.path.join(OW, q)).convert('RGBA')
    c, r = t['col'], t['row']
    return _sheets[q].crop((c * 64, r * 64, c * 64 + 64, r * 64 + 64))


def ramp(img, cols):
    """Gradient-map by luminance onto a colour ramp (keeps alpha)."""
    out = img.copy(); px = out.load(); n = len(cols) - 1
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if not a: continue
            l = (0.3 * r + 0.59 * g + 0.11 * b) / 255 * n; i = min(int(l), n - 1); f = l - i
            c0, c1 = cols[i], cols[i + 1]
            px[x, y] = tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(3)) + (a,)
    return out


def hue_swap(img, h_to, sat=1.0, val=1.0, pick=lambda h, s, v: 0.45 < h < 0.62 and s > 0.2):
    out = img.copy(); px = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if pick(h, s, v):
                r2, g2, b2 = colorsys.hsv_to_rgb(h_to, min(1, s * sat), min(1, v * val)); px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out


# ---------- tiny pixel canvas (32 px per tile, upscaled x2) ----------
O = (22, 26, 38, 255)  # outline


class Can:
    def __init__(s, w, h, bg=(0, 0, 0, 0)):
        s.im = Image.new('RGBA', (32 * w, 32 * h), bg); s.d = ImageDraw.Draw(s.im); s.w, s.h = w, h

    def r(s, x0, y0, x1, y1, c, o=None): s.d.rectangle((x0, y0, x1, y1), fill=c, outline=o)

    def p(s, x, y, c): s.d.point((x, y), fill=c)

    def e(s, box, c, o=None): s.d.ellipse(box, fill=c, outline=o)

    def l(s, pts, c, w=1): s.d.line(pts, fill=c, width=w)

    def tiles(s):
        big = s.im.resize((64 * s.w, 64 * s.h), Image.NEAREST)
        return {(cx, cy): big.crop((cx * 64, cy * 64, cx * 64 + 64, cy * 64 + 64)) for cy in range(s.h) for cx in range(s.w)}


def shadow(c, x0, y0, x1, y1): c.r(x0 + 1, y0 + 1, x1 + 1, y1 + 1, (0, 0, 0, 70))


TILES = []  # (name, img, layer, code)


def add(name, img, layer='decoration', code=1): TILES.append((name, img, layer, code))


def add_multi(name, can, layer='decoration', code=1, codes=None):
    for (cx, cy), im in can.tiles().items():
        add(f'{name}_{cx}_{cy}', im, layer, (codes(cx, cy) if codes else code))


# ---------- palettes ----------
PAL = {
    'steel': [(18, 24, 36), (40, 56, 76), (78, 104, 130), (140, 170, 196), (214, 232, 244)],
    'amber': [(30, 18, 10), (78, 46, 20), (150, 92, 34), (222, 156, 64), (255, 226, 160)],
    'green': [(8, 22, 18), (20, 52, 38), (40, 92, 64), (86, 150, 104), (176, 226, 170)],
    'navy': [(10, 14, 30), (22, 34, 64), (44, 68, 112), (92, 128, 176), (190, 214, 240)],
}
GLOW = {'cyan': ((90, 236, 255), (30, 150, 200)), 'amber': ((255, 196, 80), (190, 110, 30)), 'green': ((140, 255, 150), (40, 160, 80)), 'violet': ((210, 150, 255), (120, 70, 210)), 'magenta': ((255, 120, 220), (170, 50, 150))}

# floors + walls (recolours of the shared lab / metal art)
for k, pal in PAL.items():
    add(f'wl_floor_{k}', ramp(src_tile('i_floor_metal_a'), pal), 'ground', 0)
    add(f'wl_floor_{k}_b', ramp(src_tile('i_floor_metal_b'), pal), 'ground', 0)
    for w in ('top', 'upper', 'face'):
        add(f'wl_wall_{w}_{k}', ramp(src_tile(f'i_wall_{w}_lab'), pal), 'ground', 1)

# glow strip floors (walk): steel / green / amber / navy with a lit seam
for k, g in (('steel', 'cyan'), ('green', 'green'), ('amber', 'amber'), ('navy', 'cyan')):
    im = ramp(src_tile('i_floor_metal_a'), PAL[k]); d = ImageDraw.Draw(im)
    d.rectangle((0, 28, 63, 35), fill=GLOW[g][1]); d.rectangle((0, 30, 63, 33), fill=GLOW[g][0]); add(f'wl_strip_{k}', im, 'ground', 0)
    im = ramp(src_tile('i_floor_metal_a'), PAL[k]); d = ImageDraw.Draw(im)
    d.rectangle((28, 0, 35, 63), fill=GLOW[g][1]); d.rectangle((30, 0, 33, 63), fill=GLOW[g][0]); add(f'wl_strip_{k}_v', im, 'ground', 0)

# grate catwalk (walk) and the dark pit under it (block)
for k, g in (('steel', 'cyan'), ('green', 'green')):
    c = Can(1, 1, PAL[k][1] + (255,))
    for i in range(0, 32, 4): c.l([(i, 0), (i, 31)], PAL[k][0] + (255,)); c.l([(0, i), (31, i)], PAL[k][0] + (255,))
    c.r(0, 0, 31, 1, PAL[k][3] + (255,)); c.r(0, 30, 31, 31, PAL[k][0] + (255,))
    add(f'wl_grate_{k}', c.tiles()[(0, 0)], 'ground', 0)
    # Oct 30 (Coder): the pit read as a starfield (scattered glow dots on black). Now a shaft: wall ribs + conduits fading
    # down into a dim glow, tiling seamlessly, no isolated points.
    c = Can(1, 1, (10, 16, 26, 255))
    for y in range(0, 32, 8): c.r(0, y, 31, y + 1, (20, 30, 46, 255)); c.r(0, y + 2, 31, y + 2, (6, 10, 16, 255))
    for x in (6, 24): c.r(x, 0, x + 1, 31, (28, 40, 58, 255)); c.r(x + 2, 0, x + 2, 31, (4, 6, 10, 255))
    gl = GLOW[g][1]; c.r(15, 0, 16, 31, (gl[0] // 4, gl[1] // 4, gl[2] // 4, 255))
    add(f'wl_pit_{k}', c.tiles()[(0, 0)], 'ground', 1)
    c = Can(1, 1, (6, 10, 16, 255)); c.r(0, 0, 31, 5, PAL[k][2] + (255,)); c.r(0, 6, 31, 7, PAL[k][0] + (255,))
    add(f'wl_pit_lip_{k}', c.tiles()[(0, 0)], 'ground', 1)

# holo screens (wall-hung, decoration on the upper wall row)
for v in range(3):
    c = Can(1, 1); g0, g1 = GLOW['cyan'] if v < 2 else GLOW['green']
    c.r(3, 4, 28, 25, (10, 30, 44, 235), g1 + (255,)); c.r(4, 5, 27, 24, (14, 48, 66, 230))
    if v == 0:  # creature body scan: round body, four limbs, crest
        c.e((11, 9, 20, 18), None, g0 + (255,)); c.l([(13, 18), (11, 22)], g0 + (255,)); c.l([(18, 18), (20, 22)], g0 + (255,))
        c.l([(15, 9), (15, 6)], g0 + (255,)); c.p(15, 13, (255, 255, 255, 255)); c.r(22, 7, 25, 8, g1 + (255,)); c.r(22, 10, 24, 11, g1 + (255,))
    elif v == 1:  # wave graph
        pts = [(5 + i, 15 + int(5 * math.sin(i / 2.2))) for i in range(22)]; c.l(pts, g0 + (255,)); c.r(5, 21, 26, 21, g1 + (255,))
    else:  # double helix
        for i in range(18):
            y = 6 + i; a = int(5 * math.sin(i / 2.5)); c.p(15 + a, y, g0 + (255,)); c.p(15 - a, y, (255, 120, 220, 255))
            if i % 3 == 0: c.l([(15 - a, y), (15 + a, y)], g1 + (255,))
    c.r(14, 26, 17, 28, (60, 70, 90, 255))
    add(f'wl_holo_{v}', c.tiles()[(0, 0)], 'decoration', 1)

# scan table (3x2): octagonal plinth with a floating holo creature
c = Can(3, 2); shadow(c, 6, 20, 90, 58)
c.d.polygon([(18, 22), (78, 22), (90, 34), (90, 50), (78, 60), (18, 60), (6, 50), (6, 34)], fill=(70, 88, 112, 255), outline=O)
c.d.polygon([(20, 26), (76, 26), (84, 34), (84, 46), (76, 52), (20, 52), (12, 46), (12, 34)], fill=(26, 60, 84, 255), outline=(90, 236, 255, 255))
c.e((30, 30, 66, 48), None, (60, 200, 230, 255)); c.e((38, 34, 58, 44), None, (90, 236, 255, 255))
c.e((38, 6, 58, 24), None, (120, 245, 255, 255)); c.e((42, 10, 54, 20), None, (90, 236, 255, 255))  # holo body
c.l([(44, 24), (42, 30)], (90, 236, 255, 255)); c.l([(52, 24), (54, 30)], (90, 236, 255, 255)); c.l([(48, 6), (48, 2)], (90, 236, 255, 255))
for x in (24, 72): c.r(x, 54, x + 3, 56, (255, 120, 220, 255))
add_multi('wl_scan', c)

# medical holo ring (2x2, floor decoration, walkable)
c = Can(2, 2); c.e((6, 10, 58, 56), None, (60, 200, 230, 255)); c.e((10, 14, 54, 52), None, (90, 236, 255, 255)); c.e((22, 24, 42, 42), None, (60, 200, 230, 255))
for a in range(0, 360, 45):
    x, y = 32 + 24 * math.cos(math.radians(a)), 33 + 21 * math.sin(math.radians(a)); c.r(int(x) - 1, int(y) - 1, int(x), int(y), (200, 255, 255, 255))
add_multi('wl_ring', c, 'decoration', 0)

# cylinder tanks 1x2 in four glows; something curled asleep inside (not gory)
for k in ('cyan', 'amber', 'green', 'violet'):
    g0, g1 = GLOW[k]; c = Can(1, 2); shadow(c, 3, 2, 28, 60)
    c.r(3, 1, 28, 7, (70, 80, 96, 255), O); c.r(3, 54, 28, 61, (60, 70, 86, 255), O); c.r(5, 56, 26, 57, g0 + (255,))
    c.r(4, 8, 27, 53, g1 + (255,), O)
    for x in range(5, 27):
        f = abs(x - 15.5) / 11; col = tuple(int(g0[i] * (1 - f * 0.6) + g1[i] * f * 0.6) for i in range(3)); c.l([(x, 9), (x, 52)], col + (255,))
    c.r(7, 10, 8, 50, (255, 255, 255, 140))
    c.e((10, 26, 22, 38), tuple(int(v * 0.45) for v in g1) + (255,)); c.e((12, 24, 18, 30), tuple(int(v * 0.45) for v in g1) + (255,))
    c.p(14, 27, g0 + (255,))
    for (x, y) in ((20, 18), (12, 14), (22, 42), (9, 46)): c.p(x, y, (255, 255, 255, 220))
    c.l([(12, 1), (12, 0)], (120, 130, 150, 255)); c.l([(20, 1), (20, 0)], (120, 130, 150, 255))
    add_multi(f'wl_tank_{k}', c)

# big cylinder tank 2x3 (cyan / green)
for k in ('cyan', 'green'):
    g0, g1 = GLOW[k]; c = Can(2, 3); shadow(c, 6, 4, 58, 92)
    c.r(6, 2, 57, 12, (70, 80, 96, 255), O); c.r(10, 0, 14, 2, (100, 110, 130, 255)); c.r(48, 0, 52, 2, (100, 110, 130, 255))
    c.r(6, 82, 57, 94, (60, 70, 86, 255), O); c.r(10, 86, 53, 88, g0 + (255,))
    c.r(8, 13, 55, 81, g1 + (255,), O)
    for x in range(9, 55):
        f = abs(x - 31.5) / 23; col = tuple(int(g0[i] * (1 - f * 0.7) + g1[i] * f * 0.7) for i in range(3)); c.l([(x, 14), (x, 80)], col + (255,))
    c.r(12, 16, 14, 78, (255, 255, 255, 120))
    dk = tuple(int(v * 0.4) for v in g1) + (255,)
    c.e((20, 36, 44, 62), dk); c.e((26, 28, 38, 40), dk); c.l([(40, 60), (48, 70)], dk, 3); c.p(30, 33, g0 + (255,)); c.p(34, 33, g0 + (255,))
    for (x, y) in ((44, 20), (18, 26), (46, 44), (16, 70), (36, 74)): c.p(x, y, (255, 255, 255, 220))
    add_multi(f'wl_bigtank_{k}', c)

# sunken vat (9-slice, block): rim + glowing green liquid
for k in ('green', 'cyan'):
    g0, g1 = GLOW[k]
    for nm, (rx0, ry0, rx1, ry1) in {'nw': (1, 1, 0, 0), 'n': (0, 1, 0, 0), 'ne': (0, 1, 1, 0), 'w': (1, 0, 0, 0), 'c': (0, 0, 0, 0), 'e': (0, 0, 1, 0),
                                      'sw': (1, 0, 0, 1), 's': (0, 0, 0, 1), 'se': (0, 0, 1, 1)}.items():
        c = Can(1, 1, g1 + (255,))
        for (x, y) in ((6, 9), (21, 5), (14, 20), (26, 25), (9, 27)): c.r(x, y, x + 1, y + 1, g0 + (255,))
        c.p(17, 12, (240, 255, 240, 255))
        rim, dk = (96, 112, 120, 255), (40, 50, 58, 255)
        if ry0: c.r(0, 0, 31, 4, rim); c.r(0, 5, 31, 7, dk)
        if ry1: c.r(0, 27, 31, 31, rim)
        if rx0: c.r(0, 0, 4, 31, rim); c.r(5, 5 if ry0 else 0, 6, 26 if ry1 else 31, dk)
        if rx1: c.r(27, 0, 31, 31, rim)
        add(f'wl_vat_{k}_{nm}', c.tiles()[(0, 0)], 'ground', 1)

# helix energy column 2x4
c = Can(2, 4); shadow(c, 8, 4, 56, 124)
c.r(8, 0, 55, 10, (70, 84, 104, 255), O); c.r(4, 114, 59, 127, (60, 70, 86, 255), O); c.r(10, 118, 53, 121, (90, 236, 255, 255))
c.r(12, 11, 51, 113, (14, 40, 66, 255), O)
for x in range(13, 51):
    f = abs(x - 31.5) / 19; c.l([(x, 12), (x, 112)], (int(20 + 40 * (1 - f)), int(70 + 110 * (1 - f)), int(110 + 110 * (1 - f)), 255))
for i in range(100):
    y = 12 + i; a = 15 * math.sin(i / 7.0); c.r(int(31 + a), y, int(32 + a), y, (200, 255, 255, 255)); c.r(int(31 - a), y, int(32 - a), y, (255, 140, 230, 255))
    if i % 7 == 0: c.l([(int(31 - a), y), (int(32 + a), y)], (90, 236, 255, 255))
c.r(16, 14, 17, 110, (255, 255, 255, 110))
add_multi('wl_helix', c)

# giant porthole 4x3 (decoration over the wall rows): deep river water, a huge dim fin far off, bubbles
c = Can(4, 3)
c.e((4, 2, 123, 94), (70, 84, 104, 255), O); c.e((10, 8, 117, 88), (40, 50, 66, 255), O)
c.e((14, 12, 113, 84), (10, 36, 60, 255))
for y in range(12, 85):
    f = (y - 12) / 72; col = (int(18 + 10 * (1 - f)), int(70 - 40 * f), int(104 - 50 * f), 255)
    for x in range(14, 114):
        if (x - 63.5) ** 2 / 49.5 ** 2 + (y - 48) ** 2 / 36 ** 2 <= 1: c.p(x, y, col)
c.d.polygon([(40, 70), (62, 40), (70, 44), (60, 70)], fill=(14, 30, 48, 255)); c.d.polygon([(66, 72), (86, 50), (90, 56), (78, 74)], fill=(14, 30, 48, 255))
for (x, y) in ((30, 30), (34, 40), (92, 26), (96, 36), (88, 62), (50, 22)): c.r(x, y, x + 1, y + 1, (190, 240, 255, 255))
c.l([(30, 20), (44, 16)], (120, 200, 230, 255)); c.l([(28, 24), (34, 22)], (120, 200, 230, 255))
for a in range(0, 360, 30):
    x, y = 63.5 + 56 * math.cos(math.radians(a)), 48 + 43 * math.sin(math.radians(a)); c.r(int(x), int(y), int(x) + 1, int(y) + 1, (150, 170, 190, 255))
add_multi('wl_porthole', c)

# Ondravel's crystal tank 6x5: faceted crystal-glass box full of water, violet crystals at the base, tubes from the lid.
# The 4x4 Ondravel sprite (summit_fx) is drawn over it, feet on the bottom inner row.
c = Can(6, 5); shadow(c, 4, 6, 188, 156)
c.r(2, 0, 189, 14, (60, 70, 90, 255), O)
for x in (20, 52, 96, 140, 172): c.r(x - 3, 0, x + 3, 14, (120, 130, 150, 255), O); c.r(x - 1, 4, x + 1, 10, (210, 150, 255, 255))
c.d.polygon([(4, 15), (187, 15), (187, 146), (4, 146)], fill=(20, 70, 110, 255), outline=O)
for y in range(16, 146):
    f = (y - 16) / 130; c.l([(5, y), (186, y)], (int(30 + 20 * f), int(110 - 40 * f), int(160 - 30 * f), 255))
for x in (48, 96, 144): c.l([(x, 16), (x, 145)], (150, 220, 255, 255))
c.l([(5, 70), (186, 70)], (120, 200, 240, 255))
c.l([(10, 18), (10, 140)], (255, 255, 255, 140)); c.l([(13, 18), (13, 60)], (255, 255, 255, 110))
for (x, y, h) in ((14, 146, 22), (30, 146, 34), (44, 146, 18), (150, 146, 26), (164, 146, 38), (178, 146, 20), (90, 146, 14), (104, 146, 12)):
    c.d.polygon([(x - 6, y), (x, y - h), (x + 6, y)], fill=(150, 90, 230, 255), outline=(70, 30, 140, 255)); c.l([(x, y - h + 2), (x - 2, y - 2)], (230, 200, 255, 255))
for (x, y) in ((70, 30), (120, 40), (60, 100), (130, 110), (40, 60), (160, 80)): c.r(x, y, x + 1, y + 1, (220, 250, 255, 255))
c.r(2, 146, 189, 159, (70, 80, 100, 255), O); c.r(8, 150, 183, 153, (210, 150, 255, 255))
add_multi('wl_bigcrystal', c)

# floor tubes (walkable decoration): h, v, 4 corners
for nm, segs in {'h': [((0, 14), (31, 17))], 'v': [((14, 0), (17, 31))], 'ne': [((14, 0), (17, 17)), ((14, 14), (31, 17))], 'nw': [((14, 0), (17, 17)), ((0, 14), (17, 17))],
                 'se': [((14, 14), (17, 31)), ((14, 14), (31, 17))], 'sw': [((14, 14), (17, 31)), ((0, 14), (17, 17))]}.items():
    for k, g in (('cyan', 'cyan'), ('violet', 'violet')):
        c = Can(1, 1)
        for (a, b) in segs: c.r(a[0], a[1], b[0], b[1], (60, 70, 90, 255))
        for (a, b) in segs: c.r(a[0] + (1 if b[0] - a[0] < 5 else 0), a[1] + (1 if b[1] - a[1] < 5 else 0), b[0] - (1 if b[0] - a[0] < 5 else 0), b[1] - (1 if b[1] - a[1] < 5 else 0), GLOW[g][1] + (255,))
        c.p(15, 15, GLOW[g][0] + (255,)); add(f'wl_tube_{k}_{nm}', c.tiles()[(0, 0)], 'decoration', 0)

# recoloured props: amber jars, glowing growth plant, blue console (magenta keys)
add('wl_jars_amber', ramp(src_tile('i_salt_jars'), PAL['amber']), 'decoration', 1)
add('wl_growth_0', hue_swap(src_tile('kit_plant_tall3_normal_green_0_0'), 0.36, 1.1, 1.15, pick=lambda h, s, v: 0.15 < h < 0.5), 'overlay', 1) if 'kit_plant_tall3_normal_green_0_0' in SRC else None
mach = src_tile('i_lab_machine_0_0'); add('wl_console', hue_swap(ramp(mach, PAL['navy']), 0.88, 1, 1, pick=lambda h, s, v: False), 'decoration', 1)
# wall-hung clipboard / notice (story spots)
c = Can(1, 1); c.r(9, 6, 22, 26, (150, 110, 70, 255), O); c.r(11, 9, 20, 24, (236, 236, 226, 255)); c.r(13, 5, 18, 8, (120, 130, 150, 255), O)
for y in (12, 15, 18, 21): c.l([(12, y), (19, y)], (110, 120, 140, 255))
add('wl_clipboard', c.tiles()[(0, 0)], 'decoration', 1)
# sliding lab doors: 1 wide, wall top + face (blocked top, door face), in 4 wall palettes; floor threshold door (bottom wall)
for k in ('lab', 'steel', 'amber', 'green', 'navy'):
    pal = PAL.get(k, [(40, 44, 50), (120, 130, 140), (190, 200, 206), (226, 230, 230), (250, 250, 248)])
    c = Can(1, 1, pal[1] + (255,)); c.r(2, 2, 29, 31, pal[0] + (255,)); c.r(4, 4, 15, 31, pal[2] + (255,), O); c.r(16, 4, 27, 31, pal[2] + (255,), O)
    c.r(14, 14, 17, 18, (90, 236, 255, 255)); c.r(4, 2, 27, 3, (90, 236, 255, 255))
    add(f'wl_door_{k}', c.tiles()[(0, 0)], 'ground', 4)
    c = Can(1, 1, pal[1] + (255,)); c.r(2, 0, 29, 31, pal[0] + (255,))
    for i in range(4, 30, 6): c.d.polygon([(8, i + 4), (16, i), (24, i + 4), (24, i + 6), (16, i + 2), (8, i + 6)], fill=(90, 236, 255, 255))
    add(f'wl_exit_{k}', c.tiles()[(0, 0)], 'ground', 4)


# Ondravel's tank AFTER the release (Coder, Oct 30 2026; flag_swaps on fin_released in fin_past_wlab_10_ondravel):
# same frame + crystals, front glass blown out (jagged edges), drained to a puddle, shards on the plinth. Appended last
# so every earlier tile id stays put.
c = Can(6, 5); shadow(c, 4, 6, 188, 156)
c.r(2, 0, 189, 14, (60, 70, 90, 255), O)
for x in (20, 52, 96, 140, 172): c.r(x - 3, 0, x + 3, 14, (120, 130, 150, 255), O); c.r(x - 1, 4, x + 1, 10, (90, 70, 110, 255))
c.d.polygon([(4, 15), (187, 15), (187, 146), (4, 146)], fill=(16, 26, 40, 255), outline=O)
for y in range(16, 146):
    f = (y - 16) / 130; c.l([(5, y), (186, y)], (int(18 + 10 * f), int(30 + 14 * f), int(46 + 16 * f), 255))
for y in range(128, 146): c.l([(5, y), (186, y)], (30, 90, 130, 255))  # what is left of the water
c.l([(5, 128), (186, 128)], (120, 200, 240, 255))
for x in (4, 187):  # jagged glass still in the frame
    for i, y in enumerate(range(16, 146, 10)):
        d = (6 + (i * 7) % 11) * (1 if x == 4 else -1); c.d.polygon([(x, y), (x + d, y + 5), (x, y + 10)], fill=(170, 230, 255, 200), outline=(90, 150, 190, 255))
for i, x in enumerate(range(8, 186, 14)):
    d = 6 + (i * 5) % 13; c.d.polygon([(x, 16), (x + 7, 16 + d), (x + 14, 16)], fill=(170, 230, 255, 200), outline=(90, 150, 190, 255))
for (a, b) in (((40, 20), (70, 60)), ((70, 60), (60, 90)), ((150, 24), (128, 70)), ((128, 70), (140, 110))): c.l([a, b], (200, 240, 255, 255))
for (x, y, h) in ((14, 146, 22), (30, 146, 34), (44, 146, 18), (150, 146, 26), (164, 146, 38), (178, 146, 20), (90, 146, 14), (104, 146, 12)):
    c.d.polygon([(x - 6, y), (x, y - h), (x + 6, y)], fill=(110, 70, 170, 255), outline=(60, 25, 110, 255))
c.r(2, 146, 189, 159, (70, 80, 100, 255), O); c.r(8, 150, 183, 153, (120, 90, 150, 255))
for (x, y) in ((20, 155), (60, 157), (100, 154), (140, 156), (176, 155), (36, 150), (120, 151)):
    c.d.polygon([(x, y), (x + 4, y - 3), (x + 7, y + 1)], fill=(200, 240, 255, 255), outline=(90, 150, 190, 255))
add_multi('wl_bigcrystal_broken', c)


def build():
    from lab_props_lean import lean_props  # Director lean pass: same names/ids/codes, redrawn props
    ov = lean_props(); missing = set(ov) - {t[0] for t in TILES}
    assert not missing, missing
    tiles = [(n, ov.get(n, im), *r) for (n, im, *r) in TILES if im is not None]
    # lab-local lean variants of shared-kit props (appended last: earlier ids never move; kit art untouched)
    from lab_props_lean import kit_props
    for (n, im, kn) in kit_props()[0]:
        k = SRC[kn]; tiles.append((n, im, k.get('layer') or 'decoration', k.get('collision_code', 0 if k.get('walkable') else 1)))
    cols = 16; rows = math.ceil(len(tiles) / cols)
    for z in (1, 2, 3):
        sh = Image.new('RGBA', (cols * 64 * z, rows * 64 * z))
        for i, (n, im, *_r) in enumerate(tiles):
            sh.paste(im.resize((64 * z, 64 * z), Image.NEAREST), ((i % cols) * 64 * z, (i // cols) * 64 * z))
        sh.save(os.path.join(OW, f'tiles_{z}x', SHEET))
    names = {0: 'walk', 1: 'block', 4: 'door'}
    entries = [{'id': BASE_ID + i, 'name': n, 'category': CAT, 'sheet': f'tiles_1x/{SHEET}', 'index': i, 'col': i % cols, 'row': i // cols,
                'walkable': code in (0, 4), 'collision': names[code], 'collision_code': code, 'encounter': False, 'interior': True, 'layer': layer}
               for i, (n, im, layer, code) in enumerate(tiles)]
    p = os.path.join(OW, 'tileset_arena.json'); ts = json.load(open(p))
    ts['tiles'] = [t for t in ts['tiles'] if t.get('category') != CAT] + entries
    ts['note'] = ts.get('note', '').split(' | wellspire_lab')[0] + ' | wellspire_lab: ids 12201+ (tools/wellspire_lab/lab_art_kit.py, flashback lab maps, DRAFT)'
    assert not any(BASE_ID <= t['id'] < BASE_ID + len(entries) for t in ts['tiles'] if t.get('category') != CAT)  # wellspire_polish lives at 12420+
    json.dump(ts, open(p, 'w'), indent=1)
    print(len(entries), 'tiles ->', SHEET)


if __name__ == '__main__':
    build()
