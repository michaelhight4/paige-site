"""Hall overhaul PHASE 1 planner (Oct 29 2026). Generates a top-down plan per Master's hall, proves it with a BFS over
(position, switch bits), places trainers with sight lines on the solution walk, renders PNGs + a contact sheet.
Original code. Technique notes: recursive-backtracker maze (textbook; cf. jostbr/pymaze, MIT) and generate-then-BFS-verify
for slide puzzles (idea from jwang5675/Ice-Puzzle-Generator, unlicensed, so no code taken).
Legend: '#' wall, '.' floor, 'S' start, 'G' front of the Master's dais, 'M' Master, 'i' slide floor (ice/gust/glass),
'^v<>' push tiles (spinner/current/conveyor), 'T'/'U' switch plates (flip bit 0 / bit 1 when stepped on),
'a'/'b' gates open when bit0 is 0/1, 'c'/'d' gates open when bit1 is 0/1, '1'-'6' paired warp pads, 'x' invisible wall."""
import random, json, sys, os
from collections import deque
from PIL import Image, ImageDraw, ImageFont

D = {'U': (0, -1), 'D': (0, 1), 'L': (-1, 0), 'R': (1, 0)}
PUSH = {'^': 'U', 'v': 'D', '<': 'L', '>': 'R'}
SOLID = set('#xM')

class Hall:
    def __init__(s, g): s.g = [list(r) for r in g]; s.h = len(g); s.w = len(g[0]); s.tr = set()
    def at(s, x, y): return '#' if not (0 <= x < s.w and 0 <= y < s.h) else s.g[y][x]
    def find(s, c): return [(x, y) for y in range(s.h) for x in range(s.w) if s.g[y][x] == c]
    def open_(s, x, y, b):
        c = s.at(x, y)
        if c in SOLID or (x, y) in s.tr: return False
        if c == 'a': return b & 1 == 0
        if c == 'b': return b & 1 == 1
        if c == 'c': return b & 2 == 0
        if c == 'd': return b & 2 == 2
        return True
    def enter(s, x, y, b, d, trail):
        """land on (x,y) moving d; resolve plates, warps, slides, pushes. returns (x,y,b)."""
        for _ in range(400):
            trail.append((x, y)); c = s.at(x, y)
            if c == 'T': b ^= 1
            if c == 'U': b ^= 2
            if c.isdigit():
                o = [p for p in s.find(c) if p != (x, y)][0]; x, y = o; trail.append(o); return x, y, b
            nd = PUSH.get(c) or (d if c == 'i' else None)
            if not nd: return x, y, b
            nx, ny = x + D[nd][0], y + D[nd][1]
            if not s.open_(nx, ny, b): return x, y, b
            x, y, d = nx, ny, nd
        return x, y, b
    def moves(s, st):
        x, y, b = st
        for d, (dx, dy) in D.items():
            if s.open_(x + dx, y + dy, b):
                tr = []; yield d, s.enter(x + dx, y + dy, b, d, tr), tr
    def bfs(s, src):
        prev = {src: None}; q = deque([src])
        while q:
            u = q.popleft()
            for d, v, tr in s.moves(u):
                if v not in prev: prev[v] = (u, d, tr); q.append(v)
        return prev
    def check(s):
        S = s.find('S')[0]; G = s.find('G')[0]; st0 = (S[0], S[1], 0)
        reach = s.bfs(st0); goals = [k for k in reach if k[:2] == G]
        if not goals: return None
        # reverse graph check: every reachable state can reach the goal AND can get back to the door (S)
        rev = {}
        for u in reach:
            for _, v, _ in s.moves(u): rev.setdefault(v, []).append(u)
        def back(targets):
            seen = set(targets); q = deque(targets)
            while q:
                v = q.popleft()
                for u in rev.get(v, []):
                    if u not in seen: seen.add(u); q.append(u)
            return seen
        to_goal = back(goals); to_door = back([k for k in reach if k[:2] == S])
        bad = [k for k in reach if k not in to_goal or k not in to_door]
        g = min(goals, key=lambda k: 0); path = []; cells = []; k = g
        while reach[k]: u, d, tr = reach[k]; path.append(d); cells = tr + cells; k = u
        return dict(states=len(reach), softlocks=len(bad), steps=len(path), moves=''.join(reversed(path)),
                    cells=[S] + cells, bits_needed=g[2])

