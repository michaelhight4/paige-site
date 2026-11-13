"""Ondravel anim v1 (DRAFT, art only, not wired). python3 _tools/build.py
Base art (read only): kilumen/art/characters/pixel/creatures/ondravel/overworld/ondravel_ow/*_stand.png (native 64x64,
1 art px = 1 game px, same convention as mira_chibi etc.). Never redrawn: moved by whole px + palette ramp swaps only.
Tank: wt_wellspire flashback_anim/lab_tank_overlays (glass mask, art1x x2) + Director tile sheet (wt_director_lab) read only.
Scoring/time of day: fxx_lib.grade/lum/ow_bg/PH (same as kilumen_fishing_derby/_tools/derby.py and kilumen_anim_halls);
tank scoring = build_overlays.readab rule (snap tile to palette, lit LUT for night-glow colours). Pillow (HPND) + numpy (BSD)."""
import sys, os, json, math, random
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/fx_extra/_tools')
from fxx_lib import grade, lum, ow_bg, PH
OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/workspace/kilumen/art/characters/pixel/creatures/ondravel/overworld/ondravel_ow'
TK = '/workspace/wt_wellspire/kilumen/shots/flashback_anim/lab_tank_overlays'
DL = '/workspace/wt_director_lab/kilumen/art/world/overworld'
PAL = [l.strip().lower() for l in open('/workspace/kilumen/art/palette/kilumen.hex') if l.strip()]
PALS = set(PAL); PALA = np.array([[int(h[i:i+2], 16) for i in (0, 2, 4)] for h in PAL])
NIGHT_GLOW = {'fcd668', 'e8ce92', 'ecdec4', 'f8eabe', '603096', '8a4ace', 'b076ec', 'd6acff'}
def C(h): return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)] + [255], 'uint8')
def hx(p): return '%02x%02x%02x' % tuple(p[:3])
def keyhex(a): return np.array([hx(c) for c in a[..., :3].reshape(-1, 3)]).reshape(a.shape[:2])
def up(a, k): return a.repeat(k, 0).repeat(k, 1)
def emask(f): return np.isin(keyhex(f), list(NIGHT_GLOW)) & (f[..., 3] > 0)
def P(a, x, y, h, m=None):
    x, y = int(round(x)), int(round(y))
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and (m is None or m[y, x]): a[y, x] = C(h)

STAND0 = {d: np.array(Image.open(f'{SRC}/ondravel_ow_{d}_stand.png').convert('RGBA')) for d in ('down', 'left', 'right', 'up')}
# night-read ramp spread (Wellspire summit floor is grass_0/cave_*: mid blues 4692ce/4a70ba sit at night luma 69-81 vs ground 72-76).
# Same hues, one step apart: light->lighter, mid->light, mid-dark->dark. Tested variants none/A/B/C, B is the only one >=0.5 on all 4 grounds.
RAMP_SPREAD = {'7ac2e8': 'c6ecfa', '4692ce': '7ac2e8', '4a70ba': '1e4078', '2c64a8': '1e4078', '30488c': '1e4078', '54444e': '3e3a48'}
def remap(f, mp):
    o = f.copy(); k = keyhex(f); vis = f[..., 3] > 0
    for a_, b_ in mp.items(): o[vis & (k == a_)] = C(b_)
    return o
STAND = {d: remap(a, RAMP_SPREAD) for d, a in STAND0.items()}
# body ramp in the source art, dark -> light (only colours actually used get swapped)
used = {}
for d, a in STAND.items():
    for c in keyhex(a)[a[..., 3] > 0]: used[c] = used.get(c, 0) + 1
BLUES = sorted([c for c in used if int(c[4:6], 16) > int(c[0:2], 16) + 30], key=lambda c: lum(np.array([int(c[i:i+2], 16) for i in (0, 2, 4)], float)))
UPSTEP = {'7ac2e8': 'c6ecfa', 'c6ecfa': 'fcf6e8'}   # sheen: light tones only, one step

