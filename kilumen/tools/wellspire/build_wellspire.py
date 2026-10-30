#!/usr/bin/env python3
"""Wellspire (region 9) + finale map builder (Coder, Oct 29 2026; design/regions56/story_beats.md §F).
Clones existing, grid-fit-clean maps (same art + collision) into the r9_* / fin_* maps, retargets their warps,
strips the template's people/props, and places new NPCs and interact spots on reachable cells.
Writes art/world/overworld/maps/<name>.json and src/region9/points.gen.js (spot/arrival cells for the runtime).
Re-run safe: output is deterministic. Usage: python3 tools/wellspire/build_wellspire.py"""
import copy, json, os
from collections import deque
import sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'map_audit'))
import map_fill  # map fill / layering recipes (Oct 30 2026)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
WALK = {0, 4, 7, 10}
# warps that become one-way passages (see M.selfdoor); via = where region9 really sends you
SELF = {
    'fin_lab1_now_f1': {'match': [('fin_summit_camp', 17, 4)], 'via': {'map': 'fin_summit_camp', 'x': 17, 'y': 4, 'facing': 'down'}},
    'r9_icefall': {'match': [('r9_switchbacks', 32, 47)], 'via': {'map': 'r9_switchbacks', 'x': 32, 'y': 47, 'facing': 'down'}},
    'fin_past_station_m': {'match': [('fin_past_signal_lab', 8, 10)], 'via': {'map': 'fin_past_signal_lab', 'x': 8, 'y': 10, 'facing': 'up', 'current': True}},
    'fin_past_riverbend': {'all': True, 'via': None},
}
STRIP = ['npcs', 'signs', 'items', 'interact_spots', 'story_gates', 'hall_v2', 'puzzle', 'flag_swaps', 'fly_point', 'text_pending',
         'npcs_pending_text', 'signs_pending_text', 'pending_text_note', 'entered_from', 'interior_role', 'arena_theme', 'source']

TPL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
def load(n):  # templates later reworked in place (map fill, Oct 30 2026) are cloned from their frozen pre-fill copy in ./templates
    f = os.path.join(TPL, n + '.json')
    with open(f if os.path.exists(f) else os.path.join(MAPS, n + '.json')) as f: return json.load(f)

