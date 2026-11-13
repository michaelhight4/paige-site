"""Step 4 (pilot step4_overworld): 64x64 chibi overworld walk, 4 directions
(down, left, right, up) x (1 stand + 4 walk frames), exported native + 2x + 3x, sheets,
per-direction GIFs and a combined walk_all GIF. All frames derive from one base per view.
Leg motion per creature follows the pilot recipes: quad=True for 4/6-legged walkers
(Cindrip OW recipe), biped profile leg duplication for Sailquill (Cal chibi recipe),
hover bob + tail sway for the legless Gloamtick."""
from wild_pxlib import *
from PIL import Image
P = {  # legfrac, kwargs
    'sailquill': (0.16, dict(lift=1, stride=2, bodybob=1, sidefrac=0.12)),
    'halovy': (0.30, dict(lift=2, stride=2, bodybob=1, sidefrac=0.26, quad=True)),
    'gloamtick': (0.38, dict(hover=True)),
    'runeskein': (0.24, dict(lift=2, stride=2, bodybob=1, sidefrac=0.22, quad=True)),
    'burlbeetle': (0.26, dict(lift=2, stride=2, bodybob=1, sidefrac=0.26, quad=True)),
    'mirewump': (0.22, dict(lift=2, stride=2, bodybob=1, sidefrac=0.22, quad=True)),
    'slagrook': (0.24, dict(lift=2, stride=2, bodybob=1, sidefrac=0.24, quad=True)),
}
MS = {'gloamtick': 160, 'mirewump': 150, 'burlbeetle': 150}

def main(only=None):
    for n in WILD:
        if only and n not in only: continue
        C = f'{CRE}/{n}'
        views = {d: Image.open(f'{C}/base/{n}_ow_{d}.png') for d in ['down', 'left', 'right', 'up']}
        lf, kw = P[n]
        export_set(f'{C}/overworld', f'{n}_ow', views, 64, 64, lf, [2, 3], MS.get(n, 130), **kw)
        print(n, 'ow ok')

if __name__ == '__main__':
    import sys; main(sys.argv[1:] or None)
