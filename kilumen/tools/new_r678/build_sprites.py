"""NEW 35 (regions 6-8) sprite build (Coder, Oct 31 2026; Gary pt2665u "all 40 kilu").
Source: design/new_r678 raws (/workspace/kilumen/design/new_r678/_work, same cells/fgmask as its compose.py), re-cut at
battle/overworld size (no upscaling of the 88px concept cuts). Output per id in the game's creature folder format:
battle front/back 128 (+2x), 4-frame idles (frames, sheets, 2x GIF), 64x64 overworld (4 dirs x stand+walk0-3, 1x/2x/3x, sheets),
base/ + README. PLACEHOLDER art notes: back = mirrored front (no back view drawn yet); overworld left/right = front/mirror,
up = front (no rear view); walk = hover bob. Usage: python3 tools/new_r678/build_sprites.py OUT_CREATURES_DIR"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
W = '/workspace/kilumen/design/new_r678/_work'
OUT = sys.argv[1]
D = {c['id']: c for c in json.load(open('/workspace/kilumen/design/new_r678/NEW_35.json'))['creatures']}

def fgmask(a):
    white = (a.min(2) >= 232) & (a.max(2) - a.min(2) < 22)
    lab, n = nd.label(white); edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
    fg = ~np.isin(lab, list(edge)); fg = nd.binary_opening(fg, iterations=1)
    holes = nd.binary_fill_holes(fg) & ~fg; hl, hn = nd.label(holes); hs = nd.sum(holes, hl, range(1, hn + 1))
    return fg | np.isin(hl, [i + 1 for i, v in enumerate(hs) if v < 250])
def cells(path):
    im = np.array(Image.open(path).convert('RGB')).astype(int); H, Wd, _ = im.shape
    fg = fgmask(im); l, n = nd.label(fg); sz = nd.sum(fg, l, range(1, n + 1)); com = nd.center_of_mass(fg, l, range(1, n + 1))
    masks = [np.zeros_like(fg) for _ in range(10)]
    for i, (s_, (cy, cx)) in enumerate(zip(sz, com)):
        if s_ < 60: continue
        k = int(cy // (H / 2)) * 5 + int(cx // (Wd / 5)); masks[k] |= (l == i + 1)
    return [(im, m) for m in masks]
def crop(src):
    if isinstance(src, tuple): a, fg = src
    else:
        a = src; fg = fgmask(a); l, n = nd.label(fg); sz = nd.sum(fg, l, range(1, n + 1))
        fg = np.isin(l, [i + 1 for i, v in enumerate(sz) if v >= max(60, sz.max() * 0.01)])
    ys, xs = np.where(fg); sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    return Image.fromarray(np.dstack([a[sl], fg[sl] * 255]).astype('uint8'), 'RGBA')
INK = (0x19, 0x12, 0x10)
def pix(im, maxw, maxh, ncol):
    f = max(im.width / maxw, im.height / maxh); sz = (max(1, round(im.width / f)), max(1, round(im.height / f)))
    rgb = im.convert('RGB').resize(sz, Image.LANCZOS).quantize(ncol, method=Image.Quantize.MAXCOVERAGE).convert('RGB')
    al = im.getchannel('A').resize(sz, Image.BOX).point(lambda v: 255 if v > 120 else 0)
    rgb.putalpha(al); a = np.array(rgb); m = a[..., 3] > 0
    edge = m & ~nd.binary_erosion(m, border_value=0); a[edge, :3] = INK  # game ink outline
    return Image.fromarray(a)
def place(spr, cw, ch, pad_b):
    cv = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); cv.paste(spr, ((cw - spr.width) // 2, ch - pad_b - spr.height), spr); return cv
up = lambda im, k: im.resize((im.width * k, im.height * k), Image.NEAREST)
mir = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)
def squash(spr, dy):  # idle breath: shorter by dy, feet fixed (bottom-aligned by place)
    return spr if dy == 0 else spr.resize((spr.width, spr.height - dy), Image.NEAREST)
BT = {'small': (92, 92), 'medium': (104, 104), 'large': (114, 116), 'huge': (122, 122)}
OWT = {'small': (40, 42), 'medium': (46, 48), 'large': (52, 54), 'huge': (56, 58)}
MS = [180, 160, 200, 160]
def sheet(frames, cols):
    w, h = frames[0].size; rows = (len(frames) + cols - 1) // cols
    s = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames): s.paste(f, ((i % cols) * w, (i // cols) * h))
    return s
def gif(frames, path):
    fr = [f.copy() for f in frames]
    fr[0].save(path, save_all=True, append_images=fr[1:], duration=MS, loop=0, disposal=2, transparency=0, optimize=False)

ORIG = {6: 'puffgill kelpkit drizzlop cocklet foamfawn nubbinray shoalpup breakwarden galecrest undertusk', 7: 'wickmote fogkin paperpaw lensmoth bellbuoy hushlet lampwisp beaconwraith tidelore veilfin', 8: 'ashbun pumicub emberkip smoglet geysquirt cinderpip forgehorn anvilaurox slagdrake calderune'}
src = {}
for r, v in ORIG.items():
    g = cells(f'{W}/r{r}_raw.jpg')
    for k, n in enumerate(v.split()): src[n] = g[k]
for n in ['smoglet', 'swellhound', 'lanternshade', 'beaconwraith', 'smeltbull', 'geysquirt', 'flarekite', 'pyrevane']:
    src[n] = np.array(Image.open(f'{W}/{n}_raw.jpg').convert('RGB')).astype(int)
report = {}
for n in sorted(D):
    c = D[n]; size = c.get('size_class', 'medium'); C = f'{OUT}/{n}'
    for sub in ['battle', 'base', f'anim/{n}_front_idle', f'anim/{n}_back_idle', f'overworld/{n}_ow']: os.makedirs(f'{C}/{sub}', exist_ok=True)
    im = crop(src[n])
    bw, bh = BT[size]; front = pix(im, bw, bh, 40); back = mir(front)
    front.save(f'{C}/base/{n}_front.png'); back.save(f'{C}/base/{n}_back.png')
    for side, spr in (('front', front), ('back', back)):
        cv = place(spr, 128, 128, 2); cv.save(f'{C}/battle/{n}_{side}_128.png'); up(cv, 2).save(f'{C}/battle/{n}_{side}_128_2x.png')
        fr = [place(squash(spr, d), 128, 128, 2) for d in (0, 1, 2, 1)]
        for i, f in enumerate(fr):
            f.save(f'{C}/anim/{n}_{side}_idle/{n}_{side}_idle_f{i}.png'); up(f, 2).save(f'{C}/anim/{n}_{side}_idle/{n}_{side}_idle_f{i}_2x.png')
        sheet(fr, 4).save(f'{C}/anim/{n}_{side}_idle_sheet.png'); up(sheet(fr, 4), 2).save(f'{C}/anim/{n}_{side}_idle_sheet_2x.png')
        gif([up(f, 2) for f in fr], f'{C}/anim/{n}_{side}_idle_2x.gif')
    ow, oh = OWT[size]; o = pix(im, ow, oh, 28)
    views = {'down': o, 'left': o if True else o, 'right': mir(o), 'up': o}
    rows = []
    for d, v in views.items():
        v.save(f'{C}/base/{n}_ow_{d}.png')
        frs = [place(v, 64, 64, 2)] + [place(v, 64, 64, 2 + b) for b in (0, 1, 0, 1)]
        for k, f in zip(['stand', 'walk0', 'walk1', 'walk2', 'walk3'], frs):
            for s in (1, 2, 3): (f if s == 1 else up(f, s)).save(f'{C}/overworld/{n}_ow/{n}_ow_{d}_{k}{"" if s == 1 else f"_{s}x"}.png')
        rows += frs
    sh = sheet(rows, 5); sh.save(f'{C}/overworld/{n}_ow_sheet.png'); up(sh, 2).save(f'{C}/overworld/{n}_ow_sheet_2x.png'); up(sh, 3).save(f'{C}/overworld/{n}_ow_sheet_3x.png')
    A = np.array(place(front, 128, 128, 2))[..., 3]
    clipped = bool(A[0].any() or A[:, 0].any() or A[:, -1].any())
    report[n] = dict(front=front.size, ow=o.size, clipped=clipped)
    json.dump({f'{n}_front': dict(size=front.size, src='design/new_r678 raw'), f'{n}_ow': dict(size=o.size)}, open(f'{C}/base/meta.json', 'w'), indent=1)
    open(f'{C}/README.md', 'w').write(f"# {c['name']} - pixel sprites (NEW 35, regions 6-8; Gary pt2665u Oct 31 2026)\nBuilt by tools/new_r678/build_sprites.py from design/new_r678 raws. PLACEHOLDER: back = mirrored front, overworld up/left = front view, walk = hover bob (no rear/side views drawn yet).\n")
json.dump(report, open(f'{OUT}/../_new_r678_report.json', 'w'), indent=1)
print(sum(r['clipped'] for r in report.values()), 'clipped of', len(report))
