"""Furniture v4 (hybrid): the full v2 redraw + v2 arrangement, except KEEP_OLD pieces which use the ORIGINAL art.
(v3 history: v3 was the inverse - original art + a KEEP_NEW list; Gary then preferred v2 except the lab crystal display cases.)

Gary's call on furniture v2 (d3aba69): the old set-ups / arrangement / look are closer to the target style; the redraw is
better only in places (depth + shading on bed, drawers, chair). So every *_v3.png sheet is rebuilt as:
    base  = the pre-v2 art the game showed before (commit BASE: *_v2.png, or the plain sheet for ix2_kit)
    paste = the full v2 redraw (commit REDRAW) for the pieces in KEEP_NEW only
    COPY  = redraw art pasted onto an old piece id (same footprint) so a room keeps its piece but gets the better model
Animations (furniture_v3_anim.json) are kept only for KEEP_NEW pieces (their extra frame cells are copied too).
Run from anywhere inside the repo:  python tools/furniture_v2/build_v3_hybrid.py ; then
    python tools/furniture/grid_fit_and_swap.py . --apply --no-swap   (refit collision to the art)  and  --check
"""
import io, json, os, re, subprocess
from PIL import Image
BASE, REDRAW = '80ae7f1', 'd3aba69'
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
OW_REL = 'art/world/overworld'; OW = os.path.join(ROOT, OW_REL)
SHEETS = ['tiles_1x/interior.png', 'interiors_new/tiles_1x/i_furniture.png', 'interiors_new/tiles_1x/i_brand.png',
          'tiles_1x/x_furniture_fix.png', 'tiles_1x/ix2_kit.png']
# v4 (Gary, after v3): v2 wins overall -> base = full v2 redraw (REDRAW); only the pieces in KEEP_OLD go back to the
# pre-v2 art (BASE) and lose any v2 animation. Room arrangement = v2 maps (swaps kept), collision via grid_fit --check.
KEEP_OLD = {  # (sheet basename, asset base name) -> original art kept; everything else = v2 redraw
    'i_furniture.png': {'i_crystal_display'},
    'interior.png': {'crystal_display'},
    'ix2_kit.png': set(), 'i_brand.png': set(), 'x_furniture_fix.png': set()}
def git_png(rev, rel):
    try: return Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{rev}:kilumen/{rel}'], cwd=ROOT, stderr=subprocess.DEVNULL))).convert('RGBA')
    except subprocess.CalledProcessError: return None
def git_json(rev, rel): return json.loads(subprocess.check_output(['git', 'show', f'{rev}:kilumen/{rel}'], cwd=ROOT))
def base(n): m = re.match(r'(.*)_(\d+)_(\d+)$', n); return (m.group(1), int(m.group(2)), int(m.group(3))) if m else (n, 0, 0)

tiles = [t for f in ('tileset.json', 'tileset_ix2.json') for t in json.load(open(os.path.join(OW, f)))['tiles']]
by = {}
for t in tiles: b, r, c = base(t['name']); by.setdefault((os.path.basename(t['sheet']), b), {})[(r, c)] = t
anim = git_json(REDRAW, f'{OW_REL}/furniture_v3_anim.json')
old_ids = {t['id'] for (s, b), cells in by.items() if b in KEEP_OLD.get(s, ()) for t in cells.values()}
kept_anim = {k: v for k, v in anim['anim'].items() if int(k) not in old_ids}
def v(rel, n, suf): return rel.replace('tiles_1x', f'tiles_{n}x')[:-4] + suf + '.png'
for rel in SHEETS:
    sb = os.path.basename(rel)
    cells = [t['index'] for b in KEEP_OLD[sb] for t in by.get((sb, b), {}).values()]
    for n in (1, 2, 3):
        new = git_png(REDRAW, f'{OW_REL}/' + v(rel, n, '_v3')); C = 64 * n
        if new is None: continue
        out = new.copy()
        if cells:
            old = git_png(BASE, f'{OW_REL}/' + v(rel, n, '' if sb == 'ix2_kit.png' else '_v2'))
            for i in cells:
                x, y = i % 16 * C, i // 16 * C
                out.paste(Image.new('RGBA', (C, C), (0, 0, 0, 0)), (x, y)); out.paste(old.crop((x, y, x + C, y + C)), (x, y))
        out.save(os.path.join(OW, v(rel, n, '_v3')), optimize=True)
        print('built', v(rel, n, '_v3'), len(cells), 'cells from original art')
# lighting normals (ixlight loads tiles_1x/interior_v3_n.png): v2 normals + original normals for KEEP_OLD interior cells
nold, nnew = git_png(BASE, f'{OW_REL}/tiles_1x/interior_v2_n.png'), git_png(REDRAW, f'{OW_REL}/tiles_1x/interior_v3_n.png')
for b in KEEP_OLD['interior.png']:
    for t in by.get(('interior.png', b), {}).values():
        i = t['index']; x, y = i % 16 * 64, i // 16 * 64
        nnew.paste(nold.crop((x, y, x + 64, y + 64)), (x, y))
nnew.save(os.path.join(OW, 'tiles_1x/interior_v3_n.png'), optimize=True)
anim['anim'] = kept_anim; anim['note'] += '; v4: all v2 animations except KEEP_OLD pieces (tools/furniture_v2/build_v3_hybrid.py)'
json.dump(anim, open(os.path.join(OW, 'furniture_v3_anim.json'), 'w'), indent=1)
print('anim kept', len(kept_anim), 'of', len(git_json(REDRAW, f'{OW_REL}/furniture_v3_anim.json')['anim']))
