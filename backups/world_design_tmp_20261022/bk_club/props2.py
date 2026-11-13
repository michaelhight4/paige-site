# Extra interior props, floors, walls and puzzle tiles (192px native, 128-unit design space).
from buildings import *

def wood_box(d, box, c, lip=10):
    x0, y0, x1, y1 = box; d.rectangle(box, fill=shade(c, 0.7)); d.rectangle([x0, y0, x1, y0 + lip], fill=lift(c, 18)); d.rectangle([x0 + 4, y0 + lip, x1 - 4, y1 - 4], fill=c)

def floor_carpet(seed):
    a = colorize(pnoise(seed, 2) * 0.5 + pnoise(seed + 1, 8) * 0.5, (92, 98, 124), (118, 124, 150)); im = arr2img(a); d = SD(im)
    for k in (0, 64): d.line([(0, k), (U, k)], fill=(84, 88, 112), width=2); d.line([(k, 0), (k, U)], fill=(84, 88, 112), width=2)
    return im

def floor_stone(seed, c1=(176, 168, 156), c2=(206, 198, 184)):
    im = arr2img(colorize(pnoise(seed, 5), c1, c2)); d = SD(im); r = random.Random(seed)
    for gy in range(2):
        for gx in range(2):
            x, y = gx * 64 + (gy % 2) * 0, gy * 64; c = lift(c2, r.randint(-14, 6))
            d.rectangle([x + 2, y + 2, x + 62, y + 62], fill=c); d.line([(x + 4, y + 4), (x + 50, y + 4)], fill=lift(c, 20), width=2)
            d.line([(x + 2, y + 62), (x + 62, y + 62)], fill=shade(c, 0.7), width=2)
    return im

def floor_arena(seed):
    im = floor_stone(seed, (150, 128, 160), (182, 160, 190)); return im

def arena_ring():
    """4x4 battle-floor marking painted over floor_arena (walkable deco)."""
    im = blank(4, 4); d = SD(im); c = 256
    g = blank(4, 4); SD(g).ellipse([c - 220, c - 220, c + 220, c + 220], fill=(190, 120, 255, 70)); im = Image.alpha_composite(im, pblur(g, 20)); d = SD(im)
    d.ellipse([c - 230, c - 230, c + 230, c + 230], outline=(246, 236, 255), width=8); d.ellipse([c - 70, c - 70, c + 70, c + 70], outline=(246, 236, 255), width=6)
    d.line([(c - 230, c), (c + 230, c)], fill=(246, 236, 255), width=6)
    for sgn in (-1, 1): d.rectangle([c - 40, c + sgn * 170 - 14, c + 40, c + sgn * 170 + 14], outline=(232, 196, 90), width=5)
    d.polygon([(c, c - 34), (c + 18, c), (c, c + 34), (c - 18, c)], fill=(150, 80, 220))
    return im

IWALL = {'house': (236, 214, 170), 'heal': (226, 240, 236), 'shop': (214, 230, 244), 'house2': (196, 222, 196), 'house3': (226, 206, 226), 'office': (206, 210, 224), 'hall': (196, 184, 160)}
def iwall_face2(kind):
    top = IWALL[kind]; im = Image.new('RGBA', (T, T)); d = SD(im)
    if kind == 'hall':
        wall_fill(d, [0, 0, U, U], 'stone', top, 5); d.rectangle([0, 104, U, U], fill=(120, 100, 84)); return im
    d.rectangle([0, 0, U, U], fill=top)
    if kind in ('house2', 'house3'):
        for x in range(0, U, 16): d.line([(x + 8, 0), (x + 8, 80)], fill=lift(top, -14), width=2)
        for x in range(0, U, 32):
            for y in (20, 52): d.ellipse([x + 12, y, x + 20, y + 8], fill=lift(top, -30))
    elif kind == 'office':
        for x in range(0, U, 64): d.line([(x, 0), (x, 80)], fill=lift(top, -20), width=2)
    else:
        for x in range(8, U, 32): d.line([(x, 0), (x, 80)], fill=tuple(v - 18 for v in top), width=3)
    wain = (150, 104, 64) if kind != 'office' else (110, 116, 136)
    d.rectangle([0, 80, U, U], fill=wain); d.line([(0, 82), (U, 82)], fill=lift(wain, 40), width=4)
    for x in range(0, U, 32): d.rectangle([x + 4, 90, x + 28, 116], outline=shade(wain, 0.8), width=2)
    d.rectangle([0, 120, U, U], fill=shade(wain, 0.6))
    return im

