"""World Design placements (quality/dev_notes/kilumen_balance_plan_wd.md, Oct 30 2026) applied cell by cell.
Run after balance_pass.py, before tools/map_audit/fix_live_flags.py. Every placement is checked against the latest data:
it is skipped (and reported) on NPC/item/sign/interact cells, pockets, the 3x3 approach of a door, road/water/solid ground,
or when it would cut any reachable cell off. Held by Gary (not applied): Sunmeadow cave doors -> barn/beekeeper cottage,
Revival Heights square stone pools (R3 pool framing, R6), the Aurelith row-40 ledge.
Missing kit art -> closest existing tile: bordered bed -> flowers_*, lily pad -> x_reeds_water, fountain -> statue.
Usage: python3 tools/towns/wd_scenes.py <map>"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'map_audit')); import layering_rules as LR, density as DN
NAME = sys.argv[1]; P = os.path.join(ROOT, f'art/world/overworld/maps/{NAME}.json')
ID = {v: k for k, v in DN.NM.items()}
m = json.load(open(P)); L = m['layers']; G, D, O, C = L['ground'], L['decoration'], L['overlay'], L['collision']; H, W = len(C), len(C[0])
m.setdefault('name', NAME)
PROT = {(o['x'], o['y']) for k in ('npcs', 'items', 'signs', 'interact_spots') for o in m.get(k) or [] if 'x' in o}
for w in m.get('warps') or []:
    for a in (-1, 0, 1):
        for b in (0, 1, 2): PROT.add((w['x'] + a, w['y'] + b))
for p in json.load(open(os.path.join(ROOT, 'data/pass2_caves.json')))['pockets']:
    if p['map'] != NAME: continue
    for (x0, y0, x1, y1) in p['floor']:
        for y in range(y0 - 1, y1 + 3):
            for x in range(x0 - 1, x1 + 2): PROT.add((x, y))
    for q in p['walk']: PROT.add(tuple(q))
SOFT = ('flowers_', 'tl_garden_patch')
WB = lambda i, j: 'flowers_warm' if (i + j) % 2 else 'flowers_violet'
def bed(x0, y0, w, h): return [('put', WB(i, j), x0 + i, y0 + j) for j in range(h) for i in range(w)]
def rm(*xy): return [('rm', None, xy[i], xy[i + 1]) for i in range(0, len(xy), 2)]
def put(t, *xy): return [('put', t, xy[i], xy[i + 1]) for i in range(0, len(xy), 2)]
def two(t, x, y): return [('put', t + '_0_0', x, y), ('put', t + '_1_0', x, y + 1)]   # stalls: top/bottom pieces
PLAN = {
 'aurelith': [
  ('thin', rm(28, 11, 29, 15, 55, 16, 59, 16, 57, 12, 34, 30, 52, 38, 71, 39, 58, 42, 41, 35, 46, 35, 41, 46, 46, 44)),
  ('A10 bridge clear', rm(67, 48, 68, 48, 67, 49)),
  ('A1', put('flowers_warm', 14, 16) + put('x_city_statue', 15, 16) + put('flowers_violet', 16, 16)),
  ('A2', put('flowers_warm', 21, 16, 22, 16)),   # planter 23,16 dropped: tips the 8x8 over the density band
  ('A3', put('flowers_warm', 58, 11, 60, 11, 58, 13, 60, 13) + put('x_city_statue', 59, 12) + put('x_city_bench_h', 59, 14)),
  ('A4', put('flowers_violet', 64, 16) + put('x_city_statue', 65, 16) + put('flowers_warm', 66, 16)),
  ('A4b', put('flowers_violet', 71, 16) + put('x_city_statue', 72, 16) + put('flowers_warm', 73, 16)),
  ('A5', [('pond', None, 66, 33)] + put('x_reeds', 65, 35) + put('x_city_bench_h', 67, 37)),
  ('A6', bed(72, 33, 3, 2) + put('x_city_lamp', 75, 36)),
  ('A7', [('move', 'x_city_stall_toys', 61, 36), ('move', 'x_city_stall_fabric', 63, 36)]),
  ('A8', bed(54, 35, 4, 2) + put('x_city_bench_h', 59, 35)),
  ('A9', bed(56, 43, 4, 2) + put('x_city_bench_h', 61, 43) + put('x_city_lamp', 62, 44)),
  ('A10', put('x_city_planter', 66, 46, 69, 46, 66, 51, 69, 51)),
  ('A11', put('x_city_planter', 14, 53, 20, 53, 28, 53, 35, 53) + put('tl_mailbox', 18, 53, 25, 53, 32, 53, 39, 53)),
 ],
 'revival_heights': [
  # stool 19,31 and lamp 19,30 stay: lifting them leaves a blank 5x5 (B3)
  ('thin', rm(36, 31, 37, 31, 38, 31, 38, 30, 38, 35, 30, 35, 48, 11)),
  ('garden -> planters', [('swap', 'x_city_planter', x, 32) for x in (31, 32, 33)]),
  ('R2', put('flowers_warm', 36, 34, 40, 35) + put('flowers_violet', 37, 34, 41, 35) + put('x_city_bench_h', 39, 33)),
  ('R3', put('x_city_planter', 35, 34, 35, 36)),
  ('R4', put('x_city_planter', 8, 18, 13, 18) + put('flowers_warm', 9, 22) + put('flowers_violet', 10, 22) + put('x_city_lamp', 12, 22)),
  ('R5', bed(50, 12, 2, 1) + bed(50, 14, 2, 1) + put('x_city_planter', 55, 15)),
 ],
 'sunmeadow_fields': [
  ('thin', rm(28, 23, 36, 24, 22, 25, 42, 27, 35, 30, 14, 23, 15, 23)),
  ('M1', bed(19, 27, 3, 3) + put('i_log_stool', 16, 29)),
  ('M2', put('x_reeds_water', 24, 26, 27, 28, 26, 27) + put('rock', 25, 29)),
  ('M3', two('x_city_stall_flowers', 36, 33) + two('x_city_stall_bread', 42, 33) + put('i_log_stool', 39, 34) + put('lamp', 41, 35)),
  ('M4', put('flowers_warm', 40, 20, 42, 22) + put('flowers_violet', 41, 21, 43, 23) + put('i_log_stool', 38, 21)),
  ('M5', put('tl_mailbox', 14, 13) + put('tl_garden_patch', 15, 13) + put('flowers_warm', 21, 13) + put('flowers_violet', 22, 13)),
  ('M6', # bench 46-47,28 skipped: its east half cuts the lane and it crowds the landmark
  put('flowers_warm', 44, 28) + put('flowers_violet', 45, 28) + put('lamp', 43, 27)),
 ]}
nm = lambda x, y: DN.NM.get(D[y][x]) or ''
log, skip = [], []
def reach(): return LR.reach(m, LR.starts(m))
base = reach()
def ok_cell(x, y, t, wet=False):
    if not (0 <= x < W and 0 <= y < H): return 'off map'
    if (x, y) in PROT: return 'protected'
    k = DN.kinds(m)[0][y][x]
    if wet: return None if k in ('open', 'flower', 'water') and not O[y][x] else f'not lawn ({k})'
    if t == 'x_reeds_water': return None if 'water' in (DN.NM.get(G[y][x]) or '') and not D[y][x] else 'not water'
    if D[y][x] and not nm(x, y).startswith(SOFT): return f'taken ({nm(x, y)})'
    if k not in ('open', 'flower') or O[y][x]: return f'not lawn ({k})'
    return None
def setc(x, y, t):
    old = (D[y][x], C[y][x]); D[y][x] = ID[t]
    C[y][x] = 0 if t.startswith('flowers_') else 1
    return old
def apply(tag, ops):
    global base
    for op, t, x, y in ops:
        if op == 'rm':
            if not (0 <= x < W and 0 <= y < H) or not D[y][x] or (x, y) in PROT or nm(x, y) == 'push_boulder' or O[y][x] and not O[y - 1][x]:
                skip.append((tag, 'rm', nm(x, y) if 0 <= x < W and 0 <= y < H else '', x, y, 'nothing/protected')); continue
            log.append((tag, 'rm', nm(x, y), x, y)); D[y][x] = 0; C[y][x] = 0; continue
        if op == 'swap':
            if not nm(x, y).startswith('tl_garden_patch'): skip.append((tag, op, t, x, y, 'no garden patch')); continue
            D[y][x] = ID[t]; C[y][x] = 1; log.append((tag, op, t, x, y)); continue
        if op == 'move':   # lift the stall from its row, set it down at (x, y)/(x, y+1)
            src = [(a, b) for b in range(H) for a in range(W) if nm(a, b).startswith(t)]
            why = ok_cell(x, y, t + '_0_0') or ok_cell(x, y + 1, t + '_1_0')
            if why or not src: skip.append((tag, op, t, x, y, why or 'no source')); continue
            keep = [(a, b, D[b][a], C[b][a]) for a, b in src]
            for a, b in src: D[b][a] = 0; C[b][a] = 0; G[b][a] = G[b][a]
            o1, o2 = setc(x, y, t + '_0_0'), setc(x, y + 1, t + '_1_0')
            if not base <= reach():
                for a, b, d, c in keep: D[b][a], C[b][a] = d, c
                D[y][x], C[y][x] = o1; D[y + 1][x], C[y + 1][x] = o2; skip.append((tag, op, t, x, y, 'breaks reach')); continue
            log.append((tag, op, t, x, y)); continue
        if op == 'pond':   # 4x3 pond, plain water centre with water>grass rims from the map's own tiles
            cells = [(x + i, y + j) for j in range(3) for i in range(4)]
            bad = [ok_cell(a, b, None, True) for a, b in cells]
            if any(bad) or any(D[b][a] for a, b in cells): skip.append((tag, op, 'pond', x, y, next(filter(None, bad), 'props in the way'))); continue
            keep = [(a, b, G[b][a], C[b][a]) for a, b in cells]
            for a, b in cells: G[b][a] = ID['water']; C[b][a] = 3
            if not base - set(cells) <= reach():
                for a, b, g, c in keep: G[b][a], C[b][a] = g, c
                skip.append((tag, op, 'pond', x, y, 'breaks reach')); continue
            log.append((tag, op, 'pond', x, y)); continue
        why = ok_cell(x, y, t)
        if why: skip.append((tag, op, t, x, y, why)); continue
        old = setc(x, y, t)
        if C[y][x] and not base - {(x, y)} <= reach():
            D[y][x], C[y][x] = old; skip.append((tag, op, t, x, y, 'breaks reach')); continue
        log.append((tag, op, t, x, y))
    base = reach()
for tag, ops in PLAN.get(NAME, []): apply(tag, ops)
json.dump(m, open(P, 'w'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print(NAME, 'applied', len(log), 'skipped', len(skip))
for s in skip: print('  skip', *s)
