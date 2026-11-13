# Interiors hookup (Oct 22 2026): merges the interiors worker's kit (interiors_new/, READ-ONLY here) into the main build
# and applies Gary's interior-reuse rule. Owned by the overworld owner; it never writes into interiors_new/.
#   register(reg, reg_multi) : build.py EXTRA_TILE_MODULES hook. 490 i_ tiles (ids 7001..7490 kept), + the Brookhollow `lab` building.
#   import_maps(Map, BYNAME)  : the interiors Brookhollow/Fernwick use (unique + shared pool) -> Map objects with precomputed layers.
#   hookup(maps)              : '@home_pool' door warps -> shared design (rotation) + recolour scheme; interior exits both ways.
#   check(res)                : door/exit/locked-door/spot checks (run.py prints them with the other checks).
#   tileset_entries(k), sheets(k) : i_ entries for tileset*.json (sheets stay in interiors_new/tiles_<k>x/).
# Rule (OVERWORLD_README section "Interior reuse"): only story-necessary buildings get a unique interior; everything else uses
# 4 shared home designs (rotated per area, 1 in 4 houses each, recoloured per door), 1 heal branch, 1 mart, 1 station.
import os, json, copy, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.abspath(os.path.join(HERE, '..')); IN = os.path.join(OUT, 'interiors_new')
IT = json.load(open(os.path.join(IN, 'tileset_interiors.json')))
class _CoreFallback(dict):
    # imported interiors may also hold a few CORE kit tiles (world_data.py: window_<phase>_t/_b, i_company_terminal).
    # Unknown ids / names resolve from build.BYNAME so previews and checks see them (entry has core=True; tile_img draws its frame).
    def __init__(s, d, by): super().__init__(d); s.by = by
    def __missing__(s, k):
        import build
        t = build.BYNAME.get(k) if s.by == 'name' else next((t for t in build.BYNAME.values() if t['id'] == k), None)
        if t is None: raise KeyError(k)
        e = dict(id=t['id'], name=t['name'], category=t['cat'], collision=t['coll'], core=True, _t=t); self_set = dict.__setitem__; self_set(s, k, e); return e
IBYNAME = _CoreFallback({t['name']: t for t in IT['tiles']}, 'name'); IBYID = _CoreFallback({t['id']: t for t in IT['tiles']}, 'id')

# ---------------- the reuse rule, as data ----------------
HOME_POOL = [   # exactly 4 shared home designs: different sizes, furniture styles, one with an upstairs
    dict(id='H1', map='home_brookhollow_a', size='10x8', style='oak cottage, fireplace, red rug', floors=1),
    dict(id='H2', map='home_fernwick_c', size='12x9', style='pine lodge, big sand rug, fishing corner', floors=1),
    dict(id='H3', map='home_lanternport_c', size='12x10 + 2F', style='teal parquet family home: kitchen, sofa, TV; bedroom upstairs', floors=2, upstairs='home_lanternport_c_2f'),
    dict(id='H4', map='home_saltmere_a', size='12x9', style='driftwood-and-stone seaside room, teal rug', floors=1),
]
AREAS = ['brookhollow', 'fernwick'] + ['aurelith', 'saltmere', 'revival_heights', 'frostspire', 'mirefen', 'tidewater_coast', 'lanternport', 'cindervale']   # OVERNIGHT DRAFT          # rotation offset = index (later towns append here: saltmere, cindervale, ...)
CHAINS = {'heal': 'heal_brookhollow', 'mart': 'shop_int', 'station': 'station_int'}   # one shared map per chain
UNIQUE = {   # story-unique interiors and WHY (sources: CRITICAL_PATH.md, overworld_lines.json, SOUL_PLAYBOOK 8.1-8.5 + easter eggs)
    'house_1f': "player's house 1F: Ron, E2 3 a.m. Static (TV), 8.5-F Ron's CV",
    'house_2f': "player's house 2F: player_start, E3 Dana's Drafts (PC), E14 Dreams Move Upstream (bed)",
    'office_int': 'RT field office: promotion cutscene (critical path), E9 The Crystal Stares Back, 8.5-B Dana\'s Desk',
    'fernwick_hall_int': 'Master of Fernwick hall: gating puzzle + coin (beat_master_fernwick, critical path)',
    'lab_brookhollow': 'Lumen Lab: starter choice (got_starter) and 8.1 lab-tech onboarding',
    'rt_branch_backroom': 'RT branch back room: story hook behind the STAFF ONLY door (has_branch_card)',
    'home_brookhollow_b': 'E13 The Fireside Book: the scholar + his bookcase (was house_int_b)',
    'home_fernwick_a': "8.5-E The Kid's Last Joke: parent_c (job ads) + kid_c, TV (was house_int_c, door fernwick (22,6))",
    'heal_fernwick': '8.5-E: parent_c later works here as a Care Associate (the Fernwick branch needs its own state)',
}
SUB_FLOORS = {'home_brookhollow_b': ['home_brookhollow_b_2f'], 'home_fernwick_a': ['home_fernwick_a_2f'], 'home_lanternport_c': ['home_lanternport_c_2f']}
IMPORT = (['heal_brookhollow', 'heal_fernwick', 'rt_branch_backroom', 'lab_brookhollow', 'home_brookhollow_b', 'home_brookhollow_b_2f',
           'home_fernwick_a', 'home_fernwick_a_2f'] + [d['map'] for d in HOME_POOL] + ['home_lanternport_c_2f'])
