#!/usr/bin/env python3
"""Furniture perspective pass (wd/furniture-perspective): procedurally re-project and re-shade every furniture sprite on
the in-game *_v3 furniture sheets onto ONE viewpoint (about 35 deg top-down tilt, light from the top-left), per
design/worldbuilding_audit.md section 6 (Coder's spec):
  tall pieces (shelves, cupboards, fridges, machines): top face 25-35% of sprite height. FRONTAL ones (top < 20%)
      get a new top face: the front is resampled into the lower ~70% and a lit top slab is drawn above it.
  every piece: greyscale value step, top >= 1.35x front mean (front recess rows darkened); left third >= right third
      (light from the top-left); 1 px dark seam between top and front; 2 px drop shadow down-right at ~30% alpha.
Source = the committed sheets at SRC_REV (idempotent: rerunning never re-shades twice). Works at the 32 px native
grid (the 1x sheet is 2x nearest), writes tiles_1x/2x/3x *_v3.png (+ .webp) and a per-piece log (TSV).
Skipped: walls, windows, posters, signs, rugs/mats, doors, stairs, plants, banners, and the crystal display cases
(Gary keeps their old art).
Usage: python3 tools/furniture_perspective/reshade.py [--log out.tsv]"""
import io, json, os, re, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage
SRC_REV = os.environ.get('SRC_REV', '1bf5c771')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
OW = os.path.join(ROOT, 'art/world/overworld')
SHEETS = [('interiors_new/tiles_{s}/i_furniture_v3.png', 'interiors_new/tiles_1x/i_furniture.png'),
          ('interiors_new/tiles_{s}/i_brand_v3.png', 'interiors_new/tiles_1x/i_brand.png'),
          ('tiles_{s}/interior_v3.png', 'tiles_1x/interior.png'),
          ('tiles_{s}/x_furniture_fix_v3.png', 'tiles_1x/x_furniture_fix.png'),
          ('tiles_{s}/ix2_kit_v3.png', 'tiles_1x/ix2_kit.png')]
SKIP = re.compile(r'wall|window|poster|sign|rug|mat(_|$)|door|stairs|plant|banner|logo|crystal_display|floor|void|'
                  r'photos|wall_art|cork|clock|_mark|timetable|cooler_top|frame|curtain|platform|rail_|light|lamp|shadow|tree|flower')
TALL = re.compile(r'bookcase|bookshelf|cupboard|fridge|locker|shelf|filing|server|machine|cabinet|dresser|wardrobe|trophy|tool_rack|terminal|vending|fireplace|heal_machine|specimen|pillar|statue|lantern_stand|coat_rack|plant_tall|polisher')
LOW_KEEP = re.compile(r'bed|table|desk|counter|sofa|couch|chair|stool|bench|rug')  # never re-projected, value/light only
def git_png(rel):
    b = subprocess.check_output(['git', 'show', f'{SRC_REV}:kilumen/art/world/overworld/{rel}'], cwd=ROOT)
    return Image.open(io.BytesIO(b)).convert('RGBA')