def breathe(a, dy):
    """lift everything above the shoulder line by dy whole px (legs stay planted): 1-px breath, no new colours."""
    if dy == 0: return a.copy()
    ys = np.where(a[..., 3].any(1))[0]; top, bot = ys.min(), ys.max(); cut = top + int((bot - top) * 0.62)
    o = a.copy(); o[top - dy:cut - dy] = a[top:cut]; return o
def shimmer(a, t, width=3):
    """diagonal band moving across the body; blue px in the band go one ramp step lighter (crystal water sheen)."""
    o = a.copy(); H, W = a.shape[:2]; k = keyhex(a); Y, X = np.mgrid[0:H, 0:W]
    pos = -20 + t * (W + H + 40); band = np.abs((X + Y) - pos) < width
    for c, c2 in UPSTEP.items(): o[band & (k == c) & (a[..., 3] > 0)] = C(c2)
    return o

ANIMS = []
def add(name, frames, ms, loop, anchor, footprint, cover, notes, kind='overworld', base=None, scale=1, em=False):
    ANIMS.append(dict(name=name, frames=frames, ms=ms, loop=loop, anchor=anchor, footprint=footprint, cover=cover, notes=notes, kind=kind, base=base, scale=scale, em=em))

N_IDLE = 12; IDLE_MS = 120   # 1.44 s
def idle(d):
    fr = []
    for i in range(N_IDLE):
        dy = 1 if 3 <= i <= 8 else 0
        fr.append(shimmer(breathe(STAND[d], dy), i / N_IDLE))
    return fr
CW = {'down': 'left', 'left': 'up', 'up': 'right', 'right': 'down'}; CCW = {v: k for k, v in CW.items()}
def turn(d):
    """look-around loop: face d, glance to the clockwise side, back, glance to the other side, back (16 f)."""
    seq = [d] * 4 + [CCW[d]] * 4 + [d] * 4 + [CW[d]] * 4
    return [breathe(STAND[s], 1 if (i % 8) in (2, 3, 4) else 0) for i, s in enumerate(seq)]

def reveal():
    """one-shot, 1x1 square: water ring wells up on the summit stone, body rises out of it behind a bright waterline,
    antler-tip glints, settle on down-stand. Last frame == idle_down frame 0 so the engine can hand straight over."""
    base = STAND['down']; H, W = base.shape[:2]; ys = np.where(base[..., 3].any(1))[0]; top, bot = ys.min(), ys.max()
    cx, cy = 32, 60; fr = []; ms = []
    def ring(a, r, c, c2):
        for k in range(48):
            t = 2 * math.pi * k / 48; P(a, cx + r * math.cos(t), cy + 0.57 * r * math.sin(t), c)
            P(a, cx + r * math.cos(t) + 1, cy + 0.57 * r * math.sin(t) + 1, c2)
    for i, r in enumerate((3, 7, 11, 15)):          # water wells up
        a = np.zeros_like(base); ring(a, r, 'c6ecfa', '1e4078')
        if r > 6: ring(a, r - 4, '7ac2e8', '1a1226')
        fr.append(a); ms.append(80)
    rows = 8
    for i in range(rows):                            # rise: rows below the line visible, line itself bright
        line = int(bot - (bot - top + 2) * (i + 1) / rows)
        a = np.zeros_like(base); vis = np.zeros(base.shape[:2], bool); vis[line:] = True
        m = vis & (base[..., 3] > 0); a[m] = base[m]
        for x in np.where(base[min(line, bot), :, 3] > 0)[0]: P(a, x, line - 1, 'fcf6e8'); P(a, x, line, 'c6ecfa')
        ring(a, 15, 'c6ecfa', '1e4078')
        for k in range(3):                           # drops shed from the line
            P(a, 20 + 11 * k + (i % 3), line - 3 - (i * 2 + k * 3) % 7, 'c6ecfa'); P(a, 21 + 11 * k + (i % 3), line - 2 - (i * 2 + k * 3) % 7, '1e4078')
        fr.append(a); ms.append(70)
    # antler glints (star in night-glow gold, 1 px ink shadow) then settle
    tips = [(int(x), int(y)) for y, x in np.argwhere(base[..., 3] > 0) if y <= top + 2][:: 3][:4]
    for i in range(4):
        a = base.copy(); s = (1, 2, 2, 1)[i]
        for (x, y) in tips[i % 2::2] if i % 2 else tips:
            P(a, x, y, 'fcf6e8')
            for kk in range(1, s + 1):
                for dx, dy in ((kk, 0), (-kk, 0), (0, -kk)): P(a, x + dx, y + dy, 'fcd668' if kk < s else 'e29d40')
        fr.append(a); ms.append(90)
    fr.append(base.copy()); ms.append(400)
    return fr, ms

