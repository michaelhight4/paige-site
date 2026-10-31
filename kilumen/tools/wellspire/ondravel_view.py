#!/usr/bin/env python3
"""Ondravel View still (Coder, Oct 30 2026; Gary: click View on the summit -> a full-screen still of giant Ondravel, the text
rolls over it, then fight 1). Pixel art at ONE scale: every layer is painted at 1 base px = 1 sprite px, his ACTUAL in-game
sprite (art/characters/pixel/creatures/ondravel/overworld/ondravel_ow_sheet.png, down stand frame, crop (14,8,49,62) of cell
(0,0)) pasted 1:1, never resampled. The game scales the whole stack nearest-neighbour (summit_view.js).
Layers (base 176x70; PC 1280x800 shows the centre 112x70, phone 844x390 the centre ~151x70): bg (sky bands, sun, fiery
streaks, far peaks, back cloud sea, the giant + rim light), front (billowing cumulus round his legs, 200 wide for drift),
ledge (dark rock in front). Usage (from kilumen/): python3 tools/wellspire/ondravel_view.py
"""
import json, math, os, random
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'art/fx/wellspire/ondravel_view'); os.makedirs(OUT, exist_ok=True)
SHEET = 'art/characters/pixel/creatures/ondravel/overworld/ondravel_ow_sheet.png'; CROP = (14, 8, 49, 62)
W, H, PAD, HZ, SAFE = 176, 70, 4, 46, 112  # base size, front-layer drift pad, horizon row
CX = W // 2
rng = random.Random(7)
hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def dpick(pal, v, x, y, seam=0.22):  # v 0..1 across a palette: flat clusters, a narrow checker seam between neighbours
    f = max(0.0, min(0.9999, v)) * (len(pal) - 1); i = int(f); fr = f - i
    if fr < 0.5 - seam: return pal[i]
    if fr > 0.5 + seam: return pal[min(len(pal) - 1, i + 1)]
    return pal[min(len(pal) - 1, i + ((x + y) & 1))]

# ---- sky: hard bands with 2-row dithered seams, dark violet top -> gold at the horizon
SKY = [hexc(c) for c in ['#24102f', '#341338', '#4a1840', '#661d44', '#862542', '#a8303d', '#c84434', '#e05f2c', '#f07e2e', '#f9a03a', '#fdc252', '#ffe08a']]
bg = Image.new('RGBA', (W, H)); px = bg.load()
for y in range(H):
    t = min(1.0, y / HZ) ** 0.85
    for x in range(W): px[x, y] = dpick(SKY, t, x, y, 0.12)
# sun on the horizon behind him: disc + stepped halo rings (each ring = one colour, dithered edge)
SUN = [hexc('#fff8dc'), hexc('#ffeaa0'), hexc('#ffd277'), hexc('#ffb556')]
sx, sy = CX, HZ - 3
for y in range(H):
    for x in range(W):
        d = math.hypot((x - sx) * 0.85, y - sy)
        for k, r in enumerate([6, 10, 15, 22]):
            edge = d - r
            if edge < 0 or (edge < 1.2 and BAYER[y & 3][x & 3] < 6):
                if k == 3 and y < sy - 16: break
                px[x, y] = SUN[k]; break

# ---- fiery stratus streaks: dark crimson bodies, sun-lit undersides (ref: gary_reference.webp)
def streak(x0, y0, ln, th, seed):
    r = random.Random(seed); top = [y0 - int(th * (0.5 + 0.5 * math.sin(i * 0.35 + seed) + r.random() * 0.4)) for i in range(ln)]
    lit = 1 - min(1, abs(y0 - HZ) / HZ)
    body, rim, hot = hexc('#4e1a3c') if y0 < 20 else hexc('#7a2440'), hexc('#ff8a3a'), hexc('#ffd07a')
    for i in range(ln):
        x = x0 + i
        if not 0 <= x < W: continue
        taper = min(i, ln - 1 - i)
        if taper < 2 and r.random() < 0.5: continue
        t, b = top[i], y0 + (1 if taper > 3 else 0)
        for y in range(max(0, t), min(H, b + 1)): px[x, y] = body
        if 0 <= b + 1 < H: px[x, b + 1] = rim if (lit < 0.6 or i % 5) else hot
        if lit > 0.55 and 0 <= b + 2 < H and r.random() < 0.35: px[x, b + 2] = hot
        if 0 <= t < H and r.random() < 0.3: px[x, t] = hexc('#a83a3a')
