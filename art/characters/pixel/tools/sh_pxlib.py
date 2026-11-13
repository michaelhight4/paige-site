import numpy as np
from PIL import Image
from scipy import ndimage
def cutout(img, box=None, thr=228):
    im=img.convert('RGB')
    if box: im=im.crop(box)
    c=np.array(im).astype(int)
    white=c.min(2)>thr
    lab,_=ndimage.label(white)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    fg=~np.isin(lab,list(border))
    fl,n=ndimage.label(fg)
    if n:
        sizes=ndimage.sum(fg,fl,range(1,n+1)); big=int(sizes.argmax())+1
        edge=set(np.unique(np.concatenate([fl[:,0],fl[:,-1]])))
        keep=[big]+[i+1 for i,s in enumerate(sizes) if i+1!=big and s>0.003*sizes.max() and (i+1) not in edge]
        fg=np.isin(fl,keep)
    ys,xs=np.where(fg); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    return c[y0:y1,x0:x1], fg[y0:y1,x0:x1], (x0+(box[0] if box else 0), y0+(box[1] if box else 0))
def snap(img, box, target_h=None, target_w=None, ncol=24, outline=True, thr=228):
    """returns RGBA native pixel sprite (tight), scale factor, origin offset"""
    c,fg,org=cutout(img,box,thr)
    h,w=fg.shape
    s = target_h/h if target_h else target_w/w
    if target_h and target_w: s=min(target_h/h,target_w/w)
    nw,nh=max(1,round(w*s)),max(1,round(h*s))
    # box downscale of premultiplied colour
    rgb=Image.fromarray((c*fg[...,None]).astype('uint8')); a=Image.fromarray((fg*255).astype('uint8'))
    rs=np.array(rgb.resize((nw,nh),Image.BOX)).astype(float); ra=np.array(a.resize((nw,nh),Image.BOX)).astype(float)/255
    mask=ra>0.45
    col=np.where(ra[...,None]>0, rs/np.maximum(ra[...,None],1e-3),0).clip(0,255)
    if outline: col,mask=add_outline(col,mask)
    out=quantize(col,mask,ncol)
    out=clean(out,mask)
    rgba=np.dstack([out,mask*255]).astype('uint8')
    return Image.fromarray(rgba,'RGBA'), s, org
def quantize(col,mask,ncol):
    px=col[mask].astype('uint8')
    if len(px)==0: return col
    pim=Image.fromarray(px.reshape(1,-1,3))
    q=pim.quantize(colors=ncol,method=Image.Quantize.MEDIANCUT,kmeans=3,dither=Image.Dither.NONE).convert('RGB')
    out=col.copy(); out[mask]=np.array(q).reshape(-1,3); out[~mask]=0
    return out
def clean(out,mask):
    # replace isolated pixels (no 4-neighbour of same colour) with most common neighbour colour
    h,w,_=out.shape; o=out.copy()
    key=(out[...,0].astype(int)<<16)|(out[...,1].astype(int)<<8)|out[...,2].astype(int)
    for y in range(1,h-1):
        for x in range(1,w-1):
            if not mask[y,x]: continue
            k=key[y,x]; nb=[(y-1,x),(y+1,x),(y,x-1),(y,x+1)]
            if any(mask[p] and key[p]==k for p in nb): continue
            ks=[key[p] for p in nb if mask[p]]
            if len(ks)<3: continue
            vals,cnt=np.unique(ks,return_counts=True)
            if cnt.max()>=2:
                kk=vals[cnt.argmax()]; o[y,x]=[(kk>>16)&255,(kk>>8)&255,kk&255]
    # remove orphan alpha pixels
    lab,n=ndimage.label(mask)
    if n>1:
        sz=ndimage.sum(mask,lab,range(1,n+1))
        for i,s in enumerate(sz):
            if s<3: mask[lab==i+1]=False
    o[~mask]=0
    return o
def add_outline(out,mask):
    # darken edge pixels of the silhouette to a dark outline colour derived from neighbour (sel-out style)
    er=ndimage.binary_erosion(mask)
    edge=mask&~er
    o=out.copy().astype(float)
    o[edge]=o[edge]*0.35+np.array([20,12,18])*0.65
    return o.astype('uint8'),mask
def place(spr,W,H,bottom=True,pad_b=1):
    cv=Image.new('RGBA',(W,H),(0,0,0,0)); x=(W-spr.width)//2; y=H-spr.height-pad_b if bottom else (H-spr.height)//2
    cv.paste(spr,(x,y),spr); return cv,(x,y)
def up(im,k): return im.resize((im.width*k,im.height*k),Image.NEAREST)
def ncolors(im):
    a=np.array(im.convert('RGBA')); return len(np.unique(a[a[...,3]>0][:,:3],axis=0))
