"""#5 Battle hit feedback + battle-start transitions.
Code-driven parts (flash timing, hit-stop, shake, HP drain, faint drop) -> battle_feedback/hook_specs.json + reference GIFs.
Drawn parts -> frames: per-creature white flash silhouettes, faint crystal flicker + fade, overuse pink flash/crack, 7 full-screen transitions."""
import random
from scipy import ndimage
from soul_lib import *
from fxlib import vnorm
ITEM = 'battle_feedback'
SW, SH = 320, 240
GOLD = ['6a3019', 'd46616', 'eea23c', 'fcd668']   # coin ramp (palette)
RUST = ['6a3019', '9f4013', 'c46e2e', 'd46616']   # Ron's jacket
GR = ['a6d460', '78ba48', '52983a', '367634', '24522e']
SKY = ['c6ecfa', '7ac2e8', '4692ce']; FOR = ['54864e', '38683e', '24522e']

# ----------------------------------------------------------------- battle scene (pilot layout, palette-exact)
def battle_bg(hp=(0.82, 0.64)):
    from PIL import ImageDraw
    P = lambda h: tuple(C(h))
    im = Image.new('RGBA', (SW, SH), P(SKY[0])); d = ImageDraw.Draw(im)
    for y in range(SH):
        c = SKY[0] if y < 40 else (SKY[1] if (y > 46 or y % 2 == 0) else SKY[0]) if y < 70 else SKY[1]
        d.line([0, y, SW, y], fill=P(c))
    rnd = random.Random(3)
    for x in range(0, SW, 6):
        h = rnd.randint(8, 18); d.rectangle([x, 96 - h, x + 7, 104], fill=P(FOR[1])); d.rectangle([x + 1, 96 - h, x + 3, 96 - h + 2], fill=P(FOR[0]))
    d.rectangle([0, 104, SW, SH], fill=P(GR[1]))
    for y in range(104, SH):
        if y % 14 == 0: d.line([0, y, SW, y], fill=P(GR[2]))
    for x in range(0, SW, 2):
        if (x // 2) % 3 == 0: d.point((x, 105), fill=P(GR[0]))
    for (cx, cy, rx, ry) in ((234, 164, 66, 15), (74, 236, 86, 20)):
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=P(INK)); d.ellipse([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], fill=P(GR[3]))
        d.ellipse([cx - rx + 4, cy - ry + 2, cx + rx - 4, cy + ry - 4], fill=P(GR[2])); d.ellipse([cx - rx + 12, cy - ry + 3, cx + rx - 20, cy + ry - 8], fill=P(GR[1]))
    return np.array(im)

def hud(im, hp, shake=0):
    """HP boxes (no text) drawn on top; hp=(foe, player) fractions."""
    for (x, y), f in zip(((14, 20), (186, 196)), hp):
        im[y:y + 25, x:x + 121] = H(INK); im[y + 1:y + 24, x + 1:x + 120] = H(WHITE); im[y + 3:y + 22, x + 3:x + 118] = H('e8ce92')
        im[y + 13:y + 20, x + 8:x + 113] = H(INK)
        w = int(round(102 * max(0, f))); col = GR[1] if f > 0.5 else ('e29d40' if f > 0.2 else PINK[1])
        if w: im[y + 14:y + 19, x + 9:x + 9 + w] = H(col); im[y + 14, x + 9:x + 9 + w] = H(GR[0] if f > 0.5 else 'fcd668' if f > .2 else PINK[3])
        im[y + 5:y + 10, x + 8:x + 51] = H('ccc6c2')
    return im

def foe_xy(spr): h, w = spr.shape[:2]; return 234 - w // 2, 166 - (h - 2)   # sprites have their foot row at h-3 (bbox bottom 125/157)
def ply_xy(spr): h, w = spr.shape[:2]; return 66 - w // 2, SH - h + 2

