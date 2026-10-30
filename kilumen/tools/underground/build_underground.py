#!/usr/bin/env python3
"""Kilumen Underground + Guardian side stories builder (dev/underground, Coder, Oct 30 2026).

Idempotent: run again and it rebuilds from the same spec (everything it adds is tagged "ug": true / "draft": "underground").
  python3 tools/underground/build_underground.py          # build
  python3 tools/underground/build_underground.py --check  # exit 1 if the repo differs from a fresh build

Adds two maps (greystone_seam, revival_rt_annex), wires their entrances (Greystone B1 stairs, a new RT annex building in
Revival Heights' east wood), places the new NPCs and look spots, adds 19 quests to data/quests.json (sq_sea_glass placeholder
rewritten as sq_gd_sea_glass) and writes every line as DRAFT text for Text Bot in text/overworld_lines.json.
Reuses: existing tiles only (cave kit, office building block, lab interior, banner/crate/ore-cart props), v2 lines, QuestBook.
"""
import json, sys, copy, collections, os
sys.path.insert(0, os.path.dirname(__file__))
from spec import NEW_NPCS, Q

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art/world/overworld/maps')
TS = {t['name']: t for t in json.load(open(os.path.join(ROOT, 'art/world/overworld/tileset.json')))['tiles']}
TID = lambda n: TS[n]['id']
NOTE = 'Kilumen Underground (Coder, Oct 30 2026): tools/underground/build_underground.py'
DRAFT = 'DRAFT for Text Bot (from Story Bot outline design/UNDERGROUND_GUARDIAN_SIDESTORIES.md s6)'
CHECK = '--check' in sys.argv
out = {}  # path -> text

def load(name):
    p = os.path.join(MAPS, name + '.json')
    return json.load(open(p)) if os.path.exists(p) else None
def put(path, obj, compact=True):
    """Write in the file's existing style (compact one-liner or indent=N, ensure_ascii as found) so diffs stay small."""
    old = open(path).read() if os.path.exists(path) else None
    if old is not None and old[:2] == '{\n':
        ind = len(old.split('\n')[1]) - len(old.split('\n')[1].lstrip(' '))
        asc = '\\u' in old[:200000] and not any(ord(c) > 127 for c in old[:200000])
        txt = json.dumps(obj, ensure_ascii=asc, indent=ind) + ('\n' if old.endswith('\n') else '')
    elif old is not None:
        asc = '\\u' in old and not any(ord(c) > 127 for c in old)
        sep = (', ', ': ') if '", "' in old[:5000] or '": ' in old[:5000] else (',', ':')
        txt = json.dumps(obj, ensure_ascii=asc, separators=sep) + ('\n' if old.endswith('\n') else '')
    else:
        txt = json.dumps(obj, ensure_ascii=False, separators=(',', ':')) if compact else json.dumps(obj, ensure_ascii=False, indent=1) + '\n'
    out[path] = txt
def grid(w, h, v=0): return [[v] * w for _ in range(h)]

def strip_ug(m):
    """Remove everything a previous run added (tagged ug)."""
    for k in ('npcs', 'interact_spots', 'warps', 'items', 'flag_swaps', 'signs'):
        if isinstance(m.get(k), list): m[k] = [e for e in m[k] if not e.get('ug')]
    tp = m.get('text_pending')
    if isinstance(tp, dict):
        for k in list(tp):
            if isinstance(tp[k], list): tp[k] = [e for e in tp[k] if not e.get('ug')]
    if m.get('ug_restore'):  # cells this builder overwrote: put the originals back first
        for c in m['ug_restore']:
            for lay, v in c['was'].items(): m['layers'][lay][c['y']][c['x']] = v
        del m['ug_restore']
    return m

def setcell(m, x, y, **lay):
    rs = m.setdefault('ug_restore', [])
    if not any(c['x'] == x and c['y'] == y for c in rs):
        rs.append({'x': x, 'y': y, 'was': {k: m['layers'][k][y][x] for k in ('ground', 'decoration', 'overlay', 'collision')}})
    for k, v in lay.items(): m['layers'][k][y][x] = v

# ---------------------------------------------------------------- reachability
def walk_ok(m, x, y, blocked):
    L = m['layers']
    return 0 <= x < m['width'] and 0 <= y < m['height'] and L['collision'][y][x] in (0, 2, 4) and (x, y) not in blocked

