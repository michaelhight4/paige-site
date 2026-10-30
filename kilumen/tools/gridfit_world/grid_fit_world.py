#!/usr/bin/env python3
"""grid_fit_world.py - Gary's grid-fit standard for EVERY map (outdoor + interior), Python 3.8+ and Pillow only.

    python tools/gridfit_world/grid_fit_world.py <kilumen>            # dry run, writes report
    python tools/gridfit_world/grid_fit_world.py <kilumen> --apply    # rewrite map collision layers
    python tools/gridfit_world/grid_fit_world.py <kilumen> --check    # exit 1 if any map drifts from the rule or loses a warp
    options: --report FILE  --shots DIR (before/after overlays + contact sheet)  --sliver 0.04

Rule: a square blocks iff some tile drawn on it (ground / decoration / ysort overlay - never the non-ysort overlay layer,
i.e. roofs and canopies whose tiles say walk) is a blocking tile whose opaque art (alpha >= 200) covers more than --sliver of the square.
So an asset only blocks the whole squares its ground art covers; overhang slivers, roof eaves and canopies never block a
neighbour, and solid art can never be walked onto. Only codes walk(0)/block(1) are ever changed. Never touched:
solid objects on the overlay layer (tile collision block) always count. Never touched:
doors, stairs, water, ledges, puzzles (any non walk/block code or tile), warp + exit + locked-warp squares, story-gate and
flag-swap cells, hall_v2 puzzle cells (prisms, receivers, beam doors, warp pads, push tiles), NPC squares, the map edge, the centre-camera padding border, and void (no ground art).
"""
import argparse, collections, glob, json, os, re, sys
try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit('needs Pillow:  python -m pip install pillow')
WALK, BLOCK = 0, 1
PASS = {0, 2, 4, 7, 8, 9, 10}  # codes a walker can stand on (walk, ledge, door, plate, bike, ramp, ice)

class World:
    def __init__(s, root, sliver):
        root = os.path.abspath(root)
        if os.path.isdir(os.path.join(root, 'kilumen', 'art')): root = os.path.join(root, 'kilumen')
        s.root = root; s.ow = os.path.join(root, 'art', 'world', 'overworld'); s.sliver = sliver
        ts = json.load(open(os.path.join(s.ow, 'tileset.json'), encoding='utf-8'))
        s.T = ts.get('tile_size', 64); s.cols = ts.get('columns_per_sheet', 16); s.tiles = {}
        for f in ('tileset.json', 'tileset_ix2.json', 'tileset_arena.json'):
            p = os.path.join(s.ow, f)
            if os.path.isfile(p):
                for t in json.load(open(p, encoding='utf-8'))['tiles']: s.tiles[t['id']] = t
        s._img, s._cov, s._art = {}, {}, {}
    def sheet(s, t):
        p = os.path.join(s.ow, t['sheet'])
        for c in (p[:-4] + '_v3.png', p[:-4] + '_v2.png', p):
            if os.path.isfile(c): return c
    def art(s, tid):
        if tid in s._art: return s._art[tid]
        t = s.tiles.get(tid); im = None
        f = s.sheet(t) if t else None
        if f:
            if f not in s._img: s._img[f] = Image.open(f).convert('RGBA')
            I = s._img[f]; x, y = t['index'] % s.cols * s.T, t['index'] // s.cols * s.T
            if y + s.T <= I.height and x + s.T <= I.width: im = I.crop((x, y, x + s.T, y + s.T))
        s._art[tid] = im; return im
    def cover(s, tid):
        if tid not in s._cov:
            im = s.art(tid)
            s._cov[tid] = 1.0 if im is None else im.split()[3].point(lambda v: 255 if v >= 200 else 0).histogram()[255] / (s.T * s.T)
        return s._cov[tid]
    def solid(s, tid):
        t = s.tiles.get(tid)
        return bool(t) and t.get('collision') == 'block' and s.cover(tid) > s.sliver
    def special(s, tid):
        t = s.tiles.get(tid); return bool(t) and t.get('collision') not in (None, 'walk', 'block')

