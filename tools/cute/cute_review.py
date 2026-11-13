"""Review sheet for a cute set build: front, back, 4 OW stands (2x), walk frame, icon (2x), cosmic front. Usage: python3 cute_review.py cute_r1 v1"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
S, V = sys.argv[1], sys.argv[2]
CRE = '/workspace/kilumen/art/characters/pixel/creatures'
ids = [c['id'] for c in json.load(open(f'/workspace/kilumen/design/cute_sets/{S}.json'))['creatures']]
out = f'/workspace/kilumen/shots/{S}_{V}'; os.makedirs(out, exist_ok=True)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
def L(p, k=1):
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGBA'); return im.resize((im.width * k, im.height * k), Image.NEAREST)
cols = 10; cw = 130; rh = 150
sheet = Image.new('RGBA', (cols * cw + 110, rh * len(ids) + 30), (238, 240, 232, 255)); d = ImageDraw.Draw(sheet)
heads = ['front', 'back', 'ow down', 'ow left', 'ow right', 'ow up', 'walk L f1', 'icon 2x', 'cosmic', '']
for i, h in enumerate(heads): d.text((110 + i * cw + 4, 6), h, fill=(40, 40, 40), font=F)
for r, n in enumerate(ids):
    y = 30 + r * rh; d.text((6, y + 60), n, fill=(20, 20, 20), font=F)
    O = f'{CRE}/{n}/overworld/{n}_ow'
    ims = [L(f'{CRE}/{n}/battle/{n}_front_128.png'), L(f'{CRE}/{n}/battle/{n}_back_128.png')] + \
          [L(f'{O}/{n}_ow_{dd}_stand.png', 2) for dd in ('down', 'left', 'right', 'up')] + \
          [L(f'{O}/{n}_ow_left_walk1.png', 2), L(f'{CRE}/{n}/icons/{n}_icon_f0.png', 2), L(f'{CRE}/{n}/cosmic/{n}_cosmic_front_128.png')]
    nt = []
    ims.append(None)
    for i, im in enumerate(ims):
        x = 110 + i * cw
        if im is None: d.text((x + 30, y + 60), '-', fill=(150, 0, 0), font=F); continue
        if im.width > 128: im = im.resize((128, int(im.height * 128 / im.width)), Image.NEAREST)
        sheet.alpha_composite(im, (x + (128 - im.width) // 2, y + (rh - im.height) // 2))
sheet.save(f'{out}/review_full_build.png'); print(f'{out}/review_full_build.png', sheet.size)
