# compare sandbox build output vs live: ids, sheet indices, per-map layer diffs
import json, sys, glob, os
LIVE = '/workspace/kilumen/art/world/overworld'; SB = LIVE + '/qa/autotile_port/port/sandbox/overworld'
L = {t['name']: t for t in json.load(open(LIVE + '/tileset.json'))['tiles']}
S = {t['name']: t for t in json.load(open(SB + '/tileset.json'))['tiles']}
moved = [n for n in L if n not in S or (S[n]['id'], S[n].get('sheet'), S[n].get('index')) != (L[n]['id'], L[n].get('sheet'), L[n].get('index'))]
new = sorted(((S[n]['id'], n, S[n].get('sheet'), S[n].get('index')) for n in S if n not in L))
print('legacy tiles:', len(L), 'moved/missing:', len(moved), moved[:5]); print('new:', len(new), new[:2], new[-2:])
idn = {t['id']: n for n, t in S.items()}
out = {}
for f in sorted(glob.glob(SB + '/maps/*.json') + glob.glob(SB + '/maps/variants/*.json')):
    rel = os.path.relpath(f, SB + '/maps'); lf = LIVE + '/maps/' + rel
    a = json.load(open(f)); b = json.load(open(lf)) if os.path.exists(lf) else None
    if b is None: print('NEW MAP?', rel); continue
    d = {}
    for k in a['layers']:
        cells = [(x, y, idn.get(b['layers'][k][y][x]) if False else b['layers'][k][y][x], a['layers'][k][y][x]) for y in range(a['height']) for x in range(a['width']) if a['layers'][k][y][x] != b['layers'][k][y][x]]
        if cells: d[k] = [(x, y, idn.get(o, o), idn.get(n, n)) for x, y, o, n in cells]
    extra = set(a) ^ set(b); other = [k for k in a if k in b and k not in ('layers',) and a[k] != b[k]]
    if d or extra or other: out[rel] = dict(layers=d, keys=sorted(extra), other=other)
for k, v in out.items(): print(k, {l: len(c) for l, c in v['layers'].items()}, v['keys'], v['other'])
json.dump(out, open(LIVE + '/qa/autotile_port/port/compare.json', 'w'), indent=0)
