#!/usr/bin/env python3
"""Gullhaven extras (Coder, dev/seaport, Oct 30 2026). Idempotent; run after build_gullhaven.py + register_gullhaven.py.
- heal_gullhaven: Revival Tech Gullhaven branch, cloned from the standard harbour heal room (heal_lanternport, tools/wd_r78/build_interiors.py);
  gullhaven heal door (7,9) -> heal_gullhaven (6,7); exit (6,8) -> gullhaven (7,10). Replaces the heal_brookhollow placeholder.
- town props (story brief seeds 1 + 6): causeway stump sign (gh.sign.causeway) + RT survey hut with roster board (gh.ins.survey_board).
- flags: gh_legend_heard, ron_gullhaven_seen registered next to visited_gullhaven, ending2_done, ron_knows_origin."""
import json, os, copy
R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'))
MAPS = os.path.join(R, 'art/world/overworld/maps')
def lj(p): return json.load(open(os.path.join(R, p)))
def mj(n): return json.load(open(os.path.join(MAPS, n + '.json')))
def smap(m): json.dump(m, open(os.path.join(MAPS, m['name'] + '.json'), 'w'), separators=(',', ':'))
ID = {t['name']: t['id'] for t in lj('art/world/overworld/tileset.json')['tiles']}
SRC = 'tools/seaport/build_gullhaven_extras.py (Coder, dev/seaport, Oct 30 2026)'

# ---- heal_gullhaven
h = copy.deepcopy(mj('heal_lanternport')); ren = lambda s: s.replace('heal_lanternport', 'heal_gullhaven')
h = json.loads(ren(json.dumps(h)))
h.update(name='heal_gullhaven', title='Revival Tech Gullhaven branch', region='gullhaven', source=SRC + '; layout cloned from heal_lanternport',
         unique_reason='Gullhaven heal: standard harbour heal room (was a heal_brookhollow placeholder)',
         entered_from=[{'map': 'gullhaven', 'door': [7, 9], 'arrival': [6, 7]}])
h['warps'] = [{'x': 6, 'y': 8, 'to': 'gullhaven', 'tx': 7, 'ty': 10, 'facing': 'down', 'note': 'exit to gullhaven heal door (7,9)'}]
for n in h['text_pending'].get('npcs', []):
    if n['id'] == 'heal_gullhaven_deckhand': n['note'] = 'swimmer in a towel waiting on the sofa row for their team'
smap(h)

# ---- town: door + props
g = mj('gullhaven'); L = g['layers']
for w in g['warps']:
    if (w['x'], w['y']) == (7, 9): w.update(to='heal_gullhaven', tx=6, ty=7, facing='up')
def put(x, y, name):
    assert L['collision'][y][x] == 0 and not L['decoration'][y][x], (x, y)
    L['decoration'][y][x] = ID[name]; L['collision'][y][x] = 1
if not any(s['id'] == 'gullhaven_causeway_sign' for s in g['signs']):
    put(2, 22, 'rock')                                  # old causeway stump by the harbour wall
    put(34, 16, 'x_city_kiosk'); put(35, 16, 'x_city_notice')   # RT survey hut + roster board
g['signs'] = [s for s in g['signs'] if s['id'] != 'gullhaven_causeway_sign'] + [
    {'id': 'gullhaven_causeway_sign', 'story_id': 'gh.sign.causeway', 'x': 2, 'y': 22, 'read_from': 'down',
     'text_ref': 'overworld_lines.json maps.gullhaven.gullhaven_causeway_sign', 'note': 'causeway stump (story seed 1)'}]
g['interact_spots'] = [s for s in g.get('interact_spots', []) if s['id'] != 'gullhaven_survey_board'] + [
    {'id': 'gullhaven_survey_board', 'story_id': 'gh.ins.survey_board', 'kind': 'prop', 'x': 35, 'y': 16, 'stand': [35, 17], 'face': 'up',
     'tile': 'x_city_notice', 'text': 'maps.gullhaven.gullhaven_survey_board', 'note': 'old RT survey hut (kiosk 34,16), roster board with 4 blank hooks (story seed 6)'}]
smap(g)

# ---- text (DRAFT; Text Bot owns wording)
t = lj('text/overworld_lines.json'); M = t['maps']
def entry(pages): return {'pages': pages, 'lines': [{'id': 'default', 'flags': [], 'pages': pages}], 'status': 'DRAFT'}
M['heal_gullhaven'] = json.loads(ren(json.dumps(M['heal_lanternport'])))
M['gullhaven'].setdefault('gullhaven_causeway_sign', entry(["A worn stone stump, cut flat.\nThe old causeway started here.", "Someone carved a date, then\nscratched it out again."]))
M['gullhaven'].setdefault('gullhaven_survey_board', entry(["REVIVAL TECH SURVEY POST\nCrew roster:", "Four hooks. No name tags.\nThe paint is older than the town sign."]))
json.dump(t, open(os.path.join(R, 'text/overworld_lines.json'), 'w'), indent=1, ensure_ascii=False)

