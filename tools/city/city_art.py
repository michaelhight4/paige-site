#!/usr/bin/env python3
"""Aurelith city art kit -> tiles_extra/{1x,2x,3x}/city.png + tileset*.json entries (ids 10001+, names x_city_*).
Run from anywhere:  python3 tools/city/city_art.py
Also writes tools/city/city_layout.json (object sizes, per-cell art coverage, door cells) for build_aurelith_city.py
and adds window/lamp anchors to src/overworld/nightfx_anchors.json.  Re-runnable (replaces its own entries)."""
import os, sys, json, random, math, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OW = os.path.join(ROOT, 'art', 'world', 'overworld')
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(OW, 'tools'))
from city_bld import *          # noqa
from pixel import pixelize
from scipy import ndimage

ID0 = 10001; COLS = 16
GL = ['1e4078', '30488c', '2c64a8', '4a70ba', '7ac2e8']

def tile_img(fn, seed=0):
    im = blank(1, 1); fn(im, SD(im), random.Random(seed)); return im

# ---------------------------------------------------------------- ground
ASPH = (84, 86, 100); PAVE = (200, 192, 180); KERB = (226, 220, 210); PLAZA = (232, 220, 196); BRICK = (178, 96, 78)
def asphalt(im, d, r):
    d.rectangle([0, 0, U, U], fill=ASPH)
    for _ in range(70): x, y = r.uniform(0, U), r.uniform(0, U); d.rectangle([x, y, x + 3, y + 3], fill=lift(ASPH, r.choice((-12, -6, 8, 14))))
    if r.random() < 0.3: x, y = r.uniform(10, 90), r.uniform(10, 90); d.line([(x, y), (x + r.uniform(10, 30), y + r.uniform(-8, 8))], fill=shade(ASPH, 0.8), width=2)
def road_line(side):
    def f(im, d, r):
        asphalt(im, d, r); c = (240, 220, 140)
        if side in 'ns': y = 0 if side == 'n' else U - 4; d.rectangle([16, y - 4, 64, y + 4], fill=c); d.rectangle([96, y - 4, 128, y + 4], fill=c)
        elif side in 'ew': x = 0 if side == 'w' else U - 4; d.rectangle([x - 4, 16, x + 4, 64], fill=c); d.rectangle([x - 4, 96, x + 4, 128], fill=c)
        elif side == 'h': d.rectangle([16, 60, 76, 68], fill=c)
        elif side == 'v': d.rectangle([60, 16, 68, 76], fill=c)
    return f
def zebra(orient):
    def f(im, d, r):
        asphalt(im, d, r)
        for k in range(4):
            if orient == 'h': d.rectangle([6 + k * 32, 8, 22 + k * 32, U - 8], fill=(244, 242, 236))   # stripes for walking N-S across an E-W road
            else: d.rectangle([8, 6 + k * 32, U - 8, 22 + k * 32], fill=(244, 242, 236))
    return f
def pave_base(im, d, r, c=PAVE):
    d.rectangle([0, 0, U, U], fill=c)
    for i in range(2):
        for j in range(2):
            cc = lift(c, r.choice((-8, -4, 0, 4, 8))); d.rectangle([i * 64 + 2, j * 64 + 2, i * 64 + 62, j * 64 + 62], fill=cc)
            d.line([(i * 64 + 4, j * 64 + 4), (i * 64 + 58, j * 64 + 4)], fill=lift(cc, 14), width=2)
    for _ in range(14): x, y = r.uniform(0, U), r.uniform(0, U); d.rectangle([x, y, x + 2, y + 2], fill=shade(c, 0.86))
def pave(mask, coping=False):
    def f(im, d, r):
        pave_base(im, d, r)
        kc = (150, 150, 160) if coping else KERB
        for bit, side in ((1, 'n'), (2, 'e'), (4, 's'), (8, 'w')):
            if not mask & bit: continue
            if side == 'n': d.rectangle([0, 0, U, 12], fill=kc); d.line([(0, 12), (U, 12)], fill=shade(kc, 0.7), width=2); d.line([(0, 1), (U, 1)], fill=shade(kc, 0.5), width=2)
            if side == 's': d.rectangle([0, U - 14, U, U], fill=kc); d.line([(0, U - 14), (U, U - 14)], fill=lift(kc, 20), width=2); d.rectangle([0, U - 4, U, U], fill=shade(kc, 0.55))
            if side == 'w': d.rectangle([0, 0, 12, U], fill=kc); d.line([(12, 0), (12, U)], fill=shade(kc, 0.75), width=2)
            if side == 'e': d.rectangle([U - 12, 0, U, U], fill=kc); d.line([(U - 12, 0), (U - 12, U)], fill=lift(kc, 18), width=2); d.rectangle([U - 3, 0, U, U], fill=shade(kc, 0.55))
            if coping and side in 'nesw':
                for k in range(0, U, 32):
                    if side in 'ns': y0 = 0 if side == 'n' else U - 14; d.line([(k, y0), (k, y0 + 12)], fill=shade(kc, 0.6), width=2)
                    else: x0 = 0 if side == 'w' else U - 12; d.line([(x0, k), (x0 + 12, k)], fill=shade(kc, 0.6), width=2)
    return f
