"""Core downscaler for Kilumen party icons (draft). Palette-safe: every output pixel is a colour that
already exists in the creature's source sprite (or a crystal violet), so everything stays on palette.hex."""
from klib import *
from scipy import ndimage

def cell_bounds(t,o,inv,N):
    s0=(t-o)*inv; s1=s0+inv
    i0=int(np.floor(s0)); i1=int(np.ceil(s1))
    idx=np.arange(max(i0,0),min(i1,N))
    w=np.minimum(idx+1,s1)-np.maximum(idx,s0)
    return idx,w

def shrink(a,mask,s,out_w,out_h,ox,oy,alpha_thresh=0.42,crys_thresh=0.3,dark_frac=0.30,dark_luma=0.035,
           min_pick=0.12,accent_frac=None,accent_ratio=2.5):
    H,W=a.shape[:2]; inv=1.0/s
    hm=hexmap(a); al=a[...,3]>0; rgbl=lin(a[...,:3])
    cov=np.zeros((out_h,out_w)); info={}
    for ty in range(out_h):
        ys,wy=cell_bounds(ty,oy,inv,H)
        if len(ys)==0: continue
        for tx in range(out_w):
            xs,wx=cell_bounds(tx,ox,inv,W)
            if len(xs)==0: continue
            w=np.outer(wy,wx); sa=al[np.ix_(ys,xs)]
            cov[ty,tx]=(w*sa).sum()/(inv*inv); info[(ty,tx)]=(ys,xs,w,sa)
    alpha=cov>=alpha_thresh
    # thin-feature rescue: a pixel with cov>=0.22 that bridges two opaque pixels (line continuity)
    for _ in range(2):
        p=np.pad(alpha,1)
        bridge=(p[:-2,1:-1]&p[2:,1:-1])|(p[1:-1,:-2]&p[1:-1,2:])|(p[:-2,:-2]&p[2:,2:])|(p[:-2,2:]&p[2:,:-2])
        alpha|=(cov>=0.22)&bridge
    # fill 1px holes
    p=np.pad(alpha,1); n4=p[:-2,1:-1].astype(int)+p[2:,1:-1]+p[1:-1,:-2]+p[1:-1,2:]
    alpha|=(~alpha)&(n4>=4)&(cov>0)
    # drop components smaller than 3 px (unless they hold crystal)
    lab,nl=ndimage.label(alpha,structure=np.ones((3,3)))
    out=np.zeros((out_h,out_w,4),np.uint8); om=np.zeros((out_h,out_w),bool)
    p=np.pad(alpha,1); edge=alpha&~(p[:-2,1:-1]&p[2:,1:-1]&p[1:-1,:-2]&p[1:-1,2:])
    for (ty,tx),(ys,xs,w,sa) in info.items():
        if not alpha[ty,tx]: continue
        sub_m=mask[np.ix_(ys,xs)]&sa; wa=w*sa
        if wa.sum()==0: continue
        cm=(w*sub_m).sum()/wa.sum()
        subh=hm[np.ix_(ys,xs)]; sub=rgbl[np.ix_(ys,xs)]
        if cm>=crys_thresh:
            ww=w*sub_m; c=(sub*ww[...,None]).sum((0,1))/ww.sum()
            h=nearest_lin(c,VIOLETS); om[ty,tx]=True
            if edge[ty,tx]: h=VIOLETS[max(0,VIOLETS.index(h)-2)]
        else:
            ww=wa*(~sub_m)
            if ww.sum()==0: ww=wa
            cand={}
            for (yy,xx),v in np.ndenumerate(ww):
                if v>0: cand[subh[yy,xx]]=cand.get(subh[yy,xx],0)+v
            tot=sum(cand.values())
            if edge[ty,tx]:
                h=min(cand,key=luma)
            else:
                dk=[k for k in cand if luma(k)<dark_luma]
                c=(sub*ww[...,None]).sum((0,1))/ww.sum(); cl=0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
                ac=[k for k in cand if accent_frac and luma(k)>accent_ratio*cl and cand[k]/tot>=accent_frac]
                if dk and sum(cand[k] for k in dk)/tot>=dark_frac:
                    h=max(dk,key=lambda k:cand[k])
                elif ac:
                    h=max(ac,key=lambda k:cand[k])
                else:
                    c=(sub*ww[...,None]).sum((0,1))/ww.sum()
                    pool=[k for k in cand if cand[k]/tot>=min_pick] or list(cand)
                    h=nearest_lin(c,pool)
        out[ty,tx,:3]=rgb(h); out[ty,tx,3]=255
    # holes filled w/o info
    for ty,tx in zip(*np.where(alpha&(out[...,3]==0))):
        for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
            y,x=ty+dy,tx+dx
            if 0<=y<out_h and 0<=x<out_w and out[y,x,3]: out[ty,tx]=out[y,x]; om[ty,tx]=om[y,x]; break
    for i in range(1,nl+1):
        comp=lab==i
        if comp.sum()<3 and not om[comp].any(): out[comp]=0; om[comp]=False
    return out,om

def despeckle(out,om,protect_luma=0.035,protect=()):
    H,W=out.shape[:2]; hm=hexmap(out); new=out.copy()
    for y in range(1,H-1):
        for x in range(1,W-1):
            if not out[y,x,3] or om[y,x]: continue
            nb=[(y+dy,x+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx)]
            if any(out[yy,xx,3]==0 for yy,xx in nb): continue
            h=hm[y,x]
            if luma(h)<protect_luma or h in protect: continue
            if any(hm[yy,xx]==h for yy,xx in nb): continue
            n4=[hm[y+dy,x+dx] for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)) if not om[y+dy,x+dx]]
            if n4: new[y,x,:3]=rgb(max(set(n4),key=n4.count))
    return new

def outline_fix(out,om):
    """every opaque pixel touching transparency (4-neigh) must be a dark outline tone; lighten nothing."""
    H,W=out.shape[:2]; hm=hexmap(out)
    p=np.pad(out[...,3]>0,1); edge=(out[...,3]>0)&~(p[:-2,1:-1]&p[2:,1:-1]&p[1:-1,:-2]&p[1:-1,2:])
    return edge

def feature_spots(a,s,ox,oy,dark_luma=0.021,amin=6,amax=60):
    """Small enclosed dark blobs (eyes, nostrils) in the source -> (ty,tx,hex) stamps in icon space."""
    hm=hexmap(a); al=a[...,3]>0
    dk=np.zeros(al.shape,bool)
    for h in set(hm[al].ravel()):
        if luma(h)<dark_luma: dk|=(hm==h)&al
    lab,nl=ndimage.label(dk)
    tr=ndimage.binary_dilation(~al,iterations=2)
    out=[]
    for i,sl in enumerate(ndimage.find_objects(lab),1):
        comp=lab[sl]==i; area=comp.sum()
        if not(amin<=area<=amax) or (tr[sl]&comp).any(): continue
        bh,bw=comp.shape
        if area/(bh*bw)<0.45 or max(bh,bw)/min(bh,bw)>2.2: continue
        yy,xx=np.where(comp); cy=yy.mean()+sl[0].start+0.5; cx=xx.mean()+sl[1].start+0.5
        hs=hm[sl][comp]; vals,cnt=np.unique(hs,return_counts=True)
        out.append((int(np.floor(cy*s+oy)),int(np.floor(cx*s+ox)),str(vals[cnt.argmax()]),area))
    return out
