#!/usr/bin/env python3
"""Per-room contact sheets + automated QA for the Wellspire flashback lab (Director, Oct 30 2026).
Renders each fin_past_wlab_* map from its JSON and the real 1x sheets at REAL scale (64 px per square), plus room 10
after the release (flag_swaps applied). Each sheet: [room] [room + grid + collision overlay] and a strip of every lean
prop in the room next to its greyscale shading layer. Checks: missing/unknown tile ids and empty ground cells, ground
seams, blocked cells with no art / walkable cells covered by solid prop art, BFS reach of every floor cell + door from
the arrival, and TOP-vs-FRONT luminance of every lean prop.
Run: python3 tools/wellspire_lab/qa_sheets.py [outdir]   (default /workspace/kilumen/qa/wlab_contact_sheets)"""
import json, os, sys
from collections import deque
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from lab_props_lean import lean_props, SHADE_MAPS, TOP, FRONT
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); OW = os.path.join(ROOT, 'art/world/overworld')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/workspace/kilumen/qa/wlab_contact_sheets'; os.makedirs(OUT, exist_ok=True)
T = 64
tiles = {}
for f in ('tileset.json', 'tileset_arena.json'):
    for t in json.load(open(os.path.join(OW, f)))['tiles']: tiles[t['id']] = t
byname = {t['name']: i for i, t in tiles.items()}
sheets = {}
def tile(i):
    t = tiles.get(i)
    if not t: return None
    p = t['sheet']
    if p not in sheets: sheets[p] = Image.open(os.path.join(OW, p)).convert('RGBA')
    sh = sheets[p]; n = sh.width // 16 if 'wellspire_lab' in p else 64
    return sh.crop((t['col'] * n, t['row'] * n, (t['col'] + 1) * n, (t['row'] + 1) * n)).resize((T, T), Image.NEAREST)
LP = lean_props()
def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

