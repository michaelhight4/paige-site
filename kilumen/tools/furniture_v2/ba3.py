"""old | v2 | v3 comparison sheets: python ba3.py <shots_dir> label ..."""
import sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1].rstrip('/') + '/'; f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
for lab in sys.argv[2:]:
    for v in ('pc', 'phone'):
        ims = [Image.open(f'{d}{lab}_{t}_{v}.png').convert('RGB') for t in ('old', 'v2', 'v3')]
        if v == 'phone': ims = [i.resize((i.width // 2, i.height // 2)) for i in ims]
        w, h = ims[0].size; o = Image.new('RGB', (w * 3 + 40, h + 50), (24, 20, 26)); g = ImageDraw.Draw(o)
        for k, (i, t) in enumerate(zip(ims, ('OLD', 'v2 (d3aba69)', 'v3 hybrid'))):
            o.paste(i, (10 + k * (w + 10), 45)); g.text((10 + k * (w + 10), 8), f'{t} {lab} ({v})', fill='white', font=f)
        o.save(f'{d}{lab}_compare_{v}.png')
