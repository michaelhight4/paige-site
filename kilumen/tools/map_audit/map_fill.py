#!/usr/bin/env python3
"""Map fill / layering recipes (Coder, Oct 30 2026; design/map_layering_guide.md patterns P1-P12).
Each recipe edits a map dict in place: carve walkable pockets out of filler, lay south-only ledges (collision 2),
drop single-square props and visible / hidden items. Strict grid; tests/map_layers_reach.test.mjs checks reachability.
- r9 maps are rebuilt by tools/wellspire/build_wellspire.py, which calls apply(name, j) on the fresh clone.
- other maps: `python3 tools/map_audit/map_fill.py <map> ...` applies the recipe once (marker key "map_fill")."""
import collections, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAPS = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps')
LEDGE_OUT = (517, 519, 521); LEDGE_CAVE = (518, 520, 522)

def _floor(j):
    L = j['layers']; c = collections.Counter(L['ground'][y][x] for y, r in enumerate(L['collision']) for x, v in enumerate(r) if v == 0 and L['ground'][y][x])
    return c.most_common(1)[0][0]

def carve(j, cells, ground=None):
    """Make filler squares plain walkable floor (clears decoration + overlay)."""
    L = j['layers']; g = ground or _floor(j)
    for (x, y) in cells:
        L['collision'][y][x] = 0; L['decoration'][y][x] = 0
        if 'overlay' in L: L['overlay'][y][x] = 0
        L['ground'][y][x] = g

def rect(x0, y0, x1, y1): return [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]

def ledge(j, y, x0, x1, cave=False):
    """A south-only ledge row from x0..x1 (hop down from y-1 to y+1; never climbable)."""
    L = j['layers']; l, m, r = LEDGE_CAVE if cave else LEDGE_OUT
    for x in range(x0, x1 + 1):
        assert L['collision'][y][x] in (0, 1), (j['name'], 'ledge', x, y)
        if L['collision'][y][x] == 1: carve(j, [(x, y)])
        L['decoration'][y][x] = l if x == x0 else r if x == x1 else m; L['collision'][y][x] = 2
        if 'overlay' in L: L['overlay'][y][x] = 0

def prop(j, x, y, tile):
    L = j['layers']; assert L['collision'][y][x] == 0, (j['name'], 'prop', x, y)
    L['decoration'][y][x] = tile; L['collision'][y][x] = 1

def item(j, iid, x, y, it, hidden, note, qty=1):
    assert j['layers']['collision'][y][x] == 0, (j['name'], 'item', x, y)
    j.setdefault('items', []).append({'id': iid, 'x': x, 'y': y, 'item': it, 'qty': qty, 'hidden': hidden, 'note': note, 'flag': f"item_{j['name']}_{iid}"})

R = {}
def recipe(fn): R[fn.__name__] = fn; return fn

@recipe
def r9_old_riverbed(j):
    # P1/P11: the old bank (rows 10-15) becomes an upper band; a ledge (row 16) drops you back to the dry bed from anywhere,
    # the only way up is the east end (x39-44). P10: a one-square gap at (36,9) behind the bank opens a hidden gully (row 8).
    ledge(j, 16, 15, 38)
    carve(j, rect(24, 8, 36, 8) + [(36, 9)])
    item(j, 'r9_rb_gully_seed', 24, 8, 'vigor_seed', True, 'west end of the hidden gully behind the old bank')
    carve(j, [(21, 24)])   # the sealed 2x2 hollow south of the bed now opens off the bed (show-then-reach nook)
    item(j, 'r9_rb_hollow_mix', 20, 26, 'trail_mix', False, 'in the hollow under the bed')
    carve(j, [(45, 17)])   # the sealed nook east of the bank climb (was an unreachable pocket)
    item(j, 'r9_rb_nook_pouch', 47, 16, 'coin_pouch_small', True, 'back of the nook east of the bank climb')
    item(j, 'r9_rb_end_dust', 42, 39, 'crystal_dust', False, 'end of the south gully')

