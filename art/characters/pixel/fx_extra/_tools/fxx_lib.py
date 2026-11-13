"""Kilumen fx_extra (Animator, DRAFT): shared helpers.
Hard pixels, palette-only (art/world/overworld/palette.hex), alpha 0/255, drawn at 1x, previews at 2x nearest.
Reuses soul/_tools/soul_lib.py + effects/_tools/fxlib.py helpers (read-only imports, nothing written there)."""
import sys, os, json, math, functools, datetime
import numpy as np
from PIL import Image, ImageDraw
PIX = '/workspace/kilumen/art/characters/pixel'
sys.path.insert(0, PIX + '/soul/_tools')
from soul_lib import (ROOT, H, blank, paste, up, flipx, bbox, keys, hk, recolor, mask_of, silhouette, outline,
                      bayer_fade, check_palette, glyph, shift, creature_battle, creature_battle_path, tile, tile_id,
                      save_preview, contact, save_png, CREATURES, BAYER, PALSET, _fx_save_gif, load)
FXX = PIX + '/fx_extra'
OW = ROOT + '/art/world/overworld'

def save_preview(frames, path, ms, scale=2):
    """fast opaque preview GIF (1-D packed-colour unique; same output contract as soul_lib.save_preview)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fr = [np.ascontiguousarray(f[..., :3]).astype(np.uint32) for f in frames]
    ks = [(f[..., 0] << 16) | (f[..., 1] << 8) | f[..., 2] for f in fr]
    allk = np.unique(np.concatenate([k.ravel() for k in ks]))
    if isinstance(ms, (int, float)): ms = [int(ms)] * len(fr)
    if len(allk) <= 256:
        pal = []
        for k in allk: pal += [int(k >> 16) & 255, int(k >> 8) & 255, int(k) & 255]
        pal += [0] * (768 - len(pal))
        ims = []
        for k in ks:
            idx = np.searchsorted(allk, k).astype('uint8')
            idx = idx.repeat(scale, 0).repeat(scale, 1)
            p = Image.fromarray(idx, 'P'); p.putpalette(pal); ims.append(p)
    else:
        u8 = [f.astype('uint8').repeat(scale, 0).repeat(scale, 1) for f in fr]
        big = Image.fromarray(np.concatenate(u8[:: max(1, len(u8) // 8)], 0))
        q = big.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        ims = [Image.fromarray(f).quantize(palette=q, dither=Image.Dither.NONE) for f in u8]
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=ms, loop=0, disposal=1, optimize=False)
    return path

def rel(p): return os.path.relpath(p, ROOT)

# ---- palette names (all from palette.hex) ----
INK = '1a1226'
VIO = ['3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff']      # crystal ramp dark -> light
GLOW = ['603096', '8a4ace', 'b076ec', 'd6acff']                          # violets the lit grade keeps bright at night
WARM_HI = 'f8eabe'   # brightest colour that stays lit at night (lit grade) -> sparkle cores
WARM = ['fcd668', 'e8ce92', 'ecdec4', 'f8eabe']
WHITE = 'fcf6e8'     # hit-flash white (NOT kept lit at night)
LEAF = ['24522e', '367634', '52983a', '78ba48', 'a6d460']
EMBER = ['9f4013', 'd46616', 'eea23c', 'fcd668']
AQUA = ['1e4078', '2c64a8', '4692ce', '7ac2e8', 'c6ecfa']
AIR = ['827a84', 'a8a0a4', 'ccc6c2', 'ecdec4']
LEATHER = ['2c1a12', '462c22', '6a442e', '92623e', 'ba8856', 'deb478']
NIGHT_GLOW = {'fcd668', 'e8ce92', 'ecdec4', 'f8eabe', '603096', '8a4ace', 'b076ec', 'd6acff'}

# ---------------- drawing ----------------
def px(a, x, y, h):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < a.shape[1] and 0 <= y < a.shape[0]: a[y, x] = H(h)
def line(a, x0, y0, x1, y1, h):
    x0, y0, x1, y1 = map(lambda v: int(round(v)), (x0, y0, x1, y1))
    dx, dy = abs(x1 - x0), -abs(y1 - y0); sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1; e = dx + dy
    while True:
        px(a, x0, y0, h)
        if x0 == x1 and y0 == y1: break
        e2 = 2 * e
        if e2 >= dy: e += dy; x0 += sx
        if e2 <= dx: e += dx; y0 += sy
def ring(a, cx, cy, r, h, step=1, phase=0, gap=0):
    """1px circle outline (midpoint-ish via angle sampling, deduped). gap>0 -> dashed: draw step-on, gap-off arcs."""
    n = max(8, int(2 * math.pi * r * 1.5)); seen = set()
    for i in range(n):
        t = i / n
        if gap and int((t * 2 * math.pi * r + phase) // 1) % (step + gap) >= step: continue
        x = int(round(cx + math.cos(t * 2 * math.pi) * r)); y = int(round(cy + math.sin(t * 2 * math.pi) * r))
        if (x, y) not in seen: seen.add((x, y)); px(a, x, y, h)
def disc(a, cx, cy, r, h):
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; m = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r + 0.3; a[m] = H(h)
def star4(a, cx, cy, size, core=WARM_HI, arm='d6acff', tip='8a4ace', ink=None):
    """4-point sparkle. size 0: dot, 1: plus, 2: long plus, 3: long plus + diagonal glints."""
    cx, cy = int(round(cx)), int(round(cy))
    if ink and size >= 1:
        m = blank(*a.shape[1::-1]); star4(m, cx, cy, size, core, arm, tip); o = outline(m, ink); mm = (o[..., 3] > 0) & (m[..., 3] == 0)
        a[mm] = H(ink)
    if size == 0: px(a, cx, cy, core); return
    for d in range(1, size + 1):
        c = arm if d < size else tip
        for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)): px(a, cx + dx, cy + dy, c)
    if size >= 3:
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)): px(a, cx + dx, cy + dy, tip)
    px(a, cx, cy, core)
def poly(a, pts, h):
    im = Image.new('L', (a.shape[1], a.shape[0]), 0); ImageDraw.Draw(im).polygon([(round(x), round(y)) for x, y in pts], fill=255)
    m = np.array(im) > 0; a[m] = H(h)
def over(dst, src, x=0, y=0): return paste(dst, src, int(x), int(y))
def rot90(a, k=1): return np.ascontiguousarray(np.rot90(a, k))

# ---------------- output ----------------
META = {}
def write_anim(piece, name, frames, ms, *, anchor, kind='overlay', loop=False, notes='', emissive=True, hooks=None, sub=None):
    """Writes fx_extra/<piece>/[sub/]<name>/: 1x/<name>_NN.png, 2x/<name>_NN_2x.png, <name>_sheet.png (+_2x),
    <name>_2x.gif, and if emissive is an array list: <name>_emissive_sheet.png (L, 255 = draw with the lit grade).
    emissive: True (whole sheet glows: use grades.<g>.lit), False (sprite grade), or list of bool masks per frame."""
    d = os.path.join(FXX, piece, *([sub] if sub else []), name)
    os.makedirs(d + '/1x', exist_ok=True); os.makedirs(d + '/2x', exist_ok=True)
    for sd in ('1x', '2x'):
        for f in os.listdir(f'{d}/{sd}'): os.remove(f'{d}/{sd}/{f}')
    h, w = frames[0].shape[:2]
    if isinstance(ms, (int, float)): ms = [int(ms)] * len(frames)
    assert len(ms) == len(frames), (name, len(ms), len(frames))
    for i, f in enumerate(frames):
        assert f.shape[:2] == (h, w), (name, i, f.shape)
        f[f[..., 3] == 0] = 0
        check_palette(f, f'{piece}/{name}/{i}')
        Image.fromarray(f).save(f'{d}/1x/{name}_{i:02d}.png'); Image.fromarray(up(f)).save(f'{d}/2x/{name}_{i:02d}_2x.png')
    sheet = np.concatenate(frames, 1)
    Image.fromarray(sheet).save(f'{d}/{name}_sheet.png'); Image.fromarray(up(sheet)).save(f'{d}/{name}_sheet_2x.png')
    gp = f'{d}/{name}_2x.gif'
    gms = [max(20, m) for m in ms]
    _fx_save_gif([up(f) for f in frames] if len(frames) > 1 else [up(frames[0])] * 2, gp, gms if len(frames) > 1 else gms * 2, transparent=True)
    meta = dict(kind=kind, frames=len(frames), frame_size=[w, h], ms_per_frame=[int(m) for m in ms], total_ms=int(sum(ms)), loop=loop,
                anchor=anchor, rects=[[i * w, 0, w, h] for i in range(len(frames))],
                sheet=rel(f'{d}/{name}_sheet.png'), sheet_2x=rel(f'{d}/{name}_sheet_2x.png'), gif_2x=rel(gp),
                frames_1x_dir=rel(d + '/1x'), frames_2x_dir=rel(d + '/2x'))
    if isinstance(emissive, bool):
        meta['emissive'] = 'all' if emissive else 'none'
    else:
        em = np.concatenate([np.where(m & (f[..., 3] > 0), 255, 0).astype('uint8') for m, f in zip(emissive, frames)], 1)
        Image.fromarray(em, 'L').save(f'{d}/{name}_emissive_sheet.png'); meta['emissive'] = 'mask'; meta['emissive_sheet'] = rel(f'{d}/{name}_emissive_sheet.png')
    if notes: meta['notes'] = notes
    if hooks: meta['hooks'] = hooks
    META.setdefault(piece, {})[(sub + '/' if sub else '') + name] = meta
    meta['_frames'] = frames; meta['_em'] = emissive
    return meta

def strip_private(d):
    return {k: v for k, v in d.items() if not k.startswith('_')}
def dump_piece(piece, about, hooks, tod):
    p = f'{FXX}/{piece}/{piece}.json'
    out = dict(piece=piece, status='DRAFT - not approved by Gary, NOT wired into game code', owner='Animator',
               generated_by=rel(f'{FXX}/_tools/gen_{piece}.py'),
               generated_at=datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
               paths_relative_to=ROOT, palette='art/world/overworld/palette.hex (64 colours) + full transparency; alpha is 0 or 255 only',
               scale_rule='draw 1x frames scaled by an integer (2x/3x) with nearest-neighbour only; *_2x files are exact nearest copies',
               sheet_layout='horizontal strip; frame i rect = [i*w, 0, w, h] (rects[] lists them)',
               emissive_rule="emissive 'all' -> grade with grades.<g>.lit (lut_<g>_lit.png); 'none' -> grades.<g>.sprite; 'mask' -> per pixel by <name>_emissive_sheet.png. Draw order: palette swaps -> grade.",
               about=about, hooks=hooks, tod_check=tod,
               anims={k: strip_private(v) for k, v in META.get(piece, {}).items()})
    json.dump(out, open(p, 'w'), indent=1)
    return p

# ---------------- time of day ----------------
PH = ['dawn', 'day', 'dusk', 'night']
@functools.lru_cache(None)
def _G(): return json.load(open(OW + '/time_of_day/grades.json'))['grades']
def _mp(d): return {hk(k): np.array([int(v[i:i + 2], 16) for i in (0, 2, 4)], 'uint8') for k, v in d.items()}
@functools.lru_cache(None)
def _maps(ph): g = _G()[ph]; return dict(tile=_mp(g['map']), sprite=_mp(g['sprite']['map']), lit=_mp(g['lit']['map']))
def grade(a, ph, which='sprite', mask=None):
    out = a.copy()
    if ph == 'day': return out
    mp = _maps(ph)[which]; k = keys(a); vis = a[..., 3] > 0
    if mask is not None: vis &= mask
    for s in np.unique(k[vis]):
        if int(s) in mp: out[vis & (k == s), :3] = mp[int(s)]
    return out
def grade_fx(f, em, ph):
    if isinstance(em, str) and em == 'none': return f.copy()          # screen-space, ungraded
    if isinstance(em, bool) or em is None: return grade(f, ph, 'lit' if em else 'sprite')
    return grade(grade(f, ph, 'lit', em), ph, 'sprite', ~em)
def lum(a): return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
def comp(bg, f, x, y):
    out = bg.copy(); h, w = f.shape[:2]; sub = out[y:y + h, x:x + w]; m = f[..., 3] > 0
    m = m[:sub.shape[0], :sub.shape[1]]; sub[m] = f[:sub.shape[0], :sub.shape[1]][m]; return out
def tod_check(piece, name, bgimg, placements, frames_sel=None, label_rows=None, dy_label=10, scale=2, thresh=28, min_frac=0.5):
    """bgimg: RGBA day background (world colours). placements: list of (meta, x, y) drawn together each frame index.
    Writes <piece>/_preview/<name>_tod_2x.gif (4-up animated dawn|day|dusk|night) and _tod_2x.png (key frames x phases).
    Returns readability stats: fraction of FX pixels whose luminance differs from the graded background under them by >= thresh."""
    n = max(m['frames'] for m, _, _ in placements)
    bgs = {ph: grade(bgimg, ph, 'tile') for ph in PH}
    stats = {}; panels = {ph: [] for ph in PH}
    for ph in PH:
        tot = ok = 0
        for i in range(n):
            im = bgs[ph].copy()
            for m, x, y in placements:
                j = min(i, m['frames'] - 1); f = m['_frames'][j]; em = m['_em']
                emj = em if isinstance(em, (bool, str)) else em[j]
                g = grade_fx(f, emj, ph)
                h, w = f.shape[:2]; sub = im[y:y + h, x:x + w]; msk = (f[..., 3] > 0)[:sub.shape[0], :sub.shape[1]]
                d = np.abs(lum(g[:sub.shape[0], :sub.shape[1]][msk].astype(float)) - lum(bgs[ph][y:y + h, x:x + w][msk].astype(float)))
                tot += d.size; ok += int((d >= thresh).sum())
                sub[msk] = g[:sub.shape[0], :sub.shape[1]][msk]
            panels[ph].append(im)
        stats[ph] = round(ok / max(1, tot), 3)
    pad = 2
    def four(i):
        row = [panels[ph][i] for ph in PH]; Hh = row[0].shape[0]; W = sum(r.shape[1] for r in row) + pad * 3
        out = np.zeros((Hh, W, 4), 'uint8'); out[..., :3] = (20, 18, 26); out[..., 3] = 255; x = 0
        for r in row: out[:, x:x + r.shape[1]] = r; x += r.shape[1] + pad
        return out
    ms = [m for m in placements[0][0]['ms_per_frame']] + [400]
    ms = [max(40, v) for v in ms]
    fr = [four(i) for i in range(n)]
    os.makedirs(f'{FXX}/{piece}/_preview', exist_ok=True)
    gif = f'{FXX}/{piece}/_preview/{name}_tod_2x.gif'
    save_preview(fr + [fr[-1]], gif, (ms + [400] * 4)[:len(fr) + 1], scale)
    sel = frames_sel or sorted(set([0, n // 3, (2 * n) // 3, n - 1]))
    lab_h = 12
    rows = [four(i) for i in sel]
    sheet = np.concatenate([np.pad(r, ((0, pad), (0, 0), (0, 0))) for r in rows], 0)
    sheet = up(sheet, scale)
    head = Image.new('RGBA', (sheet.shape[1], lab_h * scale // 2 + 6), (20, 18, 26, 255)); dr = ImageDraw.Draw(head)
    pw = (fr[0].shape[1] - 3 * pad) // 4
    for k, ph in enumerate(PH):
        dr.text(((k * (pw + pad)) * scale + 4, 2), f'{ph}  readable {int(stats[ph] * 100)}%', fill=(255, 255, 255, 255))
    full = np.concatenate([np.array(head), sheet], 0)
    png = f'{FXX}/{piece}/_preview/{name}_tod_2x.png'; Image.fromarray(full).save(png)
    passed = all(v >= min_frac for v in stats.values())
    return dict(gif_2x=rel(gif), png_2x=rel(png), readable_fraction=stats, rule=f'fraction of FX pixels with |dLuma|>={thresh} vs graded background under them, per phase; pass >= {min_frac}', passed=passed)

def ow_bg(names, cols, rows, under=None):
    """tile grid background (64px tiles) from tile names (row-major list, cycled); under = tile drawn beneath each cell."""
    out = blank(cols * 64, rows * 64); k = 0
    for r in range(rows):
        for c in range(cols):
            t = tile(tile_id(names[k % len(names)]))
            if under: t = comp(tile(tile_id(under)), t, 0, 0)
            out[r * 64:(r + 1) * 64, c * 64:(c + 1) * 64] = t; k += 1
    out[..., 3] = 255; return out
@functools.lru_cache(None)
def _battle_bg():
    return np.array(Image.open(PIX + '_pilot/battle_preview_native.png').convert('RGBA'))
def battle_bg(): return _battle_bg().copy()

def preview_gif(piece, name, frames, ms, scale=2):
    os.makedirs(f'{FXX}/{piece}/_preview', exist_ok=True)
    return rel(save_preview(frames, f'{FXX}/{piece}/_preview/{name}_2x.gif', ms, scale))
def preview_png(piece, name, a, scale=2):
    return rel(save_png(a, f'{FXX}/{piece}/_preview/{name}_2x.png', scale))

def crystal_rows(creature, relpath):
    idx = json.load(open(f'{PIX}/warmth/masks/{creature}/crystal_index.json'))['sprites']
    return idx.get(relpath)
def crystal_mask(creature, sprite_path):
    r = os.path.relpath(sprite_path, f'{PIX}/creatures/{creature}')
    return np.array(Image.open(f'{PIX}/warmth/masks/{creature}/{r}').convert('L')) > 0
@functools.lru_cache(None)
def warmth():
    return json.load(open(PIX + '/warmth/warmth_tints.json'))
def warmth_swap(a, creature, stage, mask):
    st = warmth()['creatures'][creature]['stages'][str(stage)]
    return recolor(a, {k.lstrip('#'): v.lstrip('#') for k, v in st.items()}, mask)

# ---------------- battle preview stage (preview only, not a game asset) ----------------
FOE_GROUND = (232, 160)       # bottom-centre of the foe front sprite on the 320x240 pilot screen
FOE_CENTER = (232, 100)
HOVER = (232, 92)             # capture crystal hover point (crystal centre)
PLAYER_HAND = (104, 196)      # where the throw starts (off the player's side, bottom-left)
TRAVEL_OFF = (40, 40)         # same travel-canvas convention as effects/ (240x176 drawn at (40,40))
def clean_battle_bg(foe=None, view='front'):
    """pilot battle screen with the creatures painted out (column strip x=125..164 tiled), optional foe re-drawn."""
    src = battle_bg(); strip = src[:, 125:165]; out = np.concatenate([strip] * 8, 1)[:, :320].copy()
    col = src[:, 316:317]; out[:76] = col[:76]; out[170:] = col[170:]   # sky + grass stripes are horizontal
    if foe:
        a = creature_battle(foe, view); h, w = a.shape[:2]; ax, ay = (w // 2, h - 3)
        out = comp(out, a, FOE_GROUND[0] - ax, FOE_GROUND[1] - ay)
    return out
