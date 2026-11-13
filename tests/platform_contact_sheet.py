# Contact sheet for tests/platform_shots.mjs (DRAFT). Usage: python3 tests/platform_contact_sheet.py
import json, os
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots', 'platform_profiles')
rep = [r for r in json.load(open(os.path.join(D, 'report.json'))) if 'file' in r]
TW = 560
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception: font = ImageFont.load_default()
tiles = []
for r in rep:
    im = Image.open(os.path.join(D, r['file'])).convert('RGB')
    s = TW / im.width if im.width >= im.height else 320 / im.height
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    cap = f"{r['plat']}{' portrait' if r.get('portrait') else ''} {r['w']}x{r['h']} dpr{r['dpr']}  zoom {r['zoom']}  overlap {','.join(r['overlaps']) or 'none'}" + ("  ROTATE" if r['rotateShown'] else "")
    tiles.append((im, cap))
cols = 3; cw = TW + 20
rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
rh = [max(t[0].height for t in row) + 30 for row in rows]
sheet = Image.new('RGB', (cw * cols + 10, sum(rh) + 50), (24, 20, 32))
d = ImageDraw.Draw(sheet)
d.text((10, 12), "Kilumen platform profiles (DRAFT, Oct 22 2026): pc vs mobile, dialogue open", fill=(255, 250, 240), font=font)
y = 45
for row, h in zip(rows, rh):
    for i, (im, cap) in enumerate(row):
        x = 10 + i * cw; sheet.paste(im, (x, y)); d.text((x, y + im.height + 6), cap, fill=(230, 225, 240), font=font)
    y += h
sheet.save(os.path.join(D, 'contact_sheet.png')); print(sheet.size)
