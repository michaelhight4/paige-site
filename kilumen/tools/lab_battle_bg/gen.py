#!/usr/bin/env python3
"""Lab battle backdrop (Oct 30 2026): pixel art drawn in code at 320x180, nearest-neighbour scaled to the painted-biome format
(4 phase stills 2560x1440 webp + a 16-frame x 120 ms 1280x720 animated life layer) under art/world/battle_biomes/lab/.
Run: python3 tools/lab_battle_bg/gen.py   (from kilumen/)"""
import math, random, json, os
from PIL import Image, ImageDraw
W, H = 320, 180
OUT = os.path.join(os.path.dirname(__file__), '../../art/world/battle_biomes/lab')
HZ = 112                       # wall / floor line
NEAR = (0.30, 0.80); FAR = (0.72, 0.665)   # pad centres (frame fractions) = creature feet spots
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def hx(s): s = s.lstrip('#'); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
def mix(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
TANKS = [(14, 42, 30), (56, 82, 34), (236, 262, 30)]   # x0, x1, top y (base on the counter)
def base():
    im = Image.new('RGB', (W, H)); px = im.load(); d = ImageDraw.Draw(im)
    wallT, wallB = hx('#16202f'), hx('#24364c')
    for y in range(HZ):
        for x in range(W):
            t = y / HZ + (BAYER[y % 4][x % 4] / 16 - .5) * .06
            px[x, y] = mix(wallT, wallB, max(0, min(1, t)))
    # ceiling band + light strips
    d.rectangle([0, 0, W, 11], fill=hx('#0e141e')); d.line([0, 12, W, 12], fill=hx('#2e4560'))
    for x0 in (30, 130, 230):
        d.rectangle([x0, 4, x0 + 60, 6], fill=hx('#bff4ff')); d.line([x0 - 1, 7, x0 + 61, 7], fill=hx('#5fa9c4'))
    # wall panels: seams + trim
    for x in range(0, W, 32):
        d.line([x, 13, x, HZ - 1], fill=hx('#111a27')); d.line([x + 1, 13, x + 1, HZ - 1], fill=hx('#2c4058'))
    d.rectangle([0, 74, W, 76], fill=hx('#1a2636')); d.line([0, 74, W, 74], fill=hx('#3a5574'))
    for x in range(4, W, 32): d.rectangle([x + 10, 60, x + 18, 64], fill=hx('#1c2a3c'))  # vents
    # pipes along the top + down the wall
    for y, c in ((16, '#3d5168'), (21, '#2f4054')):
        d.rectangle([0, y, W, y + 3], fill=hx(c)); d.line([0, y, W, y], fill=hx('#6c86a2')); d.line([0, y + 3, W, y + 3], fill=hx('#141d29'))
        for x in range(8, W, 44): d.rectangle([x, y - 1, x + 2, y + 4], fill=hx('#56708c'))
    for x in (100, 214, 304):
        d.rectangle([x, 24, x + 3, HZ - 2], fill=hx('#33465c')); d.line([x, 24, x, HZ - 2], fill=hx('#5d7894')); d.line([x + 3, 24, x + 3, HZ - 2], fill=hx('#141d29'))
        d.rectangle([x - 1, 50, x + 4, 52], fill=hx('#6a849e'))
    # hanging cables
    for (a, b, sag, c) in ((44, 100, 16, '#0b1018'), (190, 236, 12, '#0b1018'), (262, 304, 10, '#3a1e2c'), (120, 170, 8, '#13283a')):
        for x in range(a, b + 1):
            t = (x - a) / (b - a); y = 25 + sag * 4 * t * (1 - t); d.point((x, round(y)), fill=hx(c)); d.point((x, round(y) + 1), fill=hx(c))
    # counter along the back wall
    d.rectangle([0, 98, W, HZ - 1], fill=hx('#2a3a4e')); d.line([0, 98, W, 98], fill=hx('#7b95b0')); d.line([0, 99, W, 99], fill=hx('#4c6580'))
    for x in range(6, W, 24): d.rectangle([x, 103, x + 14, 108], fill=hx('#1d2a3a')); d.point((x + 12, 105), fill=hx('#7fd8ff'))
    # specimen tanks
    for (x0, x1, top) in TANKS:
        cx = (x0 + x1) / 2
        d.rectangle([x0 - 2, top - 6, x1 + 2, top], fill=hx('#3e5268')); d.line([x0 - 2, top - 6, x1 + 2, top - 6], fill=hx('#8aa5c0'))
        d.rectangle([x0 + 6, top - 12, x1 - 6, top - 7], fill=hx('#2b3a4c'))
        for y in range(top + 1, 92):
            for x in range(x0, x1 + 1):
                e = abs(x - cx) / ((x1 - x0) / 2); t = (y - top) / (92 - top)
                c = mix(hx('#5ff0d0'), hx('#127a78'), min(1, e * .9 + t * .35))
                if (y + BAYER[y % 4][x % 4] // 4) % 9 == 0: c = mix(c, hx('#0c5a5c'), .25)
                px[x, y] = c
        # creature silhouette floating in the tank
        sx, sy = cx, top + 30
        d.ellipse([sx - 7, sy - 9, sx + 7, sy + 7], fill=hx('#0d4b4d')); d.ellipse([sx - 4, sy - 15, sx + 4, sy - 7], fill=hx('#0d4b4d'))
        d.point((sx - 2, sy - 12), fill=hx('#c9fff2')); d.line([sx - 2, sy + 7, sx - 4, sy + 13], fill=hx('#0d4b4d')); d.line([sx + 2, sy + 7, sx + 4, sy + 13], fill=hx('#0d4b4d'))
        d.line([x0 + 3, top + 3, x0 + 3, 88], fill=hx('#c4fff4')); d.line([x0 + 5, top + 5, x0 + 5, 40 + top], fill=hx('#9ff8e6'))  # glass shine
        d.line([x0 - 1, top, x0 - 1, 92], fill=hx('#2a4a58')); d.line([x1 + 1, top, x1 + 1, 92], fill=hx('#2a4a58'))
        d.rectangle([x0 - 3, 92, x1 + 3, 98], fill=hx('#3e5268')); d.line([x0 - 3, 92, x1 + 3, 92], fill=hx('#8aa5c0'))
        d.point((x0 + 2, 95), fill=hx('#5ff0d0')); d.point((x0 + 5, 95), fill=hx('#ff7b6b'))
        d.line([cx, top - 12, cx, 13], fill=hx('#2b3a4c')); d.line([cx + 1, top - 12, cx + 1, 13], fill=hx('#1a2533'))
    # monitor wall
    def screen(x0, y0, x1, y1, kind):
        d.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill=hx('#0b1119')); d.rectangle([x0 - 2, y0 - 2, x1 + 2, y0 - 2], fill=hx('#4d6782'))
        d.rectangle([x0, y0, x1, y1], fill=hx('#0a2a3a'))
        for y in range(y0, y1 + 1, 2): d.line([x0, y, x1, y], fill=hx('#0d3346'))
        r = random.Random(x0)
        if kind == 'graph':
            for x in range(x0 + 2, x1 - 1):
                y = (y0 + y1) / 2 + math.sin((x - x0) / 3.2) * (y1 - y0) / 4 + r.randint(-1, 1); d.point((x, round(y)), fill=hx('#6dffb8'))
            d.line([x0 + 2, y1 - 2, x1 - 2, y1 - 2], fill=hx('#2f7f9a'))
        elif kind == 'bars':
            for i, x in enumerate(range(x0 + 3, x1 - 2, 4)): d.rectangle([x, y1 - 2 - r.randint(3, y1 - y0 - 5), x + 2, y1 - 2], fill=hx('#57c8ff' if i % 3 else '#ffcc66'))
        elif kind == 'dna':
            for y in range(y0 + 2, y1 - 1):
                a = math.sin((y - y0) / 2.5) * 7; cx = (x0 + x1) / 2
                d.point((round(cx + a), y), fill=hx('#8af2ff')); d.point((round(cx - a), y), fill=hx('#ff8ad8'))
                if y % 3 == 0: d.line([round(cx - a), y, round(cx + a), y], fill=hx('#2f6f88'))
        else:
            for y in range(y0 + 3, y1 - 2, 3): d.line([x0 + 3, y, x0 + 3 + r.randint(6, x1 - x0 - 6), y], fill=hx('#7fd8ff'))
    screen(108, 30, 146, 56, 'graph'); screen(152, 28, 196, 58, 'dna'); screen(202, 30, 228, 56, 'bars')
    screen(116, 64, 140, 78, 'text'); screen(208, 64, 226, 78, 'text')
    # console desk in front of the monitors
    d.polygon([(110, 86), (226, 86), (232, 98), (104, 98)], fill=hx('#3a4e66')); d.line([110, 86, 226, 86], fill=hx('#8fb0cf'))
    for i, x in enumerate(range(116, 222, 7)): d.rectangle([x, 90, x + 3, 92], fill=hx(['#57c8ff', '#6dffb8', '#ffcc66', '#ff7b6b'][i % 4]))
    # server rack (right)
    d.rectangle([272, 34, 298, 98], fill=hx('#141c28')); d.rectangle([272, 34, 298, 35], fill=hx('#5d7894'))
    for y in range(39, 96, 6): d.rectangle([275, y, 295, y + 4], fill=hx('#1f2b3b')); d.line([275, y, 295, y], fill=hx('#33475e'))
    # left: small wall-mounted terminal
    d.rectangle([90, 40, 98, 54], fill=hx('#0b1119')); d.rectangle([91, 41, 97, 49], fill=hx('#0f3c4c'))
    # floor tiles: perspective grid, vanishing point above the middle
    vx, vy = 160, 40
    for y in range(HZ, H):
        for x in range(W):
            t = (y - HZ) / (H - HZ)
            c = mix(hx('#2b3b4f'), hx('#4a5f78'), t)
            px[x, y] = c
    rows = []; z = 1.0
    while True:
        y = HZ + (H - HZ) * (1 - 1 / z) * 1.9
        if y >= H: break
        rows.append(round(y)); z *= 1.25
    for y in rows: d.line([0, y, W, y], fill=hx('#1d293a'))
    for i in range(-20, 21):
        xb = vx + i * 34
        for y in range(HZ, H):
            t = (y - vy) / (H - vy); x = vx + (xb - vx) * t * ((H - vy) / (H - vy))
            x = vx + (xb - vx) * (y - vy) / (H - vy)
            if 0 <= round(x) < W: px[round(x), y] = hx('#1d293a')
    for y in rows:  # tile highlight just below each seam
        if y + 1 < H: d.line([0, y + 1, W, y + 1], fill=hx('#55708e'))
    d.line([0, HZ, W, HZ], fill=hx('#0e151f')); d.line([0, HZ + 1, W, HZ + 1], fill=hx('#18222f'))
    # glow reflections on the floor under tanks + monitor
    def glow(cx, cy, rx, ry, col, k):
        for y in range(max(HZ + 2, int(cy - ry)), min(H, int(cy + ry) + 1)):
            for x in range(max(0, int(cx - rx)), min(W, int(cx + rx) + 1)):
                e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if e < 1: px[x, y] = mix(px[x, y], col, k * (1 - e) * (.75 + BAYER[y % 4][x % 4] / 64))
    for (x0, x1, top) in TANKS: glow((x0 + x1) / 2, HZ + 6, 24, 9, hx('#5ff0d0'), .45)
    glow(168, HZ + 5, 60, 7, hx('#57c8ff'), .3)
    # cables snaking across the floor
    for (pts, c) in ((((0, 150), (30, 146), (60, 156), (80, 176)), '#101722'), (((W, 170), (306, 160), (300, 140), (304, HZ + 2)), '#101722')):
        for i in range(len(pts) - 1):
            (a, b), (c2, e) = pts[i], pts[i + 1]; d.line([a, b, c2, e], fill=hx(c), width=2)
    # creature pads: metal discs with a cyan light ring (centres = spots)
    def pad(fx, fy, rx, ry):
        cx, cy = fx * W, fy * H
        d.ellipse([cx - rx - 2, cy - ry + 2, cx + rx + 2, cy + ry + 5], fill=hx('#141c27'))     # contact shadow
        d.ellipse([cx - rx, cy - ry + 2, cx + rx, cy + ry + 3], fill=hx('#2b384a'))             # side
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=hx('#7fe8ff'))                     # light ring
        d.ellipse([cx - rx + 2, cy - ry + 1, cx + rx - 2, cy + ry - 1], fill=hx('#3e5470'))
        d.ellipse([cx - rx + 4, cy - ry + 2, cx + rx - 4, cy + ry - 2], fill=hx('#5c7592'))     # top plate
        d.ellipse([cx - rx * .55, cy - ry * .55, cx + rx * .55, cy + ry * .55], outline=hx('#3e5470'))
        d.arc([cx - rx + 4, cy - ry + 2, cx + rx - 4, cy + ry - 2], 190, 300, fill=hx('#9db6cf'))
        for a in range(0, 360, 45):
            x = cx + math.cos(math.radians(a)) * (rx - 3); y = cy + math.sin(math.radians(a)) * (ry - 1.5); d.point((round(x), round(y)), fill=hx('#c9f8ff'))
    pad(*FAR, 30, 7); pad(*NEAR, 44, 10)
    # vignette (dithered) to keep the corners quiet behind the UI
    for y in range(H):
        for x in range(W):
            e = ((x - W / 2) / (W * .62)) ** 2 + ((y - H * .45) / (H * .7)) ** 2
            if e > .55: px[x, y] = mix(px[x, y], hx('#070b12'), min(.55, (e - .55) * .9 + BAYER[y % 4][x % 4] / 160))
    return im
