"""Shared helpers for the wild-creature pixel pipeline (Sailquill, Halovy, Gloamtick,
Runeskein, Burlbeetle, Mirewump, Slagrook). Reuses the approved pilot pxlib unchanged
(cutout/snap/quantize/clean/add_outline/place/up/ncolors/find_boxes) and ports the pilot
step2/3/4 helpers (remap, glow, bob, canvas, gif, save_anim, legs_shift, walk_frames,
export_set) with explicit output dirs instead of cwd-relative paths."""
import sys, os
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel_pilot/tools')
from pxlib import cutout, snap, quantize, clean, add_outline, place, up, ncolors, find_boxes  # noqa
import numpy as np
from PIL import Image

ROOT = '/workspace/kilumen/art/characters/pixel'
CRE = ROOT + '/creatures'
WILD = ['sailquill', 'halovy', 'gloamtick', 'runeskein', 'burlbeetle', 'mirewump', 'slagrook']
PAL_PNG = '/workspace/kilumen/art/world/overworld/palette.png'
_w = np.array(Image.open(PAL_PNG).convert('RGBA')).reshape(-1, 4)
PAL = np.unique(_w[_w[:, 3] > 0][:, :3], axis=0).astype(int)
assert len(PAL) == 64, len(PAL)

def rmd(px, pal=PAL):
    rm = (px[:, None, 0] + pal[None, :, 0]) / 2
    dr, dg, db = [(px[:, None, i] - pal[None, :, i]) for i in range(3)]
    return (2 + rm / 256) * dr ** 2 + 4 * dg ** 2 + (2 + (255 - rm) / 256) * db ** 2

def remap(a, exclude=()):
    """pilot step2: redmean nearest palette colour; alpha forced binary.
    exclude: hex colours of the shared palette not to use for this sprite (still palette-only)"""
    a = a.copy(); a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
    keep = np.array(['%02x%02x%02x' % tuple(c) not in exclude for c in PAL]); P = PAL[keep]
    m = a[..., 3] > 0; px = a[m][:, :3].astype(int)
    a[m, :3] = P[rmd(px, P).argmin(1)]; a[~m] = 0; return a

def nearest(c):
    d = ((PAL - np.array(c)) ** 2).sum(1); return tuple(int(v) for v in PAL[d.argmin()])

def snap_pal(a):
    m = a[..., 3] > 0; px = a[m][:, :3].astype(int)
    d = ((px[:, None, :] - PAL[None]) ** 2).sum(-1); a = a.copy(); a[m, :3] = PAL[d.argmin(1)]; return a

def glow(a, level, lava_on=True):
    """brighten lava + violet pixels by level steps (0..2), snapped to palette (pilot).
    lava_on=False: only violet crystals glow (tan/orange fur must not flicker)"""
    if level == 0: return a
    a = a.copy(); m = a[..., 3] > 0; r, g, b = [a[..., i].astype(int) for i in range(3)]
    lava = m & (r > 170) & (r - b > 90) & (g > 50) & lava_on
    vio = m & (b > 140) & (r > 90) & (g < 150) & (b - g > 60)
    for mask, boost in ((lava, (30, 40, 25)), (vio, (28, 22, 18))):
        ys, xs = np.where(mask)
        for y, x in zip(ys, xs):
            c = tuple(min(255, int(a[y, x, i]) + boost[i] * level) for i in range(3)); a[y, x, :3] = nearest(c)
    return a

def bob(a, split, dy):
    H = a.shape[0]; out = a.copy(); upper = a[:split].copy()
    if dy > 0: out[:split] = 0
    tgt = out.copy(); y0 = max(0, dy); y1 = min(H, split + dy)
    src = upper[y0 - dy:y1 - dy]
    region = tgt[y0:y1]; m = src[..., 3] > 0; region[m] = src[m]; tgt[y0:y1] = region
    return tgt

def canvas(spr, W, H, x, y):
    c = np.zeros((H, W, 4), 'uint8'); s = np.array(spr); h, w = s.shape[:2]; m = s[..., 3] > 0
    c[y:y + h, x:x + w][m] = s[m]; return c

def gif(frames, path, ms, scale):
    cols = {}
    for f in frames:
        for c in map(tuple, f[f[..., 3] > 0][:, :3]): cols.setdefault(c, len(cols))
    assert len(cols) < 255, len(cols)
    palette = [v for c in cols for v in c] + [0, 0, 0] * (256 - len(cols)); T = 255
    ims = []
    for f in frames:
        idx = np.full(f.shape[:2], T, 'uint8'); m = f[..., 3] > 0
        idx[m] = [cols[tuple(c)] for c in f[m][:, :3]]
        p = Image.fromarray(idx, 'P'); p.putpalette(palette)
        ims.append(p.resize((p.width * scale, p.height * scale), Image.NEAREST))
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=ms, loop=0, transparency=T, disposal=2)

def save_anim(frames, outdir, name, ms, scale=2):
    os.makedirs(f'{outdir}/{name}', exist_ok=True)
    for i, f in enumerate(frames):
        Image.fromarray(f).save(f'{outdir}/{name}/{name}_f{i}.png')
        up(Image.fromarray(f), scale).save(f'{outdir}/{name}/{name}_f{i}_{scale}x.png')
    H, W = frames[0].shape[:2]; sheet = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(Image.fromarray(f), (i * W, 0))
    sheet.save(f'{outdir}/{name}_sheet.png'); up(sheet, scale).save(f'{outdir}/{name}_sheet_{scale}x.png')
    gif(frames, f'{outdir}/{name}_{scale}x.gif', ms, scale)