RETIRED = ['house_int_a', 'house_int_b', 'house_int_c', 'heal_centre_int']   # old shared maps: kept in maps/, nothing warps to them
EXTERIOR_TOWNS = ('brookhollow', 'fernwick') + tuple(['aurelith', 'saltmere', 'revival_heights', 'frostspire', 'mirefen', 'tidewater_coast', 'lanternport', 'cindervale'])   # OVERNIGHT DRAFT
STAFF_FLAG = 'has_branch_card'               # overrides INTERIORS.md 'rt_backroom_open' (Gary, Oct 22)

# ---------------- Text Bot carry-over (kept OUT of npcs/signs/interact_spots until Text Bot re-keys them) ----------------
def _spot(id_, x, y, stand, face, tile, was, **kw): return dict(id=id_, kind='prop', x=x, y=y, stand=list(stand), face=face, tile=tile, text_was=was, **kw)
CARRY_SPOTS = {
    'heal_brookhollow': [_spot('sofa', 2, 3, (2, 4), 'up', 'i_sofa_brook', 'maps.heal_centre_int.sofa', note='E10 Lap Nap; shared branch. Sofa (1,3)-(2,3), moved off the d-pad by world_data.audit_fixes (scale audit, Oct 22)'),
                         _spot('company_terminal', 12, 4, (11, 4), 'right', 'i_pc', 'maps.heal_centre_int.company_terminal', note='storage / company tasks PC')],
    'heal_fernwick': [_spot('sofa', 2, 3, (2, 4), 'up', 'i_sofa_fern', 'maps.heal_centre_int.sofa', note='E10 Lap Nap. Sofa (1,3)-(2,3), moved off the d-pad by world_data.audit_fixes (scale audit, Oct 22)'),
                      _spot('company_terminal', 12, 4, (11, 4), 'right', 'i_pc', 'maps.heal_centre_int.company_terminal', note='storage / company tasks PC')],
    'home_brookhollow_b': [_spot('bookcase', 5, 2, (5, 3), 'up', 'i_bookcase_brook', 'maps.house_int_b.bookcase_left', note='E13 The Fireside Book')],
    'home_brookhollow_b_2f': [_spot('shelf', 6, 3, (6, 4), 'up', 'i_shelf_brook', 'maps.house_int_b.bookcase_right')],
    'home_fernwick_a': [_spot('tv', 8, 3, (8, 4), 'up', 'i_tv', 'maps.house_int_c.tv', note='"the kid behind you knows every word": kid_c lives here')],
}
CARRY_NPCS = {   # (map, npc id) -> Text Bot key it should use; extra NPCs added to a map
    ('heal_brookhollow', 'heal_brookhollow_carer'): 'maps.heal_centre_int.healer', ('heal_fernwick', 'heal_fernwick_carer'): 'maps.heal_centre_int.healer',
    ('home_fernwick_a', 'home_fernwick_a_parent'): 'maps.house_int_c.parent_c', ('home_fernwick_a_2f', 'home_fernwick_a_kid'): 'maps.house_int_c.kid_c'}
ADD_NPCS = {'home_brookhollow_b': [dict(id='scholar', x=4, y=4, facing='down', kind='villager_scholar', text_was='maps.house_int_b.scholar', note='E13: gives the Fireside Book after Kilindex 150')]}

# ---------------- tiles ----------------
_SH = {}
def _sheet(path, k=1):
    p = os.path.join(IN, path.replace('tiles_1x/', f'tiles_{k}x/'))
    if p not in _SH:
        from PIL import Image
        _SH[p] = Image.open(p).convert('RGBA')
    return _SH[p]
