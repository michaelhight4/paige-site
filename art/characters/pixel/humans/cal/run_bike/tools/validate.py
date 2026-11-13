#!/usr/bin/env python3
"""Validate run/bike outputs: 64x96, palette-only RGB, binary alpha, exact nearest-neighbour 2x/3x, feet on ground row, no edge clipping."""
import sys, glob, os, numpy as np
from PIL import Image
KIL='/workspace/kilumen'; char=(sys.argv[1:2] or ['cal'])[0]
out=f'{KIL}/art/characters/pixel/humans/{char}/run_bike'
PAL={tuple(int(h[i:i+2],16) for i in (0,2,4)) for h in open(f'{KIL}/art/world/overworld/palette.hex').read().split()}
errs=[]; n=0; allc=set()
for f in sorted(glob.glob(f'{out}/frames/*.png')):
    n+=1; a=np.array(Image.open(f).convert('RGBA')); b=os.path.basename(f)[:-4]
    if a.shape[:2]!=(96,64): errs.append(f'{b}: size {a.shape}')
    al=set(np.unique(a[...,3]).tolist())
    if not al<= {0,255}: errs.append(f'{b}: alpha {al}')
    cols={tuple(c) for c in a[a[...,3]>0][:,:3].tolist()}; allc|=cols
    bad=cols-PAL
    if bad: errs.append(f'{b}: {len(bad)} off-palette colours')
    m=a[...,3]>0; ys,xs=np.where(m)
    if xs.min()<1 or xs.max()>62 or ys.min()<1: errs.append(f'{b}: touches frame edge')
    if ys.max()>93: errs.append(f'{b}: below ground row 93')
    if 'bike' in b and not m[93].any(): errs.append(f'{b}: tyre not on ground row 93')
    for k in (2,3):
        g=f'{out}/frames_{k}x/{b}_{k}x.png'
        u=np.array(Image.open(g).convert('RGBA'))
        if not np.array_equal(u,a.repeat(k,0).repeat(k,1)): errs.append(f'{b}: {k}x not exact')
for f in glob.glob(f'{out}/sheets/*_sheet.png'):
    a=np.array(Image.open(f).convert('RGBA'))
    for k in (2,3):
        u=np.array(Image.open(f[:-4]+f'_{k}x.png').convert('RGBA'))
        if not np.array_equal(u,a.repeat(k,0).repeat(k,1)): errs.append(f'{os.path.basename(f)} {k}x not exact')
# run: at least one foot on the ground in contact/down frames (0,1,3,4); airborne in flight frames (2,5)
for d in ['down','left','right','up']:
    for i in range(6):
        a=np.array(Image.open(f'{out}/frames/{char}_chibi_{d}_run{i}.png'))
        low=np.where(a[...,3].any(1))[0].max()
        if i in (0,1,3,4) and low!=93: errs.append(f'run {d}{i}: no foot on ground (lowest row {low})')
        if i in (2,5) and d in ('left','right') and low>=93: errs.append(f'run {d}{i}: expected airborne')
print(f'{n} frames checked, {len(allc)} distinct colours used, all in palette: {allc<=PAL}')
print('ERRORS:' if errs else 'OK: no errors'); [print(' ',e) for e in errs]
sys.exit(1 if errs else 0)
