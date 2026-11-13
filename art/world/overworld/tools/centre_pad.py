# Centre-camera padding pass (Gary, Oct 23 2026 9:14 AM CT; World Design pipeline pass, DEV/DRAFT).
# The camera no longer clamps at map edges (Coder), so every OUTDOOR map and every CAVE gets a decorative, non-walkable
# border of PX tiles left/right and PY tiles top/bottom. Interiors are untouched (Coder fills around them with dark void).
#   * approach (a): the map grows by 2*PX x 2*PY and EVERY coordinate moves by (+PX, +PY) (the engine has no negative coords).
#   * edge treatment per pad cell = the nearest original edge cell: water stays water, cave wall/floor -> cave wall (rock),
#     land -> same ground + tree border (dark trees where the edge is dark/treed, snow pines on snow via overnight_tiles),
#     a bush/rock instead of a tree where a canopy would cover a walkable cell. Ground variants keep their old hash
#     (build.resolve subtracts m.pad_offset), so the original area renders pixel-identical.
#   * every edge exit gets a corridor through the pad (the edge cells' ground, no deco); exits start/end move +PX (north/south) or +PY (west/east) and stay on
#     the new map edge, so Coder's exitFor/exitSpawn still work (offsets unchanged, both maps are padded alike).
#   * pad cells: collision 1 (cforce; corridors keep their own collision), encounter 0 (build.finalize, m.pad_cells).
#   * idempotent: a map that already has m.pad_offset is skipped (the build is in memory, so each run pads once).
# Called by run.py right after storm.make_variants (before finalize). Hard-coded post-finalize coordinates in other tools
# (storm.check, world_data FIREFLY_RECTS, club.late) add getattr(m, 'pad_offset', (0, 0)).
import re
import progression

# Pad size source: qa/centre_camera/PADDING.md (Coder, Oct 23 2026 9:16 AM CT) "Recommended border: Left/right 12 tiles,
# Top/bottom 7 tiles" (widest view = 932x430 @3x phone at zoom 2). Change these two numbers if that file changes.
PADX, PADY = 12, 7
PAD = (PADX, PADY)
WATERS = ('water', 'cave_water', 'deep', 'flood')
ROCKS = ('cavewall', 'cave')
TREE_BASES = {'tree_base': 'tree_top', 'treed_base': 'treed_top'}
LOG = []            # human-readable per-map notes (OFFSETS.md)
INFO = {}           # name -> dict for OFFSETS.json / map meta

def padded(name):
    return (not progression.INDOOR_OR_CAVE(name)) or name.startswith('greystone')

def _clamp(v, n): return 0 if v < 0 else (n - 1 if v >= n else v)

def _corridors(m, W, H, P):
    """exit cells extended through the pad: {(nx, ny): (ox, oy) source edge cell} in NEW coords"""
    PX, PY = P; cor = {}
    for ex in m.exits:
        for i in range(ex['start'], ex['end'] + 1):
            if ex['edge'] in ('north', 'south'):
                for k in range(PY):
                    if ex['edge'] == 'north': cor[(i + PX, k)] = (i, 0)
                    else: cor[(i + PX, H + PY + k)] = (i, H - 1)
            else:
                for k in range(PX):
                    if ex['edge'] == 'west': cor[(k, i + PY)] = (0, i)
                    else: cor[(W + PX + k, i + PY)] = (W - 1, i)
    return cor

def _side_summary(kinds, W, H, P):
    PX, PY = P; out = {}
    for side, cells in (('north', [(x, PY - 1) for x in range(PX, PX + W)]), ('south', [(x, PY + H) for x in range(PX, PX + W)]),
                        ('west', [(PX - 1, y) for y in range(PY, PY + H)]), ('east', [(PX + W, y) for y in range(PY, PY + H)])):
        c = {}
        for xy in cells: c[kinds[xy]] = c.get(kinds[xy], 0) + 1
        out[side] = ', '.join(f'{k} {v}' for k, v in sorted(c.items(), key=lambda kv: -kv[1]))
    return out