def door(j, x, y, to, tx, ty, facing, ground=None, art=None, reached_via=None):
    """A door / cave-mouth warp square. reached_via: the map whose door leads onto this (one-way pocket, not walkable to)."""
    L = j['layers']
    if ground: L['ground'][y][x] = ground
    if art:  # 3x2 cave mouth centred on the door: (x-1..x+1, y-1..y)
        for i, t in enumerate(art):
            ax, ay = x - 1 + i % 3, y - 1 + i // 3; L['decoration'][ay][ax] = t
            if 'overlay' in L: L['overlay'][ay][ax] = 0
            L['collision'][ay][ax] = 1
    L['collision'][y][x] = 4
    w = {'x': x, 'y': y, 'to': to, 'tx': tx, 'ty': ty, 'facing': facing}
    if reached_via: w['reached_via'] = reached_via
    j['warps'].append(w); return w

CAVE_MOUTH = (794, 795, 796, 797, 798, 799)

@recipe
def r9_switchbacks(j):
    # P3 cave exit on the cliff top: the Icefall's new east tunnel (r9_icefall 27,8) comes out on a snow shelf above the
    # middle zig (x30-38, rows 21-26). A ledge (row 27) drops you onto a landing (rows 28-29) that joins the main climb,
    # so the shelf is only ever reached through the cave. Shelf: a seen-from-below satchel + a hidden seed + a trainer.
    carve(j, rect(30, 21, 38, 26))
    ledge(j, 27, 30, 38)
    carve(j, rect(29, 28, 38, 29))
    door(j, 34, 20, 'r9_icefall', 26, 8, 'left', art=CAVE_MOUTH, reached_via='r9_icefall')
    item(j, 'r9_sw_shelf_tea', 38, 21, 'calm_tea', False, 'east end of the cliff shelf, seen from the zig below')
    item(j, 'r9_sw_shelf_seed', 30, 21, 'vigor_seed', True, 'west corner of the cliff shelf')
    carve(j, [(20, 21)])   # the sealed hollow west of the upper zig opens (was unreachable)
    item(j, 'r9_sw_hollow_mix', 18, 20, 'trail_mix', False, 'back of the hollow off the upper zig')
    item(j, 'r9_sw_foot_pouch', 30, 59, 'coin_pouch_small', True, 'very bottom of the south cut')

@recipe
def fin_summit_camp(j):
    # P1 ledge shortcut: the east cut between the spire terrace and the camp (x24-25) becomes a one-way drop, so the
    # terrace is climbed at the west cut and left fast by the east one. Dead ends pay: the west chimney (x3) hides a
    # Prime Crystal, the north-west nook has a satchel, the east nook a hidden pouch.
    ledge(j, 11, 24, 25, cave=True)
    item(j, 'fin_sc_chimney_crystal', 3, 4, 'dominance_crystal_plus', True, 'top of the west chimney above the camp')
    item(j, 'fin_sc_nook_mix', 6, 4, 'trail_mix', False, 'north-west nook of the spire terrace')
    item(j, 'fin_sc_east_pouch', 30, 18, 'coin_pouch_small', True, 'east nook behind the camp')

@recipe
def cindervale_caldera(j):
    # Same bowl as the summit camp: east cut (x24-25) becomes a one-way drop off the upper rim, west cut stays the climb.
    ledge(j, 11, 24, 25, cave=True)
    item(j, 'caldera_chimney_crystal', 3, 4, 'dominance_crystal', True, 'top of the west vent chimney')
    item(j, 'caldera_nook_dust', 6, 4, 'crystal_dust', False, 'north-west nook of the upper rim')
    for it in j['items']:  # the old satchel at 29,4 sealed the corner square behind it; tuck it into that corner instead
        if it['id'] == 'caldera_item': it['x'] = 30
    item(j, 'caldera_east_pouch', 30, 18, 'coin_pouch_small', True, 'east nook behind the smelter floor')

@recipe
def r9_cairnfold(j):
    # The west yard behind the lodge drops over a low snow bank onto the high street (one-way, x10-15), so the
    # yard is a quick way down and the street gap at x20-29 is the way back up. Dead ends pay out.
    ledge(j, 19, 10, 15)
    item(j, 'r9_cf_stall_dust', 41, 18, 'crystal_dust', False, 'end of the alley past the frozen pond')
    item(j, 'r9_cf_yard_seed', 4, 16, 'vigor_seed', True, 'far end of the west yard lane')
    item(j, 'r9_cf_east_pouch', 39, 28, 'coin_pouch_small', True, 'corner by the weaver, under the eaves')
    item(j, 'r9_cf_west_mix', 2, 36, 'trail_mix', False, 'west end of the bakery lane')
    seal_unreached(j, (26, 26))  # the cloned town's tree bands had walkable squares no one can get to

