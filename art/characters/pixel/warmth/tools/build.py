"""Build Crystal Warmth data: masks, crystal index lists, warmth_tints.json, validation.
Run from this folder: python3 build.py   (previews: python3 previews.py)"""
import json, os, glob, pickle
import numpy as np
from PIL import Image
from wlib import *
from classify import classify_creature
from ramps import *

WARM = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASKS = os.path.join(WARM, 'masks')
H = lambda h: '#' + h

def rle(m):
    out = []
    for y in range(m.shape[0]):
        row = m[y]; x = 0; W = len(row)
        while x < W:
            if row[x]:
                x0 = x
                while x < W and row[x]: x += 1
                out.append([y, x0, x - 1])
            else: x += 1
    return out

def recolor(a, mask, stage_map):
    o = a.copy()
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        h = hx(a[y, x]);
        if h in stage_map: o[y, x, :3] = [int(stage_map[h][i:i + 2], 16) for i in (0, 2, 4)]
    return o

def main():
    allL = {}; tints = {}; report = []
    for n in NAMES:
        L = classify_creature(n); allL[n] = L
        cdir = os.path.join(CRE, n); idx = {'creature': n, 'source_colours': [H(v) for v in V],
               'note': 'Pixel lists are run-length rows [y, x_start, x_end] (inclusive) in native sprite pixels. '
                       'Scaled variants (_2x/_3x) and sheets use the same mask nearest-upscaled / tiled; their mask PNGs are also exported.',
               'sprites': {}}
        masks_native = {}
        for rel in sorted(L):
            a = load(n, rel); m = L[rel] == 1; masks_native[rel] = m
            cols = sorted({hx(p) for p in a[m][:, :3]})
            assert set(cols) <= set(V), (n, rel, cols)
            p = os.path.join(MASKS, n, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
            Image.fromarray((m * 255).astype(np.uint8), 'L').save(p)
            idx['sprites'][rel] = {'size': [a.shape[1], a.shape[0]], 'crystal_px': int(m.sum()),
                                   'colours_present': [H(c) for c in cols], 'rows': rle(m)}
            # scaled variants
            for s in (2, 3):
                var = os.path.join(cdir, rel[:-4] + f'_{s}x.png')
                if os.path.exists(var):
                    b = np.array(Image.open(var).convert('RGBA'))
                    up = np.repeat(np.repeat(a, s, 0), s, 1)
                    if not np.array_equal(b, up): report.append(f'WARN {n} {rel} _{s}x is not an exact nearest upscale')
                    mm = np.repeat(np.repeat(m, s, 0), s, 1)
                    Image.fromarray((mm * 255).astype(np.uint8), 'L').save(p[:-4] + f'_{s}x.png')
        # sheets: locate each native frame tile inside the sheet
        sheet_info = {}
        for sp in sorted(glob.glob(os.path.join(cdir, '*', '*_sheet*.png'))):
            relsheet = os.path.relpath(sp, cdir)
            if any(seg in relsheet.split('/') for seg in ('base', '_work', 'raw')): continue
            sc = 3 if relsheet.endswith('_3x.png') else 2 if relsheet.endswith('_2x.png') else 1
            b = np.array(Image.open(sp).convert('RGBA')); mm = np.zeros(b.shape[:2], bool); tiles = []
            base = os.path.basename(relsheet).replace('_sheet', '').replace('_2x', '').replace('_3x', '')[:-4]
            cands = [r for r in L if ('anim/' in r and os.path.basename(os.path.dirname(r)) == base) or
                     (base.endswith('_ow') and r.startswith('overworld/'))]
            for rel in cands:
                a = load(n, rel); up = np.repeat(np.repeat(a, sc, 0), sc, 1); th, tw = up.shape[:2]
                found = None
                for y in range(0, b.shape[0] - th + 1, th):
                    for x in range(0, b.shape[1] - tw + 1, tw):
                        if np.array_equal(b[y:y + th, x:x + tw], up): found = (x, y); break
                    if found: break
                if found is None:
                    if a[..., 3].any(): report.append(f'WARN {n} {relsheet}: frame {rel} not found'); continue
                    continue
                x, y = found; mm[y:y + th, x:x + tw] = np.repeat(np.repeat(masks_native[rel], sc, 0), sc, 1)
                tiles.append({'frame': rel, 'x': x, 'y': y, 'w': tw, 'h': th})
            p = os.path.join(MASKS, n, relsheet); os.makedirs(os.path.dirname(p), exist_ok=True)
            Image.fromarray((mm * 255).astype(np.uint8), 'L').save(p)
            if sc == 1: sheet_info[relsheet] = tiles
        idx['sheets'] = sheet_info
        with open(os.path.join(MASKS, n, 'crystal_index.json'), 'w') as f: json.dump(idx, f, separators=(',', ':'))
        # tints
        fam, elem, why = CREATURES[n]; sig, signame, _ = RAMPS[fam]; st = stages(n)
        tints[n] = {'element': elem, 'signature': H(sig), 'signature_name': signame, 'ramp_family': fam, 'why': why,
                    'stages': {str(i): {H(v): H(t) for v, t in zip(V, st[i])} for i in range(4)},
                    'mask_dir': f'masks/{n}/', 'crystal_index': f'masks/{n}/crystal_index.json',
                    'sprites_without_visible_crystal': sorted(r for r in L if not (L[r] == 1).any())}
    pickle.dump(allL, open('/tmp/w/labels.pkl', 'wb'))
    doc = {
     'feature': 'Crystal Warmth (SOUL_PLAYBOOK 1.1)',
     'status': 'DRAFT: art NOT signed off by Gary. Do not ship until approved.',
     'version': 1,
     'palette': 'art/world/overworld/palette.hex (all colours below are from it)',
     'thresholds': [{'stage': s, 'warmth_min': lo, 'warmth_max': hi, 'label': lab} for s, lo, hi, lab in THRESHOLDS],
     'source_ramp': [H(v) for v in V],
     'how_to_apply': ('stage = 0 if warmth<25 else 1 if warmth<50 else 2 if warmth<75 else 3. For each pixel where the crystal mask '
                      '(masks/<creature>/<same relative path as the sprite>) is non-zero, replace its RGB using stages[stage] '
                      '(exact #rrggbb match, alpha unchanged). Pixels outside the mask are NEVER changed, even if they are the same violet. '
                      'Stage 0 is identity. Masks exist for every native frame, _2x/_3x variant and sprite sheet; or nearest-upscale the native mask.'),
     'creatures': tints}
    with open(os.path.join(WARM, 'warmth_tints.json'), 'w') as f: json.dump(doc, f, indent=1)
    # validation: recolour every native sprite at every stage; diff must be inside mask, colours on palette
    pal = set(PAL); bad = 0
    for n in NAMES:
        st = stages(n)
        for rel, Lr in allL[n].items():
            a = load(n, rel); m = Lr == 1
            for s in range(4):
                o = recolor(a, m, dict(zip(V, st[s])))
                ch = (o != a).any(-1)
                if (ch & ~m).any(): bad += 1; report.append(f'ERR {n} {rel} s{s}: change outside mask')
                if s == 0 and ch.any(): bad += 1; report.append(f'ERR {n} {rel}: stage0 not identity')
                cols = {hx(p) for p in o[o[..., 3] > 0][:, :3]}
                if not cols <= pal: report.append(f'WARN {n} {rel} off-palette {sorted(cols - pal)[:5]}')
        # used steps must change at every stage transition
        cnt = {v: 0 for v in V}
        for rel, Lr in allL[n].items():
            if rel.startswith('battle/') or '_stand' in rel:
                a = load(n, rel)
                for p in a[Lr == 1][:, :3]: cnt[hx(p)] += 1
        tot = sum(cnt.values())
        for i, v in enumerate(V):
            if cnt[v] / tot >= 0.1:
                for s in range(3):
                    if st[s][i] == st[s + 1][i]: report.append(f'NOTE {n}: step {v} ({100*cnt[v]//tot}%) same in stage {s} and {s+1}')
    print('\n'.join(report) or 'no warnings'); print('errors', bad)

if __name__ == '__main__': main()