def pad_grids(m, BYNAME, P=PAD):
    PX, PY = P; W, H = m.w, m.h; NW, NH = W + 2 * PX, H + 2 * PY
    pre = hasattr(m, 'pre')
    idn = {t['id']: t['name'] for t in BYNAME.values()} if pre else None
    if pre:
        G0, D0, O0, C0, E0 = m.pre
        name_d = lambda x, y: idn.get(D0[y][x]) if D0[y][x] else None
        name_o = lambda x, y: idn.get(O0[y][x]) if O0[y][x] else None
        blocked0 = lambda x, y: C0[y][x] != 0
        terr0 = lambda x, y: 'imported'
    else:
        name_d = lambda x, y: m.deco[y][x]; name_o = lambda x, y: m.over[y][x]
        terr0 = lambda x, y: m.terr[y][x]
        def blocked0(x, y):
            d = m.deco[y][x]; t = m.terr[y][x]
            if m.cforce.get((x, y), 0) not in (0, 4, 7): return True
            if t in WATERS or t in ('cavewall',) or t.startswith('iwall_'): return True
            return bool(d) and not d.startswith('bridge') and BYNAME[d]['coll'] != 'walk'
    cor = _corridors(m, W, H, P)
    pad = {(x, y) for y in range(NH) for x in range(NW) if not (PX <= x < PX + W and PY <= y < PY + H)}
    terr = [[None] * NW for _ in range(NH)]; deco = [[None] * NW for _ in range(NH)]; over = [[None] * NW for _ in range(NH)]
    for y in range(H):
        for x in range(W):
            terr[y + PY][x + PX] = m.terr[y][x]; deco[y + PY][x + PX] = m.deco[y][x]; over[y + PY][x + PX] = m.over[y][x]
    kind = {}; dark_of = {}
    base_land = m.base if m.base not in WATERS + ROCKS + ('path', 'trail', 'imported') else 'grass'
    for (x, y) in pad:
        if (x, y) in cor:
            sx, sy = cor[(x, y)]; t = terr0(sx, sy); terr[y][x] = t if not pre else 'imported'
            d = name_d(sx, sy)
            if d and (d in TREE_BASES or d.startswith(('tree', 'snowpine'))): d = 'bush'
            elif d and (d.startswith('bridge') or BYNAME.get(d, {}).get('coll', 'walk') == 'walk'): d = None
            deco[y][x] = d if not pre else None
            kind[(x, y)] = 'corridor'; continue
        cx, cy = _clamp(x - PX, W), _clamp(y - PY, H); t = terr0(cx, cy); d0 = name_d(cx, cy) or ''
        if t in WATERS:
            terr[y][x] = 'water' if t == 'flood' else t; kind[(x, y)] = 'water'
        elif t in ROCKS:
            terr[y][x] = 'cavewall'; kind[(x, y)] = 'rock'
        else:
            terr[y][x] = t if t not in ('path', 'trail') else base_land; kind[(x, y)] = 'trees'
            dark_of[(x, y)] = d0.startswith('treed') or t == 'grass_dark' or bool(getattr(m, 'dark', False)) or pre
    # trees: top to bottom so a pad tree knows whether the cell above can take its canopy
    def above_ok(x, y):
        if y == 0: return True
        a = (x, y - 1)
        if a in pad: return kind.get(a) == 'trees' and over[y - 1][x] is None
        ox, oy = x - PX, y - 1 - PY
        return blocked0(ox, oy) and name_o(ox, oy) is None
    for y in range(NH):
        for x in range(NW):
            if kind.get((x, y)) != 'trees': continue
            dk = dark_of[(x, y)]
            if above_ok(x, y):
                deco[y][x] = 'treed_base' if dk else 'tree_base'
                if y > 0: over[y - 1][x] = 'treed_top' if dk else 'tree_top'
            else:
                deco[y][x] = 'bush' if terr[y][x] in ('grass', 'grass_dark', 'imported') else 'rock'; kind[(x, y)] = 'trees'
    # the original top row's trees had no canopy (it was off-map): give them one now that the cell above exists
    for x in range(PX, PX + W):
        d = deco[PY][x] if not pre else name_d(x - PX, 0)
        if d in TREE_BASES and (x, PY - 1) not in cor and over[PY - 1][x] is None and kind.get((x, PY - 1)) in ('trees',):
            over[PY - 1][x] = TREE_BASES[d]
    m.pad_old_size = (W, H); m.pad_offset = (PX, PY); m.w, m.h = NW, NH
    m.terr, m.deco, m.over = terr, deco, over
    m.pad_cells = pad; m.pad_corridor = set(cor)
    m.cforce = {(x + PX, y + PY): v for (x, y), v in m.cforce.items()}
    for xy in pad:
        if xy not in cor: m.cforce[xy] = 1
    if pre:
        ID = lambda n: BYNAME[n]['id'] if n else 0
        G = [[0] * NW for _ in range(NH)]; D = [[0] * NW for _ in range(NH)]; O = [[0] * NW for _ in range(NH)]
        C = [[1] * NW for _ in range(NH)]; E = [[0] * NW for _ in range(NH)]
        import ground
        for y in range(NH):
            for x in range(NW):
                if (x, y) not in pad:
                    ox, oy = x - PX, y - PY
                    G[y][x], D[y][x], O[y][x], C[y][x], E[y][x] = G0[oy][ox], D0[oy][ox], O0[oy][ox], C0[oy][ox], E0[oy][ox]
                    if O0[oy][ox] == 0 and over[y][x]: O[y][x] = ID(over[y][x])     # new canopy over an original top-row tree
                    continue
                if (x, y) in cor:
                    sx, sy = cor[(x, y)]; G[y][x] = G0[sy][sx]; C[y][x] = C0[sy][sx] if C0[sy][sx] in (0, 7) else 0
                else:
                    gname = idn.get(G0[_clamp(y - PY, H)][_clamp(x - PX, W)], '')
                    mm = re.match(r'^xs_([a-z]+)_\d$', gname)
                    fam = mm.group(1) if mm else 'moss'
                    G[y][x] = BYNAME[f'xs_{fam}_{ground.ground_variant(x - PX, y - PY)}']['id']
                    D[y][x] = ID(deco[y][x]); C[y][x] = 1
                O[y][x] = ID(over[y][x])
        m.pre = (G, D, O, C, E)
        if getattr(m, 'fog_layer', None):
            fl = m.fog_layer; m.fog_layer = [[0] * NW for _ in range(NH)]
            for y in range(H):
                for x in range(W): m.fog_layer[y + PY][x + PX] = fl[y][x]
    kinds = dict(kind); kinds.update({xy: 'corridor' for xy in cor})
    return _side_summary(kinds, W, H, P)

