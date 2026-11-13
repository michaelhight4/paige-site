# Coach trainer model (Oct 29 2026): one base sprite (track jacket, cap, whistle) built from tr_gymtrainer_m's chibi frames,
# then a per-town palette swap from coach_palettes.json. Output: npcs/coach/coach_<town>/overworld/coach_<town>_chibi_sheet(.png,_2x,_3x)
# plus a coach_sheet_all.png preview. Roles are recoloured by region (cap = hair above the forehead, jacket = torso/arms above
# the belt, pants = belt..ankles), so the base keeps its outline and hue-shifted shading.
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BASE = os.path.join(ROOT, '..', 'tr_gymtrainer_m', 'overworld', 'tr_gymtrainer_m_chibi_sheet.png')
H = lambda s: tuple(int(s[i:i+2], 16) for i in (1, 3, 5)) + (255,)
SKIN = {H(c) for c in ('#e8ce92', '#deb478', '#ecdec4')}
HAIR = {H('#92623e'): 1, H('#6a442e'): 2, H('#462c22'): 3}
SASH = {H('#e29d40'): 0, H('#c46e2e'): 1, H('#9f4013'): 2}
FOLD = H('#6a3019')
OUT = H('#2c2320'); MET = [H('#ecdec4'), H('#a8a0a4'), H('#827a84')]
# roles as marker colours in the base (index into the town palette)
def frame_info(sh, c):
    f = sh.crop((c * 64, 0, c * 64 + 64, 96)).load()
    R = H('#e8ce92'); rows = [y for y in range(4, 45) if sum(f[x, y] == R for x in range(64)) >= 3]
    fore = rows[0]; s0 = next(y for y in range(fore + 12, 60) if sum(f[x, y] == R for x in range(64)) == 0)
    return fore, s0  # forehead row, shirt start (first row under the neck)
def build_base(sh):
    out = sh.copy(); px = out.load(); roles = {}
    for c in range(5):
        fore, s0 = frame_info(sh, c)
        for r in range(4):
            ox, oy = c * 64, r * 96
            g = lambda x, y: px[ox + x, oy + y]
            sash = [y for y in range(s0, 80) if any(g(x, y) in SASH for x in range(64))]
            belt = sash[-1] if sash else s0 + 30
            for y in range(96):
                for x in range(64):
                    p = g(x, y)
                    if p[3] == 0: continue
                    capb = fore + (7 if r == 3 else 3 if r in (1, 2) else 0)
                    if s0 <= y <= belt and p == FOLD: roles[(ox + x, oy + y)] = ('jacket', 3); continue
                    if y <= capb and p in HAIR: roles[(ox + x, oy + y)] = ('jacket', HAIR[p] - 1 + (0 if y > 7 else 0))
                    elif s0 <= y <= belt and p in HAIR: roles[(ox + x, oy + y)] = ('jacket', HAIR[p])
                    elif s0 <= y <= belt and p in SASH: roles[(ox + x, oy + y)] = ('trim', SASH[p])
                    elif belt < y < 80 and p in HAIR: roles[(ox + x, oy + y)] = ('pants', HAIR[p] - 1)
            row = [x for x in range(64) if g(x, fore)[3]]
            if row:  # cap brim: forehead row darkens to the brim, the row under it gets brim shade on skin
                x0, x1 = row[0], row[-1]
                for x in range(x0 + 1, x1):
                    if g(x, fore) != OUT: roles[(ox + x, oy + fore)] = ('jacket', 3)
                    if r != 3 and g(x, fore + 1) in SKIN: px[ox + x, oy + fore + 1] = H('#ba8856')
                ext = {1: range(x0 - 4, x0 + 1), 2: range(x1, x1 + 5)}.get(r, ())
                for x in ext:  # side views: brim sticks out over the face
                    roles[(ox + x, oy + fore)] = ('jacket', 3); px[ox + x, oy + fore - 1] = px[ox + x, oy + fore - 1] if px[ox + x, oy + fore - 1][3] else OUT
                    px[ox + x, oy + fore + 1] = px[ox + x, oy + fore + 1] if px[ox + x, oy + fore + 1][3] else OUT
                if ext: e = ext[0] - 1 if r == 1 else ext[-1] + 1; px[ox + e, oy + fore] = OUT
                # 1px top-edge highlight on the cap crown
                top = min(y for y in range(96) if g((x0 + x1) // 2, y)[3])
                for x in range(x0 + 4, x1 - 3):
                    for y in range(top, fore):
                        if (ox + x, oy + y) in roles: roles[(ox + x, oy + y)] = ('jacket', 0); break
            # whistle + cord (not on the back view)
            if r != 3:
                wy = s0 + 6; ch = [x for x in range(64) if g(x, wy)[3]]
                cx = {0: 32, 1: ch[0] + 3, 2: ch[-1] - 5}[r]
                cord = [(cx - 4 + i, s0 + i) for i in range(5)] if r != 1 else [(cx + 6 - i, s0 + i) for i in range(5)] + ([(cx + 6 - i, s0 + i) for i in range(5)] if r == 0 else [])
                for (x, y) in cord: roles.pop((ox + x, oy + y), None); px[ox + x, oy + y] = MET[1]
                for dy in range(-1, 4):
                    for dx in range(-1, 4):
                        x, y = cx + dx, wy + dy; roles.pop((ox + x, oy + y), None)
                        px[ox + x, oy + y] = OUT if dx in (-1, 3) or dy in (-1, 3) else MET[0] if dy == 0 else MET[1] if dx < 2 else MET[2]
            if r == 0:  # zipper stripe
                for y in range(s0 + 11, belt - 6):
                    if (ox + 31, oy + y) in roles and roles[(ox + 31, oy + y)][0] == 'jacket': roles[(ox + 31, oy + y)] = ('trim', 1)
    return out, roles
def render(base, roles, pal):
    im = base.copy(); px = im.load()
    for (x, y), (role, i) in roles.items(): px[x, y] = H(pal[role][max(0, min(i, len(pal[role]) - 1))])
    return im
if __name__ == '__main__':
    pals = json.load(open(os.path.join(HERE, 'coach_palettes.json')))['towns']
    sh = Image.open(BASE).convert('RGBA'); base, roles = build_base(sh)
    sheets = []
    for town, pal in pals.items():
        im = render(base, roles, pal); d = os.path.join(ROOT, f'coach_{town}', 'overworld'); os.makedirs(d, exist_ok=True)
        im.save(f'{d}/coach_{town}_chibi_sheet.png')
        for k in (2, 3): im.resize((im.width * k, im.height * k), Image.NEAREST).save(f'{d}/coach_{town}_chibi_sheet_{k}x.png')
        sheets.append((town, im))
    W = 5 * 64 + 8; prev = Image.new('RGBA', (W * len(sheets), 384 + 16), (40, 46, 60, 255))
    for i, (t, im) in enumerate(sheets): prev.alpha_composite(im, (i * W + 4, 14))
    prev.save(os.path.join(ROOT, 'coach_sheet_all.png')); print('coach sheets:', [t for t, _ in sheets])
