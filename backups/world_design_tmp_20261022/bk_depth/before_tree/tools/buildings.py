# Detailed buildings, drawn on the 64px pixel grid (geometry in 128-unit design space via SD), snapped to palette by pixel.py.
from gen_tiles import *

def shade(c, f): return tuple(max(0, min(255, int(v * f))) for v in c[:3])
def lift(c, k): return tuple(max(0, min(255, v + k)) for v in c[:3])

def finish(im, seed, amt=0.16, big=10):
    """painterly finish: low-freq colour drift + fine brush grain, only where opaque"""
    amt *= 0.2   # pixel-art: keep surfaces flat; shading comes from palette ramps/dither
    a = np.array(im, float); h, w = a.shape[:2]; r = np.random.default_rng(seed)
    n1 = gaussian_filter(r.random((h, w)), big * S); n1 = (n1 - n1.min()) / (np.ptp(n1) + 1e-9)
    n2 = gaussian_filter(r.random((h, w)), (0.8 * S, 2.2 * S)); n2 = (n2 - n2.min()) / (np.ptp(n2) + 1e-9)
    f = 1 - amt / 2 + amt * (0.6 * n1 + 0.4 * n2)
    a[..., :3] *= f[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')

def grad_rect(im, box, c, a0, a1, horiz=True, steps=12):
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = SD(lay); x0, y0, x1, y1 = box
    for i in range(steps):
        t = i / steps; al = int(a0 + (a1 - a0) * t)
        if horiz: d.rectangle([x0 + (x1 - x0) * t, y0, x0 + (x1 - x0) * (t + 1 / steps), y1], fill=c + (al,))
        else: d.rectangle([x0, y0 + (y1 - y0) * t, x1, y0 + (y1 - y0) * (t + 1 / steps)], fill=c + (al,))
    return Image.alpha_composite(im, lay)

def roof_layer(size, poly, rt, ov, W, lt, roof, style, seed):
    lay = Image.new('RGBA', size, (0, 0, 0, 0)); d = SD(lay); r = random.Random(seed)
    rowh = {'shingle': 20, 'tile': 20, 'slate': 18}[style]
    rows = list(range(int(rt) - 4, int(ov) + 2, rowh))
    for i, y in enumerate(rows):
        t = (y - rt) / (ov - rt); base = shade(roof, 1.12 - 0.3 * t)
        if style == 'shingle':
            sw = 32; off = (i % 2) * sw / 2
            x = -sw + off
            while x < W + sw:
                c = lift(base, r.choice((-8, 0, 0, 0, 8))); fx = x / W
                c = shade(c, 1.06 - 0.16 * fx)
                d.rectangle([x, y, x + sw - 1, y + rowh + 2], fill=c)
                d.line([(x, y + rowh + 1), (x + sw - 1, y + rowh + 1)], fill=shade(c, 0.5), width=3)
                d.line([(x, y + 4), (x, y + rowh)], fill=shade(c, 0.62), width=2)
                d.line([(x + 3, y + 3), (x + sw * 0.6, y + 3)], fill=lift(c, 34), width=2)
                x += sw
        elif style == 'tile':
            sw = 26; x = -sw
            while x < W + sw:
                c = lift(base, r.choice((-8, 0, 6))); c = shade(c, 1.06 - 0.16 * x / W)
                d.rectangle([x, y, x + sw, y + rowh + 6], fill=shade(c, 0.7))
                d.rounded_rectangle([x + 2, y, x + sw - 2, y + rowh + 6], 8, fill=c)
                d.line([(x + 6, y + 3), (x + 6, y + rowh + 2)], fill=lift(c, 30), width=2)
                x += sw
            d.line([(0, y + rowh + 6), (W, y + rowh + 6)], fill=shade(base, 0.55), width=2)
        else:  # slate
            sw = 36; off = (i % 2) * sw / 2; x = -sw + off
            while x < W + sw:
                c = lift(base, r.choice((-8, 0, 8))); c = shade(c, 1.06 - 0.16 * x / W)
                d.rectangle([x, y, x + sw - 3, y + rowh + 3], fill=c)
                d.line([(x, y + rowh + 3), (x + sw - 3, y + rowh + 3)], fill=shade(c, 0.6), width=2)
                x += sw
    mask = Image.new('L', size, 0); SD(mask).polygon(poly, fill=255)
    out = Image.new('RGBA', size, (0, 0, 0, 0)); out.paste(lay, (0, 0), mask)
    return out

def window2(d, x, y, w, h, frame, shutter=None, box=None, seed=0, arch=False):
    r = random.Random(seed)
    if shutter:
        for sx in (x - 22, x + w + 4):
            d.rectangle([sx, y - 2, sx + 18, y + h + 2], fill=shutter)
            for k in range(4): d.line([(sx + 3, y + 8 + k * h / 4), (sx + 15, y + 8 + k * h / 4)], fill=shade(shutter, 0.7), width=2)
    d.rectangle([x - 7, y - 7, x + w + 7, y + h + 7], fill=shade(frame, 0.7))
    if arch: d.pieslice([x - 7, y - 7 - w / 2, x + w + 7, y - 7 + w / 2 + 14], 180, 360, fill=shade(frame, 0.7))
    d.rectangle([x - 4, y - 4, x + w + 4, y + h + 4], fill=frame)
    if arch: d.pieslice([x - 4, y - 4 - w / 2, x + w + 4, y - 4 + w / 2 + 14], 180, 360, fill=frame); d.pieslice([x, y - w / 2, x + w, y + w / 2], 180, 360, fill=(70, 110, 146))
    d.rectangle([x, y, x + w, y + h], fill=(70, 110, 146))
    d.rectangle([x, y, x + w, y + h * 0.25], fill=(52, 84, 118))           # interior shadow under lintel
    d.polygon([(x + w * 0.15, y + h), (x + w * 0.55, y), (x + w * 0.8, y), (x + w * 0.4, y + h)], fill=(150, 196, 220))
    d.line([(x + w / 2, y), (x + w / 2, y + h)], fill=frame, width=4); d.line([(x, y + h * 0.48), (x + w, y + h * 0.48)], fill=frame, width=4)
    d.rectangle([x - 12, y - 14, x + w + 12, y - 6], fill=shade(frame, 0.82))   # lintel
    d.rectangle([x - 10, y + h + 4, x + w + 10, y + h + 12], fill=lift(frame, 10)); d.line([(x - 10, y + h + 12), (x + w + 10, y + h + 12)], fill=shade(frame, 0.6), width=2)
    if box:
        d.rectangle([x - 8, y + h + 12, x + w + 8, y + h + 28], fill=(120, 78, 46)); d.line([(x - 8, y + h + 14), (x + w + 8, y + h + 14)], fill=(160, 112, 70), width=2)
        for i in range(11):
            fx = x - 6 + i * (w + 12) / 10; fy = y + h + 10 + r.uniform(-4, 2)
            d.ellipse([fx - 7, fy - 6, fx + 7, fy + 6], fill=r.choice([(60, 126, 56), (80, 150, 66)]))
        for i in range(8):
            fx = x - 2 + i * (w + 4) / 7 + r.uniform(-3, 3); fy = y + h + 6 + r.uniform(-3, 3); c = r.choice(box)
            d.ellipse([fx - 5, fy - 5, fx + 5, fy + 5], fill=c); d.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=(255, 236, 140))

