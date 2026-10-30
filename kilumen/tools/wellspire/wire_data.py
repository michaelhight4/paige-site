#!/usr/bin/env python3
"""Wellspire (region 9 + finale) data wiring (Coder, Oct 29 2026; story_beats.md §F). Idempotent.
Adds: data/encounters_wired.json zones r9_*, src/overworld/mood.json maps for the new maps, and
art/characters/pixel/npcs/npc_sprite_map.json entries for every region9 NPC. Species are the art-ready set only."""
import json, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda *a: os.path.join(ROOT, *a)

def rw(path, fn, **dump):
    t = open(path).read(); j = json.loads(t); fn(j)
    out = json.dumps(j, **dump)
    open(path, 'w').write(out + ('\n' if t.endswith('\n') else ''))

TABLES = {
    'r9_riverbed_reeds': ('grass', [('reedmoot', 60, 62, 30), ('moorcoil', 60, 62, 25), ('cascadorn', 61, 63, 20), ('toadcap', 60, 62, 15), ('torrentpike', 62, 63, 10)]),
    'r9_riverbed_grass': ('grass', [('bramblehog', 60, 62, 30), ('fernstag', 60, 62, 25), ('thistlehound', 60, 62, 20), ('glassvine', 61, 63, 15), ('sproutwyrm', 62, 63, 10)]),
    'r9_cairnfold_grass': ('grass', [('shagmount', 61, 63, 30), ('snowgrouse', 61, 63, 25), ('cairnhorn', 61, 63, 20), ('highkite', 62, 64, 15), ('seraphawk', 63, 64, 10)]),
    'r9_switchbacks_snow': ('grass', [('peakbrute', 62, 64, 25), ('shagmount', 62, 64, 25), ('stratodrake', 63, 65, 15), ('sunderhoof', 63, 65, 15), ('snowgrouse', 62, 64, 20)]),
    'r9_icefall_cave': ('cave', [('geodurchin', 63, 65, 30), ('delvemaw', 63, 65, 25), ('ingotitan', 64, 66, 15), ('obsidiax', 64, 66, 10)]),
}
def enc(j):
    art = set(j.get('species_with_art') or [])
    for k, (method, slots) in TABLES.items():
        ss = [{'species': s, 'level': [a, b], 'weight': w} for (s, a, b, w) in slots if not art or s in art]
        assert len(ss) >= 3, (k, ss)
        j['zones'][k] = {'method': method, 'rate': 0.0833, 'draft': True,
                         '_note': 'Wellspire (region 9), story_beats.md §F: post-game, L60-66, art-ready species only (Coder Oct 29 2026, DRAFT).', 'slots': ss}

MOOD = {
    'r9_old_riverbed': {'extends': 'outdoor', 'tint': {'color': '#e8d6a8', 'alpha': 0.06}, 'particles': [{'kind': 'motes', 'density': 6}]},
    'r9_cairnfold': {'extends': 'outdoor', 'tint': {'color': '#c6ecfa', 'alpha': 0.06}, 'particles': [{'kind': 'snow', 'density': 12}]},
    'r9_switchbacks': {'extends': 'outdoor', 'tint': {'color': '#c6ecfa', 'alpha': 0.08}, 'particles': [{'kind': 'snow', 'density': 18}]},
    'r9_icefall': {'extends': 'cave', 'tint': {'color': '#9fd8f0', 'alpha': 0.08}},
    'fin_summit_camp': {'extends': 'outdoor', 'tint': {'color': '#c6ecfa', 'alpha': 0.07}, 'particles': [{'kind': 'snow', 'density': 10}]},
    'fin_lab1_now': {'extends': 'indoor', 'tint': {'color': '#a070f0', 'alpha': 0.1}, 'vignette': {'color': '#120626', 'alpha': 0.36, 'inner': 0.48}, 'particles': [{'kind': 'motes', 'density': 8}]},
    'fin_past_enclosure': {'extends': 'indoor', 'tint': {'color': '#70b8f0', 'alpha': 0.1}, 'vignette': {'color': '#06122a', 'alpha': 0.3, 'inner': 0.5}, 'particles': [{'kind': 'motes', 'density': 8}]},
    'fin_past_riverbend': {'extends': 'outdoor', 'tint': {'color': '#ffd9a0', 'alpha': 0.08}, 'particles': [{'kind': 'fireflies', 'density': 10}]},
}
for n in ['fin_past_station_m', 'fin_past_signal_lab', 'fin_past_lab1_f1', 'fin_past_lab1_f2', 'fin_past_lab1_f3', 'fin_past_lab1_f4']:
    MOOD[n] = {'extends': 'indoor', 'tint': {'color': '#f0d8a0', 'alpha': 0.07}}  # the past: warm, sepia-ish
