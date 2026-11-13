"""cosmic_shimmer (Animator DRAFT): VFX that cosmic/cosmic_swaps.json leaves to the Animator:
starfield shimmer (clipped to the creature), encounter aura, 4 s party-icon twinkle, summary sparkle.
Cool 4-point stars (ice blue), deliberately unlike the Enraged red shard spark."""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'cosmic_shimmer'
CORE, ARM, TIP = 'c6ecfa', '7ac2e8', '4692ce'
def cstar(cv, x, y, s, ink=None): star4(cv, x, y, s, core=CORE if s < 3 else 'fcf6e8', arm=ARM, tip=TIP, ink=ink)
def starfield():
    rnd = random.Random(7); stars = [(rnd.randrange(32), rnd.randrange(32), rnd.randrange(8)) for _ in range(7)]
    LIFE = [0, 1, 2, 1, 0, None, None, None]
    fr = []
    for i in range(8):
        cv = blank(32, 32)
        for x, y, ph in stars:
            s = LIFE[(i + ph) % 8]
            if s is None: continue
            for ox in (-32, 0, 32):          # wrap so the tile is seamless
                for oy in (-32, 0, 32):
                    g = blank(32, 32); cstar(g, x + ox, y + oy, s); m = g[..., 3] > 0; cv[m] = g[m]
        fr.append(cv)
    return fr, [90] * 8
def aura():
    fr = []; c = (80, 96)
    for i in range(14):
        cv = blank(160, 160); t = i / 13
        for k in range(10):
            a = k * 2 * math.pi / 10 + t * 3.2; rr = 70 - 30 * t + (k % 2) * 6
            x = c[0] + math.cos(a) * rr; y = c[1] + math.sin(a) * rr * 0.7 - t * 20
            s = 2 if (k + i) % 3 == 0 else 1
            if i >= 11: s = max(0, s - (i - 10))
            cstar(cv, x, y, s, ink=INK if s >= 1 else None)
        if 6 <= i <= 9: cstar(cv, c[0] + 26, c[1] - 52, [2, 3, 3, 2][i - 6], ink=INK)
        fr.append(cv)
    return fr, [60] * 13 + [100]
def icon_twinkle():
    fr = []
    for s in (0, 1, 2, 3, 2, 1, 0):
        cv = blank(32, 32); cstar(cv, 26, 5, s, ink=INK if s >= 2 else None); fr.append(cv)
    fr.append(blank(32, 32))
    return fr, [60, 60, 70, 110, 70, 60, 60, 40]
def summary():
    fr = []
    for i in range(8):
        cv = blank(24, 24); cstar(cv, 12, 12, 3 if i % 4 == 0 else 2, ink=INK)
        a = i * math.pi / 4; px(cv, 12 + math.cos(a) * 9, 12 + math.sin(a) * 9, CORE); px(cv, 12 + math.cos(a + math.pi) * 9, 12 + math.sin(a + math.pi) * 9, ARM)
        fr.append(cv)
    return fr, [110] * 8
