#!/usr/bin/env python3
"""Aurelith Arena themed set-dressing kit (Gary, Oct 29 2026 6:19 PM CT: "boost the interior design level for the themes").
python3 tools/city/arena_art_kit.py
Draws the props/floors the existing tilesets lack (kelp, wave-edge tiles, pools, clouds, pennants, wind-vanes, lenses,
gold tiles, runes, prisms, candles, cracked obsidian, lava-crack floors, ...) as 32x32 logical pixel art (1 px dark
outline, 2-3 tone shading, the game's 2:1 look), NEAREST-scaled to 64 / 128 / 192 px -> tiles_{1,2,3}x/arena_art.png, plus
palette-remapped copies of existing hall wall tiles (sky / deep-water / earth / obsidian walls).
Writes tileset_arena.json (ids 11001+, category 'arena_art'), loaded at runtime by src/overworld/tileset.js withArenaArt and
read by the grid-fit tools. Every blocking prop's opaque art sits inside its own square (grid-fit: no overhang).
DRAFT art, made in-house (no third-party assets)."""
import json, math, os, random
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld')
TS = json.load(open(os.path.join(OW, 'tileset.json'))); BY = {e['name']: e for e in TS['tiles']}
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
OUT = H('#1e1626')
N = 32
tiles = []  # (name, Image 32x32 or 64x64, collision)

def canvas(): return Image.new('RGBA', (N, N), (0, 0, 0, 0))
def px(im, x, y, c):
    if 0 <= x < N and 0 <= y < N: im.putpixel((int(x), int(y)), H(c) if isinstance(c, str) else c)
def rect(im, x0, y0, x1, y1, c, o=None):
    d = ImageDraw.Draw(im); d.rectangle((x0, y0, x1, y1), fill=H(c), outline=H(o) if o else None)
def ell(im, x0, y0, x1, y1, c, o=OUT):
    d = ImageDraw.Draw(im); d.ellipse((x0, y0, x1, y1), fill=H(c), outline=o if o is None or isinstance(o, tuple) else H(o))
def poly(im, pts, c, o=OUT):
    d = ImageDraw.Draw(im); d.polygon(pts, fill=H(c), outline=o if o is None or isinstance(o, tuple) else H(o))
def line(im, pts, c, w=1):
    d = ImageDraw.Draw(im); d.line(pts, fill=H(c), width=w)
def outline(im):
    """1px dark outline round all opaque art (the game's prop style)."""
    a = im.copy(); w, h = im.size
    for y in range(h):
        for x in range(w):
            if a.getpixel((x, y))[3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and a.getpixel((x + dx, y + dy))[3] > 0 and a.getpixel((x + dx, y + dy)) != OUT
                                                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), OUT)
    return im
def shadow(im, x0, x1, y):
    for x in range(x0, x1 + 1):
        for yy in (y, y + 1):
            if im.getpixel((x, yy))[3] == 0: im.putpixel((x, yy), (20, 14, 30, 90))
def floor(base, dark, light, seed, grout=None):
    r = random.Random(seed); im = Image.new('RGBA', (N, N), H(base))
    for _ in range(40): px(im, r.randrange(N), r.randrange(N), r.choice((dark, light)))
    if grout:
        for i in range(N): px(im, i, 0, grout); px(im, 0, i, grout); px(im, i, 16, grout) if seed % 2 == 0 else None
    return im
def add(name, im, col=0): tiles.append((name, im, col))

# ---------------- WATER (Marisol): blue, never pink ----------------
for k, s in (('a', 1), ('b', 2)):
    im = floor('#3f7fb8', '#356ea3', '#5595cc', s, grout='#2a5a88')
    for x in range(2, 30):  # wave motif
        y = 9 + int(2 * math.sin((x + s * 5) / 3)) + (12 if k == 'b' else 0)
        px(im, x, y, '#8cc4ec'); px(im, x, y + 1, '#2f6596')
    add(f'ar_floor_wave_{k}', im)
