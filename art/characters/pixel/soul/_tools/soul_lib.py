"""Kilumen soul pass: shared helpers. Hard pixels, palette-only, alpha 0/255.
Reuses the effects library primitives (fxlib) for palette, Bayer matrix and GIF writing."""
import sys, os, json, math, random, functools
import numpy as np
from PIL import Image
ROOT = '/workspace/kilumen'
PIX = ROOT + '/art/characters/pixel'
SOUL = PIX + '/soul'
sys.path.insert(0, PIX + '/effects/_tools')
sys.path.insert(0, ROOT + '/art/world/overworld/tools')
from fxlib import C, FX, BAYER, PALSET, save_gif as _fx_save_gif  # noqa

def rel(p): return os.path.relpath(p, ROOT)
def H(h): return np.array(C(h), 'uint8')

# ---- named palette entries used across the pass ----
INK = '1a1226'; WHITE = 'fcf6e8'; CREAM = 'ecdec4'
VIO = ['3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff']   # dark -> light
PINK = ['6e222a', 'a23432', 'd2608c', 'f6a0ba', 'daa2ba']
BLUE = ['1e4078', '2c64a8', '4a70ba', '4692ce', '7ac2e8', 'c6ecfa']
SHADOW_RGBA = (26, 18, 38, 96)   # world shadow colour (tiles only, not used in soul frames)

# ---------------- io ----------------
def load(p): return np.array(Image.open(p).convert('RGBA'))
def blank(w, h): return np.zeros((h, w, 4), 'uint8')
def paste(dst, src, x, y):
    """binary-alpha paste of src onto dst at (x,y); clips."""
    h, w = src.shape[:2]; H_, W_ = dst.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(W_, x + w), min(H_, y + h)
    if x1 <= x0 or y1 <= y0: return dst
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]; m = s[..., 3] > 0
    d = dst[y0:y1, x0:x1]; d[m] = s[m]; d[m, 3] = 255
    return dst
def up(a, s=2): return np.repeat(np.repeat(a, s, 0), s, 1)
def flipx(a): return a[:, ::-1].copy()

def human(name, d, pose):
    """pose: stand, walk0..3, run0..5. Cal/Mira/Ron/Vane/stranger under humans/, NPCs under npcs/."""
    if pose.startswith('run') or pose.startswith('bike'):
        return load(f'{PIX}/humans/{name}/run_bike/frames/{name}_chibi_{d}_{pose}.png')
    for base in (f'{PIX}/humans/{name}/overworld/{name}_chibi', f'{PIX}/npcs/{name}/overworld/{name}_chibi'):
        p = f'{base}/{name}_chibi_{d}_{pose}.png'
        if os.path.exists(p): return load(p)
    raise FileNotFoundError(name + d + pose)
def creature(c, d, pose='stand'): return load(f'{PIX}/creatures/{c}/overworld/{c}_ow/{c}_ow_{d}_{pose}.png')
def creature_battle_path(c, view):
    import glob as _g
    ps = sorted(p for p in _g.glob(f'{PIX}/creatures/{c}/battle/{c}_{view}_*.png') if not p.endswith('_2x.png'))
    return ps[0]
def creature_battle(c, view): return load(creature_battle_path(c, view))
CREATURES = sorted(os.listdir(PIX + '/creatures'))
def seated_upper(name, d): return load(f'{PIX}/humans/{name}/run_bike/parts/{name}_chibi_{d}_seated_upper.png')

def bbox(a):
    ys, xs = np.nonzero(a[..., 3])
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None

# ---------------- palette ops ----------------
def key(c): return (int(c[0]) << 16) | (int(c[1]) << 8) | int(c[2])
def hk(h): return int(h, 16)
def keys(a): return (a[..., 0].astype(np.int64) << 16) | (a[..., 1].astype(np.int64) << 8) | a[..., 2]
def recolor(a, mapping, mask=None):
    """mapping {hex: hex}; only opaque pixels (and mask if given)."""
    out = a.copy(); k = keys(a); op = a[..., 3] > 0
    if mask is not None: op &= mask
    for s, t in mapping.items():
        m = op & (k == hk(s)); out[m, :3] = H(t)[:3]
    return out
def mask_of(a, hexes):
    k = keys(a); m = np.zeros(a.shape[:2], bool)
    for h in hexes: m |= (k == hk(h))
    return m & (a[..., 3] > 0)
def fill_mask(a, mask, h):
    out = a.copy(); out[mask] = H(h); return out
def silhouette(a, h):
    out = a.copy(); m = a[..., 3] > 0; out[m] = H(h); return out
