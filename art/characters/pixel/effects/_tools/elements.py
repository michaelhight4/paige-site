"""Per-element hand-tuned effect drawings. Each element: travel(fx,i,n,P,seed), impact(fx,i,n,c,seed)."""
import math, random
# 2026-10-30: smoke particles restored from the pre-2026-10-22 original (Gary: the no-smoking rule covers tobacco/drug
# use only; smoke in effects is fine). Smokeless version kept as elements.py.nosmoke_20261022. God impact column fix kept.
from fxlib import *

# ---- palette names (all from the shared 64-colour palette) ----
BLK=C('000000'); INK=C('1a1226'); SOOT=C('191210'); CHAR=C('2c2320'); ESP=C('2c1a12')
F0=C('561c0e'); F1=C('9f4013'); F2=C('d46616'); F3=C('eea23c'); F4=C('fcd668'); F5=C('fcf6e8'); FGOLD=C('e29d40')
CRIM0=C('6e222a'); CRIM1=C('a23432'); CRIM2=C('d05440'); SALM=C('f08868'); RUST=C('6a3019'); CLAY=C('c46e2e')
E0=C('2c1a12'); E1=C('462c22'); E2=C('6a442e'); E3=C('92623e'); E4=C('ba8856'); E5=C('deb478'); E6=C('e8ce92'); KHA=C('ccaa6e'); MUD=C('87604d')
CRM=C('f8eabe'); CRM2=C('ecdec4')
G0=C('18382c'); G1=C('24522e'); G1b=C('244e34'); G2=C('367634'); G2b=C('38683e'); G3=C('52983a'); G3b=C('54864e'); G4=C('78ba48'); G5=C('a6d460')
T0=C('246e6c'); T1=C('3e9c92'); T2=C('70cab8')
B0=C('1e4078'); B1=C('30488c'); B2=C('2c64a8'); B3=C('4a70ba'); B4=C('4692ce'); B5=C('7ac2e8'); B6=C('c6ecfa')
V0=C('1a1226'); VD=C('342842'); V1=C('3a1e60'); V2=C('603096'); V3=C('8a4ace'); V4=C('b076ec'); V5=C('d6acff'); V6=C('f4e2ff')
N0=C('29252b'); N1=C('3e3a48'); NB=C('54444e'); N2=C('5e5866'); N3=C('827a84'); N4=C('a8a0a4'); N5=C('ccc6c2')
P0=C('d2608c'); P1=C('daa2ba'); P2=C('f6a0ba')

def tmid(i,n,a=0.08,b=0.92,ease=None):
    x=(i-1)/max(1,(n-3)); x=ease(x) if ease else x
    return a+(b-a)*x
ease_in=lambda x:x*x*0.6+x*0.4
ease_out=lambda x:1-(1-x)*(1-x)*0.6-(1-x)*0.4*0 if False else 1-(1-x)**1.6

# =============================== FIRE ===============================
def fire_travel(fx,i,n,P,seed):
    R=random.Random(seed)
    if i==0:
        p=P.S; s=P.size(0)
        for j in range(6):
            a=D(j*60+15); fx.px('T',vadd(p,vmul(ang(a),9)),[F3,F2,F4][j%3],2)
        fx.circ('B',p,4*s,F2); fx.circ('B',p,2.5*s,F4); fx.px('T',p,F5); return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.star('B',p,9*s,4*s,6,D(15),F2); fx.circ('B',p,4*s,F3); fx.circ('T',p,2*s,F5)
        for j in range(7):
            a=D(j*51+R.uniform(-10,10)); fx.px('T',vadd(p,vmul(ang(a),12*s+R.uniform(0,3))),[F3,F2,F1][j%3],2)
        return
    t=tmid(i,n); p=P.pos(t); u=P.dir(t); s=P.size(t); back=vmul(u,-1); nn=perp(u)
    lean=0.18*(1 if i%2 else -1)
    fx.tongue('B',p,back,22*s,7*s,F1,lean)
    fx.tongue('B',vadd(p,vmul(back,-1*s)),back,17*s,5*s,F2,-lean*0.6)
    fx.circ('B',vadd(p,vmul(u,1)),7*s,F2)
    fx.tongue('T',p,back,11*s,3.5*s,F3,lean*0.5)
    fx.circ('T',vadd(p,vmul(u,1)),4.5*s,F3); fx.circ('T',vadd(p,vmul(u,1.5)),2.5*s,F4); fx.px('T',vadd(p,vmul(u,2)),F5,2)
    for k in range(1,7):
        q=P.pos(t-0.045*k-0.02); off=math.sin(k*1.9+i*1.3)*4
        q=vadd(q,vmul(perp(P.dir(t)),off))
        col=[F4,F3,F3,F2,F1,F0][k-1]; fx.px('T',q,col,2 if k<4 else 1)
    for k in range(2):
        q=P.pos(t-0.22-0.07*k); fx.circ('U',vadd(q,(0,-2-k*2)),2.5-k*0.5,[N2,N1][k])

def fire_impact(fx,i,n,c,seed):
    R=random.Random(seed)
    x,y=c
    if i==0:
        fx.circ('B',c,4,F2); fx.circ('T',c,2,F4)
        for a in (0,90,180,270): fx.px('T',vadd(c,vmul(ang(D(a+45)),8)),F3,2)
        return
    if i==1:
        fx.star('B',c,20,9,8,D(22),F2); fx.star('T',c,13,6,8,0,F3); fx.circ('T',c,6,F4); fx.circ('T',c,3,F5); return
    # flame tongues rising from a ring
    H=[0,0,26,34,30,22,14,8][i]; rise=[0,0,0,2,8,14,20,26][i]; w=[0,0,7,7,6,5,4,3][i]
    bases=[(-14,8),(-6,10),(4,9),(13,7),(-1,4)]
    for j,(bx,by) in enumerate(bases):
        if i>=6 and j%2: continue
        b=(x+bx,y+by-rise*(0.6+0.15*j))
        u=vnorm((bx*0.03+math.sin(i*1.7+j)*0.15,-1)); L=H*(0.7+0.3*((j*7)%5)/4)
        lean=0.22*math.sin(i*2.1+j*1.3)
        fx.tongue('B',b,u,L,w,F1,lean)
        fx.tongue('B',vadd(b,(0,-1)),u,L*0.75,w*0.65,F2,lean*1.2)
        if i<=5: fx.tongue('T',vadd(b,(0,-2)),u,L*0.45,w*0.35,F3,lean)
    if i in (2,3): fx.ell('T',(x,y+8),10 if i==2 else 8,4,F4); fx.ell('T',(x,y+8),4,2,F5)
    if i==4: fx.ell('T',(x,y+6),6,2,F3)
    # embers rising
    for j in range(10):
        ex=x+R.uniform(-22,22); ey=y+R.uniform(-6,14)-i*R.uniform(3,6)
        if i>=3: fx.px('T',(ex,ey),[F4,F3,F2,F1][(j+i)%4],1 if j%3 else 2)
    # smoke
    if i>=4:
        for j in range(4):
            sx=x-12+j*8+math.sin(i+j)*2; sy=y-6-(i-4)*7-j*3
            fx.circ('U',(sx,sy),3+(i-4)*0.8,[N2,N1,N3][j%3])
        fx.fade['U']=[0,0,0,0,0,0.15,0.4,0.65][i]
    fx.fade['B']=[0,0,0,0,0,0,0.25,0.55][i]

# =============================== WATER ===============================
def water_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for j in range(3):
            a=D(j*120+i*40); fx.circ('B',vadd(p,vmul(ang(a),8)),1.5,B4)
        fx.circ('B',p,4,B4); fx.px('T',vadd(p,(-1,-2)),B6); return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.ell('B',p,10*s,4*s,B4); fx.ell('T',vadd(p,(0,-1)),6*s,2*s,B5)
        for a in (-160,-120,-60,-20,200,-90):
            fx.circ('B',vadd(p,vmul(ang(D(a)),12*s)),1.5,B4)
        return
    t=tmid(i,n); p=P.pos(t); u=P.dir(t); s=P.size(t); n_=perp(u)
    st=1.0+0.25*math.sin(i*1.6)   # squash & stretch
    fx.tongue('B',vadd(p,vmul(u,2)),vmul(u,-1),15*s*st,6.5*s/st**0.5,B3)
    fx.circ('B',vadd(p,vmul(u,2)),6.5*s/st**0.4,B4)
    fx.circ('T',vadd(p,vmul(u,3),vmul(n_,-1.5)),3.5*s,B5)
    fx.px('T',vadd(p,vmul(u,4),vmul(n_,-3)),B6,2); fx.px('T',vadd(p,vmul(u,1),vmul(n_,2.5)),B6)
    for k in range(1,6):
        q=vadd(P.pos(t-0.05*k),vmul(n_,math.sin(k*2.2+i)*3.5))
        fx.circ('B' if k<3 else 'T',q,[2,1.6,1.2,1,0.6][k-1],[B4,B4,B5,B5,B6][k-1])
    fx.line('T',P.pos(t-0.06),P.pos(t-0.16),B5)

def water_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    if i==0:
        fx.tongue('B',(x,y-14),(0,-1),9,3.5,B3); fx.circ('B',(x,y-13),3.5,B4); fx.px('T',(x-1,y-15),B6); return
    if i==1:
        fx.ell('B',c,15,6,B4); fx.ell('T',(x,y-1),9,3,B5); fx.ell('T',(x,y-1),4,1,B6)
        for a in (-150,-30,-90): fx.circ('B',vadd(c,vmul(ang(D(a)),10)),2,B4)
        return
    k=i-2
    # crown droplets: fan upward then fall
    for j in range(9):
        a=D(-170+j*20); v=ang(a); spd=[14,22,28,32,34,35][min(k,5)]
        dx=v[0]*spd; dy=v[1]*spd*1.2+[0,3,9,17,26,36][min(k,5)]
        if k<=3: 
            fx.tongue('B',(x+dx,y+dy),vnorm((-v[0],-v[1]+0.4*k)),[7,6,4,3][k],2.2 if k<2 else 1.6,B4)
            fx.circ('B',(x+dx,y+dy),2 if k<2 else 1.5,B5 if j%2 else B4)
        elif j%2==0:
            fx.circ('T',(x+dx,y+dy),1,B5)
    # water column at center
    if k<=2:
        h=[16,20,12][k]; fx.poly('B',[(x-6+k,y+4),(x-3,y-h),(x+3,y-h-2),(x+6-k,y+4)],B3)
        fx.line('T',(x-1,y+2),(x,y-h+2),B5,2); fx.px('T',(x,y-h-1),B6,2)
    # ripple rings
    rr=[18,24,30,36,40,43][min(k,5)]
    fx.ell('U' if k>=4 else 'B',(x,y+6),rr,rr*0.32,B4 if k<3 else B5,w=2 if k<3 else 1)
    if k>=2: fx.ell('U',(x,y+6),rr*0.6,rr*0.2,B5,w=1)
    if k>=3: fx.fade['U']=[0,0,0,0.2,0.45,0.7][k]; fx.fade['B']=[0,0,0,0.1,0.3,0.6][k]

