"""Interior depth pass (Gary, Oct 22 2026: "interior assets look 2d and feel flat ... need side panels").

Classic 3/4 interior structure (reference only, no art copied): every furniture piece gets
  * a lighter TOP face (1 palette step up) and a FRONT face 1-2 steps darker than the top,
  * a narrow RIGHT side panel (4-8 native px, darker again) on stand-alone pieces and row ends (light from the top-left),
  * a 1px dark outline on the bottom and side edges (top edge stays open),
walls get thickness (lit cap strip under the ceiling band + darker skirting board where wall meets floor),
windows and door leaves get a recessed inner edge (top + left, the frame shades the opening).
Rugs, mats, posters and other flat pieces are untouched. NO floor/contact/wall-base shadow is baked: Coder's engine draws those
(toggleable), so the old baked alpha-96 contact shadows under furniture are stripped here (table flag strip_baked_shadow).

Palette only: every new colour is a palette.hex step (OKLab ramp), never INTO a night-glow colour, and never one of the floor/wall
codes drawn on any map where the piece appears (GAME_QUALITY_CHECKLIST "Furniture never shares colour codes with the floor or walls").
Wall shades for the recolourable home walls stay inside their recolour family, so all 7 home schemes recolour them exactly.

Same pattern as furniture_fix.py: `solve()` (run once, on pre-depth art) writes tools/furniture_depth_table.json (resolved colour
look-ups per piece); build.py / furniture_fix.apply_interior_sheets apply it deterministically. KILUMEN_DEPTH=0 disables the pass.
Tall tops (row 0 of upright 2-row pieces) are lifted to the overlay layer by lift_tops(MAPS) (run.py), bases stay solid on decoration.
"""
import os, re, json, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
TABLE = os.path.join(HERE, 'furniture_depth_table.json')
ON = os.environ.get('KILUMEN_DEPTH', '1') != '0'
SHADOW = (26, 18, 38, 96)

# ---------------- classification ----------------
SKIP = re.compile(r'(rug|(^|_)mat(_|$)|poster|logo_panel|banner|timetable|sign_|river_stones|^i_net$|ship_wheel|^rail$|^x_|door|stairs|window|lamp|brazier|plate_|switch|gate_|handcar)')
ORGANIC = re.compile(r'^(plant|i_plant_)')
FLATTOP = re.compile(r'(bed|table|counter|desk|sofa|bench|chair|stool|crate|polisher|barrel|salt_jars|^pc$|^i_pc$|^tv$|^i_tv$|radio|anchor)')
LIFT = re.compile(r'^(bookcase|shelf|goods|cooler|filing|crystal_display|pillar|i_bookcase_\w+|i_cupboard_\w+|i_kitchen_\w+|i_locker|i_server_rack|i_specimen_tank|i_lab_machine|i_plant_palm|i_crystal_display|i_fireplace)_0_\d+$')
WALL_UP = re.compile(r'^(i_wall_upper_(?!win_)\w+|i_wall_upper_win_\w+|iwall_upper_\w+)$')
WALL_FACE = re.compile(r'^(i_wall_face_\w+|iwall_face_\w+)$')
RECESS = re.compile(r'^(i_wall_upper_win_\w+|window_(dawn|day|dusk|night)_[tb]|i_staffdoor_locked_[01]_0)$')
def group_of(name):
    m = re.match(r'^(.*)_(\d+)_(\d+)$', name)
    return (m.group(1), int(m.group(2)), int(m.group(3))) if m else (name, 0, 0)

# ---------------- palette + ramp steps ----------------
def _hx(c): return '%02x%02x%02x' % tuple(c[:3])
PAL = [l.strip().lower() for l in open(os.path.join(OUT, 'palette.hex')) if l.strip()]
def _oklab(h):
    c = np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    return M2 @ np.cbrt(M1 @ c)
LAB = {h: _oklab(h) for h in PAL}
def _lum(h): r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4)); return 0.299 * r + 0.587 * g + 0.114 * b
def glow_colours():
    n = json.load(open(os.path.join(OUT, 'time_of_day', 'grades.json')))['grades']['night']; g = n.get('lit', n)['map']
    return {s for s, d in g.items() if _lum(s) > 40 and _lum(d) / _lum(s) > 0.8}
