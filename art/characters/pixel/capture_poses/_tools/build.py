import json, os, sys, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from caplib import *
PX='/workspace/kilumen/art/characters/pixel/'
OUT=PX+'capture_poses/'
from configs import CFG

def prep(c):
    a=load(PX+c['src'])
    ink=c.get('ink') or ink_of(a)
    b,em=erase(a,c['erase'],c.get('keep',()))
    if c.get('fill'):
        b,fm=refill(b,em,c['fill'],c.get('cx',32))
    for poly,mx in c.get('mfill',()):
        mm=poly_mask(a.shape,[poly])
        for y,x in zip(*np.where(mm)):
            if isinstance(mx,tuple): b[y,x]=a[y+mx[1],x+mx[0]]; continue
            sx=int(round(2*mx-x))
            if 0<=sx<a.shape[1]: b[y,x]=a[y,sx]
    b=reoutline(b,em,ink)
    sl=c.get('sleeve') or ramp(a,c['sleeve_box'],ink)
    sk=c.get('skin') or ramp(a,c['skin_box'],ink)
    hd=c.get('hand') or sk
    while len(sl)<3: sl=sl+[sl[-1]]
    while len(sk)<3: sk=sk+[sk[-1]]
    while len(hd)<3: hd=hd+[hd[-1]]
    return a,b,ink,sl,sk,hd

def render(c,f,a,b,ink,sl,sk,hd):
    base=b.copy()
    if f.get('lean'):
        dx,ylim=f['lean']; sh=base.copy(); sh[:ylim]=np.roll(base[:ylim],dx,axis=1); base=sh
    kw=dict(ink=ink,sleeve=sl,skin=sk,hand=hd,sleeve_len=c.get('sleeve_len',1.0),cuff=c.get('cuff'),wrist=c.get('wrist'),
            r_up=c.get('r_up',2.6),r_fore=c.get('r_fore',2.2),r_hand=c.get('r_hand',2.4))
    LL,_,_=arm_layer(a.shape,*f['L'],**kw)
    RL,_,_=arm_layer(a.shape,*f['R'],**kw)
    under=(base[...,3]>0) if f.get('under') else None
    o=over(base,LL,under); o=over(o,RL,under)
    for (x,y,col) in f.get('touch',[]): o[y,x,:3]=rgb(col if col!='ink' else ink); o[y,x,3]=255
    for (x,y) in f.get('clear',[]): o[y,x]=0
    hp=[int((f['L'][2][0]+f['R'][2][0])/2), int(round((f['L'][2][1]+f['R'][2][1])/2))]
    if 'hold' in f: hp=list(f['hold'])
    return o,hp

def build(sid):
    c=CFG[sid]; a,b,ink,sl,sk,hd=prep(c)
    frames=[];hps=[]
    for name in c['order']:
        o,hp=render(c,c['frames'][name],a,b,ink,sl,sk,hd); frames.append(o); hps.append(hp)
    return dict(a=a,b=b,ink=ink,ramps=(sl,sk,hd),frames=frames,hold=hps,names=c['order'])

if __name__=='__main__':
    from zoom import zoom
    for sid in sys.argv[1:]:
        r=build(sid); h,w=r['a'].shape[:2]; n=len(r['frames'])
        strip=np.zeros((h,w*(n+2),4),np.uint8); strip[:,:w]=r['a']; strip[:,w:2*w]=r['b']
        for i,f in enumerate(r['frames']): strip[:,(i+2)*w:(i+3)*w]=f
        im=Image.fromarray(strip)
        if os.environ.get('GRID'): zoom(im,f'/tmp/cap/grid_{sid}.png',(0,0,im.width,min(h,int(CFG[sid].get('dbg_h',h)))),int(os.environ.get('GRID')))
        S=int(CFG[sid].get('dbg_s',4)); bg=Image.new('RGBA',im.size,(120,150,120,255)); bg.alpha_composite(im)
        bg=bg.crop((0,0,im.width,min(h,int(CFG[sid].get('dbg_h',h))))); bg.resize((bg.width*S,bg.height*S),Image.NEAREST).save(f'/tmp/cap/dbg_{sid}.png')
        print(sid,'ink',r['ink'],'ramps',r['ramps'],'hold',r['hold'],'pal',[snap_check(f) for f in r['frames']])