def qa_room(name, m, released):
    W, H = m['width'], m['height']; L = {k: [r[:] for r in v] for k, v in m['layers'].items()}; issues = []
    if released:
        for s in m.get('flag_swaps', []): L[s.get('layer', 'decoration')][s['y']][s['x']] = byname[s['after']]
    room = Image.new('RGBA', (W * T, H * T), (0, 0, 0, 255)); deco = Image.new('RGBA', room.size, (0, 0, 0, 0))
    block = [[False] * W for _ in range(H)]; door = [[False] * W for _ in range(H)]; walkdeco = [[False] * W for _ in range(H)]
    for k in ('ground', 'decoration', 'overlay'):
        for y, r in enumerate(L.get(k, [])):
            for x, i in enumerate(r):
                if not i:
                    if k == 'ground': issues.append(f'empty ground at {x},{y}')
                    continue
                ti = tile(i)
                if ti is None: issues.append(f'unknown tile id {i} at {x},{y} ({k})'); continue
                room.alpha_composite(ti, (x * T, y * T))
                code = tiles[i].get('collision_code', 0 if tiles[i].get('walkable') else 1)
                if code == 1: block[y][x] = True
                if code == 4: door[y][x] = True
                if k != 'ground':
                    (deco.alpha_composite(ti, (x * T, y * T)))
                    if code == 0: walkdeco[y][x] = True
    for y in range(H):  # seams between neighbouring walkable ground tiles of the same family
        for x in range(W - 1):
            a, b = L['ground'][y][x], L['ground'][y][x + 1]
            if a and b and tiles.get(a, {}).get('name', '').split('_')[1:2] == tiles.get(b, {}).get('name', '').split('_')[1:2] and not block[y][x] and not block[y][x + 1]:
                ea = tile(a).crop((63, 0, 64, 64)); eb = tile(b).crop((0, 0, 1, 64))
                d = sum(abs(lum(p) - lum(q)) for p, q in zip(list(ea.getdata()), list(eb.getdata()))) / 64
                if d > 60: issues.append(f'seam {x},{y}|{x+1},{y} dL={d:.0f}')
    D = deco.load()
    for y in range(H):
        for x in range(W):
            cov = sum(1 for yy in range(y * T, y * T + T, 4) for xx in range(x * T, x * T + T, 4) if D[xx, yy][3] > 200) / 256
            g = L['ground'][y][x]; gname = tiles.get(g, {}).get('name', '')
            is_wall = 'wall' in gname or 'pit' in gname or 'vat' in gname or gname.startswith('grass')
            if block[y][x] and not is_wall and cov < 0.05: issues.append(f'blocked square {x},{y} has no prop art (invisible wall)')
            if not block[y][x] and not walkdeco[y][x] and cov > 0.30: issues.append(f'walkable square {x},{y} is covered by prop art ({cov:.0%})')
    ar = m.get('flashback_lab', {}).get('arrival') or [m['warps'][0]['x'], m['warps'][0]['y']]
    seen = {tuple(ar)}; q = deque([tuple(ar)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if 0 <= X < W and 0 <= Y < H and (X, Y) not in seen and (not block[Y][X] or door[Y][X]):
                seen.add((X, Y))
                if not door[Y][X]: q.append((X, Y))
    floor = {(x, y) for y in range(H) for x in range(W) if not block[y][x] and not door[y][x]}
    unreached = floor - seen; doors = {(x, y) for y in range(H) for x in range(W) if door[y][x]}
    if unreached: issues.append(f'{len(unreached)} floor squares unreachable: {sorted(unreached)[:6]}')
    if doors - seen: issues.append(f'doors unreachable: {sorted(doors - seen)}')
    # lean props used in this room
    used = set()
    for k in ('decoration', 'overlay', 'ground'):
        for r in L.get(k, []):
            for i in r:
                n = tiles.get(i, {}).get('name', '')
                for p in SHADE_MAPS:
                    if n.startswith(p + '_') and n[len(p) + 1:].replace('_', '').isdigit(): used.add(p)
    lean = []
    for p in sorted(used):
        sm, (w, h) = SHADE_MAPS[p]; art = Image.new('RGBA', (w * 64, h * 64))
        for cy in range(h):
            for cx in range(w): art.paste(LP[f'{p}_{cx}_{cy}'], (cx * 64, cy * 64))
        A, S = art.load(), sm.load(); tl, fl = [], []
        for yy in range(art.height):
            for xx in range(art.width):
                if A[xx, yy][3] > 200:
                    (tl if S[xx, yy] == TOP else fl if S[xx, yy] == FRONT else []).append(lum(A[xx, yy]))
        mt, mf = sum(tl) / max(1, len(tl)), sum(fl) / max(1, len(fl))
        ok = mt > mf * 1.12
        if not ok: issues.append(f'{p}: top face not clearly lighter (top {mt:.0f} vs front {mf:.0f})')
        lean.append((p, art, sm, mt, mf, ok))
    # sheet
    ovl = Image.new('RGBA', room.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ovl)
    for y in range(H):
        for x in range(W):
            if door[y][x]: d.rectangle((x * T, y * T, x * T + T - 1, y * T + T - 1), fill=(60, 140, 255, 90))
            elif block[y][x]: d.rectangle((x * T, y * T, x * T + T - 1, y * T + T - 1), fill=(255, 40, 40, 70))
            elif (x, y) in seen: d.rectangle((x * T, y * T, x * T + T - 1, y * T + T - 1), fill=(40, 255, 90, 45))
            d.rectangle((x * T, y * T, x * T + T - 1, y * T + T - 1), outline=(255, 255, 255, 70))
    d.rectangle((ar[0] * T + 20, ar[1] * T + 20, ar[0] * T + 43, ar[1] * T + 43), outline=(255, 255, 0, 255), width=3)
    ov = Image.alpha_composite(room, ovl)
    stripH = max([a.height for _, a, *_ in lean] + [0]) + 40 if lean else 0
    SW = room.width * 2 + 48; SH = 56 + room.height + (stripH + 30 if lean else 0) + 22 * (len(issues) + 2)
    sheet = Image.new('RGBA', (max(SW, sum(a.width * 2 + 40 for _, a, *_ in lean) + 24), SH), (22, 22, 30, 255)); sd = ImageDraw.Draw(sheet)
    sd.text((16, 10), f'{name}{"  (after release, flag_swaps applied)" if released else ""}   {W}x{H} squares @ 64 px (real scale)', fill=(240, 240, 250))
    sd.text((16, 30), 'left: room as rendered   right: grid + collision (red block, blue door, green reached from arrival [yellow])', fill=(170, 170, 190))
    sheet.alpha_composite(room, (16, 50)); sheet.alpha_composite(ov, (32 + room.width, 50)); y0 = 60 + room.height
    if lean:
        sd.text((16, y0), 'lean props (35 deg, light top-left): art | greyscale shading layer (TOP 224 / FRONT 150 / SIDE 112 / glow 184)', fill=(170, 170, 190)); x = 16
        for p, art, sm, mt, mf, ok in lean:
            sheet.alpha_composite(art, (x, y0 + 20)); sheet.paste(sm.convert('RGBA'), (x + art.width + 4, y0 + 20))
            sd.text((x, y0 + 24 + art.height), f'{p} top {mt:.0f} > front {mf:.0f} {"OK" if ok else "FAIL"}', fill=(140, 240, 150) if ok else (255, 90, 90))
            x += art.width * 2 + 40
        y0 += stripH + 30
    sd.text((16, y0), f'QA: {"PASS" if not issues else str(len(issues)) + " issue(s)"}', fill=(140, 240, 150) if not issues else (255, 90, 90))
    for k, s in enumerate(issues): sd.text((16, y0 + 22 * (k + 1)), s, fill=(255, 150, 150))
    fn = os.path.join(OUT, f'{name}{"_broken" if released else ""}.png'); sheet.convert('RGB').save(fn)
    return fn, issues, [(p, round(mt), round(mf)) for p, _, _, mt, mf, _ in lean]

maps = sorted(f[:-5] for f in os.listdir(os.path.join(OW, 'maps')) if f.startswith('fin_past_wlab_'))
total = 0
for n in maps + [maps[-1] + '*']:
    rel = n.endswith('*'); n = n.rstrip('*'); m = json.load(open(os.path.join(OW, 'maps', n + '.json')))
    fn, iss, lean = qa_room(n, m, rel); total += len(iss)
    print(fn, 'PASS' if not iss else iss, lean)
print('total issues', total)