def outline(a, h=INK, diag=False):
    """add a 1px outline around opaque pixels."""
    m = a[..., 3] > 0; d = m.copy()
    d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
    if diag:
        d[1:, 1:] |= m[:-1, :-1]; d[:-1, :-1] |= m[1:, 1:]; d[1:, :-1] |= m[:-1, 1:]; d[:-1, 1:] |= m[1:, :-1]
    out = a.copy(); out[d & ~m] = H(h); return out
def bayer_fade(a, t, ox=0, oy=0):
    """t in 0..1 = fraction removed, ordered 4x4 Bayer keyed to absolute position (ox,oy)."""
    h, w = a.shape[:2]
    th = np.tile(BAYER, (h // 4 + 2, w // 4 + 2))[oy % 4:oy % 4 + h, ox % 4:ox % 4 + w]
    out = a.copy(); out[th < t * 16] = 0; return out
def check_palette(a, where=''):
    al = np.unique(a[..., 3]); assert set(al.tolist()) <= {0, 255}, (where, al)
    m = a[..., 3] > 0
    for c in np.unique(a[m][:, :3], axis=0):
        assert tuple(int(v) for v in c) in PALSET, (where, c)

# ---------------- glyphs from char maps ----------------
def glyph(rows, cmap):
    h = len(rows); w = max(len(r) for r in rows); a = blank(w, h)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in cmap: a[y, x] = H(cmap[ch])
    return a

# ---------------- output ----------------
MANIFEST = {}   # filled by generators: MANIFEST[item][anim] = meta
def write_anim(item, name, frames, ms, kind='overlay', anchor=None, loop=True, notes='', sub=None, scales=(2,)):
    """Writes <item>/[sub/]<name>/1x/<name>_NN.png, 2x/<name>_NN_2x.png, <name>_sheet.png, <name>_sheet_2x.png,
    <name>_2x.gif. Returns + records meta."""
    d = os.path.join(SOUL, item, *( [sub] if sub else [] ), name)
    os.makedirs(d + '/1x', exist_ok=True); os.makedirs(d + '/2x', exist_ok=True)
    h, w = frames[0].shape[:2]
    if isinstance(ms, (int, float)): ms = [int(ms)] * len(frames)
    assert len(ms) == len(frames)
    p1, p2 = [], []
    for i, f in enumerate(frames):
        assert f.shape[:2] == (h, w), (name, i, f.shape)
        check_palette(f, f'{item}/{name}/{i}')
        a = f'{d}/1x/{name}_{i:02d}.png'; b = f'{d}/2x/{name}_{i:02d}_2x.png'
        Image.fromarray(f).save(a); Image.fromarray(up(f, 2)).save(b); p1.append(rel(a)); p2.append(rel(b))
    sheet = np.concatenate(frames, 1)
    Image.fromarray(sheet).save(f'{d}/{name}_sheet.png'); Image.fromarray(up(sheet, 2)).save(f'{d}/{name}_sheet_2x.png')
    gp = f'{d}/{name}_2x.gif'
    _fx_save_gif([up(f, 2) for f in frames], gp, ms, transparent=True)
    meta = dict(kind=kind, frames=len(frames), size=[w, h], ms_per_frame=ms, total_ms=int(sum(ms)), loop=loop,
                anchor=anchor, paths={'1x': p1, '2x': p2}, sheet={'1x': rel(f'{d}/{name}_sheet.png'), '2x': rel(f'{d}/{name}_sheet_2x.png'),
                'layout': 'horizontal strip, frame i at x=i*%d' % w}, gif_2x=rel(gp))
    if notes: meta['notes'] = notes
    MANIFEST.setdefault(item, {})[(sub + '/' if sub else '') + name] = meta
    return meta

def dump_meta(item):
    p = os.path.join(SOUL, item, '_meta.json')
    json.dump(MANIFEST.get(item, {}), open(p, 'w'), indent=1)
    return p

# ---------------- previews ----------------
def save_preview(frames, path, ms, scale=2):
    """opaque preview GIF: frames are RGBA/RGB arrays (composited art may include world shadow blends)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fr = [up(np.ascontiguousarray(f[..., :3]), scale) for f in frames]
    allc = np.unique(np.concatenate([f.reshape(-1, 3) for f in fr]), axis=0)
    if isinstance(ms, (int, float)): ms = [int(ms)] * len(fr)
    if len(allc) <= 256:
        lut = {key(c): i for i, c in enumerate(allc)}
        pal = [int(v) for c in allc for v in c] + [0] * (3 * (256 - len(allc)))
        ims = []
        for f in fr:
            k = keys(f); uk, inv = np.unique(k, return_inverse=True)
            idx = np.array([lut[int(x)] for x in uk], 'uint8')[inv].reshape(k.shape)
            p = Image.fromarray(idx, 'P'); p.putpalette(pal); ims.append(p)
    else:
        big = Image.fromarray(np.concatenate(fr[:: max(1, len(fr) // 8)], 0))
        q = big.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        ims = [Image.fromarray(f).quantize(palette=q, dither=Image.Dither.NONE) for f in fr]
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=ms, loop=0, disposal=1, optimize=False)
    return path

_BG = {}
def bg(mapname, x0, y0, x1, y1, frame=None, sprites=()):
    k = (mapname, x0, y0, x1, y1, frame)
    if k not in _BG or sprites:
        from preview_util import render_region
        im = np.array(render_region(mapname, x0, y0, x1, y1, sprites=sprites, frame=frame).convert('RGBA'))
        if sprites: return im
        _BG[k] = im
    return _BG[k].copy()
def tile(tid, frame=None):
    from preview_util import tile_img
    return np.array(tile_img(tid, frame).convert('RGBA'))
def tile_id(name):
    from preview_util import ts
    return {t['name']: t['id'] for t in ts()['tiles']}[name]

def night(a):
    """preview-only night grade (not a game asset)."""
    out = a.copy().astype(np.float32)
    out[..., 0] *= 0.32; out[..., 1] *= 0.36; out[..., 2] = out[..., 2] * 0.55 + 10
    out = np.clip(out, 0, 255).astype('uint8'); out[..., 3] = 255; return out

def contact(rows, pad=4, bgcol=(58, 58, 72)):
    """rows: list of lists of RGBA arrays -> one RGBA array (preview only)."""
    W = max(sum(f.shape[1] + pad for f in r) + pad for r in rows)
    Hh = sum(max(f.shape[0] for f in r) + pad for r in rows) + pad
    out = np.zeros((Hh, W, 4), 'uint8'); out[..., :3] = bgcol; out[..., 3] = 255
    y = pad
    for r in rows:
        x = pad
        for f in r:
            sub = out[y:y + f.shape[0], x:x + f.shape[1]]; m = f[..., 3] > 0; sub[m] = f[m]; x += f.shape[1] + pad
        y += max(f.shape[0] for f in r) + pad
    return out
def save_png(a, path, scale=1):
    os.makedirs(os.path.dirname(path), exist_ok=True); Image.fromarray(up(a, scale) if scale > 1 else a).save(path); return path

def head_top(a):
    """first opaque row of a human frame (for emote/spark placement)."""
    return bbox(a)[1]

# ---------------- shared overlays / poses (trail buddy, ambient, lap nap) ----------------
@functools.lru_cache(None)
def _grades():
    return json.load(open(ROOT + '/art/world/overworld/time_of_day/grades.json'))['grades']
def grade(a, name='night'):
    """preview-only: the world team's official time-of-day palette swap (time_of_day/grades.json)."""
    if name == 'day': return a.copy()
    mp = _grades()[name]['map']; out = a.copy(); k = keys(a)
    for s, t in mp.items():
        m = k == hk(s); out[m, :3] = np.array([int(t[i:i + 2], 16) for i in (0, 2, 4)], 'uint8')
    return out
def emote(name):
    """frames of a spotted/emotes emote (24x24, anchor (12,23)): [pop, loopA, loopB]."""
    d = f'{SOUL}/spotted/emotes/emote_{name}/1x'
    return [load(f'{d}/emote_{name}_{i:02d}.png') for i in range(3)]
def shift(a, dx=0, dy=0):
    out = np.zeros_like(a); h, w = a.shape[:2]
    ys0, ys1 = max(0, dy), min(h, h + dy); xs0, xs1 = max(0, dx), min(w, w + dx)
    out[ys0:ys1, xs0:xs1] = a[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]; return out
def vscale(a, dh, foot=None):
    """squash (dh>0) / stretch (dh<0) the sprite by dh rows, bottom-aligned on its foot row, nearest-neighbour (keeps palette)."""
    b = bbox(a); foot = b[3] if foot is None else foot; top = b[1]; h0 = foot - top + 1; h1 = max(1, h0 - dh)
    part = Image.fromarray(a[top:foot + 1]).resize((a.shape[1], h1), Image.NEAREST)
    out = a.copy(); out[:foot + 1] = 0; y0 = foot + 1 - h1
    if y0 < 0: part = part.crop((0, -y0, a.shape[1], h1)); y0 = 0
    out[y0:foot + 1] = np.array(part); return out
def bayer_ellipse(w, h, col, t=0.5):
    """hard-pixel dithered ellipse (shadow / glow stand-in, alpha 0/255 only)."""
    a = blank(w, h); yy, xx = np.mgrid[0:h, 0:w]
    m = ((xx + 0.5 - w / 2) / (w / 2)) ** 2 + ((yy + 0.5 - h / 2) / (h / 2)) ** 2 <= 1
    th = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]; m &= th < t * 16
    a[m] = H(col); return a
