"""Preview kit pieces: python3 kit_preview.py OUT.png [cond] [scale]"""
import json, sys, os
from PIL import Image, ImageDraw
OW = os.path.join(os.path.dirname(__file__), '../../art/world/overworld')
cat = json.load(open('/workspace/quality/dev_notes/kilumen_interiors_kit.json')); sh = Image.open(OW + '/tiles_1x/ix2_kit.png')
cond = sys.argv[2] if len(sys.argv) > 2 else 'worn'; S = int(sys.argv[3]) if len(sys.argv) > 3 else 2
items = [c for c in cat if (cond == 'all' or c['condition'] == cond) and c['facing'] in (None, 'r')]
x = y = 0; rowh = 0; W = 1400; placed = []
for c in items:
    w, hh = map(int, c['size'].split('x')); pw, ph = w * 64 + 8, hh * 64 + 20
    if x + pw > W: x = 0; y += rowh; rowh = 0
    placed.append((c, x, y)); x += pw; rowh = max(rowh, ph)
im = Image.new('RGBA', (W, y + rowh), (58, 48, 46, 255)); d = ImageDraw.Draw(im)
for c, x, y in placed:
    w, hh = map(int, c['size'].split('x'))
    for k, tid in enumerate(c['ids_rowmajor']):
        i = tid - 9001; cell = sh.crop(((i % 16) * 64, (i // 16) * 64, (i % 16) * 64 + 64, (i // 16) * 64 + 64))
        im.alpha_composite(cell, (x + (k % w) * 64, y + 14 + (k // w) * 64))
    d.text((x, y), c['key'].replace('kit_', '')[:22], fill=(255, 255, 255))
im = im.resize((im.width * S, im.height * S), Image.NEAREST); im.save(sys.argv[1])
