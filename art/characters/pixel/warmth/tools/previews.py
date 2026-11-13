"""Preview renders for Crystal Warmth (previews only, NOT runtime assets). Run after build.py."""
import os, pickle, numpy as np
from PIL import Image, ImageDraw
from wlib import *
from ramps import *
from build import recolor, WARM
OUT = os.path.join(WARM, '_preview'); os.makedirs(OUT, exist_ok=True)
L = pickle.load(open('/tmp/w/labels.pkl', 'rb'))
ORDER = ['tumbloam', 'burrowmane', 'bastonox', 'cindrip', 'emberlunx', 'forgeharrow', 'rillop', 'brookhorn', 'tidemarrow',
         'sailquill', 'halovy', 'gloamtick', 'runeskein', 'burlbeetle', 'mirewump', 'slagrook']
BG = (0x3e, 0x3a, 0x48); GRASS = (0x52, 0x98, 0x3a); TXT = (0xfc, 0xf6, 0xe8)
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def stage_img(n, rel, s):
    a = load(n, rel); return recolor(a, L[n][rel] == 1, dict(zip(V, stages(n)[s])))
def pim(a, sc=1): im = Image.fromarray(a, 'RGBA'); return im.resize((im.width * sc, im.height * sc), Image.NEAREST)
def rel_of(n, kind):
    return [r for r in L[n] if r.startswith('battle/') and f'_{kind}_' in r][0]
