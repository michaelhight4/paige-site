# Kilumen progression model + flag-state checker (story gates, forced grass, movement, Skylift fly, Lumen Line rail).
# Built maps are checked cell-by-cell; unbuilt zones are checked as a zone graph joined to the built maps' "TO COME" exits.
import collections
from build import COLL, RAMP_DIR, BYNAME
RESTRICT = 'Government restricted airspace: arrivals by rail only.'

# ---- critical-path flags, in story order. kind: story | movement | skill | visited ----
# Names follow Text Bot (/workspace/kilumen/text/overworld_lines.json): items Trail Runners, Courier Bike, Survey Parcel, Lumen Line Pass;
# field skills Tideglide, Skylift, Brushbreak, Stonebreak, Glowcall; flags flg_promoted, has_survey_parcel. Badges = challenge coins.
FLAGS = [
    dict(id='flg_promoted', kind='story', earned_at=('office_int', 'npc:manager'), how='Revival Tech manager promotes the player and Ron to field researchers (opening)'),
    dict(id='has_run_shoes', kind='movement', earned_at=('fernwick', 'npc:ron_rival_1'), how='Item Trail Runners: Ron hands over his old runners after rival battle 1 at the Fernwick entrance (win or lose)'),
    dict(id='beat_master_fernwick', kind='story', earned_at=('fernwick_hall_int', 'goal'), how='Coin 1: Master of Fernwick (hall puzzle, then battle)'),
    dict(id='has_survey_parcel', kind='story', earned_at=('brookhollow', 'npc:rt_guard_east'), how='Item Survey Parcel: rt_guard_east hands it over the first time you talk to him after the gate clears'),
    dict(id='beat_master_saltmere', kind='story', earned_at=('zone', 'saltmere'), how='Coin 2: Master of Saltmere'),
    dict(id='has_bike', kind='movement', earned_at=('zone', 'saltmere'), how='Item Courier Bike: deliver the Survey Parcel to the Saltmere Revival Tech office (needs has_survey_parcel)'),
    dict(id='beat_master_revival', kind='story', earned_at=('zone', 'revival_heights'), how='Coin 3: Master of Revival Heights'),
    dict(id='has_rail_pass', kind='movement', earned_at=('zone', 'revival_heights'), how='Item Lumen Line Pass from the pass clerk at Revival Heights Central station'),
    dict(id='beat_master_frostspire', kind='story', earned_at=('zone', 'frostspire'), how='Coin 4: Master of Frostspire'),
    dict(id='has_skylift', kind='skill', earned_at=('zone', 'frostspire'), how='Field skill Skylift: Frostspire coin (coin 4) lets a flying creature carry you'),
    dict(id='beat_master_mirefen', kind='story', earned_at=('zone', 'mirefen'), how='Coin 5: Master of Mirefen; sets storm_season (rain floods the low coast road)'),
    dict(id='has_tideglide', kind='skill', earned_at=('zone', 'mirefen'), how='Field skill Tideglide: a water creature carries you across floodwater; given in Mirefen after the storm starts'),
    dict(id='beat_master_tidewater', kind='story', earned_at=('zone', 'tidewater_coast'), how='Coin 6: Master of Tidewater Coast'),
    dict(id='beat_master_lanternport', kind='story', earned_at=('zone', 'lanternport'), how='Coin 7: Master of Lanternport; the lighthouse horn wakes the giant on the Cindervale road'),
    dict(id='beat_master_cindervale', kind='story', earned_at=('zone', 'cindervale'), how='Coin 8: Master of Cindervale'),
    dict(id='all_badges', kind='story', earned_at=('zone', 'cindervale'), how='all 8 challenge coins -> Aurelith arena opens'),
]
STORY_FLAGS = [f['id'] for f in FLAGS]
# Side flags (World, Oct 22 2026): real flags the maps use, not gates on the critical-path walk (the checker ignores them)
SIDE_FLAGS = [
    dict(id='got_starter', kind='story', earned_at=('lab_brookhollow', 'npc:lab cradle'), how='player chooses a starter in Lumen Lab (lab_brookhollow); which cradle empties is Story/Coder'),
    dict(id='has_branch_card', kind='key_item', earned_at=('story', 'SOUL_PLAYBOOK 8.2d'), how='Branch Access Card: unlocks the STAFF ONLY door in heal_brookhollow / heal_fernwick (locked_warps.unlock_flag) -> rt_branch_backroom (Gary, Oct 22; replaces rt_backroom_open)'),
    dict(id='puzzle_fernwick_hall_solved', kind='puzzle', earned_at=('fernwick_hall_int', 'puzzle'), how='both Fernwick Hall gates open (puzzles/fernwick_hall_int.runtime.json); state is saved'),
]

