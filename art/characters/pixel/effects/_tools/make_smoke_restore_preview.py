"""2026-10-30 smoke restore: BEFORE (smokeless 2026-10-22 staging, kept in _transparent_staging_prev_nosmoke_20261022) | AFTER
(current staging, original smoke restored). Per element: <el>_before_after.gif (3 anims, each twice) + <el>_contact.png;
plus overview.gif / overview_contact.png. Checkerboard + night battle_bg panels."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
E0 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEF, AFT = f'{E0}/_transparent_staging_prev_nosmoke_20261022', f'{E0}/_transparent_staging'
OUT = f'{AFT}/_smoke_restore_preview'; os.makedirs(OUT, exist_ok=True)
ELS = 'fire magma devil demon earth swamp bug ghost'.split(); ANIMS = ('impact', 'travel_p2f', 'travel_f2p')
FONT = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Pixelify Sans/PixelifySans-VariableFont_wght.ttf', 16)
import validate_transparent_bg as VB
def load(root, el, an):
    b = f'{root}/{el}/{an}/{el}_{an}_battle_2x'; g = Image.open(b + '.gif'); fr = []
    for i in range(g.n_frames): g.seek(i); fr.append(np.array(g.convert('RGBA')))
    return fr, [f['ms'] for f in json.load(open(b + '.json'))['frames']]
def checker(w, h):
    y, x = np.mgrid[:h, :w]; c = ((x // 8 + y // 8) % 2).astype(bool); a = np.empty((h, w, 3), 'uint8'); a[c] = (150, 150, 158); a[~c] = (110, 110, 118); return a
NB = VB.NBG
def nightbg(w, h):
    y0, x0 = max(0, 210 - h // 2), max(0, 470 - w // 2 - 40); x0 = min(x0, 640 - w) if w <= 640 else 0
    out = np.full((h, w, 3), (26, 18, 38), 'uint8'); c = NB[y0:y0 + h, x0:x0 + w]; out[:c.shape[0], :c.shape[1]] = c; return out
def paste(bg, f):
    p = bg.copy(); h, w = f.shape[:2]; H, W = p.shape[:2]; oy, ox = (H - h) // 2, (W - w) // 2
    m = f[..., 3] > 0; reg = p[oy:oy + h, ox:ox + w]; reg[m] = f[..., :3][m]; return p
def changed(b, a): return len(b) != len(a) or b[0].shape != a[0].shape or any(not np.array_equal(x, y) for x, y in zip(b, a))
summary = {}; ov_frames, ov_ms = [], []; ov_rows = []
for el in ELS:
    data = [(an, load(BEF, el, an), load(AFT, el, an)) for an in ANIMS]
    PW = max(max(b[0][0].shape[1], a[0][0].shape[1]) for _, b, a in data) + 12
    PH = max(max(b[0][0].shape[0], a[0][0].shape[0]) for _, b, a in data) + 12
    CH, NG = checker(PW, PH), nightbg(PW, PH)
    W, H = PW * 4 + 30, PH + 50; frames, ms = [], []
    summary[el] = {an: changed(b[0], a[0]) for an, b, a in data}
    for an, (bf, bms), (af, ams) in data:
        n = max(len(bf), len(af))
        for rep in range(2):
            for i in range(n):
                im = Image.new('RGB', (W, H), (26, 18, 38)); d = ImageDraw.Draw(im); d.fontmode = '1'
                d.text((6, 4), f"{el} {an}  {'smoke restored' if summary[el][an] else 'unchanged'}  f{i}", font=FONT, fill=(252, 246, 232))
                for k, (fr, lab, bg) in enumerate(((bf, 'BEFORE chk', CH), (af, 'AFTER chk', CH), (bf, 'BEFORE night', NG), (af, 'AFTER night', NG))):
                    x = 6 + k * (PW + 6); im.paste(Image.fromarray(paste(bg, fr[min(i, len(fr) - 1)])), (x, 44)); d.text((x, 24), lab, font=FONT, fill=(255, 210, 74) if 'AFTER' in lab else (180, 180, 190))
                frames.append(im); ms.append((bms + [bms[-1]] * n)[i])
    frames[0].save(f'{OUT}/{el}_before_after.gif', save_all=True, append_images=frames[1:], duration=ms, loop=0)
    # contact sheet: rows = anim x (before, after), all frames on checker
    rows = []
    for an, (bf, _), (af, _) in data:
        for lab, fr in (('before', bf), ('after', af)):
            h, w = fr[0].shape[:2]; row = Image.new('RGB', (150 + len(fr) * (w + 4), h + 8), (26, 18, 38)); d = ImageDraw.Draw(row); d.fontmode = '1'
            d.text((4, 4), f'{an}', font=FONT, fill=(252, 246, 232)); d.text((4, 22), lab, font=FONT, fill=(255, 210, 74) if lab == 'after' else (180, 180, 190))
            for i, f in enumerate(fr): row.paste(Image.fromarray(paste(checker(w, h), f)), (150 + i * (w + 4), 4))
            rows.append(row)
    cw = max(r.width for r in rows); cs = Image.new('RGB', (cw, sum(r.height for r in rows) + 30), (26, 18, 38)); y = 30
    ImageDraw.Draw(cs).text((4, 6), f'{el}: before (smokeless 10-22) vs after (smoke restored 10-30), 2x, checker = transparent', font=FONT, fill=(252, 246, 232))
    for r in rows: cs.paste(r, (0, y)); y += r.height
    cs.save(f'{OUT}/{el}_contact.png', optimize=True)
    # overview: impact only, all elements
    (bf, bms), (af, _) = data[0][1], data[0][2]; ov_rows.append((el, bf, af, bms))
PW = max(max(b[0].shape[1], a[0].shape[1]) for _, b, a, _ in ov_rows) + 8; PH = max(max(b[0].shape[0], a[0].shape[0]) for _, b, a, _ in ov_rows) + 30
COLS = 4; W = COLS * (PW * 2 + 14); H = 30 + ((len(ov_rows) + COLS - 1) // COLS) * PH; CH = checker(PW, PH - 22)
n = max(max(len(b), len(a)) for _, b, a, _ in ov_rows); frames = []
for rep in range(3):
    for i in range(n):
        im = Image.new('RGB', (W, H), (26, 18, 38)); d = ImageDraw.Draw(im); d.fontmode = '1'
        d.text((6, 6), 'Kilumen staged impacts: BEFORE (smokeless) | AFTER (smoke restored)  -  2026-10-30, not live', font=FONT, fill=(252, 246, 232))
        for k, (el, bf, af, _) in enumerate(ov_rows):
            cx, cy = (k % COLS) * (PW * 2 + 14), 30 + (k // COLS) * PH
            d.text((cx + 4, cy), el, font=FONT, fill=(255, 210, 74))
            for j, fr in enumerate((bf, af)): im.paste(Image.fromarray(paste(CH, fr[min(i, len(fr) - 1)])), (cx + 4 + j * (PW + 4), cy + 20))
        frames.append(im)
frames[0].save(f'{OUT}/overview_impacts_before_after.gif', save_all=True, append_images=frames[1:], duration=100, loop=0)
ov = Image.new('RGB', (W, 30 + len(ELS) * 0), (26, 18, 38))
sheets = [Image.open(f'{OUT}/{el}_contact.png') for el in ELS]
ow = max(s.width for s in sheets); ov = Image.new('RGB', (ow, sum(s.height for s in sheets)), (26, 18, 38)); y = 0
for s in sheets: ov.paste(s, (0, y)); y += s.height
ov.thumbnail((ow // 2, 100000), Image.NEAREST); ov.save(f'{OUT}/overview_contact.png', optimize=True)
json.dump(summary, open(f'{OUT}/changed.json', 'w'), indent=1); print(json.dumps(summary))