def paste_c(canvas, im, cx, cy): canvas.alpha_composite(im, (cx - im.width // 2, cy - im.height // 2))

def all_2x():
    cell = 320; lab = 150; head = 24
    can = Image.new('RGBA', (lab + 4 * cell, head + len(ORDER) * cell), BG + (255,)); d = ImageDraw.Draw(can)
    for s, lo, hi, t in THRESHOLDS: d.text((lab + s * cell + 6, 6), f'stage {s}  Warmth {lo}-{hi}  {t}', fill=TXT)
    for r, n in enumerate(ORDER):
        y = head + r * cell; fam = CREATURES[n][0]; sig = RAMPS[fam][0]
        d.text((6, y + 8), n, fill=TXT); d.text((6, y + 22), f'{CREATURES[n][1]}', fill=TXT)
        d.text((6, y + 36), f'#{sig} {RAMPS[fam][1]}', fill=TXT); d.rectangle([6, y + 52, 40, y + 70], fill=rgb(sig))
        for s in range(4):
            paste_c(can, pim(stage_img(n, rel_of(n, 'front'), s), 2), lab + s * cell + cell // 2, y + cell // 2)
            for i, h in enumerate(stages(n)[s]): d.rectangle([lab + s * cell + 6 + i * 12, y + cell - 16, lab + s * cell + 16 + i * 12, y + cell - 6], fill=rgb(h))
        d.line([(0, y), (can.width, y)], fill=(0x54, 0x44, 0x4e))
    can.convert('RGB').save(os.path.join(OUT, 'warmth_all_2x.png'))

def ow_sheet():
    # overworld readability: 4 stands x 4 stages at 1x (true size), plus down/left at 2x, on grass. One image per 4 creatures.
    dirs = ['down', 'left', 'right', 'up']
    for part in range(4):
        names = ORDER[part * 4:(part + 1) * 4]; rows = []
        for n in names:
            ims = {(s, dd): stage_img(n, f'overworld/{n}_ow/{n}_ow_{dd}_stand.png', s) for s in range(4) for dd in dirs}
            w = max(a.shape[1] for a in ims.values()); h = max(a.shape[0] for a in ims.values())
            rows.append((n, ims, w, h))
        W = 100 + 4 * max(max(4 * (w + 4), 2 * (2 * w + 4)) + 12 for _, _, w, _ in rows)
        H = 18 + sum(3 * h + 20 for _, _, _, h in rows)
        can = Image.new('RGBA', (W, H), GRASS + (255,)); d = ImageDraw.Draw(can); y = 18
        for s in range(4): d.text((100 + s * (W - 100) // 4 + 2, 3), f'stage {s}: 1x row = true overworld size, 2x below', fill=TXT)
        for n, ims, w, h in rows:
            d.text((4, y + 4), n, fill=TXT)
            for s in range(4):
                x0 = 100 + s * (W - 100) // 4
                for k, dd in enumerate(dirs):
                    can.alpha_composite(pim(ims[s, dd], 1), (x0 + k * (w + 4), y))
                    if k < 2: can.alpha_composite(pim(ims[s, dd], 2), (x0 + k * (2 * w + 4), y + h + 4))
            y += 3 * h + 20
        can.convert('RGB').save(os.path.join(OUT, f'warmth_overworld_check_{part + 1}.png'))

def diff_check():
    # stage 3 vs stage 0 for every battle front/back + ow stand: changed pixels in red over a greyed sprite,
    # and a count of changed pixels outside the mask (must be 0).
    tiles = []; outside = 0
    for n in ORDER:
        for rel in [rel_of(n, 'front'), rel_of(n, 'back')] + [f'overworld/{n}_ow/{n}_ow_{dd}_stand.png' for dd in ('down', 'left', 'right', 'up')]:
            a = load(n, rel); o = stage_img(n, rel, 3); ch = (a != o).any(-1); outside += int((ch & ~(L[n][rel] == 1)).sum())
            g = a.copy(); m = a[..., 3] > 0; gv = a[..., :3].mean(-1).astype(np.uint8)
            g[m, 0] = g[m, 1] = g[m, 2] = gv[m] // 2 + 40; g[ch, :3] = (255, 40, 40)
            tiles.append(pim(g, 1 if rel.startswith('battle') else 2))
    cols = 8; cw = 164; can = Image.new('RGBA', (cols * cw, ((len(tiles) + cols - 1) // cols) * cw + 20), (20, 20, 24, 255))
    for i, t in enumerate(tiles): can.alpha_composite(t, ((i % cols) * cw + (cw - t.width) // 2, 20 + (i // cols) * cw + (cw - t.height) // 2))
    ImageDraw.Draw(can).text((4, 4), f'red = pixels changed at stage 3 vs stage 0; changed pixels outside crystal masks: {outside}', fill=TXT)
    can.convert('RGB').save(os.path.join(OUT, 'warmth_diff_check.png')); return outside

def gif_battle():
    cell = 168; frames = []
    for s in [0, 1, 2, 3, 2, 1]:
        for f in range(4):
            can = Image.new('RGBA', (4 * cell, 4 * cell + 18), BG + (255,)); d = ImageDraw.Draw(can)
            d.text((4, 3), f'stage {s}  (Warmth {THRESHOLDS[s][1]}-{THRESHOLDS[s][2]})', fill=TXT)
            for i, n in enumerate(ORDER):
                rel = [r for r in L[n] if '_front_idle_f%d' % f in r][0]
                im = pim(stage_img(n, rel, s), 1)
                im = im.resize((im.width * 160 // im.width, im.height * 160 // im.width), Image.NEAREST) if im.width > 160 else im
                can.alpha_composite(im, ((i % 4) * cell + (cell - im.width) // 2, 18 + (i // 4) * cell + (cell - im.height) // 2))
            frames.append(can.convert('RGB'))
    frames[0].save(os.path.join(OUT, 'warmth_battle_fronts.gif'), save_all=True, append_images=frames[1:], duration=220, loop=0)

def gif_overworld():
    cell = 3 * max(max(load(n, f'overworld/{n}_ow/{n}_ow_left_walk{f}.png').shape[:2]) for n in ORDER for f in range(4)) + 8; frames = []
    for s in [0, 1, 2, 3, 2, 1]:
        for rep in range(2):
            for f in range(4):
                can = Image.new('RGBA', (4 * cell, 4 * cell + 18), GRASS + (255,)); d = ImageDraw.Draw(can)
                d.text((4, 3), f'Trail Buddy (3x)  stage {s}  (Warmth {THRESHOLDS[s][1]}-{THRESHOLDS[s][2]})', fill=TXT)
                for i, n in enumerate(ORDER):
                    rel = f'overworld/{n}_ow/{n}_ow_left_walk{f}.png'
                    can.alpha_composite(pim(stage_img(n, rel, s), 3), ((i % 4) * cell + 4, 18 + (i // 4) * cell + 4))
                frames.append(can.convert('RGB'))
    frames[0].save(os.path.join(OUT, 'warmth_overworld_walk_3x.gif'), save_all=True, append_images=frames[1:], duration=150, loop=0)

def gif_single(n='bastonox'):
    frames = []
    for s in [0, 1, 2, 3]:
        for f in range(4):
            rel = [r for r in L[n] if '_front_idle_f%d' % f in r][0]
            can = Image.new('RGBA', (360, 360), BG + (255,))
            paste_c(can, pim(stage_img(n, rel, s), 2), 180, 175)
            ImageDraw.Draw(can).text((6, 342), f'{n} stage {s}', fill=TXT); frames.append(can.convert('RGB'))
    frames[0].save(os.path.join(OUT, f'warmth_{n}_2x.gif'), save_all=True, append_images=frames[1:], duration=200, loop=0)

if __name__ == '__main__':
    all_2x(); ow_sheet(); print('outside-mask changes:', diff_check()); gif_battle(); gif_overworld(); gif_single('bastonox'); gif_single('gloamtick')
    print(sorted(os.listdir(OUT)))
