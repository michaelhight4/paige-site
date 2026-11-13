import sys, json, os, collections, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from gen_tiles import *
from buildings import building
from props2 import *
from pixel import pixelize, palette_png
import tallgrass
from progress_art import *
import ground
from ground import NV, NW, ground_variant, wobble_variant

# ---------------- registry ----------------
TILES = []; BYNAME = {}
OUTLINE_CATS = ('deco', 'overlay', 'interior', 'puzzle')
def reg(name, cat, frames, coll='walk', enc=0, ms=None, notes=None, raw=False, states=None, anim=None, ysort=False):
    if name in BYNAME: return BYNAME[name]
    frames = frames if isinstance(frames, list) else [frames]
    if not raw: frames = [pixelize(ground.clean_deco(f) if cat in OUTLINE_CATS else f, outline=cat in OUTLINE_CATS) for f in frames]   # deco: object + one shadow colour only   # true-grid pixel art, palette-snapped
    t = dict(id=sum(1 for _t in TILES if not _t.get('ext')) + 1, name=name, cat=cat, frames=frames, coll=coll, enc=enc, ms=ms, notes=notes, states=states, anim=anim, ysort=ysort)
    TILES.append(t); BYNAME[name] = t; return t

PRIO = {'grass': 0, 'grass_dark': 0, 'cave': 0, 'mud': 1, 'sand': 1, 'snow': 1, 'path': 2, 'trail': 2, 'water': 3, 'cave_water': 3}
BASEFN = {'grass': lambda s: grass(s), 'grass_dark': lambda s: grass(s, 1), 'path': path, 'trail': ground.trail, 'sand': sand, 'snow': snow, 'mud': mud, 'cave': cavefloor}
BASECACHE = {}
def base_img(t, v):
    k = (t, v)
    # v0 = original recipe (every transition is built on it); v1..v3 = seamless variants sharing v0's edge band (tools/ground.py)
    if k not in BASECACHE:
        s0 = 100 + sum(map(ord, t))
        if v == 0: BASECACHE[k] = BASEFN[t](s0)
        elif t == 'path': BASECACHE[k] = ground.path_variant(s0, v)
        else: BASECACHE[k] = ground.vblend(base_img(t, 0), ground.match_tone(BASEFN[t](s0 + 1000 + v * 7), base_img(t, 0)))
    return BASECACHE[k]
WATERF = [water_frame(f) for f in range(4)]; CWATERF = [water_frame(f, True) for f in range(4)]
WATER_NV = 3
def water_name(t, v): return t if v == 0 else f'{t}_{v}'

for t in BASEFN:
    for v in range(NV): reg(f'{t}_{v}', 'terrain', base_img(t, v), 'walk')
reg('water', 'terrain', WATERF, 'water', ms=220); reg('cave_water', 'terrain', CWATERF, 'water', ms=260)
for _v in range(1, WATER_NV):
    reg(f'water_{_v}', 'terrain', [ground.water_frame_v(f, _v) for f in range(4)], 'water', ms=220)
    reg(f'cave_water_{_v}', 'terrain', [ground.water_frame_v(f, _v, True) for f in range(4)], 'water', ms=260)
for nm, im in (('floor_wood', floor_wood(1)), ('floor_tile', floor_tile(1)), ('floor_tile_heal', floor_tile(2, (240, 244, 240), (214, 236, 228))), ('rug', rug(1))):
    reg(nm, 'interior', im)
reg('void', 'interior', void(), 'block')
for k in ('house', 'heal', 'shop'): reg(f'iwall_face_{k}', 'interior', iwall_face(k), 'block')
for k, c in (('house', (236, 214, 170)), ('heal', (226, 240, 236)), ('shop', (214, 230, 244))):
    _im = Image.new('RGBA', (T, T), c); _d = SD(_im)
    for _x in range(8, U, 32): _d.line([(_x, 0), (_x, U)], fill=tuple(v - 18 for v in c), width=3)
    _d.rectangle([0, 0, U, 14], fill=(170, 130, 96)); _d.line([(0, 16), (U, 16)], fill=(120, 86, 60), width=3)
    if k == 'house': _d.rectangle([40, 44, 88, 96], fill=(120, 86, 60)); _d.rectangle([46, 50, 82, 90], fill=(160, 200, 220))
    reg(f'iwall_upper_{k}', 'interior', _im, 'block')
reg('iwall_top', 'interior', iwall_top(), 'block')

