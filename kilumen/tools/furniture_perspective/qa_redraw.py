#!/usr/bin/env python3
"""Director QA redraws (Oct 30, 2026, wd/furniture-perspective): bed, heal counter, specimen vats, shop shelf top.

Rules (README): 35 deg lean = top face + front face, top face >= 25% lighter (greyscale) than the front, light from the
top-left (right side / bottom darker), 1-2 px drop shadow down-right. Drawn at 1x (64 px) on the *_v3 sheets, then
copied nearest x2/x3 (the v3 sheets are exact nearest upscales) and the .webp twins rewritten (lossless).
interior_v3 cells also get a flat two-plane normal cell in interior_v3_n.png (top face tilts up, front faces the viewer).
  python3 tools/furniture_perspective/qa_redraw.py        redraw + write
"""
import json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '../../art/world/overworld'))
INK = (34, 24, 22, 255); SH = (26, 18, 38, 96)
T = {t['name']: t for f in ('tileset.json', 'tileset_ix2.json') for t in json.load(open(os.path.join(OW, f)))['tiles']}

def L(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
class Can:
    def __init__(s, w, h): s.a = np.zeros((h, w, 4), np.uint8); s.n = np.zeros((h, w, 4), np.uint8)
    def rect(s, x0, y0, x1, y1, c, n=None):   # inclusive
        s.a[y0:y1 + 1, x0:x1 + 1] = c if len(c) == 4 else (*c, 255)
        if n is not None: s.n[y0:y1 + 1, x0:x1 + 1] = n
    def px(s, x, y, c): s.a[y, x] = c if len(c) == 4 else (*c, 255)
    def outline(s):   # 1 px ink round the opaque shape (inside edge), then the down-right drop shadow
        op = s.a[..., 3] == 255; e = op.copy(); e[1:-1, 1:-1] = op[:-2, 1:-1] & op[2:, 1:-1] & op[1:-1, :-2] & op[1:-1, 2:]
        e[0, :] = e[-1, :] = False; e[:, 0] = e[:, -1] = False
        s.a[op & ~e] = INK
        for dx, dy in ((2, 2), (1, 2), (2, 1)):
            sh = np.zeros_like(op); sh[dy:, dx:] = op[:-dy, :-dx]; m = sh & (s.a[..., 3] == 0); s.a[m] = SH
NTOP, NFRONT, NSIDE = (128, 64, 232, 255), (128, 200, 200, 255), (210, 140, 200, 255)

def bed():
    c = Can(64, 128); x0, x1 = 6, 56
    wtop, wfr, wdk = (204, 150, 96), (136, 88, 52), (98, 62, 36)
    c.rect(x0, 2, x1, 7, wtop); c.rect(x0, 8, x1, 22, wfr); c.rect(x0 + 3, 11, x1 - 3, 19, wdk)   # headboard: cap top + front
    c.rect(x0 + 4, 12, x1 - 4, 18, (150, 98, 58))
    c.rect(x0 + 1, 23, x1 - 1, 99, (232, 224, 208))                                           # mattress top (sheet)
    c.rect(x0 + 6, 26, x1 - 6, 42, (248, 244, 234)); c.rect(x0 + 6, 40, x1 - 6, 42, (216, 208, 196))  # pillow
    c.rect(x0 + 7, 27, x0 + 12, 29, (255, 252, 246))
    c.rect(x0 + 1, 46, x1 - 1, 99, (156, 126, 210)); c.rect(x0 + 1, 46, x1 - 1, 51, (240, 232, 216))  # blanket + fold
    c.rect(x0 + 1, 52, x0 + 4, 99, (182, 156, 228))                                           # lit left edge
    c.rect(x1 - 4, 52, x1 - 1, 99, (128, 100, 184))                                           # shaded right edge
    c.rect(x0 + 1, 84, x1 - 1, 89, (226, 186, 86))                                            # gold stripe on top
    c.rect(x0 + 1, 100, x1 - 1, 109, (98, 74, 150))                                           # blanket front drop
    c.rect(x0 + 1, 100, x1 - 1, 101, (118, 92, 172))
    c.rect(x0, 110, x1, 112, wtop); c.rect(x0, 113, x1, 120, wfr); c.rect(x1 - 3, 110, x1, 120, wdk)  # footboard top + front
    c.rect(x0 + 1, 121, x0 + 5, 124, wdk); c.rect(x1 - 5, 121, x1 - 1, 124, wdk)              # legs
    c.outline(); assert L((156, 126, 210)) >= 1.25 * L((98, 74, 150)) and L(wtop) >= 1.25 * L(wfr)
    return c

def counter():
    top, lip, fr, pan, kick = (252, 238, 242), (232, 210, 220), (212, 92, 122), (186, 70, 102), (146, 50, 78)
    out = {}
    for part in ('l', 'm', 'r'):
        c = Can(64, 64); xa = 3 if part == 'l' else 0; xb = 59 if part == 'r' else 63
        c.rect(xa, 6, xb, 25, top, NTOP); c.rect(xa, 24, xb, 26, lip, NTOP)                    # top face (counter top)
        c.rect(xa, 27, xb, 55, fr, NFRONT); c.rect(xa, 27, xb, 28, (232, 124, 150), NFRONT)    # front face
        for px0 in range(xa + 4, xb - 6, 12): c.rect(px0, 32, px0 + 8, 51, pan, NFRONT); c.rect(px0, 32, px0 + 8, 33, (168, 58, 88), NFRONT)
        c.rect(xa, 56, xb, 58, kick, NFRONT)
        if part == 'l': c.rect(xa, 8, xa + 2, 25, (255, 250, 252), NTOP)
        if part == 'r': c.rect(xb - 3, 27, xb, 58, (170, 64, 94), NSIDE)
        if part == 'm': c.rect(28, 12, 35, 19, (236, 186, 72), NTOP); c.rect(29, 12, 31, 14, (252, 226, 140), NTOP); c.rect(30, 20, 33, 21, (172, 122, 40), NTOP)
        op = c.a[..., 3] == 255
        # ink only on the outer edges that end the counter (no seams between cells)
        c.a[6, xa:xb + 1] = INK; c.a[58, xa:xb + 1] = INK
        if part == 'l': c.a[6:59, xa] = INK
        if part == 'r': c.a[6:59, xb] = INK
        for y in (59, 60): c.a[y, xa + 2:min(64, xb + 3)][c.a[y, xa + 2:min(64, xb + 3), 3] == 0] = SH
        if part == 'r': c.a[8:61, 60:62][c.a[8:61, 60:62, 3] == 0] = SH
        out[part] = c
    assert L(top) >= 1.25 * L(fr)
    return out

def tank():
    c = Can(64, 128); x0, x1 = 14, 49
    c.rect(x0 + 2, 3, x1 - 2, 11, (220, 230, 242)); c.rect(x0 + 4, 4, x0 + 10, 5, (246, 250, 255))   # cap top face
    c.rect(x0, 12, x1, 20, (108, 118, 142)); c.rect(x1 - 3, 12, x1, 20, (84, 92, 114))               # cap front
    c.rect(x0 + 1, 21, x1 - 1, 91, (168, 222, 240)); c.rect(x0 + 3, 23, x0 + 5, 89, (228, 246, 252)) # glass
    c.rect(x1 - 5, 21, x1 - 1, 91, (132, 190, 216))
    cx, cy = 32, 56
    for dy in range(-20, 21):
        w = (20 - abs(dy)) // 2
        for dx in range(-w, w + 1): c.px(cx + dx, cy + dy, (196, 162, 242) if dx < 0 and dy < 0 else (150, 98, 222) if dx <= 0 or dy < 0 else (104, 64, 170))
    for bx, by in ((22, 80), (40, 70), (24, 40), (38, 30)): c.rect(bx, by, bx + 1, by + 1, (240, 250, 255))
    c.rect(x0 - 1, 92, x1 + 1, 100, (208, 216, 228)); c.rect(x0 + 1, 93, x0 + 8, 94, (238, 242, 248))   # base top face
    c.rect(x0 - 1, 101, x1 + 1, 120, (96, 104, 128)); c.rect(x1 - 2, 101, x1 + 1, 120, (74, 80, 102))   # base front
    c.rect(x0 + 3, 106, x0 + 5, 108, (120, 222, 170)); c.rect(x0 + 9, 106, x0 + 11, 108, (236, 196, 90))
    c.rect(x0 + 2, 112, x1 - 4, 113, (82, 90, 112))
    c.outline(); assert L((220, 230, 242)) >= 1.25 * L((108, 118, 142)) and L((208, 216, 228)) >= 1.25 * L((96, 104, 128))
    return c

def shelf_top(a):   # a: 128x64 goods stack (existing art); give the cabinet a real top face (rows 0-15)
    a = a.copy(); x0, x1 = 4, 57
    a[0:16, :] = 0
    a[2:3, x0 + 2:x1 - 1] = INK; a[2:14, x0 + 1] = INK; a[2:14, x1 - 1] = INK   # back edge + sides (trapezoid: back inset)
    a[3:14, x0 + 2:x1 - 1] = (238, 232, 214, 255); a[3:14, x0 + 2:x0 + 5] = (250, 246, 234, 255)
    a[3:14, x1 - 4:x1 - 1] = (212, 204, 182, 255)
    a[14:16, x0:x1 + 1] = (150, 140, 108, 255); a[14:16, x0] = INK; a[14:16, x1] = INK; a[16, x0:x1 + 1] = INK
    a[3:6, x0:x0 + 1] = 0; a[3:6, x1:x1 + 1] = 0
    for y in range(4, 17): a[y, x1 + 1:x1 + 3][a[y, x1 + 1:x1 + 3, 3] == 0] = SH
    assert L((238, 232, 214)) >= 1.25 * L((150, 140, 108))
    return a

def sheet(t, s): return os.path.join(OW, t['sheet'].replace('tiles_1x', f'tiles_{s}x').replace('.png', '_v3.png'))
_open = {}
def img(p):
    if p not in _open: _open[p] = np.array(Image.open(p).convert('RGBA'))
    return _open[p]
def put(name, arr, narr=None):
    t = T[name]; p = sheet(t, 1); a = img(p); a[t['row'] * 64:(t['row'] + 1) * 64, t['col'] * 64:(t['col'] + 1) * 64] = arr
    if narr is not None:
        n = img(os.path.join(OW, 'tiles_1x/interior_v3_n.png')); cell = narr.copy(); cell[arr[..., 3] != 255] = 0
        n[t['row'] * 64:(t['row'] + 1) * 64, t['col'] * 64:(t['col'] + 1) * 64] = cell
def get(name):
    t = T[name]; return img(sheet(t, 1))[t['row'] * 64:(t['row'] + 1) * 64, t['col'] * 64:(t['col'] + 1) * 64].copy()

if __name__ == '__main__':
    b = bed(); put('i_bed_brook_0_0', b.a[:64]); put('i_bed_brook_1_0', b.a[64:])
    for k, c in counter().items(): put(f'counter_heal_{k}', c.a, c.n)
    v = tank(); put('i_specimen_tank_0_0', v.a[:64]); put('i_specimen_tank_1_0', v.a[64:])
    g = np.vstack([get('goods_0_0'), get('goods_1_0')]); g2 = shelf_top(g); put('goods_0_0', g2[:64])
    for p, a in _open.items():
        Image.fromarray(a).save(p)
        if p.endswith('_n.png'):
            Image.fromarray(a).save(p[:-4] + '.webp', lossless=True, quality=100, method=6); continue
        for s in (2, 3):
            q = p.replace('tiles_1x', f'tiles_{s}x'); up = Image.fromarray(a).resize((a.shape[1] * s, a.shape[0] * s), Image.NEAREST)
            up.save(q); up.save(q[:-4] + '.webp', lossless=True, quality=100, method=6)
        Image.fromarray(a).save(p[:-4] + '.webp', lossless=True, quality=100, method=6)
        print('wrote', os.path.relpath(p, OW))