def tile_img(name, k=1, frame=None):
    e = IBYNAME[name]; T = 64 * k
    if e.get('core'):
        from PIL import Image
        import numpy as np
        f = e['_t']['frames'][frame or 0]; f = f if isinstance(f, Image.Image) else Image.fromarray(np.asarray(f, np.uint8), 'RGBA')
        f = f.convert('RGBA'); return f if k == 1 else f.resize((T, T), Image.NEAREST)
    i = e['index'] if frame is None else frame
    return _sheet(e['sheet'], k).crop(((i % 16) * T, (i // 16) * T, (i % 16) * T + T, (i // 16) * T + T))

def register(reg, reg_multi):
    import build, buildings, furniture_fix
    furniture_fix.apply_interior_sheets(); _SH.clear()   # furniture-colour rule: interiors_new sheets = pristine copy + swaps (idempotent)
    for e in IT['tiles']:
        a = e.get('animation'); idxs = a['frames'] if a else [e['index']]
        t = dict(id=e['id'], name=e['name'], cat='i_' + e['category'], frames=[tile_img(e['name'], 1, i) for i in idxs], coll=e['collision'],
                 enc=int(e['encounter']), ms=(a or {}).get('frame_ms'), notes=e.get('notes'), states=None, anim=None, ysort=False, ext=True, entry=e, interior=True)
        build.TILES.append(t); build.BYNAME[e['name']] = t
    # Brookhollow Lumen Lab exterior: 7x5, slate-blue roof, white plaster, LUMEN LAB band (buildings.SPEC['lab']). Appended after every core tile -> no id shifts.
    im = buildings.building(7, 5, 2.25, (96, 112, 150), (246, 246, 242), 'lab')
    build.REFS['lab'] = reg_multi('lab', im, 'building', door_cells={(3, 4)})

def tileset_entries(k=1):
    out = []
    for e in IT['tiles']:
        e = copy.deepcopy(e); e['sheet'] = 'interiors_new/' + e['sheet'].replace('tiles_1x/', f'tiles_{k}x/'); e['interior'] = True
        if 'states' in e: e['states'] = {s: (IBYNAME[v]['id'] if isinstance(v, str) and v in IBYNAME else v) for s, v in e['states'].items()}
        out.append(e)
    return out
def sheets(k=1): return {c: 'interiors_new/' + p.replace('tiles_1x/', f'tiles_{k}x/') for c, p in IT['sheets'].items()}

# ---------------- maps ----------------
def _load(nm): return json.load(open(os.path.join(IN, 'maps', nm + '.json')))
def import_maps(Map, BYNAME):
    out = []
    for nm in IMPORT:
        d = _load(nm); L = d['layers']
        m = Map(nm, d['width'], d['height'], title=d['title'])
        G, D, O = (copy.deepcopy(L[k]) for k in ('ground', 'decoration', 'overlay')); C = copy.deepcopy(L['collision']); E = copy.deepcopy(L['encounter'])
        nmid = lambda i: IBYID[i]['name'] if i else None
        m.deco = [[nmid(i) for i in r] for r in D]; m.over = [[nmid(i) for i in r] for r in O]; m.terr = [['imported'] * m.w for _ in range(m.h)]
        m.warps = [dict(w) for w in d['warps']]; m.exits = d['exits']; m.items = d['items']; m.enc_zones = d['encounter_zones']
        m.npcs = []; m.signs = []
        role = ('unique' if nm in UNIQUE else 'shared home design ' + next(h['id'] for h in HOME_POOL if h['map'] == nm) if any(h['map'] == nm for h in HOME_POOL)
                else 'shared chain: heal' if nm == CHAINS['heal'] else 'upper floor of ' + next(k for k, v in SUB_FLOORS.items() if nm in v))
        npcs = []
        for n in d['npcs']:
            n = dict(n); was = CARRY_NPCS.get((nm, n['id']))
            if was: n['text_was'] = was
            npcs.append(n)
        npcs += [dict(n) for n in ADD_NPCS.get(nm, [])]
        signs = [dict(s, id=s['text_ref'].split('.')[-1]) for s in d['signs']]
        soul = dict(source=f'interiors_new/maps/{nm}.json (interiors worker), merged by tools/interiors_merge.py', region=d.get('region'), interior_kind=d.get('kind'),
                    interior_role=role, branding=d.get('branding'), story=d.get('story'),
                    text_pending=dict(npcs=npcs, signs=signs, interact_spots=CARRY_SPOTS.get(nm, []),
                                      note=('Real, placed NPCs/signs/spots, kept out of npcs/signs/interact_spots until Text Bot adds maps.' + nm + '.* keys '
                                            '(its validator requires those ids to have text). text_ref = the interiors worker key; text_was = the old Text Bot key the line moved from. '
                                            'Engine: treat them exactly like npcs/signs/interact_spots.')))
        if nm in UNIQUE: soul['unique_reason'] = UNIQUE[nm]
        if d.get('locked_warps'):
            soul['locked_warps'] = [dict(lw, unlock_flag=STAFF_FLAG, note=lw['note'].replace('rt_backroom_open', STAFF_FLAG) + f' | flag {STAFF_FLAG} (Gary, Oct 22; overrides INTERIORS.md rt_backroom_open)')
                                    for lw in d['locked_warps']]
        m.soul = {k: v for k, v in soul.items() if v is not None}
        m.pre = (G, D, O, C, E); m.source = soul['source']
        out.append(m)
    return out

def _exit_mats(m):
    inner = set(IMPORT)
    return sorted([w for w in m.warps if w['to'] not in inner], key=lambda w: (w['y'], w['x']))
def _arrival(m):   # arrival cell = one above the first exit mat
    w = _exit_mats(m)[0]; return w['x'], w['y'] - 1

def hookup(maps):
    """Re-points exterior doors, assigns shared designs + recolours, and writes both directions. Returns the door table."""
    M = {m.name: m for m in maps}; rows = []
    for ai, area in enumerate(AREAS):
        ext = M[area]
        pool_doors = sorted([w for w in ext.warps if w['to'] == '@home_pool'], key=lambda w: (w['y'], w['x']))
        used = {h['id']: [] for h in HOME_POOL}; prev = None
        for k, w in enumerate(pool_doors):
            h = HOME_POOL[(ai + k) % 4]; im = M[h['map']]; ax, ay = _arrival(im)
            order = SCHEME_ORDER[(ai * 3 + k) % len(SCHEME_ORDER):] + SCHEME_ORDER[:(ai * 3 + k) % len(SCHEME_ORDER)]
            sc = next((s for s in order if s not in used[h['id']] and s != prev), order[0])
            used[h['id']].append(sc); prev = sc
            rid = scheme_id(h['id'], sc)
            w.update(to=h['map'], tx=ax, ty=ay, recolour=rid, scheme=sc, design=h['id'],
                     note=f"shared home design {h['id']} ({h['map']}), rotation slot {k} in {area}; recolour scheme '{rid}' ({sc} tuned for {h['id']}, home_recolours.json)")
    for m in maps:
        if m.name not in IMPORT: continue
        doors = [(e.name, w) for e in maps if e.name in EXTERIOR_TOWNS for w in e.warps if w['to'] == m.name]
        mats = _exit_mats(m)
        if not mats: continue
        shared = m.name == CHAINS['heal'] or any(h['map'] == m.name for h in HOME_POOL)
        if shared or not doors:
            for w in mats: w.update(to='$return', tx=None, ty=None, note=('shared interior: $return = back out of the door you came in by, one tile below it, facing down'
                                                                          if shared else 'spare: no exterior door yet ($return)'))
            m.soul['entered_from'] = [dict(map=en, door=[w['x'], w['y']], arrival=[w['tx'], w['ty']], return_to=[w['x'], w['y'] + 1], recolour=w.get('recolour', 'identity'))
                                      for en, w in doors]
        else:
            assert len(doors) == 1, (m.name, doors)
            en, dw = doors[0]; x0 = mats[0]['x']
            for w in mats:   # exit-offset rule: mat i -> door x + (i - first mat), one row below the door (check() verifies it is walkable)
                w.update(to=en, tx=dw['x'] + (w['x'] - x0), ty=dw['y'] + 1, facing='down', note=f"exit to {en} door ({dw['x']},{dw['y']})")
                w.pop('pair_with', None)
            m.soul['entered_from'] = [dict(map=en, door=[dw['x'], dw['y']], arrival=[dw['tx'], dw['ty']])]
        for w in m.warps: w.setdefault('note', '')
    for e in maps:
        if e.name not in EXTERIOR_TOWNS: continue
        for w in e.warps:
            tgt = M.get(w['to'])
            kind = ('home (shared ' + w['design'] + ')' if w.get('design') else 'heal (shared chain)' if w['to'] == CHAINS['heal'] else 'mart (shared chain)' if w['to'] == CHAINS['mart']
                    else 'unique' if w['to'] in UNIQUE else 'other')
            back = [b for b in (tgt.warps if tgt else []) if b['to'] in (e.name, '$return')]
            rows.append(dict(exterior=e.name, door=[w['x'], w['y']], to=w['to'], arrival=[w['tx'], w['ty']], kind=kind, recolour=w.get('recolour'), scheme=w.get('scheme'),
                             back=sorted({('$return' if b['to'] == '$return' else f"{b['to']} ({b['tx']},{b['ty']})") for b in back}),
                             why=UNIQUE.get(w['to'], '')))
    return rows

# ---------------- checks ----------------
def check(res, MAPNAMES, rows):
    P, N = [], []
    import progression
    Cof = lambda n: res[n][4]
    walk = lambda n, x, y: 0 <= y < len(Cof(n)) and 0 <= x < len(Cof(n)[0]) and Cof(n)[y][x] in (0, 7)
    for r in rows:   # both directions
        en, (dx, dy), to = r['exterior'], r['door'], r['to']
        if to not in res: continue
        tm = res[to][0]
        if Cof(en)[dy][dx] != 4: P.append(f'{en}: door ({dx},{dy}) is not a door tile')
        if to in RETIRED: P.append(f'{en}: door ({dx},{dy}) still warps to retired {to}')
        if not walk(to, *r['arrival']): P.append(f'{to}: arrival {r["arrival"]} from {en} ({dx},{dy}) not walkable')
        for w in tm.warps:
            if w['to'] == '$return' and not walk(en, dx, dy + 1): P.append(f'{to}: $return from {en} ({dx},{dy}) lands on blocked ({dx},{dy + 1})')
            if w['to'] == en and (w['ty'] != dy + 1 or abs(w['tx'] - dx) > 1 or not walk(en, w['tx'], w['ty'])):
                P.append(f'{to}: exit ({w["x"]},{w["y"]}) -> {en} ({w["tx"]},{w["ty"]}) breaks the exit-offset rule for door ({dx},{dy})')
    for m, *_ in res.values():
        for w in m.warps:
            if w['to'] in RETIRED: P.append(f'{m.name}: warp to retired {w["to"]}')
            if w['to'] == '@home_pool': P.append(f'{m.name}: unassigned @home_pool door ({w["x"]},{w["y"]})')
        s = getattr(m, 'soul', None) or {}
        for lw in s.get('locked_warps', []):
            if lw['unlock_flag'] != STAFF_FLAG: P.append(f'{m.name}: staff door flag {lw["unlock_flag"]}')
            if not walk(m.name, *lw['approach']): P.append(f'{m.name}: staff door approach {lw["approach"]} blocked')
            if not walk(lw['to'], lw['tx'], lw['ty']): P.append(f'{m.name}: staff door lands on blocked {lw["to"]} ({lw["tx"]},{lw["ty"]})')
            back = [w for w in res[lw['to']][0].warps if w['to'] == '$return']
            if not back: P.append(f'{lw["to"]}: no $return back to the staff door')
            G, D, O, C, E = res[m.name][1:]
            reach = __import__('build').bfs(m, C, (_exit_mats(m)[0]['x'], _exit_mats(m)[0]['y']))
            if tuple(lw['approach']) not in reach: P.append(f'{m.name}: staff door approach unreachable from the entrance')
            N.append(f'{m.name}: staff door ({lw["x"]},{lw["y"]}) -> {lw["to"]} ({lw["tx"]},{lw["ty"]}) locked by {lw["unlock_flag"]}; approach {lw["approach"]} reachable; back room $return -> approach')
        tp = s.get('text_pending', {})
        for sp in tp.get('interact_spots', []):
            sx, sy = sp['stand']; dxy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}[sp['face']]
            dn = m.deco[sp['y']][sp['x']] or ''
            if not walk(m.name, sx, sy): P.append(f'{m.name}: carried spot {sp["id"]} stand {sp["stand"]} blocked')
            if sp.get('kind') == 'trigger':
                if (sx, sy) != (sp['x'], sp['y']): P.append(f'{m.name}: carried trigger {sp["id"]} stand != x,y')
            elif (sx + dxy[0], sy + dxy[1]) != (sp['x'], sp['y']): P.append(f'{m.name}: carried spot {sp["id"]} facing misses')
            if not dn.startswith(sp['tile']): P.append(f'{m.name}: carried spot {sp["id"]} expects {sp["tile"]}* found {dn or "nothing"}')
        for n in tp.get('npcs', []):
            if not walk(m.name, n['x'], n['y']) and Cof(m.name)[n['y']][n['x']] != 1: P.append(f'{m.name}: npc {n["id"]} on odd cell')
    # rotation: every group of 4 consecutive pool doors in an area uses 4 different designs; neighbours never repeat design or colour
    for area in AREAS:
        ds = [r for r in rows if r['exterior'] == area and r['kind'].startswith('home (shared')]
        for i in range(len(ds)):
            grp = ds[i:i + 4]
            if len({r['to'] for r in grp}) != len(grp): P.append(f'{area}: shared designs repeat within a group of 4 at {grp[0]["door"]}')
            if i and ds[i]['scheme'] == ds[i - 1]['scheme']: P.append(f'{area}: neighbouring doors share recolour at {ds[i]["door"]}')
        seen = {}
        for r in ds:
            k = (r['to'], r['scheme'])
            if k in seen: P.append(f'{area}: design {r["to"]} uses scheme {r["recolour"]} twice ({seen[k]} and {r["door"]})')
            seen[k] = r['door']
    return P, N

# ---------------- per-door recolours (format: Coder, Oct 22 2026; draw order recolour -> time-of-day grade) ----------------
FAMILIES = {   # recolourable ramps (source colours, any order: sorted light -> dark when mapped). Disjoint; glass (c6ecfa/7ac2e8), whites, brass, outline never listed.
    'paper': ['f8eabe', 'ecdec4', 'e8ce92', 'ccaa6e'],                       # cream wallpaper / light rugs / sheets
    'wood':  ['deb478', 'ba8856', '92623e', '87604d', '6a442e', '462c22', '2c1a12'],
    'red':   ['f08868', 'd05440', 'a23432', '6e222a', '561c0e'],            # red rugs, bedding, cushions
    'green': ['a6d460', '52983a', '54864e', '367634', '38683e', '24522e'],  # green bedding / dado
    'teal':  ['70cab8', '3e9c92', '246e6c', '244e34', '18382c'],            # teal walls, rugs, upholstery
    'blue':  ['4692ce', '4a70ba', '2c64a8', '30488c', '1e4078'],            # blue dado / bedding (glass pixels masked out)
}
RAMPS = {   # destination ramps, palette.hex only
    'sage':   ['a6d460', '78ba48', '54864e', '52983a', '367634', '38683e', '24522e', '244e34', '18382c'],
    'rose':   ['f6a0ba', 'daa2ba', 'd2608c', 'a23432', '6e222a', '54444e', '2c2320'],
    'ochre':  ['fcd668', 'eea23c', 'e29d40', 'd46616', 'c46e2e', '9f4013', '6a3019', '561c0e'],
    'slate':  ['ccc6c2', 'a8a0a4', '827a84', '5e5866', '54444e', '3e3a48', '29252b'],
    'teal':   ['c6ecfa', '70cab8', '3e9c92', '246e6c', '244e34', '18382c'],
    'sky':    ['c6ecfa', '7ac2e8', '4692ce', '4a70ba', '2c64a8', '30488c', '1e4078'],
    'walnut': ['ba8856', '92623e', '87604d', '6a442e', '462c22', '2c1a12', '191210'],   # every wood shade one step darker
    'ash':    ['ccc6c2', 'a8a0a4', '827a84', '5e5866', '54444e', '3e3a48', '29252b'],   # grey-washed wood
    # 4-shade wallpaper ramps (paper family has 4 shades: stripes/patterns stay readable)
    'sage_paper':  ['a6d460', '78ba48', '52983a', '367634'], 'rose_paper': ['f6a0ba', 'daa2ba', 'd2608c', 'a23432'],
    'ochre_paper': ['fcd668', 'eea23c', 'e29d40', 'd46616'], 'slate_paper': ['ccc6c2', 'a8a0a4', '827a84', '5e5866'],
    'teal_paper':  ['c6ecfa', '70cab8', '3e9c92', '246e6c'], 'sky_paper': ['c6ecfa', '7ac2e8', '4692ce', '4a70ba'],
}
SCHEMES = {   # scheme -> family -> destination ramp (missing family = unchanged)
    'sage':  dict(label='Sage',  paper='sage_paper', red='ochre', teal='sage', blue='ochre'),
    'rose':  dict(label='Rose',  paper='rose_paper', red='teal', green='rose', teal='rose', blue='teal'),
    'ochre': dict(label='Ochre', paper='ochre_paper', red='sky', green='ochre', teal='ochre', blue='sky', wood='walnut'),
    'slate': dict(label='Slate', paper='slate_paper', red='sky', green='sky', teal='slate', blue='rose', wood='ash'),
    'teal':  dict(label='Teal',  paper='teal_paper', red='ochre', green='teal', teal='sky', blue='teal'),
    'sky':   dict(label='Sky',   paper='sky_paper', red='sky', green='sky', teal='sky', blue='ochre', wood='walnut'),
}
SCHEME_ORDER = ['identity', 'sage', 'rose', 'ochre', 'slate', 'teal', 'sky']   # no violet scheme: violet is the crystal accent and glows at night
GROUPS = [   # (group, name regex, families allowed in that tile). Floors and walls only: furniture keeps its own colours
    # (GAME_QUALITY_CHECKLIST "Furniture never shares colour codes with the floor or walls"; each design's schemes avoid its furniture colours)
    ('window_wall', r'i_wall_upper_win_', None), ('wall', r'i_wall_(upper|face|top)_', None), ('floor', r'i_floor_(oak|pine|parquet|drift)', None),
]
NEVER = r'i_(bookcase|tv|pc|radio|mat|stairs|walldoor|fireplace|kitchen|plant|lamp|window|globe|anchor|net|ship|barrel|salt_jars|fishing|river_stones|log_stool)'

def _lum(h): r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4)); return 0.299 * r + 0.587 * g + 0.114 * b
def glow_colours():
    """colours the night grade keeps lit (warm lights + violet crystal accent): a recolour may never turn a non-glowing colour into one of these."""
    n = json.load(open(os.path.join(OUT, 'time_of_day', 'grades.json')))['grades']['night']; g = n.get('lit', n)['map']  # lit table (emissive pixels)
    return {s for s, d in g.items() if _lum(s) > 40 and _lum(d) / _lum(s) > 0.8}
