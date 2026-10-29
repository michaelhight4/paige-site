#!/usr/bin/env python3
"""Hall trainers v1 (Coder, Oct 29 2026; Gary pt2060u "we add more trainers to the gyms").

Brings every Master's Hall to 6 trainers (existing helpers included), placed in the hall lobby (below the puzzle
area, so no puzzle cell, lamp, wheel, plate or push lane is touched), with fair sight lines.

  python3 tools/hall_trainers/hall_trainers.py <kilumen> --apply   # write maps / masters.json / trainer_teams.js / sprite map / text requests
  python3 tools/hall_trainers/hall_trainers.py <kilumen> --check   # exit 1 on any rule break (all hall trainers, old + new)

Fair-sight rules (--check):
  F1 trainer stands on a walkable floor cell, inside the map, not on a warp, puzzle cell or another NPC
  F2 sight cells are a straight line in the facing direction, 1-4 long, every cell walkable, no NPC on it
  F3 no sight cell is a door cell or a door arrival cell (row in front of the door): nobody is ambushed on the mat
  F4 no two trainers share a sight cell (one battle per step) and no trainer stands in another's sight line
  F5 every floor cell reachable before the trainers were added is still reachable (no trainer blocks a corridor)
  F7 (hall overhaul v2 maps, hall_v2 block) F2 uses the sight.js see-through codes (floor 0, ledge 2, plate 7, slide 10;
     closed gates 6 block) and F5 is replaced by the plan solver: no softlock with trainers solid, and a walk door ->
     dais front that beats exactly min(4, n) trainers (tools/hall_overhaul/battles.py); counts = V2_TARGET per hall
  F6 levels: every hall trainer's team is below the Master's lowest level and within 4 of it (halls 1-4 use the
     authored teams in src/battle/data/trainer_teams.js, halls 5-8 data/masters.json; both must agree for new rows)
"""
import json, re, sys, os, hashlib
from collections import deque

TARGET = 6
V2_TARGET = {'fernwick_hall_int': 3, 'saltmere_hall_int': 4, 'revival_hall_int': 5, 'frostspire_hall_int': 6,
             'mirefen_hall_int': 7, 'tidewater_hall_int': 8, 'lanternport_hall_int': 10, 'cindervale_hall_int': 12}
SEE_V2 = {0, 2, 7, 10}
STRIDE = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}
# Halls whose existing lobby trainers stood shoulder to shoulder with overlapping sight (F4): re-seated by the solver.
RESEAT = {'mirefen_hall_int', 'tidewater_hall_int', 'lanternport_hall_int', 'cindervale_hall_int'}
# Proposed names (Story Bot / Text Bot to confirm; kept in name_placeholder like every other hall trainer).
NAMES = {
  'fernwick':        ['Tamsin', 'Hobb', 'Wren', 'Pell'],
  'saltmere':        ['Odile', 'Brannock', 'Peg'],
  'revival_heights': ['Seren', 'Alder'],
  'frostspire':      ['Halvard', 'Isolde', 'Kestrel'],
  'mirefen':         ['Nettle', 'Osric', 'Bryony'],
  'tidewater_coast': ['Coral', 'Fitch'],
  'lanternport':     ['Vesper', 'Morrow', 'Ysolde'],
  'cindervale':      ['Ashby', 'Tolla'],
}
THEME = {  # trainer class shown by Text Bot keys; element pool for teams
  'fernwick': ('Hall Trainee', ['earth']), 'saltmere': ('Hall Helper', ['water', 'sea']),
  'revival_heights': ('Hall Helper', ['light']), 'frostspire': ('Hall Helper', ['bird', 'wind']),
  'mirefen': ('Hall Helper', ['swamp']), 'tidewater_coast': ('Hall Helper', ['sea']),
  'lanternport': ('Hall Helper', ['spirit', 'ghost']), 'cindervale': ('Hall Helper', ['fire', 'magma']),
}

def load(p): return json.load(open(p))
def dump(p, d):  # keep each file's own style (maps are one-line JSON, data files indent 1)
    raw = open(p).read(); nl = '\n' if raw.endswith('\n') else ''
    if raw.startswith('{"'): open(p, 'w').write(json.dumps(d, separators=(',', ':'), ensure_ascii=False) + nl)
    else: open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + nl)

