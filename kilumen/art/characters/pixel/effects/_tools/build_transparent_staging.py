"""Build TRANSPARENT, effect-sized replacements for the full-scene *_battle_2x.gif files into a staging mirror.

Why: <el>_<anim>_battle_2x.gif were written by gen_effects.py as REVIEW previews (effect composited onto the
320x240 pilot battle screen, 2x = 640x480, plus a 300 ms scene-only lead-in and 400 ms scene-only tail).
The game (src/ui/ui.js fx()) loads the impact one as its hit overlay, so a whole battle scene flashed over
the target. This tool re-renders the effect-only layers (same seeded drawing code, elements.py) and writes,
per element/anim, into effects/_transparent_staging/<el>/<anim>/:
  <el>_<anim>_battle_2x.gif   same filename; transparent, cropped to the effect, 2x NN, disposal=2
  <el>_<anim>_battle_2x_sheet.png   transparent horizontal strip (2x)
  <el>_<anim>_battle_2x.json  frame rects, per-frame ms, anchor(s) relative to the cropped canvas
Live files are NOT touched.  Run: python3 build_transparent_staging.py [--anims impact,travel_p2f,travel_f2p] [el ...]
"""
import os, sys, json, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from fxlib import FX, C, up, save_gif, Path
import elements as EL, gen_effects as G

ROOT = G.ROOT
STAGE = ROOT + '/_transparent_staging'
PAD = 3            # native px of transparent padding around the union bbox
ANIMS = ('impact', 'travel_p2f', 'travel_f2p')

MARGIN = 48        # native px of extra canvas on every side when re-rendering (multiple of 4 keeps the Bayer fades aligned)
MAX_INNER_DIFF = 8 # if the margin render differs from the original inside the old canvas by more than this, keep the original canvas

def render(el, anim, M=0):
    """Effect-only frames from the seeded drawing code. M>0 renders on a canvas grown by M px on every side
    (same art, nothing cut at the old 96x112 / 240x176 edge); frame coords are then shifted by (M, M)."""
    nt, ni, fpst, fpsi, arc, wob, ol, note = EL.ELEMENTS[el]
    seed = sum(map(ord, el)) * 7
    fr = []
    if anim == 'impact':
        im = getattr(EL, el + '_impact')
        for i in range(ni):
            fx = FX(G.IW + 2 * M, G.IH + 2 * M, C(ol)); im(fx, i, ni, (G.IANCH[0] + M, G.IANCH[1] + M), seed); fr.append(fx.render())
    else:
        tr = getattr(EL, el + '_travel'); P = G.make_paths(arc, wob, el)[0 if anim == 'travel_p2f' else 1]
        if M: P = Path((P.S[0] + M, P.S[1] + M), (P.E[0] + M, P.E[1] + M), P.arc, P.sc, P.wob, P.wobf)
        for i in range(nt):
            fx = FX(G.TW + 2 * M, G.TH + 2 * M, C(ol)); tr(fx, i, nt, P, seed); fr.append(fx.render())
    return fr

def live_battle_gif_info(el, anim):
    """frame count + per-frame ms of the CURRENT live full-scene gif, and whether its effect frames
    are exactly the source composited on the pilot scene (proves the cause)."""
    p = f'{ROOT}/{el}/{anim}/{el}_{anim}_battle_2x.gif'
    g = Image.open(p); ms = []; frames = []
    for i in range(g.n_frames):
        g.seek(i); ms.append(g.info.get('duration')); frames.append(np.array(g.convert('RGBA')))
    return {'path': p, 'size': g.size, 'n': g.n_frames, 'ms': ms, 'frames': frames}

def even_box(x0, y0, x1, y1):
    x0 -= PAD; y0 -= PAD; x1 += PAD; y1 += PAD
    if (x1 - x0) % 2: x1 += 1
    if (y1 - y0) % 2: y1 += 1
    return x0, y0, x1, y1

