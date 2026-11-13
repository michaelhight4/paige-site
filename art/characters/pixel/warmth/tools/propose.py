import sys, numpy as np
from PIL import Image, ImageDraw
from wlib import *
def render(n, rels, scale, path):
    tiles = []
    for rel in rels:
        a = load(n, rel); lab, k = components(a); m = a[..., 3] > 0; F = comp_feats(lab, k)
        g = a[..., :3].mean(-1); o = np.zeros(a.shape, np.uint8); o[..., 3] = 255; o[..., :3] = 30
        o[m, :3] = (g[m, None] * 0.45 + 50).astype(np.uint8); v = lab > 0; o[v, :3] = a[v, :3]
        im = Image.fromarray(o).resize((a.shape[1] * scale, a.shape[0] * scale), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for i, f in F.items():
            col = (255, 60, 60) if (f['core'] >= 2 and f['core'] >= 0.15 * f['area']) else (255, 255, 0)
            d.text((f['cx'] * scale + 5, f['cy'] * scale - 5), str(i), fill=col)
        d.text((2, 2), rel.split('/')[-1], fill=(0, 255, 255)); tiles.append(im)
    W = sum(t.width for t in tiles) + 6 * len(tiles); H = max(t.height for t in tiles)
    out = Image.new('RGB', (W, H)); x = 0
    for t in tiles: out.paste(t, (x, 0)); x += t.width + 6
    out.save(path)
if __name__ == '__main__':
    n = sys.argv[1]; S = sprites(n)
    render(n, sorted([s for s in S if s.startswith('battle/')], reverse=True), 3, f'/tmp/w/p_{n}_b.png')
    render(n, [s for s in S if s.endswith('_stand.png')], 5, f'/tmp/w/p_{n}_o.png')
