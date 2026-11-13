"""Validator for fx_extra/ (read-only). Exit 0 = all OK.
Checks per anim: palette (64 hex + alpha 0/255 only), frame sizes, rects vs sheet, 1x frame files == sheet slices,
2x sheet/frames == exact nearest of 1x, GIF frame count, ms list length/positive, anchor in bounds, emissive sheet,
README + ToD previews exist and every tod_check passed (or carries a written note), no 'smoke'/'haze' in any name."""
import os, sys, json, glob
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FXX = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(FXX, '../../../..'))
PAL = set(int(l.strip().lstrip('#'), 16) for l in open(ROOT + '/art/world/overworld/palette.hex') if l.strip())
errs, warns, n_anims, n_files = [], [], 0, 0
def E(m): errs.append(m)
def load(p): return np.array(Image.open(p).convert('RGBA'))
def up(a, s=2): return a.repeat(s, 0).repeat(s, 1)
def pal_ok(a, tag):
    al = a[..., 3]
    if not np.isin(al, (0, 255)).all(): E(f'{tag}: alpha not 0/255')
    o = a[al == 255][:, :3].astype(np.int64); keys = set(np.unique((o[:, 0] << 16) | (o[:, 1] << 8) | o[:, 2]).tolist())
    bad = keys - PAL
    if bad: E(f'{tag}: {len(bad)} off-palette colours e.g. {["%06x" % b for b in list(bad)[:4]]}')
assert len(PAL) == 64, len(PAL)
for path in sorted(glob.glob(FXX + '/*/*.json')):
    d = json.load(open(path)); piece = os.path.basename(os.path.dirname(path))
    if not os.path.exists(f'{FXX}/{piece}/README.md'): E(f'{piece}: README.md missing')
    if 'anims' not in d:
        if piece == 'tod_checks':
            for k, v in d['results'].items():
                for f in ('gif_2x', 'png_2x'):
                    if not os.path.exists(ROOT + '/' + v[f]): E(f'tod_checks/{k}: {f} missing')
                    n_files += 1
        continue
    if 'DRAFT' not in d.get('status', ''): E(f'{piece}: status is not DRAFT')
    for k, v in d['anims'].items():
        n_anims += 1; tag = f'{piece}/{k}'
        if any(w in k.lower() for w in ('smoke', 'haze')): E(f'{tag}: forbidden name')
        w, h = v['frame_size']; n = v['frames']
        sh = load(ROOT + '/' + v['sheet']); n_files += 1
        if sh.shape[:2] != (h, w * n): E(f'{tag}: sheet {sh.shape[1]}x{sh.shape[0]} != {w * n}x{h}')
        pal_ok(sh, tag)
        if len(v['rects']) != n: E(f'{tag}: rects {len(v["rects"])} != frames {n}')
        for i, (x, y, rw, rh) in enumerate(v['rects']):
            if (rw, rh) != (w, h) or x + rw > sh.shape[1] or y + rh > sh.shape[0] or x != i * w: E(f'{tag}: rect {i} bad {x, y, rw, rh}')
        s2 = load(ROOT + '/' + v['sheet_2x']); n_files += 1
        if s2.shape != up(sh).shape or not np.array_equal(s2, up(sh)): E(f'{tag}: sheet_2x is not exact nearest 2x')
        d1 = ROOT + '/' + v['frames_1x_dir']; d2 = ROOT + '/' + v['frames_2x_dir']
        f1 = sorted(os.listdir(d1)); f2 = sorted(os.listdir(d2))
        if len(f1) != n or len(f2) != n: E(f'{tag}: frame files {len(f1)}/{len(f2)} != {n}')
        for i, (a, b) in enumerate(zip(f1, f2)):
            fa = load(f'{d1}/{a}'); fb = load(f'{d2}/{b}'); n_files += 2
            if not np.array_equal(fa, sh[:, i * w:(i + 1) * w]): E(f'{tag}: 1x frame {i} != sheet slice')
            if not np.array_equal(fb, up(fa)): E(f'{tag}: 2x frame {i} not exact nearest')
        g = Image.open(ROOT + '/' + v['gif_2x']); n_files += 1
        # GIF encoders merge identical consecutive frames (adding their durations), so expect one GIF frame per run of equal frames
        slices = [sh[:, i * w:(i + 1) * w] for i in range(n)]
        want = 1 + sum(1 for i in range(1, n) if not np.array_equal(slices[i], slices[i - 1]))
        if g.n_frames != want: E(f'{tag}: gif frames {g.n_frames} != {want} (runs of distinct frames)')
        if n > 1:
            gd = 0
            for i in range(g.n_frames): g.seek(i); gd += g.info.get('duration', 0)
            if abs(gd - sum(max(20, m) for m in v['ms_per_frame'])) > 10 * n: E(f'{tag}: gif total {gd} ms != {v["total_ms"]} ms')
        if g.size != (w * 2, h * 2): E(f'{tag}: gif size {g.size}')
        ms = v['ms_per_frame']
        if len(ms) != n or any(m <= 0 for m in ms) or sum(ms) != v['total_ms']: E(f'{tag}: ms list bad')
        an = v['anchor']
        if 'canvas_px' in an:
            ax, ay = an['canvas_px']
            if not (0 <= ax < w and 0 <= ay < h): E(f'{tag}: anchor {ax, ay} out of {w}x{h}')
        elif 'canvas_top_left_on_screen' in an:
            ax, ay = an['canvas_top_left_on_screen']
            if not (0 <= ax and ax + w <= 320 and 0 <= ay and ay + h <= 240): E(f'{tag}: canvas does not fit 320x240 at {ax, ay}')
        else: E(f'{tag}: no anchor')
        if v['emissive'] == 'mask':
            em = np.array(Image.open(ROOT + '/' + v['emissive_sheet'])); n_files += 1
            if em.shape != sh.shape[:2] or not np.isin(em, (0, 255)).all() or (em[sh[..., 3] == 0] != 0).any(): E(f'{tag}: emissive sheet bad')
        elif v['emissive'] not in ('all', 'none'): E(f'{tag}: emissive value {v["emissive"]}')
    for k, t in d.get('tod_check', {}).items():
        for f in ('gif_2x', 'png_2x'):
            if not os.path.exists(ROOT + '/' + t[f]): E(f'{piece}/tod {k}: {f} missing')
        if not t['passed'] and 'note' not in t: E(f'{piece}/tod {k}: failed with no note')
        if 'note' in t: warns.append(f'{piece}/tod {k}: {t["note"][:110]}')
for p in glob.glob(FXX + '/**/*', recursive=True):
    if any(w in os.path.basename(p).lower() for w in ('smoke', 'haze')): E(f'forbidden name: {p}')
print(f'fx_extra validator: anims={n_anims} files_checked={n_files} errors={len(errs)} notes={len(warns)}')
for w in warns: print('  NOTE', w)
for e in errs: print('  ERROR', e)
print('ALL OK' if not errs else 'FAILED')
sys.exit(1 if errs else 0)
