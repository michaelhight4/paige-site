# Player's home dressing (Gary, Oct 23 2026, 9:18 AM CT: a new game starts at home; wake in house_2f, Ron on house_1f).
# house_1f / house_2f are UNIQUE core maps (not in interiors_merge.HOME_POOL), so they get their own furniture tiles here.
# Layout lives in tools/maps.py (the maps place the interiors-kit SOURCE names, so collision, lift_tops and checks work as usual).
# late(res) runs after every map is final (run.py, after reed_lamps_late, before assign_new): it registers the home_* tiles
# (new names, not in the id ledger: assign_new numbers them after every other new tile, nothing renumbered) and swaps the
# placed source tiles for them in house_1f / house_2f only. Other homes keep the kit art untouched.
# Each home_* tile = the kit tile's pixels with every colour code that the house floor/walls use swapped for the nearest
# palette.hex colour that the floor/walls do not use (furniture-colour rule, GAME_QUALITY_CHECKLIST Oct 22 2026), never a
# night-glow colour unless the source already glowed. home_table_toast_0_0/0_1 = the core table with toast on the plate
# (+ a glass of milk). No bottles, steam or smoke anywhere.
import os, json
import numpy as np
from PIL import Image
import build
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
MAPS_ = ('house_1f', 'house_2f')
SURFACE = ('floor_wood', 'iwall_face_house', 'iwall_upper_house', 'iwall_top')
# kit source -> home tile (order = registration order = id order)
KIT = ['i_kitchen_fridge_0_0', 'i_kitchen_fridge_1_0', 'i_kitchen_counter_0_0', 'i_kitchen_counter_1_0', 'i_kitchen_sink_0_0',
       'i_kitchen_sink_1_0', 'i_kitchen_stove_0_0', 'i_kitchen_stove_1_0', 'i_bookcase_cinder_0_0', 'i_bookcase_cinder_1_0',
       'i_radio', 'i_fishing_rods', 'i_crates_0_0', 'i_crates_0_1', 'i_lab_desk_0_1', 'i_dresser_brook', 'i_luggage', 'i_globe']
NOTES = {'i_bookcase_cinder': "Ron's bookcase", 'i_radio': "Ron's radio", 'i_fishing_rods': "Ron's fishing rods", 'i_crates': "Ron's packed boxes",
         'i_lab_desk_0_1': "player's desk (beside the pc)", 'i_dresser_brook': "player's bedside dresser", 'i_luggage': "player's travel bag",
         'i_globe': "player's globe", 'i_kitchen': 'shared kitchen'}
def home_name(src): return 'home_' + src[2:]
TOAST = {'table_0_0': 'home_table_toast_0_0', 'table_0_1': 'home_table_toast_0_1'}

def _key(a): return (a[..., 0].astype(np.int64) << 16) | (a[..., 1].astype(np.int64) << 8) | a[..., 2]
def _hex(a): return {'%06x' % v for v in np.unique(_key(a)[a[..., 3] == 255])}
def _lab(h):
    from skimage.color import rgb2lab
    return rgb2lab(np.array([[[int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]]]))[0, 0]
def _dE(a, b):
    A, B = _lab(a), _lab(b); return float(np.sqrt(((A[0] - B[0]) * 1.3) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2))
def _put(a, sel, h):
    rgb = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    if isinstance(sel, np.ndarray): a[sel, 0], a[sel, 1], a[sel, 2] = rgb
    else: a[sel + (slice(0, 3),)] = rgb

def surface_codes():
    s = set()
    for n in SURFACE: s |= _hex(np.array(build.BYNAME[n]['frames'][0].convert('RGBA')))
    return s
def recolour(a, S):
    """exact colour swaps: every code in S -> nearest palette colour not in S and not already in the tile (shading stays distinct)."""
    import interiors_merge as I
    pal = [l.strip().lower() for l in open(os.path.join(OUT, 'palette.hex')) if l.strip()]
    have = _hex(a); mp = {}
    for c in sorted(have & S):
        used = (have - set(mp)) | set(mp.values())
        cand = [r for r in pal if r not in S and r not in used and (r not in I.GLOW or c in I.GLOW)]
        mp[c] = min(cand, key=lambda r: (_dE(c, r), r))
    out = a.copy(); k = _key(a); op = a[..., 3] > 0
    for s, d in mp.items(): _put(out, op & (k == int(s, 16)), d)
    return out, mp
def kit_px(name):
    IT = json.load(open(os.path.join(OUT, 'interiors_new', 'tileset_interiors.json')))
    e = next(t for t in IT['tiles'] if t['name'] == name)
    sh = np.array(Image.open(os.path.join(OUT, 'interiors_new', e['sheet'])).convert('RGBA'))
    return sh[e['row'] * 64:e['row'] * 64 + 64, e['col'] * 64:e['col'] * 64 + 64].copy(), e['collision']

