#!/usr/bin/env python3
"""Level curve rebalance (Gary, Oct 30 2026 12:22-12:25 AM CDT). Idempotent-ish: run once on the old data.
Regions (story order): caps R1 12, R2 20, R3 28, R4 36, R5 42, R6 50; R7-R8 trainers 60-68; every enemy <= 68.
R1-R4 already sit under their caps: clamp only. R5+ : linear remap old band -> new band, trainers floored, Master ace = band top.
Writes tools/level_curve/before_after.json (per-region min/max before and after, per source kind)."""
import json, re, glob, os, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
ENEMY_MAX = 68
# region: (maps / zone prefixes, mode, old band, new band, trainer floor)
REG = [
  ('R1 Brookhollow / Trail 1 / Fernwick', ['route1', 'brookhollow', 'bh_', 'fernwick'], 'clamp', None, (2, 12), 0),
  ('R2 Thornwood / East trail / Saltmere', ['thornwood', 'route_east', 'route_aurelith_saltmere', 'saltmere', 'greystone_b1', ], 'clamp', None, (2, 20), 0),
  ('R3 Revival Heights', ['route_revival_grass', 'route_revival_tr', 'route_revival.', 'route_revival', 'revival', 'greystone', 'tr_', 'sa_', 're_'], 'clamp', None, (2, 28), 0),
  ('R4 Frostspire', ['frostspire', 'route_revival_saltmere', 'fs_', 'fp_', 'rs_', 'rsf_'], 'clamp', None, (2, 36), 0),
  ('R5 Sunmeadow / Mirefen', ['sunmeadow', 'route_revival_sunmeadow', 'route_saltmere_mirefen', 'route_sunmeadow_mirefen', 'mirefen', 'smf_', 'sme_', 'smm_', 'sm_harbour'], 'remap', (28, 42), (36, 42), 37),
  ('R6 Tidewater', ['route_coast', 'tidewater', 'tc_', 'ct_'], 'remap', (36, 49), (43, 50), 44),
  ('R7 Lanternport', ['route_fernwick_lanternport', 'lanternport', 'lighthouse', 'lp_', 'fl_'], 'remap', (40, 64), (54, 64), 60),
  ('R8 Cindervale', ['route_cindervale', 'cindervale', 'ac_'], 'remap', (46, 67), (58, 68), 62),
  ('Aurelith / Arena (post R8)', ['aurelith'], 'remap', (58, 69), (62, 68), 62),
  ('Wellspire r9 + flashback lab', ['r9_', 'fin_'], 'remap', (60, 75), (62, 68), 62),
]
def region(key):
  """Longest matching map / zone prefix wins (route_revival_saltmere -> R4 beats route_revival -> R3)."""
  k = key.lower(); best = None
  for i, r in enumerate(REG):
    for p in r[1]:
      p = p.rstrip('.')
      if k.startswith(p) and (best is None or len(p) > best[1]): best = (i, len(p))
  return best[0] if best else None
STATS = collections.defaultdict(lambda: {'before': [], 'after': []})
def lv(l, ri, kind):
  if ri is None: n = min(l, ENEMY_MAX)
  else:
    name, _, mode, old, new, floor = REG[ri]
    if mode == 'clamp': n = max(new[0], min(l, new[1]))
    else:
      a, b = old; c, d = new; t = (min(max(l, a), b) - a) / (b - a); n = round(c + t * (d - c))
      if kind in ('trainer', 'master') and n < floor: n = floor
    n = min(n, ENEMY_MAX)
  STATS[(REG[ri][0] if ri is not None else 'unmapped', kind)]['before'].append(l); STATS[(REG[ri][0] if ri is not None else 'unmapped', kind)]['after'].append(n)
  return n
def masters_top(team, ri):
  """Master ace = band top (cap), rest shifted by the same delta, capped."""
  if ri is None or REG[ri][2] == 'clamp': return
  top = REG[ri][4][1]; d = top - max(m['level'] for m in team)
  for m in team: m['level'] = min(ENEMY_MAX, m['level'] + d)

