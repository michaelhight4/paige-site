"""Step 1+2 (pilot step1_bases + step2_palette): snap raw generated art to native pixel
bases, then remap every base to the shared 64-colour palette (palette.png).
Battle: fit th<=112 / tw<=124 on a 128 canvas, 28 colours before palette remap.
Overworld chibi: split the 4-view image with find_boxes(dil=1), fit th<=48 / tw<=58
(64x64 canvas), 18 colours. Views generated facing the wrong way are mirrored from the
left view (MIRROR_RIGHT)."""
import json, os, glob
from wild_pxlib import *
from PIL import Image, ImageOps

BATTLE = {  # name: (front th, tw), (back th, tw)
    'sailquill': ((116, 124), (116, 124)),
    'halovy': ((122, 124), (122, 124)),
    'gloamtick': ((118, 124), (118, 124)),
    'runeskein': ((100, 124), (100, 124)),
    'burlbeetle': ((100, 124), (100, 124)),
    'mirewump': ((100, 124), (100, 124)),
    'slagrook': ((116, 124), (116, 124)),
}
OW = {  # name: (th, tw) fit for the down/up views; side views fit the same box
    'sailquill': (50, 56), 'halovy': (54, 56), 'gloamtick': (52, 56), 'runeskein': (46, 58),
    'burlbeetle': (44, 58), 'mirewump': (44, 58), 'slagrook': (50, 56),
}
# right view taken as a mirror of the left view (source image's view 3 faces left / is malformed)
MIRROR_RIGHT = {'halovy', 'burlbeetle', 'gloamtick', 'runeskein'}

# colour pre-boost before snapping (saturation x k for hues h0..h1 deg): small/muted art
# otherwise collapses onto the palette's violet-greys. name: [(k, h0, h1), ...]
BOOST = {'mirewump': [(1.6, 25, 200, 30)], 'runeskein': [(2.0, 150, 210, 0)]}  # (k, h0, h1, hue shift deg)
HOLES = {'halovy'}
# pinks the remap wrongly picks for pale cream fur / eye stalks
EXCLUDE = {'halovy': ('daa2ba', 'f6a0ba', 'd2608c', 'a8a0a4', 'ccc6c2', '827a84'), 'slagrook': ('daa2ba', 'f6a0ba', 'd2608c')}  # enclosed white inside the halo ring must be transparent

def boost(img, ops):
    im = img.convert('RGB'); hsv = np.array(im.convert('HSV')).astype(float); h = hsv[..., 0] * 360 / 255
    for k, h0, h1, dh in ops:
        m = (h > h0) & (h < h1) & (hsv[..., 2] < 235)
        hsv[..., 0][m] = ((h[m] + dh) % 360) * 255 / 360
        hsv[..., 1][m] = np.clip(hsv[..., 1][m] * k, 0, 255)
    return Image.fromarray(hsv.astype('uint8'), 'HSV').convert('RGB')

def punch_holes(img, box, spr, top_frac=0.3):
    """clear enclosed near-white regions in the top part (halo interior) of the sprite"""
    from scipy import ndimage
    c, fg, org = cutout(img, box); h, w = fg.shape
    white = (c.min(2) > 228) & fg
    lab, k = ndimage.label(white); hole = np.zeros_like(fg)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl[0].stop <= h * top_frac and (lab[sl] == i + 1).sum() > 40: hole |= lab == i + 1
    a = np.array(spr); W, H = spr.size
    hm = np.array(Image.fromarray((hole * 255).astype('uint8')).resize((W, H), Image.BOX)) > 110
    a[hm] = 0
    # inner edge of the ring -> outline treatment like add_outline
    from scipy.ndimage import binary_dilation
    edge = binary_dilation(hm) & (a[..., 3] > 0)
    a[edge, :3] = (a[edge, :3] * 0.35 + np.array([20, 12, 18]) * 0.65).astype('uint8')
    return Image.fromarray(a)

def go(name, outdir, img, box, th, tw, ncol, meta, src):
    cre = name.split('_')[0]
    if cre in BOOST: img = boost(img, BOOST[cre])
    spr, s, org = snap(img, box, th, tw, ncol)
    if cre in HOLES: spr = punch_holes(img, box, spr)
    spr = Image.fromarray(remap(np.array(spr), EXCLUDE.get(cre, ())))
    spr.save(f'{outdir}/{name}.png')
    meta[name] = dict(scale=float(s), org=[int(v) for v in org], size=list(spr.size), src=src,
                      box=list(box) if box else None, colours=ncolors(spr))
    print(name, spr.size, ncolors(spr))
    return spr

def boxes_full_height(img, n=4):
    bx = find_boxes(img, n, dil=1)
    W, H = img.size; xs = [0] + [(bx[i][2] + bx[i + 1][0]) // 2 for i in range(n - 1)] + [W]
    return [(xs[i], 0, xs[i + 1], H) for i in range(n)]

def main(only=None):
    for n in WILD:
        if only and n not in only: continue
        C = f'{CRE}/{n}'; B = f'{C}/base'; os.makedirs(B, exist_ok=True); meta = {}
        (fth, ftw), (bth, btw) = BATTLE[n]
        go(f'{n}_front', B, Image.open(f'{C}/raw/battle_front.jpg'), None, fth, ftw, 28, meta, 'raw/battle_front.jpg')
        go(f'{n}_back', B, Image.open(f'{C}/raw/battle_back.jpg'), None, bth, btw, 28, meta, 'raw/battle_back.jpg')
        f = glob.glob(f'{C}/raw/ow_views.*')[0]; img = Image.open(f); th, tw = OW[n]
        bx = boxes_full_height(img)
        for b, d in zip(bx, ['down', 'left', 'right', 'up']):
            if d == 'right' and n in MIRROR_RIGHT: continue
            go(f'{n}_ow_{d}', B, img, b, th, tw, 22, meta, 'raw/' + os.path.basename(f))
        if n in MIRROR_RIGHT:
            l = Image.open(f'{B}/{n}_ow_left.png'); ImageOps.mirror(l).save(f'{B}/{n}_ow_right.png')
            meta[f'{n}_ow_right'] = dict(mirror_of=f'{n}_ow_left', size=list(l.size), colours=ncolors(l))
        json.dump(meta, open(f'{B}/meta.json', 'w'), indent=1)

if __name__ == '__main__':
    import sys; main(sys.argv[1:] or None)
