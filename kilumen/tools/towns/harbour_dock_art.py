"""Harbour dock kit (Gary, Oct 30 2026: Tidewater Coast fishing dock with moored boats). Same 35-degree view and binary
alpha as farm_pool_art.py. Writes tiles_{1,2,3}x/harbour_dock.png (8x2 cells of 64px), transparent background so the
animated water shows round the hull. Cells: (0,0) red rowboat, (1,0) teal rowboat, col 2 rows 0-1 fishing boat 1x2
(bow up); row 0 cols 3-6 plank deck, deck+barrel, deck+fish crate, deck+net (props are the existing kit art baked onto the deck). Each boat's art stays inside its own squares; collision 1 (block) on exactly those squares."""
import os, json
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'world', 'overworld')
INK, WD_D, WD, WD_L = (44, 35, 32), (92, 60, 40), (128, 86, 54), (168, 120, 76)
W, H = 64 * 8, 64 * 2
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
assert set(im.getchannel('A').histogram()[1:255]) == {0}
for k in (1, 2, 3):
    im.resize((W * k, H * k), Image.NEAREST).save(os.path.join(OUT, f'tiles_{k}x', 'harbour_dock.png'))
BASE = 12701  # above every runtime kit (tileset_arena.json tops out at 12686; 11001+ is taken at runtime)
NAMES = [('hd_rowboat_red', 0, 0), ('hd_rowboat_teal', 1, 0), ('hd_fishboat_0', 2, 0), ('hd_fishboat_1', 2, 1),
         ('bridge_dock', 3, 0), ('hd_deck_barrel', 4, 0), ('hd_deck_crate', 5, 0), ('hd_deck_net', 6, 0)]
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
