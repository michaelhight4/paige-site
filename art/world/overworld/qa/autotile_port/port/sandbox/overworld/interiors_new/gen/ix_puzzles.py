"""Puzzle engine + BFS solver for the interior Master halls (own solver; run.py is not touched).
Verbs: push boulders/power cubes/cooling stones, latch + hold plates, toggle crystals (linked sets), crystal & laser gates,
cracked salt crust (walk once -> brine pit), rotating mirrors + beam receivers, lava channels dammed by cooling stones
(basins heat latches), reset crystal / bellows, gauntlet wing reset-on-exit + seals."""
import copy
from collections import deque
from ix_mapkit import tid, ts
DIRS = {'U': (0, -1), 'D': (0, 1), 'L': (-1, 0), 'R': (1, 0)}
WALKC = {0, 7, 9}

class Puzzle:
    def __init__(s, m):
        s.m = m; P = m['puzzle']; s.P = P
        s.w, s.h = m['width'], m['height']
        s.base = [row[:] for row in m['layers']['collision']]
        s.npc = {(n['x'], n['y']) for n in m['npcs']}
        s.sw = {q['id']: q for q in P.get('switches', [])}
        s.swids = [q['id'] for q in P.get('switches', [])]
        s.sw_at = {(q['x'], q['y']): q for q in P.get('switches', [])}
        s.gates = P.get('gates', [])
        s.gate_at = {(g['x'], g['y']): g for g in s.gates}
        s.bould0 = tuple(sorted((b['x'], b['y'], b.get('kind', 'boulder')) for b in P.get('boulders', [])))
        s.crust = {tuple(c) for c in P.get('crust', {}).get('cracked', [])}
        s.mir = P.get('mirrors', []); s.mir_at = {(q['x'], q['y']): i for i, q in enumerate(s.mir)}
        s.emit = P.get('emitters', [])
        s.resets = {(r['x'], r['y']): r for r in P.get('resets', [])}
        s.no_push = {tuple(c) for c in P.get('no_push', [])}  # sills: crates/boulders can never be pushed onto these cells
        L = P.get('lava')
        s.lava = None
        if L:
            s.lava = dict(source=tuple(L['source']), nxt={tuple(map(int, k.split(','))): [tuple(v) for v in vs] for k, vs in L['next'].items()},
                          basins={tuple(map(int, k.split(','))): v for k, v in L['basins'].items()})
            s.lava_cells = set(s.lava['nxt']) | {c for vs in s.lava['nxt'].values() for c in vs} | {s.lava['source']}
            if L.get('trunk'):  # spill model: lava runs down the trunk to the drain; side branches only fill when the trunk is dammed below their junction
                s.lava['trunk'] = [tuple(c) for c in L['trunk']]
                s.lava['spill'] = [(tuple(j), tuple(b)) for j, b in L['spill']]
        else:
            s.lava_cells = set()
        s.zones = P.get('zones', [])
        # cells occupied by puzzle pieces count as floor for movement; their blocking comes from state
        for (x, y) in list(s.gate_at) + [(b[0], b[1]) for b in s.bould0] + list(s.crust):
            s.base[y][x] = 0
        for (x, y), q in s.sw_at.items():
            s.base[y][x] = 7 if q['type'] == 'plate' else 1
        s.start = tuple(P['start']); s.goal = (P['goal']['x'], P['goal']['y'])
    # ---- state: (pos, boulders, switchbits, pits, mirrorbits)
    def initial(s):
        bits = tuple(1 if s.sw[i].get('start_on') else 0 for i in s.swids)
        mb = tuple(q.get('start', 0) for q in s.mir)
        st = (s.start, s.bould0, bits, frozenset(), mb)
        return s.settle(st)
    def derive(s, st):
        pos, B, bits, pits, mb = st
        bset = {(b[0], b[1]): b[2] for b in B}
        on = dict(zip(s.swids, bits))
        # hold plates
        for i in s.swids:
            q = s.sw[i]
            if q['mode'] == 'hold': on[i] = 1 if (q['x'], q['y']) in bset or (q.get('player_holds') and pos == (q['x'], q['y'])) else 0
        # beams
        beam = set()
        for e in s.emit:
            x, y = e['x'], e['y']; dx, dy = DIRS[e['dir']]
            for _ in range(400):
                x += dx; y += dy
                if not (0 <= x < s.w and 0 <= y < s.h): break
                if (x, y) in s.mir_at:
                    beam.add((x, y, 'x'))
                    k = mb[s.mir_at[(x, y)]]
                    dx, dy = ((-dy, -dx) if k == 0 else (dy, dx)); continue
                q = s.sw_at.get((x, y))
                if q and q['type'] == 'receiver':
                    on[q['id']] = 1 if q['mode'] == 'beam' else on[q['id']]; break
                if (x, y) in bset: break
                if s.base[y][x] == 1 and (x, y) not in s.gate_at: break
                beam.add((x, y, 'h' if dx else 'v'))
                if q and q['type'] == 'plate' and q['mode'] in ('hold', 'beam'): on[q['id']] = 1
        # lava
        hot = set(); filled = set()
        if s.lava:
            src = s.lava['source']; hot.add(src); dq = deque([src])
            if s.lava.get('trunk'):
                T = s.lava['trunk']; k = next((i for i, c in enumerate(T) if c in bset), len(T))
                hot.update(T[:k]); dq = deque()
                if k < len(T):
                    tset = set(T)
                    for j, b in s.lava['spill']:
                        if T.index(j) < k and b not in bset and b not in hot: hot.add(b); dq.append(b)
                    s_trunk = tset
                else: s_trunk = set(T)
            else: s_trunk = set()
            while dq:
                c = dq.popleft()
                if c in s.lava['basins']: filled.add(s.lava['basins'][c]); continue
                for n in s.lava['nxt'].get(c, []):
                    if n in bset or n in hot or n in s_trunk: continue
                    hot.add(n); dq.append(n)
            for i in filled: on[i] = 1
        return on, beam, hot, bset
    def channels(s, on):
        ch = {}
        for i in s.swids:
            q = s.sw[i]
            for c in ([q['channel']] if isinstance(q.get('channel'), str) else q.get('channel', [])):
                v = on[i]
                if c in q.get('invert_in', []): v = 1 - v
                ch[c] = ch.get(c, True) and bool(v)
        return ch
    def gates_open(s, ch):
        return {(g['x'], g['y']) for g in s.gates if any(ch.get(c, False) for c in (g['channel'] if isinstance(g['channel'], list) else [g['channel']]))}
    def settle(s, st):
        """apply latches driven by derived state (basins, seals) until stable"""
        for _ in range(8):
            pos, B, bits, pits, mb = st
            on, beam, hot, bset = s.derive(st)
            ch = s.channels(on)
            nb = list(bits)
            for k, i in enumerate(s.swids):
                q = s.sw[i]
                if q['mode'] == 'basin' and on[i]: nb[k] = 1
                if q['mode'] == 'seal' and ch.get(q['source'], False): nb[k] = 1
                if q['mode'] == 'latch' and (pos == (q['x'], q['y']) or (q['x'], q['y']) in bset): nb[k] = 1
            nst = (pos, B, tuple(nb), pits, mb)
            if nst == st: return st
            st = nst
        return st
    def blocked_for_player(s, x, y, st, bset, gopen, hot, pits):
        if not (0 <= x < s.w and 0 <= y < s.h): return True
        if (x, y) in s.npc or (x, y) in pits or (x, y) in hot: return True
        if (x, y) in s.gate_at and (x, y) not in gopen: return True
        return s.base[y][x] not in WALKC
    def moves(s, st):
        pos, B, bits, pits, mb = st
        on, beam, hot, bset = s.derive(st)
        gopen = s.gates_open(s.channels(on))
        out = []
        for d, (dx, dy) in DIRS.items():
            x, y = pos[0] + dx, pos[1] + dy
            npits = pits | ({pos} if pos in s.crust else set())
            if (x, y) in bset:
                kind = bset[(x, y)]; bx, by = x + dx, y + dy
                if s.blocked_for_player(bx, by, st, bset, gopen, set() if kind == 'cool_stone' else hot, npits) or (bx, by) in bset or (bx, by) in s.crust or (bx, by) in s.no_push \
                        or (bx, by) == pos or (kind != 'cool_stone' and (bx, by) in s.lava_cells and (bx, by) in hot):
                    continue
                if kind != 'cool_stone' and (bx, by) in s.lava_cells: continue
                nB = tuple(sorted([b for b in B if (b[0], b[1]) != (x, y)] + [(bx, by, kind)]))
                out.append((d + '*', s.after_move((pos, nB, bits, frozenset(npits), mb), (x, y))))
                continue
            if (x, y) in pits and s.P.get('pit_rule') == 'wash_back':
                out.append((d + '~', s.wash_back(st)))
                continue
            if 0 <= x < s.w and 0 <= y < s.h and s.base[y][x] == 2 and d == 'D':
                jx, jy = x, y + 1
                if not s.blocked_for_player(jx, jy, st, bset, gopen, hot, npits) and (jx, jy) not in bset:
                    out.append(('J', s.after_move((pos, B, bits, frozenset(npits), mb), (jx, jy))))
                continue
            if s.blocked_for_player(x, y, st, bset, gopen, hot, npits): continue
            out.append((d, s.after_move((pos, B, bits, frozenset(npits), mb), (x, y))))
        out = [(a, ns) for a, ns in out if ns[0] not in s.derive(ns)[2]]
        # interactions with adjacent things
        for d, (dx, dy) in DIRS.items():
            c = (pos[0] + dx, pos[1] + dy)
            q = s.sw_at.get(c)
            if q and q['type'] == 'crystal' and q['mode'] == 'toggle':
                nb = list(bits)
                for t in q.get('toggles', [q['id']]):
                    k = s.swids.index(t); nb[k] ^= 1
                out.append(('A' + q['id'], s.settle((pos, B, tuple(nb), pits, mb))))
            if c in s.mir_at:
                k = s.mir_at[c]; nm = list(mb); nm[k] ^= 1
                out.append(('A' + s.mir[k]['id'], s.settle((pos, B, bits, pits, tuple(nm)))))
            if c in s.resets:
                out.append(('A' + s.resets[c]['id'], s.do_reset(st, s.resets[c])))
        return out
    def wash_back(s, st):
        pos, B, bits, pits, mb = st
        nb = list(bits)
        for k, i in enumerate(s.swids):
            if s.sw[i].get('reset_with_crust'): nb[k] = 0
        return s.settle((s.start, B, tuple(nb), frozenset(), mb))
    def do_reset(s, st, r):
        pos, B, bits, pits, mb = st
        keep = set(r.get('keep', []))
        nb = list(bits)
        for k, i in enumerate(s.swids):
            q = s.sw[i]
            if (q['mode'] in ('toggle',) or q.get('reset_with_crust')) and i not in keep: nb[k] = 1 if q.get('start_on') else 0
        what = r.get('resets', ['boulders', 'crust', 'mirrors', 'crystals'])
        nB = s.bould0 if 'boulders' in what else B
        nB = tuple(b for b in nB if (b[0], b[1]) != pos)  # never reset a boulder onto the player
        if len(nB) != len(s.bould0): nB = B
        return s.settle((pos, nB, tuple(nb) if 'crystals' in what else bits, frozenset() if 'crust' in what else pits,
                         tuple(q.get('start', 0) for q in s.mir) if 'mirrors' in what else mb))
    def in_zone(s, z, p):
        x0, y0, x1, y1 = z['rect']; return x0 <= p[0] <= x1 and y0 <= p[1] <= y1
    def after_move(s, st, np):
        pos, B, bits, pits, mb = st
        st = (np, B, bits, pits, mb)
        st = s.settle(st)
        for z in s.zones:
            if s.in_zone(z, pos) and not s.in_zone(z, np):
                k = s.swids.index(z['seal'])
                if not st[2][k]:
                    st = s.zone_reset(st, z)
        return st
    def zone_reset(s, st, z):
        pos, B, bits, pits, mb = st
        nB = tuple(sorted([b for b in B if not s.in_zone(z, b)] + [b for b in s.bould0 if s.in_zone(z, b)]))
        nb = list(bits)
        for k, i in enumerate(s.swids):
            q = s.sw[i]
            if s.in_zone(z, (q['x'], q['y'])) and q['mode'] != 'seal': nb[k] = 1 if q.get('start_on') else 0
        nm = tuple((q.get('start', 0) if s.in_zone(z, (q['x'], q['y'])) else mb[k]) for k, q in enumerate(s.mir))
        npits = frozenset(p for p in pits if not s.in_zone(z, p))
        return s.settle((pos, nB, tuple(nb), npits, nm))
    def solve(s, limit=2_500_000):
        """full BFS over the puzzle state graph; returns the first goal state (shortest), path, size, and the reverse graph"""
        st0 = s.initial()
        prev = {st0: None}; q = deque([st0]); found = None; rev = {}
        while q:
            st = q.popleft()
            if st[0] == s.goal and found is None: found = st
            for a, ns in s.moves(st):
                rev.setdefault(ns, []).append(st)
                if ns not in prev:
                    prev[ns] = (st, a); q.append(ns)
            if len(prev) > limit: s.truncated = True; break
        path = []
        if found:
            c = found
            while prev[c]:
                c, a = prev[c][0], prev[c][1]; path.append(a)
            path.reverse()
        s.rev = rev
        return found, path, len(prev), prev
    def softlock_check(s, prev, exits):
        """reverse BFS in the explored state graph from every state where the player stands next to an exit mat:
        returns the number of reachable states that can never get back to an exit (soft-locks)."""
        arrivals = set()
        for (x, y) in exits:
            for dx, dy in DIRS.values(): arrivals.add((x + dx, y + dy))
        good = {st for st in prev if st[0] in arrivals}
        dq = deque(good)
        while dq:
            st = dq.popleft()
            for p in s.rev.get(st, []):
                if p not in good: good.add(p); dq.append(p)
        bad = [st for st in prev if st not in good]
        s.bad_examples = bad[:3]
        return len(bad)
