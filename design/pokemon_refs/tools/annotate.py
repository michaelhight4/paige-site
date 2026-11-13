#!/usr/bin/env python3
"""Annotate Pokemon reference maps (STUDY ONLY - never ship these images).
Coordinates are in the preview space (width = view_w) and scaled to the original.
Legend: E plain cave/exit (green) | P exit/ladder to pocket or gated (orange) | S sealed pocket (cyan box)
L one-way ledge (red arrow) | W sealing wall (brown) | I item (yellow star) | T pocket/off-path trainer (magenta)
D dead/filler region (grey hatch)"""
import json, os, glob
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); REF = os.path.dirname(HERE)
try: F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
except Exception: F = None
COL = dict(E=(40, 220, 60), P=(255, 140, 0), S=(0, 230, 255), L=(255, 40, 40), W=(140, 80, 20), I=(255, 230, 0), T=(255, 0, 200), D=(120, 120, 120))
A = json.load(open(os.path.join(HERE, 'annotations.json')))
def font(sz):
    try: return F(sz)
    except Exception: return ImageFont.load_default()
for name, spec in A.items():
    im = Image.open(os.path.join(REF, 'raw', name)).convert('RGBA'); W, H = im.size
    k = W / spec['view_w']  # marks were placed on a preview of width view_w
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    lw = max(2, int(3 * k)); r = max(6, int(9 * k)); fn = font(max(11, int(13 * k)))
    def lab(x, y, t, c):
        if not t: return
        bb = d.textbbox((x, y), t, font=fn)
        if bb[2] > W - 2: x -= bb[2] - W + 4; bb = d.textbbox((x, y), t, font=fn)
        d.rectangle([bb[0] - 2, bb[1] - 1, bb[2] + 2, bb[3] + 1], fill=(0, 0, 0, 190)); d.text((x, y), t, fill=c + (255,), font=fn)
    for a in spec['marks']:
        t = a[0]; c = COL[t]; p = [v * k for v in a[1:] if not isinstance(v, str)]; txt = next((v for v in a[1:] if isinstance(v, str)), '')
        if t in 'SD' and len(p) == 4:
            d.rectangle(p, fill=c + (60 if t == 'S' else 110,), outline=c + (255,), width=lw)
            if t == 'D':
                for xx in range(int(p[0]), int(p[2]), int(12 * k) + 4): d.line([xx, p[1], min(xx + (p[3] - p[1]), p[2]), min(p[3], p[1] + (p[2] - xx))], fill=c + (160,), width=1)
            lab(p[0] + 3, p[1] + 3, txt, c)
        elif t == 'W' and len(p) == 4:
            d.line(p, fill=c + (255,), width=lw * 3); lab((p[0] + p[2]) / 2 + 4, (p[1] + p[3]) / 2, txt, (230, 170, 110))
        elif t in 'EP':
            x, y = p; d.ellipse([x - r * 1.4, y - r * 1.4, x + r * 1.4, y + r * 1.4], outline=c + (255,), width=lw + 1); lab(x + r * 1.6, y - r, txt, c)
        elif t == 'L':
            x, y = p; d.polygon([(x - r, y - r / 2), (x + r, y - r / 2), (x, y + r)], fill=c + (230,)); lab(x + r + 2, y - r, txt, c)
        elif t == 'I':
            x, y = p; d.regular_polygon((x, y, r), 5, fill=c + (240,), outline=(0, 0, 0, 255)); lab(x + r + 2, y - r, txt, c)
        elif t == 'T':
            x, y = p; d.rectangle([x - r, y - r, x + r, y + r], outline=c + (255,), width=lw); lab(x + r + 2, y - r, txt, c)
    out = Image.alpha_composite(im, ov).convert('RGB'); bar = 22 + int(16 * k)
    can = Image.new('RGB', (W, H + bar), (15, 15, 25)); can.paste(out, (0, bar)); ImageDraw.Draw(can).text((6, 3), spec['title'], fill=(255, 255, 255), font=font(int(14 + 10 * k)))
    os.makedirs(os.path.join(REF, 'annotated'), exist_ok=True); can.save(os.path.join(REF, 'annotated', name.rsplit('.', 1)[0] + '_annotated.png'))
    print('ok', name)