# ---- tank water + bubbles loop (art1x 192x160, x2 -> 6x5 squares at 12306) ----
GM = np.array(Image.open(f'{TK}/ovl_ondravel_tank/ovl_ondravel_tank_glassmask_art1x.png').convert('RGBA'))[..., 3] > 0
TS = json.load(open(DL + '/tileset_arena.json')); BYN = {t['name']: t for t in TS['tiles'] if t.get('category') == 'wellspire_lab'}
SH = np.array(Image.open(DL + '/tiles_1x/wellspire_lab.png').convert('RGBA'))
def tankbase():
    a = np.zeros((320, 384, 4), 'uint8')
    for y in range(5):
        for x in range(6):
            t = BYN[f'wl_bigcrystal_{x}_{y}']; a[y*64:(y+1)*64, x*64:(x+1)*64] = SH[t['row']*64:(t['row']+1)*64, t['col']*64:(t['col']+1)*64]
    return a
def snap(a):
    rgb = a[..., :3].reshape(-1, 3).astype(int); d = ((rgb[:, None] - PALA[None]) ** 2).sum(-1)
    o = a.copy(); o[..., :3] = PALA[d.argmin(1)].reshape(a.shape[:2] + (3,)).astype('uint8'); return o
def bubble(a, x, y, sz, m):
    if sz == 1: P(a, x, y, 'c6ecfa', m); P(a, x + 1, y + 1, '1e4078', m); return
    if sz == 2:
        P(a, x, y, 'fcf6e8', m); P(a, x + 1, y, 'c6ecfa', m); P(a, x, y + 1, 'c6ecfa', m); P(a, x + 1, y + 1, '1e4078', m); return
    for dx, dy in ((1, 0), (2, 0), (0, 1), (3, 1), (0, 2), (3, 2), (1, 3), (2, 3)): P(a, x + dx, y + dy, 'c6ecfa', m)
    P(a, x + 1, y + 1, 'fcf6e8', m); P(a, x + 3, y + 3, '1e4078', m)
def tank_loop(n=24, seed=5):
    """water + bubbles: surface swell line (2 integer-period waves), 5 vent streams of small bubbles from the floor,
    4 big wobbling bubbles, surface pop rings. Every motion has an integer cycle count per loop -> seamless."""
    rnd = random.Random(seed); H, W = GM.shape; ys, xs = np.where(GM); top = ys.min()
    cols = [x for x in range(W) if GM[:, x].sum() >= 10]
    span = {x: (np.where(GM[:, x])[0].min(), np.where(GM[:, x])[0].max()) for x in cols}
    vents = [cols[int(len(cols) * f)] for f in (0.14, 0.32, 0.5, 0.68, 0.86)]
    stream = [(v, k / 4 + rnd.random() * 0.1, rnd.choice((1, 2))) for v in vents for k in range(4)]
    big = [(cols[int(len(cols) * f)], rnd.random()) for f in (0.22, 0.42, 0.6, 0.8)]
    fr = []
    for i in range(n):
        t = i / n; a = np.zeros((H, W, 4), 'uint8')
        for x in cols:   # surface swell
            y0 = span[x][0]; yy = y0 + 3 + 1.5 * math.sin(2 * math.pi * (x / 24 - t)) + 0.8 * math.sin(2 * math.pi * (x / 11 + 2 * t))
            P(a, x, yy, 'c6ecfa', GM); P(a, x, yy + 1, '2c64a8', GM)
            if math.sin(2 * math.pi * (x / 24 - t)) > 0.8: P(a, x, yy - 1, 'fcf6e8', GM)
        for x, ph, sz in stream:
            y0, y1 = span[x]; u = (ph + 2 * t) % 1; y = y1 - 2 - u * (y1 - y0 - 6)
            bubble(a, x + round(math.sin(2 * math.pi * (4 * t + ph))), y, sz, GM)
        for x, ph in big:
            y0, y1 = span[x]; u = (ph + t) % 1; y = y1 - 4 - u * (y1 - y0 - 8)
            bubble(a, x + 1.5 * math.sin(2 * math.pi * (3 * t + ph)), y, 3, GM)
            if u > 0.9:   # pop ring at surface
                r = 2 + (u - 0.9) * 40
                for k in range(16): P(a, x + r * math.cos(k * math.pi / 8), y0 + 4 + 0.57 * r * math.sin(k * math.pi / 8), 'fcf6e8', GM)
        fr.append(a)
    return fr

