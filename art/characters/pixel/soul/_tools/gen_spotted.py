"""#2 Spotted! : violet spark, RT-logo spark, eye glint, emote set, hop spec, preview on route1."""
import glob
from soul_lib import *
ITEM = 'spotted'

# ---------- violet spark (Kilumen crystal shard + 4 diagonal rays) ----------
def spark(stage):
    """stage 0 burst, 1 key (the single held frame), 2 afterglow.
    Night fix (Oct 22 2026): light body VIO[4] + dark shade facet VIO[0] + VIO[5] lit facet, INK-outlined rays with f8eabe tips,
    so it clears 0.5 readability at night with the NORMAL sprite grade (was 0.498: mid violets sat on night-grass luma)."""
    S = 24; f = FX(S, S, outline=C(INK)); cx, cy = 12, 12
    if stage == 0: hw, hh, ray0, ray1 = 2, 4, 5, 10
    elif stage == 1: hw, hh, ray0, ray1 = 4, 7, 7, 10
    else: hw, hh, ray0, ray1 = 4, 7, 0, 0
    top, right, bot, left = (cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)
    f.poly('B', [top, right, bot, left], C(VIO[4]))
    f.poly('B', [top, right, bot, (cx, cy)], C(VIO[0]))          # shaded right half (dark: contrast at night)
    f.poly('B', [top, (cx, cy), left], C(VIO[5]))                # lit upper-left facet
    if hw >= 3:
        f.line('B', (cx - 1, cy - hh + 2), (cx - hw + 2, cy - 1), C(VIO[5]))
        f.px('B', (cx - 1, cy - hh + 2), C(WHITE))
    out = f.render()
    g = FX(S, S, outline=C(INK))
    if ray1:
        for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
            a = (cx + sx * ray0 * 0.72, cy + sy * ray0 * 0.72); b = (cx + sx * ray1 * 0.72, cy + sy * ray1 * 0.72)
            g.line('B', a, b, C(VIO[4]) if stage == 1 else C(VIO[3]))
            g.px('B', b, C('f8eabe'))
        if stage == 0:
            for dx, dy in ((0, -11), (11, 0), (0, 11), (-11, 0)): g.px('B', (cx + dx, cy + dy), C(VIO[4]))
    rays = g.render(); m = (rays[..., 3] > 0) & (out[..., 3] == 0); out[m] = rays[m]
    if stage == 2:
        for p in ((cx + 7, cy - 6), (cx - 7, cy + 5)): out[p[1], p[0]] = H(VIO[4])
    return out

# ---------- RT logo spark (company NPCs): the company gem-shield from the RT barricade sign ----------
RT_ROWS = [
    "..kkkkkkkkk..",
    ".kaaaaaaaaak.",
    "kabwwwwbbbbak",
    "kabwwwwbbbbak",
    "kabwwwbbbbbak",
    "kabbwwwbbbbak",
    "kabbbwwbbbbak",
    ".kabbwbbbbak.",
    ".kabbwbbbbak.",
    "..kabbbbbak..",
    "...kabbbak...",
    "....kabak....",
    ".....kak.....",
    "......k......",
]
def rt_spark(stage):
    S = 24; out = blank(S, S)
    g = glyph(RT_ROWS, {'k': INK, 'a': VIO[1], 'b': VIO[3], 'w': VIO[5]})
    if stage == 0:   # pop: 1px smaller via row/col drop + ray dots
        g2 = np.delete(np.delete(g, [3, 7], 0), [2, 10], 1)
        paste(out, g2, 12 - g2.shape[1] // 2, 12 - g2.shape[0] // 2)
        for p in ((12, 1), (12, 22), (1, 12), (22, 12), (4, 4), (19, 4), (4, 19), (19, 19)): out[p[1], p[0]] = H(VIO[4])
    else:
        paste(out, g, 6, 5)
        if stage == 1:
            for p in ((3, 3), (20, 3), (21, 14), (2, 14)): out[p[1], p[0]] = H(VIO[4])
    return out

def fade(a, t): return bayer_fade(a, t)

# ---------- eye glint ----------
GLINT = [".w.", "www", ".w."]
def eye_glint(stage):
    """single catch-light twinkle, 5x5, centre (2,2); draw one per eye."""
    out = blank(5, 5)
    if stage == 0: out[2, 0:5] = H(WHITE); out[0:5, 2] = H(WHITE); out[2, 2] = H(VIO[5])
    else: out[1:4, 2] = H(WHITE); out[2, 1:4] = H(WHITE)
    return out
def put_glints(im, st, ox, oy, ep):
    for ex in (ep['eye_lx'], ep['eye_rx']): paste(im, eye_glint(st), ox + ex - 2, oy + ep['eye_y'] - 2)

# ---------- emote bubbles ----------
def bubble(w=22, h=17):
    S = 24; a = blank(S, S); x0 = (S - w) // 2; y0 = 1
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1) and y in (0, 1, h - 2, h - 1)) or (y in (0, h - 1) and x in (0, 1, w - 2, w - 1))
            if corner: continue
            edge = x in (0, w - 1) or y in (0, h - 1) or ((x in (1, w - 2)) and y in (1, h - 2))
            a[y0 + y, x0 + x] = H(INK if edge else (CREAM if y >= h - 3 else WHITE))
    # tail (points down at the head)
    tx = S // 2
    for i, (l, r) in enumerate(((-2, 1), (-1, 0))):
        yy = y0 + h - 1 + i
        for x in range(tx + l - 1, tx + r + 2): a[yy, x] = H(INK)
        for x in range(tx + l, tx + r + 1): a[yy, x] = H(CREAM)
    a[y0 + h + 1, tx - 1] = H(INK); a[y0 + h + 1, tx] = H(INK); a[y0 + h + 2, tx] = H(INK)
    a[y0 + h - 1, tx - 2:tx + 2] = H(CREAM)
    return a

