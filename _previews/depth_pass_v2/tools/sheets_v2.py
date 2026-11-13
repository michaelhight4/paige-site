# Depth pass v2 previews (Oct 22, 2026): before/after pairs (J toggled: left depth off, right depth on),
# contact sheet, strength options (off/light/medium/strong), lit-greens option, guide checks.
# Usage: python3 _previews/depth_pass_v2/tools/sheets_v2.py   (after shots_v2.mjs)
import os, json
from PIL import Image, ImageDraw, ImageFont
D = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); R = D + '/raw'
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 22)
TAGS = ['heal_brookhollow', 'lab_crystals', 'home_sofas', 'route1_trees', 'firefly_day', 'firefly_night', 'fernwick_club_front_night', 'fernwick_hall']
def label(im, text, x=0, y=0):
    d = ImageDraw.Draw(im); w = d.textlength(text, font=F); d.rectangle((x, y, x + w + 16, y + 32), fill=(0, 0, 0)); d.text((x + 8, y + 4), text, fill=(255, 255, 255), font=F)
def fit(im, W): return im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
def load(n): return Image.open(f'{R}/{n}').convert('RGB')
def row(ims, names, W):
    ims = [fit(i, W) for i in ims]; h = max(i.height for i in ims)
    s = Image.new('RGB', (len(ims) * (W + 8) - 8, h), (255, 0, 255))
    for k, (i, n) in enumerate(zip(ims, names)): s.paste(i, (k * (W + 8), 0)); label(s, n, k * (W + 8), 0)
    return s
def stack(rows, gap=10):
    W = max(r.width for r in rows); H = sum(r.height for r in rows) + gap * (len(rows) - 1)
    s = Image.new('RGB', (W, H), (24, 24, 28)); y = 0
    for r in rows: s.paste(r, (0, y)); y += r.height + gap
    return s
os.makedirs(D + '/pairs', exist_ok=True)
pairs = []
for t in TAGS:
    for dev in ['pc', 'mobile']:
        p = row([load(f'{t}_{dev}_depth0.png'), load(f'{t}_{dev}_depth1.png')], [f'{t} {dev}  J: depth OFF', 'J: depth ON'], 960 if dev == 'pc' else 1080)
        p.save(f'{D}/pairs/pair_{t}_{dev}.png'); pairs.append(p)
# contact sheet: pc pair | mobile pair per scene
cells = []
for i in range(0, len(pairs), 2):
    a, b = fit(pairs[i], 1400), fit(pairs[i + 1], 1400); h = max(a.height, b.height)
    c = Image.new('RGB', (2808, h), (24, 24, 28)); c.paste(a, (0, 0)); c.paste(b, (1408, 0)); cells.append(c)
stack(cells).save(D + '/contact_sheet.png')
# strength options: rows = scenes, cols = off / light / medium / strong; plus 2x crop row under each
CROP = {'heal_brookhollow': (60, 60, 860, 540), 'home_sofas': (300, 60, 1100, 540), 'route1_trees': (300, 200, 1100, 680), 'firefly_night': (20, 150, 820, 630)}
rows = []
for t, box in CROP.items():
    ims = [load(f'{t}_pc_depth0.png')] + [load(f'{t}_pc_{s}.png') for s in ['light', 'medium', 'strong']]
    names = [f'{t}: off', 'light (x0.7)', 'medium (x1.0, current)', 'strong (x1.35)']
    rows.append(row([i.crop(box) for i in ims], names, 800))
s = stack(rows); hdr = Image.new('RGB', (s.width, 48), (0, 0, 0)); ImageDraw.Draw(hdr).text((10, 10), 'Depth shadow STRENGTH options for Gary - ?depthstrength=light|medium|strong or depth.json "strength". Crops of PC 1920x1080 at 1:1.', fill=(255, 255, 255), font=F)
stack([hdr, s], 0).save(D + '/strength_options.png')
# lit greens option (config.litGreensAtNight, default OFF)
stack([row([load('firefly_night_pc_depth1.png'), load('firefly_night_litgreens_pc_depth1.png')], ['Firefly night: litGreensAtNight OFF (default)', 'ON (?litgreens=1)'], 960),
       row([load('firefly_night_mobile_depth1.png'), load('firefly_night_litgreens_mobile_depth1.png')], ['mobile OFF', 'mobile ON'], 960)]).save(D + '/litgreens_option.png')
# guide checks with the computed guide box drawn
rep = json.load(open(D + '/report.json')); gs = []
for r in rep:
    if r.get('kind') != 'guide': continue
    im = load(f'fernwick_hall_guide_{r["dev"]}.png'); g = r['guide']
    gs.append((r['dev'], im, g))
cells = []
for dev, im, g in gs:
    c = fit(im, 1200)
    label(c, f'{dev}: guide ({g["x"]},{g["y"]}) facing {g["facing"]}, overlaps {len(g["overlaps"])}, onScreen {g["onScreen"]}')
    cells.append(c)
stack(cells).save(D + '/guide_check.png')
print('ok', len(pairs), 'pairs')