def plaza(v):
    def f(im, d, r):
        d.rectangle([0, 0, U, U], fill=PLAZA)
        for i in range(4):
            for j in range(4):
                cc = lift(PLAZA, r.choice((-10, -4, 0, 6))) if (i + j) % 2 else lift((214, 198, 170), r.choice((-6, 0, 6)))
                d.rectangle([i * 32 + 1, j * 32 + 1, i * 32 + 31, j * 32 + 31], fill=cc)
        if v == 1: d.ellipse([44, 44, 84, 84], fill=(200, 160, 90)); d.polygon([(64, 48), (76, 64), (64, 80), (52, 64)], fill=(240, 210, 130))
        if v == 2: d.rectangle([0, 58, U, 70], fill=(200, 160, 90))
        if v == 3: d.rectangle([58, 0, 70, U], fill=(200, 160, 90))
    return f
def brick(im, d, r):
    d.rectangle([0, 0, U, U], fill=shade(BRICK, 0.7))
    for j in range(8):
        off = (j % 2) * 16
        for i in range(-1, 5):
            c = lift(BRICK, r.choice((-14, -6, 0, 8, 12))); x = i * 32 + off
            d.rectangle([x + 2, j * 16 + 2, x + 30, j * 16 + 14], fill=c); d.line([(x + 3, j * 16 + 3), (x + 26, j * 16 + 3)], fill=lift(c, 22), width=1)
def rail_h(im, d, r):
    d.rectangle([0, 0, U, U], fill=(120, 112, 104))
    for _ in range(120): x, y = r.uniform(0, U), r.uniform(0, U); d.rectangle([x, y, x + 4, y + 4], fill=r.choice([(150, 142, 132), (96, 90, 84), (136, 128, 118)]))
    for k in range(4): x = 8 + k * 32; d.rectangle([x, 22, x + 18, 106], fill=(104, 74, 52)); d.line([(x, 24), (x + 18, 24)], fill=(140, 104, 76), width=2)
    for y in (38, 86): d.rectangle([0, y, U, y + 8], fill=(170, 172, 184)); d.rectangle([0, y + 6, U, y + 10], fill=(80, 80, 92))
def grate(im, d, r):
    pave_base(im, d, r)
    d.rectangle([20, 20, 108, 108], fill=(70, 66, 70)); d.rectangle([26, 26, 102, 102], fill=(120, 96, 70))
    for k in range(5): d.line([(30 + k * 17, 28), (30 + k * 17, 100)], fill=(70, 66, 70), width=3)

# ---------------------------------------------------------------- furniture (1x1 unless noted; all block)
IRON = (48, 48, 62); IRON_L = (90, 92, 110)
def lamp_city(im, d, r):
    d.ellipse([46, 108, 82, 122], fill=(26, 18, 38, 90)); d.rectangle([52, 104, 76, 118], fill=IRON); d.rectangle([58, 30, 70, 108], fill=IRON); d.rectangle([60, 30, 63, 104], fill=IRON_L)
    d.line([(36, 34), (92, 34)], fill=IRON, width=6)
    for x in (30, 98):
        d.polygon([(x - 12, 22), (x + 12, 22), (x + 8, 50), (x - 8, 50)], fill=IRON); d.rectangle([x - 7, 26, x + 7, 46], fill=(255, 230, 150)); d.rectangle([x - 3, 28, x + 2, 44], fill=(255, 248, 210))
        d.polygon([(x - 14, 22), (x, 10), (x + 14, 22)], fill=IRON)
    d.ellipse([58, 2, 70, 14], fill=(250, 214, 120))
