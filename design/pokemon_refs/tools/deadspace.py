#!/usr/bin/env python3
"""Heuristic dead-space measure on reference images: a tile is 'plain' if its pixel std-dev is low (flat floor/sand/grass
with no object) and it is not black void. Reports plain share and the largest all-plain square (in tiles)."""
import os, json, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); REF = os.path.dirname(HERE)
A = json.load(open(os.path.join(HERE, 'annotations.json')))
def tile_of(n, W): return 32 if n.startswith('FAN_Reborn') else (round(W / 64) if n.startswith('FAN_Unbound') and W > 1500 else (32 if n.startswith('FAN') else 16))
out = {}
for n in A:
    im = np.asarray(Image.open(os.path.join(REF, 'raw', n)).convert('L'), dtype=float); H, W = im.shape; t = tile_of(n, W)
    if n.startswith('FAN_Unbound'): t = 32  # GBA 16px tiles shown at 2x
    gh, gw = H // t, W // t; plain = np.zeros((gh, gw), bool); void = np.zeros((gh, gw), bool)
    for y in range(gh):
        for x in range(gw):
            b = im[y*t:(y+1)*t, x*t:(x+1)*t]; void[y, x] = b.mean() < 20 or b.mean() > 245; plain[y, x] = b.std() < 9 and not void[y, x]
    dp = np.zeros((gh + 1, gw + 1), int); best = 0
    for y in range(gh):
        for x in range(gw):
            if plain[y, x]: dp[y+1, x+1] = 1 + min(dp[y, x+1], dp[y+1, x], dp[y, x]); best = max(best, dp[y+1, x+1])
    used = (~void).sum()
    out[n] = {'tile_px': t, 'grid': [gw, gh], 'map_tiles': int(used), 'plain_tiles': int(plain.sum()), 'plain_share': round(plain.sum() / max(1, used), 3), 'largest_plain_square': int(best)}
    print(f"{n:34} {gw}x{gh} tiles={used:5} plain={plain.sum():4} ({out[n]['plain_share']:.2f}) maxsq={best}")
json.dump(out, open(os.path.join(REF, 'deadspace_stats.json'), 'w'), indent=1)
