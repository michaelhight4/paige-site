# Merges the biome worker's EXTRA kit (tileset_extra.json, tiles_extra/, maps_new/*.json) into the main overworld build.
# Owned by the overworld owner. It only READS tools/biomes_extra.py (imports a few drawing helpers) and maps_new/; it never writes them.
#   - register(reg, reg_multi)  : called from build.py EXTRA_TILE_MODULES. Loads the 677 x_ tiles (ids 5001..5677 kept as-is),
#                                 adds de-tiled fog tiles (fog_<NESW>_p<px><py>, 5x3-tile noise period instead of 2x2),
#                                 teaches the base autotiler flood / deep water / x_snow.
#   - import_maps()             : maps_new/mirefen_bog.json + station_int.json -> Map objects with precomputed layers.
#   - tileset_entries(), merge_tileset(base) : x_ entries + sheets + collision codes for tileset*.json.
import os, sys, json, copy
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.abspath(os.path.join(HERE, '..'))
XT = json.load(open(os.path.join(OUT, 'tileset_extra.json')))
XBYNAME = {t['name']: t for t in XT['tiles']}; XBYID = {t['id']: t for t in XT['tiles']}
# x_ copies of base tiles (same seeds) -> base names. Resolved to base ids once the base kit exists.
DUP_PREFIXES = ('x_grass_', 'x_path_', 'x_water', 'x_path>grass_', 'x_water>grass_')
def dup_base_name(xname):
    if xname == 'x_water' or xname.startswith(('x_grass_', 'x_path_', 'x_path>grass_', 'x_water>grass_')): return xname[2:]
    return None
FOG_PX, FOG_PY = 5, 3            # fog noise period in tiles (was 2x2 in x_fog_*_q0..3 -> visible repeat every 2 tiles)
XS_TERRAINS = ('snow', 'ice', 'mud', 'moss')   # extra-biome ground re-varianted seamlessly as xs_<t>_<v>
SNOW_TO_X = True                 # base snow_* / snow>grass_* resolve to x_snow_* (Frostspire snow)
_B = {}

def _sheet(path):
    if path not in _B: _B[path] = Image.open(os.path.join(OUT, path)).convert('RGBA')
    return _B[path]
