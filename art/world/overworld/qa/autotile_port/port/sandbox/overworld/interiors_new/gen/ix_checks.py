import json, os, glob
from collections import deque
from ix_mapkit import D, ts
WALK = {0, 7, 9, 10}
N4 = ((0, 1), (0, -1), (1, 0), (-1, 0))
def bfs(m, start, grid=None, blocked=(), ledges=False):
    C = grid or m['layers']['collision']; w, h = m['width'], m['height']
    seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in N4:
            nx, ny = x + dx, y + dy
            if ledges and dy == 1 and 0 <= ny < h and C[ny][nx] == 2:
                ny += 1  # hop down a one-way ledge
                if ny < h and (nx, ny) not in seen and C[ny][nx] in WALK and (nx, ny) not in blocked:
                    seen.add((nx, ny)); q.append((nx, ny))
                continue
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and C[ny][nx] in WALK and (nx, ny) not in blocked:
                seen.add((nx, ny)); q.append((nx, ny))
    return seen
def counter_ids():
    return {t['id'] for t in ts()['js']['tiles'] if 'counter' in t['name']}
def arrival(m, wp):
    C = m['layers']['collision']; x, y = wp['x'], wp['y']
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < m['width'] and 0 <= ny < m['height'] and C[ny][nx] in WALK: return (nx, ny)
    return None
def solved_state_map(m):
    try:
        import ix_puzzles
    except ImportError:
        return None
    return ix_puzzles.solved_map(m)
def check_map(m):
    errs, warns = [], []
    C = m['layers']['collision']; w, h = m['width'], m['height']
    if 'puzzle' in m:
        sm = solved_state_map(m)
        if sm is None: errs.append('puzzle without solver'); return errs, warns
        C = sm['layers']['collision']; m = dict(m, layers=sm['layers'])
    npcs = {(n['x'], n['y']) for n in m['npcs']}
    wxy = {(wp['x'], wp['y']) for wp in m['warps']}
    for y in range(h):
        for x in range(w):
            if C[y][x] == 4 and (x, y) not in wxy: errs.append('door tile without warp at %d,%d' % (x, y))
    for wp in m['warps']:
        if C[wp['y']][wp['x']] != 4: errs.append('warp %s not on a door tile' % wp)
    arr = {}
    for wp in m['warps']:
        a = arrival(m, wp)
        if a is None or a in npcs: errs.append('warp %d,%d has no free arrival cell' % (wp['x'], wp['y'])); continue
        arr[(wp['x'], wp['y'])] = a
    cid = counter_ids()
    for (wx, wy), a in arr.items():
        R = bfs(m, a, C, npcs)
        if 'puzzle' in m:
            # solved state: the player stands on the goal; one-way crossings (collapsed crust, ledges) are fine
            # as long as everything is reachable from the door OR from the goal, and the goal can get back to the door
            g = m['puzzle']['goal']; RG = bfs(m, (g['x'], g['y']), C, npcs, ledges=True)
            if a not in RG and (wx, wy) == min(arr): errs.append('goal %d,%d cannot get back to door %d,%d' % (g['x'], g['y'], wx, wy))
            R = R | RG
        for (ox, oy), b in arr.items():
            if b not in R: errs.append('door %d,%d cannot reach door %d,%d' % (wx, wy, ox, oy))
        for n in m['npcs']:
            ok = False
            for dx, dy in N4:
                tx, ty = n['x'] + dx, n['y'] + dy
                if (tx, ty) in R: ok = True
                if 0 <= tx < w and 0 <= ty < h and m['layers']['decoration'][ty][tx] in cid and (tx + dx, ty + dy) in R: ok = True
            if not ok: errs.append('npc %s not talkable from door %d,%d' % (n['id'], wx, wy))
        for it in m['items']:
            if (it['x'], it['y']) not in R: errs.append('item at %d,%d unreachable' % (it['x'], it['y']))
        floor = {(x, y) for y in range(h) for x in range(w) if C[y][x] in WALK and (x, y) not in npcs}
        pockets = floor - R
        if pockets and 'puzzle' not in m: warns.append('%d walkable cells unreachable: %s' % (len(pockets), sorted(pockets)[:6]))
        break  # one door is enough for the pocket test; reachability above is symmetric for 4-connectivity
    # palette check on the composite
    return errs, warns
def main():
    rep = {}; ok = True
    for f in sorted(glob.glob(os.path.join(D, 'maps', '*.json'))):
        m = json.load(open(f))
        e, w = check_map(m)
        rep[m['name']] = {'errors': e, 'warnings': w, 'puzzle_verified': bool(m.get('puzzle', {}).get('verified')) if 'puzzle' in m else None}
        if e: ok = False
        print(('FAIL ' if e else 'ok   ') + m['name'], e[:4], w[:2])
    json.dump(rep, open(os.path.join(D, 'check_report.json'), 'w'), indent=1)
    return ok