def occupied(m):
    s = set()
    for k in ('npcs', 'npcs_pending_text'):
        for n in m.get(k) or []: s.add((n['x'], n['y']))
    for n in (m.get('text_pending') or {}).get('npcs') or []: s.add((n['x'], n['y']))
    return s

def reach(m, blocked=frozenset()):
    """BFS from every warp cell (door arrivals) and edge exit; ledges (2) are one-way south."""
    L, W, H = m['layers'], m['width'], m['height']
    starts = [(w['x'], w['y']) for w in m.get('warps', [])]
    for e in m.get('exits', []):
        for i in range(e['start'], e['end'] + 1):
            starts.append({'north': (i, 0), 'south': (i, H - 1), 'west': (0, i), 'east': (W - 1, i)}[e['edge']])
    seen, q = set(), collections.deque()
    for s in starts:
        if walk_ok(m, *s, blocked) and s not in seen: seen.add(s); q.append(s)
        else:
            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):  # door cells are often blocking art: start next to them
                t = (s[0] + dx, s[1] + dy)
                if walk_ok(m, *t, blocked) and t not in seen: seen.add(t); q.append(t)
    while q:
        x, y = q.popleft()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if not walk_ok(m, nx, ny, blocked) or (nx, ny) in seen: continue
            if L['collision'][ny][nx] == 2 and dy != 1: continue
            seen.add((nx, ny)); q.append((nx, ny))
    return seen

def free_cell(m, near, avoid=()):
    """Nearest walkable, unoccupied cell to `near` whose use as a blocker keeps every reachable cell reachable."""
    base = reach(m, frozenset(occupied(m)))
    occ = occupied(m) | set(avoid)
    warps = {(w['x'], w['y']) for w in m.get('warps', [])}
    cands = sorted(base, key=lambda c: (abs(c[0] - near[0]) + abs(c[1] - near[1]), c[1], c[0]))
    for c in cands:
        if c in occ or c in warps or m['layers']['collision'][c[1]][c[0]] != 0: continue
        if any((c[0] + dx, c[1] + dy) in warps for dx in (-1, 0, 1) for dy in (-1, 0, 1)): continue  # not in a doorway
        after = reach(m, frozenset(occ | {c}))
        if len(after) == len(base) - 1: return c
    raise SystemExit(f'no free cell near {near} on {m["name"]}')

def spot_at(m, sid, target, stand=None, face='up', tile=None, **extra):
    x, y = target
    if stand is None:
        dx, dy = {'up': (0, 1), 'down': (0, -1), 'left': (1, 0), 'right': (-1, 0)}[face]
        stand = (x + dx, y + dy)
    sp = {'id': sid, 'kind': 'prop', 'x': x, 'y': y, 'stand': list(stand), 'face': face, 'ug': True,
          'text_ref': f'overworld_lines.json maps.{m["name"]}.{sid}'}
    if tile: sp['tile'] = tile
    sp.update(extra)
    m.setdefault('interact_spots', []).append(sp)
    return sp

def spot_facing(m, sid, near, want=(1,), avoid=(), **extra):
    """A look spot on the nearest blocking cell of the wanted collision kind that has a reachable stand cell."""
    R = reach(m, frozenset(occupied(m)))
    occ = occupied(m) | set(avoid)
    taken = {(s['x'], s['y']) for s in m.get('interact_spots', [])} | {(s['x'], s['y']) for s in m.get('signs', [])}
    best = None
    for (sx, sy) in R:
        if (sx, sy) in occ: continue
        for face, (dx, dy) in (('up', (0, -1)), ('left', (-1, 0)), ('right', (1, 0)), ('down', (0, 1))):
            tx, ty = sx + dx, sy + dy
            if not (0 <= tx < m['width'] and 0 <= ty < m['height']): continue
            if m['layers']['collision'][ty][tx] not in want or (tx, ty) in taken: continue
            d = abs(tx - near[0]) + abs(ty - near[1]) + (0 if face == 'up' else 0.5)
            if best is None or d < best[0]: best = (d, (tx, ty), (sx, sy), face)
    _, t, s, f = best
    return spot_at(m, sid, t, stand=s, face=f, **extra)

