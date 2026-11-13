# READ-ONLY survey of map ground layers -> terrain pairs. Writes only qa/autotile_port/survey.json.
import json, glob, os, re, collections
OUT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def ts(p):
    t = json.load(open(p)); tl = t['tiles']; tl = tl.values() if isinstance(tl, dict) else tl
    return {x['id']: x for x in tl}
TS = {}
def tileset_for(mp, d):
    p = os.path.normpath(os.path.join(os.path.dirname(mp), d['tileset']))
    if p not in TS: TS[p] = ts(p)
    return TS[p]
res = {}
for src in ('maps/*.json', 'maps/variants/*.json', 'maps_new/*.json', 'interiors_new/maps/*.json'):
    for mp in sorted(glob.glob(os.path.join(OUT, src))):
        d = json.load(open(mp)); T = tileset_for(mp, d)
        g = d['layers']['ground']; flat = [v for row in g for v in row] if isinstance(g[0], list) else g
        cats = collections.Counter(); pairs = collections.Counter(); bases = collections.Counter(); unknown = 0
        for v in flat:
            t = T.get(v)
            if not t: unknown += 1; continue
            n = t['name']; c = t['category']; cats[c] += 1
            if '>' in n: pairs[re.sub(r'_[01]{4}_[01]{4}(_w\d)?$', '', n)] += 1
            elif c in ('terrain', 'x_terrain'): bases[re.sub(r'(_\d+)$', '', n)] += 1
            else: bases[c] += 1
        res[os.path.relpath(mp, OUT)] = dict(size=[d['width'], d['height']], tags=d.get('tags'), kind=d.get('kind'),
            categories=dict(cats), bases=dict(bases), pairs=dict(pairs), unknown_ids=unknown)
json.dump(res, open(os.path.join(OUT, 'qa/autotile_port/survey.json'), 'w'), indent=1)
for k, v in res.items():
    print(k, v['size'], 'pairs=', v['pairs'], 'bases=', {a: b for a, b in v['bases'].items()}, 'unk=', v['unknown_ids'] or '')
