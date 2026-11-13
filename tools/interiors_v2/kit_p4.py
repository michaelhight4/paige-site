"""Interiors kit pass 4 (Oct 29, 2026): redraw the leftover flat v1 pieces to the pass-3 standard
(black only on the outer silhouette, hue-shifted ramps, 1px top-front highlight, crevice shadow, baked 2px down-right shadow),
plus a tall-wall cap tile (crown moulding) so the starter house back wall reads 3 tiles tall.
Run: python3 tools/interiors_v2/kit_p4.py && python3 tools/interiors_v2/build_house_v2.py"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from draw_lib import *
import kit, kit_p3
from kit_p3 import bake, R_, BROWN, PAPER, NEW, WARM
from p3_pass2 import boards, post

TILEW = [h('70cab8'), h('3e9c92'), h('246e6c'), h('18382c')]
STL = STEEL
def base_cab(c, R, x0=2, w=60, top=60):
    """lower cabinet: counter top (top plane, warm 1px front lip), cabinet front with door + crevice, kick plate."""
    c.top(); c.r(x0, top, w, 8, CREAM[2]); c.hl(x0, top, w, CREAM[1]); c.hl(x0, top + 7, w, WARM)
    c.front(); c.r(x0, top + 8, w, 4, CREAM[3]); c.hl(x0, top + 11, w, CREAM[4])       # counter edge band
    boards(c, x0, top + 12, w, 46, R, 7, bw=w // 2, knots=0)
    c.r(x0 + 4, top + 16, w // 2 - 7, 36, R[2]); c.r(x0 + w // 2 + 3, top + 16, w // 2 - 7, 36, R[2])   # door panels
    for dx in (x0 + 4, x0 + w // 2 + 3): c.hl(dx, top + 16, w // 2 - 7, R[4]); c.vl(dx, top + 16, 36, R[4]); c.hl(dx, top + 51, w // 2 - 7, R[0])
    knob(c, x0 + w // 2 - 6, top + 30); knob(c, x0 + w // 2 + 4, top + 30)
    c.r(x0, top + 58, w, 4, R[5]); c.hl(x0, top + 58, w, R[4])                            # kick plate crevice
def splash(c, y0=34, y1=60):
    c.flat()
    for y in range(y0, y1, 6):
        for x in range(0, 64, 8): c.r(x + (4 if (y // 6) % 2 else 0), y, 7, 5, TILEW[1]); c.hl(x + (4 if (y // 6) % 2 else 0), y, 7, TILEW[0])
    c.r(0, y1 - 1, 64, 1, TILEW[2])
def upper_cab(c, R):
    c.front(); c.r(2, 4, 60, 26, R[3]); c.hl(2, 4, 60, R[1]); c.hl(2, 29, 60, R[5])
    for dx in (5, 34): c.r(dx, 7, 25, 19, R[2]); c.hl(dx, 7, 25, R[4]); c.vl(dx, 7, 19, R[4]); c.hl(dx, 25, 25, R[0])
    knob(c, 27, 18); knob(c, 36, 18)
    c.r(2, 30, 60, 3, SHADOW[:3] + (255,) if False else R[5])                              # under-cabinet crevice

def p_counter4(cond, col):
    R = R_(cond); c = Canvas(64, 128, 2); upper_cab(c, R); splash(c); base_cab(c, R)
    c.top(); c.r(30, 54, 26, 7, R[1]); c.hl(30, 54, 26, R[0]); c.r(36, 55, 12, 4, GOLD[0]); c.hl(36, 55, 12, PAPER[0])   # board + bread
    for i, (cx, cc) in enumerate(((5, RED), (13, BLUE), (21, GREEN))):                    # canisters, hue-shifted shade
        c.front(); c.r(cx, 48 + i, 7, 12 - i, cc[1]); c.vl(cx, 48 + i, 12 - i, cc[0]); c.vl(cx + 6, 48 + i, 12 - i, cc[2]); c.top(); c.hl(cx, 47 + i, 7, CREAM[1])
    if cond == 'worn': c.front(); c.line((8, 100), (12, 108), R[4]); c.p(50, 90, R[4])
    c.outline(INK); return bake(c)

def p_sink4(cond, col):
    R = R_(cond); c = Canvas(64, 128, 2); upper_cab(c, R); splash(c); base_cab(c, R)
    c.top(); c.r(14, 61, 34, 6, STL[4]); c.r(16, 62, 30, 4, STL[5]); c.hl(16, 62, 30, STL[6]); c.hl(14, 66, 34, STL[2])   # basin + crevice
    c.front(); c.r(29, 46, 3, 15, STL[3]); c.r(29, 46, 11, 3, STL[2]); c.p(38, 49, STL[4]); c.p(38, 52, BLUE[1])       # tap + drip
    c.r(4, 50, 7, 11, GREEN[1]); c.vl(4, 50, 11, GREEN[0]); c.r(6, 47, 3, 3, PAPER[0])                                   # soap
    c.r(50, 48, 11, 13, STL[5]); [c.vl(x, 49, 11, STL[2]) for x in (52, 55, 58)]; c.ell(51, 45, 9, 9, CREAM[1]); c.hl(52, 46, 6, PAPER[0])  # rack + plate
    c.outline(INK); return bake(c)

def p_stove4(cond, col):
    R = R_(cond); c = Canvas(64, 128, 2)
    c.front(); c.r(6, 6, 52, 20, STL[4]); c.hl(6, 6, 52, STL[2]); c.r(10, 22, 44, 4, STL[6]); c.dither(12, 24, 40, 2, STL[5])  # hood + vent
    splash(c, 30, 56)
    c.top(); c.r(2, 56, 60, 10, STL[3]); c.hl(2, 56, 60, STL[1]); c.hl(2, 65, 60, WARM)
    for bx in (8, 34): c.ell(bx, 57, 20, 8, STL[6]); c.ell(bx + 4, 58, 12, 5, STL[5]); c.p(bx + 9, 60, RED[2])           # burners
    c.r(36, 50, 16, 8, RED[2]); c.hl(36, 50, 16, RED[0]); c.r(34, 52, 2, 2, STL[5])                                     # pot
    c.front(); c.r(2, 66, 60, 8, STL[4]); [c.ell(x, 68, 5, 5, STL[6]) for x in (8, 20, 40, 52)]                         # knobs
    c.r(2, 74, 60, 46, STL[3]); c.vl(2, 74, 46, STL[2]); c.vl(61, 74, 46, STL[5])
    c.r(8, 80, 48, 30, STL[6]); c.r(11, 83, 42, 24, h('29252b')); c.hl(11, 83, 42, STL[5]); c.r(14, 100, 36, 4, GOLD[2]) # oven window + element glow
    c.r(10, 78, 44, 2, STL[2]); c.r(2, 118, 60, 4, STL[6])
    if cond == 'worn': c.p(20, 112, R[3]); c.p(44, 70, R[3])
    c.outline(INK); return bake(c)

def p_coat4(cond, col):
    R = R_(cond); F = kit.FABRIC[col]; c = Canvas(64, 128, 2)
    c.front(); post(c, 29, 18, 6, 98, R); c.top(); c.ell(26, 14, 12, 6, R[0]); c.front()
    for (a, b) in (((24, 26), (16, 20)), ((40, 26), (48, 20))): c.line(a, b, R[3], 2)
    c.r(20, 112, 24, 6, R[3]); c.hl(20, 112, 24, R[1]); c.hl(20, 117, 24, R[5])           # foot
    c.r(10, 22, 20, 46, F[2]); c.vl(10, 22, 46, F[1]); c.vl(29, 22, 46, F[3]); c.r(14, 20, 12, 6, F[1])  # coat
    c.vl(20, 28, 38, F[3]); [c.p(22, y, GOLD[0]) for y in (34, 44, 54)]; c.hl(10, 67, 20, F[4])
    c.r(38, 22, 12, 30, BLUE[2]); c.vl(38, 22, 30, BLUE[1]); c.vl(49, 22, 30, BLUE[3])    # scarf
    for k in range(38, 50, 3): c.vl(k, 52, 4, BLUE[1])
    c.top(); c.ell(34, 8, 18, 9, RED[1]); c.hl(37, 9, 10, RED[0]); c.front(); c.hl(32, 16, 22, RED[3])  # cap
    c.outline(INK); return bake(c)

def p_plant4(cond, col):
    G = GREEN; c = Canvas(64, 128, 2)
    c.front(); c.r(16, 92, 32, 30, RED[2]); c.vl(16, 92, 30, RED[1]); c.vl(47, 92, 30, RED[3]); c.r(13, 88, 38, 6, RED[1]); c.hl(13, 88, 38, RED[0]); c.hl(16, 121, 32, RED[3])
    c.top(); c.r(16, 88, 32, 3, h('462c22'))
    import math
    for i, (ang, ln) in enumerate(((-2.4, 40), (-1.9, 50), (-1.57, 56), (-1.2, 50), (-0.75, 40), (-2.8, 28), (-0.35, 28), (-1.4, 44), (-1.75, 44))):
        leaf(c, 32, 90, ang, ln, 12 if i < 5 else 9, [G[0], G[2], G[3], G[4]])
    if cond == 'worn': c.p(18, 60, h('e29d40')); c.p(46, 70, h('d46616')); c.p(40, 118, RED[3])
    c.outline(G[5]); return bake(c)

def p_crates4(cond, col):
    K = [h('fcd668'), h('e29d40'), h('d46616'), h('9f4013'), h('561c0e')]   # cardboard ramp (hue-shifted to red-brown)
    c = Canvas(128, 64, 2)
    def box(x, y, w, hh, tape=True, label=None):
        c.top(); c.r(x, y, w, 8, K[0]); c.hl(x, y + 7, w, WARM); c.vl(x + w // 2, y, 8, K[2])
        c.front(); c.r(x, y + 8, w, hh - 8, K[1]); c.vl(x, y + 8, hh - 8, K[0]); c.vl(x + w - 1, y + 8, hh - 8, K[3]); c.hl(x, y + hh - 1, w, K[3])
        if tape: c.r(x + w // 2 - 3, y + 8, 6, 10, CREAM[2])
        if label: c.r(x + 6, y + 18, 16, 9, PAPER[0]); c.hl(x + 8, y + 21, 12, label); c.hl(x + 8, y + 24, 8, PAPER[3])
    box(4, 26, 52, 36, label=BLUE[2]); box(60, 30, 60, 32, label=RED[1]); box(14, 2, 36, 26, tape=False)
    c.top(); c.r(22, 0, 8, 4, PAPER[1]); c.r(26, -1, 10, 3, RED[1])                          # books poking out
    c.outline(INK); return bake(c)

def p_wallcap(cond, col):   # 1x1 tall-wall cap: ceiling shadow, crown moulding, wallpaper continuing down (matches iwall_upper_house)
    c = Canvas(64, 64, 5); WALL = [h('f8eabe'), h('ccc6c2'), h('a8a0a4')]; R = R_('normal')
    c.r(0, 0, 64, 64, WALL[0])
    for x in range(4, 64, 16): c.vl(x, 14, 50, WALL[1])                                       # wallpaper stripes
    c.r(0, 0, 64, 4, h('29252b')); c.dither(0, 4, 64, 2, h('29252b'))                          # ceiling crevice
    c.r(0, 6, 64, 6, R[2]); c.hl(0, 6, 64, R[0]); c.hl(0, 11, 64, R[4]); c.hl(0, 12, 64, R[5])  # crown moulding
    c.dither(0, 13, 64, 2, WALL[2])
    return c
NEW4 = {
    'kitchen_counter3': (p_counter4, 1, 2, ['teal'], False, ['home', 'inn'], 'block'),
    'kitchen_sink3':    (p_sink4, 1, 2, ['teal'], False, ['home', 'inn', 'clinic'], 'block'),
    'kitchen_stove3':   (p_stove4, 1, 2, ['teal'], False, ['home', 'inn'], 'block'),
    'coat_rack3':       (p_coat4, 1, 2, ['red', 'green'], False, ['home', 'office', 'inn'], 'block'),
    'plant_tall3':      (p_plant4, 1, 2, ['green'], False, ['home', 'office', 'hall', 'shop', 'clinic', 'inn'], 'block'),
    'crates3':          (p_crates4, 2, 1, ['red'], False, ['home', 'shop', 'lab'], 'block'),
    'wall_cap_tall':    (p_wallcap, 1, 1, ['cream'], False, ['home'], 'wall'),
}
if __name__ == '__main__':
    kit.KIT.update(NEW); kit.KIT.update(NEW4); cat = kit.build()
    old = {'kitchen_counter': 'kitchen_counter3', 'kitchen_sink': 'kitchen_sink3', 'kitchen_stove': 'kitchen_stove3', 'coat_rack': 'coat_rack3', 'plant_tall': 'plant_tall3', 'crates': 'crates3'}
    for e in cat:
        if e['piece'] == 'bookshelf_p2worn': e['status'] = 'REJECTED (Gary, Oct 28 2026): pass-2 worn bookshelf; do not use'
        if e['piece'] == 'bookshelf3': e['status'] = 'APPROVED worn = test3.png worn shelf (Gary, Oct 28 2026)' if e['condition'] == 'worn' else 'APPROVED normal = pass-2 normal shelf'
        if e['piece'] in ('couch_front', 'couch_side'): e['status'] = 'REJECTED (Gary, Oct 28 2026 1:30 AM: wrong scale); use couch_low'
        if e['piece'] == 'couch3': e['status'] = 'REJECTED (Gary, Oct 28 2026: "looks awful")'
        if e['piece'] in old: e['status'] = 'SUPERSEDED (Oct 29 2026) by %s (pass-3 standard)' % old[e['piece']]
        if e['piece'] in NEW4: e['status'] = 'PASS 4 (Oct 29 2026): pass-3 standard redraw'
    json.dump(cat, open('/workspace/quality/dev_notes/kilumen_interiors_kit.json', 'w'), indent=1)
