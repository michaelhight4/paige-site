"""'No smoke' audit for Kilumen battle FX (Gary's hard rule: nothing may read as smoke, fumes or haze).
Two signals per element/anim:
  1. names: the element's drawing functions (<el>_travel / <el>_impact) and its ELEMENTS note must not mention
     smoke-like things (smoke, fumes, haze, steam, mist, fog, vapour, soot, dust, puffs ...). ALL-CAPS palette
     constants (e.g. SOOT) are ignored; prose/comments/variable names are not.
  2. pixels: grey / low-saturation clusters (chroma <= 24, not the element's outline colour, not near-white
     highlights) of >= MIN_AREA native px, puff-shaped (>= 4x4 with a solid interior), mostly NOT attached to coloured art, that drift (impacts: upward)
     between consecutive frames (the signature of a smoke puff). Dither is bridged before labelling.
Anything flagged needs a human decision: add it to REVIEWED below with the reason, or fix the art.
Run standalone: python3 smoke_check.py [--dir STAGE] [el ...]"""
import os, re, sys, inspect, json
import numpy as np
from PIL import Image

SMOKE_WORDS = re.compile(r'\b(smoke|smoky|smoking|fumes?|haze|hazy|steam|steamy|mist|misty|fog|foggy|smog|vapou?rs?|soot|sooty|dust|dusty|puffs?|ash|ashes)\b', re.I)
CHROMA_MAX = 24
LUM_MAX = 190          # brighter greys are highlights/sparkle cores, not smoke
MIN_AREA = 8           # native grey px in the cluster
MIN_DIM = 4            # bbox of the (dither-bridged) cluster must be at least 4x4 native px ...
MIN_INTERIOR = 3       # ... and have a solid interior (survives a 3x3 erosion): puffs do, lines/arcs/rings/thin spikes don't
ATTACHED_MAX = 0.40    # cluster ring fraction touching coloured art above this = part of a coloured object
RISE_MIN = 1.0         # native px of centroid drift between consecutive frames
RISE_ONLY = False      # set by check(): True for impacts

# (el, anim) -> reason. Only for things a human looked at and decided do NOT read as smoke.
REVIEWED = {
    ('rain', 'impact'): 'storm cloud that rains on the target (the move itself); grey puffs are a raincloud, not smoke - reviewed 2026-10-22, keep under Gary\'s eye',
    ('rain', 'travel_p2f'): 'tiny raincloud at the caster on frame 0 only - reviewed 2026-10-22',
    ('rain', 'travel_f2p'): 'tiny raincloud at the caster on frame 0 only - reviewed 2026-10-22',
    ('dark', 'travel_p2f'): 'solid black-violet ink orb (the projectile body with eye highlight and tendrils), not a trail - reviewed 2026-10-22',
    ('dark', 'travel_f2p'): 'solid black-violet ink orb (the projectile body with eye highlight and tendrils), not a trail - reviewed 2026-10-22',
    ('ghost', 'impact'): 'the pale-grey ghost face itself (solid sheet body), not particles - reviewed 2026-10-22',
    ('ghost', 'travel_p2f'): 'the pale-grey ghost body itself - reviewed 2026-10-22',
    ('ghost', 'travel_f2p'): 'the pale-grey ghost body itself - reviewed 2026-10-22',
}

def name_hits(EL, el):
    hits = []
    for fn in (f'{el}_travel', f'{el}_impact'):
        f = getattr(EL, fn, None)
        if f is None: continue
        src = re.sub(r'\b[A-Z][A-Z0-9_]*\b', ' ', inspect.getsource(f))
        hits += [f'{fn}: {m.group(0)}' for m in SMOKE_WORDS.finditer(src)]
    note = re.sub(r'\b[A-Z][A-Z0-9_]*\b', ' ', EL.ELEMENTS[el][7])
    hits += [f'ELEMENTS note: {m.group(0)}' for m in SMOKE_WORDS.finditer(note)]
    return hits

def _label(mask):
    from scipy import ndimage
    return ndimage.label(mask, structure=np.ones((3, 3), int))

