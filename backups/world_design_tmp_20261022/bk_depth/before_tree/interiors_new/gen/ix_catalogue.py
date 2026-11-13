# Object catalogue sheet (each multi-tile object reassembled) for visual review.
import json, os
from PIL import Image, ImageDraw
from ix_canvas import OW
D = os.path.join(OW, 'interiors_new')
def main(scale=1, out='previews/catalogue_objects.png', bg=(70, 62, 80, 255)):
    js = json.load(open(os.path.join(D, 'tileset_interiors.json')))
    sh = {k: Image.open(os.path.join(D, v)) for k, v in js['sheets'].items()}
    by = {t['name']: t for t in js['tiles']}
    def tile(n):
        t = by[n]; s = sh[t['sheet'].split('/')[-1][:-4]]
        return s.crop((t['col'] * 64, t['row'] * 64, t['col'] * 64 + 64, t['row'] * 64 + 64))
    items = []
    multi = js['multi_tile_objects']; parts = set()
    for n, m in multi.items():
        im = Image.new('RGBA', (m['w'] * 64, m['h'] * 64))
        for r in range(m['h']):
            for c in range(m['w']):
                pn = '%s_%d_%d' % (n, r, c); parts.add(pn); im.paste(tile(pn), (c * 64, r * 64))
        items.append((n, im))
    for t in js['tiles']:
        if t['name'] in parts or t['category'] in ('floor', 'wall'): continue
        items.append((t['name'], tile(t['name'])))
    W = 1600; x = y = 8; rowh = 0; pos = []
    for n, im in items:
        if x + im.width > W: x = 8; y += rowh + 22; rowh = 0
        pos.append((x, y)); x += im.width + 10; rowh = max(rowh, im.height)
    H = y + rowh + 24
    out_im = Image.new('RGBA', (W, H), bg); d = ImageDraw.Draw(out_im)
    for (n, im), (x, y) in zip(items, pos):
        out_im.alpha_composite(im, (x, y)); d.text((x, y + im.height + 2), n[2:][:16], fill=(255, 255, 255, 255))
    out_im.save(os.path.join(D, out)); return os.path.join(D, out)
if __name__ == '__main__':
    print(main())