def bench(orient):
    def f(im, d, r):
        W = (150, 104, 62)
        if orient == 'h':
            d.ellipse([10, 96, 118, 116], fill=(26, 18, 38, 80))
            for y in (46, 60): d.rectangle([10, y, 118, y + 10], fill=W); d.line([(10, y + 1), (118, y + 1)], fill=lift(W, 30), width=2)
            d.rectangle([12, 74, 116, 90], fill=lift(W, 12)); d.line([(12, 75), (116, 75)], fill=lift(W, 40), width=2); d.rectangle([12, 88, 116, 94], fill=shade(W, 0.6))
            for x in (16, 104): d.rectangle([x, 40, x + 8, 108], fill=IRON)
        else:
            d.ellipse([30, 104, 98, 120], fill=(26, 18, 38, 80))
            d.rectangle([40, 8, 52, 112], fill=W); d.rectangle([52, 10, 86, 108], fill=lift(W, 12))
            for y in range(16, 108, 18): d.line([(52, y), (86, y)], fill=shade(W, 0.7), width=2)
            for y in (14, 96): d.rectangle([36, y, 90, y + 8], fill=IRON)
    return f
def planter(im, d, r):
    d.ellipse([10, 100, 118, 120], fill=(26, 18, 38, 80)); d.rectangle([14, 56, 114, 112], fill=(196, 186, 170)); d.rectangle([14, 56, 114, 66], fill=(226, 218, 204)); d.rectangle([100, 66, 114, 112], fill=(160, 150, 136))
    for _ in range(16): x = r.uniform(22, 106); y = r.uniform(30, 62); d.ellipse([x - 13, y - 12, x + 13, y + 12], fill=r.choice([(60, 126, 56), (80, 150, 66), (98, 170, 80)]))
    for _ in range(10): x = r.uniform(24, 104); y = r.uniform(28, 58); c = r.choice([(240, 90, 110), (250, 200, 80), (170, 110, 240), (250, 250, 250)]); d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=c)
def ctree_base(im, d, r):
    grate(im, d, r); d.ellipse([44, 84, 84, 100], fill=(26, 18, 38, 90)); d.rectangle([54, 0, 74, 92], fill=(110, 76, 50)); d.rectangle([54, 0, 60, 92], fill=(140, 100, 66))
def ctree_top(im, d, r):
    for k in range(26):
        a = r.uniform(0, 2 * math.pi); rr = r.uniform(0, 40); x = 64 + rr * math.cos(a); y = 70 + rr * 0.85 * math.sin(a); s = r.uniform(16, 26)
        d.ellipse([x - s, y - s, x + s, y + s], fill=r.choice([(54, 118, 60), (70, 140, 66), (86, 158, 74)]))
    for k in range(10):
        x = 64 + r.uniform(-30, 20); y = 50 + r.uniform(-20, 20); d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(126, 190, 96))
def bin_(im, d, r):
    d.ellipse([34, 104, 94, 120], fill=(26, 18, 38, 90)); d.rectangle([38, 50, 90, 112], fill=(60, 110, 90)); d.rectangle([80, 50, 90, 112], fill=(44, 84, 70))
    for x in range(44, 86, 10): d.line([(x, 60), (x, 106)], fill=(80, 136, 112), width=2)
    d.rounded_rectangle([34, 40, 94, 54], 4, fill=(44, 84, 70)); d.rectangle([52, 46, 76, 50], fill=(26, 30, 30))
def bollard(im, d, r):
    for x in (40, 88):
        d.ellipse([x - 16, 100, x + 16, 112], fill=(26, 18, 38, 90)); d.rectangle([x - 10, 54, x + 10, 106], fill=IRON); d.ellipse([x - 10, 46, x + 10, 62], fill=IRON_L); d.rectangle([x - 10, 66, x + 10, 72], fill=(250, 214, 120))
def tram_stop(im, d, r):
    d.rectangle([60, 30, 68, 116], fill=IRON); d.ellipse([46, 108, 82, 122], fill=(26, 18, 38, 90))
    d.ellipse([34, 6, 94, 66], fill=(250, 214, 120)); d.ellipse([40, 12, 88, 60], fill=(60, 50, 110)); d.text((64, 36), 'T', fill=(255, 240, 200), font=font(36), anchor='mm')
    d.rectangle([40, 70, 88, 100], fill=(240, 236, 226)); [d.line([(46, 76 + k * 7), (82, 76 + k * 7)], fill=(90, 90, 110), width=2) for k in range(4)]
def street_sign(im, d, r):
    d.rectangle([60, 20, 68, 116], fill=IRON); d.ellipse([48, 108, 80, 120], fill=(26, 18, 38, 90))
    d.rectangle([22, 22, 106, 44], fill=(40, 70, 130)); d.rectangle([24, 24, 104, 42], outline=(240, 240, 240), width=2)
    d.rectangle([30, 50, 98, 70], fill=(40, 70, 130)); d.rectangle([32, 52, 96, 68], outline=(240, 240, 240), width=2)
    d.ellipse([58, 12, 70, 24], fill=(250, 214, 120))
