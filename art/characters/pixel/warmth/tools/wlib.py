"""Shared helpers for Crystal Warmth masks (playbook 1.1)."""
import glob, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
PIX = '/workspace/kilumen/art/characters/pixel'
CRE = PIX + '/creatures'
OUT = PIX + '/warmth'
PALHEX = open('/workspace/kilumen/art/world/overworld/palette.hex').read().split()
PAL = {h: tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) for h in PALHEX}
VIOLET = ['3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff']  # authored crystal ramp, dark->light
NAMES = sorted(os.listdir(CRE))

def hx(c): return '%02x%02x%02x' % tuple(int(v) for v in c[:3])

def sprites(n):
    """All native-resolution sprites of creature n (battle, idle frames, overworld frames)."""
    fs = glob.glob(f'{CRE}/{n}/battle/*.png') + glob.glob(f'{CRE}/{n}/anim/*/*.png') + glob.glob(f'{CRE}/{n}/overworld/*_ow/*.png')
    return sorted(os.path.relpath(f, CRE + '/' + n) for f in fs if '_2x' not in f and '_3x' not in f)

def load(n, rel): return np.array(Image.open(f'{CRE}/{n}/{rel}').convert('RGBA'))

def violet_mask(a):
    m = a[..., 3] > 0; v = np.zeros(m.shape, bool)
    for h in VIOLET: v |= (a[..., :3] == PAL[h]).all(-1)
    return v & m

def components(a):
    v = violet_mask(a)
    lab, k = ndi.label(v, structure=np.ones((3, 3)))
    return lab, k

def key_of(rel):
    """the key sprite a frame derives from (idle frames <- battle pose; walk frames <- stand)."""
    b = os.path.basename(rel)
    if '/anim/' in '/' + rel:
        side = 'front' if '_front_' in b else 'back'; return 'battle_' + side
    if 'overworld' in rel:
        d = b.split('_ow_')[1].split('_')[0]; return 'ow_' + d
    return 'battle_' + ('front' if '_front_' in b else 'back')

def comp_feats(lab, k):
    out = {}
    for i in range(1, k + 1):
        c = lab == i; ys, xs = np.where(c)
        core = ndi.binary_erosion(c, structure=np.array([[0,1,0],[1,1,1],[0,1,0]]))
        out[i] = dict(area=int(c.sum()), core=int(core.sum()), cx=float(xs.mean()), cy=float(ys.mean()),
                      h=int(np.ptp(ys) + 1), w=int(np.ptp(xs) + 1))
    return out
