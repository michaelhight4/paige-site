"""Worker A overnight batch pipeline (DRAFT, not wired). Same method as the existing wild 16:
raw AI concept -> snap (cutout, box-downscale, outline, quantize) -> 64-colour palette remap ->
battle 128 + 4-frame idles -> 64x64 OW walk (4 dirs x stand+4) -> 32px icons -> Cosmic swap draft ->
validation (palette / alpha 0,255) -> 4-phase ToD sprite-grade sheet + night metrics -> README + manifest.
Imports the shipped pipeline modules read-only (does not modify them).
Usage: python3 ovn_build.py name1 name2 ...   (configs in CFG below)"""
import sys, os, json, glob, shutil, time
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/tools')
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/icons/tools')
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/cosmic/tools')
from wild_pxlib import *
import wild_step1_bases as S1
from PIL import Image, ImageOps, ImageDraw
import icon_core
from swaps import EARTH, FIRE, WATER
OV = CRE + '/_overnight'
DEX = {c['id']: c for c in json.load(open('/workspace/kilumen/design/DEX_450.json'))['creatures']}
VIOL = {'3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff'}
PALHEX = {'%02x%02x%02x' % tuple(c) for c in PAL}
MS = [180, 160, 200, 160]
SIZE = {'small': ((78, 104), (40, 50)), 'medium': ((100, 124), (46, 56)), 'large': ((118, 124), (52, 58)), 'huge': ((122, 124), (54, 58))}
QUAD = dict(lift=2, stride=2, bodybob=1, sidefrac=0.24, quad=True)
CFG = json.load(open(OV + '/tools/cfg.json'))

def hexs(a): return np.array(['%02x%02x%02x' % tuple(p) for p in a[..., :3].reshape(-1, 3)]).reshape(a.shape[:2])

def bases(n, c):
    C = f'{CRE}/{n}'; B = f'{C}/base'; os.makedirs(B, exist_ok=True); meta = {}
    size = c.get('size', DEX[n]['size_class']); (bth, btw), (oth, otw) = SIZE[size]
    bth, btw = c.get('battle', (bth, btw)); oth, otw = c.get('ow', (oth, otw))
    ex = tuple(c.get('exclude', ()))
    def go(name, img, box, th, tw, ncol, src):
        img = S1.boost(img, [(1.7, 245, 300, 0)] + c.get('boost', []))  # keep pale violet crystals violet
        spr, s, org = snap(img, box, th, tw, ncol)
        if c.get('holes') and box is None: spr = holes(img, spr, c['holes'])
        spr = Image.fromarray(remap(np.array(spr), ex)); spr.save(f'{B}/{name}.png')
        meta[name] = dict(scale=float(s), org=[int(v) for v in org], size=list(spr.size), src=src, colours=ncolors(spr))
        return spr
    go(f'{n}_front', Image.open(f'{C}/raw/battle_front.jpg'), None, bth, btw, 28, 'raw/battle_front.jpg')
    go(f'{n}_back', Image.open(f'{C}/raw/battle_back.jpg'), None, bth, btw, 28, 'raw/battle_back.jpg')
    f = glob.glob(f'{C}/raw/ow_views.*')[0]; img = Image.open(f); bx = S1.boxes_full_height(img)
    for b, d in zip(bx, ['down', 'left', 'right', 'up']):
        if d == 'right' and c.get('mirror_right'): continue
        if d == 'left' and c.get('mirror_left'): continue
        go(f'{n}_ow_{d}', img, b, oth, otw, 22, 'raw/' + os.path.basename(f))
    if c.get('mirror_right'):
        ImageOps.mirror(Image.open(f'{B}/{n}_ow_left.png')).save(f'{B}/{n}_ow_right.png'); meta[f'{n}_ow_right'] = dict(mirror_of=f'{n}_ow_left')
    if c.get('mirror_left'):
        ImageOps.mirror(Image.open(f'{B}/{n}_ow_right.png')).save(f'{B}/{n}_ow_left.png'); meta[f'{n}_ow_left'] = dict(mirror_of=f'{n}_ow_right')
    json.dump(meta, open(f'{B}/meta.json', 'w'), indent=1)