GLOW = glow_colours()
OUTLINE_L = 0.36
HUE_MAX = 0.055            # pixels darker than this are already outline/ink: never stepped
def ranked(c, op):
    """palette candidates for op in ('up','dn','dn2','ol'), best first."""
    if c not in LAB: return []
    L, a, b = LAB[c]; out = []
    tgt = {'up': 0.09, 'dn': 0.09, 'dn2': 0.17, 'ol': max(0.14, L - 0.27)}[op]
    for d in PAL:
        if d == c or (d in GLOW and c not in GLOW): continue
        L2, a2, b2 = LAB[d]; dL = (L2 - L) if op == 'up' else (L - L2)
        if not (0.03 < dL < tgt + 0.16): continue
        ta, tb = (a, b) if op == 'up' else (a * 0.95 + 0.006, b * 0.85 - 0.012)
        dab = ((a2 - ta) ** 2 + (b2 - tb) ** 2) ** 0.5
        if dab > HUE_MAX: continue
        C1, C2 = (a * a + b * b) ** 0.5, (a2 * a2 + b2 * b2) ** 0.5
        if C1 > 0.03:                              # coloured source: keep its hue family and most of its chroma
            dh = abs((np.degrees(np.arctan2(b2, a2) - np.arctan2(b, a)) + 180) % 360 - 180)
            if dh > 35 or C2 < 0.5 * C1: continue                 # same material: no hue jumps (a wood top stays wood)
        out.append(((dL - tgt) ** 2 * 3 + (a2 - ta) ** 2 + (b2 - tb) ** 2, d))
    return [d for _, d in sorted(out)]

# ---------------- geometry (native 64px, composite of a multi-cell piece) ----------------
def _L(a):
    return (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]).astype(float)
