import sys, json, os, random; sys.path.insert(0,'tools')
from pxlib import *
import numpy as np
from PIL import Image, ImageDraw
pal=np.load('tools/palette.npy'); meta=json.load(open('base/meta.json'))
F={'white':(255,255,255),'pale':(255,250,215),'yel':(255,220,95),'org':(255,160,45),'red':(232,88,24),'dred':(150,42,22),'vpale':(244,226,255),'vio':(196,140,255),'vdk':(142,72,224)}
os.makedirs('battle',exist_ok=True); os.makedirs('anim',exist_ok=True)
def nearest(c):
    d=((pal-np.array(c))**2).sum(1); return tuple(int(v) for v in pal[d.argmin()])
F={k:nearest(v) for k,v in F.items()}
def glow(a,level):
    """brighten lava + violet pixels by level steps (0..2), snapped to palette"""
    if level==0: return a
    a=a.copy(); m=a[...,3]>0; r,g,b=[a[...,i].astype(int) for i in range(3)]
    lava=m&(r>170)&(r-b>90)&(g>50)
    vio=m&(b>140)&(r>90)&(g<150)&(b-g>60)
    for mask,boost in ((lava,(30,40,25)),(vio,(28,22,18))):
        ys,xs=np.where(mask)
        for y,x in zip(ys,xs):
            c=tuple(min(255,int(a[y,x,i])+boost[i]*level) for i in range(3)); a[y,x,:3]=nearest(c)
    return a
def bob(a,split,dy):
    """shift rows above split by dy (neg=up) keeping legs planted"""
    H=a.shape[0]; out=a.copy()
    upper=a[:split].copy()
    if dy>0: out[:split]=0
    tgt=out.copy()
    y0=max(0,dy); y1=min(H,split+dy)
    src=upper[y0-dy:y1-dy]
    region=tgt[y0:y1]; m=src[...,3]>0; region[m]=src[m]; tgt[y0:y1]=region
    return tgt
def canvas(spr,W,H,x,y):
    c=np.zeros((H,W,4),'uint8'); s=np.array(spr); h,w=s.shape[:2]; m=s[...,3]>0
    c[y:y+h,x:x+w][m]=s[m]; return c
def fireball(d,cx,cy,r):
    for rr,col in ((r,F['dred']),(r*0.8,F['red']),(r*0.6,F['org']),(r*0.4,F['yel']),(r*0.2,F['pale'])):
        rr=max(0.6,rr); d.ellipse([round(cx-rr),round(cy-rr),round(cx+rr),round(cy+rr)],fill=col+(255,))
def embers(d,pts):
    for x,y,c,s in pts: d.rectangle([x,y,x+s-1,y+s-1],fill=F[c]+(255,))
def burst(d,cx,cy,r,ring=False):
    import math
    if not ring:
        for k in range(8):
            t=k*math.pi/4; L=r*(1.0 if k%2==0 else 0.6)
            d.line([cx,cy,cx+L*math.cos(t),cy+L*math.sin(t)],fill=F['yel']+(255,),width=2 if r>8 else 1)
        fireball(d,cx,cy,r*0.45); d.ellipse([cx-r*0.2,cy-r*0.2,cx+r*0.2,cy+r*0.2],fill=F['white']+(255,))
    else:
        for k in range(16):
            t=k*math.pi/8; x=cx+r*math.cos(t); y=cy+r*math.sin(t)*0.8
            d.rectangle([round(x),round(y),round(x)+1,round(y)],fill=(F['org'] if k%2 else F['red'])+(255,))
def save_anim(frames,name,ms,scale=2):
    os.makedirs('anim/'+name,exist_ok=True)
    for i,f in enumerate(frames):
        Image.fromarray(f).save(f'anim/{name}/{name}_f{i}.png'); up(Image.fromarray(f),scale).save(f'anim/{name}/{name}_f{i}_{scale}x.png')
    H,W=frames[0].shape[:2]; sheet=Image.new('RGBA',(W*len(frames),H),(0,0,0,0))
    for i,f in enumerate(frames): sheet.paste(Image.fromarray(f),(i*W,0))
    sheet.save(f'anim/{name}_sheet.png'); up(sheet,scale).save(f'anim/{name}_sheet_{scale}x.png')
    gif(frames,f'anim/{name}_{scale}x.gif',ms,scale)
def gif(frames,path,ms,scale):
    cols={}
    for f in frames:
        for c in map(tuple,f[f[...,3]>0][:,:3]): cols.setdefault(c,len(cols))
    assert len(cols)<255,len(cols)
    palette=[v for c in cols for v in c]+[0,0,0]*(256-len(cols)); T=255
    ims=[]
    for f in frames:
        idx=np.full(f.shape[:2],T,'uint8'); m=f[...,3]>0
        idx[m]=[cols[tuple(c)] for c in f[m][:,:3]]
        p=Image.fromarray(idx,'P'); p.putpalette(palette); ims.append(p.resize((p.width*scale,p.height*scale),Image.NEAREST))
    ims[0].save(path,save_all=True,append_images=ims[1:],duration=ms,loop=0,transparency=T,disposal=2)
