#!/usr/bin/env python3
"""Merge Text Bot's data/textbot_puzzle_hints.json into text/overworld_lines.json (puzzle_hints_audit, Coder).
Text Bot ids -> real ids: r9 trainers live under r9.ft.<id>.after (with the "Name: " prefix region9 uses), heart cave
trainer_hint -> r9_hc_field_1; plate_plaque / gate_cairn / wall_carving / reset_rule become map line keys read by
puzzle_tells FIELD_SIGNS. brushbreak / stonebreak cant_use_yet are skipped while {skill_town} is unpicked (Gary).
Usage: python3 tools/merge_puzzle_hints.py [--check]   (prints what changed / what it could not place)"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TB = json.load(open(os.path.join(ROOT, 'data/textbot_puzzle_hints.json')))
LP = os.path.join(ROOT, 'text/overworld_lines.json')
L = json.load(open(LP))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
log, miss = [], []
SKIP_SKILLS = set()  # brushbreak / stonebreak picked by Text Bot (Thornwood / Greystone), Oct 30
R9 = {'r9_heart_cave.trainer_hint': 'r9_hc_field_1'}

def map_json(m):
    p = os.path.join(MAPS, m + '.json')
    return json.load(open(p)) if os.path.exists(p) else None

def npc_ids(mj):
    return {n.get('id') for n in mj.get('npcs', [])} | {s.get('id') for s in mj.get('signs', [])}

sh = L.setdefault('system_halls', {})
for k, v in TB['system_halls'].items():
    e = sh.get(k) if isinstance(sh.get(k), dict) else {}
    e = {kk: vv for kk, vv in e.items() if kk not in ('pages', 'pages_again', 'pages_3', 'after', 'battle_lost', 'lines')} if k.startswith('hint_') else dict(e)
    for t in ('pages', 'pages_again', 'pages_3'):
        if t in v: e[t] = v[t]
    e['status'] = 'DRAFT'; e['source'] = 'data/textbot_puzzle_hints.json'
    sh[k] = e; log.append('system_halls.' + k)

fb_names = {}
fbp = os.path.join(ROOT, 'src/region9/text_fallback_v2.js')
if os.path.exists(fbp):
    for m in re.finditer(r"'r9\.ft\.(\w+)\.after': \['([^:']+): ", open(fbp).read()): fb_names[m.group(1)] = m.group(2)

def flat(d):
    for k, v in d.items():
        if k.startswith('_optional'):
            yield from flat({kk: vv for kk, vv in v.items() if kk != 'note'})
        elif not k.startswith('_'):
            yield k, v

for m, ents in TB['maps'].items():
    mj = map_json(m)
    if mj is None:
        miss.append(f'{m}: map not on this branch'); continue
    ids = npc_ids(mj); lm = L.setdefault('maps', {}).setdefault(m, {})
    for k, v in flat(ents):
        if 'sign' in v:
            if k in ids:  # a real sign: Text Bot hint first, the old flavour after
                e = lm.setdefault(k, {}); old = [p for p in e.get('pages', []) if p != v['sign']]
                e['pages'] = [v['sign']] + old
                for ln in e.get('lines', []):
                    if ln.get('id') == 'default': ln['pages'] = e['pages']
            else:  # field plaque on a plate / gate cell (puzzle_tells FIELD_SIGNS)
                lm[k] = {'pages': [v['sign']], 'status': 'DRAFT', 'note': 'read by A on the puzzle cell, src/progression/puzzle_tells.js FIELD_SIGNS'}
            log.append(f'{m}.{k} sign'); continue
        rid = R9.get(f'{m}.{k}', k)
        if rid.startswith('r9_'):
            name = fb_names.get(rid)
            page = f'{name}: ' + v['after'].replace('\n', ' ') if name else v['after']
            L.setdefault('r9', {}).setdefault('ft', {}).setdefault(rid, {})['after'] = [page]
            log.append(f'r9.ft.{rid}.after'); continue
        if k not in ids:
            miss.append(f'{m}.{k}: npc not on the map'); continue
        e = lm.setdefault(k, {})
        if v.get('after_old') and e.get('after') and v['after_old'].replace('\n', ' ') not in ' '.join(e['after']).replace('\n', ' '):
            log.append(f'  note {m}.{k}: live after differed from after_old: {e["after"]}')
        e['after'] = [v['after']]; log.append(f'{m}.{k}.after')

L.setdefault('field', {}).setdefault('boulder', {})['inspect'] = TB['field']['boulder']['inspect']; log.append('field.boulder.inspect')
for sk, v in TB['field_skills'].items():
    if sk in SKIP_SKILLS or any('{skill_town}' in p for p in v['cant_use_yet']):
        miss.append(f'field_skills.{sk}: kept live line ({{skill_town}} unpicked)'); continue
    e = L.setdefault('field_skills', {}).setdefault(sk, {}); e['cant_use_yet'] = v['cant_use_yet']; log.append(f'field_skills.{sk}')
    if 'teach' in v: e['requires_flag'] = 'has_' + sk  # unlock = quest turn-in (data/quests.json reward.flags + teach line)

print('\n'.join(log)); print('NOT PLACED:'); print('\n'.join(miss) or ' none')
if '--check' not in sys.argv:
    open(LP, 'w').write(json.dumps(L, ensure_ascii=False, indent=1))
