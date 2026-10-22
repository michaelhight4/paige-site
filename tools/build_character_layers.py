#!/usr/bin/env python3
"""Placeholder generator for the layered character system (slot-svg-v1, 128x128 pixel style: 32x32 grid of 4px cells).
Writes assets/art/characters/<age>/<build|all>/<layerId>.svg, assets/art/characters/manifest.json and data/character_layers.json.
Final art (Animator): replace the SVGs with 128x128 pixel sprites using the SAME file names, slots and anchor geometry (see ASSET_FORMAT.md)."""
import json, os
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'art', 'characters')
OL = '#2b2a3a'
DEF = dict(skin='#e8b98d', hair='#5a3a22', eye='#3b6fb0', fabric='#4a6fa5', trim='#f3efe4', metal='#b8bcc8', glass='#bfe3f5', gem='#c0392b')
AGES = [dict(id='baby', min=0, max=2), dict(id='child', min=3, max=12), dict(id='teen', min=13, max=19), dict(id='adult', min=20, max=64), dict(id='elder', min=65, max=130)]
BUILDS = ['slim', 'avg', 'broad']
# head width/height, torso height, legs height; torso width by build
GEO = dict(baby=(8, 7, 4, 2, (6, 6, 8)), child=(8, 7, 7, 6, (6, 8, 10)), teen=(8, 8, 9, 9, (8, 10, 12)), adult=(8, 8, 10, 10, (8, 10, 12)), elder=(8, 8, 10, 9, (8, 10, 12)))
def geom(age, build):
    hw, hh, th, lh, tws = GEO[age]; tw = tws[BUILDS.index(build)]
    ly = 32 - lh; ty = ly - th; hy = ty - 1 - hh; hx = 16 - hw // 2; tx = 16 - tw // 2
    lw = max(1, (tw - 4) // 2) if tw >= 6 else 1; arm = 2 if tw >= 8 else 1
    return dict(hx=hx, hy=hy, hw=hw, hh=hh, tx=tx, ty=ty, tw=tw, th=th, ly=ly, lh=lh, lw=lw, arm=arm, ey=hy + (hh * 3) // 7 + 1, age=age)
class Cv:
    def __init__(s): s.c = {}
    def put(s, x, y, slot=None, hexc=None, op=1.0, over=True):
        if 0 <= x < 32 and 0 <= y < 32 and (over or (x, y) not in s.c): s.c[(x, y)] = (slot, hexc if hexc else (DEF[slot] if slot else '#000'), op)
    def rect(s, x, y, w, h, slot=None, hexc=None, op=1.0):
        for j in range(h):
            for i in range(w): s.put(x + i, y + j, slot, hexc, op)
    def erase(s, x, y, w=1, h=1):
        for j in range(h):
            for i in range(w): s.c.pop((x + i, y + j), None)
    def outline(s):
        base = set(k for k, v in s.c.items() if v[2] >= 0.5)
        for (x, y) in list(base):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (x + dx, y + dy) not in s.c: s.put(x + dx, y + dy, None, OL, 1.0)
    def svg(s, slots):
        rows = {}
        for (x, y), v in s.c.items(): rows.setdefault(y, []).append((x, v))
        out = []
        for y in sorted(rows):
            cells = sorted(rows[y], key=lambda t: t[0]); i = 0
            while i < len(cells):
                x0, v = cells[i]; j = i
                while j + 1 < len(cells) and cells[j + 1][0] == cells[j][0] + 1 and cells[j + 1][1] == v: j += 1
                w = cells[j][0] - x0 + 1; slot, hexc, op = v
                st = f'fill="{hexc}"' + (f' fill-opacity="{op}"' if op < 1 else '')
                if slot: st = f'data-slot="{slot}" fill="{hexc}" style="fill:var(--slot-{slot},{hexc})"' + (f' fill-opacity="{op}"' if op < 1 else '')
                out.append(f'<rect x="{x0*4}" y="{y*4}" width="{w*4}" height="4" {st}/>'); i = j + 1
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" shape-rendering="crispEdges">' + ''.join(out) + '</svg>'
def used_slots(cv): return sorted(set(v[0] for v in cv.c.values() if v[0]))
# ---------- layers ----------
def body(g):
    c = Cv(); tx, ty, tw, th = g['tx'], g['ty'], g['tw'], g['th']
    lw = g['lw']; ly = g['ly']
    for lx in (tx + 1, tx + tw - 1 - lw):
        c.rect(lx, ly, lw, g['lh'], 'skin'); c.rect(lx, 31, lw, 1, 'skin')
    c.rect(tx, ty, tw, th, 'skin'); c.rect(15, g['hy'] + g['hh'], 2, 1, 'skin'); c.rect(g['hx'], g['hy'], g['hw'], g['hh'], 'skin')
    for yy in (g['hy'], g['hy'] + g['hh'] - 1):  # rounded head corners
        c.erase(g['hx'], yy); c.erase(g['hx'] + g['hw'] - 1, yy)
    ey = g['ey']; c.rect(g['hx'] - 1, ey, 1, 2, 'skin'); c.rect(g['hx'] + g['hw'], ey, 1, 2, 'skin')
    c.rect(tx + g['arm'], ty + 1, 1, th - 2, None, '#000', 0.10) if g['arm'] > 1 else None
    c.rect(tx + tw - g['arm'] - 1, ty + 1, 1, th - 2, None, '#000', 0.10) if g['arm'] > 1 else None
    c.rect(g['hx'], g['hy'] + g['hh'] - 1, g['hw'], 1, None, '#000', 0.08)
    # basic underwear (fixed colour)
    c.rect(tx + 1, ly - 1, tw - 2, 2 if g['lh'] > 3 else 1, None, '#8a8a99')
    c.outline(); return c
def eyes(g):
    c = Cv(); ey = g['ey']; hx, hw = g['hx'], g['hw']
    for ex in (hx + 2, hx + hw - 3): c.put(ex, ey, 'eye'); c.put(ex, ey - 1, None, '#ffffff', 0.9) if g['age'] != 'baby' else None
    c.rect(hx + hw // 2 - 1, ey + 2, 2, 1, None, '#9b4b4b'); return c
HAIR = {  # id: (name, minAge) ; painter below
    'buzz': 'Buzz cut', 'short': 'Short', 'side_part': 'Side part', 'spiky': 'Spiky', 'long': 'Long', 'bob': 'Bob', 'ponytail': 'Ponytail', 'curly': 'Curly', 'bun': 'Bun', 'afro': 'Afro', 'mohawk': 'Mohawk', 'braids': 'Braids'}
def hair(g, hid):
    c = Cv(); hx, hy, hw, hh = g['hx'], g['hy'], g['hw'], g['hh']; H = 'hair'
    def cap(rows, ex=0): c.rect(hx - ex, hy, hw + 2 * ex, rows, H)
    if hid == 'buzz': c.rect(hx + 1, hy, hw - 2, 1, H); c.rect(hx, hy + 1, hw, 1, H, op=0.55) if False else None
    elif hid == 'short': cap(2); c.rect(hx - 1, hy + 1, 1, 3, H); c.rect(hx + hw, hy + 1, 1, 3, H)
    elif hid == 'side_part': cap(2); c.rect(hx, hy + 2, 4, 1, H); c.rect(hx - 1, hy + 1, 1, 3, H); c.rect(hx + hw, hy + 1, 1, 3, H)
    elif hid == 'spiky':
        cap(2)
        for i in range(0, hw, 2): c.put(hx + i, hy - 1, H)
        c.rect(hx - 1, hy + 1, 1, 2, H); c.rect(hx + hw, hy + 1, 1, 2, H)
    elif hid == 'long': cap(2, 1); c.rect(hx - 1, hy + 2, 2, hh + 3, H); c.rect(hx + hw - 1, hy + 2, 2, hh + 3, H)
    elif hid == 'bob': cap(3, 1); c.rect(hx - 1, hy + 3, 2, hh - 2, H); c.rect(hx + hw - 1, hy + 3, 2, hh - 2, H)
    elif hid == 'ponytail': cap(2); c.rect(hx - 1, hy + 1, 1, 3, H); c.rect(hx + hw, hy + 1, 2, 3, H); c.rect(hx + hw + 1, hy + 4, 2, 5, H)
    elif hid == 'curly': cap(3, 1); c.rect(hx - 1, hy + 3, 1, 3, H); c.rect(hx + hw, hy + 3, 1, 3, H); c.rect(hx + 1, hy - 1, hw - 2, 1, H)
    elif hid == 'bun': cap(2); c.rect(hx - 1, hy + 1, 1, 3, H); c.rect(hx + hw, hy + 1, 1, 3, H); c.rect(hx + hw // 2 - 2, hy - 2, 4, 2, H)
    elif hid == 'afro': cap(4, 2); c.rect(hx - 2, hy + 4, 1, 3, H); c.rect(hx + hw + 1, hy + 4, 1, 3, H); c.rect(hx, hy - 1, hw, 1, H)
    elif hid == 'mohawk': c.rect(hx + hw // 2 - 1, hy - 2, 2, 4, H); c.rect(hx + hw // 2 - 1, hy + 2, 2, 1, H)
    elif hid == 'braids': cap(2); c.rect(hx - 1, hy + 1, 1, hh + 4, H); c.rect(hx + hw, hy + 1, 1, hh + 4, H)
    c.erase(hx + 1, hy + 2, hw - 2, 0)
    c.outline(); return c
FACIAL = {'stubble': 'Stubble', 'mustache': 'Mustache', 'goatee': 'Goatee', 'beard': 'Beard', 'full_beard': 'Full beard'}
def facial(g, fid):
    c = Cv(); hx, hy, hw, hh, ey = g['hx'], g['hy'], g['hw'], g['hh'], g['ey']; H = 'hair'; jaw = hy + hh - 1
    if fid == 'stubble': c.rect(hx + 1, ey + 3, hw - 2, jaw - ey - 2, H, op=0.4)
    elif fid == 'mustache': c.rect(hx + 2, ey + 1, hw - 4, 1, H)
    elif fid == 'goatee': c.rect(hx + 3, ey + 3, 2, 2, H); c.rect(hx + 2, ey + 1, hw - 4, 1, H)
    elif fid == 'beard': c.rect(hx + 1, ey + 3, hw - 2, jaw - ey - 1, H); c.rect(hx + 2, ey + 1, hw - 4, 1, H)
    elif fid == 'full_beard': c.rect(hx, ey + 2, hw, jaw - ey, H); c.rect(hx + 1, jaw + 1, hw - 2, 1, H); c.rect(hx + 2, ey + 1, hw - 4, 1, H)
    return c
GLASSES = {'round': 'Round glasses', 'square': 'Square glasses', 'sunglasses': 'Sunglasses', 'aviator': 'Aviators'}
def glasses(g, gid):
    c = Cv(); ey = g['ey']; hx, hw = g['hx'], g['hw']
    for ex in (hx + 2, hx + hw - 3):
        c.rect(ex - 1, ey - 1, 3, 3, 'metal')
        c.put(ex, ey, None, '#1b1b2a' if gid == 'sunglasses' else '#bfe3f5', 0.9 if gid == 'sunglasses' else 0.35)
        if gid == 'round': [c.erase(ex + dx, ey + dy) for dx in (-1, 1) for dy in (-1, 1)]
        if gid == 'aviator': c.erase(ex - 1, ey + 1); c.erase(ex + 1, ey + 1)
    c.put(hx + hw // 2 - 1, ey, 'metal'); c.put(hx + hw // 2, ey, 'metal')
    return c
HATS = {'beanie': 'Beanie', 'baseball_cap': 'Baseball cap', 'cowboy_hat': 'Cowboy hat', 'top_hat': 'Top hat', 'hard_hat': 'Hard hat', 'grad_cap': 'Graduation cap'}
def hat(g, hid):
    c = Cv(); hx, hy, hw = g['hx'], g['hy'], g['hw']; F = 'fabric'
    if hid == 'beanie': c.rect(hx - 1, hy - 1, hw + 2, 3, F); c.rect(hx - 1, hy + 1, hw + 2, 1, 'trim')
    elif hid == 'baseball_cap': c.rect(hx - 1, hy - 1, hw + 2, 3, F); c.rect(hx + 1, hy + 2, hw + 1, 1, 'trim'); c.rect(hx + hw // 2 - 1, hy - 1, 2, 1, 'trim')
    elif hid == 'cowboy_hat': c.rect(hx - 3, hy + 1, hw + 6, 1, F); c.rect(hx, hy - 2, hw, 3, F); c.rect(hx, hy, hw, 1, 'trim')
    elif hid == 'top_hat': c.rect(hx - 2, hy + 1, hw + 4, 1, F); c.rect(hx + 1, hy - 4, hw - 2, 5, F); c.rect(hx + 1, hy - 1, hw - 2, 1, 'trim')
    elif hid == 'hard_hat': c.rect(hx - 1, hy - 1, hw + 2, 3, F); c.rect(hx - 2, hy + 1, hw + 4, 1, F); c.rect(hx + hw // 2 - 1, hy - 2, 2, 1, F)
    elif hid == 'grad_cap': c.rect(hx - 2, hy - 2, hw + 4, 1, F); c.rect(hx, hy - 1, hw, 2, F); c.rect(hx + hw + 1, hy - 1, 1, 3, 'trim')
    c.outline(); return c
TOPS = {  # id: (name, sleeves, hem rows, neck, trims)
    'tshirt': ('T-shirt', 'short', 0, 'crew', []), 'tank': ('Tank top', 'none', 0, 'crew', []), 'sweater': ('Sweater', 'long', 1, 'crew', ['hembar']), 'hoodie': ('Hoodie', 'long', 2, 'hood', ['hembar']),
    'dress_shirt': ('Dress shirt', 'long', 0, 'collar', ['center']), 'blazer': ('Blazer', 'long', 2, 'collar', ['center', 'lapel']), 'chef_coat': ('Chef coat', 'long', 2, 'collar', ['center']),
    'lab_coat': ('Lab coat', 'long', 4, 'collar', ['center']), 'scrubs': ('Scrubs', 'short', 0, 'v', []), 'police_uniform': ('Police uniform', 'long', 0, 'collar', ['badge', 'center']),
    'puffer_coat': ('Puffer coat', 'long', 3, 'hood', ['hembar']), 'trench_coat': ('Trench coat', 'long', 6, 'collar', ['center']), 'sundress': ('Sundress', 'none', 6, 'v', ['hembar']), 'evening_gown': ('Evening gown', 'none', 9, 'v', ['hembar'])}
def top(g, tid):
    name, sl, hem, neck, trims = TOPS[tid]; c = Cv(); tx, ty, tw, th, arm = g['tx'], g['ty'], g['tw'], g['th'], g['arm']; F = 'fabric'
    inner = tw - 2 * arm
    c.rect(tx + arm, ty, inner, th, F)
    if sl != 'none': c.rect(tx, ty, arm, 3 if sl == 'short' else th - 1, F); c.rect(tx + tw - arm, ty, arm, 3 if sl == 'short' else th - 1, F)
    else: c.rect(tx + arm, ty, inner, th, F)
    if hem: c.rect(tx + 1, ty + th, tw - 2, min(hem, g['lh'] - 2), F)
    cx = 16
    if neck == 'v': c.erase(cx - 1, ty, 2, 1); c.erase(cx, ty + 1, 1, 1) if False else None
    if neck == 'collar': c.rect(cx - 2, ty, 4, 1, 'trim')
    if neck == 'hood': c.rect(cx - 2, ty - 1, 4, 1, F); c.rect(cx - 2, ty, 4, 1, 'trim')
    if 'hembar' in trims: c.rect(tx + (arm if sl == 'none' else 0), ty + th - 1 + hem, tw - (2 * arm if sl == 'none' else 0), 1, 'trim') if hem == 0 else c.rect(tx + 1, ty + th + hem - 1, tw - 2, 1, 'trim')
    if 'center' in trims: c.rect(cx, ty + 1, 1, th - 1 + hem, 'trim')
    if 'lapel' in trims: c.rect(cx - 2, ty + 1, 1, 3, 'trim'); c.rect(cx + 1, ty + 1, 1, 3, 'trim')
    if 'badge' in trims: c.rect(cx + 1, ty + 2, 1, 1, 'metal')
    c.rect(tx + arm, ty + th - 1, inner, 1, None, '#000', 0.10)
    c.outline(); return c
BOTTOMS = {'jeans': ('Jeans', 'long'), 'slacks': ('Slacks', 'long'), 'shorts': ('Shorts', 'short'), 'skirt': ('Skirt', 'skirt')}
def bottom(g, bid):
    c = Cv(); tx, tw, ly, lw, lh = g['tx'], g['tw'], g['ly'], g['lw'], g['lh']; F = 'fabric'; kind = BOTTOMS[bid][1]
    if kind == 'skirt': c.rect(tx + 1, ly - 1, tw - 2, max(2, lh // 2), F); c.rect(tx + 1, ly - 1, tw - 2, 1, 'trim')
    else:
        n = lh - 2 if kind == 'long' else max(1, lh // 3)
        c.rect(tx + 1, ly - 1, tw - 2, 2, F); c.rect(tx + 1, ly - 1, tw - 2, 1, 'trim', op=1.0) if bid == 'slacks' else None
        for lx in (tx + 1, tx + tw - 1 - lw): c.rect(lx, ly + 1, lw, n, F)
    c.outline(); return c
SHOES = {'sneakers': 'Sneakers', 'sandals': 'Sandals', 'boots': 'Boots', 'heels': 'Heels'}
def shoes(g, sid):
    c = Cv(); tx, tw, lw = g['tx'], g['tw'], g['lw']; F = 'fabric'
    for lx in (tx + 1, tx + tw - 1 - lw):
        if sid == 'sneakers': c.rect(lx - 1, 30, lw + 2, 2, F); c.rect(lx - 1, 31, lw + 2, 1, 'trim')
        elif sid == 'sandals': c.rect(lx - 1, 31, lw + 2, 1, F); c.put(lx, 30, F)
        elif sid == 'boots': c.rect(lx - 1, 28, lw + 1, 4, F); c.rect(lx - 1, 31, lw + 2, 1, 'trim'); c.rect(lx + lw - 1, 30, 2, 2, F)
        elif sid == 'heels': c.rect(lx, 30, lw + 1, 2, F); c.put(lx, 31, 'trim')
    c.outline(); return c
NECK = {'necklace_pearl': 'Pearl necklace', 'necklace_pendant': 'Pendant necklace', 'necklace_chain': 'Gold chain'}
def neck(g, nid):
    c = Cv(); y = g['ty']; 
    c.rect(14, y, 4, 1, 'metal' if nid != 'necklace_pearl' else 'trim'); c.put(15, y + 1, 'gem' if nid == 'necklace_pendant' else 'metal'); c.put(16, y + 1, 'gem' if nid == 'necklace_pendant' else 'metal'); return c
EARS = {'earrings_drop': 'Drop earrings', 'earrings_hoop': 'Hoop earrings'}
def ears(g, eid):
    c = Cv(); ey = g['ey']; hx, hw = g['hx'], g['hw']
    for x in (hx - 1, hx + hw): c.put(x, ey + 2, 'metal'); c.put(x, ey + 3, 'gem') if eid == 'earrings_drop' else None
    return c
WRIST = {'bracelet_bangle': 'Bangle', 'watch': 'Watch'}
def wrist(g, wid):
    c = Cv(); y = g['ty'] + g['th'] - 2; x = g['tx'] if g['arm'] > 1 else g['tx']
    c.rect(x, y, g['arm'], 1, 'metal'); c.put(x, y, 'gem') if wid == 'watch' else None; return c
HAND = {'ring_band': 'Gold band', 'ring_solitaire': 'Solitaire ring', 'ring_signet': 'Signet ring'}
def hand(g, rid):
    c = Cv(); c.put(g['tx'] + g['tw'] - 1, g['ty'] + g['th'] - 1, 'gem' if rid != 'ring_band' else 'metal'); return c
# ---------- registry ----------
FREE = {'tshirt', 'tank', 'jeans', 'slacks', 'sneakers', 'sandals', 'beanie'}
SLOTS = [  # (slot id, label, dict/ids, painter, perBuild, minAge by id)
    ('body', 'Body', {'base': 'Base body'}, lambda g, i: body(g), True),
    ('bottom', 'Bottoms', {k: v[0] for k, v in BOTTOMS.items()}, bottom, True),
    ('shoes', 'Shoes', SHOES, shoes, True),
    ('top', 'Tops', {k: v[0] for k, v in TOPS.items()}, top, True),
    ('neck', 'Necklace', NECK, neck, True), ('wrist', 'Wrist', WRIST, wrist, True), ('hand', 'Rings', HAND, hand, True),
    ('facial', 'Facial hair', FACIAL, facial, False), ('eyes', 'Eyes', {'eyes': 'Eyes'}, lambda g, i: eyes(g), False),
    ('hair', 'Hair', HAIR, hair, False), ('glasses', 'Glasses', GLASSES, glasses, False), ('hat', 'Hats', HATS, hat, False), ('ears', 'Earrings', EARS, ears, False)]
MIN_AGE = {'facial': 14, 'glasses': 3, 'hat': 2, 'neck': 6, 'wrist': 8, 'hand': 14, 'ears': 5}
CLOTHING_MAP = {'tshirt': 'tshirt', 'hoodie': 'hoodie', 'sweater': 'sweater', 'jeans': 'jeans', 'shorts': 'shorts', 'skirt': 'skirt', 'sundress': 'sundress', 'dress_shirt': 'dress_shirt', 'blazer': 'blazer', 'evening_gown': 'evening_gown', 'trench_coat': 'trench_coat', 'puffer_coat': 'puffer_coat', 'lab_coat': 'lab_coat', 'scrubs': 'scrubs', 'police_uniform': 'police_uniform', 'chef_coat': 'chef_coat', 'hard_hat': 'hard_hat', 'grad_cap': 'grad_cap', 'sneakers': 'sneakers', 'heels': 'heels', 'boots': 'boots', 'baseball_cap': 'baseball_cap', 'cowboy_hat': 'cowboy_hat', 'top_hat': 'top_hat'}
JEWELRY_MAP = {'band': 'ring_band', 'solitaire_half': 'ring_solitaire', 'solitaire_one': 'ring_solitaire', 'solitaire_two': 'ring_solitaire', 'ruby_ring': 'ring_signet', 'emerald_ear': 'earrings_drop', 'stud_ear': 'earrings_hoop', 'pearl_pend': 'necklace_pearl', 'sapphire_pend': 'necklace_pendant', 'charm': 'bracelet_bangle', 'tiara': 'necklace_chain'}
def main():
    n = 0; manifest = []; layers = {}
    for slot, label, ids, fn, perb in SLOTS:
        layers[slot] = []
        for lid, name in ids.items():
            slotset = set(); 
            for age in AGES:
                for b in (BUILDS if perb else ['all']):
                    g = geom(age['id'], 'avg' if b == 'all' else b); cv = fn(g, lid)
                    d = os.path.join(OUT, age['id'], b); os.makedirs(d, exist_ok=True)
                    open(os.path.join(d, lid + '.svg'), 'w').write(cv.svg(used_slots(cv))); slotset |= set(used_slots(cv)); n += 1
            defaults = {k: DEF[k] for k in sorted(slotset)}
            e = dict(id=lid, slot=slot, name=name, slots=sorted(slotset), defaults=defaults, perBuild=perb, minAge=MIN_AGE.get(slot, 0), free=(lid in FREE or slot in ('body', 'eyes', 'hair', 'facial', 'glasses')), file=f'{{age}}/{{build}}/{lid}.svg')
            layers[slot].append(e); manifest.append(e)
    meta = dict(format='slot-svg-v1', kind='character-layers', viewBox='0 0 128 128', grid=32, cell=4, outline=OL, order=['body', 'bottom', 'shoes', 'top', 'neck', 'wrist', 'hand', 'facial', 'eyes', 'hair', 'ears', 'glasses', 'hat'],
                ages=AGES, builds=BUILDS, slotDefaults=DEF, layers=layers, base='assets/art/characters/')
    meta.update(
        skins=['#ffe0c7', '#f6d3b3', '#e8b98d', '#d39a6a', '#c68642', '#a86b3c', '#8d5524', '#5e3a1e'],
        hairColors=['#111111', '#2b1b10', '#5a3a22', '#8a5a2b', '#caa04a', '#e6c27a', '#c0392b', '#9aa0a6', '#f1f1f1', '#4a2a7a', '#2a6a8a', '#d6578b'],
        eyeColors=['#3b2a1a', '#6b4423', '#3b6fb0', '#2f8f5b', '#7a8a3a', '#7a8a99', '#5a3a7a'],
        clothColors=['#4a6fa5', '#c0392b', '#2f8f5b', '#e6b422', '#7a4aa5', '#222233', '#f3efe4', '#d6578b', '#8a5a2b', '#e87d2b', '#3aa6a6', '#777788'],
        clothingMap=CLOTHING_MAP, jewelryMap=JEWELRY_MAP, free=sorted(FREE),
        defaults=dict(top='tshirt', bottom='jeans', shoes='sneakers'))
    json.dump(meta, open(os.path.join(ROOT, 'data', 'character_layers.json'), 'w'), indent=1)
    json.dump(dict(format='slot-svg-v1', kind='character-layers', layers=manifest), open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    cnt = {s: len(v) for s, v in layers.items()}; print(n, 'svg files', cnt)
main()
