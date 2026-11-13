"""Build art/world/overworld/maps/house_1f_v2.json (DEV, loaded in place of house_1f only with ?ix2=1).
Gary-approved restructure of the TEST ROOM only (Oct 28, 2026): functional zones, worn kit variants.
Keeps: door warp (5,9) + door mat, stairs (cols 10-11, warp (10,3)), stairs mat (10,4), windows (4 / 8), Ron, item, all text refs."""
import json, os, copy, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); OW = os.path.join(ROOT, 'art/world/overworld')
cat = {c['key']: c for c in json.load(open('/workspace/quality/dev_notes/kilumen_interiors_kit.json'))}
m = json.load(open(os.path.join(OW, 'maps/house_1f.json'))); v = copy.deepcopy(m)
W, H = m['width'], m['height']; L = v['layers']
KEEP = {39, 42, 44, 47, 50, 545, 1186, 1190, 2105, 2106, 2107, 2108, 816, 2113}   # floor, walls, door mat, windows, stairs
for ln in ('decoration', 'overlay'):
    for y in range(H):
        for x in range(W):
            if L[ln][y][x] not in KEEP: L[ln][y][x] = 0
L['ground'] = [[39 if y >= 3 else r[x] for x, _ in enumerate(r)] for y, r in enumerate(m['layers']['ground'])]   # old 1-tile rug removed
coll = L['collision']
for y in range(3, H):
    for x in range(W): coll[y][x] = 0
