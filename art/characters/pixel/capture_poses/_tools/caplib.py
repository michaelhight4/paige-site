"""Capture-pose pixel editing helpers (DRAFT, awaiting Gary).
Edits existing sprites: erase hanging arms, rebuild torso edge, draw raised arms with the
sprite's own sleeve/skin colours and its own outline (ink) colour. Palette-locked."""
import numpy as np, math
from PIL import Image, ImageDraw
from collections import Counter
PALHEX=open('/workspace/kilumen/art/world/overworld/palette.hex').read().split()
PAL=np.array([[int(h[i:i+2],16) for i in (0,2,4)] for h in PALHEX])
def hx(c): return '%02x%02x%02x'%tuple(int(v) for v in c[:3])
def rgb(h): return np.array([int(h[i:i+2],16) for i in (0,2,4)],dtype=np.uint8)
def luma(c): c=np.asarray(c,float); return 0.299*c[...,0]+0.587*c[...,1]+0.114*c[...,2]
def load(p): return np.array(Image.open(p).convert('RGBA'))
def poly_mask(shape,polys):
    m=Image.new('L',(shape[1],shape[0]),0); d=ImageDraw.Draw(m)
    for p in polys: d.polygon([tuple(q) for q in p],fill=255,outline=255)
    return np.array(m)>0
def ink_of(a):
    op=a[...,3]>0; e=op.copy()
    inner=op[1:-1,1:-1]&op[:-2,1:-1]&op[2:,1:-1]&op[1:-1,:-2]&op[1:-1,2:]
    e[1:-1,1:-1]&=~inner
    c=Counter(hx(p) for p in a[e]); return c.most_common(1)[0][0]
def ramp(a,box,ink,n=3,exclude=()):
    """3 most frequent non-outline colours in region box (x0,y0,x1,y1) or mask, sorted light->dark"""
    if isinstance(box,np.ndarray): px=a[box&(a[...,3]>0)]
    else:
        x0,y0,x1,y1=box; s=a[y0:y1+1,x0:x1+1]; px=s[s[...,3]>0]
    il=luma(rgb(ink)); c=Counter(hx(p) for p in px if luma(p[:3])>il+18 and hx(p) not in exclude)
    cols=[k for k,_ in c.most_common(n)]
    return sorted(cols,key=lambda h:-luma(rgb(h)))
def erase(a,polys,keep=()):
    m=poly_mask(a.shape,polys)
    if keep: m&=~poly_mask(a.shape,keep)
    b=a.copy(); b[m]=0; return b,m
def refill(b,erased,fill_polys,cx):
    """re-grow body under the removed arm: reflect the kept body texture across the cut"""
    fm=poly_mask(b.shape,fill_polys)&erased
    out=b.copy(); H,W=fm.shape
    for y,x in zip(*np.where(fm)):
        step=1 if x<cx else -1; bx=x
        while 0<=bx<W and fm[y,bx]: bx+=step
        if not(0<=bx<W) or b[y,bx,3]==0: continue
        k=bx-x; sx=bx+k  # mirror
        sx=min(max(sx,0),W-1)
        if b[y,sx,3]==0 or fm[y,sx]: sx=bx
        out[y,x]=b[y,sx]
    return out,fm
def reoutline(a,touched,ink,dark_l=70):
    """1px outline on body pixels that now border transparency next to the changed zone"""
    op=a[...,3]>0; H,W=op.shape; o=a.copy()
    t=touched.copy()
    tt=t.copy()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)): tt|=np.roll(np.roll(t,dy,0),dx,1)
    inkc=rgb(ink)
    for y,x in zip(*np.where(op&tt)):
        border=False
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if not(0<=yy<H and 0<=xx<W) or not op[yy,xx]: border=True
        if border and luma(a[y,x,:3])>dark_l: o[y,x,:3]=inkc; o[y,x,3]=255
    return o
