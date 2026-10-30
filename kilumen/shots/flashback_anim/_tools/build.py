#!/usr/bin/env python3
"""Wellspire ending anims (Animator, Oct 29 2026). Deterministic. numpy + Pillow only.
Draws at ART px (Ondravel's native 128 battle grid), upscales nearest x2 (tank/props: 64-px tile = 32 art px)
or x4 (summit "towering" sprite). Palette = art/palette/kilumen.hex, alpha 0/255.
Reuses /workspace/kilumen/art/characters/pixel/fx_extra/_tools/fxx_lib.py (grade, lum) read-only."""
import sys, os, json, math, random
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/fx_extra/_tools')
from fxx_lib import grade, lum, PH
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
WT = os.path.abspath(os.path.join(OUT, '..', '..'))
PAL = [l.strip().lower() for l in open('/workspace/kilumen/art/palette/kilumen.hex') if l.strip()]
NIGHT_GLOW = {'fcd668', 'e8ce92', 'ecdec4', 'f8eabe', '603096', '8a4ace', 'b076ec', 'd6acff'}
def C(h): return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)] + [255], 'uint8')
INK = '1a1226'
SRC = np.array(Image.open(WT + '/art/characters/pixel/creatures/ondravel/battle/ondravel_front_128.png').convert('RGBA'))
HEAD = (49, 45)   # forehead crystal on the native 128 art (same point make_sprite.py uses, /2)

# ---------- drawing ----------
def blank(w, h): return np.zeros((h, w, 4), 'uint8')
def px(a, x, y, h):
    if 0 <= x < a.shape[1] and 0 <= y < a.shape[0]: a[int(y), int(x)] = C(h)
def rect(a, x0, y0, x1, y1, h):
    x0, y0 = max(0, int(x0)), max(0, int(y0)); x1, y1 = min(a.shape[1], int(x1)), min(a.shape[0], int(y1))
    if x1 > x0 and y1 > y0: a[y0:y1, x0:x1] = C(h)
def line(a, x0, y0, x1, y1, h):
    x0, y0, x1, y1 = map(int, map(round, (x0, y0, x1, y1))); dx, dy = abs(x1-x0), -abs(y1-y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1); e = dx + dy
    while True:
        px(a, x0, y0, h)
        if x0 == x1 and y0 == y1: break
        e2 = 2*e
        if e2 >= dy: e += dy; x0 += sx
        if e2 <= dx: e += dx; y0 += sy
def paste(dst, src, x, y):
    h, w = src.shape[:2]; x, y = int(x), int(y)
    sx0, sy0 = max(0, -x), max(0, -y); dx0, dy0 = max(0, x), max(0, y)
    w2 = min(w - sx0, dst.shape[1] - dx0); h2 = min(h - sy0, dst.shape[0] - dy0)
    if w2 <= 0 or h2 <= 0: return dst
    s = src[sy0:sy0+h2, sx0:sx0+w2]; m = s[..., 3] > 0; dst[dy0:dy0+h2, dx0:dx0+w2][m] = s[m]; return dst
def spark(a, x, y, core='f4e2ff', ink=True):   # tiny particle with 1px INK outline (checklist rule)
    if ink:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if 0 <= x+dx < a.shape[1] and 0 <= y+dy < a.shape[0] and a[y+dy, x+dx, 3] == 0: px(a, x+dx, y+dy, INK)
    px(a, x, y, core)
def outline_of(m):
    o = np.zeros_like(m)
    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    return o & ~m
def up(a, k): return a.repeat(k, 0).repeat(k, 1)
def keyhex(a):
    return np.array(['%02x%02x%02x' % tuple(c) for c in a[..., :3].reshape(-1, 3)]).reshape(a.shape[:2])

# ---------- Ondravel (on-model: native battle art, only whole-pixel moves) ----------
def ondravel(breath=0, crystal=0.0, rim=None):
    """breath: 0/1 art px (upper body rows 0..72 drop 1 px = inhale squash, feet fixed).
    crystal 0..1 forehead crystal brightness. rim: palette hex for a 1px emissive aura outline or None."""
    s = SRC.copy()
    if breath:
        top = s[:72].copy(); s[:72] = 0; s[breath:72+breath] = np.where(top[..., 3:] > 0, top, s[breath:72+breath])
    x, y = HEAD; y += breath
    ramp = ['603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff']; k = int(round(crystal * 3))
    for dx, dy in ((0, -2), (-1, -1), (0, -1), (1, -1), (-1, 0), (0, 0), (1, 0), (0, 1)): px(s, x+dx, y+dy, ramp[min(4, k)])
    px(s, x, y-1, ramp[min(4, k+1)]); px(s, x-1, y-1, ramp[min(4, k+1)])
    if rim:
        s = np.pad(s, ((2, 2), (2, 2), (0, 0)))
        o = outline_of(s[..., 3] > 0); s[o] = C(rim)
        return s, 2
    return s, 0