def trans_tile(B, A, sides, diags, w=0):
    # w = edge-wobble variant (0..NW-1, picked by ground.wobble_variant(x, y)); the edge curve is pinned at the tile corners,
    # so neighbouring transition tiles with different w still meet exactly.
    nm = f'{B}>{A}_' + ''.join('1' if s else '0' for s in sides) + '_' + ''.join('1' if s else '0' for s in diags) + (f'_w{w}' if w else '')
    if nm in BYNAME: return BYNAME[nm]
    kw = dict(wobf=ground.wob_fn(w), enoise=ground.edge_noise(w)) if w else {}
    if B in ('water', 'cave_water'):
        bank = cliff('m', 'l', True).convert('RGB').convert('RGBA') if B == 'cave_water' else None
        fr = [transition(f, base_img(A, 0), sides, diags, 'water', bank, **kw) for f in (WATERF if B == 'water' else CWATERF)]
        return reg(nm, 'transition', fr, 'water', ms=220)
    return reg(nm, 'transition', transition(base_img(B, 0), base_img(A, 0), sides, diags, 'soft', **kw), 'walk')

# pregenerate the 16 side-combos for common pairs so the coder has a full set
for B, A in (('path', 'grass'), ('trail', 'grass'), ('trail', 'grass_dark'), ('sand', 'grass'), ('water', 'grass'), ('water', 'sand'), ('mud', 'grass_dark'), ('path', 'grass_dark'), ('snow', 'grass'), ('cave_water', 'cave')):
    for m in range(1, 16): trans_tile(B, A, tuple(bool(m >> i & 1) for i in range(4)), (False,) * 4)
    for m in range(1, 16): trans_tile(B, A, (False,) * 4, tuple(bool(m >> i & 1) for i in range(4)))

# deco
RUSTLE = dict(type='rustle', trigger='on_enter', frame_ms=90, loop=False, sync='tall_grass_* and tall_grass_front_*/tips_* of the cell')
for nm, frs, kind in tallgrass.variants():
    note = {'body': 'tall grass (encounter). name = tall_grass_<N><E><S><W>_v<variant>; 1 = that side is open (not tall grass); variant = (x+y)%2',
            'front': 'waist-up overlay: front blades drawn OVER a sprite standing in this tall-grass cell',
            'tips': 'blade tips of the tall-grass cell BELOW, drawn in the overlay layer of this cell'}[kind]
    reg(nm, 'deco' if kind == 'body' else 'overlay', frs, 'walk', enc=1 if kind == 'body' else 0, raw=True, notes=note, anim=RUSTLE, ysort=kind != 'body')
CAVE_RUSTLE = dict(RUSTLE, sync='cave_fern_* and cave_fern_front_*/tips_* of the cell')
for nm, frs, kind in list(tallgrass.variants()):    # Greystone: same design, violet "glowfern" recolour (cave encounter terrain)
    cn = nm.replace('tall_grass', 'cave_fern')
    reg(cn, 'deco' if kind == 'body' else 'overlay', [recolour(f) for f in frs], 'walk', enc=1 if kind == 'body' else 0, raw=True,
        notes='cave glowfern (forced-encounter terrain in caves); same mask/variant scheme as tall_grass', anim=CAVE_RUSTLE, ysort=kind != 'body')
# ---- progression: story-gate blockers, bike-only terrain ----
reg('rt_barricade', 'deco', rt_barricade(), 'block', notes='story gate: Revival Tech survey checkpoint barrier (removed when its flag is set)')
reg('crystal_barrier_lit', 'deco', [crystal_barrier(True, 0), crystal_barrier(True, 1)], 'block', ms=420,
    states={'blocked': 'crystal_barrier_lit', 'cleared': 'crystal_barrier_dim'}, notes='story gate: violet crystal wall; dims when its flag is set')