# =============================== EARTH ===============================
def _rock(fx,p,r,rot,seed,lit=True):
    R=random.Random(seed); pts=[]
    for j in range(7):
        a=rot+j*2*math.pi/7; rr=r*(0.8+0.35*R.random()); pts.append(vadd(p,vmul(ang(a),rr)))
    fx.poly('B',pts,E3)
    # lit upper-left facet
    lp=[vlerp(p,q,0.85) for q in pts]; cx=[q for q in lp if q[1]<p[1]+1 and q[0]<p[0]+2]
    if len(cx)>=2: fx.poly('B',[vadd(p,(-1,-1))]+cx,E4)
    fx.px('T',vadd(p,(-r*0.35,-r*0.4)),E5,2 if r>5 else 1)
    a=pts[1]; b=vlerp(p,pts[4],0.5); fx.line('B',vlerp(p,a,0.3),b,E2)
    fx.px('B',vadd(p,(r*0.3,r*0.25)),E2,2)

def earth_travel(fx,i,n,P,seed):
    R=random.Random(seed)
    if i==0:
        p=vadd(P.S,(0,4))
        _rock(fx,p,6*P.size(0),0.3,seed)
        for j in range(5): fx.circ('U',vadd(p,(-10+j*5,6+(j%2))),2.5,[E5,E6,KHA][j%3])
        for j in range(4): fx.px('T',vadd(p,(-8+j*5,-4-j%2*3)),E2,2)
        return
    if i==n-1:
        p=P.E; s=P.size(1)
        for j in range(5):
            a=D(-140+j*55); q=vadd(p,vmul(ang(a),8*s))
            fx.poly('B',[vadd(q,vmul(ang(a+0.6),3*s)),vadd(q,vmul(ang(a),5*s)),vadd(q,vmul(ang(a-0.6),3*s)),vadd(q,vmul(ang(a+3.14),2))],E3)
        for j in range(4): fx.circ('U',vadd(p,(-8+j*5,2+(j%2)*2)),3.5,[E5,E6][j%2])
        return
    t=tmid(i,n,0.06,0.94,ease_in); p=P.pos(t); s=P.size(t)
    for k in range(1,5):
        q=vadd(P.pos(t-0.06*k),(0,1+k))
        fx.circ('U',q,max(1,3.5-0.6*k)*s,[E6,E5,KHA,E5][k-1])
    for k in range(2):
        q=vadd(P.pos(t-0.1-0.08*k),(R.uniform(-3,3),5+k*4)); fx.px('T',q,E2,2)
    _rock(fx,p,8.5*s,i*D(52),seed+3)

def earth_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed); gy=y+24
    if i==0:
        pts=[(x-24,gy),(x-14,gy-2),(x-6,gy+1),(x+3,gy-2),(x+12,gy+1),(x+22,gy-1)]
        fx.pline('B',pts,E1,2)
        for j in range(4): fx.px('T',(x-15+j*10,gy-4-j%2*2),E4,2)
        return
    spikes=[(-15,0.75),(0,1.0),(13,0.65),(-6,0.45),(22,0.4)]
    Hs=[0,18,40,36,26,14,6,0][i]
    if Hs:
        for j,(sx,hf) in enumerate(spikes):
            h=Hs*hf; w=6 if hf>0.6 else 4
            if h<3: continue
            lean=(sx)*0.12
            tip=(x+sx+lean,gy-h)
            fx.poly('B',[(x+sx-w,gy),tip,(x+sx+w,gy)],E3)
            fx.poly('B',[(x+sx-w+1,gy),tip,(x+sx-1,gy)],E4)
            fx.line('B',(x+sx+1,gy-2),vlerp((x+sx,gy),tip,0.7),E2)
            if i>=3:  # crumbling tips
                fx.poly('B',[vadd(tip,(-2,0)),vadd(tip,(2,1)),vadd(tip,(0,3))],E2)
            if i<=2: fx.px('T',vadd(tip,(0,2)),E6,1)
    # debris chunks
    if i>=2:
        for j in range(7):
            a=D(-160+j*23); v=ang(a); d=10+(i-2)*9; g=(i-2)**2*2.2
            q=(x+v[0]*d*1.2,gy-14+v[1]*d+g)
            if q[1]<gy+14: _rock(fx,q,2.2 if j%2 else 3,j+i,seed+j,lit=False)
    # dust clouds
    if i>=2:
        k=i-2
        for j in range(6):
            dx=-26+j*10.5; r=[3,5,7,8,8,8][k]+(j%2)
            fx.circ('U',(x+dx+math.copysign(k*2,dx),gy-2-k*2-(j%3)),r,[E5,E6,KHA][j%3])
        fx.fade['U']=[0,0,0,0.1,0.3,0.55,0.75,0.9][i]
    fx.fade['B']=[0,0,0,0,0,0,0.3,0.6][i]

# =============================== WIND ===============================
def wind_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for j in range(2):
            fx.arc('B',p,9-j*3,7-j*2,j*180+i*60,j*180+200,B6,1)
        fx.arc('T',p,12,9,200,330,T2,1); return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.line('B',vadd(p,(-10*s,-10*s)),vadd(p,(10*s,10*s)),B6,2); fx.line('B',vadd(p,(10*s,-10*s)),vadd(p,(-10*s,10*s)),B6,2)
        fx.plus('T',p,F5,2); return
    for k,lag in enumerate((0.0,0.13)):
        t=tmid(i,n,0.1,0.96)-lag
        if t<0.02: continue
        p=P.pos(t); u=P.dir(t); s=P.size(t)*(1-0.2*k); nn=perp(u)
        uu=vrot(u,D(18*math.sin(i*1.5+k)))
        fx.crescent('B',p,uu,11*s,3.5*s,B6,span=72)
        fx.crescent('T',vadd(p,vmul(uu,-0.5)),uu,10*s,1.2*s,F5,span=55)
        for j,o in enumerate((-6,0,6)):
            a=vadd(p,vmul(nn,o*s),vmul(u,-6*s)); b=vadd(a,vmul(u,-(14+6*(j==1))*s))
            fx.line('U',a,b,T2 if j!=1 else B6)
WT='U'
def wind_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    if i==0:
        fx.arc('B',(x-18,y),10,6,-60,60,B6,2); fx.arc('B',(x+18,y),10,6,120,240,B6,2); return
    if i==1:
        fx.arc('B',(x+10,y-10),26,26,95,175,B6,3); fx.arc('T',(x+10,y-10),26,26,110,160,F5,1)
        fx.arc('B',(x-10,y-12),26,26,5,85,T2,2); fx.arc('T',(x-10,y-12),26,26,20,70,F5,1)
        for j in range(5): fx.px('T',(x-20+j*9,y+14-(j%2)*5),[B6,F5][j%2],2 if j%2 else 1)
        return
    k=i-2; spin=k*55
    # funnel: stacked ellipse arcs, wider at top
    for j in range(6):
        cy=y+18-j*8; rx=6+j*3.4+(k>=3)*j*0.8; ry=2+j*0.6
        a0=spin+j*40
        fx.arc('B',(x+math.sin(k+j*0.6)*2,cy),rx,ry,a0,a0+200,B6 if j%2 else T2,2 if j<4 else 1)
        fx.arc('T',(x+math.sin(k+j*0.6)*2,cy),rx,ry,a0+20,a0+80,F5,1)
    # flying debris specks orbiting
    for j in range(8):
        a=D(j*45+k*70); r=16+j%3*5+k*2
        fx.px('T',(x+math.cos(a)*r,y+math.sin(a)*r*0.4-k*3-j*2+8),[B6,T2,F5][j%3],2 if j%2 else 1)
    if k>=3:
        for j in range(4):
            a=D(-150+j*40); p0=vadd(c,vmul(ang(a),20+k*4)); fx.line('U',p0,vadd(p0,vmul(ang(a),8)),T2)
    fx.fade['B']=[0,0,0,0,0,0.3,0.6][i] if n==7 else 0

# =============================== LIGHT ===============================
def light_travel(fx,i,n,P,seed):
    R=random.Random(seed)
    if i==0:
        p=P.S
        fx.line('B',vadd(p,(-8,0)),vadd(p,(8,0)),F4,1); fx.line('B',vadd(p,(0,-8)),vadd(p,(0,8)),F4,1)
        fx.circ('B',p,2.5,F4); fx.px('T',p,F5); fx.ell('T',p,7,7,CRM,w=1); return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.star('B',p,13*s,3,4,0,F4); fx.star('B',p,8*s,2,4,D(45),F4); fx.circ('T',p,3,F5); return
    t=tmid(i,n,0.22,0.95); p=P.pos(t); u=P.dir(t); nn=perp(u); s=P.size(t)
    t0=max(0.0,t-0.42); tail=P.pos(t0)
    fx.poly('B',[vadd(p,vmul(nn,3*s)),vadd(p,vmul(u,6*s)),vadd(p,vmul(nn,-3*s)),tail],F4)
    fx.line('T',tail,p,F5,1)
    fx.star('B',p,9*s,2.2,4,math.atan2(u[1],u[0]),F4); fx.circ('T',p,2,F5)
    for k in range(5):
        q=vadd(P.pos(t0+(t-t0)*R.random()),vmul(nn,R.choice((-1,1))*R.uniform(4,8)))
        fx.plus('T',q,CRM if k%2 else F4,1,F5)

def light_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    if i==0:
        for a in (0,90,180,270): fx.line('B',c,vadd(c,vmul(ang(D(a)),7)),F4)
        fx.px('T',c,F5,2); return
    if i==1:
        fx.poly('B',[(x-34,y),(x,y-3),(x+34,y),(x,y+3)],F4); fx.poly('B',[(x,y-28),(x+3,y),(x,y+28),(x-3,y)],F4)
        fx.line('T',(x-30,y),(x+30,y),F5); fx.line('T',(x,y-24),(x,y+24),F5)
        fx.circ('B',c,7,F4); fx.circ('T',c,4,F5); return
    if i==2:
        for j in range(12):
            a=D(j*30+15); L=30 if j%2==0 else 18; v=ang(a); nn=perp(v)
            fx.poly('B',[vadd(c,vmul(nn,2.5)),vadd(c,vmul(v,L)),vadd(c,vmul(nn,-2.5))],F4)
            fx.line('T',c,vadd(c,vmul(v,L*0.7)),F5)
        fx.circ('B',c,10,F4); fx.circ('T',c,7,F5); return
    k=i-3
    rr=[22,30,36,40][min(k,3)]
    if k<=2: fx.ell('B',c,rr,rr*0.85,F4 if k<2 else CRM,w=2 if k<1 else 1)
    if k==0:
        for j in range(8):
            v=ang(D(j*45)); fx.line('B',vadd(c,vmul(v,4)),vadd(c,vmul(v,12)),F4,2)
        fx.circ('T',c,4,F5)
    for j in range(7):
        a=D(j*51+20); r=14+j%3*6+k*3; q=(x+math.cos(a)*r,y+math.sin(a)*r*0.8-k*4)
        sz=[3,3,2,1][min(k,3)] - (j%2)
        if sz>=2: fx.star('T',q,sz+1,1,4,0,F4); fx.px('T',q,F5)
        elif sz==1 or k<3: fx.plus('T',q,CRM,1,F5)
        else: fx.px('T',q,F4)
    fx.fade['B']=[0,0,0,0,0.2,0.5,0.7][i] if i<7 else 0.8
    fx.fade['T']=[0,0,0,0,0,0,0.4,0.6][i] if i<8 else 0

