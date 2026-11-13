#!/usr/bin/env python3
"""Brookhollow Dash Track (Oct 29): paints the track + dirt path as one 13x11-tile picture (64px tiles),
cut into tiles for the decoration layer (and an overlay row for the arch banner).
Style: outer black silhouette only, hue-shifted ramps, 1px top highlights, baked 2-3px down-right shadows.
Outputs tiles_extra/{1x,2x,3x}/sports.png + layout.json (tile cells per layer + collision)."""
import json, math, os, random
from PIL import Image, ImageDraw
T = 64; GW, GH = 13, 11          # region x40..52, y27..37 of brookhollow
OX, OY = 40, 27
H = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(H, '..')
rnd = random.Random(7)
def C(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (255,)
K = C('#140c1c'); SH = (20, 30, 20, 90)
DIRT = [C('#c49a63'), C('#a87b4c'), C('#86593a'), C('#d9b882')]
CLAY = [C('#c8603c'), C('#a8462f'), C('#e07e52')]
WHITE = C('#fcf6e8'); INF = [C('#5aa33e'), C('#468a35')]
WOOD = [C('#c98a4a'), C('#9a6234', ), C('#6e4126'), C('#e8b070')]
GREEN = [C('#52983a'), C('#367634'), C('#24522e'), C('#8fd06a')]
RED = [C('#e8584a'), C('#b0303a'), C('#ff8a6a')]; GOLD = [C('#ffc928'), C('#c4900a'), C('#fff3a0')]
W, Hh = GW * T, GH * T
deco = Image.new('RGBA', (W, Hh)); over = Image.new('RGBA', (W, Hh))
def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), c)
def rect(im, x0, y0, x1, y1, c): ImageDraw.Draw(im).rectangle([x0, y0, x1 - 1, y1 - 1], fill=c)
def shadow(im, mask, dx=3, dy=3):
    """bake a soft dark offset of mask below im's opaque pixels (down-right)."""
    sh = Image.new('RGBA', im.size)
    m = mask.split()[3].point(lambda a: 90 if a else 0)
    sh.paste((18, 26, 18, 255), (dx, dy), m)
    out = Image.alpha_composite(sh, im); return out