def door2(d, cx, bottom, w, h, color, frame, glass=False, double=False, arch=True):
    x = cx - w / 2; top = bottom - h
    d.rectangle([x - 12, top - 4, x + w + 12, bottom], fill=shade(frame, 0.75))
    if arch: d.pieslice([x - 12, top - 4 - (w + 24) / 2 + 10, x + w + 12, top - 4 + (w + 24) / 2 + 10], 180, 360, fill=shade(frame, 0.75))
    d.rectangle([x - 8, top, x + w + 8, bottom], fill=frame)
    if arch: d.pieslice([x - 8, top - (w + 16) / 2 + 12, x + w + 8, top + (w + 16) / 2 + 12], 180, 360, fill=frame); d.pieslice([x, top - w / 2 + 12, x + w, top + w / 2 + 12], 180, 360, fill=shade(color, 0.8))
    d.rectangle([x, top + 12, x + w, bottom], fill=color)
    d.rectangle([x, top + 12, x + w, top + 30], fill=shade(color, 0.7))
    if glass:
        for gx0, gx1 in ((x + 6, x + w / 2 - 3), (x + w / 2 + 3, x + w - 6)):
            d.rectangle([gx0, top + 20, gx1, bottom - 6], fill=(132, 186, 212)); d.line([(gx0 + 6, bottom - 20), (gx1 - 4, top + 40)], fill=(200, 232, 244), width=4)
    else:
        if double: d.line([(x + w / 2, top + 14), (x + w / 2, bottom)], fill=shade(color, 0.55), width=3)
        halves = ((x, x + w / 2), (x + w / 2, x + w)) if double else ((x, x + w),)
        for a0, a1 in halves:
            for py0, py1 in ((top + 40, top + h * 0.5), (top + h * 0.56, bottom - 16)):
                d.rectangle([a0 + 12, py0, a1 - 12, py1], fill=shade(color, 0.86)); d.line([(a0 + 12, py0), (a1 - 12, py0)], fill=shade(color, 0.6), width=2)
                d.line([(a0 + 12, py1), (a1 - 12, py1)], fill=lift(color, 26), width=2)
        d.ellipse([x + w - 24, bottom - h * 0.48, x + w - 12, bottom - h * 0.48 + 12], fill=(236, 204, 110))
        if double: d.ellipse([x + 12, bottom - h * 0.48, x + 24, bottom - h * 0.48 + 12], fill=(236, 204, 110))
    d.rectangle([x - 22, bottom - 8, x + w + 22, bottom], fill=(170, 160, 146)); d.line([(x - 22, bottom - 8), (x + w + 22, bottom - 8)], fill=(206, 198, 186), width=2)

