"""Ondravel ow WALK sheet recolour (DRAFT). python3 _tools/build_walk_recolor.py
Applies build.py RAMP_SPREAD (imported, not copied) to the existing ondravel_ow_sheet.png; scores with build.score_ow."""
import sys, os, json, hashlib, io, contextlib
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
# import build.py's helpers without running its build loop: exec only the top part (up to '# ---- build ----')
src = open(f'{HERE}/build.py').read(); top = src.split('# ---- build ----')[0]
B = {'__file__': f'{HERE}/build.py'}; exec(compile(top, 'build.py', 'exec'), B)
RAMP, remap, keyhex, PALS, score_ow, QA_BG, comp, grade, PH, ow_bg, idle = (B[k] for k in
    ('RAMP_SPREAD', 'remap', 'keyhex', 'PALS', 'score_ow', 'QA_BG', 'comp', 'grade', 'PH', 'ow_bg', 'idle'))
ROOT = '/workspace/kilumen/art/characters/pixel/creatures/ondravel/overworld'
OUT = os.path.dirname(HERE) + '/ondravel_ow_walk_recolor'; os.makedirs(OUT, exist_ok=True)
sheet0 = np.array(Image.open(f'{ROOT}/ondravel_ow_sheet.png').convert('RGBA'))
H, W = sheet0.shape[:2]; FW = FH = 64; COLS, ROWS = W // FW, H // FH
COLN = ['stand', 'walk0', 'walk1', 'walk2', 'walk3']
# derive row order by matching tiles to the per-frame pngs
rows = []
for r in range(ROWS):
    t = sheet0[r*64:(r+1)*64, 0:64]
    m = [d for d in ('down', 'left', 'right', 'up') if np.array_equal(t, np.array(Image.open(f'{ROOT}/ondravel_ow/ondravel_ow_{d}_stand.png').convert('RGBA')))]
    assert len(m) == 1, (r, m); rows.append(m[0])
for r, d in enumerate(rows):
    for c, n in enumerate(COLN):
        assert np.array_equal(sheet0[r*64:(r+1)*64, c*64:(c+1)*64], np.array(Image.open(f'{ROOT}/ondravel_ow/ondravel_ow_{d}_{n}.png').convert('RGBA'))), (d, n)
sheet = remap(sheet0, RAMP)
vis = sheet[..., 3] > 0
assert set(keyhex(sheet)[vis]) <= PALS; assert set(np.unique(sheet[..., 3])) <= {0, 255}
assert np.array_equal(sheet[..., 3], sheet0[..., 3]); assert sheet.shape == sheet0.shape
Image.fromarray(sheet, 'RGBA').save(f'{OUT}/ondravel_ow_sheet.png', optimize=True)
fr = lambda s, r, c: s[r*64:(r+1)*64, c*64:(c+1)*64]
# idle colour match: colour set of walk frames vs idle frame 0 (= remapped stand), and every walk px colour in idle's set
idle_json = {}
res = {}; match = {}
for r, d in enumerate(rows):
    walks = [fr(sheet, r, c) for c in range(1, 5)]
    res[d] = {}
    for b in QA_BG: res[d][b], _ = score_ow(walks, b)
    ip = np.array(Image.open(f'{os.path.dirname(HERE)}/ondravel_ow_idle_{d}/ondravel_ow_idle_{d}.png').convert('RGBA'))
    idle_cols = set(keyhex(ip)[ip[..., 3] > 0]); i0 = ip[:64, :64]
    wc = set().union(*[set(keyhex(w)[w[..., 3] > 0]) for w in walks])
    stand_eq = bool(np.array_equal(fr(sheet, r, 0), i0))
    old = set(keyhex(sheet)[vis]) & set(RAMP)
    match[d] = dict(stand_equals_idle_frame0=stand_eq, walk_colours_not_in_idle=sorted(wc - idle_cols), old_ramp_colours_left=sorted(old))
night = {d: {b: res[d][b]['night'] for b in QA_BG} for d in rows}
worst = {d: min(res[d][b]['night']['worst_frame'] for b in QA_BG) for d in rows}
meta = dict(name='ondravel_ow_sheet (walk recolour)', status='DRAFT - needs Gary approval; game repo untouched', source=f'{ROOT}/ondravel_ow_sheet.png',
    source_sha256=hashlib.sha256(open(f'{ROOT}/ondravel_ow_sheet.png', 'rb').read()).hexdigest(),
    sheet='ondravel_ow_sheet.png', sheet_w=W, sheet_h=H, frame_w=FW, frame_h=FH, cols=COLS, rows_n=ROWS, rows=rows, cols_names=COLN,
    layout='same as original: row = facing, col 0 = stand, cols 1..4 = walk0..3 (movement.js frame())', art_px_scale=1,
    mapping=RAMP, mapping_source='_tools/build.py RAMP_SPREAD (imported)',
    readability_rule='build.score_ow: px with |dLuma|>=28 vs ToD-graded ground; pass >= 0.5', readability=res,
    night_mean_worst_ground={d: min(res[d][b]['night']['mean'] for b in QA_BG) for d in rows}, night_worst_single_frame=worst, idle_match=match)
json.dump(meta, open(f'{OUT}/ondravel_ow_sheet.json', 'w'), indent=1)
# gifs, native size (black-ish bg would change look; use transparency)
for r, d in enumerate(rows):
    ims = [Image.fromarray(fr(sheet, r, c), 'RGBA') for c in range(1, 5)]
    ims[0].save(f'{OUT}/ondravel_ow_walk_{d}_preview.gif', save_all=True, append_images=ims[1:], duration=150, loop=0, disposal=2)
# contact sheet: before/after x 4 phases, grass_0, all frames, x2 for viewing only
bg = ow_bg(['grass_0'], 1, 1); S = 2
rowsim = []
for r, d in enumerate(rows):
    for lab, s in (('before', sheet0), ('after', sheet)):
        segs = []
        for ph in PH:
            gb = grade(bg, ph, 'tile')
            segs.append((ph, [comp(gb, grade(fr(s, r, c), ph, 'sprite')) for c in range(5)]))
        rowsim.append((f'{d} {lab}', segs))
cw = 64 * S; wd = 110 + 4 * (5 * (cw + 2) + 12); hh = cw + 16
cs = Image.new('RGB', (wd, 22 + len(rowsim) * (hh + 4)), (10, 8, 14)); dr = ImageDraw.Draw(cs)
dr.text((6, 6), 'Ondravel ow walk recolour DRAFT - stand + walk0-3 over grass_0 at dawn|day|dusk|night (x2 view only)', fill=(255, 255, 255))
y = 22
for name, segs in rowsim:
    dr.text((4, y + 4), name, fill=(255, 255, 255)); x = 110
    if name.endswith('after'):
        dd = name.split()[0]; dr.text((4, y + 20), f"night {meta['night_mean_worst_ground'][dd]:.3f}", fill=(200, 230, 255))
    for ph, g in segs:
        dr.text((x, y + cw + 2), ph, fill=(255, 220, 140))
        for f in g: cs.paste(Image.fromarray(f[..., :3]).resize((cw, cw), Image.NEAREST), (x, y)); x += cw + 2
        x += 12
    y += hh + 4
cs.save(f'{OUT}/contact_sheet_before_after.png', optimize=True)
print(json.dumps(dict(rows=rows, night=meta['night_mean_worst_ground'], worst_frame=worst, match=match), indent=1))
