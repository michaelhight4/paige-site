"""item_pickup (Animator DRAFT): supply satchel prop idle, pickup open, hidden-item sparkle.
The satchel PROP may belong to World Design (it's a solid map object); this is an Animator draft so the pickup has art."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'item_pickup'
GLOWSET = {int(h, 16) for h in (WARM_HI, 'd6acff', 'b076ec', '8a4ace', 'f4e2ff', '603096')}
def emask(f): return np.isin(keys(f), list(GLOWSET)) & (f[..., 3] > 0)

def satchel(cv, oy=0, flap=0, glint=0):
    """SOFT drawstring supply bag (cloth sack, slouchy, no hard edges/frame), ~24x22, bottom at y=52+oy.
    flap (kept name for the pickup plan): 0 tied shut, 1 cord loosened, 2 neck open. glint 0..3 on the crystal toggle bead."""
    L = LEATHER; yb = 52 + oy; yn = yb - 13; cx = 31.5
    neck = [4, 6, 8][flap]
    body = blank(cv.shape[1], cv.shape[0])
    for y in range(yn, yb + 1):
        t = (y - yn) / (yb - yn)                                   # 0 at the neck, 1 at the bottom
        hw = neck + (11.5 - neck) * math.sin(min(1, t * 1.35) * math.pi / 2)
        if t > 0.8: hw *= math.sqrt(max(0, 1 - ((t - 0.8) / 0.2) ** 2 * 0.55))   # rounded, slumped bottom
        sl = 0.6 * (1 - t)                                         # slouch: the top leans right a touch
        for x in range(int(cx - hw + sl + 0.5), int(cx + hw + sl + 0.5) + 1):
            c = L[3]
            if x <= cx - hw + sl + 2.5 and t < 0.85: c = L[4]       # lit left side
            if x >= cx + hw + sl - 2.5 or t > 0.86: c = L[2]        # shade right + base
            px(body, x, y, c)
    for fx_, y0, y1 in ((27, yn + 5, yb - 3), (35, yn + 4, yb - 2), (31, yn + 8, yb - 1)):   # soft fold creases
        for y in range(y0, y1): px(body, fx_ + (1 if y > (y0 + y1) // 2 else 0), y, L[2])
    if flap < 2:                                                   # gathered ruffle above the cord
        rw = [6, 7][flap]
        for y in range(yn - 4, yn):
            for x in range(int(cx - rw + 1), int(cx + rw + 1)):
                if (x + (y == yn - 4)) % 3 == 0: c = L[2]
                else: c = L[4] if x < cx else L[3]
                if y == yn - 4 and (x - int(cx - rw + 1)) % 3 == 1: continue   # scalloped top edge
                px(body, x, y, c)
        for x in range(int(cx - neck), int(cx + neck + 2)): px(body, x, yn, L[1])   # drawstring band
    else:                                                          # open mouth: dark inside, lip highlight
        for x in range(int(cx - neck), int(cx + neck + 2)):
            px(body, x, yn - 1, L[4]); px(body, x, yn, L[0]); px(body, x, yn + 1, L[0] if abs(x - cx - .5) < neck - 1 else L[1])
    body = outline(body, INK)
    cv = paste(cv, body, 0, 0)
    # cord + violet crystal toggle bead (3x5) hanging at the front
    bx, by = (34, yn + 4) if flap == 0 else (36, yn + 5) if flap == 1 else (40, yn + 3)
    for k in range(1, by - yn - 1): px(cv, bx - 1 + (k > 1 and flap > 0), yn + k, L[1])
    for dx, dy, c in ((0, -2, 'd6acff'), (-1, -1, 'b076ec'), (0, -1, 'd6acff'), (1, -1, '8a4ace'), (-1, 0, 'b076ec'), (0, 0, '8a4ace'), (1, 0, '603096'), (0, 1, '603096')):
        px(cv, bx + dx, by + dy, c)
    if glint: star4(cv, bx - 1, by - 2, glint, ink=INK)
    return cv
def shadow(cv, oy=0, fade=0.0):
    sh = blank(cv.shape[1], cv.shape[0])
    for y in range(52 + oy - 1, 52 + oy + 3):
        for x in range(16, 48):
            if ((x - 31.5) / 16) ** 2 + ((y - 52 - oy - 1) / 2.6) ** 2 <= 1 and (x + y) % 2 == 0: px(sh, x, y, INK)
    if fade: sh = bayer_fade(sh, fade)
    return paste(cv, sh, 0, 0)

def idle():
    fr = []
    for g in (0, 1, 2, 1):
        cv = blank(64, 64); cv = shadow(cv); cv = satchel(cv, glint=g); fr.append(cv)
    return fr, [1800, 80, 110, 80]
def pickup():
    fr = []; OY = 32
    plan = [(1, None, 0), (2, 0, 0), (2, 1, 0), (2, 2, 0), (2, 3, 0.25), (2, 4, 0.5), (2, 5, 0.75), (None, 6, 1.0), (None, 7, 1.0)]
    for flap, s, fade in plan:
        cv = blank(64, 96)
        if flap is not None:
            b = blank(64, 96); b = shadow(b, OY); b = satchel(b, OY, flap=flap)
            if fade: b = bayer_fade(b, fade)
            cv = paste(cv, b, 0, 0)
        if s is not None:
            yy = [OY + 34, OY + 26, OY + 16, OY + 6, OY, OY - 4, OY - 6, OY - 8][s]
            size = [1, 2, 3, 3, 3, 2, 1, 0][s]
            star4(cv, 31, yy, size, ink=INK if size else None)
            if 3 <= s <= 6:
                for k in range(6):
                    a = k * math.pi / 3 + s * 0.3; rr = 5 + (s - 3) * 4
                    star4(cv, 31 + math.cos(a) * rr, yy + math.sin(a) * rr * 0.8, 1 if s < 5 else 0, ink=INK if s < 5 else None)
            if 1 <= s <= 3:
                for k in range(3):    # light motes rising from the mouth
                    px(cv, 27 + k * 4, OY + 34 - s * 5 - k * 2, 'd6acff')
        fr.append(cv)
    return fr, [70, 60, 60, 70, 90, 90, 90, 100, 80]
def hidden():
    fr = []
    for s in (0, 1, 2, 3, 2, 1, 0):
        cv = blank(16, 16); star4(cv, 8, 8, s, ink=INK if s >= 2 else None); fr.append(cv)
    fr.append(blank(16, 16))
    return fr, [60, 60, 80, 120, 80, 60, 60, 40]

def main():
    a = {}
    f, ms = idle(); a['idle'] = write_anim(P, 'satchel_idle', f, ms, anchor=dict(canvas_px=[0, 0], meaning='top-left of the item tile (64x64, prop sits bottom-centre)'), loop=True,
        emissive=[emask(x) for x in f], kind='prop_loop',
        notes='Supply satchel prop (visible item, solid). Soft drawstring bag; the crystal toggle bead glints every ~2 s. Emissive mask = bead + glint only; the cloth uses the sprite grade.')
    f, ms = pickup(); a['pickup'] = write_anim(P, 'pickup_open', f, ms, anchor=dict(canvas_px=[0, 32], meaning='canvas (0,32) = top-left of the item tile; 32 px headroom above'),
        emissive=[emask(x) for x in f],
        notes='Player faces + A: the cord loosens, the neck opens, a light rises and pops into a ring of sparkles, the satchel dithers away (Bayer, no poof/smoke). Show the "found X" text on frame 4; remove the solid prop collision on frame 7.')
    f, ms = hidden(); a['hidden'] = write_anim(P, 'hidden_sparkle', f, ms, anchor=dict(canvas_px=[8, 8], meaning='centre; draw at tile px (32,40) + jitter'),
        notes='Hidden-item hint. Plays once every ~6 s while the player is within 2 tiles (Chebyshev). Facing + A picks it up; then play pickup_open frames 1-8 without the satchel (code: skip the satchel layer).')
    hooks = dict(
        hidden_hint=dict(period_ms=6000, period_jitter_ms=[-800, 800], radius_tiles=2, distance='chebyshev', offset_jitter_px=[-4, 4], at_tile_px=[32, 40], stop_when='picked up or player > 2 tiles'),
        pickup=dict(text_frame=4, collision_off_frame=7, sfx_frame=2, hidden_variant='pickup_open with no satchel: code draws only the light/sparkle pixels (they are the emissive-mask pixels of frames 1-8)'),
        layering='satchel_idle draws as a y-sorted prop (feet = tile bottom); pickup_open uses the same sort key; hidden_sparkle above ground, below the player',
        ownership='The supply bag is a map PROP and World Design may own the final prop art. This soft-bag draft is the Animator reference; if World Design paints the prop, point satchel_idle at their tile and keep pickup_open (the light/sparkle pixels still work over it).',
        reduced_motion='satchel glint off; pickup_open frames 0,3,7; hidden sparkle keeps playing (it is the hint) but at size 2 max')
    grass = ow_bg(['grass_0'], 1, 2); path = ow_bg(['path_0'], 1, 2)
    two = np.concatenate([grass[64:], path[64:]], 1)
    seq = []
    for i, f in enumerate(a['idle']['_frames']): seq.append(np.concatenate([comp(grass[64:], f, 0, 0), comp(path[64:], f, 0, 0)], 1))
    sms = list(a['idle']['ms_per_frame'])
    for i, f in enumerate(a['pickup']['_frames']): seq.append(np.concatenate([comp(grass, f, 0, 32)[32:], comp(path, f, 0, 32)[32:]], 1))
    sms += a['pickup']['ms_per_frame']
    preview_gif(P, 'satchel_idle_then_pickup', [np.pad(s, ((0, 96 - s.shape[0]), (0, 0), (0, 0))) if s.shape[0] < 96 else s for s in [np.concatenate([np.zeros((32, 128, 4), 'uint8') + np.array([42, 38, 56, 255], 'uint8'), x], 0) if x.shape[0] == 64 else np.concatenate([np.zeros((32, 128, 4), 'uint8') + np.array([42, 38, 56, 255], 'uint8'), x[:64]], 0) for x in seq]], sms)
    hseq = [comp(comp(grass[64:], f, 24, 32), f, 24, 32) for f in a['hidden']['_frames']] + [grass[64:]]
    preview_gif(P, 'hidden_sparkle_on_grass', hseq, a['hidden']['ms_per_frame'] + [1200])
    rows = [[comp(grass[64:], f, 0, 0) for f in a['idle']['_frames']], [comp(grass, f, 0, 0) for f in a['pickup']['_frames']], [comp(path[64:80, :16], f, 0, 0) for f in a['hidden']['_frames']]]
    preview_png(P, 'item_pickup_contact', contact(rows))
    tod = {}
    tod['idle_grass'] = tod_check(P, 'satchel_idle', two, [(a['idle'], 0, 0), (a['idle'], 64, 0)])
    tod['pickup'] = tod_check(P, 'pickup_open', np.concatenate([grass[:96], path[:96]], 1), [(a['pickup'], 0, 0), (a['pickup'], 64, 0)])
    small = np.concatenate([grass[32:48, 24:40], path[32:48, 24:40], ow_bg(['sand_0'], 1, 1)[32:48, 24:40], ow_bg(['cave_0'], 1, 1)[32:48, 24:40]], 1)
    tod['hidden'] = tod_check(P, 'hidden_sparkle', small, [(a['hidden'], 16 * k, 0) for k in range(4)])
    about = 'Overworld item pickup FX (MECHANICS_PARITY F18): supply satchel prop, pickup open, hidden-item sparkle. Original soft drawstring supply bag with a violet crystal toggle bead (no ball/orb motif, no case/briefcase shape).'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