class M:
    def __init__(self, name, tpl, title, region='wellspire'):
        self.j = copy.deepcopy(load(tpl)); self.name = name; self.tpl = tpl
        sg = self.j.get('story_gates') or []
        for k in STRIP: self.j.pop(k, None)
        if sg:  # template gates stay (art + collision as authored) but open on r9_unlocked, which is always set up here
            for g in sg: g.update(id=f"gate_{name}_{g['id']}", flag='r9_unlocked', also=[], npc=None, lines=None, earned_at='Head Office letter (r9_unlocked)')
            self.j['story_gates'] = sg
            self.gates = {(c['x'], c['y']) for g in sg for c in g.get('cells', [])}
        self.j.update(name=name, title=title, npcs=[], signs=[], items=[], interact_spots=[])
        self.j['source'] = f'tools/wellspire/build_wellspire.py (clone of {tpl}; art + collision unchanged)'
        self.j['region'] = region
        self.col = self.j['layers']['collision']; self.w = self.j['width']; self.h = self.j['height']
        self.used = set((w['x'], w['y']) for w in self.j['warps'])
        self.pts = {}
        for e in self.j.get('exits', []): e.pop('ride', None); e.pop('ride_note', None); e.pop('note', None)
        for w in self.j['warps']: w.pop('note', None)
    def c(self, x, y): return self.col[y][x] if 0 <= x < self.w and 0 <= y < self.h else 1
    def walk(self, x, y): return self.c(x, y) in WALK or (x, y) in getattr(self, 'gates', ())
    def reach(self, start):
        seen = {start}; q = deque([start])
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p = (x + dx, y + dy)
                if p not in seen and self.walk(*p) and p not in self.blocked(): seen.add(p); q.append(p)
        return seen
    def blocked(self): return {(n['x'], n['y']) for n in self.j['npcs']}
    def anchor(self):  # a known standable arrival: first warp's own cell or a given point
        return self._anchor
    def warp(self, i, to, tx, ty, facing='up'):
        w = self.j['warps'][i]; w.update(to=to, tx=tx, ty=ty, facing=facing); return w
    def near(self, want, test, base):
        R = self.reach(base); best = None
        for (x, y) in R:
            if (x, y) in self.used or self.c(x, y) != 0 or not test(x, y): continue
            d = (abs(x - want[0]) + abs(y - want[1]), (x, y))
            if best is None or d < best: best = d
        assert best, f'{self.name}: no cell near {want}'
        return best[1]
    def cands(self, want, test, base):
        R = self.reach(base)
        c = [(x, y) for (x, y) in R if (x, y) not in self.used and self.c(x, y) == 0 and test(x, y)]
        return sorted(c, key=lambda p: (abs(p[0] - want[0]) + abs(p[1] - want[1]), p))
    def ok_npc(self, x, y):
        # never next to a warp / exit edge, and keep at least 2 open neighbours so it can't plug a corridor
        if any(abs(x - a) + abs(y - b) <= 1 for (a, b) in self.used): return False
        if x <= 0 or y <= 0 or x >= self.w - 1 or y >= self.h - 1: return False
        n = sum(self.c(x + dx, y + dy) == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        return n >= 3
    def npc(self, nid, want, kind='clerk', facing='down', base=None, **kw):
        base = base or self._anchor
        for (x, y) in self.cands(want, self.ok_npc, base):
            d = {'id': nid, 'x': x, 'y': y, 'facing': facing, 'kind': kind, 'region9': True}; d.update(kw)
            self.j['npcs'].append(d)
            try: self.check()
            except AssertionError: self.j['npcs'].pop(); continue
            self.used.add((x, y)); return d
        raise AssertionError(f'{self.name}: no NPC cell for {nid}')
    def spot(self, sid, want, base=None, **kw):
        """An interact spot on a blocked cell above a reachable stand cell (the player faces up to use it)."""
        base = base or self._anchor
        x, y = self.near(want, lambda x, y: self.c(x, y - 1) in (1, 3, 11) and (x, y - 1) not in self.used and self.ok_spot(x, y) and (x, y) not in self.blocked(), base)
        d = {'id': sid, 'kind': 'prop', 'x': x, 'y': y - 1, 'stand': [x, y], 'face': 'up', 'region9': True}; d.update(kw)
        self.j['interact_spots'].append(d); self.used.add((x, y)); self.used.add((x, y - 1))
        self.pts[sid] = {'x': x, 'y': y, 'facing': 'up'}
        self.check()
        return d
    def prop(self, x, y, tile, code=1):
        """A one-square prop on open floor (decoration layer): blocks (code 1) or a south-only ledge (code 2)."""
        assert self.c(x, y) == 0 and (x, y) not in self.used, f'{self.name}: prop on {(x, y)}'
        self.j['layers']['decoration'][y][x] = tile; self.col[y][x] = code
    def ok_spot(self, x, y): return not any(abs(x - a) + abs(y - b) <= 1 for (a, b) in self.used if self.c(a, b) == 4)
    def check(self):
        """Every warp cell, exit cell and spot stand stays reachable from the anchor with the NPCs placed."""
        R = self.reach(self._anchor)
        for w in self.j['warps']:  # one-way pockets entered through another map's door (map fill, Oct 30 2026)
            if w.get('reached_via'): R |= self.reach(next((w['x'] + dx, w['y'] + dy) for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)) if self.c(w['x'] + dx, w['y'] + dy) == 0))
        need = [(w['x'], w['y']) for w in self.j['warps'] if not w.get('reached_via')] + [tuple(s['stand']) for s in self.j['interact_spots']]
        for p in need: assert p in R or not self.walk(*p), f'{self.name}: {p} cut off'
    def selfdoor(self, via=None):
        # One-way passages (Oct 29 door-warp rule: every door landing sits 1 tile from a door back): the warp lands on its
        # own map, 1 tile from itself; src/region9 sends you on to `via` (or keeps the door shut) at runtime.
        for w in self.j['warps']:
            if (w['to'], w['tx'], w['ty']) in SELF.get(self.name, {}).get('match', ()) or (self.name in SELF and SELF[self.name].get('all')):
                x, y = w['x'], w['y']
                c = next((x + dx, y + dy) for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)) if self.c(x + dx, y + dy) == 0)
                w.update(to=self.name, tx=c[0], ty=c[1], facing='up' if c[1] < y else 'down', via=SELF[self.name]['via'])
    def save(self):
        self.selfdoor()
        for n in self.j['npcs']:
            if self.name == 'fin_summit_camp' and n['id'] in ('fin_teo', 'fin_marta', 'fin_pell', 'fin_imke'): n['inactive_when'] = 'field_team_home'  # home in Lantern Rest after Ending 2
        for w in self.j['warps']:
            if w['to'] in ('fin_lab1_now', 'fin_past_enclosure') and (w['tx'], w['ty']) == (8, 13): w['tx'] = 7  # 1 tile above the (7,14) door
        self.check()
        with open(os.path.join(MAPS, self.name + '.json'), 'w') as f: json.dump(self.j, f, indent=1)
        return self