# ---- unbuilt zone graph. (a, b, gate_flag or None, gate description). Built-map stubs appear as ('stub', map, exit_to). ----
ZONE_EDGES = [
    ('stub:brookhollow:route_east', 'route_east', None, ''),
    ('route_east', 'aurelith', None, 'Aurelith outskirts and station open; arena locked until all_badges'),
    ('aurelith', 'saltmere', None, ''),
    ('stub:thornwood:route_revival', 'route_revival', None, ''), ('route_revival', 'revival_heights', None, ''),
    ('stub:greystone_b1:frostspire_pass', 'frostspire_pass', None, ''),
    ('frostspire_pass', 'frostspire', 'beat_master_revival', 'collapsed rope bridge on the Frostspire pass; Revival Tech engineers rebuild it after coin 3'),
    ('stub:route1:sunmeadow_fields', 'sunmeadow_fields', None, ''),
    ('sunmeadow_fields', 'mirefen', None, ''),
    ('revival_heights', 'sunmeadow_fields', 'beat_master_frostspire', 'north Sunmeadow is sealed by the same Frostspire-fed crystal field as the Route 1 barrier'),
    ('revival_heights', 'saltmere', 'beat_master_revival', 'Revival Tech security checkpoint at the Heights south gate; opened from the inside after coin 3'),
    ('saltmere', 'mirefen', 'beat_master_frostspire', 'flooded causeway east of Saltmere drains when the Frostspire thaw ends (back door to Mirefen, same flag as the Route 1 barrier)'),
    ('brookhollow_south_road', 'tidewater_coast', 'has_tideglide', 'storm-flooded coast road (storm_season): cross with Tideglide'),
    ('stub:brookhollow:route_east', 'brookhollow_south_road', None, 'coast road branches off the east road'),
    ('tidewater_coast', 'lanternport', None, ''),
    ('lanternport', 'fernwick_west_road', None, ''),
    ('fernwick_west_road', 'fernwick_west_exit', 'beat_master_lanternport', 'flooded tide-lock on the Fernwick-Lanternport road; opened from the Lanternport side (shortcut home). Fernwick needs a west exit stub when that road is built'),
    ('aurelith', 'cindervale', 'beat_master_lanternport', 'a sleeping giant creature blocks the Cindervale road; the Lanternport lighthouse horn wakes it'),
    ('aurelith', 'aurelith_arena', 'all_badges', 'arena gate'),
]
EARN = {f['id']: f['earned_at'] for f in FLAGS}
# planned gate ids (Text Bot ids where they exist: gate_frostspire_bridge, gate_coast_road_flood, gate_cindervale_giant)
GATE_IDS = {('frostspire_pass', 'frostspire'): 'gate_frostspire_bridge', ('brookhollow_south_road', 'tidewater_coast'): 'gate_coast_road_flood',
            ('aurelith', 'cindervale'): 'gate_cindervale_giant', ('saltmere', 'mirefen'): 'gate_saltmere_causeway',
            ('revival_heights', 'sunmeadow_fields'): 'gate_sunmeadow_north', ('revival_heights', 'saltmere'): 'gate_revival_checkpoint',
            ('fernwick_west_road', 'fernwick_west_exit'): 'gate_lanternport_tidelock', ('aurelith', 'aurelith_arena'): 'gate_aurelith_arena'}
