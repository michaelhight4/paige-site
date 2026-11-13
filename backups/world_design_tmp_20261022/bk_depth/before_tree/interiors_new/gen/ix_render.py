import json, os, glob
from PIL import Image, ImageDraw
from ix_mapkit import D, ts
T = 64
_cache = {}
def tile_img(tid):
    if tid in _cache: return _cache[tid]
    t = ts()['by_id'][tid]
    sh = Image.open(os.path.join(D, t['sheet'])).convert('RGBA')
    im = sh.crop((t['col'] * T, t['row'] * T, t['col'] * T + T, t['row'] * T + T))
    _cache[tid] = im; return im
NPC_COL = {'clerk': (64, 120, 200), 'healer': (220, 110, 150), 'master': (230, 180, 40), 'trainer': (200, 70, 60)}
def marker(im, x, y, kind, facing):
    d = ImageDraw.Draw(im, 'RGBA')
    cx, cy = x * T + 32, y * T + 32
    d.ellipse((cx - 18, cy + 18, cx + 18, cy + 28), fill=(26, 18, 38, 96))
    c = NPC_COL.get(kind, (90, 160, 90))
    d.rectangle((cx - 12, cy - 4, cx + 12, cy + 22), fill=c + (255,), outline=(26, 18, 38, 255), width=3)
    d.ellipse((cx - 12, cy - 26, cx + 12, cy - 2), fill=(240, 200, 160, 255), outline=(26, 18, 38, 255), width=3)
    dx, dy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}.get(facing, (0, 1))
    if facing != 'up': d.rectangle((cx - 4 + dx * 6, cy - 16, cx + 4 + dx * 6, cy - 10), fill=(26, 18, 38, 255))
def compose(m, actors=True, state=None):
    w, h = m['width'], m['height']
    im = Image.new('RGBA', (w * T, h * T), (16, 12, 24, 255))
    L = m['layers']
    for ln in ('ground', 'decoration'):
        for y in range(h):
            for x in range(w):
                t = L[ln][y][x]
                if t: im.alpha_composite(tile_img(t), (x * T, y * T))
    if actors:
        for it in m.get('items', []):
            d = ImageDraw.Draw(im); cx, cy = it['x'] * T + 32, it['y'] * T + 36
            d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(220, 60, 60), outline=(26, 18, 38), width=3); d.line((cx - 10, cy, cx + 10, cy), fill=(26, 18, 38), width=3)
        for n in sorted(m.get('npcs', []), key=lambda n: n['y']):
            marker(im, n['x'], n['y'], n.get('kind'), n.get('facing'))
    for y in range(h):
        for x in range(w):
            t = L['overlay'][y][x]
            if t: im.alpha_composite(tile_img(t), (x * T, y * T))
    return im
CC = {1: (255, 40, 40, 90), 2: (255, 160, 0, 110), 3: (40, 120, 255, 110), 4: (40, 255, 80, 130), 5: (160, 90, 30, 130), 6: (255, 0, 255, 120), 7: (255, 255, 0, 120), 9: (0, 255, 255, 90)}
def debug(m, im):
    s = 0.5; w, h = m['width'], m['height']
    sm = im.resize((int(w * T * s), int(h * T * s)), Image.NEAREST)
    d = ImageDraw.Draw(sm, 'RGBA'); q = int(T * s)
    for y in range(h):
        for x in range(w):
            c = m['layers']['collision'][y][x]
            if c in CC: d.rectangle((x * q, y * q, x * q + q - 1, y * q + q - 1), fill=CC[c])
            d.rectangle((x * q, y * q, x * q + q - 1, y * q + q - 1), outline=(0, 0, 0, 40))
    for wp in m['warps']:
        d.text((wp['x'] * q + 2, wp['y'] * q + 2), ('R' if wp['to'] == '$return' else wp['to'][:6]), fill=(0, 0, 0, 255))
    for n in m['npcs']:
        d.text((n['x'] * q + 2, n['y'] * q + 20), n['kind'][:5], fill=(255, 255, 255, 255))
    for x in range(w): d.text((x * q + 10, 0), str(x), fill=(255, 255, 255, 200))
    for y in range(h): d.text((0, y * q + 10), str(y), fill=(255, 255, 255, 200))
    return sm
def main():
    out = os.path.join(D, 'previews'); os.makedirs(os.path.join(out, 'debug'), exist_ok=True)
    for f in sorted(glob.glob(os.path.join(D, 'maps', '*.json'))):
        m = json.load(open(f))
        im = compose(m)
        im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(os.path.join(out, m['name'] + '_3x.png'))
        im.save(os.path.join(out, m['name'] + '_1x.png'))
        debug(m, compose(m, actors=True)).save(os.path.join(out, 'debug', m['name'] + '_debug.png'))
        if 'puzzle' in m:
            import ix_checks
            sol = ix_checks.solved_state_map(m)
            if sol:
                im2 = compose(sol); im2.save(os.path.join(out, m['name'] + '_solved_1x.png'))
    print('previews written')