def tables(m, mapping):
    for z in m.j.get('encounter_zones', []):
        z['table'] = mapping.get(z['table'], mapping.get('*', z['table']))

def build():
    P = {}
    def done(m): m.save(); P[m.name] = m.pts
    # ---------- Entry B: the dry old riverbed (route_east art), Brookhollow -> Cairnfold ----------
    rb = M('r9_old_riverbed', 'route_east', 'Old Riverbed')
    rb.j['exits'] = [e for e in rb.j['exits'] if e['edge'] == 'west']  # west 19-20 -> brookhollow (offset 0, aligned)
    rb._anchor = (1, 19)
    map_fill.apply('r9_old_riverbed', rb.j)
    tables(rb, {'route_east_reeds': 'r9_riverbed_reeds', '*': 'r9_riverbed_grass'})
    rb.spot('r9_riverbed_up', (60, 19))          # the path climbs on toward Cairnfold
    rb.spot('r9_name_sign', (6, 18))
    rb.spot('r9_riverbed_marks', (24, 18))
    rb.npc('r9_rb_hiker', (18, 22), 'trainer', 'left')
    rb.npc('r9_rb_dowser', (36, 21), 'trainer', 'left')
    rb.npc('r9_rb_guide', (50, 20), 'trainer', 'left')
    rb.npc('r9_rb_spotter', (28, 12), 'trainer', 'down')   # up on the old bank
    rb.spot('r9_riverbed_gully', (30, 8))                 # the hidden gully's old flood mark
    P['_arrive_riverbed'] = {'x': 1, 'y': 19, 'facing': 'right'}
    done(rb)
    # ---------- Cairnfold (Frostspire art) ----------
    cf = M('r9_cairnfold', 'frostspire', 'Cairnfold')
    cf._anchor = (26, 26)
    ws = cf.j['warps']
    for i, w in enumerate(ws):
        k = (w['x'], w['y'])
        if k == (15, 25): cf.warp(i, 'heal_brookhollow', 6, 8)
        elif k == (22, 25): cf.warp(i, 'shop_int', 5, 7)
        elif k == (26, 17): cf.warp(i, 'r9_lodge_int', 7, 7)
        elif k == (34, 25): cf.warp(i, 'home_brookhollow_a', 5, 6)
        elif k == (26, 32): cf.warp(i, 'r9_skylift_upper', 9, 11)
    for e in cf.j['exits']:
        if e['edge'] == 'south': e['to'] = 'r9_switchbacks'
    tables(cf, {'*': 'r9_cairnfold_grass'})
    cf.spot('r9_cairnfold_down', (8, 40))       # back down the riverbed
    cf.spot('r9_cairnfold_sign', (24, 27))
    cf.spot('r9_kid_drawing', (36, 30))
    for i, (nid, want) in enumerate([('r9_cf_herder_1', (12, 20)), ('r9_cf_herder_2', (30, 21)), ('r9_cf_elder', (20, 28)), ('r9_cf_kid', (37, 31)),
                                     ('r9_cf_weaver', (42, 28)), ('r9_cf_walker', (10, 36)), ('r9_cf_lodge_fan', (24, 19)), ('r9_cf_watcher', (32, 36)), ('r9_cf_baker', (18, 36))]):
        cf.npc(nid, want, 'clerk', 'down')
    done(cf)
    lodge = M('r9_lodge_int', 'frostspire_office_int', 'RT Heritage Lodge')
    lodge.warp(0, 'r9_cairnfold', 26, 18, 'down'); lodge._anchor = (7, 7)
    lodge.npc('r9_lodge_clerk', (5, 3), 'clerk', 'down')
    lodge.spot('r9_lodge_legend', (9, 3))
    done(lodge)
    # ---------- Entry A: Skylift Upper Line (Frostspire lift interior art) ----------
    sk = M('r9_skylift_upper', 'frostspire_lift_int', 'Skylift Upper Line')
    sk._anchor = (9, 11)
    for i in range(len(sk.j['warps'])): sk.warp(i, 'r9_cairnfold', 26, 33, 'down')  # the lift door leads out into Cairnfold
    sk.npc('r9_skylift_operator', (5, 6), 'clerk', 'down')
    sk.npc('r9_skylift_rider', (14, 7), 'trainer', 'left')
    sk.spot('r9_skylift_notice', (12, 4))
    sk.spot('r9_skylift_down', (3, 4))   # ride back down to Frostspire
    done(sk)
    # ---------- Switchbacks (Frostspire pass art) ----------
    sw = M('r9_switchbacks', 'frostspire_pass', 'Wellspire Switchbacks')
    sw.j['exits'] = [e for e in sw.j['exits'] if e['edge'] == 'north']
    for e in sw.j['exits']: e['to'] = 'r9_cairnfold'
    sw._anchor = (24, 1)
    map_fill.apply('r9_switchbacks', sw.j)
    tables(sw, {'*': 'r9_switchbacks_snow'})
    sw.spot('r9_switchbacks_up', (30, 57))
    for nid, want in [('r9_sw_mountaineer_1', (22, 10)), ('r9_sw_climber_1', (28, 18)), ('r9_sw_survey_1', (20, 28)), ('r9_sw_survey_2', (24, 30)),
                      ('r9_sw_survey_3', (28, 32)), ('r9_sw_climber_2', (30, 46))]:
        sw.npc(nid, want, 'trainer', 'down')
    sw.npc('r9_sw_shelf_skier', (34, 24), 'trainer', 'down', base=(34, 21))   # on the cliff shelf (via the Icefall tunnel)
    sw.spot('r9_switchbacks_cairn', (36, 22), base=(34, 21))
    done(sw)
    # ---------- Icefall (Tidewater sea-cave art) ----------
    ic = M('r9_icefall', 'tidewater_cave_int', 'Wellspire Icefall')
    g = copy.deepcopy(load('tidewater_cave_int')['story_gates'][0])
    g.update(id='gate_r9_icefall', flag='r9_unlocked', also=[], earned_at='Head Office letter (r9_unlocked)', npc=None, lines=None, detour='none', blocks=None)
    ic.j['story_gates'] = [g]
    for cell in g['cells']: ic.col[cell['y']][cell['x']] = ic.col[cell['y']][cell['x']]  # collision stays as authored (gate opens at runtime)
    ic.gates = {(cell['x'], cell['y']) for cell in g['cells']}
    up = sw.pts['r9_switchbacks_up']
    ic.warp(0, 'r9_switchbacks', up['x'], up['y'], 'down'); ic.warp(1, 'r9_switchbacks', up['x'], up['y'], 'down')
    ic.warp(2, 'fin_summit_camp', 16, 22, 'up')
    map_fill.door(ic.j, 27, 8, 'r9_switchbacks', 34, 21, 'down', ground=544)   # east tunnel out onto the switchbacks cliff shelf
    ic._anchor = (14, 18)
    tables(ic, {'*': 'r9_icefall_cave'})
    # Map fill (Coder, Oct 30 2026, Gary: sparse maps, layered like the classic games). Row 6 west of the climb becomes a
    # south-only ice ledge: the north shelf (row 5, x3-13) is a cliff walk over the pool, reached up the x14 climb; at its
    # west end a Prime Crystal sits hidden, and the ledge drops you back down (one-way) beside the pool.
    for x in range(3, 14): ic.prop(x, 6, 518 if x == 3 else 522 if x == 13 else 520, code=2)
    for (x, y, t) in [(26, 5, 5443), (3, 12, 5443), (3, 15, 5442), (26, 15, 5442), (26, 10, 5442), (10, 15, 5442), (20, 15, 5443),
                      (18, 8, 510), (19, 8, 510), (13, 9, 510), (24, 12, 510)]:
        ic.prop(x, y, t)
    ic.j['items'] = [{'id': 'r9_ic_shelf_crystal', 'x': 3, 'y': 5, 'item': 'dominance_crystal_plus', 'qty': 1, 'hidden': True,
                      'note': 'end of the ice shelf over the pool (one-way ledge back down)', 'flag': 'item_r9_icefall_r9_ic_shelf_crystal'},
                     {'id': 'r9_ic_nook_tea', 'x': 3, 'y': 14, 'item': 'calm_tea', 'qty': 1, 'hidden': False,
                      'note': 'visible satchel in the west nook by the pool', 'flag': 'item_r9_icefall_r9_ic_nook_tea'}]
    ic.spot('r9_icefall_signal', (8, 8))
    ic.spot('r9_icefall_pool', (9, 13))
    ic.spot('r9_icefall_pegs', (25, 5))
    ic.spot('r9_icefall_carving', (18, 9))
    for nid, want in [('r9_ic_climber_1', (8, 14)), ('r9_ic_climber_2', (22, 14)), ('r9_ic_diver', (4, 9)), ('r9_ic_keeper', (24, 7)),
                      ('r9_ic_carver', (17, 11)), ('r9_ic_sledder', (11, 14))]:
        ic.npc(nid, want, 'trainer', 'down')
    P['_arrive_icefall'] = {'x': 14, 'y': 18, 'facing': 'up'}
    done(ic)
    # ---------- Summit camp (Cindervale caldera art) ----------
    sc = M('fin_summit_camp', 'cindervale_caldera', 'Wellspire Summit Camp')
    sc.warp(0, 'r9_icefall', 20, 5, 'down'); sc.warp(1, 'r9_icefall', 20, 5, 'down')
    sc._anchor = (16, 22)
    map_fill.apply('fin_summit_camp', sc.j)
    sc.j.pop('ambient', None)
    tables(sc, {'*': 'r9_icefall_cave'}); sc.j['encounter_zones'] = []  # safe camp
    sc.spot('fin_spire_door', (17, 3))
    sc.spot('fin_camp_fire', (12, 14))
    for nid, want in [('fin_teo', (12, 16)), ('fin_marta', (20, 16)), ('fin_pell', (9, 12)), ('fin_imke', (23, 12))]:
        sc.npc(nid, want, 'clerk', 'down', inactive_when='field_team_home')
    done(sc)
    # ---------- Present spire (lighthouse floors) + dome (arena room 7 art, violet) ----------
    def floors(prefix, title, n_floors, top_to, top_xy):
        names = [f'{prefix}_f{i}' for i in range(1, n_floors + 1)]
        out = []
        for i, nm in enumerate(names):
            tpl = 'lanternport_lighthouse_int' if i == 0 else ('lanternport_lighthouse_f2' if i % 2 == 1 else 'lanternport_lighthouse_f3')
            m = M(nm, tpl, f'{title} {i + 1}F')
            out.append(m)
        return names, out
    now_names, now = floors('fin_lab1_now', 'First Lab Spire', 3, 'fin_lab1_now', None)
    spire = sc.pts['fin_spire_door']
    f1, f2, f3 = now
    f1.warp(0, 'fin_summit_camp', spire['x'], spire['y'], 'down'); f1.warp(1, 'fin_lab1_now_f2', 17, 5, 'up'); f1._anchor = (11, 9)
    f2.warp(0, 'fin_lab1_now_f3', 21, 5, 'up'); f2.warp(1, 'fin_lab1_now_f1', 17, 1, 'down'); f2._anchor = (17, 5)
    f3.warp(0, 'fin_lab1_now', 8, 13, 'up'); f3.warp(1, 'fin_lab1_now_f2', 21, 1, 'down'); f3._anchor = (21, 5)
    for m, (nid, sid) in zip(now, [('r9_spire_keeper_1', 'r9_spire_f1_nursery'), ('r9_spire_keeper_2', 'r9_spire_f2_chair'), ('r9_spire_keeper_3', 'r9_spire_f3_growth')]):
        m.npc(nid, (8, 3), 'trainer', 'down'); m.spot(sid, (4, 3))
    P['_arrive_spire'] = {'x': 11, 'y': 9, 'facing': 'up'}
    for m in now: tables(m, {}); m.j['encounter_zones'] = []; done(m)
    dome = M('fin_lab1_now', 'aurelith_arena_room_7', 'First Lab: the Dome')
    for i in range(4): dome.warp(i, 'fin_lab1_now_f3', 21, 1, 'down')
    dome._anchor = (8, 13); dome.j['encounter_zones'] = []
    dome.j['tint'] = {'color': '#7a3cf0', 'alpha': 0.22}
    dome.spot('fin_dome', (8, 6))
    P['_arrive_dome'] = {'x': 8, 'y': 12, 'facing': 'up'}
    done(dome)
    # ---------- THE PAST: Station M, Signal Lab, first lab floors 1-4, the enclosure, the riverbend ----------
    stm = M('fin_past_station_m', 'lab_mirefen_sunken', 'Station M (the night of Test 7)', 'past')
    stm.warp(0, 'fin_past_signal_lab', 8, 10, 'up'); stm._anchor = (8, 10)
    stm.j['tint'] = {'color': '#5a2ad0', 'alpha': 0.18}
    stm.spot('fin_reader', (4, 3)); stm.spot('fin_sluice', (12, 3))
    for nid, want in [('fin_m_handler_1', (4, 7)), ('fin_m_handler_2', (11, 7)), ('fin_m_handler_3', (6, 5)), ('fin_m_greave', (9, 3))]:
        stm.npc(nid, want, 'trainer', 'down')
    P['_arrive_past_m'] = {'x': 8, 'y': 10, 'facing': 'up'}
    done(stm)
    stt = M('fin_past_signal_lab', 'lab_tidewater_cave', 'Signal Lab (the night of Test 7)', 'past')
    stt.warp(0, 'fin_past_lab1_f1', 11, 9, 'up'); stt._anchor = (8, 10)
    stt.j['tint'] = {'color': '#5a2ad0', 'alpha': 0.18}
    stt.spot('fin_test8_plug', (12, 3)); stt.spot('fin_t_tide_door', (4, 3))
    for nid, want in [('fin_t_tech_1', (4, 7)), ('fin_t_tech_2', (11, 7)), ('fin_t_tech_3', (6, 5)), ('fin_t_coralie', (3, 9)), ('fin_t_holt', (9, 3))]:
        stt.npc(nid, want, 'trainer' if 'coralie' not in nid else 'clerk', 'down')
    done(stt)
    past_names = [f'fin_past_lab1_f{i}' for i in range(1, 5)]
    tpls = ['lanternport_lighthouse_int', 'lanternport_lighthouse_f2', 'lanternport_lighthouse_f3', 'lanternport_lighthouse_f3']
    past = [M(n, t, f'First Lab {i + 1}F (the night of Test 7)', 'past') for i, (n, t) in enumerate(zip(past_names, tpls))]
    p1, p2, p3, p4 = past
    p1.warp(0, 'fin_past_signal_lab', 8, 10, 'down'); p1.warp(1, 'fin_past_lab1_f2', 17, 5, 'up'); p1._anchor = (11, 9)
    p2.warp(0, 'fin_past_lab1_f3', 21, 5, 'up'); p2.warp(1, 'fin_past_lab1_f1', 17, 1, 'down'); p2._anchor = (17, 5)
    p3.warp(0, 'fin_past_lab1_f4', 21, 5, 'up'); p3.warp(1, 'fin_past_lab1_f2', 21, 1, 'down'); p3._anchor = (21, 5)
    p4.warp(0, 'fin_past_enclosure', 8, 13, 'up'); p4.warp(1, 'fin_past_lab1_f3', 21, 1, 'down'); p4._anchor = (21, 5)
    for i, m in enumerate(past):
        m.j['tint'] = {'color': '#5a2ad0', 'alpha': 0.2}; m.j['encounter_zones'] = []
        m.npc(f'fin_lab1_staff_{i + 1}', (12, 3), 'trainer', 'down')
    p4.npc('fin_lab1_chief', (19, 2), 'trainer', 'down'); p4.spot('fin_lab1_window', (6, 3))
    for m in past: done(m)
    enc = M('fin_past_enclosure', 'aurelith_arena_room_6', 'The Enclosure (the night of Test 7)', 'past')
    for i in range(4): enc.warp(i, 'fin_past_lab1_f4', 21, 1, 'down')
    enc._anchor = (8, 13); enc.j['encounter_zones'] = []
    enc.j['tint'] = {'color': '#8a50ff', 'alpha': 0.16}
    enc.spot('fin_past_dome', (8, 6))
    P['_arrive_enclosure'] = {'x': 8, 'y': 12, 'facing': 'up'}
    done(enc)
    rv = M('fin_past_riverbend', 'mirefen_bog', 'The River Bend (dawn)', 'past')
    rv.j['exits'] = []; rv.j['encounter_zones'] = []
    ax, ay = min(((x, y) for y in range(rv.h) for x in range(rv.w) if rv.c(x, y) == 0), key=lambda p: abs(p[0] - 30) + abs(p[1] - 20))
    rv.warp(0, 'fin_past_riverbend', ax, ay, 'down'); rv._anchor = (ax, ay)
    rv.j['tint'] = {'color': '#5aa8ff', 'alpha': 0.14}
    P['_arrive_riverbend'] = {'x': ax, 'y': ay, 'facing': 'left'}
    done(rv)
    for k, v in list(P.items()):
        if k.startswith('_'):
            m = load({'_arrive_riverbed': 'r9_old_riverbed', '_arrive_icefall': 'r9_icefall', '_arrive_spire': 'fin_lab1_now_f1', '_arrive_dome': 'fin_lab1_now',
                      '_arrive_past_m': 'fin_past_station_m', '_arrive_enclosure': 'fin_past_enclosure', '_arrive_riverbend': 'fin_past_riverbend'}[k])
            assert m['layers']['collision'][v['y']][v['x']] in WALK, (k, v)
    with open(os.path.join(ROOT, 'src', 'region9', 'points.gen.js'), 'w') as f:
        f.write('// GENERATED by tools/wellspire/build_wellspire.py: spot stand cells and scripted arrival cells. Do not hand-edit.\n')
        f.write('export const POINTS = ' + json.dumps(P, indent=1, sort_keys=True) + ';\n')
    return P

