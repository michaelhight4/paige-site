"""grass_leaves (Animator DRAFT): loose leaf particles kicked up when the player steps into tall grass.
Pairs with the existing tile rustle in src/overworld/renderer.js (not touched)."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from fxx_lib import *
P = 'grass_leaves'
C = {'W': 'e8ce92', 'H': 'a6d460', 'M': '78ba48', 'D': '52983a'}
POSES = [["..WH.", ".WHHM", "WHMM.", "MD..."], ["..W", ".WH", "WHM", "HMD", "MD."], ["WHHM", ".MDD"], ["WH...", ".HHM.", "..MMD", "...D."]]
def leaf(cv, x, y, pose):
    """5x4-ish leaf, straw-lit tip, 1px INK outline so it separates from same-green grass."""
    p = POSES[pose % 4]; g = blank(cv.shape[1], cv.shape[0])
    for r, row in enumerate(p):
        for c, ch in enumerate(row):
            if ch != '.': px(g, x + c - len(row) // 2, y + r - len(p) // 2, C[ch])
    o = outline(g, INK); m = o[..., 3] > 0; cv[m] = o[m]
# canvas 64x96: tile top-left at (0,32). paths in canvas px per frame
PATH_A = [(26, 52), (22, 40), (18, 30), (15, 23), (13, 20), (12, 21), (11, 24), (10, 28), (9, 33)]
PATH_B = [(39, 54), (42, 42), (46, 31), (49, 24), (51, 20), (52, 22), (54, 25), (55, 29), (56, 34)]
def anim(paths, n=9):
    fr = []
    for i in range(n):
        cv = blank(64, 96)
        for j, pth in enumerate(paths):
            x, y = pth[i]; leaf(cv, x, y, i + j * 2)
        fr.append(cv)
    return fr
def main():
    a = {}
    ms = [50, 50, 55, 60, 70, 80, 80, 80, 70]
    a['a'] = write_anim(P, 'leaves_a', anim([PATH_A, PATH_B]), ms, anchor=dict(canvas_px=[0, 32], meaning='canvas (0,32) = top-left of the tall-grass tile the player stepped INTO'), emissive=False,
        notes='2 leaves pop out of the grass tops, tumble (4 poses) and fall back in. Sprite grade. Draw above the grass tile, below the player when the leaf is lower than the player\'s head (simplest: draw after the tile layer, before actors).')
    a['b'] = write_anim(P, 'leaves_b', anim([[(x + 6, y) for x, y in PATH_B]]), ms, anchor=dict(canvas_px=[0, 32], meaning='same as leaves_a'), emissive=False,
        notes='1-leaf variant so repeated steps do not look identical.')
    rm = []
    for i, (y, pose) in enumerate([(30, 0), (27, 0), (29, 2)]):
        cv = blank(64, 96); leaf(cv, 33, y, pose); rm.append(cv)
    a['rm'] = write_anim(P, 'leaves_reduced_motion', rm, [90, 120, 90], anchor=dict(canvas_px=[0, 32], meaning='same as leaves_a'), emissive=False,
        notes='Reduced motion: one leaf peeks above the grass and settles; no arcs.')
    hooks = dict(trigger='player (or a walking follower) ENTERS a tall_grass_* tile; start with the tile rustle (same ms)',
                 pick='alternate leaves_a / leaves_b per step (or random); skip when running on a bike over 3 grass tiles in a row: play every other step',
                 not_on='surf, cut-scenes', reduced_motion='use leaves_reduced_motion',
                 grade='sprite grade (not emissive): leaves dim at night with the grass, the dark edge keeps them readable')
    tg = ow_bg(['tall_grass_1111_v0'], 1, 2, under='grass_0'); gr = ow_bg(['grass_0', 'tall_grass_1111_v1'], 1, 2, under='grass_0')
    bg = np.concatenate([tg[32:], gr[32:]], 1)
    tod = {}
    tod['a'] = tod_check(P, 'leaves_a', bg, [(a['a'], 0, 0), (a['a'], 64, 0)])
    tod['b'] = tod_check(P, 'leaves_b', bg, [(a['b'], 0, 0), (a['b'], 64, 0)])
    tod['rm'] = tod_check(P, 'leaves_reduced_motion', bg, [(a['rm'], 0, 0), (a['rm'], 64, 0)])
    big = ow_bg(['tall_grass_1111_v0', 'tall_grass_1111_v1'] * 2, 3, 3, under='grass_0')
    seq = [comp(big, f, 64, 64) for f in a['a']['_frames']] + [big] * 2 + [comp(big, f, 64, 64) for f in a['b']['_frames']] + [big]
    preview_gif(P, 'leaves_on_tall_grass', seq, ms + [200, 200] + ms + [400])
    rows = [[comp(bg[:, :64], f, 0, 0) for f in a[k]['_frames']] for k in ('a', 'b', 'rm')]
    preview_png(P, 'grass_leaves_contact', contact(rows))
    about = 'Tall-grass step leaves (MECHANICS_PARITY grass feedback). Leaves only, no dust or haze.'
    print(dump_piece(P, about, hooks, tod))
    for k, v in tod.items(): print(k, v['readable_fraction'], v['passed'])
if __name__ == '__main__': main()
