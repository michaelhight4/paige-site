#!/usr/bin/env python3
"""Kilumen: chibi player RUN (6f) and BIKE (stand + 4f) overworld sprites, 64x96 native.

Reproducible: python3 gen_run_bike.py [character]   (default: cal)
Derives head / torso / coat / satchel / front-view legs+boots from the character's existing
chibi WALK stand frames (pixel_pilot/overworld/<char>_chibi/), so the character stays on-model.
Side-view legs, swinging arms and the bike are drawn in code using only the character's own
colour ramps and the shared 64-colour Kilumen palette. Every output pixel is snapped to
palette.png; alpha is binary.
"""
import os, sys, json, math
import numpy as np
from PIL import Image

KIL = '/workspace/kilumen'
PAL_HEX = f'{KIL}/art/world/overworld/palette.hex'
W, H = 64, 96
GROUND = 93            # last opaque row of the feet / tyres (2 px pad, same as walk)
DIRS = ['down', 'left', 'right', 'up']   # sheet row order, same as walk sheet
SCALES = [2, 3]

PAL = np.array([[int(h[i:i+2], 16) for i in (0, 2, 4)] for h in open(PAL_HEX).read().split()])
def hx(h): return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)] + [255], 'uint8')
C = {k: hx(v) for k, v in dict(
    out='191210', ink='2c1a12', char='2c2320', brn='462c22', brn2='6a442e', coat='87604d', coat2='92623e',
    skin='e8ce92', skin2='ccaa6e', tdark='246e6c', teal='3e9c92', tlite='70cab8', vio='603096', vio2='b076ec',
    tyre='29252b', tyre2='3e3a48', rim='827a84', rim2='a8a0a4', steel='5e5866', lamp='fcd668', lamp2='e29d40',
    red='a23432', cream='f8eabe').items()}

def snap(a):
    a = a.copy(); m = a[..., 3] > 0
    px = a[m][:, :3].astype(int)
    d = ((px[:, None, :] - PAL[None]) ** 2).sum(-1)
    a[m, :3] = PAL[d.argmin(1)]; a[..., 3] = np.where(m, 255, 0); return a
def blank(): return np.zeros((H, W, 4), 'uint8')
def over(dst, src):
    m = src[..., 3] > 0; dst[m] = src[m]; return dst
def darken(a, k=0.78):
    a = a.copy(); a[..., :3] = (a[..., :3] * k).astype('uint8'); return snap(a)
def hflip(a): return a[:, ::-1].copy()

# ---------- raster primitives (all hard pixels) ----------
YY, XX = np.mgrid[0:H, 0:W]
def capsule(p0, p1, r):
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0; L = dx * dx + dy * dy or 1e-9
    t = np.clip(((XX - x0) * dx + (YY - y0) * dy) / L, 0, 1)
    return (XX - (x0 + t * dx)) ** 2 + (YY - (y0 + t * dy)) ** 2 <= r * r
def disc(c, r): return (XX - c[0]) ** 2 + (YY - c[1]) ** 2 <= r * r
def ring(c, r0, r1):
    d = (XX - c[0]) ** 2 + (YY - c[1]) ** 2; return (d <= r1 * r1) & (d > r0 * r0)
def rect(x0, y0, x1, y1): return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)
def nb(m, dx, dy):
    o = np.zeros_like(m); ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
    xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
    o[yd, xd] = m[ys, xs]; return o          # o[y,x] = m[y+dy, x+dx]
def shaded(mask, dark, mid, light, lightdir=(0, -1)):
    """3-tone fill: light on edges facing lightdir, dark on the opposite edges."""
    L = blank(); L[mask] = mid
    lit = mask & ~nb(mask, *lightdir); L[lit] = light
    sh = mask & ~nb(mask, -lightdir[0], -lightdir[1]); L[sh & ~lit] = dark
    return L
def outlined(L, col=None):
    col = C['out'] if col is None else col
    m = L[..., 3] > 0
    ring_ = (nb(m, 1, 0) | nb(m, -1, 0) | nb(m, 0, 1) | nb(m, 0, -1)) & ~m
    O = L.copy(); O[ring_] = col; return O

# ---------- source (walk) ----------
def load_walk(char):
    d = f'{KIL}/art/characters/pixel/humans/{char}/overworld/{char}_chibi'          # official-palette walk
    if not os.path.isdir(d): d = f'{KIL}/art/characters/pixel_pilot/overworld/{char}_chibi'   # pilot fallback
    st = {k: np.array(Image.open(f'{d}/{char}_chibi_{k}_stand.png').convert('RGBA')) for k in DIRS}
    return d, st