class Live(M):
    """An existing live map: only region9 NPCs / spots are added (idempotent), nothing else changes."""
    def __init__(self, name):
        self.j = load(name); self.name = name; self.pts = {}
        self.j['npcs'] = [n for n in self.j.get('npcs', []) if not n.get('region9')]
        self.j['interact_spots'] = [s for s in self.j.get('interact_spots', []) if not s.get('region9')]
        self.col = self.j['layers']['collision']; self.w = self.j['width']; self.h = self.j['height']
        self.used = set((w['x'], w['y']) for w in self.j['warps']) | {(n['x'], n['y']) for n in self.j['npcs']} \
            | {(s['x'], s['y']) for s in self.j['interact_spots']} | {tuple(s['stand']) for s in self.j['interact_spots'] if s.get('stand')} \
            | {(s['x'], s['y']) for s in self.j.get('signs', [])}
    def save(self):
        fp = os.path.join(MAPS, self.name + '.json')
        nl = open(fp).read().endswith('\n')
        with open(fp, 'w') as f: f.write(json.dumps(self.j, separators=(',', ':')) + ('\n' if nl else ''))
        return self

R9_MAPS = ['r9_old_riverbed', 'r9_cairnfold', 'r9_lodge_int', 'r9_skylift_upper', 'r9_switchbacks', 'r9_icefall', 'fin_summit_camp',
           'fin_lab1_now_f1', 'fin_lab1_now_f2', 'fin_lab1_now_f3', 'fin_lab1_now']
