#!/usr/bin/env python3
"""Kilumen palette check (added 2026-10-22, read-only on art). Flags pixels whose colour is not in the LOCKED palette.

  python3 tools/palette_check.py                 # default scope: art/characters/pixel + overworld tile sheets
  python3 tools/palette_check.py PATH [PATH...]  # files or folders (recursive)
  python3 tools/palette_check.py --verify-lock   # also confirm every palette copy matches art/palette/kilumen.hex
  python3 tools/palette_check.py --json out.json # machine-readable report
  --include-upscales  also check *_2x/*_3x files;  --max-list N  files listed per section (default 25)

Rules: fully transparent pixels ignored; the overworld shadow rgba(26,18,38,96) is allowed; any other partial alpha
is reported separately as 'translucent' (not a failure unless --strict-alpha). Skipped as not pixel art / not shipped:
*/portraits/*, _preview, _raw, raw, _tools, _parts, debug, previews and masks/ folders (masks are 1-colour data, not art), _superseded* folders, *_preview.png, *_emissive_sheet.png (white glow masks) and bayer*_*.png (dither threshold maps). Exit code 1 if any off-palette pixel is found.
"""
import argparse, glob, hashlib, json, os, re, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCK = os.path.join(ROOT, 'art/palette/kilumen.hex')
LOCK_SHA = '82166240370aa7fc43de8889f7032eff08bf565696905dd79eff512c3afeacf8'
COPIES = ['art/world/overworld/palette.hex', 'art/palette/kilumen.hex']
ALLOWED_ALPHA = {(26, 18, 38, 96)}
SKIP = re.compile(r'/(portraits|_preview|_raw|raw|_tools|_parts|debug|previews|masks|_superseded[^/]*)/|_preview\.png$|_emissive_sheet\.png$|/bayer\d+_[^/]*\.png$')
UPSCALE = re.compile(r'_[23]x\.png$')

def load_palette(p=LOCK):
    return {tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for h in (l.strip().lower().lstrip('#') for l in open(p)) if h}

def verify_lock():
    ok = True
    for rel in COPIES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p): print(f'LOCK  missing {rel}'); ok = False; continue
        norm = '\n'.join(l.strip().lower() for l in open(p) if l.strip()) + '\n'
        sha = hashlib.sha256(norm.encode()).hexdigest()
        print(f"LOCK  {'ok   ' if sha == LOCK_SHA else 'DRIFT'} {rel}"); ok &= sha == LOCK_SHA
    return ok

def default_targets():
    t = glob.glob(os.path.join(ROOT, 'art/characters/pixel/**/*.png'), recursive=True)
    ts = os.path.join(ROOT, 'art/world/overworld/tileset.json')
    if os.path.exists(ts):
        sheets = {x['sheet'] for x in json.load(open(ts)).get('tiles', []) if 'sheet' in x}
        t += [os.path.join(ROOT, 'art/world/overworld', s) for s in sorted(sheets)]
    return t

def expand(paths):
    out = []
    for p in paths:
        out += glob.glob(os.path.join(p, '**/*.png'), recursive=True) if os.path.isdir(p) else [p]
    return out

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='*'); ap.add_argument('--verify-lock', action='store_true')
    ap.add_argument('--json'); ap.add_argument('--include-upscales', action='store_true')
    ap.add_argument('--strict-alpha', action='store_true'); ap.add_argument('--max-list', type=int, default=25)
    a = ap.parse_args()
    lock_ok = verify_lock() if a.verify_lock else True
    pal = load_palette()
    files = sorted(set(os.path.abspath(f) for f in (expand(a.paths) if a.paths else default_targets())))
    skipped = [f for f in files if SKIP.search(f.replace(os.sep, '/')) or (not a.include_upscales and UPSCALE.search(f))]
    files = [f for f in files if f not in set(skipped)]
    bad, translucent, total_px, off_total = {}, {}, 0, 0
    for f in files:
        im = Image.open(f).convert('RGBA'); cs = im.getcolors(im.width * im.height) or []
        off = {}; tr = 0
        for n, c in cs:
            if c[3] == 0: continue
            total_px += n
            if c[3] < 255:
                if c not in ALLOWED_ALPHA: tr += n
                continue
            if c[:3] not in pal: off['%02x%02x%02x' % c[:3]] = off.get('%02x%02x%02x' % c[:3], 0) + n
        rel = os.path.relpath(f, ROOT)
        if off: bad[rel] = {'off_px': sum(off.values()), 'off_colors': len(off), 'top': sorted(off.items(), key=lambda kv: -kv[1])[:5]}; off_total += sum(off.values())
        if tr: translucent[rel] = tr
    print(f'checked {len(files)} files ({total_px} visible px), skipped {len(skipped)} (portraits/preview/raw/debug/upscales), palette {len(pal)} colours')
    print(f'off-palette: {len(bad)} files, {off_total} px' + ('' if not bad else ''))
    for rel, v in sorted(bad.items(), key=lambda kv: -kv[1]['off_px'])[:a.max_list]:
        print(f"  OFF  {rel}: {v['off_px']} px, {v['off_colors']} colours, top {[k for k, _ in v['top']]}")
    print(f'translucent (other than allowed shadow): {len(translucent)} files, {sum(translucent.values())} px')
    for rel, n in sorted(translucent.items(), key=lambda kv: -kv[1])[:a.max_list]: print(f'  ALPHA {rel}: {n} px')
    if a.json:
        json.dump({'checked': len(files), 'skipped': len(skipped), 'off_palette': bad, 'translucent': translucent, 'lock_ok': lock_ok}, open(a.json, 'w'), indent=1)
    fail = bool(bad) or not lock_ok or (a.strict_alpha and bool(translucent))
    print('RESULT', 'FAIL' if fail else 'PASS'); return 1 if fail else 0

if __name__ == '__main__':
    sys.exit(main())