def phase(im, p):
    if p == 'day': return im
    k = {'dawn': (1.0, .97, .97), 'dusk': (.97, .93, .98), 'night': (.78, .82, .92)}[p]
    return im.point(lambda v: v)  if False else Image.merge('RGB', [ch.point(lambda v, s=s: round(v * s)) for ch, s in zip(im.split(), k)])
N = 32  # life frames (x 120 ms = 3.84 s loop); every animated value below completes whole cycles in N frames, so it loops cleanly
STRIPS = (30, 130, 230)
SCREENS = [((108, 30, 146, 56), 'graph'), ((152, 28, 196, 58), 'dna'), ((202, 30, 228, 56), 'bars'), ((116, 64, 140, 78), 'text'), ((208, 64, 226, 78), 'text')]
def lights(f):
    """Per-frame brightness (1 = the still) of each light source; the floor glow under a source uses the same value."""
    w = lambda k, ph=0: math.sin(2 * math.pi * (k * f / N + ph))
    strips = [1 + .07 * w(1, i / 3) for i in range(3)]
    tanks = [1 + .12 * w(1, .3 * i + .1) for i in range(3)]
    mon = 1.0
    if f in (9, 10): strips[0] = (.35, .75)[f - 9]          # brief flickers
    if f == 22: strips[2] = .4; tanks[1] = .6                  # strip 3 and tank 2 share a circuit
    if f == 23: strips[2] = .8
    if f in (14, 15): mon = (.72, .9)[f - 14]
    return strips, tanks, mon