def iwall_upper2(kind):
    c = IWALL[kind]; im = Image.new('RGBA', (T, T), c); d = SD(im)
    if kind == 'hall':
        wall_fill(d, [0, 0, U, U], 'stone', c, 9); d.rectangle([0, 0, U, 14], fill=(120, 100, 84)); return im
    for x in range(8, U, 32): d.line([(x, 0), (x, U)], fill=lift(c, -18), width=3)
    d.rectangle([0, 0, U, 14], fill=(170, 130, 96) if kind != 'office' else (110, 116, 136)); d.line([(0, 16), (U, 16)], fill=(120, 86, 60), width=3)
    if kind != 'office': d.rectangle([40, 44, 88, 96], fill=(120, 86, 60)); d.rectangle([46, 50, 82, 90], fill=(160, 200, 220)); d.line([(64, 50), (64, 90)], fill=(120, 86, 60), width=3)
    else: d.rectangle([20, 40, 108, 100], fill=(150, 154, 168)); d.rectangle([26, 46, 102, 94], fill=(130, 176, 210)); d.line([(64, 46), (64, 94)], fill=(150, 154, 168), width=3)
    return im

def prop2(name):
    if name == 'desk_pc':
        im = blank(2, 1); im = shadow(im, [12, 96, 244, 126]); d = SD(im)
        wood_box(d, [12, 40, 244, 112], (150, 108, 70), 16)
        d.rectangle([30, 4, 104, 50], fill=(46, 48, 58)); d.rectangle([36, 10, 98, 44], fill=(120, 90, 220)); d.line([(40, 16), (80, 16)], fill=(220, 200, 255), width=2); d.rectangle([62, 48, 72, 58], fill=(60, 60, 70))
        d.rectangle([40, 58, 100, 68], fill=(210, 210, 216)); d.rectangle([150, 30, 210, 54], fill=(250, 250, 240)); d.line([(156, 38), (200, 38)], fill=(150, 150, 160), width=2); d.ellipse([214, 40, 232, 58], fill=(240, 240, 236)); d.ellipse([218, 44, 228, 54], fill=(110, 70, 40))
        return im
    if name == 'filing':
        im = blank(1, 2); im = shadow(im, [16, 236, 112, 254]); d = SD(im)
        d.rectangle([20, 60, 108, 250], fill=(150, 156, 170)); d.rectangle([20, 60, 108, 74], fill=(186, 190, 202)); d.rectangle([96, 60, 108, 250], fill=(120, 126, 140))
        for y in (86, 140, 194): d.rectangle([28, y, 92, y + 44], fill=(170, 176, 190), outline=(120, 126, 140), width=2); d.rectangle([50, y + 16, 70, y + 22], fill=(90, 94, 106))
        return im
    if name == 'cooler':
        im = blank(1, 2); im = shadow(im, [30, 236, 98, 254]); d = SD(im)
        d.rectangle([36, 150, 92, 250], fill=(230, 232, 236)); d.rectangle([80, 150, 92, 250], fill=(196, 198, 206)); d.rectangle([50, 170, 58, 182], fill=(80, 140, 220)); d.rectangle([66, 170, 74, 182], fill=(220, 80, 80))
        d.rounded_rectangle([40, 70, 88, 150], 16, fill=(140, 196, 240)); d.rounded_rectangle([48, 76, 60, 140], 6, fill=(200, 232, 250)); return im
    if name == 'crystal_display':
        im = blank(1, 2); im = shadow(im, [14, 236, 114, 254]); d = SD(im)
        d.rectangle([22, 180, 106, 250], fill=(70, 66, 88)); d.rectangle([22, 180, 106, 192], fill=(110, 104, 130))
        cr = crystal().resize((int(110 * S), int(110 * S)), Image.LANCZOS); im.alpha_composite(cr, (int(9 * S), int(76 * S))); d = SD(im)
        d.rectangle([22, 70, 106, 182], outline=(200, 220, 240), width=3); d.line([(30, 80), (50, 170)], fill=(230, 240, 250), width=2)
        return im
    if name == 'bookcase':
        im = blank(2, 2); d = SD(im); r = random.Random(13); wood_box(d, [10, 40, 246, 250], (120, 80, 50), 12)
        for y in (62, 124, 186):
            d.rectangle([20, y, 236, y + 54], fill=(76, 50, 32)); x = 22
            while x < 230: bw = r.randint(8, 16); bh = r.randint(36, 50); d.rectangle([x, y + 54 - bh, x + bw, y + 54], fill=r.choice([(180, 60, 60), (60, 120, 180), (200, 170, 80), (110, 70, 160), (70, 140, 90)])); d.line([(x + 2, y + 60 - bh), (x + 2, y + 50)], fill=(255, 255, 255, 90), width=1); x += bw + 1
        return im
    if name == 'stove':
        im = blank(1, 2); d = SD(im); d.rectangle([12, 110, 116, 250], fill=(60, 62, 70)); d.rectangle([12, 110, 116, 124], fill=(96, 98, 108))
        d.rectangle([26, 150, 102, 220], fill=(40, 40, 46)); d.rectangle([32, 160, 96, 210], fill=(230, 120, 60)); d.rectangle([40, 126, 88, 134], fill=(200, 200, 206))
        d.ellipse([34, 92, 94, 120], fill=(160, 160, 170)); d.ellipse([40, 70, 88, 112], fill=(200, 80, 60)); g = blank(1, 2); SD(g).ellipse([40, 30, 90, 80], fill=(240, 240, 246, 110)); im = Image.alpha_composite(im, pblur(g, 6))
        return im
    if name == 'cupboard':
        im = blank(1, 2); d = SD(im); wood_box(d, [10, 50, 118, 250], (176, 128, 80), 12)
        for y in (70, 160):
            for x in (18, 66): d.rectangle([x, y, x + 44, y + 80], fill=(196, 148, 96), outline=(130, 90, 54), width=2); d.ellipse([x + 18 + (14 if x == 18 else -14), y + 36, x + 26 + (14 if x == 18 else -14), y + 44], fill=(232, 200, 110))
        for k, c in enumerate([(240, 240, 236), (200, 120, 80), (90, 150, 200)]): d.ellipse([20 + k * 30, 32, 44 + k * 30, 56], fill=c)
        return im
    if name == 'kcounter':
        im = blank(); d = SD(im); wood_box(d, [0, 30, U, 124], (186, 140, 92), 22); d.rectangle([0, 30, U, 52], fill=(230, 226, 214))
        d.ellipse([20, 34, 52, 48], fill=(240, 240, 236)); d.ellipse([70, 30, 100, 50], fill=(220, 90, 70)); return im
    if name == 'fireplace':
        im = blank(2, 2); d = SD(im); wall_fill(d, [20, 30, 236, 250], 'stone', (170, 150, 136), 4)
        d.rectangle([10, 120, 246, 136], fill=(120, 84, 56)); d.pieslice([70, 150, 186, 270], 180, 360, fill=(40, 30, 30)); d.rectangle([70, 210, 186, 250], fill=(40, 30, 30))
        g = blank(2, 2); SD(g).ellipse([70, 170, 186, 270], fill=(255, 150, 60, 200)); im = Image.alpha_composite(im, pblur(g, 10)); d = SD(im)
        for x in (100, 128, 150): d.polygon([(x - 12, 248), (x, 196), (x + 12, 248)], fill=(255, 190, 80))
        d.ellipse([60, 80, 90, 120], fill=(240, 240, 236)); d.rectangle([150, 84, 190, 120], fill=(110, 70, 160)); return im
    if name == 'armchair':
        im = blank(); im = shadow(im, [20, 108, 108, 126]); d = SD(im)
        d.rounded_rectangle([22, 24, 106, 84], 16, fill=(160, 70, 70)); d.rounded_rectangle([16, 60, 112, 118], 14, fill=(190, 90, 86)); d.rounded_rectangle([36, 66, 92, 96], 8, fill=(210, 120, 110)); return im
    if name == 'dresser':
        im = blank(); d = SD(im); wood_box(d, [14, 30, 114, 124], (150, 104, 64), 12)
        for y in (50, 84): d.rectangle([22, y, 106, y + 28], fill=(170, 122, 76), outline=(110, 74, 44), width=2); d.ellipse([58, y + 10, 70, y + 18], fill=(232, 200, 110))
        return im
    if name == 'pillar':
        im = blank(1, 2); im = shadow(im, [14, 230, 114, 254]); d = SD(im)
        d.rectangle([24, 20, 104, 240], fill=(214, 204, 184)); d.rectangle([84, 20, 104, 240], fill=(180, 168, 150))
        for x in (40, 58, 76): d.line([(x, 36), (x, 222)], fill=(190, 180, 160), width=3)
        d.rectangle([14, 6, 114, 26], fill=(232, 222, 202)); d.rectangle([14, 230, 114, 250], fill=(196, 186, 166)); return im
    if name == 'banner':
        im = blank(); d = SD(im); d.rectangle([24, 0, 104, 14], fill=(90, 60, 40)); d.rectangle([34, 10, 94, 110], fill=(120, 50, 150)); d.polygon([(34, 110), (94, 110), (64, 126)], fill=(120, 50, 150))
        d.rectangle([34, 10, 94, 20], fill=(232, 196, 90)); d.polygon([(64, 40), (78, 62), (64, 94), (50, 62)], fill=(232, 196, 90)); return im
    if name == 'brazier':
        im = blank(); g = blank(); SD(g).ellipse([20, 0, 108, 90], fill=(255, 170, 80, 140)); im = Image.alpha_composite(im, pblur(g, 12)); d = SD(im)
        d.polygon([(40, 70), (88, 70), (76, 120), (52, 120)], fill=(70, 62, 66)); d.ellipse([36, 62, 92, 78], fill=(96, 84, 88))
        for x, hh in ((52, 40), (64, 58), (76, 42)): d.polygon([(x - 10, 70), (x, 70 - hh), (x + 10, 70)], fill=(255, 160, 60))
        d.polygon([(56, 70), (64, 30), (72, 70)], fill=(255, 236, 150)); return im
    if name == 'dais':
        im = blank(4, 2); im = shadow(im, [0, 220, 512, 256], 90, 8); d = SD(im)
        d.rectangle([8, 70, 504, 236], fill=(120, 100, 130)); d.rectangle([8, 70, 504, 96], fill=(170, 150, 180))
        for k, y in enumerate((150, 196)): d.rectangle([8 + k * 0, y, 504, y + 40], fill=(150 - k * 20, 130 - k * 20, 160 - k * 20)); d.line([(8, y), (504, y)], fill=(200, 184, 210), width=3)
        d.rectangle([150, 96, 362, 150], fill=(130, 50, 150)); d.rectangle([150, 96, 362, 104], fill=(232, 196, 90))
        return im
    if name == 'barrel':
        im = blank(); im = shadow(im, [26, 106, 102, 126]); d = SD(im); d.rounded_rectangle([32, 34, 96, 120], 14, fill=(150, 100, 58))
        for y in (50, 100): d.rectangle([30, y, 98, y + 6], fill=(80, 76, 80))
        d.ellipse([34, 26, 94, 46], fill=(120, 80, 46)); return im
    if name == 'rail':   # stone balustrade used as a barrier row in the master's hall
        im = blank(); im = shadow(im, [0, 104, U, 124]); d = SD(im)
        d.rectangle([0, 40, U, 52], fill=(222, 212, 190)); d.rectangle([0, 52, U, 56], fill=(160, 146, 126))
        for x in (8, 40, 72, 104):
            d.rectangle([x, 56, x + 16, 104], fill=(206, 196, 176)); d.rectangle([x + 12, 56, x + 16, 104], fill=(168, 156, 138))
        d.rectangle([0, 102, U, 114], fill=(180, 168, 148)); return im
    raise KeyError(name)

