"""warmth_stage_up (Animator DRAFT): ring + sparkle per Warmth ramp family, stage pips glyphs, crystal anchor table.
Reads warmth/ data (read-only); writes only under fx_extra/warmth_stage_up/."""
import sys, os, json, math, glob
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'warmth_stage_up'
SRC = ['3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff']
def fam_ramp():
    w = warmth(); out = {}
    for n, v in w['creatures'].items():
        st = v['stages']['3']; out.setdefault(v['ramp_family'], [st['#' + k].lstrip('#') for k in SRC])
    return out
def ring_anim(r6):
    lo, mid, hi, top = r6[1], r6[2], r6[3], r6[4]
    fr = []
    for i in range(10):
        cv = blank(48, 48); c = 24
        rr = [2, 5, 8, 11, 14, 16, 18, 19, 20, 20][i]
        if i <= 7:
            g = blank(48, 48); ring(g, c, c, rr, top if i < 3 else hi if i < 5 else mid, step=2 if i > 3 else 1, gap=0 if i <= 3 else 1, phase=i)
            if i <= 4: ring(g, c, c, max(1, rr - 2), hi, step=1, gap=2, phase=i)
            cv = paste(cv, outline(g, INK), 0, 0)
        if i in (2, 3, 4): star4(cv, c, c, [2, 3, 2][i - 2], core=WARM_HI, arm=top, tip=hi, ink=INK)
        if 3 <= i <= 8:
            for k in range(5):
                a = -math.pi / 2 + k * 2 * math.pi / 5 + i * 0.15; d = rr * 0.6 + 2
                yy = c + math.sin(a) * d - (i - 3) * 2
                star4(cv, c + math.cos(a) * d, yy, 1 if i < 7 else 0, core=WARM_HI, arm=top, tip=hi, ink=INK if i < 7 else None)
        fr.append(cv)
    return fr, [50, 50, 60, 70, 70, 70, 80, 80, 90, 60]
def pips(stage):
    cv = blank(23, 7)
    for k in range(3):
        cx = 3 + k * 8; filled = k < stage
        g = blank(23, 7)
        for dy in range(-3, 4):
            w = 3 - abs(dy)
            for dx in range(-w, w + 1):
                edge = abs(dx) == w
                if filled: px(g, cx + dx, 3 + dy, WARM_HI if (dx < 0 and not edge) else 'e8ce92' if not edge else 'fcd668')
                elif edge: px(g, cx + dx, 3 + dy, '8a4ace')
        g = outline(g, INK) if filled else g
        m = g[..., 3] > 0; cv[m] = g[m]
    return cv
def anchors():
    out = {}
    for n in CREATURES:
        p = f'{PIX}/warmth/masks/{n}/crystal_index.json'
        if not os.path.exists(p): continue
        idx = json.load(open(p))['sprites']; cr = {}
        for rp, v in idx.items():
            rows = v.get('rows') or []
            if not rows: cr[rp] = None; continue
            xs, ys, wts = [], [], []
            for y, x0, x1 in rows: xs.append((x0 + x1) / 2); ys.append(y); wts.append(x1 - x0 + 1)
            W = sum(wts); cx = sum(x * w for x, w in zip(xs, wts)) / W; cy = sum(y * w for y, w in zip(ys, wts)) / W
            cr[rp] = dict(centroid=[round(cx), round(cy)], bbox=[min(r[1] for r in rows), min(r[0] for r in rows), max(r[2] for r in rows), max(r[0] for r in rows)], px=v.get('crystal_px'), size=v.get('size'))
        for ip in sorted(glob.glob(f'{PIX}/warmth/masks/{n}/icons/{n}_icon_f[01].png')):
            m = np.array(Image.open(ip).convert('L')) > 0; ys, xs = np.where(m)
            cr['icons/' + os.path.basename(ip)] = dict(centroid=[int(round(xs.mean())), int(round(ys.mean()))], bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], px=int(m.sum()), size=list(m.shape[::-1])) if len(xs) else None
        out[n] = dict(ramp_family=warmth()['creatures'][n]['ramp_family'], sprites=cr)
    return out
