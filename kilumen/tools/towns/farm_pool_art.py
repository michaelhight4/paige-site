"""Farm + stone-pool kit (Gary, Oct 30 2026 12:48 PM CT via World Design: Sunmeadow barn + beekeeper cottage with a beehive
and a scarecrow; Revival Heights ponds become square stone pools). Same 35-degree view and binary alpha as town_life_art.py:
lit TOP planes above darker FRONT faces, no haze, no soft shadows. Writes tiles_{1,2,3}x/farm_pool.png (8x4 cells of 64px).
Cells: barn 5x4 at cols 0-4 (big plank doors, closed, at row 3 col 2: a plain building, no interior);
row 0 col 5 beehive (box hive on a stand), col 6 scarecrow, col 7 hay bale;
rows 1-3 cols 5-7 stone pool 3x3 set (nw n ne / w c e / sw s se): the water cell with a stone coping on its outer sides
(north side shows the inner wall face, as seen from the 35-degree camera). Pool pieces are water (collision 3)."""
import os, json
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
INK, BARK_D, BARK, BARK_L = (44, 35, 32), (78, 52, 38), (106, 68, 46), (146, 98, 62)
RED, RED_D, RED_L, TRIM = (176, 62, 52), (120, 40, 38), (204, 92, 74), (232, 226, 210)
ROOF_D, ROOF, ROOF_L = (70, 58, 64), (104, 88, 92), (140, 122, 120)
HAY, HAY_D, HAY_L = (204, 168, 84), (160, 122, 58), (232, 206, 120)
HONEY, CLOTH = (226, 170, 60), (120, 160, 196)
ST_D, ST, ST_L, ST_LL = (92, 90, 88), (128, 124, 118), (164, 160, 150), (196, 192, 180)
W, H = 64 * 8, 64 * 4
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[x, y] = tuple(c[:3]) + (255,)
def box(x0, y0, x1, y1, c, line=None):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, line if line and (x in (x0, x1) or y in (y0, y1)) else c)

