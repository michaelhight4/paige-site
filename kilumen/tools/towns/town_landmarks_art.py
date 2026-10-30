"""Town landmarks (Coder, Oct 30 2026: one clear landmark per screen in Revival Heights). Same 35-degree view as the
overworld kit: lit TOP planes (lighter, lit from the upper left) above darker FRONT faces; binary alpha only, no haze.
Writes tiles_{1,2,3}x/town_landmarks.png (7x3 cells of 64px). Cells: clock tower 2x3 at cols 0-1; gazebo 3x2 at
cols 2-4 rows 0-1; big tree 2x2 at cols 5-6 rows 0-1. Registers ids from 10988 (idempotent)."""
import os, json, random
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
INK = (44, 35, 32); STONE_D, STONE, STONE_L = (96, 92, 100), (138, 134, 140), (184, 180, 182)
ROOF_D, ROOF, ROOF_L = (88, 50, 48), (138, 72, 60), (182, 108, 82)
FACE, FACE_D, GOLD = (238, 230, 206), (120, 110, 96), (214, 176, 70)
WOOD_D, WOOD, WOOD_L, PAINT, PAINT_D = (78, 52, 38), (106, 68, 46), (146, 98, 62), (236, 232, 220), (176, 170, 160)
LEAF_D, LEAF, LEAF_L, LEAF_LL = (30, 70, 40), (56, 118, 50), (88, 158, 62), (128, 192, 82)
W, H = 64 * 7, 64 * 3
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load(); rnd = random.Random(35)
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[x, y] = c + (255,)
def box(x0, y0, x1, y1, c, line=INK):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, line if line and (x in (x0, x1) or y in (y0, y1)) else c)
def disc(cx, cy, rx, ry, c, rim=None):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1: put(x, y, rim if rim and d > 0.75 else c)
# --- clock tower (cols 0-1, 128x192)
for y in range(4, 40):                                   # pyramid roof: lit top-left plane, dark right plane
    half = 8 + (y - 4) * 46 // 36
    for x in range(64 - half, 64 + half + 1):
        c = INK if x in (64 - half, 64 + half) or y == 4 else (ROOF_L if x < 64 else ROOF)
        if y % 6 == 5 and c != INK: c = ROOF_D
        put(x, y, c)
