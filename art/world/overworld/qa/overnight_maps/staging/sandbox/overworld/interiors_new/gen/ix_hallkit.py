"""ASCII hall builder. Rows given from y=3 (rows 0-2 are the back wall)."""
from ix_mapkit import Room, tid
GLYPH = {
 '.': None, '#': 'i_railing', '%': 'VOID', 'c': 'CRACK', '=': 'CRUST', '~': 'PIT', 'L': 'plate_latch', 'H': 'plate_hold', 'g': 'railgap',
 '-': 'RAILH', '|': 'RAILV', 'G': 'gate', 'X': 'laser', '*': 'crystal', 'R': 'reset', 'W': 'bellows', '/': 'mirror0', '\\': 'mirror1',
 'E': 'emitter', 'O': 'receiver', 'B': 'boulder', 'Q': 'power_cube', 'C': 'cool_stone', 'D': 'cool_stone_dam', 'S': 'lavasrc', 'l': 'lava', 'u': 'basin',
 'T': 'trainer', 'M': 'master', 'm': 'mat', 'v': 'ledge', 'P': 'beamplate', 'K': 'seal', 'k': 'seal_on'}
def build_hall(mid, title, region, wall, floor, rows, props, deco=(), npcs=None, mats_to=None, pair=None, windows=(), rules='', solution='', extra=None, w=None):
    W = w or max(len(r) for r in rows); H = len(rows) + 3
    rm = Room(mid, title, W, H, wall, floor, windows=windows, region=region, kind='hall')
    P = {'boulders': [], 'switches': [], 'gates': [], 'mirrors': [], 'emitters': [], 'resets': [], 'crust': {'cracked': []}}
    cnt = {}; lava = {'cells': set(), 'basins': {}, 'source': None}
    trainers = []; master = None; mats = []
    def nid(prefix):
        cnt[prefix] = cnt.get(prefix, 0) + 1; return '%s%d' % (prefix, cnt[prefix])
    for yy, row in enumerate(rows):
        y = yy + 3
        for x, ch in enumerate(row.ljust(W, '.')):
            g = GLYPH.get(ch, 'UNKNOWN')
            if g is None: continue
            if g == 'UNKNOWN': raise ValueError('glyph %r at %d,%d in %s' % (ch, x, y, mid))
            if g == 'i_railing': rm.put('i_railing', x, y)
            elif g == 'VOID': rm.ground(x, y, 'i_void')
            elif g == 'CRACK': rm.ground(x, y, 'i_crust_cracked'); P['crust']['cracked'].append([x, y])
            elif g == 'CRUST': rm.ground(x, y, 'i_crust_' + 'abc'[(x * 7 + y * 3) % 3])
            elif g == 'PIT': rm.ground(x, y, 'i_brine_pit')
            elif g == 'RAILH': rm.ground(x, y, 'i_rail_h')
            elif g == 'RAILV': rm.ground(x, y, 'i_rail_v')
            elif g == 'ledge': rm.put('i_ledge_s', x, y)
            elif g in ('plate_latch', 'plate_hold', 'beamplate'):
                i = nid({'plate_latch': 'L', 'plate_hold': 'H', 'beamplate': 'P'}[g])
                rm.put('i_plate_off' if g == 'plate_latch' else 'i_holdplate_off', x, y)
                P['switches'].append({'id': i, 'x': x, 'y': y, 'type': 'plate', 'channel': 'A', 'mode': {'plate_latch': 'latch', 'plate_hold': 'hold', 'beamplate': 'beam'}[g], 'start_on': False})
            elif g == 'railgap':
                i = nid('g'); rm.ground(x, y, 'i_rail_gap')
                P['switches'].append({'id': i, 'x': x, 'y': y, 'type': 'plate', 'channel': 'A', 'mode': 'hold', 'start_on': False})
            elif g in ('gate', 'laser'):
                i = nid('G' if g == 'gate' else 'X'); rm.put('i_gate_closed' if g == 'gate' else 'i_laser_closed', x, y)
                P['gates'].append({'id': i, 'x': x, 'y': y, 'channel': 'A', 'kind': g})
            elif g == 'crystal':
                i = nid('c'); P['switches'].append({'id': i, 'x': x, 'y': y, 'type': 'crystal', 'channel': 'A', 'mode': 'toggle', 'toggles': [i], 'start_on': False})
            elif g in ('seal', 'seal_on'):
                i = nid('s'); P['switches'].append({'id': i, 'x': x, 'y': y, 'type': 'crystal', 'channel': 'Z', 'mode': 'seal', 'source': 'A', 'start_on': False})
            elif g in ('reset', 'bellows'):
                i = nid('R' if g == 'reset' else 'W'); rm.put('i_crystal_reset' if g == 'reset' else 'i_bellows', x, y)
                P['resets'].append({'id': i, 'x': x, 'y': y})
            elif g in ('mirror0', 'mirror1'):
                i = nid('mir'); P['mirrors'].append({'id': i, 'x': x, 'y': y, 'start': 0 if g == 'mirror0' else 1})
                rm.put('i_mirror_slash' if g == 'mirror0' else 'i_mirror_back', x, y)
            elif g == 'emitter':
                i = nid('E'); rm.put('i_beam_emitter', x, y); P['emitters'].append({'id': i, 'x': x, 'y': y, 'dir': 'D'})
            elif g == 'receiver':
                i = nid('O'); rm.put('i_beam_receiver_off', x, y)
                P['switches'].append({'id': i, 'x': x, 'y': y, 'type': 'receiver', 'channel': 'A', 'mode': 'beam', 'start_on': False})
            elif g in ('boulder', 'power_cube', 'cool_stone'):
                i = nid({'boulder': 'b', 'power_cube': 'cube', 'cool_stone': 'stone'}[g])
                rm.put('i_' + g, x, y); P['boulders'].append({'id': i, 'x': x, 'y': y, 'kind': g})
            elif g == 'cool_stone_dam':  # cooling stone already sitting in a channel cell (a dam)
                rm.ground(x, y, 'i_channel'); lava['cells'].add((x, y))
                i = nid('stone'); rm.put('i_cool_stone', x, y); P['boulders'].append({'id': i, 'x': x, 'y': y, 'kind': 'cool_stone'})
            elif g == 'lavasrc':
                rm.ground(x, y, 'i_lava'); rm.c[y][x] = 1; lava['source'] = (x, y)
            elif g == 'lava':
                rm.ground(x, y, 'i_channel'); lava['cells'].add((x, y))
            elif g == 'basin':
                i = nid('u'); rm.put('i_basin_empty', x, y); lava['basins'][(x, y)] = i
                P['switches'].append({'id': i, 'x': x, 'y': y, 'type': 'basin', 'channel': 'A', 'mode': 'basin', 'start_on': False})
            elif g == 'trainer': trainers.append((x, y))
            elif g == 'master': master = (x, y)
            elif g == 'mat': mats.append((x, y))
    if lava['source']:
        cells = lava['cells'] | set(lava['basins']) | {lava['source']}
        nxt = {}
        for (x, y) in cells:
            if (x, y) in lava['basins']: continue
            nb = [(x + dx, y + dy) for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)) if (x + dx, y + dy) in cells and (x + dx, y + dy) != lava['source']]
            nxt['%d,%d' % (x, y)] = [list(c) for c in nb]
        P['lava'] = {'source': list(lava['source']), 'next': nxt, 'basins': {'%d,%d' % k: v for k, v in lava['basins'].items()},
                     'note': 'flood model: lava fills every channel cell connected to the source that is not cut off by a cooling stone; '
                             'cells cut off downstream cool (walkable). Filled basins latch their heat switch.'}
    for o in deco: rm.put(*o)
    # per-id overrides
    allp = {q['id']: q for q in P['switches'] + P['gates'] + P['mirrors'] + P['emitters'] + P['resets'] + P['boulders']}
    for k, v in props.items():
        if k.startswith('_'): continue
        allp[k].update(v)
        if 'start_on' in v and allp[k].get('type') == 'crystal' and v['start_on']: rm.d[allp[k]['y']][allp[k]['x']] = 0
    for q in P['switches']:
        if q['type'] == 'crystal':
            x, y = q['x'], q['y']; rm.d[y][x] = 0
            rm.put('i_crystal_on' if q.get('start_on') else 'i_crystal_off', x, y)
    # mats
    for (x, y) in mats:
        w_ = rm.door('i_mat_' + {'salt': 'salt', 'revival': 'revival', 'lantern': 'lantern', 'cinder': 'cinder', 'aurelith': 'aurelith'}[region_key(region)], x, y,
                     '$return', 0, 0, 'down', 'exit', pair_with=dict(pair, interior_arrival=[mats[0][0], mats[0][1] - 1]) if pair else None)
    for k, (x, y) in enumerate(trainers):
        rm.put('i_trainer_mark', x, y)
        rm.npc('%s_trainer_%d' % (mid, k + 1), x, y, (npcs or {}).get('t%d' % (k + 1), 'down'), 'trainer', 'hall trainer, sight 3', 'maps.%s.trainer_%d' % (mid, k + 1))
    if master:
        rm.put('i_master_mark', *master)
        rm.npc('master_' + region, master[0], master[1], 'down', 'master', 'Master of %s - battle when you reach the ring tile below' % region, 'maps.%s.master' % mid)
    P['start'] = [mats[0][0], mats[0][1] - 1]
    P['goal'] = {'x': master[0], 'y': master[1] + 1, 'what': 'ring tile in front of the Master'}
    P['rules'] = rules; P['solution'] = solution
    for k in [k for k, v in P.items() if v in ([], {'cracked': []})]: P.pop(k)
    if extra: P.update(extra)
    rm.extra['puzzle'] = P
    return rm
def region_key(r):
    return {'saltmere': 'salt', 'revival_heights': 'revival', 'lanternport': 'lantern', 'cindervale': 'cinder', 'aurelith': 'aurelith'}[r]
