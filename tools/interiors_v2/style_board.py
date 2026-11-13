"""Lab + shop style board (kit v1 conventions, normal condition, DEV preview only; not yet in the tileset).
Lab layouts follow the DS refs (bench rows, consoles on the back wall); finish/density follows the Stardew bar.
Run: python3 tools/interiors_v2/style_board.py -> shots/interiors_v2/style_board.png"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from kit import *
from PIL import ImageDraw, ImageFont
W = WOODS['normal']; T = FABRIC['teal']; B = FABRIC['blue']; G = FABRIC['green']; RD = FABRIC['red']; P = FABRIC['purple']
WH = [h('fcf6e8'), h('e8e4e0'), h('c8c4c8'), h('9a98a6'), h('6a6a7a')]
def steel_box(c, x, y, w, hh, top):
    c.top(); c.r(x, y, w, top, WH[1]); c.hl(x, y, w, WH[0]); c.front(); c.r(x, y + top, w, hh - top, WH[2]); c.hl(x, y + top, w, WH[3]); c.hl(x, y + hh - 2, w, WH[4])
def beaker(c, x, y, F, hh=10):
    c.r(x, y, 6, hh, h('c6ecfa')); c.r(x + 1, y + hh // 2, 4, hh - hh // 2 - 1, F[1]); c.hl(x + 1, y + hh // 2, 4, F[0]); c.vl(x, y, hh, WH[3]); c.p(x + 1, y + 1, WH[0]); c.hl(x - 1, y, 8, WH[3])
def lab_bench():  # 2x1
    c = Canvas(128, 64); steel_box(c, 2, 14, 124, 46, 18); c.r(2, 14, 124, 18, h('2c64a8')); c.hl(2, 14, 124, B[1]); [c.p(x, 22 + (x % 5), B[3]) for x in range(6, 124, 7)]
    for dx in (6, 66):
        c.front(); c.r(dx, 36, 54, 20, WH[2]); c.hl(dx, 36, 54, WH[3]); c.vl(dx + 27, 36, 20, WH[3]); knob(c, dx + 22, 44, [STEEL[2], STEEL[3], STEEL[4]]); knob(c, dx + 31, 44, [STEEL[2], STEEL[3], STEEL[4]])
    c.top(); beaker(c, 10, 6, G, 14); beaker(c, 20, 10, P); beaker(c, 30, 8, RD, 12)
    c.r(44, 8, 22, 12, WH[4]); c.r(46, 9, 18, 6, h('24522e')); [c.p(47 + i, 12 - (i % 3), G[0]) for i in range(16)]   # scope screen
    c.r(78, 10, 16, 3, WH[3]); c.r(84, 2, 4, 10, WH[4]); c.ell(80, 0, 10, 6, WH[3]); c.p(85, 12, h('fcf6e8'))         # microscope
    c.r(100, 12, 18, 10, h('fcf6e8')); [c.hl(102, 14 + i * 2, 13, WH[3]) for i in range(4)]; c.p(116, 12, RD[1])          # clipboard
    return finish(c)
def specimen_tank():  # 1x2
    c = Canvas(64, 128); steel_box(c, 6, 98, 52, 26, 8)
    c.front(); c.r(10, 14, 44, 84, h('70cab8')); c.r(12, 30, 40, 66, T[1]); [c.p(14 + (i * 7) % 36, 34 + (i * 11) % 58, T[0]) for i in range(14)]
    c.ell(20, 50, 24, 16, P[1]); c.ell(24, 54, 6, 5, h('fcf6e8')); c.p(26, 56, LINE); c.vl(32, 66, 18, P[2]); c.vl(28, 64, 14, P[3])   # (original) floating sprout specimen
    c.vl(12, 16, 80, h('c6ecfa')); c.vl(13, 16, 80, h('fcf6e8')); c.vl(52, 16, 80, T[3])
    steel_box(c, 6, 6, 52, 12, 6); [c.p(12 + i * 8, 10, h('a6d460') if i % 2 else RD[1]) for i in range(5)]
    return finish(c)
def console():  # 1x2 wall console
    c = Canvas(64, 128); steel_box(c, 4, 10, 56, 112, 6)
    for i, F in enumerate((G, B)):
        y = 22 + i * 34; c.r(10, y, 44, 26, LINE); c.r(12, y + 2, 40, 22, F[4]); [c.hl(14, y + 5 + k * 4, 6 + (k * 13) % 30, F[1]) for k in range(5)]; c.p(48, y + 4, F[0])
    c.top(); c.r(8, 92, 48, 14, WH[3]); [c.r(11 + k * 7, 95 + (k % 2) * 5, 4, 3, [RD[1], G[1], h('eea23c'), B[1]][k % 4]) for k in range(6)]
    c.front(); [c.ell(12 + k * 14, 110, 6, 6, STEEL[3]) for k in range(3)]
    return finish(c)
def heal_pod():  # 1x1
    c = Canvas(64, 64); steel_box(c, 6, 30, 52, 30, 10); c.top(); c.ell(10, 4, 44, 34, h('c6ecfa')); c.ell(14, 8, 36, 26, T[1]); c.ell(18, 10, 12, 6, h('fcf6e8'))
    c.ell(26, 16, 12, 12, RD[1]); c.r(30, 18, 4, 8, h('fcf6e8')); c.r(28, 20, 8, 4, h('fcf6e8'))
    c.front(); [c.p(14 + k * 6, 50, G[0] if k < 5 else RD[1]) for k in range(7)]
    return finish(c)
def shop_counter():  # 2x1
    c = Canvas(128, 64); slab(c, 2, 14, 124, 46, 14, W, 'normal'); panel_door(c, 8, 34, 34, 22, W, 'normal'); panel_door(c, 46, 34, 34, 22, W, 'normal'); panel_door(c, 84, 34, 34, 22, W, 'normal')
    c.top(); c.r(8, 0, 30, 22, STEEL[3]); c.r(10, 2, 26, 8, LINE); c.hl(12, 5, 12, G[0]); [c.r(11 + k * 6, 13, 4, 3, WH[1]) for k in range(4)]; c.r(8, 20, 30, 4, STEEL[4])  # register
    c.r(50, 8, 20, 12, h('fcf6e8')); c.hl(52, 10, 16, RD[1]); [c.hl(52, 13 + k * 2, 14, WH[3]) for k in range(3)]                                            # receipt pad
    for k, F in enumerate((RD, B, P)): c.ell(80 + k * 12, 6, 10, 12, F[1]); c.r(83 + k * 12, 3, 4, 4, WH[2]); c.p(82 + k * 12, 8, F[0])                          # potion jars
    c.r(116, 6, 8, 10, h('eea23c')); c.p(117, 7, h('fcf6e8'))
    return finish(c)
def goods_shelf():  # 1x2
    c = Canvas(64, 128); slab(c, 4, 6, 56, 118, 8, W, 'normal', side=5)
    for i in range(4):
        y = 22 + i * 25; c.front(); c.r(8, y, 44, 20, W[4]); c.hl(8, y + 20, 44, W[1]); c.hl(8, y + 21, 44, W[3])
        for k in range(4):
            F = [RD, B, G, P, T][(i + k) % 5]; x = 10 + k * 11
            if i % 2: c.ell(x, y + 6, 9, 14, F[1]); c.r(x + 3, y + 3, 3, 4, WH[2]); c.p(x + 2, y + 9, F[0])
            else: c.r(x, y + 8, 9, 12, F[2]); c.hl(x, y + 8, 9, F[0]); c.vl(x + 8, y + 8, 12, F[3]); c.r(x + 2, y + 12, 5, 3, WH[0])
    c.r(10, 10, 40, 8, h('fcf6e8')); c.hl(12, 13, 20, RD[2]); c.p(44, 13, RD[2])     # price card
    return finish(c)
def barrel_bin():  # 1x1
    c = Canvas(64, 64); c.front(); c.r(10, 18, 44, 42, W[2]); [c.vl(10 + k * 8, 18, 42, W[3]) for k in range(6)]; c.r(10, 26, 44, 3, STEEL[3]); c.r(10, 48, 44, 3, STEEL[3]); c.vl(12, 18, 42, W[0])
    c.top(); c.ell(8, 10, 48, 18, W[3]); c.ell(11, 12, 42, 13, h('eea23c'));
    for k in range(9): c.ell(13 + (k * 9) % 34, 11 + (k * 5) % 9, 7, 6, [h('eea23c'), RD[1], h('a6d460')][k % 3]); c.p(15 + (k * 9) % 34, 12 + (k * 5) % 9, h('fcf6e8'))
    c.front(); c.r(36, 32, 16, 10, h('fcf6e8')); c.hl(38, 35, 10, RD[2]); c.hl(38, 38, 7, WH[3])
    return finish(c)
def sign_board():  # 1x1 wall
    c = Canvas(64, 64); c.front(); c.r(6, 10, 52, 40, W[2]); c.r(9, 13, 46, 34, h('24522e')); c.vl(9, 13, 34, h('367634'))
    for k, wd in enumerate((30, 22, 26, 18)): c.hl(13, 18 + k * 7, wd, h('fcf6e8')); c.p(13 + wd + 4, 18 + k * 7, h('eea23c'))
    c.r(30, 2, 4, 9, STEEL[3]); c.r(6, 50, 52, 3, W[4])
    return finish(c)
LAB = [('lab bench 2x1', lab_bench), ('specimen tank 1x2', specimen_tank), ('wall console 1x2', console), ('heal pod 1x1', heal_pod)]
SHOP = [('shop counter 2x1', shop_counter), ('goods shelf 1x2', goods_shelf), ('produce barrel 1x1', barrel_bin), ('menu board (wall) 1x1', sign_board)]
if __name__ == '__main__':
    R = os.path.join(os.path.dirname(__file__), '../..'); S = 3
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); fl = Image.open(os.path.join(R, 'art/world/overworld/tiles_1x/interior_v2.png')).convert('RGBA')
    out = Image.new('RGBA', (1720, 1060), (36, 30, 36, 255)); d = ImageDraw.Draw(out)
    for r, (title, row) in enumerate((('LAB (DS layout ref, Stardew finish)', LAB), ('SHOP', SHOP))):
        y = 20 + r * 520; d.text((20, y), title, fill='white', font=f); x = 20
        for lab, fn in row:
            im = snap(fn().im) if 'snap' in globals() else fn().im; im = im.resize((im.width * S, im.height * S), Image.NEAREST)
            out.alpha_composite(im, (x, y + 40 + (384 - im.height))); d.text((x, y + 440), lab, fill=(230, 220, 200), font=f); x += im.width + 50
    out.convert('RGB').save(os.path.join(R, 'shots/interiors_v2/style_board.png')); print('ok')