def grey_clusters(frame, outline_rgb):
    """frame: native RGBA. returns list of (cy, cx, area, attached_frac) of puff-shaped grey clusters)"""
    from scipy import ndimage
    rgb = frame[..., :3].astype(int); op = frame[..., 3] > 0
    chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
    is_ol = (rgb == np.array(outline_rgb)).all(-1)
    grey = op & (chroma <= CHROMA_MAX) & (lum <= LUM_MAX) & ~is_ol
    coloured = op & ~grey & ~is_ol
    bridged = ndimage.binary_closing(grey, structure=np.ones((3, 3), bool)) | grey   # join 50% dither
    lab, n = _label(bridged); out = []
    for k in range(1, n + 1):
        m = lab == k; real = m & grey; area = int(real.sum())
        if area < MIN_AREA: continue
        ys0, xs0 = np.nonzero(m); bh, bw = int(np.ptp(ys0)) + 1, int(np.ptp(xs0)) + 1
        if min(bh, bw) < MIN_DIM or int(ndimage.binary_erosion(m, structure=np.ones((3, 3), bool)).sum()) < MIN_INTERIOR: continue
        ring = ndimage.binary_dilation(m, structure=np.ones((3, 3), bool)) & ~m
        att = float((ring & coloured).sum()) / max(1, int(ring.sum()))
        ys, xs = np.nonzero(real); out.append((float(ys.mean()), float(xs.mean()), area, att))
    return out

def pixel_flags(frames_native, outline_rgb):
    """frames: native RGBA list. returns flags for detached, puff-shaped grey clusters that DRIFT: present in two
    consecutive frames within 16 (travel: 40) native px of each other but not static (impacts: must rise; travel: any drift,
    because a smoke trail rides along with the projectile)."""
    cl = [[c for c in grey_clusters(f, outline_rgb) if c[3] <= ATTACHED_MAX] for f in frames_native]
    flags = []
    for i in range(len(cl) - 1):
        for a in cl[i]:
            for b in cl[i + 1]:
                dy, dx = a[0] - b[0], b[1] - a[1]
                lim = 16 if RISE_ONLY else 40
                if abs(dx) <= lim and abs(dy) <= lim and (abs(dx) + abs(dy)) >= RISE_MIN and (dy >= RISE_MIN or not RISE_ONLY):
                    flags.append({'frame': i, 'at_native': [round(a[1]), round(a[0])], 'area': a[2], 'drift_px': [round(dx, 1), round(-dy, 1)]}); break
    return flags

def check(EL, el, anim, frames_2x):
    """returns dict(ok, names, pixel_flags, reviewed)"""
    outline = tuple(int(EL.ELEMENTS[el][6][k:k + 2], 16) for k in (0, 2, 4))
    nat = [f[::2, ::2] for f in frames_2x]
    global RISE_ONLY
    RISE_ONLY = anim == 'impact'
    names = name_hits(EL, el); px = pixel_flags(nat, outline)
    rev = REVIEWED.get((el, anim))
    return {'ok': (not names and not px) or bool(rev), 'names': names, 'pixel_flags': px[:8], 'n_pixel_flags': len(px), 'reviewed': rev}

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import elements as EL
    args = sys.argv[1:]
    stage = args[args.index('--dir') + 1] if '--dir' in args else '/workspace/kilumen/art/characters/pixel/effects/_transparent_staging'
    els = [a for a in args if not a.startswith('--') and a != stage] or list(EL.ELEMENTS)
    for el in els:
        for anim in ('impact', 'travel_p2f', 'travel_f2p'):
            g = Image.open(f'{stage}/{el}/{anim}/{el}_{anim}_battle_2x.gif'); fr = []
            for i in range(g.n_frames): g.seek(i); fr.append(np.array(g.convert('RGBA')))
            r = check(EL, el, anim, fr)
            tag = 'ok' if (not r['names'] and not r['n_pixel_flags']) else ('REVIEWED' if r['reviewed'] else 'FLAG')
            print(f"{tag:8s} {el:11s} {anim:10s} names={r['names']} grey_rising={r['n_pixel_flags']} {r['pixel_flags'][:2]}")
