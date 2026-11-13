"""#15 Lap Nap (playbook E10): heal_centre_int sofa (1,7); stand at (1,8) facing up, idle 30 s after healing ->
the player sits and the Trail Buddy falls asleep in their lap. The healer: "Don't move. Those are the rules." (text, not art).
Seated body = run_bike seated_upper part (hip anchor) lowered onto the seat + the bottom 10 rows of the walk-stand legs
(thighs foreshortened toward the camera). The buddy curls up facing the player (back view) so no per-creature eye edit is
needed; slow 1-row breathing + the zZz emote."""
import sys, os, json, math
import numpy as np
from soul_lib import *
from gen_trail_buddy import place_h, place_c, walk_path, em_over

ITEM = 'lap_nap'
P = f'{SOUL}/{ITEM}/previews'
SOFA = (1, 7); STAND = (1, 8)
LEG_ROWS = 10        # visible shin+shoe rows under the coat when seated
FOOT_ROW = 93        # walk-stand foot row (MOVEMENT: foot point (32,93))
LAP = (32, 92)       # lap point in the seated 64x96 frame (creature foot (32,61) goes here)

def seated(name, breath=0):
    """64x96 seated-on-sofa frame, facing down. Place like any human frame at the sofa tile (1,7)."""
    st = human(name, 'down', 'stand'); up_ = seated_upper(name, 'down')
    hem = bbox(up_)[3]
    out = blank(64, 96)
    y0 = FOOT_ROW - LEG_ROWS + 1
    out[y0:FOOT_ROW + 1] = st[y0:FOOT_ROW + 1]          # shins + shoes
    dy = (y0 + 1) - hem + breath                      # coat hem overlaps the top shin row by 1-2 px
    paste(out, shift(up_, 0, 0), 0, dy)
    return out, dy
def hip_y(name): return 65 + seated(name)[1]

def sit_down(name):
    """from STAND (1,8) facing up: turn, back up onto the sofa, drop. Frames are drawn at the SOFA tile (1,7)."""
    s, _ = seated(name)
    st = human(name, 'down', 'stand')
    fr = [shift(human(name, 'up', 'stand'), 0, 64), shift(st, 0, 64), shift(st, 0, 44), shift(st, 0, 26), shift(st, 0, 14)]
    # frames that extend past 96 rows are clipped by shift: keep it in a taller canvas instead
    return fr, s
def sit_frames(name):
    """64x160 canvas (sofa tile row 7 top at y=32 -> frame bottom = bottom of row 8). Anchor: canvas (32,157) = foot point at STAND."""
    st = human(name, 'down', 'stand'); s0, _ = seated(name); s1, _ = seated(name, 1)
    def at(img, top):
        c = blank(64, 160); paste(c, img, 0, top); return c
    seq = [(human(name, 'up', 'stand'), 64, 120), (st, 64, 140), (st, 60, 60), (st, 46, 60), (st, 30, 60), (s1, 0, 80), (s0, 0, 200)]
    return [at(i, t) for i, t, _ in seq], [m for *_, m in seq]
def stand_frames(name):
    f, m = sit_frames(name); f = f[::-1]; m = [60, 60, 60, 60, 80, 120, 100]
    return f[:-1] + [f[-1]], m

# ---- buddy ----
def big(c): return creature(c, 'up').shape[0] > 64
SMALL = [c for c in CREATURES if not big(c)]
BIG = [c for c in CREATURES if big(c)]
def curl(c, dh):
    a = creature(c, 'up', 'stand'); return vscale(a, dh)
def squash_amt(c):
    b = bbox(creature(c, 'up')); h = b[3] - b[1] + 1
    return max(6, int(round(h * 0.32)))