# wave-tile edge (the trim row between floor and pool, walkable)
im = Image.new('RGBA', (N, N), H('#3f7fb8'))
for x in range(N):
    y = 14 + int(3 * math.sin(x / 2.5))
    for yy in range(y, N): px(im, x, yy, '#22578f' if yy > y + 2 else '#e8f6ff')
    px(im, x, y + 1, '#9fd2f4')
add('ar_wave_edge', im)
# pool (2x2 water body, collision 3 = water), rim drawn in each corner piece
pool = Image.new('RGBA', (64, 64), H('#1d5e9c'))
d = ImageDraw.Draw(pool); d.rectangle((0, 0, 63, 63), outline=H('#c8d8e4'), width=3); d.rectangle((3, 3, 60, 60), outline=H('#7d95a8'))
r = random.Random(7)
for _ in range(14):
    x, y = r.randrange(8, 52), r.randrange(8, 56); d.line((x, y, x + 5, y), fill=H('#6fb2e6')); d.line((x + 1, y + 1, x + 4, y + 1), fill=H('#2b74b6'))
for i, (cx, cy) in enumerate(((0, 0), (1, 0), (0, 1), (1, 1))): add(f'ar_pool_{cy}_{cx}', pool.crop((cx * 32, cy * 32, cx * 32 + 32, cy * 32 + 32)), 3)
# kelp in a glass column
im = canvas(); rect(im, 6, 2, 25, 29, '#2c6fa8', '#1e1626'); rect(im, 7, 3, 24, 5, '#9fd2f4')
for sx, ph in ((11, 0), (16, 2), (21, 4)):
    for y in range(8, 28):
        x = sx + int(1.6 * math.sin((y + ph) / 2.4)); px(im, x, y, '#3e9a5a'); px(im, x + 1, y, '#2b7344')
        if y % 4 == 0: px(im, x + 2, y, '#5cc074')
for b in ((9, 12), (20, 9), (14, 6)): px(im, *b, '#e8f6ff')
rect(im, 5, 28, 26, 30, '#3c4a5c', '#1e1626'); add('ar_kelp_tank', im, 1)
# giant clam with pearl
im = canvas(); poly(im, [(4, 24), (8, 12), (16, 9), (24, 12), (28, 24)], '#5b8fc0')
for x in (10, 14, 18, 22): line(im, [(16, 10), (x, 23)], '#3e6f9e')
poly(im, [(4, 24), (28, 24), (25, 29), (7, 29)], '#4a7cae'); ell(im, 13, 19, 19, 25, '#eef4fb'); px(im, 15, 20, '#ffffff')
add('ar_clam', im, 1)
# coral (blue/teal, not pink)
im = canvas(); rect(im, 8, 24, 23, 29, '#5e6b7c', '#1e1626')
for (x0, y0, x1, y1) in ((16, 24, 16, 6), (16, 16, 10, 9), (16, 13, 22, 7), (10, 9, 8, 5), (22, 7, 25, 4), (16, 20, 21, 15)):
    line(im, [(x0, y0), (x1, y1)], '#3fb6c4', 2)
outline(im); [px(im, x, y, '#a8eef0') for x, y in ((16, 6), (8, 5), (25, 4), (21, 15))]; add('ar_coral_blue', im, 1)

# ---------------- FIRE (Ignatia) ----------------
for k, s in (('a', 3), ('b', 4)):
    im = floor('#3a2a2c', '#2c1f22', '#4a3634', s, grout='#241a1c'); r = random.Random(s)
    x, y = r.randrange(4, 12), r.randrange(4, 10)
    for _ in range(22):
        px(im, x, y, '#ff9a3c'); px(im, x, y + 1, '#c4401c'); x += r.choice((1, 1, 0)); y += r.choice((1, 0, 0, -1)); x, y = min(x, 30), max(1, min(y, 29))
    add(f'ar_floor_lavacrack_{k}', im)
