"""Summit camp life (Coder, Oct 30 2026; Gary playtest 5/10 "feels empty"): 4 always-on members of other RT field
teams + 2 camp props (supply crates, weather mast), placed with build_wellspire.M rules (never plug a lane, every warp
and spot stand stays reachable). Idempotent: drops its own ids first. Text: DRAFT keys summit.camp.ft_* (text_fallback_v2.js)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_wellspire import M, MAPS, load
NAME = 'fin_summit_camp'
NPCS = [('fin_camp_bryn', (14, 18), 'tr_hiker_f', 'right'), ('fin_camp_otto', (19, 19), 'tr_ranger_m', 'left'),
        ('fin_camp_sunniva', (7, 15), 'tr_scientist_f', 'down'), ('fin_camp_lorcan', (25, 15), 'tr_camper_f', 'down')]
SPOTS = [('fin_camp_supplies', (14, 12)), ('fin_camp_mast', (21, 12))]
def run():
    m = object.__new__(M); m.j = load(NAME); m.name = NAME; m.col = m.j['layers']['collision']; m.w = m.j['width']; m.h = m.j['height']
    ids = {n for n, *_ in NPCS} | {s for s, _ in SPOTS}
    m.j['npcs'] = [n for n in m.j['npcs'] if n['id'] not in ids]; m.j['interact_spots'] = [s for s in m.j['interact_spots'] if s['id'] not in ids]
    m.used = {(w['x'], w['y']) for w in m.j['warps']} | {(n['x'], n['y']) for n in m.j['npcs']}
    for s in m.j['interact_spots']: m.used |= {(s['x'], s['y']), tuple(s['stand'])}
    m.pts = {}; m._anchor = (16, 22)
    for sid, want in SPOTS: m.spot(sid, want)
    for nid, want, spr, face in NPCS: m.npc(nid, want, 'clerk', face, sprite=spr)
    m.check()
    json.dump(m.j, open(os.path.join(MAPS, NAME + '.json'), 'w'), indent=1)
    p = os.path.join(MAPS, '..', '..', '..', 'characters', 'pixel', 'npcs', 'npc_sprite_map.json'); sm = json.load(open(p))
    for nid, _, sid, _ in NPCS:
        sm['map'][f'{NAME}.{nid}'] = {'sprite_id': sid, 'class': 'Wellspire summit camp, RT field team member (camp life)',
            **{k: f'npcs/{sid}/overworld/{sid}{v}' for k, v in (('overworld_sheet', '_chibi_sheet.png'), ('overworld_sheet_2x', '_chibi_sheet_2x.png'), ('overworld_sheet_3x', '_chibi_sheet_3x.png'))},
            'overworld_frames_dir': f'npcs/{sid}/overworld/{sid}_chibi/'}
    open(p, 'w', encoding='utf-8').write(json.dumps(sm, indent=1, ensure_ascii=False) + '\n')
    print([(n['id'], n['x'], n['y']) for n in m.j['npcs']], [(s['id'], s['x'], s['y']) for s in m.j['interact_spots']])
if __name__ == '__main__': run()