def seal_unreached(j, start):
    c = j['layers']['collision']; H, W = len(c), len(c[0])
    solid = {(n['x'], n['y']) for n in j.get('npcs', [])} | {(i['x'], i['y']) for i in j.get('items', []) if not i.get('hidden')}
    seen, q = {tuple(start)}, [tuple(start)]
    while q:
        x, y = q.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in seen and n not in solid and c[n[1]][n[0]] in (0, 2, 10):
                if c[n[1]][n[0]] == 2 and dy != 1: continue
                seen.add(n); q.append(n)
    for y in range(H):
        for x in range(W):
            if c[y][x] == 0 and (x, y) not in seen and (x, y) not in solid: c[y][x] = 1

@recipe
def frostspire_pass(j):
    # P1 loop: a ledge across the upper climb (row 24) is the fast way down; the way back up is a new west bypass
    # (x19-20, rows 20-24) that also opens the old sealed satchel nook at x18-19. P3-style cliff side-shelf by the
    # Greystone cave approach: step off the corridor at row 49 onto a shelf (x32-34) whose only way off is a ledge down.
    ledge(j, 24, 21, 28)
    carve(j, [(20, 20), (20, 21)] + rect(19, 22, 20, 24))
    item(j, 'fsp_bypass_seed', 19, 23, 'vigor_seed', True, 'west bypass beside the ledge')
    carve(j, [(32, 49)] + rect(33, 49, 35, 53) + rect(32, 55, 35, 55), ground=5699)  # grass, like the forest floor around it
    ledge(j, 54, 33, 35)
    item(j, 'fsp_shelf_tea', 35, 50, 'calm_tea', False, 'cliff shelf above the cave approach')
    item(j, 'fsp_shelf_pouch', 35, 53, 'coin_pouch_small', True, 'lip of the cliff shelf, by the drop')

@recipe
def lanternport_grotto(j):
    # P1: a rock step (row 13, x4-10) under the west pool drops you to the mouth floor; the way back up is east of the
    # middle pool (x14-20). The two chimneys pay: a satchel in the west one, a hidden pouch at the top of the east one.
    ledge(j, 13, 4, 10, cave=True)
    item(j, 'grotto_west_dust', 3, 4, 'crystal_dust', False, 'top of the west chimney')
    item(j, 'grotto_east_pouch', 28, 4, 'coin_pouch_small', True, 'top of the east chimney')

@recipe
def route_aurelith_saltmere(j):
    # P1: the raised east clearing (rows 12-15) ends in a ledge (row 15, x31-45) down to the coast path; the climb back
    # is the east bank (x46-48). P10: the sealed satchel pocket south of the bank (x43-44) opens through a gap at (44,24).
    ledge(j, 15, 31, 45)
    carve(j, [(44, 24)])
    item(j, 'route_aurelith_saltmere_nub_seed', 14, 16, 'vigor_seed', True, 'north-west corner of the west meadow')

@recipe
def route_east(j):
    # P1: the north meadow (rows 10-14) drops over a ledge (row 15, x19-33) into the middle field; climb back at x34-40.
    # P10: both sealed satchel pockets (x46-47 east, x20-21 south) now open through one-square gaps.
    ledge(j, 15, 19, 33)
    carve(j, [(45, 16), (21, 24)])
    item(j, 'route_east_hollow_pouch', 21, 26, 'coin_pouch_small', True, 'back of the south hollow')

def apply(name, j):
    if name in R: R[name](j); j['map_fill'] = 'tools/map_audit/map_fill.py (Oct 30 2026)'
    return j

if __name__ == '__main__':
    for n in sys.argv[1:]:
        p = os.path.join(MAPS, n + '.json'); j = json.load(open(p))
        if j.get('map_fill'): print(n, 'already filled'); continue
        apply(n, j); json.dump(j, open(p, 'w'), indent=1); print(n, 'filled')