# =============================== DARK ===============================
def _tendrils(fx,p,u,L,i,cnt,col,w=2,amp=3):
    nn=perp(u)
    for j in range(cnt):
        off=(j-(cnt-1)/2)*3.5; pts=[]
        for m in range(6):
            d=m/5*L*(0.8+0.3*((j*3)%2)); wv=math.sin(m*1.3+i*1.4+j*2)*amp*(m/5)
            pts.append(vadd(p,vmul(u,-d),vmul(nn,off*(1+m*0.25)+wv)))
        fx.pline('B',pts,col,w if j%2==0 else 1)

def dark_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        fx.ell('B',vadd(p,(0,3)),8,3,V0)
        for j in range(5):
            a=D(j*72+20); q=vadd(p,vmul(ang(a),12)); fx.line('B',q,vlerp(q,p,0.5),V1,1)
        fx.circ('B',p,3,V0); fx.px('T',p,V4); return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.ell('B',p,10*s,9*s,V0,w=2); fx.circ('B',p,3,V0); fx.px('T',vadd(p,(-1,-1)),V4,2)
        for a in range(0,360,60): fx.px('T',vadd(p,vmul(ang(D(a+15)),14*s)),V3)
        return
    t=tmid(i,n,0.08,0.94); p=P.pos(t); u=P.dir(t); s=P.size(t)
    _tendrils(fx,p,u,24*s,i,4,VD,2,3.5)
    fx.blob('B',p,8*s,V0,seed+i,n=10,rough=0.18,rot=i*0.5)
    fx.blob('B',vadd(p,vmul(u,1)),6*s,VD,seed+i+9,n=8,rough=0.1)
    fx.circ('B',vadd(p,vmul(u,1)),3.5*s,V0)
    fx.px('T',vadd(p,vmul(u,3),(-1,-2)),V4,2); fx.px('T',vadd(p,vmul(u,2)),V5)
    for k in range(5):
        q=vadd(P.pos(t-0.06*k-0.04),vmul(perp(u),math.sin(k*2.4+i)*9))
        fx.px('T',q,[V4,V3,V3,V2,V2][k],2 if k<2 else 1)

def dark_impact(fx,i,n,c,seed):
    x,y=c
    if i<=1:
        r=[30,18][i]
        for j in range(7):
            a=D(j*51+10+i*12); q=vadd(c,vmul(ang(a),r)); wv=perp(ang(a))
            pts=[vadd(q,vmul(ang(a),8)),q,vadd(vlerp(q,c,0.4),vmul(wv,3*math.sin(j))),vlerp(q,c,0.75)]
            fx.pline('B',pts,VD,2)
        fx.circ('B',c,3+i*2,V0); fx.px('T',c,V4); return
    if i==2:
        fx.blob('B',c,15,V0,seed,n=14,rough=0.35); fx.blob('B',c,9,VD,seed+1,n=10,rough=0.2)
        fx.circ('B',c,5,V0); fx.px('T',vadd(c,(-2,-2)),V5,2)
        for j in range(6): fx.px('T',vadd(c,vmul(ang(D(j*60)),18)),V4,2)
        return
    k=i-3; rr=[20,28,34,38,41][min(k,4)]; w=[5,4,3,2,1][min(k,4)]
    fx.ell('B',c,rr,rr*0.8,V0,w=w)
    if k<3: fx.ell('T',c,rr-w-1,(rr-w-1)*0.8,V2,w=1)
    if k<2:
        for j in range(8):
            a=D(j*45+22); fx.tongue('B',vadd(c,vmul(ang(a),rr*0.7)),ang(a),10-k*3,2.5,V0)
    for j in range(8):
        a=D(j*45+k*25); r=8+j%3*6+k*2; q=(x+math.cos(a)*r,y+math.sin(a)*r*0.7-k*4-j%2*3)
        fx.px('T',q,[V4,V3,V5][j%3],2 if (j+k)%3==0 else 1)
    fx.fade['B']=[0,0,0,0,0.1,0.35,0.55,0.75][i]

# =============================== MYSTIC ===============================
GLYPHS=[[(0,0),(1,1),(2,0),(1,2)],[(0,0),(0,1),(0,2),(1,1),(2,1)],[(1,0),(0,1),(2,1),(1,2)],[(0,0),(2,0),(1,1),(0,2),(2,2)],[(0,1),(1,0),(1,1),(1,2),(2,1)]]
def _glyph(fx,k,p,g,col):
    for gx,gy in GLYPHS[g%len(GLYPHS)]: fx.px(k,(p[0]+gx-1,p[1]+gy-1),col)

def mystic_travel(fx,i,n,P,seed):
    cols=[P2,V4,B5]
    if i==0:
        p=P.S; fx.ell('B',p,7,7,V4,w=1); fx.px('T',p,V6,2)
        for k in range(3): fx.circ('T',vadd(p,vmul(ang(D(k*120+30)),7)),1.5,cols[k])
        return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.star('B',p,8,3,3,D(-90),V4); fx.star('B',p,8,3,3,D(90),P2); fx.circ('T',p,2.5,V6)
        fx.ell('T',p,12,12,V5,w=1); return
    t=tmid(i,n); p=P.pos(t); u=P.dir(t); nn=perp(u); s=P.size(t)
    fx.circ('B',p,3.5*s,V4); fx.circ('T',p,2*s,V5); fx.px('T',p,V6)
    for k in range(3):
        for m in range(4):
            tt=t-0.035*m; ph=tt*28+k*2.094
            q=vadd(P.pos(tt),vmul(nn,math.cos(ph)*9*s),vmul(u,math.sin(ph)*3*s))
            if m==0: fx.circ('B',q,2.3*s,cols[k]); fx.px('T',vadd(q,(-1,-1)),V6)
            else: fx.px('T',q,[cols[k],V3,V2][m-1],2 if m==1 else 1)
    _glyph(fx,'T',vadd(P.pos(t-0.17),vmul(nn,4)),i,V5)

def mystic_impact(fx,i,n,c,seed):
    x,y=c; gc=(x,y+20)
    if i==0:
        fx.ell('B',gc,6,2,V4,w=1); fx.px('T',c,V6,2); fx.circ('T',vadd(c,(0,-4)),1.5,P2); return
    rx=[0,18,26,28,28,28,26,24][i]
    if i<=6:
        fx.ell('B',gc,rx,rx*0.36,V3,w=2 if i<6 else 1); fx.ell('T',gc,rx*0.72,rx*0.26,V5,w=1)
        fx.fade['B']=[0,0,0,0,0,0,0.35,0.6][i]
        for j in range(8):
            a=D(j*45+i*18); q=(gc[0]+math.cos(a)*rx,gc[1]+math.sin(a)*rx*0.36)
            fx.px('T',vadd(q,(0,-1)),P2 if j%2 else V6,2)
    if i in (3,4):
        L=[16,22][i-3]
        for a in (-90,-30,30,90,150,210):
            fx.line('B',c,vadd(c,vmul(ang(D(a+i*10)),L)),V4,1)
        fx.circ('B',c,5,V4); fx.star('T',c,7,2,4,D(i*20),V6); fx.circ('T',c,2,F5)
    if i==2:
        fx.line('B',(x,gc[1]),(x,y-18),V4,3); fx.line('T',(x,gc[1]),(x,y-18),V6,1)
    if i>=2:
        for j in range(7):
            gx=x-20+j*7; gy=gc[1]-4-(i-2)*7-(j%3)*5
            if gy< 4: continue
            _glyph(fx,'T',(gx,gy),j+i,[V5,P2,V6,B5][j%4])
        fx.fade['T']=[0,0,0,0,0,0.1,0.4,0.7][i]

# =============================== LEGENDARY ===============================
def legendary_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for a,col in ((200,F4),(260,V4),(320,B5)):
            q=vadd(p,vmul(ang(D(a)),14)); fx.line('B',q,vlerp(q,p,0.6),col,2)
        fx.star('B',p,6,3,8,0,F4); fx.px('T',p,F5,2); return
    if i==n-1:
        p=P.E; s=P.size(1)
        for r,col in ((15,B5),(11,V4),(7,F4)): fx.ell('B',p,r*s,r*s,col,w=2)
        fx.star('T',p,9*s,3,8,D(i*22),F4); fx.circ('T',p,2.5,F5); return
    t=tmid(i,n); p=P.pos(t); u=P.dir(t); nn=perp(u); s=P.size(t)
    for k,col in enumerate((F3,V4,B5)):
        pts=[]
        for m in range(10):
            tt=t-0.035*m-0.01
            pts.append(vadd(P.pos(tt),vmul(nn,math.sin(m*0.9+i*1.2+k*2.1)*(1+m*0.5)*s)))
        fx.pline('B',pts,col,2 if k==0 else 1+(m<5))
    fx.star('B',p,10*s,4.2*s,8,i*D(22),F4)
    fx.star('T',p,6*s,2.5*s,4,i*D(22),F3); fx.circ('T',p,2.2*s,F5)
    for k in range(4):
        q=vadd(P.pos(t-0.08-0.07*k),vmul(nn,(-1)**k*6)); fx.plus('T',q,[V5,B6,F4,V5][k],1,F5)

def legendary_impact(fx,i,n,c,seed):
    x,y=c
    if i==0:
        fx.star('B',c,7,3,8,0,F4); fx.px('T',c,F5,2); return
    if i==1:
        fx.star('B',c,24,9,8,D(22),F3); fx.star('B',c,16,7,8,0,F4); fx.circ('T',c,6,F5); return
    k=i-2
    rings=[(14,F3),(21,V4),(27,B5)]
    for j,(r,col) in enumerate(rings):
        rr=r+k*5+j*k
        if k<=4: fx.ell('B' if k<3 else 'U',c,rr,rr*0.85,col,w=2 if k<2 else 1)
    if k<=1:
        for j in range(8):
            v=ang(D(j*45+k*22)); fx.line('B',vadd(c,vmul(v,6)),vadd(c,vmul(v,30+k*6)),F4,1)
        fx.star('B',c,9,4,8,D(k*22),F4); fx.circ('T',c,3,F5)
    if 2<=k<=4:
        # crown crest rising above target
        cy=y-10-k*3; h=[16,14,10][k-2]
        pts=[(x-16,cy+6)]
        for j,dx in enumerate((-16,-10,-5,0,5,10,16)):
            pts.append((x+dx,cy-(h if j in (0,3,6) else h*0.45) if j%3==0 else cy-h*0.45))
        pts=[(x-16,cy+6),(x-16,cy-h*0.8),(x-10,cy-2),(x-5,cy-h*0.6),(x,cy-h),(x+5,cy-h*0.6),(x+10,cy-2),(x+16,cy-h*0.8),(x+16,cy+6)]
        fx.poly('B',pts,F4); fx.line('T',(x-14,cy+3),(x+14,cy+3),F3)
        for dx,col in ((-8,V4),(0,B5),(8,P0)): fx.px('T',(x+dx,cy+1),col,2)
        fx.px('T',(x,cy-h+3),F5,2)
        fx.fade['B']=[0,0,0,0,0,0.25,0.55,0][i]
    for j in range(6):
        a=D(j*60+k*30); r=18+k*4; fx.plus('T',(x+math.cos(a)*r,y+math.sin(a)*r*0.8),[F4,V5,B6][j%3],1 if k>3 else 2,F5)
    if k>=4: fx.fade['U']=0.4; fx.fade['T']=0.3 if k==4 else 0.6