# ---- shops (heal stand) + world_layout
s = lj('src/systems/data/shops.json')
s['branches']['heal_gullhaven'] = {'zone': 'gullhaven', 'carer': 'heal_gullhaven_carer', 'stand': dict(s['branches']['heal_lanternport']['stand']), 'returnDoor': {'map': 'gullhaven', 'x': 7, 'y': 9}}
json.dump(s, open(os.path.join(R, 'src/systems/data/shops.json'), 'w'), indent=1, ensure_ascii=False)
w = lj('art/world/overworld/world_layout.json')
for z in w['zones']:
    if z['id'] == 'gullhaven' and 'heal_gullhaven' not in z['maps']: z['maps'].append('heal_gullhaven')
if 'heal_gullhaven' not in w['maps_built']: w['maps_built'].append('heal_gullhaven')
w['unique_interiors']['heal_gullhaven'] = 'Revival Tech Gullhaven branch (gullhaven, heal); ' + SRC
w['interior_doors'] = [d for d in w['interior_doors'] if d.get('to') != 'heal_gullhaven'] + [
    {'exterior': 'gullhaven', 'door': [7, 9], 'to': 'heal_gullhaven', 'arrival': [6, 7], 'kind': 'heal (unique)', 'recolour': None, 'scheme': None, 'back': ['gullhaven (7,10)'], 'why': 'Revival Tech Gullhaven branch'}]
FLAGS = [('visited_gullhaven', 'visit', ['zone', 'gullhaven'], 'first arrival in Gullhaven (Skylift fly point)'),
         ('ending2_done', 'story', ['src/region9'], 'Ending 2 seen (src/region9/index.js); unlocks the Kelpwind hermit wet-print page'),
         ('ron_knows_origin', 'story', ['lore', 'ron'], 'Ron learns the origin (lab logs); gates the Gullhaven pier cameo'),
         ('gh_legend_heard', 'story', ['gullhaven', 'npc:legend talk'], "set by Marlo's legend talk (design/gullhaven_story.md)"),
         ('ron_gullhaven_seen', 'story', ['gullhaven_lagoon', 'npc:ron pier cameo'], 'Ron derby cameo seen (ron_knows_origin && !beat_master_lanternport)')]
have = {f['id'] for f in w['progression_flags']}
for i, k, at, how in FLAGS:
    if i not in have: w['progression_flags'].append({'id': i, 'kind': k, 'earned_at': at, 'how': how, 'side': True, 'region': 'gullhaven'})
json.dump(w, open(os.path.join(R, 'art/world/overworld/world_layout.json'), 'w'), ensure_ascii=True)
print('ok')

# ---- Ron cameo on the middle lagoon pier (Text Bot v2: ron.gullhaven.derby)
lg = mj('gullhaven_lagoon')
assert lg['layers']['collision'][9][16] == 0
lg['npcs'] = [n for n in lg['npcs'] if n['id'] != 'gullhaven_lagoon_ron'] + [
    {'id': 'gullhaven_lagoon_ron', 'x': 16, 'y': 9, 'facing': 'left', 'kind': 'villager', 'name': 'Ron',
     'text_ref': 'overworld_lines.json maps.gullhaven_lagoon.gullhaven_lagoon_ron',
     'active_when': 'ron_knows_origin', 'inactive_when': 'beat_master_lanternport', 'note': 'derby cameo; talking sets ron_gullhaven_seen (line sets)'}]
for n in lg['npcs']:
    if n['id'] == 'gullhaven_lagoon_derby_clerk': n['name'] = 'Marlo Hollis'
smap(lg)
sm = lj('art/characters/pixel/npcs/npc_sprite_map.json')
ron = next(v for v in sm['map'].values() if v.get('sprite_id') == 'ron')
sm['map']['gullhaven_lagoon.gullhaven_lagoon_ron'] = {k: v for k, v in ron.items() if k != 'note'} | {'note': 'Ron cameo (existing Ron sprite)'}
json.dump(sm, open(os.path.join(R, 'art/characters/pixel/npcs/npc_sprite_map.json'), 'w'), indent=1, ensure_ascii=False)
open(os.path.join(R, 'art/characters/pixel/npcs/npc_sprite_map.json'), 'a').write('\n')
print('ron ok')