# ---------------------------------------------------------------- new map 1: greystone_seam
SEAM_W, SEAM_H = 16, 12
def build_seam():
    b1 = load('greystone_b1')
    W, H = SEAM_W, SEAM_H
    L = {k: grid(W, H) for k in ('ground', 'decoration', 'overlay', 'collision', 'encounter')}
    floor = [TID(f'cave_{i}') for i in range(4)]
    for y in range(H):
        for x in range(W):
            L['ground'][y][x] = TID('cavewall_top'); L['collision'][y][x] = 1
    # room: floor x2..13, y3..9; face row y2; sides x1/x14; bottom wall face y10
    for y in range(3, 10):
        for x in range(2, 14):
            L['ground'][y][x] = floor[(x * 7 + y * 3) % 4]; L['collision'][y][x] = 0
    for x in range(2, 14): L['ground'][2][x] = TID('cavewall_face_u')
    L['ground'][2][2] = TID('cavewall_face_u_w'); L['ground'][2][13] = TID('cavewall_face_u_e')
    for y in range(2, 10): L['ground'][y][1] = TID('cavewall_side_w'); L['ground'][y][14] = TID('cavewall_side_e')
    for x in range(2, 14): L['ground'][10][x] = TID('cavewall_face_l')
    L['ground'][10][2] = TID('cavewall_face_l_w'); L['ground'][10][13] = TID('cavewall_face_l_e')
    # stairs back up (wall face, warp code 4), arrive below it
    L['decoration'][2][3] = TID('cave_stairs'); L['collision'][2][3] = 4
    # the breathing crack: violet crystal in the north wall (look at Night)
    L['decoration'][2][9] = TID('crystal')
    # pond (exact 3x2 autotile block from greystone_b1's lower chamber)
    for dy in range(2):
        for dx in range(3):
            L['ground'][6 + dy][10 + dx] = b1['layers']['ground'][25 + dy][28 + dx]; L['collision'][6 + dy][10 + dx] = 3
    # props: abandoned dig (ore cart, crates, cold camp), rocks; a rock-walled nook in the SE corner hides an item
    for (x, y, n) in ((5, 4, 'i_ore_cart'), (12, 3, 'i_crates_0_0'), (13, 3, 'i_crates_0_1'), (6, 8, 'camp_cold'),
                      (2, 6, 'cave_rock'), (8, 6, 'cave_rock'), (12, 9, 'cave_rock'), (11, 8, 'cave_rock'), (4, 9, 'crystal')):
        L['decoration'][y][x] = TID(n); L['collision'][y][x] = TS[n]['collision_code'] or 1
    m = {'name': 'greystone_seam', 'title': 'Greystone - Old Seam', 'width': W, 'height': H, 'tile_size': 64, 'tileset': '../tileset.json',
         'layers': L, 'warps': [{'x': 3, 'y': 2, 'to': 'greystone_b1', 'tx': 28, 'ty': 23, 'facing': 'down'}],
         'exits': [], 'npcs': [], 'signs': [],
         'items': [{'id': 'seam_nook', 'x': 13, 'y': 9, 'hidden': True, 'item': 'lantern_moth', 'flag': 'item_greystone_seam_nook'}],
         'encounter_zones': [], 'movement': {'run': True, 'bike': False},
         'tags': ['cave', 'underground', 'quiet'], 'ug_note': NOTE + '. Quiet dead-end seam below B1 (no encounters): Ivo\'s breathing crack (R2.2).'}
    spot_at(m, 'ug_seam_crack', (9, 2), face='up', tile='crystal')
    spot_at(m, 'ug_seam_cart', (5, 4), stand=(5, 5), face='up', tile='i_ore_cart')
    return m

