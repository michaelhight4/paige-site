"""Old crystal polisher v1 (Gary, Oct 29 2026): the ORIGINAL heal-centre machine (i_crystal_polisher, ids 7476/7477 top,
7478/7479 bottom, interiors_new i_brand_v3.png cells 12..15; heal_* maps at (5,1)) redrawn at the furniture-v2 level - same
silhouette and design (stepped top unit, hex crystal window, side screens, slider, orange/green lamps, slot, violet trim
stripe, navy plinth), v2 outline, stepped shading (no dither), v2 palette and drop shadow - with lively lights:
6 frames (frame 0 = the tile's own cells, 1..5 = free sheet cells) driven by a long non-uniform sequence: staggered
orange/green blinks, an occasional teal chase along the top bar and the slot, a level meter in the right screen and a soft
pulse in the crystal core. Night glow comes from ixlight's crystal_polisher light source. Collision is NOT touched.
Run after build_v3_hybrid.py:  python3 tools/furniture_v2/old_machine_v1.py
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OW = os.path.join(ROOT, 'art/world/overworld')
O = (24, 18, 30, 255)
SH, SH2 = (40, 24, 30, 95), (40, 24, 30, 35)
T = (0, 0, 0, 0)
# v2 blue body ramp (old hues, stepped)
B = dict(hi=(214, 240, 250, 255), l0=(176, 222, 244, 255), l1=(136, 200, 236, 255), m=(108, 178, 226, 255),
         d1=(80, 146, 206, 255), d2=(58, 112, 180, 255), d3=(44, 82, 146, 255))
N = dict(n0=(70, 86, 150, 255), n1=(50, 62, 122, 255), n2=(38, 46, 96, 255), dot=(112, 160, 216, 255), side=(46, 98, 160, 255))
HEX = dict(f0=(112, 148, 214, 255), f1=(82, 116, 190, 255), f2=(60, 86, 158, 255))
SCR = dict(bg=(56, 50, 70, 255), bg2=(44, 38, 56, 255), fr=(52, 96, 160, 255))
TEAL = dict(on=(150, 236, 214, 255), mid=(112, 202, 184, 255), off=(62, 132, 128, 255), dk=(40, 92, 96, 255))
CORE = [  # crystal core pulse levels: (glass, ring, inner, centre)
    ((38, 98, 100, 255), (60, 140, 132, 255), (100, 190, 172, 255), (200, 240, 236, 255)),
    ((40, 106, 106, 255), (70, 156, 144, 255), (124, 212, 190, 255), (226, 250, 246, 255)),
    ((44, 116, 112, 255), (86, 176, 158, 255), (156, 232, 210, 255), (250, 255, 255, 255))]
ORA = ((236, 168, 72, 255), (255, 214, 130, 255), (120, 76, 44, 255))   # on, glint, off
GRN = ((176, 220, 104, 255), (226, 250, 170, 255), (82, 108, 58, 255))
VIO = ((160, 96, 222, 255), (128, 72, 196, 255), (96, 50, 160, 255))

# frame states: core level, orange, green, chase segment (-1 none), meter level 0..4, left-screen line mask
FR = [dict(core=1, o=1, g=1, ch=-1, me=2, ln=(1, 1, 1)),
      dict(core=2, o=0, g=1, ch=0, me=3, ln=(1, 1, 0)),
      dict(core=2, o=1, g=0, ch=1, me=4, ln=(1, 0, 1)),
      dict(core=1, o=0, g=0, ch=2, me=3, ln=(0, 1, 1)),
      dict(core=0, o=1, g=1, ch=3, me=1, ln=(1, 1, 1)),
      dict(core=0, o=1, g=0, ch=-1, me=2, ln=(1, 0, 1))]
# ~3.4 s loop at 140 ms: mostly calm blinking with uneven gaps, one chase pass (1-2-3) per loop, core breathes 0->1->2->1->0
SEQ = [0, 0, 5, 5, 0, 4, 4, 0, 5, 0, 0, 4, 0, 1, 2, 3, 2, 1, 0, 5, 0, 4, 0, 0]
FRAME_MS = 140


class Cv:
    def __init__(s, w=128, h=128): s.im = Image.new('RGBA', (w, h), T); s.px = s.im.load(); s.w, s.h = w, h
    def p(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.px[x, y] = c
    def rect(s, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.p(x, y, c)


def shadow(cv, boxes, dx=4, dy=2):
    m = set()
    for x0, y0, x1, y1 in boxes:
        for y in range(y0 + dy, y1 + dy + 1):
            for x in range(x0 + dx, x1 + dx + 1): m.add((x, y))
    for (x, y) in m: cv.p(x, y, SH)
    for (x, y) in m:
        for nx, ny in ((x + 1, y), (x, y + 1)):
            if (nx, ny) not in m: cv.p(nx, ny, SH2)


def frame_box(cv, x0, y0, x1, y1):
    for x in range(x0, x1 + 1): cv.p(x, y0, O); cv.p(x, y1, O)
    for y in range(y0, y1 + 1): cv.p(x0, y, O); cv.p(x1, y, O)


def hex_rows(cx, cy, hw, hh, cut):
    """Flat-top hexagon rows: dict y -> half width (pointy left/right)."""
    r = {}
    for y in range(cy - hh, cy + hh + 1):
        d = abs(y - cy); r[y] = hw - max(0, d - (hh - cut)) if False else hw - round(d * cut / hh)
    return r


def machine(f):
    s = FR[f]; cv = Cv()
    shadow(cv, [(14, 4, 112, 49), (8, 49, 120, 116)])
    # ---- top unit x14..112 y4..49
    cv.rect(15, 5, 111, 49, B['m'])
    cv.rect(15, 5, 111, 6, B['hi']); cv.rect(15, 7, 111, 8, B['l0']); cv.rect(15, 44, 111, 49, B['d1'])
    cv.rect(105, 7, 111, 49, B['d1']); cv.rect(109, 7, 111, 49, B['d2']); cv.rect(109, 44, 111, 49, B['d3'])
    for y in range(9, 44, 4): cv.p(16, y, B['l1'])
    # top teal bar (chase)
    cv.rect(30, 5, 96, 7, O); cv.rect(32, 6, 94, 6, TEAL['mid'])
    if s['ch'] >= 0:
        a = 32 + s['ch'] * 16; cv.rect(a, 6, a + 14, 6, TEAL['on'])
    # side screens
    cv.rect(18, 14, 33, 43, SCR['fr']); cv.rect(20, 15, 31, 41, SCR['bg']); cv.rect(20, 15, 31, 15, SCR['bg2'])
    frame_box(cv, 19, 14, 32, 42)
    for k, y in enumerate((20, 26, 32)):
        cv.rect(22, y, 29, y, TEAL['mid'] if s['ln'][k] else TEAL['dk'])
        if s['ln'][k]: cv.p(22, y, TEAL['on'])
    cv.rect(92, 14, 106, 43, SCR['fr']); cv.rect(94, 15, 104, 41, SCR['bg']); cv.rect(94, 15, 104, 15, SCR['bg2'])
    frame_box(cv, 93, 14, 105, 42)
    for k in range(4):  # meter bars bottom-up
        y = 39 - k * 5; on = k < s['me']
        cv.rect(96, y - 3, 102, y, TEAL['mid'] if on else TEAL['dk'])
        if on: cv.rect(96, y - 3, 102, y - 3, TEAL['on'])
    # hex crystal window
    cx, cy = 63, 28
    outer = hex_rows(cx, cy, 22, 20, 8); inner = hex_rows(cx, cy, 17, 15, 6)
    for y, hw in outer.items():
        cv.p(cx - hw - 1, y, O); cv.p(cx + hw + 1, y, O)
        for x in range(cx - hw, cx + hw + 1):
            cv.p(x, y, HEX['f0'] if y < cy - 8 or x < cx - hw + 3 else HEX['f2'] if (y > cy + 8 or x > cx + hw - 3) else HEX['f1'])
    for x in range(cx - outer[cy - 20], cx + outer[cy - 20] + 1): cv.p(x, cy - 21, O); cv.p(x, cy + 21, O)
    c = CORE[s['core']]
    for y, hw in inner.items():
        cv.p(cx - hw - 1, y, O); cv.p(cx + hw + 1, y, O)
        for x in range(cx - hw, cx + hw + 1):
            d = ((x - cx) ** 2 + ((y - cy) * 1.15) ** 2) ** .5
            col = c[0]
            if y < cy - 9 and x < cx: col = (c[0][0] + 6, c[0][1] + 10, c[0][2] + 10, 255)
            if d < 9 + s['core']: col = c[1]
            if d < 5 + s['core'] * .6: col = c[2]
            if d < 2.2: col = c[3]
            cv.p(x, y, col)
    for x in range(cx - inner[cy - 15], cx + inner[cy - 15] + 1): cv.p(x, cy - 16, O); cv.p(x, cy + 16, O)
    for y in range(cy + 3, cy + 15): cv.p(cx, y, c[1])   # stem line (old design)
    cv.p(cx - 1, cy - 1, c[3]); cv.p(cx - 2, cy - 2, (255, 255, 255, 255)) if s['core'] == 2 else None
    for k in range(4): cv.p(cx - 12 + k, cy - 10 - k // 2, c[1])  # glass glint
    frame_box(cv, 14, 4, 112, 49)
    # ---- base x8..120 y49..116
    cv.rect(9, 50, 119, 115, B['l1'])
    cv.rect(9, 50, 119, 51, B['hi']); cv.rect(9, 52, 119, 54, B['l0'])
    cv.rect(9, 55, 119, 63, B['l1']); cv.rect(9, 64, 119, 69, B['m']); cv.rect(9, 70, 119, 70, B['d1'])
    cv.rect(9, 71, 119, 75, B['m']); cv.rect(16, 76, 112, 76, B['d1'])
    cv.rect(9, 77, 119, 85, B['l1']); cv.rect(9, 86, 119, 96, B['m']); cv.rect(9, 92, 119, 96, B['d1'])
    cv.rect(114, 55, 119, 96, B['d2']); cv.rect(114, 52, 119, 54, B['l1'])
    cv.rect(9, 97, 119, 98, VIO[0]); cv.rect(9, 99, 119, 100, VIO[1]); cv.rect(114, 97, 119, 100, VIO[2])
    cv.rect(9, 101, 119, 115, N['n1']); cv.rect(9, 101, 119, 101, N['n0']); cv.rect(9, 112, 119, 115, N['n2'])
    cv.rect(114, 101, 119, 115, N['side'])
    for y in (104, 108):
        for x in range(12, 112, 4): cv.p(x, y, N['dot'])
    for y in (50, 51, 52): cv.p(9 if y > 50 else 10, y, B['hi'])
    # slider
    cv.rect(22, 57, 47, 60, O); cv.rect(23, 58, 46, 59, SCR['bg']); cv.rect(30, 56, 33, 61, (150, 142, 154, 255)); cv.rect(30, 56, 33, 56, (196, 190, 200, 255))
    frame_box(cv, 29, 56, 34, 61) if False else None
    # lamps
    for (x0, col, on) in ((90, ORA, s['o']), (100, GRN, s['g'])):
        cv.rect(x0, 56, x0 + 5, 61, O); cv.rect(x0 + 1, 57, x0 + 4, 60, col[0] if on else col[2])
        if on: cv.p(x0 + 1, 57, col[1]); cv.p(x0 + 2, 57, col[1]); cv.p(x0 + 1, 58, col[1])
    # slot (chase, offset from the top bar for a running feel)
    cv.rect(38, 88, 88, 91, O); cv.rect(40, 89, 86, 90, TEAL['mid']); cv.rect(40, 89, 86, 89, TEAL['on'] if s['ch'] < 0 else TEAL['mid'])
    if s['ch'] >= 0:
        a = 40 + ((s['ch'] + 1) % 4) * 12; cv.rect(a, 89, min(86, a + 10), 90, TEAL['on'])
    frame_box(cv, 8, 49, 120, 116)
    cv.rect(14, 49, 112, 49, O)
    for x in range(15, 112): cv.p(x, 49, B['d2'])  # seam between units (old darker lip)
    cv.p(8, 116, T); cv.p(120, 116, SH)
    return cv.im


CELLS = [(12, 13, 14, 15), (32, 33, 34, 35), (36, 37, 38, 39), (40, 41, 42, 43), (27, 28, 29, 30), (31, 44, 45, 46)]
IDS = (7476, 7477, 7478, 7479)


def put(imgs):
    for n in (1, 2, 3):
        path = os.path.join(OW, f'interiors_new/tiles_{n}x/i_brand_v3.png'); sh = Image.open(path).convert('RGBA'); C = 64 * n
        for cells, im in zip(CELLS, imgs):
            big = im.resize((128 * n, 128 * n), Image.NEAREST)
            for k, i in enumerate(cells):
                part = big.crop((k % 2 * C, k // 2 * C, k % 2 * C + C, k // 2 * C + C)); x, y = i % 16 * C, i // 16 * C
                sh.paste(Image.new('RGBA', (C, C), T), (x, y)); sh.paste(part, (x, y))
        sh.save(path, optimize=True)


def main():
    imgs = [machine(f) for f in range(len(FR))]; put(imgs)
    ap = os.path.join(OW, 'furniture_v3_anim.json'); anim = json.load(open(ap))
    for k, tid in enumerate(IDS):
        anim['anim'][str(tid)] = {'frames': [CELLS[f][k] for f in SEQ], 'frame_ms': FRAME_MS}
    if 'old_machine_v1' not in anim['note']: anim['note'] += '; old_machine_v1: 7476-7479 original crystal polisher + lively lights (tools/furniture_v2/old_machine_v1.py)'
    json.dump(anim, open(ap, 'w'), indent=1)
    return imgs


if __name__ == '__main__':
    imgs = main(); print('old machine v1 written')
