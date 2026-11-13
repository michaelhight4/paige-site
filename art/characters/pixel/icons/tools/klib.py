import os,glob,json,numpy as np
from PIL import Image
A='/workspace/kilumen/art'; P=A+'/characters/pixel'; C=P+'/creatures'
NAMES=sorted(os.listdir(C))
PAL=[l.strip().lower() for l in open(A+'/world/overworld/palette.hex') if l.strip()]
PALSET=set(PAL)
VIOLETS=['3a1e60','603096','8a4ace','b076ec','d6acff','f4e2ff']
def rgb(h): return tuple(int(h[i:i+2],16) for i in (0,2,4))
def hx(p): return '%02x%02x%02x'%tuple(int(v) for v in p[:3])
def load(path): return np.array(Image.open(path).convert('RGBA'))
def battle(n,side):
    f=glob.glob(f'{C}/{n}/battle/{n}_{side}_*.png'); f=[x for x in f if not x.endswith(('_2x.png','_3x.png'))]
    return f[0]
def rel(n,path): return os.path.relpath(path,f'{C}/{n}')
def mask_for(n,path):
    m=f'{P}/warmth/masks/{n}/{rel(n,path)}'
    return np.array(Image.open(m).convert('L'))>0
def ow(n,d='down',fr='stand'): return f'{C}/{n}/overworld/{n}_ow/{n}_ow_{d}_{fr}.png'
def idle(n,side,i): return f'{C}/{n}/anim/{n}_{side}_idle/{n}_{side}_idle_f{i}.png'
def hexmap(a):
    return np.array([hx(p) for p in a.reshape(-1,4)]).reshape(a.shape[:2])

def lin(c): 
    c=np.asarray(c,float)/255.0; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def palette_arr(hexes): return np.array([rgb(h) for h in hexes],float)
def nearest(col,pal_hex,pal_lab=None):
    pa=palette_arr(pal_hex); d=((lin(pa)-lin(col))**2*np.array([0.3,0.59,0.11])).sum(1)
    return pal_hex[int(np.argmin(d))]

def downscale(a,mask,s,out_w,out_h,ox,oy,pal_hex,crys_thresh=0.3,alpha_thresh=0.5,dark_bias=True):
    """a: RGBA source cropped; mask bool crystal. s: scale (target/source). returns RGBA out and crystal mask out."""
    H,W=a.shape[:2]
    out=np.zeros((out_h,out_w,4),np.uint8); om=np.zeros((out_h,out_w),bool)
    inv=1.0/s
    rgbl=lin(a[...,:3]); al=(a[...,3]>0).astype(float)
    for ty in range(out_h):
        for tx in range(out_w):
            sx0=(tx-ox)*inv; sx1=sx0+inv; sy0=(ty-oy)*inv; sy1=sy0+inv
            x0=int(np.floor(sx0)); x1=int(np.ceil(sx1)); y0=int(np.floor(sy0)); y1=int(np.ceil(sy1))
            if x1<=0 or y1<=0 or x0>=W or y0>=H: continue
            xs=np.arange(max(x0,0),min(x1,W)); ys=np.arange(max(y0,0),min(y1,H))
            if len(xs)==0 or len(ys)==0: continue
            wx=np.minimum(xs+1,sx1)-np.maximum(xs,sx0); wy=np.minimum(ys+1,sy1)-np.maximum(ys,sy0)
            w=np.outer(wy,wx); tot=w.sum()
            sub_a=al[np.ix_(ys,xs)]; cov=(w*sub_a).sum()/(inv*inv)
            if cov<alpha_thresh: continue
            sub_m=mask[np.ix_(ys,xs)]&(sub_a>0)
            cm=(w*sub_m).sum()/max((w*sub_a).sum(),1e-9)
            sub=rgbl[np.ix_(ys,xs)]
            if cm>=crys_thresh:
                ww=w*sub_m; c=(sub*ww[...,None]).sum((0,1))/ww.sum()
                h=nearest_lin(c,VIOLETS); om[ty,tx]=True
            else:
                ww=w*sub_a*(~sub_m if cm>0 else 1); 
                if ww.sum()==0: ww=w*sub_a
                c=(sub*ww[...,None]).sum((0,1))/ww.sum()
                h=nearest_lin(c,pal_hex)
            out[ty,tx,:3]=rgb(h); out[ty,tx,3]=255
    return out,om
_pc={}
def nearest_lin(c,pal_hex):
    key=tuple(pal_hex)
    if key not in _pc: _pc[key]=lin(palette_arr(pal_hex))
    d=((_pc[key]-c)**2*np.array([0.3,0.59,0.11])).sum(1)
    return pal_hex[int(np.argmin(d))]
def colours_of(a):
    v=a[...,3]>0; return sorted(set(hx(p) for p in a[v]))

