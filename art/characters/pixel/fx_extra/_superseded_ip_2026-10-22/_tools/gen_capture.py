"""fx_extra/capture: dominance crystal throw -> light pull-in -> drop -> 3 wobbles on the beat -> click-lock success / break-out.
SOUL_PLAYBOOK 5.3 + MECHANICS_PARITY item 5 / B17. DRAFT."""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fxx_lib import *
P = 'capture'

# ---- the dominance crystal (original design: faceted violet gem with a grey clasp band) ----
FILL = ["....5....",
        "...543...",
        "...4c3...",
        "..54c32..",
        "..4c332..",
        ".AAAAAAa.",
        ".aaaaaaa.",
        "..43321..",
        "..33211..",
        "...321...",
        "....1...."]
LEVELS = {  # crystal brightness: light inside the crystal dims as it binds (5.3)
    'bright': dict(zip('54321cAa', ['f4e2ff', 'd6acff', 'b076ec', '8a4ace', '603096', WARM_HI, 'ccc6c2', '827a84'])),
    'mid':    dict(zip('54321cAa', ['d6acff', 'b076ec', '8a4ace', '603096', '3a1e60', 'd6acff', 'ccc6c2', '827a84'])),
    'dim':    dict(zip('54321cAa', ['b076ec', '8a4ace', '603096', '603096', '3a1e60', '8a4ace', 'a8a0a4', '5e5866'])),
    'click':  dict(zip('54321cAa', ['b076ec', '8a4ace', '603096', '603096', '3a1e60', '8a4ace', WARM_HI, 'ecdec4'])),
    'open':   dict(zip('54321cAa', ['f4e2ff', 'd6acff', 'b076ec', '8a4ace', '603096', WARM_HI, WARM_HI, 'd6acff'])),
}
def crystal(level='mid', tilt=0, spin=0):
    """tilt: -2..2 px shear of the upper body about the bottom tip; spin: 0..3 quarter poses (0 upright, 1 = 45deg, 2 = 90deg, 3 = 135deg)."""
    g = glyph(FILL, LEVELS[level])
    if tilt:
        g2 = blank(g.shape[1] + 4, g.shape[0]); paste(g2, g, 2, 0); g = g2
        rows = g.shape[0]
        for y in range(rows):
            s = int(round(tilt * (rows - 1 - y) / (rows - 1) * 1.0 + 0.0001)) if abs(tilt) == 1 else int(round(tilt * (rows - 1 - y) / (rows - 1)))
            g[y] = np.roll(g[y], s, axis=0)
    if spin:
        sq = blank(15, 15); paste(sq, g, (15 - g.shape[1]) // 2, (15 - g.shape[0]) // 2); g = sq
        if spin == 2: g = rot90(g, -1)
        elif spin in (1, 3):
            im = Image.fromarray(g).rotate(-45 if spin == 1 else 45, resample=Image.NEAREST, expand=False)
            g = np.array(im); g[g[..., 3] < 255] = 0
    g2 = blank(g.shape[1] + 2, g.shape[0] + 2); paste(g2, g, 1, 1)
    return outline(g2, INK)
def shadow(w=9):
    s = blank(w, 3); s[1, 1:w - 1] = H(INK); s[0, 2:w - 2] = H(INK); s[2, 2:w - 2] = H(INK)
    s[0, 2:w - 2:2] = 0; s[2, 3:w - 2:2] = 0; return s
def put_crystal(cv, c, gx, gy):
    """place crystal sprite so its bottom-centre opaque pixel sits on (gx, gy)."""
    b = bbox(c); cx = (b[0] + b[2]) // 2
    return paste(cv, c, gx - cx, gy - b[3])

def throw():
    W, Hh = 240, 176; ox, oy = TRAVEL_OFF
    s = (PLAYER_HAND[0] - ox, PLAYER_HAND[1] - oy); e = (HOVER[0] - ox, HOVER[1] - oy)
    n = 10; fr = []; pts = []
    for i in range(n):
        t = i / (n - 1); te = 1 - (1 - t) ** 1.6
        x = s[0] + (e[0] - s[0]) * te; y = s[1] + (e[1] - s[1]) * te - 70 * math.sin(math.pi * te) * (1 - 0.25 * te)
        pts.append((x, y))
    for i in range(n):
        cv = blank(W, Hh)
        for k, col, sz in ((3, '603096', 0), (2, '8a4ace', 0), (1, 'b076ec', 1)):
            if i - k >= 0: star4(cv, *pts[i - k], sz, core=col, arm=col, tip='603096')
        c = crystal('mid' if i < n - 1 else 'bright', spin=(i % 4) if i < n - 1 else 0)
        b = bbox(c); paste(cv, c, int(round(pts[i][0])) - (b[0] + b[2]) // 2, int(round(pts[i][1])) - (b[1] + b[3]) // 2)
        fr.append(cv)
    return fr, [40] * (n - 1) + [80]

def pull():
    W = Hh = 96; ax, ay = 48, 40; fr = []; R = __import__('random').Random(5)
    angs = [i * 2 * math.pi / 10 + R.uniform(-0.2, 0.2) for i in range(10)]
    rad0 = [R.uniform(34, 44) for _ in angs]
    n = 9
    for i in range(n):
        cv = blank(W, Hh)
        for a, r0 in zip(angs, rad0):
            r = r0 * (1 - i / (n - 2)) if i < n - 2 else 0
            if r <= 3: continue
            L = min(9, 3 + i)
            x0, y0 = ax + math.cos(a) * r, ay + math.sin(a) * r * 1.15
            x1, y1 = ax + math.cos(a) * (r + L), ay + math.sin(a) * (r + L) * 1.15
            line(cv, x1, y1, x0, y0, '8a4ace'); line(cv, (x0 * 2 + x1) / 3, (y0 * 2 + y1) / 3, x0, y0, 'd6acff'); px(cv, x0, y0, WARM_HI)
        lvl = 'open' if i < n - 2 else 'bright'
        c = crystal(lvl); b = bbox(c); paste(cv, c, ax - (b[0] + b[2]) // 2, ay - (b[1] + b[3]) // 2)
        if i == n - 2: star4(cv, ax, ay - 1, 3, ink=None)
        if i == n - 1: star4(cv, ax, ay - 1, 1)
        fr.append(cv)
    return fr, [70] + [55] * (n - 3) + [70, 90]

GX, GY = 16, 77   # drop canvas ground point
def drop():
    W, Hh = 32, 80; dy = [-61, -50, -34, -12, 0, -7, -9, -5, 0, -2, 0]
    fr = []
    for i, d in enumerate(dy):
        cv = blank(W, Hh)
        if d > -16: paste(cv, shadow(9 if d == 0 else 7), GX - (4 if d == 0 else 3), GY - 1)
        put_crystal(cv, crystal('bright'), GX, GY + d)
        fr.append(cv)
    return fr, [40, 40, 40, 40, 60, 45, 45, 45, 60, 45, 120]

WX, WY = 16, 29   # wobble canvas ground point
def wobble():
    seq = [(-1, 60), (-2, 90), (-1, 60), (0, 40), (1, 60), (2, 90), (1, 60), (0, 140)]
    fr, ms = [], []
    for w, lvl in enumerate(('bright', 'mid', 'dim')):
        for tilt, m in seq:
            cv = blank(32, 32); paste(cv, shadow(9), WX - 4, WY - 1)
            put_crystal(cv, crystal(lvl, tilt=tilt), WX, WY)
            if tilt == 0 and m == 140 and w < 2:   # tiny beat glint on the clasp between wobbles
                px(cv, WX + 4, WY - 7, WARM_HI)
            fr.append(cv); ms.append(m)
    return fr, ms

def success():
    W = Hh = 48; gx, gy = 24, 45; fr = []; ms = [60, 60, 70, 80, 80, 90, 420]
    stars = [(-9, -18), (0, -22), (9, -18)]
    for i in range(7):
        cv = blank(W, Hh); paste(cv, shadow(9), gx - 4, gy - 1)
        lvl = 'click' if i < 2 else 'dim'
        put_crystal(cv, crystal(lvl), gx, gy)
        by = gy - 7
        if i in (1, 2):   # click-lock ticks either side of the band
            e = 3 if i == 1 else 5
            for sgn in (-1, 1):
                line(cv, gx + sgn * 6, by, gx + sgn * (5 + e), by, 'ecdec4'); px(cv, gx + sgn * (6 + e), by, '8a4ace')
        if 2 <= i <= 5:
            sz = {2: 1, 3: 2, 4: 1, 5: 0}[i]; rise = (i - 2) * 3
            for sx, sy in stars: star4(cv, gx + sx, gy + sy - rise, sz, ink=INK if sz >= 1 else None)
        fr.append(cv)
    return fr, ms

def _shards(cv, cx, cy, r, i, R, cols=('d6acff', '8a4ace', '603096')):
    for k in range(7):
        a = k * 2 * math.pi / 7 + 0.4; rr = r * (0.8 + 0.3 * ((k * 37) % 5) / 5)
        x = cx + math.cos(a) * rr; y = cy + math.sin(a) * rr * 0.8 + 0.6 * i * i
        c = cols[k % 3]; px(cv, x, y, c); px(cv, x + 1, y, cols[(k + 1) % 3]); px(cv, x, y + 1, INK)
def breakout(kind):
    W = Hh = 64; gx, gy = 32, 61; cy = gy - 7; fr = []; R = __import__('random').Random(hash(kind) % 1000)
    rs = [0, 0, 6, 11, 16, 20, 23, 25]
    for i in range(8):
        cv = blank(W, Hh)
        if i < 2:
            paste(cv, shadow(9), gx - 4, gy - 1)
            c = crystal('bright', tilt=(1 if i == 1 else 0)); put_crystal(cv, c, gx + (1 if i == 1 else 0), gy)
            line(cv, gx - 2, gy - 12, gx + 1, gy - 8, INK); line(cv, gx + 1, gy - 8, gx - 1, gy - 4, INK)
            if i == 1: line(cv, gx + 1, gy - 8, gx + 3, gy - 10, INK); px(cv, gx - 1, gy - 9, WARM_HI)
            fr.append(cv); continue
        r = rs[i]; t = (i - 2) / 5
        if kind == 'generic':
            if i <= 5: ring(cv, gx, cy, r, 'd6acff', step=2, gap=1, phase=i)
            if i <= 4: ring(cv, gx, cy, max(1, r - 3), '8a4ace', step=1, gap=2)
            for k in range(4):
                a = k * math.pi / 2 + math.pi / 4
                if i <= 6: star4(cv, gx + math.cos(a) * (r + 2), cy + math.sin(a) * (r + 2) * 0.8, 2 if i < 5 else 1, ink=INK)
        elif kind == 'fire':   # ember sparks + flame tongues; NO smoke or haze by rule
            if i <= 4:
                cv0 = cv; cv = blank(W, Hh)
                s = [0, 0, 1.0, 1.3, 0.8][i]
                for k in range(5):
                    a = -math.pi / 2 + (k - 2) * 0.55; L = (10 + 4 * (k % 2)) * s
                    tip = (gx + math.cos(a) * L, cy + math.sin(a) * L)
                    base = [(gx + math.cos(a + 1.3) * 3, cy + math.sin(a + 1.3) * 3), (gx + math.cos(a - 1.3) * 3, cy + math.sin(a - 1.3) * 3)]
                    poly(cv, [base[0], tip, base[1]], 'd46616')
                    poly(cv, [((base[0][0] + gx) / 2, (base[0][1] + cy) / 2), ((tip[0] + gx * 2) / 3, (tip[1] + cy * 2) / 3), ((base[1][0] + gx) / 2, (base[1][1] + cy) / 2)], 'eea23c')
                disc(cv, gx, cy, 2, 'fcd668')
                cv = paste(cv0, outline(cv, INK), 0, 0)
            for k in range(9):
                a = -math.pi / 2 + (k - 4) * 0.4; v = 0.9 + 0.25 * (k % 3)
                x = gx + math.cos(a) * r * v + (1 if (i + k) % 2 else -1); y = cy + math.sin(a) * r * v * 1.1 - 2 * t * 10 * (k % 2)
                if i >= 3 and (k + i) % 4 == 0: continue
                px(cv, x, y, 'fcd668'); px(cv, x + 1, y, 'fcd668' if i < 6 else 'eea23c'); px(cv, x, y + 1, INK); px(cv, x + 1, y + 1, INK)
        elif kind == 'water':
            for k in range(8):
                a = -math.pi / 2 + (k - 3.5) * 0.38; v = 0.85 + 0.2 * (k % 3)
                x = gx + math.cos(a) * r * v * 1.2; y = cy + math.sin(a) * r * v + 0.9 * (i - 2) ** 2
                px(cv, x, y - 1, 'c6ecfa'); px(cv, x, y, '7ac2e8'); px(cv, x + 1, y, '4692ce'); px(cv, x, y + 1, '2c64a8'); px(cv, x + 1, y + 1, '1e4078')
            if 2 <= i <= 5:   # splash crown at the ground
                hh = [0, 0, 4, 7, 6, 3][i]; ww = [0, 0, 6, 9, 11, 12][i]
                for xx in range(-ww, ww + 1, 2):
                    top = gy - 1 - int(hh * (1 - (xx / max(1, ww)) ** 2 * 0.6))
                    line(cv, gx + xx, gy - 1, gx + xx, top, '4692ce'); px(cv, gx + xx, top, 'c6ecfa'); px(cv, gx + xx, gy - 1, '1e4078')
        elif kind == 'wind':
            for k in range(3):
                a0 = k * 2 * math.pi / 3 + t * 2.6
                for j in range(14):
                    a = a0 + j * 0.13; rr = r * 0.55 + j * 0.9
                    if rr < 2: continue
                    c = 'fcf6e8' if j > 10 else 'ccc6c2' if j > 4 else 'a8a0a4'
                    x, y = gx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.75
                    px(cv, x, y, c); px(cv, x, y + 1, '5e5866')
        if i <= 6: _shards(cv, gx, cy, r, i, R)
        if i == 2: star4(cv, gx, cy, 3, ink=INK)
        fr.append(cv)
    return fr, [60, 60, 45, 45, 50, 55, 60, 80]

def odds_ring():
    fr = []
    for tier in range(4):
        cv = blank(48, 48); c = 24
        if tier == 0: ring(cv, c, c, 20, '603096', step=1, gap=5)
        if tier == 1: ring(cv, c, c, 20, '8a4ace', step=3, gap=4)
        if tier == 2: ring(cv, c, c, 20, 'b076ec', step=6, gap=2); ring(cv, c, c, 21, INK, step=6, gap=2)
        if tier == 3:
            ring(cv, c, c, 20, 'd6acff'); ring(cv, c, c, 21, INK); ring(cv, c, c, 19, '8a4ace')
            for dx, dy in ((0, -20), (0, 20), (-20, 0), (20, 0)): star4(cv, c + dx, c + dy, 1)
        fr.append(cv)
    return fr

def main():
    import elements as EL
    ELS = list(EL.ELEMENTS)
    fire = {'fire', 'magma', 'dragos', 'devil', 'demon'}; water = {'water', 'sea', 'freshwater', 'swamp', 'rain'}; wind = {'wind', 'bird'}
    bmap = {e: ('fire' if e in fire else 'water' if e in water else 'wind' if e in wind else 'generic') for e in ELS}
    a = {}
    f, ms = throw(); a['throw'] = write_anim(P, 'capture_throw', f, ms, anchor=dict(canvas_top_left_on_screen=list(TRAVEL_OFF), start_screen=list(PLAYER_HAND), end_screen_hover=list(HOVER)),
        kind='travel', notes='Crystal spins along an arc from the player side to the hover point above the foe centre. 3 trailing violet motes (no smoke). Remap start/end for other layouts: crystal pose = spin (i%4).')
    f, ms = pull(); a['pull'] = write_anim(P, 'capture_pull', f, ms, anchor=dict(canvas_px=[48, 40], meaning='crystal centre = hover point'), kind='overlay',
        notes="Clasp opens, 10 light streaks converge into the crystal. CODE during frames 0-6: draw the foe as a silhouette (fill opaque px with 'd6acff', 1 frame 'f8eabe' on f0) and scale it toward the hover point by silhouette_scale; hide the foe from frame 7.")
    f, ms = drop(); a['drop'] = write_anim(P, 'capture_drop', f, ms, anchor=dict(canvas_px=[GX, GY], meaning='ground contact under the foe (foe sprite bottom-centre anchor)'),
        notes='Falls 61 px from hover to the ground and bounces twice (7 px, 2 px). Pilot layout: hover (232,92) -> ground (232,160).')
    f, ms = wobble(); a['wobble'] = write_anim(P, 'capture_wobble', f, ms, anchor=dict(canvas_px=[WX, WY], meaning='ground contact'),
        notes='3 wobbles x 8 frames. Each wobble starts ON the beat; frame 7/15/23 is the rest hold and is stretched or cut so the next wobble lands on the next beat. Crystal light dims each wobble (bright -> mid -> dim violet) as it binds.',
        hooks=dict(wobble_start_frames=[0, 8, 16], hold_frames=[7, 15, 23], default_beat_ms=600, rule='ms_per_frame assumes 100 BPM (600 ms/beat); at another tempo keep frames 0-6 of each wobble as authored and set the hold to beat_ms - 460', stop_after_wobble='odds roll: stop after wobble N (0-3) then play capture_breakout_<type>, or capture_success after wobble 3'))
    f, ms = success(); a['success'] = write_anim(P, 'capture_success', f, ms, anchor=dict(canvas_px=[24, 45], meaning='ground contact'),
        notes='Click-lock: clasp band flashes and two lock ticks snap out (play the click SFX on frame 1), 3 stars rise, crystal settles dim violet (bound). Hold the last frame.')
    for kind in ('generic', 'fire', 'water', 'wind'):
        f, ms = breakout(kind); a['break_' + kind] = write_anim(P, f'capture_breakout_{kind}', f, ms, anchor=dict(canvas_px=[32, 61], meaning='ground contact'),
            notes=f'Crystal cracks (f0-1), then bursts into 7 violet shards + {kind} release. CODE: on frame 2 un-hide the foe (draw normally) and play the cry. ' + ('Fire = flame tongues + ember sparks only, no smoke/haze.' if kind == 'fire' else ''))
    f = odds_ring(); a['odds'] = write_anim(P, 'capture_odds_ring', f, [400] * 4, anchor=dict(canvas_px=[24, 24], meaning='centre on the foe centre (pilot 232,100)'), kind='state_frames', loop=True,
        notes='NOT time-based: pick frame by capture odds. f0 <10% (Guardian territory, ghost dots), f1 10-34%, f2 35-69%, f3 >=70% solid. Shown only while the crystal is aimed/selected. ms values are preview-only.')
    hooks = dict(
        sequence=['capture_throw @ travel canvas (40,40)', 'capture_pull @ hover', 'capture_drop @ foe ground', 'capture_wobble x up to 3 wobbles (beat-synced)', 'capture_success OR capture_breakout_<type>'],
        silhouette_scale=dict(frames=[0, 1, 2, 3, 4, 5, 6], scale=[1.0, 0.85, 0.66, 0.48, 0.3, 0.16, 0.06], pivot='hover point', resample='nearest only'),
        breakout_type_by_element=bmap,
        guardian_note='Guardians have very low odds: use odds ring f0 and the generic break-out unless their element maps elsewhere; add the battle shake (soul/battle_feedback hook_specs shake super) on break-out frame 2.',
        reduced_motion=dict(throw='skip capture_throw: show capture_pull frame 0 at hover for 200 ms', pull='play frames 0,4,7 only (200 ms each)', wobble='replace tilts with the rest pose; keep the per-wobble brightness change on the beat', success='frames 0,1,6', breakout='frames 0,2,6'),
        sfx_cues=dict(capture_throw=0, capture_pull=0, capture_drop=[4, 8], capture_wobble=[0, 8, 16], capture_success=1, breakout=2),
        layering='all capture sprites draw above the foe and below the HP boxes/UI')
    # previews: full sequence on the pilot screen
    bg_foe = clean_battle_bg('emberlunx'); bg = clean_battle_bg(None)
    foe = creature_battle('emberlunx', 'front'); fh, fw = foe.shape[:2]
    seq, sms = [], []
    for i, fr in enumerate(a['throw']['_frames']):
        seq.append(comp(bg_foe, fr, *TRAVEL_OFF)); sms.append(a['throw']['ms_per_frame'][i])
    sc = hooks['silhouette_scale']['scale']
    for i, fr in enumerate(a['pull']['_frames']):
        im = bg.copy()
        if i < 7:
            s = silhouette(foe, WARM_HI if i == 0 else 'd6acff'); nw, nh = max(1, int(fw * sc[i])), max(1, int(fh * sc[i]))
            ss = np.array(Image.fromarray(s).resize((nw, nh), Image.NEAREST))
            fx0 = FOE_GROUND[0] - fw // 2; fy0 = FOE_GROUND[1] - (fh - 3)
            px0 = int(HOVER[0] + (fx0 - HOVER[0]) * sc[i]); py0 = int(HOVER[1] + (fy0 - HOVER[1]) * sc[i])
            im = comp(im, ss, px0, py0)
        seq.append(comp(im, fr, HOVER[0] - 48, HOVER[1] - 40)); sms.append(a['pull']['ms_per_frame'][i])
    for i, fr in enumerate(a['drop']['_frames']):
        seq.append(comp(bg, fr, FOE_GROUND[0] - GX, FOE_GROUND[1] - GY)); sms.append(a['drop']['ms_per_frame'][i])
    for i, fr in enumerate(a['wobble']['_frames']):
        seq.append(comp(bg, fr, FOE_GROUND[0] - WX, FOE_GROUND[1] - WY)); sms.append(a['wobble']['ms_per_frame'][i])
    succ = list(seq)
    for i, fr in enumerate(a['success']['_frames']):
        succ.append(comp(bg, fr, FOE_GROUND[0] - 24, FOE_GROUND[1] - 45))
    preview_gif(P, 'capture_full_success', succ, sms + a['success']['ms_per_frame'])
    for kind in ('generic', 'fire', 'water', 'wind'):
        m = a['break_' + kind]; br = list(seq[:-8])   # break after wobble 2
        bms = list(sms[:-8])
        for i, fr in enumerate(m['_frames']):
            base = bg_foe if i >= 2 else bg
            br.append(comp(base, fr, FOE_GROUND[0] - 32, FOE_GROUND[1] - 61)); bms.append(m['ms_per_frame'][i])
        br += [bg_foe] * 2; bms += [300, 300]
        preview_gif(P, f'capture_full_breakout_{kind}', br, bms)
    # contact sheet of every anim (2x, on battle grass)
    rows = []
    grass = bg[170:240, 0:320]
    for k, m in a.items():
        if k == 'throw': continue
        rr = []
        for f in m['_frames']:
            h, w = f.shape[:2]; tile_ = np.zeros((h, w, 4), 'uint8'); tile_[:] = np.resize(grass, (h, w, 4)) if False else grass[:h, :w] if h <= grass.shape[0] else np.concatenate([grass] * 2)[:h, :w]
            rr.append(comp(tile_, f, 0, 0))
        rows.append(rr)
    preview_png(P, 'capture_contact', contact(rows))
    # ToD checks (battle screen graded like an outdoor scene as the worst case)
    tod = {}
    tod['throw_pull'] = tod_check(P, 'capture_throw', bg_foe, [(a['throw'], *TRAVEL_OFF)])
    tod['pull'] = tod_check(P, 'capture_pull', bg_foe[HOVER[1] - 40:HOVER[1] + 56, HOVER[0] - 48:HOVER[0] + 48].copy(), [(a['pull'], 0, 0)])
    sub = bg[FOE_GROUND[1] - 77:FOE_GROUND[1] + 3, FOE_GROUND[0] - 40:FOE_GROUND[0] + 40].copy()
    tod['drop_wobble'] = tod_check(P, 'capture_wobble', sub, [(a['wobble'], 40 - WX, 77 - WY)])
    tod['drop'] = tod_check(P, 'capture_drop', sub, [(a['drop'], 40 - GX, 0)])
    tod['success'] = tod_check(P, 'capture_success', sub, [(a['success'], 40 - 24, 77 - 45)])
    for kind in ('generic', 'fire', 'water', 'wind'):
        tod['break_' + kind] = tod_check(P, f'capture_breakout_{kind}', sub, [(a['break_' + kind], 40 - 32, 77 - 61)])
    tod['odds'] = tod_check(P, 'capture_odds_ring', bg_foe[FOE_CENTER[1] - 24:FOE_CENTER[1] + 24, FOE_CENTER[0] - 24:FOE_CENTER[0] + 24].copy(), [(a['odds'], 0, 0)])
    about = 'Capture sequence for the dominance crystal (SOUL_PLAYBOOK 5.3; MECHANICS_PARITY item 5, B17). Original faceted crystal with a grey clasp band; no ball/button motif.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__':
    sys.path.insert(0, PIX + '/effects/_tools'); main()
