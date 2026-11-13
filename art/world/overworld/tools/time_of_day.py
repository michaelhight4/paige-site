# Time-of-day colour grades (SOUL_PLAYBOOK #9, 7:29 PM ruling): NO tile repaint. Four flat per-colour grades of palette.hex
# (dawn / day / dusk / night). day = identity. Every palette colour maps to exactly one graded colour (a palette swap, so it stays
# pixel art: no gradients, no blending, no dithering added). Outputs:
#   time_of_day/grades.json          exact palette swap tables (use these for tiles: every tile pixel is a palette.hex colour or SHADOW)
#   time_of_day/lut_<grade>.png      64x64 3D LUT (16^3, 4x4 slices of 16x16) of the tile grade (NO lights), for off-palette tile pixels
#   time_of_day/lut_<grade>_lit.png  same with lights on: used ONLY on emissive-mask pixels
#   time_of_day/lut_<grade>_sprite.png  sprite grade (no lights; sprites never glow by colour)
#   time_of_day/emissive/<sheet>.png 1x masks (255 = emissive) built from EMISSIVE below: the ONLY place tiles may stay lit
#   previews/time_of_day.png         Brookhollow + Lantern Rest under all four grades (rendered from tiles, with the masks)
# GLOW RULE (GAME_QUALITY_CHECKLIST, Oct 22 2026): what glows is decided by WHERE it is (EMISSIVE tile list -> mask), never by colour.
# Every tile pixel gets the no-lights grade; only pixels inside the emissive mask get the lit grade (grade_fn(..., lights=True)),
# which keeps lamp glass / flame / crystal colours bright and leaves the dark parts of the same tile (lamp post) graded normally.
# Before this, the lit grade was applied to EVERY tile pixel, so cobble highlights that share or sit near the lamp creams /
# crystal violets stayed lit at night ("yellow cobbles"). To make a new tile glow: add its name here and re-run this tool.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OW = os.path.join(HERE, '..')
PAL = [l.strip().lower() for l in open(os.path.join(OW, 'palette.hex')) if l.strip()]
SHADOW = (26, 18, 38, 96)
GRADES = ('dawn', 'day', 'dusk', 'night')

def _lum(c): return c @ np.array([0.3, 0.59, 0.11])
def grade_fn(name, rgb, lights=True):
    """rgb: (...,3) float 0-255 -> graded (...,3) float. Light sources (warm brights) and the violet crystal accent stay lit at night/dusk."""
    c = np.asarray(rgb, float)
    if name == 'day': return c.copy()
    L = _lum(c)[..., None]; r, g, b = c[..., 0], c[..., 1], c[..., 2]
    warm_light = (lights & (r > 220) & (g > 170) & (b < 200) & (L[..., 0] > 190))[..., None]           # lamp glass, windows, candle, sun spots
    violet = (lights & (b > g + 40) & (r > g + 10) & (b > 140))[..., None]                                  # crystal accent
    if name == 'dawn':
        o = L + (c - L) * 0.85; o = o * np.array([1.04, 0.93, 0.95]) + np.array([16, 6, 14]); o = o * 0.92 + 8
    elif name == 'dusk':
        o = L + (c - L) * 1.05; o = o * np.array([1.0, 0.78, 0.72]) + np.array([22, 4, 18]); o = o * 0.86 + 4
        o = np.where(warm_light, c * np.array([1.0, 0.95, 0.85]) + np.array([0, 4, 0]), o)
    elif name == 'night':
        o = L + (c - L) * 0.45; o = o * np.array([0.42, 0.5, 0.78]) + np.array([10, 10, 34])
        o = np.where(warm_light, c * np.array([1.0, 0.92, 0.78]), o)                                  # lights stay on
        o = np.where(violet & ~warm_light, c * np.array([0.82, 0.78, 0.98]) + np.array([4, 0, 10]), o)  # crystals keep glowing
    return np.clip(np.rint(o), 0, 255)

