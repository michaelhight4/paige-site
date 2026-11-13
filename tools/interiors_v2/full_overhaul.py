"""FULL interiors overhaul (Oct 29 2026, v0.2.41): every interior sheet cell used by any interior map is brought to the
pass-3/pass-4 standard. Same-index replacement sheets (*_v2.png) so ids, collisions, layers, warps and saves are untouched.
 1. Gary's picks + pass-3/4 kit pieces pasted over matching legacy cells (worn bookshelf, low navy couch, TV from the back
    with blue glow, kit kitchen/fridge/plant/chairs/tables/crates/radio).
 2. Every other used furniture piece (assembled across its _r_c cells) gets the pass-3 finish: dark outer silhouette only,
    1px top-front highlight, hue-shifted shade, baked dithered SHADOW down-right.
 3. Walls: crown moulding + ceiling crevice on the upper row (taller-reading wall), skirting + dark line on the face row.
Run: python3 tools/interiors_v2/full_overhaul.py <live kilumen dir>"""
import json, os, re, sys, collections
from PIL import Image
K = sys.argv[1] if len(sys.argv) > 1 else '/workspace/ps_clone/kilumen'
OW = os.path.join(K, 'art/world/overworld')
ts = json.load(open(f'{OW}/tileset.json')); T = {t['id']: t for t in ts['tiles']}; BYN = {t['name']: t for t in ts['tiles']}
kit = {t['name']: t for t in json.load(open(f'{OW}/tileset_ix2.json'))['tiles']}
SHEETS = {'interior.png': ('tiles_1x/interior_v2.png', 'tiles_1x/interior.png'),
          'i_wall.png': ('interiors_new/tiles_1x/i_wall_v2.png', 'interiors_new/tiles_1x/i_wall.png'),
          'i_floor.png': ('interiors_new/tiles_1x/i_floor_v2.png', 'interiors_new/tiles_1x/i_floor.png'),
          'i_furniture.png': ('interiors_new/tiles_1x/i_furniture_v2.png', 'interiors_new/tiles_1x/i_furniture.png'),
          'i_brand.png': ('interiors_new/tiles_1x/i_brand_v2.png', 'interiors_new/tiles_1x/i_brand.png'),
          'x_furniture_fix.png': ('tiles_1x/x_furniture_fix_v2.png', 'tiles_1x/x_furniture_fix.png')}
INTERIOR_MAPS = [m[:-5] for m in sorted(os.listdir(f'{OW}/maps')) if m.endswith('.json') and (
    re.search(r'_int$|^heal_|^home_|^house_|^lab_|^rt_branch', m[:-5])) and m != 'house_1f_v2.json']
# ---- which cells are used by interiors
used = collections.defaultdict(set)
for m in INTERIOR_MAPS + ['house_1f_v2']:
    d = json.load(open(f'{OW}/maps/{m}.json')); L = d['layers']
    for ln, lay in (L.items() if isinstance(L, dict) else [(l.get('name'), l) for l in L]):
        data = lay.get('data', lay) if isinstance(lay, dict) else lay
        for r in data:
            for v in (r if isinstance(r, list) else [r]):
                t = T.get(v)
                if t and os.path.basename(t['sheet']) in SHEETS: used[os.path.basename(t['sheet'])].add(t['name'])