GLOW = glow_colours()
def ramp_map(src, dst, avoid=(), present=None):
    """monotonic light->dark mapping (DP): nearest luminance, distinct shades preferred, never introduces a night-glow colour,
    never lands a shade that is drawn (present) on a colour in avoid (the design's furniture colours)."""
    s = sorted(src, key=_lum, reverse=True); d = sorted(dst, key=_lum, reverse=True); n, m = len(s), len(d); INF = 1e9
    present = set(src) if present is None else set(present); avoid = set(avoid)
    if n == m and not any(b in avoid and a in present for a, b in zip(s, d)):   # hand-built ramp of the same length: straight rank shift, every shade kept distinct
        assert not any(b in GLOW and a not in GLOW for a, b in zip(s, d)), (src, dst)
        return dict(zip(s, d))
    cost = lambda i, j: (INF if (d[j] in GLOW and s[i] not in GLOW) or (d[j] in avoid and s[i] in present) else abs(_lum(s[i]) - _lum(d[j])))
    best = [[INF] * m for _ in range(n)]; prev = [[None] * m for _ in range(n)]
    for j in range(m): best[0][j] = cost(0, j)
    for i in range(1, n):
        for j in range(m):
            c = cost(i, j)
            for k in range(j + 1):
                v = best[i - 1][k] + c + (45 if k == j else 0)   # merging two shades costs more than a modest luminance shift: keeps shading
                if v < best[i][j]: best[i][j] = v; prev[i][j] = k
    j = min(range(m), key=lambda j: best[n - 1][j])
    if best[n - 1][j] >= INF:   # infeasible on the hand ramp: widen it with the nearest palette.hex colours (by CIELAB distance to the ramp)
        assert len(dst) < 40, ('no feasible ramp', src, dst)
        return ramp_map(src, list(dst) + _near_palette(dst, 3, avoid), avoid, present)
    out = [0] * n
    for i in range(n - 1, -1, -1): out[i] = j; j = prev[i][j] if i else j
    return {s[i]: d[out[i]] for i in range(n)}