# ---- scoring ----
QA_BG = ['grass_0', 'cave_0', 'snow_0', 'floor_stone']   # fin_summit_camp ground = grass_0 (809) + cave_0..3
def score_ow(frames, bgname):
    h, w = frames[0].shape[0] // 64, frames[0].shape[1] // 64; bg = ow_bg([bgname], w, h); res = {}
    for ph in PH:
        gb = grade(bg, ph, 'tile'); tot = ok = 0; worst = 1
        for f in frames:
            g = grade(f, ph, 'sprite'); m = f[..., 3] > 0
            d = np.abs(lum(g[m].astype(float)) - lum(gb[m].astype(float)))
            if d.size: worst = min(worst, float((d >= 28).mean()))
            tot += d.size; ok += int((d >= 28).sum())
        res[ph] = dict(mean=round(ok / max(1, tot), 3), worst_frame=round(worst, 3))
    return res, bg
def score_tank(frames, base):
    bgs = snap(base); res = {}
    for ph in PH:
        gb = grade(bgs, ph, 'tile'); lb = lum(gb[..., :3].astype(float)); tot = ok = 0; worst = 1
        for f in frames:
            f2 = up(f, 2); e = emask(f2); g = grade(grade(f2, ph, 'lit', e), ph, 'sprite', ~e); mm = f2[..., 3] > 0
            d = np.abs(lum(g[..., :3].astype(float)) - lb)[mm]
            if d.size: worst = min(worst, float((d >= 28).mean()))
            tot += d.size; ok += int((d >= 28).sum())
        res[ph] = dict(mean=round(ok / max(1, tot), 3), worst_frame=round(worst, 3))
    return res, bgs
def comp(bg, f):
    o = bg.copy(); m = f[..., 3] > 0; o[m] = f[m]; return o
def seam(fr):
    d = [float(np.mean(fr[i] != fr[(i + 1) % len(fr)])) for i in range(len(fr))]
    return round(d[-1] / max(1e-6, max(d[:-1])), 2)

# ---- build ----
for d in ('down', 'up', 'left', 'right'):
    add(f'ondravel_ow_idle_{d}', idle(d), [IDLE_MS] * N_IDLE, True, dict(x=32, y=63, meaning='bottom-centre of the 64x64 frame = centre-bottom of his map cell'),
        [1, 1], [[0, 0]], f'Idle facing {d}: 1-px chest/head breath (legs planted), crystal sheen band sweeps once per loop. Native 64 px, not scaled.')
for d in ('down', 'up', 'left', 'right'):
    add(f'ondravel_ow_turn_{d}', turn(d), [150] * 16, True, dict(x=32, y=63, meaning='bottom-centre of frame = centre-bottom of map cell'),
        [1, 1], [[0, 0]], f'Look-around loop based on facing {d}: holds {d}, glances {CCW[d]}, back, glances {CW[d]}, back. Snap turns (4 facings only, no diagonals exist in the source art).')
rf, rms = reveal()
add('ondravel_reveal', rf, rms, False, dict(x=32, y=63, meaning='bottom-centre of frame = centre-bottom of map cell'), [1, 1], [[0, 0]],
    'One-shot before the summit face-off: water ring wells up, body rises behind a bright waterline, antler glints, settles. Last frame == idle_down f0; then play idle_down.')
