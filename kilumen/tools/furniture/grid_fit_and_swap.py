#!/usr/bin/env python3
"""grid_fit_and_swap.py - fit every furniture/prop asset to the 64px grid, fix collision, swap to the room-type kit.

Standalone: Python 3.8+ and Pillow only, no machine-specific paths. Works on Windows/macOS/Linux.

    python tools/furniture/grid_fit_and_swap.py <path-to-kilumen-folder>              # dry run: report only (default)
    python tools/furniture/grid_fit_and_swap.py <path> --apply                        # write tileset + maps (+ trim art)
    python tools/furniture/grid_fit_and_swap.py <path> --check                        # exit 1 if any gap is blocked / art overhangs
    options: --report FILE (default <path>/tools/furniture/grid_fit_report.md)  --overworld (also rewrite overworld maps)
             --no-swap  --no-trim  --tile 64  --sliver 0.04

How it works (per asset DEFINITION, not per placement - fix once in data, applies everywhere):
 1. Every managed tile (furniture / prop / deco / interior kit; not floors, rugs, walls, buildings, terrain) is grouped
    into its asset by name (`name_r_c` cells). The art each tile really draws (the *_v3 / *_v2 / base sheet the game
    loads) is trimmed to its opaque pixels (alpha >= 200 - soft shadows don't count).
 2. That trimmed box, snapped to whole 64px squares, is the footprint: a cell is in it when it holds more than
    --sliver (4%) of opaque art. Footprint cells block, the rest walk. Thin slivers outside it are overhang: --apply
    clears them from the art (all 1x/2x/3x sheets) so nothing spills onto a neighbour square.
 3. Tile data (`walkable` / `collision` / `collision_code`) is rewritten to the footprint.
 4. Each map's collision is recomputed only on squares that hold a managed asset (codes walk/block only; doors, stairs,
    water, ledges, warps are never touched): block iff some tile on that square blocks. Interiors are rewritten;
    overworld maps are report-only unless --overworld.
 5. Swap: the map's room set (home / lab / shop) is picked from its name and generic old pieces are swapped for the kit
    equivalent of the same shape (e.g. home 'bed' -> 'i_bed_<town>', lab 'desk_pc' -> 'i_lab_desk', shop 'shelf' -> 'goods').
 6. --check fails on: a square with no blocking art that is still blocked (blocked gap), a blocking asset on a walkable
    square (walk-through seam), or art overhanging its footprint.
Reusable for other games: edit MANAGED_CATS / EXEMPT / ROOM_SETS / SWAPS / TOWNS below; map/tileset paths are arguments.
"""
import argparse, collections, glob, json, os, re, sys
try:
    from PIL import Image
except ImportError:
    sys.exit('needs Pillow:  python -m pip install pillow')

MANAGED_CATS = {'furniture', 'deco', 'decoration', 'interior', 'prop', 'kit'}
EXEMPT = re.compile(r'rug|mat(_|$)|dance|stage|note_slot|platform|edge|mark|panel|timetable|rack_wall|grass|flower|fern|bridge|barrier|mushroom_glow|carpet|floor|wall|window|poster|flyer|banner|sign|painting|frame|clock|curtain|stairs|door|dais|ring|arena|puzzle|light|lamp_wall|shadow|trim|skirting|vent|board')
INTERIOR = re.compile(r'_int$|^(house_|greystone|home_|heal_|lab_|rt_|mart_|station_|hall_|office|shop|club|lantern_rest)')
ROOM_SETS = [('lab', re.compile(r'^(lab_|rt_|office|frostspire_office|saltmere_office|frostspire_lift)')),
             ('shop', re.compile(r'^(shop|mart_|club|station|heal_)')),
             ('home', re.compile(r'^(house_|home_)'))]
TOWNS = {'brookhollow': 'brook', 'fernwick': 'fern', 'saltmere': 'salt', 'lanternport': 'lantern', 'cindervale': 'cinder',
         'revival': 'revival', 'aurelith': 'aurelith', 'tidewater': 'salt', 'mirefen': 'fern', 'frostspire': 'cinder'}