def _segd(px,py,ax,ay,bx,by):
    vx,vy=bx-ax,by-ay; L2=vx*vx+vy*vy or 1e-9
    t=max(0,min(1,((px-ax)*vx+(py-ay)*vy)/L2)); cx,cy=ax+t*vx,ay+t*vy
    return math.hypot(px-cx,py-cy),t,(px-cx,py-cy)
def arm_layer(shape,S,E,Hn,ink,sleeve,skin,hand,wrist=None,r_up=2.6,r_fore=2.2,r_hand=2.4,sleeve_len=1.0,cuff=None,cuff_w=1.5,light_dir=(-1,-1),hand_ext=(0,0)):
    """returns RGBA layer for one arm. S shoulder, E elbow, Hn hand centre. sleeve_len: fraction of arm
    length (shoulder->wrist) in sleeve colour; rest skin. cuff: colour band at sleeve end."""
    H,W=shape[:2]; L=np.zeros((H,W,4),np.uint8)
    l1=math.dist(S,E); l2=math.dist(E,Hn); tot=l1+l2
    # wrist is r_hand before hand centre along forearm
    wr=tot-r_hand*0.9
    SLN=sleeve_len if sleeve_len>1.5 else sleeve_len*wr  # >1.5 means absolute px
    if sleeve_len>1.5: sleeve_len=min(1.0,SLN/wr) if SLN<wr else 1.0
    ld=np.array(light_dir,float); ld/=np.linalg.norm(ld)
    inkc=rgb(ink)
    fillm=np.zeros((H,W),bool); outm=np.zeros((H,W),bool)
    col=np.zeros((H,W,3),np.uint8)
    for y in range(H):
        for x in range(W):
            px,py=x+0.5,y+0.5
            d1,t1,v1=_segd(px,py,*S,*E); d2,t2,v2=_segd(px,py,*E,*Hn)
            dh=math.hypot((px-Hn[0])/(1+hand_ext[0]/r_hand),(py-Hn[1])/(1+hand_ext[1]/r_hand))
            # radius taper
            in1=d1<=r_up; in2=d2<=(r_up+(r_fore-r_up)*t2); inh=dh<=r_hand
            if in1 or in2 or inh:
                fillm[y,x]=True
                if inh and not(in2 and t2<0.6):
                    ramp_=hand; v=(px-Hn[0],py-Hn[1]); rr=r_hand
                else:
                    if in2 and (not in1 or d2<d1): s=l1+t2*l2; v=v2; rr=r_fore
                    else: s=t1*l1; v=v1; rr=r_up
                    if s<=SLN: ramp_=sleeve
                    else: ramp_=skin
                    if cuff and sleeve_len<1.0 and SLN-cuff_w<s<=SLN: ramp_=[cuff]*3
                    if cuff and sleeve_len>=1.0 and wr-cuff_w<s<=wr: ramp_=[cuff]*3
                    if wrist and wr-wrist[1]<s<=wr+0.5: ramp_=wrist[0]
                dd=(v[0]*ld[0]+v[1]*ld[1])/max(rr,1e-6)
                c=ramp_[0] if dd>0.35 else (ramp_[2] if dd<-0.45 else ramp_[1])
                col[y,x]=rgb(c)
            elif d1<=r_up+1.0 or d2<=(r_up+(r_fore-r_up)*t2)+1.0 or dh<=r_hand+1.0:
                outm[y,x]=True
    L[outm,:3]=inkc; L[outm,3]=255
    L[fillm,:3]=col[fillm]; L[fillm,3]=255
    return L,fillm,outm
def over(base,layer,under=None):
    o=base.copy(); m=layer[...,3]>0
    if under is not None: m&=~under
    o[m]=layer[m]; return o
def snap_check(a):
    op=a[...,3]>0; px=a[op][:,:3]
    pal={tuple(p) for p in PAL.tolist()}
    bad=[tuple(p) for p in px.tolist() if tuple(p) not in pal]
    semi=int(((a[...,3]>0)&(a[...,3]<255)).sum())
    return len(bad),semi
