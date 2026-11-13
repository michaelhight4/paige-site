# Small room-building kit for the interior maps (writes the same JSON schema as maps/*.json).
import json, os, zlib
from ix_canvas import OW
D = os.path.join(OW, 'interiors_new')
_TS = None
def ts():
    global _TS
    if _TS is None:
        js = json.load(open(os.path.join(D, 'tileset_interiors.json')))
        _TS = dict(js=js, id={t['name']: t['id'] for t in js['tiles']}, by_id={t['id']: t for t in js['tiles']}, multi=js['multi_tile_objects'])
    return _TS
def tid(name): return ts()['id'][name]

MOVE = {'run': True, 'bike': False, 'note': 'running allowed everywhere (incl. indoors); bike outdoors only - see MOVEMENT.md'}
FLOORS = {k: 'i_floor_' + k for k in ('oak', 'pine', 'drift', 'ash', 'parquet', 'heal', 'shop', 'lab', 'slate', 'flag', 'saltflag', 'basalt', 'marble',
                                       'carpet_red', 'carpet_teal', 'carpet_violet', 'metal', 'concrete', 'rtbranch')}
FLOORS['platform'] = 'i_platform'

class Room:
    def __init__(s, mid, title, w, h, wall, floor, windows=(), region='', kind='home'):
        s.id, s.title, s.w, s.h, s.wall, s.region, s.kind = mid, title, w, h, wall, region, kind
        s.g = [[0] * w for _ in range(h)]; s.d = [[0] * w for _ in range(h)]; s.o = [[0] * w for _ in range(h)]
        s.c = [[0] * w for _ in range(h)]; s.e = [[0] * w for _ in range(h)]
        s.warps, s.exits, s.npcs, s.signs, s.items = [], [], [], [], []
        s.extra = {}
        for y in range(h):
            for x in range(w):
                s.set_floor(x, y, floor)
        for x in range(w):
            s.g[0][x] = tid('i_wall_top_' + wall); s.g[1][x] = tid(('i_wall_upper_win_' if x in windows else 'i_wall_upper_') + wall)
            s.g[2][x] = tid('i_wall_face_' + wall)
            for y in range(3): s.c[y][x] = 1
    def set_floor(s, x, y, floor, coll=0):
        base = FLOORS.get(floor, floor)
        if base + '_a' in ts()['id']:
            hsh = zlib.crc32(('%s%d,%d' % (s.id, x, y)).encode()) % 100
            v = 'a' if hsh < 64 else ('b' if hsh < 82 else 'c')
            s.g[y][x] = tid(base + '_' + v)
        else:
            s.g[y][x] = tid(base)
        s.c[y][x] = ts()['by_id'][s.g[y][x]]['collision_code'] if coll is None else max(coll, ts()['by_id'][s.g[y][x]]['collision_code'])
    def floor_rect(s, x0, y0, x1, y1, floor):
        for y in range(y0, y1):
            for x in range(x0, x1): s.set_floor(x, y, floor)
    def ground(s, x, y, name):
        s.g[y][x] = tid(name); s.c[y][x] = ts()['by_id'][tid(name)]['collision_code']
    def put(s, name, x, y, layer='d'):
        m = ts()['multi'].get(name)
        cells = [(name, x, y)] if m is None else [('%s_%d_%d' % (name, r, c), x + c, y + r) for r in range(m['h']) for c in range(m['w'])]
        L = s.d if layer == 'd' else s.o
        for n, cx, cy in cells:
            assert 0 <= cx < s.w and 0 <= cy < s.h, (s.id, name, cx, cy)
            assert L[cy][cx] == 0, (s.id, 'overlap', name, cx, cy)
            L[cy][cx] = tid(n)
            code = ts()['by_id'][tid(n)]['collision_code']
            if layer == 'd' and (code != 0 or cy < 3):
                s.c[cy][cx] = max(s.c[cy][cx], code) if code not in (4, 5, 6, 7, 2) else code
        return s
    def rug(s, color, x, y, w, h):
        for yy in range(h):
            for xx in range(w):
                r = 0 if yy == 0 else (2 if yy == h - 1 else 1); c = 0 if xx == 0 else (2 if xx == w - 1 else 1)
                s.put('i_rug_%s_%d_%d' % (color, r, c), x + xx, y + yy)
    def door(s, name, x, y, to, tx, ty, facing='down', note='', pair_with=None, arrival=None):
        s.put(name, x, y); s.c[y][x] = 4
        w = {'x': x, 'y': y, 'to': to, 'tx': tx, 'ty': ty, 'facing': facing, 'note': note}
        if pair_with: w['pair_with'] = pair_with
        s.warps.append(w)
        if arrival is not None: w['arrival'] = arrival
        return w
    def exit_mat(s, x, region, to='$return', tx=0, ty=0, pair_with=None, note=''):
        """bottom-row mat. Entering from outside lands on (x, h-2) facing up."""
        y = s.h - 1
        arr = {'x': x, 'y': y - 1, 'facing': 'up'}
        if pair_with is not None: pair_with = dict(pair_with, interior_arrival=[x, y - 1])
        return s.door(getattr(s, 'mat', None) or ('i_mat_' + region), x, y, to, tx, ty, 'down', note or 'exit to the street', pair_with)
    def npc(s, id, x, y, facing='down', kind='TBD', note='', text_ref=None):
        n = {'id': id, 'x': x, 'y': y, 'facing': facing, 'kind': kind, 'note': note}
        n['text_ref'] = text_ref or ('npc.%s' % id)
        s.npcs.append(n)
    def sign(s, x, y, note, text_ref):
        s.signs.append({'x': x, 'y': y, 'note': note, 'text_ref': text_ref})
    def item(s, x, y, item, note=''):
        s.items.append({'x': x, 'y': y, 'item': item, 'hidden': False, 'note': note})
    def to_json(s):
        out = {'name': s.id, 'title': s.title, 'width': s.w, 'height': s.h, 'tile_size': 64, 'tileset': '../tileset_interiors.json',
               'region': s.region, 'kind': s.kind,
               'layers': {'ground': s.g, 'decoration': s.d, 'overlay': s.o, 'collision': s.c, 'encounter': s.e},
               'warps': s.warps, 'exits': s.exits, 'npcs': s.npcs, 'signs': s.signs, 'items': s.items, 'encounter_zones': [], 'movement': MOVE}
        out.update(s.extra)
        return out
    def save(s):
        os.makedirs(os.path.join(D, 'maps'), exist_ok=True)
        p = os.path.join(D, 'maps', s.id + '.json')
        js = s.to_json()
        # compact rows for readability
        txt = json.dumps(js, indent=1)
        json.dump(js, open(p, 'w'), indent=1)
        return p