reg('crystal_barrier_dim', 'deco', crystal_barrier(False), 'walk', states={'blocked': 'crystal_barrier_lit', 'cleared': 'crystal_barrier_dim'})
for p_ in 'tmb': reg(f'fallen_log_{p_}', 'deco', fallen_log(p_), 'block', notes='story gate: fallen trunk across a trail (t/m/b = top/middle/bottom); removed when its flag is set')
reg('bike_rail_h', 'deco', bike_rail('h'), 'bike_only', notes='narrow boardwalk: bike only (walkers cannot balance on it). Usually laid over water/mud.')
reg('bike_rail_v', 'deco', bike_rail('v'), 'bike_only', notes='narrow boardwalk: bike only')
reg('ramp_e', 'deco', ramp('e'), 'ramp', notes='bike jump ramp: enter moving east on the bike, land 1 tile past it (one-way, like a ledge). Blocked on foot.')
reg('ramp_s', 'deco', ramp('s'), 'ramp', notes='bike jump ramp: enter moving south on the bike, land 1 tile past it (one-way). Blocked on foot.')
reg('flowers_violet', 'deco', flowers(1, [(170, 90, 230), (200, 140, 255)])); reg('flowers_warm', 'deco', flowers(2, [(240, 90, 110), (250, 200, 80), (255, 255, 255)]))
reg('rock', 'deco', rock(), 'block'); reg('boulder', 'deco', rock(True), 'block'); reg('cave_rock', 'deco', rock(True, True), 'block')
reg('crystal', 'deco', crystal(), 'block'); reg('mushroom_glow', 'deco', mushroom()); reg('bush', 'deco', bush(), 'block')
reg('sign', 'deco', sign(), 'block', notes='interact from the south'); reg('lamp', 'deco', lamp(), 'block')
reg('fence_h', 'deco', fence('h'), 'block'); reg('fence_v', 'deco', fence('v'), 'block')
for p in 'lmr': reg(f'ledge_{p}', 'deco', ledge(p), 'ledge_s', notes='one-way: jump south only'); reg(f'cave_ledge_{p}', 'deco', ledge(p, True), 'ledge_s', notes='one-way: jump south only')
for p in 'lmr':
    for r_ in 'ul': reg(f'cliff_{r_}{p}', 'deco', cliff(p, r_), 'block'); reg(f'cliffd_{r_}{p}', 'deco', cliff(p, r_, dark=True), 'block', notes='dark-forest grass lip')
reg('cavewall_face_u', 'terrain', cliff('m', 'u', True).convert('RGB').convert('RGBA'), 'block'); reg('cavewall_face_l', 'terrain', cliff('m', 'l', True), 'block'); reg('cavewall_top', 'terrain', cavewall_top(), 'block')
for _nm, _e, _w in (('cavewall_side_e', 1, 0), ('cavewall_side_w', 0, 1), ('cavewall_side_ew', 1, 1)): reg(_nm, 'terrain', cavewall_side(_e, _w), 'block', notes='wall top with side face toward floor')
reg('bridge_h', 'deco', bridge('h'), 'walk', notes='overrides water'); reg('bridge_v', 'deco', bridge('v'), 'walk', notes='overrides water')
reg('stairs', 'deco', stairs(), 'walk'); reg('cave_stairs', 'deco', stairs(True), 'door', notes='warp')
reg('door_mat', 'deco', door_mat(), 'door', notes='interior exit warp')
t = pixelize(tree(), True); reg('tree_top', 'overlay', t.crop((0, 0, T, T)), raw=True); reg('tree_base', 'deco', t.crop((0, T, T, 2 * T)), 'block', raw=True)
t = pixelize(tree(True), True); reg('treed_top', 'overlay', t.crop((0, 0, T, T)), raw=True); reg('treed_base', 'deco', t.crop((0, T, T, 2 * T)), 'block', raw=True)

MULTI = {}
def reg_multi(name, im, cat, door_cells=(), walk_cells=(), all_walk=False):
    im = pixelize(im, outline=True)   # outline the whole object once, then slice -> no seams between its tiles
    w, h = im.width // T, im.height // T; MULTI[name] = (w, h)
    for r in range(h):
        for c in range(w):
            coll = 'door' if (c, r) in door_cells else ('walk' if (all_walk or (c, r) in walk_cells) else 'block')
            reg(f'{name}_{r}_{c}', cat, im.crop((c * T, r * T, (c + 1) * T, (r + 1) * T)), coll, raw=True)
    return im