coll[3][10] = 4; coll[3][11] = 1; coll[9][5] = 4                                     # stairs warp + stair wall, door warp
def put(key, x, y, block=True):
    c = cat['kit_' + key]; w, hh = map(int, c['size'].split('x')); ids = c['ids_rowmajor']
    for k, tid in enumerate(ids):
        cx, cy = x + k % w, y - (hh - 1) + k // w
        layer = 'overlay' if (hh == 2 and k // w == 0) else 'decoration'
        if c['collision'] == 'walk': layer = 'decoration'
        L[layer][cy][cx] = tid
        if block and c['collision'] == 'block' and layer == 'decoration' and cy >= 3: coll[cy][cx] = 1
# --- kitchen: back wall (bases on the wall-face row 2, tops on row 1)
put('fridge3_worn_teal', 0, 2); put('kitchen_counter3_worn_teal', 1, 2); put('kitchen_sink3_worn_teal', 2, 2); put('kitchen_stove3_worn_teal', 3, 2)  # pass 4 redraws
# --- dining: table with side-facing chairs
put('table3_worn_brown', 1, 6); coll[5][1] = coll[5][2] = 1; put('chair3_worn_brown_r', 0, 6); put('chair3_worn_brown_l', 3, 6)  # pass 3: raised 2x2 table, side-view chairs
put('rug_worn_red', 0, 4) if False else None
# --- living: TV on the back wall, rug under the seating, sofa + armchair facing in, side table + lamp
put('cork3_worn_brown', 7, 2); put('clock3_worn_brown', 6, 1)  # pass 3: job-listings corkboard, clock shelf (taller dressed wall)
# rug: baked over the floor (ground layer, so furniture can stand on it). Ids 9901+ in ix2_rugfloor.png (re-run after kit.py)
from PIL import Image
ts = {t['id']: t for t in json.load(open(os.path.join(OW, 'tileset.json')))['tiles']}; fl = ts[39]
src = Image.open(os.path.join(OW, 'tiles_1x/interior_v2.png')).convert('RGBA'); i = fl['index']
floor = src.crop(((i % 16) * 64, (i // 16) * 64, (i % 16) * 64 + 64, (i // 16) * 64 + 64))
kitimg = Image.open(os.path.join(OW, 'tiles_1x/ix2_kit.png')).convert('RGBA'); kjs = json.load(open(os.path.join(OW, 'tileset_ix2.json')))
kjs['tiles'] = [t for t in kjs['tiles'] if t['id'] < 9900]
rug = cat['kit_rug_worn_purple']; sheet = Image.new('RGBA', (16 * 64, 64), (0, 0, 0, 0))
for k, tid in enumerate(rug['ids_rowmajor']):
    j = tid - 9001; cell = floor.copy(); cell.alpha_composite(kitimg.crop(((j % 16) * 64, (j // 16) * 64, (j % 16) * 64 + 64, (j // 16) * 64 + 64)))
    if k // 3 == 2 and k % 3 < 2:                                                          # TV glow across the rug's bottom row
        B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]   # pass 4: finer ordered (Bayer 4x4) glow, fades up from the TV
        for yy in range(16, 64):
            for xx in range(64):
                gx = (k % 3) * 64 + xx; edge = min(gx - 8, 120 - gx)                   # soften toward the screen's ends
                t = (yy - 16) / 48 * 7 * max(0.0, min(1.0, edge / 24))
                if B4[yy % 4][xx % 4] < t: cell.putpixel((xx, yy), (74, 112, 186, 255) if B4[yy % 4][xx % 4] < t - 3 else (70, 146, 206, 255))
    sheet.paste(cell, (k * 64, 0)); nid = 9901 + k
    kjs['tiles'].append({'id': nid, 'name': 'kit_rug_worn_purple_on_floor39_%d_%d' % (k // 3, k % 3), 'category': 'interior', 'sheet': 'tiles_1x/ix2_rugfloor.png', 'index': k, 'col': k, 'row': 0, 'walkable': True, 'collision': 'walk', 'collision_code': 0, 'encounter': False})
    L['ground'][3 + k // 3][6 + k % 3] = nid
for z in (1, 2, 3): sheet.resize((sheet.width * z, 64 * z), Image.NEAREST).save(os.path.join(OW, 'tiles_%dx/ix2_rugfloor.png' % z))
json.dump(kjs, open(os.path.join(OW, 'tileset_ix2.json'), 'w'), indent=1)
put('couch_low_worn_navy', 6, 4); put('tv_back_worn_brown', 6, 6); put('side3_worn_brown', 8, 4)  # Gary 1:24 AM: couch faces the door wall, flat TV back toward the player, rug between; coin-jar side table
# --- wall: art + photos/calendar, Ron's bookcase
put('wall_art_worn_teal', 5, 1); put('photos_worn_teal', 6, 2); put('bookshelf3_worn_brown', 9, 2)  # Gary: test3 worn shelf
put('wall_art_worn_teal', 1, 0) if False else None
# --- door: coat rack + shoes; corner plant; Ron's corner: radio, rods, boxes, basket, books
put('coat_rack3_worn_red', 4, 9); put('shoes_worn_blue', 6, 9); put('plant_tall3_worn_green', 0, 9)
put('radio_worn_red', 11, 5); put('rods_worn_green', 11, 6); put('crates3_worn_red', 10, 8); put('basket_worn_green', 11, 7); put('book_stack_worn_red', 3, 9)
# pass 4: truly taller back wall -> row 0 becomes wallpaper under a crown moulding (3-tile wall face, no coordinate change)
L['ground'][0] = [cat['kit_wall_cap_tall_worn_cream']['ids_rowmajor'][0]] * W
# wall decoration cells use the decoration layer; the wall rows stay blocked anyway
for sp in v['interact_spots']:
    if sp['id'] == 'tv': sp.update({'x': 6, 'y': 6, 'stand': [6, 7]}); sp['note'] = 'ix2 pass 3: flat-screen TV on a low stand, back toward the player, screen facing the couch'
v['note_ix2'] = 'DEV test room (Gary-approved restructure, Oct 28, 2026): loaded instead of house_1f only with ?ix2=1. Generated by tools/interiors_v2/build_house_v2.py.'
v['tileset_extra_ix2'] = '../tileset_ix2.json'
json.dump(v, open(os.path.join(OW, 'maps/house_1f_v2.json'), 'w'), indent=1)
# --- reachability check: every interaction / warp / NPC neighbour reachable from the door stand (5,8)
walk = lambda x, y: 0 <= x < W and 0 <= y < H and coll[y][x] in (0,)
seen = {(5, 8)}; q = collections.deque([(5, 8)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (x + dx, y + dy)
        if n not in seen and walk(*n): seen.add(n); q.append(n)
need = {'door stand': (5, 8), 'stairs mat (10,4)': (10, 4), 'below stairs warp (10,4)': (10, 4)}
for sp in v['interact_spots']: need['spot ' + sp['id']] = tuple(sp['stand'])
for n in v['npcs']: need['next to ' + n['id']] = next((p for p in ((n['x'] - 1, n['y']), (n['x'] + 1, n['y']), (n['x'], n['y'] - 1), (n['x'], n['y'] + 1)) if p in seen), None) or (n['x'], n['y'] + 99)
for it in v.get('items', []): need['item ' + it['id']] = (it['x'], it['y'])
bad = {k: p for k, p in need.items() if p not in seen}
print('unreachable:', bad or 'none'); print('ron cell walkable/free:', coll[6][9] == 0)
for y in range(H): print(''.join('#' if coll[y][x] == 1 else ('D' if coll[y][x] == 4 else ('.' if (x, y) in seen else ' ')) for x in range(W)))
