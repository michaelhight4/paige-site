import sys, numpy as np
from PIL import Image, ImageDraw
from wlib import *
def render(n, rels, scale, path):
    tiles = []
    for rel in rels:
        a = load(n, rel); lab, k = components(a); m = a[..., 3] > 0
        g = a[..., :3].mean(-1); o = np.zeros(a.shape, np.uint8); o[..., 3] = 255; o[..., :3] = 30
        o[m, :3] = (g[m, None] * 0.45 + 50).astype(np.uint8); v = lab > 0; o[v, :3] = a[v, :3]
        im = Image.fromarray(o).resize((a.shape[1] * scale, a.shape[0] * scale), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for i in range(1, k + 1):
            ys, xs = np.where(lab == i)
            d.text((xs.mean() * scale + 6, ys.mean() * scale - 6), str(i), fill=(255, 255, 0))
        d.text((2, 2), rel.split('/')[-1], fill=(0, 255, 255)); tiles.append(im)
    W = sum(t.width for t in tiles) + 6 * len(tiles); H = max(t.height for t in tiles)
    out = Image.new('RGB', (W, H)); x = 0
    for t in tiles: out.paste(t, (x, 0)); x += t.width + 6
    out.save(path)
if __name__ == '__main__':
    n = sys.argv[1]; S = sprites(n)
    bat = [s for s in S if s.startswith('battle/')]
    ow = [s for s in S if s.endswith('_stand.png')]
    render(n, sorted(bat, reverse=True), 3, f'/tmp/w/k_{n}_b.png')
    render(n, ow, 5, f'/tmp/w/k_{n}_o.png')