# ---------------------------------------------------------------- new map 2: revival_rt_annex (lab interior clone)
def build_annex():
    m = copy.deepcopy(load('lab_tidewater_cave'))
    L = m['layers']
    m.update(name='revival_rt_annex', title='Revival Tech - Heights Annex')
    m['warps'] = [{'x': 8, 'y': 11, 'to': '$return', 'tx': 0, 'ty': 0, 'facing': 'down'}]
    m['npcs'] = []; m['interact_spots'] = []; m['items'] = []
    for k in ('variants', 'text_pending'): m.pop(k, None)
    # founder picture: company banner hung over a painting (lab machine slot, x7-8 y2)
    L['decoration'][2][7] = TID('i_banner_revival_0_0'); L['decoration'][2][8] = TID('i_banner_revival_1_0')
    m['ug_note'] = NOTE + '. RT Heights annex (R3): recalibration door, founder picture, river window. Interior reused from lab_tidewater_cave.'
    spot_at(m, 'ug_founder_picture', (7, 2), face='up', tile='i_banner_revival_0_0')
    spot_at(m, 'ug_recal_door', (13, 2), face='up', tile='i_server_rack_1_0')
    spot_at(m, 'ug_river_window', (10, 2), face='up')
    spot_at(m, 'ug_annex_tanks', (3, 2), face='up')
    m['npcs'] = [
        {'id': 'rh_annex_guard', 'x': 10, 'y': 10, 'facing': 'left', 'kind': 'guard', 'sprite': 'vil_stationguard_m', 'ug': True,
         'text_ref': 'overworld_lines.json maps.revival_rt_annex.rh_annex_guard'},
        {'id': 'rh_cleaner', 'x': 3, 'y': 8, 'facing': 'right', 'kind': 'villager', 'ug': True,
         'text_ref': 'overworld_lines.json maps.revival_rt_annex.rh_cleaner'},
    ]
    return m

# ---------------------------------------------------------------- existing maps
def patch_b1(m):
    strip_ug(m)
    setcell(m, 28, 22, ground=TID('cavewall_face_l'), decoration=TID('cave_stairs'), collision=4)
    m['warps'].append({'x': 28, 'y': 22, 'to': 'greystone_seam', 'tx': 3, 'ty': 3, 'facing': 'down', 'ug': True})

ANNEX = dict(x0=45, y0=20, w=7, h=6, door=(48, 25))
def patch_rh(m):
    strip_ug(m)
    tw = load('tidewater_coast')
    grass = m['layers']['ground'][22][42]
    for y in range(20, 28):
        for x in range(44, 52):
            setcell(m, x, y, ground=grass, decoration=0, overlay=0, collision=0)
    for dy in range(6):
        for dx in range(7):
            sx, sy = 34 + dx, 25 + dy
            setcell(m, ANNEX['x0'] + dx, ANNEX['y0'] + dy, decoration=tw['layers']['decoration'][sy][sx],
                    overlay=tw['layers']['overlay'][sy][sx], collision=tw['layers']['collision'][sy][sx])
    for (x, y, n) in ((44, 21, 'lamp'), (44, 27, 'flowers_violet'), (51, 27, 'flowers_violet'), (45, 26, 'flowers_violet')):
        setcell(m, x, y, decoration=TID(n), collision=TS[n]['collision_code'])
    dx, dy = ANNEX['door']
    m['warps'].append({'x': dx, 'y': dy, 'to': 'revival_rt_annex', 'tx': 8, 'ty': 10, 'facing': 'up', 'ug': True})
    m.setdefault('signs', []).append({'id': 'rh_annex_sign', 'x': 47, 'y': 26, 'ug': True, 'text_ref': 'overworld_lines.json maps.revival_heights.rh_annex_sign'})
    setcell(m, 47, 26, decoration=TID('sign'), collision=1)

def patch_club(m):
    strip_ug(m)
    tp = m['text_pending']
    pn = next(s for s in tp['interact_spots'] if s['id'] == 'poster_names')
    m.setdefault('interact_spots', [])
    m['interact_spots'].append({**pn, 'ug': True, 'ug_note': 'promoted from text_pending (Names, Not Numbers R1.2)'})
    spot_at(m, 'ug_two_pots', (12, 12), stand=(12, 13), face='up', tile='club_booth_table',
            daily_counter='ug_pots_days', daily_requires='q_sq_ug_greenhouse_on', daily_stop='sq_ug_greenhouse_d3')
    spot_at(m, 'ug_dj_desk', (11, 10), stand=(11, 11), face='up', tile='club_dj_desk')
    spot_at(m, 'ug_evidence_board', (12, 8), stand=(12, 9), face='up', tile='club_poster_notes')

def patch_generic(m, todo):
    strip_ug(m)
    for fn in todo: fn(m)

