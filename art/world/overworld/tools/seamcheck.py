# Seam metric: for every ordered pair of variants (a|b side by side, a over b) of one terrain,
# ratio = mean |edge column step| / mean |interior column step|. 1.0 = invisible join; >1.3 = visible line.
import json, itertools, sys, os, numpy as np
from PIL import Image
OUT = os.environ.get('KILUMEN_OW_OUT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))   # (2026-10-23) was hard-coded to live; now the tree this file lives in (override: KILUMEN_OW_OUT)
def load():
    ts = json.load(open(f'{OUT}/tileset.json')); sheets = {}; T = 64; img = {}
    for t in ts['tiles']:
        sh = t['sheet']
        if sh not in sheets: sheets[sh] = np.asarray(Image.open(f'{OUT}/{sh}').convert('RGBA'), float)
        a = sheets[sh][t['row'] * T:(t['row'] + 1) * T, t['col'] * T:(t['col'] + 1) * T]
        img[t['name']] = a
    return img
def step(a, b):  # a left of b
    e = np.abs(a[:, -1, :3] - b[:, 0, :3]).mean()
    i = (np.abs(np.diff(a[..., :3], axis=1)).mean() + np.abs(np.diff(b[..., :3], axis=1)).mean()) / 2
    return e / max(i, 1e-6)
def ratio(tiles):
    r = [step(a, b) for a, b in itertools.product(tiles, tiles)]
    r += [step(np.transpose(a, (1, 0, 2)), np.transpose(b, (1, 0, 2))) for a, b in itertools.product(tiles, tiles)]
    return max(r), sum(r) / len(r)
def groups(img):
    g = {}
    for n in img:
        base = n.rsplit('_', 1)
        if len(base) == 2 and base[1].isdigit() and not '>' in n: g.setdefault(base[0], []).append(img[n])
    return g
if __name__ == '__main__':
    img = load(); res = {}
    for k, v in sorted(groups(img).items()):
        if len(v) >= 2 and all(a.shape == (64, 64, 4) and a[..., 3].min() == 255 for a in v):
            mx, mean = ratio(v); res[k] = (len(v), round(mx, 2), round(mean, 2)); print(f'{k:24s} n={len(v)} worst={mx:.2f} mean={mean:.2f}')
    json.dump(res, open(f'{OUT}/qa/seams/seam_metric_{sys.argv[1] if len(sys.argv) > 1 else "now"}.json', 'w'), indent=1)
