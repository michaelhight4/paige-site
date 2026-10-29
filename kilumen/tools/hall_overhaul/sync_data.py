"""Phase 2 data sync (Oct 29 2026): masters.json / trainer_teams.js / npc_sprite_map / text follow the built hall maps.
Trainers kept = the map's trainer ids (h1..hN, Fernwick helper_1, helper_2, h3). Cut ids are dropped from masters.json,
trainer_teams.js and the sprite map. New ids get an F6-band team (hall_trainers.team_for) and a PLACEHOLDER text entry
(listed in data/textbot_requests_hall_overhaul.md). Text Bot's pending lines (_meta.pending_hall_trainers in the main
repo's text file) are merged for kept ids. Idempotent.  python3 tools/hall_overhaul/sync_data.py <kilumen> [pending.json]"""
import json, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'hall_trainers'))
import hall_trainers as HT

PROPOSED = {  # Coder name proposals for the 13 unnamed trainers (Text Bot to confirm; unique-checked against every hall)
  'mirefen_hall_int_h7': 'Rushton',
  'tidewater_hall_int_h7': 'Morwen', 'tidewater_hall_int_h8': 'Kit',
  'lanternport_hall_int_h7': 'Sable', 'lanternport_hall_int_h8': 'Wick', 'lanternport_hall_int_h9': 'Elowen', 'lanternport_hall_int_h10': 'Thane',
  'cindervale_hall_int_h7': 'Cinda', 'cindervale_hall_int_h8': 'Forge', 'cindervale_hall_int_h9': 'Hollis', 'cindervale_hall_int_h10': 'Embry',
  'cindervale_hall_int_h11': 'Petra', 'cindervale_hall_int_h12': 'Slag',
}
PLACEHOLDER_NOTE = 'PLACEHOLDER (hall overhaul, Coder Oct 29 2026): Text Bot to replace, see data/textbot_requests_hall_overhaul.md'

def main(root, pending_path):
    os.chdir(root)
    M = HT.load('data/masters.json'); sp = HT.load('/tmp/species.json')
    src, auth = HT.authored(root); smap = HT.load('art/characters/pixel/npcs/npc_sprite_map.json')
    T = HT.load('text/overworld_lines.json')
    pend = (json.load(open(pending_path))['_meta'].get('pending_hall_trainers') or {}) if pending_path and os.path.exists(pending_path) else {}
    rows = []
    for h in M['halls']:
        hm, zone = h['hall_map'], h['zone']; m = HT.load(f'art/world/overworld/maps/{hm}.json')
        ids = [n['id'] for n in m['npcs'] if n['kind'] == 'trainer_hooded']
        mmin, mkey = HT.master_min(h, auth)
        old = {(t['id'] if hm == 'fernwick_hall_int' and t['id'].startswith('helper') else f'{hm}_h{i + 1}'): t for i, t in enumerate(h['trainers'])}
        cut = [k for k in old if k not in ids]
        used = {x['species'] for t in h['trainers'] for x in t['team']} | {x['species'] for x in h['master']['team']}
        new_ids = [i for i in ids if i not in old]; out = []
        for nid in ids:
            if nid in old: out.append(old[nid]); continue
            k = new_ids.index(nid); team = HT.team_for(zone, k, mmin, sp, used, len(new_ids))
            idx = ids.index(nid) + 1
            out.append({'id': nid, 'gd_id': f'tr_hall_{zone}_h{idx}', 'name_placeholder': PROPOSED.get(nid, 'TBD'), 'class': 'helper', 'base': 50,
                        'prize_placeholder': 50 * max(t['level'] for t in team), 'team': [{**t, 'battle_species': t['species'], 'stand_in': False} for t in team],
                        'added': 'hall overhaul phase 2, Oct 29 2026'})
        h['trainers'] = out; h['hall_overhaul'] = {'trainers': len(out), 'need_wins': min(4, len(out)), 'cut': cut}
        for nid in cut:
            src = re.sub(rf"\n  '{hm}\.{nid}': \[.*?\],[^\n]*", '', src); smap['map'].pop(f'{hm}.{nid}', None)
        for t, nid in zip(out, ids):
            if not t.get('added', '').startswith('hall overhaul'): continue
            if mkey and f"'{hm}.{nid}'" not in src:
                body = ', '.join(f"{{ species: '{x['species']}', level: {x['level']} }}" for x in t['team'])
                i = src.index(f"  '{mkey}'"); src = src[:i] + f"  '{hm}.{nid}': [{body}], // {t['name_placeholder']} (hall overhaul, Oct 29 2026)\n" + src[i:]
        for k, nid in enumerate(ids):
            if f'{hm}.{nid}' in smap['map']: continue
            g = 'm' if k % 2 == 0 else 'f'; base = smap['map'][f'fernwick_hall_int.helper_{1 if g == "m" else 2}']
            smap['map'][f'{hm}.{nid}'] = {**base, 'class': f'{HT.THEME[zone][0]} ({"young man" if g == "m" else "young woman"}), hall overhaul'}
        tm = T['maps'].setdefault(hm, {}); pm = pend.get(hm, {})
        for nid, t in zip(ids, out):
            if nid in pm and not (tm.get(nid) or {}).get('battle_lost'):
                tm[nid] = {**pm[nid], 'note': pm[nid].get('note', '') + ' | merged by hall overhaul phase 2 (Oct 29 2026)'}
            if not (tm.get(nid) or {}).get('battle_lost'):
                tm[nid] = {'pages': ['You made it this far. Let\'s see your team.'], 'battle_lost': ['Fair win. Go on.'], 'after': ['Keep going. The Master is up ahead.'],
                           'name': t['name_placeholder'], 'trainer_class': HT.THEME[zone][0], 'placeholder': True, 'note': PLACEHOLDER_NOTE}
                rows.append((hm, nid, t['name_placeholder'], zone, t['team']))
            elif tm[nid].get('placeholder'): rows.append((hm, nid, t['name_placeholder'], zone, t['team']))
        print(hm, 'trainers', len(out), 'cut', cut, 'new', new_ids)
    sysh = T.setdefault('system_halls', {})
    for k, v in {
        'progress': {'pages': ['Hall wins: {wins} of {need}. Win {left} more and the Master will see you.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
        'progress_open': {'pages': ['Hall wins: {wins} of {need}. The Master will see you now.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
        'master_locked': {'pages': ['Win {left} more in my hall first. Then we battle.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
        'rematch_prompt': {'pages': ['Again? A rematch costs {fee} gold, paid now, win or lose.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
        'rematch_no_gold': {'pages': ['A rematch is {fee} gold. Come back when you have it.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
        'rematch_won': {'pages': ['You beat me again. My team will be stronger next time.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
        'master_puzzle': {'pages': ['You walked a path that does not reach me. Solve the hall first, then come up.'], 'placeholder': True, 'note': PLACEHOLDER_NOTE},
    }.items(): sysh.setdefault(k, v)
    HT.dump('data/masters.json', M); HT.dump('art/characters/pixel/npcs/npc_sprite_map.json', smap)
    open('src/battle/data/trainer_teams.js', 'w').write(src)
    raw = open('text/overworld_lines.json').read(); ind = 2 if raw.startswith('{\n  "') else 1
    open('text/overworld_lines.json', 'w').write(json.dumps(T, indent=ind, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
    json.dump(rows, open('/tmp/hall_overhaul_placeholders.json', 'w'))

if __name__ == '__main__': main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
