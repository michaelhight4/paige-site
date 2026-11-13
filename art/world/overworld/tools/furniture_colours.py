# Furniture-colour check (GAME_QUALITY_CHECKLIST: "Furniture never shares colour codes with the floor or walls", Oct 22 2026, Gary).
# For every interior map and every recolour scheme that applies to it, classify the tiles it draws into floor / wall / furniture
# (furniture + props + rugs) and report any opaque hex code that a furniture tile shares with the floor or wall tiles on that map.
# Not counted (never recoloured, not furniture): doors, mats, stairs, windows, lights (lamps, braziers, fireplace flames), puzzle tiles, NPCs.
# Window-wall tiles count as wall only through their plain-wall pixels (the window glass is a window). Partial-alpha pixels (shadows) are blends, not codes.
import os, sys, json, re
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
SCOPE = ['heal_brookhollow', 'heal_fernwick', 'heal_saltmere', 'rt_branch_backroom', 'lab_brookhollow', 'home_brookhollow_b', 'home_brookhollow_b_2f',
         'home_fernwick_a', 'home_fernwick_a_2f', 'home_brookhollow_a', 'home_fernwick_c', 'home_lanternport_c', 'home_lanternport_c_2f',
         'home_saltmere_a', 'shop_int', 'station_int', 'house_1f', 'house_2f', 'office_int', 'fernwick_hall_int']
SKIP = re.compile(r'(^i_mat_|door_mat|_mat$|stairs|staffdoor|window|_win_|win$|lamp|light|brazier|crystal_switch|gate_|plate_|handcar|x_station_mat)')
FLOOR_NAMES = re.compile(r'(^i_floor_|^floor_|x_station_floor|x_platform_floor|x_platform_edge|x_rail_h|arena_ring|^dais_)')
WALL_NAMES = re.compile(r'(^i_wall_|^iwall_|^x_iwall_|^pillar_|x_station_pillar)')
def cls(e):
    n = e['name']
    if SKIP.search(n) or e.get('category') in ('door', 'puzzle', 'overlay'): return None
    if e.get('category') == 'floor' or FLOOR_NAMES.search(n): return 'floor'
    if e.get('category') == 'wall' or WALL_NAMES.search(n): return 'wall'
    return 'furniture'
_TS = None; _SH = {}
def tileset():
    global _TS
    if _TS is None:
        ts = json.load(open(os.path.join(OUT, 'tileset.json'))); _TS = {e['id']: e for e in ts['tiles']}
    return _TS
def tile_px(e):
    p = os.path.join(OUT, e['sheet'])
    if p not in _SH: _SH[p] = np.array(Image.open(p).convert('RGBA'))
    a = _SH[p]; x, y = e['col'] * 64, e['row'] * 64
    return a[y:y + 64, x:x + 64]
def recolour_doc():
    return json.load(open(os.path.join(OUT, 'interiors_new', 'home_recolours.json')))
def codes(e, scheme_map, doc, masks):
    a = tile_px(e); op = a[..., 3] == 255
    key = (a[..., 0].astype(np.int64) << 16) | (a[..., 1].astype(np.int64) << 8) | a[..., 2]
    if scheme_map and e['name'] in doc['recolourable']:
        mk = masks.get(e['name']); reg = op & (mk if mk is not None else True); key = key.copy()
        orig = key.copy()
        for s, d in scheme_map.items():
            key[reg & (orig == int(s[1:], 16))] = int(d[1:], 16)
    return {'%06x' % v for v in np.unique(key[op])}
def map_schemes(doc):
    """map -> schemes that can apply to it (shared home designs get their own design's schemes; everything else is drawn as-is)."""
    sys.path.insert(0, HERE); import interiors_merge as I
    out = {m: ['identity'] for m in SCOPE}
    for h in I.HOME_POOL:
        ids = ['identity'] + [k for k, v in doc['schemes'].items() if v.get('design') == h['id']]   # each design only draws its own schemes
        for m in [h['map']] + ([h['upstairs']] if h.get('upstairs') else []) + list(I.SUB_FLOORS.get(h['map'], [])): out[m] = ids
    return out
def check(write=True):
    doc = recolour_doc(); TS = tileset()
    masks = {n: (np.array(Image.open(os.path.join(OUT, 'interiors_new', v['mask']))) == 255) for n, v in doc['recolourable'].items() if v.get('mask')}
    sch = map_schemes(doc); rows = []; P = []
    for m in SCOPE:
        L = json.load(open(os.path.join(OUT, 'maps', m + '.json')))['layers']
        ids = {v for lay in ('ground', 'decoration', 'overlay') for r in L[lay] for v in r if v}
        tiles = [(TS[i], cls(TS[i])) for i in sorted(ids)]
        for s in sch[m]:
            mp = doc['schemes'][s]['map']
            surf = {}
            for e, c in tiles:
                if c in ('floor', 'wall'):
                    for h in codes(e, mp, doc, masks): surf.setdefault(h, set()).add(f"{c}:{e['name']}")
            for e, c in tiles:
                if c != 'furniture': continue
                for h in sorted(codes(e, mp, doc, masks) & set(surf)):
                    rows.append(dict(map=m, scheme=s, tile=e['name'], hex=h, shared_with=sorted(surf[h])))
    for r in rows: P.append(f"{r['map']} [{r['scheme']}] {r['tile']} #{r['hex']} = {', '.join(r['shared_with'][:3])}")
    if write:
        os.makedirs(os.path.join(OUT, 'qa', 'furniture_colours'), exist_ok=True)
        json.dump(dict(rule='Furniture never shares colour codes with the floor or walls (GAME_QUALITY_CHECKLIST, Oct 22 2026)', maps=sch,
                       overlaps=len(rows), unique_tile_hex=len({(r['tile'], r['hex']) for r in rows}), rows=rows),
                  open(os.path.join(OUT, 'qa', 'furniture_colours', 'report.json'), 'w'), indent=1)
    return P, rows
if __name__ == '__main__':
    P, rows = check()
    print(len(rows), 'overlaps')
    import collections
    print(collections.Counter(r['hex'] for r in rows).most_common(30))
    print(collections.Counter((r['tile'], r['hex']) for r in rows if r['scheme'] == 'identity').most_common(400))
