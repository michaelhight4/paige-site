"""route_east redo (Coder for Gary, Oct 30 2026). Rebuilds East Road from a hand-drawn semantic grid:
organic autotiled tall grass, a shortened ledge set back from the path, ragged tree stands (whole trees,
canopy in the square above the top row), a pond, a stall, a statue garden, fences, flowers and a new hidden item.
Every warp, exit, cave mouth, pocket, trainer, item, sign and push boulder stays on its square.
Re-runnable: reads the map from git HEAD~ copy kept in tools/map_audit/route_east_redo_base.json.
Run: python3 tools/map_audit/route_east_redo.py"""
import json, os, re, collections
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
MAP = os.path.join(ROOT, 'art/world/overworld/maps/route_east.json')
BASE = os.path.join(HERE, 'route_east_redo_base.json')
TS = json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))
ID = {t['name']: t['id'] for t in TS['tiles']}; NAME = {t['id']: t['name'] for t in TS['tiles']}
CODE = {t['id']: t.get('collision_code', 0) for t in TS['tiles']}
if not os.path.exists(BASE):
    import shutil; shutil.copy(MAP, BASE)
j = json.load(open(BASE)); W, H = j['width'], j['height']; L = j['layers']
orig = {k: [r[:] for r in L[k]] for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter')}

# ---------- semantic grid ----------
# T tree  D dark tree  " tall grass  = ledge  . trail  ' ' grass  f/v flowers  m glow mushrooms  r rock
# b bush  - fence_h  S statue  s new signpost  W water  R reeds  k stall (awning row, counter row)  B barrel
# K keep the original cell (cave mouths, warps, pocket props, old sign, boulders)
t = lambda n: 'T' * n
R = {}
R[0] = R[1] = R[2] = R[3] = R[4] = R[5] = t(64)
R[6] = t(24) + 'KKK' + t(37)
R[7] = t(24) + 'KKK' + t(3) + 'K' + t(33)
R[8] = t(20) + '  .....  f ' + t(4) + 'KKK' + t(26)
R[9] = t(14) + 'KKK' + t(5) + '===' + t(10) + 'KKK' + t(8) + 'KKK' + t(15)
R[10] = t(13) + ' KKKTT' + '      """"  fSf  .. ""' + t(5) + 'KKK ' + t(14)
R[11] = t(13) + '....KT' + 'f    """""" vvv  .."""' + 'TT' + '.' * 8 + t(13)
R[12] = t(13) + '.....T' + '     ' + '.' * 12 + '.."""' + 'TT' + '.' * 8 + t(13)
R[13] = t(13) + '.....T' + '     """"f      r.. ""' + 'TT' + '.' * 8 + t(13)
R[14] = t(13) + '.....TT' + '  """""" DDDD   .. fT' + 'TT' + '.' * 7 + 'K' + t(13)
R[15] = t(14) + '===TTT' + '=' * 8 + 'TDDDDT' + '  ..   ' + 'TTT===' + t(17)
R[16] = t(14) + '    """"  f   DDDD    .. """" ' + '    ' + t(16)
R[17] = t(14) + '   """"""f TTT   ---  .. """" fKKKTKKKv ' + t(10)
R[18] = 'TT---f---v--   K  """" v TTT f  f  r.. v f  rKKKTKKK  -- v  ---f'
R[19] = '.' * 46 + 'RRR' + '.' * 15
R[20] = R[19]
R[21] = ' v  f bb  v -- ff  v      f  v     f  """ ..s  T f  --- v  -- f '
R[22] = 'TT  TTTT   TT    r  f  """" WWWWWW """"""".. kkT' + t(16)
R[23] = t(16) + ' f v  """" YWWWWWW"""""""".. kkB' + t(16)
R[24] = t(20) + 'K TTTTDD WWWWW """"""".. f  ' + t(16)
R[25] = t(20) + '  TTTDDD v  m  TTT"""".. r ' + t(17)
R[26] = t(20) + '  ' + t(17) + '""".. m ' + t(17)
R[27] = t(20) + 'KK  m  f    v   m  f  .. m' + t(18)
R[28] = t(20) + '   v    K   f    r    ..  ' + t(18)
R[29] = t(39) + ' f ..  ' + t(18)
R[30] = t(40) + '  ..v' + t(19)
R[31] = t(40) + ' f..  ' + t(18)
R[32] = t(39) + 'm ... b' + t(18)
R[33] = t(40) + ' ..    ' + t(17)
R[34] = t(40) + 'v.. ' + t(20)
R[35] = t(41) + '...f' + t(19)
R[36] = t(41) + ' ..m' + t(19)
R[37] = t(41) + 'v..' + t(20)
R[38] = t(42) + '.. ' + t(19)
R[39] = t(42) + '..' + t(20)
bad = [(y, len(R[y])) for y in range(H) if len(R[y]) != W]; assert not bad, bad
G = [list(R[y]) for y in range(H)]
# ragged stand edges and less boxy grass (point edits on the drawn grid)
for ch, cells in (('T', [(34, 10), (38, 10), (40, 10)]),
                  (' ', [(39, 10), (19, 12), (19, 13), (5, 21), (8, 22), (9, 22)]),
                  ('D', [(30, 10)]),
                  (' ', [(5, 17), (6, 17), (10, 17), (56, 17), (57, 17), (61, 17), (50, 22), (51, 22), (56, 22), (57, 22),
                         (58, 22), (25, 29), (26, 29), (33, 29), (39, 16), (35, 22), (34, 23), (41, 24), (2, 22)]),
                  ('f', [(57, 23), (6, 17), (26, 29)]), ('v', [(50, 22), (61, 17)]), ('"', [(41, 18)]), ('r', [(3, 22)])):
    for x, y in cells: G[y][x] = ch
# hand-drawn detail pass (Gary round 2): cells x11..50 on rows 10-18 and 21-28.  ',' dark grass  'd' dirt patch
_ = ' '
NEW = {
 10: 'TTTKKKTT' + ''.join([_, _, 'b', _, '"', _, '"', '"', _, ',', 'r', 'D', 'f', 'S', 'f', 'T', _, '.', '.', 'T', _]) + 'TTTTTTKKKTT',
 11: 'TT....KT' + ''.join(['f', ',', _, '"', '"', '"', '"', _, '"', '"', ',', ',', 'v', 'v', _, 'v', _, '.', '.', '"', '"', _]) + 'TT' + '.' * 8,
 12: 'TT.....T' + ''.join([_, ',', _, '"', _]) + '.' * 12 + '..' + '" "' + 'TT' + '.' * 8,
 13: 'TT.....T' + ''.join([_, _, _, _, ',', '"', '"', '"', _, 'f', _, 'b', _, 'r', _, 'm', 'r', '.', '.', _, '"', '"']) + 'TT' + '.' * 8,
 14: 'TT.....' + ''.join(['T', 'T', _, '"', '"', _, '"', '"', '"', _, 'd', 'd', _, _, 'D', _, ',', _, '.', '.', ',', 'f']) + 'TTT' + '.' * 7 + 'K',
 15: 'TTT===TTT' + ''.join(['=', '=', '=', 'T', _, ',', _, 'b', _, _, 'D', 'b', 'D', 'T', _, _, '.', '.', _, ',', _]) + 'TTT===TTTT',
 16: 'TTT' + ''.join([_, ',', _, '"', '"', '"', _, 'f', _, 'T', '=', '=', '=', 'r', _, _, 'D', ',', 'r', _, 'm', _, '.', '.', _, _, '"', '"', '"', _, 'f', _, _, _]) + 'TTT',
 17: 'TTT' + ''.join([_, _, '"', '"', '"', _, '"', '"', _, 'f', _, _, ',', _, _, _, 'v', _, '-', '-', _, _, '.', '.', _, '"', '"', _, '"', _, 'f']) + 'KKKTKK',
 18: ''.join(['-', _, '.', _, 'K', _, '"', _, '"', '"', '"', '.', 'v', _, 'b', 'T', 'T', _, 'f', _, 'r', 'f', '.', _, 'r', '.', '.', _, 'v', _, '"', _, ',', 'r']) + 'KKKTKK',
 21: ''.join([_, '-', '-', _, 'f', _, ',', 'b', 'v', _, ',', '"', _, _, 'r', _, '.', _, 'v', _, ',', 'b', _, _, 'f', _, _, '"', '"', _, '"', '.', '.', 's', _, _, 'T', _, 'f', _]),
 22: ''.join(['T', 'T', _, ',', _, 'b', 'r', _, ',', 'f', _, '"', '"', _, '"', _, _]) + 'W' * 6 + ''.join([_, '"', _, '"', '"', '"', _, '"', '.', '.', _, 'k', 'k', 'T', 'T', 'T', 'v']),
 23: 'TTTTT' + ''.join([_, 'f', ',', 'v', _, '"', '"', '"', _, '"', 'Y']) + 'W' * 7 + ''.join([_, '"', '"', _, '"', '"', '"', _, '.', '.', _, 'k', 'k', 'B', 'T', 'T', 'T']),
 24: 'T' * 9 + ''.join(['K', _, 'T', 'T', 'b', 'D', 'D', ',', _]) + 'W' * 5 + ''.join([_, _, '"', '"', _, '"', '"', _, '.', '.', _, 'f', _, _, 'T', 'T', 'T']),
 25: 'T' * 9 + ''.join([_, _, 'T', 'T', 'D', 'D', _, ',', 'd', 'd', 'v', _, 'm', _, _, 'T', 'T', _, '"', '"', _, '"', '.', '.', _, 'r', _]) + 'TTTT',
 26: 'T' * 9 + _ + _ + 'T' * 17 + ''.join([_, '"', '"', '.', '.', _, 'm', _]) + 'TTTT',
 27: 'T' * 9 + 'KK' + ''.join([_, ',', 'm', ',', _, 'f', _, 'd', 'd', _, 'v', _, 'b', _, 'm', ',', _, 'f', _, _, '.', '.', _, 'm']) + 'T' * 5,
 28: 'T' * 9 + ''.join([_, ',', _, 'v', _, 'b', _, ',', 'K', 'd', 'd', ',', 'f', _, _, ',', _, 'r', _, ',', _, '.', '.', '.', _, _]) + 'T' * 5,
}
for y, s in NEW.items():
    assert len(s) == 40, (y, len(s))
    for i, ch in enumerate(s): G[y][11 + i] = ch
DEAD = [(61,17), (10,17), (49,10), (13,10), ]  # sealed-off walkable cells -> trees
for x, y in DEAD: G[y][x] = 'T'
# organic grass pass: nibble exposed corners, sprinkle lone tufts around patch borders
_hh = lambda x, y: ((x * 92837111) ^ (y * 689287499)) & 0xff
_g = lambda x, y: 0 <= x < W and 0 <= y < H and G[y][x] == '"'
_cut = [(x, y) for y in range(H) for x in range(W) if G[y][x] == '"' and sum(not _g(x + a, y + b) for a, b in ((0, 1), (1, 0), (0, -1), (-1, 0))) >= 2 and _hh(x, y) < 110]
_tuft = [(x, y) for y in range(1, H - 1) for x in range(1, W - 1) if G[y][x] == ' ' and any(_g(x + a, y + b) for a, b in ((0, 2), (2, 0), (0, -2), (-2, 0), (1, 1), (-1, 1), (1, -1), (-1, -1))) and not any(_g(x + a, y + b) for a, b in ((0, 1), (1, 0), (0, -1), (-1, 0))) and _hh(x, y) < 70]
for x, y in _cut: G[y][x] = ' '
for x, y in _tuft: G[y][x] = '"'


TREES = {'T': ('tree_base', 'tree_top'), 'D': ('treed_base', 'treed_top')}
DECO = {'f': 'flowers_warm', 'v': 'flowers_violet', 'm': 'mushroom_glow', 'r': 'rock', 'b': 'bush', '-': 'fence_h',
        'S': 'x_city_statue', 's': 'sign', 'Y': 'x_reeds', 'B': 'barrel', 'x': 'boulder'}
STALLS = {45: 'x_city_stall_fruit', 46: 'x_city_stall_flowers'}
h = lambda x, y: (x * 73856093 ^ y * 19349663) & 0xffff
def at(x, y): return G[y][x] if 0 <= x < W and 0 <= y < H else 'T'
SIDES = [(0, -1), (1, 0), (0, 1), (-1, 0)]; DIAGS = [(1, -1), (1, 1), (-1, 1), (-1, -1)]
def edge_tile(prefix, x, y, same, bases):
    s = ''.join('0' if same(x + dx, y + dy) else '1' for dx, dy in SIDES)
    d = ''.join('0' if same(x + dx, y + dy) else '1' for dx, dy in DIAGS)
    if s == '0000' and d == '0000': return bases[h(x, y) % len(bases)]
    cands = [n for n in ID if n.startswith(prefix + s + '_')]
    # a diagonal only matters when both its sides are open; the others may be either way
    rel = [s[i] == '0' and s[(i + 1) % 4] == '0' for i in range(4)]
    def score(n):
        dd = n[len(prefix) + 5:len(prefix) + 9]
        return sum((dd[i] != d[i]) * (10 if rel[i] else 1) for i in range(4))
    best = min(score(n) for n in cands); pick = sorted(n for n in cands if score(n) == best)
    assert best < 10, (prefix, x, y, s, d, pick)
    return pick[h(x, y) % len(pick)]
is_trail = lambda x, y: at(x, y) in '.d' or (at(x, y) == 'K' and NAME.get(orig['ground'][y][x], '').startswith('trail'))
is_dirt = lambda x, y: at(x, y) == 'd'
is_water = lambda x, y: at(x, y) == 'W'
is_tall = lambda x, y: at(x, y) in '"R' and not (at(x, y) == 'R' and y not in (19, 20))
tall = lambda x, y: at(x, y) == '"' or (at(x, y) == 'R' and y in (19, 20))
is_tree = lambda x, y: at(x, y) in TREES or (at(x, y) == 'K' and 0 <= x < W and 0 <= y < H and NAME.get(orig['decoration'][y][x], '') in ('tree_base', 'treed_base'))
gr = lambda x, y: 'grass_%d' % (h(x, y) % 4)

g = [[0] * W for _ in range(H)]; d = [[0] * W for _ in range(H)]; o = [[0] * W for _ in range(H)]
c = [[0] * W for _ in range(H)]; e = [[0] * W for _ in range(H)]
for y in range(H):
    for x in range(W):
        ch = G[y][x]
        if ch == 'K':
            for k, A in (('ground', g), ('decoration', d), ('collision', c)): A[y][x] = orig[k][y][x]
            ov = orig['overlay'][y][x]
            if ov and not NAME.get(ov, '').startswith(('tree_top', 'treed_top', 'tall_grass')): o[y][x] = ov
            continue
        if ch in '.d': g[y][x] = ID[edge_tile('trail>grass_', x, y, is_trail, ['trail_0', 'trail_1', 'trail_2', 'trail_3'])]
        elif ch == 'W': g[y][x] = ID[edge_tile('water>grass_', x, y, is_water, ['water', 'water_1', 'water_2'])]; c[y][x] = 3
        else: g[y][x] = ID[gr(x, y)]
        if ch in TREES: d[y][x] = ID[TREES[ch][0]]; c[y][x] = 1
        elif ch == '=':
            nm = 'ledge_m'
            if at(x - 1, y) != '=': nm = 'ledge_l'
            elif at(x + 1, y) != '=': nm = 'ledge_r'
            d[y][x] = ID[nm]; c[y][x] = 2
        elif ch in DECO: d[y][x] = ID[DECO[ch]]; c[y][x] = CODE[ID[DECO[ch]]]
        elif ch == 'k':
            part = '0_0' if at(x, y - 1) != 'k' else '1_0'
            d[y][x] = ID[STALLS[x] + '_' + part]; c[y][x] = 1
        elif tall(x, y):
            nesw = ''.join('0' if tall(x + dx, y + dy) else '1' for dx, dy in SIDES); v = x % 2
            d[y][x] = ID['tall_grass_%s_v%d' % (nesw, v)]; o[y][x] = ID['tall_grass_front_%s_v%d' % (nesw, v)]; e[y][x] = 1
# whole trees: canopy over every tree with a tree below it, and over the open square above each top-row tree
NPC = {(n['x'], n['y']) for n in j['npcs']}
for y in range(H):
    for x in range(W):
        ch = G[y][x]
        if ch not in TREES: continue
        top = TREES[ch][1]
        if is_tree(x, y + 1) or y == H - 1: o[y][x] = ID[top]
        if y > 0 and not is_tree(x, y - 1) and G[y - 1][x] not in 'WK' and not o[y - 1][x] and (x, y - 1) not in NPC: o[y - 1][x] = ID[top]
        elif y > 0 and not is_tree(x, y - 1) and G[y - 1][x] in '"' : o[y - 1][x] = ID[top]
# tall grass tips over the square above each top-row patch cell
for y in range(1, H):
    for x in range(W):
        if tall(x, y) and not tall(x, y - 1) and not o[y - 1][x] and not is_tree(x, y - 1) and (x, y - 1) not in NPC:
            ew = ('0' if tall(x + 1, y) else '1') + ('0' if tall(x - 1, y) else '1')
            n = 'tall_grass_tips_%s_v%d' % (ew, x % 2)
            if n in ID: o[y - 1][x] = ID[n]
L.update(ground=g, decoration=d, overlay=o, collision=c, encounter=e)

# encounter zones: the forced reeds rect first (unchanged), then one rect per tall-grass patch
seen = set(); zones = [z for z in j['encounter_zones'] if z.get('forced')]
for y in range(H):
    for x in range(W):
        if G[y][x] != '"' or (x, y) in seen: continue
        st = [(x, y)]; seen.add((x, y)); comp = []
        while st:
            a, b = st.pop(); comp.append((a, b))
            for dx, dy in SIDES:
                q = (a + dx, b + dy)
                if q not in seen and at(*q) == '"': seen.add(q); st.append(q)
        xs = [p[0] for p in comp]; ys = [p[1] for p in comp]
        zones.append({'x0': min(xs), 'y0': min(ys), 'x1': max(xs), 'y1': max(ys), 'table': 'route_east_grass'})
j['encounter_zones'] = zones

# signs and the new hidden item
LINES = os.path.join(ROOT, 'text/overworld_lines.json')
if not any(s_['id'] == 'route_east_junction_sign' for s_ in j['signs']):
    j['signs'].append({'id': 'route_east_junction_sign', 'x': 44, 'y': 21,
        'text': 'DRAFT dev label: junction post - Coast Road south, Aurelith east, Brookhollow west',
        'text_ref': 'overworld_lines.json maps.route_east.route_east_junction_sign', 'text_note': 'dev label only; final text = text_ref'})
if not any(i_['id'] == 're_redo_south_nook' for i_ in j['items']):
    j['items'].append({'id': 're_redo_south_nook', 'x': 46, 'y': 33, 'hidden': True, 'item': 'coin_pouch_small', 'qty': 1,
        'note': 'end of the little nook off the coast path', 'flag': 'item_route_east_re_redo_south_nook'})
TL = json.load(open(LINES)); m = TL['maps']['route_east']
if 'route_east_junction_sign' not in m:
    pg = ['EAST ROAD JUNCTION\nSouth: the Coast Road.', 'East: Aurelith. West: Brookhollow.']
    m['route_east_junction_sign'] = {'pages': pg, 'lines': [{'id': 'default', 'flags': [], 'pages': pg}], 'note': 'DRAFT pending Gary (route_east redo)'}
    json.dump(TL, open(LINES, 'w'), indent=1, ensure_ascii=False)
j['redo'] = 'tools/map_audit/route_east_redo.py (Oct 30 2026)'
json.dump(j, open(MAP, 'w'), indent=1)
print('wrote', MAP)

def show():
    print('   ' + ''.join(str(x // 10) for x in range(W))); print('   ' + ''.join(str(x % 10) for x in range(W)))
    for y in range(H): print('%2d ' % y + ''.join(G[y]))
if __name__ == '__main__' and os.environ.get('SHOW'): show()
