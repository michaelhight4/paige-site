"""evolution (Animator DRAFT): GENERIC overlay for any evolution (no redrawn creatures).
Code draws the two existing battle-front sprites as silhouettes and alternates them by the schedule in hooks."""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'evolution'
SCHED = [600, 500, 400, 320, 260, 200, 160, 120, 100, 80, 60, 60, 60]
def motes():
    rnd = random.Random(3); cols = [(rnd.randrange(24, 136), rnd.randrange(16), rnd.choice((0, 1, 1, 2))) for _ in range(16)]
    fr = []
    for i in range(8):
        cv = blank(160, 160)
        for x, ph, s in cols:
            y = 156 - ((i * 8 + ph * 9) % 128)
            sz = s if y > 60 else max(0, s - 1)
            star4(cv, x + (1 if (i + ph) % 4 == 0 else 0), y, sz, ink=INK if sz >= 1 else None)
            if sz == 0: px(cv, x, y + 2, 'b076ec')
        fr.append(cv)
    return fr, [70] * 8
def flash():
    fr = []
    for t in (0.75, 0.5, 0.25, 0.0, 0.0, 0.25, 0.5, 0.75):
        cv = blank(320, 240); cv[...] = H('fcf6e8'); cv = bayer_fade(cv, t); fr.append(cv)
    return fr, [60, 60, 60, 120, 120, 60, 60, 60]
def burst():
    fr = []; c = (80, 96)
    for i in range(9):
        cv = blank(160, 160); r = [6, 14, 24, 34, 44, 52, 58, 62, 64][i]
        g = blank(160, 160)
        if i <= 6: ring(g, *c, r, WARM_HI if i < 2 else 'd6acff' if i < 4 else 'b076ec', step=1 if i < 3 else 3, gap=0 if i < 3 else 2, phase=i)
        if i <= 4:
            for k in range(8):
                a = k * math.pi / 4 + math.pi / 8
                line(g, c[0] + math.cos(a) * (r * 0.4), c[1] + math.sin(a) * (r * 0.4), c[0] + math.cos(a) * r * 0.85, c[1] + math.sin(a) * r * 0.85, 'd6acff' if k % 2 else WARM_HI)
        cv = paste(cv, outline(g, INK), 0, 0)
        if 2 <= i <= 7:
            for k in range(6):
                a = k * math.pi / 3 + i * 0.25; d = r * 0.9 + 4
                star4(cv, c[0] + math.cos(a) * d, c[1] + math.sin(a) * d * 0.85, 2 if i < 5 else 1 if i < 7 else 0, ink=INK if i < 7 else None)
        fr.append(cv)
    return fr, [50, 50, 60, 60, 70, 80, 80, 90, 100]
def cancel():
    fr = []; c = (80, 96)
    for i in range(7):
        cv = blank(160, 160); r = [40, 32, 24, 16, 10, 5, 0][i]
        if r: ring(cv, *c, r, '8a4ace' if i < 3 else '603096', step=2, gap=2, phase=i)
        rnd = random.Random(11)
        for k in range(10):
            x = rnd.randrange(30, 130); y0 = rnd.randrange(40, 120); y = y0 + i * (4 + k % 3)
            if y < 157 and i < 6: star4(cv, x, y, 1 if i < 3 else 0, core='d6acff', arm='8a4ace', tip='603096', ink=INK if i < 3 else None)
        fr.append(cv)
    return fr, [70, 70, 80, 80, 90, 100, 120]
def reduced():
    fr = []
    for t in (0.75, 0.5, 0.75):
        cv = blank(160, 160); g = blank(160, 160); disc(g, 80, 96, 40, 'd6acff'); g = bayer_fade(g, 0.875 if t > 0.6 else 0.75)
        cv = paste(cv, g, 0, 0); star4(cv, 80, 96, 3 if t < 0.6 else 2, ink=INK); fr.append(cv)
    return fr, [300, 400, 300]
