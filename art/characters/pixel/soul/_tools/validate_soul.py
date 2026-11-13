"""Validator for the soul pass. Checks every animation listed in soul/<item>/_meta.json:
 - every 1x frame: palette-only RGB (shared 64-colour palette) and alpha in {0,255}
 - sizes per kind: human 64x96, creature 64x64 or 96x96 (big), screen 320x240, battle_creature = source battle size (128/160),
   overlay = any but consistent; all frames of one anim the same size; frame count == meta
 - 2x frames == exact nearest-neighbour 2x of the 1x frame
 - sheet == horizontal concatenation of the 1x frames; sheet_2x == 2x of sheet
 - no stray PNGs under an anim dir that the meta does not list
Exit code 1 on any failure. Usage: python3 validate_soul.py [item ...]"""
import sys, os, json, glob
import numpy as np
from PIL import Image
from soul_lib import ROOT, SOUL, PALSET

KINDS = {'human': {(64, 96)}, 'creature': {(64, 64), (96, 96)}, 'screen': {(320, 240)},
         'battle_creature': {(128, 128), (160, 160)}, 'overlay': None}
ITEMS = ['spotted', 'battle_feedback', 'trail_buddy', 'ambient', 'lap_nap']

def ld(p): return np.array(Image.open(os.path.join(ROOT, p)).convert('RGBA'))
def up2(a): return a.repeat(2, 0).repeat(2, 1)
def pal_ok(a):
    al = set(np.unique(a[..., 3]).tolist())
    if not al <= {0, 255}: return f'alpha {sorted(al)[:5]}'
    m = a[..., 3] > 0
    bad = [tuple(int(v) for v in c) for c in np.unique(a[m][:, :3], axis=0) if tuple(int(v) for v in c) not in PALSET]
    return f'off-palette {bad[:3]}' if bad else None

def check_item(item):
    errs, n_anim, n_png = [], 0, 0
    meta = json.load(open(f'{SOUL}/{item}/_meta.json'))
    listed = set()
    for name, m in meta.items():
        n_anim += 1
        w, h = m['size']; allowed = KINDS.get(m['kind'], 'unknown')
        if allowed == 'unknown': errs.append(f'{item}/{name}: unknown kind {m["kind"]}')
        elif allowed and (w, h) not in allowed: errs.append(f'{item}/{name}: size {w}x{h} not allowed for {m["kind"]}')
        p1, p2 = m['paths']['1x'], m['paths']['2x']
        if not (len(p1) == len(p2) == m['frames'] == len(m['ms_per_frame'])): errs.append(f'{item}/{name}: frame count mismatch')
        frames = []
        for a, b in zip(p1, p2):
            listed.update([a, b])
            if not os.path.exists(os.path.join(ROOT, a)) or not os.path.exists(os.path.join(ROOT, b)):
                errs.append(f'{item}/{name}: missing {a} / {b}'); continue
            f, f2 = ld(a), ld(b); n_png += 2
            if f.shape[:2] != (h, w): errs.append(f'{a}: shape {f.shape[1]}x{f.shape[0]} != {w}x{h}')
            e = pal_ok(f)
            if e: errs.append(f'{a}: {e}')
            if f2.shape != (2 * f.shape[0], 2 * f.shape[1], 4) or not np.array_equal(up2(f), f2): errs.append(f'{b}: not exact 2x of 1x')
            frames.append(f)
        sh = m.get('sheet') or {}
        if frames and sh:
            listed.update([sh['1x'], sh['2x']])
            s1, s2 = ld(sh['1x']), ld(sh['2x']); n_png += 2
            if not np.array_equal(s1, np.concatenate(frames, 1)): errs.append(f'{sh["1x"]}: sheet != concat(frames)')
            if not np.array_equal(up2(s1), s2): errs.append(f'{sh["2x"]}: not exact 2x of sheet')
        if m.get('gif_2x'): listed.add(m['gif_2x'])
    # stray frame PNGs inside anim dirs (1x/2x folders) not referenced by the meta
    for p in glob.glob(f'{SOUL}/{item}/**/[12]x/*.png', recursive=True):
        if os.path.relpath(p, ROOT) not in listed: errs.append(f'stray (unlisted) {os.path.relpath(p, ROOT)}')
    return errs, n_anim, n_png

def main():
    items = sys.argv[1:] or ITEMS; bad = 0
    for it in items:
        errs, na, npng = check_item(it)
        print(f'{it:16s} anims={na:4d} pngs_checked={npng:6d} errors={len(errs)}')
        for e in errs[:40]: print('   ', e)
        bad += len(errs)
    print('OK' if not bad else f'FAILED ({bad} errors)')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