# Emissive tiles: name -> None (whole tile, all animation frames) or a list of [x0, y0, x1, y1) boxes in tile pixels.
# Hand-authored from the sheets (lamp heads, lanterns, flames, crystals, lit windows). Interiors stay on the day grade in-game, but
# their real light sources are listed too so any room that ever follows the outdoor clock keeps them lit.
EMISSIVE = {
    # The Firefly (tools/club.py): dance floor amber/green (never violet) + neon firefly / music-notes signs on the Fernwick front
    'club_dance_a': None, 'club_dance_b': None, 'club_front_0_0': [[40, 4, 64, 40]], 'club_front_0_1': [[0, 4, 64, 40]], 'club_front_0_2': [[0, 4, 24, 40]], 'club_front_1_0': [[6, 6, 46, 42]],
    # outdoor props
    'lamp': None, 'keeper_lantern': None, 'crystal': None, 'crystal_barrier_lit': None, 'mushroom_glow': None, 'crystal_switch_on': None,
    # crystals built into building fronts (boxes = the crystal only, not the wall / violet roof around it)
    'heal_centre_2_3': [[13, 12, 52, 54]],
    'office_0_2': [[40, 31, 64, 64]], 'office_0_3': None, 'office_0_4': [[0, 31, 25, 64]],
    'office_1_2': [[36, 0, 64, 64]], 'office_1_3': None, 'office_1_4': [[0, 0, 29, 64]],
    'office_2_2': [[46, 0, 64, 24]], 'office_2_3': [[0, 0, 64, 36]], 'office_2_4': [[0, 0, 19, 24]],
    'office_3_2': [[13, 33, 29, 50]], 'office_3_4': [[35, 33, 51, 50]],
    'cave_entrance_0_0': [[39, 22, 59, 64]], 'cave_entrance_1_0': [[30, 0, 54, 30]], 'cave_entrance_1_2': [[11, 5, 34, 40]],
    # lit windows (window_<phase>_* follow the outdoor phase; only the dusk / night glass is lit from inside)
    'window_dusk_t': None, 'window_dusk_b': None, 'window_night_t': None, 'window_night_b': None,
    # interior light sources
    'fireplace_0_0': None, 'fireplace_0_1': None, 'fireplace_1_0': None, 'fireplace_1_1': None, 'brazier': None,
    'i_fireplace_0_0': None, 'i_fireplace_0_1': None, 'i_fireplace_1_0': None, 'i_fireplace_1_1': None, 'i_brazier': None,
    'i_forge_0_0': None, 'i_forge_0_1': None, 'i_forge_1_0': None, 'i_forge_1_1': None, 'i_lantern_stand_0_0': None, 'i_lantern_stand_1_0': None,
    'i_lava': None, 'i_crystal_on': None, 'i_beam_emitter': None, 'i_beam_receiver_on': None,
    # BATCH 3 (Oct 23 2026): Mirefen hall reed lamp, lit head + glints only (box = overnight_tiles.REED_LAMP_BOX); the unlit pair is not emissive
    'reed_lamp_lit': [[12, 4, 52, 32]],
}

def _sheet_key(sheet): return sheet.replace('/', '__')
def emissive_masks(ow=OW):
    """{sheet: L-mode mask (255 = emissive)} from EMISSIVE + tileset.json. Unknown names are an error (keeps the list honest)."""
    ts = json.load(open(os.path.join(ow, 'tileset.json'))); cols = ts.get('columns_per_sheet', 16); T = ts['tile_size']
    by = {t['name']: t for t in ts['tiles']}
    missing = sorted(n for n in EMISSIVE if n not in by)
    if missing: raise SystemExit(f'time_of_day.EMISSIVE: unknown tiles {missing}')
    out = {}
    for name, boxes in EMISSIVE.items():
        t = by[name]; sheet = t['sheet']
        if sheet not in out:
            w, h = Image.open(os.path.join(ow, sheet)).size; out[sheet] = np.zeros((h, w), np.uint8)
        alpha = np.asarray(Image.open(os.path.join(ow, sheet)).convert('RGBA'))[..., 3]
        anim = t.get('animation'); frames = anim['frames'] if isinstance(anim, dict) and anim.get('frames') else [t['index']]
        for idx in {t['index'], *frames}:
            x0, y0 = (idx % cols) * T, (idx // cols) * T
            for b in (boxes or [[0, 0, T, T]]):
                sl = (slice(y0 + b[1], y0 + b[3]), slice(x0 + b[0], x0 + b[2]))
                out[sheet][sl] = np.where(alpha[sl] > 0, 255, out[sheet][sl])
    return {k: Image.fromarray(v, 'L') for k, v in out.items()}

def hx(c): return '%02x%02x%02x' % tuple(int(v) for v in c)
def tables():
    src = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in PAL], float)
    out = {}
    for gname in GRADES:
        out[gname] = _table(gname, src, False, '')                  # tiles: every pixel, no lights
        out[gname]['lit'] = _table(gname, src, True, '_lit')       # tiles: emissive-mask pixels only
        out[gname]['sprite'] = _table(gname, src, False)            # sprites (unchanged)
    return out

