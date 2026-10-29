"""Heal sequence v2 (Gary, Oct 29 2026: "the original animation was fire" = the HEAL animation, not the tile).
Original: Animator heal_restore (commit 28159ebd, art/characters/pixel/fx_extra/heal_restore, wired in src/ui/fx_art.js healFx):
cradle ring opens at the polisher cradle, the team's crystals rise from the machine front into a ring (r 18), one scanner
sweep, a single warm/violet glow, done ping, crystals home. This redraw keeps the same steps, names, anchor and timing hooks
but at v2 quality: outlined faceted crystals (stepped violet ramp, no dither), a burning ring of flame round the cradle,
flame tongues licking off every crystal, the crystals ORBIT the ring during the scan, a fire flare on the glow and an
ember burst on the done ping. Originals are kept in heal_restore/_v1/ (rollback: copy them back + restore the JSON there).
Run:  python3 tools/furniture_v2/heal_fire_v2.py
"""
import json, math, os, random, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REL = 'art/characters/pixel/fx_extra/heal_restore'
D = os.path.join(ROOT, REL)
W, H, AX, AY, R = 72, 88, 36, 36, 18          # canvas, anchor (cradle centre), crystal ring radius
RF = 23                                       # fire ring radius (outside the crystals so they read clearly)
TRAY_Y = AY + 40                              # crystals start on the machine front (as the original: 40 px below the cradle)
T = (0, 0, 0, 0)
O = (24, 18, 30, 255)
V = dict(d=(96, 50, 160, 255), m=(128, 72, 196, 255), l=(160, 96, 222, 255), h=(206, 170, 246, 255), w=(246, 236, 255, 255))
F = [(120, 30, 44, 255), (196, 56, 44, 255), (238, 118, 48, 255), (252, 182, 72, 255), (255, 228, 128, 255), (255, 250, 214, 255)]