def find_boxes(img,n,thr=228,dil=8):
    c=np.array(img.convert('RGB')).astype(int); m=c.min(2)<=thr
    m=ndimage.binary_dilation(m,iterations=dil)
    lab,k=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,k+1))
    idx=np.argsort(sz)[::-1][:n]+1
    sl=ndimage.find_objects(lab)
    bx=[(sl[i-1][1].start,sl[i-1][0].start,sl[i-1][1].stop,sl[i-1][0].stop) for i in idx]
    return sorted(bx)

# ===================== sh_ additions (starters + humans, Phase 3) =====================
# Everything above is an unmodified copy of pixel_pilot/tools/pxlib.py.
import os
OFFICIAL='/workspace/kilumen/art/world/overworld/palette.png'
def load_palette():
    w=np.array(Image.open(OFFICIAL).convert('RGBA')).reshape(-1,4)
    return np.unique(w[w[:,3]>0][:,:3],axis=0).astype(int)
PAL=load_palette()
def remap(a,pal=PAL):
    """redmean nearest-colour remap of all opaque pixels onto the official palette"""
    a=np.array(a).copy(); m=a[...,3]>0; px=a[m][:,:3].astype(int)
    if len(px)==0: return a
    rm=(px[:,None,0]+pal[None,:,0])/2
    dr,dg,db=[(px[:,None,i]-pal[None,:,i]) for i in range(3)]
    d=(2+rm/256)*dr**2+4*dg**2+(2+(255-rm)/256)*db**2; a[m,:3]=pal[d.argmin(1)]; a[...,3]=np.where(m,255,0); a[~m,:3]=0; return a
def nearest(c,pal=PAL):
    d=((pal-np.array(c))**2).sum(1); return tuple(int(v) for v in pal[d.argmin()])
def snap_off(img,box,th=None,tw=None,ncol=24,thr=228):
    spr,s,org=snap(img,box,th,tw,ncol,thr=thr)
    return Image.fromarray(remap(np.array(spr)),'RGBA'),s,org
# ---- animation helpers (copied from pilot step3/step4, palette -> official) ----
def glow(a,level):
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
    H=a.shape[0]; out=a.copy(); upper=a[:split].copy()
    if dy>0: out[:split]=0
    tgt=out.copy(); y0=max(0,dy); y1=min(H,split+dy)
    src=upper[y0-dy:y1-dy]; region=tgt[y0:y1]; m=src[...,3]>0; region[m]=src[m]; tgt[y0:y1]=region
    return tgt
def canvas(spr,W,H,x,y):
    c=np.zeros((H,W,4),'uint8'); s=np.array(spr); h,w=s.shape[:2]; m=s[...,3]>0
    c[y:y+h,x:x+w][m]=s[m]; return c
def gif(frames,path,ms,scale):
    cols={}
    for f in frames:
        for c in map(tuple,f[f[...,3]>0][:,:3]): cols.setdefault(c,len(cols))
    assert len(cols)<255,len(cols)
    palette=[v for c in cols for v in c]+[0,0,0]*(256-len(cols)); T=255; ims=[]
    for f in frames:
        idx=np.full(f.shape[:2],T,'uint8'); m=f[...,3]>0
        idx[m]=[cols[tuple(c)] for c in f[m][:,:3]]
        p=Image.fromarray(idx,'P'); p.putpalette(palette); ims.append(p.resize((p.width*scale,p.height*scale),Image.NEAREST))
    ims[0].save(path,save_all=True,append_images=ims[1:],duration=ms,loop=0,transparency=T,disposal=2)
def save_anim(frames,outdir,name,ms,scale=2):
    os.makedirs(f'{outdir}/{name}',exist_ok=True)
    for i,f in enumerate(frames):
        Image.fromarray(f).save(f'{outdir}/{name}/{name}_f{i}.png'); up(Image.fromarray(f),scale).save(f'{outdir}/{name}/{name}_f{i}_{scale}x.png')
    H,W=frames[0].shape[:2]; sheet=Image.new('RGBA',(W*len(frames),H),(0,0,0,0))
    for i,f in enumerate(frames): sheet.paste(Image.fromarray(f),(i*W,0))
    sheet.save(f'{outdir}/{name}_sheet.png'); up(sheet,scale).save(f'{outdir}/{name}_sheet_{scale}x.png')
    gif(frames,f'{outdir}/{name}_{scale}x.gif',ms,scale)