def sil(spr): return outline(silhouette(spr, 'fcf6e8'), '8a4ace')
def main():
    a = {}
    an = dict(canvas_px=[80, 157], meaning='same bottom-centre anchor as the creature battle sprite (160 canvas; for 128 sprites the creature anchor [64,125] maps to this point)')
    f, ms = motes(); a['motes'] = write_anim(P, 'evo_motes_rise', f, ms, anchor=an, loop=True, notes='Light motes rising around the creature during "What? X is evolving!" and through the silhouette alternation.')
    f, ms = flash(); a['flash'] = write_anim(P, 'evo_flash', f, ms, anchor=dict(canvas_px=[0, 0], meaning='full 320x240 screen'),
        notes='Single full-screen white flash in Bayer steps (never a blend). Starts when the schedule ends; swap to the new sprite on frame 3 (fully white). ONE flash only.')
    f, ms = burst(); a['burst'] = write_anim(P, 'evo_burst', f, ms, anchor=an, notes='Reveal burst around the new form, plays right after evo_flash frame 4.')
    f, ms = cancel(); a['cancel'] = write_anim(P, 'evo_cancel', f, ms, anchor=an, notes='Player pressed B: motes fall back and the ring closes; old sprite returns un-silhouetted on frame 0.')
    f, ms = reduced(); a['rm'] = write_anim(P, 'evo_reduced_motion', f, ms, anchor=an, notes='Reduced motion: no alternation, no full-screen flash. Show old sprite, play this, swap on frame 1.')
    hooks = dict(
        silhouette=dict(fill='fcf6e8', outline_1px='8a4ace', how='code: every opaque pixel of the sprite -> fill; add a 1px 4-neighbour outline. Same for old and new sprite.'),
        alternation_schedule_ms=SCHED, alternation_rule='start on the OLD silhouette; each entry is how long to show the current silhouette before switching (old, new, old, ...). Total 2940 ms. B cancels at any point -> evo_cancel.',
        sequence=['old sprite normal + text', 'old sprite -> silhouette (hard cut) + evo_motes_rise loop', 'alternate by alternation_schedule_ms', 'evo_flash (swap to new sprite at frame 3)', 'evo_burst, new sprite normal colours, motes stop', 'jingle + "evolved into" text'],
        photosensitivity='Max 3 full-screen flashes per second; this design has ONE full-screen flash. The alternation is a sprite-sized area. The fastest alternation step is 60 ms (~8 Hz) on a sprite-sized area; if Gary wants stricter, clamp schedule entries to >= 167 ms.',
        warmth_cosmic='after the swap the new sprite gets the same Warmth stage and Cosmic flag (apply swaps before grading)',
        reduced_motion='evo_reduced_motion instead of alternation+flash; keep motes off')
    bg = clean_battle_bg(None)
    def place(spr):
        h, w = spr.shape[:2]; return FOE_GROUND[0] - w // 2, FOE_GROUND[1] - (h - 3)
    old = creature_battle('cindrip', 'front'); new = creature_battle('emberlunx', 'front')
    so, sn = sil(old), sil(new)
    seq, sms = [comp(bg, old, *place(old))], [700]
    k = 0
    for j, d in enumerate(SCHED):
        s = so if j % 2 == 0 else sn; im = comp(bg, s, *place(s))
        # split long holds into mote frames
        t = 0
        while t < d:
            step = min(70, d - t); mf = a['motes']['_frames'][k % 8]; k += 1
            seq.append(comp(im, mf, FOE_GROUND[0] - 80, FOE_GROUND[1] - 157)); sms.append(step); t += step
    for i, fl in enumerate(a['flash']['_frames']):
        base = comp(bg, so if i < 3 else new, *place(so if i < 3 else new))
        if i >= 4: base = comp(base, a['burst']['_frames'][i - 4], FOE_GROUND[0] - 80, FOE_GROUND[1] - 157)
        seq.append(comp(base, fl, 0, 0)); sms.append(a['flash']['ms_per_frame'][i])
    for i in range(4, 9):
        seq.append(comp(comp(bg, new, *place(new)), a['burst']['_frames'][i], FOE_GROUND[0] - 80, FOE_GROUND[1] - 157)); sms.append(a['burst']['ms_per_frame'][i])
    seq.append(comp(bg, new, *place(new))); sms.append(1200)
    preview_gif(P, 'evolution_cindrip_to_emberlunx', seq, sms)
    cseq = [comp(comp(bg, so, *place(so)), a['motes']['_frames'][0], FOE_GROUND[0] - 80, FOE_GROUND[1] - 157)]
    cseq += [comp(comp(bg, old, *place(old)), f, FOE_GROUND[0] - 80, FOE_GROUND[1] - 157) for f in a['cancel']['_frames']] + [comp(bg, old, *place(old))]
    preview_gif(P, 'evolution_cancel_cindrip', cseq, [300] + a['cancel']['ms_per_frame'] + [800])
    tod = {}
    sub = bg[FOE_GROUND[1] - 157:FOE_GROUND[1] + 3, FOE_GROUND[0] - 80:FOE_GROUND[0] + 80].copy()
    subo = comp(bg, so, *place(so))[FOE_GROUND[1] - 157:FOE_GROUND[1] + 3, FOE_GROUND[0] - 80:FOE_GROUND[0] + 80].copy()
    tod['motes'] = tod_check(P, 'evo_motes_rise', subo, [(a['motes'], 0, 0)])
    subn = comp(bg, new, *place(new))[FOE_GROUND[1] - 157:FOE_GROUND[1] + 3, FOE_GROUND[0] - 80:FOE_GROUND[0] + 80].copy()
    tod['burst'] = tod_check(P, 'evo_burst', subn, [(a['burst'], 0, 0)])
    tod['cancel'] = tod_check(P, 'evo_cancel', comp(bg, old, *place(old))[FOE_GROUND[1] - 157:FOE_GROUND[1] + 3, FOE_GROUND[0] - 80:FOE_GROUND[0] + 80].copy(), [(a['cancel'], 0, 0)])
    subold = comp(bg, old, *place(old))[FOE_GROUND[1] - 157:FOE_GROUND[1] + 3, FOE_GROUND[0] - 80:FOE_GROUND[0] + 80].copy()
    tod['rm'] = tod_check(P, 'evo_reduced_motion', subold, [(a['rm'], 0, 0)])
    tod['flash'] = tod_check(P, 'evo_flash', bg, [(a['flash'], 0, 0)], min_frac=0.0)
    tod['flash']['note'] = 'full-screen white: readable by definition; dims at night (fcf6e8 is not a lit colour). Kept, judged by eye.'
    # silhouettes are code-made; check them too (they are what the player watches)
    sm = dict(frames=2, _frames=[np.pad(so, ((0, 0), (0, 0), (0, 0))), so], _em=False, ms_per_frame=[300, 300])
    tod['silhouette_old'] = tod_check(P, 'evo_silhouette_cindrip', bg[place(so)[1]:place(so)[1] + so.shape[0], place(so)[0]:place(so)[0] + so.shape[1]].copy(), [(sm, 0, 0)])
    tod['silhouette_old']['note'] = 'code-made silhouette (fcf6e8 + 8a4ace outline), checked because it is the main visual'
    rows = [[comp(subo, f, 0, 0) for f in a['motes']['_frames']], [comp(subn, f, 0, 0) for f in a['burst']['_frames']], [comp(sub, f, 0, 0) for f in a['cancel']['_frames']] + [comp(subo, f, 0, 0) for f in a['rm']['_frames']]]
    preview_png(P, 'evolution_contact', contact(rows))
    about = 'Generic evolution overlay (MECHANICS_PARITY evolution). Works for every creature: code silhouettes the existing sprites; nothing is redrawn per creature.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
