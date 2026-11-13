# Depth-cue study (Oct 22 2026, Gary: "we are missing a distinct 3D feel"). NON-DESTRUCTIVE preview only:
# reads maps/, tileset sheets, time_of_day/grades.json, interiors_new/home_recolours.json and character sheets;
# writes ONLY qa/depth_3d/*. Maps, tileset and run.py are untouched.
# Cues (applied in this order, light from the TOP-LEFT like tools/buildings.py and the tree art):
#   1 cast shadows   building drop shadow to the lower-right + an actor foot shadow (the engine's own hop-shadow shape), kit SHADOW colour
#   2 overhang       eave shadow band on the wall under each roof (one palette ramp step down, then a Bayer 50% band)
#   3 wall base      bottom 4 px of every building one ramp step down, next 4 px Bayer 50%
#   4 light side     east edge of walls/roof one step down (8 px), west edge one step up (3 px)
#   5 cliff faces    cliff lip highlight, face darkens toward the base, SHADOW strip on the ground under the cliff
#   E engine (optional, separate panel): native-pixel perspective squash toward the top of the screen (nearest, no new colours)
# Ramp steps come from palette.hex only (STEP_DN / STEP_UP below), so tile art stays inside the 64 colours; the only
# translucent pixels are the kit's single SHADOW colour (26,18,38,96), exactly like the existing tree/lamp/ledge shadows.
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(OW, 'tools'))
import preview_util as P, time_of_day as TOD
KIL = os.path.abspath(os.path.join(OW, '..', '..', '..'))
T = 64; SHADOW = (26, 18, 38, 96)
PAL = [tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for h in TOD.PAL]
PALKEY = {(r << 16) | (g << 8) | b for r, g, b in PAL}
GLOW = {tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for h in 'fcd668 e8ce92 ecdec4 f8eabe 603096 8a4ace b076ec d6acff'.split()}
GR = json.load(open(os.path.join(OW, 'time_of_day', 'grades.json')))['grades']

# ---------- palette ramp steps (OKLab nearest, darker/lighter, slight cool shift in shadow, never INTO a glow colour)
def oklab(c):
    c = np.asarray(c, float) / 255; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    return M2 @ np.cbrt(M1 @ c)
LAB = {c: oklab(c) for c in PAL}
def _step(c, down):
    L, a, b = LAB[c]; best, bs = c, 1e9
    for d in PAL:
        if d == c or (d in GLOW and c not in GLOW): continue
        L2, a2, b2 = LAB[d]; dL = (L - L2) if down else (L2 - L)
        if not (0.03 < dL < 0.24): continue
        ta, tb = (a * 0.95 + 0.006, b * 0.85 - 0.012) if down else (a, b)     # shadows a touch cooler/violet (kit SHADOW is violet-black)
        s = (dL - 0.09) ** 2 * 3 + (a2 - ta) ** 2 + (b2 - tb) ** 2
        if s < bs: best, bs = d, s
    return best
STEP_DN = {c: _step(c, True) for c in PAL}; STEP_UP = {c: _step(c, False) for c in PAL}
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
def bayer50(h, w, oy=0, ox=0): yy, xx = np.mgrid[oy:oy + h, ox:ox + w]; return BAYER[yy % 4, xx % 4] < 8

def step_px(arr, mask, table):
    """arr RGBA uint8 (modified in place): opaque palette pixels under mask -> table[colour]."""
    a = arr; sel = mask & (a[..., 3] == 255)
    if not sel.any(): return
    ys, xs = np.nonzero(sel)
    for y, x in zip(ys, xs):
        c = tuple(int(v) for v in a[y, x, :3])
        if c in table: a[y, x, :3] = table[c]

