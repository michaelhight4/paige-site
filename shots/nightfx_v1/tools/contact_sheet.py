# Night FX v1.1 contact sheet: rows = scene x device, columns = before (?nightfx=0) | after. Usage: python3 contact_sheet.py
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = ['town_night', 'route_night', 'town_dusk']; DEVS = ['pc', 'phone']; W = 900; PAD = 12; LH = 26
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: F = ImageFont.load_default()
rows = []
for s in SCENES:
    for dv in DEVS:
        ims = [Image.open(f'{D}/{l}/{s}_{dv}.png').convert('RGB') for l in ('before', 'after')]
        rows.append((f'{s} {dv} {ims[0].width}x{ims[0].height}', [im.resize((W, round(W * im.height / im.width)), Image.LANCZOS) for im in ims]))
H = sum(LH + r[1][0].height + PAD for r in rows) + LH + PAD
sheet = Image.new('RGB', (2 * W + 3 * PAD, H), (18, 16, 24)); g = ImageDraw.Draw(sheet)
g.text((PAD, 4), 'Kilumen Night FX v1.1   left: before (?nightfx=0)   right: after (moonlight + window/lamp light + night clouds)', fill=(236, 222, 196), font=F)
y = LH + PAD
for label, (a, b) in rows:
    g.text((PAD, y), label, fill=(252, 214, 104), font=F); y += LH
    sheet.paste(a, (PAD, y)); sheet.paste(b, (2 * PAD + W, y)); y += a.height + PAD
sheet.save(f'{D}/contact_sheet.png'); print(f'{D}/contact_sheet.png', sheet.size)
