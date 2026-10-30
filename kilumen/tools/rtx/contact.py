#!/usr/bin/env python3
"""RTX look contact sheet: rows = platform x condition, columns = off / lite / full. Usage: python3 tools/rtx/contact.py shots/rtx_v1"""
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1] if len(sys.argv) > 1 else 'shots/rtx_v1'
for plat in ('pc', 'phone'):
    rows = [c for c in ('day', 'dusk', 'night', 'rain') if os.path.exists(f'{d}/{plat}_{c}_off.png')]
    W = 520; ims = [[Image.open(f'{d}/{plat}_{c}_{m}.png').convert('RGB') for m in ('off', 'lite', 'full')] for c in rows]
    H = int(W * ims[0][0].height / ims[0][0].width)
    sheet = Image.new('RGB', (W * 3 + 40, (H + 24) * len(rows) + 30), (20, 20, 24)); g = ImageDraw.Draw(sheet)
    g.text((10, 8), f'Kilumen RTX look v1 - Brookhollow - {plat}   columns: OFF | LITE | FULL', fill=(255, 255, 255))
    for r, c in enumerate(rows):
        for k, im in enumerate(ims[r]):
            x, y = 10 + k * (W + 10), 30 + r * (H + 24)
            sheet.paste(im.resize((W, H), Image.LANCZOS), (x, y + 16)); g.text((x, y + 2), f'{c} / {("off","lite","full")[k]}', fill=(230, 230, 160))
    sheet.save(f'{d}/contact_{plat}.png'); print(f'{d}/contact_{plat}.png')
