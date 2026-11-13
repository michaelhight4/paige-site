"""AUTO-COPIED (Oct 28, 2026) from the pass-2 quality-test script; drawing functions only. Used by kit_p3.py."""
import sys,random; sys.path.insert(0,'.')
import draw_house as old
from draw_lib import *
from PIL import Image, ImageDraw, ImageFilter
WN=WOOD; WW=[h('d46616'),h('9f4013'),h('6a3019'),h('561c0e'),h('462c22'),h('2c1a12')]
STRAW=[h('fcd668'),h('eea23c'),h('e29d40'),h('9f4013')]
def boards(c,x,y,w,hh,R,seed,bw=12,vert=False,knots=1):
    """shaded boards: light edge, body, dark seam, sparse knots + short grain"""
    r=random.Random(seed); n=0
    span=w if not vert else hh
    p=0
    while p<span:
        b=min(bw+r.randint(-2,2),span-p)
        if not vert:
            c.r(x+p,y,b,hh,R[1] if n%2==0 else R[2]); c.vl(x+p,y,hh,R[0]); c.vl(x+p+b-1,y,hh,R[4])
            for _ in range(2): gx=x+p+r.randint(2,max(2,b-3)); gy=y+r.randint(0,hh-6); c.vl(gx,gy,r.randint(4,9),R[3] if n%2==0 else R[3])
            if knots and r.random()<.25 and hh>12: kx=x+p+b//2;ky=y+r.randint(3,hh-6);c.ell(kx-1,ky,4,3,R[3]);c.p(kx,ky+1,R[4])
        else:
            c.r(x,y+p,w,b,R[1] if n%2==0 else R[2]); c.hl(x,y+p,w,R[0]); c.hl(x,y+p+b-1,w,R[4])
            for _ in range(3): gy=y+p+r.randint(2,max(2,b-3)); gx=x+r.randint(0,w-10); c.hl(gx,gy,r.randint(5,12),R[3])
            if knots and r.random()<.25: kx=x+r.randint(4,w-8);ky=y+p+b//2;c.ell(kx,ky-1,4,3,R[3]);c.p(kx+1,ky,R[4])
        p+=b;n+=1
def post(c,x,y,w,hh,R): c.r(x,y,w,hh,R[3]); c.vl(x,y,hh,R[1]); c.vl(x+1,y,hh,R[2]); c.vl(x+w-1,y,hh,R[4])
def booksrow(c,x,y,w,hh,seed,worn):
    r=random.Random(seed); cols=[RED,BLUE,GREEN,PURP,TEAL,[h('f8eabe'),h('ccc6c2'),h('a8a0a4'),h('827a84')]]; xx=x
    while xx<x+w-3:
        bw=r.randint(3,6); bh=hh-r.randint(0,6); R=r.choice(cols)
        if worn and r.random()<.35: xx+=bw+1; continue
        if xx+bw>x+w: break
        if worn and r.random()<.3:  # leaning book
            c.line((xx,y+hh-1),(xx+5,y+hh-bh+2),R[1],3); xx+=bw+3; continue
        c.r(xx,y+hh-bh,bw,bh,R[1]); c.vl(xx,y+hh-bh,bh,R[0]); c.vl(xx+bw-1,y+hh-bh,bh,R[-1])
        c.hl(xx+1,y+hh-bh+3,bw-2,GOLD[0] if not worn else R[0]); c.hl(xx+1,y+hh-4,bw-2,R[2]); xx+=bw