def place_npc(m, nid, near, facing, kind, sprite):
    c = free_cell(m, near)
    n = {'id': nid, 'x': c[0], 'y': c[1], 'facing': facing, 'kind': kind, 'ug': True,
         'text_ref': f'overworld_lines.json maps.{m["name"]}.{nid}'}
    if sprite: n['sprite'] = sprite
    m.setdefault('npcs', []).append(n)
    return c

def prop(m, x, y, name):
    setcell(m, x, y, decoration=TID(name), collision=TS[name]['collision_code'] or 1)

SALT = lambda m: (
    prop(m, 41, 28, 'i_crates_0_0'), prop(m, 42, 28, 'i_crates_0_1'), prop(m, 15, 29, 'i_crystal_crate'), prop(m, 27, 14, 'i_crystal_crate'),
    spot_at(m, 'ug_dock_crates', (41, 28), stand=(41, 29), face='up', tile='i_crates_0_0'),
    spot_at(m, 'ug_wet_crate', (15, 29), stand=(16, 29), face='left', tile='i_crystal_crate'),
    spot_at(m, 'ug_glass_stall', (27, 14), stand=(27, 15), face='up', tile='i_crystal_crate'),
    place_npc(m, 'saltmere_dockhand', (43, 29), 'left', 'villager', None),
    place_npc(m, 'lucky_crystal_seller', (28, 14), 'down', 'villager', 'vil_fan_m'))

def LREST(m):
    spot_at(m, 'ug_ivo_stone', (19, 10), face='up', tile='memorial_stone_blank')
    m.setdefault('flag_swaps', []).append({'x': 19, 'y': 10, 'layer': 'decoration', 'before': 'memorial_stone_blank', 'after': 'memorial_stone_a',
                                           'flag': 'sq_gd_miner_lamp_stone', 'ug': True})
    place_npc(m, 'ivo_miner', (25, 18), 'left', 'villager_scholar', None)

def RH(m):
    patch_rh(m)
    place_npc(m, 'rh_intern', (43, 26), 'right', 'villager', 'vil_commuter_f')

SUN = lambda m: (place_npc(m, 'sunmeadow_nan', (16, 18), 'down', 'villager', None),
                 spot_facing(m, 'ug_nan_fence', (17, 21)))
MIRE = lambda m: (promote_pending(m, 'mirefen_angler'), spot_facing(m, 'ug_count_reeds', (27, 21), want=(1, 3)),
                  spot_facing(m, 'ug_dark_islet', (13, 22), want=(3,)),
                  place_npc(m, 'mirefen_census_clerk', (24, 19), 'down', 'clerk', 'vil_clerk_f'))
TIDE = lambda m: (spot_at(m, 'ug_wind_chime', (31, 24), face='up', tile='lamp'),
                  spot_facing(m, 'ug_lifeguard_buoy', (40, 34), want=(3,)),
                  place_npc(m, 'tidewater_beachcomber', (33, 26), 'down', 'villager', 'vil_tourist_f'))
CIND = lambda m: (spot_facing(m, 'ug_forge_vent', (28, 23)),
                  place_npc(m, 'cindervale_baker', (20, 25), 'down', 'villager', None))

def promote_pending(m, nid):
    """mirefen_angler sits in npcs_pending_text: it gets a text entry now, so it moves to npcs."""
    pend = m.get('npcs_pending_text') or []
    hit = [n for n in pend if n['id'] == nid]
    if hit:
        m['npcs_pending_text'] = [n for n in pend if n['id'] != nid]
        m.setdefault('npcs', []).append({**hit[0], 'ug_promoted': True})

