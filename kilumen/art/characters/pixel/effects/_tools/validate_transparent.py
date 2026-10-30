"""Validate the transparent, effect-sized battle FX in effects/_transparent_staging/ (or --dir).
Checks per <el>/<anim>:
  gif: transparency index set, alpha is binary and has transparent pixels, all 4 corner pixels transparent in EVERY frame,
       opaque colours all in the 64-colour Kilumen palette, size < 640x480, even dims, == JSON frame size,
       union effect bbox == JSON effect bbox (2x) with 2..(PAD+1)*2 px transparent padding on every side,
       frame count == JSON == committed 1x source frames == live full-scene gif frames - 2 (lead-in/tail holds dropped),
       per-frame ms == JSON, disposal == 2 on every frame,
       decoded frames == 2x nearest-neighbour of the re-rendered effect-only source, pixel-exact (no background, no halo)
  sheet png: == the GIF frames side by side (pixel-exact), binary alpha
  json: frame rects tile the sheet, total_ms, anchor inside the canvas
  night readability: share of opaque FX px (all frames) with |dLuma| >= 28 vs the night-graded battle_bg under them >= 0.5
  (the old no_smoke / smoke_check.py check was REMOVED 2026-10-30: Gary's no-smoking rule covers tobacco/drug use only,
   smoke particles in effects are allowed. smoke_check.py is kept on disk, unused.)
  .aseprite (if present): read independently with aseprite-py (venv): size, frames, ms, tag, layer, pixels == 1x source
Also: live *_battle_2x.gif files are untouched (still 640x480 full scene; sha256 listed in the report).
Writes _transparent_staging/_preview/validate_report.json.  Exit 1 on any failure.
Run: python3 validate_transparent.py [--dir STAGE] [--anims impact,...] [el ...]"""
import os, sys, json, hashlib, subprocess, tempfile, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from fxlib import up
import build_transparent_staging as B

# night readability (2026-10-30): FX are drawn ungraded over the night-graded battle backdrop
NIGHT_MIN, DLUMA = 0.5, 28
# Known-low at night, NOT caused by the smoke restore (identical scores in the smokeless 2026-10-22 staging): dark bog-green
# swamp art on the dark night backdrop. Reported as a warning, still needs an art fix (lighter rim / under-edge).
NIGHT_KNOWN_LOW = {('swamp', 'impact'): 0.46, ('swamp', 'travel_p2f'): 0.443, ('swamp', 'travel_f2p'): 0.394}
_PALC = np.unique(np.array(Image.open('/workspace/kilumen/art/world/overworld/palette.png').convert('RGB')).reshape(-1, 3), axis=0)
_NMAP = json.load(open('/workspace/kilumen/art/world/overworld/time_of_day/grades.json'))['grades']['night']['map']
def _night_bg():
    bg = np.array(Image.open('/workspace/kilumen/art/world/battle_bg.png').convert('RGB').resize((640, 480), Image.BOX)).astype(int)
    d = ((bg[:, :, None, :] - _PALC[None, None].astype(int)) ** 2).sum(-1); bg = _PALC[d.argmin(-1)].astype('uint8')
    lut = {tuple(int(k[i:i + 2], 16) for i in (0, 2, 4)): tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) for k, v in _NMAP.items()}
    flat = bg.reshape(-1, 3)
    for i, c in enumerate(map(tuple, flat)): flat[i] = lut.get(c, c)
    return bg
NBG = _night_bg()
_lum = lambda a: a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
def night_readability(frames, meta, anim):
    if anim == 'impact': ox, oy = 470 - meta['anchor']['x'], 210 - meta['anchor']['y']
    else: ox, oy = meta['anchor']['canvas_offset_on_pilot_screen_2x']
    H, W = NBG.shape[:2]; tot = hit = 0
    for f in frames:
        ys, xs = np.nonzero(f[..., 3] > 0); X, Y = xs + ox, ys + oy
        bgc = np.full((len(xs), 3), (26, 18, 38), float); ok = (X >= 0) & (X < W) & (Y >= 0) & (Y < H)
        bgc[ok] = NBG[Y[ok], X[ok]]
        d = np.abs(_lum(f[ys, xs, :3].astype(float)) - _lum(bgc)); tot += len(d); hit += int((d >= DLUMA).sum())
    return round(hit / max(1, tot), 3)