# =============================== GRASS ===============================
def _leaf(fx,k,c,a,L,w,col=None):
    u=ang(a); fx.lens(k,c,u,L,w,col or G4)
    n=perp(u); fx.lens('T',vadd(c,vmul(n,-w*0.35)),u,L*0.7,w*0.45,G5)
    fx.line('T',vadd(c,vmul(u,-L/2)),vadd(c,vmul(u,L*0.3)),G2)

def grass_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for k in range(3): _leaf(fx,'B',vadd(p,vmul(ang(D(k*120+20)),8)),D(k*120+110),8,2.6)
        return
    if i==n-1:
        p=P.E; s=P.size(1)
        for k in range(6): _leaf(fx,'B',vadd(p,vmul(ang(D(k*60+10)),10*s)),D(k*60+10),8*s,2.4*s)
        return
    t=tmid(i,n); u=P.dir(t); nn=perp(u)
    for k in range(5):
        tt=t-0.055*k
        if tt<0.02: continue
        s=P.size(tt)*(1-0.08*k)
        q=vadd(P.pos(tt),vmul(nn,math.sin(tt*16+k)*7))
        _leaf(fx,'B',q,D(i*55+k*40),10*s,3.2*s)
    for k in range(6):
        q=vadd(P.pos(t-0.04*k-0.1),vmul(nn,math.cos(k*2.1+i)*10)); fx.px('T',q,[G5,G4,G3][k%3])

def grass_impact(fx,i,n,c,seed):
    x,y=c
    if i==0:
        for k in range(5): _leaf(fx,'B',vadd(c,vmul(ang(D(k*72)),18)),D(k*72+90),8,2.5)
        return
    # whipping vines
    if 1<=i<=4:
        pr=[0.5,1.0,1.0,0.8][i-1]
        for side in (-1,1):
            pts=[]
            for m in range(9):
                tt=m/8*pr; a=D(200 if side<0 else -20)+side*tt*D(250+i*15)
                r=26-tt*14
                pts.append((x+side*4+math.cos(a)*r*(-side if False else 1), y+6+math.sin(a)*r*0.7))
            fx.pline('B',pts,G2,3 if i<4 else 2)
            fx.pline('T',pts[:-1],G3,1)
            for m in (2,5): _leaf(fx,'B',pts[m],D(m*50+side*30),6,2)
    if i>=2:
        k=i-2
        for j in range(8):
            a=D(j*45+12); v=ang(a); d=10+k*7; g=max(0,k-1)**2*1.5
            q=(x+v[0]*d,y+v[1]*d*0.8+g)
            _leaf(fx,'B',q,a+k*D(70)*((-1)**j),8,2.4)
    if 3<=i<=5:
        for fxp in ((x-12,y-14),(x+14,y-8),(x+2,y-20)):
            fp=(fxp[0],fxp[1]+(i-3)*4)
            for d in ((0,-2),(2,0),(0,2),(-2,0)): fx.px('T',vadd(fp,d),P2,2 if i==3 else 1)
            fx.px('T',fp,F4)
    fx.fade['B']=[0,0,0,0,0,0.2,0.45,0.7][i]

# =============================== BUG ===============================
def _bug(fx,p,i,j):
    # outlined beetle body (B layer gets dark outline) + head + flapping wing pair
    big=j%3!=2
    fx.ell('B',p,2.2 if big else 1.6,1.6 if big else 1.2,G3 if j%2 else G2)
    fx.px('B',vadd(p,(2,0)),CHAR,2)
    fx.px('T',vadd(p,(-1,-1)),G5)
    up_=(i+j)%2==0
    if up_: fx.px('T',vadd(p,(-2,-3)),N5,2); fx.px('T',vadd(p,(0,-4)),B6,2)
    else: fx.px('T',vadd(p,(-3,-1)),N5,2); fx.px('T',vadd(p,(-1,2)),B6,1)

def bug_travel(fx,i,n,P,seed):
    R=random.Random(seed); bugs=[(R.uniform(3,14),R.uniform(0,6.28),R.uniform(0.8,1.6),R.uniform(0,0.12)) for _ in range(15)]
    if i==0:
        p=P.S
        for j,(r,ph,sp,lag) in enumerate(bugs[:5]): _bug(fx,vadd(p,(math.cos(ph)*r,math.sin(ph)*r*0.6-4)),i,j)
        return
    if i==n-1:
        p=P.E
        for j,(r,ph,sp,lag) in enumerate(bugs): _bug(fx,vadd(p,(math.cos(ph)*(r+10),math.sin(ph)*(r+10)*0.7)),i,j)
        return
    t=tmid(i,n)
    for j,(r,ph,sp,lag) in enumerate(bugs):
        tt=t-lag; q=P.pos(tt); s=P.size(tt)
        a=ph+i*sp*1.9; q=vadd(q,(math.cos(a)*r*s,math.sin(a)*r*0.6*s))
        _bug(fx,q,i,j)
        if j%3==0:
            b=vadd(q,(math.cos(a-0.8)*-3,math.sin(a-0.8)*-2)); fx.px('U',b,G4)
    fx.ell('U',P.pos(t-0.04),12*P.size(t),7*P.size(t),G1b); fx.fade['U']=0.75

def bug_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    N=18
    for j in range(N):
        ph=j*2*math.pi/N+R.uniform(-0.2,0.2)
        if i==0: r=40-j%3*3; q=(x+math.cos(ph)*r,y+math.sin(ph)*r*0.6)
        elif i<=5:
            a=ph+i*0.9*(1 if j%2 else -1); r=24-(i==3)*6+(j%3)*3
            q=(x+math.cos(a)*r,y+math.sin(a)*r*0.55+math.sin(i*2+j)*2)
        else:
            a=ph; r=26+(i-5)*14; q=(x+math.cos(a)*r,y+math.sin(a)*r*0.6-(i-5)*4)
        _bug(fx,q,i,j)
    if 2<=i<=4:
        for j in range(3):
            a=D(R.uniform(0,360)+i*40); p0=vadd(c,vmul(ang(a),14)); p1=vadd(c,vmul(ang(a),5))
            fx.line('B',p0,p1,G5,1); fx.star('B',p1,4,1.2,4,D(45),G4); fx.px('T',p1,F4)
    if i in (3,4):
        fx.ell('U',c,22,12,G1b); fx.fade['U']=0.7

# =============================== SEA ===============================
WAVE=[(-24,0),(-16,2),(-9,6),(-3,11),(2,15),(7,17),(11,15),(13,11),(11,8),(8,9),(6,12),(3,10),(3,5),(6,1),(10,0)]
def _wave(fx,base,sc,fl,i,col=T1):
    pts=[(base[0]+fl*x*sc,base[1]-y*sc) for x,y in WAVE]
    fx.poly('B',pts,col)
    top=[(base[0]+fl*x*sc,base[1]-y*sc) for x,y in WAVE[2:9]]+[(base[0]+fl*x*sc,base[1]-(y-3)*sc) for x,y in reversed(WAVE[2:9])]
    fx.poly('B',top,T2)
    for j,(x,y) in enumerate(WAVE[4:10]):
        fx.px('T',(base[0]+fl*x*sc,base[1]-y*sc),F5 if j%2==0 else B6,2 if j%2==0 else 1)
    fx.line('T',(base[0]+fl*(-18)*sc,base[1]-1),(base[0]+fl*(4)*sc,base[1]-1),B6)

def sea_travel(fx,i,n,P,seed):
    fl=P.dirx
    if i==0:
        p=P.S; fx.ell('B',vadd(p,(0,2)),9,3,T1); fx.ell('B',vadd(p,(0,0)),5,3,T2); fx.px('T',vadd(p,(0,-3)),F5,2); return
    if i==n-1:
        p=P.E; s=P.size(1)
        for j in range(9):
            a=D(-170+j*20); fx.circ('B',vadd(p,vmul(ang(a),[8,12,10][j%3]*s)),[2,1.5,2.5][j%3],[B6,T2,F5][j%3])
        fx.ell('B',p,8*s,4*s,T2); return
    t=tmid(i,n); p=P.pos(t); s=P.size(t)*(0.85+0.15*math.sin(i*1.4))
    _wave(fx,vadd(p,(0,8*s)),s*0.95,fl,i)
    for k in range(1,6):
        q=vadd(P.pos(t-0.05*k),(0,8*s+math.sin(k+i)*2)); fx.px('T',q,[F5,B6,T2,B6,T2][k-1],2 if k<3 else 1)

def sea_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    if i==0:
        _wave(fx,(x-26,y+22),0.8,1,i); return
    if i==1:
        _wave(fx,(x-18,y+22),1.6,1,i); return
    if i==2:
        # crashing curl over target
        _wave(fx,(x-6,y+24),1.8,1,i)
        for j in range(6): fx.px('T',(x+10+j*3,y-10+j*2+R.randint(-2,2)),F5,2)
        return
    k=i-3
    if k<=1:
        fx.blob('B',(x,y+6),[22,26][k],T1,seed,n=12,rough=0.3,sy=0.6)
        fx.blob('B',(x,y+4),[16,18][k],T2,seed+1,n=10,rough=0.3,sy=0.55)
    for j in range(14):
        a=D(-180+j*13+R.uniform(-5,5)); d=[18,26,32,36,38][k]+(j%3)*3; g=k*k*1.6
        q=(x+math.cos(a)*d,y+6+math.sin(a)*d*0.8+g)
        fx.circ('T',q,[2,1.5,1,1,0.5][k],[F5,B6,T2][j%3])
    rr=[24,30,36,40,42][k]
    fx.ell('U',(x,y+18),rr,rr*0.25,F5 if k<2 else B6,w=1)
    for j in range(4):
        bq=(x-12+j*8,y+10-k*6-j%2*4)
        if k>=1: fx.ell('T',bq,2,2,B6,w=1)
    fx.fade['U']=[0,0,0.2,0.5,0.7][k]; fx.fade['T']=[0,0,0,0.3,0.6][k]

# =============================== FRESHWATER ===============================
def _bubble(fx,p,r,wob=0):
    rx=r+wob; ry=r-wob
    fx.ell('U',p,rx+1,ry+1,B1,w=1)
    fx.ell('T',p,rx,ry,B5,w=1)
    if r>=3: fx.arc('T',p,rx-1.5,ry-1.5,200,260,B6,1)
    fx.px('T',(p[0]-r*0.45,p[1]-r*0.45),F5)

def freshwater_travel(fx,i,n,P,seed):
    R=random.Random(seed); bub=[(R.uniform(0,0.2),R.uniform(-9,9),R.choice((2,3,3,4)),R.uniform(0,6)) for _ in range(7)]
    if i==0:
        p=P.S
        for j,(lag,o,r,ph) in enumerate(bub[:4]): _bubble(fx,vadd(p,(o*0.8,-3-j*3)),max(1.5,r-2))
        return
    if i==n-1:
        p=P.E
        for j in range(6):
            a=D(j*60+20); q=vadd(p,vmul(ang(a),9)); fx.line('T',vadd(q,vmul(ang(a),2)),vadd(q,vmul(ang(a),5)),B6)
        _bubble(fx,p,3); return
    t=tmid(i,n); u=P.dir(t); nn=perp(u)
    p=P.pos(t); s=P.size(t); _bubble(fx,p,7*s,(1 if i%2 else -1)*0.8)
    fx.ell('B',p,5*s,5*s,B4); fx.fade['B']=0.55
    for j,(lag,o,r,ph) in enumerate(bub):
        tt=t-0.04-lag; q=vadd(P.pos(tt),vmul(nn,o+math.sin(i*1.3+ph)*2))
        _bubble(fx,q,r*P.size(tt),(1 if (i+j)%2 else 0))