_PAL = None
def _near_palette(dst, k, avoid=()):
    """k palette.hex colours closest (CIELAB) to the ramp, excluding the ramp itself."""
    global _PAL
    import furniture_fix as FF
    if _PAL is None: _PAL = {h: FF._lab(h) for h in (l.strip().lower() for l in open(os.path.join(OUT, 'palette.hex'))) if h}
    import numpy as np
    cand = [h for h in _PAL if h not in dst and h not in avoid]
    cand.sort(key=lambda h: min(float(np.linalg.norm(_PAL[h] - _PAL[d])) for d in dst if d in _PAL))
    return cand[:k]
def scheme_id(design, sc): return 'identity' if sc == 'identity' else f'{design.lower()}_{sc}'
def base_scheme(sid): return sid if sid in ('identity', None) else sid.split('_', 1)[1]
def design_colours(h):
    """(surface colours, furniture colours) drawn on a design (+ upstairs), classified like tools/furniture_colours.py."""
    import numpy as np, furniture_colours as FC
    S, F = set(), set()
    for nm in [h['map']] + SUB_FLOORS.get(h['map'], []):
        L = _load(nm)['layers']
        for i in {v for k in ('ground', 'decoration', 'overlay') for r in L[k] for v in r if v}:
            e = IBYID[i]; c = FC.cls(e)
            if not c: continue
            a = np.array(tile_img(e['name'])); op = a[..., 3] == 255
            hx = {'%02x%02x%02x' % tuple(p[:3]) for p in a[op]}
            (F if c == 'furniture' else S).update(hx)
    return S, F