def _frame(sheet, idx, T=64):
    im = _sheet(sheet); return im.crop(((idx % 16) * T, (idx // 16) * T, (idx % 16) * T + T, (idx // 16) * T + T))

def _fog_field():
    T = 64; W, H = FOG_PX * T, FOG_PY * T
    def streak(seed, sy, sx):
        n = gaussian_filter(np.random.default_rng(seed).random((H, W)), (sy, sx), mode='wrap'); return (n - n.min()) / (n.max() - n.min() + 1e-9)
    lowf = streak(733, T * 0.55, T * 0.9)                       # slow density swell over several tiles: kills the regular grid feel
    return (streak(711, T * 0.10, T * 0.30) * 0.6 + streak(712, T * 0.05, T * 0.16) * 0.25 + lowf * 0.15), lowf

def register(reg, reg_multi):
    import build, biomes_extra as bx          # read-only use of the biome worker's helpers
    from pixel import pixelize
    T = 64
    # 1) the 677 extra tiles, ids unchanged (5001..5677), frames read from tiles_extra/1x sheets
    for e in XT['tiles']:
        a = e.get('animation'); idxs = [e['index']] + (a['frames'] if a and a.get('type') == 'rustle' else (a['frames'][1:] if a else []))
        if a and a.get('type') != 'rustle': idxs = a['frames']
        t = dict(id=e['id'], name=e['name'], cat='x_' + e['category'], frames=[_frame(e['sheet'], i) for i in idxs], coll=e['collision'],
                 enc=int(e['encounter']), ms=(a or {}).get('frame_ms'), notes=e.get('notes'), states=None, anim=None, ysort=e.get('ysort', False),
                 ext=True, entry=e)
        build.TILES.append(t); build.BYNAME[e['name']] = t
    # 2) collision codes 10 (ice) / 11 (deep_water) are in build.COLL
    # 3) autotiler: flood (shallow, walk) and deep water (11) as ground terrains; x_snow replaces base snow
    build.PRIO.update(flood=2.5, deep=4)
    # 3a) seamless extra-biome ground: xs_<t>_0 == x_<t>_0 (pixel-identical, so every x_ transition still meets it),
    #     xs_<t>_1..3 share its edge band (ground.vblend) -> any position-hash arrangement is seamless.
    import ground
    for t in XS_TERRAINS:
        raw0 = bx.base_frames(t, 0)[0]; s0 = 100 + sum(map(ord, t)) + 4000
        for v in range(ground.NV):
            im = raw0 if v == 0 else ground.vblend(raw0, ground.match_tone(bx.STATIC[t](s0 + 1000 + v * 7), raw0))
            reg(f'xs_{t}_{v}', 'terrain', im, 'ice' if t == 'ice' else 'walk',
                notes=(f'seamless {t} variant set (replaces x_{t}_*, which do not share edges); variant = ground_variant(x, y)' if v == 0 else None))
    for v in range(ground.NV):
        build.BYNAME[f'flood_{v}'] = build.BYNAME['x_flood']; build.BYNAME[f'deep_{v}'] = build.BYNAME['x_deep_water']
        if SNOW_TO_X: build.BYNAME[f'snow_{v}'] = build.BYNAME[f'xs_snow_{v}']
    base_trans = build.trans_tile
    def trans_tile(B, A, sides, diags, w=0):
        if B in ('flood', 'deep') or (B == 'water' and A == 'flood') or (B == 'snow' and SNOW_TO_X):
            nm = f'{B}>{A}_' + ''.join('1' if s else '0' for s in sides) + '_' + ''.join('1' if s else '0' for s in diags)
            if 'x_' + nm in build.BYNAME: return build.BYNAME['x_' + nm]
            # combo the extra kit didn't pregenerate (mixed side + corner): draw it with the biome worker's recipe, palette-snapped
            bf = lambda t: bx.base_frames(t) if (t in bx.STATIC or t in ('bog', 'water', 'deep', 'flood')) else [build.base_img(t, 0)]
            Bf, Af = bf(B), bf(A); n = max(len(Bf), len(Af))
            fr = [pixelize(bx.transition(Bf[f % len(Bf)], Af[f % len(Af)], sides, diags, bx.kind_of(B, A))) for f in range(n)]
            return reg('xm_' + nm, 'transition', fr, bx.TCOLL[B], ms=bx.MS.get(B, bx.MS.get(A)), raw=True,
                       notes='merge-generated edge (extra-kit recipe) for a side+corner combo not in tileset_extra' if False else None)
        return base_trans(B, A, sides, diags, w)
    build.trans_tile = trans_tile
    # 4) de-tiled fog: 16 edge masks x 15 positions (5x3 period) x 3 drift frames
    big, lowf = _fog_field()
    def fog_tile(n, e, s, w, frame, px, py):
        f = np.roll(big, frame * 6, axis=1); nz = f[py * T:(py + 1) * T, px * T:(px + 1) * T]
        lo = lowf[py * T:(py + 1) * T, px * T:(px + 1) * T]
        dens = 0.02 + (0.45 + 0.35 * lo) * bx.smooth(0.42, 0.8, nz)
        yy, xx = np.mgrid[0:T, 0:T] + 0.5; fade = np.ones((T, T))
        for on, dd in ((n, yy), (e, T - xx), (s, T - yy), (w, xx)):
            if on: fade = np.minimum(fade, bx.smooth(0, 30, dd))
        dens = dens * fade; th = np.tile(bx._B4, (T // 4, T // 4))
        on_px = dens > th; light = nz > 0.6
        arr = np.zeros((T, T, 4), np.uint8); arr[on_px & light] = bx.FOG_A; arr[on_px & ~light] = bx.FOG_B
        return Image.fromarray(arr, 'RGBA')
    for k in range(16):
        n, e, s, w = (k >> 3) & 1, (k >> 2) & 1, (k >> 1) & 1, k & 1
        for py in range(FOG_PY):
            for px in range(FOG_PX):
                nm = f'fog_{n}{e}{s}{w}_p{px}{py}'
                t = reg(nm, 'fog', [fog_tile(n, e, s, w, f, px, py) for f in range(3)], 'walk', ms=600, raw=True,
                        notes=('Mirefen fog (clearable), own "fog" layer drawn after overlay. NESW=1: that side borders clear air. '
                               f'p<px><py> = (x % {FOG_PX}, y % {FOG_PY}). Replaces x_fog_*_q* (2x2 period).') if k == 0 and px == py == 0 else None)
                t['states'] = None; t['fog'] = True

def fog_name(F, x, y):
    o = lambda xx, yy: int((xx, yy) not in F)
    return f'fog_{o(x, y - 1)}{o(x + 1, y)}{o(x, y + 1)}{o(x - 1, y)}_p{x % FOG_PX}{y % FOG_PY}'

# ---------------- maps_new JSON -> main build ----------------
GAME_MAPS = ('mirefen_bog', 'station_int')
# imported npcs/signs: existing Text Bot keys where one fits; the rest need new maps.<map>.<id> keys from Text Bot
PENDING_REF = {('station_int', 'station_clerk'): 'overworld_lines.json rail_only.npcs.station_attendant',
               ('station_int', 'station_traveller'): 'overworld_lines.json rail_only.npcs.commuter',
               ('station_int', 'restricted_airspace'): 'overworld_lines.json rail_only.signs.sign_airspace',
               ('station_int', 'timetable'): 'overworld_lines.json rail_only.signs.sign_platform'}
def import_maps(Map, BYNAME):
    out = []
    for nm in GAME_MAPS:
        d = json.load(open(os.path.join(OUT, 'maps_new', nm + '.json'))); L = d['layers']
        m = Map(nm, d['width'], d['height'], title=d['title'].replace(' (sample)', ''))
        remap = lambda i: (BYNAME[dup_base_name(XBYID[i]['name'])]['id'] if i in XBYID and dup_base_name(XBYID[i]['name']) in BYNAME else i)
        byid = {}
        for t in BYNAME.values(): byid[t['id']] = t
        G = [[remap(i) for i in r] for r in L['ground']]; D = [[remap(i) for i in r] for r in L['decoration']]
        import ground, re
        for y, r in enumerate(G):          # plain x_<t>_<v> ground -> seamless xs_<t>_<position hash>
            for x, i in enumerate(r):
                mm = re.fullmatch(r'x_(\w+?)_(\d)', XBYID[i]['name']) if i in XBYID else None
                if mm and mm.group(1) in XS_TERRAINS: r[x] = BYNAME[f'xs_{mm.group(1)}_{ground.ground_variant(x, y)}']['id']
        O = [[remap(i) for i in r] for r in L['overlay']]; C = [r[:] for r in L['collision']]; E = [r[:] for r in L['encounter']]
        m.deco = [[byid[i]['name'] if i else None for i in r] for r in D]; m.over = [[byid[i]['name'] if i else None for i in r] for r in O]
        m.terr = [['imported'] * m.w for _ in range(m.h)]
        m.warps = [dict(w, tx=None, ty=None, note=w['note'] + ' | $return: back to the exterior door used to enter, one tile below it, facing down') if w['to'] == '$return' else w for w in d['warps']]
        m.exits = d['exits']; m.items = d['items']; m.enc_zones = d['encounter_zones']
        m.npcs_pending = d['npcs']; m.signs_pending = d['signs']; m.npcs = []; m.signs = []
        if d.get('bike'): m.bike = dict(areas=[dict(id=f'{nm}_bike_boardwalk', cells=d['bike']['no_dismount_cells'], kind='optional spur', note=d['bike']['rule'])])
        m.fog_layer = None
        if 'fog' in L:
            cells = {(x, y) for y, r in enumerate(L['fog']) for x, v in enumerate(r) if v}
            m.fog_layer = [[BYNAME[fog_name(cells, x, y)]['id'] if (x, y) in cells else 0 for x in range(m.w)] for y in range(m.h)]
            m.fog_meta = dict(d['fog'], tiles='fog_<NESW>_p<px><py> (5x3-tile noise period; replaces x_fog_*_q*)')
        m.pre = (G, D, O, C, E); m.source = f'maps_new/{nm}.json (biome worker), merged by tools/extra_merge.py'
        out.append(m)
    return out

def tileset_entries(scale=1):
    ents = []
    for e in XT['tiles']:
        e = copy.deepcopy(e)
        if scale != 1: e['sheet'] = e['sheet'].replace('tiles_extra/1x/', f'tiles_extra/{scale}x/')
        b = dup_base_name(e['name'])
        if b: e['alias_of'] = b      # id filled in by run.py
        if e['name'].startswith('x_snow_'): e['notes'] = 'Frostspire snow: maps use this instead of base snow_* (base snow kept for old saves only)'
        ents.append(e)
    return ents
def sheets(scale=1): return {'x_' + c: p.replace('tiles_extra/1x/', f'tiles_extra/{scale}x/') for c, p in XT['sheets'].items()}