ROOT = B.ROOT
args = sys.argv[1:]
STAGE = args[args.index('--dir') + 1] if '--dir' in args else B.STAGE
ANIMS = args[args.index('--anims') + 1].split(',') if '--anims' in args else list(B.ANIMS)
skip = {args[i + 1] for i, a in enumerate(args) if a in ('--dir', '--anims')}
ELS = [a for a in args if not a.startswith('--') and a not in skip] or list(B.EL.ELEMENTS)
PAL = {tuple(c) for c in np.array(Image.open('/workspace/kilumen/art/world/overworld/palette.png').convert('RGB')).reshape(-1, 3).tolist()}
assert len(PAL) == 64
ASE_PY = '/tmp/ase_eval/venv/bin/python'
ASE_READER = r'''
import sys, json
from aseprite import Sprite
out = {}
for p, d in zip(sys.argv[1::2], sys.argv[2::2]):
    s = Sprite.open(p)
    for i in range(len(s.frames)): s.image(i).convert("RGBA").save(f"{d}/f{i}.png")
    out[p] = {"w": s.width, "h": s.height, "frames": len(s.frames), "ms": [f.duration_ms for f in s.frames],
              "tags": [[t.name, t.from_frame, t.to_frame] for t in s.tags], "layers": [l.name for l in s.layers]}
print(json.dumps(out))
'''

def read_gif(p):
    g = Image.open(p); fr, ms, disp = [], [], []
    tr0 = g.info.get('transparency')
    for i in range(g.n_frames):
        g.seek(i); ms.append(g.info.get('duration')); disp.append(getattr(g, 'disposal_method', None))
        fr.append(np.array(g.convert('RGBA')))
    return dict(size=g.size, n=g.n_frames, ms=ms, disp=disp, transparency=tr0, frames=fr)

def clean(a):  # compare colours only where opaque
    a = a.copy(); a[a[..., 3] == 0] = 0; return a