_BBG = None
def world_bg(sx=0):
    global _BBG
    if _BBG is None: _BBG = battle_bg()
    if sx == 0: return _BBG.copy()
    out = np.roll(_BBG, sx, 1)
    if sx > 0: out[:, :sx] = out[:, sx:sx + 1]
    else: out[:, sx:] = out[:, sx - 1:sx]
    return out

def scene(foe, ply, hp=(0.82, 0.64), sx=0, foe_dy=0, foe_clip=None):
    """world layer (bg + creatures) shifted by sx; HUD drawn unshifted on top."""
    im = world_bg(sx); fx, fy = foe_xy(foe); px, py = ply_xy(ply); f = foe
    if foe_clip is not None:   # sink into platform: hide rows that dropped below the original foot line
        f = foe.copy(); b = bbox(foe) if foe[..., 3].any() else (0, 0, 0, f.shape[0] - 1); cut = b[3] + 1 - foe_dy
        f[max(0, cut):] = 0
    paste(im, f, fx + sx, fy + foe_dy); paste(im, ply, px + sx, py)
    return hud(im, hp)

# ----------------------------------------------------------------- crystal recolours
def crystal_mask(a): return mask_of(a, VIO)
def shift_crystal(a, d):
    out = a.copy(); k = keys(a)
    for i, h in enumerate(VIO):
        m = (k == hk(h)) & (a[..., 3] > 0); out[m] = H(VIO[min(5, max(0, i + d))])
    return out
PINKMAP = ['6e222a', 'a23432', 'd2608c', 'f6a0ba', 'f6a0ba', WHITE]
def pink_crystal(a):
    out = a.copy(); k = keys(a)
    for i, h in enumerate(VIO):
        m = (k == hk(h)) & (a[..., 3] > 0); out[m] = H(PINKMAP[i])
    return out
def pink_glow(a, base, col, r=1, shards=0, seed=0):
    """hot glow ring (r px) hugging each crystal blob, painted over body/transparent pixels; optional shard pixels flying out."""
    out = base.copy(); m = crystal_mask(a)
    ring = ndimage.binary_dilation(m, iterations=r) & ~m
    out[ring] = H(col)
    if shards:
        lab, n = ndimage.label(m); R = random.Random(seed)
        for i in range(1, n + 1):
            ys, xs = np.nonzero(lab == i)
            if len(ys) < 10: continue
            cy, cx = ys.mean(), xs.mean(); rad = max(np.ptp(ys), np.ptp(xs)) / 2 + 3
            for k in range(shards):
                ang = R.uniform(0, 6.283); d = rad + R.uniform(1, 4)
                y, x = int(cy + math.sin(ang) * d), int(cx + math.cos(ang) * d)
                for (yy, xx) in ((y, x), (y + 1, x)):
                    if 0 <= yy < a.shape[0] and 0 <= xx < a.shape[1]: out[yy, xx] = H(WHITE if k % 2 else 'f6a0ba')
    return out
def overuse_frames(a, seed):
    p = pink_crystal(a)
    return [pink_glow(a, p, 'f6a0ba', 1), pink_glow(a, crack(p, seed, 0), 'd2608c', 1, shards=6, seed=seed),
            crack(a, seed, 1), a.copy()]
def crack(a, seed, stage):
    """zig-zag ink crack across each crystal blob (>=10 px); stage 0 full crack + white edge, 1 crack only."""
    out = a.copy(); m = crystal_mask(a); lab, n = ndimage.label(m)
    R = random.Random(seed)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 10: continue
        y0, y1 = ys.min(), ys.max(); x = int(np.median(xs)); pts = []
        for y in range(y0, y1 + 1):
            if (y - y0) % 3 == 0: x += R.choice((-1, 0, 1))
            if lab[y, x] == i: pts.append((y, x))
        for (y, x) in pts:
            out[y, x] = H(INK)
            if stage == 0 and x + 1 < a.shape[1] and lab[y, x + 1] == i: out[y, x + 1] = H(WHITE)
    return out

