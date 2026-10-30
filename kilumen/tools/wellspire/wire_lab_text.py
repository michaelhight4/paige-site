#!/usr/bin/env python3
"""Wire Text Bot's DRAFT data/textbot_flashback_lab.json into src/region9/text_flashback_lab.gen.js (lab trainer ids -> Text Bot tech ids)."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = {'fin_enc_tech_1': 'tech_suture', 'fin_enc_tech_2': 'tech_dosing', 'fin_enc_hazmat_1': 'tech_stir', 'fin_enc_hazmat_2': 'tech_mix', 'fin_enc_hazmat_3': 'tech_lamp',
     'fin_enc_tech_3': 'tech_tags', 'fin_enc_tech_4': 'tech_jar', 'fin_enc_ctrl_1': 'tech_panel', 'fin_enc_ctrl_2': 'tech_override', 'fin_enc_lead': 'tech_core',
     'fin_enc_tech_5': 'tech_valve', 'fin_enc_entry_1': 'tech_ledger', 'fin_enc_entry_2': 'tech_door'}
# WD flashback lab (fin_past_wlab_01..10, merged Oct 30 2026): 16 trainers, 14 Text Bot lines by room. tech_14 / tech_15 have
# no Text Bot line yet (flagged): they fall back to Coder DRAFT fin.wlab.<id>.* in text_fallback_v2.js.
W = {'fin_wlab_tech_1': 'tech_ledger', 'fin_wlab_tech_2': 'tech_suture', 'fin_wlab_tech_3': 'tech_panel', 'fin_wlab_tech_4': 'tech_override',
     'fin_wlab_tech_5': 'tech_valve', 'fin_wlab_tech_6': 'tech_door', 'fin_wlab_tech_7': 'tech_tags', 'fin_wlab_tech_8': 'tech_jar',
     'fin_wlab_tech_9': 'tech_lamp', 'fin_wlab_tech_10': 'tech_dosing', 'fin_wlab_tech_11': 'tech_stir', 'fin_wlab_tech_12': 'tech_mix',
     'fin_wlab_tech_13': 'tech_core', 'fin_wlab_chief': 'tech_watch'}
d = json.load(open(os.path.join(ROOT, 'data/textbot_flashback_lab.json')))
T = {t['id']: t for t in d['lab_techs']}
out, names = {}, {}
for nid, tid in M.items():
    t = T[tid]; out[f'fin.enc.{nid}.intro'] = t['intro']; out[f'fin.enc.{nid}.after'] = t['defeat']; names[nid] = t['name']
for nid, tid in W.items():
    t = T[tid]; out[f'fin.wlab.{nid}.intro'] = t['intro']; out[f'fin.wlab.{nid}.after'] = t['defeat']; names[nid] = t['name']
for k, v in d['ending2_rt_office'].items(): out[f'fin.e2.{k}'] = v['pages']
s = "// GENERATED from data/textbot_flashback_lab.json (Text Bot DRAFT) by tools/wellspire/wire_lab_text.py. Do not hand-edit.\n"
s += 'export const LAB_TEXT = ' + json.dumps(out, indent=1, ensure_ascii=False) + ';\nexport const LAB_NAMES = ' + json.dumps(names, indent=1, ensure_ascii=False) + ';\n'
s += 'export const LAB_UNUSED = ' + json.dumps([t for t in T if t not in M.values() and t not in W.values()]) + ';\n'
open(os.path.join(ROOT, 'src/region9/text_flashback_lab.gen.js'), 'w').write(s)
