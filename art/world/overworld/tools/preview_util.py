# Small renderer for documentation previews: draws a map region from maps/*.json + tileset.json (1x),
# with optional sprite placeholders inserted between the decoration and overlay layers (correct draw order).
import json, os
from PIL import Image, ImageDraw, ImageFont
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
_TS = None; _SHEETS = {}
def ts():
    global _TS
    if _TS is None: _TS = json.load(open(f'{BASE}/tileset.json')); _TS['byid'] = {t['id']: t for t in _TS['tiles']}
    return _TS
def tile_img(tid, frame=None):
    t = ts()['byid'][tid]; sh = _SHEETS.setdefault(t['sheet'], Image.open(f"{BASE}/{t['sheet']}").convert('RGBA'))
    idx = t['index']
    if frame is not None and 'animation' in t: idx = t['animation']['frames'][frame % len(t['animation']['frames'])]
    return sh.crop(((idx % 16) * 64, (idx // 16) * 64, (idx % 16) * 64 + 64, (idx // 16) * 64 + 64))

def silhouette(w=64, h=96):
    """64x96 placeholder human: ink outline, slate body, violet visor - just to show sprite scale/draw order."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    OUT, BODY, HI, VIS = (26, 18, 38, 255), (62, 58, 72, 255), (94, 88, 102, 255), (176, 118, 236, 255)
    d.ellipse([20, 6, 44, 32], fill=OUT); d.ellipse([22, 8, 42, 30], fill=BODY); d.rectangle([26, 16, 40, 20], fill=VIS)
    d.rounded_rectangle([16, 32, 48, 66], 6, fill=OUT); d.rounded_rectangle([18, 34, 46, 64], 5, fill=BODY); d.rectangle([20, 36, 24, 60], fill=HI)
    d.rectangle([10, 36, 17, 60], fill=OUT); d.rectangle([12, 38, 15, 58], fill=BODY); d.rectangle([47, 36, 54, 60], fill=OUT); d.rectangle([49, 38, 52, 58], fill=BODY)
    d.rectangle([20, 64, 31, 95], fill=OUT); d.rectangle([22, 64, 29, 93], fill=BODY); d.rectangle([33, 64, 44, 95], fill=OUT); d.rectangle([35, 64, 42, 93], fill=BODY)
    return im

def render_region(mapname, x0, y0, x1, y1, sprites=(), layers=None, frame=None, override=None):
    """sprites: [(tx, ty, img)] feet at bottom-centre of tile. override: {(layer, x, y): tile_id} for state previews."""
    m = json.load(open(f'{BASE}/maps/{mapname}.json')); L = layers or m['layers']
    W, H = x1 - x0 + 1, y1 - y0 + 1
    im = Image.new('RGBA', (W * 64, H * 64), (0, 0, 0, 255))
    def lay(name):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                tid = (override or {}).get((name, x, y), L[name][y][x])
                if tid: im.alpha_composite(tile_img(tid, frame), ((x - x0) * 64, (y - y0) * 64))
    lay('ground'); lay('decoration')
    B = ts()['byid']; items = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            tid = (override or {}).get(('overlay', x, y), L['overlay'][y][x])
            if tid and B[tid].get('ysort'): items.append((y, 1, x, tid))
    for tx, ty, sp in sprites: items.append((ty, 0, tx, sp))
    for y, kind, x, v in sorted(items, key=lambda s: (s[0], s[1], s[2])):
        if kind == 0: im.alpha_composite(v, ((x - x0) * 64 + 32 - v.width // 2, (y - y0 + 1) * 64 - v.height))
        else: im.alpha_composite(tile_img(v, frame), ((x - x0) * 64, (y - y0) * 64))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            tid = (override or {}).get(('overlay', x, y), L['overlay'][y][x])
            if tid and not B[tid].get('ysort'): im.alpha_composite(tile_img(tid, frame), ((x - x0) * 64, (y - y0) * 64))
    return im

def label(im, text, scale=3):
    out = Image.new('RGBA', (im.width, im.height + 18 * scale), (26, 18, 38, 255)); out.paste(im, (0, 18 * scale))
    tag = Image.new('RGBA', (len(text) * 6 + 8, 16), (26, 18, 38, 255)); d = ImageDraw.Draw(tag); d.text((4, 3), text, fill=(244, 226, 255, 255), font=ImageFont.load_default())
    out.alpha_composite(tag.resize((tag.width * scale, tag.height * scale), Image.NEAREST), (6, 1 * scale)); return out

def x3(im): return im.resize((im.width * 3, im.height * 3), Image.NEAREST)
