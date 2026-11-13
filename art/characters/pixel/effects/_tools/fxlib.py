"""Kilumen effect library: hard-pixel drawing helpers (no anti-aliasing), palette-locked."""
import math, random
import numpy as np
from PIL import Image, ImageDraw

PAL_PATH='/workspace/kilumen/art/world/overworld/palette.png'
PAL=np.unique(np.array(Image.open(PAL_PATH).convert('RGB')).reshape(-1,3),axis=0)
PALSET={tuple(int(v) for v in c) for c in PAL}
assert len(PALSET)==64, len(PALSET)

def C(h):
    c=(int(h[0:2],16),int(h[2:4],16),int(h[4:6],16))
    assert c in PALSET, 'not in palette: '+h
    return c+(255,)

BAYER=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]])

def lerp(a,b,t): return a+(b-a)*t
def vlerp(a,b,t): return (a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)
def vadd(*vs): return (sum(v[0] for v in vs), sum(v[1] for v in vs))
def vmul(v,s): return (v[0]*s, v[1]*s)
def vnorm(v):
    L=math.hypot(*v) or 1; return (v[0]/L, v[1]/L)
def vrot(v,a):
    c,s=math.cos(a),math.sin(a); return (v[0]*c-v[1]*s, v[0]*s+v[1]*c)
def perp(u): return (-u[1],u[0])
def ang(a): return (math.cos(a), math.sin(a))
def D(deg): return math.radians(deg)

class Path:
    """Projectile path in travel-canvas coords. arc>0 bows upward (screen -y)."""
    def __init__(s,S,E,arc=0,sc=(1,1),wob=0,wobf=1.0):
        s.S,s.E,s.arc,s.sc,s.wob,s.wobf=S,E,arc,sc,wob,wobf
        s.dirx=1 if E[0]>=S[0] else -1
    def pos(s,t):
        p=vlerp(s.S,s.E,t)
        p=(p[0], p[1]-s.arc*4*t*(1-t))
        if s.wob:
            u=vnorm((s.E[0]-s.S[0],s.E[1]-s.S[1])); n=perp(u)
            w=s.wob*math.sin(t*math.pi*2*s.wobf)*math.sin(math.pi*min(1,max(0,t)))
            p=vadd(p,vmul(n,w))
        return p
    def dir(s,t):
        a=s.pos(t-0.01); b=s.pos(t+0.01); return vnorm((b[0]-a[0],b[1]-a[1]))
    def size(s,t): return lerp(s.sc[0],s.sc[1],max(0,min(1,t)))