def mood(j):
    for k, v in MOOD.items(): j['maps'][k] = {'_why': 'Wellspire (story_beats.md §F), Coder Oct 29 2026, DRAFT', **v}

import sys as _s; _s.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from field_teams import FIELD
SPRITE = {
    'fin_teo': 'tr_scientist_m', 'fin_marta': 'tr_hiker_f', 'fin_pell': 'vil_office_m_b', 'fin_imke': 'tr_scientist_f',
    'fin_ep_teo': 'tr_scientist_m', 'fin_ep_marta': 'tr_hiker_f', 'fin_ep_pell': 'vil_office_m_b', 'fin_ep_imke': 'tr_scientist_f',
    'fin_t_coralie': 'vil_clerk_f', 'fin_m_greave': 'tr_scientist_m', 'fin_t_holt': 'vil_receptionist_f_b', 'fin_lab1_chief': 'vil_stationguard_m',
    'fin_m_handler_1': 'tr_scientist_m', 'fin_m_handler_2': 'tr_scientist_f', 'fin_m_handler_3': 'tr_scientist_m',
    'fin_t_tech_1': 'tr_scientist_f', 'fin_t_tech_2': 'tr_scientist_m', 'fin_t_tech_3': 'tr_scientist_f',
    'fin_lab1_staff_1': 'vil_guard_m_b', 'fin_lab1_staff_2': 'vil_officer_f', 'fin_lab1_staff_3': 'vil_guard_m_b', 'fin_lab1_staff_4': 'vil_officer_f',
    'r9_cf_kid': 'vil_kid_f', 'r9_lodge_clerk': 'vil_clerk_f', 'r9_skylift_operator': 'vil_stationguard_m',
}
def sprite_for(nid, kind):
    if nid in SPRITE: return SPRITE[nid]
    if nid in FIELD: return FIELD[nid][2]
    if 'survey' in nid: return 'tr_scientist_f' if nid.endswith('2') else 'tr_scientist_m'
    if kind == 'trainer': return 'tr_hiker_f' if sum(map(ord, nid)) % 2 else 'tr_hiker_m'
    return ['vil_office_m', 'vil_officer_f', 'vil_guard_m_b', 'vil_clerk_f'][sum(map(ord, nid)) % 4]
def sprites(j):
    m = j['map']
    for f in sorted(glob.glob(P('art', 'world', 'overworld', 'maps', '*.json'))):
        mj = json.load(open(f))
        for n in mj.get('npcs', []):
            if not n.get('region9'): continue
            sid = sprite_for(n['id'], n['kind']); b = f'npcs/{sid}/overworld/{sid}_chibi'
            assert os.path.exists(P('art', 'characters', 'pixel', b + '_sheet.png')), sid
            m[f"{mj['name']}.{n['id']}"] = {'sprite_id': sid, 'class': 'Wellspire (region 9 / finale), story_beats.md §F', 'overworld_sheet': b + '_sheet.png',
                                            'overworld_sheet_2x': b + '_sheet_2x.png', 'overworld_sheet_3x': b + '_sheet_3x.png', 'overworld_frames_dir': b + '/'}

def fmt(path):
    t = open(path).read(); j = json.loads(t)
    for kw in [dict(indent=2, ensure_ascii=False), dict(indent=1, ensure_ascii=False), dict(indent=2), dict(indent=1), dict(separators=(',', ':')), {}]:
        if json.dumps(j, **kw) == t.rstrip('\n'): return kw
    return dict(indent=2, ensure_ascii=False)
def mood_text(path):  # mood.json is hand-formatted: insert one line per map before the closing of "maps", keep the rest byte-identical
    t = open(path).read(); lines = [l for l in t.split('\n') if '"_wellspire": true' not in l]
    i = len(lines) - 1
    while lines[i].strip() != '}': i -= 1
    i -= 1
    while lines[i].strip() != '}': i -= 1  # the "maps" object close
    if not lines[i - 1].rstrip().endswith(','): lines[i - 1] = lines[i - 1].rstrip() + ','
    add = [f'    "{k}": ' + json.dumps({'_why': 'Wellspire (story_beats.md §F), Coder Oct 29 2026, DRAFT', '_wellspire': True, **v}, ensure_ascii=False) for k, v in MOOD.items()]
    lines[i:i] = [a + ',' for a in add[:-1]] + [add[-1]]
    out = '\n'.join(lines); json.loads(out); open(path, 'w').write(out)
mood_text(P('src', 'overworld', 'mood.json'))
for path, fn in [(P('data', 'encounters_wired.json'), enc), (P('art', 'characters', 'pixel', 'npcs', 'npc_sprite_map.json'), sprites)]:
    rw(path, fn, **fmt(path))
print('wired')
