"""Crystal classification of violet pixels (playbook 1.1 Crystal Warmth).
Keys (battle front/back, 4 overworld stands) are labelled per pixel: shape heuristic (solid blob = crystal,
thin line/speck = seam/vein/eye) + per-creature manual overrides (overrides.py). Every other frame
(idle f0-f3, walk0-3) inherits per-pixel labels from its key after a best local shift per component.
Labels: 1 = crystal (tinted), 2 = other violet (glow seams/veins, fins, eyes, smoke... never tinted)."""
import numpy as np
from scipy import ndimage as ndi
from wlib import *
from overrides import OVR

def heuristic(f): return f['core'] >= 2 and f['core'] >= 0.4 * f['area']
def inbox(x, y, b): return b[0] <= x <= b[2] and b[1] <= y <= b[3]

def classify_key(n, rel):
    a = load(n, rel); lab, k = components(a); F = comp_feats(lab, k)
    o = OVR.get(n, {}); key = key_of(rel)
    out = np.zeros(lab.shape, np.uint8)
    for i, f in F.items():
        d = o.get('default'); c = True if d == 'crystal' else False if d == 'other' else heuristic(f)
        if any(inbox(f['cx'], f['cy'], b) for b in o.get(key + '+', [])): c = True
        if any(inbox(f['cx'], f['cy'], b) for b in o.get(key + '-', [])): c = False
        out[lab == i] = 1 if c else 2
    ys, xs = np.where(lab > 0)
    for y, x in zip(ys, xs):
        if any(inbox(x, y, b) for b in o.get(key + ' px+', [])): out[y, x] = 1
        if any(inbox(x, y, b) for b in o.get(key + ' px-', [])): out[y, x] = 2
    # adopt tiny violet fragments touching a crystal (split-off outline/edge pixels)
    if not o.get('no_adopt'):
        near = ndi.binary_dilation(out == 1, structure=np.ones((3, 3)), iterations=1)
        for i, f in F.items():
            c = lab == i
            if f['area'] <= 6 and (out[c] == 2).all() and (near & c).any() \
               and not any(inbox(f['cx'], f['cy'], b) for b in o.get(key + '-', [])):
                out[c] = 1
    return out

def inherit(a, keylab, R=4):
    lab, k = components(a); out = np.zeros(lab.shape, np.uint8); H, W = lab.shape
    kv = keylab > 0
    # nearest key label lookup (within 2px) for pixels whose shifted position is not violet in the key
    dist, (iy, ix) = ndi.distance_transform_edt(~kv, return_indices=True)
    for i in range(1, k + 1):
        c = lab == i; ys, xs = np.where(c); best = (-1e9, 0, 0)
        for dy in range(-R, R + 1):
            for dx in range(-R, R + 1):
                yy, xx = ys + dy, xs + dx; ok = (yy >= 0) & (yy < H) & (xx >= 0) & (xx < W)
                s = kv[yy[ok], xx[ok]].sum() - 0.01 * (abs(dy) + abs(dx))
                if s > best[0]: best = (s, dy, dx)
        _, dy, dx = best
        yy = np.clip(ys + dy, 0, H - 1); xx = np.clip(xs + dx, 0, W - 1)
        lbl = keylab[iy[yy, xx], ix[yy, xx]]
        lbl = np.where(dist[yy, xx] <= 2.5, lbl, 0)
        if (lbl == 0).any():
            vals = lbl[lbl > 0]; maj = (1 if (vals == 1).sum() > (vals == 2).sum() else 2) if len(vals) else 2
            lbl = np.where(lbl == 0, maj, lbl)
        out[ys, xs] = lbl
    return out

def classify_creature(n):
    S = sprites(n); keys = {}; res = {}
    for rel in S:
        if rel.startswith('battle/') or rel.endswith('_stand.png'):
            keys[key_of(rel)] = res[rel] = classify_key(n, rel)
    for rel in S:
        if rel not in res: res[rel] = inherit(load(n, rel), keys[key_of(rel)])
    return res
