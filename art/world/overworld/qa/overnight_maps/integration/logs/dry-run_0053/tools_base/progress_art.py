# Art for progression tiles: story-gate blockers, bike-only boardwalk rails and jump ramps (design units U=128 -> 64px).
from gen_tiles import blank, SD, U, shadow
def rt_barricade():
    """Revival Tech survey checkpoint barrier: two posts, violet/cream striped board, crystal lamp."""
    im = blank(); d = SD(im)
    d.ellipse([8, 104, 120, 124], fill=(40, 30, 50, 90))
    for x in (14, 98): d.rectangle([x, 40, x + 16, 116], fill=(92, 86, 104)); d.rectangle([x + 3, 42, x + 6, 112], fill=(150, 144, 160))
    d.rectangle([4, 46, 124, 78], fill=(250, 240, 222))
    for i, x in enumerate(range(-24, 132, 24)): d.polygon([(x, 78), (x + 12, 78), (x + 30, 46), (x + 18, 46)], fill=(112, 52, 170))
    d.rectangle([4, 46, 124, 49], fill=(255, 255, 255)); d.rectangle([4, 76, 124, 78], fill=(60, 40, 80))
    d.rectangle([4, 84, 124, 92], fill=(214, 200, 176))
    d.polygon([(56, 10), (72, 10), (78, 26), (64, 42), (50, 26)], fill=(176, 118, 236)); d.polygon([(58, 14), (64, 14), (60, 30)], fill=(244, 226, 255))
    return im
def crystal_barrier(lit=True, f=0):
    im = blank(); d = SD(im)
    if lit:
        d.ellipse([4, 98, 124, 126], fill=(140, 80, 220, 110 + 40 * f))
        for x, h, w in ((10, 92, 26), (36, 118, 30), (70, 104, 28), (96, 84, 26)):
            d.polygon([(x, 120), (x + w, 120), (x + w - 4, 120 - h + 18), (x + w // 2, 120 - h), (x + 4, 120 - h + 18)], fill=(138, 74, 206))
            d.polygon([(x + 5, 118), (x + w // 2, 118), (x + w // 2, 124 - h), (x + 6, 120 - h + 20)], fill=(176, 118, 236))
            d.line([(x + w // 2 - 3, 112), (x + w // 2 - 3, 128 - h)], fill=(214, 172, 255) if f == 0 else (244, 226, 255), width=3)
    else:   # dimmed: shards sunk to stubs, walkable
        d.ellipse([6, 100, 122, 124], fill=(40, 30, 50, 70))
        for x, h, w in ((14, 22, 20), (44, 30, 24), (80, 20, 22), (102, 16, 16)):
            d.polygon([(x, 118), (x + w, 118), (x + w // 2, 118 - h)], fill=(94, 88, 102)); d.line([(x + 4, 116), (x + w // 2, 120 - h)], fill=(130, 122, 132), width=2)
    return im
def fallen_log(part):
    """vertical fallen trunk across an E-W trail; part t/m/b."""
    im = blank(); d = SD(im)
    y0 = 18 if part == 't' else 0; y1 = 110 if part == 'b' else U
    d.rectangle([30, y0, 100, y1], fill=(110, 68, 46)); d.rectangle([36, y0, 52, y1], fill=(146, 98, 62)); d.rectangle([84, y0, 100, y1], fill=(84, 48, 34))
    for y in range(y0 + 10, y1 - 4, 22): d.line([(58, y), (78, y + 8)], fill=(84, 48, 34), width=3)
    if part == 't': d.ellipse([30, 4, 100, 34], fill=(206, 152, 96)); d.ellipse([46, 12, 84, 28], fill=(186, 136, 86)); d.ellipse([58, 17, 72, 23], fill=(140, 96, 62))
    if part == 'b':
        for x0, x1 in ((20, 44), (60, 70), (90, 112)): d.polygon([(x0, 100), (x1, 100), ((x0 + x1) // 2, 126)], fill=(110, 68, 46))
    if part == 'm': d.ellipse([90, 40, 118, 60], fill=(82, 152, 58)); d.ellipse([96, 36, 120, 52], fill=(120, 186, 72))   # moss tuft
    return im
def bike_rail(orient):
    """narrow plank boardwalk: wide enough for bike tyres only (bike_only)."""
    im = blank(); d = SD(im)
    if orient == 'h':
        for x in (6, 70): d.rectangle([x, 40, x + 10, 108], fill=(90, 60, 40))
        d.rectangle([0, 52, U, 82], fill=(96, 66, 42))
        for x in range(0, U, 12): d.rectangle([x + 1, 54, x + 10, 80], fill=(186, 136, 86)); d.line([(x + 3, 56), (x + 3, 78)], fill=(222, 180, 120), width=2)
        d.rectangle([0, 82, U, 86], fill=(60, 40, 30, 160))
    else:
        for y in (6, 70): d.rectangle([34, y, 94, y + 8], fill=(90, 60, 40))
        d.rectangle([48, 0, 80, U], fill=(96, 66, 42))
        for y in range(0, U, 12): d.rectangle([50, y + 1, 78, y + 10], fill=(186, 136, 86)); d.line([(52, y + 3), (76, y + 3)], fill=(222, 180, 120), width=2)
    return im
def ramp(direction):
    """bike jump ramp; one-way in the arrow direction (like a ledge)."""
    im = blank(); d = SD(im)
    if direction == 'e':
        d.polygon([(10, 104), (118, 104), (118, 40), (10, 92)], fill=(150, 104, 66)); d.polygon([(10, 92), (118, 40), (118, 52), (10, 100)], fill=(206, 152, 96))
        d.rectangle([110, 40, 120, 116], fill=(96, 66, 42))
        for x in (34, 66): d.polygon([(x, 66), (x + 16, 74), (x, 82)], fill=(252, 214, 104))
    else:
        d.polygon([(20, 10), (108, 10), (108, 118), (20, 118)], fill=(150, 104, 66)); d.rectangle([20, 10, 108, 24], fill=(206, 152, 96))
        d.rectangle([14, 108, 114, 120], fill=(96, 66, 42))
        for y in (40, 72): d.polygon([(48, y), (80, y), (64, y + 16)], fill=(252, 214, 104))
    return im
CAVE_FERN = {'18382c': '1a1226', '244e34': '342842', '24522e': '3a1e60', '367634': '603096', '52983a': '8a4ace',
             '78ba48': 'b076ec', 'a6d460': 'd6acff', 'b076ec': '70cab8'}
def recolour(im, mp=CAVE_FERN):
    """exact palette swap (tall grass -> violet cave fern); translucent shadow pixels untouched."""
    H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    lut = {H(a): H(b) for a, b in mp.items()}; px = im.copy(); p = px.load()
    for y in range(px.height):
        for x in range(px.width):
            r, g, b, a = p[x, y]
            if a == 255 and (r, g, b) in lut: p[x, y] = lut[(r, g, b)] + (255,)
    return px