SWAPS = {'home': {'bed': 'i_bed_{t}', 'chair': 'i_chair_{t}', 'table': 'i_table_{t}', 'sofa': 'i_sofa_{t}', 'dresser': 'i_dresser_{t}',
                  'cupboard': 'i_cupboard_{t}', 'bookcase': 'i_bookcase_{t}', 'shelf': 'i_shelf_{t}', 'pc': 'i_pc', 'tv': 'i_tv'},
         'lab': {'desk_pc': 'i_lab_desk', 'pc': 'i_terminal', 'shelf': 'i_bookcase_{t}', 'heal_machine': 'i_heal_machine', 'plant': 'i_plant_fern'},
         'shop': {'shelf': 'goods', 'counter_shop_l': 'i_counter_shop_l', 'counter_shop_m': 'i_counter_shop_m', 'counter_shop_r': 'i_counter_shop_r'}}
WALK, BLOCK = 0, 1

def dump_like(path, obj):
    """Write JSON in the file's existing style (compact / one-line / indented) so diffs stay small."""
    head = open(path, encoding='utf-8').read(400)
    if '\n' in head.strip()[:200]:
        ind = len(re.search(r'\n( *)\S', head).group(1)) or 1; txt = json.dumps(obj, indent=ind, ensure_ascii=False)
    elif '", "' in head or '": ' in head: txt = json.dumps(obj, ensure_ascii=False)
    else: txt = json.dumps(obj, separators=(',', ':'), ensure_ascii=False)
    end = '\n' if open(path, encoding='utf-8').read().endswith('\n') else ''
    with open(path, 'w', encoding='utf-8', newline='\n') as fh: fh.write(txt + end)

def split(name):
    m = re.match(r'(.*)_(\d+)_(\d+)$', name)
    return (m.group(1), int(m.group(2)), int(m.group(3))) if m else (name, 0, 0)

class Repo:
    def __init__(s, root, tile):
        root = os.path.abspath(root)
        if not os.path.isdir(os.path.join(root, 'art', 'world', 'overworld')) and os.path.isdir(os.path.join(root, 'kilumen')): root = os.path.join(root, 'kilumen')
        s.ow = os.path.join(root, 'art', 'world', 'overworld'); s.root = root; s.T = tile
        if not os.path.isfile(os.path.join(s.ow, 'tileset.json')): sys.exit(f'no art/world/overworld/tileset.json under {root}')
        s.ts_files = [f for f in ('tileset.json', 'tileset_ix2.json') if os.path.isfile(os.path.join(s.ow, f))]
        s.ts = {f: json.load(open(os.path.join(s.ow, f), encoding='utf-8')) for f in s.ts_files}
        s.tiles = {t['id']: t for f in s.ts_files for t in s.ts[f]['tiles']}
        s.byname = {t['name']: t for t in s.tiles.values()}
        s.codes = s.ts['tileset.json'].get('collision_codes', {})
        s.cols = s.ts['tileset.json'].get('columns_per_sheet', 16); s._img = {}
    def sheet_file(s, sheet, n=1):
        p = os.path.join(s.ow, sheet.replace('tiles_1x', f'tiles_{n}x'))
        for c in (p[:-4] + '_v3.png', p[:-4] + '_v2.png', p):
            if os.path.isfile(c): return c
    def cell(s, t):
        f = s.sheet_file(t['sheet'])
        if not f: return None
        if f not in s._img: s._img[f] = Image.open(f).convert('RGBA')
        im = s._img[f]; x, y = t['index'] % s.cols * s.T, t['index'] // s.cols * s.T
        return im.crop((x, y, x + s.T, y + s.T)) if y + s.T <= im.height else None

FURNITURE_SHEETS = re.compile(r'(interior|i_furniture|i_brand|x_furniture_fix|ix2_kit)\.png$')
def managed(t):
    """Furniture-like assets. Decals the designer left walkable on general deco sheets (grass, flowers, bridges, wall marks)
    are not furniture and are left alone; on furniture sheets everything non-exempt is managed."""
    if t.get('collision', 'walk') not in ('walk', 'block') or EXEMPT.search(t['name']): return False
    if FURNITURE_SHEETS.search(str(t.get('sheet', ''))): return t.get('category') in MANAGED_CATS | {'furniture'} or True
    return t.get('category') in MANAGED_CATS and t.get('collision') == 'block'