def main():
    a = {}
    f, ms = starfield(); a['field'] = write_anim(P, 'cosmic_starfield_tile', f, ms, anchor=dict(canvas_px=[0, 0], meaning='seamless 32x32 tile; tile from the sprite top-left'), loop=True,
        notes='Shimmer layer for a Cosmic creature: tile it over the sprite and keep a pixel only where the sprite is opaque AND outside the crystal mask (warmth/masks/...). Play for the encounter intro (~1.4 s) and loop on the summary screen.')
    f, ms = aura(); a['aura'] = write_anim(P, 'cosmic_encounter_aura', f, ms, anchor=dict(canvas_px=[80, 157], meaning='same anchor as a 160x160 battle sprite (bottom-centre); for 128 sprites use [64,125] offset by (16,32)'),
        notes='Encounter entry: 10 cool stars spiral in and up around the creature, one big glint top-right on frames 6-9. Play once with the 3-note chime (notes on frames 0, 4, 8).')
    f, ms = icon_twinkle(); a['icon'] = write_anim(P, 'cosmic_icon_twinkle', f, ms, anchor=dict(canvas_px=[0, 0], meaning='same top-left as the 32x32 party icon'),
        notes='Party-icon marker: plays once every 4000 ms (top-right corner, never on the crystal).')
    f, ms = summary(); a['summary'] = write_anim(P, 'cosmic_summary_sparkle', f, ms, anchor=dict(canvas_px=[12, 12], meaning='centre; put beside the name on summary'), loop=True,
        notes='Summary/box badge: steady loop, also a colour-blind-safe shape marker for Cosmic.')
    hooks = dict(order='cosmic swap -> Warmth swap -> ToD grade -> shimmer layers on top (shimmer is emissive: lit grade)',
                 clip='starfield pixel drawn only if sprite alpha > 0 AND crystal mask == 0 (crystals are never touched by Cosmic)',
                 encounter=['cosmic_encounter_aura + starfield clipped to the foe, together, after the foe slides in', 'chime notes on aura frames 0/4/8', 'then starfield stops (or keep at 1 frame per 400 ms if Gary wants a subtle idle)'],
                 icon_twinkle_period_ms=4000, distinct_from='Enraged uses red/ember shards; Cosmic uses cool ice-blue 4-point stars (c6ecfa/7ac2e8/4692ce)',
                 reduced_motion='no aura spiral: show aura frame 8 for 400 ms; starfield single static frame; icon twinkle stays (it is a marker)')
    bg = clean_battle_bg(None); cs = json.load(open(PIX + '/cosmic/cosmic_swaps.json'))['swaps']
    n = 'tumbloam' if 'tumbloam' in cs else sorted(cs)[0]
    spr_p = creature_battle_path(n, 'front'); spr = load(spr_p); m = crystal_mask(n, spr_p)
    cos = recolor(spr, {k.lstrip('#'): v.lstrip('#') for k, v in cs[n].items()}, ~m)
    h, w = spr.shape[:2]; x0, y0 = FOE_GROUND[0] - w // 2, FOE_GROUND[1] - (h - 3)
    seq = []
    for i, af in enumerate(a['aura']['_frames']):
        ff = a['field']['_frames'][i % 8]; tl = np.tile(ff, (h // 32 + 1, w // 32 + 1, 1))[:h, :w].copy()
        keep = (cos[..., 3] > 0) & ~m; tl[~keep] = 0
        im = comp(bg, cos, x0, y0); im = comp(im, tl, x0, y0); im = comp(im, af, FOE_GROUND[0] - 80, FOE_GROUND[1] - 157)
        seq.append(im)
    seq += [comp(bg, cos, x0, y0)] * 2
    preview_gif(P, f'cosmic_encounter_{n}', seq, a['aura']['ms_per_frame'] + [400, 400])
    ic = load(f'{PIX}/icons/{n}_icon_f0.png'); im_ = np.array(Image.open(f'{PIX}/warmth/masks/{n}/icons/{n}_icon_f0.png').convert('L')) > 0
    icc = recolor(ic, {k.lstrip('#'): v.lstrip('#') for k, v in cs[n].items()}, ~im_)
    pane = blank(32, 32); pane[...] = (42, 38, 56, 255)
    iseq = [comp(comp(pane, icc, 0, 0), f, 0, 0) for f in a['icon']['_frames']] + [comp(pane, icc, 0, 0)]
    preview_gif(P, f'cosmic_icon_{n}', iseq, a['icon']['ms_per_frame'] + [3600])
    tod = {}
    sub = comp(bg, cos, x0, y0)
    tod['aura'] = tod_check(P, 'cosmic_encounter_aura', sub[FOE_GROUND[1] - 157:FOE_GROUND[1] + 3, FOE_GROUND[0] - 80:FOE_GROUND[0] + 80].copy(), [(a['aura'], 0, 0)])
    tod['field'] = tod_check(P, 'cosmic_starfield_tile', sub[y0 + h // 2 - 16:y0 + h // 2 + 16, x0 + w // 2 - 16:x0 + w // 2 + 16].copy(), [(a['field'], 0, 0)])
    pb = np.concatenate([comp(pane, icc, 0, 0), comp(ow_bg(['floor_tile'], 1, 1)[:32, :32], icc, 0, 0)], 1)
    tod['icon'] = tod_check(P, 'cosmic_icon_twinkle', pb, [(a['icon'], 0, 0), (a['icon'], 32, 0)])
    sb = np.concatenate([pane[:24, :24], bg[20:44, 0:24], bg[180:204, 0:24]], 1)
    tod['summary'] = tod_check(P, 'cosmic_summary_sparkle', sb, [(a['summary'], 0, 0), (a['summary'], 24, 0), (a['summary'], 48, 0)])
    rows = [[comp(sub[y0 + 40:y0 + 72, x0 + 40:x0 + 72].copy(), f, 0, 0) for f in a['field']['_frames']], [comp(pane, f, 0, 0) for f in a['icon']['_frames']], [comp(pane[:24, :24], f, 0, 0) for f in a['summary']['_frames']]]
    preview_png(P, 'cosmic_shimmer_contact', contact(rows))
    about = f'Cosmic variant VFX (cosmic_swaps.json "vfx" hand-off). Preview creature: {n} with its Cosmic swap.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