# ---------------- coordinate shift ----------------
_PAIR = lambda v: isinstance(v, (list, tuple)) and len(v) == 2 and all(isinstance(a, int) and not isinstance(a, bool) for a in v)
SKIP_ATTR = {'terr', 'deco', 'over', 'pre', 'fog_layer', 'cforce', 'pad_cells', 'pad_corridor', 'pad_offset', 'pad_old_size', 'w', 'h',
             'gd_tables', 'gd_report', 'name', 'title', 'base', 'snow_pine_cells', 'trail_cells', 'doors', 'item_audit', 'source'}
SKIP_KEY = {'team', 'verified', 'sight_cells', 'gd_tables', 'origin', 'grid_size'}
def _rx_cells(s, P):
    """'x10-18, y10' style strings"""
    d = {'x': P[0], 'y': P[1]}
    return re.sub(r'([xy])(\d+)(?:-(\d+))?', lambda mm: mm.group(1) + str(int(mm.group(2)) + d[mm.group(1)]) + (f'-{int(mm.group(3)) + d[mm.group(1)]}' if mm.group(3) else ''), s)

def _shift(v, P, PADSET, seen, path, hits):
    if id(v) in seen: return
    if isinstance(v, (dict, list)): seen.add(id(v))
    if isinstance(v, dict):
        for k in list(v):
            x = v[k]
            if k in SKIP_KEY: continue
            if k in ('x', 'y', 'x0', 'y0', 'x1', 'y1') and isinstance(x, int) and not isinstance(x, bool):
                v[k] = x + P[k[0] == 'y']; hits.add(f'{path}.{k}')
            elif k in ('tx', 'ty') and isinstance(x, int):
                if v.get('to') in PADSET: v[k] = x + P[k == 'ty']; hits.add(f'{path}.{k}')
            elif k in ('stand',) and _PAIR(x):
                v[k] = [x[0] + P[0], x[1] + P[1]]; hits.add(f'{path}.{k}')
            elif k in ('pocket_cells', 'cells', 'reed_lamp_cells') and isinstance(x, list) and x and all(_PAIR(c) for c in x):
                v[k] = [[c[0] + P[0], c[1] + P[1]] for c in x]; hits.add(f'{path}.{k}[]')
            elif k == 'cells' and isinstance(x, str):
                v[k] = _rx_cells(x, P); hits.add(f'{path}.{k} (str)')
            elif k == 'what' and isinstance(x, str) and re.search(r'x\d+-\d+, y\d+', x):
                v[k] = _rx_cells(x, P); hits.add(f'{path}.{k} (str)')
            elif isinstance(x, (dict, list)):
                _shift(x, P, PADSET, seen, f'{path}.{k}', hits)
    elif isinstance(v, list):
        for x in v:
            if isinstance(x, (dict, list)): _shift(x, P, PADSET, seen, path + '[]', hits)