def carve_maze(g, x0, y0, x1, y1, rnd, loops=0.08, wall='#'):
    """recursive backtracker on odd offsets inside [x0..x1]x[y0..y1] (inclusive, both odd-sized)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): g[y][x] = wall
    cells = [(x, y) for y in range(y0, y1 + 1, 2) for x in range(x0, x1 + 1, 2)]
    st = [rnd.choice(cells)]; seen = {st[0]}; g[st[0][1]][st[0][0]] = '.'
    while st:
        x, y = st[-1]; nb = [(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)) if (x + dx, y + dy) in set(cells) and (x + dx, y + dy) not in seen]
        if not nb: st.pop(); continue
        nx, ny = rnd.choice(nb); g[(y + ny) // 2][(x + nx) // 2] = '.'; g[ny][nx] = '.'; seen.add((nx, ny)); st.append((nx, ny))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] == wall and rnd.random() < loops and ((x - x0) % 2) != ((y - y0) % 2):
                g[y][x] = '.'

def build(spec, seed):
    rnd = random.Random(seed); W, H = spec['w'], spec['h']
    g = [['#'] * W for _ in range(H)]; cx = W // 2
    # dais (rows 1-3) + lobby (bottom 3 rows)
    for y in (1, 2, 3):
        for x in range(cx - 3, cx + 4): g[y][x] = '.'
    g[1][cx] = 'M'; g[2][cx] = 'G'
    for y in (H - 4, H - 3, H - 2):
        for x in range(1, W - 1): g[y][x] = '.'
    g[H - 1][cx] = 'S'; g[H - 2][cx] = '.'
    # bands between row 5 and H-6, separated by wall rows; doors chosen per band
    bands = spec['bands']; top, bot = 5, H - 6; avail = bot - top + 1 - (len(bands) - 1)
    hs = [avail * b[1] // sum(b[1] for b in bands) for b in bands]
    hs = [h if h % 2 else h - 1 for h in hs]
    y = bot; spans = []
    for (kind, _), h in zip(bands, hs):
        spans.append((kind, y - h + 1, y)); y -= h + 1
    spans[-1] = (spans[-1][0], top, spans[-1][2])
    if (spans[-1][2] - top + 1) % 2 == 0: spans[-1] = (spans[-1][0], top + 1, spans[-1][2])
    doors = []
    for i, (kind, y0, y1) in enumerate(spans):
        fill_band(g, kind, 1, y0, W - 2, y1, rnd, spec, i)
        # entry door below band
        yb = y1 + 1
        dx = rnd.randrange(1, W - 1, 2); g[yb][dx] = spec.get('door', ['.'] * 9)[i] if yb < H - 4 else g[yb][dx]
        if yb >= H - 4: pass
        doors.append((dx, yb))
    # exit of top band into dais (row 4)
    dx = rnd.randrange(1, W - 1, 2); g[4][dx] = spec.get('door', ['.'] * 9)[len(spans)]
    for x in range(1, W - 1): g[4][x] = g[4][x] if x == dx else '#'
    for x in range(1, W - 1):
        if g[3][x] == '#' and x == dx: g[3][x] = '.'
    # connect door at row 4 into dais row 3 corridor
    for x in range(min(dx, cx - 3), max(dx, cx + 3) + 1): g[3][x] = '.'
    for f in spec.get('post', []): f(g, rnd, spans, W, H)
    return Hall([''.join(r) for r in g]), spans

def fill_band(g, kind, x0, y0, x1, y1, rnd, spec, i):
    if kind in ('maze', 'hidden', 'dark'):
        carve_maze(g, x0, y0, x1, y1, rnd, loops=spec.get('loops', 0.08), wall='x' if kind == 'hidden' else '#')
    elif kind == 'ice':
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): g[y][x] = 'i' if rnd.random() > spec.get('rock', 0.1) else '#'
        for x in range(x0, x1 + 1): g[y1][x] = g[y1][x] if g[y1][x] == '#' else '.'  # landing strip
        for x in range(x0, x1 + 1): g[y0][x] = '.' if rnd.random() < 0.35 else g[y0][x]
    elif kind == 'push':
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                r = rnd.random(); g[y][x] = rnd.choice('^^<>v') if r < spec.get('pushd', 0.4) else ('#' if r < spec.get('pushd', 0.4) + 0.1 else '.')
        for x in range(x0, x1 + 1): g[y1][x] = '.'
    elif kind == 'warp':
        n = spec.get('rooms', 3); cw = (x1 - x0 + 2) // n
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): g[y][x] = '.'
        for k in range(1, n):
            for y in range(y0, y1 + 1): g[y][x0 + k * cw - 1] = '#'
        pads = list('123456')[: spec.get('pairs', 3)]
        for p in pads:
            for _ in range(2):
                while True:
                    x, y = rnd.randrange(x0, x1 + 1), rnd.randrange(y0 + 1, y1)
                    if g[y][x] == '.': g[y][x] = p; break
    if kind == 'dark' or spec.get('plates_in', {}).get(i):
        for c in spec.get('plates_in', {}).get(i, ''):
            free = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if g[y][x] == '.']
            x, y = rnd.choice(free); g[y][x] = c

def place_trainers(h, res, n, rnd):
    cells = res['cells']; order = {}
    for i, c in enumerate(cells): order.setdefault(c, i)
    S = h.find('S')[0]; out = []
    cand = []
    for y in range(h.h):
        for x in range(h.w):
            if h.at(x, y) != '.' or (x, y) in order or abs(x - S[0]) + abs(y - S[1]) < 4 or y <= 3 or y >= h.h - 4: continue
            for d, (dx, dy) in D.items():
                ray = []
                for k in range(1, 5):
                    c = (x + dx * k, y + dy * k)
                    if h.at(*c) in SOLID or h.at(*c) in 'abcd' or c in h.tr: break
                    ray.append(c)
                hits = [order[c] for c in ray if c in order]
                if hits: cand.append((min(hits), (x, y), d, ray))
    L = max(order.values())
    for k in range(n):
        tgt = int(L * (k + 0.6) / (n + 0.3))
        cand.sort(key=lambda c: abs(c[0] - tgt) + rnd.random())
        for c in cand:
            if c[1] in h.tr or any(abs(c[1][0] - t[1][0]) + abs(c[1][1] - t[1][1]) < 3 for t in out): continue
            if any(c[1] in t[3] for t in out) or any(t[1] in c[3] for t in out): continue
            h.tr.add(c[1]); r2 = h.check()
            if r2 and r2['softlocks'] == 0: out.append(c); break
            h.tr.discard(c[1])
    out.sort(key=lambda c: c[0])
    return out

def gen(spec):
    for seed in range(spec.get('seed', 1), spec.get('seed', 1) + 4000):
        h, spans = build(spec, seed); r = h.check()
        if not r or r['softlocks'] or r['steps'] < spec['minsteps']: continue
        if spec.get('need') and not spec['need'](h, r): continue
        rnd = random.Random(seed); tr = place_trainers(h, r, spec['trainers'], rnd)
        if len(tr) < spec['trainers']: continue
        r = h.check(); return h, r, tr, seed
    raise SystemExit('no layout for ' + spec['name'])

# ---------- rendering ----------
COL = {'#': (58, 52, 64), '.': (214, 204, 182), 'S': (90, 190, 110), 'G': (240, 200, 80), 'M': (200, 60, 60), 'i': (170, 220, 245),
       'T': (240, 140, 40), 'U': (170, 90, 220), 'a': (200, 110, 60), 'b': (110, 160, 210), 'c': (160, 70, 160), 'd': (90, 190, 170), 'x': (196, 186, 170)}
def render(h, res, tr, spec, path, cs=22):
    F = ImageFont.load_default(); pad = 60; leg = 230
    im = Image.new('RGB', (h.w * cs + leg, h.h * cs + pad), (24, 22, 30)); dr = ImageDraw.Draw(im, 'RGBA')
    for y in range(h.h):
        for x in range(h.w):
            c = h.at(x, y); col = COL.get(c, (214, 204, 182)); X, Y = x * cs, y * cs + pad
            if c.isdigit(): col = (120, 230, 200)
            if c in PUSH: col = (150, 200, 120)
            dr.rectangle([X, Y, X + cs - 1, Y + cs - 1], fill=col, outline=(0, 0, 0, 60))
            lbl = {'S': 'S', 'G': 'G', 'M': 'M', 'T': 'T', 'U': 'U', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D'}.get(c, c if c.isdigit() else '')
            if c in PUSH: lbl = {'^': '↑', 'v': '↓', '<': '←', '>': '→'}[c]; lbl = c
            if c == 'x': dr.line([X + 3, Y + 3, X + cs - 4, Y + cs - 4], fill=(120, 110, 100), width=1)
            if lbl: dr.text((X + cs // 2 - 3, Y + cs // 2 - 6), lbl, fill=(0, 0, 0), font=F)
    pts = [(x * cs + cs // 2, y * cs + pad + cs // 2) for x, y in res['cells']]
    dr.line(pts, fill=(230, 40, 90, 150), width=3)
    for i, (_, (x, y), d, ray) in enumerate(tr):
        for c in ray: dr.rectangle([c[0] * cs + 4, c[1] * cs + pad + 4, c[0] * cs + cs - 5, c[1] * cs + pad + cs - 5], fill=(255, 60, 60, 70))
        X, Y = x * cs, y * cs + pad; dr.ellipse([X + 2, Y + 2, X + cs - 3, Y + cs - 3], fill=(40, 40, 160), outline=(255, 255, 255))
        dr.text((X + 6, Y + 5), str(i + 1), fill=(255, 255, 255), font=F)
        ax, ay = D[d]; dr.line([X + cs // 2, Y + cs // 2, X + cs // 2 + ax * cs // 2, Y + cs // 2 + ay * cs // 2], fill=(255, 255, 0), width=2)
    if spec.get('dark'):
        dr.rectangle([0, pad, h.w * cs, h.h * cs + pad], fill=(0, 0, 30, 60))
    t = f"{spec['title']}  {h.w}x{h.h} squares ({spec['scale']})  trainers {len(tr)} + Master"
    dr.text((8, 8), t, fill=(255, 255, 255), font=F); dr.text((8, 24), spec['mech'], fill=(220, 220, 160), font=F)
    dr.text((8, 40), f"BFS: {res['states']} states, solution {res['steps']} moves, softlocks {res['softlocks']}", fill=(160, 230, 160), font=F)
    lx = h.w * cs + 10; ly = pad
    for k, txt in [('S', 'door (start)'), ('M', 'Master'), ('G', 'dais front'), ('#', 'wall'), ('.', 'floor'), ('x', 'invisible wall'),
                   ('i', 'slide floor'), ('T', 'plate: flip A/B'), ('U', 'plate: flip C/D'), ('a', 'gate A (open at start)'), ('b', 'gate B (closed at start)'),
                   ('c', 'gate C (open at start)'), ('d', 'gate D (closed at start)')]:
        dr.rectangle([lx, ly, lx + 14, ly + 14], fill=COL[k]); dr.text((lx + 20, ly + 2), txt, fill=(230, 230, 230), font=F); ly += 20
    dr.rectangle([lx, ly, lx + 14, ly + 14], fill=(150, 200, 120)); dr.text((lx + 20, ly + 2), 'push tile ^v<>', fill=(230, 230, 230), font=F); ly += 20
    dr.rectangle([lx, ly, lx + 14, ly + 14], fill=(120, 230, 200)); dr.text((lx + 20, ly + 2), 'warp pad pair 1-6', fill=(230, 230, 230), font=F); ly += 20
    dr.ellipse([lx, ly, lx + 14, ly + 14], fill=(40, 40, 160)); dr.text((lx + 20, ly + 2), 'trainer n + facing', fill=(230, 230, 230), font=F); ly += 20
    dr.rectangle([lx, ly, lx + 14, ly + 14], fill=(255, 60, 60, 120)); dr.text((lx + 20, ly + 2), 'sight line', fill=(230, 230, 230), font=F); ly += 20
    dr.line([lx, ly + 7, lx + 14, ly + 7], fill=(230, 40, 90), width=3); dr.text((lx + 20, ly + 2), 'BFS solution walk', fill=(230, 230, 230), font=F)
    if spec.get('dark'): dr.text((lx, ly + 24), 'tinted = dark hall\n(light radius ' + spec['dark'] + ')', fill=(180, 180, 255), font=F)
    im.save(path); return im
