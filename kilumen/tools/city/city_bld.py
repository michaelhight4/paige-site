# Aurelith city buildings (pixel style of tools/buildings.py; 128 design units per 64px tile).
import os, sys, random, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'art', 'world', 'overworld', 'tools'))
from buildings import *   # noqa  (gen_tiles: SD, U, T, blank, font, pblur, crystal_emblem; shade/lift/finish/grad_rect/window2/door2/wall_fill/foundation)

GLASS = (70, 110, 146); GLASS_D = (52, 84, 118); GLASS_L = (150, 196, 220)

def glow(im, box, c, blur=14):
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(g).ellipse(box, fill=c); return Image.alpha_composite(im, pblur(g, blur))

def sign_band(d, x0, x1, y, h, bg, fg, text, sz=26, edge=None):
    d.rectangle([x0, y, x1, y + h], fill=bg)
    d.line([(x0, y + h), (x1, y + h)], fill=shade(bg, 0.55), width=3)
    d.line([(x0, y + 2), (x1, y + 2)], fill=edge or lift(bg, 40), width=3)
    d.text(((x0 + x1) / 2, y + h / 2 + 1), text, fill=fg, font=font(sz), anchor='mm')

def flat_roof(im, d, x0, x1, y0, y1, roofc, trim, seed, feats=('ac', 'vent', 'sky')):
    r = random.Random(seed)
    d.rectangle([x0 - 6, y0, x1 + 6, y1], fill=shade(roofc, 0.7))
    d.rectangle([x0 + 8, y0 + 12, x1 - 8, y1 - 14], fill=roofc)
    for x in np.arange(x0 + 30, x1 - 20, 42): d.line([(x, y0 + 16), (x, y1 - 18)], fill=shade(roofc, 0.9), width=2)
    d.rectangle([x0 - 6, y0 - 8, x1 + 6, y0 + 4], fill=lift(trim, 10))
    W = x1 - x0; hh = y1 - y0
    if hh > 70:
        for k in range(int(W // 260) + 1):
            f = r.choice(feats); cx = x0 + 60 + k * 260 + r.uniform(0, 80)
            if cx > x1 - 90: break
            cy = y0 + 22 + r.uniform(0, max(1, hh - 90))
            if f == 'ac':
                d.rectangle([cx, cy, cx + 64, cy + 44], fill=(176, 180, 190)); d.rectangle([cx + 52, cy, cx + 64, cy + 44], fill=(134, 138, 150))
                d.ellipse([cx + 8, cy + 6, cx + 44, cy + 38], fill=(104, 108, 120)); d.line([(cx + 26, cy + 8), (cx + 26, cy + 36)], fill=(150, 154, 166), width=3)
            elif f == 'vent':
                d.rectangle([cx, cy + 10, cx + 30, cy + 40], fill=(150, 150, 160)); d.rectangle([cx - 6, cy + 4, cx + 36, cy + 14], fill=(120, 120, 132))
            elif f == 'sky':
                d.rectangle([cx, cy, cx + 110, cy + 50], fill=(70, 92, 120)); d.rectangle([cx + 4, cy + 4, cx + 106, cy + 46], fill=(110, 150, 186))
                for q in range(1, 3): d.line([(cx + q * 37, cy + 4), (cx + q * 37, cy + 46)], fill=(70, 92, 120), width=3)
                d.polygon([(cx + 10, cy + 44), (cx + 40, cy + 6), (cx + 56, cy + 6), (cx + 26, cy + 44)], fill=(170, 206, 230))
            elif f == 'tank':
                d.rectangle([cx + 6, cy + 30, cx + 12, cy + 56], fill=(90, 80, 70)); d.rectangle([cx + 44, cy + 30, cx + 50, cy + 56], fill=(90, 80, 70))
                d.ellipse([cx, cy - 6, cx + 56, cy + 14], fill=(150, 100, 70)); d.rectangle([cx, cy + 4, cx + 56, cy + 36], fill=(130, 84, 58))
                for q in range(3): d.line([(cx, cy + 12 + q * 9), (cx + 56, cy + 12 + q * 9)], fill=(90, 60, 44), width=2)
            elif f == 'garden':
                d.rectangle([cx, cy, cx + 130, cy + 50], fill=(110, 84, 60))
                for q in range(9):
                    fx = cx + 10 + q * 14; fy = cy + 18 + r.uniform(-6, 10); d.ellipse([fx - 12, fy - 12, fx + 12, fy + 12], fill=r.choice([(60, 126, 56), (80, 150, 66), (98, 170, 80)]))
    return im

def windows_row(d, x0, x1, y, h, bays, frame, kind='sash', seed=0, skip=None, wall=None):
    """one storey of windows, one per bay"""
    bw = (x1 - x0) / bays; r = random.Random(seed)
    for b in range(bays):
        if skip and b in skip: continue
        cx = x0 + bw * (b + 0.5)
        if kind == 'sash':
            ww = min(54, bw * 0.5); window2(d, cx - ww / 2, y, ww, h, frame, seed=seed + b)
        elif kind == 'arch':
            ww = min(52, bw * 0.48); window2(d, cx - ww / 2, y + ww / 2, ww, h - ww / 2, frame, seed=seed + b, arch=True)
        elif kind == 'ribbon':
            d.rectangle([cx - bw / 2 + 4, y, cx + bw / 2 - 4, y + h], fill=GLASS); d.rectangle([cx - bw / 2 + 4, y, cx + bw / 2 - 4, y + h * 0.3], fill=GLASS_D)
            d.polygon([(cx - bw * 0.3, y + h), (cx, y), (cx + bw * 0.14, y), (cx - bw * 0.16, y + h)], fill=GLASS_L)
            d.line([(cx - bw / 2 + 2, y), (cx - bw / 2 + 2, y + h)], fill=frame, width=5)
            if r.random() < 0.3: d.rectangle([cx + 6, y + h * 0.45, cx + bw * 0.35, y + h], fill=(236, 214, 150))   # warm blind
        elif kind == 'balcony':
            ww = min(58, bw * 0.55); window2(d, cx - ww / 2, y, ww, h, frame, seed=seed + b)
            d.rectangle([cx - ww / 2 - 16, y + h - 6, cx + ww / 2 + 16, y + h + 6], fill=shade(frame, 0.7))
            for q in np.linspace(cx - ww / 2 - 14, cx + ww / 2 + 14, 8): d.line([(q, y + h * 0.62), (q, y + h)], fill=(60, 56, 70), width=3)
            d.line([(cx - ww / 2 - 16, y + h * 0.62), (cx + ww / 2 + 16, y + h * 0.62)], fill=(60, 56, 70), width=4)
            if r.random() < 0.5:
                for q in range(3): fx = cx - ww / 2 + q * 22 + 6; d.ellipse([fx - 9, y + h * 0.5, fx + 9, y + h * 0.7], fill=r.choice([(60, 126, 56), (240, 90, 110), (250, 200, 80)]))

def shopfront(d, x0, x1, top, bottom, bays, frame, awn=None, seed=0, skip=(), goods=True):
    r = random.Random(seed); bw = (x1 - x0) / bays
    for b in range(bays):
        if b in skip: continue
        a = x0 + bw * b + 8; c = x0 + bw * (b + 1) - 8
        d.rectangle([a - 4, top, c + 4, bottom - 30], fill=shade(frame, 0.75)); d.rectangle([a, top + 4, c, bottom - 34], fill=GLASS)
        d.rectangle([a, top + 4, c, top + 22], fill=GLASS_D)
        if goods:
            for q in range(3):
                gx = a + 10 + q * (c - a - 20) / 3; gc = r.choice([(240, 200, 90), (220, 110, 140), (120, 200, 170), (170, 130, 230), (240, 150, 80)])
                d.rectangle([gx, bottom - 70, gx + (c - a - 30) / 3, bottom - 40], fill=gc); d.rectangle([gx, bottom - 70, gx + (c - a - 30) / 3, bottom - 64], fill=lift(gc, 30))
        d.polygon([(a + 6, bottom - 34), (a + (c - a) * 0.45, top + 4), (a + (c - a) * 0.62, top + 4), (a + 22, bottom - 34)], fill=GLASS_L)
        d.line([((a + c) / 2, top + 4), ((a + c) / 2, bottom - 34)], fill=frame, width=3)
    if awn:
        n = int((x1 - x0) / 24)
        for i in range(n):
            ax = x0 + i * (x1 - x0) / n; c = awn[i % 2]
            d.polygon([(ax, top - 10), (ax + (x1 - x0) / n, top - 10), (ax + (x1 - x0) / n + 4, top + 26), (ax + 4, top + 26)], fill=c)
            d.chord([ax + 4, top + 14, ax + (x1 - x0) / n + 4, top + 38], 0, 180, fill=c)
        d.line([(x0, top - 10), (x1, top - 10)], fill=shade(awn[0], 0.6), width=3)

def block(w, h, *, roof_h=150, roofc=(120, 124, 138), wall=(226, 212, 186), wallk='plaster', trim=(244, 238, 224),
          storeys=3, win='sash', ground='shop', sign=None, sign_bg=(60, 70, 110), sign_fg=(255, 240, 200), sign_sz=26,
          awn=None, door_col=None, door_c=(80, 100, 130), door_w=100, glass_door=True, door_double=False,
          feats=('ac', 'vent', 'sky'), pilasters=True, seed=1, cornice=True, ground_h=210, frame=None):
    W, H = w * U, h * U; im = blank(w, h); d = SD(im); inset = 10; bottom = H - 4
    frame = frame or trim
    if door_col is None: door_col = w // 2 if w % 2 else None
    mid = (door_col + 0.5) * U if door_col is not None else W / 2
    ry = roof_h
    im = flat_roof(im, d, inset, W - inset, 30, ry, roofc, trim, seed, feats); d = SD(im)
    wall_fill(d, [inset, ry, W - inset, bottom], wallk, wall, seed)
    if cornice:
        d.rectangle([inset - 8, ry, W - inset + 8, ry + 18], fill=trim); d.rectangle([inset - 8, ry + 14, W - inset + 8, ry + 22], fill=shade(trim, 0.7))
    gtop = bottom - ground_h
    up0 = ry + 30; sh = (gtop - up0) / max(1, storeys)
    for s in range(storeys):
        y = up0 + s * sh
        windows_row(d, inset + 6, W - inset - 6, y + sh * 0.14, sh * 0.62, w, frame, win, seed + s * 31)
        if wallk != 'glass' and s < storeys: d.line([(inset, y + sh - 4), (W - inset, y + sh - 4)], fill=shade(wall, 0.84), width=4)
    if pilasters and win != 'ribbon':
        for x in np.linspace(inset, W - inset - 14, w + 1)[[0, -1]]:
            d.rectangle([x, ry + 22, x + 14, gtop], fill=lift(wall, 18)); d.rectangle([x + 10, ry + 22, x + 14, gtop], fill=shade(wall, 0.85))
    # ground floor
    d.rectangle([inset, gtop - 8, W - inset, gtop + 6], fill=shade(trim, 0.85))
    if sign:
        sw = min(W - 2 * inset - 40, max(220, len(sign) * sign_sz * 0.78 + 50)); sign_band(d, mid - sw / 2, mid + sw / 2, gtop + 8, 40, sign_bg, sign_fg, sign, sign_sz)
    ftop = gtop + (56 if sign else 16)
    dc = door_col if door_col is not None else None
    skip = set()
    if dc is not None: skip = {dc}
    elif door_double: skip = {w // 2 - 1, w // 2}
    if ground == 'shop':
        shopfront(d, inset + 4, W - inset - 4, ftop, bottom, w, frame, awn, seed, skip)
    elif ground == 'lobby':
        shopfront(d, inset + 4, W - inset - 4, ftop, bottom, w, frame, awn, seed, skip, goods=False)
    elif ground == 'windows':
        windows_row(d, inset + 6, W - inset - 6, ftop + 6, bottom - ftop - 60, w, frame, 'sash', seed + 7, skip=skip)
    foundation(d, inset - 4, W - inset + 4, bottom - 30, bottom, seed, (150, 144, 136))
    im = grad_rect(im, [W - inset - 70, ry, W - inset, bottom], (20, 16, 30), 0, 90)
    im = grad_rect(im, [inset, ry + 22, W - inset, ry + 60], (20, 16, 30), 90, 0, horiz=False); d = SD(im)
    dw = door_w * (1.6 if door_double else 1)
    door2(d, mid, bottom, dw, min(190, bottom - ftop + 10), door_c, frame, glass=glass_door, double=door_double, arch=False)
    return im, d, dict(W=W, H=H, ry=ry, gtop=gtop, bottom=bottom, mid=mid, inset=inset)

# ---------------------------------------------------------------- named buildings
def rt_hq():   # 8x5 glass tower, violet accents, crystal on roof
    im, d, g = block(8, 5, roof_h=110, roofc=(96, 100, 118), wall=(64, 74, 104), wallk='panel', trim=(180, 184, 200), storeys=4, win='ribbon',
                     ground='lobby', sign='REVIVAL TECH HQ', sign_bg=(70, 74, 96), sign_fg=(236, 220, 255), door_double=True, seed=71, feats=('sky', 'ac'))
    W = g['W']; mid = W / 2
    im = glow(im, [mid - 110, -10, mid + 110, 200], (180, 90, 255, 150), 20); d = SD(im)
    for (x, top, ww) in ((mid, 6, 26), (mid - 30, 50, 15), (mid + 30, 46, 16)):
        d.polygon([(x, top), (x + ww, top + 40), (x + ww * 0.6, 120), (x - ww * 0.6, 120), (x - ww, top + 40)], fill=(132, 64, 200))
        d.polygon([(x, top), (x + ww, top + 40), (x + ww * 0.6, 120), (x, 112)], fill=(92, 36, 156)); d.polygon([(x, top), (x - ww * 0.4, top + 44), (x - ww * 0.2, 104)], fill=(220, 180, 255))
    d.polygon([(mid - 50, 128), (mid + 50, 128), (mid + 40, 110), (mid - 40, 110)], fill=(70, 66, 88))
    for x in (g['inset'] + 4, W - g['inset'] - 10): d.rectangle([x, g['ry'] + 20, x + 6, g['gtop']], fill=(170, 110, 240))
    im = crystal_emblem(im, mid - 190, g['gtop'] + 28, 0.36); im = crystal_emblem(im, mid + 190, g['gtop'] + 28, 0.36)
    return finish(im, 71, 0.1)

def hotel():   # 8x5 red brick, balconies, canopy
    im, d, g = block(8, 5, roof_h=120, roofc=(110, 96, 92), wall=(170, 84, 66), wallk='stone', trim=(240, 226, 200), storeys=3, win='balcony',
                     ground='windows', sign='GRAND HOTEL', sign_bg=(40, 44, 70), sign_fg=(250, 214, 120), door_double=True, door_c=(110, 60, 40), glass_door=True, seed=81, feats=('tank', 'ac', 'garden'))
    mid = g['W'] / 2; b = g['bottom']
    d.polygon([(mid - 120, b - 200), (mid + 120, b - 200), (mid + 136, b - 170), (mid - 136, b - 170)], fill=(150, 40, 50)); d.line([(mid - 136, b - 170), (mid + 136, b - 170)], fill=(250, 214, 120), width=4)
    for sx in (mid - 126, mid + 120): d.rectangle([sx, b - 170, sx + 6, b - 6], fill=(250, 214, 120))
    for sgn in (-1, 1):
        x = mid + sgn * 170; d.rectangle([x - 18, b - 50, x + 18, b - 6], fill=(120, 110, 104)); r = random.Random(sgn)
        for _ in range(8): xx = x + r.uniform(-14, 14); yy = b - 58 + r.uniform(-16, 4); d.ellipse([xx - 9, yy - 9, xx + 9, yy + 9], fill=r.choice([(50, 120, 60), (80, 150, 70)]))
    return finish(im, 81)

def galleria():   # 12x5 department store
    im, d, g = block(12, 5, roof_h=110, roofc=(130, 128, 136), wall=(236, 226, 204), wallk='plaster', trim=(250, 244, 230), storeys=3, win='arch',
                     ground='shop', sign='GALLERIA', sign_bg=(160, 40, 70), sign_fg=(255, 236, 190), sign_sz=30, awn=((160, 40, 70), (250, 240, 230)), door_double=True, seed=91, feats=('sky', 'ac', 'garden', 'sky'))
    W = g['W']; mid = W / 2
    # glass atrium over the entrance
    d.polygon([(mid - 150, g['ry'] + 30), (mid + 150, g['ry'] + 30), (mid + 150, g['gtop'] - 10), (mid - 150, g['gtop'] - 10)], fill=GLASS)
    for x in np.linspace(mid - 150, mid + 150, 7): d.line([(x, g['ry'] + 30), (x, g['gtop'] - 10)], fill=(220, 214, 200), width=5)
    for y in np.linspace(g['ry'] + 30, g['gtop'] - 10, 5): d.line([(mid - 150, y), (mid + 150, y)], fill=(220, 214, 200), width=4)
    d.polygon([(mid - 130, g['gtop'] - 12), (mid - 40, g['ry'] + 32), (mid - 10, g['ry'] + 32), (mid - 100, g['gtop'] - 12)], fill=GLASS_L)
    d.polygon([(mid - 170, g['ry'] + 30), (mid, g['ry'] - 60), (mid + 170, g['ry'] + 30)], fill=(200, 194, 180)); d.polygon([(mid - 140, g['ry'] + 22), (mid, g['ry'] - 44), (mid + 140, g['ry'] + 22)], fill=(170, 210, 230))
    for sx in (40, W - 60):
        d.rectangle([sx, 20, sx + 4, 100], fill=(90, 80, 80)); d.polygon([(sx + 4, 22), (sx + 50, 32), (sx + 4, 44)], fill=(160, 40, 70))
    return finish(im, 91)

def apartment(seed=101, wall=(214, 190, 150), roofc=(118, 110, 112)):   # 6x5
    im, d, g = block(6, 5, roof_h=120, roofc=roofc, wall=wall, wallk='plaster', trim=(244, 236, 220), storeys=3, win='balcony', ground='windows',
                     door_col=3, door_c=(70, 96, 120), door_w=88, seed=seed, feats=('tank', 'ac', 'garden'))
    mid = g['mid']; b = g['bottom']
    d.polygon([(mid - 70, b - 196), (mid + 70, b - 196), (mid + 80, b - 176), (mid - 80, b - 176)], fill=(70, 96, 120))
    d.rectangle([mid + 60, b - 120, mid + 84, b - 70], fill=(170, 160, 150)); d.rectangle([mid + 64, b - 114, mid + 80, b - 76], fill=(110, 104, 100))   # letterboxes
    return finish(im, seed)

def terrace(seed=111, wall=(232, 220, 196), roofc=(84, 96, 128), door=(150, 60, 60)):   # 6x4 pitched-roof row house (one front door)
    W, H = 6 * U, 4 * U; im = blank(6, 4); d = SD(im); inset = 10; bottom = H - 4; ov = 190
    poly = [(inset - 12, ov), (inset + 30, 26), (W - inset - 30, 26), (W - inset + 12, ov)]
    im = Image.alpha_composite(im, roof_layer(im.size, poly, 26, ov, W, 0, roofc, 'slate', seed)); d = SD(im)
    d.line([(inset + 30, 26), (W - inset - 30, 26)], fill=shade(roofc, 0.6), width=6)
    for cx in (inset + 70, W - inset - 110): chimney(d, cx, 6, 80)
    for cx in (W * 0.33, W * 0.67):
        d.rectangle([cx - 40, 80, cx + 40, 150], fill=wall); d.polygon([(cx - 52, 84), (cx, 50), (cx + 52, 84)], fill=shade(roofc, 1.1)); window2(d, cx - 22, 96, 44, 44, (250, 246, 236))
    wall_fill(d, [inset, ov, W - inset, bottom], 'plaster', wall, seed)
    d.rectangle([inset - 8, ov - 4, W - inset + 8, ov + 12], fill=(244, 238, 224))
    im = grad_rect(im, [inset, ov + 10, W - inset, ov + 44], (20, 16, 30), 90, 0, horiz=False); d = SD(im)
    for c in (0, 1, 2, 4, 5):
        cx = (c + 0.5) * U; window2(d, cx - 26, ov + 60, 52, 80, (250, 246, 236), shutter=(70, 110, 90) if c % 2 else None, box=[(240, 90, 110), (250, 200, 80)], seed=seed + c)
    foundation(d, inset - 4, W - inset + 4, bottom - 26, bottom, seed)
    im = grad_rect(im, [W - inset - 60, ov, W - inset, bottom], (20, 16, 30), 0, 80); d = SD(im)
    door2(d, 3.5 * U, bottom, 76, 170, door, (250, 246, 236))
    d.rectangle([3.5 * U - 26, ov + 26, 3.5 * U + 26, ov + 46], fill=(250, 214, 120)); d.text((3.5 * U, ov + 36), str(seed % 40 + 2), fill=(60, 40, 30), font=font(18), anchor='mm')
    return finish(im, seed)

def cafe():   # 4x3
    W, H = 4 * U, 3 * U; im = blank(4, 3); d = SD(im); inset = 10; bottom = H - 4; ry = 96
    im = flat_roof(im, d, inset, W - inset, 26, ry, (130, 110, 100), (244, 230, 210), 121, ('vent',)); d = SD(im)
    wall_fill(d, [inset, ry, W - inset, bottom], 'planks', (110, 150, 120), 121)
    sign_band(d, inset + 30, W - inset - 30, ry + 14, 38, (60, 40, 30), (255, 230, 170), 'CAFE', 26)
    shopfront(d, inset + 4, W - inset - 4, ry + 84, bottom, 4, (240, 230, 210), ((200, 70, 60), (250, 240, 230)), 121, skip={2})
    foundation(d, inset - 4, W - inset + 4, bottom - 24, bottom, 121)
    door2(d, 2.5 * U, bottom, 76, 150, (90, 60, 40), (240, 230, 210), glass=True, arch=False)
    d.rectangle([2.5 * U + 60, bottom - 74, 2.5 * U + 100, bottom - 8], fill=(40, 40, 46)); d.rectangle([2.5 * U + 64, bottom - 70, 2.5 * U + 96, bottom - 30], fill=(60, 64, 70))
    for k in range(3): d.line([(2.5 * U + 68, bottom - 62 + k * 10), (2.5 * U + 90, bottom - 62 + k * 10)], fill=(240, 240, 240), width=2)
    return finish(im, 121)

def school():   # 6x4
    im, d, g = block(6, 4, roof_h=100, roofc=(150, 90, 70), wall=(236, 196, 140), wallk='stone', trim=(250, 240, 220), storeys=1, win='sash', ground='windows',
                     door_col=3, door_c=(60, 90, 140), door_w=96, glass_door=False, door_double=False, sign='SCHOOL', sign_bg=(60, 90, 140), sign_fg=(255, 250, 230), seed=131, feats=('vent',))
    cx = 3.5 * U
    d.rectangle([cx - 46, 0, cx + 46, 100], fill=(236, 196, 140)); d.polygon([(cx - 56, 10), (cx, -30), (cx + 56, 10)], fill=(150, 90, 70))
    d.ellipse([cx - 30, 24, cx + 30, 84], fill=(250, 246, 236)); d.ellipse([cx - 30, 24, cx + 30, 84], outline=(60, 50, 50), width=4)
    d.line([(cx, 54), (cx, 34)], fill=(40, 30, 30), width=4); d.line([(cx, 54), (cx + 16, 60)], fill=(40, 30, 30), width=4)
    return finish(im, 131)

def classical(w, h, *, title, roofc, wall, accent, dome=False, seed=141, banners=None):   # capitol / museum 10x7
    W, H = w * U, h * U; im = blank(w, h); d = SD(im); inset = 10; bottom = H - 4; mid = W / 2
    ry = 260
    im = flat_roof(im, d, inset, W - inset, 120, ry, (150, 146, 140), wall, seed, ('vent', 'sky')); d = SD(im)
    if dome:
        d.rectangle([mid - 150, 120, mid + 150, 230], fill=wall)
        for x in np.linspace(mid - 140, mid + 120, 9): d.rectangle([x, 140, x + 14, 226], fill=lift(wall, 16)); d.rectangle([x + 10, 140, x + 14, 226], fill=shade(wall, 0.8))
        d.rectangle([mid - 160, 222, mid + 160, 236], fill=shade(wall, 0.8))
        d.pieslice([mid - 140, 10, mid + 140, 270], 180, 360, fill=roofc)
        for k in range(-3, 4): d.line([(mid + k * 36, 140), (mid + k * 20, 26)], fill=shade(roofc, 0.75), width=3)
        d.pieslice([mid - 120, 26, mid - 20, 200], 180, 270, fill=lift(roofc, 30))
        d.rectangle([mid - 20, -10, mid + 20, 30], fill=wall); d.pieslice([mid - 22, -30, mid + 22, 14], 180, 360, fill=roofc)
        d.line([(mid, -60), (mid, -24)], fill=(80, 70, 70), width=4)
    else:
        d.rectangle([inset + 40, 150, W - inset - 40, 236], fill=wall)
        d.polygon([(inset + 30, 150), (mid, 60), (W - inset - 30, 150)], fill=roofc); d.polygon([(inset + 70, 146), (mid, 78), (mid, 146)], fill=lift(roofc, 20))
    wall_fill(d, [inset, ry, W - inset, bottom], 'stone', wall, seed)
    d.rectangle([inset - 8, ry, W - inset + 8, ry + 20], fill=lift(wall, 20)); d.rectangle([inset - 8, ry + 16, W - inset + 8, ry + 26], fill=shade(wall, 0.7))
    for s in range(2):
        y = ry + 50 + s * 150
        windows_row(d, inset + 6, inset + 3 * U, y, 100, 3, (250, 246, 236), 'arch', seed + s)
        windows_row(d, W - inset - 3 * U, W - inset - 6, y, 100, 3, (250, 246, 236), 'arch', seed + 9 + s)
    # portico
    px0, px1 = mid - 2 * U + 20, mid + 2 * U - 20; ptop = ry + 30
    d.polygon([(px0 - 30, ptop + 90), (mid, ptop - 40), (px1 + 30, ptop + 90)], fill=lift(wall, 24)); d.polygon([(px0 - 6, ptop + 82), (mid, ptop - 18), (px1 + 6, ptop + 82)], fill=shade(wall, 0.9))
    im = crystal_emblem(im, mid, ptop + 40, 0.4); d = SD(im)
    sign_band(d, px0 - 20, px1 + 20, ptop + 90, 40, shade(wall, 0.8), (60, 50, 60), title, 28)
    d.rectangle([px0, ptop + 130, px1, bottom - 50], fill=shade(wall, 0.6))
    door2(d, mid, bottom - 48, 140, 200, (110, 70, 40), (220, 200, 160), double=True)
    for x in np.linspace(px0, px1 - 28, 6):
        d.rectangle([x, ptop + 130, x + 28, bottom - 50], fill=lift(wall, 26)); d.rectangle([x + 20, ptop + 130, x + 28, bottom - 50], fill=shade(wall, 0.8))
        for k in range(1, 4): d.line([(x + k * 7, ptop + 140), (x + k * 7, bottom - 60)], fill=shade(wall, 0.9), width=1)
        d.rectangle([x - 6, ptop + 128, x + 34, ptop + 140], fill=lift(wall, 34)); d.rectangle([x - 6, bottom - 62, x + 34, bottom - 50], fill=lift(wall, 10))
    for k in range(4):   # steps
        y = bottom - 50 + k * 12; d.rectangle([px0 - 30 - k * 10, y, px1 + 30 + k * 10, y + 12], fill=lift(wall, 10 - k * 8)); d.line([(px0 - 30 - k * 10, y), (px1 + 30 + k * 10, y)], fill=lift(wall, 40), width=2)
    foundation(d, inset - 4, px0 - 50, bottom - 30, bottom, seed, (170, 164, 150)); foundation(d, px1 + 50, W - inset + 4, bottom - 30, bottom, seed + 1, (170, 164, 150))
    if banners:
        for x in (px0 - 60, px1 + 40):
            d.rectangle([x, ry + 40, x + 26, ry + 200], fill=banners[0]); d.polygon([(x, ry + 200), (x + 13, ry + 220), (x + 26, ry + 200)], fill=banners[0])
            d.rectangle([x + 4, ry + 50, x + 22, ry + 60], fill=banners[1])
            im = crystal_emblem(im, x + 13, ry + 120, 0.18); d = SD(im)
    im = grad_rect(im, [W - inset - 80, ry, W - inset, bottom], (20, 16, 30), 0, 80)
    return finish(im, seed)

def capitol(): return classical(10, 7, title='CAPITOL', roofc=(96, 156, 140), wall=(232, 224, 206), accent=(250, 214, 120), dome=True, seed=141)
def museum(): return classical(10, 7, title='MUSEUM', roofc=(170, 96, 70), wall=(226, 212, 190), accent=(170, 90, 230), seed=151, banners=((120, 60, 180), (250, 214, 120)))

def terminal():   # 12x7 grand terminal: train-shed vault behind, clock tower, fan window
    w, h = 12, 7; W, H = w * U, h * U; im = blank(w, h); d = SD(im); inset = 10; bottom = H - 4; mid = W / 2
    # glass barrel vault (train shed) seen from above
    d.rectangle([inset, 40, W - inset, 300], fill=(90, 96, 110))
    for i, y in enumerate(np.linspace(46, 290, 14)):
        d.rectangle([inset + 8, y, W - inset - 8, y + 14], fill=(120, 168, 200) if i % 2 else (104, 150, 184))
    for x in np.linspace(inset + 8, W - inset - 8, 17): d.line([(x, 44), (x, 296)], fill=(70, 74, 88), width=4)
    d.rectangle([inset, 40, W - inset, 54], fill=(160, 150, 140)); d.polygon([(inset + 40, 290), (inset + 300, 60), (inset + 360, 60), (inset + 100, 290)], fill=(190, 222, 238, 120))
    ry = 300; wall = (222, 196, 160)
    wall_fill(d, [inset, ry, W - inset, bottom], 'stone', wall, 161)
    d.rectangle([inset - 8, ry - 10, W - inset + 8, ry + 12], fill=(244, 232, 210)); d.rectangle([inset - 8, ry + 8, W - inset + 8, ry + 18], fill=(150, 130, 110))
    for side in (0, 1):
        x0 = inset + 6 if side == 0 else mid + 2 * U; x1 = mid - 2 * U if side == 0 else W - inset - 6
        windows_row(d, x0, x1, ry + 60, 180, 4, (250, 240, 220), 'arch', 161 + side)
        windows_row(d, x0, x1, ry + 300, 120, 4, (250, 240, 220), 'sash', 171 + side)
    # central pavilion + fan window
    px0, px1 = mid - 2 * U, mid + 2 * U
    d.rectangle([px0, ry - 40, px1, bottom], fill=lift(wall, 14))
    d.pieslice([px0 + 30, ry + 10, px1 - 30, ry + 2 * (px1 - px0 - 60) / 2 + 10], 180, 360, fill=(244, 232, 210))
    d.pieslice([px0 + 50, ry + 30, px1 - 50, ry + 30 + (px1 - px0 - 100)], 180, 360, fill=GLASS)
    cy = ry + 30 + (px1 - px0 - 100) / 2
    for a in np.linspace(180, 360, 9): d.line([(mid, cy), (mid + math.cos(math.radians(a)) * 200, cy + math.sin(math.radians(a)) * 200)], fill=(244, 232, 210), width=5)
    d.rectangle([px0 + 50, cy - 4, px1 - 50, cy + 10], fill=(244, 232, 210))
    sign_band(d, px0 + 20, px1 - 20, cy + 20, 46, (40, 50, 80), (255, 226, 150), 'GRAND TERMINAL', 30)
    # clock tower
    d.rectangle([mid - 70, ry - 250, mid + 70, ry - 30], fill=lift(wall, 8)); d.rectangle([mid + 50, ry - 250, mid + 70, ry - 30], fill=shade(wall, 0.8))
    d.polygon([(mid - 84, ry - 250), (mid, ry - 330), (mid + 84, ry - 250)], fill=(80, 130, 120)); d.polygon([(mid - 84, ry - 250), (mid, ry - 330), (mid, ry - 250)], fill=(104, 160, 146))
    d.line([(mid, ry - 360), (mid, ry - 326)], fill=(80, 70, 70), width=4)
    d.ellipse([mid - 50, ry - 210, mid + 50, ry - 110], fill=(250, 246, 230)); d.ellipse([mid - 50, ry - 210, mid + 50, ry - 110], outline=(60, 50, 50), width=6)
    for k in range(12): a = k * math.pi / 6; d.line([(mid + 38 * math.cos(a), ry - 160 + 38 * math.sin(a)), (mid + 44 * math.cos(a), ry - 160 + 44 * math.sin(a))], fill=(60, 50, 50), width=4)
    d.line([(mid, ry - 160), (mid, ry - 196)], fill=(40, 30, 30), width=6); d.line([(mid, ry - 160), (mid + 26, ry - 150)], fill=(40, 30, 30), width=6)
    d.rectangle([mid - 80, ry - 30, mid + 80, ry - 14], fill=(244, 232, 210))
    door2(d, mid, bottom, 190, 210, (60, 80, 110), (244, 232, 210), glass=True, double=True)
    for x in (px0 + 6, px1 - 34): d.rectangle([x, ry - 40, x + 28, bottom - 30], fill=lift(wall, 30)); d.rectangle([x + 20, ry - 40, x + 28, bottom - 30], fill=shade(wall, 0.85))
    foundation(d, inset - 4, W - inset + 4, bottom - 30, bottom, 161, (160, 150, 140))
    im = grad_rect(im, [W - inset - 80, ry, W - inset, bottom], (20, 16, 30), 0, 80)
    im = grad_rect(im, [inset, ry + 16, W - inset, ry + 56], (20, 16, 30), 90, 0, horiz=False)
    return finish(im, 161)

def stadium():   # 18x9 Aurelith Games stadium (bowl from above + curved facade)
    w, h = 18, 9; W, H = w * U, h * U; im = blank(w, h); d = SD(im); mid = W / 2; bottom = H - 4
    cx, cy, rx, ryy = mid, 380, W / 2 - 24, 350
    # facade band: the area under the lower half of the rim, down to the ground line
    fac = Image.new('L', im.size, 0); fd = SD(fac); fd.rectangle([24, cy, W - 24, bottom], fill=255)
    wall = Image.new('RGBA', im.size, (0, 0, 0, 0)); wd = SD(wall); r = random.Random(171)
    wd.rectangle([0, 0, W, H], fill=(214, 206, 196))
    # vertical ribs + glass strips, banners
    nrib = 26
    for i in range(nrib + 1):
        x = 24 + i * (W - 48) / nrib
        wd.rectangle([x - 8, 0, x + 8, H], fill=(236, 230, 220)); wd.rectangle([x + 4, 0, x + 8, H], fill=(170, 164, 156))
        if i < nrib:
            xm = x + (W - 48) / nrib / 2
            wd.rectangle([xm - 18, 0, xm + 18, H], fill=GLASS); wd.polygon([(xm - 18, H), (xm + 6, 0), (xm + 14, 0), (xm - 10, H)], fill=(110, 150, 186))
    wall.putalpha(fac); im = Image.alpha_composite(im, wall); d = SD(im)
    # ground arcade
    ay = bottom - 190
    d.rectangle([24, ay, W - 24, bottom], fill=(196, 186, 172))
    for i in range(17):
        x = 24 + (i + 0.5) * (W - 48) / 17
        if abs(x - mid) < 150: continue
        d.rectangle([x - 40, ay + 60, x + 40, bottom - 26], fill=(70, 62, 74)); d.pieslice([x - 40, ay + 20, x + 40, ay + 100], 180, 360, fill=(70, 62, 74))
        d.rectangle([x - 34, ay + 70, x + 34, bottom - 26], fill=(96, 86, 100))
    d.rectangle([24, ay - 14, W - 24, ay + 6], fill=(240, 232, 220))
    # rim + bowl
    d.ellipse([cx - rx - 10, cy - ryy - 10, cx + rx + 10, cy + ryy + 10], fill=(236, 230, 220))
    tiers = [((120, 60, 180), 0), ((250, 214, 120), 34), ((150, 80, 210), 68), ((246, 230, 190), 102), ((120, 60, 180), 136)]
    for c, k in tiers:
        d.ellipse([cx - rx + k, cy - ryy + k * 0.95, cx + rx - k, cy + ryy - k * 0.95], fill=c)
        for _ in range(int(220 - k)):
            a = r.uniform(0, 2 * math.pi); rr = r.uniform(0.2, 0.95)
            px = cx + (rx - k - 16 * rr) * math.cos(a); py = cy + (ryy - k * 0.95 - 16 * rr) * math.sin(a)
            d.rectangle([px - 3, py - 3, px + 3, py + 3], fill=r.choice([(250, 240, 220), (60, 50, 70), (240, 120, 90), (110, 180, 230)]))
    k = 170; d.ellipse([cx - rx + k, cy - ryy + k * 0.95, cx + rx - k, cy + ryy - k * 0.95], fill=(200, 110, 80))   # running track
    for j in range(1, 4): d.ellipse([cx - rx + k + j * 12, cy - ryy + (k + j * 12) * 0.95, cx + rx - k - j * 12, cy + ryy - (k + j * 12) * 0.95], outline=(240, 220, 200), width=2)
    k = 222; d.ellipse([cx - rx + k, cy - ryy + k * 0.95, cx + rx - k, cy + ryy - k * 0.95], fill=(90, 160, 70))
    ix0, iy0, ix1, iy1 = cx - rx + k, cy - ryy + k * 0.95, cx + rx - k, cy + ryy - k * 0.95
    for j in range(8): d.rectangle([ix0 + 60 + j * (ix1 - ix0 - 120) / 8, iy0 + 40, ix0 + 60 + (j + 0.5) * (ix1 - ix0 - 120) / 8, iy1 - 40], fill=(104, 176, 82))
    d.ellipse([cx - 60, cy - 50, cx + 60, cy + 50], outline=(250, 250, 240), width=4); d.line([(cx, iy0 + 30), (cx, iy1 - 30)], fill=(250, 250, 240), width=4)
    im = crystal_emblem(im, cx, cy, 0.34); d = SD(im)
    # rim lip over the facade + roof canopy ring
    d.arc([cx - rx - 10, cy - ryy - 10, cx + rx + 10, cy + ryy + 10], 0, 180, fill=(250, 246, 236), width=18)
    d.arc([cx - rx - 10, cy - ryy - 10, cx + rx + 10, cy + ryy + 10], 180, 360, fill=(250, 246, 236), width=10)
    # floodlight masts
    for (fx, fy) in ((cx - rx * 0.8, cy - ryy * 0.62), (cx + rx * 0.8, cy - ryy * 0.62)):
        d.rectangle([fx - 6, fy, fx + 6, fy + 160], fill=(90, 90, 104)); d.rectangle([fx - 40, fy - 30, fx + 40, fy + 6], fill=(70, 70, 84))
        for q in range(4): d.rectangle([fx - 36 + q * 19, fy - 26, fx - 22 + q * 19, fy + 2], fill=(255, 246, 200))
        im = glow(im, [fx - 70, fy - 60, fx + 70, fy + 30], (255, 240, 180, 110), 14); d = SD(im)
    # entrance portal (2 tiles wide: cols 8-9) + sign
    d.rectangle([mid - 170, ay - 200, mid + 170, bottom], fill=(120, 60, 180))
    d.rectangle([mid - 160, ay - 190, mid + 160, ay - 136], fill=(60, 40, 90)); d.text((mid, ay - 163), 'AURELITH GAMES', fill=(255, 226, 150), font=font(34), anchor='mm')
    for sgn in (-1, 1): im = crystal_emblem(im, mid + sgn * 146, ay - 163, 0.2)
    d = SD(im); door2(d, mid, bottom, 200, 200, (60, 80, 110), (250, 214, 120), glass=True, double=True, arch=False)
    for x in (mid - 240, mid + 210):
        d.rectangle([x, ay - 200, x + 30, ay - 40], fill=(250, 214, 120)); d.polygon([(x, ay - 40), (x + 15, ay - 20), (x + 30, ay - 40)], fill=(250, 214, 120)); d.rectangle([x + 4, ay - 190, x + 26, ay - 50], fill=(120, 60, 180))
    foundation(d, 20, W - 20, bottom - 26, bottom, 171, (150, 144, 136))
    im = grad_rect(im, [W - 120, cy, W - 24, bottom], (20, 16, 30), 0, 90)
    return finish(im, 171, 0.1)

def gate_s():   # 6x4 south gatehouse; cols 2-3 are the open passage (rows 0-1 drawn as an arch on overlay)
    w, h = 6, 4; W, H = w * U, h * U; im = blank(w, h); d = SD(im); bottom = H - 4; wall = (214, 200, 176)
    d.rectangle([2 * U - 20, 30, 4 * U + 20, 200], fill=wall); wall_fill(d, [2 * U - 20, 40, 4 * U + 20, 200], 'stone', wall, 181)
    d.rectangle([2 * U, 150, 4 * U, 210], fill=(0, 0, 0, 0)); d.pieslice([2 * U, 90, 4 * U, 230], 180, 360, fill=(0, 0, 0, 0))
    d.arc([2 * U - 6, 84, 4 * U + 6, 236], 180, 360, fill=(244, 232, 210), width=14)
    sign_band(d, 2 * U + 30, 4 * U - 30, 40, 36, (40, 50, 80), (255, 226, 150), 'AURELITH', 24)
    for tx in (0, 4 * U):
        x0, x1 = tx + 14, tx + 2 * U - 14
        d.rectangle([x0, 60, x1, bottom], fill=wall); wall_fill(d, [x0, 60, x1, bottom], 'stone', wall, 182 + tx)
        for k in range(5): d.rectangle([x0 - 8 + k * (x1 - x0 + 16) / 5, 20, x0 - 8 + k * (x1 - x0 + 16) / 5 + 30, 62], fill=lift(wall, 12))
        d.rectangle([x0 - 8, 54, x1 + 8, 70], fill=shade(wall, 0.8))
        window2(d, (x0 + x1) / 2 - 18, 120, 36, 70, (244, 232, 210), arch=True)
        d.rectangle([(x0 + x1) / 2 - 22, 230, (x0 + x1) / 2 + 22, 420], fill=(120, 60, 180)); d.polygon([((x0 + x1) / 2 - 22, 420), ((x0 + x1) / 2, 446), ((x0 + x1) / 2 + 22, 420)], fill=(120, 60, 180))
        im = crystal_emblem(im, (x0 + x1) / 2, 300, 0.2); d = SD(im)
        foundation(d, x0 - 4, x1 + 4, bottom - 26, bottom, 183 + tx)
    im = grad_rect(im, [W - 80, 60, W - 14, bottom], (20, 16, 30), 0, 80)
    return finish(im, 181)

def gate_side(east):   # 4x8 E/W gate seen side-on: tower rows 0-3, passage rows 4-5 (beam on overlay), tower rows 6-7
    w, h = 4, 8; W, H = w * U, h * U; im = blank(w, h); d = SD(im); wall = (214, 200, 176)
    for (y0, y1) in ((40, 4 * U - 4), (6 * U + 40, 8 * U - 4)):
        tw0 = y0 - 40 + 80
        d.rectangle([20, y0, W - 20, y0 + 110], fill=shade(wall, 0.85))
        for k in range(5): d.rectangle([14 + k * (W - 28) / 5, y0 - 30, 14 + k * (W - 28) / 5 + 40, y0 + 6], fill=lift(wall, 12))
        d.rectangle([20, y0 + 110, W - 20, y1], fill=wall); wall_fill(d, [20, y0 + 110, W - 20, y1], 'stone', wall, 191 + y0)
        d.rectangle([14, y0 + 104, W - 14, y0 + 120], fill=lift(wall, 24))
        if y1 - y0 > 200: window2(d, W / 2 - 20, y0 + 170, 40, 80, (244, 232, 210), arch=True)
        foundation(d, 16, W - 16, y1 - 26, y1, 192 + y0)
    # beam across the passage (top half of rows 4-5 area)
    d.rectangle([20, 4 * U - 20, W - 20, 4 * U + 70], fill=shade(wall, 0.9)); d.rectangle([20, 4 * U + 60, W - 20, 4 * U + 76], fill=shade(wall, 0.6))
    sign_band(d, 40, W - 40, 4 * U - 6, 50, (40, 50, 80), (255, 226, 150), 'AURELITH', 26)
    for x in (60, W - 60):
        d.line([(x, 4 * U + 76), (x, 4 * U + 110)], fill=(60, 56, 70), width=3); d.rectangle([x - 12, 4 * U + 110, x + 12, 4 * U + 140], fill=(255, 220, 140))
        im = glow(im, [x - 30, 4 * U + 96, x + 30, 4 * U + 156], (255, 220, 140, 120), 8); d = SD(im)
    im = grad_rect(im, [20, 0, 80, H], (20, 16, 30), 60, 0) if east else grad_rect(im, [W - 80, 0, W - 20, H], (20, 16, 30), 0, 60)
    return finish(im, 191)

def stall(kind, awn, seed):   # 1x2 market stall (row0 awning, row1 counter)
    im = blank(1, 2); d = SD(im); r = random.Random(seed)
    for x in (10, U - 18): d.rectangle([x, 60, x + 8, 2 * U - 10], fill=(110, 80, 56))
    d.rectangle([4, 150, U - 4, 2 * U - 12], fill=(150, 108, 70)); d.rectangle([4, 150, U - 4, 160], fill=(184, 140, 96))
    for k in range(3): d.line([(8, 178 + k * 22), (U - 8, 178 + k * 22)], fill=(120, 84, 54), width=2)
    gs = {'fruit': [(240, 90, 80), (250, 170, 60), (250, 220, 80), (120, 200, 90)], 'crystal': [(170, 110, 240), (110, 200, 240), (240, 150, 230)],
          'flowers': [(240, 90, 130), (250, 220, 90), (250, 250, 250), (170, 110, 240)], 'bread': [(210, 150, 80), (230, 180, 110), (180, 110, 60)],
          'fabric': [(80, 120, 200), (200, 70, 80), (250, 210, 90), (90, 170, 120)], 'toys': [(240, 120, 90), (110, 180, 230), (250, 220, 90), (170, 110, 240)]}[kind]
    for i in range(14):
        x = r.uniform(16, U - 22); y = r.uniform(120, 150); c = r.choice(gs)
        if kind in ('fabric', 'toys', 'bread'): d.rounded_rectangle([x - 10, y - 8, x + 10, y + 8], 4, fill=c)
        elif kind == 'crystal': d.polygon([(x, y - 14), (x + 7, y), (x, y + 8), (x - 7, y)], fill=c)
        else: d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=c)
        d.point([(x - 3, y - 4)], fill=lift(c, 60))
    n = 5
    for i in range(n):
        x = i * U / n; c = awn[i % 2]; d.polygon([(x - 2, 20), (x + U / n + 2, 20), (x + U / n + 6, 100), (x - 6, 100)], fill=c)
        d.chord([x - 6, 86, x + U / n + 6, 114], 0, 180, fill=c)
    d.polygon([(-2, 20), (U + 2, 20), (U + 2, 32), (-2, 32)], fill=shade(awn[0], 0.7))
    im = grad_rect(im, [0, 100, U, 140], (20, 16, 30), 110, 0, horiz=False)
    return finish(im, seed)