def maps(W):
    for f in sorted(glob.glob(os.path.join(W.ow, 'maps', '**', '*.json'), recursive=True)):
        try: m = json.load(open(f, encoding='utf-8'))
        except Exception: continue
        if isinstance(m.get('layers'), dict) and 'collision' in m['layers']: yield f, m

def protected(m):
    L = m['layers']; H, Wd = len(L['collision']), len(L['collision'][0]); P = set()
    for w in m.get('warps', []) + (m.get('locked_warps') or []):
        if isinstance(w, dict) and 'x' in w: P.add((w['x'], w['y']))
    for e in m.get('exits', []):
        for i in range(e.get('start', 0), e.get('end', -1) + 1):
            P.add({'north': (i, 0), 'south': (i, H - 1), 'west': (0, i), 'east': (Wd - 1, i)}.get(e.get('edge'), (-1, -1)))
    for g in m.get('story_gates') or []:
        for c in g.get('cells', []): P.add((c['x'], c['y']))
    for k in ('flag_swaps', 'npcs', 'interact_spots', 'signs', 'items'):
        for c in m.get(k) or []:
            if isinstance(c, dict) and isinstance(c.get('x'), int): P.add((c['x'], c['y']))
    hv = m.get('hall_v2') or {}  # hall puzzle pieces (prism sources/prisms/receivers, beam doors, warp pads, push tiles): runtime-drawn, never re-fit
    pz = hv.get('prism') or {}
    for c in [e.get('at') for e in (pz.get('sources') or []) + (pz.get('prisms') or []) + (pz.get('receivers') or [])] + list(pz.get('door') or []) + ([pz['receiver']] if isinstance(pz.get('receiver'), list) else []):
        if isinstance(c, list) and len(c) == 2: P.add(tuple(c))
    for cells in (hv.get('warps') or {}).values():
        for c in cells: P.add(tuple(c))
    for k in (hv.get('push') or {}): x, y = k.split(','); P.add((int(x), int(y)))
    for y, row in enumerate(hv.get('grid') or []):  # 'r' receiver, 'L' beam door, 'P' prism, 'E' emitter cells in the hall grid
        for x, ch in enumerate(row):
            if ch in 'rLPE': P.add((x, y))
    for pr in (m.get('lab') or {}).get('props') or []:  # Wellspire v3 lab props: runtime-drawn by src/region9/lab_fx.js, never re-fit
        for yy in range(pr['y'], pr['y'] + pr.get('h', 1)):
            for xx in range(pr['x'], pr['x'] + pr.get('w', 1)): P.add((xx, yy))
    pad = m.get('padding') or {}; dx, dy = pad.get('dx', 0), pad.get('dy', 0)
    if pad.get('old_size'): ow, oh = pad['old_size']
    else: ow, oh = Wd - 2 * dx, H - 2 * dy
    inside = lambda x, y: dx <= x < dx + ow and dy <= y < dy + oh and 0 < x < Wd - 1 and 0 < y < H - 1
    return P, inside

def want_layer(W, m):
    """Return (new collision, list of (x,y,old,new,reason))."""
    L = m['layers']; col = L['collision']; H, Wd = len(col), len(col[0]); P, inside = protected(m)
    out = [r[:] for r in col]; ch = []; review = []
    get = lambda k, x, y: (L[k][y][x] if isinstance(L.get(k), list) and y < len(L[k]) and x < len(L[k][y]) else 0) or 0
    for y in range(H):
        for x in range(Wd):
            c = col[y][x]
            if c not in (WALK, BLOCK) or (x, y) in P or not inside(x, y): continue
            g, d, o = get('ground', x, y), get('decoration', x, y), get('overlay', x, y)
            if not g and not d: continue  # void
            ot = W.tiles.get(o, {}); ids = [g, d] + ([o] if ot.get('ysort') or ot.get('collision') == 'block' else [])
            if any(W.special(i) for i in ids if i): continue
            w = BLOCK if any(W.solid(i) for i in ids if i) else WALK
            if w == WALK and c == BLOCK and d and W.cover(d) >= 0.5 and not re.search(r'grass|flower|fern|path|trail', W.tiles.get(d, {}).get('name', '')):
                review.append((x, y, W.tiles.get(d, {}).get('name'))); continue  # drawn object whose tile says walk: hand-blocked, left for review
            if w != c:
                out[y][x] = w
                why = 'blocked gap (no solid art)' if w == WALK else 'walk-through (solid art marked walkable)'
                if w == WALK and o and not W.tiles.get(o, {}).get('ysort'): why += ', under roof/canopy overlay'
                ch.append((x, y, c, w, why))
    # a freed square nobody can reach is just a dead pocket (map_layers_reach fails on those): keep it blocked
    r = reach(m, out)
    keep = [c for c in ch if c[3] != WALK or (c[0], c[1]) in r]
    for x, y, a, b, _ in ch:
        if b == WALK and (x, y) not in r: out[y][x] = a
    return out, keep, review

