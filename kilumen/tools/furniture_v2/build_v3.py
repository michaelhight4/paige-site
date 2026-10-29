"""Build *_v3.png sheets: copy *_v2, paste redrawn kit pieces at the same indices (ids unchanged), plus 2x/3x and normals."""
import sys, os, json; sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from registry import REG  # {sheet_rel_1x: {index: Image(32x32 logical)}}
OW = os.path.join(os.path.dirname(__file__), '../../art/world/overworld')
def v(p, s, n): return os.path.join(OW, p.replace('tiles_1x', f'tiles_{n}x').replace('.png', f'_{s}.png'))
for sheet, cells in REG.items():
    for n in (1, 2, 3):
        im = Image.open(v(sheet, 'v2', n)).convert('RGBA'); C = 64*n
        for idx, art in cells.items():
            x, y = idx % 16 * C, idx // 16 * C
            im.paste((0, 0, 0, 0), (x, y, x+C, y+C)); im.alpha_composite(art.resize((C, C), Image.NEAREST), (x, y))
        im.save(v(sheet, 'v3', n), optimize=True)
    if sheet == 'tiles_1x/interior.png':
        nm = Image.open(os.path.join(OW, 'tiles_1x/interior_v2_n.png')).convert('RGBA')
        for idx, art in cells.items():
            x, y = idx % 16 * 64, idx // 16 * 64; a = art.resize((64, 64), Image.NEAREST).split()[3]
            flat = Image.new('RGBA', (64, 64), (128, 128, 255, 255)); flat.putalpha(a)
            nm.paste((0, 0, 0, 0), (x, y, x+64, y+64)); nm.paste(flat, (x, y))
        nm.save(os.path.join(OW, 'tiles_1x/interior_v3_n.png'), optimize=True)
print('built', {k: len(v) for k, v in REG.items()})