PAST_MAPS = ['fin_past_station_m', 'fin_past_signal_lab', 'fin_past_lab1_f1', 'fin_past_lab1_f2', 'fin_past_lab1_f3', 'fin_past_lab1_f4',
             'fin_past_enclosure', 'fin_past_riverbend']

def live(P):
    # Entry B: the riverbank in Brookhollow (by the bridge) - the dry bed north, after the letter
    bh = Live('brookhollow'); bh._anchor = (24, 12)
    bh.spot('r9_riverbed_entry', (30, 22), active_when='r9_unlocked')
    bh.save(); P['brookhollow'] = bh.pts
    # Entry A: the Skylift Upper Line platform in the Frostspire lift station
    lf = Live('frostspire_lift_int'); lf._anchor = (9, 11)
    lf.spot('r9_skylift_entry', (15, 4), active_when='skylift_upper_open')
    lf.save(); P['frostspire_lift_int'] = lf.pts
    # Epilogue: the field team home at Lantern Rest (only after Ending 2) + the bench
    lr = Live('lantern_rest'); lr._anchor = (19, 22)
    for nid, want in [('fin_ep_teo', (16, 14)), ('fin_ep_marta', (20, 12)), ('fin_ep_pell', (24, 14)), ('fin_ep_imke', (13, 16))]:
        lr.npc(nid, want, 'clerk', 'down', active_when='field_team_home')
    lr.spot('fin_bench_swap', (20, 10), active_when='field_team_home')
    lr.save(); P['lantern_rest'] = lr.pts
    # world layout: register the maps (knownMaps) + the Wellspire zone
    wp = os.path.join(ROOT, 'art', 'world', 'overworld', 'world_layout.json')
    with open(wp) as f: W = json.load(f)
    for n in R9_MAPS + PAST_MAPS:
        if n not in W['maps_built']: W['maps_built'].append(n)
    W['zones'] = [z for z in W['zones'] if z.get('id') != 'wellspire']
    W['zones'].append({'id': 'wellspire', 'name': 'Wellspire', 'type': 'region', 'map_pos': {'x': 0.5, 'y': 0.03},
                       'status': 'built', 'maps': R9_MAPS, 'past_maps': PAST_MAPS, 'access': 'after_ending1',
                       'access_note': 'Gary Oct 29 2026 (story_beats.md §F-C): opens on the Head Office letter (r9_unlocked). Entry A: Skylift Upper Line (Frostspire lift). Entry B: the dry old riverbed from Brookhollow.'})
    with open(wp, 'w') as f: json.dump(W, f)

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'src', 'region9'), exist_ok=True)
    P = build()
    live(P)
    with open(os.path.join(ROOT, 'src', 'region9', 'points.gen.js'), 'w') as f:
        f.write('// GENERATED by tools/wellspire/build_wellspire.py: spot stand cells and scripted arrival cells. Do not hand-edit.\n')
        f.write('export const POINTS = ' + json.dumps(P, indent=1, sort_keys=True) + ';\n')
    print('built', len([k for k in P if not k.startswith('_')]), 'maps')