# ---------- per-character profile (everything character-specific lives here) ----------
PROFILES = {
    # hem = last coat row in the side/front walk frames (legs start below it)
    'cal':  dict(hem=75, hand_src=['e8ce92'], hand_rows=(54, 62), legs=('2c1a12', '2c2320', '462c22'),
                 boot_h=3, hand=('e8ce92', 'ccaa6e'), leg_scale=1.0),
    # Mira: short coat, dark leggings, knee-high boots, dark gloves
    'mira': dict(hem=69, hand_src=['29252b', 'e8ce92', 'ccaa6e'], hand_edge=['2c2320', '191210'], fill_exclude=['2c1a12'], hand_rows=(52, 64), legs=('2c1a12', '29252b', '3e3a48'),
                 boot_h=10, hand=('3e3a48', '29252b'), leg_scale=24 / 18),
}
HEM = 75
P = PROFILES['cal']
HAND_SKIN = ('e8ce92', 'ccaa6e')
def set_profile(char, st):
    global HEM, P, TROUS, SIDE_GEO, HAND
    P = PROFILES[char]; HEM = P['hem']
    TROUS = tuple(hx(h) for h in P['legs']); HAND = tuple(hx(h) for h in P['hand'])
    # side hip / shoulder x: Cal's tuned values, offset by the coat centroid difference vs Cal
    ref = load_walk('cal')[1]
    SIDE_GEO = {}
    for d, g in SIDE_GEO_CAL.items():
        cx = lambda a: np.where(a[45:66, :, 3] > 0)[1].mean()
        o = int(round(cx(st[d]) - cx(ref[d])))
        SIDE_GEO[d] = dict(hip=g['hip'] + o, sh=g['sh'] + o)

def remove_side_hand(a):
    """the static hanging hand in side views is repainted with surrounding coat so a swinging arm can be drawn"""
    a = a.copy(); y0, y1 = P['hand_rows']
    srcs = [tuple(hx(h)[:3]) for h in P['hand_src']]
    def ishand(p): return tuple(p[:3]) in srcs
    sk = np.zeros((H, W), bool)
    for c in srcs: sk |= (a[..., 0] == c[0]) & (a[..., 1] == c[1]) & (a[..., 2] == c[2])
    sk &= (YY >= y0) & (YY <= y1)
    # grow by 1 px over the hand's own shadow/ink tones (not the silhouette outline)
    for c in [tuple(hx(h)[:3]) for h in P.get('hand_edge', [])]:
        grow = (nb(sk, 1, 0) | nb(sk, -1, 0) | nb(sk, 0, 1) | nb(sk, 0, -1)) & ~sk
        sk |= grow & (a[..., 0] == c[0]) & (a[..., 1] == c[1]) & (a[..., 2] == c[2])
    srcs_all = srcs + [tuple(hx(h)[:3]) for h in P.get('hand_edge', [])]
    def ishand(p): return tuple(p[:3]) in srcs_all
    excl = [(0x19, 0x12, 0x10)] + [tuple(hx(h)[:3]) for h in P.get('fill_exclude', [])]
    for y, x in zip(*np.where(sk)):
        best = None
        for r in (1, 2, 3):
            win = a[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].reshape(-1, 4)
            win = [tuple(p) for p in win if p[3] and not ishand(p) and tuple(p[:3]) not in excl]
            if win: best = max(set(win), key=win.count); break
        if best: a[y, x] = best
    return a

def shift_rows(a, y0, y1, dx=0, dy=0):
    """move the opaque pixels in rows y0..y1 by (dx,dy); vacated pixels become transparent"""
    out = a.copy(); out[y0:y1 + 1] = 0
    seg = a[y0:y1 + 1]
    for i in range(seg.shape[0]):
        ty = y0 + i + dy
        if 0 <= ty < H:
            row = np.zeros_like(seg[i])
            if dx >= 0: row[dx:] = seg[i][:W - dx] if dx else seg[i]
            else: row[:dx] = seg[i][-dx:]
            m = row[:, 3] > 0; out[ty][m] = row[m]
    # rows vacated inside the block keep their original pixels (no see-through seams)
    vac = range(y1 + dy + 1, y1 + 1) if dy < 0 else range(y0, y0 + dy)
    for y in vac:
        m = (out[y][:, 3] == 0) & (a[y][:, 3] > 0); out[y][m] = a[y][m]
    return out
def shear(a, y0, y1, lean, f):
    """forward lean: top row shifts lean px toward facing f, bottom row 0"""
    out = a.copy()
    for y in range(y0, y1 + 1):
        dx = int(round(lean * (y1 - y) / max(1, (y1 - y0)))) * f
        if dx:
            row = np.zeros_like(a[y])
            if dx > 0: row[dx:] = a[y][:-dx]
            else: row[:dx] = a[y][-dx:]
            out[y] = row
    return out
def bodyshift(a, dy):
    out = blank()
    if dy >= 0: out[dy:] = a[:H - dy]
    else: out[:H + dy] = a[-dy:]
    return out

# ---------- limbs ----------
TROUS = (C['ink'], C['char'], C['brn'])           # dark, mid, light (from the walk legs)
BOOT = (C['ink'], C['brn'], C['brn2'])
SLEEVE = (C['brn2'], C['coat'], C['coat2'])
SLEEVE_FAR = (C['brn'], C['brn2'], C['coat'])