def main():
    fams = fam_ramp(); a = {}
    for f, r6 in sorted(fams.items()):
        fr, ms = ring_anim(r6)
        a['ring_' + f] = write_anim(P, f'stage_up_{f}', fr, ms, anchor=dict(canvas_px=[24, 24], meaning='centre on the crystal centroid (crystal_anchors.json)'), sub='rings',
                                    notes=f'Warmth stage-up ring for ramp family "{f}" (stage-3 ramp {r6}). Swap the sprite to the new stage on frame 3 (peak).')
    pf = [pips(s) for s in range(4)]
    a['pips'] = write_anim(P, 'stage_pips', pf, [400] * 4, anchor=dict(canvas_px=[0, 0], meaning='top-left; frame index = Warmth stage 0-3'), kind='state_frames', emissive=False,
                           notes='Colour-blind-safe shape marker: count of filled diamonds = stage (0 = three empty violet outlines, company control). Use beside the name in summary/party. ms are preview-only.')
    an = anchors()
    json.dump(dict(status='DRAFT', note='Crystal centroid/bbox (sprite px, inclusive bbox [x0,y0,x1,y1]) per sprite from warmth/masks/<creature>/crystal_index.json + icon masks. null = no visible crystal in that frame (skip the ring or use the sprite centre).', creatures=an),
              open(f'{FXX}/{P}/crystal_anchors.json', 'w'), indent=1)
    hooks = dict(trigger='Warmth crosses a stage threshold (warmth_tints.json thresholds 25/50/75) at a calm moment: after battle results or in the party screen; never mid-move',
                 sequence=['stage_up_<family> at the crystal centroid of the current sprite frame', 'frame 3: swap to the new Warmth stage (palette swap via warmth_tints.json on the crystal mask)', 'stage_pips glyph updates to the new count on frame 3', 'chime SFX on frame 2'],
                 family_lookup='warmth_tints.json creatures.<name>.ramp_family', anchors=rel(f'{FXX}/{P}/crystal_anchors.json'),
                 stage_down='no ring for losing Warmth: just swap, plus pips update (avoid rewarding loss with sparkle)',
                 reduced_motion='skip the ring; play frame 3 only for 300 ms, then swap',
                 order='cosmic swap -> Warmth swap -> ToD grade (cosmic_swaps.json)')
    # preview: cindrip battle front 2 -> 3, on clean battle bg
    tod = {}
    bg = clean_battle_bg(None)
    for n, f in (('cindrip', 'ember'), ('rillop', 'seafoam'), ('bastonox', 'moss')):
        spr_p = creature_battle_path(n, 'front'); spr = load(spr_p); m = crystal_mask(n, spr_p)
        rp = os.path.relpath(spr_p, f'{PIX}/creatures/{n}'); ac = an[n]['sprites'].get(rp)
        h, w = spr.shape[:2]; x0, y0 = FOE_GROUND[0] - w // 2, FOE_GROUND[1] - (h - 3)
        s2, s3 = warmth_swap(spr, n, 2, m), warmth_swap(spr, n, 3, m)
        seq = []
        ring_m = a['ring_' + f]
        cx, cy = ac['centroid'] if ac else (w // 2, h // 2)
        for i, fr in enumerate(ring_m['_frames']):
            im = comp(bg, s2 if i < 3 else s3, x0, y0); im = comp(im, fr, x0 + cx - 24, y0 + cy - 24)
            im = comp(im, pf[2 if i < 3 else 3], 200, 30); seq.append(im)
        preview_gif(P, f'stage_up_preview_{n}', [comp(comp(bg, s2, x0, y0), pf[2], 200, 30)] + seq + [seq[-1]], [500] + ring_m['ms_per_frame'] + [900])
        sub = bg[y0 + cy - 24:y0 + cy + 24, x0 + cx - 24:x0 + cx + 24].copy()
        sub = comp(bg, s3, x0, y0)[y0 + cy - 24:y0 + cy + 24, x0 + cx - 24:x0 + cx + 24].copy()
        tod['ring_' + f] = tod_check(P, f'stage_up_{f}', sub, [(ring_m, 0, 0)])
    # remaining families checked on the plain battle grass
    for f in sorted(fams):
        if 'ring_' + f in tod: continue
        tod['ring_' + f] = tod_check(P, f'stage_up_{f}', bg[150:198, 200:248].copy(), [(a['ring_' + f], 0, 0)])
    pb = np.concatenate([bg[20:30, 0:100], bg[100:110, 0:100], ow_bg(['floor_tile'], 2, 1)[0:10, 0:100]], 1)
    tod['pips'] = tod_check(P, 'stage_pips', pb, [(a['pips'], 4, 2), (a['pips'], 104, 2), (a['pips'], 204, 2)])
    rows = [[comp(bg[150:198, 200:248].copy(), fr, 0, 0) for fr in a['ring_' + f]['_frames']] for f in sorted(fams)]
    rows.append([comp(bg[20:27, 0:23].copy(), p, 0, 0) for p in pf])
    preview_png(P, 'warmth_stage_up_contact', contact(rows))
    about = 'Warmth stage-up FX (SOUL_PLAYBOOK Warmth): one ring+sparkle per ramp family in the family\'s own stage-3 colours, stage pips (shape marker), crystal anchors.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
