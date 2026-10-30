#!/usr/bin/env python3
"""Ondravel big overworld sprite (Coder, Oct 29 2026, DRAFT for Gary). Built from Character models' approved battle art
(art/characters/pixel/creatures/ondravel/battle/ondravel_front_128_2x.png: the blue river stag, antlers, frost mane), so the
open-world Guardian matches the battle sprite pixel for pixel. 256x256 native px = 4x4 tiles. Rows (6 frames each, 150 ms):
  0 sealed: inside the 50-year crystal (violet facets over him, dim forehead crystal, slow breath)
  1 awake : breath + mane sway + pulsing forehead crystal + violet motes
  2 flare : the face-off roar (head up 2 art px, bright violet/white aura, crystal flash)
Writes art/characters/pixel/creatures/ondravel/overworld/ondravel_big_sheet.png (1536x768). Deterministic."""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(ROOT, 'art/characters/pixel/creatures/ondravel')
src = Image.open(os.path.join(D, 'battle/ondravel_front_128_2x.png')).convert('RGBA')  # 256x256, 2x pixel art
S, N = 256, 6
alpha = src.split()[3]
bb = alpha.getbbox()
# forehead crystal: brightest-blue cluster in the upper head (fixed point on the art, measured once)
HEAD = (int(bb[0] + (bb[2] - bb[0]) * 0.36), int(bb[1] + (bb[3] - bb[1]) * 0.36))

def snap(im):  # keep the 2x pixel grid: down to 1x, back up nearest
    return im.resize((S // 2, S // 2), Image.NEAREST).resize((S, S), Image.NEAREST)

def breathe(t, amp):  # squash the body about the feet by whole art px
    dy = round(amp * (0.5 - 0.5 * math.cos(2 * math.pi * t)))
    if not dy: return src.copy()
    h = bb[3] - bb[1]; body = src.crop((0, bb[1], S, bb[3])).resize((S, h - dy * 2), Image.NEAREST)
    out = Image.new('RGBA', (S, S)); out.paste(body, (0, bb[1] + dy * 2), body); return out

def glow(color, r, a):
    g = Image.new('RGBA', (S, S)); m = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(r))
    g.putalpha(m.point(lambda v: int(v * a))); c = Image.new('RGBA', (S, S), color); c.putalpha(g.split()[3]); return c

def crystal_dot(im, t, base, peak):
    d = ImageDraw.Draw(im); k = 0.5 - 0.5 * math.cos(2 * math.pi * t); a = int(base + (peak - base) * k)
    x, y = HEAD; d.rectangle([x - 4, y - 6, x + 3, y + 5], fill=(186, 120, 255, a)); d.rectangle([x - 2, y - 4, x + 1, y + 1], fill=(244, 230, 255, a))

def motes(im, t, n, seed, col):
    r = random.Random(seed); d = ImageDraw.Draw(im)
    for i in range(n):
        x0 = r.randint(bb[0], bb[2]); y0 = r.randint(bb[1] + 20, bb[3]); ph = r.random()
        y = y0 - int(((t + ph) % 1) * 40); a = int(255 * math.sin(math.pi * ((t + ph) % 1)))
        x = (x0 // 2) * 2; y = (y // 2) * 2; d.rectangle([x, y, x + 1, y + 1], fill=col + (a,))

def facets(im, t):  # translucent crystal over him (sealed row)
    ov = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(ov); r = random.Random(7)
    for i in range(14):
        cx = r.randint(bb[0], bb[2]); cy = r.randint(bb[1], bb[3]); w = r.randint(14, 34); h = r.randint(28, 70)
        d.polygon([(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)], fill=(150, 96, 240, 70), outline=(214, 186, 255, 150))
    sweep = int((t * 1.6 % 1) * (S + 80)) - 40
    d.line([(sweep, 0), (sweep - 60, S)], fill=(255, 255, 255, 90), width=6)
    ov.putalpha(ImageChops.multiply(ov.split()[3], alpha.filter(ImageFilter.MaxFilter(11))))
    im.alpha_composite(ov)

sheet = Image.new('RGBA', (S * N, S * 3))
for i in range(N):
    t = i / N
    # 0 sealed
    f = Image.new('RGBA', (S, S)); f.alpha_composite(glow((140, 80, 255, 255), 6, 0.35))
    b = breathe(t, 1); b = Image.blend(b, Image.new('RGBA', (S, S), (120, 90, 200, 255)), 0.18); b.putalpha(breathe(t, 1).split()[3])
    f.alpha_composite(b); crystal_dot(f, t, 60, 120); facets(f, t); sheet.alpha_composite(snap(f), (i * S, 0))
    # 1 awake
    f = Image.new('RGBA', (S, S)); f.alpha_composite(glow((130, 90, 255, 255), 8, 0.30 + 0.25 * math.sin(math.pi * t)))
    f.alpha_composite(breathe(t, 2)); crystal_dot(f, t, 120, 255); motes(f, t, 10, 3, (200, 170, 255)); sheet.alpha_composite(snap(f), (i * S, S))
    # 2 flare
    f = Image.new('RGBA', (S, S)); k = math.sin(math.pi * t)
    f.alpha_composite(glow((190, 140, 255, 255), 12, 0.55 + 0.45 * k)); f.alpha_composite(glow((255, 255, 255, 255), 5, 0.35 * k))
    up = breathe(0.5, 2); lift = Image.new('RGBA', (S, S)); lift.paste(up, (0, -2 - 2 * round(k)), up); f.alpha_composite(lift)
    crystal_dot(f, 0.5, 255, 255); motes(f, t, 22, 5, (240, 220, 255)); sheet.alpha_composite(snap(f), (i * S, 2 * S))
out = os.path.join(D, 'overworld/ondravel_big_sheet.png'); sheet.save(out, optimize=True)
prev = Image.new('RGBA', (S * N, S * 3), (40, 30, 70, 255)); prev.alpha_composite(sheet); prev.convert('RGB').save('/tmp/ondravel_big_preview.png')
print(out, sheet.size, 'head', HEAD, 'bbox', bb)