def top_front_edge(a, M, y0, y1):
    """row where the lit top face meets the front face: the strongest light->dark step in row luminance (opaque pixels),
    searched in the lower 3/4 of the piece; falls back to the bottom 30%."""
    L = _L(a); cnt = M.sum(1); mean = np.where(cnt > 0, (L * M).sum(1) / np.maximum(cnt, 1), np.nan)
    best, by = 0.0, None; lo = y0 + max(6, (y1 - y0) // 4); hi = y1 - 5
    for y in range(lo, hi + 1):
        up = np.nanmean(mean[max(y0, y - 5):y]); dn = np.nanmean(mean[y:y + 5])
        if np.isfinite(up) and np.isfinite(dn) and up - dn > best: best, by = up - dn, y
    return by if (by is not None and best > 12) else y1 - int(np.clip(round(0.3 * (y1 - y0 + 1)), 6, 18)) + 1
def piece_masks(name, a, panel=True):
    """a: HxWx4 uint8 composite. -> {op: bool mask}, applied in order up, dn, dn2, ol (later wins)."""
    H, W = a.shape[:2]; M = a[..., 3] == 255
    if not M.any(): return {}
    rows = np.arange(H)[:, None]; cols = np.arange(W)[None, :]
    ytop = np.where(M.any(0), M.argmax(0), H)[None, :]
    ybot = np.where(M.any(0), H - 1 - M[::-1].argmax(0), -1)[None, :]
    xr = np.where(M.any(1), W - 1 - M[:, ::-1].argmax(1), -1)[:, None]
    hs = int(M.any(1).sum()); ws = int(M.any(0).sum())
    right_cont = M[:, -1].mean() > 0.5; left_cont = M[:, 0].mean() > 0.5
    up = np.zeros_like(M); dn = np.zeros_like(M); dn2 = np.zeros_like(M)
    y0 = int(M.any(1).argmax()); y1 = H - 1 - int(M.any(1)[::-1].argmax())
    if ORGANIC.match(name):                      # plants: lit crown/pot left, shaded right third
        xl = np.where(M.any(1), M.argmax(1), W)[:, None]
        dn = M & (cols > xl + (xr - xl) * 0.62)
        top = np.zeros_like(M)
    elif FLATTOP.search(name):                   # table/bed/counter/sofa: big lit top, front band at the bottom
        yb = top_front_edge(a, M, y0, y1)
        if re.search(r'bed', name): yb = y1 - 9                     # a bed is all top (mattress, blanket): front = footboard only
        elif y1 - yb + 1 > 0.45 * hs: yb = y1 - int(np.clip(round(0.3 * hs), 6, 18)) + 1
        front = M & (rows >= yb) & (rows >= ytop + 4)
        top = M & ~front
        up = top & (rows < ytop + 20); dn = front.copy()   # big tops (beds, long tables) light only their first 20 rows: no washed-out blankets
    else:                                        # upright (bookcase, cupboard, fridge, locker ...): lit top band, front 1 step darker
        top = M & (rows < ytop + 7)
        up = top.copy(); dn = M & (rows > y1 - 4)   # plinth
    # right side panel: stand-alone pieces and row ends (piece does not continue past its right edge)
    if panel and not right_cont and ws >= 12:
        pw = 6 if ws >= 40 else 4
        panel = M & (cols > xr - pw)
        dn2 = panel & ~top; dn = (dn | (panel & top)) & ~dn2; up &= ~panel
    # outline: bottom + side edges (top stays open). Row/piece continuation edges get none.
    T = np.pad(~M, 1, constant_values=True)
    below = T[2:, 1:-1]; left = T[1:-1, :-2]; right = T[1:-1, 2:]
    if left_cont: left = left & (cols > 0)
    if right_cont: right = right & (cols < W - 1)
    ol = M & (below | left | right)
    for m in (up, dn, dn2): m &= ~ol
    return dict(up=up, dn=dn, dn2=dn2, ol=ol)

def wall_masks(name, a):
    H, W = a.shape[:2]; M = a[..., 3] == 255; rows = np.arange(H)[:, None] * np.ones((1, W), int)
    if WALL_UP.match(name):   # cap strip: wall top catches the light, 1px shade line under the lip
        return dict(up=M & (rows < 4), dn=M & (rows == 4))
    if WALL_FACE.match(name): # skirting board: lit top edge, darker board
        return dict(up=M & (rows == H - 8), dn2=M & (rows > H - 8))
    return {}

def recess_mask(name, a, rect):
    x0, y0, x1, y1 = rect; H, W = a.shape[:2]; m = np.zeros((H, W), bool)
    m[y0:y0 + 2, x0:x1] = True; m[y0:y1, x0:x0 + 2] = True
    return dict(dn=m & (a[..., 3] == 255))

# ---------------- apply ----------------
def _apply_lut(a, mask, lut):
    if not lut or not mask.any(): return
    key = np.vectorize(lambda r, g, b: '%02x%02x%02x' % (r, g, b))(a[..., 0], a[..., 1], a[..., 2])
    for s, d in lut.items():
        sel = mask & (key == s) & (a[..., 3] == 255)
        if sel.any(): a[sel, 0], a[sel, 1], a[sel, 2] = int(d[0:2], 16), int(d[2:4], 16), int(d[4:6], 16)
def _masks(k, entry, name, a):
    if k == 'piece': return piece_masks(name, a, entry.get('panel', True))
    if k == 'wall': return wall_masks(name, a)
    if k == 'recess':
        m = np.zeros(a.shape[:2], bool)
        for x, y in entry['px']: m[y, x] = True
        return dict(dn=m & (a[..., 3] == 255))
    return {}
def apply_piece(entry, name, a):
    """a: composite RGBA (a modified copy is returned). Masks are computed on the input art, then colour look-ups applied (later ops win)."""
    a = a.copy()
    if entry.get('strip_baked_shadow'):
        sh = (a[..., 3] > 0) & (a[..., 3] < 255) & np.all(a == np.array(SHADOW, np.uint8), axis=-1); a[sh] = 0
    kinds = entry['kind'] if isinstance(entry['kind'], list) else [entry['kind']]
    plan = []
    for k in kinds:
        lut = entry['wall_lut'] if (k == 'wall' and 'wall_lut' in entry) else entry['lut']
        plan += [(op, m, lut.get(op, {})) for op, m in _masks(k, entry, name, a).items()]
    b = a.copy(); order = {'up': 0, 'dn': 1, 'dn2': 2, 'ol': 3}
    for op, m, lut in sorted(plan, key=lambda t: order[t[0]]):
        src = a.copy(); _apply_lut(src, m, lut); b[m] = src[m]
    return b
def load_table(): return json.load(open(TABLE)) if os.path.exists(TABLE) else {'groups': {}}

# Coder's engine depth pass (src/overworld/depth.json) now casts contact shadows for these casters, so the old baked alpha-96
# SHADOW pixels double up: strip them (exact SHADOW colour only). Ledges, cliffs, tall grass / ferns, dais, rail, fish_shadow,
# switches and floor plates keep theirs (the engine does not cast them). x_ tiles in tiles_extra belong to the biome worker.
STRIP_SHADOW = re.compile(r'^(tree_base|treed_base|bush|rock|cave_rock|boulder|sign|lamp|keeper_lantern|memorial_stone_\w+|memorial_bench|bin_ron_\w+|'
                          r'rt_barricade|handcar_\w+|push_boulder|crystal_barrier_dim|pillar_\d_\d|i_company_terminal|x_bench_\d_\d|x_station_pillar_\d_\d|'
                          r'i_ship_wheel|i_brazier|i_sign_board|i_boulder|i_power_cube|i_cool_stone|i_crystal_(off|on|reset)|i_bellows|i_gate_closed|'
                          r'i_mirror_\w+|i_beam_\w+)$')
STRIPPED = []
def strip_shadow(a):
    hit = np.all(a == np.array(SHADOW, np.uint8), -1); a[hit] = 0; return int(hit.sum())

def apply_frames(TILES, only=None):
    """build.py post-pass (after furniture_fix.apply_frames): core frames (not x_). Late core tiles (registered after build, e.g.
    world_data's i_company_terminal) are skipped here and passed again with only={group}."""
    if not ON: return []
    tb = load_table(); BY = {t['name']: t for t in TILES}; done = []
    for g, e in tb['groups'].items():
        if e['src'] != 'core' or (only is not None and g not in only): continue
        if any(n not in BY for n, _, _ in e['cells']): continue
        done.append(g)
        cells = e['cells']; R = 1 + max(r for _, r, _ in cells); C = 1 + max(c for _, _, c in cells)
        nfr = max(len(BY[n]['frames']) for n, _, _ in cells)
        for fi in range(nfr):
            comp = np.zeros((R * 64, C * 64, 4), np.uint8)
            for n, r, c in cells:
                fr = BY[n]['frames']; comp[r * 64:r * 64 + 64, c * 64:c * 64 + 64] = np.array(fr[min(fi, len(fr) - 1)].convert('RGBA'))
            out = apply_piece(e, g, comp)
            for n, r, c in cells:
                fr = BY[n]['frames']
                if fi < len(fr): fr[fi] = Image.fromarray(out[r * 64:r * 64 + 64, c * 64:c * 64 + 64].copy(), 'RGBA')
    for t in TILES:
        n = t['name']
        if not STRIP_SHADOW.match(n) or (only is not None and n not in only): continue
        k = 0
        for fi, f in enumerate(t['frames']):
            a = np.array(f.convert('RGBA')); k += strip_shadow(a); t['frames'][fi] = Image.fromarray(a, 'RGBA')
        if k: STRIPPED.append((n, k))
    return done

def apply_sheet_1x(sheets, IT):
    """sheets: {sheet path 'tiles_1x/x.png': HxWx4 array (1x, post-swap)} modified in place."""
    if not ON: return
    tb = load_table(); E = {e['name']: e for e in IT['tiles']}
    def idxs(n): e = E[n]; return sorted(set((e.get('animation') or {}).get('frames') or []) | {e['index']})
    for g, e in tb['groups'].items():
        if e['src'] != 'i': continue
        cells = e['cells']; R = 1 + max(r for _, r, _ in cells); C = 1 + max(c for _, _, c in cells)
        nfr = max(len(idxs(n)) for n, _, _ in cells)
        for fi in range(nfr):
            comp = np.zeros((R * 64, C * 64, 4), np.uint8); where = []
            for n, r, c in cells:
                ii = idxs(n); i = ii[min(fi, len(ii) - 1)]; a = sheets[E[n]['sheet']]
                comp[r * 64:r * 64 + 64, c * 64:c * 64 + 64] = a[(i // 16) * 64:(i // 16) * 64 + 64, (i % 16) * 64:(i % 16) * 64 + 64]
                if fi < len(ii): where.append((n, r, c, i))
            out = apply_piece(e, g, comp)
            for n, r, c, i in where:
                sheets[E[n]['sheet']][(i // 16) * 64:(i // 16) * 64 + 64, (i % 16) * 64:(i % 16) * 64 + 64] = out[r * 64:r * 64 + 64, c * 64:c * 64 + 64]
    for n in E:
        if not STRIP_SHADOW.match(n): continue
        k = 0
        for i in idxs(n):
            k += strip_shadow(sheets[E[n]['sheet']][(i // 16) * 64:(i // 16) * 64 + 64, (i % 16) * 64:(i % 16) * 64 + 64])
        if k: STRIPPED.append((n, k))

def lift_tops(MAPS, names):
    """row 0 of upright 2-row pieces (beds are low: not lifted): decoration -> overlay (draws above characters). Collision unchanged; bases stay on decoration."""
    log = []
    for m in MAPS:
        if m.name not in names: continue
        pre = getattr(m, 'pre', None); n = 0
        spots = {(sp['x'], sp['y']) for sp in getattr(m, 'interact_spots', [])}   # text spots look up decoration
        for y in range(m.h):
            for x in range(m.w):
                t = m.deco[y][x]
                if t and LIFT.match(t) and not m.over[y][x] and (x, y) not in spots:
                    m.over[y][x], m.deco[y][x] = t, None
                    if pre: G, D, O, C, E = pre; O[y][x], D[y][x] = D[y][x], 0
                    n += 1
        if n: log.append(f'{m.name}: {n} tall tops -> overlay')
    return log