im = canvas(); ell(im, 3, 6, 28, 28, '#4a3634'); ell(im, 8, 10, 23, 24, '#e2541e', None); ell(im, 11, 13, 20, 21, '#ffb347', None); ell(im, 14, 15, 17, 18, '#fff1a8', None)
add('ar_lava_vent', im, 1)
im = canvas(); rect(im, 9, 18, 22, 29, '#5a4038', '#1e1626'); rect(im, 7, 15, 24, 18, '#7a5646', '#1e1626')
for (x, y, c) in ((11, 9, '#e2541e'), (16, 5, '#ff9a3c'), (20, 9, '#e2541e'), (13, 11, '#ffd36a'), (18, 12, '#ffd36a')):
    poly(im, [(x - 3, 15), (x, y), (x + 3, 15)], c, None)
add('ar_fire_bowl', im, 1)

# ---------------- WIND (Zephra): sky palette ----------------
for k, s in (('a', 5), ('b', 6)):
    im = floor('#bfe0f4', '#aed4ee', '#d6ecfa', s, grout='#9cc6e4')
    for t in range(14):  # swirl
        a = t / 2.2; px(im, 16 + int(t * .6 * math.cos(a)), 16 + int(t * .6 * math.sin(a)), '#ffffff')
    add(f'ar_floor_sky_{k}', im)
im = canvas()
for (x0, y0, x1, y1) in ((3, 13, 15, 25), (9, 7, 23, 22), (17, 11, 29, 25), (6, 17, 26, 27)): ell(im, x0, y0, x1, y1, '#f4fbff', None)
outline(im); line(im, [(7, 24), (25, 24)], '#c3dcee'); line(im, [(12, 10), (16, 9)], '#ffffff'); add('ar_cloud', im, 1)
# pennant pole (1w x 2h)
pen = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(pen)
d.rectangle((14, 6, 16, 58), fill=H('#c9b48a'), outline=H('#1e1626')); d.ellipse((12, 2, 18, 8), fill=H('#e8c55a'), outline=H('#1e1626'))
d.polygon([(17, 9), (30, 14), (17, 19)], fill=H('#5aa8e0'), outline=H('#1e1626')); d.polygon([(17, 21), (28, 25), (17, 29)], fill=H('#f4fbff'), outline=H('#1e1626'))
d.rectangle((9, 56, 21, 61), fill=H('#7d8fa3'), outline=H('#1e1626'))
add('ar_pennant_0_0', pen.crop((0, 0, 32, 32)), 1); add('ar_pennant_1_0', pen.crop((0, 32, 32, 64)), 1)
# wind-vane (1w x 2h)
wv = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(wv)
d.rectangle((15, 10, 16, 58), fill=H('#5b6878')); d.line((4, 12, 27, 12), fill=H('#3b4656'), width=2)
d.polygon([(27, 12), (22, 8), (22, 16)], fill=H('#e8c55a'), outline=H('#1e1626')); d.polygon([(4, 12), (1, 7), (8, 9), (8, 15), (1, 17)], fill=H('#5aa8e0'), outline=H('#1e1626'))
d.text((13, 18), 'N', fill=H('#3b4656')); d.ellipse((12, 30, 19, 37), fill=H('#e8c55a'), outline=H('#1e1626'))
for a in range(3):
    cx, cy = 15, 40 + a * 5; d.arc((cx - 7, cy - 3, cx + 7, cy + 3), 200, 340, fill=H('#9cc6e4'))
d.rectangle((9, 56, 22, 61), fill=H('#7d8fa3'), outline=H('#1e1626'))
add('ar_windvane_0_0', wv.crop((0, 0, 32, 32)), 1); add('ar_windvane_1_0', wv.crop((0, 32, 32, 64)), 1)
im = canvas(); line(im, [(6, 4), (26, 4)], '#5b6878', 2)
for i, x in enumerate((8, 12, 16, 20, 24)): line(im, [(x, 5), (x, 14 + (i % 3) * 4)], '#9aa8b8'); rect(im, x - 1, 14 + (i % 3) * 4, x + 1, 19 + (i % 3) * 4, '#cfe6f6', '#1e1626')
rect(im, 9, 26, 22, 29, '#7d8fa3', '#1e1626'); line(im, [(15, 5), (15, 26)], '#5b6878'); add('ar_wind_chimes', im, 1)