def shift_map(m, P, PADSET, seen):
    hits = set()
    for ex in m.exits:
        if id(ex) in seen: continue
        d = P[0] if ex['edge'] in ('north', 'south') else P[1]
        seen.add(id(ex)); ex['start'] += d; ex['end'] += d
    for a, v in list(vars(m).items()):
        if a in SKIP_ATTR or a == 'exits' or a.startswith('_'): continue
        if isinstance(v, (dict, list)): _shift(v, P, PADSET, seen, a, hits)
    if getattr(m, 'trail_cells', None) is not None:
        m.trail_cells = type(m.trail_cells)((x + P[0], y + P[1]) for (x, y) in m.trail_cells); hits.add('trail_cells')
    if getattr(m, 'doors', None):
        m.doors = {k: [d[0] + P[0], d[1] + P[1]] for k, d in m.doors.items()}; hits.add('doors')
    return hits

def recompute_snow_pines(m):
    """same rule as overnight_tiles.apply (run after padding so pad trees and the original top row get their snow pines)"""
    if not getattr(m, 'snow_pine_cells', None): return
    snow = sum(row.count('snow') for row in m.terr) / float(m.w * m.h); cells = []
    for y in range(m.h):
        for x in range(m.w):
            if m.deco[y][x] == 'tree_base' and (snow > 0.5 or m.terr[y][x] == 'snow'):
                cells.append((x, y, y > 0 and m.over[y - 1][x] == 'tree_top'))
    m.snow_pine_cells = cells

_DOOR_RX = re.compile(r'(door \()(\d+),\s*(\d+)(\))')
def apply(MAPS, VARIANTS, IX_ROWS, BYNAME, P=PAD):
    allm = MAPS + VARIANTS
    PADSET = {m.name for m in allm if padded(m.name)}
    new = [m for m in allm if m.name in PADSET and not getattr(m, 'pad_offset', None)]
    newset = {m.name for m in new}
    seen = set(); hits_all = {}
    for m in new:
        W, H = m.w, m.h
        sides = pad_grids(m, BYNAME, P)
        hits_all[m.name] = sorted(shift_map(m, P, newset, seen))
        recompute_snow_pines(m)
        _d = lambda e: P[0] if e['edge'] in ('north', 'south') else P[1]
        INFO[m.name] = dict(padded=True, dx=P[0], dy=P[1], old_size=[W, H], new_size=[m.w, m.h], edges=sides,
                            exits=[dict(edge=e['edge'], old=[e['start'] - _d(e), e['end'] - _d(e)], new=[e['start'], e['end']], to=e['to'], handling='corridor')
                                   for e in m.exits])
    # unpadded maps (interiors) that point INTO a padded map
    cross = []
    for m in allm:
        if m.name in PADSET: continue
        INFO.setdefault(m.name, dict(padded=False, reason='interior (dark void around it, Coder)', size=[m.w, m.h]))
        for w in m.warps:
            if w.get('to') in newset and isinstance(w.get('tx'), int):
                w['tx'] += P[0]; w['ty'] += P[1]; cross.append(f"{m.name} warp ({w['x']},{w['y']}) -> {w['to']} ({w['tx']},{w['ty']})")
                if w.get('note'): w['note'] = _DOOR_RX.sub(lambda mm: f'{mm.group(1)}{int(mm.group(2)) + P[0]},{int(mm.group(3)) + P[1]}{mm.group(4)}', w['note'])
        for e in ((getattr(m, 'soul', None) or {}).get('entered_from') or []):
            if e.get('map') in newset:
                for k in ('door', 'return_to'):
                    if _PAIR(e.get(k)): e[k] = [e[k][0] + P[0], e[k][1] + P[1]]
                cross.append(f"{m.name} entered_from {e['map']}")
    for r in IX_ROWS:
        if r.get('exterior') in newset and _PAIR(r.get('door')): r['door'] = [r['door'][0] + P[0], r['door'][1] + P[1]]
    M = {m.name: m for m in allm}
    for r in IX_ROWS:      # rebuild the human 'back' strings from the (now shifted) interior exit warps
        im = M.get(r.get('to'))
        if im is None or not r.get('back'): continue
        bk = []
        for b in r['back']:
            mm = re.match(r'^(\w+) \((\d+),(\d+)\)$', b)
            bk.append(f'{mm.group(1)} ({int(mm.group(2)) + P[0]},{int(mm.group(3)) + P[1]})' if mm and mm.group(1) in newset else b)
        r['back'] = bk
    LOG.extend(cross)
    return dict(padded=sorted(newset), hits=hits_all, cross=cross)
