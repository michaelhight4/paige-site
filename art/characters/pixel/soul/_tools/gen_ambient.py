"""#12 Ambient life (SOUL_PLAYBOOK 2.5 + 5.5): fish jump, Sailquill flock birds (scatter on run only), fireflies (dim near crystal),
paw prints for the Trail Buddy, wet prints after water, splash rings in shallow water.
Reuses the world team's fish_shadow / fish_ripple / footprint_{snow,sand,mud}_* tiles (tileset.json "ambient") - not redrawn here."""
import sys, os, json, math, random
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(__file__))
from soul_lib import *
from gen_trail_buddy import place_h, place_c, walk_path

ITEM = 'ambient'
GOLD = ['6a3019', 'd46616', 'eea23c', 'fcd668']
DIRS = ['down', 'up', 'left', 'right']
TH = lambda h, w, ox=0, oy=0: np.tile(BAYER, (h // 4 + 2, w // 4 + 2))[oy % 4:oy % 4 + h, ox % 4:ox % 4 + w]

def blend(dst, src, x, y):
    """preview-only alpha blend (world tiles like fish_shadow carry alpha 96)."""
    h, w = src.shape[:2]; H_, W_ = dst.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(W_, x + w), min(H_, y + h)
    if x1 <= x0 or y1 <= y0: return dst
    s = src[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32); a = s[..., 3:4] / 255.0
    d = dst[y0:y1, x0:x1].astype(np.float32); d[..., :3] = d[..., :3] * (1 - a) + s[..., :3] * a
    dst[y0:y1, x0:x1, :3] = d[..., :3].astype('uint8'); return dst

def world_tile(name, step=None):
    """step None = idle/full frame, 0.. = animation frames (fade / ripple)."""
    from preview_util import tile_img, ts
    tid = tile_id(name)
    return np.array(tile_img(tid, step).convert('RGBA'))

# =============================================================== fish jump
FISH = ['......kkkk..............',
        '....kkvvvvkk.......kk...',
        '..kkWWWWWWLLkk....kvvk..',
        '.kWWWWWWWWWLLLkk.kvvk...',
        'kWWWekWWWWWWLLLLkvvk....',
        'kWWWkkWWWWWWLLLLkvvk....',
        'kocccWWWWWWWWLLkk.kvvk..',
        '.kkcccccccWWLkk....kvvk.',
        '...kkkkkkkkkk.......kk..']
def fish_sprite(angle):
    f = glyph(FISH, {'k': INK, 'W': 'c6ecfa', 'L': BLUE[4], 'c': WHITE, 'v': VIO[3], 'o': GOLD[2], 'e': INK})
    f = flipx(f)   # nose right
    if angle:
        im = Image.fromarray(f).rotate(angle, Image.NEAREST, expand=True); f = np.array(im)
        f[f[..., 3] < 255] = 0
    return f
def ring(w, h, col, dens=1.0, ox=0):
    a = blank(w + 2, h + 2); yy, xx = np.mgrid[0:h + 2, 0:w + 2]
    r = ((xx - (w + 1) / 2) / (w / 2)) ** 2 + ((yy - (h + 1) / 2) / (h / 2)) ** 2
    m = (r <= 1.0) & (r >= 0.55 if h > 4 else r >= 0.3)
    if dens < 1: m &= TH(h + 2, w + 2, ox) < dens * 16
    a[m] = H(col); return a
def drops(pts, col=WHITE, edge=BLUE[4]):
    """list of (x, y) droplet centres -> small 1x2 drops in a 64-wide layer (caller pastes)."""
    out = []
    for x, y in pts: out.append((x, y, col)); out.append((x, y + 1, edge))
    return out
def put(a, pts):
    for x, y, c in pts:
        if 0 <= x < a.shape[1] and 0 <= y < a.shape[0]: a[int(y), int(x)] = H(c)
    return a

def fish_jump(d='right'):
    """64x96 overlay; bottom 64 px = the fish-spot water cell (draw at tile x*64, y*64-32). Waterline y=74."""
    WL = 74; fr = []
    arc = [(-0.0, 0), (0.15, 30), (0.32, 18), (0.5, 0), (0.68, -18), (0.85, -30), (1.0, -50)]
    for i in range(13):
        a = blank(64, 96)
        if i == 0:   # bulge: small ring + 2 drops
            paste(a, ring(10, 3, 'c6ecfa'), 13, WL - 2); put(a, drops([(17, WL - 3), (20, WL - 4)]))
        elif 1 <= i <= 7:
            t, ang = arc[i - 1]; x = 6 + t * 36; y = WL - math.sin(t * math.pi) * 40
            f = fish_sprite(ang); h, w = f.shape[:2]
            if i == 1: f = f[: h // 2 + 1]   # half out of the water
            paste(a, f, int(x - w / 2 + 8), int(y - h / 2) - (0 if i > 1 else 0))
            if i in (1, 2): put(a, drops([(14, WL - 4 - i * 3), (22, WL - 2 - i * 4), (18, WL - 6 - i * 2)]))
            if i <= 3: paste(a, ring(12 + i * 6, 3 + i, 'c6ecfa', 1.0 if i < 3 else 0.5), 18 - (12 + i * 6) // 2, WL - (3 + i) // 2)
            if i == 7: put(a, drops([(44, WL - 6), (50, WL - 9), (47, WL - 12)]))
        else:        # entry splash, then rings like fish_ripple, dissolving
            k = i - 8; cx = 48
            if k <= 1: put(a, drops([(cx - 4, WL - 6 - k * 4), (cx + 3, WL - 8 - k * 5), (cx, WL - 11 - k * 3), (cx - 7, WL - 3 - k * 2), (cx + 6, WL - 4 - k * 2)]))
            w = 10 + k * 7; h = 3 + k * 2
            paste(a, ring(w, h, 'c6ecfa', [1, 1, 0.75, 0.5, 0.25][k], cx), cx - w // 2 - 1, WL - h // 2 - 1)
            if k <= 2: paste(a, ring(max(4, w - 8), max(2, h - 2), BLUE[4], 1.0), cx - max(4, w - 8) // 2 - 1, WL - max(2, h - 2) // 2 - 1)
        fr.append(a if d == 'right' else flipx(a))
    return fr, [90, 60, 60, 60, 60, 60, 60, 60, 80, 90, 110, 130, 150]

# =============================================================== Sailquill flock birds
# 24x24, foot anchor (12,21). Side view facing right; 'left' = mirror. A tiny far-off take on the Sailquill palette.
BIRD_C = {'k': '342842', 'L': '7ac2e8', 'B': '4692ce', 'D': '2c64a8', 'W': WHITE, 'v': 'b076ec', 'o': 'e29d40', 'e': INK}
B_HEAD = ['...v...',
          '..kvk..',
          '.kLLLk.',
          'kLLLekoo',
          '.kLLLk..']
B_BODY = ['.......kkk..',
          'kk...kWWLk..',
          'kBBkkWWWWLk.',
          '.kBBBDWWWWk.',
          '..kkBBDWWk..',
          '....kkkkk...']
def bird(pose='stand', ph=0):
    a = blank(24, 24)
    if pose in ('stand', 'peck', 'hop', 'look'):
        by = 13 - (3 if pose == 'hop' else 0)
        paste(a, glyph(B_BODY, BIRD_C), 4, by)
        if pose == 'peck':   hx, hy = 13, by + 2
        elif pose == 'look': hx, hy = 11, by - 4
        else:                hx, hy = 12, by - 4
        h = glyph(B_HEAD, BIRD_C)
        if pose == 'look': h = flipx(h); hx -= 2
        paste(a, h, hx, hy)
        if pose != 'hop': put(a, [(10, by + 6, 'e29d40'), (12, by + 6, 'e29d40'), (10, by + 7, 'e29d40'), (12, by + 7, 'e29d40')])
        else: put(a, [(10, by + 6, 'e29d40'), (12, by + 6, 'e29d40')])
    else:   # fly: ph 0 wings up, 1 mid, 2 down, 3 mid
        by = 10
        body = glyph(['..........kkk.',
                      'kk......kkLLLk',
                      'kBBkkkkkWWLLekoo',
                      '.kBBDDWWWWWLk...',
                      '..kkkkkkkkkk....'], BIRD_C)
        paste(a, body, 3, by); put(a, [(9, by - 3, 'b076ec')]) if False else None
        put(a, [(15, by - 1, 'b076ec'), (15, by - 2, 'b076ec')])
        wings = {0: ['...kk', '..kDk', '.kDDk', 'kDDBk', 'kDBBk'],
                 1: ['kkkkkk', 'kDDDBk', '.kkkk.'],
                 2: ['kDBBk', 'kDDBk', '.kDDk', '..kDk', '...kk'],
                 3: ['kkkkkk', 'kDDDBk', '.kkkk.']}[ph % 4]
        wg = glyph(wings, BIRD_C)
        wy = {0: by - 4, 1: by + 1, 2: by + 3, 3: by + 1}[ph % 4]
        paste(a, wg, 8, wy)
    return a
def bird_shadow(): return bayer_ellipse(8, 3, INK, 0.5)

# =============================================================== fireflies
def firefly(level, ph):
    """9x9, centre (4,4). level 1.0 = bright lumen, 0.0 = dim near crystal. ph = pulse step."""
    a = blank(9, 9)
    pulse = [0.55, 0.8, 1.0, 0.8, 0.55, 0.35][ph % 6] * level
    yy, xx = np.mgrid[0:9, 0:9]; r = np.hypot(xx - 4, yy - 4); th = TH(9, 9)
    if pulse > 0.3:
        halo = (r <= 1.5 + 2.6 * pulse) & (r > 1.0) & (th < (7 + 9 * pulse))
        a[halo] = H('a6d460' if pulse > 0.6 else '78ba48')
    core = r <= (1.0 if pulse > 0.75 else 0.5)
    a[core] = H(GOLD[3] if level > 0.5 else GOLD[1])
    if pulse > 0.7: a[4, 4] = H(WHITE)
    if level <= 0.35:   # dim: tiny cold ember, no halo, irregular gaps
        a[:] = 0   # small 5px ember cross: clearly no halo / no lumen green, but still readable at 1x
        a[4, 4] = H('d46616' if ph % 6 in (0, 1, 3) else '9f4013')
        if ph % 6 not in (2, 5):
            for yx in ((3, 4), (5, 4), (4, 3), (4, 5)): a[yx] = H('9f4013')
    return a
def firefly_fade():
    """bright -> dim transition, plays once when a firefly drifts into a crystal's radius (reverse to brighten)."""
    return [firefly(l, 2) for l in (1.0, 0.75, 0.55, 0.42, 0.3)], [90, 90, 110, 130, 160]

# =============================================================== prints
def paw(col, flip=False):
    g = glyph(['.p.p.', 'p...p', '.....', '.ppp.', 'ppppp', '.ppp.'], {'p': col})
    m = g[..., 3] > 0; inner = ndimage.binary_erosion(m); yy, xx = np.mgrid[0:g.shape[0], 0:g.shape[1]]
    g[inner & ((xx + yy) % 2 == 1)] = 0   # world-print texture: checker only inside the pad
    return g[::-1] if flip else g
def pawprint(col, d, wet=False):
    """64x64 decal, four-legged gait: two paws per half-cell staggered; checker-dithered like the world footprints."""
    a = blank(64, 64)
    if d in ('up', 'down'):
        pts = [(22, 8), (35, 18), (22, 36), (35, 46)]
        for x, y in pts: paste(a, paw(col, d == 'down'), x, y)
    else:
        pts = [(8, 24), (21, 34), (36, 24), (49, 34)]
        for x, y in pts:
            p = np.rot90(paw(col), 1 if d == 'left' else -1).copy(); paste(a, p, x, y)
    return a
def fade3(full, seed_off=0):
    """full / 60% / 30% like the tileset footprints (Bayer dissolve keyed to absolute position)."""
    return [full, bayer_fade(full, 0.4, seed_off), bayer_fade(full, 0.7, seed_off)]
def recolor_all(a, col):
    o = a.copy(); m = o[..., 3] > 0; o[m] = H(col); o[~m] = 0; return o

WET = {'sand': '92623e', 'ground': '3e3a48'}   # damp sand darkens; on path/grass/stone a dark slate damp mark
PAW = {'sand': 'ba8856', 'snow': 'a8a0a4', 'mud': '2c1a12'}   # same ink as the world footprint tiles

# =============================================================== splash ring
def splash_ring():
    """64x64 decal at the walker's cell, foot at (32,58). One step in shallow water."""
    fr = []; cy = 58
    for k in range(6):
        a = blank(64, 64)
        w, h = 8 + k * 7, 3 + k * 2
        dens = [1, 1, 1, 0.75, 0.5, 0.25][k]
        paste(a, ring(w, h, 'c6ecfa', dens), 32 - w // 2 - 1, cy - h // 2 - 1)
        if 1 <= k <= 3: paste(a, ring(max(4, w - 8), max(2, h - 2), BLUE[4]), 32 - max(4, w - 8) // 2 - 1, cy - max(2, h - 2) // 2 - 1)
        dy = [-4, -9, -11, -9, -4, 0][k]
        if k < 5:
            put(a, drops([(27 - k, cy + dy), (37 + k, cy + dy - 1), (32, cy + dy - 3), (23 - k * 2, cy + dy + 3), (41 + k * 2, cy + dy + 2)]))
        fr.append(a)
    return fr, [50, 60, 70, 80, 90, 110]
def wade_ring():
    """loop while a walker stands in shallow water: a soft ring breathes around the feet."""
    fr = []
    for k in range(4):
        a = blank(64, 64); w, h = [26, 30, 34, 30][k], [7, 8, 9, 8][k]
        paste(a, ring(w, h, 'c6ecfa', [1, 0.75, 0.5, 0.75][k]), 32 - w // 2 - 1, 58 - h // 2 - 1); fr.append(a)
    return fr, [220, 220, 260, 220]

# =============================================================== emit
SPECS = {
 'fish': {'reuse': 'tileset fish_shadow (1165, 4 fr x 200 ms, alpha-96 shadow) + fish_ripple (1166) at map.ambient.fish_spots - unchanged',
          'jump': {'asset': 'fish_jump_right / fish_jump_left', 'frame': '64x96, draw at (spot_x*64, spot_y*64-32); bottom 64 px = the spot cell; waterline y=74',
                   'chance': 'each visible shadow: one jump every 12-30 s (random), never two at once per map; not while raining; not at Night (shadows hide at Night? keep: Night allowed in brookhollow only if fish_spots visible)',
                   'sequence': 'hide the shadow on frame 0, play 13 frames once (total 1.07 s), show the shadow again 1 tile right/left (where the fish landed: +34 px) and resume drifting',
                   'direction': 'right or left at random; use the mirrored strip for left', 'layer': 'over water, under characters (frames 2-6 above everything on the water row is fine: the fish stays inside the cell above)',
                   'sound': 'small plip on frame 0, splash on frame 8'}},
 'birds': {'asset': 'flock_bird_* (24x24, foot anchor (12,21), facing right; mirror for left) + flock_bird_shadow (8x3, centre (4,1))',
           'where': 'route1 dirt paths (playbook 2.5): spawn groups of 3-5 on path cells off-screen-ish, 6-14 px random offsets inside the cell; day/dusk only; none in rain',
           'idle': 'per bird random loop: peck (4 fr x 120 ms), look (hold 400-900 ms), hop (3 fr x 80 ms, moves 4-8 px), stand; desynchronise with random start',
           'trigger': {'run_or_bike': 'player RUNNING or BIKING within 3 tiles (Chebyshev) of a bird -> whole group scatters, staggered 0-120 ms per bird',
                       'walk': 'WALKING never scatters them (playbook: "scatter when you run, not when you walk"); a bird whose cell the player walks into hops 1 cell aside (hop x2) and keeps pecking',
                       'buddy': 'the Trail Buddy never scatters them (Sailquill buddy: birds look up = look pose)'},
           'scatter': {'frames': 'flock_bird_takeoff (2 fr x 50 ms) then flock_bird_fly loop (4 fr x 50 ms)', 'path': 'away from the player: dx = +-5 px/frame (40 ms tick), dy = -3 px/frame, plus random +-1 jitter; shadow stays on the ground and slides with dx, dissolves after 6 ticks',
                       'despawn': 'when off-screen; respawn the group on another path cell 20-40 s later while it is off-camera'},
           'sound': 'flutter burst on scatter (one per group)'},
 'fireflies': {'asset': 'firefly_bright (6 fr x 110 ms loop), firefly_dim (6 fr x 160 ms loop), firefly_dim_in (5 fr once; reverse = brighten). 9x9, centre (4,4). EMISSIVE: draw after the night grade, unaffected by it',
               'where_when': 'Night in fernwick (pond x15-18, y20-21) and thornwood (glades); Dusk: half count. Count in fernwick follows sq_fireflies: 3 at sq_fireflies_start, 12 at sq_fireflies_done (8.5-D)',
               'motion': 'code-driven drift per firefly: x = cx + 22*sin(t/1700 + p1) + 6*sin(t/530 + p2), y = cy + 10*sin(t/1100 + p3) - 4; cx,cy = home cell centre; random p1..p3',
               'crystal_dim': 'distance to the nearest crystal ore / dig-scar tile (thornwood (27,11), greystone_entrance (16,12), route1 crystal cluster): <= 2 tiles -> play firefly_dim_in once then firefly_dim; also push the home point 0.5 px/tick away; back outside 2.5 tiles -> reverse dim_in then bright. After the scar is planted with lumen moss (sq_fireflies_scar_N) the radius for that scar is 0',
               'layer': 'above characters'},
 'prints': {'reuse': 'tileset footprint_{snow,sand,mud}_{dir} for the player (unchanged rule: spawn on the cell left, 3 frames x 1333 ms, max 24)',
            'pawprint': 'pawprint_{sand,snow,mud}_{dir}: same rule for the Trail Buddy (replaces the human prints the tileset rule currently spawns for the follower). 3 frames x 1333 ms, 64x64 decal, cell top-left, under characters. Flying buddies (Sailquill) leave none',
            'wet': 'wetprint_{sand,ground}_{dir} (player) and wetpaw_{sand,ground}_{dir} (buddy): after leaving water/shallow (Tideglide dismount, wading Rillop, shallow cells) spawn on the next 6 cells left; frames full/60%/30% x 1000 ms; "sand" on sand ground, "ground" everywhere else except water; none on snow (snow prints win)'},
 'splash': {'splash_ring': '6 fr (460 ms) once per step that ENDS on a shallow-water cell (and every buddy step while Rillop wades); 64x64 decal on that cell, under characters except the drops (fine to draw all of it under the feet)',
            'wade_ring': '4 fr loop while standing in shallow water', 'shallow_cells': 'there is no shallow-water tile yet: trigger on cells tagged shallow (World Design to add), and on Rillop wade cells; until then preview uses the route1 sand pond edge'},
 'reduced_motion': 'birds still scatter but fly straight up-out in 6 ticks; fish jumps off (ripples stay); fireflies keep the pulse but drift amplitude halved',
}

def emit():
    fj = fish_jump('right')
    write_anim(ITEM, 'fish_jump_right', fj[0], fj[1], 'overlay', [0, 32], False, 'Draw at (spot_x*64, spot_y*64-32). Hide fish_shadow during; resume it at +34 px.', sub='fish')
    fl = fish_jump('left')
    write_anim(ITEM, 'fish_jump_left', fl[0], fl[1], 'overlay', [0, 32], False, 'Mirror of fish_jump_right (resume shadow at -34 px).', sub='fish')
    for side in ('right', 'left'):
        f = (lambda a: a) if side == 'right' else flipx
        write_anim(ITEM, f'flock_bird_peck_{side}', [f(bird('stand')), f(bird('peck')), f(bird('stand')), f(bird('peck'))], [160, 120, 140, 120], 'overlay', [12, 21], True, 'Idle peck loop.', sub='birds')
        write_anim(ITEM, f'flock_bird_look_{side}', [f(bird('look'))], [600], 'overlay', [12, 21], True, 'Hold 400-900 ms.', sub='birds')
        write_anim(ITEM, f'flock_bird_hop_{side}', [f(bird('stand')), f(bird('hop')), f(bird('stand'))], [80, 80, 80], 'overlay', [12, 21], False, 'Move 4-8 px during frame 1.', sub='birds')
        write_anim(ITEM, f'flock_bird_takeoff_{side}', [f(bird('hop')), f(bird('fly', 2))], [50, 50], 'overlay', [12, 21], False, 'Then fly loop.', sub='birds')
        write_anim(ITEM, f'flock_bird_fly_{side}', [f(bird('fly', i)) for i in range(4)], 50, 'overlay', [12, 21], True, 'Scatter flight loop.', sub='birds')
    write_anim(ITEM, 'flock_bird_shadow', [bird_shadow()], [100], 'overlay', [4, 1], True, 'Ground shadow under a flying bird; dissolve after 6 ticks.', sub='birds')
    write_anim(ITEM, 'firefly_bright', [firefly(1.0, i) for i in range(6)], 110, 'overlay', [4, 4], True, 'Emissive. Draw after the night grade.', sub='fireflies')
    write_anim(ITEM, 'firefly_dim', [firefly(0.3, i) for i in range(6)], 160, 'overlay', [4, 4], True, 'Near crystal (<=2 tiles).', sub='fireflies')
    fd = firefly_fade()
    write_anim(ITEM, 'firefly_dim_in', fd[0], fd[1], 'overlay', [4, 4], False, 'Bright -> dim once; reverse to brighten.', sub='fireflies')
    for g, col in PAW.items():
        for d in DIRS:
            write_anim(ITEM, f'pawprint_{g}_{d}', fade3(pawprint(col, d)), 1333, 'overlay', [0, 0], False, 'Trail Buddy prints; same rule as tileset footprints.', sub='prints')
    for g, col in WET.items():
        for d in DIRS:
            shoe = [recolor_all(world_tile(f'footprint_sand_{d}', s), col) for s in (None, 0, 1)]
            write_anim(ITEM, f'wetprint_{g}_{d}', shoe, 1000, 'overlay', [0, 0], False, 'Player wet prints (shape = the world footprint tiles, recoloured).', sub='prints')
            write_anim(ITEM, f'wetpaw_{g}_{d}', fade3(pawprint(col, d)), 1000, 'overlay', [0, 0], False, 'Buddy wet prints.', sub='prints')
    sr = splash_ring(); write_anim(ITEM, 'splash_ring', sr[0], sr[1], 'overlay', [0, 0], False, 'Once per step into shallow water; cell top-left; foot (32,58).', sub='water')
    wr = wade_ring(); write_anim(ITEM, 'wade_ring', wr[0], wr[1], 'overlay', [0, 0], True, 'Loop while standing in shallow water.', sub='water')

# =============================================================== previews
P = f'{SOUL}/{ITEM}/previews'
def fish_layer(im, X0, Y0, spots, t, flip=()):
    """existing fish_shadow tile drifting within its cell (world asset, alpha 96)."""
    for j, (sx, sy) in enumerate(spots):
        f = world_tile('fish_shadow', (t // 3 + j) % 4)
        if j in flip: f = flipx(f)
        ox = int(10 * math.sin(t / 9 + j * 2)); blend(im, f, (sx - X0) * 64 + ox, (sy - Y0) * 64)

def preview_fish():
    X0, Y0 = 20, 5; B = bg('brookhollow', X0, Y0, X0 + 6, Y0 + 6)
    spots = [(22, 6), (24, 10)]; seq, ms = [], []
    jf, jm = fish_jump('right')
    for t in range(16): im = B.copy(); fish_layer(im, X0, Y0, spots, t); seq.append(im); ms.append(100)
    for k, (f, m) in enumerate(zip(jf, jm)):
        im = B.copy(); fish_layer(im, X0, Y0, spots[:1], 16 + k); paste(im, f, (24 - X0) * 64 - 12, (10 - Y0) * 64 - 32); seq.append(im); ms.append(m)
    for t in range(12):
        im = B.copy(); fish_layer(im, X0, Y0, spots[:1], 30 + t); blend(im, world_tile('fish_shadow', t % 4), (24 - X0) * 64 + 22, (10 - Y0) * 64); seq.append(im); ms.append(100)
    save_preview(seq, f'{P}/fish_jump_brookhollow_2x.gif', ms)
    # thornwood pond, the existing shadow + a left jump
    X0, Y0 = 23, 4; B = bg('thornwood', X0, Y0, X0 + 5, Y0 + 4); seq, ms = [], []
    jf, jm = fish_jump('left')
    for t in range(10): im = B.copy(); fish_layer(im, X0, Y0, [(26, 6)], t, flip=(0,)); seq.append(im); ms.append(100)
    for f, m in zip(jf, jm): im = B.copy(); paste(im, f, (26 - X0) * 64, (6 - Y0) * 64 - 32); seq.append(im); ms.append(m)
    for t in range(8): im = B.copy(); blend(im, flipx(world_tile('fish_shadow', t % 4)), (26 - X0) * 64 - 34, (6 - Y0) * 64 + 8); seq.append(im); ms.append(100)
    save_preview(seq, f'{P}/fish_jump_thornwood_pond_2x.gif', ms)

def preview_birds():
    """Route 1 east-west path: (A) Cal WALKS past the flock - they keep pecking, one hops aside. (B) Cal RUNS - they scatter."""
    X0, Y0 = 12, 16; B = bg('route1', X0, Y0, X0 + 8, Y0 + 4)
    flock = [(16, 19, 6, 4, 'right'), (17, 19, 30, 10, 'left'), (17, 18, 14, 40, 'right'), (18, 19, 20, 2, 'left'), (19, 19, 4, 18, 'right')]
    rng = random.Random(12)
    def draw_bird(im, b, pose, ph, dx=0, dy=0, shadow=None):
        tx, ty, ox, oy, side = b; spr = bird(pose, ph); spr = spr if side == 'right' else flipx(spr)
        fx, fy = tx * 64 + ox + 20 - X0 * 64, ty * 64 + oy + 30 - Y0 * 64
        if shadow is not None: paste(im, bayer_fade(bird_shadow(), shadow), int(fx + dx * 0.6 - 4), fy)
        paste(im, spr, int(fx - 12 + dx), int(fy - 21 + dy))
    seq, ms = [], []
    # A: walk along row 18 then 19 ... Cal walks the row 20 lane (path), left -> right
    path = [(12, 20)] + [(x, 20) for x in range(13, 21)]
    cal = walk_path(path)
    for i, (cx, cy, cd, ck) in enumerate(cal):
        im = B.copy(); hop = []
        for j, b in enumerate(flock):
            near = abs(cx - b[0]) < 0.8 and j == 3
            pose = 'look' if abs(cx - b[0]) < 1.5 else ('peck' if (i // 3 + j) % 3 == 0 else 'stand')
            draw_bird(im, b, 'hop' if near else pose, 0, dy=0)
        place_h(im, human('cal', cd, f'walk{ck}'), cx - X0, cy - Y0); seq.append(im); ms.append(62)
    for k in range(6):
        im = B.copy()
        for j, b in enumerate(flock): draw_bird(im, b, 'peck' if (k + j) % 2 else 'stand', 0)
        place_h(im, human('cal', 'right', 'stand'), 20 - X0, 20 - Y0); seq.append(im); ms.append(140)
    # B: run (21.33 px / frame, 41.7 ms -> preview 42 ms), scatter when within 3 tiles
    xs = [12 + i * (21.333 / 64) for i in range(int(8 * 64 / 21.333))]
    took = {}
    for i, cx in enumerate(xs):
        im = B.copy()
        for j, b in enumerate(flock):
            if j not in took and abs(cx - b[0]) <= 3: took[j] = i + rng.randint(0, 2)
            if j in took and i >= took[j]:
                n = i - took[j]; side = 1 if b[0] + b[2] / 64 >= cx else -1
                bb = (b[0], b[1], b[2], b[3], 'right' if side > 0 else 'left')
                pose, ph = ('hop', 0) if n == 0 else ('fly', 2 if n == 1 else n)
                draw_bird(im, bb, pose, ph, dx=side * 5 * n, dy=-3 * n - (n * n) // 6, shadow=min(1.0, n / 7) if n < 7 else None)
            else:
                draw_bird(im, b, 'peck' if (i // 3 + j) % 3 == 0 else 'stand', 0)
        place_h(im, human('cal', 'right', f'run{i % 6}'), cx - X0, 20 - Y0); seq.append(im); ms.append(42)
    for k in range(8):
        im = B.copy(); place_h(im, human('cal', 'right', 'stand'), 20 - X0, 20 - Y0); seq.append(im); ms.append(120)
    save_preview(seq, f'{P}/birds_walk_vs_run_route1_2x.gif', ms)

def preview_fireflies():
    rng = random.Random(7)
    def scene(mapn, X0, Y0, X1, Y1, homes, crystals, n_frames, out, guide=False):
        B = grade(bg(mapn, X0, Y0, X1, Y1), 'night'); seq = []
        ph = [(rng.random() * 6.28, rng.random() * 6.28, rng.random() * 6.28, rng.randint(0, 5)) for _ in homes]
        for t in range(n_frames):
            im = B.copy(); T = t * 110
            for (hx, hy), (p1, p2, p3, p0) in zip(homes, ph):
                x = hx * 64 + 32 + 22 * math.sin(T / 1700 + p1) + 6 * math.sin(T / 530 + p2); y = hy * 64 + 28 + 10 * math.sin(T / 1100 + p3)
                dmin = min([math.hypot(x / 64 - cx - 0.5, y / 64 - cy - 0.5) for cx, cy in crystals] + [99])
                lvl = 1.0 if dmin > 2.5 else 0.3 if dmin <= 2.0 else 0.5
                f = firefly(lvl, t + p0)
                paste(im, f, int(x - X0 * 64 - 4), int(y - Y0 * 64 - 4))
            if guide:   # scripted firefly: drifts into the crystal radius (fades to ember) and back out (brightens)
                cx, cy = crystals[0]; u = t / (n_frames - 1); k = math.sin(u * math.pi)
                x = (cx + 0.5 - 4.2 + 3.6 * k) * 64; y = (cy - 0.1) * 64 + 8 * math.sin(t / 3)
                dmin = math.hypot(x / 64 - cx - 0.5, y / 64 - cy - 0.5)
                lvl = 1.0 if dmin >= 2.5 else 0.3 if dmin <= 2.0 else 0.3 + 0.7 * (dmin - 2.0) / 0.5
                paste(im, firefly(lvl, t), int(x - X0 * 64 - 4), int(y - Y0 * 64 - 4))
            seq.append(im)
        save_preview(seq, out, 110)
        if guide:   # 4x zoom on the crystal radius so the bright -> ember -> bright change is legible in review
            cx, cy = crystals[0]; x0 = (cx - X0 - 4) * 64; y0 = (cy - Y0 - 2) * 64
            save_preview([f[max(0, y0):y0 + 192, max(0, x0):x0 + 320] for f in seq], out.replace('_2x.gif', '_zoom_4x.gif'), 110, scale=4)
    th_homes = [(23, 8), (24, 9), (23, 11), (24, 12), (25, 10), (26, 9), (27, 10), (26, 12), (28, 12), (29, 9), (29, 11), (30, 10)]
    scene('thornwood', 22, 7, 30, 13, th_homes, [(27, 11)], 64, f'{P}/fireflies_dim_near_crystal_thornwood_night_2x.gif', guide=True)
    fw3 = [(15, 20), (17, 21), (18, 20)]
    fw12 = fw3 + [(14, 19), (16, 19), (15, 21), (16, 20), (17, 19), (18, 21), (19, 20), (19, 19), (14, 21)]
    scene('fernwick', 12, 17, 21, 23, fw3, [], 30, f'{P}/fireflies_fernwick_pond_3_night_2x.gif')
    scene('fernwick', 12, 17, 21, 23, fw12, [], 30, f'{P}/fireflies_fernwick_pond_12_night_2x.gif')

def decal_age(age_ms, frames_ms=1333):
    s = int(age_ms // frames_ms); return None if s > 2 else s

def preview_prints_pond():
    """Route 1 sand pond (17-21,13-16): Cal walks the sand rim (world sand footprints), Rillop wades the pond edge with
    splash rings, steps out and leaves wet paw prints on the sand."""
    X0, Y0 = 15, 11; B = bg('route1', X0, Y0, X0 + 7, Y0 + 6)
    cal_path = [(17, 12), (17, 13), (18, 13), (19, 13), (20, 13), (21, 13), (21, 14), (21, 15), (21, 16), (20, 16)]
    bud_path = [(17, 11), (17, 12), (17, 13), (18, 14), (19, 14), (20, 14), (20, 15), (21, 15), (21, 16), (21, 17)]
    cal = walk_path(cal_path); bud = walk_path(bud_path)
    sand = lambda x, y: (17 <= x <= 21 and 13 <= y <= 16) and not (18 <= x <= 20 and 14 <= y <= 15)
    water = lambda x, y: 18 <= x <= 20 and 14 <= y <= 15
    decals = []   # (kind, cell, dir, t_spawn)
    splashes = []
    sr, srm = splash_ring(); srt = np.cumsum([0] + srm)
    wet_left = 0
    seq, ms = [], []; T = 0
    N = len(cal) + 40
    for i in range(N):
        im = B.copy()
        if i < len(cal) and i % 4 == 0 and i > 0:
            pc = cal_path[i // 4 - 1 + 0] if False else cal_path[i // 4 - 1]
            nc = cal_path[i // 4]
            d = cal[i - 1][2]
            if sand(*pc): decals.append(('human', pc, d, T))
            bc, bn = bud_path[i // 4 - 1], bud_path[i // 4]; bd = bud[i - 1][2]
            if water(*bc) and not water(*bn): wet_left = 6
            if water(*bn): splashes.append((bn, T))
            if wet_left and not water(*bc): decals.append(('wetpaw', bc, bd, T)); wet_left -= 1
            elif sand(*bc) and not water(*bc): decals.append(('paw', bc, bd, T))
            if water(*bc) and not water(*bn): pass
        for kind, (cx, cy), d, t0 in decals:
            age = T - t0
            if kind == 'human':
                s = decal_age(age)
                if s is not None: paste(im, world_tile(f'footprint_sand_{d}', None if s == 0 else s - 1), (cx - X0) * 64, (cy - Y0) * 64)
            else:
                s = decal_age(age, 1000 if kind == 'wetpaw' else 1333)
                if s is not None:
                    a = fade3(pawprint(WET['sand'] if kind == 'wetpaw' else PAW['sand'], d))[s]; paste(im, a, (cx - X0) * 64, (cy - Y0) * 64)
        for (cx, cy), t0 in splashes:
            age = T - t0
            if age < srt[-1]: k = int(np.searchsorted(srt, age, 'right') - 1); paste(im, sr[k], (cx - X0) * 64, (cy - Y0) * 64)
        if i < len(cal):
            cx, cy, cd, ck = cal[i]; bx, by, bd, bk = bud[i]
            rx, ry = int(round(bx)), int(round(by))
            in_w = water(int(math.floor(bx + 0.5)), int(math.floor(by + 0.5)))
            spr = None
            if in_w:
                import gen_trail_buddy as gtb
                spr = gtb.rillop_wade(bd)[0][bk]
            else: spr = creature('rillop', bd, f'walk{bk}')
            items = [(by, 'c', spr, bx, by), (cy, 'h', human('cal', cd, f'walk{ck}'), cx, cy)]
        else:
            items = [(17, 'c', creature('rillop', 'down', 'stand'), 21, 17), (16, 'h', human('cal', 'left', 'stand'), 20, 16)]
        for _, k, s, x, y in sorted(items, key=lambda z: z[0]):
            (place_c if k == 'c' else place_h)(im, s, x - X0, y - Y0)
        step = 62 if i < len(cal) else 125
        seq.append(im); ms.append(step); T += step
    save_preview(seq, f'{P}/prints_wet_splash_route1_pond_2x.gif', ms)

def preview_snow():
    """No snow map exists yet (Frostspire is unbuilt): a synthetic 6x3 snow strip from the world snow_0..3 tiles.
    Cal walks right leaving the WORLD snow footprints, the buddy (Cindrip) leaves the new paw prints; all fade over ~4 s."""
    W, Hh = 7, 3; B = blank(W * 64, Hh * 64); rng = random.Random(3)
    for y in range(Hh):
        for x in range(W): paste(B, world_tile(f'snow_{rng.randint(0, 3)}'), x * 64, y * 64)
    cal_path = [(x, 1) for x in range(0, 7)]; bud_path = [(-1, 1)] + cal_path[:-1]
    cal = walk_path(cal_path); bud = walk_path(bud_path); decals = []; seq, ms = [], []; T = 0
    for i in range(len(cal) + 50):
        im = B.copy()
        if 0 < i < len(cal) and i % 4 == 0:
            decals.append(('h', cal_path[i // 4 - 1], 'right', T))
            if bud_path[i // 4 - 1][0] >= 0: decals.append(('p', bud_path[i // 4 - 1], 'right', T))
        for k, (cx, cy), d, t0 in decals:
            s = decal_age(T - t0)
            if s is None: continue
            a = world_tile(f'footprint_snow_{d}', None if s == 0 else s - 1) if k == 'h' else fade3(pawprint(PAW['snow'], d))[s]
            # human print uses the top half of the cell lane, paw prints the same cell (buddy walks the same path)
            paste(im, a, cx * 64, cy * 64)
        if i < len(cal):
            cx, cy, cd, ck = cal[i]; bx, by, bd, bk = bud[i]
            place_c(im, creature('cindrip', bd, f'walk{bk}'), bx, by); place_h(im, human('cal', cd, f'walk{ck}'), cx, cy)
        else:
            place_c(im, creature('cindrip', 'right', 'stand'), 5, 1); place_h(im, human('cal', 'right', 'stand'), 6, 1)
        st = 62 if i < len(cal) else 125; seq.append(im); ms.append(st); T += st
    save_preview(seq, f'{P}/prints_snow_synthetic_strip_2x.gif', ms)

def preview_contacts():
    rows = [fish_jump('right')[0][::2], [bird('stand'), bird('peck'), bird('look'), bird('hop')] + [bird('fly', i) for i in range(4)] + [bird_shadow()],
            [firefly(1.0, i) for i in range(6)] + [firefly(0.3, i) for i in range(6)] + firefly_fade()[0]]
    save_png(contact(rows[:1], bgcol=(70, 120, 170)), f'{P}/fish_jump_contact_2x.png', 2)
    save_png(contact([rows[1]], bgcol=(150, 120, 80)), f'{P}/birds_contact_4x.png', 4)
    save_png(contact([rows[2]], bgcol=(30, 34, 60)), f'{P}/fireflies_contact_4x.png', 4)
    pr = []
    for g, col in PAW.items(): pr.append([pawprint(col, d) for d in DIRS] + fade3(pawprint(col, 'down'))[1:])
    pr.append([recolor_all(world_tile(f'footprint_sand_{d}'), WET['sand']) for d in DIRS] + [pawprint(WET['sand'], d) for d in DIRS])
    pr.append([recolor_all(world_tile(f'footprint_sand_{d}'), WET['ground']) for d in DIRS] + [pawprint(WET['ground'], d) for d in DIRS])
    pr.append(splash_ring()[0] + wade_ring()[0])
    save_png(contact(pr, bgcol=(214, 190, 140)), f'{P}/prints_water_contact_2x.png', 2)

def main():
    emit()
    os.makedirs(P, exist_ok=True)
    json.dump(SPECS, open(f'{SOUL}/{ITEM}/hook_specs.json', 'w'), indent=1)
    only = sys.argv[1:]
    for n, f in [('contacts', preview_contacts), ('fish', preview_fish), ('birds', preview_birds), ('fireflies', preview_fireflies), ('pond', preview_prints_pond), ('snow', preview_snow)]:
        if not only or n in only: f()
    dump_meta(ITEM)

if __name__ == '__main__':
    main()
