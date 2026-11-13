"""Offline room composite (no engine shadows/lighting): python3 compose.py MAP OUT.png [v2]"""
import json, os, sys
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); OW = os.path.join(ROOT, 'art/world/overworld')
def compose(mapname, v2=False, scale=1):
    ts = json.load(open(os.path.join(OW, 'tileset.json'))); T = {t['id']: t for t in ts['tiles']}
    if v2: T.update({t['id']: t for t in json.load(open(os.path.join(OW, 'tileset_ix2.json')))['tiles']})
    m = json.load(open(os.path.join(OW, 'maps', mapname + '.json'))); cache = {}
    def sheet(p):
        if v2 and p == 'tiles_1x/interior.png': p = 'tiles_1x/interior_v2.png'
        if p not in cache: cache[p] = Image.open(os.path.join(OW, p)).convert('RGBA')
        return cache[p]
    im = Image.new('RGBA', (m['width'] * 64, m['height'] * 64), (0, 0, 0, 255))
    for L in ('ground', 'decoration', 'overlay'):
        for y, row in enumerate(m['layers'][L]):
            for x, v in enumerate(row):
                if not v or v not in T: continue
                t = T[v]; i = t['index']; s = sheet(t['sheet'])
                cell = s.crop(((i % 16) * 64, (i // 16) * 64, (i % 16) * 64 + 64, (i // 16) * 64 + 64)); im.alpha_composite(cell, (x * 64, y * 64))
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST) if scale != 1 else im
if __name__ == '__main__': compose(sys.argv[1], len(sys.argv) > 3).save(sys.argv[2])
