# Seamless interior floors and walls. Rule: anything that crosses a tile edge is identical in every variant
# (periodic base field + edge-crossing pieces with fixed tones); variants only differ in details kept >= 4 px
# inside the tile, so any mix of variants tiles without a seam. No grid line ever sits on a tile edge.
import numpy as np
from ix_canvas import Cv, C, T, pnoise

def _tone(seed, k):
    return np.random.default_rng(seed * 7919 + k).random()

def planks(ramp, seam, seed, variant, vertical=False, pw=16, joints=None, knot=None, nails=None, weather=False):
    cv = Cv(T, T)
    X, Y = (cv.Y, cv.X) if vertical else (cv.X, cv.Y)      # along, across
    row = Y // pw
    joints = joints or {0: [20], 1: [52], 2: [36], 3: [4]}
    grain = pnoise(seed, cells=4, octaves=2)
    grain = np.roll(grain, 0)
    streak = pnoise(seed + 1, cells=16, octaves=1)
    if vertical: streak = streak.T
    t = np.zeros((T, T))
    for r in range(T // pw):
        js = sorted(joints[r % len(joints)])
        # segment index along the row, with wrap: the segment crossing the edge is index 0 in every variant
        along = X
        seg = np.zeros((T, T), int)
        for j in js: seg += (along >= j)
        seg = np.where(seg == len(js), 0, seg)
        m = row == r
        for s in range(len(js) + 1):
            mm = m & (seg == s)
            if not mm.any(): continue
            edge_crossing = (s == 0)
            tone = _tone(seed, r * 10 + s) if edge_crossing else _tone(seed + 100 * variant, r * 10 + s)
            t[mm] = 0.25 + 0.4 * tone
    across_in = Y % pw
    if vertical:
        str_ = pnoise(seed + 3, cells=8, octaves=1)
        lin = np.sin((cv.X % pw) * 0.0 + (cv.Y * 2 * np.pi / 64) * 3 + str_ * 6)
    else:
        lin = np.sin(cv.X * 2 * np.pi / 64 * 3 + pnoise(seed + 3, cells=8, octaves=1) * 6)
    t = t + 0.18 * (grain - 0.5) + 0.12 * lin * (pnoise(seed + 5, cells=4) > 0.4)
    t = np.where(across_in == 1, t + 0.15, t)          # top highlight of each plank
    t = np.where(across_in == pw - 2, t - 0.12, t)
    cv.ramp(np.ones((T, T), bool), ramp, np.clip(t, 0, 1))
    seamm = across_in == pw - 1
    for r in range(T // pw):
        for j in joints[r % len(joints)]:
            jm = (row == r) & (X == j) & ~seamm
            cv.fill(jm, seam)
    cv.fill(seamm, seam)
    # details inside the tile only (variant specific)
    rng = np.random.default_rng(seed * 31 + variant)
    if variant >= 1:
        for _ in range(variant):
            r = rng.integers(0, T // pw); a = rng.integers(10, 50)
            cx, cy = (r * pw + pw // 2, a) if vertical else (a, r * pw + pw // 2)
            kc = knot or ramp[0]
            cv.ell(cx + 0.5, cy + 0.5, 2.5 if not vertical else 1.6, 1.6 if not vertical else 2.5, kc)
            cv.px(cx, cy, seam)
    if nails:
        for r in range(T // pw):
            for j in joints[r % len(joints)]:
                for dj in (-3, 3):
                    a = (j + dj) % T
                    if 3 <= a <= 60:
                        for o in (4, pw - 5):
                            x, y = (r * pw + o, a) if vertical else (a, r * pw + o)
                            cv.px(x, y, nails)
    if weather and variant == 2:
        m = cv.mask_ell(30, 26, 14, 6) & (pnoise(seed + 9, cells=8) > 0.5)
        cv.mix(m & (cv.a[..., 3] > 0), ramp[-2], ramp[-1], 0.35)
    return cv

def tiles_sq(c1, c2, grout, hl, seed, variant, size=32, off=16, speck=None, crack=None):
    cv = Cv(T, T); X, Y = cv.X, cv.Y
    gx = (X - off) % size; gy = (Y - off) % size
    chk = (((X - off) // size) + ((Y - off) // size)) % 2 == 0
    n = pnoise(seed, cells=4)
    t = 0.3 + 0.35 * n + np.where(gy < 3, 0.25, 0) + np.where(gx < 2, 0.15, 0) - np.where(gy > size - 4, 0.2, 0)
    m = np.ones((T, T), bool)
    cv.ramp(m & chk, c1, t); cv.ramp(m & ~chk, c2, t)
    cv.fill((gx == size - 1) | (gy == size - 1), grout)
    cv.fill(((gx == 0) | (gy == 0)) & ~((gx == size - 1) | (gy == size - 1)), hl)
    rng = np.random.default_rng(seed + variant * 13)
    if speck and variant >= 1:
        for _ in range(6 * variant):
            cv.px(int(rng.integers(5, 59)), int(rng.integers(5, 59)), speck)
    if crack and variant == 2:
        x, y = 22, 20
        for i in range(14):
            cv.px(x, y, crack); x += int(rng.integers(0, 2)); y += 1
    return cv

def ashlar(ramp, joint, hl, seed, variant, rh=16, sw=32, offs=(8, 24, 16, 0), cracks=None, glints=None):
    cv = Cv(T, T); X, Y = cv.X, cv.Y
    row = Y // rh; yin = Y % rh
    t = np.zeros((T, T))
    for r in range(T // rh):
        o = offs[r % len(offs)]
        sx = (X - o) % sw; si = ((X - o) // sw) % (T // sw)
        m = row == r
        for s in range(T // sw):
            mm = m & (si == s)
            crosses = (o % sw) != 0 and s == ((0 - o) // sw) % (T // sw)
            tone = _tone(seed, r * 10 + s) if (crosses or variant == 0) else _tone(seed + variant * 77, r * 10 + s)
            t[mm] = 0.25 + 0.4 * tone
        t = np.where(m & (yin <= 1), t + 0.25, t)
        t = np.where(m & (sx <= 1), t + 0.12, t)
        t = np.where(m & (yin >= rh - 3), t - 0.18, t)
        cv.fill(m & (sx == sw - 1), joint)
    t += 0.2 * (pnoise(seed + 2, cells=8) - 0.5)
    cv.ramp(np.ones((T, T), bool) & (cv.a[..., 3] == 0), ramp, np.clip(t, 0, 1))
    cv.fill(yin == rh - 1, joint)
    rng = np.random.default_rng(seed * 5 + variant)
    if cracks and variant >= 1:
        x, y = int(rng.integers(14, 44)), int(rng.integers(8, 30))
        for i in range(10 + 6 * variant):
            if 4 <= x < 60 and 4 <= y < 60: cv.px(x, y, cracks)
            x += int(rng.integers(-1, 2)); y += 1
    if glints and variant == 2:
        for _ in range(5): cv.px(int(rng.integers(6, 58)), int(rng.integers(6, 58)), glints)
    return cv

def carpet(ramp, seed, variant, motif=None):
    cv = Cv(T, T); X, Y = cv.X, cv.Y
    weave = ((X + (Y // 2)) % 4 == 0) * 0.18 - ((Y % 2) == 1) * 0.08
    t = 0.45 + weave + 0.22 * (pnoise(seed, cells=8) - 0.5)
    cv.ramp(np.ones((T, T), bool), ramp, t)
    if motif is not None and variant >= 1:
        cx, cy = 32, 32
        d = np.abs(X + 0.5 - cx) + np.abs(Y + 0.5 - cy)
        cv.fill((d >= 7) & (d < 9), motif)
        if variant == 2: cv.fill(d < 3, motif)
    return cv

def metal(seed, variant, base=None, dark=None, hl=None):
    base = base or [C['slate'], C['greyv'], C['grey']]; dark = dark or C['char']; hl = hl or C['grey2']
    cv = Cv(T, T); X, Y = cv.X, cv.Y
    t = 0.45 + 0.15 * (pnoise(seed, cells=4) - 0.5)
    cv.ramp(np.ones((T, T), bool), base, t)
    tread = (((X + Y) % 8 == 0) & ((X // 4 + Y // 4) % 2 == 0)) | (((X - Y) % 8 == 4) & ((X // 4 + Y // 4) % 2 == 1))
    cv.fill(tread, hl)
    gx = (X - 16) % 32; gy = (Y - 16) % 32
    cv.fill((gx == 31) | (gy == 31), dark)
    for rx in (12, 44):
        for ry in (12, 44):
            pass
    if variant == 1:
        for (rx, ry) in ((13, 13), (50, 13), (13, 50), (50, 50)):
            cv.px(rx, ry, hl); cv.px(rx + 1, ry + 1, dark)
    if variant == 2:   # grate
        cv.rect(18, 20, 46, 44, dark)
        for yy in range(22, 42, 4): cv.rect(20, yy, 44, yy + 2, C['ink'])
        cv.frame(17, 19, 47, 45, hl)
    return cv

def noise_floor(ramp, seed, variant, cells=8, flecks=None, extra=None):
    cv = Cv(T, T)
    t = 0.2 + 0.6 * pnoise(seed, cells=cells, octaves=3)
    cv.ramp(np.ones((T, T), bool), ramp, t)
    rng = np.random.default_rng(seed + variant)
    if flecks:
        for _ in range(4 + 4 * variant):
            cv.px(int(rng.integers(4, 60)), int(rng.integers(4, 60)), flecks)
    if extra: extra(cv, variant, rng)
    return cv

def marble(seed, variant, base=None, vein=None, inlay=None):
    base = base or [C['grey3'], C['cream'], C['paper']]; vein = vein or C['grey2']
    cv = Cv(T, T)
    n = pnoise(seed, cells=4, octaves=3)
    cv.ramp(np.ones((T, T), bool), base, 0.35 + 0.6 * n)
    v = np.abs(np.sin(n * 18.0))
    cv.fill(v < 0.07, vein)
    if inlay and variant >= 1:
        d = np.abs(cv.X + 0.5 - 32) + np.abs(cv.Y + 0.5 - 32)
        cv.fill((d >= 9) & (d < 11), inlay)
        if variant == 2: cv.fill(d < 4, inlay)
    return cv

# ---------------- walls ----------------
# A wall is three rows high (like the core kit): top = ceiling band, upper = wall with optional window, face = wainscot.
def wall_set(st, seed):
    out = {}
    # top
    cv = Cv(T, T)
    cv.ramp(np.ones((T, T), bool), [st['ceil'][0], st['ceil'][1]], 0.15 + 0.25 * pnoise(seed, cells=4))
    cv.rect(0, 52, T, 58, st['trim'][1]); cv.rect(0, 58, T, 62, st['trim'][0]); cv.rect(0, 62, T, 64, C['ink'])
    cv.hline(0, T, 52, st['trim'][2])
    out['top'] = cv
    def paper(cv, y0, y1):
        m = cv.mask_rect(0, y0, T, y1)
        pat = st['paper']
        X, Y = cv.X, cv.Y
        if pat == 'stripe':
            s = ((X % 16) < 8)
            cv.ramp(m & s, st['wall'], 0.55 + 0.1 * (pnoise(seed + 1) - 0.5)); cv.ramp(m & ~s, st['wall'], 0.35 + 0.1 * (pnoise(seed + 1) - 0.5))
        elif pat == 'dots':
            cv.ramp(m, st['wall'], 0.5 + 0.12 * (pnoise(seed + 1) - 0.5))
            d = ((X % 16 == 8) & (Y % 16 == 8)) | ((X % 16 == 0) & (Y % 16 == 0))
            cv.fill(m & d, st['accent'])
        elif pat == 'planks':
            cv.ramp(m, st['wall'], 0.45 + 0.25 * (pnoise(seed + 1, cells=2) - 0.5) + 0.15 * ((X % 16) == 1))
            cv.fill(m & (X % 16 == 15), st['trim'][0])
        elif pat == 'brick':
            yin = Y % 12; off = ((Y // 12) % 2) * 12
            jj = ((X + off) % 24 == 23) | (yin == 11)
            cv.ramp(m, st['wall'], 0.4 + 0.35 * (pnoise(seed + 1, cells=8) - 0.5) + 0.2 * (yin == 0))
            cv.fill(m & jj, st['trim'][0])
        elif pat == 'panel':
            cv.ramp(m, st['wall'], 0.5 + 0.1 * (pnoise(seed + 1) - 0.5))
            cv.fill(m & ((X % 32) == 15), st['trim'][0]); cv.fill(m & ((X % 32) == 16), st['wall'][-1])
            cv.fill(m & (Y == y0 + 20), st['accent'])
        elif pat == 'marble':
            n = pnoise(seed + 1, cells=4, octaves=3)
            cv.ramp(m, st['wall'], 0.35 + 0.55 * n); cv.fill(m & (np.abs(np.sin(n * 16)) < 0.06), C['grey2'])
        elif pat == 'diamond':
            cv.ramp(m, st['wall'], 0.5 + 0.1 * (pnoise(seed + 1) - 0.5))
            d = (np.abs((X % 16) - 8) + np.abs((Y % 16) - 8)) == 7
            cv.fill(m & d, st['accent'])
        elif pat == 'tile':
            cv.ramp(m, st['wall'], 0.55 + 0.1 * (pnoise(seed + 1) - 0.5))
            cv.fill(m & (((X - 8) % 16 == 15) | ((Y - 4) % 16 == 15)), st['accent'])
    # upper
    for kind in ('upper', 'upper_win'):
        cv = Cv(T, T); paper(cv, 0, T)
        cv.rect(0, 0, T, 3, st['trim'][0]); cv.hline(0, T, 3, C['ink'])      # cornice shadow under ceiling band
        cv.mix(cv.mask_rect(0, 4, T, 8), st['wall'][0], st['wall'][1], 0.5)
        if kind == 'upper_win': window(cv, st['window'], st)
        out[kind] = cv
    # face (wainscot)
    cv = Cv(T, T); paper(cv, 0, 22)
    cv.rect(0, 22, T, 26, st['trim'][1]); cv.hline(0, T, 22, st['trim'][2]); cv.hline(0, T, 26, st['trim'][0])
    wm = cv.mask_rect(0, 27, T, 56)
    cv.ramp(wm, st['wains'], 0.5 + 0.2 * (pnoise(seed + 4, cells=2) - 0.5))
    X = cv.X
    pan = (X - 16) % 32
    cv.fill(wm & (cv.Y >= 31) & (cv.Y < 52) & ((pan == 3)), st['wains'][-1])
    cv.fill(wm & (cv.Y >= 31) & (cv.Y < 52) & ((pan == 28)), st['wains'][0])
    cv.fill(cv.mask_rect(0, 31, T, 32) & ((pan >= 3) & (pan <= 28)), st['wains'][-1])
    cv.fill(cv.mask_rect(0, 51, T, 52) & ((pan >= 3) & (pan <= 28)), st['wains'][0])
    cv.rect(0, 56, T, 62, st['trim'][0]); cv.hline(0, T, 56, st['trim'][2]); cv.rect(0, 62, T, 64, C['ink'])
    out['face'] = cv
    return out

def window(cv, kind, st):
    fr, fr2 = st['frame']
    sky1, sky2 = C['sky'], C['lsky']
    if kind == 'square':
        cv.rect(15, 14, 49, 52, fr); cv.rect(17, 16, 47, 50, fr2)
        cv.vgrad(19, 18, 45, 48, sky2, sky1)
        cv.rect(31, 18, 33, 48, fr2); cv.rect(19, 32, 45, 34, fr2)
        cv.line(21, 26, 27, 20, C['ice']); cv.line(35, 30, 41, 24, C['ice'])
        cv.rect(13, 52, 51, 56, fr); cv.hline(13, 51, 52, fr2)
    elif kind == 'porthole':
        cv.ell(32, 32, 19, 19, fr); cv.ell(32, 32, 16, 16, fr2); m = cv.mask_ell(32, 32, 13, 13)
        cv.vgrad(19, 19, 45, 45, sky2, sky1, mask=m)
        cv.line(24, 32, 32, 24, C['ice']); cv.line(28, 36, 36, 28, C['ice'])
        for a in range(8):
            ang = a * np.pi / 4; cv.px(int(32 + 17.5 * np.cos(ang)), int(32 + 17.5 * np.sin(ang)), C['grey3'])
    elif kind == 'arched':
        m = cv.mask_ell(32, 26, 16, 14) | cv.mask_rect(16, 26, 48, 56)
        cv.fill(m, fr)
        m2 = cv.mask_ell(32, 26, 13, 11) | cv.mask_rect(19, 26, 45, 53)
        cv.vgrad(19, 15, 45, 53, sky2, sky1, mask=m2)
        cv.rect(31, 15, 33, 53, fr2); cv.rect(19, 34, 45, 36, fr2)
        cv.line(22, 44, 28, 38, C['ice']); cv.line(36, 30, 41, 25, C['ice'])
        cv.rect(14, 53, 50, 57, fr2)
    elif kind == 'slit':
        for x0 in (18, 38):
            cv.rect(x0 - 2, 12, x0 + 10, 54, fr); cv.vgrad(x0, 14, x0 + 8, 52, C['amber'], C['burnt'])
            cv.hline(x0, x0 + 8, 30, fr2)
    elif kind == 'ribbon':
        cv.rect(0, 16, T, 46, fr); cv.vgrad(0, 18, T, 44, C['lsky'], C['blue3'])
        cv.fill(cv.mask_rect(0, 18, T, 44) & ((cv.X % 32) == 8), fr2)
        cv.line(12, 40, 30, 22, C['ice']); cv.line(44, 40, 60, 24, C['ice'])
        cv.rect(0, 44, T, 46, fr2)
    elif kind == 'lattice':
        cv.rect(14, 12, 50, 54, fr); cv.vgrad(17, 15, 47, 51, sky2, sky1)
        g = cv.mask_rect(17, 15, 47, 51) & ((((cv.X - 17) % 10) == 9) | (((cv.Y - 15) % 12) == 11))
        cv.fill(g, fr2)
        cv.rect(12, 52, 52, 56, fr2)
