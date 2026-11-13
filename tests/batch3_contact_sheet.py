# Contact sheet for tests/batch3_shots.mjs (Oct 22, 2026). Usage: python3 tests/batch3_contact_sheet.py
import json, os
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots', 'batch3')
rep = [r for r in json.load(open(os.path.join(D, 'report.json'))) if 'file' in r]
TW = 560
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except Exception: font = ImageFont.load_default()
tiles = []
for r in rep:
    im = Image.open(os.path.join(D, r['file'])).convert('RGB')
    s = TW / im.width
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    ov = {k: v for k, v in r['overlaps'].items() if v}
    cap1 = f"{r['dev']} {r['w']}x{r['h']} dpr{r['dpr']}  {r['tag']}"
    cap2 = f"cam y {r['cam']['y']}  pinned {r['pinnedBottom']}  overlaps {ov or 'none'}"
    tiles.append((im, cap1, cap2))
cols = 3; cw = TW + 20
rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
rh = [max(t[0].height for t in row) + 48 for row in rows]
sheet = Image.new('RGB', (cw * cols + 10, sum(rh) + 50), (24, 20, 32))
d = ImageDraw.Draw(sheet)
d.text((10, 12), "Kilumen batch 3 (Oct 22 2026): text_pending NPCs, pin short maps, profile prompts, mobile toast/battle offsets", fill=(255, 250, 240), font=font)
y = 45
for row, h in zip(rows, rh):
    for i, (im, c1, c2) in enumerate(row):
        x = 10 + i * cw; sheet.paste(im, (x, y))
        d.text((x, y + im.height + 4), c1, fill=(230, 225, 240), font=font)
        d.text((x, y + im.height + 22), c2, fill=(200, 195, 215), font=font)
    y += h
sheet.save(os.path.join(D, 'contact_sheet.png')); print(sheet.size)
