# DRAFT (World Design overnight, Oct 23 2026): snow pine tile pair, registered LAST by name (after every core/late tile,
# before finalize), plus the swap of green trees standing on snow in the overnight draft maps. Sandbox only.
# Same recipe as gen_tiles.tree(): 1x2 drawing in design units -> pixelize(outline) -> top = overlay (crown, drawn over
# characters), base = decoration (lower crown + trunk, blocks). No floor shadow is drawn (depth pass / no baked shadows).
import math, random
import build
from gen_tiles import blank, SD, T, U
from pixel import pixelize

TRUNK, TRUNK_HI = (106, 68, 46), (146, 98, 62)
NEEDLE = [(24, 56, 44), (36, 78, 52), (56, 104, 62)]          # forest ramp, dark -> light (light from upper left)
SNOW, SNOW_SH, SNOW_BLUE = (252, 246, 232), (204, 198, 194), (198, 236, 250)

def snow_pine():
    im = blank(1, 2); d = SD(im); r = random.Random(77)
    d.polygon([(56, 250), (72, 250), (70, 196), (58, 196)], fill=TRUNK); d.line([(61, 248), (61, 200)], fill=TRUNK_HI, width=3)
    tiers = [(20, 92, 26), (62, 150, 40), (108, 206, 54)]       # (apex y, base y, half width) top -> bottom
    for i, (ay, by, hw) in enumerate(reversed(tiers)):
        # needle mass: dark full triangle, lighter left face, ragged hem
        d.polygon([(64, ay), (64 - hw, by), (64 + hw, by)], fill=NEEDLE[0])
        d.polygon([(64, ay + 4), (64 - hw + 6, by - 4), (62, by - 6)], fill=NEEDLE[1])
        d.polygon([(64, ay + 10), (64 - hw * 0.55, by - 18), (60, by - 22)], fill=NEEDLE[2])
        for k in range(7):
            x = 64 - hw + 4 + k * (2 * hw - 8) / 6; d.polygon([(x - 7, by - 2), (x + 7, by - 2), (x, by + 7)], fill=NEEDLE[0])
    for ay, by, hw in tiers:
        # snow cap: lies on the upper slopes of each tier, thicker on top, with a cool underside line
        cap_y = ay + (by - ay) * 0.42; cw = hw * 0.42
        d.polygon([(64, ay - 1), (64 - cw - 3, cap_y), (64 + cw + 3, cap_y)], fill=SNOW_SH)
        d.polygon([(64, ay - 2), (64 - cw, cap_y - 4), (64 + cw * 0.8, cap_y - 6)], fill=SNOW)
        for k in range(4):
            x = 64 - cw + 4 + k * (2 * cw - 8) / 3; d.ellipse([x - 5, cap_y - 6, x + 5, cap_y + 3 + (k % 2) * 4], fill=SNOW)
        # snow on the tier hem (drift on the branch tips)
        for k in range(3):
            x = 64 - hw * 0.7 + k * hw * 0.7; y = by - 8 - r.uniform(0, 4)
            d.ellipse([x - 8, y - 3, x + 8, y + 4], fill=SNOW if k != 2 else SNOW_SH)
        d.line([(64 - cw, cap_y + 1), (64 + cw, cap_y + 1)], fill=SNOW_BLUE, width=2)
    return im

def register():
    if 'snowpine_top' in build.BYNAME: return build.BYNAME['snowpine_top']['id'], build.BYNAME['snowpine_base']['id']
    t = pixelize(snow_pine(), True)
    a = build.reg('snowpine_top', 'overlay', t.crop((0, 0, T, T)), raw=True, notes='DRAFT overnight: snow pine crown (overlay, over characters); pair of snowpine_base')
    b = build.reg('snowpine_base', 'deco', t.crop((0, T, T, 2 * T)), 'block', raw=True, notes='DRAFT overnight: snow pine trunk/lower crown (decoration, blocks); crown in snowpine_top')
    for t_ in (a, b):   # autotile port present: reg() gave a temporary 9000xx id and assign_new() has already run -> number it here
        if t_.pop('new_pending', None) is not None:
            if t_ in getattr(build, 'NEW_TILES', []): build.NEW_TILES.remove(t_)
            t_['id'] = max(x['id'] for x in build.TILES if not x.get('ext') and not x.get('new_pending') and x is not t_) + 1
            build.TILES.remove(t_); build.TILES.append(t_)
    # without the port reg() already gives count+1 -> in both cases the pair takes the next two ids after the LAST core tile
    return a['id'], b['id']

def apply(MAPS):
    """Before finalize: only RECORD the green trees on snow (names stay tree_* so finalize, canopy collision and every
    on-demand edge tile keep their ids). late() swaps them after the last tile is registered."""
    for m in MAPS:
        if not getattr(m, 'draft', False): continue
        snow = sum(row.count('snow') for row in m.terr) / float(m.w * m.h); cells = []
        for y in range(m.h):
            for x in range(m.w):
                if m.deco[y][x] == 'tree_base' and (snow > 0.5 or m.terr[y][x] == 'snow'):
                    cells.append((x, y, y > 0 and m.over[y - 1][x] == 'tree_top'))
        if cells: m.snow_pine_cells = cells
    return []

def late(res):
    """After every map is final and after club.late: register the pair LAST (new ids at the end, nothing renumbered), patch ids."""
    todo = [(n, r) for n, r in res.items() if getattr(r[0], 'snow_pine_cells', None)]
    if not todo: return []
    top, base = register(); log = [f'snowpine_top={top} snowpine_base={base} (registered last)']
    for n, (m, G, D, O, C, E) in todo:
        for x, y, has_top in m.snow_pine_cells:
            D[y][x] = base; m.deco[y][x] = 'snowpine_base'
            if has_top: O[y - 1][x] = top; m.over[y - 1][x] = 'snowpine_top'
        log.append(f'{n}: {len(m.snow_pine_cells)} green trees -> snow pine')
    return log