B = {   # name: (w, h, wall rows, roof colour, wall colour, style)  -- 64px grid; door = bottom-centre cell
 'house_player': (5, 5, 2.25, (176, 70, 58), (246, 234, 210), 'player'),
 'house_a': (5, 5, 2.25, (54, 130, 140), (240, 228, 204), 'house'),
 'house_b': (5, 5, 2.25, (196, 108, 60), (226, 210, 180), 'house_b'),
 'house_c': (5, 5, 2.25, (78, 124, 70), (196, 150, 104), 'house_c'),
 'heal_centre': (7, 5, 2.25, (78, 168, 150), (250, 246, 236), 'heal'),
 'shop': (5, 5, 2.25, (60, 104, 168), (238, 232, 220), 'shop'),
 'office': (7, 6, 2.6, (70, 74, 96), (228, 222, 214), 'office'),
 'masters_hall': (7, 6, 2.6, (128, 64, 150), (214, 200, 170), 'hall'),
}
REFS = {}
for nm, (w, h, wr, roof, wall, kind) in B.items():
    REFS[nm] = reg_multi(nm, building(w, h, wr, roof, wall, kind), 'building', door_cells={(w // 2, h - 1)})
reg_multi('cave_entrance', cave_entrance(), 'building', door_cells={(1, 1)})
for p, cells in (('bed', ()), ('shelf', ()), ('goods', ()), ('heal_machine', ())): reg_multi(p, prop(p), 'interior')
for p in ('table', 'sofa'): reg_multi(p, prop(p), 'interior')
for p in ('plant', 'pc', 'tv', 'chair'): reg(p, 'interior', prop(p), 'block')   # chairs are solid in every interior (scale audit C3, Oct 22): same as the interiors kit i_chair_*
reg('stairs_up', 'interior', prop('stairs_up'), 'door', notes='warp')
for k in ('heal', 'shop'):
    for s in 'lmr': reg(f'counter_{k}_{s}', 'interior', prop(f'counter_{k}_{s}'), 'block')

# ---- new floors / walls / furniture for office, houses, master's hall ----
reg('floor_carpet', 'interior', floor_carpet(3)); reg('floor_stone', 'interior', floor_stone(4)); reg('floor_arena', 'interior', floor_arena(5))
for k in ('house2', 'house3', 'office', 'hall'):
    reg(f'iwall_face_{k}', 'interior', iwall_face2(k), 'block'); reg(f'iwall_upper_{k}', 'interior', iwall_upper2(k), 'block')
for p, w in (('desk_pc', 0), ('filing', 0), ('cooler', 0), ('crystal_display', 0), ('bookcase', 0), ('stove', 0), ('cupboard', 0), ('fireplace', 0), ('pillar', 0)):
    reg_multi(p, prop2(p), 'interior')
reg_multi('dais', prop2('dais'), 'interior', all_walk=True); reg_multi('arena_ring', arena_ring(), 'interior', all_walk=True)
for p in ('kcounter', 'armchair', 'dresser', 'banner', 'brazier', 'barrel'): reg(p, 'interior', prop2(p), 'block')
reg('rail', 'interior', prop2('rail'), 'block')
# ---- puzzle tiles (stateful) ----
reg('push_boulder', 'puzzle', push_boulder(), 'boulder', notes='pushable: player walks into it, it slides 1 tile if the far cell is free floor/plate')
for st in ('cave', 'hall'):
    reg(f'plate_{st}_off', 'puzzle', pressure_plate(0, st), 'plate', states={'off': f'plate_{st}_off', 'on': f'plate_{st}_on'}, notes='floor switch: walkable trigger')
    reg(f'plate_{st}_on', 'puzzle', pressure_plate(1, st), 'plate', states={'off': f'plate_{st}_off', 'on': f'plate_{st}_on'})
reg('crystal_switch_off', 'puzzle', crystal_switch(0), 'block', states={'off': 'crystal_switch_off', 'on': 'crystal_switch_on'}, notes='interact (A) from an adjacent tile to toggle')
reg('crystal_switch_on', 'puzzle', crystal_switch(1), 'block', states={'off': 'crystal_switch_off', 'on': 'crystal_switch_on'})
for st in ('cave', 'hall'):
    reg(f'gate_{st}_closed', 'puzzle', crystal_gate(0, st), 'gate', states={'closed': f'gate_{st}_closed', 'open': f'gate_{st}_open'}, notes='blocks while closed; opens when its channel is active')
    reg(f'gate_{st}_open', 'puzzle', crystal_gate(1, st), 'walk', states={'closed': f'gate_{st}_closed', 'open': f'gate_{st}_open'})

# ---- HOOK for other workers' tile modules (do not edit their files here) ----
# Any module listed in EXTRA_TILE_MODULES that exposes register(reg, reg_multi) is imported and called here,
# so its tiles join tileset.json / the sheets with stable ids appended after the core kit.
EXTRA_TILE_MODULES = ['biomes_extra', 'extra_merge', 'soul_art', 'interiors_merge']   # biomes_extra has no register(); extra_merge.py merges its output (tileset_extra.json)
for _mod in EXTRA_TILE_MODULES:
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), _mod + '.py')):
        __import__(_mod).register(reg, reg_multi) if hasattr(__import__(_mod), 'register') else None