def _table(gname, src, lights, sfx=None):
        dst = grade_fn(gname, src, lights)
        # keep it a 1:1 swap: if two palette colours land on the same graded colour, nudge the later one by 1 step (never visible, keeps ids distinct)
        seen = set()
        for i in range(len(dst)):
            while hx(dst[i]) in seen: dst[i] = np.clip(dst[i] + np.array([0, 0, 1]), 0, 255)
            seen.add(hx(dst[i]))
        sh = grade_fn(gname, np.array([SHADOW[:3]], float), lights)[0]
        if sfx is None: sfx = '' if lights else '_sprite'
        return dict(map={h: hx(d) for h, d in zip(PAL, dst)}, shadow=dict(src=list(SHADOW), dst=[*map(int, sh), SHADOW[3]]),
                    lut=f'time_of_day/lut_{gname}{sfx}.png')

def lut_png(gname, path, lights=True):
    """64x64: blue slice k = ty*4 + tx (16 slices in a 4x4 grid); inside a slice x = red, y = green; channel steps = 0,17,...,255."""
    v = np.arange(16) * 17.0; im = np.zeros((64, 64, 3), np.uint8)
    for k in range(16):
        ty, tx = divmod(k, 4); rr, gg = np.meshgrid(v, v)
        cube = np.stack([rr, gg, np.full_like(rr, v[k])], -1)
        im[ty * 16:(ty + 1) * 16, tx * 16:(tx + 1) * 16] = grade_fn(gname, cube, lights).astype(np.uint8)
    Image.fromarray(im, 'RGB').save(path)

def apply(im, tab, mask=None):
    """exact palette swap of an RGB(A) image (alpha kept); off-palette pixels fall back to the grade function.
    tab = grades[g] (+ '_name'): tab['map'] (no lights) everywhere, tab['lit']['map'] where mask > 0 (emissive)."""
    src = im.convert('RGBA'); a = np.asarray(src); flat = a[..., :3].reshape(-1, 3)
    def one(t, lights):
        out = grade_fn(tab['_name'], flat.astype(float), lights).astype(np.uint8)
        key = (flat[:, 0].astype(np.int32) << 16) | (flat[:, 1].astype(np.int32) << 8) | flat[:, 2]
        for s, d in t['map'].items():
            m = key == int(s, 16); out[m] = [int(d[i:i + 2], 16) for i in (0, 2, 4)]
        return out
    out = one(tab, False)
    if mask is not None and 'lit' in tab:
        mk = np.asarray(mask).reshape(-1) > 0
        if mk.any(): out[mk] = one(tab['lit'], True)[mk]
    rgba = np.concatenate([out.reshape(a.shape[:2] + (3,)), a[..., 3:]], -1)
    out_im = Image.fromarray(rgba, 'RGBA')
    return out_im if 'A' in im.mode or im.mode == 'P' else out_im.convert('RGB')