def freshwater_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    B=[(R.uniform(-22,22),R.uniform(-22,20),R.choice((3,4,5,6)),R.randint(3,5)) for _ in range(11)]
    for j,(bx,by,r,pop) in enumerate(B):
        if i==0: q=(x+bx*1.6,y+by*1.4); rr=max(1.5,r-3)
        else: q=(x+bx,y+by-i*1.5); rr=r*min(1,0.5+0.25*i)
        if i<pop: _bubble(fx,q,rr,(i+j)%2)
        elif i==pop:
            for a in range(0,360,45):
                v=ang(D(a)); fx.line('T',vadd(q,vmul(v,rr*0.6)),vadd(q,vmul(v,rr+2)),B6 if a%90 else F5)
        elif i==pop+1:
            for a in range(0,360,90): fx.px('T',vadd(q,vmul(ang(D(a+45)),rr+3)),B5)
    if i>=4:
        for j in range(8): fx.px('T',(x-20+j*6,y+4+(i-4)*7+(j%3)*3),B5,1+(j%2))

# =============================== SWAMP ===============================  # 2026-10-30 night fix: outline 18382c->a6d460 (light rim), inner core G2b->G1b
def swamp_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S; fx.blob('B',p,6,G3b,seed,n=9,rough=0.3); fx.ell('T',vadd(p,(2,-6)),2,2,G5,w=1); fx.px('T',vadd(p,(-2,-1)),G5); return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.blob('B',p,12*s,G3b,seed,n=12,rough=0.4,sy=0.6); fx.blob('B',p,7*s,G1b,seed+1,n=9,rough=0.3,sy=0.6)
        for j in range(3): fx.line('B',vadd(p,(-6+j*6,3)),vadd(p,(-6+j*6,7+j*2)),G3b,2)
        return
    t=tmid(i,n,0.06,0.94,ease_in); p=P.pos(t); u=P.dir(t); s=P.size(t)
    sq=1+0.2*math.sin(i*1.7)
    fx.blob('B',p,8*s,G3b,seed+i,n=10,rough=0.22,rot=i*0.4,sx=sq,sy=1/sq)
    fx.tongue('B',p,vmul(u,-1),13*s,5*s,G3b,0.1)
    fx.blob('B',vadd(p,(1,1)),5*s,G1b,seed+i+5,n=8,rough=0.3)
    fx.px('T',vadd(p,(-3*s,-4*s)),G5,2); fx.px('T',vadd(p,(2,-1)),G4)
    fx.px('B',vadd(p,(3,3)),MUD,2); fx.px('B',vadd(p,(-4,2)),E2,2)
    for k in range(1,4):
        q=P.pos(t-0.07*k); dropy=k*k*2.5
        fx.line('B',vadd(q,(0,4)),vadd(q,(0,4+dropy*0.6)),G3b,2); fx.circ('B',vadd(q,(0,5+dropy)),1.3,G3b)
    if i%2: fx.ell('T',vadd(p,(-1,-9*s)),1.5,1.5,G5,w=1)

def swamp_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    if i==0:
        fx.blob('B',(x,y-8),7,G3b,seed,n=9,rough=0.25,sx=0.8,sy=1.2); fx.px('T',(x-2,y-11),G5,2); return
    sz=[0,1.0,1.0,0.95,0.85,0.7,0.6,0.5][i]
    fx.blob('B',c,22*sz,G3b,seed,n=14,rough=0.45,sy=0.7)
    fx.blob('B',vadd(c,(0,-1)),14*sz,G1b,seed+1,n=11,rough=0.35,sy=0.65)
    fx.px('T',vadd(c,(-6,-5)),G5,2); fx.px('B',vadd(c,(5,2)),MUD,2); fx.px('B',vadd(c,(-10,3)),E2,2)
    if i==1:
        for j in range(8):
            a=D(j*45+10); fx.circ('B',vadd(c,vmul(ang(a),26)),2,G3b)
    if i>=2:
        for j in range(5):
            dx=-14+j*7+(j==2)*2
            if (i+j)%5==0 and i<4: continue
            L=min(14,(i-1)*4+j%2*3) if i<5 else max(2,14-(i-4)*4-j%2*2)
            fx.line('B',(x+dx,y+6),(x+dx,y+6+L),G3b,2 if j%2==0 else 1)
            if i>=4: fx.circ('B',(x+dx,y+12+14+(i-4)*5+j%2*3),1.5 if j%2==0 else 1,G3b)
    if i>=3:
        for j in range(5):
            bq=(x-14+j*7+math.sin(i+j)*2,y-10-(i-3)*6-(j%2)*5)
            if (i+j)%4==3: fx.plus('T',bq,G5,2)
            else: fx.ell('T',bq,1.5+(j%2),1.5+(j%2),G5,w=1)
        for j in range(3): fx.circ('U',(x-10+j*10,y-14-(i-3)*5),5,G3)
        fx.fade['U']=[0,0,0,0.5,0.6,0.7,0.8,0.9][i]
    fx.fade['B']=[0,0,0,0,0,0.15,0.4,0.65][i]

# =============================== RAIN ===============================
def rain_travel(fx,i,n,P,seed):
    R=random.Random(seed); ndl=[(R.uniform(-10,10),R.uniform(0,0.16)) for _ in range(8)]
    if i==0:
        p=vadd(P.S,(0,-6))
        for j,(dx,r) in enumerate(((-6,4),(0,5),(6,4),(-2,3))): fx.circ('B',vadd(p,(dx,-(j==1)*2)),r,N4)
        fx.ell('B',vadd(p,(0,2)),9,2,N3)
        for j in range(3): fx.line('T',vadd(p,(-4+j*4,5)),vadd(p,(-5+j*4,8)),B5)
        return
    if i==n-1:
        p=P.E
        for j in range(6): fx.line('T',vadd(p,(-10+j*4,-6+(j%2)*4)),vadd(p,(-12+j*4,-2+(j%2)*4)),B5)
        for j in range(5): fx.px('T',vadd(p,(-8+j*4,4)),B6,1)
        fx.arc('B',vadd(p,(0,4)),8,2,180,360,B5,1); return
    t=tmid(i,n,0.12,0.98)
    for j,(o,lag) in enumerate(ndl):
        tt=t-lag
        if tt<0.03: continue
        u=P.dir(tt); nn=perp(u); s=P.size(tt)
        q=vadd(P.pos(tt),vmul(nn,o*s))
        fx.line('B',q,vadd(q,vmul(u,-10*s)),B4,1); fx.px('T',q,B6); fx.line('T',vadd(q,vmul(u,-1)),vadd(q,vmul(u,-4*s)),B5)
        if j%3==0: fx.px('T',vadd(q,vmul(u,-14*s),vmul(nn,2)),B5)

def rain_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed); cy=y-44; gy=y+22
    cs=[0.5,0.85,1,1,1,1,0.9,0.8][i]
    puffs=[(-16,3,7),(-6,0,9),(6,-2,10),(17,2,8),(-24,6,5),(25,6,5)]
    for dx,dy,r in puffs: fx.circ('B',(x+dx*cs,cy+dy*cs),r*cs,N3)
    for dx,dy,r in puffs[:4]: fx.circ('B',(x+dx*cs-1,cy+dy*cs-2),r*cs*0.6,N4)
    fx.ell('B',(x,cy+7*cs),24*cs,3*cs,N2)
    if i in (3,): 
        fx.circ('T',(x+2,cy-1),4,N5)
    if i>=1:
        for j in range(16):
            sx=x-22+j*3+R.uniform(-1,1); ph=R.uniform(0,1)
            yy=cy+10+((ph*60+i*14)%(gy-cy-8))
            if i==1 and yy>cy+24: continue
            if i>=6 and j%2: continue
            fx.line('T',(sx,yy),(sx-1,yy+5),B5)
            fx.px('T',(sx,yy),B6)
    if i>=2:
        for j in range(6):
            sx=x-18+j*7+(i%2)*3
            fx.px('T',(sx-2,gy-1),B6); fx.px('T',(sx+2,gy-1),B6); fx.px('T',(sx,gy),B5)
        fx.ell('U',(x,gy+2),26,4,B5,w=1)
    fx.fade['B']=[0,0,0,0,0,0,0.35,0.65][i]; fx.fade['U']=[0,0,0,0,0,0.2,0.5,0.75][i]

# =============================== MAGMA ===============================
def _magma_glob(fx,p,r,u,i,seed):
    fx.blob('B',p,r,N1,seed,n=10,rough=0.22,rot=i*0.3)
    fx.circ('B',vadd(p,vmul(u,r*0.35)),r*0.7,F2)
    fx.circ('T',vadd(p,vmul(u,r*0.45)),r*0.42,F3); fx.px('T',vadd(p,vmul(u,r*0.5)),F4,2)
    R=random.Random(seed+i)
    for k in range(3):
        a=R.uniform(0,6.28); a0=vadd(p,vmul(ang(a),r*0.2)); a1=vadd(p,vmul(ang(a+0.4),r*0.85))
        fx.line('T',a0,a1,F2 if k else F3)

def magma_travel(fx,i,n,P,seed):
    if i==0:
        p=vadd(P.S,(0,2)); fx.blob('B',p,6,N1,seed,n=9,rough=0.3)
        fx.line('T',vadd(p,(-4,0)),vadd(p,(3,-3)),F2); fx.line('T',vadd(p,(0,2)),vadd(p,(4,1)),F3)
        for j in range(3): fx.circ('U',vadd(p,(-4+j*4,-9-j*2)),2.5,N2)
        return
    if i==n-1:
        p=P.E; s=P.size(1)
        fx.blob('B',p,11*s,F2,seed,n=12,rough=0.45); fx.circ('T',p,5*s,F3); fx.px('T',p,F4,2)
        for j in range(6): fx.circ('B',vadd(p,vmul(ang(D(j*60+20)),14*s)),2,F1)
        return
    t=tmid(i,n,0.06,0.94,ease_in); p=P.pos(t); u=P.dir(t); s=P.size(t)
    fx.tongue('B',p,vmul(u,-1),14*s,5*s,F1,0.15*math.sin(i))
    _magma_glob(fx,p,9*s,u,i,seed)
    for k in range(1,4):
        q=P.pos(t-0.06*k); fx.circ('B',vadd(q,(0,3+k*k*1.6)),[2.2,1.7,1.2][k-1],[F2,F1,CRIM1][k-1])
    for k in range(3):
        q=P.pos(t-0.12-0.08*k); fx.circ('U',vadd(q,(0,-4-k*3)),3+k,[N2,N1,N2][k])
    fx.fade['U']=0.25

