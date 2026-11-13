"""Worker C overnight pipeline (Oct 23 2026): one call builds a full creature set in the
exact format of the 16 approved-draft creatures (wild pipeline: wild_pxlib + pilot pxlib).
raw/ (generated reference art, white bg) -> snap -> 64-colour palette -> INK outline ->
battle 128 (+2x) -> 4-frame idles (180/160/200/160) -> 64x64 OW walk (down/left/right/up x
stand+4 walk, 1x/2x/3x, sheets, GIFs) -> README, base/meta.json -> QA (palette, alpha 0/255,
4-phase ToD sprite grade) -> 3x preview -> manifest parts.overnight_c (locked read-merge-write).
usage: python3 c_build.py name[:plan[:mirror[:h]]] ...  (h = hue-preserving remap)   plan: biped|quad|hover  mirror: r (right=mirror of left), l
"""
import sys, os, json, glob, shutil, fcntl, time
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/tools')
from wild_pxlib import *          # pilot pxlib + palette helpers (unchanged)
from PIL import Image, ImageOps, ImageDraw
from scipy import ndimage
CRE = '/workspace/kilumen/art/characters/pixel/creatures'; ROOT = '/workspace/kilumen/art/characters/pixel'
ON = CRE + '/_overnight'; DEX = json.load(open('/workspace/kilumen/design/DEX_450.json'))['creatures']
DX = {c['id']: c for c in DEX}
INK = np.array([0x19, 0x12, 0x10])
PALHEX = {l.strip().lower() for l in open('/workspace/kilumen/art/world/overworld/palette.hex') if l.strip()}
G = json.load(open('/workspace/kilumen/art/world/overworld/time_of_day/grades.json'))['grades']; PH = ['dawn', 'day', 'dusk', 'night']
BSIZE = {'small': 100, 'medium': 110, 'large': 118, 'huge': 120}
OWSIZE = {'small': (44, 54), 'medium': (50, 56), 'large': (54, 58), 'huge': (56, 60)}
PLAN = {'biped': (0.16, dict(lift=1, stride=2, bodybob=1, sidefrac=0.12)),
        'quad': (0.24, dict(lift=2, stride=2, bodybob=1, sidefrac=0.22, quad=True)),
        'hover': (0.38, dict(hover=True))}
MS = [180, 160, 200, 160]

def ink(a):
    """outer silhouette edge -> INK (palette 191210); also seal 1px gaps: alpha stays 0/255"""
    a = a.copy(); m = a[..., 3] > 0
    edge = m & ~ndimage.binary_erosion(m, border_value=0)
    a[edge, :3] = INK; return a

HUE = False  # set per creature by the ':h' flag (hue-preserving CIELAB remap for muted tints)
VRAMP = np.array([[0x3a, 0x1e, 0x60], [0x60, 0x30, 0x96], [0x8a, 0x4a, 0xce], [0xb0, 0x76, 0xec], [0xd6, 0xac, 0xff]])
def vio_mask(col):
    """violet-crystal pixels in the (pre-quantize) downscaled source: hue 245-300, sat>.22, val>.28"""
    c = col.astype(float) / 255; mx = c.max(2); mn = c.min(2); d = mx - mn + 1e-6
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    sat = d / np.maximum(mx, 1e-6); hue = (h > 240) & (h < 305)
    core = hue & (h > 255) & (h < 295) & (sat > 0.42) & (mx > 0.35)   # saturated crystal body
    # pale facets/highlights only where they touch the saturated core (keeps lavender fur/feathers out)
    return core | (ndimage.binary_dilation(core, iterations=2) & hue & (sat > 0.18))

