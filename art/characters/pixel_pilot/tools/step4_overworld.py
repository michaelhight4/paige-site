import sys, os; sys.path.insert(0,'tools')
from pxlib import *
from step3_battle_anim import gif, canvas, bob
import numpy as np
from PIL import Image
os.makedirs('overworld',exist_ok=True)
def legs_shift(a,top,bot,xsel,dy=0,dx=0,darken=False):
    """move pixels in rows top..bot whose x satisfies xsel by (dx,dy); vacated -> transparent"""
    H,W=a.shape[:2]; out=a.copy(); reg=np.zeros_like(a)
    ys,xs=np.mgrid[top:bot,0:W]; sel=xsel(xs)&(a[top:bot,:,3]>0)
    out[top:bot][sel]=0
    ty=ys[sel]+dy; tx=xs[sel]+dx; ok=(ty>=0)&(ty<H)&(tx>=0)&(tx<W)
    px=a[top:bot][sel][ok].copy()
    if darken: px[:,:3]=(px[:,:3]*0.8).astype('uint8')
    # draw moved pixels under nothing (on top of vacated)
    out[ty[ok],tx[ok]]=px
    return out
def snap_pal(a):
    pal=np.load('tools/palette.npy'); m=a[...,3]>0; px=a[m][:,:3].astype(int)
    d=((px[:,None,:]-pal[None])**2).sum(-1); a=a.copy(); a[m,:3]=pal[d.argmin(1)]; return a
def walk_frames(spr,W,H,legfrac,side,facing,lift=2,stride=2,bodybob=1,sidefrac=0.13,quad=False):
    s=np.array(spr); h,w=s.shape[:2]; x0=(W-w)//2; y0=H-h-2
    base=canvas(spr,W,H,x0,y0); top=y0+int(h*(1-legfrac)); bot=H; cx=x0+w/2
    def step(which):
        a=bob(base,top,-bodybob)
        if not side:
            sel=(lambda X:X<cx) if which==0 else (lambda X:X>=cx)
            a=legs_shift(a,top,bot,sel,dy=-lift)
        elif quad:
            t2=y0+int(h*(1-sidefrac))
            headside=(lambda X:X<cx) if facing<0 else (lambda X:X>=cx)
            tail=(lambda X:X>=cx) if facing<0 else (lambda X:X<cx)
            sel=headside if which==0 else tail
            a=legs_shift(a,t2,bot,sel,dy=-lift,dx=facing)
        else:
            # profile: duplicate the leg block into a far leg (darker, behind) and near leg (front)
            t2=y0+int(h*(1-sidefrac))
            leg=a[t2:bot].copy(); a[t2:bot]=0
            far=np.roll(leg,(-stride if which==0 else stride)*facing,axis=1); far[...,:3]=(far[...,:3]*0.78).astype('uint8')
            near=np.roll(leg,(stride if which==0 else -stride)*facing,axis=1)
            def upone(L): L=np.roll(L,-1,axis=0); L[-1]=0; return L
            if which==1: near=upone(near)
            else: far=upone(far)
            for L in (far,near):
                m=L[...,3]>0; reg=a[t2:bot]; reg[m]=L[m]; a[t2:bot]=reg
        return snap_pal(a)
    stand=base; passing=bob(base,top,0)
    return stand,[step(0),passing,step(1),passing]
def export_set(prefix,views,W,H,legfrac,scales,ms,**kw):
    dirs=['down','left','right','up']; rows=[]
    for d in dirs:
        spr=views[d]; side=d in('left','right'); facing=-1 if d=='left' else 1
        stand,walk=walk_frames(spr,W,H,legfrac,side,facing,**kw)
        fr=[stand]+walk; rows.append(fr)
        os.makedirs(f'overworld/{prefix}',exist_ok=True)
        Image.fromarray(stand).save(f'overworld/{prefix}/{prefix}_{d}_stand.png')
        for i,f in enumerate(walk): Image.fromarray(f).save(f'overworld/{prefix}/{prefix}_{d}_walk{i}.png')
        for k in scales:
            gif(walk,f'overworld/{prefix}_walk_{d}_{k}x.gif',ms,k)
            for i,f in enumerate([stand]+walk): up(Image.fromarray(f),k).save(f'overworld/{prefix}/{prefix}_{d}_{"stand" if i==0 else "walk%d"%(i-1)}_{k}x.png')
    sheet=Image.new('RGBA',(W*5,H*4),(0,0,0,0))
    for r,fr in enumerate(rows):
        for c,f in enumerate(fr): sheet.paste(Image.fromarray(f),(c*W,r*H))
    sheet.save(f'overworld/{prefix}_sheet.png')
    for k in scales: up(sheet,k).save(f'overworld/{prefix}_sheet_{k}x.png')
    # combined 4-dir gif
    allw=[np.concatenate([rows[r][1+i] for r in range(4)],axis=1) for i in range(4)]
    gif(allw,f'overworld/{prefix}_walk_all_{scales[0]}x.gif',ms,scales[0])
    return rows
if __name__=='__main__':
    cal={d:Image.open(f'base/cal_chibi_{d}.png') for d in ['down','left','right','up']}
    export_set('cal_chibi',cal,64,96,0.2,[3,2],150,lift=2,stride=2,bodybob=1,sidefrac=0.12)
    cin={d:Image.open(f'base/cindrip_ow_{d}.png') for d in ['down','left','right','up']}
    export_set('cindrip_ow',cin,64,64,0.28,[3,2],130,lift=2,stride=2,bodybob=1,sidefrac=0.24,quad=True)
    r=Image.open('base/ron_chibi.png'); c,_=place(r,64,96,pad_b=2); c.save('overworld/ron_chibi_down_stand.png'); up(c,3).save('overworld/ron_chibi_down_stand_3x.png'); up(c,2).save('overworld/ron_chibi_down_stand_2x.png')
    print('ok')