def idle_frames(spr,W,H):
    h=spr.height; base=canvas(spr,W,H,(W-spr.width)//2,H-h-2); split=H-h-2+int(h*0.72)
    return [glow(bob(base,split,dy),g) for dy,g in ((0,0),(-1,1),(-2,2),(-1,1))]
def legs_shift(a,top,bot,xsel,dy=0,dx=0,darken=False):
    H,W=a.shape[:2]; out=a.copy()
    ys,xs=np.mgrid[top:bot,0:W]; sel=xsel(xs)&(a[top:bot,:,3]>0)
    out[top:bot][sel]=0
    ty=ys[sel]+dy; tx=xs[sel]+dx; ok=(ty>=0)&(ty<H)&(tx>=0)&(tx<W)
    px=a[top:bot][sel][ok].copy()
    if darken: px[:,:3]=(px[:,:3]*0.8).astype('uint8')
    out[ty[ok],tx[ok]]=px
    return out
def hshift(L,dx):
    """horizontal shift WITHOUT wrap-around (pilot used np.roll)"""
    o=np.zeros_like(L)
    if dx>0: o[:,dx:]=L[:,:-dx]
    elif dx<0: o[:,:dx]=L[:,-dx:]
    else: o=L.copy()
    return o
def arm_swing(a,y0,h,dl,dr,band=(0.42,0.80),frac=0.2):
    """front/back views: move the outer arm columns (left/right) by dl/dr px vertically"""
    t,b=y0+int(h*band[0]),y0+int(h*band[1])
    m=a[t:b,:,3]>0; cols=np.where(m.any(0))[0]
    if len(cols)==0: return a
    x0,x1=cols.min(),cols.max()+1; aw=max(2,round((x1-x0)*frac))
    a=legs_shift(a,t,b,lambda X:(X>=x0)&(X<x0+aw),dy=dl) if dl else a
    a=legs_shift(a,t,b,lambda X:(X>=x1-aw)&(X<x1),dy=dr) if dr else a
    return a
def walk_frames(spr,W,H,legfrac,side,facing,lift=2,stride=2,bodybob=1,sidefrac=0.13,quad=False,arms=False):
    s=np.array(spr); h,w=s.shape[:2]; x0=(W-w)//2; y0=H-h-2
    base=canvas(spr,W,H,x0,y0); top=y0+int(h*(1-legfrac)); bot=H; cx=x0+w/2
    def step(which):
        a=bob(base,top,-bodybob)
        if not side:
            sel=(lambda X:X<cx) if which==0 else (lambda X:X>=cx)
            a=legs_shift(a,top,bot,sel,dy=-lift)
            if arms:  # arm opposite the lifted leg rises 1px, same-side arm drops 1px
                a=arm_swing(a,y0-bodybob,h,1 if which==0 else -1,-1 if which==0 else 1)
        elif quad:
            t2=y0+int(h*(1-sidefrac))
            headside=(lambda X:X<cx) if facing<0 else (lambda X:X>=cx)
            tail=(lambda X:X>=cx) if facing<0 else (lambda X:X<cx)
            a=legs_shift(a,t2,bot,headside if which==0 else tail,dy=-lift,dx=facing)
        else:
            t2=y0+int(h*(1-sidefrac))
            leg=a[t2:bot].copy(); a[t2:bot]=0
            far=hshift(leg,(-stride if which==0 else stride)*facing); far[...,:3]=(far[...,:3]*0.78).astype('uint8')
            near=hshift(leg,(stride if which==0 else -stride)*facing)
            def upone(L): L=np.roll(L,-1,axis=0); L[-1]=0; return L
            if which==1: near=upone(near)
            else: far=upone(far)
            for L in (far,near):
                m=L[...,3]>0; reg=a[t2:bot]; reg[m]=L[m]; a[t2:bot]=reg
        return remap(a)
    stand=remap(base); passing=remap(bob(base,top,0))
    return stand,[step(0),passing,step(1),passing]
def export_set(outdir,prefix,views,W,H,legfrac,scales,ms,**kw):
    dirs=['down','left','right','up']; rows=[]; os.makedirs(f'{outdir}/{prefix}',exist_ok=True)
    for d in dirs:
        side=d in('left','right'); facing=-1 if d=='left' else 1
        stand,walk=walk_frames(views[d],W,H,legfrac,side,facing,**kw)
        rows.append([stand]+walk)
        Image.fromarray(stand).save(f'{outdir}/{prefix}/{prefix}_{d}_stand.png')
        for i,f in enumerate(walk): Image.fromarray(f).save(f'{outdir}/{prefix}/{prefix}_{d}_walk{i}.png')
        for k in scales:
            gif(walk,f'{outdir}/{prefix}_walk_{d}_{k}x.gif',ms,k)
            for i,f in enumerate([stand]+walk): up(Image.fromarray(f),k).save(f'{outdir}/{prefix}/{prefix}_{d}_{"stand" if i==0 else "walk%d"%(i-1)}_{k}x.png')
    sheet=Image.new('RGBA',(W*5,H*4),(0,0,0,0))
    for r,fr in enumerate(rows):
        for c,f in enumerate(fr): sheet.paste(Image.fromarray(f),(c*W,r*H))
    sheet.save(f'{outdir}/{prefix}_sheet.png')
    for k in scales: up(sheet,k).save(f'{outdir}/{prefix}_sheet_{k}x.png')
    allw=[np.concatenate([rows[r][1+i] for r in range(4)],axis=1) for i in range(4)]
    for k in scales: gif(allw,f'{outdir}/{prefix}_walk_all_{k}x.gif',ms,k)
    return rows