FURN_CAT = {'furniture', 'interior', 'prop'}
def names_by_cell():
    """(col,row) -> tile name per base sheet; animation frame cells inherit their tile's name. Non-furniture
    categories (floors, walls, rugs, doors) are recorded as '#skip' so their components are never touched."""
    out = {}; byid = {}
    for f in ('tileset.json', 'tileset_ix2.json'):
        for t in json.load(open(os.path.join(OW, f)))['tiles']:
            nm = t['name'] if t.get('category') in FURN_CAT and not re.match(r'(floor|iwall|wall)', t['name']) else '#skip'
            out.setdefault(t['sheet'], {})[(t['col'], t['row'])] = nm; byid[t['id']] = (t['sheet'], nm)
    anim = json.load(open(os.path.join(OW, 'furniture_v3_anim.json')))['anim']
    for tid, a in anim.items():
        if int(tid) not in byid: continue
        sh, nm = byid[int(tid)]
        for fr in a['frames']: out[sh].setdefault((fr % 16, fr // 16), nm)
    return out
def luma(a): return 0.299*a[..., 0]+0.587*a[..., 1]+0.114*a[..., 2]
def split_row(L, m):
    h, w = m.shape; rows = [(r, L[r][m[r]].mean()) for r in range(h) if m[r].sum() > w*0.3]
    if len(rows) < 6: return None
    v = np.array([x[1] for x in rows]); k = len(v)
    sc, s = max((abs(v[:s].mean()-v[s:].mean()), s) for s in range(max(1, int(k*.1)), max(2, int(k*.7))))
    return rows[0][0], rows[s][0], rows[-1][0]
def reproject_tall(px, m, top, s, bot):
    """Front squeezed into the lower 70%, new lit top slab (30%) above; px is HxWx4 float at native scale."""
    H = bot-top+1; newtop = max(2, round(H*0.30)); fh = H-newtop
    src = np.arange(fh)*(bot-s+1)/fh + s
    out = px.copy(); mo = m.copy()
    rows = np.clip(src.astype(int), s, bot)
    out[top+newtop:bot+1] = px[rows]; mo[top+newtop:bot+1] = m[rows]
    # top slab: silhouette = first front row; colour = the piece's lightest frame tone, lifted
    cols = np.where(m[s])[0] if m[s].any() else np.where(m[top])[0]
    l0, r0 = cols.min(), cols.max()
    capr = px[top:s+1][m[top:s+1]][:, :3]   # the old (thin) top/cap rows give the material colour
    if not capr.size: capr = px[s:bot+1][m[s:bot+1]][:, :3]
    base = np.median(capr, 0); base = base+(255-base)*0.30
    for y in range(top, top+newtop):
        out[y, :, 3] = 0; mo[y] = False
        out[y, l0:r0+1, :3] = base; out[y, l0:r0+1, 3] = 255; mo[y, l0:r0+1] = True
        if (y-top) % 3 == 2: out[y, l0+1:r0, :3] = base*0.93  # plank seam on the slab
    out[top, l0:r0+1, :3] = base*0.35; out[top+newtop-1, l0:r0+1, :3] = base*0.35  # outline + seam
    out[top:top+newtop, l0, :3] = base*0.35; out[top:top+newtop, r0, :3] = base*0.35
    return out, mo, top+newtop
def shade(px, m, top, s, bot):
    a = px[..., :3]; L = luma(a)
    t = L[top:s][m[top:s]]; f = L[s:bot+1][m[s:bot+1]]
    if t.size and f.size:
        tm, fm = t.mean(), max(f.mean(), 1)
        if tm < fm*1.35:  # lift the top (greyscale screen layer), then sink the front (multiply layer)
            k = max(0.72, min(0.92, tm/(fm*1.35)+0.1))
            a[s:bot+1][m[s:bot+1]] *= k; fm *= k
            need = min(0.30, max(0.0, (fm*1.35-tm)/max(255-tm, 1)))
            a[top:s][m[top:s]] += (255-a[top:s][m[top:s]])*need
        # 1 px dark seam at the top/front edge, outline-dark (<=35% of top luma)
        sr = m[s]; a[s][sr] = np.minimum(a[s][sr], a[s][sr]*0.45)
    # light from the top-left: horizontal multiply ramp until left third >= right third
    ys, xs = np.where(m)
    if xs.size:
        x0, x1 = xs.min(), xs.max(); w = max(x1-x0, 1)
        for _ in range(4):
            Lc = luma(a); th = w//3
            lt = Lc[:, x0:x0+th+1][m[:, x0:x0+th+1]].mean(); rt = Lc[:, x1-th:x1+1][m[:, x1-th:x1+1]].mean()
            if lt >= rt: break
            ramp = 1.07-0.14*(np.arange(px.shape[1])-x0)/w
            a *= np.clip(ramp, 0.9, 1.08)[None, :, None]
    px[..., :3] = np.clip(a, 0, 255)
    return px
def drop_shadow(px, m, cellmask):
    sh = np.zeros_like(m); sh[2:, 2:] = m[:-2, :-2]; sh[1:, 1:] |= m[:-1, :-1]
    put = sh & ~m & cellmask
    px[put, :3] = 20; px[put, 3] = 72  # ~28% alpha
    return px
def process(img1x, cells, log, tag):
    full = np.array(img1x).astype(float); a = full[::2, ::2].copy()   # native 32 px grid
    touched = np.zeros(a.shape[:2], bool)
    A = a[..., 3] > 40; lab, _ = ndimage.label(A); changed = 0
    for i, sl in enumerate(ndimage.find_objects(lab)):
        sl = (slice(max(sl[0].start-1, 0), min(sl[0].stop+2, a.shape[0])), slice(max(sl[1].start-1, 0), min(sl[1].stop+2, a.shape[1])))
        m = lab[sl] == i+1; h = m.any(1).sum(); w = m.any(0).sum()
        if h < 10 or w < 10 or (w > 50 and h < 0.45*w): continue
        y0, x0 = sl[0].start*2//64, sl[1].start*2//64; y1, x1 = (sl[0].stop*2-1)//64, (sl[1].stop*2-1)//64
        nm = sorted({cells.get((c, r), '') for r in range(y0, y1+1) for c in range(x0, x1+1)} - {''})
        key = ' '.join(nm) or '(anim frame)'
        if not nm or any(n == '#skip' or SKIP.search(n) for n in nm): continue
        px = a[sl].copy(); L = luma(px)
        sp = split_row(L, m)
        if not sp: continue
        top, s, bot = sp; H = bot-top+1; frac = (s-top)/H; how = []
        tall = bool(TALL.search(key)) or (not LOW_KEEP.search(key) and h > w*1.15)
        if tall and frac < 0.20 and not LOW_KEEP.search(key):
            px, m2, s = reproject_tall(px, m, top, s, bot); m = m2; how.append(f'reprojected top {frac:.0%}->30%')
        px = shade(px, m, top, s, bot); how.append('value/light re-shade')
        # cell mask: shadow never crosses into a neighbouring piece's cell area outside this component's cells
        cm = np.zeros(m.shape, bool)
        for r in range(m.shape[0]):
            for c in range(m.shape[1]):
                Y, X = (sl[0].start+r)*2//64, (sl[1].start+c)*2//64
                cm[r, c] = y0 <= Y <= y1 and x0 <= X <= x1
        px = drop_shadow(px, m, cm & ~(lab[sl] > 0) | m); how.append('drop shadow 2px DR')
        region = a[sl]; keep = (lab[sl] > 0) & ~(lab[sl] == i+1)   # never paint over other components
        px[keep] = region[keep]; diff = (np.abs(px-region).sum(-1) > 0) & ~keep
        a[sl] = px; touched[sl] |= diff; changed += 1
        log.append(f'{tag}\t{sl[1].start*2}\t{sl[0].start*2}\t{key}\t{"tall" if tall else "low"}\t{"; ".join(how)}')
    up = a.repeat(2, 0).repeat(2, 1); tu = touched.repeat(2, 0).repeat(2, 1)
    full[tu] = up[tu]   # only re-shaded pixels change; untouched art keeps its exact 64 px detail
    return Image.fromarray(np.clip(full, 0, 255).astype(np.uint8), 'RGBA'), changed
def main():
    cells = names_by_cell(); log = []; out = sys.argv[sys.argv.index('--log')+1] if '--log' in sys.argv else None
    for pat, base in SHEETS:
        rel = pat.format(s='1x'); src = git_png(rel)
        new, n = process(src, cells.get(base, {}), log, os.path.basename(rel))
        for s, k in (('1x', 1), ('2x', 2), ('3x', 3)):
            p = os.path.join(OW, pat.format(s=s))
            if not os.path.exists(p): continue
            im = new if k == 1 else new.resize((new.width*k, new.height*k), Image.NEAREST)
            im.save(p, optimize=True)
            if os.path.exists(p[:-4]+'.webp'): im.save(p[:-4]+'.webp', lossless=True)
        print(f'{rel}: {n} pieces re-shaded')
    if out: open(out, 'w').write('sheet\tx\ty\tpiece\tclass\tchange\n'+'\n'.join(log)+'\n')
if __name__ == '__main__': main()
