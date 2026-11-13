"""Step 3 (pilot step3_battle_anim): static 128px battle sprites (+2x) and 4-frame idle
loops for front and back, built from the ONE cleaned base per view (no drift).
Idle = pilot recipe: body above 72% height bobs 0/-1/-2/-1 px with crystal/lava glow
0/1/2/1 (lava glow only on Slagrook, violet crystals on all); floaters (Gloamtick) bob as a whole."""
import os
from wild_pxlib import *
from PIL import Image
FLOAT = {'gloamtick'}
MS = [180, 160, 200, 160]

def main(only=None):
    for n in WILD:
        if only and n not in only: continue
        C = f'{CRE}/{n}'; os.makedirs(f'{C}/battle', exist_ok=True); os.makedirs(f'{C}/anim', exist_ok=True)
        for view in ('front', 'back'):
            spr = Image.open(f'{C}/base/{n}_{view}.png'); h = spr.height
            c, _ = place(spr, 128, 128, bottom=True, pad_b=2)
            c.save(f'{C}/battle/{n}_{view}_128.png'); up(c, 2).save(f'{C}/battle/{n}_{view}_128_2x.png')
            base = canvas(spr, 128, 128, (128 - spr.width) // 2, 128 - h - 2); top = 128 - h - 2
            split = 128 if n in FLOAT else top + int(h * 0.72)
            idle = [glow(bob(base, split, dy), g, lava_on=(n == 'slagrook')) for dy, g in ((0, 0), (-1, 1), (-2, 2), (-1, 1))]
            save_anim(idle, f'{C}/anim', f'{n}_{view}_idle', MS)
        print(n, 'battle ok')

if __name__ == '__main__':
    import sys; main(sys.argv[1:] or None)
