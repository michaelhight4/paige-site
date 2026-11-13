#!/usr/bin/env python3
"""Brookhollow autotile trial (COPY ONLY). Reproduce:  python3 qa/autotile_port/brookhollow_trial/run_trial.py
Reads live files read-only, copies them into ./copy/, and writes every output under this folder.
 1. copy inputs (+ sha1 manifest; the live sha1s are re-checked at the end and must be unchanged)
 2. terrain.json  = semantic terrain grid (the LDtk 'Terrain' IntGrid) recovered from the copied ground layer
 3. rules.json    = declarative ground rule set: World Design's own build.resolve() logic as data (priority, 8-neighbour mask,
                    majority lower terrain, position-hash variants); no tile art is drawn here
 4. autotile.py-style engine below: terrain + rules -> ground layer -> copy/maps/brookhollow_rule.json
 5. checks (ids exist, only 'ground' may differ, collision/encounter/entities identical) -> check_report.json
 6. edit demo: paint new terrain (pond + path spur) on the terrain grid only, let the rules place the edges; missing tiles
    fall back: same-mask other wobble (hand-made) -> same blob-47 key (hand-made) -> tilegen/out gap-fill (FLAGGED)
 7. before_after.png (day + night, current | rule-placed | diff overlay) and edit_demo.png
"""
import json, os, sys, shutil, hashlib, collections, itertools, re
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.abspath(os.path.join(HERE, '..', '..', '..')); CP = os.path.join(HERE, 'copy')
TILEGEN = '/workspace/quality/toolkit/tilegen/out'
sys.path.insert(0, os.path.join(OW, 'tools')); sys.dont_write_bytecode = True
import time_of_day as TOD          # pure functions only (render_map/apply/emissive_masks with ow=CP); no build() call
def sha(p): return hashlib.sha1(open(p, 'rb').read()).hexdigest()

# ---------- 1. copy ----------
INPUTS = ['maps/brookhollow.json', 'tileset.json', 'palette.hex', 'time_of_day/grades.json'] + \
         sorted({t['sheet'] for t in json.load(open(os.path.join(OW, 'tileset.json')))['tiles']})
LIVE_SHA = {p: sha(os.path.join(OW, p)) for p in INPUTS}
if os.path.isdir(CP): shutil.rmtree(CP)
for p in INPUTS:
    os.makedirs(os.path.dirname(os.path.join(CP, p)), exist_ok=True); shutil.copy2(os.path.join(OW, p), os.path.join(CP, p))
json.dump(LIVE_SHA, open(os.path.join(HERE, 'copy_manifest.json'), 'w'), indent=1)

TS = json.load(open(os.path.join(CP, 'tileset.json'))); ID = {t['id']: t['name'] for t in TS['tiles']}; BYN = {t['name']: t['id'] for t in TS['tiles']}
M0 = json.load(open(os.path.join(CP, 'maps/brookhollow.json'))); W, H = M0['width'], M0['height']
def grid(layer): g = M0['layers'][layer]; return [list(r) for r in g] if isinstance(g[0], list) else [g[y * W:(y + 1) * W] for y in range(H)]
G0 = grid('ground')

