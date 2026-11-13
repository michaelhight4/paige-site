# Soul-pass tiles (SOUL_PLAYBOOK #3 bins, #12 ambient life, #14 Lantern Rest). Design units U=128 -> 64px, same pixelize rules as every deco:
# transparent except the object + the single SHADOW colour; no glow halos. Registered via build.EXTRA_TILE_MODULES (ids after the core kit).
import numpy as np
from PIL import Image
from gen_tiles import blank, SD, U, shadow, T
from pixel import pixelize, B4

# ---------------- #3 Ron's bin (brookhollow (7,8)) ----------------
BAG_SPOTS = [(26, 122), (56, 124), (40, 102), (12, 104), (70, 108), (24, 84), (52, 86), (92, 30)]   # (centre x, bottom y) in design units, bag n = first n spots
def _bin(d, open_lid=False):
    d.rounded_rectangle([72, 34, 114, 118], 5, fill=(70, 128, 108)); d.rectangle([76, 40, 82, 112], fill=(104, 166, 138))
    d.rectangle([108, 40, 112, 116], fill=(48, 92, 80))
    for y in (60, 84): d.line([(76, y), (110, y)], fill=(48, 92, 80), width=2)
    d.ellipse([74, 112, 86, 124], fill=(44, 40, 52)); d.ellipse([102, 112, 114, 124], fill=(44, 40, 52))
    d.rounded_rectangle([88, 66, 104, 78], 3, fill=(250, 232, 190)); d.line([(91, 72), (101, 72)], fill=(150, 104, 66), width=2)   # "bin day" sticker
    if open_lid: d.polygon([(70, 34), (116, 34), (120, 12), (74, 18)], fill=(84, 146, 122)); d.line([(74, 18), (120, 12)], fill=(130, 192, 160), width=2)
    else: d.rounded_rectangle([68, 26, 118, 38], 4, fill=(84, 146, 122)); d.line([(72, 28), (114, 28)], fill=(130, 192, 160), width=2)
def _bag(d, cx, by, k):
    w = 15; tone = [(140, 100, 176), (122, 88, 160), (160, 120, 192)][k % 3]
    d.ellipse([cx - w, by - 26, cx + w, by], fill=tone); d.ellipse([cx - w + 5, by - 22, cx - 2, by - 12], fill=tuple(min(255, c + 40) for c in tone))
    d.polygon([(cx - 5, by - 24), (cx + 5, by - 24), (cx + 7, by - 34), (cx, by - 29), (cx - 7, by - 34)], fill=tone)   # knot
    d.line([(cx - 3, by - 28), (cx + 3, by - 28)], fill=(250, 214, 104), width=2)                                         # warm tie
def ron_bin(n, empty=False):
    im = shadow(blank(), [62, 108, 124, 126]); d = SD(im)
    if n: im = shadow(im, [0, 104, 90, 126]); d = SD(im)
    _bin(d, open_lid=empty)
    if empty:   # after the finale: lid flipped open, swept clean, a tiny violet crystal sparkle on the sticker
        d.polygon([(96, 60), (100, 54), (104, 60), (100, 66)], fill=(176, 118, 236))
    for i in sorted(range(n), key=lambda i: BAG_SPOTS[i][1]): _bag(d, *BAG_SPOTS[i], i)
    return im
def bin_flies(f):
    """overlay: 3 tiny flies circling the pile (bin stage >= 6). Opaque pixels only."""
    im = blank(); d = SD(im)
    pts = [[(30, 56), (62, 44), (96, 10)], [(40, 48), (54, 56), (104, 18)], [(24, 46), (66, 50), (88, 16)]][f]
    for x, y in pts:
        d.rectangle([x, y, x + 4, y + 4], fill=(40, 30, 50)); d.rectangle([x - 4, y - 4, x, y], fill=(232, 240, 255)); d.rectangle([x + 4, y - 4, x + 8, y], fill=(232, 240, 255))
    return im