base = os.path.basename
src = {k: Image.open(f'{OW}/{(v[0] if k == "interior.png" else v[1])}').convert('RGBA') for k, v in SHEETS.items()}
orig = {k: Image.open(f'{OW}/{v[1]}').convert('RGBA') for k, v in SHEETS.items()}
kitimg = Image.open(f'{OW}/tiles_1x/ix2_kit.png').convert('RGBA'); kitn = Image.open(f'{OW}/tiles_1x/ix2_kit_n.png').convert('RGBA')
vn = Image.open(f'{OW}/tiles_1x/interior_v2_n.png').convert('RGBA')
def box(i): return ((i % 16) * 64, (i // 16) * 64, (i % 16) * 64 + 64, (i // 16) * 64 + 64)
def cell(img, i): return img.crop(box(i))
def kcell(name): return cell(kitimg, kit['kit_' + name]['index'])
# ---- 1. kit replacements: legacy name -> kit cell name
REPL = {}
def piece(legacy_prefix, kit_prefix, cells):
    for lc, kc in cells: REPL[f'{legacy_prefix}_{lc}' if lc else legacy_prefix] = f'{kit_prefix}_{kc}'
for town, cond in (('brook', 'worn'), ('fern', 'worn'), ('salt', 'worn'), ('lantern', 'worn')):
    piece(f'i_bookcase_{town}', 'bookshelf3_worn_brown', [('0_0', '0_0'), ('1_0', '1_0')])
    piece(f'i_sofa_{town}', 'couch_low_%s_navy' % ('worn' if town == 'brook' else 'normal'), [('0_0', '0_0'), ('0_1', '0_1')])
    piece(f'i_chair_{town}', 'chair3_%s_brown_r' % ('worn' if town in ('brook', 'salt') else 'normal'), [('', '0_0')])
    piece(f'i_table_{town}', 'dining_table_normal_red', [('0_0', '0_0'), ('0_1', '0_1')])
    piece(f'i_cupboard_{town}', 'kitchen_counter3_%s_teal' % ('worn' if town == 'brook' else 'normal'), [('0_0', '0_0'), ('1_0', '1_0')])
piece('i_tv', 'crt3_back_worn_brown', [('', '0_0')])
piece('i_radio', 'radio_worn_red', [('', '0_0')])
piece('i_table_small_brook', 'side3_worn_brown', [('', '0_0')])
for a, b in (('i_kitchen_stove', 'kitchen_stove3_worn_teal'), ('i_kitchen_sink', 'kitchen_sink3_worn_teal'), ('i_kitchen_fridge', 'fridge3_worn_teal'), ('i_plant_palm', 'plant_tall3_normal_green')):
    piece(a, b, [('0_0', '0_0'), ('1_0', '1_0')])
# interior.png legacy (shop/office/halls/house_int_*): 2x2 bookcase = two worn shelves, stove, cupboard, kitchen counter, armchair
piece('bookcase', 'bookshelf3_worn_brown', [('0_0', '0_0'), ('0_1', '0_0'), ('1_0', '1_0'), ('1_1', '1_0')])
piece('stove', 'kitchen_stove3_normal_teal', [('0_0', '0_0'), ('1_0', '1_0')])
piece('cupboard', 'kitchen_counter3_normal_teal', [('0_0', '0_0'), ('1_0', '1_0')])
piece('table', 'dining_table_normal_red', [('0_0', '0_0'), ('0_1', '0_1')])
REPL['kcounter'] = 'kitchen_counter3_normal_teal_1_0'
REPL['armchair'] = 'armchair_side_normal_teal_r_0_0'
REPL = {k: v for k, v in REPL.items() if ('kit_' + v) in kit}
# ---- 2/3. procedural pass-3 finish
INK = (25, 18, 16); SHADOW = (26, 18, 38, 96)
WALL_UP = re.compile(r'(wall_upper|iwall_upper|club_wall_upper)'); WALL_FACE = re.compile(r'(wall_face|iwall_face|club_wall_face)')
FLOORISH = re.compile(r'floor|_mat|^mat|stairs|dance|platform|rail|arena_ring|dais|rug|wall_top|window_|door_frame|poster|flyer|missing|note_slot|banner|logo_panel|timetable|sign_|staffdoor|club_paint')
def is_furniture(name, im):
    if WALL_UP.search(name) or WALL_FACE.search(name) or FLOORISH.search(name): return False
    a = im.getchannel('A'); return a.getextrema()[0] < 255  # has transparency = a free-standing piece
def mix(c, d, k): return tuple(int(c[i] * (1 - k) + d[i] * k) for i in range(3))
def finish(im):
    W, H = im.size; px = im.load(); op = [[px[x, y][3] > 200 for x in range(W)] for y in range(H)]
    out = im.copy(); o = out.load()
    for y in range(H):
        for x in range(W):
            if not op[y][x]: continue
            edge = any(not (0 <= x + dx < W and 0 <= y + dy < H and op[y + dy][x + dx]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            r, g, b, a = px[x, y]
            if edge: o[x, y] = mix((r, g, b), INK, 0.7) + (255,)
            elif y > 0 and op[y - 1][x] and (y < 2 or not op[y - 2][x]): o[x, y] = mix((r, g, b), (252, 246, 232), 0.35) + (255,)   # 1px top highlight
            else:  # hue-shifted ramp: darks cooler/purple, lights warmer
                l = (r * 3 + g * 6 + b) / 2550
                o[x, y] = (mix((r, g, b), (54, 38, 74), 0.18) if l < 0.35 else mix((r, g, b), (255, 236, 200), 0.06) if l > 0.7 else (r, g, b)) + (255,)
    for y in range(H):   # baked shadow down-right (3px solid + 1px dithered fringe), only on empty pixels
        for x in range(W):
            if op[y][x]: continue
            solid = any(0 <= x - d < W and 0 <= y - d < H and op[y - d][x - d] for d in (2, 3))
            fringe = 0 <= x - 4 < W and 0 <= y - 4 < H and op[y - 4][x - 4] and (x + y) % 2 == 0
            if solid or fringe: o[x, y] = SHADOW
    return out
def wall_upper(im):
    o = im.copy(); d = o.load(); avg = [sum(d[x, 20][i] for x in range(64)) // 64 for i in range(3)]
    dark, mould, hi = mix(avg, (41, 37, 43), 0.8), mix(avg, (110, 70, 40), 0.55), mix(avg, (252, 246, 232), 0.5)
    for x in range(64):
        for y in range(3): d[x, y] = dark + (255,)
        if x % 2 == 0: d[x, 3] = dark + (255,)
        for y in range(4, 10): d[x, y] = mould + (255,)
        d[x, 4] = hi + (255,); d[x, 9] = mix(mould, INK, 0.5) + (255,)
        if (x // 2) % 2 == 0: d[x, 10] = mix(avg, INK, 0.25) + (255,)
    return o
def wall_face(im):
    o = im.copy(); d = o.load(); avg = [sum(d[x, 40][i] for x in range(64)) // 64 for i in range(3)]
    sk = mix(avg, (70, 44, 34), 0.6)
    for x in range(64):
        for y in range(56, 62): d[x, y] = sk + (255,)
        d[x, 56] = mix(sk, (252, 246, 232), 0.35) + (255,); d[x, 62] = INK + (255,); d[x, 63] = INK + (255,)
    return o
FORCE = {'club_dj_desk', 'club_speaker', 'club_stage_front', 'club_stage_front_l', 'club_stage_front_r', 'club_paint_counter', 'dais'}
def finish_solid(im, C, R):
    # opaque pieces drawn on their own floor (counters, desks, stages): 1px top highlight, crevice under the top, dark base line,
    # and a dithered SHADOW band down-right inside the cell edge so they sit on the floor like the kit pieces
    o = im.copy(); d = o.load(); W, H = C * 64, R * 64
    for x in range(W):
        d[x, 1] = mix(d[x, 1][:3], (252, 246, 232), 0.35) + (255,)
        for y in (H - 3, H - 2): d[x, y] = mix(d[x, y][:3], INK, 0.55 if y == H - 2 else 0.35) + (255,)
        if x % 2 == 0: d[x, H - 1] = mix(d[x, H - 1][:3], (26, 18, 38), 0.35) + (255,)
    for y in range(H):
        d[W - 2, y] = mix(d[W - 2, y][:3], INK, 0.4) + (255,)
        if y % 2 == 0: d[W - 1, y] = mix(d[W - 1, y][:3], (26, 18, 38), 0.3) + (255,)
    return o
report = collections.OrderedDict()
for sh, names in used.items():
    out = src[sh].copy(); nm = sorted(names)
    groups = collections.defaultdict(dict)
    for n in nm:
        m = re.match(r'(.*)_(\d+)_(\d+)$', n)
        groups[m.group(1) if m else n][(int(m.group(2)), int(m.group(3))) if m else (0, 0)] = BYN[n]
    for g, cells in groups.items():
        for (r, c), t in cells.items():
            if t['name'] in REPL:
                k = REPL[t['name']]; out.paste(kcell(k), box(t['index']))
                if sh == 'interior.png': vn.paste(cell(kitn, kit['kit_' + k]['index']), box(t['index']))
                report[t['name']] = 'kit:' + k
        rest = {rc: t for rc, t in cells.items() if t['name'] not in REPL}
        if not rest: continue
        o0 = orig[sh]
        if any(WALL_UP.search(t['name']) for t in rest.values()) or any(WALL_FACE.search(t['name']) for t in rest.values()):
            for t in rest.values():
                c0 = cell(o0, t['index'])
                f = wall_upper if WALL_UP.search(t['name']) else wall_face if WALL_FACE.search(t['name']) else None
                if f: out.paste(f(c0), box(t['index'])); report[t['name']] = f.__name__
            continue
        R = max(r for r, c in rest) + 1; C = max(c for r, c in rest) + 1
        asm = Image.new('RGBA', (C * 64 + 8, R * 64 + 8), (0, 0, 0, 0))
        for (r, c), t in rest.items(): asm.paste(cell(o0, t['index']), (c * 64, r * 64))
        probe = asm.crop((0, 0, C * 64, R * 64))
        solid_piece = not FLOORISH.search(g) and not is_furniture(g, probe) or g in FORCE
        if not is_furniture(g, probe) and not solid_piece:
            for t in rest.values(): report[t['name']] = 'kept (floor/wall-art/fixture, lit by runtime pass)'
            continue
        fin = finish(asm) if not solid_piece else finish_solid(asm, C, R)
        for (r, c), t in rest.items():
            cc = fin.crop((c * 64, r * 64, c * 64 + 64, r * 64 + 64))
            if sh == 'interior.png' and orig[sh].crop(box(t['index'])).tobytes() != src[sh].crop(box(t['index'])).tobytes():
                report[t['name']] = 'pass-4 (already redrawn)'; continue
            out.paste(cc, box(t['index'])); report[t['name']] = 'pass-3 finish' + (' (solid)' if solid_piece else '')
    dst = SHEETS[sh][0]; out.save(f'{OW}/{dst}')
    for z in (2, 3):
        p = f'{OW}/' + dst.replace('tiles_1x', f'tiles_{z}x'); os.makedirs(os.path.dirname(p), exist_ok=True)
        out.resize((out.width * z, out.height * z), Image.NEAREST).save(p)
vn.save(f'{OW}/tiles_1x/interior_v2_n.png')
for z in (2, 3): vn.resize((vn.width * z, vn.height * z), Image.NEAREST).save(f'{OW}/tiles_{z}x/interior_v2_n.png')
rooms = collections.OrderedDict()
for m in INTERIOR_MAPS:
    d = json.load(open(f'{OW}/maps/{m}.json')); L = d['layers']; sheets = collections.Counter(); cells = set()
    for ln, lay in (L.items() if isinstance(L, dict) else [(l.get('name'), l) for l in L]):
        data = lay.get('data', lay) if isinstance(lay, dict) else lay
        for r in data:
            for v in (r if isinstance(r, list) else [r]):
                t = T.get(v)
                if t and base(t['sheet']) in SHEETS: sheets[base(t['sheet'])] += 1; cells.add(t['name'])
    rooms[m] = {'sheets': dict(sheets), 'cells': len(cells), 'treated': sum(1 for c in cells if c in report and not report[c].startswith('kept')),
                'kept': sorted(c for c in cells if report.get(c, '').startswith('kept')), 'untouched': sorted(c for c in cells if c not in report)}
json.dump({'cells': report, 'rooms': rooms}, open('/workspace/kilumen/shots/interiors_full/overhaul_report.json', 'w'), indent=1)
print(len(report), 'cells;', collections.Counter(v.split(':')[0] for v in report.values()))
for m, r in rooms.items(): print(f"{m:24s} {r['treated']:3d}/{r['cells']:3d} untouched={r['untouched'][:6]}")
