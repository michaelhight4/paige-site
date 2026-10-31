#!/usr/bin/env python3
"""Soft-edged tall-grass blob autotile + curved ledge kit (tiles_extra/<k>x/softkit.png, ids 13000-13399).

Everything is derived from the existing art so palette/style match:
  * tall grass: tall_grass_1111_v0/v1 (deco + front overlay, idle + 3 rustle frames) cut with a
    tapered-blade mask per open side, rounded outer corners and ragged inner-corner bites.
    Name: tall_grass_soft_<NESW>_<NE SE SW NW>_v<v>  ('1' = that side/diagonal is NOT grass;
    diagonal bits are only set when both neighbouring sides are grass -> 47 blob tiles per variant).
    Front overlays: tall_grass_soft_front_<same>.
  * ledges (built from ledge_m's exact pixel columns): ledge_cap_l / ledge_cap_r (rounded,
    tapering end caps), ledge_side_l / ledge_side_r (cliff side running north, high ground on the
    inner side), ledge_side_end_l / _r (top of a side run, level with the ledge lip), ledge_corner_bl / ledge_corner_br (horizontal face wrapping round into a side).
    Caps and sides block; corners block; ledge_m/l/r remain the only jumpable pieces.
Re-run is idempotent: it rewrites the sheet and replaces ids 13000-13399 in tileset{,_2x,_3x}.json.
Usage: python3 tools/art/soft_grass_ledges.py
"""
import json, math, os, random
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OW = os.path.join(ROOT, 'art/world/overworld'); T = 64; COLS = 16; ID0 = 13000
deco = Image.open(os.path.join(OW, 'tiles_1x/deco.png')).convert('RGBA')
over = Image.open(os.path.join(OW, 'tiles_1x/overlay.png')).convert('RGBA')
cell = lambda im, c, r: im.crop((c * T, r * T, c * T + T, r * T + T))
OUT = (24, 56, 44, 255); TIP = (120, 186, 72, 255); CLEAR = (0, 0, 0, 0)

def profile(seed, tip=(0, 4), val=(12, 20), seam=12):
    """Depth (px from the edge) where grass starts, for t in 0..63: a row of tapered blades, seam depth at both ends."""
    rnd = random.Random(seed); pts = [(0, seam)]; t = 0
    while t < 60:
        w = rnd.randint(4, 8); c = t + w / 2; t = min(64, t + w)
        pts.append((c, rnd.randint(*tip)))
        if t < 60: pts.append((t, rnd.randint(*val)))
    pts.append((64, seam)); out = []
    ph = rnd.random() * 6.28; amp = rnd.randint(3, 6)
    for x in range(64):
        for (a, da), (b, db) in zip(pts, pts[1:]):
            if a <= x + .5 <= b: out.append(da + (db - da) * (x + .5 - a) / max(b - a, 1e-6)); break
    # slow wobble (zero at both seams) so a long edge undulates instead of reading as a ruler line
    return [max(0, d + amp * math.sin(math.pi * x / 63) * math.sin(ph + x / 9.0)) for x, d in enumerate(out)]

def mask_for(key, v):
    s, dg = key[:4], key[5:]
    P = {k: profile(hash((k, v, 'kilumen')) & 0xffffff, **kw) for k, kw in
         (('N', {}), ('E', {}), ('W', {}), ('S', dict(tip=(0, 3), val=(8, 14), seam=8)))}
    R = 26; rnd = random.Random(v * 977 + int(key.replace('_', ''), 2))
    m = [[True] * T for _ in range(T)]
    for y in range(T):
        for x in range(T):
            if s[0] == '1' and y < P['N'][x]: m[y][x] = False
            if s[1] == '1' and 63 - x < P['E'][y]: m[y][x] = False
            if s[2] == '1' and 63 - y < P['S'][x]: m[y][x] = False
            if s[3] == '1' and x < P['W'][y]: m[y][x] = False
            # rounded outer corners (both sides open), blade-ragged radius
            for i, (cx, cy, sx, sy) in enumerate(((63 - R, R, 1, -1), (63 - R, 63 - R, 1, 1), (R, 63 - R, -1, 1), (R, R, -1, -1))):
                a, b = s[i], s[(i + 1) % 4]
                if a == '1' and b == '1' and (x - cx) * sx > 0 and (y - cy) * sy > 0:
                    ang = math.atan2(y - cy, x - cx); r = R - 10 + 3 * abs(math.sin(ang * 9 + v)) + 4 * abs(math.sin(ang * 23 + i))
                    if math.hypot(x - cx, y - cy) > r: m[y][x] = False
            # inner-corner bites (diagonal missing, both sides grass)
            for i, (cx, cy) in enumerate(((63, 0), (63, 63), (0, 63), (0, 0))):
                if dg[i] == '1':
                    ang = math.atan2(y - cy, x - cx); r = 9 + 5 * abs(math.sin(ang * 11 + i + v))
                    if math.hypot(x - cx, y - cy) < r: m[y][x] = False
    return m