def settle(c):
    """lands in the lap (already facing the player), turns once (left/right wiggle) and curls down."""
    k = squash_amt(c); a = creature(c, 'up', 'stand')
    fr = [vscale(a, 3), a, shift(a, -1, 0), shift(a, 1, 0), vscale(a, k // 3), vscale(a, 2 * k // 3), vscale(a, k)]
    return fr, [70, 90, 120, 120, 160, 200, 400]
def sleep(c):
    k = squash_amt(c); return [curl(c, k), curl(c, k - 1)], [1100, 1100]
def wake(c):
    k = squash_amt(c); a = creature(c, 'up', 'stand')
    return [curl(c, k), curl(c, k // 2), vscale(a, -2), vscale(a, -1), a], [200, 120, 220, 100, 160]

def zzz_pos(spr):
    b = bbox(spr); return b[2] - 6, b[1] - 1     # emote bottom-left-ish: top-right of the curled buddy, clear of the face

HOP = [(-6, 70), (-14, 60), (-18, 60), (-14, 60), (-4, 60), (0, 80)]   # (extra lift px, ms) per hop frame

def emit():
    for name in ('cal', 'mira'):
        s0, dy = seated(name); s1, _ = seated(name, 1)
        write_anim(ITEM, f'{name}_sofa_seated', [s0, s0, s1], [1400, 1200, 1300], 'human', [32, 93], True,
                   f'Seated idle (1-row breathing). Draw at the sofa tile (1,7) like any 64x96 human frame. hip ({32},{65 + dy}); lap point {list(LAP)}.', sub=name)
        f, m = sit_frames(name)
        write_anim(ITEM, f'{name}_sofa_sit_down', f, m, 'overlay', [32, 157], False,
                   '64x160 canvas: bottom = bottom of row 8. Anchor (32,157) = foot point on STAND (1,8); canvas top-left = (1*64, 7*64-32).', sub=name)
        f, m = stand_frames(name)
        write_anim(ITEM, f'{name}_sofa_stand_up', f, m, 'overlay', [32, 157], False, 'Reverse of sit_down; ends facing down on (1,8).', sub=name)
    for c in SMALL:
        f, m = settle(c); write_anim(ITEM, f'{c}_lap_settle', f, m, 'creature', [32, 61], False, 'After the hop: foot (32,61) on the lap point.', sub='buddies/' + c)
        f, m = sleep(c); write_anim(ITEM, f'{c}_lap_sleep', f, m, 'creature', [32, 61], True, 'Loop + emote_zzz at zzz_anchor.', sub='buddies/' + c)
        f, m = wake(c); write_anim(ITEM, f'{c}_lap_wake', f, m, 'creature', [32, 61], False, 'Stretch, then hop down (reverse HOP).', sub='buddies/' + c)
    for c in BIG:
        a = creature(c, 'up'); k = squash_amt(c)
        write_anim(ITEM, f'{c}_feet_sleep', [vscale(a, k), vscale(a, k - 1)], [1300, 1300], 'creature', [48, 93], True,
                   'Too big for a lap: curls on the floor at (2,8), against the player\'s shins (frame placed like a 96x96 overworld frame).', sub='buddies/' + c)

def lap_xy(name):
    """map-pixel position of the lap point (creature frame top-left = this - (32,61))."""
    return SOFA[0] * 64 + LAP[0], (SOFA[1] + 1) * 64 - 96 + LAP[1]

SPECS = {
 'trigger': {'map': 'heal_centre_int', 'interact_spot': 'sofa (1,7)', 'player_tile': [1, 8], 'facing': 'up',
             'condition': 'player idle (no input) 30 000 ms on (1,8) facing up, after a heal this visit; Trail Buddy out (not in ball); once per in-game day gives +2 Warmth (flag), the scene itself can replay',
             'cancel': 'any input during the 30 s resets the timer'},
 'sequence': [
   '1. player: <name>_sofa_sit_down (7 fr, 64x160 canvas, anchor (32,157) on the (1,8) foot point). Lock input.',
   '2. buddy walks to (1,8) (normal follow step, facing up), then hops into the lap: use its up walk1 frame, tween its foot from (96, 8*64+61) to the lap point over 6 frames; add the HOP lift (px up) per frame; land with a 1-frame vscale(3) squash (= settle frame 0).',
   '3. buddy: <c>_lap_settle (7 fr) then <c>_lap_sleep loop; after the first sleep frame show emote_zzz (spotted/emotes) loop at zzz_anchor, 600 ms per frame.',
   '4. player: <name>_sofa_seated loop (draw the buddy AFTER the player).',
   '5. after 2 s of sleep: healer line (text) "Don\'t move. Those are the rules." - healer at (6,3) faces left toward the sofa while it shows.',
   '6. any input: buddy <c>_lap_wake, hop down (HOP reversed) to (1,8)->(1,9) follow slot, then <name>_sofa_stand_up; unlock.'],
 'lap_point_px': {'cal': None, 'mira': None},
 'hop_lift': HOP,
 'zzz_anchor': 'emote bottom-centre at (bbox right-6+12, bbox top-1) of the current sleep frame, i.e. top-right of the curled buddy; see zzz_anchor_per_creature',
 'big_creatures': 'bastonox, forgeharrow, tidemarrow (96x96) do not fit a lap: walk to (2,8), face up, <c>_feet_sleep loop with emote_zzz; same text and Warmth',
 'draw_order': 'sofa (decoration) < player < buddy < emote',
 'reduced_motion': 'skip the hop tween (cut straight to settle frame 6) and the breathing loops (hold frame 0)',
 'music_sfx_note': 'not art: a soft purr/snore every 2 sleep cycles is suggested'}

def preview():
    os.makedirs(P, exist_ok=True)
    X0, Y0, X1, Y1 = 0, 2, 7, 9
    B = bg('heal_centre_int', X0, Y0, X1, Y1)
    def scene(name, c, out):
        seq, ms = [], []
        healer_d = ['down']
        def base():
            im = B.copy(); place_h(im, human('vil_healer_f', healer_d[0], 'stand'), 6 - X0, 3 - Y0); return im
        # walk in from (4,9) to (1,8) with the buddy following
        cpath = [(4, 9), (3, 9), (2, 9), (1, 9), (1, 8)]
        bpath = [(5, 9), (4, 9), (3, 9), (2, 9), (1, 9)]
        cal = walk_path(cpath); bud = walk_path(bpath)
        for (cx, cy, cd, ck), (bx, by, bd, bk) in zip(cal, bud):
            im = base()
            for _, k, s, x, y in sorted([(by, 'c', creature(c, bd, f'walk{bk}'), bx, by), (cy, 'h', human(name, cd, f'walk{ck}'), cx, cy)], key=lambda z: z[0]):
                (place_c if k == 'c' else place_h)(im, s, x - X0, y - Y0)
            seq.append(im); ms.append(62)
        # idle 30 s (compressed): facing up, dots emote pulses
        dots = emote('dots')
        for i in range(8):
            im = base(); place_c(im, creature(c, 'up', 'stand'), 1 - X0, 9 - Y0); h = human(name, 'up', 'stand'); place_h(im, h, 1 - X0, 8 - Y0)
            if i >= 3: em_over(im, dots[0 if i == 3 else 1 + i % 2], (1 - X0) * 64, (8 - Y0 + 1) * 64 - 96, h)
            seq.append(im); ms.append(300 if i < 7 else 500)
        # sit down
        f, m = sit_frames(name)
        for fr, mm in zip(f, m):
            im = base(); place_c(im, creature(c, 'up', 'stand'), 1 - X0, 9 - Y0); paste(im, fr, (1 - X0) * 64, (7 - Y0) * 64 - 32); seq.append(im); ms.append(mm)
        s0, _ = seated(name)
        lx, ly = lap_xy(name); sx, sy = (1 - X0) * 64, (7 - Y0 + 1) * 64 - 96
        # buddy steps to (1,8)
        for (bx, by, bd, bk) in walk_path([(1, 9), (1, 8)]):
            im = base(); place_h(im, s0, 1 - X0, 7 - Y0); place_c(im, creature(c, 'up', f'walk{bk}'), bx - X0, by - Y0); seq.append(im); ms.append(62)
        # hop
        fx0, fy0 = 1 * 64 + 32, 8 * 64 + 61
        for i, (lift, mm) in enumerate(HOP):
            t = (i + 1) / len(HOP); fx = fx0 + (lx - fx0) * t; fy = fy0 + (ly - fy0) * t - lift
            im = base(); place_h(im, s0, 1 - X0, 7 - Y0); paste(im, creature(c, 'up', 'walk1'), int(fx - 32 - X0 * 64), int(fy - 61 - Y0 * 64)); seq.append(im); ms.append(mm)
        bxp, byp = lx - 32 - X0 * 64, ly - 61 - Y0 * 64
        sf, sm = settle(c)
        for fr, mm in zip(sf, sm):
            im = base(); place_h(im, s0, 1 - X0, 7 - Y0); paste(im, fr, bxp, byp); seq.append(im); ms.append(mm)
        # sleep loop, zZz, healer turns + dots (her line)
        lf, lm = sleep(c); zz = emote('zzz'); st_frames, _ = seated(name), None
        s_loop = [seated(name)[0], seated(name)[0], seated(name, 1)[0]]
        for i in range(14):
            im = base()
            if i >= 6: healer_d[0] = 'left'
            if i >= 13: healer_d[0] = 'down'
            im = base()
            place_h(im, s_loop[(i // 2) % 3], 1 - X0, 7 - Y0)
            fr = lf[(i // 2) % 2]; paste(im, fr, bxp, byp)
            zx, zy = zzz_pos(fr); paste(im, zz[0 if i == 0 else 1 + (i // 2) % 2], bxp + zx, byp + zy - 23)
            if 7 <= i <= 12:
                hh = human('vil_healer_f', 'left', 'stand'); em_over(im, dots[0 if i == 7 else 1 + i % 2], (6 - X0) * 64, (3 - Y0 + 1) * 64 - 96, hh)
            seq.append(im); ms.append(550)
        save_preview(seq, out, ms)
        return seq[-1]
    last = scene('cal', 'rillop', f'{P}/lap_nap_cal_rillop_heal_centre_2x.gif')
    scene('mira', 'tumbloam', f'{P}/lap_nap_mira_tumbloam_heal_centre_2x.gif')
    # contact: every small buddy asleep in Cal's lap (crop around the sofa)
    s0, _ = seated('cal'); tiles = []
    for c in SMALL:
        im = bg('heal_centre_int', 0, 6, 3, 8); place_h(im, s0, 1, 1)
        lx, ly = lap_xy('cal'); fr = sleep(c)[0][0]; bx, by = lx - 32, ly - 61 - 6 * 64; paste(im, fr, bx, by)
        zx, zy = zzz_pos(fr); paste(im, emote('zzz')[1], bx + zx, by + zy - 23)
        tiles.append(im[0:192, 32:224])
    rows = [tiles[i:i + 5] for i in range(0, len(tiles), 5)]
    save_png(contact(rows), f'{P}/lap_nap_all_buddies_contact_2x.png', 2)
    # big ones at the feet
    tiles = []
    for c in BIG:
        im = bg('heal_centre_int', 0, 6, 3, 8); place_h(im, s0, 1, 1)
        a = creature(c, 'up'); k = squash_amt(c); paste(im, vscale(a, k), 2 * 64 + 32 - 48, 2 * 64 + 61 - 93 + 3)
        tiles.append(im)
    save_png(contact([tiles]), f'{P}/lap_nap_big_buddies_feet_contact_2x.png', 2)

def main():
    emit()
    SPECS['lap_point_px'] = {n: list(lap_xy(n)) for n in ('cal', 'mira')}
    SPECS['zzz_anchor_per_creature'] = {c: [zzz_pos(sleep(c)[0][0])[0] + 12, zzz_pos(sleep(c)[0][0])[1]] for c in SMALL}
    SPECS['seated_hip'] = {n: [32, hip_y(n)] for n in ('cal', 'mira')}
    os.makedirs(f'{SOUL}/{ITEM}', exist_ok=True)
    json.dump(SPECS, open(f'{SOUL}/{ITEM}/hook_specs.json', 'w'), indent=1)
    preview(); dump_meta(ITEM)

if __name__ == '__main__':
    main()