def side_leg(hip, knee, ankle, f, far=False):
    """profile leg: trousers thigh+shin, boot with toe toward facing f. ankle = boot ankle point"""
    tr = TROUS; bt = BOOT
    m_tr = capsule(hip, knee, 3.0) | capsule(knee, (ankle[0], ankle[1] - 2), 2.6)
    L = shaded(m_tr, *tr, lightdir=(f, -1))
    ax, ay = ankle
    bh = P['boot_h']
    boot = capsule((ax, ay - bh), (ax, ay), 2.8)
    x_heel, x_toe = (ax - 3, ax + 6) if f > 0 else (ax - 6, ax + 3)
    boot |= rect(x_heel, ay, x_toe, ay + 2)
    # rounded toe
    boot &= ~(rect(x_toe, ay, x_toe, ay) )
    B = shaded(boot, *bt, lightdir=(f, -1))
    sole = boot & ~nb(boot, 0, 1)
    B[sole] = C['char']
    cuff = rect(ax - 3, ay - bh - 1, ax + 3, ay - bh - 1) & boot
    B[cuff] = C['brn2']
    over(L, B)
    L = outlined(L)
    return darken(L) if far else L

def arm(shoulder, s, f, far=False):
    """swinging sleeve + hand. s in [-1,1]: +1 fully forward"""
    th = s * math.radians(50)
    ex = shoulder[0] + f * 7 * math.sin(th); ey = shoulder[1] + 7 * math.cos(th)
    ph = th + math.radians(35 + 55 * max(s, 0))
    hxp = ex + f * 6 * math.sin(ph); hyp = ey + 6 * math.cos(ph)
    m = capsule(shoulder, (ex, ey), 2.4) | capsule((ex, ey), (hxp, hyp), 2.0)
    L = shaded(m, *(SLEEVE_FAR if far else SLEEVE), lightdir=(f, -1))
    hm = disc((hxp + f * 0.8 * math.sin(ph), hyp + 0.8 * math.cos(ph)), 1.6)
    L[hm] = HAND[0]; L[hm & ~nb(hm, 0, 1)] = HAND[1]
    L = outlined(L)
    return darken(L) if far else L

# ---------- RUN ----------
RUN_N = 6
RUN_BOB = [0, 1, -2, 0, 1, -2]        # contact, down(absorb), flight; x2 steps
#  leg phases relative to hip (dx forward, dy down): knee, ankle ; grounded flag
LEG_PH = [((3, 7), (5, 15), True),    # contact, foot ahead
          ((3, 7), (0, 15), True),    # down, foot under hip (moved back = no slide direction)
          ((1, 7), (-5, 13), False),  # toe-off behind
          ((-1, 6), (-7, 9), False),  # heel kick
          ((4, 5), (1, 10), False),   # knee drive
          ((6, 4), (6, 12), False)]   # reach
LEG_SWING = [1, 0.3, -0.6, -1, -0.3, 0.6]   # how far forward the foot is (for arm counter-swing)
SIDE_GEO_CAL = {'right': dict(hip=31, sh=30), 'left': dict(hip=32, sh=33)}
SIDE_GEO = dict(SIDE_GEO_CAL)
HAND = tuple(hx(h) for h in HAND_SKIN)