def notice(im, d, r):
    d.ellipse([16, 104, 112, 120], fill=(26, 18, 38, 80))
    for x in (20, 100): d.rectangle([x, 30, x + 8, 112], fill=(110, 76, 50))
    d.rectangle([14, 24, 114, 86], fill=(140, 100, 66)); d.rectangle([20, 30, 108, 80], fill=(190, 150, 100))
    for k in range(6):
        x = 26 + (k % 3) * 28; y = 34 + (k // 3) * 22; c = r.choice([(250, 246, 230), (250, 220, 140), (180, 220, 250), (240, 180, 200)])
        d.rectangle([x, y, x + 22, y + 18], fill=c); d.line([(x + 4, y + 6), (x + 18, y + 6)], fill=(90, 90, 110), width=2); d.ellipse([x + 9, y, x + 13, y + 4], fill=(200, 60, 60))
    d.polygon([(8, 26), (64, 10), (120, 26)], fill=(100, 70, 50))
def vending(col):
    def f(im, d, r):
        d.ellipse([18, 110, 110, 124], fill=(26, 18, 38, 90)); d.rectangle([22, 12, 106, 116], fill=col); d.rectangle([92, 12, 106, 116], fill=shade(col, 0.7))
        d.rectangle([30, 20, 84, 76], fill=(200, 230, 240))
        for i in range(3):
            for j in range(3): c = r.choice([(240, 90, 80), (90, 170, 240), (250, 214, 90), (120, 200, 120), (200, 120, 230)]); d.rectangle([34 + i * 17, 24 + j * 17, 44 + i * 17, 36 + j * 17], fill=c)
        d.rectangle([30, 84, 84, 104], fill=(40, 40, 50)); d.rectangle([88, 30, 92, 60], fill=(250, 214, 120)); d.rectangle([22, 12, 106, 18], fill=lift(col, 30))
    return f
def flagpole(im, d, r):
    d.ellipse([44, 108, 84, 122], fill=(26, 18, 38, 90)); d.rectangle([48, 104, 80, 116], fill=(170, 164, 156)); d.rectangle([60, 0, 66, 108], fill=(200, 200, 210)); d.ellipse([58, -4, 68, 6], fill=(250, 214, 120))
    d.rectangle([66, 8, 116, 70], fill=(120, 60, 180)); d.polygon([(66, 70), (91, 86), (116, 70)], fill=(120, 60, 180)); d.rectangle([66, 8, 116, 16], fill=(250, 214, 120))
    im2 = crystal_emblem(im, 91, 42, 0.14); im.paste(im2)
def bike_rack(im, d, r):
    d.rectangle([10, 98, 118, 104], fill=(26, 18, 38, 80))
    for x in (22, 52, 82): d.arc([x, 48, x + 26, 100], 180, 360, fill=IRON_L, width=6); d.line([(x + 3, 74), (x + 3, 100)], fill=IRON_L, width=6); d.line([(x + 23, 74), (x + 23, 100)], fill=IRON_L, width=6)
    d.ellipse([16, 60, 50, 94], outline=(40, 40, 50), width=5); d.ellipse([46, 60, 80, 94], outline=(40, 40, 50), width=5); d.line([(33, 77), (52, 66), (63, 77)], fill=(200, 60, 60), width=4)
def kiosk(im, d, r):
    d.ellipse([30, 108, 98, 122], fill=(26, 18, 38, 90)); d.rectangle([40, 30, 88, 116], fill=(60, 50, 110)); d.rectangle([80, 30, 88, 116], fill=(40, 34, 80))
    d.rectangle([46, 38, 82, 80], fill=(120, 200, 230)); d.rectangle([50, 44, 78, 52], fill=(250, 240, 200)); d.rectangle([50, 58, 70, 74], fill=(170, 230, 160))
    d.ellipse([46, 4, 82, 34], fill=(250, 214, 120)); d.text((64, 19), 'i', fill=(60, 50, 110), font=font(26), anchor='mm')
def cafe_table(im, d, r):
    d.ellipse([20, 96, 108, 120], fill=(26, 18, 38, 80)); d.rectangle([62, 30, 66, 104], fill=(200, 200, 210))
    d.ellipse([36, 78, 92, 96], fill=(240, 236, 226)); d.rectangle([60, 90, 68, 112], fill=IRON)
    for x in (24, 94): d.rectangle([x, 84, x + 10, 112], fill=(150, 104, 62))
    for i in range(6): a0 = i * 60; d.pieslice([10, 4, 118, 60], 180 + i * 30, 180 + (i + 1) * 30, fill=[(200, 70, 60), (250, 240, 230)][i % 2])
def statue(im, d, r):
    d.ellipse([16, 104, 112, 122], fill=(26, 18, 38, 90)); d.rectangle([24, 78, 104, 116], fill=(190, 184, 172)); d.rectangle([24, 78, 104, 86], fill=(222, 216, 204)); d.rectangle([90, 86, 104, 116], fill=(160, 154, 142))
    d.polygon([(64, 6), (84, 30), (78, 78), (50, 78), (44, 30)], fill=(150, 170, 160)); d.ellipse([54, 6, 74, 26], fill=(170, 190, 180)); d.polygon([(44, 30), (24, 20), (30, 14), (50, 26)], fill=(150, 170, 160))
def hedge(im, d, r):
    d.rectangle([4, 96, 124, 118], fill=(26, 18, 38, 70)); d.rounded_rectangle([6, 28, 122, 108], 14, fill=(56, 118, 58))
    for _ in range(30): x = r.uniform(12, 116); y = r.uniform(32, 100); d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=r.choice([(66, 134, 64), (80, 150, 70), (48, 104, 52)]))
    d.rectangle([6, 100, 122, 110], fill=(44, 92, 46))