def nat(name,raw):
    m=meta[name]; return ((raw[0]-m['org'][0])*m['scale'],(raw[1]-m['org'][1])*m['scale'])
def attack_frames(spr,view,W,H,x0,y0,src,tgt,rs,imp,bg=None):
    h=spr.height
    b=canvas(spr,W,H,x0,y0); sp=y0+int(h*0.72)
    frames=[]
    def fr(dy,g): return glow(bob(b,sp,dy),g)
    lerp=lambda t:(src[0]+(tgt[0]-src[0])*t,src[1]+(tgt[1]-src[1])*t)
    shell=[(x0+random.randint(int(spr.width*0.3),int(spr.width*0.9)) if view=='front' else x0+random.randint(10,spr.width-10), y0+random.randint(4,30)) for _ in range(8)]
    # f0 windup squash
    frames.append(fr(2,1))
    # f1 charge + embers rising
    a=fr(-1,2); im=Image.fromarray(a); d=ImageDraw.Draw(im); embers(d,[(x,y-4,random.choice(['yel','org','red']),2) for i,(x,y) in enumerate(shell)]); frames.append(np.array(im))
    # f2 charge peak, ball at mouth
    a=fr(-2,2); im=Image.fromarray(a); d=ImageDraw.Draw(im); embers(d,[(x,y-10,random.choice(['yel','org']),2) for x,y in shell]); fireball(d,*src,5); frames.append(np.array(im))
    # f3,f4 travel
    for t,r in ((0.35,rs[0]),(0.7,rs[1])):
        a=fr(0,1); im=Image.fromarray(a); d=ImageDraw.Draw(im)
        for k in range(1,5):
            ex,ey=lerp(t-0.07*k); embers(d,[(round(ex)+random.randint(-2,2),round(ey)+random.randint(-2,2),['yel','org','red','dred'][k-1],2)])
        fireball(d,*lerp(t),r); frames.append(np.array(im))
    # f5 impact flash
    a=fr(0,1); im=Image.fromarray(a); d=ImageDraw.Draw(im); burst(d,*tgt,imp); frames.append(np.array(im))
    # f6 dissipate ring + embers
    a=fr(0,0); im=Image.fromarray(a); d=ImageDraw.Draw(im); burst(d,*tgt,imp*1.1,ring=True)
    embers(d,[(round(tgt[0]+random.randint(-imp,imp)),round(tgt[1]+random.randint(-imp,imp)),random.choice(['org','red','dred']),1) for _ in range(10)]); frames.append(np.array(im))
    # f7 settle
    a=fr(0,0); im=Image.fromarray(a); d=ImageDraw.Draw(im)
    embers(d,[(round(tgt[0]+random.randint(-imp,imp)),round(tgt[1]+random.randint(-imp//2,imp)),'dred',1) for _ in range(4)]); frames.append(np.array(im))
    return frames
def main():
    # ---------- static battle sprites ----------
    for n,W in (('cindrip_front',128),('cindrip_back',128),('emberlunx',128),('forgeharrow',160)):
        s=Image.open(f'base/{n}.png'); c,_=place(s,W,W,bottom=True,pad_b=2); c.save(f'battle/{n}_{W}.png'); up(c,2).save(f'battle/{n}_{W}_2x.png')
    random.seed(7)
    for view in ('front','back'):
        spr=Image.open(f'base/cindrip_{view}.png'); h=spr.height
        # idle on 128 canvas
        base=canvas(spr,128,128,(128-spr.width)//2,128-h-2); top=128-h-2; split=top+int(h*0.72)
        idle=[glow(bob(base,split,dy),g) for dy,g in ((0,0),(-1,1),(-2,2),(-1,1))]
        save_anim(idle,f'cindrip_{view}_idle',[180,160,200,160])
        # attack on 224x160 canvas
        W,H=224,160
        if view=='front':
            x0=W-spr.width-6; y0=H-h-4; nose=nat('cindrip_front',(240,515)); src=(x0+nose[0],y0+nose[1]); tgt=(30,H-26); rs=(6,9,12); imp=22
        else:
            x0=6; y0=H-h-4; mouth=nat('cindrip_back',(860,330)); src=(x0+mouth[0],y0+mouth[1]); tgt=(W-30,26); rs=(10,7,5); imp=13
        frames=attack_frames(spr,view,W,H,x0,y0,src,tgt,rs,imp)
        save_anim(frames,f'cindrip_{view}_attack',[140,110,120,70,70,150,110,160])
    print('ok')
if __name__=='__main__': main()