# ----------------------------------------------------------------- per-creature drawn frames
FLICKER = [2, 0, -2, 1, -3, -1, -5]; FLICKER_MS = [60, 60, 80, 50, 90, 60, 200]
def creature_frames(c, view):
    a = creature_battle(c, view); kind = 'battle_creature'; anc = [a.shape[1] // 2, bbox(a)[3]]
    write_anim(ITEM, f'{c}_{view}_flash', [silhouette(a, WHITE)], [33], kind, anc, False,
               'White hit-flash silhouette (draw instead of the sprite on flash frames, see hook_specs.hit_flash).', sub='creatures/' + c)
    fl = [shift_crystal(a, d) for d in FLICKER]
    dark = fl[-1]
    fade = [bayer_fade(dark, t) for t in (0.25, 0.5, 0.75)]
    write_anim(ITEM, f'{c}_{view}_faint', fl + fade, FLICKER_MS + [75, 75, 75], kind, anc, False,
               'Faint: 7 crystal-flicker frames (bright->dim->out) then 3 Bayer fade frames; apply hook_specs.faint.drop offset during the fade frames.', sub='creatures/' + c)
    ov = overuse_frames(a, sum(map(ord, c)) & 255)
    write_anim(ITEM, f'{c}_{view}_overuse', ov, [70, 140, 120, 60], kind, anc, False,
               'Energy overuse: crystal hot-pink flash + glow ring, crack + shard sparks, crack on normal crystal, back to normal.', sub='creatures/' + c)
    return a, fl, fade, ov

# ----------------------------------------------------------------- transitions (320x240 overlays, last frame fully covered)
def leaf(fx, cx, cy, r, ang, col, dark):
    u = (math.cos(ang), math.sin(ang)); fx.lens('B', (cx, cy), u, r * 2, r * 0.7, C(col))
    fx.line('T', (cx - u[0] * r * 0.8, cy - u[1] * r * 0.8), (cx + u[0] * r * 0.6, cy + u[1] * r * 0.6), C(dark))

# Night fix (Oct 22 2026): transitions are drawn screen-space/ungraded, but are built to pass even if an engine grades them:
# fills are near-black (beat the night bg luma 36-114 from below), detail/rims use the 8 night-lit colours (beat it from above).
NIGHT_LIT = ['fcd668', 'e8ce92', 'ecdec4', 'f8eabe', '603096', '8a4ace', 'b076ec', 'd6acff']
LEAF_FILL = '18382c'   # deep forest (was GR[4] 24522e: same luma as night grass)
def tr_leaf(n=10):
    """Wild: deep-forest wipe left->right with a straw (e8ce92) leading rim and bright leaves riding the edge."""
    R = random.Random(11); leaves = [(R.uniform(-40, SW + 40), R.uniform(-10, SH + 10), R.uniform(5, 10), R.uniform(0, 6.28), R.choice(['e8ce92', GR[0], 'fcd668'])) for _ in range(140)]
    out = []; yy, xx = np.mgrid[0:SH, 0:SW]
    for i in range(n):
        t = (i + 1) / n; edge = -60 + t * (SW + 120)
        fx = FX(SW, SH, outline=C(INK)); base = blank(SW, SH)
        e = (edge - 40 - 18 * np.sin(yy / 17.0) - 10 * np.sin(yy / 5.3)).astype(int)
        cov = xx < e; base[cov] = H(LEAF_FILL)
        base[cov & (xx >= e - 3)] = H('e8ce92'); base[cov & (xx >= e - 1)] = H(INK)   # 2 px straw rim + 1 px ink front
        for (x, y, r, a, col) in leaves:
            lx = x - (1 - t) * 30
            if edge - 70 < lx < edge + 10: leaf(fx, lx, y + math.sin(t * 6 + x) * 4, r, a + t * 3, col, GR[3])
        lv = fx.render(); m = lv[..., 3] > 0; base[m] = lv[m]
        if i == n - 1: base[base[..., 3] == 0] = H(LEAF_FILL)
        out.append(base)
    return out

RED = ['6e222a', 'a23432', 'd05440', 'f08868']
def tr_shards(n=10):
    """Enraged: red-violet crystal shards stab in from all edges and lock together (jagged).
    Night fix: dark shard bodies (RED[0]/VIO[0]) + bright facets (f08868 / d6acff) + 2 px d6acff leading rim; gaps lock to near-black 191210."""
    R = random.Random(5); shards = []
    for k in range(48):
        side = k % 4; s = R.uniform(0, 1)
        if side == 0: o = (s * SW, -10)
        elif side == 1: o = (SW + 10, s * SH)
        elif side == 2: o = (s * SW, SH + 10)
        else: o = (-10, s * SH)
        tgt = (SW / 2 + R.uniform(-60, 60), SH / 2 + R.uniform(-45, 45))
        shards.append((o, tgt, R.uniform(26, 46), R.randint(0, n - 4), R.choice([1, 2, 3])))
    out = []
    for i in range(n):
        fx = FX(SW, SH, outline=C(INK))
        for si, (o, tgt, w, start, ci) in enumerate(shards):
            if i < start: continue
            t = min(1.0, (i - start + 1) / 3.0)
            tip = (o[0] + (tgt[0] - o[0]) * t * 1.1, o[1] + (tgt[1] - o[1]) * t * 1.1)
            u = vnorm((tgt[0] - o[0], tgt[1] - o[1])); nrm = (-u[1], u[0])
            b1 = (o[0] + nrm[0] * w - u[0] * 30, o[1] + nrm[1] * w - u[1] * 30); b2 = (o[0] - nrm[0] * w - u[0] * 30, o[1] - nrm[1] * w - u[1] * 30)
            red = si % 3 == 0   # red-violet: Enraged reads as a warning (playbook 1.7b)
            fx.poly('B', [b1, tip, b2], C(RED[0] if red else VIO[0]))
            mid = ((b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2)
            fx.poly('B', [b1, tip, mid], C(RED[3] if red else VIO[4]))
            fx.line('T', b1, tip, C(VIO[4]), 2)
            fx.line('T', (mid[0] * 0.6 + tip[0] * 0.4, mid[1] * 0.6 + tip[1] * 0.4), (mid[0] * 0.2 + tip[0] * 0.8, mid[1] * 0.2 + tip[1] * 0.8), C(VIO[4]))
        f = fx.render()
        if i >= n - 2:   # lock: fill gaps near-black, flash cracks
            f[f[..., 3] == 0] = H('191210')
        if i == n - 1:
            f[(keys(f) == hk(INK))] = H(VIO[4])
        out.append(f)
    return out

def tr_bars(n=8, cols=(INK, VIO[1]), nb=12):
    """trainer: horizontal bars slide in alternately from left/right."""
    bh = SH // nb; out = []
    for i in range(n):
        t = (i + 1) / n; f = blank(SW, SH)
        for b in range(nb):
            tt = min(1, max(0, t * 1.35 - (b % 3) * 0.12)); w = int(round(SW * tt))
            if not w: continue
            y0 = b * bh
            xs = slice(0, w) if b % 2 == 0 else slice(SW - w, SW)
            f[y0:y0 + bh, xs] = H(cols[0])
            edge = (w - 2 if b % 2 == 0 else SW - w)
            if w < SW: f[y0:y0 + bh, max(0, edge):max(0, edge) + 2] = H(cols[1])
            f[y0 + bh - 1, xs] = H(cols[1])
        out.append(f)
    return out

RON_BANDS = ('6a3019', '2c1a12', '561c0e')   # dark rust/leather bands (was RUST[1]/[0]/[2]: mid-luma, vanished at night)
RON_STITCH = 'fcd668'                        # night-lit gold stitching + leading rim
def tr_ron(n=9):
    """Ron: dark rust jacket chevrons with gold stitch lines race in from the left (his pickup-truck energy), last frame full jacket."""
    out = []; yy, xx = np.mgrid[0:SH, 0:SW]; chev = xx + np.abs(yy - SH / 2) * 0.6
    band = ((chev // 22).astype(int)) % 3; ph = chev % 22; cols = np.stack([H(c) for c in RON_BANDS])
    for i in range(n):
        t = (i + 1) / n; f = blank(SW, SH); front = -80 + t * (SW + 200)
        cov = chev < front
        if i == n - 1: cov = np.ones_like(cov)
        f[cov] = cols[band[cov]]; f[cov & (ph < 2)] = H(RON_STITCH)
        if i < n - 1: f[cov & (chev > front - 6)] = H(RON_STITCH); f[cov & (chev > front - 2)] = H(INK)
        out.append(f)
    return out

def coin(w, r, face):
    """coin of half-width w (flip), radius r; face 0 = crystal emblem, 1 = edge. Night fix: fcd668 face, f8eabe shine, dark GOLD[0] rim."""
    S = 2 * r + 4; fx = FX(S, S, outline=C(INK)); c = (S / 2, S / 2)
    if w < 1.5:
        fx.poly('B', [(c[0] - 1, c[1] - r), (c[0] + 1, c[1] - r), (c[0] + 1, c[1] + r), (c[0] - 1, c[1] + r)], C(GOLD[0])); return fx.render()
    fx.ell('B', c, w, r, C(GOLD[0])); fx.ell('B', (c[0] - w * 0.1, c[1] - r * 0.06), w * 0.86, r * 0.88, C(GOLD[3]))
    if w > r * 0.45:
        k = w / r; dd = r * 0.45
        fx.poly('T', [(c[0], c[1] - dd), (c[0] + dd * 0.55 * k, c[1]), (c[0], c[1] + dd), (c[0] - dd * 0.55 * k, c[1])], C(GOLD[0] if face else VIO[1]))
        fx.px('T', (c[0] - dd * 0.2 * k, c[1] - dd * 0.4), C('f8eabe' if face else VIO[4]), 2)
    fx.arc('T', (c[0] - w * 0.1, c[1] - r * 0.06), w * 0.7, r * 0.72, 200, 260, C('f8eabe'), 2)
    return fx.render()

def tr_coin(n=14):
    """Master: a gold coin spins up in the centre, lands face up, then its face fills the screen."""
    out = []
    for i in range(n):
        f = blank(SW, SH)
        if i < 9:
            r = 26; ph = i * math.pi / 3.0; w = abs(math.cos(ph)) * r
            cimg = coin(w, r, int(ph / math.pi) % 2); y = SH / 2 - math.sin(i / 8 * math.pi) * 40
            paste(f, cimg, SW // 2 - cimg.shape[1] // 2, int(y) - cimg.shape[0] // 2)
        else:
            k = i - 8; r = int(26 * (1.9 ** k))
            if r < 210:
                cimg = coin(r, r, 0); paste(f, cimg, SW // 2 - cimg.shape[1] // 2, SH // 2 - cimg.shape[0] // 2)
            else:
                f[...] = H(GOLD[3]); f[..., 3] = 255
        out.append(f)
    return out

def tr_whiteout(n=10):
    """Guardian: slow white-out from a soft centre glow (Bayer-dithered rings), last frame cream-white."""
    out = []; yy, xx = np.mgrid[0:SH, 0:SW]; d = np.hypot((xx - SW / 2) / SW, (yy - SH / 2) / SH) * 2
    th = np.tile(BAYER, (SH // 4 + 1, SW // 4 + 1))[:SH, :SW] / 16.0
    for i in range(n):
        t = (i + 1) / n; f = blank(SW, SH)
        cov = th < np.clip((t * 1.6 - d) * 1.4, 0, 1)
        inner = th < np.clip((t * 1.6 - d - 0.25) * 1.4, 0, 1)
        f[cov] = H(VIO[5]); f[inner] = H(WHITE)
        if i == n - 1: f[...] = H(WHITE); f[..., 3] = 255
        out.append(f)
    return out

def tr_fade(n=4):
    """reduced-motion fallback for every context: 4-step Bayer fade to ink."""
    out = []; th = np.tile(BAYER, (SH // 4 + 1, SW // 4 + 1))[:SH, :SW]
    for i in range(n):
        f = blank(SW, SH); f[th < (i + 1) * 4] = H(INK); out.append(f)
    return out

TRANSITIONS = [
    ('wild_leaf', tr_leaf, 45, 'Wild encounter in grass: leaf wipe left->right.'),
    ('enraged_shard', tr_shards, 45, 'Enraged variant (design doc: "aggressive"): jagged red-violet crystal shards stab in and lock.'),
    ('trainer_bars', tr_bars, 50, 'Any trainer (also company staff and opposition, see README): horizontal bars alternate in.'),
    ('ron_jacket', tr_ron, 45, "Ron battles: rust chevrons in his jacket colour."),
    ('master_coin', tr_coin, 70, 'Master battles: coin spin, lands, fills screen.'),
    ('guardian_whiteout', tr_whiteout, 120, 'Guardian/legendary: slow dithered white-out.'),
    ('reduced_motion_fade', tr_fade, 75, 'Reduced-motion fallback for ALL contexts (no movement, 300 ms).'),
]

# ----------------------------------------------------------------- hook specs
SHAKE_NORMAL = [3, -3, 2, -2, 1, -1, 0]
SHAKE_STRONG = [6, -6, 4, -4, 3, -2, 1, -1, 0]
SPECS = {
    'frame_ms': 33,
    'hit_sequence_order': ['impact frame of the attack effect lands', 'hit_stop', 'hit_flash (overlaps first shake frames)', 'shake', 'hp_drain'],
    'hit_stop': {'ms': 60, 'what': 'freeze ALL battle animation (effects, idles, bobbing). Audio keeps playing; the hit SFX starts at freeze start.',
                 'critical_ms': 90, 'note': 'critical = 90 ms (our choice; playbook only defines 60 ms)'},
    'hit_flash': {'colour': WHITE, 'frames': 2, 'pattern_ms': [['white', 33], ['normal', 33], ['white', 33], ['normal', 0]],
                  'how': 'draw the target as a solid fcf6e8 silhouette (provided per creature: creatures/<c>/<c>_<view>_flash) on the white frames. '
                         'First white frame starts with hit_stop.', 'reduced_motion': 'one frame of 50% Bayer white (bayer_fade of the silhouette at t=0.5) for 33 ms'},
    'shake': {'axis': 'x', 'applies_to': 'world layer (background, platforms, both creatures); HUD/HP boxes stay still for readability',
              'normal': {'amplitude_px': 3, 'offsets_px': SHAKE_NORMAL, 'ms_per_step': 33, 'total_ms': 33 * len(SHAKE_NORMAL)},
              'strong_hit': {'amplitude_px': 6, 'offsets_px': SHAKE_STRONG, 'ms_per_step': 33, 'total_ms': 33 * len(SHAKE_STRONG), 'when': 'the move is strong against the target (type advantage)'},
              'decay': 'roughly linear: amplitude x (1 - step/steps), sign alternates; table above is authoritative (pixel-integer, native 320x240)',
              'reduced_motion': 'no shake'},
    'hp_drain': {'starts': 'after shake ends', 'rate_ms_per_hp_px': 12, 'min_ms': 200, 'max_ms': 900, 'tick_sfx': 'every 3 bar px (bar is 102 px wide)',
                 'colours': {'>50%': '78ba48', '20-50%': 'e29d40', '<20%': 'a23432'}},
    'faint': {'frames': 'creatures/<c>/<c>_<view>_faint (7 flicker + 3 fade)', 'flicker_ms': FLICKER_MS, 'fade_ms': [75, 75, 75],
              'drop': {'during': 'fade frames + 75 ms after', 'offsets_px': [0, 4, 10, 18, 28], 'ms_per_step': 75, 'clip': 'rows below the original foot line are hidden (sinks into the platform)'},
              'sfx': 'cry pitched down at flicker start, thud at drop end', 'reduced_motion': 'play flicker, skip drop; fade frames still play'},
    'overuse': {'frames': 'creatures/<c>/<c>_<view>_overuse', 'ms': [70, 140, 120, 60], 'trigger': 'energy overuse event (any time the crystal is pushed past its limit)'},
    'transitions': {name: {'frames': f'transitions/{name}', 'ms_per_frame': ms, 'note': note,
                           'after': 'hold last frame 100 ms, then cut to the battle scene and reveal with the reverse of reduced_motion_fade (4x75 ms)',
                           'draw': 'screen-space UI layer, UNGRADED (do not apply the time-of-day grade; it is a full-screen wipe, not a world object)',
                           'grade': 'none', 'emissive_if_graded': 'all',
                           'tod_note': 'built to still read if an engine grades it: near-black fills + rims/detail from the 8 night-lit colours ' + ', '.join(NIGHT_LIT)} for name, _, ms, note in TRANSITIONS},
    'transition_context_map': {'wild (grass/cave/water)': 'wild_leaf', 'wild Enraged variant (doc: aggressive)': 'enraged_shard', 'trainer': 'trainer_bars',
                               'company staff (RT)': 'trainer_bars (playbook lists none; violet bar edge already matches RT)', 'opposition/dissident': 'trainer_bars (playbook lists none)',
                               'Ron': 'ron_jacket', 'Master': 'master_coin', 'Guardian / legendary': 'guardian_whiteout', 'reduced motion setting': 'reduced_motion_fade'},
}

# ----------------------------------------------------------------- previews
def ow_screen(mapname, x0, y0, sprites):
    im = bg(mapname, x0, y0, x0 + 5, y0 + 4)   # 6x5 tiles = 384x320 -> crop 320x240
    for spr, (x, y) in sprites: paste(im, spr, x, y)
    return im[40:280, 32:352]

def preview_transitions():
    foe = creature_battle('emberlunx', 'front'); ply = creature_battle('cindrip', 'back')
    B = scene(foe, ply)
    cal = human('cal', 'down', 'stand')
    contexts = {'wild_leaf': ('route1', 30, 9, []), 'enraged_shard': ('thornwood', 22, 7, []), 'trainer_bars': ('route1', 30, 9, [(human('tr_youngster_m', 'left', 'stand'), (224, 96))]),
                'ron_jacket': ('brookhollow', 19, 9, [(human('ron', 'left', 'stand'), (224, 96))]), 'master_coin': ('fernwick', 4, 17, [(human('tr_master_fernwick_m', 'left', 'stand'), (224, 96))]),
                'guardian_whiteout': ('thornwood', 22, 7, []), 'reduced_motion_fade': ('route1', 30, 9, [])}
    thumbs = []
    for name, fn, ms, note in TRANSITIONS:
        frames = TRANS[name]; m, x0, y0, extra = contexts[name]
        ow = ow_screen(m, x0, y0, [(cal, (128, 96))] + extra)
        seq, sm = [ow] * 1, [500]
        for f in frames:
            im = ow.copy(); paste(im, f, 0, 0); seq.append(im); sm.append(ms)
        seq.append(seq[-1]); sm.append(100)
        last = frames[-1]
        for k in (3, 2, 1, 0):  # reveal: reverse bayer fade of the last frame
            im = B.copy(); paste(im, bayer_fade(last, 1 - k / 4) if k else blank(SW, SH), 0, 0); seq.append(im); sm.append(75)
        sm[-1] = 700
        save_preview(seq, f'{SOUL}/{ITEM}/previews/transition_{name}_2x.gif', sm)
        thumbs.append([seq[1 + len(frames) // 3][::2, ::2], seq[1 + 2 * len(frames) // 3][::2, ::2], seq[len(frames)][::2, ::2]])
    save_png(contact(thumbs), f'{SOUL}/{ITEM}/previews/transitions_contact.png', 1)

def preview_hits(foe_c='emberlunx', ply_c='cindrip', reduced=False):
    foe = creature_battle(foe_c, 'front'); ply = creature_battle(ply_c, 'back')
    flash = silhouette(foe, WHITE)
    seq, sm = [], []
    def add(im, ms): seq.append(im); sm.append(ms)
    hp = [0.82, 0.64]
    add(scene(foe, ply, hp), 500)
    for shake, dmg in ((SHAKE_NORMAL, 0.22), (SHAKE_STRONG, 0.45)):
        # lunge of player (2 frames) as the "impact" cue
        add(scene(foe, ply, hp), 120)
        if reduced:
            f2 = foe.copy(); paste(f2, bayer_fade(flash, 0.5), 0, 0); add(scene(f2, ply, hp), 33); add(scene(foe, ply, hp), 60 + 33 * 6)
        else:
            add(scene(flash, ply, hp), 60)                       # hit-stop with white flash
            for j, sx in enumerate(shake):
                spr = flash if j == 1 else foe
                add(scene(spr, ply, hp, sx=sx), 33)
        # hp drain
        start, end = hp[0], max(0, hp[0] - dmg); steps = max(3, int((start - end) * 102 / 3))
        for s in range(1, steps + 1):
            hp[0] = start + (end - start) * s / steps; add(scene(foe, ply, hp), 36)
        add(scene(foe, ply, hp), 450)
    # faint
    fl = [shift_crystal(foe, d) for d in FLICKER]
    for f, ms in zip(fl, FLICKER_MS): add(scene(f, ply, hp), ms)
    drops = [0, 4, 10, 18, 28]
    for k, t in enumerate((0.25, 0.5, 0.75, 1.0)):
        f = bayer_fade(fl[-1], t) if t < 1 else blank(*foe.shape[1::-1])
        add(scene(f, ply, hp, foe_dy=0 if reduced else drops[k + 1], foe_clip=True), 75)
    add(scene(blank(*foe.shape[1::-1]), ply, hp), 800)
    name = 'hit_feedback_reduced_motion_2x.gif' if reduced else 'hit_feedback_2x.gif'
    save_preview(seq, f'{SOUL}/{ITEM}/previews/{name}', sm)
    return seq

def preview_overuse():
    seq, sm = [], []
    for c in ('cindrip', 'tumbloam', 'gloamtick'):
        foe = creature_battle(c, 'front'); ply = creature_battle('rillop', 'back')
        seq.append(scene(foe, ply)); sm.append(400)
        ov = overuse_frames(foe, sum(map(ord, c)) & 255)
        for f, ms in zip(ov, [70, 140, 120, 60]): seq.append(scene(f, ply)); sm.append(ms * 2)   # x2 slow in preview for review
        seq.append(scene(foe, ply)); sm.append(400)
    save_preview(seq, f'{SOUL}/{ITEM}/previews/overuse_crack_slow2x_2x.gif', sm)

TRANS = {}
def main():
    global TRANS
    rows = []
    for c in CREATURES:
        for v in ('front', 'back'):
            a, fl, fade, ov = creature_frames(c, v)
            if v == 'front':
                sc = lambda x: x if x.shape[0] == 128 else x[16:144, 16:144]
                rows.append([sc(a), sc(silhouette(a, WHITE)), sc(fl[0]), sc(fl[2]), sc(fl[-1]), sc(fade[1]), sc(ov[0]), sc(ov[1])])
    save_png(contact(rows[:8]), f'{SOUL}/{ITEM}/previews/creatures_contact_a.png', 1)
    save_png(contact(rows[8:]), f'{SOUL}/{ITEM}/previews/creatures_contact_b.png', 1)
    for name, fn, ms, note in TRANSITIONS:
        fr = fn(); TRANS[name] = fr
        write_anim(ITEM, name, fr, ms, 'screen', [0, 0], False, note + ' Full 320x240 overlay at (0,0) on top of the overworld; last frame fully opaque.', sub='transitions')
    json.dump(SPECS, open(f'{SOUL}/{ITEM}/hook_specs.json', 'w'), indent=1)
    preview_hits(); preview_hits(reduced=True); preview_overuse(); preview_transitions()
    dump_meta(ITEM)

if __name__ == '__main__':
    main()