def magma_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed); gy=y+18
    if i==0:
        fx.blob('B',(x,y-6),7,N1,seed,n=9,rough=0.25); fx.circ('B',(x,y-3),4,F2); fx.px('T',(x,y-3),F3,2); return
    if i==1:
        fx.blob('B',c,20,F1,seed,n=14,rough=0.5); fx.blob('B',c,13,F2,seed+1,n=10,rough=0.4)
        fx.circ('T',c,7,F3); fx.circ('T',c,3,F4); return
    # pool
    pr=[0,0,20,24,26,26,26,26][i]
    fx.ell('B',(x,gy),pr,pr*0.3,N1); fx.ell('B',(x,gy-1),pr-3,pr*0.3-2,F1 if i<6 else CRIM0)
    if i<6: fx.ell('T',(x,gy-1),pr-8,pr*0.3-4,F2)
    if i>=4:
        for j in range(5): fx.line('T',(x-pr+6+j*9,gy-2),(x-pr+10+j*9,gy+1),N1)
    # geyser
    if 2<=i<=4:
        h=[22,34,20][i-2]
        fx.poly('B',[(x-7,gy),(x-4,gy-h),(x+1,gy-h-4),(x+5,gy-h+1),(x+7,gy)],F2)
        fx.poly('T',[(x-3,gy-2),(x-1,gy-h+2),(x+2,gy-h),(x+3,gy-2)],F3)
        fx.px('T',(x,gy-h+3),F4,2)
    # flying droplets
    if 2<=i<=5:
        for j in range(8):
            a=D(-160+j*20); v=ang(a); d=10+(i-2)*8; g=(i-2)**2*2.5
            q=(x+v[0]*d*1.3,gy-18+v[1]*d+g)
            fx.circ('B',q,2 if i<4 else 1.5,F2 if j%2 else F3)
    # smoke
    if i>=4:
        for j in range(4):
            fx.circ('U',(x-14+j*9+math.sin(i+j)*2,gy-16-(i-4)*7-(j%2)*5),4+(i-4),[N2,N3,N1][j%3])
        fx.fade['U']=[0,0,0,0,0.1,0.3,0.55,0.8][i]
    fx.fade['B']=[0,0,0,0,0,0,0.2,0.45][i]

# =============================== DRAGOS ===============================
def dragos_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for m in range(14):
            a=D(m*40+i*30); r=11-m*0.6; fx.px('B',vadd(p,vmul(ang(a),r)),CRIM2 if m%2 else F3,2)
        fx.circ('B',p,3,CRIM1); fx.px('T',p,F4); return
    if i==n-1:
        p=P.E; s=P.size(1)
        for side in (-1,1):
            fx.crescent('B',vadd(p,(side*3,0)),(side,0),10*s,4,CRIM2,span=60)
        fx.circ('T',p,3,F4); return
    t=tmid(i,n,0.12,0.96); s=P.size(t)
    pts=[]
    for m in range(16):
        tt=t-0.022*m
        if tt<0.0: break
        nn=perp(P.dir(tt)); pts.append(vadd(P.pos(tt),vmul(nn,math.sin(m*0.7-i*1.6)*7*s*min(1,m/3))))
    if len(pts)>=2:
        for m in range(len(pts)-1):
            w=max(1,round((6-m*0.35)*s)); fx.line('B',pts[m],pts[m+1],CRIM1,w)
        fx.pline('T',pts[1:max(2,len(pts)-4)],SALM,1)
        for m in range(2,len(pts)-3,2): fx.px('T',pts[m],F3)
    p=P.pos(t); u=P.dir(t); nn=perp(u)
    head=[vadd(p,vmul(u,9*s)),vadd(p,vmul(nn,4.5*s)),vadd(p,vmul(u,-4*s),vmul(nn,3*s)),vadd(p,vmul(u,-4*s),vmul(nn,-3*s)),vadd(p,vmul(nn,-4.5*s))]
    fx.poly('B',head,CRIM2)
    for sd in (-1,1): fx.line('B',vadd(p,vmul(u,-2*s),vmul(nn,sd*3*s)),vadd(p,vmul(u,-9*s),vmul(nn,sd*7*s)),F3,1)
    fx.px('T',vadd(p,vmul(u,2*s),vmul(nn,-2*s)),F4,2)

def dragos_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    def slashes(dirv,prog,w,off):
        nn=perp(dirv)
        for k in (-1,0,1):
            a=vadd(c,vmul(nn,k*9+off),vmul(dirv,-26)); b=vadd(a,vmul(dirv,52*prog))
            mid=vlerp(a,b,0.5)
            fx.poly('B',[a,vadd(mid,vmul(nn,w)),b,vadd(mid,vmul(nn,-w*0.4))],CRIM1)
            fx.line('T',vlerp(a,b,0.12),vlerp(a,b,0.85),SALM if w>2 else CRIM2)
            if w>2: fx.line('T',vlerp(a,b,0.3),vlerp(a,b,0.65),F5)
    d1=vnorm((-1,1.15)); d2=vnorm((1,1.15))
    if i==0:
        for k in (-1,0,1): fx.star('B',vadd(c,(18+k*7,-24+k*4)),4,1.2,4,0,F3); fx.px('T',vadd(c,(18+k*7,-24+k*4)),F5)
        return
    if i==1: slashes(d1,0.55,3.5,0)
    if i==2: slashes(d1,1.0,3.5,0)
    if i==3: slashes(d1,1.0,2,0); slashes(d2,1.0,3.5,0)
    if i==4:
        slashes(d1,1.0,1,0); slashes(d2,1.0,2,0); fx.fade['B']=0.3
    if i>=3:
        for j in range(10):
            a=D(j*36+R.uniform(-10,10)); d=8+(i-3)*8+j%3*3
            q=vadd(c,vmul(ang(a),d)); fx.poly('B',[vadd(q,vmul(ang(a),3)),vadd(q,vmul(perp(ang(a)),1.5)),vadd(q,vmul(ang(a),-3)),vadd(q,vmul(perp(ang(a)),-1.5))],[CRIM2,F3,CRIM1][j%3])
        if i>=5: fx.fade['B']=[0,0,0,0,0,0.3,0.6][i] if i<7 else 0.8

# =============================== BIRD ===============================
def _feather(fx,k,c,u,L,w):
    fx.lens(k,c,u,L,w,CRM2)
    n=perp(u); fx.lens(k,vadd(c,vmul(u,L*0.22)),u,L*0.5,w*0.75,B5)
    fx.line('T',vadd(c,vmul(u,-L/2-1)),vadd(c,vmul(u,L*0.35)),E2)
    fx.px('T',vadd(c,vmul(u,-L*0.25),vmul(n,w*0.5)),E4)

def bird_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for k in range(3): _feather(fx,'B',vadd(p,vmul(ang(D(k*120+i*30)),8)),ang(D(k*120+120)),9,2.5)
        return
    if i==n-1:
        p=P.E; s=P.size(1)
        for k in range(5): a=D(-150+k*30+180*(P.dirx<0)); _feather(fx,'B',vadd(p,vmul(ang(a),9*s)),ang(a),10*s,2.6*s)
        return
    t=tmid(i,n,0.12,0.96); p=P.pos(t); u=P.dir(t); nn=perp(u); s=P.size(t)
    for j,(back,side) in enumerate(((0,0),(10,8),(10,-8),(19,15),(19,-15))):
        if j>=3 and i<2: continue
        q=vadd(p,vmul(u,-back*s),vmul(nn,side*s))
        _feather(fx,'B',q,vrot(u,D(math.sin(i+j)*8)),(13 if j==0 else 10)*s,(3.2 if j==0 else 2.6)*s)
    for o in (-4,4):
        a=vadd(p,vmul(u,-8*s),vmul(nn,o)); fx.line('U',a,vadd(a,vmul(u,-20*s)),N5)

def bird_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    if i==0:
        for k in (-1,0,1): fx.line('B',(x-20+k*6,y-30),(x-10+k*6,y-16),CRM2,1)
        _feather(fx,'B',(x-14,y-24),vnorm((1,1.3)),12,3); return
    if i==1:
        for k in (-1,0,1):
            fx.arc('B',(x+k*8+10,y-6),14,20,110,200,CRM2,3); fx.arc('T',(x+k*8+10,y-6),14,20,120,190,F5,1)
        fx.star('B',c,9,3,4,0,F4); fx.px('T',c,F5,2); return
    k=i-2; R=random.Random(seed)
    for j in range(11):
        a=D(j*33+R.uniform(-8,8)); v=ang(a); d=[10,20,26,29,31][min(k,4)]+(j%3)*3
        g=max(0,k-1)*(4+k*2)
        q=(x+v[0]*d,y+v[1]*d*0.8+g)
        rot=a+k*D(40)*((-1)**j) if k<2 else D(90+math.sin(k*1.7+j)*45)
        _feather(fx,'B',q,ang(rot),9,2.4)
    if k==0: fx.ell('B',c,10,8,F5,w=1)
    fx.fade['B']=[0,0,0,0,0.15,0.4,0.65][i] if i<7 else 0.8

# =============================== SPIRIT ===============================
def _wisp(fx,p,u,sz,i,core=True):
    back=vmul(u,-1)
    fx.tongue('B',vadd(p,vmul(u,2*sz)),back,16*sz,5*sz,T1,0.3*math.sin(i*1.3))
    fx.circ('B',vadd(p,vmul(u,2*sz)),5*sz,T1)
    fx.tongue('B',vadd(p,vmul(u,2*sz)),back,10*sz,3.5*sz,T2,0.4*math.sin(i*1.3+1))
    fx.circ('T',vadd(p,vmul(u,2.5*sz)),3*sz,B6)
    if core: fx.px('T',vadd(p,vmul(u,3*sz)),F5,2 if sz>0.7 else 1)

def spirit_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S; _wisp(fx,p,(0,-1),0.6,i)
        for k in range(4): fx.px('T',vadd(p,vmul(ang(D(k*90+30)),9)),T2)
        return
    if i==n-1:
        p=P.E; s=P.size(1)
        for k in range(4): _wisp(fx,vadd(p,vmul(ang(D(k*90-45)),6*s)),ang(D(k*90-45)),0.5*s,i)
        return
    t=tmid(i,n); p=P.pos(t); u=P.dir(t); nn=perp(u); s=P.size(t)
    _wisp(fx,p,u,1.0*s,i)
    for k in range(2):
        ph=i*1.4+k*math.pi; q=vadd(p,vmul(nn,math.cos(ph)*12*s),vmul(u,math.sin(ph)*5*s-4))
        _wisp(fx,q,u,0.45*s,i+k,core=False)
    for m in range(1,9):
        tt=t-0.03*m; q=vadd(P.pos(tt),vmul(nn,math.sin(m*1.1+i)*5))
        if m%2: fx.px('T',q,T2 if m<5 else T1)

def spirit_impact(fx,i,n,c,seed):
    x,y=c
    if i==0: _wisp(fx,(x,y-10),(0,1),0.8,i); return
    if i==1:
        fx.tongue('B',(x,y+18),(0,-1),44,13,T1,0.08); fx.tongue('B',(x,y+18),(0,-1),32,8,T2,-0.1)
        fx.tongue('T',(x,y+16),(0,-1),18,4,B6,0.05); fx.px('T',(x,y+8),F5,2); return
    if i==2:
        fx.tongue('B',(x,y+18),(0,-1),34,10,T1,-0.1); fx.tongue('B',(x,y+18),(0,-1),24,6,T2,0.1); fx.fade['B']=0.4
    k=i-2
    for j in range(3):
        a=j*2*math.pi/3+k*0.9; r=22-k*1.5
        q=(x+math.cos(a)*r,y+12-k*10+math.sin(a)*r*0.35)
        if q[1]<6: continue
        _wisp(fx,q,vnorm((-math.sin(a),-0.6)),0.6,i+j)
        for m in range(1,4):
            a2=a-m*0.35; q2=(x+math.cos(a2)*r,y+12-k*10+m*3+math.sin(a2)*r*0.35)
            fx.px('T',q2,T2 if m<3 else T1)
    if i>=5: fx.fade['B']=[0,0,0,0,0,0.25,0.5,0.75][i]