for i, (x0, y0, ln, th) in enumerate([(-6, 5, 70, 3), (60, 3, 50, 2), (120, 6, 80, 3), (14, 14, 56, 2), (110, 15, 60, 2), (-4, 24, 44, 2),
                                      (150, 25, 48, 2), (36, 31, 34, 1), (128, 33, 40, 1), (4, 38, 30, 1), (166, 39, 30, 1), (70, 20, 24, 1)]):
    streak(x0, y0, ln, th, i * 13 + 1)

# ---- far snowy peaks either side of him, on the horizon
for side, base, seed in []:  # peaks dropped (Oct 30 2026 review): only lone tips poked through the cloud sea and read as blobs
    r = random.Random(seed); far = base == HZ + 3
    rock, snow, shade = (hexc('#6e3a62'), hexc('#ffc8b0'), hexc('#a85a7a')) if far else (hexc('#4c2448'), hexc('#f0a090'), hexc('#7c3a5c'))
    peaks = [(CX + side * (30 + r.randint(0, 60)), r.randint(7, 14) if far else r.randint(5, 10)) for _ in range(4)]
    for x in range(W):
        if side * (x - CX) < 18: continue
        hgt = max([ph - abs(x - pxx) * 0.8 for pxx, ph in peaks] + [0])
        top = int(base - hgt)
        for y in range(top, base + 1): px[x, y] = rock
        for y in range(top, min(base, top + max(1, int(hgt * 0.35)))):
            lit_face = any(x <= pxx and x > pxx - ph for pxx, ph in peaks)  # sunlit face looks toward him
            px[x, y] = snow if (lit_face == (side > 0)) else shade

# ---- cumulus: union of puffs, each puff shaded by its own normal (lit from above / the sun), back-to-front
CL = [hexc(c) for c in ['#341634', '#542443', '#7e3352', '#aa4558', '#d6635a', '#f48c5e', '#ffbb76', '#ffe6ac']]
def cumulus(img, puffs, warm=1.0, ox=0):
    """pass 1: which puff owns each pixel (back-to-front, so the front puff wins); pass 2: shade = the puff's own roundness
    (lit top, rim) mixed with how deep the pixel sits under the bank's top edge (so the mass reads as one billowing cloud)."""
    p = img.load(); w, h = img.size; own = {}
    for k, (cx, cy, r) in enumerate(sorted(puffs, key=lambda q: q[1] - q[2] * 0.2)):
        cx += ox
        for y in range(int(cy - r) - 1, int(cy + r * 0.75) + 2):
            for x in range(int(cx - r * 1.25) - 1, int(cx + r * 1.25) + 2):
                if not (0 <= x < w and 0 <= y < h): continue
                dx, dy = (x + 0.5 - cx) / (r * 1.2), (y + 0.5 - cy) / r
                if dy > 0.72 or dx * dx + dy * dy > 1: continue
                own[(x, y)] = (dx, dy, k)
    top = {}
    for (x, y) in own: top[x] = min(top.get(x, h), y)
    for (x, y), (dx, dy, k) in own.items():
        d = dx * dx + dy * dy; depth = min(1.0, (y - top[x]) / 16)
        sunside = (1 if (x - ox) < CX else -1) * dx * -1  # the side facing him / the sun
        v = 0.42 * (-dy) + 0.15 * math.sqrt(max(0, 1 - d)) + 0.12 * sunside + 0.62 * (1 - depth) + 0.1 * warm
        v = 0.12 + v * 0.72
        if d > 0.78 and dy < -0.2: v += 0.14  # bright rim on each billow's top
        if dy > 0.5 and depth > 0.25: v -= 0.12  # soft under-shadow between billows
        nb = own.get((x, y - 1))
        if nb and nb[2] != k and nb[1] > 0.3 and depth > 0.1: v -= 0.1  # crease under the billow above
        p[x, y] = dpick(CL, v, x, y, 0.08)
    return img

def bank(y0, y1, n, rmin, rmax, x0, x1, seed, avoid=None):
    r = random.Random(seed); out = []
    for i in range(n):
        x = x0 + (x1 - x0) * (i + r.random() * 0.8) / n; y = r.uniform(y0, y1); rr = r.uniform(rmin, rmax)
        if avoid and abs(x - avoid[0]) < avoid[1] and y < avoid[2]: x += avoid[1] * (1 if x > avoid[0] else -1)
        out.append((x, y, rr))
    return out
# back cloud sea at the horizon (behind him)
cumulus(bg, bank(HZ - 1, HZ + 3, 16, 3, 6, -8, W + 8, 3) + [(CX - 46, HZ - 4, 9), (CX + 50, HZ - 5, 10), (CX - 70, HZ - 1, 8), (CX + 74, HZ - 2, 8)] + bank(HZ + 3, HZ + 8, 14, 5, 9, -10, W + 10, 5), warm=0.4)