def snap_c(img, box, target_h, target_w, ncol, thr=228):
    """pilot snap() + violet-crystal protection: small pale crystals no longer collapse to grey
    in median-cut; crystal pixels are forced onto the palette violet ramp (3a1e60..d6acff)."""
    c, fg, org = cutout(img, box, thr); h, w = fg.shape
    s = min(target_h / h, target_w / w); nw, nh = max(1, round(w * s)), max(1, round(h * s))
    rgb = Image.fromarray((c * fg[..., None]).astype('uint8')); al = Image.fromarray((fg * 255).astype('uint8'))
    rs = np.array(rgb.resize((nw, nh), Image.BOX)).astype(float); ra = np.array(al.resize((nw, nh), Image.BOX)).astype(float) / 255
    mask = ra > 0.45
    col = np.where(ra[..., None] > 0, rs / np.maximum(ra[..., None], 1e-3), 0).clip(0, 255)
    vm = vio_mask(col) & mask
    lab, nl = ndimage.label(vm)   # crystals are accents: drop violet blobs >40% of the body (violet fur/feathers)
    for i in range(1, nl + 1):
        if (lab == i).sum() > 0.4 * mask.sum(): vm[lab == i] = False
    col, mask = add_outline(col, mask)
    out = clean(quantize(col, mask, ncol), mask)
    a = np.dstack([out, mask * 255]).astype('uint8'); a = remap_hue(a, HUE) if HUE else remap(a)
    vm &= a[..., 3] > 0
    if vm.any():
        lum = col[vm].max(1)  # value of the pre-outline colour
        idx = np.clip(((lum - 70) / 185 * 4).round().astype(int) + 0, 0, 4)
        a[vm, :3] = VRAMP[idx]
    return a, s, org

def snapbase(img, box, th, tw, ncol):
    a, s, org = snap_c(img, box, th, tw, ncol)
    a = ink(a)
    return Image.fromarray(a), s, org

def ow_boxes(img, n=4):
    c = np.array(img.convert('RGB')).astype(int); m = c.min(2) <= 228
    for it in (6, 3, 1):   # shrink the gap bridge if views sit close together
        col = ndimage.binary_dilation(m.any(0), iterations=it)
        lab, k = ndimage.label(col); runs = ndimage.find_objects(lab)
        runs = sorted([(r[0].start, r[0].stop) for r in runs if r[0].stop - r[0].start > 40], key=lambda r: r[1] - r[0], reverse=True)[:n]
        if len(runs) == n: break
    cnt = m.sum(0)
    while len(runs) < n:   # still merged: split the widest run at its emptiest middle column
        runs.sort(key=lambda r: r[1] - r[0]); a, b = runs.pop(); q = (b - a) // 4
        cut = a + q + int(np.argmin(cnt[a + q:b - q])); runs += [(a, cut), (cut, b)]
    runs = sorted(runs); W, H = img.size
    assert len(runs) == n, f'found {len(runs)} views'
    return [(max(0, a - 2), 0, min(W, b + 2), H) for a, b in runs]

def qa_arr(a):
    al = set(np.unique(a[..., 3]).tolist()); assert al <= {0, 255}, al
    hx = {'%02x%02x%02x' % tuple(p) for p in a[a[..., 3] > 0][:, :3]}
    off = hx - PALHEX; assert not off, off
    return hx

def grade(a, ph):
    o = a.copy(); mp = G[ph]['sprite']['map']
    for y, x in zip(*np.where(a[..., 3] > 0)):
        k = '%02x%02x%02x' % tuple(a[y, x, :3]); d = mp[k]  # KeyError = unmapped colour = FAIL
        o[y, x, :3] = [int(d[i:i + 2], 16) for i in (0, 2, 4)]
    return o