# ---------- registry / output ----------
REG = []
def tod_score(frames, em, bg):
    """fxx_lib rule: share of sprite px with |dLuma|>=28 vs the graded background under them, per phase.
    em[i]: bool mask of emissive px (lit grade), rest sprite grade; bg tile-graded."""
    res = {}
    for ph in PH:
        g_bg = grade(bg, ph, 'tile'); lb = lum(g_bg[..., :3].astype(float)); tot = ok = 0; worst = 1
        for f, e in zip(frames, em):
            g = grade(grade(f, ph, 'lit', e), ph, 'sprite', ~e)
            m = f[..., 3] > 0; d = np.abs(lum(g[..., :3].astype(float)) - lb)[m]
            if d.size: worst = min(worst, float((d >= 28).mean()))
            tot += d.size; ok += int((d >= 28).sum())
        res[ph] = dict(mean=round(ok / max(1, tot), 3), worst_frame=round(worst, 3))
    return res
def pair_score(frames, em):
    """opaque screen layers have nothing under them: score colour-change neighbour pairs (halls lesson) per phase."""
    res = {}
    for ph in PH:
        tot = ok = 0; worst = 1
        for f, e in zip(frames, em):
            g = grade(grade(f, ph, 'lit', e), ph, 'sprite', ~e); L = lum(g[..., :3].astype(float)); k = keyhex(f)
            ch = np.concatenate([(k[:, 1:] != k[:, :-1]).ravel(), (k[1:] != k[:-1]).ravel()])
            d = np.concatenate([np.abs(L[:, 1:] - L[:, :-1]).ravel(), np.abs(L[1:] - L[:-1]).ravel()])[ch]
            if d.size: worst = min(worst, float((d >= 28).mean()))
            tot += d.size; ok += int((d >= 28).sum())
        res[ph] = dict(mean=round(ok / max(1, tot), 3), worst_frame=round(worst, 3))
    return res
def emask(f): return np.isin(keyhex(f), list(NIGHT_GLOW)) & (f[..., 3] > 0)
def gridfit(frame, tw, th, T=64):
    a = frame[..., 3] > 0; out = []
    for r in range(th):
        for c in range(tw): out.append(round(float(a[r*T:(r+1)*T, c*T:(c+1)*T].mean()), 3))
    edges = dict(left=bool(a[:, 0].any()), right=bool(a[:, -1].any()), bottom=bool(a[-1].any()))
    return dict(per_tile_fill=out, min_tile_fill=min(out), touches=edges)
def seam(frames):
    d = [float(np.mean(frames[i].astype(int) != frames[(i+1) % len(frames)].astype(int))) for i in range(len(frames))]
    inner = max(d[:-1]) if len(d) > 1 else 0; return round(d[-1] / max(1e-6, inner), 2)