def footprints(R, sliver):
    """asset base -> {tile id: (blocks, opaque px, overhang px)} from the trimmed opaque box of each cell."""
    assets = collections.defaultdict(dict); out = {}
    for t in R.tiles.values():
        if managed(t): b, r, c = split(t['name']); assets[(t['sheet'], b)][(r, c)] = t
    for (sheet, base), cells in assets.items():
        info = {}
        for rc, t in cells.items():
            im = R.cell(t)
            if im is None: continue
            a = im.split()[3].point(lambda v: 255 if v >= 200 else 0); bbox = a.getbbox()
            n = a.histogram()[255] if bbox else 0
            blocks = n > sliver * R.T * R.T
            info[t['id']] = (blocks, n, 0 if blocks else n, bbox)
        out[(sheet, base)] = info
    return out

def room_set(name):
    for k, rx in ROOM_SETS:
        if rx.search(name): return k
    return None
def town(name):
    for k, v in TOWNS.items():
        if k in name: return v
    return 'brook'

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('repo'); g = ap.add_mutually_exclusive_group()
    g.add_argument('--apply', action='store_true'); g.add_argument('--check', action='store_true'); g.add_argument('--dry-run', action='store_true')
    ap.add_argument('--report'); ap.add_argument('--overworld', action='store_true'); ap.add_argument('--no-swap', action='store_true')
    ap.add_argument('--no-trim', action='store_true'); ap.add_argument('--tile', type=int, default=64); ap.add_argument('--sliver', type=float, default=0.04)
    A = ap.parse_args(); R = Repo(A.repo, A.tile); mode = 'apply' if A.apply else 'check' if A.check else 'dry-run'
    rep = [f'# grid_fit_and_swap report ({mode})', f'repo: {R.root}', '']
    fp = footprints(R, A.sliver); block_of = {}
    data_changes, trims = [], []
    for (sheet, base), info in sorted(fp.items()):
        for tid, (blocks, n, over, bbox) in info.items():
            t = R.tiles[tid]; block_of[tid] = blocks
            want = 'block' if blocks else 'walk'
            if t.get('collision') != want: data_changes.append(f'{t["name"]} (id {tid}): {t.get("collision")} -> {want} ({n} opaque px)')
            if over: trims.append((t, over))
    rep += [f'## Assets: {len(fp)} definitions, {len(block_of)} tiles managed', f'### Tile collision changes ({len(data_changes)})'] + [f'- {x}' for x in data_changes]
    rep += [f'### Overhang slivers ({len(trims)})'] + [f'- {t["name"]} (id {t["id"]}): {o} px outside footprint' + ('' if A.no_trim else ' -> trimmed') for t, o in trims]
    def blocks(tid):
        if not tid: return False
        if tid in block_of: return block_of[tid]
        t = R.tiles.get(tid); return bool(t) and t.get('collision') not in (None, 'walk')
    problems, map_changes, swaps = [], collections.Counter(), []
    files = sorted(glob.glob(os.path.join(R.ow, 'maps', '**', '*.json'), recursive=True)); rooms = []
    for f in files:
        try: m = json.load(open(f, encoding='utf-8'))
        except Exception: continue
        L = m.get('layers')
        if not isinstance(L, dict) or 'collision' not in L: continue
        name = m.get('name') or os.path.splitext(os.path.basename(f))[0]; inter = bool(INTERIOR.search(name)); rs = room_set(name)
        layers = [k for k in ('ground', 'decoration', 'overlay') if isinstance(L.get(k), list)]; col = L['collision']; changed = False
        if inter: rooms.append(f'{name} ({rs or "hall"})')
        if inter and rs and not A.no_swap:
            sw = SWAPS.get(rs, {}); tw = town(name)
            for k in layers:
                for y, row in enumerate(L[k]):
                    for x, tid in enumerate(row):
                        t = R.tiles.get(tid)
                        if not t: continue
                        b, r, c = split(t['name']); tgt = sw.get(b)
                        if not tgt: continue
                        tgt = tgt.format(t=tw); nn = tgt + (f'_{r}_{c}' if t['name'] != b else '')
                        nt = R.byname.get(nn)
                        if not nt:
                            nt = R.byname.get(tgt) if t['name'] == b else None
                        # same shape only: target must have the same cells as the source
                        if nt and nt['id'] != tid and {split(x['name'])[1:] for x in R.tiles.values() if split(x['name'])[0] == tgt and x['sheet'] == nt['sheet']} == \
                                {split(x['name'])[1:] for x in R.tiles.values() if split(x['name'])[0] == b and x['sheet'] == t['sheet']}:
                            swaps.append(f'{name} ({x},{y}) {t["name"]} -> {nt["name"]}')
                            if A.apply: row[x] = nt['id']; changed = True
        H, W = len(col), len(col[0]) if col else 0
        for y in range(H):
            for x in range(W):
                ids = [L[k][y][x] for k in layers if y < len(L[k]) and x < len(L[k][y])]
                mids = [i for i in ids if i in block_of]
                if not mids or col[y][x] not in (WALK, BLOCK): continue
                want = BLOCK if any(blocks(i) for i in ids if i) else WALK
                if col[y][x] != want:
                    kind = 'blocked gap (no blocking art)' if want == WALK else 'walk-through (blocking art on a walkable square)'
                    if inter or A.overworld:
                        map_changes[name] += 1
                        if A.apply: col[y][x] = want; changed = True
                        else: problems.append(f'{name} ({x},{y}): {kind} [{", ".join(R.tiles[i]["name"] for i in mids)}]')
                    else: rep.append(f'- (overworld, report only) {name} ({x},{y}): {kind}')
        if changed and A.apply:
            dump_like(f, m)
    if A.apply:
        for fn in R.ts_files:
            for t in R.ts[fn]['tiles']:
                if t['id'] in block_of:
                    b = block_of[t['id']]; t['walkable'] = not b; t['collision'] = 'block' if b else 'walk'; t['collision_code'] = R.codes.get(t['collision'], BLOCK if b else WALK) if isinstance(R.codes, dict) else (BLOCK if b else WALK)
            dump_like(os.path.join(R.ow, fn), R.ts[fn])
        for fn in ('tileset_2x.json', 'tileset_3x.json'):  # mirrors
            p = os.path.join(R.ow, fn)
            if not os.path.isfile(p): continue
            d = json.load(open(p, encoding='utf-8'))
            for t in d['tiles']:
                if t['id'] in block_of: b = block_of[t['id']]; t['walkable'] = not b; t['collision'] = 'block' if b else 'walk'; t['collision_code'] = BLOCK if b else WALK
            dump_like(p, d)
        if not A.no_trim and trims:
            for t, _ in trims:
                for n in (1, 2, 3):
                    f = R.sheet_file(t['sheet'], n)
                    if not f: continue
                    im = Image.open(f).convert('RGBA'); C = R.T * n; x, y = t['index'] % R.cols * C, t['index'] // R.cols * C
                    im.paste((0, 0, 0, 0), (x, y, x + C, y + C)); im.save(f)
            trims = []
    if not A.apply: problems += [f'overhang: {t["name"]} ({o} px)' for t, o in trims]
    rep += ['', f'### Swaps ({len(swaps)})'] + [f'- {s}' for s in swaps]
    rep += ['', f'### Map collision squares {"fixed" if A.apply else "to fix"}: {sum(map_changes.values())}'] + [f'- {k}: {v}' for k, v in sorted(map_changes.items())]
    rep += ['', f'### Problems ({len(problems)})'] + [f'- {p}' for p in problems[:2000]]
    rep += ['', f'### Interior rooms scanned ({len(rooms)})', ', '.join(rooms)]
    out = A.report or os.path.join(R.root, 'tools', 'furniture', 'grid_fit_report.md')
    os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w', encoding='utf-8').write('\n'.join(rep) + '\n')
    print(f'{mode}: {len(block_of)} tiles, {len(data_changes)} tile-collision changes, {len(swaps)} swaps, {sum(map_changes.values())} map squares, '
          f'{len(trims)} overhangs, {len(problems)} problems. report: {out}')
    if A.check and (problems or data_changes): sys.exit(1)

if __name__ == '__main__': main()
