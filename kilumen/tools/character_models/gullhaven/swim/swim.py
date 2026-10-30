import sys,os,json,numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0,'/workspace/kilumen/art/characters/pixel/tools')
from sh_pxlib import remap, up, nearest
OUTL=(0x19,0x12,0x10,255); W,H=64,96; WL=66; BOB=[0,1,2,1]
FOAM=tuple(nearest((236,248,252)))+(255,); FOAMB=tuple(nearest((170,214,232)))+(255,); SPL=FOAM
def frame0(sheet,row): return np.array(sheet.crop((0,row*H,W,row*H+H)))
def colours(f):
    a=f[...,3]>0; ys,xs=np.nonzero(a); top=ys.min(); bot=ys.max()
    return top,bot
def pick(f,y,x0,x1):
    seg=f[y,x0:x1]; seg=[tuple(p[:3]) for p in seg if p[3] and int(p[0])+int(p[1])+int(p[2])>90]
    return max(set(seg),key=seg.count) if seg else (200,150,110)
def ring(d,cx,y,rx,ry,col,half):
    for ay in range(-ry,ry+1):
        if (half=='back')!=(ay<0): continue
        hw=round(rx*np.sqrt(max(0,1-ay*ay/((ry+.5)**2)))); inn=round((rx-3)*np.sqrt(max(0,1-ay*ay/((ry-.5)**2))))
        yy=y+ay
        if abs(ay)==ry or inn<=0: d.line([(cx-hw,yy),(cx+hw-1,yy)],fill=col)
        else: d.line([(cx-hw,yy),(cx-inn-1,yy)],fill=col); d.line([(cx+inn,yy),(cx+hw-1,yy)],fill=col)
def arm(d,p0,p1,sleeve,skin):
    d.line([p0,p1],fill=OUTL,width=7); d.line([p0,p1],fill=sleeve,width=4)
    x,y=p1; d.ellipse([x-3,y-3,x+3,y+3],fill=OUTL); d.ellipse([x-2,y-2,x+2,y+2],fill=skin)
def splash(d,x,y):
    for dx,dy in [(-4,-1),(-2,-3),(0,-4),(2,-3),(4,-1),(-1,-1),(1,-1)]: d.rectangle([x+dx,y+dy,x+dx,y+dy],fill=SPL)
    d.rectangle([x-5,y,x+5,y],fill=SPL)
def _mode(px):
    px=[tuple(int(v) for v in p[:3]) for p in px]; return max(set(px),key=px.count) if px else (210,160,120)
def SKIN(f,top,cut):
    reg=f[top:cut,16:48].reshape(-1,4); return _mode([p for p in reg if p[3] and int(p[0])>150 and int(p[0])>int(p[1])+15>int(p[2])+15])
def SLEEVE(f,cut):
    reg=f[cut-5:cut,8:56].reshape(-1,4); return _mode([p for p in reg if p[3] and int(p[0])+int(p[1])+int(p[2])>150])
PLAYER=False
def build(sheet,keep,player=False):
    global PLAYER; PLAYER=player
    sh=Image.open(sheet).convert('RGBA'); out=Image.new('RGBA',(W*4,H*4),(0,0,0,0))
    for r,dn in enumerate(['down','left','right','up']):
        f=frame0(sh,r); top,bot=colours(f); cut=top+int((bot-top)*keep)
        skin=SKIN(frame0(sh,0),top,cut); sleeve=SLEEVE(f,cut)
        body=Image.fromarray(f[:cut]); xs=np.nonzero(f[:cut,:,3].any(0))[0]; sl,sr=xs.min(),xs.max()
        for c in range(4):
            fr=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(fr); b=BOB[c]; wl=WL+b; cx=32
            rx=20+(1 if c%2 else 0)
            ring(d,cx,wl,rx,4,FOAMB,'back')
            shy=wl-int((cut-top)*0.15)
            fr.alpha_composite(body,(0,wl-cut)); d=ImageDraw.Draw(fr)
            xs=np.nonzero(f[:cut,:,3].any(0))[0]; sl,sr=xs.min(),xs.max()
            if PLAYER:
                for rr in [(14+2*c)%10+16, (14+2*c)%10+24]: ring(d,cx,wl,rr,3 if rr<22 else 5,FOAM,'front')
            else:
                sp=[12,15,8,11][c]; ey=shy-[3,2,4,3][c]
                if dn in('down','up'):
                    for sgn,sx in ((-1,sl+3),(1,sr-3)):
                        el=(sx+sgn*sp//2,ey); hd=(sx+sgn*sp,wl-1)
                        d.line([(sx,shy),el,hd],fill=OUTL,width=6,joint='curve'); d.line([(sx,shy),el,hd],fill=sleeve,width=3)
                        d.rectangle([hd[0]-2,hd[1]-2,hd[0]+2,hd[1]],fill=OUTL); d.rectangle([hd[0]-1,hd[1]-1,hd[0]+1,hd[1]],fill=skin)
                        if c in(1,2): splash(d,hd[0],wl)
                else:
                    sgn=-1 if dn=='left' else 1; mid=(sl+sr)//2
                    hd=(mid+sgn*[14,18,8,12][c],wl-1); el=(mid+sgn*[8,10,5,7][c],ey)
                    d.line([(mid,shy),el,hd],fill=OUTL,width=6,joint='curve'); d.line([(mid,shy),el,hd],fill=sleeve,width=3)
                    d.rectangle([hd[0]-2,hd[1]-2,hd[0]+2,hd[1]],fill=OUTL); d.rectangle([hd[0]-1,hd[1]-1,hd[0]+1,hd[1]],fill=skin)
                    if c in(1,2): splash(d,hd[0],wl)
            ring(d,cx,wl,rx,4,FOAM,'front')
            out.alpha_composite(fr,(c*W,r*H))
    a=np.array(out); a[...,3]=np.where(a[...,3]>=128,255,0); a[a[...,3]==0]=0
    return Image.fromarray(remap(a))