# ---------------- EARTH (Ottoline): stone ----------------
for k, s in (('a', 8), ('b', 9)):
    im = floor('#8a7458', '#76624a', '#9c8668', s, grout='#64523e'); r = random.Random(s)
    for _ in range(5): x, y = r.randrange(3, 28), r.randrange(3, 28); rect(im, x, y, x + 2, y + 1, '#6c5a46'); px(im, x, y, '#b09a7a')
    add(f'ar_floor_earth_{k}', im)
rp = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(rp)
d.polygon([(8, 60), (6, 30), (9, 8), (16, 3), (23, 8), (26, 30), (24, 60)], fill=H('#8b8378'), outline=H('#1e1626'))
d.polygon([(16, 3), (23, 8), (26, 30), (24, 60), (18, 60), (19, 28)], fill=H('#6f675e'))
for y in (18, 34, 48): d.line((9, y, 18, y + 2), fill=H('#5a534b'))
d.line((11, 10, 12, 26), fill=H('#a8a092'))
add('ar_rock_pillar_0_0', rp.crop((0, 0, 32, 32)), 1); add('ar_rock_pillar_1_0', rp.crop((0, 32, 32, 64)), 1)
for nm, c1, c2, c3 in (('amber', '#e8a43c', '#b8741e', '#ffe08a'), ('green', '#4cc08a', '#2a8a5e', '#b4f4d4')):
    im = canvas(); poly(im, [(5, 28), (27, 28), (24, 22), (8, 22)], '#6f675e')
    for (x, h, w) in ((10, 14, 4), (16, 20, 5), (22, 12, 4)):
        poly(im, [(x - w, 26), (x - w, 26 - h + 4), (x, 26 - h), (x + w, 26 - h + 4), (x + w, 26)], c1)
        line(im, [(x, 26 - h + 1), (x, 25)], c2); px(im, x - w + 1, 26 - h + 5, c3)
    add(f'ar_crystal_{nm}', im, 1)
im = canvas(); rect(im, 3, 14, 28, 25, '#6a4a32', '#1e1626'); rect(im, 3, 14, 28, 16, '#8a6444')
for x, y, c in ((8, 11, '#8b8378'), (14, 9, '#a8a092'), (20, 11, '#8b8378'), (17, 12, '#e8a43c')): ell(im, x - 4, y - 3, x + 4, y + 3, c)
for x in (8, 23): ell(im, x - 3, 23, x + 3, 29, '#3b3b44')
add('ar_ore_cart', im, 1)

# ---------------- GRASS (Fennick) ----------------
im = canvas(); rect(im, 2, 6, 29, 28, '#3f8a3c', '#1e1626'); r = random.Random(11)
for _ in range(70): px(im, r.randrange(3, 29), r.randrange(7, 28), r.choice(('#2f6e2e', '#5aaa4e', '#4c9a44')))
for _ in range(5): px(im, r.randrange(4, 28), r.randrange(8, 26), '#f4e070')
rect(im, 2, 6, 29, 8, '#5aaa4e'); outline(im); add('ar_hedge', im, 1)
tr = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(tr)
d.rectangle((14, 34, 18, 54), fill=H('#7a5234'), outline=H('#1e1626'))
for (x0, y0, x1, y1, c) in ((3, 10, 22, 32, '#3f8a3c'), (10, 3, 29, 26, '#4c9a44'), (6, 16, 26, 38, '#2f6e2e'), (9, 6, 22, 20, '#5aaa4e')):
    d.ellipse((x0, y0, x1, y1), fill=H(c))