def rail_fence(im, d, r):
    for x in (6, 64, 118): d.rectangle([x - 4, 40, x + 4, 110], fill=IRON)
    for y in (46, 72): d.rectangle([0, y, U, y + 6], fill=IRON_L)
    for x in range(14, U, 14): d.line([(x, 46), (x, 106)], fill=IRON, width=3)
def buffer_stop(im, d, r):
    rail_h(im, d, r); d.rectangle([84, 16, 124, 112], fill=(180, 60, 50)); d.rectangle([84, 16, 124, 28], fill=(230, 220, 90)); d.rectangle([76, 36, 86, 50], fill=IRON); d.rectangle([76, 78, 86, 92], fill=IRON)

FURN = [('lamp', lamp_city), ('bench_h', bench('h')), ('bench_v', bench('v')), ('planter', planter), ('tree_base', ctree_base), ('bin', bin_),
        ('bollard', bollard), ('tram_stop', tram_stop), ('street_sign', street_sign), ('notice', notice), ('vending_b', vending((60, 110, 190))),
        ('vending_r', vending((190, 60, 70))), ('flag', flagpole), ('bike_rack', bike_rack), ('kiosk', kiosk), ('cafe_table', cafe_table),
        ('statue', statue), ('hedge', hedge), ('rail_fence', rail_fence), ('buffer', buffer_stop)]

