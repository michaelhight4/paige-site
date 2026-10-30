#!/usr/bin/env python3
"""Wellspire art QA polish (Director final art QA, Oct 30 2026). Idempotent; run after build_wellspire.py / build_climb.py.
r9_switchbacks:
  - tall grass: the outer ring of each patch gets a ragged, coordinate-seeded alpha edge (deco + front overlay + tips),
    so patches no longer read as hard rectangles.
  - path>snow transitions: the checker dither halo (snow dots on the cobbles) is removed and the cobble/snow boundary
    is cleaned with a majority filter.
  - terrace ledge: where cobble steps down to snow on its south side a dark rock front face (light lip on top) is painted.
New tiles: ids 12420+, category wellspire_polish, sheet tiles_{1,2,3}x/wellspire_polish.png (2x/3x = nearest upscale),
registered in tileset_arena.json with polish_of = the source id. Maps are re-derived from the source ids every run."""
import json, os, math
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); OW = os.path.join(ROOT, 'art', 'world', 'overworld')
MAPS = os.path.join(OW, 'maps'); ARENA = os.path.join(OW, 'tileset_arena.json'); BASE_ID, S, COLS = 12420, 64, 16
SHEET = 'tiles_1x/wellspire_polish.png'; CAT = 'wellspire_polish'

def load_tiles():
    T = {}
    for f in ('tileset.json', 'tileset_ix2.json', 'tileset_arena.json'):
        d = json.load(open(os.path.join(OW, f))); L = d['tiles']
        for t in (L.values() if isinstance(L, dict) else L): T[t['id']] = t
    return T
_img = {}
def crop(t):
    if t['sheet'] not in _img: _img[t['sheet']] = Image.open(os.path.join(OW, t['sheet'])).convert('RGBA')
    i = t['index']; c, r = i % COLS, i // COLS
    return _img[t['sheet']].crop((c * S, r * S, c * S + S, r * S + S))

def noise(gx, gy, k):  # smooth deterministic 0..1 along a world-pixel line
    return min(1.0, max(0.0, 0.5 + 0.22 * math.sin(gx * 0.37 + gy * 0.23 + k) + 0.18 * math.sin(gx * 0.11 - gy * 0.17 + 2.3 * k) + 0.3 * math.sin(gx * 1.3 + gy * 1.7 + 0.7 * k) * abs(math.sin(gx * 0.5 + gy * 0.6))))

def ragged(im, X, Y, edges, lo=4, hi=18):
    """alpha-cut the sides in `edges` (subset of 'NESW') with a ragged depth lo..hi px."""
    im = im.copy(); P = im.load()
    for y in range(S):
        for x in range(S):
            gx, gy = X * S + x, Y * S + y; cut = False
            if 'W' in edges and x < lo + (hi - lo) * noise(0, gy, 1): cut = True
            if 'E' in edges and S - 1 - x < lo + (hi - lo) * noise(0, gy, 2): cut = True
            if 'N' in edges and y < lo + (hi - lo) * noise(gx, 0, 3): cut = True
            if 'S' in edges and S - 1 - y < 2 + (hi - 6) * noise(gx, 0, 4): cut = True
            if cut: r, g, b, a = P[x, y]; P[x, y] = (r, g, b, 0)
    return im