def tint(d, box, b, lit):
    """Brightness b over an area: darken with black below 1, brighten with the light colour above 1."""
    if b < 1: d.rectangle(box, fill=(0, 0, 0, round(255 * (1 - b) * .75)))
    elif b > 1: d.rectangle(box, fill=hx(lit) + (round(255 * (b - 1) * 1.3),))
def on_pad(x, y):
    return any(((x + .5 - fx * W) / (rx + 3)) ** 2 + ((y + .5 - fy * H - 2) / (ry + 4)) ** 2 <= 1 for (fx, fy, rx, ry) in ((*FAR, 30, 7), (*NEAR, 44, 10)))
def floor_glow(px, cx, cy, rx, ry, col, k, b):
    """Re-weights the still's dithered floor reflection: same ellipse and falloff as base(), alpha in 4 hard steps (pixel look)."""
    dlt = b - 1
    if abs(dlt) < .005: return
    c = (0, 0, 0) if dlt < 0 else col
    for y in range(max(HZ + 2, int(cy - ry)), min(H, int(cy + ry) + 1)):
        for x in range(max(0, int(cx - rx)), min(W, int(cx + rx) + 1)):
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if e >= 1 or on_pad(x, y): continue
            a = k * (1 - e) * abs(dlt) * (2.2 if dlt < 0 else 3.0)
            a = round(min(.9, a) * 4 + BAYER[y % 4][x % 4] / 16 - .5) / 4
            if a > 0: px[x, y] = c + (round(255 * a),)
