"""python contact4.py <shots_dir> label ... -> contact_sheet.png (PC | phone per room, in the given order)"""
import sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1].rstrip('/') + '/'; labs = sys.argv[2:]; f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
W, PH, cols = 640, 400, 2; tiles = []
for l in labs:
    pc = Image.open(f'{d}{l}_pc.png').convert('RGB').resize((W, PH)); ph = Image.open(f'{d}{l}_phone.png').convert('RGB'); ph = ph.resize((W, W * ph.height // ph.width))
    t = Image.new('RGB', (W * 2 + 10, max(PH, ph.height) + 30), (24, 20, 26)); t.paste(pc, (0, 30)); t.paste(ph, (W + 10, 30))
    ImageDraw.Draw(t).text((4, 4), f'{l}  (PC | phone)', fill='white', font=f); tiles.append(t)
tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
o = Image.new('RGB', (cols * (tw + 16), rows * (th + 16)), (10, 8, 12))
for i, t in enumerate(tiles): o.paste(t, (i % cols * (tw + 16), i // cols * (th + 16)))
o.save(d + 'contact_sheet.png'); print(d + 'contact_sheet.png', o.size)
