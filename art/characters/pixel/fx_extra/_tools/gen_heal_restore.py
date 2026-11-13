"""heal_restore (Animator DRAFT, IP redesign Oct 22 2026): ONE cradle ring opens around the machine eye, the whole
team's crystals float up into it TOGETHER, ONE scanner sweep passes over them, a single glow swell, a done ping, then
each creature's Warmth seeps back in ordered dither. No slot grid, no one-by-one placement.
Overlays only; machine tiles belong to World Design (read-only)."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'heal_restore'
EYE = (32, 51)                     # PREVIEW ONLY (retired tile); game anchor is i_crystal_polisher px (63,28) - crystal eye centre on heal_machine_0_0 (top tile of the 1x2 heal_machine)
CW, CH = 60, 76                    # overlay canvas
C = (30, 30)                       # cradle centre in the canvas (= EYE on screen)
R = 18                             # cradle ring radius
TRAY_Y = 70                        # crystals start here (counter / tray line, below the screen)
I_HEAL = dict(  # measured on interiors_new/tiles_1x/i_furniture.png index 169-172 (tiles 7280-7283), 2x2 = 128x128 px, by flood fill
    opaque_bbox=[8, 6, 119, 115], panel_bbox=[26, 14, 101, 35], panel_centre=[62.7, 27.6],
    lights_row_centres=[[37.5, 24.5], [49.5, 24.5], [61.5, 24.5], [73.5, 24.5], [85.5, 24.5], [97.7, 24.5]],
    oval_centres_2x3=[[31.5, 53.5], [69.5, 53.5], [107.3, 53.5], [31.5, 67.5], [69.5, 67.5], [107.3, 67.5]],
    top_screen_strip_bbox=[17, 7, 105, 12], light_bar_bbox=[9, 41, 113, 48])
PARTY = ['cindrip', 'rillop', 'bastonox', 'halovy', 'gloamtick', 'sailquill']
STAGE = {'cindrip': 3, 'rillop': 2, 'bastonox': 3, 'halovy': 1, 'gloamtick': 3, 'sailquill': 2}

def glyph_crystal(cv, cx, cy, hi, mid, lo):
    """5x7 faceted crystal, 1px INK outline."""
    pts = {(0, -3): hi, (-1, -2): hi, (0, -2): hi, (1, -2): mid, (-2, -1): hi, (-1, -1): hi, (0, -1): mid, (1, -1): mid, (2, -1): lo,
           (-2, 0): hi, (-1, 0): mid, (0, 0): mid, (1, 0): lo, (2, 0): lo, (-1, 1): mid, (0, 1): lo, (1, 1): lo, (0, 2): lo, (0, 3): lo}
    g = blank(cv.shape[1], cv.shape[0])
    for (dx, dy), c in pts.items(): px(g, int(round(cx)) + dx, int(round(cy)) + dy, c)
    return paste(cv, outline(g, INK), 0, 0)
def ring_slots(n):
    """crystal resting points on the cradle ring for a team of n (1..6): evenly spaced, first at the top."""
    return [(C[0] + R * math.cos(-math.pi / 2 + 2 * math.pi * k / n), C[1] + R * math.sin(-math.pi / 2 + 2 * math.pi * k / n)) for k in range(n)]
def tray_starts(n):
    return [(C[0] + (k - (n - 1) / 2) * 7, TRAY_Y) for k in range(n)]
def cradle(cv, bright=0):
    """the cradle: a double ring of light round the eye. bright 0 normal, 1 glow."""
    ring(cv, *C, R, 'd6acff' if not bright else 'f4e2ff')
    ring(cv, *C, R, 'f4e2ff' if not bright else WARM_HI, step=2, gap=4)
    return cv

def cradle_open():
    fr = []
    for r, c in ((4, 'f4e2ff'), (9, 'f4e2ff'), (14, 'd6acff')):
        cv = blank(CW, CH); ring(cv, *C, r, c); ring(cv, *C, r - 1, 'b076ec', step=1, gap=2); fr.append(cv)
    fr.append(cradle(blank(CW, CH)))
    return fr, [100, 100, 100, 167]
def floats(n):
    """all n crystals rise from the tray line together and settle on the ring (ease-out, 1px light trail)."""
    S, E = tray_starts(n), ring_slots(n); fr = []; T = [0, .25, .5, .7, .84, .93, .98, 1.0]
    for i, t in enumerate(T):
        cv = cradle(blank(CW, CH)); e = 1 - (1 - t) ** 2
        for (sx, sy), (ex, ey) in zip(S, E):
            x, y = sx + (ex - sx) * e, sy + (ey - sy) * e + (0 if t >= 1 else -1.5 * math.sin(t * math.pi))
            if 0 < t < 1:
                py = sy + (ey - sy) * (1 - (1 - max(0, t - .2)) ** 2)
                line(cv, int(round(x)), int(round(y)) + 4, int(round(sx + (ex - sx) * (1 - (1 - max(0, t - .2)) ** 2))), int(round(py)) + 4, 'd6acff')
            glyph_crystal(cv, x, y, 'f4e2ff', 'd6acff', 'b076ec') if t < 1 else glyph_crystal(cv, x, y, 'f4e2ff', 'd6acff', 'b076ec')
        fr.append(cv)
    return fr, [100] * 7 + [167]
def sweep():
    """ONE scanner bar passes top -> bottom over the cradle (overlay on top of the held floats_n last frame)."""
    fr = []
    for y in range(C[1] - R - 3, C[1] + R + 4, 4):
        cv = blank(CW, CH); hw = int(math.sqrt(max(0, (R + 3) ** 2 - (y - C[1]) ** 2)))
        for dy, c in ((-1, 'b076ec'), (0, 'f4e2ff'), (1, 'd6acff')):
            line(cv, C[0] - hw, y + dy, C[0] + hw, y + dy, c)
        px(cv, C[0] - hw - 1, y, '603096'); px(cv, C[0] + hw + 1, y, '603096')
        fr.append(cv)
    return fr, [100] * len(fr)
def glow(n):
    """single swell (no alternation): ring brightens, crystals go to their brightest, a soft halo ring, then back."""
    E = ring_slots(n); fr = []
    for lvl in (1, 2, 1):
        cv = cradle(blank(CW, CH), bright=1)
        if lvl == 2: ring(cv, *C, R + 4, 'd6acff', step=1, gap=1); ring(cv, *C, R + 3, '8a4ace', step=1, gap=1, phase=1)
        for x, y in E: glyph_crystal(cv, x, y, WARM_HI if lvl == 2 else 'f4e2ff', 'f4e2ff' if lvl == 2 else 'd6acff', 'd6acff' if lvl == 2 else 'b076ec')
        fr.append(cv)
    return fr, [167, 500, 333]
def done_ping():
    fr = []
    for i in range(6):
        cv = blank(CW, CH); r = [R + 2, R + 4, R + 6, R + 8, R + 10, R + 11][i]
        ring(cv, *C, r, ['f4e2ff', 'd6acff', 'd6acff', 'b076ec', '8a4ace', '603096'][i], step=2 if i > 2 else 1, gap=0 if i <= 2 else 1, phase=i)
        fr.append(cv)
    return fr, [83, 83, 100, 100, 117, 133]

def main():
    a = {}; an = dict(canvas_px=list(C), meaning='cradle centre: put it on the console cradle (i_crystal_polisher / i_heal_machine 2x2 px [63, 28])')
    f, ms = cradle_open(); a['open'] = write_anim(P, 'heal_cradle_open', f, ms, anchor=an, notes='The cradle ring opens round the machine eye. Hold the last frame (it is also the ring in every heal_float_N frame).')
    for n in range(1, 7):
        f, ms = floats(n); a[f'float_{n}'] = write_anim(P, f'heal_float_{n}', f, ms, anchor=an,
            notes=f'Team of {n}: all {n} crystals rise from the tray line TOGETHER and settle on the cradle ring. Hold the last frame through the sweep and glow; play it backwards to send the crystals home.')
    f, ms = sweep(); a['sweep'] = write_anim(P, 'heal_scanner_sweep', f, ms, anchor=an, notes='ONE scanner pass, top to bottom, drawn over the held heal_float_N last frame. Never repeat it.')
    for n in range(1, 7):
        f, ms = glow(n); a[f'glow_{n}'] = write_anim(P, f'heal_glow_{n}', f, ms, anchor=an, notes=f'Team of {n}: single glow swell (167/500/333 ms), replaces the heal_float_{n} frame while it plays. No on/off alternation.')
    f, ms = done_ping(); a['ping'] = write_anim(P, 'heal_done_ping', f, ms, anchor=an, notes='Done ping: one ring spreads out from the cradle. Cue the done jingle on frame 0.')
    seep = np.array(BAYER, 'uint8'); Image.fromarray((seep * 16).astype('uint8'), 'L').save(f'{FXX}/{P}/bayer4_seep.png')
    hooks = dict(
        sequence=[
            'healer (in-world role: Care Associate, NPC id `healer`) line ends -> heal_cradle_open at the eye (cradle SFX on frame 0)',
            'heal_float_<N> (N = team size 1..6): all crystals rise together, ONE float SFX on frame 0 (never one per crystal)',
            'heal_scanner_sweep once over the held heal_float_<N> last frame (scan SFX on frame 0)',
            'heal_glow_<N> + party_crystal_glow (1000 ms, single swell)',
            'heal_done_ping (done jingle on frame 0), then heal_float_<N> played backwards (crystals home), then party_seep_back over 2000 ms'],
        cradle_centre=dict(heal_machine_0_0_px=list(EYE), canvas_px=list(C), ring_radius_px=R,
                           i_heal_machine_2x2_px=[63, 28], i_heal_machine_note='proposed: on the panel centre (measured panel bbox ' + str(I_HEAL['panel_bbox']) + '); the 128 px canvas is 2x2 tiles 7280-7283'),
        crystal_rest_points=dict((str(n), [[round(x, 1), round(y, 1)] for x, y in ring_slots(n)]) for n in range(1, 7)),
        crystal_tray_starts=dict((str(n), [[round(x, 1), y] for x, y in tray_starts(n)]) for n in range(1, 7)),
        i_heal_machine_measured=I_HEAL,
        world_design_note='Both machine arts (heal_machine_1_0 and i_heal_machine) still paint 6 round slots in a 2x3 grid (and i_heal_machine a row of 6 lights). That is the motif the IP check flagged. The overlay ignores them; World Design may want to repaint the slots as a plain counter/tray. World Design owns the final machine art.',
        party_crystal_glow=dict(
            what='every party creature sprite/icon: crystal-mask pixels only (warmth/masks/<creature>/<same rel path>)',
            schedule_ms=[167, 500, 333], pattern=['company', 'bright', 'company'],
            company='draw the crystal pixels with Warmth stage 0 colours (the unswapped source ramp 3a1e60..f4e2ff)',
            bright="fill crystal pixels with 'd6acff' (pixels that are 'f4e2ff' in the source stay 'f4e2ff')",
            meaning='the company machine briefly re-asserts control: the light snaps back to company violet'),
        party_seep_back=dict(
            what='crystal pixels go from stage 0 back to the creature\'s CURRENT Warmth stage, ordered-dither, never a colour blend',
            steps=8, step_ms=250, total_ms=2000, table=rel(f'{FXX}/{P}/bayer4_seep.png') + ' (4x4, value/16 = Bayer level 0..15)',
            rule='at step s (1..8) a crystal pixel at sprite-local (x,y) shows the warm colour if BAYER[y%4][x%4] < 2*s, else stage 0. Key the pattern to sprite-local coordinates so it does not crawl when the sprite moves.',
            stage0_creatures='stage 0 creatures: skip the seep (nothing to return to)'),
        audio=dict(sfx=['cradle open (soft)', 'float (one cue for the whole team)', 'scan (one pass)', 'done jingle'],
                   jingle_rule='The done jingle must be ORIGINAL: write it from the Home motif with its own rhythm and contour. Audio must check it by ear against well-known heal tunes from other creature games before it ships.'),
        interiors='heal centres are interiors: they stay on the DAY grade (club_int is the only interior on the clock). ToD strips grade them as outdoors anyway, as a worst case.',
        reduced_motion='skip heal_float_<N> motion: show its last frame directly; skip the sweep; glow as one 1000 ms bright hold; seep back in 4 steps of 500 ms',
        photosensitivity='no alternation anywhere; every lit state holds >= 167 ms; the glow is small (cradle + crystal pixels), not full-screen')
    # ---- previews: room + party strip
    room = ow_bg(['floor_tile_heal', 'heal_machine_0_0', 'floor_tile_heal', 'floor_tile_heal', 'heal_machine_1_0', 'floor_tile_heal'], 3, 2, under='floor_tile_heal')
    OX, OY = 64 + EYE[0] - C[0], EYE[1] - C[1]
    icons, masks = [], []
    for n in PARTY:
        ic = load(f'{PIX}/icons/{n}_icon_f0.png'); m = np.array(Image.open(f'{PIX}/warmth/masks/{n}/icons/{n}_icon_f0.png').convert('L')) > 0
        icons.append(ic); masks.append(m)
    def party(state, step=0):
        strip = blank(6 * 34, 34); strip[..., 3] = 255; strip[..., :3] = (42, 38, 56)
        for j, (n, ic, m) in enumerate(zip(PARTY, icons, masks)):
            warm = warmth_swap(ic, n, STAGE[n], m)
            if state == 'warm': s = warm
            elif state == 'company': s = ic
            elif state == 'bright':
                s = ic.copy(); k = keys(ic); mm = m & (ic[..., 3] > 0) & (k != int('f4e2ff', 16)); s[mm] = H('d6acff')
            else:
                th = np.tile(BAYER, (9, 9))[:32, :32]; use = th < 2 * step; s = ic.copy(); s[use] = warm[use]
            strip = comp(strip, s, j * 34 + 1, 1)
        return strip
    def frame(layers, pstate, step=0):
        im = room.copy()
        for L in layers: im = comp(im, L, OX, OY)
        out = blank(192, 164); out[..., 3] = 255; out[..., :3] = (42, 38, 56); out[:128] = im; out[130:164, :] = party(pstate, step)[:, :192]
        return out
    N = 6; seq, sms = [frame([], 'warm')], [400]
    for f, ms in zip(a['open']['_frames'], a['open']['ms_per_frame']): seq.append(frame([f], 'warm')); sms.append(ms)
    fl = a[f'float_{N}']
    for f, ms in zip(fl['_frames'], fl['ms_per_frame']): seq.append(frame([f], 'warm')); sms.append(ms)
    for f, ms in zip(a['sweep']['_frames'], a['sweep']['ms_per_frame']): seq.append(frame([fl['_frames'][-1], f], 'warm')); sms.append(ms)
    for f, ms, st in zip(a[f'glow_{N}']['_frames'], a[f'glow_{N}']['ms_per_frame'], ['company', 'bright', 'company']): seq.append(frame([f], st)); sms.append(ms)
    for f, ms in zip(a['ping']['_frames'], a['ping']['ms_per_frame']): seq.append(frame([fl['_frames'][-1], f], 'company')); sms.append(ms)
    for f in fl['_frames'][::-1]: seq.append(frame([f], 'company')); sms.append(100)
    seq.append(frame([], 'company')); sms.append(200)
    for s in range(1, 9): seq.append(frame([], 'seep', s)); sms.append(250)
    seq.append(frame([], 'warm')); sms.append(800)
    preview_gif(P, 'heal_full_sequence', seq, sms)
    keys_ = [seq[k] for k in (2, 6, 9, 12, 14 + 3, 14 + 9, 25, 27)]
    preview_png(P, 'heal_keyframes', contact([keys_[:4], keys_[4:]]))
    rows = [[frame([a[f'float_{n}']['_frames'][-1]], 'warm')[:100, 48:144] for n in range(1, 7)]]
    preview_png(P, 'heal_team_sizes_1to6', contact(rows))
    rows = [[party('warm')], [party('bright')], [party('company')], [party('seep', 2)], [party('seep', 4)], [party('seep', 6)], [party('warm')]]
    preview_png(P, 'heal_party_glow_seep_steps', contact(rows))
    # ToD (crop = overlay canvas footprint on the room)
    bg = room[OY:OY + CH, OX:OX + CW].copy(); tod = {}
    tod['open'] = tod_check(P, 'heal_cradle_open', bg.copy(), [(a['open'], 0, 0)])
    tod['float_6'] = tod_check(P, 'heal_float_6', bg.copy(), [(a['float_6'], 0, 0)])
    tod['float_1'] = tod_check(P, 'heal_float_1', bg.copy(), [(a['float_1'], 0, 0)])
    held = comp(bg.copy(), a['float_6']['_frames'][-1], 0, 0)
    tod['sweep'] = tod_check(P, 'heal_scanner_sweep', held, [(a['sweep'], 0, 0)])
    tod['glow_6'] = tod_check(P, 'heal_glow_6', bg.copy(), [(a['glow_6'], 0, 0)])
    tod['ping'] = tod_check(P, 'heal_done_ping', bg.copy(), [(a['ping'], 0, 0)])
    about = 'Heal-centre restore FX (SOUL_PLAYBOOK heal beat, Kilumen style): one cradle ring round the machine eye, the whole team\'s crystals float in together, one scanner sweep, a single company-violet glow, a done ping, then each creature\'s Warmth seeps back in ordered dither.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