def screen_anim(d, box, kind, f, idx):
    x0, y0, x1, y1 = box; t = f / N
    d.rectangle([x0, y0, x1, y1], fill=hx('#0a2a3a') + (255,))
    for y in range(y0, y1 + 1, 2): d.line([x0, y, x1, y], fill=hx('#0d3346') + (255,))
    if kind == 'graph':  # line scrolls left, two waves per loop
        for x in range(x0 + 2, x1 - 1):
            ph = (x - x0) / 3.2 + 2 * math.pi * 2 * t
            y = (y0 + y1) / 2 + math.sin(ph) * (y1 - y0) / 4 + math.sin(ph * .5 + 1) * 2; d.point((x, round(y)), fill=hx('#6dffb8') + (255,))
        hx_ = x1 - 2 - (f % 8) * 3; d.line([hx_, y0 + 2, hx_, y1 - 3], fill=hx('#2f7f9a') + (255,))  # sweep marker
        d.line([x0 + 2, y1 - 2, x1 - 2, y1 - 2], fill=hx('#2f7f9a') + (255,))
    elif kind == 'dna':  # helix turns (strands swap front/back) and scrolls up
        cx = (x0 + x1) / 2
        for y in range(y0 + 2, y1 - 1):
            ph = (y - y0) / 2.5 + 2 * math.pi * 2 * t; a = math.sin(ph) * 7; front = math.cos(ph) > 0
            ca, cb = (hx('#8af2ff'), hx('#ff8ad8')) if front else (hx('#3f7f99'), hx('#8a4f80'))
            if (y + f) % 3 == 0: d.line([round(cx - a), y, round(cx + a), y], fill=hx('#2f6f88') + (255,))
            d.point((round(cx - a), y), fill=cb + (255,)); d.point((round(cx + a), y), fill=ca + (255,))
    elif kind == 'bars':  # bars rise and fall
        r = random.Random(x0)
        for i, x in enumerate(range(x0 + 3, x1 - 2, 4)):
            hmax = r.randint(6, y1 - y0 - 5); h = max(2, round(hmax * (.55 + .45 * math.sin(2 * math.pi * (2 * t + i * .37)))))
            d.rectangle([x, y1 - 2 - h, x + 2, y1 - 2], fill=hx('#57c8ff' if i % 3 else '#ffcc66') + (255,))
    else:  # text lines scroll up one row every 4 frames
        r = random.Random(x0); widths = [r.randint(5, x1 - x0 - 6) for _ in range(8)]; off = f // 4; sub = (f % 4) * 3 // 4
        for k in range(6):
            y = y0 + 3 + k * 3 - sub
            if y0 + 2 <= y <= y1 - 2: d.line([x0 + 3, y, x0 + 3 + widths[(k + off) % 8], y], fill=hx('#7fd8ff') + (255,))
        if idx == 3 and f % 8 < 4: d.rectangle([132, 74, 134, 76], fill=hx('#bff4ff') + (255,))
