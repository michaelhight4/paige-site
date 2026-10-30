"""Kilumen NPC cast build. Same pipeline as pixel/tools/sh_build.py (humans):
painted/pixel concept (GenerateImage) -> cutout + BOX downscale to native -> median-cut quantize -> clean stray px
-> redmean remap to the shared 64-colour palette -> walk/idle frames built in code from one cleaned base per view.
Run from anywhere: python3 npc_build.py [villagers|trainers|all|<id> ...]"""
import sys, os, json, shutil
sys.path.insert(0,'/workspace/kilumen/art/characters/pixel/tools')
from sh_pxlib import *          # snap/remap/export_set/place/up/find_boxes (unchanged shared lib)
from sh_build import matte       # same portrait matte as Cal/Ron/Mira
from PIL import Image
import sh_pxlib as _L
_wf=_L.walk_frames
def _patch_slivers(f,stand):
    """arm-swing leaves 1-2px transparent slivers inside the silhouette; fill them from the pixel above/below
    (only where the stand frame is opaque, so real gaps between legs/arms stay open)"""
    f=f.copy(); A=f[...,3]>0; S=stand[...,3]>0; H=f.shape[0]
    for y in range(1,H-1):
        for x in range(f.shape[1]):
            if A[y,x] or not S[y,x] or not A[y-1,x]: continue
            if A[y+1,x] or (y+2<H and A[y+2,x] and not A[y+1,x] and S[y+1,x]):
                f[y,x]=f[y-1,x]; A[y,x]=True
    return f
def walk_frames(*a,**k):
    st,wk=_wf(*a,**k); return st,[_patch_slivers(w,st) for w in wk]
_L.walk_frames=walk_frames
NPC='/workspace/wt_wellspire/kilumen/shots/flashback_sprites/'; RAW=NPC+'_raw/'; BASE=NPC+'_tools/base/'
os.makedirs(BASE,exist_ok=True)
CAST=json.load(open(NPC+'_tools/cast.json'))
def boxes(src,n): return find_boxes(Image.open(RAW+src),n,dil=1)
def load(src,sat=1.0):
    im=Image.open(RAW+src).convert('RGB')
    if sat!=1.0:   # optional pre-saturation so muted concept colours (e.g. moss green) don't remap to brown
        from PIL import ImageEnhance; im=ImageEnhance.Color(im).enhance(sat)
    return im
def hueboost(im,ranges):
    """boost saturation only inside hue ranges [[h0,h1,k],...] (degrees) -- keeps skin untouched, stops muted
    greens/yellows collapsing onto browns in the 64-colour remap"""
    import colorsys
    a=np.array(im.convert('HSV')).astype(float); h=a[...,0]*360/255
    for h0,h1,k in ranges:
        m=(h>=h0)&(h<=h1)&(a[...,1]>25)&(a[...,2]>30); a[...,1]=np.where(m,np.clip(a[...,1]*k,0,255),a[...,1])
    return Image.fromarray(a.astype('uint8'),'HSV').convert('RGB')
def fillhue(im,specs):
    """solid-fill a hue band in the concept before snapping, closing small gaps (e.g. thin stripes that would
    otherwise average to skin tone at 64px). specs [[h0,h1,smin,close_px,hex],...]"""
    from scipy import ndimage
    a=np.array(im.convert('RGB')); hsv=np.array(im.convert('HSV')).astype(float); h=hsv[...,0]*360/255
    for h0,h1,smin,cl,hx in specs:
        m=(h>=h0)&(h<=h1)&(hsv[...,1]>=smin*255)&(hsv[...,2]>60)
        m=ndimage.binary_opening(m,iterations=1)
        m=ndimage.binary_closing(m,structure=np.ones((cl,cl)))&(a.min(2)<250)|m
        a[m]=[int(hx[i:i+2],16) for i in (0,2,4)]
    return Image.fromarray(a)
def mk(name,src,box,th,tw,ncol,sat=1.0,hb=None,fh=None):
    im=load(src,sat)
    if hb: im=hueboost(im,hb)
    if fh: im=fillhue(im,fh)
    spr,s,org=snap_off(im,box,th,tw,ncol)
    spr.save(BASE+name+'.png'); return spr
def swap(img,mapping):
    """palette-swap: mapping {hex:hex} both on the shared palette"""
    a=np.array(img).copy()
    for s,d in mapping.items():
        sc=[int(s[i:i+2],16) for i in (0,2,4)]; dc=[int(d[i:i+2],16) for i in (0,2,4)]
        m=(a[...,3]>0)&(a[...,0]==sc[0])&(a[...,1]==sc[1])&(a[...,2]==sc[2]); a[m,:3]=dc
    return Image.fromarray(a,'RGBA')