# ---------------------------------------------------------------- Lumen Spire + fountain (4 wide x 8 tall; rows 0-3 overlay, rows 4-7 basin)
def spire(frame):
    W, H = 4 * U, 8 * U; im = blank(4, 8); d = SD(im); cx = W / 2; r = random.Random(7)
    by0, by1 = 4 * U + 20, 8 * U - 8   # basin box
    d.ellipse([10, by0, W - 10, by1], fill=(206, 196, 180)); d.ellipse([22, by0 + 12, W - 22, by1 - 18], fill=(236, 228, 214))
    d.ellipse([40, by0 + 28, W - 40, by1 - 36], fill=(60, 120, 170))
    ph = frame * 2 * math.pi / 3
    for k in range(5):
        rr = 0.35 + 0.13 * k + 0.04 * math.sin(ph + k); ex = (W - 80) / 2 * rr; ey = (by1 - by0 - 64) / 2 * rr; ccy = (by0 + by1) / 2 - 4
        d.ellipse([cx - ex, ccy - ey, cx + ex, ccy + ey], outline=(150, 210, 240) if k % 2 == frame % 2 else (90, 160, 210), width=4)
    for _ in range(12):
        a = r.uniform(0, 2 * math.pi); x = cx + 150 * math.cos(a); y = (by0 + by1) / 2 + 90 * math.sin(a)
        if (_ + frame) % 3 == 0: d.rectangle([x - 3, y - 3, x + 3, y + 3], fill=(250, 250, 255))
    d.ellipse([10, by1 - 40, W - 10, by1], outline=(160, 150, 136), width=6)
    # pedestal (in the basin, rows 4-6) and the spire shaft rising to row 0
    d.ellipse([cx - 70, by0 + 70, cx + 70, by0 + 170], fill=(150, 140, 170)); d.rectangle([cx - 60, 3 * U + 40, cx + 60, by0 + 120], fill=(176, 166, 196)); d.ellipse([cx - 60, 3 * U + 10, cx + 60, 3 * U + 70], fill=(206, 196, 224))
    d.rectangle([cx + 30, 3 * U + 40, cx + 60, by0 + 120], fill=(140, 130, 164))
    for sgn in (-1, 1):   # water spouts
        x = cx + sgn * 62; d.arc([x - 40 if sgn < 0 else x, by0 + 60, x + 40 if sgn > 0 else x, by0 + 160], 180 if sgn < 0 else 270, 270 if sgn < 0 else 360, fill=(170, 220, 245), width=5)
    glowk = [0.6, 1.0, 0.75][frame]
    im = glow(im, [cx - 200 * glowk, 0, cx + 200 * glowk, 3 * U + 120], (170, 90, 255, int(150 * glowk)), 26); d = SD(im)
    # crystal shaft (tall faceted)
    d.polygon([(cx, 20), (cx + 46, 110), (cx + 34, 3 * U + 40), (cx - 34, 3 * U + 40), (cx - 46, 110)], fill=(132, 64, 200))
    d.polygon([(cx, 20), (cx + 46, 110), (cx + 34, 3 * U + 40), (cx + 4, 3 * U + 30)], fill=(92, 36, 156))
    d.polygon([(cx, 20), (cx - 16, 110), (cx - 10, 3 * U), (cx - 30, 3 * U + 30), (cx - 46, 110)], fill=(176, 120, 236))
    for (sx, top, ww) in ((cx - 64, 180, 20), (cx + 66, 200, 22), (cx - 40, 280, 14), (cx + 44, 270, 15)):
        d.polygon([(sx, top), (sx + ww, top + 40), (sx + ww * 0.6, 3 * U + 40), (sx - ww * 0.6, 3 * U + 40), (sx - ww, top + 40)], fill=(132, 64, 200))
        d.polygon([(sx, top), (sx - ww * 0.4, top + 44), (sx - ww * 0.2, top + 120)], fill=(220, 180, 255))
    # light bands travelling up the shaft
    for k in range(3):
        y = 3 * U - ((frame * 90 + k * 130) % (3 * U - 60))
        d.polygon([(cx - 36, y), (cx + 36, y - 8), (cx + 34, y + 4), (cx - 34, y + 12)], fill=(240, 214, 255))
    d.polygon([(cx, 20), (cx - 10, 60), (cx, 90), (cx + 10, 60)], fill=(255, 250, 255))
    sp = [(cx, 0), (cx - 26, 40), (cx + 30, 30), (cx - 40, 120), (cx + 44, 140)]
    for i, (x, y) in enumerate(sp):
        if (i + frame) % 2 == 0: d.line([(x - 8, y), (x + 8, y)], fill=(255, 255, 255), width=3); d.line([(x, y - 8), (x, y + 8)], fill=(255, 255, 255), width=3)
    return finish(im, 7, 0.08)