# ---- the giant: his sprite 1:1, warm rim light one px outside his silhouette (sun behind him)
sheet = Image.open(os.path.join(ROOT, SHEET)).convert('RGBA'); spr = sheet.crop(CROP)
GX, GY = CX - spr.width // 2, 3
sp = spr.load(); RIM, RIM2 = hexc('#ffe9a8'), hexc('#ffb860')
inside = lambda x, y: 0 <= x < spr.width and 0 <= y < spr.height and sp[x, y][3] > 128
for y in range(-1, spr.height + 1):
    for x in range(-1, spr.width + 1):
        if inside(x, y): continue
        n = [inside(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))]
        if any(n): px[GX + x, GY + y] = RIM if (GY + y) > 20 else RIM2
bg.alpha_composite(spr, (GX, GY))

# ---- front cumulus: big billows swallowing his legs (from mid-shin down), full width + drift pad
front = Image.new('RGBA', (W + PAD * 2, H))
fp = ([(CX - 36, 44, 10), (CX - 44, 50, 12), (CX + 38, 43, 11), (CX + 47, 50, 12), (CX - 62, 52, 11), (CX + 66, 53, 12)]
      + [(CX - 14, 55, 8), (CX + 14, 54, 8.5), (CX - 1, 58, 9), (CX - 26, 56, 10), (CX + 27, 56, 10)]
      + bank(57, 63, 12, 8, 12, -8, W + 8, 23))
cumulus(front, fp, warm=1.0, ox=PAD)
# low wisps drifting across his shins
cumulus(front, [(CX - 10, 52, 4), (CX + 10, 51, 4.5), (CX - 20, 51, 5), (CX + 21, 50, 5)], warm=1.0, ox=PAD)

# ---- the ledge: dark jagged rock in front, sun-lit rim
ledge = Image.new('RGBA', (W, H)); lp = ledge.load(); r = random.Random(31)
ROCK = [hexc(c) for c in ['#140a12', '#1e1019', '#2a1621', '#3a1e2a']]; LIT = [hexc('#7a2c2a'), hexc('#c4502e'), hexc('#f08038')]
prof = []; step = 0
for x in range(W):
    u = (x - CX * 0.9) / (W * 0.5)
    if x % 3 == 0: step = r.choice([0, 0, 1, -1, 2])
    prof.append(min(66, int(60 + 10 * u * u + 1.5 * math.sin(x * 0.21) + step)))
for x in range(W):
    for y in range(max(0, prof[x]), H):
        dpt = y - prof[x]
        if dpt == 0: c = LIT[2] if (x // 4) % 3 == 0 else LIT[1]
        elif dpt == 1: c = LIT[0]
        else: c = ROCK[3] if dpt < 4 else ROCK[2] if dpt < 7 else ROCK[1] if dpt < 10 else ROCK[0]
        lp[x, y] = c
    if x > 2 and abs(prof[x] - prof[x - 1]) > 1:  # facets
        for y in range(min(prof[x], prof[x - 1]), min(H, prof[x] + 6)):
            if prof[x] < prof[x - 1] and y > prof[x] + 1: lp[x, y] = ROCK[3]  # lit facet edge

for n, im in (('view_bg', bg), ('view_front', front), ('view_ledge', ledge)): im.save(os.path.join(OUT, n + '.png'))
meta = {'base_w': W, 'base_h': H, 'pad': PAD, 'giant': {'x': GX, 'y': GY, 'w': spr.width, 'h': spr.height},
        'sprite': SHEET, 'safe_w': SAFE, 'crop': list(CROP), 'drift_px': 3, 'drift_s': 24, 'fill': '#24102f',
        'note': 'One pixel scale: 1 base px = 1 sprite px; drawn nearest-neighbour at min(H/70, W/112). Coder, Oct 30 2026.'}
json.dump(meta, open(os.path.join(OUT, 'ondravel_view.json'), 'w'), indent=1)
# review composites (10x, nearest): the PC frame and the full wide stack
full = bg.copy(); full.alpha_composite(front.crop((PAD, 0, PAD + W, H))); full.alpha_composite(ledge)
full.resize((W * 10, H * 10), Image.NEAREST).save(os.path.join(OUT, 'preview_wide_1920x800.png'))
full.crop(((W - SAFE) // 2, 0, (W + SAFE) // 2, H)).resize((1280, 800), Image.NEAREST).save(os.path.join(OUT, 'preview_pc_1280x800.png'))
print('ok', spr.size, (GX, GY))