def grid(m):
    C = m['layers']['collision']; W, H = m['width'], m['height']
    flat = not isinstance(C[0], list)
    return lambda x, y: 0 <= x < W and 0 <= y < H and not (C[y * W + x] if flat else C[y][x])

def doors(m): return {(w['x'], w['y']) for w in m.get('warps', [])}

def puzzle_cells(m):
    out = set(); pz = m.get('puzzle') or {}
    for k in ('switches', 'gates', 'boulders'):
        for e in pz.get(k, []):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1): out.add((e['x'] + dx, e['y'] + dy))
    return out

def lobby_rows(m, ok):
    """Rows below the lowest wall row (a row with 0-2 floor cells) = the lobby; above it is the puzzle area."""
    W, H = m['width'], m['height']
    for y in range(H - 2, 0, -1):
        n = sum(ok(x, y) for x in range(W))
        if n <= 2: return y, list(range(y + 1, H))
    return 0, list(range(H))

def reach(m, ok, blocked):
    st = [d for d in doors(m)]; seen = set(st); q = deque(st)
    while q:
        x, y = q.popleft()
        for dx, dy in STRIDE.values():
            c = (x + dx, y + dy)
            if c not in seen and ok(*c) and c not in blocked: seen.add(c); q.append(c)
    return seen

def sight(ok, x, y, face, rng, blocked):
    dx, dy = STRIDE[face]; out = []
    for i in range(1, rng + 1):
        c = (x + dx * i, y + dy * i)
        if not ok(*c) or c in blocked: return None
        out.append(c)
    return out

def no_go(m):
    d = doors(m); arr = {(x, y - 1) for x, y in d} | {(x, y - 2) for x, y in d}
    return d, arr

def grid_see(m):
    C = m['layers']['collision']; W, H = m['width'], m['height']; flat = not isinstance(C[0], list)
    return lambda x, y: 0 <= x < W and 0 <= y < H and (C[y * W + x] if flat else C[y][x]) in SEE_V2

def solver_v2(m):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hall_overhaul'))
    from plan import Hall
    from battles import search
    hv = m['hall_v2']; F = {'up': 'U', 'down': 'D', 'left': 'L', 'right': 'R'}
    tr = [{'at': [n['x'], n['y']], 'facing': F[n['facing']], 'sight': len(n.get('sight_cells') or [])} for n in m['npcs'] if n['kind'] == 'trainer_hooded']
    h = Hall(hv['grid']); h.tr = {tuple(t['at']) for t in tr}; r = h.check(); out = []
    if not r: return ['F7 solver: dais front unreachable with trainers solid']
    if r['softlocks']: out.append(f"F7 solver: {r['softlocks']} softlock states with trainers solid")
    need = min(4, len(tr)); e = search(hv['grid'], tr, need, need)
    if not e: out.append(f'F7 solver: no walk that beats exactly {need} trainers')
    return out

def check_map(m, extra_npcs=None):
    v2 = 'hall_v2' in m
    ok = grid_see(m) if v2 else grid(m); probs = []
    npcs = m['npcs'] if extra_npcs is None else extra_npcs
    cells = {(n['x'], n['y']): n['id'] for n in npcs}
    d, arr = no_go(m); pz = puzzle_cells(m); seen_sight = {}
    trainers = [n for n in npcs if n['kind'] == 'trainer_hooded']
    for n in trainers:
        p = (n['x'], n['y'])
        if not ok(*p) or p in d or (p in pz and n.get('hall_trainers_v1')): probs.append(f"F1 {n['id']} bad cell {p}")
        sc = [tuple(c) for c in n.get('sight_cells', [])]
        line = sight(ok, n['x'], n['y'], n['facing'], len(sc), set(cells) - {p}) if sc else None
        if not sc or line != sc or len(sc) > 5: probs.append(f"F2 {n['id']} sight {sc} != straight walkable line {line}")
        for c in sc:
            if c in d or c in arr: probs.append(f"F3 {n['id']} sight on door/arrival {c}")
            if c in seen_sight: probs.append(f"F4 {n['id']} shares sight cell {c} with {seen_sight[c]}")
            seen_sight[c] = n['id']
    for n in trainers:
        if (n['x'], n['y']) in seen_sight and seen_sight[(n['x'], n['y'])] != n['id']:
            probs.append(f"F4 {n['id']} stands in {seen_sight[(n['x'], n['y'])]}'s sight")
    if v2: return probs + solver_v2(m)
    before = reach(m, ok, set()); after = reach(m, ok, set(cells))
    lost = before - after - set(cells)
    if lost: probs.append(f"F5 cells cut off by NPCs: {sorted(lost)[:6]}")
    return probs