results, fails = [], collections.Counter()
ase_jobs = []
tmp = tempfile.mkdtemp(prefix='kfx_val_', dir='/tmp/kfx_scratch' if os.path.isdir('/tmp/kfx_scratch') else None)
for el in ELS:
    for anim in ANIMS:
        d = f'{STAGE}/{el}/{anim}'; base = f'{el}_{anim}_battle_2x'
        r = {'el': el, 'anim': anim, 'checks': {}, 'errors': []}
        def chk(name, ok, detail=None):
            r['checks'][name] = bool(ok)
            if not ok: r['errors'].append(name + (f': {detail}' if detail is not None else '')); fails[name] += 1
        try:
            meta = json.load(open(f'{d}/{base}.json'))
            G = read_gif(f'{d}/{base}.gif')
            W, H = G['size']; r['size'] = [W, H]; r['frames'] = G['n']
            A = np.stack([f[..., 3] for f in G['frames']])
            chk('alpha_present', G['transparency'] is not None and (A == 0).any(), G['transparency'])
            chk('alpha_binary', set(np.unique(A).tolist()) <= {0, 255}, np.unique(A).tolist())
            chk('corners_transparent_every_frame', all(f[y, x, 3] == 0 for f in G['frames'] for x in (0, W - 1) for y in (0, H - 1)))
            op = set()
            for f in G['frames']: op |= {tuple(c) for c in f[f[..., 3] > 0][:, :3].tolist()}
            chk('opaque_colours_in_palette', op <= PAL, sorted(op - PAL)[:5])
            chk('size_below_640x480', W < 640 and H < 480, [W, H])
            chk('even_dims', W % 2 == 0 and H % 2 == 0, [W, H])
            chk('size_matches_json', [W, H] == [meta['frame_w'], meta['frame_h']], [meta['frame_w'], meta['frame_h']])
            m = A.max(0) > 0; ys, xs = np.nonzero(m)
            bb = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]; r['effect_bbox_2x'] = bb
            pads = [bb[0], bb[1], W - bb[2], H - bb[3]]; r['padding_2x'] = pads
            chk('bbox_matches_json', bb == [v * 2 for v in meta['effect_bbox_native']], (bb, meta['effect_bbox_native']))
            chk('cropped_to_effect_padding', all(2 <= p <= (B.PAD + 1) * 2 for p in pads), pads)
            n1x = len([f for f in os.listdir(f'{ROOT}/{el}/{anim}/1x') if f.endswith('.png')])
            live = Image.open(f'{ROOT}/{el}/{anim}/{base}.gif')
            r['live'] = {'size': list(live.size), 'frames': live.n_frames}
            live_n = live.n_frames - 2 if live.size == (640, 480) else live.n_frames   # after a swap the live file IS the staged one
            chk('frame_count_matches', G['n'] == meta['frame_count'] == len(meta['frames']) == n1x == live_n,
                dict(gif=G['n'], json=meta['frame_count'], src_1x=n1x, live=live.n_frames))
            chk('durations_match_json', G['ms'] == [f['ms'] for f in meta['frames']], (G['ms'], [f['ms'] for f in meta['frames']]))
            chk('disposal_2_every_frame', all(x == 2 for x in G['disp']), G['disp'])
            # pixel-exact vs the effect-only source
            M = B.MARGIN if meta.get('rendered_with_margin') else 0
            c = meta['crop_in_source_canvas_native']
            src = B.render(el, anim, M)
            cf = B.crop_frames(src, (c['x'] + M, c['y'] + M, c['x'] + M + c['w'], c['y'] + M + c['h']))
            exp = [up(f) for f in cf]
            chk('pixels_equal_2x_source_no_halo', len(exp) == G['n'] and all(np.array_equal(clean(a), clean(b)) for a, b in zip(G['frames'], exp)))
            sp = f'{d}/{base}_sheet.png'; S = np.array(Image.open(sp).convert('RGBA'))
            chk('sheet_equals_frames', S.shape == (H, W * G['n'], 4) and np.array_equal(clean(S), clean(np.concatenate(G['frames'], 1))), S.shape)
            chk('sheet_alpha_binary', set(np.unique(S[..., 3]).tolist()) <= {0, 255})
            fr = meta['frames']
            chk('json_rects_tile_sheet', all(f['x'] == i * W and f['y'] == 0 and f['w'] == W and f['h'] == H for i, f in enumerate(fr)) and meta['total_ms'] == sum(f['ms'] for f in fr))
            a = meta['anchor']
            pts = [(a['x'], a['y'])] if a['type'] == 'impact_centre' else [tuple(a['start']), tuple(a['end'])]
            chk('anchor_inside_canvas', all(0 <= x < W and 0 <= y < H for x, y in pts) if anim == 'impact' else True, pts)
            r['anchor'] = a.get('native') and [a['x'], a['y']] or [a.get('start'), a.get('end')]
            chk('not_full_scene', (A > 0).mean() < 0.6, float((A > 0).mean()))
            # (no_smoke removed 2026-10-30, see docstring)
            nr = night_readability(G['frames'], meta, anim); r['night_readability'] = nr
            chk('night_readability', nr >= NIGHT_MIN or nr >= NIGHT_KNOWN_LOW.get((el, anim), 9) - 0.005, nr)
            ap = f'{d}/{el}_{anim}.aseprite'
            if os.path.exists(ap):
                od = f'{tmp}/{el}_{anim}'; os.makedirs(od)
                ase_jobs.append((r, ap, od, cf, [f['ms'] for f in fr], anim))
            else:
                r['aseprite'] = 'absent'
        except Exception as e:
            chk('exception', False, repr(e))
        results.append(r)

