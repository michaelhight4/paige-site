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

def apply(name, j):
    if name in R: R[name](j); j['map_fill'] = 'tools/map_audit/map_fill.py (Oct 30 2026)'
    return j

if __name__ == '__main__':
    for n in sys.argv[1:]:
        p = os.path.join(MAPS, n + '.json'); j = json.load(open(p))
        if j.get('map_fill'): print(n, 'already filled'); continue
        apply(n, j); json.dump(j, open(p, 'w'), indent=1); print(n, 'filled')