def reach(m, col):
    """Flood from every warp arrival square / exit / start; return set of reachable squares."""
    H, Wd = len(col), len(col[0]); seeds = []
    for w in m.get('warps', []): seeds.append((w['x'], w['y']))
    P, _ = protected(m)
    for e in m.get('exits', []):
        for i in range(e.get('start', 0), e.get('end', -1) + 1):
            seeds.append({'north': (i, 0), 'south': (i, H - 1), 'west': (0, i), 'east': (Wd - 1, i)}.get(e.get('edge'), (0, 0)))
    if m.get('player_start'): ps = m['player_start']; seeds.append((ps.get('x', 0), ps.get('y', 0)))
    solid = {(n['x'], n['y']) for n in (m.get('npcs') or []) + [i for i in (m.get('items') or []) if not i.get('hidden')] if isinstance(n, dict) and isinstance(n.get('x'), int)}  # NPCs and visible satchels stand in the way
    seen = set(); st = [s for s in seeds if 0 <= s[0] < Wd and 0 <= s[1] < H]
    while st:
        x, y = st.pop()
        if (x, y) in seen: continue
        seen.add((x, y))
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < Wd and 0 <= ny < H and (nx, ny) not in seen and (nx, ny) not in solid and col[ny][nx] in PASS: st.append((nx, ny))
    return seen