# ---------------------------------------------------------------- quests + text
def build_quests_and_text(maps):
    qpath = os.path.join(ROOT, 'data/quests.json'); qd = json.load(open(qpath))
    qd['quests'] = [q for q in qd['quests'] if not q.get('ug') and q['id'] != 'sq_sea_glass']
    order = max(q['order'] for q in qd['quests']) + 1
    tpath = os.path.join(ROOT, 'text/overworld_lines.json'); td = json.load(open(tpath))
    T = td['maps']
    # strip old ug text
    for mp in list(T):
        for eid in list(T[mp]):
            e = T[mp][eid]
            if isinstance(e, dict) and e.get('draft') == 'underground': del T[mp][eid]
            elif isinstance(e, dict) and isinstance(e.get('lines'), list):
                e['lines'] = [l for l in e['lines'] if l.get('draft') != 'underground']
    td['underground_quests'] = {}
    UQ = td['underground_quests']
    keys = []

    def entry(mp, eid, default_pages, role):
        T.setdefault(mp, {})
        if eid not in T[mp]:
            T[mp][eid] = {'draft': 'underground', 'status': DRAFT, 'role': role, 'pages': default_pages, 'lines': []}
            keys.append(f'maps.{mp}.{eid}')
        T[mp][eid].setdefault('lines', [])
        return T[mp][eid]

    for q in Q:
        qid = q['id']; on = f'q_{qid}_on'
        steps, new_ids, prev = [], [], None
        for i, (sfx, desc, smap, target, beat) in enumerate(q['steps']):
            flag = f'{qid}_{sfx}'
            steps.append({'id': f'{qid}_s{i + 1}', 'desc': desc, 'map': smap, 'at': None, 'flag': flag, 'condition': None, 'optional': False})
            new_ids.append(flag)
            if target is None: continue
            kind, tid = target
            e = T[smap][tid] if (smap in T and tid in T[smap]) else None
            if e is None: e = entry(smap, tid, ['Nothing to see yet.'], 'Underground look spot')
            req = [on] + [f for f in beat.get('needs', [])]
            if prev and prev not in req and not beat.get('needs'): req.append(prev)
            line = {'id': f'ug_{qid}_{sfx}', 'draft': 'underground', 'status': DRAFT, 'requires': req, 'sets': flag, 'pages': beat['pages']}
            if beat.get('time'): line['time'] = beat['time']
            if beat.get('state'): line['requires_state'] = beat['state']
            if beat.get('warmth'): line['requires_state'] = {'lead_warmth_gte': beat['warmth']}
            e['lines'].append(line)
            keys.append(f'maps.{smap}.{tid}#{line["id"]}')
            if beat.get('alt'):
                a = beat['alt']
                al = {'id': f'ug_{qid}_{sfx}_warm', 'draft': 'underground', 'status': DRAFT, 'requires': req, 'sets': [flag, a['extra']],
                      'requires_state': {'lead_warmth_gte': a['warmth']}, 'pages': a['pages']}
                e['lines'].append(al); new_ids.append(a['extra'])
                keys.append(f'maps.{smap}.{tid}#{al["id"]}')
            # a waiting line when the step is gated by time/Warmth/day (so the spot is never silent mid-quest)
            if beat.get('time') or beat.get('warmth') or beat.get('state'):
                wait = {'time': 'Not now. ' + {'night': 'It only shows at Night.', 'dusk': 'Come back at Dusk.', 'dawn': 'Come back at Dawn.'}.get(beat.get('time', [''])[0], 'Later.'),
                        'warmth': 'Your partner hangs back. Maybe when it trusts you more.', 'state': 'Nothing new today. Plants take their time.'}
                why = 'time' if beat.get('time') else ('warmth' if beat.get('warmth') else 'state')
                wl = {'id': f'ug_{qid}_{sfx}_wait', 'draft': 'underground', 'status': DRAFT, 'requires': req, 'requires_not': [flag], 'pages': [wait[why]]}
                e['lines'].insert(len(e['lines']) - (2 if beat.get('alt') else 1), wl)
                keys.append(f'maps.{smap}.{tid}#{wl["id"]}')
            prev = flag
        gmap, gnpc = q['giver']
        if gmap in T and gnpc in T[gmap]: pass
        else: entry(gmap, gnpc, q['start'][:1], 'Underground quest giver')
        lines = []
        for ctx in ('start', 'in_progress', 'turn_in'):
            if not q[ctx]: continue
            k = f'underground_quests.{qid}.{ctx}'
            UQ.setdefault(qid, {'status': DRAFT, 'outline': q['outline']})[ctx] = q[ctx]
            lines.append({'npc': gnpc, 'context': ctx, 'step': None, 'key': k, 'text': q[ctx]})
            keys.append(k)
        rw = q['reward']
        qd['quests'].append({
            'id': qid, 'title': q['title'], 'type': 'side', 'zone': q['zone'], 'order': order, 'map_status': 'built',
            'giver': {'npc': gnpc, 'map': gmap}, 'start': 'npc', 'turn_in': 'npc', 'prerequisites': q['prereq'], 'steps': steps,
            'reward': {'items_placeholder': [{'id': i, 'qty': n} for i, n in rw['items']], 'money_placeholder': rw['money'], 'flags': rw['flags']},
            'lines': lines, 'new_ids': new_ids + rw['flags'], 'status': 'DRAFT', 'ug': True,
            'arc': 'Kilumen Underground' if q['kind'] == 'U' else 'The Guardian', 'region': q['region'], 'outline': 'UNDERGROUND_GUARDIAN_SIDESTORIES.md ' + q['outline']})
        order += 1
    # default (no-quest) lines for every new NPC / spot
    DEF = {
        ('saltmere', 'saltmere_dockhand'): ['Crates in, crates out. Nobody asks what\'s in them. Nobody asks me anything.'],
        ('saltmere', 'lucky_crystal_seller'): ['Lucky crystals! Glass ones. Very lucky. Very glass.'],
        ('lantern_rest', 'ivo_miner'): ['I dug Greystone twenty years. I come here now. It\'s quieter.'],
        ('revival_heights', 'rh_intern'): ['First week at the annex. Everyone walks very fast.'],
        ('revival_rt_annex', 'rh_annex_guard'): ['Annex. Staff and visitors. You\'re... a visitor. Fine.'],
        ('revival_rt_annex', 'rh_cleaner'): ['I\'ve dusted this place since before it had a name on the door.'],
        ('sunmeadow_fields', 'sunmeadow_nan'): ['Lovely morning. The barrier shine\'s up early again.'],
        ('mirefen_bog', 'mirefen_census_clerk'): ['Census. Every creature counted, every week. It\'s soothing. Usually.'],
        ('tidewater_coast', 'tidewater_beachcomber'): ['Low tide\'s the best time. The sea gives things back.'],
        ('cindervale', 'cindervale_baker'): ['Fresh bread, warm stones. Well. Warm-ish stones.'],
        ('mirefen_bog', 'mirefen_angler'): ['Shh. Fish can hear you think.'],
        ('club_int', 'ug_two_pots'): ['Two little pots on the booth table. Somebody\'s watering them.'],
        ('club_int', 'ug_dj_desk'): ['Decks, a crate of records, a sticky note: "5 notes, not 4".'],
        ('club_int', 'ug_evidence_board'): ['A cork board crowded with notes. Pins, string, a lot of question marks.'],
        ('saltmere', 'ug_dock_crates'): ['Crates stamped GREYSTONE. Stacked high.'],
        ('saltmere', 'ug_wet_crate'): ['A crate set apart from the others.'],
        ('saltmere', 'ug_glass_stall'): ['A crate of glass crystals. Shiny. Not violet. Not quite.'],
        ('lantern_rest', 'ug_ivo_stone'): ['A blank stone. No name yet.'],
        ('greystone_seam', 'ug_seam_crack'): ['A crack in the rock with violet behind it. It\'s quiet now.'],
        ('greystone_seam', 'ug_seam_cart'): ['An old ore cart. Somebody left in a hurry, and left it full.'],
        ('revival_rt_annex', 'ug_founder_picture'): ['A big company banner hangs over a painting. The plaque says: "Where it all began".'],
        ('revival_rt_annex', 'ug_recal_door'): ['A shutter between the racks. RECALIBRATION. STAFF ONLY.'],
        ('revival_rt_annex', 'ug_river_window'): ['The window looks down on the river.'],
        ('revival_rt_annex', 'ug_annex_tanks'): ['Tanks of clear water. Empty. Labelled for "drift units".'],
        ('revival_heights', 'rh_annex_sign'): ['REVIVAL TECH - HEIGHTS ANNEX. Deliveries round the front.'],
        ('sunmeadow_fields', 'ug_nan_fence'): ['The field edge. The barrier shine glows on the horizon.'],
        ('mirefen_bog', 'ug_count_reeds'): ['Tall reeds. The water looks low here.'],
        ('mirefen_bog', 'ug_dark_islet'): ['Dark water round a little islet. Very still.'],
        ('tidewater_coast', 'ug_wind_chime'): ['A wind chime of sea glass hangs from the lamp.'],
        ('tidewater_coast', 'ug_lifeguard_buoy'): ['A buoy bobbing past the breakers.'],
        ('cindervale', 'ug_forge_vent'): ['The old forge. Warm, even now.'],
    }
    for (mp, eid), pages in DEF.items():
        e = entry(mp, eid, pages, 'Underground NPC / look spot')
        if e.get('draft') == 'underground': e['pages'] = pages
    # mirefen_angler: also the Sit-with-me (sq_ask_nicely) giver - keep both: sq_ask_nicely lines live in quests.json
    # Ron's Same Dream (R7.2): Ron's house line only after the page hand-off and the quest
    ron = T.setdefault('house_1f', {}).get('ron')
    td['_meta'].setdefault('underground', {'status': DRAFT, 'note': 'Every line tagged draft:"underground" was written by Coder from the Story Bot outline; Text Bot owns final wording. List: data/textbot_requests_underground.md'})
    put(qpath, qd, compact=False); put(tpath, td, compact=False)
    return keys

