#!/usr/bin/env python3
"""Pad region 5-8 trainer teams to 4 Kilu (Gary, Oct 31 2026: "all the stronger trainers past region 4 must have 4-6 Kilu").
Scope: map NPC trainers on region 5-8 maps (art/world/overworld/maps/*.json, `team` lists) and hall helpers 5-8
(data/masters.json). Skipped: rivals (Ron, story), post-game ids (r9_ / fin_), Masters (already 5-6), teams already >= 4.
Added members: species from the region's wild pool (data/encounters_wired.json zones; the trainer's own map first), built
(in species_with_art), catchable (not legendary, not starter-only), not already on the team, at or above their evolution level;
hall helpers prefer their Master's element. Level = the team's lowest level, so the existing ace stays on top.
Deterministic and idempotent (teams already at 4 are left alone). Usage: python3 tools/level_curve/pad_teams.py [--dry]"""
import json, glob, os, re, sys, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); os.chdir(ROOT)
TARGET = 4
SP = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import { SPECIES } from './src/ui/data.js'; import { buildCreatures } from './src/battle/data/creatures.js';
import { STARTER_ONLY } from './src/battle/data/starters.js'; const CR = buildCreatures();
console.log(JSON.stringify(Object.fromEntries(SPECIES.map((s) => [s.id, { el: s.el, evo: CR[s.id]?.evoLevel || 0,
  ok: !!CR[s.id] && s.rarity !== 'legendary' && !STARTER_ONLY.includes(s.id) }]))));"""]))
ENC = json.load(open('data/encounters_wired.json')); ART = set(ENC['species_with_art']) - set(ENC.get('species_without_art', []))
REG = [(r, ps) for r, ps in json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
  "import { REGION_PREFIXES } from './src/battle/data/xp_regions.js'; console.log(JSON.stringify(REGION_PREFIXES));"]))]
def region(k):
  best = None
  for r, ps in REG:
    for p in ps:
      if k.lower().startswith(p) and (best is None or len(p) > best[1]): best = (r, len(p))
  return best[0] if best else None
def pool(map_name, r):
  own, rest = [], []
  for z, v in ENC['zones'].items():
    if region(z) != r: continue
    for s in v['slots']: (own if z.startswith(map_name) else rest).append((s.get('weight', 1), s['species']))
  out = []
  for lst in (own, rest):
    for w, sp in sorted(lst, key=lambda x: (-x[0], x[1])):
      if sp not in out: out.append(sp)
  return out
def pick(team, cands, level, prefer_el=None, key=lambda m: m['species']):
  have = {key(m) for m in team}
  ok = [s for s in cands if s in SP and SP[s]['ok'] and s in ART and s not in have and SP[s]['evo'] <= level]
  if prefer_el: ok = [s for s in ok if set(SP[s]['el']) & set(prefer_el)] + [s for s in ok if not set(SP[s]['el']) & set(prefer_el)]
  return ok[: max(0, TARGET - len(team))]
def dump_like(src, d):
  nl = '\n' if src.endswith('\n') else ''
  for i in (None, 1, 2):
    for sep in ((',', ':'), (', ', ': '), (',', ': ')):
      for a in (True, False):
        if json.dumps(json.loads(src), indent=i, separators=sep, ensure_ascii=a) + nl == src: return json.dumps(d, indent=i, separators=sep, ensure_ascii=a) + nl
  raise SystemExit('unknown JSON format')
dry = '--dry' in sys.argv; changed = []
for f in sorted(glob.glob('art/world/overworld/maps/*.json')):
  m = os.path.basename(f)[:-5]; r = region(m)
  if r is None or not 5 <= r <= 8: continue
  src = open(f).read(); d = json.loads(src); hit = False
  for n in d.get('npcs') or []:
    t = n.get('team')
    if not isinstance(t, list) or not t or len(t) >= TARGET or re.match(r'^(r9_|fin_)', n.get('id', '')) or n.get('kind') == 'rival' or n.get('gd_class') == 'ron': continue
    lv = min(x['level'] for x in t); add = pick(t, pool(m, r), lv)
    if len(t) + len(add) < TARGET: raise SystemExit(f'pool too small for {m}.{n["id"]}')
    t.extend({'species': s, 'level': lv} for s in add); hit = True; changed.append(f'{m}.{n["id"]} +' + ','.join(f'{s} L{lv}' for s in add))
  if hit and not dry: open(f, 'w').write(dump_like(src, d))
src = open('data/masters.json').read(); M = json.loads(src); hit = False
for h in M['halls']:
  if not 5 <= h['coin_number'] <= 8: continue
  for t in h['trainers']:
    team = t['team']
    if len(team) >= TARGET: continue
    lv = min(x['level'] for x in team); add = pick(team, pool(h['zone'], h['coin_number']), lv, h['master'].get('element'), key=lambda x: x.get('battle_species') or x['species'])
    if len(team) + len(add) < TARGET: raise SystemExit(f'pool too small for {h["hall_map"]}.{t["id"]}')
    team.extend({'species': s, 'level': lv, 'battle_species': s, 'stand_in': False} for s in add); hit = True
    changed.append(f'{h["hall_map"]}.{t["id"]} +' + ','.join(f'{s} L{lv}' for s in add))
if hit and not dry: open('data/masters.json', 'w').write(dump_like(src, M))
print('\n'.join(changed)); print(f'{len(changed)} teams padded to {TARGET}')