# ---------------- puzzle tiles ----------------
def push_boulder():
    im = blank(); im = shadow(im, [16, 92, 116, 126], 110, 6); d = SD(im)
    d.ellipse([16, 22, 112, 118], fill=(118, 106, 128)); d.ellipse([22, 24, 100, 98], fill=(150, 138, 160)); d.ellipse([30, 30, 70, 60], fill=(186, 176, 196))
    d.arc([16, 22, 112, 118], 20, 160, fill=(70, 60, 82), width=5)
    d.line([(52, 66), (64, 54), (76, 66), (64, 80), (52, 66)], fill=(200, 150, 255), width=4)   # carved glyph = 'pushable'
    return im

def pressure_plate(on, style='cave'):
    im = blank(); d = SD(im)
    base = (96, 88, 108) if style == 'cave' else (120, 104, 136)
    d.rounded_rectangle([14, 26, 114, 116], 12, fill=shade(base, 0.6)); d.rounded_rectangle([20, 24 + (8 if on else 0), 108, 104 + (8 if on else 0)], 10, fill=base)
    gl = (210, 160, 255) if on else (120, 100, 140)
    if on:
        g = blank(); SD(g).ellipse([10, 10, 118, 118], fill=(190, 120, 255, 150)); im = Image.alpha_composite(im, pblur(g, 10)); d = SD(im)
    y0 = 64 + (8 if on else 0)
    d.ellipse([40, y0 - 24, 88, y0 + 24], outline=gl, width=5); d.polygon([(64, y0 - 14), (74, y0), (64, y0 + 14), (54, y0)], fill=gl)
    return im

