# Kilumen tall grass (encounter terrain), hand-placed native pixels on the 64px grid.
# Original design: dense dark "bed" with clumps of tapered blades, each blade outlined in near-black green,
# light tips, a base shadow band, tips that rise into the tile above (overlay), a front-row "waist-up" overlay,
# and a 3-frame rustle (part -> swing -> settle). Every colour is an exact palette.hex entry (no pixelize needed).
import numpy as np
from PIL import Image, ImageDraw
import random
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
OUT, BED, BED2, DARK, MID, LIGHT, TIP, TIP2, GLINT = map(H, ('18382c', '244e34', '18382c', '24522e', '367634', '52983a', '78ba48', 'a6d460', 'b076ec'))
T = 64; TOP = 16           # canvas has 16 extra rows above the tile for tips poking into the tile above
CW, CH = T, T + TOP + T   # + one tile below, for blades rising from the S neighbour
BACK = (1, 22, 43); FRONT = (11, 32, 54)
BACK_B, FRONT_B = TOP + 33, TOP + 61

def _dil(m):
    p = np.pad(m, 1); return m | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]

def _blade(cx, base, h, lean, w=5):
    m = Image.new('L', (CW, CH), 0); d = ImageDraw.Draw(m)
    hw = w / 2
    d.polygon([(cx - hw, base), (cx + hw, base), (cx + lean * 0.45 + 1.2, base - h * 0.55), (cx + lean, base - h), (cx + lean * 0.45 - 1.2, base - h * 0.55)], fill=255)
    return np.array(m) > 0

def _paint(arr, mask, col):
    arr[mask] = col

def _clump(arr, cx, base, H0, frame, seed, wrapx, glint, shadow_rx=7):
    r = random.Random(seed)
    blades = []
    for i in (0, 4, 1, 3, 2):                      # outer blades first, centre blade on top
        k = i - 2
        h = H0 - abs(k) * 5 + r.randint(-2, 2)
        lean = k * 2.6 + r.uniform(-0.8, 0.8)
        if frame == 1: h -= 7; lean = lean * 2.2           # parted / pressed down
        elif frame == 2: lean += 5 * (h / H0)              # swing right
        elif frame == 3: lean -= 3 * (h / H0)              # swing back, settling
        blades.append((i, cx + k * 3, h, lean))
    # base shadow under the clump
    yy, xx = np.mgrid[0:CH, 0:CW]
    for ox in wrapx:
        sh = (((xx - cx - ox) / shadow_rx) ** 2 + ((yy - base) / 1.6) ** 2) <= 1
        _paint(arr, sh, OUT)
    for i, bx, h, lean in blades:
        for ox in wrapx:
            m = _blade(bx + ox, base, h, lean)
            _paint(arr, _dil(m) & (yy <= base), OUT)
            body = MID if i in (1, 2, 3) else DARK
            _paint(arr, m, body)
            # lit left edge of the blade, dark right edge
            lft = m & ~np.roll(m, 1, axis=1); rgt = m & ~np.roll(m, -1, axis=1)
            _paint(arr, lft & (yy > base - h * 0.75), LIGHT if i != 0 else MID)
            _paint(arr, rgt & ~lft, DARK)
            tipz = m & (yy < base - h * 0.62); _paint(arr, tipz, TIP)
            _paint(arr, m & (yy < base - h * 0.84), TIP2)
            if glint and i == 2:
                ty = int(round(base - h)); tx = int(round(bx + ox + lean))
                if 0 <= ty + 2 < CH and 0 <= tx < CW: arr[ty + 1, tx] = GLINT; arr[ty + 2, tx] = GLINT