def main():
    global NL
    p = os.path.join(MAPS, 'r9_switchbacks.json'); NL = {f: open(f).read().endswith('\n') for f in (ARENA, p)}
    T = load_tiles(); arena = json.load(open(ARENA))
    arena['tiles'] = [t for t in arena['tiles'] if t.get('category') != CAT]
    src_of = {t['id']: t['polish_of'] for t in T.values() if t.get('category') == CAT}
    T = {k: v for k, v in T.items() if v.get('category') != CAT}
    p = os.path.join(MAPS, 'r9_switchbacks.json'); m = json.load(open(p)); L = m['layers']
    for k in ('ground', 'decoration', 'overlay'):
        L[k] = [[src_of.get(v, v) for v in row] for row in L[k]]
    H, W = len(L['ground']), len(L['ground'][0]); new = []
    def add(img, src, name):
        t = dict(T[src]); t.update(id=BASE_ID + len(new), name=f'{name}_{len(new)}', category=CAT, sheet=SHEET, index=len(new),
                                   col=len(new) % COLS, row=len(new) // COLS, polish_of=src); t.pop('alias_of', None)
        new.append((t, img)); return t['id']
    nm = lambda i: T.get(i, {}).get('name', '')
    # 1) tall grass soft edges
    D0 = [row[:] for row in L['decoration']]
    grass = lambda x, y: 0 <= x < W and 0 <= y < H and nm(D0[y][x]).startswith('x_tall_snow_') and 'front' not in nm(D0[y][x])
    for y in range(H):
        for x in range(W):
            if not grass(x, y): continue
            e = ''.join(d for d, (dx, dy) in zip('NESW', ((0, -1), (1, 0), (0, 1), (-1, 0))) if not grass(x + dx, y + dy))
            if not e: continue
            L['decoration'][y][x] = add(ragged(crop(T[L['decoration'][y][x]]), x, y, e), L['decoration'][y][x], 'ws_grass')
            o = L['overlay'][y][x]
            if o and 'tall_snow' in nm(o): L['overlay'][y][x] = add(ragged(crop(T[o]), x, y, e), o, 'ws_grass_front')
            if 'N' in e and y > 0 and 'tall_snow_tips' in nm(L['overlay'][y - 1][x]):
                o = L['overlay'][y - 1][x]; L['overlay'][y - 1][x] = add(ragged(crop(T[o]), x, y - 1, ''.join(c for c in e if c in 'EW'), 4, 18), o, 'ws_grass_tips')
    # 2) + 3) transitions: halo removal + ledge face
    snow_cols = set()
    for i in (898, 899, 900, 901): snow_cols |= {c for c in crop(T[i]).get_flattened_data()}
    trans = lambda v: nm(v).startswith('path>snow')
    cob = lambda x, y: 0 <= x < W and 0 <= y < H and (trans(L['ground'][y][x]) or nm(L['ground'][y][x]).startswith('path_'))
    G0 = [row[:] for row in L['ground']]
    cob0 = lambda x, y: 0 <= x < W and 0 <= y < H and (trans(G0[y][x]) or nm(G0[y][x]).startswith('path_'))
    path0, snow0 = crop(T[9]), crop(T[898]); LIP1, LIP2 = (150, 158, 178, 255), (206, 216, 232, 255)
    masks = {}
    for y in range(H):
        for x in range(W):
            g = L['ground'][y][x]
            if not trans(g): continue
            im = crop(T[g]); P = im.load(); C = path0.load(); N = snow0.load()
            cb = [[P[i, j] == C[i, j] for i in range(S)] for j in range(S)]   # exact cobble pixels (same art as path_0)
            mk = [[sum(not cb[min(S - 1, max(0, j + b))][min(S - 1, max(0, i + a))] for a in (-2, -1, 0, 1, 2) for b in (-2, -1, 0, 1, 2)) >= 13
                   for i in range(S)] for j in range(S)]  # True = snow side (majority filter: no specks, no dither rim)
            for j in range(S):
                for i in range(S):
                    if not mk[j][i]: P[i, j] = C[i, j]; continue
                    near = any(0 <= i + a < S and 0 <= j + b < S and not mk[j + b][i + a] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    near2 = any(0 <= i + a < S and 0 <= j + b < S and not mk[j + b][i + a] for a, b in ((2, 0), (-2, 0), (0, 2), (0, -2)))
                    P[i, j] = LIP1 if near else (LIP2 if near2 else N[i, j])     # clean two-pixel snow lip, then plain snow
            masks[(x, y)] = mk; L['ground'][y][x] = (im, g)
    FACE = [(214, 226, 238), (92, 98, 120), (70, 74, 96), (62, 64, 86), (56, 58, 80), (52, 52, 74), (48, 48, 70), (44, 44, 64), (40, 40, 58), (38, 38, 56), (38, 38, 56), (36, 36, 54), (36, 36, 54), (40, 42, 62), (52, 56, 78), (84, 92, 116)]
    def face(im, top_rows):  # top_rows[i] = y where snow starts under cobble in column i (or None)
        P = im.load()
        for i, y0 in enumerate(top_rows):
            if y0 is None: continue
            for k, c in enumerate(FACE):
                if y0 + k < S: P[i, y0 + k] = c + (255,)
    for (x, y), mk in masks.items():
        im, g = L['ground'][y][x]
        tops = []
        for i in range(S):
            t = None
            for j in range(1, S):
                if mk[j][i] and not mk[j - 1][i] and all(mk[jj][i] for jj in range(j, min(S, j + 6))): t = j; break
            tops.append(t)
        face(im, tops)
        L['ground'][y][x] = add(im, g, 'ws_path_snow')
    for (x, y), mk in masks.items():  # cobble reaching the tile bottom over plain snow: start the face in the cell below
        if y + 1 < H and (x, y + 1) not in masks and not cob0(x, y + 1) and any(not mk[S - 1][i] for i in range(S)):
            g = L['ground'][y + 1][x]; im = crop(T[g]); face(im, [0 if not mk[S - 1][i] else None for i in range(S)])
            L['ground'][y + 1][x] = add(im, g, 'ws_ledge_face')
    sheet = Image.new('RGBA', (COLS * S, ((len(new) + COLS - 1) // COLS) * S), (0, 0, 0, 0))
    for t, img in new: sheet.paste(img, (t['col'] * S, t['row'] * S))
    for z in (1, 2, 3):
        sheet.resize((sheet.width * z, sheet.height * z), Image.NEAREST).save(os.path.join(OW, f'tiles_{z}x', 'wellspire_polish.png'))
    arena['tiles'] += [t for t, _ in new]
    for f, d in ((ARENA, arena), (p, m)):
        with open(f, 'w') as fh: json.dump(d, fh, indent=1); fh.write('\n') if NL[f] else None
    print(f'{len(new)} polish tiles ({BASE_ID}-{BASE_ID + len(new) - 1}) -> {SHEET}; r9_switchbacks updated')

if __name__ == '__main__': main()