add('ondravel_tank_water_loop', tank_loop(), [140] * 24, True, dict(x=0, y=0, meaning="top-left of frame = top-left px of anchor tile 12306's map cell (x0*64, y0*64)"),
    [6, 5], None, 'Water + bubbles for the intact crystal tank (12306, 6x5). Inside the existing glass mask only. Draw on decoration_fx layer with/under ovl_ondravel_tank; Ondravel draws above.',
    kind='tile-overlay', scale=2, em=True)

REG = []; contact_rows = []
for an in ANIMS:
    n = an['name']; d = f'{OUT}/{n}'; os.makedirs(d, exist_ok=True); fr = an['frames']; sc = an['scale']
    for f in fr:
        u = set(keyhex(f)[f[..., 3] > 0]); assert u <= PALS, (n, u - PALS); assert set(np.unique(f[..., 3])) <= {0, 255}, n
    gfr = [up(f, sc) for f in fr]; fw, fh = gfr[0].shape[1], gfr[0].shape[0]
    assert fw % 64 == 0 and fh % 64 == 0
    if an['kind'] == 'tile-overlay':
        assert all(not (f[..., 3] > 0)[~GM].any() for f in fr), 'px outside glass'
        rd, bg = score_tank(fr, tankbase()); cover = [[x, y] for y in range(5) for x in range(6) if any(f[y*32:(y+1)*32, x*32:(x+1)*32, 3].any() for f in fr)]
        an['cover'] = cover; bgs = {'tank_tile': rd}; bgimg = bg; worst_bg = 'tank_tile'
    else:
        bgs = {}; imgs = {}
        for b in QA_BG: bgs[b], imgs[b] = score_ow(gfr, b)
        worst_bg = min(bgs, key=lambda b: bgs[b]['night']['mean']); rd = bgs[worst_bg]; bgimg = imgs['grass_0']
        cov = np.zeros((fh // 64, fw // 64), bool)
        for f in gfr:
            for y in range(cov.shape[0]):
                for x in range(cov.shape[1]): cov[y, x] |= f[y*64:(y+1)*64, x*64:(x+1)*64, 3].any()
        an['cover'] = [[int(x), int(y)] for y, x in np.argwhere(cov)]
    art = n.endswith('_loop')
    cols = min(len(fr), max(1, 2048 // fw)); rows = math.ceil(len(fr) / cols)
    sheet = np.zeros((rows * fh, cols * fw, 4), 'uint8')
    for i, f in enumerate(gfr): sheet[(i // cols) * fh:(i // cols + 1) * fh, (i % cols) * fw:(i % cols + 1) * fw] = f
    Image.fromarray(sheet, 'RGBA').save(f'{d}/{n}.png', optimize=True)
    if sc > 1:
        s1 = np.zeros((rows * fh // sc, cols * fw // sc, 4), 'uint8')
        for i, f in enumerate(fr): s1[(i // cols) * (fh // sc):(i // cols + 1) * (fh // sc), (i % cols) * (fw // sc):(i % cols + 1) * (fw // sc)] = f
        Image.fromarray(s1, 'RGBA').save(f'{d}/{n}_art1x.png', optimize=True); assert (up(s1, sc) == sheet).all()
    # gif preview over day background, x3 for overworld, x1 for tank
    k = 3 if sc == 1 else 1
    ims = [Image.fromarray(up(comp(bgimg if sc == 1 else snap(tankbase()), f)[..., :3], k)) for f in gfr]
    ims[0].save(f'{d}/{n}_preview.gif', save_all=True, append_images=ims[1:], duration=an['ms'], loop=0 if an['loop'] else 1, disposal=1)
    meta = dict(name=n, kind=an['kind'], status='DRAFT - needs Gary approval before wiring', sheet=f'{n}.png', frame_w=fw, frame_h=fh, frames=len(fr), cols=cols, rows=rows,
                layout='row-major frames', ms=an['ms'], total_ms=sum(an['ms']), loop=an['loop'], anchor=an['anchor'], tile_px=64, art_px_scale=sc,
                footprint_tiles=an['footprint'], covered_squares=an['cover'], collision_squares=an['cover'] if an['kind'] == 'overworld' else [],
                notes=an['notes'], readability=bgs, readability_rule='px with |dLuma|>=28 vs ToD-graded background under them (sprite LUT; tank: tile snapped to palette, lit LUT for night-glow colours); pass >= 0.5 per phase',
                night_readability_worst_bg=rd['night']['mean'], night_worst_frame=rd['night']['worst_frame'], readability_min_all_phases=min(v['mean'] for v in rd.values()),
                seam_ratio=seam(fr) if an['loop'] else None, tex_bytes_rgba=int(sheet.size), png_bytes=os.path.getsize(f'{d}/{n}.png'),
                avg_opaque_px_per_frame=int(np.mean([(f[..., 3] > 0).sum() for f in gfr])))
    if sc > 1:
        meta.update(art_sheet=f'{n}_art1x.png', art_tex_bytes_rgba=int(sheet.size // sc // sc), tile_ids=[12306 + i for i in range(30)], anchor_tile_id=12306,
                    phase_offsets_frames=[0, 15, 6, 21, 12, 9], phase_rule='frame = (floor(t_ms/ms) + phase_offsets_frames[(7*x0+3*y0)%6]) % frames (same rule as ovl_ondravel_tank)')
    json.dump(meta, open(f'{d}/{n}.json', 'w'), indent=1); REG.append(meta)
    # contact rows: 4 key frames x 4 phases
    keys = sorted(set(int(round(j * (len(fr) - 1) / 3)) for j in range(4)))
    row = []
    for ph in PH:
        if sc == 1: g = [comp(grade(bgimg, ph, 'tile'), grade(f, ph, 'sprite')) for f in (gfr[j] for j in keys)]
        else:
            bb = grade(snap(tankbase()), ph, 'tile'); g = []
            for j in keys:
                f2 = gfr[j]; e = emask(f2); g.append(comp(bb, grade(grade(f2, ph, 'lit', e), ph, 'sprite', ~e))[::2, ::2])
        row.append((ph, g))
    contact_rows.append((n, row, rd['night']['mean']))
    print(f"{n:28s} {len(fr):2d}f night={rd['night']['mean']:.3f} (worst bg {worst_bg}, worst frame {rd['night']['worst_frame']}) min={meta['readability_min_all_phases']}")

# contact sheet: one row per anim, 4 phases x key frames
S = 2; cw = 64 * S; pad = 6; lab = 200
def cell(img): return Image.fromarray(img[..., :3]).resize((img.shape[1] * S if img.shape[1] <= 64 else 192 * 1, img.shape[0] * S if img.shape[0] <= 64 else 160), Image.NEAREST)
rws = []
for n, row, nt in contact_rows:
    cells = [[cell(x) for x in g] for ph, g in row]; h = max(c.size[1] for cs in cells for c in cs)
    wd = lab + sum(sum(c.size[0] + 2 for c in cs) + pad * 2 for cs in cells)
    im = Image.new('RGB', (wd, h + 16), (20, 18, 26)); dr = ImageDraw.Draw(im); dr.text((4, 4), n, fill=(255, 255, 255)); dr.text((4, 18), f'night {nt:.3f}', fill=(200, 230, 255))
    x = lab
    for (ph, _), cs in zip(row, cells):
        dr.text((x, h + 3), ph, fill=(255, 220, 140))
        for c in cs: im.paste(c, (x, 0)); x += c.size[0] + 2
        x += pad * 2
    rws.append(im)
W = max(r.size[0] for r in rws); Ht = sum(r.size[1] + 4 for r in rws) + 24
cs = Image.new('RGB', (W, Ht), (10, 8, 14)); ImageDraw.Draw(cs).text((6, 6), 'Ondravel anim v1 DRAFT - key frames at dawn | day | dusk | night (overworld over grass_0 (summit camp floor), tank over tile 12306 snapped)', fill=(255, 255, 255)); y = 24
for r in rws: cs.paste(r, (0, y)); y += r.size[1] + 4
cs.save(f'{OUT}/contact_sheet.png', optimize=True)
json.dump({m['name']: dict(night=m['night_readability_worst_bg'], min=m['readability_min_all_phases'], frames=m['frames'], ms=m['ms'][0], loop=m['loop'], covered=m['covered_squares']) for m in REG}, open(f'{OUT}/index.json', 'w'), indent=1)
