"""#6 Trail Buddy (SOUL_PLAYBOOK 1.2 + 5.7): follow cycles, reactions, crystal-unease, idles, per-buddy specials.
All frames 64x64 creature frames, anchor bottom-centre foot (32,61) = same as the existing overworld creature sprites,
so the engine draws them exactly where it draws <c>_ow_<dir>_stand."""
from scipy import ndimage
from soul_lib import *

ITEM = 'trail_buddy'
DIRS = ['down', 'up', 'left', 'right']
FOOT = 61; ANC = [32, FOOT]; KIND = 'creature'
FACE = {'down': (0, 1), 'up': (0, -1), 'left': (-1, 0), 'right': (1, 0)}
NAMED = ['cindrip', 'rillop', 'tumbloam', 'sailquill', 'gloamtick']   # buddies with playbook specials

def stand(c, d): return creature(c, d, 'stand')
def walk(c, d): return [creature(c, d, f'walk{i}') for i in range(4)]
def dim_crystal(a, d=-2):
    out = a.copy(); k = keys(a)
    for i, h in enumerate(VIO):
        m = (k == hk(h)) & (a[..., 3] > 0); out[m] = H(VIO[min(5, max(0, i + d))])
    return out

# ---------------------------------------------------------------- generic poses (all 16 creatures)
HOP = [(2, 0, 60), (-2, -3, 40), (0, -6, 40), (0, -7, 60), (0, -5, 40), (1, 0, 50), (0, 0, 60)]   # (squash, dy, ms)
def hop(c, d):
    a = stand(c, d); return [shift(vscale(a, s), 0, dy) for s, dy, _ in HOP], [m for *_, m in HOP]