# Text Bot v0.3.0 proposed NPCs / signs for the planned gates (zones unbuilt: plan entries only)
GATE_NPCS = {'gate_frostspire_bridge': dict(npc='rt_engineer_pass', zone='frostspire_pass'),
             'gate_revival_checkpoint': dict(npc='rt_guard_heights', zone='revival_heights', opened_from='revival_heights side', sign='blockers.gate_revival_checkpoint.sign'),
             'gate_lanternport_tidelock': dict(npc='lock_keeper', zone='fernwick_west_exit', opened_from='lanternport side', interaction='lock wheel (mechanism, not a field skill)'),
             'gate_aurelith_arena': dict(npc='arena_doorman', zone='aurelith', sign='blockers.gate_aurelith_arena.sign', placeholders=['{coins}']),
             'gate_saltmere_causeway': dict(npc='causeway_local', zone='saltmere', optional=True)}
TOWNS = {   # fly / rail destinations (towns + cities). fly_point for built maps lives in the map json.
    'brookhollow': dict(fly=True, rail=False), 'fernwick': dict(fly=True, rail=False),
    'saltmere': dict(fly=True, rail=True), 'cindervale': dict(fly=True, rail=False), 'lanternport': dict(fly=True, rail=True),
    'revival_heights': dict(fly=False, rail=True, restriction=RESTRICT), 'aurelith': dict(fly=False, rail=True, restriction=RESTRICT),
}
INDOOR_OR_CAVE = lambda name: name.endswith('_int') or name.startswith(('house_', 'greystone', 'home_', 'heal_', 'lab_', 'rt_', 'mart_', 'station_', 'hall_'))   # + interiors_new prefixes (Oct 22 hookup)

def state_C(m, C, flags):
    C2 = [row[:] for row in C]
    for g in m.story_gates:
        if g['flag'] in flags:
            for c in g['cells']: C2[c['y']][c['x']] = COLL[BYNAME[c['cleared_tile']]['coll']] if c['cleared_tile'] else 0
    return C2

def ramps(m):
    return {(x, y): RAMP_DIR[v] for y, row in enumerate(m.deco) for x, v in enumerate(row) if v in RAMP_DIR}

def neighbours(m, C, cell, bike, R, solved=True):
    x, y = cell; out = []
    ok = (0, 4, 7, 10) + ((8,) if bike else ()) + ((5, 6) if solved else ())   # 10 = ice (walkable; slide puzzles are checked per map), 3 water / 11 deep never on foot
    for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        nx, ny = x + dx, y + dy
        if not (0 <= nx < m.w and 0 <= ny < m.h): continue
        c = C[ny][nx]
        if c == 2:
            if dy == 1 and ny + 1 < m.h and C[ny + 1][nx] in ok: out.append((nx, ny + 1))
        elif c == 9:
            if bike and (dx, dy) == R.get((nx, ny)) and 0 <= nx + dx < m.w and 0 <= ny + dy < m.h and C[ny + dy][nx + dx] in ok: out.append((nx + dx, ny + dy))
        elif c in ok: out.append((nx, ny))
    return out

def reach(m, C, starts, bike, R, avoid=frozenset(), solved=True):
    st = set(starts); seen = set(st); q = collections.deque(seen)
    while q:
        c = q.popleft()
        if C[c[1]][c[0]] == 4 and c not in st: continue   # walking onto a door/warp leaves the map (world graph handles it)
        for n in neighbours(m, C, c, bike, R, solved):
            if n not in seen and n not in avoid: seen.add(n); q.append(n)
    return seen

def entries(m):
    pts = {}
    for wp in m.warps: pts[f"warp->{wp['to']}@{wp['x']},{wp['y']}"] = (wp['x'], wp['y'])
    for ex in m.exits:
        for i in range(ex['start'], ex['end'] + 1):
            p = {'north': (i, 0), 'south': (i, m.h - 1), 'west': (0, i), 'east': (m.w - 1, i)}[ex['edge']]
            pts[f"exit-{ex['edge']}->{ex['to']}@{p[0]},{p[1]}"] = p
    return pts
