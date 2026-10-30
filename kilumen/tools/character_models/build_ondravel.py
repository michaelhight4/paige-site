import sys, numpy as np, json
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0,'/workspace/kilumen/art/characters/pixel/tools')
from sh_pxlib import PAL, remap
OUT=sys.argv[1]
src=np.array(Image.open('ondravel_src.jpg').convert('RGB')).astype(int)
bg=(src.min(2)>226)
lab,_=nd.label(bg); edge=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
szb=nd.sum(bg,lab,range(1,lab.max()+1)); big=set((1+np.where(szb>60)[0]).tolist())|edge
fg=~np.isin(lab,list(big)); fg=nd.binary_opening(fg,iterations=2)
l2,n=nd.label(fg); sz=nd.sum(fg,l2,range(1,n+1)); fg=np.isin(l2,1+np.where(sz>2000)[0])
ys,xs=np.where(fg); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
H=244; s=H/(y1-y0); W=int(round((x1-x0)*s))
rgb=Image.fromarray(np.where(fg[...,None],src,0).astype('uint8')[y0:y1,x0:x1]).resize((W,H),Image.LANCZOS)
m=np.array(Image.fromarray((fg[y0:y1,x0:x1]*255).astype('uint8')).resize((W,H),Image.BOX))>110
a=np.array(rgb).astype(float); cov=np.array(Image.fromarray((fg[y0:y1,x0:x1]*255).astype('uint8')).resize((W,H),Image.BOX)).astype(float)/255
a=np.clip(a/np.maximum(cov,0.05)[...,None],0,255)
# light contrast-preserving palette remap
pal=np.array(PAL)[:,:3].astype(int) if np.array(PAL).ndim==2 else np.array(PAL).reshape(-1,3)
def near(px):
    r=(px[:,None,0]+pal[None,:,0])/2; d=pal[None]-px[:,None]
    return pal[np.argmin((2+r/256)*d[...,0]**2+4*d[...,1]**2+(2+(255-r)/256)*d[...,2]**2,1)]
q=a.reshape(-1,3); q=near(q).reshape(a.shape)
canvas=np.zeros((256,256,4),np.uint8); OX=(256-W)//2; OY=256-H-4
base=np.zeros((256,256),bool); base[OY:OY+H,OX:OX+W]=m
col=np.zeros((256,256,3),np.uint8); col[OY:OY+H,OX:OX+W]=q
hl,hn=nd.label(nd.binary_fill_holes(base)&~base)
if hn:
    hs=nd.sum(np.ones_like(hl),hl,range(1,hn+1)); small=np.isin(hl,1+np.where(hs<80)[0])
    for _ in range(6):
        for ch in range(3):
            g=nd.grey_dilation(np.where(base[...,None],col,0)[...,ch],size=3); col[...,ch]=np.where(small&~base,g,col[...,ch])
    base=base|small
OL=np.array([0x19,0x12,0x10])
inner=nd.binary_erosion(base); col[base&~inner]=OL   # 1px #191210 outline on silhouette edge
# crystal pixels: violet-ish (r>b*0.7 and b>g+40 and r>g+20)
c=col.astype(int); vio=base&(c[...,2]>c[...,1]+50)&(c[...,0]>c[...,1]+25)&(np.arange(256)[:,None]<150)
print('crystal px',vio.sum())
pv=[p for p in pal if p[2]>p[1]+50 and p[0]>p[1]+25]; pv=sorted(pv,key=lambda p:p.sum())
dim,mid,hi=pv[0],pv[len(pv)//2],pv[-1]
legs=int(OY+H*0.72)  # rows below this stay planted
def frame(row,k):
    b=base.copy(); cl=col.copy()
    sh=[0,0,1,1,1,0][k] if row>0 else [0,0,0,1,1,0][k]   # breath: upper body dips 1px
    if sh:
        up=np.zeros_like(b); up[:legs]=True
        b2=b.copy(); cl2=cl.copy()
        b2[1:legs+1]=b[:legs]; cl2[1:legs+1]=cl[:legs]; b2[0]=False
        b,cl=b2,cl2
        v=np.zeros_like(vio); v[1:legs+1]=vio[:legs]
    else: v=vio
    lvl=[dim,dim,dim,mid,dim,dim][k] if row==0 else ([mid,hi,hi,mid,mid,hi][k] if row==1 else [hi,hi,mid,hi,hi,hi][k])
    cl[v]=lvl
    if row==2:  # flare: solid violet rim shapes (binary, no soft aura), pulsing 1-2px
        w=[1,2,2,1,2,1][k]; ring=nd.binary_dilation(b,iterations=w)&~b
        ring[:, :2]=ring[:, -2:]=False; ring[:2]=False
        cl[ring]=mid if w==1 else hi; b=b|ring
    out=np.zeros((256,256,4),np.uint8); out[...,:3]=cl; out[...,3]=b*255; out[~b,:3]=0
    return Image.fromarray(out)
sheet=Image.new('RGBA',(1536,768),(0,0,0,0))
for r in range(3):
    for k in range(6): sheet.paste(frame(r,k),(k*256,r*256))
sheet.save(OUT+'/ondravel_ow256_sheet.png')
# grid-fit collision: 4x4 footprint, mark tiles covered by legs/feet (rows below legs line in the bottom tile row)
foot=base[legs:]; ys,xs=np.where(foot)
cols_hit=sorted(set((xs//64).tolist())); 
meta={"name":"ondravel_ow256","draft":True,"sheet":"ondravel_ow256_sheet.png","frame_w":256,"frame_h":256,"cols":6,"rows":3,
 "row_meaning":["sealed (dim crystal, slow breath)","awake (crystal pulse, breath)","flare (solid violet rim, 1-2px pulse)"],
 "native_px":True,"upscaled":False,"anchor":{"x":128,"y":256,"meaning":"bottom-centre = (map ondravel.x centre tile, ondravel.y feet tile) as summit_fx.js draws it"},
 "footprint_tiles":[4,4],"art_bbox":[int(OX),int(OY),int(W),int(H)],
 "collision_suggestion":{"tiles_relative_to_footprint_topleft":[[c,3] for c in cols_hit]+[[c,2] for c in cols_hit],
   "note":"block the bottom 2 tile rows across the columns the body/legs touch; top 2 rows are antlers/head (draw over, walk-behind OK)"},
 "palette":"official 64-colour (sh_pxlib PAL), outline #191210, binary alpha"}
json.dump(meta,open(OUT+'/ondravel_ow256_meta.json','w'),indent=1); print(meta['collision_suggestion'],W,H)