def wall_fill(d, box, kind, wall, seed):
    x0, y0, x1, y1 = box; r = random.Random(seed)
    d.rectangle(box, fill=wall)
    if kind == 'plaster':
        for _ in range(40):
            x = r.uniform(x0, x1); y = r.uniform(y0, y1); d.ellipse([x - 5, y - 2, x + 5, y + 2], fill=lift(wall, r.choice([-10, 8])))
    elif kind == 'planks':
        for y in np.arange(y0, y1, 15):
            d.line([(x0, y), (x1, y)], fill=shade(wall, 0.72), width=2); d.line([(x0, y + 2), (x1, y + 2)], fill=lift(wall, 14), width=1)
            for x in np.arange(x0 + r.uniform(0, 60), x1, r.uniform(90, 140)): d.line([(x, y), (x, y + 15)], fill=shade(wall, 0.75), width=2)
    elif kind == 'stone':
        y = y0; row = 0
        while y < y1:
            hh = r.uniform(18, 26); x = x0 - (row % 2) * 16
            while x < x1:
                ww = r.uniform(26, 44); c = lift(wall, r.randint(-16, 12))
                d.rounded_rectangle([max(x0, x + 1), y + 1, min(x1, x + ww - 1), min(y1, y + hh - 1)], 4, fill=c)
                d.line([(max(x0, x + 3), y + 3), (min(x1, x + ww - 4), y + 3)], fill=lift(c, 20), width=2)
                x += ww
            y += hh; row += 1
    elif kind == 'panel':
        for x in np.arange(x0, x1, 40): d.line([(x, y0), (x, y1)], fill=shade(wall, 0.9), width=2)

def foundation(d, x0, x1, y0, y1, seed, c=(150, 144, 136)):
    r = random.Random(seed); x = x0
    d.rectangle([x0, y0, x1, y1], fill=shade(c, 0.6))
    while x < x1:
        ww = r.uniform(22, 36); cc = lift(c, r.randint(-14, 12))
        d.rounded_rectangle([x + 1, y0 + 2, min(x1, x + ww - 2), y1 - 1], 5, fill=cc); d.line([(x + 4, y0 + 4), (min(x1, x + ww) - 6, y0 + 4)], fill=lift(cc, 26), width=2)
        x += ww

