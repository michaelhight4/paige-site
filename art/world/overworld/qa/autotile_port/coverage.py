# READ-ONLY: per terrain pair, which 47-blob configurations already exist as tiles (w0), and how many wobble variants.
import json, re, os, collections, itertools
OUT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def canon(s, d):   # s = N,E,S,W low?  d = NE,SE,SW,NW low?  -> blob-47 key (diag only counts when both its sides are "same")
    N, E, S, W = s; NE, SE, SW, NW = d
    return (N, E, S, W, NE and not N and not E, SE and not S and not E, SW and not S and not W, NW and not N and not W)
ALL = {canon(s, d) for s in itertools.product((0, 1), repeat=4) for d in itertools.product((0, 1), repeat=4)}
ALL.discard((0,) * 8)
res = {}
for f, pre in (('tileset.json', ''), ('tileset_extra.json', '')):
    t = json.load(open(os.path.join(OUT, f))); tl = t['tiles']; tl = tl.values() if isinstance(tl, dict) else tl
    by = collections.defaultdict(lambda: collections.defaultdict(set))
    for x in tl:
        m = re.match(r'^(.+?>.+?)_([01]{4})_([01]{4})(?:_w(\d))?$', x['name'])
        if not m: continue
        s = tuple(int(c) for c in m.group(2)); d = tuple(int(c) for c in m.group(3)); w = int(m.group(4) or 0)
        by[m.group(1)][w].add(canon(s, d))
    for pair, ws in sorted(by.items()):
        res[f + ':' + pair] = dict(blob47_w0=len(ws[0] & ALL), of=len(ALL), wobble_variants=sorted(ws), raw_names=sum(len(v) for v in ws.values()))
json.dump(res, open(os.path.join(OUT, 'qa/autotile_port/coverage.json'), 'w'), indent=1)
for k, v in res.items(): print(k, v)