class FX:
    """Three layers: U (under, no outline), B (body, gets 1px outline), T (top, no outline)."""
    def __init__(s,W,H,outline=None):
        s.W,s.H,s.outline=W,H,outline
        s.L={k:Image.new('RGBA',(W,H),(0,0,0,0)) for k in 'UBT'}
        s.Dr={k:ImageDraw.Draw(v) for k,v in s.L.items()}
        s.fade={k:0.0 for k in 'UBT'}
    def d(s,k): return s.Dr[k]
    def circ(s,k,c,r,col):
        x,y=c
        if r<0.75: s.Dr[k].point((round(x),round(y)),fill=col); return
        s.Dr[k].ellipse([round(x-r),round(y-r),round(x+r)-1+ (1 if r<1.5 else 0),round(y+r)-1+(1 if r<1.5 else 0)],fill=col)
    def ell(s,k,c,rx,ry,col,w=0):
        x,y=c; bb=[round(x-rx),round(y-ry),round(x+rx),round(y+ry)]
        if bb[2]<=bb[0] or bb[3]<=bb[1]: s.Dr[k].point((round(x),round(y)),fill=col); return
        if w: s.Dr[k].ellipse(bb,outline=col,width=w)
        else: s.Dr[k].ellipse(bb,fill=col)
    def arc(s,k,c,rx,ry,a0,a1,col,w=1):
        x,y=c; bb=[round(x-rx),round(y-ry),round(x+rx),round(y+ry)]
        if bb[2]<=bb[0] or bb[3]<=bb[1]: return
        s.Dr[k].arc(bb,a0,a1,fill=col,width=w)
    def poly(s,k,pts,col):
        s.Dr[k].polygon([(round(x),round(y)) for x,y in pts],fill=col)
    def line(s,k,a,b,col,w=1):
        s.Dr[k].line([(round(a[0]),round(a[1])),(round(b[0]),round(b[1]))],fill=col,width=w)
    def pline(s,k,pts,col,w=1):
        s.Dr[k].line([(round(x),round(y)) for x,y in pts],fill=col,width=w,joint=None)
    def px(s,k,p,col,size=1):
        x,y=round(p[0]),round(p[1]); s.Dr[k].rectangle([x,y,x+size-1,y+size-1],fill=col)
    def plus(s,k,p,col,r=1,core=None):
        x,y=p; s.line(k,(x-r,y),(x+r,y),col); s.line(k,(x,y-r),(x,y+r),col)
        if core: s.px(k,p,core)
    # ---- shape helpers ----
    def tongue(s,k,base,u,L,w,col,lean=0.0):
        """flame/teardrop tongue from base toward u, length L, half-width w; lean bends the tip sideways"""
        n=perp(u); tip=vadd(base,vmul(u,L),vmul(n,lean*L))
        mid=vadd(base,vmul(u,L*0.45),vmul(n,lean*L*0.3))
        pts=[vadd(base,vmul(n,w)),vadd(mid,vmul(n,w*0.75)),tip,vadd(mid,vmul(n,-w*0.75)),vadd(base,vmul(n,-w))]
        back=vadd(base,vmul(u,-w*0.8))
        s.poly(k,pts+[back],col)
    def lens(s,k,c,u,L,w,col):
        """leaf/feather lens centred at c along u"""
        n=perp(u); a=vadd(c,vmul(u,-L/2)); b=vadd(c,vmul(u,L/2))
        pts=[a,vadd(c,vmul(u,-L*0.2),vmul(n,w)),vadd(c,vmul(u,L*0.2),vmul(n,w*0.8)),b,
             vadd(c,vmul(u,L*0.2),vmul(n,-w*0.8)),vadd(c,vmul(u,-L*0.2),vmul(n,-w))]
        s.poly(k,pts,col)
    def star(s,k,c,r_out,r_in,npt,rot,col):
        pts=[]
        for j in range(npt*2):
            r=r_out if j%2==0 else r_in; a=rot+j*math.pi/npt
            pts.append(vadd(c,vmul(ang(a),r)))
        s.poly(k,pts,col)
    def blob(s,k,c,r,col,seed,n=9,rough=0.25,rot=0.0,sx=1.0,sy=1.0):
        R=random.Random(seed); pts=[]
        for j in range(n):
            a=rot+j*2*math.pi/n; rr=r*(1+R.uniform(-rough,rough))
            pts.append((c[0]+math.cos(a)*rr*sx, c[1]+math.sin(a)*rr*sy))
        s.poly(k,pts,col)
    def crescent(s,k,c,u,r,th,col,span=75):
        """crescent whose convex side faces u"""
        a0=math.atan2(u[1],u[0]); pts=[]
        for j in range(9):
            a=a0+D(-span+2*span*j/8); pts.append(vadd(c,vmul(ang(a),r)))
        ci=vadd(c,vmul(u,-th))
        for j in range(8,-1,-1):
            a=a0+D(-span*0.92+2*span*0.92*j/8); pts.append(vadd(ci,vmul(ang(a),r*0.95)))
        s.poly(k,pts,col)
    # ---- render ----
    def render(s):
        out=np.zeros((s.H,s.W,4),'uint8')
        arrs={k:np.array(v) for k,v in s.L.items()}
        for k in 'UBT':
            a=arrs[k]
            if s.fade[k]>0:
                th=np.tile(BAYER,(s.H//4+1,s.W//4+1))[:s.H,:s.W]
                a[th<s.fade[k]*16]=0
            arrs[k]=a
        def comp(a):
            m=a[...,3]>0; out[m]=a[m]; out[m,3]=255
        comp(arrs['U'])
        if s.outline is not None:
            m=arrs['B'][...,3]>0
            dil=m.copy(); dil[1:]|=m[:-1]; dil[:-1]|=m[1:]; dil[:,1:]|=m[:,:-1]; dil[:,:-1]|=m[:,1:]
            ol=dil&~m; out[ol]=s.outline
        comp(arrs['B']); comp(arrs['T'])
        return out

def up(a,s=2):
    return np.repeat(np.repeat(a,s,0),s,1)

def save_gif(frames,path,ms,transparent=True):
    """frames: list of RGBA uint8 arrays (alpha 0/255). exact colours, no dithering"""
    cols={}
    for f in frames:
        m=f[...,3]>0
        for c in np.unique(f[m][:,:3],axis=0): cols.setdefault(tuple(int(v) for v in c),len(cols))
    assert len(cols)<255,len(cols)
    T=255; palette=[v for c in cols for v in c]+[0,0,0]*(256-len(cols))
    ims=[]
    for f in frames:
        idx=np.full(f.shape[:2],T,'uint8'); m=f[...,3]>0
        if m.any():
            flat=f[...,:3].astype(np.int64); key=(flat[...,0]<<16)|(flat[...,1]<<8)|flat[...,2]
            lut={(c[0]<<16)|(c[1]<<8)|c[2]:i for c,i in cols.items()}
            ks=key[m]; uk,inv=np.unique(ks,return_inverse=True)
            idx[m]=np.array([lut[int(x)] for x in uk],'uint8')[inv]
        p=Image.fromarray(idx,'P'); p.putpalette(palette); ims.append(p)
    kw=dict(save_all=True,append_images=ims[1:],duration=ms,loop=0,disposal=2)
    if transparent: kw['transparency']=T
    ims[0].save(path,**kw)
