# Contact sheet: each interior next to its exterior building crop, same scale (0.5x of native: 32px per 64px tile).
import json, os
from PIL import Image, ImageDraw, ImageFont
import audit as A
OW = '/workspace/kilumen/art/world/overworld/'
ts = json.load(open(OW + 'tileset.json'))
byid = {t['id']: t for t in ts['tiles']}
_sheets = {}
def tile(i):
    t = byid.get(i)
    if not t: return None
    p = t['sheet']
    if p not in _sheets: _sheets[p] = Image.open(OW + p).convert('RGBA')
    s = _sheets[p]; c = t.get('col', t['index'] % 16); r = t.get('row', t['index'] // 16)
    return s.crop((c*64, r*64, c*64+64, r*64+64))
def render(m, x0=0, y0=0, w=None, h=None):
    w = w or m['width']; h = h or m['height']
    im = Image.new('RGBA', (w*64, h*64), (0, 0, 0, 255))
    for L in ('ground', 'decoration', 'overlay'):
        g = m['layers'].get(L)
        if not g: continue
        for y in range(h):
            for x in range(w):
                X, Y = x0+x, y0+y
                if 0 <= Y < m['height'] and 0 <= X < m['width'] and g[Y][X]:
                    t = tile(g[Y][X])
                    if t: im.alpha_composite(t, (x*64, y*64))
    return im
spr = A.spr
person = Image.open('/workspace/kilumen/art/characters/pixel/' + spr['house_1f.ron']['overworld_sheet']).convert('RGBA').crop((0, 0, 64, 96))
def marks(im, a):
    d = ImageDraw.Draw(im)
    for n in a['npcs']:
        if isinstance(n.get('x'), int) and n.get('kind') != 'spawn':
            x, y = n['x'], n['y']; d.rectangle((x*64+6, y*64+6, x*64+57, y*64+57), outline=(255, 170, 0, 255), width=5); d.ellipse((x*64+22, y*64+22, x*64+41, y*64+41), fill=(255, 170, 0, 255))
    for sp in a['spots']:
        x, y = sp['x'], sp['y']; d.rectangle((x*64+12, y*64+12, x*64+51, y*64+51), outline=(60, 230, 90, 255), width=4)
        sx, sy = sp['stand']; d.line((sx*64+32, sy*64+32, x*64+32, y*64+32), fill=(60, 230, 90, 255), width=3)
def put_person(im, cx, cy):  # feet at bottom-centre of cell (cx,cy)
    im.alpha_composite(person, (cx*64, cy*64+64-96 if cy*64-32 >= 0 else cy*64))
S = 0.5
font = ImageFont.load_default()
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: small = font
rows = []
dt = A.door_table if isinstance(A.door_table, list) else A.door_table['doors']
pairs = []
for d in dt:
    if d.get('to') in A.INTERIORS: pairs.append((d['exterior'], tuple(d['door']) if isinstance(d.get('door'), list) else (d['door']['x'], d['door']['y']) if isinstance(d.get('door'), dict) else d['door'], d['to']))
twof = {'house_1f': 'house_2f', 'home_brookhollow_b': 'home_brookhollow_b_2f', 'home_fernwick_a': 'home_fernwick_a_2f', 'home_lanternport_c': 'home_lanternport_c_2f'}
panels = []
for town, door, to in pairs:
    tm = A.load(town); base, bb = A.building_at(town, door[0], door[1]-1)
    ex = render(tm, bb['x0']-1, bb['y0']-1, bb['w']+2, bb['h']+3)
    put_person(ex, door[0]-(bb['x0']-1), door[1]-(bb['y0']-1)+1)
    im_m = A.load(to); a = A.analyse(to)
    it = render(im_m); marks(it, a); put_person(it, a['arr'][0], a['arr'][1])
    d2 = ImageDraw.Draw(it)
    for w in im_m['warps']:
        d2.rectangle((w['x']*64+2, w['y']*64+2, w['x']*64+61, w['y']*64+61), outline=(255, 60, 60, 255), width=4)
    extra = []
    if to in twof:
        m2 = A.load(twof[to]); i2 = render(m2); a2 = A.analyse(twof[to]); marks(i2, a2); put_person(i2, a2['arr'][0], a2['arr'][1]); extra = [(twof[to], i2, m2)]
    panels.append((town, door, to, base, bb, ex, it, im_m, extra))
def sc(im): return im.resize((int(im.width*S), int(im.height*S)), Image.NEAREST)
def grid(im, step=32):
    d = ImageDraw.Draw(im)
    for x in range(0, im.width, step): d.line((x, 0, x, im.height), fill=(255, 255, 255, 40))
    for y in range(0, im.height, step): d.line((0, y, im.width, y), fill=(255, 255, 255, 40))
    return im
blocks = []
for town, door, to, base, bb, ex, it, im_m, extra in panels:
    imgs = [('EXT %s\n%s %dx%d door %s' % (town, base.replace('house_','h_'), bb['w'], bb['h'], door), grid(sc(ex))), ('%s\nmap %dx%d' % (to, im_m['width'], im_m['height']), grid(sc(it)))]
    for n2, i2, m2 in extra: imgs.append(('%s\nmap %dx%d' % (n2, m2['width'], m2['height']), grid(sc(i2))))
    W = sum(i.width for _, i in imgs) + 24*(len(imgs)-1) + 20; H = max(i.height for _, i in imgs) + 60
    b = Image.new('RGBA', (W, H), (24, 22, 30, 255)); d = ImageDraw.Draw(b); x = 10
    for lab, i in imgs:
        d.multiline_text((x, 6), lab, font=small, fill=(240, 230, 200, 255)); b.alpha_composite(i, (x, 44)); x += i.width + 24
    blocks.append(b)
# pack into 2 columns
colW = max(b.width for b in blocks) + 20
cols = [[], []]; hs = [0, 0]
for b in blocks:
    k = 0 if hs[0] <= hs[1] else 1; cols[k].append(b); hs[k] += b.height + 12
sheet = Image.new('RGBA', (colW*2 + 20, max(hs) + 70), (12, 12, 16, 255))
d = ImageDraw.Draw(sheet)
d.text((12, 10), 'Kilumen interior scale audit - every panel at 0.5x native (32px = one 64px tile), faint grid = 1 tile, sprite = 64x96 human at arrival/door, red = warp mats/stairs, orange = NPC cell, green = interact spot (line to stand tile)', font=font, fill=(255, 255, 255, 255))
d.text((12, 32), 'Black around an interior = void (map bounds). Data: maps/*.json as of the audit run.', font=small, fill=(200, 200, 200, 255))
for k in range(2):
    y = 60
    for b in cols[k]: sheet.alpha_composite(b, (10 + k*colW, y)); y += b.height + 12
sheet.convert('RGB').save('sheet.png'); print(sheet.size, len(blocks))