def scheme_maps():
    """one map per (design, scheme): the same family ramps for every design, each tuned so no wall/floor shade lands on that design's furniture."""
    out = {'identity': dict(label='Identity (original colours)', map={})}
    for h in HOME_POOL:
        S, F = design_colours(h)
        for sid, sp in SCHEMES.items():
            mp = {}
            for fam, ramp in sp.items():
                if fam == 'label': continue
                mp.update({'#' + a: '#' + b for a, b in ramp_map(FAMILIES[fam], RAMPS[ramp], avoid=F, present=S).items()})
            out[scheme_id(h['id'], sid)] = dict(label=f"{sp['label']} ({h['id']})", scheme=sid, design=h['id'], map=dict(sorted(mp.items())))
    return out

def _design_tiles():
    names = set()
    for h in HOME_POOL:
        for nm in [h['map']] + SUB_FLOORS.get(h['map'], []):
            L = _load(nm)['layers']
            for k in ('ground', 'decoration', 'overlay'):
                for r in L[k]:
                    for v in r:
                        if v: names.add(IBYID[v]['name'])
    return sorted(names)
def recolourable():
    """-> {name: (group, mask ndarray bool or None)}"""
    import numpy as np
    allfam = {c for v in FAMILIES.values() for c in v}
    res = {}
    for n in _design_tiles():
        if re.match(NEVER, n): continue
        g = next(((gn, fams) for gn, rx, fams in GROUPS if re.match(rx, n)), None)
        if not g: continue
        gn, fams = g; fams = fams or list(FAMILIES)
        a = np.array(tile_img(n)); op = a[..., 3] == 255
        hexs = np.vectorize(lambda r, g_, b: '%02x%02x%02x' % (r, g_, b))(a[..., 0], a[..., 1], a[..., 2])
        mapped = op & np.isin(hexs, list(allfam)); want = op & np.isin(hexs, [c for f in fams for c in FAMILIES[f]])
        if gn == 'window_wall':   # wallpaper part only: pixels identical to the plain wall tile; glass, frame, sill and curtains stay
            plain = np.array(tile_img(n.replace('_win_', '_')))
            want &= np.all(a == plain, axis=-1)
        if not want.any(): continue
        res[n] = (gn, None if (want == mapped).all() else want)
    return res