def run_side(st, d):
    f = 1 if d == 'right' else -1
    g = SIDE_GEO[d]
    base = remove_side_hand(st[d]); upper = base.copy(); upper[HEM + 1:] = 0
    frames = []
    for i in range(RUN_N):
        bob = RUN_BOB[i]; prev = RUN_BOB[i - 1]
        U = shear(upper, 4, HEM, 3, f)                       # lean forward
        flut = [1, 1, 2, 1, 1, 2][i]
        U = shift_rows(U, HEM - 9, HEM - 5, dx=-f * (flut // 2))   # coat tail trails
        U = shift_rows(U, HEM - 4, HEM, dx=-f * flut)
        lag = int(np.clip(prev - bob, -1, 1))                 # hair lags the body
        U = shift_rows(U, 0, 13, dy=lag, dx=-f * (1 if bob < 0 else 0))
        U = bodyshift(U, bob)
        hip = (g['hip'] + f * 1, HEM + bob)
        fr = blank()
        sh = (g['sh'] + f * 2, 41 + bob)
        fr = over(fr, arm(sh, LEG_SWING[i] * 1.0, f, far=True))      # far arm moves with near leg
        for leg, ph in (('far', (i + 3) % 6), ('near', i)):
            (kx, ky), (ax, ay), grounded = LEG_PH[ph]
            ls = P['leg_scale']; kx, ky, ax, ay = kx * ls, ky * ls, ax * ls, ay * ls
            ank_y = GROUND - 3 if grounded else hip[1] + ay
            knee = (hip[0] + f * kx, hip[1] + ky)
            ank = (hip[0] + f * ax, ank_y)
            fr = over(fr, side_leg(hip, knee, ank, f, far=(leg == 'far')))
        fr = over(fr, U)
        fr = over(fr, arm(sh, -LEG_SWING[i], f))              # near arm counter-swings near leg
        frames.append(snap(fr))
    return frames

def run_front(st, d):
    a = st[d]
    upper = a.copy(); upper[HEM + 1:] = 0
    legs = a.copy(); legs[:HEM + 1] = 0
    for y in range(HEM - 4, HEM + 1): legs[y] = legs[HEM + 1]   # leg tops continue under the hem
    cx = 32
    # viewer-left / viewer-right leg lift per frame (front: lifted knee comes toward camera)
    liftL = [0, 0, 3, 5, 6, 2]; liftR = [5, 6, 2, 0, 0, 3]
    frames = []
    for i in range(RUN_N):
        bob = RUN_BOB[i]; prev = RUN_BOB[i - 1]
        U = shift_rows(upper, 0, 33, dy=1)                     # head dips: forward lean
        U[34] = np.where(U[34][:, 3:4] > 0, U[34], upper[34])
        # arms: hand + sleeve cuffs swing (forward arm rises), opposite to the legs
        armL = -3 if liftR[i] >= 5 else (1 if liftL[i] >= 5 else 0)
        armR = -3 if liftL[i] >= 5 else (1 if liftR[i] >= 5 else 0)
        for (x0, x1, dy) in ((0, 19, armL), (45, 63, armR)):
            if dy:
                seg = U[44:70, x0:x1 + 1].copy(); keep = U.copy()
                U[44:70, x0:x1 + 1] = 0
                tgt = U[44 + dy:70 + dy, x0:x1 + 1]; m = seg[..., 3] > 0; tgt[m] = seg[m]
                if dy < 0:   # refill vacated rows below the raised hand from the coat underneath
                    for y in range(70 + dy, 70):
                        row = U[y, x0:x1 + 1]; src = keep[70, x0:x1 + 1]
                        fill = (row[:, 3] == 0) & (src[:, 3] > 0); row[fill] = src[fill]
                else:        # lowered: stretch the shoulder row down
                    for y in range(44, 44 + dy):
                        U[y, x0:x1 + 1] = np.where(U[y, x0:x1 + 1][:, 3:4] > 0, U[y, x0:x1 + 1], keep[44, x0:x1 + 1])
        lag = int(np.clip(prev - bob, -1, 1))
        U = shift_rows(U, 0, 12, dy=lag)                       # hair bounce
        hem = [0, 1, 0, 0, 1, 0][i] if bob >= 0 else 0
        U = shift_rows(U, HEM - 3, HEM, dy=hem + (1 if bob < 0 else 0))   # coat hem flaps (lags on the way up)
        U = bodyshift(U, bob)
        fr = blank()
        for side, lift in (('L', liftL[i]), ('R', liftR[i])):
            Lg = legs.copy()
            if side == 'L': Lg[:, cx:] = 0
            else: Lg[:, :cx] = 0
            Lg = bodyshift(Lg, -lift) if lift else Lg
            fr = over(fr, Lg)
        fr = over(fr, U)
        frames.append(snap(fr))
    return frames

# ---------- BIKE ----------
BIKE_N = 4
R_WHEEL = 10                  # outer tyre radius -> ~21 px wheel, ~1 tile circumference
CRANK = 4
SEAT_Y = 66                   # saddle top row; also the seat anchor for future mounts

def wheel_side(c, phase):
    L = blank()
    L[ring(c, R_WHEEL - 2.6, R_WHEEL + 0.4)] = C['tyre']
    L[ring(c, R_WHEEL - 1.6, R_WHEEL - 0.6) & (YY < c[1] - 2)] = C['tyre2']   # tyre top highlight
    L[ring(c, R_WHEEL - 3.6, R_WHEEL - 2.6)] = C['rim']
    L[ring(c, R_WHEEL - 3.6, R_WHEEL - 2.6) & (YY < c[1]) & (XX > c[0] - 6)] = C['rim2']
    for k in range(4):
        a = phase + k * math.pi / 2
        p = (c[0] + (R_WHEEL - 3.2) * math.cos(a), c[1] + (R_WHEEL - 3.2) * math.sin(a))
        L[capsule(c, p, 0.55)] = C['rim2'] if k % 2 == 0 else C['rim']
    L[disc(c, 1.6)] = C['teal']; L[disc(c, 0.6)] = C['tlite']
    m = L[..., 3] > 0
    o = (nb(m, 1, 0) | nb(m, -1, 0) | nb(m, 0, 1) | nb(m, 0, -1)) & ~m & ~disc(c, R_WHEEL - 3.5)
    L[o] = C['out']
    return L

def bike_side_layers(k):
    """right-facing bike. returns (back layer, front layer, geometry)"""
    rear, front = (15, GROUND - R_WHEEL), (49, GROUND - R_WHEEL)
    bb = (30, 82); seat = (24, SEAT_Y); head = (44, 67); bar = (42, 60)
    ph = math.radians(22.5 * k)                       # clockwise on screen = forward for right-facing
    back = blank(); over(back, wheel_side(rear, ph)); over(back, wheel_side(front, ph + 0.4))
    # frame tubes (teal), 3-tone, outlined
    fm = (capsule(bb, (seat[0] + 1, seat[1] + 2), 1.4) | capsule((seat[0] + 1, seat[1] + 3), head, 1.3) |
          capsule(bb, (head[0], head[1] + 3), 1.6) | capsule(bb, rear, 1.0) | capsule((seat[0] + 1, seat[1] + 3), rear, 1.0) |
          capsule(head, front, 1.2) | capsule(head, bar, 1.1))
    F = shaded(fm, C['tdark'], C['teal'], C['tlite'])
    # mudguards (teal arcs) over upper back of wheels
    for c, a0, a1 in ((rear, 180, 300), (front, 220, 340)):
        g = ring(c, R_WHEEL + 0.5, R_WHEEL + 2.0)
        ang = (np.degrees(np.arctan2(YY - c[1], XX - c[0])) + 360) % 360
        F[g & (ang >= a0) & (ang <= a1)] = C['tdark']
        F[ring(c, R_WHEEL + 1.2, R_WHEEL + 2.0) & (ang >= a0) & (ang <= a1)] = C['teal']
    # violet dominance-crystal badge on the head tube + headlamp
    F[rect(head[0] + 1, head[1] + 1, head[0] + 2, head[1] + 3)] = C['vio']; F[rect(head[0] + 1, head[1] + 1, head[0] + 1, head[1] + 1)] = C['vio2']
    F[rect(head[0] + 3, head[1] - 2, head[0] + 4, head[1] - 1)] = C['lamp']; F[rect(head[0] + 3, head[1], head[0] + 4, head[1])] = C['lamp2']
    # saddle
    sm = rect(seat[0] - 4, seat[1], seat[0] + 3, seat[1] + 1) | rect(seat[0] - 3, seat[1] - 1, seat[0] + 2, seat[1] - 1)
    F[sm] = C['char']; F[rect(seat[0] - 3, seat[1] - 1, seat[0] + 1, seat[1] - 1)] = C['steel']
    # handlebar grip (rider side)
    F[rect(bar[0] - 3, bar[1] - 1, bar[0], bar[1])] = C['char']
    # chainring
    F[ring(bb, 1.5, 3.0)] = C['steel']; F[disc(bb, 1.4)] = C['rim2']
    F = outlined(F)
    over(back, F)
    geo = dict(rear=rear, front=front, bb=bb, seat=seat, head=head, bar=bar)
    return back, geo

def pedal_pos(bb, ang):
    return (bb[0] + CRANK * math.cos(ang), bb[1] + CRANK * math.sin(ang))

def ik(hip, foot, l1, l2, f):
    dx, dy = foot[0] - hip[0], foot[1] - hip[1]; d = min(math.hypot(dx, dy), l1 + l2 - 0.01)
    a = math.atan2(dy, dx); c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    b = math.acos(max(-1, min(1, c)))
    ang = a - b * f        # knee forward (toward facing)
    return (hip[0] + l1 * math.cos(ang), hip[1] + l1 * math.sin(ang))

def bike_rider_upper(st, d, keep_to=64, hem_rows=None):
    """seated upper body: walk rows 0..keep_to, then the coat hem rows directly under (skirt folds over the saddle)"""
    a = st[d]
    U = blank(); U[:keep_to + 1] = a[:keep_to + 1]
    h0, h1 = hem_rows or (HEM - 3, HEM)
    for i, y in enumerate(range(h0, h1 + 1)):
        row = a[y]; m = row[:, 3] > 0
        U[keep_to + 1 + i][m] = row[m]
    return U

def bike_side(st, d):
    f = 1 if d == 'right' else -1
    frames = []
    src = {k: (remove_side_hand(v) if k == d else v) for k, v in st.items()}
    upper0 = bike_rider_upper(src, d)
    for k in range(BIKE_N):
        back, geo = bike_side_layers(k)
        crank = math.radians(-90 + 90 * k)
        U = upper0.copy()
        # rider sits further back than standing: shift so the hip lands on the saddle
        hipx_src = SIDE_GEO['right']['hip']
        U = shift_rows(U, 0, H - 1, dx=(geo['seat'][0] + 2) - hipx_src if f > 0 else 0)
        if f < 0:
            # build in right-facing space then mirror: for the left view use the mirrored left sprite
            pass
        U = shear(U, 4, 68, 4, 1)
        U = shift_rows(U, 0, 13, dx=-1 - (k % 2))             # hair streams back in the wind
        U = shift_rows(U, 66, 70, dx=-1 - ((k + 1) % 2))      # coat tail flutters
        bob = [0, 1, 0, 1][k]
        U = bodyshift(U, bob)
        fr = blank()
        hip = (geo['seat'][0] + 1, SEAT_Y - 1 + bob)
        p_near = pedal_pos(geo['bb'], crank); p_far = pedal_pos(geo['bb'], crank + math.pi)
        # far leg + far arm behind the bike
        for p, far in ((p_far, True),):
            ank = (p[0] - 1, p[1] - 2)
            kn = ik(hip, ank, 8, 9, 1)
            fr = over(fr, side_leg(hip, kn, (round(ank[0]), round(ank[1])), 1, far=True))
        fr = over(fr, back)
        # pedals
        for p, col in ((p_far, C['steel']), (p_near, C['rim2'])):
            pm = rect(round(p[0]) - 2, round(p[1]), round(p[0]) + 2, round(p[1]))
            fr[pm] = col
        fr = over(fr, U)
        ank = (p_near[0] - 1, p_near[1] - 2)
        kn = ik(hip, ank, 8, 9, 1)
        fr = over(fr, side_leg(hip, kn, (round(ank[0]), round(ank[1])), 1))
        # near arm to the grip
        sh = (geo['seat'][0] + 2 + 4 + 0, 41 + bob)
        grip = (geo['bar'][0] - 2, geo['bar'][1])
        el = ik(sh, grip, 7, 7, -1)
        m = capsule(sh, el, 2.4) | capsule(el, grip, 2.0)
        A = shaded(m, *SLEEVE, lightdir=(1, -1)); hm = disc((grip[0] + 0.5, grip[1]), 1.6)
        A[hm] = HAND[0]; A[hm & ~nb(hm, 0, 1)] = HAND[1]
        fr = over(fr, outlined(A))
        frames.append(snap(fr))
    return frames

def bike_side_dir(st, d):
    """left view = mirrored right-space build, using the LEFT walk sprite mirrored into right space"""
    if d == 'right': return bike_side(st, 'right')
    st2 = dict(st); st2['right'] = hflip(st['left'])
    return [hflip(fr) for fr in bike_side(st2, 'right')]

def bike_front(st, d):
    """down: front wheel toward camera; up: rear wheel toward camera"""
    a = st[d]
    U0 = bike_rider_upper(st, d)
    # leg & boot templates from the walk frame (viewer-left / viewer-right)
    boots = {}
    for side, (x0, x1) in (('L', (14, 31)), ('R', (32, 50))):
        b = blank(); b[83:94, x0:x1 + 1] = a[83:94, x0:x1 + 1]; boots[side] = b
    frames = []
    for k in range(BIKE_N):
        crank = math.radians(-90 + 90 * k)
        bob = [0, 1, 0, 1][k]
        U = shift_rows(U0, 0, 12, dy=(1 if bob == 0 else 0) - (0))   # hair bounce
        U = shift_rows(U, 65, 68, dy=[0, 1, 0, 1][(k + 1) % 4])      # hem flap (seated hem rows)
        U = bodyshift(U, bob)
        fr = blank()
        # crank in front view: pedals move up/down (+ slight in/out)
        pyL = 84 + CRANK * math.sin(crank); pyR = 84 - CRANK * math.sin(crank)
        for side, py, hipx in (('L', pyL, 26), ('R', pyR, 38)):
            lift = int(round(84 - py))
            hip = (hipx, 70 + bob); knee = (hipx + (-1 if side == 'L' else 1) * (1 if lift > 0 else 0), 70 + bob + 6 - max(0, lift))
            ankle = (hipx, int(round(py)) - 3)
            m = capsule(hip, knee, 2.8) | capsule(knee, ankle, 2.6)
            ankle = ankle
            Lg = outlined(shaded(m, *TROUS, lightdir=(-1 if side == 'L' else 1, -1)))
            fr = over(fr, Lg)
            bt = bodyshift(boots[side], int(round(py)) + 4 - GROUND)
            fr = over(fr, bt)
            # pedal
            pxp = hipx; fr[rect(pxp - 3, int(round(py)) + 4, pxp + 3, int(round(py)) + 4)] = C['steel']
        # handlebar
        Bar = blank()
        bx0, bx1 = (15, 49) if d == 'down' else (11, 53)      # from behind, the grip ends peek past the rider
        Bar[rect(bx0, 61, bx1, 62)] = C['steel']; Bar[rect(bx0, 61, bx1, 61)] = C['rim2']
        Bar[rect(bx0 - 1, 60, bx0 + 3, 63)] = C['char']; Bar[rect(bx1 - 3, 60, bx1 + 1, 63)] = C['char']
        if d == 'up':     # seen from behind: bar is beyond the rider
            fr = over(fr, outlined(Bar)); fr = over(fr, U); Bb = blank()
        else:
            Bb = Bar.copy()
        # fork + wheel (narrow ellipse) + mudguard
        cx, cy = 32, GROUND - R_WHEEL
        wm = ((XX - cx) / 3.1) ** 2 + ((YY - cy) / (R_WHEEL + 0.4)) ** 2 <= 1
        Bb[wm] = C['tyre']
        tread = wm & (((YY + k) % 4) == 0) & (abs(XX - cx) <= 1)
        Bb[tread] = C['tyre2']
        Bb[wm & (XX == cx - 1) & (YY < cy - 2)] = C['tyre2']
        Bb[rect(cx - 4, cy - 1, cx + 4, cy + 1) & ~wm] = C['teal']             # hub axle ends
        fork = rect(cx - 4, 64, cx - 3, cy) | rect(cx + 3, 64, cx + 4, cy)
        Bb[fork] = C['teal']; Bb[rect(cx - 4, 64, cx - 4, cy)] = C['tlite']; Bb[rect(cx + 4, 64, cx + 4, cy)] = C['tdark']
        guard = rect(cx - 4, cy - R_WHEEL - 2, cx + 4, cy - R_WHEEL - 1); Bb[guard] = C['teal']
        Bb[rect(cx - 4, cy - R_WHEEL - 2, cx + 4, cy - R_WHEEL - 2)] = C['tlite']
        stem = rect(cx - 2, 60, cx + 2, 64); Bb[stem] = C['tdark'] if d == 'up' else C['teal']
        if d == 'down':
            Bb[rect(cx - 2, 64, cx + 1, 66)] = C['lamp']; Bb[rect(cx - 2, 66, cx + 1, 66)] = C['lamp2']   # headlamp
            Bb[rect(cx - 1, 60, cx, 62)] = C['vio']; Bb[rect(cx - 1, 60, cx - 1, 60)] = C['vio2']        # crystal badge
        else:
            Bb[rect(cx - 2, cy - R_WHEEL - 5, cx + 1, cy - R_WHEEL - 4)] = C['red']                     # rear reflector
            Bb[rect(cx - 7, 66, cx + 6, 69)] = C['tdark']; Bb[rect(cx - 7, 66, cx + 6, 66)] = C['teal']   # rear rack with field case
            Bb[rect(cx - 6, 67, cx + 5, 68)] = C['brn']; Bb[rect(cx - 1, 67, cx, 68)] = C['vio']
        Bb = outlined(Bb)
        if d == 'up': fr = over(fr, Bb)
        if d == 'down':
            # bar + fork + lamp sit in front of the rider; hands (in the body pixels) grip on top
            fr = over(fr, U); fr = over(fr, Bb)
            hands = U.copy(); hands[:, 20:44] = 0; hands[:55] = 0; hands[68:] = 0
            fr = over(fr, hands)
        frames.append(snap(fr))
    return frames

# ---------- export ----------
WALK_TILES_S, RUN_TILES_S, BIKE_TILES_S = 4, 8, 12       # World Design: run ~2x walk, bike ~3x walk
TILE = 64
TIMING = {
    # px of travel per animation frame (native px). Drive the frame index by distance moved, not by a clock.
    'walk': dict(frames=4, px_per_frame=TILE * 2 / 4, tiles_per_s=WALK_TILES_S),   # 1 step per tile
    'run':  dict(frames=RUN_N, px_per_frame=TILE * 2 / RUN_N, tiles_per_s=RUN_TILES_S),  # 1 step per tile, 3 frames per tile
    'bike': dict(frames=BIKE_N, px_per_frame=TILE * 3 / BIKE_N, tiles_per_s=BIKE_TILES_S),  # 1 crank turn per 3 tiles
}
for k, t in TIMING.items():
    t['fps'] = round(t['tiles_per_s'] * TILE / t['px_per_frame'], 3)
    t['ms'] = round(1000 / t['fps'], 2)
def gif_ms(ms): return int(round(ms / 10.0) * 10)          # GIF delays are 10 ms units

def up(a, s): return Image.fromarray(a).resize((a.shape[1] * s, a.shape[0] * s), Image.NEAREST)
BG = (112, 168, 96)
def to_gif(ims, path, ms):
    q = [im.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for im in ims]
    q[0].save(path, save_all=True, append_images=q[1:], duration=ms, loop=0, disposal=1, optimize=False)
def gif(frames, path, ms, scale):
    ims = []
    for fr in frames:
        im = Image.new('RGBA', (fr.shape[1] * scale, fr.shape[0] * scale), BG + (255,))
        im.alpha_composite(up(fr, scale)); ims.append(im)
    to_gif(ims, path, ms)

def compare_gif(st, walkdir, char, anims, path, scale=2, tick=20, loop_ms=1500):
    """rows = down/left/right/up, cols = walk | run | bike, time-synced at each anim's nominal fps.
    Side rows get ground ticks scrolling at that mode's speed, so stride vs. ground can be judged."""
    walk = {d: [np.array(Image.open(f'{walkdir}/{char}_chibi_{d}_walk{i}.png').convert('RGBA')) for i in range(4)] for d in DIRS}
    cols = [('walk', walk), ('run', anims['run']), ('bike', {d: anims['bike'][d] for d in DIRS})]
    ims = []
    for t in range(0, loop_ms, tick):
        canvas = np.zeros((H * 4 + 4 * 3, W * 3 + 2 * 3, 4), 'uint8'); canvas[..., :3] = BG; canvas[..., 3] = 255
        for r, d in enumerate(DIRS):
            for c, (name, A) in enumerate(cols):
                tm = TIMING[name]; idx = int(t / 1000 * tm['fps']) % tm['frames']
                x0 = c * (W + 3); y0 = r * (H + 4)
                cell = canvas[y0:y0 + H, x0:x0 + W]
                if d in ('left', 'right'):
                    off = (t / 1000 * tm['tiles_per_s'] * TILE) % 16
                    sgn = 1 if d == 'left' else -1     # ground moves opposite to travel
                    for gx in range(-16, W + 16, 16):
                        x = int(round(gx + sgn * off)) % (W + 16) - 8
                        if 0 <= x < W - 3: cell[GROUND + 1, x:x + 4, :3] = (80, 120, 70)
                fr = A[d][idx]; m = fr[..., 3] > 0; cell[m] = fr[m]
        ims.append(Image.fromarray(canvas).resize((canvas.shape[1] * scale, canvas.shape[0] * scale), Image.NEAREST))
    to_gif(ims, path, tick)

def seated_upper_parts(st):
    """reusable seated rider torso (head..waist + hem) per direction, for bike / flying mount / train seat"""
    parts = {}
    for d in DIRS:
        src = dict(st)
        if d in ('left', 'right'): src[d] = remove_side_hand(st[d])
        parts[d] = snap(bike_rider_upper(src, d))
    return parts

BIKE_SHIFT = {}
def main(char='cal', export=True):
    walkdir, st = load_walk(char)
    set_profile(char, st)
    out = f'{KIL}/art/characters/pixel/humans/{char}/run_bike'
    fdir = f'{out}/frames'
    anims = {}
    anims['run'] = {d: (run_front(st, d) if d in ('down', 'up') else run_side(st, d)) for d in DIRS}
    anims['bike'] = {d: (bike_front(st, d) if d in ('down', 'up') else bike_side_dir(st, d)) for d in DIRS}
    # tyre contact (incl. outline) must sit on the shared foot row GROUND, same as walk/run feet
    BIKE_SHIFT.clear()
    for d in DIRS:
        low = max(np.where(fr[..., 3].any(1))[0].max() for fr in anims['bike'][d])
        k = low - GROUND; BIKE_SHIFT[d] = k
        if k > 0:
            anims['bike'][d] = [np.concatenate([fr[k:], np.zeros((k, W, 4), 'uint8')]) for fr in anims['bike'][d]]
    if not export: return out, fdir, walkdir, st, anims
    for sub in ('frames', 'frames_2x', 'frames_3x', 'sheets', 'gifs', 'parts'): os.makedirs(f'{out}/{sub}', exist_ok=True)
    pre = f'{char}_chibi'
    names = {}
    for a in ('run', 'bike'):
        for d in DIRS:
            seq = [(f'{a}{i}', fr) for i, fr in enumerate(anims[a][d])]
            if a == 'bike': seq = [('bike_stand', anims[a][d][0])] + seq     # stopped on the bike (same as frame 0)
            names[(a, d)] = [n for n, _ in seq]
            for n, fr in seq:
                Image.fromarray(fr).save(f'{out}/frames/{pre}_{d}_{n}.png')
                for k in SCALES: up(fr, k).save(f'{out}/frames_{k}x/{pre}_{d}_{n}_{k}x.png')
            for k in SCALES:
                gif(anims[a][d], f'{out}/gifs/{pre}_{a}_{d}_{k}x.gif', gif_ms(TIMING[a]['ms']), k)
        # sheet: rows down/left/right/up (as the walk sheet), cols = frames (bike: stand, bike0-3)
        ncol = len(names[(a, 'down')])
        sheet = np.zeros((H * 4, W * ncol, 4), 'uint8')
        for r, d in enumerate(DIRS):
            seq = ([anims[a][d][0]] if a == 'bike' else []) + anims[a][d]
            for c, fr in enumerate(seq): sheet[r * H:(r + 1) * H, c * W:(c + 1) * W] = fr
        Image.fromarray(sheet).save(f'{out}/sheets/{pre}_{a}_sheet.png')
        for k in SCALES: up(sheet, k).save(f'{out}/sheets/{pre}_{a}_sheet_{k}x.png')
        allf = [np.concatenate([anims[a][d][i] for d in DIRS], axis=1) for i in range(len(anims[a]['down']))]
        for k in SCALES: gif(allf, f'{out}/gifs/{pre}_{a}_all_{k}x.gif', gif_ms(TIMING[a]['ms']), k)
    compare_gif(st, walkdir, char, anims, f'{out}/gifs/{pre}_compare_walk_run_bike_2x.gif')
    for d, p in seated_upper_parts(st).items():
        Image.fromarray(p).save(f'{out}/parts/{pre}_{d}_seated_upper.png')
    return out, fdir, walkdir, st, anims, names

if __name__ == '__main__':
    r = main(*(sys.argv[1:2] or ['cal']))
    print('wrote', r[0])
