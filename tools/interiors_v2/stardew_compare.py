"""QA side-by-side (study only, never shipped): cropped Stardew pieces vs our kit pieces at matching on-screen tile size (128 px)."""
import json, os
from PIL import Image, ImageDraw, ImageFont
R = os.path.join(os.path.dirname(__file__), '../..'); OW = R + '/art/world/overworld'
ref = Image.open(R + '/shots/interiors_refs/gary/01M60E50JWASWRQ4CSNE57675A.jpg').convert('RGBA'); T = 37.0  # ref px per tile
cat = {c['key']: c for c in json.load(open('/workspace/quality/dev_notes/kilumen_interiors_kit.json'))}; kit = Image.open(OW + '/tiles_1x/ix2_kit.png').convert('RGBA')
def piece(key):
    c = cat['kit_' + key]; w, h = map(int, c['size'].split('x')); im = Image.new('RGBA', (w * 64, h * 64))
    for k, t in enumerate(c['ids_rowmajor']): i = t - 9001; im.alpha_composite(kit.crop(((i % 16) * 64, (i // 16) * 64, (i % 16) * 64 + 64, (i // 16) * 64 + 64)), ((k % w) * 64, (k // w) * 64))
    return im.resize((im.width * 2, im.height * 2), Image.NEAREST)
rows = [('bookcase', (605, 228, 685, 342), ['bookcase_worn_teal', 'bookcase_normal_teal', 'bookcase_fancy_teal']),
        ('fridge', (337, 104, 416, 192), ['kitchen_fridge_worn_teal', 'kitchen_fridge_normal_teal']),
        ('stove', (260, 110, 301, 192), ['kitchen_stove_worn_teal', 'kitchen_stove_normal_teal']),
        ('chair', (262, 420, 300, 500), ['dining_chair_worn_red_r', 'dining_chair_normal_red_r', 'dining_chair_fancy_red_r'])]
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
cells = []
for name, box, keys in rows:
    s = ref.crop(box); s = s.resize((round(s.width * 128 / T), round(s.height * 128 / T)), Image.NEAREST)
    cells.append([(f'Stardew {name} (ref, study only)', s)] + [(k.replace('_teal', '').replace('_red', ''), piece(k.replace('teal', [c for c in ('teal',) if 'kit_' + k in cat][0]) if 'kit_' + k in cat else k)) for k in keys if 'kit_' + k in cat])
W = max(sum(max(i.width, 230) + 30 for _, i in r) for r in cells) + 40; H = sum(max(i.height for _, i in r) + 60 for r in cells) + 20
out = Image.new('RGBA', (W, H), (40, 34, 38, 255)); d = ImageDraw.Draw(out); y = 20
for r in cells:
    x = 20
    for lab, i in r: d.text((x, y), lab, fill='white', font=f); out.alpha_composite(i, (x, y + 34)); x += max(i.width, 230) + 30
    y += max(i.height for _, i in r) + 60
out.convert('RGB').save(R + '/shots/interiors_v2/stardew_vs_kit.png'); print(out.size)