def crop_frames(frames, box):
    x0, y0, x1, y1 = box; H, W = frames[0].shape[:2]; out = []
    for f in frames:
        c = np.zeros((y1 - y0, x1 - x0, 4), 'uint8')
        sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        c[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = f[sy0:sy1, sx0:sx1]
        out.append(c)
    return out

def build(el, anim, log):
    nt, ni, fpst, fpsi, arc, wob, ol, note = EL.ELEMENTS[el]
    src0 = render(el, anim)            # original canvas (what the live files were made from)
    big = render(el, anim, MARGIN)
    H0, W0 = src0[0].shape[:2]
    inner_diff = sum(int((b[MARGIN:MARGIN + H0, MARGIN:MARGIN + W0] != s).any(-1).sum()) for b, s in zip(big, src0))
    use_margin = inner_diff <= MAX_INNER_DIFF
    src, M = (big, MARGIN) if use_margin else (src0, 0)
    # sanity: the re-render must equal the committed 1x effect-only frames
    d = f'{ROOT}/{el}/{anim}'
    same_as_1x = all(np.array_equal(f, np.array(Image.open(f'{d}/1x/{el}_{anim}_f{i}.png').convert('RGBA'))) for i, f in enumerate(src0))
    live = live_battle_gif_info(el, anim)
    n = len(src)
    # cause check: live frames 1..n == up(source composited on the pilot battle scene)
    xy = G.place_imp(G.FOE_CENTER) if anim == 'impact' else G.TOFF
    composite_match = live['n'] == n + 2 and all(np.array_equal(live['frames'][i + 1][..., :3], up(G.over(G.BG, f, xy))[..., :3]) for i, f in enumerate(src0))
    hold_frames = [i for i in (0, live['n'] - 1) if np.array_equal(live['frames'][i][..., :3], up(G.BG)[..., :3])]
    ms = live['ms'][1:-1] if live['n'] == n + 2 else [int(1000 / (fpsi if anim == 'impact' else fpst))] * n
    if live['n'] != n + 2:   # live already swapped to transparent: keep the staged/live per-frame ms (int(1000/fps) rounds 80 -> 83)
        for pj in (f'{STAGE}/{el}/{anim}/{el}_{anim}_battle_2x.json', f'{ROOT}/{el}/{anim}/{el}_{anim}_battle_2x.json'):
            if os.path.exists(pj):
                pm = [f['ms'] for f in json.load(open(pj))['frames']]
                if len(pm) == n: ms = pm; break
    m = np.zeros(src[0].shape[:2], bool)
    for f in src: m |= f[..., 3] > 0
    ys, xs = np.nonzero(m); bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    H, W = src[0].shape[:2]
    touches_edge = bx0 == 0 or by0 == 0 or bx1 == W or by1 == H        # still cut at the render canvas edge
    m0 = np.zeros((H0, W0), bool)
    for f in src0: m0 |= f[..., 3] > 0
    y0s, x0s = np.nonzero(m0)
    was_cut = bool(x0s.min() == 0 or y0s.min() == 0 or x0s.max() == W0 - 1 or y0s.max() == H0 - 1)  # live art was cut at 96x112/240x176
    boxM = even_box(bx0, by0, bx1, by1)
    cf = crop_frames(src, boxM)
    box = (boxM[0] - M, boxM[1] - M, boxM[2] - M, boxM[3] - M)   # in ORIGINAL canvas coords (may be negative)
    cw, ch = box[2] - box[0], box[3] - box[1]
    out = f'{STAGE}/{el}/{anim}'; os.makedirs(out, exist_ok=True)
    base = f'{el}_{anim}_battle_2x'
    f2 = [up(f) for f in cf]
    save_gif(f2, f'{out}/{base}.gif', ms, transparent=True)
    sheet = np.concatenate(f2, 1); Image.fromarray(sheet, 'RGBA').save(f'{out}/{base}_sheet.png')
    W2, H2 = cw * 2, ch * 2
    meta = {
        'element': el, 'anim': anim, 'description': note,
        'generated_by': 'art/characters/pixel/effects/_tools/build_transparent_staging.py',
        'generated_at': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
        'scale': 2, 'filter': 'nearest', 'background': 'fully transparent (1-bit alpha), palette-only opaque pixels',
        'gif': f'{base}.gif', 'gif_disposal': 2, 'loop': 'gif loop=0 is set; play ONCE in game (remove after total_ms)',
        'sheet': f'{base}_sheet.png', 'sheet_layout': 'horizontal strip, frame i at x=i*frame_w',
        'frame_w': W2, 'frame_h': H2, 'frame_count': n,
        'frames': [{'i': i, 'x': i * W2, 'y': 0, 'w': W2, 'h': H2, 'ms': int(ms[i])} for i in range(n)],
        'total_ms': int(sum(ms)),
        'native_frame_w': cw, 'native_frame_h': ch,
        'crop_in_source_canvas_native': {'x': box[0], 'y': box[1], 'w': cw, 'h': ch, 'source_canvas': [W0, H0], 'note': 'x/y relative to the old canvas; negative = art that the old canvas cut off'},
        'effect_bbox_native': [bx0 - boxM[0], by0 - boxM[1], bx1 - boxM[0], by1 - boxM[1]],
        'rendered_with_margin': bool(use_margin),
    }
    if anim == 'impact':
        ax, ay = G.IANCH[0] - box[0], G.IANCH[1] - box[1]
        meta['anchor'] = {'type': 'impact_centre', 'x': ax * 2, 'y': ay * 2, 'native': [ax, ay],
                          'usage': 'draw the frame at (target_centre_x - anchor.x*k, target_centre_y - anchor.y*k) at its natural aspect, k = display px per 2x px; flip_x for the player side mirrors around anchor: x\' = frame_w - anchor.x'}
    else:
        P = G.make_paths(arc, wob, el)[0 if anim == 'travel_p2f' else 1]
        S = (round(P.S[0]) - box[0], round(P.S[1]) - box[1]); E = (round(P.E[0]) - box[0], round(P.E[1]) - box[1])
        meta['anchor'] = {'type': 'screen_space_path', 'start': [S[0] * 2, S[1] * 2], 'end': [E[0] * 2, E[1] * 2],
                          'start_is': 'player mouth (back sprite)' if anim == 'travel_p2f' else 'foe mouth (front sprite)',
                          'end_is': 'foe centre' if anim == 'travel_p2f' else 'player centre',
                          'canvas_offset_on_pilot_screen_native': [G.TOFF[0] + box[0], G.TOFF[1] + box[1]],
                          'canvas_offset_on_pilot_screen_2x': [(G.TOFF[0] + box[0]) * 2, (G.TOFF[1] + box[1]) * 2],
                          'usage': 'pilot layout: draw at canvas_offset; other layouts: map start->attacker mouth, end->target centre'}
    json.dump(meta, open(f'{out}/{base}.json', 'w'), indent=1)
    rec = {'el': el, 'anim': anim, 'frames': n, 'ms': ms, 'canvas_2x': [W2, H2], 'anchor': meta['anchor'],
           'source_eq_committed_1x': bool(same_as_1x), 'live_is_source_on_scene': bool(composite_match),
           'live_size': list(live['size']), 'live_frames': live['n'], 'live_scene_only_hold_frames': hold_frames,
           'effect_touches_source_canvas_edge': bool(touches_edge), 'live_art_was_cut_at_old_canvas_edge': was_cut,
           'rendered_with_margin': bool(use_margin), 'margin_inner_diff_px': inner_diff}
    log.append(rec); return rec

def main():
    args = sys.argv[1:]; anims = list(ANIMS)
    if '--anims' in args:
        k = args.index('--anims'); anims = args[k + 1].split(','); del args[k:k + 2]
    els = args or list(EL.ELEMENTS)
    log = []
    for el in els:
        for anim in anims:
            r = build(el, anim, log)
            print(f"{el:11s} {anim:10s} {r['frames']}f {r['canvas_2x'][0]}x{r['canvas_2x'][1]} ms={r['ms'][0]} "
                  f"src==1x:{r['source_eq_committed_1x']} live=scene+fx:{r['live_is_source_on_scene']} cut_before:{r['live_art_was_cut_at_old_canvas_edge']} margin:{r['rendered_with_margin']}({r['margin_inner_diff_px']}) still_cut:{r['effect_touches_source_canvas_edge']}", flush=True)
    os.makedirs(STAGE + '/_preview', exist_ok=True)
    lp = STAGE + '/_preview/build_log.json'
    if os.path.exists(lp):   # partial rebuilds merge into the existing log instead of replacing it
        new = {(r['el'], r['anim']) for r in log}
        old = [r for r in json.load(open(lp)) if (r['el'], r['anim']) not in new]
        order = {(e, a): k for k, (e, a) in enumerate((e, a) for e in EL.ELEMENTS for a in ANIMS)}
        log = sorted(old + log, key=lambda r: order.get((r['el'], r['anim']), 1e9))
    json.dump(log, open(lp, 'w'), indent=1)

if __name__ == '__main__':
    main()