def portraits(src,names,outdir,pid):
    im=np.array(Image.open(RAW+src).convert('RGB')); H,Wd=im.shape[:2]; n=len(names)
    cnt=(im.min(2)<238).sum(0)
    cuts=[0]+[int(c-90+np.argmin(cnt[c-90:c+90])) for c in [Wd*k//n for k in range(1,n)]]+[Wd]
    res=[]
    for i,nm in enumerate(names):
        x0=cuts[i]+(1 if i>0 else 0); x1=cuts[i+1]
        crop=np.full((H+20,x1-x0+20,3),255,'uint8'); crop[10:10+H,10:10+x1-x0]=im[:,x0:x1]
        rgba=Image.fromarray(matte(crop)); rgba=rgba.crop(rgba.getbbox())
        k=512/rgba.height; rgba=rgba.resize((round(rgba.width*k),512),Image.LANCZOS)
        rgba.save(outdir+f'{pid}_{nm}.png'); res.append(nm)
    return res
def build(c):
    pid=c['id']; out=NPC+pid+'/'
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(out+'overworld',exist_ok=True)
    th=c.get('th',90)
    if 'base_of' in c:   # palette-swap variant of another sheet
        views={d:swap(Image.open(BASE+f"{c['base_of']}_chibi_{d}.png"),c['swap']) for d in ['down','left','right','up']}
        for d,v in views.items(): v.save(BASE+f'{pid}_chibi_{d}.png')
    else:
        src=f'{pid}_chibi.jpg'
        bx=c.get('boxes') or boxes(src,4)
        views={d:mk(f'{pid}_chibi_{d}',src,b,th,c.get('tw',62),22,c.get('sat',1.0),c.get('hueboost'),c.get('fillhue_v',{}).get(d,c.get('fillhue'))) for b,d in zip(bx,['down','left','right','up'])}
        for d in c.get('flip',[]):     # fix a concept whose prop (bag/strap) swaps sides between views
            views[d]=views[d].transpose(Image.FLIP_LEFT_RIGHT); views[d].save(BASE+f'{pid}_chibi_{d}.png')
        for dst,srcv in c.get('mirror_from',{}).items():
            views[dst]=views[srcv].transpose(Image.FLIP_LEFT_RIGHT); views[dst].save(BASE+f'{pid}_chibi_{dst}.png')
    for d in list(views):   # per-view colour fixes (palette->palette), e.g. remap drift between views of one concept
        m=dict(c.get('fixall',{})); m.update(c.get('vswap',{}).get(d,{}))
        if m: views[d]=swap(views[d],m); views[d].save(BASE+f'{pid}_chibi_{d}.png')
    for d,specs in c.get('rowpaint',{}).items():   # [[y0,y1,x0,x1,src,even,odd]] base-pixel recolour (e.g. tee stripes lost to skin tone)
        a=np.array(views[d])
        for y0,y1,x0,x1,sh,ev,od in specs:
            sc=[int(sh[i:i+2],16) for i in (0,2,4)]
            for y in range(y0,y1+1):
                dh=ev if (y-y0)%2==0 else od; dc=[int(dh[i:i+2],16) for i in (0,2,4)]
                for x in range(x0,x1+1):
                    if a[y,x,3]>0 and list(a[y,x,:3])==sc: a[y,x,:3]=dc
        views[d]=Image.fromarray(a,'RGBA'); views[d].save(BASE+f'{pid}_chibi_{d}.png')
    export_set(out+'overworld',f'{pid}_chibi',views,64,96,0.2,[2,3],150,lift=2,stride=2,bodybob=1,sidefrac=0.12,arms=c.get('arms',True))
    if c['kind']=='trainer' and not ('base_of' in c or os.path.exists(RAW+f'{pid}_normal.jpg')):
        print('  (no _normal.jpg yet: overworld only)',pid)
    elif c['kind']=='trainer':
        os.makedirs(out+'trainer',exist_ok=True); os.makedirs(out+'portraits',exist_ok=True)
        if 'base_of' in c:
            tr=swap(Image.open(BASE+f"{c['base_of']}_trainer.png"),c['swap']); tr.save(BASE+f'{pid}_trainer.png')
        else:
            src=f'{pid}_normal.jpg'; tb=c.get('tboxes') or boxes(src,c.get('tn',4))
            tr=mk(f'{pid}_trainer',src,tb[0],c.get('tth',124),62,26,1.0,c.get('hueboost_t',c.get('hueboost')),c.get('fillhue_t',c.get('fillhue')))
        cv,_=place(tr,64,128,pad_b=2); cv=Image.fromarray(remap(np.array(cv)))
        cv.save(out+f'trainer/{pid}_trainer_64x128.png'); up(cv,2).save(out+f'trainer/{pid}_trainer_64x128_2x.png'); up(cv,3).save(out+f'trainer/{pid}_trainer_64x128_3x.png')
        if c.get('por') and not os.path.exists(RAW+f'{pid}_portraits.jpg'):
            print('  (no _portraits.jpg yet)',pid)
        elif c.get('por'):
            portraits(f'{pid}_portraits.jpg',c['por'],out+'portraits/',pid)
    print('built',pid)
if __name__=='__main__':
    args=sys.argv[1:] or ['all']
    for c in CAST['cast']:
        if 'all' in args or c['kind']+'s' in args or c['id'] in args: build(c)