d.polygon([(8, 52), (24, 52), (22, 61), (10, 61)], fill=H('#a8603a'), outline=H('#1e1626'))
tr = outline(tr.resize((32, 64))) if False else tr
add('ar_tree_0_0', tr.crop((0, 0, 32, 32)), 1); add('ar_tree_1_0', tr.crop((0, 32, 32, 64)), 1)
im = canvas(); rect(im, 5, 18, 26, 29, '#7a5234', '#1e1626'); rect(im, 5, 18, 26, 20, '#9a6c44')
r = random.Random(12)
for i in range(9):
    x, y = 8 + (i % 5) * 4, 10 + (i // 5) * 5; line(im, [(x, y + 3), (x, 18)], '#3f8a3c'); ell(im, x - 2, y - 2, x + 2, y + 2, r.choice(('#f4e070', '#e86a4a', '#f2f2f2', '#b48ae0')), '#1e1626')
add('ar_flower_planter', im, 1)
im = canvas(); ell(im, 6, 5, 26, 21, '#d8664a'); [ell(im, x, y, x + 3, y + 3, '#f8f0e0', None) for x, y in ((10, 9), (17, 8), (20, 14), (13, 15))]
rect(im, 13, 20, 19, 28, '#efe2c8', '#1e1626'); add('ar_mushroom_big', im, 1)

# ---------------- LIGHT (Iona) ----------------
for k, s in (('a', 13), ('b', 14)):
    im = Image.new('RGBA', (N, N), H('#f4dc8a')); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 31, 31), outline=H('#c9a24a')); d.rectangle((1, 1, 30, 30), outline=H('#fff2c0'))
    if k == 'a': d.polygon([(16, 6), (26, 16), (16, 26), (6, 16)], outline=H('#e0b850')); px(im, 16, 16, '#ffffff')
    else:
        for a in range(8): d.line((16, 16, 16 + int(9 * math.cos(a * math.pi / 4)), 16 + int(9 * math.sin(a * math.pi / 4))), fill=H('#ffeaa0'))
    add(f'ar_floor_gold_{k}', im)
ls = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(ls)
d.ellipse((4, 4, 27, 27), fill=H('#c9a24a'), outline=H('#1e1626')); d.ellipse((7, 7, 24, 24), fill=H('#bfe8ff')); d.ellipse((10, 9, 16, 15), fill=H('#ffffff'))
d.rectangle((14, 27, 17, 56), fill=H('#c9a24a'), outline=H('#1e1626')); d.rectangle((8, 55, 23, 61), fill=H('#8a6a2a'), outline=H('#1e1626'))
add('ar_lens_0_0', ls.crop((0, 0, 32, 32)), 1); add('ar_lens_1_0', ls.crop((0, 32, 32, 64)), 1)
gl = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(gl)
d.polygon([(8, 10), (24, 10), (21, 26), (11, 26)], fill=H('#fff6c8'), outline=H('#1e1626')); d.rectangle((7, 6, 24, 10), fill=H('#e0b850'), outline=H('#1e1626'))
d.ellipse((12, 13, 19, 21), fill=H('#ffffff')); d.rectangle((14, 26, 17, 56), fill=H('#e0b850'), outline=H('#1e1626')); d.rectangle((9, 55, 22, 61), fill=H('#a8822e'), outline=H('#1e1626'))
add('ar_gold_lamp_0_0', gl.crop((0, 0, 32, 32)), 1); add('ar_gold_lamp_1_0', gl.crop((0, 32, 32, 64)), 1)
im = canvas(); rect(im, 9, 22, 22, 29, '#a8822e', '#1e1626'); ell(im, 6, 3, 25, 22, '#ffd860')
for a in range(8): line(im, [(15, 12), (15 + int(8 * math.cos(a * .785)), 12 + int(8 * math.sin(a * .785)))], '#fff2c0')
ell(im, 12, 9, 19, 16, '#ffffff', None); add('ar_sun_disc', im, 1)

