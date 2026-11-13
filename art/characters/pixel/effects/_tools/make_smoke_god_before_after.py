"""One-off review GIF for the 2026-10-22 no-smoke + god-column fix: BEFORE (pre-fix staging snapshot) | AFTER (current staging),
fire / magma / devil (impact + both travels) and god impact, each played twice, on a checkerboard. Output < 10 MB."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import build_transparent_staging as B

BEFORE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/kfx_scratch/before/stage'
OUT = f'{B.STAGE}/_preview/smoke_god_fix_before_after.gif'
FONT = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Pixelify Sans/PixelifySans-VariableFont_wght.ttf', 16)
SEGS = [(e, a) for e in ('fire', 'magma', 'devil') for a in B.ANIMS] + [('god', 'impact')]

def load(root, el, an):
    b = f'{root}/{el}/{an}/{el}_{an}_battle_2x'
    g = Image.open(b + '.gif'); fr = []
    for i in range(g.n_frames): g.seek(i); fr.append(np.array(g.convert('RGBA')))
    return fr, [f['ms'] for f in json.load(open(b + '.json'))['frames']]

data = [(el, an, load(BEFORE, el, an), load(B.STAGE, el, an)) for el, an in SEGS]
PW = max(max(b[0][0].shape[1], a[0][0].shape[1]) for _, _, b, a in data) + 16
PH = max(max(b[0][0].shape[0], a[0][0].shape[0]) for _, _, b, a in data) + 16
BAR = 28; W, H = PW * 2 + 8, PH + BAR + 22
y, x = np.mgrid[:PH, :PW]; c = ((x // 8 + y // 8) % 2).astype(bool)
CH = np.empty((PH, PW, 3), 'uint8'); CH[c] = (150, 150, 158); CH[~c] = (110, 110, 118)

def panel(f):
    p = CH.copy(); h, w = f.shape[:2]; oy, ox = (PH - h) // 2, (PW - w) // 2
    a = f[..., 3:] > 0; reg = p[oy:oy + h, ox:ox + w]; p[oy:oy + h, ox:ox + w] = np.where(a, f[..., :3], reg)
    d = ImageDraw.Draw(im := Image.fromarray(p)); d.rectangle((ox - 1, oy - 1, ox + w, oy + h), outline=(60, 200, 220))
    return np.array(im)

frames, durs = [], []
for el, an, (bf, bms), (af, ams) in data:
    n = max(len(bf), len(af))
    for rep in range(2):
        for i in range(n):
            im = Image.new('RGB', (W, H), (26, 18, 38)); d = ImageDraw.Draw(im)
            d.text((8, 5), f'{el} {an}' + ('  (column top fix)' if el == 'god' else '  (smoke -> embers/sparks/heat shimmer)'), font=FONT, fill=(252, 246, 232))
            for k, (fr, lab) in enumerate(((bf, 'BEFORE'), (af, 'AFTER'))):
                im.paste(Image.fromarray(panel(fr[min(i, len(fr) - 1)])), (k * (PW + 8), BAR))
                d.text((k * (PW + 8) + 8, BAR + PH + 2), f'{lab}  {fr[0].shape[1]}x{fr[0].shape[0]}', font=FONT, fill=(252, 246, 232))
            frames.append(im); durs.append(ams[min(i, len(ams) - 1)])
        durs[-1] += 300
pal_src = Image.fromarray(np.concatenate([np.array(f) for f in frames[::3]], 0)).quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
q = [f.quantize(palette=pal_src, dither=Image.Dither.NONE) for f in frames]
q[0].save(OUT, save_all=True, append_images=q[1:], duration=durs, loop=0, optimize=True, disposal=1)
print(OUT, len(q), 'frames', W, 'x', H, os.path.getsize(OUT), 'bytes')
assert os.path.getsize(OUT) < 10 * 1024 * 1024