def _bed(arr, n, e, s, w):
    """Dark dense under-grass mass that fills the patch so it reads as a block, with an outline on open sides."""
    y0 = TOP + (12 if n else 0); y1 = TOP + (59 if s else 63); x0 = 3 if w else 0; x1 = 60 if e else 63
    m = np.zeros((CH, CW), bool); m[y0:y1 + 1, x0:x1 + 1] = True
    for (cy, cx, ok) in ((y0, x0, n and w), (y0, x1, n and e), (y1, x0, s and w), (y1, x1, s and e)):
        if ok:   # round open corners
            for dy in range(3):
                for dx in range(3 - dy):
                    m[cy + (dy if cy == y0 else -dy), cx + (dx if cx == x0 else -dx)] = False
    yy, xx = np.mgrid[0:CH, 0:CW]
    dith = ((xx * 3 + yy * 5) % 8 == 0)
    arr[m] = BED; arr[m & dith] = BED2
    ring = _dil(m) & ~m
    arr[ring & (yy >= TOP)] = OUT
    if s:  # shadow band under the patch base (strong at the bottom rows)
        band = (yy >= y1 + 1) & (yy <= TOP + 63) & (xx >= x0) & (xx <= x1)
        arr[band & ((xx + yy) % 2 == 0)] = OUT; arr[(yy == y1 + 1) & (xx >= x0) & (xx <= x1)] = OUT
        arr[band & ((xx + yy) % 2 == 1)] = (26, 18, 38, 96)


def render(n, e, s, w, frame, part='all', v=0):
    """part: 'body' (decoration tile), 'front' (waist-up overlay), 'tips' (overlay for the tile above)."""
    arr = np.zeros((CH, CW, 4), np.uint8)
    if part == 'body': _bed(arr, n, e, s, w)
    rows = []
    if part in ('body', 'tips'): rows.append((BACK, BACK_B, 42, 100))
    if part in ('body', 'front'): rows.append((FRONT, FRONT_B, 38, 200))
    for xs, base, H0, sd in rows:
        # own clumps (variant v), plus the overlapping clumps of the E/W neighbours (variant 1-v) when they are grass
        for vv, off, on in ((v, 0, True), (1 - v, T, not e), (1 - v, -T, not w)):
            if not on: continue
            xl = list(xs) + ([T - 9] if (off == 0 and e and xs[-1] < T - 14) else [])   # fill the open east side
            for j, cx in enumerate(xl):
                if off == 0:
                    if w and cx < 9: cx = 9
                    if e and cx > T - 10: cx = T - 10
                elif abs(cx + off - T / 2) > T / 2 + 14: continue
                hh = H0 + (3 if (vv + j) % 2 else -2)
                _clump(arr, cx, base, hh, frame, sd * 7 + j * 3 + vv * 50, [off], glint=(sd == 200 and j == 1 and vv == 0))
    if part in ('body', 'front') and not s:
        # the tile below is grass too: its back-row blades rise into this tile and stand IN FRONT of our front row
        for vv, off, on in ((1 - v, 0, True), (v, T, not e), (v, -T, not w)):
            if not on: continue
            for j, cx in enumerate(list(BACK) + ([T - 9] if (off == 0 and e) else [])):
                if off == 0:
                    if w and cx < 9: cx = 9
                    if e and cx > T - 10: cx = T - 10
                elif abs(cx + off - T / 2) > T / 2 + 14: continue
                hh = 42 + (3 if (vv + j) % 2 else -2)
                _clump(arr, cx, BACK_B + T, hh, frame, 100 * 7 + j * 3 + vv * 50, [off], glint=False)
    im = Image.fromarray(arr, 'RGBA')
    if part == 'tips':
        t = Image.new('RGBA', (T, T), (0, 0, 0, 0)); t.paste(im.crop((0, 0, T, TOP)), (0, T - TOP)); return t
    return im.crop((0, TOP, T, TOP + T))

def variants():
    """yield (name, frames[4], kind) ; mask letters = open (non-grass) sides N,E,S,W as 0/1."""
    for v in (0, 1):                    # two cluster variants, laid out in a checkerboard (v = (x + y) % 2)
        for k in range(16):
            n, e, s, w = (k >> 3) & 1, (k >> 2) & 1, (k >> 1) & 1, k & 1
            tag = f'{n}{e}{s}{w}_v{v}'
            yield f'tall_grass_{tag}', [render(n, e, s, w, f, 'body', v) for f in range(4)], 'body'
            yield f'tall_grass_front_{tag}', [render(n, e, s, w, f, 'front', v) for f in range(4)], 'front'
        for k in range(4):
            e, w = (k >> 1) & 1, k & 1
            yield f'tall_grass_tips_{e}{w}_v{v}', [render(1, e, 0, w, f, 'tips', v) for f in range(4)], 'tips'
