import sys, numpy as np
from PIL import Image, ImageDraw
from classify import *
def overlay(a, L, scale):
    m = a[..., 3] > 0; g = a[..., :3].mean(-1); o = np.zeros(a.shape, np.uint8); o[..., 3] = 255; o[..., :3] = 25
    o[m, :3] = (g[m, None] * 0.4 + 45).astype(np.uint8)
    o[L == 2, :3] = (90, 60, 140); o[L == 1, :3] = (60, 255, 90)
    return Image.fromarray(o).resize((a.shape[1] * scale, a.shape[0] * scale), Image.NEAREST)
def grid(n, rels, L, scale, tag):
    tiles = []
    for rel in rels:
        im = overlay(load(n, rel), L[rel], scale); d = ImageDraw.Draw(im)
        for x in range(0, im.width, 16 * scale): d.line([(x, 0), (x, 3)], fill=(255, 255, 0))
        for y in range(0, im.height, 16 * scale): d.line([(0, y), (3, y)], fill=(255, 255, 0))
        d.text((2, 2), rel.split('/')[-1][:-4], fill=(0, 255, 255)); tiles.append(im)
    W = sum(t.width for t in tiles) + 6 * len(tiles); H = max(t.height for t in tiles)
    out = Image.new('RGB', (W, H)); x = 0
    for t in tiles: out.paste(t, (x, 0)); x += t.width + 6
    out.save(f'/tmp/w/r_{n}_{tag}.png')
if __name__ == '__main__':
    n = sys.argv[1]; tag = sys.argv[2] if len(sys.argv) > 2 else 'a'
    L = classify_creature(n); S = sorted(L)
    grid(n, sorted([s for s in S if s.startswith('battle/')], reverse=True), L, 3, tag + 'b')
    grid(n, [s for s in S if s.endswith('_stand.png')], 4, tag + 'o') if False else grid(n, [s for s in S if s.endswith('_stand.png')], L, 4, tag + 'o')