def compress(path):
    out = []
    for a in path:
        if out and out[-1][0] == a and len(a) <= 2 and not a.startswith('A'): out[-1][1] += 1
        else: out.append([a, 1])
    return ' '.join(a + (str(n) if n > 1 else '') for a, n in out)

import os, json, hashlib, pickle
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.verify_cache')
def _key(m):
    pz = {k: v for k, v in m['puzzle'].items() if k not in ('verified', '_cache')}
    blob = json.dumps([pz, m['layers']['collision'], m['layers']['decoration'], [(n['x'], n['y']) for n in m['npcs']], m['warps']], sort_keys=True)
    return hashlib.sha1((blob + open(__file__).read()).encode()).hexdigest()[:20]
def verify(m, use_cache=True):
    k = _key(m); fn = os.path.join(CACHE, k + '.pkl')
    if use_cache and os.path.exists(fn):
        found, path, n, bad = pickle.load(open(fn, 'rb'))
        return found, path, n, bad, Puzzle(m)
    P = Puzzle(m)
    found, path, n, prev = P.solve()
    exits = {(w['x'], w['y']) for w in m['warps']}
    bad = P.softlock_check(prev, exits) if found else None
    os.makedirs(CACHE, exist_ok=True); pickle.dump((found, path, n, bad), open(fn, 'wb'))
    return found, path, n, bad, P

