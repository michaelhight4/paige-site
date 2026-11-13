#!/usr/bin/env python3
"""Furniture perspective/value check (audit helper, not game code).
Greyscale (Rec.601 luma) each sprite on a furniture sheet, find the top/front split as the row where the
mean value steps most (10-70% of height), then flag:
  INVERTED  top face darker than front (light must come from above-left)
  FLAT      |top-front| value step < 15% of the front value
  STEEP     top face > 55% of sprite height (reads as straight top-down)
  FRONTAL   top face < 15% of sprite height (reads as straight side-on)
  LIGHT_R   right third brighter than left third by >8 luma (light from the wrong side)
Skips flat floor pieces (rugs/mats: height < 0.45*width and width > 100).
Usage: python3 furniture_value_check.py sheet.png [sheet2.png ...]"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
for f in sys.argv[1:]:
    im = np.array(Image.open(f).convert('RGBA')).astype(float)
    A = im[..., 3] > 40; L = 0.299*im[..., 0]+0.587*im[..., 1]+0.114*im[..., 2]
    lab, _ = ndimage.label(A)
    n = 0; flagged = 0
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h, w = sl[0].stop-sl[0].start, sl[1].stop-sl[1].start
        if h < 20 or w < 20 or (w > 100 and h < 0.45*w): continue
        m = (lab[sl] == i+1); l = L[sl]
        rows = np.array([l[r][m[r]].mean() for r in range(h) if m[r].sum() > w*0.3])
        if len(rows) < 10: continue
        n += 1; k = len(rows)
        sc, s = max((abs(rows[:s].mean()-rows[s:].mean()), s) for s in range(int(k*.1), int(k*.7)))
        t, fr = rows[:s].mean(), rows[s:].mean(); c = (t-fr)/max(fr, 1)*100; frac = s/k
        cols = np.array([l[:, j][m[:, j]].mean() for j in range(w) if m[:, j].any()]); lr = cols[:len(cols)//3].mean()-cols[-(len(cols)//3):].mean()
        tags = [x for x, b in [('INVERTED', c < 0), ('FLAT', abs(c) < 15), ('STEEP', frac > .55), ('FRONTAL', frac < .15), ('LIGHT_R', lr < -8)] if b]
        if tags:
            flagged += 1; print(f"{f}\tx={sl[1].start}\ty={sl[0].start}\t{w}x{h}\ttop={frac:.0%}\tstep={c:+.0f}%\tLR={lr:+.0f}\t{','.join(tags)}")
    print(f"# {f}: {flagged}/{n} pieces flagged", file=sys.stderr)
