#!/usr/bin/env python3
"""Before/after sheet for dialogue v3 (Oct 22, 2026): round-2 'after' (dlg_toast) vs v3 say_toast and ask, per phone size.
Usage: python3 tests/dialog_v3_sheet.py [BEFORE_DIR] ; writes shots/batch3/dialog_v3/contact_sheet.png"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEFORE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/kil_batch3_backup/round3/shots_layout'
AFTER = os.path.join(ROOT, 'shots/batch3/dialog_v3')
SIZES = ['844x390_dpr2', '780x360_dpr3', '800x360_dpr3', '932x430_dpr2', '1024x768_dpr2', '780x330_dpr2']
COLS = [('before: round 2 (dlg + toast)', BEFORE, 'dlg_toast'), ('v3: say + toast', AFTER, 'say_toast'), ('v3: ask (list)', AFTER, 'ask')]
CW, LH = 520, 22
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except OSError: font = ImageFont.load_default()
rows = []
for s in SIZES:
    ims = []
    for _, d, m in COLS:
        p = os.path.join(d, f'mobile_{s}_{m}.png')
        im = Image.open(p).convert('RGB'); im = im.resize((CW, round(im.height * CW / im.width)), Image.LANCZOS); ims.append(im)
    rows.append((s, ims))
H = LH + sum(LH + max(i.height for i in ims) + 8 for _, ims in rows)
sheet = Image.new('RGB', (len(COLS) * (CW + 8) + 8, H), (24, 24, 28)); dr = ImageDraw.Draw(sheet)
for c, (t, _, _) in enumerate(COLS): dr.text((8 + c * (CW + 8), 3), t, fill=(240, 220, 160), font=font)
y = LH
for s, ims in rows:
    dr.text((8, y + 3), 'mobile ' + s, fill=(220, 220, 220), font=font); y += LH
    for c, im in enumerate(ims): sheet.paste(im, (8 + c * (CW + 8), y))
    y += max(i.height for i in ims) + 8
out = os.path.join(AFTER, 'contact_sheet.png'); sheet.save(out); print(out, sheet.size)