def render_map(name, tb, gname, masks, ow=OW, layers=('ground', 'decoration', 'overlay')):
    """1x render of maps/<name>.json under a grade, sheets graded once each with their emissive mask (preview only)."""
    ts = json.load(open(os.path.join(ow, 'tileset.json'))); cols = ts.get('columns_per_sheet', 16); T = ts['tile_size']
    by = {t['id']: t for t in ts['tiles']}; m = json.load(open(os.path.join(ow, 'maps', name + '.json'))); sheets = {}
    tab = dict(tb[gname], _name=gname); im = Image.new('RGBA', (m['width'] * T, m['height'] * T), (26, 18, 38, 255))
    for ln in layers:
        for y, row in enumerate(m['layers'].get(ln) or []):
            for x, tid in enumerate(row):
                t = by.get(tid)
                if not t: continue
                sh = t['sheet']
                if sh not in sheets:
                    raw = Image.open(os.path.join(ow, sh))
                    sheets[sh] = raw.convert('RGBA') if gname == 'day' else apply(raw, tab, masks.get(sh))
                i = t['index']; im.alpha_composite(sheets[sh].crop(((i % cols) * T, (i // cols) * T, (i % cols + 1) * T, (i // cols + 1) * T)), (x * T, y * T))
    return im.convert('RGB')

def build(out=OW):
    os.makedirs(f'{out}/time_of_day/emissive', exist_ok=True); tb = tables(); masks = emissive_masks(out)
    doc = dict(note=('Palette-swap colour grades for time of day. Tiles are never repainted: at draw time replace every pixel colour by map[colour] '
                     '(palette.hex keys, lower-case hex). SHADOW pixels (alpha 96) use shadow.dst. day is the identity. '
                     'Engines that prefer a shader can use lut_<grade>.png (16^3 3D LUT, 64x64: blue slice k at tile (k%4, k//4), red = x, green = y inside the 16x16 slice, '
                     'channel step 17) with NEAREST sampling - palette colours are not all exactly on the 17-step grid, so use the map for tiles and the LUT for sprites/UI. '
                     'Switch grades as a hard cut or a short (<= 8 step) stepped cross-fade between two swapped images - never blend per pixel continuously.'),
               lights_rule=('Glow comes from WHERE a pixel is, never from its colour. Tiles: every pixel uses grades.<g>.map / lut_<g>.png (NO lights); '
                            'pixels inside the emissive mask (emissive.masks[<sheet>], 1x, 255 = emissive, same size as the 1x sheet) use grades.<g>.lit.map / lut_<g>_lit.png, '
                            'which keeps warm light colours (lamp glass, flames, lit window glass) lit at dusk/night and violet crystals bright at night. '
                            'Sprites (NPCs, creatures, player) use grades.<g>.sprite (map + lut_<g>_sprite.png): no lights, so pale skin and blond hair darken with the body. '
                            'A sprite part that must glow is flagged per sprite (emissive mask), never by colour.'),
               emissive=dict(rule='tools/time_of_day.py EMISSIVE (tile name -> whole tile or [x0,y0,x1,y1) boxes) is the only list of glowing tiles; masks are generated from it. Add a tile there and re-run the tool; never hand-edit the masks.',
                             tiles={k: v for k, v in EMISSIVE.items()}, masks={}),
               schedule=dict(dawn='05:00-07:59', day='08:00-16:59', dusk='17:00-19:59', night='20:00-04:59', clock='in-game clock (1 real min = 1 game hour unless Coder decides otherwise)'),
               indoor_rule='interiors and caves (names *_int, house_*, home_*, heal_*, lab_*, rt_*, mart_*, station_*, hall_*, greystone*; same test as progression.INDOOR_OR_CAVE) stay on day, EXCEPT club_int (The Firefly), which follows the outdoor clock like lantern_rest (progression.OUTDOOR_CLOCK_INDOORS / FOLLOWS_OUTDOOR_CLOCK; INDOOR_OR_CAVE itself is unchanged)',
               palette='palette.hex (64 colours)', grades=tb)
    for sheet, mk in sorted(masks.items()):
        rel = f'time_of_day/emissive/{_sheet_key(sheet)}'; mk.save(f'{out}/{rel}', optimize=True); doc['emissive']['masks'][sheet] = rel
    json.dump(doc, open(f'{out}/time_of_day/grades.json', 'w'), indent=1)
    for g in GRADES:
        lut_png(g, f'{out}/time_of_day/lut_{g}.png', False); lut_png(g, f'{out}/time_of_day/lut_{g}_lit.png', True)
        lut_png(g, f'{out}/time_of_day/lut_{g}_sprite.png', False)
    # preview
    rows = []
    for name in ('brookhollow', 'lantern_rest'):
        if not os.path.exists(f'{out}/maps/{name}.json'): continue
        tiles = []
        for g in GRADES:
            gi = render_map(name, tb, g, masks, out); gi = gi.resize((gi.width // 3, gi.height // 3), Image.NEAREST)
            d = ImageDraw.Draw(gi); d.rectangle([0, 0, 150, 22], fill=(26, 18, 38)); d.text((6, 5), f'{g} - {name}', fill=(252, 246, 232)); tiles.append(gi)
        rows.append(tiles)
    W = max(sum(t.width for t in r) + 8 * 3 for r in rows); H = sum(r[0].height for r in rows) + 8 * (len(rows) - 1)
    sheet = Image.new('RGB', (W, H), (26, 18, 38)); y = 0
    for r in rows:
        x = 0
        for t in r: sheet.paste(t, (x, y)); x += t.width + 8
        y += r[0].height + 8
    sheet.save(f'{out}/previews/time_of_day.png', optimize=True)
    return doc

if __name__ == '__main__':
    d = build(); print('time_of_day: grades', list(d['grades']), 'identity day:', all(k == v for k, v in d['grades']['day']['map'].items()))
