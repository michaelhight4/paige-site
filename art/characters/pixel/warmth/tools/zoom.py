import sys
from PIL import Image, ImageDraw
from wlib import *
n, scale, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]; rels = sys.argv[4:]
tiles = []
for rel in rels:
    im = Image.open(f'{CRE}/{n}/{rel}').convert('RGBA'); bg = Image.new('RGBA', im.size, (70, 90, 70, 255)); bg.alpha_composite(im)
    im = bg.resize((im.width * scale, im.height * scale), Image.NEAREST); d = ImageDraw.Draw(im)
    for x in range(0, im.width, 8 * scale): d.line([(x, 0), (x, im.height)], fill=(0, 0, 0, 255) if x % (32*scale) else (255,255,0,255))
    for y in range(0, im.height, 8 * scale): d.line([(0, y), (im.width, y)], fill=(0, 0, 0, 255) if y % (32*scale) else (255,255,0,255))
    tiles.append(im)
W = sum(t.width for t in tiles) + 6 * len(tiles); H = max(t.height for t in tiles)
o = Image.new('RGB', (W, H)); x = 0
for t in tiles: o.paste(t, (x, 0)); x += t.width + 6
o.save(out)