# ---------------------------------------------------------------- assemble
def main():
    tiles = []   # (name, img64, meta)
    def add(name, img, **meta): tiles.append((name, img, meta))
    layout = {'objects': {}, 'singles': {}}
    def add_obj(name, im, cat='building', door=None, notes='', overlay_rows=(), passage=()):
        px = pixelize(im, outline=True); w, h = px.width // T, px.height // T
        a = np.asarray(px)[..., 3]
        cov = [[round(float((a[r * T:(r + 1) * T, c * T:(c + 1) * T] >= 200).mean()), 3) for c in range(w)] for r in range(h)]
        for r in range(h):
            for c in range(w):
                add(f'x_city_{name}_{r}_{c}', px.crop((c * T, r * T, (c + 1) * T, (r + 1) * T)), category=cat, cov=cov[r][c], notes=notes)
        layout['objects'][name] = {'w': w, 'h': h, 'cov': cov, 'door': door, 'overlay_rows': list(overlay_rows), 'passage': [list(p) for p in passage]}
        return px
    print('buildings...')
    B = {}
    B['stadium'] = add_obj('stadium', stadium(), door=[[8, 8], [9, 8]], notes='Aurelith Games stadium 18x9; door cells (8,8),(9,8)')
    B['terminal'] = add_obj('terminal', terminal(), door=[[5, 6], [6, 6]], notes='Grand Terminal 12x7')
    B['capitol'] = add_obj('capitol', capitol(), door=[[4, 6], [5, 6]], notes='Capitol 10x7 (closed doors)')
    B['museum'] = add_obj('museum', museum(), door=[[4, 6], [5, 6]], notes='Museum 10x7 (closed doors)')
    B['galleria'] = add_obj('galleria', galleria(), door=[[5, 4], [6, 4]], notes='Galleria department store 12x5')
    B['rthq'] = add_obj('rthq', rt_hq(), door=[[3, 4], [4, 4]], notes='Revival Tech HQ 8x5')
    B['hotel'] = add_obj('hotel', hotel(), door=[[3, 4], [4, 4]], notes='Grand Hotel 8x5')
    for i, wl in enumerate(((214, 190, 150), (200, 214, 226), (226, 200, 206))):
        add_obj(f'apartment_{i}', apartment(101 + i, wl, ((118, 110, 112), (96, 104, 120), (120, 100, 96))[i]), door=[[3, 4]], notes='apartments 6x5')
    for i, (wl, rc, dc) in enumerate((((232, 220, 196), (84, 96, 128), (150, 60, 60)), ((214, 228, 214), (150, 84, 70), (60, 90, 140)), ((240, 224, 200), (96, 120, 100), (120, 74, 44)), ((226, 214, 230), (110, 90, 120), (70, 120, 110)))):
        add_obj(f'terrace_{i}', terrace(111 + i, wl, rc, dc), door=[[3, 3]], notes='terrace house 6x4')
    add_obj('cafe', cafe(), door=[[2, 2]], notes='cafe 4x3 (closed)')
    add_obj('school', school(), door=[[3, 3]], notes='school 6x4 (closed)')
    add_obj('gate_s', gate_s(), notes='south gatehouse 6x4: cols 2-3 passage', overlay_rows=[0, 1], passage=[[2, r] for r in range(4)] + [[3, r] for r in range(4)])
    add_obj('gate_e', gate_side(True), notes='east gate 4x8: rows 4-5 passage', passage=[[c, r] for c in range(4) for r in (4, 5)])
    add_obj('gate_w', gate_side(False), notes='west gate 4x8: rows 4-5 passage', passage=[[c, r] for c in range(4) for r in (4, 5)])
    for i, (k, awn) in enumerate((('fruit', ((200, 60, 60), (250, 240, 230))), ('crystal', ((110, 60, 170), (250, 214, 120))), ('flowers', ((60, 140, 90), (250, 240, 230))),
                                  ('bread', ((210, 140, 60), (250, 240, 230))), ('fabric', ((50, 90, 170), (250, 240, 230))), ('toys', ((230, 120, 160), (250, 240, 200))))):
        add_obj(f'stall_{k}', stall(k, awn, 200 + i), cat='deco', notes='market stall 1x2')
    print('spire...')
    fr = [pixelize(spire(f), outline=True) for f in range(3)]
    for r in range(8):
        for c in range(4):
            for f in range(3): add(f'x_city_spire_{r}_{c}' + (f'_f{f}' if f else ''), fr[f].crop((c * T, r * T, (c + 1) * T, (r + 1) * T)), category='overlay' if r < 4 else 'building', anim=(f'x_city_spire_{r}_{c}', f))
    a = np.asarray(fr[1])[..., 3]
    layout['objects']['spire'] = {'w': 4, 'h': 8, 'cov': [[round(float((a[r * T:(r + 1) * T, c * T:(c + 1) * T] >= 200).mean()), 3) for c in range(4)] for r in range(8)], 'door': None, 'overlay_rows': [0, 1, 2, 3], 'passage': []}
    print('ground + furniture...')
    for i in range(4): add(f'x_city_asphalt_{i}', pixelize(tile_img(asphalt, 300 + i)), category='terrain', walk=True)
    for s in 'nsewhv': add(f'x_city_road_{s}', pixelize(tile_img(road_line(s), 310)), category='terrain', walk=True)
    for o in 'hv': add(f'x_city_zebra_{o}', pixelize(tile_img(zebra(o), 320)), category='terrain', walk=True)
    for m in range(16): add(f'x_city_pave_{m}', pixelize(tile_img(pave(m), 330 + (m % 3))), category='terrain', walk=True)
    for m in range(1, 16): add(f'x_city_canal_{m}', pixelize(tile_img(pave(m, True), 360 + (m % 3))), category='terrain', walk=True)
    for v in range(4): add(f'x_city_plaza_{v}', pixelize(tile_img(plaza(v), 380 + v)), category='terrain', walk=True)
    for v in range(2): add(f'x_city_brick_{v}', pixelize(tile_img(brick, 390 + v)), category='terrain', walk=True)
    add('x_city_rail_h', pixelize(tile_img(rail_h, 395)), category='terrain', walk=True)
    for n, fn in FURN:
        add(f'x_city_{n}', pixelize(tile_img(fn, 400 + len(n)), outline=True), category='deco')
    add('x_city_tree_top', pixelize(tile_img(ctree_top, 450), outline=True), category='overlay', walk=True)
    # ---- sheet
    n = len(tiles); rows = (n + COLS - 1) // COLS
    for sc in (1, 2, 3):
        sheet = Image.new('RGBA', (COLS * T * sc, rows * T * sc), (0, 0, 0, 0))
        for i, (_, im, _) in enumerate(tiles): sheet.paste(im.resize((T * sc, T * sc), Image.NEAREST), ((i % COLS) * T * sc, (i // COLS) * T * sc))
        os.makedirs(os.path.join(OW, 'tiles_extra', f'{sc}x'), exist_ok=True); sheet.save(os.path.join(OW, 'tiles_extra', f'{sc}x', 'city.png'))
    # ---- tileset entries
    idx = {name: i for i, (name, _, _) in enumerate(tiles)}
    ents = []
    passage = {f'x_city_{k}_{r}_{c}' for k, o in layout['objects'].items() for c, r in o.get('passage', [])}   # gate arch cells: walk under them
    for i, (name, im, m) in enumerate(tiles):
        if m.get('anim') and m['anim'][1]: continue   # animation frames are referenced from frame 0
        walk = m.get('walk', False) or m['category'] == 'overlay' or name in passage
        e = {'id': ID0 + len(ents), 'name': name, 'category': m['category'], 'sheet': 'tiles_extra/1x/city.png', 'index': i, 'col': i % COLS, 'row': i // COLS,
             'walkable': walk, 'collision': 'walk' if walk else 'block', 'collision_code': 0 if walk else 1, 'encounter': False,
             'notes': ('Aurelith city kit (tools/city/city_art.py)' + ('; ' + m['notes'] if m.get('notes') else ''))}
        if m.get('anim'): e['animation'] = {'frames': [i, idx[name + '_f1'], idx[name + '_f2']], 'frame_ms': 260, 'loop': True}
        ents.append(e)
    for sc, fn in ((1, 'tileset.json'), (2, 'tileset_2x.json'), (3, 'tileset_3x.json')):
        p = os.path.join(OW, fn); ts = json.load(open(p))
        ts['tiles'] = [t for t in ts['tiles'] if not (ID0 <= t['id'] < ID0 + 2000)]
        for e in ents:
            e2 = dict(e); e2['sheet'] = f'tiles_extra/{sc}x/city.png'
            if 'animation' in e: e2['animation'] = dict(e['animation'])
            ts['tiles'].append(e2)
        ts['sheets']['x_city'] = f'tiles_extra/{sc}x/city.png'
        mto = ts.setdefault('multi_tile_objects', {})
        for k, o in layout['objects'].items(): mto['x_city_' + k] = {'w': o['w'], 'h': o['h'], 'tile_name_pattern': f'x_city_{k}_<row>_<col>'}
        json.dump(ts, open(p, 'w'), indent=1)
    layout['ids'] = {e['name']: e['id'] for e in ents}
    json.dump(layout, open(os.path.join(HERE, 'city_layout.json'), 'w'), indent=1)
    # ---- night anchors: windows = glass components inside each building; lamps on the city lamp tile
    ap = os.path.join(ROOT, 'src', 'overworld', 'nightfx_anchors.json'); A = json.load(open(ap))
    glass = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in GL])
    for k, px in list(B.items()) + [(f'apartment_{i}', None) for i in range(3)] + [(f'terrace_{i}', None) for i in range(4)] + [('cafe', None), ('school', None)]:
        if px is None:
            o = layout['objects'][k]; px = Image.new('RGBA', (o['w'] * T, o['h'] * T))
            for r in range(o['h']):
                for c in range(o['w']): px.paste(tiles[idx[f'x_city_{k}_{r}_{c}']][1], (c * T, r * T))
        a = np.asarray(px); m = np.zeros(a.shape[:2], bool)
        for g in glass: m |= (np.abs(a[..., :3].astype(int) - g).sum(-1) == 0) & (a[..., 3] == 255)
        lab, nl = ndimage.label(ndimage.binary_dilation(m, iterations=2))
        wins = []
        for sl in ndimage.find_objects(lab):
            y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
            if (y1 - y0) * (x1 - x0) >= 40 and y0 > 20: wins.append([int(x0), int(y0), int(x1 - x0), int(y1 - y0)])
        A['buildings']['x_city_' + k] = {'windows': wins[:80], 'lights': []}
    A['tiles']['x_city_lamp'] = [{'x': 15, 'y': 18, 'kind': 'street_lamp'}, {'x': 49, 'y': 18, 'kind': 'street_lamp'}]
    A['tiles']['x_city_spire_1_1'] = [{'x': 64, 'y': 32, 'kind': 'street_lamp', 'colour': 'a070ff', 'r': 120, 'strength': 0.8}]
    json.dump(A, open(ap, 'w'), indent=1)
    print('tiles', n, 'entries', len(ents), 'ids', ID0, '..', ID0 + len(ents) - 1)

if __name__ == '__main__': main()