def bookshelf(worn):
    R=WW if worn else WN; c=Canvas(64,128,2); x,y,w,hh=3,14,55,110
    c.top(); c.r(x,y,w,6,R[1]); c.hl(x,y,w,R[0]); c.hl(x,y+5,w,R[0])
    c.front(); c.r(x-1,y+6,w+2,5,R[2]); c.hl(x-1,y+6,w+2,R[0])                      # carved crown rail
    for k in range(x+3,x+w-2,6): c.r(k,y+9,3,2,R[4])
    c.r(x,y+11,w,hh-11,R[5])
    post(c,x,y+11,5,hh-11,R); post(c,x+w-5,y+11,5,hh-11,R)
    for top,ht in ((y+12,22),(y+38,22),(y+64,22)): c.r(x+5,top,w-10,ht,R[5]); c.vl(x+5,top,ht,R[4])
    booksrow(c,x+6,y+14,30,20,3,worn)
    if not worn: old.plant_small(c,x+38,y+20)
    else: c.r(x+38,y+28,9,6,CREAM[3]); c.hl(x+38,y+28,9,CREAM[2]); c.p(x+44,y+28,R[5])
    booksrow(c,x+6,y+40,43,20,5,worn)
    if not worn: old.jar(c,x+8,y+75); booksrow(c,x+19,y+66,30,20,8,False)
    else: booksrow(c,x+6,y+66,24,20,8,True); c.r(x+33,y+80,12,6,h('a8a0a4')); c.hl(x+33,y+80,12,h('ccc6c2'))
    for sy in (y+34,y+60,y+86): c.r(x+5,sy,w-10,4,R[2]); c.hl(x+5,sy,w-10,R[0]); c.hl(x+5,sy+3,w-10,R[4])
    boards(c,x+5,y+90,w-10,14,R,11,bw=15,knots=0)
    c.r(x+w//2-3,y+95,6,3,GOLD[1] if not worn else R[4]); c.p(x+w//2-2,y+95,GOLD[0] if not worn else R[3])
    c.r(x,y+hh-4,w,4,R[4]); c.hl(x,y+hh-4,w,R[3])                                    # plinth, darkest base
    if not worn: c.top(); old.trophy(c,x+8,y-11); c.r(x+30,y-4,18,4,BLUE[2]); c.hl(x+30,y-4,18,BLUE[0])
    else: c.line((x+w-5,y+20),(x+w-3,y+44),R[5]); c.r(x+w-4,y+hh-9,4,5,R[5]); c.r(x+w-12,y+6,8,5,R[5])  # split post, chips
    c.outline(R[5]); return c
def table(worn):
    R=WW if worn else WN; c=Canvas(128,128,2); x,y,w,d=5,8,114,70
    c.top(); boards(c,x,y,w,d,R,4 if not worn else 6,bw=14,vert=True)
    c.hl(x,y,w,R[0]); c.vl(x,y,d,R[0])
    if not worn:
        c.r(x+30,y,52,d,RED[1]); c.vl(x+30,y,d,RED[0]); c.vl(x+81,y,d,RED[2])        # runner
        for yy in range(y+3,y+d,6): c.hl(x+33,yy,46,RED[2])
        c.vl(x+33,y,d,PINK[0]); c.vl(x+78,y,d,PINK[0])
        # teapot
        px,py=x+44,y+22; c.ell(px,py+6,26,8,RED[3]); c.front(); c.ell(px+1,py,24,20,BLUE[2]); c.ell(px+3,py+2,12,8,BLUE[0])
        c.r(px+9,py-3,6,4,BLUE[3]); c.p(px+11,py-4,GOLD[0]); c.line((px+24,py+8),(px+30,py+3),BLUE[3],2)
        c.d.arc([px-6,py+5,px+4,py+15],90,270,fill=BLUE[3],width=2); c.hl(px+3,py+16,18,BLUE[4])
        for cx,cy in ((x+36,y+46),(x+64,y+48)):                                        # cups + saucers
            c.top(); c.ell(cx-2,cy+5,16,6,CREAM[2]); c.front(); c.r(cx,cy,12,8,CREAM[0]); c.vl(cx+11,cy,8,CREAM[3]); c.hl(cx,cy+7,12,CREAM[3])
            c.top(); c.ell(cx,cy-2,12,5,CREAM[1]); c.ell(cx+2,cy-1,8,3,WOOD[3])
    else:
        c.line((x+14,y+30),(x+44,y+36),R[5]); c.line((x+44,y+36),(x+56,y+33),R[5])
        c.ell(x+74,y+24,12,7,R[3]); c.ell(x+76,y+25,8,5,R[1])                          # water ring
        c.r(x+26,y+12,22,16,h('ccc6c2')); c.hl(x+26,y+12,22,h('fcf6e8'))
        for yy in range(y+15,y+27,3): c.hl(x+28,yy,16,h('a8a0a4'))                       # newspaper
        c.ell(x+80,y+44,20,12,CREAM[3]); c.ell(x+82,y+45,16,8,CREAM[2]); c.ell(x+86,y+47,7,4,GOLD[2])  # one bowl
    c.front(); c.r(x,y+d,w,6,R[2]); c.hl(x,y+d,w,R[0]); c.hl(x,y+d+5,w,R[3])          # thick top edge
    c.r(x+4,y+d+6,w-8,7,R[3]); c.hl(x+4,y+d+12,w-8,R[4])                                # apron rail
    for k in range(x+20,x+w-20,24): c.r(k,y+d+8,3,3,R[4])                               # pegs
    for lx in (x+4,x+w-14): post(c,lx,y+d+6,10,38,R); c.r(lx,y+d+40,10,4,R[4])        # front legs
    c.mode=2
    for lx in (x+18,x+w-26): c.r(lx,y+d+13,7,25,R[4]); c.vl(lx,y+d+13,25,R[3])         # back legs (darker, set back)
    if worn: c.r(x+w-14,y+d+41,10,3,h('a8a0a4')); c.r(x+4,y+d+20,3,6,R[5])              # shim, gouge
    c.outline(R[5]); return c
def chair(worn):
    R=WW if worn else WN; c=Canvas(64,64,2); S=STRAW if not worn else [h('e29d40'),h('d46616'),h('9f4013'),h('561c0e')]
    c.front(); post(c,12,1,5,40,R); post(c,46,1,5,40,R)                                 # back posts
    c.r(14,3,36,6,R[2]); c.hl(14,3,36,R[0]); c.hl(14,8,36,R[4])                          # shaped top rail
    c.p(16,2,R[2]); c.r(18,2,28,1,R[2]); c.hl(26,1,12,R[1])
    for sx in (21,29,37): c.r(sx,9,5,14,R[3]); c.vl(sx,9,14,R[1]); c.vl(sx+4,9,14,R[4]) # slats
    c.r(17,22,30,3,R[3]); c.hl(17,22,30,R[2])
    c.top(); c.poly([(10,26),(53,26),(55,40),(8,40)],S[1])                               # rush seat
    for yy in range(26,40):
        inset=(40-yy)//7
        for xx in range(10-2+inset+ (0), 54-inset):
            if xx<8+ (40-yy)*2//14 or xx>55-(40-yy)*2//14: continue
            k=(xx+yy)%6; j=(xx-yy)%6
            if k==0: c.p(xx,yy,S[0])
            elif j==0: c.p(xx,yy,S[2])
    c.vl(31,26,14,S[3]); c.hl(10,26,44,S[0])
    if worn: c.r(26,30,10,5,R[5]); c.r(27,31,8,3,S[3]); c.line((36,32),(40,36),S[3])   # torn rush
    c.front(); c.r(8,40,48,5,R[2]); c.hl(8,40,48,R[0]); c.hl(8,44,48,R[4])              # front rail
    post(c,9,45,5,15,R); post(c,49,45,5,15,R); c.r(14,53,35,3,R[3]); c.hl(14,53,35,R[2]) # legs, stretcher
    if worn: c.r(49,57,5,3,R[5]); c.r(14,56,6,2,h('a8a0a4'))  # cracked leg, string tie
    c.outline(R[5]); return c