def holes(img, spr, band, minpx=400):
    """clear enclosed background-white regions (e.g. inside a coil) within a vertical band (fractions of sprite height)"""
    from scipy import ndimage
    from scipy.ndimage import binary_dilation
    c, fg, org = cutout(img, None); h, w = fg.shape
    white = (c.min(2) > 232) & fg
    lab, k = ndimage.label(white); hole = np.zeros_like(fg)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        cy = (sl[0].start + sl[0].stop) / 2 / h
        if band[0] <= cy <= band[1] and (lab[sl] == i + 1).sum() > minpx: hole |= lab == i + 1
    a = np.array(spr); W, H = spr.size
    hm = np.array(Image.fromarray((hole * 255).astype('uint8')).resize((W, H), Image.BOX)) > 110
    a[hm] = 0; edge = binary_dilation(hm) & (a[..., 3] > 0)
    a[edge, :3] = (a[edge, :3] * 0.35 + np.array([20, 12, 18]) * 0.65).astype('uint8')
    return Image.fromarray(a)

def battle_idle(n, c):
    C = f'{CRE}/{n}'; os.makedirs(f'{C}/battle', exist_ok=True); os.makedirs(f'{C}/anim', exist_ok=True)
    lava = 'magma' in DEX[n]['types']
    for view in ('front', 'back'):
        spr = Image.open(f'{C}/base/{n}_{view}.png'); h = spr.height
        cv, _ = place(spr, 128, 128, bottom=True, pad_b=2)
        cv.save(f'{C}/battle/{n}_{view}_128.png'); up(cv, 2).save(f'{C}/battle/{n}_{view}_128_2x.png')
        base = canvas(spr, 128, 128, (128 - spr.width) // 2, 128 - h - 2); top = 128 - h - 2
        split = 128 if c.get('float') else top + int(h * 0.72)
        idle = [glow(bob(base, split, dy), g, lava_on=lava) for dy, g in ((0, 0), (-1, 1), (-2, 2), (-1, 1))]
        save_anim(idle, f'{C}/anim', f'{n}_{view}_idle', MS)

def overworld(n, c):
    C = f'{CRE}/{n}'
    views = {d: Image.open(f'{C}/base/{n}_ow_{d}.png') for d in ['down', 'left', 'right', 'up']}
    kind = c.get('walk', 'quad')
    if kind == 'quad': lf, kw = c.get('legfrac', 0.24), dict(QUAD, sidefrac=c.get('sidefrac', 0.24))
    elif kind == 'biped': lf, kw = 0.16, dict(lift=1, stride=2, bodybob=1, sidefrac=0.12)
    else: lf, kw = 0.38, dict(hover=True)
    export_set(f'{C}/overworld', f'{n}_ow', views, 64, 64, lf, [2, 3], c.get('ow_ms', 130), **kw)

def icons(n, c):
    C = f'{CRE}/{n}'; D = f'{C}/icons'; os.makedirs(D, exist_ok=True)
    a = np.array(Image.open(f'{C}/battle/{n}_front_128.png').convert('RGBA'))
    bb = Image.fromarray(a).getbbox(); a = a[bb[1]:bb[3], bb[0]:bb[2]]
    m = np.isin(hexs(a), list(VIOL)) & (a[..., 3] > 0)
    H, W = a.shape[:2]; s = min(31 / W, 29 / H); w_, h_ = int(round(W * s)), int(round(H * s))
    out, om = icon_core.shrink(a, m, s, 32, 32, (32 - w_) // 2, 31 - h_)
    out = icon_core.despeckle(out, om)
    out = remap(out)  # guarantee palette + binary alpha
    if c.get('float'): f1 = bob(out, 32, 1)
    else: f1 = bob(out, 31 - h_ + int(h_ * 0.6), 1)
    sh = Image.new('RGBA', (64, 32))
    for i, f in enumerate((out, f1)):
        im = Image.fromarray(f); im.save(f'{D}/{n}_icon_f{i}.png'); up(im, 2).save(f'{D}/{n}_icon_f{i}_2x.png'); up(im, 3).save(f'{D}/{n}_icon_f{i}_3x.png')
        sh.paste(im, (32 * i, 0))
    sh.save(f'{D}/{n}_icon_sheet.png'); up(sh, 3).save(f'{D}/{n}_icon_sheet_3x.png')

FAM = {'earth': ('Moondust', EARTH), 'fire': ('Frostfire', FIRE), 'magma': ('Frostfire', FIRE), 'water': ('Sunken Gold', WATER)}
def cosmic(n, c):
    C = f'{CRE}/{n}'; D = f'{C}/cosmic'; os.makedirs(D, exist_ok=True)
    if 'cosmic' in c: concept, mp = c['cosmic_name'], c['cosmic']
    else: concept, mp = FAM.get(DEX[n]['types'][0], (None, None))
    if not mp: return None
    mp = {k: v for k, v in mp.items() if k not in VIOL and v not in VIOL}
    used = set()
    srcs = [f'{C}/battle/{n}_front_128.png', f'{C}/battle/{n}_back_128.png', f'{C}/overworld/{n}_ow/{n}_ow_down_stand.png', f'{C}/icons/{n}_icon_f0.png']
    outs = []
    for p in srcs:
        a = np.array(Image.open(p).convert('RGBA')); h = hexs(a); o = a.copy()
        for k, v in mp.items():
            sel = (h == k) & (a[..., 3] > 0)
            if sel.any(): used.add(k); o[sel, :3] = [int(v[i:i + 2], 16) for i in (0, 2, 4)]
        Image.fromarray(o).save(f'{D}/{os.path.basename(p).replace(n + "_", n + "_cosmic_")}'); outs.append(o)
    json.dump({'creature': n, 'concept': concept, 'status': 'draft, awaiting Gary', 'wired': False,
               'swap': {'#' + k: '#' + mp[k] for k in sorted(used)}, 'rule': 'crystal violets never swapped'}, open(f'{D}/{n}_cosmic_swap.json', 'w'), indent=1)
    return concept

G = json.load(open('/workspace/kilumen/art/world/overworld/time_of_day/grades.json'))['grades']
PH = ['dawn', 'day', 'dusk', 'night']
TER = np.array(Image.open('/workspace/kilumen/art/world/overworld/tiles_1x/terrain.png').convert('RGBA'))[:64, :64]
def grade(a, ph, grass=False):
    mp = G[ph]['map'] if grass else G[ph].get('sprite', G[ph])['map']; h = hexs(a); o = a.copy()
    for (y, x) in zip(*np.where(a[..., 3] > 0)):
        d = mp.get(h[y, x])
        if d: o[y, x, :3] = [int(d[i:i + 2], 16) for i in (0, 2, 4)]
    return o
def L(a): return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
def bgfor(spr, ph):
    h, w = spr.shape[:2]; return grade(np.tile(TER, (h // 64 + 1, w // 64 + 1, 1))[:h, :w], ph, True)
def tod_metrics(spr, ph):
    bg = bgfor(spr, ph).astype(float); s = grade(spr, ph).astype(float); m = spr[..., 3] > 0
    p = np.pad(m, 1); inner = m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    bodyL = L(s)[inner].mean(); grassL = L(bg).mean()
    # silhouette read: share of body pixels whose luma differs from the grass behind by >= 28
    sep = (np.abs(L(s) - L(bg)) >= 28)[m].mean()
    tones = len({tuple(v) for v in s[inner][:, :3].astype(int)})
    return dict(bodyL=round(float(bodyL), 1), grassL=round(float(grassL), 1), d=round(float(bodyL - grassL), 1), sep=round(float(sep), 3), tones=tones, ok=bool(sep >= 0.33 and tones >= 8))
def tod_cell(spr, ph):
    bg = Image.fromarray(grade(TER, ph, True)); bg.alpha_composite(Image.fromarray(grade(spr, ph))); return bg
def tod(n):
    C = f'{CRE}/{n}'; rows = []; res = {}
    for d in ('down', 'left', 'up'):
        a = np.array(Image.open(f'{C}/overworld/{n}_ow/{n}_ow_{d}_stand.png').convert('RGBA'))
        rows.append([tod_cell(a, ph) for ph in PH])
        if d == 'down': res = {ph: tod_metrics(a, ph) for ph in PH}
    S = Image.new('RGBA', (64 * 4, 64 * 3))
    for r, row in enumerate(rows):
        for i, im in enumerate(row): S.paste(im, (64 * i, 64 * r))
    os.makedirs(f'{C}/_check', exist_ok=True); up(S, 3).save(f'{C}/_check/{n}_tod_4phase_3x.png')
    return res

def validate(n):
    bad = []
    for p in glob.glob(f'{CRE}/{n}/**/*.png', recursive=True):
        if '/raw/' in p or '/_check/' in p: continue
        a = np.array(Image.open(p).convert('RGBA'))
        al = set(np.unique(a[..., 3]).tolist())
        if not al <= {0, 255}: bad.append((p, 'alpha', sorted(al)[:5]))
        cols = {'%02x%02x%02x' % tuple(v) for v in a[a[..., 3] > 0][:, :3]}
        off = cols - PALHEX
        if off: bad.append((p, 'offpal', sorted(off)[:5]))
    return bad

def readme(n, c, concept, tres):
    x = DEX[n]; t = ' / '.join(x['types']); line = ' -> '.join(x['evolution']['line'])
    open(f'{CRE}/{n}/README.md', 'w').write(f"""# {x['name']} - pixel sprites (wild, DRAFT awaiting Gary, not wired)
Dex #{x['dex_no']} ({x['first_zone']}), {t}, line: {line}. Built overnight by Worker A from raw/ (generated concept art),
same pipeline as the wild 16: snap -> 64-colour palette -> outline/clean (tools: creatures/_overnight/tools/ovn_build.py).
- battle/: {n}_front_128 / {n}_back_128 (+2x)
- anim/: 4-frame idles front/back ({MS} ms), violet crystal glow 0/1/2/1
- overworld/{n}_ow/: 64x64, down/left/right/up x stand + walk0-3 (+2x/3x), sheets, gifs
- icons/: 32x32 2-frame party icon (+2x/3x), not merged into the shared icons/ sheet
- cosmic/: Cosmic swap draft ({concept or 'none'}), crystals stay violet
- base/: cleaned bases + meta.json; _check/: 4-phase ToD sprite-grade sheet
Night metric (down stand): {tres.get('night')}
Notes: {c.get('notes', '')}
""")

def manifest(n, c, concept, tres):
    x = DEX[n]; P = ROOT + '/manifest.json'
    files = sorted(os.path.relpath(p, ROOT) for p in glob.glob(f'{CRE}/{n}/**/*', recursive=True) if os.path.isfile(p))
    for _ in range(5):
        try:
            m = json.load(open(P)); break
        except Exception: time.sleep(0.5)
    m['parts'].setdefault('overnight_a', {'note': 'Worker A overnight drafts 2026-10-23; draft, awaiting Gary; not wired', 'creatures': {}})
    m['parts']['overnight_a']['creatures'][n] = dict(status='draft, awaiting Gary', wired=False, dex_no=x['dex_no'], name=x['name'], types=x['types'],
        line=x['evolution']['line'], zone=x['first_zone'], battle='128', overworld='64x64', cosmic=concept, tod_night=tres.get('night'), file_count=len(files), files=files)
    tmp = P + '.tmpA'; json.dump(m, open(tmp, 'w'), indent=1); os.replace(tmp, P)

def review(names):
    rows = []
    for n in names:
        C = f'{CRE}/{n}'
        ims = [Image.open(f'{C}/battle/{n}_front_128.png'), Image.open(f'{C}/battle/{n}_back_128.png'), Image.open(f'{C}/overworld/{n}_ow_sheet.png').crop((0, 0, 128, 256)),
               Image.open(f'{C}/icons/{n}_icon_sheet.png')]
        cz = glob.glob(f'{C}/cosmic/{n}_cosmic_front_128.png')
        if cz: ims.append(Image.open(cz[0]))
        W = sum(i.width for i in ims) + 8 * len(ims); H = 256; r = Image.new('RGBA', (W, H), (200, 200, 200, 255)); x = 0
        for i in ims: r.alpha_composite(i.convert('RGBA'), (x, 0)); x += i.width + 8
        rows.append(r)
    S = Image.new('RGBA', (max(r.width for r in rows), 260 * len(rows)), (120, 120, 120, 255))
    for i, r in enumerate(rows): S.paste(r, (0, 260 * i))
    S = up(S, 2); S.save(f'{OV}/review_A.png'); print('review', S.size)

def build(n):
    c = CFG.get(n, {}); t0 = time.time()
    bases(n, c); battle_idle(n, c); overworld(n, c); icons(n, c); concept = cosmic(n, c)
    r = tod(n); tres = {'night': r['night'], 'day': r['day']}
    bad = validate(n); readme(n, c, concept, tres); manifest(n, c, concept, tres)
    nf = len([p for p in glob.glob(f'{CRE}/{n}/**/*', recursive=True) if os.path.isfile(p)])
    print(f'{n}: files={nf} bad={bad[:3]} cosmic={concept} tod={r} t={time.time() - t0:.0f}s')

if __name__ == '__main__':
    args = sys.argv[1:]
    if args[0] == '--review': review(args[1:])
    else:
        for n in args: build(n)
        review(args)
