"""Small-town life props (Gary, Oct 30 2026 11:10 AM CT: Revival Heights logging cabin, woodpile, axe block, mailboxes,
laundry line, dog house, garden patches). Same 35-degree view as the overworld kit: every object shows a lit TOP plane
(lighter, lit from the upper left) above a darker FRONT face; binary alpha only (0 or 255), no haze, no soft shadows.
Existing tree/bark palette only. Writes tiles_{1,2,3}x/town_life.png (6x3 cells of 64px; 2x/3x nearest-neighbour).
Cells: cabin 3x3 at cols 0-2 (door, closed, at row 2 col 1); col 3-5 row 0 woodpile / axe_block / mailbox;
row 1 laundry_l / laundry_m / laundry_r; row 2 dog_house / garden_patch / garden_patch_b."""
import os, random
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
INK, BARK_D, BARK, BARK_L, END, END_L = (44, 35, 32), (78, 52, 38), (106, 68, 46), (146, 98, 62), (186, 140, 88), (214, 176, 118)
ROOF_D, ROOF, ROOF_L = (70, 58, 64), (104, 88, 92), (140, 122, 120)
SOIL_D, SOIL, LEAF_D, LEAF, LEAF_L = (70, 48, 34), (104, 72, 48), (36, 82, 46), (82, 152, 58), (120, 186, 72)
GLASS, GLASS_L, RED, RED_D, CLOTH = (58, 84, 104), (120, 160, 176), (176, 62, 52), (120, 40, 38), [(232, 226, 210), (120, 160, 196), (214, 150, 90)]
STEEL, STEEL_L = (92, 100, 108), (176, 184, 190)
W, H = 64 * 6, 64 * 3
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load(); rnd = random.Random(35)
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[x, y] = c + (255,)
def box(x0, y0, x1, y1, c, line=None):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, line if line and (x in (x0, x1) or y in (y0, y1)) else c)
def disc(cx, cy, rx, ry, c, rim=None):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1: put(x, y, rim if rim and d > 0.6 else c)
def log_end(cx, cy, r):                       # a cut log seen end-on: bark ring, light end grain, a ring line
    disc(cx, cy, r, r * 0.9, END, BARK_D); disc(cx - 1, cy - 1, r * 0.45, r * 0.4, END_L); put(cx, cy, BARK)

