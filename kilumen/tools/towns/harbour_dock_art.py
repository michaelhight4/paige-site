"""Harbour dock kit (Gary, Oct 30 2026: Tidewater Coast fishing dock with moored boats). Same 35-degree view and binary
alpha as farm_pool_art.py. Writes tiles_{1,2,3}x/harbour_dock.png (8x2 cells of 64px), transparent background so the
animated water shows round the hull. Cells: (0,0) red rowboat, (1,0) teal rowboat, col 2 rows 0-1 fishing boat 1x2
(bow up); row 0 cols 3-6 plank deck, deck+barrel, deck+fish crate, deck+net (props are the existing kit art baked onto the deck). Each boat's art stays inside its own squares; collision 1 (block) on exactly those squares."""
import os, json
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
INK, WD_D, WD, WD_L = (44, 35, 32), (92, 60, 40), (128, 86, 54), (168, 120, 76)
W, H = 64 * 16, 64 * 4
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[x, y] = tuple(c[:3]) + (255,)
def hull(ox, oy, h, paint, paint_d):
    """Bow-up hull inside a 64 x h box: pointed bow, square stern, painted strake, wood thwarts, ink outline."""
    for y in range(4, h - 4):
        t = y - 4; half = min(22, 6 + t) if t < 16 else 22
        if y > h - 10: half = 20
        x0, x1 = 32 - half, 31 + half
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (4, h - 5)
            if edge: c = INK
            elif x - x0 < 4 or x1 - x < 4: c = paint if y < h // 2 else paint_d
            else: c = WD_L if (y // 3) % 4 else WD
            put(ox + x, oy + y, c)
        if (y - 4) % 22 == 18 and y < h - 10:
            for x in range(x0 + 4, x1 - 3): put(ox + x, oy + y, WD_D)
    for y in range(h - 8, h - 4):                       # darker front face of the stern (35-degree view)
        for x in range(14, 50): put(ox + x, oy + y, WD_D if y < h - 5 else INK)
hull(0, 0, 64, (176, 62, 52), (120, 40, 38))
hull(64, 0, 64, (60, 138, 140), (38, 96, 100))
hull(128, 0, 128, (232, 226, 210), (180, 172, 156))
for y in range(44, 70):                                 # fishing boat: little wheelhouse amidships
    for x in range(128 + 20, 128 + 44):
        put(x, y, INK if x in (148, 171) or y in (44, 69) else ((120, 160, 196) if y < 52 else (196, 192, 180)))
for y in range(84, 106):                                # coiled net in the stern well
    for x in range(128 + 18, 128 + 46):
        if (x + y) % 5 == 0 or (x - y) % 5 == 0: put(x, y, (96, 110, 92))
def deck(ox, oy):
    # full-square plank deck, boards run north-south (straight pier), ink rails on the west/east edges
    for y in range(64):
        for x in range(64):
            c = WD_D if x % 16 == 0 else (WD_L if (x // 16) % 2 else WD)
            if x in (0, 63): c = INK
            if (y + (x // 16) * 9) % 32 == 0 and x % 16: c = WD_D
            put(ox + x, oy + y, c)
TS = json.load(open(os.path.join(OUT, 'tileset.json'))); TT = {t['name']: t for t in TS['tiles']}
def kit(name):
    t = TT[name]; sh = Image.open(os.path.join(OUT, t['sheet'])).convert('RGBA'); c, r = t.get('col', t['index'] % 16), t.get('row', t['index'] // 16)
    return sh.crop((c * 64, r * 64, c * 64 + 64, r * 64 + 64))
for i, prop in enumerate((None, 'i_barrel', 'barrel', 'i_net')):   # col 3 deck, 4 deck+barrel, 5 deck+fish crate, 6 deck+net
    deck(64 * (3 + i), 0)
    if prop:
        a = kit(prop); a.putalpha(a.getchannel('A').point(lambda v: 255 if v >= 128 else 0)); im.alpha_composite(a, (64 * (3 + i), 0))
# --- trade hub additions (Gary, Oct 31 2026) ---
SAIL, ROPE, IRON, IRON_L = (226, 218, 196), (186, 156, 104), (70, 74, 84), (120, 126, 138)
def box(x0, y0, x1, y1, c, edge=INK):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, edge if x in (x0, x1) or y in (y0, y1) else c)
# cargo ship 3x4 cells at cols 8-10 rows 0-3 (bow up), hull stays 6 px inside the box so nothing touches the cell edges
OX = 64 * 8
for y in range(8, 250):
    half = min(88, 20 + (y - 8) * 2) if y < 42 else 88
    x0, x1 = 96 - half, 95 + half
    for x in range(x0, x1 + 1):
        if x in (x0, x1) or y in (8, 249): c = INK
        elif x - x0 < 8 or x1 - x < 8: c = (40, 70, 110) if y < 236 else (28, 50, 80)
        elif y >= 236: c = WD_D
        else: c = WD_L if (x // 12) % 2 else WD
        put(OX + x, y, c)
box(OX + 56, 70, OX + 135, 140, WD_D)                     # open cargo hatch
box(OX + 62, 76, OX + 129, 134, (40, 30, 26), (40, 30, 26))
for cx, cy in ((64, 96), (96, 104), (100, 80)):           # crates down in the hold
    box(OX + cx, cy, OX + cx + 22, cy + 20, (196, 150, 90))
for y in range(150, 214):                                 # mast + furled sail
    for x in range(92, 100): put(OX + x, y, INK if x in (92, 99) else WD_D)
box(OX + 50, 172, OX + 141, 182, SAIL)
box(OX + 70, 222, OX + 121, 232, (150, 70, 50))           # stern cabin roof
for i in range(3):                                        # deck crates waiting to be lifted
    box(OX + 34 + i * 6, 44 + i * 9, OX + 58 + i * 6, 66 + i * 9, (204, 160, 96))
# crane / pulley 1x2 at col 11 rows 0-1: timber post on an iron base, jib arm + hook kept inside the cell
CX = 64 * 11
for y in range(10, 122):
    for x in range(26, 36): put(CX + x, y, INK if x in (26, 35) else (WD if x < 31 else WD_D))
box(CX + 8, 10, CX + 58, 18, WD)                          # jib arm
box(CX + 14, 104, CX + 50, 124, IRON_L, INK)              # base
for y in range(19, 48): put(CX + 52, y, ROPE)             # rope + hook
box(CX + 48, 48, CX + 56, 56, IRON)
box(CX + 44, 58, CX + 60, 72, (204, 160, 96))             # crate on the hook
# grain sacks 1x1 at col 12 row 0
SX = 64 * 12
for bx, by in ((8, 26), (32, 26), (20, 8)):
    for y in range(by, by + 28):
        for x in range(bx, bx + 24):
            d = ((x - bx - 12) / 12) ** 2 + ((y - by - 14) / 14) ** 2
            if d <= 1: put(SX + x, y, INK if d > 0.78 else ((214, 190, 140) if y < by + 14 else (184, 160, 112)))
# flag buoy 1x1 at col 13 row 0: red/white float with a little pennant (transparent around it so the water shows)
BX = 64 * 13
for y in range(36, 58):
    for x in range(18, 46):
        d = ((x - 32) / 14) ** 2 + ((y - 47) / 11) ** 2
        if d <= 1: put(BX + x, y, INK if d > 0.8 else ((210, 50, 44) if y < 44 or y > 51 else (240, 236, 228)))
for y in range(10, 38): put(BX + 31, y, INK); put(BX + 32, y, INK)
for y in range(10, 24):
    for x in range(33, 33 + (24 - y) + 6 if y > 17 else 33 + 14):
        put(BX + x, y, INK if y in (10, 23) or x == 32 + 14 else (240, 196, 60))
assert set(im.getchannel('A').histogram()[1:255]) == {0}
for k in (1, 2, 3):
    im.resize((W * k, H * k), Image.NEAREST).save(os.path.join(OUT, f'tiles_{k}x', 'harbour_dock.png'))
BASE = 12701  # above every runtime kit (tileset_arena.json tops out at 12686; 11001+ is taken at runtime)
NAMES = [('hd_rowboat_red', 0, 0), ('hd_rowboat_teal', 1, 0), ('hd_fishboat_0', 2, 0), ('hd_fishboat_1', 2, 1),
         ('bridge_dock', 3, 0), ('hd_deck_barrel', 4, 0), ('hd_deck_crate', 5, 0), ('hd_deck_net', 6, 0)]
NAMES += [(f'hd_cargoship_{c}_{r}', 8 + c, r) for r in range(4) for c in range(3)] + [('hd_crane_top', 11, 0), ('hd_crane_base', 11, 1), ('hd_sacks', 12, 0), ('hd_buoy_flag', 13, 0)]
KIT = set()
for kf in ('tileset_arena.json', 'tileset_hallart.json', 'tileset_hallanim.json', 'tileset_ix2.json'):
    KIT |= {t['id'] for t in json.load(open(os.path.join(OUT, kf)))['tiles']}
assert not KIT & set(range(BASE, BASE + len(NAMES))), 'id clash with a runtime kit'
LED = os.path.join(OUT, 'tools', 'tile_id_ledger.json'); led = json.load(open(LED))
for k, f in ((1, 'tileset.json'), (2, 'tileset_2x.json'), (3, 'tileset_3x.json')):
    p = os.path.join(OUT, f); ts = json.load(open(p)); have = {t['name'] for t in ts['tiles']}
    assert not {t['id'] for t in ts['tiles'] if t['name'] not in {n[0] for n in NAMES}} & set(range(BASE, BASE + len(NAMES)))
    for i, (n, c, r) in enumerate(NAMES):
        if n in have: ts['tiles'] = [t for t in ts['tiles'] if t['name'] != n]
        ts['tiles'].append({'id': BASE + i, 'name': n, 'category': 'deco', 'sheet': f'tiles_{k}x/harbour_dock.png', 'index': r * 16 + c,
                            'col': c, 'row': r, 'walkable': n == 'bridge_dock', 'collision': 'walk' if n == 'bridge_dock' else 'block', 'collision_code': 0 if n == 'bridge_dock' else 1,
                            'encounter': False, 'notes': 'harbour dock kit (tools/towns/harbour_dock_art.py)'})
        if k == 1: led['ids'][n] = BASE + i
    json.dump(ts, open(p, 'w'))
json.dump(led, open(LED, 'w'), separators=(',', ':'))
print('ok', BASE, BASE + len(NAMES) - 1)