for y in range(0, 6): put(64, y, GOLD)
box(14, 40, 113, 46, ROOF_D)                             # eave lip
box(20, 47, 107, 176, STONE)                             # shaft front face
for y in range(48, 176):
    for x in range(21, 107):
        if x < 30: put(x, y, STONE_L)                    # lit left edge
        elif x > 98: put(x, y, STONE_D)
        if (y - 48) % 12 == 11 or ((x + (y // 12) * 10) % 20 == 0): put(x, y, STONE_D)
disc(64, 82, 26, 26, FACE, INK)                          # the clock
disc(64, 82, 22, 22, FACE)
for a in range(12):
    import math
    put(int(64 + 19 * math.cos(a * math.pi / 6)), int(82 + 19 * math.sin(a * math.pi / 6)), INK)
for i in range(14): put(64, 82 - i, INK); put(65, 82 - i, INK)          # ten past ten
for i in range(10): put(64 + i, 82 - i // 2, INK); put(64 + i, 83 - i // 2, INK)
for wy in (122,):                                        # window
    box(54, wy, 74, wy + 18, (58, 84, 104)); put(60, wy + 4, (120, 160, 176)); put(61, wy + 5, (120, 160, 176))
box(50, 146, 78, 176, WOOD_D)                            # door (decor only, no warp)
for y in range(148, 176): put(64, y, INK)
box(10, 176, 117, 190, STONE_D)                          # plinth: lit top, dark front
box(10, 176, 117, 181, STONE_L)
# --- gazebo (cols 2-4 rows 0-1, 192x128)
G0 = 128
for y in range(6, 48):                                   # roof top plane (lit), octagon-ish
    inset = max(0, 30 - y)
    for x in range(G0 + 10 + inset, G0 + 182 - inset):
        c = INK if x in (G0 + 10 + inset, G0 + 181 - inset) or y == 6 else (PAINT if (x - G0) < 96 else PAINT_D)
        if c != INK and (x - G0) % 24 == 0: c = PAINT_D
        put(x, y, c)
disc(G0 + 96, 8, 6, 6, GOLD, INK)
box(G0 + 8, 48, G0 + 183, 56, ROOF_D)                    # roof lip (front face, darker)
for px0 in (G0 + 18, G0 + 62, G0 + 126, G0 + 168):       # posts
    box(px0, 57, px0 + 6, 106, PAINT)
for x in range(G0 + 24, G0 + 168):                       # rail
    put(x, 86, INK); put(x, 87, PAINT_D)
    if x % 8 == 0:
        for y in range(88, 106): put(x, y, PAINT_D)
box(G0 + 4, 106, G0 + 187, 112, WOOD_L)                  # deck top (lit)
box(G0 + 4, 112, G0 + 187, 124, WOOD)                    # deck front face
for x in range(G0 + 20, G0 + 180, 20): put(x, 118, WOOD_D)
# --- big tree (cols 5-6 rows 0-1, 128x128)
T0 = 320
box(T0 + 52, 84, T0 + 76, 124, WOOD)
for y in range(85, 124): put(T0 + 54, y, WOOD_L); put(T0 + 74, y, WOOD_D)
for dx in (-10, 10):
    for i in range(8): put(T0 + 64 + dx + (i if dx > 0 else -i), 124 - i // 3, WOOD_D)
for cx, cy, r in ((64, 58, 46), (36, 64, 26), (92, 64, 26), (64, 30, 30), (44, 40, 22), (86, 42, 22)):
    disc(T0 + cx, cy, r, r * 0.85, LEAF_D, INK)
for cx, cy, r in ((60, 52, 38), (40, 58, 18), (86, 58, 18), (60, 30, 22), (44, 38, 16), (82, 40, 14)):
    disc(T0 + cx, cy, r, r * 0.8, LEAF)
for cx, cy, r in ((52, 40, 18), (38, 52, 9), (72, 30, 10), (58, 26, 9)):
    disc(T0 + cx, cy, r, r * 0.8, LEAF_L)
for _ in range(60):
    x, y = T0 + rnd.randint(30, 80), rnd.randint(20, 60)
    if px[x, y][3] and px[x, y][:3] == LEAF_L: put(x, y, LEAF_LL)
assert set(im.getchannel('A').histogram()[1:255]) == {0}
for k in (1, 2, 3):
    im.resize((W * k, H * k), Image.NEAREST).save(os.path.join(OUT, f'tiles_{k}x', 'town_landmarks.png'))
prev = Image.new('RGBA', (W, H), (96, 160, 64, 255)); prev.alpha_composite(im); prev.resize((W * 2, H * 2), Image.NEAREST).save('/tmp/landmarks_preview.png')
NAMES = ([(f'lm_clock_tower_{r}_{c}', c, r) for r in range(3) for c in range(2)] + [(f'lm_gazebo_{r}_{c}', 2 + c, r) for r in range(2) for c in range(3)]
         + [(f'lm_big_tree_{r}_{c}', 5 + c, r) for r in range(2) for c in range(2)])
LED = os.path.join(OUT, 'tools', 'tile_id_ledger.json'); led = json.load(open(LED))
for k, f in ((1, 'tileset.json'), (2, 'tileset_2x.json'), (3, 'tileset_3x.json')):
    p = os.path.join(OUT, f); ts = json.load(open(p)); have = {t['name'] for t in ts['tiles']}
    for i, (n, c, r) in enumerate(NAMES):
        if n in have: continue
        assert 10988 + i not in {t['id'] for t in ts['tiles']}
        ts['tiles'].append({'id': 10988 + i, 'name': n, 'category': 'landmark', 'sheet': f'tiles_{k}x/town_landmarks.png', 'index': r * 7 + c,
                            'col': c, 'row': r, 'walkable': False, 'collision': 'block', 'collision_code': 1, 'encounter': False,
                            'notes': 'town landmarks kit (tools/towns/town_landmarks_art.py)'})
        if k == 1: led['ids'][n] = 10988 + i
    json.dump(ts, open(p, 'w'))
json.dump(led, open(LED, 'w'), separators=(',', ':'))
print('ok')
