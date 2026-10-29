"""Crystal display cases v1 (Gary, Oct 29 2026): the ORIGINAL two lab/office crystal cases (furniture v4 KEEP_OLD) redrawn
at the furniture-v2 detail level - same silhouette / design, v2 outline, stepped shading (no dither), v2 drop shadow and
palette - plus a cheap shimmer (tile frame swap, 4 frames in free sheet cells). Collision is NOT touched.

  i_crystal_display (ids 7293 top / 7294 bottom, interiors_new i_furniture_v3.png cells 182/183): tall glass column, one
      floating diamond crystal, pink cap, blue->pink plinth.
  crystal_display   (ids 840 top / 841 bottom, tiles_* interior_v3.png cells 52/53): dark framed case, three-crystal
      cluster, teal trim, charcoal cabinet; also gets plane normals in tiles_1x/interior_v3_n.png (ixlight).
Writes the 1x/2x/3x *_v3.png sheets (2x/3x = nearest upscale, like every v3 cell), interior_v3_n.png and
furniture_v3_anim.json. Run after build_v3_hybrid.py:  python3 tools/furniture_v2/crystal_cases_v1.py
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OW = os.path.join(ROOT, 'art/world/overworld')
O = (24, 18, 30, 255)           # v2 outline
SH, SH2 = (40, 24, 30, 95), (40, 24, 30, 35)  # v2 drop shadow + soft edge
# crystal violet ramp (old case colours, stepped)
CV = dict(hi=(244, 232, 255, 255), l1=(204, 168, 252, 255), l2=(168, 120, 240, 255), m=(138, 86, 222, 255),
          d1=(108, 58, 194, 255), d2=(80, 40, 156, 255), ol=(58, 28, 112, 255), x1=(220, 194, 255, 255), x2=(226, 206, 255, 255))
HALO = [(236, 226, 252, 255), (246, 240, 254, 255)]
FRAMES = 4  # 0 = still art; 1..3 shimmer


class Cv:
    def __init__(s, w=64, h=128): s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); s.px = s.im.load(); s.w, s.h = w, h
    def p(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.px[x, y] = c
    def rect(s, x0, y0, x1, y1, c):  # inclusive
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.p(x, y, c)
    def get(s, x, y): return s.px[x, y]


def shadow(cv, boxes, dx=5, dy=3):
    """v2 drop shadow: solid alpha-95 copy offset right/down, alpha-35 soft rim; drawn first (under the art)."""
    m = set()
    for x0, y0, x1, y1 in boxes:
        for y in range(y0 + dy, y1 + dy + 1):
            for x in range(x0 + dx, x1 + dx + 1): m.add((x, y))
    for (x, y) in m: cv.p(x, y, SH)
    for (x, y) in m:
        for nx, ny in ((x + 1, y), (x, y + 1)):
            if (nx, ny) not in m: cv.p(nx, ny, SH2)


def outline_box(cv, x0, y0, x1, y1, round_bottom=True, round_top=False):
    for x in range(x0, x1 + 1): cv.p(x, y0, O); cv.p(x, y1, O)
    for y in range(y0, y1 + 1): cv.p(x0, y, O); cv.p(x1, y, O)
    if round_bottom: cv.p(x0, y1, (0, 0, 0, 0)) if cv.get(x0, y1) == O else None


def crystal(cv, cx, top, bot, half, mid, f, glint=True):
    """Faceted crystal: left half light, right half dark, upper-left facet highlight, outline in deep violet.
    cx = centre column (crystal spans cx-half .. cx+half-1), widest row = mid. f = shimmer frame."""
    rows = {}
    for y in range(top, bot + 1):
        t = (y - top) / max(1, mid - top) if y <= mid else (bot - y) / max(1, bot - mid)
        hw = max(1, round(half * t)); rows[y] = hw
    for y, hw in rows.items():
        for x in range(cx - hw, cx + hw):
            left = x < cx; up = y <= mid
            if left: c = CV['l1'] if up else CV['l2']
            else: c = CV['m'] if up else CV['d1']
            # upper-left inner facet (bright), lower-right deep facet
            if left and up and x >= cx - hw + 2 and x < cx - 1 and y > top + 2: c = CV['l1'] if (x + y) % 1 else CV['l1']
            if left and up and x - (cx - hw) in (1, 2) and y > top + 3: c = (220, 194, 255, 255)
            if not left and not up and x > cx + 1 and x >= cx + hw - 3: c = CV['d2']
            if not left and up and x >= cx + hw - 2: c = CV['d1']
            cv.p(x, y, c)
        cv.p(cx - hw - 1, y, CV['ol']); cv.p(cx + hw, y, CV['ol'])
    cv.p(cx - 1, top - 1, CV['ol']); cv.p(cx, top - 1, CV['ol']); cv.p(cx - 1, bot + 1, CV['ol']); cv.p(cx, bot + 1, CV['ol'])
    # girdle line at the widest row (facet edge)
    for x in range(cx - rows[mid] + 1, cx + rows[mid] - 1): cv.p(x, mid, CV['l2'] if x < cx else CV['d2'])
    # centre ridge highlight on the light side
    for y in range(top + 2, mid - 1): cv.p(cx - 1, y, CV['hi'] if y < top + 6 else (226, 206, 255, 255))
    if glint and f:  # travelling glint down the light facet + a sparkle
        gy = top + 3 + (f - 1) * (mid - top) // 3
        for k in range(2):
            x = cx - 2 - k
            if gy + k in rows: cv.p(x, gy + k, CV['hi'])
        cv.p(cx - 3, gy, CV['hi'])
    return rows


def halo(cv, inside, f, region):
    """Stepped (no dither) 1-2px glow ring around crystal pixels, only on glass pixels in region; brighter on frame 2."""
    x0, y0, x1, y1 = region
    crys = {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if cv.get(x, y)[:3] in {c[:3] for c in CV.values()}}
    ring1 = {(x + dx, y + dy) for x, y in crys for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - crys
    ring2 = {(x + dx, y + dy) for x, y in ring1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - crys - ring1
    c1 = HALO[1] if f == 2 else HALO[0]
    for (x, y) in ring2:
        if x0 <= x <= x1 and y0 <= y <= y1 and inside(x, y) and f in (2,): cv.p(x, y, HALO[0])
    for (x, y) in ring1:
        if x0 <= x <= x1 and y0 <= y <= y1 and inside(x, y): cv.p(x, y, c1)


def case_a(f):
    """i_crystal_display: glass column x16..47 y26..83 (cap 27..32), plinth x12..51 y84..121."""
    cv = Cv(); shadow(cv, [(16, 26, 47, 83), (12, 84, 51, 121)], dx=4, dy=2)
    G0, G1, G2, GE, W = (206, 238, 250, 255), (176, 224, 242, 255), (143, 206, 232, 255), (70, 146, 206, 255), (252, 252, 255, 255)
    cv.rect(17, 33, 46, 83, G0)
    cv.rect(43, 33, 46, 83, G1); cv.rect(45, 33, 46, 83, G2); cv.p(46, 33, GE)
    for y in range(33, 84): cv.p(46, y, GE); cv.p(17, y, G1)
    cv.rect(17, 78, 46, 83, G1); cv.rect(43, 78, 46, 83, G2)              # floor of the case (depth)
    for y in range(35, 74): cv.p(20, y, W); cv.p(21, y, W if y < 60 else G0)  # glass highlight stripe
    for y in range(36, 46): cv.p(23, y, W)
    # cap (pink lid)
    P0, P1, P2, P3 = (250, 214, 226, 255), (228, 164, 188, 255), (196, 124, 156, 255), (160, 92, 128, 255)
    cv.rect(17, 27, 46, 32, P1); cv.rect(17, 27, 46, 27, P0); cv.rect(17, 32, 46, 32, P3); cv.rect(43, 28, 46, 31, P2)
    cv.p(18, 28, P0); cv.p(19, 28, P0)
    crystal(cv, 32, 36, 76, 9, 56, f)
    halo(cv, lambda x, y: 18 <= x <= 45 and 34 <= y <= 77, f, (17, 33, 46, 83))
    # plinth
    B0, B1, B2, B3 = (232, 242, 250, 255), (136, 196, 236, 255), (110, 168, 216, 255), (80, 130, 190, 255)
    L1, L2 = (186, 176, 230, 255), (154, 144, 206, 255)
    K1, K2, K3 = (232, 168, 192, 255), (204, 136, 166, 255), (168, 100, 136, 255)
    cv.rect(13, 85, 50, 87, B0); cv.rect(13, 88, 50, 99, B1); cv.rect(13, 100, 50, 108, L1); cv.rect(13, 109, 50, 118, K1)
    cv.rect(13, 119, 50, 120, K3)
    cv.rect(47, 88, 50, 99, B2); cv.rect(47, 100, 50, 108, L2); cv.rect(47, 109, 50, 118, K2); cv.rect(47, 85, 50, 87, B1)
    for x in range(13, 51): cv.p(x, 88, B3 if x < 47 else (64, 110, 170, 255))
    for x in range(14, 47): cv.p(x, 86, (255, 255, 255, 255))
    # recessed plaque
    cv.rect(24, 102, 39, 106, (120, 108, 180, 255)); cv.rect(25, 103, 38, 105, (228, 210, 150, 255)); cv.rect(25, 103, 38, 103, (250, 236, 186, 255))
    outline_box(cv, 16, 26, 47, 84, round_bottom=False); outline_box(cv, 12, 84, 51, 121)
    cv.p(12, 121, (0, 0, 0, 0)); cv.p(51, 121, SH); cv.p(12, 84, O); cv.p(51, 84, O)
    return cv.im


def case_b(f):
    """crystal_display: framed case x11..53 y35..89, three-crystal cluster, cabinet x11..53 y90..124."""
    cv = Cv(); shadow(cv, [(11, 35, 53, 124)], dx=4, dy=2)
    F0, F1, F2, F3 = (110, 84, 88, 255), (78, 58, 64, 255), (58, 42, 48, 255), (40, 28, 34, 255)
    cv.rect(11, 35, 53, 89, F1)
    cv.rect(12, 36, 52, 37, F0); cv.rect(12, 38, 52, 40, F2); cv.rect(48, 41, 52, 89, F2); cv.rect(12, 41, 16, 89, F1)
    cv.rect(52, 38, 52, 89, F3)
    for (x, y) in ((13, 36), (51, 36)): cv.p(x, y, (232, 214, 170, 255))  # brass studs (old light corners)
    for x in range(13, 16): cv.p(x, 41, F0)
    GL0, GL1, GL2, W = (232, 236, 244, 255), (214, 220, 234, 255), (192, 198, 218, 255), (255, 255, 255, 255)
    cv.rect(17, 41, 47, 83, GL0); cv.rect(17, 41, 47, 43, GL2); cv.rect(17, 44, 47, 44, GL1); cv.rect(44, 45, 47, 83, GL1)
    for y in range(46, 76): cv.p(19, y, W)
    for i in range(10): cv.p(21 + i // 3, 46 + i, W) if i < 6 else None
    crystal(cv, 32, 47, 82, 8, 78, f)
    crystal(cv, 23, 59, 82, 5, 79, (f + 1) % FRAMES if f else 0)
    crystal(cv, 42, 60, 82, 5, 79, (f + 2) % FRAMES if f else 0)
    halo(cv, lambda x, y: 17 <= x <= 47 and 44 <= y <= 83, f, (17, 41, 47, 83))
    T0, T1 = (120, 220, 204, 255), (60, 156, 146, 255)
    cv.rect(17, 84, 47, 85, T0); cv.rect(17, 86, 47, 86, T1); cv.rect(44, 84, 47, 85, T1)
    cv.rect(12, 87, 52, 89, F2); cv.rect(12, 87, 52, 87, F0)
    C0, C1, C2, C3 = (110, 116, 128, 255), (70, 76, 88, 255), (54, 58, 68, 255), (38, 40, 48, 255)
    cv.rect(12, 90, 52, 123, C1); cv.rect(12, 90, 52, 91, C0); cv.rect(48, 92, 52, 123, C2); cv.rect(12, 121, 52, 123, C3)
    cv.rect(16, 95, 44, 117, C2); cv.rect(17, 96, 43, 116, C1); cv.rect(17, 96, 43, 96, C0)   # panel inset
    cv.rect(28, 104, 32, 106, (120, 220, 204, 255)); cv.rect(28, 104, 32, 104, (190, 246, 236, 255))  # teal keyplate
    outline_box(cv, 11, 35, 53, 89, round_bottom=False); outline_box(cv, 11, 89, 53, 124)
    cv.p(11, 124, (0, 0, 0, 0))
    return cv.im


def normals_b(img):
    """Plane normals for ixlight (same codes as the v2 sheet): front (128,128,255), top lip (128,51,230), glass (128,159,251)."""
    n = Image.new('RGBA', img.size, (0, 0, 0, 0)); a, p = img.load(), n.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, al = a[x, y]
            if not al: continue
            if al < 255: p[x, y] = (128, 128, 255, al); continue
            c = (128, 128, 255, 255)
            if 36 <= y <= 37 or 90 <= y <= 91 or y == 87: c = (128, 51, 230, 255)
            elif 17 <= x <= 47 and 41 <= y <= 83: c = (128, 159, 251, 255)
            p[x, y] = c
    return n


def put(sheet_rel, idx_pairs, imgs):
    for n in (1, 2, 3):
        rel = sheet_rel.replace('tiles_1x', f'tiles_{n}x'); path = os.path.join(OW, rel)
        sh = Image.open(path).convert('RGBA'); C = 64 * n
        for (top, bot), im in zip(idx_pairs, imgs):
            big = im.resize((64 * n, 128 * n), Image.NEAREST)
            for i, part in ((top, big.crop((0, 0, C, C))), (bot, big.crop((0, C, C, 2 * C)))):
                x, y = i % 16 * C, i // 16 * C
                sh.paste(Image.new('RGBA', (C, C), (0, 0, 0, 0)), (x, y)); sh.paste(part, (x, y))
        sh.save(path, optimize=True)


def main():
    A = [case_a(f) for f in range(FRAMES)]; B = [case_b(f) for f in range(FRAMES)]
    A_CELLS = [(182, 183), (389, 390), (391, 392), (393, 394)]   # frame 0 = the tile's own cells, 1..3 = free cells
    B_CELLS = [(52, 53), (187, 188), (189, 190), (252, 253)]
    put('interiors_new/tiles_1x/i_furniture_v3.png', A_CELLS, A)
    put('tiles_1x/interior_v3.png', B_CELLS, B)
    npath = os.path.join(OW, 'tiles_1x/interior_v3_n.png'); ns = Image.open(npath).convert('RGBA'); nb = normals_b(B[0])
    ns.paste(nb.crop((0, 0, 64, 64)), (52 % 16 * 64, 52 // 16 * 64)); ns.paste(nb.crop((0, 64, 64, 128)), (53 % 16 * 64, 53 // 16 * 64))
    ns.save(npath, optimize=True)
    seq = [0, 0, 0, 0, 0, 1, 2, 3, 2, 1]  # mostly still, a slow glint pass (~1.8 s loop)
    ap = os.path.join(OW, 'furniture_v3_anim.json'); anim = json.load(open(ap))
    for (tid_top, tid_bot), cells in (((7293, 7294), A_CELLS), ((840, 841), B_CELLS)):
        anim['anim'][str(tid_top)] = {'frames': [cells[k][0] for k in seq], 'frame_ms': 180}
        anim['anim'][str(tid_bot)] = {'frames': [cells[k][1] for k in seq], 'frame_ms': 180}
    if 'crystal_cases_v1' not in anim['note']: anim['note'] += '; crystal_cases_v1: 840/841 + 7293/7294 shimmer (tools/furniture_v2/crystal_cases_v1.py)'
    json.dump(anim, open(ap, 'w'), indent=1)
    return A, B


if __name__ == '__main__':
    main(); print('crystal cases v1 written')