# ---------------- MYSTIC (Oriel): violet ----------------
for k, s in (('a', 15), ('b', 16)):
    im = floor('#4a3a78', '#3e3066', '#56468a', s, grout='#33285a')
    if k == 'b':
        d = ImageDraw.Draw(im); d.ellipse((6, 6, 25, 25), outline=H('#b48ae0')); d.polygon([(16, 9), (22, 21), (10, 21)], outline=H('#e0c8ff'))
    add(f'ar_floor_rune_{k}', im)
im = canvas(); rect(im, 9, 24, 22, 29, '#5a5070', '#1e1626'); poly(im, [(16, 3), (25, 23), (7, 23)], '#d8c8ff')
poly(im, [(16, 3), (25, 23), (16, 23)], '#a890e8', None)
for i, c in enumerate(('#ff6a6a', '#ffc04a', '#f4f06a', '#6ad890', '#6ab0ff', '#b48ae0')): line(im, [(25, 17 + i), (31, 15 + i * 2)], c)
add('ar_prism', im, 1)
im = canvas(); poly(im, [(8, 29), (7, 8), (12, 3), (20, 3), (25, 8), (24, 29)], '#5e5878')
for (x0, y0, x1, y1) in ((12, 8, 20, 8), (16, 8, 16, 16), (11, 18, 21, 18), (13, 22, 19, 26), (19, 22, 13, 26)): line(im, [(x0, y0), (x1, y1)], '#c8a8ff')
add('ar_rune_stone', im, 1)
im = canvas(); poly(im, [(9, 29), (23, 29), (19, 22), (13, 22)], '#3e3066'); ell(im, 7, 3, 25, 21, '#8a64d8'); ell(im, 10, 6, 19, 14, '#c8a8ff', None); px(im, 12, 8, '#ffffff')
add('ar_orb', im, 1)

# ---------------- DARK (Corvin) ----------------
for k, s in (('a', 17), ('b', 18), ('crack', 19)):
    im = floor('#24202c', '#1a1720', '#302a3a', s)
    d = ImageDraw.Draw(im); d.line((0, 0, 31, 0), fill=H('#3a3446')); d.line((0, 0, 0, 31), fill=H('#3a3446'))
    if k == 'b': d.line((4, 26, 12, 20), fill=H('#4a4060'))
    if k == 'crack':
        d.line((3, 5, 11, 13, 9, 20, 17, 26, 27, 28), fill=H('#0e0c12'), width=2); d.line((11, 13, 22, 10, 28, 4), fill=H('#0e0c12'))
        d.line((4, 5, 12, 13), fill=H('#7a52b8'))
    add(f'ar_floor_obsidian_{k}', im)
im = canvas()
for (x, h) in ((9, 14), (16, 19), (23, 11)):
    rect(im, x - 2, 28 - h, x + 2, 28, '#5a4a6a', '#1e1626'); poly(im, [(x - 2, 27 - h), (x, 21 - h), (x + 2, 27 - h)], '#b06aff', None); px(im, x, 25 - h, '#f0d8ff')
rect(im, 5, 27, 27, 29, '#2e2838', '#1e1626'); add('ar_candles', im, 1)
cb = Image.new('RGBA', (32, 64), (0, 0, 0, 0)); d = ImageDraw.Draw(cb)
d.line((5, 22, 27, 22), fill=H('#4a4058'), width=2)
for x in (6, 16, 26):
    d.rectangle((x - 2, 12 if x == 16 else 15, x + 1, 22), fill=H('#6a5a7a'), outline=H('#1e1626')); top = 12 if x == 16 else 15
    d.polygon([(x - 2, top - 1), (x - 1, top - 7), (x + 1, top - 1)], fill=H('#b06aff'))
