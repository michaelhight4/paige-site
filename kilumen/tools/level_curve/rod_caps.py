#!/usr/bin/env python3
"""Good / super rod tables: cap every slot at that map's region cap + 2 (Gary Oct 30 2026 12:59 AM CT), never above 68.
Region of a map = tools/level_curve/rebalance.py REG (longest prefix). Writes data/fishing_tables.json (indent 1) + rod_caps.json."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); os.chdir(ROOT)
src = open(os.path.join(HERE, 'rebalance.py')).read(); ns = {}
exec(src[src.index('ENEMY_MAX ='):src.index('STATS =')], ns)
p = 'data/fishing_tables.json'; d = json.load(open(p)); caps = {}
for m, v in d['maps'].items():
  ri = ns['region'](m); cap = min(68, (ns['REG'][ri][4][1] if ri is not None else 66) + 2); caps[m] = cap
  for tier in [k for k in v if k != 'basic']:
    def walk(o):
      if isinstance(o, dict):
        for k, x in o.items():
          if k == 'level' and isinstance(x, list) and len(x) == 2: o[k] = [min(x[0], cap), min(x[1], cap)]
          else: walk(x)
      elif isinstance(o, list):
        for x in o: walk(x)
    walk(v[tier])
open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
json.dump(caps, open(os.path.join(HERE, 'rod_caps.json'), 'w'), indent=1, sort_keys=True)
print(len(caps), 'maps capped')