def outline(layer):
    """outer silhouette only: black on transparent pixels touching the shape."""
    a = layer.split()[3]; o = layer.copy(); w, h = layer.size; ap = a.load(); op = o.load()
    for y in range(h):
        for x in range(w):
            if ap[x, y] == 0 and any(0 <= x+dx < w and 0 <= y+dy < h and ap[x+dx, y+dy] for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                op[x, y] = K
    return o
# ---------- dirt path: from the cobble end (40,27) east along row 27/28 to the arch at column 47
path = Image.new('RGBA', (W, Hh)); pd = ImageDraw.Draw(path)
# Oct 29 v0.2.41: the curve finishes above the sign (sign box y 88..142), then runs straight down the gate centre
pts = [(0, 40), (200, 40), (380, 42), (440, 48), (470, 60), (478, 84), (478, 236)]  # straight through the gate down to the oval
for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
    n = int(math.hypot(x1 - x0, y1 - y0))
    for i in range(n):
        x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n; r = 22 + 3 * math.sin(i * 0.21 + x0)
        pd.ellipse([x - r, y - r, x + r, y + r], fill=DIRT[0])
pa = path.load()
for y in range(Hh):
    for x in range(W):
        if pa[x, y][3]:
            edge = any(not (0 <= x+dx < W and 0 <= y+dy < Hh) or pa[x+dx, y+dy][3] == 0 for dx, dy in ((2,0),(-2,0),(0,2),(0,-2)))
            v = rnd.random()
            pa[x, y] = DIRT[2] if edge and v < .6 else DIRT[1] if v < .12 else DIRT[3] if v < .16 else DIRT[0]
for _ in range(90):  # pebbles with a 1px highlight on top
    x, y = rnd.randrange(W), rnd.randrange(Hh)
    if pa[x, y][3] and pa[min(x+1,W-1), y+1][3]: pa[x, y+1] = DIRT[2]; pa[x+1, y+1] = DIRT[2]; pa[x, y] = DIRT[3]
# path only up to the track footprint (stops at y 29 under the arch)
deco = Image.alpha_composite(deco, path)
# ---------- oval track: rx1..12, ry4..9 -> pixel box
x0, y0, x1, y1 = 1 * T + 6, 4 * T + 4, 13 * T - 6, 10 * T - 4
trk = Image.new('RGBA', (W, Hh)); td = ImageDraw.Draw(trk)
td.rounded_rectangle([x0, y0, x1, y1], radius=(y1 - y0) // 2, fill=CLAY[0])
lw = 15  # 4 lanes
inner = [x0 + 4 * lw + 6, y0 + 4 * lw + 6, x1 - 4 * lw - 6, y1 - 4 * lw - 6]
for i in range(1, 4):
    d = i * lw + 1; td.rounded_rectangle([x0 + d, y0 + d, x1 - d, y1 - d], radius=(y1 - y0) // 2 - d, outline=WHITE, width=1)
td.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], radius=(y1 - y0) // 2 - 2, outline=WHITE, width=1)
td.rounded_rectangle(inner, radius=(inner[3] - inner[1]) // 2, fill=INF[0], outline=WHITE, width=1)
ta = trk.load()
for y in range(Hh):  # clay grain + infield mow stripes, 1px light rim at the top edge
    for x in range(W):
        c = ta[x, y]
        if c == CLAY[0] and rnd.random() < .1: ta[x, y] = CLAY[1]
        elif c == INF[0] and (x // 12) % 2: ta[x, y] = INF[1]
for x in range(x0 + 20, x1 - 20):
    if ta[x, y0][3]: ta[x, y0 + 1] = CLAY[2]
# start/finish checker across the bottom straight at the middle
fx = (x0 + x1) // 2
for y in range(inner[3] + 1, y1 - 1):
    for x in range(fx - 4, fx + 4):
        ta[x, y] = WHITE if ((x - fx) // 4 + (y // 4)) % 2 else K
# lane numbers 1-4 just left of the line on the bottom straight (tiny 3x5 digits)
DIG = {'1': ['010','110','010','010','111'], '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'], '4': ['101','101','111','001','001']}
for i, d in enumerate('4321'):
    yy = inner[3] + 5 + i * lw
    for r, row in enumerate(DIG[d]):
        for c_, b in enumerate(row):
            if b == '1': ta[fx - 16 + c_, yy + r] = WHITE
deco = Image.alpha_composite(deco, outline(trk))
# ---------- bleachers rx1..5 and rx9..12, ry2..3, with crowd specks + flags
def bleacher(bx0, bx1):
    b = Image.new('RGBA', (W, Hh)); bd = ImageDraw.Draw(b)
    top = 2 * T + 8; bot = 4 * T - 4
    steps = 4; sh_ = (bot - top) // steps
    for s in range(steps):
        yy = top + s * sh_
        bd.rectangle([bx0, yy, bx1, yy + sh_ - 1], fill=WOOD[1] if s % 2 else WOOD[0])
        bd.line([bx0, yy, bx1, yy], fill=WOOD[3])           # 1px top highlight per step
        bd.line([bx0, yy + sh_ - 1, bx1, yy + sh_ - 1], fill=WOOD[2])
        for x in range(bx0 + 6, bx1 - 6, 9):                 # crowd heads (Brookhollow greens / creams)
            if rnd.random() < .7:
                col = rnd.choice([GREEN[0], GREEN[3], C('#f8eabe'), RED[0], C('#5e7fd0')])
                bd.rectangle([x, yy - 5, x + 4, yy - 1], fill=col); bd.point([x + 1, yy - 5], fill=C('#ffffff'))
    for x in (bx0, bx1 - 4):
        bd.rectangle([x, top - 4, x + 4, bot], fill=WOOD[2])
    for fxp in (bx0 + 2, bx1 - 2):                            # flag poles + pennants
        bd.line([fxp, top - 30, fxp, top - 4], fill=C('#d6dde8'))
        col = RED if fxp == bx0 + 2 else GOLD
        bd.polygon([(fxp + 1, top - 30), (fxp + 15, top - 25), (fxp + 1, top - 20)], fill=col[0])
        bd.line([fxp + 1, top - 30, fxp + 12, top - 26], fill=col[2])
    b = outline(b); return shadow(b, b)
for a_, b_ in ((1 * T + 4, 6 * T - 4), (9 * T + 4, 13 * T - 6)):
    deco = Image.alpha_composite(deco, bleacher(a_, b_))
# ---------- arch over the gate at rx7 (posts rx6/rx8), banner text, all on the overlay (walk under it)
arch = Image.new('RGBA', (W, Hh)); ad = ImageDraw.Draw(arch)
pl, pr = 6 * T + 26, 9 * T - 38
ptop, pbot = 2 * T - 6, 4 * T - 2
for x in (pl, pr):
    ad.rectangle([x, ptop, x + 9, pbot], fill=WOOD[0]); ad.line([x, ptop, x, pbot], fill=WOOD[3]); ad.line([x + 9, ptop, x + 9, pbot], fill=WOOD[2])
bx0, bx1, by0, by1 = 5 * T + 10, 10 * T - 10, 2 * T - 40, 2 * T + 14
ad.rectangle([bx0, by0, bx1, by1], fill=GREEN[0]); ad.line([bx0, by0, bx1, by0], fill=GREEN[3]); ad.line([bx0, by1, bx1, by1], fill=GREEN[2])
ad.rectangle([bx0, by1 - 4, bx1, by1 - 1], fill=GREEN[1])
for x in range(bx0, bx1, 8):  # checker trim strip
    ad.rectangle([x, by0 + 2, x + 3, by0 + 4], fill=WHITE); ad.rectangle([x + 4, by0 + 2, x + 7, by0 + 4], fill=K)
FONT = {  # 4x5 caps
 'A':['0110','1001','1111','1001','1001'],'B':['1110','1001','1110','1001','1110'],'C':['0111','1000','1000','1000','0111'],'D':['1110','1001','1001','1001','1110'],
 'H':['1001','1001','1111','1001','1001'],'K':['1001','1010','1100','1010','1001'],'L':['1000','1000','1000','1000','1111'],'O':['0110','1001','1001','1001','0110'],
 'R':['1110','1001','1110','1010','1001'],'S':['0111','1000','0110','0001','1110'],'T':['1111','0110','0110','0110','0110'],'W':['1001','1001','1011','1111','1001'],' ':['0000']*5}
def text(d, s, cx, y, col, sc=1):
    w = len(s) * 5 * sc - sc; x = cx - w // 2
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for c_, b in enumerate(row):
                if b == '1': d.rectangle([x + c_ * sc + 1, y + r * sc + 1, x + c_ * sc + sc, y + r * sc + sc], fill=GREEN[2]); d.rectangle([x + c_ * sc, y + r * sc, x + c_ * sc + sc - 1, y + r * sc + sc - 1], fill=col)
        x += 5 * sc
cx = (bx0 + bx1) // 2
text(ad, 'BROOKHOLLOW', cx, by0 + 9, WHITE, 3)
text(ad, 'DASH TRACK', cx, by0 + 28, GOLD[0], 2)
arch = outline(arch); arch = shadow(arch, arch, 2, 3)
# split: posts below row ry3 top stay decoration (block), banner rows go on overlay
over = Image.alpha_composite(over, arch)
deco = shadow(deco, Image.new('RGBA', deco.size), 0, 0)
# ---------- cut into tiles
cells = {'decoration': {}, 'overlay': {}}; tiles = []
def cut(im, layer):
    for ry in range(GH):
        for rx in range(GW):
            t = im.crop((rx * T, ry * T, rx * T + T, ry * T + T))
            if t.getbbox(): cells[layer][f'{rx},{ry}'] = len(tiles); tiles.append(t)
cut(deco, 'decoration'); cut(over, 'overlay')
cols = 16; rows = (len(tiles) + cols - 1) // cols
for sc, d in ((1, '1x'), (2, '2x'), (3, '3x')):
    sheet = Image.new('RGBA', (cols * T * sc, rows * T * sc))
    for i, t in enumerate(tiles): sheet.paste(t.resize((T * sc, T * sc), Image.NEAREST), ((i % cols) * T * sc, (i // cols) * T * sc))
    os.makedirs(os.path.join(OUT, d), exist_ok=True); sheet.save(os.path.join(OUT, d, 'sports.png'))
# collision (absolute cells): bleachers + arch posts block; everything else in the region walkable
block = set()
for ry in (2, 3):
    for rx in list(range(1, 6)) + list(range(9, 13)) + [6, 8]: block.add((OX + rx, OY + ry))
walk = set((OX + rx, OY + ry) for ry in range(GH) for rx in range(GW)) - block
json.dump({'origin': [OX, OY], 'size': [GW, GH], 'cols': cols, 'count': len(tiles), 'cells': cells,
           'block': sorted(block), 'walk': sorted(walk)}, open(os.path.join(H, 'layout.json'), 'w'))
Image.alpha_composite(deco, over).save(os.path.join(H, 'preview.png'))
print(len(tiles), 'tiles')
