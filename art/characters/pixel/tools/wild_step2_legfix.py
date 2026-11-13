"""Step 2: design fixes in code on the snapped bases.
Burlbeetle must have 6 legs (the painted master and generated art show 4-5 tortoise legs).
We add darker far-side legs drawn BEHIND the existing sprite (only into transparent pixels),
copied from an existing leg so style/outline match, then snap to the palette.
Pre-fix bases are kept in burlbeetle/_work/ for reference; the OW right view is re-mirrored."""
import os, shutil, json
from wild_pxlib import *
from PIL import Image, ImageOps

def far_leg(a, x0, x1, y0, y1, dx, dy, k=0.66):
    src = a[y0:y1, x0:x1].copy(); m = src[..., 3] > 0
    src[..., :3] = (src[..., :3] * k).astype('uint8')
    H, W = a.shape[:2]; out = a.copy()
    ys, xs = np.where(m); ty = ys + y0 + dy; tx = xs + x0 + dx
    ok = (ty >= 0) & (ty < H) & (tx >= 0) & (tx < W)
    ys, xs, ty, tx = ys[ok], xs[ok], ty[ok], tx[ok]
    free = a[ty, tx, 3] == 0
    out[ty[free], tx[free]] = src[ys[free], xs[free]]
    return out

FIX = {  # base: list of (x0,x1,y0,y1,dx,dy) leg copies (native px)
    'burlbeetle_front': [(60, 78, 72, 100, -10, -4), (80, 98, 72, 100, 8, -4)],
    'burlbeetle_back': [(60, 78, 72, 100, -9, -4)],
    'burlbeetle_ow_left': [(22, 29, 31, 44, -5, -2), (22, 29, 31, 44, 5, -2)],
    'burlbeetle_ow_down': [(0, 11, 30, 44, 5, -3), (27, 38, 30, 44, -5, -3)],
    'burlbeetle_ow_up': [(0, 12, 30, 44, 4, -3), (25, 37, 30, 44, -4, -3)],
}

def main():
    B = f'{CRE}/burlbeetle/base'; Wk = f'{CRE}/burlbeetle/_work'; os.makedirs(Wk, exist_ok=True)
    meta = json.load(open(f'{B}/meta.json'))
    for n, ops in FIX.items():
        p = f'{B}/{n}.png'; shutil.copy(p, f'{Wk}/{n}_prefix.png')
        a = np.array(Image.open(p).convert('RGBA'))
        for op in ops: a = far_leg(a, *op)
        a = remap(a); Image.fromarray(a).save(p)
        meta[n]['legfix'] = [list(o) for o in ops]; print('legfix', n, ncolors(Image.fromarray(a)))
    l = Image.open(f'{B}/burlbeetle_ow_left.png'); ImageOps.mirror(l).save(f'{B}/burlbeetle_ow_right.png')
    json.dump(meta, open(f'{B}/meta.json', 'w'), indent=1)

if __name__ == '__main__': main()