# =============================== GHOST ===============================
def _ghost(fx,p,dirx,sz,i):
    w=9*sz; h=8*sz
    hem=[]
    for m in range(7):
        xx=p[0]+dirx*(w-m*2.6*sz*1.4); yy=p[1]+h*0.4+m*0.6*sz+(2*sz if (m+i)%2 else 0)
        hem.append((xx,yy))
    tail=(p[0]-dirx*(w+10*sz),p[1]+h*0.9+math.sin(i*1.5)*3*sz)
    body=[(p[0]-dirx*w,p[1]),(p[0]-dirx*w*0.7,p[1]-h*0.8),(p[0],p[1]-h*1.05),(p[0]+dirx*w*0.7,p[1]-h*0.8),(p[0]+dirx*w,p[1]),(p[0]+dirx*w,p[1]+h*0.4)]+hem+[tail]
    fx.poly('B',body,N5)
    fx.poly('B',[(p[0]-dirx*w*0.6,p[1]+h*0.2),(p[0]+dirx*w*0.7,p[1]+h*0.3),tail],N4)
    fx.px('T',(p[0]-dirx*2*sz,p[1]-h*0.5),F5,2)
    for ex in (1.5,5.5):
        fx.px('T',(p[0]+dirx*ex*sz-1,p[1]-h*0.2),V1,2)
    fx.circ('T',(p[0]+dirx*3.5*sz,p[1]+h*0.2),1.2*sz,V1)

def ghost_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for k in range(5): fx.circ('U',vadd(p,(-8+k*4,-k%2*3)),4,N4)
        fx.fade['U']=0.5; return
    if i==n-1:
        p=P.E; _ghost(fx,p,P.dirx,0.9*P.size(1),i); fx.fade['B']=0.6; fx.fade['T']=0.5
        for k in range(4): fx.px('U',vadd(p,(-10+k*7,8)),V4)
        return
    t=tmid(i,n); p=P.pos(t); s=P.size(t)
    for k,lag in enumerate((0.16,0.08)):
        q=P.pos(t-lag)
        if t-lag>0: fx.circ('U',q,7*s,V4 if k else V3); fx.circ('U',vadd(q,(-P.dirx*6*s,4)),4*s,V4 if k else V3)
    fx.fade['U']=0.62
    _ghost(fx,p,P.dirx,1.0*s,i)
    if i%3==2: fx.fade['B']=0.45; fx.fade['T']=0.3

def ghost_impact(fx,i,n,c,seed):
    x,y=c
    if i==0:
        for k in range(6): fx.circ('U',(x-15+k*6,y+6-(k%2)*4),6,N4)
        fx.fade['U']=0.55; return
    sz=[0,0.7,1.15,1.25,1.1,0.9,0.7,0.5][i]
    if i<=5:
        fy=y-6; w=20*sz; h=18*sz
        fx.poly('B',[(x-w,fy+h*0.4),(x-w*0.8,fy-h*0.5),(x,fy-h),(x+w*0.8,fy-h*0.5),(x+w,fy+h*0.4),(x+w*0.6,fy+h*0.9),(x+w*0.2,fy+h*0.6),(x-w*0.2,fy+h*1.0),(x-w*0.6,fy+h*0.7)],N5)
        for ex in (-1,1): fx.ell('T',(x+ex*w*0.38,fy-h*0.1),3*sz,4*sz,V1)
        mo=[0,1,3,4,3,2][i]
        fx.ell('T',(x,fy+h*0.38),3*sz+mo*0.6,2*sz+mo,V1)
        fx.fade['B']=[0,0.5,0.1,0,0.25,0.5][i]; fx.fade['T']=[0,0.4,0,0,0.2,0.45][i]
    if i>=2:
        for m in range(3):
            r=10+(i-2)*8+m*7
            if r>44: continue
            pts=[(x+math.cos(D(a))*r*(1+0.06*math.sin(a/20+m)),y-6+math.sin(D(a))*r*0.75) for a in range(0,361,24)]
            fx.pline('U',pts,[V4,N4,V5][m],1)
        fx.fade['U']=[0,0,0,0.1,0.25,0.45,0.6,0.8][i]
    if i>=6:
        # last wisps of the spook curling upward and away
        for j in range(4):
            q=(x-12+j*8+math.sin(i+j)*2,y-14-(i-6)*10-(j%2)*6)
            fx.arc('T',q,3,3,180,360 if j%2 else 300,N5 if i==6 else N4,1); fx.px('T',vadd(q,(0,3)),V4)

# =============================== DEMON ===============================
def _spikeorb(fx,p,r,rot,sz):
    for j in range(8):
        a=rot+j*math.pi/4; v=ang(a); nn=perp(v)
        L=r+(5 if j%2==0 else 3)*sz
        fx.poly('B',[vadd(p,vmul(nn,2.2*sz)),vadd(p,vmul(v,L)),vadd(p,vmul(nn,-2.2*sz))],CHAR)
    fx.circ('B',p,r,CRIM1); fx.circ('T',vadd(p,(-1,-1)),r*0.6,CRIM2); fx.circ('T',vadd(p,(-2,-2)),r*0.25,SALM)

def demon_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for j in range(6):
            a=D(j*60+15); q=vadd(p,vmul(ang(a),12)); fx.poly('B',[vadd(q,vmul(perp(ang(a)),2)),vlerp(q,p,0.45),vadd(q,vmul(perp(ang(a)),-2))],CHAR)
        fx.circ('B',p,3,CRIM1); fx.px('T',p,SALM); return
    if i==n-1:
        p=P.E; s=P.size(1); fx.star('B',p,13*s,4,6,D(i*20),CRIM1); fx.circ('T',p,4,CRIM2); fx.px('T',p,SALM,2)
        for j in range(5): fx.circ('U',vadd(p,(-8+j*4,-6-j%2*3)),3,CHAR)
        return
    t=tmid(i,n); p=P.pos(t); s=P.size(t); u=P.dir(t)
    for k in range(1,5):
        q=vadd(P.pos(t-0.05*k),(0,-k)); fx.circ('U',q,(4.5-k*0.7)*s,[N0,CHAR,N0,CHAR][k-1])
    fx.fade['U']=0.2
    _spikeorb(fx,p,6*s,i*D(30),s)
    for k in range(4):
        q=vadd(P.pos(t-0.06-0.05*k),(math.sin(k*3+i)*5,math.cos(k*2+i)*4)); fx.px('T',q,[CRIM2,CRIM1,F2,CRIM0][k],2 if k<2 else 1)

def demon_impact(fx,i,n,c,seed):
    x,y=c; R=random.Random(seed)
    gap=[30,26,16,6,3,0,0,0][i]
    if i<=4:
        for side in (-1,1):
            jy=y+side*gap
            w=26
            band=[(x-w,jy),(x-w*0.6,jy+side*4),(x,jy+side*6),(x+w*0.6,jy+side*4),(x+w,jy),(x+w,jy+side*3),(x+w*0.6,jy+side*8),(x,jy+side*10),(x-w*0.6,jy+side*8),(x-w,jy+side*3)]
            fx.poly('B',band,CRIM0)
            for f in range(6):
                fx_=x-w+5+f*(2*w-10)/5; base_y=jy+side*(4-abs(f-2.5)*0.6)
                L=(7 if f in (1,4) else 5)
                fx.poly('B',[(fx_-2.5,base_y),(fx_,base_y-side*L),(fx_+2.5,base_y)],CRM2)
                fx.px('T',(fx_-1,base_y-side*2),F5)
        fx.fade['B']=[0.3,0,0,0,0.3][i]
    if i==3:
        fx.star('T',c,20,6,8,D(10),CRIM2); fx.star('T',c,12,4,8,D(32),SALM); fx.circ('T',c,3,F5)
    if i>=4:
        k=i-4
        for j in range(9):
            a=D(j*40+R.uniform(-8,8)); d=10+k*8+j%3*3; q=vadd(c,vmul(ang(a),d))
            if k<3: fx.tongue('T',q,ang(a),5-k,1.4,[CRIM2,CRIM1,F2][j%3])
        for j in range(5):
            fx.circ('U',(x-16+j*8,y-4-k*6-(j%2)*4),4+k,[CHAR,N0][j%2])
        fx.fade['U']=[0.1,0.3,0.55,0.75][k]; fx.fade['T']=[0,0.2,0.5,0.7][k]

# =============================== ANGELIC ===============================
def _halo(fx,p,rx,ry,k='B'):
    fx.ell(k,p,rx,ry,F4,w=2); fx.arc('T',p,rx,ry,190,300,F5,1)

def angelic_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S; _halo(fx,p,6,2); 
        for k in range(4): fx.plus('T',vadd(p,vmul(ang(D(k*90+45)),10)),CRM,1,F5)
        return
    if i==n-1:
        p=P.E; s=P.size(1); _halo(fx,p,12*s,4*s); fx.star('T',p,10,2,4,0,F5)
        return
    t=tmid(i,n); p=P.pos(t); s=P.size(t)
    ry=max(2,abs(math.cos(i*0.9))*9*s); _halo(fx,p,9*s,ry)
    fx.circ('T',p,1.5,F5)
    u=P.dir(t)
    for k in range(4):
        tt=t-0.07*(k+1); q=vadd(P.pos(tt),(math.sin(k*2+i)*6,4+k*3))
        _feather_white(fx,q,ang(D(80+math.sin(i+k)*40)),7,2)
    for k in range(4):
        q=vadd(P.pos(t-0.04*k-0.02),vmul(perp(u),(-1)**k*7)); fx.px('T',q,CRM)

def _feather_white(fx,c,u,L,w,k='B'):
    fx.lens(k,c,u,L,w,F5); fx.lens(k,vadd(c,vmul(u,L*0.2)),u,L*0.45,w*0.6,B6)
    fx.line('T',vadd(c,vmul(u,-L/2)),vadd(c,vmul(u,L*0.2)),CRM)

def angelic_impact(fx,i,n,c,seed):
    x,y=c
    if i==0:
        for k in range(5): fx.plus('T',(x-16+k*8,y-30+(k%2)*6),CRM,1,F5)
        _halo(fx,(x,y-30),10,3); return
    openf=[0,0.45,1.0,0.85,0.7,0,0,0][i]
    if openf:
        for side in (-1,1):
            for f in range(5):
                a=D(-90+side*(25+f*22*openf)) if side>0 else D(-90-(25+f*22*openf))
                L=(30-f*3)*(0.6+0.4*openf)
                base=(x+side*4,y-2)
                tip=vadd(base,vmul(ang(a),L))
                _feather_white(fx,vlerp(base,tip,0.55),ang(a),L*0.9,4.2-f*0.3)
        _halo(fx,(x,y-28),11,3)
        fx.fade['B']=[0,0,0,0,0.35][i] if i<5 else 0
    if i==3:
        fx.star('T',c,16,3,4,0,F5); fx.circ('T',c,4,F4)
    if i>=4:
        k=i-4
        for j in range(10):
            a=D(-90+(j-4.5)*20); d=24+k*2
            q=(x+math.cos(a)*d*1.2+math.sin(k+j)*3,y-2+math.sin(a)*d*0.7+k*9+j%3*2)
            _feather_white(fx,q,ang(D(90+35*math.sin(k*1.8+j))),8,2.2)
        fx.fade['B']=[0,0,0,0,0.1,0.3,0.55,0.75][i]

