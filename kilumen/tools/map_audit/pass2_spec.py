"""Pass 2 spec builder (Coder, Oct 30 2026). Merges one map's pockets into data/pass2_caves.json.
Each map's pockets live in tools/map_audit/pass2_specs/<map>.py as POCKETS = [P(...), ...] (helpers below).
Usage: python3 tools/map_audit/pass2_spec.py <map> [...]   (replaces only that map's entries; other maps are kept)
Then: python3 tools/map_audit/cave_pockets.py <map>"""
import json, os, sys, importlib.util
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = os.path.join(ROOT, 'data', 'pass2_caves.json')
D = 'DRAFT: '
NOTE = ('Pass 2 cave pockets (Coder, Oct 30 2026). Read by tools/map_audit/cave_pockets.py and tests/pass2_caves.test.mjs. '
        'gate = how the pocket is entered and left. Built by tools/map_audit/pass2_spec.py from tools/map_audit/pass2_specs/.')

def P(map, id, cave, title, floor, ledge, walk, mouth, door, tr, egg, item, premise, main_start, floor_tile_at=None,
      floor_tiles=(898, 899, 900, 901), skill=None, **extra):
    d = dict(id=id, map=map, cave=cave, cave_title=title, floor=floor, ledge=ledge, walk=walk, mouth=mouth, pocket_door=door,
             main_start=main_start, floor_tile_at=floor_tile_at, floor_tiles=list(floor_tiles) if floor_tiles else None,
             gate={'in': 'cave ' + cave, 'out': 'one-way ledge at y%d x%d-%d' % (ledge[2], ledge[0], ledge[1]), 'skill': skill},
             trainer=tr, egg=egg, item=item, premise=premise)
    d.update(extra)
    return d

def T(id, x, y, cls, name, sp, intro, lost, after, level=63):
    return dict(id=id, x=x, y=y, level=level, **{'class': cls}, name=name, species=sp, intro=[D + intro], lost=[D + lost], after=[D + after])

def E(id, x, y, what, line, tile=509):
    return dict(id=id, x=x, y=y, what=what, tile=tile, lines=[D + line])

def load_map_spec(m):
    path = os.path.join(os.path.dirname(__file__), 'pass2_specs', m + '.py')
    sp = importlib.util.spec_from_file_location('p2_' + m, path); mod = importlib.util.module_from_spec(sp)
    sys.modules.setdefault('pass2_spec', sys.modules[__name__]); sp.loader.exec_module(mod)
    return mod.POCKETS

def merge(maps):
    cur = json.load(open(SPEC)) if os.path.exists(SPEC) else {'pockets': []}
    new = {m: load_map_spec(m) for m in maps}
    for m, ps in new.items():
        assert all(p['map'] == m for p in ps), m
    order = [p['map'] for p in cur['pockets']]
    out = []; done = set()
    for p in cur['pockets']:
        if p['map'] in new:
            if p['map'] not in done: out += new[p['map']]; done.add(p['map'])
        else: out.append(p)
    for m in maps:
        if m not in done: out += new[m]
    ids = [p['id'] for p in out]; assert len(ids) == len(set(ids)), 'duplicate pocket id'
    json.dump({'_note': NOTE, 'pockets': out}, open(SPEC, 'w'), indent=1)
    print('pass2_caves.json:', len(out), 'pockets,', len(set(p['map'] for p in out)), 'maps')

if __name__ == '__main__':
    merge(sys.argv[1:])