LEGEND = 'U/D/L/R step, X* = step that pushes a boulder/cube/stone, J = ledge jump, A<id> = touch crystal/bellows/mirror <id>, n = repeat'
def verified_block(m):
    found, path, n, bad, P = verify(m)
    st = m['puzzle'].get('start')
    return {'solver': 'interiors_new/gen/ix_puzzles.py (full-state BFS, limit 2.5M) + reverse-BFS soft-lock check',
            'start': st, 'solvable': bool(found), 'states_explored': n, 'softlock_states': bad,
            'gated_targets': m['puzzle'].get('goal'), 'shortest_solution': compress(path) if found else None,
            'steps': len(path) if found else None, 'legend': LEGEND}

STATE_TILE = {}
def solved_map(m):
    """map copy showing the solved end state (boulders moved, gates open, crust collapsed, lit beams)"""
    if 'puzzle' not in m: return None
    found, path, n, bad, P = verify(m) if not m['puzzle'].get('_cache') else m['puzzle']['_cache']
    if not found: return None
    m2 = copy.deepcopy(m); L = m2['layers']
    pos, B, bits, pits, mb = found
    on, beam, hot, bset = P.derive(found); gopen = P.gates_open(P.channels(on))
    for b in P.bould0: L['decoration'][b[1]][b[0]] = 0
    for (x, y, k) in B: L['decoration'][y][x] = tid('i_' + k)
    for i, v in zip(P.swids, bits):
        q = P.sw[i]; x, y = q['x'], q['y']; vv = on.get(i, v) if q['mode'] in ('hold', 'beam') else v
        t = L['decoration'][y][x]
        st = ts()['by_id'].get(t, {}).get('states')
        if st and q['type'] != 'crystal' or (st and q['mode'] == 'toggle'):
            if (x, y) not in bset: L['decoration'][y][x] = st['on' if vv else 'off']
        if q['type'] == 'receiver': L['decoration'][y][x] = tid('i_beam_receiver_on' if on[i] else 'i_beam_receiver_off')
    for g in P.gates:
        t = L['decoration'][g['y']][g['x']]; st = ts()['by_id'][t].get('states')
        if st: L['decoration'][g['y']][g['x']] = st['on' if (g['x'], g['y']) in gopen else 'off']
    for (x, y) in pits: L['ground'][y][x] = tid('i_brine_pit')
    for k, q in enumerate(P.mir): L['decoration'][q['y']][q['x']] = tid('i_mirror_back' if mb[k] else 'i_mirror_slash')
    if P.lava:
        for c in P.lava_cells:
            if c in P.lava['basins']: continue
            L['ground'][c[1]][c[0]] = tid('i_lava') if c in hot else tid('i_channel')
        for c, i in P.lava['basins'].items():
            L['decoration'][c[1]][c[0]] = tid('i_basin_full' if on[i] else 'i_basin_empty')
    for (x, y, d) in beam:
        if L['overlay'][y][x] == 0 or d == 'x': L['overlay'][y][x] = tid({'h': 'i_beam_h', 'v': 'i_beam_v', 'x': 'i_beam_x'}[d])
    # collision of the solved state
    for y in range(m['height']):
        for x in range(m['width']):
            if (x, y) in P.gate_at: L['collision'][y][x] = 0 if (x, y) in gopen else 6
            if (x, y) in pits: L['collision'][y][x] = 3
            if (x, y) in P.lava_cells and (x, y) not in P.lava['basins']: L['collision'][y][x] = 1 if (x, y) in hot else 0
    for b in P.bould0: L['collision'][b[1]][b[0]] = P.base[b[1]][b[0]]
    for (x, y, k) in B: L['collision'][y][x] = 5
    m2['npcs'] = [dict(n) for n in m['npcs']]
    m2.pop('puzzle')
    m2['_solved_player'] = list(pos)
    return m2