def flinch(c, d):
    """Enraged tell (1.7b): snap back away from facing + squash + 1px shiver, then recover."""
    a = stand(c, d); fx, fy = FACE[d]; bx, by = -fx * 2, -fy * 2
    seq = [(0, 0, 0, 40), (3, bx, by, 60), (3, bx + 1, by, 50), (3, bx - 1, by, 50), (2, bx + 1, by, 50), (2, bx, by, 60), (1, bx // 2, by // 2, 60), (0, 0, 0, 60)]
    return [shift(vscale(a, s), x, y) for s, x, y, _ in seq], [m for *_, m in seq]

def uneasy(c, d):
    """next to dug crystal ore: crouched (squash 3), leaning 1px away, crystal dimmed 2 steps, slow shiver. Loop."""
    a = dim_crystal(vscale(stand(c, d), 4)); fx, fy = FACE[d]
    base = shift(a, -fx * 2, 0)
    return [base, shift(base, 1, 0), base, shift(base, -1, 0)], [220, 90, 220, 90]

def sniff(c, d):
    """idle: two head dips toward the ground with tiny breath puffs in front of the nose."""
    a = stand(c, d); b = bbox(a); out = []
    def dip(k):
        o = a.copy()
        if d in ('down', 'up'):
            split = b[1] + (b[3] - b[1]) * 55 // 100
            up_ = a.copy(); up_[split:] = 0; o[:] = a; o[b[1]:split + k] = 0
            o[split + k:] = a[split + k:]; paste(o, shift(up_, 0, k), 0, 0)
        else:
            mid = (b[0] + b[2]) // 2; front = a.copy(); cut = FOOT - 8
            if d == 'left': front[:, mid:] = 0
            else: front[:, :mid] = 0
            front[cut:] = 0; o = a.copy(); m = front[..., 3] > 0; o[m] = 0
            paste(o, shift(front, 0, k), 0, 0)
        return o
    def puff(o, i):
        if d == 'down': pts = [(28, 62), (29, 63), (35, 62), (34, 63)] if i % 2 else [(27, 63), (26, 62), (36, 63), (37, 62)]
        elif d == 'up': return o
        else:
            x = b[0] - 2 if d == 'left' else b[2] + 2; y = FOOT - 3 + (i % 2)
            sx = -1 if d == 'left' else 1
            pts = [(x, y), (x + sx, y), (x + sx * 3, y - 1), (x + sx * 4, y - 2)] if i % 2 else [(x, y), (x + sx * 2, y - 1), (x + sx * 2, y + 1)]
        for x, y in pts:
            if 0 <= x < 64 and 0 <= y < 64: o[y, x] = H(CREAM)
        return o
    seq = [(0, 0, 160), (2, 0, 80), (3, 1, 140), (2, 0, 80), (3, 2, 140), (2, 0, 80), (0, 0, 200)]
    for k, p, ms in seq:
        o = dip(k)
        if p: o = puff(o, p)
        out.append(o)
    return out, [m for *_, m in seq]

def yawn(c, d):
    """idle: anticipation squash, long stretch upward (2 px), a little sigh puff drifting up beside the head, settle."""
    a = stand(c, d); b = bbox(a)
    seq = [(0, 0, 200), (1, 0, 100), (-1, 0, 120), (-2, 1, 380), (-2, 2, 260), (-1, 3, 120), (1, 0, 80), (0, 0, 200)]
    out = []
    side = 1 if d != 'left' else -1
    for s, p, ms in seq:
        o = vscale(a, s)
        if p:   # 3-px cream sigh puff rising from just beside the face
            puff = glyph(['.oo.', 'oooo', '.oo.'] if p < 3 else ['.o.', 'o.o', '.o.'], {'o': WHITE}); puff = outline(puff, '4a70ba')
            pw = puff.shape[1]
            bx = (b[2] + 1) if side > 0 else (b[0] - pw - 1); by = b[1] + 12 - p * 4
            paste(o, puff, max(0, min(64 - pw, bx)), max(0, by))
        out.append(o)
    return out, [m for *_, m in seq]

def sit(c, d):
    """idle: settle down (generic sit = 4-row squash held, with a 1-row breathing loop). Frames: down, down, then loop 2/3."""
    a = stand(c, d)
    return [vscale(a, 2), vscale(a, 4), vscale(a, 4), vscale(a, 3)], [80, 400, 600, 600]

# ---------------------------------------------------------------- specials (named buddies)
def cindrip_shakeoff(d):
    """rain shake-off: body wiggle +-2 px with water drops flung out in arcs (BLUE light tones)."""
    a = stand('cindrip', d); b = bbox(a); cx, cy = (b[0] + b[2]) // 2, (b[1] + b[3]) // 2
    R = random.Random(7); drops = [(R.uniform(0, 6.283), R.uniform(10, 20)) for _ in range(10)]
    seq = [(2, 0), (-2, 1), (2, 2), (-2, 3), (1, 4), (-1, 5), (0, 6)]
    out = []
    for i, (dx, t) in enumerate(seq):
        o = shift(vscale(a, 1 if i % 2 else 0), dx, 0)
        if t:
            for k, (ang, sp) in enumerate(drops):
                if k % 3 == t % 3 and t > 4: continue
                r = sp * t / 6 + 4; x = int(cx + math.cos(ang) * (r + 10)); y = int(cy - 4 + math.sin(ang) * r * 0.6 + t * t * 0.4)
                col = BLUE[5] if k % 2 else BLUE[4]
                for (yy, xx) in ((y, x), (y + 1, x)):
                    if 0 <= yy < 64 and 0 <= xx < 64: o[yy, xx] = H(col)
        out.append(o)
    return out, [50, 50, 50, 50, 60, 70, 120]

def tumbloam_bench(d='down'):
    """sit on a bench: hop up (dy -10 = bench seat height) and settle into a loaf; loop frames 3,4."""
    a = stand('tumbloam', d)
    seq = [(2, 0, 60), (-1, -8, 50), (0, -13, 60), (3, -10, 90), (4, -10, 700), (3, -10, 500)]
    return [shift(vscale(a, s), 0, dy) for s, dy, _ in seq], [m for *_, m in seq]

def wade(a, f):
    """rillop wading: clip everything below the waterline (foot-9) and draw a 2-tone ripple line across the body."""
    o = a.copy(); wl = FOOT - 9; o[wl + 1:] = 0
    xs = np.nonzero(a[wl - 2:wl + 1, :, 3].any(0))[0]
    if len(xs):
        x0, x1 = xs.min() - 2, xs.max() + 2
        for x in range(max(0, x0), min(64, x1 + 1)):
            c = WHITE if (x + f) % 4 == 0 else BLUE[5]
            o[wl + 1, x] = H(c)
            if (x + f) % 3 == 0 and 0 <= wl + 2 < 64: o[wl + 2, x] = H(BLUE[4])
        for x in (x0 - 2 - f % 2, x1 + 2 + f % 2):
            if 0 <= x < 64: o[wl + 1, x] = H(BLUE[5])
    return o
def rillop_wade(d): return [wade(f, i) for i, f in enumerate(walk('rillop', d))], [62] * 4
def rillop_wade_idle(d):
    a = stand('rillop', d); return [wade(a, i) for i in range(4)], [180] * 4

def flap(a, d, k):
    """sailquill wing flap: move the wing region (down/up: |x-32|>8; side: back half, rows above mid) by k px."""
    b = bbox(a); m = a[..., 3] > 0; yy, xx = np.mgrid[0:64, 0:64]
    if d in ('down', 'up'): wing = m & (np.abs(xx - 32) > 8) & (yy < b[3] - 8)
    else:
        mid = (b[0] + b[2]) // 2; back = (xx > mid) if d == 'left' else (xx < mid)
        wing = m & back & (yy < (b[1] + b[3]) // 2 + 4) & (yy > b[1] + 8)
    body = a.copy(); body[wing] = 0; w = a.copy(); w[~wing] = 0
    paste(body, shift(w, 0, k), 0, 0); return body
def sailquill_fly(d):
    a = stand('sailquill', d); return [flap(a, d, k) for k in (0, -3, -1, 2)], [70, 70, 70, 70]
def flight_shadow():
    return bayer_ellipse(26, 8, INK, 0.5)

def gloamtick_flare(d):
    """lantern flares near graves: lantern violet pixels brighten 1->2 steps, dithered lilac glow ring pulses, then settles."""
    a = stand('gloamtick', d); m = mask_of(a, VIO); lab, n = ndimage.label(m)
    # lantern = violet blob(s) in the lower half (the crystal on the head is higher)
    lant = np.zeros_like(m)
    side = {'down': -1, 'left': -1, 'up': 1, 'right': 1}[d]   # lantern hand side in the source frames (tail-tip crystal is on the other side)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if ys.mean() > 40 and (xs.mean() - 32) * side > 0: lant |= lab == i
    th = np.tile(BAYER, (16, 16))[:64, :64] / 16.0
    dist = ndimage.distance_transform_edt(~lant)
    def glow(o, k):
        """dithered lilac halo: k = strength 0..1; three falloff bands, drawn only on empty pixels (halo, not paint over the body)."""
        o = o.copy(); empty = o[..., 3] == 0
        for rmax, dens, col in ((3, 0.8, VIO[5]), (6, 0.45, VIO[4]), (9, 0.18, VIO[3])):
            band = (dist > 0) & (dist <= rmax * max(k, 0.34)) & empty & (th < dens * k)
            o[band] = H(col); empty &= ~band
        return o
    def bright(dv, core=False):
        o = a.copy(); k = keys(a)
        for i, h in enumerate(VIO):
            mm = (k == hk(h)) & lant; o[mm] = H(VIO[min(len(VIO) - 1, i + dv)])
        if core:   # hottest pixel(s) of the flame go white
            er = ndimage.binary_erosion(lant) if ndimage.binary_erosion(lant).any() else lant
            o[er] = H(WHITE)
        return o
    fr = [glow(bright(1), 0.35), glow(bright(2), 0.7), glow(bright(3, True), 1.0), glow(bright(2, True), 0.85), glow(bright(2), 0.55), glow(bright(1), 0.35)]
    return fr, [80, 100, 260, 200, 200, 300]

# ---------------------------------------------------------------- write
def emit():
    for c in CREATURES:
        for d in DIRS:
            sub = f'creatures/{c}'
            write_anim(ITEM, f'{c}_follow_{d}', walk(c, d), 62, KIND, ANC, True,
                       'Follow cycle = the existing ow walk frames at the player walk rate (16 px per frame, 62 ms); buddy uses the player path delayed one tile.', sub=sub)
            for nm, fn, loop, note in (
                ('hop', hop, False, 'Reaction: happy/notice hop. Play once with an emote (heart / note / sparkle).'),
                ('flinch', flinch, False, 'Reaction: Enraged-nearby tell (1.7b): play with the anger emote during the 0.3 s edge pulse.'),
                ('uneasy', uneasy, True, 'Crystal unease: loop while adjacent (<=1 tile) to crystal ore/dig scars; show the sweat emote once on entry; low unhappy sound.'),
                ('sniff', sniff, False, 'Idle (5.7): sniff the ground.'),
                ('yawn', yawn, False, 'Idle (5.7): yawn/stretch with a sigh puff.'),
                ('sit', sit, True, 'Idle (5.7): settle down. Play 00-01 once, then loop 02-03. Any move input cancels to follow.')):
                fr, ms = fn(c, d)
                write_anim(ITEM, f'{c}_{nm}_{d}', fr, ms, KIND, ANC, loop, note, sub=sub)
    sp = 'specials'
    for d in ('down', 'left', 'right', 'up'):
        fr, ms = cindrip_shakeoff(d); write_anim(ITEM, f'cindrip_shakeoff_{d}', fr, ms, KIND, ANC, False, 'Rain: shake off water (play when rain starts / after leaving rain). Puddle avoidance is pathing (code).', sub=sp)
        fr, ms = rillop_wade(d); write_anim(ITEM, f'rillop_wade_{d}', fr, ms, KIND, ANC, True, 'Brookhollow river edge: wading walk; draw on the water cell (collision water allowed for the buddy only).', sub=sp)
        fr, ms = rillop_wade_idle(d); write_anim(ITEM, f'rillop_wade_idle_{d}', fr, ms, KIND, ANC, True, 'Wading idle (ripple line cycles).', sub=sp)
        fr, ms = sailquill_fly(d); write_anim(ITEM, f'sailquill_fly_{d}', fr, ms, KIND, ANC, True, 'Flight cycle; draw body at y-14 px (hook_specs.sailquill_flight) with flight_shadow on the ground.', sub=sp)
        fr, ms = gloamtick_flare(d); write_anim(ITEM, f'gloamtick_flare_{d}', fr, ms, KIND, ANC, False, 'Lantern flare near graves (<=2 tiles from a memorial stone/grave). Cooldown 6 s.', sub=sp)
    fr, ms = tumbloam_bench('down'); write_anim(ITEM, 'tumbloam_bench_down', fr, ms, KIND, ANC, True, 'Bench sit: buddy steps onto the bench cell, plays 00-03 once, then loops 04-05. Frames already include the -10 px seat lift.', sub=sp)
    write_anim(ITEM, 'flight_shadow', [flight_shadow()], [100], 'overlay', [13, 4], True, 'Ground shadow for flying buddies (50% Bayer ink). Centre on the buddy foot point (32,61) of its ground cell.', sub=sp)

SPECS = {
    'anchor': 'all buddy frames are 64x64 with foot (32,61), identical to <c>_ow_<dir>_stand: draw at (tileX*64, tileY*64) + walk offset.',
    'follow': {'delay': 'one tile behind: buddy takes the cell the player just left, moving with the same 16 px per frame / 62 ms cadence',
               'stairs_warps': 'on warp the buddy appears on the cell behind the player facing the same way', 'ledges': 'hop frames during the ledge arc',
               'bike_run': 'run: same cycle at the run frame rate; bike: buddy returns to its ball (hidden) - our choice, the playbook does not cover it'},
    'reaction_table_hook': 'talk to buddy -> emote + one-liner by place/weather/time/Warmth (text owned by Text Bot). Emote anchor (12,23) at (buddy_x+32, buddy_y+bbox_top-1). '
                           'Pair: happy=hop+heart, music zones=hop+note, rare item=hop+sparkle, rain=dots (cindrip: shakeoff), night=yawn, Enraged nearby=flinch+anger, crystal ore=uneasy+sweat.',
    'idle': {'after_ms': 6000, 'cycle': ['sniff', 'yawn', 'sit'], 'gap_ms': [3000, 6000], 'note': 'pick randomly, never the same twice in a row; cancel on player move'},
    'crystal_unease': {'trigger': 'buddy within 1 tile of a crystal ore / dig scar tile (thornwood (27,11), greystone_entrance (16,12) ...)',
                       'play': 'turn to face the crystal, emote sweat once, loop <c>_uneasy_<dir>', 'audio': 'low unhappy sound (Audio)',
                       'exit': 'when the player moves away, resume follow'},
    'sailquill_flight': {'lift_px': 14, 'bob_px': [0, -1, -2, -1], 'bob_ms': 140, 'shadow': 'specials/flight_shadow under foot point',
                         'bridge_circle': {'radius_px': 44, 'period_ms': 1800, 'direction': 'counter-clockwise', 'facing': 'pick the 4-dir frame closest to the tangent', 'trigger': 'player standing on a bridge cell'},
                         'flies_ahead': 'when walking straight 3+ tiles: target cell = one tile AHEAD of the player instead of behind'},
    'rillop_wade': 'Brookhollow river edge: when the path runs beside the river (x22..24), the buddy may take the adjacent water cell and uses specials/rillop_wade_<dir>',
    'tumbloam_bench': 'when the player stands still 2 s next to a bench, tumbloam steps onto the bench cell and plays specials/tumbloam_bench_down',
    'gloamtick_flare': 'within 2 tiles of a grave / memorial stone: play specials/gloamtick_flare_<dir> once, 6 s cooldown',
    'cindrip_rain': 'cindrip never enters puddle cells (pathing: take the next cell of the player trail that is not a puddle, catch up after). Shake off when rain starts and after leaving a rain zone.',
    'reduced_motion': 'hop -> single 1-frame 2 px lift; shakeoff -> frame 00 + 06 only; uneasy -> frame 00 held (no shiver); idles unchanged.',
}

# ---------------------------------------------------------------- previews
T64 = 64
def place_h(im, spr, tx, ty, ox=0, oy=0): paste(im, spr, int(tx * 64 + ox), int((ty + 1) * 64 - 96 + oy))
def place_c(im, spr, tx, ty, ox=0, oy=0): paste(im, spr, int(tx * 64 + ox), int(ty * 64 + oy))
def em_over(im, e, sx, sy, spr):
    paste(im, e, sx + 32 - 12, sy + bbox(spr)[1] - 1 - 23)

def walk_path(path):
    """path = list of tiles; returns per-frame (x, y, dir, frame) at 16 px/frame for a walker."""
    out = []
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        dx, dy = x1 - x0, y1 - y0; d = 'right' if dx > 0 else 'left' if dx < 0 else 'down' if dy > 0 else 'up'
        for k in range(4): out.append((x0 + dx * k / 4, y0 + dy * k / 4, d, k))
    return out

def preview_follow():
    """Brookhollow: Cal walks along the path and onto the bridge, cindrip follows one tile behind, then turns at the end."""
    X0, Y0 = 17, 9; B = bg('brookhollow', X0, Y0, X0 + 7, Y0 + 5)
    path = [(17, 12), (18, 12), (19, 12), (20, 12), (21, 12), (22, 12), (23, 12), (23, 13)]
    cal = walk_path(path); bud = walk_path([(16, 12)] + path[:-1])
    seq, ms = [], []
    for i in range(len(cal)):
        im = B.copy(); cx, cy, cd, ck = cal[i]; bx, by, bd, bk = bud[i]
        sprs = [(by, lambda im=im: place_c(im, creature('cindrip', bd, f'walk{bk}'), bx - X0, by - Y0)),
                (cy, lambda im=im: place_h(im, human('cal', cd, f'walk{ck}'), cx - X0, cy - Y0))]
        for _, f in sorted(sprs, key=lambda s: s[0]): f()
        seq.append(im); ms.append(62)
    # stop: Cal faces down on the bridge, buddy hops with a heart
    fr, hm = hop('cindrip', 'right'); e = emote('heart')
    for j, (f, m) in enumerate(zip(fr + fr[-1:] * 6, hm + [200] * 6)):
        im = B.copy(); place_c(im, f, 22 - X0, 12 - Y0); place_h(im, human('cal', 'down', 'stand'), 23 - X0, 13 - Y0)
        em_over(im, e[0] if j < 1 else e[1 + (j // 2) % 2], (22 - X0) * 64, (12 - Y0) * 64, stand('cindrip', 'right'))
        seq.append(im); ms.append(m)
    save_preview(seq, f'{SOUL}/{ITEM}/previews/follow_brookhollow_2x.gif', ms)

def preview_uneasy():
    """Thornwood: Cal walks UP the path past the dug crystal (27,11); tumbloam follows below him (so it is drawn in front), stops beside the crystal, sweats, crouches, unease loop; Cal turns back to check."""
    X0, Y0 = 24, 8; B = bg('thornwood', X0, Y0, X0 + 5, Y0 + 5)
    path = [(28, 13), (28, 12), (28, 11), (28, 10)]
    cal = walk_path(path); bud = walk_path([(28, 14)] + path[:-1])
    seq, ms = [], []
    for i in range(len(cal)):
        im = B.copy(); cx, cy, cd, ck = cal[i]; bx, by, bd, bk = bud[i]
        place_h(im, human('cal', cd, f'walk{ck}'), cx - X0, cy - Y0); place_c(im, creature('tumbloam', bd, f'walk{bk}'), bx - X0, by - Y0)
        seq.append(im); ms.append(62)
    fr, um = uneasy('tumbloam', 'left'); e = emote('sweat')
    for j in range(18):
        im = B.copy(); place_h(im, human('cal', 'down' if j > 6 else 'up', 'stand'), 28 - X0, 10 - Y0)
        place_c(im, fr[j % 4] if j > 1 else stand('tumbloam', 'up' if j == 0 else 'left'), 28 - X0, 11 - Y0)
        if j < 10: em_over(im, e[0] if j == 0 else e[1 + (j // 2) % 2], (28 - X0) * 64, (11 - Y0) * 64, stand('tumbloam', 'left'))
        seq.append(im); ms.append(260 if j <= 1 else um[j % 4])
    save_preview(seq, f'{SOUL}/{ITEM}/previews/uneasy_crystal_thornwood_2x.gif', ms)

def preview_idles():
    """Route-1 grass: Cal idle, rillop next to him: sniff -> yawn -> sit loop (each of the 5 named buddies in turn)."""
    X0, Y0 = 30, 9; B = bg('route1', X0, Y0, X0 + 3, Y0 + 2)
    seq, ms = [], []
    for c in NAMED:
        for fn in (sniff, yawn, sit):
            fr, fm = fn(c, 'down')
            if fn is sit: fr, fm = fr + fr[2:] * 2, fm + fm[2:] * 2
            for f, m in zip(fr, fm):
                im = B.copy(); place_h(im, human('cal', 'down', 'stand'), 2, 1); place_c(im, f, 1, 1)
                seq.append(im); ms.append(m)
    save_preview(seq, f'{SOUL}/{ITEM}/previews/idles_route1_2x.gif', ms)

def preview_specials():
    seq, ms = [], []
    # 1 rillop wades down the river edge while Cal walks the bank (brookhollow x21 grass / x22 water)
    X0, Y0 = 19, 7; B = bg('brookhollow', X0, Y0, X0 + 5, Y0 + 4)
    path = [(21, 7), (21, 8), (21, 9), (21, 10)]
    cal = walk_path(path); bud = walk_path([(22, 6), (22, 7), (22, 8), (22, 9)])
    for rep in range(2):
        for i in range(len(cal)):
            im = B.copy(); cx, cy, cd, ck = cal[i]; bx, by, bd, bk = bud[i]
            place_c(im, rillop_wade('down')[0][bk], bx - X0, by - Y0); place_h(im, human('cal', cd, f'walk{ck}'), cx - X0, cy - Y0)
            seq.append(im); ms.append(62)
    fr, _ = rillop_wade_idle('left')
    for j in range(8):
        im = B.copy(); place_c(im, fr[j % 4], 22 - X0, 9 - Y0); place_h(im, human('cal', 'right', 'stand'), 21 - X0, 10 - Y0); seq.append(im); ms.append(180)
    # 2 sailquill circles Cal on the bridge (23,12)
    X0, Y0 = 20, 10; B = bg('brookhollow', X0, Y0, X0 + 5, Y0 + 4)
    fly = {d: sailquill_fly(d)[0] for d in DIRS}; sh = flight_shadow()
    cxp, cyp = (23 - X0) * 64 + 32, (12 - Y0) * 64 + 61
    for k in range(24):
        ang = -k / 24 * 6.283; r = 44
        gx, gy = cxp + math.cos(ang) * r, cyp + math.sin(ang) * r * 0.6
        tx, ty = math.sin(ang), -math.cos(ang)   # tangent (ccw on screen)
        d = ('right' if tx > 0 else 'left') if abs(tx) > abs(ty) else ('down' if ty > 0 else 'up')
        im = B.copy(); paste(im, sh, int(gx - 13), int(gy - 4))
        bob = [0, -1, -2, -1][k % 4]
        sprites = [(gy, lambda im=im, gx=gx, gy=gy, d=d, k=k, bob=bob: paste(im, fly[d][k % 4], int(gx - 32), int(gy - 61 - 14 + bob))),
                   (cyp, lambda im=im: place_h(im, human('cal', 'down', 'stand'), 23 - X0, 12 - Y0))]
        for _, f in sorted(sprites, key=lambda s: s[0]): f()
        seq.append(im); ms.append(75)
    # 3 tumbloam hops onto a bench and loafs; 4 cindrip shakes off rain
    X0, Y0 = 17, 9; B = bg('brookhollow', X0, Y0, X0 + 5, Y0 + 3)
    bench = [tile(tile_id('x_bench_0_0')), tile(tile_id('x_bench_0_1'))]
    def bench_bg():
        im = B.copy(); paste(im, bench[0], 2 * 64, 0 * 64); paste(im, bench[1], 2 * 64, 1 * 64); return im
    fr, fm = tumbloam_bench()
    for f, m in list(zip(fr, fm)) + list(zip(fr[4:], fm[4:])) * 2:
        im = bench_bg(); place_c(im, f, 2, 1); place_h(im, human('cal', 'left', 'stand'), 3, 1); seq.append(im); ms.append(m)
    fr, fm = cindrip_shakeoff('down')
    for rep in range(2):
        for f, m in zip(fr, fm):
            im = B.copy(); place_c(im, f, 1, 2); place_h(im, human('cal', 'down', 'stand'), 2, 2); seq.append(im); ms.append(m * 2 if rep else m)
    save_preview(seq, f'{SOUL}/{ITEM}/previews/specials_day_2x.gif', ms)
    # 5 gloamtick lantern flare by a grave in Lantern Rest at night (official night grade)
    X0, Y0 = 1, 5; B = grade(bg('lantern_rest', X0, Y0, X0 + 5, Y0 + 5), 'night')
    path = [(4, 10), (4, 9), (4, 8), (4, 7)]
    cal = walk_path(path); bud = walk_path([(4, 11), (4, 10), (4, 9), (4, 8)])
    base = stand('gloamtick', 'left')
    def emissive(f):   # night grade, then the flaring lantern pixels + glow ring stay ungraded (they are light sources)
        o = grade(f); m = (keys(f) != keys(base)) & (f[..., 3] > 0); o[m] = f[m]; return o
    seq, ms = [], []
    for i in range(len(cal)):
        im = B.copy(); cx, cy, cd, ck = cal[i]; bx, by, bd, bk = bud[i]
        place_c(im, grade(creature('gloamtick', bd, f'walk{bk}')), bx - X0, by - Y0); place_h(im, grade(human('cal', cd, f'walk{ck}')), cx - X0, cy - Y0)
        seq.append(im); ms.append(62)
    fr, fm = gloamtick_flare('left')
    for f, m in list(zip(fr, fm)) + [(fr[-1], 600)] + list(zip(fr, fm)):
        im = B.copy(); place_h(im, grade(human('cal', 'up', 'stand')), 4 - X0, 7 - Y0); place_c(im, emissive(f), 4 - X0, 8 - Y0)
        seq.append(im); ms.append(m)
    save_preview(seq, f'{SOUL}/{ITEM}/previews/gloamtick_flare_lantern_rest_night_2x.gif', ms)

def preview_contacts():
    rows = []
    for c in NAMED:
        r = [stand(c, 'down'), hop(c, 'down')[0][3], flinch(c, 'down')[0][2], uneasy(c, 'down')[0][0], uneasy(c, 'left')[0][0],
             sniff(c, 'down')[0][4], sniff(c, 'left')[0][4], yawn(c, 'down')[0][3], sit(c, 'down')[0][2], sit(c, 'right')[0][2]]
        rows.append(r)
    save_png(contact(rows, bgcol=(120, 168, 96)), f'{SOUL}/{ITEM}/previews/poses_named_contact_2x.png', 2)
    rows = []
    for c in CREATURES:
        rows.append([stand(c, 'down'), hop(c, 'down')[0][3], uneasy(c, 'down')[0][0], sniff(c, 'right')[0][4], yawn(c, 'down')[0][3], sit(c, 'down')[0][2]])
    save_png(contact(rows[:8], bgcol=(120, 168, 96)), f'{SOUL}/{ITEM}/previews/poses_all_contact_a.png', 1)
    save_png(contact(rows[8:], bgcol=(120, 168, 96)), f'{SOUL}/{ITEM}/previews/poses_all_contact_b.png', 1)
    sp = [cindrip_shakeoff('down')[0][2], rillop_wade('down')[0][1], rillop_wade('left')[0][0], sailquill_fly('down')[0][1], sailquill_fly('left')[0][1],
          gloamtick_flare('down')[0][2], gloamtick_flare('left')[0][2], tumbloam_bench()[0][4], flight_shadow()]
    save_png(contact([sp], bgcol=(70, 120, 170)), f'{SOUL}/{ITEM}/previews/specials_contact_2x.png', 2)

def main():
    emit()
    json.dump(SPECS, open(f'{SOUL}/{ITEM}/hook_specs.json', 'w'), indent=1)
    preview_contacts(); preview_follow(); preview_uneasy(); preview_idles(); preview_specials()
    dump_meta(ITEM)

if __name__ == '__main__':
    main()