# ---------- layered 1x render (each layer kept separate so the grade can treat tiles / sprites / shadow like the engine)
EMIS = TOD.emissive_masks(OW)
def layers(mapname, tilefn=None):
    m = json.load(open(f'{OW}/maps/{mapname}.json')); L = m['layers']; B = P.ts()['byid']
    W, H = m['width'] * T, m['height'] * T
    out = {k: np.zeros((H, W, 4), np.uint8) for k in ('ground', 'decoration', 'ysort', 'overlay')}
    emis = {k: np.zeros((H, W), bool) for k in out}
    def put(k, tid, x, y):
        t = B[tid]; im = np.array(tilefn(tid) if tilefn else P.tile_img(tid)); al = im[..., 3] > 0
        dst = out[k][y * T:(y + 1) * T, x * T:(x + 1) * T]; dst[al] = im[al]
        mk = EMIS.get(t['sheet'])
        if mk is not None:
            i = t['index']; e = np.array(mk.crop(((i % 16) * T, (i // 16) * T, (i % 16 + 1) * T, (i // 16 + 1) * T))) > 0
            emis[k][y * T:(y + 1) * T, x * T:(x + 1) * T][al] = e[al]
    for k in ('ground', 'decoration'):
        for y, r in enumerate(L[k]):
            for x, v in enumerate(r):
                if v: put(k, v, x, y)
    for y, r in enumerate(L['overlay']):
        for x, v in enumerate(r):
            if v: put('ysort' if B[v].get('ysort') else 'overlay', v, x, y)
    return m, out, emis

BUILD = P.ts()['multi_tile_objects']; BUILD_ROWS = {'office': 2.6, 'masters_hall': 2.6}
def buildings(m):
    B = P.ts()['byid']; res = []
    for y, r in enumerate(m['layers']['decoration']):
        for x, v in enumerate(r):
            if not v: continue
            n = B[v]['name']
            for k in ('house_player', 'house_a', 'house_b', 'house_c', 'heal_centre', 'shop', 'office', 'masters_hall', 'lab'):
                if n == f'{k}_0_0' and k in BUILD: res.append((k, x, y, BUILD[k]['w'], BUILD[k]['h']))
    return res

def sprite(path, row=0, col=0):
    im = Image.open(path).convert('RGBA'); return np.array(im.crop((col * 64, row * 96, col * 64 + 64, row * 96 + 96)))
FOOT = [(20, -4), (28, -3), (28, -2), (20, -1)]   # renderer.js hop shadow rows (width, dy from the ground line) - reused as the always-on foot shadow

def after_outdoor(m, lay, sprites):
    """returns (cast-shadow layer RGBA, modified decoration) - cues 1-5 on the 1x map."""
    H, W = lay['ground'].shape[:2]; deco = lay['decoration'].copy(); sh = np.zeros((H, W), bool)
    for k, bx, by, w, h in buildings(m):
        x0, y0, x1, y1 = bx * T, by * T, (bx + w) * T, (by + h) * T
        sub = deco[y0:y1, x0:x1]; M = sub[..., 3] == 255
        wr = BUILD_ROWS.get(k, 2.25); wall_y = int(round((h - wr) * T)) + 16   # under the eave trim line (buildings.py: ov + trim)
        # 1 cast shadow: the opaque silhouette moved 10 px right / 6 px down, minus itself (L-shaped strip lower-right)
        S = np.zeros((h * T + 8, w * T + 12), bool); S[6:6 + h * T, 10:10 + w * T] = M; S[:h * T, :w * T] &= ~M
        ys, xs = np.nonzero(S); ok = (y0 + ys < H) & (x0 + xs < W); sh[y0 + ys[ok], x0 + xs[ok]] = True
        rows = np.arange(h * T)[:, None]; cols = np.arange(w * T)[None, :]
        wall = M & (rows >= wall_y); roof = M & (rows < wall_y)
        # 2 overhang: eave shadow on the wall top
        eave = wall & (rows < wall_y + 5); eave2 = wall & (rows >= wall_y + 5) & (rows < wall_y + 9) & bayer50(h * T, w * T)
        # 3 wall base: per column, bottom-most opaque pixel
        bot = np.where(M.any(0), h * T - 1 - np.argmax(M[::-1], 0), -1)[None, :]
        base = M & (rows > bot - 4) & (rows <= bot); base2 = M & (rows > bot - 8) & (rows <= bot - 4) & bayer50(h * T, w * T)
        # 4 light side: per row, right-most / left-most opaque pixel
        rgt = np.where(M.any(1), w * T - 1 - np.argmax(M[:, ::-1], 1), -1)[:, None]; lft = np.where(M.any(1), np.argmax(M, 1), 10 ** 6)[:, None]
        east = M & (cols > rgt - 8); west = M & (cols < lft + 3)
        dn1 = eave | eave2 | base | base2 | east; step_px(sub, dn1, STEP_DN)
        step_px(sub, (base & east), STEP_DN)                    # the shaded lower-right corner gets a second step
        step_px(sub, west & ~dn1, STEP_UP)
    # 5 cliffs: face darkens toward its base, lip highlight, ground shadow below
    B = P.ts()['byid']
    for y, r in enumerate(m['layers']['decoration']):
        for x, v in enumerate(r):
            n = B[v]['name'] if v else ''
            if not n.startswith(('cliff_', 'cliffd_')): continue
            sub = deco[y * T:(y + 1) * T, x * T:(x + 1) * T]; M = sub[..., 3] == 255; rows = np.arange(T)[:, None]
            if '_u' in n:                                       # upper face row: lip = first opaque 3 rows below the grass edge -> lighter
                top = np.argmax(M, 0)[None, :]; step_px(sub, M & (rows >= top + 14) & (rows < top + 16), STEP_DN)  # under-lip shade line
            else:                                               # lower face row: bottom 12 px one step down, 6 px Bayer band above
                step_px(sub, M & (rows >= 52), STEP_DN); step_px(sub, M & (rows >= 46) & (rows < 52) & bayer50(T, T), STEP_DN)
                if y + 1 < len(m['layers']['decoration']): sh[(y + 1) * T:(y + 1) * T + 6, x * T:(x + 1) * T] = True
    # actor foot shadows (always on; engine-side, shape = renderer.js hop shadow)
    for tx, ty, _ in sprites:
        g = (ty + 1) * T
        for sw, dy in FOOT: sh[g + dy, tx * T + (T - sw) // 2: tx * T + (T + sw) // 2] = True
    cast = np.zeros((H, W, 4), np.uint8); cast[sh] = SHADOW
    return cast, deco

def compose(lay, deco, cast, sprites, grade='day', emis=None, rect=None):
    """engine order: ground, (cast shadow), decoration, actors + ysort by row, overlay. Tiles graded with emissive mask, sprites with the sprite table."""
    x0, y0, x1, y1 = rect; sl = (slice(y0, y1), slice(x0, x1))
    def g(arr, em=None, kind='map'):
        im = Image.fromarray(arr[sl], 'RGBA')
        if grade == 'day': return im
        tab = dict(GR[grade], _name=grade)
        if kind == 'sprite': tab = dict(GR[grade]['sprite'], _name=grade)
        out = np.array(TOD.apply(im, tab, None if em is None else Image.fromarray((em[sl] * 255).astype(np.uint8))))
        s = arr[sl][..., 3] == 96                       # SHADOW pixels -> the grade's shadow dst (palette.js does the same)
        out[s] = GR[grade]['shadow']['dst']; return Image.fromarray(out, 'RGBA')
    canvas = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 255))
    canvas.alpha_composite(g(lay['ground'], emis['ground']))
    if cast is not None: canvas.alpha_composite(g(cast))
    canvas.alpha_composite(g(deco, emis['decoration']))
    # actors + ysort rows (character first on a tie)
    H, W = lay['ground'].shape[:2]
    ys_l = np.zeros_like(lay['ysort']); sp_layer = []
    rowsprites = {}
    for tx, ty, im in sprites: rowsprites.setdefault(ty, []).append((tx, im))
    for y in range(H // T):
        for tx, im in rowsprites.get(y, []):
            a = np.zeros((H, W, 4), np.uint8); gy = (y + 1) * T - 96; X = tx * T
            al = im[..., 3] > 0; a[gy:gy + 96, X:X + 64][al] = im[al]; canvas.alpha_composite(g(a, kind='sprite'))
        r = np.zeros((H, W, 4), np.uint8); r[y * T:(y + 1) * T] = lay['ysort'][y * T:(y + 1) * T]
        if r[..., 3].any(): canvas.alpha_composite(g(r, emis['ysort']))
    canvas.alpha_composite(g(lay['overlay'], emis['overlay']))
    return canvas.convert('RGB')

# ---------- engine-side option: perspective squash toward the top of the screen (native px remap, nearest)
def tilt(im, k=0.06):
    a = np.array(im); H, W = a.shape[:2]; out = np.zeros_like(a)
    # vertical: rows near the top are sampled a little further apart (squash), bottom rows 1:1
    t = np.linspace(0, 1, H); src_y = H - 1 - np.cumsum((1 + k * (1 - t[::-1]) * 2)[::-1])[::-1] * 0  # placeholder replaced below
    s = 1 + 2 * k * (1 - t)                     # source rows advanced per output row: 1+2k at the top, 1 at the bottom
    acc = np.cumsum(s[::-1])[::-1]; src_y = np.clip(np.round(H - acc), 0, H - 1).astype(int)
    for y in range(H):
        sx = 1 + k * (1 - t[y])                 # horizontal: top rows show k% more width, centred
        xs = np.clip(np.round((np.arange(W) - W / 2) * sx + W / 2), 0, W - 1).astype(int)
        out[y] = a[src_y[y], xs]
    return Image.fromarray(out)

# ---------- helpers
FONT = ImageFont.load_default()
def tag(im, text, scale=2, colour=(244, 226, 255)):
    im = im.convert('RGB'); bar = Image.new('RGB', (len(text) * 6 + 10, 14), (26, 18, 38)); ImageDraw.Draw(bar).text((5, 1), text, fill=colour, font=FONT)
    bar = bar.resize((bar.width * scale, bar.height * scale), Image.NEAREST)
    out = Image.new('RGB', (max(im.width, bar.width), im.height + bar.height), (26, 18, 38)); out.paste(bar, (0, 0)); out.paste(im, (0, bar.height)); return out
def z(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)
def grid(rows, pad=12, bg=(26, 18, 38)):
    W = max(sum(i.width for i in r) + pad * (len(r) + 1) for r in rows); H = sum(max(i.height for i in r) for r in rows) + pad * (len(rows) + 1)
    out = Image.new('RGB', (W, H), bg); y = pad
    for r in rows:
        x = pad
        for i in r: out.paste(i, (x, y)); x += i.width + pad
        y += max(i.height for i in r) + pad
    return out
def offpal(im):
    a = np.asarray(im.convert('RGB')).reshape(-1, 3).astype(np.int64); key = (a[:, 0] << 16) | (a[:, 1] << 8) | a[:, 2]
    return int((~np.isin(key, list(PALKEY))).sum()), a.shape[0]

if __name__ == '__main__':
    OUTD = HERE; rep = {}
    PIX = os.path.join(KIL, 'art', 'characters', 'pixel')
    cal = sprite(f'{PIX}/humans/cal/overworld/cal_chibi_sheet.png', 0, 0)
    kid = sprite(f'{PIX}/npcs/vil_kid_m/overworld/vil_kid_m_chibi_sheet.png', 0, 0)
    gar = sprite(f'{PIX}/npcs/vil_gardener_f/overworld/vil_gardener_f_chibi_sheet.png', 1, 0)
    SPR = [(5, 8, cal), (9, 9, kid), (14, 8, gar)]          # all on walkable cells (collision '.'); Cal at the dev start tile 5,8
    m, lay, emis = layers('brookhollow')
    cast, deco = after_outdoor(m, lay, SPR)
    # PC 1920x1080 at zoom 2 = 960x540 native; mobile landscape 844x390 CSS at dpr 2 = 1688x780 device, zoom 2 = 844x390 native
    PC = (40, 120, 40 + 960, 120 + 540); MOB = (100, 260, 100 + 844, 260 + 390)
    bef = compose(lay, lay['decoration'], None, SPR, 'day', emis, PC); aft = compose(lay, deco, cast, SPR, 'day', emis, PC)
    befm = compose(lay, lay['decoration'], None, SPR, 'day', emis, MOB); aftm = compose(lay, deco, cast, SPR, 'day', emis, MOB)
    for n, im in (('before_pc_1920x1080', bef), ('after_pc_1920x1080', aft), ('before_mobile_844x390', befm), ('after_mobile_844x390', aftm)):
        z(im, 2).save(f'{OUTD}/{n}.png')
    # per-cue ladder (zoomed crop of the player house + Cal) so each cue is visible on its own
    CR = (3 * T - 16, 3 * T - 8, 9 * T, 9 * T + 8)
    def partial(n):
        H, W = lay['ground'].shape[:2]; d = lay['decoration'].copy(); c = np.zeros((H, W, 4), np.uint8)
        c2, d2 = after_outdoor(m, lay, SPR)
        if n >= 1: c = c2
        if n >= 5: d = d2
        else:  # recompute with only the first n building cues by masking the diff
            d = lay['decoration'].copy()
            if n >= 2: d = d2  # cues 2-4 are one pass; ladder shows 0, 1, 1-4, 1-5 (+engine)
        return compose(lay, d, c, SPR, 'day', emis, CR)
    lad = [tag(z(partial(0), 2), 'BEFORE'), tag(z(partial(1), 2), '+1 SHADOWS'), tag(z(partial(4), 2), '+2 EAVE +3 BASE +4 LIGHT SIDE')]
    # cliffs (thornwood, the only map with cliff faces)
    mt, lt, et = layers('thornwood'); ct, dt = after_outdoor(mt, lt, [])
    TW = (8 * T, 2 * T, 22 * T, 8 * T)
    cb = compose(lt, lt['decoration'], None, [], 'day', et, TW); ca = compose(lt, dt, ct, [], 'day', et, TW)
    til = tilt(aft)
    top = [tag(z(bef, 1), 'BEFORE  PC 1920x1080 (zoom 2, shown at 1x native here)'), tag(z(aft, 1), 'AFTER  cues 1-5 (art + engine foot shadow)')]
    mid = [tag(befm, 'BEFORE  mobile landscape 844x390 CSS (native)'), tag(aftm, 'AFTER  mobile landscape 844x390'), ]
    cl = [tag(cb, 'BEFORE  cliff (Thornwood)'), tag(ca, 'AFTER  +5 cliff face/base shadow')]
    eng = [tag(aft, 'AFTER (flat camera)'), tag(til, 'OPTIONAL ENGINE: squash toward top (k=0.06, nearest)')]
    sheet = grid([top, mid, lad, cl, eng])
    sheet.save(f'{OUTD}/compare.png', optimize=True)
    # interior (home_lanternport_c, door scheme h3_slate): contact shadows under furniture + wall-base band on the floor
    import interiors_merge as IM
    DOC = json.load(open(os.path.join(IM.STAGE, 'home_recolours.json')))
    MASK = {n: (np.array(Image.open(os.path.join(IM.STAGE, e['mask']))) == 255 if e['mask'] else None) for n, e in DOC['recolourable'].items()}
    scheme = [d for d in DOC['doors'] if d['interior'] == 'home_lanternport_c'][0]['recolour']; mp = DOC['schemes'][scheme]['map']
    def rtile(tid):
        nm = P.ts()['byid'][tid]['name']; im = np.array(P.tile_img(tid))
        if mp and nm in DOC['recolourable']:
            key = (im[..., 0].astype(np.int32) << 16) | (im[..., 1].astype(np.int32) << 8) | im[..., 2]
            reg = (im[..., 3] == 255) & (MASK[nm] if MASK[nm] is not None else True)
            for s, d in mp.items(): im[reg & (key == int(s[1:], 16)), :3] = [int(d[i:i + 2], 16) for i in (1, 3, 5)]
        return Image.fromarray(im, 'RGBA')
    mi, li, ei = layers('home_lanternport_c', rtile)
    Bt = P.ts()['byid']; Hh, Ww = li['ground'].shape[:2]
    gnames = [[Bt[v]['category'] if v else '' for v in r] for r in mi['layers']['ground']]
    floor_px = np.zeros((Hh, Ww), bool)
    for y, r in enumerate(gnames):
        for x, c in enumerate(r):
            if c in ('floor', 'rug', 'interior') and y > 0 and gnames[y - 1][x] == 'wall': floor_px[y * T:y * T + 6, x * T:(x + 1) * T] = True   # 6 px under the wall face
    dfi = li['decoration']; furn = (dfi[..., 3] == 255)
    sh = np.zeros((Hh, Ww), bool)
    # contact shadow: furniture silhouette moved 4 px right / 3 px down, onto floor only (not onto other furniture)
    sh[3:, 4:] = furn[:-3, :-4]; sh &= ~furn
    sh |= floor_px & ~furn
    cast_i = np.zeros((Hh, Ww, 4), np.uint8); cast_i[sh] = SHADOW
    RI = (0, 0, Ww, Hh)
    ib = compose(li, li['decoration'], None, [], 'day', ei, RI); ia = compose(li, li['decoration'], cast_i, [], 'day', ei, RI)
    tag(grid([[tag(z(ib, 1), f'BEFORE home_lanternport_c ({scheme})'), tag(z(ia, 1), 'AFTER furniture contact shadow + wall-base shadow on floor')]]), 'Interior (optional): SHADOW colour only, no new hex codes').save(f'{OUTD}/compare_interior.png', optimize=True)
    # phases: dawn/day/dusk/night through the existing grade (recolour first for the interior)
    prow, irow = [], []
    for g_ in TOD.GRADES:
        prow.append(tag(compose(lay, deco, cast, SPR, g_, emis, PC), f'AFTER {g_}'))
        irow.append(tag(compose(li, li['decoration'], cast_i, [], g_, ei, RI), f'interior {g_} (check only; indoors stay on day)'))
    bprow = [tag(compose(lay, lay['decoration'], None, SPR, g_, emis, PC), f'BEFORE {g_}') for g_ in TOD.GRADES]
    grid([bprow[:2], bprow[2:], prow[:2], prow[2:], irow]).save(f'{OUTD}/phases.png', optimize=True)
    # palette report: tile-art layers must be 100% palette; composited frames may hold SHADOW blends (same as the kit today)
    def artcheck(arr):
        a = arr[arr[..., 3] == 255][:, :3].astype(np.int64); key = (a[:, 0] << 16) | (a[:, 1] << 8) | a[:, 2]
        return int((~np.isin(key, list(PALKEY))).sum()), int(a.shape[0])
    rep['tile_art_offpalette_after'] = dict(brookhollow=artcheck(deco), thornwood=artcheck(dt))
    rep['tile_art_offpalette_before'] = dict(brookhollow=artcheck(lay['decoration']), thornwood=artcheck(lt['decoration']))
    rep['translucent_alpha_values_in_cast_layers'] = sorted(set(np.unique(cast[..., 3]).tolist()) | set(np.unique(ct[..., 3]).tolist()) | set(np.unique(cast_i[..., 3]).tolist()))
    rep['frame_offpalette_pixels'] = dict(before_pc=offpal(bef), after_pc=offpal(aft), after_tilt=offpal(til))
    rep['new_colours_in_after_vs_before_tileart'] = sorted({'%02x%02x%02x' % tuple(c) for c in np.unique(deco[deco[..., 3] == 255][:, :3], axis=0).tolist()} - {'%02x%02x%02x' % tuple(c) for c in np.unique(lay['decoration'][lay['decoration'][..., 3] == 255][:, :3], axis=0).tolist()})
    rep['step_dn'] = {'%02x%02x%02x' % k: '%02x%02x%02x' % v for k, v in STEP_DN.items()}
    rep['step_up'] = {'%02x%02x%02x' % k: '%02x%02x%02x' % v for k, v in STEP_UP.items()}
    rep['into_glow'] = [k for k, v in list(rep['step_dn'].items()) + list(rep['step_up'].items()) if tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) in GLOW and tuple(int(k[i:i + 2], 16) for i in (0, 2, 4)) not in GLOW]
    json.dump(rep, open(f'{OUTD}/report.json', 'w'), indent=1)
    print(json.dumps({k: v for k, v in rep.items() if k not in ('step_dn', 'step_up')}, indent=1))