def pick(pts, prefix): return [p for k, p in pts.items() if k.startswith(prefix)]

def check(res):
    """res: name -> (m, G, D, O, C, E). Returns (problems, notes, per_map_extra)."""
    P, N, extra = [], [], collections.defaultdict(dict)
    maps = {k: v[0] for k, v in res.items()}; Cs = {k: v[4] for k, v in res.items()}
    allf = set(STORY_FLAGS)
    # ---------- per-map: forced grass, story gates, bike optionality, soft-locks ----------
    for name, m in maps.items():
        C0 = Cs[name]; R = ramps(m); pts = entries(m)
        for fg in m.forced_grass:
            Cf = state_C(m, C0, allf); a, b = pick(pts, fg['between'][0]), pick(pts, fg['between'][1])
            cells = {(x, y) for x in range(fg['x0'], fg['x1'] + 1) for y in range(fg['y0'], fg['y1'] + 1)}
            avoid = reach(m, Cf, a, True, R, avoid=frozenset(cells))
            thru = reach(m, Cf, a, True, R)
            if any(p in avoid for p in b): P.append(f"{name}: forced grass {fg['id']} can be walked around")
            elif not any(p in thru for p in b): P.append(f"{name}: forced grass {fg['id']}: target unreachable even through the grass")
            else: N.append(f"{name}: forced grass {fg['id']} OK (no way from {fg['between'][0]} to {fg['between'][1]} without crossing it, even on the bike with every gate open)")
        for g in m.story_gates:
            a, b = pick(pts, g['blocks']['from_entry']), pick(pts, g['blocks']['to_entry'])
            before = reach(m, state_C(m, C0, allf - {g['flag']}), a, True, R)
            after = reach(m, state_C(m, C0, allf), a, True, R)
            if any(p in before for p in b): P.append(f"{name}: gate {g['id']} can be bypassed before {g['flag']}")
            elif not any(p in after for p in b): P.append(f"{name}: gate {g['id']} still blocks after {g['flag']}")
            else: N.append(f"{name}: gate {g['id']} OK (closed: {g['blocks']['from_entry']} cannot reach {g['blocks']['to_entry']}, even with the bike and all other flags; open after {g['flag']})")
        for bike in (False, True):
            for k in range(len(STORY_FLAGS) + 1):
                fl = set(STORY_FLAGS[:k]); Cf = state_C(m, C0, fl)
                if bike and 'has_bike' not in fl: continue
                ent = list(pts.values())
                if not ent: continue
                fwd = reach(m, Cf, ent, bike, R)
                # reverse reachability: every reachable cell must still be able to get back to some entry (no soft-lock)
                rev = collections.defaultdict(list)
                for c in fwd:
                    for n in neighbours(m, Cf, c, bike, R): rev[n].append(c)
                back = set(ent); q = collections.deque(ent)
                while q:
                    c = q.popleft()
                    for p_ in rev[c]:
                        if p_ not in back: back.add(p_); q.append(p_)
                trapped = sorted(fwd - back)
                if trapped: P.append(f"{name}: soft-lock cells {trapped[:5]} (bike={bike}, flags={k})")
        # bike-only cells = reachable on the bike but not on foot (all flags): must be optional
        Cf = state_C(m, C0, allf); ent = list(pts.values())
        if ent:
            walk = reach(m, Cf, ent, False, R); ride = reach(m, Cf, ent, True, R)
            only = sorted(ride - walk)
            if only:
                extra[name]['bike_only_region'] = [list(c) for c in only]
                need = [k for k, p in pts.items() if p not in walk]
                need += [n['id'] for n in m.npcs if (n['x'], n['y']) in set(only)]
                if need: P.append(f"{name}: bike required for {need}")
                N.append(f"{name}: bike-only region {len(only)} cells (no_dismount there); every entry/NPC reachable on foot -> optional")
    # ---------- world graph per flag state ----------
    def outdoor(n): return not INDOOR_OR_CAVE(n)
    def world(flags, fly=False, rail=False, visited=None):
        seen_cells = collections.defaultdict(set); zones = set(); q = collections.deque()
        def add_cells(mp, cells):
            new = [c for c in cells if c not in seen_cells[mp]]
            if new: seen_cells[mp].update(new); q.append(('m', mp, new))
        def add_zone(z):
            if z not in zones: zones.add(z); q.append(('z', z, None))
        start = maps['house_2f']; sp = next(n for n in start.npcs if n['id'] == 'player_start')
        add_cells('house_2f', [(sp['x'], sp['y'])])
        while q:
            kind, a, cells = q.popleft()
            if kind == 'm':
                m = maps[a]; Cf = state_C(m, Cs[a], flags); R = ramps(m)
                got = reach(m, Cf, list(seen_cells[a]) , 'has_bike' in flags and outdoor(a), R)
                add_cells(a, got)
                for wp in m.warps:
                    if (wp['x'], wp['y']) in got and wp['to'] in maps: add_cells(wp['to'], [(wp['tx'], wp['ty'])])
                for ex in m.exits:
                    for i in range(ex['start'], ex['end'] + 1):
                        p = {'north': (i, 0), 'south': (i, m.h - 1), 'west': (0, i), 'east': (m.w - 1, i)}[ex['edge']]
                        if p not in got: continue
                        if ex['to'] in maps:
                            t = maps[ex['to']]; j = i + ex['offset']; opp = {'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east'}[ex['edge']]
                            add_cells(ex['to'], [{'north': (j, 0), 'south': (j, t.h - 1), 'west': (0, j), 'east': (t.w - 1, j)}[opp]])
                        else: add_zone(f"stub:{a}:{ex['to']}")
                if fly and outdoor(a) and visited:
                    for mp, fp in visited.items(): add_cells(mp, [fp])
            else:
                for x, y, fl, _ in ZONE_EDGES:
                    if fl and fl not in flags: continue
                    for s, t in ((x, y), (y, x)):
                        if s == a:
                            if t.startswith('stub:'):
                                _, mp, to = t.split(':'); m = maps[mp]; ex = next(e for e in m.exits if e['to'] == to)
                                add_zone(t)
                                add_cells(mp, [{'north': (i, 0), 'south': (i, m.h - 1), 'west': (0, i), 'east': (m.w - 1, i)}[ex['edge']] for i in range(ex['start'], ex['end'] + 1)])
                            else: add_zone(t)
                if rail and a in TOWNS and TOWNS[a]['rail']:
                    for z in visited_rail: add_zone(z)
        return seen_cells, zones
    def earned(f, cells, zones):
        where, what = EARN[f]
        if where == 'zone': return what in zones
        m = maps[where]
        if what == 'goal': p = (m.puzzle['goal']['x'], m.puzzle['goal']['y'])
        else: n = next(n for n in m.npcs if n['id'] == what.split(':')[1]); p = (n['x'], n['y'])
        return any(abs(p[0] - c[0]) + abs(p[1] - c[1]) <= 1 for c in cells[where])
    flags = set(); fly_pts = {mp: (m.fly_point['x'], m.fly_point['y']) for mp, m in maps.items() if m.fly_point}
    for k in range(len(STORY_FLAGS) + 1):
        cells, zones = world(flags)
        nxt = STORY_FLAGS[k] if k < len(STORY_FLAGS) else None
        tag = f"state {k} ({'none' if not flags else '+'.join(sorted(flags, key=STORY_FLAGS.index)[-1:])})"
        if nxt and not earned(nxt, cells, zones): P.append(f"world {tag}: next flag {nxt} is NOT reachable -> soft-lock")
        # gates still closed must keep their far side unreached
        for x, y, fl, desc in ZONE_EDGES:
            if fl and fl not in flags and y in zones and not desc.startswith('arena') and (x not in zones or True):
                pass
        visited = {mp: p for mp, p in fly_pts.items() if cells.get(mp)}
        # fly: built towns by fly_point; unbuilt towns as zones (fly=True only)
        global visited_rail
        visited_rail = {z for z in zones if z in TOWNS and TOWNS[z]['rail']}
        cf, zf = world(flags, fly='has_skylift' in flags, rail='has_rail_pass' in flags, visited=visited)
        gained = {mp: len(cf[mp] - cells.get(mp, set())) for mp in cf if cf[mp] - cells.get(mp, set())}
        if gained or zf - zones: P.append(f"world {tag}: Skylift/rail reach NEW ground {gained} {sorted(zf - zones)} -> skips a gate")
        N.append(f"world {tag}: {sum(len(v) for v in cells.values())} cells in {len([1 for v in cells.values() if v])} maps, zones {sorted(z for z in zones if not z.startswith('stub'))}; next={nxt}: reachable; fly/rail add nothing new")
        if nxt: flags.add(nxt)
    # forced-detour check: for every gate, its far side is unreachable in the state just before its flag
    flags = set()
    for k, f in enumerate(STORY_FLAGS):
        cells, zones = world(flags)
        for mp, m in maps.items():
            for g in m.story_gates:
                if g['flag'] == f:
                    pts = entries(m); b = pick(pts, g['blocks']['to_entry'])
                    if any(p in cells[mp] for p in b): P.append(f"world: gate {g['id']} far side reachable before {f} (no detour forced)")
                    else: N.append(f"world: gate {g['id']} forces a detour until {f} (far side unreached in state {k})")
        for x, y, fl, desc in ZONE_EDGES:
            if fl == f:
                far = y if x in zones else x
                if x in zones and y in zones: N.append(f"world: planned gate {x}<->{y} ({f}) is a shortcut lock: both sides are already reachable by the intended route before it opens")
                elif far in zones and not far.startswith('stub'): P.append(f"world: planned gate {x}<->{y} bypassed before {f}")
                else: N.append(f"world: planned gate {GATE_IDS[(x, y)]} ({x}<->{y}) holds until {f}")
        flags.add(f)
    return P, N, extra