STAGE = os.path.join(OUT, 'interiors_new')   # interiors_new/ handed to the overworld owner (Oct 22 2026): written in place (old staging copy: qa/interiors_hookup/interiors_new_staging)
def write_recolours(rows):
    import numpy as np
    from PIL import Image
    os.makedirs(os.path.join(STAGE, 'masks'), exist_ok=True)
    rc = recolourable(); sch = scheme_maps(); listed = {}
    import glob
    for f in glob.glob(os.path.join(STAGE, 'masks', '*.png')): os.remove(f)   # masks are regenerated: no stale furniture masks
    for n, (g, mk) in rc.items():
        mp = None
        if mk is not None:
            mp = f'masks/{n}.png'; Image.fromarray((mk * 255).astype(np.uint8), 'L').save(os.path.join(STAGE, mp))
        listed[n] = dict(id=IBYNAME[n]['id'], mask=mp)
    doc = dict(status='DRAFT', version='0.2.0 (2026-10-22)', palette='art/world/overworld/palette.hex',
               note=('Per-door recolour of the 4 shared home designs: walls and floors only. Exact palette swap at draw time, BEFORE the time-of-day grade. '
                     'Door warps carry "recolour": "<schemeId>" (design-specific, e.g. "h2_rose"; missing or "identity" = no change). '
                     'Each design has its own copy of the 6 schemes (same ramps), tuned so no wall/floor shade lands on that design\'s furniture colours '
                     '(GAME_QUALITY_CHECKLIST: Furniture never shares colour codes with the floor or walls). Tiles not in "recolourable" are never touched '
                     '(furniture, windows, NPCs, props incl. Text Bot prop tiles, doors/mats, lights, plants, appliances). Generated by tools/interiors_merge.py.'),
               schemes=sch, recolourable=dict(sorted(listed.items())),
               doors=[dict(map=r['exterior'], door=r['door'], interior=r['to'], design=next((h['id'] for h in HOME_POOL if h['map'] == r['to']), None), recolour=r['recolour'], scheme=r.get('scheme'))
                      for r in rows if r.get('recolour')])
    json.dump(doc, open(os.path.join(STAGE, 'home_recolours.json'), 'w'), indent=1)
    return doc, rc