# ---------------- #12 ambient life ----------------
def fish_shadow(f):
    """fish shadow under the water surface: SHADOW colour only (draws over water, under characters). 4-frame tail wiggle."""
    im = blank(); d = SD(im); c = (14, 16, 40, 150); sw = [-6, 0, 6, 0][f]
    d.ellipse([34, 52, 86, 76], fill=c); d.polygon([(84, 64), (104, 52 + sw), (104, 76 + sw)], fill=c); d.polygon([(52, 56), (62, 44), (68, 56)], fill=c)
    return im
def fish_ripple(f):
    """surface ring when a fish turns; 3 frames then empty. Light water tones only."""
    im = blank(); d = SD(im); r = (10, 22, 34)[f]; col = [(236, 248, 255), (200, 232, 250), (170, 214, 240)][f]
    d.ellipse([64 - r, 64 - r // 2, 64 + r, 64 + r // 2], outline=col, width=3 if f < 2 else 2)
    return im
PRINT = {'snow': (140, 160, 204), 'sand': (176, 132, 80), 'mud': (40, 26, 22)}
def footprint(surface, dirn):
    """two-print pair (left + right foot) for one step, heading `dirn`."""
    im = blank(); d = SD(im); c = PRINT[surface]
    def foot(cx, cy, vert):
        if vert: d.ellipse([cx - 8, cy - 12, cx + 8, cy + 10], fill=c); d.ellipse([cx - 7, cy + 13, cx + 7, cy + 23] if dirn == 'up' else [cx - 7, cy - 25, cx + 7, cy - 15], fill=c)
        else: d.ellipse([cx - 12, cy - 8, cx + 10, cy + 8], fill=c); d.ellipse([cx + 13, cy - 7, cx + 23, cy + 7] if dirn == 'left' else [cx - 25, cy - 7, cx - 15, cy + 7], fill=c)
    if dirn in ('up', 'down'): foot(50, 44, True); foot(78, 86, True)
    else: foot(44, 52, False); foot(86, 80, False)
    return im
def fade_frames(px, steps=(1.0, 0.6, 0.3)):
    """hard-edged dissolve (Bayer 4x4 threshold) -> pixel-art fade with no alpha blending."""
    a = np.asarray(px).copy(); h, w = a.shape[:2]; th = np.tile(B4, (h // 4 + 1, w // 4 + 1))[:h, :w]; out = []
    for s in steps:
        b = a.copy(); b[(th >= s) & (b[..., 3] > 0)] = 0; out.append(Image.fromarray(b, 'RGBA'))
    return out

# ---------------- #14 Lantern Rest ----------------
STONE = ((226, 196, 150), (196, 162, 116), (248, 226, 188))   # warm sandstone
def memorial_stone(shape, carved=True):
    im = shadow(blank(), [24, 104, 104, 126]); d = SD(im); b, dk, hi = STONE
    if shape == 'a': d.rounded_rectangle([36, 40, 92, 118], 22, fill=b); d.rectangle([84, 52, 92, 116], fill=dk); d.line([(44, 48), (64, 44)], fill=hi, width=3)
    elif shape == 'b':
        d.rectangle([34, 52, 94, 118], fill=b); d.polygon([(34, 52), (64, 30), (94, 52)], fill=b); d.rectangle([86, 52, 94, 116], fill=dk); d.line([(40, 50), (62, 34)], fill=hi, width=3)
    else: d.ellipse([30, 50, 98, 120], fill=b); d.rectangle([30, 86, 98, 118], fill=b); d.rectangle([90, 86, 98, 116], fill=dk); d.line([(42, 62), (60, 54)], fill=hi, width=3)
    if carved:
        for y, w in ((66, 30), (78, 38), (90, 26)): d.line([(64 - w // 2, y), (64 + w // 2, y)], fill=(150, 112, 78), width=3)
    for x, col in ((30, (252, 214, 104)), (96, (176, 118, 236)), (40, (255, 160, 140))):   # small flowers left at the foot
        d.ellipse([x - 5, 108, x + 5, 118], fill=col); d.rectangle([x - 1, 116, x + 1, 122], fill=(82, 152, 58))
    return im
def memorial_bench():
    im = shadow(blank(), [16, 100, 112, 124]); d = SD(im)
    for x in (24, 96): d.rectangle([x, 80, x + 8, 116], fill=(110, 76, 46))
    d.rounded_rectangle([14, 70, 114, 84], 3, fill=(200, 158, 104)); d.line([(18, 72), (110, 72)], fill=(236, 196, 140), width=2)
    d.rounded_rectangle([18, 40, 110, 52], 3, fill=(176, 128, 80)); d.rounded_rectangle([18, 56, 110, 64], 3, fill=(176, 128, 80))
    for x in (24, 96): d.rectangle([x, 40, x + 6, 72], fill=(128, 92, 58))
    d.ellipse([58, 60, 70, 70], fill=(252, 214, 104))   # a single warm flower left on the seat
    return im
def keeper_lantern():
    """paper lantern on a short post: warm light drawn as solid pixels only (no glow halo)."""
    im = shadow(blank(), [44, 108, 84, 124]); d = SD(im)
    d.rectangle([60, 56, 68, 120], fill=(110, 76, 46)); d.rectangle([40, 22, 88, 28], fill=(110, 76, 46))
    d.rounded_rectangle([46, 28, 82, 62], 10, fill=(255, 196, 110)); d.rounded_rectangle([52, 32, 70, 58], 6, fill=(255, 236, 170))
    for y in (38, 48): d.line([(48, y), (80, y)], fill=(226, 150, 84), width=2)
    return im

def register(reg, reg_multi):
    bins = {str(n): f'bin_ron_{n}' for n in range(9)}; bins['empty'] = 'bin_ron_empty'
    for n in range(9):
        reg(f'bin_ron_{n}', 'deco', ron_bin(n), 'block', states=bins,
            notes=f"Ron's bin (brookhollow 7,8): {n} bag(s) = Master coins earned. Stage >= 6: also draw bin_flies in the overlay layer. After the finale: bin_ron_empty")
    reg('bin_ron_empty', 'deco', ron_bin(0, True), 'block', states=bins, notes="Ron's bin after the finale (bags taken out; E5 Bin Monument no longer findable)")
    reg('bin_flies', 'overlay', [bin_flies(f) for f in range(3)], ms=140, notes='flies over Ron\'s bin; overlay layer on the bin cell when bin stage >= 6')
    reg('fish_shadow', 'deco', [fish_shadow(f) for f in range(4)], 'water', ms=200, raw=False,
        notes='ambient: drawn over water, under characters, at map.ambient.fish_spots; engine drifts it 0-1 tile and flips it horizontally at random')
    reg('fish_ripple', 'deco', [pixelize(fish_ripple(f), outline=False, dither=0) for f in range(3)], 'water', raw=True, notes='ambient: one-shot ring when a fish shadow turns (play once, then hide)',
        anim=dict(type='oneshot', trigger='engine', frame_ms=120, loop=False))
    for s in PRINT:
        for dn in ('up', 'down', 'left', 'right'):
            base = pixelize(footprint(s, dn), outline=False)
            reg(f'footprint_{s}_{dn}', 'overlay', fade_frames(base), raw=True,
                notes=f'ambient: decal left on {s} ground; spawn on the cell the player leaves, draw under characters; frames = full, 60%, 30% dissolve over ~4 s, then remove',
                anim=dict(type='fade', trigger='spawn', frame_ms=1333, loop=False, layer='under characters'))
    for sh in 'abc': reg(f'memorial_stone_{sh}', 'deco', memorial_stone(sh), 'block', notes='Lantern Rest epitaph stone: interact from the south (sign-style text)')
    st = {'blank': 'memorial_stone_blank', 'bench': 'memorial_bench'}
    reg('memorial_stone_blank', 'deco', memorial_stone('a', carved=False), 'block', states=st, notes='uncarved stone for the field team; becomes memorial_bench when field_team_home is set')
    reg('memorial_bench', 'deco', memorial_bench(), 'block', states=st, notes='replaces memorial_stone_blank after the reunion')
    reg('keeper_lantern', 'deco', keeper_lantern(), 'block', notes='Lantern Rest paper lantern')
    register_v040(reg)

# ---------------- Text Bot v0.4.0: wall windows (day/night look) + station handcar ----------------
# Window = 1x2 wall-mounted deco: _t on wall row 1, _b on wall row 2 (the interact cell; stand on row 3 facing up).
# Frame/curtains are interior (interiors stay on the day grade); only the GLASS shows the outside phase: the day glass
# palette-swapped through time_of_day.grade_fn(phase), snapped back to palette.hex, plus stars/moon at night.
PHASES = ('dawn', 'day', 'dusk', 'night')
SKY = {'dawn': [(214, 172, 255), (232, 206, 146), (236, 222, 196), (240, 136, 104)],     # glass levels dark->light: sky, horizon, glint, cloud
       'dusk': [(240, 136, 104), (238, 162, 60), (232, 206, 146), (214, 172, 255)]}
def _win_frame():
    im = blank(1, 2); d = SD(im)
    d.rectangle([20, 30, 108, 36], fill=(120, 84, 60))                                   # curtain rod
    d.rectangle([22, 40, 106, 196], fill=(246, 236, 214))                                # frame
    d.rectangle([30, 48, 98, 180], fill=(0, 0, 0, 0))                                    # glass hole
    d.rectangle([62, 48, 66, 180], fill=(246, 236, 214)); d.rectangle([30, 112, 98, 116], fill=(246, 236, 214))   # mullions
    d.rectangle([14, 188, 114, 200], fill=(214, 168, 120)); d.rectangle([14, 200, 114, 204], fill=(160, 112, 78))  # sill
    for x0, x1 in ((10, 30), (98, 118)):                                                  # tied-back curtains (warm rose)
        d.polygon([(x0, 36), (x1, 36), (x1 - 4, 120), (x1 + (6 if x0 < 50 else -26), 160), (x0, 160)], fill=(222, 120, 128))
        d.rectangle([x0, 112, x1, 118], fill=(250, 214, 104))                            # tie
    return im
def _win_glass_day():
    g = blank(1, 2); d = SD(g)
    d.rectangle([30, 48, 98, 180], fill=(122, 194, 232))
    d.rectangle([30, 140, 98, 180], fill=(150, 210, 238))                                 # paler near the horizon
    d.ellipse([36, 64, 60, 76], fill=(244, 248, 255)); d.ellipse([46, 58, 62, 72], fill=(244, 248, 255))   # small cloud
    d.polygon([(70, 52), (78, 52), (34, 172), (30, 172), (30, 160)], fill=(198, 236, 250))                # glass glint
    return g
def window_parts():
    import time_of_day
    from pixel import _nearest
    frame = pixelize(_win_frame(), outline=True); glass_day = pixelize(_win_glass_day(), outline=False, dither=0)
    a = np.asarray(glass_day).astype(float); mask = a[..., 3] > 0; out = {}
    for ph in PHASES:
        g = a.copy(); rgb = time_of_day.grade_fn(ph, g[..., :3])
        if ph == 'night': rgb = rgb * 0.62
        rgb = _nearest(rgb)
        if ph in SKY:                                    # dawn/dusk: the grade's warm direction, art-directed to palette sky colours
            lum = a[..., :3] @ np.array([0.3, 0.59, 0.11]); levels = sorted({round(v, 3) for v in lum[mask]})
            for i, lv in enumerate(levels): rgb[np.isclose(lum, lv)] = SKY[ph][min(i, 3)]
        g[..., :3] = np.where(mask[..., None], rgb, 0)
        gi = Image.fromarray(g.astype(np.uint8).copy(), 'RGBA').copy()
        if ph == 'night':
            px = gi.load()
            for x, y in ((18, 30), (40, 28), (22, 70), (44, 60), (36, 40)): px[x, y] = (252, 214, 104, 255)
            for y in range(72, 79):                                                  # crescent moon
                for x in range(40, 47):
                    if (x - 43) ** 2 + (y - 75) ** 2 <= 10 and (x - 45) ** 2 + (y - 74) ** 2 > 6: px[x, y] = (244, 248, 255, 255)
        im = Image.alpha_composite(gi, frame); out[ph] = (im.crop((0, 0, T, T)), im.crop((0, T, T, 2 * T)))
    return out
def handcar(new_padlock=False):
    """locked, empty rail handcar parked against the buffer (station_int 18,3): platform, pump beam, chain to the right edge + padlock"""
    im = shadow(blank(), [8, 100, 120, 124]); d = SD(im)
    for x in (24, 92): d.ellipse([x - 12, 92, x + 12, 116], fill=(64, 58, 72)); d.ellipse([x - 5, 99, x + 5, 109], fill=(150, 142, 160))
    d.rectangle([6, 80, 118, 96], fill=(176, 104, 64)); d.rectangle([6, 80, 118, 84], fill=(214, 150, 96))     # deck (empty on purpose)
    d.rectangle([58, 44, 68, 82], fill=(84, 78, 96)); d.polygon([(52, 84), (74, 84), (66, 74), (60, 74)], fill=(84, 78, 96))   # pump post
    d.line([(20, 52), (106, 38)], fill=(120, 84, 60), width=7); d.ellipse([58, 40, 68, 50], fill=(150, 142, 160))   # see-saw beam
    for x in (20, 106): d.rectangle([x - 6, 30 if x > 60 else 44, x + 6, (38 if x > 60 else 52) + 4], fill=(214, 168, 120))  # handles
    for i, x in enumerate(range(70, 126, 8)): d.ellipse([x, 86 + (i % 2) * 2, x + 8, 92 + (i % 2) * 2], outline=(150, 142, 160), width=2)  # chain to buffer
    lock = (250, 214, 104) if new_padlock else (176, 122, 84)
    d.arc([96, 62, 112, 80], 180, 360, fill=(150, 142, 160), width=3); d.rectangle([94, 72, 114, 92], fill=lock)
    d.rectangle([102, 78, 106, 86], fill=(44, 40, 52))
    if new_padlock: d.rectangle([96, 74, 100, 78], fill=(255, 250, 230))
    return im
def register_v040(reg):
    parts = window_parts()
    for k, half in (('t', 0), ('b', 1)):
        st = {ph: f'window_{ph}_{k}' for ph in PHASES}
        for ph in PHASES:
            reg(f'window_{ph}_{k}', 'interior', parts[ph][half], 'block', raw=True, states=st,
                notes=(f'wall window ({"top, wall row 1" if k == "t" else "bottom, wall row 2 = interact cell"}); glass shows the outside phase '
                       f'(time_of_day grade "{ph}" applied to the glass only; the room itself stays day-graded). Map stores window_day_*; '
                       'engine swaps to the current phase via states (dawn/day/dusk/night per time_of_day/grades.json schedule)'))
    hs = {'locked': 'handcar_locked', 'new_padlock': 'handcar_new_padlock'}
    reg('handcar_locked', 'deco', handcar(False), 'block', states=hs, notes='station_int handcar: locked + empty on purpose (Text Bot rail_buffer spot). Chain runs to the buffer at (19,3)')
    reg('handcar_new_padlock', 'deco', handcar(True), 'block', states=hs, notes='same handcar after beat_master_frostspire (shiny new padlock, still locked)')