def life_frames():
    frames = []; r = random.Random(7)
    bubbles = [(tx, r.uniform(0, 1), r.choice([1, 1, 2])) for (x0, x1, top) in TANKS for tx in [r.randint(x0 + 4, x1 - 4) for _ in range(5)]]
    leds = [(278 + (i % 4) * 5, 41 + (i // 4) * 6, r.randint(0, 15), r.choice(['#6dffb8', '#57c8ff', '#ffcc66', '#ff7b6b'])) for i in range(36)]
    for f in range(N):
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); px = im.load()
        strips, tanks, mon = lights(f)
        # floor reflections first (they sit on the floor, under everything else drawn here)
        for i, (x0, x1, top) in enumerate(TANKS): floor_glow(px, (x0 + x1) / 2, HZ + 6, 24, 9, hx('#5ff0d0'), .45, tanks[i])
        floor_glow(px, 168, HZ + 5, 60, 7, hx('#57c8ff'), .3, mon)
        for i, x in enumerate(STRIPS): floor_glow(px, x + 30, HZ + 12, 40, 5, hx('#bff4ff'), .12, strips[i])
        # tank liquid pulse
        for i, (x0, x1, top) in enumerate(TANKS): tint(d, [x0, top + 1, x1, 91], tanks[i], '#9fffe8')
        for i, (bx, ph, sz) in enumerate(bubbles):
            tank = TANKS[i // 5]; top = tank[2]; span = 90 - top - 4
            y = 90 - ((ph + 2 * f / N) % 1) * span; x = bx + (1 if (f + i) % 4 < 2 else 0)
            d.rectangle([x, y, x + sz - 1, y + sz - 1], fill=hx('#d8fff6') + (230,))
        for (x, y, o, c) in leds:
            if (f + 2 * o) % 16 < (6 + o % 5): d.rectangle([x, y + 1, x + 1, y + 2], fill=hx(c) + (255,))
        # monitors: animated content, then the shared flicker
        for i, (box, kind) in enumerate(SCREENS):
            screen_anim(d, box, kind, f, i); tint(d, list(box), mon, '#bff4ff')
        # ceiling strips
        for i, x0 in enumerate(STRIPS):
            b = strips[i]; c = mix(hx('#34505e'), hx('#bff4ff'), b) if b <= 1 else mix(hx('#bff4ff'), hx('#ffffff'), min(1, (b - 1) * 4))
            d.rectangle([x0, 4, x0 + 60, 6], fill=c + (255,)); d.line([x0 - 1, 7, x0 + 61, 7], fill=mix(hx('#24404c'), hx('#5fa9c4'), min(1, b)) + (255,))
        # pad light ring pulse
        a = round(70 * (0.5 + 0.5 * math.cos(f / N * 2 * math.pi * 2)))
        for (fx, fy, rx, ry) in ((*FAR, 30, 7), (*NEAR, 44, 10)):
            cx, cy = fx * W, fy * H; d.arc([cx - rx, cy - ry, cx + rx, cy + ry], 0, 180, fill=hx('#e6fdff') + (a,))
        frames.append(im)
    return frames
def life_phase(fr, p):
    """The life layer gets the same per-phase grade as the still (opaque screens / strips must match a dimmer night)."""
    if p == 'day': return fr
    k = {'dawn': (1.0, .97, .97), 'dusk': (.97, .93, .98), 'night': (.78, .82, .92)}[p]
    rr, g, b, a = fr.split(); return Image.merge('RGBA', [ch.point(lambda v, s=s: round(v * s)) for ch, s in zip((rr, g, b), k)] + [a])
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); b = base(); b.save('/tmp/lab_native.png')
    LIFE = life_frames()
    for p in ('dawn', 'day', 'dusk', 'night'):
        phase(b, p).resize((2560, 1440), Image.NEAREST).save(f'{OUT}/bg_{p}.webp', lossless=True, quality=100, method=6)
        fr = [life_phase(x, p).resize((1280, 720), Image.NEAREST) for x in LIFE]; fr[0].save(f'{OUT}/life_{p}.webp', save_all=True, append_images=fr[1:], duration=120, loop=0, lossless=True, method=6)
    json.dump({'biome': 'lab', 'size': [2560, 1440], 'outdoor': False, 'spots_frac': {'near': list(NEAR), 'far': list(FAR)},
               'life_layer': {'frames': N, 'ms_per_frame': 120, 'size': [1280, 720]}, 'pixel_art': {'native': [W, H], 'scale': 8, 'filter': 'nearest'},
               'source': 'Kilumen pixel art drawn in code, tools/lab_battle_bg/gen.py (Oct 30 2026)'}, open(f'{OUT}/index.json', 'w'), indent=1)