# ---- maps: npc teams
for f in sorted(glob.glob('art/world/overworld/maps/*.json')):
  if f.endswith(('frostspire_hall_int.json', 'mirefen_hall_int.json')): continue  # puzzle-tells worker owns these (no team levels)
  s = open(f).read(); j = json.loads(s); ri = region(j['name']); ch = False
  for n in j.get('npcs', []):
    t = n.get('team'); lists = t if isinstance(t, list) else [v for v in (t or {}).values() if isinstance(v, list)] if isinstance(t, dict) else []
    if lists and isinstance(lists[0], dict): lists = [lists]
    for L in lists:
      for x in L:
        if isinstance(x, dict) and isinstance(x.get('level'), int):
          nl = lv(x['level'], ri, 'master' if n.get('kind') == 'master' else 'trainer'); ch |= nl != x['level']; x['level'] = nl
  if ch: open(f, 'w').write(json.dumps(j, separators=(',', ':'), ensure_ascii=False) + ('\n' if s.endswith('\n') else ''))
# ---- masters.json halls
p = 'data/masters.json'; d = json.load(open(p))
for h in d['halls']:
  ri = region(h['hall_map'])
  for t in h['trainers']:
    for x in t['team']: x['level'] = lv(x['level'], ri, 'trainer')
  for x in h['master']['team']: x['level'] = lv(x['level'], ri, 'master')
  masters_top(h['master']['team'], ri)
open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
# ---- wild tables ([lo, hi] slots)
def wild(o, ri, kind='wild'):
  if isinstance(o, dict):
    for k, v in o.items():
      if k == 'level' and isinstance(v, list) and len(v) == 2 and all(isinstance(i, int) for i in v):
        o[k] = sorted([lv(v[0], ri, kind), lv(v[1], ri, kind)])
      elif k == 'level' and isinstance(v, int): o[k] = lv(v, ri, kind)
      else: wild(v, ri, kind)
  elif isinstance(o, list):
    for v in o: wild(v, ri, kind)
for p, path in [('art/world/overworld/encounters/encounters.json', 'zones'), ('data/encounters_wired.json', 'zones'), ('data/terrain_encounters.json', 'water'), ('data/terrain_encounters.json', 'cave')]:
  d = json.load(open(p))
  for z, v in d[path].items(): wild(v, region(((v.get('maps') or [z]) if isinstance(v, dict) else [z])[0]))  # classify by the map served, not the legacy zone id (sunmeadow_grass serves route1)  # spread slots are regenerated after: node tools/encounters/habitat_spread.mjs
  open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
p = 'data/fishing_tables.json'; d = json.load(open(p))
for z, v in d['maps'].items(): wild(v.get('basic'), region(z)); wild({k: v[k] for k in v if k != 'basic'}, None, 'wild_rod')  # good/super rods: late items, cap only
open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
# ---- trainer_teams.js: 'map.id': [... level: N ...]
p = 'src/battle/data/trainer_teams.js'; out = []
for line in open(p).read().split('\n'):
  m = re.match(r"\s*'([a-z0-9_]+)\.", line); ri = region(m.group(1)) if m else (region('tidewater') if line.startswith('const RON_TIDEWATER') else None)
  if m or line.startswith('const RON_TIDEWATER'):
    kind = 'master' if m and '.master_' in line else ('ron' if not m else 'trainer')
    line = re.sub(r'level: (\d+)', lambda g: f'level: {lv(int(g.group(1)), ri, kind)}', line)
  out.append(line)
open(p, 'w').write('\n'.join(out))
json.dump({f'{k[0]}|{k[1]}': {'before': [min(v['before']), max(v['before'])], 'after': [min(v['after']), max(v['after'])], 'n': len(v['before'])} for k, v in STATS.items()}, open('tools/level_curve/before_after.json', 'w'), indent=1)
for k, v in sorted(STATS.items()): print(f"{k[0]:40} {k[1]:8} {min(v['before']):3}-{max(v['before']):3} -> {min(v['after']):3}-{max(v['after']):3}  n={len(v['before'])}")