# toast: two slices on the plate (crust 9f4013, crumb eea23c, toasted edge d46616, butter fcf6e8 on cream plate rim); milk glass
CRUST, CRUMB, EDGE, BUTTER = '9f4013', 'eea23c', 'd46616', 'fcf6e8'
GLASS, MILK = 'c6ecfa', 'fcf6e8'
def toast_table():
    """core table (2 tiles, frames after furniture_fix) with the orange food on the plate replaced by toast, + a milk glass."""
    a = np.concatenate([np.array(build.BYNAME['table_0_0']['frames'][0].convert('RGBA')),
                        np.array(build.BYNAME['table_0_1']['frames'][0].convert('RGBA'))], 1)
    k = _key(a)
    # the food disc = f08868 dither + the d46616 pixels between them (inside the plate ring); clean it to plate cream first
    g = k == 0xf08868; ys, xs = np.nonzero(g); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    nb = np.zeros_like(g); nb[1:] |= g[:-1]; nb[:-1] |= g[1:]; nb[:, 1:] |= g[:, :-1]; nb[:, :-1] |= g[:, 1:]
    _put(a, g | ((k == 0xd46616) & nb), 'fcf6e8')
    def slice_(sx, sy):   # 8x8 slice: rounded top, crust outline, crumb, toasted edge, butter pat
        for dy in range(8):
            for dx in range(8):
                if dy == 0 and dx in (0, 7): continue
                edge = dx in (0, 7) or dy in (0, 7) or (dy == 1 and dx in (1, 6))
                c = CRUST if edge else (EDGE if (dx + dy) % 5 == 0 else CRUMB)
                _put(a, np.s_[sy + dy:sy + dy + 1, sx + dx:sx + dx + 1], c)
        _put(a, np.s_[sy + 3:sy + 5, sx + 3:sx + 5], BUTTER)
    cy = (y0 + y1) // 2; cx = (x0 + x1) // 2
    slice_(cx - 8, cy - 5); slice_(cx - 1, cy - 3)
    # glass of milk on the right half (table_0_1), clear of the plate
    gx, gy = cx + 20, y0 - 2
    for dy in range(9):
        for dx in range(5):
            c = GLASS if dx in (0, 4) or dy == 8 else (MILK if dy >= 2 else GLASS)
            _put(a, np.s_[gy + dy:gy + dy + 1, gx + dx:gx + dx + 1], c)
    return a[:, :64], a[:, 64:]

def clear_tubes(a):
    """i_lab_desk_0_1 has two test tubes at x 0-3 / 8-13, y 14-29: drop the tops above the desk, repaint the desk top from the plain run to the right (even offsets keep the dither)."""
    a = a.copy(); a[14:18, 0:4, 3] = 0; a[14:18, 8:14, 3] = 0
    a[18:30, 0:4] = a[18:30, 16:20]; a[18:30, 8:14] = a[18:30, 16:22]
    return a

def tiles():
    """(name, pixels, coll, notes, source, swaps) for every home_* tile, in registration order."""
    S = surface_codes(); out = []
    for src in KIT:
        px, coll = kit_px(src); new, mp = recolour(px, S)
        if src == 'i_lab_desk_0_1': new = clear_tubes(new)   # no flask/vial look on the player's desk (rule: nothing that reads as a bottle)
        note = next((v for k, v in NOTES.items() if src.startswith(k)), "player's home")
        out.append((home_name(src), new, 'walk' if coll == 'walk' else 'block', f"{note}: {src} art, colours swapped off the house floor/walls ({len(mp)} codes). tools/home_start.py", src, mp))
    l, r = toast_table()
    for nm, px in (('home_table_toast_0_0', l), ('home_table_toast_0_1', r)):
        bad = _hex(px) & S; assert not bad, (nm, bad)
        out.append((nm, px, 'block', 'house_1f breakfast table: core table with toast on the plate and a glass of milk. tools/home_start.py', nm.replace('home_table_toast', 'table'), {}))
    return out

def late(res):
    ids = {}; log = []
    for nm, px, coll, note, src, mp in tiles():
        ids[src] = (nm, build.reg(nm, 'interior', Image.fromarray(px, 'RGBA'), coll, raw=True, notes=note)['id'])
    for mn in MAPS_:
        m, G, D, O, C, E = res[mn]; n = 0
        for L, names in ((D, m.deco), (O, m.over)):
            for y in range(m.h):
                for x in range(m.w):
                    v = names[y][x]
                    if v in ids and (mn == 'house_1f' or not v.startswith('table_')):
                        nm, i = ids[v]; L[y][x] = i; names[y][x] = nm; n += 1
        log.append(f'{mn}: {n} cells -> home_* tiles')
    return log