def apply(img, m):
    im = img.copy(); px = im.load()
    for y in range(T):
        for x in range(T):
            if not m[y][x]: px[x, y] = CLEAR
    for y in range(T):
        for x in range(T):
            if not m[y][x] or px[x, y][3] == 0: continue
            nb = [(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < T and 0 <= y + b < T]
            if any(not m[q][p] for p, q in nb):
                up = y > 0 and not m[y - 1][x]
                px[x, y] = TIP if up and (x * 7 + y * 3) % 5 == 0 else OUT
    return im

KEYS = []
for s in range(16):
    S = format(s, '04b')
    for d in range(16):
        D = format(d, '04b')
        if all(D[i] == '0' or (S[i] == '0' and S[(i + 1) % 4] == '0') for i in range(4)): KEYS.append(S + '_' + D)
assert len(KEYS) == 47

tiles = []   # (name, img, meta)
for v, row in ((0, 3), (1, 7)):
    base = [cell(deco, 12 + f, row) for f in range(4)]; front = [cell(over, 12 + f, row) for f in range(4)]
    for key in KEYS:
        m = mask_for(key, v)
        for kind, src in (('', base), ('front_', front)):
            nm = f'tall_grass_soft_{kind}{key}_v{v}'
            for f in range(4): tiles.append((nm if f == 0 else f'{nm}~f{f}', apply(src[f], m), {'kind': kind, 'grass': True}))

# ---------------- ledges, from ledge_m's columns ----------------
LM = cell(deco, 9, 17); lm = LM.load()
A, B, C, D_, E, F, G, H, J = (36, 82, 46, 255), (120, 186, 72, 255), (166, 212, 96, 255), (82, 152, 58, 255), (70, 44, 34, 255), (146, 98, 62, 255), (186, 136, 86, 255), (106, 68, 46, 255), (26, 18, 38, 96)
TOP, BOT = 25, 55

def blank(): return Image.new('RGBA', (T, T), CLEAR)
def face_col(px, x, srcx, top=TOP, bot=BOT):
    """ledge_m column srcx squashed into rows top..bot (lip kept, face scaled), shadow under it."""
    h = bot - top
    for y in range(top, bot + 1):
        sy = TOP + round((y - top) * (BOT - TOP) / max(h, 1)) if y > top + 2 else TOP + (y - top)
        px[x, y] = lm[srcx % 64, min(sy, BOT)]
    for y in range(bot + 1, min(bot + 9, 64)): px[x, y] = J

def cap(side, start=6, run=34, drop=20):
    """rounded end: the lip curves down toward the free end and the face shrinks, ending in a tuft + pebble."""
    im = blank(); px = im.load()
    for x in range(T):
        u = x if side == 'l' else 63 - x
        if u < start: continue
        k = u - start
        lift = 0 if k >= run else round(drop * (1 - math.sqrt(1 - (1 - k / run) ** 2)) if False else drop * (1 - k / run) ** 1.7)
        face_col(px, x, x, TOP + lift, BOT)
    for y in range(T):   # outline the curved end
        xs = [x for x in range(T) if px[x, y][3] == 255]
        if not xs: continue
        e = xs[0] if side == 'l' else xs[-1]
        px[e, y] = E if y > TOP + drop - 2 else A
    for x in range(T):   # outline the sloping lip
        ys = [y for y in range(T) if px[x, y][3] == 255]
        if ys and ys[0] > TOP: px[x, ys[0]] = A; px[x, ys[0] + 1] = B
    for dx, dy, c in ((start + 2, 52, A), (start + 3, 51, D_), (start + 4, 49, B), (start + 5, 50, D_), (start + 6, 52, A), (start + 7, 48, B), (start + 8, 50, D_)):
        x = dx if side == 'l' else 63 - dx
        px[x, dy] = c
    for dx, dy, c in ((1, 59, E), (2, 58, H), (3, 58, G), (4, 59, E), (2, 59, F), (3, 59, F)):
        px[dx if side == 'l' else 63 - dx, dy] = c
    return im

SW = 16   # side width: 4 px cast shadow, 7 px dirt face, outline, lip highlight, grass
def side_strip(px, side, y0, y1):
    """a north-running ledge edge seen from above: dirt face with pebble bumps, dark outline,
    lit grass lip, and a soft shadow cast onto the low ground."""
    for y in range(y0, y1):
        for i in range(SW):
            x = i if side == 'l' else 63 - i
            if i < 4: c = J
            elif i == 4: c = E
            elif i <= 10:
                b = (y + 2) % 9; j = i - 5
                c = G if (b in (2, 3, 4) and j in (1, 2, 3)) or (b == 3 and j in (0, 4)) else (H if (b in (5, 6) and j in (1, 2, 3)) else F)
            elif i == 11: c = A
            elif i == 12: c = C if y % 2 else B
            else: c = D_
            px[x, y] = c

def side(side):
    im = blank(); px = im.load(); side_strip(px, side, 0, 64); return im

def side_end(side):
    """top end of a side run: starts level with the ledge lip (row 25) with a rounded, outlined cap."""
    im = blank(); px = im.load(); side_strip(px, side, TOP, 64)
    for i in range(SW):
        x = i if side == 'l' else 63 - i
        if i < 4: px[x, TOP] = CLEAR; px[x, TOP + 1] = CLEAR if i < 2 else J
        else: px[x, TOP] = A
    for i, y in ((4, TOP + 1), (4, TOP + 2), (5, TOP + 1)):
        px[i if side == 'l' else 63 - i, y] = A
    for i in range(5, 12): px[i if side == 'l' else 63 - i, TOP + 1] = C if i % 2 else B
    return im

def corner(side):
    """the south face turns the corner and runs north as a side (outer corner)."""
    im = cap(side, start=0, run=1, drop=0); px = im.load()
    side_strip(px, side, 0, BOT + 1)
    for i in range(SW):   # face bottom outline + shadow continue under the side
        x = i if side == 'l' else 63 - i
        if i >= 4: px[x, BOT] = E
        for y in range(BOT + 1, 64): px[x, y] = J
    for i in range(11, SW + 4):   # join the side lip into the face lip with a rounded step
        x = i if side == 'l' else 63 - i
        for y in range(TOP - 3, TOP + 3): px[x, y] = D_
        px[x, TOP + 3] = lm[x, TOP + 1] if i > 12 else A
    for k, (i, y) in enumerate(((11, TOP + 3), (12, TOP + 4), (13, TOP + 4), (14, TOP + 3))):
        px[i if side == 'l' else 63 - i, y] = A
    return im

for nm, im in (('ledge_cap_l', cap('l')), ('ledge_cap_r', cap('r')), ('ledge_side_l', side('l')), ('ledge_side_r', side('r')), ('ledge_side_end_l', side_end('l')), ('ledge_side_end_r', side_end('r')),
               ('ledge_corner_bl', corner('l')), ('ledge_corner_br', corner('r'))):
    tiles.append((nm, im, {'kind': 'ledge'}))

# ---------------- sheet + tileset entries ----------------
rows = (len(tiles) + COLS - 1) // COLS
for sc in (1, 2, 3):
    sheet = Image.new('RGBA', (COLS * T * sc, rows * T * sc), CLEAR)
    for i, (_, im, _) in enumerate(tiles): sheet.paste(im.resize((T * sc, T * sc), Image.NEAREST), ((i % COLS) * T * sc, (i // COLS) * T * sc))
    os.makedirs(os.path.join(OW, 'tiles_extra', f'{sc}x'), exist_ok=True); sheet.save(os.path.join(OW, 'tiles_extra', f'{sc}x', 'softkit.png'))
ents = []
for i, (nm, im, m) in enumerate(tiles):
    if '~f' in nm: continue
    e = {'id': ID0 + len(ents), 'name': nm, 'sheet': 'tiles_extra/1x/softkit.png', 'index': i, 'col': i % COLS, 'row': i // COLS}
    if m.get('grass'):
        front = m['kind'] == 'front_'
        e.update(category='overlay' if front else 'deco', walkable=True, collision='walk', collision_code=0, encounter=not front,
                 animation={'type': 'rustle', 'trigger': 'on_enter', 'frame_ms': 90, 'loop': False,
                            'sync': 'tall_grass_* and tall_grass_front_*/tips_* of the cell', 'frames': [i + 1, i + 2, i + 3], 'idle_frame': i})
        if front: e['ysort'] = True
    else:
        e.update(category='deco', walkable=False, collision='block', collision_code=1, encounter=False)
    e['notes'] = 'soft grass / curved ledge kit (tools/art/soft_grass_ledges.py)'
    ents.append(e)
assert ID0 + len(ents) < 13400
for sc, fn in ((1, 'tileset.json'), (2, 'tileset_2x.json'), (3, 'tileset_3x.json')):
    p = os.path.join(OW, fn); raw = open(p).read(); ts = json.loads(raw)
    ts['tiles'] = [t for t in ts['tiles'] if not (ID0 <= t['id'] < ID0 + 400) and 'soft_grass_ledges.py' not in t.get('notes', '')]
    for e in ents:
        e2 = json.loads(json.dumps(e)); e2['sheet'] = f'tiles_extra/{sc}x/softkit.png'; ts['tiles'].append(e2)
    ts['sheets']['x_softkit'] = f'tiles_extra/{sc}x/softkit.png'
    indent = 1 if raw[:3] == '{\n ' else None
    with open(p, 'w') as fh: json.dump(ts, fh, indent=indent, separators=None if indent else (', ', ': '))
print(len(ents), 'tiles,', rows, 'sheet rows')