def tod_strip(n, frames):
    ter = np.array(Image.open('/workspace/kilumen/art/world/overworld/tiles_1x/terrain.png').convert('RGBA'))[:64, :64]
    gm = G['day']['map']; cells = []
    for ph in PH:
        bg = ter.copy(); mp = G[ph]['map']
        for y, x in zip(*np.where(bg[..., 3] > 0)):
            k = '%02x%02x%02x' % tuple(bg[y, x, :3])
            if k in mp: d = mp[k]; bg[y, x, :3] = [int(d[i:i + 2], 16) for i in (0, 2, 4)]
        for f in frames:
            im = Image.fromarray(bg.copy()); im.alpha_composite(Image.fromarray(grade(f, ph))); cells.append(up(im, 2))
    S = Image.new('RGBA', (128 * len(frames) * 4 + 30, 148), (30, 30, 30, 255)); d = ImageDraw.Draw(S)
    for i, c in enumerate(cells):
        x = i * 128 + (i // len(frames)) * 10; S.paste(c, (x, 18))
        if i % len(frames) == 0: d.text((x + 2, 3), PH[i // len(frames)], fill='white')
    os.makedirs(ON + '/tod', exist_ok=True); S.save(f'{ON}/tod/{n}_tod_spritegrade.png')

def manifest_merge(n, entry):
    p = ROOT + '/manifest.json'
    with open(ROOT + '/.manifest.lock', 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        m = json.load(open(p))
        part = m['parts'].setdefault('overnight_c', {'worker': 'C (sprite worker, overnight Oct 23 2026)',
            'status': 'draft, awaiting Gary', 'wired': False,
            'spec': {'battle': '128px native (+2x)', 'overworld': '64x64 cell native (+2x, +3x)', 'palette': '/workspace/kilumen/art/world/overworld/palette.hex', 'idle_ms': MS},
            'tool': 'creatures/_overnight/tools/c_build.py', 'creatures': {}})
        part['creatures'][n] = entry
        tmp = p + '.tmp_c'; json.dump(m, open(tmp, 'w'), indent=1); os.replace(tmp, p)
        fcntl.flock(lk, fcntl.LOCK_UN)

def build(n, plan='quad', mirror=None):
    t0 = time.time(); C = f'{CRE}/{n}'; dx = DX[n]; sz = dx.get('size_class', 'medium')
    assert os.path.exists(f'{C}/CLAIMED_BY_C') and not os.path.exists(f'{C}/CLAIMED_BY_A')
    B = f'{C}/base'; os.makedirs(B, exist_ok=True); meta = {}
    bh = BSIZE.get(sz, 110); th, tw = OWSIZE.get(sz, (50, 56))
    def go(key, img, box, th_, tw_, ncol, src):
        spr, s, org = snapbase(img, box, th_, tw_, ncol); spr.save(f'{B}/{n}_{key}.png')
        meta[f'{n}_{key}'] = dict(scale=float(s), org=[int(v) for v in org], size=list(spr.size), src=src, colours=ncolors(spr)); return spr
    fr = go('front', Image.open(f'{C}/raw/battle_front.jpg'), None, bh, 124, 28, 'raw/battle_front.jpg')
    bk = go('back', Image.open(f'{C}/raw/battle_back.jpg'), None, bh, 124, 28, 'raw/battle_back.jpg')
    ow = Image.open(f'{C}/raw/ow_views.jpg'); views = {}
    for b, d in zip(ow_boxes(ow), ['down', 'left', 'right', 'up']):
        views[d] = go('ow_' + d, ow, b, th, tw, 22, 'raw/ow_views.jpg')
    if mirror == 'r': views['right'] = ImageOps.mirror(views['left']); views['right'].save(f'{B}/{n}_ow_right.png'); meta[f'{n}_ow_right'] = {'mirror_of': f'{n}_ow_left'}
    if mirror == 'l': views['left'] = ImageOps.mirror(views['right']); views['left'].save(f'{B}/{n}_ow_left.png'); meta[f'{n}_ow_left'] = {'mirror_of': f'{n}_ow_right'}
    json.dump(meta, open(f'{B}/meta.json', 'w'), indent=1)
    # battle + idle (wild step3 recipe; violet crystals glow only)
    os.makedirs(f'{C}/battle', exist_ok=True); os.makedirs(f'{C}/anim', exist_ok=True)
    for view, spr in (('front', fr), ('back', bk)):
        c, _ = place(spr, 128, 128, bottom=True, pad_b=2)
        c.save(f'{C}/battle/{n}_{view}_128.png'); up(c, 2).save(f'{C}/battle/{n}_{view}_128_2x.png')
        h = spr.height; base = canvas(spr, 128, 128, (128 - spr.width) // 2, 128 - h - 2); top = 128 - h - 2
        split = 128 if plan == 'hover' else top + int(h * 0.72)
        idle = [glow(bob(base, split, dy), g, lava_on=False) for dy, g in ((0, 0), (-1, 1), (-2, 2), (-1, 1))]
        save_anim(idle, f'{C}/anim', f'{n}_{view}_idle', MS)
    lf, kw = PLAN[plan]
    rows = export_set(f'{C}/overworld', f'{n}_ow', views, 64, 64, lf, [2, 3], 130, **kw)
    open(f'{C}/README.md', 'w').write(f"""# {dx['name']} - pixel sprites (DRAFT, awaiting Gary; not wired)
Kilindex #{dx['dex_no']} ({'/'.join(dx['types'])}, {sz}). Brief: {dx['visual_brief']}
Built by creatures/_overnight/tools/c_build.py (worker C, Oct 23 2026 overnight) from raw/ (generated reference art from the DEX_450 brief), same pipeline as the wild set: snap -> 64-colour palette -> INK outline/clean.
- battle/: {n}_front_128, {n}_back_128 (+_2x). Back = player side, seen from behind.
- anim/: {n}_front_idle, {n}_back_idle: 4 frames (frames dir native+2x, sheet, sheet_2x, 2x GIF), 180/160/200/160 ms. Only the violet crystal glows.
- overworld/: 64x64 chibi, rows down/left/right/up x (stand, walk0-3); frames native/2x/3x, sheets, per-direction GIFs 2x/3x, walk_all GIFs. Walk recipe: {plan}{', right = mirror of left' if mirror=='r' else ''}{', left = mirror of right' if mirror=='l' else ''}.
- base/: one cleaned base per view (all frames derive from it) + meta.json.
QA: palette-only, alpha 0/255, 4-phase ToD sprite grade (strip: creatures/_overnight/tod/{n}_tod_spritegrade.png). No warmth masks yet.
""")
    # QA over every png
    files = []
    for f in sorted(glob.glob(f'{C}/**/*', recursive=True)):
        if os.path.isdir(f) or '/raw/' in f or f.endswith('CLAIMED_BY_C'): continue
        e = {'path': os.path.relpath(f, ROOT), 'bytes': os.path.getsize(f)}
        if f.endswith('.png'):
            im = Image.open(f); e['size'] = list(im.size); qa_arr(np.array(im.convert('RGBA')))
        elif f.endswith('.gif'):
            im = Image.open(f); e['size'] = list(im.size); e['frames'] = im.n_frames
        files.append(e)
    tod_strip(n, [rows[0][0], rows[2][0], np.array(Image.open(f'{C}/anim/{n}_front_idle/{n}_front_idle_f0.png'))[64:, 32:96]])
    # 3x review preview
    os.makedirs(ON + '/preview', exist_ok=True)
    sh = Image.open(f'{C}/overworld/{n}_ow_sheet.png')
    P = Image.new('RGBA', (128 * 3 * 2 + 320 * 3 + 40, max(384, 256 * 3)), (96, 120, 96, 255))
    P.paste(up(Image.open(f'{C}/battle/{n}_front_128.png'), 3), (0, 0), up(Image.open(f'{C}/battle/{n}_front_128.png'), 3))
    P.paste(up(Image.open(f'{C}/battle/{n}_back_128.png'), 3), (384, 0), up(Image.open(f'{C}/battle/{n}_back_128.png'), 3))
    P.paste(up(sh, 3), (808, 0), up(sh, 3)); P.save(f'{ON}/preview/{n}_3x.png')
    cnt = dict(files=len(files), battle_static=4, idle_frames_per_view=4, idle_frame_files=16,
               ow_frame_files=60, ow_frames_per_direction='1 stand + 4 walk', gifs=sum(1 for e in files if e['path'].endswith('.gif')))
    manifest_merge(n, dict(dex_no=dx['dex_no'], status='draft, awaiting Gary', wired=False, battle_size=128, overworld_size=64,
        plan=plan, raw=sorted(os.listdir(f'{C}/raw')), qa=dict(palette_only=True, alpha='0/255', tod_4phase='pass', tod_strip=f'creatures/_overnight/tod/{n}_tod_spritegrade.png'),
        counts=cnt, files=files))
    print(f'{n}: OK {len(files)} files, {time.time()-t0:.1f}s, front {fr.size} back {bk.size} ow', {d: v.size for d, v in views.items()})

def contact(names, out):
    ims = [Image.open(f'{ON}/preview/{n}_3x.png') for n in names]
    W = max(i.width for i in ims); S = Image.new('RGBA', (W, sum(i.height for i in ims)), (0, 0, 0, 255)); y = 0
    for i in ims: S.paste(i, (0, y)); y += i.height
    S.thumbnail((2400, 2400 * len(ims)), Image.NEAREST) if False else None
    S.save(out); print(out, S.size)

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import c_jsonl
    done = []
    for arg in sys.argv[1:]:
        if arg.startswith('--contact='): contact(done, arg.split('=', 1)[1]); continue
        p = arg.split(':'); globals()['HUE'] = float(p[3][1:] or 2.5) if len(p) > 3 and p[3].startswith('h') else False; build(p[0], p[1] if len(p) > 1 and p[1] else 'quad', p[2] if len(p) > 2 else None); done.append(p[0]); c_jsonl.append_once(p[0])