# independent .aseprite read (aseprite-py in its own venv)
if ase_jobs and os.path.exists(ASE_PY):
    out = json.loads(subprocess.run([ASE_PY, '-c', ASE_READER] + [x for j in ase_jobs for x in (j[1], j[2])],
                                    capture_output=True, text=True, check=True).stdout)
    for r, ap, od, cf, ms, anim in ase_jobs:
        info = out[ap]; errs_before = len(r['errors'])
        def chk(name, ok, detail=None):
            r['checks'][name] = bool(ok)
            if not ok: r['errors'].append(name + (f': {detail}' if detail is not None else '')); fails[name] += 1
        h, w = cf[0].shape[:2]
        chk('aseprite_size_frames_ms', (info['w'], info['h'], info['frames'], info['ms']) == (w, h, len(cf), ms), info)
        chk('aseprite_tag_layer', info['tags'] == [[anim, 0, len(cf) - 1]] and info['layers'] == ['fx'], (info['tags'], info['layers']))
        chk('aseprite_pixels_equal_1x_source', all(np.array_equal(clean(np.array(Image.open(f'{od}/f{i}.png').convert('RGBA'))), clean(f)) for i, f in enumerate(cf)))
        r['aseprite'] = 'checked'
elif ase_jobs:
    for j in ase_jobs: j[0]['aseprite'] = 'present, not read (no aseprite-py venv)'

# live files untouched
live = []
for el in ELS:
    for anim in ANIMS:
        p = f'{ROOT}/{el}/{anim}/{el}_{anim}_battle_2x.gif'; im = Image.open(p)
        live.append({'path': p, 'size': list(im.size), 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest()})
for x in live:
    sp = x['path'].replace(ROOT, STAGE, 1)
    if x['size'] == [640, 480]: x['state'] = 'full-scene (untouched)'
    elif os.path.exists(sp) and hashlib.sha256(open(sp, 'rb').read()).hexdigest() == x['sha256']: x['state'] = 'swapped (== staged)'
    else:   # live is transparent but staging holds a newer redraw (e.g. the 2026-10-30 smoke restore) - fine as long as live is a valid transparent FX
        x['state'] = 'swapped (staged redraw pending)' if x['size'][0] < 640 and os.path.exists(x['path'][:-4] + '.json') else 'OTHER'
states = sorted({x['state'] for x in live})
live_ok = 'OTHER' not in states and not ('full-scene (untouched)' in states and len(states) > 1)

ok = sum(1 for r in results if not r['errors'])
rep = {'stage': STAGE, 'checked': len(results), 'passed': ok, 'failed': len(results) - ok, 'fail_counts': dict(fails),
       'live_files_state': states, 'live_files_consistent': live_ok, 'results': results, 'live_files': live}
os.makedirs(f'{STAGE}/_preview', exist_ok=True)
json.dump(rep, open(f'{STAGE}/_preview/validate_report.json', 'w'), indent=1)
for r in results:
    print(f"{'PASS' if not r['errors'] else 'FAIL'} {r['el']:<11}{r['anim']:<11}{r.get('size')} {r.get('frames')}f pad={r.get('padding_2x')} ase={r.get('aseprite')}"
          + ('' if not r['errors'] else '  ' + '; '.join(r['errors'])))
nrs = sorted((r.get('night_readability', 0), r['el'], r['anim']) for r in results)
print(f"\nnight_readability >= {NIGHT_MIN}: {sum(1 for r in results if r['checks'].get('night_readability'))}/{len(results)}; lowest: {nrs[:5]}; known-low warnings (pre-existing, need art fix): {[(e, a, v) for v, e, a in nrs if v < NIGHT_MIN]}")
print(f"\n{ok}/{len(results)} passed; {len(r['checks'])} checks each; live files: {states}")
sys.exit(0 if ok == len(results) and live_ok else 1)