# --- barn (cols 0-4, 320x256): lit gambrel roof top plane, red plank front with white trim, hay door, big closed doors
for y in range(4, 120):
    inset = max(0, 30 - y // 2)
    for x in range(8 + inset, 312 - inset):
        c = ROOF_L if (y // 10) % 2 == 0 else ROOF
        if x in (8 + inset, 311 - inset) or y == 4: c = INK
        put(x, y, c)
for y in range(120, 132):
    for x in range(6, 314): put(x, y, INK if y in (120, 131) or x in (6, 313) else ROOF_D)
for y in range(132, 250):
    for x in range(14, 306):
        c = INK if x in (14, 305) else (RED_L if x < 160 else RED) if (x - 14) % 16 < 14 else RED_D
        put(x, y, c)
box(14, 132, 305, 137, TRIM, INK)
box(136, 140, 183, 176, HAY_D, INK)                   # hay loft door with hay showing
for y in range(144, 176):
    for x in range(140, 180):
        if (x + y) % 5 == 0: put(x, y, HAY_L)
        elif (x * 3 + y) % 7 == 0: put(x, y, HAY)
box(128, 186, 191, 250, BARK_D, INK)                  # big doors (row 3 col 2 = x128-191), closed
for x0, x1 in ((128, 159), (160, 191)):
    box(x0, 186, x1, 250, TRIM, INK); box(x0 + 3, 189, x1 - 3, 247, RED_D)
    for i in range(x1 - x0 - 6):                       # white X brace
        put(x0 + 3 + i, 189 + i * 58 // (x1 - x0 - 6), TRIM); put(x1 - 3 - i, 189 + i * 58 // (x1 - x0 - 6), TRIM)
for wx in (44, 240):
    box(wx, 186, wx + 35, 216, (58, 84, 104), INK); box(wx, 186, wx + 35, 189, TRIM, INK)
    for y in range(190, 216): put(wx + 17, y, INK)
for x in range(12, 308): put(x, 250, INK); put(x, 251, INK)

# --- beehive (col 5 row 0): white box hive (lit lid top, front with entrance slit) on a plank stand, two bees
ox = 320
for y in range(10, 18):
    for x in range(ox + 14, ox + 50): put(x, y, INK if y == 10 or x in (ox + 14, ox + 49) else TRIM)
box(ox + 12, 18, ox + 51, 21, ROOF, INK)
for b, (y0, y1) in enumerate(((22, 33), (34, 45))):
    box(ox + 16, y0, ox + 47, y1, (210, 204, 186) if b else TRIM, INK)
box(ox + 26, 41, ox + 37, 43, INK)
box(ox + 12, 46, ox + 51, 49, BARK_L, INK)
box(ox + 16, 50, ox + 19, 60, BARK, INK); box(ox + 44, 50, ox + 47, 60, BARK, INK)
for bx, by in ((ox + 54, 28), (ox + 8, 36)):
    put(bx, by, INK); put(bx + 1, by, HONEY); put(bx + 2, by, INK); put(bx + 1, by - 1, TRIM)
# --- scarecrow (col 6 row 0): post + cross arm, sack head with a straw hat (lit brim top), patched shirt, straw hands
ox = 384
box(ox + 30, 24, ox + 33, 62, BARK, INK)
box(ox + 8, 28, ox + 55, 31, BARK_L, INK)
for y in range(8, 14):
    for x in range(ox + 18, ox + 46): put(x, y, INK if y == 8 or x in (ox + 18, ox + 45) else HAY_L)
box(ox + 24, 2, ox + 39, 8, HAY, INK)
box(ox + 25, 14, ox + 38, 24, (214, 190, 140), INK); put(ox + 28, 18, INK); put(ox + 35, 18, INK)
for x in range(ox + 28, ox + 36): put(x, 21, INK)
box(ox + 18, 25, ox + 45, 46, CLOTH, INK); box(ox + 22, 34, ox + 28, 40, RED, INK)
for hx in (ox + 6, ox + 55):
    for k in range(5): put(hx, 26 + k * 2, HAY); put(hx + (1 if hx < ox + 30 else -1), 27 + k * 2, HAY_D)
# --- hay bale (col 7 row 0): round bale end-on, lit top
ox = 448
for y in range(16, 58):
    for x in range(ox + 6, ox + 58):
        d = ((x - ox - 32) / 26) ** 2 + ((y - 37) / 21) ** 2
        if d <= 1: put(x, y, INK if d > 0.86 else HAY_L if y < 30 else HAY if (x + y) % 6 else HAY_D)

# --- stone pool (cols 5-7, rows 1-3): water copied from the terrain water cell, stone coping on the outer sides
water = Image.open(os.path.join(OUT, 'tiles_1x', 'terrain.png')).convert('RGBA').crop((0, 128, 64, 192))
R = 10                                                  # coping width (px)
for r in range(3):
    for c in range(3):
        ox, oy = (5 + c) * 64, (1 + r) * 64
        im.paste(water, (ox, oy))
        n, s, w, e = r == 0, r == 2, c == 0, c == 2
        for y in range(64):
            for x in range(64):
                cap = (n and y < R) or (s and y >= 64 - R) or (w and x < R) or (e and x >= 64 - R)
                if cap:
                    col = ST_LL if (x // 16 + y // 10) % 2 else ST_L
                    if (n and y == 0) or (s and y == 63) or (w and x == 0) or (e and x == 63): col = INK
                    if (n and y == R - 1 and not (w and x < R) and not (e and x >= 64 - R)): col = ST
                    if (x % 16 == 0 and (n or s) and not (w and x < R)) or (y % 16 == 0 and (w or e) and not (n and y < R)): col = ST
                    put(ox + x, oy + y, col)
                elif n and y < R + 6:                  # inner wall face below the north coping (35-degree view)
                    put(ox + x, oy + y, ST_D if y < R + 5 else INK)
                elif (w and x == R) or (e and x == 63 - R) or (s and y == 63 - R): put(ox + x, oy + y, ST_D)
assert set(im.getchannel('A').histogram()[1:255]) == {0}
for k in (1, 2, 3):
    im.resize((W * k, H * k), Image.NEAREST).save(os.path.join(OUT, f'tiles_{k}x', 'farm_pool.png'))
prev = Image.new('RGBA', (W, H), (96, 160, 64, 255)); prev.alpha_composite(im); prev.resize((W * 2, H * 2), Image.NEAREST).save('/tmp/farm_pool_preview.png')

# --- register (idempotent): ids from 11100 (free range above the town_life / landmark kits)
BASE = 11100
NAMES = [(f'fp_barn_{r}_{c}', c, r, 'building', 1) for r in range(4) for c in range(5)] + [
    ('fp_beehive', 5, 0, 'deco', 1), ('fp_scarecrow', 6, 0, 'deco', 1), ('fp_hay_bale', 7, 0, 'deco', 1)] + [
    (f'fp_pool_{k}', 5 + i % 3, 1 + i // 3, 'terrain', 3) for i, k in enumerate(('nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'))]
LED = os.path.join(OUT, 'tools', 'tile_id_ledger.json'); led = json.load(open(LED))
for k, f in ((1, 'tileset.json'), (2, 'tileset_2x.json'), (3, 'tileset_3x.json')):
    p = os.path.join(OUT, f); ts = json.load(open(p)); have = {t['name'] for t in ts['tiles']}
    assert not {t['id'] for t in ts['tiles'] if t['name'] not in dict((n[0], 1) for n in NAMES)} & set(range(BASE, BASE + len(NAMES)))
    for i, (n, c, r, cat, code) in enumerate(NAMES):
        if n in have: continue
        ts['tiles'].append({'id': BASE + i, 'name': n, 'category': cat, 'sheet': f'tiles_{k}x/farm_pool.png', 'index': r * 8 + c,
                            'col': c, 'row': r, 'walkable': False, 'collision': 'water' if code == 3 else 'block', 'collision_code': code,
                            'encounter': False, 'notes': 'farm + stone pool kit (tools/towns/farm_pool_art.py)'})
        if k == 1: led['ids'][n] = BASE + i
    json.dump(ts, open(p, 'w'))
json.dump(led, open(LED, 'w'), separators=(',', ':'))
print('ok', BASE, BASE + len(NAMES) - 1)
