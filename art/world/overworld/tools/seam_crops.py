# 1:1 crops of the 3x previews (192px per tile) for the "no panel lines" check.
import sys, os
from PIL import Image
OUT = os.environ.get('KILUMEN_OW_OUT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))   # (2026-10-23) was hard-coded to live; now the tree this file lives in (override: KILUMEN_OW_OUT)
CROPS = {  # name: (map, x0, y0, x1, y1) in tiles, exclusive end
    'open_grass':  ('brookhollow', 12, 21, 21, 24),
    'sign_fence':  ('brookhollow', 2, 8, 9, 12),
    'lamps_sign':  ('brookhollow', 7, 10, 13, 15),
    'path_edge':   ('route1', 2, 24, 10, 31),
    'path_corner': ('route1', 11, 16, 17, 21),
}
def run(tag, src=None):
    src = src or f'{OUT}/previews'
    os.makedirs(f'{OUT}/qa/seams', exist_ok=True)
    for n, (m, x0, y0, x1, y1) in CROPS.items():
        im = Image.open(f'{src}/{m}.png')
        im.crop((x0 * 192, y0 * 192, x1 * 192, y1 * 192)).save(f'{OUT}/qa/seams/{tag}_{n}.png')
if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