def chimney(d, x, top, bot, c=(150, 112, 96)):
    d.rectangle([x, top, x + 40, bot], fill=c)
    for y in range(int(top) + 8, int(bot), 12):
        off = 0 if (y // 12) % 2 else 10
        for xx in range(int(x) - off, int(x) + 40, 20): d.line([(max(x, xx), y), (min(x + 40, xx + 18), y)], fill=shade(c, 0.75), width=2)
    d.rectangle([x + 28, top, x + 40, bot], fill=shade(c, 0.78))
    d.rectangle([x - 6, top - 10, x + 46, top + 2], fill=shade(c, 0.7)); d.rectangle([x - 6, top - 10, x + 46, top - 6], fill=lift(c, 20))

def smoke(im, x, y):
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = SD(g)
    for i, (dx, dy, rr) in enumerate(((0, 0, 9), (8, -14, 12), (2, -30, 14))): d.ellipse([x + dx - rr, y + dy - rr, x + dx + rr, y + dy + rr], fill=(240, 240, 246, 120 - i * 30))
    return Image.alpha_composite(im, pblur(g, 2))

SPEC = {
 # kind      roof style, wall kind, trim, door colour, shutters, flowers
 'player': dict(style='shingle', wallk='plaster', trim=(250, 244, 230), door=(150, 70, 52), shutter=(160, 70, 60), flowers=[(170, 90, 230), (210, 150, 255)], gable=True, chim=0.72, timber=True),
 'house':  dict(style='slate', wallk='plaster', trim=(244, 238, 224), door=(70, 110, 120), shutter=(60, 120, 130), flowers=[(240, 90, 110), (250, 200, 80)], gable=False, chim=0.22, timber=True),
 'house_b': dict(style='tile', wallk='stone', trim=(236, 224, 200), door=(120, 74, 44), shutter=None, flowers=[(250, 140, 80), (255, 255, 255)], gable=True, chim=0.75, timber=False),
 'house_c': dict(style='shingle', wallk='planks', trim=(230, 214, 176), door=(96, 130, 70), shutter=(96, 130, 70), flowers=[(250, 220, 90), (240, 120, 160)], gable=False, chim=0.2, timber=False, porch=True),
 'heal':   dict(style='tile', wallk='plaster', trim=(255, 255, 250), door=(90, 170, 160), shutter=None, flowers=[(170, 90, 230), (255, 255, 255)], gable=True, chim=None, timber=False),
 'shop':   dict(style='slate', wallk='planks', trim=(244, 240, 232), door=(64, 120, 170), shutter=None, flowers=[(250, 200, 80)], gable=False, chim=0.8, timber=False),
 'lab':    dict(style='slate', wallk='plaster', trim=(250, 250, 246), door=(96, 112, 150), shutter=None, flowers=[(170, 90, 230), (255, 255, 255)], gable=True, chim=None, timber=False),   # Brookhollow research lab (interiors hookup)
 'hall':   dict(style='tile', wallk='stone', trim=(232, 222, 198), door=(110, 50, 120), shutter=None, flowers=None, gable=True, chim=None, timber=False),
}

def building(w, h, wall_rows, roof, wall, kind):
    if kind == 'office': return office(w, h, wall_rows, roof, wall)
    sp = SPEC[kind]; W, H = w * U, h * U; im = blank(w, h); seed = w * 31 + h * 7 + len(kind) * 13 + sum(roof)
    im = shadow(im, [-6, H - 54, W + 6, H + 14], 110, 9)
    wt = H - wall_rows * U; ov = wt + 18; inset = 16; mid = W / 2; bottom = H - 4
    d = SD(im)
    # ---- walls
    wall_fill(d, [inset, wt, W - inset, bottom], sp['wallk'], wall, seed)
    if sp['timber']:
        beam = (104, 70, 44)
        for x in np.linspace(inset, W - inset - 12, w + 1): d.rectangle([x, ov, x + 12, bottom - 30], fill=beam); d.line([(x + 2, ov), (x + 2, bottom - 30)], fill=lift(beam, 30), width=2)
        d.rectangle([inset, ov + 50, W - inset, ov + 60], fill=beam)
    # corner quoins
    for xq in (inset, W - inset - 22):
        for k, y in enumerate(range(int(ov) + 6, int(bottom) - 30, 22)):
            ww = 22 if k % 2 else 16; xx = xq if xq == inset else W - inset - ww
            d.rectangle([xx, y, xx + ww, y + 18], fill=lift(sp['trim'], -26)); d.line([(xx, y), (xx + ww, y)], fill=lift(sp['trim'], 0), width=2)
    foundation(d, inset - 4, W - inset + 4, bottom - 32, bottom, seed, (150, 144, 136) if kind != 'hall' else (186, 176, 156))
    im = grad_rect(im, [W - inset - 70, ov, W - inset, bottom], (20, 16, 30), 0, 110)    # side shading (light from upper-left)
    im = grad_rect(im, [inset, ov, inset + 50, bottom], (255, 250, 230), 50, 0)
    im = grad_rect(im, [inset, ov, W - inset, ov + 46], (20, 16, 30), 120, 0, horiz=False)  # under-eave occlusion
    d = SD(im)
    # ---- roof
    lt = 34; rt = 34
    if kind == 'hall': rt = 60
    poly = [(lt, rt), (W - lt, rt), (W + 0, ov), (0, ov)]
    if sp['chim'] is not None:
        cxh = W * sp['chim']; chimney(d, cxh, 16, rt + (ov - rt) * 0.35)
    im = Image.alpha_composite(im, roof_layer(im.size, poly, rt, ov, W, lt, roof, sp['style'], seed)); d = SD(im)
    if sp['chim'] is not None:
        tb = rt + (ov - rt) * 0.35; chimney(d, cxh, 16, tb); d.polygon([(cxh - 6, tb), (cxh + 46, tb), (cxh + 50, tb + 10), (cxh - 10, tb + 10)], fill=shade(roof, 0.55))
        im = smoke(im, cxh + 20, 2 + 8); d = SD(im)
    rs = grad_rect(Image.new('RGBA', im.size, (0, 0, 0, 0)), [0, rt, W, ov], (20, 16, 30), 0, 80)
    rs = grad_rect(rs, [0, rt, W * 0.35, ov], (255, 246, 220), 40, 0)
    mk = Image.new('L', im.size, 0); SD(mk).polygon(poly, fill=255); lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); lay.paste(rs, (0, 0), mk); im = Image.alpha_composite(im, lay); d = SD(im)
    if not sp['gable'] and kind in ('house', 'house_c', 'shop'):
        dy = rt + (ov - rt) * 0.38; dw_ = 64
        d.polygon([(mid - dw_ - 14, dy + 96), (mid - dw_ - 14, dy + 40), (mid, dy - 10), (mid + dw_ + 14, dy + 40), (mid + dw_ + 14, dy + 96)], fill=shade(roof, 0.5))
        d.rectangle([mid - dw_, dy + 36, mid + dw_, dy + 96], fill=wall); window2(d, mid - 26, dy + 48, 52, 40, sp['trim'])
        for sgn in (-1, 1):
            p0 = (mid, dy - 14); p1 = (mid + sgn * (dw_ + 22), dy + 44)
            d.line([p0, p1], fill=shade(roof, 0.6), width=18); d.line([p0, p1], fill=roof, width=11); d.line([(p0[0], p0[1] + 3), (p1[0], p1[1] - 4)], fill=lift(roof, 34), width=3)
        im = grad_rect(im, [mid - dw_, dy + 40, mid + dw_, dy + 56], (20, 16, 30), 100, 0, horiz=False); d = SD(im)
    bb = shade(sp['trim'], 0.8)
    d.line([(lt, rt), (0, ov)], fill=bb, width=8); d.line([(W - lt, rt), (W, ov)], fill=shade(bb, 0.75), width=8)
    d.rounded_rectangle([lt - 8, rt - 9, W - lt + 8, rt + 7], 6, fill=shade(roof, 0.75)); d.line([(lt, rt - 5), (W - lt, rt - 5)], fill=lift(roof, 40), width=3)
    d.rectangle([-2, ov - 2, W + 2, ov + 10], fill=sp['trim']); d.line([(0, ov + 10), (W, ov + 10)], fill=shade(sp['trim'], 0.55), width=3)
    # front gable / pediment
    if sp['gable']:
        gw = 132 if kind != 'hall' else 220; gh = 120 if kind != 'hall' else 150; gb = ov
        gpoly = [(mid - gw, gb), (mid, gb - gh), (mid + gw, gb)]
        gl = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = SD(gl)
        if kind == 'hall': wall_fill(gd, [mid - gw, gb - gh, mid + gw, gb], 'stone', wall, seed + 3)
        else: gd.rectangle([mid - gw, gb - gh, mid + gw, gb], fill=lift(wall, -6))
        m_ = Image.new('L', im.size, 0); SD(m_).polygon(gpoly, fill=255); im.paste(gl, (0, 0), m_); d = SD(im)
        im = grad_rect(im, [mid - gw, gb - gh, mid + gw, gb], (20, 16, 30), 0, 70); d = SD(im)
        m_ = Image.new('L', im.size, 0); SD(m_).polygon(gpoly, fill=255)
        # little shingled verges
        for sgn in (-1, 1):
            p0 = (mid, gb - gh - 14); p1 = (mid + sgn * (gw + 20), gb + 4)
            d.line([p0, p1], fill=shade(roof, 0.65), width=22); d.line([p0, p1], fill=roof, width=14); d.line([(p0[0], p0[1] + 4), (p1[0], p1[1] - 6)], fill=lift(roof, 30), width=3)
        if kind == 'hall':
            im = crystal_emblem(im, mid, gb - gh * 0.42, 1.1); d = SD(im)
        elif kind == 'heal':
            im = crystal_emblem(im, mid, gb - gh * 0.4, 0.95); d = SD(im)
        else:
            cy = gb - gh * 0.4; d.ellipse([mid - 30, cy - 30, mid + 30, cy + 30], fill=sp['trim']); d.ellipse([mid - 22, cy - 22, mid + 22, cy + 22], fill=(70, 110, 146))
            d.line([(mid, cy - 22), (mid, cy + 22)], fill=sp['trim'], width=4); d.line([(mid - 22, cy), (mid + 22, cy)], fill=sp['trim'], width=4)
            d.pieslice([mid - 22, cy - 22, mid + 22, cy + 22], 200, 260, fill=(160, 204, 226))
    # ---- windows
    wy = ov + 34; ww_, wh = 70, 78
    cols = [c for c in range(w) if c != w // 2]
    for c in cols:
        cx = c * U + U / 2
        if kind == 'shop' and abs(c - w // 2) == 1:
            x0 = c * U + 8; x1 = (c + 1) * U - 8
            d.rectangle([x0 - 4, wy - 2, x1 + 4, wy + 104], fill=shade(sp['trim'], 0.7)); d.rectangle([x0, wy + 2, x1, wy + 100], fill=sp['trim'])
            d.rectangle([x0 + 6, wy + 8, x1 - 6, wy + 94], fill=(90, 140, 170))
            r = random.Random(c)
            for sy in (wy + 40, wy + 70):
                d.line([(x0 + 6, sy), (x1 - 6, sy)], fill=(200, 180, 140), width=3)
                for k in range(6): xx = x0 + 12 + k * 17; d.rounded_rectangle([xx, sy - 18, xx + 12, sy - 2], 3, fill=r.choice([(160, 90, 220), (90, 200, 140), (240, 120, 90), (240, 200, 90)]))
            d.polygon([(x0 + 10, wy + 94), (x0 + 50, wy + 8), (x0 + 70, wy + 8), (x0 + 30, wy + 94)], fill=(150, 196, 220, 120))
            continue
        window2(d, cx - ww_ / 2, wy, ww_, wh, sp['trim'], sp['shutter'], sp['flowers'], seed + c, arch=(kind == 'hall'))
    # awning (shop) / porch
    if kind == 'shop':
        ay = wy - 30
        for k, x in enumerate(np.arange(inset, W - inset, 24)):
            col = (64, 140, 196) if k % 2 else (246, 246, 236)
            d.polygon([(x, ay), (x + 24, ay), (x + 28, ay + 30), (x - 4, ay + 30)], fill=col); d.pieslice([x - 4, ay + 20, x + 28, ay + 40], 0, 180, fill=col)
        im = grad_rect(im, [inset, ay + 40, W - inset, ay + 60], (20, 16, 30), 90, 0, horiz=False); d = SD(im)
    dw = {'hall': 112}.get(kind, 96); dh = {'hall': 228}.get(kind, 210)
    door2(d, mid, bottom, dw, dh, sp['door'], lift(sp['trim'], -10), glass=kind in ('heal', 'shop'), double=kind == 'hall', arch=kind not in ('heal', 'shop'))
    top = bottom - dh
    if kind in ('house', 'player', 'house_b', 'house_c'):
        # porch: small roof on posts + lantern
        pw = 82 if kind != 'house_c' else 104
        for sgn in (-1, 1): d.rectangle([mid + sgn * pw - 7, top - 18, mid + sgn * pw + 7, bottom - 6], fill=shade(sp['trim'], 0.85)); d.rectangle([mid + sgn * pw - 10, bottom - 14, mid + sgn * pw + 10, bottom - 4], fill=(150, 140, 126))
        d.polygon([(mid - pw - 18, top - 4), (mid - pw + 6, top - 42), (mid + pw - 6, top - 42), (mid + pw + 18, top - 4)], fill=shade(roof, 0.95))
        for k in range(3): yy = top - 38 + k * 12; d.line([(mid - pw + 6 - k * 8, yy), (mid + pw - 6 + k * 8, yy)], fill=shade(roof, 0.7), width=2)
        d.rectangle([mid - pw - 18, top - 6, mid + pw + 18, top + 2], fill=sp['trim'])
        im = grad_rect(im, [mid - pw, top + 2, mid + pw, top + 26], (20, 16, 30), 90, 0, horiz=False); d = SD(im)
        g = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(g).ellipse([mid + pw - 4, top + 14, mid + pw + 44, top + 62], fill=(255, 210, 130, 140)); im = Image.alpha_composite(im, pblur(g, 8)); d = SD(im)
        d.rectangle([mid + pw + 12, top + 26, mid + pw + 28, top + 50], fill=(255, 226, 150), outline=(54, 52, 62), width=3)
    if kind == 'player':
        d.rectangle([W - 70, bottom - 70, W - 64, bottom - 6], fill=(110, 76, 46)); d.rounded_rectangle([W - 90, bottom - 96, W - 44, bottom - 66], 8, fill=(80, 110, 170)); d.rectangle([W - 52, bottom - 100, W - 48, bottom - 82], fill=(220, 60, 60))
    if kind == 'house_b':
        for x in (inset + 26, W - inset - 60): d.ellipse([x, bottom - 40, x + 34, bottom - 6], fill=(170, 96, 60)); d.ellipse([x + 4, bottom - 52, x + 30, bottom - 30], fill=(70, 140, 60))
    if kind == 'house_c':
        for x, y in ((inset + 30, bottom - 40), (inset + 62, bottom - 34)): d.rectangle([x, y, x + 28, bottom - 6], fill=(150, 108, 64)); d.line([(x, y + 10), (x + 28, y + 10)], fill=(110, 76, 44), width=2)
    if kind == 'heal':
        d.rounded_rectangle([mid - 100, top - 52, mid + 100, top - 14], 10, fill=(250, 246, 236), outline=(90, 170, 160), width=4)
        d.text((mid, top - 33), 'REST & HEAL', fill=(70, 130, 124), font=font(24), anchor='mm')
        for sgn in (-1, 1): d.rectangle([mid + sgn * 66 - 3, top, mid + sgn * 66 + 3, bottom], fill=(90, 170, 160))
    if kind == 'shop':
        bx = mid + 74; d.line([(bx, top - 60), (bx + 60, top - 60)], fill=(54, 52, 62), width=5); d.line([(bx + 8, top - 60), (bx + 8, top - 46)], fill=(54, 52, 62), width=2); d.line([(bx + 52, top - 60), (bx + 52, top - 46)], fill=(54, 52, 62), width=2)
        d.rounded_rectangle([bx - 2, top - 46, bx + 62, top - 4], 6, fill=(250, 240, 214), outline=(64, 120, 170), width=3); d.text((bx + 30, top - 25), 'RT', fill=(50, 90, 140), font=font(22), anchor='mm')
        d.rounded_rectangle([mid - 96, ov - 40, mid + 96, ov - 6], 8, fill=(64, 120, 170), outline=(246, 246, 236), width=3); d.text((mid, ov - 23), 'RT SUPPLY', fill=(250, 246, 236), font=font(22), anchor='mm')
        for x in (inset + 14, W - inset - 64):
            d.rectangle([x, bottom - 44, x + 46, bottom - 6], fill=(176, 128, 78)); d.line([(x, bottom - 44), (x + 46, bottom - 6)], fill=(130, 90, 54), width=3); d.line([(x + 46, bottom - 44), (x, bottom - 6)], fill=(130, 90, 54), width=3)
    if kind == 'lab':   # Brookhollow research lab: name band over the door + violet crystal antenna on the roof ridge
        d.rounded_rectangle([mid - 104, top - 52, mid + 104, top - 14], 10, fill=(250, 250, 246), outline=(140, 90, 210), width=4)
        d.text((mid, top - 33), 'LUMEN LAB', fill=(96, 70, 160), font=font(24), anchor='mm')
        for x in (inset + 22, W - inset - 58):
            d.rounded_rectangle([x, bottom - 42, x + 36, bottom - 6], 6, fill=(200, 210, 226), outline=(96, 112, 150), width=3)
            d.polygon([(x + 18, bottom - 36), (x + 27, bottom - 22), (x + 18, bottom - 10), (x + 9, bottom - 22)], fill=(176, 120, 240))
    if kind == 'hall':
        for c in (1, w - 2):
            x = c * U + U / 2
            d.rectangle([x - 28, ov + 18, x + 28, ov + 150], fill=(120, 50, 150)); d.polygon([(x - 28, ov + 150), (x + 28, ov + 150), (x, ov + 172)], fill=(120, 50, 150))
            d.rectangle([x - 28, ov + 18, x + 28, ov + 28], fill=(232, 196, 90)); d.ellipse([x - 14, ov + 62, x + 14, ov + 90], fill=(240, 200, 90)); d.polygon([(x, ov + 66), (x + 8, ov + 76), (x, ov + 88), (x - 8, ov + 76)], fill=(150, 80, 200))
        for x in np.linspace(inset + 4, W - inset - 26, 8):
            if abs(x + 11 - mid) < 90: continue
            d.rectangle([x, ov + 12, x + 22, bottom - 30], fill=lift(wall, 24)); d.rectangle([x + 15, ov + 12, x + 22, bottom - 30], fill=shade(wall, 0.8)); d.rectangle([x - 4, ov + 8, x + 26, ov + 18], fill=lift(wall, 34))
        for sgn in (-1, 1):
            bx = mid + sgn * 100; g = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(g).ellipse([bx - 30, bottom - 110, bx + 30, bottom - 50], fill=(255, 170, 90, 150)); im = Image.alpha_composite(im, pblur(g, 8)); d = SD(im)
            d.polygon([(bx - 14, bottom - 60), (bx + 14, bottom - 60), (bx + 6, bottom - 6), (bx - 6, bottom - 6)], fill=(70, 62, 66)); d.ellipse([bx - 16, bottom - 66, bx + 16, bottom - 56], fill=(90, 80, 84))
            d.polygon([(bx - 10, bottom - 62), (bx, bottom - 92), (bx + 10, bottom - 62)], fill=(255, 170, 70)); d.polygon([(bx - 5, bottom - 62), (bx, bottom - 80), (bx + 5, bottom - 62)], fill=(255, 236, 150))
    return finish(im, seed)

def office(w, h, wall_rows, roof, wall):
    W, H = w * U, h * U; im = blank(w, h); seed = 991
    im = shadow(im, [-6, H - 54, W + 6, H + 14], 110, 9)
    wt = H - wall_rows * U; ov = wt + 10; inset = 14; mid = W / 2; bottom = H - 4; d = SD(im)
    # flat roof slab seen from above, with parapet, skylights, vents and the crystal spire
    d.rectangle([inset - 6, 70, W - inset + 6, ov], fill=(96, 100, 118))
    d.rectangle([inset + 10, 86, W - inset - 10, ov - 16], fill=(132, 136, 150))
    for x in np.arange(inset + 30, W - inset - 30, 40): d.line([(x, 90), (x, ov - 20)], fill=(120, 124, 138), width=2)
    for x0 in (inset + 40, W - inset - 190):
        d.rectangle([x0, 120, x0 + 150, 200], fill=(70, 92, 120)); d.rectangle([x0 + 4, 124, x0 + 146, 196], fill=(110, 150, 186))
        for k in range(1, 4): d.line([(x0 + k * 37, 124), (x0 + k * 37, 196)], fill=(70, 92, 120), width=3)
        d.polygon([(x0 + 10, 190), (x0 + 50, 130), (x0 + 70, 130), (x0 + 30, 190)], fill=(170, 206, 230))
    for x0, y0 in ((inset + 60, 250), (W - inset - 120, 250)):
        d.rectangle([x0, y0, x0 + 60, y0 + 50], fill=(170, 174, 184)); d.rectangle([x0 + 50, y0, x0 + 60, y0 + 50], fill=(130, 134, 146)); d.ellipse([x0 + 10, y0 + 8, x0 + 44, y0 + 40], fill=(110, 114, 126))
    d.rectangle([inset - 6, 62, W - inset + 6, 74], fill=(160, 164, 178))
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); SD(g).ellipse([mid - 120, 30, mid + 120, 330], fill=(180, 90, 255, 150)); im = Image.alpha_composite(im, pblur(g, 24)); d = SD(im)
    d.polygon([(mid - 60, 300), (mid + 60, 300), (mid + 44, 270), (mid - 44, 270)], fill=(70, 66, 88))
    for (x, top, ww) in ((mid, 40, 34), (mid - 36, 120, 20), (mid + 38, 110, 22)):
        d.polygon([(x, top), (x + ww, top + 56), (x + ww * 0.6, 280), (x - ww * 0.6, 280), (x - ww, top + 56)], fill=(132, 64, 200))
        d.polygon([(x, top), (x + ww, top + 56), (x + ww * 0.6, 280), (x, 266)], fill=(92, 36, 156))
        d.polygon([(x, top), (x - ww * 0.4, top + 60), (x - ww * 0.2, 250)], fill=(220, 180, 255))
    # facade
    d.rectangle([inset, ov, W - inset, bottom], fill=wall)
    d.rectangle([inset, ov, W - inset, ov + 44], fill=(70, 74, 96)); d.text((mid, ov + 22), 'REVIVAL TECH', fill=(236, 220, 255), font=font(26), anchor='mm')
    im = crystal_emblem(im, mid - 150, ov + 22, 0.42); im = crystal_emblem(im, mid + 150, ov + 22, 0.42); d = SD(im)
    gy0, gy1 = ov + 58, bottom - 34
    for c in range(w):
        if c == w // 2: continue
        x0 = c * U + 10; x1 = (c + 1) * U - 10
        d.rectangle([x0 - 4, gy0 - 4, x1 + 4, gy1 + 4], fill=(150, 154, 168)); d.rectangle([x0, gy0, x1, gy1], fill=(84, 124, 160))
        d.rectangle([x0, gy0, x1, gy0 + 22], fill=(60, 92, 126))
        d.line([((x0 + x1) / 2, gy0), ((x0 + x1) / 2, gy1)], fill=(170, 174, 186), width=4)
        for yy in np.linspace(gy0, gy1, 4)[1:-1]: d.line([(x0, yy), (x1, yy)], fill=(170, 174, 186), width=3)
        d.polygon([(x0 + 8, gy1), (x0 + 50, gy0 + 4), (x0 + 74, gy0 + 4), (x0 + 32, gy1)], fill=(150, 196, 220, 140))
    for x in np.linspace(inset, W - inset - 16, w + 1): d.rectangle([x, ov + 44, x + 16, bottom - 30], fill=(206, 200, 192)); d.rectangle([x + 11, ov + 44, x + 16, bottom - 30], fill=(160, 154, 148))
    foundation(d, inset - 4, W - inset + 4, bottom - 32, bottom, seed, (120, 124, 136))
    im = grad_rect(im, [W - inset - 80, ov, W - inset, bottom], (20, 16, 30), 0, 100); im = grad_rect(im, [inset, ov + 44, W - inset, ov + 80], (20, 16, 30), 110, 0, horiz=False); d = SD(im)
    top = bottom - 220
    d.polygon([(mid - 120, top - 30), (mid + 120, top - 30), (mid + 130, top - 6), (mid - 130, top - 6)], fill=(70, 74, 96)); d.line([(mid - 120, top - 30), (mid + 120, top - 30)], fill=(190, 150, 240), width=3)
    im = grad_rect(im, [mid - 110, top - 6, mid + 110, top + 30], (20, 16, 30), 100, 0, horiz=False); d = SD(im)
    door2(d, mid, bottom, 104, 220, (60, 80, 110), (180, 184, 196), glass=True, arch=False)
    for sgn in (-1, 1):
        x = mid + sgn * 96; d.ellipse([x - 22, bottom - 36, x + 22, bottom - 4], fill=(90, 92, 104)); r = random.Random(sgn + 5)
        for _ in range(10): xx = x + r.uniform(-16, 16); yy = bottom - 40 + r.uniform(-24, 4); d.ellipse([xx - 9, yy - 9, xx + 9, yy + 9], fill=r.choice([(50, 120, 60), (80, 150, 70)]))
    return finish(im, seed, 0.12)