E = {  # glyph char maps; k ink
 'heart': ([".kk.kk.", "kpwkppk", "kpppppk", "kppppsk", ".kppsk.", "..kpk..", "...k..."], {'k': PINK[0], 'p': PINK[2], 'w': PINK[3], 's': PINK[1]}),
 'sweat': (["..k..", "..k..", ".kbk.", ".kbk.", "kbbwk", "kbwwk", ".kkk."], {'k': BLUE[1], 'b': BLUE[3], 'w': BLUE[5]}),
 'dots': (["kk.kk.kk", "kk.kk.kk"], {'k': INK}),
 'note': (["...kkkk", "...kvvk", "...k..k", "...k..k", ".kkk.kk", "kvvkkvk", "kvvk.k.", ".kk...."], {'k': INK, 'v': VIO[2]}),
 'zzz': (["kkkk......", "..k.......", ".k........", "kkkk.kkk..", ".......k..", "......k...", ".....kkk.."], {'k': VIO[1]}),
 'anger': (["kk...kk", "krk.krk", ".krkrk.", "..k.k..", ".krkrk.", "krk.krk", "kk...kk"], {'k': PINK[0], 'r': PINK[1]}),
 'question': ([".kkkk.", "kk..kk", "....kk", "...kk.", "..kk..", "..kk..", "......", "..kk..", "..kk.."], {'k': INK}),
 'sparkle': (["...y...", "...y...", "..yWy..", "yyWWWyy", "..yWy..", "...y...", "...y..."], {'y': 'e29d40', 'W': 'fcd668'}),
}
def emote(name, stage):
    """stage 0 pop (small bubble, no glyph), 1 full, 2 alternate (wiggle/animated glyph)."""
    if stage == 0:
        a = blank(24, 24); b = bubble(14, 11); bb = bbox(b); sub = b[bb[1]:bb[3] + 1, bb[0]:bb[2] + 1]
        paste(a, sub, 12 - sub.shape[1] // 2, 23 - sub.shape[0]); return a
    a = bubble(); rows, cm = E[name]; g = glyph(rows, cm)
    if name == 'dots' and stage == 1: g = glyph(["kk.kk...", "kk.kk..."], cm)
    if name == 'zzz' and stage == 2: g = np.roll(g, -1, 0); g[-1] = 0
    cx, cy = 12 - g.shape[1] // 2, 1 + (17 - g.shape[0]) // 2
    dx, dy = 0, 0
    if stage == 2 and name in ('heart', 'question', 'note', 'sweat'): dy = -1
    if stage == 2 and name == 'anger': g = glyph(["k.....k", ".k...k.", "..krk..", "..rkr..", "..krk..", ".k...k.", "k.....k"], cm)
    if stage == 2 and name == 'sparkle': g = glyph([".......", "...y...", "..yWy..", ".yWWWy.", "..yWy..", "...y...", "......."], cm)
    paste(a, g, cx + dx, cy + dy); return a

# ---------- face points for the eye glint (heuristic + checked on contact sheet, overrides below) ----------
SKIN = ['e8ce92', 'deb478', 'f8eabe', 'e29d40', 'ccaa6e', 'ba8856', '92623e', '87604d', 'd2a274']
OVERRIDE = {}
def lum(a): return a[..., 0].astype(int) + a[..., 1] + a[..., 2]
def eye_points(a, facing='down'):
    """Heuristic: first row (>= head_top+14) with light centre and dark pixels left & right of it."""
    ht = head_top(a); L = lum(a); op = a[..., 3] > 0; face = None
    for y in range(ht + 14, ht + 50):
        if op[y, 30:34].all() and (L[y, 30:34] > 360).all(): face = y; break
    if face is not None:
        for y in range(face, face + 22):
            if not (L[y, 30:34] > 300).all(): continue
            l = [x for x in range(22, 30) if op[y, x] and L[y, x] < 230]
            r = [x for x in range(34, 42) if op[y, x] and L[y, x] < 230]
            if l and r: return {'eye_y': y + 2, 'eye_lx': max(l) + 1, 'eye_rx': min(r) - 1, 'auto': True}
    return {'eye_y': ht + 22, 'eye_lx': 27, 'eye_rx': 37, 'auto': False}
def face_y(a):
    ht = head_top(a); k = keys(a)
    sk = np.isin(k, [hk(h) for h in SKIN if (int(h, 16) >> 16) > 0]) & (a[..., 3] > 0)
    for y in range(ht + 4, ht + 50):
        if sk[y, 22:42].sum() >= 9: return y + 3
    return ht + 20

def npc_list():
    out = ['cal', 'mira', 'ron', 'vane']
    out += sorted(os.path.basename(p) for p in glob.glob(PIX + '/npcs/tr_*') + glob.glob(PIX + '/npcs/vil_*'))
    return out

def main():
    # spark
    sp = [spark(0), spark(1), spark(2), fade(spark(2), 0.5)]
    write_anim(ITEM, 'spark', sp, [50, 450, 120, 80], anchor=[12, 23], loop=False,
               notes='Frame 01 is THE spark (the playbook\'s 1-frame symbol); 00/02/03 are optional pop-in/afterglow. Place bottom-centre (12,23) at (sprite_x+32, sprite_y+head_top-2).')
    rt = [rt_spark(0), rt_spark(1), rt_spark(2), fade(rt_spark(2), 0.5)]
    write_anim(ITEM, 'spark_rt', rt, [50, 450, 120, 80], anchor=[12, 23], loop=False, notes='Company (RT) NPC variant: tiny RT gem-shield logo. Same timing/anchor as spark.')
    write_anim(ITEM, 'eye_glint', [eye_glint(0), eye_glint(1)], [50, 50], anchor=[2, 2], loop=False,
               notes='Eyes flash: draw one per eye, centre (2,2) at (sprite_x+eye_lx|eye_rx, sprite_y+eye_y) from eye_points.json (down-facing frame; for left/right facing use the single eye on the facing side, see README).')
    for n in E:
        write_anim(ITEM, 'emote_' + n, [emote(n, 0), emote(n, 1), emote(n, 2)], [60, 260, 260], anchor=[12, 23], loop=True,
                   notes='Play 00 once, then loop 01,02 (~1 s total), then remove. Bottom-centre (12,23) at head_top-1.', sub='emotes')
    # face points table
    pts = {}
    for n in npc_list():
        try: a = human(n, 'down', 'stand')
        except FileNotFoundError: continue
        pts[n] = dict(head_top=head_top(a), **OVERRIDE.get(n, eye_points(a)))
    json.dump(pts, open(f'{SOUL}/{ITEM}/eye_points.json', 'w'), indent=1)
    # contact sheet to verify glint placement
    cells = []
    for n, p in pts.items():
        a = human(n, 'down', 'stand').copy(); put_glints(a, 0, 0, 0, p)
        s = spark(1); paste(a, blank(1, 1), 0, 0); cells.append(a)
    rows = [cells[i:i + 12] for i in range(0, len(cells), 12)]
    save_png(contact(rows), f'{SOUL}/{ITEM}/previews/eye_glint_check_2x.png', 2)
    # all-glyph contact
    allg = [[spark(i) for i in range(3)] + [rt_spark(i) for i in range(3)] + [eye_glint(0)], [emote(n, 1) for n in E], [emote(n, 2) for n in E]]
    save_png(contact(allg, bgcol=(82, 152, 58)), f'{SOUL}/{ITEM}/previews/spotted_glyphs_4x.png', 4)
    preview(pts)
    write_specs()
    dump_meta(ITEM)

HOP_DY = [0, -3, -6, -7, -6, -3, 0]   # px, 40 ms each

SPECS = {
 'trigger': 'trainer line-of-sight hits the player (any NPC trainer; company/RT trainers use spark_rt)',
 'sequence': [
   {'step': 'freeze player input; player finishes current 16 px step, then stands', 'ms': 160},
   {'step': 'eye_glint: 2 frames x 50 ms on the trainer (eye_points.json; facing left/right = one eye)', 'ms': 100},
   {'step': 'spark frame 00 (pop) above trainer head', 'ms': 50},
   {'step': 'hop: trainer sprite y offset HOP_DY px per frame, spark rides along (spark frame 01 held)', 'hop_dy_px': HOP_DY, 'hop_ms': [120, 40, 40, 40, 40, 40, 40], 'ms': 360},
   {'step': 'spark frames 02 (120 ms), 03 (80 ms) then remove', 'ms': 200},
   {'step': 'trainer walks toward the player at normal walk speed (16 px / 62 ms per frame) until adjacent, then dialogue', 'ms': None}],
 'spark_anchor': 'spark bottom-centre (12,23) at (sprite_x + 32, sprite_y + head_top - 2); head_top per NPC in eye_points.json',
 'emotes': 'spotted/emotes/emote_<name>: play 00 once (60 ms) then loop 01/02 (260 ms each); bottom-centre (12,23) at head_top - 1',
 'reduced_motion': 'skip hop (keep spark frame 01 for 360 ms)',
 'sfx_note': 'not art: a short rising chime on spark frame 01'}
def write_specs():
    json.dump(SPECS, open(f'{SOUL}/{ITEM}/hook_specs.json', 'w'), indent=1)
def preview(pts):
    """route1: Cal walks down the trail; a youngster to the right spots him (glint, spark, hop) and walks up."""
    x0, y0, x1, y1 = 30, 9, 35, 13
    B = bg('route1', x0, y0, x1, y1)
    T = lambda tx, ty: ((tx - x0) * 64, (ty - y0 + 1) * 64 - 96)
    tr = 'tr_youngster_m'
    frames, ms = [], []
    def comp(sprites):
        im = B.copy()
        for spr, (x, y) in sorted(sprites, key=lambda s: s[1][1]): paste(im, spr, x, y)
        return im
    cal_x = T(31, 9)[0]
    tr_xy = T(34, 11)
    # Cal walks down from y=9 to y=11 (2 tiles, 8 frames of 16px at 125ms/2 = 62ms per 16 px)
    cy = T(31, 9)[1]
    for i in range(8):
        pose = 'walk%d' % (i % 4)
        frames.append(comp([(human('cal', 'down', pose), (cal_x, cy + i * 16)), (human(tr, 'left', 'stand'), tr_xy)])); ms.append(62)
    cal = (human('cal', 'down', 'stand'), (cal_x, cy + 128))
    trs = human(tr, 'left', 'stand'); trs_ht = head_top(trs)
    # facing left: one visible eye; use left eye x of the down frame shifted by side-view offset (measured: ~-3px)
    ep = dict(pts[tr]); ep['eye_lx'] = ep['eye_rx'] = 30; ep['eye_y'] = 41   # left-facing eye measured on tr_youngster_m_left_stand
    frames.append(comp([cal, (trs, tr_xy)])); ms.append(160)
    # eyes flash
    for st in (0, 1):
        im = comp([cal, (trs, tr_xy)]); put_glints(im, st, tr_xy[0], tr_xy[1], ep); frames.append(im); ms.append(50)
    # spark + hop
    sp = [spark(0), spark(1)]
    im = comp([cal, (trs, tr_xy)]); paste(im, sp[0], tr_xy[0] + 32 - 12, tr_xy[1] + trs_ht - 2 - 23); frames.append(im); ms.append(50)
    for j, dy in enumerate(HOP_DY):
        im = comp([cal, (trs, (tr_xy[0], tr_xy[1] + dy))]); paste(im, sp[1], tr_xy[0] + 32 - 12, tr_xy[1] + trs_ht - 2 - 23 + dy)
        frames.append(im); ms.append(40 if j else 120)
    im = comp([cal, (trs, tr_xy)]); paste(im, spark(2), tr_xy[0] + 32 - 12, tr_xy[1] + trs_ht - 25); frames.append(im); ms.append(120)
    im = comp([cal, (trs, tr_xy)]); paste(im, fade(spark(2), .5), tr_xy[0] + 32 - 12, tr_xy[1] + trs_ht - 25); frames.append(im); ms.append(80)
    # walk up: 2 tiles left (34->32) at walk speed
    for i in range(8):
        frames.append(comp([cal, (human(tr, 'left', 'walk%d' % (i % 4)), (tr_xy[0] - (i + 1) * 16, tr_xy[1]))])); ms.append(62)
    frames.append(comp([cal, (trs, (tr_xy[0] - 128, tr_xy[1]))])); ms.append(400)
    im = comp([cal, (trs, (tr_xy[0] - 128, tr_xy[1]))]); paste(im, emote('dots', 1), cal_x + 32 - 12, cy + 128 + 4 - 23); frames.append(im); ms.append(600)
    save_preview(frames, f'{SOUL}/{ITEM}/previews/spotted_route1_2x.gif', ms)
    # company variant still
    im = comp([cal, (human('vil_office_m', 'left', 'stand'), tr_xy)]); o = human('vil_office_m', 'left', 'stand')
    paste(im, rt_spark(1), tr_xy[0] + 32 - 12, tr_xy[1] + head_top(o) - 25)
    save_png(im, f'{SOUL}/{ITEM}/previews/spotted_rt_still_2x.png', 2)

if __name__ == '__main__':
    main()