# =============================== GOD ===============================
def _sun(fx,p,r,rot,sz):
    for j in range(12):
        a=rot+j*math.pi/6; v=ang(a); nn=perp(v)
        L=r+(6 if j%2 else 4)*sz
        fx.poly('B',[vadd(p,vmul(v,r*0.8),vmul(nn,2*sz)),vadd(p,vmul(v,L)),vadd(p,vmul(v,r*0.8),vmul(nn,-2*sz))],F3 if j%2 else F4)
    fx.circ('B',p,r,F4); fx.circ('T',p,r*0.65,CRM); fx.circ('T',p,r*0.3,F5)

def god_travel(fx,i,n,P,seed):
    if i==0:
        p=P.S
        for j in range(8):
            a=D(j*45); fx.line('B',vadd(p,vmul(ang(a),16)),vadd(p,vmul(ang(a),8)),F4)
        _sun(fx,p,3,0,0.6); return
    if i==n-1:
        p=P.E; s=P.size(1); _sun(fx,p,9*s,D(i*15),1.3*s); fx.ell('T',p,18*s,18*s,F4,w=1); return
    t=tmid(i,n); p=P.pos(t); s=P.size(t); u=P.dir(t); nn=perp(u)
    for k in range(1,4):
        q=P.pos(t-0.05*k); fx.circ('U',q,(7-k*1.5)*s,[F3,FGOLD,F2][k-1])
    fx.fade['U']=0.3
    _sun(fx,p,7.5*s,i*D(15),s)
    for k in range(3):
        a=i*0.9+k*2.094; q=vadd(p,vmul(ang(a),15*s)); fx.circ('T',q,1.6,F5); fx.px('T',vadd(q,vmul(ang(a+1.57),-3)),CRM)

def god_impact(fx,i,n,c,seed):
    # all heights are relative to the impact centre (never to the canvas top), so a taller canvas shows
    # the whole column: it narrows to a point at top=y-74 instead of being sliced flat by the canvas edge.
    x,y=c; gy=y+22; top=y-74
    if i==0:
        fx.line('T',(x,top+5),(x,gy),CRM); fx.px('T',(x,top+1),F5); fx.ell('T',(x,gy),8,2,F4,w=1); return
    W=[0,8,12,9,5,2,0,0][i]
    if W:
        fx.poly('B',[(x,top),(x+W+2,gy),(x-W-2,gy)],F4)
        if W>3: fx.poly('T',[(x,y-54),(x+W//2+1,gy),(x-W//2-1,gy)],CRM)
        fx.line('T',(x,top+4),(x,gy),F5,max(1,W//4))
        for j in range(4): fx.px('T',(x+(-1)**j*(j%3),top-4+j*2-(i%2)),F5)
        if i==4: fx.fade['B']=0.3
    if i>=1:
        k=i-1
        for m,rr in enumerate((12+k*6,6+k*5)):
            if rr<46: fx.ell('U' if m else 'B',(x,gy),rr,rr*0.28,F4 if m==0 else F3,w=2 if k<3 else 1)
    if 2<=i<=5:
        for j in range(8):
            sx=x-20+j*6; sy=gy-6-((i-2)*9+j*5)%38
            fx.plus('T',(sx,sy),F4,1,F5)
    if i>=4:
        _sun(fx,(x,y-30),[5,6,5,4][i-4],D(i*15),0.8)
        fx.fade['B']=max(fx.fade['B'],[0,0,0,0,0.3,0.5,0.65,0.8][i]); fx.fade['U']=[0,0,0,0,0.2,0.45,0.65,0.85][i]

# =============================== DEVIL ===============================
def devil_travel(fx,i,n,P,seed):
    R=random.Random(seed*31+i)
    if i==0:
        p=P.S
        for k in (-1,0,1): fx.line('B',p,vadd(p,(k*6,-9+abs(k)*2)),CRIM2,1)
        fx.circ('B',p,2.5,SOOT); fx.px('T',p,SALM); return
    if i==n-1:
        p=P.E; s=P.size(1)
        for k in range(6):
            a=D(k*60+R.uniform(-15,15)); q1=vadd(p,vmul(ang(a),6)); q2=vadd(p,vmul(ang(a+0.3),13*s))
            fx.pline('B',[p,q1,q2],CRIM2,2)
        fx.circ('T',p,3,SALM); return
    t=tmid(i,n,0.15,0.98); p=P.pos(t); u=P.dir(t); nn=perp(u); s=P.size(t)
    t0=max(0,t-0.36); pts=[]
    for m in range(9):
        tt=t0+(t-t0)*m/8; q=P.pos(tt)
        if 0<m<8: q=vadd(q,vmul(nn,R.uniform(-6,6)))
        pts.append(q)
    fx.pline('B',pts,CRIM0,4); fx.pline('B',pts,CRIM2,2); fx.pline('T',pts[2:],SALM,1)
    # trident head
    for k in (-1,0,1):
        a=vadd(p,vmul(nn,k*4*s)); b=vadd(p,vmul(u,(8 if k==0 else 6)*s),vmul(nn,k*6*s))
        fx.line('B',p,a,CRIM2,2); fx.line('B',a,b,CRIM2,2); fx.px('T',b,SALM)
    fx.line('B',vadd(p,vmul(nn,-5*s)),vadd(p,vmul(nn,5*s)),CRIM1,2)

def devil_impact(fx,i,n,c,seed):
    x,y=c; gy=y+24; R=random.Random(seed)
    cr=[10,18,22,24,24,22,18,12][i]
    fx.ell('U',(x,gy),cr,cr*0.28,SOOT)
    for j in range(5):
        a=D(j*72+10); fx.line('T',(x,gy),(x+math.cos(a)*cr*0.9,gy+math.sin(a)*cr*0.25),CRIM2 if i<6 else CRIM0)
    H=[0,24,40,44,32,16,0,0][i]
    if H:
        for j,(bx,hf) in enumerate(((-14,0.6),(-6,0.9),(3,1.0),(12,0.7),(-1,0.5))):
            b=(x+bx,gy-1); L=H*hf; lean=0.2*math.sin(i*1.9+j*1.7)
            fx.tongue('B',b,(0,-1),L,6,CHAR,lean)
            fx.tongue('B',vadd(b,(0,-1)),(0,-1),L*0.78,4,CRIM0,lean*1.1)
            fx.tongue('T',vadd(b,(0,-2)),(0,-1),L*0.5,2.2,CRIM2,lean)
        fx.ell('T',(x,gy-3),10,3,SALM if i<4 else CRIM2)
    if i>=2:
        for j in range(8):
            q=(x-20+j*5.5+R.uniform(-2,2),gy-8-((i-2)*8+j*7)%46)
            fx.px('T',q,[CRIM2,SALM,F2][j%3],1+(j%3==0))
    if i>=4:
        for j in range(4): fx.circ('U',(x-12+j*8,gy-26-(i-4)*7-j%2*4),4+(i-4),[N0,CHAR][j%2])
        fx.fade['U']=[0,0,0,0,0.2,0.4,0.6,0.8][i]
    fx.fade['B']=[0,0,0,0,0.1,0.35,0,0][i]

# =============================== REGISTRY ===============================
# name: (travel_frames, impact_frames, travel_fps, impact_fps, arc_px, wobble_px, outline_hex, note)
ELEMENTS={
 'fire':      (7,8,14,12,10,0,'561c0e','main type: tumbling fireball w/ flame tongue tail, embers, smoke; impact = flame burst then smoke'),
 'water':     (7,8,12,12,26,0,'1e4078','main type: lobbed squash-stretch water orb + droplet trail; impact = crown splash + ripples'),
 'earth':     (7,8,10,10,44,0,'2c1a12','main type: heavy tumbling boulder on high arc + dust; impact = rock spikes erupt, debris, dust'),
 'wind':      (6,7,16,14,0,10,'3e9c92','main type: twin crescent air-blades on a weaving path; impact = slash X then spinning funnel'),
 'light':     (6,7,18,14,0,0,'e29d40','main type: straight fast lance with sparkle wake; impact = cross flare, starburst, ring, twinkles'),
 'dark':      (8,8,12,12,8,8,'603096','main type: ink orb with writhing tendrils; impact = tendrils implode then black shock ring'),
 'mystic':    (7,8,12,12,12,0,'603096','main type: core with 3 helix-orbiting motes + glyph; impact = rune circle, column, rising glyphs'),
 'legendary': (8,8,14,12,16,0,'9f4013','main type: spinning 8-point star with tri-colour ribbon tail; impact = prismatic rings + crown crest'),
 'grass':     (7,8,12,12,14,0,'24522e','sub type: stream of spinning leaves; impact = whipping vines, leaf burst, little blossoms'),
 'bug':       (7,8,16,14,6,6,'18382c','sub type: buzzing swarm with flicking wings; impact = swarm orbits target with stinger jabs'),
 'sea':       (7,8,12,12,6,0,'246e6c','sub type: curling wave crest surfing the path; impact = wave curls over and crashes into foam'),
 'freshwater':(7,7,12,12,10,6,'30488c','sub type: wobbling bubble stream; impact = bubbles cluster then pop one by one'),
 'swamp':     (7,8,10,10,30,0,'a6d460','sub type: lobbed sludge glob with drips; impact = splat, goo runs down, toxic bubbles'),
 'rain':      (7,8,16,12,4,0,'1e4078','sub type: volley of rain needles; impact = cloud forms above target and pours'),
 'magma':     (7,8,10,10,34,0,'191210','sub type: crusted lava glob, drips, smoke; impact = splash, lava pool, geyser, fumes'),
 'dragos':    (8,7,14,14,10,0,'561c0e','sub type: serpentine crimson dragon-ribbon with horned head; impact = triple claw slashes in an X + scale shards'),
 'bird':      (6,7,16,12,8,0,'462c22','sub type: V-formation feather darts; impact = talon rakes then feather explosion drifting down'),
 'spirit':    (7,8,12,12,12,6,'246e6c','sub type: cyan soul-wisp with 2 orbiting wisps; impact = spirit flare then wisps spiral upward'),
 'ghost':     (8,8,10,10,10,8,'5e5866','sub type: phasing phantom with after-images; impact = looming face screams, warped rings'),
 'demon':     (7,8,14,12,6,0,'191210','sub type: spiked crimson orb with soot trail; impact = fanged jaws snap shut + crimson burst'),
 'angelic':   (7,8,12,12,14,0,'7ac2e8','sub type: spinning golden halo shedding feathers; impact = wings of light unfold then shed feathers'),
 'god':       (8,8,12,12,10,0,'9f4013','sub type: radiant sun-disc with orbiting motes; impact = divine column from above + ground shockwave'),
 'devil':     (6,8,16,12,0,0,'191210','sub type: forked crimson hell-bolt with trident head; impact = cracked ground erupts in black-red hellfire'),
}