# --- cabin (cols 0-2, 192x192): log walls, a slate roof whose top plane is lighter than the front gable face
CX0 = 0
for y in range(0, 92):                        # roof top plane: trapezoid, lit
    inset = max(0, 22 - y // 2)
    for x in range(6 + inset // 3, 186 - inset // 3):
        c = ROOF_L if (x + y // 6 * 9) % 18 < 16 else ROOF
        if y % 12 == 11: c = ROOF
        if x < 10 + inset // 3 or x > 181 - inset // 3 or y < 2: c = INK
        put(x, y, c)
for y in range(92, 104):                      # eave / roof front lip (darker face)
    for x in range(4, 188): put(x, y, INK if y in (92, 103) or x in (4, 187) else ROOF_D)
for x in range(80, 112):                      # stone chimney poking up through the roof plane
    for y in range(6, 34): put(x + 50, y, INK if x in (80, 111) or y == 6 else (112, 110, 104) if (x // 6 + y // 5) % 2 else (140, 136, 128))
for y in range(104, 186):                     # front wall: stacked logs, lit left, darker right
    for x in range(10, 182):
        band = (y - 104) % 10
        c = INK if x in (10, 181) else BARK_L if band < 3 and x < 120 else BARK if band < 8 else BARK_D
        put(x, y, c)
    if (y - 104) % 10 in (4, 5):
        put(10, y, END); put(11, y, END); put(180, y, END); put(181, y, END)   # log ends at the corners
box(80, 140, 111, 186, BARK_D, INK)           # closed plank door (bottom-middle cell)
for x in range(84, 108, 6):
    for y in range(144, 186): put(x, y, INK)
put(105, 164, END_L); put(106, 164, END_L)
for wx in (30, 134):                          # two windows with light glass and a sill
    box(wx, 120, wx + 27, 145, GLASS, INK)
    for y in range(122, 132):
        for x in range(wx + 2, wx + 10): put(x, y, GLASS_L)
    box(wx - 2, 146, wx + 29, 149, END, INK)
    for y in range(120, 146): put(wx + 13, y, INK)
for x in range(8, 184): put(x, 186, INK); put(x, 187, INK)

# --- woodpile (col 3 row 0): a stack of cut log ends under a small plank top
ox = 192
box(ox + 4, 24, ox + 59, 27, BARK_L, INK)     # plank top (lit)
for r, row in enumerate((5, 4, 5)):
    for i in range(row):
        log_end(ox + 10 + i * 11 + (0 if row == 5 else 5), 34 + r * 9, 5.5)
box(ox + 4, 58, ox + 59, 60, INK)
# --- axe block (col 4 row 0): a stump (lit top plane above bark face) with an axe bitten into it
ox = 256
for y in range(30, 58):
    for x in range(ox + 14, ox + 50): put(x, y, INK if x in (ox + 14, ox + 49) or y == 57 else BARK_L if x < ox + 26 else BARK if x < ox + 40 else BARK_D)
disc(ox + 32, 30, 18, 9, END, BARK_D); disc(ox + 30, 29, 9, 4.5, END_L)
for i in range(22):                           # handle, leaning up-left
    put(ox + 30 - i // 2, 26 - i, BARK_L); put(ox + 31 - i // 2, 26 - i, BARK); put(ox + 32 - i // 2, 26 - i, INK)
for y in range(22, 31):
    for x in range(ox + 31, ox + 42): put(x, y, STEEL_L if y < 25 else STEEL if x < ox + 41 else INK)
# --- mailbox (col 5 row 0): post and a red box with a lit curved top
ox = 320
box(ox + 29, 34, ox + 35, 60, BARK, INK)
for y in range(14, 36):
    for x in range(ox + 18, ox + 47):
        c = INK if x in (ox + 18, ox + 46) or y == 35 else RED if y > 22 else (214, 96, 80)
        if y < 18 and (x < ox + 21 or x > ox + 43): continue
        put(x, y, c)
for x in range(ox + 21, ox + 44): put(x, 13, INK)
box(ox + 46, 16, ox + 50, 24, RED_D, INK)     # flag
# --- laundry line (row 1, cols 3-5): posts at the ends, a line with hanging clothes across
for col, kind in ((3, 'l'), (4, 'm'), (5, 'r')):
    ox = col * 64; oy = 64
    if kind != 'm':
        px0 = ox + (6 if kind == 'l' else 52)
        box(px0, oy + 8, px0 + 5, oy + 60, BARK, INK); box(px0 - 3, oy + 8, px0 + 8, oy + 11, BARK_L, INK)
    xs = range(ox + (11 if kind == 'l' else 0), ox + (52 if kind == 'r' else 64))
    for x in xs: put(x, oy + 12, INK)
    for k, x0 in enumerate(range(xs.start + 4, xs.stop - 14, 20)):
        c = CLOTH[(col + k) % 3]
        for y in range(oy + 13, oy + 38):
            for x in range(x0, x0 + 14):
                put(x, y, INK if x in (x0, x0 + 13) or y == oy + 37 else c if x < x0 + 9 else tuple(v * 4 // 5 for v in c))
        put(x0 + 3, oy + 12, STEEL_L); put(x0 + 10, oy + 12, STEEL_L)
# --- dog house (col 3 row 2): pitched roof top plane (lit) over a plank front with a dark doorway
ox, oy = 192, 128
for y in range(8, 30):
    for x in range(ox + 6, ox + 58): put(x, oy + y, INK if y == 8 or x in (ox + 6, ox + 57) else RED if y < 24 else RED_D)
for y in range(30, 60):
    for x in range(ox + 10, ox + 54): put(x, oy + y, INK if x in (ox + 10, ox + 53) or y == 59 else BARK_L if (x - ox) % 8 < 6 and x < ox + 36 else BARK)
disc(ox + 32, oy + 48, 9, 11, INK); box(ox + 23, oy + 48, ox + 41, oy + 59, INK)
# --- garden patches (col 4/5 row 2): a raised bed, soil top plane with rows of greens, plank front face
for col, crop in ((4, 'leaf'), (5, 'bean')):
    ox, oy = col * 64, 128
    for y in range(14, 50):
        for x in range(ox + 4, ox + 60): put(x, oy + y, INK if x in (ox + 4, ox + 59) or y == 14 else SOIL if (y // 3) % 2 else SOIL_D)
    for y in range(50, 60):
        for x in range(ox + 4, ox + 60): put(x, oy + y, INK if x in (ox + 4, ox + 59) or y in (50, 59) else BARK_L if x < ox + 32 else BARK)
    for r in range(3):
        for i in range(6):
            cx, cy = ox + 11 + i * 8 + (r % 2) * 3, oy + 22 + r * 10
            if crop == 'leaf': disc(cx, cy, 3.5, 3, LEAF, LEAF_D); put(cx - 1, cy - 1, LEAF_L)
            else:
                for y in range(cy - 7, cy + 3): put(cx, y, LEAF_D)
                put(cx - 1, cy - 4, LEAF_L); put(cx + 1, cy - 2, LEAF); put(cx - 1, cy, LEAF)
# binary alpha check
assert set(im.getchannel('A').histogram()[1:255]) == {0}
for k in (1, 2, 3):
    im.resize((W * k, H * k), Image.NEAREST).save(os.path.join(OUT, f'tiles_{k}x', 'town_life.png'))
prev = Image.new('RGBA', (W, H), (96, 160, 64, 255)); prev.alpha_composite(im); prev.resize((W * 2, H * 2), Image.NEAREST).save('/tmp/town_life_preview.png')
print('ok')

# --- register (idempotent): tileset{,_2x,_3x}.json + tile_id_ledger.json, ids from 10970
import json
NAMES = [(f'tl_cabin_{r}_{c}', c, r, 'building') for r in range(3) for c in range(3)] + [
    ('tl_woodpile', 3, 0, 'deco'), ('tl_axe_block', 4, 0, 'deco'), ('tl_mailbox', 5, 0, 'deco'),
    ('tl_laundry_l', 3, 1, 'deco'), ('tl_laundry_m', 4, 1, 'deco'), ('tl_laundry_r', 5, 1, 'deco'),
    ('tl_dog_house', 3, 2, 'deco'), ('tl_garden_patch', 4, 2, 'deco'), ('tl_garden_patch_b', 5, 2, 'deco')]
LED = os.path.join(OUT, 'tools', 'tile_id_ledger.json'); led = json.load(open(LED))
for k, f in ((1, 'tileset.json'), (2, 'tileset_2x.json'), (3, 'tileset_3x.json')):
    p = os.path.join(OUT, f); ts = json.load(open(p)); have = {t['name'] for t in ts['tiles']}
    for i, (n, c, r, cat) in enumerate(NAMES):
        if n in have: continue
        ts['tiles'].append({'id': 10970 + i, 'name': n, 'category': cat, 'sheet': f'tiles_{k}x/town_life.png', 'index': r * 6 + c,
                            'col': c, 'row': r, 'walkable': False, 'collision': 'block', 'collision_code': 1, 'encounter': False,
                            'notes': 'small-town life kit (tools/towns/town_life_art.py)'})
        if k == 1: led['ids'][n] = 10970 + i
    json.dump(ts, open(p, 'w'))
json.dump(led, open(LED, 'w'), separators=(',', ':'))
