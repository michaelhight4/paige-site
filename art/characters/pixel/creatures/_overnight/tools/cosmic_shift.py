"""Custom Cosmic swap for types with no family map: hue-rotate every non-violet, non-neutral
palette colour and snap to the nearest 64-palette colour. Crystal violets never swapped,
and results never land in the violet hue band."""
import sys, json, colorsys, numpy as np
sys.path.insert(0, '/workspace/kilumen/art/characters/pixel/tools'); import wild_pxlib as W
VIOL = {'3a1e60', '603096', '8a4ace', 'b076ec', 'd6acff', 'f4e2ff'}
P = [tuple(int(v) for v in p) for p in W.PAL]; hx = lambda p: '%02x%02x%02x' % p
cand = [p for p in P if hx(p) not in VIOL]
def shiftmap(deg):
    mp = {}
    for p in P:
        h = hx(p)
        if h in VIOL: continue
        H, S, V = colorsys.rgb_to_hsv(*[v / 255 for v in p])
        if S < 0.12 or V < 0.12: continue
        H2 = (H + deg / 360) % 1
        if 0.66 < H2 < 0.84: H2 = 0.62 if H2 < 0.75 else 0.88
        t = np.array(colorsys.hsv_to_rgb(H2, S, V)) * 255
        best = min(cand, key=lambda q: ((np.array(q) - t) ** 2 * [0.3, 0.59, 0.11]).sum())
        if best != p: mp[h] = hx(best)
    return mp
if __name__ == '__main__':
    n, name, deg = sys.argv[1], sys.argv[2], int(sys.argv[3])
    c = json.load(open('cfg.json')); c[n]['cosmic_name'] = name; c[n]['cosmic'] = shiftmap(deg)
    c[n]['cosmic_note'] = f'custom hue-shift {deg:+d} deg palette map (no family map for this type); draft concept for Gary'
    json.dump(c, open('cfg.json', 'w'), indent=1); print(n, name, len(c[n]['cosmic']))