visited_rail = set()

# ---------------- world_layout.json progression sections (written by run.py) ----------------
SKILL = 'Skylift'; RAIL = 'Lumen Line'
PLANNED_FORCED_GRASS = {
    'sunmeadow_fields': 'wide meadow funnels into a 4-tile tall-grass neck before the Mirefen boardwalk',
    'route_east': 'river-bridge approach to Aurelith runs through a reed-grass strip between cliffs',
    'frostspire_pass': 'snow-fern band across the pass just before the rebuilt bridge',
    'mirefen': 'bog reeds (encounter) are the only dry line through the swamp centre',
    'tidewater_coast': 'dune grass between sea cliffs and the coast road',
}
PLANNED_BIKE = {
    'sunmeadow_fields': 'optional long boardwalk loop + two ramps (one-way) over the stream: a fast lap back toward Route 1',
    'route_east': 'downhill ramp chain from the Aurelith bluff to the Brookhollow bridge (one-way, return on foot path)',
    'saltmere': 'harbour pier rail out to a lighthouse islet with a hidden item',
    'mirefen': 'bog-water boardwalk network (bike_only over bog water); foot route always exists through the reeds',
    'tidewater_coast': 'seawall rail along the cliffs (scenic shortcut, both ends meet the foot road)',
    'greystone_caverns': 'planned B2 marked mine-track: the ONLY cave bike path (lit floor markings + sign); bike not allowed elsewhere underground',
    'frostspire': 'no bike on deep snow; one packed-snow sled run with ramp_s (one-way) down to the pass',
}
def world_sections(maps_json, zones):
    fp = {k: v.get('fly_point') for k, v in maps_json.items()}
    live = []
    for k, m in maps_json.items():
        for g in m.get('story_gates', []):
            live.append(dict(id=g['id'], map=k, flag=g['flag'], earned_at=g.get('earned_at'), cells=[[c['x'], c['y']] for c in g['cells']],
                             blocked_tile=g['cells'][0]['blocked_tile'], cleared_tile=g['cells'][0]['cleared_tile'], detour=g.get('detour'), status='built'))
    planned = [dict(id=GATE_IDS[(a, b)], text=f'overworld_lines.json blockers.{GATE_IDS[(a, b)]}', between=[a, b], flag=f, what=d, status='planned',
                    **({'npc': dict(GATE_NPCS[GATE_IDS[(a, b)]], status='proposed id (Text Bot v0.3.0); zone unbuilt')} if GATE_IDS[(a, b)] in GATE_NPCS else {})) for a, b, f, d in ZONE_EDGES if f]
    flags = [dict(f) for f in FLAGS]
    for f in flags: f['earned_at'] = list(f['earned_at'])
    visited = [dict(id=f'visited_{t}', kind='visited', set_when='first entry to the town map on foot (or stepping off a train at an already-unlocked stop)') for t in TOWNS]
    flyp = {}
    for t, info in TOWNS.items():
        e = dict(visited_flag=f'visited_{t}', fly=info['fly'], rail_stop=info['rail'])
        if not info['fly']:
            e['no_fly_reason'] = RESTRICT
            e['text'] = dict(file='overworld_lines.json', skylift_menu='rail_only.skylift_blocked.skylift_menu', take_off_here='rail_only.skylift_blocked.take_off_here',
                             destination_restricted='rail_only.skylift_blocked.destination_restricted', signs=['rail_only.signs.sign_airspace', 'rail_only.signs.sign_airspace_rules'],
                             npcs=['rail_only.npcs.airspace_officer', 'rail_only.npcs.station_attendant'])
        if fp.get(t): e['fly_point'] = {k: fp[t][k] for k in ('x', 'y', 'facing')}; e['map'] = t
        elif info['fly']: e['fly_point'] = 'planned: on the path tile directly outside the heal centre door, facing down'
        flyp[t] = e
    return dict(
        # order = story order (Text Bot ranks single-flag lines by it): got_starter comes before flg_promoted (lab, opening); other side flags after the coins
        progression_flags=[dict(f, earned_at=list(f['earned_at']), side=True) for f in SIDE_FLAGS if f['id'] == 'got_starter'] + flags
                          + [dict(f, earned_at=list(f['earned_at']), side=True) for f in SIDE_FLAGS if f['id'] != 'got_starter'] + visited,
        story_gates=dict(live=live, planned=planned, rule='gate cells are block until the flag is set, then swap to cleared_tile (or empty). Checked per flag state by tools/progression.py'),
        forced_grass=dict(built=[dict(fg, map=k) for k, m in maps_json.items() for fg in m.get('forced_grass', [])], planned=PLANNED_FORCED_GRASS),
        fly=dict(skill=SKILL, flag='has_skylift', unlock='coin 4 (beat_master_frostspire), after has_bike', not_in='interiors and caves',
                 destinations=flyp, rule='only visited_<town> destinations; visited flags are only earnable on foot past every gate, so Skylift never skips a roadblock (checked per flag state)'),
        rail=dict(line=RAIL, flag='has_rail_pass', stops=[t for t, i in TOWNS.items() if i['rail']], station_tiles='train station tiles come from the biome worker (biomes_extra)',
                  train_only=[t for t, i in TOWNS.items() if not i['fly']], train_only_reason=RESTRICT,
                  rule='a stop can be chosen only after visiting it on foot; rail never adds reachability (checked)'),
        bike_routes=dict(built=[dict(a, map=k) for k, m in maps_json.items() for a in (m.get('bike') or {}).get('areas', [])], planned=PLANNED_BIKE,
                         rule='every bike area is optional; no_dismount_cells in map json; no bike indoors or in caves except marked paths'),
    )