def luma(h): r,g,b=lin(rgb(h)); return 0.2126*r+0.7152*g+0.0722*b
def downscale2(a,mask,s,out_w,out_h,ox,oy,pal_hex,crys_thresh=0.3,alpha_thresh=0.45,dark_frac=0.30,dark_luma=0.03):
    H,W=a.shape[:2]; inv=1.0/s
    hm=hexmap(a); al=a[...,3]>0
    rgbl=lin(a[...,:3])
    cells={}
    alpha=np.zeros((out_h,out_w),bool)
    for ty in range(out_h):
        for tx in range(out_w):
            sx0=(tx-ox)*inv; sx1=sx0+inv; sy0=(ty-oy)*inv; sy1=sy0+inv
            x0=int(np.floor(sx0)); x1=int(np.ceil(sx1)); y0=int(np.floor(sy0)); y1=int(np.ceil(sy1))
            xs=np.arange(max(x0,0),min(x1,W)); ys=np.arange(max(y0,0),min(y1,H))
            if len(xs)==0 or len(ys)==0: continue
            wx=np.minimum(xs+1,sx1)-np.maximum(xs,sx0); wy=np.minimum(ys+1,sy1)-np.maximum(ys,sy0)
            w=np.outer(wy,wx); sa=al[np.ix_(ys,xs)]
            cov=(w*sa).sum()/(inv*inv)
            if cov<alpha_thresh: continue
            alpha[ty,tx]=True; cells[(ty,tx)]=(ys,xs,w,sa)
    # clean silhouette: remove pixels with <=1 opaque 4-neighbours, fill holes with >=3
    for _ in range(2):
        p=np.pad(alpha,1); n4=p[:-2,1:-1].astype(int)+p[2:,1:-1]+p[1:-1,:-2]+p[1:-1,2:]
        alpha=(alpha&(n4>=2))|(~alpha&(n4>=4))
    out=np.zeros((out_h,out_w,4),np.uint8); om=np.zeros((out_h,out_w),bool)
    p=np.pad(alpha,1); edge=alpha&~(p[:-2,1:-1]&p[2:,1:-1]&p[1:-1,:-2]&p[1:-1,2:])
    for ty in range(out_h):
        for tx in range(out_w):
            if not alpha[ty,tx]: continue
            if (ty,tx) not in cells:
                # filled hole: copy neighbour later
                continue
            ys,xs,w,sa=cells[(ty,tx)]
            sub_m=mask[np.ix_(ys,xs)]&sa; ww_a=w*sa
            cm=(w*sub_m).sum()/max(ww_a.sum(),1e-9)
            sub=rgbl[np.ix_(ys,xs)]; subh=hm[np.ix_(ys,xs)]
            if cm>=crys_thresh:
                ww=w*sub_m; c=(sub*ww[...,None]).sum((0,1))/ww.sum()
                h=nearest_lin(c,VIOLETS); om[ty,tx]=True
                if edge[ty,tx]:
                    h=VIOLETS[max(0,VIOLETS.index(h)-2)]
            else:
                ww=w*sa*(~sub_m)
                if ww.sum()==0: ww=ww_a
                if edge[ty,tx]:
                    # darkest present colour with meaningful weight
                    cand={}
                    for (yy,xx),v in np.ndenumerate(ww):
                        if v>0: cand[subh[yy,xx]]=cand.get(subh[yy,xx],0)+v
                    h=min(cand,key=luma)
                    if h not in pal_hex: h=nearest_lin(lin(rgb(h)),pal_hex)
                else:
                    cand={}
                    for (yy,xx),v in np.ndenumerate(ww):
                        if v>0: cand[subh[yy,xx]]=cand.get(subh[yy,xx],0)+v
                    tot=sum(cand.values())
                    dk=[k for k in cand if luma(k)<dark_luma]
                    dsum=sum(cand[k] for k in dk)
                    if dk and dsum/tot>=dark_frac:
                        h=max(dk,key=lambda k:cand[k])
                    else:
                        c=(sub*ww[...,None]).sum((0,1))/ww.sum()
                        h=nearest_lin(c,pal_hex)
                    if h not in pal_hex: h=nearest_lin(lin(rgb(h)),pal_hex)
            out[ty,tx,:3]=rgb(h); out[ty,tx,3]=255
    # fill holes
    for ty,tx in zip(*np.where(alpha&(out[...,3]==0))):
        for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
            y,x=ty+dy,tx+dx
            if 0<=y<out_h and 0<=x<out_w and out[y,x,3]: out[ty,tx]=out[y,x]; om[ty,tx]=om[y,x]; break
    return out,om

def despeckle(out,om,protect_luma=0.03,passes=1):
    """replace interior pixels whose colour matches none of 8 neighbours with the most common 4-neighbour colour (skip dark features and crystal)."""
    H,W=out.shape[:2]
    for _ in range(passes):
        hm=hexmap(out); new=out.copy()
        for y in range(1,H-1):
            for x in range(1,W-1):
                if not out[y,x,3] or om[y,x]: continue
                nb=[(y+dy,x+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx)]
                if any(out[yy,xx,3]==0 for yy,xx in nb): continue
                h=hm[y,x]
                if luma(h)<protect_luma: continue
                if any(hm[yy,xx]==h for yy,xx in nb): continue
                n4=[hm[y+dy,x+dx] for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)) if not om[y+dy,x+dx]]
                if not n4: continue
                best=max(set(n4),key=n4.count)
                new[y,x,:3]=rgb(best)
        out=new
    return out