def save(name, frames_art, scale, ms, loop, footprint, bg_hex, kind, notes, gif_scale=1, bg_grid=True, max_w=4096):
    frames = [up(f, scale) for f in frames_art]
    for f in frames:   # palette + 1-bit alpha guard
        f[f[..., 3] < 128] = 0; f[f[..., 3] >= 128, 3] = 255
        bad = set(np.unique(keyhex(f)[f[..., 3] > 0])) - set(PAL); assert not bad, (name, bad)
    H, W = frames[0].shape[:2]; n = len(frames); cols = max(1, min(n, max_w // W)); rows = math.ceil(n / cols)
    sheet = np.zeros((rows * H, cols * W, 4), 'uint8')
    for i, f in enumerate(frames): sheet[(i//cols)*H:(i//cols+1)*H, (i % cols)*W:(i % cols+1)*W] = f
    d = OUT + '/' + name; os.makedirs(d, exist_ok=True)
    Image.fromarray(sheet).save(f'{d}/{name}.png', optimize=True)
    art = np.zeros((rows * H // scale, cols * W // scale, 4), 'uint8')   # light option: native art px, engine scales xN nearest
    art[...] = sheet[::scale, ::scale]; Image.fromarray(art).save(f'{d}/{name}_art1x.png', optimize=True)
    assert (up(art, scale) == sheet).all(), name
    # background for readability: lab floor / summit rock / sky, flat palette tiles with a 1px seam line per 64 px
    bg = np.zeros((H, W, 4), 'uint8'); bg[...] = C(bg_hex)
    if bg_grid: bg[::64] = C('29252b'); bg[:, ::64] = C('29252b')
    if isinstance(ms, int): ms = [ms] * n
    em = [emask(f) for f in frames]
    meta = dict(name=name, kind=kind, sheet=f'{name}.png', frame_w=W, frame_h=H, frames=n, cols=cols, rows=rows,
                ms=ms, total_ms=sum(ms), loop=loop, mode='loop' if loop else 'one-shot',
                footprint_tiles=footprint, tile_px=64, art_px_scale=scale,
                anchor=dict(x=W // 2, y=H, meaning='bottom-centre of footprint (feet / base line)'),
                emissive='px whose colour is one of the 8 night-glow colours: draw with lit LUT, rest with sprite LUT',
                tex_bytes_rgba=int(sheet.shape[0] * sheet.shape[1] * 4), art_sheet=f'{name}_art1x.png',
                art_tex_bytes_rgba=int(sheet.shape[0] * sheet.shape[1] * 4 // scale // scale), png_bytes=os.path.getsize(f'{d}/{name}.png'),
                notes=notes)
    meta['readability'] = pair_score(frames, em) if kind == 'screen-layer' else tod_score(frames, em, bg)
    meta['readability_rule'] = ('colour-change neighbour pairs with |dLuma|>=28 after grade' if kind == 'screen-layer' else 'sprite px with |dLuma|>=28 vs graded background under them') + '; pass >= 0.5 per phase'
    meta['readability_min'] = min(v['mean'] for v in meta['readability'].values())
    meta['readability_worst_frame'] = min(v['worst_frame'] for v in meta['readability'].values())
    if loop: meta['seam_ratio'] = seam(frames)
    if footprint and kind == 'prop': meta['gridfit'] = gridfit(frames[0], *footprint)
    json.dump(meta, open(f'{d}/{name}.json', 'w'), indent=1)
    # GIF preview (on the day background so it reads like in-game)
    gf = []
    for f in frames:
        im = bg.copy(); paste(im, f, 0, 0); gf.append(Image.fromarray(up(im, gif_scale)[..., :3]))
    gf[0].save(f'{d}/{name}_preview.gif', save_all=True, append_images=gf[1:], duration=ms, loop=0 if loop else 1, disposal=1)
    # contact sheet: all frames (day) + key frames in dawn/day/dusk/night
    cs_scale = max(1, 256 // max(W, H)) if max(W, H) < 256 else 1
    pad = 4; key = sorted(set([0, n // 4, n // 2, (3 * n) // 4, n - 1]))
    tw, th = W * cs_scale, H * cs_scale
    ncol = min(n, 8); nrow1 = math.ceil(n / ncol)
    CW = max(ncol, len(PH)) * (tw + pad) + pad; CH = 18 + nrow1 * (th + pad) + 14 + len(key) * (th + pad) + pad
    cs = Image.new('RGB', (max(CW, len(key) * 0 + 4 * (tw + pad) + pad), CH), (20, 18, 26)); dr = ImageDraw.Draw(cs)
    dr.text((4, 3), f"{name}  {W}x{H}  {n}f  {'loop' if loop else 'one-shot'}  readability min {meta['readability_min']}", fill=(255, 255, 255))
    y0 = 18
    for i, f in enumerate(frames):
        im = bg.copy(); paste(im, f, 0, 0); cs.paste(Image.fromarray(up(im, cs_scale)[..., :3]), (pad + (i % ncol) * (tw + pad), y0 + (i // ncol) * (th + pad)))
    y0 += nrow1 * (th + pad); dr.text((4, y0), '   '.join(f"{ph} {meta['readability'][ph]['mean']}" for ph in PH), fill=(255, 255, 255)); y0 += 14
    for r, i in enumerate(key):
        for c, ph in enumerate(PH):
            g = grade(grade(frames[i], ph, 'lit', em[i]), ph, 'sprite', ~em[i]); im = grade(bg, ph, 'tile'); paste(im, g, 0, 0)
            cs.paste(Image.fromarray(up(im, cs_scale)[..., :3]), (pad + c * (tw + pad), y0 + r * (th + pad)))
    cs.save(f'{d}/contact_sheet_{name}.png')
    meta['_first'] = frames[0]; meta['_night'] = None; meta['_bg'] = bg; meta['_em0'] = em[0]
    REG.append(meta); print(name, W, H, n, meta['readability_min'], meta.get('seam_ratio'), meta.get('gridfit', {}).get('min_tile_fill'))

# ================= 1. crystal tank (5x6 tiles, art 160x192) =================
TW, TH = 160, 192; GX0, GX1, GY0, GY1 = 18, 142, 26, 166
WATER = ['2c64a8', '4692ce', '7ac2e8', 'c6ecfa']
def tank_base(a, t, broken=False):
    # plinth (top face light, front face 1-2 steps darker, ink outline, emissive light strip)
    rect(a, 4, 166, 156, 192, INK); rect(a, 6, 166, 154, 172, 'ccc6c2'); rect(a, 6, 172, 154, 190, 'a8a0a4'); rect(a, 130, 172, 154, 190, '827a84')
    rect(a, 0, 184, 160, 192, INK); rect(a, 2, 184, 158, 191, '827a84'); rect(a, 2, 184, 158, 185, 'a8a0a4')
    k = 0.5 - 0.5 * math.cos(2 * math.pi * t); strip = ['603096', '8a4ace', 'b076ec', 'd6acff'][int(round(k * 3))]
    rect(a, 14, 177, 146, 180, INK); rect(a, 15, 178, 145, 179, strip if not broken else '603096')
    for x in range(20, 142, 16): rect(a, x, 178, x + 4, 179, 'f4e2ff' if (not broken and k > 0.6) else strip)
    # top cap
    if not broken:
        rect(a, 8, 10, 152, 28, INK); rect(a, 10, 10, 150, 16, 'ccc6c2'); rect(a, 10, 16, 150, 27, 'a8a0a4'); rect(a, 128, 16, 150, 27, '827a84')
        rect(a, 10, 21, 150, 23, INK); rect(a, 11, 22, 149, 22, strip)
def tubes(a, t, broken=False):
    # side tubes: glass pipes from the cap down to the plinth with violet pulses (spacing 24, travel 24/loop)
    for x0 in (2, 150):
        top = 0 if not broken else 120
        rect(a, x0, top, x0 + 8, 168, INK); rect(a, x0 + 1, top, x0 + 7, 168, '4a70ba'); rect(a, x0 + 1, top, x0 + 2, 168, '7ac2e8')
        for y in range(top, 168, 24):
            yy = top + ((y - top + int(round(t * 24))) % (168 - top))
            if broken: continue
            rect(a, x0 + 2, yy, x0 + 6, yy + 6, '8a4ace'); rect(a, x0 + 3, yy + 1, x0 + 5, yy + 5, 'd6acff'); px(a, x0 + 4, yy + 2, 'f4e2ff')
        rect(a, x0 - 1, 156, x0 + 9, 168, INK); rect(a, x0, 157, x0 + 8, 167, 'a8a0a4')      # collar
        if not broken: rect(a, x0, 0, x0 + 8, 2, INK)
    if not broken:   # top elbows into the cap
        rect(a, 2, 0, 160, 8, INK); rect(a, 2, 1, 158, 7, '4a70ba'); rect(a, 2, 1, 158, 2, '7ac2e8')
        for x in range(4, 156, 20):
            xx = 4 + ((x - 4 + int(round(t * 20))) % 152); rect(a, xx, 2, xx + 6, 6, '8a4ace'); rect(a, xx + 1, 3, xx + 5, 5, 'd6acff')
        rect(a, 74, 6, 86, 12, INK); rect(a, 75, 6, 85, 11, 'a8a0a4')
def water(a, t, level=GY0 + 2):
    rect(a, GX0, level, GX1, GY1, '3e9c92')
    for i, x in enumerate(range(GX0, GX1, 12)):                 # shimmer columns, slide 12 px / loop
        xx = GX0 + ((x - GX0 + int(round(t * 12))) % (GX1 - GX0)); rect(a, xx, level, xx + 2, GY1, '246e6c' if i % 2 else '70cab8')
    # caustic band near surface moving down 8 px / loop
    for y in range(level + 2, GY1, 24):
        yy = level + ((y - level + int(round(t * 24))) % max(1, GY1 - level))
        for x in range(GX0, GX1, 2): px(a, x, yy + (x // 6) % 2, '70cab8')
    rect(a, GX0, level, GX1, level + 1, 'c6ecfa')
def glass(a, t, cracks=None):
    # crystal walls: faceted violet rim + front highlights drawn OVER Ondravel (reads as behind glass)
    for y in range(GY0, GY1):
        px(a, GX0 - 3, y, INK); px(a, GX0 - 2, y, 'd6acff'); px(a, GX0 - 1, y, 'b076ec')
        px(a, GX1, y, '8a4ace'); px(a, GX1 + 1, y, '603096'); px(a, GX1 + 2, y, INK)
    for y in range(GY0, GY1, 28):   # facet seams
        for x in range(GX0, GX0 + 6): px(a, x, y + (x - GX0), 'd6acff')
        for x in range(GX1 - 6, GX1): px(a, x, y + (GX1 - x), 'b076ec')
    sweep = GY0 + int(round(t * (GY1 - GY0)))             # shimmer glint travelling down the left highlight (seamless)
    for y in range(GY0, GY1):
        px(a, GX0 + 4, y, 'd6acff' if (y // 3) % 3 else 'f4e2ff')
        if abs(y - sweep) < 10 or abs(y - sweep + (GY1 - GY0)) < 10: px(a, GX0 + 5, y, 'f4e2ff'); px(a, GX0 + 9, y, 'd6acff')
    for y in range(GY0 + 10, GY1 - 30): px(a, GX1 - 8, y, 'd6acff') if (y // 4) % 2 else None
    if cracks:
        for (x0, y0, x1, y1) in cracks: line(a, x0 + 1, y0, x1 + 1, y1, INK); line(a, x0, y0, x1, y1, 'f4e2ff')
BUB = [(random.Random(i).randint(GX0 + 4, GX1 - 6), random.Random(i * 7).randint(0, 47), random.Random(i * 3).randint(GY0 + 50, GY1 - 4)) for i in range(16)]
def bubbles(a, t, top=GY0):
    for i, (x, ph, ybase) in enumerate(BUB):
        y = ybase - ((ph + int(round(t * 48))) % 48)
        if y <= top + 2: continue
        x += int(round(math.sin(2 * math.pi * (t + i / 7)) * 1))
        if i % 3 == 0:   # 3x3 ring
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): px(a, x + dx, y + dy, 'c6ecfa')
            px(a, x - 1, y - 1, 'f4e2ff')
        else: spark(a, x, y, 'c6ecfa', ink=False); px(a, x, y - 1, '7ac2e8')

def tank_idle_frame(i, n):
    t = i / n; a = blank(TW, TH); tubes(a, t); tank_base(a, t); water(a, t)
    bob = int(round(1.5 * math.sin(2 * math.pi * t)))
    s, o = ondravel(breath=int(round(0.5 - 0.5 * math.cos(2 * math.pi * t))), crystal=0.35 + 0.35 * math.sin(2 * math.pi * t), rim='603096')
    bubbles(a, (t + 0.5) % 1)
    paste(a, s, 80 - 64 - o, 32 + bob - o); bubbles(a, t); glass(a, t); return a
n = 12; tank_idle = [tank_idle_frame(i, n) for i in range(n)]
save('ondravel_tank_idle', tank_idle, 2, 110, True, [5, 6], '3e3a48', 'cutscene-prop',
     'Sealed Guardian: slight float (+-1.5 art px), breath, forehead crystal pulse, bubbles (48 px lanes), shimmer glint, tube pulses.')

# release one-shot
rr = random.Random(11)
def crack_set(k):
    segs = []; rnd = random.Random(5); pts = [(52, 70)]
    for step in range(k):
        new = []
        for (x, y) in pts:
            for b in range(2):
                ang = rnd.uniform(0, 2 * math.pi); L = rnd.randint(8, 18)
                x1 = min(GX1 - 2, max(GX0 + 2, x + int(L * math.cos(ang)))); y1 = min(GY1 - 2, max(GY0 + 2, y + int(L * math.sin(ang))))
                segs.append((x, y, x1, y1)); new.append((x1, y1))
        pts = new[:6]
    return segs
SH = [(rr.randint(GX0 - 2, GX1 + 2), rr.randint(GY0, GY1), rr.uniform(-3.5, 3.5), rr.uniform(-4, 0.5), rr.choice([2, 3, 4]), rr.choice(['d6acff', 'b076ec', 'f4e2ff', '8a4ace'])) for _ in range(46)]
def shards(a, k):
    for (x, y, vx, vy, s, col) in SH:
        X = int(x + vx * k * 3 + (1 if x > 80 else -1) * k * 1.5); Y = int(y + vy * k * 3 + 0.9 * k * k)
        if Y > 184: Y = 184 + (hash((x, y)) % 5)
        rect(a, X - 1, Y - 1, X + s + 1, Y + s, INK); rect(a, X, Y, X + s, Y + s - 1, col); px(a, X, Y, 'f4e2ff')
def release():
    fr, ms = [], []
    ST = 168 - 126   # standing y on the plinth (feet row 125)
    for i in range(4):          # cracks spread, tubes stutter
        t = i / 12; a = blank(TW, TH); tubes(a, t); tank_base(a, t); water(a, t)
        s, o = ondravel(crystal=0.5 + i * 0.15, rim='8a4ace'); paste(a, s, 16 - o, 32 - o); bubbles(a, t)
        glass(a, t, crack_set(i + 1)); fr.append(a); ms.append(140 if i else 300)
    a = fr[-1].copy(); m = a[..., 3] > 0                       # flash: inner glass blazes
    rect(a, GX0, GY0, GX1, GY1, 'f4e2ff'); s, o = ondravel(crystal=1, rim='d6acff'); paste(a, s, 16 - o, 32 - o)
    glass(a, 0, crack_set(4)); fr.append(a); ms.append(70)
    for k in range(1, 11):     # shatter + drain + drop
        a = blank(TW, TH); tubes(a, 0, broken=True); tank_base(a, 0.5, broken=True)
        lvl = min(GY1, GY0 + 2 + int((GY1 - GY0) * min(1, k / 7) ** 1.3))
        if lvl < GY1 - 1:
            water(a, k / 10, lvl)
        for x0 in (GX0 - 4, GX1):   # spill sheets over the plinth sides
            if k < 9:
                rect(a, x0, 166, x0 + 4, 184, '4692ce'); rect(a, x0 + 1, 166 + (k * 5) % 12, x0 + 2, 172 + (k * 5) % 12, 'c6ecfa')
        pw = min(80, 10 + k * 8); rect(a, 80 - pw, 186, 80 + pw, 190, '4692ce'); rect(a, 80 - pw + 3, 187, 80 + pw - 3, 188, '7ac2e8')
        y = 32 + int((ST - 32) * min(1, k / 7) ** 2)
        s, o = ondravel(breath=1 if k == 8 else 0, crystal=1 if k > 6 else 0.7, rim='b076ec' if k < 8 else 'd6acff')
        paste(a, s, 16 - o, y - o)
        for x in range(GX0 - 3, GX1 + 3, 3):   # jagged glass stumps on the plinth
            h = 2 + (x * 7) % 6; rect(a, x, 166 - h, x + 2, 166, INK); rect(a, x, 167 - h, x + 1, 166, 'b076ec')
        shards(a, k); fr.append(a); ms.append(80 if k < 8 else 100)
    for j in range(6):         # freed: forehead crystal flares, motes rise, breath
        a = fr[-1].copy() if j == 0 else base.copy()
        if j == 0:
            base = blank(TW, TH); tubes(base, 0, broken=True); tank_base(base, 0.5, broken=True)
            rect(base, 0, 186, 160, 190, '4692ce'); rect(base, 6, 187, 154, 188, '7ac2e8')
            for x in range(GX0 - 3, GX1 + 3, 3):
                h = 2 + (x * 7) % 6; rect(base, x, 166 - h, x + 2, 166, INK); rect(base, x, 167 - h, x + 1, 166, 'b076ec')
            for (x, y, vx, vy, s_, col) in SH[::3]: X = int(x + vx * 30) % 150 + 4; rect(base, X, 182, X + 2, 184, col)
            a = base.copy()
        s, o = ondravel(breath=j % 2, crystal=1, rim=['d6acff', 'b076ec', 'd6acff', 'b076ec', '8a4ace', '8a4ace'][j]); paste(a, s, 16 - o, ST - o)
        mr = random.Random(9)
        for q in range(18):
            x = mr.randint(20, 140); y = mr.randint(60, 160) - j * 8
            if y > 30: spark(a, x, y, 'd6acff' if q % 3 else 'f8eabe')
        fr.append(a); ms.append(120 if j < 5 else 900)
    return fr, ms
rf, rms = release()
save('ondravel_tank_release', rf, 2, rms, False, [5, 6], '3e3a48', 'cutscene-prop',
     'One-shot: crack spread 4f, flash 1f, shatter/drain/drop 10f, freed 6f (last frame held 900 ms = end pose; then swap to OW ondravel_big_sheet row 1).')

# ================= 2. towering Ondravel at the summit (x4) =================
SW, SHh = 144, 144
MOTE = [(random.Random(i).randint(4, 140), random.Random(i * 5).randint(0, 63), random.Random(i * 13).randint(70, 140)) for i in range(20)]
def summit_frame(i, n):
    t = i / n; a = blank(SW, SHh)
    br = int(round(0.5 - 0.5 * math.cos(2 * math.pi * t)))
    rims = ['603096', '8a4ace', 'b076ec', 'd6acff', 'b076ec', '8a4ace', '603096', '603096']
    s, o = ondravel(breath=br, crystal=0.5 + 0.5 * math.sin(2 * math.pi * t), rim=rims[i % 8])
    paste(a, s, 72 - 64 - o, SHh - 126 - o - 1)
    for k, (x, ph, yb) in enumerate(MOTE):      # frost/crystal motes rising 64 px per loop (seamless)
        y = yb - ((ph + int(round(t * 64))) % 64); x2 = x + int(round(math.sin(2 * math.pi * (t + k / 5))))
        spark(a, x2, y, ['d6acff', 'f8eabe', 'b076ec'][k % 3])
    return a
summit = [summit_frame(i, 8) for i in range(8)]
save('ondravel_summit_tower', summit, 4, 140, True, [9, 9], 'a8a0a4', 'sprite',
     'Towering Guardian at the Wellspire summit (4x art px). Breath, forehead crystal pulse, aura rim cycle, frost motes. Ground shadow comes from the engine depth pass (no baked translucency).')

# ================= cloud split (screen layer, art 192x96 x2 = 384x192) =================
CW_, CH_ = 192, 96
STARS = [(random.Random(i).randint(0, 191), random.Random(i * 11).randint(0, 70), i % 4) for i in range(40)]
def sky(a, t):
    rect(a, 0, 0, CW_, CH_, '342842'); rect(a, 0, 78, CW_, CH_, '8a4ace'); rect(a, 0, 88, CW_, CH_, 'b076ec')
    for (x, y, k) in STARS:
        ph = (k / 4 + t) % 1; c = ['8a4ace', 'b076ec', 'd6acff', 'f8eabe'][int(ph * 4) % 4]; px(a, x, y, c)
        if ph < 0.25: px(a, x - 1, y, 'b076ec'); px(a, x + 1, y, 'b076ec')
def beam(a, w, t):
    cx = CW_ // 2
    for y in range(CH_):
        ww = int(w * (0.5 + y / CH_ * 0.7)) + int(round(math.sin(2 * math.pi * (t + y / 24))))
        if ww <= 0: continue
        rect(a, cx - ww, y, cx + ww, y + 1, 'e8ce92'); rect(a, cx - ww // 2, y, cx + ww // 2, y + 1, 'f8eabe')
        px(a, cx - ww - 1, y, 'fcd668'); px(a, cx + ww, y, 'fcd668')
def cloud_half(a, edge, side, t):
    """puffy cloud banks from the screen edge to `edge` (scalloped tops, rounded lobes on the inner edge, rim-lit by the beam).
    t only moves the billow phase -> seamless loop."""
    H, W = a.shape[:2]; X = np.arange(W)[None, :]; Y = np.arange(H)[:, None]
    for band, (y0, y1) in enumerate(((-6, 30), (20, 60), (50, 90), (78, 110))):
        ph = 2 * math.pi * (t + band / 3)
        top = y0 + 4 * np.abs(np.sin(X / (9 + band * 2) + band)) + 1.5 * np.sin(ph + X / 13)
        cy = (y0 + y1) / 2; prof = np.sqrt(np.clip(1 - ((Y - cy) / ((y1 - y0) / 2 + 1e-6)) ** 2, 0, 1))
        lobes = 10 * prof + 3 * np.sin(Y / 5 + band * 2 + ph)
        inner = edge + (lobes if side < 0 else -lobes) + (band % 2) * 8 * (1 if side < 0 else -1)
        m = (Y >= top) & (Y < y1) & ((X < inner) if side < 0 else (X >= inner))
        rel = (Y - top) / (y1 - y0)
        body = m & (rel < 0.62); under = m & (rel >= 0.62)
        a[body] = C('ccc6c2'); a[under] = C('827a84')
        hi = m & ~np.roll(m, 1, 0); hi |= m & ~np.roll(m, 2, 0); a[hi] = C('ecdec4')           # sunlit tops
        sh = (-1 if side < 0 else 1); rim = m & ~np.roll(m, sh, 1); rim2 = m & ~np.roll(m, 2 * sh, 1) & ~rim
        a[rim2] = C('827a84'); a[rim] = C('fcd668')  # beam-side rim with a shadow line inside (reads day AND night)
        lo = under & ~np.roll(m, -1, 0); a[lo] = C('5e5866') if False else a[lo]
def cloud_frame(open_k, t, beamw):
    a = blank(CW_, CH_); sky(a, t)
    if beamw > 0: beam(a, beamw, t)
    e = int(CW_ // 2 * (1 - open_k)); cloud_half(a, CW_ // 2 - (CW_ // 2 - e) - 0 if False else e, -1, t); cloud_half(a, CW_ - e, 1, t)
    return a
split, sms = [], []
for i in range(14):
    k = 0 if i < 3 else 1 - (1 - (i - 3) / 10) ** 3 if i < 13 else 1
    k = min(1, k) * 0.62
    beamw = 0 if i < 2 else min(16, 2 + (i - 2) * 2)
    f = cloud_frame(k, 0, beamw)
    if i == 2: rect(f, CW_ // 2 - 1, 0, CW_ // 2 + 1, CH_, 'f8eabe')   # first crack of light
    split.append(f); sms.append([260, 120, 90] [i] if i < 3 else 80 if i < 12 else 160)
save('wellspire_cloud_split', split, 2, sms, False, None, '30488c', 'screen-layer',
     'One-shot: clouds part from a thin crack of light, beam widens (ease-out cubic). Ends exactly on frame 0 of wellspire_sky_open_loop.', bg_grid=False)
sky_loop = [cloud_frame(0.62, i / 8, 16) for i in range(8)]
save('wellspire_sky_open_loop', sky_loop, 2, 150, True, None, '30488c', 'screen-layer',
     'Loop after the split: billowing cloud edges, beam ripple, star twinkle.', bg_grid=False)

# ================= 3. lab props (x2, 32 art px per tile) =================
def specimen(i, n):
    t = i / n; a = blank(32, 64)
    rect(a, 0, 52, 32, 64, INK); rect(a, 1, 52, 31, 56, 'ccc6c2'); rect(a, 1, 56, 31, 63, 'a8a0a4'); rect(a, 24, 56, 31, 63, '827a84')
    rect(a, 0, 0, 32, 10, INK); rect(a, 1, 1, 31, 4, 'ccc6c2'); rect(a, 1, 4, 31, 9, 'a8a0a4'); rect(a, 24, 4, 31, 9, '827a84')
    rect(a, 2, 10, 30, 52, INK); rect(a, 3, 10, 29, 52, '3e9c92')
    for y in range(10, 52):
        if (y + int(t * 8)) % 8 < 2: rect(a, 4, y, 28, y + 1, '70cab8')
    k = 0.5 - 0.5 * math.cos(2 * math.pi * t)
    # specimen: curled seed-creature (original), dark body with a glowing core
    cy = 30 + int(round(math.sin(2 * math.pi * t)))
    for (x, y) in [(13, 0), (14, 0), (15, 0), (16, 0), (12, 1), (17, 1), (11, 2), (18, 2), (11, 3), (18, 3), (11, 4), (18, 4), (12, 5), (17, 5), (13, 6), (16, 6), (14, 7), (15, 7), (16, 8), (17, 9), (19, 9)]:
        px(a, x + 1, cy - 4 + y, INK)
    rect(a, 13, cy - 3, 19, cy + 2, '246e6c'); rect(a, 14, cy - 2, 18, cy, '244e34')
    px(a, 16, cy - 1, ['e8ce92', 'fcd668', 'f8eabe'][int(round(k * 2))]); px(a, 15, cy - 2, 'fcd668' if k > 0.5 else 'e8ce92')
    for q in range(5):
        y = 50 - ((q * 9 + int(round(t * 40))) % 40); spark(a, 6 + (q * 5) % 20, y, 'c6ecfa', ink=False)
    for y in range(11, 51): px(a, 5, y, 'c6ecfa' if (y // 3) % 2 else 'f4e2ff')
    px(a, 26, 20, 'd6acff'); px(a, 26, 21, 'd6acff')
    rect(a, 4, 59, 28, 60, ['603096', '8a4ace', 'b076ec', 'd6acff'][int(round(k * 3))])
    return a
save('lab_specimen_tank', [specimen(i, 8) for i in range(8)], 2, 140, True, [1, 2], '3e3a48', 'prop',
     'Glowing specimen tank (original curled seed-creature), 1x2 tiles. Bubbles, liquid bands, core pulse.')
def helix(i, n):
    t = i / n; a = blank(32, 96)
    rect(a, 0, 84, 32, 96, INK); rect(a, 1, 84, 31, 88, 'ccc6c2'); rect(a, 1, 88, 31, 95, 'a8a0a4'); rect(a, 24, 88, 31, 95, '827a84')
    rect(a, 0, 0, 32, 12, INK); rect(a, 1, 1, 31, 5, 'ccc6c2'); rect(a, 1, 5, 31, 11, 'a8a0a4'); rect(a, 24, 5, 31, 11, '827a84')
    rect(a, 0, 12, 4, 84, INK); rect(a, 1, 12, 3, 84, 'a8a0a4'); rect(a, 28, 12, 32, 84, INK); rect(a, 29, 12, 31, 84, '827a84')
    rect(a, 4, 12, 28, 84, '4692ce'); [rect(a, 4, y, 28, y + 1, '7ac2e8') for y in range(14, 84, 10)]
    for y in range(12, 84):
        ph = 2 * math.pi * (y / 24 - t)          # strand turns once per 24 px; one loop = one turn -> seamless
        for s in (0, math.pi):
            x = 16 + int(round(9 * math.sin(ph + s))); front = math.cos(ph + s) > 0
            px(a, x, y, 'f4e2ff' if front else '3a1e60'); px(a, x + 1, y, 'd6acff' if front else '603096')
        if y % 6 == 0:
            xa, xb = 16 + int(round(9 * math.sin(ph))), 16 + int(round(9 * math.sin(ph + math.pi)))
            for x in range(min(xa, xb) + 2, max(xa, xb)): px(a, x, y, '8a4ace')
    for y in range(12, 84): px(a, 6, y, 'c6ecfa')
    k = 0.5 - 0.5 * math.cos(2 * math.pi * t)
    rect(a, 10, 8, 22, 10, ['8a4ace', 'd6acff'][int(k > 0.5)]); rect(a, 10, 86, 22, 88, ['8a4ace', 'd6acff'][int(k <= 0.5)])
    return a
save('lab_helix_column', [helix(i, 12) for i in range(12)], 2, 90, True, [1, 3], '3e3a48', 'prop',
     'Helix energy column, 1x3 tiles. Double strand turns once per loop (24 art px period), rungs, emitter caps pulse.')
def vat(i, n):
    t = i / n; a = blank(64, 32)
    rect(a, 2, 12, 62, 32, INK); rect(a, 3, 12, 61, 15, 'ccc6c2'); rect(a, 3, 15, 61, 31, 'a8a0a4'); rect(a, 48, 15, 61, 31, '827a84')
    rect(a, 0, 26, 64, 32, INK); rect(a, 1, 26, 63, 31, '827a84'); rect(a, 1, 26, 63, 27, 'a8a0a4')
    for x in (12, 32, 52): rect(a, x - 1, 15, x + 1, 26, INK)
    rect(a, 5, 10, 59, 13, INK); rect(a, 6, 11, 58, 12, '70cab8')
    for x in range(6, 58):   # boiling surface ripple, period 8 px, travels 8/loop
        if (x + int(round(t * 8))) % 8 < 2: px(a, x, 11, 'c6ecfa')
    k = 0.5 - 0.5 * math.cos(2 * math.pi * t)
    rect(a, 20, 18, 44, 21, INK); rect(a, 21, 19, 43, 20, ['603096', '8a4ace', 'b076ec', 'd6acff'][int(round(k * 3))])
    for q in range(10):      # cold-vapour droplets (not smoke/fog puffs): rise 10 px / loop
        x = 8 + (q * 13) % 48; y = 9 - ((q * 3 + int(round(t * 10))) % 10)
        spark(a, x + int(round(math.sin(2 * math.pi * (t + q / 4)))), y, 'c6ecfa' if q % 2 else 'f4e2ff')
    return a
save('lab_misting_vat', [vat(i, 10) for i in range(10)], 2, 120, True, [2, 1], '3e3a48', 'prop',
     'Misting vat, 2x1 tiles. Ripple surface, indicator pulse, cold-vapour droplets with ink outline (no smoke/fog puffs, per Gary rule).')

# ================= overview + index =================
cells = []
for m in REG:
    f = m['_first']; sc = max(1, 192 // max(f.shape[:2])) if max(f.shape[:2]) < 192 else 1
    if max(f.shape[:2]) > 400: f = f[::2, ::2]
    em = emask(f); bg = np.zeros_like(f); bg[...] = C('3e3a48' if m['kind'] != 'screen-layer' else '30488c')
    if m['name'] == 'ondravel_summit_tower': bg[...] = C('a8a0a4')
    day = bg.copy(); paste(day, f, 0, 0)
    ng = grade(bg, 'night', 'tile'); g = grade(grade(f, 'night', 'lit', em), 'night', 'sprite', ~em); paste(ng, g, 0, 0)
    cells.append((m['name'], up(day, sc), up(ng, sc), m['readability_min']))
W = sum(max(c[1].shape[1], 140) + 8 for c in cells) + 8; H = max(c[1].shape[0] for c in cells) * 2 + 60
ov = Image.new('RGB', (W, H), (20, 18, 26)); dr = ImageDraw.Draw(ov); x = 8; hh = max(c[1].shape[0] for c in cells)
dr.text((8, 4), 'Kilumen - Wellspire ending anims (frame 0): top = day, bottom = night grade', fill=(255, 255, 255))
for nm, d_, n_, r in cells:
    ov.paste(Image.fromarray(d_[..., :3]), (x, 20)); ov.paste(Image.fromarray(n_[..., :3]), (x, 28 + hh))
    dr.text((x, 34 + 2 * hh), f'{nm[:22]}\nread {r}', fill=(255, 255, 255)); x += max(d_.shape[1], 140) + 8
ov.save(OUT + '/overview.png')
idx = [{k: v for k, v in m.items() if not k.startswith('_')} | dict(dir=m['name'] + '/') for m in REG]
json.dump(dict(generated_by='_tools/build.py', palette='/workspace/kilumen/art/palette/kilumen.hex', tile_px=64, anims=idx), open(OUT + '/index.json', 'w'), indent=1)