def check_recolours(doc, rc, rows):
    """Coder's 4 checks + ramp completeness + grade coverage."""
    import numpy as np
    from PIL import Image
    P = []; pal = {l.strip().lower() for l in open(os.path.join(OUT, 'palette.hex')) if l.strip()}
    grades = json.load(open(os.path.join(OUT, 'time_of_day', 'grades.json')))['grades']
    for sid, s in doc['schemes'].items():
        for a, b in s['map'].items():
            for c in (a, b):
                if not re.fullmatch(r'#[0-9a-f]{6}', c) or c[1:] not in pal: P.append(f'scheme {sid}: {c} not lowercase palette.hex')
            for g, gd in grades.items():
                if b[1:] not in gd['map']: P.append(f'scheme {sid}: {b} has no {g} grade entry')
            if b[1:] in GLOW and a[1:] not in GLOW: P.append(f'scheme {sid}: {a} -> {b} makes a surface glow at night')
        for fam, ramp in SCHEMES.get(base_scheme(sid), {}).items():   # every shade of a shifted ramp is mapped, light->dark order kept
            if fam == 'label': continue
            src = sorted(FAMILIES[fam], key=_lum, reverse=True); dst = [s['map'].get('#' + c) for c in src]
            if None in dst: P.append(f'scheme {sid}: family {fam} has an unmapped shade')
            elif any(_lum(dst[i][1:]) < _lum(dst[i + 1][1:]) for i in range(len(dst) - 1)): P.append(f'scheme {sid}: family {fam} order flips')
    if doc['schemes']['identity']['map']: P.append('identity scheme not empty')
    keys = {k[1:] for s in doc['schemes'].values() for k in s['map']}
    allfam = {c for v in FAMILIES.values() for c in v}
    for n, e in doc['recolourable'].items():
        a = np.array(tile_img(n)); op = a[..., 3] == 255
        hexs = np.vectorize(lambda r, g_, b: '%02x%02x%02x' % (r, g_, b))(a[..., 0], a[..., 1], a[..., 2])
        if e['id'] != IBYNAME[n]['id']: P.append(f'{n}: wrong id')
        if re.match(NEVER, n): P.append(f'{n}: never-recolour tile listed')
        # independent definition of "fixed detail": colours of families the group may not touch, and (window walls) anything that differs from the plain wall
        gn, rx, fams = next(g for g in GROUPS if re.match(g[1], n)); fams = fams or list(FAMILIES)
        fixed = op & ~np.isin(hexs, [c for f in fams for c in FAMILIES[f]])
        if gn == 'window_wall': fixed |= op & ~np.all(a == np.array(tile_img(n.replace('_win_', '_'))), axis=-1)
        if e['mask']:
            mk = Image.open(os.path.join(STAGE, e['mask']))
            if mk.mode != 'L' or mk.size != (64, 64): P.append(f'{n}: mask must be 8-bit L at native 64x64, got {mk.mode} {mk.size}')
            m = np.array(mk)
            if not set(np.unique(m).tolist()) <= {0, 255}: P.append(f'{n}: mask values other than 0/255')
            region = m == 255
        else: region = np.ones(op.shape, bool)
        bad = sorted(set(hexs[fixed & region & np.isin(hexs, list(keys))].tolist()))
        if bad: P.append(f'{n}: fixed detail shares mapped colour(s) {bad} and is not masked out')
    for r in rows:
        if r.get('recolour') and r['recolour'] not in doc['schemes']: P.append(f'door {r["exterior"]} {r["door"]}: unknown scheme {r["recolour"]}')
    return P
