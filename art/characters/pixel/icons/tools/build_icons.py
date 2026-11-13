"""Kilumen party/menu icons (DRAFT, not wired in). Run: python3 build_icons.py
Stage 1: auto-shrink each creature's front battle sprite to 32x32 (palette-safe, crystal kept via warmth mask).
Stage 2: hand touch-ups from touchups.py (pixel edits on frame 0).
Stage 3: frame 1 bob (squash for grounded creatures, whole-body dip for floaters).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from icon_core import *
from touchups import TOUCH

LAVA = ('d46616','e29d40','eea23c','f08868','fcd668','c46e2e')
CFG = {n: dict(src='front', fitw=31, fith=29, accent=None, kind='ground') for n in NAMES}
for n in ('cindrip','emberlunx','forgeharrow'): CFG[n]['accent']=0.22
CFG['gloamtick']['kind']='float'
CFG['halovy']['kind']='float'      # hovering moth-fawn: whole-body dip
CFG['sailquill']['kind']='ground'
for n in ('cindrip','emberlunx','forgeharrow'): CFG[n]['src']='left'   # side view reads cleaner at 32px

def source(n):
    c=CFG[n]
    return battle(n,'front') if c['src']=='front' else ow(n,c['src'],'stand')

def raw_icon(n):
    c=CFG[n]; path=source(n)
    a=load(path); m=mask_for(n,path)
    bb=Image.fromarray(a).getbbox(); a=a[bb[1]:bb[3],bb[0]:bb[2]]; m=m[bb[1]:bb[3],bb[0]:bb[2]]
    H,W=a.shape[:2]; s=min(c['fitw']/W,c['fith']/H)
    w_,h_=int(round(W*s)),int(round(H*s))
    out,om=shrink(a,m,s,32,32,(32-w_)//2,31-h_,accent_frac=c['accent'])
    out=despeckle(out,om,protect=LAVA if c['accent'] else ())
    if c.get('eyes',True):
        for ty,tx,h,ar in feature_spots(a,s,(32-w_)//2,31-h_):
            if 0<=ty<32 and 0<=tx<32 and out[ty,tx,3] and not om[ty,tx]:
                out[ty,tx,:3]=rgb(h)
    return out,om,path

def apply_touch(n,out,om):
    for e in TOUCH.get(n,[]):
        x,y,h=e[:3]
        if h is None: out[y,x]=0; om[y,x]=False; continue
        out[y,x,:3]=rgb(h.lstrip('#')); out[y,x,3]=255
        om[y,x]= len(e)>3 and e[3]=='c'
    return out,om

def bob(n,out,om):
    f1=np.zeros_like(out); m1=np.zeros_like(om)
    ys=np.where(out[...,3].any(1))[0]; top,bot=ys.min(),ys.max()
    if CFG[n]['kind']=='float':
        f1[1:]=out[:-1]; m1[1:]=om[:-1]
    else:
        # rows above the pivot dip 1px, legs stay planted. The pivot row (dropped in f1) is picked in the
        # lower body where it is most like the row above it and holds no crystal, so the squash is invisible.
        hh=bot-top; cands=range(int(bot-0.42*hh),int(bot-0.18*hh)+1)
        def cost(r): return 1000*om[r].sum()+np.abs(out[r].astype(int)-out[r-1].astype(int)).sum()
        piv=min(cands,key=cost)
        f1[:]=out; m1[:]=om
        f1[top+1:piv+1]=out[top:piv]; m1[top+1:piv+1]=om[top:piv]
        f1[top]=0; m1[top]=False
    return f1,m1

if __name__=='__main__':
    stage = sys.argv[1] if len(sys.argv)>1 else 'all'
    res={}
    for n in NAMES:
        if stage=='rawL': CFG[n]['src']='left'
        if stage=='rawF': CFG[n]['src']='front'
        out,om,path=raw_icon(n)
        if stage in('raw','rawL','rawF'):
            Image.fromarray(out).save(f'/workspace/scratch/{stage}/{n}.png'); np.save(f'/workspace/scratch/{stage}/{n}_m.npy',om); continue

        out,om=apply_touch(n,out,om)
        f1,m1=bob(n,out,om)
        res[n]=dict(frames=[out,f1],masks=[om,m1],path=path)
    if stage!='all': sys.exit()
    from export import export_all
    export_all(res,CFG)