def place(m, keep, count):
    """Greedy: lobby cells, facing across the door->gap walk, non-overlapping sight. -> list of (x,y,face,cells)."""
    ok = grid(m); wall_y, rows = lobby_rows(m, ok); d, arr = no_go(m); pz = puzzle_cells(m)
    W = m['width']; npcs = list(keep); placed = []
    gap = [x for x in range(W) if ok(x, wall_y)]
    gx = gap[0] if gap else W // 2
    lane = {(gx, y) for y in rows} | {(x, wall_y + 1) for x in range(W)}
    for _ in range(count):
        best = None
        blocked = {(n['x'], n['y']) for n in npcs}
        used = set()
        for n in npcs: used |= {tuple(c) for c in n.get('sight_cells', [])}
        for y in rows:
            for x in range(W):
                p = (x, y)
                if not ok(x, y) or p in blocked or p in d or p in arr or p in pz or p in used or p in lane: continue
                if any(abs(x - bx) + abs(y - by) <= 1 for bx, by in blocked): continue  # breathing room, no shoulder-to-shoulder
                for face in ('left', 'right', 'up', 'down'):
                    for rng in (4, 3, 2):
                        sc = sight(ok, x, y, face, rng, blocked)
                        if not sc or any(c in d or c in arr or c in used or c in pz for c in sc): continue
                        if reach(m, ok, blocked | {p}) != reach(m, ok, blocked) - {p}: continue
                        hits = sum(c in lane for c in sc)
                        score = (min(hits, 1), -abs(y - (wall_y + 1)) * 0.1 + rng * 0.01, -abs(x - gx) * 0.001)
                        if best is None or score > best[0]: best = (score, x, y, face, sc)
                        break
        if not best: break
        _, x, y, face, sc = best
        n = {'x': x, 'y': y, 'facing': face, 'sight_cells': [list(c) for c in sc]}
        placed.append(n); npcs.append({**n, 'id': '_new', 'kind': 'trainer_hooded'})
    return placed

def species_pool(sp, els, used_ids):
    pool = [s for s in sp if s['el'] and s['el'][0] in els and s.get('rarity') != 'legendary'
            and s.get('found') != 'Post-game' and not s['id'].startswith('tbd')]
    if len(pool) < 6:  # thin element (few primary-typed species): allow it as a second element too
        pool += [s for s in sp if set(s['el'][1:]) & set(els) and s not in pool and s.get('rarity') != 'legendary'
                 and s.get('found') != 'Post-game' and not s['id'].startswith('tbd')]
    pref = [s for s in pool if s['id'] in used_ids]
    return pref, pool