# ---------- 3. rules (data) ----------
RULES = {
 'source': "World Design tools/build.py resolve() + ground.py (vhash, NV=4, NW=3) + build.WATER_NV=3, expressed as data",
 'priority': {'grass': 0, 'grass_dark': 0, 'cave': 0, 'mud': 1, 'sand': 1, 'snow': 1, 'path': 2, 'trail': 2, 'water': 3, 'cave_water': 3},
 'intgrid': {'grass': 1, 'grass_dark': 2, 'cave': 3, 'mud': 4, 'sand': 5, 'snow': 6, 'path': 7, 'trail': 8, 'water': 9, 'cave_water': 10, 'cavewall': 11},
 'neighbours': {'sides': ['N', 'E', 'S', 'W'], 'diags': ['NE', 'SE', 'SW', 'NW'], 'bit': '1 = neighbour terrain has LOWER priority (the edge faces it); off-map = same'},
 'edge_tile': '{T}>{A}_{sides}_{diags}{wob}  (A = most common lower neighbour; wob = "" if w==0 else "_w{w}")',
 'base_tile': '{T}_{v} (v = vhash % 4); water/cave_water: {T} if v%3==0 else {T}_{v%3}',
 'variant_hash': 'vhash(x,y) (ground.py); base v = h % 4, edge wobble w = (h >> 8) % 3',
 'cavewall': 'face_l if S is floor; face_u if S2 is floor; else side_e/side_w/side_ew/top by floor within x+-1, y..y+2',
 'not_rule_placed': 'decoration/overlay layers (trees, ledges, cliffs, tall grass, fences, buildings) keep their own placement code',
}
json.dump(RULES, open(os.path.join(HERE, 'rules.json'), 'w'), indent=1)
PRIO = RULES['priority']
def vhash(x, y):
    h = ((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) & 0xffffffff
    h = ((h ^ (h >> 15)) * 0x2c1b3c6d) & 0xffffffff
    h = ((h ^ (h >> 12)) * 0x297a2d39) & 0xffffffff
    return h ^ (h >> 15)

# ---------- 2. terrain grid ----------
def terr_of(n):
    if '>' in n: return n.split('>')[0]
    if n.startswith('cavewall'): return 'cavewall'
    m = re.match(r'^(grass_dark|grass|path|trail|sand|snow|mud|cave_water|cave|water)(_\d+)?$', n)
    if not m: raise SystemExit(f'unknown ground tile {n}')
    return m.group(1)
TERR = [[terr_of(ID[v]) for v in row] for row in G0]
json.dump(dict(map='brookhollow', width=W, height=H, codes=RULES['intgrid'],
               intgrid=[[RULES['intgrid'][t] for t in row] for row in TERR]), open(os.path.join(HERE, 'terrain.json'), 'w'))

# ---------- 4. engine ----------
def place(terr):
    w, h = len(terr[0]), len(terr); tr = lambda x, y: terr[y][x] if 0 <= x < w and 0 <= y < h else None
    out = [[None] * w for _ in range(h)]; junction = set()
    for y in range(h):
        for x in range(w):
            t = terr[y][x]
            if t == 'cavewall':
                if tr(x, y + 1) not in ('cavewall', None): nm = 'cavewall_face_l'
                elif tr(x, y + 2) not in ('cavewall', None): nm = 'cavewall_face_u'
                else:
                    fl = lambda xx: any(tr(xx, yy) not in ('cavewall', None) for yy in (y, y + 1, y + 2)); e, w_ = fl(x + 1), fl(x - 1)
                    nm = 'cavewall_side_ew' if e and w_ else 'cavewall_side_e' if e else 'cavewall_side_w' if w_ else 'cavewall_top'
                out[y][x] = nm; continue
            p = PRIO[t]
            low = lambda xx, yy: (lambda n: n if (n is not None and n in PRIO and PRIO[n] < p) else None)(tr(xx, yy))
            s = [low(x, y - 1), low(x + 1, y), low(x, y + 1), low(x - 1, y)]; d = [low(x + 1, y - 1), low(x + 1, y + 1), low(x - 1, y + 1), low(x - 1, y - 1)]
            lows = [v for v in s + d if v]; hh = vhash(x, y)
            if not lows:
                v = hh % 4; out[y][x] = (t if v % 3 == 0 else f'{t}_{v % 3}') if t in ('water', 'cave_water') else f'{t}_{v}'; continue
            if len(set(lows)) > 1: junction.add((x, y))
            A = collections.Counter(lows).most_common(1)[0][0]; wv = (hh >> 8) % 3
            out[y][x] = f'{t}>{A}_' + ''.join('1' if v else '0' for v in s) + '_' + ''.join('1' if v else '0' for v in d) + (f'_w{wv}' if wv else '')
    return out, junction

def canon(nm):
    m = re.match(r'^(.+?>.+?)_([01]{4})_([01]{4})(?:_w\d)?$', nm)
    if not m: return None
    N, E, S, Wd = (int(c) for c in m.group(2)); NE, SE, SW, NW = (int(c) for c in m.group(3))
    return m.group(1), (N, E, S, Wd, NE and not N and not E, SE and not S and not E, SW and not S and not Wd, NW and not N and not Wd)
CANON = collections.defaultdict(list)
for n in BYN:
    c = canon(n)
    if c: CANON[c].append(n)
TG = {'path>grass': 'path_grass/path_grass_blob47', 'water>grass': 'water_grass/water_grass_blob47', 'sand>grass': 'sand_grass/sand_grass_blob47'}
GAP_TILES = {}      # name -> RGBA tile (tilegen gap-fill, FLAGGED)
def tilegen_tile(nm):
    pair, key = canon(nm)
    if pair not in TG: return None
    meta = json.load(open(f'{TILEGEN}/{TG[pair]}.autotile.json')); sheet = Image.open(f'{TILEGEN}/{TG[pair]}.png').convert('RGBA')
    N, E, S, Wd, NE, SE, SW, NW = key; same = lambda low: 0 if low else 1   # autotiler bit = neighbour is the SAME (foreground) terrain
    mask = same(N) * 1 + same(E) * 4 + same(S) * 16 + same(Wd) * 64
    for bit, dg, a, b in ((2, NE, N, E), (8, SE, S, E), (32, SW, S, Wd), (128, NW, N, Wd)):
        if not a and not b and not dg: mask += bit
    for t in meta['tiles']:
        if t['mask'] == mask: return sheet.crop((t['x'] * 64, t['y'] * 64, t['x'] * 64 + 64, t['y'] * 64 + 64))
    return None
def resolve_names(names):
    """name grid -> (id grid, {(x,y): how}) ; how in exact / wobble_fallback / blob_key_fallback / tilegen_gapfill / MISSING"""
    ids = [[0] * len(names[0]) for _ in names]; how = {}
    for y, row in enumerate(names):
        for x, nm in enumerate(row):
            if nm in BYN: ids[y][x] = BYN[nm]; how[(x, y)] = 'exact'; continue
            w0 = re.sub(r'_w\d$', '', nm)
            if w0 in BYN: ids[y][x] = BYN[w0]; how[(x, y)] = 'wobble_fallback'; continue
            c = canon(nm)
            if c and CANON.get(c): ids[y][x] = BYN[sorted(CANON[c])[0]]; how[(x, y)] = 'blob_key_fallback'; continue
            im = tilegen_tile(nm) if c else None
            if im is not None: GAP_TILES[nm] = im; ids[y][x] = -1; how[(x, y)] = 'tilegen_gapfill'; continue
            how[(x, y)] = 'MISSING'
    return ids, how

NAMES, JUNC = place(TERR)
G1, HOW = resolve_names(NAMES)
M1 = json.loads(json.dumps(M0)); M1['name'] = 'brookhollow_rule'; M1['layers']['ground'] = G1
M1['autotile_trial'] = dict(rules='qa/autotile_port/brookhollow_trial/rules.json', terrain='qa/autotile_port/brookhollow_trial/terrain.json')
json.dump(M1, open(os.path.join(CP, 'maps/brookhollow_rule.json'), 'w'), separators=(',', ':'))

# ---------- 5. checks ----------
diff = [(x, y) for y in range(H) for x in range(W) if G1[y][x] != G0[y][x]]
rep = dict(cells=W * H, changed_cells=len(diff), changed=[[x, y, ID.get(G0[y][x]), NAMES[y][x]] for x, y in diff],
           placement=dict(collections.Counter(HOW.values())), three_way_junction_cells=sorted(map(list, JUNC)),
           ids_exist=all(v in ID for row in G1 for v in row),
           other_layers_identical=all(M1['layers'][k] == M0['layers'][k] for k in M0['layers'] if k != 'ground'),
           entities_identical=all(M1[k] == M0[k] for k in M0 if k not in ('layers', 'name')),
           walk_rule_unchanged=all(TS['tiles'][0] is not None and (ID[G1[y][x]] and next(t for t in TS['tiles'] if t['id'] == G1[y][x])['collision'] == next(t for t in TS['tiles'] if t['id'] == G0[y][x])['collision']) for x, y in diff) if diff else True)

# ---------- 6. edit demo (terrain grid only) ----------
D0 = grid('decoration'); O0 = grid('overlay'); C0 = grid('collision')
def free(x, y): return 0 <= x < W and 0 <= y < H and TERR[y][x] == 'grass' and not D0[y][x] and not O0[y][x] and not C0[y][x]
# fixed demo spot (open lawn east of the south path, x25-31 y22-28; asserted free): pond + a path spur off the existing path
POND = [(27, 23), (28, 23), (29, 23), (27, 24), (28, 24), (29, 24), (30, 24), (28, 25), (29, 25)]
SPUR = [(25, 27), (26, 27), (27, 27), (28, 27), (29, 27), (29, 26)]
assert all(free(x, y) for x, y in POND + SPUR), 'demo spot no longer free'
best = (25, 23); TE = [row[:] for row in TERR]
for x, y in POND: TE[y][x] = 'water'
for x, y in SPUR: TE[y][x] = 'path'
edit_cells = POND + SPUR
NE_, JE = place(TE); GE, HOWE = resolve_names(NE_)
de = [(x, y) for y in range(H) for x in range(W) if NE_[y][x] != NAMES[y][x]]
rep['edit_demo'] = dict(origin=best, painted_cells=len(edit_cells), cells_retiled_by_rules=len(de),
                        placement_of_retiled=dict(collections.Counter(HOWE[c] for c in de)),
                        gapfill_tiles_FLAGGED=sorted(GAP_TILES), missing=[[x, y, NE_[y][x]] for (x, y) in de if HOWE[(x, y)] == 'MISSING'],
                        fallbacks=[[x, y, NE_[y][x], HOWE[(x, y)]] for (x, y) in de if HOWE[(x, y)] != 'exact'])

# ---------- 7. renders ----------
GR = json.load(open(os.path.join(CP, 'time_of_day/grades.json')))['grades']; MASKS = TOD.emissive_masks(ow=CP)
def render_grid(ground, gname, extra=None):
    m = json.loads(json.dumps(M0)); m['layers']['ground'] = [[v if v > 0 else 0 for v in r] for r in ground]
    json.dump(m, open(os.path.join(CP, 'maps/_render.json'), 'w')); im = TOD.render_map('_render', GR, gname, MASKS, ow=CP).convert('RGBA')
    if extra:      # tilegen gap-fill cells (id -1): draw under deco/overlay is skipped here; marked in the overlay instead
        tab = dict(GR[gname], _name=gname)
        for (x, y), nm in extra.items():
            t = GAP_TILES[nm] if gname == 'day' else TOD.apply(GAP_TILES[nm], tab); im.paste(t, (x * 64, y * 64))
    os.remove(os.path.join(CP, 'maps/_render.json')); return im
def overlay(im, cells, col, junc=(), edits=()):
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay); d.rectangle([0, 0, im.width, im.height], fill=(0, 0, 0, 110))
    for x, y in cells: d.rectangle([x * 64, y * 64, x * 64 + 63, y * 64 + 63], fill=col + (70,), outline=col + (255,), width=4)
    for x, y in edits: d.rectangle([x * 64 + 6, y * 64 + 6, x * 64 + 57, y * 64 + 57], outline=(80, 200, 255, 255), width=3)
    for x, y in junc: d.rectangle([x * 64 + 6, y * 64 + 6, x * 64 + 57, y * 64 + 57], outline=(255, 210, 0, 255), width=3)
    return Image.alpha_composite(im.convert('RGBA'), lay)