def crystal_switch(on):
    im = blank(); im = shadow(im, [28, 104, 100, 124]); d = SD(im)
    d.polygon([(34, 96), (94, 96), (100, 120), (28, 120)], fill=(84, 76, 96)); d.rectangle([28, 94, 100, 102], fill=(120, 110, 136))
    if on:
        g = blank(); SD(g).ellipse([10, 0, 118, 110], fill=(200, 120, 255, 170)); im = Image.alpha_composite(im, pblur(g, 12)); d = SD(im)
    c1, c2, c3 = ((150, 80, 230), (110, 50, 190), (240, 210, 255)) if on else ((96, 80, 120), (70, 58, 92), (150, 140, 170))
    d.polygon([(64, 10), (88, 44), (78, 98), (50, 98), (40, 44)], fill=c1); d.polygon([(64, 10), (88, 44), (78, 98), (64, 92)], fill=c2); d.polygon([(64, 10), (54, 46), (58, 86)], fill=c3)
    return im

def crystal_gate(open_, style='cave'):
    im = blank(); d = SD(im)
    d.rectangle([0, 92, U, 116], fill=(70, 62, 80)); d.line([(0, 94), (U, 94)], fill=(120, 110, 136), width=3)
    for x in (10, 42, 74, 106):
        if open_:
            d.polygon([(x, 100), (x + 6, 88), (x + 12, 100)], fill=(120, 80, 170))
        else:
            d.polygon([(x - 2, 104), (x + 2, 14), (x + 6, 2), (x + 10, 14), (x + 14, 104)], fill=(140, 70, 220)); d.polygon([(x + 6, 2), (x + 10, 14), (x + 14, 104), (x + 7, 100)], fill=(100, 44, 170)); d.line([(x + 3, 20), (x + 3, 96)], fill=(230, 200, 255), width=2)
    if not open_:
        g = blank(); SD(g).rectangle([0, 0, U, 110], fill=(170, 100, 255, 60)); im = Image.alpha_composite(pblur(g, 10), im)
    return im