def render(W, m, col, changes, path, scale=16):
    L = m['layers']; H, Wd = len(col), len(col[0]); T = W.T
    im = Image.new('RGBA', (Wd * scale, H * scale), (0, 0, 0, 255)); cache = {}
    def tile(i):
        if i not in cache:
            a = W.art(i); cache[i] = a.resize((scale, scale), Image.NEAREST) if a is not None else None
        return cache[i]
    for k in ('ground', 'decoration', 'overlay'):
        if not isinstance(L.get(k), list): continue
        for y, r in enumerate(L[k]):
            for x, i in enumerate(r):
                if i and tile(i) is not None: im.alpha_composite(tile(i), (x * scale, y * scale))
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for y in range(H):
        for x in range(Wd):
            c = col[y][x]; b = (x * scale, y * scale, x * scale + scale - 1, y * scale + scale - 1)
            if c == BLOCK: d.rectangle(b, fill=(255, 0, 0, 90))
            elif c not in PASS: d.rectangle(b, fill=(0, 120, 255, 70))
    for x, y, a, b2, _ in changes:
        b = (x * scale, y * scale, x * scale + scale - 1, y * scale + scale - 1)
        d.rectangle(b, outline=(0, 255, 0, 255) if b2 == WALK else (255, 255, 0, 255), width=2)
    im.alpha_composite(ov); im.convert('RGB').save(path)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('repo'); g = ap.add_mutually_exclusive_group()
    g.add_argument('--apply', action='store_true'); g.add_argument('--check', action='store_true')
    ap.add_argument('--report'); ap.add_argument('--shots'); ap.add_argument('--sliver', type=float, default=0.04)
    A = ap.parse_args(); W = World(A.repo, A.sliver)
    sys.path.insert(0, os.path.join(W.root, 'tools', 'furniture'))
    rep = ['# grid_fit_world report (' + ('apply' if A.apply else 'check' if A.check else 'dry-run') + ')', '',
           'Legend for shots: red = blocked, blue = special code (water/door/...), green outline = freed, yellow outline = newly blocked.', '',
           '| map | freed | newly blocked | warps unreachable before -> after | dead walkable pockets before -> after (squares) |', '|---|---|---|---|---|']
    detail, fails, all_maps, total = [], [], {}, collections.Counter()
    for f, m in maps(W):
        name = os.path.relpath(f, os.path.join(W.ow, 'maps'))[:-5]; all_maps[m['name']] = m
        old = m['layers']['collision']; new, ch, rv = want_layer(W, m)
        freed = [c for c in ch if c[3] == WALK]; nb = [c for c in ch if c[3] == BLOCK]
        r0, r1 = reach(m, old), reach(m, new)
        wl0 = [w for w in m.get('warps', []) if (w['x'], w['y']) not in r0 or len(r0) <= 1]
        H, Wd = len(new), len(new[0])
        warps_un = lambda r: sum(1 for w in m.get('warps', []) if not any((w['x']+a, w['y']+b) in r and new[w['y']+b][w['x']+a] in PASS for a, b in ((0,1),(0,-1),(1,0),(-1,0)) if 0 <= w['x']+a < Wd and 0 <= w['y']+b < H))
        u0, u1 = warps_un(r0), warps_un(r1)
        pk = lambda col, r: sum(1 for y in range(H) for x in range(Wd) if col[y][x] == WALK and (x, y) not in r)
        pockets = f'{pk(old, r0)} -> {pk(new, r1)}'
        _unused = sum(1 for y in range(H) for x in range(Wd) if new[y][x] == WALK and (x, y) not in r1)
        total['freed'] += len(freed); total['blocked'] += len(nb)
        rep.append(f'| {name} | {len(freed)} | {len(nb)} | {u0} -> {u1} | {pockets} |')
        if u1 > u0: fails.append(f'{name}: a warp became unreachable ({u0} -> {u1})')
        if rv: detail += [f'### {name}: drawn object on a blocked square whose tile says walk (left blocked, review)'] + [f'- ({x},{y}) {n}' for x, y, n in rv]
        if ch:
            detail += [f'### {name}'] + [f'- ({x},{y}) {"block->walk" if b == WALK else "walk->block"}: {why}' for x, y, a, b, why in ch]
        if A.check and ch: fails.append(f'{name}: {len(ch)} squares drift from the grid-fit rule')
        if A.shots:
            os.makedirs(A.shots, exist_ok=True); s = name.replace('/', '__')
            render(W, m, old, ch, os.path.join(A.shots, f'{s}_before.png')); render(W, m, new, ch, os.path.join(A.shots, f'{s}_after.png'))
        if A.apply and ch:
            m['layers']['collision'] = new
            from grid_fit_and_swap import dump_like
            dump_like(f, m)
    # warp targets land on a standable square
    for f, m in maps(W):
        for w in m.get('warps', []):
            t = all_maps.get(w.get('to'))
            if t and 'tx' in w:
                c = t['layers']['collision']
                if not (0 <= w['ty'] < len(c) and 0 <= w['tx'] < len(c[0])) or c[w['ty']][w['tx']] not in PASS:
                    fails.append(f'{m["name"]} warp -> {w["to"]} ({w["tx"]},{w["ty"]}) lands on a non-walkable square')
    rep += ['', f'**Total: {total["freed"]} squares freed, {total["blocked"]} newly blocked.**', '', '## Problems'] + [f'- {x}' for x in fails] + ['', '## Squares changed'] + detail
    out = A.report or os.path.join(W.root, 'tools', 'gridfit_world', 'grid_fit_world_report.md')
    open(out, 'w', encoding='utf-8').write('\n'.join(rep) + '\n')
    print(f'freed {total["freed"]}, newly blocked {total["blocked"]}, problems {len(fails)}; report {out}')
    if A.check and fails: print('\n'.join(fails[:50])); sys.exit(1)

if __name__ == '__main__': main()