d.rectangle((14, 22, 17, 56), fill=H('#4a4058'), outline=H('#1e1626')); d.rectangle((9, 55, 22, 61), fill=H('#2e2838'), outline=H('#1e1626'))
add('ar_candelabra_0_0', cb.crop((0, 0, 32, 32)), 1); add('ar_candelabra_1_0', cb.crop((0, 32, 32, 64)), 1)
im = canvas(); poly(im, [(5, 29), (9, 12), (14, 4), (18, 14), (24, 7), (27, 29)], '#1a1622'); line(im, [(14, 6), (13, 20)], '#3a3050'); line(im, [(24, 9), (22, 22)], '#3a3050')
add('ar_obsidian_shard', im, 1)
im = canvas(); ell(im, 8, 2, 23, 14, '#3a3348'); rect(im, 10, 13, 21, 25, '#2e2838', '#1e1626'); rect(im, 7, 25, 24, 29, '#4a4058', '#1e1626')
px(im, 13, 7, '#c890ff'); px(im, 18, 7, '#c890ff'); add('ar_raven_statue', im, 1)

# ---------------- remapped walls (sky / deep sea / earth / obsidian) from hall walls ----------------
def cell(name):
    e = BY[name]; sh = e['sheet']; cols = TS.get('columns_per_sheet', 16)
    im = Image.open(os.path.join(OW, sh)).convert('RGBA'); i = e['index']
    return im.crop((i % cols * 64, i // cols * 64, i % cols * 64 + 64, i // cols * 64 + 64))
def remap(im, stops):
    stops = [H(s) for s in stops]; o = im.copy()
    for y in range(64):
        for x in range(64):
            r, g, b, a = im.getpixel((x, y))
            if a == 0: continue
            l = (0.3 * r + 0.59 * g + 0.11 * b) / 255 * (len(stops) - 1); i = min(int(l), len(stops) - 2); f = l - i
            c = tuple(int(stops[i][k] * (1 - f) + stops[i + 1][k] * f) for k in range(3)); o.putpixel((x, y), c + (a,))
    return o
WALL_PAL = {'sky': ('#2a4a6a', '#5a8ab8', '#a8d0ee', '#eaf6ff'), 'sea': ('#0e2440', '#1d4f86', '#3f86c4', '#a8dcf8'),
            'earth': ('#2a2018', '#5a4632', '#8a7458', '#c8b494'), 'obsidian': ('#0c0a10', '#241e2e', '#3e3450', '#7a5aa8')}
for p, stops in WALL_PAL.items():
    for part in ('top', 'upper', 'upper_win', 'face'):
        add(f'ar_wall_{part}_{p}', remap(cell(f'i_wall_{part}_hall'), stops), 1 if part != 'face' else BY[f'i_wall_face_hall']['collision_code'])

# ---------------- sheets + tileset json ----------------
names = [n for n, _, _ in tiles]; assert len(set(names)) == len(names)
rows = (len(tiles) + 15) // 16
for z in (1, 2, 3):
    s = 64 * z; sheet = Image.new('RGBA', (16 * s, rows * s), (0, 0, 0, 0))
    for i, (n, im, c) in enumerate(tiles): sheet.paste(im.resize((s, s), Image.NEAREST), ((i % 16) * s, (i // 16) * s))
    sheet.save(os.path.join(OW, f'tiles_{z}x', 'arena_art.png'), optimize=True)
CODES = {0: 'walk', 1: 'block', 3: 'water'}
FLOORISH = lambda n: n.startswith(('ar_floor', 'ar_wave', 'ar_wall'))
out = [{'id': 11001 + i, 'name': n, 'category': 'arena_art', 'sheet': 'tiles_1x/arena_art.png', 'index': i, 'col': i % 16, 'row': i // 16,
        'walkable': c == 0, 'collision': CODES.get(c, 'block'), 'collision_code': c, 'encounter': False, 'interior': True,
        'layer': 'ground' if FLOORISH(n) or n.startswith('ar_pool') else 'decoration'} for i, (n, _, c) in enumerate(tiles)]
json.dump({'note': 'Aurelith Arena themed set dressing (Oct 29 2026, DRAFT art pending Gary). Always loaded (src/overworld/tileset.js withArenaArt). '
           'Built by tools/city/arena_art_kit.py (in-house pixel art, no third-party assets).', 'tiles': out},
          open(os.path.join(OW, 'tileset_arena.json'), 'w'), indent=1)
print(len(out), 'tiles,', rows, 'rows')