import furniture_fix; furniture_fix.apply_frames(TILES)   # furniture-colour rule: per-tile colour swaps on core + x_ frames (tools/furniture_fix_table.json)

# ---------------- map model ----------------
class Map:
    def __init__(s, name, w, h, base='grass', title='', music=''):
        s.name, s.w, s.h, s.base, s.title = name, w, h, base, title
        s.terr = [[base] * w for _ in range(h)]; s.deco = [[None] * w for _ in range(h)]; s.over = [[None] * w for _ in range(h)]
        s.cforce = {}; s.warps = []; s.exits = []; s.npcs = []; s.signs = []; s.items = []; s.enc_zones = []
        s.objs = []; s.puzzle = None
        s.story_gates = []; s.fly_point = None; s.forced_grass = []; s.bike = None; s.movement = {}
    def rect(s, x0, y0, x1, y1, terr=None, deco=None):
        for y in range(max(0, y0), min(s.h, y1 + 1)):
            for x in range(max(0, x0), min(s.w, x1 + 1)):
                if terr: s.terr[y][x] = terr
                if deco is not None: s.deco[y][x] = deco if deco != '' else None
    def tree(s, x, y, dark=False):
        if not (0 <= x < s.w and 0 <= y < s.h): return
        s.deco[y][x] = 'treed_base' if dark else 'tree_base'
        if y > 0: s.over[y - 1][x] = 'treed_top' if dark else 'tree_top'
    def trees(s, x0, y0, x1, y1, dark=False):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.tree(x, y, dark)
    def clear(s, x0, y0, x1, y1, terr=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < s.w and 0 <= y < s.h:
                    s.deco[y][x] = None
                    if y > 0 and s.over[y - 1][x] in ('tree_top', 'treed_top') and True: s.over[y - 1][x] = None
                    if terr: s.terr[y][x] = terr
    def place(s, name, x, y):
        w, h = MULTI[name]
        for r in range(h):
            for c in range(w): s.deco[y + r][x + c] = f'{name}_{r}_{c}'
        return (x + w // 2, y + h - 1)
    def warp(s, x, y, to, tx, ty, facing='down', note=''):
        s.warps.append(dict(x=x, y=y, to=to, tx=tx, ty=ty, facing=facing, note=note))
    def exit(s, edge, a, b, to, offset=0, note=''):
        s.exits.append(dict(edge=edge, start=a, end=b, to=to, offset=offset, note=note))

def resolve(m):
    G = [[0] * m.w for _ in range(m.h)]; anim = set()
    def tr(x, y):
        if 0 <= x < m.w and 0 <= y < m.h: return m.terr[y][x]
        return None
    for y in range(m.h):
        for x in range(m.w):
            t = m.terr[y][x]
            if t.startswith('iwall_'):
                k = t[6:]
                G[y][x] = BYNAME['iwall_face_' + k if tr(x, y + 1) != t else ('iwall_upper_' + k if tr(x, y + 2) != t else 'iwall_top')]['id']; continue
            if t == 'cavewall':
                if tr(x, y + 1) not in ('cavewall', None): nm = 'cavewall_face_l'
                elif tr(x, y + 2) not in ('cavewall', None): nm = 'cavewall_face_u'
                else:
                    fl = lambda xx: any(tr(xx, yy) not in ('cavewall', None) for yy in (y, y + 1, y + 2))
                    e, w_ = fl(x + 1), fl(x - 1)
                    nm = 'cavewall_side_ew' if e and w_ else 'cavewall_side_e' if e else 'cavewall_side_w' if w_ else 'cavewall_top'
                G[y][x] = BYNAME[nm]['id']; continue
            if t in ('floor_wood', 'floor_tile', 'floor_tile_heal', 'rug', 'void', 'floor_carpet', 'floor_stone', 'floor_arena'): G[y][x] = BYNAME[t]['id']; continue
            p = PRIO[t]
            def low(xx, yy):
                n = tr(xx, yy); return n if (n is not None and n in PRIO and PRIO[n] < p) else None
            sides = [low(x, y - 1), low(x + 1, y), low(x, y + 1), low(x - 1, y)]
            diags = [low(x + 1, y - 1), low(x + 1, y + 1), low(x - 1, y + 1), low(x - 1, y - 1)]
            lows = [v for v in sides + diags if v]
            if not lows:
                if t in ('water', 'cave_water'): G[y][x] = BYNAME[water_name(t, ground_variant(x, y) % WATER_NV)]['id']
                else: G[y][x] = BYNAME[f'{t}_{ground_variant(x, y)}']['id']      # position hash, see ground.vhash / README §6
                continue
            A = collections.Counter(lows).most_common(1)[0][0]
            G[y][x] = trans_tile(t, A, tuple(bool(v) for v in sides), tuple(bool(v) for v in diags), wobble_variant(x, y))['id']
    return G

COLL = {'walk': 0, 'block': 1, 'ledge_s': 2, 'water': 3, 'door': 4, 'boulder': 5, 'gate': 6, 'plate': 7, 'bike_only': 8, 'ramp': 9, 'ice': 10, 'deep_water': 11}
RAMP_DIR = {'ramp_e': (1, 0), 'ramp_s': (0, 1)}
def place_tall_grass(m):
    for kind in ('tall_grass', 'cave_fern'):
        cells = {(x, y) for y in range(m.h) for x in range(m.w) if m.deco[y][x] == kind}
        for (x, y) in cells:
            o = lambda xx, yy: int((xx, yy) not in cells)
            n, e, s, w = o(x, y - 1), o(x + 1, y), o(x, y + 1), o(x - 1, y); v = (x + y) % 2
            m.deco[y][x] = f'{kind}_{n}{e}{s}{w}_v{v}'
            if m.over[y][x] is None: m.over[y][x] = f'{kind}_front_{n}{e}{s}{w}_v{v}'
            if n and y > 0 and m.over[y - 1][x] is None: m.over[y - 1][x] = f'{kind}_tips_{e}{w}_v{v}'

def finalize(m):
    place_tall_grass(m)
    G = resolve(m); byid = {t['id']: t for t in TILES}
    D = [[BYNAME[v]['id'] if v else 0 for v in row] for row in m.deco]
    O = [[BYNAME[v]['id'] if v else 0 for v in row] for row in m.over]
    C = [[0] * m.w for _ in range(m.h)]; E = [[0] * m.w for _ in range(m.h)]
    for y in range(m.h):
        for x in range(m.w):
            c = COLL[byid[G[y][x]]['coll']]
            if D[y][x]:
                dt = byid[D[y][x]]
                if dt['name'].startswith('bridge'): c = 0
                elif dt['coll'] != 'walk': c = COLL[dt['coll']]
                if dt['enc']: E[y][x] = 1
            if m.terr[y][x] == 'cave' and c == 0 and m.name.startswith('greystone'): E[y][x] = 2
            if O[y][x] and byid[O[y][x]]['name'] in ('tree_top', 'treed_top') and c == 0: c = 1  # canopy hides the tile
            C[y][x] = c
    for (x, y), v in m.cforce.items(): C[y][x] = v
    for wp in m.warps: C[wp['y']][wp['x']] = 4
    return G, D, O, C, E

def render(m, G, D, O, frame=0):
    byid = {t['id']: t for t in TILES}
    im = Image.new('RGBA', (m.w * T, m.h * T), (0, 0, 0, 255))
    for L in (G, D, O):
        for y in range(m.h):
            for x in range(m.w):
                if L[y][x]:
                    fr = byid[L[y][x]]['frames']; im.alpha_composite(fr[frame % len(fr)], (x * T, y * T))
    return im

def bfs(m, C, start):
    seen = {start}; q = collections.deque([start])
    while q:
        x, y = q.popleft()
        if C[y][x] == 4 and (x, y) != start: continue  # stepping on a warp leaves the map
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < m.w and 0 <= ny < m.h): continue
            c = C[ny][nx]
            if c == 2:
                if dy == 1 and ny + 1 < m.h and C[ny + 1][nx] in (0, 4, 7): nx, ny = nx, ny + 1
                else: continue
            elif c not in (0, 4, 7): continue
            if (nx, ny) not in seen: seen.add((nx, ny)); q.append((nx, ny))
    return seen

def entry_cells(m):
    pts = {}
    for wp in m.warps: pts[f"warp->{wp['to']}@{wp['x']},{wp['y']}"] = (wp['x'], wp['y'])
    for ex in m.exits:
        for i in range(ex['start'], ex['end'] + 1):
            p = {'north': (i, 0), 'south': (i, m.h - 1), 'west': (0, i), 'east': (m.w - 1, i)}[ex['edge']]
            pts[f"exit-{ex['edge']}->{ex['to']}@{p[0]},{p[1]}"] = p
    for n in m.npcs + m.signs: pts[f"talk:{n['id']}"] = None
    return pts
