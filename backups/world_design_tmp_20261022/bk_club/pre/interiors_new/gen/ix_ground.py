# Ground-layer tiles: floors (3 seamless variants each), wall sets, puzzle floor states, station platform.
import numpy as np
from ix_canvas import Cv, C, T, pnoise
import ix_floors as F

GROUND = {}   # name -> dict(cv=Cv, coll, cat, notes, anim(optional list of Cv))
def g(name, cv, coll=0, cat='floor', notes='', frames=None):
    GROUND[name] = dict(cv=cv, coll=coll, cat=cat, notes=notes, frames=frames)

def basket(seed, variant):
    cv = Cv(T, T); X, Y = cv.X, cv.Y
    bx = (X - 16) // 32; by = (Y - 16) // 32; ix = (X - 16) % 32; iy = (Y - 16) % 32
    horiz = (bx + by) % 2 == 0
    strip = np.where(horiz, iy // 8, ix // 8)
    t = 0.35 + 0.3 * ((strip * 37 + bx * 11 + by * 5) % 7) / 7.0
    grain = pnoise(seed, cells=8)
    t = t + 0.15 * (grain - 0.5) + np.where(np.where(horiz, iy % 8, ix % 8) == 0, 0.2, 0)
    cv.ramp(np.ones((T, T), bool), [C['brown'], C['mbrown'], C['tan'], C['ltan']], np.clip(t, 0, 1))
    cv.fill(np.where(horiz, iy % 8 == 7, ix % 8 == 7), C['bark'])
    cv.fill((ix == 31) | (iy == 31), C['dbrown'])
    if variant >= 1:
        cv.rect(28, 28, 36, 36, C['dteal']); cv.rect(30, 30, 34, 34, C['amber'])
    if variant == 2:
        for (x, y) in ((10, 40), (52, 22)): cv.px(x, y, C['bark'])
    return cv

def build():
    for v, s in enumerate('abc'):
        g('i_floor_oak_' + s, F.planks([C['brown'], C['mbrown'], C['tan'], C['ltan']], C['bark'], 11, v, knot=C['brown']), notes='Brookhollow oak planks')
        g('i_floor_pine_' + s, F.planks([C['mbrown2'], C['tan'], C['ltan'], C['sand2']], C['brown'], 12, v, vertical=True, joints={0: [24], 1: [56], 2: [8], 3: [40]}, knot=C['mbrown']), notes='Fernwick pine boards')
        g('i_floor_drift_' + s, F.planks([C['greyv'], C['grey'], C['grey2'], C['grey3']], C['slate2'], 13, v, nails=C['slate'], weather=True, knot=C['greyv']), notes='Saltmere weathered driftwood')
        g('i_floor_ash_' + s, F.planks([C['sand'], C['ltan'], C['sand2'], C['pale']], C['mbrown2'], 14, v, pw=16, joints={0: [12, 44], 1: [28, 60], 2: [4, 36], 3: [20, 52]}, knot=C['tan']), notes='Revival Heights pale ash boards')
        g('i_floor_parquet_' + s, basket(15, v), notes='Lanternport basket-weave parquet (brass studs on variants)')
        g('i_floor_heal_' + s, F.tiles_sq([C['grey3'], C['cream'], C['paper']], [C['pink2'], C['pink3'], C['paper']], C['grey2'], C['paper'], 16, v, speck=C['grey3']), notes='heal centre tile (white/rose)')
        g('i_floor_shop_' + s, F.tiles_sq([C['grey3'], C['cream'], C['paper']], [C['blue3'], C['sky'], C['lsky']], C['grey'], C['paper'], 17, v, speck=C['grey2']), notes='mart tile (white/blue)')
        g('i_floor_lab_' + s, F.tiles_sq([C['grey3'], C['paper'], C['paper']], [C['grey3'], C['cream'], C['paper']], C['grey2'], C['paper'], 18, v, size=16, off=8, speck=C['lteal']), notes='lab tile (small white)')
        g('i_floor_slate_' + s, F.tiles_sq([C['char'], C['slate2'], C['greyv']], [C['slate2'], C['greyv'], C['grey']], C['ink'], C['grey'], 19, v, crack=C['ink'], speck=C['orange2']), notes='Cindervale slate tiles')
        g('i_floor_flag_' + s, F.ashlar([C['greyv'], C['grey'], C['grey2']], C['slate2'], C['grey3'], 20, v, cracks=C['slate2']), notes='hall flagstones (running bond)')
        g('i_floor_saltflag_' + s, F.ashlar([C['grey2'], C['grey3'], C['cream'], C['paper']], C['grey'], C['paper'], 21, v, cracks=C['grey2'], glints=C['ice']), notes='Saltmere hall pale salt-stone')
        g('i_floor_basalt_' + s, F.ashlar([C['ink'], C['char'], C['slate2']], C['ink'], C['slate2'], 22, v, rh=16, sw=32, offs=(4, 20, 12, 28), cracks=C['orange'], glints=C['amber']), notes='Cindervale basalt (ember cracks on variants)')
        g('i_floor_marble_' + s, F.marble(23, v, inlay=C['amber']), notes='Aurelith marble (gold inlay on variants)')
        g('i_floor_carpet_red_' + s, F.carpet([C['wine'], C['red'], C['redor']], 24, v, motif=C['amber']), notes='wall-to-wall carpet')
        g('i_floor_carpet_teal_' + s, F.carpet([C['dteal'], C['teal'], C['lteal']], 25, v, motif=C['pale']), notes='wall-to-wall carpet')
        g('i_floor_carpet_violet_' + s, F.carpet([C['dviolet'], C['violet'], C['mviolet']], 26, v, motif=C['yellow']), notes='wall-to-wall carpet')
        g('i_floor_metal_' + s, F.metal(27, v), notes='Revival steel deck (variant c = vent grate)')
        g('i_floor_concrete_' + s, F.noise_floor([C['grey'], C['grey2'], C['grey3']], 28, v, cells=16, flecks=C['greyv']), notes='station concourse')
    # walls
    W = {
     'brook':   dict(ceil=[C['bark'], C['brown']], trim=[C['bark'], C['mbrown'], C['tan']], wall=[C['sand'], C['sand2'], C['pale']], paper='stripe', accent=C['tan'], wains=[C['brown'], C['mbrown'], C['tan']], window='square', frame=[C['brown'], C['tan']]),
     'fern':    dict(ceil=[C['dbrown'], C['bark']], trim=[C['bark'], C['brown'], C['mbrown2']], wall=[C['tan'], C['ltan'], C['sand2']], paper='planks', accent=C['mgreen'], wains=[C['fgreen'], C['green'], C['sage']], window='lattice', frame=[C['brown'], C['mbrown2']]),
     'salt':    dict(ceil=[C['slate'], C['greyv']], trim=[C['navy'], C['blue2'], C['sky']], wall=[C['grey3'], C['cream'], C['paper']], paper='planks', accent=C['sky'], wains=[C['navy'], C['blue2'], C['blue3']], window='porthole', frame=[C['greyv'], C['grey2']]),
     'cinder':  dict(ceil=[C['ink'], C['dbrown']], trim=[C['ink'], C['rust2'], C['burnt']], wall=[C['rust'], C['rust2'], C['burnt']], paper='brick', accent=C['orange'], wains=[C['char'], C['slate2'], C['greyv']], window='slit', frame=[C['char'], C['slate2']]),
     'revival': dict(ceil=[C['ink2'], C['char']], trim=[C['char'], C['slate'], C['mviolet']], wall=[C['grey2'], C['grey3'], C['cream']], paper='panel', accent=C['mviolet'], wains=[C['slate'], C['greyv'], C['grey']], window='ribbon', frame=[C['char'], C['slate']]),
     'lantern': dict(ceil=[C['dgreen'], C['fgreen2']], trim=[C['dgreen'], C['dteal'], C['amber']], wall=[C['dteal'], C['teal'], C['lteal']], paper='diamond', accent=C['amber'], wains=[C['bark'], C['brown'], C['mbrown']], window='arched', frame=[C['amber'], C['amber2']]),
     'aurelith':dict(ceil=[C['dviolet'], C['violet']], trim=[C['amber'], C['amber2'], C['yellow']], wall=[C['grey3'], C['cream'], C['paper']], paper='marble', accent=C['yellow'], wains=[C['grey2'], C['grey3'], C['cream']], window='arched', frame=[C['amber'], C['yellow']]),
     'heal':    dict(ceil=[C['wine'], C['red']], trim=[C['wine'], C['pink'], C['pink3']], wall=[C['cream'], C['paper'], C['paper']], paper='dots', accent=C['pink3'], wains=[C['pink'], C['pink2'], C['pink3']], window='square', frame=[C['pink'], C['paper']]),
     'shop':    dict(ceil=[C['navy'], C['blue']], trim=[C['navy'], C['blue2'], C['sky']], wall=[C['cream'], C['paper'], C['paper']], paper='stripe', accent=C['lsky'], wains=[C['blue'], C['blue2'], C['blue3']], window='square', frame=[C['blue2'], C['paper']]),
     'lab':     dict(ceil=[C['slate'], C['greyv']], trim=[C['slate'], C['grey'], C['lteal']], wall=[C['grey3'], C['cream'], C['paper']], paper='tile', accent=C['grey2'], wains=[C['dteal'], C['teal'], C['lteal']], window='square', frame=[C['grey'], C['paper']]),
     'station': dict(ceil=[C['char'], C['slate']], trim=[C['char'], C['slate'], C['amber']], wall=[C['dteal'], C['teal'], C['lteal']], paper='tile', accent=C['dteal'], wains=[C['char'], C['slate'], C['greyv']], window='arched', frame=[C['amber'], C['amber2']]),
     'hall':    dict(ceil=[C['ink'], C['char']], trim=[C['char'], C['slate2'], C['grey']], wall=[C['greyv'], C['grey'], C['grey2']], paper='brick', accent=C['grey'], wains=[C['slate'], C['slate2'], C['greyv']], window='lattice', frame=[C['slate2'], C['grey']]),
    }
    for k, st in W.items():
        ws = F.wall_set(st, 40 + len(k))
        for part, cv in ws.items():
            g('i_wall_%s_%s' % (part, k), cv, coll=1, cat='wall', notes='%s wall (%s)' % (k, {'top': 'row 0 ceiling band', 'upper': 'row 1', 'upper_win': 'row 1 with window', 'face': 'row 2 wainscot'}[part]))
    # dark void used outside irregular rooms
    cv = Cv(T, T); cv.rect(0, 0, T, T, C['ink']); g('i_void', cv, coll=1, cat='wall', notes='unlit void outside the room')
    # ---------- puzzle floors ----------
    def crust(v, broken=False):
        cv = Cv(T, T); X, Y = cv.X, cv.Y
        n = pnoise(60, cells=8)
        cv.ramp(np.ones((T, T), bool), [C['grey3'], C['cream'], C['paper']], 0.4 + 0.5 * n)
        hexes = (np.abs(((X + (Y // 16 % 2) * 8) % 16) - 8) + 0.5 * np.abs((Y % 16) - 8)) > 9.5
        cv.fill(hexes, C['grey2'])
        if v >= 1:
            for (x, y) in ((20, 24), (44, 40)): cv.px(x, y, C['ice'])
        if broken:
            rng = np.random.default_rng(9)
            for k in range(4):
                x, y = 32, 32
                for i in range(18):
                    cv.px(x, y, C['slate2']); x += int(rng.integers(-1, 2)) + (1 if k % 2 else -1) * (i % 2); y += (1 if k < 2 else -1)
                    x = min(max(x, 6), 57); y = min(max(y, 6), 57)
        return cv
    for v, s in enumerate('abc'): g('i_crust_' + s, crust(v), cat='puzzle', notes='salt crust: walk once; stepping off it turns it to a brine pit')
    g('i_crust_cracked', crust(0, True), cat='puzzle', notes='salt crust under the player (cracking state)')
    cv = crust(0)
    cv.ell(32, 33, 25, 22, C['grey2']); cv.ell(32, 34, 22, 19, C['dteal']); cv.vgrad(10, 15, 54, 53, C['teal'], C['dteal'], mask=cv.mask_ell(32, 34, 22, 19))
    cv.ell(26, 28, 6, 3, C['lteal']); cv.ell(40, 42, 4, 2, C['lteal'])
    g('i_brine_pit', cv, coll=3, cat='puzzle', notes='brine pit: falling in resets the room (treated as water/no-walk)')
    # lava (3-frame animation, flows down/along)
    frames = []
    for f in range(3):
        cv = Cv(T, T); n = pnoise(61, cells=4, octaves=2)
        sh = np.roll(n, f * 21, axis=0)
        cv.ramp(np.ones((T, T), bool), [C['rust'], C['burnt'], C['orange'], C['amber2'], C['yellow']], 0.15 + 0.85 * sh)
        crust_m = np.roll(pnoise(62, cells=8), f * 21, axis=0) > 0.78
        cv.fill(crust_m, C['rust'])
        frames.append(cv)
    g('i_lava', frames[0], coll=1, cat='puzzle', notes='flowing lava (blocks); animated 3 frames', frames=frames)
    g('i_channel', F.noise_floor([C['ink'], C['char'], C['slate2']], 63, 0, cells=16, flecks=C['rust2']), cat='puzzle', notes='dry lava channel (walkable when the stream is elsewhere)')
    def basin(full):
        cv = Cv(T, T); cv.ramp(np.ones((T, T), bool), [C['char'], C['slate2']], 0.5 * pnoise(64))
        cv.rect(6, 6, 58, 58, C['slate2']); cv.rect(8, 8, 56, 56, C['grey']); cv.hline(8, 56, 8, C['grey2'])
        cv.rect(12, 14, 52, 52, C['ink'])
        if full: cv.vgrad(12, 14, 52, 52, C['yellow'], C['orange']); cv.ell(26, 28, 6, 3, C['paper'])
        return cv
    g('i_basin_empty', basin(False), coll=1, cat='puzzle', notes='heat basin, cold')
    g('i_basin_full', basin(True), coll=1, cat='puzzle', notes='heat basin, filled (its latch is on)')
    # station
    for v, s in enumerate('abc'):
        cv = F.noise_floor([C['greyv'], C['grey'], C['grey2']], 65, v, cells=16, flecks=C['slate2'])
        g('i_platform_' + s, cv, notes='station platform')
    cv = F.noise_floor([C['greyv'], C['grey'], C['grey2']], 65, 0, cells=16)
    cv.rect(0, 0, T, 6, C['grey3']); cv.hline(0, T, 6, C['slate'])
    cv.rect(0, 10, T, 22, C['amber2']); cv.fill(cv.mask_rect(0, 10, T, 22) & ((cv.X % 8 == 2) | (cv.X % 8 == 5)) & ((cv.Y % 6) == 3), C['amber'])
    g('i_platform_edge', cv, notes='platform edge (tactile strip), walkable; track is the row above')
    cv = F.noise_floor([C['dbrown'], C['bark'], C['slate2']], 66, 0, cells=16, flecks=C['grey'])
    for x in range(4, 64, 16): cv.rect(x, 0, x + 8, 64, C['brown']); cv.vline(x, 0, 64, C['mbrown'])
    for y in (14, 46): cv.rect(0, y, T, y + 6, C['grey2']); cv.hline(0, T, y, C['grey3']); cv.hline(0, T, y + 5, C['slate'])
    # sleepers run vertically? use horizontal track: rails horizontal, sleepers vertical
    g('i_rail_track', cv, coll=1, cat='floor', notes='Lumen Line track (blocks)')
    # power rail floor strip (Revival hall): a lit conduit across metal deck
    def rail(kind):
        cv = F.metal(27, 0)
        if kind == 'h': cv.rect(0, 26, T, 38, C['char']); cv.rect(0, 30, T, 34, C['mviolet']); cv.hline(0, T, 31, C['lav'])
        if kind == 'v': cv.rect(26, 0, 38, T, C['char']); cv.rect(30, 0, 34, T, C['mviolet']); cv.vline(31, 0, T, C['lav'])
        if kind == 'gap':
            cv.rect(0, 26, 12, 38, C['char']); cv.rect(52, 26, T, 38, C['char']); cv.rect(0, 30, 12, 34, C['mviolet']); cv.rect(52, 30, T, 34, C['mviolet'])
            cv.rect(14, 14, 50, 50, C['ink2']); cv.frame(14, 14, 50, 50, C['amber']); cv.rect(22, 30, 42, 34, C['dviolet'])
        return cv
    g('i_rail_h', rail('h'), notes='power rail conduit (walkable)')
    g('i_rail_v', rail('v'), notes='power rail conduit (walkable)')
    g('i_rail_gap', rail('gap'), coll=7, cat='puzzle', notes='rail gap socket: a hold plate; a power cube on it bridges the rail')

if __name__ == '__main__':
    build(); print(len(GROUND))