def team_for(zone, k, master_min, sp, used_ids, n_new):
    pref, pool = species_pool(sp, THEME[zone][1], used_ids)
    def pick(salt):
        cand = sorted(pool, key=lambda s: hashlib.md5(f'{zone}{k}{salt}{s["id"]}'.encode()).hexdigest())
        late = master_min >= 30
        # stable sorts: least used in this hall first, then the hall's own species, then stage fits the level band
        cand.sort(key=lambda s: 0 if (s.get('prevo') if late else not s.get('prevo')) else 1)
        cand.sort(key=lambda s: 0 if s['id'] in used_ids else 1)
        cand.sort(key=lambda s: HALL_USE.get((zone, s['id']), 0))
        return cand
    size = 3 if k == n_new - 1 else 2
    lo = max(2, master_min - 3 + (1 if k >= n_new // 2 else 0))
    team, seen = [], set()
    for s in pick(0):
        if s['id'] in seen: continue
        team.append({'species': s['id'], 'level': min(master_min - 1, lo + len(team) // 2)}); seen.add(s['id'])
        if len(team) == size: break
    for t in team: HALL_USE[(zone, t['species'])] = HALL_USE.get((zone, t['species']), 0) + 1
    return team

HALL_USE = {}

def authored(root):
    src = open(os.path.join(root, 'src/battle/data/trainer_teams.js')).read()
    out = {}
    for m in re.finditer(r"'([a-z0-9_]+\.[a-z0-9_]+)': \[(.*?)\],", src):
        out[m.group(1)] = [int(v) for v in re.findall(r"level: (\d+)", m.group(2))], re.findall(r"species: '([a-z0-9_]+)'", m.group(2))
    return src, out

def master_min(h, auth):
    key = f"{h['hall_map']}.{h['master']['id']}"; alt = f"{h['hall_map']}.{h['hall_map']}_master"
    for k in (key, alt):
        if k in auth: return min(auth[k][0]), k
    return min(t['level'] for t in h['master']['team']), None

def run(root, apply):
    os.chdir(root)
    M = load('data/masters.json'); sp = load('/tmp/species.json') if os.path.exists('/tmp/species.json') else None  # node tools/hall_trainers/species_dump.mjs $PWD
    src, auth = authored(root)
    smap = load('art/characters/pixel/npcs/npc_sprite_map.json')
    probs, report, new_js, text_rows = [], [], [], []
    for h in M['halls']:
        mp = f"art/world/overworld/maps/{h['hall_map']}.json"; m = load(mp)
        zone, hm = h['zone'], h['hall_map']; mmin, mkey = master_min(h, auth)
        if apply:
            if sp is None: sys.exit('run tools/hall_trainers/species_dump.mjs first (writes /tmp/species.json)')
            have = len(h['trainers']); need = max(0, TARGET - have)
            if hm in RESEAT:  # lift the lobby trainers out and seat them again one by one (ids, teams, lines kept)
                lob_y, _ = lobby_rows(m, grid(m))
                moved = [n for n in m['npcs'] if n['kind'] == 'trainer_hooded' and n['y'] > lob_y]
                m['npcs'] = [n for n in m['npcs'] if n not in moved]
                for n in moved:
                    spot = place(m, m['npcs'], 1)
                    if not spot: probs.append(f'{hm}: no seat for {n["id"]}'); m['npcs'].append(n); continue
                    n.update(spot[0]); n['sight_range'] = len(n['sight_cells'])
                    n['note'] = (n.get('note', '') + ' | hall trainers v1 (Oct 29 2026): re-seated so sight lines no longer overlap').strip(' |')
                    m['npcs'].append(n)
            spots = place(m, m['npcs'], need)
            used_ids = {x['species'] for t in h['trainers'] for x in t['team']} | {x['species'] for x in h['master']['team']}
            for k, s in enumerate(spots):
                idx = have + k + 1; nid = f'{hm}_h{idx}'
                team = team_for(zone, k, mmin, sp, used_ids, len(spots))
                name = NAMES[zone][k]
                npc = {'id': nid, 'x': s['x'], 'y': s['y'], 'facing': s['facing'], 'kind': 'trainer_hooded',
                       'sight_range': len(s['sight_cells']), 'sight_rule': 'see OVERWORLD_README "Trainer line of sight"',
                       'sight_cells': s['sight_cells'], 'text_ref': f'overworld_lines.json maps.{hm}.{nid}',
                       'idle_facings': [s['facing'], 'down', s['facing']], 'hall_trainers_v1': True,
                       'note': f'hall trainers v1 (Oct 29 2026, Coder): lobby trainer {idx} of {TARGET}; placed by tools/hall_trainers (fair sight F1-F5)'}
                m['npcs'].append(npc)
                h['trainers'].append({'id': nid, 'gd_id': f'tr_hall_{zone}_h{idx}', 'name_placeholder': name, 'class': 'helper',
                                      'base': 50, 'prize_placeholder': 50 * max(t['level'] for t in team),
                                      'team': [{**t, 'battle_species': t['species'], 'stand_in': False} for t in team],
                                      'added': 'hall trainers v1, Oct 29 2026'})
                if mkey:  # halls with authored teams: battle reads trainer_teams.js first, keep them identical
                    body = ', '.join(f"{{ species: '{t['species']}', level: {t['level']} }}" for t in team)
                    new_js.append((mkey, f"  '{hm}.{nid}': [{body}], // {name} (hall trainers v1, Oct 29 2026)"))
                g = 'm' if idx % 2 else 'f'; base = smap['map'].get(f'fernwick_hall_int.helper_{1 if g == "m" else 2}')
                smap['map'][f'{hm}.{nid}'] = {**base, 'class': f'{THEME[zone][0]} ({"young man" if g == "m" else "young woman"}), hall trainers v1'}
                text_rows.append((hm, nid, name, THEME[zone][0], zone, team))
            dump(mp, m)
        h_tr = [n for n in m['npcs'] if n['kind'] == 'trainer_hooded']
        probs += [f'{hm}: {p}' for p in check_map(m)]
        if 'hall_v2' in m:
            if len(h['trainers']) != V2_TARGET[hm]: probs.append(f'{hm}: {len(h["trainers"])} trainers (want {V2_TARGET[hm]})')
        elif len(h['trainers']) < 5 or len(h['trainers']) > 8: probs.append(f'{hm}: {len(h["trainers"])} trainers (want 5-8)')
        if len(h_tr) != len(h['trainers']): probs.append(f'{hm}: map has {len(h_tr)} trainer NPCs, masters.json {len(h["trainers"])}')
        for i, t in enumerate(h['trainers']):
            nid = t['id'] if hm == 'fernwick_hall_int' and t['id'].startswith('helper') else f'{hm}_h{i + 1}'
            lv = auth.get(f'{hm}.{nid}', ([x['level'] for x in t['team']], None))[0]
            if t.get('added') and (max(lv) >= mmin or min(lv) < mmin - 4): probs.append(f'F6 {hm}.{nid} levels {lv} vs Master min {mmin}')
            if t.get('added') and mkey and f'{hm}.{nid}' not in auth and not apply: probs.append(f'F6 {hm}.{nid} missing authored team')
        report.append((zone, h['coin_number'], hm, len(h['trainers']), mmin))
    if apply:
        dump('data/masters.json', M); dump('art/characters/pixel/npcs/npc_sprite_map.json', smap)
        for mkey, line in new_js:  # insert right before that hall's Master row
            i = src.index(f"  '{mkey}'"); src = src[:i] + line + '\n' + src[i:]
        open('src/battle/data/trainer_teams.js', 'w').write(src)
        write_requests(text_rows)
    return probs, report

def write_requests(rows):
    L = ['# Text Bot requests: hall trainers v1 (Coder, Oct 29 2026)', '',
         'New hall trainers (Gary pt2060u: "we add more trainers to the gyms"). Each needs a block under',
         '`maps.<hall map>.<npc id>` in text/overworld_lines.json, same shape as `saltmere_hall_int_h1`:',
         '`pages` (pre-battle, 1-2 lines), `battle_lost` (1 line), `after` (1 line, ideally a puzzle or Master hint),',
         '`name`, `trainer_class`. Names below are Coder proposals (in masters.json `name_placeholder`); rename freely,',
         'but avoid clashes with the existing trainers. Blocked words as usual (no gym, route, berry, Poke words).', '',
         '| map | npc id | proposed name | class | hall theme | team (species L) |', '|---|---|---|---|---|---|']
    for hm, nid, name, cls, zone, team in rows:
        L.append(f"| {hm} | {nid} | {name} | {cls} | {'/'.join(THEME[zone][1])} | {', '.join(t['species'] + ' ' + str(t['level']) for t in team)} |")
    L += ['', 'Until these land the trainers battle normally but say nothing before the fight (no placeholder text is shown).']
    open('data/textbot_requests_hall_trainers.md', 'w').write('\n'.join(L) + '\n')

if __name__ == '__main__':
    root = sys.argv[1]; apply = '--apply' in sys.argv
    probs, report = run(root, apply)
    for z, c, hm, n, mm in report: print(f'coin {c} {z:16} {hm:22} trainers {n}  (Master min L{mm})')
    print('problems', len(probs)); [print(' ', p) for p in probs]
    sys.exit(1 if probs else 0)
