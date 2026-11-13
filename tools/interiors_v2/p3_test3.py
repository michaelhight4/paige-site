"""AUTO-COPIED (Oct 28, 2026) from the test3 quality-test script; drawing functions only. Used by kit_p3.py."""
import sys,random; sys.path.insert(0,'.')
import draw_house as old
from draw_lib import *
from PIL import Image, ImageDraw, ImageFilter
WN=WOOD; WW=[h('d46616'),h('9f4013'),h('6a3019'),h('561c0e'),h('462c22'),h('2c1a12')]  # worn: dull darker ramp
def grain(c,x,y,w,hh,col,seed,step=5):
    r=random.Random(seed)
    for yy in range(y+2,y+hh-1,step):
        xx=x+r.randint(0,6)
        while xx<x+w-4:
            L=r.randint(5,14); c.hl(xx,yy+r.randint(0,1),min(L,x+w-xx-1),col); xx+=L+r.randint(3,8)
def booksrow(c,x,y,w,hh,seed,worn):
    r=random.Random(seed); cols=[RED,BLUE,GREEN,PURP,TEAL,[h('f8eabe'),h('ccc6c2'),h('a8a0a4'),h('827a84')]]
    xx=x
    while xx<x+w-3:
        bw=r.randint(3,6); bh=hh-r.randint(0,6); R=r.choice(cols)
        if worn and r.random()<.3: xx+=bw+1; continue
        if xx+bw>x+w: break
        if r.random()<.12 and xx+bh<x+w and not worn:  # lying book
            c.r(xx,y+hh-5,bh-2,5,R[1]); c.hl(xx,y+hh-5,bh-2,R[0]); xx+=bh; continue
        c.r(xx,y+hh-bh,bw,bh,R[1]); c.vl(xx,y+hh-bh,bh,R[0]); c.vl(xx+bw-1,y+hh-bh,bh,R[-1])
        c.hl(xx+1,y+hh-bh+3,bw-2,GOLD[0] if not worn else R[0]); c.hl(xx+1,y+hh-4,bw-2,R[2])
        xx+=bw
