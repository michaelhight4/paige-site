"""Previews for Gary of the staged transparent battle FX (effects/_transparent_staging/_preview/):
  impacts_contact_sheet.png  every impact frame (2x) on a checkerboard, one row per element, canvas outline + anchor tick
  impacts_preview.gif        each impact plays in turn over 4 backgrounds: pilot battle scene (foe), checkerboard,
                             day (game battle_bg.png around the foe platform, palette-snapped), night (same, grades.night.map)
  travel_preview.gif         every travel_p2f + travel_f2p on the 2x pilot battle scene at the JSON canvas offset
Exact palettes (<256 colours), no dithering. Each file must stay < 20 MB (checked)."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import build_transparent_staging as B, gen_effects as G
from fxlib import up

ST = B.STAGE; OUT = f'{ST}/_preview'; os.makedirs(OUT, exist_ok=True)
ELS = list(B.EL.ELEMENTS)
PALC = np.unique(np.array(Image.open('/workspace/kilumen/art/world/overworld/palette.png').convert('RGB')).reshape(-1, 3), axis=0); assert len(PALC) == 64
NIGHT = json.load(open('/workspace/kilumen/art/world/overworld/time_of_day/grades.json'))['grades']['night']['map']
FONT = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Pixelify Sans/PixelifySans-VariableFont_wght.ttf', 16)
TXT, BAR = (252, 246, 232), (26, 18, 38)

def load(el, an):
    d = f'{ST}/{el}/{an}'; b = f'{el}_{an}_battle_2x'
    g = Image.open(f'{d}/{b}.gif'); fr = []
    for i in range(g.n_frames): g.seek(i); fr.append(np.array(g.convert('RGBA')))
    return fr, json.load(open(f'{d}/{b}.json'))

def checker(w, h, s=8):
    y, x = np.mgrid[:h, :w]; c = ((x // s + y // s) % 2).astype(bool)
    a = np.empty((h, w, 3), 'uint8'); a[c] = (150, 150, 158); a[~c] = (110, 110, 118); return a

def snap(rgb):
    d = ((rgb[:, :, None, :].astype(int) - PALC[None, None].astype(int)) ** 2).sum(-1)
    return PALC[d.argmin(-1)].astype('uint8')

def night(rgb):
    lut = {tuple(int(k[i:i + 2], 16) for i in (0, 2, 4)): tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) for k, v in NIGHT.items()}
    out = rgb.copy(); flat = out.reshape(-1, 3)
    for i, c in enumerate(map(tuple, flat)): flat[i] = lut.get(c, c)
    return out

def paste(bg, fr, x, y):
    out = bg.copy(); h, w = fr.shape[:2]; H, W = bg.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return out
    sub = fr[y0 - y:y1 - y, x0 - x:x1 - x]; m = sub[..., 3] > 0
    out[y0:y1, x0:x1][m] = sub[..., :3][m]; return out

def text(img, xy, s):
    im = Image.fromarray(img); d = ImageDraw.Draw(im); d.fontmode = '1'; d.text(xy, s, fill=TXT, font=FONT); return np.array(im)

def save_exact_gif(frames, ms, path):
    allc = np.unique(np.concatenate([f.reshape(-1, 3) for f in frames]), axis=0)
    assert len(allc) <= 256, len(allc)
    key = lambda a: (a[..., 0].astype(np.int64) << 16) | (a[..., 1].astype(np.int64) << 8) | a[..., 2]
    ks = key(allc); pal = allc.reshape(-1).tolist() + [0] * (768 - allc.size)
    ims = []
    for f in frames:
        idx = np.searchsorted(ks, key(f)).astype('uint8'); p = Image.fromarray(idx, 'P'); p.putpalette(pal); ims.append(p)
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=ms, loop=0, optimize=False, disposal=1)
    return len(allc)

data = {el: load(el, 'impact') for el in ELS}
# ---------- contact sheet ----------
LW = 120; rows = []
maxw = max(LW + len(f) * (m['frame_w'] + 6) for f, m in data.values())
for el, (fr, m) in data.items():
    w, h = m['frame_w'], m['frame_h']; row = np.zeros((h + 28, maxw, 3), 'uint8'); row[:] = BAR
    row = text(row, (6, 4), el); row = text(row, (6, 22), f"{w}x{h}"); row = text(row, (6, 40), f"{len(fr)}f {m['frames'][0]['ms']}ms")
    ax, ay = m['anchor']['x'], m['anchor']['y']
    for i, f in enumerate(fr):
        x = LW + i * (w + 6); cell = checker(w, h); cell = paste(cell, f, 0, 0)
        cell[ay, max(0, ax - 3):ax + 4] = (255, 0, 255); cell[max(0, ay - 3):ay + 4, ax] = (255, 0, 255)   # anchor
        row[22:22 + h, x:x + w] = cell; row = text(row, (x, 2), f'f{i}')
    rows.append(row)
cs = np.concatenate(rows, 0)
cs = text(np.concatenate([np.full((30, maxw, 3), BAR, 'uint8'), cs]), (6, 6),
          'Kilumen impacts - transparent, effect-sized (2x). Magenta cross = JSON anchor (impact centre). Checker = transparent.')
Image.fromarray(cs).save(f'{OUT}/impacts_contact_sheet.png', optimize=True)

# ---------- impact preview gif (4 backgrounds) ----------
L = max(m['anchor']['x'] for _, m in data.values()); R = max(m['frame_w'] - m['anchor']['x'] for _, m in data.values())
T = max(m['anchor']['y'] for _, m in data.values()); Bt = max(m['frame_h'] - m['anchor']['y'] for _, m in data.values())
PW, PH = L + R + 8, T + Bt + 8; AX, AY = L + 4, T + 4          # anchor position inside every panel
pilot2 = up(G.BG)[..., :3]; fx, fy = G.FOE_CENTER[0] * 2, G.FOE_CENTER[1] * 2
pp = np.zeros((PH, PW, 3), 'uint8'); pp[:] = BAR
sx0, sy0 = fx - AX, fy - AY
src = pilot2[max(0, sy0):sy0 + PH, max(0, sx0):sx0 + PW]; pp[max(0, -sy0):max(0, -sy0) + src.shape[0], max(0, -sx0):max(0, -sx0) + src.shape[1]] = src
bbg = np.array(Image.open('/workspace/kilumen/art/world/battle_bg.png').convert('RGB').resize((640, 360), Image.BOX))
cx, cy = int(470 / 640 * 640), int(240 / 360 * 360) - 30          # foe platform (centre slightly above the platform)
day = np.zeros((PH, PW, 3), 'uint8'); x0, y0 = cx - AX, cy - AY
cut = bbg[max(0, y0):y0 + PH, max(0, x0):x0 + PW]; day[max(0, -y0):max(0, -y0) + cut.shape[0], max(0, -x0):max(0, -x0) + cut.shape[1]] = cut
day = snap(day); nig = night(day); chk = checker(PW, PH)
panels = [('pilot battle scene', pp), ('checkerboard', chk), ('day (battle_bg)', day), ('night (grades.night)', nig)]
GAP, TOP = 6, 26
FW = len(panels) * PW + (len(panels) + 1) * GAP; FH = PH + TOP + GAP
frames, ms = [], []
def compose(f, title):
    img = np.zeros((FH, FW, 3), 'uint8'); img[:] = BAR
    for k, (nm, bg) in enumerate(panels):
        x = GAP + k * (PW + GAP); p = bg if f is None else paste(bg, f, AX - meta['anchor']['x'], AY - meta['anchor']['y'])
        img[TOP:TOP + PH, x:x + PW] = p; img = text(img, (x + 4, TOP + PH - 22), nm)
    return text(img, (GAP, 4), title)
for el, (fr, meta) in data.items():
    for i, f in enumerate(fr):
        frames.append(compose(f, f"{el}  impact  f{i}/{len(fr) - 1}  {meta['frames'][i]['ms']} ms  canvas {meta['frame_w']}x{meta['frame_h']}"))
        ms.append(meta['frames'][i]['ms'])
    frames.append(compose(None, f'{el}  (end - overlay removed)')); ms.append(500)
nc = save_exact_gif(frames, ms, f'{OUT}/impacts_preview.gif')

# ---------- travel preview gif ----------
tf, tms = [], []
for el in ELS:
    for an in ('travel_p2f', 'travel_f2p'):
        fr, m = load(el, an); ox, oy = m['anchor']['canvas_offset_on_pilot_screen_2x']
        for i, f in enumerate(fr):
            img = paste(pilot2, f, ox, oy); img[:22] = BAR
            tf.append(text(img, (6, 2), f'{el}  {an}  f{i}  {m["frames"][i]["ms"]} ms  canvas {m["frame_w"]}x{m["frame_h"]}')); tms.append(m['frames'][i]['ms'])
        img = pilot2.copy(); img[:22] = BAR; tf.append(text(img, (6, 2), f'{el}  {an}  (end)')); tms.append(300)
nt = save_exact_gif(tf, tms, f'{OUT}/travel_preview.gif')

for f in ('impacts_contact_sheet.png', 'impacts_preview.gif', 'travel_preview.gif'):
    p = f'{OUT}/{f}'; s = os.path.getsize(p); im = Image.open(p)
    print(f'{p}  {im.size[0]}x{im.size[1]}  frames={getattr(im, "n_frames", 1)}  {s / 1e6:.2f} MB  {"OK <20MB" if s < 20e6 else "TOO BIG"}')
    assert s < 20e6
print('colours: impacts gif', nc, 'travel gif', nt, ' panel', PW, PH)
