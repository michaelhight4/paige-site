"""Furniture v3 (hybrid): keep the ORIGINAL room look, take only the redrawn models that keep it.

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
KEEP_NEW = {  # (sheet basename, asset base name) -> redrawn model kept; everything else = original art
    'i_furniture.png': {'i_bed_fern', 'i_bookcase_brook', 'i_bookcase_lantern', 'i_chair_brook', 'i_chair_fern', 'i_chair_lantern',
                        'i_chair_salt', 'i_dresser_brook', 'i_globe', 'i_barrel', 'i_plant_flower', 'i_plant_mushroom',
                        'i_river_stones', 'i_salt_jars', 'i_server_rack', 'i_kitchen_fridge'},
    'interior.png': {'chair', 'home_dresser_brook', 'home_globe', 'home_luggage', 'plant', 'shelf', 'sofa', 'home_bookcase_cinder'},
    'ix2_kit.png': {'kit_bookshelf3_worn_brown', 'kit_chair3_worn_brown_l', 'kit_chair3_worn_brown_r', 'kit_book_stack_worn_red',
                    'kit_coat_rack3_worn_red', 'kit_fridge3_worn_teal'},
    'i_brand.png': set(), 'x_furniture_fix.png': set()}
COPY = {('interior.png', 'bed'): ('i_furniture.png', 'i_bed_brook')}  # bedroom bed: same white/purple bed, redrawn depth

def git_png(rev, rel):
    try: return Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{rev}:kilumen/{rel}'], cwd=ROOT, stderr=subprocess.DEVNULL))).convert('RGBA')
    except subprocess.CalledProcessError: return None
def git_json(rev, rel): return json.loads(subprocess.check_output(['git', 'show', f'{rev}:kilumen/{rel}'], cwd=ROOT))
def base(n): m = re.match(r'(.*)_(\d+)_(\d+)$', n); return (m.group(1), int(m.group(2)), int(m.group(3))) if m else (n, 0, 0)

tiles = [t for f in ('tileset.json', 'tileset_ix2.json') for t in json.load(open(os.path.join(OW, f)))['tiles']]
by = {}
for t in tiles: b, r, c = base(t['name']); by.setdefault((os.path.basename(t['sheet']), b), {})[(r, c)] = t
anim = git_json(REDRAW, f'{OW_REL}/furniture_v3_anim.json')
keep_ids = {t['id'] for (s, b), cells in by.items() if b in KEEP_NEW.get(s, ()) for t in cells.values()}
kept_anim = {k: v for k, v in anim['anim'].items() if int(k) in keep_ids}
idx_of = {t['id']: (os.path.basename(t['sheet']), t['index']) for t in tiles}
def v(rel, n, suf): return rel.replace('tiles_1x', f'tiles_{n}x')[:-4] + suf + '.png'
for rel in SHEETS:
    sb = os.path.basename(rel)
    moves = [(t['index'], t['index']) for b in KEEP_NEW[sb] for t in by.get((sb, b), {}).values()]
    moves += [(f, f) for k, a in kept_anim.items() if idx_of[int(k)][0] == sb for f in a['frames']]
    for (ds, db), (ss, sbn) in COPY.items():
        if ds == sb: moves += [(t['index'], ('x', ss, by[(ss, sbn)][rc]['index'])) for rc, t in by[(ds, db)].items()]
    for n in (1, 2, 3):
        old = git_png(BASE, f'{OW_REL}/' + v(rel, n, '' if sb == 'ix2_kit.png' else '_v2')); C = 64 * n
        if old is None: continue
        new = git_png(REDRAW, f'{OW_REL}/' + v(rel, n, '_v3')); out = old.copy(); extra = {}
        for dst, src in moves:
            if isinstance(src, tuple):
                srel = [s for s in SHEETS if os.path.basename(s) == src[1]][0]
                im = extra.setdefault(srel, git_png(REDRAW, f'{OW_REL}/' + v(srel, n, '_v3'))); si = src[2]
            else: im, si = new, src
            sx, sy, dx, dy = si % 16 * C, si // 16 * C, dst % 16 * C, dst // 16 * C
            if dy + C > out.height:  # anim frame rows beyond the old sheet: grow it
                g = Image.new('RGBA', (out.width, dy + C), (0, 0, 0, 0)); g.paste(out, (0, 0)); out = g
            out.paste(im.crop((sx, sy, sx + C, sy + C)), (dx, dy))
        out.save(os.path.join(OW, v(rel, n, '_v3')), optimize=True)
        print('built', v(rel, n, '_v3'), len(moves), 'cells from redraw')
# lighting normals (ixlight loads tiles_1x/interior_v3_n.png): old normals + redraw normals for kept interior cells
nold, nnew = git_png(BASE, f'{OW_REL}/tiles_1x/interior_v2_n.png'), git_png(REDRAW, f'{OW_REL}/tiles_1x/interior_v3_n.png')
for b in KEEP_NEW['interior.png'] | {db for (ds, db) in COPY if ds == 'interior.png'}:
    for t in by.get(('interior.png', b), {}).values():
        i = t['index']; x, y = i % 16 * 64, i // 16 * 64
        if b in KEEP_NEW['interior.png']: nold.paste(nnew.crop((x, y, x + 64, y + 64)), (x, y))
nold.save(os.path.join(OW, 'tiles_1x/interior_v3_n.png'), optimize=True)
anim['anim'] = kept_anim; anim['note'] += '; hybrid v3: only KEEP_NEW pieces animate (tools/furniture_v2/build_v3_hybrid.py)'
json.dump(anim, open(os.path.join(OW, 'furniture_v3_anim.json'), 'w'), indent=1)
print('anim kept', len(kept_anim), 'of', len(git_json(REDRAW, f'{OW_REL}/furniture_v3_anim.json')['anim']))
