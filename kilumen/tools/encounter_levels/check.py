#!/usr/bin/env python3
"""Wild level band check (Coder, Oct 30 2026; Gary bug: L36 Kilu in Route 1 grass).
Classifies every wild table by the MAPS it serves (zone.maps, or the map key for fishing), not by its zone id, and
flags slots outside that region's band. Zone ids are legacy names (sunmeadow_grass serves route1), so id-prefix
classification is wrong. Exit 1 on any problem. Usage: python3 tools/encounter_levels/check.py [--json]"""
import json, os, sys, runpy
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# region bands (lo, hi) for WILD levels, story order; index matches tools/level_curve/rebalance.py REG
BANDS = [(2, 12), (2, 20), (2, 28), (2, 36), (36, 44), (43, 52), (54, 66), (58, 68), (62, 68), (62, 68), (48, 68)]
PREFIX = [
  ['route1', 'brookhollow', 'bh_', 'fernwick'],
  ['thornwood', 'route_east', 'route_aurelith_saltmere', 'saltmere', 'greystone_b1'],
  ['route_revival', 'revival', 'greystone', 'tr_', 'sa_', 're_'],
  ['frostspire', 'route_revival_saltmere', 'fs_', 'fp_', 'rs_', 'rsf_'],
  ['sunmeadow', 'route_revival_sunmeadow', 'route_saltmere_mirefen', 'route_sunmeadow_mirefen', 'mirefen', 'smf_', 'sme_', 'smm_', 'sm_harbour'],
  ['route_coast', 'tidewater', 'tc_', 'ct_'],
  ['route_fernwick_lanternport', 'lanternport', 'lighthouse', 'lp_', 'fl_'],
  ['route_cindervale', 'cindervale', 'ac_'],
  ['aurelith'],
  ['r9_', 'fin_'],
  ['gullhaven'],
]
# Trail 1 / starting area hard band (Gary 11:42 AM CT Oct 23 2026: Route 1 L2-4); night adds +2/+3 at runtime
MAP_BANDS = {'route1': (2, 4), 'route1_storm': (2, 4)}
def region(key):
  k = key.lower(); best = None
  for i, ps in enumerate(PREFIX):
    for p in ps:
      if k.startswith(p) and (best is None or len(p) > best[1]): best = (i, len(p))
  return best[0] if best else None
def levels(o):
  if isinstance(o, dict):
    for k, v in o.items():
      if k == 'level' and isinstance(v, list) and len(v) == 2 and all(isinstance(i, int) for i in v): yield v
      elif k == 'level' and isinstance(v, int): yield [v, v]
      elif k != 'cap': yield from levels(v)
  elif isinstance(o, list):
    for v in o: yield from levels(v)
def check_zone(src, zid, z, maps, map_bands=True):
  out = []
  if z.get('inert'): return out
  keys = maps or [zid]
  for m in keys:
    band = (map_bands and MAP_BANDS.get(m)) or (BANDS[region(m)] if region(m) is not None else None)
    if not band: continue
    for lo, hi in levels(z.get('slots', z)):
      if lo < band[0] or hi > band[1]: out.append(dict(file=src, zone=zid, map=m, level=[lo, hi], band=list(band)))
    cap = (z.get('cap') or {}).get('level')
    if isinstance(cap, list) and (cap[0] < band[0] or cap[1] > band[1]): out.append(dict(file=src, zone=zid, map=m, cap=cap, band=list(band)))
  return out
def run(root=ROOT):
  P = []
  for f in ['data/encounters_wired.json', 'art/world/overworld/encounters/encounters.json']:
    d = json.load(open(os.path.join(root, f)))
    for zid, z in d['zones'].items(): P += check_zone(f, zid, z, z.get('maps'))
  d = json.load(open(os.path.join(root, 'data/fishing_tables.json')))
  for m, v in d['maps'].items():
    if isinstance(v, dict) and v.get('basic'): P += check_zone('data/fishing_tables.json', m + '.basic', v['basic'], [m], False)  # rod tables: region band only
  d = json.load(open(os.path.join(root, 'data/terrain_encounters.json')))
  for k in ('water', 'cave'):
    for m, v in d[k].items(): P += check_zone('data/terrain_encounters.json', k + '.' + m, v, [m], False)
  return P
if __name__ == '__main__':
  P = run()
  if '--json' in sys.argv: print(json.dumps(P, indent=1))
  else:
    for p in P: print(p)
    print(f'{len(P)} problem(s)')
  sys.exit(1 if P else 0)