class Cv:
    def __init__(s): s.im = Image.new('RGBA', (W, H), T); s.px = s.im.load()
    def p(s, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: s.px[x, y] = c
    def get(s, x, y):
        x, y = int(round(x)), int(round(y))
        return s.px[x, y] if 0 <= x < W and 0 <= y < H else T


def ring_pts(r):
    pts = set()
    for i in range(720):
        a = i * math.pi / 360; pts.add((round(AX + r * math.cos(a)), round(AY + r * math.sin(a))))
    return pts


def fire_ring(cv, rnd, heat=1.0, r=RF, part=1.0):
    """Burning ring: dark-red outer edge, orange body, yellow inner line, upward flame tongues that flicker per frame."""
    if part <= 0: return
    for (x, y) in ring_pts(r + 1):
        if math.atan2(y - AY, x - AX) % (2 * math.pi) <= part * 2 * math.pi + 0.05: cv.p(x, y, F[1])
    for (x, y) in ring_pts(r):
        if math.atan2(y - AY, x - AX) % (2 * math.pi) <= part * 2 * math.pi + 0.05: cv.p(x, y, F[3] if heat > 0.6 else F[2])
    for (x, y) in ring_pts(r - 1):
        if math.atan2(y - AY, x - AX) % (2 * math.pi) <= part * 2 * math.pi + 0.05 and rnd.random() < 0.55: cv.p(x, y, F[4])
    n = 22
    for i in range(n):
        a = i * 2 * math.pi / n + rnd.uniform(-0.08, 0.08)
        if a % (2 * math.pi) > part * 2 * math.pi: continue
        bx, by = AX + (r + 1) * math.cos(a), AY + (r + 1) * math.sin(a)
        h = max(1, int(round(rnd.choice([1, 2, 2, 3, 3, 4, 5]) * heat)))
        tongue(cv, bx, by, h, rnd, small=True)


def tongue(cv, bx, by, h, rnd, small=False):
    """One flame tongue rising from (bx, by): stepped colours white/yellow at the root -> orange -> red tip, sways."""
    sway = rnd.choice([-1, 0, 0, 1])
    for k in range(h + 1):
        t = k / max(1, h)
        x = bx + (sway if t > 0.5 else 0)
        c = F[4] if t < 0.25 else F[3] if t < 0.5 else F[2] if t < 0.8 else F[1]
        cv.p(x, by - k, c)
        if not small and t < 0.6:
            cv.p(x - 1, by - k, F[2] if t < 0.3 else F[1]); cv.p(x + 1, by - k, F[2] if t < 0.3 else F[1])
    if h >= 3 and rnd.random() < 0.5: cv.p(bx + sway * 2, by - h - 2, F[0])   # stray ember


GEM = ["...O...",
       "..OhO..",
       ".OhwlO.",
       "OhwlmmO",
       "OhlmmdO",
       "OllmmdO",
       "OlmmddO",
       ".OmmdO.",
       "..OdO..",
       "...O..."]
GC = {'O': O, 'h': V['h'], 'w': V['w'], 'l': V['l'], 'm': V['m'], 'd': V['d']}
HOT = {'h': V['w'], 'w': F[5], 'l': V['h'], 'm': V['l'], 'd': V['m']}


def gem(cv, cx, cy, rnd, fire=1.0, hot=False):
    """Faceted capture crystal centred on (cx, cy), with a flame aura + a tongue licking up off its tip."""
    x0, y0 = int(round(cx)) - 3, int(round(cy)) - 5
    if fire > 0:  # aura: orange/red halo one px outside the outline, flickering
        for j, row in enumerate(GEM):
            for i, ch in enumerate(row):
                if ch != '.':
                    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        ii, jj = i + dx, j + dy
                        if not (0 <= jj < len(GEM) and 0 <= ii < 7 and GEM[jj][ii] != '.') and rnd.random() < 0.7 * fire:
                            cv.p(x0 + ii, y0 + jj, F[2] if dy >= 0 and rnd.random() < 0.5 else F[1])
        tongue(cv, x0 + 3, y0 - 1, int(round(rnd.choice([2, 3, 4, 5]) * fire)), rnd)
    for j, row in enumerate(GEM):
        for i, ch in enumerate(row):
            if ch != '.': cv.p(x0 + i, y0 + j, (HOT.get(ch, O) if hot else GC[ch]))


def rest(n, rot=0.0):
    return [(AX + R * math.sin(rot + i * 2 * math.pi / n), AY - R * math.cos(rot + i * 2 * math.pi / n)) for i in range(n)]


def tray(n):
    return [(AX + (i - (n - 1) / 2) * 7, TRAY_Y) for i in range(n)]


def ease(t): return t * t * (3 - 2 * t)


def anims():
    out = {}
    # cradle open: a spark at the cradle catches and the fire ring sweeps round (5 frames)
    fr = []
    for f in range(5):
        cv, rnd = Cv(), random.Random(100 + f)
        if f == 0:
            for (x, y) in ring_pts(2): cv.p(x, y, F[4])
            cv.p(AX, AY, F[5])
        else:
            fire_ring(cv, rnd, heat=0.5 + 0.15 * f, part=min(1.0, f / 4))
        fr.append(cv.im)
    out['heal_cradle_open'] = (fr, [90, 90, 90, 90, 140])
    for n in range(1, 7):
        # float: crystals lifted off the machine front, arc up through the fire into the ring (9 frames)
        fr = []
        for f in range(9):
            cv, rnd = Cv(), random.Random(200 + 10 * n + f)
            fire_ring(cv, rnd, heat=0.8)
            t = ease(f / 8)
            for i, ((sx, sy), (ex, ey)) in enumerate(zip(tray(n), rest(n))):
                x = sx + (ex - sx) * t + math.sin(t * math.pi) * (6 if ex < AX else -6 if ex > AX else 0)
                y = sy + (ey - sy) * t
                if 0 < f < 8:  # fiery trail under each rising crystal
                    for k in range(1, 4): cv.p(x + rnd.choice([-1, 0, 1]), y + 5 + k * 2, F[3 - k] if k < 3 else F[0])
                gem(cv, x, y, rnd, fire=0.4 + 0.6 * t)
            fr.append(cv.im)
        out[f'heal_float_{n}'] = (fr, [100] * 8 + [160])
        # glow: the fire flares up, crystals go white-hot, then settle (8 frames ~1 s)
        fr = []
        heat = [1.2, 1.6, 2.0, 2.0, 1.8, 1.5, 1.2, 1.0]
        for f, hh in enumerate(heat):
            cv, rnd = Cv(), random.Random(400 + 10 * n + f)
            if hh >= 1.8:
                for (x, y) in ring_pts(RF + 3):
                    if rnd.random() < 0.6: cv.p(x, y, F[1])
            fire_ring(cv, rnd, heat=hh)
            for (x, y) in rest(n): gem(cv, x, y, rnd, fire=min(1.6, hh), hot=hh >= 1.5)
            fr.append(cv.im)
        out[f'heal_glow_{n}'] = (fr, [110, 120, 140, 140, 130, 120, 120, 120])
    # scanner sweep: the ring keeps burning, a bright bar passes down through it. Crystals are drawn by the orbit layer
    # (heal_orbit_<n>) under it, so this stays team-size independent like the original.
    fr = []
    for f in range(11):
        cv, rnd = Cv(), random.Random(300 + f)
        fire_ring(cv, rnd, heat=0.9)
        y = AY - RF - 2 + round(f * (2 * RF + 4) / 10)
        hw = int(math.sqrt(max(0, (RF + 2) ** 2 - (y - AY) ** 2)))
        for x in range(AX - hw, AX + hw + 1): cv.p(x, y, F[5] if abs(x - AX) < hw - 2 else F[4]); cv.p(x, y - 1, F[3] if rnd.random() < 0.7 else T)
        fr.append(cv.im)
    out['heal_scanner_sweep'] = (fr, [100] * 11)
    # orbit (NEW, plays together with the scan): crystals circle the burning ring one step (2pi/n) so the last frame
    # lines up with the glow frames
    for n in range(1, 7):
        fr = []
        for f in range(11):
            cv, rnd = Cv(), random.Random(500 + 10 * n + f)
            for (x, y) in rest(n, rot=(f / 11) * 2 * math.pi / n if n > 1 else (f / 11) * 2 * math.pi): gem(cv, x, y, rnd, fire=1.0)
            fr.append(cv.im)
        out[f'heal_orbit_{n}'] = (fr, [100] * 11)
    # done ping: ring bursts outward into embers that fade (6 frames)
    fr = []
    for f in range(6):
        cv, rnd = Cv(), random.Random(600 + f)
        rr = RF + 2 + f * 3
        for (x, y) in ring_pts(rr):
            if rnd.random() < 0.75 - f * 0.1: cv.p(x, y, F[max(0, 4 - f)])
        for k in range(14):
            a = k * 2 * math.pi / 14 + f * 0.1
            cv.p(AX + (rr + 3) * math.cos(a), AY + (rr + 3) * math.sin(a) - f, F[max(0, 3 - f // 2)])
        fr.append(cv.im)
    out['heal_done_ping'] = (fr, [80, 80, 100, 100, 120, 140])
    return out


def main():
    jp = os.path.join(D, 'heal_restore.json'); J = json.load(open(jp))
    bk = os.path.join(D, '_v1')
    if not os.path.exists(bk):  # keep the originals once
        os.makedirs(bk)
        shutil.copy(jp, os.path.join(bk, 'heal_restore.json'))
        for k in J['anims']: shutil.copytree(os.path.join(D, k), os.path.join(bk, k))
    for k, (frames, ms) in anims().items():
        dd = os.path.join(D, k); os.makedirs(dd, exist_ok=True)
        sh = Image.new('RGBA', (W * len(frames), H), T)
        for i, im in enumerate(frames): sh.paste(im, (i * W, 0))
        sh.save(os.path.join(dd, f'{k}_sheet.png'))
        sh.resize((sh.width * 2, H * 2), Image.NEAREST).save(os.path.join(dd, f'{k}_sheet_2x.png'))
        g = [Image.alpha_composite(Image.new('RGBA', (W, H), (34, 30, 44, 255)), im).resize((W * 2, H * 2), Image.NEAREST).convert('P') for im in frames]
        g[0].save(os.path.join(dd, f'{k}_2x.gif'), save_all=True, append_images=g[1:], duration=ms, loop=0)
        for sub in ('1x', '2x'):
            if os.path.isdir(os.path.join(dd, sub)): shutil.rmtree(os.path.join(dd, sub))
        J['anims'][k] = {'kind': 'overlay', 'frames': len(frames), 'frame_size': [W, H], 'ms_per_frame': ms, 'total_ms': sum(ms), 'loop': False,
                         'anchor': {'canvas_px': [AX, AY], 'meaning': 'cradle centre on the polisher cradle (i_crystal_polisher 2x2 px [63, 28])'},
                         'rects': [[i * W, 0, W, H] for i in range(len(frames))],
                         'sheet': f'{REL}/{k}/{k}_sheet.png', 'sheet_2x': f'{REL}/{k}/{k}_sheet_2x.png', 'gif_2x': f'{REL}/{k}/{k}_2x.gif', 'emissive': 'all'}
    J['status'] = 'v2 fire redraw (Oct 29 2026, tools/furniture_v2/heal_fire_v2.py) - wired in src/ui/fx_art.js healFx; originals in _v1/'
    J['generated_by'] = 'tools/furniture_v2/heal_fire_v2.py'
    J['about'] = ('Heal-centre restore FX v2: a ring of fire opens round the polisher cradle, the team crystals are lifted off the machine '
                  'through the flames into the ring, orbit it during one scanner sweep, flare white-hot, ember burst, then home.')
    J['hooks']['sequence'] = ['heal_cradle_open', 'heal_float_<N>', 'heal_scanner_sweep + heal_orbit_<N> together', 'heal_glow_<N>', 'heal_done_ping', 'heal_float_<N> reversed']
    J['hooks']['cradle_centre']['canvas_px'] = [AX, AY]
    J.pop('tod_check', None)
    json.dump(J, open(jp, 'w'), indent=1)
    print('ok', len(J['anims']), 'anims')


if __name__ == '__main__':
    main()
