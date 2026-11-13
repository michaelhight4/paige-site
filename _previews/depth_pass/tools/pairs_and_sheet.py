# Depth pass previews (Oct 22, 2026): side-by-side pairs (left ?depth=0, right ?depth=1) + contact sheet + 3x zoom crops.
# Usage: python3 _previews/depth_pass/tools/pairs_and_sheet.py   (after depth_shots.mjs)
import os
from PIL import Image, ImageDraw
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TAGS = ['heal_brookhollow', 'lab_brookhollow', 'home_brookhollow_b', 'rt_branch_backroom', 'brookhollow_day', 'brookhollow_night']
def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 8 * len(text) + 12, 22), fill=(0, 0, 0)); d.text((6, 5), text, fill=(255, 255, 255))
pairs = []
for dev in ['pc', 'mobile']:
    for t in TAGS:
        a = Image.open(f'{D}/{t}_{dev}_depth0.png').convert('RGB'); b = Image.open(f'{D}/{t}_{dev}_depth1.png').convert('RGB')
        w, h = a.size; s = Image.new('RGB', (w * 2 + 12, h), (255, 0, 255)); s.paste(a, (0, 0)); s.paste(b, (w + 12, 0))
        label(s, f'{t} {dev}  depth=0'); d = ImageDraw.Draw(s); d.rectangle((w + 12, 0, w + 12 + 90, 22), fill=(0, 0, 0)); d.text((w + 18, 5), 'depth=1', fill=(255, 255, 255))
        p = f'{D}/pair_{t}_{dev}.png'; s.save(p); pairs.append((f'{t} {dev}', s))
# contact sheet: 2 columns of pairs, each scaled to 1200 px wide
W = 1200; cells = [(n, s.resize((W, round(s.height * W / s.width)), Image.LANCZOS)) for n, s in pairs]
cols = 2; rows = (len(cells) + cols - 1) // cols; rh = max(c.height for _, c in cells) + 8
sheet = Image.new('RGB', (cols * (W + 8), rows * rh), (24, 24, 28))
for i, (n, c) in enumerate(cells): sheet.paste(c, ((i % cols) * (W + 8), (i // cols) * rh))
sheet.save(f'{D}/contact_sheet.png')
# 3x nearest zoom crops (top = depth=0, bottom = depth=1) of the details that matter
CROPS = {
    'zoom_heal_sofa_wallbase': ('heal_brookhollow_pc', (100, 120, 560, 300)),
    'zoom_lab_displays_actors': ('lab_brookhollow_pc', (820, 470, 1180, 620)),
    'zoom_brookhollow_house_day': ('brookhollow_day_pc', (300, 900, 1000, 1080)),
}
for name, (t, box) in CROPS.items():
    a = Image.open(f'{D}/{t}_depth0.png').convert('RGB').crop(box); b = Image.open(f'{D}/{t}_depth1.png').convert('RGB').crop(box)
    w, h = a.size; s = Image.new('RGB', (w, h * 2 + 4), (255, 0, 255)); s.paste(a, (0, 0)); s.paste(b, (0, h + 4))
    s.resize((w * 3, (h * 2 + 4) * 3), Image.NEAREST).save(f'{D}/{name}.png')
print('ok', len(pairs), 'pairs')