def legs_shift(a, top, bot, xsel, dy=0, dx=0, darken=False):
    H, W = a.shape[:2]; out = a.copy()
    ys, xs = np.mgrid[top:bot, 0:W]; sel = xsel(xs) & (a[top:bot, :, 3] > 0)
    out[top:bot][sel] = 0
    ty = ys[sel] + dy; tx = xs[sel] + dx; ok = (ty >= 0) & (ty < H) & (tx >= 0) & (tx < W)
    px = a[top:bot][sel][ok].copy()
    if darken: px[:, :3] = (px[:, :3] * 0.8).astype('uint8')
    out[ty[ok], tx[ok]] = px
    return out

def walk_frames(spr, W, H, legfrac, side, facing, lift=2, stride=2, bodybob=1, sidefrac=0.13, quad=False, hover=False):
    """pilot walk builder. hover=True (legless floaters): whole-body bob + tail sway instead of leg moves"""
    s = np.array(spr); h, w = s.shape[:2]; x0 = (W - w) // 2; y0 = H - h - 2
    base = canvas(spr, W, H, x0, y0); top = y0 + int(h * (1 - legfrac)); bot = H; cx = x0 + w / 2
    if hover:
        def fl(dy, dx):
            a = np.zeros_like(base); src = base
            ys, xs = np.where(src[..., 3] > 0)
            ty = ys + dy; tx = xs.copy()
            low = ys >= top; tx[low] = tx[low] + dx
            ok = (ty >= 0) & (ty < H) & (tx >= 0) & (tx < W)
            a[ty[ok], tx[ok]] = src[ys[ok], xs[ok]]; return a
        return base, [fl(-1, -1), fl(-2, 0), fl(-1, 1), fl(0, 0)]
    def step(which):
        a = bob(base, top, -bodybob)
        if not side:
            sel = (lambda X: X < cx) if which == 0 else (lambda X: X >= cx)
            a = legs_shift(a, top, bot, sel, dy=-lift)
        elif quad:
            t2 = y0 + int(h * (1 - sidefrac))
            headside = (lambda X: X < cx) if facing < 0 else (lambda X: X >= cx)
            tail = (lambda X: X >= cx) if facing < 0 else (lambda X: X < cx)
            sel = headside if which == 0 else tail
            a = legs_shift(a, t2, bot, sel, dy=-lift, dx=facing)
        else:
            t2 = y0 + int(h * (1 - sidefrac))
            leg = a[t2:bot].copy(); a[t2:bot] = 0
            far = np.roll(leg, (-stride if which == 0 else stride) * facing, axis=1); far[..., :3] = (far[..., :3] * 0.78).astype('uint8')
            near = np.roll(leg, (stride if which == 0 else -stride) * facing, axis=1)
            def upone(L): L = np.roll(L, -1, axis=0); L[-1] = 0; return L
            if which == 1: near = upone(near)
            else: far = upone(far)
            for L in (far, near):
                m = L[..., 3] > 0; reg = a[t2:bot]; reg[m] = L[m]; a[t2:bot] = reg
        return snap_pal(a)
    stand = base; passing = bob(base, top, 0)
    return stand, [step(0), passing, step(1), passing]

def export_set(outdir, prefix, views, W, H, legfrac, scales, ms, **kw):
    dirs = ['down', 'left', 'right', 'up']; rows = []
    os.makedirs(f'{outdir}/{prefix}', exist_ok=True)
    for d in dirs:
        spr = views[d]; side = d in ('left', 'right'); facing = -1 if d == 'left' else 1
        stand, walk = walk_frames(spr, W, H, legfrac, side, facing, **kw)
        fr = [stand] + walk; rows.append(fr)
        Image.fromarray(stand).save(f'{outdir}/{prefix}/{prefix}_{d}_stand.png')
        for i, f in enumerate(walk): Image.fromarray(f).save(f'{outdir}/{prefix}/{prefix}_{d}_walk{i}.png')
        for k in scales:
            gif(walk, f'{outdir}/{prefix}_walk_{d}_{k}x.gif', ms, k)
            for i, f in enumerate([stand] + walk):
                up(Image.fromarray(f), k).save(f'{outdir}/{prefix}/{prefix}_{d}_{"stand" if i == 0 else "walk%d" % (i - 1)}_{k}x.png')
    sheet = Image.new('RGBA', (W * 5, H * 4), (0, 0, 0, 0))
    for r, fr in enumerate(rows):
        for c, f in enumerate(fr): sheet.paste(Image.fromarray(f), (c * W, r * H))
    sheet.save(f'{outdir}/{prefix}_sheet.png')
    for k in scales: up(sheet, k).save(f'{outdir}/{prefix}_sheet_{k}x.png')
    allw = [np.concatenate([rows[r][1 + i] for r in range(4)], axis=1) for i in range(4)]
    for k in scales: gif(allw, f'{outdir}/{prefix}_walk_all_{k}x.gif', ms, k)
    return rows

def _lab(rgb):
    c = np.asarray(rgb, float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
PAL_LAB = _lab(PAL)

def remap_hue(a, cw=2.5):
    """hue-preserving variant: CIELAB distance with chroma (a*,b*) weighted cw x.
    Used for creatures whose muted greens/olives would otherwise snap to the palette's
    violet-greys under plain redmean."""
    a = a.copy(); a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
    m = a[..., 3] > 0; lab = _lab(a[m][:, :3])
    d = (lab[:, None, 0] - PAL_LAB[None, :, 0]) ** 2 + cw * ((lab[:, None, 1:] - PAL_LAB[None, :, 1:]) ** 2).sum(-1)
    a[m, :3] = PAL[d.argmin(1)]; a[~m] = 0; return a