def main():
    seam = build_seam(); annex = build_annex()
    edits = {}
    b1 = load('greystone_b1'); patch_b1(b1); edits['greystone_b1'] = b1
    club = load('club_int'); patch_club(club); edits['club_int'] = club
    for name, fn in (('saltmere', SALT), ('lantern_rest', LREST), ('sunmeadow_fields', SUN), ('mirefen_bog', MIRE),
                     ('tidewater_coast', TIDE), ('cindervale', CIND)):
        m = load(name); strip_ug(m); fn(m); edits[name] = m
    rh = load('revival_heights'); strip_ug(rh); RH(rh); edits['revival_heights'] = rh
    for m in (seam, annex): put(os.path.join(MAPS, m['name'] + '.json'), m)
    for name, m in edits.items(): put(os.path.join(MAPS, name + '.json'), m)
    # world layout: new maps join their zones
    wp = os.path.join(ROOT, 'art/world/overworld/world_layout.json'); w = json.load(open(wp))
    for z in w['zones']:
        if z['id'] == 'greystone_caverns' and 'greystone_seam' not in z['maps']: z['maps'].append('greystone_seam')
        if z['id'] == 'revival_heights' and 'revival_rt_annex' not in z['maps']: z['maps'].append('revival_rt_annex')
    w['interior_doors'] = [d for d in w['interior_doors'] if not d.get('ug')] + [
        {'exterior': 'revival_heights', 'door': list(ANNEX['door']), 'to': 'revival_rt_annex', 'arrival': [8, 10], 'kind': 'company annex (unique)',
         'recolour': None, 'scheme': None, 'back': ['$return'], 'why': 'Underground R3: intern delivery, founder picture', 'ug': True},
        {'exterior': 'greystone_b1', 'door': [28, 22], 'to': 'greystone_seam', 'arrival': [3, 3], 'kind': 'cave stairs (dead-end seam)',
         'recolour': None, 'scheme': None, 'back': ['greystone_b1 (28,23)'], 'why': 'Guardian R2.2: Ivo\'s breathing seam', 'ug': True}]
    put(wp, w)
    keys = build_quests_and_text(edits)
    # Text Bot request list
    md = ['# Text Bot requests: Kilumen Underground + Guardian side stories (dev/underground, Oct 30 2026)', '',
          'Source: Story Bot outline `design/UNDERGROUND_GUARDIAN_SIDESTORIES.md` (commit 1e7792c) section 6. Every key below holds a Coder DRAFT',
          '(tagged `"draft": "underground"` / `status: DRAFT for Text Bot`). Please rewrite in place; keep ids, `requires`, `sets`, `time`, `requires_state`.', '',
          'Rules from the outline: no exposition, both sides partly right, the Guardian is never seen, Warmth is the evidence, no drinking/smoking/drugs.', '',
          '## Keys', ''] + [f'- `{k}`' for k in keys] + ['', f'Total: {len(keys)} keys.', '']
    out[os.path.join(ROOT, 'data/textbot_requests_underground.md')] = '\n'.join(md)
    changed = []
    for p, txt in out.items():
        old = open(p).read() if os.path.exists(p) else None
        if old != txt:
            changed.append(os.path.relpath(p, ROOT))
            if not CHECK: open(p, 'w').write(txt)
    print(('DIFF ' if CHECK else 'wrote ') + str(len(changed)) + ' files', *changed, sep='\n  ')
    print('text keys:', len(keys))
    if CHECK and changed: sys.exit(1)

if __name__ == '__main__':
    main()