def label(im, text):
    out = Image.new('RGBA', (im.width, im.height + 40), (20, 16, 28, 255)); out.paste(im, (0, 40)); ImageDraw.Draw(out).text((8, 12), text, fill=(240, 240, 240)); return out
S = 0.5
def sm(im): return im.resize((int(im.width * S), int(im.height * S)), Image.NEAREST)
rows = []
for g in ('day', 'night'):
    a = render_grid(G0, g); b = render_grid(G1, g)
    px = np.asarray(a.convert('RGB')) != np.asarray(b.convert('RGB')); pxn = int(px.any(2).sum())
    rows.append([label(sm(a), f'CURRENT brookhollow ({g})'), label(sm(b), f'RULE-PLACED from terrain.json + rules.json ({g})'),
                 label(sm(overlay(b, diff, (255, 40, 120), JUNC)), f'DIFF: {len(diff)} changed cells, {pxn} changed px ({g}); yellow = 3-way junction cells')])
    rep[f'pixel_diff_{g}'] = pxn
cw, ch = rows[0][0].size; sheet = Image.new('RGBA', (cw * 3, ch * 2), (20, 16, 28, 255))
for r, row in enumerate(rows):
    for c, im in enumerate(row): sheet.paste(im, (c * cw, r * ch))
sheet.convert('RGB').save(os.path.join(HERE, 'before_after.png'))
if best:
    gx = {(x, y): NE_[y][x] for (x, y) in de if HOWE[(x, y)] == 'tilegen_gapfill'}
    box = (20 * 64, 20 * 64, 33 * 64, 30 * 64)
    cols = []
    for g in ('day', 'night'):
        a = render_grid(G0, g).crop(box); b = render_grid(GE, g, gx)
        sh = lambda cells: [(x - box[0] // 64, y - box[1] // 64) for x, y in cells]
        ov = overlay(b, [c for c in de if HOWE[c] != 'exact'], (255, 40, 120), (), edit_cells).crop(box)
        cols.append([label(a, f'current ({g})'), label(b.crop(box), f'terrain painted, edges by rules ({g})'), label(ov, 'blue = painted cells; pink = fallback/gap-fill tiles')])
    cw, ch = cols[0][0].size; ed = Image.new('RGBA', (cw * 3, ch * 2), (20, 16, 28, 255))
    for r, row in enumerate(cols):
        for c, im in enumerate(row): ed.paste(im, (c * cw, r * ch))
    ed.convert('RGB').save(os.path.join(HERE, 'edit_demo.png'))
    for nm, im in GAP_TILES.items(): os.makedirs(os.path.join(HERE, 'gapfill_FLAGGED'), exist_ok=True); im.save(os.path.join(HERE, 'gapfill_FLAGGED', nm.replace('>', '_on_') + '.png'))

rep['live_files_unchanged'] = all(sha(os.path.join(OW, p)) == s for p, s in LIVE_SHA.items())
json.dump(rep, open(os.path.join(HERE, 'check_report.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in rep.items() if k not in ('changed',)}, indent=1)[:3000])
ok = rep['ids_exist'] and rep['other_layers_identical'] and rep['entities_identical'] and rep['live_files_unchanged'] and not rep['edit_demo']['missing']
print('TRIAL CHECK:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
