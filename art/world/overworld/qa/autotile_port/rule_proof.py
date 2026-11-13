# READ-ONLY proof: recover the semantic terrain grid from each shipped map's ground layer, re-run World Design's own
# ground rule (a copy of build.resolve's logic, names only, no art) and compare tile ids. Writes qa/autotile_port/rule_proof.json.
import json, os, re, collections
OUT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRIO = {'grass': 0, 'grass_dark': 0, 'cave': 0, 'mud': 1, 'sand': 1, 'snow': 1, 'path': 2, 'trail': 2, 'water': 3, 'cave_water': 3}
NV, NW, WATER_NV = 4, 3, 3
def vhash(x, y):
    h = ((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) & 0xffffffff
    h = ((h ^ (h >> 15)) * 0x2c1b3c6d) & 0xffffffff
    h = ((h ^ (h >> 12)) * 0x297a2d39) & 0xffffffff
    return h ^ (h >> 15)
ts = json.load(open(f'{OUT}/tileset.json')); ID = {t['id']: t['name'] for t in ts['tiles']}; BYN = {t['name']: t['id'] for t in ts['tiles']}
def terr_of(n):
    if '>' in n: return n.split('>')[0]
    if n.startswith('cavewall'): return 'cavewall'
    m = re.match(r'^(grass_dark|grass|path|trail|sand|snow|mud|cave_water|cave|water)(_\d+)?$', n)
    return m.group(1) if m else n          # interior/other: keep name
def resolve(terr, w, h):
    tr = lambda x, y: terr[y][x] if 0 <= x < w and 0 <= y < h else None
    G = [[None] * w for _ in range(h)]; missing = collections.Counter()
    for y in range(h):
        for x in range(w):
            t = terr[y][x]
            if t == 'cavewall':
                if tr(x, y + 1) not in ('cavewall', None): nm = 'cavewall_face_l'
                elif tr(x, y + 2) not in ('cavewall', None): nm = 'cavewall_face_u'
                else:
                    fl = lambda xx: any(tr(xx, yy) not in ('cavewall', None) for yy in (y, y + 1, y + 2))
                    e, w_ = fl(x + 1), fl(x - 1)
                    nm = 'cavewall_side_ew' if e and w_ else 'cavewall_side_e' if e else 'cavewall_side_w' if w_ else 'cavewall_top'
            elif t not in PRIO: nm = None
            else:
                p = PRIO[t]
                low = lambda xx, yy: (lambda n: n if (n is not None and n in PRIO and PRIO[n] < p) else None)(tr(xx, yy))
                s = [low(x, y - 1), low(x + 1, y), low(x, y + 1), low(x - 1, y)]
                d = [low(x + 1, y - 1), low(x + 1, y + 1), low(x - 1, y + 1), low(x - 1, y - 1)]
                lows = [v for v in s + d if v]
                if not lows:
                    v = vhash(x, y) % NV
                    nm = (t if v % WATER_NV == 0 else f'{t}_{v % WATER_NV}') if t in ('water', 'cave_water') else f'{t}_{v}'
                else:
                    A = collections.Counter(lows).most_common(1)[0][0]; wv = (vhash(x, y) >> 8) % NW
                    nm = f'{t}>{A}_' + ''.join('1' if v else '0' for v in s) + '_' + ''.join('1' if v else '0' for v in d) + (f'_w{wv}' if wv else '')
                    if len(set(lows)) > 1: missing['3way_cells'] += 1
            G[y][x] = nm
            if nm and nm not in BYN: missing['name_not_in_tileset'] += 1
    return G, missing
res = {}
for mn in ('brookhollow', 'route1', 'fernwick', 'thornwood', 'lantern_rest', 'greystone_entrance', 'greystone_b1'):
    d = json.load(open(f'{OUT}/maps/{mn}.json')); w, h = d['width'], d['height']; g = d['layers']['ground']
    g2 = [g[y * w:(y + 1) * w] for y in range(h)] if not isinstance(g[0], list) else g
    terr = [[terr_of(ID[v]) for v in row] for row in g2]
    G, miss = resolve(terr, w, h)
    same = sum(1 for y in range(h) for x in range(w) if G[y][x] == ID[g2[y][x]])
    diffs = [(x, y, ID[g2[y][x]], G[y][x]) for y in range(h) for x in range(w) if G[y][x] != ID[g2[y][x]]][:8]
    res[mn] = dict(cells=w * h, identical=same, sample_diffs=diffs, **miss)
    print(mn, f'{same}/{w*h}', dict(miss), diffs[:4])
json.dump(res, open(f'{OUT}/qa/autotile_port/rule_proof.json', 'w'), indent=1)
