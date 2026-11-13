# Pixel-art finishing pass: every tile is drawn at 64px with hard edges, then snapped to the
# Kilumen palette with 4x4 ordered (Bayer) dithering, binary alpha and a 1px selective outline.
import numpy as np
from PIL import Image
RAMPS = {   # dark -> light; bright, warm, violet accent
 'ink':    [(26, 18, 38), (52, 40, 66)],
 'violet': [(58, 30, 96), (96, 48, 150), (138, 74, 206), (176, 118, 236), (214, 172, 255), (244, 226, 255)],
 'grass':  [(36, 82, 46), (54, 118, 52), (82, 152, 58), (120, 186, 72), (166, 212, 96)],
 'forest': [(24, 56, 44), (36, 78, 52), (56, 104, 62), (84, 134, 78)],
 'earth':  [(70, 44, 34), (106, 68, 46), (146, 98, 62), (186, 136, 86), (222, 180, 120)],
 'sand':   [(204, 170, 110), (232, 206, 146), (248, 234, 190)],
 'stone':  [(62, 58, 72), (94, 88, 102), (130, 122, 132), (168, 160, 164), (204, 198, 194)],
 'cream':  [(236, 222, 196), (252, 246, 232)],
 'water':  [(30, 64, 120), (44, 100, 168), (70, 146, 206), (122, 194, 232), (198, 236, 250)],
 'teal':   [(36, 110, 108), (62, 156, 146), (112, 202, 184)],
 'red':    [(110, 34, 42), (162, 52, 50), (208, 84, 64), (240, 136, 104)],
 'orange': [(196, 110, 46), (238, 162, 60), (252, 214, 104)],
 'blue':   [(48, 72, 140), (74, 112, 186)],
 'pink':   [(210, 96, 140), (246, 160, 186)],
}
import os
_HEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'palette.hex')
# Shared Kilumen palette (64 colours, palette.hex). RAMPS above is kept only as a design reference of the old 59-colour set.
PAL = np.array([tuple(int(l.strip()[i:i + 2], 16) for i in (0, 2, 4)) for l in open(_HEX) if l.strip()], float)
SHADOW = (26, 18, 38, 96)
B4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0

def palette_png(path, scale=24):
    n = len(PAL); cols = 8; rows = (n + cols - 1) // cols
    im = Image.new('RGB', (cols * scale, rows * scale), (0, 0, 0)); px = im.load()
    for i, c in enumerate(PAL.astype(int)):
        for y in range(scale):
            for x in range(scale): px[(i % cols) * scale + x, (i // cols) * scale + y] = tuple(c)
    im.save(path)

def _nearest(rgb):
    # perceptual-ish weighted distance
    w = np.array([0.30, 0.59, 0.11]) * 3
    d = (((rgb[..., None, :] - PAL[None, None]) ** 2) * w).sum(-1)
    return PAL[d.argmin(-1)]

def pixelize(im, outline=False, dither=10):
    a = np.asarray(im.convert('RGBA'), float); h, w = a.shape[:2]
    th = np.tile(B4, (h // 4 + 1, w // 4 + 1))[:h, :w]
    rgb = a[..., :3] + (th[..., None] - 0.5) * dither * 2
    q = _nearest(rgb)
    al = a[..., 3] / 255.0; lum = a[..., :3] @ np.array([0.3, 0.59, 0.11])
    out = np.zeros((h, w, 4)); out[..., :3] = q; out[..., 3] = 255
    shadow = (al > 0.04) & (al < 0.75) & (lum < 70)
    keep = (al >= 0.75) | (~shadow & (al > th))
    out[~keep] = 0; out[shadow] = SHADOW
    if outline:
        solid = out[..., 3] == 255
        pad = np.pad(solid | (out[..., 3] > 0) & False, 1, constant_values=False)
        op = np.pad(out[..., 3] == 255, 1, mode='edge')   # outside-image counts as solid (no seam outlines)
        nb_empty = ~op[:-2, 1:-1] | ~op[2:, 1:-1] | ~op[1:-1, :-2] | ~op[1:-1, 2:]
        edge = solid & nb_empty
        dark = _nearest(out[..., :3] * 0.55)
        out[edge, :3] = dark[edge]
    return Image.fromarray(out.astype('uint8'), 'RGBA')
