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

def apply(name, j):
    if name in R: R[name](j); j['map_fill'] = 'tools/map_audit/map_fill.py (Oct 30 2026)'
    return j

if __name__ == '__main__':
    for n in sys.argv[1:]:
        p = os.path.join(MAPS, n + '.json'); j = json.load(open(p))
        if j.get('map_fill'): print(n, 'already filled'); continue
        apply(n, j); json.dump(j, open(p, 'w'), indent=1); print(n, 'filled')
