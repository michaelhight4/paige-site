#!/usr/bin/env python3
"""Merge Text Bot's data/textbot_flashback_lab_v2.json (DRAFT, Oct 30 2026) into text/overworld_lines.json.
Union only: adds/overrides the listed keys, never drops existing ones. intro -> pages (the talk code reads pages).
battle_lost = trainer lost (player won), battle_won = trainer won (player lost), as overworld.js / region9 read them."""
import json, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
src = json.loads((R / 'data/textbot_flashback_lab_v2.json').read_text())
p = R / 'text/overworld_lines.json'; d = json.loads(p.read_text())
n = 0
for m, ids in src['maps'].items():
    tgt = d.setdefault('maps', {}).setdefault(m, {})
    for i, e in ids.items():
        out = dict(tgt.get(i, {}))
        out.update({'name': e['name'], 'pages': e['intro'], 'battle_lost': e['battle_lost'], 'battle_won': e['battle_won'], 'after': e['after'], 'status': 'DRAFT'})
        tgt[i] = out; n += 1
fix = src['frostspire_climber_fix']; c = d['region4']['npcs']['climber']
for arr in (c['start'], next(l for l in c['lines'] if l.get('id') in (None, 'default'))['pages']):
    assert arr[0] == fix['old'] or arr[0] == fix['new'], arr[0]; arr[0] = fix['new']
d.setdefault('system_halls', {})['hint_frostspire'] = {'pages': src['system_halls']['hint_frostspire']['pages'], 'status': 'DRAFT'}
p.write_text(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
print('trainers', n)
