#!/usr/bin/env python3
"""Wellspire v3 (Coder, Oct 29 2026, DRAFT for Gary): the rebellion-night lab (fin_past_enclosure) rebuilt as a trainer
gauntlet in five zones: entry corridor -> exam wing -> containment vat hall -> tank hall (south) -> control room ->
tank hall (north) -> Ondravel's tank. Every lane is one square wide and grid-aligned; props are drawn by
src/region9/lab_fx.js from map json `lab` (zones + props); collision lives here. Re-run after build_wellspire.py."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MP = os.path.join(ROOT, 'art/world/overworld/maps')
W, H = 35, 21
col = [[1] * W for _ in range(H)]
def walk(x0, y0, x1, y1, v=0):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): col[y][x] = v
props = []
def prop(k, x, y, w=1, h=1, block=True, **kw):
    props.append({'k': k, 'x': x, 'y': y, 'w': w, 'h': h, **kw})
    if block: walk(x, y, x + w - 1, y + h - 1, 1)
zones = [  # x0, y0, x1, y1 (floor area), style
    {'id': 'corridor', 'x0': 1, 'y0': 12, 'x1': 7, 'y1': 19, 'style': 'white'},
    {'id': 'exam', 'x0': 1, 'y0': 2, 'x1': 7, 'y1': 10, 'style': 'white'},
    {'id': 'vats', 'x0': 9, 'y0': 2, 'x1': 15, 'y1': 19, 'style': 'green'},
    {'id': 'tanks', 'x0': 17, 'y0': 2, 'x1': 25, 'y1': 19, 'style': 'teal'},
    {'id': 'control', 'x0': 27, 'y0': 2, 'x1': 33, 'y1': 19, 'style': 'steel'},
]
for z in zones: walk(z['x0'], z['y0'], z['x1'], z['y1'])
# corridor: glass display cases + equipment along both walls, bright doorway north at (4,11)
for y in (13, 15, 17): prop('display', 1, y); prop('display', 7, y)
for y in (14, 16, 18): prop('equip', 1, y); prop('equip', 7, y)
walk(1, 11, 7, 11, 1); walk(4, 11, 4, 11); prop('doorway', 4, 11, block=False)
walk(4, 19, 4, 19, 4)  # warp back down to floor 4
# exam wing: beds on the west wall, holo ring on the floor, chairs + consoles east, holo HUD on the back wall
for y in (3, 5, 7): prop('bed', 1, y)
prop('ring', 3, 5, 3, 3, block=False)
for y in (6, 7, 8): prop('console_w', 7, y)
prop('chair', 6, 2)
# vat hall: 2x2 vats sunk in the floor, railed one-square walkways at x 9/12/15 and y 3/6/9/12/15/18
for vx in (10, 13):
    for vy in (4, 7, 10, 13, 16): prop('vat', vx, vy, 2, 2)
prop('curtain', 9, 2, block=False)
# walls between zones, one-square gaps
walk(8, 2, 8, 19, 1); walk(8, 3, 8, 3)
walk(16, 2, 16, 19, 1); walk(16, 18, 16, 18)
walk(26, 2, 26, 19, 1); walk(26, 18, 26, 18); walk(26, 5, 26, 5)
# tank hall: rail splits it; north = Ondravel's tank, south = specimen tank rows
walk(17, 11, 25, 11, 1); prop('rail', 17, 11, 9, 1)
for y in (13, 15, 17): prop('spec', 17, y - 1, 1, 2, specimen=y); prop('spec', 25, y - 1, 1, 2, specimen=y + 1)
for x in (20, 21, 22): prop('spec', x, 14, 1, 2, specimen=x)
for y in (3, 7): prop('spec', 17, y - 1, 1, 2, specimen=y + 7); prop('spec', 25, y - 1, 1, 2, specimen=y + 9)
prop('cable', 18, 9, 7, 1, block=False)
prop('tank', 19, 3, 5, 6)
prop('console', 17, 10)
# control room: three holo screens on the back wall, octagonal scan table, two console rows (gap at x 30)
prop('holo3', 28, 0, 5, 2, block=False)
for x in (28, 29, 31, 32): prop('console', x, 4); prop('console', x, 13)
prop('scan', 29, 8, 3, 3)
prop('bench', 33, 7, 1, 2)
lab = {'zones': zones, 'props': props, 'tank': {'x': 19, 'y': 3, 'w': 5, 'h': 6}}
npcs = [  # techs (all beatable); sight_range rays are straight and stop at props
    {'id': 'fin_enc_tech_1', 'x': 2, 'y': 10, 'facing': 'right', 'sight_range': 4},
    {'id': 'fin_enc_tech_2', 'x': 6, 'y': 4, 'facing': 'left', 'sight_range': 4},
    {'id': 'fin_enc_hazmat_1', 'x': 12, 'y': 6, 'facing': 'down', 'sight_range': 5},
    {'id': 'fin_enc_hazmat_2', 'x': 15, 'y': 9, 'facing': 'down', 'sight_range': 6},
    {'id': 'fin_enc_hazmat_3', 'x': 9, 'y': 15, 'facing': 'right', 'sight_range': 5},
    {'id': 'fin_enc_tech_3', 'x': 24, 'y': 13, 'facing': 'down', 'sight_range': 5},
    {'id': 'fin_enc_tech_4', 'x': 18, 'y': 12, 'facing': 'right', 'sight_range': 5},
    {'id': 'fin_enc_ctrl_1', 'x': 33, 'y': 15, 'facing': 'left', 'sight_range': 5},
    {'id': 'fin_enc_ctrl_2', 'x': 27, 'y': 11, 'facing': 'right', 'sight_range': 5},
    {'id': 'fin_enc_lead', 'x': 30, 'y': 3, 'facing': 'down', 'sight_range': 3},
    {'id': 'fin_enc_tech_5', 'x': 24, 'y': 9, 'facing': 'left', 'sight_range': 4},
    {'id': 'fin_enc_entry_1', 'x': 2, 'y': 16, 'facing': 'right', 'sight_range': 3},  # Text Bot: entry intake clerk
    {'id': 'fin_enc_entry_2', 'x': 6, 'y': 14, 'facing': 'left', 'sight_range': 3},  # Text Bot: entry doorman
]
for n in npcs: n.update({'kind': 'trainer', 'region9': True})
ground = [[7098] * W for _ in range(H)]
for z in zones:
    for y in range(z['y0'], z['y1'] + 1):
        for x in range(z['x0'], z['x1'] + 1): ground[y][x] = (7026, 7044, 7008)[(x + y) % 3]
for x in range(1, W - 1): ground[1][x] = 7101
for (x, y) in ((8, 3), (16, 18), (26, 18), (26, 5), (4, 11)): ground[y][x] = 7026
empty = [[0] * W for _ in range(H)]
p = os.path.join(MP, 'fin_past_enclosure.json'); j = json.load(open(p))
j.update(width=W, height=H, npcs=npcs, lab=lab)
j['layers'] = {'ground': ground, 'decoration': [r[:] for r in empty], 'overlay': [r[:] for r in empty], 'collision': col, 'encounter': [r[:] for r in empty]}
j['warps'] = [{'x': 4, 'y': 19, 'to': 'fin_past_lab1_f4', 'tx': 21, 'ty': 1, 'facing': 'down'}]
j['interact_spots'] = [
    {'id': 'fin_past_logbook', 'kind': 'prop', 'x': 17, 'y': 10, 'stand': [18, 10], 'face': 'left', 'region9': True},
    {'id': 'fin_past_dome', 'kind': 'prop', 'x': 21, 'y': 8, 'stand': [21, 9], 'face': 'up', 'region9': True}]
j['ondravel'] = {'x': 21, 'y': 7, 'w': 4, 'h': 4, 'sheet': 'art/characters/pixel/creatures/ondravel/overworld/ondravel_big_sheet.png', 'tank': True}
j['tint'] = {'color': '#40c8d8', 'alpha': 0.06}
j['title'] = 'The Lab (the night of Test 7)'
j['source'] = 'tools/wellspire/build_lab_v3.py (Wellspire v3 lab gauntlet; props drawn by src/region9/lab_fx.js)'
json.dump(j, open(p, 'w'), indent=1, ensure_ascii=False)
f4p = os.path.join(MP, 'fin_past_lab1_f4.json'); f4 = json.load(open(f4p))
for w in f4['warps']:
    if w['to'] == 'fin_past_enclosure': w['tx'], w['ty'] = 4, 18
json.dump(f4, open(f4p, 'w'), indent=1, ensure_ascii=False)
# sprites: lab coats for techs, hazmat-ish (scientist) for the vat hall, the lead in the station guard coat
SP = {'fin_enc_tech_1': 'lab_tech_scrubs', 'fin_enc_tech_2': 'lab_tech_coat_m', 'fin_enc_tech_3': 'lab_tech_coat_f', 'fin_enc_tech_4': 'lab_tech_coat_m',
      'fin_enc_tech_5': 'lab_tech_coat_f', 'fin_enc_hazmat_1': 'lab_hazmat', 'fin_enc_hazmat_2': 'lab_hazmat', 'fin_enc_hazmat_3': 'lab_hazmat',
      'fin_enc_ctrl_1': 'lab_tech_scrubs', 'fin_enc_ctrl_2': 'lab_tech_coat_f', 'fin_enc_lead': 'lab_researcher_m', 'fin_enc_entry_1': 'lab_tech_coat_f', 'fin_enc_entry_2': 'lab_tech_coat_m',
      '@tidewater_coast.r9_coralie_cove': 'coralie_present'}  # Character models' DRAFT sprites (shots/flashback_sprites)
smp = os.path.join(ROOT, 'art/characters/pixel/npcs/npc_sprite_map.json'); sm = json.load(open(smp))
for nid, s in SP.items():
    sm['map'][nid[1:] if nid.startswith('@') else f'fin_past_enclosure.{nid}'] = {'sprite_id': s, 'class': 'Wellspire v3 lab gauntlet (DRAFT)',
        'overworld_sheet': f'npcs/{s}/overworld/{s}_chibi_sheet.png', 'overworld_sheet_2x': f'npcs/{s}/overworld/{s}_chibi_sheet_2x.png',
        'overworld_sheet_3x': f'npcs/{s}/overworld/{s}_chibi_sheet_3x.png', 'overworld_frames_dir': f'npcs/{s}/overworld/{s}_chibi/'}
json.dump(sm, open(smp, 'w'), indent=1, ensure_ascii=False)
print('lab v3:', len(props), 'props,', len(npcs), 'techs')