def bookshelf(worn):
    R=WW if worn else WN; c=Canvas(64,128,2); x,y,w,hh=4,14,56,112
    c.top(); c.r(x,y,w,8,R[1]); grain(c,x,y,w,8,R[2],1,3); c.hl(x,y+7,w,R[0])      # flat top + bright front edge
    c.front(); c.r(x,y+8,w,hh-8,R[3]); c.r(x,y+hh-6,w,6,R[4])                      # front, darkest base
    c.r(x,y+8,4,hh-14,R[2]); c.r(x+w-4,y+8,4,hh-14,R[4])                            # stiles
    for i,sy in enumerate((34,60,86)):
        top=y+sy-24 if i else y+12; top=[y+12,y+38,y+64][i]; c.r(x+4,top,w-8,22,R[5])
    c.r(x+4,y+90,w-8,14,R[5])
    r=random.Random(7 if not worn else 9)
    booksrow(c,x+5,y+14,30,20,3,worn); 
    if not worn: old.plant_small(c,x+38,y+20)
    else: c.r(x+40,y+28,8,6,CREAM[3]); c.hl(x+40,y+28,8,CREAM[2])       # chipped bowl
    booksrow(c,x+5,y+40,46,20,5,worn)
    if not worn: old.jar(c,x+7,y+75); booksrow(c,x+18,y+66,33,20,8,False)
    else: booksrow(c,x+5,y+66,26,20,8,True); c.r(x+34,y+80,12,6,h('a8a0a4'))  # stack of papers
    for sy in (y+34,y+60,y+86): c.r(x+4,sy,w-8,4,R[2]); c.hl(x+4,sy,w-8,R[1]); c.hl(x+4,sy+3,w-8,R[4])
    # drawer + knob at base
    c.r(x+6,y+92,w-12,10,R[3]); c.hl(x+6,y+92,w-12,R[4]); c.r(x+w//2-3,y+96,6,3,GOLD[1] if not worn else R[4])
    grain(c,x+6,y+93,w-12,9,R[4],2,4)
    c.top(); 
    if not worn: old.trophy(c,x+8,y-11); c.r(x+30,y-4,18,4,BLUE[2]); c.hl(x+30,y-4,18,BLUE[0])
    else:
        c.front(); c.line((x+40,y+12),(x+44,y+30),R[5]); c.p(x+20,y+108,R[5]); c.r(x+w-4,y+hh-10,4,4,R[5])  # crack, chip
    c.outline(R[5]); return c
def table(worn):
    R=WW if worn else WN; c=Canvas(128,128,2); x,y,w=6,10,116
    c.top(); c.r(x,y,w,82,R[1]); grain(c,x,y,w,82,R[2],4,6)
    for px in (x+29,x+58,x+87): c.vl(px,y,82,R[2])                                  # plank joints
    c.hl(x,y,w,R[0]); c.hl(x,y+81,w,R[0])
    if not worn:
        c.r(x+22,y,72,82,RED[1]); c.vl(x+22,y,82,RED[0]); c.vl(x+93,y,82,RED[2])     # runner
        for yy in range(y+4,y+80,8): c.hl(x+26,yy,64,RED[0]) 
        c.ell(x+38,y+26,40,26,CREAM[3]); c.ell(x+39,y+26,38,22,CREAM[1]); c.ell(x+44,y+30,28,14,CREAM[2])  # bowl
        for dx,dy,col in ((48,30,RED[0]),(56,28,GOLD[0]),(62,32,GREEN[1]),(52,35,GOLD[1])): c.ell(x+dx,y+dy,9,8,col)
        c.ell(x+8,y+56,12,9,CREAM[2]); c.ell(x+98,y+12,12,9,CREAM[2])
    else:
        c.line((x+20,y+40),(x+50,y+46),R[4]); c.line((x+50,y+46),(x+62,y+44),R[4])     # crack
        c.ell(x+70,y+30,10,6,R[2])                                                     # water ring
        c.r(x+30,y+20,22,16,h('ccc6c2')); c.r(x+31,y+21,20,2,h('fcf6e8'))              # newspaper patch mat
        c.ell(x+80,y+50,20,13,CREAM[3]); c.ell(x+82,y+51,16,9,CREAM[2]); c.ell(x+86,y+53,8,5,GOLD[2])  # lone bowl
    c.front(); c.r(x,y+82,w,10,R[3]); c.hl(x,y+82,w,R[2]); c.hl(x,y+91,w,R[4])           # apron
    for px in (x+30,x+86): c.r(px,y+84,4,6,R[4])
    for lx in (x+4,x+w-14): c.r(lx,y+92,10,24,R[3]); c.vl(lx,y+92,24,R[2]); c.r(lx,y+112,10,4,R[4])
    if worn: c.r(x+w-14,y+108,10,3,h('a8a0a4'))                                         # shim under leg
    c.outline(R[5]); return c
def chair(worn):
    R=WW if worn else WN; c=Canvas(64,64,2)
    c.front(); c.r(14,2,36,20,R[3]); c.r(14,2,36,4,R[2]); c.hl(14,2,36,R[0])          # backrest (front-facing)
    for sx in (22,30,38): c.r(sx,7,4,14,R[4]); c.vl(sx,7,14,R[2])
    c.top(); S=[CREAM[1],CREAM[2],CREAM[3]] if not worn else [h('ccaa6e')[:3]+(255,),CREAM[3],h('827a84')]
    S=[h('f8eabe'),h('ccc6c2'),h('a8a0a4')] if not worn else [h('ccc6c2'),h('a8a0a4'),h('827a84')]
    c.r(12,22,40,16,S[1])
    for yy in range(22,38,2):                                                         # woven rush seat
        for xx in range(12,52,4): c.r(xx+(yy//2%2)*2,yy,2,1,S[0])
    if worn: c.r(30,26,9,6,R[5]); c.r(31,27,7,4,S[2])                                  # torn hole
    c.hl(12,37,40,R[0]); c.front(); c.r(12,38,40,6,R[3]); c.hl(12,43,40,R[4])
    c.r(13,44,5,18,R[3]); c.vl(13,44,18,R[2]); c.r(46,44,5,18,R[4]); c.r(18,54,28,3,R[4])  # legs + stretcher
    if worn: c.r(46,58,5,4,R[5])
    c.outline(R[5]); return c
